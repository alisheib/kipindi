# Admin Consistency & Functionality Sweep — plan for a dedicated session

> **Goal:** every admin screen is 1000% functional, kit-consistent, responsive, and
> trilingual-clean. This is a *purely admin-focused* pass. Work screen-by-screen
> against the checklist; commit + push per screen (or per small group).

## How to drive the admin UI locally (needed to test every screen)

The admin area is gated by role **+ TOTP**. For local testing, boot with the TOTP
bypass and seed a ready admin:

```
# boot (in-memory, prod-safe): TOTP bypass on
SESSION_SECRET=<32+ chars> OTP_PEPPER=<16+ chars> DISABLE_ADMIN_TOTP=true npx next dev -p 3000
```
- `POST /api/dev-test/seed-admin {"phone":"+255700000000"}` → sets an admin session cookie.
- Seed data as needed: `POST /api/dev-test/stress-money` (a live market), `proposals-seed`,
  `seed-candidates`, `seed-ai-polls`, `seed-kyc`, `fast-forward-market {marketId}` (push a
  market into the resolver queue), `stress-regulator-grade`, etc.
- Pattern to copy: `scripts/resolver-queue-retest.mjs` (Playwright: seed admin + market,
  assert buttons/console/overflow, screenshot). Clone it per screen.

## Per-screen checklist

For **each** screen below tick: **[F]** functional (every button/action works, no dead
controls, correct success/error via `OperationResultModal`/toast) · **[K]** kit-consistent
(no hand-rolled inputs/buttons/labels — use `Input`/`Textarea`/`Select`/`Button`/`Chip`/
`DateSelect`; `<Cap>`/`FieldLegend` labels; consistent sizes/heights) · **[S]** search/filter
consistent (live-on-type where the list is client-side; icon + styling match other bars) ·
**[P]** pagination correct (uses the shared pager; page resets on filter/search) · **[R]**
responsive (no horizontal overflow 320→1440) · **[L]** languages (labels/i18n parity, EN/SW/ZH).

## Screens (24) — Markets group first (highest-traffic ops)

| Route | Label | Status / notes |
|---|---|---|
| `/admin/resolver-queue` | Resolver queue | ✅ **DONE** (this session): staged-outcome Stage 2, triage summary, kit search, responsive 320–1280, 15/15 live. |
| `/admin/proposals` | Player proposals | ✅ Mostly done: live search, kit `Textarea`/labels, edit panel, betting→**selection** terminology, ZH title. Re-check pagination + mobile. |
| `/admin/markets` | **Curation queue** | ⚠️ **This is the "curation queue" search Ali hit** — verify its search filters (make live-on-type or fix Enter). Full pass. |
| `/admin/candidates` | AI candidates | Search is **Enter/URL-param only** — decide: make live-on-type for consistency. Full pass. |
| `/admin/ai-polls` | AI poll generation | Full pass (filters, forms, actions). |
| `/admin/sources` | Sources & categories | Full pass. |
| `/admin/config` | Rates & fees | Number inputs + save; kit consistency. |
| `/admin` | Overview | KPIs, links, responsive. |
| `/admin/live` | Live ops | Real-time tiles; responsive. |
| `/admin/finance` | Finance | Tables, exports, pagination. |
| `/admin/reports` | Reports | Report generation (PDF/XLSX) works; buttons. |
| `/admin/players` | Roster | Search + pagination + row → detail. |
| `/admin/players/cohorts` | Cohorts | Filters, charts. |
| `/admin/affiliate` | Affiliate | Config + tables. |
| `/admin/bonuses` | Bonuses | Grant/adjust actions. |
| `/admin/invites` | Invites | Campaign create/send. |
| `/admin/compliance` | Compliance | Reports, attestation. |
| `/admin/moderation` | Comment moderation | Approve/hide/restore actions. |
| `/admin/aml` | AML queue | Two-officer approve/reject. |
| `/admin/self-exclusions` | Self-exclusions | Register view. |
| `/admin/privacy` | Privacy / DSAR | Request handling. |
| `/admin/retention` | Retention | Schedule view. |
| `/admin/audit` | Audit log | Chain view + verify + pagination. |
| `/admin/system` | System | Health, version, toggles. |
| `/admin/ai-usage` | AI usage & credits | Usage tables. |
| `/admin/approvals` | Approvals | Two-officer queue. |

## Known cross-cutting inconsistencies to standardize

- **Search bars**: three patterns exist — live-on-type (proposals, resolver), Enter/URL-param
  (candidates, markets). Pick ONE canonical (recommend live-on-type for client-side lists,
  URL-param+Enter for server-paged lists) and apply everywhere. Same icon + `bg-bg-overlay`.
- **Textareas**: use the kit `<Textarea>` everywhere (it exists specifically to replace
  hand-rolled ones that drifted). Grep `\<textarea` for stragglers.
- **Labels**: `<Cap>` / `FieldLegend` / `mb-1.5 text-[12px] font-semibold text-text` — pick per
  context and stop mixing `text-[11px] text-text-muted` variants.
- **Buttons**: prefer kit `<Button>` (or `.btn` utilities) consistently; align heights (h-9 in
  filter rows).
- **Pagination**: always the shared `Pagination`/`AdminPagination`; reset page on filter/search.
- **Terminology**: "Selection closes/closed" (not "betting closes") — already unified in proposals.
