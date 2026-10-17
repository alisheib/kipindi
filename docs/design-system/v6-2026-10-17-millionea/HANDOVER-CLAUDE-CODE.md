# HANDOVER-CLAUDE-CODE — MASWALI-DESIGN-R2

Package stamp: cut from 50pick commit 72ca5cff99638eb8bc26d2d85c3007cb49b3727c on 2026-10-16. Where a figure here disagrees with the live repo, the live repo wins. Work packages are in build order; each names its build session (S1 law/config/schema · S2 engine · S3 money path · S4 admin console · S5 player surfaces · S6 register/notifications/reports/copy · S7 adversarial · S8 live drive), the frames it implements, the components and props, and its measurable acceptance.

## WP1 · Glyphs and the socket family — S1
- Frames: glyphs/socket-sheet-14-18-24.png, glyphs/seal-line-14-18-24.png (sources/D-glyphs.dc.html).
- Add to `glyphs.tsx`: `sealNil` (`<circle cx="12" cy="12" r="8.6"/><path d="M7.5 12h9"/>`), rename `voidX` → `sealX` (geometry unchanged), add `millionea` (the coronet in glyphs/millionea.svg). All on the G wrapper (24 grid, 1.9, round/round, fill none, currentColor).
- Acceptance: the three SVGs render byte-identical to glyphs/*.svg; sealNil, sealX, sealCheck and clockPending are distinguishable at 14px in greyscale (the sheet's proof row); no glyph carries colour, glow or motion of its own.

## WP2 · Tokens, props and the N-block — S1
- Paste the N-block (motion/maswali-motion.css) into `src/app/motion.css` on the owner's yes (O-1…O-3); keep both clamp branches; add NOTHING to the `[data-motion="reduced"]` list.
- Props (one each): `SteppedProgress groups: number[]` (static segments, no sweep/glow) · `OperationResultModal stamp: boolean` (crest takes `.seal-commit`) · `WinCelebrationPayload roll: false` (amount lands final) · `TicketSwitch kind: "millionea"` → /millionea/tickets.
- Status words in `status-tone.ts` (player column): INASUBIRI neutral · IMESHINDA **success** — the owner's O-6 ruling of 2026-10-17 ("the word is success-green and gold is only on the amount"). ⚠ The file today reads `WIN: { player: "gilt" }` with a note forbidding this harmonisation; change that one line to `"success"` and tell `test:gold-is-money` that a won *chip* is a word, not money — or accept that a Millionea won ticket wears a different chip from a Maswali won position on the same page. Decide before WP6 · HAIKUSHINDA / IMEREJESHWA / IMEGHAIRIWA neutral · week WAZI brand · IMEFUNGWA / UKAGUZI / MATOKEO YANATOLEWA / IMEKAMILIKA / IMEBATILISHWA neutral.
- Acceptance: `test:tokens`, `test:reduce-motion` (rule 2.1 unaffected: no new loops), `test:betting-ink` pass; zero new values.

## WP3 · The engine — S2
- `lib/maswali-substitution.ts`: the pure function in sources/maswali-data.js (`substitution(mainsOut, reservesOut)` → map, voided, valid, skipped, used, unused, weekVoid, reservesLeft) and `grade(picks, …)`.
- `lib/maswali-void-reason.ts`: the four reason words (match postponed · match abandoned · no reading from source · reading not published).
- Rules exactly as PROMPT §2: 15 answered before paying; substitution in order with voided reserves skipped; week void when voided mains > valid reserves (pending → paid after the 24-hour window); floor before fee; fee only at payout; equal share floored; remainder never from house money; top-up never rolled; cap 10 (a free-window cancel does not count); cancel runway 5 + 5 minutes; closed categories; a score only in the sunset week.
- Acceptance: unit tests on Timelines A–E reproduce every figure in PROMPT §3 (601,000 carried · 304,500 ×3 · 124,285 ×7 with 5 remainder and 398,995 top-up · 4,350 ×200 and −5,650 · 261,435 ×2).

## WP4 · The money path — S3
- Price from the MAIN balance only (bonus refused with the reason: X-refusal-bonus); insiders refused (X-refusal-insider); the pool in its own house ledger account; fee 13% booked with TRA 10% / GBT 5% of the fee at payout; refunds on week void; free cancel.
- Haptics: confirm on purchase and on the player's own cancel; success on the seal; nothing else.
- Acceptance: S-confirm-*, S-result-*, W-cancel-modal, W-week-void-* frames; the register's ledger balances to the shilling in every timeline.

## WP5 · The officer console — S4
- Out of scope for design; built from the admin kit. One officer records each result and void; a different officer rules on disputes; roles (never names) flow to the register.

## WP6 · Player surfaces — S5
- ⭐ Build on the shipped primitives, never beside them (round 5, DECISIONS D-40…D-47): every status chip is `<Chip>` with the variant from `positionStatusChip()` and the word from `positionStatusWord()` (a Millionea ticket maps OPEN / WIN / LOSS / VOID / cancelled onto the same five, cancelled → `neutral` with `millionea.ticketStatusCancelled`); the lens and topic pills are `FilterPill` / `filterPillClass()` inside the existing scroll strip; the Millionea ticket list reuses `TicketCard`'s chassis and `tickets-view.tsx`'s grid (1 col → 2 from md, reading tier) with the Seal Line in the title link and `<Stat money>` for DAU / MALIPO; the win ledger and How's worked examples are `ReceiptBox` + `ReceiptRow` (fee row `tone="warning"`, earned lines `.gilt-ink`); the finality block prints `t.market.resTwoOfficer` and `t.common.resolutionAttestation` with the hash; dates through `formatEatDateTime` in a `<time>`.
- Modules: maswali-home-card · maswali-week-strip · maswali-pool-figure (zero gold) · maswali-slip · maswali-seal-line (24/18/14; the FLIP measurement for N1) · maswali-outcome-stamp · maswali-ticket · maswali-unbroken-line · maswali-win-ledger (earned lines only).
- Frames: H-* (home card after the head, before the chips; classic entry as ruled; the three-segment switch), U-* (hub states and How), S-* (slip, confirm, result), T-* (ticket states and list), W-* (away line, seal, win ledger, loss receipt, notices).
- Lit tab: Tiketi zangu on /millionea/tickets and a ticket; Maswali elsewhere. Classic: Needle and chat bubble stand down on the slip and confirm.
- Acceptance: every frame in FRAME-INDEX reproduced at 360/768/1280; zero horizontal overflow at 360 in sw/en/zh with every overlay open; every tap ≥ 44px; contrast ≥ 4.5 text / ≥ 3 non-text on the rendered composite; no jackpot figure on the slip, confirm, result, ticket or list; gold only on 4a's list.

## WP7 · Register, notifications, reports, copy — S6
- /millionea/register and /register/[week] server-rendered without JS (P-* frames); the levy line beneath the fee; the strata history; the audit-chain link; no personal data.
- Notifications from i18n-draft.json `millionea.notify.*` (purchase · cancel · resultWon · resultLost · rollover · weekVoid · refund).
- Strings: i18n-draft.json → the dictionary after native review (sw, zh).
- Acceptance: register renders in all 8 states; i18n parity 269/269/269; no raw number in a string.

## WP8 · Adversarial — S7
- Double purchase at the cap; cancel after the runway; a void recorded after a reserve had been "used"; a dispute reinstating a question inside the window; a sunset week with a 10/10; insider accounts; bonus-only balances.
- Acceptance: every refusal in X-* with its reason and next step; no ceremony fired by a poll; a backlog > 4 facts rests.

## WP9 · Live drive — S8
- qa drive for SM1–SM9 on a 4-core/4 GB Android at 360: ≥ 50 fps, ≤ 12 composited layers, one-shot on `data-motion="reduced"`, end frames under both clamps.
- Acceptance: storyboards/SM*.png match the drive's frames at the token offsets.

## SPEC-VALUES
Every dimension is a token or a Tailwind step: spaces `--sp-1…--sp-16`; radii `--r-xs/md/lg/pill`; control heights `--h-control-sm/md/lg/xl`; type steps 10/11/12/13/14/16/18/22/28/38(the seal's shipped amount)/48 px; glyph sizes 24/18/14/12 (the status-ring family) and 48-plate → 24 glyph; widths 360/768/1280 frames, 560 receipt, 1080 reading, 640/400 columns at 1280. Flagged: the seal stage (132 px) and enamel mark (76 px) are the shipped WinCelebration's own; the 3px result-modal strip is the shipped OperationResultModal's.

## Decisions for the owner (do not decide in code)
All answered on 2026-10-17 (DECISIONS "OWNER RULINGS RECEIVED"): O-1…O-3 approved · O-4 unspent · O-5 coronet · O-6 success word, gold on the amount only (⚠ status-tone.ts, WP2) · O-7 after the head · O-8 "Akiba" · Q1 attested times · Q2 MLN-W42-003310 · Q3 Ijumaa 23 Okt 16:00 EAT (a close never later than Ijumaa 19:00) · Q5 printed close always, `.closing-pill` only in the last hour counting minutes · Q7 "Ona matokeo" · Q11 keep — plus OPEN-QUESTIONS.md items 1–14.

## Done means
Every WP's acceptance passes; the README self-check numbers hold on the built product (0 literals, 0 infinite, 0 count-up, 0 jackpot figures on held-ticket surfaces, ≥ 44 px taps, 360 overflow 360, contrast floors met); the rules of PROMPT §2 are reproduced by the engine's tests on Timelines A–E; the seal fires only on a win, only on tap or LIVE, once per player-week.
