# S10 — the visitor path (flagged): build plan (drafted 2026-10-14)

> The working plan for VODACOM-PLAN S10, "Visitor path: §3.7, plus `test:post-register-landing` in both flag states,
> plus `ref` carried through" (`docs/VODACOM-PLAN.md`:5036; the board row :3926, done when "guest → sheet → register →
> deposit → back works. `test:post-register-landing` passes in both flag states."; the spec §3.7 :4772-4787). Drafted
> read-only on 2026-10-14 by one planner on OMEGA-COMPILE01, in `C:\50pick-ssd\kipindi-s10` (branch
> `codex/vodacom-s10-plan`) at origin/main `c14cb403e` (the record of the live `4946a777d`). Every file:line below was
> re-read at that commit; none is copied from an older plan. S9 is read from the local branch `codex/vodacom-s9-fixes`
> `daaffe1b3` (not on main, not pushed) and cited with the commit named. Run for facts only, in process, with no
> DATABASE_URL: `test:auth-carry` (22 verdicts) and `red:auth-carry` (20 plants proved), `test:pending-bet` (all
> pass), `test:journey-question` (all pass), `test:sheet-owner-recovery` (52 assertions) and `test:bet-sheet-host`
> (49 controls, 0 failures). No server, build or browser was run. Status lives in VODACOM-PLAN §0 (a new §0 section
> for S10, opened by WP0); this file is the how. Its Open points are decisions taken under Ali's delegation, each with
> the overrule he may choose; WP0 files them as numbered §0h points after the last one on main (82 at `c14cb403e`).
> It defines no design value: it names kit classes and tokens, and `docs/DESIGN_AUTHORITY.md` is the only design
> rulebook (its §0 filing law puts a session's build plan beside S6–S8's, as a record).
>
> **One source of truth (Ali's records rule, 2026-10-14).** This file is the only file this draft wrote. Where it finds
> another record stale (VODACOM-PLAN, FLOWS, the S10 preparation record), it does not edit it: the exact text of each
> proposed annotation is in the last section, "Proposed record annotations", for the coordinator to apply when this plan
> lands. No COMPLIANCE-DECISIONS entry is proposed (Open point 18).
>
> **Base.** S8 is in progress (§0k) and still edits `bet-sheet-host.tsx`, `bet-sheet.tsx`, `sheet-state.ts`,
> `app-shell.tsx`'s host line and the question page; S9's deposit, waiting and return screens are not built; S11, S12
> and S13 have plans on their own branches. Each edits files S10 edits (`i18n-dict.ts` above all). So WP0 re-reads every
> number here at S10's real base before any package starts (S7-PLAN A24's method; S8-PLAN A1/A24).

## Summary

### What S10 builds

For a journey reader who is NOT signed in (a staff pass or an agency link before S15; everybody after the flip), S10
draws the deck's promise to the agency — *"A visitor who taps NDIO or HAPANA sees the bet sheet with the stake, the
quick amounts and the estimated winnings before creating an account. When they tap to place the bet, they are asked to
sign up, and they come back to the same bet afterwards."* (AGENCY-REPLY.md:17-19) — on S8's sheet, in 50pick's look:

1. **The guest sheet (§3.7 :4774-4776; the S4 board `s4-4-sheet-guest.dc.html`).** A journey guest's NDIO/HAPANA on
   any journey card (home, `/live`, a question's similar rail) and on a question's two big buttons opens S8's sheet in
   place, side locked, at the market's minimum: the chosen-side chip and ✕, the question, "Dau lako" and the stake, the
   quick amounts, the estimate box with its Makadirio line — and no balance row. In the CTA's place stand two doors:
   "Jisajili uweke dau" (primary) and "Ingia". Nothing in it can place a bet or move money: its host imports no money
   action and reads no private half.
2. **The doors carry the bet and the codes (§3.7 :4776).** Each door is a real link to `/auth/register` or
   `/auth/login` with `next` = the page the visitor was on, rebuilt from its path and the bet
   (`pendingBetUrl`, pending-bet.ts:83-86), and the page's own `ref` and `invite`, each through its normaliser. Pressing
   a door writes the keyless, ownerless selection marker (`kp-pending-bet`, already disclosed, privacy page :216-219),
   so the stake comes back with the visitor; a forwarded link still never sets anyone's stake (pending-bet.ts:179-187).
3. **After registering (or signing in), back on the sheet (§3.7 :4778-4783).** The auth doors already land on the safe
   `next` with `welcome=new|back` (`landingAfterAuth`, auth-landing.ts:15-21; live since `f7bdc2ea1`, below). S8's
   money host already reopens a `?bet=` address on mount (bet-sheet-host.tsx:288-310) and adopts an ownerless marker
   (:404-405). S10 proves that seam end to end, counts the visitor's open once, keeps the welcome greeting off the
   sheet, and proves the landing is the same in both flag states (`test:post-register-landing`, new).
4. **Then the money path S8 and S9 own.** A new account at TZS 0 meets S8's low-balance frame with "Weka pesa TZS
   {stake}"; S9's journey deposit takes the payment and brings the player back to the sheet at the stake; one explicit
   tap places the bet. S10's last package drives that whole path once S9 is on main.
5. **Every journey guest door carries the page and the codes** — the "ref carried through" of §5 S10 (:5036). The
   journey header's Ingia/Jisajili are bare links today (journey-top-bar.tsx:205-210) — the very defect the classic
   header fixed on 2026-10-06 (B3, top-app-bar.tsx:468-482) — and the guest Tiketi sheet carries `next` but no code
   (tickets-guest-sheet.tsx:46, :54). S10 gives both the classic header's rule.
6. **The question page for a journey guest.** Today a journey guest's question page shows the classic "Ingia ili
   kutabiri" panel ([id]/page.tsx:812-877) because the journey arm requires a session (:728, :740, :1121). S10 gives
   every journey reader the two big buttons, as the S4 market board draws them after the countdowns
   (`s4-10-market.dc.html`), so the agency's campaign link `/markets/<id>?side=YES&utm_…` (AGENCY-REPLY.md:46-55) opens
   the guest sheet at the minimum.

**What S10 does not change:** no money path, no gate, no key, no schema, no new storage key, no new dev-test route. The
bet stays S8's (one key per explicit tap); the deposit stays S9's.

### Why a classic visitor's served markup does not change

- **The host slot stays one slot.** AppShell's `{journeyShown && session && <Suspense…><LazyBetSheetHost …/></Suspense>}`
  (app-shell.tsx:617) becomes one `journeyShown &&` slot whose child chooses the money host or the guest host. For a
  classic request it is still one `false` — the RSC is unchanged (Open point 4).
- **The question page** takes a same-slot ternary in its bet panel and two journey conditions that lose `session`
  (:728, :1121); the classic arms are today's elements, not re-indented. `qa:classic-shell-parity` v4 already captures
  the question page's classic body in guest cells (VERSION 4, qa-classic-shell-parity.mjs:484; S8-PLAN WP1).
- **The journey card and the big buttons** gain one attribute on journey markup only.
- **The guest host and the guest face of the sheet** are client code in journey-only lazy chunks; the kit Modal draws
  nothing while closed.

### What does change for a classic visitor

Named in S10's §0 section under "Served bytes for a classic viewer", each with its proof:
- (a) **JS on every page:** the dictionary's one new journey key in three languages (WP2); `shell-lazy.tsx`'s chunk,
  one export longer (WP4); `auth-landing.ts` refactored with identical output, in the classic header's chunk (WP1);
  `auth-flash.tsx`'s hold, only if WP7 needs it, with identical classic behaviour.
- (b) **HTML and RSC:** none, except — only if Ali takes Point for Ali 4 — the classic question page's guest panel
  carrying `invite` too, its own live release (a §2 row).
- (c) **The privacy notice:** none (Open point 8).

### What S10 leaves to later sessions, and why

- **S9:** the journey deposit, the waiting page and the return to the sheet (§3.5), with its trust bridge for the stake
  (S9-PLAN §2b, `daaffe1b3`:124-133). S10 builds and proves everything up to "Weka pesa", then drives the rest once S9
  is on main (WP8b; Open point 3). S9's rebase must carry Corrections 7 and 8.
- **S11:** the How-to auto-open. Its rule already declines a landing with `bet` or `side` in the address or with a
  dialog open, decided at 700 ms (S11-PLAN.md WP4 step 1, on `39322dd69`); S10 pushes `bet` on the tap frame and the
  guest sheet is a real dialog, so the two never stack. S10 adds no auto-open.
- **S12:** Juu/Chini. Its guest arms stay as they are (S12-PLAN Open point 16, on `ba34bc15c`); the guest host, like
  the money host, leaves a round bet alone.
- **S13:** the measures. WP4 of S13 edits the money host's `open()` and waits for S10's host edits (S13-PLAN WP0 step
  1, WP4, on `b0af2f1b2`). S10 puts the open count in one predicate both hosts call, so S13 edits one place.
- **S14:** the identity checklist's guest frame, `e2e:journey` on embedded Postgres (§5 S14 :5058-5059), staff seeing
  the visitor path on production, and the one real TZS 1,000 journey (§0h point 4).
- **S15:** the flip makes the guest path everybody's. Rules/Terms, CLAUDE.md's flip notes and the flip-time gates are
  S15's.

### Order (11 packages, each green on its own)

1. WP0: the start line (S8 closed, S9's state, today's reds, every citation re-read, the records).
2. WP1: the pure core — the guest frame, what a door carries, one return rule, one door tail.
3. WP2: S10's words.
4. WP3: the sheet's guest face.
5. WP4: the guest host and its mount.
6. WP5: the question page for a journey guest.
7. WP6: every journey guest door carries the page and the codes.
8. WP7: the return — one count, no greeting over the sheet, `test:post-register-landing`.
9. WP8a: the visitor drives before the deposit.
10. WP8b: the whole visitor path, with S9's deposit and return (after S9 is on main).
11. WP9: proof, records, merge, deploy.

### Corrections to the maps, verified in the files

1. **§3.7 still routes through the email code.** "Balance 0 → low-balance → deposit (shortfall = stake) → code → PIN →
   waiting → back → confirm" (VODACOM-PLAN.md:4780). A deposit asks no email question since the owner's ruling of
   2026-10-07 (§3.6 :4736-4744, superseded). The same stale step sits in S14's `e2e:journey` line, "deposit (mock rail,
   dev outbox code)" (:5058-5059). The last section proposes both annotations (A5, A7); nothing in S10 builds a code step.
2. **`test:post-register-landing` does not exist.** No package key and no script names it; only VODACOM-PLAN does
   (:3926, :4782, :5036). The landing rule is pinned as a pure table today (`test:pending-bet` 7.landing,
   pending-bet.test.mts:194-203; `test:kyc-at-withdrawal` §A, kyc-at-withdrawal.test.mts:200-233) and the auth carry's
   register action is executed only on its refusal path (auth-carry.test.mts:125-140). WP7 builds the suite.
3. **The S10 preparation is already live, and §1 and §2 do not say so.** `f7bdc2ea1` (the auth doors carry `next`,
   `ref` and `invite`; an overlong invite is refused instead of cut) and `ee518f52a` (account-owned sheet recovery:
   `kp-sheet-intents:v2:<owner>`, the legacy quarantine, owner-stamped markers) are both in `da19e5a21`, released on
   2026-10-14 at 07:00 UTC on Ali's instruction (§0k :874-880). §1's S10 row still reads ⬜ (:3926), and §2's pre-flip
   list (:3939-3945) has no row for the auth doors' change, which every player meets (login/page.tsx:86-90, :358;
   register/page.tsx:81, :124; login/actions.ts:103-106). The last section proposes the row (A4) and the §1 note (A3);
   S8's own close adds Privacy §7's versions of 2026-10-13/14, as S8-PLAN WP12 step 7 says.
4. **The journey's guest doors drop the page and the codes.** The journey header's pills are bare
   (`href={"/auth/login" as never}`, `href={"/auth/register" as never}`, journey-top-bar.tsx:205, :208); the classic
   header's carry this page and the codes since route audit B3 (`GuestAuthDoors`, top-app-bar.tsx:468-482, through
   `authDoorHrefs`, auth-landing.ts:40-58). FLOWS.md §1's "Guest header Sign in / Sign up" row states the classic rule as
   the guest header's; it is false for a journey reader. The guest Tiketi sheet carries `next=/positions` and no code
   (tickets-guest-sheet.tsx:46, :54). Not live (journey only), but at S15 every referral or campaign visitor who signs
   up from the journey header would be bound to nobody — `recruitedBy` is written once, at sign-up (top-app-bar.tsx:470-472).
5. **S8-PLAN A22 item 9 is not built.** "`aria-haspopup="dialog"` on the picks and the big buttons, exactly where the
   host is mounted" (S8-PLAN.md:2207-2208): neither the journey card's picks (journey-card.tsx:223-234) nor the big
   buttons (journey-bet-buttons.tsx:10-13) carry it at `c14cb403e`. With S10 every journey reader who sees picks has a
   host, so WP4 adds it everywhere a pick carries `data-bet-side` (Open point 16).
6. **The public sheet read carries no title.** The route serves `title` only in its private branch
   (`/api/markets/[id]/sheet`, route.ts:55 against :63-65). A guest sheet opened from an address whose market has no
   card on the page cannot be titled. WP4 opens from the address only where the page carries the seed; the question
   page's big buttons give every campaign link one (WP5).
7. **S9's tab-marker trust refuses the marker main now writes.** S9's `trustedDepositBet` calls
   `stakeFromUrl(bet, trust.markerRaw, nowMs)` with no owner (`daaffe1b3`:src/lib/journey/deposit-state.ts:85). Since
   `ee518f52a` the money host stamps the owner on the marker it writes at the deposit row's tap
   (bet-sheet-host.tsx:390), and `stakeFromUrl` refuses a stamped marker unless the same owner is passed
   (pending-bet.ts:186). S9 branches from `2490c75c3` and holds neither `f7bdc2ea1` nor `ee518f52a`
   (`git merge-base --is-ancestor`, both false). After its rebase the call still compiles (the owner is optional) and
   silently loses every sheet-made deposit's stake on return. Its `markerForDeposit` also still writes unresolved keys
   into `kp-pending-bet` through `pendingIntents` (deposit-state.ts:105), which `ee518f52a` retired: keys live in
   `kp-sheet-intents:v2:<owner>` (sheet-owned-storage.ts:6, :116-125) and `saveSheetSelection` refuses a keyed raw
   (:132). S9 owns both fixes; S10's done-when depends on them (Open point 3; Points for Ali 10).
8. **Two return rules that disagree.** S9's validator allows only `/`, `/live`, `/watchlist` and the bet's own question
   page (`daaffe1b3`:deposit-state.ts:26-31). A sheet opens for question B on question A's page through the similar rail
   ([id]/page.tsx:1266; `SHEET_PAGES`, sheet-state.ts:110), so S9 would refuse that return. WP1 adds one constructor,
   `betReturnPath`, on one list S9's validator reads at its rebase; the visitor's `next` is the bet's own question page
   in that case (Open point 13).
9. **§3.7's "Same as §3.3" is approximate for a guest.** §3.3's live refresh reads SSE and `wallet:balance` (:4587); the
   event stream opens only for a session (app-shell.tsx:607) and a guest has no wallet. The guest's refresh is the public
   half: on open, every 10 s while visible, and on focus (WP4; Open point 19).
10. **The S4 guest board predates two rulings.** It draws the old minimum's chips "1,000 · 2,000 · 5,000 · 10,000"
    (`s4-4-sheet-guest.dc.html`); at the TZS 500 minimum `quickStakes(min, max)` gives 500 · 1,000 · 2,500 · 5,000 (§0
    :57-61). It draws "Ingia" as an outline button; `btn-outline` was retired by R9-C and the sheets' second action is
    the ghost (tickets-guest-sheet.tsx:15-19). The guest face takes both rulings.
11. **The marker's codes are written and never read.** The money host writes `ref`, `invite` and `utm_*` into the
    marker (bet-sheet-host.tsx:332, :390; §3.1 :4496), and no code reads them back (grep at `c14cb403e`). The doors take
    their codes from the page's own query, as every door does today ([id]/page.tsx:859-863). S10 does not start reading
    the marker for codes (Open point 22).
12. **The preparation record's "owner rulings" for first-touch referral storage are not found.** The record says
    first-touch referral persistence is "excluded by the current owner rulings" (docs/qa/s10-auth-carry-preparation.md:17).
    No such entry is in COMPLIANCE-DECISIONS.md (grep for first-touch and referral persistence, `c14cb403e`). The rule in
    force is the code's: "No cookie and no storage: the code rides the query string" ([id]/page.tsx:859-860). S10 keeps it
    (Open point 22); the last section proposes the record's correction (C).
13. **The greeting and the sheet meet on the landing.** AuthFlash's greeting is a toast (auth-flash.tsx:42-58) whose
    stack sits at `z-[1800]` (toast.tsx:596), under the journey header (globals.css:7429-7430), above the dialog rung
    (the kit Modal's `zIndex = 100`, modal.tsx:303). A tall sheet's panel may start `--sp-12` below the viewport's top
    (globals.css:8574), and a new account at TZS 0 lands on the tallest frame, the low one. The greeting's only hold is a
    result modal (toast.tsx:403, :586). WP7 measures and decides (Open point 10).
14. **A question that stops being LIVE leaves `bet` in the address.** The money host reads a bare 404 as a failed read
    (bet-sheet-host.tsx:124), and strips only on a read that found nothing (:309), so a visitor whose question stopped
    being LIVE while they signed up lands on the page with nothing open and `bet` kept (Open point 11).
15. **The money host's 401 reloads the page.** A private read that answers 401 ends the host's epoch and reloads
    (bet-sheet-host.tsx:125-128, :90-97). A guest mode inside that host would answer every open with a reload; the guest
    host never asks the private half (Open point 4).
16. **Guards that pin the session-only shapes S10 changes** (each re-pinned in the open, its plant kept):
    `test:bet-sheet-host` host.conditional-mount and its plant "guest receives money host" (bet-sheet-host.test.mts:560,
    :721); `test:visual-pass-r8d` 10.2′ (visual-pass-r8d.test.mts:584-597); `test:journey-shell`'s parts table (:266),
    8.chrome (:1562-1563), 8.sheet (:1796) and the census doors (:1982-1990); `test:journey-question` mount
    (journey-question.test.mts:65-66); `test:one-sided` 8.5 (one-sided.test.mts:357-360); `test:journey-home` §9's slot
    normaliser (journey-home.test.mts:2437-2440); the market-columns red anchors (scripts/anchors/market-columns.anchors.mjs:68-69);
    `qa:bet-sheet`'s control "journey guest pick navigates, never opens a sheet" (qa-bet-sheet.mjs:303-311); and
    `qa:first-load`'s host marker `"a[data-bet-side]"` (qa-first-load.mjs:172-173), which a guest host listening for the
    same selector would repeat.
17. **Line drift, not contradiction:** S8-PLAN's "the question page's guest arm is today's sign-in panel
    ([id]/page.tsx:792-856)" (S8-PLAN.md:88-89) is at :812-877 now.

---

## The visitor path, step by step

What a journey guest meets, and which code decides each step. "Built" names what is live at `c14cb403e`.

| # | Step | Decided by | State |
|---|---|---|---|
| 1 | Lands on `/`, `/live` or a question (a campaign link is `/markets/<id>?side=YES&utm_…`). Cards carry `data-sheet` seeds for guests too | `journeyCardState` (journey-sheet.ts:200-212: no user, no break, seeds for every bettable card); the question page's seed (:315-317) | built |
| 2 | Taps NDIO/HAPANA → the guest sheet opens in place, side locked, at the minimum; `?bet=<id>.<side>` pushed | the guest host (WP4), S8's frame (WP1, WP3) | S10 |
| 3 | Edits the stake, reads the estimate; Back or ✕ closes; a reload reopens at the minimum, or at the stake once a door wrote the marker | WP1 `guestOpensFrom`, WP4 | S10 |
| 4 | Presses "Jisajili uweke dau" or "Ingia": marker written (no key, no owner), the address replaced with the stake, the sheet closed without touching history, the link followed | WP1 `guestCarry`, `doorHrefsFor`; WP4 `onLeave`; `saveSheetSelection` (sheet-owned-storage.ts:128-135) | S10 |
| 5 | The auth page keeps `next`, `ref`, `invite` through hidden fields, cross-links, refusal panels and the failure hop | register/page.tsx:64-82, :122-124, :181-183; login/page.tsx:79-91, :357-359; login/actions.ts:101-107; register-form.tsx panels | built (`f7bdc2ea1`) |
| 6 | Registration binds the codes and lands on `<page>?bet=…&welcome=new` (sign-in: `welcome=back`) | register/actions.ts:51-56, :92; login/actions.ts:118; `landingAfterAuth` (auth-landing.ts:15-21) | built |
| 7 | AppShell swaps the guest host for the money host in one commit; the money host reopens the sheet from the address at the visitor's stake (it adopts the ownerless marker) | app-shell.tsx:617 (WP4's slot); bet-sheet-host.tsx:288-310, :404-405; `stakeFromUrl` (pending-bet.ts:183-187) | built, proven by WP7/WP8a |
| 8 | The open is not counted a second time; the greeting does not lie over the sheet | WP7 | S10 |
| 9 | TZS 0 → S8's low frame: "Weka pesa TZS {stake}" (D = max(shortfall, TZS 1,000)) | `shortfallPlan` (shortfall.ts:191-246) | built (S8) |
| 10 | The deposit, the PIN, the wait, the way back to the sheet at the stake | S9 (§3.5) | S9 |
| 11 | One explicit tap on "Weka dau · TZS {stake}" places one bet with one key | S8 (`commit`, bet-sheet-host.tsx:312-376) | built (S8) |

### Money safety, in one place

- **Nothing places a bet without the player's tap.** The guest host has no money action in its module graph (WP4's
  census). The money host commits only from the sheet's two commit buttons (`onPlace`, `onBetInstead`,
  bet-sheet-host.tsx:526-527); an address open, a refresh, a balance event or a returning deposit never calls
  `commit`. WP8 counts the player's positions and BET_PLACED rows before and after every step
  (`/api/dev-test/bet-sheet-observe`, memory-only).
- **A link never sets a stake.** Only an ownerless, keyless marker under 24 hours old in the same tab, naming the same
  bet, lets the URL's stake through (pending-bet.ts:183-187); the guest host passes no owner, so a signed-in account's
  marker never prefills a guest, and a keyed marker never opens unplaced.
- **Idempotency.** S10 mints no key. The bet's key is S8's, one per explicit tap (sheet-state.ts:364-371); the deposit's
  is S9's, one per funding intent (S9-PLAN §2b).
- **The RG gates.** Age 18+ at registration (the date box and `registerWithPassword`); self-exclusion refuses the sign-in
  and its panel keeps `next` (login/actions.ts:81-88); every other gate is the bet path's and `deposit()`'s, which the
  reopened sheet's plan asks first (shortfall.ts:195-214). S10 adds no money path, so it adds no gate; WP8a proves one
  gate holds on the visitor's first bet (a cooling-off player who signs in meets the block frame).
- **No fabricated figure.** The guest sheet shows no balance; its estimate is `estimateFor` on the seed (S8's
  `sheetEstimate`, sheet-state.ts:189-206); a failed refresh keeps the figures it has.

---

## The look, in tokens

Ali's visual bar (2026-10-14): spacing, margins and type come from the tokens `docs/DESIGN_AUTHORITY.md`'s laws name —
`--sp-*` applied as gaps (§S1), the `--r-*` families (§S2), the `--type-*` ladder (§T1), the three faces `--font-display`,
`--font-body` and `--font-mono` (money in mono, §M4), the control rungs `--h-control-*` and `--tap-min` (§A2) — whose
values live in `src/app/globals.css` and nowhere else (§0d). No value is restated below, and S10 adds no token, no
class carrying a value and no hand-typed size (`test:design-frozen`, `test:tokens`, §T1's closed scale). Everything S10
draws is checked on real-browser tiles at 320, 360, 390, 768, 1280 and 1920 in sw, en and zh, read one by one.

### The guest face of the sheet (WP3) — S8's sheet, two rows changed

The panel and every row above the footer are S8's, unchanged; the line numbers are globals.css's at `c14cb403e`.

| Part | Spacing and margins | Type and ink | Shape and size |
|---|---|---|---|
| The panel: the kit Modal, `sheet sheetUntil="lg"`, S8's `maxWidth={440}`, `panelClassName="kp-wsheet kp-bsheet"` | `.kp-wsheet` (:6703): block-start `--sp-3`, inline `--sp-5`, block-end `--sp-5` plus the safe-area inset; from 1024 `--sp-5` all round (:7069) | — | sheets take `--r-lg` (§S2); the height cap `.kp-bsheet` (:8574); the grab handle `.kp-wsheet__grab` (:6704) below 1024 only (:7070) |
| The column `.kp-bsheet__shell` (:8575) | rows separated by `--sp-3`, as a gap | — | — |
| Row 1, `.kp-bsheet__header` (:8576): the chosen side and ✕ | `--sp-2` between them; the chip's width capped by `.kp-bsheet__chosen` (:8578) | the kit `Chip` `variant="yes"\|"no"`, `size="lg"`, `metrics="status"`; the side word from `sideWord` (§A4: word and ink together) | the kit `CloseX` (`common.close`), a `--tap-min` target |
| The middle `.kp-bsheet__scroll` (:8579) | `--sp-3` between rows, `--sp-1` block padding; focus rings inset (:8583) | — | it alone scrolls (S8 A14) |
| The question, `h2.kp-bsheet__title` (:8584) | `--sp-2` between its parts | `--font-display`, `--type-h3`, weight 600, balanced, `overflow-wrap: anywhere`; the reader's short title | — |
| "Dau lako" and the stake, `.kp-bsheet__stake` (:8588-8589) | `--sp-2` between label and box | the label `--type-body`, weight 500, `--text-muted`; the stake in `--font-mono` (§M4) | the kit `Input size="xl" grouped mono`, TZS prefix (S8 WP5); `--r-md` (§S2: inputs) |
| The bounds line `.kp-bsheet__bounds` (:8602-8603), only when the stake breaks a bound | `--sp-2` from its glyph; the glyph set down `--sp-1` | `--type-small`, `--text-muted` (never NO ink, §B2a) | the `info` glyph |
| The quick amounts `.kp-bsheet__chips` (:8590-8592) | four columns, `--sp-2` gaps | `--type-small`, the figure in `--font-mono` (`.amount`); the pressed one on `--pill-active` with a `--brand-400` ring | the kit `Button` `md` rung (`--h-control-md` ≥ `--tap-min`) |
| The estimate box `.kp-bsheet__estimate` (:8593-8601) | `--sp-4` padding, `--sp-2` between rows | the lead `--type-body` `--text-muted`; the figure `--type-h1`, stepped down the ladder to `--type-h4` only when it would not fit (`EstimateFigure`, sheet-parts.tsx:51-94; §M4a), in `--font-mono`; the multiple's pill `--type-small` weight 600; the notes `--type-small` `--text-subtle` | `--r-lg`, `--bg-inset`, a 1px `--border` (§S3: structure); the pill `--r-pill` |
| ~~The balance row~~ | — | — | **absent** for a guest |
| The footer `.kp-bsheet__footer` (:8621) | a column, the doors `--sp-2` apart | — | — |
| Door 1: "Jisajili uweke dau" — a `<Link>`, `btn btn-primary btn-xl w-full kp-bsheet__commit`, test id `journey-sheet-signup` | the commit's own geometry (`.kp-bsheet__commit`, :8626): block padding `--sp-2`, the label wraps rather than clips; the `btn-xl` rung's inline padding | `--font-body`, weight 600, the `btn-xl` rung's size; brand ink (`btn-primary`): sign-up is not money, never gold (§M3a); the label through `keepText` (keep-run.tsx:203), so a wrapped label never strands its last word ("Jisajili / uweke dau", "Sign up to place / your bet") | min-height `--h-control-xl`; `btn-xl` takes `--r-lg` (§S2) |
| Door 2: "Ingia" — a `<Link>`, `btn btn-ghost btn-lg w-full`, test id `journey-sheet-signin` | the `btn-lg` rung's inline padding | `--font-body`, weight 600, the `btn-lg` rung's size; the kit ghost's inks (R9-C, tickets-guest-sheet.tsx:15-19) | `--h-control-lg`; the control radius `--r-md` (§S2) |
| The closed frame | S8's (`.kp-bsheet__question`, `.kp-bsheet__terminal`, :8587, :8618) | S8's words | its one "Sawa" (`common.gotIt`), the kit ghost `xl`; no door |

Focus: every door and chip wears the one ring recipe (§A3; `.btn:focus-visible`, globals.css:1249), fully on screen —
the panel clips its overflow (:8574), so the footer's rings are read in the tiles, not assumed.

### The question page for a journey guest (WP5)

No geometry of its own: a journey guest gets S8's journey arm as built — the big buttons (journey-bet-buttons.tsx:9-13)
in the aside from 1024 and, below 1024, in the phone section after the countdowns (the empty holder draws nothing,
journey-holder.tsx's own empty render; test:journey-question's `empty-holder` check), with the one-sided note above them
(`oneSidedCallout`). The phone section's place, rung and gaps are S8's, unchanged; the tiles read that no empty band is
left where the holder would stand (§S1's ghost-sibling trap).

### The journey header's guest pills and the guest Tiketi sheet (WP6)

No geometry change: the pills keep `btn btn-ghost btn-md btn-pill kp-jhdr__auth` and `btn btn-primary btn-md btn-pill
kp-jhdr__auth` (journey-top-bar.tsx:205, :208), and the Suspense fallback is the same two pills, so the first HTML draws
the same boxes; the Tiketi sheet keeps `kp-wsheet__pair` and `kp-wsheet__act` (globals.css:6712-6717). Only the hrefs
change.

### The tiles: where, what, and what each is read for

**Where.** 320×640, 360×640, 390×844, 768×1024, 1280×900 and 1920×1080, each in sw, en and zh (§A5, §A6). 768 and 1920
are widths S8's drive never tiled (qa-bet-sheet.mjs:27-28): their first tiles read the money face too.

**What.**
- The guest face: the minimum; after a chip; each bounds break (empty, not whole, below, above); each estimate state
  (priced, empty pool, one side only, first on a side, over the cap, thin, legacy capped); "Makadirio yamesasishwa";
  the closed frame; with the keyboard raised at 360×640 (S8's compact row and lift).
- The question page for a journey guest: open, one-sided, selection closed and settled.
- The journey header with its guest pills on `/` and on a question; the guest Tiketi sheet.
- The auth pages arriving with `next`, `ref` and `invite`: the referral banner, the invite banner.
- The landing after sign-up: the money sheet's low frame at TZS 0, its edit frame when funded, and the greeting beside it.

**Read for, in every tile** (the reader writes a verdict per line):
1. No horizontal overflow; nothing clipped, money and dates above all (§A5, §A6, §M4a).
2. Every gap and padding is the token named in the table above, measured on the tile against the token's computed
   value — never judged by eye.
3. Type: the faces and rungs named above; money in mono; no fallback face (a font probe, as S6's rounds ran).
4. The doors: in their order, each whole; a wrapped label breaks only where `keepText` lets it; Swahili's longer words
   and Chinese with no word spaces both fit (§A5).
5. Every target at least `--tap-min` (§A2); every focus ring fully on screen (§A3).
6. Contrast on the actual surface (§A1); a side's ink always beside its word (§A4).
7. The safe area: the footer clears the bottom inset S8's V20 cell injects (S8-PLAN WP11 step 2, its method named in
   the cell).
8. 768: the bottom sheet's width and its padding; 1280 and 1920: the centred dialog, no grab handle.
9. The greeting against the sheet's chip row and ✕ (Correction 13).

---

## Work packages

### WP0 — The start line: S8 closed, S9's state, today's reds, the records (S; depends on S8's close)

**Goal.** Start S10 on a closed S8, whose host, sheet and storage S10 extends, knowing what of S9 is on main. Name
today's reds before any S10 code, re-read every number here at the real base, and correct the plan text first.

**Files.**
- The plan-time annotations are NOT WP0's: the coordinator applies the last section's exact text when this plan lands
  (Ali's records rule, 2026-10-14). WP0 checks each is in place and edits none of them again.
- docs/VODACOM-PLAN.md, at the build's start only, as the status home (one record, no second copy): §0's RESUME line
  and S10's own §0 section (its letter the next free one: S11-PLAN claims §0l, S11-PLAN.md:10 on `39322dd69`, and S9 has
  none yet — Open point 25); §1's S10 row to 🔨 with Open point 2's done-when; the §0h points for this plan's Open
  points, numbered after the last on main.
- This file: an amendment if the re-read changes a package.
- The session's memory file for the Vodacom plan.

**Steps.**
1. **Check the preconditions on main; never assume them** (Open points 1 and 3):
   - S8 is closed: its §0k close record, its §1 row as S8-PLAN Open point 2 words it, and no S8 work pending on
     `bet-sheet-host.tsx`, `bet-sheet.tsx`, `sheet-warmup.tsx`, `sheet-state.ts`, `pending-bet.ts`,
     `sheet-owned-storage.ts`, `app-shell.tsx`'s host line or `[id]/page.tsx`'s journey arms.
   - S9's state: which of its packages are on main (the persistence migration, the status route, the journey deposit
     screen, the waiting page, the return). Record it in S10's §0 section. WP8b and S10's close wait for the deposit
     screen, the waiting page and the return on main.
   - Corrections 7 and 8 are read on main after S9's rebase, not on a branch. If S9 lands without them, WP0 files each
     in §0h as an S9 defect that blocks S10's close.
   - S10 branches from origin/main in a worktree where `git status --porcelain -- src scripts docs package.json` is
     empty; it stages by path and reads `git diff --cached --stat` before every commit.
2. **Today's reds,** for the suites S10 touches (the session law: each change's own guard; reds named first):
   test:auth-carry and red:auth-carry, test:pending-bet and red:pending-bet, test:bet-sheet and red:bet-sheet,
   test:bet-sheet-host and red:bet-sheet-host, test:sheet-owner-recovery, test:journey-question and its red,
   test:journey-shell and red:journey-shell, test:journey-home and its red, test:one-sided, test:visual-pass-r8d,
   test:simple-journey-flag and its red, test:privacy-notice, test:i18n, test:enter-where-pressed and its red,
   test:journey-funnel, test:kyc-at-withdrawal, test:red-anchors. Record each red by its full label. At `c14cb403e` this
   planner measured auth-carry 22/22 and its red 20/20, pending-bet all pass, journey-question all pass,
   sheet-owner-recovery 52 and bet-sheet-host 49/0 — re-derive them, never copy them.
3. **Re-read every citation here at the base.** Anything moved, changed or gone becomes an amendment.
4. **The docs commit** (one, rebased onto main last): the status lines above and nothing else. Gate names with no
   package key yet are written without the `npm run` prefix (docs-links.mjs:59-64 checks every `npm run` in a
   top-level doc).

**Gates.** test:docs; test:vodacom-plan (the S10 row 🔨, no ✅ before a commit).

**Served bytes for a classic viewer.** None.

**Done when.** The tree is clean at S8's close; S9's state is recorded; today's reds are named by label; every citation
is re-read; the landed annotations are in place; §0, §1 and §0h carry S10's status.

### WP1 — The pure core: the guest frame, what a door carries, one return rule, one door tail (M; depends on WP0)

**Goal.** Put every decision the guest sheet and its doors make into pure, client-safe functions, proven in process
before any markup reads them.

**Files.**
- src/lib/journey/guest-sheet.ts (new, pure; imports only `sheet-state.ts`, `pending-bet.ts` and `safe-next.ts`):
  - `guestFrame(input)` — `sheetFrame` (sheet-state.ts:639) with no viewer half (`viewer: { state: "failed" }`, no
    intent, no answer) and `cta: null`. The plan then reads its unread facts (`viewerUnread`, sheet-state.ts:239-249),
    checks the market and the stake (shortfall.ts:203-208) and answers unknown (:216-217), so the only frames are edit
    (inside or outside the bounds) and closed. Never low, pending, blocked, placing, in doubt or receipt; never a
    balance figure.
  - `carriedStake(frame)` — the frame's stake when it is inside the bounds, else null (Open point 6).
  - `guestCarry({ pathname, search, seedId, side, stake, nowMs })` → `{ bet, markerRaw, address, next }`: the bet (with
    the carried stake, or none); the marker `writeMarker(bet, nowMs, attributionFrom(search))` with no key and no owner
    (pending-bet.ts:138-148); the address `pathname + withBet(search, bet)` (sheet-state.ts:131-135, every other
    parameter kept); and `next` = `pendingBetUrl(betReturnPath(pathname, bet), bet)`.
  - `guestOpensFrom(pathname, search, markerRaw, nowMs)` → the market bet the address names on a `SHEET_PAGES` path
    (`sheetOpensOn`, sheet-state.ts:115-125; `pendingBetFrom`, pending-bet.ts:70-80) and the stake it may open at
    (`stakeFromUrl` with no owner: only an ownerless marker), or null.
  - `returnedOpen(markerRaw, bet, nowMs)` — true only when an ownerless, keyless marker under 24 hours old names the
    address's bet with its stake: the open continues a visitor's own counted open (WP7, Open point 9). The money host
    writes `owner` on every marker it writes (bet-sheet-host.tsx:332, :390), so its own markers never qualify.
- src/lib/journey/pending-bet.ts: `BET_RETURN_PAGES` (`/`, `/live`, `/watchlist`) and `betReturnPath(pathname, bet)` —
  the page itself when it is one of those or the bet's own question page `/markets/<bet.id>`, else the bet's own question
  page. S9's `depositReturnPath` reads the same list at its rebase (Correction 8).
- src/lib/auth-landing.ts: `doorHrefsFor(next, search)` — the one tail every guest door builds: `next` through
  `boundedNext` (safe-next.ts:69-72), `ref` through `normalizeReferralCode`, `invite` through `normalizeInviteCode`
  (invite-code.ts:14-21). `authDoorHrefs` (:40-58) becomes "this page as the next" plus `doorHrefsFor`, with identical
  output. Its imports stay those it has (safe-next, referral-code, invite-code, break-end and a type).
- scripts/guest-sheet.test.mts (new) and package.json `test:guest-sheet` and `red:guest-sheet` (in process,
  `--prove-red`).
- scripts/pending-bet.test.mts: §8 `betReturnPath`, with plants.

**Steps.**
1. `guestFrame` on the S3 goldens (Dodoma YES 24,825 / NO 50,462 at 13%, VODACOM-PLAN.md:4435) and every estimate state
   — priced, fills an empty side, one-sided refund, empty pool, legacy capped, over the cap, thin — plus a seed not
   bettable, a clock that crosses `closesAt` on the server offset, and every bounds break (empty, not whole, below,
   above). Its frame, stake, chips and estimate equal `sheetFrame`'s for the same inputs; its `cta` is null.
2. `guestCarry`: a stake inside the bounds carries `id.side.stake`; outside or empty, `id.side`; the marker parses to
   exactly `bet`, `at` and the codes the page carries (never `k`, never `owner`); `next` is the return page plus the
   bet; the address keeps `cat`, `q`, `page` and `from`.
3. `doorHrefsFor`: a spaced invite ("a b" → "A B") rides URL-encoded; a 25-character invite, an embedded NUL and a
   malformed referral are dropped, never cut; `next` over 512 characters, an `/auth` page or `//evil.example` is
   dropped. `authDoorHrefs`' rows in test:pending-bet 7.doors (pending-bet.test.mts:176-187) and test:auth-carry's
   doors.* are unchanged.
4. `guestOpensFrom`: a forwarded `?bet=…stake` with no marker opens at the minimum; an ownerless fresh marker naming the
   same bet opens at its stake; an owner-stamped marker, a keyed marker, a marker 24 hours old or a future-dated one
   opens at the minimum; a round bet, a `/wallet/*` or `/auth/*` path gives null.
5. `returnedOpen`: exactly the case above; an owner-stamped marker and a stake-less address are false.
6. **Source census (§6):** the module imports only the three modules named; no clock read but the caller's; no money
   figure or rate typed; client-safe.

**Gates.** test:guest-sheet and red:guest-sheet (new); test:pending-bet and red:pending-bet (§8); test:auth-carry and
red:auth-carry (unchanged verdicts; a plant anchor the refactor moved is re-pinned in the open); test:kyc-at-withdrawal
§A; test:client-graph-safe; test:red-anchors; typecheck.

**Served bytes for a classic viewer.** JS only: `auth-landing.ts` rides the classic header's chunk
(top-app-bar.tsx:15), refactored with identical output; the new module and `pending-bet.ts` are journey and server code.

**Done when.** The module exists; both suites and their twins are green; the door tables are unchanged.

### WP2 — S10's words (S; depends on WP1)

**Goal.** Every word the guest face shows comes from a key; no existing value changes before S15 (§3.9 :4824-4825).

**Files.**
- src/lib/i18n-dict.ts: the journey namespace gains `sheetSignUp` (below).
- docs/VODACOM-PLAN.md §3: an "S10 keys" note beside S8's (:4045-4079).
- docs/design-system/v5-2026-09-29-simplified-journey/S4-COPY-AUDIT.md: "S10 drafts" and S10's own Swahili review (the
  next free number: S11-PLAN claims review 9, on `39322dd69`).

**Steps.**
1. Add the one key in "New dictionary keys". sw is the approved canvas word (S4-COPY-AUDIT.md:324, review 3); en and zh
   are drafts for the review.
2. Reuse, never copy (the list under "New dictionary keys").

**Gates.** test:i18n; test:translation-safety; test:rate-copy; test:labels; test:support-contact (no helpline);
test:docs. test:house-bot-disclosure 5.1 is red by construction on any dictionary change until main (S8-PLAN.md:1280):
record it, do not "fix" it.

**Served bytes for a classic viewer.** JS on every page: three strings.

**Done when.** The key exists in en, sw and zh; the review is signed in S4-COPY-AUDIT; §3 and S4-COPY-AUDIT agree.

### WP3 — The sheet's guest face (S; depends on WP2)

**Goal.** S8's sheet, drawn for a guest: no balance row, and the two doors in the CTA's place. One sheet, two faces —
never a second sheet component (DESIGN_AUTHORITY §B9; Open point 5).

**Files.**
- src/components/journey/bet-sheet/bet-sheet.tsx: an optional `guest` prop on `BetSheetProps` and `BetSheetBody`
  (`{ signUp: string; signIn: string; onLeave: () => void }`). With it:
  - no balance row (today drawn at :125);
  - the footer (:132-143) holds, in the commit's place, the two doors exactly as "The look, in tokens" specifies:
    `journey.sheetSignUp` as a `<Link>` with `btn btn-primary btn-xl w-full kp-bsheet__commit` (the commit's own rung
    and geometry, so no new class and no new value) and `common.signIn` as a `<Link>` with `btn btn-ghost btn-lg w-full`
    — the S4 board's two heights on our ladder (Open point 17; Ali's 2026-10-12 answer, "our nearest standard sizes",
    §0h point 82). Sign-up is not money, so never gold (DESIGN_AUTHORITY §M3a; the 2026-07 gold-discipline fix that made
    sign-up royal); a link drawn as a button keeps the button's paint (§B4c). The sign-up label goes through `keepText`
    (keep-run.tsx:203). Test ids `journey-sheet-signup` and `journey-sheet-signin`; the shell carries `data-guest`;
  - each door calls `onLeave` before the Link navigates;
  - the closed frame keeps its "Sawa" alone (`common.gotIt`): a closed question offers no sign-up.

  Without `guest`, every path is byte-identical (`test:bet-sheet`'s render goldens are the proof). No rule is added to
  globals.css.
- src/components/journey/bet-sheet/sheet-warmup.tsx: `warmSheet(t, locale, { guest })` draws the guest face's first
  frame for a guest host (the A21 rehearsal, :23-57), so a guest's first tap meets a warm page too.
- scripts/bet-sheet.test.mts: a guest section rendered in sw, en and zh across WP1's frames: no balance row, no commit
  button, no deposit row or bet-instead, the two doors in order with their hrefs and test ids; plants (a balance row
  drawn for a guest; the commit drawn beside the doors; the doors swapped; a gold door).

**Steps.** As above. The face's tokens are the kit's (`--h-control-xl`, `--h-control-lg`, globals.css:331-333); no
value is typed in the component. The bet-sheet test's render proof asserts each class and token the look table names
(the footer's two classes, no `.kp-bsheet__balance` for a guest), so a door drawn on a hand-typed size or a second
geometry class fails in process before any tile is taken.

**Gates.** test:bet-sheet and red:bet-sheet; test:enter-where-pressed and its red (no new key listener; the doors are
links, so Enter on one is its own activation, and the key guard's beat holds, CLAUDE.md "Keyboard"); test:implicit-submit
(no form); test:gold-is-money; test:betting-ink; test:visual-pass-r8a §5 (link census); test:visual-pass-r4i (its
census of `keepText` call sites gains the door: the widest kept run against the narrowest line, per language);
test:tap-target; test:popup-fit; test:design-frozen; test:tokens; test:ui-consistency.

**Served bytes for a classic viewer.** None (journey chunks only).

**Done when.** The guest face renders in three languages in every reachable frame; the money face is unchanged.

### WP4 — The guest host and its mount (M; depends on WP3)

**Goal.** A journey guest's tap opens the guest sheet in place, the address behaves as S8's does, and the doors carry
the visitor out and back. No money code reaches a guest.

**Files.**
- src/components/journey/bet-sheet/guest-sheet-host.tsx (new, "use client"): `GuestSheetHost`.
- src/components/layout/shell-lazy.tsx: `LazyGuestSheetHost`, one loader line ending in `nothingIfLost` (beside :73).
- src/components/layout/app-shell.tsx:617: the one slot becomes
  `{journeyShown && <Suspense fallback={null}>{session ? <LazyBetSheetHost key={session.userId} viewerId={session.userId} /> : <LazyGuestSheetHost key="guest" sessionEnded={endedNotice !== null} />}</Suspense>}`
  — one `journeyShown &&` slot, so a classic request still renders one `false` (Open point 4); `endedNotice` is
  AppShell's own (:141-149).
- src/components/journey/cards/journey-card.tsx (:223-234) and src/components/journey/question/journey-bet-buttons.tsx
  (:10-13): `aria-haspopup="dialog"` on every pick that carries `data-bet-side` (Correction 5).
- scripts/qa-first-load.mjs (:172-173): a `GuestSheetHost` row with a marker string unique to the guest host's file; the
  money host's marker re-checked unique (Correction 16).
- Re-pins, each in the open with its plant kept (Correction 16): bet-sheet-host.test.mts host.conditional-mount and
  "guest receives money host" (the session arm is the money host with the session's own id; the guest arm is the guest
  host; a plant that hands a guest the money host is caught); visual-pass-r8d 10.2′ (the S8 slot string becomes S10's
  slot, with its symmetric controls); journey-shell §12's parts table gains `LazyGuestSheetHost`; journey-question
  "seed" and "buttons" read the attribute; journey-home §4 the card's attributes.

**Steps.**
1. **A tap.** One `click` listener on `window` in the capture phase, accepting exactly what the money host accepts
   (bet-sheet-host.tsx:411-420: an unmodified primary click on `a[data-bet-side]` inside `[data-sheet]` with a bettable
   seed, same origin, on a `SHEET_PAGES` path). It calls `preventDefault()` (NavProgress then starts no bar,
   nav-progress.tsx:109), replays the press pop, pushes `?bet=<id>.<side>` and opens the sheet on the tap frame
   (`flushSync`) from the seed. A round card carries no seed (journey-card.tsx:213), so it is left alone.
2. **The address,** on mount and on popstate, through `guestOpensFrom`: a market bet whose seed is on the page opens at
   its preset; no seed on the page strips `bet` and opens nothing (Correction 6); on a flight that ended a session
   (`sessionEnded`), never — the session-ended notice speaks (Open point 20).
3. **Refreshing,** the public half only (`/api/markets/<id>/sheet`, never `me=1`): on open, every 10 s while visible,
   and on focus. A 429, a 5xx or a network failure keeps the figures it has; a 404 or `bettable: false` flips the sheet
   to its closed frame; the sheet's own closed flip at `closesAt` runs on the server-offset clock (`closedAt`,
   sheet-state.ts:100-105). "Makadirio yamesasishwa" when a moved pool changes the printed figure (`estimateMoved`).
4. **Close and Back** as the money host: closing pops the entry it pushed (`history.back()`) or strips `bet` when the
   page loaded with it; Back closes.
5. **The doors.** Each render computes `guestCarry` from the current frame and `doorHrefsFor(next, search)`. `onLeave`,
   on a plain primary click: `saveSheetSelection(sessionStorage, markerRaw)` — it quarantines a keyed legacy envelope
   first and never writes a key (sheet-owned-storage.ts:128-135); then the current entry's address is replaced with the
   carried bet, so Back from the auth page reopens the sheet at that stake; then the sheet closes WITHOUT touching
   history (the Link's push follows). A storage refusal never blocks the navigation; the stake then returns at the
   minimum (Open point 7). A modified click (a new tab) writes the marker and leaves this tab as it is.
6. **The funnel.** `sendFunnel("sheet_open", origin)` once per open through WP7's one predicate: `home`, `card` or
   `market` from the seed's `data-sheet-origin` for a tap; `board`, or `home` with `from=home`, for an address open —
   the money host's rule (S8-PLAN WP7 step 9).
7. **Warm-up and boundary.** `warmSheet` with `{ guest: true }` at the first idle moment, never while a sheet is open
   (bet-sheet-host.tsx:480-491's rule); the sheet inside a boundary of the host's own (the money host's `SheetBoundary`
   pattern, :37-50).
8. **Never** — and WP4's census holds it: a server action, `@/app/markets/actions`, `@/app/wallet/**`, a `me=1` read,
   `crypto.randomUUID`, an owner, a `kp-sheet-intents:*` key, `saveOwnedSheet`, `resolveLegacySheet`, a deploy-skew
   reload (it sends no action, so it has nothing to reload for).

**Gates.**
- test:guest-sheet §7–§10 (in process; the host's callbacks bound from its source as test:bet-sheet-host's `bindHost`
  does): the tap table equals the money host's on the same events (accepted and ignored alike); `onLeave` writes exactly
  the marker and the address, in that order, and never `history.back()`; the only storage key touched is
  `kp-pending-bet`; the only fetch is the public route; the module graph reaches no money action; `sessionEnded` stops
  every address open. Plants for each.
- test:bet-sheet-host and its red; test:journey-shell and red:journey-shell; test:visual-pass-r8d; test:journey-question
  and its red; test:journey-home and its red; test:simple-journey-flag and its red (AppShell's lines read the one
  answer); test:stacking; test:hooks-order; test:client-graph-safe; test:deploy-skew (no reload in the guest host);
  test:privacy-notice §4i (the key, its lifetime and the version pin unchanged, Open point 8).
- qa:classic-shell-parity v4 `--compare` (0 differences); qa:served-skeleton `--main` on `/`, `/live` and a question
  page, signed out and signed in; qa:first-load (the guest host's chunk never in a classic route's entry files).

**Served bytes for a classic viewer.**
- JS: `shell-lazy.tsx`'s chunk, one export longer, on every page; output unchanged.
- RSC: none — the slot stays one `false`.
- HTML: none for a classic page; a journey pick gains one attribute.

**Done when.** A pass holder's guest tap on any open journey card opens the guest sheet in place; the address, Back, a
reload and a door behave as above; classic readers show 0 differences; the census holds.

### WP5 — The question page for a journey guest (M; depends on WP4)

**Goal.** A journey guest's question page is the journey player's, without tickets: the two big buttons after the
countdowns on a phone, in the aside from 1024 (S8's layout, §0h point 82(i); the S4 market board). The classic guest
panel stays for every classic reader.

**Files.**
- src/app/markets/[id]/page.tsx:
  - the aside's class (:728) and the phone section (:1121) drop `session` from their journey condition (a guest has no
    `breakBody`: it needs a session, :260-270);
  - the bet panel's arms (:729-877) become: break (a session on a break, :730-739) → the journey arm (S8's,
    :741-745) for every journey reader → the classic dial (:746-811) for a classic session → the classic guest panel
    (:812-877). The two classic arms are today's elements, not re-indented.
- docs/SHELVED.md: "The question page's guest sign-in panel ('Ingia ili kutabiri', the stake invitation and its two
  doors), for journey viewers only" — files `src/app/markets/[id]/page.tsx` (the guest arm, unmounted for a journey
  request), how to re-mount (render the classic guest arm for every guest), test `npm run test:journey-question`.
- Re-pins (Correction 16): journey-question "mount"; one-sided 8.5 `noteSlots` (still four exclusive desktop arms,
  four `{oneSidedCallout}`); journey-home §9's question-slot normaliser; scripts/anchors/market-columns.anchors.mjs's two
  anchors on the aside.

**Steps.** As above. `questionSeed` is already computed for a guest (journey-sheet.ts:200-212 with no user, at
[id]/page.tsx:316-317).

**Gates.** test:journey-question and its red; test:one-sided; test:journey-home and its red; test:red-anchors (the
market-columns anchors resolve exactly once); qa:classic-shell-parity v4 — its QUESTION phase's guest cells (open,
one-sided, closed and settled questions; en and sw; 360 and 1280; S8-PLAN WP1 step 3): 0 differences.

**Served bytes for a classic viewer.** None.

**Done when.** A journey guest's question page shows the two big buttons, which open the guest sheet; a campaign link
`/markets/<id>?side=YES` opens it at the minimum; a classic guest's page is today's; parity 0.

### WP6 — Every journey guest door carries the page and the codes (S; depends on WP1)

**Goal.** B3's rule (route audit 2026-10-06) reaches the journey: no guest door in the journey drops the page a visitor
came from, a friend's referral code or a campaign invite.

**Files.**
- src/components/journey/journey-top-bar.tsx (:203-211): the two pills take `authDoorHrefs(pathname, search)` — the
  classic header's `GuestAuthDoors` pattern (top-app-bar.tsx:468-482) — inside a Suspense boundary whose fallback is
  today's bare pair (`useSearchParams`; the classic header's own reason, :474-475). Labels, classes and order unchanged.
- src/components/journey/tickets-guest-sheet.tsx (:45-60): `doorHrefsFor("/positions", search)`, so `ref` and `invite`
  ride beside `next=/positions`.
- docs/FLOWS.md §1, "Guest header Sign in / Sign up": names the journey header's doors and the guest Tiketi sheet (file
  and symbol anchors only; test:docs refuses a line anchor in FLOWS, docs-links.mjs:120-140).
- Re-pins: journey-shell 8.chrome (:1562-1563: the pills' hrefs), 8.sheet (:1796: the guest sheet's doors), the
  census's door tables (:1982-1990: the paths with their queries).

**Steps.** As above.

**Gates.** test:journey-shell and red:journey-shell; test:auth-carry (doors.*); test:pending-bet 7.doors; test:docs. The
header's words and boxes do not change, so qa:journey-header-fit is not re-run (the session law: no check on code the
change never touched); WP8a's tiles read the header.

**Served bytes for a classic viewer.** None (journey chunks).

**Done when.** From a page carrying `?ref=` and `?invite=`, every journey guest door — the header's two pills, the guest
Tiketi sheet's two doors and the guest sheet's two doors — carries the page (or `/positions`) and both codes.

### WP7 — The return: one count, no greeting over the sheet, `test:post-register-landing` (M; depends on WP4)

**Goal.** Make the moment a visitor comes back signed in right in the three ways S8 never had to: the open is counted
once, the greeting does not lie over the sheet, and the landing is proven the same in both flag states.

**Files.**
- src/components/journey/bet-sheet/bet-sheet-host.tsx (:259-275): `open()` sends `sheet_open` through the one predicate
  (WP1's `returnedOpen`): not for an address open whose marker says it continues a visitor's own counted tap (Open
  point 9). S13's WP4 later edits this one call for `home_repeat` (S13-PLAN WP4, on `b0af2f1b2`).
- src/components/layout/auth-flash.tsx (:37-60): ONLY if WP8a step J measures the greeting over the sheet's chip row or
  ✕ in any cell — the greeting waits while the journey bet sheet is open (keyed to that sheet alone; every other dialog
  and every classic reader unchanged), then shows (Open point 10). Otherwise unchanged, and the measure is recorded.
- Open point 11's choice for a question that stopped being LIVE (the default: the money host strips `bet` after an
  address open whose public read answers 404, so a reload does not retry; a key read keeps today's rule).
- scripts/post-register-landing.test.mts (new) and package.json `test:post-register-landing` and
  `red:post-register-landing` (in process; it joins `test:all`, not `predeploy`, Open point 26).

**Steps — `test:post-register-landing`:**
1. **§1 The real register action's success path** (`startRegisterAction`, register/actions.ts:41-93), with the service
   seam answering `ok` and a throwing redirect seam (the auth-carry harness, auth-carry.test.mts:20-37):
   no `next` → `/?welcome=new`; `/?bet=<id>.YES.5000` → `/?bet=<id>.YES.5000&welcome=new`; a question page and `/live`
   alike; `/wallet/deposit?amount=5000&bet=<id>.YES.5000&from=low-balance` kept; `//evil.example`, `/\t/evil.example`,
   `/auth/login` and a 600-character next → `/?welcome=new`; a staff role → `/admin`; the service's input carries the
   normalised `ref` and `invite`.
2. **§2 The password sign-in and the two-step door** (`startLoginAction`, login/actions.ts:41-119;
   `verifyLogin2faAction`, :127-155): the same rows with `welcome=back`.
3. **§3 Both flag states.** §1 and §2 run under the rollout's three ceilings (`FEATURE_SIMPLEJOURNEY` WITHDRAWN, unset =
   STAFF_PREVIEW, ACTIVE; `simpleJourneyFor`, feature-state.ts:451-458) and with and without a preview pass in the cookie
   seam: identical answers in every combination.
4. **§4 The census:** no file under `src/app/auth/` and neither `auth-landing.ts` nor `safe-next.ts` names the rollout
   (`resolveSimpleJourney`, `simpleJourneyFor`, `journey-preview`, `kp_preview`, `journey-on`), so the landing cannot
   fork by flag; a planted import is caught.
5. **§5 The landed address, per flag state.** Journey: the money host's reopen predicates (`sheetOpensOn`,
   `pendingBetFrom`, `stakeFromUrl` with the new account's id) give the visitor's stake from the ownerless marker; the
   minimum for a forwarded link, for a marker owned by another account and for a marker 24 hours old; nothing for a
   round. Classic: AppShell's slot is `false` without `journeyShown` (the WP4 slot, read from its source), so nothing
   opens.
6. **§6 The edge keeps a money page's query in `next`** (proxy.ts:219, `pathname + search`), by census with a control.
7. **Plants** for every section (a register action that lands on `/wallet/deposit`; a landing that reads the rollout; a
   `stakeFromUrl` called with no owner in the money host's adoption; a proxy that drops the query).

**Gates.** test:post-register-landing and its red (new); test:auth-carry and its red; test:kyc-at-withdrawal §A;
test:bet-sheet-host and its red (the `open()` change, with a plant that counts twice); test:journey-funnel;
test:privacy-notice §4h (no new storage); test:red-anchors.

**Served bytes for a classic viewer.** AuthFlash's chunk only if the hold is built, with identical classic behaviour.
None otherwise.

**Done when.** The suite passes in both flag states with every plant caught; a visitor's return counts one open; the
greeting's measure is recorded and, if needed, the hold is in.

### WP8a — The visitor drives before the deposit (L; depends on WP5, WP6, WP7)

**Goal.** Measure in a real browser what no source check can: the guest sheet, the doors, the round trip through the
real auth forms, the sheet waiting on the landing, and the classic path unchanged — every count read from the player's
own rows, every tile read.

**Files.**
- scripts/qa-visitor-path.mjs (new) and scripts/live/visitor-cells.mjs (new: the cells and their rules, shared with the
  red control); package.json `qa:visitor-path`.
- scripts/qa-bet-sheet.mjs:303-311: the guest control flipped — a journey guest's pick opens the guest sheet in place,
  and never the money sheet.
- scripts/qa-bet-sheet-production.mjs: the guest tap's A21 cells.
- docs/VODACOM-PLAN.md: §5 S10 and the §1 row name `qa:visitor-path` in the commit that adds the key.

**Steps.**
1. **Where.** Locally only, one in-memory server per run, behind `scripts/live/journey-pass.mjs`'s `premise` (:41) with
   `DISABLE_ADMIN_TOTP=true`; the journey through a staff pass (`mintStaffPass`, :59), which survives sign-out and
   sign-in (§0b decision 2, VODACOM-PLAN.md:512-514); classic with no pass. Existing dev-test doors only
   (`seed-admin`, `seed-markets`, `seed-wallet`, `reset-rate-limits`, `fast-forward-market`, `bet-sheet-observe`):
   test:cert-devroutes stays unchanged. Test phones, emails and passwords are generated per run and never printed.
   Each cell asserts its premise first; a failed premise is INVALID, never PASS.
2. **A · the guest sheet:** from the home, `/live`, a question's big buttons and its similar rail; the frame (no balance
   row, the doors); Back closes; a reload reopens at the minimum; a forwarded `?bet=<id>.YES.50000` opens at the
   minimum; the campaign link `/markets/<id>?side=YES&utm_source=a&utm_campaign=b` opens at the minimum with the side
   locked; a question closed by `fast-forward-market` shows the closed frame; a moved pool shows "Makadirio
   yamesasishwa".
3. **B · the doors:** the exact hrefs (`next`, `ref`, `invite`); the marker in sessionStorage (no `k`, no `owner`); the
   address with the stake; Back from the auth page reopens the sheet at the stake.
4. **C · register, at TZS 0:** the real form; the landing `<page>?bet=…&welcome=new`; the money sheet open at the
   visitor's stake; the low frame with "Weka pesa TZS {stake}" alone; zero positions and zero BET_PLACED rows
   (`bet-sheet-observe`); "Weka pesa" opens today's deposit page with the amount and the bet (S8 Open point 11).
5. **D · register, then funded** (`seed-wallet`): the edit frame; zero rows until one explicit tap on "Weka dau · TZS
   {stake}"; then exactly one position and one BET_PLACED row.
6. **E · sign in** (an existing funded player): `welcome=back`; one tap; one position.
7. **F · the codes:** `/?ref=<a seeded agent's code>` and `/?invite=<a seeded campaign code>` → the register page's
   banner → the account bound, read through an existing door (the referrer's own invite list or the console's player
   page as the seeded admin, read-only).
8. **G · refusals on the way:** a taken phone (the panel's Sign in keeps `next` and the codes); a wrong password (the
   failure hop keeps them); a player on a cooling-off break who signs in meets S8's block frame, and no row is written;
   maintenance switched on by the seeded admin before the landing shows S8's inline maintenance line with the CTA
   withheld. The rest of the sheet's refusal matrix is S8's own drive (`qa:bet-sheet`), not repeated here.
9. **H · classic controls** (no pass): today's classic visitor path — the classic home, the question page's guest panel,
   sign-up back to `/markets/<id>?side=YES&welcome=new` with the dial; no `next` → `/?welcome=new`; no guest sheet, no
   `data-guest`, no journey trace.
10. **I · both flag states:** C repeated on a second local server started with `FEATURE_SIMPLEJOURNEY=ACTIVE` and no
    pass (the journey for everybody, as after S15); and with `FEATURE_SIMPLEJOURNEY=WITHDRAWN` and a pass (classic).
11. **J · the greeting and the sheet:** at 320×640, 360×640 and 390×844 in sw, en and zh, the greeting's box against the
    sheet's chip row and ✕ (Open point 10).
12. **K · an ended session's flight** with `?bet=` in the address: the session-ended notice shows and no guest sheet
    opens over it.
13. **L · keyboard:** first focus on the heading; Tab and Shift+Tab stay in the sheet; Escape closes; Enter on a focused
    door navigates once; a held Enter navigates once; the WebKit cell (`ENGINE=webkit`).
14. **M · the deposit page signed out:** `GET /wallet/deposit?amount=5000&bet=<id>.YES.5000&from=low-balance` answers
    307 with `next` holding the whole query.
15. **N · tiles:** the matrix and the nine-line reading of "The look, in tokens" — every surface listed there at
    320×640, 360×640, 390×844, 768×1024, 1280×900 and 1920×1080, in sw, en and zh, read one by one, each line's verdict
    written down. Each measured gap is compared with its token's computed value read from the page
    (`getComputedStyle`), never with a number typed into the drive.
16. **O · the tap frame** (A21) for a guest tap on a production build, as S8's production drive measures it.
17. **The red control, page-only** (S7's rule: never a repo file): a page script that drops `ref` from a door must fail
    F; one that copies a forwarded stake into the marker must fail A; a second click listener that opens a second sheet
    must fail the tap cell.

**Gates.** The drive's red control; test:orphans; test:docs.

**Served bytes for a classic viewer.** None (drives only).

**Done when.** Every cell passes, or is listed NOT MEASURED with its reason; the red controls fail their plants; the
tiles are read.

### WP8b — The whole visitor path, with S9's deposit and return (M; depends on WP8a and S9 on main)

**Goal.** The board row's own words: guest → sheet → register → deposit → back works.

**Steps.**
1. C continued on S9's journey deposit: the strip, the amount, the wallet, the phone, Lipa; the mock rail confirmed at
   once, and pending (`PAYMENTS_DEMO_ASYNC`, payments.ts:296-314) → the waiting page → paid → back to the sheet at the
   stake with the new balance; zero rows until one explicit tap; one position, whose origin S9 records
   (`isDepositReturnBet`, `daaffe1b3`:deposit-state.ts:200-209).
2. S9's return-time states for a visitor: the question closed while paying; the stake made invalid by a moved bound;
   still short.
3. Both flag states, three languages, the tiles of every new frame.

**Gates.** The drive's red control; S9's own suites stay green (`test:deposit-return`, `test:deposit-status-read`, as
S9 names them when their keys exist).

**Done when.** The full path passes in sw, en and zh, with one bet per explicit tap.

### WP9 — Proof, records, merge, deploy (M; depends on all)

**Goal.** Prove S10 against its promise, ship it behind the flag, and close the records.

**Steps.**
1. **Each change** already ran its own guard and mutation proof where it was built (the session law, VODACOM-PLAN.md:392-396).
2. **Each push:** typecheck, `next build`, local qa:live; then the production read-back — `?dpl=` on both hosts,
   health, qa:chunks-prod, production qa:live ([E2] signed out; [E3] as the QA player where a machine holds its
   password).
3. **The session close:** `npm run test:all` with the database suites; every red S10 touched (guest-sheet,
   post-register-landing, pending-bet, auth-carry, bet-sheet, bet-sheet-host, journey-shell, journey-home,
   journey-question, simple-journey-flag, enter-where-pressed) and each file-mutating red alone with `git diff` clean
   after it; parity v4 as a baseline at the last live main plus one compare, every intended difference named (none
   expected); qa:served-skeleton `--main`; real-browser tiles of everything S10 drew, read one by one.
4. **An adversarial refute-and-mutate review** of the applied change before its commit, the money lens first: a bet
   placed without a tap; a stake set by a forwarded link; a code dropped on the way; a foreign or keyed marker adopted; a
   money action reachable from a guest.
5. **Merge, push and verify** as step 2.
6. **Records,** each in its one home (Ali's records rule): S10's §0 section as built, with each package's served bytes,
   and §1's S10 row (VODACOM-PLAN, the status home); SHELVED (WP5's row, in WP5's own commit, SHELVED.md's rule); FLOWS
   §1 (WP6's correction of the guest-header row, and one new row for the journey visitor's sheet and its return, file and
   symbol anchors only); §2 unchanged unless Point for Ali 4 ships; memory. Nothing here restates another record: each
   line points at the home that holds the fact.

**Done when (S10), as Open point 2 proposes:**
- On a local in-memory server through a real staff pass, qa:visitor-path (WP8a and WP8b) passes in sw, en and zh from
  320 to 1920, with one bet per explicit tap in every cell;
- test:post-register-landing passes in both flag states;
- parity v4 shows 0 differences;
- production proves nothing changed for players beyond S10's §0 named served bytes.

A real visitor journey on production waits for S14 (§0h point 4). Only then is S10 ✅.

---

## New dictionary keys (journey.*)

### S10's one key

| Key | sw | en | zh |
|---|---|---|---|
| `sheetSignUp` | Jisajili uweke dau | Sign up to place your bet | 注册以投注 |

sw is the S4 canvas's approved word (`s4-4-sheet-guest.dc.html`; S4-COPY-AUDIT.md:324, review 3: *jisajili*, then the
subjunctive of purpose *uweke dau*, "so that you place a bet"). en and zh are drafts for S10's review. ⛔ Not zh
"注册并投注" ("sign up and bet"): it reads as if signing up places the bet, which nothing does (DESIGN_AUTHORITY §C).

### Reused, never copied

- `common.signIn` ("Ingia" · "Sign in" · "登录", i18n-dict.ts :42, :3248, :5732) for the second door.
- S8's sheet words: `journey.sheetChosen`, `stakeLabel`, `estimateLead`, `estimatePill`, `estimatePillOver`,
  `estimateNote`, `estimateUpdated`, `estimateUpdatedLive`, `sheetBelowMin`, `sheetAboveMax`, `sheetClosedTitle`,
  `sheetClosedBody`, `sheetNotTaking`, `sheetEmptyPoolBody`, `sheetRefundRule`, `sheetFirstOnSide`, `sheetLegacyBody`,
  `sheetLegacyFee`; `market.crowdedWarning`, `noBetsYet`, `oneSideOnly`, `oneSidedNote`; `error.failStakeNotWhole`;
  `common.close`, `common.gotIt`; `sideWord` for every side.

### Not added

- No balance or "your bet is saved" sentence: the deck draws none, and nothing may promise that a stake survives a
  storage refusal (Open point 7).
- No helpline key (the owner ruling of 2026-10-06).

---

## Risks

1. **A bet placed without a tap.** The landing opens the sheet by itself. The money host commits only from its two
   commit buttons; the guest host has no money action; WP8 counts the player's own rows at every step.
2. **A stake chosen by somebody else.** A forwarded link opens at the minimum; only an ownerless marker in the same tab
   prefills, and the CTA names the amount before the one tap. On a shared phone, a person who signs in on a tab where
   somebody else picked a stake sees that stake on the CTA before tapping (the S3 design: "a keyless guest selection can
   cross its own sign-in", pending-bet.ts:97).
3. **A code dropped on the way** (Correction 4). `doorHrefsFor` is the one tail; WP8a step F reads the binding.
4. **Money code in a guest's bundle.** The separate host and its census (WP4 step 8).
5. **Classic regressions on the question page and in AppShell.** Same-slot ternaries without re-indenting; parity v4's
   QUESTION guest cells; qa:served-skeleton; test:red-anchors after WP5.
6. **Many guards pin the session-only shapes** (Correction 16). Re-pin each in the open with its plant, never loosen.
7. **Load.** Guests refresh the public half every 10 s against `sheet.ip`'s 120 tokens and 60 a minute per address
   (rate-limit.ts:150), and after S15 guests outnumber players behind carrier addresses. A refused read keeps the
   figures; S15's re-measure reads the 429 count (Open point 19).
8. **The funnel changes meaning** when guests can open sheets (S13-PLAN Risk 4, on `b0af2f1b2`). One count per
   visitor open (Open point 9); S13's definitions say so.
9. **The greeting over the sheet** (Correction 13). Measured in WP8a step J before anything is changed.
10. **S9 dependencies** (Corrections 7, 8). S9's rebase must pass the owner and stop writing keys into `kp-pending-bet`;
    WP0 and WP8b read it on main.
11. **Shared files.** S9, S11, S12 and S13 edit `i18n-dict.ts`; S9 edits `app-shell.tsx` (its focused chrome) and the
    host's deposit link; S13 edits the host's `open()`; S11 the privacy page and AppShell's journey slot. Rebase before
    each package; re-run the suites that read each merged file.
12. **The A21 tap budget** is still FAILED on this machine for the money sheet (218 ms median under load, §0 :24-26); the
    guest tap inherits it until S8's fix lands. No guest PASS is claimed before the money one.
13. **Two hosts, one window.** They never coexist: one slot, a ternary; a sign-in swaps them in one commit; a refresh
    flight that ends a session swaps back (step K).
14. **Order inside a door's click.** The address replace must happen before Next's Link pushes; `onLeave` runs in the
    anchor's own `onClick`, which Link calls before it navigates. A test pins the order; WP8a's Back cell proves it.
15. **sessionStorage is per tab.** A door opened in a new tab carries the side in its `next`; whether the stake follows
    depends on the browser copying the tab's storage into the new tab, so it may return at the minimum. No money moves
    either way.
16. **E35 stays open.** A self-excluded person cannot re-register with the same phone or email, but can with new ones
    (§0 :354, an owner question). The guest sheet makes registration one tap closer; S10 does not rule on E35.
17. **Production QA access.** [E3] has not been measured from OMEGA-COMPILE01 (no QA player password, §0k :962); S10's
    production read-back says so rather than claiming it.
18. **Tailwind scans comments; editors and heredocs eat backslashes** (S7-PLAN Risk 16). New files' comments carry no
    class-shaped strings; test:source-bytes catches the rest.
19. **Dictionary changes** turn test:house-bot-disclosure 5.1 red by construction until main. Record it; do not "fix" it.

## Open points → §0h

Each is a call taken under Ali's delegation, filed as a numbered §0h point by WP0, with its overrule.

1. **S10 starts after S8 closes,** because WP3–WP7 edit S8's host, sheet, slot and question page. Overrule: start WP1
   and WP2 (the pure core and the words) now.
2. **S10 is ✅ on local drives through a staff pass,** plus production proving "nothing changed for players". A real
   visitor journey on production moves to S14 (§0h point 4). Overrule: Ali turns his preview on at S10's close and
   signs up a real test player once.
3. **WP8b and S10's close wait for S9's deposit screen, waiting page and return on main,** with Corrections 7 and 8 fixed
   in S9's rebase; WP0–WP8a do not wait. Overrule: S10 waits for S9's close before any package.
4. **The guest host is a separate lazy part in AppShell's one host slot** (a ternary), so a classic request's RSC is
   unchanged and no money code reaches a guest; a money host in guest mode would reload on its first private read
   (Correction 15). Overrule: one host with a guest mode.
5. **One sheet, two faces:** the guest face is S8's sheet with no balance row and the doors in the CTA's place. Overrule:
   a separate guest sheet component.
6. **A stake outside the bounds is not carried;** the doors carry the side and the visitor returns at the minimum.
   Overrule: the doors wait until the stake is valid (they would become buttons).
7. **A storage refusal never stops the visitor:** the doors still navigate and the stake returns at the minimum, with no
   sentence added. Overrule: a line telling them.
8. **No privacy change.** §7 already names `kp-pending-bet`, its 24 hours, the question, side and amount, the link's codes,
   and the account only when signed in (privacy/page.tsx:216-219). Overrule: re-word "A bet chosen through a link" as "A
   bet you picked", in en, sw and zh, with a new version.
9. **A visitor's sheet counts once:** the tap that opened it; the signed-in reopen of the same bet is not a second
   `sheet_open`. Overrule: count both (the "sheet → bet" share then halves for visitors).
10. **The greeting waits while the bet sheet is open,** only if it is measured covering the sheet, and keyed to that sheet
    alone. Overrule: leave the greeting where it is.
11. **A question that stopped being LIVE while the visitor signed up:** nothing opens, and `bet` is stripped so a reload
    does not retry. Overrule: the server names a closed question's title to a signed-in reader, so the sheet can draw
    "Swali hili limefungwa" (a private-read change in S8's route).
12. **The carried `next` is the page rebuilt from its path and the bet** (§3.1 :4493): the home's category, search and
    page are dropped. Overrule: keep `cat`, `q` and `page`.
13. **A similar-rail tap on question A returns to question B's own page** (one return rule with S9). Overrule: return to
    question A, and S9's validator widens.
14. **The journey's guest doors take the classic header's rule,** with a Suspense fallback of today's bare pair.
    Overrule: a server-built href (AppShell passes the page and the codes).
15. **The classic question page's guest panel carries `invite` too** — a live fix for every player in its own commit
    (Points for Ali 4). Overrule: leave it for S12.
16. **`aria-haspopup="dialog"` on every journey pick and big button** (S8-PLAN A22 item 9, unbuilt). Overrule: none on a
    link.
17. **"Jisajili uweke dau" is brand primary at the commit's rung (`btn-xl`), "Ingia" the ghost one rung down (`btn-lg`)**
    — the S4 board's two heights on our ladder, the canvas's outline replaced by R9-C's ghost. The primary door takes the
    commit's own geometry class (`kp-bsheet__commit`), so S10 adds no rule to globals.css. Overrule: both `btn-xl`.
18. **No new COMPLIANCE entry:** the logged-out sheet is the 2026-09-29 entry's item 1 (COMPLIANCE-DECISIONS.md:1478-1497)
    and the agency reply's Q1; it places nothing and stores only the disclosed key. Overrule: a short entry.
19. **The guest sheet refreshes its public half on open, every 10 s and on focus;** a 429 keeps the figures. Overrule:
    on open only.
20. **On a flight that ended a session, the guest host opens nothing from the address;** the session-ended notice speaks.
    Overrule: open the guest sheet there too.
21. **Juu/Chini guests are unchanged** (S12-PLAN Open point 16). Overrule: a guest Juu/Chini panel in S12.
22. **No first-touch referral storage:** a code rides the page's own address (the code's rule, [id]/page.tsx:859-860),
    and the marker's codes stay unread. Overrule: a sessionStorage first-touch code, with a privacy change.
23. **The guest face shares the money face's test ids,** marked `data-guest`; its doors are `journey-sheet-signup` and
    `journey-sheet-signin`. Overrule: a separate test id family.
24. **The drive registers real test accounts on the local in-memory server only,** generated per run and never printed.
    Overrule: none.
25. **S10's §0 section letter and its §0h numbers are taken when WP0 lands** (S11-PLAN claims §0l). Overrule: none.
26. **`test:post-register-landing` joins `test:all`,** not `predeploy` (the line every lane edits; S9's two early fixes,
    §0 :266-267). Overrule: add it to `predeploy`.

## Points for Ali

1. [Points 4, 5] A visitor who taps NDIO or HAPANA sees the bet slip at once, with the amount, the quick amounts and the
   estimate, and two buttons: "Jisajili uweke dau" and "Ingia". After signing up they come back to the same question
   with the slip open and their amount kept. Nothing is placed until they press "Weka dau" themselves. **Recommended:
   yes** — it is the agency's frame and our written answer to their question 1.
2. [WP5] On a question's own page, a visitor in the new journey sees the two big NDIO / HAPANA buttons (they open the
   same slip), not today's "Ingia ili kutabiri" box. That is what makes the agency's campaign links open the slip.
   **Recommended: yes.**
3. [Point 14] In the new journey, the header's "Ingia / Jisajili" and the "Tiketi zangu" sign-in box forget the page and
   a friend's referral code — the mistake the old header had until 2026-10-06. S10 makes them keep both. **Recommended:
   yes, in S10** (nobody sees it until launch).
4. [Point 15] Today, for every player: a question page's "Jisajili / Ingia" buttons keep a friend's referral code but
   drop a campaign invite code. **Recommended: fix it now, as its own small release** (as we did for L2 and L3).
5. [Point 10] Right after signing up, the "Karibu kwenye 50pick" greeting can sit on top of the bet slip. **Recommended:** if
   our measurement shows it does, the greeting waits until the slip is closed.
6. [Point 6] An amount the visitor typed below the minimum or above the maximum is not carried: they come back at the
   minimum and choose again. **Recommended: yes.**
7. [Point 9] For the agency's numbers, a visitor's slip counts once, when they tap — not again when they come back
   signed in. **Recommended: once.**
8. [Point 11] If the question closes while the visitor is signing up, they land where they were and nothing opens (the
   question is no longer on the list). **Recommended: accept; S14's checklist reads it.** The alternative is a message
   "Swali hili limefungwa", which needs a small server change.
9. [Point 2] S10 is proven on a local copy of the site through a staff pass; on production we only prove that nothing
   changed for players. A real visitor journey with real money waits for S14 (your rule of 2026-10-02). **Recommended:
   yes.**
10. [Points 1, 3] S10 starts after S8 is finished. Its last step — paying and coming back to the slip — waits for S9,
    and S9 must fix two things when it catches up with today's site, or the amount would be lost on the way back
    (Corrections 7 and 8). **Recommended: yes.**
11. [Point 21] Juu/Chini visitors keep today's sign-in box. **Recommended: yes** (S12's call).

---

## ⭐ Amendments — these override everything above

None yet. When this plan is critiqued, each finding taken is filed here as A1, A2, …, with its *Overrides:* (the
packages, steps or points it changes) and its *From:* (the critique and why), as S8-PLAN's are (S8-PLAN.md:1429-1451).
Where an amendment and the body disagree, the amendment wins. The calls a critique changes are listed at the end as
"Open points, added and changed" and "Points for Ali, amended"; findings not taken as proposed are listed with the
re-read that refuted them.

---

## Proposed record annotations (exact text; the coordinator applies them when this plan lands)

Ali's records rule (2026-10-14): one source of truth, no contradicting records. This draft edited no file but this one.
Each block below is the exact text to add where the named line stands, appended — never rewriting the old words (the
annotation convention S8-PLAN WP0 used). The evidence for each is this plan's Correction named in it. Line numbers are
at `c14cb403e`; find each by its quoted text if they have moved.

**A · `docs/VODACOM-PLAN.md`**

A1. §0 RESUME (:28-30), after "the S11, S12 and S13 build plans are filed on their own `codex/vodacom-s1N-plan`
branches (§0k)." — insert:

```
The S10 build plan is filed on `codex/vodacom-s10-plan` ([`S10-PLAN.md`](design-system/v5-2026-09-29-simplified-journey/S10-PLAN.md), drafted 2026-10-14, not yet critiqued).
```

A2. §0k, the "Claude continuation (2)" bullet's "*Other lanes:*" item (:1000-1003), after "…`codex/vodacom-s13-plan`
`b0af2f1b2`, not yet critiqued." — insert:

```
The S10 build plan is filed on `codex/vodacom-s10-plan` (2026-10-14): 11 packages, 26 open points, 11 points for Ali; not yet critiqued. Its preparation is already live in `da19e5a21` (the auth carry `f7bdc2ea1`, the account-owned recovery `ee518f52a`).
```

A3. §1, the S10 row (:3926), at the end of its "Done when" cell (the status stays ⬜):

```
 Plan filed 2026-10-14 ([`S10-PLAN.md`](design-system/v5-2026-09-29-simplified-journey/S10-PLAN.md), its Amendments override its body); its preparation is live in `da19e5a21` (auth carry `f7bdc2ea1`, account-owned recovery `ee518f52a`).
```

A4. §2, a new row after "The classic deposit page's phone field becomes the kit `PhoneInput`…" (:3942) — Correction 3:

```
| The sign-in and sign-up pages carry a campaign invite too — the login form's hidden field, its links to sign-up and back, its failure hop; the register page's link to sign-in and its refusal panels — and an invite longer than 24 characters or holding a control character is refused instead of cut | S10 preparation — ✅ LIVE `f7bdc2ea1`, released in `da19e5a21` (2026-10-14, §0k) | A cut code could name a different campaign, and a dropped one bound nobody: route audit B3's rule for `ref`, extended to `invite`. |
```

A5. §3.7 (:4774-4787), three annotations:
- at the end of "- Same as §3.3 but with no balance row. CTAs: "Jisajili uweke dau" (primary) / "Ingia"." (:4775):

```
 *(S10-PLAN Correction 9: a guest has no event stream and no wallet, so its sheet refreshes the public half on open, every 10 s and on focus. Correction 6: the public read carries no title, so an address opens the guest sheet only where the page carries the card's seed.)*
```

- at the end of "- Balance 0 → low-balance → deposit (shortfall = stake) → code → PIN → waiting → back → confirm." (:4780):

```
 ⛔ *Annotated 2026-10-14 (S10-PLAN Correction 1): no code step — a deposit asks no email question since the owner's ruling of 2026-10-07 (§3.6).*
```

- at the end of "- Land on the origin page with `?bet=` and `welcome=new`." (:4779):

```
 *(S10-PLAN Correction 14: a question that stopped being LIVE meanwhile opens nothing — S10-PLAN Open point 11.)*
```

A6. §5 S10 (:5036), at the end of the paragraph:

```
 Build plan: [`S10-PLAN.md`](design-system/v5-2026-09-29-simplified-journey/S10-PLAN.md) (drafted 2026-10-14; its Amendments override its body).
```

A7. §5 S14 (:5058-5059), at the end of the `e2e:journey` bullet:

```
 ⛔ *Annotated 2026-10-14 (S10-PLAN Correction 1): no outbox code — a deposit asks no email question since 2026-10-07 (§3.6).*
```

A8. §0h — for WP0's start (or at landing, if the coordinator files plan calls then), numbered after the last point on
main (83 if nothing lands first):

```
N. **S10's plan — the calls taken under delegation (filed 2026-10-14, `S10-PLAN.md`).** Its 26 Open points are decisions taken under Ali's delegation, each with the overrule he may choose; its 11 "Points for Ali" are the ones that change what players get or what Ali must do: a visitor's bet slip opens before sign-up and comes back after it, never placed without a tap (1); a question page's two big buttons for a visitor (2); the new journey's guest doors keep the page and the codes (3); today's question page carries the campaign invite too, as its own release — awaiting Ali (4); the greeting waits for the slip if it covers it (5); an amount outside the bounds is not carried (6); a visitor's slip counts once (7); a question closed during sign-up opens nothing (8); local proof, and production only "nothing changed" (9); S10 after S8, its last step after S9 and two S9 fixes (10); Juu/Chini visitors unchanged (11). Overrule: any one of them, by its number or by its S10-PLAN Open point.
```

**B · `docs/FLOWS.md` §1**, the "Guest header Sign in / Sign up" row (:39), at the end of its middle cell, after
"…the register page's 'Sign in' keeps it (2026-10-06, new row)" — Corrections 3 and 4 (file and symbol anchors only,
as FLOWS requires):

```
 ⚠️ **2026-10-14 (S10-PLAN Corrections 3 and 4):** since `f7bdc2ea1` a valid campaign `invite` (`normalizeInviteCode`, `src/lib/invite-code.ts`) rides beside `ref`, outside `next`, on both doors and on the login page's links, hidden field and failure hop. And this row is the CLASSIC header's: the journey header's two pills (`src/components/journey/journey-top-bar.tsx`, `JourneyTopBar`) link to a bare `/auth/login` and `/auth/register`, and the journey's guest Tiketi sheet (`src/components/journey/tickets-guest-sheet.tsx`, `TicketsGuestSheet`) carries `next=/positions` and no code — journey readers only, nobody before the S15 flip; S10 WP6 gives both this row's rule.
```

**C · `docs/qa/s10-auth-carry-preparation.md`** (:17), after "First-touch referral persistence and the superseded
email-code deposit step are excluded by the current owner rulings." — Correction 12:

```
 *(Corrected 2026-10-14, S10-PLAN Correction 12: no owner ruling on first-touch referral storage is recorded in COMPLIANCE-DECISIONS. What excludes it is the code's own rule — a code rides the page's own query string, with no cookie and no storage (the guest panel's note in `src/app/markets/[id]/page.tsx`). The email-code step is superseded by the owner's ruling of 2026-10-07.)*
```

**D · `docs/qa/claude-vodacom-continuation-20261014.md`** (:114), after "Do not turn the guest host on prematurely." —
optional, the coordinator's call:

```
 S10's build plan is filed on `codex/vodacom-s10-plan` (`S10-PLAN.md`): it builds the guest host behind the flag after S8 closes, and its last step (deposit → back) waits for S9 with Corrections 7 and 8 fixed in S9's rebase.
```

**E · `docs/NEXT-PLAN.md`:** no change proposed (S10 has not started; ▶ 0c names the live lane).

**F · `docs/COMPLIANCE-DECISIONS.md`:** no entry proposed (Open point 18).

---

## ⭐ Amendments from the build (2026-10-15) — these override everything above, "None yet" included

Filed by the S10 builder on OMEGA-COMPILE01, in `C:\50pick-ssd\kipindi-s10b` (branch `codex/vodacom-s10-build`, from
origin/main `331048acb` with this plan's `82b2ecd2b` cherry-picked), each in the commit of the package it changes. Each
says what it *Overrides:* and where it comes *From:*. Where an amendment and the body disagree, the amendment wins.
⛔ The status lines WP0 would have written into VODACOM-PLAN §0, §0h and §1 are NOT written by the build: those sections
are the coordinator's (the coordinator's instruction of 2026-10-15), so the build's report hands their text over.

**A1 · The start line: S8 is not closed; S10 starts anyway, on S8's live code.** *Overrides:* WP0 step 1's first bullet,
Open point 1, the "S10 starts after S8 is finished" of Points for Ali 10. *From:* WP0's re-read at `331048acb`. §1's S8
row still reads 🔨 (VODACOM-PLAN.md:3938): S8's code is live behind the flag, the A21 root-`:has()` fix (`63704243c`) is on
main and A21 passes, but S8's close record is pending ([E3], the exact-tip CI and the closing battery remain). The
coordinator directed (2026-10-15) that S10 build WP1–WP7 and WP8a now, since they need only S8's code — Open point 1's
overrule. So any S8 change that lands on `bet-sheet-host.tsx`, `bet-sheet.tsx`, `sheet-warmup.tsx`, `sheet-state.ts`,
`pending-bet.ts`, `sheet-owned-storage.ts`, AppShell's host line or the question page's journey arms before S10 merges is
rebased over, and every suite that reads a merged file is re-run (Risk 11's rule).

**A2 · S9's state, and Corrections 7 and 8 as S9 settled them.** *Overrides:* WP0 step 1's second and third bullets,
WP1's "S9's `depositReturnPath` reads the same list at its rebase", Correction 8's last sentence, Risk 10. *From:* the S9
release candidate `codex/s9-release` `0ae0007f8` (based on `c14cb403e`; it holds `f7bdc2ea1` and `ee518f52a`), read
without touching it. Nothing of S9 is on main. On the release candidate:
- Correction 7 is fixed by `d281f0505`: `trustedDepositBet` passes the caller as the marker's owner
  (`stakeFromUrl(bet, trust.markerRaw, nowMs, callerId)`), and `markerForDeposit` proposes a selection-only marker stamped
  with the caller, never a key (`src/lib/journey/deposit-state.ts` on that branch).
- Correction 8 is settled the other way round: `depositReturnPath` accepts ANY page that opens the sheet (`sheetOpensOn`:
  `/`, `/live`, `/watchlist`, `/markets/<any id>`), so question A's page is a valid return for a bet on B. S10's
  `betReturnPath` keeps Open point 13's choice (B's own page, which always draws B's seed); every path it returns is one
  S9 accepts, so the two rules agree without S9 reading `BET_RETURN_PAGES`.
WP8b and S10's close still wait for S9's deposit screen, waiting page and return ON MAIN; both corrections are re-read on
main when S9 lands.

**A3 · Today's reds (WP0 step 2), measured at `331048acb`, in process, no DATABASE_URL, one at a time.** Green:
auth-carry 22/22 and its red 20/20 plants; pending-bet all and its red 19/19; bet-sheet all and its red 122/122;
bet-sheet-host 49/0 and its red (84 in-process controls); sheet-owner-recovery 52; journey-question all and its red 13/13;
journey-shell 446 and its red 208/208 (417 proofs); journey-home all; one-sided all; visual-pass-r8d 76/0;
simple-journey-flag 135/0 and its red 41/41; privacy-notice 116/0; i18n en = sw = zh = 2,744 keys; enter-where-pressed
all and its red 119/119; journey-funnel all; kyc-at-withdrawal 165/0; red-anchors 5,370/0; client-graph-safe 6/0;
vodacom-plan 18 rows, 0 failures; docs all resolve. **One red, not S10's:** `red:journey-home` 242/244 — "MISSED the
strip moved below the main landmark (it would paint under the page for every reader) — the plant is broken: the plant's
anchor resolves 0 times, not once: <MainLandmark>" and "MISSED a second mount of today's strip beside the slot (two strips
for a classic reader)", one cause: A21 (`63704243c`) gave AppShell's landmark its `viewer` prop, so §8's `STRIP_MAIN` no
longer resolved, and §8's place reader (`stripPlaced`) had been finding OptOutShell's `<MainLandmark>` below AppShell
rather than AppShell's own. Re-pinned in the build's first commit (`5680f7d87`), the control kept: 244/244.

**A4 · Line drift, re-read at `331048acb` (no contradiction found).** *Overrides:* the body's line numbers below.
- `docs/VODACOM-PLAN.md`: every line after :30 is +14 (the §0 paragraph on the owner's answers): §1's S10 row :3940, §2's
  pre-flip list :3953-3959, S8's keys :4059-4093, §3.1's goldens :4449, §3.3's refresh line :4601, §3.7 :4786-4801 (the
  "Balance 0 → … code →" line :4794), §5 S10 :5050, §5 S14's `e2e:journey` :5072-5073, the session law :406-410, §0b
  decision 2 :526-528, §0k's checkpoint :888-894 and its other lanes :1014-1017.
- `src/components/layout/app-shell.tsx`: the host slot :618 (was :617), the event stream :608 (was :607).
- `src/app/globals.css`: `.kp-wsheet` :6713 and its grab :6714 (were :6703-6704), the pair and the act :6722-6727 (were
  :6712-6717), the journey toast offset :7439-7440 (were :7429-7430), the `.kp-bsheet` family :8591-8643 (were :8574-8626):
  the panel :8591, the shell :8592, the header :8593, the chosen side :8595, the scroll :8596 and its focus rings :8600,
  the title :8601, the stake :8605-8606, the chips :8607, the estimate :8610, the bounds :8619-8620, the terminal :8635,
  the footer :8638, the commit :8643. `.btn:focus-visible` :1249 and `--h-control-*` :331-333 are unchanged. Since A21
  every journey-scoped rule reads `:root:is([data-shell="journey"], #kp-journey-shell)` (was `:root:has(#kp-journey-shell)`),
  Correction 13's toast offset included.
- `scripts/journey-shell.test.mts`: 8.chrome's pills :1566-1567, 8.sheet :1800, the census doors :1986-1994.
- Everything else cited reads at the same lines as at `c14cb403e` (pending-bet.ts, sheet-state.ts, sheet-owned-storage.ts,
  bet-sheet-host.tsx, bet-sheet.tsx, sheet-warmup.tsx, shell-lazy.tsx, journey-card.tsx, journey-bet-buttons.tsx,
  journey-top-bar.tsx, tickets-guest-sheet.tsx, top-app-bar.tsx, auth-landing.ts, safe-next.ts, invite-code.ts, the
  question page, the auth pages and actions, auth-flash.tsx, toast.tsx, modal.tsx, the sheet route, the privacy page and
  the qa scripts).
- None of "Proposed record annotations" A1–A8, B, C or D is on main yet; they remain the coordinator's to apply.

**A5 · A21's guest landmark is the same reader as WP4's slot.** *Overrides:* nothing; recorded so WP4's census reads it.
A21 gave AppShell's main landmark `data-viewer="guest"` for a journey reader with no session
(`<MainLandmark viewer={journeyShown && !session ? "guest" : undefined}>`, app-shell.tsx:575). WP4's slot hands the guest
host to exactly that reader (`journeyShown` and no `session`), so the two answers cannot disagree.

**A6 · A 600-character `next` lands as itself.** *Overrides:* WP7 step 1's "a 600-character next → `/?welcome=new`".
*From:* WP0's re-read. The register action keeps a same-origin `next` of any length (`sanitizeNext`,
register/actions.ts:56; `landingAfterAuth` asks `sanitizeNext` too, auth-landing.ts:16), and so do the sign-in and the
two-step doors (login/actions.ts:52, :129): an over-long safe path lands as itself, never cut. The 512 bound is the
DOORS' (`boundedNext`), so no door builds a longer `next`. `test:post-register-landing` pins today's rule; S10 changes no
landing.

**A7 · The guest's one storage write may archive a legacy envelope first.** *Overrides:* WP4 Gates' "the only storage key
touched is `kp-pending-bet`". *From:* `saveSheetSelection` (sheet-owned-storage.ts:128-135) quarantines a keyed legacy
envelope into `kp-sheet-intents:legacy:v1` (:84-93) before it replaces `kp-pending-bet`: a key of an earlier signed-in
request is archived, never destroyed by a guest's selection, and Privacy §7 (v2026-10-14) already names both keys. The
census becomes: the guest host names no storage key but `PENDING_BET_KEY`, writes only through `saveSheetSelection`, and
with no legacy envelope writes `kp-pending-bet` alone.

**A8 · Point for Ali 4 is built, as its own commit.** *Overrides:* "What does change for a classic visitor" (b)'s "only if
Ali takes Point for Ali 4" and Open point 15's "(Points for Ali 4)": he took it (COMPLIANCE-DECISIONS § "2026-10-14 · The
owner's answers to the open points", item 9). The classic question page's guest panel carries a valid `invite` beside
`ref`, through `doorHrefsFor`, in a commit of its own on the build branch, so the coordinator can release it alone (a §2
row). It is the one change in S10 every classic guest receives: that panel's two hrefs, in its HTML and RSC.
