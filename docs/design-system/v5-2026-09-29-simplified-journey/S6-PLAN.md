# S6 — the flagged shell: build plan (2026-10-01)

> The working plan for VODACOM-PLAN S6. Produced by a read-only mapping workflow (7 subsystem researchers → a planner →
> an adversarial critic, 2026-10-01), then amended by the coordinator: **the amendments section at the end overrides
> anything above it.** Status lives in `docs/VODACOM-PLAN.md` §0i; this file is the how. Line numbers are as read on
> 2026-10-01 at `edbbb96a` — re-read before editing.

## Summary

S6 builds the journey shell as NEW components. AppShell swaps them in only when the one cached resolver says this request is a journey request: `journeyShown`, from `resolveSimpleJourney()` (journey-preview.ts:248-255, read at app-shell.tsx:368). Lines app-shell.tsx:390 and :472 become ternaries whose else arms are today's `<TopAppBar …/>` and `<BottomNav …/>`, with today's props.

Because top-app-bar.tsx, bottom-nav.tsx and nav-more.tsx are not edited, and the classic WalletBalancePill JSX is not edited either, every classic red anchor and sole-match locator still resolves exactly once:
- wallet-reach;
- header-fit `<span className="hidden xl:inline">`;
- section-rail at bottom-nav.tsx:295;
- stacking at :191/:193;
- tap-rung (the CashEye);
- layout-staleness (the SSE listener at wallet-balance-pill.tsx:60).

A non-flagged visitor gets the same elements with the same props, so the same HTML and the same RSC payload. A new local drive, qa:classic-shell-parity, proves this against a pre-S6 baseline.

**Order (13 packages, each green on its own):**
1. Baseline and the parity harness.
2. journey.* words.
3. Pure modules: activeTabFor, isJourneySurface, the header-state truth table, viewerDoorsFor, and useJourneyOn with JourneyFlag. These come with test:journey-shell and an in-process red twin.
4. One shared unread store (useUnreadNotifications). The bell is refactored onto it, output-identical.
5. The captioned balance, plus WalletSheet's journey words.
6. The /account hub, which calls notFound() for every non-journey request.
7. Header, tabs and the guest Tiketi sheet, unmounted.
8. The shell swap, together with the route-entrance census and the journey header-fit gate and its red twin.
9. Overlay stand-downs and the email-bar rule.
10. The short-title projection (two stores).
11. The Tiketi zangu view, with the Maswali | Juu/Chini switch.
12. The journey sell look.
13. --rail-h, then proof, merge and deploy.

**Corrections to the maps, verified in the files:**
- An up/down-arrows glyph already exists: `I.trade` (glyphs.tsx:100).
- test:filter-language §0.6–0.9 counts any new FilterPill group. So the hub's card-size and language controls must not use FilterPill.
- red-all's `--skip` is a substring match (red-all.mjs:101). `--skip header-fit` therefore also skips the new journey harness.
- red-all's 300 s per-harness timeout (red-all.mjs:87) is too short for the header matrix.
- The avatar menu's "Nafasi" row is hard-coded (avatar-menu.tsx:368), so it shows on journey desktop until S15.
- notif.unreadOne/unreadN, nav.cardSpacingHint, performance.viewPerformance and formatClock (utils.ts:358) already exist and are reused.
- `/auth/demo?deposit=0` plus `POST /api/dev-test/seed-wallet` can set any balance, so no new dev-test route is needed.

**Found:** a live defect for every player today. away-summary-bar.tsx:143 links to `/positions?filter=settled`, but parsePortfolioParams (portfolio.ts:148-161) reads only `?tab`, so the link lands on "all".

Names marked "new" below are proposals. Their package.json keys do not exist yet.

## Work packages

### WP0 — Baseline: today's reds, a classic-shell parity harness, the S6 record (S; depends on nothing)

**Goal.** Know exactly which gates are red before S6 touches anything, and capture what a non-flagged visitor is served today, so every later package can prove 'unchanged' rather than assert it.

**Files.**
- scripts/qa-classic-shell-parity.mjs (new)
- package.json (new key qa:classic-shell-parity)
- docs/VODACOM-PLAN.md (§0 RESUME, new §0i 'S6 as built', §1 S6 row to 🔨, §0h points 6+)
- C:/Users/Ali/.claude/projects/C--Users-Ali/memory/project_kipindi_vodacom_plan.md

**Steps.**
1. Run detached under `bash ~/heavy-node-lock.sh run s6 …` on the branch tip:
   - `npm run test:all -- --skip responsive,motion`;
   - `npm run red:all -- --skip results-filter,header-fit`;
   - `npm run test:red-anchors`.
   Record every red by name with its number in §0i. Re-derive them, never copy them. The plan's §0d–§0f record: type-scale, red-anchors 4.1/4.2 (66 vs UNDECLARED_CEILING 65, red-anchors.test.mts:288), house-bot-disclosure 5.1, tap-target, decomment, and section-rail offenders (section-rail.test.mts:263).
2. Write scripts/qa-classic-shell-parity.mjs. Copy the refusal from qa-journey-preview.mjs:22-34: it runs only against http://localhost and refuses a configured database.
   - **Viewers:** guest; `/auth/demo`; `/auth/demo?hold=officer`; `/auth/demo?email=unverified`.
   - **Matrix:** 360/768/1024/1280 × en/sw.
   - **Routes:** `/`, `/markets`, `/positions`, `/wallet`, `/profile`, `/account`.
   - **Captured per cell:**
     - normalized outerHTML of `header.app-topbar`, `nav.kp-rail`, `footer` and `[data-testid=email-verify-banner]`;
     - the set of fixed overlays present after 3 s;
     - computed footer padding-bottom and html scroll-padding-bottom;
     - /account's HTTP status and main text.
   - **Normalized:** React useId tokens, `?dpl=`/chunk hashes, relative times.
   - **Modes:** `--baseline <file>`; `--compare <file>` (exit 1 on any diff); `--prove-red`, which injects a style into the header via addStyleTag and must report a diff.
3. `rm -rf .next`, then start an in-memory dev server under the lock, browsing http://localhost:<port> only:
   `SESSION_SECRET=… OTP_PEPPER=… DISABLE_ADMIN_TOTP=true npx next dev -p 3041` with no DATABASE_URL.
   Capture the baseline from this pre-S6 tree into the scratchpad.
4. In the same drive, measure the classic signed-in header at 320 and record the figure in §0i. DESIGN_AUTHORITY.md:2434 files it as 21px over, possibly stale. Report only; it is not S6's to fix.
5. Update docs in this pass: §1 S6 row to 🔨, §0 RESUME, memory.

**Flag gating.** No product code changes. The new script is local-only and writes only to the scratchpad.

**Tests.**
- qa:classic-shell-parity --prove-red: the built-in control must report a diff, or the harness is broken
- test:orphans: the new script is wired
- test:docs and test:vodacom-plan: the S6 row shows 🔨, with no ✅ before a commit

### WP1 — Every S6 word as a journey.* key (en/sw/zh) (S; depends on WP0)

**Goal.** Give every new journey surface its own keys, so no existing value changes before the S15 flip (§3.9).

**Files.**
- src/lib/i18n-dict.ts (journey namespace: en :2866-2889, sw :5160-5180, zh :7433-7453)
- docs/VODACOM-PLAN.md (§3 table rows; the 'Tiketi keys' rename list for S15)
- docs/design-system/v5-2026-09-29-simplified-journey/S4-COPY-AUDIT.md (mark the NO STRING items now drafted)

**Steps.**
1. Add the keys listed in newDictionaryKeys.
   - sw is verbatim from the §3 table where a row exists, and from the canvas words otherwise.
   - zh uses formal 您, 注单 for 'ticket', 充值 for 'deposit', and break-keep.
   - Placeholders are {n}, {time}, {amount}, {date}, {yes}, {no}.
2. Reuse these existing keys and copy none of them:
   - nav.updown, nav.primary, nav.cardSpacingHint, nav.densityCompact/densityComfortable;
   - common.signIn/signUp/close/wallet/staffConsole/verifyId/proposeEarn/signOut/balanceFrozen/profile/results/settings;
   - profile.signOutConfirm*, profile.inviteFriends;
   - footer.setLimits/takeABreak/selfExclude/helpline/resolutionAttestation/privacyNotice/amlKyc/terms/gameRtp/playSafe/privacy;
   - notif.unreadOne/unreadN (i18n-dict.ts:2028-2029);
   - performance.viewPerformance (:1919);
   - agent.footerLink/dashTitle.
3. Never edit an existing value. That covers nav.cardSpacing 'Nafasi ya kadi', profile.helpSupportSub, profile.responsibleGamblingSub and every 'Nafasi'/'Amana' key. The corrected words live in the journey copies until the native review (§0h point 3).
4. Write the S15 'Tiketi keys' rename list into §3. The exclusions where 'nafasi' means something else are common.busyBody, dialog.busyHolding, nav.cardSpacing and market.oddsLong.

**Flag gating.** Only journey files, which are not mounted yet, read the new keys. Every classic surface reads its unchanged old keys, so no visible word changes for anyone.

**Tests.**
- test:i18n: en/sw/zh parity, sw≠en, placeholder parity
- test:translation-safety
- test:kyc-copy-truth
- test:rate-copy: no cap or fee typed into the dictionary
- test:house-bot-disclosure 5.1 goes red by construction on a dictionary change (§0e). Re-derive and record it; do not 'fix' it.

### WP2 — Pure modules: activeTabFor, isJourneySurface, header state, viewer doors, journey flag (M; depends on WP1)

**Goal.** Put every decision the shell makes in one pure, tested place before any markup uses it.

**Files.**
- src/lib/nav/active-tab.ts (new)
- src/lib/surfaces.ts (+ isJourneySurface)
- src/lib/journey/header-state.ts (new)
- src/lib/journey/viewer-doors.ts (new)
- src/lib/journey/journey-on.ts (new, client hook, no directive)
- src/components/journey/journey-flag.tsx (new, 'use client', unmounted)
- scripts/journey-shell.test.mts (new)
- package.json (new: test:journey-shell, red:journey-shell = '… --prove-red'; append to predeploy)

**Steps.**
1. **active-tab.ts** (pure: no imports from server, no directive). Model it on admin-nav-groups.ts:361 activeKeyFromPath.
   - `JourneyTab = 'questions'|'updown'|'tickets'|'account'`.
   - `JOURNEY_TABS` holds href `/`, `/updown`, `/positions`, `/account`, with glyph keys questionCircle (glyphs.tsx:362), trade (:100), ticket (:182) and user (:174), and label keys.
   - `activeTabFor(pathname)` reads ONE ordered prefix table:
     - `/` and `/markets*` → questions;
     - `/updown/history` → tickets, listed BEFORE `/updown`;
     - `/updown*` → updown;
     - `/positions*` → tickets;
     - `/account` → account;
     - the hub-reached prefixes (`/wallet`, `/profile`, `/notifications`, `/results`, `/live`, `/leaderboard`, `/fairness`, `/help`, `/legal`, `/proposals`, `/agent`, `/watchlist`) → account, following the classic `moreActive` precedent at bottom-nav.tsx:161;
     - `/auth*`, `/s*`, `/offline` → null.
   - `assertTabKeysResolve()`.
2. **surfaces.ts.** Add `export function isJourneySurface(path: string | null): boolean` as an EXACT allowlist, not a prefix denylist: `/`, `/positions`, `/updown/history`, `/^//markets//[^/]+$/`, `/^//wallet//deposit(//|$)/`.
   - Leave `export function isMoneySurface(` (the red:install-invite anchor) and COMMIT_ROUTE exactly as they are.
   - Add no import and no directive.
3. **header-state.ts.** `journeyHeaderState({isAuthed, balance, walletHeld, onBreak, pathname})` returns `{capsule: 'none'|'balance'|'held', pill, authPills}`.
   - `pill = isAuthed && !walletHeld && !onBreak && !pathname.startsWith('/wallet/deposit')`. This is top-app-bar.tsx:283 plus the S4 break rule.
   - capsule is shown when `isAuthed && balance != null`; held when walletHeld.
   - `authPills = !isAuthed`.
4. **viewer-doors.ts.** `viewerDoorsFor({inviteViewer, invitePayable, agentEnabled, proposalsState, role})` returns `{inviteVisible, invitePaid, agentDoorVisible, proposalsVisible, staffConsole}`. It uses the same formulas as app-shell.tsx:330/345/363/317, plus `isStaffRole(role)` from server/roles.ts (decision 3).
5. **journey-on.ts.** `useJourneyOn()` is a useSyncExternalStore over the window event '50pick:journey-flag'.
   - getSnapshot: `document.documentElement.hasAttribute('data-journey')`.
   - server snapshot: false.
   
   **journey-flag.tsx.** Renders null. An effect sets data-journey on `<html>` and dispatches the event; cleanup removes the attribute and dispatches again. Nothing mounts it yet.
6. **scripts/journey-shell.test.mts.** Same pattern as short-title-fit.test.mts:640-878: exitCode=1 by default, `--prove-red` runs a clean baseline (else INCONCLUSIVE) and then plants with an `expect` regex and a 'landed' check. No file-writing call anywhere, so §4 counts it as in-process.
   - **§1** activeTabFor over every route globbed exactly as route-census.test.mts:39-65 does. Each route gets an expected key or an explicit null reason. Also: round trip, prefix order, and exactly one definer.
   - **§2** isJourneySurface allow and deny tables (deny: `/markets`, `/updown`, `/live`, `/results`, `/wallet`, `/help`, `/account`, `/profile/*`). A golden table proves isMoneySurface and isCommitSurface unchanged. surfaces.ts has no import and no 'use client'.
   - **§3** the header-state truth table: guest, known, zero and unknown balance, held, break, `/wallet/deposit` and `/wallet/deposit/return`.
   - **§4** the viewerDoorsFor truth table. app-shell.tsx still spells the same three formulas, by regex, so the two cannot drift silently.
   - **§5** every importer of journey-on.ts is a 'use client' file. This is the 'a build is not a render' lesson.

**Flag gating.** Nothing in the app imports these modules yet. surfaces.ts only gains an export; its two existing predicates are byte-identical. Served output is unchanged for everyone.

**Tests.**
- test:journey-shell (new) §1–§5
- red:journey-shell (new, in-process), one plant per rule:
- `/updown/history` maps to updown;
- `/account` is left unmapped;
- a hub route returns null;
- isJourneySurface prefix-matches `/markets`;
- isJourneySurface drops `/`;
- the pill shows during a break;
- the pill shows for a held wallet;
- the capsule hides at zero;
- the agent door loses its standing clause;
- staffConsole uses ADMIN_CONSOLE_ROLES;
- surfaces.ts gains an import;
- a server file imports journey-on.ts.
- test:install-invite + red:install-invite: the isMoneySurface line is verbatim
- test:client-graph-safe
- test:red-anchors

### WP3 — One unread store: useUnreadNotifications, with the classic bell refactored onto it (M; depends on WP2)

**Goal.** Give the bell, the Akaunti tab dot and the hub's Arifa row ONE poll and one count, which the plan names useUnreadNotifications, without changing what the classic bell does.

**Files.**
- src/lib/notifications/use-unread-notifications.ts (new)
- src/components/layout/notifications-panel.tsx
- scripts/notifications-page.test.mts (§6, :237-249)
- scripts/feedback-law.test.mts (POLLERS :246)
- scripts/red-feedback-law.cjs (inline mutation :29, :94-99)
- scripts/journey-shell.test.mts (§6 one poller)

**Steps.**
1. Move these from notifications-panel.tsx, verbatim, into a module-level store:
   - refresh() with refreshSeq and inFlight (188-209);
   - the self-chaining setTimeout poll with backoff, ±30% jitter and the hidden-tab rule (245-303);
   - POLL_OPEN_MS/POLL_CLOSED_MS/backoff constants (29-35);
   - the `50pick:refresh-notifications` and `50pick:sse:notification` listeners and visibilitychange;
   - serverUnread (null until the first answer), items, and the arrival baseline (prevUnread) turned into arrivalSeq.
2. Export `useUnreadNotifications({ enabled, fast })` over useSyncExternalStore.
   - Subscribers are ref-counted. The poll runs only while at least one subscriber has enabled=true, so guests never poll (the F-08 lesson).
   - `fast` (the bell is open) is ref-counted too and re-times the beat exactly as 311-321 do.
   - It returns `{ items, serverUnread, unread, arrivalSeq, refresh, setItems }`.
3. NotificationsPanel consumes the store:
   - `const { items, serverUnread, arrivalSeq, refresh, setItems } = useUnreadNotifications({ enabled: true, fast: open });`
   - Line 109, `const unread = serverUnread ?? items.filter((n) => !n.readAt).length;`, stays byte-for-byte (the red:notifications-page anchor).
   - ringSeq follows arrivalSeq: the `.g-ring`, with no haptic.
   - The optimistic handlers mutate through the store and then `await refresh()` as they do today.
   - The dialog contract is untouched.
4. Re-point red-feedback-law.cjs's INLINE mutation (the prevUnreadRef/setRingSeq block) to the store file. test:red-anchors does not audit inline anchors, so run red:feedback-law detached to prove it.

**Flag gating.** A behaviour-preserving refactor of a classic surface: one poll, the same cadence, the same events, the same markup. Two proofs:
- qa:classic-shell-parity --compare matches the bell markup inside the header snapshot.
- A request-count probe counts the bell's Server Action POSTs over 65 s with the panel closed (mount plus 2 beats). It must equal WP0's count, and be 0 for a guest.

**Tests.**
- test:notifications-page §6: the store stores the server's r.unread, and the panel still has exactly one `const unread = serverUnread ??`
- red:notifications-page: the anchor still resolves once
- test:feedback-law: POLLERS gains the store file, with no `haptics.` in a poller
- red:feedback-law: the re-pointed inline mutation is caught
- test:journey-shell §6: only the store schedules fetchMyNotifications, and notifications-panel.tsx holds no setTimeout poll. Plants: 'a second poller in the panel', 'guests poll'.
- test:hooks-order
- test:red-anchors
- test:ui-consistency: re-derive the panel's per-file baseline if it moves, and record why

### WP4 — Captioned balance (SJ-15) and WalletSheet's journey words (M; depends on WP2)

**Goal.** Build the 'Salio over TZS x' capsule: TZS at every width, no eye or caret, and a tap opens WalletSheet with 'Weka pesa' / 'Toa pesa'. The classic capsule stays untouched.

**Files.**
- src/components/layout/wallet-balance-pill.tsx (new export defined AFTER line 416)
- src/components/layout/wallet-sheet.tsx (optional journey prop)
- src/app/globals.css (.kp-jbal* on tokens)
- scripts/wallet-reach.test.mts (new §8)
- scripts/anchors/wallet-reach.anchors.mjs
- scripts/tap-target.test.mts (§6 NAMED_CONTROLS :518-534)
- scripts/anchors/tap-rung.anchors.mjs

**Steps.**
1. After WalletBalancePill's closing brace, add `export function WalletBalanceCaptioned({ balance, held })`.
   - Reuse the module's BALANCE_MASK (:34), formatBalancePill, motionOff (:93-101), easeOutQuart, TWEEN/FLASH (:66-67).
   - Put the roll and flash logic in a private hook copied from :123-170. The classic function body is not edited.
   - No addEventListener: the bar feeds it useLiveBalance's value. The `50pick:sse:wallet-balance` listener at :60 stays unique.
2. Markup:
   - One 44px `<button>`: class kp-jbal, `data-flash` while flashing, `aria-haspopup='dialog'`, aria-expanded, `data-testid='journey-balance'`. Its aria-label follows the rule at :222.
   - A column: the caption (journey.balanceCaption; held → I.lock + common.balanceFrozen) over the figure.
   - The figure sits inside the 3-cell sizer grid: the full formatBalancePill string including TZS, the mask, and the painted value. Classes `font-mono tabular-nums tracking-normal text-label xs:text-body` (12px → 14px at 360; xs = 360 at tailwind.config.ts:380).
   - Ink: `text-gold-300` for a live balance; `text-text` for held and masked, as in s4-2-hdr-held/-masked.
   - No CashEye, no chevron, no seam.
   - The ±delta is absolute at the left end of the caption row, aria-hidden, only while flashing and unmasked.
   - It opens `<WalletSheet … journey anchorRef={capsuleRef} />`.
3. Paint lives in globals.css only (it is CSS_SYSTEM; design-frozen.test.mts:268):
   - height var(--h-control-md), radius var(--r-pill), background var(--bg-inset);
   - the hairline and the flash ring as color-mix over var(--gold-300) on `.kp-jbal[data-flash]`. Writing no inline boxShadow avoids a second `        boxShadow: flashing` anchor, and the file's raw-colour budget of 1 (:204) is already spent;
   - padding 0 10px, and 0 12px from lg.
4. wallet-sheet.tsx gains an optional `journey?: boolean`.
   - With it: Deposit (:85) reads t.journey.depositAction and Withdraw (:98) reads t.journey.withdrawAction.
   - Without it: today's words.
   - The eye (:65) and Withdraw already live there. That makes Withdraw one tap from the capsule (V19 redefined).

**Flag gating.** Nothing renders WalletBalanceCaptioned until WP6b mounts the journey bar.
- The classic WalletBalancePill JSX is not edited. Its anchors still resolve once: `        boxShadow: flashing`, the SSE listener, the CashEye className.
- WalletSheet's default path renders today's text. It only renders while open anyway.

**Tests.**
- test:wallet-reach §8 (new). The captioned slice:
- is one button opening WalletSheet with journey;
- has no `<CashEye` and no chevron;
- puts TZS inside the sizer with no `hidden sm:inline`;
- carries the caption key, the gold class and tracking-normal.
§1–§7 stay verbatim; they read the FIRST occurrences, which are still the classic ones.
- red:wallet-reach: new single-line, unique mutations — captioned-gets-an-eye, tzs-yields-below-sm and figure-loses-tracking-reset in wallet-balance-pill.tsx, and journey-withdraw-says-Toa in wallet-sheet.tsx
- test:tap-target §6: a NAMED_CONTROLS entry for `.kp-jbal` in globals.css, which must read a --h-control rung
- red:tap-rung: a new anchor
- test:layout-staleness: also asserts exactly one `50pick:sse:wallet-balance` listener in the file
- test:design-frozen
- test:gold-is-money
- test:contrast
- test:red-anchors

### WP5 — Akaunti hub /account (SJ-17) (L; depends on WP2, WP3)

**Goal.** Give journey viewers one public page holding every door the classic More menu, avatar menu and header used to hold on phones: sign-out, language, notifications, card size, Needle, staff console.

**Files.**
- src/app/account/page.tsx (new)
- src/app/account/loading.tsx (new)
- src/components/journey/account/hub-rows.ts (new, pure row builder)
- src/components/journey/account/{hub-row,unread-row,language-row,card-size-row,sign-out-row}.tsx (new)
- src/components/ui/language-menu.tsx (export LANGS/NAMES only, :28-31)
- src/app/globals.css (.kp-hub*)
- scripts/journey-account.test.mts (new) + package.json test:journey-account / red:journey-account
- docs/PLAYER-QUERY-CAMPAIGN.md §4 bucket D (:989-1001)
- scripts/responsive-audit.mjs PLAYER (:76-123)
- scripts/shell-boundary.test.mts, scripts/red-e70.cjs
- scripts/withdrawn-features.test.mts, scripts/anchors/withdrawn-features.anchors.mjs
- scripts/popup-fit.test.mts (REVIEWED :160-234)
- scripts/density-contract.test.mts (§4)
- scripts/simple-journey-flag.test.mts (§10)
- docs/COMPLIANCE-DECISIONS.md, docs/PLAYER-INVITE-UNPAID.md (:59-69)

**Steps.**
1. **page.tsx** (server, `export const dynamic = 'force-dynamic'`).
   - Its FIRST statement is `const { journey } = await resolveSimpleJourney(); if (!journey) notFound();`, before any session or DB read.
   - generateMetadata → t.journey.tabAccount.
   - Signed-in reads, in one Promise.all:
     - the user and the wallet;
     - the KYC row with profile/page.tsx:343's predicate (isFinalRefusal);
     - inviteViewerFor(userId) (affiliate-service.ts:433; fails closed);
     - `invitePaysPlayersNow().catch(() => false)`;
     - getAgentConfig().enabled and getProposalsConfig().state;
     - all composed through viewerDoorsFor (WP2).
2. Layout:
   - `<PageContainer tier='reading'>`, with no `<main>` (test:measure).
   - H1 t.journey.tabAccount.
   - Each card is a `<ul aria-label={journey.hubGroup*}>`, never a `<nav>`, so section-rail's population is unchanged and the page doesn't grow nine nav landmarks.
   - 1 column below 1024, 2 columns from 1024.
3. **Signed-in rows**, in the canvas order with the A17 amendment:
   - identity: displayLabel/displayInitials and maskPhone (phone-normalize.ts:180), initials only (test:erasure forbids avatarDataUrl);
   - Pochi → `/wallet`, showing `<Cash>{formatTzs(balance)}</Cash>`; a held wallet reads common.balanceFrozen;
   - Toa pesa → `/wallet/withdraw`;
   - Matokeo `/results`, Mubashara `/live`, Jedwali `/leaderboard`;
   - Weka mipaka (sub journey.hubLimitsSub) → `/profile/responsible-gambling`;
   - Pumzika / Jizuie → `/profile/responsible-gambling#break` (the reality-check.tsx:180 precedent);
   - helpline: `tel:${HELPLINE_TEL()}` labelled `{footer.helpline} · {HELPLINE()}` (support-config.ts:123-124);
   - Alika: only if inviteVisible. The label is agent.dashTitle for an agent in standing, profile.inviteFriends otherwise (profile/page.tsx:324-331);
   - Pendekeza: only if proposalsVisible; common.proposeEarn plus ProposalsStateBadge;
   - Wasifu `/profile`;
   - Thibitisha ID `/profile/kyc`, hidden on APPROVED or a final refusal;
   - Uthibitisho `/fairness`;
   - Msaada `/help` (sub journey.hubHelpSub, no phone number — decision 5);
   - Arifa `/notifications` with the unread badge;
   - Lugha, lg:hidden (one language control per width, avatar-menu.tsx:284-293);
   - Ukubwa wa kadi, sm:hidden;
   - Sindano: `<NeedleControlsDrawer variant='menu-row' />` (needle-drawer.tsx:71; it portals at :148);
   - Tafuta → `/markets`, the board that owns search today. S7 re-points it when /markets starts answering 307;
   - Kuwa wakala → `/agent`, only if agentDoorVisible (decision 4);
   - staff card, only if staffConsole: ONE literal JSX `<a href='/admin'>` with common.staffConsole and journey.hubStaffSub, never in the rows data (E-70);
   - Toka.
4. **Guest rows** (s4-8-akaunti-guest):
   - the journey.hubGuestPrompt sentence, with no buttons (the header carries Ingia/Jisajili);
   - Lugha · Matokeo · Mubashara · Jedwali · Uthibitisho · Msaada;
   - Weka mipaka and Pumzika / Jizuie → `/legal/responsible-gambling` (the §3.8 signed-out rule);
   - helpline;
   - legal: `/legal/privacy`, `/legal/aml`, `/legal/terms`, `/legal/rules`.
5. **Client islands:**
   - unread-row: `useUnreadNotifications({ enabled: true })`; `<CountBadge tone='brand' size='lg'>` (count-badge.tsx:52) plus sr-only notif.unreadOne/unreadN; nothing while the count is null or 0.
   - language-row: a `<details>` row whose options call `useT().setLocale`, using LANGS/NAMES newly exported from language-menu.tsx with no markup change. Its listbox class differs from the stacking TRAPPED locator at :236.
   - card-size-row: one 56px row button, role='switch', aria-checked bound through `useSyncExternalStore(subscribeCardSpacing, currentCardSpacing)` → applyCardSpacing (card-spacing.ts:29/36/49), with a decorative `<Toggle>` and sm:hidden. This is nav-more.tsx:172-196's proven pattern. Not FilterPill: test:filter-language §0.6–0.9 would count it as a new rail. Never names data-density.
   - sign-out-row: `<ConfirmDialog tone='claret'>` with the profile.signOutConfirm* keys → POST `/auth/logout`, as avatar-menu.tsx:300-327.
6. **account/loading.tsx**: a skeleton on tier='reading'.
7. **Records:**
   - PLAYER-QUERY-CAMPAIGN §4 bucket D gains `/account`: 'a fixed list of doors, not a collection; journey only — classic visitors get the not-found page until S15'.
   - responsive-audit PLAYER gains `/account`.
   - PLAYER-INVITE-UNPAID door table gains the Akaunti door.
   - COMPLIANCE-DECISIONS gets the agent-row ruling and the helpline-vs-desk rule.

**Flag gating.** The page's first act is resolveSimpleJourney() → notFound() for every request that is not journey, before any read. Nothing links to `/account` until WP6b, and then only journey chrome does. A classic visitor who types the URL gets today's not-found body. Note the status: it is HTTP 200 here because the root loading.tsx streams first (pre-deploy-live-check.mjs:458-459), not 404 (see risks). language-menu.tsx only gains `export` keywords.

**Tests.**
- test:journey-account (new, in-process):
- the page asks the resolver and notFound()s before any db read;
- the doors come only from viewerDoorsFor, with no re-spelt inviteIsLiveFor or getAgentConfig in the page;
- hubRowsFor(viewer) yields the right rows for: guest, player, held, agent in standing, SUPPORT, ADMIN, invite closed, proposals DISABLED, KYC approved, final refusal;
- the helpline comes through HELPLINE()/HELPLINE_TEL(), and the Msaada sub carries no number;
- no '/admin' in hub-rows.ts.
- red:journey-account (new, in-process): one plant per rule
- test:simple-journey-flag §10 '10.page.account', plus the plant 'the hub renders without the journey'
- test:route-census + red:route-census
- test:measure: tier parity, no `<main>`
- test:shell-boundary §2b (new): the hub has exactly one `href='/admin'` and it is a plain `<a>`; the rows data holds no /admin. Plus red:shell-boundary: red-e70.cjs gains a hub `<a>`→`<Link>` mutation; run it detached, as it edits files.
- test:withdrawn-features §7: the hub's '/profile/invite' sits within 8 lines of inviteVisible. Plus red:withdrawn-features with a new anchor in withdrawn-features.anchors.mjs (expect §7).
- test:popup-fit: REVIEWED gains sign-out-row.tsx
- test:density-contract §4h (new): the hub control reads through useSyncExternalStore and applyCardSpacing, is ≥44px, sm:hidden, and never names data-density. Plus a red:density-contract plant.
- test:support-contact
- test:erasure
- test:hooks-order
- test:tap-target
- test:i18n

### WP6a — Journey header, 4 tabs and the guest Tiketi sheet, built but not mounted (L; depends on WP4, WP5)

**Goal.** Build the SJ-15 header and the SJ-16 tabs in their own files, on the S4 measured rules, with the kit's geometry wherever the canvas drifts from it.

**Files.**
- src/components/journey/journey-top-bar.tsx (new)
- src/components/journey/journey-tabs.tsx (new)
- src/components/journey/tickets-guest-sheet.tsx (new)
- src/app/globals.css (.kp-jhdr*, .kp-jnav__link, .kp-rail--journey, .kp-rail__badge, .kp-jtab__label)
- scripts/journey-shell.test.mts (§7 header rules, §8 tabs)
- scripts/stacking-contract.test.mts (ROOT_SURFACES :160-204, TRAPPED :220-251, LAWS :319-343)
- scripts/section-rail.test.mts (FLOOR :266), scripts/anchors/section-rail.anchors.mjs
- scripts/layout-staleness.test.mts (CLIENT_DERIVERS :239-244)
- scripts/popup-fit.test.mts (REVIEWED)
- scripts/wallet-reach.test.mts (§8 bar half), scripts/anchors/wallet-reach.anchors.mjs

**Steps.**
1. **journey-top-bar.tsx** ('use client').
   - Root: `<header className='sticky top-0 z-30 app-topbar kp-jhdr' data-testid='journey-top-bar'>`. It is 56px tall with --panel and a --border bottom, as in globals.css, never inline (decision 1). HeaderScrollCast keeps working.
   - Row `.kp-jhdr__row`, mobile-first: padding-inline var(--sp-3) and gap 6px; var(--sp-4) from min-width 360px; the classic sm/lg/xl values from 640.
   - A 44px home link `.kp-jhdr__home`: margin-inline −9px, padding-inline 9px. It holds FiftyMark 26 below xl and FiftyLockup 22 from xl, with the classic span classes. brand.tsx is untouched.
   - `<span className='kp-rg__18'>{t.footer.eighteenPlus}</span>`, with no aria-label (the app-shell.tsx:601 rule).
2. **Desktop nav** (`hidden lg:flex`, aria-label t.nav.primary). It maps JOURNEY_TABS to `<Link className='kp-navlink kp-jnav__link' aria-current={activeTabFor(pathname) === key ? 'page' : undefined}>`.
   - `.kp-jnav__link` carries the kit destination geometry: min-height var(--h-control-md), padding 0 var(--sp-3), radius var(--r-sm). Not the canvas's pills.
   - A guest's Tiketi item is a `<button type='button' aria-haspopup='dialog'>` with the same classes, opening TicketsGuestSheet.
   - No NavMore, no accent dot.
3. **Cluster**, driven by journeyHeaderState (WP2):
   - WalletBalanceCaptioned, fed `useLiveBalance(user.balance ?? 0)`.
   - The pill: `<Link href='/wallet/deposit' aria-label={t.journey.depositAction} data-testid='journey-deposit' className='btn gilt-metal btn-md btn-pill kp-jhdr__pill'>`. Its '+' is `<span className='kp-jhdr__plus' aria-hidden><I.plus s={14}/></span>`, a non-.btn child that CSS hides below 360 (so `.btn`'s display rule can't beat it). Padding 0 12px below 360, 0 12px 0 10px from 360.
   - From lg only, through `hidden lg:inline-flex` wrapper spans (not .btn): LanguageMenu, NotificationsPanel (signed in) and AvatarMenu (signed in).
   - A guest gets `btn btn-ghost btn-md btn-pill kp-jhdr__auth` 'Ingia' and `btn btn-primary btn-md btn-pill kp-jhdr__auth` 'Jisajili': 44px at every width, 13px type and 14px padding as the base rule, and never width-hidden (E-276).
   - The desktop pill label stays visible unless a 1024 cell clips. In that case, use the `hidden xl:inline` idiom on a label span, measured first (E-190).
4. **journey-tabs.tsx** ('use client').
   - Root: `<nav aria-label={t.nav.primary} className='lg:hidden fixed inset-x-0 bottom-0 z-40 kp-rail kp-rail--journey' data-needle-keepout='' data-testid='journey-tabs'>`. Keep `.kp-rail` so qa:focus-and-fit's D57 probe still finds it.
   - 4 tracks via `.kp-rail--journey`. Each slot reuses .kp-rail__item/__pip/__label, with data-on and aria-current from activeTabFor(usePathname()).
   - Glyphs: I.questionCircle, I.trade, I.ticket, I.user.
   - No coin, no NavMore, no .kp-rail__dot.
   - Links carry no aria-label, so the Akaunti sr-only unread text stays in the accessible name.
   - Akaunti dot: `<Dot tone='brand' size={8} className='kp-rail__badge' />` plus sr-only `, {notif.unreadN}` while `useUnreadNotifications({ enabled: isAuthed }).unread > 0`.
   - A guest's Tiketi is a `<button type='button' aria-haspopup='dialog' className='kp-rail__item'>`, never a preventDefault'd Link: nav-progress.tsx:102-130 listens in the capture phase, so a Link would start an 8 s phantom bar.
5. **tickets-guest-sheet.tsx**: `<Modal open onClose labelledBy sheet sheetUntil='lg' maxWidth={440} panelClassName='kp-wsheet'>` (modal.tsx:131-207).
   - Grab handle; H2 journey.ticketsGuestTitle.
   - Jisajili: `btn btn-primary btn-lg` → `/auth/register?next=%2Fpositions`. Ingia: `btn btn-outline btn-lg` → `/auth/login?next=%2Fpositions`.
   - Modal's own ✕ closes it.
6. **globals.css** rules, mobile-first min-width only, so no phone-only max-width rule and test:density-contract is untouched:
   - `.kp-jhdr*`;
   - `.kp-rail--journey` (repeat(4, minmax(0,1fr)));
   - `.kp-rail__badge` (absolute top −2px right 6px; box-shadow 0 0 0 2px var(--panel));
   - `.kp-jtab__label`: no ellipsis; it may wrap to two centred lines below 360 if 'Tiketi zangu' won't fit an 80px track.
   `.kp-rail` itself is NOT edited: the admin PendingChangesBar wears it (unsaved-changes.tsx:471). No class-shaped strings in comments.

**Flag gating.** Three new files that nothing imports yet. globals.css only gains class names no classic element carries. Classic files and served output are unchanged.

**Tests.**
- test:journey-shell §7 (new): the two S4 rules, read from globals.css — base gutter --sp-3 then --sp-4 at min-width 360px; '+' hidden at base and shown from 360; figure text-label then xs:text-body; gap 6px; home link −9px; guest pills btn-md. Plus one plant per rule.
- test:journey-shell §8 (new): exactly the four JOURNEY_TABS hrefs; no NavMore, coin or dot in journey-tabs.tsx; the guest Tiketi is a `<button>`; the Akaunti link has no aria-label. Plus plants.
- test:stacking: new ROOT_SURFACES rows
- 'journey-top-bar' (`/"sticky top-0 z-(/d+) app-topbar kp-jhdr"/`, z 30);
- 'journey-tabs' (`/lg:hidden fixed inset-x-0 bottom-0 z-(/d+) kp-rail kp-rail--journey/`, z 40);
- a TRAPPED language-menu row under journey-top-bar;
- LAWS needle > journey-tabs > journey-top-bar > discovery-bar.
- test:section-rail: both journey `<nav>`s join the population with aria-current; re-derive FLOOR and raise it in the same commit
- red:section-rail: a new declared mutation on the journey-tabs aria-current line
- test:layout-staleness + red:layout-staleness: CLIENT_DERIVERS rows for journey-tabs.tsx and journey-top-bar.tsx consuming /activeTabFor/(pathname/)/
- test:popup-fit: REVIEWED gains tickets-guest-sheet.tsx
- test:wallet-reach §8 bar half: the journey pill is not hidden below lg, its '+' is its only width-hidden child, the guest pills are never width-hidden, and the capsule is ungated by width. Plus red:wallet-reach new anchors.
- test:design-frozen: zero inline literals in the new files
- test:ui-consistency: the collapsing '+' keeps the aria-label; no createPortal
- test:tap-target
- test:hooks-order
- test:icon-sizes
- test:filter-language
- test:client-graph-safe

### WP6b — Shell swap, route-entrance census and the journey header-fit gate (L; depends on WP6a)

**Goal.** Mount the journey chrome for journey requests only, and prove the two done-when conditions: every route keeps an entrance, and the header fits in every cell.

**Files.**
- src/components/layout/app-shell.tsx (:390, :472 only)
- scripts/journey-shell.test.mts (§9 census)
- scripts/simple-journey-flag.test.mts (§10 :607-641, PLANTS :740-793)
- scripts/live/journey-pass.mjs (new)
- scripts/live/clip.mjs (+ GUTTER_PROBE export)
- scripts/qa-journey-shell.mjs (new) + package.json qa:journey-shell
- scripts/journey-header-fit-red.mjs (new), scripts/anchors/journey-header-fit.anchors.mjs (new) + package.json red:journey-header-fit, qa:journey-header-fit
- scripts/qa-journey-preview.mjs (:73, :121 regex; new tiles)
- scripts/red-all.mjs (header note :48-68)
- docs/SHELVED.md, docs/VODACOM-PLAN.md §2/§0i, docs/design-system/v4-2026-09-26-landing-ten/UPDATE-2026-09-28.md §1 note, v4 ACCEPTANCE §C2/K65 note, v5 INHERIT-MANIFEST R1/L4/L20 notes

**Steps.**
1. **app-shell.tsx:390** becomes
   `{journeyShown ? <JourneyTopBar user={topUser} onBreak={promoSuppressed} proposalsState={proposalsState} inviteVisible={inviteVisible} invitePaid={invitePaid} /> : <TopAppBar user={topUser} proposalsState={proposalsState} inviteVisible={inviteVisible} invitePaid={invitePaid} />}`
   
   **:472** becomes
   `{journeyShown ? <JourneyTabs isAuthed={!!session} /> : <BottomNav isAuthed={!!session} proposalsState={proposalsState} inviteVisible={inviteVisible} walletHeld={!!topUser.walletHeld} />}`

   *As built (WP6b, 2026-10-02):* the tabs take `userId={session?.userId ?? null}` — their one prop, per A1 — not
   `isAuthed`. And both journey arms are LAZY (the WP6b review): `LazyJourneyTopBar` and `LazyJourneyTabs` are declared
   the way AppShell declares its overlays, each arm in its own `<Suspense>`, so the journey chrome's code stays out of
   the first-load bundle every classic visitor downloads (⚠️ it did not: `React.lazy` in a server component split
   nothing; corrected by WP6c, "As built (WP6c)" at the end). The server still renders a journey page's header; a fallback
   shows only while the code arrives (a streamed beat, or a switch into the journey mid-visit), so the header's is the
   bar's own empty box (`.kp-jhdr`: its 56px, its panel and its border) and nothing below it moves, while the tabs' is
   none (the rail takes no room in the page). The ternaries in the shell therefore read
   `{journeyShown ? <Suspense fallback={<div aria-hidden="true" className="kp-jhdr" />}><LazyJourneyTopBar … /></Suspense> : <TopAppBar … />}`
   and `{journeyShown ? <Suspense fallback={null}><LazyJourneyTabs userId={session?.userId ?? null} /></Suspense> : <BottomNav … />}`,
   the else arms character for character as above. Served bytes for a classic viewer: the markup and RSC rows are
   today's (the parity compare holds them), and the JavaScript claim waits on a production build — VODACOM-PLAN §0i,
   WP6b's owed list.
   
   Leave all of these alone:
   - the /admin and opt-out returns;
   - `const journeyRead = resolveSimpleJourney();`;
   - `  const h = await headers();`;
   - `const journeyPreview = (await journeyRead).preview;`;
   - `{journeyPreview && <PreviewMarker `;
   - the funnel, install, consent and channels lines;
   - MainLandmark.
   Append nothing after `function OptOutShell` (test:marketing-optout).
2. **Entrance census**, test:journey-shell §9.
   - Glob the route-census population.
   - Each route needs an ENTRANCES entry `{route, door, file}` whose file source really contains the href: a literal, a data-array row, or a cited pattern for a dynamic segment.
   - door is one of:
     - tab (active-tab.ts);
     - header (journey-top-bar.tsx);
     - sheet (wallet-sheet.tsx, tickets-guest-sheet.tsx);
     - hub (hub-rows.ts / account page);
     - footer (public-footer.tsx);
     - page (a destination page reachable from those);
     - external (email, SMS, provider, service worker; name the generating file).
   - Only doors a journey PHONE shows count. The avatar menu, bell, NavMore and classic rail do not.
   - Both directions, with controls: population ≥ 50; no entry names a route missing on disk.
   - The hub must also hold the non-route controls: sign-out, language, notifications, card size, Needle drawer, staff console.
3. **test:simple-journey-flag §10 '10.shell.chrome'.**
   - Exactly one `<JourneyTopBar` and one `<JourneyTabs`, each only inside a `journeyShown ?` arm.
   - The classic `<TopAppBar user={topUser}` and `<BottomNav isAuthed={!!session}` present in the else arms.
   - No classic layout component imports src/components/journey.
   New plants: 'the journey tabs render for everyone', 'the classic rail is dropped', 'a classic component imports a journey module'.
4. **scripts/live/journey-pass.mjs.**
   - Mints a staff pass on a local in-memory server: POST `/api/dev-test/seed-admin {role:'SUPPORT'}` → `/admin/journey` → 'Turn my preview on' (qa-journey-preview.mjs:79-90). Returns the kp_preview cookie. The pass survives /auth/demo.
   - Balance helper: `/auth/demo?deposit=0` (demo/route.ts:165), then POST `/api/dev-test/seed-wallet {phone, amount}`. No new dev-test route, so test:cert-devroutes is untouched.
5. **qa:journey-shell** (new): viewport tiles, never full-page, with the heading asserted before each shot. Pass-holding guest and player cover:
   - the header at 320/360/390/412/768/1024/1150/1280 × sw/en/zh;
   - held (`/auth/demo?hold=officer`), masked (localStorage cashHidden), zero and 999,999;
   - the active tab on `/`, `/markets/<id>`, `/updown`, `/updown/<id>`, `/updown/history`, `/positions`, `/account`, `/results`, `/wallet`;
   - the guest Tiketi sheet at 390 and 1280;
   - WalletSheet opened from the capsule, showing Toa pesa;
   - the unread dot and the Arifa badge after one bet seeds a notification. Assert unread ≥ 1 first, else BLOCKED;
   - the keyboard focus ring (s4-12-focus);
   - tab labels not clipped at 320;
   - a no-pass guest and player still showing the classic chrome.
6. **red:journey-header-fit / qa:journey-header-fit** (new; `--control-only` for the qa key). Model: header-fit-red.mjs.
   - **Cells:** 320/360/390/768/1024/1150/1279 × sw/en/zh × {pass guest, pass player at TZS 999,999 — the widest real string, since formatBalancePill compacts at ≥1M}, plus held, masked and zero at 320 and 1024.
   - **Per cell:** CLIP_PROBE, plus a new GUTTER_PROBE: rightmost visible header control ≤ vw − the row's computed padding-right, and header scrollWidth ≤ clientWidth.
   - **Witness:** `.kp-jhdr__row` scrollWidth.
   - **Mutations** (single-line, unique): plus-shows-below-360, gutter-16-below-360, figure-14-below-360, gap-6-becomes-8, home-link-loses-negative-margin, guest-pills-pad-20, lockup-from-lg (xl:hidden→2xl:hidden in journey-top-bar.tsx).
   - Each must sever ≥1 cell. Restore, then check the tree is byte-identical.
   - A MISSED mutation means the rule has slack with real balances. Record the measured slack in §0i; never shrink the matrix.
7. **qa-journey-preview.mjs**: widen the 1.3/3.3 trace regex to journey-top-bar|journey-tabs. Add pass-holder tiles at 390 and 1280: 4 tabs, the captioned header, no classic rail.
8. **Records:**
   - SHELVED.md rows, with paths written 'shelved'/'unmounted': the classic BottomNav for journey viewers; NavMore rail and bar variants; the centre Deposit coin (data-testid deposit-rail); the Juu/Chini accent dot; the classic TopAppBar for journey viewers, whose phone LanguageMenu, bell and avatar moved to Akaunti.
   - Notes that SJ-16 supersedes v4 ACCEPTANCE §C2/K65 ('no second nav component') and UPDATE-2026-09-28 §1 (one Deposit per screen) for journey viewers.
   - red-all.mjs header: red:journey-header-fit is env-dependent, and `--skip header-fit` (a substring match) skips both header harnesses.

**Flag gating.** The two ternaries are the only served-markup change. Both arms are chosen by `journeyShown`, from the one cached resolver the S1 suite pins. For every request without a pass, under STAFF_PREVIEW, the else arms are today's elements with today's props, so the HTML and RSC payload are identical. qa:classic-shell-parity --compare must show 0 diffs. An Owner Stop or a pass expiring mid-visit swaps whole component types on router.refresh(); hook calls never branch inside one component (the #300/#310 lesson at nav-more.tsx:114-122).

**Tests.**
- test:journey-shell §9 census (new), with plants: a hub row removed; a tab removed; a synthetic route added to the population; an entrance file that no longer contains its href
- test:simple-journey-flag + red:simple-journey-flag: the new plants caught, and the 26 existing plants still apply
- red:journey-header-fit (new): N/N caught, then `git diff` clean. Run detached under the lock, never piped, never via red:all's 300 s timeout.
- qa:journey-header-fit: the clean matrix shows 0 clipped and 0 gutter violations
- red:header-fit (classic, unchanged): still 1/1
- qa:journey-shell tiles, read one by one
- qa:journey-preview
- qa:classic-shell-parity --compare
- qa:footer-reachable in both classic and pass contexts
- test:stacking
- test:red-anchors: the undeclared count is not above WP0's number; the new browser harness declares journey-header-fit.anchors.mjs
- test:all

### WP7 — Overlay stand-downs and the email-bar rule (M; depends on WP6b)

**Goal.** On journey surfaces, a journey viewer gets no Needle, channels panel or chat bubble. A journey viewer gets no email-verify bar (§3.2 item 2). Consent keeps working.

**Files.**
- src/components/layout/app-shell.tsx (:394 neighbour, :425)
- src/components/layout/needle.tsx (:792-797)
- src/components/social/channels-panel.tsx (:191-196, :304)
- src/components/chat/ChatRoot.tsx (hooks block, after :246)
- scripts/journey-shell.test.mts (§10 overlays)
- scripts/simple-journey-flag.test.mts (§10 '10.shell.emailbar')
- docs/SHELVED.md

**Steps.**
1. **app-shell.tsx.**
   - Add `{journeyShown && <JourneyFlag />}` beside the `data-kp-funnel` span.
   - :425 becomes `{emailVerifyState && !journeyShown && <EmailVerifyBanner email={emailVerifyState.email} />}`. This is a per-viewer server decision, so it is stable across soft navigation. The deposit page's own EmailVerifyGate still gates.
2. **needle.tsx.** Add `const journeyOn = useJourneyOn();` with the hooks. :792 becomes `const suppressed = hiddenPref || isMoneySurface(pathname) || (journeyOn && isJourneySurface(pathname));`, and journeyOn joins the deps.
3. **channels-panel.tsx.**
   - After :191: `const journeyHidden = useJourneyOn() && isJourneySurface(pathname);`.
   - :196 becomes `const eligible = open && !promoSuppressed && !suppressedRoute(pathname) && !journeyHidden;`. The pinned prefix is kept.
   - After :304: `if (journeyHidden) return null;`. The pinned :304 line and the two `suppressedRoute(pathname)` calls stay exactly as they are.
4. **ChatRoot.tsx.** Add `const journeyOn = useJourneyOn();` with the other hooks. After :246: `if (journeyOn && isJourneySurface(pathname)) return null;`.
   - HIDE_ON (:28) is untouched (test:marketing-optout).
   - Chat history is not cleared on journey surfaces.
   - lazy-overlays.tsx:45 is untouched (the red:chat-availability anchor).
5. **Left as they are:**
   - the consent prompt (:520, ungated: privacy-notice §4f) and the install invite;
   - the first-visit primer and the ticker, which §3.2 and §3.8 place in S7;
   - the sheet-presence attribute, which waits for S8.
   SHELVED rows: EmailVerifyBanner for journey viewers; the Needle, channels panel and chat bubble on journey surfaces.

**Flag gating.** JourneyFlag renders only when journeyShown, so a classic page never carries data-journey. useJourneyOn's server snapshot and its no-attribute value are both false, so each stand-down term reduces to today's expression. The email-bar condition is unchanged whenever journeyShown is false. qa:classic-shell-parity --compare must show 0 diffs, including overlay presence.

**Tests.**
- test:journey-shell §10 (new):
- each stand-down is the extra `(journeyOn && isJourneySurface(pathname))` term or a guard after the pinned line;
- the HIDE_ON regexes are byte-identical;
- the consent mount is ungated;
- JourneyFlag is mounted only behind journeyShown.
Plus one plant each.
- test:simple-journey-flag '10.shell.emailbar' (new): the bar is present for classic and absent for journey. No gate pinned this bar before: searching scripts/ for EmailVerifyBanner finds nothing. Plus the plant 'the email bar is dropped for classic viewers'.
- test:social-panel + red:social-panel
- test:marketing-optout + red:marketing-optout
- test:chat-availability + red:chat-availability
- test:privacy-notice §4f
- test:install-invite 5.2
- test:hooks-order
- test:stacking
- qa:journey-shell: a pass holder sees no bubble, needle or panel on `/` and `/positions`, and does see them on `/help` and `/account`
- qa:classic-shell-parity --compare

*As built (WP7, 2026-10-02, applied and driven 2026-10-03):* the flag is mounted through a lazy binding like AppShell's other
overlays (`{journeyShown && <Suspense fallback={null}><LazyJourneyFlag /></Suspense>}`, beside the funnel's span), so a
classic page never loads it (true from WP6c, which moved the binding into `shell-lazy.tsx`); `test:journey-shell` 5.mount
holds the mount and §11 the lazy load. It is §11, not the
§10 the body names, because WP6b's header-fit terms took §10 first; it sits beside §5 in the file and in the run's
output. The stand-downs are steps 2–4 as written; each overlay reads `const journeyOn = useJourneyOn();` once, and
the channels panel names the term once (`journeyHidden`) for its `eligible` and its render guard. The chat's guard returns null and nothing more: it neither closes an open panel nor
clears the conversation, which is where the player left it on the next page that shows the bubble. A4 as written: 5.2
matches `isMoneySurface` in any import list from `@/lib/surfaces`, and a new clause forbids a `MONEY_ROUTE` or an
`isMoneySurface` function or binding in `needle.tsx` (comments stripped); `red:install-invite` gains one mutation per
half. ⚠️ The flag hydrates inside its own Suspense boundary (and, from WP6c, arrives in its own chunk), so on a journey
viewer's first document load an overlay that draws before it
could show for a moment. The drive measured it: the chat bubble never drew, but the NEEDLE did, for 1–3 frames on
every fresh load of `/` and `/positions` (it hydrates outside the flag's Suspense boundary, and its engine mounted
≈30 ms before the flag). Fixed by the shell's MARK: AppShell also writes `{journeyShown && <span hidden
id={JOURNEY_SHELL_MARK} />}` into the server's HTML (the id lives in the pure `lib/journey/shell-mark.ts`), and
`journeyFlagSnapshot` reads the mark or the flag, so `useSyncExternalStore` has the answer right after hydration; the
flag stays the event that tells mounted overlays about a `router.refresh()`. `test:journey-shell` 5.mark,
5.mark.mount, 5.mark.pure (3 plants). Re-driven 32/32: no frame of either overlay on a journey page, both present on
`/markets` and `/help`, classic viewers unchanged.

### WP8 — Short titles on the position projection (two stores) (S; depends on WP0)

**Goal.** Let Tiketi cards show the S2 short title, as the canvas draws, through the one DAL projection, with both twins kept in step.

**Files.**
- src/lib/server/market-dal.ts (the `PositionCardMarket` type; `positionCardsByIds` in `memoryMarkets` and `prismaMarkets`)
- scripts/dal-parity.test.mts

**Steps.**
1. Add shortTitleEn/Sw/Zh to PositionCardMarket. Both twins select and map them.
2. Update the type's 'every field is here because the page reads it' note to say the journey ticket card reads them.

**Flag gating.** Three extra fields on a server-side projection. The classic PositionCard never reads them, so classic markup is unchanged. The memory and Prisma twins are proven equal.

**Tests.**
- test:dal-parity + red:dal-parity: two stores
- test:short-title-fit: unchanged
- tsc, via test:all

*As built (WP8, 2026-10-01):* `PositionCardMarket` gains `shortTitleEn/Sw/Zh` (`string | null`, required, so `tsc`
holds both twins' object literals to them); the memory twin passes the stored values through (`?? null`), and the
Prisma twin selects the three columns and maps them the same way. No `competition`: the canvas's ticket cards
(s4-9-tiketi-open, s4-9-tiketi-settled) draw no competition label. The helper is S2's `cardTitle`
(`lib/markets/short-title.ts`); its `titleSw` now accepts NULL, as this projection carries it, so WP9 hands it the
projection as it is (a type widening only: `pickLocalized` already read NULL as absent). The comments' column counts
("twelve") are gone rather than bumped, and the Files line names symbols, not line numbers: `test:dal-parity` holds
the list in §10's `10.cards` checks (extended in place, as S2 did; §17 onward is the marketing lane's) — the type,
both `out.set` objects and the Prisma `select` name the same fields, each read from its row, the short titles
verbatim — and `red:dal-parity` gains five plants: the memory twin drops one, the Prisma select forgets one, the
Prisma mapper reads none, and each twin in turn fills one from the full title. Classic viewers: nothing served
changes, because no page reads the new fields yet.

### WP9 — Tiketi zangu journey view, with the Maswali | Juu/Chini switch (L; depends on WP7, WP8)

**Goal.** Under the journey, /positions becomes 'Tiketi zangu' in the canvas's order. /updown/history wears the same title and switch. The pricing, permalinks and absolute dates still hold.

**Files.**
- src/app/positions/page.tsx
- src/app/positions/loading.tsx
- src/app/positions/error.tsx
- src/components/journey/tickets/{tickets-view,ticket-card,ticket-switch}.tsx (new)
- src/app/positions/positions-bar.tsx (optional variant)
- src/app/updown/history/page.tsx (:286-294), updown/history/loading.tsx
- scripts/journey-tickets.test.mts (new) + package.json test:journey-tickets / red:journey-tickets
- scripts/timer-date.test.mts (§3 :131-136), scripts/position-permalink.test.mts (5.5 :129-137)
- docs/SHELVED.md, docs/VODACOM-PLAN.md §3

**Steps.**
1. **positions/page.tsx.**
   - After the session check: `const { journey } = await resolveSimpleJourney();`.
   - Every read and the cashOutValue pricing with houseBotId stay in page.tsx (:184-205; test:house-bot-surfaces register).
   - At render: `if (journey) return <TicketsView … />` before the classic JSX. The classic JSX stays byte-for-byte, and `<PageContainer tier="reading" className="space-y-6">` stays unique (the measure anchor).
   - generateMetadata → t.journey.tabTickets when journey.
2. **tickets-view.tsx** (server):
   - `<PageContainer tier='reading'>`, `<RefreshPoller intervalMs={20_000}/>`, `<HashFocus/>`;
   - H1 journey.tabTickets;
   - TicketSwitch;
   - `<PositionsBar variant='journey'>`;
   - TicketCard list and Pagination;
   - empty state: journey.ticketsEmptyOpenTitle/Body with sideWord(), and journey.ticketsBrowse → `/`;
   - the Utendaji link (performance.viewPerformance → `/positions/performance`), which is its only entrance today (page.tsx:269-274).
3. **ticket-switch.tsx**: the kit `<Tabs variant='line' ariaLabel={t.journey.ticketsKindAria}>` in link mode (tabs.tsx:241-281). That gives a `<nav>` with aria-current and no role=tablist: A5, and DESIGN_AUTHORITY.md:2047 'the underline is the section language' (decision 2). Maswali → `/positions`; nav.updown → `/updown/history`.
4. **ticket-card.tsx.**
   - Only the title links to `/markets/[id]` (cardTitle, short-title.ts:237, with a 2-line clamp on the fallback), because the sell control sits inside the card. data-row-id stays.
   - Side Chip via sideWord.
   - Status via positionStatusWord + playerStatusChip, with LOSS kept in the 'no' ink. Extract that rule from position-card.tsx:116-123 into one shared helper; don't copy it.
   - Dau.
   - OPEN → 'Malipo · Matokeo yakitoka' with no figure (SJ-4 / §C3). Betting closed and stamped → today's exact-figure semantics (position-card.tsx:162-176). Settled → 'Malipo ya mwisho {amount}'.
   - 'Imewekwa {date}' and 'Uchaguzi unafungwa {formatDeadline(cutoff)}', formatted on the server.
   - The ticket id stays; no share button (decision 6).
   - SellButton in its classic look until WP10.
5. **positions-bar.tsx**: an optional `variant='journey'` renders row 1 only, the lenses without counts, and keeps data-filter-rail. The default variant is byte-identical. The default lens stays 'all' (portfolio.ts:119-128 untouched).
6. **updown/history.**
   - page.tsx: when journey, replace the BackLink + PageHeader (:291-294) with H1 journey.tabTickets and TicketSwitch (Juu/Chini current). The wrapper string at :286 stays (HOUSE_GUTTER_ROUTES), as do HashFocus, ?day and isInEatDay.
   - loading.tsx: a journey ghost.
7. **positions/loading.tsx**: a journey ghost (async server component, tier reading, canvas order).
   **positions/error.tsx**: chooses journey copy (journey.ticketsErrorBody/ticketsBack) through useJourneyOn().
8. **Records:**
   - SHELVED rows for journey viewers on /positions: PnlSummaryStrip, the YES/NO exposure bar, SearchBox, PositionsBar row 2, CountdownRing, PositionShare, the subtitle, the classic PositionCard.
   - §3 gets the S15 'Tiketi keys' list.

**Flag gating.** Both pages decide with resolveSimpleJourney(), the resolver the shell uses. For classic viewers the branch is never taken: the classic JSX and its data reads are unchanged, and positions-bar's default variant renders today's markup. /positions stays edge-protected for everyone (proxy.ts:39). qa:classic-shell-parity --compare covers /positions.

**Tests.**
- test:journey-tickets (new, in-process), checking that:
- the page asks the resolver and returns the journey view before the classic JSX;
- an OPEN ticket shows no payout figure;
- every timer string comes from a server formatter with an absolute instant;
- no 'nafasi'/'Nafasi' appears in the sw values the journey Tiketi files read;
- the guest sheet hrefs carry next=%2Fpositions;
- the switch has aria-current and no role=tablist;
- the view renders HashFocus and RefreshPoller;
- no houseBot* name appears in journey files.
- red:journey-tickets: one plant each
- test:timer-date §3 extended to the journey files, + red:timer-date
- test:position-permalink 5.5 extended, + red:position-permalink
- test:measure + red:measure: the anchors still resolve once
- test:house-bot-surfaces
- test:filter-language + red:filter-language: positions-bar is still a declared SURFACE
- test:query-core + red, test:lifecycle-reach + red
- test:section-rail: Tabs link mode
- test:updown-history-pnl, test:updown-positions-visible, test:updown-digest
- test:labels
- test:i18n
- test:type-scale: no new off-ladder sizes
- qa:journey-shell: Tiketi tiles for open, settled, empty and guest-sheet, plus the /updown/history switch, at 320/390/1280 × sw/en/zh

*As built (WP9, 2026-10-03):* `/positions` asks the one resolver after its session check and, for a journey request,
returns `TicketsView` (`src/components/journey/tickets/`) before its classic JSX, which is byte for byte today's; its
tab title follows the same answer (A2's precedent). Every read and the exit pricing stay on the page; the view is
handed the rows, the positions, their markets and the priced exits, and cuts the list by the lens ALONE: search and
sort are shelved for preview viewers (A19, VODACOM-PLAN §0h point 11), the side, topic and window groups are row 2's,
which step 5's variant does not draw, and a link's other settings are ignored for a journey reader (§0h point 23).
Step 5's variant is a sibling export, `PositionsBarJourney` in `positions-bar.tsx`, not a prop, and both bars render
`PositionsRail` — the classic bar's own outer element, moved there verbatim — so the classic markup is today's and the
rail hook is written once (`red:filter-language`'s vacuity case still removes the only one; a second copy would have
made its anchor ambiguous). The file stays the declared filter SURFACE: row 1 only, all seven lenses (§0h point 11),
no count on any pill and no result count, the strip named `journey.ticketsFilterAria` (A7; en "Filter tickets" and zh
"筛选注单" since WP9). An empty outcome lens reads four new journey keys, `ticketsEmptySettled`, `ticketsEmptyWon`,
`ticketsEmptyLost` and `ticketsEmptyRefunded` (en and sw the classic lines, zh 注单 for 持仓; §0h point 27).
`TicketCard` draws the canvas's order in the kit's atoms: the side and state chips (the state's colour is
`positionStatusChip` in `status-tone.ts`, extracted from `position-card.tsx`, which now calls it — no copy); the short
title as the only link (`cardTitle`; the fallback held to two lines by a clamp on the words inside the link), padded
12px each way and pulled back by the same negative margin — `side-picker.tsx`'s absorber, with no new CSS — so the link
is a 44px target and the card does not move; Dau and Malipo through `ticketPayout` — NO figure until the result,
whether betting is open, selling has closed or the closing sweep has stamped the market (SJ-4, §C3; §0h point 22
supersedes step 4's exact figure, and the classic card keeps its own) — then "Malipo ya mwisho", the ticket number,
and "Imewekwa" and "Uchaguzi unafungwa", each a `<time>` naming its instant and formatted by `formatDeadline` with the
render's clock. The classic SellButton is handed `freeUntil={freeExitEndsAt({ placedAt: p.placedAt }, m)}`: the card
is a third host, so `test:sell-grace-truth` §2 names it, with three plants (A8). The head, `TicketsHead`, is the kit's
`PageHeader` with the name alone — its `eyebrow` became optional and is drawn only when given, and every classic call
site passes one — and then step 3's switch, the kit `<Tabs variant="line">` in link mode, which `TicketSwitch` reaches
only through `TicketSwitchRail`, a small client wrapper that loads `Tabs` with `next/dynamic` and its server render on
(`layout/lazy-overlays.tsx`'s pattern without `ssr: false`), so a classic reader of either route is not sent the kit's
code (§0h point 20; WP6c's production build proves it, owed). The Utendaji link sits after the list and the pager
(§0h point 33). `/updown/history` renders `TicketsHead` for a journey request through two sibling ternaries standing
where its back link and its header stood — never one over a fragment — so a classic reader's tree and payload are
today's; its gutter wrapper, the scroll to a linked ticket, the poller, `?day` and everything below are unchanged.
Step 7, with A16 overruled (§0h point 21): the loading ghosts are chosen ON THE SERVER — each loading file asks the
per-request resolver beside the words in one `Promise.all` and returns one ghost, the journey's for a journey request
and today's, unchanged, for everybody else (`/updown/history`'s two head lines are sibling ternaries too). A16 feared
the question would delay every reader; it is React-cached per request, a document load has already asked it for the
shell, and a soft navigation by a reader without a preview pass costs a cookie and header read and the switch's
in-process snapshot (the store re-read at most every 10 s, never under a WITHDRAWN ceiling). It buys no classic-ghost
("Nafasi") flash on a journey reader's first load, and no journey ghost tree, words or client module in a classic
reader's bytes. The two error pages stay client components (Next requires it) and are never drawn on the server
(React's server renderer cannot run an error boundary): each mounts in the browser as a fresh render, where
`useJourneyOn()` reads the shell's mark already in the page, so a journey reader's first sight of one has the tickets'
words — `/positions`' body and back link, `/updown/history`'s body only. A15: `test:journey-shell` §9 pins each
tickets route at both its doors — the classic page's (the board's history link, the classic page's performance link)
and the journey view's (the switch, the Utendaji link) — four pins, a plant each, because the census reads every
branch of a page for every reader and one door would hide the loss of the other. A14: `test:journey-tickets` is in
predeploy and `red:journey-tickets` plants a defect for every one of its checks, in memory. Extended in the open:
`test:timer-date` §3 (seven card checks, two `red:timer-date` mutations) and `test:position-permalink` 5.5/5.6 (two
`red:position-permalink` mutations); the card also carries the id a fragment names, so `HashFocus` has a card to
centre. ⚠️ Still saying "nafasi" to a journey reader: the Sell button's dialogs (WP10) and, off Tiketi zangu itself,
`/positions/performance` (not rebuilt in WP9), the question page's holder heading and the desktop avatar menu's row —
all on VODACOM-PLAN §3's S15 rename list (§0h point 34).

### WP10 — Journey sell look on the ticket card (opt-in, no money change) (M; depends on WP9)

**Goal.** Show the canvas's 'Uza bila ada hadi 11:23 · 3:42' with an outlined 'Uza bila ada / Rudishiwa TZS n kamili' on journey tickets, with the cash-out logic untouched.

**Files.**
- src/components/markets/sell-button.tsx (props :25-66; render :213-279)
- src/components/markets/sell-confirm-modal.tsx (:87, :161 copy props)
- src/components/journey/tickets/ticket-card.tsx
- src/app/positions/page.tsx (server-formatted free-until label)
- scripts/journey-tickets.test.mts (§sell)
- scripts/qa-classic-shell-parity.mjs (holder block capture)

**Steps.**
1. SellButton gains optional props: `look='journey'`, `freeUntilLabel` (server-formatted with formatClock, utils.ts:358, from placedAt plus the grace), and journey labels.
   - With no props it renders today's btn-primary markup.
   - Journey look: 'Uza bila ada hadi {time}' with a role=timer m:ss; the outlined button reads 'Uza bila ada' over 'Rudishiwa {amount} kamili'.
   - Closed: 'Kuuza kumefungwa.' plus journey.sellClosedBody.
   - A configured paid window keeps today's honest 'Uza sasa' and fee.
   - cashOutPositionAction, the inFlight latch, the deferred toast and the refresh events are unchanged.
2. SellConfirmModal and the result copy gain optional journey labels (journey.sellConfirmTitle/sellKeep/sellUnchanged). By default they keep today's dialog.sellPositionNow / dialog.keepPosition / common.positionUnchanged.
3. Extend qa:classic-shell-parity: seed an open position (`/api/dev-test/seed-player-portfolio`) and capture the classic `/positions` card and the `/markets/<id>` holder block. They must be unchanged.

**Flag gating.** Only the journey TicketCard passes look/labels. The market page and classic /positions pass nothing, so they render today's markup and behaviour. The parity drive captures the SellButton region before and after.

**Tests.**
- test:journey-tickets §sell (new):
- the journey look shows the server-formatted instant next to the countdown;
- the paid-exit state still shows its fee;
- no client-side date formatting (timer-date law).
Plus plants.
- test:feedback-law + red:feedback-law
- test:failure-reasons
- test:popup-fit: sell-confirm-modal stays REVIEWED, with no truncate
- test:ui-consistency: re-derive sell-button.tsx's baseline if it moves, and record why
- test:timer-date + red:timer-date
- qa:classic-shell-parity --compare, including the holder block

*As built (WP10, 2026-10-03):* as A8's as-built note binds it, with no label built from the placement. The card binds
`freeExitEndsAt(...)` once, hands it as `freeUntil`, and beside it `look="journey"`,
`freeUntilLabel={freeUntil ? formatClock(freeUntil) : null}` (the clock reading made on the server) and
`pricedFree={price?.free === true}` (`/positions` adds `free`, `cashOutValue`'s own `inGracePeriod`, to the price it
already computes). `test:sell-grace-truth` §2 is extended in the open: 2.passes reads a host's one `const` bound to the
helper's call, the only binding of that name in the file (so no parameter can shadow it), in the block that holds the
element (a `let`, a second binding or any other initializer fails); 2.label holds every label to `X ? formatClock(X) :
null` over that binding, `formatClock` imported from `@/lib/utils`. §3 is extended in the open too (3.journey): the
journey's free offer is the countdown narrowed by the server's own pricing, `pricedFree === true && (inGrace ||
!mounted)`, and it lapses as `pricedFree === true && mounted && !inGrace`; the look parses nothing and multiplies
nothing (its m:ss is the countdown's own `graceLabel`). SellButton: the look is an early return after every hook; the
classic return is unchanged but for its two dialogs, which became one shared `dialogs` pair, with the journey's three
words under the look only (`titleLabel` and `keepLabel` on SellConfirmModal, the failure's unchanged line). Its
states: shut (the server's `alreadyClosed`, or the phone's clock) is words beside the kit's lock glyph, with no button,
from the first paint; the free offer is drawn without the countdown on the server's paint; the lapse, the moment the
countdown runs out, is "Inapakia…" with no figure and nothing to press, an open confirm closed and one `50pick:refresh`
per run of the countdown, so the server's answer arrives at once; a price with a fee shows today's figure and fee (0
unprinted). The button is the kit's `btn btn-ghost` without a size class, its edge the kit's `--border-control` set on
the button itself (the canvas's colour; the kit's outlined default is under the 3:1 floor on a card), because every
`<Button>` size fixes its height and the two lines must grow with the phone's text size. So `test:ui-consistency`'s
`raw-button-btn-class` count for `sell-button.tsx` is re-derived 1 → 2 (`scripts/ui-consistency-baseline.json`,
`_total` 135 → 136). `test:journey-tickets` §12 (11 checks, the classic return and the shared dialogs pinned line
for line, every host found on disk) with §3.clock and §9 rewritten; `test:timer-date` §3 with three `red:timer-date`
mutations. Step 3: `qa:classic-shell-parity` v2 seeds the demo player AFTER the matrix and captures the free strip and
the button on `/positions` and in the holder block (360/1280 × en/sw), and the classic confirm in the holder block at
360. Departure from step 3's letter: SellButton's own elements and the confirm are captured, not the whole card and
holder row, which print the ticket id and the placement time (they differ per server and per minute, and are not
WP10's). The v2 baseline is captured at `7c859cdf`, the parent of A8's live half, so the holder block measures A8's
claim as A8 asks; a null compare on a fresh server at that commit must exit 0 before any compare on this tree;
`SELL_EXPECTED_DIFFS` starts empty. Departures and inherited limits: VODACOM-PLAN §0h points 35 to 37.

### WP11 — --rail-h, the one name for the rail's reserve (S; depends on WP6b)

**Goal.** Replace the two literal 88px rail reserves with --rail-h (build map §2 'Tabs'), so S9's focused chrome and U21 have one knob. Computed values stay the same.

**Files.**
- src/app/globals.css (:root; :943)
- src/components/layout/public-footer.tsx (:113)
- scripts/qa-classic-shell-parity.mjs (baseline note)

**Steps.**
1. Add `--rail-h: 88px;` in :root, with a comment: the rail's reserve, 64px item + 1px border + clearance.
2. globals.css:943 → `scroll-padding-bottom: calc(var(--rail-h) + env(safe-area-inset-bottom, 0px));`.
3. public-footer.tsx:113 → `pb-[calc(var(--rail-h)+env(safe-area-inset-bottom))] lg:pb-0`.
4. Leave ChatRoot's `bottom: isMobile ? 80 : 16` and the 148px invitation offsets literal. They are pinned by the stacking chat-fab locator (stacking-contract.test.mts:188) and install-invite 5.4. Name --rail-h as their source in a comment with no class-shaped string.
5. Ask the Mobile Visual lane (MOBILE-VISUAL-PLAN U21, branch mobile-visual) to adopt this token rather than define its own.

**Flag gating.** The computed values are identical for every viewer: 88px plus the safe area. This is S6's one deliberate served-byte change: the footer's class string. qa:classic-shell-parity compares the computed footer padding-bottom and html scroll-padding-bottom; the footer class diff is re-baselined with the reason recorded in §0i.

**Tests.**
- test:css-vars-defined + red:css-vars-defined
- qa:footer-reachable + red:footer-reachable, in classic and pass contexts at 360/768
- qa:classic-shell-parity --compare: computed styles equal
- test:install-invite: 5.4 untouched
- test:stacking: the chat-fab locator untouched

*As built (WP11, 2026-10-03):* as written, with the parity rule A3 sets instead of the body's "re-baselined": the
footer's class change is the named EXPECTED_DIFFS entry `footer-rail-h` (a literal substitution, 224 cells), so any
other change beside it still fails. `scripts/footer-reachable.mjs` gained `--journey` (A15) — a staff pass on every
context and a per-cell proof that the journey shell is on the page — rather than a new package script, so `red:all`
gains no server-bound harness. Verified as the VODACOM-PLAN §0i bullet records.

### WP12 — Proof, records, merge and deploy (M; depends on WP9, WP10, WP11)

**Goal.** Close S6 against its done-when, with drives, tiles and batteries, and ship it behind the flag.

**Files.**
- scripts/pre-deploy-live-check.mjs ([E2] :344/:374, [F] :421-442)
- scripts/landmark-seal.mjs (journey mode; GATED/PUBLIC :42-48; WIDTHS :56)
- docs/VODACOM-PLAN.md, docs/DESIGN_AUTHORITY.md, docs/SHELVED.md
- C:/Users/Ali/.claude/projects/C--Users-Ali/memory/project_kipindi_vodacom_plan.md

**Steps.**
1. **qa:live** [E2]/[F]: the journey-top-bar, journey-tabs and journey-deposit testids must be absent from `/` and `/markets` for signed-out visitors and the demo player while the state is not ACTIVE. GET `/account` must render the not-found body.
2. **qa:landmark-seal** gains `--journey`. Locally it uses a pass from journey-pass.mjs; on production, a PREVIEW_URL link. Widths 320/360/390/768/1024/1150/1279, with `/account` added to PUBLIC in journey mode only.
3. **Battery**, under the lock, one heavy job at a time, detached:
   - test:all;
   - red:all on a dev server (or `--skip results-filter,header-fit`, then red:header-fit and red:journey-header-fit standalone with BASE);
   - test:red-anchors: the undeclared count equals WP0's, and the ceiling is never raised.
4. **Drives:**
   - qa:classic-shell-parity --compare;
   - qa:journey-header-fit;
   - red:journey-header-fit, then git diff;
   - red:header-fit;
   - qa:journey-shell, tiles read one by one;
   - qa:journey-preview;
   - qa:footer-reachable;
   - qa:landmark-seal, both modes.
5. **Docs:**
   - VODACOM-PLAN: §0 RESUME, §0i 'S6 as built', §0h points, and the §1 S6 row ✅ only with the merge commit.
   - DESIGN_AUTHORITY kit additions, 'effective at the S15 flip': the captioned balance, the 4-slot journey rail, hub rows, the guest Tiketi sheet.
   - SHELVED complete.
   - memory.
6. **Ship:** merge to main and push. Verify the deploy commit on 50pick.tz (`?dpl=` in the preload header). Run qa:live on production. Journey tiles on production need a staff pass (decision 7).

**Flag gating.** Production proves the 'nobody else' half: qa:live [E2]/[F] on 50pick.tz show no journey testids and `/account` not found for signed-out visitors and the demo player.

**Tests.**
- qa:live (production, extended)
- qa:landmark-seal (classic and --journey)
- test:all, red:all, test:red-anchors
- every drive listed under verification

## New dictionary keys (journey.*)

- journey.balanceCaption: sw 'Salio' / en 'Balance' / zh '余额' (plan §3 table)
- journey.depositAction: 'Weka pesa' / 'Deposit' / '充值' (plan §3 table)
- journey.withdrawAction: 'Toa pesa' / 'Withdraw' / '提现' (NO STRING in S4-COPY-AUDIT.md:74)
- journey.tabQuestions: 'Maswali' / 'Questions' / '问题' (plan §3)
- journey.tabTickets: 'Tiketi zangu' / 'My tickets' / '我的注单' (plan §3)
- journey.tabAccount: 'Akaunti' / 'Account' / '账户' (plan §3)
- journey.ticketsGuestTitle: 'Ingia uone tiketi zako' / 'Sign in to see your tickets' / '登录查看您的注单'
- journey.ticketsKindAria: 'Aina ya tiketi' / 'Ticket type' / '注单类型'
- journey.ticketsEmptyOpenTitle: 'Bado huna tiketi hai' / 'No open tickets yet' / '您还没有进行中的注单'
- journey.ticketsEmptyOpenBody: 'Chagua swali, bonyeza {yes} au {no} — tiketi yako itaonekana hapa.' / 'Pick a question, tap {yes} or {no} — your ticket shows up here.' / '选择一个问题，点击{yes}或{no}——您的注单将显示在这里。'
- journey.ticketsBrowse: 'Tazama maswali' / 'See questions' / '查看问题'
- journey.ticketsEmptyLens: the journey copy of the 'nafasi' empty-lens line
- journey.ticketsEmptyCashed: the journey copy of positions.emptyCashed
- journey.ticketsExitLens: the journey copy of positions.exitLens
- journey.ticketPayout: 'Malipo' / 'Payout' / '派彩'
- journey.ticketPayoutAtResult: 'Matokeo yakitoka' / 'When the result is in' / '结果公布时'
- journey.ticketFinalPayout: 'Malipo ya mwisho' / 'Final payout' / '最终派彩'
- journey.ticketPlacedAt: 'Imewekwa {date}' / 'Placed {date}' / '下注于 {date}'
- journey.ticketsErrorBody, journey.ticketsBack: the journey copies of error.positionsSafe and error.backToPositions, without 'nafasi'
- journey.sellFreeUntil: 'Uza bila ada hadi {time}' / 'Sell free until {time}' / '{time} 前可免费卖出'
- journey.sellFreeCta: 'Uza bila ada' / 'Sell free' / '免费卖出'
- journey.sellFullRefund: 'Rudishiwa {amount} kamili' / 'Get {amount} back in full' / '全额退还 {amount}'
- journey.sellClosedBody: 'Dau hili sasa linasubiri matokeo — haliwezi kuuzwa tena.' / 'This bet is now waiting for the result — it can no longer be sold.' / '此投注正在等待结果——已无法卖出。'
- journey.sellConfirmTitle: 'Uza tiketi hii sasa?' / 'Sell this ticket now?' / '现在卖出此注单？'
- journey.sellKeep: 'Hifadhi tiketi' / 'Keep ticket' / '保留注单'
- journey.sellUnchanged: 'Tiketi haijabadilika.' / 'Your ticket is unchanged.' / '您的注单未变。'
- journey.hubGuestPrompt: 'Ingia au jisajili ili kuona pochi na tiketi zako.' / 'Sign in or sign up to see your wallet and tickets.' / '登录或注册以查看您的钱包和注单。'
- journey.hubHelpSub: 'Maswali ya kawaida · Simu · Barua pepe' / 'FAQ · Phone · Email' / '常见问题 · 电话 · 邮件' (no number; decision 5)
- journey.hubLimitsSub: 'Mipaka · Pumzika · Jizuie' / 'Limits · Take a break · Self-exclude' / '限额 · 暂停 · 自我排除'
- journey.hubCardSize: 'Ukubwa wa kadi' / 'Card size' / '卡片大小' (the corrected word; nav.cardSpacing is left as is)
- journey.hubStaffSub: 'Wafanyakazi tu' / 'Staff only' / '仅限员工'
- journey.hubGroupMoney: 'Pesa' / 'Money' / '资金'
- journey.hubGroupPlay: 'Cheza' / 'Play' / '游戏'
- journey.hubGroupInvite: 'Alika' / 'Invite' / '邀请'
- journey.hubGroupAgent: 'Wakala' / 'Agent' / '代理'
- journey.hubGroupStaff: 'Wafanyakazi' / 'Staff' / '员工'

## Verification (S6 done-when)

- **Baseline (WP0).** Re-derive the pre-existing reds by name and number, and record them in §0i before any S6 code. Capture the classic-shell parity baseline from the pre-S6 tree.
- **Route-entrance census.** test:journey-shell §9 must be green, with a population of at least 50 globbed routes. Each route's door is checked against the source of a file a journey phone renders.
- **Tab:** `/` (Maswali), `/updown`, `/positions` (a guest gets the sheet, which leads to `/auth/login?next=/positions`), `/account`.
- **Header:** `/wallet/deposit` ('+ Weka pesa'), `/auth/login`, `/auth/register`.
- **WalletSheet:** `/wallet`, `/wallet/withdraw`, `/profile/responsible-gambling`.
- **Hub:** `/live`, `/results`, `/leaderboard`, `/fairness`, `/help`, `/notifications`, `/profile`, `/profile/kyc`, `/profile/invite` (when inviteVisible), `/proposals` (unless DISABLED), `/agent` (when agentDoorVisible), `/wallet`, `/wallet/withdraw`.
- **Footer:** `/legal/privacy|aml|terms|rules|responsible-gambling`, `/profile/account`, `/fairness`, `/help`.
- **Page:**
  - `/profile` grid → `/watchlist`, `/profile/activity|notifications|security|sessions|source-of-funds`;
  - `/proposals` → `/proposals/[id]`, `/proposals/new`;
  - `/agent` → `/agent/apply`, `/agent/status`;
  - `/legal/rules` → yes-no/up-down;
  - `/updown` → `/updown/[roundId]`;
  - Tiketi switch → `/updown/history`;
  - journey Tiketi 'Utendaji' → `/positions/performance`;
  - board/home cards → `/markets`, `/markets/[id]`;
  - `/wallet` → `/wallet/receipt/[id]`;
  - login → `/auth/otp`, `/auth/2fa`, `/auth/forgot-password`.
- **External (generating file named):** `/positions/[positionId]`, `/wallet/deposit/return`, `/agent/invite/[token]`, `/auth/reset-password`, `/auth/verify-email`, `/auth/admin`, `/s`, `/s/[token]`, `/offline`.
- **Non-route controls in the hub:** sign-out, language, notifications, card size, Needle drawer, staff console.
- **Red twin:** red:journey-shell catches 'hub row removed', 'tab removed', 'synthetic route added' and 'door file lost its href'.
- **Header fits.** qa:journey-header-fit must report 0 clipped controls and 0 gutter violations.
- **Cells:** 320/360/390/768/1024/1150/1279 × sw/en/zh × {guest, signed-in at TZS 999,999}, plus held, masked and TZS 0 at 320 and 1024. All run on a local in-memory server through a real staff pass.
- **Red twin:** red:journey-header-fit catches N/N mutations, each severing at least one cell. The tree is byte-identical afterwards (`git diff` clean).
- **Both S4 rules** are also asserted statically in test:journey-shell §7.
- **Classic unchanged.**
- qa:classic-shell-parity --compare shows 0 diffs against the WP0 baseline. Cells: guest, player, held and unverified-email viewers × 360/768/1024/1280 × en/sw, across the routes listed in WP0 plus the `/markets/<id>` holder block. The only exception is the recorded footer class string from WP11, whose computed padding is equal.
- red:header-fit (classic) still 1/1.
- qa:journey-preview shows no journey trace for a guest or a player.
- qa:footer-reachable and its red twin are green.
- **Tiles, read one by one** (qa:journey-shell, viewport only, heading asserted before each shot):
- header states: guest, signed-in, held, masked, zero, 999,999;
- the active tab on every tab and hub route;
- the guest Tiketi sheet;
- WalletSheet with Toa pesa;
- the unread dot and the Arifa badge;
- keyboard focus rings;
- Tiketi open, settled, empty, and the switch on `/updown/history`;
- the Akaunti hub signed-in, guest and staff, at 320/360/390/1024/1280 × sw/en/zh;
- the classic chrome for no-pass viewers.
- **Batteries.**
- test:all: no new red beyond WP0's list.
- red:all: new twins caught (red:journey-shell, red:journey-account, red:journey-tickets, plus the extended plants).
- test:red-anchors: undeclared count unchanged from WP0.
- **Production.**
- The deploy commit is verified on 50pick.tz via `?dpl=`.
- qa:live passes, with [E2]/[F] showing no journey testids and `/account` not found for signed-out visitors and the demo player.
- Journey tiles on production follow once a staff pass exists (decision 7).

## Risks

- **Byte-for-byte promise.** Any edit to a shared file changes what every visitor is served. Mitigations:
- the journey chrome lives in new files;
- AppShell swaps between whole components;
- the classic files listed in each package's 'flagGating' change only in ways with identical output.
qa:classic-shell-parity is the proof. WP11's footer class string is the one deliberate served-byte change; its computed values are equal.
- **Anchor and locator collisions.** These must each resolve once in their own file:
- wallet-reach;
- header-fit `<span className="hidden xl:inline">`;
- section-rail (bottom-nav.tsx:295);
- stacking sole locators (:191/:193);
- tap-rung (the CashEye);
- layout-staleness (the pill listener, wallet-balance-pill.tsx:60);
- measure (positions/page.tsx:256);
- the S1 plants (`  const h = await headers();`, `{journeyPreview && <PreviewMarker `).
New files keep them unique; run test:red-anchors after every package.
- **Unreachable doors on phones.** The journey phone header drops the language menu, bell and avatar. If the tabs land before /account, a preview viewer below 1024 cannot sign out (E-190 in a new shape). That is why WP5 precedes WP6b, and why the census lands in the same commit as the swap.
- **Refactoring the classic bell into the shared store (WP3)** can double-poll or change cadence. red:feedback-law's inline mutation is not audited by test:red-anchors, so it can rot silently. Re-point it, then run red:feedback-law and compare request counts.
- **The root layout is frozen on soft navigation.** After an Owner Stop or a pass expiring, the journey chrome stays until the next document load or router.refresh(), and `/account` can then show not-found inside journey chrome. This is accepted at journey-preview.ts:244-247. Never add a client auto-redirect: E-381 retry-stormed.
- **/account for classic visitors** answers the not-found body at HTTP 200, because the root loading.tsx streams first (pre-deploy-live-check.mjs:458-459). An unmatched URL today is a true 404. The proxy cannot help: test:simple-journey-flag 10.no.grant forbids it reading the pass.
- **The header-fit harness is heavy.** It runs about 50 cells for each of 7 mutations, plus settle loops. red:all's 300 s timeout (red-all.mjs:87) is too short. It mutates tracked files: run it standalone, detached, never piped, under the lock, and `git diff` afterwards. A session that ends mid-run leaves the defect planted.
- Mutations may come back MISSED, because real balances compact at ≥1M. The widest real string is 'TZS 999,999' (11 chars), against the canvas's 'TZS 1,250,000' (13). Record the measured slack; never weaken the matrix.
- **'Tiketi zangu' probably does not fit an 80px track at 320** (JetBrains Mono 11px ≈ 79px plus 4px padding). `.kp-rail__label` would ellipsize it. Rule: wrap to two lines below 360, asserted by the drive.
- **E-190 band at 1024 in Swahili.** Four destinations, a labelled pill, the capsule, language, bell and avatar share the row. Measure it, and yield the pill label only if a cell clips.
- **Canvas drift from the kit.** The canvas draws: a 64px header; pill-shaped desktop links; a --bg-elevated capsule; segmented capsules for the Tiketi switch and card size; a 68px rail; round bordered language and bell buttons. The kit wins (DESIGN_AUTHORITY). Each deviation is recorded in §0h. S7's above-the-fold budget must use 56.
- **Helpline vs our desk.** The canvas's Msaada sub-line puts 0800 11 0011 (the national problem-gambling helpline, support-config.ts:120) under 50pick's help desk. test:support-contact §8 also bans support-contact literals outside support-config.ts.
- **The break flag fails open.** promoSuppressed fails OPEN on an RG read error, so '+ Weka pesa' can show during a break after a failed read. This is LAW 1 (it gates an offer, never a refusal) and is stated, not hidden.
- **No email bar for journey viewers before S9's inline code.** Hiding EmailVerifyBanner leaves the deposit page's own EmailVerifyGate in place. But the agent-application fee (agent-application-service.ts:688) loses its standing reminder for preview viewers.
- **Classic words on journey desktop until the S15 sweep:** the avatar menu's hard-coded 'Nafasi' row (avatar-menu.tsx:368) and the bell's rose CountBadge.
- **Pre-existing reds must be re-derived in WP0**, so S6 is neither blamed nor credited for them. The ones recorded so far: type-scale; red-anchors 4.1/4.2 (66 vs 65); house-bot-disclosure 5.1, red by construction on a dictionary change; tap-target; decomment; section-rail offenders.
- **Cross-lane conflict.** MOBILE-VISUAL-PLAN U21 (branch mobile-visual) plans its own --rail-h and a 48px short-screen rail. Two definitions would drift.
- **A live defect, outside S6.** away-summary-bar.tsx:143 links to `/positions?filter=settled`, but parsePortfolioParams reads only `?tab` (portfolio.ts:148-161). Every player lands on 'all' today.
- **Machine limits.** ALI-BLADE15's RAM: one heavy job at a time through `~/heavy-node-lock.sh`, never wrapped in `timeout`.
- Run `rm -rf .next` before every drive.
- Browse localhost, never 127.0.0.1.
- Tailwind scans comments, so no class-shaped strings in new comments.
- A 'use client' helper imported by server code takes every page down; test:journey-shell §5 guards journey-on.ts importers.

## The critic's findings (verdict and gaps)

PARTLY REFUTED: the architecture holds, but 1 blocker and 9 majors must be fixed before WP3/WP5/WP6b/WP7/WP10 run.

**What survives.** These claims checked out against the code:
- `journeyShown` is the cached resolver's `journey` (journey-preview.ts:248-255, app-shell.tsx:368).
- The swap points are app-shell.tsx:390 and :472.
- red-all `--skip` is a substring match (red-all.mjs:101); the 300 s default is at :87.
- `I.trade` is at glyphs.tsx:100.
- "Nafasi" is hard-coded at avatar-menu.tsx:368.
- These keys and functions exist: `notif.unreadOne/unreadN` (:2028), `performance.viewPerformance`, `formatClock` (utils.ts:358, EAT tz).
- `/auth/demo` supports `?deposit=0`, `?hold=officer` and `?email=unverified`. seed-wallet ADDS to the balance, so 0 + 999,999 works.
- The away-summary defect is real: the link is `/positions?filter=settled` at away-summary-bar.tsx:141, and `parsePortfolioParams` reads only `tab`.
- No gate pins EmailVerifyBanner (grep of scripts/ finds nothing).
- Every existing script key the plan names exists in package.json.

**What fails.** Three classes of problem:
- The plan's own "byte-for-byte" and "classic unchanged" proofs have holes: the bell store, `/account` metadata, and the parity harness contradicting itself on `/account`.
- One existing gate breaks that the plan expects to stay green: install-invite 5.2.
- The done-when proofs are weaker than claimed: the self-referential gutter probe, the undecided policy for mutations that miss, and a static census that does not walk reachability.

The money-truth label in WP10 (the free-sell time) must come from the poll's frozen grace, not a fixed 5 minutes.

### G1 [blocker]
WP3 turns the bell's per-component state into a module-level store. Every live player gets this change, not just journey viewers.

Today, `items`, `serverUnread` and the `prevUnread` baseline are reset when NotificationsPanel unmounts. That happens when the shell goes to guest after a session ends during a refresh (E-381 branch). With a module store they survive the unmount.

Scenario on a shared phone:
- Player A's session ends mid-visit; the shell re-renders as guest without a reload.
- Player B taps the header's Ingia (a soft `<Link>`) and signs in. The login is a Server Action `redirect()` (login/actions.ts:99), so it is also a soft navigation.
- The bell remounts and shows A's unread count, and A's list if opened, until B's first fetch lands. On 2G that can take seconds.
- A's baseline also makes B's first poll count as an arrival, so the bell rings falsely.

None of the proposed proofs can see this:
- the parity snapshot (one viewer per context);
- the 65 s request-count probe;
- the static checks in journey-shell §6.

*Evidence.* notifications-panel.tsx:67-70 holds `items` and `serverUnread` as useState; :123 holds `prevUnreadRef`.
top-app-bar.tsx:384 mounts `{user.isAuthed && <NotificationsPanel />}`.
app-shell.tsx:141-150 is the E-381 path that renders the guest shell without navigating.
login/actions.ts:99 signs in with `redirect((safeNext || "/?welcome=back"))` from a Server Action.

*Fix.* Key the store by viewer:
- AppShell passes `session.userId`, or the store reads it from a server-stamped attribute.
- Reset `items`, `serverUnread`, `prevUnread`, `refreshSeq` and the backoff whenever the id changes.
- Also reset when the count of enabled subscribers drops to 0.

Add a test:journey-shell §6 check that the reset exists, plus a plant 'store keeps items across viewer change'.

Add a drive step in qa:journey-shell:
- end the demo session through the idle path;
- sign in a second account through the header `<Link>`;
- assert the bell's badge is never the first account's count before B's first answer.

Alternative: defer the shared store. Give only the journey files (tabs and hub) their own poller, and leave the classic bell untouched until S15.

### G2 [major]
WP5's `/account` `generateMetadata` returns `t.journey.tabAccount` without asking the resolver.

Metadata runs independently of the page body; in Next 16, metadata streams for non-bots. The tab title can therefore read "Akaunti"/"Account" for a classic visitor who types `/account`, while the body is the not-found view.

The repo's own precedent says the title must obey the same switch as the body: profile/invite/page.tsx:29-44, "The TAB TITLE obeys the same switch the body does".

*Evidence.* Plan WP5 step 1: "generateMetadata → t.journey.tabAccount" (no gating), whereas WP9 explicitly gates positions' metadata "when journey".
package.json:1031 `"next": "^16.0.0"`.
profile/invite/page.tsx:29-44 is the precedent.

*Fix.* In `generateMetadata`:
- call `resolveSimpleJourney()` first;
- call `notFound()`, or return the not-found title, when `!journey`.

Pin it in test:journey-account: "generateMetadata asks the resolver before any t.journey read", plus a plant.

Extend qa:live [E2]/[F] and qa:classic-shell-parity to assert the `<title>` of `/account` equals the not-found title for guests and the demo player.

### G3 [major]
The parity harness contradicts itself on `/account`, and `account/loading.tsx` streams the hub skeleton to classic visitors.

WP0 captures `/account`'s HTTP status into a baseline and exits 1 on any diff in `--compare` mode. Pre-S6 that status is a true 404. The plan itself says post-WP5 it is a 200, because the root loading.tsx streams first.

Result: WP5 fails its own gate by construction. The likely response is a re-baseline, which would also hide real diffs.

Separately, the new `account/loading.tsx` is a Suspense fallback that renders BEFORE the page's `notFound()`. The hub skeleton is therefore in every classic visitor's raw HTML for `/account`.

The summary's claim that WP11's footer class is "S6's one deliberate served-byte change" is false: `/account` 404→200 plus skeleton bytes is a second one.

*Evidence.* Plan WP0: "/account's HTTP status and main text … --compare <file> (exit 1 on any diff)". Plan WP5 flagGating and risks: "HTTP 200 here because the root loading.tsx streams first".
src/app/loading.tsx exists.
pre-deploy-live-check.mjs ~:458 says "A 200 IS NOT A RENDER … notFound() renders the not-found BODY at 200 here".

*Fix.* Give the harness a named EXPECTED-DIFF list with a reason per entry, never a re-baseline. For `/account` it asserts the documented post-S6 state instead:
- the not-found body;
- the not-found title;
- noindex;
- no journey testid.

Drop `account/loading.tsx`; the root loading.tsx is generic. If a hub ghost is wanted, make it a client component that reads `useJourneyOn()` and renders the root's generic loader when off.

Correct the summary's 'one served-byte change' statement in §0i.

### G4 [major]
WP7 breaks test:install-invite 5.2, which the plan lists as staying green.

5.2 requires the EXACT import `import { isMoneySurface } from "@/lib/surfaces"` in needle.tsx. WP7 adds `isJourneySurface` to needle.tsx. The natural edit, `import { isMoneySurface, isJourneySurface } from "@/lib/surfaces";`, no longer matches the regex.

*Evidence.* scripts/install-invite.test.mts:127: `/import /{ isMoneySurface /} from "@//lib//surfaces"/.test(read("src/components/layout/needle.tsx"))`.
Plan WP7 step 2 adds `isJourneySurface(pathname)` to needle.tsx:792.

*Fix.* In the WP7 commit, change the regex to `/import /{[^}]*/bisMoneySurface/b[^}]*/} from "@//lib//surfaces"/`.

Keep the 'Needle imports it rather than declaring its own' meaning. Add a negative clause too: needle.tsx must contain no local `MONEY_ROUTE` or `function isMoneySurface`.

Record why in the test comment, and run test:red-anchors (install-invite.anchors.mjs:134 still anchors `export function isMoneySurface(`).

### G5 [major]
The journey header-fit proof cannot catch the S4 rules it claims to assert.

(a) GUTTER_PROBE compares the rightmost control against vw minus the row's COMPUTED padding-right. The 'gutter-16-below-360' mutation changes that padding too, so the probe follows the mutation and never fires.

(b) The plan requires every mutation to sever at least one cell, but also says "A MISSED mutation means the rule has slack … Record the measured slack; never shrink the matrix." A MISSED mutation exits 1, so red:journey-header-fit is either permanently red (noise in red:all) or someone drops the mutation. Missed mutations are likely:
- the real widest string is 'TZS 999,999' (formatBalancePill compacts at ≥1M);
- the S4 measurement used 'TZS 10,000,000', which fitted exactly at 320 with no slack;
- so there is real slack at 320, and gap-6→8 or pad changes may not clip.

*Evidence.* Plan WP6b red:journey-header-fit: GUTTER_PROBE defined as "rightmost visible header control ≤ vw − the row's computed padding-right"; mutation list includes gutter-16-below-360; the 'Each must sever ≥1 cell' vs 'A MISSED mutation means … slack' contradiction.
VODACOM-PLAN.md:218-219: "Swahili at TZS 10,000,000 included (exactly 320)".
utils.ts:200-204 is BALANCE_COMPACT_ABOVE=1,000,000.

*Fix.* Split the proof into two parts:
1. A RULE probe per cell that reads computed values against FIXED expected tokens:
   - row padding-inline is 12px below 360 and 16px from 360;
   - '.kp-jhdr__plus' is display:none below 360;
   - the figure font-size is 12 then 14px;
   - gap is 6px;
   - the home link margin is −9px.
   Each mutation must fail this probe in at least one cell; that is deterministic.
2. CLIP_PROBE plus scrollWidth only for 'fits', on the clean tree.

Decide in advance that the rule probe, not clipping, is the red criterion.

Also cover the shortest-slack case. Either add a synthetic 'TZS 1.25M' cell (the widest compact string), or measure and record the per-cell slack in §0i.

### G6 [major]
WP12 proposes "red:all on a dev server" as an option, and that can leave a mutation planted.

- red-all runs each harness through `spawnSync(npm, ['run', key], { shell: true on win32, timeout })`. On Windows a timeout kills cmd/npm but not the grandchild node process.
- red:journey-header-fit (≈50 cells × 7 mutations) will exceed 300 s.
- Its orphan keeps mutating journey-top-bar.tsx and globals.css while red:all moves on to the next harness.
- That is the concurrent-mutation failure recorded in memory: a live gate left disabled, a defect left planted.

The plan also says the 300 s is "too short" without mentioning that red-all already accepts `--timeout`.

*Evidence.* red-all.mjs:11 documents the `--timeout 600` flag; :87 sets the default 300 s; :159-166 calls `spawnSync(npmCli, ["run", h.key], { shell: process.platform === "win32", … timeout: timeoutMs })`.
Plan WP12 battery: "red:all on a dev server (or --skip …)".
Memory note `reference_red_harness_mutates_the_repo.md`.

*Fix.* In WP12, remove the 'red:all on a dev server' option. Always run `red:all -- --skip results-filter,header-fit`, then run red:header-fit and red:journey-header-fit standalone, detached, under the lock, followed by `git diff --exit-code`.

In journey-header-fit-red.mjs, add a restore-on-signal and exit handler: SIGINT, SIGTERM and process 'exit' restore every mutated file from the in-memory originals.

Make the harness self-limit its runtime and print INCONCLUSIVE rather than being killed.

### G7 [major]
The journey Tiketi view would still show and announce "Nafasi", and the proposed gate cannot see it.

WP9 renders `<PositionsBar variant='journey'>` with "row 1 only". Row 1 contains:
- `QueryStrip ariaLabel={t.positions.filterAria}`, which is sw "Kichujio cha nafasi";
- `QueryResultCount` with `positions.oneResult/nResults`, which is sw "Nafasi 1" / "Nafasi {n}".

The planned test:journey-tickets check ("no 'nafasi' in the sw values the journey Tiketi files read") scans only journey files. positions-bar.tsx is not one, so the check passes while "Nafasi 12" is on screen. This contradicts SJ-19 and the S6 "rename" deliverable.

The canvas also draws 5 lenses with no result count; POSITION_LENSES has 7.

*Evidence.* positions-bar.tsx:121-123 builds `resultPhrase` from `t.positions.oneResult` / `nResults`; :141-155 is row 1 with `<QueryStrip ariaLabel={t.positions.filterAria}>` and `<QueryResultCount>`.
i18n-dict.ts:4360 `filterAria: "Kichujio cha nafasi"`; :4364 `oneResult: "Nafasi 1", nResults: "Nafasi {n}"`.
portfolio.ts:93 has 7 POSITION_LENSES.

*Fix.* Give the journey variant its own words, and drop QueryResultCount (the canvas has none):
- new keys `journey.ticketsFilterAria`;
- new keys `journey.ticketsCountOne` and `journey.ticketsCountN`.

Extend test:journey-tickets to follow PositionsBar's reads when `variant==='journey'`. Have it assert positions-bar.tsx's journey branch reads no `t.positions.*` key whose sw value contains /nafasi/i, plus a plant.

Record the decision on 5 vs 7 lenses as a §0h point. lifecycle-reach needs the settled union lens.

### G8 [major]
WP10's "Uza bila ada hadi {time}" is a promise about money, but the plan derives it from "placedAt plus the grace".

- The server's real free window comes from each poll's FROZEN `freeExitGraceMinutes`, through `exitWindowFacts(ratesFor(market))`.
- SellButton's countdown is hard-coded `GRACE_MS = 5 min`.
- For any poll frozen with a different grace, the label and the m:ss countdown can claim a free sale after the server has started charging a fee or locked the exit.
- Keeping "the cash-out logic untouched" preserves that mismatch on the journey's headline sell line.

*Evidence.* market-service.ts:3008-3016: `exitWindowFacts({… freeExitGraceMinutes: cfg.freeExitGraceMinutes …})` and `inGracePeriod = hadRunway && withinWindow && sinceBet < graceMs`.
sell-button.tsx:23 `const GRACE_MS = 5 * 60_000;`; :79 and :110 use it.
payout.ts:94-104 says the grace is a per-poll frozen default.

*Fix.* In positions/page.tsx, which already prices with houseBotId, compute `graceEndsAt` per open position through `exitWindowFacts` and the market's `ratesFor`. Pass it as an ISO instant, never recomputed client-side.

In the journey look:
- format the label with `formatClock(graceEndsAt)`;
- drive the countdown from the same instant, not `GRACE_MS`.

Do not change `cashOutValue`'s return shape: test:house-bot-seam pins its golden grid.

Add test:journey-tickets §sell checks: "label and countdown read the same server instant" and "no GRACE_MS in the journey path", each with a plant.

File the classic GRACE_MS mismatch as its own defect.

### G9 [major]
The route-entrance census, which is S6's done-when, is static presence, not reachability.

- An entry passes if some file 'contains the href'.
- A 'page' door is accepted without proving its own page is reachable from a root (tab, header, sheet, hub or footer), so cycles and orphan pages pass.
- Doors gated by viewer state (`inviteVisible`, `proposalsVisible`, `agentDoorVisible`, held wallet, guest vs signed-in) are not evaluated per viewer.
- Sources are not stated to be decommented, so an href in a comment would count.
- The plan's enumerated list already misses `/legal/agent-terms`, which exists on disk and is linked only from `/agent` and apply-client.

*Evidence.* Plan WP6b: "Each route needs an ENTRANCES entry {route, door, file} whose file source really contains the href"; door 'page (a destination page reachable from those)' has no reachability check.
Disk census: 58 non-admin page routes incl. `/legal/agent-terms`.
The plan's verification list omits `/legal/agent-terms`, which is linked only from src/app/agent/page.tsx and src/app/agent/apply/apply-client.tsx.

*Fix.* Build the census as a graph:
- roots are JOURNEY_TABS, the header, the sheets, `hubRowsFor(viewer)` and the footer;
- edges are decommented hrefs per page file;
- run a BFS per viewer kind (guest, player, held, agent-in-standing, staff, proposals-DISABLED, invite-closed).

Assert the classic ⊆ journey property: every route reachable from the classic chrome for that viewer kind is reachable from the journey chrome.

Add these plants:
- an orphan page door (a cycle);
- an href only inside a comment;
- `/legal/agent-terms`'s door removed.

### G10 [major]
WP3's store API, as written, cannot keep the classic bell's behaviour identical.

The panel adjusts `serverUnread` optimistically in six places, and calls `setItems` with updater functions. The plan's hook returns `{ items, serverUnread, unread, arrivalSeq, refresh, setItems }`, with no `setServerUnread` and no updater semantics.

The result would be either a badge that lags after dismiss or mark-all (a behaviour change on a live surface), or an improvised API. Neither the 3-second parity snapshot nor the request count would notice a transient lag.

*Evidence.* notifications-panel.tsx:428-469: `setItems((cur) => …)`, `setServerUnread((n) => …)`, `setServerUnread(0)`, `setServerUnread(prevUnread)`.
Plan WP3 step 2 lists the return shape.

*Fix.* Expose `setServerUnread` with updater support, and make `setItems` accept updaters, exactly mirroring React's setState.

Add a drive step:
- seed 2 unread;
- dismiss 1;
- assert the badge reads 1 within one frame, before the refresh lands.

Alternatively, defer the bell refactor (see the blocker).

### G11 [minor]
The hub's group labels are incomplete in newDictionaryKeys.

Each card is a `<ul aria-label={journey.hubGroup*}>`, but only Money, Play, Invite, Agent and Staff are defined. The canvas cards also include RG/safety (limits, break, helpline), profile/ID/attestation, help/notifications, settings (language, card size, Needle, search) and, for guests, legal.

Five drafted keys also have no values:
- `ticketsEmptyLens`;
- `ticketsEmptyCashed`;
- `ticketsExitLens`;
- `ticketsErrorBody`;
- `ticketsBack`.

*Evidence.* Plan newDictionaryKeys (hubGroup* list). Canvas s4-8-akaunti.dc.html card order per the akaunti map; s4-8-akaunti-guest.dc.html has a legal card.

*Fix.* Add these keys with sw/en/zh drafts (R8: formal 您, 注单) and list them in S4-COPY-AUDIT for the native review:
- `journey.hubGroupSafety`;
- `journey.hubGroupProfile`;
- `journey.hubGroupHelp`;
- `journey.hubGroupSettings`;
- `journey.hubGroupLegal`.

Write concrete values for the five vague tickets keys.

### G12 [minor]
The captioned capsule has an accessibility naming problem.

The plan reuses the classic `aria-label` rule, `${t.common.wallet} · …` ("Pochi · TZS x"). That overrides the visible caption "Salio", so voice-control users cannot say the visible label (WCAG 2.5.3, label in name).

For a held wallet the name also drops "limegandishwa" (frozen), which is shown visually.

*Evidence.* wallet-balance-pill.tsx:222 builds the aria-label from `t.common.wallet`. Plan WP4: "Its aria-label follows the rule at :222". Canvas s4-2-hdr-held shows the caption "Salio · limegandishwa".

*Fix.* Remove the `aria-label` and let the name come from the visible caption plus figure. Alternatively, build the label as `${caption} ${figure}` with the frozen word when held, and keep the hideBalances wording when masked.

Assert it in wallet-reach §8.

### G13 [minor]
`aria-current="page"` is used for section membership.

`activeTabFor` maps `/results`, `/live`, `/wallet`, `/help` and others to the Akaunti tab, and `/markets/<id>` to Maswali (href `/`). The plan sets `aria-current='page'` on a link whose href is not the current page, so a screen reader announces "Akaunti, current page" while the reader is on Matokeo.

*Evidence.* Plan WP2 activeTabFor table and WP6a: `aria-current={activeTabFor(pathname) === key ? 'page' : undefined}`.

*Fix.* Use `aria-current="page"` only when the pathname equals the tab's href, and `aria-current="true"` for section membership.

test:section-rail only needs the attribute present, so it still passes. Add the distinction to test:journey-shell §8.

### G14 [minor]
New stacking and popup rows have no red twins.

The plan adds journey rows to test:stacking (ROOT_SURFACES, TRAPPED, LAWS) and test:popup-fit (REVIEWED). Neither gate has a red twin, so the new rows are never proven able to fail. The session law asks for red twins reachable from red:all.

*Evidence.* package.json has no `red:stacking` or `red:popup-fit` (checked: MISSING).

*Fix.* Add in-process plants to red:journey-shell that feed modified source strings to the stacking and popup-fit check functions (export them):
- journey-tabs at z-30;
- journey-top-bar not sticky;
- the tickets sheet unportaled;
- the sign-out-row file unreviewed.

Alternatively, add a `--prove-red` mode to stacking-contract.test.mts.

### G15 [minor]
Not every gate that stops the journey reaching other visitors runs in predeploy.

Only test:journey-shell is appended to predeploy. test:journey-account (hub notFound before any read) and test:journey-tickets (journey branch before the classic JSX, no houseBot names) are the other per-request leak guards. S1's guard sits in predeploy.

The hub's data path is also new composition (KYC predicate, `inviteViewerFor`, `invitePaysPlayersNow`, `viewerDoorsFor`) with no two-store run. The session law asks for memory and Prisma twins.

*Evidence.* package.json:297 predeploy already holds test:simple-journey-flag. VODACOM-PLAN.md:32 session law. Plan WP2 step 'append to predeploy' names only test:journey-shell.

*Fix.* Append test:journey-account and test:journey-tickets to predeploy.

Extract `loadHubViewer(userId, deps)` and test it in memory and against the fake Prisma client, as simple-journey-flag §12 does.

### G16 [minor]
Work-package order and drive coverage have gaps:
- WP6b's census cites doors that only exist after WP9: `ticket-switch.tsx` for `/updown/history` and the TicketsView 'Utendaji' link for `/positions/performance`.
- qa:footer-reachable 'in pass contexts' needs footer-reachable.mjs to learn the pass, but no WP lists that file.
- test:responsive adds `/account` with no pass, so it sweeps the not-found page and reports false coverage.
- test:dead-css (which ratchets classes nothing renders) is not listed for the new `.kp-jbal*`, `.kp-hub*` and `.kp-jhdr*`/`.kp-rail--journey` rules.

*Evidence.* Plan WP6b census list and WP9 files. package.json:952 `qa:footer-reachable` points at scripts/footer-reachable.mjs. package.json:685 `test:dead-css`.

*Fix.* At WP6b, cite the classic doors (positions/page.tsx:269-274 and the /updown page's history link), and re-point them in WP9 with a census plant.

Add scripts/footer-reachable.mjs to WP6b/WP11 files, with a pass option from journey-pass.mjs.

Either give responsive-audit a pass or leave `/account` out of PLAYER with the reason recorded.

List test:dead-css under WP4, WP5 and WP6a.

### G17 [minor]
`positions/loading.tsx` is planned as an async server component that awaits the resolver.

That delays the loading ghost for EVERY viewer, classic included, behind the resolver: the switch snapshot plus, for pass holders, a DB lookup. A prefetched loading state also blocks on the same work.

This changes what classic viewers see during loading.

*Evidence.* Plan WP9 step 'positions/loading.tsx: a journey ghost (async server component …)'.

*Fix.* Make the journey ghost choice client-side. A `'use client'` loading component calls `useJourneyOn()`; the classic ghost is the server snapshot, and the journey ghost appears on soft navigation.

Keep tier 'reading' for test:measure parity.

### G18 [minor]
Unrecorded departures from the approved canvas and the rulings:
- **Balance format.** The build compacts balances of 1M and above ("TZS 1.3M"), while the approved 320 frame shows "TZS 1,250,000".
- **Guest hub.** SJ-17 lists "sign in / sign up" in the signed-out hub; the plan follows the canvas, which has no buttons.
- **Rail labels.** Wrapping 'Tiketi zangu' to two lines reverses the documented `.kp-rail__label` rule ("must be allowed to ellipsise rather than wrap").
- **Self-exclusion link.** 'Pumzika / Jizuie' lands on `#break`, while self-exclusion is the separate `#exclude` section.

*Evidence.* s4-2-hdr-320-long.dc.html shows 'TZS 1,250,000'; utils.ts:200-204; VODACOM-PLAN.md:856; globals.css .kp-rail__label comment; profile/responsible-gambling/page.tsx:207 `id="break"`, :229 `id="exclude"`.

*Fix.* Add each item as a numbered §0h point with how to overrule it.

For the RG row, either split it into two rows (`#break`, `#exclude`) or land on a heading that introduces both, and pin the anchor in test:journey-account.

### G19 [minor]
Smaller precision issues:
- **`activeTabFor`.** `/s*` → null as a prefix would also swallow any future `/s…` route (marketing-optout already tests '/settings' and '/sx/abc' as non-matches). The exact routes are `/s` and `/s/[token]`.
- **Copied tween logic.** WP4 copies about 48 lines of tween/flash logic into a private hook, creating a second definition that will drift: a single-source violation.
- **`.kp-rail--journey` target.** Classic sets the grid on the inner `<ul>` (an inline style), not on `.kp-rail`, so a rule on the nav would make the list one grid cell.
- **Stale baseline.** The parity baseline is a file captured once at WP0. Any rebase onto main, which other lanes push to, makes it stale.

*Evidence.* Plan WP2 active-tab table. wallet-balance-pill.tsx:123-170 is the source of the copy. bottom-nav.tsx:193 `<ul … style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}>`. Plan WP0 baseline.

*Fix.* For the routes:
- match `/s` exactly or `^/s/`;
- add a plant for '/settings' resolving to null.

For the tween logic: extract the existing tween into a shared module-private hook that the classic pill calls with identical output (anchors untouched), or record the duplication in §0i with a parity test.

Put `.kp-rail--journey` on the `<ul>`, or target `.kp-rail--journey > ul`.

Re-capture the baseline from the rebased pre-S6 parent after every rebase, and record the base SHA in the baseline file.

## ⭐ Amendments (the coordinator, 2026-10-01) — these override everything above

Every critic finding was accepted. Where a finding offered a choice, the choice made is stated. Ali is away; each
owner-level call is also a numbered point in `VODACOM-PLAN.md` §0h.

**A0 · First, a standalone live fix (before WP0).** `away-summary-bar.tsx` links to `/positions?filter=settled`, but
`parsePortfolioParams` reads only `?tab`, so every player lands on "all". Fix the link to the lens the page reads, with a
test that pins the link to a lens `parsePortfolioParams` understands, and a plant. Its own commit, live for everyone.

**A1 · G1 + G10 — the classic bell is NOT refactored.** WP3 becomes a journey-only unread hook
(`src/lib/journey/use-unread-count.ts`) used only by journey files (the Akaunti tab dot and the hub's Arifa row). It
polls the same endpoint on the bell's cadence, is keyed by the viewer's user id and resets everything when the id
changes, and mounts only for journey viewers. `notifications-panel.tsx` is untouched until S15. Consequence, accepted:
on a journey desktop page that shows both the bell and a hub row, two pollers run; the hub row reads at mount and on
`50pick:refresh-notifications` only (no interval) to keep that cost to one request per visit. `useUnreadNotifications`
(the plan's name for a shared store) is re-scheduled to S15, when the classic bell retires.

*As built (WP3, 2026-10-01):* `useUnreadCount({ userId, mode })` in `src/lib/journey/use-unread-count.ts`, its rule in
`unread-count.ts` (pure; `test:journey-shell` §6 drives it in process). The Akaunti dot is mode `poll`: the bell's closed
cadence, ladder and jitter, and both its broadcasts. The Arifa row is mode `once`: a read at mount and on
`50pick:refresh-notifications`, no beat, no pushed arrival. Both callers pass the viewer's id (never a boolean) and are
`"use client"` files under `src/components/journey/` (§6 `6.mount`). ⚠️ Because the dot polls, a signed-in journey page
runs two 30 s pollers at every width until S15, not one extra request on desktop — `VODACOM-PLAN.md` §0h point 16 is
corrected; WP6a then made it ONE per width (the bell mounts only from 1024, the dot only below it, neither before the
width is known: `src/lib/journey/one-poller.ts`, `test:journey-shell` §8). **Still owed:** (1) G1's drive, in WP6b or
WP12: on a preview session, end A through the idle (E-381) path, sign B in through the header's link, and assert the
Akaunti dot and the Arifa row never show A's count before B's first answer lands. (2) WP12 proves the bell untouched by
S6: `git diff --exit-code "$(git merge-base origin/main HEAD)" HEAD -- src/components/layout/notifications-panel.tsx`
(not a hash in a predeploy test: another lane may fix the bell, and that must not turn predeploy red).

**A2 · G2 — `/account` metadata obeys the switch.** `generateMetadata` calls `resolveSimpleJourney()` first and returns
the not-found title (and `robots: noindex`) when the journey is off. Pinned in `test:journey-account` with a plant.

*As built (WP5, 2026-10-01):* `{ ...(await notFoundMetadata()), robots: { index: false, follow: false } }`, the
not-found page's own `generateMetadata` imported from `@/app/not-found` (`test:journey-account` §2, three plants). ⚠️ On
a matched route at HTTP 200 this page metadata replaces the root layout's robots, and Next adds its own noindex only to
a 404, so a classic visitor's `/account` sends one robots meta, "noindex, nofollow", where it sent "index, follow" and
"noindex". Named in `qa:classic-shell-parity` as `account-robots-noindex` (A3); the title is the same string.

**A3 · G3 — the parity harness uses a named EXPECTED-DIFF list, never a re-baseline.** `/account` for classic viewers is
expected to change from a true 404 to the not-found body at 200 (the root `loading.tsx` streams first), with the
not-found title, `noindex`, and no journey test id. No `account/loading.tsx` (the root loader is generic). §0i states
the served-byte changes S6 makes for classic viewers, all listed.

**A4 · G4 — `test:install-invite` 5.2** is widened in the WP7 commit to `/import \{[^}]*\bisMoneySurface\b[^}]*\} from
"@\/lib\/surfaces"/`, plus a negative clause (no local `MONEY_ROUTE` / `function isMoneySurface` in `needle.tsx`), the
reason in the test comment, then `test:red-anchors`.

**A5 · G5 — header-fit is two probes.** (1) A RULE probe per cell reading computed values against fixed tokens: row
padding-inline 12px below 360 and 16px from 360; the "+" glyph `display:none` below 360; figure 12px then 14px; gap 6px;
home-link margin −9px. Each mutation must fail the rule probe in ≥1 cell — deterministic, and the red criterion. (2) A
CLIP probe (clip + scrollWidth) on the clean tree only, for "fits". Cells include the widest compact balance strings
`TZS 999,999` and `TZS 1.25M` (`formatBalancePill` compacts at ≥ 1,000,000); per-cell slack is measured and recorded.

*As built (WP6a, 2026-10-01):* the probe's 12px / 16px gutter and 6px gap are the values below 640. From 640 the row
takes the classic bar's own steps (WP6a step 1): `.kp-jhdr__row` padding-inline 24px from 640, and gap 20px / 12px /
20px from 640 / 1024 / 1280; the right-hand controls sit in one `.kp-jhdr__cluster` (6px, then 12px from 640). WP6b's
rule probe reads those at its 768–1279 cells. `test:journey-shell` 7.steps holds them against the classic bar's own
spellings, so the two bars cannot drift apart silently.

**A6 · G6 — never `red:all` against a dev server.** Always `red:all -- --skip results-filter,header-fit`, then
`red:header-fit` and `red:journey-header-fit` standalone, detached, under the lock, then `git diff --exit-code`. The new
harness restores every mutated file on SIGINT/SIGTERM/exit and self-limits its runtime, printing INCONCLUSIVE rather
than being killed.

*As built (WP6b, 2026-10-02; A5 and A6, with the WP6b review's corrections):* the rules, the matrix and the probes are
written once, in `scripts/live/journey-header-fit.mjs`, and both `qa:journey-header-fit` (the clean matrix: the RULE
probe, the clip, the overflow, each cell's slack — the row's free space — and below 1024 the rail labels A17 owes) and
`red:journey-header-fit` import them. The red criterion is the RULE probe alone, and each of the nine mutations
(`scripts/anchors/journey-header-fit.anchors.mjs`) names the rule that must break. A rule is asked only where its
element is drawn: a KP_ROUTE on the deposit screen or its return skips the pill's rules there, by the header's own
rule, whose copy in the drives `test:journey-shell` §10 holds to `journeyHeaderState`; the twin refuses such a route,
because two of its mutations could never be asked on it. Every mutation's text also names itself in a
`--kp-red-witness` custom property, the one name the anchors file spells (`WITNESS_PROPERTY`), and the harness
measures only once the served stylesheet holds it: a mutation the server never served reads BROKEN, not MISSED. The
widest compact figure is `TZS 9.9M` (TZS 9,940,000): `formatBalancePill` prints one decimal, so the plan's `TZS 1.25M`
cannot occur, and every `TZS d.dM` is one width in the mono figure. The mark-and-lockup rule is read by the RULE probe
but not mutated in the browser: `test:journey-shell` 7.brand holds it in source, with its own plant. **A6 as a fact,
not prose:** the twin refuses, exit 2 and before its first write, without `--alone` on its own command line (its
package script never passes it, so `red:all` cannot) and whenever KP_RED_ALL is set, which `red:all` now sets for
every harness it starts; `test:journey-shell` §10 holds both refusals and the mark, with plants. Restores: on exit, on
an error, and on SIGINT, SIGTERM, SIGHUP and SIGBREAK where the OS delivers them; each write is read back and retried,
and one that cannot be restored is named loudly with its `git checkout`. ⚠️ A hard kill on Windows (a forced kill, a
crash, a bluescreen) runs none of that, so the mutation stays on disk with its witness: the twin refuses to start
over one, `test:journey-shell` §10 fails predeploy on it by name, and §7's rule checks fail on each mutation.
`RED_BUDGET_S` (1800) is a real bound — every wait races it — and `RED_SETTLE_MS` (180000) bounds each serve. Paths
resolve from the repository root, not from the directory it was started in.
*Calibrated on its first clean runs (2026-10-02, in the drive itself):* a shown brand span and the "+" compute `display: flex`,
not the `inline-flex` their classes say — each is a flex item, and CSS blockifies a flex item's outer display — so the
rules expect `flex`; the slack is the row's free space (the spacer between the clusters), because the gap after the
rightmost control is 0 in every cell once the cluster is pushed to the row's end; the verdict prints every break.
Result: 66/66 cells, every rule holds, no clip, no overflow, least slack 17.5px (sw 360, TZS 999,999) — the numbers are
in VODACOM-PLAN §0i.

**A7 · G7 — no "Nafasi" anywhere on the journey Tiketi view.** The journey variant of `PositionsBar` gets
`journey.ticketsFilterAria` and drops `QueryResultCount` (the canvas shows none). `test:journey-tickets` follows
`PositionsBar`'s journey branch and asserts no read of a `t.positions.*` key whose sw value matches /nafasi/i, with a
plant. All 7 lenses stay (no function removed; the row scrolls, as drawn) — §0h point.

**A8 · G8 — the free-sell promise comes from the server.** `positions/page.tsx` computes `graceEndsAt` per open position
through `exitWindowFacts(ratesFor(market))` and passes the ISO instant; the journey label (`formatClock`) and countdown
both read that instant; no `GRACE_MS` in the journey path; `cashOutValue`'s shape is untouched (`test:house-bot-seam`).
**The classic `GRACE_MS = 5 min` in `sell-button.tsx` is a live money-truth defect for any poll frozen with another
grace — fixed platform-wide in its own commit** (SellButton takes the server instant everywhere), with a test and plant.

*As built (A8's live half, 2026-10-01 — its own commit, for every player):* the instant is
`freeExitEndsAt(position, market)` in `market-service.ts`, beside `exitWindowClosesAt` — `null` when no free window was
offered, never the placement instant (a clock behind the bet would read that as free) — and SellButton's prop is
`freeUntil`. Its only two hosts, `src/app/positions/page.tsx` and the holder block of `src/app/markets/[id]/page.tsx`,
pass `freeUntil={freeExitEndsAt({ placedAt: p.placedAt }, m)}`; the button no longer takes `placedAt`, its free/fee
state is the countdown alone (the device-clock "closes in more than five minutes" guard is gone), and an instant
withdrawn while it is mounted zeroes the countdown (the hosts also lock the button then; the button no longer leans on
that). `test:sell-grace-truth` §2 holds every host to that call, and §3 holds the button to one parse of `freeUntil`,
one setter and no arithmetic on minutes. ⛔ WP10's journey label formats THIS instant on the server (`formatClock` of
`freeUntil`, not a label built from the placement). The commit that makes TicketCard forward it extends §2, and §3 too
if the journey look needs arithmetic or a second parse — in the open, with a plant, never by working around a check.
WP10's holder-block capture compares against a pre-S6 baseline that predates this fix: a default poll with an hour to
run must compare equal, and any other difference is named in EXPECTED_DIFFS, never re-baselined.

*As built (A8b, drafted 2026-10-03 — its own commit, for every player):* WP10's lapse, given to today's look; the
server's shut verdict drawn from the button's first commit; and today's free row fitted to a 320 phone on `/positions`.
Both classic hosts pass `pricedFree` for an open exit on a LIVE question — `/positions` the `free` its prices already
carry (`sellable && co.inGracePeriod`, where `sellable` is LIVE and `co.sellable`; its two rows priced as no free
window now say `free: false`), the question page's holder block `positionPricedFree` (`m.status === "LIVE" &&
co.sellable && co.inGracePeriod`, off the same `co`) — and in SellButton the `mounted` flag, the one lapse effect and
the `lapsed` verdict serve both looks: the effect names no look, the flag turns true at either look's first commit,
and the verdict is declared once above the journey's look. Today's return reads it: disabled, `common.loading` as its
words and its spoken name (`common.selling` while a sale is in flight), no figure (its free strip already goes with the
countdown). It reads `shutNow` (`closedNow || (mounted && alreadyClosed === true)`) wherever it read `closedNow`, so a
refresh that brings the server's "shut" is drawn shut in that render, not as one enabled "Uza sasa · TZS 0" render
while the effect copies the verdict into `closedNow`; before the first commit `shutNow` is `closedNow`, so the served
markup is today's. Below Tailwind's `xs` (360) its free note is hidden; from 360 it is inline, as today, and nothing
else in the row changes — the label keeps one line at every width, because letting it wrap stacks Chinese one glyph a
line, taller than the button, in the question page's narrower holder block. Pinned in the open: `test:sell-grace-truth`
2.priced (both hosts' flag expressions pinned whole), 3.classic (the lapse effect pinned whole, the reads of `lapsed`
and `shutNow`), 3.render, and §5 (the static fit model, mirroring `test:journey-shell` 8.label.measure: Inter at 600
bounded per glyph by the repo's own 500 and 700 files and by their alternates under the body's `font-feature-settings`,
read from the fonts' substitutions; JetBrains Mono from its file; CJK at a full em; the stylesheet's own button; both
hosts' geometry from their pages; prices from `cashOutValue`), with 3.journey's mount-flag constant and its timer plant
moved; `test:journey-tickets` §12's classic pin (`SELL_CLASSIC`, regenerated from the button), the lapse effect's
first line and dependencies (`LAPSE_ASK`, `LAPSE_DEPS`) and its opt-in props (`look` and `freeUntilLabel` only);
`qa:classic-shell-parity`'s `SELL_EXPECTED_DIFFS` gains `sell-narrow-phone` (the free note's class string), with a
synthetic P.5s. No word of the dictionary changes. Records: VODACOM-PLAN §0i (A8b) and §0h points 35 and 37: (a) the
Back/Forward case A8b's withdrawal cannot see, (f) what A8b closes and the server paint it keeps, and (h) the holder
block's overflow, which the v2 baseline already measures at 360 — the next step for today's button, measured first.

**A9 · G9 — the route census is a reachability graph.** Roots: the journey tabs, the header, the sheets,
`hubRowsFor(viewer)`, the footer. Edges: decommented hrefs per page file. A BFS per viewer kind (guest, player, held,
agent in standing, staff, proposals disabled, invite closed) asserts classic ⊆ journey reachability. Plants: an orphan
cycle, an href only inside a comment, `/legal/agent-terms`'s door removed.

*As built (WP6b, 2026-10-02):* `test:journey-shell` §9. A route's edges are the path literals (quoted or templated
strings that start with "/") of its page, the files beside it, the layouts above it short of the root's, and every
`.tsx` component they load, comments stripped with `decomment`; the chrome is never an edge, and it is named file by
file (the journey's bar, rail, guest sheet and flag, the hub's own components), so a journey page component WP9 adds
is an ordinary edge. The journey's roots are a phone's: the tabs (a guest's Tiketi zangu opens the guest sheet), the
header's own links per `journeyHeaderState`, the Wallet, the footer, and on `/account` `hubRowsFor(viewer)`. The
classic roots are tables (bar, More, avatar menu, rail, coin, bell, Wallet, footer), each held to its file both ways
(`9.chrome`) — the bell one way only, its door still there, because A1 leaves it to other lanes until S15. A guest
who meets one of `proxy.ts`'s protected prefixes walks on from sign-in. Nine routes are EXTERNAL entrances (email and
SMS links, the provider's return, the edge's staff sign-in, the service worker's offline page), each tied to the text
that generates it, and an entry expires the day a journey door reaches its route. A15's two classic doors are PINNED
until WP9 re-points them, with a plant. Plants (12): A9's three, a page nothing links, the Akaunti tab removed, the
Arifa row removed (classic ⊆ journey breaks: the classic bell reaches `/notifications`), the language row removed, an
external entrance lost and one stale, an unknown and a lost classic door, and the pinned history link removed.
⚠️ Its limits, written in its header: a link built in a `.ts` helper is no edge (`position-permalink.ts`, the
performance page's query links, a notification's href — why `/positions/[positionId]` is EXTERNAL), and every path
literal a page holds counts for every reader, whatever branch or gate it sits behind (a `redirect()` or
`revalidatePath()` argument included), so the walk over-counts what one reader can tap. It proves no route lost its
last entrance and the journey lost no classic door; the tiles prove what a given reader sees. In predeploy it is
bookkeeping another lane can trip (a page nothing links, a classic door added or taken, an external route linked):
that lane's commit edits the census's table.

**A10 · G11 — every hub group and Tiketi state has words.** Add `journey.hubGroupSafety`, `hubGroupProfile`,
`hubGroupHelp`, `hubGroupSettings`, `hubGroupLegal`, and concrete values for `ticketsEmptyLens`, `ticketsEmptyCashed`,
`ticketsExitLens`, `ticketsErrorBody`, `ticketsBack` (sw/en/zh; zh formal 您, 注单), listed in `S4-COPY-AUDIT.md` for the
native review.

**A11 · G12 — the captioned capsule's name is its visible words** ("Salio TZS 2,000"; held adds "limegandishwa";
masked keeps the hide-balances wording). No `t.common.wallet` override. Asserted in `wallet-reach` §8.

**A12 · G13 — `aria-current="page"` only when the pathname IS the tab's href;** `aria-current="true"` for section
membership. Pinned in `test:journey-shell` §8.

**A13 · G14 — the new stacking/popup rows get plants** inside `red:journey-shell` (export the check functions): tabs at
z-30, header not sticky, tickets sheet unportaled, sign-out row unreviewed.

*As built (WP5, 2026-10-01):* the sign-out row lands in WP5, before WP6a exports the popup check, so its plant lives
first in `red:journey-account` (check `8.popup`: the row taken off `test:popup-fit`'s record); WP6a's
`red:journey-shell` adds the plan's own plant beside it. Keep both.

**A14 · G15 — predeploy runs `test:journey-shell`, `test:journey-account` and `test:journey-tickets`.**
`loadHubViewer(userId, deps)` is extracted and tested against the memory store and the fake Prisma client.

**A15 · G16 — order and coverage.** WP6b's census cites the classic doors for `/updown/history` and
`/positions/performance` and is re-pointed in WP9 with a plant; `scripts/footer-reachable.mjs` learns the pass;
`/account` stays out of the responsive PLAYER list until a pass is wired (reason recorded); `test:dead-css` runs in WP4,
WP5 and WP6a.

**A16 · G17 — no async server `positions/loading.tsx`.** The journey ghost is a client loading component reading
`useJourneyOn()`; the classic ghost is unchanged.

**A17 · G18 — departures recorded as §0h points:** compact balances ≥ 1M (product rule) vs the canvas's full figure;
the guest hub has no in-page sign-in pair (the header carries it); the rail label wraps to two lines below 360 only if
the drive shows ellipsis (else unchanged); "Pumzika / Jizuie" becomes TWO rows, "Pumzika" → `#break` and "Jizuie" →
`#exclude`, each anchor pinned in `test:journey-account`.

*As built (WP6a, 2026-10-01):* the rail label wraps below 360 from a font model, ahead of the drive (`VODACOM-PLAN.md`
§0h point 18): JetBrains Mono's 0.6em advance at the rail's 11px puts sw "Tiketi zangu" at 83.2px in an 80px track,
and every other label in en, sw and zh fits. Below 360 the journey's slots stack from the top so the two-line slot
does not lift its pip. `test:journey-shell` 8.label.measure re-derives the model from the dictionary and the
stylesheet, and says what to delete if copy ever makes the wrap unearned. **Owed:** WP6b's 320 drive confirms it.

**A18 · G19 — precision.** `activeTabFor` matches `/s` exactly or `^/s/` (plant: `/settings` → null). The tween is
extracted into one shared hook the classic pill calls with identical output (anchors untouched) — no copy.
`.kp-rail--journey` targets the `<ul>`. The parity baseline records its base SHA and is re-captured after every rebase.

**A19 · The plan's decisions for Ali, taken at their defaults** (each a §0h point): header height 56 (kit) not the
canvas's 64; the kit's geometry wherever the canvas drifts; the staff console link for every staff role (SJ-23);
"Kuwa wakala" in Akaunti under the footer's own rule (recorded in COMPLIANCE-DECISIONS); Msaada's sub-line carries NO
phone number (0800 11 0011 is the national problem-gambling helpline, not our desk — it keeps its own labelled row; the
canvas is corrected to match); Tiketi cards keep the ticket number and drop share/profit strip/yes-no bar/search/sort
for preview viewers (shelved, not deleted); production proof = nothing changed for players, until Ali's preview is on;
manifest shortcuts move at S12/S15.

*As built (WP6c, 2026-10-03; `VODACOM-PLAN.md` §0h point 20 and §0i):* AppShell's eleven `React.lazy` bindings (the
offline banner, pull-to-refresh, the notify poller, the event stream, the install card, the analytics consent prompt,
the channels panel, the journey flag, the win celebration, and the journey header and tabs) split nothing: in this
Next 16/Turbopack build a client module that a server component reaches through `import()` still joins the root
layout's client entry, so every one of them rode in every page's first-load scripts (the journey header and tabs,
beside the channels panel and the consent prompt, measured on production after WP6b; the eight older parts read in a
local production build, 2026-10-03). Ten now live in one client module, `src/components/layout/shell-lazy.tsx`, each
written `export const LazyX = dynamic(() => import("…").then((m) => m.X).catch(nothingIfLost));` with no option
object: the server render stays on, and `next/dynamic` adds no Suspense boundary of its own (it adds one only for
`ssr: false` or `loading`), so AppShell keeps its `<Suspense>` wrappers and fallbacks, imports the parts under the
names it rendered, and renders each exactly where and as it did. The eleventh, the offline banner, is imported
statically and rendered in its own boundary as before (its tag is the one JSX change): its job is a connection that
fails, so its code comes with the page as it always did. A part whose chunk never arrives (a `ChunkLoadError`) renders
nothing and is reported once to `/api/client-error`, instead of taking the page to the critical-error screen; any
other error is thrown on. This corrects the WP6b and WP7 as-built notes above, whose "lazy, so a classic page never
loads it" became true here, not there. Guard: `test:journey-shell` §12 (15 checks, 24 plants); its 8.mount,
8.mount.lazy and 11.flag.lazy, `test:simple-journey-flag` 10.shell.chrome.lazy and .only (3 plants), and
`test:stacking`'s binding reader read the new home. Owed: the production build's first-load reading, the served-HTML
compare, the parity compare and the lost-chunk drive (VODACOM-PLAN §0i, WP6c).
