# Frontend Architecture

Salon Management System — frontend foundation + UI shell.

## Why this stack

| Choice | Reason |
|--------|--------|
| **TypeScript** | Safer contracts with backend DTOs. |
| **Vite + React** | Fast SPA DX. |
| **Redux Toolkit + persist** | Client-only session/settings that survive refresh. |
| **TanStack Query** | Server/API cache — never put API lists in Redux. |
| **Axios singleton** | Auth header + 401 logout queue + normalized errors. |
| **React Router** | Public vs protected shells + role placeholders. |
| **Tailwind CSS v4 + shadcn/ui** | Utility-first POS density; copy-paste components we own. |
| **vite-plugin-pwa** | Installable app shell only (no offline API cache). |

## Folder responsibilities (`src/app/`)

| Folder | Responsibility |
|--------|----------------|
| `screens/` | Feature pages (route targets). |
| `components/` | Reusable presentational UI (`PageHeader`, `StatCard`, `ResponsiveTable`, …). No API calls. |
| `components/ui/` | shadcn primitives (button, card, sheet, …). |
| `assets/` | Static images/icons for the app. |
| `helpers/` | Feature-local pure helpers. |
| `hooks/` | Custom hooks (`hooks/queries`, `hooks/auth`). |
| `state/redux/` | `auth` + `settings` only. |
| `styles/` | Global CSS (`@import "tailwindcss"` + CSS variables). |
| `theme/` | Design tokens (TS) — brand, neutrals, semantic, charts. |
| `service/` | Axios client + per-module APIs. Mocks live in `service/mocks/`. |
| `utils/` | `cn`, `env`, `currency` (`formatINR`), errors. |
| `router/` | Route tree, guards. |
| `providers/` | Redux, PersistGate, QueryClient, Router, Toaster, PWA prompt. |

Entry: `src/main.tsx` → `AppProviders` → `AppRouter`.

## Import rules

1. Use `@/` absolute imports.
2. Features do **not** import from each other (`screens/customers` ↛ `screens/billing`).
3. Shared UI → `components/`. Shared logic → `hooks/`, `helpers/`, `utils/`, `service/`.
4. `service/` must not import React screens/components.
5. `components/` must not import from `service/` (hooks bridge that).

## State rules

| Kind | Where |
|------|--------|
| Auth token + user | Redux `auth` (persisted) |
| Theme / sidebar prefs | Redux `settings` (persisted) |
| POS billing cart | Redux `billingCart` (**not** persisted) |
| Lists, reports, bookings | **TanStack Query only** |
| Form UI | Local `useState` / react-hook-form |

Persist whitelist: `['auth', 'settings']` only.

## Constants (`src/app/constants/`)

All user-facing copy lives here (no i18n library). Group by feature:

| File | Contents |
|------|----------|
| `common.ts` | Shared actions, labels, nav, payment modes |
| `billing.ts`, `staff.ts`, … | Feature strings |
| `errors.ts` | User messages + backend code/status map |
| `routes.ts` | Path helpers |
| `enums.ts` | Payment modes, statuses, genders, weekdays |

**How to add a string:** put it in the feature file → import `{ BILLING }` from `@/app/constants` → use in JSX. Do not hard-code UI sentences in screens.

**How to add an error:** add a stable code in `backend/src/constants/errors.ts` + frontend `ERROR_CODE_MESSAGES` entry; return `errors: { code }` alongside `message` without changing the response envelope.

ESLint warns on some JSX text literals (`no-restricted-syntax`). Grep screens for leftover developer copy (`mock`, `/api/`, `backend`).

## UI rules (strict)

- Brand: **gold** `#FFD700` on white (light) / black (dark). Never white text on gold (use `--on-gold` `#1A1A1A`).
- **Gradient policy:** `--gold-gradient` / `.btn-gold-gradient` ONLY on primary buttons, the dashboard highlight stat card, and the active sidebar pill accent. Everything else is flat.
- Radius **8–12px** (`rounded-lg` / `rounded-xl`), **1px** borders, shadows only on overlays (dialog, sheet, popover, dropdown).
- Icons: **lucide-react** only. No emojis.
- Dense POS/admin layouts. Realistic salon copy (“Walk-in”, “Collect payment”, “Today's collection”).
- Currency: always `formatINR()` from `utils/` (`en-IN` grouping). Use `tabular-nums` on money/numbers.
- Font: self-hosted **Inter Variable** for UI; invoice fonts **Cormorant Garamond** + **DM Sans** — no Google Fonts CDN.
- Empty / loading skeleton / error+retry on every data screen.
- Page title lives in the **top bar once**; `PageHeader` is actions + optional muted description (avoid duplicate H1).
- Mock/data-source badges only when `import.meta.env.DEV` and data is mocked. Prefer empty states over fake numbers.

## Theme tokens

1. Edit `src/app/theme/tokens.ts` (TS source of truth for light + dark; includes contrast notes).
2. Mirror values in `src/app/styles/global.css` `:root` / `.dark`.
3. Tailwind maps via `@theme { --color-*: var(--*); }`.
4. Components use Tailwind token classes (`bg-background`, `text-primary`, `bg-gold-soft`) — no hard-coded hex outside `theme/` + `styles/` (+ `theme/invoice-themes.ts` for invoice accents).

**Brand:** primary `#FFD700`, page `#F6F6F7`, cards white, dark base `#0B0B0B`. Charts: shared `ChartTooltip` (card bg, never black). Invoice default accent preset: **gold**.

**Theme mode:** Redux `settings.themeMode` = `light | dark | system` (default system). `ThemeProvider` toggles `dark` on `<html>` and syncs `meta[name=theme-color]`. FOUC script in `index.html` reads `persist:beauty-salon` before React. PWA manifest `theme_color` `#FFD700`, `background_color` `#F6F6F7`.

**Logo:** `components/Logo` + `config/app.ts` `SALON_NAME`. Assets: `assets/logo.svg`, `logo-light.svg`, `logo-dark.svg`.

## Responsive shell

- **lg+:** inset app frame with collapsible sidebar; content fills the rest.
- **&lt; lg:** bottom nav (max 5: Dashboard, Appointments, Customers, Billing, **More** sheet).
- Sticky top bar: page title (+ mobile logo) | quick actions + avatar menu (theme inside menu).
- Content padding: 16px mobile / 20px desktop (`px-4` / `md:px-5`).
- Safe areas: `pt-safe` / `pb-safe` / `env(safe-area-inset-*)`.
- `min-h-dvh`, inputs ≥ 16px on mobile, touch targets ≥ 44px (`.min-touch`).
- Nav labels from `COMMON.nav`. New appointment CTA → `/appointments/new`.

## How to add a new responsive screen

1. Create `screens/<feature>/<Name>Screen.tsx`.
2. Use `PageHeader` + grid of `StatCard` / content; keep padding from `AppLayout`.
3. Fetch via a hook in `hooks/queries/` (TanStack Query). API in `service/<module>/`.
4. Loading → `LoadingSkeleton`. Error → `ErrorState` + retry. Empty → `EmptyState`.
5. Lists → `ResponsiveTable`. Money → `formatINR` + `tabular-nums`.
6. Register the route in `AppRouter`. Add nav item in `AppLayout` (`primaryNav` or `moreNav`) with `COMMON.nav` + permission.
7. Do **not** add a Redux slice for server data.

## How to add a dashboard card

1. Extend `GET /api/dashboard` in `backend/src/services/dashboard.service.ts` (omit money fields when `canViewRevenue` is false).
2. Map the field in `frontend/src/app/service/dashboard/dashboardApi.ts`.
3. Render with `StatCard` on `DashboardScreen` — use `highlight` only for the primary KPI (gold gradient).
4. Add copy to `DASHBOARD` constants. Never invent client-side aggregates for money.

## How to use `ResponsiveTable`

```tsx
import { ResponsiveTable, type ColumnDef } from '@/app/components/ResponsiveTable'
import { formatINR } from '@/app/utils'

type Row = { staffName: string; total: number }

const columns: ColumnDef<Row>[] = [
  { accessorKey: 'staffName', header: 'Staff' },
  {
    accessorKey: 'total',
    header: 'Total',
    cell: ({ getValue }) => formatINR(Number(getValue())),
  },
]

<ResponsiveTable
  data={rows}
  columns={columns}
  mobileTitleKey="staffName"
  emptyTitle="No staff sales"
/>
```

- **md+:** HTML table. **&lt; md:** card list.
- Built on `@tanstack/react-table/legacy` (v9 package, familiar column defs).

## Mock data

Missing APIs are centralized under `src/app/service/mocks/`:

| File | Used by |
|------|---------|
| `reportMocks.ts` | Sales / profit reports |
| `billingMock.ts` | Walk-in bills list (localStorage) until Billing FE fully switches |
| `inventoryMock.ts` | Products, stock adjust, history (localStorage) |
| `loyaltyMock.ts` | Points rules, balances, ledger (localStorage) |
| `customerExtrasMock.ts` | Lifetime spend; points delegated to loyaltyMock |
| `staffSalesMock.ts` | Staff sales & incentives (reports) |

**Live APIs (not mocked):** Dashboard (`/api/dashboard`), Staff, Designations, Services, Products (catalog), Appointments (`/api/appointment`), Invoices (+ share link), Settings, Loyalty rules/balances, Auth.

Appointments UI: day / week / month calendars, side panel, confirmation dialog (Print + WhatsApp, no auto-send), dedicated form pages at `/appointments/new` and `/appointments/:id/edit`. Hours from business settings; closed weekdays dimmed. Create bill → `/billing/new?appointmentId=` → `POST /api/invoice` → appointment completed.

**CSV export:** client-side via `utils/csv.ts` (`downloadCsv`) until export APIs exist.

Screens must not invent their own fake numbers. Prefer empty states. Legacy files under `service/mocks/` must not drive production UI.

## PWA

- `vite-plugin-pwa` with `registerType: 'prompt'`.
- Manifest + Workbox precache **app shell only** (JS/CSS/HTML/fonts/icons).
- **Do not** cache `/api` responses. No offline billing.
- `PwaUpdatePrompt` asks users to refresh when a new SW waits.
- Push notifications: not implemented; SW left open for a future handler.

### Icons you must replace

| File | Size | Notes |
|------|------|--------|
| `public/icons/icon-192.png` | 192×192 PNG | Standard |
| `public/icons/icon-512.png` | 512×512 PNG | Standard |
| `public/icons/icon-512-maskable.png` | 512×512 PNG | Maskable — keep logo inside ~80% safe zone |

Current files are placeholders — replace with brand assets when available.

## Auth & API client

- Base URL: `VITE_API_BASE_URL` (`utils/env.ts`).
- Bearer token from Redux. No refresh endpoint → 401 clears session.
- Login accepts **email or username**. Staff accounts are admin-created (username + temporary password); `mustChangePassword` forces `/set-password` (server also blocks other APIs until changed).
- Avatar menu → **Account**: change password (all users); change email (**admin only**). No forgot-password link; login shows “Ask your admin to reset it.”
- JWT `tokenVersion` invalidates sessions after password reset / login disable / password change.
- Designations (`/api/designation`) drive staff permissions; Settings → **Roles & permissions** (admin only) with a permission matrix.
- Backend reloads designation/role permissions on each authenticated request (not stale JWT lists). Frontend `PermissionGuard` + nav filtering use the same keys.
- Settings is a **hub** (`/settings`) with card links to `/settings/:section` (business, tax, invoice, appointments, loyalty, roles). Unsaved-changes guard + sticky Save on sub-pages. Cards hide when the user lacks permission; direct URLs show No access.
- Invoice templates: Cream & Gold, Blush, Compact A5, Thermal. Palettes in `theme/invoice-themes.ts` (only allowed hex outside `theme/tokens`). Shared `InvoiceDocument` + snapshot on each invoice. Public share at `/i/:token` (no app shell, noindex). PDF via `html2pdf.js` (`utils/invoicePdf.ts`). WhatsApp share via `sendInvoiceToCustomer` (wa.me / native share); Cloud API stub on backend.
- New bill: Services / Products section cards with one section discount each (no per-line discount UI). Line discount field stays 0 for API compatibility.
- See `docs/API_NOTES.md` and `docs/KNOWN_GAPS.md` (no email/SMTP/2FA).

## Quality

```bash
npm run lint
npm run build      # tsc -b && vite build (also emits SW + manifest)
npm run preview    # verify PWA registration in DevTools → Application
```

## Role guard

`RoleGuard`: `owner | manager | staff | admin`. Seeded backend role `admin` ≈ owner.
