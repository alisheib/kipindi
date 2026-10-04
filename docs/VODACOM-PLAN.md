# VODACOM PLAN — the sponsor's "Simplified Journey", built in 50pick's design system

> ⭐ **Say "continue Vodacom plan" in any session, on any machine.** Read §0 RESUME AT below, then do the session
> it names, following the session law in §0. The approved plan is §5 onward; the rulings are the v5 INHERIT-MANIFEST.

> **The one tracker for this programme.** Owner: Ali. Opened 2026-09-29.
> - **Rulings:** [`docs/design-system/v5-2026-09-29-simplified-journey/INHERIT-MANIFEST.md`](design-system/v5-2026-09-29-simplified-journey/INHERIT-MANIFEST.md) (SJ-1 … SJ-24).
> - **The agency's deck and frames:** the same folder (`50pick_Simplified_Journey.pptx`, `frames/1-home.png` … `frames/5-how-to-play.png`).
> - **Reply to the agency:** [`AGENCY-REPLY.md`](design-system/v5-2026-09-29-simplified-journey/AGENCY-REPLY.md).
> - **What the journey takes out of use:** [`docs/SHELVED.md`](SHELVED.md).
>
> **Guard:** `test:vodacom-plan` keeps §0 and §1 honest.
>
> Worktree `C:\kipindi-journey`, branch `simple-journey`. Merge to `main` = live, and every change stays behind the
> `simpleJourney` rollout until the S15 flip.

## §0 · RESUME AT

**State (2026-10-03):** S6 (the flagged shell) is in progress (§0i): WP0–WP11 are live behind the flag — the shell
swap, the overlay rules, Tiketi zangu (WP9), the journey sell look (WP10), `--rail-h` (WP11) and the first-download fix
(WP6c), each verified locally before its push — and classic viewers are served what they were
(`qa:classic-shell-parity`, 224 cells, no unexpected difference; v2 also compares the Sell region). ⭐ Ali, 2026-10-02: nothing is turned on — no staff preview, no journey — until
the whole plan is done; production proves only that nothing changed for players. S3b (the measures baseline) is ✅: the
old journey's funnel counts daily since 2026-10-01, and the 14-day baseline runs to 2026-10-15 (§0f). S3 (the engine)
and S4 (the design pass) are ✅. S2 is LIVE (`473807b1`) and waits on an officer approving the short titles (§0d, §0h
point 19). S1 is LIVE (`41ec1703`) and waits on one press by Ali (§0b "Still open"). Ali is away: every call made
meanwhile is a numbered point in §0h.

**Next:** (1) S6 — resume at §0i "⏸ S6 STOPPED HERE": the classic Sell button's live fixes found while proving WP9
and WP10 — A8b, A8c, A8e and A8f live (`c6373d4b`); A8d and A8g (the question page's Sell button stacks on a phone,
`/positions`' big rows put their note under the figure, the free strip never breaks a phrase — §0h points 45, 51 and
52) and A8h (a sale's result stays on screen; no popup for a refusal one tap fixes — points 53 to 56) PUSHED to main
2026-10-04 at Ali's request (`315a3ae5`, `2e3ea161`) with their proof part-run — §0i "S6 STOPPED HERE" lists what is
proven and what is owed; then A8i (Enter acts only where it is pressed — a live defect found on the way), then WP12
(proof, records, merge); the build plan is
`docs/design-system/v5-2026-09-29-simplified-journey/S6-PLAN.md`, whose closing Amendments override its body. (2) When
Ali says so, and not before (nothing turns on until the plan is done): an officer approves the S2 short titles, and
Ali presses S1's preview switch.

Session law, the same for every session:
- Code, two-store tests, and `red:*` twins reachable from `red:all`, with declared anchors.
- `test:red-anchors` after any refactor.
- `test:all` before each push.
- Heavy Node only through `~/heavy-node-lock.sh`; red harnesses run detached, never piped.
- Real-browser viewport tiles, read one by one.
- Merge, push, verify the deploy commit.
- This file, `SHELVED.md` and memory updated in the same pass.

A gate is named as an `npm run` command only once its key exists in `package.json`.

## §0a · S1 research (read-only, 2026-09-29): what to model the switch on

**Where each piece goes**
- **`src/lib/feature-state.ts` must stay pure.** It is client-reachable, and its only import is a type from `roles.ts`.
  Put only the code/env ceiling there, e.g. `simpleJourneyCeiling()` returning `{ ceiling, source }` from
  `FEATURE_SIMPLEJOURNEY`, modelled on `inviteRewardsCeiling()` (`feature-state.ts:302-332`).
- Keep `FeatureState` at two members (the file's own COMING_SOON argument, lines 67-92). Key names are read by
  `test:house-bot-surfaces`, so use neutral words.
- **The DB half and the composition go in `src/lib/server/`**, modelled on `src/lib/server/invite-rewards-switch.ts`:
  - one `SystemConfig` row holding `{ token }`, sealed with `signSession` plus a purpose tag and a version;
  - strict verify (`ABSENT` / `UNREAD` / `MALFORMED` / `SET`);
  - a `composeX(ceiling, stored)` truth table;
  - a ≤10 s cached reader for screens and `/api/health`;
  - `writeStoredSwitchVerified`, which seals, saves, reads back and compares;
  - a test seam.
  - The write ceremony is `invite-rewards-ceremony.ts` → `switchInvitePayable()`: stored-role check, TOTP, reason
    5–300, `withLock`, an audit row BEFORE the write, then an outcome row.

**Roles** (`src/lib/server/roles.ts`, pure)
- `ADMIN_CONSOLE_ROLES` = ADMIN, COMPLIANCE, MODERATOR. `STAFF_ROLES` = those three plus FINANCE, GROWTH, AUDITOR,
  SUPPORT. SJ-23 wants every staff role, so use `isStaffRole`.
- ⛔ The session role is a photograph. For "the issuer must still be staff", re-read `db.user.findById(issuer)`, as the
  desk action does.

**Crypto and cookies**
- `signSession` / `verifySession` are in `src/lib/server/crypto.ts:139-160`. `exp` is checked automatically; take the
  nonce from `randomId()`.
- Purpose-tagged tokens: `share-token.ts` (`p: "win-share"`).
- Cookie write pattern: `src/app/admin/totp-verify/actions.ts:51-64` (httpOnly, sameSite lax, secure in prod, path /,
  maxAge). Cookie constants are named `*_COOKIE*`, so `test:privacy-notice`'s census resolves them.

**Privacy (same commit as the cookie)**
- §7 wording in en/sw/zh inside `<LegalSection n="7">` (`src/app/legal/privacy/page.tsx`).
- A version bump in `META`, plus a new `PRIVACY_EN_SHA`.
- In `scripts/privacy-notice.test.mts`: add the name to the `COOKIES` pin and an entry to `COOKIE_WORDS`.
- A COMPLIANCE-DECISIONS heading `## <date> · Privacy v<version> …`.

**Admin action**
- An exported `*Action` under `src/app/admin/**/…action*.ts` must have a caller in the same commit
  (`test:orphan-actions`).
- A gate on a domain literal must match the route's domain or be declared in `CONTROL_DOMAIN` (`test:control-gates`
  §5). A new `CONTROL_DOMAIN` entry needs rows for all 9 roles (§2).
- Toggle UI model: `src/app/admin/resolver-queue/two-admin-toggle.tsx` (kit `Toggle` + `ConfirmModal`,
  `runAdminAction`, `useMayAct`).

**Shell and navigation**
- AppShell is in the root layout and is not re-run on soft navigation (`test:shell-boundary`, `test:layout-staleness`).
- After setting or clearing the preview cookie, use `router.refresh()` (same shell) or a hard navigation (shell
  changes).
- `app-shell.tsx:206-230` shows how the viewer is built from the DB row.

**Health and audit**
- `/api/health` is public and has no commit field. Add a `simpleJourney: { ceiling, state }` block beside
  `inviteRewards` (`route.ts:179-183`). `qa:live` (`scripts/pre-deploy-live-check.mjs:365-395`) shows the dual-mode
  check.
- `audit()` never rejects; read `.recorded`. Name the actions `journey.preview.on/off`,
  `journey.rollout.attempt/set`.

## §0b · S1 as built (2026-09-30)

**What exists now**
- **The rollout** — `RolloutState` = WITHDRAWN / STAFF_PREVIEW / ACTIVE, in `src/lib/feature-state.ts`, separate from
  `FeatureState`. The ceiling is `simpleJourneyCeiling()`: STAFF_PREVIEW as shipped (S15 changes that one word), or
  exactly what `FEATURE_SIMPLEJOURNEY` says. What anybody sees is the LOWER of the ceiling and the Owner's switch.
- **The Owner's switch** — `src/lib/server/simple-journey-switch.ts`: one sealed `SystemConfig` row,
  `journey.rollout.switch`, read through a ≤ 10 s snapshot, so a Stop reaches every container within 10 seconds.
  No row = no cap (the ceiling decides). A row that cannot be read or does not verify = WITHDRAWN.
- **The ceremony** — `src/lib/server/simple-journey-ceremony.ts`, the invite switch's shape: Owner on the stored
  role, two-step check, a 5–300 character reason, the lock, the COMPLIANCE attempt row BEFORE the write, a read-back.
  Three acts: the cap (Stop · Resume · staff preview only), issue a preview link, revoke one.
- **The pass** — one HttpOnly cookie, `kp_preview`, sealed with its own secret `JOURNEY_PREVIEW_SECRET`
  (`src/lib/server/journey-preview.ts`). At most 24 hours. Re-checked on every request: a staff pass counts only
  while its issuer's stored row is a staff role on an open account; a link pass only while its link is live.
- **The doors** — `src/app/preview/route.ts` (POST on/off, GET `?t=` for a link), every answer a 303 with
  `private, no-store`, the decisions in `src/lib/server/journey-preview-doors.ts`.
- **The one resolver** — `resolveSimpleJourney()`: AppShell and (from S7) every journey page ask it, so they
  agree. AppShell paints the "Preview" bar (`preview-marker.tsx`) only when it says so.
- **The console** — `/admin/journey` ("New journey", Overview): every staff role sees it and turns their own
  preview on or off; only the Owner moves the rollout and creates or revokes links.
- **Health** — `/api/health` → `simpleJourney: { ceiling, state }`; `qa:live` [E2] asserts no marker for a
  signed-out visitor or the demo player while the state is not ACTIVE.
- **Privacy v2026-09-30** — §7 names `kp_preview` in en/sw/zh; COMPLIANCE-DECISIONS has the entry.

**Decisions taken under Ali's delegation (2026-09-30)**
1. The preview is **opt-in**: a staff role alone sees nothing new, so staff can still see the site as players do.
2. The pass **survives sign-out and sign-in**, so staff can preview as a guest, register a test player and bet as
   that player under the same pass (S8/S10/S14). It opens a view and nothing else, and the bar with "Exit preview"
   is on every page while it counts.
3. The agency's links live **inside the Owner's sealed record**: a revoke and a Stop are the same kind of act, on
   one record, with one reason trail. 25 live links at most; ended and revoked links make room.
4. A Stop is **primary, not claret**: it is undone by Resume, and §B4a keeps claret for acts that cannot be.

**Guards** — `npm run test:simple-journey-flag` (two stores, 128 checks) and `npm run red:simple-journey-flag`
(in-process, 26 planted defects, each caught), in `predeploy`. `npm run qa:journey-preview` is the local browser
drive (guest, SUPPORT officer, player, Owner Stop and Resume, a stranger on a link, revoke): 30/30 on 2026-09-30.

**Still open (S1 close-out)** — pushed (`41ec1703`), `JOURNEY_PREVIEW_SECRET` set on Railway (48 characters),
deploy verified, and a signed-out visitor sees nothing on production (`qa:live` 319/0 there, [E2] included). One
press by Ali remains: `/admin/journey` → "Turn my preview on" → the bar on 50pick.tz. Then S1 is ✅.

## §0i · S6 — the flagged shell (2026-10-01 →) 🔨

**The plan:** [`S6-PLAN.md`](design-system/v5-2026-09-29-simplified-journey/S6-PLAN.md) — 13 work packages (WP0–WP12),
from a read-only mapping workflow (7 researchers, a planner, an adversarial critic: 1 blocker + 9 majors, all accepted).
Its closing "Amendments" section overrides the body. Owner-level calls are §0h points 6–17.

**Order:** A0 (live fix: the away-summary link) → WP0 baseline + parity harness → WP1 words → WP2 pure modules →
WP3 journey unread counter → WP4 captioned balance → WP5 Akaunti hub → WP6a header/tabs/guest sheet (unmounted) →
WP6b the swap + census + header-fit → WP7 overlays → WP8 short titles on positions → WP9 Tiketi zangu → WP10 sell look
(its live grace fix went ahead in its own commit — A8's live half, under Progress) → WP11 `--rail-h` → WP12 proof, merge, deploy.

**Progress:**
- Plan filed (`5a820b9c`).
- **A0 ✅ `c25dcfb8` (live for every player; verified in the served bundle at `9377eed7` — `/positions?tab=settled`
  present, the old link absent):** the away summary's "view" link used `?filter=settled`, which the
  positions page never reads, so it opened ALL tickets; it now opens the settled lens. `test:presence-class` 6.8/6.9
  read the parser's keys and lenses from `portfolio.ts`; `red:presence-class` restores the shipped defect (19/19).
- **A8's live half — the free-sell countdown reads the server's instant (staged 2026-10-01; its own commit, for every
  player, not flagged).** The classic Sell button counted its free exit down from the placement with a constant five
  minutes; the server sells free for each poll's FROZEN `freeExitGraceMinutes`. `freeExitEndsAt(position, market)`
  (`market-service.ts`, beside `exitWindowClosesAt`) now gives that instant from the facts `cashOutValue` decides by —
  `null` when no free window was offered — and the only two files that render SellButton, `src/app/positions/page.tsx`
  and the holder block of `src/app/markets/[id]/page.tsx`, pass it as `freeUntil`. The button's countdown, its m:ss
  label and its free/fee state read that instant only; if the instant is withdrawn while the page is open (a cutoff
  moved earlier), the countdown drops to 0 rather than keeping its last value (the pages also lock the button then, so
  nothing on screen changes today). The placement prop, the constant and the device-clock "closes in more than five
  minutes" guard are gone: the server never asks that, and it took the free label and countdown off sales the server
  still granted free — a bet placed 5–10 minutes before the cutoff read "Sell now … −0 fee" for part of its free
  window (§0h point 13). Otherwise a default 5-minute poll's countdown and markup are unchanged, and no money moves
  differently — `cashOutValue` is not edited (`test:house-bot-seam`'s golden grid). Gate: `test:sell-grace-truth` (in
  predeploy) and its in-process twin `red:sell-grace-truth`. Not part of A8 (both predated it), and closed by A8b (its
  bullet below) for a page whose countdown runs from its own render: once a free window ended, the button kept its last
  server render until the page's next refresh (15 s on a market, 20 s on `/positions`) — on a poll with no paid window
  it still offered "Sell now", which the server refused; on a legacy poll with a paid window it kept showing the free
  price ("−0 fee", and "No fee" in its confirm) while the server charged the fee. Since A8b the button withdraws that
  price the moment its countdown runs out and asks the server at once. A page brought back by Back or Forward restarts
  its countdown from that old render, and until A8e (its bullet below) it could show the free offer for up to one poll
  (§0h point 37 (a)); flipping the button at the paid window's own end (§0h point 37 (e)) is still a follow-up.
- **WP0 baseline — today's reds, re-derived 2026-10-01 at `5a820b9c` + A0** (`test:all --skip responsive,motion`,
  1,550 s): **409/431 green.** The 22 reds are pre-existing on main and none touches S6's files — S6 is neither blamed
  nor credited for them: live-target-safe (§1b ratchet 13 > 5), marketing-consent-ledger, type-scale (§6 tracking
  239 > 235), guards-exist, red-anchors (bar-geometry `sort-summary-unbound` and updown-handover `no-handover-at-all`
  anchors missing after other lanes' commits), revoked-deadend, admin-section-gate, needle-rest (the three ~50 s
  server-backed suites), house-bot-holder-lifecycle (script population 30 > 25), house-bot-reports,
  house-bot-surfaces, kyc-copy-truth, stacking (§6.1 an unnamed z=11 in globals.css), tap-target (§5.1 admin
  generate-button 32 px), decomment (§2.1 23 > 20), updown-digest, updown-source-class, payout-view, orphans
  (marketing + landing-v3 scripts), eyebrow-roles, validation-focus (admin affiliate fields), failure-reasons (§10
  agent apply toast). Every later S6 battery is read against this list.
- **WP0 ✅ `0a2961e4` + `73b99a4a`: `qa:classic-shell-parity` calibrated** — `--prove-red` 49/49, baseline
  `parity-73b99a4a.json` (224 cells, scratchpad), and a null `--compare` on a FRESH server 27/27. Calibration found two
  instrument faults, both fixed: unrendered svg `<defs>` children report 0×0 boxes at page coordinates (recorded by size
  only), and the held viewer's not-found page has its head metadata replaced after load, so robots are read from the
  bytes the server sent.
- **WP1–WP4 ✅ pushed `1931d4c3` (2026-10-01), flagged — nothing mounted yet:** WP1 the journey.* words (`edc690bc`),
  WP2 the pure modules + `test:journey-shell` in predeploy (`738e54a3`), WP3 the journey-only unread counter — the
  classic bell untouched (`84e99716`), WP4 the captioned "Salio" capsule + WalletSheet's journey words, the classic
  pill's tween extracted with identical output (`1931d4c3`). **Proof:** `qa:classic-shell-parity --compare` against
  the pre-S6 baseline 27/27 over 224 cells (classic viewers are served the same shell); `test:all` 409/432 — the reds
  are the §0i baseline's, except `house-bot-designation` (a scratch-Postgres flake: 3/3 green alone) and
  `house-bot-disclosure` (the D19a published-words pin, green once on main — re-run on the pushed tree: green, with
  typecheck, i18n, journey-shell, wallet-reach, feedback-law and simple-journey-flag). `red:tap-rung` refuses to run
  while the pre-existing `tap-target` red stands; `red:journey-shell` catches 55/55.
- **WP5 + WP6a ✅ pushed `cbbe360f`** (the Akaunti hub; the journey header, tabs and guest sheet — built, not
  mounted): parity 27/27 — classic /account changes exactly as named (`account-streams-200`, `account-robots-noindex`,
  32/32 cells each), nothing else; `red:journey-account` 47/47.
- **A8 (live fix for every player) pushed 2026-10-02** — the free-sell countdown reads each market's frozen grace from
  the server (`test:sell-grace-truth` + red 22 plants, cash-out/house-bot seam suites green). ⚠️ Pushed at Ali's request
  to end the session while its full `test:all` re-run (after a rebase over 42 marketing commits) was still running:
  the next session reads `scratchpad/s6/testall-a8b.log` (session 0cb4430f) or re-runs `test:all`, and confirms the
  deploy (`?dpl=`) and the served bundle.
- **⏸ S6 STOPPED HERE (2026-10-04) — resume:** WP0–WP11 are pushed behind the flag, WP6c, WP9 and WP10 included
  (their bullets below, each with what was verified and what is still owed). The classic Sell button's live fixes:
  **A8b** (`1be05fbf`), **A8c**, **A8e** and **A8f** (`c6373d4b`, 2026-10-04) are LIVE and verified (each bullet below
  says how); **A8d** and **A8g** — the question page's Sell button stacks on a phone, `/positions`' big rows put their
  note under the figure, and the free strip never breaks a phrase — and **A8h** — a sale's result stays on screen (a
  host above the row that sold), and a refusal one tap fixes gets no popup — were PUSHED to main on 2026-10-04 at Ali's
  request (`315a3ae5`, `2e3ea161`, rebased over main's marketing commits) while their proof was part-run. **Proven at
  `55cb61e3`** (the same two commits on the base before main's last three marketing commits, which touch none of their
  files): every gate (only the baseline reds, check for check); `red:sell-price-guard` 83/83; the file-mutating reds
  alone, 9 of 10 clean (the tenth below); `red:journey-header-fit` 9/9; parity `--prove-red` 79/79; parity `--compare`
  1: every A8 difference is a named one, the four measured layouts exactly as designed (the holder block's button 56px,
  its label line and its figure line centred inside the padding; `/positions` with every glyph where it was) — to be
  copied in (`scratchpad/s6/a8/copy-measured.py`), with React's DEV-only measure error on 16 `/account` cells and one
  crashed tab beside them (harness patch staged: `a8/parity-devonly.py`); the A8h price-guard drive, paid: 27 of 28 —
  a sale's result outlives its row (D.0, A.7), a moved price is a calm toast with no dialog in both looks, the wait,
  the new price, focus back on the button, the toast still up 6 s on, nothing moved, the next sale dismissing it, a
  broken figure calm — and D.3 failed on the drive's own clock (it started timing after D.0's 2.5 s watch; its recorder
  has the result closing 5.0 s after it opened, then its toast, focus on the next row). **Owed, in this order:** the
  rest of the detached chain (`scratchpad/s6/a8-chain.sh`: the price-guard drive in the current mode, the result
  drives `main`, `extra` and `lost`, the lost-chunk control, the tiles), parity compare 2 after the copy, the
  battery, a production build's first-load reading, and the production check (`?dpl=`, the stylesheet's two phone
  blocks); then **A8i** and **WP12** (S6-PLAN.md).
- **Found on the way (2026-10-04):** `test:house-bot-reports` 0.232 was red on main for three reasons, and while it was,
  `red:house-bot-money`, `-c5`, `-chatbot` and `-console` refused to run for every lane. This lane's S3b had made
  `Transaction.origin` create-only in both txn twins and so broken 0.232.4's exact-text pin — re-pinned (`50552c40`); the
  tax report's dev seeder planted a positioned payout with no house marker (0.232.0/0.232.1) — fixed by its lane on report
  (`5bda3c1b`), as were its `unsaved-changes` and `wallet-status-writers` reds (`f9054c70`). The four reds run again:
  money, c5 and chatbot pass; console caught 234 of its 484 with none missed before it was stopped to free the lock.
  Recorded for their owners, not changed: `red:updown-digest`'s two `/updown/history` anchors are gone since `4f9abedc`;
  `red:ticker-honesty`'s cases 9 and 10 anchor on a line `platform-stats.ts` holds twice; `red:bonus-one-side` misses its
  house-position mutation (A8c touches nothing it reads); `test:stacking` 6.1 is red on main since `2ab8830e` (the LIVE
  strip's focus ring, `.ticker-viewport:focus-visible`, takes z 11, a root-plane rung no table names). Drive lesson:
  `/positions` keeps its closed filter sheet in the DOM with `aria-modal="true"` — a dialog locator asks `:visible`.
  Later the same day: ⚠️ `red:ticker-honesty`'s two refusals hid a BLIND gate — since `03cf7df9` (V12,
  `settledNoFigureReason`) the file holds the VOID guard and the fee call twice, so `test:ticker-honesty` 9.8 and 9.9
  stay green with `settledAmount`'s own copies gone (a VOID handed a money figure; a fee priced from live config).
  The fix is staged (`scratchpad/s6/ticker-rearm.py`: 9.8 reads the function, 9.9 every fee call, the anchors made
  unique), to land with its red at 28/28. ⛔ **A live money defect, every player (→ A8i):** the bet confirm, the Sell
  confirm and the result dialog act on Enter pressed ANYWHERE — a keyboard player who tabs to "Ghairi" and presses Enter
  places the bet or sells (the window listener cancels the button's own click), and Enter meant for a win seal opened
  on top sells in the confirm underneath. A8i (drafting: a dialog acts on Enter only where it is pressed) is next.
- **Found and fixed on the way (2026-10-03):** the S3b funnel panel painted "house stakes" on `/admin/insights` (owner
  ruling D19 keeps house words off admin surfaces outside the house console) — `test:house-bot-surfaces`, red since
  2026-10-01 and carried on the baseline list as another lane's, is green; three red twins had gone blind for reasons
  older than S6 and are re-armed — `red:section-rail` (the bottom nav's coin keeps its own `aria-current`, so stripping
  the tabs' alone changed nothing), `red:measure` (an LF anchor on a CRLF checkout) and `red:feedback-law` (an anchor
  two spaces short since 2026-09-05); the S4 canvas is committed under
  `docs/design-system/v5-2026-09-29-simplified-journey/s4-canvas/` (its claude.ai artifact can no longer be read); twelve
  live Swahili strings that give *dau* class-10 agreement are listed with corrections in `S4-COPY-AUDIT.md` for S12.
  Method and tools: memory `project_kipindi_vodacom_plan` (staged change sets, `apply_changeset.py`, `run-gates.sh`,
  `run-parity.sh`).
- **WP0 parity harness — `npm run qa:classic-shell-parity`** (written, not yet run; local in-memory server only). Four
  viewers (guest, demo player, held, unconfirmed email) × en/sw × 360/768/1024/1280 × `/`, `/markets`, `/positions`,
  `/wallet`, `/profile`, `/account` and an unmatched control path. Per cell: header, rail, shell footer and email bar
  (markup, boxes, computed styles), the fixed overlays, the footer and scroll padding, and journey traces in the page
  and in the raw HTML; plus the classic `/positions` body for the signed-in viewers. No other page body is captured
  (WP10 adds the holder block). **Served-byte changes S6 makes for classic viewers** — the harness's EXPECTED_DIFFS,
  never a re-baseline (A3): `account-streams-200` — `/account` answers the not-found body at HTTP 200 instead of 404
  (WP5), with the not-found title, noindex and no journey trace asserted on every run, and no `account/loading.tsx`;
  `account-robots-noindex` — the robots meta in the bytes `/account` sends becomes the page's own "noindex, nofollow"
  where an unmatched path sends the root layout's "index, follow" and Next's 404 "noindex" (WP5, A2: at HTTP 200 the
  page's metadata replaces the root's, and Next adds no noindex of its own; still noindex for a crawler);
  WP11's footer class string is to come. Outside the harness's cells (its demo portfolio is empty, and it captures no
  market page), A8's live half changes what classic holders are served too: each Sell button's props carry `freeUntil`
  in place of `placedAt`, and its free strip follows the poll's frozen grace (§0h point 13). WP0 is done when
  `--prove-red` is green, the baseline is captured at the pre-S6 commit, and a null `--compare` on a fresh server at
  that commit exits 0 (the instrument's calibration). A
  compare is refused after a rebase, or after a merge that carries served files in (A18).
- **WP5 — the Akaunti hub, `/account` (SJ-17), staged 2026-10-01.** `src/app/account/page.tsx` asks the one resolver
  first and calls `notFound()` for every request the journey is not shown to, before any read; its tab title does the
  same and answers the not-found page's own metadata with noindex (A2); there is no `account/loading.tsx` (A3). The rows
  are data — `hubRowsFor(viewer)` in `src/components/journey/account/hub-rows.ts`, a census root for WP6b (A9) — and the
  reader is `loadHubViewer(userId, deps)` in `src/lib/server/hub-viewer.ts`, composed through `viewerDoorsFor`, every
  failed read closing a door (A14). As built: Pumzika and Jizuie are two rows (`#break`, `#exclude`) and the play-safe
  card sits above invite (A17, §0h point 15); Msaada names no number and the helpline keeps its own row from
  `support-config.ts` (§0h point 10); the console is one plain link for every staff role (§0h point 8); Kuwa wakala
  follows the footer's rule for a signed-in reader (§0h point 9, COMPLIANCE-DECISIONS); a held wallet is offered no
  money door, as in the wallet sheet; the language choices open in the page's flow and the card size is a switch row
  (§0h point 7). Gates: `test:journey-account` and its in-process red twin (both new; the first in predeploy, with a
  database-mode run on a fake client), `test:simple-journey-flag` 10.page.account, `test:shell-boundary` §2b,
  `test:withdrawn-features` §7, `test:density-contract` §4h, `test:popup-fit`, `test:route-census` (bucket D),
  `test:journey-shell` 1.census (its `/account` exemption expires with this commit). A13's "sign-out row unreviewed"
  plant lives in `red:journey-account` (check `8.popup`), because the row lands before WP6a exports the popup check;
  WP6a's `red:journey-shell` adds the plan's own plant beside it — keep both. `/account` stays out of the responsive
  sweep until that sweep can hold a pass (A15, reason in `responsive-audit.mjs`). Served bytes for a classic viewer:
  `account-streams-200` and `account-robots-noindex` above, both named in the parity harness; the `.kp-hub*` rules in
  `globals.css` (they match nothing on a classic page); and two `export` keywords in `language-menu.tsx`'s client chunk.
- **WP8 — short titles on the position projection (applied 2026-10-02).** `PositionCardMarket`, the one DAL projection
  behind `/positions` and the signed-in hero's picks, carries `shortTitleEn/Sw/Zh` as stored, NULL included: the
  memory twin passes them through, and the Prisma twin selects and maps them. No `competition` (the canvas's ticket
  card draws none). `cardTitle`'s `titleSw` now takes NULL, so WP9's ticket card uses the S2 helper on the projection
  as it is (a type widening; `pickLocalized` already read NULL as absent). Gates: `test:dal-parity` §10's `10.cards`
  checks (the type, both twins' objects and the Prisma select name the same fields, each read from the row, the short
  titles verbatim) and five new `red:dal-parity` plants. Classic viewers: nothing served changes, because no page
  reads the new fields yet.
- **WP6b — the shell swap, the route census and the header-fit gate (re-drafted and reviewed 2026-10-02; applied, not
  yet ✅ — the owed list below).** AppShell's two mount points are ternaries on `journeyShown`: a journey request gets
  the journey header (its break flag is the shell's own `promoSuppressed`) and the four tabs (keyed by the viewer's
  id); every other request gets, in the else arms, today's `TopAppBar` and `BottomNav` with today's props. Both journey
  arms are LAZY, declared the way AppShell declares its overlays, each in its own Suspense, so their code stays out of
  the first-load bundle every classic visitor downloads (⚠️ it did not: owed item 2 below, fixed by WP6c). The header's
  fallback is the bar's own empty box (its height,
  panel and border), so a journey page does not jump while that code arrives; the rail needs none (it takes no room in
  the page). The cost, until S15 flips which side is lazy: a journey viewer's header hydrates one chunk fetch later.
  `test:simple-journey-flag` 10.shell.chrome pins both ternaries with their classic arms verbatim, the lazy bindings,
  and nothing else rendering or loading the journey chrome (6 new plants); `test:journey-shell` 8.mount holds the same
  from the import graph (2 plants); `test:stacking` now reads a lazy binding as rendering its component (5.6, a
  control), so its AWAITING_MOUNT exemption for the rail expired with the mount, as it was built to. **The route
  census** is `test:journey-shell` §9, a reachability graph (A9): the roots are what a journey phone shows (the tabs,
  the header's own links, the sheets, the footer, and on `/account` the hub's rows), the edges are each page's
  decommented path literals, and for seven kinds of reader every route the classic chrome reaches, the journey reaches
  too. Every route on disk has a journey entrance or is one of nine named external ones (email and SMS links, the
  payment provider's return, the edge's staff sign-in, the service worker's offline page), each tied to the file that
  generates it and expiring the day a door reaches it. `/updown/history` and `/positions/performance` are pinned to
  their classic page doors until WP9 re-points them (A15). 12 in-memory plants, A9's three among them (an orphan
  cycle, a door only in a comment, the agent terms' door removed). Its limits are written in its header: a link built
  in a `.ts` helper is no edge, and every literal a page holds counts for every reader. ⚠️ In predeploy it is
  bookkeeping another lane can trip — a new page nothing links, a door added to or taken from the classic chrome, a
  page that links an external route: clear it in that lane's commit by editing the census's table. The bell is held
  one way only (A1). **The header-fit gate** is `npm run qa:journey-header-fit`, the clean matrix through a real
  staff pass: 66 cells (320–1279 × sw/en/zh, a guest and a player at TZS 999,999, and at 320 and 1024 TZS 9.9M,
  TZS 0, a held wallet and hidden balances). The RULE probe reads every S4 rule against its fixed token (a KP_ROUTE
  that hides the deposit pill skips the pill's rules there, by the header's own rule, which `test:journey-shell` §10
  holds the drives' copy to), and the FIT probes report clipping, overflow and each cell's slack (the row's free
  space: what the spacer between the two clusters holds), with the rail-label lines A17 owes. **Measured 2026-10-02
  (local in-memory server, a real staff pass, Chromium with the real fonts): 66 of 66 cells, every S4 rule holds, no
  control clipped, no overflow.** Least slack: 17.5px at sw 360 for TZS 999,999 (the "+" arrives and the gutter grows
  at 360, so 360 is tighter than 320's 18.7px); en 39.6px, zh 63.6px there. TZS 9.9M and TZS 0 leave the same room
  (sw 33px at 320), by design: the capsule reserves the hidden-balance mask's width, so a short figure never narrows
  it and hiding balances never moves the header. From 768 nothing is near the edge (≥ 96px at 1024, the tightest
  desktop width). The rail: sw "Tiketi zangu" takes two lines at 320 and one from 360, en and zh one everywhere, none
  cut — §0h point 18's model, confirmed. The first runs found three faults in the PROBES, none in the header (a shown
  span and the "+" compute `flex`, not `inline-flex`: a flex item's display is blockified; the slack had been the
  always-zero gap after the pushed cluster; the verdict cut its list at six), each fixed in the drive itself. Its red twin makes nine single-line `globals.css` mutations, each
  one rule the RULE probe must break in some cell, and a CSS witness makes an unserved mutation read BROKEN. ⛔ It runs
  only as `npm run red:journey-header-fit -- --alone`: without `--alone`, or inside `red:all` (which now marks every
  harness it starts with KP_RED_ALL), it refuses with exit 2 before writing anything. `test:journey-shell` §10 holds
  both refusals, and holds the stylesheet free of witnesses, so a mutation a hard kill left behind fails predeploy by
  name (and the twin refuses to start over one). Every mutated file is restored on exit, on an error and on any signal
  the OS delivers, each write retried, and every wait races a 30-minute budget that prints INCONCLUSIVE rather than be
  killed; a hard kill on Windows runs none of that, which is what the witness check is for. Its anchors are declared
  in `journey-header-fit.anchors.mjs`. **Served bytes for a classic viewer:** the same markup and RSC rows, because
  the else arms are today's elements, so `qa:classic-shell-parity` needs no new EXPECTED_DIFFS entry. The journey
  chrome's JavaScript is lazy, so a classic page's payload names none of it — but parity cannot see JavaScript, so
  that stays a claim until a production build shows it (owed, item 2). **Owed before WP6b is ✅:** (1) ✅ the parity
  compare against the baseline captured at WP6b's parent `b3153d98` (live main; A18): 224 cells, no unexpected
  difference, 27/27; (2) a production build: the root
  layout's client chunks carry no journey-top-bar or journey-tabs module, or `npm run perf:smoke`'s JavaScript on a
  classic page is unchanged — ❌ **MEASURED ON PRODUCTION 2026-10-03, AND FALSE** (`scratchpad/s6/prod/chunks-check.sh`,
  read-only: every `/_next/` script a signed-out visitor's page loads, fetched and searched, with the classic bar's own
  test ids as the control): before the push, no journey string in the initial scripts of `/`, `/markets`, `/positions`,
  `/help`; after it, every one carries `journey-top-bar`, `journey-tabs` and nine `kp-jhdr` — +12.5 KB raw on `/`
  (≈3–4 KB gzipped), downloaded and never rendered. The chunk that holds them also holds the channels panel and the
  consent prompt: `React.lazy` in a server component (AppShell) does not split client code in this Next/Turbopack
  build, so the journey chrome landed where AppShell's older "lazy" overlays always were. Nothing a player sees
  changes; the plan's claim does. Fixed by **WP6c** (§0h point 20; its bullet below, applied 2026-10-03); this item turns ✅ when
  the coordinator's local production build reads no journey header or tabs code in a classic page's initial scripts; (3) ✅ `npm run qa:journey-header-fit`,
  66/66 (above); (4) ✅ its red twin, detached and alone under the heavy-node lock: 9/9 mutations caught, 0 missed, 0 broken, 0 files left modified, and `git diff` of `src/` empty after it; (5) the
  qa:journey-shell tiles (WP6b step 5, not yet written: the header at 320–1280 × sw/en/zh, held, masked, zero and
  999,999, the active tab on each destination, the guest sheet, the Wallet, the unread dot, the focus ring, the tab
  labels at 320, and no-pass viewers still classic); (6) A1's G1 drive: on a preview session, end account A through
  the idle (E-381) path, sign B in through the header's link, and the Akaunti dot and the Arifa row never show A's
  count before B's first answer lands; (7) ✅ `scripts/footer-reachable.mjs` learning the pass (A15) — `--journey`, landed with WP11 (its bullet); (8)
  `scripts/qa-journey-preview.mjs`'s step-7 pass tiles, its trace regex matching test ids rather than chunk names;
  (9) ✅ the SJ-16 supersession notes in v4 ACCEPTANCE §C2, UPDATE-2026-09-28 §1 and the v4 INHERIT-MANIFEST R1/L4/L20
  (2026-10-03; each says "for journey viewers only", and every other viewer keeps the rule as written).
- **WP7 — the overlay stand-downs and the email-bar rule (applied 2026-10-03, verified locally, pushed behind the flag
  with WP6b).** AppShell mounts the journey
  flag for a journey request only, lazily, beside the funnel's span; while it is mounted the html element carries
  `data-journey`, which `useJourneyOn()` reads. On the pages the journey re-draws (`isJourneySurface`: `/`, a question,
  Tiketi zangu in both kinds, the deposit screen and its return) a journey viewer meets no Needle, no channels panel and
  no chat bubble. Each is one term, `journeyOn && isJourneySurface(pathname)`, joined to the rule the overlay already
  had: the Needle's visibility gate (and its dependencies), the panel's `eligible` plus a render guard after its pinned
  line, and a render guard after the chat's HIDE_ON line, which closes nothing and keeps the conversation. For every
  other viewer each rule is today's, because `useJourneyOn` answers false without the flag and on the server. HIDE_ON,
  the analytics consent prompt (still asked of everybody) and the install invitation are untouched. A journey viewer
  gets no email-verify bar (§3.2 item 2): `{emailVerifyState && !journeyShown && …}`, decided per request. The deposit
  screen's own email gate still refuses an unconfirmed address; what goes is the reminder on every other page (the agent
  application's fee also needs a confirmed address and loses it too) until S9 asks for the code in the flow. Gates:
  `test:journey-shell` §11 (each join as written beside today's half, the flag read once and the one list asked once,
  the chat keeping its conversation, the HIDE_ON patterns, the consent prompt ungated, the email bar gated, the flag
  loaded lazily by AppShell alone) and 5.mount rewritten for the real mount, with 15 new in-memory plants;
  `test:simple-journey-flag` 10.shell.emailbar with 2 plants (no gate held this bar before); `test:install-invite` 5.2
  widened as A4 says (any import list naming `isMoneySurface` from `@/lib/surfaces`, plus a new clause that the Needle
  declares no money route or predicate of its own), with one new `red:install-invite` mutation per half. SHELVED rows
  for all four. Served bytes for a classic viewer: no markup; the RSC payload carries one `false` child where the flag
  would mount; and the Needle's, the panel's and the chat's client code now carry the flag hook and `isJourneySurface`
  (the Needle is in every page's first load). **Verified (2026-10-03):** WP7's 37 gates (the reds are the §0i
  baseline's: stacking z=11, red-anchors ×2, orphans — one more, `marketing-compose-drive.mjs`, from the marketing
  lane's U37b); `red:install-invite` detached and alone, 13/13, the tree byte-identical after;
  `red:journey-shell` 134/134; `qa:classic-shell-parity --compare` against WP6b's parent: 224 cells, no unexpected
  difference (the first run lost its server to a segmentation fault in Node at the held viewer — this laptop's RAM —
  and was re-run whole). **The drive found a flash, and the fix is in:** watched every frame of a fresh load, the chat
  bubble never drew on a journey page, but the NEEDLE did — 1–3 frames (≈280–370 ms) on every load of `/` and
  `/positions`, because it hydrates outside the lazy flag's Suspense boundary and started its engine ≈30 ms before the
  flag landed. So AppShell now also writes the shell's MARK into the server's HTML for a journey request
  (`{journeyShown && <span hidden id={JOURNEY_SHELL_MARK} />}`, the id in the pure `lib/journey/shell-mark.ts`), and
  `journeyFlagSnapshot` reads the mark or the flag: `useSyncExternalStore` finds it right after hydration, before any
  overlay can draw, and the flag stays the event for `router.refresh()`. `test:journey-shell` 5.mark, 5.mark.mount and
  5.mark.pure, with three plants. Re-driven: 32/32 — on `/` and `/positions` a journey viewer meets neither the Needle
  nor the bubble in any frame; on `/markets` (the board is not a journey page) and `/help` both are there; a classic
  viewer has both everywhere, `data-journey` never set (the controls). Served bytes for a classic viewer: one more
  `false` child in the RSC payload (the mark's slot), no markup. **Pushed with WP6b, `679acf72`, live 2026-10-03** after
  the full battery: 428/448, every red on the §0i baseline list (marketing-consent-ledger and guards-exist have turned
  green since; `needle-rest` still fails only for want of a server on :3009, as at WP0).
- **WP11 — `--rail-h`, the one name for the phone rail's reserve (2026-10-03).** `--rail-h: 88px` sits in `:root`
  beside the other reserved heights; the footer's bottom padding (`public-footer.tsx`, now
  `pb-[calc(var(--rail-h)+env(safe-area-inset-bottom))]`) and D57's html scroll padding read it, so S9's focused chrome
  and the Mobile Visual lane's U21 have one knob (MOBILE-VISUAL-PLAN's rail row now says: adopt it, never a second).
  The chat bubble's 80 and the install card's 148 stay literal — test:stacking's chat-fab locator and
  test:install-invite 5.4 pin them — and each now names `--rail-h` as its source in a comment. `qa:footer-reachable`
  learns `--journey` (A15; WP6b's owed item 7): every context carries a minted staff pass, and each cell first proves
  the journey shell is on the page. **Verified:** WP11's gates (only the §0i baseline reds); `qa:footer-reachable`
  108/108 classic and 114/114 `--journey`, each `--prove-red` catching the buried "Export / close my account" at 360 in
  en, sw and zh; `qa:classic-shell-parity --compare`: the one named difference `footer-rail-h` in exactly 224 of 224
  cells, nothing else — the computed footer padding and scroll padding are compared in every cell and equal.
  **Served bytes for a classic viewer:** the footer's class string and one CSS custom property; computed values equal.
- **WP6c — AppShell's lazily loaded parts, out of every page's initial scripts (applied 2026-10-03; §0h point 20,
  WP6b's owed item 2).** AppShell is a server component, and its eleven `React.lazy` bindings split nothing in this
  Next 16/Turbopack build: a client module that a server component reaches through `import()` still joins the root
  layout's client entry, so all eleven rode in the scripts every page loads first, for every visitor (production
  showed the journey's header and tabs there after WP6b, in the chunk that already held the channels panel and the
  consent prompt; a local production build read the eight older parts there too, 2026-10-03). Ten now come from ONE
  client module, `src/components/layout/shell-lazy.tsx`, each a `next/dynamic` import of its "use client" component
  with no option object (the server render stays on, no `loading`), under the name AppShell already rendered it by:
  pull-to-refresh, the win celebration, the notify poller, the event stream, the install card, the analytics consent
  prompt, the channels panel, the journey flag, and the journey header and tabs. AppShell imports them and renders
  each exactly where, and with exactly the props, it did (those JSX lines are untouched), inside the Suspense
  boundaries and fallbacks it already had, the journey header's `kp-jhdr` box among them; each boundary is now its
  part's only one, because `next/dynamic` adds its own only for `ssr: false` or a `loading` option
  (`node_modules/next/dist/shared/lib/lazy-dynamic/loadable.js`, `hasSuspenseBoundary`). The eleventh, the offline
  banner, is imported statically instead and still rendered in its own boundary: its one job is a connection that
  fails, so its code comes with the page's own scripts, as it always did, and never by a fetch the same failure could
  stop. **A part whose code never arrives is left out, not fatal.** Each part is now a fetch of its own; a dropped
  connection, or a deploy landing between the page and a part's chunk, gives a `ChunkLoadError` that Turbopack never
  retries, and with no error boundary between AppShell and the root, React's rejected lazy load would put the whole
  page on the critical-error screen ("Something broke too early to recover", whose "Try again" re-renders the same
  rejection). So every loader ends in `.catch(nothingIfLost)`: that part renders nothing for the rest of the page's
  life, one report per page goes to `/api/client-error`, and any other error is thrown on, as before. The server never
  takes that path (its chunks are on disk), so the HTML does not change. **Served bytes for a classic viewer:** the
  body's markup is the same elements in the same Suspense boundaries; the head gains one low-priority script preload
  per chunk of each part the server rendered (Next's PreloadChunks, from the route's react-loadable manifest: signed
  out, pull-to-refresh, the win celebration, the consent prompt and the channels panel; signed in, also the poller and
  the event stream); the RSC rows of those parts name `shell-lazy.tsx` and its `Lazy…` exports instead of each part's
  own module; and the initial scripts lose the parts' code. Those classic overlays still download on every classic
  page, now at low priority beside the page's own scripts (the win celebration's code stays in the initial scripts,
  because `away-summary-bar.tsx` imports `dispatchWinCelebration` from it); only the journey's three parts and the
  withdrawn install card leave a classic visitor's downloads, the journey chrome's ≈12.5 KB raw among them. Turbopack
  copies a helper two async chunks share into both (the experiment build did so for the journey header and tabs), so
  `invitation-slot.ts` likely downloads twice, in the consent prompt's chunk and the panel's, and still runs once.
  **Timing:** each part hydrates when its chunk lands instead of with the page; a soft navigation that starts before a
  part's chunk has landed waits for it (React hydrates a boundary before it passes a changed context into it); a soft
  sign-in mounts the poller and the event stream with no preload, so their chunks are fetched then. A journey viewer's
  header and tabs hydrate one chunk fetch later, as WP6b said: until then a header link is a full page load and its
  buttons do nothing, and on a switch into the journey mid-visit the header shows its `kp-jhdr` box and the rail is
  absent until the tabs' chunk lands — accepted while journey viewers are staff, measured before S15 (owed 7). **What
  parity cannot see:** `qa:classic-shell-parity` compares the shell's regions (header, rail, footer, email bar, the
  signed-in `/positions` body) and the on-screen fixed overlays; every part's boundary sits beside those regions, so
  the boundaries are held by `test:journey-shell` 12.shell.wrapped and the bytes by owed drive (2). **Guard:**
  `test:journey-shell` §12, in predeploy: AppShell calls and imports no React `lazy` under any name; every lazily
  loaded part it renders is imported from that one module under its table name and rendered once, as the one child of
  its own Suspense boundary, and AppShell imports none of the parts' own modules; the offline banner is imported
  statically and mounted once in its own boundary; the module is "use client", imports nothing statically but
  `next/dynamic`, declares exactly the ten parts (each one line, no option object, ending in the guard), keeps the
  guard as written (a `ChunkLoadError` alone, reported, anything else thrown on), and only AppShell imports it; each
  part's module is "use client" and loaded from there alone (the win celebration's three static importers named); and
  no server module in `src` calls React's `lazy` or defers a "use client" module through `import()` at all,
  `next/dynamic` included. 24 in-memory plants in `red:journey-shell`; `test:journey-shell` 8.mount, 8.mount.lazy and
  11.flag.lazy, `test:simple-journey-flag` 10.shell.chrome.lazy and .only (3 new plants) and `test:stacking`'s binding
  reader (5.6) read the new home. **Proof so far:** a throwaway local production build of the same pattern for the
  journey's three parts (2026-10-03, `scratchpad/s6/wp6c/first-load-experiment.txt`): the journey header and tabs left
  the initial scripts of `/`, `/markets`, `/positions` and `/help` for chunks of their own, each listed in the route's
  react-loadable manifest, while the channels panel and the consent prompt, still `React.lazy` there, stayed in them
  (the in-build control), and the classic deposit control was found. **Owed (the coordinator's drives):** (1) a
  production build read by `scratchpad/s6/wp6c/first-load-parts.py` (and `first-load.py`) on `/`, `/markets`,
  `/positions` and `/help`: every part but the win celebration in a chunk of its own with its marker out of the
  initial scripts, the offline banner's and the win celebration's markers in them (`first-load.py`'s flag marker,
  `raiseJourneyFlag`, cannot leave: `journey-on.ts` defines it and the Needle loads that on every page by design since
  WP7); (2) the served HTML, compared by `scratchpad/s6/wp6c/shell-skeleton.py`: the second (warm) response of each of
  those four routes, signed out in en, plus one signed-in cell and one journey-preview cell, from a server at HEAD and
  a server with WP6c, after a HEAD-against-HEAD null pair that must show no change: the body's skeleton identical, no
  client-rendered boundary (`<!--$!-->`), the head changed only by low-priority script preloads and the initial script
  list (the dev server: `next start` cannot serve here, because the in-memory store refuses production and
  `/auth/demo` answers 404 there, so the production build is read statically by (1)); (3)
  `qa:classic-shell-parity --compare`, 224 cells, only the `footer-rail-h` difference WP11 named; (4) every part still
  mounts (the offline banner when the context goes offline, the consent prompt with `?consent=1`, the win
  celebration's `ack.accepted` on a `50pick:celebrate` event, the signed-in `/api/events` stream), and a part's chunk
  aborted on a classic page (Playwright `route.abort`) leaves the page up, that part absent and one
  `/api/client-error` report, while the same abort with that line's `.catch(nothingIfLost)` removed reaches the
  critical-error screen (the drive can fail); (5) the WP7 frame drive (32 cells), plus a switch into the journey
  mid-visit; (6) after the push, production read as a guest by `scratchpad/s6/wp6c/chunks-check-wp6c.sh`
  (`prod/chunks-check.sh` with the script preloads listed apart): no journey header or tabs code (`journey-top-bar`,
  `journey-tabs`, `kp-jhdr`) in the initial scripts, the preloads present and no `<!--$!-->` in the HTML; it reports
  `kp-journey-shell` without failing (`shell-mark.ts`, which `journey-on.ts` brings into every page by design), and
  any byte figure adds the preloads to the scripts; (7) before S15, the journey header's and tabs' time to interactive
  on a throttled phone, and whether they still belong behind a low-priority chunk; (8) platform: the same `.catch`
  belongs on the two older `next/dynamic` parts in `layout/lazy-overlays.tsx` (the chat bubble and the first-visit
  primer, exposed the same way since before S6) and on WP9's `ticket-switch-rail.tsx`, the guard lifted into one
  shared module when a second file takes it (WP9 cannot import a WP6c module while the two change sets must apply in
  either order). **Verified 2026-10-03, before the push:** (1) ✅ the production build, every part's verdict as expected
  on `/`, `/markets`, `/positions` and `/help` — ten parts in chunks of their own, out of the initial scripts; the offline
  banner and the win celebration in them; the control found; WP9's Tabs a chunk of its own on `/positions`; (2) ✅ the
  HEAD null pair 8/8 identical, then WP6c: every body skeleton identical, no new client-rendered boundary, the head gaining
  only low-priority script preloads (8 signed out, 12 signed in, 18 for a journey reader) — the comparison tool was
  corrected first: the tree carries two bail-outs by design (lazy-overlays' chat bubble and primer, `ssr: false`), and the
  identity avatar's ids differ between server runs; (3) ✅ parity 27/27; (4) ✅ every part mounts, a lost chunk leaves the
  page up and is reported once, and the control — the guard removed from the consent line — reaches the critical-error
  screen; (5) ✅ the WP7 frame drive 32/32 (the mid-visit switch is not driven); (6) owed after the push; (7) and (8)
  owed.
- **WP9 — Tiketi zangu (2026-10-03).** For a journey request `/positions` is "Tiketi zangu" in the canvas's order, and
  `/updown/history` wears the same name and the Maswali | Juu/Chini switch (the kit's underline rail in link mode,
  `aria-current="page"` on the page being read); every other reader is served today's pages. Both pages ask the one
  per-request resolver after their session check, as the shell does. `/positions` returns the journey's view before its
  classic JSX, which is unchanged, and keeps every read and the exit pricing; `/updown/history` swaps its back link and
  its header through two sibling ternaries, each standing where its element stood, so a classic reader's tree is
  today's. The head is the kit's `PageHeader` with the name alone (its eyebrow is now optional, and every classic call
  site still passes one), then the switch, whose kit `Tabs` loads through a small client wrapper (`next/dynamic`, the
  server render on), so a classic reader of either route is sent only the wrapper. The view is handed what the page
  read and lists by the lens alone: search and sort are shelved for preview viewers (§0h point 11, A19), the side,
  topic and window groups are row 2's, which the journey's bar does not draw (WP9 step 5), and a link's other settings
  are ignored for a journey reader (§0h point 23); its bar draws all seven lenses with no counts and no "Nafasi" (A7),
  named "Chuja tiketi" (en "Filter tickets", zh "筛选注单"), and an empty outcome lens reads the journey's own copies
  of today's sentences, zh 注单 where today's say 持仓 (§0h point 27). Its ticket card shows the side and the state (one
  colour rule, `positionStatusChip`, which the classic card now calls too), the short title as its only link — a 44px
  target that moves nothing — Dau and Malipo — no figure until the result, whatever the market is doing (SJ-4, §C3,
  §0h point 22), then what was paid — the ticket number, and when it was placed and when selection closes, each
  formatted on the server from its instant. Its Sell button is the classic one (the journey look is WP10's), handed the
  server's free-sell instant (A8). The Utendaji link sits after the list and the pager (§0h point 33). The loading
  ghosts are chosen on the server from the same answer (§0h point 21), so a journey reader never meets the classic
  ghost. The error pages are never drawn on the server: each mounts in the browser, where the journey flag reads the
  shell's mark already in the page, so a journey reader's first sight of one has the tickets' words — on `/positions`
  the body and the back link, on `/updown/history` the body only (its back link stays "Rudi Juu na Chini") — and both
  keep RouteError's own eyebrow and headline. Gates: `test:journey-tickets` (new, in predeploy) and its in-process red
  twin, a plant for every check; `test:sell-grace-truth` §2 names the journey card as a host (three plants);
  `test:timer-date` §3 (seven card checks) and `test:position-permalink` 5.5/5.6 cover the journey card, with two new
  `red:timer-date` and two new `red:position-permalink` mutations; `test:journey-shell` §9 pins each tickets route at
  both its doors — the classic page's and the journey view's — a plant each. SHELVED rows for the profit strip, the
  yes/no bar, search, row 2 of the bar and the lens counts, the countdown ring, sharing, the classic header and card, and
  the Up & Down history's back link and header. Still saying "nafasi" to a journey reader: the Sell button's own dialogs
  (until WP10, §0h point 24); and, off Tiketi zangu itself, `/positions/performance` (its eyebrow, back link, empty title
  and result count), the question page's holder heading ("Nafasi zako") and the desktop avatar menu's "Nafasi" row — all
  on §3's S15 rename list (§0h point 34). Served bytes for a classic viewer: no markup, title, CSS or RSC change on
  either page. JS: the small switch wrapper joins both routes' client graph (the kit `Tabs` loads only when a journey
  request draws the rail — WP6c's production build proves it, owed); the dictionary every page bundles gains four
  journey keys and two journey values change; `PageHeader` draws its eyebrow under a condition every classic call site
  meets (its code also ships to `/wallet` and the opt-out page); the two error pages' chunks import the flag hook; the
  position card's calls the shared chip rule (same result). Owed before WP9 is ✅: the battery and the red twins;
  `qa:classic-shell-parity` with `--compare`, `/positions` included; a production build's first-load check of both
  routes; and the tiles — Tiketi open, settled and empty, the guest sheet and the `/updown/history` switch at 320, 390
  and 1280 in sw, en and zh, with the journey ghost watched on a soft navigation and on a first document load.
  **Verified 2026-10-03, before the push:** the gates (the reds are the §0i baseline's, plus the D19a published-words pin
  until the dictionary reaches main); every file-mutating red twin alone, the tree clean after each (two were found blind
  for reasons older than S6 and re-armed — `red:section-rail`, `red:measure`); `qa:classic-shell-parity --compare`, 224
  cells, no unexpected difference (its 2.12 tripped only because a scripts-only commit moved HEAD mid-run; the served
  paths were proved identical); the first-load check of both routes by WP6c's build; tiles at 320, 390 and 1280 in sw, en
  and zh — the empty state, the guest sheet, open and sold tickets, the Up & Down head — with no overflow, script error or
  hydration warning. Not drawn: won, lost and refunded cards (the portfolio seed needs twelve real markets and the dev
  store seeds seven) and the loading ghost (a dev server does not prefetch, so a held response keeps the previous page) —
  both held in code and by `test:journey-tickets`. Found on the way: the classic Sell label overflows at 320 in sw (A8b).
- **WP10 — the journey's Sell look (2026-10-03).** On a journey ticket the Sell button wears the canvas's look
  (`s4-canvas/s4-9-tiketi-open.dc.html` beside S6-PLAN, in the kit's tokens); everywhere else it is today's. The card binds the server's free-sell instant
  once (`freeExitEndsAt`, A8) and hands the button that instant, `look="journey"`, the instant's clock time read on the
  server (`formatClock`, the platform's zone; never a time built from the placement), and whether the page priced the
  exit inside its free window (`pricedFree`: `/positions` adds `free`, `cashOutValue`'s own `inGracePeriod`, to the
  price it already computes for every open exit). In the free window the ticket says "Uza bila ada hadi 11:23 · 3:42"
  (the time in a `<time>` naming the instant, then the button's own countdown to it) over an outlined button, "Uza bila
  ada" above "Rudishiwa TZS 1,000 kamili": the amount is `value`, the figure the page priced with `cashOutValue`, which
  inside the free window is the whole stake (`gross`), so nothing on the phone works it out. That free offer stands only
  while the page priced it free and the countdown runs. On the server's paint, before the countdown has run, it is drawn
  without the countdown; the moment the countdown runs out the look withdraws it: the button dims to "Inapakia…" with
  no figure and nothing to press, a confirm still showing the free price closes (unless a sale is already in flight),
  and the page is asked for the server's answer at once (the `50pick:refresh` event its poller listens to, once per
  run of the countdown) instead of at the poller's next beat, up to 20 s later. A default poll then shows "Kuuza
  kumefungwa"; a legacy paid window shows its "Uza sasa", figure and fee. A price with a fee shows "Uza sasa", today's
  figure and today's fee from the first paint (a fee of 0 is not printed). Once selling has shut: "Kuuza kumefungwa"
  and the journey's sentence, in words, with no button, from the first paint, because the server's verdict
  (`alreadyClosed`) decides it before the phone's clock does (today's button shows "Uza sasa · TZS 0 −1,000 ada" there
  until the page has started; §0h point 37). The button's edge is the kit's token for a control's edge
  (`--border-control`, the canvas's own colour), set on the button itself because `.btn-ghost` outranks a utility: the
  edge is the button's only boundary, and the kit's outlined default (`--border`) sits under DESIGN_AUTHORITY's 3:1
  floor for a money control's edge on the card (1.60:1 against 3.18:1, by `test:contrast`'s own formula). One pair of
  dialogs serves both looks; under the journey's look the question is "Uza tiketi hii sasa?", the keep button "Baki na
  tiketi" and a failed sale's line "Tiketi haijabadilika.", so a journey reader meets no "nafasi" on Tiketi zangu
  itself (§0h points 35 to 37). The sale (the confirm, `cashOutPositionAction`, the in-flight latch, the deferred toast
  and the sale's two refresh events) is one code path for both looks, and `cashOutValue` is not touched. Gates:
  `test:journey-tickets` §12 (11 checks: the look the card's alone, every host found on disk; the classic return
  and the shared dialogs pinned line for line; the three dialog words; one sale; the free offer, every piece of it drawn
  only on it; the lapse withdrawn and asked about; the paid fee, a 0 unprinted; the shut exit in words from the first
  paint; the edge token; no arithmetic and no time formatted in the look; the sell path's words: no "nafasi", every word
  in three languages, its one 持仓 and its three "toa" words named), with §3.clock and §9 rewritten, 36 new
  in-memory plants (92 in all); `test:sell-grace-truth` §2 now reads a host's one `const` bound to the
  helper's call (bound nowhere else in the file, so a callback's parameter cannot shadow it, and in the block that holds
  the element: 2.passes) and holds a clock label to that binding (2.label), and §3 holds the journey's free offer to the
  countdown narrowed by the server's own pricing (3.journey): 11 new plants (36 in all), the
  card's old one re-pointed at the binding; `test:timer-date` §3 three checks, with three new `red:timer-date`
  mutations. `test:ui-consistency`'s `raw-button-btn-class` count for `sell-button.tsx` is re-derived 1 → 2, for a
  reason: the journey's button holds two lines (20 + 18px) that must grow with the phone's text size, and every kit
  `<Button>` size fixes its height through `--h-control-*` (the tallest, `btn-xl`, is 56px but brings 24px padding,
  16.5px type and a 16px radius), so it is a raw `<button>` wearing the kit's own `btn btn-ghost` classes, its height
  from its padding. `qa:classic-shell-parity` learns WP10 step 3 (its v2): after the matrix, whose demo portfolio stays
  empty, the demo player is given an open ticket through the real money paths, and that ticket's free strip and button
  are captured where a classic holder meets them (its card on `/positions` and its question's holder block) at 360 and
  1280 in en and sw, the strip's ticking clock read as m:ss; in the holder block at 360 the button is also pressed once
  and the classic confirm it opens is captured inside its 10-second quote hold, never confirmed. §S fails a run whose
  cells missed the five-minute free window or whose confirm went stale, and `--prove-red` holds §S's four checks to
  9 plants and, at both places, the capture to a determinism check and to plants on the button, the strip and
  the confirm. Departure from step 3's letter: the capture is SellButton's own elements and the confirm, not the whole
  card and holder row, because those rows print the ticket id and the placement time, which differ per server and per
  minute and are not WP10's. **Served bytes for a classic viewer:** no DOM change and no change to any RSC prop (the
  classic hosts pass nothing new, the classic return draws today's elements, and `/positions`' new `free` field never
  leaves the server); the RSC payload's client reference and the pages' script tags name the rebuilt Sell button chunk;
  no CSS (every utility the look uses is already in `src/`); JS: the Sell button's client code carries the look's
  branch, its state and its three new props, and the confirm dialog its two optional words. **Owed before WP10 is ✅:**
  the battery; `red:journey-tickets`, `red:sell-grace-truth` and `red:timer-date` (detached, alone);
  `qa:classic-shell-parity` `--prove-red`; then the v2 baseline, captured into a NEW file at `7c859cdf`, the parent of
  A8's live half `2bb881e0`, so the Sell cells measure A8's "a default poll compares equal" across that fix as A8's
  as-built asks (an ancestor of HEAD with no merge on its first-parent line since it, so A18 accepts it; the seed routes, `/auth/demo`,
  `/api/health` and the dialogs are byte-identical from it to HEAD; between it and `b3153d98` the only served changes
  are A8 itself, admin campaign pages, three journey words and WP8's projection, none in a matrix cell) from a worktree
  at `7c859cdf` with this tree's harness copied into its `scripts/` (not a served path, so the baseline still names a
  clean `7c859cdf`), a fresh `.next` and an in-memory server from that worktree; then a null `--compare` on a FRESH
  server at `7c859cdf`, exit 0, before any compare on this tree; then `--compare` on this tree, where A8 says a default
  poll with an hour to run compares equal and the matrix may differ only by WP11's named `footer-rail-h`; and the tiles
  (an open ticket in its free window and as it runs out, a legacy paid window, a shut exit at its first paint, the
  confirm and both results) at 320, 390 and 1280 in sw, en and zh. **Verified 2026-10-03, before the push:** the gates
  (the §0i baseline's reds); `red:journey-tickets` and `red:sell-grace-truth` in process; `red:timer-date`, `red:labels`,
  `red:position-permalink` and `red:feedback-law` alone (the last 26/26 once its own stale anchor, re-indented on
  2026-09-05 by PRESENCE-4, was fixed); parity `--prove-red` 68/68; the v2 baseline at `7c859cdf` 28/28, its null compare
  35/35, then this tree 35/35 — the Sell region, the holder block and the classic confirm compare equal across A8; tiles
  of the free look at 320, 390 and 1280 in sw, en and zh with no overflow, script error or hydration warning. Not drawn:
  the lapse, a legacy paid window and a shut exit (the seed's tickets are all inside their free window) — owed with
  A8b's drive.
- **A8b — today's Sell button withdraws a lapsed free price, draws the server's "shut" at once, and its free row fits a
  320 phone on `/positions` (drafted 2026-10-03; its own commit, for every player, not flagged).** WP10's lapse, given
  to the classic look: both classic hosts pass `pricedFree` (`cashOutValue`'s own `inGracePeriod` for an open exit on a
  LIVE question: `/positions`' `free`, the holder block's new `positionPricedFree`), and the `mounted` flag, the lapse
  effect and `lapsed` serve both looks. From the moment its countdown runs out over a free price, today's button is
  disabled, says "Inapakia…" (`common.loading`; "Inauza…" while a sale is in flight) as its words and its spoken name,
  draws no figure, closes a confirm still showing the free price unless a sale is in flight, and asks the page for the
  server's answer once — it no longer offers "Uza sasa · TZS 3,600 −0 ada" (and "Hakuna ada" in its confirm) while the
  server charges the fee. When that answer is "selling has shut", the button is drawn shut in the same render
  (`shutNow`: the server's verdict counts from the button's first commit), never as one bright, pressable "Uza sasa ·
  TZS 0 −3,600 ada" first. Before the page has started on the phone, today's button draws what it drew (§0h point 37
  (f)); a page brought back by Back or Forward is §0h point 37 (a). The sale, `cashOutValue` and every figure are
  untouched. The 320 overflow (measured on `/positions`: the Swahili free row 7px wider than its button): below 360
  (Tailwind's `xs`) the free note is left out — the strip above says "Hakuna ada" — and nothing else in the row moves;
  the label keeps one line at every width, as today (letting it wrap stacked Chinese one glyph a line, taller than the
  button, in the question page's narrower holder block). Gates: `test:sell-grace-truth` 2.priced (both hosts' flags
  pinned whole), 3.classic (the lapse effect pinned whole; the four reads of `lapsed` and `shutNow` in today's return),
  3.render, and a new §5 (a static model of the row from the repo's own fonts — the body's wider cv11 "a" included —
  stylesheet and pages: on `/positions` at 320 the free row holds one line inside the button's content in en, sw and
  zh to TZS 1,000,000, and every other row one line inside the button; in the holder block no label grows taller than
  the button), 25 plants; `test:journey-tickets` §12 re-pinned in the open; `qa:classic-shell-parity`'s named Sell
  difference `sell-narrow-phone` (the free note's class string, 8 of 8 Sell cells; since A8d and A8g its two pairs ride
  inside `sell-holder-stack`, the holder block's four, and `sell-positions-wrap`, `/positions`' four), with a synthetic
  P.5s. **Served bytes
  for a classic viewer:** two classes on the free note's span (computed styles equal from 360), `pricedFree` in each
  Sell button's RSC props, one `xs` rule in the stylesheet, the lapse and `shutNow` in the Sell button's client code.
  **Verified 2026-10-04 and LIVE `1be05fbf` (22:32 UTC):** the gates (the §0i baseline's reds only, each failing on
  the same checks); `red:timer-date` and `red:feedback-law` alone; parity `--prove-red` 69/69 and `--compare` 35/35 on
  a fresh server (`sell-narrow-phone` in 8 of 8 Sell cells, nothing else); the lapse drive
  (`scratchpad/s6/a8b-drive/lapse-drive.mjs`, a 3-minute free window, with a paid window and without): at 0:00 every
  ticket draws "Inapakia…" (disabled, no figure), then the server's answer within about a second — "Uza sasa · TZS
  3,240 −360 ada" or "Kuuza kumefungwa" — never "−0 ada", one ask per button; a sale in flight keeps "Inauza…" and
  its confirm and shows the server's result; a confirm open at 0:00 closes with no sale; a page clock jumped past the
  window asks once per button and re-arms; Back after the window offers the stale free price for 20.2 s (§0h point 37
  (a): its fix is A8e); tiles at 320, 360, 390 and 1280 in sw, en and zh on both hosts — every `/positions` row on one
  line inside its button, the holder block measured for A8d; the battery 433/451, every red on the baseline list;
  production read back (`?dpl=`, the `xs:inline` rule served, no journey chrome in a classic first load). ⚠️ Not fixed
  here: the holder block's own overflow, which the v2 baseline already measures (§0h point 37 (h)) — A8d's, below — and
  `/positions`' rows for big stakes and six-figure fees, which those tiles' TZS 1,500 tickets did not draw — A8g's,
  below.
- **A8c — the server sells only at the figure the player confirmed (drafted 2026-10-03 on top of A8b, revised 2026-10-04
  after its review; its own commit, for every player, not flagged).** The Sell button's `submit()` — the one sale both
  looks share — sends the figure its confirm showed (`value`, as `expectedValue`, written `String(value)`), and
  `cashOutPositionAction` is now one call, `cashOutPositionFromForm` (market-service), so both stores' suites run the
  very path a page's request takes. It reads the figure through `readExpectedSaleValue`: no field, no check (the dev
  routes, every internal caller, a page open since before the deploy); a figure that is not a plain whole number is
  refused there, before the money path, with the generic "Hitilafu imetokea. Jaribu tena." (`unknown_failure`). Then
  `cashOutPosition` sells only if the figure equals, to the shilling, what the sale would credit — `paid`,
  `cashOutValue`'s price under the conservation clamp, read under both locks and compared before the first write. Any
  difference, either way, is refused with `CONFLICT` and the server's figures in `detail` (`value`, what a sale pays now,
  and its `fee`), and nothing is written: no pool, wallet, position, transaction, ledger line, wagering reversal, chart
  point or odds push. Two refusals: `price_changed` when the price moved, and `cashout_pool_short` when the pool holds
  less than the sale's net price (the clamp bites — a broken pool, which should never happen): every Sell button prices
  `cashOutValue`'s own figure, so no page could ever offer what that sale would pay, and "the price changed" would send
  the player round a loop — so it says "Kuna hitilafu upande wetu, hivyo dau hili haliwezi kuuzwa sasa. Wasiliana na
  msaada." Every refusal that came before keeps its place and its words, so a poll whose exit locks with its free window
  (every current poll) still answers "Muda wa kuuza dau hili umefungwa" whatever figure arrives. A moved price, a short
  pool and a broken figure each write one `market.position.sell_refused` audit row (the reason, the figure sent, the
  server's figures) from `cashOutPositionFromForm`, fire-and-forget, once `cashOutPosition` has returned — outside both
  locks — so a broken pool, or a host handing the button a wrong figure, is seen in the audit and not only by the player;
  a broken figure spends a cash-out token first, so a client in a loop meets the cash-out limit. What it closes: on a
  legacy poll with a paid window, a sale confirmed at the free price a moment before 0:00 — the countdown running late,
  a page brought back by Back or Forward, the confirm's last frame (§0h point 37 (a) and (f)) — was paid stake − fee
  after a screen that said "no fee"; now it is refused, the toast (the calm `factual` one, with no error buzz) and the
  result say "Bei imebadilika kuwa TZS 9,000. Dau lako halijauzwa — unaweza kuliuza kwa bei mpya.", the page asks the
  server once, and until the new price is drawn both looks say "Inapakia…" with no figure — never "Inauza…" under a
  result that says nothing was sold — so one more tap sells at it (§0h points 38 to 44; since A8h a moved price opens no
  result, its toast alone, at once and until it is read: point 55). Why nothing moves on a refusal:
  between the lock and the check there are five reads (the position twice, the market, the wallet, `cashOutValue`), the
  second lock, refusals and arithmetic, and no write — so on Postgres the lock's transaction has run only its two
  advisory locks and commits nothing, and on the memory store no object read under the lock has been touched. Gates:
  `test:sell-price-guard` (new, in predeploy, 42 checks: the check's text, place and two refusals, the statements before
  it, each reason's one emitter; the action's one call, the form's parser, refusal, hand-off and record; the client's one
  figure, calm toast, one refresh and wait; the three hosts' `value` binding; the sentences in three languages) and its
  in-process red `red:sell-price-guard` (46 plants); `test:cashout-price-guard` (new, both stores through db-scratch: the
  moved price, a figure one shilling above and one below, no figure, a current poll past its window, a short pool, the
  service failing closed, six broken figures through the page's path, two sales at once, the refusal records — every
  "nothing moved" paired with a sale that moves the same observable in the same run — and the trial balance on
  Postgres) with its own red `red:cashout-price-guard` (new, declared anchors: nine defects planted into the real
  service, each required to redden its own case on the memory store); the same cases in memory inside `test:cashout`;
  `test:journey-tickets` §12 and `test:sell-grace-truth` §3 re-pinned in the open (the page refresh written twice in
  `submit` and three times in the file; both looks' wait), their plants re-anchored and six new ones (four in §12, two
  in §3); `test:failure-reasons`' figure fixture gains `value` (its two §10 reds, the agent apply toast, are the
  baseline's and stay as they were); `test:house-bot-reports` 0.232.2 and its controls re-pinned in the open (the seven
  positioned `db.txn.create(` sites — red on the A8b tree since three earlier commits on this branch moved them, and
  moved again by A8c; that pin's note splits the moves by commit). **Served bytes for a classic viewer:** no markup,
  text, prop or CSS change (`repricing` is false on the server's paint); the client code of the Sell button (one more
  form field, the calm toast, the wait, one guarded refresh), the dictionary (two sentences in each of three languages)
  and the failure registry (two rows) is rebuilt, so the pages' script tags and the RSC payload's client references
  name the rebuilt chunks, as any client change does; the server action reads its form through
  `cashOutPositionFromForm`. **Owed:** the battery, compared red by red with the same run on the A8b tree (`2d0f56e7`),
  never with a remembered list; `red:sell-price-guard`, `red:journey-tickets` and `red:sell-grace-truth`, then — after
  the commit, because it refuses a target that differs from HEAD — `red:cashout-price-guard`; `test:cashout-price-guard`
  on the scratch cluster (its floor, 62 on memory and 65 on Postgres, is the count it makes by construction until a run
  prints it); `red:all -- --skip results-filter,header-fit --timeout 900`, detached and never piped, compared red by red
  with the same run on the A8b tree; and the drives — on both hosts, a legacy paid-window ticket confirmed at its free
  price across 0:00 (refused with the new figure, the button "Inapakia…" until the new price is drawn — one page refresh
  asked by the refusal, and A8b's own as well when the countdown ran out while the sale was in flight — then sold at
  it), a current poll the same way (`exit_window_closed`, unchanged), and hand-built requests posting `expectedValue`
  "3,600" and "" against a sellable ticket (each refused with the generic line; the wallet balance, both pools, the
  position's status, final payout and settled time, and the ticket's CASHOUT rows read before and after, all unchanged;
  one `market.position.sell_refused` row each); tiles of the refusal's toast, result and waiting button at 320, 390 and
  1280 in sw, en and zh. **Found on the way, for later (not changed here):** `cashOutPosition` records the chart point,
  pushes the odds, notifies, emails, audits and pushes the wallet balance inside both locks, which the four transaction
  rules put after the outer lock. That is safe today only because none of the function's writes takes the lock's
  transaction — each commits on its own, deliberately (see `reverseWageringLocked`'s note) — so every announcement
  describes money that has already moved. The same fact means the exit is not one money transaction: the pool's debit,
  the position, the wagering reversal, the credit and the transaction can each land without the next, and the cash-out
  ledger group is posted after the credit without being awaited. Whoever threads the exit's writes into the lock's
  transaction must move those six calls after the outer lock in the same change. And today's Sell button still paints
  every other refusal with the red `danger` toast whatever the registry's severity (an `info` shut exit included) and
  opens the ✗ result for each, and A8b's in-flight lapse still reads "Inauza…" until its own refresh is drawn.
  **Verified 2026-10-04 and LIVE `c6373d4b`:** the gates (the §0i baseline's reds only, each failing on the same
  checks); `test:cashout-price-guard` on both stores and `e2e:money` 64/64 on a migrated scratch Postgres;
  `red:cashout-price-guard` 9/9 and the file-mutating reds alone (those that fail do so on the base, for their own
  reasons — "Found on the way (2026-10-04)"); the drive `scratchpad/s6/a8c-drive/price-guard-drive.mjs`, paid and current,
  all passed — broken figures refused with nothing moved, a page sending no figure sold as before, a sale held across 0:00
  refused as `price_changed` in both looks ("Inauza…" across 0:00, then "Inapakia…", the result naming the new price, its
  calm toast once the result closes — toast.tsx §F1 holds toasts behind a result — nothing moved, one more tap selling at
  the new price), and on a current poll the shut exit exactly as before; the battery (no new red of this lane's); the
  deploy read back (`?dpl=`). The result's red dress for a moved price is A8h's to remove (§F2).
- **A8e — the Sell button never draws a picture it does not mean: its first render is the server's, a price with a fee
  is never shown free, and a page brought back by Back or Forward shows no old price (drafted 2026-10-04 and revised
  after its review the same day; its own commit, for every player, not flagged).** Three defects the A8b drive measured
  in a real browser, closed in the button alone (`sell-button.tsx`; no host, word, class or figure changes, and the sale
  is untouched): (1) the countdown started at 0, so the first picture of every mount — the server's paint, a soft
  navigation, a restore — drew today's paid arm, "Uza sasa · TZS 3,600 −0 ada", until an effect ran (on a Back restore:
  0.08 s "Uza sasa", 0.10 s "Toka bila gharama"); its first value is now the time the instant had left at the server's
  own render, `max(0, freeEnd - serverNow)` from the props alone (one memoised parse, read by that value and by the
  clock), so the server's HTML and the hydrating render read one value and draw one arm; a shut exit is drawn shut from
  the server's paint (`shutNow = closedNow || alreadyClosed === true`); the `mounted` flag is gone; and the strip's note
  is one text, so the strip the server now paints is the markup a classic holder was shown once the page had started
  (two texts side by side are served with a marker between them that the browser keeps) — §0h points 46 and 47,
  resolving 37 (f); (2) a refresh that brought a price with a fee while the countdown still ran drew one picture of the
  free words over the paid figure ("Toka bila gharama · TZS 3,240 · pesa yote" before "Uza sasa · TZS 3,240 −360 ada");
  the free state now needs the server's verdict too, `graceRemainMs > 0 && pricedFree !== false && !stale` (a host that
  passes no flag reads the countdown alone) — point 48; (3) a page brought back by Back or Forward offered its old
  prices until the poller's next beat (page E: 20.3 s). Next 16 redraws its back/forward cache with the old props,
  `serverNow` included, unless a refresh or a revalidating server action has cleared it, and a fresh render always
  brings a new `serverNow`; so a module-level record of the renders this tab's Sell buttons have drawn
  (`position@serverNow`, counted by an effect while a button draws it and kept, uncounted, after — up to 512 uncounted
  keys) tells a button that the render it is handed was brought back: at its first render when the page is mounted
  again, and in the render that brings it when only the address's query differs (Back between two pages of `/positions`,
  or from the bare page to a lens, keeps the buttons mounted; the review found that case). Its prices lapse (`lapsed =
  (pricedFree === true && !inGrace) || stale`): either look draws "Inapakia…", no figure, nothing to press; one ask per
  restore whatever each ticket's `serverNow` (one module-level owner, claimed by the first of the buttons that can sell,
  which arms its ask for that restore) brings the server's answer; a fresh render ends the restore in the commit that
  recalibrates the countdown and re-arms every button once, so an answer that is itself no offer is asked about too —
  point 49, resolving 37 (a)'s Back/Forward half. A page loaded afresh holds no record, so a first load, however slow,
  never reads as a restore, and a second button drawing a render already on screen is not one either. Gates:
  `test:sell-grace-truth` extended in the open — 2.now (every Sell button is handed `serverNow`), 2.poller (each page
  that draws them draws its RefreshPoller first, since the restore's ask is made as the page mounts), 3.source (the
  memoised parse), 3.state (the server's verdicts), 3.journey and 3.classic (no mount flag; the lapse effect's guard is
  the shut verdicts, the price it withdraws `lapsed`, and it runs again when a restore begins or ends), new 3.first and
  3.restore (the record and the owner declared once at module level, read off the syntax tree; each name the restore
  rests on written exactly as often as the code writes it; the claim above the lapse effect) and new 4.premise (no
  `cacheComponents`, so Back mounts a page again) — with 29 new plants, 3 replaced (the mount-flag plants, and the shut
  plant A8e makes the intended code) and 3 re-pointed (90 in all), and §5's first-paint row removed (the server's paint
  is the free row now; a fee of 0 is a legacy poll's rate-0 paid row, already modelled); `test:journey-tickets` §12
  re-pinned in the open (`SELL_CLASSIC`'s `shutNow` and strip note, `LAPSE_ASK` and `LAPSE_DEPS`) and WP10's timer plant
  made a real defect again (A8e makes "0:00 on the server's paint" impossible); `qa:classic-shell-parity` captures each
  Sell cell's first paint in a page whose scripts are all held (S.4; it fails within 50 s, and the cells after a failure
  skip theirs) and, in a compare, holds it to the baseline's own first paint when the baseline has one and otherwise to
  the baseline's Sell button as the browser drew it (4.4f, the named transition `sell-first-paint`); `--prove-red` holds
  the capture to itself — two first paints agree at both Sell places, and a first-paint plant is seen in its own field —
  never to a claim about the tree, so it still calibrates a tree before A8e, with a synthetic P.5f on the real markup
  and two S.4 plants. **Served bytes for a classic viewer:** the HTML of a Sell row inside its free window (the strip,
  its countdown the server's m:ss, its note one text, and "Toka bila gharama · TZS {stake} · pesa yote" where "Uza sasa
  · TZS {stake} −0 ada" was served) and of a shut row ("Kuuza kumefungwa", dimmed and disabled, where an enabled "Uza
  sasa · TZS 0 −{stake} ada" was served); on a question page, a free price whose window ended between its pricing and
  its drawing is served as "Inapakia…"; no RSC prop and no class (no CSS); JS: the Sell button's chunk (the record, the
  restore state and its re-read, three effects more, the mount flag gone). **Owed:** the battery; `red:sell-grace-truth`
  and `red:journey-tickets` (in process); `qa:classic-shell-parity --prove-red` (75 checks), then `--compare` against
  `parity-v2-7c859cdf.json` (4.4 and the new 4.4f equal: `sell-first-paint` in 8 of 8 cells, the matrix as before); the
  drive — `a8b-drive/lapse-drive.mjs` pages A–E in both modes (E: after Back, "Inapakia…" from the first picture, one
  ask, then the server's answer — "Uza sasa · TZS 3,240 −360 ada" in the paid mode, "Kuuza kumefungwa" in the current
  one — within one round trip, and no free offer in any picture), the same after a Back between two addresses of
  `/positions` (a lens, then the bottom bar's Positions, then Back inside one poll; and page 2 of the list, then Back),
  a question page with two open tickets after Back (one ask), a soft navigation into `/positions` inside a free window
  (the strip and the free price from the first picture, no "−0 ada", no ask) and a first paint with every script held
  (the free row and its strip; a shut row's "Kuuza kumefungwa"), with no hydration warning; tiles at 320, 390 and 1280
  in sw, en and zh. ⚠️ Not closed here: point 37 (a)'s late start (its money half is A8c's), (b), (d), (e) and the
  confirm's last frame of (f). **Verified 2026-10-04 and LIVE `c6373d4b`:** parity `--prove-red` 76/76 and `--compare`
  37/37 (`sell-first-paint` in 8 of 8 Sell cells, nothing else new); the lapse drive with A8e's checks, both modes — after
  Back "Inapakia…" from the first picture and the server's answer 0.27 s later (it was a stale free offer for 20.2 s), and
  a soft navigation into `/positions` whose first commit is the free offer; the server's first paint read with scripts
  off: "Toka bila gharama · TZS 3,600 · pesa yote"; `red:timer-date` 12/12.
- **A8f — every money figure in the Sell confirm and in its result stays whole, and the confirm's receive row reflows
  (drafted 2026-10-04 on `2d0f56e7`, revised after its review; its own commit, for every player, not flagged; it lands
  last of A8c to A8f).** Found in a real browser (2026-10-03, a question page in Swahili at 390): the confirm drew "TZS"
  over "1,500". In `sell-confirm-modal.tsx` the receive figure is `.amount` (DESIGN_AUTHORITY §M4: one object); its row
  wraps, with a 12px row gap, so the fee column moves below the figure when the two cannot share a line; alone on its
  line the fee column grows to the box's width, its words at the right edge; and the fee keeps a 16px clear space before
  it, so two figures never run together (the fee and its note were `.amount` already). `operation-result-modal.tsx`
  gains `wholeFigures`: every money figure in the title — the shape `formatTzs` writes, a minus before it included — is
  set as one `.amount`. The Sell button's result passes it: its success title's figure ("TZS 1,500 Imerudishwa") is
  drawn in the mono face like every other amount (it was Sora, letter-spaced; it leads the title and was not seen to
  split), and a refusal that names a price mid-sentence (A8c's) keeps that figure whole; every other result is
  untouched. The sale, every figure and every word are untouched, and both looks share both dialogs. By the model (§0h
  point 50): the figure split in 2,564 of 6,144 cells before and in none after; least room at 320 after: the receive row
  en 8.8 / sw 8.8 / zh 3.6px, the result's title 50.4px; proved from 320 (below 311px a free TZS 1,000,000 figure runs
  into the box's padding). Gates: `test:sell-grace-truth` §6 (new: 6.model, 6.classes, 6.confirm, 6.button, 6.result,
  and 6.control, which draws the 104px Swahili column the v2 baseline holds), 21 plants; `test:journey-tickets` §12's
  dialogs re-pinned in the open (`wholeFigures`); `qa:classic-shell-parity`'s named Sell differences
  `sell-confirm-whole-figure` (four class strings) and `sell-confirm-receive-boxes` (the boxes they draw: English keeps
  its one line, Swahili wraps), 2 of 2 confirm cells each, pushed after the list's literal, with a synthetic P.5c, and a
  compare now prints how many cells each named Sell difference was seen in. **Served bytes for a classic viewer:** no
  markup, RSC prop or stylesheet change — both dialogs are client-only and closed at paint, and every class they gain is
  already in the stylesheet; in the client JS, four class strings in the confirm, `wholeFigures` and its helper in the
  result modal, and `wholeFigures` on the Sell button's result, so those chunks' hashed names move too. The result's
  figure face is a classic change parity cannot see (no Sell cell confirms a sale): the tiles are its evidence.
  **Owed:** the battery; `red:sell-grace-truth` (its 21 new plants) and `red:journey-tickets`; `red:timer-date` and
  `red:motion-ladder` (they rewrite the tree: each alone and detached, never beside the battery or a parity run); parity
  `--prove-red` (P.5c) and `--compare` against `parity-v2-7c859cdf.json` — both A8f entries seen in 2 of 2 confirm cells
  (0 means the server is not serving A8f), the two cells matching the named boxes exactly, any other box read from the
  capture and never re-baselined; tiles of both dialogs at 280, 320, 360, 390, 412 and 1280 in sw, en and zh, in both
  looks — the confirm free and paid, side by side and wrapped, and the result after a free and a paid sale (with A8c, a
  moved price's refusal too); and, under Ali's standing rule that a defect found in one place is fixed everywhere, a
  follow-up package for the other results whose titles name money — the bet receipt ("NDIO · TZS 1,000,000" is, by an
  estimate, Sora not being in the repo, wider than a 320 phone's 222px title line, so it can break after "TZS"), and any
  staff result whose title does — opting them into `wholeFigures`, with their own tiles (the Up & Down receipt's and the
  wallet results' titles name no figure; their figures are detail rows, which wrap whole). ⚠️ Not fixed here: the sale's
  toast is not a dialog; and the confirm's heading keeps no clear space for its ✕ (not a figure — the tiles show whether
  a long one reaches it). **Verified 2026-10-04 and LIVE `c6373d4b`:** parity — `sell-confirm-whole-figure` and
  `sell-confirm-receive-boxes` each in 2 of 2 confirm cells, the predicted boxes matching the capture; `red:motion-ladder`
  6/6 and `red:timer-date` 12/12; the confirm drawn at 280–1280 in sw, en and zh in both looks with no figure split and no
  overflow.
- **A8d — the question page's Sell button stacks on a phone (drafted 2026-10-04 on `2d0f56e7`, reviewed and revised;
  re-based on `a2ce1762` — A8c, A8e and A8f under it — into `s6/A8dg.json`; its own commit, for every player, not
  flagged).** In a question's holder block ("Nafasi zako") today's Sell button sits inside its section's and its ticket
  row's border and padding, 84px narrower than on `/positions`, and its one-line row ran past it on the most common phones
  (§0h point 37 (h): the v2 baseline measured the Swahili free row 67px past the button's content at 360, and by the
  static model some row ran over below 468px in Swahili, 411 in English and 409 in Chinese). The holder block now passes
  `stackOnPhone`; today's button then carries one class, `kp-sell-stack`, and below 640px (`globals.css`, one phone block
  beside the button sizes, opened by its `density: general` reason) that button takes the `--h-control-xl` rung, 56px, as
  tall as the journey's own two-line Sell button: its words on one centred line, the figure and its note centred on the
  next, and the note under the figure when one line cannot hold both (only below 345px, for a long fee). Every piece keeps
  the button's nowrap, so no word and no figure breaks, and the button is 56px tall there in every state — free, selling,
  paid, shut, "Inapakia…", and the server's paint, which since A8e is the free row or "Kuuza kumefungwa" — so it never
  changes height between them (the free strip above it still comes and goes). Each open ticket's row is 12px taller than
  before, and what sits below it moves down by that from the first paint. Every word, figure and state is today's; the
  journey's look is untouched (an early return), and from 640px nothing changes (§0h point 45). Static model (the repo's
  own fonts; every printed length a stake of TZS 1,000 to 1,000,000 can draw at any fee from 0 to 30%, every state,
  en/sw/zh, at the default text size; `s6/a8dg/sweep.py`): in the holder block no row runs past the button's content at
  any width from 320 — the least room is 0.26px at 338 (a Chinese paid row deciding between two lines and three; either
  fits), three lines only below 345px — and no stack is taller than 50.75 of the 54px inside; today's one line ran 80 to
  89px past it at 320. **Large text** is the Mobile Visual Plan's U24, and this stack is a fixed rung like every
  button's: as page zoom (130% lays a 360 phone out at 277 CSS px and a 320 phone at 246) it still holds every English and
  Chinese row at 277, five Swahili rows run up to 12.7px into the button's padding there ("Kuuza kumefungwa" the widest),
  and at 246 four to eight rows in each language run into the padding and five Swahili ones past the button's edge —
  where today's one line overflows in 46 or 47 of every 49 rows; as text-only scaling, if it reaches the button (a tile
  settles that), from about 1.1× (1.07× at 320) a row's lines outgrow the rung — a two-line row becomes three and the
  block passes the 54px inside it (58px at 1.15×, 65px at 1.3×), out of both edges, its lines being centred; U24 moves
  this rule with the other rungs. Gates: `test:sell-grace-truth` 5.model reads the ask, the class and the rule — each
  value from its own declaration, by exact property (a `max-height` is no rung), its phone block the house query alone (a
  pointer or a lower bound would switch the stack off on a touch phone) — and pins the holder block as the only host that
  asks; 5.stack replaces 5.holder (the stack laid out at 320, 340, 360, 390, 412, 430, 600 and 639 — least room 2.1px at
  320 in en and sw, 2.3 in zh — and one line at 640 and 768); 5.control gains the holder block's one-line defect at 360
  (the model reads sw −73.5, en −16.0px; the v2 baseline measured 67 and 14 past); the grid gains TZS 110,000 and a 0.5%
  fee (which §6 measures too: 6,912 receive rows, every check green); 20 new plants (133 in all), and the two label plants
  now expect 5.paid and 5.classes (5.holder is gone). `test:journey-tickets` §12 is re-pinned on its one changed line.
  `qa:classic-shell-parity` names: `sell-narrow-phone` now covers `/positions` alone (since A8g as `sell-positions-wrap`,
  with the wrap class; 4 cells — the holder block's four carry A8b's two pairs inside its own entry, because each entry is
  matched alone against the baseline, so no coverage is lost), `sell-holder-stack` (the class on the holder block's button, 4 cells), and `sell-holder-stack-layout-en` / `-sw`
  (that button's layout at 360, 1 cell each, whose `to` is measured on the first compare after A8d and copied in, never
  re-baselined); a new §4.6 fails a compare where the class is seen and its measured layouts are not (the rule no longer
  applying, which §4.5's all-or-none would pass); P.5s holds both places, a new P.5L the two measured layouts and a new
  P.6s §4.6. **Served bytes for a classic viewer:** the class on the holder block's Sell button at every width (inert from
  640); its stacked layout below 640; the stylesheet's phone block (four rules); `stackOnPhone` in the holder block's Sell
  button RSC props; the prop and its
  class in the Sell button's client code. **Owed:** with A8g's, in one list in its bullet below (the two land as one change).
- **A8g — the free strip never breaks a phrase, and `/positions` puts a note under its figure where one line cannot hold
  both (drafted 2026-10-04 on `a2ce1762` with A8d, into `s6/A8dg.json`, reviewed and revised; one commit with A8d, or
  its own after A8d's, for every player, not flagged).** Two defects A8d's review recorded as the next step, closed
  platform-wide under Ali's standing rule. (1) The free strip above today's Sell button
  ("TOKA BILA GHARAMA · 4:59 · Hakuna ada": an upper-case mono eyebrow, the countdown and the note) was a row that could
  not wrap, so where its three parts did not fit — the question page's holder block in Swahili below 377px (383px when
  the free window is ten minutes or more; a browser measured it at 360: "TOKA BILA / GHARAMA 4:20 · Hakuna / ada") — the
  browser squeezed them until two broke inside. The strip is now a wrapping row (`flex-wrap`, its gap split into 8px
  between parts and 2px between lines, `gap-x-1.5 gap-y-0.5`, utilities `src/` already uses): a part that cannot share a
  line moves to the next one whole, so there it reads "TOKA BILA GHARAMA 4:59" over "· Hakuna ada", 42px tall where it
  was 40, and everywhere else it keeps its one line, as today; only a part wider than the whole strip could still break,
  and none is from 320px at the default text size (§0h point 51). It is one markup for both hosts; the journey's look
  draws a sentence instead, whose time and countdown are already whole, and is untouched. (2) On `/positions` a few rows
  ran past the Sell button's content on a phone (§0h point 37 (h), its second half, re-derived by A8d's reviser). By the
  static model, a Swahili free row for a stake of TZS 100,000 or more from 360 to 366px, and for TZS 1,000,000 to 383px
  — its note "pesa yote" beside a six- or seven-figure stake — and a legacy paid row with a six-figure fee at 320 to
  324px (zh "TZS 700,000 −300,000 手续费" 4.7px into the padding; sw "Uza sasa" 0.04px, inside the model's own margin).
  That model is an upper bound for a Latin label: it takes each glyph at the larger of Inter's Medium and Bold, where
  the button draws 600, and the v2 baseline measured "Toka bila gharama" 124.5px against its 131.28 ("Free exit" 58.5
  against 60.38). With the label as measured, the Swahili free row that ran over is TZS 1,000,000's alone, from 360 to
  376px (17px over at 360, where the model reads 23; a six-figure stake held its one line at 360, by under a pixel); the
  Swahili paid row's label was never measured; and the Chinese rows are exact (CJK words at 1em and the mono figures,
  which the model reproduces to the half pixel), so 320 to 324px stands. Every host that does not ask for A8d's stack —
  `/positions` today, and any later one — is now drawn the wrap class, `kp-sell-wrap` (the className's other arm), and
  below 640px (`globals.css`, a second phone block beside A8d's, opened by its own `density: general` reason) its figure
  is a wrapping row: where the label, the figure and its note fit on one line nothing moves (the note sits the same 8px
  from the figure, the rule's gap where its margin was); where they do not, the label keeps its line and the note goes
  under the figure, both at the button's right end, inside the same 44px (a 21px and a 16.5px line in the 42px inside) —
  so `/positions` keeps its one line wherever it already fitted (§0h point 52). Static model (`s6/a8dg/sweep.py`, the
  same exhaustive population as A8d's): on `/positions` no row runs past the content at any width from 320 to 639 in any
  language — least room 0.28px at 325 (zh paid·selling "TZS 700,000 −300,000 手续费", a row that still fits its one line),
  1.95px at 320 (zh), 1.99 at 360 (sw) — the note going under the figure only for the five row kinds above, each with
  44.6px or more to spare once it has (with the label as measured: the Swahili TZS 1,000,000 free row at 360 to 376px
  and the two Chinese paid rows at 320 to 324px, and by the model alone the Swahili paid row at 320); no row that fitted
  before changes (the sweep counts 0 such cells); from 640 one line (8.6px to spare in each of md's two columns); and
  the strip holds its parts whole on both hosts at every width from 320 (least room 0.6px, at its one-line threshold).
  Under page zoom (U24's) the wrap fits every English and Chinese row on `/positions` at 313, 277 and 246 CSS px, where
  today's one line overflows in up to 38 of every 49 rows; a few Swahili rows still overflow there (its free row, whose
  note is already left out below 360 CSS px, so nothing can move — TZS 1,000,000 at 313, every stake at 277 and 246 —
  and at 246 one paid row), as they did, and at 246 the holder block's Swahili free word is wider than the strip and
  breaks inside it, as before A8g. Gates: `test:sell-grace-truth` §5 — 5.model reads the wrap whole (the className's two
  arms, each once; the rule's own phone block, the house query alone and its density reason, ending below `sm`; the
  figure's lines at the right end on one baseline; the note's margin given way to a column gap from the spacing scale)
  and the strip from today's markup (a flex row, its edge, padding and gaps on the spacing scale, its three parts in the
  mono face at the sizes the type ladder or the markup states); since the review it reads every token those rules read —
  the rungs and the spacing scale — from its one declaration outside the stylesheet's comments (a second declaration, a
  later phone block's rung, now reads as none, where the model had read the first), and the free window's bound from
  market-config's own refusal (0 to 60 minutes), whose longest countdown must be the 60:00 5.strip lays out; new 5.list
  lays every `/positions` row out at eleven widths from 320 to 639 (one line where it fits, else the note under its
  figure, inside the content and the button's height) and on one line at 640 and in md's two columns; 5.paid holds 320
  to the same layout, inside the content now (it allowed the padding); new 5.strip lays the strip out on both hosts at
  ten widths from 320 to 639 with its countdown at its longest, 60:00; 5.control gains both defects (today's one line on
  `/positions`: the model reads −23.4px at 360 and −4.7 at 320; and the strip's classes before A8g, which the model
  squeezes in the holder block at 360 to 112.1 and 65.9px wide, its free word and note broken — the v2 baseline measured
  112 and 66); 19 new plants (152 in all: a later phone block re-declaring the stack's rung, the button's rung dropped
  to 36px and a 120-minute free window among them), A8d's className plant re-derived for the two arms.
  `test:journey-tickets` §12 is re-pinned on the strip's and the className's lines. `qa:classic-shell-parity` names:
  `sell-positions-wrap` (A8b's two pairs, which A8b named `sell-narrow-phone` and A8d scoped to `/positions`, now with
  the wrap class, 4 cells), `sell-positions-wrap-layout-en` / `-sw` (`/positions`' button layout at 360, 1 cell each,
  `alongside` it, measured first like A8d's: the figure's and the note's styles move and the note's box becomes a flex
  item's, while no glyph moves and the seeded TZS 1,500 row does not wrap), `sell-strip-whole` (the strip's class
  string, all 8 Sell cells) and `sell-strip-whole-layout` (its boxes and styles, predicted from the baseline's own
  capture: the strip's one signature moves by flex-wrap and gap in every cell, its parts' not at all, and in the Swahili
  holder-block cell at 360 the parts sit whole on two lines, 2px apart, the strip 42px tall; `alongside` the class, so
  §4.6 holds it); the placeholder the four measured layouts read, `SELL_MEASURED_FIRST`, now names all four, and A8g's
  edit to it refuses to apply if A8d's copy step ever ran alone; P.5s holds both places with A8g's class, P.5L and P.6s
  all four measured layouts and the strip's, and a new P.5g the strip's two entries in a capture and in a first paint.
  **Served bytes for a classic viewer:** on both hosts every Sell row in its free window serves the strip's new class
  string (its parts' markup and words unchanged); `/positions`' Sell button carries `kp-sell-wrap` at every width and in
  every state; the stylesheet gains the wrap's phone block (two rules, matching only that class); no new utility (each
  strip class is already in `src/`) and no RSC prop; the Sell button's client code carries the two class strings. Below
  640 a `/positions` row that cannot hold one line draws its note under its figure; the holder block's Swahili strip
  below 377px (383px with ten minutes or more left) is two whole lines, 2px taller. **Owed** (A8d's and A8g's, once, on
  the combined tree): (1) before they are applied, the head's own parity compare against `parity-v2-7c859cdf.json` on a
  fresh in-memory server at `a2ce1762` — A8e's and A8f's owed compare — green with their named entries; (2) the battery,
  read red by red against that head's reds (type-scale, tap-target, eyebrow-roles, red-anchors and failure-reasons were
  red before, each on the same checks); `red:sell-grace-truth` (152 plants) and `red:journey-tickets` in process;
  `red:vodacom-plan`, `red:journey-shell`, `red:density-contract` and `red:sell-price-guard`; `red:timer-date` alone and
  detached; then every other red twin whose harness rewrites a file A8dg edits or reads one, through `red:all` (its
  `--filter` naming exactly them and its `--skip` dropping the two keys the filter would also match; sequential,
  detached, under the heavy-node lock — its fingerprint names any harness that leaves the tree changed), each read
  against its result at the head: `red:card-share`, `red:chain-purge`, `red:chat-focus-ring`, `red:chip-one-home`,
  `red:contrast`, `red:failure-reasons`, `red:filter-language`, `red:house-bot-console`, `red:journey-account`,
  `red:journey-estimate`, `red:landing-ten-plan`, `red:m1-light`, `red:market-columns`, `red:marketing-setup-plan`,
  `red:mobile-visual-plan`, `red:money-format`, `red:motion-ladder`, `red:one-sided`, `red:payout-view`,
  `red:position-permalink`, `red:share-preview`, `red:short-title-ai`, `red:short-title-edit`,
  `red:simple-journey-flag`, `red:tap-rung`, `red:ticker-honesty`, `red:updown-filter-sheet`, `red:wallet-reach`; and
  `red:journey-header-fit` alone (`--alone`, on its own in-memory server); (3) parity `--prove-red` (P.5s, P.5L and P.6s
  rewritten, P.5g new), then the two-step compare: measure — `--compare` at the combined tree must fail §4.4 and §4.4f
  on exactly `regions.button.layout` in the four 360 cells (the holder block's and `/positions`', en and sw: the
  browser's layout and the server's first paint) and §4.6 on exactly their four entries, and nothing else —
  `sell-strip-whole-layout` seen in 8 of 8 (if not, its prediction is read against the capture and its pairs corrected,
  never re-baselined), `sell-strip-whole` 8 of 8, `sell-positions-wrap` and `sell-holder-stack` 4 of 4 each, A8f's two 2
  of 2, `sell-first-paint` in the other four, the matrix as before; copy — each of the four cells' four measured lines
  into its entry's `to`, then `SELL_MEASURED_FIRST` and its comment deleted in the same edit, never before all four are
  copied (each reads it until then); compare — green, every named Sell entry in all of its cells or none and every
  layout beside its class; (4) the tiles, read one by one with every text box measured against its button and its strip
  — the holder block and `/positions` at 320, 338, 340, 360, 366, 383, 390, 412, 430, 768 and 1280 in sw, en and zh: a
  free ticket (and selling) at TZS 1,500, TZS 100,000 and TZS 1,000,000; `/positions` in Swahili also at 376, 377 and
  384 with the TZS 1,000,000 free ticket, the browser's threshold against the model's (one line from 377 with the label
  as measured, from 384 by the model), and the TZS 100,000 one at 360 (one line as measured, by under a pixel; its note
  under its figure by the model); legacy paid windows printing "TZS 700,000 −300,000" (TZS 1,000,000 at 30%: its fee
  under its figure on `/positions` at 320–324 in Chinese, and at 320 in Swahili by the model; three lines in the holder
  block's stack at 320), "TZS 995,000 −5,000", "TZS 109,450 −550" and "TZS 180,000 −20,000"; a lapsed one, a shut one; a
  free window of ten minutes or more beside a five-minute one, so the strip's two-line threshold is drawn at 376, 377,
  382 and 383, and at 377 to 382 across the 10:00 tick (there the strip drops to one line and the button under it moves
  up 17px, as it moved 15 before A8g); both server paints with every script held; the confirm opened from each host; and
  the large-text tiles (page zoom at 313, 278, 277 and 246 CSS px with a TZS 1,000,000 free ticket and a shut one on
  both hosts; Android's text-only scaling on a device that can draw it); (5) commit, push, and read the deploy back
  (`?dpl=`, the served stylesheet carrying both phone blocks).
- **A8h — a sale's result is no longer taken away with its ticket, a moved price is told by its toast alone, and every
  refused sale is as loud as the registry ranks it (drafted 2026-10-04 on `a2ce1762`, revised the same day after three
  reviews; applied after A8d and A8g (`315a3ae5`), its own commit (`2e3ea161`), for every player, not flagged).** Two defects the A8c drive
  measured in a real browser (2026-10-04, today's `/positions` on its open lens, sw, 390): (1) the result of a sale,
  "Imeuzwa · TZS 3,600 …", was on screen for 388 ms (418 ms on a second sale): the Sell button drew it inside the
  ticket's row, and the sale's own refresh took the sold ticket off the open lens with its row, button and result (the
  page's 20-second poller would have too; Tiketi zangu's open lens is the same, and the question page's holder block
  draws no Sell button for a ticket that is no longer open); (2) a moved price (`price_changed`) opened the result in its
  failure dress (a red ✕, "HAIKUFANIKIWA KUTOA", a red "Funga") and the calm toast that names the new price waited behind
  it (§F1). Now `submit()` hands a sale that went through, and a refused sale that is a hard block or a fault, to
  `SellResultHost` (`sell-result-host.tsx`, new), which AppShell mounts for a signed-in visitor through the shell's lazy
  module (`LazySellResultHost`, its own Suspense boundary, after the win celebration's): `handSellResult`
  (`sell-result.tsx`, new) dispatches `50pick:sell-result` with an ack object, and the host takes the result and marks it
  taken before the dispatch returns (the win celebration's handshake), then draws it until the player closes it (a sale
  that went through also closes at §F2's shared 5 s, held while read, as before) or moves to another page (§0h point 53).
  The result's markup moved, unchanged, into `SellResultModal`, the one definition the host and the button share; the
  button draws it itself only when no host took it (the host's chunk never arrived, or a page without the shell), as
  before A8h. Focus (point 54): the button remembers the control that opened its confirm (`openedFrom`) and hands it
  over; the host reads the main region's controls around it while the ticket is still on the page (a sale's result is
  handed over before the page is asked to refresh) and, when the result closes with focus nowhere or still in the
  closing dialog, puts focus on that control if it is still there, else the first control after where it stood, else
  the nearest before it (never a field), without scrolling; a refusal with no result gives focus back to the Sell button
  once it can be pressed again. A refused sale is routed by the registry's rank of its reason (DESIGN_AUTHORITY
  §F2/§F3; points 55 and 56): an `error` (not the player's ticket, a missing wallet, a pool short of its price), a
  request that threw and a refusal the registry cannot rank keep the red toast and the ✗ result; a `warning` or an
  `info` (a moved price, too many tries, selling shut, the ticket already sold or settled …) gets the calm `factual`
  toast alone. Every refusal's toast stays until it is read (`durationMs: 0`) and the next sale, from any button on any
  page, dismisses it (`lastRefusalToast`, one slot for the tab); its
  figures are kept whole (`keepFiguresWhole`: a no-break space after "TZS"). A moved price keeps A8c's wait
  ("Inapakia…", one refresh, then the new price). The sale, every figure, every word and every refusal reason are
  unchanged, and no client arithmetic is added. Gates: `test:sell-price-guard` §7 (7.handed, 7.calls, 7.moved, 7.loud,
  7.stays, 7.whole, 7.fallback, 7.ack, 7.host, 7.draw, 7.away and 7.focus; 7.loud runs the registry over every answer a
  sale can be refused with) and 4.moved and 4.calm re-pinned in the open, with 37 new plants in
  `red:sell-price-guard`; `test:journey-tickets` §12 re-pinned in the open (`SELL_DIALOGS` draws `SellResultModal`, the
  result's markup pinned line for line in its own module as `SELL_RESULT_MARKUP`, 12.dialogs counting where the one
  result is drawn and the look the host hands it, 12.words reading the result's module), its shared-result plant
  re-pointed and 4 new; `test:sell-grace-truth` 6.result reads the whole figures in the result's module, its plant
  re-pointed; `test:journey-shell` §12's table gains `LazySellResultHost` (eleven parts); `test:popup-fit`'s record
  trades `sell-button.tsx` (no popup primitive of its own now) for `sell-result.tsx`, reviewed; `test:failure-reasons`
  9e reads the result's module; `test:feedback-law` §1.1 scans the two new modules. **Reviewed before its commit**
  (2026-10-04, a static adversarial review of the applied change: three lenses — runtime, what the player is told, the
  guards — and every finding attacked by a refuter; 4 of 7 kept, two of them one defect), and fixed in the commit:
  (1) when a result closed, the host took focus out of any open dialog, so a win seal that opened over the result lost
  its focus to a control behind its scrim, where the next Enter could open another ticket's sale unseen — now focus
  moves only from nowhere (`NOWHERE`: the closing result, or withheld content), the Sell button's own test; (2) each
  Sell button kept its own last refusal, so a refusal on one ticket stayed beside another ticket's sale and refusals
  across tickets (too many tries, closed selections) stacked — now one slot for the tab (`lastRefusalToast`), which any
  next sale dismisses; (3) 7.focus read only the host's call sites — now `wayBackFrom`, `canTakeFocus` and
  `giveFocusBack` whole, with `NOWHERE`, `NOT_THE_PAGE`, `FOCUSABLE` and `NEAR`, and 7.stays the slot at the module's
  top level, 9 new plants (37 of A8h's). Two refuters held the per-button toast to be intended (a refusal on one ticket
  stays true after another sells); the call here goes with the kept finding, since the toast never names its ticket
  and §F6 coalesces a burst into the latest. The third refuted finding, BUSY's "unchanged" sentence, predates A8h
  (point 56's ⚠️). **Served bytes for a classic
  viewer:** a guest's page changes only by the name of the shell's lazy chunk (every viewer's script tags and client
  references name it); a signed-in viewer's HTML gains one Suspense boundary's markers after the win celebration's (the
  host draws nothing until a sale), its head the preload of the host's chunk, and its inline RSC data the part's client
  reference; no markup, prop or class changes in any region `qa:classic-shell-parity` captures and no overlay appears,
  so it names no entry (its header says why, as WP6c recorded for the other parts). **Owed:** typecheck and the battery,
  read red by red against the same run on the A8dg head; the in-process reds; `red:timer-date`, `red:install-invite`,
  `red:measure` and `red:ticker-honesty` each alone and detached; parity `--prove-red`, then `--compare`; a production
  build read by `first-load-parts` (the host's chunk off every first load, its bytes recorded) and the served skeletons
  compared (`shell-skeleton.py`, a null pair first); the lost-chunk drive with its control; the price-guard drive and the
  result drive (`scratchpad/s6/a8h/drive/`, written for A8h and not yet run); and the tiles.

## §0h · Points for Ali — taken while he was away (2026-10-01 →)

Ali said "proceed, taking down points, I'll be away" (2026-10-01). Every call made since then is a numbered point
here, with how to overrule it. Newest last; nothing here blocks the work.

1. **S4 closed with my picks.** Choice 2 = **2A** (royal ring on the chosen amount), choice 3 = **3A** (royal play
   plate on the How-to card), choice 1 = **1B** (neutral step numbers — gold would break DESIGN_AUTHORITY §M3).
   Overrule: flip the frame's Tweaks switch on the canvas and tell the next session.
2. **The panel's rule changes are adopted** (§0g): no number on an over-100× card; the "bet TZS 2,000 instead"
   button shows its own estimate; after a deposit the loss limit is explained, never pre-filled; Akaunti gets a
   Pumzika / Jizuie row above invites. Overrule: say which one.
3. **The Swahili review is Claude's** (Ali, 2026-10-02: "you will be the Swahili speaker"). Every drafted string and
   every correction to a live word (`S4-COPY-AUDIT.md`, e.g. "Lipo" → "Malipo") is reviewed and signed off in that
   file by the session that ships it; corrections to words players see today ship with S12, never earlier.
   ✅ **First review signed off 2026-10-02** (`S4-COPY-AUDIT.md` "Swahili review"): every S6 key, every live-word
   correction and the S4 canvas drafts — three journey keys corrected (`hubGuestPrompt`, `ticketsErrorBody`,
   `hubGroupLegal`), and two canvas drafts the build must take corrected (Juu/Chini round closed).
4. **Nothing is turned on until the whole Vodacom plan is done** (Ali, 2026-10-02) — not his preview, not the
   journey. S1's done-when ("staff see a preview marker on production") therefore waits for S14; until then every
   new screen is verified on a local server, and production is checked only for "nothing changed for players".
5. **To confirm with finance:** a payment that lands during a break is returned "within 3 working days" on the
   canvas — the real period comes from wallet-service.
6. **S6 header height stays 56 px** (the kit's bar), not the canvas's 64: the board's sticky filter bar, the panels
   and S7's above-the-fold budget are built on 56.
7. **Where the canvas drifts from the kit, the kit wins:** underline section tabs on desktop, a switch row for card size,
   today's capsule look. Recorded so the canvas is not read as binding on those details.
8. **The staff console link in Akaunti shows to every staff role**, SUPPORT included (SJ-23); today's avatar menu shows
   it to Admin, Compliance and Moderator only.
9. **"Kuwa wakala" appears in Akaunti** under the footer's own visibility rule — this overrules the footer's note "never
   in the account menu"; recorded in COMPLIANCE-DECISIONS.
10. **Msaada carries no phone number.** 0800 11 0011 is the national problem-gambling helpline, not 50pick's help desk,
    so it keeps its own labelled row under Weka mipaka. This reverses the S4 panel's wording for that row; the canvas
    is corrected to match.
11. **Tiketi zangu for preview viewers** keeps the ticket number and all 7 filters, and drops the share button, the
    profit strip, the yes/no bar, search and sort (shelved, not deleted).
12. **The new shell is verified locally** (point 4: no preview on production before the plan is done); on production
    each push proves only that nothing changed for players.
13. **Two live fixes for every player, each in its own commit:** the "away" summary's link now opens settled tickets
    (it opened all); the sell-back countdown reads each market's own free window from the server instead of a fixed
    5 minutes (a money-truth fix). With it goes the button's own check on the phone's clock ("closes in more than five
    minutes"), which the server never makes: a bet placed 5–10 minutes before the cutoff now keeps its free label and
    countdown for the whole free window the server grants, where it read "Sell now … −0 fee" for part of it. Overrule:
    say so, and that check comes back on top of the server's instant (`test:sell-grace-truth` 3.state moves with it).
14. **Balances of TZS 1,000,000 and more stay compact** ("TZS 1.3M"), as the product shows today; the canvas drew the
    full figure.
15. **"Pumzika / Jizuie" becomes two rows** in Akaunti: Pumzika → take a break, Jizuie → self-exclusion.
16. **The classic notification bell is not touched until S15;** the journey's tab dot and Arifa row get their own
    counter. Lower risk for live players. ⚠️ The cost, corrected at WP3 — this point said "one extra request on a
    journey desktop page", which was wrong: the tab dot checks for notifications every 30 s, as the bell does, and a
    journey page kept both loaded at every screen width (each only hidden at the other width), so a signed-in journey
    page would have asked twice every 30 s instead of once. ⭐ Resolved at WP6a, as a rule: each width now LOADS only
    the counter it shows — the header's bell from 1024, the tab dot below it, and neither until the browser has said
    which width it is — so a signed-in journey page asks once every 30 s, as a classic page does, plus one read per
    visit to Akaunti for the Arifa row. `test:journey-shell` §8 holds it, with a plant for each half. Only preview
    viewers are affected until S15; players outside the journey are unchanged. Overrule: say so, and both counters
    load at every width again (`pollersAt` in `src/lib/journey/one-poller.ts`; the §8 checks move with it).
17. **The phone home-screen shortcuts** (Maswali, Tiketi) change at launch, not now — that file is the same for everyone.
18. **"Tiketi zangu" takes two lines in the tab rail on phones narrower than 360 px** (A17). A quarter of a 320 phone
    is 80 px and the label needs about 83, so it would otherwise read "Tiketi zan…"; every other label, in all three
    languages, fits on one line, and from 360 px all four do. Below 360 the four tab icons then line up from the top
    so the two-line tab does not sit higher than the rest. Measured from the font's widths, then confirmed in the browser
    (2026-10-02, `qa:journey-header-fit`, 66 cells): at 320 px the Swahili "Tiketi zangu" takes two lines and is never
    cut; every other label, and every label from 360 px, takes one. Overrule: say so, and the label keeps one line and ends in "…" as the classic rail's do.
19. **The S2 short-title approvals** (Ali, 2026-10-02: "you please approve those"). Claude reviews every drafted
    short title (as the Swahili reviewer) and approves them in /admin — which needs an officer login on 50pick.tz:
    Ali's admin is never re-minted and signing in with it signs him out everywhere. Waiting on Ali: a staff account
    for Claude (any officer role with the approve permission), or Ali approves after Claude's review list.
20. **The journey chrome must not ride in every visitor's first download — WP6c** (found on production 2026-10-03, §0i
    WP6b item 2). AppShell's `lazy()` bindings did not keep the journey header, tabs and flag out of the scripts a
    classic page loads (≈3–4 KB gzipped, never rendered). WP6c moves them behind a small client wrapper that loads
    them with `next/dynamic`, which does split, proven the only way chunking can be proven — a local production build
    and the same chunk check (the classic page's initial scripts carry no journey string; a journey page's do). The
    same is true of AppShell's OLDER lazy overlays (the consent prompt, the channels panel, the win celebration…): they
    have always shipped in the first download. Under Ali's standing rule (2026-09-27: fix the same defect platform-wide,
    with its own guard) WP6c moves them too — still rendered on the server exactly as now (`next/dynamic` with its
    server render on), so the markup every player gets is unchanged (the same elements in the same Suspense
    boundaries; the head gains low-priority preloads of their code, §0i WP6c) and only WHEN their code downloads
    changes; a new guard holds every server module to no `lazy()` or `next/dynamic` of a
    client module. Overrule: say so, and
    either half stays where it is. **Built (2026-10-03, §0i WP6c):** both halves together. Ten of AppShell's eleven
    lazily loaded parts now come from one client module, `src/components/layout/shell-lazy.tsx`, through `next/dynamic`
    with the server render on; the eleventh, the offline banner, is imported statically, its code arriving with the
    page as it always did (its one job is a connection that fails). A part whose code never arrives is left out, not
    fatal. `test:journey-shell` §12 is the guard. Done when the coordinator's production build shows a classic page's
    initial scripts without the ten, the served-HTML compare finds a classic viewer's body markup unchanged (the head's
    preloads, the script list and the inline RSC data move), and `qa:classic-shell-parity` finds the shell's regions
    unchanged.
21. **Tiketi zangu's loading picture is chosen on the server** (WP9; departs from S6-PLAN A16's letter). While
    `/positions` or `/updown/history` loads, its loading file asks the same per-request answer the page and the shell
    use — is this reader in the journey? — together with the words, and draws one picture: the journey's for a journey
    reader, today's for everybody else. A16 said to pick it in the browser and never ask, because asking would delay
    every reader. It does not: the answer is worked out once per request and kept; a page opened fresh has already
    worked it out for the shell; and moving inside the app, a reader with no preview pass costs only a cookie and header
    read and the switch's copy in memory (the stored switch is re-read at most every 10 seconds, and not at all while the
    Owner's ceiling is WITHDRAWN). What it buys: a journey reader no longer sees today's picture (with "Nafasi") while
    the page loads, and a classic reader is sent nothing of the journey's picture and no new script for it. The two
    error pages are never drawn on the server — Next runs them only in the browser — so each reads the journey flag as
    it appears, from the shell's mark already in the page: a journey reader's first sight of one is already in the
    tickets' words. Overrule: say so, and the loading pictures go back to being picked in the browser (A16 as written),
    with a brief classic picture on a fresh load.
22. **No payout figure on a journey ticket until the result** (supersedes S6-PLAN WP9 step 4's exact figure after
    betting closes). An open ticket says "Malipo · Matokeo yakitoka" while betting is open, after selling closes, and
    after the closing sweep has fixed the exact amount; the amount appears only with the result — "Malipo ya mwisho":
    the payout for a win, TZS 0 for a loss, the stake for a refund, the sale price for a sold ticket. Why: SJ-4 and
    DESIGN_AUTHORITY §C3 (amended 2026-09-29) keep a position's payout hidden before the result in Tiketi zangu by name,
    and the canvas draws every pending ticket this way, one whose selling has closed included. Today's position card
    does not change: it keeps its exact figure after betting closes. Overrule: say so, and journey tickets show the
    exact figure once betting has closed and the sweep has run, as today's card does.
23. **A journey reader's Tiketi zangu is cut by its lens alone, and a shared link's other settings are ignored.**
    Search and sort are put away for preview viewers (point 11, A19); the side, topic and window filters live on the
    bar's second row, which the journey's bar does not draw (WP9 step 5: row one only). So a `/positions` link carrying a
    search, a sort, or a side, topic or window filter opens, for a journey reader, that lens's whole list — the extra
    settings are ignored rather than applied with no way to see or clear them. Readers outside the journey are
    unchanged. Overrule: say so, and either the second row comes back for journey readers or the view applies a link's
    settings anyway.
24. **The Sell button keeps today's words until WP10.** Inside a journey ticket the button and its confirm dialog are
    today's, and three of its Swahili lines still say "nafasi" (`dialog.sellPositionNow`, `dialog.keepPosition`,
    `common.positionUnchanged`). WP10 gives the button the journey's look and words. Overrule: say so, and those three
    get journey wording now.
25. **What the error pages say to a journey reader.** On `/positions` the body says their tickets are safe
    (`journey.ticketsErrorBody`) and the button says "Rudi kwenye tiketi" (`journey.ticketsBack`). On `/updown/history`
    only the body changes (today's says "nafasi"); its button stays "Rudi Juu na Chini". Both keep the error page's own
    small heading and headline. Overrule: say which words should change.
26. **Tiketi zangu's heading, and the browser tab on its Up & Down side.** On both kinds the heading is "Tiketi zangu"
    alone — the platform's page heading with no small line over it (today's says "Nafasi") — with the Maswali |
    Juu/Chini switch under it. The browser tab follows the page on Maswali ("Tiketi zangu"), but `/updown/history` keeps
    its own tab title, "Juu na Chini zako", for a journey reader while its heading says "Tiketi zangu". Why: the heading
    names the place and the switch names the kind, but the tab is the only name a reader sees when the page is not in
    front of them — the tab strip, the browser's history, a bookmark — so the Up & Down tab keeps saying which tickets
    it holds; WP9 step 6 changes that page's header only. Overrule: say so, and both tabs read "Tiketi zangu" (or the
    heading gets a small line over it again).
27. **Empty Tiketi zangu lists.** No tickets at all, or none open (the Hai lens): the canvas's empty card, "Bado huna
    tiketi hai" with "Tazama maswali" to the questions, and no filter buttons. An empty settled, won, lost or refunded
    lens: the journey's own copies of today's sentences (`journey.ticketsEmptySettled` and three more) — the same words
    in Swahili and English, which say no "nafasi", and in Chinese 注单 ("ticket") where today's say 持仓 ("holdings"),
    so the view reads neither. Nothing sold yet: "Bado hujauza tiketi yoyote". The one way out offered reads "Tiketi
    zote (n)". Overrule: say which sentence.
28. **Ticket dates** — "Imewekwa {date}" and "Uchaguzi unafungwa {date}" — use the platform's deadline format (day and
    time, the year only when it is not this year), written on the server. Overrule: say which format.
29. **An open ticket whose selling has closed says "Uchaguzi umefungwa"** where the closing date would be. Overrule:
    say so, and it shows the date it closed.
30. **The journey's filter bar is a second bar beside today's, not a setting on it** (WP9 step 5 said "a variant").
    Both draw one shared outer strip, so the filter gate still finds the strip once and today's bar is drawn exactly as
    before. Recorded because it departs from the plan's wording. Overrule: say so, and it becomes a setting on today's
    bar.
31. **Each ticket can be linked to directly:** a notification's link to a ticket scrolls to it and outlines it, as on a
    question's page. Overrule: say so.
32. **The journey's lens strip has 12 px of space below it**, not the 10 px under today's second row: 10 px is a
    spacing step the design gate counts as a defect, and writing it by hand would add a style rule for every visitor.
    Overrule: say so, and it becomes 10 px.
33. **The "Utendaji" link sits below the tickets.** After the list and the pager, as a quiet small link, shown only
    when the reader has a ticket — as on today's page, where it sits beside the heading. Why: the canvas's head is the
    name and the switch alone, and the link has to stay so `/positions/performance` keeps a door on a journey phone
    (A15). Overrule: say so, and it goes back beside the heading.
34. **Where a journey reader still meets "nafasi" after WP9.** On Tiketi zangu itself, only inside the Sell button's
    dialogs, until WP10 (point 24). One tap away: `/positions/performance`, which the Utendaji link opens and WP9 does
    not rebuild — its small heading and back link ("Nafasi"), its empty title and its result count ("Nafasi {n}"); the
    question page's block for a ticket holder ("Nafasi zako"); and, on a computer, the avatar menu's "Nafasi" row. All
    of these are on §3's S15 rename list and change at the flip. Overrule: say so, and WP9 gives
    `/positions/performance` journey words now.
35. **The journey's Sell look, as built (WP10).** In its free window a journey ticket says "Uza bila ada hadi 11:23 ·
    3:42": 11:23 is when the free window ends, worked out by the server from the question's own free minutes and shown
    in the platform's clock, and 3:42 counts down to it. Under it, an outlined button: "Uza bila ada" above "Rudishiwa
    TZS 1,000 kamili", the amount the server would pay for a free sale (the whole stake), never one worked out on the
    phone. That offer stands only while the server priced the ticket inside its free window and the countdown runs.
    From the server's paint on, the countdown shows the time the server's own render had left (A8e, point 46), and it
    runs once the page has started on the phone. The
    moment the countdown reaches 0:00 the offer goes: the button dims to "Inapakia…" with no figure and nothing to
    press, an open confirm closes, and the page asks the server straight away, so today's questions show "Kuuza
    kumefungwa" within a moment (selling locks when the free window ends) and an old question that froze a paid window
    shows "Uza sasa" with the server's figure and fee. A ticket priced in a paid window shows "Uza sasa", the figure and
    the fee from the start; a fee of 0 is not printed. Once selling has shut: "Kuuza kumefungwa" over "Dau hili sasa
    linasubiri matokeo — haliwezi kuuzwa tena.", in words, with nothing to press, from the very first paint. The
    confirm asks "Uza tiketi hii sasa?" with "Baki na tiketi", and a sale that fails says "Tiketi haijabadilika.", so a
    journey reader meets no "nafasi" on Tiketi zangu itself any more (point 24 is done, and so is the first sentence of
    point 34). The button's edge is the canvas's own colour, the kit's colour for a control's edge (3.18:1 on the card;
    the kit's plain outlined button would be 1.60:1, under the platform's 3:1 floor for a money control's only edge).
    One departure from the canvas: "Kuuza kumefungwa" sits on its own line above the sentence instead of running into
    it with a full stop (the dictionary's word has none, and Chinese would need its own). Since A8b (2026-10-03)
    today's button outside Tiketi zangu withdraws a lapsed free price the same way, in its own look — dimmed,
    "Inapakia…", no figure — so neither look offers a free price its countdown has outlived (point 37 (f)); since A8e
    both looks withdraw every price of a page brought back by Back or Forward the same way until the server answers
    (point 49, which resolves 37 (a)'s Back/Forward half). Overrule: say which part.
36. **The classic words that stay on the journey's Sell path, none of them "nafasi".** WP10 gives journey words only to
    the three lines that said "nafasi" and mints no new word, so these stay today's until the S15 rename (§3): the
    confirm's small heading "Toa sasa" (en "Cash out", zh 兑现), which is also the confirm's spoken name; a failed
    sale's small heading "Haikufanikiwa kutoa" (en "Cash-out failed", zh 兑现失败) and its message title "Imeshindikana
    kutoa" (en "Couldn't cash out", zh 无法兑现); the sold receipt's small heading "Imeuzwa" (en "Position sold", zh
    持仓已出售, "holdings sold"); the button's "Inapakia…" while it waits for the server (en "Loading…", zh 加载中…);
    and the platform's shared refusal sentences, picked when a sale is refused, where the Chinese one shown when a sale
    races the result says 此投注已不再持仓 (持仓 as "no longer held"). ⚠️ Two wording risks for the review: in Swahili
    "toa"/"kutoa" is also the journey's word for withdrawing money ("Toa pesa"), so "Haikufanikiwa kutoa" on a failed
    sale can read as a failed withdrawal; and Chinese says "sell" three ways on this one path (卖出 in the journey's
    words, 出售 and 兑现 in today's). `test:journey-tickets` §12 names the 持仓 heading and the three "toa" words, so a
    change to any of them is seen; the refusal sentences are picked at run time and are outside that scan. Overrule:
    say so, and journey words for these are drafted for the review (en "Ticket sold", zh 注单已卖出 for the receipt; a
    "kuuza" wording for the two failure headings).
37. **What today's Sell button still does that WP10 leaves for its own commits (for every player).** WP10 changes no
    shared Sell code (the countdown, the confirm, the sale) and does not touch today's button, so these stay: (a) the
    countdown takes the server's time once the page has started on the phone, so it runs late by the time the page took
    to start (under a second on a fast phone, several on a slow one), and for those seconds a ticket still offers a
    free sale the server has stopped granting free: the server refuses it, or on an old paid-window question charges the
    fee after a screen that said none — still open (since A8e the page is served with the strip and the free price, its
    countdown showing the server's own value until the page starts and then running on from it, late by the same
    seconds). ✅ Its other half is resolved by A8e as built (2026-10-04, point 49; the drive's page E and a Back between
    two addresses of one page owe the measurement): a page brought back by the browser's Back or Forward is the page as
    it was rendered, however old (Next serves it from its own back/forward cache), so until A8e its countdown restarted
    from the time that render had left and a free offer the server had ended showed again, in both looks, until the
    page's poller next refreshed (the A8b drive measured 20.3 s on `/positions`; up to 15 s on a question page). Now
    each Sell button recognises a render the tab has already drawn — whether the page is mounted again or only its
    address's query differs, as between two pages of `/positions` — withdraws its price in either look (dimmed,
    "Inapakia…", no figure) from the first picture, and the page asks the server once, so a restored page shows the
    server's answer within one round trip and never an old offer; (b) "Kuuza kumefungwa" at selection close is
    timed by the phone's own clock,
    so a phone that runs fast shuts early and one that runs slow keeps the button past the cutoff (the server refuses);
    (c) if the connection drops after the server has completed a sale, the result says it failed and that the ticket is
    unchanged, though the next refresh shows it sold; (d) holding Enter on the Sell button for about half a second
    opens the confirm and sells before it can be read; (e) on an old question with a paid window, the button keeps
    offering its paid price after the paid window ends, until the page refreshes (within 20 seconds; the server
    refuses); (f) ✅ resolved by A8e as built (2026-10-04, points 46 and 47): until A8e today's button outside Tiketi
    zangu showed "Uza sasa · TZS 0 −1,000 ada" on a ticket whose selling had shut, and "Uza sasa · TZS {stake} −0 ada"
    on a ticket in its free window, until the page had started — its server paint, kept by A8b on purpose. It is now
    served as the page then keeps it: "Kuuza kumefungwa", dimmed, on a shut ticket, and the strip with "Toka bila
    gharama · TZS {stake} · pesa yote" in the free window (on a page served in the window's last seconds that free
    price, its countdown frozen at the server's value, outlives the window until the page starts: (a)'s late start,
    still open). Its stale free offer once the countdown has run out ("−0 ada",
    and "Hakuna ada" in its confirm, for up to 20 seconds) is closed by A8b (2026-10-03, §0i), which gives today's
    button WP10's withdrawal. Left in both looks, for the journey look's owner: the confirm closes one render after the
    button withdraws the price, so for about a frame it still shows the free price with its sell button live (the
    server decides that sale, as it does one sent a moment before the countdown ran out), and closing it in the same
    render changes the dialogs both looks share; (g) the kit's plain outlined button draws its edge at 1.60:1 on a
    card, under the 3:1 floor, wherever that edge is a control's only boundary; (h) on a question's page today's button
    sits in the holder block, inside its section's and its row's border and padding, so it is 84px narrower than on
    `/positions` (204px on a 320 phone, where `/positions` gives 288), and its free row does not fit there below about
    430px in Swahili and about 376px in English. The v2 baseline (`7c859cdf`, a TZS 1,500 ticket) already measures it
    at 360: the Swahili row runs 67px past the button's content and 50px past its edge, out of its ticket card, and the
    English row 14px into the button's padding. A8b leaves that so from 360 (parity holds those cells); below 360 its
    left-out note shortens the Swahili free row by about 68px, but at 320 every row there still overflows, in every
    language. On `/positions`, from 360 a Swahili free row for a six-figure stake runs over until about 367px, and for
    TZS 1,000,000 until about 384px; at 320 a Chinese legacy paid row with a six-figure fee runs about 5px into the
    button's padding, inside its edge, as it does today. The holder block is the next step for today's button: a layout
    drawn for that width, measured first, then named in SELL_EXPECTED_DIFFS from a compare (A3), never re-baselined.
    ✅ (h)'s holder block is resolved by A8d as built (2026-10-04; §0i A8d, point 45; its compare and tiles are owed
    there): below 640 its Sell button stacks — its words on one line, the figure and its note on the next, on the 56px
    rung — so no state, stake, fee or language runs past its content from 320 up at the default text size (static model:
    the least room is 0.26px at 338; three lines only below 345px, for a long fee).
    ✅ (h)'s `/positions` half is resolved by A8g as built (2026-10-04; §0i A8g, points 51 and 52; its compare and tiles
    are owed there): below 640 a row that cannot hold one line there puts its note under the figure inside the same
    button, and every row that fits keeps its one line (static model: no row runs past the content at any width from
    320; least room 0.28px at 325, a Chinese paid row that still fits on one line). By that model — whose ranges (h)
    gives above, and whose label is an upper bound — the rows it moves are a Swahili free row for a six-figure stake at
    360 to 366px and for TZS 1,000,000 to 383px, and a legacy paid row with a six-figure fee at 320 to 324px; with the
    Swahili label as the v2 baseline measured it (124.5px, the model's 131.28) the free row that moves is TZS
    1,000,000's alone, to 376px, and the Chinese paid rows' 320 to 324px are exact. And the free strip above the button,
    whose Swahili parts broke inside in the holder block below 377px, now wraps only between them. (h) is closed.
    (a) is the money-truth one left (A8b closed (f)'s stale free offer): the server decides every sale, but for the
    seconds the countdown runs late (A8e closed the Back/Forward half), an old paid-window question can show
    "no fee" and charge one. Overrule: say which comes first; otherwise (a) next, then (d) — (h) is closed (points 45,
    51 and 52).
    Since A8c (§0i; points 38 to 44), the money half of (a) and the last frame of (f) are closed: a sale confirmed at a
    figure the server no longer pays is refused and the new price named, so a screen that said "no fee" is never followed
    by a fee; what (a) still leaves is the stale free offer itself, for those seconds.
38. **A sale is paid the figure the player confirmed, or nothing happens (S6 A8c, for every player).** The Sell button
    sends the net figure its confirm showed — its `value`, the figure under "Utapokea" in the confirm — as
    `expectedValue`, written `String(value)` (a plain whole number, never formatted), from `submit()`, the one sale both
    looks share, so one line serves both. The three hosts hand the button `cashOutValue`'s own price, and
    `test:sell-price-guard` 4.hosts pins each binding: since A8c a wrong one would refuse every sale on that host.
    Overrule: say so, and it sends another figure (the stake, or the fee beside the price); point 39's comparison moves
    with it.
39. **The comparison is strict, in both directions, against what the sale credits.** The server sells only if the figure
    equals, to the shilling, `paid` — `cashOutValue`'s price under the conservation clamp, the very number the wallet is
    credited — read under both locks before the first write. A figure above it is refused as well as one below: the
    player confirmed a different sale. The clamp changes `paid` only where a pool holds less than the sale's NET price (a
    broken pool, which should never happen); a pool below the stake but not below the net price still sells at the
    confirmed figure, and the house's fee shrinks by the shortfall, as before A8c. Where it does change `paid`, the page's
    price can never equal it, so that refusal is `cashout_pool_short` (point 41), not a price change. Before A8c that
    sale paid the smaller figure after a confirm that showed the larger, and called the difference an early-exit fee.
    Overrule: say so, and only a figure below is refused.
40. **The check sits after every refusal that existed, inside both locks, before the first write.** So a poll whose exit
    locks with its free window still answers "Muda wa kuuza dau hili umefungwa", word for word, whatever figure arrives —
    A8c changes no answer that existed — and nothing is written before it: a refusal commits nothing in either store.
    Overrule: say so, and it moves earlier (a shut exit would then be told its price changed, which is not why it is
    refused).
41. **Two refusals, both `CONFLICT`, with the server's figures in `detail` (`value`, what a sale pays now, and `fee`).**
    `price_changed` (new): the price moved — a warning (the player can sell again at once, and their money did not
    move), shown as a toast. Its sentence names the new figure: "Bei imebadilika kuwa TZS 9,000. Dau lako halijauzwa —
    unaweza kuliuza kwa bei mpya." (en "The price changed to TZS 9,000. Your bet was not sold — you can sell it at the
    new price.", zh "价格已变为 TZS 9,000。您的投注未卖出——您可以按新价格卖出。"); the fee is printed by the refreshed button, as for any paid
    price. `cashout_pool_short` (new, ⚠️ a departure from the one reason first decided): the pool holds less than the
    sale's net price, so no page could ever show what the sale would pay, and "you can sell it at the new price" would
    be false — the player would tap, be refused, see the same figure, and tap again into the cash-out limit. It is an
    error (a fault of ours the player cannot fix) and says "Kuna hitilafu upande wetu, hivyo dau hili haliwezi kuuzwa
    sasa. Wasiliana na msaada." (en "Something went wrong at our end, so this bet can’t be sold now. Contact support.",
    zh "我们这边出现错误，您的投注暂时无法卖出。请联系客服。"); its record (point 44) carries both figures for whoever repairs the pool. Both
    Swahili sentences are signed off in `S4-COPY-AUDIT.md` ("Swahili review" 4). Overrule: say which part — the fee
    named in the sentence too; or the short pool told its price changed, as first decided (the pages would then have to
    price the clamp themselves, which also turns their free and fee words false in that state).
42. **No figure, no check; a broken figure, no sale.** A request without `expectedValue` sells exactly as before: the dev
    routes, every internal caller, and a page that was open when A8c deployed (its code sends no figure). A request whose
    figure is not a plain whole number is refused before the money path — by `cashOutPositionFromForm`, now the whole of
    `cashOutPositionAction` after its session check, so both stores' suites run it — with the platform's generic
    "Hitilafu imetokea. Jaribu tena." (`unknown_failure`, code `INVALID`), honest because nothing happened, and is never
    read as no figure: a client sending a broken figure is a bug to see, not a reason to sell without the check.
    Overrule: say so, and either a missing figure is refused too (once no page from before A8c can be open) or a broken
    one is treated as missing.
43. **What the player sees when the price moved.** The confirm closes, as for every refusal. The toast ("Imeshindikana
    kutoa" over the sentence in point 41) is the calm `factual` one — no red, no error buzz — as `DESIGN_AUTHORITY.md`
    §F3 gives a refusal the player can fix; the result opens with the same sentence as its title. ⚠️ That result is a
    departure from §F2, which gives such a refusal no popup: it stays because the confirm the player was reading has just
    closed and the new figure must be read before the next tap, and because today's Sell button opens it for every
    refusal. The page then asks the server once — the refusal's own refresh; when the countdown ran out while the sale
    was in flight, A8b's refresh at 0:00 runs as well, so a drive sees two then and one otherwise — and until the
    refreshed page is drawn both looks say "Inapakia…" with no figure and nothing to press: never "Inauza…" under a result
    that says nothing was sold (the refresh starts inside the sale's transition, so its pending state outlasts the
    answer). Then the button draws the new price and one more tap sells at it. A short pool keeps today's red toast (an
    error) and asks nothing. Overrule: say so (a confirm that reopens itself at the new price was not built: a money
    confirm should never open on its own; and the other refusals' toasts keep `danger` whatever their severity — routing
    them all by the registry, as the bet card does, is its own change, for every refusal).
    ✅ Resolved by A8h (2026-10-04, points 55 and 56). A moved price opens no result, so decision 6 of A8c's brief is
    overruled, after the A8c drive saw that result in its failure dress over a refusal one tap fixes, with the calm toast
    held behind it; the toast now shows at once and stays until it is read. The routing left open above is done in the
    same change: every refused sale is now as loud as the registry ranks its reason (point 56).
44. **A refused price is recorded, outside the locks.** `cashOutPositionFromForm` writes one `market.position.sell_refused`
    audit row (category `BET`, the player as actor, the ticket as target; the reason, the figure sent, the server's
    `value` and `fee`) for a moved price, a short pool and a broken figure — fire-and-forget, once `cashOutPosition` has
    returned, so nothing is written, audited or emitted inside the locks and the reply to the player waits on nothing. A
    broken figure spends a cash-out token first, so a client sending them in a loop meets the cash-out limit rather than
    writing rows without end. No other refusal is recorded: a shut exit, a settled market and the rest are the player's
    state, not a price the platform moved. Why: before A8c a short pool showed in the sale's own audit row
    (`quotedValueBeforeClamp`); a refused sale writes no such row, so without this a broken pool, or a host handing the
    button a wrong figure, would be seen only by the player. The cost, named: the row also appears in the player's own
    activity list (`/profile/account`), filed under "Madau". Overrule: say so, and refusals are not recorded at all (the
    other option first left open), or only the short pool is.
45. **On a phone, a question page's Sell button takes two lines (S6 A8d, for every player).** In "Nafasi zako" on a
    question's page, below 640px the Sell button is 56px tall instead of 44 and centres its words: "Toka bila gharama"
    over "TZS 1,500 pesa yote" in the free window ("pesa yote" from 360px, as since A8b); "Uza sasa" over "TZS 3,240
    −360 ada" on an old question with a paid window (below 345px a long fee goes on a third line, under its figure);
    "Inapakia…" or "Kuuza kumefungwa" alone on one centred line, in the same 56px. Every word and figure is today's. Why:
    that block draws the button 84px narrower than `/positions`, and its one line ran past the button on the most common
    phones (the Swahili free row 67px past its content at 360, measured). Each open ticket's row is 12px taller, so what
    sits below it moves down by that; `/positions` does not ask for it, and from 640px nothing changes. With large system
    text (U24's) the stack holds more than today's one line, but not everything: zoomed to 130%, a 360 phone keeps every
    English and Chinese row inside the button while five Swahili rows ("Kuuza kumefungwa" the widest) run up to 13px into
    its padding, and a 320 phone runs five Swahili rows past its edge (§0i A8d has the rest). Overrule: say which — (a)
    `/positions` stacks too: its Sell button passes the same prop, and with it §5's one-host pin and its plant change, and
    parity's `/positions` entries take the stack class for the wrap class and re-measure their two layouts (point 52 (a)); (b) one 44px line that says what its confirm says
    ("Uza · TZS 1,500", the fee under the figure), leaving the free word to the strip above; (c) "Nafasi zako" drawn as a
    heading over ticket cards on a phone, as on `/positions` (a look change for every signed-in phone reader of a
    question page).
46. **The Sell button's first picture is the server's own (S6 A8e, for every player, both looks).** The countdown starts
    at the time the free window had left when the server drew the page — the server's clock, carried in the page — not
    at 0. So the first picture a phone shows, before the page has started on it, is the one the button then keeps:
    inside the free window today's button shows the "Toka bila gharama · 4:59 · Hakuna ada" strip and "Toka bila gharama
    · TZS 3,600 · pesa yote" from the server's paint, where it showed "Uza sasa · TZS 3,600 −0 ada" with no strip until
    the page had started (seconds on a slow phone, and the strip then pushed the button down); a journey ticket's line
    shows its countdown beside "Uza bila ada hadi 11:23" from the first paint too. Until the page starts the countdown
    shows the server's value, then runs on from it (late by the time the page took to start: point 37 (a)). Every later
    first picture of a fresh page, a soft navigation included, is drawn the same way. Overrule: say so, and the first
    paint goes back to "Uza sasa · TZS {stake} −0 ada", the strip arriving once the page starts.
47. **A ticket whose selling has shut says so from the server's paint (S6 A8e, today's button).** "Kuuza kumefungwa",
    dimmed, with nothing to press, where today's button showed "Uza sasa · TZS 0 −1,000 ada" until the page had started
    (A8b kept that, to change nothing the server sends). The journey's look already did this. Overrule: say so, and
    today's server paint goes back to "Uza sasa · TZS 0" until the page starts.
48. **A price the page priced with a fee is never shown free (S6 A8e, both looks).** When a refresh brings a price with
    a fee while the countdown still shows time left (a countdown running late), the button shows "Uza sasa · TZS 3,240
    −360 ada" in that very picture; before A8e one picture showed "Toka bila gharama · TZS 3,240 · pesa yote", the free
    words over the paid figure, until the countdown caught up (the A8b drive saw it after Back). A page that does not
    say whether its price is free (none does today) reads the countdown alone, as before. Overrule: say so, and the
    countdown alone decides again.
49. **A page brought back by Back or Forward shows no old price (S6 A8e, both looks).** The browser's Back and Forward
    redraw a page as it was, however old — a page shown again, or the same page at its other address (two pages of
    `/positions`, or a lens and the bare page). Each Sell button now recognises such a page — the same ticket, drawn
    from the same server moment, shown before in this tab and not on screen now — and until the server answers it shows
    "Inapakia…", dimmed, with no figure and nothing to press, for every price, free or with a fee (a shut ticket stays
    "Kuuza kumefungwa"); the page asks the server once for the whole restore, however many tickets it holds, and the
    answer is drawn as it arrives. A page opened afresh is never taken for one, however slowly it loads, and the phone's
    clock plays no part. Measured before A8e (the A8b drive, page E): the old free offer showed for 20.3 s. Overrule:
    say so, and either only free prices wait (a price with a fee shows as it was until the page's poller refreshes, up
    to 20 s), or each ticket asks on its own (one request per ticket).
50. **No money figure in the Sell dialogs splits, and the confirm's receive row reflows (S6 A8f, for every player, both
    looks).** Seen on a phone (2026-10-03, a question page in Swahili at 390px): the confirm drew "Utapokea" over "TZS"
    over "1,500". Its receive row sets the figure beside the fee column, and when the two did not fit side by side the
    browser squeezed the figure's column until the figure broke at its space; the v2 parity baseline (`7c859cdf`) holds
    the same at 360 in Swahili (the figure's column 104px, the figure on two lines). Measured by `test:sell-grace-truth`
    §6 — the repo's own fonts; en, sw and zh; 320 to 1280px; §5's eight stakes to TZS 1,000,000 (as at `2d0f56e7`), free
    and paid at every whole percent to 30: 6,144 cells — before A8f the figure split in 2,564 of them: in Swahili at
    every width to 430px and, for TZS 1,000,000, even at 1280; in English to 412px; in Chinese to 390px. In 100 more, a
    paid figure and its fee met on one line with under 1px between them (at 412 in English and Chinese, and at 340 in
    Chinese: "TZS 700,000" against "−TZS 300,000"). Now the figure is an amount (DESIGN_AUTHORITY §M4: one object, never
    split); when the fee column cannot share its line the row wraps, the fee column moving below the figure and staying
    at the right edge; and beside the figure the fee keeps 16px of clear space, so two figures never run together — 295
    rows of that grid that did not split now wrap for that reason (their figure and fee sat 0 to 14.4px apart). Where
    the two fit with that space, nothing moves: English at 360 keeps its one line, 2.8px to spare. The result after a
    sale sets the money figures in its title as amounts, in the mono face (`wholeFigures`; §M4 again: the title is Sora
    and letter-spaced, and Sora is not among the repo's fonts, so a figure set in it could not be proven to fit). Its
    success title leads with its figure ("TZS 1,500 Imerudishwa"), which was not seen to split, so for a sale that went
    through the change is the figure's face, on every result; a refusal that names a price mid-sentence (A8c's) keeps
    that figure whole however its words wrap. Parity never confirms a sale, so this is a classic change only the tiles
    show. Least room left at 320 after A8f: the receive row en 8.8, sw 8.8, zh 3.6px; the gold button 36.6px; the
    result's title 50.4px; its detail rows 3.6 and 0.2px with figure and label on one line (past that, the figure takes
    its own line, whole). The proof's floor is 320px: below 311px a free TZS 1,000,000 sale's figure runs into the
    receive box's padding and below 290px past its edge (a phone narrower than 320, or a 360 phone with the browser's
    page zoom at 125%), and the next to give is the gold button's label, below 283px. Overrule: say so — the fee column
    can wrap under the figure aligned left instead; the clear space can be smaller (8px wraps fewer rows); the result's
    title can keep Sora and set only a refusal's figures as amounts (`wholeFigures` on the refused result alone; the
    success title's fit is then unproven); or below 320 the receive figure can step down a rung of the type ladder (a
    design call, with its own proof).
51. **The free strip above the Sell button never breaks a phrase (S6 A8g, for every player, on both hosts).** The strip
    ("TOKA BILA GHARAMA · 4:59 · Hakuna ada"; en "FREE EXIT 4:59 · No fee") is now a row that wraps between its three
    parts, so a part that cannot share a line moves to the next one whole. Where it mattered — the question page's
    holder block in Swahili below 377px (below 383px when the free window is ten minutes or more), where the browser had
    squeezed the parts until "TOKA BILA" sat over "GHARAMA" and "· Hakuna" over "ada" — it now reads
    "TOKA BILA GHARAMA 4:59" over "· Hakuna ada", 2px between the lines (the strip 42px tall where it was 40);
    everywhere else it keeps its one line, as today. Its words, figures, sizes and colours are today's, and the second
    line starts with the note's own dot. With a free window of ten minutes or more, at 377 to 382px the strip there
    drops from two lines to one as its countdown passes 10:00 (five characters to four), and the button under it moves
    up 17px — as it did before A8g, when the squeezed strip fell from 40px to 25. Only a part wider than the whole strip
    could still break inside, and none is from 320px at the default text size (with the browser zoomed to 130% on a 320
    phone the Swahili free word is, and breaks as it does today). Overrule: say which — (a) the countdown goes with the
    note ("TOKA BILA GHARAMA" over "4:59 · Hakuna ada", so the dot always sits between two things; it needs one more
    element around the two — the reviewers' pick if the leading dot should go); (b) the dot leaves the note's text, so
    no line starts with it (a markup change the server's paint then carries); (c) the parts held whole even under zoom
    (a nowrap: a part wider than the strip would then run past it instead of breaking). Either (a) or (b) changes the
    strip's served markup, so its two parity entries are re-predicted in the same edit.
52. **On `/positions`, a row that cannot hold one line puts its note under its figure (S6 A8g, for every player).**
    Below 640px today's Sell button keeps its one line wherever it fits — every English row at every phone width, and
    every Swahili and Chinese row but the ones below — and where it does not, the label keeps its line and the note goes
    under the figure, both at the button's right end, inside the same 44px: the Swahili free row for TZS 1,000,000 from
    360px ("Toka bila gharama" beside "TZS 1,000,000" over "pesa yote") — to 376px with the label as a browser measured
    it, to 383px by the static model, whose label is an upper bound and which also moves a six-figure stake, to 366px,
    and a Swahili paid row at 320 — and a Chinese legacy paid row with a six-figure fee at 320 to 324px ("立即出售" beside
    "TZS 700,000" over "−300,000 手续费"). Those rows ran past the button's content before (the Swahili TZS 1,000,000 row
    17px at 360 with the label as measured, 23px by the model; the Chinese paid row 5px into the padding at 320). No row
    that fits changes, every word, figure and state is today's, and from 640px nothing changes. The rule is the button's
    own: every host that does not ask for the stack (point 45) is drawn it, so a later host is covered without asking.
    Overrule: say which — (a) `/positions` stacks too, like the question page (every ticket's Sell button there two
    lines and 56px tall below 640px); (b) the free note on `/positions` shows only from 640px (its big free rows then
    fit without it; the paid rows still need (a) or this); (c) the host asks for the wrap, as for the stack.
53. **A sale's result is no longer taken away with its ticket (S6 A8h, for every player, both looks).** Measured in a
    real browser (the A8c drive, 2026-10-04, today's `/positions` on its open lens, in Swahili at 390px): the result of a
    sale, "Imeuzwa · TZS 3,600 …", was on screen for 388 ms (418 ms on a second sale) and then gone. The Sell button drew
    it, inside the ticket's row, and the sale's own refresh took the sold ticket off the open lens, row, button and result
    together (the page's 20-second poller would have done the same). Tiketi zangu's open lens loses it the same way, and
    so does a question page: its holder block keeps the ticket's row but draws no Sell button once the ticket is no longer
    open. Now the button hands the result to a host the shell mounts for a signed-in visitor (`SellResultHost`, loaded on
    its own, never part of a page's first download; owed: measured on a production build), and the host keeps it until
    the player closes it. A sale that went through still also closes by itself after DESIGN_AUTHORITY §F2's shared 5
    seconds (held while the player points at it or tabs into it), as every money result does; a refused sale's result
    never closes by itself. A move to another page closes it, as leaving the page did before (a phone's own Back among
    them), and a result that arrives after the player has left the page now shows on the page they are on, where before
    it was lost. Its words, figures and colours are unchanged, in both looks, and its toast still waits behind it and
    shows once it closes (§F1). When no host takes the result (its code never arrived, or a page without the shell), the
    button draws it itself, as before. Overrule: say which — the result goes back into the ticket's row (and leaves with
    it); a sale that went through stays until closed too (no 5-second close: a departure from §F2 for the sale alone); or
    the result follows the player to the next page, as the win celebration does.
54. **When a result closes, or a refusal opens none, focus goes back to something still on the page (S6 A8h).** Before
    A8h focus fell to the start of the page after every result of a sale: the Sell button is disabled while its sale is
    in flight, so the confirm could not hand focus back to it as it closed, and the result handed it back to the confirm's
    own button, gone by the time the result closed. Now, once a result closes, the shell's host puts focus on the Sell
    button that opened the sale if it is still there and can take it; otherwise on the first control after where it
    stood (the next ticket, or the list's pager); otherwise on the nearest one before it (the list's filters). A field is
    never chosen (on a phone it would raise the keyboard), the page does not scroll, and when none of them can take it,
    focus stays where it is. A refusal that opens no result (points 55 and 56) gives focus back to the Sell button once it
    can be pressed again — for a moved price, once the new price is drawn, so the button's name says it. Focus is moved
    only when it is nowhere (on the page itself, or in a dialog as it leaves), never out of another open dialog: a win
    seal that opened over the result keeps it (the review before A8h's commit found the host taking it from there, onto
    a control behind the seal's scrim). Overrule: say so, and focus is left where the dialogs leave it (the start of
    the page, as before).
55. **A moved price opens no result: its calm toast says it, at once, and stays until it is read (S6 A8h, for every
    player, both looks; resolves point 43's departure).** Measured (the A8c drive, the same day): the refusal opened the
    result in its failure dress (a red ✕, "HAIKUFANIKIWA KUTOA", a red "Funga") over a refusal the next tap fixes, and the
    calm toast naming the new price waited behind it until it was closed (§F1 holds toasts behind a result). Now the toast
    is the whole answer, "Imeshindikana kutoa · Bei imebadilika kuwa TZS 9,000. Dau lako halijauzwa — unaweza kuliuza kwa
    bei mpya.", on screen the moment the confirm closes, since no result holds it, and it stays until the player dismisses
    it or sells again, any ticket on any page (`durationMs: 0`, as DESIGN_AUTHORITY §F8 and the registry's toast channel keep a money refusal until
    it is read; left to itself it would go after 4.5 seconds, where the result used to hold the sentence until it was
    closed). Its figure is kept whole: "TZS" never ends a line without its number (A8f's promise for this sentence, which
    only the toast draws now). The button says "Inapakia…" until the new price is drawn and then offers it, with one page
    refresh, as A8c built it, and focus comes back to it (point 54). This is §F2's rule for a refusal the player can fix
    (no popup, the `factual` toast), and it overrules decision 6 of A8c's brief (the result kept for a moved price).
    Overrule: say so, and the result comes back for a moved price (in its failure dress, the toast behind it), or its
    toast leaves after 4.5 seconds again.
56. **Every other refused sale is as loud as the registry ranks its reason (S6 A8h, for every player, both looks).**
    DESIGN_AUTHORITY §F2 gives a refusal the player can fix no popup and the calm `factual` toast, and a hard block or a
    real fault the red `danger` toast, kept until it is dismissed on a money path, with a popup when it must be
    acknowledged; §F3 takes the ranks from FAILURE-INVENTORY §0, which the failure registry (`failure-reasons.ts`) writes
    down for each reason. Before A8h every refused sale opened the ✗ result over a red toast, whatever its rank (point 43
    left the routing as its own change). Now the three the registry ranks `error` — a ticket that is not the player's, a
    missing wallet, a pool short of its price (`cashout_pool_short`: our fault, and it sends the player to support) — keep
    the ✗ result and the red toast, and so do a request that threw and any refusal the registry cannot rank. A request
    that threw is reported as BUSY, which the registry ranks a warning for a request the server turned away; on this path
    it only means the answer never came, so the sale's outcome is unknown (⚠️ its result still says the ticket is
    unchanged, as before A8h, which that request cannot know: changing the sentence is a copy change, kept out of A8h).
    The five the registry ranks `warning` (a moved price, too many tries, a bonus-funded bet, nothing on the other side, a
    broken figure) and the five it ranks `info` (selling has shut, the ticket already sold, the question settled, not live,
    or its selections closed) get the calm `factual` toast alone: no ✗ result, no red, no error buzz, and focus back on
    the Sell button (point 54). Every refusal's toast now stays until it is read (§F2's "sticky on a money path", §F8,
    the registry's toast channel), and the next sale dismisses it, from any Sell button on any page — one refusal toast
    for the tab, the latest, never a stack (§F6; the review before A8h's commit found refusals across tickets piling up
    while each button kept its own); behind a ✗ result it shows once the result is closed
    (§F1), so a hard block is dismissed twice, which §F6 allows for a toast that is deliberately the secondary signal. No
    word, reason or figure changes. Overrule: say which — every refusal opens the ✗ result again (red for all, as before
    A8h); only the toasts are routed and the ✗ result stays for every refusal (as the bet card does); the toasts leave
    after 4.5 seconds again; or a hard block's toast leaves with its result.


## §0g · S4 (2026-10-01) — the Design canvas: all eleven items drawn, the panel's findings applied; waiting on Ali

**The canvas:** https://claude.ai/artifact/UGVgjpiQFwep2hzfYLf3M6 (an Artifact of type Design, private to Ali until he
shares it). ⭐ The canvas is the source of truth for S4's frames — no copy lives in the repo. To revise it, `read` its
`project/*.dc.html` files and publish the changed ones to the same URL.

**What is on it (brief §6 item 1):**
- **Main board:** the component map for all five screens, "What never changes", and three numbered choices. Each choice
  has a switch in its frame's Tweaks panel:
  - **1A / 1B:** gold or neutral step numerals (How to Play).
  - **2A / 2B:** a royal ring or a filled light chip for the chosen amount (Bet sheet, Deposit).
  - **3A / 3B:** a royal or neutral play plate (Home).
  - My picks: 1A, 2A, 3A.
- **Row 1:** the agency's five frames, as delivered.
- **Row 2:** the same five screens in 50pick's system, at 390 × 844 so they sit beside the agency's frames. The
  320/360/412 widths come with items 2–11.
  - They can be tapped through: Home NDIO → Bet sheet → 5,000 → Balance too low → "Weka pesa TZS 3,000" → Deposit.
    The How-to card opens How to Play.
  - Every word is the deck's Swahili, from the §3 key table. The figures are S3's golden fixtures.

**Design calls made in the redraw.** Each is written on the Main board. The build (S7/S8) inherits them.
1. **Estimate panel:** a neutral inset, with the figure in white mono. Green means YES and gold means money-in, so
   neither is used for an estimate.
2. **Stake field:**
   - Focus uses the brand focus ring, never gold.
   - "Too much" (the attention state) is a strong neutral border, `oklch(78% 0.06 268)`, never the error or NO colour.
3. **Button inks:**
   - Pay (Lipa) is the royal primary button.
   - Place bet (Weka dau) is gold.
   - Deposit entries are `gilt-metal`.
4. **Disabled gold button.** `.btn:disabled` (opacity 0.45) turns the gold button a muddy brown on navy. The build adds
   a navy disabled look for the gold button: background `oklch(28% 0.12 268)`, `--text-subtle` words, a 1px
   `--border` edge.
5. **Wallet rows** use the product's own `PaymentLogo` white tiles. The four `public/pay/*` marks are uploaded to the
   canvas.
6. **The low-balance row's second line** names all four wallets (from `depositRails()`, R3).
   - At 390 it wraps to two lines, breaking cleanly before "Mixx by Yas", and it is drawn that way.
   - S8 must keep each wallet name unbreakable (nowrap), so a break always falls between wallets.
7. **Amounts** are mono and never letter-spaced (M4), including inside the gold button, which tracks its label
   0.02em. The helpline number is not an amount: it is Inter with tabular figures, because mono sat off the link's
   underline.
8. **Selection** (the chosen chip or filter) uses the product's own `--pill-active` fill plus a `--brand-400` ring.
9. **Deposit follows §3.5's order, not the frame's.** The frame omits three things the rulings add:
   - The phone number comes pre-filled (SJ-13), with "Tumia namba nyingine" beside the "Namba ya simu" label.
   - "Lipa kwa kadi" sits under "Lipa", not among the wallets.
   - A small 18+ and helpline line closes the screen (SJ-18: the focused screen has no footer).

   With all three, the screen fits 390 × 844 only with 48-px wallet rows and 12-px gaps. At 360 × 640 it scrolls; S9
   measures this.
10. **The phone header fit (brief item 2), measured in Chromium with the real fonts.** Cases: widths 320/360/390/412
    × sw/en/zh × balances TZS 2,000 / 125,000 / 1,250,000 / 10,000,000.
    - **As first drawn** (30-px mark in a 44-px box, 8-px gaps, 14/16-px pill padding), it overflows in 17 of 48 cases:
      - Swahili at 360 from TZS 125,000;
      - English at 360 at TZS 1,250,000;
      - at 320 in every case except Chinese at TZS 2,000.
    - **Rule from 360 up:** the product's own 26-px mark, its link still 44 px tall and widened to 44 px by a −9-px
      margin into the gutter; 6-px gaps; 10-px balance-pill padding; 12/10-px padding on "+ Weka pesa". This fits
      every case from 360 up.
    - **Rule below 360:** 12-px side gutter, "Weka pesa" without the "+" glyph, and a 12-px balance figure. This fits
      every case at 320, Swahili at TZS 10,000,000 included (exactly 320). The 390 frames now use the 360-up rule.
    - S6's header-fit gate asserts both rules.
11. **Card buttons (brief item 3), measured the same way.** Labels were checked at 320/360/390/412 in sw/en/zh.
    - The second line may wrap to two lines. Both buttons then grow together, from 64 to 74 px.
    - At 320, even "Shinda ≈2.8× dau" wraps (so does the English). "Shinda zaidi ya 100× dau" wraps at every width.
    - The card uses SJ-1's "Kuwa wa kwanza" as a NEW short key. The existing `beFirst` ("Kuwa wa kwanza kutabiri")
      wraps at every width, and it stays for the market page.
    - A figure never leaves its unit: a no-break space joins "≈2.8× dau", "1 Oktoba" and "10 Okt". So a break
      reads "Shinda / ≈2.8× dau", never "…≈2.8× / dau".
    - **Open, written on the canvas:** SJ-3's legacy caption has no player sentence. `describeFeeModel` returns
      English admin text ("capped 13%/33.33%"). The card shows the side word alone; the sheet can reuse today's
      `payoutCalcBody` sentence.

**Found while collecting copy, and fixed: F1 (`4b6d9b59`, live and verified).**
- On the deposit page, a DELAYED payout status paired the delayed title with the UNAVAILABLE deposit warning ("…you
  will not be able to take money out again until payouts are restored"). That is false while withdrawals still work.
- The words now come from one pure function, `payoutNoticeCopy`.
- `test:cert-f1` §9 checks every status × page pairing by what the player reads. It also replays the old logic,
  which must fail (the control).
- The real component, rendered server-side, now shows:
  - nothing when operational;
  - the delayed title and body when delayed;
  - the "cannot be paid" warning only when unavailable.

**Progress on items 2–11 (2026-10-01):**
- Item 2 ✅ on the canvas (row "2 · The header in every state", seven frames):
  - signed in at 360 and at 320 with TZS 1,250,000;
  - guest at 390 and at 320 (today's "Ingia" and "Jisajili" pills);
  - held wallet: the existing "Salio · limegandishwa" with a lock, and no Weka pesa pill, because a frozen wallet
    cannot take deposits;
  - balance hidden;
  - desktop at 1280, with the four destinations, language, bell and avatar.
- Item 3 ✅ on the canvas: the card row (ten frames) and the home row (loading, seven chips scrolled, an empty
  category, the end of the first page with "Onyesha zaidi", and desktop at 1280 in three columns).
  - The empty-category words are drafts, noted on the canvas.
- Item 4 ✅ on the canvas (row "4 · The bet sheet in every state", 19 frames). They are:
  - guest;
  - below the minimum and above the maximum;
  - the estimate updated;
  - legacy fee, one-sided refund, already holding, thin upside (≈1.0×);
  - placing, and the receipt;
  - closed while open;
  - the five blocking refusals, and the four inline ones;
  - the keyboard open at 360×640;
  - desktop, as a centred dialog.
  Every figure comes from the payout formula on a stated pool.
  - **Design calls** (on the canvas):
    - Bounds use the first sentence of today's refusal, in the neutral family.
    - An invalid stake shows "TZS —", and the button reads "Weka dau" with no amount.
    - Blocking or inline follows `REASONS[].channel`.
    - With the keyboard up, the estimate collapses to the compact row and the chips step aside.
    - The bonus-wager warning is not drawn, because the bonus wallet is withdrawn.
  - **Finding for S12 (words and i18n):** every date formatter in `lib/utils.ts` hard-codes `en-GB` and takes no
    locale (`formatDeadline`, `formatDayTime`, `formatDateTime`, `formatDayShort`). Swahili and Chinese players
    read English months: "8 Oct" and "11 May" where Swahili says "8 Okt" and "11 Mei". The frames show the Swahili.
    Fixing it means threading a locale through every caller, and `test:timer-date` must hold. That is its own lane.
- Item 5 ✅ on the canvas (row "5 · Balance too low", six frames, each a branch of `shortfallPlan`).
  - Deposit only: balance 0; and short by less than TZS 500, where the deposit is 500 with a note (draft).
  - "Bet instead" only: the deposit limit is reached; and every deposit rail is paused.
  - No option: source of funds is needed.
  - Waiting: a deposit is already pending.
  - The two-option state is the redraw in row 2. A held wallet shows item 4's frozen refusal, because the plan blocks
    it before any offer.
  - With one option the eyebrow is dropped. When no deposit is offered, the reason is today's refusal sentence, shown
    before the player tries.
- Item 6 ✅ on the canvas (row "6 · Deposit", 19 frames). They are:
  - the email-code step: sent, wrong, expired, too many tries, a new code sent, no email on file;
  - no history (nothing preselected; "Lipa" disabled), one wallet paused, an amount typed below the shortfall, and
    the payout-delayed notice;
  - the new waiting page: fresh, slow, long, paid, failed, held for return;
  - the return: the question closed meanwhile, and the stake clamped;
  - desktop at 1280.
  - **Design calls:**
    - A wrong code is a form error in danger ink (the S2 ruling); everything else is neutral.
    - The payout notice takes the neutral family on the journey screen, because the brief forbids gold and danger
      for app state.
    - The stake clamp uses the loss headroom; a TZS 1,000,000 cap would make the example trivially thin.
  - "Held" means the payment landed after a break began: it is held in RG suspense until the team returns it
    (`wallet-service`), and the drafted words say exactly that.
  - Every draft is listed on the canvas.
- Item 7 ✅ (row "7 · How to Play", four frames): English, Chinese, 320×640, and desktop.
  - Measured sheet heights at 390: Swahili 641, Chinese 636, English 620. Swahili is the longest, as §A5 predicts.
  - At 320×640 the sheet is capped at the viewport minus 48 px. The steps and MFANO scroll under a fade, while
    "Nimeelewa, anza" and the limits and helpline line stay pinned, so the exit is always reachable.
- Item 8 ✅ (row "8 · Akaunti", three frames): signed in, guest, and the staff row.
  - SJ-17's items appear in its order, grouped into cards without headings. Every label is an existing key; the only
    new word is the plan's "Toa pesa".
  - The unread count shows on Arifa and as a dot on the Akaunti tab.
- Items 9–11 ✅:
  - Tiketi zangu: open (with the Maswali | Juu/Chini switch), settled, empty, and the guest sheet.
  - The market page, in §3.2's order, with the holder's ticket block above the two big buttons.
  - The Juu/Chini stake panel and its low-balance state, in the sheet's language.
  - **Calls:**
    - Open tickets show no payout figure (SJ-4 keeps §C3), and every timer names its absolute instant.
    - Juu/Chini keeps its own side buttons and floor-rounded × multiples; only the chips (full figures) and the
      low-balance pattern change.
    - "Tumia TZS 2,000 badala yake" (draft) sets the stake, because a Juu/Chini bet needs a side.
    - The market chart title is spelt NDIO; the dictionary still says NDIYO, one of SJ-19's seven fixes.
- **All eleven brief items are on the canvas: 91 frames.**
- BRIEF.md filed (`fe4e2b2c`); the panel ran next (below).

**The four-expert panel (2026-10-01).** Four independent reviewers read all 90 rendered tiles plus the frame
sources against `DESIGN_AUTHORITY.md`, the kit components, the rulings and the code:

| Expert | Score | Findings |
|---|---|---|
| Design-system fidelity (D) | 6.5 / 10 | D1–D20 |
| Deck fidelity and flow logic (F) | 6.5 / 10 | F1–F20 |
| Words: Swahili, terms, money truth (C) | 6 / 10 | C1–C25 |
| Accessibility, RG and consumer protection (A) | 5 / 10 | A1–A20 |

Every finding was checked against the code before acting; all hold. **All of them are applied: canvas version 16,
102 boards (11 new), every frame re-rendered and read tile by tile, nothing overflows.** The outcome, including the
defects the verification itself caught, is in BRIEF.md. What the revision changes, beyond fixing wrong figures and
words:
- **Rulings amended under Ali's delegation (all toward honesty or player protection):**
  - **SJ-1, the card over the 100× cap:** no number on the card ("Upande mdogo, ona makadirio"); a thin side reads
    "Faida ndogo · ≈1.0×". The zero-stake multiple over-promised (A7: 1,000 vs 150,000 shows >100×; a 10,000 stake
    gets ≈12.9×).
  - **SJ-11, "Weka dau la TZS 2,000 badala yake":** keeps the deck's words and one tap, and gains a second line with
    the estimate for the amount it places (A1: the only figure on screen was for 5,000).
  - **§3.5, the loss-limit return:** inform, don't pre-fill. The stake stays as typed, in the attention state; the
    line says what the limit allows; the chips above the room hide; the button is disabled (A3: pre-filling to the
    room nudges a player to use up their limit). Design call "the stake clamp uses the loss headroom" is withdrawn.
  - **SJ-17, Akaunti:** a Pumzika / Jizuie row, and the limits card above invite/rewards (A17).
  - **Plan §2 "Low-balance warning":** `Callout tone="info"`, not `neutral` (the kit's neutral is the dashed
    empty-state box, D5). The payout notice takes the same info family.
- **Choice 1 settled by the law:** 1A (gold step discs) is a decorative element in gold, which `DESIGN_AUTHORITY.md`
  §M3 names a violation (D1). My pick moves to **1B**; 1A stays on the switch only for Ali to overrule.
- **Pinned "now":** every frame dates from the deck's own day, 29 Sep 2026 11:19 EAT ("Siku 11" to 10 Okt). The
  first pass mixed 29 Sep and 1 Okt (F8).
- **Partly accepted:** A4 asked to drop gold from the deposit row; §M3a puts the deposit door in `gilt-metal`, so the
  gold stays and only its glow goes, and both option rows are the same height. C19's "Sindano" is the product name of
  The Needle and stays.
- **New frames:** sheet — loss room, empty side, empty pool, over the cap, hedge, unknown balance; return still short;
  waiting past 30 minutes; Juu/Chini round closed while paying; home on a break; the focus states.
- **Existing words found wrong** (e.g. "Lipo" for Payout, which reads "it is there"; "HALIJAONDOKA"; "pesa yote";
  "dau haziwezi"): the canvas shows the corrected words, and the dictionary changes ship after the native review,
  listed in `S4-COPY-AUDIT.md`.
- The copy researched for every state is filed in
  [`S4-COPY-AUDIT.md`](design-system/v5-2026-09-29-simplified-journey/S4-COPY-AUDIT.md), a dated snapshot;
  `i18n-dict.ts` stays the truth. Items marked "NO STRING" there need drafts (R8).

**Verified:** each redraw was rendered locally at 390 × 844 in Chromium and read one screen at a time. Result: no
overflow, all three fonts loaded, the logos loaded, and the B option of each choice rendered. Ali's standing rule
requires this, even though the Design type's own instructions discourage rendering.

**Still open:**
- ✅ Closed 2026-10-01 on Ali's "proceed": choices 2A and 3A adopted (my picks), 1B by §M3 — §0h point 1 lets him
  overrule any of them on the canvas switches. The panel's amendments travel into S6–S11.
- A native Swahili review signs off the drafts and the existing-word corrections.
- ⛔ No player-facing UI code is written before the revision is filed.

## §0f · S3b (2026-10-01) — the measures baseline, LIVE on main since `64a63b7c`

The §3.10 counters, counting the OLD journey's analogues from now so the 14-day baseline exists before the flip. The
design follows the visit counter (`/api/pv` + `lib/server/site-visits.ts`, an inline memory/Prisma twin) exactly.

**The steps, and where each is counted.** The new journey writes the same steps from S7/S8 with `variant = new`.

| Step | Counted where | `origin` today (old journey) |
|---|---|---|
| home views | the existing visit counter (`SiteVisitPage`, path `/`) — no new counter | — |
| `sheet_open` | client beacon, once, when `SidePicker` reveals the dial | `home` (home links carry `from=home`), `board` (any other `?side=` link), `market` (a tap on the page) |
| `low_balance` | client beacon, once per dial, when the insufficient-balance state first shows | `dial`, `updown` |
| `bet` | server: `buyPositionAction` after `r.ok && !r.data.replayed`, fire-and-forget, never inside a lock | `dial`, `quick` (Up & Down) |
| `deposit_confirmed` | server: `settleDepositConfirmed`'s post-lock block (`outcome.credited`) | the deposit row's `origin`: `low_balance` (the Up & Down insufficient link carries `from=low-balance`), else `direct` |
| deposit → bet ≤ 30 min; time to first bet | computed at report time from rows (`completedAt`, `placedAt`, `createdAt`), players only, `houseBotId IS NULL` | — |

**Dimensions.** `variant` = `old`/`new` from `resolveSimpleJourney()` at count time. `utm_source`/`utm_campaign` =
the visit's first touch, kept in sessionStorage (`kp-utm`, the same safe shapes as `attributionFrom`), sent with client
beacons and as hidden fields of the bet form; a deposit confirmed by webhook has no browser, so it counts with no tag.

**Excluded.** Staff (the session role on server steps; the client beacon mounts only for a non-staff, non-preview
viewer, decided by the server layout), preview traffic, automation user agents (`isAutomatedAgent`), house-bot stakes
(they never pass the action), admin test deposits.

**Schema.** `JourneyFunnelDay { id cuid, day, step, origin, variant, utmSource, utmCampaign (all default ""), count;
@@unique over every dimension; @@index([day]) }`. `Transaction.origin String?` and `Position.origin String?`
(create-only). Hand-written additive migrations; the two `ALTER TABLE`s on the money tables use S2's lock-retry block.

**Retention and privacy.** 400 days, pruned beside the visit counts (`retention.ts`). Privacy v2026-10-01: §2 the funnel
totals with campaign tags, §5 their 400 days, §7 the `kp-utm` session key — one version bump, in the commit that ships
them. **Report:** a "Journey funnel" panel on `/admin/insights` (the four ratios + time to first bet, by date range).

**Pieces** — A: the store, schema, migration, retention, `test:journey-funnel` — ✅ (`lib/journey/funnel.ts` the one
allow-list; `lib/server/journey-funnel.ts` the memory/Prisma twin; `JourneyFunnelDay` + migration
`20261001120000_journey_funnel`; pruned by `retention.purge.daily`; red 10/10). B: `POST /api/funnel` + the beacon + the
old-journey client wiring — ✅ (`/api/funnel` = `/api/pv`'s rules, 204 always, no cookie; `lib/journey/funnel-beacon.ts`
sends only under the shell's server-rendered `data-kp-funnel` scope; `FunnelUtm` keeps the first-touch tags;
`sheet_open` from `SidePicker`, `low_balance` from the dial and the Up & Down quick-bet hook, the bet forms carry
`funnelOrigin`; the Up & Down deposit links carry `from=low-balance`, the home side links `from=home`; the suite drives
the real POST handler; red 16/16). C: the server counters + the `origin` column — ✅ (`countBetFunnel` in `buyPositionAction` after `r.ok && !replayed`;
`countDepositFunnel` in `settleDepositConfirmed`'s post-lock block by dynamic import; `Transaction.origin` —
"low_balance" or NULL, create-only in both twins, migration `20261001120100_transaction_origin` under the lock-retry
block; the deposit page/action carry `from=low-balance` → `origin`; the suite drives the REAL `deposit()`; red 22/22).
⚠️ Decision: `Position.origin` is DEFERRED to S8 — no S3b measure reads it (the bet counter records the origin at bet
time; "deposit → bet ≤ 30 min" is computed from row times), so S3b touches one money table, not two. D: Privacy v2026-10-01 — ✅ (en/sw/zh §2 "Journey counts", §5 400 days, §7 the tab key `kp-utm`; COMPLIANCE-DECISIONS
"Privacy v2026-10-01"; DATA-RETENTION row; `test:privacy-notice` §4h ties each clause to the schema, the beacon and the
key, with planted controls; the version pin and the English hash moved in the same commit). E: the insights
panel — ✅ ("Journey funnel" card on `/admin/insights`, its own read (`lib/server/journey-funnel-report.ts`): the three
counted measures per journey over 7/14/28 days and a campaign filter, deposit → bet ≤ 30 min and the median time to a
first bet from the rows; a pair whose counters disagree is held at 100% and marked (`lib/journey/funnel-measures.ts`);
behind the page's own access check; the kit `admin-tbl`; red 26/26). F: battery, drive, merge, deploy, and the first day's counts read on production — battery ✅ (green but for the reds
that pre-date S3b: type-scale, red-anchors ×2, and `test:house-bot-disclosure` 5.1 by construction on a branch that
changes published words); live drive ✅ 15/15 on a dev server with a real browser (a normal user agent, as the beacon
skips automation): a player's home-page tap counted as `sheet_open/home`, a board link as `sheet_open/board`, the TZS 0
dial as `low_balance/dial` twice, a real deposit from `?from=low-balance` confirmed and counted as
`deposit_confirmed/low_balance`, an admin scoped out; the panel read back "1 of 0", "0 of 2", "50% · 1 of 2" and was
read as tiles at 1280 and 390 (the phone layout stacks one block per measure — a table squeezed the words). Found and
fixed by the drive: SWC dropped the space before "(East Africa days)" (made explicit); a guest has no dial in the old
journey (the market page asks them to sign in), so "sheet" steps come from signed-in players.

**On production (2026-10-01, `?dpl=64a63b7c`, read-only):** both migrations finished (22:47:02 UTC), none unfinished;
`Transaction.origin` is nullable `text`; `JourneyFunnelDay` has exactly the pinned columns; `POST /api/funnel` answers
204 (a curl probe is automation and correctly not counted). No totals yet at deploy time (≈ 01:50 EAT) — the first
day's counts are read with `qa:journey-funnel` (`railway run -s 50pick -- node scripts/qa-journey-funnel.cjs` from a
Railway-linked tree).
- **First read (2026-10-01 01:31 UTC = 04:31 EAT, 2 h 44 min after the deploy, read-only):** totals 0, deposits with
  an origin 0. That is correct, not a fault: since the deploy there were 0 non-bot positions and no deposits; all 37
  `BET_PLACED` (and 36 `BET_REFUND`) rows carry a `houseBotId`, which the counter excludes by design. Re-read after a
  full EAT day of player traffic; S3b turns ✅ when counts appear daily. (From `C:\kipindi-main`, which is
  Railway-linked: `railway run --service 50pick -- node C:/kipindi-journey/scripts/qa-journey-funnel.cjs`.)
- **Second read (2026-10-03, two full EAT days, read-only) — S3b ✅.** Every day has its rows, all `variant = old`
  (nobody is in the new journey): 2026-10-01 — bet 81 (quick 76, dial 5), low_balance 3 (updown 2, dial 1),
  sheet_open 10 (board 5, market 4, home 1); 2026-10-02 — bet 82 (quick 80, dial 2), low_balance 16 (updown 9, dial 7),
  sheet_open 11 (board 8, market 2, home 1). `deposit_confirmed` is 0 on both days, and that is the truth, not a gap:
  checked against `Transaction`, no player deposit was confirmed on either day (the last three were on 2026-09-30,
  before the deploy; one failed). The deposit step is proven end to end in the local drive above and counts the next
  real deposit (the production store's `user.findById` is the one the counter calls, type-checked against it). The
  14-day baseline runs to 2026-10-15 at the earliest.

## §0e · S3 as built (2026-10-01) — ✅ merged to main

S3 is §3.1 in full, built as five pieces, each with its suite and an in-process red twin (all in `predeploy`). Verified
before the merge: the S3 battery (49 suites) green but for the reds that pre-date it (type-scale 749/239, red-anchors
×2) and `test:house-bot-disclosure` 5.1, red on any branch that changes the dictionary by construction; and a live
drive on a dev server — the route over real HTTP (public 200 `s-maxage=5`; `?me=1` 401 signed out, 200 `private,
no-store` signed in; 404 for a missing or junk id; 405 for POST), `/wallet/deposit` showing the shared ladder (1K–100K)
and `/auth/login` rendering, no page errors, the tiles read.

**Verified on production (2026-10-01, `?dpl=1c3d2359`).** Read-only GETs of `/api/markets/<id>/sheet`: a LIVE market
answers 200 `public, s-maxage=5, stale-while-revalidate=5`; `?me=1` signed out is 401; an unknown id is 404. Across the
ids on `/markets`: 10 loser-share markets priced or in an empty-side state, 2 legacy capped-commission markets `hidden`
(no figure, as SJ-3 rules), and the Up & Down rounds and settled markets 404, as they must. One priced read checked by
hand: YES 20,000 / NO 2,000 at 13% reads ≈1.1× / ≈9.7×, YES "thin" under that market's frozen `thinProfitRatio` 1.1.

| # | Piece | State | Where |
|---|---|---|---|
| 1 | The estimate — `src/lib/markets/estimate.ts` (+ `loserShareRate`/`loserSharePct` in `payout.ts`) | ✅ `5070d1a7` | `test:journey-estimate` (predeploy) + red 14/14 |
| 2 | The card's close label — `src/lib/markets/card-close-label.ts` + `cardClosesToday`/`cardDaysLeft`/`cardDaysLeftOne` en/sw/zh | ✅ | `test:card-close-label` (predeploy) + red 7/7 |
| 3 | The shortfall plan — `src/lib/journey/shortfall.ts` (+ `depositCeilingFor`, `lossHeadroomFor`, `DEPOSIT_QUICK_AMOUNTS`) | ✅ | `test:shortfall` + red 12/12; `test:deposit-ceiling` (the REAL `deposit()` / `checkLossLimit`) + red 9/9 |
| 4 | The pending bet — `src/lib/journey/pending-bet.ts` + `src/lib/safe-next.ts` (login's `sanitizeNext` moved there) | ✅ | `test:pending-bet` (predeploy) + red 10/10 |
| 5 | The sheet API — `GET /api/markets/[id]/sheet` (reads in `lib/server/journey-sheet.ts`; rate rule `sheet.ip`) | ✅ | `test:journey-sheet` (predeploy) + red 12/12 |

**Decisions taken in S3 (delegated):**
- `estimate.ts` imports `payout.ts` (itself import-free) rather than being import-free as §3.1 says: the sheet's figure
  must BE `payoutFor`'s, not a second formula (the `updown-pricing.ts` precedent). It stays client-safe and is pinned.
- The card's half-up is EXACT (BigInt over the rate in parts per million): at YES 3 / NO 65 and 13% the multiple is
  19.85, which the natural float formula rounds to 19.8. `test:journey-estimate` §c holds the tie.
- State precedence: closed → emptyPool → oneSidedRefund → fillsEmptySide → hidden → invalidStake → priced. The empty
  side is a FACT and shows even with the display switch off; the sheet prints a figure for a side it fills.
- A round's pending bet is `udr_<id>.UP|DOWN.<stake>` (Up & Down round ids are `udr_…`; §3.1's "round_x" was a
  placeholder). The stake is 1–9 digits, no leading zero; `?bet=` wins over the legacy `?side=`.
- Only login's copy of the same-origin rule moved to `safe-next.ts`. Twelve more copies of the same regex live in
  the auth pages, register, 2FA, OTP, session-ended, the preview route and the app shell, with deliberate small
  differences (some also refuse `/auth`, `/auth?`); folding them in changes auth behaviour and needs its own drive —
  a follow-up, not S3.
- The shortfall plan follows the REAL code where §3.1 and the code differ, and says so in its header:
  - a wallet that is not ACTIVE is `blocked` with no "bet instead" (the bet path refuses such a wallet, so the offer
    could only fail); the paused-deposit notice + "bet instead" is kept for the case where every deposit rail is paused;
  - "a deposit already pending" is a plan rule only (`deposit()` does not refuse a second one) — the plan waits on it;
  - the loss limit is the ONLY loss window the code has (`dailyLossLimit`, rolling 24 h);
  - chips above the ceiling are DROPPED, never clamped to the ceiling's value (no nudge to deposit up to a limit);
  - the SoF thresholds are inputs: they stay declared in `wallet-service.ts`, where `test:cert-d3` requires them.
- `/wallet/deposit` now reads its quick amounts from `DEPOSIT_QUICK_AMOUNTS` (the same values), so the ladder is one list.
- The sheet API is ONE route with two halves: the public half is shared-cacheable (`s-maxage=5`); `?me=1` adds the
  viewer's own (spendable, held sides, the bonus warning) as `private, no-store`, 401 without a session.

## §0d · S2 as built (2026-09-30) — LIVE on main since `473807b1`

**Where it is.** On main (merged 2026-09-30 as `473807b1`); `simple-journey` stays the lane's branch for S3 onward.

**What exists**
- The rules — `src/lib/markets/short-title.ts` (the ONE budget `SHORT_TITLE_MAX` en/sw 56, zh 28 code points; the forms
  "Je, …?" / "?" / "？"; GSM-7 for sw/en via the new `foldToGsm7` in `sms-compose.ts`; `cardTitle` falls back to the
  reader's OWN full title), `competitions.ts` (14 keys, Ligi Kuu first) + `competition-label.ts` (labels in
  `journey.comp*`, en/sw/zh).
- The columns — `PredictionMarket` and `AIPoll` each gained `shortTitleEn/Sw/Zh` + `competition` (nullable), by two
  hand-written additive migrations `20260930200000_market_short_titles` and `20260930200100_ai_poll_short_titles`,
  PROVEN on Postgres 18.3 (`verify:backup-schema` 13/0, 88 migrations applied).
- Both stores — `toStoredMarket` reads them, both upsert arms write them, and a narrow `setShortTitles` exists in BOTH
  twins (never `stamp`, never the full-row `set`). `createMarket` normalises them (Up & Down gets none).
- The one write after creation — `src/lib/server/short-title-service.ts` `applyShortTitles` (under the market lock,
  audited before/after): used by the admin edit ("Card short titles" on `/admin/markets/[id]`) and by approving a draft.
- The wizard (`/admin/markets/new`) takes optional short titles + competition; the AI poll generator drafts them (a
  failing language is null + a warning chip, never a filter reason) and publishing carries them to the market.
- The backfill — `src/lib/server/short-title-backfill.ts`: drafts for open markets (kill switch, budget, batch clamp,
  metered), staged in `SystemConfig` `shortTitle.draft.<id>`, reviewed on `/admin/ai-polls?tab=short-titles`
  (Approve / Edit, then approve / Reject). The sentinel's `checkShortTitleAgreement` checks each draft; "not checked"
  never reads as agreement; nothing reaches a market without an officer's approval.

**What passed (2026-09-30)** — `tsc` 0; `test:short-title-fit`, `test:short-title-edit`, `test:short-title-ai` and their
in-process red twins; `test:dal-parity` (+ `red:dal-parity`), `test:campaign-compose` (+ red), `test:chain-purge`
(+ red), `test:i18n`, `test:admin-*`, `test:ai-*`, `test:unsaved-changes`, `test:popup-fit` and ~40 more; the drive
`qa:short-titles` 14/15 in a real browser (the one miss was the drive's own label, since fixed). Red on main
BEFORE S2 and unchanged by it: recategorise (check 5, so `red:recategorise` cannot run), type-scale, tap-target,
decomment, red-anchors ×2.

**Verified since (2026-09-30, late)** — the review's fixes are in (`2536e4a0`, `20d77b45`, `1cfd9567` on the branch):
`tsc` 0; `test:short-title-fit` + red 17/17, `test:short-title-edit` + red, `test:short-title-ai` 167/0 + red 44/44,
`red:dal-parity`, `red:campaign-compose`, `red:chain-purge` and `red:recategorise` 9/9 (the recategorise lock fix is
proven; its check 5, red on main since the /results archive refactor, now follows `lib/results/archive.ts`); the
browser drive `qa:short-titles` 23/23 with every state read as a viewport tile at 1280 and 390; the Postgres 18.3 proof
of both migrations. The migrations now RETRY their lock wait inside the SQL, so a busy table can never leave a failed
boot row. Red on main before S2 and unchanged by it: type-scale, tap-target, decomment, red-anchors x2.

**The design pass (2026-09-30, night)** — three independent design critics (layout, type, kit) read every tile of the
drive, a second reader kept 54 of their 56 findings, and all 54 are applied (`a994b694`, `bfdb4f04` + the placeholder
fix on the branch). Verified after it: `tsc` 0; the full battery green except the reds that pre-date S2 (type-scale
749/239, tap-target, decomment 23/20, red-anchors — the same counts as main); `red:short-title-edit` 52/52; the
browser drive `qa:short-titles` 28/28 with every tile read at 1280 and 390:
- ONE WORDING. The rule sentences live beside the rules, client-safe, in `lib/markets/short-title.ts`
  (`shortTitleIssueSentence`, `SHORT_TITLE_LABEL`, the rule note `SHORT_TITLE_RULE_TITLE`/`_BODY`, `SHORT_TITLE_SW_FORM`
  with a NO-BREAK space so "Je, …?" never breaks across two lines, `shortTitleAuditMissed`). The server's refusals, the
  market page, the drafts tab and the wizard all print them; the wizard has no wording of its own.
- ONE COUNTER, ONE ERROR STATE. `n / max` in the number face, red over budget, and the kit's `error` prop (red box +
  `aria-invalid`) on all three surfaces — the drafts form's `aria-invalid` was being discarded by the Input atom.
- ONE ERROR INK. Form errors are `text-danger-fg`, never the betting NO pair — the wizard (its criterion lines too)
  and the AI poll form; guarded by `test:betting-ink` §6.
- The market page: an info rule note (it explains; amber is kept for what needs a second look), a real heading, "e.g."
  placeholders, a number-drift warning UNDER its field (cleared by typing), the sentinel's reason said ONCE, a warning
  toast when there is something to read, "Save card wording" (it saves the competition too) on its own row, and a rule
  under the control so the price bar belongs to the market again.
- The drafts tab: "Edit, then approve" REPLACES the read-only blocks (each language once), with the market page's fields;
  primary-first action rows; the reject reason says its minimum; an edited language says "not checked yet — the
  sentinel reads your words when you approve" (true in every case, unlike "edited after the check").

**Merged and LIVE (2026-09-30)** — `simple-journey` fast-forwarded main to `473807b1`; production served it within
four minutes (`?dpl=473807b1`). Read-only proofs on production: `_prisma_migrations` shows
`20260930200000_market_short_titles` and `20260930200100_ai_poll_short_titles` finished (20:52:09 UTC), no migration
unfinished, and the eight columns exist as nullable `text`; `qa:short-title-fit` read 62 open long-form markets — 0
stored values break the rules, and all 62 still fall back to the full title in every language (the backfill's work).
⚠️ NOT driven on production: the admin pages themselves. Every staff QA login except Ali's own was deleted by the
2026-09-11 reset, and signing in as Ali would sign him out of the console everywhere; they were driven in a real
browser locally (`qa:short-titles` 28/28) on the same commit.

**Left to do (S2 close-out)** — an officer presses "Draft short titles for open markets" on
`/admin/ai-polls?tab=short-titles` (one run drafts up to 25; the sentinel checks each draft in production) and approves
or corrects each one. When every open market has short titles within budget (`qa:short-title-fit` reports 0 fallbacks),
S2 is ✅. S2 changes NOTHING players see — the journey card (S7) is where short titles appear.

## §0c · S2 research (read-only, 2026-09-30): what short titles + competition must touch

**Where things really are** (the plan's names were wrong in places)
- The model is `PredictionMarket` (`schema.prisma:1612`), not `Market`; there is no `@@map`. `StoredMarket` is in
  `market-service.ts:207`; both store twins are in `market-dal.ts` (memory `memoryMarkets`, Prisma `toStoredMarket`
  + the two-arm upsert in `prismaMarkets.set`). `createMarket` (`market-service.ts:640`) is the one funnel.
- The 5 create paths: the wizard (`markets/actions.ts` `createMarketAction`), AI polls (`ai-poll-publish.ts:143`),
  candidates (`admin/candidates/actions.ts:71`), proposals (`proposals-service.ts:729`), Up & Down rounds
  (`updown-service.ts:755`). Seeds and dev routes also call it, so every new input field is OPTIONAL.
- Latest migration on main: `20260928170000_marketing_contact_book`. Copy the header style of
  `20260811120000_market_resolution_criterion_i18n`. Re-check `origin/main` right before committing.

**Traps that would ship a defect**
- A column must be read by `toStoredMarket` AND written in BOTH upsert arms, one key per line (dal-parity's matchers
  are line-anchored); a column in one arm only is wiped by the next resolve, settle, reopen or void.
- Never copy recategorise's write (unlocked get, then a full-row `set`): it can overwrite a concurrent stake's pool
  increment on a LIVE market. Use a narrow `setShortTitles` method in BOTH twins, under `withLock(market:<id>)`.
  `stamp()` refuses title fields on Postgres but not in memory — green in every suite, a throw in production.
- A short title stays NULL until approved; never a copy of the full or English title (the F8 rule). The fallback is
  the reader's OWN full title — `pickLocalized` falls back to English, so it is the wrong helper here.
- "Fits in 2 lines" cannot be measured on `.mcardp-q`: its clamp and `min-height` make every box exactly 2 lines.
  `test:short-title-fit` is a PURE budget check (code points: sw/en ≤ 56, zh ≤ 28; GSM-7 for sw/en only, via
  `sms-compose.ts`), and production's open markets get a separate read-only `qa:` read.
- A short-title problem must never become an AI `FilterReason` (`approveAIPoll` refuses any): store null plus a
  warning. `publishApprovedPoll` hand-copies fields, so new ones must be added there or they are dropped.
- `test:red-anchors` sits exactly at 65 undeclared: S2's red twins are in-process or declared. dal-parity §17–§19
  belong to marketing; extend §10/§11 in place. Never `prisma migrate diff` (it drops the trigram indexes).
- S2 changes nothing players see: the classic cards keep full titles; short titles surface on the journey card (S7).

**Recommended build order** — (1) `src/lib/markets/competitions.ts` (zero imports) + `short-title.ts` (the one
limits constant, the normaliser) + a `foldToGsm7` in `sms-compose.ts`; (2) schema + hand-written migration
(`SET LOCAL lock_timeout = '3s'`, four `ADD COLUMN IF NOT EXISTS`, plus AIPoll/MarketCandidate columns) + DAL +
dal-parity + chain-purge redaction; (3) the narrow writer + an audited admin edit (`market.short_title_edited`,
before/after, 2-line warning) + the 5 create paths; (4) AI: extend the Tier-2 `submit_poll` tool, a mock-safe
`draftShortTitles` for the backfill, and a separate budgeted sentinel `checkShortTitleAgreement` (never
auto-approves); drafts staged per market in `SystemConfig` (`shortTitle.draft.<id>`), approved one by one;
(5) `test:short-title-fit` + an in-process red twin + the production read.

**Decided under delegation unless Ali says otherwise** — English short titles are a question ending in "?"; Chinese
ones end in "？" (only the Swahili "Je, …?" is in the deck). Up & Down rounds get a deterministic short title from
`roundTitle` and stay out of the AI backfill. Competition labels live in the `journey` namespace until S15, with an
`IDENTICAL_OK` reason for proper nouns such as "EPL".

## §1 · Board

Status: ⬜ not started · 🔨 in progress · ✅ done and verified live · ⛔ removed by ruling.

| Session | Title | Status | Done when |
|---|---|---|---|
| S0 | File, rule, get ready | ✅ | Filed `2ac17c36` on main, 2026-09-29. Deck, frames, rulings, reply, tracker, SHELVED.md and compliance records are filed. `test:docs` + `test:landing-ten-plan` are green. The worktree installs. |
| S1 | The switch and preview | 🔨 | Built and verified locally 2026-09-30 (§0b). Done when staff see a "preview" marker on production and nobody else sees anything. The preview cookie is in Privacy §7 in the same commit. |
| S2 | Short titles + competition | 🔨 | LIVE `473807b1` 2026-09-30 (§0d); the backfill waits on an officer's approval. Done when every open market renders within 2 lines in sw/en/zh (`test:short-title-fit`) and the backfill is approved in /admin. |
| S3 | The engine (no UI) | ✅ | `6e7ee63b` 2026-10-01 (§0e). Golden fixtures pass: Dodoma ≈2.8×/≈1.4×, 1,000 → TZS 2,700 ≈2.7×, 5,000 → TZS 12,360 ≈2.5×; Yanga ≈2.9×/≈1.4×. Client/server parity is proven. |
| S3b | Measures baseline | ✅ | LIVE `64a63b7c` 2026-10-01 (§0f); counts appear daily (second read 2026-10-03: both full days, every client and bet step; no deposit was confirmed on either day, checked) and the 14-day baseline runs to 2026-10-15. |
| S4 | Claude Design pass | ✅ | `52afb7c8` 2026-10-01 (§0g): all eleven brief items on the Design canvas, 102 boards; the four-expert panel's findings applied (v16); BRIEF.md filed; choices 1B/2A/3A (§0h point 1). Done when frames for every new composition and undrawn state are filed and scored by the panel, and Ali has reviewed the 5 re-drawn frames. |
| S5 | ~~Colour foundation~~ | ⛔ | Removed by R5 (50pick's look stays unchanged): no palette, font or brand work. |
| S6 | Shell (flagged) | 🔨 | Plan filed 2026-10-01 (`S6-PLAN.md`, §0i). Done when every route keeps an entrance (route census). The header fits at 320/360/390/1024/1150/1279 × sw/en/zh × guest/signed-in. |
| S7 | Home and cards (flagged) | ⬜ | Staff see the deck's home on production. `test:journey-above-fold` is green. |
| S8 | Bet sheet + low balance (flagged) | ⬜ | `test:bet-sheet`, V20 and the refusal matrix are green. A staff real bet works on production. |
| S9 | Deposit, email code, waiting and return (flagged) | ⬜ | `test:deposit-return`, `test:deposit-status-read` (exactly-once while racing the webhook) and `test:email-code` are green. The card `order_id` fix is live. |
| S10 | Visitor path | ⬜ | guest → sheet → register → deposit → back works. `test:post-register-landing` passes in both flag states. |
| S11 | How to Play complete + copy ready for the flip | ⬜ | Auto-open rules are proven. FAQ, chat intents, Rules, Terms and tagline are ready for the flip. |
| S12 | Consistency sweep | ⬜ | Juu/Chini uses the journey language, admin ink is fixed, short titles are used outside the site, NDIO is swept. |
| S13 | Measures panel and reporting | ⬜ | The panel shows before vs after. The CSV/PDF export and its definitions are sent to the agency. |
| S14 | Proof before the flip | ⬜ | `e2e:journey` is green. The identity checklist is ticked. A real TZS 1,000 journey works on production. The agency has signed off. |
| S15 | Launch | ⬜ | The flip commit is live and re-measured as a real player. Rollback triggers are watched. |
| S16 | Shelve (≥7 days after launch) | ⬜ | Old branches are unmounted and every SHELVED.md row is green under `test:shelved`. |

## §2 · What players see before the flip

Everything else ships behind `simpleJourneyFor` and changes nothing for players until S15. These are the only
player-visible changes before the flip, and each ships early on purpose:

| Change | Session | Why it ships early |
|---|---|---|
| Card deposit return URL carries `order_id` | S9 | A live money defect (MONEY-GATE §3.2). Today a charged card payer can land on "payment not found". |
| The classic deposit page's phone field becomes the kit `PhoneInput` (accepts 07…, 7…, 255…, +255…) | S9 | Today `maxLength=9` cuts "0712…" to "071234567" and the server refuses it. |
| "NDIYO" → "NDIO" in the 7 Swahili strings that still misspell it | S12 | A spelling defect; the side word is "NDIO" everywhere else. |
| Privacy notice: the staff preview cookie, and later the funnel totals | S1, S3b | The notice must name every cookie and stored total when it ships. |
| Admin Approve/Reject buttons move from `btn-no` to `btn-danger` | S12 | Admin only; NO ink is for betting sides (§B2a). |

## §3 · Wording table: every deck string

Rules for this table:
- **sw** is deck-verbatim and binding for these keys.
- **en** uses the deck's own English where the slides give it.
- **zh** is drafted: formal 您, 充值 for deposit, `break-keep`.
- Numbers, amounts and rates are always placeholders. `{amount}` renders as a nowrap money span.
- Side words come from `sideWord()`.
- New keys live in a `journey` namespace until the S15 convergence.

| Key | sw (binding) | en | zh (draft) |
|---|---|---|---|
| `journey.balanceCaption` | Salio | Balance | 余额 |
| `journey.depositAction` | Weka pesa | Deposit | 充值 |
| `journey.howToCardTitle` | Jinsi ya kucheza | How to play | 玩法说明 |
| `journey.howToCardMeta` | Hatua {steps} · dakika {minutes} | {steps} steps · {minutes} min | {steps} 步 · {minutes} 分钟 |
| `journey.headlineAsk` | Jibu swali. | Answer the question. | 回答问题。 |
| `journey.headlineSides` | {yes} au {no}. | {yes} or {no}. | {yes}还是{no}。 |
| `journey.cardClosesToday` | Inafungwa leo | Closes today | 今天截止 |
| `journey.cardDaysLeft` | Siku {n} | {n} days (n = 1: "1 day") | {n} 天 |
| `journey.cardWin` | Shinda ≈{mult}× dau | Win ≈{mult}× your bet | 赢 ≈{mult}× 投注 |
| `journey.cardWinOver` | Shinda zaidi ya {cap}× dau | Win over {cap}× your bet | 赢超过 {cap}× 投注 |
| `journey.tabQuestions` | Maswali | Questions | 问题 |
| `journey.tabTickets` | Tiketi zangu | My tickets | 我的注单 |
| `journey.tabAccount` | Akaunti | Account | 账户 |
| `journey.showMore` | Onyesha zaidi | Show more | 显示更多 |
| `journey.sheetChosen` | Umechagua {side} | You picked {side} | 您选择了{side} |
| `journey.stakeLabel` | Dau lako | Your bet | 您的投注 |
| `journey.estimateLead` | Ukishinda, unapata takriban | If you win, you get about | 若您赢，约可获得 |
| `journey.estimatePill` | ≈{mult}× dau lako | ≈{mult}× your bet | ≈{mult}× 您的投注 |
| `journey.estimateNote` | Makadirio. Kiasi halisi hutegemea bwawa soko likifungwa. Kamisheni ya {pct}% imeshatolewa. | Estimate. The final amount depends on the pool when the market closes. Our {pct}% commission on the losing side is already deducted. | 预估。最终金额取决于市场关闭时的奖池。已扣除输方 {pct}% 的佣金。 |
| `journey.balanceRow` | Salio lako | Your balance | 您的余额 |
| `journey.placeCta` | Weka dau · {amount} | Place bet · {amount} | 投注 · {amount} |
| `journey.placeCtaBare` | Weka dau | Place bet | 投注 |
| `journey.estimateCompact` | Ukishinda ≈ {amount} | If you win ≈ {amount} | 若赢 ≈ {amount} |
| `journey.lowTitle` | Salio halitoshi | Not enough balance | 余额不足 |
| `journey.lowBody` | Una {have}. Unahitaji {short} zaidi. | You have {have}. You need {short} more. | 您有 {have}，还需 {short}。 |
| `journey.lowChoose` | Chagua unachotaka kufanya | Choose what to do | 请选择操作 |
| `journey.lowDeposit` | Weka pesa {amount} | Deposit {amount} | 充值 {amount} |
| `journey.lowBetInstead` | Weka dau la {amount} badala yake | Bet {amount} instead | 改为投注 {amount} |
| `journey.pendingBet` | Dau lako la {amount} linakusubiri | Your {amount} bet is waiting | 您的 {amount} 投注正在等待 |
| `journey.amountLabel` | Kiasi | Amount | 金额 |
| `journey.payWith` | Lipa kwa | Pay with | 支付方式 |
| `journey.phoneLabel` | Namba ya simu | Phone number | 手机号码 |
| `journey.pinNote` | Utapokea ombi la PIN kwenye simu. Ukimaliza, tunakurudisha kwenye dau lako ulithibitishe. | You'll get a PIN prompt on your phone. When you're done, we bring you back to your bet to confirm it. | 您的手机将收到 PIN 确认请求。完成后，我们会带您回到投注页面进行确认。 |
| `journey.payCta` | Lipa {amount} | Pay {amount} | 支付 {amount} |
| `journey.payByCard` | Lipa kwa kadi | Pay by card | 用银行卡支付 |
| `journey.howToTitle` | Jinsi ya kucheza | How to play | 玩法说明 |
| `journey.howStep1Title` | Chagua swali | Choose a question | 选择问题 |
| `journey.howStep1Body` | Kila swali ni tukio halisi lenye jibu moja: {yes} au {no}. | Every question is a real event with one answer: {yes} or {no}. | 每个问题都是一个真实事件，只有一个答案：{yes}或{no}。 |
| `journey.howStep2Title` | Bonyeza {yes} au {no} | Tap {yes} or {no} | 点击{yes}或{no} |
| `journey.howStep2Body` | Utaona papo hapo unachoweza kushinda, mfano ≈{mult}× dau lako. | See immediately what you can win, e.g. ≈{mult}× your bet. | 立即看到您可赢取的金额，例如 ≈{mult}× 您的投注。 |
| `journey.howStep3Title` | Weka dau, subiri matokeo | Place your bet, wait for the result | 投注，等待结果 |
| `journey.howStep3Body` | Washindi wanagawana bwawa. Ushindi unaingia kwenye salio, unatoa kwa pesa ya simu. | Winners share the pool; winnings go to your balance and out via mobile money. | 赢家平分奖池。奖金进入您的余额，可通过手机钱包提现。 |
| `journey.howExampleLabel` | Mfano | Example | 示例 |
| `journey.howExampleBody` | Dau {stake} kwenye {side} inayoonyesha ≈{mult}× → ukishinda unapata takriban {payout}. Ukikosea, unapoteza dau lako. | A {stake} bet on {side} showing ≈{mult}× → if you win you get about {payout}. If you're wrong, you lose your bet. | 在显示 ≈{mult}× 的{side}上投注 {stake} → 若赢约可获得 {payout}。若猜错，您将失去投注金额。 |
| `journey.howCta` | Nimeelewa, anza | Got it, let's start | 明白了，开始 |
| `journey.howHelplineLabel` | Msaada | Helpline | 求助热线 |

Existing keys reused, unchanged:
- `rg.setLimits` "Weka mipaka"
- `nav.updown` "Juu/Chini"
- `market.catAll` / `catSports` / `catWeather` / `catMacro` "Zote / Michezo / Hali ya hewa / Uchumi"
- `common.yes` / `common.no` "NDIO / HAPANA", read through `sideWord()`
- `beFirst`, `oneSideOnly`

**S6 keys (2026-10-01, `S6-PLAN.md` WP1).** The shell's words are keys of the `journey` namespace in
`src/lib/i18n-dict.ts`, their only source; they are not deck strings, so they are not rows of the table above. The five
that are (`balanceCaption`, `depositAction`, `tabQuestions`, `tabTickets`, `tabAccount`) are verbatim. Every other sw
value is an S4 canvas word or an S6 draft, listed for the native review under "S6 drafts" in
[`S4-COPY-AUDIT.md`](design-system/v5-2026-09-29-simplified-journey/S4-COPY-AUDIT.md). Classic words are reused by key
(WP1 step 2); a journey value repeats a classic one only for a key the plan names (its key list, and A10 for the hub's
card names).

**The S15 "Tiketi keys" rename list** (SJ-19: "Tiketi" replaces "Nafasi" on player surfaces), re-derived from the sw
block and a grep of `src/` on 2026-10-01 — re-grep before S15. These keep "nafasi" until the flip (§3.9); at S15 each
is re-worded, or its surface moves to the journey copy named:
- `common.positions`, `common.viewPositions`, `common.closeIrreversibleBody`, `common.positionOpenNotify`,
  `common.positionUnchanged` (→ `journey.sellUnchanged`);
- `home.myPositions`;
- `market.yourPositions`, `market.resYourPayoutNote`, `market.udOpenInPositions`, `market.udPositionsOnRound`;
- `positions.filterAria` (→ `journey.ticketsFilterAria`), `positions.sortAria`, `positions.searchPlaceholder`,
  `positions.filtersTitle`, `positions.oneResult` / `nResults`, `positions.emptyCashed` (→ `journey.ticketsEmptyCashed`),
  `positions.emptySearch` and `positions.emptyFilter` (→ `journey.ticketsEmptyLens`), `positions.exitLens`
  (→ `journey.ticketsExitLens`);
- `performance.noPerformance`;
- `error.pageHitSnagBody`, `error.backToPositions` (→ `journey.ticketsBack`), `error.positionsSafe`
  (→ `journey.ticketsErrorBody`);
- `dialog.sellPositionNow` (→ `journey.sellConfirmTitle`), `dialog.keepPosition` (→ `journey.sellKeep`);
- not keys (hard-coded sw): the avatar menu's "Nafasi" row (`avatar-menu.tsx`), the root error page
  (`global-error.tsx`), the rules pages (`legal/rules/_content-yes-no.tsx`, `_content-up-down.tsx`; binding text, so
  each moves under its page's version rule), and the agent commission email and notification copy (`server/email.ts`,
  `server/notification-service.ts`);
- SJ-19's other half: the support words `chat.ticket` and `chat.ticketSubject` (sw "Tiketi …") become "Ombi la
  msaada", so "Tiketi" means one thing. No component reads either key today (grep, 2026-10-01).

*WP9 (2026-10-03):* the journey's Tiketi view's own files read none of the keys above; the classic Sell button inside
its cards does, until WP10 (`dialog.sellPositionNow`, `dialog.keepPosition`, `common.positionUnchanged`; §0h point
24). Its lens strip is named `journey.ticketsFilterAria` ("Chuja tiketi"; en "Filter tickets" and zh "筛选注单" since
WP9) and draws no result count and no count on any lens. Its empty states read the canvas's
`journey.ticketsEmptyOpenTitle` and `ticketsEmptyOpenBody` (no tickets, or none open), `journey.ticketsEmptyCashed`
(none sold) and, for the four outcome lenses, `journey.ticketsEmptySettled`, `ticketsEmptyWon`, `ticketsEmptyLost` and
`ticketsEmptyRefunded` — en and sw repeat the classic `positions.emptySettledLens`, `emptyWon`, `emptyLost` and
`emptyRefunded` (a repeat §0h point 27 names, as the rule above asks), and zh says 注单 where those say 持仓 — over
the classic `positions.emptyLensBody`, which says neither; `journey.ticketsEmptyLens` is only a defensive fallback no
lens reaches, and the one exit reads `journey.ticketsExitLens`. On `/positions` the error page's body and back link
read `journey.ticketsErrorBody` and `ticketsBack`; on `/updown/history` only the body does (its back link stays
`market.udBackToBoard`), and both keep `error.somethingWentWrong` and `error.pageHitSnag`. The tab title is
`journey.tabTickets`. `test:journey-tickets` §4 fails on any Swahili "nafasi" or Chinese 持仓 the view reads. Still
"nafasi" to a journey reader after WP9: those three Sell-button keys (WP10) and, off Tiketi zangu itself,
`/positions/performance` (its eyebrow and back link `common.positions`, its empty title `performance.noPerformance`,
its result count `positions.oneResult`/`nResults`), the question page's `market.yourPositions` and the avatar menu's
hard-coded row, every one of them on the list above (§0h point 34). So at S15 the list above is the classic surfaces'
alone.

*WP10 (2026-10-03):* the journey's Sell look reads `journey.sellFreeUntil`, `sellFreeCta`, `sellFullRefund` and
`sellClosedBody`, beside the classic `common.sellLocked` (its shut title), `common.sellNow` and `common.fee` (a price
with a fee), `common.selling`, and `common.loading` (a lapsed free price waiting for the server); under the look its
dialogs read `journey.sellConfirmTitle`, `sellKeep` and `sellUnchanged` in place of `dialog.sellPositionNow`,
`dialog.keepPosition` and `common.positionUnchanged`, so those three keys leave a journey reader's Tiketi zangu. The
dialogs' other words are classic and say no "nafasi" (§0h point 36 lists them): `common.positionSold` stays on the
sold receipt (en "Position sold", zh 持仓已出售), and `dialog.cashOutTitle`, `common.cashOutFailed` and
`toast.couldntCashOut` say "toa", which is also the journey's withdraw verb. `test:journey-tickets` §12 reads the sell
path's words from its source and fails on any Swahili "nafasi", a second Chinese 持仓 or a fourth "toa" written there;
the shared refusal sentences are picked at run time and are outside that scan (zh `error.failPositionNotOpen` says 持仓).

⛔ Not part of the Tiketi rename ("nafasi" means something else there): `common.busyBody` and `dialog.busyHolding`
("we are holding your place") and `market.oddsLong` ("a small chance"). `nav.cardSpacing` (spacing) gets its own
correction to "Ukubwa wa kadi" (`S4-COPY-AUDIT.md`; the journey already reads `journey.hubCardSize`), together with the
privacy notice's hard-coded "nafasi ya kadi" (`legal/privacy/page.tsx`, under that page's own versioning rule). Admin
screens are not player surfaces (`admin/players/[id]` "Nafasi ya mwisho" stays).

## §4 · The audit behind this plan

- **Scope:** on 2026-09-29, 15 read-only checkers audited the plan against the deck, the code, money, i18n and repo
  law. They produced 370 findings.
- **Skeptic checks:** 190 were re-checked by a skeptic: 184 confirmed, 5 wrong, 1 already covered.
- **The rest:** the other 180 were reviewed by hand before being applied. A weekly usage limit stopped their skeptics.
- **Folded in:** every applied finding is part of §5 onward.
- **Raw record:** workflow run `wf_f73d94b2-a47` in the session's workflow journal.

---

# §5 onward · The plan (approved by Ali, 2026-09-29)


## Context

On 2026-09-28 the agency that will sponsor and market 50pick sent `Downloads\50pick_Simplified_Journey.pptx`
(9 slides, author "fred muragwa").
- **What it asks for:** a simpler player journey. Short YES/NO questions, winnings shown on the buttons, a bet sheet
  that opens even before sign-up, a deposit offered at the moment of shortfall and then straight back to the bet, and
  How to Play at the top.
- **What it contains:** 5 phone frames (Home, Bet sheet, Balance too low, Deposit, How to Play), a Today→After table,
  4 questions for us, and 5 success measures.

**Ali's rulings (binding):**
1. **Functionality must be identical to the deck:** the flow, element order, states and copy. "No matter what we need
   to cut off." The Gaming Board licence covers it.
2. **Keep the email check before a first deposit,** done as an **inline 6-digit email code** on the deposit screen.
3. **Mixx by Yas is the 4th wallet row.** Card stays available through a "Lipa kwa kadi" link.
4. **Build hidden behind a staff preview and launch at once.**
5. ⭐ **The look is 50pick's own design system, unchanged:**
   - Fonts: Sora, Inter, and JetBrains Mono for money figures.
   - Colours: the `globals.css` tokens (YES green, NO red, royal primary, gold per DESIGN_AUTHORITY §M3).
   - Components: the kit components and the brand mark.

   The deck's colours, typeface and two-tone wordmark are **not** adopted. The deck's frames are templates for *what*
   happens; 50pick decides *how it looks*.
6. ⭐ **Remove from usage, never delete.** Everything the journey cuts is unmounted and **shelved in place**:
   - It stays in the code at the same path, still compiles, and its unit tests stay wired.
   - It is recorded in `docs/SHELVED.md` with how to re-mount it.
   - Anything the journey needs that we don't have is added in full.

**Outcome:**
- 50pick.tz **behaves** exactly like the deck and **looks** like 50pick.
- Every state the deck didn't draw is designed to the same standard.
- The money path stays exactly-once.
- The agency's five measures are live, with a before/after baseline.

**This version folds in a read-only audit:**
- 370 findings from 15 checkers; 190 were re-checked by a skeptic. Of those, 184 were confirmed, 5 were wrong, and 1
  was already in the plan.
- The 180 findings the skeptics could not check (the account hit its weekly limit) were reviewed by me before being
  applied.
- Raw record: the workflow journal `wf_f73d94b2-a47`. S0 files it into the repo.

---

## 0. Decisions taken under Ali's delegation (recorded as SJ rulings in S0)

**Money display**
- **SJ-1 Card figure.**
  - The card shows the zero-stake pool multiple, 1 + (1 − loser-share)·opposite/own, rounded half-up to tenths with
    integer arithmetic. This is exactly the deck: the card reads ≈2.8× while the sheet at TZS 1,000 reads ≈2.7×,
    because the player's own stake dilutes their side.
  - Empty own side → state words, never a figure: "Kuwa wa kwanza" (the existing `beFirst` key) or "Upande mmoja tu"
    (the existing `oneSideOnly` key).
  - Above the cap, it shows "Shinda zaidi ya {cap}× dau", where `{cap}` comes from `ESTIMATE_DISPLAY_CAP = 100` in
    `estimate.ts`. The cap is never typed into the dictionary (`test:rate-copy`).
- **SJ-2 Sheet figure.**
  - The TZS figure is `payoutFor()` at the entered stake, which equals the server's stored `potentialPayout`.
  - The "≈N.N×" is derived from that whole-TZS figure, half-up to tenths.
  - This is a scoped exception to the platform's floor rule; Up & Down keeps its floor.
- **SJ-3 Fee wording.** `{pct}` = the market's frozen loser-share total (`platformFeeRate + operatorFeeRate`, via
  `resolveFeeModel`/`loserSharePct`), never `commissionRate`.
  - sw is deck-verbatim: "Makadirio. Kiasi halisi hutegemea bwawa soko likifungwa. Kamisheni ya {pct}% imeshatolewa."
  - en: "…Our {pct}% commission on the losing side is already deducted."
  - Legacy capped-commission markets: no figure, and the `describeFeeModel` caption instead.
- **SJ-4 Where estimates appear.**
  - "≈" is the estimate marker on every figure.
  - The Makadirio sentence appears only where the deck draws it: the sheet's estimate box and the How-to MFANO box.
    It is not on cards and not on the low-balance compact row.
  - DESIGN_AUTHORITY §C3 (licence law) is amended **only** for the cards and the pre-bet sheet.
  - The post-bet receipt and Tiketi zangu keep §C3: no per-position payout before resolution.
- **SJ-5** The fixed 1.5× "possible winnings" is retired on loser-share polls. `/admin/config` copy changes at the
  flip.

**Home and cards**
- **SJ-6 Home = the question list.**
  - It shows `LIVE && !selectionClosed` markets only.
  - Order: soonest-closing first, ties by pool (the deck's order). This supersedes the 2026-09-12 pool-first ruling
    and the 2026-09-06 "CLOSED rows stay" ruling **for `/` only**.
  - Selection-closed markets live on `/live` and in Tiketi zangu.
  - `PLAYER_PER_PAGE` (12) cards per page, then an "Onyesha zaidi" link to `?page=n+1`.
  - No sort control and no search box on `/`. `?q` still filters; search lives in Akaunti.
- **SJ-7 Category chips.**
  - Order: "Zote" (no `?cat`), then only categories that have ≥1 open market. The deck's order Michezo · Hali ya hewa ·
    Uchumi comes first, then the rest.
  - Parameter `?cat=`, the same name `/results` and `/watchlist` use.
- **SJ-8 Card meta row.**
  - Left: `category · competition`, where competition is a new optional field such as "Ligi Kuu" or "EPL".
  - Right: the close label. Same EAT day → "Inafungwa leo". Otherwise "Siku {n}", counting EAT calendar days.
    Selection closed → the existing waiting label.
  - The market page and Tiketi zangu keep absolute dates beside every timer (Gaming Board item #6, `test:timer-date`).
- **SJ-9 Card taps.** The card body (stretched `.mcardp-open` link) goes to `/markets/[id]`. The two buttons open the
  bet sheet **in place** and never navigate.

**Bet sheet and deposit**
- **SJ-10 Bet sheet.**
  - Side locked ("Umechagua NDIO"), no side switch.
  - Chips 1,000 / 2,000 / 5,000 / 10,000 in full figures (never "1K"). A tap **sets** the stake. Chips come from
    `quickStakes(min, max)` and are filtered to the market's bounds, never to the balance.
  - The CTA "Weka dau · TZS X" **is** the confirm step. BetConfirmModal and its 10-second quote hold are shelved.
  - Enter never submits.
  - Success: an in-sheet receipt (side, stake, ticket) with **no navigation**.
- **SJ-11 "Weka dau la TZS {balance} badala yake"** places that bet directly. The button names the amount and the chip
  names the side.
- **SJ-12 Deposit-button ink.**
  - The low-balance "Weka pesa TZS X" is a deposit *entry* in `gilt-metal`, the same family as the header pill.
  - "Lipa TZS X" is a deposit *commit* in `btn-primary` (brand), per §M3a D1.
  - One-tap Lipa (no DepositConfirm) on the journey screen only. This supersedes audit M9 there; the classic card form
    keeps its confirm.
- **SJ-13 Deposit number.**
  - Journey mode seeds the phone number from the most recent **CONFIRMED** mobile-money deposit (reduced from its
    stored E.164), else the registered number. "Tumia namba nyingine" stays.
  - This amends Ali's E-210/E-215 (2026-08-25). `moneyFormMsisdn` gains an optional `lastDepositMsisdn`, and
    `test:msisdn-prefill` is extended.
- **SJ-13b Deposit wallet.** Preselect the last-used wallet. With no history, preselect nothing, and "Lipa" stays
  disabled until a wallet is chosen. The phone prefix never picks the wallet (`tz-msisdn` rule).
- **SJ-14 Phone field.**
  - The deposit field becomes the kit `PhoneInput`, which accepts 07…, 7…, 255… and +255…, typed or pasted, in 50pick
    look.
  - It replaces today's `maxLength=9` bare input, which cuts off "0712…". This fixes the classic page too.

**Header, tabs and Akaunti**
- **SJ-15 Phone header.**
  - `FiftyMark` (the lockup cannot fit at 360; measured), 18+ badge, then a **new captioned balance** ("Salio" over
    "TZS 2,000", TZS shown at every width, no eye or caret in the capsule), then the gilt "+ Weka pesa" pill.
  - Tapping the capsule opens WalletSheet, which holds the hide-balance eye and "Toa pesa". That makes Withdraw one tap
    from the capsule (V19).
  - Desktop ≥1024 keeps LanguageMenu, bell and avatar to the right of the 4 destinations.
- **SJ-16 Four tabs.**
  - Maswali (`/`) · Juu/Chini (`/updown`) · Tiketi zangu (`/positions`) · Akaunti (`/account`, new, public).
  - Tabs keep 50pick's glyph + label and `--pill-active`. The Juu/Chini accent dot is shelved.
  - One `activeTabFor(pathname)` function serves both the rail and the desktop nav.
  - Guests who tap "Tiketi zangu" get a small sheet: "Ingia uone tiketi zako" with Jisajili / Ingia.
- **SJ-17 Akaunti hub (`/account`, reading tier).**
  - Signed-out view: sign in / sign up, language, results, live, leaderboard, fairness, help, limits, legal.
  - Signed-in view:
    - identity header (name + masked phone);
    - Pochi, Toa pesa, Matokeo, Mubashara, Jedwali;
    - Alika (only if `inviteIsLiveFor`) and Pendekeza (follows `proposalsState`);
    - Wasifu, Kitambulisho (`/profile/kyc`), Weka mipaka, Uthibitisho;
    - Msaada (`/help`; chat only when `isChatbotEnabled`);
    - Arifa, with the unread badge (also on the tab);
    - Lugha, card density, Needle drawer, Tafuta (search);
    - Agent (when `agentDoorVisible`), and the staff console as a plain `<a href="/admin">` for staff only;
    - Toka, through the existing ConfirmDialog → POST `/auth/logout`.

**Chrome, words and records**
- **SJ-18 Deposit chrome.** The journey deposit screen, its code step and `/wallet/deposit/waiting` use focused chrome:
  no header, no tabs, no footer, no ticker. Instead: a round "‹", the title "Weka pesa", and a minimal 18+ and
  helpline line.
- **SJ-19 Words.**
  - "Weka pesa" is the deposit **action** everywhere; the noun "Amana" stays on receipts, limits and legal pages.
  - "Tiketi" replaces "Nafasi" on player surfaces; support "tiketi" becomes "Ombi la msaada".
  - "NDIO" is the only spelling (7 "NDIYO" strings get fixed).
  - "Maswali" replaces "Masoko" as the destination name.
  - The Maswali Millionea name clash is accepted.
- **SJ-20 Tagline.** The retired slogan "Tabiri matukio. Si bahati." is replaced by the deck's tagline:
  - en "Pick. See what you win. Play."
  - sw draft "Chagua. Ona unachoshinda. Cheza."
  - zh draft
  - It goes on all ~12 surfaces at the flip.
- **SJ-21 Copy source.**
  - sw: deck-verbatim, and binding for SJ keys.
  - en: the deck's own English where the slides give it.
  - zh and all undrawn states: drafted (R8, formal 您, 充值, break-keep).
  - Exceptions:
    - How-to steps render "1/2/3", as the deck.
    - The How-to example figures are computed from a fixed illustrative pool that must render TZS 1,000 → ≈2.7× →
      TZS 2,700 (`HOW_TO_EXAMPLE`).
- **SJ-22 What is recorded as a deviation from the frames** (required by rules):
  - the hedge / "Tayari una {side} hapa" holder line;
  - the bonus-wager warning;
  - the thin-upside notice;
  - the capped-market caption;
  - PayoutStatusNotice on deposit;
  - a "Weka mipaka" link after the sheet CTA, **only if** `test:rg-doors` / RG policy requires it (checked in S8).
- **SJ-23 Preview access.**
  - All staff roles, SUPPORT included, see the journey.
  - The agency gets a signed, 7-day, revocable visitor-preview link (no admin access).
- **SJ-24 The "first licensed" claim** leaves `/` with the hero.
  - V22's negative half stays: no "first" claim anywhere on journey surfaces or in metadata.
  - The licence line stays in the footer; 18+ goes in the header; the helpline is in the How-to sheet and the footer.

---

## 1. Evaluation: deck vs 50pick today

| Deck element | Today | Verdict |
|---|---|---|
| Header: brand, 18+, "Salio TZS 2,000", "+ Weka pesa" on phones | Mark only on phones. 18+ only in hero/footer. Balance capsule with no caption (TZS hidden on phones, ▾, eye). Deposit pill ≥1024 only, label "Amana" | Change content and placement, in 50pick look (SJ-15) |
| "▶ Jinsi ya kucheza · Hatua 3 · dakika 1 ›" card on top | None. How-it-works is section 4 of 7 | **New** composition |
| "Jibu swali. NDIO au HAPANA." | Hero "NDIO au HAPANA?" | Copy change; two lines exactly at 360 |
| Chips Zote / Michezo / Hali ya hewa / Uchumi | Labels exist (`catAll` …). Home uses topic tiles | Reuse `FilterPill` (SJ-7) |
| Card: meta row, short question, 2 buttons "Shinda ≈2.8× dau" | "NDIO @ 33%" (`market-card.tsx:633`). No short title, no competition field | New fields + estimate (SJ-1, SJ-8) |
| Bottom tabs Maswali / Juu/Chini / Tiketi zangu / Akaunti | 5 slots with centre deposit coin and More | Change (SJ-16/17) |
| Home without ticker, stats, gauge, board, tiles, band, trust | All live on `/` | Shelve (ruling 6) |
| Bet sheet before sign-up, quick chips, live estimate | Inline ConvictionDial + BetConfirmModal. Guests go to sign-in. Fixed 1.5× estimate | **New** (reuse `Modal sheet`, `payoutFor`, `quickStakes`) |
| Low balance → shortfall deposit / bet what you have | Dial disables its button; no path | **New** |
| Deposit: bet strip, shortfall prefilled, last-used wallet/number, back to bet | `/wallet/deposit` (tiles, `?amount=`), always redirects to `/wallet`, no status read | Change + **new** waiting/return |
| How to Play sheet with limits + helpline | `FirstVisitPrimer` (auto once, not reopenable). Helpline 0800 11 0011 is our real number | **New** component; old primer shelved |

**Answers to the agency (sent in S0 as `AGENCY-REPLY.md`):**
1. **Preview before sign-up:** yes.
2. **Can the wallets return users to the bet?** Yes, with no operator work. The PIN prompt comes by USSD push while
   the player stays on our page, and our app waits for the confirmed payment and brings them back.
3. **Short titles:** yes. A short-title field per market in sw/en/zh, plus an optional competition label. The full
   wording and the source stay on the market page.
4. **Regulator review:** Ali's ruling is that the licence covers it; recorded.

The reply also includes:
- **Campaign-link spec:** `https://50pick.tz/markets/<id>?side=YES&utm_source=…&utm_campaign=…` opens the sheet on
  that side at the minimum stake. A link never carries a stake.
- A note that share images carry no multiplier.
- The questions below.

**Questions to the agency (non-blocking):**
- Source files (Figma), if they exist.
- What they expect on desktop.
- Whether their campaign needs en/zh.
- Any "presented by" placement.
- A request that their creative be built from our real screens, which we send at S14.

---

## 2. Build map: deck element → 50pick kit ("NEW" = a kit addition designed in S4)

| Deck element | Built with |
|---|---|
| Brand | `FiftyMark` 26px on phones (`top-app-bar.tsx:204`), lockup ≥1280. Never re-tinted |
| 18+ | `.kp-rg__18` (neutral ink) |
| Salio | **NEW** `WalletBalancePill variant="captioned"` ("Salio"/"Balance"/"余额" over "TZS 2,000"; mono gold figure, sizer grid and delta flash kept; no eye or caret; tap → WalletSheet). Hide-balance preference honoured via `<Cash>` |
| + Weka pesa | existing `btn gilt-metal btn-pill`, now also on phones. States: guest → Ingia/Jisajili (no pill); held wallet → no pill; `/wallet/deposit*` → focused chrome |
| How-to card | **NEW** full-width card on the 50pick card surface; `IconPlate` play glyph in brand/neutral ink (never gilt); Sora title, Inter meta |
| Headline | `.kp-hero__headline` family, with a measured rung that keeps exactly 2 lines at 360 in sw/en/zh. Side words in neutral headline ink |
| Chips | `FilterPill` / `.kp-fchip` with its own selected style |
| Card | `MarketCard` **journey variant**: meta row + short title (≤2 lines) + `.btn-yes/.btn-no` with the side word and a "Shinda ≈{mult}× dau" line (figure in JetBrains Mono). **Settled variant** for `/results`/`/watchlist` (outcome row, same height). Own height tokens `--jcard-*`; density does not apply |
| Tabs | `BottomNav` visual language, 4 equal tabs, `--rail-h` variable replacing every literal 88px, `data-needle-keepout` |
| Sheets | `Modal sheet sheetUntil="lg"` (`.kp-wsheet`). **NEW** `dragToDismiss` on Modal. Desktop = centred dialog, maxWidth ≈440 (no `anchorRef`) |
| "Umechagua NDIO" | `Chip variant="yes"` / `"no"`, side word from `sideWord()` |
| Stake box | `Input size="lg"` with TZS prefix + **NEW** `grouped` display (thousands separators, stable caret, numeric keypad, 9-digit cap) + **NEW** `attention` state (neutral-strong border, `aria-describedby` → the warning; never `error`, gold or NO ink) |
| Quick chips | `quickStakes` values; the Up & Down chip layout; full-figure labels; 44px floor; no "+ Maalum" |
| Estimate box | Neutral inset panel (`--bg-inset` + `--border`). The TZS figure is the box's largest number (deck hierarchy), in `.amount` mono `--text` (not gold, not success, not side ink). "≈{mult}× dau lako" as a `Chip`. Makadirio line below |
| Weka dau CTA | `btn-gold` (a bet commit keeps gold, §M3a) |
| Low-balance warning | `Callout tone="info"` (the S4 panel, D5: the kit's `neutral` is the dashed empty-state box) with the `alertCircle` glyph |
| Low-balance eyebrow | microlabel, uppercase via CSS for Latin only |
| Low-balance deposit | **NEW** 2-line action row (glyph + "Weka pesa TZS X" + wallet sub-line from `depositRails()` + "›") in `gilt-metal` (SJ-12) |
| Bet instead | `btn-outline` |
| Deposit wallets | `ProviderRadioGrid` **extended**: `layout="rows"` (radio in royal `--brand-500`, 32px logo, name, royal ring) + `noDefault`; kill-switch-disabled rows |
| Pending-bet strip | card surface + side `Chip` + sentence, stake in `.amount` |
| Lipa | `btn btn-primary btn-lg w-full` (brand commit, §M3a D1), live label "Lipa {amount}" |
| How-to steps | **NEW** `.kp-howto__step`: round badge with "1/2/3" in mono, NEUTRAL ink — S4 choice 1B (`--bg-royal-soft` fill, `--border-strong` inset ring, `--text` numerals); gold would be decorative gold, which DESIGN_AUTHORITY §M3 forbids. `.kp-step__n` stays with the shelved band |
| MFANO | `Callout tone="info"` with a microlabel title, body via `fillNodes` |
| Nimeelewa, anza | `btn-primary` |
| Footer links | the footer RG idiom (`public-footer.tsx:222`, `app-shell.tsx:584`). ⛔ `.kp-rg` was deleted 2026-09-26; do not revive it |

`DESIGN_AUTHORITY.md` stays the law. `test:gold-is-money`, `test:betting-ink`, `test:design-frozen` and `test:contrast`
stay as they are. New kit additions are recorded in DESIGN_AUTHORITY in S0, effective at the flip.

---

## 3. Behaviour specifications

### 3.1 Engine (pure, isomorphic; `estimate.ts` is import-free and passes `test:client-graph-safe`)

**`src/lib/markets/estimate.ts`**
- `estimateFor({yesPool, noPool, rates, side, stake, bettable, bounds})` returns:
  - `{state, payout, multTenths, multText, overCap, feePct, lean, emptySide}`
- States: `priced | fillsEmptySide | oneSidedRefund | emptyPool | hidden (capped / show=false) | closed |
  invalidStake`.
- `cardEstimate` uses stake 0 (SJ-1).
- UPDOWN markets → `null`.
- `HOW_TO_EXAMPLE` fixture.
- `pickEstimateRates`; `loserSharePct` added to `payout.ts`.

**Golden fixtures (`test:journey-estimate`, plus a red twin)**

| Market | Pools | Expected |
|---|---|---|
| Dodoma | YES 24,825 / NO 50,462 (solved exactly in S3) | card ≈2.8× / ≈1.4×; sheet 1,000 → TZS 2,700 ≈2.7×; 5,000 → TZS 12,360 ≈2.5× |
| Yanga | YES 20,000 / NO 43,700 | card ≈2.9× / ≈1.4× |

The test also covers:
- client/server parity with `projectedPayout`;
- the `{pct}` source;
- the capped model;
- UPDOWN → null.

**`src/lib/markets/card-close-label.ts`**
- Close instant = `selectionClosedAt ?? resolutionAt`.
- Day comparison in EAT via `eatDayKey`.
- New keys `cardClosesToday` and `cardDaysLeft` in en/sw/zh.
- `test:card-close-label` + red twin covers:
  - 23:59 → 00:01 crossing;
  - tomorrow 01:00 with 3h left is **not** "leo";
  - exactly 11 days;
  - selection closed.

**`src/lib/journey/shortfall.ts`: `shortfallPlan`**

The checks run in this exact order, mirroring `placeBet` and then `deposit()`:
1. maintenance
2. self-excluded / cooling-off (with until-date)
3. session limit
4. account blocked
5. market not LIVE / selection closed
6. stake bounds (`stakeBoundsForMarket`)
7. wallet not ACTIVE (paused-deposit notice + /help, and "bet instead" if balance ≥ min)
8. loss-limit headroom
9. **enough**
10. deposit already pending → "Malipo yako ya TZS X yanasubiri" with a link to the waiting page, and no second
    deposit
11. deposit amount D = max(shortfall, `DEPOSIT_MIN_TZS`)
12. email unconfirmed → still an ordinary deposit step (the code is the first step on the deposit screen)
13. deposit-limit headroom
14. source of funds
15. deposit

Other rules:
- Unknown balance → no plan; show "Salio lako —" and let the server decide.
- **Spendable** = `balance + (bonusBalance ?? 0)`, the same figure `buyPosition` checks.
- `options[]` holds 0, 1 or 2 entries.
- "Bet instead" requires balance ≥ `minStake`, read from config.
- **Deposit chips:**
  - D first and selected, then the next two amounts from the existing `QUICK_AMOUNTS` ladder strictly above D.
  - All chips clamped to `depositCeilingFor` (DEPOSIT_MAX, RG day/week/month headroom counting PROCESSING deposits,
    SoF headroom).
  - Examples: 3,000 → [3,000, 5,000, 10,000]; 5,000 → [5,000, 10,000, 25,000]; 300 → [500, 1,000, 5,000] with
    `belowDepositMin`.
  - No per-rail ceiling (E-231).
- `depositCeilingFor` and `lossHeadroomFor` are proven equal to the real gates (`test:deposit-ceiling`).

**`src/lib/journey/pending-bet.ts` + shared `src/lib/safe-next.ts`** (the `sanitizeNext` logic moved there from
`login/actions.ts:14`)
- Grammar: `?bet=mkt_x.YES.5000`. Round form: `round_x.UP.5000`.
- Legacy `?side=` still works: side locked, stake = minimum.
- The URL is rebuilt from path + bet only.
- A stake is prefilled from the URL only when a matching sessionStorage marker (<24h) exists, so a shared link can
  never set someone's stake.
- The marker also carries `ref`, `invite` and `utm_*`.

**`GET /api/markets/[id]/sheet`**
- GET only, `force-dynamic`, `nodejs` runtime, rate-limited.
- The public half is cacheable (`s-maxage ≤ 5`): state, pools, rates, min/max, closesAt, serverNow, estimates.
- The signed-in half is `private, no-store`: spendable, heldSides, bonus warning.
- Returns 404 for UPDOWN or not-LIVE markets.

### 3.2 Home `/` and cards (flagged)

**First commit of S7:** move today's `src/app/page.tsx` body verbatim into the shelved
`src/components/home/legacy-landing.tsx` (`<LegacyLanding/>`). Gates that regex `app/page.tsx` are re-pointed there.

**Journey order at 360 (deck):**
1. header
2. transient system bars only: announcement, session-ended, away summary (no email-verify bar on journey)
3. How-to card
4. headline
5. chips
6. list
7. "Onyesha zaidi"
8. footer

**Page setup**
- `PageContainer tier="board"` (1280). Grid: 1 column <640, 2 at 640, 3 at ≥1024.
- `RefreshPoller 30s` plus the SSE `market-odds` patch for visible cards.
- Its own journey skeleton, a Suspense boundary inside `page.tsx`. The root `loading.tsx` stays generic.
- The ticker leaves `/` and `/markets`: `tickerShowsOn(path, journeyOn)` at first, then `TICKER_ROUTES = ["/live",
  "/results"]` at S16.
- The Needle, channels panel and chat bubble are off journey surfaces (one `isJourneySurface()` list in
  `src/lib/surfaces.ts`).

**Card buttons**
- `go()` is rewritten (`market-card.tsx:430`): it opens `BetSheetHost` in place, does **not** dispatch
  `50pick:navigating`, and the press-pop animation replays on every tap.
- Opening the sheet pushes `?bet=<id>.<side>` via `history.pushState`, so Back closes it and a reload reopens it.

**Other routes**
- `/markets` (list only): a **307** via `redirect()` while flagged, and a 308 only at S16.
  - `topic` becomes `cat`.
  - `q`, `utm_*`, `gclid`, `ref`, `invite`, `side` and `bet` are kept.
  - `status=watch` goes to `/watchlist`.
  - `status/sort/dir/odds/pool/page` are dropped and recorded in SHELVED.md.
  - Covered by `test:markets-redirect`.
- **The journey card also appears on** `/watchlist`, `/live` (replacing `LivePulseGrid` under the flag), and
  similar-markets. `/results` gets the settled variant.
  - The card-site census is updated in the same commit: `test:featured-card` 3.0 count, `test:one-sided` 2.4 + a new
    §8.9, and `test:product-line` re-pointed at `/`.
- **The market page** keeps:
  - the full wording, source, pool and chart;
  - both countdowns, each with its absolute EAT date;
  - the holder's ticket block with SellButton and the 5-minute free exit (`page.tsx:843-918`);
  - the Up & Down `?side` translation (`:149-153`), verbatim.

  The two big buttons open the same sheet. `?side=` opens the sheet preset.

### 3.3 Bet sheet (signed-in; flagged)

**Opening**
- Renders on the tap frame from the card's props, with no network wait (≤150 ms after tap at 4× CPU throttle, 360px).
  The chunk is preloaded at idle.
- `initialFocus` = the heading (never the input).
- The heading is the short title (falls back to the full title) and is the dialog's `labelledBy`.

**Order (deck frame 2)**
1. chip "Umechagua NDIO" + X
2. question
3. "Dau lako" + stake
4. 4 chips
5. estimate box (the TZS figure largest, "≈{mult}× dau lako", Makadirio line)
6. "Salio lako TZS X" (live via `useLiveBalance`, masked by `<Cash>`)
7. CTA "Weka dau · TZS X"

**Stake and CTA**
- CTA is disabled and reads "Weka dau" (no amount) when the stake is empty or out of bounds.
- The bounds line uses the F3 warning severity (never NO ink) and names the bound.

**Live refresh**
- Refetches `/sheet` on open, every 10s while visible, on SSE for this market, on focus, and on `wallet:balance`.
- An aria-live "Makadirio yamesasishwa" line appears; it never blocks the tap.
- Each keystroke recomputes locally in the same frame.

**Placing**
- At the tap the quote is frozen: `{marketId, side, stake}` exactly as printed on the tapped button.
- A new `crypto.randomUUID()` is minted per intent. The same key is reused only for a Retry after
  `system_busy`/`system_error` or a double tap while pending.
- While placing: the field, chips and CTA are locked, `aria-busy` is set, and scrim / Esc / X / swipe / Back are
  ignored.
- An auth-loss redirect (`r == null`) is treated as navigation, not failure.

**Refusals, all shown inside the sheet**
- Mapped by `REASONS[].channel` (the `udBetErrorCopy` pattern):
  - modal-channel (loss limit, self-exclusion, cooling-off, blocked, frozen) → a blocking in-sheet state the player
    must acknowledge;
  - other reasons → an inline line.
- `balance_insufficient` never shows its sentence; it re-enters the low-balance plan with the server's
  `{balance, needed}`.
- The sheet flips to closed at `selectionClosesAt` on its own `serverNow`-offset tick (the dial's 200 ms `closedNow`).

**Carried over from the dial**
- the `50pick-notify-markets` localStorage write
- `50pick:refresh` + `refresh-notifications` after success
- the optimistic deduction until server truth (`insufficientFor`)
- the holder / hedge lines and bonus warning, when applicable (SJ-22)
- the thin-upside notice when `leanFor` says thin
- the capped caption

**Mechanics**
- Keyboard-safe: the sheet lifts by `innerHeight − visualViewport.height`; `enterKeyHint="done"`.
- The sheet is `role=dialog aria-modal` only while open, so the reality check defers correctly.
- Pull-to-refresh ignores gestures that start inside the sheet.
- Consent, install and channels invitations stand down while any sheet is open (`html[data-bet-sheet]`).

**Accessibility**
- One polite live region, written on entering the low-balance state and on estimate updates, not on every keystroke.
- Reduced motion is respected; 44px targets.

**Success:** the in-sheet receipt (side, stake, ticket id; no payout figure, per SJ-4). "Endelea kucheza" closes in
place (scroll and `?cat` kept); "Tiketi zangu" opens tickets; auto-closes after 5s.

**Deploy skew:** the sheet mirrors its state into `?bet=`. A "Failed to find Server Action" error triggers a reload
that reopens the sheet. `test:deploy-skew` covers the sheet and the waiting page.

### 3.4 Low balance (deck frame 3)

**When it shows**
- Derived on every render from stake vs spendable. Chip taps are instant; typing settles after about 250 ms.
- Editing the stake back down restores the normal frame live; a landed deposit does the same.

**Order**
1. chip + X
2. question
3. "Dau lako" + stake in the `attention` state
4. compact row "Ukishinda ≈ TZS {x}" … "≈{m}×" (new keys)
5. warning callout "Salio halitoshi / Una TZS {have}. Unahitaji TZS {short} zaidi." (new keys)
6. eyebrow "CHAGUA UNACHOTAKA KUFANYA"
7. the 2-line deposit action (the amount is D; a clear note when D > shortfall because of the 500 minimum)
8. "Weka dau la TZS {spendable} badala yake"
9. the disabled "Weka dau · TZS {stake}" (`aria-describedby` → the warning)

**Hidden in this state:** chips, the estimate box, the Makadirio line, the balance row.

**Variants:** 0 options, 1 option, pending deposit, deposit limit, SoF, held wallet, loss limit.

**Funnel:** "short_balance_shown" fires at most once per sheet open.

### 3.5 Deposit and the return (flagged)

**Always the deck's layout.** Under the journey, `/wallet/deposit` always uses the one-screen layout; the pending-bet
strip appears only when `?bet=` is valid.
- The classic 5-tile form, including Card with its billing fields, moves whole to `/wallet/deposit/card`.
- "Lipa kwa kadi" links there, carrying `bet`.

**Order (deck frame 4)**
1. "‹" + title "Weka pesa"
2. strip "[NDIO] Dau lako la TZS 5,000 linakusubiri"
3. PayoutStatusNotice (only when payouts are delayed)
4. "Kiasi" (`AmountField` with `onValueChange` and full-figure labels)
5. chips
6. "Lipa kwa:" with the 4 rows
7. "Namba ya simu" (`PhoneInput`)
8. the PIN note
9. the inline code step, if unverified
10. "Lipa TZS X"
11. "Lipa kwa kadi"

- The loading skeleton mirrors this order when the flag is on.
- An amount typed below the shortfall shows the neutral line "Bado utapungukiwa TZS {gap} kwa dau lako"; Lipa stays
  enabled.

**Keeping the bet through every exit.** Hidden `bet` and `next` fields ride `carry`. Every `fail()` and the
EMAIL_UNVERIFIED branch return to journey mode with the amount recomputed server-side.

**"‹" back.** A deterministic `<a replace>` to the rebuilt pending-bet URL. The focused chrome is entered and left by
document navigation.

**Key lifetime.** A network retry reuses the key; a definitive failure mints a fresh one.

**`depositAction` with a journey `next`**
- CONFIRMED (mock) → redirect to `next`.
- PROCESSING → `/wallet/deposit/waiting?txn=…&next=…`.
- History uses `replace`.
- After a CONFIRMED deposit, the same shortfall needs an explicit "Weka pesa tena".

**Pending bet on the server.** A new nullable `Transaction.pendingBet Json?`, so notifications, the still-pending email
and the receipt can link back to the bet.

**`GET /api/wallet/deposits/[id]/status`**
- Owner-only. Missing and not-yours both return `UNKNOWN`, and a SECURITY audit is written.
- `private, no-store`, never prefetched, bypassed by the service worker.
- Buckets: `deposit.status` per user and `deposit.probe` per txn.
- **Selcom probe:** when PROCESSING, not CARD, and ≥20s old, it asks Selcom's signed order-status. It credits through
  `settlePaymentWebhook` (exactly-once). It may FAIL a deposit only on a signed terminal CANCELLED / USERCANCELLED /
  REJECTED, the same precedent as the card return leg (`wallet-service.ts:981`).
- The 15-second background lane stays confirm-only.
- The core is shared with `settleDepositFromReturn`.

**Waiting page** (it listens to `wallet:balance`, and all timers stop at a terminal state)

| State | Age / trigger | What the player sees |
|---|---|---|
| fresh | <1 min | "Weka PIN yako · usilipe tena" |
| slow | 1–10 min | still waiting |
| long | 10–30 min | the page polls itself (no background lane runs then); "hadi dakika 30 · usilipe tena"; receipt link |
| paid | — | "Pesa zimeingia", then `location.replace` to the pending-bet URL (sheet reopened, side and stake kept, never auto-placed). Shows the first-deposit identity notice when `firstDepositNoticeDue` |
| failed | — | "Hakuna pesa iliyotolewa", Jaribu tena (fresh key) / Rudi kwenye dau |
| held | RG lock during payment | a neutral "held for return" message, never "failed" |

Polling: every 3s for the first minute, then every 10s.

**Return-time states**
- Market closed or suspended → "Swali hili limefungwa", the funds are safe, 3 similar questions offered.
- Stake now invalid → clamped, with the refusal line.
- Still short → the low-balance state with the new shortfall.

**Card return fix (first).** Append `order_id` to the Selcom card `redirectUrl`/`cancelUrl`, and carry `bet` through
(MONEY-GATE §3.2, a live defect today).

### 3.6 Inline email code (S9)

**Storage and security**
- A new `Otp` purpose `email_verify`: bound to `userId` + the exact address, hashed, 30-minute TTL, 5 attempts.
- A wrong code charges an attempt on every live code.
- Issuing a code, or changing the address, consumes older codes.
- Rate limits are keyed by userId.

**Verification path**
- Extract `markEmailVerified(userId, email, via)` from `verifyEmailToken` (`email-verification.ts:243`). Both the link
  and the code call it; the audit action is `user.email.verified` with `payload.via`.
- The link carries a signed `next`, so "Rudi kwenye dau lako" works from the email.

**Email:** code first ("expires in 30 minutes"), then the link (24h). en and sw. The subject never contains the code.

**Placement**
- The form stays visible and prefilled. The 6-box step sits above Lipa, and Lipa enables on success without
  re-entering anything.
- No email on file → an email input + "Tuma msimbo".
- Covered states: wrong, expired, locked (countdown), resend cooldown.
- If the email is verified in another tab, the step polls (≤5s) and unlocks.
- On success, `router.refresh()` runs so the verify bar is gone app-wide.

**Records and copy**
- Erasure gets `otp.deleteAllForUser`.
- Retention doc updated; schema purpose comment updated.
- Copy keys `verifyGate*`, `verifyBannerText` and `errEmailUnverified` name the code.

### 3.7 Visitor path (S10)

**Guest sheet**
- Same as §3.3 but with no balance row. CTAs: "Jisajili uweke dau" (primary) / "Ingia".
- Links carry `next=<page>?bet=…` and `ref`/`invite`.

**After registering**
- Land on the origin page with `?bet=` and `welcome=new`.
- Balance 0 → low-balance → deposit (shortfall = stake) → code → PIN → waiting → back → confirm.
- With no `next` under the journey: `/?welcome=new`, not `/wallet/deposit`.

**Other rules**
- The deposit page's signed-out redirect keeps its full query.
- Old `?side=` links work.

### 3.8 How to Play (S7 static, S11 complete)

**Component**
- New `src/components/onboarding/how-to-play-sheet.tsx`.
- `first-visit-primer.tsx` is shelved **intact**. The shared keys and opt-ins move to
  `src/lib/onboarding/primer-keys.ts`, so `?primer=1` and `kp-primer-force` still work for the 24 QA drivers.
- **Seen key:** the new `50pick-howto-seen`, so every browser sees it once after the flip.
- **Order:** title + X (`showClose`) → steps 1/2/3 → MFANO → "Nimeelewa, anza" → "Weka mipaka · Msaada 0800 11 0011".

**Links**
- "Weka mipaka" → `/profile/responsible-gambling` when signed in, `/legal/responsible-gambling` when signed out.
- The helpline is `<a href="tel:{HELPLINE_TEL()}">`, with the new label key `howTo.helplineLabel` = "Msaada".
- Every exit persists the seen flag. Links close the sheet, then navigate.

**Copy:** side words come from `sideWord()`. The MFANO text is built with `fillNodes` from `HOW_TO_EXAMPLE`.

**Sizing:** height cap `max-h-[calc(100dvh-48px)] overflow-y-auto` (the proven 320×640 fix).

**Auto-open**
- Only on `/`, `/live`, `/results`, `/watchlist`.
- Kept exclusions: HIDE_ON `/^\/(auth|admin|s)(\/|$)/` and SUPPRESS_ON.
- Never on: `/wallet/**`, RG pages, `/updown/**`, `/markets/*`, a URL with `?bet=` or `?side=`, while any sheet is
  open, or while the player is on a break (`promoSuppressed`).
- The HeadlessChrome block is kept.
- Consent waits until the sheet closes.
- The deep link `/?howto=1` opens it.

### 3.9 Words and i18n

- A **string table** in VODACOM-PLAN.md: each deck string → key → sw (verbatim) → en → zh.
- Numbers and rates are always placeholders.
- `{amount}` renders inside a nowrap money span.
- **Rename sweeps at the flip:** "Weka pesa" action keys (`common.deposit`, `depositCta`, `addFunds`, `depositNow`,
  `udDepositCta`). **Before the flip, journey surfaces use new keys**, so players see no change.
- **Tiketi keys:** `positions`, `myPositions`, `yourPositions`, … (listed in S6). Support copy becomes "Ombi la
  msaada".
- **NDIYO → NDIO** everywhere, with a `test:labels` assertion.
- **"Maswali"** replaces the "masoko" destination wording on error, 404, email and verify surfaces, and on about 20
  `href="/markets"` links (re-pointed to `/` at the flip).
- **Rewritten for the flip (en/sw/zh):**
  - `failBalanceInsufficient`, `noBetYet`, `positions.noOpenBody`, `headlineBody`
  - `/help` FAQ `faq2a`, `faq3a`, `faq6a`
  - the chat assistant intents in `send-message.ts`
  - the Rules page (`_content-yes-no.tsx` §2/§3/§4 "Estimates shown before you bet")
  - Terms §4, with a `TERMS_VERSION` bump
- **Guard:** no live dictionary string contains dial / kidhibiti / 转盘 / conviction / imani.
- **Glyphs:** check ≈ (U+2248) and → (U+2192) against the served font subsets. If the fallback is visible,
  self-host a subset via `next/font/local`.

### 3.10 The agency's measures

**Counters (ship at S3b, so a baseline exists)**
- `JourneyFunnelDay (day, step, origin, variant, utm_source, utm_campaign, count)`.
- `POST /api/funnel` with an allow-list and no identifier or cookie. Automation user agents are skipped.
- Server counters run fire-and-forget after the money calls (`r.ok && !replayed`), never inside locks.
- House-bot rows are excluded per row (`houseBotId IS NULL`); staff, preview traffic and bots are excluded.

**Definitions:** each measure is a nested pair of events, so no ratio can exceed 100%.

| Measure | Numerator | Denominator |
|---|---|---|
| Home → sheet | sheet opens with origin=home | `/` views |
| Sheet → bet | bets with origin=sheet | sheet opens |
| Short → deposit | CONFIRMED deposits with origin=low-balance | low-balance states shown |
| Deposit → bet | bets with origin=deposit-return within 30 min | journey deposits confirmed |
| Time to first bet | median (first unmarked position − `createdAt`) | — |

`origin` is persisted on the deposit row and the position (new nullable columns).

**Old-journey analogues count from S3b** for ≥14 days before the flip. The flip cannot happen before the baseline is
complete.

**Reporting**
- Panel on `/admin/insights`: before vs 7/14/28 days after, filterable by campaign, with a weekly CSV/PDF export.
- Ali sends it to the agency every Monday for 8 weeks, then monthly.

**Privacy §7/§2:** the preview cookie (S1), the pending-bet marker, the how-to seen key, and the funnel totals with
campaign tags. Version bumps land in the same commit as each item.

---

## 4. Ripple map: where each change reflects (full per-file list goes in the tracker in S0)

| Change | Main files | Gates (when) | Docs superseded / updated |
|---|---|---|---|
| Header | `top-app-bar.tsx`, `wallet-balance-pill.tsx` (captioned variant), `brand.tsx` untouched | `red:header-fit` + anchors, re-proven at 320/360/390/1024/1150/1279 × sw/en/zh × guest/signed-in (detached); `qa:landmark-seal`; `test:tap-target`; `test:wallet-reach` | R1, L4, L20; UPDATE-2026-09-28 §1 |
| Tabs + Akaunti | `bottom-nav.tsx` (4 tabs), `nav-more.tsx` shelved, `src/lib/nav/active-tab.ts`, `app/account/page.tsx`, `manifest.json` shortcuts | **Same commit as the page**: `test:route-census` (PLAYER-QUERY-CAMPAIGN §4 row, bucket D), `test:measure` (tier), `scripts/responsive-audit.mjs` PLAYER list; `test:section-rail`, `test:stacking`, `test:shell-boundary` re-pointed to the hub (one plain `<a href=/admin>`), `test:withdrawn-features` Alika row + red anchor | WP1b, V26 |
| Home | `app/page.tsx` → journey. Shelved: `legacy-landing.tsx`, `components/home/*`, `lib/markets/hero.ts`, `landing.ts`, `lib/server/landing-picks.ts`, `updown-band-round.ts`, `payout-rails` hero fns. `platform-stats.ts` **stays** (ticker) | `test:hero-contract`, `test:landing-contract`, `test:featured-card`, `test:one-sided` §7.2 re-pointed to `legacy-landing.tsx`; `test:ticker-honesty` §11; `test:landing-mine`, `qa:ghost-landing` §A; 13 `qa:landing-v3:*` split (park: capture, rows, hero-mine, seed-onesided, wp6, local; keep: share-drive, c1, wallet, …) | LANDING-TEN (via R18), manifest L1, R4, R5, R7, R9, R14–R17 |
| Card estimate | `market-card.tsx` journey + settled variants, `live/pulse-grid.tsx`, similar-markets; `estimatedWinningsRate` retired on polls | `test:one-sided` §8.9 (new) + red; V16 rewritten at the flip (estimate only with ≈, and the Makadirio line only in the sheet); V17, V18; `test:share-preview` (no multiplier) | §C3 (scoped), R3, L11, COMPLIANCE 2026-07-23 D3, RULES §4 |
| Bet sheet | new `components/journey/bet-sheet*.tsx`, `BetSheetHost`. Shelved **in place**: `conviction-dial.tsx`, `bet-confirm-modal.tsx`, `side-picker.tsx`, `lib/dial-stake.ts`, `house-lean-warning.tsx` | `test:dial-stake` **unchanged** (shelved dial's unit test). New `test:bet-sheet` (+ V20 focus / Esc / safe area / Back / keyboard / Enter). `test:market-result-announce` DIAL becomes a list [dial, sheet]; `test:feedback-law`, `test:failure-reasons`, `test:popup-fit`, `test:stacking`; `qa:live` §[F] and `live-place-bet.mjs`, `live-rg-break.mjs` rewritten dual-mode (read rollout from `/api/health`) | CLAUDE.md "Betting flow invariant", "UX commitments", "Conviction dial" (at the flip); RULES §2.1/§2.3; manifest R2 |
| Deposit | `wallet/deposit/page.tsx` journey mode, `/wallet/deposit/card` (classic moved), `/waiting`, `actions.ts`, `provider-radio-grid.tsx` (+rows/noDefault), `phone-normalize.ts`, `wallet-service.ts` (status core, ceilings), `payments.ts` card `order_id` | `test:deposit-gate`, `test:msisdn-prefill` (extended), `test:payments`, `e2e:money`, `test:kyc-at-withdrawal`, `test:gold-is-money`; new `test:deposit-return`, `test:deposit-status-read`, `test:deposit-ceiling` | MONEY-GATE §3.2; audit M9 (journey only) |
| Email code | `email-verification.ts`, `store.ts`/`prisma-dal.ts` Otp, `erasure.ts:443`, `email.ts` template, `profile/actions.ts` | new `test:email-code` + red; `test:dal-parity`; `test:privacy-notice` | DATA-RETENTION |
| How to Play | new `how-to-play-sheet.tsx`, `primer-keys.ts`; `first-visit-primer.tsx` + `how-it-works.tsx` shelved intact; slogan on ~12 surfaces (auth rail, root metadata, manifest, OG routes, `reports/brand.ts`, legal subtitle, `public/og/*.png`) | `test:popup-fit`, `test:stacking`, `test:marketing-optout`, `test:hero-copy` §5 moved to new surfaces | MOBILE-VISUAL U16 (D4 bullet only) and U18 (primer bullet only); LANDING-TEN §0 item 4 |
| Short titles + competition | `schema.prisma` + hand-written additive migration, 5 create paths, audited admin edit, `ai-poll-generation.ts`, `market-sentinel.ts` agreement check, `chain-purge.ts`, `backup/core.ts`, `lib/localized.ts`, search fields | `test:dal-parity`, `test:migration-ownership`, `test:dead-schema`, `verify:backup-schema`, `test:chain-purge`, `test:ai-polls`, `test:sentinel-guards`, `test:trilingual`, new `test:short-title-fit` | DATA-RETENTION §7 |
| Measures | `JourneyFunnelDay`, `/api/funnel`, `journey-funnel.ts` (Prisma + memory twins), `retention.ts` prune, `insights.ts` | new `test:journey-funnel`; `test:funnel-share` (no ratio > 100%); `test:insights` | Privacy §2/§7; E-103 amended |
| Certification | `MODULE-CERTIFICATION-PROGRAM.md` dossiers H4, E2, C1, C2, A4, H1, J1, K7, L2, L6 marked "changing under VODACOM-PLAN" | `test:cert-c1`, `test:cert-c2` stay green | still 52 modules |
| ~~Palette / fonts / brand~~ | none (ruling 5) | colour laws unchanged | none |

**Landing-v3 programme**
- **R18** is added to the v4 INHERIT-MANIFEST: "superseded by the Simplified Journey". Only the unbuilt rows WP5, V21
  and WP20 are set to ⛔ R18. `test:landing-ten-plan` stays green.
- **Superseded:** PANEL, V21, V24, V26, hero verdicts.
- **Kept:**
  - V22's negative half (no "first" claim);
  - V15, re-pointed (first card's buttons above the tab bar at 360×740);
  - V19, redefined (Withdraw ≤1 tap from the Salio capsule and Akaunti);
  - V20 (sheets);
  - V23;
  - FUNNEL, absorbed by §3.10.
- **Carried over:** the "Paid out to players" house-bot money-truth defect (`platform-stats.ts:186`); check the
  ticker's "won" rows for the same class.

---

## 5. Sessions

Every session runs the same loop:
1. **Worktree:** `C:\kipindi-journey`, branch `simple-journey`, with a **real** `node_modules` (never a junction).
2. **Code:** two-store tests, `red:*` twins reachable from `red:all`, and declared anchors.
3. **Red anchors:** `npm run test:red-anchors` after refactors.
4. **Suite:** `test:all` before each push. Heavy Node only through `~/heavy-node-lock.sh`; red harnesses run detached,
   never piped.
5. **Visual check:** real-browser viewport tiles, read one by one.
6. **Ship:** merge to main, push, and verify the deploy commit on 50pick.tz.
7. **Records:** tracker row + SHELVED.md row for anything newly flag-hidden + memory, in the same pass.

**Gate names:** write a gate with the npm-run prefix only once its key exists in `package.json` (the `test:docs` rule).

**What players see before the flip:** nothing, except the pre-flip list in S0. That list covers the bug fixes that
ship early on purpose: the card `order_id` fix, the PhoneInput on the classic page, the NDIYO sweep, the timer-date
hardening. Everything else is behind `simpleJourneyFor`.

**S0 — File, rule, get ready (docs + environment)**
- **Filing**
  - Deck + 5 PNGs → `docs/design-system/v5-2026-09-29-simplified-journey/`, with its `INHERIT-MANIFEST.md` (SJ-1…24)
    and `AGENCY-REPLY.md`.
  - This plan → `docs/VODACOM-PLAN.md`: §0 RESUME AT, the board S0–S16 with an S5 tombstone, the string table, the
    pre-flip list and the full ripple map. Guard `test:vodacom-plan` + red. NEXT-PLAN ▶ row.
  - `docs/SHELVED.md` skeleton: item, files, why, date, how to re-mount, test. Lines with paths never say
    "removed/deleted".
- **COMPLIANCE-DECISIONS entries:**
  - pre-bet estimate (§C3 scope, law 40)
  - one-tap bet (BetConfirmModal and its 10s hold retired)
  - one-tap Lipa (M9, journey only)
  - "bet what you have"
  - in-sheet shortfall deposit prompt (RG record)
  - claim, slogan and tagline
  - the first-screen RG row moving to header/footer/How-to
  - short titles
  - the regulator answer
  - the number default (E-210/E-215 amended)
  - the status read failing on a signed terminal verdict
  - ticker off `/`
  - How-to copy truth (step 3)
  - Jay #6 kept
- **Rulings and laws**
  - DESIGN_AUTHORITY: new laws dated, "effective at the S15 flip" (§C3 scoped amendment, kit additions from §2).
  - v4 manifest R18; MOBILE-VISUAL U16/U18 bullets re-targeted; certification dossiers marked.
  - A CLAUDE.md note listing the sections that change at the flip.
- **Readiness**
  - Create the worktree; `npm ci` in it under the lock; `npm i -D --no-save embedded-postgres@18.3.0-beta.17`;
    `prisma generate`. The shared `C:\kipindi-main` currently lacks Prisma.
  - Stop the office-PC landing lane, and record its unmerged branches in SHELVED.md.
  - Memory: `project_kipindi_simple_journey.md` + index line; Landing v3 / Mobile Visual lines marked partly
    superseded.
- **Done when:** docs are pushed, `test:docs` and `test:landing-ten-plan` are green, and the reply is ready for Ali to
  send.

**S1 — The switch and preview**
- `RolloutState = WITHDRAWN | STAFF_PREVIEW | ACTIVE` for `simpleJourney`, separate from `FeatureState`.
- `simpleJourneyFor(role, previewCookie)` is resolved in AppShell **and** on each page. A test asserts they agree for
  guest, player, staff, cookie and expired-cookie viewers.
- **Instant kill:** a DB-backed /admin toggle (two halves, like `desk`). `FEATURE_SIMPLEJOURNEY` env is the hard
  override (a Railway variable change = a redeploy).
- **Preview cookie**
  - HttpOnly, Secure, SameSite=Lax; HMAC with its own secret; `{issuer, exp ≤24h, nonce}`.
  - The issuer must still be staff on each request. Set and clear are audited.
  - Ignored on `/admin` and when WITHDRAWN. `Cache-Control: private, no-store`.
  - Set, clear and sign-in/out are hard navigations.
- **Agency link:** signed, 7-day, revocable, logged.
- **Same commit:** Privacy §7 cookie entry (en/sw/zh) + the `test:privacy-notice` census; `test:orphan-actions`;
  `test:control-gates`; `test:simple-journey-flag`.
- **Done when:** staff see a "preview" marker on production and nobody else sees anything.

**S2 — Short titles + competition**
- Columns: `shortTitleEn/Sw/Zh` (nullable) and `competition` (key from `src/lib/markets/competitions.ts`: `ligi-kuu`,
  `epl`, …, labels in the dictionary).
- **Migration:** hand-written, additive (`ADD COLUMN IF NOT EXISTS`), timestamped after the latest migration on main.
  Never `prisma migrate diff`.
- **Writers:** all 5 create paths plus the audited admin edit (with a 2-line warning).
- **AI generator:** "Je, …?" form, ≤2 lines at 360 (sw/en ≤56, zh ≤28 chars), GSM-7-safe normalisation. The sentinel
  checks agreement with the full question.
- **Backfill:** AI drafts for every open market, approved by an admin. Cards fall back to the full title clamped to 2
  lines.
- **Done when:** every open market renders within 2 lines in 3 languages (`test:short-title-fit`).

**S3 — The engine (no UI):** §3.1 in full, with its tests and red twins.
- **Done when:** the golden fixtures pass and parity is proven.

**S3b — Measures baseline (moved up):** the §3.10 counters on the **old** journey's analogues, plus
retention/backup/DAL and the privacy lines.
- **Done when:** counts appear daily, and the 14-day baseline clock starts.

**S4 — Claude Design pass** (see §6)
- Frames for the new compositions and every undrawn state, in 50pick's system.
- Four-expert panel. Brief filed as `design-brief/simple-journey-2026-09/BRIEF.md` (§0b outbound row, with a
  `.gitignore` exception).
- Ali reviews the 5 re-drawn frames side by side (one Artifact, numbered choices).
- **No player-facing UI code before this is filed.**

**S5 — tombstone:** removed by ruling 5 (no palette, font or brand work).

**S6 — Shell (flagged)**
- Header states (SJ-15); the 4 tabs, `activeTabFor`, `--rail-h`; the guest Tiketi sheet.
- The journey's own unread count (`useUnreadCount`, `src/lib/journey/use-unread-count.ts`; S6-PLAN A1) feeding the tab badge and the hub row. The classic bell keeps its own poll; a store shared with it waits for S15.
- The Akaunti hub (SJ-17).
- Tiketi zangu: rename, content, and a Maswali | Juu/Chini switch to `/updown/history`.
- The `surfaces.ts` list; the EmailVerifyBanner rule; overlay stand-downs; the header-fit re-proof.
- **Done when:** every route keeps an entrance (census) and the header fits in all cells.

**S7 — Home and cards (flagged):** §3.2 in full, plus the How-to card wired to a **static** How-to sheet.
- `test:journey-above-fold`: at 360×640 and 390×844 (sw/en/zh, guest and signed-in, with all bars up), the How-to card
  sits above the fold and card 1's buttons end above the tab bar.
- `qa:cls-budget`.
- **Done when:** staff see the deck's home on production.

**S8 — Bet sheet + low balance (flagged):** §3.3 and §3.4.
- Checks whether `test:rg-doors` requires a limits link (SJ-22).
- **Done when:** `test:bet-sheet`, V20 and the refusal matrix pass, and a staff real bet works on production.

**S9 — Deposit, email code, waiting and return (flagged):** the card `order_id` fix first, then §3.5 and §3.6.
- **Done when:** `test:deposit-return`, `test:deposit-status-read` (exactly-once while racing the webhook) and
  `test:email-code` pass.

**S10 — Visitor path:** §3.7, plus `test:post-register-landing` in both flag states, plus `ref` carried through.

**S11 — How to Play complete:** §3.8 auto-open rules, plus the flip-ready copy: FAQ, chat intents, rules page, terms,
tagline, OG re-renders.

**S12 — Consistency sweep**
- **Juu/Chini:**
  - the stake panel in the journey language;
  - the low-balance → deposit → back flow; a closed round goes to the next round with side and stake kept;
  - the multiplier grammar "Shinda ≈{mult}× dau" with floor mode;
  - `round-stake-panel.tsx:249` `text-no-300` → a state token.
- **Admin:** Approve/Reject move off `btn-no` to `btn-danger`.
- **Outside the site:**
  - emails and notifications use short titles;
  - OG/share images carry the short title with no multiplier;
  - the manifest (Maswali shortcut, Tiketi shortcut, name, a screenshot re-captured after the flip);
  - SMS: no titles today, and GSM-7 for any.
- **Also:** the NDIYO sweep and the "Paid out" defect.

**S13 — Measures panel and reporting:** the panel, CSV/PDF export, the definitions table and the agency cadence.

**S14 — Proof before the flip**
- `e2e:journey`: guest → sheet → register → low balance → deposit (mock rail, dev outbox code) → waiting → back →
  manual confirm. Only then does a position exist.
- Drives: 320/360/390/768/1024/1280/1440 × sw/en/zh × guest/signed-in, including keyboard-open (CDP) and short
  heights.
- A per-frame **identity checklist**: each deck element, in order, with its string, ticked against the 50pick
  screenshot. The look is checked against DESIGN_AUTHORITY, not against the PNG. Shots go to
  `.qa-shots/simple-journey/` (gitignored).
- Adversarial refute plus mutation audit.
- Staff run **one real TZS 1,000 journey** on production behind the preview.
- The **predeploy gate census** with each flip-time rewrite, prepared on a branch. `qa:live` is dual-mode.
- Agency preview link + a side-by-side PDF; their **written sign-off** is recorded (or Ali overrides).

**S15 — Launch (one commit, after the baseline is complete and sign-off is in)**
- `simpleJourney = ACTIVE`.
- The rewritten ruling gates: V15, V16, V19, V22-negative, V25 ("one Deposit per non-inert region"), V26 → 4 tabs,
  `test:rate-copy`, `test:one-sided` + red.
- The dictionary action-key convergence; re-pointing bare `/markets` links; Rules + Terms (+`TERMS_VERSION`); CLAUDE.md
  sections; the tagline on ~12 surfaces; the `/admin/config` copy.
- `sw.js` `CACHE_NAME` bump + manifest.
- `test:deploy-skew` with an open sheet and a waiting page.
- Re-measure on production as `mobile01`, including one real deposit → back → bet.
- **Rollback triggers:**
  - any money-invariant alert;
  - bets placed per day < 70% of baseline for 3 days;
  - deposit-confirm rate down more than 20%;
  - a P1 defect.

  Response: the /admin kill (instant) or the env override. Record it.
- Send the agency the real screenshots and the first report.

**S16 — Shelve (≥7 days after launch; go only with no rollback, the measures in bounds, and the agency acknowledged)**
- Unmount the old branches and remove the preview machinery (cookie signer and reader, toggle, env) **together**.
- Components stay **in place**: no `_shelved` folder, no moves (about 90 guard pins name these paths).
- **Guards:**
  - No allow-list growth.
  - `test:dead-css` counts classes named in `src/**` as live, so no baseline change.
  - `test:chart-one-home` EXEMPT is shrink-only and still matches.
  - `test:orphans` covers `scripts/` only, and shelved unit-test scripts stay wired.
  - `test:i18n` has no unused-key check; shelved keys are listed in SHELVED.md.
  - New `test:shelved` + red: every SHELVED.md row exists, compiles, is unmounted, and has its test wired.
- The `/markets` redirect becomes 308; `TICKER_ROUTES = ["/live", "/results"]`.
- The rollout test becomes a "state is gone" guard.
- LANDING-TEN is closed with a pointer to SHELVED.md.
- **Rollback after S16:** revert the S16 commit, or re-mount from SHELVED.md.

---

## 6. Claude Design: needed, in a focused form

**Is it needed?** The deck's 5 frames need no new design. They are templates, built from 50pick's kit per §2. Claude
Design **is** needed for:
- **(a) 14 new compositions:**
  - captioned balance pill;
  - How-to card;
  - How-to step list;
  - compact estimate row;
  - 2-line deposit action row;
  - wallet radio rows;
  - `Input` grouped + attention states;
  - focused deposit chrome;
  - pending-bet strip;
  - email-code step;
  - waiting states;
  - Akaunti hub;
  - guest Tiketi sheet;
  - the journey card's settled variant.
- **(b) About 30 undrawn states**, and **(c) the desktop layouts**.

**Who runs it:**
1. I create it as an Artifact of type Design in S4, using 50pick's design system if the account has one; otherwise I
   attach DESIGN_AUTHORITY excerpts, token values and kit screenshots.
2. The four-expert panel scores it.
3. Ali reviews it.
4. It is filed.

**Paste-in brief**

> Extend **50pick.tz** (licensed Tanzanian YES/NO prediction market; Swahili first, English and Chinese too;
> mobile-first).
>
> **WHAT happens comes from the agency's 5 frames (attached).** Flow, element order and copy must be identical.
>
> **HOW it looks comes from 50pick's own system (attached):**
> - `DESIGN_AUTHORITY.md`
> - the `globals.css` tokens
> - Sora / Inter / JetBrains Mono (money figures)
> - the kit components mapped in plan §2
>
> **Never copy the agency's colours, typeface or wordmark.**
>
> **Deliver at 320, 360 and 412 px, plus 1280 px where ◆. Numbered choices where you are unsure.**
> 1. **The 5 agency frames re-drawn** in 50pick's system, side by side with the originals, plus a component-mapping
>    sheet.
> 2. **Header.** Signed-in; guest (Ingia/Jisajili); held wallet; the 360 fit of mark + 18+ + captioned Salio +
>    "Weka pesa". ◆ Desktop header with the 4 destinations plus language, bell and avatar.
> 3. **Home.**
>    - Loading skeleton; 7 chips scrolling; empty category.
>    - Card states: priced / Kuwa wa kwanza / Upande mmoja tu / Inafungwa leo / Siku {n} / selection closed / with
>      and without competition / longest sw title at 2 lines / settled variant.
>    - "Onyesha zaidi".
>    - ◆ Desktop grid.
> 4. **Bet sheet.**
>    - Guest; stake below min / above max; estimate updated; legacy (no figure); one-sided refund.
>    - Holder / hedge line; bonus warning; thin-upside.
>    - Placing; success receipt.
>    - Closed; refusals as blocking in-sheet states: loss limit, self-excluded, cooling-off, blocked, frozen,
>      session limit, rate-limited, busy / Jaribu tena, maintenance.
>    - Keyboard open at 360×640.
>    - ◆ Desktop centred dialog.
> 5. **Balance too low.** 0 / 1 / 2 options; balance 0; below the 500 minimum; deposit pending; limit reached; SoF;
>    held wallet; 4 wallets on the sub-line.
> 6. **Deposit.**
>    - Focused chrome.
>    - Code step: no email on file / wrong / expired / locked / resend.
>    - No history (nothing preselected, Lipa disabled); paused wallet; Mixx 4th row; "Lipa kwa kadi"; typed below
>      the shortfall.
>    - Payout-delayed notice.
>    - Waiting: fresh / slow / long / paid / failed / held.
>    - Return: closed market / clamped stake / still short.
>    - ◆ Desktop.
> 7. **How to Play.** en / zh lengths; 320×640 scroll. ◆ Desktop.
> 8. **Akaunti.** Signed-in / guest, and the staff row.
> 9. **Tiketi zangu.** Maswali | Juu/Chini switch; open / settled; cash-out terms; absolute dates.
> 10. **Market page.** Full wording + source + pool + chart + both countdowns with absolute dates + the holder's ticket
>     block above the two big buttons.
> 11. **Juu/Chini.** Stake panel and low-balance state in the same language.
>
> **Rules.**
> - Every colour, font, radius and motion comes from 50pick tokens.
> - YES/NO ink only for sides.
> - Warnings use the factual/neutral family; never gold, danger or NO for app state.
> - Tap targets ≥44 px; contrast AA.
> - "≈" on every estimate; the Makadirio line only in the sheet and MFANO.
> - Helpline "0800 11 0011".

---

## 7. Verification

**Local**
- Worktree; `rm -rf .next`; `next dev` on **localhost** with the in-memory store and `DISABLE_ADMIN_TOTP=true`.
- Playwright drives every state in §5 S14. Read the viewport tiles.

**Money**
- `e2e:money` + `e2e:journey` on embedded Postgres.
- **Must stay green:** `test:deposit-gate`, `test:msisdn-prefill` (extended), `test:payments`,
  `test:money-invariants`, `test:bet-admission`, `test:failure-reasons`, `test:rg-*`, `test:withdrawn-features`,
  `test:client-graph-safe`, `test:house-bot-*`, `test:timer-date` (+ `red:timer-date` detached), `test:dial-stake`,
  `test:deploy-skew`.
- **Rewritten at the flip:** `test:one-sided`, `test:rate-copy`, V15/V16/V19/V22/V25/V26, `qa:live`.

**Production**
- The deploy commit via `/api/health` or `?dpl=`.
- Staff QA behind the preview; the agency via their link.
- After the flip, as `mobile01`: one real TZS 1,000 deposit → back → bet.

**Final:** an adversarial refute audit + mutation proof. "Done" is claimed only after that.

## 8. Risks

- **The laptop (RAM crashes):** one lock job at a time, fleets in slices, short workflows. The audit's first run was
  lost this way.
- **Parallel lanes:**
  - marketing-s9 writes `schema.prisma`, migrations, `prisma-dal.ts`, `store.ts`, admin nav, `roles.ts`,
    `package.json`;
  - house-bots targeting writes admin screens;
  - landing-v3 (office PC) was writing `page.tsx`, `globals.css`, `i18n-dict.ts` and must stop.

  Rebase the worktree daily, order migrations after main's latest, and re-run the journey suites whenever main moves.
- **Harm markers:** journey top-ups feed RAPID_DEPOSIT_ESCALATION and CHASING_LOSSES, which also suppress marketing.
  Watch them next to measure 3.
- **M-Pesa has never confirmed above TZS 50,000 (E-231):** large shortfalls may sit pending. The waiting page's copy
  covers it, with no guessed ceiling.
- **The 360 header budget and the headline 2-line fit:** measured in S4/S6, not assumed.
