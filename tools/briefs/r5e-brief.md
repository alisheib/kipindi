# R5-E brief — text wrapping and the keep-words helpers

You are helper R5-E in round 5 of 50pick's visual pass for Vodacom. Read first, completely: S\briefs\r5-common.md (the
rules — consistency above all), then S\briefs\review-findings.md (Review 3: H1–H5 and its DOUBTS — your items), then
S\visual\triage-r5.md (F1 and F4). The reviewer's fuzz scripts and prototypes are in S\review\ (fuzz.ts, fuzz2.ts,
timew.ts, s1–s5.ts, fix.ts, fix2.ts) — reuse them: your fixes must keep every function's text byte-identical over the
same fuzz corpus, with no lookbehind (Safari < 16.4) and no regression in timing.
Worktree: F:\kipindi-r5e (branch vodacom-visual-r5e at 1699302a). Suite: scripts/visual-pass-r5e.test.mts →
test:visual-pass-r5e (and update scripts/visual-pass-r4h.test.mts where its keepFigures pins move, with the reason).
S = C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad

YOUR ITEMS:
- H1 keepFigures' ideograph tail (a closed Chinese unit list, longest first) and the currency code kept as the head — the
  reviewer's prototype; check EVERY title surface that calls it (siblings: featured card, MarketCard, board rows, the
  market h1, the ticket card, /live carousel and wall's KeepHyphenated) still renders the expected runs.
- H2 + H3 keepNameEnd (no unbounded run on U+3000/U+2003; never cut inside a grapheme — the reviewer's prototype;
  consider Intl.Segmenter only if it is in every target engine and SSR-identical — say).
- H4 empty-state-text.ts inserting U+2060 / U+00A0 → the keepLastWords technique, no inserted characters; check every
  other helper or component that inserts invisible characters into displayed text (grep for \u2060, \u00a0, \u200b,
  &nbsp; in src/) — one convention.
- H5 delete keep-units.tsx if nothing imports it, and fix the comments that cite it.
- triage-r5 F1: the zh featured title splitting the WORD 超过 at 320 ("…降雨超 / 过200毫米") — the reviewer showed
  keepFigures never glues 过; the likely cause is `text-wrap: pretty` on the featured title (globals.css ~5305) and the
  board's `.kp-qrow__q` (~4813) moving one more unbreakable piece (one CJK character) down. Prove the mechanism as far as
  you can without a browser (Chromium's pretty algorithm is documented — read about it; the tile measurements are in
  triage-r5 F1), choose the fix (e.g. `:lang(zh)` → `text-wrap: wrap`, or balance, or phrase segmentation) and apply it
  CONSISTENTLY to every title surface that uses pretty/balance with Chinese text; write the browser check the lock turn
  runs (the featured title at zh 320/360/390 with the tile's exact string) — `node --check` it.
- triage-r5 F4: the en featured title wraps greedily — "…exceeds 200mm / in July" (49px vs 286px at 390, 1024 too) →
  balanced (or pretty working as intended) — consistent with the F1 decision across languages and title surfaces.
- The reviewer's other DOUBTS in your area: hangCjkMarks' real space after a mid-line mark (find-in-page / copy on
  WebKit) — decide and document; moneyRuns missing formatTzs's negative "TZS −4,200" (U+2212) — fix if trivial;
  keepFigures not keeping "28:00 dakika" or capitalised "Dakika 90" / "Saa 3" — decide.
(The previous run was working on the positions page and the tickets view — "smallest hunks".)
