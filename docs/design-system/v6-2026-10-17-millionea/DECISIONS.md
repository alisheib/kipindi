# DECISIONS — MASWALI-DESIGN-R2

Package stamp: cut from 50pick commit 72ca5cff99638eb8bc26d2d85c3007cb49b3727c on 2026-10-16. Where a figure here disagrees with the live repo, the live repo wins.

Each decision has a stable ID. "Provisional" marks an OPEN item drawn at its named provisional version (also listed in OPEN-QUESTIONS.md).

## OWNER RULINGS RECEIVED — 2026-10-17 (round 6)

The owner answered every item below on 2026-10-17. Each answer was applied to the sources and the affected artboards were re-exported the same day; nothing in this section is provisional any more.

- **O-1 · O-2 · O-3 — approved.** N1 Kubeba, N2 Kugonga Muhuri and N3 Kukata Tiketi ship as drawn (motion/maswali-motion.css, one block, both clamp branches).
- **O-4 — keep unspent.** No fourth motion; the needle alignment stays unbuilt.
- **O-5 — the coronet approved.** glyphs/millionea.svg as drawn.
- **O-6 — approved, and it OVERRIDES the round-5 reading (D-40).** The owner's words: "The word is success-green and gold is only on the amount." Applied: the won ticket's status chip is the kit `Chip` in its `success` variant (`--success-bg` / `--success-fg` / `--success-border`, 9.23:1 per chip.tsx); the won amount stays the only gold on a ticket (`.gilt-ink`). ⚠ Code consequence, recorded for the build and not decided here: `src/lib/status-tone.ts` currently reads `WIN: { player: "gilt" }` with an inline note forbidding exactly this harmonisation, so either that one line changes to `"success"` (and `test:gold-is-money` is told a won *chip* is a word, not money) or a Millionea won ticket wears a different chip from a Maswali won position on the same Tiketi zangu page. HANDOVER WP2 names the choice.
- **O-7 — keep after the head.** The home card stays directly after the head and before the topic chips at every width.
- **O-8 — A1–A5 "Akiba".** The reserve label stays as drawn.
- **Q1 — attested times (not as drawn).** main 1 Sat 17:52 · 2 Mon 00:12 · 3 Mon 09:10 · 4 Sat 11:02 · 5 Mon 10:41 (the last, = results final) · 6 Sun 20:36 · 7 Sun 20:41 · 8 Sun 09:10 · 9 Mon 00:14 · 10 Sun 21:06 · A1 Sun 17:54 · A2 Mon 00:16 · A3 Sun 09:10 · A4 Sat 23:51 · A5 Mon 10:24. Timelines B and E reuse them; D keeps each void row's time, so the week void is certain at Mon 26 Oct 10:24 (A5) and refunds are Tue 27 Oct 12:00. Consequence for the live-cannot-win frame: main 3 is now a Monday result, so T-ticket-live-cannot-win moved to Sun 25 Oct 21:30 — 9 of 15 out, main 7 (Sun 20:41) the first miss on this ticket; the ticket cannot win from that minute. The voided register (P7) prints every attested row with its time and main 5 as "—" (never attested: the week was certain-void seventeen minutes before its reading).
- **Q2 — the second serial.** MLN-W42-003310, the player's 2nd ticket, bought Tue 20 Oct 09:41: the second winner in the two-ticket variant (W7, W11) and the second held ticket on the hub and the list. The 1st, MLN-W42-002083 (Mon 19 Oct 20:15), is in the data for any frame that ever needs a third. The previous week's ticket on the mixed list keeps a masked serial (MLN-W41-00····) — no W41 serial was given; the one remaining mask, listed in OPEN-QUESTIONS.
- **Q3 — the moved close.** Ijumaa 23 Okt 16:00 EAT, moved EARLIER from 18:00, announced Alhamisi 22 Okt 10:15; the first event stays Ijumaa 19:30. Rule recorded for the engine: **a close can never be later than Ijumaa 19:00** (30 minutes before the first event). The notice reads "…sasa ni Ijumaa 23 Okt 16:00 EAT (awali 18:00)…" — `closeMoved` gained `{from}`.
- **Q5 — "Both", with the owner's precision.** The close time is ALWAYS printed (hub: the muted line under the door; slip: the head). The `.closing-pill` appears ONLY in the last hour and counts minutes — "Inafunga karibuni · {n} Dak" (the dictionary's `closingSoon` + `minsUnit`), as on Yes/No markets; never all week. Two frames added: U-hub-open-last-hour-360-sw and S-slip-last-hour-360-sw (48 minutes before the close); every other open frame lost its pill and kept the printed close. The slip rail's pill is the same countdown in its short form ("48 Dak"). D-17 is superseded.
- **Q7 — "Ona matokeo".** The door on a won ticket before the seal opens is the dictionary's `notif.awayView` ("Ona matokeo" / "See results" / "查看结果"), and the away line's door is the same word; "Fungua" and "Fungua muhuri" are gone.
- **Q11 — keep the wording.** "Alama ya juu wiki hii: 9 kati ya 10 · tiketi 2" on the sunset settlement only.

## FOR THE OWNER'S YES OR NO (as put, 2026-10-16 — all answered above)

- **O-1 · N1 Kubeba / The Carry** (motion/maswali-motion.css, `.maswali-carry`). Moves the socket WRAPPER on `translate`/`scale` from runtime bindings measured once before the run; --t-move / --m-settle; stagger on --m-stagger (4 max). Fallback if no: GlyphSwap in place + the printed "4 → A1".
- **O-2 · N2 Kugonga Muhuri / The Attestation Press** (`.maswali-attest`). The stamp travels --sp-2 down the needle's line (--m-tilt, its first consumer) with the seal-place press stops 1.02 / 0.98; --t-base / --m-settle. Fallback if no: the stamp appears with .g-settle.
- **O-3 · N3 Kukata Tiketi / The Cut** (`.maswali-cut`, `.maswali-cut-undo`). The stub settles --sp-2 into the layout (and back on a refund); --t-base; --m-settle / --m-glide. Fallback if no: .m-seal on the stub.
- **O-4 · N4: unspent.** Reason in MOTION.md: every moment is carried by the existing vocabulary plus N1–N3; the one stronger candidate (the needle aligning the ten sockets) is a needle alignment on --m-pivot, which the brief bans.
- **O-5 · The millionea glyph** (glyphs/millionea.svg). R1's three-pearl coronet, re-checked against the family's `crown`: same 24 grid and 1.9 stroke, pearls as stroked rings (no fills, unlike `crown`'s filled pips), band path on the same curve. Never gilt, never animated. If rejected, the existing `ticket` glyph takes its place on the home card and the plates.
- **O-6 · The ticket's status chip — round 5 read the platform's `gilt` as law (D-40); the owner's 2026-10-17 ruling (above) restores the success word and the gold-only-on-the-amount rule.** Round 2 drew IMESHINDA as a success word (hue 166) and every other state as a neutral mono stamp. `src/lib/status-tone.ts` decides a position's chip once for every product (`positionStatusChip`): OPEN → the royal `pending` chip, WIN → the gold chip (`STATUS_TONE.WIN.player = "gilt"`), LOSS → the betting rose `no` chip (`STATUS_TONE_EXCEPTIONS.LOSS`), VOID → royal, cancelled → slate. The Millionea ticket now wears exactly those, in the kit `Chip`'s own shape, so the three kinds of ticket on one Tiketi zangu page read the same. The matched socket keeps `--success-fg` (a socket is not a status chip).
- **O-7 · The home-card position.** Directly after the head (the How-to card and the headline), before the topic chips, at every width; at 1280 one full row across the board column below the head row. This deviates from the sponsor deck's home template (which has no product card in the head block).
- **O-8 · The A1–A5 "Akiba" label.** The reserves are shown as A1–A5 and called "Akiba" (the owner's rulings say R1–R5). "akiba" already means savings and backup codes in the dictionary; here the context is unmistakable (the annex divider, the slip rule strip and the progress count "Akiba 2/5" all state what it means). Flagged as a draft label.

## The system

- **D-1 · Zero new values.** Every colour, radius, shadow, border, space, size, duration and easing is a `var(--token)` or a Tailwind step from the attached files. The only numbers in the N-block are −1 and the press stops 1.02 / 0.98. No colour, ms or curve literal exists outside motion/tokens (README self-check 1–2).
- **D-2 · Materials.** A surface picks one rung: `.mat-raised` for cards and ticket rows, `.mat-flat` for ledger blocks and inline notices, `.mat-inset` for the annex rows and the stub, `.mat-modal` for sheets and dialogs, `.mat-toast` for the factual toast (no tint). The bottom rail casts upward with `--shadow-overlay-up`.
- **D-3 · Type.** Sora for titles (title-lg 28 for page titles — R1's 24 is corrected), Inter for sentences (≥ 13px everywhere), JetBrains Mono tabular for every numeral that is data (`.amount`), including numerals inside sentences (the `segs()` splitter in maswali-data.js). Eyebrows use the .eyebrow recipe (mono, uppercase, 0.14em) at 10–12px.
- **D-4 · Money.** "TZS 1,234" with a no-break space, never letter-spaced; negatives with U+2212 (`fmtNeg`). Money boxes are sized for "TZS 1,000,000".
- **D-5 · Gold is struck.** Gilt appears only on: the armed commit "Kata tiketi · TZS 1,000" (.gilt-metal), the existing seal, "Kwa tiketi yako" / "Jumla yako" on the win ledger (.gilt-ink), the won amount on a ticket row and the settled-won ticket (.gilt-ink), and the shipped deposit doors (the header pill + "Weka pesa", the classic coin, the low-balance "Weka pesa TZS 600" entry, copied from 06-frames). Nothing else — not the jackpot, floor, pool, rollover, stub, Unbroken Line, a chip or a glyph.
- **D-6 · The jackpot is unearned.** Mono, `--text`, 22px at most (title-md), one line in a short ledger, its rule beside it; it re-renders and never counts.
- **D-7 · Betting ink.** `--yes-*` / `--no-*` only on the lit pick control (.btn-yes / .btn-no with a check glyph) — and, since round 5, on the lost ticket's status chip, because that is the platform's ruling (D-40); at most one lit control per row; unselected controls are neutral outlines on `--border-control`. Picks on the confirm sheet, the ticket, the list and the receipts are neutral words.
- **D-8 · Success is not yes.** A matched socket is `--success-fg`; a tick never wears `--yes-*`. A cross is never a void: a void is sealNil.
- **D-9 · The socket grammar.** clockPending "Inasubiri" · sealCheck "Imelingana" · sealX "Haikulingana" · sealNil "Batili / Haikutumika" · clockPending at annex size "Akiba". Sizes 24 (ticket), 18 (lists and the hub rows), 14 (list rows); annex 18 / 14 / 12. Every socket pairs with a word where there is room, and the mains carry their number beneath on the ticket.
- **D-10 · sealNil's bar** is a chord of 9 units at y 12 (`M7.5 12h9`): the em-dash the platform already prints for an unknown value, carried into the ring. It is longer than a ⊖ minus (which centres a 5-unit bar) and an outline in muted ink, so it cannot read as a filled no-entry sign; proven at 14px in greyscale on socket-sheet-14-18-24.png.

## Entry points (H)

- **D-11 · One card, one link.** The Millionea card is the How-to card's anatomy: 48px IconPlate (no colour props) carrying the millionea glyph, title "Millionea · Wiki 42", the headline rule with its figure wrapping freely, the meta line, a chevron. No countdown, no live updates.
- **D-12 · 768 and 1280.** At 768 the figure (mono 18) and its rule move together into a right-aligned block; at 1280 the card is one row (plate · title · rule with figure · meta · chevron).
- **D-13 · Classic entry, as ruled:** (a) the same card at the head of /markets above the filters at every width; (b) "Millionea" as the first row of the More menu and of the top bar's Zaidi overflow at ≥1024 — no inline link, because the band 1024–1279 already overflows; (c) one notice row on /positions, only when tickets are held; (d) NO bottom-rail slot.
- **D-14 · Tiketi zangu's switch** becomes three segments, Maswali | Juu/Chini | Millionea, each ≥ 44px tall, labels allowed to wrap (overflow-wrap) — proven at 2.25× with zero horizontal overflow.
- **D-15 · Lit tab.** Tiketi zangu on /millionea/tickets and on a ticket; Maswali on every other /millionea page.
- ⭐ **Superseded in part, 2026-10-19 (Ali; `docs/DESIGN_AUTHORITY.md` §M8a item 11 is the authority).** Millionea now has
  its own tab right after Up & Down in every nav that has tabs, while it is visible: D-13 (b)'s "no inline link" and the
  journey's "no tab" are struck, and D-15 becomes: Millionea's tab on every /millionea page, Tiketi zangu on
  /millionea/tickets and on a ticket (and for a reader drawn the four tabs, Maswali on the other /millionea pages, as
  D-15 had it). D-13 (a), (c) and (d) stand.
- ⭐ **Superseded in part again, 2026-10-22 (Ali: "ok replace live please … keep live in more").** D-13 (d) "NO
  bottom-rail slot" is struck, and with it (b)'s More row on the phone: on the classic phone rail Millionea's track takes
  Live's place while it is visible (Markets · Up & Down · Deposit · Millionea · More), and Live becomes More's first row.
  D-13 (a) and (c) stand. The authority is `docs/DESIGN_AUTHORITY.md` §M8a item 11.

## Hub and How (U)

- **D-16 · The hub order at 360:** title · the vertical week strip (current phase in `--text`) · the pool block (figure + rule, then the ledger in section 3's order) · the buy block (brand door, .closing-pill, "Tiketi zako wiki hii", one row per held ticket with an 18px Seal Line and no figure) · the 15 public questions with outcome stamps once attested · last week as one closed row · links. 768: horizontal strip, two-column ledger beside the buy block. 1280: 640 left (strip, questions, last week), 400 right sticky (pool, buy, tickets).
- **D-17 · The .closing-pill carries the absolute close** ("Mauzo yanafungwa Ijumaa 18:00") rather than a remaining duration: the sample data has no "now" for the open frames, and an absolute time never ticks. The pill still breathes on the platform's closing-pulse. Provisional.
- **D-18 · Held-ticket rows on the hub** stack the serial above the 18px Seal Line (mains) with the 14px annex beside it, so the 18px line the brief asks for fits at 360 without clipping.
- **D-19 · Settled hub states show Wiki 42 itself** (its closed ledger and settlement band) with a line pointing to Wiki 43 — not the new week with zeros.
- **D-20 · Week void on the hub:** the band "Wiki inabatilishwa" shows the refund time (the check-window close, Jumanne 12:00 — the one such time in the sample data); the live line reads "Akiba halali zilizobaki: chini ya 0 kati ya 5" instead of a negative number. Then "Wiki imebatilishwa" and the carried-in TZS 389,000 carries forward again in full.
- **D-21 · How to play:** four sentences, a static Seal Line example "4 → A1" with a "Tazama mfano" button that plays N1 once on tap (SM9), the two worked ledgers labelled "Mfano", the week timeline, the closed category list, the rules list, a link to the register.

## Purchase (S)

- **D-22 · The slip is a document** (survives from R1): mono number, category, full prose never clamped, a muted meta line (source · event time), NDIO / HAPANA at 44px with YES/NO ink on the lit control only; the annex rows on `.mat-inset` with muted A-numbers.
- **D-23 · The sticky rail:** SteppedProgress with `groups=[10,5]` (static segments, no sweep, no glow), "Kuu 7/10 · Akiba 2/5", the .closing-pill (here and nowhere in the chrome), Endelea — neutral "Jibu maswali 15" under 15/15 (tappable; a tap gives the inline refusal naming the unanswered numbers with a jump link), brand primary "Endelea · TZS 1,000" at 15/15. Never gilt.
- **D-24 · 768 / 1280:** controls move right of the prose at 768; at 1280 a sticky panel replaces the rail (grouped progress, the picks so far as full words in two columns, the price, the cap, Endelea).
- **D-25 · Classic slip:** the rail docks above the five classic tracks; the Needle, the chat bubble and the install invitation stand down on the slip and the confirm. On the hub the Needle stays, the chat bubble stands down for a journey viewer.
- **D-26 · The confirm sheet** (.m-sheet-in + .m-scrim on a phone; .m-dialog-in at ≥ 768): the 15 picks in neutral words, two columns, the annex grouped and labelled; "TZS 1,000 · kutoka salio kuu (TZS 44,196)" · "Tiketi 3 kati ya 10 wiki hii" · "Kughairi bila malipo hadi 14:07" (absent without a window) · the rule without the figure · the armed gilt commit. Low balance: the existing "Weka pesa TZS 600" entry replaces the commit; bonus is not counted.
- **D-27 · The result modal:** OperationResultModal, success, stripTone brand, the new `stamp` prop giving the crest .seal-commit; eyebrow "Tiketi imekatwa", title the serial, details, primary "Tazama tiketi"; no "buy another", no figure. Refused: warning tone (amber), never an error crest.

## Ticket and list (T)

- **D-28 · The ticket** at 560: status word, serial, week; the Seal Line (24 / 18); fifteen clauses with the pick in neutral words, then the outcome stamp and the socket with its word; a voided main is struck and labelled "Batili → A1" (or "Batili · akiba itachukua nafasi yake" before the carry); the perforated rule (the ticket glyph's notches at document scale) and the stub (serial · week · TZS 1,000 · purchase time · hash, labelled).
- **D-29 · Live frames carry no carry and no score.** Annex sockets stay "Akiba" whatever their own event does; the live line counts results out and valid reserves left.
- **D-30 · live-cannot-win** uses the owner's exact wording in an inset line; nothing else changes — no emphasised row, no red.
- **D-31 · Won ticket:** pre-seal shows IMESHINDA, the unbroken line and a brand door "Fungua muhuri"; rested shows the won amount in .gilt-ink under "Kwa tiketi yako" — the only gold on a ticket.
- **D-32 · The list row:** serial · a 14px Seal Line (annex 12) · the status word · the amount only when the ticket won (.gilt-ink), text byte-identical to the ticket.

## Settlement (W)

- **D-33 · The away line** joins the one AwaySummaryBar summary in past tense; a figure appears only when every held ticket shares one outcome; a mixed set states counts only; the seal opens on "Fungua".
- **D-34 · The seal is a faithful rebuild** of the shipped .seal-* classes (rim, specular, enamel, the white mark at 76px, the band), the amount landing final in .gilt-ink (roll: false), one seal per player-week.
- **D-35 · The win ledger** prints Jackpot (neutral) · Ada 13% · Kwa washindi · ÷ tiketi · Kwa tiketi yako (gilt) · × 2 → Jumla yako (gilt) · the two-officer attestation line (D-44; the "[legal line — pending]" slot of round 2 is gone) · the finality line and the attestation hash. Floor week prints the top-up (paid, never carried) and the remainder line; net-negative prints the week's net in U+2212; sunset prints the winning score — the only surface where a score appears.
- **D-36 · The loss receipt** has no score, no misses named, one week line without a figure, the finality line and the closing double rule (SM6), no buy control.
- **D-37 · Void and refund are neutral:** bands and modals on `--border-strong` / `--text-muted`, never claret, red or an error crest.

## Register (P) and refusals (X)

- **D-38 · The register** is a public, server-rendered page: header (week, hash, publish date), the 15 questions with the attesting officer's ROLE, the substitution rule, map and log, the check window, the full ledger with the levy line beneath the fee, the strata history, the audit-chain link. At 360 the table stacks into rows; at 768 / 1280 it is a table.
- **D-39 · Refusals** state the reason and the next step: the factual toast (`.mat-toast`, no tint) or an inline `.mat-flat` notice for a fixable refusal; amber (`--warning-*`) when money fixes it (bonus, low balance) with the existing deposit entry; info tone for the insider refusal; a note frame for the break.

## Language

- **D-40 · Dictionary words** are used as given: tiketi · bwawa · NDIO / HAPANA · Batili · Tiketi zangu · Juu/Chini · Weka pesa · Endelea · Ghairi · ada · salio kuu · Kughairi bila malipo · the seven category labels. "halisi" is used only in its dictionary sense (net: "Jumla yako halisi"). "pool" and "tikiti" never appear.
- **D-41 · Chinese never shrinks a container;** ZH frames keep the Swahili/English layout and English question text (no ZH question translations exist).
- **D-42 · Stretch proofs** pad each label with its own letters to 2.25× its English length (`stretch()` in maswali-data.js) — money and times stay whole.

## Motion harness

- **D-M1 · The prototypes' JavaScript** only adds or removes classes, sets the runtime custom properties from one measurement, restarts with one layout read and listens for animationend. No rAF, setInterval, setTimeout or WAAPI anywhere; sequencing is `animation-delay` in tokens.
- **D-M2 · N1 is FLIP:** the carried wrapper is laid out at its END position and animates from the measured offset back to the annex, so the end frame is the layout and both clamps land on it.
- **D-M3 · GlyphSwap** is composed from the kit's `.g-swap` / `.g-swap-out` / `.g-swap-in`; the incoming glyph starts at opacity 0 inline and lands at 1 through the kit keyframe's `both` fill.
- **D-M4 · The kit Spinner** inside the in-flight commit is drawn at its end frame (a 72% arc) because "infinite" may not be written outside motion/tokens.
- **D-M5 · The SW / EN / ZH switch** toggles the HTML `hidden` attribute on `[data-loc-text]` spans — a UA state with no stylesheet rule and no timing — because the harness may add no stylesheet and the brief's JS list does not cover text swapping. Flagged for the owner.

## Round 5 · aligned with the live source (kipindi-main, read file by file)

The owner linked the repository. Where the extracted brief and the shipped code disagreed, the code won — the README's own rule. Each decision names the file that decided it.

- **D-40 · Status chips are the kit `Chip`.** Pill (`--r-pill`), Inter 700 uppercase, 0.06em, status metrics (23px / 11px on the ticket head; 20px / 10px on the card, the kit's `sm`), tinted fill mixed from the ramp with `color-mix()` exactly as the kit's `signal` variant does — pending: `--brand-300` on 26% `--brand-500`; gold: `--gold-300` on 22% `--gold-500`; no: `--no-300` on 22% `--no-500`; neutral: `--text-muted` on 50% `--brand-soft`. The words are the dictionary's (`positionStatusWord`): Inasubiri · Imekamilika · Ushindi · Imekamilika · Hasara · Imerudishwa (Up & Down's refund word) · Imeghairiwa (the one Millionea word: a free-window cancel, not a sale). The outcome stamp on a clause ("MATOKEO · NDIO") is a stamp, not a status, and keeps SM3's mono box. (`chip.tsx`, `status-tone.ts`, `side-label.ts`, `ticket-card.tsx`.)
- **D-41 · Filter and lens pills are `filterPillClass`.** 44px, 13px/600, `px-3`; unselected: transparent border, `--text-muted`; selected: `border-brand-400`, `--pill-active`, `--glow-selected`, `--text`. The row never wraps a label and fades its trailing 24px below lg so it reads as scrollable (`globals.css` "the strips must look like they scroll"). Replaces round 2's outlined pills in every state. (`filter-pill.tsx`.)
- **D-42 · The Millionea ticket list is the platform's ticket card.** `rounded-xl · border · bg-elevated · p-4`: a chips row (the week as a neutral chip, the status chip), a 44px link holding the Seal Line (18 / 14) where the question sits on a Maswali ticket, a two-column `Stat` pair (DAU · TZS 1,000 / MALIPO · "Matokeo yakitoka" while open; MALIPO YA MWISHO · the figure once settled, `.gilt-ink` when won, the stake back on a refund or cancel, TZS 0 on a loss), then the body-sm meta lines with 14px glyphs: the serial in mono, "Imewekwa 21 Okt, 14:02" in the platform's own date shape. One column at 360, two from 768, inside the reading measure, under the four lenses (Zote · Hai · Imekamilika · Umeshinda). The week group headers go: the week travels on the card. (`ticket-card.tsx`, `tickets-view.tsx`, `stat.tsx`, `eat-day.ts`.)
- **D-43 · The win ledger is a `ReceiptRow` receipt.** Label = the mono micro eyebrow in `--text-subtle` (11px, 0.14em, uppercase); figure = mono 600 in `--text`; the fee row coloured whole in `--warning-fg`; the earned lines keep `.gilt-ink` at 16px (Kwa tiketi yako) and 18px (Jumla yako). The two worked examples on How to play take the same row so an example looks like the receipt it explains, and they stack at 360 (one column; two from 768). (`receipt-row.tsx`.)
- **D-44 · The legal line is the platform's sentence.** "[legal line — pending]" is gone. Under the finality sentence the receipt prints "Imethibitishwa kwa kanuni ya maofisa wawili · Uthibitisho wa utatuzi 7f3a…" — `resTwoOfficer` and `resolutionAttestation`, two strings the dictionary already has — and the ticket's attested line uses the dictionary's word for resolution ("utatuzi", not the draft's "usuluhishi"). (`i18n-dict.ts`.)
- **D-45 · The seal names what won.** The label line under "Tiketi 1 ya 10/10" is the ticket serial (two serials on the two-ticket seal), as the shipped seal's label is the market that settled; "Wiki 42" is said once, in the eyebrow. The singular takes its own key (`wonTicketsOne`: "Tiketi 1 ya 10/10", N-class concord).
- **D-46 · The journey home as the canvas draws it.** The headline keeps each sentence whole ("Jibu swali." / "NDIO au HAPANA." — `.kp-hero__grp`'s rule); the question card's category and close label are `--brand-300`; the NDIO / HAPANA pair is 68px with a 20px word. Category tags on How to play are the kit's `cat` chip (slate, uppercase), not 36px outlined pills.
- **D-47 · Legacy type tokens stay avoided.** The receipt label is written as the px step (11px), not `--type-micro`, per TOKENS-USED "deliberately avoided".

## Where we think the brief or the rulebook is wrong

- The brief asks for an 18px Seal Line inside a hub row at 360; with a serial and a chevron the ten sockets do not fit on one line. Stacking the serial over the line keeps the 18px (D-18).
- The brief's hub "closed" state asks for "Akiba halali zilizobaki" at close time; at the close nothing has voided, so the count is 5 kati ya 5 and reads as noise. We draw it from the live frame (4 kati ya 5), where it carries information.
- `.closing-pill` in state-tokens.css carries colour, border and the breath but no shape; the shape (height, padding, radius) is composed from tokens at the call site.
