# R5-C brief — the second gold audit

You are helper R5-C in round 5 of 50pick's visual pass for Vodacom: THE SECOND GOLD AUDIT. Read first, completely:
S\briefs\r5-common.md (the rules — consistency above all), then docs/DESIGN_AUTHORITY.md (every rule about gold,
gilt, warning, money, celebration, M3, Q5, F3, D5) and test:gold-is-money's source and registry (scripts/ — find it),
then S\visual\triage-r5.md and S\visual\triage-r4.md (search "gold" and "GOLD").
Worktree: F:\kipindi-r5c (branch vodacom-visual-r5c at 1699302a). Suite: scripts/visual-pass-r5c.test.mts →
test:visual-pass-r5c.
S = C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad

Round 4's audit (R4-K, commit c15b3b61, and R4-I's application in 1699302a) already ruled and fixed: the market
countdown labels, the not-found gold, the guest panel eyebrow, the auth eyebrows and CTAs, the deposit-paused and RG
callouts (→ neutral), the journey avatar menu's sparkle. Read those commits' messages first so your rulings are
consistent with theirs.

THE ITEMS readers raised since (rule EACH with the authority's own words — allowed, or a defect — then fix every defect
that is in a shared page body or the journey; for classic chrome (frozen) and for the `--warning-fg: var(--gilt)` token,
write the ruling and the exact change for the owner instead):
- the notifications page's unread-count dot gold (198,158,72) while the rail's unread dot is periwinkle;
- the agent page: "GHARAMA TZS 100,000" in gold (a fee the agent PAYS), "10% ya ada halisi", the step-5 numeral; its three
  stat values in three treatments;
- the proposals eyebrow, trophy and notice clock;
- /results: the crown and "MATOKEO MASHUHURI", the eyebrow glyph, the resolved pill "IMETATULIWA · HAPANA" (fill
  219,179,96), the signed-out notice's text, (!) icon and "Ingia" button (capsule gold);
- the fairness numerals and step 4;
- the badge rings and "5/20";
- the KYC stepper's active step "NIDA" (ring + label in capsule gold);
- the probability bar's marker in money gold on the featured card and the market page's bar;
- the empty-state illustrations' accents (223,176,59 — compass needle, briefcase clasp);
- the WIN state pills (likely allowed — M3 "resolved seal"; confirm);
- the classic nav and rail "• Juu na Chini" dots (classic chrome — owner);
- every other gold use you find by grepping the gold tokens/classes (text-gold-*, bg-gold-*, --gilt, --gold-*, warning
  tone) across src/ — list them all in a table: place, what it marks, ruling, action.
(The previous run was working on the RG page's pending-increase box — "R4-I made every other RG notice neutral; this
sibling was missed".)
Consistency: one rule applied the same way everywhere — a "highlight" that is not money uses ONE non-gold accent
everywhere (pick it from the design tokens and justify), never a different colour per page.
Guard: extend test:gold-is-money's registry if that is its mechanism (read how it classifies), or your own suite — so a
new gold use outside money is caught, with a plant.
