# Backend API Notes

Base URL (local): `http://localhost:8080`  
API prefix: `/api`  
Health: `GET /health` (no auth)

## Auth mechanism

- **JWT Bearer tokens only** — no refresh-token endpoint exists today.
- Login returns a single `token` signed with `JWT_SECRET`, expiry **`1d`** (`JWT_EXPIRES_IN`).
- Clients send: `Authorization: Bearer <token>`.
- JWT payload: `{ id, roleId, role, permissions[], tokenVersion, mustChangePassword }`.
- Each request re-checks DB `isActive`, `tokenVersion` (session invalidation), and `mustChangePassword` (blocks all routes except `POST /api/auth/change-password`).
- **Permissions are resolved from the DB on every request** (admin role permissions, or the user’s designation). JWT `permissions` are not trusted for authorization after login.
- Permission checks use `requirePermission("<resource>:<action>")` after `authenticate`.
- Designation mutations (`POST/PATCH/DELETE /api/designation`) require **admin** role. List is available to `staff:read` or `settings:read`.
- Seeded admin (from `npm run seed:rbac`):
  - email: `admin@example.com`
  - password: `Admin@123`
  - role: `admin` (all permissions)
- No email/SMTP anywhere. Password recovery is admin reset only. No 2FA / email verification.

**Frontend implication:** on 401, clear session and redirect to login. If `mustChangePassword`, redirect to `/set-password`.

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

### Dashboard (`/api/dashboard`)

| Method | Path | Permission | Notes |
|--------|------|------------|-------|
| GET | `/api/dashboard?range=today\|week\|month` | `dashboard:read` | Aggregated stats, today's appointments, progress, recent customers. Money blocks (`revenue`, `collectionToday`, `monthlyRevenue`, `topPerformers`, payment split) omitted when `canViewRevenue` is false (admin always included). Tips excluded from revenue; shown separately on collection. Reuses staff-sales aggregation for top performers. |

### Auth (`/api/auth`)

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/api/auth/login` | Public | `{ identifier\|email\|username, password }` → token + user + `mustChangePassword`. Same `INVALID_CREDENTIALS` for unknown user / wrong password. |
| POST | `/api/auth/change-password` | Bearer | `{ currentPassword, newPassword }` — verifies current; new must differ; bumps `tokenVersion`; returns new token. Allowed even when `mustChangePassword`. |
| POST | `/api/auth/change-email` | Bearer (admin) | `{ email, currentPassword }` — no verification email; uniqueness enforced. |

### Users (`/api/user`) — **login accounts only**

Staff salon roster is **not** users. Keep `/api/user` for admin/login accounts.  
Deactivating or demoting an admin is blocked when it would remove the last active admin, or when targeting the actor’s own admin account (`LAST_ADMIN`). Password hashes are never returned (`select: false` / `-password`).

### Designations (`/api/designation`)

| Method | Path | Permission | Notes |
|--------|------|------------|-------|
| GET | `/api/designation` | `settings:read` | List |
| POST | `/api/designation` | `settings:update` | `{ name, permissions?, maxDiscountPercent?, … }` |
| PATCH | `/api/designation/:id` | `settings:update` | System admin designation is not editable |
| DELETE | `/api/designation/:id` | `settings:update` | Blocked if active staff still assigned |

Staff login permissions come from the staff member’s designation (role `staff` has empty permissions).

### Staff (`/api/staff`) — **new**

| Method | Path | Permission | Notes |
|--------|------|------------|-------|
| GET | `/api/staff` | `staff:read` | Pagination + `search`, `isActive`; includes `loginStatus` |
| GET | `/api/staff/:id` | `staff:read` | |
| POST | `/api/staff` | `staff:create` | `{ name, age, gender, designationId?, isActive? }` |
| PATCH | `/api/staff/:id` | `staff:create` | |
| DELETE | `/api/staff/:id` | `staff:delete` | Hard delete |
| POST | `/api/staff/:id/login` | `staff:create` | Enable login: `{ username, temporaryPassword? }` → returns temp password **once** |
| POST | `/api/staff/:id/login/reset` | `staff:create` | New temp password; `mustChangePassword`; bumps `tokenVersion` |
| DELETE | `/api/staff/:id/login` | `staff:create` | Turns off login (`isActive=false` on user); staff record kept |

Fields: `name`, `age` (14–80), `gender` (`Male`\|`Female`\|`Other`), `designation`, `isActive`, optional linked `user`.  
`loginStatus`: `no_login` \| `login_enabled` \| `login_off` \| `must_change_password`.  
Username: 4–20 lowercase `[a-z0-9._]`, unique case-insensitive. Temp password hashed with bcrypt; never stored/returned in plain after the enable/reset response.

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
Rejects bookings outside `business.openingTime`–`closingTime` or on non-`workingDays` with code `SALON_CLOSED`.  
Legacy `/api/booking` still exists (old model) — prefer `/api/appointment`.

### Invoices (`/api/invoice`) — **new**

| Method | Path | Permission | Notes |
|--------|------|------------|-------|
| GET | `/api/invoice` | `invoice:read` | `from`/`to`, `paymentMode`, `search`, pagination |
| GET | `/api/invoice/staff-sales` | `invoice:read` | Staff-wise sales from line items |
| GET | `/api/invoice/:id` | `invoice:read` | |
| POST | `/api/invoice` | `invoice:create` | Collect payment; optional `appointmentId` |
| POST | `/api/invoice/:id/share-link` | `invoice:read` | Create or reuse public share link. Body `{ renew?: boolean }`. Returns `{ url, reused, expiresAt }`. Token plaintext only on first create (`url` null when reused — hash-only storage). |
| POST | `/api/invoice/:id/revoke-share-link` | `invoice:read` | Revoke all active links for the invoice |

### Public invoice (`/api/public`) — unauthenticated

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/public/invoice/:token` | None | Customer-safe invoice + template snapshot. Identical **404** for invalid / revoked / expired. No `_id`, `createdBy`, loyalty ledger, or staff pay. |

Public app URL base: `PUBLIC_APP_URL` or `FRONTEND_URL` (default `http://localhost:5173`). Frontend route: `/i/:token` (noindex).

Invoice numbers: `INV-YYYY-#####` (atomic counter; syncs past existing numbers).  
Totals computed server-side from Settings (tax, rounding, template, loyalty). Tip is never taxed.  
`paymentMode`: `upi` \| `cash` \| `card`. Optional `tip`, `loyaltyRedeemPoints`.  
Billing an appointment sets `status=completed` + `invoice` ref; double-bill returns 409.  
Each invoice stores `templateSnapshot` + `businessSnapshot` at creation so presentation never changes with later settings.

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
| PATCH | `/api/settings/business` | `settings:update` | Profile + `openingTime`/`closingTime` (HH:mm) + `workingDays[]` |
| POST | `/api/settings/business/logo` | `settings:update` | multipart `logo` → Base64 on settings |
| DELETE | `/api/settings/business/logo` | `settings:update` | |
| PATCH | `/api/settings/tax` | `settings:update` | CGST/SGST services & products |
| PATCH | `/api/settings/invoice` | `settings:update` | Prefix, padding, rounding, `templateId` (`creamGold`/`blush`/`compact`/`thermal`), accent preset/color, show staff/logo toggles, terms, thank-you, WhatsApp message template, `shareLinkDays`, nextNumber↑ |
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

Create reads settings for tax, rounding, numbering, template. Snapshot on invoice: tax breakdown, roundOff, tip, loyalty, `businessSnapshot`, `templateId`, `templateSnapshot` (template, accent, toggles, terms, thank-you).  
Gaps (not implemented): HSN/SAC, IGST, multi-state tax, WhatsApp Cloud API send.  
PDF: client-side via `html2pdf.js` (`utils/invoicePdf.ts`) — on demand, not stored.

### Reports (`/api/reports`)

All routes require `authenticate` + `report:read`. Export routes also require designation `canExport` **or** `report:export` (admin always allowed).

Date query params: `from`, `to` as `YYYY-MM-DD` in **Asia/Kolkata**. Max range **366** days; `from` must be ≤ `to`. Previous period = equal length immediately before `from`. Day grouping uses salon TZ (not server local).

**Revenue** = `amountPayable − tip` (tax included as stored on the invoice; discounts and loyalty redemption already reduce payable; tip excluded). All invoice statuses count (no void/cancelled status exists).

Money fields are `null` / blank when `canViewRevenue` is false (not only hidden in UI).

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/reports/overview` | Hub key numbers for this month-to-date vs previous equal length |
| GET | `/api/reports/sales` | KPIs, chart series (day/week/month), service/product + payment splits, paginated bills (`q`, `sort`, `order`, `page`, `limit`) |
| GET | `/api/reports/sales/export` | Full filtered rows `{ filename, headers, rows }` for CSV |
| GET | `/api/reports/staff` | Staff sales with proportional section-discount attribution |
| GET | `/api/reports/staff/export` | CSV rows |
| GET | `/api/reports/staff/:staffId/lines` | Line items for expand |
| GET | `/api/reports/customers` | `tab=top\|inactive`, `inactiveDays=30\|60\|90` |
| GET | `/api/reports/customers/export` | CSV rows |
| GET | `/api/reports/appointments` | Status KPIs, busy grid, walk-in vs appointment bills |
| GET | `/api/reports/appointments/export` | CSV rows |
| GET | `/api/reports/services` | `category`, `notSold=true` |
| GET | `/api/reports/services/export` | CSV rows |
| GET | `/api/reports/products` | Product sales + sales-per-staff (no stock) |
| GET | `/api/reports/products/export` | CSV rows |

**Staff section discount allocation:**  
`serviceNet = serviceSubtotal − serviceDiscountTotal`; for each line `attributed = lineTotal × (serviceNet / Σ lineTotals)` when sum &gt; 0. Same for products. Tips are not attributed (`tipsReceived: null`).

Indexes: uses existing `Invoice.createdAt` and `Appointment.date+status` (no new indexes added).

### Customers / Roles / Permissions / Booking

Unchanged from earlier notes (except new permissions seeded for staff/appointment/invoice/product/settings/loyalty/`report:export`).

## Not in backend yet / deferred

- Profit / expenses module — out of scope (no expense tracking)  
- Staff incentives / commissions engine — not implemented  
- Customer birthdate / birthday reports — no birthdate field on customers  
- Tip attribution to staff — tip is invoice-level only (frontend tip staff is not persisted)  
- Recurring appointments, reminders, drag-drop — out of scope  
- HSN/SAC, IGST, multi-state GST  
- Scheduled / emailed reports, PDF report export, custom report builder  

## Libraries added

- `multer`, `xlsx` (+ `@types/multer`) for service import  
