# Backend API Notes

Base URL (local): `http://localhost:8080`  
API prefix: `/api`  
Health: `GET /health` (no auth)

## Auth mechanism

- **JWT Bearer tokens only** — no refresh-token endpoint exists today.
- Login returns a single `token` signed with `JWT_SECRET`, expiry **`1d`** (`JWT_EXPIRES_IN`).
- Clients send: `Authorization: Bearer <token>`.
- JWT payload: `{ id, roleId, role, permissions[] }`.
- Permission checks use `requirePermission("<resource>:<action>")` after `authenticate`.
- Seeded admin (from `npm run seed:rbac`):
  - email: `admin@example.com`
  - password: `Admin@123`
  - role: `admin` (all permissions)

**Frontend implication:** on 401, clear session and redirect to login.

## Standard response shape

```json
{
  "success": true,
  "status": 200,
  "message": "…",
  "data": {},
  "errors": null
}
```

## Pagination (new convention)

List endpoints that support pagination return:

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

Query params: `page`, `limit`, plus module filters (`search`, `category`, etc.).

---

## Endpoints by module

### Auth (`/api/auth`)

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/api/auth/login` | Public | `{ email, password }` → token + user |

### Users (`/api/user`) — **login accounts only**

Staff salon roster is **not** users. Keep `/api/user` for admin/login accounts.

### Staff (`/api/staff`) — **new**

| Method | Path | Permission | Notes |
|--------|------|------------|-------|
| GET | `/api/staff` | `staff:read` | Pagination + `search`, `isActive` |
| GET | `/api/staff/:id` | `staff:read` | |
| POST | `/api/staff` | `staff:create` | `{ name, age, gender, isActive? }` |
| PATCH | `/api/staff/:id` | `staff:create` | |
| DELETE | `/api/staff/:id` | `staff:delete` | Hard delete |

Fields: `name`, `age` (14–80), `gender` (`Male`\|`Female`\|`Other`), `isActive`.

### Services (`/api/service`) — **updated**

| Method | Path | Permission | Notes |
|--------|------|------------|-------|
| GET | `/api/service` | `service:read` | Pagination + `search`, `category` |
| GET | `/api/service/categories` | `service:read` | Distinct categories |
| POST | `/api/service/import` | `service:create` | multipart `file` (.xlsx/.csv) |
| GET | `/api/service/:id` | `service:read` | |
| POST | `/api/service` | `service:create` | |
| PATCH | `/api/service/:id` | `service:create` | |
| DELETE | `/api/service/:id` | `service:delete` | Hard delete |

Fields: `name`, `category`, `price`, `durationMinutes` (default 30, min 5, step 5).  
Unique: name + category (case-insensitive).  
Import: per-row created/updated/skipped/error; blank duration → 30.

### Appointments (`/api/appointment`) — **new** (replaces booking for scheduling)

| Method | Path | Permission | Notes |
|--------|------|------------|-------|
| GET | `/api/appointment` | `appointment:read` | `date` / `from`+`to`, `staffId`, `status`, pagination |
| GET | `/api/appointment/:id` | `appointment:read` | |
| POST | `/api/appointment` | `appointment:create` | Guest or customer; services[] with staff |
| PATCH | `/api/appointment/:id` | `appointment:update` | Reschedule / edit |
| PATCH | `/api/appointment/:id/status` | `appointment:update` | `{ status }` |
| POST | `/api/appointment/:id/cancel` | `appointment:update` | → cancelled |

Rules: server computes `endTime` from service durations; reject staff overlaps; no past booking (new); completed cannot edit/cancel.  
Legacy `/api/booking` still exists (old model) — prefer `/api/appointment`.

### Invoices (`/api/invoice`) — **new**

| Method | Path | Permission | Notes |
|--------|------|------------|-------|
| GET | `/api/invoice` | `invoice:read` | `from`/`to`, `paymentMode`, `search`, pagination |
| GET | `/api/invoice/staff-sales` | `invoice:read` | Staff-wise sales from line items |
| GET | `/api/invoice/:id` | `invoice:read` | |
| POST | `/api/invoice` | `invoice:create` | Collect payment; optional `appointmentId` |

Invoice numbers: `INV-YYYY-#####` (atomic counter; syncs past existing numbers).  
Totals computed server-side from Settings (tax, rounding, template, loyalty). Tip is never taxed.  
`paymentMode`: `upi` \| `cash` \| `card`. Optional `tip`, `loyaltyRedeemPoints`.  
Billing an appointment sets `status=completed` + `invoice` ref; double-bill returns 409.

**Worked tax example** (exclusive GST, nearest rounding, tip ₹20):

| Line | Amount | Rate | Tax |
|------|--------|------|-----|
| Haircut (service) | ₹499 | 9%+9% | ₹89.82 |
| Shampoo (product) | ₹450 | 6%+6% | ₹54.00 |
| Tax total | | | ₹143.82 (CGST 71.91 + SGST 71.91) |
| After tax | ₹1,092.82 | round nearest | +₹0.18 → ₹1,093 |
| Tip (untaxed) | ₹20 | | |
| **Payable** | | | **₹1,113** |

### Products (`/api/product`) — **new**

| Method | Path | Permission | Notes |
|--------|------|------------|-------|
| GET | `/api/product` | `product:read` | Search + pagination |
| GET | `/api/product/:id` | `product:read` | |
| POST | `/api/product` | `product:create` | `name`, `price` |
| PATCH | `/api/product/:id` | `product:create` | |
| DELETE | `/api/product/:id` | `product:delete` | Hard delete |
| POST | `/api/product/import` | `product:create` | Excel/CSV upsert by name |

No stock fields — catalog only.

### Settings (`/api/settings`) — **new**

Singleton salon settings (auto-seeded on first GET).

| Method | Path | Permission | Notes |
|--------|------|------------|-------|
| GET | `/api/settings` | `settings:read` | All sections + next invoice preview |
| PATCH | `/api/settings/business` | `settings:update` | Profile fields |
| POST | `/api/settings/business/logo` | `settings:update` | multipart `logo` → Base64 on settings |
| DELETE | `/api/settings/business/logo` | `settings:update` | |
| PATCH | `/api/settings/tax` | `settings:update` | CGST/SGST services & products |
| PATCH | `/api/settings/invoice` | `settings:update` | Prefix, padding, rounding, template, nextNumber↑ |
| PATCH | `/api/settings/appointments` | `settings:update` | Calendar hours / slot |
| PATCH | `/api/settings/loyalty` | `settings:update` | Same store as `/api/loyalty/rules` |

Logo: PNG/JPG/SVG/WebP, max 2 MB, stored as Base64. Unsafe SVG rejected.

### Loyalty (`/api/loyalty`) — **new**

Rules live in Settings.loyalty (shared).

| Method | Path | Permission | Notes |
|--------|------|------------|-------|
| GET/PATCH | `/api/loyalty/rules` | `loyalty:read` / `loyalty:update` | |
| GET | `/api/loyalty/balances` | `loyalty:read` | Optional `customerIds` |
| GET | `/api/loyalty/balances/:customerId` | `loyalty:read` | |
| GET | `/api/loyalty/ledger` | `loyalty:read` | Optional `customerId` |
| POST | `/api/loyalty/adjust` | `loyalty:adjust` | Manual earn/redeem/set |

Earn base = net after discounts − redemption (excludes tax & tip).

### Invoices — **updated**

Create now reads settings for tax, rounding, numbering, template. Snapshot on invoice: tax breakdown, roundOff, tip, loyalty, businessSnapshot, templateId.  
Gaps (not implemented): HSN/SAC, IGST, multi-state tax.

### Customers / Roles / Permissions / Booking

Unchanged from earlier notes (except new permissions seeded for staff/appointment/invoice/product/settings/loyalty).

## Not in backend yet / deferred

- Profit / expenses — skipped  
- Recurring appointments, reminders, drag-drop — out of scope  
- HSN/SAC, IGST, multi-state GST  

## Libraries added

- `multer`, `xlsx` (+ `@types/multer`) for service import  
