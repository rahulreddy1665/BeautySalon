# Known gaps

## Mock / missing APIs (not silently faked in UI)

| Area | Status | Notes |
|------|--------|-------|
| Profit / expenses report | Empty state | No expense API — screen shows unavailable |
| Inventory valuation (qty/cost) | Empty state | Products are catalog-only (name/price); no stock fields |
| Lifetime spend on customer | Deferred | Loyalty balance is live; spend rollup not wired |
| Report CSV | Client-side only | `utils/csv.ts` until export endpoints exist |
| Login / password-change rate limit | Gap | No rate-limiting middleware in the repo |
| Public invoice share-link rate limit | Gap | Same — no rate-limiting middleware; public `GET /api/public/invoice/:token` is unauthenticated |
| Invoice PDF fidelity | Known tradeoff | `html2pdf.js` matches the on-screen template; some text may be rasterized vs native Print → Save as PDF |
| WhatsApp Cloud API | Prepared stub | `backend/src/services/send-invoice.service.ts` `sendInvoiceToCustomer` is a no-op; free flow uses wa.me / navigator.share |
| HSN/SAC, IGST | Deferred | Intra-state CGST/SGST only |
| Recurring appointments / SMS / drag-drop | Out of scope | Per product decision |
| PWA icons | Placeholder | Manifest theme is gold; icon PNGs still need brand art |

## Auth / account (by design)

| Area | Status | Notes |
|------|--------|-------|
| Password recovery | Admin-only | No forgot-password flow; admin resets a temporary password |
| Email verification | None | Change-email applies immediately; no confirmation link |
| 2FA | None | Not in scope |
| Email / SMTP | None | App never sends mail |

## Legacy mock modules

`frontend/src/app/service/mocks/` may still exist on disk but **production screens must not import them** for numbers. Prefer empty states.
