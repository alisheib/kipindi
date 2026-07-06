# NEXT-SESSION PROMPT — 50pick Admin Consistency & Functionality Sweep

> Copy everything below the line into a fresh Claude Code session opened in `F:\kipindi-main`.

---

You are working in the **50pick / Kipindi** repo at `F:\kipindi-main` (Next.js 16 App Router · React 19 · TypeScript · Prisma · Tailwind, kit-based design system). Git is connected to `github.com/alisheib/kipindi`, default branch `main`. **Workflow: work → commit → push to `main` after every screen (Railway auto-deploys).** Node 24 is installed; on Windows use the PowerShell tool and prepend the machine PATH refresh if `node` isn't found.

## Mission

Do a **purely admin-focused consistency + functionality sweep** of every admin screen, and make it **1000% functional, kit-consistent, responsive, and trilingual-clean**. This is critical. Be **very thorough** — test every filter, every button, every pagination control, every integration link, on desktop AND mobile.

**Highest priority (do these first, in order): the Markets group —**
1. `/admin/markets` (labeled **"Curation queue"** in the sidebar — this is the search Ali reported as broken)
2. `/admin/ai-polls` ("AI poll generation")
3. `/admin/candidates` ("AI candidates")
4. `/admin/proposals` ("Player proposals") — already largely done; verify + fill gaps
5. `/admin/resolver-queue` — already DONE this cycle; only regression-check

Then the rest of the 24 screens (see `docs/admin-consistency-plan.md` for the full table + per-screen checklist).

## What to fix (the whole point)

For **every** screen enforce ALL of these, and fix any deviation:

1. **Filter CONSISTENCY + FUNCTIONALITY** — every search/filter must actually work. Standardize on ONE canonical pattern:
   - **Client-side lists** (data already in the DOM): **live-on-type** search that filters on every keystroke, plus filter chips/selects that filter instantly. Page resets to 1 on any search/filter change.
   - **Server-paged lists**: URL-param search submitted on Enter + a Filter button is acceptable, but the search box must have the SAME icon + styling as everywhere else, and MUST visibly work.
   - Reference good implementations already in the repo: **`/admin/proposals`** (`src/app/admin/proposals/admin-proposals-client.tsx` — live search) and **`/admin/resolver-queue`** (`src/app/admin/resolver-queue/page.tsx`).
   - Search-bar canonical style: an `I.search` icon absolutely-positioned in a `relative` wrapper + a raw `<input>` with `h-9 w-full rounded-md border border-border bg-bg-overlay pl-9 pr-3 text-[12.5px] text-text outline-none admin-focus transition-colors placeholder:text-text-subtle`. (The kit `<Input>`'s `prefix` slot canNOT take an icon — its type intersects the HTML global `prefix` string attribute — so the icon+raw-input wrapper IS the correct pattern.)

2. **PAGINATION** — every long list paginates via the shared pager (`AdminPagination`/`Pagination` from `src/components/ui/pagination.tsx`; `parsePage`, `buildBaseHref`, `PER_PAGE`). The pager `total` must be the **filtered** count, and the page must **reset to 1** whenever a filter/search changes. Fix any off-by-one, missing pager, or wrong-total bug.

3. **BUTTON consistency** — use the kit `<Button>` component (`variant`/`size`/`leading`) OR the `.btn .btn-*` utility classes, but be consistent WITHIN a screen and align heights (e.g. `h-9` in filter rows). No hand-rolled `<button className="...raw...">` where a kit control fits. Consistent variants (primary/gold/ghost/danger; `btn-yes`/`btn-no`/`btn-claret` only inside actual outcome actions).

4. **INPUTS/CONTROLS on the kit** — replace hand-rolled `<textarea>` with the kit `<Textarea>` (it exists specifically to replace drifted ones — grep `\<textarea` for stragglers), hand-rolled selects with `<Select>`, date inputs with `<DateSelect>`. Labels: `<Cap>` / `FieldLegend` / `mb-1.5 text-[12px] font-semibold text-text` — pick per context, stop mixing `text-[11px] text-text-muted` variants.

5. **INTEGRATIONS** — verify cross-screen wiring works end to end: a proposal → publishes to a market → appears in Curation queue (`/admin/markets`) → closes → appears in Resolver queue → resolves (two-officer) → shows on `/fairness` and flips the proposal to RESOLVED. AI poll/candidate → approve → publish → market. Row links must point to the right detail pages. No dead/no-op controls.

6. **RESPONSIVE** — no horizontal overflow at 320/360/393/768/1024/1280/1440. Cards stack, filter rows wrap.

7. **LANGUAGES** — any player-visible strings via i18n with EN/SW/ZH parity (`npm run test:i18n` must stay green, en=sw=zh). Admin-only chrome may stay English but keep terminology consistent — use **"Selection closes/closed"** everywhere, never "betting closes".

## How to drive/test the admin UI locally (REQUIRED — the admin area is gated by role + TOTP)

```powershell
# boot in-memory (prod-safe) WITH the TOTP bypass so admin pages render:
$env:SESSION_SECRET="gli_local_session_secret_32_chars_min_ok"; $env:OTP_PEPPER="gli_local_otp_pepper_16min"; $env:NODE_ENV="development"; $env:DISABLE_ADMIN_TOTP="true"
npx next dev -p 3000   # run in background
```
- `POST http://localhost:3000/api/dev-test/seed-admin` body `{"phone":"+255700000000"}` → sets an admin session cookie (use a Playwright context or a PowerShell WebRequestSession).
- Seed data per screen: `stress-money` (a live market + bets), `fast-forward-market {marketId}` (push a market into the resolver queue), `proposals-seed`, `seed-candidates`, `seed-ai-polls`, `seed-kyc`, `stress-regulator-grade`.
- **Clone `scripts/resolver-queue-retest.mjs`** as the per-screen live test: it seeds an admin + market via `context.request.post`, drives the real page in Chromium, asserts controls are visible + zero console errors + no horizontal overflow across widths, and screenshots to the gitignored `.50pick-shots/`. READ the screenshots to visually verify CSS/layout.
- Playwright browser is installed. Use `waitUntil: "domcontentloaded"` (NOT `networkidle` — the app holds live SSE connections).

## Method (repeat per screen)

1. Read the page + its client components. List every filter, button, input, pagination, and integration link.
2. Fix all deviations from the standards above.
3. `npm run typecheck` and `npm run build` must pass. Keep `npm run test:i18n`, `test:proposals`, `test:proposal-close` green; run any suite touching what you changed.
4. Live-test with a cloned retest script (seed admin + data, assert controls/console/overflow, screenshot) and READ the screenshot.
5. Commit with a clear message and **push to main**. Then next screen.

## Known issues already identified (start here)

- **`/admin/markets` ("Curation queue")**: its search is the one Ali reported doing nothing on type — make it work/consistent.
- **`/admin/candidates`**: search is Enter/URL-param only — decide + standardize (live-on-type preferred for the client list).
- Stray hand-rolled `<textarea>`/`<input>`/labels across admin screens — replace with kit.
- Three different search-bar patterns exist — unify.

## Guardrails

- Money paths are sacred — the resolve/void/settle/bonus flows already work; don't regress them (there are unit suites: `test:markets`, `test:emergency`, `test:proposals`, `test:bonus`, `test:ledger`). Run them if you touch anything near settlement.
- Don't invent new UI patterns — reuse existing kit components and the reference screens.
- Reference docs already in the repo: `docs/admin-consistency-plan.md` (the full 24-screen table + checklist), and the resolver-queue + proposals screens as the "good" examples.

Start by confirming git is clean and on `main`, boot the local admin server with the TOTP bypass, then begin with `/admin/markets`.
