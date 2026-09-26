# MOBILE VISUAL PLAN — 50pick on a phone

> **STATUS: 🟠 PLAN v3 — approved by Ali 2026-09-15; seven-lens review (§13), a full element inspection (§3a) and a professional critics panel (§3b) folded in 2026-09-16. In progress since 2026-09-22 — the tally is §1 (S1 done: U1 the baseline instrument, U2 the Card spacing switch).**
> This file is a RECORD and a WORK ORDER, **not** design law.
> The law is [`DESIGN_AUTHORITY.md`](DESIGN_AUTHORITY.md); token values live only in `src/app/globals.css`. This file mints no
> law. Where it quotes a number, the number is a measurement with a date or a target with its arithmetic, never a definition.
> Sibling record: [`PLAYER-VISUAL-2026-09.md`](PLAYER-VISUAL-2026-09.md) (measured 390/768/1024/1280/1920). **It never measured
> 360 or density**, and that is the gap this plan fills.

| | |
|---|---|
| **Opened** | 2026-09-15, on Ali's instruction ("full plan for mobile visuals … something perfect for mobile") |
| **Approved** | Ali, 2026-09-15, with owner decisions 1–10 in §4 answered explicitly |
| **Scope** | every player surface **on a phone**: portrait widths 320–639px, and the phone conditions a portrait screenshot never shows (short screens, landscape up to 1023×480, the on-screen keyboard, notches and installed-app mode, large system text, budget-phone CPU and motion tier, loading/empty/error/offline states, touch behaviour, browser and in-app-browser compatibility). Surfaces: market board, header, home, market detail, chat bubble, popups and questions, toasts, celebrations, notices, notifications, page shells, footer, copy. ⛔ Admin excluded |
| **Branch** | `main`, one unit per commit (push = live deploy) |
| **Live state** | ⚠️ re-derive every session: `git log --oneline -1 origin/main`. A merge state written in a table has a shelf life |
| **Evidence** | `.qa-shots/mobile-visual/<unit>/<before\|after>/` (gitignored, per DESIGN_AUTHORITY §0b). Only numbers are written here |
| **Findings record** | [`MOBILE-VISUAL-FINDINGS-2026-09.md`](MOBILE-VISUAL-FINDINGS-2026-09.md) — all 718 inspected items with evidence and verdicts |
| **Unseen-conditions record** | [`MOBILE-VISUAL-UNSEEN-2026-09.md`](MOBILE-VISUAL-UNSEEN-2026-09.md) — 2026-09-23, the seven conditions the §11 matrix defined and never ran, on production: **39 claims, 23 confirmed, 16 refuted**, each survivor re-measured by an adversarial verifier. D56–D70 come from it |
| **Tracker guard** | `npm run test:mobile-visual-plan` (RED control: `npm run red:mobile-visual-plan`, 19/19 planted lies caught, incl. a defect with two different owners and a table that no longer renders). Run it at the start and the end of every session |
| **Critics panel** | §3b — six professional lenses on live phone frames; baseline 5–6.5/10. Re-run at the Seal: `scripts/live/mobile-visual-capture.mjs`, then the `visual-critics-panel` workflow |

---

## §0 — RESUME AT

### ⛔ IS MOBILE VISUALISATION DONE? **NO.** Read this before telling anyone otherwise.

Ali asked on 2026-09-25 whether the programme was finished. It is not, and the honest figure is
worse than the unit count suggests. Updated at the end of every session; `test:mobile-visual-plan`
enforces that these numbers agree with §1 and with `NEXT-PLAN.md`.

| | |
|---|---|
| **Units** | **12 of 42 ✅** (U1 U2 U3 U4 U5 U6 U7 U33 U34 U37 U41 U42) · 1 🔵 shipped-not-closed (U25) · **29 not started** |
| **Defects** | **90 filed, 15 ✅** · the rest are 🔵 live-but-unclosed, ◐ half-done, or ⬜ open |
| **Closure conditions (§1a)** | **9, of which 4 are partly under way and 5 HAVE NOT BEGUN** |

⭐ **THE UNIT COUNT IS THE OPTIMISTIC NUMBER, AND ANYONE READING ONLY IT WILL MISJUDGE THIS.**
"12 of 42" measures the unit queue. Five of §1a's nine closure conditions are whole-programme
activities that no session has started, and none of them shrinks as units close:
 1. ⬜ **U31 — the inspection backlog: 379 🕓 items** in the findings record, none verified or refuted.
    This is the single largest piece of remaining work and it is not a unit's worth, it is a
    session's worth several times over.
 2. ⬜ **§11's acceptance table re-measured on production in ONE final run** — every width × locale
    × density × condition, with the numbers written in beside the targets. Never done end to end.
 3. ⬜ **U30 on real phones** — keyboard, large text, TalkBack, WhatsApp in-app browser, installed
    app, landscape, battery saver, plus axe at 0 serious/critical with overlays open. **Needs Ali's
    handsets; nothing on this machine can do it** (Playwright reports every safe-area inset as 0).
 4. ⬜ **The critics panel re-run at the Seal** on the same nine surfaces, with nothing the
    verifiers mark `new` or `known` still visible on production.
 5. ⬜ **Ali's sign-off on the final before/after contact sheet** (§8a), recorded in §2.

⚠️ **AND THE DEFECT COUNT GREW FASTER THAN IT SHRANK THIS SESSION** — 6 closed, 6 new ones filed
(D85–D90), every one found by building a gate rather than by looking for them. Four of the six were
invisible to every check in the repository. **Expect the register to keep growing while units close;
that is the programme working, not failing.** A session that measures its own success by the defect
count falling will stop looking.

⭐ **WHAT IS ACTUALLY TRUE, AND WORTH SAYING TO ALI:** the surfaces a player meets first — the board,
the market card, the discovery bar, the header, home, the chat bubble, the sign-up funnel, /fairness,
the signed-in header cluster and the market detail page — are done, measured on production, and each
carries a guard proven RED against a product mutation. What remains is mostly the depth behind
them: overlays (U11 gates seven units), touch behaviour, short screens and landscape, the keyboard,
safe areas, large text, the empty/error/offline states, and the 379-item backlog.


**Starting a session on this plan** (Ali, 2026-09-15: every later session starts here, with the progress):
1. `git pull` then `git log --oneline -5 origin/main`. A commit newer than §2's last entry means another session is in flight; coordinate first.
2. Read this §0 block, then the §1 status board, then §5 (hard rules), then the two units named in **NEXT** below (§9).
3. Work those two units exactly as §11 (Verification) says: RED guard first, gates twice, docs in the same commit, push, production re-measure.
4. Close the session by rewriting this §0 block, ticking §1, adding a §2 entry, and updating the board row in `NEXT-PLAN.md`, all in the closing commit.

```
▶ SESSION CLOSED 2026-09-25 (S19h) — this block replaces the previous one
  **12 of 42 units closed · 90 defects filed (D85–D90 are new) · U37 ✅ CLOSED on production.**
  Verified on `9cb5438d`: `qa:detail-order-hints` GREEN over 9 cells, the chart rendering on 15 of 15
  market×width pages with zero errors, and the chart's `<h2>` in the outline with its name resolving.
  Shipped, guarded and LIVE this session: **D46 · D85 · D86 · D87 · D88 · D89** (`eb4acd4a`).
  `qa:detail-order-hints` now runs **five** sections and is GREEN over 9 cells on production;
  `test:time-axis` is new (28 assertions, its own in-process RED control).

  ⭐ **THE BIGGEST FINDING IS NOT A DEFECT, IT IS A HOLE IN THE GATES.** D85 and D86 were 24px and
  22px under Law 9's floor, on the page U37 had just finished, and **not one check in this
  repository could see either**. `tap-target.test.mts:344` skips any interactive tag that declares
  no height — *"declares nothing — the rendered half's job"* — an honest deferral to a rendered
  gate whose population never included the comment thread; `qa:tap-truth`'s surfaces do not cover
  it; and §4 of this very driver scopes itself to three known triggers, so it answers a confident
  zero for every other control on the page. ⛔ So the new §5's population is **THE PAGE**, not a
  list. A list is maintained by the same people who forget.

  🔴 **AND §5 CRIED WOLF TWICE BEFORE IT WAS HONEST — THREE INSTRUMENTS FOR ONE QUESTION.**
   1. Judging `getBoundingClientRect` convicted the market card's Details and share controls at
      13×17 and 64×17 in all nine cells. Not defects: **D28 gave each a 40px `::after`**, which is
      this project's sanctioned pattern, and §6 records that the card footer's gap and padding
      exist to hold it. The reach is real; the element's own rect cannot see it.
   2. Probing a 40px square by `elementFromPoint` convicted the same two again — because they are
      **neighbours ~20px apart**, so a square centred on one must overlap the other. Two adjacent
      controls cannot each own a clear 40px square, and Law 9 does not ask them to.
   3. The honest instrument is the **hit area: the box UNION its pseudo-elements**, read the same
      way D28 accounted for it. It credits the `::after` pattern, no neighbour can make it fail,
      and it is what finally surfaced D88 and D89.
  ⭐ A gate that convicts a closed, shipped fix is worse than no gate: it teaches people to ignore
  it. Every exemption §5 grants is now PRINTED, because an exemption nobody reads is how a gate
  stops policing the thing it was written for.

  ⭐ **D89 IS THE ONE TO REMEMBER: A FLOOR BOUGHT FROM TEXT WIDTH HOLDS ONLY IN THE LANGUAGE IT WAS
  MEASURED IN.** The card's Details control has its 40px height engineered to the pixel (9 + 17 +
  14) and its WIDTH left to the translation, because the `::after` is `left:0; right:0`. Measured:
  **63.9 wide in Swahili, 56.4 in English, 38 in Chinese** — under the floor, in every width, since
  D28 closed it. ⛔ This plan's §A5 lens watches Swahili running 35–40% LONGER, which is the SAFE
  direction; it is SHORT text that breaks a width-driven target, and Chinese is the short case here.
  Re-measure every width-derived target in zh, not just sw.

  ⛔ **D46'S FIX NEARLY BECAME A WORSE DEFECT THAN D46.** Filling the axis with whitespace is
  correct, but `lightweight-charts` refuses to draw below `minBarSpacing`, default **0.5px**, and
  the plot is **190px at a 320 viewport — measured, against the 210 first estimated**. That is a
  ceiling of 380 slots; a 2,000-slot series would have clamped and shown the player **about a tenth
  of their market's history, looking entirely normal**. The budget and the floor are now stated
  together in one file and `test:time-axis` §7 asserts the PAIR, so neither can be raised alone.

  🔴 **TWO RED CONTROLS BROKE A SECTION THEY WERE NOT NAMED FOR, BOTH BY DOM SURGERY.** RED_ORDER
  moved the aside with `content.after(aside)` and RED_HEAD removed the heading node — faithful to
  the pre-fix markup, and both made §4 report `trigger is 0x0` in some cells, because **this page
  re-renders on a timer** (the countdown and the poller) and React reconciles against a tree the
  harness has cut. The harness refused to certify either, which is the "each control breaks its OWN
  section" rule earning its keep for the second session running. Both are now **CSS-only and
  attribute-only**: RED_ORDER inverts the visual `order` (which is exactly the property §1 asserts)
  and RED_HEAD unwires `aria-labelledby` and the heading's id. ⛔ **Never mutate the DOM of a page
  that re-renders**, and note that a `0×0` box is now reported as an INSTRUMENT FAILURE rather than
  a tap-floor finding — a node that is not laid out has not been measured.

  ⭐ **U35'S LAST STEP IS NO LONGER BLOCKED, AND THE MECHANISM IS PROVEN END TO END.**
  `qa:updown-history-strip` is written and committed. On 2026-09-25 it placed **12 bets that each
  moved the wallet** and watched `updown-handover` settle rounds with real UP/DOWN outcomes. It has
  not yet produced **13 settled rounds in one clean run**, which is the floor for two pages
  (`PLAYER_PER_PAGE` = 12), so D37's strip has still not been watched across a page turn. What is
  left is mechanical, and three things are now known that were not:
   · ⛔ **`updown-advance` CAN NEVER SETTLE A ROUND** — its own header says so, and the first
     version of this drive was built on it: three bets landed, three rounds VOIDED, three refunds,
     and a P&L strip reading `TZS 0 · 0 decided`. A green-looking run about nothing. Use
     `updown-handover` (`arm` then `settle`); it reports the round it opened and closed BY ID.
   · ⛔ **THE LEAD IS ARITHMETIC.** Betting stops at `close − resultPhaseMinutes`, which is 60s for
     a 5-minute chain and **180s for a 15-minute one**. A `leadSeconds` at or under 180 arms every
     15-minute round ALREADY LOCKED and the round page renders no commit button at all. Use 200+.
   · ⛔ **`/auth/demo` RESETS THE DEMO PLAYER'S BALANCE**, so fund AFTER signing in — and never
     above the compaction threshold: `seed-wallet` answered `balance 5,100,000` and the page then
     read **`TZS 2`**, because a naive `TZS ([\d,]+)` read of "TZS 2.1M" returns 2. The drive now
     REFUSES a compacted figure instead of parsing one.

  ⚠️ **AND THE DEV SERVER DIED MID-SESSION, WHICH IS WORTH KNOWING BEFORE IT COSTS AN HOUR.** After
  a `globals.css` edit, Turbopack's CSS worker crashed (*"failed to receive message / reading packet
  length"*) and EVERY route began answering 500 — not a CSS syntax error, and `tsc` stayed clean
  throughout. A restart fixed it. ⛔ A fresh `next dev` starts with an EMPTY in-memory store, so
  re-seed (`POST /api/dev-test/seed-markets`, and `stress-bulk-bet` for probability history) before
  believing any measurement. ⚠️ Editing source while a drive runs against the same server is what
  broke the first full drive run — sequence them.
  Shipped, guarded and LIVE: **D40 and D41** (`ee55a509`), the two open halves of **U37** that
  can be done from here. `qa:detail-order-hints` is **GREEN over 9 cells on production**
  (320/360/412 × sw/en/zh, signed in as `mobile01` with a side picked) after **171 failures**
  against the same tree before the deploy — which is the strongest RED control available: the
  absence of the fix, not a plant. All four env controls then broke their own section and only
  their own (RED_ORDER 18 · RED_HEAD 18 · RED_FIT 53 · RED_TAP 54).

  ⭐ **WHAT WAS ACTUALLY WRONG WAS WORSE THAN BOTH CELLS SAID.**
   · D40 said "announced last". It was also announced **with no name and no heading at all**:
     for a signed-in player the bet `<aside>` had neither, so the outline read h1 → "Nafasi zako"
     → **"Kigezo cha utatuzi" → the entire bet widget**. The money control was read under the
     heading for the small print. And the grid has **three** children, not two.
   · D41 said "~4× the screen width". Measured: **1392.8px on ONE line in a 320px viewport, 23%
     of it readable** — and the other 77% **could not be scrolled to**, because `body` is
     `overflow-x: clip`. It also rendered **in CAPITALS at 11px**: `.kp-tooltip-popover` sets
     font, size and letter-spacing and never `text-transform`, so 201 characters of fee copy
     inherited `uppercase` from the eyebrow it hung off. No cell mentioned that.

  ⛔ **TWO THINGS I ALMOST FILED AND DID NOT — BOTH WOULD HAVE BEEN WRONG.**
   · A §5 overflow breach. `body.scrollWidth` reads **763 against a 320 viewport** with the dial
     open, and exactly **320** with the dial absent, so the popovers were provably the cause.
     But **`scrollX` stays 0** — at both widths, at the top and at the dial. The clip means the
     page never moves. `qa:signup-funnel` §1 already warns `body.scrollWidth` over-reports
     clipped content; **read scrollX before calling anything an overflow.**
   · A retired fee rule in live copy. The hint says commission is "9% of the pool but never more
     than 33.3% of the smaller side", which is the **retired** capped-commission formula that
     `house-lean-warning.tsx` and D36's cell both warn about. It is **correct here**: this branch
     renders only for a `capped-commission` poll, where `fee = min(commissionRate·pool,
     feeCeilingRate·smaller)` is live (`payout.ts:91,93,493`), and the copy READS both rates
     rather than hardcoding them. ⚠️ Do not "fix" it.

  ⭐ **THE GUARD FOUND A FLAW IN ITSELF, AND THAT IS THE POINT.** RED_ORDER broke §1 *and* §2,
  so the harness refused to certify it. The control was right and the GATE was wrong: where the
  panel's heading falls in the outline is a reading-order fact, and it was filed under naming.
  Moved to §1, with a tri-state (`null` = no heading to place, which is §2's finding) so the two
  sections cannot both report one defect. Keep the "each control breaks its OWN section" rule —
  it is the only reason this was visible.

  ⚠️ **THE TAP FLOOR AND §8a DID NOT ACTUALLY CONFLICT, BUT ONLY BECAUSE IT WAS MEASURED.**
  A 40px box on a 14px eyebrow line looks like it must push the stake input down; the four-edge
  probe showed a 40px square's bottom edge landing on `<input>`, and the input is a LATER sibling
  so it wins the overlap. `relative z-10` plus the §L6 negative-margin pattern gives the control
  its reach and gives the height back: **rows 88.5/66.5/146.5 and the aside's 889px are identical
  with the 40px trigger and with it collapsed to the bare glyph.** The floor cost **0px**. ⛔ That
  claim is a DELTA measured on one page, not a single number — do not report the second kind.

  🔴 **A FILE-LEVEL TRAP THAT COST THIS SESSION TWO DETOURS AND WILL COST THE NEXT ONE MORE.**
  `docs/MOBILE-VISUAL-PLAN.md` does **not have one line ending**. Most lines end `\r\n`; a long
  stretch ends **`\r\r\n`** (a double CR). Reading it as TEXT with universal newlines splits every
  one of those into two lines — **2445 lines became 4682** — and writing it back turned a
  four-line edit into a **7127-line diff**, on a file three sessions are merging today. It also
  made `test:mobile-visual-plan` §7 report every table in the file as broken, which reads like a
  content error and is not one. ⛔ **EDIT THIS FILE AS BYTES**, match anchors with `\r?\r?\n`, and
  re-use the ending the matched span had. The patch scripts that do it are in the session
  scratchpad. ⚠️ `git diff --numstat` after every doc edit: if it is not ~1 line per line you
  changed, you have renormalised the file.

  ⚠️ **A GUARD THAT CAN ONLY RUN AGAINST PRODUCTION CANNOT BE PROVEN RED BEFORE THE DEPLOY**, and
  that is the wrong way round. `qa:detail-order-hints` takes both doors: `mobile01` through the
  real form on production, `/auth/demo` when the target is localhost. That is what made the four
  controls provable on a FIXED tree before pushing. Write new live gates this way.
  ⛔ And it nearly signed in against `http://localhost:3001` while measuring production, because
  the harness reads `LIVE_BASE` and the driver read `argv`. Two sources of truth for one address;
  §0a warns the failure "reads exactly like a bad password". The driver now sets `LIVE_BASE` from
  its own resolved base before the harness module is evaluated, and asserts the two agree.

  ⛔ **THE REGISTER IS DRIFTING FASTER THAN IT IS READ. Do not trust a cell you have not checked.**
  This session found, in six defects: THREE citations pointing at files that do not exist
  (`components/market/` for `markets/`), TWO prescribed remedies that were actively HARMFUL
  (D29's "one token" would have lied to screen-reader users; D42's cell had every figure stale by
  ~40 rows), ONE unit body prescribing the very instrument §0 trap 3 forbids, and FIVE false
  statements about D31. Every one is struck in place rather than deleted.

  ⭐ **THREE GUARDS WERE PROVING NOTHING, AND ALL THREE SAID SO IF YOU LOOKED:**
   · `red:labels` scored 10/12. Chasing the gap found `stripComments`, whose JSX-comment rule used
     `\s*` — which crosses NEWLINES — so an object literal's `{` followed by a doc comment opened a
     match running to a distant `*/ }`. **7,077 lines of real code hidden across 76 files**,
     including 867 of `i18n-dict.ts`, the dictionary that suite exists to police. Now 12/12.
   · `red:tap-rung` scored 1/2 and printed "⛔ ANCHOR NOT FOUND — the harness is stale, not the
     gate". Its CashEye mutation described pre-D78 markup. Re-pinned. Now 2/2.
   · A second `red:labels` mutation had the same drift (`opacity-85` the call site had dropped).
  🔑 A harness that reports a failed injection instead of scoring it CAUGHT is the only reason any
  of this was findable. Keep that property in anything you write.

  ⭐ **DEV HYDRATES. THE BLOCK BELOW IS STRUCK — IT IS THE STALEST THING IN THIS FILE.**
  Re-measured 2026-09-25 on the `next dev` server in `F:\kipindi-main`, signed in through
  `/auth/demo`, with markets seeded by `POST /api/dev-test/seed-markets`. **Three reads per route,
  identical every time:** `/` **775 of 919** · `/markets` **1123 of 1286** · `/updown`
  **319 of 457** · `/markets/<id>?side=YES` **781 of 931**. Production `/updown` was 215 of 543,
  so dev is hydrating at a HIGHER ratio than production.
  ⭐ **AND A COUNT IS ONLY A PROXY — THE FUNCTIONAL TEST PASSED TOO.** A real Playwright click on
  each of D41's three new disclosure triggers flipped `aria-expanded`, opened that panel, shut the
  other two, and a second click closed it. React state runs. **A click in dev CAN change state**,
  which is the premise item 1 below was blocked on.
  ⚠️ **WHAT IS STILL UNKNOWN IS WHY.** Nothing in the repo changed to cause it, and PID 688 —
  the very server that read 4 on 2026-09-24 — is the one that read 775. Two candidates, neither
  proven: the 09-24 probe ran against an **empty in-memory store** (the board seeds nothing on
  boot — this session found 0 markets before seeding), and it ran **signed out**. So do not treat
  "dev hydrates" as settled either: **probe it, every session, before planning a drive.** The probe
  and the COUNT-not-a-boolean rule below are the durable part of this block.
  `[...document.querySelectorAll("*")].filter(e=>Object.keys(e).some(k=>k.startsWith("__react"))).length`
  ⛔ COUNT, never a boolean — "any react props?" answers true for 4 head nodes, and that is how
  the 09-24 session first concluded, wrongly, that the home page hydrated.
  ⚠️ One door genuinely IS shut, and it was mis-stated: **`npx next start` cannot serve this repo at
  all** — `.env.local` carries no `DATABASE_URL`, and the instrumentation hook refuses the
  in-memory store outright ("must never serve production traffic"), so every route 500s. `next dev`
  is the only local host, for that reason rather than the hydration one.

  ⚠️ **NEW, UNFILED — file these properly:**
   · **the settled Up & Down card's quote stamp is TODAY'S read.** `updown/page.tsx` hands every
     card `sourceQuotedAt={activeAsset!.sourceQuotedAt}` — asset-level — so a round that settled an
     hour ago footers "quoted 01:54:11" against the CURRENT quote. `/updown/[roundId]` is wrong the
     same way, so "two surfaces disagree" does NOT catch it. `proof.closeQuotedAt` exists but only
     on the DETAIL payload; `BoardRound` has no such field, so this needs a payload change.
   · **`/markets` carries a 12px body overflow at 320** (bodyScrollWidth 332 vs client 320),
     identical before and after any interaction; the widest boxes past the edge are `.kp-fchip`
     rail chips. Measured 2026-09-25, signed in. NOT caused by D31 — checked as a delta.
   · **`test:updown-source-class` is RED on main** (`0f01c28f`) and is NOT in `predeploy`, so it has
     failed unwatched. It is a FALSE positive — `updown-board.ts:1032` hands `sourceDomain` to a
     SERVER call, not the client payload — but a vendor-leak guard nobody watches is worth nothing.
   · **`results/page.tsx:481`** has a `<MarketCard>` call site that rendered zero cards on
     production, so `test:outcome`'s rule 2 may be governing an unreachable site.

▶ NEXT: **U35** (13 settled rounds in one run, then close it), then **U11**, **U27**, **U31**, **U9** — money truth first.
  Ranked by (player harm × confidence it is real × cheapness to verify), NOT by unit number.

  1. ⭐ **U35's LAST STEP — D37's strip, on a screen.** Everything else in U35 is live and
     verified. D37's money is proved by `test:updown-history-pnl` (26 assertions, 6/6 mutations)
     and its FIT by `scripts/live/ops/d37-tile-fit.mjs` against production's own stylesheet — the
     old markup spilled **72 / 52 / 26px** at 320/360/412, the new spills **0**. What is missing is
     watching the real strip, fed by real rows, hold still while the player pages 1 → 2.
     ⭐ **THE LOCAL DOOR IS OPEN AGAIN — START HERE, IT IS THE CHEAPEST THING IN THIS LIST.**
     **Dev hydrates and a click changes React state**, both measured (see the ⭐ block above), and
     on 2026-09-25 a drive placed **12 real bets that each moved the wallet** and watched
     `updown-handover` settle rounds with real UP/DOWN outcomes. The production door is still shut
     and still needs Ali —
     `mobile01` is wallet 0, never funded, and Ali declined funding it — but that is now the
     FALLBACK, not the only route.
     ⚠️ The local route needs three things the 09-24 attempt did not have, and the first is why it
     found nothing: **seed the store** (`POST /api/dev-test/seed-markets`; the board is EMPTY on
     boot), **sign in** (`/auth/demo`), and **use `next dev`** — `npx next start` 500s on this repo
     for a reason unrelated to hydration (no `DATABASE_URL`). For Up & Down specifically there are
     `api/dev-test/updown-seed`, `updown-advance` and `updown-handover`.
     ⛔ STILL DO NOT SKIP THE PROBE. Count `__react` props on the actual route before driving it,
     and ⛔ do not trust a drive's own success line — §2's S19c entry records one that reported
     "16 bets placed" with zero landed. Assert the MONEY MOVED.
     ⭐ **THE DRIVE IS COMMITTED AND TWO OF ITS THREE SECTIONS ARE PROVEN** —
     `npm run qa:updown-history-strip -- http://localhost:3000`
     (`scripts/live/updown-history-strip-drive.mjs`). It refuses a non-local base, because it seeds,
     funds a wallet and drives chain boundaries through `/api/dev-test/*`, which 404s in production.
     Run 2026-09-25: **13 bets landed, every one asserted by the WALLET FALLING**, and:
      · ✅ **§2 — D37's actual claim, on a real two-page history.** Page 1 and page 2 printed
        **identical** figures (`RAUNDI 20/20 dau`, `TZS 20,000 → TZS 20,000`) while listing
        **different rounds — 12 against 8, no overlap**. The pager moves the list and never the
        figures. The anti-vacuity halves both held: the pages genuinely differ, and the figures are
        non-zero.
      · ✅ **§3** — no tile spills and no figure is clipped at 320/360/412.
      · ⛔ **§1 — NOTHING THE PLAYER BET ON SETTLED**, so Net return read `TZS 0` and Win rate `0%`.
        Page-turn invariance for a NON-ZERO net is therefore still unshown. That is the whole of
        what is left.
     🔴 **AND THE FIRST FIX FOR IT WAS WORSE THAN THE PROBLEM — READ THIS BEFORE TOUCHING THE
     SETTLE STEP.** Settling 4s past the close resolved nothing on three of four cycles, so a
     six-attempt retry loop was added. It DID start resolving rounds (cycle 5: three, UP/DOWN/UP) and
     the drive STILL reported `0 rounds resolved` — because **every failed attempt calls
     `advanceChain` too, which OPENS A SUCCESSOR.** By the attempt that finally resolved,
     `latestForChain` was several rounds past the staked one, so what settled was a round nobody had
     bet on. **A retry against an endpoint that also ADVANCES is not a retry.** The real cause is
     ordinary: `advanceChain` needs a CONFIRMED close price and the observation arrives on a cadence,
     not at the boundary — a manual settle several MINUTES later resolved 4 of 4.
     🔴 **AND THE SECOND FIX WAS WRONG TOO — MATCHING THE REPLY'S ROUND ID.** It reported
     "resolved 4, of which 0 were bet on", four cycles running. The endpoint settles
     `latestForChain`, and its OWN header warns that `roundStore.list` sorts by `boundaryAt` DESC, so
     on a store carrying rounds from earlier cycles the newest BOUNDARY is not the round just opened.
     ⭐ **The lesson is to stop asserting on the mechanism and assert on the PRODUCT**: the history
     page states "N decided" in its third tile, which is the number the player reads and cannot be
     confused by a stale boundary.
     🔴 **AND THAT IS WHEN THE RUN WENT GREEN FOR ENTIRELY THE WRONG REASON — THE MOST IMPORTANT
     THING ON THIS ITEM.** It reported **GREEN, "50 rounds resolved"**, with the strip reading
     `0/50 decided`, `TZS 50,000 → TZS 50,000` and a net of **`TZS 0`**. Fifty rounds had settled and
     **every one of them VOIDED**, so the stakes were refunded whole and nothing was won or lost.
     "The figures did not move across the page turn" was true of a strip with **no P&L in it**, and
     the `decided` count could not catch it because **a voided round is still resolved**.
     ⛔ So §2 now also requires the NET to be non-zero and staked to differ from returned, and reports
     BLIND by name otherwise. **The remaining work on U35 is exactly one thing: get a DECISIVE
     settle** — `feedProvider: "mock-bars"` plus a price that actually moves past the asset's
     `minMoveTicks` (2) — and re-run. Everything else in the drive is proven.
     ⚠️ 13 bets is the floor (`PLAYER_PER_PAGE` = 12, so fewer cannot show two pages carrying the SAME
     money), and the drive REFUSES a non-local base.
     ⛔ Do NOT mark U35 ✅ off the unit guard alone — it proves the page hands `roundPnl` the VIEW
     and proves the arithmetic; it cannot prove a tile is legible at 360 with a seven-figure net.

  2. U37 (D39 is done; D40 remains) · 3. U11 the overlay census — the next big rock, it gates
     U12–U18 (SEVEN units), NOT blocked, budget a whole session, and ⛔ do not build on
     `scripts/overlay-responsiveness-test.mjs` (its selectors match nothing that ships).
  4. D14 (U27) — pull-to-refresh fires inside sheets. `pull-to-refresh.tsx:32` gates on
     `scrollY > 5` alone; `html[data-sheet-open]` already exists and is set by `filter-sheet.tsx:252`.
  5. Batch the one-line clipping fixes under ONE guard with four RED controls: D1, D34, D45, D52.
  6. U31 — 379 verification rows. Write the `grep -c "🕓 unverified" == 0` counter FIRST so
     progress is a falling number.

  ⛔ DEPRIORITISED, with reasons: D5 (re-measure first — the band it was measured against has been
  rebuilt), D43 (RE-FILE, DO NOT FIX — its cell names the wrong element and the remedy is a no-op),
  D62 (built, measured, moved nothing), D16 (measure first; within ±40px it is a no-defect).

▶ WHAT CANNOT BE DONE FROM THIS MACHINE — do not burn a day rediscovering it
  U30 (real device + TalkBack; D54 needs a NOTCHED phone — Playwright reports every safe-area inset
  as 0) · U29 (Ali's GA4 pull + an A/B decision; ⚠️ GA fires only after consent Allow, so it
  under-counts exactly the old browsers this unit hunts — the AuditLog user-agent query is the less
  biased instrument and IS machine-doable) · U40 (native SW/ZH readers, plus Ali's sign-off on D53,
  which is compliance text). Inside otherwise workable units: D8, D46, D47.

▶ ON A DIFFERENT MACHINE — written 2026-09-25 because Ali is continuing this elsewhere

  ⛔ **ONE THING GENUINELY BLOCKS A FRESH CLONE, AND IT IS NOT IN GIT.** `.env.qa.local` is ignored
  by `.gitignore:9` and is not tracked. `qaEnv()` reads it and THROWS if a key is missing, so
  without it `loginOnce(b, "mobile01")` cannot sign in and **every signed-in production measurement
  in this programme is unavailable** — which is most of them. It holds 14 keys; the ones this plan
  uses are **`QA_MOBILE01_PASSWORD`** (the phone-measurement player, `+255712000110`) and
  `QA_ADMIN_PASSWORD`. Ali has them. ⚠️ Without that file a session can still do everything
  SIGNED-OUT, plus every source-level suite — do not conclude the programme is unworkable.

  ⭐ **WHAT TRAVELS UNCHANGED**, because it is a fact about the product rather than the box: the
  defect register and every unit body; all the guards and their RED controls; the recipes in §2;
  and the measured CSS numbers (the chart plot is 190px at a 320 viewport, `--tap-min` is 40, the
  spacing scale is overridden, `PLAYER_PER_PAGE` is 12, the Up & Down lock is `close − 60s` on a
  5-minute chain and `close − 180s` on a 15-minute one). None of those need re-measuring.

  ⛔ **WHAT IS MACHINE-LOCAL AND MUST BE RE-MEASURED RATHER THAN READ:**
   · **Whether `next dev` hydrates.** On this box it read 4 of ~500 on 2026-09-24 and 775 of 919 on
     2026-09-25 — same server process. Probe it, COUNT `__react` props, then click something and
     assert the state changed. Never trust either verdict, including the good one.
   · **Which port, and whether a server is already up.** Next 16 refuses a second `next dev` per
     directory, so an existing one IS the host — and it compiles from the working tree, so it serves
     uncommitted edits. A spare worktree is the only way to get a second.
   · **The dev server's stability.** Turbopack's CSS worker died here after a `globals.css` edit
     ("failed to receive message / reading packet length") and EVERY route began answering 500 while
     `tsc` stayed clean. A restart fixed it; a fresh `next dev` starts with an EMPTY in-memory store,
     so re-seed before believing anything.
   · **`npx next start` does not work on this repo at all** — `.env.local` (also gitignored) carries
     no `DATABASE_URL` and the instrumentation hook refuses the in-memory store, so every route 500s.
     `next dev` is the only local host.

  ⭐ **THE FIRST FIVE THINGS TO RUN SOMEWHERE NEW**, in this order:
   1. `npm run test:mobile-visual-plan` — the tracker. It needs nothing but the repo and must pass.
   2. `npm run test:time-axis` · `test:tap-target` · `test:labels` · `test:design-frozen` — all
      source-only, all must pass, none needs a server or a secret.
   3. `npm run qa:detail-order-hints -- https://www.50pick.tz` — needs `.env.qa.local`. GREEN over 9
      cells is the current truth; anything else means something regressed, not that the gate is wrong.
   4. Only then a local server, and the hydration probe before any drive.
   5. `git log --oneline -8 origin/main` — two other sessions push to main most days.

  ⚠️ **WHAT NEEDS ALI WHEREVER THE WORK HAPPENS** (no machine changes these): U30's real-phone pass
  (keyboard, TalkBack, large text, in-app browser, installed app, landscape — Playwright reports
  every safe-area inset as 0, so this is not a tooling gap that a better PC closes); **D88's ruling**
  on whether Law 9's 40px floor reaches a link inside a sentence; **D90's ruling** on 13.5px/bold
  versus a new 13px rung in `ui/stat.tsx`; U29's A/B browser-floor decision; D53's compliance text;
  and funding `mobile01` if the production route for U35 is ever preferred to the local one.

▶ THE THREE TRAPS — every session re-learns these unless it reads them here
  1. THE SPACING SCALE IS OVERRIDDEN (tailwind.config.ts:211-226 — `h-8`=48px, `h-7`=40px, `p-5`=24px).
     Read a unit's "close h-8 48 → 44" with stock Tailwind values and it looks like an instruction to
     shrink a control BELOW the floor. And the floor is `--tap-min: 40px` (Law 9), **not the 44 that
     several unit bodies still say**.
  2. GUARDS ARE PINNED TO LITERAL SOURCE TEXT (stacking-contract.test.mts:164/188,
     presence-class.test.mts:298-303, design-frozen.test.mts:183, token-collision.test.mts:201-209).
     Reformat a call site and a RED control becomes a silent no-op that reads as "the guard failed to
     catch the defect". Update the pin in the SAME commit as the code.
  3. A GUARD WHOSE POPULATION CANNOT CONTAIN THE DEFECT REPORTS A CONFIDENT ZERO — a live board with
     no void card; a `zoom: 1.3` proxy that narrows the viewport when Android's text scaling does not;
     a CLS driver running `reducedMotion: "reduce"`, which switches the auto-advance OFF before
     measuring it. Before writing any check: **would this still pass if the feature were absent?**

▶ STALE TRUTH ALREADY CORRECTED — and what it cost
  §11 said the signed-in half was "not verifiable from this PC" because the QA password "is not on
  this machine". Both false; corrected 2026-09-24, struck through rather than deleted. It sat in the
  section every session is told to read and told each of them not to try — and U11, the unit it
  damaged most, is mostly signed-in surface. ⚠️ Three more cells are still wrong and are flagged in
  place: **D43** (names the wrong element; a guard written from it could never fail), **U28's body**
  (tells you to build the render-blocking script that globals.css:5590-5596 forbids in shipped
  source), **U22** (asserts a grep result that stopped being true at `b096dd72`).
  ⛔ When you find one of these, CORRECT IT IN THE SAME COMMIT — and **DELETE the false claim, do
  not merely strike it** (Ali, 2026-09-25: *"always when u do something cleanly remove old stale
  rules that contradict what u did and push and document"*). Replace it with what you MEASURED, so
  the section carries one truth instead of a struck one beside a live one. Say so in the commit
  message, which is what keeps the deletion reviewable.
  ⚠️ THIS RULE REPLACED ITS OWN OPPOSITE, and that is why it is worded this hard. It used to read
  *"strike the old text rather than deleting it — a claim that quietly vanishes gets re-derived"*.
  Three blocks were struck under it on 2026-09-25 and then had to be deleted properly the same day:
  a struck rule still reads as a rule, and the next session weighs a written warning above fresh
  evidence. ⛔ A struck WRONG CITATION beside the right one is a different thing and stays —
  ~~`:756`~~ next to the real line costs nothing and stops the same wrong path being taken twice.
```

## §0a — The session prompt (paste this to start a session on any machine)

⛔ This block is the contract, and it is **NOT self-sufficient** — the older wording here said it
"relies only on this repository, so it works on any PC", and that is false for every measurement
this programme actually trusts. **Production measurement needs `.env.qa.local`, which is gitignored
(`.gitignore:9`) and therefore absent from a fresh clone.** Read the ▶ ON A DIFFERENT MACHINE block
in §0 before starting anywhere new. Everything else here does travel.

```
Continue the 50pick MOBILE VISUAL PLAN. Perfect beats fast. No lost work, no repeated work.

1) GET THE TRUTH FIRST — never assume
   Open the kipindi repo on this PC (office PC: F:\kipindi-main). Run:
     git branch --show-current     (must be main — or the in-flight branch that §0 HALF-DONE names; then work THERE)
                                   ⚠️ On the office PC this work runs on the local branch **mobile-s2**, which
                                   TRACKS origin/main. That is normal, not an in-flight branch: commit there and
                                   push with `git push origin HEAD:main`, checking the merge-base first — main
                                   moves often, because a second session pushes to it too.
     git pull
     git status
     git log --oneline -8 origin/main
     npm run test:mobile-visual-plan      (the tracker guard — must pass before you touch anything)
   THE GUARDS THAT ALREADY EXIST — every one has a RED control that must break its OWN section:
     qa:ghost-landing   §A skeleton landing · §B /live idle with MOTION ON · §C carousel dot taps
     qa:focus-and-fit   §1–§3 focus rings · §4 card fit · §5 bubble on scroll · §6 bubble at rest · §7 language panel
     qa:cls-budget      load shift per route — ⚠️ read its header first: it documents TWO things it CANNOT see
     qa:home-tighten · qa:fairness-phone · qa:signup-funnel · qa:tap-truth · test:tap-target
   ⛔ Run a guard's RED control before trusting its green run. A green guard that CANNOT fail is the most
   expensive thing in this repository's history — §2 keeps the list.
   If origin has a commit newer than the last entry in docs/MOBILE-VISUAL-PLAN.md §2, or there are
   uncommitted changes you did not make: STOP and tell me — another session may be in flight.
   Never stage files you did not change. Never `git add -A`.

2) READ BEFORE TOUCHING ANYTHING — in this order
   docs/MOBILE-VISUAL-PLAN.md: §0 RESUME AT (+ traps) · §1 status board · §1a closure ·
   §5 hard rules · §6 can/can't · §7 rulings · §8 defects · §8a phone design sheet · §8b motion spec ·
   the two units named in §0 NEXT (§9) · §11 verification and test matrix · §3b the professional critics'
   baseline (their notes are inside each unit; at a phase end, show Ali what they flagged on that phase's surfaces).
   Evidence for any finding: docs/MOBILE-VISUAL-FINDINGS-2026-09.md (by id, e.g. S03-10).
   Also: CLAUDE.md, the .claude/skills/50pick-standards skill, and the DESIGN_AUTHORITY.md sections those units cite.
   ⛔ Only ⬜/🟡 rows are work. ✅ rows are finished — never redo them.
   ⛔ Owner decisions in §4 and design-brief/PLAN-OF-RECORD.md §8.8 are settled — never re-ask them.

3) BEFORE CODING, TELL ME THE SESSION PLAN
   The two units, each unit's Accept line, the guard you will prove RED first, and any owner item
   from §0 that blocks them. If the code no longer matches a unit's description, re-measure and say so
   before changing anything.

4) WORK EXACTLY AS §11 SAYS — one unit per commit
   RED guard first → fix → green. Gates twice. Drive across the §11 test matrix
   (320/360/412/768/1280, SW/EN/ZH, Comfortable + Compact, phone emulation, reduced-motion tier).
   ⭐ **MEASURE ON PRODUCTION — it is the primary instrument, not a fallback.** Every defect D71–D83 was found and
   verified against https://www.50pick.tz with Playwright. ⛔ **NEVER RUN `npm start`**: its script is
   `prisma migrate deploy && next start`, so it MIGRATES a database and (E-380) re-seeds float on boot. `npx next
   start` skips the migrate — but you rarely need a local server at all.
   ⭐ **PRE-FLIGHT A FIX BY INJECTING IT INTO THE LIVE PAGE BEFORE YOU WRITE IT** — and inject it the way the real
   fix will exist. An `!important` injection proves the GEOMETRY is safe and proves NOTHING about whether the real
   rule wins the cascade; an injected `<style>` is unlayered and beats every `@layer`. (§2, 2026-09-24: a fix
   shipped TWICE without applying, blessed by a green pre-flight each time.)
   ⭐ **A QA PLAYER EXISTS AND SIGNING IN WORKS** — `loginOnce(b, "mobile01")` from `scripts/live/harness.mjs`.
   Two traps: that harness has its OWN `BASE` defaulting to `http://localhost:3001`, so without `LIVE_BASE` it
   signs in against a server that is not running and the failure reads exactly like a bad password; and it is ONE
   session per account, so `login()` per cell revokes the previous one — use `loginOnce` once and reuse the state.
   ⚠️ The SIGNED-IN surface is outside most gates' population: D78, D79, D80 and D83 all came from there.
   ⛔ SWAHILI FIRST — it is the default language, so it is the case a new player actually meets (§5), and
   the §3 baselines were measured in English before that changed. Set the locale in every capture.
   ⛔ Every driver's user agent MUST contain "HeadlessChrome" or /api/pv counts it as real traffic.
   Look at the screenshots yourself; numbers alone are not proof.
   In the SAME commit: §1 row (measured before → after, commit, guard, live date), a §2 entry, §0 rewritten,
   the NEXT-PLAN.md board counts, and the LIVE-QA-CAMPAIGN.md register row + handoff.
   Then: git branch --show-current → stage by name → commit → git push origin HEAD:main → wait for the
   deploy → re-measure on https://www.50pick.tz → only then mark ✅.

5) STOP AND ASK ME WHEN
   a §5 hard rule or a recorded ruling blocks the unit; a target proves wrong (write the reason in §2 first);
   you need an owner item (GA4 browser data, my phones for U30, SW/ZH wording, phase-end visual sign-off),
   or an open owner item in §0 (5–9: hero headline, one-bet prices, leaderboard ROI, two-officer copy, footer) decides the unit;
   or anything would touch money logic, payouts or compliance text.

6) CLOSE THE SESSION CLEANLY
   Rewrite §0, tick §1, add a §2 entry, update the NEXT-PLAN counts, run `npm run test:mobile-visual-plan`
   (and the doc gates) twice, push. Then report: commits shipped, measured before → after, what is next,
   and what you need from me. If context runs low: stop at a clean boundary, push the resume point first, say so.
```

## §1 — Status board

Legend: ⬜ not started · 🟡 in progress · 🔵 shipped, not yet verified live · ✅ verified on production · ⏸ blocked (reason).
A row turns ✅ only after the production re-measure, **in the same commit that records the numbers**.
On a **defect** row 🔵 means one thing more: *fixed and live, but its owning unit has not finished*, which happens when a
defect is clear-cut enough to ship in the safe-fix lane on its own. It must name the commit that did it (the guard
refuses a 🔵 without one), and the defect only reaches ✅ when its unit does — so an early fix can never close a unit.

| Unit | Kind | Status | Session | Commit | Before → After (measured) | Guard RED-proven | Live ✅ (date) · notes |
|---|---|---|---|---|---|---|---|
| U1 Baseline instrument + QA player | — | ✅ | S1 | `ba8f18e3` | no instrument, no production player → `qa:mobile-visual` over 315 production pages, §11 "Before" re-derived, baseline committed; "QA Mobile 01" minted | yes (RED=1 exits 1 on card heights; clean exits 0) | 2026-09-22 · production, served `feca192c` |
| U2 Density setting + switch | Compact | ✅ | S1 | `e2ba9a3e` | no setting → the Card spacing switch (kp-density, served `data-density`, 44px row); zero diff vs the U1 baseline on 120 production pages, both densities | yes (density-contract RED 2/2; card-spacing step F fails with the re-sync off) | 2026-09-23 · production, served `e2ba9a3e` |
| U3 Market card + Up & Down card + skeleton token | Compact | ✅ | S2 | `ea84e4a9` | market card 353.5 → **301.5** live+band · 347.44 → 303.44 cold start · 319.5 → 279.5 · 312 → 264 · 278 → 242; Up & Down 578.25 → **526.25** (`open`); share reach 26×37 → **41–42 × 40**; `/results` skeleton literal 220 → the closed-card token | yes (`qa:tap-hit` share section fails all 12 cells on the UNFIXED production tree naming 26×37 and the 6.5px gap; passes 42 controls here. `red:density-contract` 2/2 over a population that is real for the first time) | 2026-09-23 · production, served `ea84e4a9` |
| U4 Discovery bar | Compact | ✅ | S2 | `94a43227` | two stacked 44px control rows → **one control line + a ~17px count line**: bar **116 → 76.25px**, pinned chrome **237 → 197.25** (≤ 201), identical in SW/EN/ZH at 320 and 360; strip floor 160px held; the sort's listbox no longer runs 41–55px off-screen | yes (`RED_RAILMENU=1` fails 9/9 cells for D30; `red:density-contract` 2/2; the zero-diff breach in Comfortable was caught by measurement and fixed) | 2026-09-23 · production, served `94a43227` |
| U5 Header pills + phone rhythm tokens | General | ✅ | S3 | `7d068f10` | the signed-out auth pills stepped 48 → **40** (`--h-control-sm`), type to 13px, the 14px measure KEPT because it was chosen by measurement for the 320 fit (E-276) and re-measured here: both pills visible at 320 in sw/en/zh, document overflow 0, the pair ending 12px short of the edge. ⚠️ **The `--rh-*` step was measured and HALF REFUSED** — section 64 → 48 is worth 32px, but close 32 → 24 is worth 112px of 8367 (1.3%) and 24 already equals `--rh-tight`, so taking it would have collapsed a rung of hierarchy to buy one percent of a page | yes (`test:wallet-reach` asserts `.kp-auth-cta` declares `height: var(--h-control-sm)`; the row fails if the declaration is removed) | 2026-09-23 · production |
| U6 Home tightening | General | ✅ | S3 | `de2e9643` | **D51** the three proof figures now share one left edge — spread **16 → 0px** at 320/360/412 × sw/en/zh (the pip left the first number's flow and now follows it). **D33** the pool figure is one token — split on **5/6 tiles at 320 sw, 5/6 at 360 zh, 2/6 at 360 en → 0 everywhere**, and the widest figure the book can print (`TZS 999.9B`, 66px) FITS with 20–47px of slack, so the nowrap is not a clip. **The topic tile drew two layouts from one grid** — the name's `flex: 1 1 auto` made it wrap under the glyph instead of shrinking, orphaning the glyph on a row of its own and dragging its grid partner to 98px; the name now takes the tile's whole measure and the glyph drops to the meta row: tiles **74/98/98 → a uniform 71.3** at 360 sw, no name cut at any width or locale. Plus hero padding 48/32 → 32/24, the lede one rung to 17px, the CTAs to `--h-control-lg`, and a 3-line bound on the Closing-soonest question. ⚠️ **That bound was first written up as "it crops nothing today", which was true locally and FALSE live** — production's four markets carry 120-character UEFA titles that run 4–7 lines, so the clamp engages on 4 of 4 rows at 320 and 360 SW/EN and 3 of 4 at 412. It STAYS, because without it one such title takes a row past 180px: live it holds every row to **121.3px from a ragged 164/143/164/164**, the cut is SIGNALLED by an ellipsis, and the link's accessible name is still the whole question (read back off the row on production). Home **7017 → 6845px local**; **verified on production: 7104px = 9.11 screens at 360 SW** (was 9.51), 320 SW 11.59, 360 EN 8.92, 360 ZH 8.39, 412 SW 7.71, document overflow 0 at all five | yes (`qa:home-tighten`: `RED_D51=1` fails 9/9 naming the 16px spread · `RED_D33=1` fails naming the split figures AND the planted worst case · `RED_TILE=1` fails naming both the cut name and the orphaned glyph — each firing only on its own section, and a green RED run exits 2 as a broken harness) | 2026-09-23 · **production, verified**: `qa:home-tighten` GREEN over 9 width×locale cells against www.50pick.tz, home 9.11 screens at 360 SW, and re-verified in BOTH densities |
| U7 Chat bubble (D3) | General | ✅ | S3b | `b61b8b29` · `3febd7a4` | the bubble **leaves while the reader is moving** and returns 250ms after they stop; phone bubble **52 → 44** with its glyph 30 → 24, so it is the tap floor and not a pixel more. ⛔ Two states excluded BY NAME — `.cm-fab--open` (a bubble that vanished with its own panel open would take the CLOSE control with it) and `:focus-within` (a keyboard user must not lose it to the scroll that brought it into view). `data-scrolling` is ONE write per burst, not per frame, and is cleared on unmount or a route change mid-scroll would leave it set forever | yes (§5 of `qa:focus-and-fit`, `RED_D3` fires on all three surfaces naming "the bubble does NOT leave while the page is moving"; the RED check requires each control to break its OWN section) | 2026-09-23 · measured on the running build: at rest 44×44 and hittable, 80ms into a scroll opacity 0.11 and not hittable, 900ms after stopping back to 1, and with the panel open a scroll leaves it at 1. ⚠️ **DEVIATION, stated:** §9 asked the driver to run on all NINE surfaces D3 names; it runs on THREE (`/markets`, `/leaderboard`, `/results`). The hide rule is global, so one surface proves the mechanism — three is a hedge against someone scoping it later, nine would be theatre. |
| U8 Countdown + guest order | General | ⬜ | S4 | | | | |
| U9 Defects D1 · D5 · D7 · D18 · D34 | General | ⬜ | S5 | | | | |
| U10 Defects D2 · D6 · D10 · D11 · D43 · D44 | General | ⬜ | S5 | | | | |
| U11 Overlay census | — | ⬜ | S6 | | | | |
| U12 `<Modal>` + questions as sheets | General | ⬜ | S7 | | | | |
| U13 Result modal · bet confirm · sell confirm (+ D9) | General | ⬜ | S7 | | | | |
| U14 Win celebration | General | ⬜ | S8 | | | | |
| U15 Toasts | General | ⬜ | S8 | | | | |
| U16 Notice stack + first-visit coordination (D4 · D27) | General | ⬜ | S9 | | | | |
| U17 Notifications | General | ⬜ | S9 | | | | |
| U18 Page shells · primer · detail pages | General | ⬜ | S10 | | | | |
| U19 Live carousel · Help rows · auth forms (D48) | General | ⬜ | S11 | | | | |
| U20 Footer tap rows + Discussion copy (D8 · D24) | General | ⬜ | S11 | | | | |
| U21 Short screens + landscape (D20) | General | ⬜ | S12 | | | | |
| U22 On-screen keyboard + viewport units (D19) | General | ⬜ | S12 | | | | |
| U23 Safe areas + installed-app mode (D21) | General | ⬜ | S13 | | | | |
| U24 Large system text (D22 · D23) | General | ⬜ | S13 | | | | |
| U25 Loading skeletons without layout jumps (D26, D71–D74) | General | 🔵 D26+D71–D74 live `371690b6`; `PageLoader` unmeasured | S14 | `371690b6` | /live ghost y160→y698 **538px out → within tolerance**; /markets y557→y318 **239px out → within tolerance**; /live hero **388–483px on a timer → one height**; un-input CLS over 27s idle **0.0726 → measured post-deploy** | `qa:ghost-landing` — RED_GHOST (§A) and RED_STACK (§B), each required to break its OWN section | 🔵 D26 and D71–D74 are live in `371690b6`; the generic `PageLoader` routes are still unmeasured, so this unit is NOT closed — no live date is claimed until they are |
| U26 Empty, error and offline states (D12 · D13) | General | ⬜ | S14 | | | | |
| U27 Touch behaviour (D14 · D15 · D16 · D25) | General | ⬜ | S15 | | | | |
| U28 Low-end performance + motion tiers (D17) | General | ⬜ | S15 | | | | |
| U29 Browser compatibility floor | General | ⬜ | S16 | | | | owner decision A/B with data |
| U30 Real-device + accessibility pass | — | ⬜ | S16 + every phase end | | | | needs Ali's phones |
| U31 Verify the inspection backlog (379 items) | — | ⬜ | S17 | | | | S07–S13 findings, unverified |
| U32 Market-card state truth (D29 · D35 · D42) | General | ⬜ | S18 | | | | money-truth; also E-415 |
| U33 Chrome: menus, ticker, semantics (D30 · D32) | General | ✅ | S18 | `94a43227` `07f736f9` `787ca533` `6a20bd78` `82d3e067` | D30 rail + sort listbox · D66 dismiss no longer activates what is under the finger · D81 language code **4.12:1 → 5.63:1** · D67 language panel **1.75px past the right edge → 4.25px inside** at 320 | yes (`qa:focus-and-fit` §7 + `RED_D67` reproduces 1.75px past at 320 and stays silent at 360; `test:filter-language` §5.9/§5.10 hold D30's stacking by name) | 2026-09-24. ~~⚠️ **CLOSED WITH ONE CONDITION:** D32's last item (a phone PAUSE control for the marquee) is UNREACHABLE rather than done — the ticker was removed from the shell on Ali's instruction (`adbc31e7`) and renders nowhere, measured 0 instances on `/`, `/markets`, `/live`. Its component and CSS were kept deliberately, so **re-siting the strip re-opens D32**.~~ ✅ **2026-09-26: the strip is re-sited to the lobby, so D32 RE-OPENED — and its condition is met and verified on production `2ab8830e` (pause control, tap-to-stop, a stopped strip that reads as a list, all four calm gates); numbers in §8.** |
| U34 Signed-in header cluster (D31) | General | ✅ | S19 | `252a9f55` · `70c8bcaa` · `f438bc41` | eye **32→40px wide** (40×44 at 320/360/412, floor 40); accessible name "Hide password" → **"Ficha salio"**; the hidden-balance mask overflowed its box by **27.2px at TZS 0** → the box is now the MAX of both states and toggling moves **nothing** (header and overflow unchanged at all three widths) | yes — `red:tap-rung` **2/2**, and it was **1/2 until 2026-09-25**: the CashEye anchor still described the pre-D78 markup, so it could not inject and had been proving nothing | 2026-09-25 · production, signed in as mobile01 in SW. ⚠️ The delta flash is `absolute` in source but UNOBSERVED — it paints only on a balance CHANGE and this account is unfunded |
| U35 Up & Down truth and fit (D36 · D37 · D45 · D52) | General | ⬜ | S19 | | | | board, round page, history |
| U36 /live carousel, search and wall (D38 · D47 · D50) | General | ⬜ | S20 | | | | search survives a miss |
| U37 Detail page copy, order and hints (D39 · D40 · D41 · D46) | General | ✅ | S20 | `22fb75a9` · `ee55a509` · `eb4acd4a` | **D40** reading order DOM [0,1,2] vs visual [1,0,2] at **9 of 9 cells → [0,1,2]/[0,1,2]**, and the bet panel went from **no name and no heading at all** to an `<h2>` announced FIRST (it had been read under "Kigezo cha utatuzi"). **D41** the commission hint **1392.8px on one line in a 320 viewport, 23% readable → 100%**, wrapped, `text-transform: none`, 13px; trigger **14×10 → 40×40** with `elementFromPoint` reach at all four edges — **at a layout cost of 0px** | yes — **FIVE sections, five controls, each breaking its OWN section only**: 171 failures against the unfixed production tree first, then RED_ORDER 9 · RED_HEAD 9 · RED_FIT 53 · RED_TAP 54 · RED_FLOOR 90. A green RED run exits 2. ⛔ Two of the five had to be REWRITTEN to get there: RED_ORDER and RED_HEAD did DOM surgery, which detached React nodes on a page that re-renders on a timer and made §4 report `0×0`; they are now CSS-only and attribute-only. And §4/§5 had to be given DISJOINT populations, because two sections policing one rule over overlapping sets makes "breaks only its own section" unsatisfiable | **2026-09-25 · production, verified on `9cb5438d`.** `qa:detail-order-hints` **GREEN over 9 cells** (320/360/412 × sw/en/zh, signed in as `mobile01` with a side picked), 33 controls judged by §5 and 2 exempt. The chart renders on **15 of 15** market×width pages with **zero console or page errors**, including the 2,362:1-gap market, and the outline now carries `h2 "UWEZEKANO WA NDIYO KWA MUDA"` with `aria-labelledby` resolving. ⚠️ **ONE THING IS NOT INSTRUMENTED AND IS NOT CLAIMED:** the axis draws to a CANVAS, so no DOM probe can read tick spacing — the ARITHMETIC is proved by `test:time-axis` (28 assertions, whose §5 runs the same proportionality test against the UNFILLED series, where 9 of 10 intervals violate it), and this run proves the fixed component renders the real uneven series without throwing. A canvas-pixel cell for the spacing is filed as remaining work, not ticked here. ⚠️ D90 left this unit for U39 ⛔ **NOT CLOSED: D46 remains**, and §0 lists it as not startable on this machine — it needs an owner ruling (fill the gaps so time runs linearly, or drop the dates for a per-prediction axis), not code. The low critics-panel item (the third stat tile 8px shorter than the pair above it) is also untouched |
| U38 One money grammar and number rules | General | ⬜ | S21 | | | | formats, signs, nowrap, tabular |
| U39 Close the type ladder and icon set | General | ⬜ | S21 | | | | off-ladder literals, glyph sizes |
| U40 Player copy and terminology (EN/SW/ZH) | General | ⬜ | S22 | | | | needs a native reader |
| U41 /fairness on a phone (D60 · D61) | General | ✅ | S23 | `c9ba60cc` + guard `qa:fairness-phone` | source links outside the scroller **12 of 12 → 0** at 320/360/412; table off-screen **48.8% / 41.7% / 32.4% → 0%** (client==scroll: 286/286, 326/326, 378/378); rows paint **0 identical titles** | yes (`qa:fairness-phone`, `RED_TABLE=1` serves the five-column table back and reproduces THIS UNIT'S OWN RECORDED NUMBERS: client 326 vs scroll **559**, 49%/42%/32% off-screen at 320/360/412, all 12 source links outside — a green RED run exits 2 as a broken harness) | 2026-09-24 — D60 and D61 both closed. ⚠️ The third assertion (no two rows paint identical title text) is DATA-DEPENDENT and did not fire under RED: today's twelve markets clamp to distinguishable text. It is kept because it is the defect that mattered most — two markets painting the same row is worse than a table that scrolls — but a green run of it is evidence about THIS board, not about the layout. |
| U42 The sign-up funnel on a phone (D69) | General | ✅ | S23 | `ea023299` + guard `qa:signup-funnel` | 7 `/auth/*` routes × 2 widths: **200, `lang=sw`, 0 able to scroll sideways**; DOB accessible names **`Day/Month/Year` → `Siku/Mwezi/Mwaka`** | yes (`qa:signup-funnel`: `RED_WIDE=1` fails all 14 route×width cells, `RED_ARIA=1` fails both widths — each required to break its OWN section; a green RED run exits 2 as a broken harness) | 2026-09-24 — D69 closed. ⚠️ Signed-out and at-rest only: nothing here says the funnel WORKS, only that it does not overflow and speaks Swahili. A keyboard over every field is U30. |

| Defect | Status | Owning unit |
|---|---|---|
| D1 | ⬜ | U9 |
| D2 | 🔵 shipped early `e14ca071` 2026-09-23 | U10 |
| D3 | 🔵 shipped early `b61b8b29` 2026-09-23 — the bubble leaves while the reader is moving, and is 44px | U7 |
| D4 | ⬜ | U16 |
| D5 | ⬜ | U9 |
| D6 | ⬜ | U10 |
| D7 | 🔵 shipped `a25c127b` 2026-09-16 (live) | U9 |
| D8 | ⬜ | U20 |
| D9 | ⬜ | U13 |
| D10 | ⬜ | U10 |
| D11 | ⬜ | U10 |
| D12 | ⬜ | U26 |
| D13 | ⬜ | U26 |
| D14 | ⬜ | U27 |
| D15 | ⬜ | U27 |
| D16 | ⬜ | U27 |
| D17 | ⬜ | U28 |
| D18 | ⬜ | U9 |
| D19 | ⬜ | U22 |
| D20 | ⬜ | U21 |
| D21 | ⬜ | U23 |
| D22 | ⬜ | U24 |
| D23 | ⬜ | U24 |
| D24 | ⬜ | U20 |
| D25 | ⬜ | U27 |
| D26 | 🔵 shipped early `f70789df` 2026-09-24 — both load shifts; the skeleton-sizing follow-ups are D72–D74 (`371690b6`, live) and the surface's real defect was D71 | U25 |
| D27 | ⬜ | U16 |
| D28 | ✅ `ea84e4a9` 2026-09-23 (live) | U3 |
| D29 | 🔵 shipped `5c00588c` 2026-09-25 — the price gate is the POOL, not the phase, and the outcome is read before any absence branch. ⛔ **THE FILED ONE-TOKEN REMEDY WAS A REGRESSION** — see the §8 cell. Guarded in `test:outcome` (6 assertions + 3 controls, 5 product mutations proven RED). ⭐ NO new copy was needed. ⚠️ **The production check is BLIND and says so**: `qa:d29-terminal` read 12 cards and found NO settled or void card on any card surface (`/markets` is all Live; `/results` renders none at all), which is §0 trap 3 exactly — the code is proven by the unit guard, not by that sweep | U32 |
| D30 | 🔵 shipped early `94a43227` + `07f736f9` 2026-09-23 (live) — the rail AND the sort listbox | U33 |
| D31 | ✅ **ALL FOUR PARTS, verified on production 2026-09-25** — mask `252a9f55`, eye width `70c8bcaa` (D78), accessible name + delta flash `f438bc41`. Signed in as mobile01 at 320/360/412 SW: eye **40×44** against the 40px floor in BOTH axes, name **"Ficha salio"**, and toggling the mask moves NOTHING (header unchanged, overflow unchanged). ⚠️ The delta flash is `position: absolute` in source but could not be OBSERVED — it paints only when the balance CHANGES and this account is unfunded | U34 |
| D32 | ✅ verified on production 2026-09-26 (`2ab8830e`) — the strip is re-sited to the lobby (`/`, `/markets`, `/live`, `/results`) with the condition it carried: a named pause control, tap-to-stop, a stopped strip that becomes a still swipeable list, and the calm branch on all FOUR motion gates. Numbers in §8 | U33 |
| D33 | ✅ `de2e9643` 2026-09-23 | U6 |
| D34 | ⬜ | U9 |
| D35 | ◐ fix is UNGATED and working (0 clipped, 12–13/15 rows wrap at 320/360 ± 1.3× text) — only the COLD-START card is unmeasured, and none is on the board | U32 |
| D36 | 🔵 BOTH HALVES LIVE — half 1 earlier; half 2 `a7da5f89` 2026-09-24. ⭐ **PROVED ON PRODUCTION BY DISCRIMINATION (`bedb6023`):** the price tape had moved on to **$84,258.42** while the settled card still held its own close of **$84,154.00** — pre-fix those were one number — and the board card and its round page print the same figure. ⚠️ A single reading could NOT have shown this: during handover the newest settled round's close IS the latest confirmed read, so the two agree by construction and the instrument reported BLIND twice before the feed moved. The tick waits on U35 (D37 on-screen) | U35 |
| D37 | 🔵 shipped `a7da5f89` 2026-09-24 — the P&L strip is view-scoped (Ali's decision), and the sub-line wraps instead of spilling. ⭐ **FIT PROVED ON PRODUCTION'S OWN STYLESHEET as a BEFORE/AFTER delta** (`scripts/live/ops/d37-tile-fit.mjs`, 2026-09-24): with a seven-figure book the OLD markup spilled **72px at 320, 52px at 360, 26px at 412**; the new one spills **0px** at all three, buying one line of tile height (117 → 132px). ⛔ **THE DATA PATH IS PROVED BY UNIT, NOT ON SCREEN** — `test:updown-history-pnl` (26 assertions, 6/6 mutations) shows the page hands `roundPnl` the VIEW, but nobody has watched the real page with real rows page from 1 to 2. Neither door is open: no production account has Up & Down history, and **React does not hydrate in dev on this machine** (see §0), so no local bet can be placed. The tick waits on that | U35 |
| D38 | ⬜ | U36 |
| D39 | ✅ `22fb75a9` 2026-09-24 — both money moments now read through `sideWord`. ⭐ Guarded by a NEW §3d in `test:labels` (3 passes + 7 controls) that catches the two shapes §3 and §3b are structurally blind to. ⛔ And fixing its guard exposed a far bigger one — see the cell | U37 |
| D40 | ✅ `ee55a509` 2026-09-25 — the bet panel is first in the SOURCE and carries an `<h2>` of its own; DOM order now equals visual order at 9/9 cells. Guarded by `qa:detail-order-hints` §1 + §2 | U37 |
| D41 | ✅ `ee55a509` 2026-09-25 — a 40×40 disclosure button and the explanation in flow: the commission hint went from **23% readable to 100%**, at a layout cost of **0px**. Guarded by §3 + §4 | U37 |
| D42 | 🔵 shipped `1d3bbc28` 2026-09-25 — the third arc has its word, and the void-only view is no longer a wordless circle. Guarded in `test:outcome` (4 assertions + 3 controls, 4 product mutations proven RED) | U32 |
| D43 | ⬜ | U10 |
| D44 | ⬜ | U10 |
| D45 | 🔵 shipped `c6ebbedf` 2026-09-24 — all FOUR wrappers onto `max-w-board`/`max-w-reading` + the house `px-3 lg:px-6`. ⭐ **Verified on production (`4b30a069`): content edge 16px on /updown, /updown/history AND /markets at 320/360/412** — measured as a DELTA against /markets in the same run, never against a remembered number. The tick waits on U35 (D37 on-screen) | U35 |
| D46 | ✅ `eb4acd4a` 2026-09-25 — the axis is a TIME axis: the library's own whitespace fills the gaps, so a 2.6-day interval stops drawing the same width as a 95-second one | U37 |
| D47 | ⬜ | U36 |
| D48 | ⬜ | U19 |
| D49 | ✅ by design `ea84e4a9` 2026-09-23 (live) — §4 decision 11: the band stays where real history exists, trimmed 28 → 20 in Compact; never removed, no reserved space | U3 |
| D50 | ⬜ | U36 |
| D51 | ✅ `de2e9643` 2026-09-23 | U6 |
| D52 | 🔵 shipped `c6ebbedf` 2026-09-24 — the arrow travels with the price it points at, so a wrap can only put it at the START of a line. ⭐ **Verified on production (`4b30a069`) at 320/360/412:** the pair STACKS at 320 and 360 with "→ $84,490.16" leading its own line, sits on ONE line at 412, and no figure breaks mid-digits (0px overflow at every width). The tick waits on U35 (D37 on-screen) | U35 |
| D53 | ⬜ | U40 |
| D54 | ◐ the RAIL is padded (`be5b1cdd`); pixels unseen, 6 other surfaces still unpadded  ◐ **THE RAIL IS FIXED — `be5b1cdd`**, `@media (orientation: landscape)` padding it from `env(safe-area-inset-left/right)` — the first `orientation:` query in the codebase. ⛔ **The pixels have still not been seen**, because Playwright reports every inset as 0; what WAS verified is that the rule is inert where insets are 0 (rail box, padding, first and last item edges, document overflow byte-identical at 780×360). ⚠️ Six surfaces remain unpadded on purpose — the page gutter and `bet-confirm-modal`, `notifications-panel`, `consent-prompt`, `install-invite`, `avatar-menu`, `date-select`. The rail went first because it is the only one whose failure is an unreachable TAP TARGET rather than clipped reading.| U30 + the landscape row of §11 |
| D55 | ⬜ | U30 |
| D56 | ✅ `b096dd72` 2026-09-23 (live) | U3 |
| D57 | 🔵 shipped early `b096dd72` 2026-09-23 (live) | U22 |
| D58 | 🔵 shipped early `724096e6` 2026-09-23 (live) | U9 |
| D59 | 🔵 shipped early `149d0dee` 2026-09-23 (live) | U28 |
| D60 | 🔵 shipped early `b13f94b2` 2026-09-23 (live) | U41 |
| D61 | 🔵 shipped early `b13f94b2` 2026-09-23 (live) | U41 |
| D62 | ⬜ | U22 |
| D63 | 🔵 shipped early `b096dd72` 2026-09-23 (live) | U9 |
| D64 | 🔵 shipped early `28feb05b` 2026-09-23 | U9 |
| D65 | 🔵 shipped early `c21a2f37` 2026-09-23 (live) | U24 |
| D66 | 🔵 shipped early `787ca533` 2026-09-23 | U33 |
| D67 | 🔵 shipped early `82d3e067` 2026-09-24 (live) — the flip fixed one edge and broke the other | U33 |
| D68 | 🔵 shipped early `05a693f1` 2026-09-23 | U26 |
| D69 | 🔵 shipped early `ea023299` 2026-09-23 (live) | U42 |
| D70 | ⚪ examined 2026-09-23 and DECLINED — the ellipsis is a documented deliberate trade; see the register | U24 |
| D71 | 🔵 shipped early `371690b6` 2026-09-24 (live) — the hero resized ON A TIMER | U25 |
| D72 | 🔵 shipped early `371690b6` 2026-09-24 (live) | U25 |
| D73 | 🔵 shipped early `371690b6` 2026-09-24 (live) | U25 |
| D74 | 🔵 shipped early `371690b6` 2026-09-24 (live) | U25 |
| D75 | 🔵 shipped early `7b7b15ef` 2026-09-24 (live) — the bubble leaves at rest and stops taking the tap | U7 |
| D76 | 🔵 shipped early `5fe0bd64` 2026-09-24 — the results carousel resized under the finger | U25 |
| D77 | 🔵 shipped early `5fe0bd64` 2026-09-24 | U25 |
| D78 | 🔵 shipped early **`70c8bcaa`** 2026-09-24 — SIGNED-IN surface; every tap gate was blind to it. ⚠️ ~~`3d644e4e`~~ was a MERGE commit, not the fix. Re-measured on production 2026-09-25: **40×44** | U27 |
| D79 | 🔵 shipped `be4fb670` 2026-09-24 (live) — THIRD placement; the first two shipped and did nothing | U27 |
| D80 | 🔵 shipped early `5b3c6cf1` 2026-09-24 (live) — KYC pill 163×38, signed in | U27 |
| D81 | 🔵 shipped early `6a20bd78` 2026-09-24 (live) — AA 4.12:1, and only on the player's OWN language | U33 |
| D82 | ⚪ examined 2026-09-24 and DECLINED — 180px is below WCAG's reflow width AND below the smallest supported phone; the proposed remedy was TESTED and does not work | U24 |
| D83 | 🔵 shipped early `4dd78218` 2026-09-24 — signed-in notice bar, 36px at 360 and FINE at 320 | U27 |
| D84 | ⬜ FILED 2026-09-25, not fixed — `/leaderboard` still carries D41's defect through the same `Tooltip` atom | U19 |
| D85 | ✅ `eb4acd4a` 2026-09-25 — comment Report/Delete were ~15.8px tall and NO gate could see them | U37 |
| D86 | ✅ `eb4acd4a` 2026-09-25 — the header Source link, ~55×18 in a row of 40×40 controls | U37 |
| D87 | ✅ `eb4acd4a` 2026-09-25 — the probability chart had no heading, so D40's repaired outline still had a hole | U37 |
| D88 | ✅ `eb4acd4a` 2026-09-25 — the criterion's source URL, a standalone link at 221×33 | U37 |
| D89 | ✅ `eb4acd4a` 2026-09-25 — the card's Details control is 38px wide in CHINESE only; D28 measured it in one language | U3 |
| D90 | ⬜ FILED 2026-09-25, not fixed — the detail page's third KPI tile is ~7px shorter than the pair above it; needs a type-ladder rung or an owner ruling | U39 |

| Seven-lens re-score (§13), done at the Seal from measurements | Responsiveness | UI/UX | Graphic | Video motion | Animation | Artist | Compatibility |
|---|---|---|---|---|---|---|---|
| Plan v2 target | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| Measured at Seal | — | — | — | — | — | — | — |

## §1a — When is this programme finished? (closure is earned, not declared)

The programme may be marked **🏁 CLOSED** in the status line at the top of this file only when **every one** of these holds.
`npm run test:mobile-visual-plan` enforces the mechanical ones and refuses a closure claim that is not earned.

1. **Every unit row is ✅** — and a ✅ row carries: a commit SHA that exists in this repo, a measured `before → after`, `yes` in the
   guard column (the guard was proven RED before the fix), and a live-verification date.
2. **Every defect row is ✅**, and no defect is ✅ before its owning unit is.
3. **The inspection backlog is empty** — U31 has verified or refuted all 379 🕓 items in the findings record, and anything confirmed
   has an owning unit and a defect row.
4. **The acceptance table in §11 is re-measured on production** in one final run (every width × locale × density × condition in the
   test matrix), and the numbers are written into §11 beside the targets.
5. **The seven lenses are re-scored from those measurements** (§1 lens row), not from intent.
6. **U30 has passed on real phones** — keyboard, large text, TalkBack, WhatsApp in-app browser, installed app, landscape, battery saver —
   and axe reports 0 serious/critical at 320 and 360 with overlays open.
7. **Ali has signed off the final before/after contact sheet** (§8a), and the §2 log records that.
8. **Nothing is left in "Comfortable vs Compact" drift**: the zero-diff control passes at ≥ 640 and in Comfortable.
9. **The critics panel has been re-run at the Seal** — the same capture script and workflow, the same nine surfaces, the default language at
   360 — and **nothing the verifiers mark `new` or `known` is a defect still visible on production**. Every upheld taste note is done or
   explicitly declined by Ali in §4. The seven new scores go into §3b beside the baseline: reported, not gated — a critic's number is a
   judgement, and a gate on a judgement is one a session can argue with. The defect list is not a judgement: each item names a frame and
   survived a verifier.

Until then the status line stays 🟠 and `§0 NEXT` names real work.

## §2 — Session log (newest first)

- **S19h · 2026-09-25 — U37 closed, five controls no gate could see, and a retry that made things worse.**
  - **D46 (`eb4acd4a`)** — the probability axis is a TIME axis. `lightweight-charts`' time scale is
    ORDINAL: one slot per item × one uniform `barSpacing`, so under calendar labels a two-day gap and
    a one-day gap drew the same width. On live market `mkt_07204d65ca88106b160c`: **11 readings over
    112.4h, gaps 95s to 2.60 days — 2,362:1, all drawn identically**, and 19 Sep absent from the axis
    entirely. Fixed with `timeGridFill`, which reserves the missing width with the library's **own
    whitespace items** (`{ time }`, no value) — the mechanism `terminal-chart.tsx` already uses "so an
    outage keeps its width". ⛔ NEVER interpolated probabilities: this component's rule is "Real data
    or nothing (A-5)". ⚠️ Order matters — fill, THEN `ascUnique`, whose tie rule keeps a real price
    over a gap marker.
  - ⛔ **AND D46'S FIX NEARLY BECAME WORSE THAN D46.** The library refuses to draw below
    `minBarSpacing`, default **0.5px**, and the plot is **190px at 320 — measured, against the 210 I
    first estimated**. A ceiling of 380 slots, so a 2,000-slot series would have clamped and shown
    the player **about a tenth of their market's history, looking entirely normal**. The budget and
    the floor now live together and `test:time-axis` §7 asserts the PAIR.
  - **D85 · D86 · D88 (`eb4acd4a`)** — three controls under the tap floor on the detail page: comment
    Report/Delete at **~15.8px tall**, the header Source link at **~55×18** beside two 40×40 controls,
    the criterion's source URL at **221×33**. ⭐ **THE BLINDNESS IS THE FINDING.**
    `tap-target.test.mts:344` skips any interactive tag that declares no height — "declares nothing
    — the rendered half's job" — and no rendered gate's population contained them; §4 of the unit's
    own driver scopes to three known triggers. So `qa:detail-order-hints` gained a **§5 whose
    population is THE PAGE**, not a list. A list is maintained by the same people who forget.
  - 🔴 **§5 CRIED WOLF TWICE FIRST, AND BOTH TIMES CONVICTED A CLOSED FIX IN 9/9 CELLS.** Judging
    `getBoundingClientRect` convicted the card's Details and share controls (13×17, 64×17) — but D28
    gave each a 40px `::after` the element's rect cannot see. Then a 40px `elementFromPoint` square
    convicted the same two, because they are **neighbours ~20px apart**: two adjacent controls cannot
    each own a clear 40px square, and Law 9 does not ask them to. The honest measure is the **hit
    area, box ∪ pseudo-elements** — the accounting D28 itself used. ⭐ A gate that convicts a shipped
    fix is worse than no gate; it teaches people to ignore it.
  - **D89 (`eb4acd4a`)** — and that instrument immediately found what D28 could not: `.mcardp-details`
    is **38px wide in Chinese** (63.9 sw, 56.4 en), under the floor at every width since the day D28
    closed it. Its `::after` is `left:0; right:0`, so the height was engineered to the pixel and the
    **width was left to the translation**. ⭐ §A5 watches Swahili running 35–40% LONGER — the SAFE
    direction. It is SHORT text that breaks a width-driven target, and zh is the short case here.
    Re-measured on `/markets`: 30 controls × 3 widths × 3 locales, 0 under the floor, **zh exactly 40**
    against 41 in sw/en — so the `min-width` is what holds it, not the text.
  - **D87 (`eb4acd4a`)** — the page's signature visualisation was absent from the outline D40 had just
    repaired: an unnamed `<section>` labelled only by a `<span>` in its toggle. ⛔ D40's guard could
    not have caught it — a heading-LEVEL check cannot see a MISSING heading. Now an `<h2>` reusing
    `market.probOverTime`; nothing moved, because preflight resets h1–h6 to inherit.
  - 🔴 **TWO RED CONTROLS BROKE A SECTION THEY WERE NOT NAMED FOR, BOTH BY DOM SURGERY**, and the
    harness refused to certify either. `content.after(aside)` and `node.remove()` on a page that
    **re-renders on a timer** left React reconciling against a cut tree, so §4 read `trigger is 0×0`.
    Both are now CSS-only / attribute-only — RED_ORDER inverts the visual `order`, which is exactly
    the property §1 asserts. A `0×0` box is now reported as an INSTRUMENT FAILURE, not a finding.
  - 🔴 **AND §4/§5 MADE "EACH CONTROL BREAKS ONLY ITS OWN SECTION" UNSATISFIABLE.** Both policed the
    tap floor, and §4's three triggers are a SUBSET of §5's page: RED_TAP broke §5 too (27) and
    RED_FLOOR broke §4 too (54). The rule was right and the sections were wrong. §4 keeps the hints
    because its test is stricter (reach, which guards the `relative z-10` against the stake input
    below); §5 excludes them and says so, and §4 asserts its own population size so nothing falls
    through. **One rule, one section, one population.**
  - **U35** — `qa:updown-history-strip` committed. **13 bets landed, each proved by the wallet
    falling**, and §2 PASSED on a real two-page history: identical figures across pages while listing
    **12 rounds against 8, no overlap**. ⛔ §1 open — nothing the player bet on SETTLED, so Net return
    and Win rate sat at zero. 🔴 **The retry I added for it was worse than the problem**: every failed
    `settle` attempt also calls `advanceChain`, which OPENS A SUCCESSOR, so the round that eventually
    resolved was one nobody had bet on. **A retry against an endpoint that also advances is not a
    retry.** Replaced with one settle after a `SETTLE_MARGIN` past the close. Detail in §0 item 1.
  - ⚠️ **HOUSEKEEPING THAT COST REAL TIME:** Turbopack's CSS worker died after a `globals.css` edit
    and every route answered 500 while `tsc` stayed clean (a restart fixed it; a fresh `next dev`
    starts with an EMPTY store — re-seed). Editing source while a drive runs against the same server
    broke one run. And I POSTed a `settle` into the store a running drive depended on, which
    invalidated its cycle — **do not mutate a store a drive is using.**

- **S19g · 2026-09-25 — D40 and D41, and the dev server that hydrates after all.**
  - **D40 (`ee55a509`)** — the bet panel is FIRST in the source. `order` moves what a player
    sees and never what the DOM says, so while the aside was source child 2 with `order-1`, a
    screen reader, a keyboard and reader mode all got it LAST: **DOM [0,1,2] against visual
    [1,0,2], nine cells of nine** at 320/360/412 × sw/en/zh on production. ⛔ The grid has
    **three** children — `similar markets` is `order-3` in the same grid — so a fix written for
    a pair leaves a third of it unmeasured.
  - 🔴 **AND "UNDER THE WRONG HEADING" WAS LITERAL.** The `<aside>` carried **no accessible
    name and, for a signed-in player, no heading at all**: its three state headings are `<h3>`
    and the dial branch has none. The outline read h1 → "Nafasi zako" → **"Kigezo cha utatuzi"
    → the entire bet widget** → "Masoko yanayofanana". All five branches now carry one
    `id="bet-panel-heading"` `<h2>` (sr-only in the dial branch; the existing `<h3>`/`<p>`
    promoted in the other four — Tailwind preflight resets heading size and weight, so the tag
    change moves no pixels), and `bettingOpen` is hoisted so branch and heading cannot drift.
    ⚠️ Nothing moved on screen: with source order [aside, content, similar] and orders [1,2,3]
    the painted order is byte-identical, and desktop is untouched because all three children are
    placed explicitly, which ignores source order outright.
  - **D41 (`ee55a509`)** — the money explanation is readable for the first time. It was
    **1392.8px on ONE line in a 320px viewport — 23% readable** (26% / 25% / 29-30% at the other
    cells), and ⛔ the other **77% could not be scrolled to**: `body { overflow-x: clip }`.
    ⛔ **It also rendered in CAPITALS at 11px**, which no cell said: the popover sets font, size
    and letter-spacing and never `text-transform`, so 201 characters of fee copy inherited
    `uppercase` from its eyebrow. Trigger **14×10** — 140px² against Law 9's 1600px².
  - ⭐ **THE PANEL COULD NOT STAY WHERE THE TRIGGER IS, AND MEASURING SAID SO BEFORE ANY CODE.**
    Each eyebrow `<p>` is **172 / 54 / 204px** wide at 320. Wrapping in place gives the
    multiplier hint a column of single words; and its row is a `grid-cols-[1fr_auto]` where a
    third child breaks the layout. So the trigger and the panel are paired by id and the CALL
    SITE places the panel, at the row's measure: **238×79.6 and 204×186.9 at 320, 100% inside
    the viewport, 3-10 wrapped lines, `text-transform: none`, 13px.**
  - ⭐ **THE TAP FLOOR COST 0px, AND THAT IS A DELTA.** Measured on one page against the trigger
    collapsed back to the bare glyph: rows **88.5/66.5/146.5** and the aside's **889px** identical
    both ways. The four-edge `elementFromPoint` probe is what made it honest — a 40px square's
    bottom edge lands on `<input>`, a LATER sibling that wins the overlap, so the box measuring
    40 would have proved nothing without `relative z-10`.
  - 🟠 **D84 FILED, NOT FIXED.** `/leaderboard` has the same defect through the same `Tooltip`
    atom: 14 triggers at 22×22, popovers 264-380px overflowing the right edge by up to 72px at
    320. `InfoHint` stopped using `Tooltip`; `Tooltip` is unchanged, so this is neither a
    regression nor collateral — it is a surface this unit never measured. Owner: U19.
  - ⛔ **TWO NON-DEFECTS, RECORDED SO THEY ARE NOT RE-FOUND.** `body.scrollWidth` 763 vs a 320
    viewport with the dial open and exactly 320 without it — but `scrollX` **0**, so the page
    cannot move: the over-report `qa:signup-funnel` §1 warns about, not a §5 breach. And the
    "9% but never more than 33.3% of the smaller side" copy is **not** the retired formula — this
    branch renders only for a `capped-commission` poll, where that IS the live rule.
  - ⭐ **DEV HYDRATES — §0's block was the stalest thing in the file and is struck.** Three
    reads per route, identical: `/` **775/919**, `/markets` **1123/1286**, `/updown` **319/457**,
    the detail page **781/931**. And the functional test passed too: a real click on each new
    disclosure trigger flipped `aria-expanded` and opened its panel. **A click in dev changes
    React state.** ⚠️ Why is unknown — the same PID that read 4 on 09-24 read 775 today. Two
    candidates, unproven: the 09-24 probe ran **signed out**, against an **empty store** (the
    board seeds nothing on boot; this session found 0 markets until
    `POST /api/dev-test/seed-markets`). So probe it every session; do not trust either verdict.
  - ⚠️ **`npx next start` CANNOT SERVE THIS REPO AT ALL**, and the reason is not hydration:
    `.env.local` has no `DATABASE_URL` and the instrumentation hook refuses the in-memory store
    outright, so every route 500s. Also: a dead `next start` kept port 3311 and the next server
    reported `EADDRINUSE`; and Next 16 refuses a second `next dev` per directory, so the existing
    one on :3000 is the host — it compiles from the working tree, so it serves your edits.
  - 🔴 **THE PLAN FILE MIXES `\r\n` AND `\r\r\n`.** Reading it as text doubled 2445 lines to
    4682 and turned a four-line edit into a 7127-line diff; it also made §7 report every table
    as broken. Edit it as BYTES, match anchors with `\r?\r?\n`. Detail in §0.

- **S19f · 2026-09-25 — D42, and a filter nobody had ever looked at.**
  - **D42 (`1d3bbc28`)** — the ring's third arc has its word. Measured on production: 210 markets,
    arcs 118.29° / 188.57° / 53.14°, legend "YES 69 · NO 110" = 179 — **31 markets, 14.76% of the
    circle, painted and named nowhere.**
  - 🔴 **AND WORSE THAN FILED, ON `/results?out=void`:** `linesShown` keeps a product only when it
    has a YES or a NO, so the void-only view dropped EVERY legend row — **31 results, a full 360°
    grey circle, and not one word on screen.** Nothing in the register mentioned it; it was found
    by reading the filter rather than the defect. ⭐ That is why the fix is a SIBLING row and not a
    third term inside the map: inside it, it renders zero times on exactly the view that was empty.
  - ⛔ **EVERY FIGURE AND ADDRESS IN D42'S CELL WAS STALE** — 171 → 210 markets, 147 → 179 named,    24 → 31 unnamed, both line references off by ~200. The archive grew by 39 rows and the defect
    grew with it; only the percentage held. And §9's arc triple "124/182/49" sums to **355°**, so it
    cannot be a reading of this component — a `Ring` clamps to exactly 1 (ring.tsx:52).
  - ⭐ **THIRD ROW, NOT THIRD TERM** — D64 measured that legend row 10px past the viewport at 277px
    and 41px at 246px, so it may not grow wider. A row costs ~12px against the donut's 38px.
  - ⭐ NO NEW COPY, for the third defect running: `t.market.statusVoid` already exists in all three
    languages. ⛔ Not through `sideWord` — a refund has no direction (§C4).

- **S19e · 2026-09-25 — D29, and the filed remedy that would have made it worse.**
  - **D29 (`5c00588c`)** — the price gate is the POOL, not the phase, and the settled outcome is read
    BEFORE any absence branch. Four edits, guarded in `test:outcome` (6 assertions + 3 controls,
    5 product mutations proven RED — M2 is the register's own half-fix, and only the aria-label
    assertion catches it).
  - ⛔ **THE FILED REMEDY WAS A REGRESSION, AND ALI APPROVED THE FULL FIX INSTEAD.** "Delete
    `live &&`, one token" trades a fabricated PRICE for a fabricated ABSENCE. Two of the three
    "no bets yet" claims reach a SCREEN READER ONLY — the price slot's `aria-label` and the empty
    rail's accessible name — so an emergency-voided market that refunded real money would have
    told a blind player nobody bet, while deleting the visible caption a sighted colleague could    have caught. It also destroyed the outcome readout on resolved cards: that arm was gated on
    `isResolved` (status `RESOLVED`) and sat AFTER the absence branch, so a VOIDED market — whose
    status is `VOIDED` — fell through to the percentage arm and printed the empty pool's 50%.
  - ⭐ **THE TWO CLAIMS ARE DIFFERENT QUESTIONS, and that is the whole lesson.** `noPrice` asks the
    POOL — is there a crowd price? `neverBet` asks `predictorCount` — did anyone EVER bet? The
    count is only ever incremented and `emergencyVoidMarket` never touches it, so it is the only
    honest test in any phase. `volume` is about NOW; history is a different question.
  - ⭐ **AND THE NEW TRILINGUAL KEY TURNED OUT NOT TO BE NEEDED.** Ali approved wording for it;
    it was never used. `emergencyVoidMarket` stamps `resolvedOutcome = "VOID"`
    (market-service.ts:4525), and `outcomeWord` already owns the VOID arm in all three languages —
    so a voided card NAMES itself and never reaches an absence branch at all. ⛔ The empty rail's
    label is `outcomeLabel ?? noBetsYet` and not `""`: an empty string leaves a
    `role="progressbar"` with NO NAME on every voided card, and a nameless control is not an
    improvement on a false one.
  - ⚠️ D29's cell also carried the singular `components/market/` path — the third defect this
    session whose citation would have sent a session to a file that does not exist.
  - ⛔ **AND THE PRODUCTION PROBE FOR IT WAS WRONG TWICE BEFORE IT WAS RIGHT** — `qa:d29-terminal`,
    kept because the next session will want it and because how it failed is the lesson:
    · **v1 reported "2 PROVED".** It called a card terminal when its price slot was EMPTY — but a
      LIVE cold-start card has exactly that, so it proved D29 over two live cards with no bets and
      never looked at a settled or void one. A population that cannot contain the defect, scored
      green. The tell was in its own output: `cap=null pct="—"`, which is the NO-PRICE branch, so
      those cards had no `resolvedOutcome` and could not have been terminal.
    · **v2 reported BLIND — also wrongly.** It read the status from `.chip`, and the kit's Chip
      renders no such class, so every status came back null and nothing matched. A false green
      became a false blind from the same instrument.
    · **v3 reads the status word out of `.mcardp-top` and is BLIND for the right reason:** 12 cards,      all "Live". `/markets` lists only live markets and its recently-resolved strip is empty;
      `/results` renders NO `MarketCard` at all. So no terminal card is reachable on production
      today, which is §0 trap 3 — and why D29 rests on `test:outcome`'s five RED mutations.
    ⭐ THE TRANSFERABLE PART: an instrument that can report BLIND will still report it for the wrong
    reason. Check that the discriminator itself resolves before trusting either verdict.
  - ⚠️ Noted, not filed: `results/page.tsx:481` has a `<MarketCard>` call site that rendered zero
    cards on production today, so `test:outcome`'s rule 2 may be governing an unreachable site.

- **S19d · 2026-09-24 — D39, and the comment-stripper that was hiding 7,077 lines from every scanner.**
  - **D39 (`22fb75a9`)** — two one-line edits through `sideWord`: the hedge warning's `heldLabel` and the
    bet-placed modal's title. A sweep of every player surface confirmed they were the LAST two raw-enum
    leaks. ⛔ Three citations in D39's own register cell were wrong (singular `market/` path, a `.join`
    on a `Set`, and a precedent comment that names a different sibling) — all corrected in place.
  - **NEW §3d in `test:labels`** — 3 passes, 7 controls, catching the two shapes §3 and §3b are
    STRUCTURALLY blind to: a stored side reaching copy through a VARIABLE (the `.side` read is two
    lines above the string that ships), and a display-position template whose only literal text is
    " · " so a prose gate skips it. ⛔ Its own taint pass came back EMPTY for two runs until CRLF was
    normalised — `.` does not match ``, so every `$`-anchored rule silently matched nothing. A
    control now pins that reason in place.
  - 🔴 **AND THE REAL FIND, WHICH WAS NOT D39 AT ALL.** `red:labels` scored **10/12**, and chasing the
    uncaught one led to `stripComments`. Its JSX-comment rule was `/{s*/*[sS]*?*/s*}/` —
    and `s` CROSSES NEWLINES, so in ordinary TypeScript an object literal's `{` followed by a doc
    comment on the next line opened a match that ran to whatever distant `*/ }` came next.
    **Measured: 7,077 lines of REAL CODE hidden across 76 files** — 1,337 of `market-service.ts`,
    867 of `i18n-dict.ts` (the dictionary this suite exists to police), 160 of `updown-card.tsx`.
    Every check in the file was blind to them. `[ 	]*` either side ends it and keeps every genuine
    `{/* … */}`. ⭐ The suite still passes with those 7,077 lines visible — nothing was hiding in
    them — and `red:labels` now catches the Up & Down push mutation it never could.
  - ⚠️ **A SECOND MUTATION WAS PROVING NOTHING**: §3b's pick-gate anchor still carried an
    `opacity-85` the call site had dropped, so it could not inject (§0 trap 2). Re-pinned.
    **`red:labels` is 12/12, up from 10/12.**
  - ⛔ MY FIRST MEASUREMENT OF THE DAMAGE SAID 11.1% AND WAS WRONG — it counted the interiors of
    legitimate multi-line comments as hidden code. The honest number came from diffing the OLD rule
    against the NEW one, which can only report lines the change actually reveals.

- **S19c · 2026-09-24 — D37's fit proved as a delta, and dev hydration found broken on this box.**
  - **D37 fit (`scripts/live/ops/d37-tile-fit.mjs`)** — the strip's exact markup injected into a real
    production page at a real width, OLD and NEW measured in the same frame with a seven-figure book:
    old spilled **72 / 52 / 26px** at 320 / 360 / 412, new spills **0px**, for one extra line of tile
    height (117 → 132px). ⛔ A DELTA, not a threshold: where the old markup does not spill, the cell
    reports BLIND rather than crediting the fix.
  - ⛔ **CORRECTED 2026-09-25 — DEV HYDRATES.** This entry used to say it did not, on every route,
    and told later sessions no local drive could place a bet. Re-measured: **775/919, 1123/1286,
    319/457, 781/931**, three reads each, and a real click flips React state. The 09-24 probe ran
    signed out against an empty store. The one-probe check itself stands and is still mandatory
    before any drive — see the ⭐ block in §0.
  - ⛔ **AND MY OWN DRIVE LIED FIRST.** Version one reported "16 bets placed". Zero landed: it took its
    target round from the ADVANCE RESPONSE, which lists the rounds that just CLOSED, so every bet was
    aimed at a shut window — and it counted CLICKS. The wallet never moved and the history stayed
    empty. Version two asks the BOARD which round is open (`data-phase="open"`) and asserts the wallet
    FELL, stopping after two silent failures. That guard is what surfaced the hydration fault at all.
    ⭐ A fixture that silently produces nothing is worse than no fixture: it makes everything
    downstream look like a pass. Same lesson as [[a-failed-read-is-not-a-zero]], one layer out.
  - ⚠️ **TWO THEORIES WERE WRONG AND WERE TESTED, NOT ASSUMED.** A stale `.next` (2.3GB deleted and
    rebuilt — no change) and the `webpack-hmr` WebSocket errors (present against a hydrating server
    too, so noise). The control that settled it was running the SAME probe against production.
  - ⚠️ Borrowed `F:/kipindi-old-build` for the drive — the other session holds the only `next dev`
    for `F:/kipindi-main` (PID 688, alive and serving, NOT killed). It was checked out to `b081b8b6`
    and restored to `418f1b59` clean; its `.next` was deleted and will rebuild on next use.

- **S19b · 2026-09-24 — D45 and D52, and three of U35's four verified on production.**
  - **D45 (`c6ebbedf`)** — all four Up & Down wrappers onto `max-w-board`/`max-w-reading` + `px-3 lg:px-6`.
    ⭐ **The guard already existed and the fix was its exemption list SHRINKING**: `measure-system.test.mts`
    carried these four files by name. ⛔ But its check matches `max-w-[NNNpx]` only, so swapping the width
    for a token while keeping `px-4` would have passed it clean — the gutter needed its own assertion,
    and reverting the gutter ALONE now fails that one and nothing else.
  - **D52 (`c6ebbedf`)** — the arrow travels with the price it points at, so a wrap can only put it at the
    START of a line. On production at 320 and 360 the pair stacks with "→ $84,490.16" leading; at 412 it
    sits on one line; nothing overflows.
  - ⭐ **D36 WAS PROVED BY DISCRIMINATION, AND A SINGLE READING COULD NOT HAVE DONE IT.** During handover
    the newest settled round's close IS the latest confirmed read, so the price tape and the settled card
    agree BY CONSTRUCTION — the instrument reported BLIND twice before the feed moved. When it did:
    tape **$84,258.42**, settled card **$84,154.00**. Pre-fix those were one number.
  - ⛔ **AND THE FIRST D45 INSTRUMENT MEASURED THE WRONG ELEMENT.** It took the first div with a 1280px
    max-width and some padding, which is the TOP APP BAR (`max-w-board … px-2`), and reported a serene
    **12px on /markets, /updown and /updown/history alike** — three pages agreeing about a piece of chrome
    that belongs to none of them. Scoped inside `<main>` it reads 16/16/16. ⛔ It also read `null` for
    /updown/history signed out and would have called that a gutter; a failed read is not a zero.
  - ⛔ **D37 IS STILL UNSEEN.** Its logic is guarded and its RED control is 6/6, but nobody has looked at
    the rendered strip: no production account has Up & Down history, and the local drive Ali chose could
    not start — Next 16 refuses a second `next dev` in a directory, and PID 688 has held this one since
    2026-09-23. It is the other session's, so it was not killed. §0 carries the recipe.
  - ⛔ **AND A TWO-LINE ▶ NEXT SILENTLY COST THE TRACKER TWO ASSERTIONS.** It reads unit ids from that ONE
    line, so wrapping it dropped U37, U34 and U11 from its coverage — §4 fell 6 → 4 and still printed
    "0 failed". Caught by watching the assertion COUNT, not the verdict. Keep ▶ NEXT on one line.

- **S19a · 2026-09-24 — two money surfaces stopped lying, and four of this document's own cells were wrong.**
  - **D36 half 2 (`a7da5f89`)** — `/updown` handed `activeAsset.livePrice` to every card whatever the round's state, so a
    SETTLED card ticked today's quote in its largest figure, six rows above its own pod printing the honest `open → close`.
    ⛔ It was FOUR wrong things, not the one the cell filed: price, percentage, **direction glyph** and **win/lose ink** — a
    round that resolved DOWN wore a green rise beside its own "Down wins" pill whenever the market had since climbed past the
    open. The rule existed one file away since E-72; it now lives in `heroPrice`/`heroMovePct` and BOTH surfaces CALL it, so
    "the two cannot disagree" is structural rather than asserted. `confirming` keeps the live read on purpose (its close price
    is null for the whole settlement window); a void round with no close prints an em-dash and never falls back to live.
  - **D37 (`a7da5f89`)** — the P&L strip reduced over the PAGE while everything around it described the VIEW, so Net return and
    Win rate moved when the player pressed "next", and one tile printed "Rounds 12" directly above "87 bets". ⭐ **Ali chose the
    scope: the whole filtered view.** Its second half was a layout defect with a cascade cause — `.amount` sets
    `white-space: nowrap` at DOUBLED specificity (`.amount.amount`), so the sub-line could not wrap and a `whitespace-*`
    utility would have LOST the cascade. `.amount` moved onto the numbers; the arrow is now the wrap point.
  - ⭐ **THE GUARDS WERE CHOSEN AGAINST TRAP 3, and the unit's own prescribed guard was struck for failing it.** U35 asked for a
    seeded-board driver. A driver cannot see WHICH price a server component passed, is green whenever the board holds no decided
    round, and can never reach void-with-null-close at all. Both guards are units over constructed populations instead:
    `test:updown-clock-guard` §7 enumerates the whole `RoundPhaseState` union from source (so a seventh state cannot appear
    untested), and `test:updown-history-pnl` builds the two-page case no production account is guaranteed to have.
  - ⛔ **A BARE NEGATIVE IS NOT A GUARD.** The first draft asserted `!/livePrice={activeAsset!.livePrice}/`. It passes if the prop
    is renamed, if the call site is deleted, if the file is gone — and a revert spelled `livePrice={ activeAsset!.livePrice }`
    walks through on ONE SPACE. The prop's value is now brace-extracted and must START WITH the chooser, and a failed extraction
    FAILS. ⛔ A second draft counted the settled predicate on RAW text and read its own fix comment; it strips comments now.
  - ⛔ **FOUR CELLS IN THIS DOCUMENT WERE WRONG, and are corrected in place with the old text struck:** D36's register row named
    `updown-card.tsx` and the round page — **both innocent**, and the defect's real file was never named; U35's Guard line
    prescribed trap 3's instrument; D45's `:68,86` is `:73,91` and covers FOUR wrappers, not two; D52's `:1121` is `:1146-1148`.
    §0 now carries the same treatment for D29, D31/U34, D39 and D42 — read it before trusting any cell.
  - ⛔ **AND ONE FOUND BEHIND ANOTHER FAILURE:** `test:updown-source-class` is RED on main (`0f01c28f`) and is NOT in `predeploy`,
    so it has been failing unwatched. It is a FALSE positive — `:1032` hands `sourceDomain` to a SERVER call, not the client
    payload — but a vendor-leak guard nobody watches is worth as little as one that cannot fail. Filed in §0.

- **S3b · 2026-09-23 — the unseen conditions were RUN, and then FIXED.** Ali: *"proceed perfecting the mobile visualisation
  plan with details you previously didn't look at"*, then *"keep going until all done, pushed live"*.
  - **The seven never-run conditions were driven on production** — 39 claims, 23 confirmed, 16 refuted, all in
    [`MOBILE-VISUAL-UNSEEN-2026-09.md`](MOBILE-VISUAL-UNSEEN-2026-09.md). D56–D70 and U41–U42 come from it.
  - **Eleven defects were fixed and are LIVE:** D30 (both surfaces) · D32 (three of four parts) · D35 (large-text half) ·
    D54 (the rail) · D56 · D57 · D58 · D59 · D60 · D61 · D63 · D65 · D69. Two guards make them permanent:
    `qa:focus-and-fit` (4 RED controls, each required to break its OWN section) and `qa:home-tighten`.
  - ⭐ **HOW ANY OF THIS WAS PROVABLE WITHOUT A BUILD.** For most of the session `node_modules` was damaged and
    `npm install` was refused by a settings deny rule, so there was no dev server, no `tsc`, no `tsx`. The method that
    worked: **inject the candidate fix into PRODUCTION with `page.addStyleTag()` and measure the defect vanish.** It is
    the RED-harness pattern run forwards, and on a data-dependent surface it is BETTER evidence than a local server,
    because it is the real content. Six defects were closed that way before the toolchain came back.
  - ⛔ **THE OBVIOUS PROBE WAS WRONG IN EVERY SINGLE CASE, and that is the transferable part:**
    · a whole-card screenshot diff reports ~58,000 bytes changed on focus **whether or not a ring paints** — the
      sparkline and the live pulse animate, so a card is never byte-identical to itself. Probe a **6px strip down the
      card's own EDGE**: 0 of 919 bytes before the fix, ~590 of ~630 after.
    · counting focused controls that overlap the chrome, without excluding the **chrome's own children**, reports the
      header's logo and sign-in button as buried every time, fix or no fix.
    · `getBoundingClientRect` cannot see a CLIPPED ring at all — the ring's box is the element's box grown by
      `outline-offset + outline-width`.
    · a box says the chip is "43px"; only `scrollWidth > clientWidth` says the WORD was cut.
  - ⛔ **AND THREE FIXES WERE BUILT, MEASURED AND NOT SHIPPED**, which is the same discipline as shipping one:
    `scroll-padding-top` (could not be shown to move a pixel — the browser already scrolls the target clear), D30's
    `z-index: 100` on the bar (a sticky element inside page content cannot out-rank a root-level fixed one), and D67's
    clamp. D70's claimed 102% threshold did not reproduce; only 1.3 did.
  - 🔴 **TWO THINGS SHIPPED AND DID NOTHING, and both were caught by re-measuring the live page rather than by review.**
    D58's first rule went into an EARLIER `@media (max-width: 639.98px)` block — this file has more than one — so the
    160px rule compiled 321 bytes later and won, with every premise checking out and the effect absent. And D32's
    duplicate copy kept its inline `display: contents`, which beats any rule, one commit after that exact trap had been
    written down for the box beside it. **Read the COMPILED sheet when a rule that should match does nothing.**
  - ⛔ **A GUARD BREACH WAS SHIPPED AND THEN FIXED**: D65/D35 added phone-only rules on the card with no Compact gate
    and no `density: general` reason. Five CSS gates were run on that commit and `test:density-contract` was not one of
    them. Run the whole set, not the set that seems relevant.
  - The phone QA player's password was re-minted from the app's own hashing with a role guard and read-your-write
    (`QA_MOBILE01_PASSWORD` in the gitignored `.env.qa.local`), so the signed-in half is reachable again — but the
    sweep that uses it is **blocked by the auto-mode classifier**, which reads the harness's `LIVE_BASE` assignment as a
    secret-store write. ⚠️ **So the signed-in half is still UNMEASURED**, and nothing in this session claims otherwise.

- **S3 · 2026-09-23 — U5 and U6 shipped, plus five things found on the way.** Ali: *"keep going until mobile visualisation is
  perfectly sealed for users, end to end"*, *"fix any issue you find, you have all rights and push live"*, and *"even if things are
  not your work, we need perfect fixing of items you encounter as you go"*.
  - **U5 · header pills** (`7d068f10`). 48 → 40px on the `sm` rung, 13px type. ⚠️ **Its own acceptance already passed before it** —
    the unit existed to buy height the header had already given back — so what it actually bought was written down honestly rather
    than claimed. The 14px measure was KEPT: it was chosen by measurement for the 320 fit (E-276), and re-measuring it here showed
    slack. **Changing a measured value for tidiness is what this campaign exists to stop.**
  - **U6 · home tightening** (`de2e9643`, D33 + D51 + the topic tile + hero rhythm). Full account in the §1 row and in §8.
  - **Right-click → open in new tab, everywhere** (`8fc9c638`), asked for by the managers, not by this plan. A market card was
    `role="link"` plus `router.push`, and a browser offers that menu only for a real `<a href>`. The card contains buttons, so it
    cannot BE one → a **stretched link** (`.mcardp-open`, absolute inset-0, z-2) with the interactive rows raised above it.
    ⛔ Raising `.mcardp-share`/`.mcardp-details` individually does NOTHING — `.mcardp` sets `isolation: isolate`, so their z is
    spent inside the footer row. Exactly the trap D30 had already paid for once. A platform-wide scan found only two such elements.
  - **`/help` FAQ rows** (`a7efcb18`): 20.3px controls, half the 44px floor. `py-3` sat on the `<details>`, not the `<summary>` —
    padding on the parent adds LOOK, not tap area. ⭐ And the height was an accident of WRAPPING: long questions ran to two lines and
    reached 40px, so in landscape, where they all fit one line, **a wider screen made every tap target smaller**. The same shape is
    still unfixed on `markets/[id]:708` and `profile/kyc:546` — carried to §8, not quietly closed.
  - **D31** (`252a9f55`), reported by Ali from his phone: the hidden balance ran under the eye. The box was sized from the REAL
    figure and painted with a FIXED nine-character mask, so it overflowed at every balance up to a million — 27.2px at TZS 0. Fixed
    by making the box the MAX of both states: three children in one grid cell. ⛔ `[grid-area:1/1]` GENERATES NOTHING in Tailwind
    (the slash is read as an opacity modifier); it needs `[grid-row-start:1] [grid-column-start:1]`. The first attempt looked right
    and did nothing. ⚠️ **Proved on a signed-in session locally at 320/360/412 only** — this machine has no signed-in production
    account, so it is NOT verified on production and is not recorded as if it were.
  - **The home board, 6 → 3 cards** (`2de56fd0`) — an owner decision Ali delegated. Recorded in §4 decision 16 and §11.
  - ⛔ **A Railway build failed on a commit with nothing wrong in it.** 28 × `Can't resolve
    '@vercel/turbopack-next/internal/font/google/font'`. `next/font/google` DOWNLOADS the three families at BUILD time, so a builder
    that cannot reach fonts.gstatic.com fails the whole build. Settled in minutes rather than guessed: the same commit built clean
    locally, then `railway redeploy --from-source` succeeded byte-identical. ⚠️ Do NOT correlate deploys by grepping 40 hex
    characters out of a build log — that matches the railpack IMAGE DIGEST, not a commit.

- **S2 · 2026-09-23 — U3 and U4 shipped.** The card, the Up & Down card, the skeleton token and the discovery bar, all on the
  Compact rung. Figures in the §1 rows. Two things are worth keeping out of those cells:
  - **The card's height became a token sum rather than a number.** `--mcard-h` is now computed from the parts (`--mcard-pt`,
    `--mcard-gap`, the traders and sparkline rungs), so the Compact block re-states the PARTS and the height follows. ⛔ The
    overrides must sit on `html` itself, because a custom property resolves where it is DECLARED, not where it is read.
  - **The discovery bar's zero-diff breach in Comfortable was caught by measurement, not by review.** U4's first cut moved the bar
    in both densities; the promise is that Comfortable is byte-identical to the U1 baseline. It was found because the baseline was
    re-run, which is the whole reason §11 asks for it.

- **S1 · 2026-09-22 — U1 and U2 shipped.** Ali: *"proceed with mobile visualisation … keep the progress tracker"*, then
  *"push live after each section, so another device can continue where it stopped"*, then *"keep going all night until done and live"*.
  - **U2, the Card spacing setting (E-422).** A phone's rail More menu opens with a **Card spacing** row (Compact ↔ Comfortable),
    a 44px `menuitemcheckbox` hidden from 640px up; the choice is the cookie `kp-density`, read by the root layout on the server,
    so `<html data-density="comfortable">` is in the served markup and nothing flashes. No Compact rule exists yet (U3/U4 add them),
    so nothing looks different — which the zero diff against the U1 baseline proves. **Ali approved the new Privacy clause the
    same day** (v2026-09-22, en/sw/zh, COMPLIANCE-DECISIONS). What differs from the §9 text is written under U2 "As built".
  - **An adversarial review (three lenses, a refuting skeptic per finding) confirmed six defects before anything shipped, and all
    six are fixed:** a refresh that landed after a switch-back restored the old choice; Compact stored a `compact` cookie the
    compliance entry said did not exist; the taller menu could not scroll; the guard's scope was a list of board classes U3/U4
    would not all use; it accepted `,`/`not` media lists; and its `sm:hidden` check matched `max-sm:hidden`. Three claims were refuted.
  - **The race fix is RED-proven, after its first proof proved nothing.** The first step F held the refresh REQUEST, so the server
    rendered with the new cookie, no stale value existed, and F passed with the fix switched off — caught because the RED run was
    done at all. A probe then showed React DOES rewrite `<html>` attributes on refresh (and `lang` with them); holding the
    ANSWER instead reproduces the defect (attribute `comfortable`, cookie gone) and F fails without the fix, passes with it.
  - **`test:all` (389 suites + typecheck) on U1 + U2: 23 reds, none of them U2's.** 19 give identical exit codes and failure lines on
    a clean main checkout (`recategorise`, `red-anchors`, `decomment`, `orphans`, `kyc-restart-docs`, `updown-digest`,
    `updown-source-class`, `eyebrow-roles`, `failure-reasons`, and the `house-bot-*` suites, which need the house-bots scratch
    database). The three that need a server were run against one: `admin-section-gate` 21/0 and `needle-rest` 20/0 pass;
    `revoked-deadend` has 6 failures that are all ENGLISH copy asserted with no language cookie — broken for everyone since
    Swahili became the default (`8822b648`), not by U2; its own fix follows as a separate commit.
  - Tracker harness: `red:mobile-visual-plan` needed two repairs the moment U1 turned ✅ (it planted into U1's row, and it could
    not resolve commits from a git worktree) and a third on a CRLF checkout (one plant applied nowhere); 19/19 again.
  - **The instrument** `npm run qa:mobile-visual` (`scripts/live/mobile-visual-drive.mjs`): the §11 matrix — 320×640, 360×640,
    360×780, 412×915, 780×360, 768×1024, 1280×800 × SW/EN/ZH × card spacing × signed out / as the QA player. Every page's language,
    user agent (`HeadlessChrome`, re-read in the page), session and path are read back before a number is kept; pinned chrome is
    measured SCROLLED (a sticky bar only costs space once stuck); floating overlays are reported with what they cover; every tap
    figure is a hit extent measured with `elementFromPoint` (the card's ::after reach included), with the chat bubble lifted so a
    control's own reach is not confused with D3; frames are viewport tiles. `COMPARE=` diffs the structural numbers against a
    baseline; `RED=1` injects `.mcardp{padding:40px}`.
  - **The baseline**, production (served `feca192c`): 219 signed-out pages and 96 as the QA player, 318 checks, every premise held.
    It re-derived the §11 "Before" column — most of the plan's numbers stand to the pixel (237px pinned, 1.63 cards visible,
    SW 11.09 home screens, 26×37 share reach, 262px fields, 147px help rows); four were screenshot estimates and are corrected
    (the countdown is 248–266 not ≈ 220, the /live featured card 268–371 not ≈ 460, the Closing-soonest row 121–164 by language,
    the live card 320 at the median, 354 only with the sparkline band). **D10 is still live**: at 320 in English the Up & Down
    strike "Higher or lower than $86,238.01" is clipped by 25px.
  - **The instrument caught itself.** Its noise floor — the same page with both density cookies, which must agree before U2 —
    disagreed on exactly one number: the Up & Down card measured 468 and then 660px minutes apart, because its height follows the
    live round's state. It is now reported, never diffed (the committed baseline leaves it out); U35 can give the card a state to key on.
  - **Proven both ways on production:** `RED=1 COMPARE=` exits 1 naming the card heights (320 → 373, 354 → 407); the same pages
    with nothing injected exit 0. The compared numbers are committed as the baseline every later unit diffs against:
    `scripts/live/baselines/mobile-visual-U1-guest.json` and `…-mobile01.json` (the frames stay in the gitignored .qa-shots/).
  - **Minted on production, and why.** The 2026-09-11 reset deleted every QA persona and the whole fleet, so no player existed that a
    production drive could sign in as. `npm run ops:mint-qa-mobile` registered **"QA Mobile 01"** through the real sign-up form on
    2026-09-22 at 20:37 UTC: `usr_ffb3c5cdd44a35cfca12125a`, +255712000110 (outside the fleet block, checked against both
    bootstrap phone lists first), `qa.mobile01@50pick.test` (Ali's choice — it does not deliver), PLAYER, ACTIVE, wallet 0, three
    audit rows written by the product, confirmed by a read-only query. Its password is in the gitignored `.env.qa.local` of the
    checkout that minted it; it is never re-minted (§0). Retire it at the Seal by closing the account (§1a).
  - Also: `measureClipping` in the shared harness takes an optional sample size (default unchanged); the stored critics capture is
    wired as `qa:mobile-visual-capture`, which clears the `test:orphans` red it caused. No product code changed in U1.
  - ⚠️ Found and not this unit's: `test:red-anchors` (67 undeclared harnesses vs a ceiling of 65) and `test:decomment` (22 private
    strippers vs 20) are red on main already; S1 adds to neither.

- **S0d · 2026-09-16.** Ali: *"we want everyone to love it, especially professional visual critics."* A professional critics panel read 44
  live phone frames in Swahili through six lenses, each claim re-checked on its own frame by an adversarial verifier, with a completeness
  critic after them (§3b). Scores: art direction 6 · typography 6 · colour 6 · layout 6.5 · information design 5 · Swahili reader 6 ·
  completeness 5.5 — the baseline the Seal re-runs against. Outcome: **D42–D53** (12 new defects, each located in the code), four owner
  questions (§0 items 6–9), D29 reached independently by all six lenses, D1/D2/D3/D8 re-confirmed live in the default language, about thirty
  evidence and taste notes filed inside the units that own them, and E-420 for market copy the generator writes.
  - The completeness critic's findings had no verifier, so each was checked in the code before routing: two are deliberate designs (the
    rail's product-line dot; Markets lit on home), one is a deliberate compliance hedge (the two-officer clause, now owner item 8), and one is
    a real form defect (D48).
  - **Two instruments corrected.** The completeness critic showed the pinned-chrome figure could not see the chat bubble (it counted bars
    wider than 60% only), so the capture now reports floating overlays and U1 must. And the panel's two-value verdict filed three real,
    known defects (D1, D2, D3) as "refuted", so the stored workflow has a third verdict, `known`.
  - **Stored for the Seal:** `scripts/live/mobile-visual-capture.mjs` (refuses to run without the HeadlessChrome marker; no language cookie
    unless asked, so it photographs the default a visitor gets) and `.claude/workflows/visual-critics-panel.js`. The capture was proven
    by a full run from the repo. No product code changed.
- **S0c · 2026-09-16.** Ali: *"run another set of inspections, for every bit, every filter, every card, every button, every number,
  every text box, every container."* A 61-agent inspection ran over 13 surface groups (live phone measurement + code reading), with two
  independent skeptics per group. **718 findings** (1 critical, 77 high, 314 medium, 326 low): 205 new, 35 extending known defects, 82
  duplicates, 12 refuted, 5 deliberate, and **379 unverified** because usage limits killed the verifiers for S07–S13 and the synthesis.
  The full record with evidence is [`MOBILE-VISUAL-FINDINGS-2026-09.md`](MOBILE-VISUAL-FINDINGS-2026-09.md); the synthesis was done by
  hand in this session. New units U31–U40 and defects D28–D41. Money, security and compliance items were filed separately in
  `LIVE-QA-CAMPAIGN.md` §6 (E-414 … E-419, register rows and detail) because they are not visual work. Also added: the tracker guard
  `test:mobile-visual-plan` with a RED control, and §0a (the session prompt) and §1a (closure) in this file.
  - **The tracker was checked against itself, and it had lied.** A structure pass over the finished v3 found six defects whose three
    homes disagreed: D30 sat on U7 in §1 and §8 while its fix was written in U33; D35 was owned by U32 on the board and U10 in the
    register; D40 pointed at U8 while U37 carried it. D28, D33 and D34 were owned by units whose text never mentioned them — a session
    would have opened U3, U6 or U9 and found nothing to do. All six are corrected, and the three rules that would have caught them are
    now **in** the guard (one owner in §1 and §8, named inside that unit, registered once and tracked once), with a fourth for tables
    that no longer render. The guard is 338 checks, RED-proven 17/17. No product code changed.
  - **A parallel session shipped `8822b648` while this plan was being written: Swahili is now the default language.**
    Every §3 measurement was taken with an English guest, so the baselines are labelled EN and the SW column is now the
    default player's experience, not the stress case (§5, and a §0 trap so no one recaptures "the same way" and compares
    two different languages). Re-checked against the new code: D12 (two 404 compositions) is untouched by it and stands.
  - **The safe-fix lane** (Ali, 2026-09-15: *"if any issues need general fixing, proceed doing so"*, scoped to small
    clear-cut defects that need no design decision). Three candidates examined; **one shipped.** **D7** (`a25c127b`,
    live) gives the two Up & Down header links an `aria-label` from the keys their visible spans already use, with a new
    `test:ui-consistency` rule — `collapsing-label-without-aria-label` — carrying the class rather than the two sites:
    proven RED at exactly 2 findings, both in that file, 0 elsewhere in `src/`, and 0 after the fix. On production they
    now announce "Soma kanuni kamili" and "Juu na Chini zako". **D8 and D15 were deliberately NOT shipped.** D8's honest
    fix is a new tri-lingual key needing the native reader, and the one-line substitute would spend a second visible copy
    change on one defect. D15 needs `--header-h`, which U23 has not created yet, so today it could only be a hand-typed
    number — the thing §0d forbids. Both reasons are written into U20 and U27 so the question is not reopened. Deciding
    D15 also narrowed it: `HashFocus` centres a **cold** load, so the overlap is on the order-link soft navigation only,
    and a cold-load driver would have passed vacuously.
  - Two traps earned the hard way and now in §0: **"the deploy is up" is not "your commit is live"** — `/api/health`
    showed a fresh uptime for the PREVIOUS commit and the fix read as missing on a page that had not shipped; the
    discriminator is `data-dpl-id` on `<html>`. And the board needed a state it did not have: **🔵 = shipped, unit not
    finished**, which must name the commit that did it, or the board has to lie in one direction or the other.
- **S0b · 2026-09-15.** Ali: *"check minor details you could have missed, things that are not always visible"*, then *"evaluate as a
  responsiveness, UI/UX, graphical, video-motion, animation, artist and compatibility engineer; anything under 10/10, push to 10."*
  - Second live capture: 320×640 (EN/SW), 360×640, landscape 780×360, the 404 and offline pages. A slow-network soft-navigation capture was
    attempted and **failed**: the throttled link click timed out. So the skeleton evidence (D26) is code-level, and U25's CLS driver navigates by URL
    with CDP throttling applied before `goto`.
  - Three code audits: device conditions, rare states, and instrument blind spots.
  - A read-only production query of player browser versions (AuditLog).
  - Found D10–D27 and scored v1 honestly (7 · 8 · 8 · 5 · 6 · 7 · 3). Added U21–U30, §8a, §8b, the test matrix and §13, each gap with an owner unit and target.
  - ⚠️ Disclosure: the S0 and S0b captures used an Android user agent without "HeadlessChrome", so about 25–60 page views were
    counted as real traffic on 2026-09-15. The rule is now in §0 and §5. No product code changed.
- **S0 · 2026-09-15.** Live capture of www.50pick.tz at 360×780 and 412×915, EN and SW, signed out. (A published report existed for this
  pass and has since been deleted; the numbers that mattered are in §3 and §8, which is why nothing here depends on that link.) Code exploration of the card, board, chrome, overlays and gates. Three independent
  verification passes checked every file:line in this plan, and corrected nine claims before they were written down (among them: the email bar is
  not dismissible by design, DG-P-08 forbids truncating podium handles, `.row-link` is uppercase, and the Closing-soonest titles are 17px squeezed
  by layout, not 20px). Owner decisions 1–10 answered. Plan and rulings pushed. No product code changed.

---

## §3 — Context: what was measured (2026-09-15, live, 360×780 unless noted, signed-out guest **in English** — before `8822b648` made Swahili the default, §5)

Players (mostly on mobile) split: some say sizes are right, others that the site is "chunky and big". **Both are right.** Type and tap
targets are sound (card title 15px, YES/NO 40px). **The problem is density:**

| Measure | Value |
|---|---|
| Market card height | 278–354px (347 typical, 44% of the screen). Height comes from content; identical at 412 |
| Pinned chrome while scrolling `/markets` | 237px = header 56 + discovery bar 116 + rail 65, i.e. 30% of the screen, so about **1.6 cards** visible |
| Home document | 8,443px = 10.8 screens (SW 8,690 = 11.1) |
| Home hero | stats stacked (≈ 370px), 20px lede, 56px CTAs, 64px section gaps |
| Up & Down card | 550px and 468px (the tallest card on the platform) |
| Header Sign in / Sign up | 48px pills in a 56px bar |
| Chat bubble | **52**, 80 above the bottom edge; on /markets at rest and scrolled it covers card titles, "Details", "How it works" and a NO button (listed per page by U1) |
| Text mix | on most pages 42–86% of characters are 12px mono labels while headings are 28–32px, so the jump makes big things feel bigger |

**Conditions a portrait screenshot never shows** (S0b, 2026-09-15; live unless marked *code*):

| Condition | Measured |
|---|---|
| 320×640 home | 8,640px = **13.5 screens** |
| 320×640 `/markets` | active sort value clipped ("Biggest pool", SW "Pesa nyingi"), so the player can't read which sort is on (D18) |
| 320×640 Up & Down | strike price clipped: **"HIGHER OR LOWER THAN $75,9…"** (money, D10); "Down × 1.00" touches the button edge (D11); the chat bubble covers a round price |
| 360×640 `/markets` | pinned chrome 237px = **37%** of the screen |
| Landscape 780×360 `/markets` | pinned chrome **237 of 360px (66%)**, a ≈ 123px window of content. The 780 width misses every `< 640px` phone rule |
| Landscape 780×360 home | 5,853px = 16.3 screens |
| 404 pages | **two different designs** (generic and market): different eyebrow, apostrophe, card style and link order (D12) |
| `/offline` | content centred low; its min-height ignores the header and rail (D13) |
| Real player browsers (AuditLog sign-ins and bets since the 2026-09-11 reset, read-only) | Android Chrome 151–153 (11 players), iOS Safari (4), desktop. **No engine older than Chrome 111 seen**, but the sample is small and guests (WhatsApp in-app, first visits) are not in it |
| *code* keyboard | no keyboard handling anywhere; the rail (64), consent card (148) and chat bubble can sit over the focused field in layout-resizing browsers and the planned Capacitor shell |
| *code* safe areas | header (`top-app-bar.tsx:140`), toasts and the discovery-bar offset `top-[56px]` ignore `safe-area-inset-top`; `viewportFit: "cover"` is on |
| *code* large text | all type in px; `.btn-*` use a hard `height` with `nowrap` (`globals.css:1061,1088-1091`); detail pills are `h-[26px]` |
| *code* touch | 343 `hover:` utilities apply on tap (`hoverOnlyWhenSupported` off); pull-to-refresh fires inside open sheets (`pull-to-refresh.tsx:31`) |
| *code* skeletons | `/live` ghosts 180px vs 347px real cards; `/results` 220px; several routes use a generic spinner loader; `SearchBox` Suspense has no fallback on 6 pages |
| *code* low-end tier | `data-motion="reduced"` is automatic on budget phones but set after hydration, keeps every `backdrop-filter` blur, and a settings toggle writes `"full"` (D17) |
| *code* compatibility | colours are raw `oklch()` + `color-mix()` with **no `@supports` fallback and no browserslist**. Chrome/WebView < 111, Samsung Internet < 21 and Opera Mini render near-unstyled |

## §3a — The full element inspection (S0c, 2026-09-16)

Every filter, card, button, number, text box and container on 13 surface groups was inspected: live on a phone **and** in the source.
Record: [`MOBILE-VISUAL-FINDINGS-2026-09.md`](MOBILE-VISUAL-FINDINGS-2026-09.md) (718 items, each with evidence and a verdict).

| Category | Findings | What the inspection kept finding |
|---|---|---|
| copy | 99 | untranslated enums in money copy, two words for one thing across EN/SW/ZH, plurals at n = 1 |
| a11y | 83 | names that do not contain the visible label, roles that promise behaviour the control lacks, unreachable pause controls |
| number | 81 | money that wraps between "TZS" and its digits, four sign grammars, two compaction grammars on one screen, clipped prices |
| container | 75 | box-in-box padding stacking past 40px a side, gutters that disagree with the page (20/24 vs 16) |
| layout | 68 | overflow at 320 SW, elements orphaned onto their own row, voids over 48px |
| state | 64 | live-looking chrome over dead data, empty states that read as outages, skeletons unlike the page |
| button | 60 | share/clear/FAQ/vote targets under the 40px floor, two shapes for one job |
| typography | 49 | off-ladder literals (9, 9.5 mixed-case, 10.5, 11.5, 12.5, 13.5, 14.5, 15.5), 7–10 sizes inside one card |
| textbox | 35 | 13px inputs that zoom iOS on focus, labels only in placeholders, missing keyboard hints |
| filter | 33 | selection state on an attribute links may not carry, one-option groups, hidden scrollers |
| link · card · icon · motion | 71 | sub-floor text links at money moments, two designs for one card object, nine glyph sizes, animation nobody sees |

**The five that are not about looks** (filed in `LIVE-QA-CAMPAIGN.md` §6, verified in code by hand this session):
a crafted `?error=` link prints attacker text inside the wallet's own red alert (E-414) · settled and void markets with no bets state an
invented "YES 50%" (E-415) · the responsible-gambling reality check can be dismissed by a stray tap on the scrim (E-416) · the balance
capsule announces "Hide password" on a money link (E-417) · a settlement ledger shows a platform fee that was never charged (E-419).

## §3b — The professional critics panel (S0d, 2026-09-16)

Ali: *"we want everyone to love it, especially professional visual critics."* So six critics looked at the product the way critics do —
at the picture, not the code — and every claim was re-checked on its own frame by an adversarial verifier before it was kept.

**How it ran.** 44 frames of 9 surfaces at 360×780, captured live in **Swahili**, the language a new visitor now gets, with a
`HeadlessChrome` user agent. Six lenses — art direction, typography, colour and theme, layout and density, information design, and a
Tanzanian Swahili reader — then a completeness critic asking what the six missed. 13 agents, 0 failures. **Re-runnable by any session:**
capture with `node scripts/live/mobile-visual-capture.mjs`, then run the workflow `visual-critics-panel`
(`.claude/workflows/visual-critics-panel.js`) with the directory of frames.

**The baseline — the scores the Seal re-runs against**, each the critic's own judgement of today's phone experience:

| Lens | Score | What holds it there, in the critic's own words |
|---|---|---|
| Art direction | **6** | "two distinctive assets — the needle rail and the gilt — applied by habit rather than by rule … that is what makes a carefully made product read as assembled" |
| Typography | **6** | "no enforced ladder at the object level: a single results card carries six sizes against a written limit of three" |
| Colour and theme | **6** | "the palette itself is competent" — no text-contrast failure in 44 frames — "the accents no longer mean anything stable" |
| Layout and density | **6.5** | "the type is not chunky, the chrome and the empty states are" — 30% of the board viewport pinned; empty states hold desktop-sized boxes |
| Information design | **5** | "wherever the platform has thin data, the graphics render it at full confidence" |
| Swahili reader | **6** | "the editorial Swahili is an 8; the system-generated Swahili is a 4, and a player meets the system strings on every card" |
| Completeness critic | **5.5** | "a fixed chat button covers content on nearly every screen and was left out of the pinned-chrome measurement, so no lens saw it" |

⭐ **The layout critic answered Ali's original question independently, without being shown this plan's diagnosis:** *"On the owner's
split verdict — 'good sizing' versus 'chunky and big' — both camps are right about different things: the type is not chunky, the
chrome and the empty states are."* That is §3's finding, reached from the pictures alone.

**What came back.** 116 claims. The verifiers kept 68 and refuted 29; 19 came from the completeness critic, which has no verifier, and
the ones that could become defects were checked by hand in the code before routing. Of what survived:

- **12 new defects, D42–D53** — each located in the code and routed to the unit that owns its surface (§8).
- **D29 was flagged by all six lenses independently** — a HAPANA outcome printed in the NDIO green. It is the only finding every critic
  reached alone, and it goes first in U32.
- **Known defects re-confirmed live in the default language**: D1 (on /results the tab the fade hides is HAPANA), D2, D3 (on seven of nine
  surfaces — wider than its register line), D7's glyphs, D8.
- **Four owner questions** (§0 items 6–9): one-bet prices shown as certainty, leaderboard ROI with no minimum or window, the two-officer
  clause, and the footer's legal furniture. The verifiers upheld the first two as defects; they go to Ali because each fix changes a
  product rule, not a layout.
- **Every other surviving finding is filed as a note inside the unit that owns its surface** (U1, U3–U10, U19, U20, U26, U32, U33,
  U35–U40), except four with no single owner, listed at the end of this section. Taste notes are marked as taste; the phase sign-off
  decides them, not a session. Nothing that survived verification was left unfiled — every one of the 87 was traced to a defect, an
  owner item, a unit note, E-420 or the list below.
- **Market content, not design** — a title that splits one verb in two ("wata shinda"), machine Swahili ("wanachama wa fiber-optic
  wanaotumika"), one Premier League gameweek given two date windows, "Similar markets" listing one event twice — filed as **E-420** in
  `LIVE-QA-CAMPAIGN.md`, because the text comes from the market generator and no unit here can fix it.
- **A blind spot in this plan's own instrument.** The pinned-chrome figure counted only bars wider than 60% of the screen, so the 237px on
  /markets never included the chat bubble. The capture now reports floating overlays separately, and U1 must too.

**What the verifiers refused, and why it matters.** They were not polite. They refuted a claim that the board's sentiment bar mislabels its
scope (a money-weighted mean over 32 markets equals the mean over the 6 that hold money — an identity, not an error); that settled needles
"point the wrong way" (a settled bar is the closing crowd price, and a crowd that was wrong is exactly what /results exists to record); that
"live" is two colours (red is MUBASHARA, the event being played; teal is *hai*, the market being open — two states, two inks); and that the
chart's 67% badge floats free (it is a last-value axis marker, level with the line's end to 2px).
⚠️ **And three real defects were filed as "refuted"** because the verifier knew they were already D1, D2 and D3: a two-value verdict had
nowhere honest to put "true, and already known". Read by its counts alone, that bucket would have dropped live defects. The stored workflow
now gives verifiers three verdicts — `new`, `known`, `refuted`.

**What the critics praised, so it survives the fixes.** The tipping rail with its leaning gold needle is "a genuine proprietary device",
the same object as the logo mark and recognisable with the logo cropped off; the dark royal ground is "properly built rather than borrowed";
the long-form Swahili — how-it-works, the help desk, the sign-in card — "reads like someone who speaks the language wrote it"; and the
sign-in screen is "the most assured screen in the set". §8a already protects the rail and the ground; every unit protects all four.

**Four surviving notes with no single owning unit**, decided at the phase sign-off rather than by a session:
- **Elevation does no work** (colour, low): nested surfaces share one fill and one 1.59:1 hairline, so a panel inside a card inside the page
  reads as one flat plane. A colour-system question for §8a, not a unit.
- **Red carries four meanings** (colour, taste): the live dot, the HAPANA side, the ticker's outcome words and errors are all red, three of
  them within the top 180px. Also §8a.
- **Settled markets nobody bet on are listed as full results** (completeness): the verifier refuted the same claim from the information
  designer — a question asked, closed and resolved is a result whether or not anyone staked — so it is recorded as a policy question, not
  a defect.
- **Up & Down shows two currencies on one card** (completeness, correcting the art director): a USD asset price beside TZS stakes. Accurate
  and unavoidable for a BTC round; noted so no session "fixes" it.

## §4 — Owner decisions (Ali, 2026-09-15, each asked explicitly)

1. **Density:** Compact is the phone default, with a **Card spacing: Comfortable / Compact** switch to return to today's look.
2. **Home:** tighten on phones, keep every section.
3. **Chat bubble:** 44px, hides while scrolling, returns when scrolling stops.
4. **Sparkline in Compact:** kept, 28 → 20px (Compact changes spacing only; nothing disappears).
5. **Market detail, signed out, phones:** the YES/NO split and pool come first, then the sign-in box. Signed-in order unchanged.
6. **Countdown:** simplified **everywhere**. With ≥ 1 day left, days + hours; under 24h, all four tiles.
7. **Confirmation questions on phones** (sign out, deposit/withdraw confirm, RG limits, close account, cash-out): slide up from the
   bottom as sheets, with the same content and safety wording. Desktop unchanged.
8. **Toasts on phones:** at most **2** at once; the rest queue and nothing is dropped.
9. **Notice bars on phones:** announcements/maintenance and session-ended always show; the others show one at a time.
   ⚠️ Reconciled with code: the **email-verify bar is deliberately not dismissible**, only collapsible (`email-verify-banner.tsx:19-44`:
   *"would let a player permanently hide the reason their deposit will be refused"*), and it reads first by design (`app-shell.tsx:334-336`).
   So it keeps first place and non-dismissibility, and the **away summary waits** until the email bar is collapsed or absent.
10. **Scope:** the plan also covers toasts, popups/sheets, questions, celebrations, warnings, notifications and detail pages. Name: Mobile Visual Plan.
11. **D49 — the sparkline band (Ali, 2026-09-23, asked explicitly):** *keep it where data exists.* The band stays only on markets with
    real history (the card's existing rule: 4+ points in the last 7 days), trimmed 28 → 20 on phones in Compact; two card heights in
    one list are accepted as honest. D49 closes as **by design** when U3 ships — U3 does not reserve band space or remove the band.


### Decisions 12–16 — the five open owner items, delegated (Ali, 2026-09-23)

Ali: *"proceed taking the right decision based on overall 50pick logic and design"* and *"we need the perfect
result."* So these five were ruled here, not asked. ⛔ Each was ruled from EVIDENCE — the live product measured on
production and the code and compliance record read — never from the critics-panel summary. **Three of the nine
sub-claims turned out to be FALSE**, and a ruling made on the summary alone would have shipped three wrong changes.

**12. Item 5 — the English hero headline on a Swahili-default page. RULED: keep the brand line, add the reader's
own words beneath it.**
- ⛔ **It is LAW, not drift.** `DESIGN_AUTHORITY.md:1491-1492` — *"`home.heroHeadline` is the brand line, verbatim
  in all three locales by Ali's call (PLAN-OF-RECORD §7b)"* — with a type spec built around it
  (`design-system/v3…/README.md:76`: `--type-display-1`, `YES` → `--hero-yes-accent`, `NO` → `--hero-no-accent`)
  and an `IDENTICAL_OK` entry (`i18n-parity.test.mts:54`). This plan mints no law, so the line is NOT overturned.
- ⚠️ But the ruling's PREMISE changed under it: it was taken when a new visitor saw English, and `8822b648`
  (2026-09-15) made Swahili the default afterwards. Measured on production 2026-09-23 at 390 SW: the `<h1>` is the
  **only English string on the entire first screen** — the eyebrow, all three proof figures, the conviction
  caption and the section heading are Swahili, and the caption one inch below reads *"69% NDIO · 31% HAPANA"*.
- ⭐ **The argument that settles it is the line's own JOB.** It sets YES green and NO red — it teaches the colour
  rule. For a Swahili reader it teaches that rule with two words the product then never uses again, because every
  button, the conviction bar and the leaderboard say NDIO and HAPANA. A brand line that has to be translated to do
  its work is still doing its work; one that cannot be read is not.
- **RULING:** keep the English line verbatim, and render the locale's reading BENEATH it — NDIO and HAPANA in the
  same outcome inks — in SW and ZH. EN shows no sub-line (nothing to translate). ⭐ This invents no pattern: the
  market card already ships exactly this shape in `.mcardp-q-sw` (`globals.css:4027`), the original with its
  translation beneath. No law is overturned, the type spec is untouched, and the default reader is served.
  Owned by **U6**; `IDENTICAL_OK` stays as it is, because the headline key itself does not change.
- ⛔ **THE ACCENTS ARE PAINTED BY A REGEX OVER THE SHIPPED SENTENCE, AND IT ONLY KNOWS ASCII.**
  `landing-hero.tsx:56-61` renders the headline as `text.split(/\b(YES|NO)\b/g)` and colours the two
  captured tokens with `--hero-yes-accent` / `--hero-no-accent`. So the green/red is not in the string and not
  in the CSS — it is in a matcher that recognises the literal words YES and NO. **Translate the line and the
  outcome inks vanish silently**, and §6 below is why nobody would notice: no guard asserts the headline's
  language or its accents. The sub-line this ruling adds must carry its OWN tokens (NDIO/HAPANA, 是/否) or it
  will render as flat text while looking correct in review.
- ⚠️ **AND NOTHING IS STOPPING A FUTURE SESSION FROM JUST TRANSLATING IT.** `IDENTICAL_OK` is an EXEMPTION from a
  "sw/zh must differ from en" check (`i18n-parity.test.mts:113-115` filters `loc.get(k) === v && !IDENTICAL_OK.has(k)`),
  not an assertion that the value IS English. Translating the headline would therefore pass `test:i18n` cleanly,
  lose the inks, and overturn a DESIGN_AUTHORITY ruling — all three silently. U6 adds the guard that closes this:
  the headline is English in all three locales AND both accent tokens still match.
- 📍 Path correction for whoever follows the citation: **`design-brief/PLAN-OF-RECORD.md` is at the repo ROOT**, not
  under `docs/`. The authority is real; only the path written in earlier notes was wrong.

**13. Item 6 — a market with one bet states certainty. RULED: a price needs two sides.**
- 🔴 Live on production, 2026-09-23, in the default language: *"Je, Manchester City wata shinda Premier League
  2026/27? — **NDIO 0% · HAPANA @ 100%** · 1 mtabiri."* One stake tells every visitor that outcome is impossible.
- The gate today is `noPrice = live && (isNew ?? volume === 0)` (`market-card.tsx:277`) — **any** money at all
  switches the card from "—" to a crowd price, so a single wager buys a probability.
- ⭐ **The product has already ruled this, in its own words.** The comment above that line rejects a hardcoded 50%
  on an empty pool as *"an artefact of the default, not a signal"* and concludes: ***"RULES law 5 is real data or
  nothing, so the price gate is now the pool."*** A 0%/100% off one stake is the same artefact one bet later.
- ⛔ **CHECKED BEFORE RULING — IT IS DISPLAY ONLY AND CANNOT MOVE MONEY.** Settlement never reads the number:
  `payout = stake + (their_stake / winning_pool) × (losing_pool × 0.91)` (`market-service.ts:14`), and a grep of
  the settle path for `yesPct`/`impliedYesPct` returns nothing. The card's own prop doc already forbids inferring
  an outcome from it: *"a completely independent quantity… Never infer this."*
- **RULING:** extend the existing gate rather than invent a threshold — **there is no crowd price while EITHER
  side's pool is empty.** A percentage is a SPLIT, and a split needs two parts; one-sided is the exact shape that
  produces 0/100. No minimum stake, no clamping, no shrink-toward-50 (all three would state a number nobody bet).
  The card keeps showing the pool and "1 mtabiri" — nothing is hidden, one false claim stops being made.
  ⛔ And ungate it from `live` in the same change, which is **D29**: terminal states never reached the rule.
  Owned by **U32**, and clear to ship early in the safe-fix lane — it is a money surface making a false statement.
- ⭐ **AND THE TRIPWIRE THAT WAS SUPPOSED TO CATCH THIS IS CAMOUFLAGED BY IT.** `app/page.tsx:209` passes
  `yesPct={r.yesPct ?? 0}` under a comment arguing the fallback is safe because *"a 50 would look like a price and
  ship, a 0 is visibly absurd and gets caught."* ⛔ A 0 is NOT visibly absurd on this card: it renders as
  "NDIO 0%" with a full red bar and a tappable "HAPANA @ 100%" — exactly what a confident price looks like, and
  exactly the value the one-sided defect produces naturally. **The tripwire and the defect are the same number, so
  the tripwire can never fire.** Ruling 13 removes both at once.
- **Implementation map for U32, done 2026-09-23 so it is not re-derived:** SEVEN `<MarketCard>` call sites —
  `markets/page.tsx` x2, `markets/[id]/page.tsx` x3, `page.tsx`, `results/page.tsx`, `watchlist/page.tsx`,
  `landing-hero.tsx`. Five compute `yesPct={impliedYesPct(m)}` and hold the pools already; TWO read a pre-shaped
  object (`r.yesPct ?? 0`, `featured.yesPct ?? 0`) built through `landingComposition`, so the fact must be plumbed
  into that shape too.
  ⛔ **Do NOT infer one-sidedness from a rounded `yesPct === 0 || === 100`**: a genuine 99.6% market rounds to 100
  and would lose a price it really has. Pass the fact, never re-derive it. The card's own `productLine` doc states
  the law — *"a default is exactly the bug: it lets a caller that does not know its product compile"* — so the new
  prop is REQUIRED with no default, and a guard asserts every call site passes it.

**14. Item 7 — the leaderboard ranks raw ROI. RULED: rank by the law its own tiers already state.**
- Measured on production 2026-09-23: **@Libuhi crowned at +52.9% on 17 settled**, above @Fulgence at +47.5% on 38
  and @Dhiresh on 75. The settled count is present but the faintest type on the podium, and **no window is stated**
  anywhere on the page although the file's own header calls it *"top predictors of the rolling window"*.
- ⭐ **The platform already decided that a claim about skill needs a sample — and wrote the numbers down.**
  `leaderboard/page.tsx:81-84` pairs every tier with a minimum: `silver {resolved: 5}`, `gold {10}`,
  `diamond {20}`, `sovereign {50}`. The BADGE obeys that ladder; the ORDERING ignores it.
- **RULING:** apply the floor the product already published — **5 settled (the silver rung) to be RANKED**. Below
  it a player is listed, never podiumed or crowned. No new number is invented, which is the point: a threshold
  argued from scratch is a threshold the next session re-argues. **And state the window in the panel header**, in
  all three locales — a ranking whose period is unstated is not checkable.
- ⛔ Implementation constraint, from the page's own warning (`:141-149`): the floor goes **into the query**, beside
  the ORDER BY. A JS filter would leave the SELECTION on raw ROI and change only the label — the exact defect that
  seam exists to prevent. Rank pays nothing (no prize, payout or bonus reads it), so this is status, not money.

**15. Item 8 — the two-officer clause. RULED: NO CHANGE to the clause. Fix only the name.**
- ⛔ **The critique is right that a player reads a switch, and acting on it would still have been wrong.** The
  conditional is not a hedge nobody revisited: it exists because the kit's *"Two officers sign it off"* is **false
  by default** — single-admin resolution is the default in every money mode — and the dictionary says so:
  *"A landing page claiming a two-officer ceremony the product does not perform is a regulatory finding, not a
  copy preference"* (`i18n-dict.ts:624-626`).
- **It is seven player-facing sites, not one**, all consistent, and two of them are the BINDING legal rules pages
  (`legal/rules/_content-yes-no.tsx:189`, `_content-up-down.tsx:151`). Rewording the landing line alone would
  create the inconsistency the critique fears. No guard pins the content — `test:i18n`, `test:trilingual`,
  `kyc-copy-truth` and `translation-safety` were each checked and none asserts the officer count.
- ⭐ **And the specific truth is already published per market**, which the critique omits: `/fairness` derives
  `twoOfficer` from two genuinely distinct signatures (`fairness/page.tsx:135`) and the resolution panel prints
  *"Confirmed under the two-officer review rule"* or *"Resolved by an officer against the declared public source"*
  — the latter being the exact sentence `COMPLIANCE-DECISIONS.md:3683` mandates. General copy hedges; the record
  tells the truth. Under-claiming is not a finding; over-claiming is.
- **RULING:** the clause stays, verbatim, at all seven sites. The one real defect underneath it is **terminology
  drift**: English names one switch two ways — *"two-officer authorisation"* (`:631`) and *"two-admin
  authorisation"* (`:307`, `:316`, `:607`). A player meeting both reasonably reads two different controls. Unify
  on **"two-officer authorisation"** (it matches the legal pages and the admin lexicon), in all three locales in
  one commit as `test:i18n` requires. Owned by **U40** (player copy), and safe to ship earlier.

**16. Item 9 — the footer's legal furniture. RULED: ONE of the four claims survives.**
- **(a) "RTP ya mchezo na sheria" — UPHELD, and on stronger grounds than tone.** The note said to confirm a Gaming
  Board requirement before touching it. Confirmed: **"RTP" appears in no compliance document, licence record,
  LIVE-QA register or CLAUDE.md — nobody ever recorded such a requirement.** And the page it points at,
  `/legal/rules` (*"Kanuni za Michezo"*), **states no RTP**: its only occurrence of the term is the footer link
  pointing back at itself. ⭐ The product structurally cannot state one — it is pari-mutuel, so the return varies
  with every pool split and the only fixed figure is a 9% commission on the LOSING side. **RULING: the label says
  what the page is — the game rules — and stops promising a number that does not exist.** ⚠️ If a licence
  condition does require an RTP disclosure, the present state ALREADY fails it, because none is published; this
  removes a false promise, it does not remove a disclosure. Owned by **U20**.
- **(b) "Pendekeza masoko upate pesa" with a coming-soon pill — NOT A DEFECT.** The link is dropped from the footer
  ENTIRELY when proposals are DISABLED, and otherwise carries its real state flag (`public-footer.tsx:213-220`).
  It advertises nothing that is unavailable without saying so on the same line.
- **(c) "Kuwa wakala" under UADILIFU — NOT A DEFECT.** It is the agent programme's single public door, deliberately
  a plain directory line with no badge, no number and no earnings verb, and it closes with the programme
  (`public-footer.tsx:229-233`). The placement is recorded, not accidental.
- **(d) "Sera ya AML / KYC" is not translated — FALSE.** It IS translated: *"Sera ya"* is Swahili for "policy of"
  (`i18n-dict.ts:4354`). Only the two initialisms stay in Latin letters, which is ordinary Swahili regulatory
  usage and matches how the rest of the product writes them.
**⚖️ Decision 1 supersedes the 2026-08-13/14 deferral** "compact list / density toggle" (`NEXT-PLAN.md` "ruled out" line;
`design-brief/PLAN-OF-RECORD.md` §8.8). It stays honest to that deferral's reason: the switch is labelled **"Card spacing"** (never "list
view"), it changes spacing only, and **`MarketListRow` is still not built**. `DENSITY_IDS ["grid","list"]` (`discovery.ts:133`) stays unwired.

**Two kinds of change** (Ali: "not at compact level but also at general level"):
- **[Compact]**: only the market board's density: market cards, the Up & Down card (same `.mcardp` shell), grid gap, the sticky
  discovery bar. These follow the switch; Comfortable shows today's board exactly.
- **[General]**: everything else that makes phones fit better for every player in both settings. These do not follow the switch.

## §5 — Hard rules (law or dated ruling; MUST hold)

- **Tap floor** (DESIGN_AUTHORITY §A2): every control ≥ `--tap-min` 40px, 44 preferred. YES/NO stay 40; `.mcardp-info` stays `var(--h-control-md)`.
- **Type ladder closed** (§T1/§T3/§T7): no hand-typed sizes. Card title stays 15px; market title stays 28px (DG-P-03). A step is always onto an
  existing `--type-*` or `fontSize` key.
- **One home for values** (§0d): spacing, control and radius values live only in `globals.css`. Prefer stepping a token for phones (the `--rh-*` precedent).
- **B9/B10**: a new state is a prop or attribute on the existing component, with no new `.css` file and no second component. A moved spec changes its test in the same commit.
- **Filter language** (§6/6b): sort and status never cost a tap at any width. The discovery bar **does not hide on scroll**; row 2 never scrolls.
- **§A5/§A6**: SW ≈ 35–40% longer. Money and time are never clipped; zero horizontal overflow at 320/360.
- **Swahili is the default language** (Ali, 2026-09-15; shipped `8822b648`, after this plan's measurements were taken). A visitor who has never
  chosen a language sees **SW**, so SW is the **first** case for every unit, not the stress case: where a target below is written "at 360 EN",
  the SW number beside it is the one a new player actually meets, and a unit is not done until SW passes at 320 and 360. The capture order in
  every driver is **SW, then EN, then ZH**, and any before/after screenshot pair shown to Ali leads with SW.
- **E-276**: Sign in and Sign up both visible at every width including 320, at the same height.
- **Compliance messages are never hidden or made dismissible**: maintenance, session-ended, the email-verify bar (collapsible only), the 18+/RG
  footer lines, payout-status notices, the reality check's four actions.
- **Cold start**: `fresh = live && volume 0 && predictors 0`, consistent on card, board and detail.
- **Money and time are never clipped, at 320 too** (D10 broke this). A truncated price or countdown is a defect, not a design choice.
- **Hover is never the only way to see something on touch**; nothing sticks in a hover state after a tap (U27).
- **Test in the device's real motion tier.** Budget phones run `data-motion="reduced"`, so every motion change is verified in full, reduced and
  minimal/`prefers-reduced-motion` (§8b).
- **QA never counts as traffic**: every driver's user agent contains `HeadlessChrome` (§0 trap).
- **Aesthetic guardrails (§8a) bind every unit**: compaction takes space from chrome and padding, never from the signature moments.
- **Process**: one fix, a guard proven RED first, docs in the same commit, a push, a production re-measure; gates run twice; two units per
  session; stage by name; `git branch --show-current` before every commit.

## §6 — Could change / must not change

| Area | CAN change (phones) | MUST NOT change |
|---|---|---|
| Market card | inner gaps, action margins, sparkline height, grid gap, skeleton height (`.mcardp` has no fixed height; `MARKET_CARD_H` only sizes skeletons) | title size and 2-line reserve, 40px YES/NO, 44 info button, the footer's 10px gap + 13px bottom padding (the Details/share 40px `::after` reach depends on them) |
| Discovery bar | two rows → one control line + a count line (CSS) | hide-on-scroll, a scrolling row 2, sort behind a tap |
| Header | auth pills 48 → 40 (`--h-control-sm`) below 640; the top safe-area inset added via `--header-h` (U23) | bar height 56 **plus** `safe-area-inset-top`, read through `--header-h` (no literal offsets); both pills visible at the same height |
| Bottom rail | items 64 → 48 **only** under the short-screen gate (U21), with the chat offset and footer clearance derived from `--rail-h` | 64px items in portrait; five slots; labels |
| Home | `--rh-*` phone rungs, hero padding, lede one step, CTA height 56 → 48 (class `btn-xl` kept), proof in one row, topic tiles, the Closing-soonest row layout | sections, copy, the 17px question size, fabricated-number rules, PV-01 brand-mark backdrop |
| Chat bubble | 52 → 44, hide while scrolling | the `bottom: isMobile ? 80 : 16,` / `zIndex: 60` adjacent lines (`test:stacking`) |
| Overlays, toasts, notices | padding and figure rungs, close 48 → 44, questions as sheets, ≤ 2 toasts, one non-compliance bar at a time | money-commit `btn-lg`, feedback timings, z-ladder, compliance visibility, bet confirm centred |
| Desktop ≥ 640 | only the defect fixes, the countdown (ruled everywhere), and D9 | every card and board pixel (proved by a zero-diff control) |

## §7 — Standing rulings this plan inherits

- **PV-01 RULED keep**: the hero brand-mark backdrop stays.
- **PV-05 CLOSED 2026-09-04** (`docs/design-brief/player-visual-2026-09/handover/DECISIONS.md`): commit-sequence motion correct as
  shipped; both "dial reads thin / three words" concerns overturned by measurement. ⛔ The bet dial and its panel copy are not repainted here.
  D5 (hand-typed `animation-delay` 100/180/260/340ms at `chat-styles.css:904-907`, chat empty-state chips) stays filed; U7 does not touch it.
- **PV-13 fixed, "no visual change"**: heights sit on the rungs. Compact steps between rungs only.
- **DG-P-08** (`leaderboard/page.tsx:559-590`): podium handles are read whole: wrap, never truncate; `break-words`, never `break-all`.

## §8 — Defect register

| ID | Defect | Where | Unit |
|---|---|---|---|
| D1 | Status strip's half chip collides with the result count (412 EN, 360 SW) | `.kp-strip-fade` `globals.css:3063-3068` | U9 |
| D2 | Leaderboard podium handles break mid-word. ⚠️ **Re-measured on production 2026-09-23 and it is WORSE than this line recorded.** The example here was "@Dhire / sh" — two lines. Live at **320 SW the podium takes THREE lines with an orphan final letter**: `@Ful / genc / e` and `@Jay / kisha / n`; at 360 it is two, `@Fulge / nce` and `@Libuh / i` (again an orphan letter). The name column is **44px at 320 and 57.3px at 360**, at `--type-h4`-ish 15px with `overflow-wrap: break-word`, against handles wanting 70–80px. ⭐ **AND THE SAME HANDLES RENDER ON ONE LINE IN THE LIST DIRECTLY BELOW THE PODIUM** — @Libuhi, @Fulgence, @Jaykishan, @Ameet, @Dhiresh all whole at 13px. So this is not a handle-length problem, it is the podium’s three-column layout starving a column that the list gives room to; the fix belongs to the layout, and DG-P-08 forbids reaching for truncation. ⛔ **DO NOT MEASURE THIS WITH `Range.getClientRects().length`** — it over-counted by exactly one at both widths here (reporting 4 at 320 and 3 at 360) and the cropped screenshots are what settled it. Count painted lines some other way, or read the crop 🔵 **FIXED — `e14ca071`.** Below `sm` the tier badge moves UNDER the handle, which returns the name its column. ⭐ **The discriminator that named the cause:** the SAME handles render whole, on one line, in the list directly beneath the podium — so it was never handle length, it was a 22px badge and its gap taking a third of a three-column row on the narrowest phone. ⛔ `break-words` and `min-w-0` both STAY: the long note above them pays for both, and this removes the PRESSURE rather than the guard. RED-proven with the production handles **PLANTED**, because this database's handles are short and cannot reproduce it at all — with the fix `@Fulgence` is one line in an 80.5px box and `@Jaykishan` one line in 87.2px at 320 AND 360; with the old row layout injected back, the same planted names give 46px boxes over two and **three** lines, which is the production symptom. | `leaderboard/page.tsx:591-594` | U10 |
| D3 | 52px chat bubble covers card Details / "Maelezo" / a tier badge 🔵 **FIXED — `b61b8b29`, and the register line was narrower than the defect.** It covers content on NINE surfaces, and this session found a tenth: the 404's third destination. ⭐ It cannot simply be MOVED — wherever it sits, it sits on something — so it leaves while the page is in motion, which is exactly when nobody is reaching for it, and returns 250ms after the reader settles. The phone bubble also drops **52 → 44** (glyph 30 → 24): it was the only control on a phone BIGGER than the tap floor, spending those 8px on other people's content. ⛔ TWO STATES ARE EXCLUDED BY NAME: `.cm-fab--open`, because a bubble that vanished while its own panel was open would take the CLOSE control with it, and `:focus-within`, because a keyboard user must not lose it to the very scroll that brought it into view. **Verified on the running build 2026-09-23**: at rest 44×44 and hittable; 80ms into a scroll opacity 0.11 and not hittable; 900ms after stopping, back; and with the panel open a scroll leaves it at opacity 1. §5 of `qa:focus-and-fit` runs it on three surfaces with `RED_D3`. | `ChatRoot.tsx:313-319`, `chat-styles.css:57` | U7 |
| D4 | First visit: primer modal and consent card both show, uncoordinated | `first-visit-primer.tsx:296-317`, `consent-prompt.tsx:61-62` | U16 |
| D5 | `/results` ≈ 65px gap between search and filter tabs | `search-box.tsx:181-187`, `results/page.tsx:104` | U9 |
| D6 | Market detail: star orphaned on its own row in SW | `markets/[id]/page.tsx:430-467` | U10 |
| D7 | Up & Down header icon-only links have no accessible name on phones | `updown/page.tsx:97-113` | U9 |
| D8 | Discussion box says "Sign in to predict" for commenting | `comments-thread.tsx:224-229` | U20 |
| D9 | Bet confirm: `lg:p-6` overrides the safe-area bottom padding (found in code) | `bet-confirm-modal.tsx:240` | U13 |
| D10 | Up & Down strike price clipped at 320: "HIGHER OR LOWER THAN $75,9…" (money) | `updown-card.tsx` target row | U10 |
| D11 | Up & Down "Down × 1.00" label touches the button edge at 320 (next to overflow) | `updown-card.tsx` / `updown-stake-controls.tsx` | U10 |
| D12 | Two different 404 designs (generic vs market not-found) | `app/not-found.tsx:111`, `markets/[id]/not-found.tsx` | U26 |
| D13 | `/offline` centres content low: `min-h-[calc(100vh-44px)]` ignores header + rail; precached with guest chrome | `offline/page.tsx:17` | U26 |
| D14 | Pull-to-refresh fires when pulling inside an open sheet, modal or chat at the top of the page | `pull-to-refresh.tsx:31-35` | U27 |
| D15 | `#discussion` anchor lands under the sticky header (no scroll-margin) | `comments-thread.tsx:189` | U27 |
| D16 | `ScrollRestore` sets `scrollRestoration="auto"`, which can fight Next's restoration on streamed pages (verify by drive before fixing) | `scroll-restore.tsx` | U27 |
| D17 | Turning "reduce motion" off writes `"full"`, lifting a budget phone out of its automatic reduced tier | `feedback-settings.tsx:40` | U28 |
| D18 | Active sort value clipped at 320 ("Biggest pool" / "Pesa nyingi") in both densities | `query-bar.tsx` QuerySort | U9 |
| D19 | Filter sheet `max-height: min(82vh, 640px)` can hide its bottom (Done) under the URL bar or keyboard | `globals.css:3345` | U22 |
| D20 | Bottom sheet on a short screen overflows upward: `items-end` in a scroll container makes the title and close unreachable | `modal.tsx:273-274`, `:320` | U21 |
| D21 | Header and discovery-bar offset ignore `safe-area-inset-top` in installed/standalone mode | `top-app-bar.tsx:140`, `query-bar.tsx:53` | U23 |
| D22 | Detail status pills `h-[26px]` can overflow with long SW copy or large system text | `markets/[id]/page.tsx:440,446` | U24 |
| D23 | Sell button: `whitespace-normal` inside a fixed 44px height wraps and clips in SW at 360 | `sell-button.tsx:236` | U24 |
| D24 | Comments "Post" button widens while pending ("Posting…"), shifting its row | `comments-thread.tsx:216-220` | U20 |
| D25 | Tap leaves hover styles stuck (e.g. `.btn:hover` lift, `.kp-qrow:hover` padding reflow): 343 ungated `hover:` utilities + ungated CSS `:hover` | `tailwind.config.ts`, `globals.css:1065,1134-1210,3716` | U27 |
| D26 | Loading ghosts don't match phone content (`/live` 180px, `/results` 220px, generic loaders), and 6 `SearchBox` Suspense boundaries have no fallback, so the page jumps 🔵 **BOTH LOAD SHIFTS FIXED AND LIVE — `f70789df`.** `main` now reserves `100svh`, so the 18+ licence footer starts BELOW the fold and its later movement is neither visible nor counted. ⚠️ `svh`, not `vh` or `dvh`: `dvh` CHANGES as mobile browser chrome hides on scroll, which would introduce a second shift to cure the first. And it only ever ADDS height — on a page already taller than a viewport the rule is inert. `/results`' second shift is gone too: that container's `space-y-5` became `gap`, because `space-y-*` is a SELECTOR (`> :not([hidden]) ~ :not([hidden])`) and matches React's streamed `<template id="B:1">` boundary marker whether or not it renders — the comment above it claimed “`<Suspense>` renders no DOM node”, which is true of the CLIENT tree and false of the STREAM. ⭐ **VERIFIED ON THE SAME SITE, BEFORE AND AFTER, WITH THE SAME SCRIPT:** `/` **0.1594 → 0.0004**, `/markets` **0.1594 → 0.0004**, `/results` **0.1834 → 0.0007**, against a budget of 0.05 and a single-shift limit of 0.02. What is left is a 0.0004–0.0007 reflow as the header's auth cluster widens 188 → 194px on font swap. Sealed by `npm run qa:cls-budget` (§9 U25's own accept line, made checkable), whose `RED_SHELL=1` control **rewrites the served stylesheet** back to the pre-fix shell and reproduces 0.1668 / 0.1644 / 0.189 with the identical footer rect. ⛔ An injected `<style>` at document-start was tried first and did NOT take — the parser builds `<head>` after it — so that “RED” run scored the same as green and would have certified nothing. 🔴 **THE SENTENCE THAT USED TO END THIS CELL WAS PARTLY WRONG, AND IT IS CORRECTED HERE RATHER THAN DELETED.** It read: *"the skeleton SIZES — `/live` ghosts 180px against 347px cards, `/results` 220px, the markets filter-bar ghost ~250px against a real 116px bar, the generic `PageLoader`… and 6 `SearchBox` boundaries with no fallback… none of them is fixed."* Measured item by item on production 2026-09-24: ⛔ **`/live`'s 180px ghost was ALREADY CORRECT** — the real PulseCards measure **178–183px** at 320/360/390/414. 347px is the `/markets` card (`--mcard-h`), not `/live`'s, so the comparison was between two different cards and the one number in that file that needed no change was the one named as the defect. ⛔ **`/results`' 220px was already gone** — that file consumes `MARKET_CARD_H_CLOSED` (a `var()`, both densities). ✅ The markets filter bar was real and is **FIXED — D73**; `/live`'s ghost was wrong in a way nobody had written down (no hero, no search box, 538px out) and is **FIXED — D72**; `results/loading.tsx`'s hand-rolled grid is **FIXED — D74**. ✅ **The 6 `SearchBox` boundaries with no fallback exist — the count is exact** (`fairness`, `live/pulse-grid`, `notifications`, `profile/account`, `proposals`, `results`) — **but they cost nothing measurable**: throttled slow-4G, `/live` 0.0011, `/results` 0.0007. The reason is structural rather than lucky: the `SearchBox` arrives in the same component as the content it sits above, so there is no frame in which the grid is painted and the search box is not. A missing fallback only shifts a page when something BELOW it is already on screen. ✅ **THE GENERIC `PageLoader` IS MEASURED NOW, AND ON EVERY ROUTE A SIGNED-OUT PLAYER CAN REACH IT NEVER RENDERS AT ALL.** Sixteen public routes use it; `/proposals`, `/help` and `/fairness` are reachable by a visible link from `/`. Hopped to each with a `MutationObserver` armed before the click — which, unlike a polling loop, cannot have a gap — on throttled slow-4G: **not one shimmer row was ever inserted on any of the three**. ⭐ **THE SAME RUN CARRIED ITS OWN CONTROL:** `/markets`, measured by the identical code in the same session, painted **27 rows at +329ms**. So the instrument can see a skeleton when there is one, and the three zeros are the routes' behaviour rather than a blind probe — the distinction an earlier pass in this same session got wrong twice by writing a selector that matched nothing. ⚠️ The cause is prefetch: Next already holds those routes' payload when the link is clicked, so the transition is instant and `loading.tsx` never runs. A generic ghost that never paints costs a player nothing. ⛔ **WHAT IS STILL UNMEASURED, SAID PLAINLY:** the thirteen SIGNED-IN routes that use it (`/watchlist`, `/notifications`, every `/profile/*`). They are not reachable signed-out, so nothing above is evidence about them. ⭐ **AND THE REAL DEFECT ON THIS UNIT'S SURFACE WAS NONE OF THE ABOVE:** `/live`'s hero resized on a 6-second timer and walked the whole board up and down by 95px for 0.0796 of un-input CLS — **D71**. It is not a loading defect at all, which is why a unit about loading skeletons never looked for it. | `live/loading.tsx`, `results/loading.tsx`, `ui/page-loader.tsx` | U25 |
| D27 | Reaching the RG session time limit is announced only by a toast (`failure-reasons.ts:285`), which can expire unseen; a compliance message must persist | `src/lib/failure-reasons.ts`, `conviction-dial.tsx` | U16 |
| D28 | The card share control is 25–26 × 36–37px — under the tap floor on both axes — on **every** card on every board, 12px from "Details" (S02-home-07, S03-03, S07-06) | `.mcardp-share` + its `::after`, `globals.css:5106` | U3 |
| D29 | Resolved and void cards with no bets state an invented "YES 50%" and a centred needle; `noPrice` is gated on `live`, so the cold-start rule never reaches terminal states (S03-10, S07-01). 🔵 **FIXED AND LIVE `5c00588c` 2026-09-25.** ⛔ **THE REMEDY THIS CELL IMPLIED — "delete `live &&`, one token" — IS A REGRESSION, and the fix is four edits.** Deleting the gate alone trades a fabricated PRICE for a fabricated ABSENCE: two of the three "no bets yet" claims reach a SCREEN READER only (the price slot's `aria-label` and the empty rail's accessible name), so an emergency-voided market that refunded real money would have told a blind player nobody bet — while the visible caption that a sighted colleague could have caught was deleted. It also destroyed the outcome readout on resolved cards, because that arm was gated on `isResolved` and sat AFTER the absence branch. ⭐ THE TWO CLAIMS ARE DIFFERENT QUESTIONS: `noPrice` asks the POOL (is there a crowd price?), `neverBet` asks `predictorCount` (did anyone ever bet?) — which is only ever incremented and which `emergencyVoidMarket` never touches, so it is the only honest test in any phase. ⭐ AND NO NEW COPY WAS NEEDED: `emergencyVoidMarket` stamps `resolvedOutcome = "VOID"` (market-service.ts:4525) and `outcomeWord` already owns the VOID arm in all three languages, so a voided card now NAMES itself instead of claiming a crowd. ⚠️ The cell's path said `market-card.tsx` under `components/market/` — it is `components/markets/` | `components/markets/market-card.tsx:277` | U32 |
| D30 | The chat bubble covers the rail More menu's last row: its status badge is cut and ~27% of the row opens chat instead of navigating. U7's 44px bubble does not clear it (S01-01) ✅ **CLOSED ON BOTH SURFACES.** The rail was `94a43227`; the SORT LISTBOX is `07f736f9`, where the panel's `z-index: 30` was spent inside `.kp-discovery-bar.sticky.z-20` and resolved at 20 against a bubble at 60, so the bottom two rows each lost 2 of 9 taps. ⛔ Raising the bar to `z-index: 100` was tried and MEASURED and changed nothing — a sticky element inside page content cannot out-rank a root-level fixed one whose context it does not share, which is why the rail's fix worked and this one could not. The bubble yields instead, matched together with its UNCLASSED fixed wrapper, because the hit test found both. **Verified on production 2026-09-23.** The nine-point census returns zero rows losing a tap. 🔴 **REGRESSION FOUND 2026-09-26 — THIS FIX TOOK DOWN EVERY SOFT SIGN-IN AND SIGN-OUT, AND IS NOW FIXED.** The rail effect (`2c9380e0`) was written BELOW `NavMore`'s `if (items.length === 0) return null`. The top bar hands `NavMore` an EMPTY list when signed out and a full one when signed in, at a fixed position, so every soft change of session — starting a break, self-excluding, closing the account, signing in through the form, a `router.refresh()` after a session ended elsewhere — re-rendered that fiber with one hook fewer or more, and React threw above `app/error.tsx`: the ROOT error screen ("Kitu kimevunjika kabla hata ya kuanza"), met by a player at the moment they asked for a break. Reproduced locally on clean main; the effect now runs above the early return (and marks the rail only while the menu has items). Guard: `test:hooks-order` (in `predeploy`; red on the planted shape, naming `nav-more.tsx:107`). Found by the LIVE-strip drive's cooling-off case, not by any gate — the repo has no `react-hooks/rules-of-hooks`. Record: `docs/SESSION-REVOKED-DEADEND.md` §5d. | `nav-more.tsx:94`, `ChatRoot.tsx:317` | U33 |
| D31 | ◐ **HALF closed — one of four parts** (`252a9f55`, 2026-09-23). Signed-in balance capsule. ✅ **The hidden-balance mask no longer overflows its reserved box.** Ali reported it from his phone ("the eye icon overrides most of the dots"). Re-measured before fixing: the box was sized from the REAL figure while the hidden state painted a FIXED nine-character mask, so it overflowed at EVERY balance up to a million — **27.2px at TZS 0** (the register said 26.4), 13.6 at TZS 500 — and the eye’s own box begins 4px past that edge. The box is now the MAX of both states: three children in one grid cell, so toggling the eye still moves nothing. ⛔ `[grid-area:1/1]` GENERATES NOTHING in Tailwind — the slash is read as an opacity modifier — so it needs `[grid-row-start:1] [grid-column-start:1]`; the first attempt looked right and did nothing. ⚠️ **Proved at 320/360/412 on a signed-in session LOCALLY only** — this machine has no signed-in production account, so it is NOT verified on production. ✅ **ALL FOUR PARTS ARE NOW FIXED AND VERIFIED ON PRODUCTION (2026-09-25).** ⛔ This cell used to end: ~~"STILL OPEN and still U34's: the eye control is 32px (under the 44px floor), the 800ms delta flash shifts the header, and the link announces 'Hide password'"~~ — **all three were already fixed, and "the 44px floor" was wrong twice over**: the floor is `--tap-min: 40px` (Law 9), which §0 trap 1 states and this cell contradicted. Measured signed in at 320/360/412 SW: eye **40×44** (`w-[var(--tap-min)]`, `70c8bcaa`), name **"Ficha salio"** (`t.common.hideBalances`, `f438bc41`), toggling the mask moves **nothing**. ⚠️ `hidePassword` still appears twice in the file — BOTH inside the fix comment that explains the change, so a raw-text guard here would report a defect that is not there. ⚠️ The delta flash is `absolute` (`:281`) but UNOBSERVED live: it paints only on a balance CHANGE and the QA account is unfunded | `wallet-balance-pill.tsx:189,281,365` | U34 |
| D32 | The live ticker cannot be paused, stopped or hidden on a phone (pause is hover/focus only), has no accessible name, and its duplicated track makes a screen reader read every event twice (S01-02) ◐ **THREE OF ITS FOUR PARTS ARE CLOSED** (`230ac116`, `9d2da8ee`). Under reduced motion the strip FROZE at frame 0 showing 24% of one of twelve events — 245px of window against a 27,440px track, no scrollbar, no touch scroll, no links, so **11 of 12 events were unreachable by any means**. It is now a real scroller with `animation: none` — not merely paused, which would hold the first frame's transform. The strip also gained an accessible NAME, and the duplicate copy is `aria-hidden`, so a reader no longer hears twelve settlements as twenty-four. ⚠️ Both halves were bitten by the SAME trap one commit apart: an INLINE style beats any rule, so `overflow` had to leave the component before the box could scroll, and then `display: contents` had to leave it before the duplicate could be hidden — caught on production, where `dupDisplay` still read `contents`. **Verified on production 2026-09-23.** □ STILL OPEN, still U33's: the strip cannot be paused or hidden on a phone; pause is hover/focus only, which a touch user has neither of. ✅ **CLOSED 2026-09-26 — the strip is back in the lobby and the fourth part is LIVE (`2ab8830e`).** Measured on production `2ab8830e` 2026-09-26 ~15:05 EAT (`?dpl=` confirmed): the server HTML carries the strip on `/`, `/markets`, `/live`, `/results` (12 settlements each, painted as the still list) and on none of `/wallet/deposit`, `/updown`, `/help`, `/legal/terms`; a browser drive went 98/98 — en/sw/zh × 360/768/1280 one strip, 32px, control 40×31 at the right edge, no page overflow; a phone tap stops it into a still list with every event reachable (animation none, overflow-x auto, duplicate gone), the settlement in front of the reader kept in place, Play resuming from the scrolled position, the stop surviving a reload; the OS, in-app and low-end-Android gates each a still swipeable list with no control; without JavaScript a complete swipeable list and no dead control. What was built: A named `aria-pressed` pause control at the strip's end; tap-anywhere-to-stop on a phone (the strip is 32px, under `--tap-min`, so the finger target is the whole run); a STOPPED strip becomes the same still, swipeable list as the calm branch — keeping the reader's place — and Play resumes from where they scrolled; the stop is remembered on the device, and the server paints that same readable list, so a remembered stop never flashes motion and the strip is readable without JavaScript. Play zeroes the box's scroll offset before the run takes over (a second adversarial review caught the run landing the offset TWICE along). 🔴 Found while re-siting it: the calm branch only ever covered the OS query — the in-app Reduce motion switch and the LOW-END ANDROID tier (`data-motion=reduced`) still froze the strip on 24% of one event. All four gates now take it. Pinned by `test:ticker-honesty` §11 (`red:ticker-honesty` 28/28). The note that follows is history. ⚪ **THE REMAINING PART IS NOW UNREACHABLE, NOT UNDONE — 2026-09-24.** The outstanding item was a phone PAUSE control for the marquee. On Ali's instruction the scrolling settlement strip was removed from `app-shell.tsx` (`adbc31e7`, another session), so **the ticker renders nowhere**: measured on production, `.ticker-viewport`, `.ticker-track`, `.ticker-copy-dup` and any `[class*=ticker]` all return **0** on `/`, `/markets` and `/live`. ⚠️ `LiveTicker`, `getTickerFeed` and this defect's CSS (`.ticker-viewport`, `.ticker-copy-dup`, the `prefers-reduced-motion` branch) are all still in the tree and were kept deliberately, so re-siting the strip is one render away. `test:dead-css` therefore stays green and **nothing will flag them** — they are DORMANT, not wrong. ⛔ **IF THE STRIP IS EVER RE-SITED, THE PAUSE CONTROL BECOMES REQUIRED AGAIN** and this line re-opens. It is recorded as a condition rather than closed as done, because a reader who finds dormant ticker CSS and no defect against it will reasonably assume the work was finished.  | `live-ticker.tsx:85-91, :153-154` | U33 |
| D33 | ✅ `de2e9643` — Home topic tiles break the pool figure across lines. ⚠️ **The register line was wider than the defect and is corrected from measurement**: it said "every pooled tile at 360 in all three locales", but at 360 SW — the DEFAULT locale — nothing split on the day it was measured. What splits is **width-and-locale dependent**: 5 of 6 tiles at 320 SW, 5 of 6 at 360 ZH, 2 of 6 at 360 EN, 0 at 360 SW and 0 at 412. It was a bare text node sharing the meta's wrapping; it is now `.kp-topic__pool` with `white-space: nowrap`. ⛔ The break MOVES rather than vanishing — the meta may still wrap at the separator — and the nowrap is legal here only because it was MEASURED not to clip: the widest figure `formatTzsCompact` can emit is ten characters (66px) against 78px of usable meta at 320. The proof rail forbids the same declaration outright for the opposite reason | `.kp-topic__pool`, `globals.css` · `topic-tiles.tsx` | U6 |
| D34 | At 320 SW the board stats row ("25 hai · TZS 27K katika mchezo") cannot wrap or shrink and runs past the viewport edge beside a money figure (S03-01) | `markets/page.tsx` header row | U9 |
| D35 | On cold-start cards at 320 SW the pool slot — the money slot — is the one thing allowed to shrink, so it ellipsises while the countdown and 44px info plate keep their width (S03-02) 🔴 **THE REASON THIS CELL GAVE FOR EXCLUDING 320 NO LONGER EXISTS — CORRECTED 2026-09-24.** It said the fix was gated to `@media (max-width: 300px)` and therefore *"deliberately excludes 320"*. **There is no 300px gate any more.** `globals.css:4453` is unconditional — `.mcardp-meta { flex-wrap: wrap; }` — under a comment explaining why: a width gate cannot see Android's text-only scaling, and `flex-wrap: wrap` is a no-op while the row fits, so the gate bought nothing and cost the case it was written for. `5b8b7c3f` removed the wrapper; this cell still named only `c21a2f37` and never mentioned it. ⭐ **RE-MEASURED ON PRODUCTION, and the fix is doing real work:** at 320 and 360, with and without 1.3× text scaling, **0 of 15 cards clip a money figure** and **12–13 of 15 meta rows actively WRAP** — so the row is reaching its second line rather than the rule sitting inert. ⚠️ The text-scale case was driven with `documentElement.style.zoom`, and `clientWidth` stayed **320 / 360 throughout** — which is the point: that is Android's text-only scaling (viewport unchanged, text larger), not browser zoom, and it is exactly the case a width gate cannot see (D70). ⛔ **STILL GENUINELY UNMEASURED: the COLD-START card specifically.** There are **0 cold-start markets on the board** right now (none reading `Hakuna dau bado`), so the case this defect was filed against has still never been photographed. What changed is the COST of closing it: a measurement when such a market next exists, **not a code change**.  | `.mcardp-meta` | U32 |
| D36 | Up & Down truth: at the lock the pod shows a dead "Betting closes in 00:00" beside a panel saying betting has closed, and a resolved card keeps ticking a live price that contradicts its own close (S05-01, S05-02). 🔵 **BOTH HALVES FIXED AND LIVE, 2026-09-24.** ⛔ **THIS CELL USED TO NAME ~~`updown-card.tsx`, round page~~ — BOTH INNOCENT**, and a session that started there would have spent its day in the two files that were already right: the card renders whatever `livePrice` it is handed and already branches on `state` for its status word, target tiles and result pod; the round page has had the correct rule since E-72. Half 2 lived in `updown/page.tsx:286,290-292`, a file this cell never named. It was also FOUR wrong things, not one — price, percentage, direction glyph and win/lose ink, so a DOWN round wore a green rise beside its own "Down wins" pill. The rule is now `heroPrice`/`heroMovePct` in `updown-card-phase.ts`, called by BOTH surfaces | `updown/page.tsx`, `updown-card-phase.ts`, round page | U35 |
| D37 | Up & Down history mixes scopes in one strip: "40 rounds" in the bar, "Rounds 12 · 95 bets" in the tile (page vs whole history), and the net-return sub-line spills into the next tile (S05-updown-NUM-01/02). 🔵 **FIXED AND LIVE, 2026-09-24.** Worse than filed: **Net return and Win rate themselves were PAGE-scoped** while the page's own comment claimed they described the whole filtered view — the money moved when the player pressed "next". ⭐ **Ali decided the scope on 2026-09-24: the whole filtered view**, so the pager moves the list and never the figures. The arithmetic is now the pure `roundPnl` (`src/lib/updown-history-pnl.ts`), the poller watches the view too, and the spill was `.amount`'s `white-space: nowrap` at DOUBLED specificity — a `whitespace-*` utility could never have overridden it, so `.amount` moved onto the numbers and the arrow became the wrap point | `updown/history/page.tsx`, `updown-history-pnl.ts` | U35 |
| D38 | /live search: one typo unmounts the field mid-typing (keyboard closes, the query can only be cleared), and the hero above it changes height while typing, jumping the field 110–134px (S06-live-01, S06-live-02) | `live/page.tsx`, `featured-contest.tsx` | U36 |
| D39 | Market detail money copy shows the raw YES/NO enum in SW/ZH — on the hedge warning and the bet-placed modal — while the buttons beside them say NDIO/HAPANA or 是/否 (S04-detail-01, S04-detail-02). 🔵 **FIXED AND LIVE `22fb75a9`.** ⛔ **THREE CITATIONS IN THIS REGISTER WERE WRONG** and would each have cost a session: the path is `src/components/markets/…` (**markets, plural** — `market/` returns "No such file"); the code is `[...heldSides].join(" + ")`, NOT `heldSides.join(…)` — `heldSides` is a `Set` and has no `.join`, so a guard pinned to the quoted text would match nothing; and the "already-fixed sibling" comment at conviction-dial.tsx:1002 names the bet-placed NOTIFICATION, not the modal — the real in-file rule is at **:553-555**. ⭐ A sweep of every player surface confirmed these were the **last two** raw-enum leaks. ⚠️ Guard: §3d catches BOTH shapes §3/§3b miss — a stored side reaching copy through a VARIABLE (the `.side` read is two lines above the string) and a display-position template whose only literal text is " · " | `markets/[id]/page.tsx:357`, `components/markets/conviction-dial.tsx:1729` | U37 |
| D40 | On the detail page the bet widget and the guest sign-in prompt are announced last, under the wrong heading: reading order does not match visual order (S04-detail-L04). 🔵 **FIXED AND LIVE `ee55a509`.** Measured on production 2026-09-25 signed in as `mobile01` at 320/360/412 × sw/en/zh: **DOM [0,1,2], visual [1,0,2] — nine cells of nine**; now [0,1,2]/[0,1,2]. ⛔ **THE GRID HAS THREE CHILDREN, NOT TWO** — `similar markets` is `order-3` inside the same grid, so a fix written for a pair leaves a third of it unmeasured. ⛔ **AND "under the wrong heading" WAS LITERAL, AND WORSE THAN FILED:** the `<aside>` had **no accessible name and, for a signed-in player, no heading at all** — its three state headings are `<h3>` and the dial branch has none — so the outline read h1 → "Nafasi zako" → **"Kigezo cha utatuzi" → the entire bet widget** → "Masoko yanayofanana". The money control on the page was announced under the heading for the small print. Each of the five aside branches now carries one `id="bet-panel-heading"` `<h2>` (sr-only in the dial branch; the existing `<h3>`/`<p>` promoted in the other four — Tailwind preflight resets heading size and weight, so the tag change moves no pixels), and `bettingOpen` is hoisted so the branch and its heading cannot drift apart. ⚠️ The cell pointed at ~~`:756`~~; the wrapper was at `:771`. ⚠️ Desktop READING order becomes aside-then-content; desktop pixels are untouched because all three children are placed explicitly (`lg:col-start-*`), and explicit grid placement ignores source order outright | `markets/[id]/page.tsx` (grid `:510`, aside wrapper now `:527`) | U37 |
| D41 | The InfoHint explanations for fee, multiplier and payout render as a one-line strip ~4× the screen width with a ~10×14px trigger, so on a phone the money explanation cannot be read or opened (S04-detail-03). 🔵 **FIXED AND LIVE `ee55a509`.** Measured on production 2026-09-25, signed in, dial open: the commission hint was **1392.8px on ONE line in a 320px viewport — 23% of it readable** (26% at 360 sw, 25% at 360 en, 29–30% at 412). ⛔ **AND THE OTHER 77% COULD NOT BE SCROLLED TO** — `body { overflow-x: clip }`, so it was unreachable, not merely off-screen. ⛔ **AND IT RENDERED IN CAPITALS, WHICH THE CELL NEVER NAMED:** `.kp-tooltip-popover` sets font, size and letter-spacing and never `text-transform`, so 201 characters of fee copy inherited `uppercase` from the eyebrow at 11px. The trigger measured **14×10** at every width and locale — 140px² against Law 9's 40px (1600px²). Now: a real `<button>` at **40×40 / 43.6×40 / 162×40** (sw) with `elementFromPoint` landing on it at all four edges of a `--tap-min` square, and the explanation in flow at the ROW's measure — **238×79.6 and 204×186.9 at 320, 100% inside the viewport, 3–10 wrapped lines, `text-transform: none`, 13px**. ⭐ **THE TAP FLOOR COST 0px**, measured as a delta on the same page against the trigger collapsed back to the bare glyph: rows 88.5/66.5/146.5 unchanged, aside 889px both ways — the §L6 negative-margin pattern pays for all of it. ⛔ **THE PANEL IS PLACED BY THE CALL SITE, AND THAT IS NOT A STYLE CHOICE:** each eyebrow `<p>` is **172/54/204px** wide at 320, so wrapping in place gives the multiplier hint a column of single words, and the multiplier row is a `grid-cols-[1fr_auto]` where a third child breaks the layout. ⚠️ **A §5 OVERFLOW BREACH THAT IS NOT ONE, recorded so it is not re-found:** `body.scrollWidth` read **763 against a 320 viewport** with the dial open and exactly 320 with it absent — but `scrollX` stayed **0**, at both widths and both scroll positions. It is the over-report `qa:signup-funnel` §1 already warns about. ⚠️ The fee ceiling this copy quotes is **NOT the retired formula** — this branch renders only for a `capped-commission` poll, where `fee = min(commissionRate·pool, feeCeilingRate·smaller)` is the live rule (`payout.ts:91,93,493`); checked 2026-09-25, before anyone "corrects" it | `components/ui/info-hint.tsx`, `conviction-dial.tsx` (3 call sites) | U37 |
| D42 | The /results summary ring draws three arcs but its legend names two: settled markets sit in an arc named nowhere on the page (critics panel, three lenses). 🔵 **FIXED AND LIVE `1d3bbc28` 2026-09-25.** ⛔ **EVERY FIGURE AND ADDRESS IN THIS CELL WAS STALE** — struck and re-measured on production 2026-09-25: ~~171-market denominator~~ → **210**; ~~"NDIO 59 · HAPANA 88" = 147~~ → **"YES 69 · NO 110" = 179**; ~~24 markets, 14%~~ → **31 markets, 53.14° = 14.76%**; ~~`:319`~~ → the donut is `:528-542`; ~~legend `:324-331`~~ → `:348-372`. The archive grew by 39 rows and the defect grew with it; only the percentage held. ⛔ AND §9's arc triple "124/182/49" sums to **355°** and cannot be a reading of this component — a `Ring` clamps to exactly 1 (`ring.tsx:52`). Production emits **118.29 / 188.57 / 53.14**, which sums to 360. 🔴 **AND IT WAS WORSE THAN FILED, ON A FILTER NOBODY CHECKED:** `linesShown` (:258-260) keeps a product only when `winsIn(YES) + winsIn(NO) > 0`, so **`/results?out=void` dropped EVERY legend row — 31 results, a full 360° grey circle, and not one word on screen.** ⭐ Remedy: a THIRD ROW, not a third term (D64 measured that row 10px past the viewport at 277px), gated on `voidCount > 0`, wearing the arc's own ink, with the word from `t.market.statusVoid` — which already exists in all three languages, so NO new copy. ⛔ Not run through `sideWord`: a refund has no direction (§C4) | `results/page.tsx:528-542` (donut), `:348-372` (legend) | U32 |
| D43 | The leaderboard list is ranked by ROI and no row shows ROI: the podium prints +26.8% / +13.2% / −3.9%, then rows 2–6 drop the number they are sorted by and leave 105–142px empty at the right (critics panel) | `leaderboard/page.tsx:460` (list row) | U10 |
| D44 | The tier word "Fedha" (silver) is printed in the money gold, and podium rings #2 and #3 are the same pale blue — while the tier chips on the same screen already own real silver and bronze inks (critics panel, sampled) | `leaderboard/page.tsx:320` (`accent: "gold"`), podium `:546` | U10 |
| D45 | Up & Down's page gutter is 20px; every other surface, and Up & Down's own footer, sits on 16. The wrapper is `px-4` — which reads like 16 and is **20 on this project's scale** (critics panel, measured on 8 surfaces). 🔵 **FIXED AND LIVE `c6ebbedf`, verified on production `4b30a069`: 16px on /updown, /updown/history and /markets alike at 320/360/412.** ⛔ **THE SCOPE WAS FOUR WRAPPERS, NOT TWO** — this cell named ~~`updown/page.tsx:68,86`~~ (now :73,91) and missed `updown/loading.tsx` and both history files. ⭐ The guard already existed: `measure-system.test.mts` carried these four on an explicit exemption ratchet, so the fix was the LIST SHRINKING — and that also put both routes inside its page/loading tier-parity check for the first time, since a hand-typed pixel width matches no tier. ⛔ But that check matches `max-w-[NNNpx]` only, so it could never have caught the gutter alone; a second assertion now does, proven RED by reverting `px-3 lg:px-6` → `px-4` with the token width left in place | `updown/page.tsx:73,91`, `updown/loading.tsx`, `updown/history/page.tsx`, `history/loading.tsx` | U35 |
| D46 | The detail probability chart spaces date ticks by data point: a two-day interval and a one-day interval are both 153px, so the slope misstates the rate of change (critics panel, measured). 🔵 **FIXED AND LIVE `eb4acd4a`.** ⛔ **THE CITATION WAS WRONG — AGAIN.** ~~`charts/chart-toggle.tsx`~~ is a collapsible wrapper with no axis and no library import; the renderer is **`charts/market-curve.tsx`**, and the deciding line was its `s.setData(…)` at :150. But the cell's ACCUSATION was right: `lightweight-charts` 5.2.1 has an ORDINAL time scale — one slot per item, multiplied by a single uniform `barSpacing` — which the library's own typings confirm, and which `terminal-chart.tsx` already states in its own words. ⭐ **MEASURED ON LIVE DATA, WORSE THAN FILED:** market `mkt_07204d65ca88106b160c` carries 11 readings over 112.4h with gaps from **95s to 2.60 days — a 2,362:1 range, every one drawn at the same width**, and the axis prints 17/18/20/21 Sep at equal spacing while 19 Sep does not exist on it at all. ⭐ **THE REMEDY IS THE LIBRARY'S OWN AND INVENTS NOTHING:** `timeGridFill` (`chart-series.ts`) reserves the missing width with **whitespace items** — `{ time }` with no value — which is what a gap IS, and which this repo already uses in `terminal-chart.tsx` "so an outage keeps its width". ⛔ **NEVER INTERPOLATED PROBABILITIES**: a drawn value between two bets is a reading nobody took, and this component's own rule is "Real data or nothing (A-5)". ⚠️ Order is load-bearing — fill, THEN `ascUnique`, whose tie rule keeps a real price over a whitespace marker; reversed, a gap marker could erase a price. ⛔ **AND THE FIX NEARLY BECAME A WORSE DEFECT.** The library refuses to draw below `minBarSpacing`, default **0.5px**, and the plot is **190px at a 320 viewport (measured, not the 210 first estimated)** — a ceiling of 380 slots. A 2,000-slot series would have clamped and shown the player **roughly a tenth of their market's history, looking entirely normal**. `minBarSpacing` is now 0.05 and `test:time-axis` §7 asserts the PAIR, so neither number can be raised alone | `charts/market-curve.tsx:150`, `charts/chart-series.ts` (`timeGridFill`) | U37 |
| D47 | The /live hero truncates its own section label at 360 SW to "LILILO NA SHAKA…" — a relative clause whose head is exactly the part cut off, so the section never names itself (critics panel) | `mostContested` (`i18n-dict.ts:3254`) in the /live hero | U36 |
| D48 | The sign-in form sets "Umesahau nenosiri?" as its dimmest label, dimmer than the static hint beside it and with no link ink, and carries the sign-up rules: the "Angalau herufi 8." hint, `minLength={8}` and an eight-dot placeholder that reads as a filled password (critics panel, code-confirmed) | `auth/login/page.tsx:288-296,310` | U19 |
| D49 | A flat sparkline band — about 43px at ~1.06:1 against the card — renders on some cards and not others, so one list holds two card heights: /results 312 vs 278, /markets 354 vs 320 (critics panel, measured) | `market-card.tsx:390` (`MicroSpark … height={28} … area stretch`) | U3 |
| D50 | On the /live hero the INASOGEA chip sits in the needle's value-label row ("NDIO 50%  INASOGEA  50% HAPANA"), so it reads as the name of the needle's position rather than a status (critics panel) | `tipping` (`i18n-dict.ts:3280`) in the /live hero | U36 |
| D51 | ✅ `de2e9643` — the hero's three figures did not share a left edge. Re-measured before fixing: the offset is **16px, not 17** (an 8px pip plus an 8px `--sp-2` gap), and it holds at 320/360/412 in all three locales. ⛔ **The two remedies this row suggested were both measured and REJECTED** — hanging the pip outside the flow puts it at x=8 or x=0, off the page's own 16px content edge; giving all three numbers a matching leading slot indents every figure while its CAPTION stays at 16, trading a spread between rows for a spread inside every row. The pip now FOLLOWS the figure it annotates: same pip, same `--live-400`, same gap, still on the open-markets figure and no other. Spread **16 → 0px**. ⚠️ A box measurement cannot see this defect — `.kp-proof__num` reports `left: 16` either way — so the guard reads the TEXT's own client rects | `landing-hero.tsx` (`.kp-proof__pip` after the figure) | U6 |
| D52 | Up & Down's settled pod wraps its price pair with the arrow ending the first line ("$75,819.68 →" then "$75,824.01") (critics panel). 🔵 **FIXED AND LIVE `c6ebbedf`, verified on production `4b30a069`.** The arrow is bound to the price it POINTS AT, so the only break available is before it. Measured at 320/360/412: the pair stacks at 320 and 360 with **"→ $84,490.16" leading its own line**, sits on one line at 412, and no figure breaks mid-digits (0px overflow everywhere). ⚠️ The cell pointed at ~~`:1121`~~; the pair is at **:1146-1148**. ⛔ Plain `whitespace-nowrap` is right HERE and would have been wrong on D37's history sub-line, which carries `.amount` — `.amount.amount` sets nowrap at doubled specificity and beats any utility. Same symptom, opposite remedy | `updown-card.tsx:1146-1148` | U35 |
| D53 | The Swahili responsible-gambling line has two grammar slips: "Kama kucheza kamari **imekuwa sio** burudani, acha." — the ku- infinitive subject takes "kumekuwa", and the negative before a noun is "si" (critics panel, verified) | `stopGambling` (`i18n-dict.ts:4326`) | U40 |
| D54 | 🔴 **LANDSCAPE ON A NOTCHED PHONE: the whole product ignores the LEFT and RIGHT safe-area insets, and nothing in this repo can see it.** `layout.tsx:165` sets `viewportFit: "cover"` — deliberately, so the app draws under the notch and `env(safe-area-inset-*)` returns REAL values instead of 0. In portrait that is right and handled: 19 usages pad `safe-area-inset-bottom` and 6 pad `-top`. **In landscape the notch moves to the SIDE, and exactly ONE file in `src/` pads `-left`/`-right`** (`needle.css:143-144`, a full-screen overlay). Everything else does not. The sharpest case is the phone rail: `bottom-nav.tsx:114` is `fixed inset-x-0 bottom-0`, `.kp-rail` (`globals.css:5136`) pads ONLY `safe-area-inset-bottom`, and `.kp-rail__item` is `flex: 1` — so five equal slots span the full width and, at a landscape inset of ~44px, the first item loses roughly a third of its 64px tap target under the notch and the last loses the same to the opposite corner. The page gutter is `--sp-4`, far under 44px, so body content sits under it too. Same shape on `bet-confirm-modal`, `notifications-panel`, `consent-prompt`, `install-invite`, `avatar-menu`, `date-select`. ⛔ **THIS WAS FOUND BY READING, NOT BY DRIVING, AND IT COULD NOT HAVE BEEN FOUND BY DRIVING.** Playwright does not synthesise safe-area insets, so every emulated landscape cell reports them as 0 and the page looks perfect. That is why it survived a matrix that already lists Landscape. It needs a real notched device — which is what U30 exists for — or a `@media (orientation: landscape)` rule that pads the inline edges. ⚠️ Unverified on hardware: the mechanism is established from the source and from `viewport-fit: cover` being set; the PIXELS have not been seen. | `bottom-nav.tsx:114` · `globals.css:5136` `.kp-rail` · + 12 files padding bottom-only | U30 + the landscape row of §11 |
| D55 | 🔴 **THE INSTALL PROMPT ADVERTISES AN APP THAT NO LONGER EXISTS.** `public/manifest.json` offers Chrome a rich install dialog via `screenshots[]`, and the narrow one, `/screenshots/markets-narrow.png` (390×844, 200 on production), was committed **2026-07-09** — before the card redesign, before the design freeze, before U3/U4, and before `8822b648` made Swahili the default. Read it: it shows (a) the ENTIRE UI IN ENGLISH, to a market whose default language is Swahili; (b) the OLD stacked filter block — a `WHEN` row of five chips over a `TOPIC` block of eight — which is precisely the layout **U4 deleted** and replaced with the one-line discovery bar; (c) a five-item bottom rail reading *Markets / Live / Bets / Wallet / Profile*, where the shipped rail is *Masoko / Juu na Chini / Mubashara / Matokeo / Zaidi* (`bottom-nav.tsx:46-52` — different items, different count); (d) the pre-U3 card; (e) a signed-in header showing a funded **TZS 100,000** balance; and (f) the chat bubble sitting on top of a price, so **D3 is baked into the marketing image**. ⚠️ AND THE MANIFEST ITSELF DECLARES `"lang": "en"` while the product serves `<html lang="sw">` — so the installed app's declared language is wrong for the default user, and `name`/`description` are English-only. ⭐ Two things this also SETTLES rather than raises: `"orientation": "portrait-primary"` means the INSTALLED app never rotates, so **D54 is a browser-tab defect, not an installed-app one**; and every icon and shortcut asset referenced does exist and serves 200 — the defect is staleness, not a broken reference. ⛔ No driver in this repo looks at the manifest or its assets, which is why a seven-route visual sweep can be clean while the FIRST impression of the product is two design generations old. Fix: re-shoot the narrow screenshot at 390×844 in Swahili on the current build, set `"lang": "sw"`, and add a manifest check to a guard so the shot cannot rot again (assert the screenshot's commit is newer than the last change to `market-card.tsx` or the discovery bar). | `public/manifest.json` · `public/screenshots/markets-narrow.png` | U30 |
| D56 | 🟠 **The market card's card-wide link paints no focus ring at all: the card's own overflow:hidden clips 100% of it** (360x780, sw). The whole card is the link to the market — it is the largest target on the board and the one that opens a page where money is staked. A player using a keyboard, a switch, or a Bluetooth keyboard on a phone tabs onto it and the screen does not change in any way. They cannot tell whether Enter will open a market or do nothing. This is a WCAG 2.4.7 (Focus Visible) failure on the product's primary navigation control, and it is not one card — it is every card on the board. ⭐ Measured on production 2026-09-23 by an examiner and then RE-MEASURED by an adversarial verifier that reproduced it independently — full numbers and the verifier's corrections in [`UNSEEN-01`](MOBILE-VISUAL-UNSEEN-2026-09.md) | see the record  ✅ **FIXED AND LIVE — `b096dd72`.** Verified on production by `npm run qa:focus-and-fit` (4 RED controls, each required to break its OWN section).| U3 |
| D57 | 🟠 **Plain Tab parks the focused control under the fixed bottom rail — four of thirty stops on home are 100% invisible** (360x780, sw). A player tabbing down the board reaches a control, the page scrolls to "show" it, and it is drawn underneath the navigation bar. There is no focus ring anywhere on screen — I read the /markets screenshot at that moment and the viewport contains no indicator at all. The player's next Enter press fires a control they cannot see. This is not the on-screen-keyboard case the plan already notes in §3 ("the rail can sit over the focused field in layout-resizing browsers"): there is no keyboard open here, it happens on an ordinary portrait page with a hardware or Bluetooth keyboard, and a single scrol ⭐ Measured on production 2026-09-23 by an examiner and then RE-MEASURED by an adversarial verifier that reproduced it independently — full numbers and the verifier's corrections in [`UNSEEN-02`](MOBILE-VISUAL-UNSEEN-2026-09.md) | see the record  ✅ **FIXED AND LIVE — `b096dd72`.** Verified on production by `npm run qa:focus-and-fit` (4 RED controls, each required to break its OWN section).| U22 |
| D58 | 🟠 **At 130% text the /markets sort control collapses to a 12-unit sliver underneath its own direction toggle: 0 of 5 hit-test points reach it, so the sort menu cannot be opened** (360x780 @ zoom 1.3 (277 layout); reproduced at 277x600 native and 320x780 @ zoom 1.3, sw AND en — identical, so this is structural, not a Swahili-length problem). A player who has raised their phone font size loses the ability to re-sort the board. /markets is the main board; the sort menu is how you get from "Newest" to "Biggest pool". Every tap aimed at it instead flips the sort DIRECTION, which silently reorders the list the opposite way — so the control does not feel dead, it feels wrong. The active sort value is still printed in the sub-line ("masoko 49 · Pesa nyingi"), so the player can see what the sort is and cannot change it. ⭐ Measured on production 2026-09-23 by an examiner and then RE-MEASURED by an adversarial verifier that reproduced it independently — full numbers and the verifier's corrections in [`UNSEEN-05`](MOBILE-VISUAL-UNSEEN-2026-09.md) 🔵 **FIXED AND LIVE — `724096e6`.** A 76px floor on the sort track, gated at 300px so the strip keeps its own measured 160px floor at 320 and 360. ⛔ **The first attempt shipped and did nothing**: same selector, same specificity, and this file has more than one `@media (max-width: 639.98px)` block — mine went into an earlier one, so the 160px rule compiled 321 bytes later and won. The media query matched, `:has()` matched, and the computed track never changed. Reading the COMPILED sheet is what found it. **Verified on production 2026-09-23.** 277 and 246 go **0/14 → 14/14** tappable; 320 and 360 unchanged at 14/14 with strip 160. | see the record | U9 |
| D59 | 🟠 **The header and the hero fade to opacity 0 and re-rise 2.7 seconds AFTER the page was already readable — and CLS cannot see it** (360x780, sw). A player who has been reading the hero for three seconds — the headline, the 49 open markets, the TZS 482K staked — watches the header and those figures vanish to nothing and slide back in. It reads as a crash or a reload, on the one surface that is supposed to establish that this platform is solid with money. The CSS comment at globals.css:5257 explains that `.js` is added from JavaScript so that a load where the bundle never arrives still shows everything: that correctly protects the no-JS case and creates the slow-JS case, because `kp-rise`/`kp-fade` carry `both` fill and so replay from the ⭐ Measured on production 2026-09-23 by an examiner and then RE-MEASURED by an adversarial verifier that reproduced it independently — full numbers and the verifier's corrections in [`UNSEEN-07`](MOBILE-VISUAL-UNSEEN-2026-09.md) 🔵 **FIXED AND LIVE — `149d0dee`, and the fix was to DELETE a gate, not add a script.** §12 forbids a render-blocking script and `.js` is the one thing a server cannot know — but those six rules never needed it: they are finite CSS entrances that END VISIBLE, so a no-JS reader is safe by construction. Unscoped they play at first paint and finish before hydration. ⛔ The calm branch had to lose its gate in the same edit, or a reduced-motion reader would have watched the very animation they asked not to have. RED-proven at the exact transition: `[1,1,1,1]` with the fix, `[0.445, 0.069, 0, 0]` with the old gate injected back. | see the record | U28 |
| D60 | 🟠 **/fairness: the SOURCE (CHANZO) proof column — the page's entire purpose — starts 157px outside its own scroller, with no at-rest affordance that it can be reached** (360x780 (also 320x640, also 360x780 en), sw (reproduced in en)). This is the fairness page. Its promise, printed above the table, is that every market was resolved against a named official source URL — the row's `srcHref` values are real (wikipedia.org, premierleague.com, accuweather.com). On a phone a player sees MARKET / OUTCOME / OFFICERS and nothing else: the source link and the resolution timestamp, the two facts that make the claim checkable, are off-screen behind a horizontal scroll that gives no sign it exists. A player who suspects a resolution cannot audit it, which is the one thing this page is for. It is also the page the footer link "Uthibitish ⭐ Measured on production 2026-09-23 by an examiner and then RE-MEASURED by an adversarial verifier that reproduced it independently — full numbers and the verifier's corrections in [`UNSEEN-08`](MOBILE-VISUAL-UNSEEN-2026-09.md) 🔵 **FIXED AND LIVE — `b13f94b2`.** Below 640 the record is a stack of labelled fields instead of a five-column table. **Verified on production 2026-09-23.** Every source link is INSIDE the scroller at 320 and 360 — `srcOutside 0`, `hiddenPct 0`, no document overflow — where 41.7% and 48.8% of the table used to be off-screen. ⚠️ `display: block` destroys table semantics, so `role="table"`/`row`/`cell` are stated explicitly and survive it. At 1280 it is still a table. | see the record | U41 |
| D61 | 🟠 **/fairness: every market title is clamped to 2 of up to 16 lines in a 91.8px column, and in Swahili two different markets paint identical text** (320x640 (and 360x780), sw (geometry identical in en; the collision is sw-only)). The log's job is to say which market was resolved how. On a phone no row identifies its market — "Je, Gameweek …" is 14 characters of a 103-character question — and in the platform's default language two separate resolutions, one YES and one on a different competition, are indistinguishable rows. A player checking whether the market they lost on was resolved correctly cannot find it. The title IS a link to /markets/<id>, so the row is still navigable, but you have to tap blind. ⭐ Measured on production 2026-09-23 by an examiner and then RE-MEASURED by an adversarial verifier that reproduced it independently — full numbers and the verifier's corrections in [`UNSEEN-09`](MOBILE-VISUAL-UNSEEN-2026-09.md) 🔵 **FIXED AND LIVE — `b13f94b2`.** **Verified on production 2026-09-23.** The title box goes **91.8 → 226px at 320 and 266px at 360**, four lines instead of two, and the page renders **twelve unique titles** where two different markets used to paint identically. Raising the clamp alone could never have done it: the column was width-invariant because the five columns' content minimums beat `width: 100%`. | see the record | U41 |
| D62 | 🟡 **Shift+Tab parks the focused control under the sticky header — both bet buttons land 100% behind it, with a different clickable control on the same point** (360x780, sw). NDIO and HAPANA are the money buttons. A keyboard user reversing up the board puts focus on one of them while the point it occupies is painted over by the header's sign-up button. They see the sign-up button, not their own focus; Enter commits to a market side they cannot see. Same one-line root cause as the rail case above (no scroll-padding on the root), so the two want fixing together, but this one is worse because the control that is hidden is the one that takes a position. ⭐ Measured on production 2026-09-23 by an examiner and then RE-MEASURED by an adversarial verifier that reproduced it independently — full numbers and the verifier's corrections in [`UNSEEN-11`](MOBILE-VISUAL-UNSEEN-2026-09.md) | see the record | U22 |
| D63 | 🟡 **Filter-strip chips lose three of the four sides of their focus ring to the strip's own horizontal scroller** (360x780, sw). These chips are how a player narrows the board (Wazi 49 / Zinafunga leo / Mpya 35 / Inasubiri matokeo / Zote 52). A keyboard user tabbing across them sees at most a 2px vertical sliver on the right-hand cap of the current chip — the two long horizontal edges, which are what actually reads as a ring, are never painted. On the first chip even the left cap is cut, so the strongest signal left is a soft gradient that is easy to mistake for the strip's own fade. ⭐ Measured on production 2026-09-23 by an examiner and then RE-MEASURED by an adversarial verifier that reproduced it independently — full numbers and the verifier's corrections in [`UNSEEN-12`](MOBILE-VISUAL-UNSEEN-2026-09.md) | see the record  ✅ **FIXED AND LIVE — `b096dd72`.** Verified on production by `npm run qa:focus-and-fit` (4 RED controls, each required to break its OWN section).| U9 |
| D64 | 🟡 **The /results outcome count is clipped by the viewport at 130%, so "HAPANA 110" paints as "HAPANA 1" — a truncated numeral that still reads as a valid, smaller number** (360x780 @ zoom 1.3 (277 layout); reproduced at 277x600 native (+10 units), sw only — EN is clean (body 277/277, nothing past the edge)). This is worse than a cut label because the survivor is still a plausible number: a player reads the settled board as 69 YES against 11 (or 1) NO when it is 110. Nothing signals truncation — no ellipsis, no fade — and the page cannot be scrolled sideways to check. ⭐ Measured on production 2026-09-23 by an examiner and then RE-MEASURED by an adversarial verifier that reproduced it independently — full numbers and the verifier's corrections in [`UNSEEN-14`](MOBILE-VISUAL-UNSEEN-2026-09.md) 🔵 **FIXED — `28feb05b`.** ⭐ The cause was measured UP THE CHAIN rather than guessed: a flex item at `min-width: auto` refusing to shrink — the inner row 170px wide ending at x=287 inside a parent 245px wide ending at x=261. ⚠️ Two earlier attempts failed because they guessed at selectors instead of reading that chain, and both looked plausible. `min-w-0` restores shrinkability and the line may then wrap with each SIDE kept whole, so the break falls on the separator and never inside a figure — the law D33 established for the pool figure. ⚠️ Not reproducible locally (single-digit counts here); production is the RED baseline at +10px and +41px. | see the record | U9 |
| D65 | 🟡 **Market-card category chips lose 82% of their word at large text: "UTAMADUNI" becomes "UTAMA..." at 360 and a single letter "U..." at 320** (360x780 @ zoom 1.3 (277 layout) and 320x780 @ zoom 1.3 (246 layout), sw (measured); the chip vocabulary is localised so EN words are shorter). The chip is how a player tells a football market from a politics market at a glance on a dense board. A one-letter chip followed by an ellipsis carries no information at all, and it sits in the row that already spends its space on two other chips. The plan's own rule (DG-P-08) forbids reaching for truncation as a fit strategy. ⭐ Measured on production 2026-09-23 by an examiner and then RE-MEASURED by an adversarial verifier that reproduced it independently — full numbers and the verifier's corrections in [`UNSEEN-15`](MOBILE-VISUAL-UNSEEN-2026-09.md) | see the record  ✅ **FIXED AND LIVE — `c21a2f37`.** Verified on production by `npm run qa:focus-and-fit` (4 RED controls, each required to break its OWN section).| U24 |
| D66 | 🟡 **The rail More menu and the language menu have no scrim: the tap that dismisses them also fires the control under the finger** (320x640, sw). Tapping away is how a phone player closes a menu — there is no visible ✕ on either panel. Here that gesture costs them the page: they open Zaidi, decide against it, tap the board to dismiss, and land on a market detail page they never chose, losing their scroll position on a 49-card board. The product's own `<Modal>` and `.kp-fsheet` both ship a scrim that absorbs this tap; the two menus that a guest meets most often do not. ⭐ Measured on production 2026-09-23 by an examiner and then RE-MEASURED by an adversarial verifier that reproduced it independently — full numbers and the verifier's corrections in [`UNSEEN-17`](MOBILE-VISUAL-UNSEEN-2026-09.md) 🔵 **FIXED — `787ca533`.** The dismiss listener ran in the BUBBLE phase, so the tap that closed the menu also reached whatever was beneath it — reproduced with a REAL touch tap: open `Zaidi`, tap the board to dismiss, land on a market you never chose. Neither panel has a visible ✕, so tapping away IS the close gesture, and a close gesture must not also be an activation. ⛔ **`pointerdown` WAS TRIED FIRST AND WAS WRONG**: closing on pointerdown sets state, React re-renders, the effect's cleanup REMOVES the listener, and the click the browser synthesises from that same touch arrives UNGUARDED. Local (with that "fix") and production (unfixed) both reported `navigated=true` — identical. One capture-phase listener on `click`, the event that actually activates a link. ⚠️ The first version of the test picked a link pointing at the page it was already on, so it could not have failed; the target must differ from the current path. | see the record | U33 |
| D67 | 🟡 **The language listbox flips away from the left edge and then runs off the right one, where body overflow-clip slices its border** (320x640, sw). Small, and honestly so: 1.8px of border and one rounded corner. But the panel's top-right corner is squared off against the screen edge while its top-left is rounded, so on the narrowest supported phone the language menu reads as running off the screen — on a platform whose default language is Swahili and whose players use this control to leave English. ⭐ Measured on production 2026-09-23 by an examiner and then RE-MEASURED by an adversarial verifier that reproduced it independently — full numbers and the verifier's corrections in [`UNSEEN-18`](MOBILE-VISUAL-UNSEEN-2026-09.md) 🔵 **FIXED AND LIVE — `82d3e067`.** The panel measures its own geometry on open and flips from right- to left-anchored when right-anchoring would run off the LEFT edge — and then never looked again. ⭐ **A BINARY LEFT/RIGHT CHOICE CANNOT SOLVE A PANEL WIDER THAN THE ROOM ON EITHER SIDE**, and at 320 this one is: right-anchored puts it at left **-64**, left-anchored puts it at right **+1.75**. Neither fits. So after the anchor is chosen the panel is now CLAMPED back inside with a measured `translateX`, read in a second frame because the flip has to be laid out before its result can be measured. ⚠️ Measured rather than given a breakpoint, for the same reason the original flip is measured and its own comment says: the trigger's position moves with auth state, width and locale string length, so any fixed number would be re-broken by the next control added to the cluster. ✅ **VERIFIED ON PRODUCTION: right edge 321.8 → 315.8 in a 320 viewport — 1.75px PAST becomes 4.25px INSIDE**; 360 unchanged at 150px clear. Sealed by `qa:focus-and-fit` §7, whose `RED_D67` control removes the clamp and reproduces **1.75px past at 320** exactly — and correctly stays silent at 360, where there was never a defect. ⛔ **320 IS THE WIDTH THAT MATTERS AND 360 WOULD HAVE PASSED THROUGHOUT.** A sweep that covered only the common phone would have called this clean.  | see the record | U33 |
| D68 | 🟡 **404 at 320x640: the page says "choose where to go below" and not one of its three destinations is usable — the first is 30px of 101px above the bottom rail, the other two are off-screen** (320x640, sw). A 404 has one job: get the player somewhere. On the smallest common phone this one tells them to choose from a list they cannot see, and the only thing within reach at rest is the sliver of one card that the rail is sitting on — which reads as a cut-off box rather than a choice. A player who lands here from a stale link or a resolved-market link sees a dead end. ⭐ Measured on production 2026-09-23 by an examiner and then RE-MEASURED by an adversarial verifier that reproduced it independently — full numbers and the verifier's corrections in [`UNSEEN-21`](MOBILE-VISUAL-UNSEEN-2026-09.md) 🔵 **FIXED — `05a693f1`.** Two causes. The nav was `grid-cols-1 sm:grid-cols-3`, so the phone got one 101.5px card per row — 304px of cards — and the `sm:` gate WAS the defect: the phone was given the layout designed for the case with room to spare. The labels are one short word each, so three across at 320 gives each ~86px for an ~48px word. And a centred `min-h-[80svh]` block on a short screen pushes its own exit below the fold, so under 700px of viewport height the stack starts at the top instead — a HEIGHT query, because a 740×360 landscape phone has the same problem as a 320×640 portrait one. The same class went to the market and proposal not-found pages and the shared RouteError. **Verified on the running build 2026-09-23**: **3 of 3 destinations fully visible at 320×640 AND 360×780**, where 0 of 3 were before and two were entirely off-screen. | see the record | U26 |
| D69 | 🟡 **/auth/register: the date-of-birth inputs carry English accessible names "Day", "Month", "Year" on a page served lang="sw"** (320x640 and 360x780, sw). A Swahili-speaking player using TalkBack hears the whole form in Swahili and then three English words at the one field that decides whether they are allowed an account. It is the same class as D39 (the raw YES/NO enum surviving into SW copy) on a surface the programme had not opened. ⭐ Measured on production 2026-09-23 by an examiner and then RE-MEASURED by an adversarial verifier that reproduced it independently — full numbers and the verifier's corrections in [`UNSEEN-22`](MOBILE-VISUAL-UNSEEN-2026-09.md) 🔵 **FIXED AND LIVE — `ea023299`.** The `aria` field is gone from `SEGMENTS` and must not return: `date-mask.ts` is locale-free by design (pure masking arithmetic, no `t`), which is exactly why the strings could not live there. Verified in all three locales: sw `["Siku","Mwezi","Mwaka"]`, en, zh — each read off a page whose `<html lang>` was checked first. `test:i18n` parity 2454/2454/2454. | see the record | U42 |
| D70 | ⚪ **The bottom navigation rail ellipsises its labels at 130% on every route in both locales — "Mubashara" -> "Mubash...", and a third label goes at 320** (360x780 @ zoom 1.3 (277 layout); worse at 320x780 @ zoom 1.3, sw and en both). This is the permanent, five-item primary navigation — the only way a phone player moves between the board, live, results and Up & Down. The rail is also where the plan has already spent work (D30), so it is the surface a fix is cheapest on. Small in pixels, but it is the one component present on every screen, in both languages, at every width once the font is scaled up. ⭐ Measured on production 2026-09-23 by an examiner and then RE-MEASURED by an adversarial verifier that reproduced it independently — full numbers and the verifier's corrections in [`UNSEEN-23`](MOBILE-VISUAL-UNSEEN-2026-09.md) ⚪ **EXAMINED AND DECLINED, 2026-09-23 — the behaviour is a documented deliberate trade, not an oversight.** `.kp-rail__label`'s own note says it in writing: Swahili runs 1.74× English on short labels, a rail label has one line and 20% of a 360px viewport, *"so it must be allowed to ellipsise rather than wrap the bar into two rows"*. Ellipsising IS the designed degradation. ⛔ AND THE OBVIOUS FIX CANNOT REACH IT ANYWAY: a smaller type rung behind a width gate does nothing, because `documentElement.style.zoom` does not change the media-query width and **Android's text-size setting scales text while leaving the viewport at 360**. Measured: a 10px rule behind `max-width: 300px` left `Juu/Chini` and `Mubashara` at 49/63 units, unchanged. ⭐ That failed attempt is what exposed the same wrong mechanism in D65/D35's shipped gate, which is now removed — so this line earned its keep by being tried. ⚠️ Also NOT reproduced: the claimed 102% threshold. Only 1.3 showed it. | see the record | U24 |
| D71 | 🔴 **`/live`'s hero RESIZES ON A TIMER and drags the search box and the whole market grid with it — 95px, with the player touching nothing** (360×780, sw, motion ON, measured on production 2026-09-24). The featured carousel auto-advances every 6s (`AUTO_ADVANCE_MS`), and the hero was exactly as tall as whichever question happened to be showing. So it cycled **388 / 436 / 459 / 483px** and the grid top cycled **627 / 675 / 698 / 722** underneath it. Over 45 seconds of sitting still that is **un-input CLS 0.0796** against this plan's 0.05 budget, with single shifts of **0.0319** against a 0.02 limit — and it does not converge, because the loop runs for as long as the page is open. A player reading the board watches it walk up and down the screen. ⛔ **NO GATE COULD HAVE SEEN IT, AND THAT IS THE LESSON.** Every driver in this repo opens pages with `reducedMotion: "reduce"` — correct for stable screenshots — and `featured-contest.tsx`'s advance effect returns early under reduced motion. `qa:cls-budget` turned the defect OFF and then reported the site was clean. It also never tested `/live` at all. 🔵 **FIXED AND LIVE — `371690b6`.** All six questions are rendered stacked in ONE grid cell and one is shown; the track is therefore the height of the TALLEST question and does not change when the slide does. ⚠️ `visibility: hidden` is the load-bearing word: it keeps each hidden question's box in the grid (which is what sizes the track) while removing it from the a11y tree AND the tab order. `display: none` collapses the track and restores the defect exactly — which is what `RED_STACK` serves back out. ⭐ No line-clamp (it would truncate the page's centrepiece) and no reserved pixel height (a number to keep in step with the board's copy). The grid does the arithmetic. Sealed by `npm run qa:ghost-landing` §B, which runs with **motion ON** and dwells past four advances. ✅ **VERIFIED ON PRODUCTION AFTER DEPLOY: hero 483px, spread 0px; un-input CLS 0.0000 over 27s of sitting still** (was 388–483px and 0.0796). `RED_STACK` reproduces 71px and 0.0286 from the served stylesheet, so the green reading is not a dead instrument. | see the record | U25 |
| D72 | 🔴 **`/live`'s skeleton promised the board at y=160; it arrives at y=698 — out by 538px, more than half a screen** (360×780, sw, measured on production 2026-09-24 during a real client-side hop). The ghost drew a slim `MUBASHARA / Inapakia…` header over eight card boxes. That header does not exist on the page: the real `/live` opens with an aqua `PageHero` carrying the most-contested market (eyebrow, 44px carousel arrows, question, tipping bar, CTA, dot rail — 459px at 360) and then a full-width search box (71px), and only then the grid. ⛔ **AND CLS SCORED IT 0.0000.** `layout-shift` counts only a node present BEFORE and AFTER a frame; a skeleton is REMOVED and different nodes appear. A ghost can therefore be wrong by any amount and never register — a CLS budget certifies **nothing at all** about skeleton fidelity. Measure the LANDING POSITION instead. ⚠️ **`loading.tsx` PAINTS ONLY ON A CLIENT-SIDE HOP.** A hard `goto` streams the real page and no skeleton renders at all, so an instrument that opens URLs is blind to every skeleton in the repo. That is precisely why this survived: it is on the path a player takes (tap the bottom rail) and off the path the harness took. 🔵 **FIXED AND LIVE — `371690b6`.** The ghost now mirrors the page structure and consumes its classes and tokens rather than copies: `search-box-wrap`, `--h-input`, `--h-control-md`, `.market-grid`. The fixed rows are structure, not literals — the CTA row carries the same `flex-wrap` and child widths, so it breaks onto a second line at the same width the real one does (100px at ≤360, 44px from 414) without this file knowing where that width is. The tipping bar is 57px at 320/360/414/1280 alike. ⚠️ One number is a judgement and it is the question's line count (6 on a phone, 3 from `lg`), written as the arithmetic so it can be re-derived rather than re-guessed. ✅ **VERIFIED ON PRODUCTION AFTER DEPLOY: ghost y=691, real y=690 — out by 1px** (was 538). ⭐ **AND THE APPROACH WAS TESTED BY ACCIDENT, WHICH IS THE BEST KIND.** Hours after these shipped, another session removed the scrolling settlement strip from `app-shell.tsx`, which moved every absolute y on every route by ~32px (`/markets`' board 318 → 286). Not one ghost had to change: they reserve the page's OWN classes and tokens rather than measured positions, so all three deltas held (1px, 4px, and `/results` improved 66 → 24). ⛔ A ghost built from copied numbers would have been wrong on every route that morning and nothing would have said so — which is the argument for `qa:ghost-landing` running on a schedule rather than after a skeleton is touched.  | see the record | U25 |
| D73 | 🔴 **`/markets`' skeleton promised the board at y=557; it arrives at y=318 — the grid jumps 239px UPWARD as the content lands** (360×780, sw, measured on production 2026-09-24 during a real client-side hop; CLS 0.0000, for the reason in D72). `markets/loading.tsx` RE-TYPED the discovery bar's wrapper classes instead of importing them, and the copies had drifted: row 1 said `flex-wrap` where the real lens strip says `overflow-x-auto`, so six status pills (456px of them) stacked into THREE lines at 360, and row 2's six controls into three more. ⛔ Four of those six row-2 controls are ones a phone **never renders** — odds, pool and topic live behind the single `FilterSheet` button below `lg`, and their desktop rows carry `QUERY_GROUP_CLASS`, which is `hidden … lg:flex`. The ghost drew a desktop bar to a phone. ⚠️ This file's own header already documented this defect class TWICE (220 vs 349 cards; a 13-pill rail that no longer existed) and instructed that it "mirrors `page.tsx` wrapper-for-wrapper". It had drifted anyway, because each copy was individually valid TSX and nothing compared them. 🔵 **FIXED AND LIVE — `371690b6`.** Every wrapper is now imported: `QUERY_BAR_CLASS`, `QUERY_BAR_ROW1_CLASS`, `QUERY_BAR_ROW2_CLASS`, `QUERY_GROUP_CLASS`, and the strip's class is published for the first time as **`QUERY_STRIP_CLASS`** so the ghost consumes the same string the real `QueryStrip` does. A ghost that WRAPS where the real strip SCROLLS cannot be the right height at any width narrower than its own content — which, on a phone, is every width. ✅ **VERIFIED ON PRODUCTION AFTER DEPLOY: ghost y=290, real y=286 — out by 4px** (was 239, then 95 before the bar opted into the phone grid). | see the record | U25 |
| D74 | 🔴 **`results/loading.tsx` hand-rolled its card grid where the page and `ResultsSkeleton` both use `.market-grid`** (measured 2026-09-24). It carried `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3`, which disagrees with the shared class twice: `gap: 14px` vs `gap-3`'s 16 (10px over six rows), and `auto-fill minmax(min(300px,100%),1fr)` vs counting columns at fixed breakpoints, so the two laid out a different number of columns on a tablet. It was the only one of the three definitions that did not speak the page's own class name. ⭐ **AND IT MADE THE ROUTE UNMEASURABLE**, which is the part worth remembering. `qa:ghost-landing` finds the board by `.market-grid > *` — the class the page itself uses — so `/results` reported *"no skeleton frame was ever captured"*: a vacuous pass dressed as a number. A ghost that does not speak the page's class names cannot be compared with the page, and the comparison fails SILENTLY. The guard treats that as a FAILURE rather than a skip, for exactly this reason. 🔵 **FIXED AND LIVE — `371690b6`.** ✅ **VERIFIED: the route produces a number at all now, and `qa:ghost-landing` §A reads it every run.** | see the record | U25 |
| D75 | 🟠 **The chat bubble covers live content at rest on more than the landing page — including a market card's probability figure and part of a bet button** (measured on production 2026-09-24 by THIS session at 360×780 and 414×896, signed-out Swahili). ⚠️ **HANDED OVER AS A LANDING-PAGE DEFECT AND IT IS NOT ONE.** Session asheib-b1 reported `.cm-fab` covering 32% of the landing hero's first price block. That reproduced — 62% of the `% NDIO` unit at 360, and **95% of it at 414** — but re-measuring the SAME probe across four routes found the landing page is not the worst surface: ⛔ `/markets` at 360: **100% of `.mcardp-pctcap`** (a card's `NDIO` cap label) and **37% of `.mcardp-pct`** (its `88%`) are covered. At 414: **16% of a `HAPANA @ 12%` button** — a betting control. `/live` at 414: 7% of a `Bila dau bado` line. `/results`: clear at both. ⭐ **SO IT IS THE SAME FAMILY AS D30, NOT AS D2.** D30 was the sort menu losing 2 of 9 taps per row to this bubble — *"tapping to sort opens a support chat instead"* — and was fixed by hiding the bubble for that ONE control. The general case was left standing, and a bet button is a more expensive place to find it. ⚠️ The reported figure was 29%; this session measured 32% / 46% on the same block. Both are right: the hero rotates its markets, so the percentage is whichever market is up. **The defect is structural, not tied to one row** — which also means it cannot be fixed by moving one row. ⛔ **D3 DOES NOT COVER IT AND CANNOT.** `html[data-scrolling] .cm-fab` hides the bubble while the page is MOVING; every measurement above is **at rest, above the fold**, which no scroll state reaches. 🔵 **FIXED AND LIVE — `7b7b15ef`, on the owner's decision (Ali, 2026-09-24), taken rather than assumed:** Every remedy is a visible product change with a real cost on the other side: a right gutter on the price column moves every price off the right edge on every phone; auto-hiding the bubble at rest makes the support entry point harder to find; moving it collides with something else, because a viewport-fixed 44px square over a scrolling board can sit on ANY row. Which of those is acceptable is not a measurement question, and the surface it would change most (`/markets` cards) is the product's main board. The bubble now also leaves AT REST: `data-fab-idle` lands on `<html>` after 3s without a scroll, tap or key, and the rule beside D3's drops the bubble out of hit-testing as well as out of sight. ⭐ **`pointer-events: none` IS THE FIX; THE FADE IS DECORATION.** An invisible 44px square that still takes taps is strictly worse than a visible one — it is D30 wearing a disguise. So the guard asserts the point under the bubble's centre belongs to the PAGE, not that opacity reached 0. On production after deploy it reads **`A.mcardp-open`** on `/markets` and **`A.kp-qrow`** on `/` — the card and the hero row are reachable where the bubble used to be. ⛔ **AND THE WAKE IS DEFERRED PAST THE CLICK.** Rousing on `pointerdown` would hand the bubble back mid-gesture, so the click the browser then synthesises could land on it instead of the control the finger went for — D66 exactly, and it would re-create the very tap theft D30 fixed. Waking runs on `pointerup`/`keydown` +250ms; scroll may wake at once because `data-scrolling` keeps it hidden for another 250ms anyway, so no frame shows a moving page with an interactive bubble. Verified: **+100ms after a key the bubble still takes no tap; by +700ms it is back.** ⚠️ Same two escapes as D3: `.cm-fab--open` is never faded (an open panel would lose its close control) and `:focus-within` keeps a keyboard user from losing what they tabbed onto. A touch-only reader gets it back by touching the screen at all. Both attributes are cleared on unmount, or a route change mid-nap leaves the flag set and the bubble never returns on any page. ✅ Sealed by `npm run qa:focus-and-fit` §6, whose `RED_D75` control restores opacity and pointer-events and fails all three assertions on both surfaces. Run against production BEFORE the fix, §6 refused to certify at all — *"`data-fab-idle` was never set after 6.6s of stillness"* — while §1–§5 stayed green. ⚠️ §5 had to change with it: "at rest" now has a clock on it, and its bare read landed 2.4s after load — 600ms from the nap — so that section would have begun passing or failing on timing rather than on behaviour. It scrolls one pixel first to restart the clock. | see the record | U7 |
| D76 | 🔴 **`/results`' notable-results carousel resizes the page under the finger — 45px of travel every time a player taps a dot to see the next result** (360×780, sw, measured on production 2026-09-24). Its three slides render **458 / 436 / 413px** and the results grid below sits at **919 / 897 / 874**. ⚠️ **CLS SCORES THIS EXACTLY ZERO AND ALWAYS WILL**, because the move lands within 500ms of the tap and `hadRecentInput` excludes it. That exclusion is right for a control whose PURPOSE is to move the page — an accordion, a filter that changes the list. It is wrong here: the player asked to see the next notable result, not to have the board slide out from under the card they were reading. ⛔ A metric reading 0.0000 is not evidence that nothing moved; it is evidence that the metric was not asked. ⭐ **FOUND BY LOOKING FOR THE TWIN OF D71.** `featured-contest.tsx` calls this component "its declared twin" in its own comments, so after fixing `/live`'s hero the same question was put to this file. It has no auto-advance timer — so no un-input CLS — but it hid inactive slides with the `hidden` ATTRIBUTE, which is `display: none`, so its box was the height of whichever slide was showing: the same defect, reached from the other direction. 🔵 **FIXED — the two carousels now share ONE mechanism, `.kp-slide-stack`.** `visibility: hidden` replaces `hidden`, and the swap is exact for every reason this file's own comment gives for choosing `hidden` over unmounting: the slides stay in the DOM, so `[data-row-id]` stays countable and a crawler still sees all three; they stay out of the a11y tree and out of the tab order, so a screen reader still meets one card and Tab cannot reach the share button on a card nobody can see. What changes is only that a hidden slide still contributes its BOX. ⚠️ **THAT LAST POINT WAS CHECKED AGAINST THE GUARD IT COULD HAVE BROKEN**, because the file's comment says `responsive-audit` "skips zero-width boxes" — and a laid-out slide is no longer zero-width. It skips `visibility: hidden` explicitly in all three of its real checks (overflow, clipped-ancestor, tap-target); the one place that tests size alone is a diagnostic that only names the widest offender after a failure. No false overflow is introduced. ✅ **VERIFIED ON PRODUCTION AFTER DEPLOY: 3 dots, board spread 0px, exactly one slide visible at every step** (was 45px). `RED_STACK` reproduces 45px on `/results` and 71px on `/live`. | see the record | U25 |
| D77 | 🔴 **`/results`' skeleton drew a third of the page and promised the board 647px too high** — ghost y=272, real y=919 (360×780, sw, measured on production 2026-09-24 during a real client-side hop; CLS 0.0000, for the reason in D72). Between the header and the grid the real page renders three bands the ghost did not have at all: the header row with the NDIO/HAPANA donut (**38px**), the STICKY search band (**91px** — `py-2.5` around a 71px search box), the discovery bar (**116px**), and the notable-results carousel (**497 / 458 / 436px** at 320 / 360 / 414). The ghost had a header stub, one 44px search row, and cards. ⚠️ **THE 91 WAS ALREADY KNOWN AND ALREADY WRITTEN DOWN, ON THE SAME ROUTE.** `ResultsSkeleton` in `results/page.tsx` carries a note reading *"FILED, NOT FIXED (DG-P-13 / DG-A-20): this bar is 44px and the band it stands in for renders 91px on production"* — about its own copy of that band. The finding was recorded, the fix deferred, and the OTHER skeleton on the same route never learned about it. ⛔ Two ghosts for one page is how a filed finding goes stale: the note lived in the file that had been looked at, not in the one a player actually meets on a soft navigation. ⭐ **AND THE ROUTE WAS INVISIBLE UNTIL D74 WAS FIXED THAT MORNING.** Its grid used a hand-rolled class, so `qa:ghost-landing` could not find the board and reported *"no skeleton frame was ever captured"*. This 647px is not a regression — it is the first time the route could produce a number at all, which is the argument for treating an unmeasurable route as a FAILURE rather than a skip. 🔵 **FIXED.** Every band is now built from the page's own wrappers and tokens — `search-box-wrap`, `--h-input`, `QUERY_BAR_*`, `QUERY_STRIP_CLASS`, `QUERY_GROUP_CLASS`, `.market-grid` — and the container nesting mirrors `results/page.tsx` (a bare `PageContainer`, then TWO nested `flex flex-col gap-5` wrappers) rather than flattening it, because a ghost that flattens the nesting pays a different number of gaps. ⚠️ ONE number is measured rather than derived — the carousel's 458px, because its content is a market question and no arrangement of empty boxes can compute it. It is safe to keep only because `qa:ghost-landing` fails the route if the board lands more than 120px from the promise. ✅ **VERIFIED ON PRODUCTION AFTER DEPLOY: ghost y=911, real y=887 — out by 24px** (was 647). | see the record | U25 |
| D78 | 🔴 **The "Ficha salio" eye — the control that hides a player's money — has a tap reach of 35×55px against this repo's 40px floor** (`--tap-min`, Law 9; measured on production **signed in** at 320 and 360 in Swahili, 2026-09-24). ⛔ **THE GUARD THAT EXISTS FOR THIS EXACT CONTROL COULD NOT SEE IT.** `test:tap-target` §6 was created (PV-13a, 2026-09-03) because this same eye shipped `h-[42px]` inside a 44px capsule. The HEIGHT was moved to `h-full` and guarded — and the same call site kept `w-[32px] sm:w-[36px]`, a hand-typed literal 8px under the floor, because §6's regex matches `height:`, `h-[Npx]` and `min-h-[Npx]` and nothing else. **A control is not a rung in one dimension.** ⚠️ **AND THE 32 LOOKED DELIBERATE.** §6's own comment says the bare default `h-7` *"is already exactly --tap-min on this repo's overridden scale"* — which makes `w-7` 40px too. So the call site was overriding a compliant default with a narrower literal, and nothing in the repo could challenge it. ⭐ **THE REAL FINDING IS THE POPULATION, NOT THE 8px.** No other gate could have caught it either: §3 reads a VOCABULARY of JSX tags and `CashEye` is a kit component, not a tag; `qa:tap-truth` and `qa:tap-hit` measure rendered boxes but run **SIGNED OUT**, and this control only exists for a signed-in player. Every gate was green on a surface none of them opens. **The entire signed-in header is outside every tap gate's population** — that is the standing hole this row exposes, and it is wider than this one control. 🔵 **FIXED AND LIVE — `3d644e4e`.** `w-[var(--tap-min)]`: a rung, not another literal. The `sm:w-[36px]` step goes with it, since 40 already clears the floor at every width. ⭐ **PRE-FLIGHTED AGAINST PRODUCTION BEFORE IT WAS WRITTEN**, because this header already collapses a flexible spacer to **5px at 320** — buying a 40px target with a horizontal overflow would have traded §A2 for §A6. Injecting `width: 40px` onto the live page and re-measuring: **320 reach 35 → 43, header widest right edge 320 (vw 320), `body.scrollWidth` 320**; same at 360. No overflow at either width. ⛔ **A HIT-AREA `::after` WAS CONSIDERED AND REFUSED.** `.toggle-switch::after` is this repo's pattern for reaching a floor without moving paint, and its own note says why it must stay vertical-only: a horizontal bleed steals a neighbour's click. This eye is the right cap of the wallet capsule — bleeding left takes the balance link's own taps, and bleeding right needs 8px into a 4px gap, landing on "Arifa". ✅ §6 now watches BOTH axes and was RED-proven by restoring `w-[32px]`: 6.2 fails naming the literal, then returns green. It does not flag the other named control — checked, not hoped: `.mcardp-info` declares `width: var(--h-control-md)`.  | see the record | U27 |
| D79 | 🔴 **The sort control on `/markets` at 320 is 27×44 drawn and 33×51 by REACH, against the 40px floor** (`--tap-min`, Law 9; measured on production 2026-09-24, signed out and signed in alike). `menu-shell.tsx`'s `<summary>` carries `min-h-[44px]` and nothing guarded the width. ⛔ **THE CAUSE IS THE COMPACTION THAT MAKES THE PHONE BAR FIT AT ALL:** `globals.css` hides `[data-bar-cell="sort"] .kp-menu-value` under 640, so the control collapses to its key and chevron and the `px-3` padding is all that is left. ⭐ **SAME SHAPE AS D78, ONE CONTROL ALONG:** a `min-h` on a control whose WIDTH can collapse guards the axis that was never going to fail. Two of these in one day is a pattern, not a coincidence — a height literal is the reflex, and a collapsing label takes the other axis. 🔴 **AND IT TOOK THREE PLACEMENTS, THE FIRST TWO OF WHICH SHIPPED AND DID NOTHING.** Both failures are kept here because each looked correct in the diff and neither produced any signal at all. **(1) `min-w-[var(--tap-min)]` in `menu-shell.tsx`'s base class string (`5b3c6cf1`).** `cn()` is tailwind-merge; the call site passes `min-w-0` for the same element; on a conflict the CALLER wins. The class was absent from the rendered element entirely. ⚠️ A utility in a base string is a DEFAULT, not a guarantee — anything a caller can name, a caller can delete, and a tap floor is not a default. **(2) A plain rule in `globals.css` on `[data-bar-cell="sort"] > details > summary` (`448a90ef`).** The selector MATCHES — checked on production with `Element.matches`, which returned **true** — and `min-width` still computed **`0px`**. `.min-w-0` lives in `@layer utilities`, and **a CASCADE LAYER outranks specificity outright**: 0,1,2 against 0,1,0 is irrelevant when the other rule is in a later layer. ⭐ The identical rule injected at runtime as an *unlayered* `<style>` applied instantly, which is what made this so hard to read. ⛔ **AND THE PRE-FLIGHT PROVED THE WRONG THING.** It injected the declaration with `!important` and measured box 27 → 40, reach 33 → 46, no overflow. That is a real result about GEOMETRY — the bar has the room — and it is silent on whether an un-`!important` rule would win the cascade. **A pre-flight must exercise the mechanism it stands in for**, or it certifies only the half that was never in doubt. ⛔ **THE VERIFICATION NEARLY MISSED IT TOO.** The reach probe counted a point as reaching the control when `elementFromPoint` returned an ANCESTOR — but a click there targets the ancestor. That read "reach 47×51, PASS" for a control whose own box is 27px. ⭐ The tell was the BOX: a `min-width: 40` that leaves a 27px box has not been applied. Predicate corrected to `el === e || e.contains(el)`; `footer-reachable.mjs` already had it right. 🔵 **FIXED AND LIVE — `be4fb670`**, set where the conflict is: same element, same layer, replacing the class it was fighting (`query-bar.tsx`, `min-w-0` → `min-w-[var(--tap-min)]`). `w-full` still lets the control grow; it simply cannot collapse under a finger. The dead rule was removed from `globals.css` and its lesson left in place of it, so a later session does not re-add it. | see the record | U27 |
| D80 | 🔴 **The KYC pill on `/profile` is 113×23 drawn and 163×38 by REACH at both 320 and 360** — under the 40px floor, signed in (measured on production 2026-09-24). It is a status `Pill` that is also a `Link`, and the `Link` contributed no box of its own, so the reach was whatever the pill and its row's padding happened to give. 🔵 **FIXED AND LIVE — `5b3c6cf1`**: `inline-flex items-center min-h-[var(--tap-min)]` gives the link a box without changing the pill's paint. Pre-flighted: reach **163×38 → 163×55**, `body.scrollWidth` unchanged at both widths. ⭐ **IT IS IN THE POPULATION D78 NAMED** — signed-in only, so no tap gate in the repo has ever opened the surface it lives on. | see the record | U27 |
| D81 | 🔴 **The language code in the menu fails WCAG AA at 4.12:1 — and only on the row for the language the player is already using** (11px bold, needs 4.5:1; measured on production 2026-09-24 at 360 in Swahili). ⚠️ **HANDED OVER BY SESSION asheib-b1 AS "the language pill in the topbar, 52 of 52 cells", AND RE-MEASURED RATHER THAN TAKEN.** The topbar pill is 12px/700 at **12.17:1** and passes. The failing element is a different one: the language CODE inside the menu (`language-menu.tsx`), and its class is `text-text-faint`, not `text-text`. ⭐ **AND ONLY ONE ROW FAILS, WHICH THE HANDOVER DID NOT SAY AND WHICH MAKES IT WORSE:** with the menu open, **EN 4.86:1, ZH 4.86:1, SW 4.12:1 — all three with the IDENTICAL foreground.** The 0.38 comes from the SELECTED row's tinted background, so the one option below AA is always whichever language the player already uses. Every player meets it, on their own language, every time they open the menu. ⛔ **THE MEASUREMENT METHOD IS LOAD-BEARING:** these colours are `oklch`, so scraping digits out of the computed string gives nonsense — it needs a canvas round-trip, and the instrument self-tests at 21:1 white-on-black before it reports anything. ⭐ And the background must be composited through the WHOLE ancestor chain, not taken from the first non-transparent ancestor: on a tinted-over-dark row those differ, which is exactly where this defect lives. 🔵 **FIXED AND LIVE — `6a20bd78`** with `--text-subtle`: SW **5.63:1**, and the code stays secondary to the language name beside it. `--text-muted` was measured too (9.9:1) and rejected — it clears AA by promoting a secondary label over the thing it annotates. | see the record | U33 |
| D82 | ⚪ **At a 180px viewport (360 at 200% browser zoom) `.mcardp-info`'s focus ring falls outside its card — handed over with a one-declaration remedy that was TESTED and DOES NOT FIX IT.** Reported by session asheib-b1 as *"D56's fix covered `.mcardp-open` but not `.mcardp-info` — same one-declaration remedy (`outline-offset: -2px`)"*, four instances, read with transitions suppressed. The measurement reproduced. The remedy does not. ⛔ **PRE-FLIGHTED WITHOUT `!important`, SO IT EXERCISED THE REAL MECHANISM:** as shipped `offset 2px → ring outside: right`; with `.mcardp-info:focus-visible{outline-offset:-2px}` `offset -2px → ring outside: right`. The offset CHANGES — the rule wins the cascade — and the ring is still out. ⭐ **BECAUSE THE RING IS A SYMPTOM.** At 180 the button is already **23px past its own card**: `card 148 (16..164)`, `button 44 (143..187)`, because its parent `span.mcardp-timeleft` is a fixed **155px** inside a 148px card and does not shrink. No outline offset can pull a ring back inside a clip the ELEMENT is outside of. ⚠️ Two corrections to the report: it escapes on the **right side only**, not all four; and it is **clean at 320 and 360**, where the button sits 16px inside the card. Four instances, one cause, one width. ⚪ **DECLINED, AND THIS IS A JUDGEMENT RATHER THAN AN OVERSIGHT.** WCAG 1.4.10 Reflow sets the bar at **320 CSS px** and 320 is clean; 180 is below the normative width and below this programme's smallest supported phone (§5). `.mcardp-timeleft` is load-bearing on the board at every supported width, so unpicking it to serve a width neither the standard nor the product asks for is real risk for no measured player. If the 180px case is wanted it is a card-layout change and should be asked for, not smuggled in under a focus-ring line. ⭐ **THE LESSON IS THE REMEDY, NOT THE DEFECT:** a one-declaration fix that looks obviously right is exactly the kind that ships and does nothing — see D79, which shipped twice without working. **Assert the thing the remedy is supposed to move**, not the thing downstream of it. | see the record | U24 |
| D85 | 🔴 **THE COMMENT `REPORT` AND `DELETE` BUTTONS WERE ~15.8px TALL, AND NOT ONE GATE IN THE REPOSITORY COULD SEE THEM.** Measured on the detail page: an 11px glyph beside 10.5px mono, in a box whose only height came from the unitless 1.5 body line-height — **24px under Law 9's `--tap-min` 40**. Width ~53px in Swahili ("Ripoti"), ~36px in Chinese. ⭐ **THE BLINDNESS IS THE FINDING, NOT THE TWO BUTTONS.** `tap-target.test.mts:344` skips any interactive tag that declares no height — *"declares nothing — the rendered half's job"* — which is an honest deferral to a rendered gate whose population never included the comment thread; `qa:tap-truth`'s surfaces do not cover it; and `qa:detail-order-hints` §4 scopes its population to `[data-hint-trigger], .kp-tooltip` inside the side-picker with `HINTS_EXPECTED = 3`, so it reports a confident zero for every other control on the page. A control can sit 24px under the floor, on the page a unit has just finished, and be invisible to every check. 🔵 **FIXED** with `min-h-[var(--tap-min)]` plus the §L6 negative-margin absorber, so the row does not grow — and the hole is closed by a **new §5** whose population is THE PAGE rather than a list of known controls | `components/markets/comments-thread.tsx` | U37 |
| D86 | 🔴 **THE HEADER `SOURCE` LINK WAS ~55×18, IN THE SAME ROW AS TWO 40×40 CONTROLS.** Measured ~55×18 in Swahili, ~40×18 in Chinese; it declared no height, so its box came from its 12px type while WatchStar and ShareButton beside it are both 40 square. ⛔ **IT IS NOT THE CRITERION'S INLINE SOURCE URL** — that one is D88, and the two are told apart by a rule, not by taste: Law 9 is written about CONTROLS, and §5 exempts a link only when the paragraph it sits in says more than the link does. This one stands alone in a control row. 🔵 **FIXED** with the same floor-plus-absorber, so the header row does not move | `markets/[id]/page.tsx` (header control row) | U37 |
| D87 | 🟠 **THE PAGE'S SIGNATURE VISUALISATION WAS ABSENT FROM ITS OWN HEADING OUTLINE.** D40 repaired that outline — h1 title, h2 bet panel, h2 positions, h2 criterion, h2 similar, h2 discussion — and the probability chart was in none of it: an unnamed `<section>` whose only label was a `<span>` inside its toggle button. A player navigating by heading or by landmark could not reach the chart. ⛔ **AND D40'S OWN GUARD COULD NOT HAVE CAUGHT IT**: §2 checks heading LEVELS and level SKIPS, and neither can see a heading that is missing entirely. 🔵 **FIXED** — the `<span>` became an `<h2>` with an id and the section carries `aria-labelledby`. **No new copy**: it reuses `market.probOverTime`, the exact string the button already shows, both because `src/lib/i18n*` belonged to another session that day and because a section should be named by the words already on it. Nothing moved — Tailwind preflight resets h1–h6 size, weight and margin to inherit, the same reason D40's four promoted headings were pixel-identical | `components/charts/chart-toggle.tsx` | U37 |
| D88 | 🟠 **THE RESOLUTION CRITERION'S SOURCE URL IS A STANDALONE LINK AT 221×33**, seven pixels under the floor, with no pseudo-element behind it: measured 221.2×33 / 259.7×33 / 311.7×33 at 320/360/412 in all three locales. ⛔ It is not excused as an inline prose link, and the test is mechanical rather than aesthetic: its paragraph contains an icon and this link and nothing else, so the link IS the control. 🔵 **FIXED** with the floor plus a 4px absorber. ⚠️ **AN OPEN QUESTION FOR ALI, NOT DECIDED BY THIS FIX:** Law 9 / DESIGN_AUTHORITY §A2 states the 40px floor with exactly two written exemptions (a disabled control, the admin 32px dense rung) and says nothing about a link inside a sentence. Either §A2 gains a written inline-link exemption, or every paragraph link in the product becomes a defect. §5 currently exempts them by a stated rule so the gate does not cry wolf on its first run | `markets/[id]/page.tsx` (criterion block) | U37 |
| D89 | 🔴 **THE CARD'S `DETAILS` CONTROL IS 38px WIDE IN CHINESE, AND D28 CLOSED IT AFTER MEASURING ONE LANGUAGE.** The 40px reach comes from an absolutely-positioned `::after` with `left:0; right:0`, so its height was engineered exactly (9 above + 17 + 14 below = 40) and its **width was left to the translation**. Measured 2026-09-25 on the similar-markets cards: hit area **63.9×40.3 in Swahili ("Maelezo"), 56.4×40.3 in English ("Details"), 38×40.3 in Chinese ("详情")** — two pixels under the floor, in all three widths. ⭐ **THE LESSON IS THE DIRECTION OF THE LENS.** This plan's §A5 watches Swahili running 35–40% LONGER, which is the safe direction for a width-driven target; it is **SHORT** text that breaks one, and Chinese is the short case on this platform. 🔵 **FIXED** with `min-width: var(--tap-min)` on the pseudo-element — which grows toward the card's own right padding, away from the share trigger on its left, the neighbour whose clicks this same overlay once swallowed. ⭐ **RE-MEASURED ON `/markets` ITSELF, 2026-09-25, and the fix is load-bearing rather than incidental:** 30 controls per page × 3 widths × 3 locales, **0 under the floor**, and the narrowest hit width in **zh is exactly 40** — the `min-width` doing the work — against 41 in sw and en, where the text pays for itself. That zh reading sitting ON the floor and nowhere above it is the delta: remove the declaration and it is 38 again | `globals.css` (`.mcardp-details::after`) | U3 |
| D90 | 🟡 **THE DETAIL PAGE'S THIRD KPI TILE IS ~7px SHORTER THAN THE PAIR ABOVE IT**, so three tiles read as two sizes of one object (critics panel). The mechanism is computable rather than mysterious: the first two are the kit `<Stat size="xl">` whose value paints at 18px/leading-tight, and the third is a local `KPI` whose mono branch paints its value at 13px. ⛔ **FILED, NOT FIXED, AND REASSIGNED TO U39 ON PURPOSE.** The fork's own note at the call site already records the only two honest remedies — add a 13px/weight-400 rung to `ui/stat.tsx`, or an owner decision to accept 13.5px/bold on a resolution timestamp — and both are type-ladder work, which is U39's subject. ⚠️ A third option (`auto-rows-fr` to equalise the boxes) was mapped and then NOT taken: it makes the phone strip ~7px taller on a live surface, and an adversarial check found its guard would have been blind at ≥640 (the driver loops phone widths only) so a missing `sm:` reset would paint a dead ~91.5px row with all nine cells green | `markets/[id]/page.tsx` (KPI strip) · `components/ui/stat.tsx` | U39 |
| D84 | 🟠 **`/leaderboard` HAS D41'S DEFECT, THROUGH THE SAME ATOM, AND D41'S FIX DELIBERATELY DID NOT TOUCH IT.** Measured on production 2026-09-25 at 320 sw, signed in: **14 `.kp-tooltip` triggers at 22×22-23.3px** (under `--tap-min` 40) whose popovers are **264-380px wide on one line, overflowing the right edge by up to 72px**, unreachable past it because `body { overflow-x: clip }`. These are the badge-tier explanations ("Almasi · ≥20 imetatuliwa · ≥30% ROI"). ⛔ **IT IS NOT A REGRESSION AND NOT COLLATERAL** — `InfoHint` stopped using `Tooltip`; `Tooltip` and its `.kp-tooltip-popover` CSS are unchanged, and `leaderboard/page.tsx:637` is their only remaining consumer. Fixing it here would have meant redesigning a surface this unit never measured, so it is filed instead. ⭐ **THE CHEAPEST FIX IS ALREADY WRITTEN**: `InfoHint` + `InfoHintPanel` (`components/ui/info-hint.tsx`) are a drop-in disclosure with a 40px trigger and an in-flow panel; the only work is choosing where the panel belongs in a leaderboard row. ⚠️ Retiring `.kp-tooltip-popover` afterwards would remove the last nowrap tooltip in the product | `leaderboard/page.tsx:637`, `components/ui/tooltip.tsx`, `globals.css:2102-2155` | U19 |
| D83 | 🔴 **The “verify your email” notice bar's own button is 289×36 at 360 — under the 40px floor — and it is the control standing between a player and a deposit** (`--tap-min`, Law 9; measured signed-in on production 2026-09-24, reach including `::after`, transitions suppressed). It renders above `<main>` on every page for every unverified account. Its sibling (`Tuma kiungo tena`) already carries `min-h-[44px]`; this one carried no height at all. ⭐ **IT PASSES AT 320 AND FAILS AT 360, THE OPPOSITE OF THE USUAL DIRECTION** — the copy wraps to two lines on the narrower phone (**249×54**) and fits on one on the wider (**289×36**). ⛔ A width sweep that only tests the narrowest case would miss it: **a text-length defect is worst where the text just fits**, not where it is most cramped. ⚠️ **FOUND IN THE POPULATION D78 NAMED, BY THE OTHER SESSION, AND RE-MEASURED HERE BEFORE BEING ACTED ON** — their 289×36 reproduced exactly, and the 320 behaviour is the half their report did not have. 🔵 **FIXED — `min-h-[var(--h-control-md)]` with `inline-flex items-center`**, a rung rather than another literal (D78's lesson), matching the sibling it shares a row with. | see the record | U27 |

## §8a — Phone design sheet (graphic + artist lenses; binds every unit)

**Aesthetic guardrails:** what "compact" must never cost.
1. **The signature moments keep their scale on phones:**
   - the hero headline *The wisdom of YES & NO.* (`--type-h1`);
   - the YES/NO buttons and the tipping bar;
   - the 28px market title;
   - the win seal (≥ 96px) and its amount;
   - the brand needle mark.
   Compaction takes space from **chrome, padding and repeated labels**, never from these.
2. **A compact card is the same object with less air**, not a flatter one: same material (`glass-panel`/`mat-modal`), radius, border and
   depth. Nothing gets "simplified" into a plain box.
3. **At most three type sizes inside a card** (15 title · 28 % · 11–13 labels), and no new sizes anywhere. Mono labels may step 12 → 11 (`--type-micro`) where they repeat
   what an icon already says, never lower.
4. **Gilt stays reserved for money and brand** (`test:gold-is-money`). Compaction never adds gold; royal and the YES/NO inks keep their meaning.
5. **One composition per job.** Two designs for one state (the two 404s, D12) are a defect.
6. **Owner visual sign-off per phase**:
   - a before/after contact sheet (360 EN, 360 SW, 412 EN; Comfortable vs Compact; plus landscape for Phase F) is
     published for Ali at the end of Phase B (S3), Phase C (S5), Phases D + E (S11) and Phase F (S16);
   - a phase closes only on his OK.

**Phone rungs:** the only steps a phone unit may use. These are existing tokens, described here and defined in `globals.css` (§0d).

| Use | Phone rung | Token / owner |
|---|---|---|
| Page side gutter | 16 | `PageContainer` `px-3` (unchanged) |
| Panel, sheet, modal padding | 16 | `--sp-4` |
| Card padding | 10 / 15 / 13 (Compact) · 14 / 15 / 13 | the card rule (U3) |
| Stack gap inside a card | 6 (Compact) · 10 | the card rule |
| Gap between cards | 10 (Compact) · 14 | `.market-grid` |
| Between blocks in a section | 24 | `--rh-close` phone rung (U5) |
| Between sections | 48 | `--rh-section` phone rung (U5) |
| Control heights | 40 secondary · 44 default/icon · 48 money-commit and primary CTA · **no 56 on phones** | `--h-control-sm/md/lg` |
| Icon plates | 40 row · 32 inline · 24 glyph | existing `IconPlate` sizes |
| Radii | card 16 · control 12 · chip pill | semantic radii, unchanged |
| Page title / section title / card title | 28 / 20–24 / 15 | `text-title-lg` / `--type-h3`–`--type-h2` / card rule |

## §8b — Motion spec (animation + video-motion lenses)

**Rules for every new or changed motion:**
- Only `transform` and `opacity` animate; nothing animates layout.
- Every motion names a `--t-*` duration and an `--m-*` curve.
- The `reduced` tier means opacity only: no translate, no blur. `minimal` and `prefers-reduced-motion` mean no motion.
- `test:motion-ladder` covers the new selectors.
- Each motion gets a frame review (t = 0 / 50% / 100%) at 360 on CPU 4×.

| Motion | Trigger | Animates | Duration · curve | `reduced` tier | `minimal` / OS reduce |
|---|---|---|---|---|---|
| Chat bubble hides (U7) | scroll burst starts | opacity 1→0, translateY 0→8px | `--t-quick` · `--m-leave` | opacity only | instant |
| Chat bubble returns (U7) | 250ms scroll idle | back to rest | `--t-base` · `--m-settle` | opacity only | instant |
| Rail, bubble and cards hide for the keyboard (U22) | text field focus | translateY(100%), opacity | `--t-quick` · `--m-leave` | opacity only | instant |
| Question bottom sheet (U12) | open / close | existing `.m-sheet-in` / `.m-out` (unchanged) | existing | existing | existing |
| Toast queue (U15) | a slot frees | the existing toast entrance | existing | existing | existing |
| Away summary after the email bar collapses (U16) | collapse | the existing NoticeBar entrance, or none | `--t-base` · `--m-settle` | opacity only | instant |
| Density switch (U2/U3) | toggle | **nothing animates**: instant reflow, scroll anchored to the first visible card (`overflow-anchor`) | — | — | — |
| Countdown 4 → 2 tiles at the 24h boundary (U8) | time | **no animation**: the tile set swaps; digits tick as today | — | — | — |
| Compact discovery bar (U4) | none (static layout) | — | — | — | — |
| Win celebration, smaller (U14) | unchanged | unchanged timings; **the count-up also snaps in the `reduced` tier** (today it animates there) | existing | snap | snap |
| Route entrance (U28) | navigation | `m-settle-in` with `backwards` fill, so no retained transform (today `both` breaks `position: fixed`) | existing | opacity only | none |

---

## §9 — Units

Each unit is one commit. **[Compact] control:** with `kp-density=comfortable`, and at every width ≥ 640, the drivers show a **zero diff**
against the U1 baseline. **[General] control:** ≥ 640 shows a zero diff unless the unit names a desktop change, and both densities show the same change.

### Phase A — Instrument and switch

**U1 · Baseline instrument + signed-in QA player**
- New `scripts/live/mobile-visual-drive.mjs` reusing `scripts/live/harness.mjs` (`loginOnce`, `recorder`, `measureClipping`) and
  `scripts/live/clip.mjs`. It measures card heights, pinned chrome, document heights, first-card y, bubble overlap and controls < 40px at
  **320/360/412/768/1280 × EN/SW/ZH × comfortable/compact**, writing JSON + shots to `.qa-shots/mobile-visual/U1/before/`.
  Method: `kp-locale` cookie on the context, `load` + 2.5s, primer marked seen, consent declined, `<html lang>` read back.
- Mint one labelled production QA player (`QA Mobile 01`) under the standing grant; the commit says what was minted.
- RED control: an injected `.mcardp{padding:40px}` trips the height assertions.
- Accept: every "Before" number in §1 and §11 re-derived from JSON.
- ⚠️ **The pinned-chrome figure had a blind spot, found by the critics panel's completeness critic (§3b).** Every capture before 2026-09-16
  counted only fixed or sticky elements wider than 60% of the screen, so the 237px on /markets **excludes the floating chat bubble** — the
  one pinned object that sits on top of content, on seven of nine surfaces (D3). This instrument reports floating overlays separately, with
  their rectangles and what they cover at rest; `scripts/live/mobile-visual-capture.mjs` already does. A chrome budget that cannot see the
  object players say covers their cards is the same class of error as a tap check that measures the button and not its hit area.

**U2 · [Compact] Density setting + switch (no visual change yet)**
- `src/app/layout.tsx:145` already awaits `cookies()` for `kp-locale`. It also reads `kp-density`, and only `comfortable` stamps
  `data-density="comfortable"` on `<html>` (same component, already `suppressHydrationWarning`). No cookie means Compact, and there's no flash.
- Client setter mirrors `writeCookie` in `src/lib/i18n.tsx:~51-54` (`path=/; max-age=31536000; samesite=lax`), then sets the attribute.
- Switch lives once, in the rail's More menu (`bottom-nav.tsx:157` → `<NavMore variant="rail">`, a `role="menu"` of 44px rows). A bare
  `role="switch"` inside a menu is invalid ARIA, so it is a **44px `role="menuitemcheckbox"` row** with `aria-checked`, the `ui/toggle.tsx`
  visual `aria-hidden` inside. Added via an optional prop (B9), hidden ≥ 640.
- i18n keys in all three locale objects of `src/lib/i18n-dict.ts`: `cardSpacing`, `densityCompact`, `densityComfortable`, `cardSpacingHint`
  ("Phones only. Changes how tightly market cards are laid out. Nothing is hidden."). `test:i18n` (predeploy) fails on missing keys and on SW/ZH
  identical to EN. SW/ZH checked by a native reader.
- New `test:density-contract`: every Compact rule sits inside `@media (max-width:639.98px)` and `html:not([data-density="comfortable"])`.
  RED control: one ungated rule.
- Accept: the choice survives reload with no flash, in EN/SW/ZH, signed out and in.
- **As built (S1, 2026-09-22)** — where the build departs from the lines above, and why:
  - **Compact DELETES the cookie** (it never stores `compact`), so "no cookie means Compact" is literally true — which is what
    Privacy §7 v2026-09-22 (a new cookie is a legal act; Ali approved the clause) and COMPLIANCE-DECISIONS say.
  - **A refresh race, found by review and RED-proven.** The board pages `router.refresh()` on a timer, and React rewrites `<html>`
    attributes on refresh. A refresh whose answer landed after the player switched back wrote the OLD choice onto the page
    (measured: attribute `comfortable`, cookie gone). `theme-provider.tsx` now re-syncs the attribute from the cookie in a layout
    effect keyed on the server value; the row reads the attribute through `useSyncExternalStore`. `qa:card-spacing` step F holds
    the refresh's ANSWER for 3s and fails with the re-sync switched off.
  - The row is the menu's **first** item (the chat bubble sits over the last one — D30), its toggle is `Toggle decorative` (an
    `aria-hidden` span: no button inside a button), the panel caps at `70dvh` and scrolls (a 360×400 phone still reaches it;
    `--rail-h` replaces the number in U21), and the hint is one line — the planned sentence ran to six lines in Swahili.
  - Swahili: "Nafasi ya kadi · Ndogo / Kubwa" (small / large spacing), not "finyu", which reads as cramped — still owed to the
    native reader (§0 item 3), with the ZH "卡片间距 · 紧凑 / 宽松".
  - `test:density-contract` (in `predeploy`) guards more than the plan asked: every phone-only rule is either a fenced Compact
    rule or says `density: general — <why>` (the six existing phone blocks now do), OR/`not` media lists are rejected, and the
    four board files may carry no `max-sm:` Tailwind variant — so a forgotten gate cannot hide as an ordinary phone rule.

### Phase B — Phone density and fit

**U3 · [Compact] Market card + Up & Down card + skeleton token**
- 🔴 **D56 — the card-wide link paints NO focus ring, on every card.** Found 2026-09-23 in the keyboard-focus pass, which this programme had never run; full numbers in [the record](MOBILE-VISUAL-UNSEEN-2026-09.md).
  `.mcardp-open` is `position: absolute; inset: 0` inside `.mcardp`, which clips — so a ring drawn on the link has nowhere to paint and 100% of it is cut.
  **Fix:** draw the indicator on the CARD, `.mcardp:has(> .mcardp-open:focus-visible)`, which is the one selector that puts it on a box with room for it.
  ⛔ This is the board's primary control and a WCAG 2.4.7 failure: a keyboard or switch user tabs onto a card and the screen does not change at all.
  RED: remove the rule — the link still focuses and the ring disappears, which is exactly the state that shipped.
- Gated CSS: card top padding 14→10, row gap 10→6 (footer keeps its 10px via margin-top), actions margin 11/9→6/4, sparkline 28→20,
  traders min-h 24→22, grid gap 14→10.
- Keep: title, %, chips, 40px YES/NO, 44 info button, 17px footer, 13px bottom padding.
- ⛔ **Source order is load-bearing.** `test:card-share` reads `.mcardp-share` / `.mcardp-details` by first match in the file; `test:tap-target` §6.1 matches a column-0
  `.mcardp-info {`; `test:betting-ink` reads the first `.mcardp-meta .live`. So the Compact block goes **after the last card rule (≈ `globals.css:5115`)**,
  indented. It never re-declares `.mcardp-info`'s box and never repeats the `tap-rung.anchors.mjs` declaration text.
- Existing duplicates: `.mcardp-spark` (`:3923`/`:3938`), `.mcardp-traders` (`:3924`/`:3928`).
- 🔴 **D89 · `.mcardp-details` IS 38px WIDE IN CHINESE, AND D28 CLOSED IT AFTER MEASURING ONE LANGUAGE.**
  Its 40px reach comes from an absolutely-positioned `::after` with `left:0; right:0`, so the HEIGHT was
  engineered to the pixel (9 + 17 + 14) and the WIDTH was left to the translation. Measured 2026-09-25 on
  the detail page's similar-markets rail: **63.9×40.3 sw ("Maelezo") · 56.4×40.3 en ("Details") ·
  38×40.3 zh ("详情")** — two pixels under the floor, at every width, since the day it was closed.
  ⭐ The lens was pointing the wrong way: §A5 watches Swahili running 35–40% LONGER, and it is SHORT text
  that breaks a width-driven target. Fixed with `min-width: var(--tap-min)` on the pseudo-element, which
  grows toward the card's own right padding — away from the share trigger on its left, the neighbour whose
  clicks this same overlay swallowed once before. ⭐ Re-measured on `/markets` on 2026-09-25: 30 controls × 3 widths × 3
  locales, **0 under the floor**, narrowest hit width in **zh exactly 40** against 41 in sw/en — so the
  declaration is what holds it, not the text. ⚠️ `/live`, `/watchlist` and the landing render the same
  card and were not swept; the CSS is global, so this is belt-and-braces rather than doubt.
- **D28 — the share control is under the tap floor on both axes (25–26 × 36–37px) on every card in every state.** Its `::after` hit box
  (`globals.css:5106`) grows to ≥ 40 × 40 centred on the glyph, and the gap to "Details" stays ≥ 8px so neither control steals the other's edge.
  Growing a `::after` box does not move the glyph, so the compact geometry above is unaffected — and the declaration text `tap-rung.anchors.mjs`
  reads is not repeated (see ⛔ above). Guard: `elementFromPoint` at the share centre and at each of its four inset corners returns the share
  control, not "Details", on a live, closed, resolved and void card; `qa:tap-hit` covers the control at 320/360. RED: restore the 26px box.
- Sparkline: `MicroSpark height={28}` with `stretch` (`market-card.tsx:390`), so a CSS height overrides it; check by eye that the line still reads.
- Skeletons read a new `--mcard-h` token instead of literals at `markets/loading.tsx:95`, `markets/page.tsx:518`, `results/page.tsx:624`,
  `results/loading.tsx:25`, `updown/loading.tsx:33`, `app/loading.tsx:8`. `card-geometry.ts` exports both values.
- `UpDownCard` (`updown-card.tsx:724`): the same gated gaps plus one `--sp` step on its inner blocks; UP/DOWN stay `btn-lg`. Target ≤ 430px.
- Rebaseline by design: `qa:card-geometry`, `qa:card360`. Must stay green: `qa:tap-hit`, `test:card-share`, `test:tap-target`.
- Accept: live priced card ≤ **305px** (354 − 52 ≈ 302), and every card state ≥ 45px shorter than its baseline at 360/412 in EN/SW/ZH; skeleton = card ±2.
- **D49 — one list, two card heights, because of a chart nobody can see** (critics panel, measured). The sparkline band renders on some
  cards and not others: /results cards are 312 or 278px tall, /markets cards 354 or 320 — the 34px difference is the band. Where it renders
  it is about 43px of flat fill at ~1.06:1 against the card, so at 1× on a phone it reads as empty space. Decide whether it earns its place
  **before** trimming it 28 → 20 above: no band when the series has fewer than two real points (settled and thin cards), and where it stays, a
  fill that clears 3:1. Guard: every card of one state has one height at 360 SW. RED: restore the unconditional band.
- (taste, critics panel) The card watermark sits at about 1% contrast and does no work; the art director would delete it. For the phase
  sign-off, not a session.

- **S2 prep notes (mapped read-only 2026-09-23; re-check the lines before editing):**
  - Lines moved: the last card rule is `.mcardp-share::after` at `globals.css:5130-5137` (not ≈5115); `.mcardp-spark` 3947/3962,
    `.mcardp-traders` 3948/3952; the Up & Down `<article>` is `updown-card.tsx:741-742`; D52's pair is at 1138-1140.
  - Pinned text a Compact block must not duplicate: `tap-rung.anchors.mjs` (`box-sizing: border-box; width: var(--h-control-md); …` —
    exactly once, comments included), `card-share.anchors.mjs` (a column-0 `.mcardp-share::after {` + 2-space body), `test:tap-target`
    §6 (the first column-0 `.mcardp-info {`), `test:betting-ink` (the first `.mcardp-meta .live`). Indent the Compact block.
  - Token route for the skeletons (no second hand-typed number): card rhythm tokens on `:root` (`--mcard-pt/gap/act-mt/act-mb/
    traders-h`) consumed by the base rules (a zero diff), Compact overrides ON `html` itself (a var() resolves where declared), and
    `--mcard-h` / `--mcard-h-closed` as `calc()` of them; skeletons read `h-[var(--mcard-h)]`. `updown/loading.tsx` and
    `app/loading.tsx` are NOT market cards — keep them off `--mcard-h`.
  - The footer has no class (`market-card.tsx:477`, `gap-2` = 12px, pinned by `card-share.test.mts:57`): restore its 10px with
    `html:not([data-density="comfortable"]) .mcardp-meta { margin-bottom: 4px }` rather than a TSX hook.
  - ⚠️ "every state ≥ 45px shorter" is arithmetic the listed deltas cannot meet for three shapes (live no-band −40, fresh −44,
    closed no-band −36); "≤ 305 live priced" holds (302). Restate the per-state target in §2 before shipping.
  - D28: 40 × 40 CENTRED does not fit — Details is 12px away and the card clips at its 13px padding. Grow the reach lopsided
    (e.g. left −15, right −12) and prove it with elementFromPoint at the share centre + four inset corners in ZH too; editing the
    base `::after` changes `card-share.test.mts` §4's `-9px/-14px` literals in the same commit (B10).
  - D49 is BY DESIGN (§4 item 11): keep the band where data exists, trim 20px in Compact; no reserved space, no removal.
  - The Up & Down card cannot reach ≤ 430 in every state by spacing alone (SW open guest ≈ 464 at best; signed-in open needs
    −230). Add `data-phase={podPhase}` to its article (zero diff) so the target and the driver key on the state, and restate the
    target per phase in §2. Its inner blocks need class hooks (lines 814, 864, 891, 934, 976, 1206 are unpinned); the action
    block's inline `paddingTop: 12` must move to a class; red anchors pin lines 768, 850, 902, 1022 byte for byte.
  - Known-broken instruments (not U3's to fix, but do not trust them): `qa:card360` (signs in as the deleted `fleet:01`, and its
    ` est.` regex predates E-196); `qa:card-share-glow` (signs in as the deleted `alpha`). `qa:tap-hit` has no share probe.

**U4 · [Compact] Discovery bar (still sticky, still one tap)**
- `src/components/ui/query-bar.tsx:53-165` + CSS via a `data-bar-row` hook: rows become `display:contents` in a grid, giving one control line
  `[strip][sort][dir][filters]` and a ~16px count line ("25 markets · Biggest pool", still the single `data-result-count`). Only the strip scrolls.
- Already compact, unchanged: `QuerySort` shows its value only below `lg`; direction is an icon-only 44×44 link.
- Compact change: the Filters `<summary>` (already `aria-label`led) hides `.kp-fsheet-trigger-label` and the caret; icon and count badge stay.
- ⛔ Don't edit the QuerySort summary class line (`red:bar-geometry` mutates it). `test:filter-language` §5.9–5.22 stay green (TSX structure unchanged).
- Guard: extend `scripts/live/bar-geometry-drive.mjs` (today stickiness only at ≥ 1280) with bar ≤ 80 at 360/412, sort and status visible with 0 taps,
  strip ≥ 160px. RED control: `display:none` on sort.
- Accept: pinned chrome ≤ **201px** at 360 in EN/SW/ZH.
- 📐 (critics panel, taste — art direction and layout) The pinned bar cuts the board's loudest objects mid-control as they scroll under it —
  a card's YES/NO buttons sliced in half — with no fade and no elevation edge to say "this passes beneath". Whatever height this unit lands on,
  the bar's lower edge carries a short fade or a hairline shadow so content visibly goes under it rather than being guillotined.

- **S2 prep notes (mapped read-only 2026-09-23; re-check the lines before editing):**
  - CSS alone cannot do it at 360: strip ≥ 160 + sort + direction + Filters leaves ≤ 25px for the sort's value, so the active sort's
    name must move to the count line — an optional prop on `QueryResultCount` (still ONE `data-result-count`). Opt `/markets` in
    with `data-bar-row` on the two row divs of `discovery-bar.tsx` (the same primitives drive 12 other bars — do not re-lay them),
    and give the MenuShell value span a `kp-menu-value` class. Grid: `minmax(0,1fr) auto auto`, rows `display: contents`, all
    rules sharing one `:has(> [data-bar-row])` gate; move the sort listbox to the bar's right edge (it would clip at x ≈ 424).
    Projected bar ≈ 77px → pinned chrome ≈ 198 ≤ 201.
  - The bar lives in `discovery-bar.tsx:212-405`, not `query-bar.tsx:53-165`. Byte-pinned lines: `query-bar.tsx:54` (sticky class),
    `:307` (sort summary), `:331` (direction link), `:416` (desktop group). Never write `min-height: 44px;` right before `}`.
  - Two live guards would go red FALSELY on the one-line layout — fix them in the same commit: `qa:bar-geometry` OVERLAP (clip each
    scrolled box to its scroller first) and `qa:tap-truth` DISJOINT (its `seen` includes scrolled-out chips).
  - Probably already red on main, before U4: `red:filter-language` case "range-reverted" anchors on `  min-height: 44px;\n}`,
    which no longer exists (`f883a104`). Confirm by running it; repair its anchor.
  - The hairline: copy the header's recipe (`1px var(--border)` + `--shadow-2` under `[data-scrolled]`, no transition), gated.

**U5 · [General] Header pills + phone rhythm tokens**
- CSS only, inside the existing `@media (max-width:639.98px)` E-276 block (`globals.css:3388`): `.kp-auth-cta { height: var(--h-control-sm) }`
  with `.btn-sm` padding and font, both pills together. TSX strings stay: `wallet-reach.test.mts:155` requires `btn-pill kp-auth-cta` exactly twice.
- `--rh-section` 64→48 and `--rh-close` 32→24 on the `:root` base (the ≤767 rung, `:272-273`); the `min-width:768px` block (`:851-857`) stays immediately
  after `:root`. Inline consumers `app/page.tsx:225` and `trust-band.tsx:103` follow the token. Re-run `qa:dg-rhythm` and `scripts/live/landing-seam.mjs`.
- Guard: a source assertion that the phone block declares `height: var(--h-control-sm)` on `.kp-auth-cta`. RED control: 36px.
- Accept: at 320 both pills visible and `scrollWidth === 320`.
- 📐 (critics panel, taste) At 360 the two Up & Down header pills are bare glyphs — a scroll and a briefcase. D7 (`a25c127b`) gave both a
  name for screen readers; a sighted player still sees two unlabelled icons on a money game's header. Decide here whether the phone rung
  keeps a short word, or whether the glyphs are clear enough on their own — and show Ali at the phase sign-off.

**U6 · [General] Home tightening (all sections kept)**
- ✅ **DONE in `de2e9643`; what follows is the ORDER AS WRITTEN, kept for the record, and two of its sentences turned out to be false.** The ≤560 reflow it prescribes ALREADY EXISTED and had already bought the −195, so the row gained a 3-line BOUND rather than a saving; and `white-space: nowrap` for D33 is forbidden near money by the proof rail's own note, so it was taken only after the widest printable figure was measured to fit. `.kp-qrow__q` now HAS the clamp this order asked for.
- **Closing soonest** (`landing-hero.tsx:186-188` → `QuestionRow`; `globals.css:3695-3746`): `.kp-qrow__q` is `--type-h4` (17px) with no clamp,
  in a 3-column grid `"i q p" / ". s p"` with a 20px gap, so at 360 the price column squeezes the title to ≈ 200px (4–5 lines). The cause is layout,
  so the size stays. Below 561px the grid becomes `"i q" / ". s"`, the price moves onto the sub line (same element), and the title gets a 3-line clamp
  with the full question in the accessible name. Row ≤ 110px.
- Hero (`:3519`) padding sp-12/sp-8 → sp-8/sp-6; lede (`:3546`, `--type-h3`) → `--type-h4`; CTA height (`:3809-3811` ≤560.98 block) →
  `var(--h-control-lg)` with class `btn-xl` kept (update `scripts/live-material-probe.mjs:112` and `live-button-contrast.mjs`, which expect 56);
  `.kp-proof` phone block (`:3686-3690`) three across with numbers one rung down, only if SW captions and money don't clip; `.kp-topic` (`:4584`)
  min-h 64 → 48 with the meta inline.
- **D33 — the topic tile breaks the pool figure across lines** ("TZS" on one line, "6K" on the next) on every pooled tile at 360 in all three
  locales. The money node in `.kp-topic__m` (`globals.css:4622`) takes `white-space: nowrap` — U38's rule, applied early here because the tile is
  already being touched — and the tile drops its label before it breaks a figure. This is checked **after** the min-h 64 → 48 change above, since
  the shorter tile is the tighter case. Guard: 0 wrapped money nodes on the home topic tiles at 320/360 × EN/SW/ZH. RED: restore the wrap.
- `test:hero-contract` / `test:landing-contract` test data only; `test:betting-ink` checks colours only.
- Accept: home ≤ **7.5 screens** at 360 EN, ≤ 7.8 SW.
- **D51 — the hero's three figures do not share a left edge** (critics panel, measured). "32" starts about 17px right of its label because
  the live pip (`.kp-proof__pip`, `landing-hero.tsx:132`) sits inside the number's flow, while "TZS 29K" and "8" start on the 16px edge.
  Hang the pip outside the flow, or give every row the same leading slot. Guard: the three figures' first glyphs line up within 1px at
  320/360/412 SW. RED: put the pip back in flow.
- 📐 Owner item 5 has a visual half the critics added: the English headline sets **YES** and **NO** in the outcome inks, so the brand line
  teaches the colour rule in English one inch above the Swahili bar that uses it. Whatever Ali rules, the inks follow the words.

### Phase C — Chrome behaviour and defects (not density-gated; may move earlier)

**U7 · [General] Chat bubble 44px + hides while scrolling (D3)**
- 🔵 **D75 — FIXED AND LIVE (`7b7b15ef`). It was not a landing-page defect.** Re-measured across four routes: `/markets` at 360 lost **100% of a card's `NDIO` probability cap** and at 414 **16% of a `HAPANA @ 12%` button**, a betting control — both worse than the hero instance it was reported as. Ali chose auto-hide at rest over insetting every price or accepting it. `data-fab-idle` after 3s of stillness; `pointer-events: none` is the fix and the fade is decoration, because an invisible square that still takes taps is D30 wearing a disguise. Sealed by `qa:focus-and-fit` §6 + `RED_D75`.
- ⬜ ~~D75 — the chat FAB covers the landing hero's price at rest, above the fold.~~ (as handed over) `.cm-fab` is 44×44 at (300, 656) at 360 and overlaps 32% of the first hero question's "29% NDIO" block.
  Measured on production 2026-09-24 by session **asheib-b1** and handed to this programme because `.cm-fab` and `ChatRoot.tsx` are its files. D3's rule hides the bubble while the page is
  MOVING (`html[data-scrolling]`); nothing covers a collision that exists at rest. ⚠️ **Re-measure on production before designing a fix** — the same session's first handover (footer tap reach)
  had been fixed by U20 between their measurement and their message, so a number from that batch is not assumed to still hold.
- `src/components/layout/scroll-cast.tsx` (mounted `app-shell.tsx:301`) also sets `data-scrolling` on `<html>` **once per burst** and clears it after a
  250ms idle timer (cleared on unmount), keeping the file's one-write-per-crossing rule.
- `chat-styles.css:57` `.cm-bubble-mobile` 52→44; `ChatBubble.tsx:41` HelpMark 30→24. `html[data-scrolling] .cm-fab` gets opacity 0, translateY 8,
  pointer-events none, on motion tokens (reduced motion: opacity only). Never while the chat is open (`open` in ChatRoot) or the bubble has focus.
- `ChatRoot.tsx:313-319` wrapper gains `className="cm-fab"`. `bottom: isMobile ? 80 : 16,` and `zIndex: 60` stay on adjacent lines
  (`stacking-contract.test.mts:188`, in predeploy).
- Overlap is measured on the `::after` pulse ring, not the 44px box. `scripts/chat-responsiveness-e2e.mjs` is stale (wrong breakpoints) and not evidence.
- Guard: a stacking-contract row plus a driver asserting the bubble spot hits the page while scrolling and the bubble after 400ms idle. RED: remove the hide rule.
- 📐 **D3 is wider than its register line** (critics panel, 360 SW, 2026-09-16). The bubble covers content on **seven of nine** surfaces: a
  ranked player’s ROI on the leaderboard — re-measured live 2026-09-23, the 52×52 bubble covers the WHOLE third-place podium column at 360 SW ("@Jaykishan", its tier badge, "+24.0%" and "12 imetatuliwa"), and at 412 it covers the top summary line instead ("Mtabiri · ROI · +52.9%"); at 320 it covers nothing, so the overlap MOVES with the width rather than being one spot — the resolution criteria on a detail page (the line ends "…itathibitisha kwam" under it), the first
  card title on home ("…litafungwa n"), the ⓘ plate and "Maelezo" on the board, and the /results pager. This unit's driver runs on all nine
  surfaces, not on the board alone.

**U8 · [General] Countdown everywhere + guest market split first**
- `src/components/markets/countdown.tsx:87-109`: ≥ 1 day → days + hours; < 24h → 4 cells; `<time dateTime>` kept. Only call sites are
  `markets/[id]/page.tsx:585` and `:593`.
- `markets/[id]/page.tsx:756`: one wrapper holds `<SidePicker>` (session) or the sign-in CTA (guest). Below `lg`: `session ? "order-1" : "order-3"`
  (probability section is `order-2`, `:499`). Signed-in order byte-identical.
- Guard (driver): 2 cells when days ≥ 1, 4 under 24h; guest probability above sign-in; signed-in unchanged. RED: always 4 cells; restore `order-1`.
- Accept: countdown panel ≤ 160px at 360.
- 📐 (critics panel) The detail page spends its heaviest type on **two four-box countdowns ticking seconds 36 and 40 days out**, three of
  whose four boxes hold identical values, and states the same dates three times. That is Ali's ruling "countdown simplified everywhere"
  seen from a critic's chair: the simplified form is the fix.

**U9 · [General] Defects D1 · D5 · D7 · D18 · D34**
- 🔴 **D58 — at ≤ ~290 effective CSS px the /markets SORT control is not merely clipped, it is unreachable.** Found 2026-09-23; [the record](MOBILE-VISUAL-UNSEEN-2026-09.md).
  ⚠️ **It extends D18 and the examiner missed that; the verifier caught it.** D18 owns the CLIPPING (320 native: summary 27px, clientWidth 26 vs scrollWidth 61) and at 320 the control is still
  tappable 27/28 — so D18 is a LEGIBILITY defect. What is new, and in no register row, is the collapse to ZERO reachability: `details.kp-menu` width 0, the 44×44 direction link taking the
  summary's exact left edge and painting over it (it is later in DOM order), **0 of 14 hit-test points**, and Playwright's own actionability check failing and naming the interceptor.
  ⭐ Two instruments agreed with a healthy control in the same run, and the crops agree with the numbers. It is NOT a zoom artefact and NOT a Swahili-length problem: a zoom-free 277×600 native
  cell reproduces it identically, and EN is the same to the pixel. The cliff was swept: 360 → 67px (67/68 tappable) · 344 → 51 (already clipped) · 320 → 27 (27/28) · 300 → 7 (7/14) · ≤290 → 0 (0/14).
  ⛔ **And there is no second path to sort.** The Filters sheet at 277 contains no sort section and none of the four sort values; sort is changeable only from this control or by editing the URL.
  The active sort stays legible on the count line, so the player is not misinformed — only unable to change it.
  **Fix:** give the sort cell a minimum inline size in `ch` and let the direction control shrink or wrap instead of overlapping it. RED: restore the collapse; 0/14 returns.
- 🟡 **D63 — the filter-strip chips lose three of four sides of their focus ring** to the strip's own horizontal scroller (360×780 sw, 7 tabs). At most a 2px right-hand cap is painted, and on the
  first chip even that is cut, leaving a soft gradient easy to mistake for the strip's own fade. **Fix:** inward `outline-offset`, or strip padding equal to the ring with a matching negative margin.
- 🟡 **D64 — `HAPANA 110` paints as `HAPANA 1` at 130% text**, 13.1px past the viewport, per-character advance 7.8px, with `overflow-x: clip` on `html`/`body` so the player cannot pan to it.
  🔴 A TRUNCATED NUMERAL IS A MISREPORTED FIGURE — DESIGN_AUTHORITY's fit law says so explicitly — and the survivor is a plausible smaller number with no ellipsis to signal the cut.
  **Fix:** let the outcome legend wrap at large text instead of carrying `whitespace-nowrap`. RED: restore nowrap and the `0` leaves the screen.
- D1: `.kp-strip-fade` fade 24→40px (below 1024; no test pins 24). If that isn't enough, add one gap step before the count; never put a positioned menu inside the mask.
- ✅ **D7 — SHIPPED EARLY, `a25c127b`, 2026-09-16, verified live.** `aria-label`s on `updown/page.tsx` from the same keys the visible spans use
  (`common.readFullRules` / `market.udHistoryTitle`), matching the idiom `top-app-bar.tsx:302-320` already documents. The guard is the class, not
  the two links: `test:ui-consistency` rule `collapsing-label-without-aria-label` (error, no baseline entry, so any future occurrence fails the
  suite) — proven RED at exactly 2 findings, both in that file, 0 elsewhere in `src/`; 0 after the fix. On production the links now announce
  "Soma kanuni kamili" and "Juu na Chini zako". **This unit still owes D1, D5, D18 and D34** — the row stays 🔵, not ✅.
- D5: `SearchBox` prop `reserveEcho` (default true; all 14 call sites unchanged); only `results/page.tsx:372` passes false. Fix the stale
  comment at `results/page.tsx:355`. Driver: search-to-tabs gap ≤ 24.
- D18: at 320 the active sort value is clipped in both densities. The sort `<summary>` gets `min-w-0` with the value on one line at `--type-small`, and the
  full value in its `aria-label`. If it still can't fit, the direction control shrinks to its 44px icon only. Driver: the sort value's `scrollWidth ≤ clientWidth` at
  320 EN/SW/ZH.
- D34: at 320 the board stats row ("25 hai · TZS 27K katika mchezo") can neither wrap nor shrink, so it runs past the viewport edge **beside a money
  figure** (`markets/page.tsx` header row). The row wraps below 400px — `flex-wrap` plus `min-w-0` on the text group — and the money figure stays
  whole on whichever line it lands on; it is never ellipsised and never compacted further to buy room. Driver at 320/360 × EN/SW/ZH: no node's right
  edge past the viewport, 0 ellipsised money nodes. RED: restore `nowrap` on the row.
- 📐 **On /results, D1 hides an outcome** (critics panel). The tab the fade eats there is HAPANA — one of the two outcome filters reads
  "HAPAI", at every scroll position, in the default language.

**U10 · [General] Defects D2 · D6 · D10 · D11 · D43 · D44**
- 🟡 **D41 extends here too, in a second component.** Focusing a podium TIER BADGE opens a tooltip whose box runs 87.3px past a 360 viewport — 76.3px of actual glyphs, which is exactly the clause
  `· ≥15% ROI`. The badge is the only place the leaderboard says what Dhahabu or Almasi mean, and the part cut is the qualification itself. ⛔ Fixing D41's `InfoHint` will NOT touch this: it is
  `.kp-tooltip`, 11 triggers, all `tabIndex=0`. Crop read by eye. [the record](MOBILE-VISUAL-UNSEEN-2026-09.md).
- D2 (DG-P-08 binds): below `sm` the `TierBadge` moves under the handle (`:591` wrapper) and the handle steps one rung down, so it gets the full ≈ 85px
  column; `break-words` stays as the last resort. Measure the real handles plus a 15-char fixture.
- D6: split the `:430-467` row into a wrapping status group (chips and closing/waiting/resolved pills) and a no-wrap action group
  (Source · `WatchStar` 40 · `ShareButton` 40 with label) pushed right.
- Guards (360/390 × 3 locales): no mid-word break or overflow; star top = share top in SW. RED controls restore each.
- D10 (money clipped at 320): the Up & Down target row "HIGHER OR LOWER THAN $75,933.75 ± $0.02" becomes two lines below 400px. The caption goes on line one
  and the **full price plus tolerance on line two** (mono, tabular), so the price is never ellipsised.
- D11: the UP/DOWN money buttons at 320 keep `btn-lg` height. The label and multiplier sit on two tight lines when the one-line width exceeds the button
  (`× 1.00` under "Down"), with the arrow icon kept.
- Guards at 320/360 × EN/SW/ZH, with a 7-figure BTC price and a `×12.34` multiplier fixture: 0 ellipsised money nodes (`scrollWidth > clientWidth`
  on any node with a currency or `×` value) and 0 text overflow in the buttons. RED: restore the one-line caption.
- **D43 — the list drops the number it is sorted by** (critics panel). The podium prints +26.8% / +13.2% / −3.9%; rows 2–6 carry rank,
  avatar, handle and tier only, with 105–142px empty at the right (`leaderboard/page.tsx:460`). Put the sort value in that column —
  tabular, right-aligned, with the settled count under it — so the podium and the list speak one language. Guard: every list row renders the
  sorted metric at 320/360 SW. RED: remove it from the row.
- **D44 — a silver tier printed in gold** (critics panel, sampled). The top-tier panel sets "Fedha" in the money gold (`:320`,
  `accent: "gold"`), and podium rings #2 and #3 are the same pale blue, while the tier chips on the same screen already own silver and bronze
  inks. One metal token per tier drives the word, the chip and the ring. Guard: the tier word's colour equals its chip's metal token. RED:
  restore `accent: "gold"`.
- 📐 D2 re-confirmed in the default language (critics panel): "@Dhire / sh", "@Libuh / i", "@Jayki / shan" — every podium handle.
- (low, critics panel) Avatar initials are `handle.slice(0, 2)`, so @Jaykishan and @James both render "JA" in near-identical plates, and the
  seed-hashed gradients produce hues found nowhere else in the palette. Fix alongside D44: hues from a fixed palette, and two letters that differ.

### Phase D — Overlays, messages, notifications, detail pages

**U11 · Overlay census (runs before any overlay fix)**
- Driver `scripts/live/mobile-overlay-census.mjs` at 320/360/412 × EN/SW/ZH records, per surface: height as % of viewport, primary action visible
  without scroll, title/body sizes, button rungs, overlap with rail and bubble, safe-area, dismiss reachability, overlays at once.
- Local `next dev` (after `rm -rf .next/dev`, `LIVE_BASE=http://localhost:PORT`, `MSYS_NO_PATHCONV=1`):

  | Surface | Trigger |
  |---|---|
  | Primer | `/?primer=1` |
  | Consent | `?consent=1` |
  | Welcome toast | `?welcome=new` / `?welcome=back` |
  | Session-ended | `/auth/login?revoked=1`, `?ended=idle` |
  | Email-verify bar | `/auth/demo?email=unverified` / `none` |
  | KYC gate / rejected | `/auth/demo?kyc=rejected` → `/wallet/withdraw` |
  | KYC first-deposit notice | `/auth/demo?deposit=0` / `1` → `/wallet` |
  | Payout-status notice | `/wallet/withdraw`, `/wallet/deposit` |
  | Win celebration | `window.dispatchEvent(new CustomEvent("50pick:celebrate",{detail:{kind:"WIN",…}}))`, shot at 1–6s |
  | Up & Down receipt, toast, result | `api/dev-test/updown-seed` → `updown-advance` → `updown-handover` arm/settle, page kept open |
  | Bet confirm | detail → dial → confirm, **cancelled, never submitted** |
  | Deposit / withdraw confirm | form submit on demo |
  | Reality check | sessionStorage `kp_session_started_at:<id>` / `kp_reality_check_last:<id>` |
  | Bell panel, avatar menu, language menu, More menu, filter sheet | open by click (`scripts/overlay-responsiveness-test.mjs`, `scripts/live/player-query-shots.mjs` show how) |
  | `/notifications` | after `api/dev-test/resolve-seed-markets` |

- Production confirmation of real-money moments (bet toast, win celebration, bell rows, away summary) with two QA-fleet players on opposite
  sides of a 3-minute round (`scripts/live-s30-win-moment.mjs`, `qa:updown-next-playable`).
- Out of reach, recorded rather than skipped: push opt-in (headed only), install invite and bonus (feature OFF), tier-up (no such celebration).
- Accept: a per-surface census table here with verdict **fits / chunky / broken**. U12–U18 are confirmed or re-scoped from it.

**Overlay rules for U12–U18:** phone-wide in both densities; each size step is one rung on an existing ladder, on tokens.
⛔ Kept as they are:
- the reality check's four stacked `btn-lg`;
- every money-commit `btn-lg`;
- feedback timings (toast 4.5/8/3s, win 7s, quote hold 10s, result auto-close 5s);
- the z-ladder;
- the commit-sequence motion and dial;
- `ConfirmModal`'s 36px medallion literal, the NoticeBar `-my-1`, and the comment-free toast body.

**U12 · [General] `<Modal>` on phones + questions as bottom sheets**
- `modal.tsx`: panel `p-5` (`:319`) one step down below 640; close `h-8` (`:329`) → 44. `sheet` (docks below 640, `:273-274`/`:320`) gains bottom
  padding + `env(safe-area-inset-bottom)` (none today), casts upward (`--shadow-overlay-up`, DESIGN_AUTHORITY §E3) and enters with `.m-sheet-in` (§M2).
- `ConfirmModal` (`:435-596`) gains `sheet?: boolean` **default true**, forwarded by `ConfirmDialog` (`confirm-dialog.tsx:40`, `:146`). This covers sign out
  (`avatar-menu.tsx:270`), deposit/withdraw confirm (`src/app/wallet/deposit/deposit-confirm.tsx:119`, `src/app/wallet/withdraw/withdraw-confirm.tsx:153`),
  close account, RG confirms (`rg-confirm-submit.tsx:45`) and unsaved changes. Cash-out (`sell-confirm-modal.tsx:74`) passes `sheet`.
  ⛔ Bet confirm stays centred.
- Focus unchanged (ConfirmModal on Cancel; sell/bet on commit).
- New guard (no Modal focus/Escape test exists today), at 360/393/768:
  - sheet bottom = viewport bottom with the safe-area pad;
  - focus on Cancel;
  - Escape closes;
  - focus returns to the trigger;
  - centred at ≥ 640.
  RED: remove the pad or the default.
- Accept: every question shows its primary action without scroll at 360×640.

**U13 · [General] Result modal, bet confirm, sell confirm (+ D9)**
- `operation-result-modal.tsx`: content `p-6 lg:p-7` (`:409`) one step down; icon 64 → 48 (`:421`); title `text-[22px]` (`:451`) →
  `text-title-sm`; primary `btn-lg` kept, secondary already `btn-md`.
- `bet-confirm-modal.tsx`:
  - content (`:240`) one step down;
  - **D9** fixed by making the safe-area `pb` win at every width;
  - side label 26px (`:284`) → `text-title-md`;
  - stake 22 (`:290`) → `text-title-sm`;
  - boxes one step down;
  - close → 44;
  - `btn-gold`/`btn-ghost` `btn-lg` kept, quote hold and motion unchanged;
  - the market title stays unclamped (`popup-fit.test.mts` §3.2).
- `sell-confirm-modal.tsx`: box one step, value 24 → 20, `btn-lg` kept.
- Guards: `qa-toast-modal.mjs`, `test:popup-fit`, `feedback-law.test.mts`, `test:motion-ladder`; driver: bet confirm at 360×780 with the longest real
  title shows Confirm without inner scroll in EN/SW/ZH. RED: restore paddings.
- Accept: result modal ≤ 60%, bet confirm ≤ 85% of 780.

**U14 · [General] Win celebration**
- `win-celebration.tsx`: `pt-10` 80 → 40, `px-7 pb-7` 40 → 24 (`:295`); seal 132 → 96 (`:134`); amount 38 → 32 (`:318`); gaps one step.
- Unchanged: dwell 7s, queueing, reduced motion.
- Pins stay green: `feedback-law.test.mts:479,502`, `stacking-contract.test.mts:165`, `popup-fit.test.mts:106`.
- Driver: `50pick:celebrate` event plus one real settle on prod. RED: restore sizes.
- Accept: ≤ 360px tall at 360, a 7-figure TZS amount never clipped in EN/SW/ZH.

**U15 · [General] Toasts**
- `toast.tsx`: icon `h-7` 40 → 32 (`:676`); close `h-8` 48 → 44 (`:692`); text right padding follows the close box.
- Top `env(safe-area-inset-top)` appended **after** the pinned class run `fixed inset-x-0 top-0 z-[1800] flex flex-col` (`stacking-contract.test.mts:164`).
- Phones show ≤ 2; the rest queue with their countdown not started. Not done by CSS hiding.
- Pins updated in the same commit:
  - `presence-class.test.mts:148, :298-301` (`toasts.slice(0, MAX_VISIBLE).map`);
  - the `ui-consistency` toast-dismiss baseline (`:504`);
  - the `design-frozen` toast literal budget (`:183`, so tokens, not literals).
- `feedback-law` §10.5/10.6 stay green.
- RED: 4 visible at 360.
- Accept: a single-line toast ≤ 64px, stack ≤ 150px, first toast below the safe area, and a queued toast gets its full duration.

**U16 · [General] Notice stack + first-visit coordination (D4 · D27)**
- `notice-bar.tsx:93`: below 640 the text's `basis-[14rem]` drops so the 44px action (`:184`) stays inline; text clamps to 2 lines with the full text in the
  accessible name. Bar ≤ 60px.
- Render order (`app-shell.tsx`): TopAppBar `:303` · Announcement `:304` · session-ended `:307` · EmailVerifyBanner `:333` (collapsible, never dismissible) ·
  AwaySummaryBar `:341` · LiveTicker `:351`. On phones the AwaySummaryBar waits while the email bar is expanded; nothing else changes order or dismissibility.
  Re-run `qa:social-panel`.
- D4: extend `src/lib/invitation-slot.ts` (today `useInvitationSlot(id, zone, priority, eligible)`, zones `bottom`/`top-right`) with a blocker the primer
  registers while open. Every claimant's eligibility (consent, install, channels) requires no blocker, and consent's 1200ms timer starts after the primer closes.
- Guards:
  - demo player (email unverified + away entries) at 360: the email bar shows while the away bar waits, then the away bar appears after collapse;
    announcement and session-ended are never hidden;
  - `?primer=1&consent=1`: never both visible in one frame.
  RED: both expanded together; remove the blocker read.
- D27: reaching the responsible-gambling session time limit is today a toast only (`failure-reasons.ts:285`). It becomes a **persistent,
  non-dismissible NoticeBar** in the compliance class (same order rules as session-ended: never hidden, never queued behind a non-compliance bar),
  shown until the limit period ends. The toast may remain as the moment-of-refusal feedback. U11's census verifies it. Guard: a demo player at the
  session limit sees the bar on every page until the period ends. RED: bar removed, toast only.
- Accept: the common signed-in case is ≤ 56 + 60 + 32px; no bar's action wraps under its text in EN/SW/ZH.

**U17 · [General] Notifications**
- Bell panel empty state `py-12` (128px each) → `py-8` (`notifications-panel.tsx:691`).
- `/notifications` rows (`page.tsx:238-275`) ≈ 90 → ≤ 72px: padding one step down, icon plate 32 → 28, 44×44 actions kept.
- Driver with seeded settlement notifications at 360 × 3 locales. RED: restore `py-12`.

**U18 · [General] Page shells, primer, detail pages**
- `page-container.tsx:106` `py-6` → one step below 640. ⚠️ **53 files use PageContainer** (49 under `src/app`, plus their `loading.tsx`), so every
  PageContainer route is measured before and after. Update `scripts/measure-system.test.mts` (`test:measure`), `scripts/measure-parity-check.mjs`
  (`qa:measure-parity`) and `scripts/anchors/measure.anchors.mjs:73` in the same commit. Pages with their own padding: `updown/[roundId]`, `fairness`, `legal`.
- Wallet/profile section gaps one step down; `KycGatePanel` `p-6` (`:133`) and `Callout` `stack` `p-6 sm:p-8` (`callout.tsx:257`) one step down below 640.
- Primer (`first-visit-primer.tsx:453-468`): body `pb` and illustration one step down; title 22 → 20 below 640.
- `/updown/[roundId]` `pb-14` (`page.tsx:276`) → the measured rail clearance.
- Kept: `PageHeader` `text-title-lg`, wallet 38px balance, UP/DOWN and stake `btn-lg`.
- Guards: `qa:footer-reachable`, `test:revoked-deadend`, page-height driver. Accept: each touched page shorter at 360, 0 overflow, nothing below the floor.

### Phase E — General phone fit found in the 2026-09-15 screenshots

**U19 · [General] Live carousel · Help rows · auth forms (D48)**
- `/live` featured card (`src/app/live/featured-contest.tsx`): the 19px title (`:114`) unclamped over 5 lines, card ≈ 460px. Clamp to 3 lines, step the
  inner padding and CTA gap (`:135`) down one step each, arrows stay 44 (`:205`). Target ≤ 360px.
- `/help` contact cards (`help/page.tsx:190`, `glass-panel p-4 space-y-2`, ≈ 146px each): below `sm` use the page's own row pattern (`:223`, ≈ 82px),
  keeping `tel:`/`mailto:`. Target ≤ 84px each.
- Auth forms: `AuthPanel` (`src/components/auth/auth-panel.tsx:59`, `p-6`) → `p-5 sm:p-6`, giving inputs ≈ 261 → ≥ 277px. Shared by **7 pages**
  (login, register, forgot-password, reset-password, otp, 2fa, verify-email), so all 7 are measured at 320/360 × 3 locales.
- `/leaderboard` was checked and is not a defect (the gap is ≈ 41 CSS px, the page's normal rhythm).
- 🟠 **D84 — the badge-tier tooltips, inherited from D41 and filed here on 2026-09-25.** `/leaderboard` is the
  last consumer of the `Tooltip` atom, and it still has everything D41 had: measured on production at 320 sw,
  signed in, **14 triggers at 22×22-23.3px** (under `--tap-min` 40) with popovers **264-380px on one line,
  overflowing the right edge by up to 72px** and unreachable past it (`body { overflow-x: clip }`). ⛔ It is NOT
  a regression: `InfoHint` stopped using `Tooltip` and `Tooltip` itself is unchanged.
  ⭐ The fix is already written — swap `leaderboard/page.tsx:637` to `InfoHint` + `InfoHintPanel`
  (`components/ui/info-hint.tsx`), a 40px trigger plus an in-flow panel; the only decision is where the panel
  belongs in a leaderboard row (a row is narrow, so it probably belongs under the row, not inside it).
  Afterwards `.kp-tooltip*` (`globals.css:2102-2155`) has no consumers and can be retired, which removes the
  last nowrap tooltip in the product. Guard: extend `qa:detail-order-hints` §3/§4 to this route, or copy them —
  they already assert fit, wrapping, `text-transform` and four-edge `elementFromPoint` reach.
- Guard: per-surface driver targets. RED per sub-item.
- **D48 — the sign-in form wears the sign-up form's rules** (critics panel, sampled; code-confirmed). `auth/login/page.tsx:288-296` gives
  the password field the registration hint "Angalau herufi 8.", `minLength={8}` and an eight-dot placeholder that reads as a password
  already typed; and "Umesahau nenosiri?" (`:310`) is set in the form's uppercase label style, dimmer than the static hint above it — so the
  one action for a player who is locked out looks like a caption. On sign-in: no length hint, an empty or worded placeholder, and the recovery
  action in the product's link style. ⚠️ Before dropping `minLength`, confirm no account can hold a shorter password: if none can, it is dead
  weight on sign-in; if one can, it is locking that player out. Guard: no min-length hint on the login password field; the recovery link
  matches the link token's style and contrast. RED per item.

**U20 · [General] Footer tap rows + Discussion copy (D8)**
- ✅ **THE FOOTER TAP ROWS ARE DONE AND LIVE (`c1f2c223`, 2026-09-24) — D8 and D24 below are NOT, so this unit stays open.**
  Every one of the 16 controls now reaches 44px, measured by hit-test: **14 under the floor → 0**. `FooterLink` took the same rung
  `SocialLink` already carried, and the three contact links took `inline-flex` WITH it — without that they would have been missed
  entirely, because `min-height` does not apply to a non-replaced inline element and they were `display: inline`.
  ⚠️ **THE COST IS MEASURED, NOT HIDDEN: the footer goes 953.7 → 1210.3px at 320 (+257).** 96px of that was given back by
  dropping the list's `space-y-1.5`, which was sized for a 19px text row and was separating 44px controls that no longer touch.
  §3b already measured this footer at ~920px on every page and called it a third to a half of the short ones — so the remaining
  +257 is a real trade, and **slimming the footer elsewhere is now this unit's, not a nice-to-have**.
  👁 And READING THE SHOT caught what no measurement did: `inline-flex` EATS THE SPACE between the label span and the value
  span, because a whitespace-only text node is not a flex item — it rendered `Wasiliana nasi ·0769777877`. Every box was the
  right size and the words were wrong. `gap-x-[0.28em]` is the font's own word space.
  ⭐ **AND `qa:footer-reachable` LEARNED SOMETHING TRUE RATHER THAN BEING SILENCED.** The taller footer put one contact link under
  the STICKY header at the final scroll position and the guard called it covered. Its own rule already says a link scrolled out of
  the viewport is reachable by scrolling — and a sticky top header is one scroll-step away, whereas the defect it exists for (a link
  under the FIXED bottom rail with the document ended) has nowhere left to scroll. It now RE-PROVES a sticky blocker by scrolling up
  one header height and hit-testing again rather than inferring it. 108/0, and `--prove-red` still fails on exactly the original
  defect: *"Export / close my account … covered by nav (fixed)"*, in all three locales.
- Footer list links (`src/components/layout/public-footer.tsx`, ≈ 19px rows) below 640 become `inline-flex items-center min-h-[var(--tap-min)]`,
  keeping font, colour and case. Not `.row-link` (`globals.css:1664`), which is uppercase. `qa:footer-reachable` stays green.
- 🔴 **MEASURED ON PRODUCTION 2026-09-23, AND THE UNIT AS WRITTEN WOULD MISS THE WORST THREE.** Hit-tested (reach, not the painted box) on
  `/legal/responsible-gambling` at 320 and 360 SW: **14 of the footer's 16 controls reach under 44px**, and reach equals box — there is no `::after`
  extending any of them. The list rows are 19–19.5px as this unit says. ⚠️ **But the three contact links are 15px AND `display: inline`, and
  `min-height` DOES NOT APPLY TO A NON-REPLACED INLINE ELEMENT.** So the prescription above, applied to "footer list links", leaves
  `tel:0800110011`, `tel:+255769777877` and `mailto:msaada@50pick.tz` exactly as they are. They need the display change too, not just the min-height
  — the same shape as `/help`, where `py-3` sat on the `<details>` and added look rather than tap area.
- ⭐ **THE DISCRIMINATOR THAT SAYS THIS IS AN OVERSIGHT, NOT A CHOICE:** the same footer's Instagram and WhatsApp links measure **exactly 44**.
  The floor was applied to the social row and to nothing else in the block.
- 🔴 **AND IT IS NOT ONLY TASTE — four of the sub-floor controls are the licensed operator's duty-of-care doors:** `Simu ya msaada · 0800 11 0011`
  (the support helpline, **15px**), `Pumzika / Jizuie` (take a break / self-exclude, 19px), `Weka mipaka` (set limits, 19px) and
  `Hamisha / funga akaunti yangu` (export / close my account, 19px — the same data-rights door `qa:footer-reachable` was written for in the first
  place). This footer is on EVERY page. ⭐ That is an argument for moving U20 earlier than S11; it is recorded here rather than acted on, because
  the schedule is Ali's.
- ⛔ **NO GUARD OWNS THIS, AND TWO GUARDS SITTING ON THE FOOTER MAKE IT LOOK OWNED.** `test:tap-target` reads the height a control DECLARES IN
  SOURCE — these declare none, and an inline link has no height to declare. `qa:footer-reachable` measures OCCLUSION with `elementFromPoint`,
  which is a different property and which its own header is careful to say ("being covered is not a property of the element"); it ran green here,
  108/0, against a footer where 14 of 16 controls are under the floor. **Neither is wrong; the SIZE of a footer control is simply unowned.** Read
  `qa:footer-reachable` green as "nothing is buried", never as "the footer is fine". The `≥ 40 at 360` guard in this unit's Guards line is what
  closes the gap — and it must probe the contact links too, not just the list rows.
- D8: new `market.signInToComment` in EN/SW/ZH (native check) used at `comments-thread.tsx:224-229`; `signInToPredict` stays on bet surfaces.
  - ⛔ **Examined in the safe-fix lane on 2026-09-16 and deliberately NOT shipped.** The one-line version — swap in the existing `common.signIn`
    ("Ingia" / "登录") — is accurate but strictly less informative than the wrong string it replaces, and it would spend a visible copy change in
    three languages on a phrase this unit is going to change again. A defect worth fixing once is not worth shipping twice. It waits for the
    native SW/ZH reader (§0 owner item 3), which is what `signInToComment` needs anyway.
- Guards: footer link boxes ≥ 40 at 360; `test:i18n` parity; a source assertion that comments-thread no longer reads `signInToPredict`. RED restores each.
- D24: the comments "Post" button keeps a stable width while pending: `min-w` equals its widest label ("Posting…") in each locale, with the spinner
  in place of the icon. Driver: no horizontal shift of the character counter during submit.
- 📐 (critics panel) **The footer is about 920px on every page** — a third to a half of the short ones (sign-in, leaderboard, Up & Down).
  Its contact details are styled exactly like navigation links, and on /auth/login the page's own legal strip is restated by the footer 60px
  later. Its legal furniture is owner item 9. The tap-row work above makes it taller, so measure the footer's share of the short pages before
  and after.
- 📐 (critics panel, taste — art direction) The loudest colours on the whole phone are three other companies' logos in the footer's social
  row (Instagram's gradient, TikTok's fringes, WhatsApp's green). Monochrome marks in the text ink keep the footer the product's own.

### Phase F — Phone conditions a portrait screenshot never shows (added by the S0b seven-lens review)

**U21 · [General] Short screens and landscape (D20)**
- Measured: at 780×360 `/markets` pins 237 of 360px (66%), leaving ≈ 123px for cards, and the width misses every `< 640px` rule. Home is 16.3 screens.
  `public/manifest.json` locks the **installed** app to portrait, but browser tabs rotate.
- New gate for phones on their side and short windows: `@media (max-height: 480px) and (max-width: 1023.98px)`. Tablets are untouched (taller than 480).
  Under it:
  - the discovery bar uses U4's one-line layout in **both** densities;
  - `.kp-rail__item` min-height 64 → 48, labels kept and the pip reduced. The rail height becomes a token (`--rail-h`), and the chat offset
    (80) and footer clearance (88) are **derived** from it instead of hand-typed (`ChatRoot.tsx:317`, `public-footer.tsx:102`). `test:stacking`
    keeps its two-line pin, so the literal is replaced with an expression the regex is updated to accept, in the same commit (B10);
  - the chat bubble stays hidden while scrolling (U7).
- D20: a bottom sheet taller than a short screen overflows upward (`items-end` inside the scroll container, `modal.tsx:273-274`, `:320`). The sheet
  panel gets `margin-top: auto` in place of `items-end` (reachable when overflowing), `max-height: calc(100dvh - 12px)` with a `vh` fallback line first,
  and an internal scroll body with a pinned header.
- Guard (driver at 740×360, 780×360, 915×412, EN/SW): pinned chrome on `/markets` ≤ 150px; every open sheet and modal (filters, More, questions,
  bet confirm, reality check) has its title, close and primary action reachable. RED: remove the gate; restore `items-end`.
- Accept: pinned chrome ≤ **150px of 360** (from 237), no unreachable overlay, and 1024+ zero diff.

**U22 · [General] On-screen keyboard and viewport units (D19)**
- 🔴 **D57 / D62 — plain Tab and Shift+Tab park the focused control underneath the fixed chrome.** Found 2026-09-23; [the record](MOBILE-VISUAL-UNSEEN-2026-09.md).
  On `/` , 30 Tab stops: **11 overlap the rail, 14 the bubble, and 4 are 100% behind the rail** — `.mcardp-share` 13×17.3 (225 of 225 px²) and `.mcardp-details` 63.9×17.3 (1,105 of 1,105 px²), twice each.
  ⚠️ **THE OBSTRUCTION IS TWO LAYERS, NOT ONE.** `.kp-discovery-bar` is `sticky top-[56px] z-20` and opaque, so the band is **0 → 132.3px**, not 0 → 56px. The examiner's instrument compared each
  stop against `<header>` alone and was blind to everything parked in the 56–132.3px strip; the verifier re-measured against the whole band. A guard written the examiner's way would miss it too.
  **Fix:** `scroll-padding-bottom` = 88px + `env(safe-area-inset-bottom)` and `scroll-padding-top` = 132.3px on the scrolling element. `scrollPaddingTop` is currently `auto` on documentElement,
  body and scrollingElement, and a grep confirms no `scroll-padding` or `scroll-margin` anywhere. RED: remove it and the four fully-buried stops return.
- 🟡 **D3 reaches a surface D30's fix cannot.** At 360×500 the chat bubble covers 1,820px² — 30.9% sw / 33.9% en — of the `/results` Filter trigger, taking 3 of 6 taps across its midline.
  ⚠️ **The keyboard proxy contributes NOTHING**: the verifier ran the same shrink without ever focusing the field and got a byte-identical result. It is a SHORT-VIEWPORT defect, not a keyboard one,
  and the register line should say so. D30 was closed by giving `.kp-rail` a z rung while its menu is open; the filter trigger is ordinary page content with no such lever, so the bug is still live here.
- Measured in code: no keyboard handling (the only `visualViewport` user is the Needle); the rail, consent/install cards (148) and chat bubble are fixed at the bottom;
  the filter sheet uses `min(82vh, 640px)` (`globals.css:3345`); auth, live and offline use `min-h-[calc(100vh-44px)]`. `interactiveWidget` is unset, so Chrome uses
  `resizes-visual`, while older engines and a Capacitor WebView resize the layout.
- Changes:
  - **Keyboard state.** `html[data-keyboard]` is set on `focusin` of text-like fields (input except checkbox/radio/range, textarea, contenteditable) on
    coarse pointers, and cleared on `focusout`. Phones hide the rail, chat bubble, consent/install cards and Needle while it is set
    (motion per §8b), and the sticky discovery bar stops sticking.
  - **Focused field into view.** After `visualViewport` resize settles, the focused field is scrolled to `block: "center"`, reusing
    `src/lib/client/focus-first-invalid.ts`.
  - **Viewport units.**
    - D19: `82vh` → `82dvh`, with the `vh` line kept first as a fallback.
    - `100vh` minimums → `100svh`, with a `vh` fallback.
    - `100dvh` users (avatar menu, notifications) get a `vh` fallback line.
  - **`interactiveWidget`.** Set to `"resizes-content"` **only if U30's real-device check shows it improves the forms without breaking the
    sheets**. It changes every fixed element, so it is decided on a phone, not in a headless browser.
  - **Keyboard hints.**
    - `enterKeyHint`: login "go", OTP "done", amounts "next"/"go", comment "send".
    - Search: `autoCorrect="off"` and `autoCapitalize="none"`.
- Guard (driver, phone emulation): focus each form field on login, register, OTP, deposit, withdraw, stake, comment and search at 360×780, then
  resize to 360×500 (keyboard proxy). The field rect is fully visible, the rail and bubble are hidden, and submit is reachable. RED: remove the
  `data-keyboard` rule.

**U23 · [General] Safe areas and installed-app mode (D21)**
- Measured in code: 21 `env(safe-area-inset-*)` uses cover the bottom well. The top is missing on the header (`top-app-bar.tsx:140`, sticky, inline height 56), toasts
  (U15) and the discovery bar's literal `top-[56px]` (`query-bar.tsx:53`). Side insets are missing everywhere except the Needle (landscape notches).
  The chat panel (`inset: 40px 0 0 0`) ignores insets.
- Changes:
  - a `--header-h: 56px` token;
  - the header gets `padding-top: env(safe-area-inset-top)` and a total height of `calc(var(--header-h) + env(safe-area-inset-top))`;
  - the discovery bar `top` uses the same `calc` (no literal);
  - the chat panel and sheets read the insets;
  - header, rail and sheets use `padding-inline: max(<gutter>, env(safe-area-inset-left/right))` in landscape;
  - no `display-mode: standalone` visual change is needed beyond this.
- Instrument: CDP `Emulation.setSafeAreaInsetsOverride` if Playwright's bundled Chromium has it, otherwise U30 on a notched phone and the installed PWA.
- Guard: a source contract that every `fixed|sticky` element at `top-0` on player surfaces reads the top inset. RED: remove it from the header.

**U24 · [General] Large system text (D22 · D23)**
- ⚪ **D82 — examined and DECLINED.** At 180px (200% zoom) `.mcardp-info`'s focus ring leaves its card. The handed-over remedy (`outline-offset: -2px`) was pre-flighted WITHOUT `!important` and the offset changed while the ring stayed out:
  at 180 the button is already **23px past its own card** (`.mcardp-timeleft` is a fixed 155px inside a 148px card). Clean at 320 and 360. WCAG 1.4.10 sets reflow at 320 CSS px, so this is below the normative width and below the
  smallest supported phone. ⭐ Recorded for the REMEDY, not the defect: a one-declaration fix that looks obviously right is exactly the kind that ships and does nothing.
- 🟡 **D65 — the market-card category chip loses up to 82% of its word at large text**: `UTAMADUNI` → `UTAMA…` at 360 @1.3 and `U…` at 320 @1.3. [the record](MOBILE-VISUAL-UNSEEN-2026-09.md).
  ⚠️ **NOT a word-length problem.** The slot is clamped to the SAME 43px at 277 and 12px at 246 on every card — `Michezo` (52px) → `MICHE…` / `M…`, `Nyingine` (59) → `NYING…` / `N…`. It is the
  row's space allocation. **Fix:** let `.mcardp-top` wrap at large text instead of holding `flex-wrap: nowrap` (`globals.css:4077`). RED: restore nowrap.
- ⚪ **D70 — the bottom rail ellipsises its labels, and THE THRESHOLD IS NOT 130%.** At 320 SW the two longest labels sit 63px inside a 64px slot — **1px of headroom** — so the ellipsis is painted at
  **102%**, the first step above Android's default (`Masoko | Juu/Chi… | Mubasha… | Matokeo | Zaidi`). At 360 SW headroom is 9px and it goes at **115%**. At 130% three labels are cut.
  Small in pixels; it is the one component on every screen, in both languages. **Fix:** a smaller rung, or two lines, for the rail label at large text.
- Measured in code: all type in px (so Android text scaling enlarges it), and `.btn-sm/md/lg/xl` use a hard `height` with `white-space: nowrap`
  (`globals.css:1061,1088-1091`). Detail pills are `h-[26px]` (D22), the tier badge is 22×22, rail labels ellipsise, and the sell button wraps inside a fixed 44
  (D23).
- Changes:
  - controls keep their rung as a **minimum**: `min-height: var(--h-control-*)` + `height: auto` + a small block padding. Single-word CTAs stay `nowrap`;
    long labels may wrap to two lines at line-height 1.15. The card YES/NO keep `min-height: var(--tap-min)`;
  - `h-[26px]` pills → `min-h-[26px]` with block padding;
  - countdown tiles use min widths only;
  - the pins that read `height:` (`scripts/token-collision.test.mts` `.btn-*` rule, `test:tap-target` §6, `.mcardp-actions .btn`) change their spec to
    `min-height` in the same commit (B10), and the tap floor still reads the tokens.
- Instrument: Android text scaling is approximated with `document.documentElement.style.zoom = 1.3` at 360 (and a 277px cell); U30 confirms at
  the real 130% setting.
- Guard: at zoom 1.3 on `/`, `/markets`, detail, `/updown`, wallet and auth, 0 buttons, pills or chips with `scrollHeight > clientHeight` or
  `scrollWidth > clientWidth` (except intentional ellipsis, listed). RED: restore `height` on `.btn-md`.

**U25 · [General] Loading skeletons without layout jumps (D26)**
- 🔴 **D26 is bigger than its line says, and it breaks this unit's OWN accept threshold.** Measured on production 2026-09-23 under slow 4G + CPU 4×; [the record](MOBILE-VISUAL-UNSEEN-2026-09.md).
  **At first paint every route puts the 18+ licence footer INSIDE the viewport and then throws it off screen.** `/` and `/markets` CLS **0.1594**, `/results` **0.1838** — against this unit's
  "CLS ≤ 0.05 per route, and no single shift > 0.02". One shift of **0.158974** does it: `footer` `{x0 y656 w360 h124}` → `{0,0,0,0}` as `main` grows 520 → 6032px. Byte-identical on all three routes.
  ⛔ So for about a second the first thing a player on a slow connection sees of 50pick is a spinner with a gambling-licence block under it, then the whole screen jumps.
  **And `/results` shifts a second time, 0.0237, which breaks the > 0.02 rule on its own**: the list and filter tabs paint before the page's own title row, then everything snaps 24px up.
  ⭐ The cause was isolated, not inferred: the first element child of the `div.space-y-5` container in the fallback state is React's Suspense boundary marker `<template id="B:1">`, present in the raw
  streamed HTML from the first bytes. **A `space-y-*` idiom is unsafe anywhere a first child can stream in late** — that is a class of bug, not one number.
- ~~Measured in code: `/live/loading.tsx` ghosts are 180px against 347px cards (the biggest jump); `/results` uses 220px;~~ — **🔴 THAT LINE WAS MEASURED IN CODE AND IT WAS WRONG IN A BROWSER.**
  Struck through rather than deleted, because a future session will otherwise re-derive it the same way. On production 2026-09-24: `/live`'s real PulseCards are **178–183px**, so its 180px ghost
  was the one number in that file that was already right; **347px is the `/markets` card**, a different card on a different route. `/results`' 220 had already become `MARKET_CARD_H_CLOSED`.
  ⛔ Reading two skeletons side by side in an editor is how a card height gets compared with a different page's card. The defects that were actually there — D72, D73, D74 — were found by
  hopping to the route in a browser and measuring where the board LANDED.
- Still true from that line, and re-checked: the markets skeleton filter bar wrapped to about 250px at 360 against the real 116px bar (**D73, fixed**); watchlist, notifications, help, proposals and most
  `profile/*` use the generic `PageLoader` (spinner box + 64px rows) whatever the real shape — **still open and still unmeasured**; `positions/[positionId]` inherits a list ghost; 6 `SearchBox`
  Suspense boundaries have no fallback — the count is exact, and measured, **they cost 0.0011 / 0.0007**, because the `SearchBox` arrives in the same component as the content beneath it.
- ✅ **AND THE GENERIC `PageLoader` IS MEASURED: on every route a signed-out player can reach it, it never renders at all.** `/proposals`, `/help` and `/fairness` hopped with a `MutationObserver` armed before the click — zero shimmer rows inserted on any of the three — while `/markets`, measured by the identical code in the same run, painted 27 rows at +329ms. Those routes are prefetched, so `loading.tsx` never runs. ⛔ The thirteen SIGNED-IN routes that use it are still unmeasured and nothing above is evidence about them.
- 🔵 **OUTCOME 2026-09-24 — `371690b6`, live.** **D72** `/live`'s ghost drew a header the page does not have and neither the hero nor the search box that it does (538px out). **D73** `/markets`'
  ghost re-typed the discovery bar and had drifted to `flex-wrap` where the real strip scrolls (239px out). **D74** `results/loading.tsx` hand-rolled a grid where the page uses `.market-grid`, which
  also made the route silently unmeasurable. **D71** — and this one is not a loading defect at all — `/live`'s hero resized on a 6-second carousel timer and walked the whole board 95px up and down
  for **0.0796 un-input CLS**, which is the largest number this unit has ever produced and was invisible to every gate because they all run reduced-motion.
- 🔵 **SECOND PASS, SAME DAY — the guard immediately found two more.** **D77** `/results`' ghost drew a third of the page and promised the board **647px** too high; it had been
  unmeasurable until D74 was fixed that morning, so this was the first number the route had ever produced. **D76** `/results`' notable carousel — `featured-contest.tsx`'s declared twin —
  hid its inactive slides with the `hidden` attribute, so its box was the active slide's height and the grid moved **45px under the finger** on every dot tap. Both carousels now share one
  mechanism, `.kp-slide-stack`. ⚠️ D76 is input-driven, so CLS scores it 0.0000 by design — the player still watches the board jump.
- ⛔ **THIS UNIT'S ORIGINAL GUARD LINE COULD NOT HAVE CAUGHT ANY OF D71–D74**, and that is worth stating plainly. It asked for a CLS driver — but `layout-shift` counts only nodes present BEFORE and
  AFTER a frame, and a skeleton is REMOVED, so ghost fidelity scores 0.0000 no matter how wrong it is; and its "RED: restore the 180px `/live` ghost" names a control that would have proved the
  opposite of the truth, since 180px was correct. `qa:ghost-landing` measures the LANDING POSITION instead, and hops by clicking a link, because `loading.tsx` never paints on a hard `goto`.
- Changes:
  - skeletons read `--mcard-h` (U3) and mirror the phone layout: one column, the bar ghost at the real phone height, the search ghost 44 + 17;
  - `/live`, `/results` and `/watchlist` use the real card ghost;
  - every `SearchBox` Suspense boundary gets a fallback that reserves its box;
  - the generic loader is kept only where the shape is genuinely unknown.
- Guard: a CLS driver (`PerformanceObserver` `layout-shift`, `buffered: true`, excluding input-driven shifts) on hard load and soft navigation at 360×780,
  CPU 4×, slow 4G, for `/`, `/markets`, `/live`, `/results`, `/watchlist`, `/notifications`, `/updown`. RED: restore the 180px `/live` ghost.
- Accept: CLS ≤ **0.05** per route, and no single shift > 0.02 after the skeleton swap.

**U26 · [General] Empty, error and offline states (D12 · D13)**
- 🟡 **D68 — the 404 tells the player to choose from three destinations and, at 320×640 at rest, none is usable.** The first is 30px of 101px above the bottom rail; the other two are off-screen.
  A player arriving from a stale or resolved-market link sees a dead end that reads as a cut-off box rather than a choice. **Fix:** relax the `min-h-[80svh]` centring on short screens so at least
  one destination is whole above the rail. [the record](MOBILE-VISUAL-UNSEEN-2026-09.md).
- Measured: two 404 designs.
  - The generic `app/not-found.tsx:111` has a medallion, "404 · PAGE NOT FOUND", and three ≈ 100px mostly-empty cards.
  - `markets/[id]/not-found.tsx` has compact rows, a gold "404", a different apostrophe and a different link order.
  - Also: `/offline` sits low (`min-h-[calc(100vh-44px)]` ignores 56 + 64) and is precached with guest chrome; the `sw.js` last-resort page has no retry;
    `EmptyState` is `px-8 py-8` with a 56px illustration (a ≈ 220–260px box, 272px text width); leaderboard with < 3 players shows no podium and a 640px-wide table.
- Changes:
  - **One not-found composition** for both routes: the market variant's compact rows are the model, with a context line per route and the apostrophe from
    the dictionary.
  - **Offline:** `/offline` centres within the real chrome (`--header-h`, `--rail-h`, `svh`), and the `sw.js` last-resort page gets a Retry link.
  - **`EmptyState` on phones:** padding one `--sp` step down, illustration 56 → 40, full-width box.
  - **Leaderboard with < 3 players:** rows on phones instead of the 640px table.
- Guard: a driver renders each state at 320/360 EN/SW; the two not-found pages share one component (source assertion). RED per sub-item.
- 📐 (critics panel, taste) An empty discussion panel takes **247px of a 543px usable screen** — a header, the sign-in button and one
  centred sentence ("Hakuna maoni bado — anza mazungumzo.") with about 60px of void above and below it. An empty state takes its content's
  height.

**U27 · [General] Touch behaviour (D14 · D15 · D16 · D25)**
- 🔵 **D83 — the “verify your email” notice bar's button was 289×36 at 360, under the 40px floor, on the path to money for every unverified account.** ⭐ It PASSES at 320 (249×54, the copy wraps to two lines) and
  FAILS at 360 (one line) — the opposite of the usual direction. **A text-length defect is worst where the text just fits**, so a sweep that only tests the narrowest width misses it. Found by session asheib-b1 in the
  population D78 named, re-measured here before being acted on. Fixed with `min-h-[var(--h-control-md)]`, matching the sibling it shares a row with.
- 🔵 **D79 + D80 — two more controls under the 40px reach floor, both found by MEASURING rather than reading a class.** D79: the `/markets` sort control is 27×44 drawn, **33×51 reach** at 320, because
  `menu-shell.tsx` guards `min-h-[44px]` and globals.css hides its value label under 640, so the WIDTH collapses — D78's shape one control along. D80: the `/profile` KYC pill is 113×23 drawn, **163×38 reach**,
  a `Pill` inside a `Link` that contributed no box. D80 live (`5b3c6cf1`); D79 took THREE placements and is live at `be4fb670`.
  ⛔ **D79's first two fixes SHIPPED AND DID NOTHING, and the lesson is bigger than the control.** A utility in a component's base class string is a DEFAULT — `cn()` is tailwind-merge and the CALLER's `min-w-0` deleted it. Then a plain
  rule in `globals.css` whose selector verifiably MATCHED still lost, because `.min-w-0` is in `@layer utilities` and **a cascade layer outranks specificity outright**. ⚠️ And the pre-flight that blessed both used `!important`, so it
  proved the GEOMETRY was safe and proved nothing about whether the mechanism would win. **A pre-flight must exercise the mechanism it stands in for.**
  ⚠️ **THE SWEEP THAT FOUND THEM HAD TO BE FIXED FIRST:** `document.elementFromPoint` returns NULL outside the viewport, so a reach probe on a control near the screen edge is stopped by the boundary rather than by the
  end of its hit area. It reported `.mcardp-share` as 49×35 and `.mcardp-details` as 72×35; scrolled to centre they are **49×49 and 72×49**. Four defects nearly filed that do not exist.
- 🔵 **D78 — the balance-hide eye reached 35×55px against the 40px floor, SIGNED IN, and every tap gate was blind to it.** `test:tap-target` §6 exists for this exact control — it was written when the eye shipped `h-[42px]`
  inside a 44px capsule — but its regex only matches HEIGHT, so `w-[32px] sm:w-[36px]` sat 8px under `--tap-min` unchallenged. ⭐ The finding worth keeping is the POPULATION: §3 reads a vocabulary of JSX tags and `CashEye` is a
  kit component; `qa:tap-truth` and `qa:tap-hit` measure real boxes but run SIGNED OUT. **The whole signed-in header is outside every tap gate's population.** Fixed live (`3d644e4e`) with `w-[var(--tap-min)]`, pre-flighted against
  production first because this header collapses a spacer to 5px at 320 — injected `width:40px` gave reach 43 and `body.scrollWidth` unchanged at both widths. §6 now watches both axes, RED-proven.
- D14: pull-to-refresh (`pull-to-refresh.tsx:31-35`) ignores touches that start inside `[role="dialog"]`, `.kp-fsheet`, `.cm-panel`, horizontal scrollers or
  the dial. It is disabled while `html[data-sheet-open]`. `overscroll-behavior-y: contain` on the body stops Chrome's native reload from firing as well.
- D25:
  - Tailwind `future: { hoverOnlyWhenSupported: true }` (desktop unchanged: mouse zero-diff at 1280);
  - ungated CSS `:hover` blocks are wrapped in `@media (hover: hover)`: `.btn:hover` lift, `.btn-yes/no/primary:hover` brightness,
    `.kp-qrow:hover` padding reflow, `.kp-rail__item:hover`, the `motion.css` raise hovers.
- D15: a global `scroll-padding-top: calc(var(--header-h) + env(safe-area-inset-top) + 8px)`; pages with the discovery bar add its height.
  - ⛔ **Examined in the safe-fix lane on 2026-09-16 and deliberately NOT shipped: it depends on U23.** `--header-h` does not exist yet (the header
    offset is the literal `top-[56px]`), so the only fix available today is a hand-typed number — a second home for the header height, which is
    what §0d forbids and what U23 exists to remove. **Do U23 first, then this is one declaration.**
  - 🔎 **Re-measured while deciding, and the defect is narrower than its register line says.** `HashFocus` (`hash-focus.tsx`, mounted at
    `markets/[id]/page.tsx:414`) scrolls a fragment target with `block: "center"`, so a FRESH load of `…#discussion` is centred and clears the
    header. The overlap is on the **soft-navigation** path: the order links (`comments-thread.tsx:251`) change the query on the same route, the
    `[]` effect does not re-run, and the browser lands the section flush under the sticky header. So the driver must test the ORDER LINKS, not a
    cold load — a cold load passes vacuously. ⚠️ And `scroll-padding` also applies to `scrollIntoView`, so check the centred case did not shift.
- D16: first **measure** back navigation (`/markets` → detail → back at 360: scroll lands within ±40px of where it was). Change `ScrollRestore` only if it
  fails (remove it and let Next restore, or switch to manual).
- Guards (phone emulation):
  - a pull gesture inside the open filter sheet at scroll 0 sends no refresh request;
  - after a tap on a card button, computed `transform`/`filter` equal rest;
  - the `#discussion` target top is ≥ the header bottom;
  - the back-nav landing is within ±40px.
  RED per item.

**U28 · [General] Low-end performance and motion tiers (D17)**
- 🔴 **D59 — the header and hero fade to opacity 0 and re-rise 2.8 seconds AFTER the page was already readable, and CLS cannot see it.** [the record](MOBILE-VISUAL-UNSEEN-2026-09.md).
  Timeline on slow 4G + CPU 4×, clean run: FCP t=9416; the hero column FULLY readable at **t=9761** (all five `.kp-hero__inner > *` at opacity 1); `.js` flips at **t=12539** — topbar and all five
  children to 0, hero child y 121.8 → 129.6. **Gap readable → flip = 2,778 ms.** No frame renders for the next 132 ms; fully back at t=13077, so the visible event is **406 ms**.
  ⭐ **The cause is a correct fix creating a second case.** `globals.css:5257` adds `.js` from JavaScript so a load where the bundle never arrives still shows everything — that protects the NO-JS case
  and creates the SLOW-JS case, because `kp-rise`/`kp-fade` carry `both` fill and so replay from their invisible first frame whenever `.js` lands after paint.
  **Fix, and it has a natural home here:** this unit already plans a tiny pre-paint inline script to resolve the motion tier (`data-motion` only appears at t=12190, also after paint). `.js` belongs in
  that same script. ⛔ Do not delete the no-JS protection — move WHEN it is applied, not whether. RED: set `.js` from the bundle again and the flash returns.
- Measured in code:
  - `theme-provider.tsx:22-44` sets `data-motion="reduced"` for ≤ 4 cores, ≤ 4 GB or Save-Data (most Tanzanian budget phones), **after hydration**.
  - The reduced tier stops ticker and pulses but keeps every `backdrop-filter` (modal scrim 7px, menus `blur-md`, chat 16px, Needle drawer) and the `live-dot` breathe.
  - The win count-up still runs in the reduced tier.
  - D17: `feedback-settings.tsx:40` writes `"full"` when reduce-motion is turned off.
  - `.route-enter` keeps its transform (`both` fill, `globals.css:2478`).
- Changes:
  - the motion tier is resolved **before first paint** by a tiny inline script (`hardwareConcurrency`, `deviceMemory`, `saveData`), with the same no-flash pattern as `kp-density`;
  - the reduced tier also drops `backdrop-filter` (solid scrim token at higher alpha) and the `live-dot` breathe;
  - D17: "off" returns to the device default, not `"full"`;
  - route entrance per §8b (no retained transform), and the filter-sheet workaround (`globals.css:3300-3301`) is removed once proven unneeded;
  - win count-up snaps in the reduced tier.
- Budgets at 360×780, CPU 4×, `Emulation.setHardwareConcurrencyOverride {4}` (so the reduced tier engages), slow 4G:
  - scripted scroll of `/markets` and home: median frame ≤ **20ms** (≥ 50fps), no long task > 200ms while scrolling;
  - YES tap → dial visible (INP) ≤ **200ms**;
  - LCP ≤ **2.5s**.
- Guard: extend `scripts/perf-smoke.mjs` (it already throttles CPU and network) with `layout-shift`, `longtask`, Event Timing and rAF frame times. RED:
  re-enable blur in the reduced tier and watch the frame budget fail.

**U29 · [General] Browser compatibility floor**
- Measured:
  - every colour is a raw `oklch()` token, and every Tailwind colour class is `color-mix(in oklab, …)` (`tailwind.config.ts:39`);
  - there is **no `@supports` anywhere and no browserslist**;
  - Chrome/WebView < 111, Samsung Internet < 21, Opera Mini and KaiOS would render near-unstyled;
  - the real signed-in sample (§3) shows only current engines, but guests are unmeasured.
- Steps:
  1. **Data.** GA4 Explore: Browser, Browser version, OS version and Screen resolution; Country = Tanzania, Device = mobile, last 28 days (Ali pulls it
     or grants read access). The AuditLog user-agent query (§0 trap) is committed as a script and re-run monthly. Record both in §3.
  2. **Owner decision with those numbers:**
     - **A**: document the floor (Chrome/WebView ≥ 111, Safari ≥ 16.4, Samsung Internet ≥ 21) and add a pre-paint `CSS.supports("color", "oklch(0 0 0)")` check that
       shows a plain, inline-hex "please update your browser" notice when unsupported;
     - **B**: A plus a generated sRGB fallback layer (`@supports not (color: oklch(0 0 0))` with hex token values computed at build time from the oklch
       tokens). Recommended if ≥ 1% of Tanzanian mobile traffic is below the floor.
  3. Add `browserslist` in `package.json` matching the floor, so autoprefixer targets it.
  4. In-app browsers (WhatsApp, Instagram, Facebook), the installed PWA and the planned Capacitor WebView are checked in U30.
- Guard: A: the notice renders when `CSS.supports` is forced false. B: a build test that every `oklch()` token has a generated fallback and the fallback
  page passes contrast AA. RED control for each.

**U41 · [General] /fairness on a phone (D60 · D61)**
- 🔴 **The route was never once captured by this programme, and it is the page the footer's `Uthibitisho wa utatuzi` link sends players to.** [the record](MOBILE-VISUAL-UNSEEN-2026-09.md).
- **D60 — the SOURCE (CHANZO) column, which is the page's entire purpose, starts 157px outside its own scroller with no at-rest affordance.** At 360×780 sw the scroller is `clientWidth 326` against
  `scrollWidth 559`, so **41.7% of the table is off-screen**; at 320 it is **48.8%** and the link sits 197.1px past the edge; at 412 it is still 32.4%. All 12 `Chanzo` anchors are at x=501.1 against
  an x=344 edge. The `srcHref` values are real (wikipedia.org, premierleague.com, accuweather.com) — a player who suspects a resolution simply cannot reach the proof.
- **D61 — every market title is clamped to 2 of up to 16 lines in a column that never grows.** The title box is **91.8px at 320, 360 AND 412** — width-invariant, because the five columns' content
  minimums (127.8 + 99.1 + 83.8 + 157.4 + 90.6 = 558.7) beat `.admin-tbl { width: 100% }`. So a 103-character Swahili question paints as 14 characters, and **two different markets — one YES, one on a
  different competition — paint identical rows.** The title is still a link, so the row is navigable; you just have to tap blind.
- **Fix (one change closes both):** on a phone the attestation table stops being a five-column table and each row becomes a stacked card — market, outcome, officers, time, source. ⛔ Raising the clamp
  alone does not work, because the column never grows. At minimum the scroller needs a visible at-rest affordance and SOURCE must move to the second column.
- **Guard:** at 320/360 sw, every row's source link must be inside the scroller's client box at `scrollLeft = 0`, and no two rows may paint identical title text. RED: restore the table layout.
- ✅ **CLOSED 2026-09-24 — that accept line is now `npm run qa:fairness-phone`, and it runs 320/360/412.** Measured on production: **0 of 12** source links outside the scroller (was 12 of 12, at x=501 against an x=344 edge),
  **0 rows** painting identical titles, and the table no longer scrolls sideways at all — `clientWidth == scrollWidth` at every width (286/286, 326/326, 378/378), where it was 326 against **559**.
  ⭐ `RED_TABLE` serves the five-column layout back and reproduces THIS UNIT'S OWN RECORDED NUMBERS to the percentage point: **49% / 42% / 32%** off-screen and all 12 links outside. A control that lands on the figure the
  defect was filed with is the strongest form available.
  ⚠️ **HONEST LIMIT:** the identical-titles assertion is DATA-DEPENDENT and did NOT fire under RED — today's twelve markets clamp to distinguishable text even in the old layout. It is kept because it is the defect that
  mattered most (two markets painting the same row is worse than a table that scrolls), but a green run of it is evidence about THIS board, not about the layout.

**U42 · [General] The sign-up funnel on a phone (D69)**
- 🔴 **Six `/auth/*` routes — register, otp, forgot-password, reset-password, verify-email, 2fa — are never named anywhere in this plan, and all six serve 200 to a guest.** They are the only way a new
  player joins. Examined 2026-09-23 at 320 and 360 in sw: **zero horizontal overflow on all six**, which is the good news.
- **D69 — `/auth/register`'s date-of-birth inputs carry the English accessible names `Day`, `Month`, `Year` on a page served `lang="sw"`.** ⚠️ It is not a missing translation but a **hardcoded
  constant** — the verifier showed the same three words with the locale set to sw at both widths. A Swahili player using TalkBack hears the whole form in Swahili and then three English words at the
  one field that decides whether they are allowed an account. Same class as D39 (a raw enum surviving into SW copy), on a surface nobody had opened.
- **Fix:** route the three names through the dictionary like every other label; `test:i18n` parity then covers them.
- ⚠️ **What this unit CANNOT close from here:** the funnel's real test is a keyboard over every field on a real device (U30). The seven routes below are measured signed-out and at rest only;
  nothing here says the funnel WORKS, only that it does not overflow and that it speaks Swahili.
- 🔴 **STALE TRUTH CORRECTED 2026-09-24 — this line used to read “signing in is impossible from this machine (§11)”, AND IT IS NOT.** A QA player signs in fine: `loginOnce(b, "mobile01")` from
  `scripts/live/harness.mjs`, one sign-in and one saved storage state for a whole matrix. It was used this session to measure the signed-in header, `/profile`, `/wallet`, `/positions` and the
  notice-bar region — which is where **D78, D80 and D83** were found. ⛔ A sentence saying a thing CANNOT be done is the most expensive kind of stale truth: nobody re-tests it, and every defect behind
  it stays unmeasured. Two traps make it LOOK impossible, both real: `harness.mjs` has its own `BASE` defaulting to `http://localhost:3001`, so without `LIVE_BASE` it signs in against a server that is
  not running and the error reads exactly like a bad password; and it is ONE session per account, so `login()` per cell revokes the previous one and trips attempt-limiting mid-matrix.
- ✅ **CLOSED 2026-09-24 — `npm run qa:signup-funnel`, at 320 and 360 in Swahili, over SEVEN routes** (the six named above plus `/auth/login`). §1: every route answers 200, is served `lang="sw"`, and
  **none can be scrolled sideways**. §2 (D69): the date-of-birth fields announce `["Siku","Mwezi","Mwaka"]` at both widths.
  ⛔ **§1 DOES NOT READ `documentElement.scrollWidth`, WHICH ON THIS SITE CAN NEVER FIRE** — it stays pinned at the viewport width with a far wider element in the body. `body.scrollWidth` moves, but it
  also moves for content clipped inside a scroller, so it over-reports (332 at a 320 viewport on `/markets`, where nothing is reachable sideways). The honest test is whether the page CAN MOVE: scroll it
  and read `scrollX`.
  ⭐ **§2 ASSERTS THE ACCESSIBLE NAME, NOT THE VISIBLE TEXT.** The segments paint digits; the English was audible only. No screenshot could have found D69 and none can verify it.
  ⚠️ **AND `RED_WIDE` FAILED AT FIRST, WHICH IS THE HARNESS WORKING.** It appended a 600px div to the form and changed nothing — the auth card is a constrained column, so a wide child is clipped and the
  PAGE never gains anything to scroll. The guard reported BROKEN HARNESS and refused to certify. The control now sets `body { min-width: 600px }` and fails all 14 route×width cells; `RED_ARIA` sets the
  three names back to English and fails both widths.

**U30 · Real-device and accessibility pass (the checks no emulator can do)**
- **Where:** Ali's Android phone plus one budget Android (≤ 4 GB; Tecno/Infinix/itel class), over `chrome://inspect` remote debugging. Run a 30-minute
  checklist at the end of every phase and in full at the Seal:
  1. the keyboard over every form (login, register, OTP, deposit, withdraw, stake, comment, search);
  2. system text size at the largest setting;
  3. a TalkBack pass: board → card → detail → bet confirm (cancel) → a question sheet → close;
  4. WhatsApp in-app browser opening a shared market link (sign-in persists, primer suppressed, `?side=` honoured);
  5. the installed PWA (status bar, notch, back button closes sheets; notes for the Capacitor plan);
  6. rotation on `/markets` with a sheet open — **and D54 with it, which is the one item on this list that already has a diagnosis waiting**: photograph the phone
     rail ROTATED on the notched device, with the notch on the left and then on the right, and read whether the first and last rail slots are reachable;
     `layout.tsx` sets `viewportFit: "cover"`, so in landscape `env(safe-area-inset-left/right)` is a real ~44px and `.kp-rail` pads neither. ⛔ Do not try to
     settle D54 with an emulator: Playwright reports every inset as 0, which is exactly why a matrix that already lists Landscape never caught it.
     **The fix, once the photo confirms it:** one `@media (orientation: landscape)` rule giving `.kp-rail`, the page gutter and the bottom-anchored overlays
     `padding-left: env(safe-area-inset-left)` / `padding-right: env(safe-area-inset-right)` — `needle.css:143-144` already does exactly this and is the pattern
     to copy. Guard: the rail's first and last item rects, with the insets forced on via a test stylesheet, must stay inside the safe box. RED: remove the rule;
  7. an Up & Down round with battery saver on (reduced tier).
- **D55 — the install prompt, which no driver in this repo has ever looked at.** Before the Seal, re-shoot `public/screenshots/markets-narrow.png` at
  390×844 **in Swahili on the current build** (the committed one is from 2026-07-09 and shows an English UI, U4's deleted filter block, a five-item rail
  that no longer exists and the pre-U3 card), and set the manifest's `"lang"` to `"sw"` to match the `<html lang>` the product actually serves.
  ⭐ Then make it unable to rot again: a guard asserting the screenshot's last-commit date is NEWER than the last change to `market-card.tsx` or the
  discovery bar, so a redesign that forgets the shot fails instead of shipping. RED: point the guard at the 2026-07-09 file and it must fail.
  ⚠️ Photograph the REAL install dialog on the device while you are here — that is the only way to see what Chrome actually renders from the manifest.
- **Accessibility at phone width:** `scripts/axe-audit.mjs` with `WIDTHS=320,360`, and axe injected into the U11 overlay census with every overlay
  open. Target: **0 serious or critical** issues.
- **Record:** each check is ✅/❌ with a photo or screen recording in `.qa-shots/mobile-visual/U30/<phase>/` and a note in §1. The U22 `interactiveWidget` decision
  and the U24 real 130% check are made here.

### Phase G — From the full element inspection (S0c, 2026-09-16)

Every unit below cites finding ids from [`MOBILE-VISUAL-FINDINGS-2026-09.md`](MOBILE-VISUAL-FINDINGS-2026-09.md). Acceptance is measured
by U1's driver at the §11 matrix unless a unit says otherwise.

**U31 · Verify the inspection backlog (379 items)**
- Usage limits killed the verifiers for S07–S13, so those findings are 🕓: reported, not confirmed. This unit works through them: re-check
  the evidence (live measurement or file:line), then classify each as new · extends · duplicate · intentional · refuted, exactly as the
  verified groups were.
- Order: 🔴/🟠 first (S08 leaderboard/fairness/help, S09 auth, S10 wallet, S11 account, S12 overlays, S13 primitives), then 🟡, then ⚪.
- Every confirmed item gets a defect row and an owning unit in the same commit; refuted ones are marked refuted in the record with the reason.
- Accept: 0 rows left at 🕓 in the findings record; §1 shows the resulting defect rows.

**U32 · [General] Market-card state truth (D29 · D35 · D42)**
- 🔴 **D35 at large text: the POOL FIGURE is the only thing on the card allowed to shrink, and it loses the whole amount.** Production, sw (EN is clean at every width); [the record](MOBILE-VISUAL-UNSEEN-2026-09.md).
  `/markets` 360 @1.3: **12 of 15** pooled cards clip — pool box 76.0px against 85.8px of demand — and the crop reads `TZS 79,…`. At 320 @1.3: **13 of 15**, box 36.0 (worst row 27.4), crop reads
  **`TZS…`** — the currency code alone, the amount entirely gone. Home: 4 of 4 pooled cards.
  ⭐ **The discriminator naming the fix:** `.mcardp-timeleft` measures **192.3px at 360 AND at 320, identical** — the countdown never yields a pixel, because `.mcardp-meta-right` is `flex-shrink: 0`
  (`globals.css:4159`) while the pool span alone carries `min-width: 0; overflow: hidden; text-overflow: ellipsis`. The platform forbids clipping money outright, and this is 13 of 15 cards on the
  main board in the DEFAULT locale. **Fix:** the countdown shares the shrink, or the pool is exempted from it.
- `noPrice` must describe the pool, not the phase: a market with no bets shows no crowd price in **any** state (live, closed, resolved, void).
  Terminal cards show the outcome and an empty bar, never a centred needle; the outcome word takes its own ink (a NO result is never YES-green).
- The meta row protects money first: at 320 SW the pool keeps its width and the countdown or info plate yields.
- 📐 **Re-confirmed live on 2026-09-16 at 360 SW, and the colour half is the worse half.** On `/results`, cards whose outcome is **HAPANA**
  print "TOKEO · HAPANA" in the **YES green**, above a bar that is almost entirely green with the needle hard right — so the losing side's word,
  the winning side's colour and a crowd price that was wrong all sit in one 80px block, and nothing on the card distinguishes a NDIO result from
  a HAPANA one. Three cards in one screen. The outcome word takes its own ink before anything else in this unit.
- 📐 **The same card states its result three times in two different words**: the chip "IMEKAMILIKA", the row "Imekamilika HAPANA", and the footer
  "Imetatuliwa HAPANA". One fact, three statements, two vocabularies — the terminology half belongs to U40, the repetition to this unit: a terminal
  card says its outcome **once**.
- Guard: driver at 320/360 × EN/SW/ZH over a board containing live-empty, closed-empty, resolved-empty and void cards: 0 cards showing a
  percentage with volume 0; 0 ellipsised money nodes. RED: restore the live-gated `noPrice`.
- **D42 — a summary ring with a part nobody named** (three critics; the verifier measured the arcs at 124° / 182° / 49°).
  `OutcomeDonut` draws YES, NO **and void** on the 171-market denominator (`results/page.tsx:319`), and the legend beside it prints only
  "NDIO 59 · HAPANA 88" (`:324-331`) — 147. Twenty-four settled markets are a visible arc named nowhere. Put the third segment in the legend
  with its count, in the neutral ink the arc uses, so the parts add up to the total on screen. Guard: the legend counts sum to the ring's
  denominator on /results in 3 locales. RED: drop the void entry.
- 📐 **D29 was the panel's loudest finding: all six critics reached it independently** — art direction, typography, colour, layout,
  information design and the Swahili reader each reported a HAPANA outcome in the NDIO green. When six lenses converge on one defect, it goes first.
- (low, critics panel) Cold-start cards centre "Bila dau bado" and "Kuwa wa kwanza kutabiri" inside an otherwise flush-left card, so the
  list's left edge appears and disappears card by card. Keep the empty line in the slot the price line uses, aligned the way the price line is.
- (low, critics panel) The predictor facepile's third disc shows "69" (a seeded handle's initials), which reads as "+69 more" beside
  "3 watabiri". Initials that are digits, or any disc that looks like an overflow counter, must not appear in a stack that is counting people.

**U33 · [General] Chrome: one menu recipe, ticker semantics (D30 · D32)**
- ✅ **CLOSED 2026-09-24.** D30 (rail + sort listbox), D66 (a dismiss tap no longer activates what is under the finger), D81 (the language code at 4.12:1 → 5.63:1, failing only on the player's OWN language) and D67 are all live.
  D67: the panel measures its geometry on open and flips anchor when right-anchoring would clip the LEFT edge — then never looks again. ⭐ At 320 **neither anchor fits** (right-anchored left=-64, left-anchored right=+1.75),
  so a binary choice cannot solve it; the panel is now clamped back with a measured translate. Verified on production: **321.8 → 315.8 in a 320 viewport**. Sealed by `qa:focus-and-fit` §7 + `RED_D67`.
- ~~⚠️ **THE ONE CONDITION ON THIS CLOSURE:** D32's last item was a phone PAUSE control for the marquee. The ticker was removed from `app-shell.tsx` on Ali's instruction (`adbc31e7`) and now renders NOWHERE — measured 0~~
  ~~instances of any ticker class on `/`, `/markets` and `/live`. The component and its CSS were kept deliberately so re-siting is one render away, which means `test:dead-css` stays green and nothing will flag them.~~
  ~~⛔ **They are DORMANT, not finished. Re-siting the strip re-opens D32.**~~
  ✅ **RE-OPENED AND CLOSED 2026-09-26 — THE CONDITION IS MET AND VERIFIED LIVE (`2ab8830e`).** Ali asked for the strip back ("it was giving
  nice flavor for the platform") and delegated the call. It returns to the LOBBY only — `/`, `/markets`, `/live`, `/results`
  (`TICKER_ROUTES`, an exact allowlist in `src/lib/markets/ticker.ts`, where the reasons live) — with the pause control D32
  required, tap-to-stop, a stopped strip that is a readable list, and the calm branch on all four motion gates. Production re-measure: see D32 in §8.
  ⚠️ **What the break gate does, and does not do:** the feed is not read for a SIGNED-IN player whose cooling-off or
  self-exclusion timer is running. A self-excluded person is never signed in (every session revoked, sign-in refused), and
  `coolOffAction` signs the player out — so, signed out, they see the lobby like any visitor, strip included, exactly as they
  already see `/results` and the landing's settled strip. The strip is site content, not a §4 "marketing message".
  ❓ **OPEN FOR ALI:** recognising a signed-out person on a break needs a device marker — a new cookie, which is a Privacy
  notice change (his call, as `kp-density` was).
- 🔵 **D81 — the language code fails AA at 4.12:1, and only on the row for the language the player already uses.** EN 4.86:1, ZH 4.86:1, SW 4.12:1, identical foreground: the miss is the SELECTED row's
  tinted background. Handed over as "the topbar pill, 52 of 52 cells" and re-measured — the topbar pill is 12.17:1 and passes; the failing element is the code INSIDE the menu, `text-text-faint`, 11px bold.
  Live (`6a20bd78`) with `--text-subtle` (5.63:1). `--text-muted` measured 9.9:1 and was rejected for promoting a secondary label over the thing it annotates.
- 🔴 **D32 under `prefers-reduced-motion` the ticker does not slow down — it FREEZES showing 24% of one of twelve events.** [the record](MOBILE-VISUAL-UNSEEN-2026-09.md).
  The clipping window is 245×31 at x=115 on a 360 screen: `clientWidth 245` against `scrollWidth 27,449`, **no scrollbar, no touch scroll, and zero buttons or links inside the strip**. `.ticker-track`
  is 27,440.6px holding 24 spans (12 events rendered twice). Entry 1 is 1,045.4px wide, so the readable share is **24.2%** and it reads `TZS 10K completed YES on` — a sum of money and an outcome,
  stopping before it names the market. **11 of the 12 live events are unreachable by any means.** Confirmed frozen twice, at t=6s and t=14s.
  ⛔ Reduced motion should remove the MOVEMENT, not 99% of the content — and it is set by players with vestibular disorders and by anyone who turned motion down on a budget phone.
  **Fix:** under reduced motion the strip becomes a static list or a scrollable region with real affordances, not a frozen marquee. RED: restore the freeze.
- 🔴 **D30 is not closed for the SORT LISTBOX.** At 320×640 with the sort menu open, the panel resolves at **z 20** — its `z-index: 30` is spent inside `.kp-discovery-bar.sticky.z-20`, its only
  positioned ancestor — while the chat bubble sits at **z 60**. Overlap is the bubble's full 52px over x 252–304 of a panel ending at x=320, across y 508–560. A nine-point census per row shows
  **row 4 `Mabadiliko makubwa ↓` losing 2 of 9 taps to the bubble**. ⭐ **This is the same stacking trap D30 already paid for once** — a number on the panel cannot escape its ancestor's context.
- 🟡 **D66 — neither the rail More menu nor the language menu has a scrim, so the tap that dismisses them also fires the control underneath.** Proven with a REAL touch event (CDP
  `Input.dispatchTouchEvent`), not a synthetic mouse click: one tap at (47,469) to dismiss the `Zaidi` panel landed on `a.mcardp-open` and navigated. Neither panel has a visible ✕, so tapping away
  IS the close gesture. The product's own `<Modal>` and `.kp-fsheet` both ship the scrim that absorbs this. **Fix:** give these two the same scrim.
- 🟡 **D67 — the language listbox flips away from the left edge and then overflows the right one by 1.75px**, where `overflow-x: clip` slices its border and squares off one corner while the other
  stays rounded. Caught frame by frame: frame 0 `right-0` (x −26.25), frame 1 onward `left-0` (x 125.75 → 321.75, min-width 196). No text is lost in sw. Small, and recorded as small — but it is the
  control a Swahili-default platform's players use to leave English. **Fix:** clamp the panel to the viewport with a margin instead of choosing an edge.
- One popover recipe for the language menu, the rail More menu, the bar More menu and the avatar menu: one radius, one row inset, one row
  height (44), one selected-row treatment (`--pill-active`, never gilt), one scrim.
- The More menu clears the chat bubble (raise the menu above it or inset the last row); D30's `elementFromPoint` check is the guard.
- Ticker: an accessible name, the duplicated track hidden from assistive tech, and a pause control that works without hover — or it pauses
  whenever `data-motion` is not `full`.
- Guard: driver asserts every menu row ≥ 44px and hit-tests to itself; the ticker exposes one copy and a reachable pause. RED per item.
- ⚖️ **For the phase sign-off, not defects** (critics panel; both deliberate in the code). The gilt dot on the Juu/Chini rail item is the
  product-line mark (`bottom-nav.tsx:147`), but a player reads it as an unread badge that never clears, in the money colour; and "Masoko" is
  lit on the home page because home counts as Markets (`:103`), with no Home item. Show Ali both before Phase C closes.
- 📐 (critics panel) The live ticker is cut hard at the screen edge with no fade, so whatever word is passing the edge is sliced through the
  letter, and nothing says the line continues; a marquee fades at both ends. And the language control reads the ISO code "SW" — clear to a
  developer, less so to a player; decide with the native reader whether it says "Kiswahili" at phone width or keeps the code.

**U34 · [General] Signed-in header cluster (D31)**
- The masked balance fits its reserved box at every balance (TZS 0 → 7 figures); the eye control reaches 40px; the delta flash reserves its
  space instead of resizing the bar (E-190's lesson); the link's accessible name states "balance hidden", never "Hide password".
- Guard: driver at 320/360, signed in as the QA player, across balances 0 / 999,999 / 1,250,000: no header reflow on a delta, no overflow,
  and the accessible name contains neither "password" nor a figure while hidden. RED: restore the mask width.

**U35 · [General] Up & Down truth and fit (D36 · D37 · D45 · D52)**
- A locked round shows one state in one voice (no dead clock beside "closed"); a resolved card shows its own close, never a ticking live price;
  history figures state their scope (this page vs all rounds) and never spill between tiles.
- Also from the record: duration chip clipped at 320, round-page title cut mid-word, custom-stake chip clipped at 360, two designs for one
  countdown pod and one stake row.
- Guard: ~~driver over a full round lifecycle on a seeded local board (open → lock → settle → next) at 320/360 × EN/SW: one state per
  frame, 0 clipped money or duration values~~ — ⛔ **STRUCK 2026-09-24: that is trap 3's own instrument.** A viewport driver cannot see
  WHICH price a server component passed; it is green whenever the seeded board holds no decided round; and it can never reach the
  void-with-null-close case at all. The FIT half (clipping at 320/360 × EN/SW) is still real driver work, and D45/D52 need it. The TRUTH
  half is now two unit guards: `test:updown-clock-guard` §7 (D36) and `test:updown-history-pnl` (D37), each with its own RED control.
- **D45 — the one page off the gutter** (critics panel, measured on 8 surfaces). Up & Down's wrapper is `px-4` (~~`updown/page.tsx:68,86`~~
  → **`:73,91` today — and FOUR wrappers in all, adding `updown/loading.tsx:10`, `updown/history/page.tsx:273`, `history/loading.tsx:6`**) —
  **20px on this scale**, not the 16 it reads as — while every other surface, and Up & Down's own footer, sits on 16. Use the page container
  the rest of the product uses. ⭐ `/updown/[roundId]` AND its `loading.tsx` already agree with each other and already use
  `max-w-board px-3 lg:px-6`, so the width-jump-on-load bug is NOT present here — copy that spelling, or migrate all four to
  `<PageContainer>` and gain `data-measure`, which puts these routes into `responsive-audit.mjs`'s population for the first time.
  Guard: the first content edge is 16px at 320/360/412, the same as /markets. RED: restore `px-4`.
- **D52 — an arrow that ends a line** (critics panel). The settled pod prints `{open} → {close}` as loose text
  (~~`updown-card.tsx:1121`~~ → **`:1146-1148`**), so
  at 360 SW it wraps to "$75,819.68 →" / "$75,824.01". The pair is one unit: keep it on one line, or stack it deliberately with the arrow as a
  connector. ⭐ **D37 SHIPPED THE PRECEDENT on 2026-09-24:** `.amount` sets `white-space: nowrap` at DOUBLED specificity
  (`.amount.amount`, globals.css:1013), so a `whitespace-*` utility LOSES the cascade outright — put `.amount` on each NUMBER and make
  the arrow the wrap point. Guard: the arrow never ends a line box at 320/360 × 3 locales, with a 7-figure price fixture.

**U36 · [General] /live carousel, search and wall (D38 · D47 · D50)**
- The search field survives a miss: the query stays editable, focus and keyboard are kept, and the empty state appears **below** the field.
- The hero reserves its height so the field cannot jump while typing; the carousel pauses on a phone and does not resize the page under a thumb.
- Guard: driver types a query that goes from hits to zero and back, asserting the field keeps focus and value; hero height stable within 8px
  while typing. RED: restore the unmount.
- **D47 — the section that cannot say its own name** (critics panel). `mostContested` is "Lililo na shaka zaidi" (`i18n-dict.ts:3254`), and
  the /live hero truncates it at 360 SW to "LILILO NA SHAKA…" — the head of the phrase is exactly what is cut. Let the label wrap, or give it
  a label that fits (native reader, U40). Guard: no ellipsised label in the /live hero at 320/360 × 3 locales.
- **D50 — a status chip in a value slot** (critics panel). On the /live hero INASOGEA (`tipping`, `:3280`) sits in the needle's value-label
  row, "NDIO 50%  INASOGEA  50% HAPANA", so it reads as naming the needle's position. Chips go with chips, beside the HAI pill; the value row
  holds values. (The verifier did not sustain the critic's stronger claim that the chip was unearned.)
- 📐 (critics panel, taste — information design) /live cards print a price with the pool and the predictor count removed, so a 50/50 from
  one bet and a 50/50 from two hundred look identical on the page built to show what is moving. The sample travels with the price.
- 📐 (critics panel, taste) The live hero carousel has three pagination controls for one set of six slides (arrows, a "1/6" counter and dots).
  One is enough.

**U37 · [General] Detail page copy, reading order and hints (D39 · D40 · D41 · D46)**
- No raw enum reaches a player: the hedge warning and the bet-placed modal use `sideWord`, like the buttons beside them.
- Reading order matches visual order on phones (the aside is not announced last), with the heading it belongs to.
- InfoHint becomes an inline disclosure on phones: a ≥ 40px trigger, text that wraps inside the panel, no hover dependency.
- Guard: accessible-name and DOM-order assertions on the detail page in 3 locales; InfoHint opens and reads fully at 320/360. RED per item.
- **D46 — a date axis that is not a time axis** (critics panel; the verifier measured 153.5px and 153.0px for a two-day and a one-day
  interval). The probability chart spaces points by index — the chart library's native behaviour — under calendar labels, so the slope
  misstates how fast the price moved. Either feed empty points for the missing intervals so time runs linearly, or drop the dates for an
  honest per-prediction axis. Guard: tick spacing is proportional to elapsed time on a fixture with uneven gaps. RED: remove the fill.
- 🔴 **D85 · the comment `Report` and `Delete` buttons were ~15.8px tall** — an 11px glyph beside 10.5px
  mono, in a box whose only height came from the unitless 1.5 body line-height: 24px under Law 9. ⛔ The
  BLINDNESS is the finding — `tap-target.test.mts` skips any interactive tag that declares no height
  ("declares nothing — the rendered half's job") and no rendered gate's population contained the comment
  thread. Fixed with `min-h-[var(--tap-min)]` plus the §L6 negative-margin absorber, so the row does not
  grow; the hole is closed by §5 of `qa:detail-order-hints`, whose population is THE PAGE, not a list.
- 🔴 **D86 · the header `Source` link was ~55×18 in a row with two 40×40 controls.** Same remedy. ⛔ It is
  NOT the criterion's inline URL (that is D88): §5 tells the two apart by rule — a link is exempt only
  when the paragraph it sits in says more than the link does.
- 🟠 **D87 · the probability chart had no heading**, so the page's signature visualisation was absent from
  the outline D40 had just repaired — and §2 could not see it, because a heading-LEVEL check cannot see a
  MISSING heading. The toggle's `<span>` became an `<h2>` with an id, reusing `market.probOverTime` (the
  words already on the button), and the section carries `aria-labelledby`. Nothing moved: preflight resets
  h1–h6 size, weight and margin to inherit.
- 🟠 **D88 · the resolution criterion's source URL is a standalone link at 221×33.** Fixed with the floor
  plus a 4px absorber. ⚠️ **AN OPEN RULING FOR ALI:** §A2 states the floor with two written exemptions and
  says nothing about a link inside a sentence. Either it gains an inline-link exemption, or every
  paragraph link in the product becomes a defect; §5 exempts them by a stated rule meanwhile.
- ⚠️ **D90 (the third stat tile) LEFT THIS UNIT** — reassigned to U39, because the only two honest remedies
  are a 13px/weight-400 rung in `ui/stat.tsx` or an owner ruling on 13.5px/bold, and both are type-ladder
  work. The original bullet is kept below for the measurement it carries.
- (low, critics panel) The detail page's third stat tile (INAISHA, the end date) is a lone full-width box about 8px shorter than the pair above
  it, so the three tiles read as two sizes of one object. Give the three one height, or make the date a line rather than a tile.

**U38 · [General] One money grammar and number rules**
- One money primitive decides: currency placement, thousands grouping, the compaction threshold (and where compaction is allowed at all),
  the sign glyph (U+2212, one position), tabular numerals, and `white-space: nowrap` so a figure never splits between "TZS" and its digits.
- All three formatters (`formatTzs`, `formatTzsSigned`, compact) and every consumer (`Cash`, `Stat money`, `ReceiptRow`, ticker, cards, KPI tiles,
  chart labels) go through it. USD figures on Up & Down get the same grouping rule.
- Guard: a source contract that no player-facing money string bypasses the primitive, plus a driver asserting 0 wrapped or ellipsised money
  nodes at 320/360 × 3 locales with 7-figure fixtures. RED: restore a raw `toLocaleString` at one call site.
- 📐 **The art director's single biggest score driver** (critics panel): money is the least consistently treated element on the phone. The
  same pool reads "TZS 3,000" in muted periwinkle on the board card and "TZS 3K" in white on the detail tile; in card footers money is the
  dimmest text in its row while the countdown is the brightest; and gilt is spent on the settled status pill, the /results pager arrows, the
  crown and the chart's 50% chip while pool figures stay blue. The typography verifier's counterpoint is recorded with it: the hero money figure
  *is* gold, and the slash eyebrow is the sanctioned brand device — so the finding is not "gold has left money", it is "gold is not reserved
  for money". This unit's money primitive decides the money ink; the settled pill and the pager arrows leave gold. ⚠️ `test:gold-is-money`
  passes today over all of this — read what population it checks before relying on it here.

**U39 · [General] Close the type ladder and the icon set**
- Remove the off-ladder literals the inspection counted (9, 9.5 mixed-case, 10.5, 11.5, 12.5, 13.5, 14.5, 15.5 …) by moving each call site onto a rung;
  cap the sizes inside one card at three; put every control glyph on the 16/18/20/24 set.
- `test:type-scale` gains a ratchet that may only shrink, and the icon set becomes a named contract.
- 🟡 **D90 · INHERITED FROM U37, 2026-09-25 — the detail page's third KPI tile is ~7px shorter than the
  pair above it**, so three tiles read as two sizes of one object. The mechanism is computable: the first
  two are the kit `<Stat size="xl">` (value 18px, leading-tight) and the third is a local `KPI` whose mono
  branch paints its value at 13px. The call site's own note already names the only two honest remedies, and
  both are this unit's subject: **add a 13px/weight-400 rung to `ui/stat.tsx`**, or **an owner decision to
  accept 13.5px/bold on a resolution timestamp**. ⛔ A third option (`auto-rows-fr` to equalise the boxes)
  was mapped and rejected: it makes the phone strip ~7px taller on a live surface, and an adversarial check
  found its guard would be blind at ≥640 — the driver loops phone widths only, so a missing `sm:` reset
  would paint a dead ~91.5px row with all nine cells green.
- Guard: the ratchet's count at 0 new off-ladder sizes; driver samples card and chrome type. RED: add one literal.
- 📐 (critics panel) Icons with borrowed meanings: withdraw is an upload arrow, gambling harm is a pause glyph, and the scales stand for three
  different things across the rail, help and legal rows. The three /help contact rows use three plate materials and hues, one of them the YES
  ink. And the monospace voice has spread from labels into running Swahili sentences. The icon contract names each glyph's one meaning.

**U40 · [General] Player copy and terminology (EN/SW/ZH)**
- One word per concept per locale (YES/NDIO/NDIYO, pool/bwawa/dimbwi, live/mubashara/hai, Top vs Leaderboard, Proposals' three names), plurals
  correct at n = 1, no operator jargon in player copy, no English abbreviations left in SW/ZH.
- 📐 **Measured 2026-09-16, now that SW is the default — the NDIO/NDIYO split is not theoretical, it is shipped.** `i18n-dict.ts` says
  `yes: "NDIO"` (`:2715`) and `yesOutcome: "NDIO"` (`:4078`) — the buttons, chips and outcome words — while **NDIYO** is what the product says
  everywhere it explains itself: `howItWorksBody` (`:2753`), `probOverTime` / `probChartAria` (`:3535`, `:3537`), `backYesAria` /
  `backYesAriaNoPrice` (`:3560-3561`), `faq1a` / `faq1aLoser` (`:4301-4302`), `contTodayLead/SoonLead/WeekLead` (`:3267-3269`). So a player
  **hears** a different word from the one they **see**: the accessible name of the NDIO button is "Unga mkono NDIYO". ⛔ Both spellings are
  real Swahili — which is exactly why this needs the native reader to choose, not a find-and-replace.
- 📐 **And the date format is half-translated on one screen.** On a market detail page the chrome prints "27 Oct 2026, 00:00" and "23 Oct, 00:00"
  while the resolution prose four rows below reads "Oktoba 23–25" — English month abbreviations inside Swahili, one card apart, on the
  market detail page at 360 SW. Every locale's month and date formatting goes through one formatter, chosen with the native reader.
- ⛔ Needs a native SW reader and a native ZH reader before ship; `test:i18n` keeps EN/SW/ZH in parity.
- Guard: a source contract that the terms map to one key per concept, plus the parity test. RED: reintroduce a second spelling.
- **D53 — two grammar slips in the responsible-gambling line** (critics panel, verified). `stopGambling` (`i18n-dict.ts:4326`) reads "Kama
  kucheza kamari imekuwa sio burudani, acha." — the ku- infinitive subject takes "kumekuwa", and the negative before a noun is "si".
  ⛔ Compliance text in every page footer: the native reader writes it and Ali approves it; a session does not. Guard: the approved string is
  pinned by the responsible-gambling copy contract. RED: restore the old line.
- 📐 **The critics panel's Swahili list, each seen at 360 SW** — every item is either one-word-per-concept or English left inside Swahili:
  the chart range control reads "1W / 1M / ALL"; resolution criteria date "Novemba 30, 2026" in American order; the featured result card carries
  an English "SPORTS" chip; one Up & Down round is a "mechi" (a football match) in one panel and a "raundi" in the next; two different phrases for
  "play responsibly" share a screen; "siku 1 zimebaki" puts a plural verb on one day; the tier badges show English initials S and B beside the
  Swahili tier name, and the sort reads "ROI"; the prize pool is "bwawa" (a pond or swimming pool); one card says "none yet" two ways ("Bila dau
  bado" / "Hakuna bwawa bado"); phone numbers are grouped two ways on consecutive lines; and "Hakuna kete. Imani tu." lands as a statement of
  faith rather than of judgement. The native reader decides each one; none is a find-and-replace.

---

## §10 — Session order (two units per session)

| Session | Units | Why this order |
|---|---|---|
| S0 ✅ | this plan + rulings | the record every later session starts from |
| S1 | U1 + U2 | measure and make reversible first |
| S2 | U3 + U4 | the two biggest density wins |
| S3 | U5 + U6 | header, rhythm, home |
| S4 | U7 + U8 | chat bubble, countdown, guest order |
| S5 | U9 + U10 | defects |
| S6 | U11 | overlay census (a full session) |
| S7 | U12 + U13 | modal primitive, then its heaviest consumers |
| S8 | U14 + U15 | celebration, toasts |
| S9 | U16 + U17 | notices, notifications |
| S10 | U18 | page shells, primer, detail pages |
| S11 | U19 + U20 | Live, Help, auth forms, footer, copy |
| S12 | U21 + U22 | short screens, landscape, keyboard |
| S13 | U23 + U24 | safe areas, large system text |
| S14 | U25 + U26 | skeletons, empty/error/offline states |
| S15 | U27 + U28 | touch, low-end performance and motion tiers |
| S16 | U29 + U30 | browser floor (owner decision with data), real devices + accessibility |
| S17 | U31 | verify the backlog first: later units may change once those 379 items are judged |
| S18 | U32 + U33 | card state truth, chrome menus and ticker |
| S19 | U34 + U35 | signed-in header, Up & Down truth and fit |
| S20 | U36 + U37 | /live search, detail copy, reading order and hints |
| S21 | U38 + U39 | one money grammar, close the type ladder |
| S22 | U40 | copy and terminology (with native readers) |
| Seal | — | full production re-measure (every width × locale × density × condition in §11), the seven lenses re-scored from those measurements (§1), the full U30 checklist, §1a closure |

**Phase-end gates:**
- **Owner visual sign-off (§8a):** a contact sheet for Ali after S3 (Phase B), S5 (C), S11 (D + E) and S16 (F).
- **Real-device checklist (U30):** at the same points.
- **Parallel owner work:** the GA4 browser data for U29 can be pulled at any time and is not tied to S16.

U7–U10 don't depend on the density switch and may move earlier if Ali wants the chat overlap or defects sooner.

## §11 — Verification

**Every commit:**
1. RED first: the new guard fails on the unfixed tree, then the fix, then it passes.
2. Static gates **twice**:
   - In `predeploy`: `test:design-frozen`, `test:bridge`, `test:filter-language`, `test:contrast`, `test:ui-consistency`,
     `test:tokens`, `test:board-discovery`, `test:discovery-contract`, `test:betting-ink`, `test:hero-contract`, `test:stacking`, `test:motion-ladder`,
     `test:revoked-deadend`, `test:i18n` (+ `qa:live`).
   - By hand when touched: `test:tap-target`, `test:card-share`, `test:type-scale`, `red:filter-language`, `test:popup-fit`,
     `test:presence-class`, `test:wallet-reach`, `test:measure`, `test:docs`, `test:design-one-door`, `test:tracker-hygiene`, `test:integrity`.
   - **Always, at the start and the end of a session:** `test:mobile-visual-plan` (the tracker guard). Its RED control
     `red:mobile-visual-plan` is re-run whenever the guard or the board's shape changes.
   - Plus `test:all` compared against a clean `main` (`test:responsive` is already red with 81 pre-existing failures; compare counts).
3. Local drive on `next dev` after `rm -rf .next/dev`: the unit's driver at 320/360/412/768/1280 × EN/SW/ZH × both densities, including the zero-diff control.
4. **Look at the shots** at 360 EN, 360 SW and 412 EN. A green number is not proof.
5. Docs in the same commit:
   - this file's §0 rewritten, its §1 row and its §2 entry;
   - a `LIVE-QA-CAMPAIGN.md` §6 register row (from **E-414**) and a §6b RESUME AT pointer to this §0;
   - the `NEXT-PLAN.md` board status;
   - DESIGN_AUTHORITY or PLAN-OF-RECORD if a ruling or law is touched.
6. `git branch --show-current`, stage by name, commit, `git push origin HEAD:main`.
7. Production: deploy SUCCESS + `/api/health` ok, re-run the driver against `https://www.50pick.tz` (signed out and as the QA player), read the shots.
   Only then ✅.

✅ **THE FOUR ROWS THAT HAD NEVER RUN, RAN ON 2026-09-23 — and they were where the defects were.**
Every figure this campaign held through S3 was taken PORTRAIT, at 320/360/412, on a settled page,
signed out; Landscape, Keyboard-proxy, Large-text and Slow-network were DEFINED and had never been
executed once. A matrix quoted as coverage while half its rows have never run is the same shape of
untruth this plan exists to remove. Those four were driven on production, together with three
conditions that had no row at all — **overlays opened**, **keyboard focus**, and **the routes nobody
had captured** — one examiner each, every claim then re-measured by an adversarial verifier.
**39 claims, 23 confirmed, 16 refuted; D56–D70 and U41–U42 come from that pass**, and the full record
with every number is [`MOBILE-VISUAL-UNSEEN-2026-09.md`](MOBILE-VISUAL-UNSEEN-2026-09.md).
⛔ **The refuted sixteen are kept WITH THEIR REASONS** in §2 of that record. Re-discovering a
non-defect every few sessions is the most expensive thing a campaign like this can do.
⚠️ **The real-device row has still never been run** — that is U30 and cannot be emulated at all;
D54 is the proof of it, a landscape defect no driver here can see. 🔴 **THIS LINE USED TO SAY THE SIGNED-IN
HALF HAD NEVER BEEN RUN EITHER, "because the QA player's password is not on this machine". That is FALSE —
see the corrected paragraph below. The signed-in half ran on 2026-09-24 and produced D78, D80 and D83.**
✅ **MEASURED 2026-09-23 — the 561–767px band, which this repo records as never measured.**
`globals.css`'s own proof-rail note says "the §A6 matrix is 360/768/1280/1920 — 561–767 is never
measured", and records a real defect that hid there (the gilt pool figure wrapping at its own
space from 561 up). It matters doubly now because **U6's phone rules end at exactly 560.98**, so
561 is the seam where the tile layout flips from the U6 grid back to the shared flex row. Driven
on production at 540/560/561/600/680/767/768 on the home page, and at 561/640/767 × sw/en on
`/markets`, `/results` and `/updown`: **document overflow false everywhere, no money figure
wrapped, no topic name cut, no glyph orphaned, and all three proof figures on one line each**. The
seam behaves: at 560 the tiles are the U6 grid at 71.3px, at 561 the flex row at 74px, and nothing
is lost crossing it.
⛔ TWO INSTRUMENT LIES WERE CAUGHT DOING THIS, both of which would have filed a defect that is not
there. (1) `range.selectNodeContents(el).getClientRects().length` counted the 8px live pip — a
child ELEMENT — as a second LINE, so `.kp-proof__num` read "2 lines" at every width in the band;
the two figures with no pip read 1, which is the discriminator. Count the TEXT NODES' distinct
line-tops. (2) A "runs past the right edge" scan flagged `.ticker-track` at x=27563 — a duplicated
marquee, deliberately wider than the screen inside an `overflow: hidden` parent. DESIGN_AUTHORITY
already records the identical false positive ("67 escapes on /markets that were one animating
ticker"). `document.scrollWidth > clientWidth` stayed FALSE throughout, and that is the number
that means overflow.

✅ **U6 VERIFIED IN BOTH DENSITIES** (production, 2026-09-23, 360 and 320 SW). U6 is a General
unit, so its rules are deliberately ungated and must hold in Comfortable too. They do, exactly:
proof spread 0, pool figures unsplit, no orphaned glyph, no cut name, tiles and question rows
identical to the pixel. The ONLY differences are `total` +204px and `hero` +40px — which is the
card density doing its own job on the three board cards and the hero's featured card, not a U6
rule leaking.

🔴 **CORRECTED 2026-09-24 — THIS PARAGRAPH SAID THE SIGNED-IN HALF WAS NOT VERIFIABLE FROM THIS PC,
AND IT IS. It is kept, struck through, because it is the single most expensive sentence in this plan:**
it sits in the section every session is told to read, and it told each of them not to try.

> ~~`.env.qa.local` exists here but predates the player's minting and carries NO `mobile01` key — checked
> by key NAME, not value — so the password for "QA Mobile 01" is genuinely not on this machine.~~

✅ **A QA PLAYER SIGNS IN FINE.** `scripts/live/harness.mjs:82` declares
`mobile01: { phone: "712000110", secret: "QA_MOBILE01_PASSWORD" }`, and `.env.qa.local` carries exactly
that key. Used all afternoon on 2026-09-24 to measure the signed-in header, `/profile`, `/wallet`,
`/positions`, `/markets` and the notice-bar region — which is where **D78, D80 and D83** were found,
and D83 is a control on the path to a deposit.

⚠️ **TWO TRAPS MAKE IT LOOK IMPOSSIBLE, AND BOTH ARE REAL — they are almost certainly what produced the
struck sentence above.** (1) `harness.mjs` has its OWN `BASE`, defaulting to `http://localhost:3001`, so
without `LIVE_BASE=https://www.50pick.tz` it signs in against a server that is not running and **the
failure reads exactly like a bad password**. (2) It is ONE session per account: `login()` per cell
revokes the previous one and trips attempt-limiting mid-matrix — call `loginOnce` once and reuse the
`storageState`. Neither is a missing credential.

⛔ **THE UNIT THIS DAMAGED MOST IS U11** (the overlay census), because most of its surface list is
signed-in. Anything in this plan that reads "signed out only" as a LIMIT rather than as a description of
what was done should be re-read with that in mind. ⚠️ The signed-in surface is also outside most guards'
population — every tap gate in the repo runs signed out, which is what D78 recorded.

**Test matrix: the device and condition every driver runs**

| Cell | Viewport | Why | Emulation |
|---|---|---|---|
| Small Android | 320×640 | the smallest supported phone, where SW overflows first | `isMobile`, `hasTouch`, DPR 2 |
| Budget Android | 360×640 and 360×780 | the most common class; a short height | + CPU 4×, `hardwareConcurrency` 4 (reduced tier) |
| Mid Android | 390×844, 412×915 | common larger phones (confirm against GA4 screen data, U29) | DPR 2.625 |
| Landscape | 740×360, 780×360, 915×412 | rotation in a browser tab | phone emulation |
| Keyboard proxy | 360×780 → 360×500 after focusing a field | the on-screen keyboard | phone emulation |
| Large text | 360 with `zoom: 1.3`; a 277px cell | Android text size | phone emulation |
| Slow network | 360×780, slow 4G, CPU 4× | skeletons, CLS, LCP | CDP network + CPU |
| Desktop control | 1280×800, mouse | the zero-diff proof | `hasTouch: false` |

Every cell runs in EN/SW/ZH and in Comfortable and Compact; signed out and signed in as the QA player; in full motion and the reduced tier. ⛔ The user
agent always contains `HeadlessChrome` (§0).
The things no emulator can do are U30 on real phones.

**Re-derived by U1 on 2026-09-22** from production (served commit `feca192c`): 219 signed-out pages — 7 cells × SW/EN/ZH — and 96 as the QA player, every page's language, user agent and session read back before a number was kept. The compared numbers are committed as the baseline every later unit diffs against: `scripts/live/baselines/mobile-visual-U1-guest.json` and `…-mobile01.json` (`npm run qa:mobile-visual` with `COMPARE=`).

**Programme acceptance at 360×780** ([Compact] rows in Compact, [General] rows in both densities). "Before" values marked ≈ come from the
2026-09-15 screenshots, and targets come from arithmetic. **U1 re-derives every "before"**; a target that proves unreachable or too easy is changed here
with its reason in §2, never silently.

| Measure | Before | Target |
|---|---|---|
| Market card, live priced | **320–354** (median 320 in SW/EN/ZH; the 354s carry the sparkline band, D49) — U1. Quoted before as 347–354 | ≤ **305px** live priced — **met: 301.5** (U3, measured). ⚠️ *"every state ≥ 45px shorter" is RESTATED per state by U3, 2026-09-23*, because it is arithmetic the §9 rules cannot produce: the deltas are **−52** live+band (353.5 → 301.5), **−48** resolved+band (312 → 264), **−44** cold start (347.44 → 303.44), **−40** live no-band (319.5 → 279.5), **−36** resolved no-band (278 → 242). A card with no sparkline has one child fewer and therefore **one 4px row gap fewer**, so the two no-band shapes cannot reach −45 by spacing at all. Target: **every state ≥ 36px shorter, and ≤ 305 wherever a price is shown** |
| Cards visible while scrolling `/markets` | **1.63** at 360×780 (1.21 at 360×640 and 320×640, 2.03 at 412×915) — U1 | ≈ 1.9 (a true 2.0 needs a card ≤ 280px, more than spacing can give) |
| Pinned chrome `/markets` | **237** = header 56 + discovery bar 116 + rail 65, in every phone cell and language — U1 | ≤ 201px |
| Home length | **EN 10.78 · SW 11.09 · ZH 10.11** screens (320×640: EN 13.37 · SW 14.15) — U1. Re-measured 2026-09-23 after U3/U4: **SW 10.66** (8311px) — the compact card gave back ~0.4 of a screen | ⚠️ **≤ 7.5 / 7.8 IS NOT REACHABLE BY U6's LISTED CHANGES, measured before implementing.** The bands at 360 SW are hero **1837** (22%) · how **970** (12%) · board **2575** (31%) · Up&Down 296 · trust **1468** (18%) · 18+ 93. Reaching 7.8 means cutting **2227px**. What §9 U6 lists delivers about **350**: Closing-soonest 4 rows at 164/143/164/164 → ≤110 (**−195**), the 3 proof figures 47/60/60 stacked → one row (**−110**), hero padding (−24), CTA 56→48 (−8), lede one step (−10); the topic tiles' min-h 64→48 gives **~0** because all seven (91·91·91·91·115·115·74) are already content-bound, not floor-bound. That lands at **~10.2 screens**. ⛔ The only blocks big enough to close a 1900px gap are the **6-card home board (1815px)** and the **trust band (1468px)**, and §4 decision 2 with §6 both forbid removing sections. **The number of cards on the home board was an OWNER decision, and Ali delegated it 2026-09-23.** ⭐ **RULED: 3, and it is LIVE (`2de56fd0`).** Six was a DESKTOP number — the constant's own comment said "two rows of three at desktop" — and nobody had written down what it is on a phone: six rows of ONE, 1815px. The hero already draws `HERO_MARKETS` (5) of its own, so six more put ELEVEN markets in front of a visitor before the trust band, under a banner reading "biggest pool first". Measured like for like on one server (the constant flipped and flipped back, because local and production hold different data): **7957 → 7017px, 10.2 → 9.0 screens**. Re-measured on production: **8311 → 7420px, 10.66 → 9.51 screens**, board 1815 → 925. ⚠️ **The target is therefore RESTATED to ≤ 9.5 screens at 360 SW** — met — with U6's own tightening (~350px) expected to take it to ~9.0. ⛔ 7.5/7.8 stays unreachable and is not carried forward as if it were: closing that gap needs a section removed, which §4 decision 2 and §6 both forbid . ⭐ **U6 LANDED AND SPENT THAT BUDGET** (`de2e9643`): hero padding 48/32 → 32/24 (−64), the lede one rung to 17px (−48), the CTAs to `--h-control-lg` (−16), and the topic tiles from a ragged 74/98/98 to a uniform 71.3 (−40). Measured on ONE local server before → after: **7017 → 6845px, 9.00 → 8.78 screens** at 360 SW; 320 SW 7184 (9.21), 360 EN 6725 (8.62), 360 ZH 6314 (8.09), 412 SW 6645 (8.52). ✅ **THE PRODUCTION RE-MEASURE IS TAKEN** (2026-09-23, after `f52dcb17` landed): **7104px = 9.11 screens at 360 SW**, against 9.51 before U6 — so U6 bought 0.40 of a screen live, and the restated ≤ 9.5 target is MET with margin. Also 320 SW 7417 (11.59), 360 EN 6954 (8.92), 360 ZH 6543 (8.39), 412 SW 6880 (7.71); document overflow 0 at all five. ⚠️ The live figures are HIGHER than local because the two trees hold different markets — production's four Closing-soonest titles are 120-character UEFA questions where local's were short — which is the same difference that made the clamp claim wrong, and is why a home-length number is only ever quoted with the tree it was taken on. ⬛ Two of U6's listed items were measured and NOT taken, with the reasons kept: the Closing-soonest rows were ALREADY at 100px (the ≤560 reflow that bought the −195 had shipped before the target was written, so the row gained a 3-line BOUND rather than a saving), and the topic tiles' `min-h 64 → 48` gives ~0 because every tile is content-bound — while §9's "with the meta inline" was REFUSED outright: `.kp-topic`'s own comment records that layout being tried and failing at 195px, and the tiles here are 140–160 |
| Closing-soonest row | **SW 164 · EN 143 · ZH 121** (median) — U1. Quoted before as ≈ 150 | ≤ 110px |
| Header auth pills | **48** (both pills, every phone cell) — U1 | 40px, both visible at 320 |
| Chat bubble | 52px, covers Details | 44px, never covers while scrolling |
| Countdown panel (≥ 1 day), all widths | **SW 266 · EN/ZH 248**, 8 tiles — U1. Quoted before as ≈ 220 | ≤ 160px, 4 tiles |
| Up & Down card, live round | **447–660**, and the same card moves with the round's state within minutes (U1's noise floor), so it is measured, never diffed. U3 re-measured the guest `open` card on production at 360 SW: **578.25** and 502.97 | ⚠️ **RESTATED by U3, 2026-09-23: ≤ 430 is unreachable by spacing.** The card is 578.25 in `open` with 419px of that in its own content; every gap and pad it owns sums to ~130px, so even zeroing them all leaves it above 430. Measured result: **578.25 → 526.25 (−52)** at 360 SW `open`. The card now carries **`data-phase`** (11 values), so the target is stated and read **per phase**, never against a card in another state. Reaching ≤ 430 needs content decisions (U35's round shape), not this unit |
| `/live` featured card | **SW/EN 371 · ZH 268** (the carousel box, 360×780) — U1. Quoted before as ≈ 460 from a screenshot | ≤ 360px |
| `/help` contact rows | **147** each (three rows) — U1 | ≤ 84px |
| Disclosure rows (`<summary>`) on player surfaces | **20.3px** on /help — half the floor, and ALL NINE collapse to it in landscape because every question then fits one line (2026-09-23). ⛔ The height was an accident of WRAPPING, so a wider screen made every target smaller | ≥ 40px. /help **fixed** (`a7efcb18`, 20.3 → 44, under-40 count 8 → 0). ⚠️ The same shape is unfixed on two more: `markets/[id]/page.tsx:708` and `profile/kyc/page.tsx:546` both put the spacing on the `<details>` and leave the `<summary>` at text height |
| Auth form field width (7 pages) | **262** at 360 (login, register, forgot password), **222** at 320 — U1 | ≥ 277px |
| Footer navigation links | **19** median, **15** smallest — U1 | ≥ 40px |
| Confirmation questions | centred cards | bottom sheets, primary visible at 360×640, safe area respected |
| Overlays (census) | not measured | all "fits"; ≤ 1 blocking overlay at a time; toasts ≤ 2 |
| Defects D1–D41 (register §8) | 41 open | 0 |
| Inspection backlog (findings record) | 379 unverified | 0 left unverified (U31) |
| Card share control | **26 × 37** reach around a 13×13 glyph (measured by hit extent, not the box) — U1 | ≥ 40 × 40px on every card — **met: 41–42 × 40** (U3/D28), and ≥ 8px clear of Details (measured 8.5–9.5), on /markets and /results at 320 and 360 in SW/EN/ZH |
| Cards stating a price with no bets | every resolved/void empty card | 0 in any state |
| Money that wraps or ellipsises (320/360 × 3 locales, 7-figure fixtures) | multiple per surface | 0 |
| Off-ladder type sizes on player surfaces | 8+ literals counted | 0 new; ratchet may only shrink |
| Control glyph sizes | U1 counts **4** distinct icon boxes in the header, discovery bar and rail at 360 (5 at 768+); the 9 was a different count of board chrome | the 16/18/20/24 set |
| Tap floor / overflow / clipped money | holds | still holds in EN/SW/ZH |
| Comfortable and ≥ 640 | — | zero diff against the U1 baseline |
| Landscape 780×360 pinned chrome on `/markets` | **237 of 360** (66%), 0.37 cards visible — U1. Re-measured at 740×360 on production 2026-09-23: **65.8%** on /markets and /results, and **33.6% on every other route** (header 56 + rail 65 of 360) across 16 routes — so landscape costs a THIRD of the screen everywhere, not only on the boards | ≤ 150px |
| Overlays at 740×360 | a sheet's top can be unreachable (D20) | title, close and primary always reachable |
| Keyboard proxy: focused field visible, rail and bubble hidden | not handled | 100% of form fields |
| Large text (zoom 1.3): controls with clipped text | not measured | 0 |
| Money or time clipped at 320 | **EN "Higher or lower than $86,238.01" clipped by 25px** at 320 (5px at 360); SW and ZH wrap instead — U1 | 0 |
| CLS per route (360, CPU 4×, slow 4G) | not measured | ≤ 0.05 |
| Scripted scroll, median frame (CPU 4×, reduced tier) | not measured | ≤ 20ms; no long task > 200ms |
| YES tap → dial (INP) | not measured | ≤ 200ms |
| Hover stuck after a tap | 343 ungated utilities (D25) | 0 on touch; desktop zero-diff |
| Pull-to-refresh inside a sheet | fires (D14) | never |
| 404 designs | 2 (D12) | 1 |
| axe serious/critical at 320/360 with overlays open | not measured | 0 |
| Browser floor | undocumented, no fallback | owner decision A or B shipped with its guard |
| Real-device checklist (U30) | never run | all ✅ at the Seal |
| QA page views counted as traffic | ≈ 25–60 on 2026-09-15 | 0 |

## §12 — Risks

- **Baselines move by design.** Every 360/412 baseline shifts once Compact is the default. Drivers take `--density=comfortable` so new red is told apart from old red.
- **Pins that move** are named in their units (card-share first-match order, tap-rung anchor text, presence-class expression, toast baseline,
  measure anchors, live probes selecting `btn-xl`). Each changes its spec in the same commit; none is silenced.
- **Swahili length**: the Compact Filters trigger loses its label ("Vichujio"), and sort values are long ("Pesa nyingi"). Read 360 SW before accepting U4.
- **`next dev` on this machine** segfaults under sustained Playwright load and bloats `.next/dev`: fresh server per drive, rerun, never trust one run.
- **Sign-in**: one login per QA account; reuse the storage state.
- **Shared production board**: anything minted is named QA and retired, and the commit says what was minted.
- **Chat at rest**: a still 44px bubble can sit over one Details link; hiding while scrolling is Ali's chosen trade-off.
- **Emulation is not a phone.** Keyboard, notch, text scaling, TalkBack and in-app browsers are only proxies in Playwright. U30 on real Android phones is
  the arbiter, and a unit that touches those conditions is not ✅ until U30 has seen it.
- **Hover gating is platform-wide.** `hoverOnlyWhenSupported` changes every `hover:` utility on touch. The 1280 mouse zero-diff control proves desktop is
  untouched before U27 ships.
- **The browser floor is a product decision.** Shipping option A without data could turn away real players, and option B adds build complexity. Hence
  data first, then Ali decides (U29).
- **Motion tier before paint** touches the root layout. Use the same guarded, no-flash pattern as `kp-density`, never a render-blocking script.

---

## §13 — Seven-lens review (S0b, 2026-09-15)

> **Since 2026-09-16 this review has an outside counterpart: §3b**, where six professional critics scored the live product from its
> pictures (5–6.5/10). The lens scores below are this plan's own, by coverage; §3b's are the outside view. The Seal re-runs both.

Ali: *"evaluate your plan as a responsiveness, UI/UX, graphical, video-motion and animations engineer, and as an artist and a compatibility engineer;
if any rating is less than 10/10, push it to 10."*
Plan v1 (S0) was scored honestly. Every gap found now has an owning unit, a guard with a RED control (or a real-device check) and a measured target.
**10/10 here means complete coverage by the plan. The Seal re-scores every lens from measurements, not from this table** (§1).

| Lens | v1 | What v1 missed | Closed by | v2 |
|---|---|---|---|---|
| **Responsiveness engineer** | 7 | only portrait widths; landscape phones (640–1023 wide) outside every rule; short heights; the keyboard; notches; large text; money and sort clipped at 320 | U21 short/landscape gate · U22 keyboard + `dvh`/`svh` · U23 safe areas · U24 min-height controls · D10/D11/D18 · the §11 test matrix | **10** |
| **UI/UX engineer** | 8 | loading ghosts that jump; two 404s; low offline page; heavy empty states; pull-to-refresh inside sheets; sticky hover; anchors under the header; pending width shift; toast-only session limit | U25 CLS-measured skeletons · U26 states · U27 touch · D24 · U11 census now lists pending, lifecycle and account states | **10** |
| **Graphic engineer** | 8 | no single set of phone steps, so each unit would pick its own; inconsistent 404 compositions; no visual before/after review | §8a phone rungs (existing tokens only) · one not-found composition · per-phase contact sheets | **10** |
| **Video-motion engineer** | 5 | nothing measured frames, jank, CLS or tap latency on a budget phone; blur costs on low-end; motion tier set after first paint | U28 frame, long-task, INP and LCP budgets on CPU 4× in the reduced tier · U25 CLS budget · reduced tier drops blur · pre-paint tier | **10** |
| **Animations engineer** | 6 | the new motions (bubble hide/return, keyboard hide, sheets, toast queue, density switch, countdown swap) had no spec; tier behaviour undefined; D17; retained route transform; count-up in reduced | §8b motion spec (tokens, curves, full/reduced/minimal) · `test:motion-ladder` extended · frame reviews · D17 · route entrance fix | **10** |
| **Artist** | 7 | no guardrail against compaction flattening the brand; no rule for type-size count; no owner visual sign-off | §8a aesthetic guardrails (signature moments keep scale, same materials, ≤ 3 type sizes per card, gilt only for money and brand, one composition per job) · owner sign-off per phase | **10** |
| **Compatibility engineer** | 3 | no browser or engine data; oklch/`color-mix` with no fallback; no browserslist; in-app browsers, installed PWA, Capacitor WebView and real devices never considered; QA inflating traffic | real browser data in §3 · U29 floor with owner decision A/B and a guard · `browserslist` · U30 real phones (in-app, PWA, TalkBack, 130% text) · the `HeadlessChrome` rule | **10** |
