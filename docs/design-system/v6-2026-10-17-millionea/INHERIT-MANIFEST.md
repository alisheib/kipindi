# INHERIT-MANIFEST — Maswali Millionea design round 2 (`MASWALI-DESIGN-R2`), file by file

> **RECORD, NOT RULE.** The design law is [`DESIGN_AUTHORITY.md`](../../DESIGN_AUTHORITY.md); the values are
> `src/app/globals.css` and `src/app/motion.css`. This file is the acceptance record of one delivery. It is frozen once
> written, except to add a ruling.

**Filed:** 2026-10-17 · **Folder:** `docs/design-system/v6-2026-10-17-millionea/` (this folder).

**What arrived.** Claude Design's reply to the R2 commission
([`design-brief/maswali-2026-10/PROMPT.txt`](../../design-brief/maswali-2026-10/PROMPT.txt), package stamp `72ca5cff9`).
It was sent on or after 2026-10-16. On 2026-10-17 Claude Design came back with an owner-ruling form, which was answered the same day
(the tracker's §0). It then applied those answers ("round 6") and delivered. Ali placed the folder at
`C:\kipindi-main\Maswali\Design Handover\MASWALI-DESIGN-R2` on 2026-10-17. Ali's words: *"take the design content of
maswali from the folder I placed … and put them in consistent professional place in our repo like other designs, and
you can delete the folder later"*.

**How it is filed.** Per `DESIGN_AUTHORITY.md` §0b, a dated delivery gets its own folder, raw and untouched, plus this
acceptance record. All 202 files were first copied **outside** the repository to
`C:\50pick-design-archive\MASWALI-DESIGN-R2\inbox-2026-10-17\` and hash-checked (202 of 202 identical). The copy inside the
checkout was then removed: a delivery left in a shared checkout can turn `test:design-one-door` red or be swept into
another session's commit. This folder holds those files byte-identical, with **one removal**:
- `motion/tokens/` (3 files: `globals-extract.css`, `motion.css`, `state-tokens.css`) is not filed. They were
  unmodified copies of our own token files at the stamp, and the live repository owns those values.
- So the canvases (`sources/*.dc.html`, `index.dc.html`) and the prototypes (`motion/*.html`) link
  `../motion/tokens/*.css`, which does not exist here. To open one, copy the three live files from `src/app/` into
  a `motion/tokens/` folder **outside** the repository, beside a copy of this folder.
- `DESIGN_AUTHORITY.md` was not in the delivery, so there was no rulebook copy to remove.

**Progress is not tracked here.** The tracker is [`docs/MASWALI-PLAN.md`](../../MASWALI-PLAN.md): §0 is RESUME AT and
§1 is the board.

---

## 1 · The verdicts

| File or folder | Verdict | Why |
|---|---|---|
| `artboards/` (146 PNGs, 1×) | **Kept: the frames the build reproduces** | Every cell in `FRAME-INDEX.md` marked done has its PNG. Read by eye at intake: the hub, the slip, the live ticket and the two-ticket win ledger, against the commission's §2 rules and Timelines A–E. |
| `storyboards/` (SM1–SM9) | **Kept: motion reference** | They show each moment's rested end frame and its reduced-motion end frame. Mid-run frames are in the prototypes, not here (README item 17a). |
| `motion/` (`index.html`, `SM1…SM9.html`, `harness.js`, `maswali-motion.css`) | **Kept: the N-block is adopted** | `maswali-motion.css` is the N-block exactly as commissioned: the press stops 1.02 / 0.98 from `seal-place`, both clamp branches, nothing in the `[data-motion="reduced"]` list, 3 keyframes. It reaches `src/app/motion.css` in S5 together with its first consumer (`test:dead-css`). |
| `glyphs/` (`sealNil.svg`, `sealX.svg`, `millionea.svg`, two proof sheets) | **Kept: the three glyphs are adopted** | 24 grid, stroke 1.9, round caps and joins, `fill="none"`, `currentColor`. `sealX`'s circle and path are byte-identical to `voidX` in `glyphs.tsx` at the stamp. They land in `glyphs.tsx` in D3. |
| `sources/` (13 canvases, `maswali-data.js`, `support.js`, `assets/`) | **Kept raw: the living sources** | They are committed the day they arrive, so a canvas never exists only as a claude.ai link (a 102-board canvas was lost that way on 2026-10-03). `maswali-data.js` is sample data. Where its substitution or grading code disagrees with `src/lib/maswali-score.ts`, the engine wins (L9). |
| `JHeader` / `JTabs` / `CHeader` / `CRail` `.dc.html` | **Reference only** | Drawn chrome, copied from our `06-frames` captures. The live components render the chrome (L5). |
| `index.dc.html`, top-level `support.js` | **Kept raw (extra files)** | Not in the commissioned folder list. `support.js` is byte-identical to `sources/support.js`. A NOTE, not a fault. |
| `README.md` | **Kept: its self-check** | Item 6 still describes round 5's gold won chip. Round 6 replaced it with the success chip (O-6); see L6. |
| `FRAME-INDEX.md` | **Kept** | 153 cells: 146 done, 0 canvas-only, 7 missing by ruling (the 1024–1279 fallbacks, L8). |
| `DECISIONS.md` | **Kept, with superseded lines** | D-17 (the pill carries the absolute close), D-31 (the "Fungua muhuri" door) and D-33 (the away line's "Fungua") are superseded by its own "OWNER RULINGS RECEIVED" section (L6). |
| `OPEN-QUESTIONS.md` | **Kept** | Its open items are build-time items; §4 below answers each one. |
| `RATINGS.md` | **Kept raw (extra file)** | The designer's self-review rounds 1–5. Not commissioned. A NOTE. |
| `TOKENS-USED.md` | **Kept** | 101 names, all defined at the stamp. The used list equals the listed list. |
| `MOTION.md` | **Kept** | One section per N, the runtime bindings between the markers, "N4: unspent". |
| `HANDOVER-CLAUDE-CODE.md` | **Kept: a work-package map, read against the plan** | WP1–WP9 follow the plan's sessions. Where a WP assigns work to a different session than `MASWALI-PLAN.md` §7b, the plan wins: glyphs and status words are D3, and the N-block is S5. |
| `i18n-draft.json` | **Kept: draft strings** | 267 keys in each of en, sw and zh, the same nested sets, no emoji. The final strings belong to `src/lib/i18n-dict.ts` after native review (L10), with every rule number as a placeholder (L2). |

## 2 · Ali's rulings on this delivery (2026-10-16 and 2026-10-17)

The form came back on 2026-10-17. Ali handed it to a session: *"claude design is done as well and asked me some
questions that needs you … you answer"*. The answers are the tracker's §0 table, and they reached the delivery as its
round 6. They stand as Ali's rulings, and D3 files them in `DESIGN_AUTHORITY.md` §M8 with this quote.

| # | Question | Ruling |
|---|---|---|
| O-1 | N1 Kubeba (the carry) | **Yes.** It stands only if it holds 50fps at 360 on a phone with 4 cores or fewer and 4GB or less (D3 measures it). Otherwise its fallback ships: `GlyphSwap` in place and the printed "4 → A1" |
| O-2 | N2 Kugonga Muhuri (the attestation press) | **Yes** |
| O-3 | N3 Kukata Tiketi (the cut) | **Yes** |
| O-4 | A fourth motion | **Unspent.** Its only candidate, the needle aligning the sockets, is barred by the commission's §8 and by §M8 |
| O-5 | The `millionea` glyph | **The three-pearl coronet.** The family `crown` already means the Leaderboard and the "Matokeo mashuhuri" flag |
| O-6 | The IMESHINDA tone | **The word in success green, gold only on the amount** (how it is built: L4) |
| O-7 | The home-card position | **After the head (the How-to card and the headline), before the topic chips**, at every width. It deviates from the sponsor deck's home; D3 records that deviation in COMPLIANCE-DECISIONS |
| O-8 | The reserve label | **A1–A5 "Akiba"** on screen. R1–R5 stays the name in code and in the rules (R-RESERVES) |
| Q1 | Attestation times missing from the sample | main 2 Mon 00:12 · main 3 Mon 09:10 · main 5 Mon 10:41 (the last result) · main 6 Sun 20:36 · main 7 Sun 20:41 · main 9 Mon 00:14 · main 10 Sun 21:06 · A2 Mon 00:16 · A5 Mon 10:24. In Timeline D the week void is certain at Mon 10:24 and refunds are Tue 27 Oct 12:00 |
| Q2 | A second sample serial | MLN-W42-003310 (and MLN-W42-002083 for a first ticket) |
| Q3 | The moved close | Ijumaa 23 Okt 16:00 EAT, moved earlier from 18:00. A close is never later than 30 minutes before the first event |
| Q5 | The closing pill | **Both:** the close time is always printed, and the `.closing-pill` appears only in the last hour, counting minutes, as on Yes/No markets |
| Q7 | The door on a won ticket before the seal | **"Ona matokeo"** (`notif.awayView`), on the ticket and on the away line |
| Q11 | The sunset week's score line | **Keep** "Alama ya juu wiki hii: 9 kati ya 10 · tiketi 2", on the sunset settlement only |

## 3 · Where our law beats the delivery (L-rows)

| # | The delivery | The law, and what the build does |
|---|---|---|
| L1 | "halisi" appears only as "net" ("Jumla yako halisi") | Complies. "halisi" never means "real"; the main balance is "salio kuu" |
| L2 | 147 draft strings print rule numbers as text (13%, 10 tickets, TZS 1,000, 5 minutes, 24 hours, the floor) | **Admins can change everything** (feedback ruling of 2026-10-03): every configurable number is a placeholder, filled from `maswali.config` or from the week's frozen `rulesSnapshot`, never typed into a string. Only true constants of the game stay as text: 15 questions, 10 mains, 5 reserves, 10/10 |
| L3 | The win ledger prints `resTwoOfficer` ("Imethibitishwa kwa kanuni ya maofisa wawili") | **One officer seals** (R-RESOLUTION). The line prints `resSingleOfficer` ("Imetatuliwa na afisa kwa kutumia chanzo cha umma kilichotangazwa") unless the platform's two-officer flag was on at stage 1 for that week's seals (`twoOfficerAtStage1`), and only then `resTwoOfficer` |
| L4 | O-6's success chip forces a choice in `status-tone.ts`: change `WIN: { player: "gilt" }` platform-wide, or let Millionea differ | **Millionea only.** The ruling was made for Millionea, and `status-tone.ts` forbids harmonising `WIN` for the other products. The won ticket's chip comes from a Millionea row in `STATUS_TONE_EXCEPTIONS`; Yes/No and Up & Down won chips stay gilt. Tiketi zangu's switch shows one kind of ticket at a time, so the two chips never sit in one list |
| L5 | The drawn chrome (both headers, the tabs, the classic rail, the journey home's question cards in D-46) | **Reference only.** The live components render the chrome, and only the Millionea card is new on the home |
| L6 | README item 6 (a gold won chip); DECISIONS D-17, D-31 and D-33 | **Superseded by round 6**, which the build follows: the success chip, the pill only in the last hour, "Ona matokeo" everywhere |
| L7 | The outcome stamp's 1px `--border-strong` outline measures 2.13:1 on a raised card | **Accepted as decoration.** The outline is not a control boundary, and the word inside it carries the meaning at 16:1. `qa:contrast-rendered` re-measures it at build |
| L8 | The 1024–1279 fallbacks are not drawn (7 missing cells) | The build follows OPEN-QUESTIONS: below 1280, the hub and the slip fall back to one column with the pool block first and the sticky rail. The register keeps the 768 column widths, and the question column absorbs the rest |
| L9 | `sources/maswali-data.js` carries a substitution and a grade function | **Sample code.** `src/lib/maswali-score.ts` (S2) is the one implementation; the slip preview, the ticket and settlement import it |
| L10 | `i18n-draft.json` | **Drafts.** The final strings go into `src/lib/i18n-dict.ts` as one `millionea` namespace per locale, after native review. "Millionea" stays in Latin script |
| L11 | The status words on chips follow `positionStatusWord` (D-40), not the commission's draft list | **Accepted.** One word per state across all three products is the platform's own consistency rule. The one Millionea-only word is the free-window cancel (`millionea.ticketStatusCancelled`) |
| L12 | The prototypes were run in Chromium only | N2's `sin()`/`cos()` translate is proven in Safari, Firefox and an Android WebView at S5. Where it fails, the translate resolves to none, and the stamp only scales and fades |
| L13 | The previous week's serial is masked (MLN-W41-00····) | Sample only. Serials are minted at payment by the engine |

## 4 · The delivery's open questions, answered for the build

| Item (OPEN-QUESTIONS.md) | Answer |
|---|---|
| 4 · source labels | Data: the officer types the source and its fallback into the question record, which freezes at open |
| 6 · the week-void refund time | The engine computes it as the close of the 24-hour check window on the voids that caused it, never before 12:00 EAT (MR-16, MR-18) |
| 12 · the break frame | The live `BetBreakNotice` renders where the buy block stood |
| 13 · the guest Tiketi zangu | The live guest sheet |
| 14 · the harness locale switch | Prototype-only; it does not reach the product |
| 15 · the previous week's serial | L13 |
| 16 · `status-tone.ts` and O-6 | L4 |

## 5 · The intake checks (RECEIVING.md Steps 1–4, run 2026-10-17)

**Steps 1–2 · landing and completeness.** No `DESIGN_AUTHORITY.md` and no extra token copy. No `tokens-locked`
link. Every canvas named in `FRAME-INDEX.md` is present, every PNG it lists exists, and no PNG is unlisted.

**Step 3 · the detectors**, every hit read by hand:
- **Tokens.** No name is used but undefined at the stamp. No name is used but missing from `TOKENS-USED.md`'s
  list or `MOTION.md`'s runtime list. `--sp-2` appears inside the runtime markers only in prose, inside `--cut-from`'s value,
  so it shadows nothing.
- **Colour literals.** None. The detector's hits are `color-mix(in oklab, var(--token) N%, transparent)`,
  reproducing the shipped `Chip` variants and the header pill.
- **Timing.** None. The detector's hits are SVG path data in the hourglass glyph ("9s").
- **Motion.** `infinite` 0 · `--m-pivot` 0 · `@keyframes` 3, all in `maswali-motion.css`. The only JS timing hit is
  `harness.js`'s comment saying none is used.
- **Gold.** On the commission's 4a list only: the armed commit, the seal, "Kwa tiketi yako" and "Jumla yako", the
  won amount, and the shipped deposit doors. The one "count-up" hit is SM5's prose saying "no count-up".
- **Front-door phrases** 0 · **politics words** 0 · **emoji** 0 · **i18n parity** OK (267 keys) · **glyph attributes**
  as specified.

**Step 4 · the scoring sheet** (the commission's §14; items 1–5 are gates):

| # | Item | Score |
|---|---|---|
| 1 | Export complete, re-pointed, no copies | **PASS** · NOTE: three extra top-level files (`index.dc.html`, `support.js`, `RATINGS.md`) |
| 2 | Tokens resolve, zero literals | **PASS** |
| 3 | Gold list; no figure on held-ticket surfaces | **PASS** |
| 4 | Rules exact | **PASS** on the frames read; the engine's Timeline A–E tests (S2) are the proof |
| 5 | Motion limits | **PASS** · NOTE: browsers other than Chromium owed (L12) |
| 6 | Loss and live calm | **PASS** |
| 7 | 360 overflow and taps | **PASS** by the delivery's measurement; re-measured on the built pages in S5 |
| 8 | Swahili at 2.25× | **PASS** for the switch; NOTE: four stretch frames were measured, not drawn |
| 9 | Contrast | **PASS** · NOTE: L7 |
| 10 | Chrome | **NOTE**: drawn chrome is reference only (L5) |
| 11 | Words | **NOTE**: L2, L3 and L11 |
| 12 | Glyphs | **PASS** |
| 13 | Coverage | **PASS** · 146 of 153; the 7 missing by ruling (L8) |
| 14 | Documents | **PASS** · NOTE: superseded lines (L6) |

No gate failed, so there is no round 3. Every NOTE is answered in the build by the L-row named beside it.
