# S12 — the consistency sweep: build plan (drafted 2026-10-14)

> The working plan for VODACOM-PLAN S12, "Consistency sweep" (`docs/VODACOM-PLAN.md` :4995-5007; the board row :3882;
> the two pre-flip rows S12 owns, :3897 and :3899). Drafted read-only on 2026-10-14 by one planner with six read-only
> researchers: Juu/Chini's code, the words, the console's inks, what leaves the site, NDIYO and "Paid out", and every
> record that defers work to S12. The planner re-read every load-bearing fact below in the files. Nothing was run but
> read-only git and searches. Status lives in `docs/VODACOM-PLAN.md` §0 (a new §0 section for S12, opened by WP0); this
> file is the how. Its Open points are decisions taken under Ali's delegation, each with the overrule he may choose; WP0
> files them as numbered §0h points after the last one on main.
>
> **Base.** Line numbers are at `f830a091c` (live main: the record of `08a8c0472`). Three branches are read by name:
> - `codex/updown-no-odds` `2fd8940e4` — Ali's ruling of 2026-10-14, *"remove odds from up and down market cards … keep
>   up and down only"*. Pushed, not on main when this was drafted; its parent `da19e5a21` is an ancestor of the base, and
>   main has not touched any file it edits since then except `docs/VODACOM-PLAN.md`, in other hunks. It edits the three
>   Up & Down components and the dictionary line S12 corrects. This plan assumes it is live before S12's Juu/Chini
>   packages start (Open point 1); where it moves a line, the line is named both ways.
> - `vodacom-s12-timeleft` `1468d7cca` — S12's Swahili time left, prepared 2026-10-08 on `a042dc658`.
> - `origin/codex/vodacom-s9` `9869dd701` — S9's preparation. Its `S9-PLAN.md` lives there, not on main.
>
> S8 is closing, and S9–S11 are in flight or being planned beside this one. Each edits files S12 edits,
> `src/lib/i18n-dict.ts` above all. WP0 re-reads every citation at S12's real base before any package starts (S7-PLAN
> A24's method).

## Summary

### What S12 is

S12 is the plan's consistency sweep. It covers the places the journey's language and rules must reach that S6–S11 do
not build: Juu/Chini (Up & Down), the console's decision inks, and the words that leave the site (emails, the bell and
push, share pictures, the home-screen manifest, SMS). It also carries the backlog every earlier session deferred here:
the corrections to words players read today (§0h point 3, :2592-2597), the NDIYO spelling, and the "Paid out" figure.

Unlike S6–S11, most of S12 is **not** journey-only. Every package names its kind:
- **CLASSIC** — changes what every player is served now. It ships as its own release, the pattern of the live fixes L2
  and L3 (§0h points 80, 81), with classic parity's differences named, never re-baselined.
- **ADMIN** — classic, but only staff see it.
- **FLAGGED** — journey readers only (STAFF_PREVIEW until the S15 flip). Classic parity must read no difference.
- **FLIP** — built and proven in S12, inert until the rollout is ACTIVE (S15), or prepared for S15's commit.
- **RECORD** — nothing to build: done already, withdrawn by a ruling, or moved. S12 corrects the plan text.

### How Ali's ruling of 2026-10-14 changes S12

The ruling (COMPLIANCE-DECISIONS § "2026-10-14 · Up & Down cards show Up and Down only", on `2fd8940e4`) takes every
multiplier off every Up & Down choice. What it does to S12, item by item:

1. **WITHDRAWN: "the multiplier grammar 'Shinda ≈{mult}× dau' with floor mode" (§5 :4999).** The item was to print the
   journey card's estimate grammar on Juu/Chini's buttons, rounded down (SJ-2, :4164: "Up & Down keeps its floor"). The
   ruling forbids exactly that: *"An Up & Down card's two choices read 'Up' and 'Down' … and nothing else: no
   multiplier … and no note under the buttons about one"*, and *"Do not restore. A multiplier on an Up & Down choice
   needs a new owner ruling. `formatMultiplier` was deleted with its last caller."* Floor mode has nothing left to round.
   S12 builds nothing for this item; it extends the ruling's guard to the journey arm instead (WP9).
2. **CHANGED: "the stake panel in the journey language" (§5 :4997).** The S4 boards S12 builds from draw multiples:
   `s4-11-updown-panel.dc.html` puts "≈1.63×" and "≈1.96×" on the buttons and the old "× hubadilika…" note under them;
   `s4-11-updown-low.dc.html` puts "≈1.46×" in the compact row. Those parts are superseded. The rest of the boards
   stands (the label, the stake box, full-figure chips, the prompt, the low-balance pattern, the round-closed notice).
3. **KEPT, and S12 must not lose it: money at the commit.** The ruling keeps the round page's projected return in
   shillings ("TZS 500 → TZS 634", `projectedReturn`), its qualifier `udEstimateNote`, the receipt's "Projected return"
   row, and the exact payouts after the lock (its item 4). S12's journey confirm panel states the same figure
   (Open point 4) and nothing more.
4. **A DEPENDENCY.** The ruling's release edits `round-stake-panel.tsx` (imports :20-33, the stake row :151-195, the note
   :313-326), `updown-stake-controls.tsx` (:36-41, :45-113, :147-158, the buttons :288-302, the note :358-365),
   `updown-card.tsx` (:1024-1066), `updown-pricing.ts` and `i18n-dict.ts` (`udEstimateNote`, en :1041 / sw :4064 / zh
   :6535 at the base). S12's Juu/Chini packages edit the same files, so they start after it is live (Open point 1).
5. **A WORD THE RULING CARRIES FORWARD WRONG.** Its new Swahili `udEstimateNote` still ends "… **Dau zikifungwa**,
   yanakuwa malipo yako kamili." That is the class-10 agreement error S4-COPY-AUDIT :110 corrects ("Madau yakifungwa").
   With the new subject the right clause is "Madau yakifungwa, yanakuwa malipo yako kamili."; S4-COPY-AUDIT :110's own
   target ("…inakuwa…") no longer fits. The same error stands in the rules it re-dated: Up & Down Rules §2 (sw)
   "Si ahadi hadi dau zitakapofungwa" (`_content-up-down.tsx` :282 at the base). Both go into WP3's ledger; the rules
   sentence changes only with that document's next version.
6. **OPEN ITEMS THE RULING LEFT TO ALI that touch S12:** (a) the pool split on the card ("Juu 75% · 25% Chini") and
   `/live`'s "Up @ 75%" — S12's journey arm keeps the card's split row exactly as it is until he rules (Open point 17);
   (c) a signed-in tap on the board places the bet at once and shows the projected return only on the receipt — S12's
   journey two-way control keeps one-tap betting (Open point 7).
7. **RECORDS.** SJ-2's "Up & Down keeps its floor" (VODACOM-PLAN :4164; INHERIT-MANIFEST :53) and §0g item 11's
   "floor-rounded × multiples" (:3561-3562) are moot. `2fd8940e4` annotates :3561 only; WP0 annotates §5 :4999 and SJ-2
   with pointers (the manifest stays frozen but for rulings: one pointer line, no edit to the ruling's text).

### The inventory

| # | Item | Source | State at the base | Kind | Package |
|---|---|---|---|---|---|
| 1 | Juu/Chini's stake panel in the journey language | §5 :4997 | Not built: no journey Up & Down file (S8-PLAN :100 leaves it here) | FLAGGED | WP8, WP9 |
| 2 | Juu/Chini low balance → deposit → back | §5 :4998 | A bare `/wallet/deposit?from=low-balance` link (round-stake-panel.tsx:301; updown-stake-controls.tsx:320); the deposit returns to `/wallet` (wallet/deposit/actions.ts:158) | FLAGGED; its "back" needs S9 | WP10 |
| 3 | A closed round goes to the next round, side and stake kept | §5 :4998 | The hop carries `?from=` only (updown-handover.tsx:177, :231) and by rule never a typed stake (:32-39) | FLAGGED | WP11 |
| 4 | The multiplier grammar with floor mode | §5 :4999 | Withdrawn by the 2026-10-14 ruling | RECORD (+ guard) | WP0, WP9 |
| 5 | `round-stake-panel.tsx:249` `text-no-300` → a state token | §5 :5000 | Done: R5-I `42a2003d6` (2026-10-09); the range line is `text-danger-fg` at :259, pinned by `test:visual-pass-r5i` :295-296 | RECORD | WP0 |
| 6 | Console Approve/Reject off the betting inks | §5 :5001; §2 :3899 | 2 literal `btn-no` Rejects and 8 more decision sites | ADMIN | WP6 |
| 7 | Emails and notifications use short titles | §5 :5003 | Every template and emitter reads the full title | FLIP | WP12 |
| 8 | Share pictures: the short title, no multiplier | §5 :5004 | The card prints `m.titleEn` (api/og/market/[id]/route.tsx:170); no multiple today, and no guard says so | FLIP, with a classic guard now | WP13 |
| 9 | The manifest: Maswali and Tiketi shortcuts, the name, a screenshot after the flip | §5 :5005 | Markets / Wallet / Deposit; the name carries the retired slogan | FLIP (S15 applies: §0h point 17) | WP14 |
| 10 | SMS: no titles today, and GSM-7 for any | §5 :5006 | True: no SMS carries a title; `smsCodingFor` chooses the coding | guard | WP14 |
| 11 | NDIYO → NDIO | §5 :5007; §2 :3897; SJ-19 :4262; §3.9 :4782 | 11 misspellings, not 7, and no guard | CLASSIC | WP2 |
| 12 | "Paid out to players" | §5 :5007; §4 :4855 | Still sums house-marked payouts; no ruling on file | CLASSIC, after Ali | WP7 |
| 13 | Corrections to words players read today | §0h point 3; S4-COPY-AUDIT :93-149, :308-313 | Open (one shipped separately) | CLASSIC | WP3, WP4 |
| 14 | The reviewers' live-word list | S6-VISUAL-PASS-STATE appendix G :772-827, and the records it summarises | About 50 entries, nearly all open | CLASSIC; a few JOURNEY or ADMIN; some need Ali | WP5 |
| 15 | A round bet in the address (`udr_…`) | S8-PLAN :827 | Parsed (pending-bet.ts:42, :57), read nowhere | FLAGGED | WP10 |
| 16 | Round returns through S9 | S9-PLAN WP7 (on its branch) | S9 keeps them; S12 reads them | FLAGGED | WP10 |
| 17 | Dates in the reader's language ("Finding for S12") | §0g :3514-3517 | Player surfaces done in `8e0f1e69` (§0h point 64(b)); a residue | CLASSIC (the residue) | WP5 |
| 18 | The classic dial's two gaps | S8-PLAN A23 :2213-2228 | Fixed live: L3 `c604343b`, L2 `9c167bef` | RECORD | WP0 |
| 19 | The loss-limit refusal | S4-COPY-AUDIT :125-130 | Shipped live `e5b5c9daa` | RECORD | — |
| 20 | Chinese How-to "赢家平分奖池" (false) | S4-COPY-AUDIT :140 | Still in `journey.howStep3Body` (zh, i18n-dict.ts :8095) | JOURNEY | WP8 |

### Releases, and what changes for a classic visitor

S12 ships in five releases. Each changes only what it names.

- **W — words (CLASSIC): WP2, WP3, WP4 and WP5's ready part, proven at one tip** (§0h point 71's rule).
  - JS: the dictionary chunk on every page (sw values; a few en/zh).
  - HTML wherever a corrected key renders, for example:
    - the question page's chart title and lean label, and its KPI word (both shells);
    - `/help`'s first answer;
    - the Up & Down board and round page ("Dau lako", "Bonyeza…", "madau");
    - refusal sentences, the classic dial's labels, the deposit page's notices;
    - the Terms §4 and the YES/NO rules §1 in Swahili, each with a new version line.
  - Parity v5 names every difference it reads (WP1). The cells it does not capture are read as tiles.
- **A — the console (ADMIN): WP6.** Admin HTML and its chunk only.
- **P — "Paid out" (CLASSIC, only if Ali chooses a change): WP7.** Under filtering, `/`'s proof figure drops by the
  house's winnings; under dropping, the slot leaves the landing.
- **J — Juu/Chini (FLAGGED): WP8–WP11.**
  - HTML for a classic reader: none. Each page gains one same-slot ternary whose else arm is today's element, not
    re-indented.
  - JS:
    - the dictionary's new `journey.*` keys on every page, as in S6–S8;
    - the board card and the stake panel each gain one `journey` prop and a `next/dynamic` loader stub. The journey
      arm's own code is a separate chunk, never in a classic first load (§0h point 20's rule, `shell-lazy.tsx`'s
      pattern).
  - CSS: the journey arm's rules, matching nothing on a classic page.
  - Proof: parity v5 reads 0 differences in the Up & Down cells; `qa:first-load` and `qa:served-skeleton --main`
    show no journey string in a classic `/updown` first load.
- **F — the flip's pieces (FLIP): WP12–WP14.**
  - Server code that switches on at ACTIVE (comms and share titles), a prepared manifest patch, and guards.
  - Served bytes now: none.

### What S12 leaves to later sessions, and why

- **S15:**
  - turning the comms and share titles on (ACTIVE);
  - applying the manifest patch, with `sw.js`'s `CACHE_NAME` bump (:5030); the screenshot is re-captured after the flip;
  - the dictionary convergence (:5028): S8's journey copies of the corrected classic words (Open point 28);
  - the Tiketi rename (§3, :4035-4091), and the Maswali sweep of "soko" in classic sentences (§3.9 :4783-4784; Open
    point 33);
  - the classic Sell button's words (Open point 19).
- **S11:**
  - the tagline the manifest's name will carry (SJ-20);
  - the flip-time Terms version (§3.9 :4790), if Ali keeps the Terms' NDIYO for it (Open point 21);
  - the static brand share images (`public/og/*`) with the tagline. S12's share work is the dynamic per-market card.
- **S9:** the journey deposit screen, the waiting page and the return. S12's "back" half reads S9's round return, which
  S9-PLAN WP7 promises not to drop.
- **S10:** guests. Juu/Chini's guest arms stay as they are (Open point 16).
- **Ali:**
  - "Paid out" (WP7);
  - the pool split on Up & Down cards (the ruling's item (a));
  - the one-name choices and the responsible-gambling sentences in WP5;
  - the two defects found while planning (below).

### Order (17 packages; each green on its own)

1. **WP0:** the start line.
2. **WP1:** parity v5, Up & Down's classic bodies. Release W needs it to name its Up & Down differences, and release J
   to prove none.
3. **Release W**, at one tip:
   - WP2: NDIO, and its guard;
   - WP3: the approved corrections;
   - WP4: the time left;
   - WP5: the reviewers' list, its ready part.
4. **Release A:** WP6 (the console's inks), in parallel with W; disjoint files.
5. **Release P:** WP7 ("Paid out"), once Ali has ruled; any time.
6. **Release J:**
   - WP8: Juu/Chini's words;
   - WP9: the stake panel;
   - WP10: low balance → deposit → back;
   - WP11: the closed round → the next round.
7. **Release F:**
   - WP12: comms titles at the flip;
   - WP13: share pictures;
   - WP14: the manifest patch and the SMS guard.
8. **WP15:** the drives and the tiles.
9. **WP16:** proof, records, merge, deploy.

WP3 must land before WP8 and WP9, because the journey arm reads the corrected classic keys ("Dau lako", "Bonyeza…")
instead of copying them.

### Corrections to the maps, verified in the files

1. **§5 :5000's `text-no-300` item is done.** R5-I (`42a2003d6`, 2026-10-09) moved the out-of-range line to
   `text-danger-fg`. At the base line 249 is `<Input`; the line is :259, pinned by `test:visual-pass-r5i` :295-296.
2. **§5 :4999's multiplier grammar is withdrawn** by the 2026-10-14 ruling (above). Its floor mode is moot: SJ-2 :4164,
   INHERIT-MANIFEST :53.
3. **§0g :3561-3562 ("floor-rounded × multiples") is superseded.** `2fd8940e4` annotates it in place.
4. **§2 :3897 says "the 7 Swahili strings".** The count is 11:
   - eight dictionary keys, one of them read nowhere (`market.probChartAria`);
   - two binding legal texts, the Terms §4 (terms/page.tsx:351) and the YES/NO rules §1 (_content-yes-no.tsx:259);
   - one console placeholder (admin/markets/new/wizard.tsx:321).

   The "seven" is the 2026-09-16 census (MOBILE-VISUAL-PLAN.md:2741-2745). It missed `market.leansYes` (found later,
   S6-READ-TRIAGE :134), the legal texts and the placeholder.
5. **§3.9 :4782's "with a `test:labels` assertion" does not exist.** `scripts/label-lexicon.test.mts` names NDIYO only
   in comments (:88, :299), and `test:rules-copy` §4a (:157-158) only checks that "NDIO" appears somewhere.
6. **§4 :4855's `platform-stats.ts:186` has moved.** The sum is `readPaidOutTzs` at :216-218, read at :200. LANDING-TEN
   :118-131's `prisma-dal.ts:1870-1877` is now :2712-2718, and its `schema.prisma:660-662` is now :692-697.
7. **§5 :5005 puts "a screenshot re-captured after the flip" in S12, which comes before the flip.** §0h point 17 (:2638)
   moves the shortcuts to launch ("that file is the same for everyone"), §5 S15 has "`sw.js` `CACHE_NAME` bump +
   manifest" (:5030), and S6-PLAN.md:1931 says "S12/S15". S12 prepares; S15 applies (WP14).
8. **§2 (:3890-3891) calls its table "the only player-visible changes before the flip".** It does not list S12's
   corrections to live words, which §0h point 3, :4007 and S8-PLAN Open point 37 schedule for S12. WP0 adds the rows.
9. **§1 S12's done-when, "short titles are used outside the site", cannot hold before the flip.** A comms or share
   title is not on §2's list. WP0 restates the done-when (Open point 2).
10. **S4-COPY-AUDIT :110's target for `udEstimateNote` no longer fits** the sentence `2fd8940e4` wrote. The class-10
    error survives in the new Swahili (above, item 5).
11. **S4-COPY-AUDIT :140 flags `howStep3Body`'s 赢家平分奖池 as false, but review 6 approved it (:373).** It shipped
    in `journey.howStep3Body` (zh, i18n-dict.ts :8095).
12. **S8-PLAN A23 (:2223) says "§0k files both for S12".** Both gaps were fixed live first: L3 `c604343b` and L2
    `9c167bef` (§0h points 80, 81; S8-PLAN :2270). A23 is not annotated.
13. **"Month names stay English until S12"** (S7-PLAN :1464, :2247; §0g :3514-3517) is superseded for player surfaces
    by `8e0f1e69` (§0h point 64(b), :3205-3207). The `en-GB` formatters in `lib/utils.ts` (:300-387) remain for admin
    and server English, the agent dashboard, `/profile/invite`, `/updown/history`'s own formatter (page.tsx:60-61) and
    the email rows' "Sept" (WP5).
14. **S6-VISUAL-PASS-STATE :590-591 says the S12 list is "about 14" fixes.** Its appendix G (:772-827) holds about 50.
15. **The help subtitle was lengthened, then asked to be shortened.** Review 2 lengthened it (S4-COPY-AUDIT :138), and
    the journey built it that way; S6-VISUAL-PASS-STATE :774-775 asks S12 to shorten it again (Point for Ali 5).
16. **§0c :3859-3860 says Up & Down rounds "get a deterministic short title from `roundTitle`".** The code gives them
    none (market-service.ts:803-806), which §0d follows. Round notices keep their clamped round titles (WP12).
17. **The ripple map's card row (:4834) expects `test:share-preview` to assert "no multiplier".** It does not (WP13).
18. **The §2 row :3899 ("Approve/Reject from `btn-no` to `btn-danger`") is out of date.**
    - The two KYC buttons it was written against were deleted with the KYC typed-only change (`16e0be5ea`).
    - The `btn-no` sites today are two Rejects.
    - The same defect stands under other spellings, `variant="yes"|"no"` and hand-typed tints (WP6).
19. **"Paid out" is called a "defect" (§5 :5007; §4 :4855), but S6 left it as a ruling.**
    - S6-VISUAL-PASS-STATE :617-619: "What a public money figure counts is a ruling … Unchanged".
    - Put to Ali as appendix F question 9 (:508), default "keep". No answer is on file.

### Found while planning: not S12 items, for Ali (Points for Ali 3)

Both were found by reading the code, and neither has been driven yet.

- **F1 · Up & Down tells a player with a bonus balance "not enough balance".**
  - The board's balance is `wallet.balance` alone (`walletBalanceOf`, updown-board.ts:650-659), and the buttons are
    disabled on it (use-quick-bet.ts:251).
  - `buyPosition` pays from balance plus bonus (market-service.ts:1596-1610), and so do the classic dial and
    `shortfallPlan` (shortfall.ts:21).
  - A player whose bonus covers the stake is refused on screen for a bet the server would take.
  - The journey arm uses the spendable figure from the start (WP10). The classic fix is one read, a live fix in its own
    release if Ali wants it now.
- **F2 · A round in its lock window is missing from a fresh load of the board.**
  - `getBoard` keeps only `open` or `confirming` rounds (updown-board.ts:816-818), and `roundState` returns `locked`
    between selection close and the boundary (:356).
  - So a server render of `/updown` in that window (a fresh load, or the 20-second poll) shows no current round. The
    player who has just bet cannot see their round on the board until it is confirming.
  - The filter is from `df8923608` (2026-07-24); the `locked` state from `4645cad23` (2026-08-04).
  - Drive it first (a local chain with `/api/dev-test/updown-seed`, a load at lock − 5 s). Then fix it live in its own
    release, the board keeping the locked round as the current one.

---

## Juu/Chini in the journey's language: what S12 builds

The S4 boards are the authority for *what* happens (`s4-canvas/s4-11-updown-panel.dc.html`, `-low`, `-round-closed`),
minus the multiples the ruling removed. The kit decides *how it looks*, as everywhere (R5). Every row is the journey arm
only; the classic arm is today's (after `2fd8940e4`).

| Element | Today (classic) | Journey arm | Authority |
|---|---|---|---|
| Stake label | "Kiasi" (`market.udStake`, sw :4098) | The same key, corrected for everyone by WP3 to "Dau lako" | S4-COPY-AUDIT :139; the panel board |
| Stake entry | Chips "500 · 1K · 2.5K · 5K" (`stakeChipLabel`, stake-math.ts:23-27), with a "+ Maalum" toggle that reveals a field | An always-visible kit `Input` (`grouped`, TZS prefix: S8 WP5's) and four full-figure chips (`formatNumber`, as bet-sheet.tsx:98) from the same `quickStakes(min, max)`. A chip sets the stake | The panel board; SJ-10's chip rule; Open point 8 |
| Prompt | "Gusa Juu au Chini kuweka dau · TZS 500" (`udTapToBet`, sw :4127) | The same key, corrected for everyone by WP3 to "Bonyeza…" | S4-COPY-AUDIT :139 |
| Side buttons | Juu / Chini, arrow and word (the multiples left with `2fd8940e4`) | Unchanged: the word and the arrow only. One tap places the bet at the chosen stake, as today | The ruling; Open point 7 |
| Pool | The card's split row | Unchanged | The ruling's item (a); Open point 17 |
| Chosen side (round page, `?side=`) | The eyebrow "Chaguo lako", a chip, and "Imefungwa kutoka chaguo lako…" (:143-150) | The chip "Umechagua JUU" (`journey.sheetChosen` with the UPDOWN side word, side-label.ts:81) | The low board |
| Projection (round page, `?side=`) | "TZS 500 → TZS 634", muted, with the ⓘ qualifier under the panel | "Ukishinda ≈ TZS 634" (`journey.estimateCompact`), muted, the same `projectedReturn` figure, the same qualifier; no multiple | The ruling's item 4; Open point 4 |
| Commit (round page, `?side=`) | Gold "Thibitisha Juu · TZS 500" (:272-291) | Gold "Weka dau · TZS 500" (`journey.placeCta`), through the same `useUpDownQuickBet` → `buyPositionAction` | SJ-10; Open point 6 |
| Not enough balance | One info line, "Salio halitoshi kwa dau hili. Weka pesa", linked to `/wallet/deposit?from=low-balance` | The sheet's low block, in order: the stake in `attention`; the compact row "Ukishinda ≈ TZS x" (locked panel only); the callout `lowTitle` / `lowBody`; `lowChoose` when there are two options; the gilt two-line "Weka pesa TZS {D}" with the wallet names; "Tumia TZS {x} badala yake", which sets the stake; the commit disabled and described | The low board; §3.4; SJ-11, SJ-12; Open points 5, 11, 12 |
| Spendable | `wallet.balance` (F1) | Balance plus bonus (`viewerFacts`), the bet path's figure | shortfall.ts:21 |
| A round that closed while the player paid | Whatever state the round is in. No notice; no way forward that keeps the bet | "Raundi hii imefungwa", the money line when a deposit landed, and "Nenda kwenye raundi inayofuata", carrying the side and the stake | The round-closed board; Open points 13, 14 |
| Receipt | `UpDownBetReceiptModal`, with its "Projected return" row | Unchanged | The ruling's item 4; Open point 15 |
| The holder's heading on the round page | "Nafasi zako" (`market.udPositionsOnRound`, sw :4137; page.tsx:653) | "Tiketi zako" (`journey.ticketsHere`, sw :5712) | S6-VISUAL-PASS-STATE :807-808 |

What does not change, by rule:
- **The money path.** Every bet still goes through `useUpDownQuickBet` and `buyPositionAction`. The journey arm only
  reshapes the presentation (round-stake-panel.tsx:9-11's rule). Exactly-once stays the hook's and the server's: a fresh
  idempotency key per tap (use-quick-bet.ts:72, :332-343), the server's landed-key answer (L2) and the redirect rule
  (L3).
- **E-166's automatic hop.** It keeps dropping any typed stake (updown-handover.tsx:32-39). Only the player's own tap on
  "Nenda kwenye raundi inayofuata" carries a stake (Open point 13).
- **No multiple anywhere.** The ruling's guard is extended to the journey arm's renders (WP9).

---

## Work packages

### WP0 — The start line: S8 closed, the ruling live, the records (S; depends on S8's close and `2fd8940e4` on main)

**Goal.** Start S12 on a closed S8 with Ali's ruling live, every citation re-read, today's reds named, and the plan text
corrected before anyone builds from it.

**Files.**
- `docs/VODACOM-PLAN.md`:
  - §0: RESUME AT, and a new §0 section for S12. Use the next free letter: S6 was §0i, S7 §0j and S8 §0k, and S9–S11
    may open theirs first.
  - §1: the S12 row to 🔨, with this file's link and Open point 2's done-when.
  - §2: new rows for release W's corrections, release P (if any) and F1 and F2 (if Ali has them fixed live).
  - §5 S12 (:4995-5007): annotated, never rewritten (corrections 1, 2, 7 and 9).
  - SJ-2 (:4164) and §0c (:3859-3860): annotated.
  - §0h: one point per Open point below, numbered after the last on main (82 at this base).
- `docs/design-system/v5-2026-09-29-simplified-journey/INHERIT-MANIFEST.md` SJ-2 (:53): one pointer to the 2026-10-14
  ruling. The file is frozen except for rulings.
- `docs/design-system/v5-2026-09-29-simplified-journey/s4-canvas/README.md`: a dated note, in the form of its 2026-10-12
  note. The multiples and the "×" note on `s4-11-updown-panel` and `-low` are superseded; the boards are redrawn by WP9
  in the commit that builds them (the README's own rule).
- This file: an amendment if the re-read changes a package.

**Steps.**
1. **Check the preconditions on main; never assume them** (Open point 1):
   - S8 is closed and live, its close record in §0k;
   - `2fd8940e4` is merged and read back on production;
   - S9's state is recorded (live, or the date its return is expected). WP10's "back" half waits for it.
   Branch from origin/main in an SSD worktree whose `git status --porcelain -- src scripts docs package.json` is empty.
   Stage by path, and read `git diff --cached --stat` before every commit.
2. **Re-derive today's reds** (the session law; on the resource-constrained machine, under the heavy-job lock):
   - `npm run test:all` with the database suites;
   - `npm run test:red-anchors`;
   - the in-process twins S12 touches: `red:labels`, `red:updown-pricing`, `red:share-preview`, `red:pending-bet`,
     `red:shortfall`, `red:journey-sheet`, `red:journey-shell`, `red:simple-journey-flag`, `red:feedback-law`,
     `red:time-left`.
   Record every red in the S12 section by its full label, read against S8's close record.
3. **Re-read every citation** in this file at the base. Record what moved, changed or is gone; anything that changes a
   package becomes an amendment here.
4. **Ask Ali the questions under "Points for Ali"**, and record his answers as §0h points. WP5's choices and WP7 wait for
   them.
5. **The docs commit**, one, rebased onto main last.

**Gates.** `npm run test:docs`; `npm run test:vodacom-plan` (the S12 row 🔨, and no ✅ without a commit).

**Served bytes for a classic viewer.** None.

**Done when.**
- The tree is clean at the base, and today's reds are named by label.
- Every citation is re-read, and every change is an amendment.
- The records above are amended and the §0h points are filed.

### WP1 — Parity v5: Up & Down's classic bodies (M; depends on WP0)

**Goal.** Make "a classic reader is served what they were" provable on the two pages S12 re-lays. Parity v4 never
captures `/updown` or `/updown/<round>`: its lists are `ROUTES` (:495), `SELL_PLACES` (:509) and `BOOK_ROUTES` (:524),
at VERSION 4 (:484). Release W also needs it to name its Up & Down word changes.

**Files.**
- `scripts/qa-classic-shell-parity.mjs`: VERSION 5, an UPDOWN phase, and the trace's parts.
- `docs/VODACOM-PLAN.md`: the S12 section (the baseline file and its base).

**Steps.**
1. **VERSION 4 → 5.** `--compare` then refuses every v4 file, which is intended. Record S8's last v4 compare first.
2. **The UPDOWN phase, after the QUESTION phase,** through doors that already exist (no new dev-test route,
   `test:cert-devroutes`):
   - `/api/dev-test/updown-seed` with the default `mock` feed, whose single constant price keeps the price hero stable,
     for the open cells;
   - `feedProvider: "mock-bars"` and `/api/dev-test/updown-advance` for the decided cells.
   The cells:
   - the board signed out and signed in;
   - a round page signed out, signed in with no side, and with `?side=UP`;
   - a reader with no money (a fresh registered player at TZS 0), for the classic insufficient line;
   - a locked round, a settled round with its handover bar, and a void round.
3. **Capture per cell** (guest and player; en and sw; 360 and 1280): `<main>`'s markup, boxes and computed styles. The
   card's controls (`data-testid="updown-stake-panel"` and the card's control block), the stake panel and the handover
   bar are fields of their own, so a difference names its region.
4. **The normalisers.**
   - Already normalised: round ids (`udr_`, :237) and the match track (:230).
   - The countdowns and the price hero's figures: normalise them only after the null pair below proves them noisy.
5. **The trace sees S12's names.** `JOURNEY_CLASS_PARTS` gains the journey arm's class stem (WP9 picks one, for example
   `kp-jud`), and `RAW_TRACE` gains its data attribute.
6. **`--prove-red` gains plants**, each reported where it is planted and nowhere else:
   - a class changed in the classic stake panel (that field only);
   - a journey-arm element in a classic round page (a trace);
   - the journey's chip label ("1,000") in a classic card (the card's field).
7. **Calibrate, one server at a time:**
   - `--prove-red` green; commit WP1;
   - capture `parity-v5-<sha8>.json` at WP1's commit on a fresh in-memory server;
   - a null `--compare` on a second fresh server exits 0.
   Re-capture after any rebase.

**Gates.** `npm run qa:classic-shell-parity` in its three modes; `npm run test:orphans`; `npm run test:docs`.

**Served bytes for a classic viewer.** None (scripts only).

**Done when.** v5's `--prove-red` catches every plant, and the baseline at WP1's commit and a null compare on a fresh
server agree.

### WP2 — NDIO everywhere, and the guard that keeps it (S; depends on WP0) — CLASSIC, release W

**Goal.** The pre-flip row (§2 :3897): the side word is "NDIO" on every surface, and a guard keeps it that way.

**The eleven misspellings.**

| # | Where (base) | Today (sw) | Rendered by | Who reads it |
|---|---|---|---|---|
| 1 | `common.howItWorksBody` :3296 | "Chagua NDIYO au HAPANA. …" | market-card.tsx:246 (the How-it-works dialog) | Classic |
| 2 | `market.probOverTime` :4167 | "Uwezekano wa NDIYO kwa muda" | chart-toggle.tsx:87, :110 | Both shells |
| 3 | `market.probChartAria` :4169 | "…NDIYO kwa muda, sasa asilimia {pct}" | Nothing | No one: correct it, do not delete it |
| 4 | `market.leansYes` :4171 | "inaelekea ndiyo" (shown in capitals beside "NDIO 67%") | brand.tsx:369 (TippingBar), via the question page and `/live`'s featured contest | Both shells |
| 5 | `market.backYesAria` :4193 | "Unga mkono NDIYO kwa {pct}%" | side-picker.tsx:151 | Classic |
| 6 | `market.backYesAriaNoPrice` :4194 | "Unga mkono NDIYO" | side-picker.tsx:151 | Classic |
| 7 | `help.faq1a` :4982 | "… — NDIYO na HAPANA pamoja. …" | help/page.tsx:154 | Both shells |
| 8 | `help.faq1aLoser` :4983 | the same | help/page.tsx:153 (the live fee model) | Both shells |
| 9 | Terms §4, terms/page.tsx:351 (binding) | "Dau zote — NDIYO na HAPANA — zinakusanywa …" | `/legal/terms` | Both shells |
| 10 | YES/NO rules §1, _content-yes-no.tsx:259 (binding) | "… kila soko la NDIYO/HAPANA …" | `/legal/rules/yes-no` | Both shells |
| 11 | admin/markets/new/wizard.tsx:321 | placeholder "Inatatuliwa NDIYO iwapo …" | The officer's Swahili criterion field | Admin |

Six other uses of "ndiyo" are correct Swahili ("it is / that's") and stay:
- `contTodayLead`, `contSoonLead` and `contWeekLead` (:3875-3877);
- `criterionEnglishBinding` (:3919), `thinUpsideNote` (:4175) and `receiptsHere` (:5289);
- the officer alert at notification-service.ts:1974.

`help.faq6a`'s opening "Ndiyo —" is the answer "Yes" (Open point 29).

**Steps.**
1. **The dictionary (rows 1–8).** Correct the value only; touch no key name and no en or zh value. Rows 7–8 also carry
   WP3's class-10 correction: edit each line once, in WP3's words.
2. **The Terms (row 9).** In the same commit:
   - fix the side word and the sentence's class-10 agreement ("Madau yote — NDIO na HAPANA — yanakusanywa …"; the
     terms' other class-10 lines :334, :355, :361 and :403 with it);
   - bump `TERMS_VERSION` and `TERMS_TEXT_SHA` (terms-version.ts:57, :73) together, as `test:terms-binding` requires;
   - add a COMPLIANCE-DECISIONS entry: "the side word spelt NDIO; no right changed; no notice; no re-acceptance". A bump
     forces none (terms-version.ts:52-53).
   If Ali keeps the Terms for S11's flip-time version (Open point 21), row 9 waits, and the guard's legal scan allows
   this one line by name until then.
3. **The YES/NO rules (row 10).** Read the side words as the zh paragraph does (`{w.zh.yes}/{w.zh.no}`, :428):
   `{w.sw.yes}/{w.sw.no}`. That is `_content-yes-no.tsx`'s own header rule ("Both are now one lookup", :45-54), which
   the sw paragraph missed. Move the version line (rules/yes-no/page.tsx:52-56) in the same commit, and fix the class-10
   lines :315 and :378 with it (WP3's ledger).
4. **The placeholder (row 11),** and in the same commit the two QA drives that find the field by it:
   - `qa:criterion-publish` (criterion-publish-e2e.mjs:124, :132);
   - `qa:criterion-wizard` (criterion-wizard-visual.mjs:156, :196, :219).
   The fixture criterion texts in six scripts are officer-authored data, not product words, and stay.
5. **The guard: `test:labels` gains a section, with `red:labels` cases.**
   - **What it scans:** case-insensitive "ndiyo" as a side word in every sw dictionary value and in every file under
     `src/app/legal/**`.
   - **The allowlist:** by key or file:line, the six correct uses above, plus `faq6a` while it stands.
   - **The red cases:**
     - "NDIYO" planted in a sw value, caught;
     - "ndiyo" planted in a legal file, caught;
     - a seventh correct-looking use outside the allowlist, caught;
     - a green control.
6. **Stale readers, corrected in the same commit:**
   - `test:visual-pass-r9b` 3.7/3.8 (:448): re-measure the chart title's wrap;
   - `qa:outcome` (outcome-parity.mjs:32, :35), which only recognises a Swahili YES verdict as NDIYO;
   - the code comments that quote the misspelling (chart-toggle.tsx:68, :84-86; _content-yes-no.tsx:52;
     legal/rules/page.tsx:56; legal/rules/yes-no/page.tsx:26; hero-intro.tsx:61; side-label.ts:111).
7. **Not code:**
   - Stored criterion texts in the database ("Itaamuliwa NDIYO iwapo …") are officers' data and are not rewritten.
   - The AI generator's Swahili rules (ai-provider-claude.ts:250) gain "the side word is NDIO", so new criteria are
     spelt right. That changes generated text only (Open point 29).

**Gates.**
- `test:labels` and `red:labels` (new section); `test:i18n`; `test:rules-copy` (§4).
- `test:terms-binding`, if row 9 moves.
- `test:house-bot-disclosure`: red by construction until main, recorded, not fixed (S8-PLAN :1280).
- `test:visual-pass-r9b`; `test:kyc-copy-truth` and `test:withdraw-email-gate`, which read the legal tree.
- `qa:criterion-publish` and `qa:criterion-wizard`.
- Tiles (sw; 320/360/390/1280): the question page's chart and lean label, `/help`'s first answer, the classic card's
  How-it-works dialog, `/legal/terms` §4 and `/legal/rules/yes-no` §1.

**Served bytes for a classic viewer.**
- The sw dictionary chunk.
- The HTML of the question page, `/help` and the two legal pages, in Swahili.
- Parity v5 names its question cells' differences (the chart title, the lean label).

**Done when.**
- No side word in sw is spelt NDIYO, and the guard and its red cases hold.
- The tiles have been read.
- The legal versions have moved with their records.

### WP3 — The approved corrections: review 2, the twelve "madau", the typo (M; depends on WP0) — CLASSIC, release W

**Goal.** Ship what review 2 approved for words players read today (S4-COPY-AUDIT :93-149, :308-313; §0h point 3). Each
line is in the word ledger at the end of this file, with its key, its lines, its readers and its pins.

**Steps.**
1. **Apply the ledger's rows marked WP3.** They correct sw values only; no row changes an en or zh value.
   - A row that only renames "soko" to "swali" waits for S15's Maswali sweep (§3.9 :4783-4784), so a classic screen
     never says both words (Open point 33). Those rows are `market.hedgeAddBody`, `common.marketClosed`, the three
     other "Soko limefungwa" lines and `common.marketStoppedPredictions`.
   - A row marked "after review 9" is the same defect found where review 2 did not look. It ships once review 9 has
     signed its words.
2. **The rows that are not a value swap:**
   - **`market.opened` → "Imewekwa {date}".** The key is drawn as `{opened} {date}` (position-card.tsx:159;
     markets/[id]/page.tsx:1095), and `journey-holder.tsx:40` reads it too. Keep the composition and change the word
     only ("Imewekwa"), so the en and zh need no placeholder (`test:i18n`'s placeholder parity).
   - **`market.youAlreadyHold`** is drawn as `{youAlreadyHold} {side} {here}` (page.tsx:767). "Tayari una dau la" +
     side + "hapa" reads right in the same three pieces: change the first piece only.
   - **`error.errDepositLimit`.** The journey copy carries `{amount}` (`journey.sheetDepositLimit`, sw :5692), which the
     classic path cannot fill (failure-reasons.ts:273, :713-740). Take the corrected sentence **without** the amount,
     or the player reads a literal "{amount}" and `failure-reasons.test` :153-160 goes red.
   - **`common.depositStarted`** ("Amana imeanza" → "Malipo yameanza") would give a deposit the withdrawal's eyebrow
     (`common.payoutStarted` is already "Malipo yameanza", sw :3465). It stays classic; the journey's own deposit
     screens (S9) say it (Open point 29).
   - **The cash-out strip** ("Toka bila gharama · Hakuna ada", "pesa yote") is a layout, not a value swap. It stays
     classic until the flip (Open point 19).
   - **`market.resolves` ("Inaisha") has no reader since R4-I** (`5cee85b0d`). Leave it: control 12.1′ of
     `test:visual-pass-r4i` (:796-798) pins it.
3. **The same defect where the list did not look** (ledger rows marked "also"), corrected in the same commit once review
   9 has signed them:
   - "Lipo": `dialog.payoutLabel` and `toast.payoutAtResolution`;
   - the hedge body's second class-10 clause;
   - "dau likifungwa": `market.payoutAtClose`, `dialog.poolSharePayout`, the tail of `primer.card3Body`;
   - "hayajaaathiriwa": `error.walletSafe`.
4. **`udEstimateNote`** takes "Madau yakifungwa, yanakuwa malipo yako kamili." on `2fd8940e4`'s sentence. The Up & Down
   Rules §2's "dau zitakapofungwa" waits for that document's next version and is recorded in the ledger.
5. **Responsible-gambling sentences** (`failSessionLimit`) change only on Ali's yes (Point for Ali 4). Until then their
   rows stay out.
6. **Re-pin in the open** every literal pin the ledger names, each with its reason:
   - `failure-reasons.test` §4.2 reads the en body ("has NOT moved") and stays green, because the en is not reworded;
   - `test:visual-pass-r4i`, `r7a`, `r9b` and `r10` where a measured length moves;
   - `test:updown-pricing` §6.7 (the qualifier in three languages, as `2fd8940e4` wrote it);
   - `qa:classic-shell-parity`'s sw literals.
7. **The S4 audit.** Mark each line "shipped `<sha>`". Rewrite :110's target for the new sentence.

**Gates.**
- `test:i18n`, `test:failure-reasons`, `test:rate-copy`, `test:cert-f1` (payout-honesty.test.mts) and
  `test:updown-pricing`.
- `test:visual-pass-r4i`, `r6a`, `r7a`, `r9b` and `r10`; `test:sell-grace-truth` (§5's measured rows).
- `test:house-bot-disclosure`: red by construction until main.
- Parity v5's named entries.
- Tiles (sw; 320/360/390/1280):
  - the classic dial's estimate box and receipt;
  - `/positions`' card;
  - the question page's holder block and KPIs;
  - `/updown/history`;
  - the Up & Down receipt;
  - `/fairness`;
  - the deposit and withdraw notices;
  - every refusal the drive can raise (`qa:auth-loss-mid-bet`'s and `qa:bet-sheet`'s fixtures cover most).

**Served bytes for a classic viewer.**
- The dictionary chunk.
- HTML where a key renders.
- Parity v5's named entries (the question page's KPI and holder lines; the Up & Down cells' "madau").

**Done when.**
- Every WP3 row in the ledger is shipped or has a recorded reason.
- Every pin is re-pinned in the open.
- Every tile has been read.

### WP4 — The time left in Swahili: land the prepared branch (S; depends on WP0) — CLASSIC, release W

**Goal.** Ship `1468d7cca` ("masaa 1 yamebaki" → "saa 1 imebaki"; the singular for one; S4-COPY-AUDIT :142-149).

**Steps.**
1. **Rebase `1468d7cca` onto S12's base.** `git apply --check` applies every hunk at f830a091c without a conflict, at
   these offsets:
   - live/page.tsx +16; markets/[id]/page.tsx +214; markets/page.tsx +19;
   - landing-hero.tsx −91 and −77;
   - i18n-dict.ts +1 (en), +210 (sw), +329 (zh).
   time-left.ts and its two scripts are byte-identical to the branch's base.
2. **Confirm the caller census still holds:** the five `timeLeftLabel(` calls (live/page.tsx:76, markets/page.tsx:350,
   markets/[id]/page.tsx:1323, landing-hero.tsx:182 and :328). No journey file calls it.
3. **Widen parity's time-left normaliser** (qa-classic-shell-parity.mjs:253-257, added after the branch, `cecd03ae0`).
   - Make it read "saa N zimebaki" and "… 1 imebaki".
   - Map each noun to its own token ("~ siku", "~ saa", "~ dakika") instead of one "~ zimebaki", so the masaa → saa
     change is a NAMED difference (`time-left-saa-sw`) rather than hidden.
   - Add a plant for each of the three nouns.

**Gates.**
- `test:time-left` (86 checks on the branch) and `red:time-left`; `test:i18n`.
- `test:landing-contract`, `test:hero-contract` and `test:featured-card`.
- Parity v5, with the named difference.
- Tiles (sw; 320/360/390/1280): a classic card on `/live`, `/markets` and the question page's similar rail at one hour,
  one day and one minute.

**Served bytes for a classic viewer.** The dictionary chunk, and the cards' time-left words in Swahili.

**Done when.** The branch is on main with its guard, and parity names exactly its change.

### WP5 — The reviewers' list: the ready fixes, Ali's choices, and the drafts for review 9 (M; depends on WP0 and Ali's answers) — CLASSIC (a few ADMIN or JOURNEY), release W, or a W2 once Ali answers

**Goal.** Clear S6-VISUAL-PASS-STATE appendix G's S12 list (:772-827) and the S12 items recorded elsewhere. Every entry
is a ledger row with one of three verdicts:
- **READY** — a typo, broken English, an English word inside a sw or zh sentence, a wrong capital, a half-width mark,
  or a dead key. These ship in release W.
- **ALI** — one name among several. These ship after his answer (Point for Ali 5), with the recommended default shown.
- **DRAFT** — a new sentence or key. Drafted here and signed off as review 9 in S4-COPY-AUDIT under the delegated
  Swahili role (§0h point 3). It ships with its fix: a new sentence is not a correction (review 4's rule, S4-COPY-AUDIT
  :344-345).

**Steps.**
1. **READY rows** (ledger rows 43–45, 47, 50, 53, 56, 62, 63, 67, 87, and row 57's date):
   - `proposals.earned` "umepataa" (:4808);
   - "Arifa {n}" → "{n} arifa" (`notif.nNotifications`, :4871);
   - the capitalised result phrases (:4300, :4715, :5090);
   - `notifyLoss`'s capital "Upande" (notification-service.ts:415, as :524);
   - "Market Proposals" in sentence case (:2012);
   - the zh footer's ASCII colon and unlocalised "©" line (public-footer.tsx:177, :180). This is frozen classic chrome,
     so it gets a named parity entry;
   - "Fungua soko →"'s typed arrow (:3863) for the glyph (`test:visual-pass-r10` :564-582);
   - `/updown/history`'s numeric `en-GB` date (page.tsx:60-61) onto eat-day's localized formatter;
   - `error.notFoundBody`'s straight apostrophe (:2471). `test:visual-pass-r4k` 1.6b flips with it;
   - the dead `profile.idDocsNeeded` (:1472/:4362/:6838) and `id-documents.test.mts` :544;
   - the dial's unreachable fallback subtitle (conviction-dial.tsx:1838);
   - zh's two regulator names (`wfGbt` :7802 against the footer's :7468).
2. **ALI rows** (Open point 35; Point for Ali 5, each with its default): the limits page's one name; LIVE in sw and in
   zh; the void word; the resolved word; "odds" inside Swahili; the game's name; the help subtitle.
3. **DRAFT rows** (each a new key or sentence; the ledger's DRAFT rows):
   - a round's duration in the reader's word order. `roundName` (updown-round-name.ts:17-19) and the card's aria names
     and chip (updown-card.tsx:731, :746, :758) print "{minutes} {udMin}", so Swahili reads "15 dakika". The stored
     titles already say "dakika 15" (:26) and are never rewritten. A per-language template fixes the display;
   - zh 指针玩具 (a name for review 9);
   - cash.tsx:91's English aria-label, and the English chart spans (terminal-chart.tsx:50), as keys;
   - `/updown/history`'s "decided" (page.tsx:460), "1 BETS" (:548), its side chips' typed arrows (:552) and the basis of
     "FAIDA HALISI";
   - shorter Swahili for the card-size hint (`nav.cardSpacingHint`) and for `journey.ticketPayoutAtResult`;
   - zh's ticker word order (:6636), "amana" three times in `depositAmountHint` (:3436), and zh number–unit spacing
     (re-measured first);
   - "GBT" in `auth.licensedByGbt`, and the sw AML door's name (`footer.amlKyc`);
   - the factual toasts' next-step lines;
   - "Couldn't copy" (share-button.tsx:81);
   - the agent application's reason keys (apply-client.tsx:198 prints the server's English);
   - the push-settings page's own name;
   - the rules page's name key (`visual-pass-r5a` :342-346 flips);
   - the one/many count words;
   - "Thibitisha kuweka pesa";
   - the badge names per locale (achievements.ts:75). This overlaps NEXT-PLAN ▶ 0g; WP0 checks which lane runs first;
   - K32's two lines (admin/agents/page.tsx:372; agent/status/page.tsx:170-174);
   - the wallet ledger descriptions. These are English and cut mid-word: `titleEn.slice(0, 60)` at market-service.ts
     :3528, :3996, :4128, :4271 and :4866, and wallet-service.ts :257, :861 and :1861. Pinned by
     `red:updown-void-copy`.
4. **The residue of the dates finding:** the agent dashboard (agent-dashboard.tsx:239) and `/profile/invite`
   (page.tsx:607) onto eat-day's localized formatters. Email rows keep "Sept" until Ali rules (S6-VISUAL-PASS-STATE
   :758).
5. **Responsible-gambling copy** — the permanent-exclusion email's "for permanent" (email.ts:1692-1693) and the bell's
   permanent notice — only on Ali's yes (Point for Ali 4).

**Gates.**
- `test:i18n`, `test:labels`, `test:feedback-law` (the toasts) and `test:failure-reasons` (the agent reasons).
- `test:visual-pass-r4k`, `r5a` and `r5g` (the flips named above).
- `test:id-documents`, `red:updown-void-copy` and `test:house-bot-disclosure` (red by construction).
- Parity v5's named entries.
- Tiles of each changed surface in its language(s), at 320/360/390/1280.

**Served bytes for a classic viewer.** The dictionary chunk, and HTML where a row renders. Each row of the ledger says
where.

**Done when.**
- Every row has shipped or carries its recorded reason (ALI not yet answered; overlap owned by another lane).
- Review 9 is signed in S4-COPY-AUDIT.

### WP6 — The console's decisions off the betting inks (S; depends on WP0) — ADMIN, release A

**Goal.** §B2a (DESIGN_AUTHORITY :250-253, :267): YES/NO ink names a side of a bet, never an officer's verdict. The
target pair is the one the console already uses where it was fixed:
- **Approve:** `primary`.
- **Reject:** `danger`.
- Precedents: sof-review-client.tsx:125/138/160; agents/[id]/decision-rail.tsx:261/287;
  admin-proposals-client.tsx:649/672; updown/proposals/proposal-actions.tsx:510/566; stuck-payout-controls.tsx:128;
  contacts/lists-card.tsx:237. The admin DG-A-21 rule says "actions: primary/ghost/danger only".

**The change set.**

| File:line (base) | Control | From | To |
|---|---|---|---|
| ai-polls/poll-actions.tsx:1537 | Reject (popover commit) | `btn btn-no btn-md w-full` | `btn btn-danger btn-md w-full` |
| candidates/candidate-actions.tsx:160 | Reject (popover commit) | `btn btn-no btn-md w-full` | `btn btn-danger btn-md w-full` |
| aml/aml-actions-client.tsx:213 | Submit, approve arm | `variant={mode === "approve" ? "yes" : "danger"}` | `"primary" : "danger"` (`78546e830` missed this one) |
| players/[id]/suspend-controls.tsx:196 | Suspend / Restore | `"suspend" ? "no" : "yes"` | `"danger" : "primary"` |
| players/[id]/suspend-controls.tsx:104 | "Suspend player" opener | the NO tint | the danger tint (`border-danger-border bg-danger-bg text-danger-fg`) |
| players/[id]/suspend-controls.tsx:115, :126 | "Restore player", "Reopen after self-exclusion" | the YES tint | the brand tint (Open point 30) |
| players/[id]/balance-adjust-controls.tsx:212 | "Credit / Debit TZS x" | `"credit" ? "yes" : "no"` | `"primary" : "danger"` (Open point 30) |
| moderation/moderation-client.tsx:155, :147 | Remove / Restore | NO / YES tints | danger / brand tints |

**Steps.**
1. **Swap classes only, and keep the raw `<button>`s.** Migrating them to the kit `<Button>` would drop
   `contrast-audit.mts`'s §P-u2 population below its floor of 17 (:1313) and fail `test:contrast`.
2. **Rewrite suspend-controls.tsx:88-93's comment.** It says "the tone must not move here" because DG-A-21 owned that
   palette, and DG-A-21 closed (`b00980fce`) without migrating them.
3. **A new named-site pin in `test:betting-ink`** (its §8, in the file's own named-site design, :18-20). It holds each
   site above off the betting pair and keeps the legitimate betting uses on it:
   - Resolve YES/NO (resolver-queue/resolve-controls.tsx:97-134);
   - the verdict ceremony (resolver/[id]/resolution-ceremony.tsx:40-41);
   - config/fee-simulator.tsx:106's winning-side picker.
   Plants: each site put back on the pair, caught. They live in the suite's own planted copies, as its other sections'
   do; `test:betting-ink` has no separate red twin.
4. **Leave KYC's claret Rejects** (kyc-decision-rail.tsx:400, :456; §B4a, an irreversible ceremony) and the other admin
   app-state uses of the pair (about 90 lines in 36 files) alone. They are outside the item; WP0 records them for
   whoever opens the console's inks next.

**Gates.**
- `test:betting-ink` (new §8, with plants), `test:contrast` (the population stays 17: no 5, danger 2, by class), and
  `test:ui-consistency` (its raw-button baseline is unchanged).
- `test:visual-pass-r5i`: its REGISTRY entry for `button.tsx` (visual-pass-r5i.test.mts:183) says the kit's `yes`
  variant's only caller is the console's. After this change the kit's yes/no variants have no caller: reword the entry,
  or delete it with the variants (§1.3 requires n > 0, :226).
- Tiles at 1280 and 390 of `/admin/ai-polls`, `/admin/candidates`, `/admin/aml`, `/admin/players/<id>` and
  `/admin/moderation`, each control at rest and on hover. DESIGN_AUTHORITY §B2a :305-309 warns that a swap is also
  typographic: `.btn-no` is weight 700 with tracking and a shadow, `.btn-danger` is not.
- Contrast: pearl on `.btn-danger` measures 4.85 at rest and 4.75 on hover; the danger fill on the admin surfaces is
  3.42–4.05:1.

**Served bytes for a classic viewer.** None (admin only).

**Done when.** The eight rows ship with their pin, and the tiles have been read.

### WP7 — "Paid out to players": measure, Ali rules, then its release (S; depends on Ali) — CLASSIC, release P

**Goal.** Settle the caption "Paid out to players" / "Yaliyolipwa kwa wachezaji" (`home.heroProofPaid`, en :621, sw
:3750, zh :6233). Today it is `readPaidOutTzs()` (platform-stats.ts:216-218) = `sumConfirmedByTypes(["BET_PAYOUT",
"CASHOUT"])`. Neither DAL twin filters on the house (prisma-dal.ts:2712-2718; store.ts:3032-3039). Settlement copies
the house marker onto a house position's payout row (market-service.ts:4262-4274, `SEAM:markerWin`), and house accounts
have staked on production since 2026-09-23.

**The defect, in one example** (the 13% loser-share rate):
- A house account stakes TZS 10,000 on YES; two players stake TZS 5,000 each on NO; YES wins.
- The house position is paid 18,700, and "Paid out to players" rises by 18,700. The players on that market received
  nothing.

**Where it shows.** Only the landing's proof band (landing-hero.tsx:527-586, slot :579-585). That is mounted only by
LegacyLanding (legacy-landing.tsx:274) on `/`. So every classic visitor sees it, no journey reader does, and it leaves
every screen at the flip.

**Steps.**
1. **Measure, read-only** — the step LANDING-TEN :118-131 prescribed. Run one SELECT through the Railway skill's
   read-only path: the sum with `houseBotId IS NULL` beside today's sum. The session's Ali-approved read only; nothing
   written.
2. **Ali chooses** (Point for Ali 2):
   - (A) filter the house out;
   - (B) keep the figure (D6: publicly a house account is "exactly like a player");
   - (C) drop the figure;
   - (D) leave it until the flip removes it.
   Record the choice in COMPLIANCE-DECISIONS.
3. **(A):**
   - `sumConfirmedByTypes` gains an option object, never a string literal in platform-stats.ts, because
     `test:house-bot-surfaces` §6 reads that file's printed words (:1288).
   - It mirrors `findByUser`'s `excludeHouseBets` (prisma-dal.ts:2447-2454; store.ts:2872-2877) in both twins.
   - New tests: a `test:dal-parity` section (beside §15, :1011-1033); a two-store house case with its red twin.
   - Edge case: `paidOutBehind` (landing-picks.ts:67-69) compares the total with the reader's own weekly payout, which
     includes house-marked wins for a house account's holder. With the filter on, the slot can hide for that holder.
   - (C) instead touches landing-hero.tsx:527-586, legacy-landing.tsx:241-247 and :274, `paidOutTzs`, landing-picks.ts
     :55-69, the key in three languages, `test:landing-mine` §4 and `test:visual-pass-r9b` :408, :451.
4. **Records:** LANDING-TEN :118-131 closed; HOUSE-BOTS.md; VODACOM-PLAN §4 :4855 annotated.

**The ticker is not this defect** (§4 asked):
- Its rows no longer say "won" (`tickerWonOn` was deleted in `6f97911eb`).
- A row reads "{amount} settled {NDIO|HAPANA} on {title}" (live-ticker.tsx:73-85): the market's pool less the fee
  (platform-stats.ts:111-115, :139).
- It names no recipient and never says "players". Subtracting the house per market would make it disagree with the pool
  shown elsewhere and could reveal a house stake, which D19 forbids.

**Gates.**
- `test:landing-mine`, `test:dal-parity`, the new two-store case and its red twin, `test:house-bot-surfaces`,
  `test:house-bot-reports` and `test:ticker-honesty`.
- Tiles of `/` (en/sw/zh; 360/1280).

**Served bytes for a classic viewer.** Under (A), the figure only. Under (C), the slot's markup leaves `/`.

**Done when.** Ali's choice is recorded, and shipped if it changes anything.

### WP8 — Juu/Chini's words (S; depends on WP3) — FLAGGED

**Goal.** Every word WP9–WP11 draw, as `journey.*` keys or reused classic keys, signed off in review 9.

**Steps.**
1. **Reuse, never copy** (§3.9, :3972-3973):
   - `market.udStake` and `market.udTapToBet`, as WP3 corrects them;
   - `journey.sheetChosen`, `stakeLabel`, `estimateCompact`, `placeCta` and `placeCtaBare`;
   - `journey.lowTitle`, `lowBody`, `lowChoose` and `lowDeposit`;
   - `journey.ticketsHere`;
   - `market.udPool`, and `market.udEstimateNote` (as corrected).
2. **New `journey.*` keys** (S12 drafts, review 9):
   - the round-closed title, "Raundi hii imefungwa";
   - the paid body, "Pesa zako zimeingia — {amount} ziko kwenye salio lako." (review 3's correction, S4-COPY-AUDIT
     :316-317);
   - the next round's start, "Raundi inayofuata inaanza {time}.", a separate sentence so it can be left out;
   - the button, "Nenda kwenye raundi inayofuata" (review 3, :318);
   - "Tumia {amount} badala yake" (the board's draft; it sets the stake);
   - the chips' group name, "Kiasi cha haraka" (the board's aria).
   en and zh are drafted, formal 您.
3. **The zh How-to fix:** `journey.howStep3Body` 赢家平分奖池 → 赢家按投注比例分享奖池 (S4-COPY-AUDIT :140; the S4 board
   `s4-7-howto-zh.dc.html`). VODACOM-PLAN §3's table (:3954) is annotated with it. This is a journey key.
4. **A hash-pin exemption for S12's journey keys,** in S8's form (`scripts/lib/s8-published-words.mts`), so
   `test:house-bot-disclosure` stays red only for release W's classic edits. Or record it red by construction, as S6
   and S7 did (Open point 31).

**Gates.** `test:i18n`; `test:house-bot-disclosure` (recorded); review 9 signed.

**Served bytes for a classic viewer.** The dictionary chunk.

**Done when.** The keys exist in en/sw/zh, and review 9 is signed.

### WP9 — The Juu/Chini stake panel in the journey's language (M; depends on WP1, WP8 and the ruling live) — FLAGGED

**Goal.** For a journey reader, draw the panel board (minus its multiples) on the board card's signed-in control and on
the round page's two-way control, and the low board's frame (its normal state) on the round page's `?side=` panel, as
the design table above specifies.

**Files.**
- `src/components/journey/updown/` (new): the journey arm's control and panel. These are client modules, loaded by
  `next/dynamic` from a small loader in the manner of `shell-lazy.tsx`.
- `src/components/updown/updown-card.tsx`, `round-stake-panel.tsx` and `updown-stake-controls.tsx`: one `journey` prop
  each, and one same-slot ternary each, whose else arm is today's element, not re-indented.
- `src/app/updown/page.tsx` and `src/app/updown/[roundId]/page.tsx`: pass the resolver's answer down. Both already ask
  it (page.tsx:106-107; [roundId]/page.tsx:347-348).
- `s4-canvas/s4-11-updown-panel.dc.html` and `-low.dc.html`: redrawn without the multiples and the old note, in this
  commit (the README's rule).
- `src/app/globals.css`: the arm's rules, its own class stem.

**Steps.**
1. **The money path is untouched.** The arm calls `useUpDownQuickBet` exactly as the classic arm does.
   `test:updown-quickbet` and a new `test:journey-updown` §1 hold the arm to the same hook (no second `buyPositionAction`
   caller).
2. **The stake entry.**
   - The kit `Input` `grouped` (TZS prefix, numeric keypad, 9-digit cap), always visible.
   - Four chips in full figures from `quickStakes(min, max)`, the chain's own bounds (`stakeBoundsFor`,
     updown-config.ts:1363-1370; 500 / 1,000 / 2,500 / 5,000 at the default).
   - A chip sets the stake. No "+ Maalum".
   - `stakeChipLabel` and `quickStakes` stay as they are (`test:visual-pass-r5a` :290; `test:bet-sheet` :393).
3. **The prompt and the buttons.** The helper line's states as the classic control draws them (updown-stake-controls.tsx
   :313-346), with the corrected `udTapToBet`. The side buttons carry the word and the arrow only. One tap places the
   bet; after it, the classic receipt (Open point 15).
4. **The `?side=` panel.**
   - The chip "Umechagua JUU", the stake entry, and "Ukishinda ≈ {amount}" from `projectedReturn` (muted, never gold;
     §M3).
   - The qualifier, shown only where a figure is (`2fd8940e4`'s gate).
   - The gold `journey.placeCta` with the stake.
5. **The holder's heading** on the round page reads `journey.ticketsHere`.
6. **The ruling's guard, extended.** `test:updown-pricing` §8's render matrix gains the journey arm's three renders
   (card control, two-way control, `?side=` panel; en/sw/zh; two-sided, one-sided, empty; the display switch on and
   off). No "×" or "≈N×" anywhere, no note under the buttons, and the empty-side sentence if and only if a side is empty.
   `red:updown-pricing` gains the multiple put back on the arm's button, caught.
7. **The new suite `test:journey-updown` and its red twin.** It covers:
   - the arm renders only for a journey request (the flag's three states);
   - the classic files' else arms are byte-identical to the base (the S6–S8 same-slot rule);
   - the chips equal `quickStakes`, and a chip sets the stake;
   - the CTA names the stake;
   - the projection equals `projectedReturn`.

**Gates.**
- `test:journey-updown` and its red twin.
- `test:updown-pricing` and `red:updown-pricing`; `test:updown-quickbet`; `test:updown-match` (11b.12).
- `test:visual-pass-r4d`, `r5a`, `r5c`, `r5i`, `r7c`, `r8a` and `r10`. The arm is in its own files, so the classic
  pins stand. `r5c`'s gold census and `r8a`'s link census classify the new files in the open.
- `test:design-frozen`, `test:contrast`, `test:type-scale`, `test:simple-journey-flag` and `test:journey-shell` (§12, the
  lazy parts).
- `qa:first-load` and `qa:served-skeleton --main` on `/updown` and a round page; parity v5 (0 differences).

**Served bytes for a classic viewer.** Release J's: JS (one prop, a loader stub, the dictionary), and CSS that matches
nothing. No HTML.

**Done when.** The arm draws the boards in sw/en/zh from 320 to 1280 through a staff pass (WP15), with no multiple, and
parity v5 reads 0 differences.

### WP10 — Juu/Chini low balance → deposit → back (M; depends on WP9; its "back" half on S9) — FLAGGED

**Goal.** The low board for a journey reader: the sheet's low-balance pattern, from the same engine, on both Juu/Chini
controls. A paid deposit brings the player back to the round with the side and the stake, and nothing is placed.

**Steps.**
1. **One block, two hosts.**
   - Extract the sheet's low frame (bet-sheet.tsx:102-125) into one component in `sheet-parts.tsx`, with byte-identical
     markup.
   - The sheet and the Juu/Chini arm both draw it.
   - `test:bet-sheet`'s render checks and `qa:bet-sheet`'s tiles stay unchanged (Open point 32; overrule: a copy).
2. **The facts.**
   - `shortfallPlan` (shortfall.ts:191-247) and `viewerFacts` (journey-sheet.ts:252-291) are product-neutral.
   - `isSheetMarket` (:140-143) keeps refusing UPDOWN, so the sheet route and the YES/NO sheet do not change.
   - The round page and the board render the viewer's facts into the arm for a journey request, through `viewerFacts`
     as S8 reads them: spendable (balance plus bonus), the break, the session limit through `readSessionStanding` (its
     write-free read, journey-sheet.ts:241, :258), the account, the loss room, a pending deposit, the deposit ceilings,
     source of funds and the rails not paused.
   - The plan is recomputed on the client as the stake changes, re-read on every poll and on `wallet:balance`
     (Open point 10).
   - Its market facts are `{ live: round open, selectionClosed: round locked }`, with the chain's bounds.
3. **The branches.** Every branch S8 draws applies, in its order:
   - maintenance, a break, the session limit, the account, a held wallet;
   - the round not open (it closed);
   - the stake's bounds; the loss limit;
   - a pending deposit (described by its age, S8 A10), the deposit limit, source of funds, every mobile-money rail
     paused.
   "Bet instead" becomes "Tumia {amount} badala yake", which **sets** the stake. The player taps the commit; it never
   places (the board's call, §0g :3563).
4. **The deposit door.**
   - "Weka pesa TZS {D}" opens `/wallet/deposit?amount={D}&from=low-balance&bet=udr_<id>.<side>.<stake>` until S9's
     screen is live (S8 Open point 11's pattern). S9 keeps round intents (S9-PLAN WP7).
   - The tab marker is written at the tap through the sheet's storage modules, extended to a round's bet (sheet-storage
     .ts:18 and sheet-owned-storage.ts:50 accept only `kind === "market"` today) without disturbing the sheet's
     unresolved keys.
   - The privacy notice names a round in the same commit (Open point 12): §7 says "the question, side and amount"
     (privacy/page.tsx:217, :347, :469), a version bump with its COMPLIANCE entry.
5. **The way back.**
   - The round page's journey arm reads `?bet=udr_…` (`pendingBetFrom`, kind "round"; today no Up & Down file does).
   - The stake comes from the URL only with this browser's matching marker (`stakeFromUrl`, owner-scoped); otherwise
     the round's minimum.
   - It opens the `?side=` panel preset and places nothing.
   - If the round has closed, WP11 takes over.
   - Until S9 is live, the way back is the player's own Back or the receipt's link. When S9 lands, its waiting page
     returns to `pendingBetUrl("/updown/<id>", bet)`.
6. **The funnel.**
   - The classic files keep their literal door (`test:journey-funnel` :227-228).
   - The `low_balance` step keeps firing once per surface from the shared hook, origin `updown` (use-quick-bet.ts
     :252-258). The arm's door carries `from=low-balance`, which the deposit page turns into the deposit's
     `low_balance` origin (wallet/deposit/actions.ts:49, :138).
   - A round bet placed after a journey deposit's return is counted by S9's verified-origin rules (Open point 34).

**Gates.**
- `test:shortfall`, `test:pending-bet` (the round grammar's reader), `test:bet-sheet` and `test:bet-sheet-host` (the
  extraction and the storage), `test:journey-sheet`, `test:deposit-ceiling` and `test:journey-funnel`, with the red
  twins `red:shortfall`, `red:pending-bet`, `red:bet-sheet`, `red:bet-sheet-host` and `red:journey-sheet`.
- `test:privacy-notice` and `test:dal-parity`.
- `test:journey-updown` §2 (every branch drawn, and the spendable figure).
- The drive's cells (WP15): a bonus that covers the stake shows no low state (F1's journey half).

**Served bytes for a classic viewer.** None beyond release J's. The privacy notice's new version is read by every
visitor, and it joins §2's list.

**Done when.** Every branch draws from the plan and no figure is computed in a component; a paid deposit brings the
player back preset (once S9 is live); nothing is ever placed without a tap.

### WP11 — A closed round goes to the next round, side and stake kept (S; depends on WP10) — FLAGGED

**Goal.** The round-closed board, for a journey reader who returns to a round whose selection has closed: say so, and
offer the next round with the same side and stake.

**Steps.**
1. **When the notice shows.** The round page's journey arm, opened with a pending bet (`?bet=udr_…`, or `?side=`), finds
   the round locked, confirming, settled or void. It shows `Callout tone="info"`:
   - the title "Raundi hii imefungwa";
   - the money line "Pesa zako zimeingia — {amount} ziko kwenye salio lako.", only when the return carries a confirmed
     deposit read from S9's owned status, never from the address (Open point 14);
   - "Raundi inayofuata inaanza {time}.", only with an instant the server knows (`successor.opensAtMs`). No time is
     ever guessed from the chain's period.
2. **The button.** "Nenda kwenye raundi inayofuata" is a link, shown when the successor round exists. The successor
   exists only once the round has settled (updown-board.ts:1420-1422; created at settle).
   - Before that the page polls as E-166's bounded handover does (`handoverPollUntil`, `test:refresh-cadence` §5), and
     the button appears when the successor arrives.
   - The link is `/updown/<successor>?bet=udr_<successor>.<side>.<stake>`, with the marker rewritten for the successor
     at the tap. The successor's panel opens preset (WP10 step 5) and places nothing.
3. **E-166 stays as it is.** Its automatic hop keeps `?from=` and drops the stake (rule 3, updown-handover.tsx:32-39;
   `test:updown-handover` 8.11-8.13). A page opened on an already-settled round does not hop (:127-134, :155).
4. **The classic arm is unchanged:** no notice and the classic handover bar.

**Gates.**
- `test:journey-updown` §3: the notice's three variants; no time without a server instant; the money line only with a
  confirmed deposit; the link carries the bet; the marker is rewritten for the successor; nothing placed.
- `test:updown-handover` and `red:updown-handover` (unchanged); `test:refresh-cadence`.

**Served bytes for a classic viewer.** None beyond release J's.

**Done when.** On a local chain a player who closed the page during the lock and returns sees the notice, then the
button when the next round exists, and lands on it preset, with the wallet unmoved until they tap.

### WP12 — Emails and the bell: short titles at the flip (M; depends on WP0) — FLIP

**Goal.** §5 :5003, switched on when the rollout is ACTIVE (S15), and inert before. Emails and notifications run with no
request, so the preview pass cannot gate them. The global state can: `journeySwitchNow()` (simple-journey-switch.ts
:323), or `simpleJourneyStateNow()` (:341).

**Steps.**
1. **One helper** in `src/lib/markets/short-title.ts` (client-safe: `test:client-graph-safe` :108-112). It returns, per
   language, the officer-approved short title, else that language's full title (`shortTitleFor`, :230-233, has no
   cross-language fallback by rule).
   - "Approved" is structural: there is no flag. A short title is non-null only through an officer's act (the wizard,
     the edit, an approved AI poll or an approved backfill draft).
   - Up & Down rounds have none (market-service.ts:803-806), so their notices keep their round titles.
2. **The call sites**, each switched at ACTIVE through one server predicate read once per send:
   - the seven player emails' title lines and the two subjects (`betPlacedHtml` subject market-service.ts:1992,
     `selectionClosedHtml` :2294);
   - the eleven notification emitters with a title (notification-service.ts; the `localizedText(...)` arguments in
     market-service.ts).
   The emails' language rule stays: EN + SW in one message, no Chinese. Their title line stays English (Open point 22).
3. **The rooms stay.** The clamps (45–70 characters) are shorter than the short-title budget (100 / 100 / 50), and
   `test:visual-pass-r6b` §7 pins them, so a long short title still ends in "…". One room for every family, and a
   question named in the Swahili selection-closed and cash-out notices, are owner questions (S6-VISUAL-PASS-STATE
   :759-760; Point for Ali 5).
4. **Re-pin in the open:**
   - `test:cert-c1` and `test:cert-c3` (the fixtures, typed);
   - `test:labels` §7d/§7e: `localizedText(` at least 9 times in market-service.ts, 16 today. A helper that wraps it
     must keep the count honest;
   - `test:visual-pass-r6b` §6.7, and `test:visual-pass-r5b` §6.6–6.7 (the four subject sites);
   - the red anchors `house-bot-c5.anchors.mjs:277, :285`, `house-bot-money.anchors.mjs:326` and
     `updown-digest-red.mjs:45`, each still resolving once (`test:red-anchors`);
   - `test:house-bot-seam`'s markers.
5. **A test that the switch is off now:** under STAFF_PREVIEW or WITHDRAWN, every rendered email and notice carries the
   full title, byte-equal to the base.

**Gates.** The suites above; `test:red-anchors`; `test:email-stress`; `test:selection-closed`; `test:lifecycle-e2e`;
`test:updown-bell`.

**Served bytes for a classic viewer.** None (server code; nothing changes until ACTIVE).

**Done when.** The helper and the switch are proven inert now and correct at ACTIVE, both stores, in process. S15's
gate census names the switch.

### WP13 — Share pictures and share text: no multiple now, the short title at the flip (S; depends on WP0) — FLIP, with a classic guard

**Goal.** §5 :5004 and the agency reply's promise ("the question without a winnings figure", AGENCY-REPLY.md:56). It
covers `/api/og/market/[id]` (the normal card and the win card), `/api/og/page`, the market page's metadata
(page.tsx:93-145) and the share text (:630).

**Steps.**
1. **Now — a guard, inert to players:** `test:share-preview` gains "no '×', '≈', 'multiplier', 'odds' or estimate
   figure on any share card or share text", with an anchor in `anchors/share-preview.anchors.mjs` and a planted
   multiple, caught. Up & Down rounds have no share image (their metadata falls back to `/og/og-1200x630.png`) and stay
   covered by name.
2. **At ACTIVE:** the WP12 helper's English short title at route.tsx:170, share-token.ts:66 (the win card's
   `marketTitle`), and page.tsx:117/:135/:141. Re-pin in the open:
   - `test:house-bot-reports` 11.247.c1e (the `WIN_SHARE` literal, `marketTitle: m.titleEn,`);
   - `test:visual-pass-r5d`'s metadata sandbox (new identifiers);
   - `test:labels` §3b (at most two raw YES/NO tokens).
3. **Not S12:**
   - the brand images in `public/og/` with the tagline (S11, SJ-20);
   - the card's English title against `og:locale` "sw_TZ" (layout.tsx:110), and its YES/NO percentages (Point for
     Ali 11).

**Gates.** `test:share-preview` and `red:share-preview`; `test:win-share`; `test:predictor-shown`;
`test:visual-pass-r5d`, `r5g` and `r5j`; `qa:landing-v3:og-prod` (production read, after the flip).

**Served bytes for a classic viewer.** None now.

**Done when.** The guard holds with its plant; the ACTIVE switch is proven in process.

### WP14 — The manifest patch and the SMS guard (S; depends on WP0) — FLIP, with a guard

**Goal.** Prepare §5 :5005 for S15's commit, and make §5 :5006 a guard.

**Steps.**
1. **The manifest** (`public/manifest.json`; one file for every language, `"lang": "en"`, linked at layout.tsx:126).
   Prepare the S15 patch as a reviewed file on the S12 branch, applied by S15 with `sw.js`'s `CACHE_NAME` bump:
   - the shortcuts Maswali (`/`) and Tiketi zangu (`/positions`), with Weka pesa kept (Open point 24);
   - the name with S11's tagline;
   - new icon file names. `/icons/*` and `/screenshots/*` are one-year immutable (next.config.ts:7-17), so a changed
     picture needs a new name; the `shortcut-*.png` files are hand-made, not `build:brand`'s (DESIGN_AUTHORITY :215);
   - `"lang"`: Ali's choice, with MOBILE-VISUAL D55's open request for "sw".
   The screenshot is captured after the flip (S15/S16), never before.
2. **Guards now:**
   - `test:install-invite` §1 and `test:visual-pass-r4k` §9.4 keep holding the current file;
   - a check that the prepared patch's shortcut URLs are real routes and its icons exist.
3. **SMS** (no title in any SMS today: OTP, invites and marketing only; `smsCodingFor`, sms-blackball.ts:112 →
   `encodingFor`, sms-compose.ts:111):
   - a census guard in `test:blackball` or `test:campaign-compose`: no SMS composer reads a title field (`title*`,
     `shortTitle*`);
   - any future title goes through `foldToGsm7` (sms-compose.ts:265). Short titles in sw and en are GSM-7 by
     `cleanShortTitle` (short-title.ts:84).

**Gates.** `test:install-invite` and `red:install-invite`; `test:visual-pass-r4k`; `test:static-cache-scope`;
`test:blackball` and `red:blackball` (or `test:campaign-compose` and `red:campaign-compose`, wherever the census lands).

**Served bytes for a classic viewer.** None.

**Done when.** S15's census names the patch, and the SMS guard holds with a planted title read, caught.

### WP15 — The drives and the tiles (L; depends on WP9–WP11 and the classic releases)

**Goal.** Prove release J in a real browser through a staff pass, and read every surface S12 changed.

**Steps.**
1. **`qa:journey-updown`** (new). A local in-memory server, a staff pass (S6's `/admin/journey`), and a chain from
   `/api/dev-test/updown-seed`: `mock` for the open cells, `mock-bars` and `updown-advance` for the decided ones. The
   cells:
   - the board card and the round page in the journey arm (en/sw/zh × 320/360/390/1280);
   - a chip sets the stake; one tap is one bet (the wallet and the positions read back);
   - the `?side=` panel: its CTA names the stake, and its projection equals `projectedReturn` at that stake;
   - low balance: every branch the drive can seed, including a bonus that covers the stake (no low state); the deposit
     door's URL and its marker;
   - the return with `?bet=`: an open round opens preset; a closed one shows the notice, then the button when the
     successor exists, then the successor preset;
   - nothing placed without a tap;
   - Enter where pressed, and a held key that presses once (the A8i rules; `qa:enter-where-pressed`'s method).
2. **Tiles, read one by one:**
   - release J's cells;
   - release W's changed surfaces (each language, 320/360/390/1280);
   - release A's five admin pages (1280 and 390);
   - `/` under release P, if it ships.
3. **`qa:journey-shell`** re-tiles `/updown` and a round page in the journey (it tiles only the shell and heading today,
   :1495-1543).

**Gates.** The drives green; the tiles read.

**Served bytes for a classic viewer.** None (scripts).

**Done when.** Every cell is green, and every tile is read with its findings fixed or recorded.

### WP16 — Proof, records, merge, deploy (M; depends on all)

**Steps.**
1. **Each release, as the session law says:**
   - typecheck, `next build` and a local `qa:live`;
   - after the push, `?dpl=` on both hosts, health, `qa:chunks-prod` and a production `qa:live`;
   - release W and release P read their changed words or figure back on production.
2. **At S12's close:**
   - `npm run test:all` with the database suites;
   - `npm run test:red-anchors`;
   - every file-mutating red S12 touched, each alone, with `git diff` clean after each;
   - parity v5: a baseline at the last live main and one compare. Every difference is named: release W's entries, and
     none from release J;
   - `qa:first-load` and `qa:served-skeleton --main` on `/updown` and a round page;
   - the tiles of everything S12 changed, read one by one.
3. **An adversarial refute-and-mutate review** of each release before its commit (Ali's standing rule). Money and
   responsible gambling come first: a stake carried where it should not be, a bet placed without a tap, a figure not the
   engine's, a sentence the code contradicts.
4. **Records:**
   - the S12 section as built, with each release's served bytes;
   - §1 S12;
   - §2's rows;
   - the SHELVED rows for what release J hides from journey readers. Each goes in the same commit that hides it:
     - the classic Up & Down stake control's chip labels and its "+ Maalum" toggle;
     - the classic pick eyebrow;
     - the classic insufficient line;
     - the classic `?side=` CTA wording.
   - memory.

**Done when (S12), as Open point 2 proposes:**
1. Releases W and A are live and read back, and every parity difference is named.
2. Release P is shipped or recorded as Ali chose.
3. Release J is green on local drives through a staff pass in sw, en and zh from 320 to 1280, and parity v5 reads no
   difference for classic readers.
4. Release F is proven inert now and named in S15's gate census.
5. Every row of the word ledger is shipped or carries its reason.

S12 then closes. Its §1 row turns ✅ as S7's and S8's do: the classic releases at their production read-back, and the
flagged arm only with S14's staff pass on production (§0h point 4). WP10's "back" half is proven again once S9 is live,
if it was not live at S12's close.

---

## The word ledger

One row per word fix S12 owns. The line numbers are `src/lib/i18n-dict.ts` (en 31–3232, sw 3233–5716, zh 5717–8181)
unless a file is named.

**How to read the columns.**
- **Readers:** C means classic, every player; J means journey-only; A means admin.
- **Verdict:** READY, ALI, DRAFT, HOLD (waits for a named event), DONE, or JOURNEY.
- **Pins:** the scripts that hold the current literal, re-pinned in the same commit.

| # | Key or site | Today (sw unless noted) | Becomes | Readers | Pins | Verdict | WP |
|---|---|---|---|---|---|---|---|
| 1 | `common.payout2` sw :3591 | Lipo | Malipo | C: bet-confirm-modal.tsx:362, conviction-dial.tsx:1675 | none | READY | 3 |
| 1a | `dialog.payoutLabel` sw :5217 (also) | Lipo | Malipo | C: conviction-dial.tsx:1862; position-card.tsx:174, :200 | none | READY after review 9 | 3 |
| 1b | `toast.payoutAtResolution` sw :5254 (also) | Lipo litahesabiwa … | Malipo yatahesabiwa … | C: conviction-dial.tsx:1062 | none | READY after review 9 | 3 |
| 2 | `market.atResolution` sw :4156 | Wakati wa utatuzi | Matokeo yakitoka | C: conviction-dial.tsx:1862 | none | READY | 3 |
| 3 | `dialog.payoutCalcBody` sw :5218 | …mara dau litakapofungwa. | …mara uchaguzi utakapofungwa. | C: bet-confirm-modal.tsx:371, conviction-dial.tsx:1701 | dynamic (r4i :236, r7a :302, r9b :301) | READY | 3 |
| 3a | `dialog.poolSharePayout` sw :5232 (also) | …dau litakapofungwa. | …uchaguzi utakapofungwa. | C: bet-confirm-modal.tsx:452, conviction-dial.tsx:1597 | — | READY after review 9 | 3 |
| 3b | `market.payoutAtClose` sw :4159 (also) | Dau likifungwa | Uchaguzi ukifungwa | C: position-card.tsx:200 | — | READY after review 9 | 3 |
| 4 | `market.finalLabel` sw :4156 | Mwisho | Malipo ya mwisho | C: position-card.tsx:169 | shape only (sell-grace-truth :1606-1609) | READY | 3 |
| 5 | `market.opened` sw :3988 | Imefunguliwa | Imewekwa (the word only; the composition stays) | C: position-card.tsx:159, page.tsx:1095; J: journey-holder.tsx:40 | shape only | READY | 3 |
| 6 | `error.failSystemBusy` sw :5140 | Dau lako HALIJAONDOKA | Dau lako HALIJAWEKWA na hakuna pesa iliyokatwa | C: the dial, Up & Down, error-copy.ts | failure-reasons.test §4.2 reads the en (unchanged) | READY | 3 |
| 7 | `error.failAccountBlocked` sw :5143 | …msaada tutakueleza… | …msaada na tutakueleza… | C | none | READY | 3 |
| 8 | `error.failWalletFrozen` sw :5147 | hivyo dau haziwezi kuwekwa | kwa hiyo huwezi kuweka dau | C | none | READY | 3 |
| 9 | `error.failSessionLimit` sw :5146 | …kimefika … kitaanza upya | …kimefikia kikomo hicho … rudi baadaye uanze kipindi kipya | C | none | ALI (an RG sentence) | 3 |
| 10 | `error.failRateLimited` sw :5139 | Hilo lilikuwa haraka. | Umejaribu haraka mno. | C | none | READY | 3 |
| 11 | `error.failLossLimitDaily` | — | — | — | — | DONE `e5b5c9daa` | — |
| 12 | `market.youAlreadyHold` sw :3977 | Tayari unashikilia | Tayari una dau la | C: page.tsx:767 | none | READY | 3 |
| 13 | `market.hedgeAddBody` sw :3982 | …kwenye soko hili. | …kwenye swali hili. | C: page.tsx:780 | none | HOLD (a rename only: S15's Maswali sweep; Open point 33) | — |
| 14 | `common.marketClosed` sw :3520 | Soko limefungwa | Swali hili limefungwa | C: conviction-dial.tsx:911, :1744 | none | HOLD (a rename only; Open point 33) | — |
| 14a | `error.failSelectionClosed` sw :5137 | Uchaguzi umefungwa kwenye hili. Sasa linasubiri matokeo. | Muda wa kuchagua umekwisha. Sasa tunasubiri matokeo. | C: failure-reasons.ts:291 (the dial and Up & Down) | none | READY | 3 |
| 14b | `market.countdownEndedBody` :3972, `marketClosedForPredictions` :3973, `closedWaitSubtitle` :3987, `common.marketStoppedPredictions` :3523 | Soko … | Swali … | C: page.tsx:902-909; conviction-dial.tsx:911 | — | HOLD (a rename only; Open point 33) | — |
| 15 | `common.freeExitLabel` :3559, `common.fullRefund` :3568 | Toka bila gharama · pesa yote | Uza bila ada hadi {saa} · Rudishiwa {amount} kamili | C: sell-button.tsx:667-708 | parity :816-819, :3111, :3180, :3220; sell-grace-truth §5 | HOLD (the flip; Open point 19) | — |
| 16 | `error.errDepositLimit` sw :5171 | Amana hii ingepita… | the C11 sentence, without `{amount}` | C: deposit actions.ts:148 | failure-reasons.test :503-504, :153-160 | READY | 3 |
| 17 | `error.errSofRequired` sw :5172 | Amana hii inahitaji… | `journey.sheetSofRequired`'s sw | C | failure-reasons.test :503-504 | READY | 3 |
| 18 | `common.depositStarted` sw :3467 | Amana imeanza | (Malipo yameanza: journey screens only) | C: wallet-result-modal.tsx:76 | none | HOLD (S9; Open point 29) | — |
| 19 | `wallet.payoutsDelayedBody` sw :4239 | — inaweza tu kutofika mara moja. | — pesa zinaweza tu kuchelewa kufika. | C+J: deposit page :188, withdraw :242 | dynamic (payout-honesty; r10 :758, :793) | READY | 3 |
| 20 | `market.probOverTime` :4167 and the rest of WP2's table | NDIYO | NDIO | see WP2 | r9b :448 | READY | 2 |
| 21 | `market.volume` sw :3914 | Kiasi | Bwawa | C+J: page.tsx:967 | shape only | READY (en "Volume" and zh 成交量 mislabel a pool too: Open point 29) | 3 |
| 22 | `market.resolves` sw :3914 | Inaisha (no reader) | — | none | r4i 12.1′ :798 | DONE (R4-I) — leave | — |
| 23 | `profile.helpSupportSub` sw :4389 | Maswali · Simu · Barua pepe | Maswali ya kawaida · Simu · Barua pepe (review 2) | C: profile/page.tsx:424 | r5g :550 shape | ALI (default: review 2's long form; S6-VISUAL-PASS-STATE :774-775 asked for the short one; Open point 35) | 5 |
| 24 | `profile.responsibleGamblingSub` sw :4385 | Mipaka · Kujitenga | Mipaka · Pumzika · Jizuie | C: profile/page.tsx:400 | r5g :550 shape | READY | 3 |
| 25 | `nav.cardSpacing` sw :3657; privacy page :206/:336/:466 | Nafasi ya kadi | Ukubwa wa kadi | C: nav-more.tsx:180, :187; the privacy notice | privacy-notice.test :367; card-spacing-drive.mjs:38 | READY (the notice's words with its next version; Open point 29) | 3 |
| 26 | `market.udStake` sw :4098 | Kiasi | Dau lako | C: updown-stake-controls.tsx:216, :218; round-stake-panel.tsx:199; receipt :86; [roundId]/page.tsx:588, :629 | dynamic (r6a, r7a) | READY | 3 |
| 27 | `market.udTapToBet` sw :4127 | Gusa Juu au Chini kuweka dau | Bonyeza Juu au Chini kuweka dau | C: updown-stake-controls.tsx:343 | none | READY | 3 |
| 28 | `market.udNoHistory` sw :4089 | Bado hakuna dau za… | Bado hakuna madau ya… | C+J: updown/history/page.tsx:398 | dynamic (r6a) | READY | 3 |
| 29 | `market.udHistoryBody` sw :4088 | …dau zako za muda mrefu. | …madau yako ya muda mrefu. | C+J | shape | READY | 3 |
| 30 | `market.udRcBetsClose` sw :4142 | Dau zinafungwa | Madau yanafungwa | C: receipt :99 | none | READY | 3 |
| 31 | `market.udEstimateNote` sw (:4064 base; :4068 on `2fd8940e4`) | …Dau zikifungwa, yanakuwa… | …Madau yakifungwa, yanakuwa… | C: round-stake-panel, receipt | updown-pricing §6.7 | READY (after the ruling's release) | 3 |
| 32 | `market.udNobodyBackedEither` sw :4068 | …wakati dau zinafungwa… | …wakati madau yanafungwa… | C | updown-pricing :294-296 (defined) | READY | 3 |
| 33 | `market.resVoidRefund` sw :3939 | Dau zote zilirejeshwa… | Madau yote yalirejeshwa… | C+J: resolution-panel.tsx:274 | dynamic | READY | 3 |
| 34 | `common.noVoidedSettlementsBody` sw :3504 | …iwapo dau zitarudishwa. | …iwapo madau yatarudishwa. | C+J: fairness/page.tsx:317 | none | READY | 3 |
| 35 | `market.hedgeBothBody` :3980, `hedgeOppositeBody` :3981 | Dau zote mbili zinabaki…; …dau zako zote mbili haziwezi… | Madau yote mawili yanabaki…; …madau yako yote mawili hayawezi… ("soko hili" kept) | C: page.tsx:777, :779 | none | READY (the second clause after review 9) | 3 |
| 36 | `primer.card3Body` sw :4914 | dau za washindi zinarudishwa…; Dau likifungwa… | madau ya washindi yanarudishwa…; Uchaguzi ukifungwa… | C: first-visit-primer.tsx:302 | test:rate-copy (dynamic) | READY (the tail after review 9) | 3 |
| 37 | `help.faq1a` :4982, `faq1aLoser` :4983 | Dau za kila mchezaji … zinajiunga…; NDIYO | Madau ya kila mchezaji … yanaungana kuwa…; NDIO | C+J: help/page.tsx:153-154 | none | READY (one edit with WP2) | 2, 3 |
| 38 | `error.positionsSafe` :5128; `error.walletSafe` :5126 (also) | hayajaaathiriwa | hayajaathiriwa | C: positions/error.tsx:29; wallet/error.tsx:19 | shape | READY (a typo: no review needed) | 3 |
| 39 | `market.timeLeftD/H/M` :3900 | masaa {n} yamebaki | saa {n} zimebaki; singular "… imebaki" | C: 5 calls | test:time-left; parity :253-257 | READY (branch `1468d7cca`) | 4 |
| 40 | Terms §4 sw (terms/page.tsx:334, :351, :355, :361, :403) | Dau zote… (class 10), NDIYO | Madau yote…, NDIO | C | test:terms-binding | READY with a new version (Open point 21) | 2 |
| 41 | YES/NO rules sw (_content-yes-no.tsx:259, :315, :378) | NDIYO/HAPANA; dau zote… | `{w.sw.yes}/{w.sw.no}`; madau… | C | rules-copy §4 | READY with the version line | 2 |
| 42 | Up & Down Rules §2 sw (_content-up-down.tsx:282) | Si ahadi hadi dau zitakapofungwa | …hadi madau yatakapofungwa | C | rules-copy | HOLD (that document's next version) | — |
| 43 | `notif.nNotifications` :4871 | Arifa {n} | {n} arifa | C | — | READY | 5 |
| 44 | `proposals.earned` :4808 | umepataa | umepata | C | — | READY | 5 |
| 45 | Result counts :4300, :4715, :5090 | Miamala {n}, Nafasi {n}, Risiti {n} | lower case after a count | C | — | READY | 5 |
| 46 | cash.tsx:91 aria | balance hidden (English in all three) | a key in en/sw/zh | C | — | DRAFT | 5 |
| 47 | notification-service.ts:415 | Upande… | upande… (as :524) | C | — | READY | 5 |
| 48 | A round's display name and chip: `roundName` (updown-round-name.ts:17-19), the card's aria names and chip (updown-card.tsx:731, :746, :758), all "{minutes} {udMin}" | Bitcoin Juu na Chini · 15 dakika | a per-language duration template (sw "dakika {n}", as the stored title "· dakika 15" already says, :26); stored titles are never rewritten | C | test:visual-pass-r5d, test:visual-pass-r6b | DRAFT | 5 |
| 49 | zh needle name (needle-drawer.tsx; feedback-settings.tsx) | 指针玩具 | a name for review 9 | C | — | DRAFT | 5 |
| 50 | en "Market Proposals" :2012 | Title Case | sentence case | C | — | READY | 5 |
| 51 | zh LIVE: :5719 and :6250 against :6485 | 直播 / 实时 | one word | C | — | ALI | 5 |
| 52 | Chart spans (terminal-chart.tsx:50; updown-chart-lab.tsx:143-145) | 15M … 7D in every language | localized abbreviations | C | — | DRAFT | 5 |
| 53 | zh footer (public-footer.tsx:177, :180; the slash styles; hero-intro.tsx:119) | 许可证: with an ASCII colon; "© 2026 50pick · Tanzania" | full-width colon; a localized line | C (frozen chrome: a named parity entry) | parity | READY | 5 |
| 54 | sw "odds" (:4064, :3297) | odds | Ali's word | C | — | ALI | 5 |
| 55 | The void named twice (:3257 against :4013, :4760) | Imebatilishwa / Batili | one word | C | — | ALI | 5 |
| 56 | "Fungua soko →" :3863 | a typed arrow | the glyph | C | r10 :564-582 | READY | 5 |
| 57 | `/updown/history` (page.tsx:460, :548, :60-61) | "decided" in English; "1 BETS"; 12/10, 00:10 EAT | keys with one/many; eat-day's formatter | C+J | — | DRAFT (the date: READY) | 5 |
| 58 | zh number–unit spacing ("7天" against "5 分钟") | mixed | one rule | C | — | DRAFT (re-measure first) | 5 |
| 59 | "Imetatuliwa" :3887 against "Imekamilika" :4013 | two words | one | C | — | ALI | 5 |
| 60 | zh ticker order :6636 | 已结算 否 在 Will… | a natural order | C | ticker-honesty | DRAFT | 5 |
| 61 | `depositAmountHint` :3436 | amana ×3 | one noun | C | — | DRAFT | 5 |
| 62 | `error.notFoundBody` :2471 | couldn't (straight ') | couldn’t | none read | r4k 1.6b | READY | 5 |
| 63 | `profile.idDocsNeeded` :1472/:4362/:6838 | dead key | deleted | none | id-documents.test :544 | READY | 5 |
| 64 | Badge names (achievements.ts:75) | First Prediction · Ubashiri wa Kwanza | per-locale keys | C | — | DRAFT (NEXT-PLAN ▶ 0g overlaps) | 5 |
| 65 | Limits page names (:4385 Vikomo, :4934, :3601, :5171) | four names | one | C | — | ALI | 5 |
| 66 | LIVE in sw (:3820 Mubashara; :3855 hai) | two words | one | C | — | ALI | 5 |
| 67 | zh regulator (`wfGbt` :7802; footer :7468) | two names | one | C | — | READY (the footer's, the regulator's own) | 5 |
| 68 | `auth.licensedByGbt` :537/:3684/:6167 | "GBT" | the Board's name | C | — | DRAFT | 5 |
| 69 | `footer.amlKyc` sw :5019 | Sera ya AML / KYC | the page's title | C | — | DRAFT | 5 |
| 70 | Rules page name (footer.gameRtp :5015; hub-rows.ts:93-95) | RTP ya mchezo na sheria | "Kanuni za Michezo" key | C+J | r5a :342-346 | DRAFT | 5 |
| 71 | Factual toasts' next step; "Couldn't copy" (share-button.tsx:81; :2672) | no next step | new keys | C | feedback-law | DRAFT | 5 |
| 72 | Agent application errors (apply-client.tsx:198; actions.ts:56-118) | the server's English | reason keys | C | failure-reasons | DRAFT | 5 |
| 73 | `common.confirmDeposit` :3611 | Thibitisha amana | Thibitisha kuweka pesa | C+J | — | DRAFT | 5 |
| 74 | Push settings and the inbox (:4643) | both "Arifa" | a name for the settings page | C | r5g :501-507 | DRAFT | 5 |
| 75 | pnl-summary-strip.tsx:84, :96 | "3 Hai"; W · L · C | lower case; localized | C | — | DRAFT | 5 |
| 76 | Count words (updown-card.tsx:874; market-card.tsx:713) | a bare number | one/many pairs | C | — | DRAFT | 5 |
| 77 | Wallet ledger descriptions (market-service.ts :3528, :3996, :4128, :4271, :4866; wallet-service.ts :257, :861, :1861) | English, cut at 60 | keys, whole titles | C | red:updown-void-copy | DRAFT | 5 |
| 78 | Permanent-exclusion email (email.ts:1692-1693) and its bell notice | "for permanent"; no sw word | "permanently" / "kabisa" | C | rg-email-end | ALI (RG copy) | 5 |
| 79 | K32 (admin/agents/page.tsx:372; agent/status/page.tsx:170-174) | rejected fees only; no refund line | both exits | A + C | — | DRAFT | 5 |
| 80 | Round page "Nafasi zako" (`market.udPositionsOnRound` :4137) | Nafasi zako | Tiketi zako (journey only) | J | — | JOURNEY | 9 |
| 81 | `journey.howStep3Body` zh :8095 | 赢家平分奖池 | 赢家按投注比例分享奖池 | J | — | JOURNEY | 8 |
| 82 | `help.faq6a` :4993 | Ndiyo — | (Open point 29) | C+J | — | HOLD (S11 rewrites it) | — |
| 83 | The dates residue (agent-dashboard.tsx:239; profile/invite page.tsx:607; emails' "Sept") | en-GB | eat-day's localized formatters | C | timer-date | READY (emails: ALI) | 5 |
| 84 | `nav.cardSpacingHint` :3658 | Kwa simu tu. Hakuna kinachofichwa. (two lines beside the switch at sw 360) | a shorter hint that fits one line | C: nav-more.tsx:191; J: card-size-row.tsx:60 | — | DRAFT | 5 |
| 85 | `journey.hubHelpSub` :5606 | Maswali ya kawaida · Simu · Barua pepe | with row 23 | J | — | ALI (default: unchanged) | 5 |
| 86 | `journey.ticketPayoutAtResult` :5595 | Matokeo yakitoka (wraps at 320 for a TZS 1,000,000 stake) | a shorter phrase | J | — | DRAFT | 5 |
| 87 | `common.positionOpenNotify`, the dial's unreachable fallback subtitle (conviction-dial.tsx:1838) | dead branch | removed | none | — | READY (no visible change) | 5 |
| 88 | The game's name: "Juu/Chini" (the tab, `nav.updown`), "Juu na Chini" (the page, `market.udTitle`), "Juu au Chini" (/live, /results, /fairness, new round notices, stored round titles) | three names | one name per role | C+J | — | ALI (S6-VISUAL-PASS-STATE :761) | 5 |
| 89 | `/updown/history`: the side chips' typed arrows ↑/↓ (page.tsx:552); "FAIDA HALISI" counting settled rounds only, with "decided" its only word | text arrows; an unlabelled basis | the glyph; a stated basis | C+J | — | DRAFT | 5 |

The visual pass's earlier triage files (`tools/visual/triage-r3.md`, `-r4.md` and `-r5.md` on
`origin/vodacom-visual-tools`) hold word items that never reached appendix G. WP5 re-measures them and adds each as a
row: "namba ya simu" against "Nambari ya simu" (:3623); "dial" and "popup" inside Swahili; "URL" in Swahili; "ROI bora"
(:4774); 冷静期 against 休息期; the old dial's 倍信念 and 报价保留 (:7680, :7692); zh "{n}小时后" against en "{n}h left";
zh "K" in compact amounts (utils.ts:134); and the en footer's "get / paid" break at 1024.

S6-VISUAL-PASS-STATE's owner questions that S12 would carry only if Ali rules on them (Point for Ali 5 lists them):
- the Swahili leaderboard name, "Bingwa" against "Jedwali la Washindi" (:699-700);
- the break and exclusion emails' new words (:753-756);
- "Sept" in email rows (:758);
- the Swahili selection-closed and cash-out notices that name no market (:759);
- one quote length per notice family (:760; WP12 keeps today's rooms).

In the table, `page.tsx` alone is `src/app/markets/[id]/page.tsx`.

---

## Risks

1. **The dictionary is one file that four sessions edit.** S9's, S10's, S11's and S12's edits land on
   `src/lib/i18n-dict.ts`. S12 edits values by key, never reflows a line, and rebases before each release.
   `test:house-bot-disclosure` §5.1 is red by construction on every branch until main (S8-PLAN :1280): record it, do
   not "fix" it.
2. **A word fix that breaks a measured layout.** Swahili corrections lengthen strings (for example "Malipo ya mwisho",
   or "HALIJAWEKWA na hakuna pesa iliyokatwa"). The measured suites (`test:visual-pass-r4i`, `r7a`, `r9b`, `r10`,
   `test:sell-grace-truth` §5) and the tiles are the proof, re-pinned in the open, never loosened.
3. **A stake carried where the player did not carry it.** Only the player's own tap carries a stake to another round
   (WP11). The automatic hop keeps E-166's rule. A forwarded link never sets a stake (`stakeFromUrl`).
4. **A bet placed without a tap.** No return, poll, refresh or notice calls the commit. `qa:journey-updown`'s wallet
   read-backs are the proof.
5. **A figure that is not the engine's.** The Juu/Chini projection is `projectedReturn`. Every low-balance figure is
   `shortfallPlan`'s. A multiple anywhere fails `test:updown-pricing` §8.
6. **Classic regressions on the Up & Down pages.** Same-slot ternaries, not re-indented; parity v5; `test:red-anchors`
   after WP9 (the Up & Down anchors must resolve exactly once).
7. **Journey code in a classic first load.** `next/dynamic` from a loader (§0h point 20's rule); `qa:first-load` and
   `qa:chunks-prod` are the proof.
8. **A local price feed that moves under a capture.** Parity v5 uses the constant `mock` feed for the open cells and
   normalises only what a null pair proves noisy.
9. **The "back" half depends on S9.** Until S9 is live, a player returns by their own Back. WP10 is proven twice.
10. **Binding texts.** The Terms move only with `TERMS_VERSION` and `TERMS_TEXT_SHA` together, and the rules only with
    their version lines. Each comes with a COMPLIANCE entry ("no right changed").
11. **Responsible-gambling sentences** change only on Ali's yes (S6-VISUAL-PASS-STATE :216-217, :852-854).
12. **Admin swaps are typographic too** (§B2a :305-309). The tiles at rest and on hover are the proof; the contrast
    floor stays 17 by swapping classes only.
13. **The flip's switch must be off now.** WP12 and WP13 carry a test that the full titles are byte-equal under
    STAFF_PREVIEW and WITHDRAWN.
14. **The privacy notice.** A round in `kp-pending-bet` is named in the same commit as its first write, or the commit
    is not shipped (S8-PLAN Risk 13).
15. **Tailwind scans comments.** New files' comments carry no class-shaped strings (S7-PLAN Risk 16); `test:source-bytes`
    catches the rest.

---

## Open points → §0h

Each is a call taken under Ali's delegation, filed as a numbered §0h point by WP0, with its overrule.

1. **S12 starts after S8 has closed and Ali's 2026-10-14 release is live** (`2fd8940e4` on main). Overrule: start WP0–WP7
   (the records, parity, words and console) first. The Juu/Chini packages wait for the ruling's release in any case:
   they edit its files.
2. **S12's done-when** (WP16) replaces §1's "short titles are used outside the site", which cannot hold before the flip:
   - the classic releases are live;
   - Juu/Chini is green on local drives through a staff pass, with parity reading no difference;
   - the flip's pieces are proven inert and named in S15's census;
   - every row of the word ledger is shipped or carries its reason.
   Overrule: hold S12 open until S15 switches the titles on.
3. **The multiplier grammar is withdrawn by the ruling.** Nothing replaces it but the guard (WP9 step 6). Overrule: none
   possible without a new owner ruling (the ruling's "Do not restore").
4. **The journey confirm panel says "Ukishinda ≈ TZS 634"** where today's says "TZS 500 → TZS 634". It is the same
   `projectedReturn` figure, muted, with the same qualifier and no multiple. Overrule: keep the arrow form.
5. **The low state's compact row shows "Ukishinda ≈ TZS x" with no "≈N×"** (the board's ≈1.46× is gone), on the `?side=`
   panel only. Overrule: no compact row on Juu/Chini.
6. **The `?side=` panel's commit is one gold "Weka dau · TZS x"** (the sheet's CTA), not the low board's two disabled
   side buttons. Overrule: the board's two buttons.
7. **The two-way control keeps one-tap betting.** A side tap places the bet at the stake shown, as the board does today
   (the ruling's kept item (c)). Overrule: a side tap opens the `?side=` panel (two taps).
8. **Juu/Chini's journey chips read full figures, and the custom amount is an always-visible field.** The classic arm
   keeps "1K" and "+ Maalum". Overrule: keep "+ Maalum" in the journey arm.
9. **The journey arm's spendable figure is balance plus bonus,** the bet path's. Overrule: the balance alone, as the
   classic arm (F1).
10. **The viewer's facts are rendered into the arm on each server render and poll; no new route.** Overrule: a private
    read like the sheet's `?me=1`.
11. **"Tumia {amount} badala yake" sets the stake and never places.** Overrule: it places, as the sheet's "Weka dau la …
    badala yake" does.
12. **The deposit door opens today's deposit page with `bet=udr_…` until S9's screen is live,** and the privacy notice
    names a round in the same commit. Overrule: leave `bet` off until S9.
13. **Only the player's tap on "Nenda kwenye raundi inayofuata" carries the stake to the next round.** The automatic hop
    keeps dropping it. Overrule: carry the side only; or carry it on the automatic hop too (not recommended: E-166 rule
    3).
14. **The money line shows only with a confirmed deposit from S9's owned status.** The next round's time shows only with
    a server instant. Overrule: always show the title and the button, without either line.
15. **The Juu/Chini receipt keeps its "Projected return" row** for journey readers (the ruling's item 4). Overrule: drop
    it for journey readers, to match the sheet's receipt (SJ-4).
16. **Juu/Chini's guest arms stay as they are;** S10 does not reach rounds. Overrule: a guest Juu/Chini panel in S12.
17. **The card's pool split row stays as it is** until Ali rules on the ruling's item (a). The board's "Bwawa · Juu TZS x
    · Chini TZS y" line is not added. Overrule: draw the board's line.
18. **Release W is one classic release, proven at one tip.** Overrule: one release per package.
19. **The classic Sell button keeps "Toka bila gharama · Hakuna ada" until the flip.** The journey's tickets already say
    "Uza bila ada hadi …", and re-measuring the S6 A8d/A8g fits for a look the flip retires is not worth it. Overrule:
    change it now, re-measured.
20. **Responsible-gambling sentences change only on Ali's explicit yes** (ledger rows 9 and 78).
21. **The Terms §4 and the YES/NO rules §1 are corrected now,** each with a new version and a COMPLIANCE entry. A Terms
    bump forces no re-acceptance (terms-version.ts:52-53). Overrule: wait for S11's flip-time Terms version.
22. **Comms switch to short titles at ACTIVE, not before.** The emails' title line stays English, and the rooms stay.
    Overrule: switch now for every player; or add a Swahili title line.
23. **Share pictures get the no-multiple guard now and the short title at ACTIVE.** Overrule: the short title now.
24. **The manifest is prepared by S12 and applied by S15:** Maswali and Tiketi zangu shortcuts, Weka pesa kept, the
    tagline name, new icon names. The screenshot comes after the flip. Overrule: other shortcuts.
25. **SMS gets a census guard only.** Overrule: none needed.
26. **"Paid out" is measured first, then Ali chooses** (WP7). Overrule: filter without measuring.
27. **F1 and F2 are not S12's.** Each is recommended as a live fix in its own release, F2 after a drive confirms it.
    Overrule: fix them inside S12's releases.
28. **S8's journey copies stay after the classic keys are corrected.** They differ by "swali" against "soko" until
    S15's convergence. Copies that become identical are listed for S15. Overrule: point the sheet at the corrected
    classic keys now.
29. **Small calls in the ledger:**
    - `common.depositStarted` stays classic (it would collide with the withdrawal's eyebrow);
    - `market.volume`'s en and zh are left ("Volume", 成交量) while the sw says "Bwawa", until S15's words;
    - `nav.cardSpacing`'s privacy words go with the notice's next version;
    - `faq6a` keeps "Ndiyo" (S11 rewrites it);
    - stored criteria are not rewritten, and the AI generator learns NDIO.
    Overrule: any of them.
30. **The console's Debit, Suspend and Remove take danger; Credit, Restore and Reopen take the brand ink** (the console's
    `primary`). Overrule: the success family for the restoring actions.
31. **S12's journey keys get a hash-pin exemption in S8's form.** Overrule: record the disclosure guard red until main,
    as S6 and S7 did.
32. **The sheet's low block is extracted, and both hosts draw it** (byte-identical for the sheet). Overrule: a Juu/Chini
    copy (two definitions of one block: §0a).
33. **S12 corrects grammar and meaning on classic keys, but renames no "soko" to "swali".** That rename is S15's Maswali
    sweep (§3.9 :4783-4784). Applying it now to the review-2 rows that are only that rename (`hedgeAddBody`,
    `common.marketClosed`, the three other "Soko limefungwa" lines and `common.marketStoppedPredictions`) would put
    "swali" beside "soko" on the same classic screens until the flip. Their journey copies already say "swali".
    Overrule: rename them now.
34. **A round bet placed after a journey deposit's return counts toward "deposit → bet"** (§3.10) under S9's
    verified-origin rules: the same owned CONFIRMED deposit, the saved round, side and stake, within 30 minutes (S9-PLAN
    WP7). The deposit was made for that bet. Overrule: the agency's measures count YES/NO bets only, and a round bet
    carries no `deposit_return` origin.
35. **One name for one thing: WP5's ALI rows ship only with Ali's answers,** and until then each keeps today's words.
    The defaults offered are:
    - the limits page is "Uchezaji salama" in sentences and "Weka mipaka" on its doors (review 8's rule, S4-COPY-AUDIT
      :411-413);
    - "Mubashara" for LIVE in sw, 直播 in zh;
    - "Batili" for a void;
    - "Imetatuliwa" for a settled question;
    - "odds" kept inside Swahili sentences;
    - "Juu na Chini" on pages and "Juu/Chini" on the tab;
    - the help line's long form, "Maswali ya kawaida · …". "Maswali" alone is now the questions tab's name (SJ-19), so
      the short form would read as that tab.
    Overrule: any default.

## Points for Ali

1. [Point 1] S12 begins once the bet sheet's session is finished and your "keep up and down only" change is live,
   because both touch the same Up & Down screens. Overrule: let the word fixes and the admin buttons start earlier.
2. [Point 26] "Paid out to players" on the home page also counts money the house accounts won. Choose:
   - (A) leave the house out;
   - (B) keep it as is;
   - (C) remove the figure;
   - (D) leave it until the launch, when that home page goes away anyway.
   We first measure the honest figure, read-only, and show you both numbers.
3. [Point 27] Two Up & Down problems found while planning, each a separate quick fix if you want them now:
   - (a) a player whose bonus covers a stake is told "not enough balance";
   - (b) during a round's last seconds a fresh load of the Up & Down page does not show that round.
4. [Point 20] Two responsible-gambling sentences need your yes:
   - the session-limit refusal's Swahili grammar fix;
   - the permanent self-exclusion email, which says "for permanent" and has no Swahili word for "permanently".
5. [Point 35] One word for one thing. Our recommendation comes first in each:
   - the limits page: "Weka mipaka" on the buttons and "Uchezaji salama" as the page name (today four names);
   - "LIVE": "Mubashara" everywhere ("hai" today in counts);
   - a voided bet: "Batili" everywhere ("Imebatilishwa" on one filter);
   - a settled question: "Imetatuliwa" (or "Imekamilika");
   - "odds" inside Swahili sentences: keep the word (players know it), or a Swahili word;
   - the game's name: "Juu na Chini" on pages and "Juu/Chini" on the tab ("Juu au Chini" goes);
   - the help line: keep "Maswali ya kawaida · Simu · Barua pepe" (the short "Maswali" now also names the questions
     tab), and let the row take two lines on a small phone;
   - Chinese "LIVE": 直播 everywhere.
   Five more questions from the visual pass also wait for you: the leaderboard's Swahili name; new words for the break
   and exclusion emails; "Sept" in emails; whether the Swahili selection-closed and cash-out notices name the question;
   and one quote length for every notice.
6. [Point 21] The Swahili Terms and YES/NO rules spell the side "NDIYO". We fix them now with a new version (no rule
   changes, nobody re-accepts). Overrule: wait for the launch's Terms update.
7. [Points 4, 5, 15] On the new Juu/Chini screens:
   - the betting panel says "Ukishinda ≈ TZS 634" instead of "→ TZS 634", the same figure;
   - the "not enough balance" view shows that figure without any multiple;
   - the receipt keeps its "Projected return" row, as your ruling keeps it.
   Overrule any of the three.
8. [Point 13] After a player pays and the round has closed, "Go to the next round" takes their side and stake to the
   next round. They still tap to bet. The automatic jump to the next round never carries a stake.
9. [Points 22, 23] Short questions in emails, notifications and share pictures switch on at launch, not before, and only
   where an officer approved a short question. Emails keep their English question line.
10. [Point 24] The phone's home-screen shortcuts (Maswali, Tiketi zangu) and the app's name change at launch, with a new
    screenshot after launch.
11. [Point 23] The share picture still shows the YES/NO percentages and an English question. Keep both?
12. [Point 17] Your 2026-10-14 ruling left the pool split on Up & Down cards ("Up 75% · 25% Down") for you. The new
    Juu/Chini screens follow your answer: keep or remove.
13. [Point 30] In the admin console, Reject, Debit, Suspend and Remove turn the danger red, and Approve, Credit, Restore
    and Reopen turn royal. Resolve YES/NO stays green and red: it is a betting side.
14. [Point 19] The old Sell button's words stay until launch. The new ticket screens already use the new words.
