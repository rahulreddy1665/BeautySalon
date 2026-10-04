# Known gaps

## Mock / missing APIs (not silently faked in UI)

| Area | Status | Notes |
|------|--------|-------|
| Profit / expenses module | Out of scope | No expense API — removed from reports hub |
| Inventory valuation (qty/cost) | Out of scope | Products are catalog-only (name/price); no stock fields in reports |
| Staff incentives / commissions | Gap | No incentive engine — staff report omits “incentive earned” |
| Tip attribution to staff | Done | `tip.allocations[]` equal-split on create; staff report reads allocations (legacy tipStaff fallback) |
| Customer birthdate / birthdays | Gap | Customer has phone + `createdAt`; no birthdate field |
| Lifetime spend on customer | Partial | Reports compute spend in range; loyalty balance when loyalty enabled |
| Login / password-change rate limit | Gap | No rate-limiting middleware in the repo |
| Public branding / invoice share-link rate limit | Gap | Same — no rate-limiting middleware; public `GET /api/public/branding` and `GET /api/public/invoice/:token` are unauthenticated |
| Invoice PDF fidelity | Known tradeoff | `html2pdf.js` matches the on-screen template; some text may be rasterized vs native Print → Save as PDF |
| WhatsApp Cloud API | Prepared stub | `backend/src/services/send-invoice.service.ts` `sendInvoiceToCustomer` is a no-op; free flow uses wa.me / navigator.share |
| HSN/SAC, IGST | Deferred | Intra-state CGST/SGST only |
| Recurring appointments / SMS / drag-drop | Out of scope | Per product decision |
| Salon timezone setting | Gap | Reports / locks use **Asia/Kolkata** (no timezone field on settings yet) |
| Scheduled / emailed reports | Out of scope | No jobs or email |
| New bill drafts | By design | Drafts persist in redux-persist on this device only — not synced to the server |
| PWA icons | Placeholder | Manifest theme is top-bar white; icon PNGs still need brand art |

## Auth / account (by design)

| Area | Status | Notes |
|------|--------|-------|
| Password recovery | Admin-only | No forgot-password flow; admin resets a temporary password |
| Email verification | None | Change-email applies immediately; no confirmation link |
| 2FA | None | Not in scope |
| Email / SMTP | None | App never sends mail |

## Legacy mock modules

`frontend/src/app/service/mocks/` may still exist on disk but **production screens must not import them** for numbers. Prefer empty states. Report mocks were removed.
