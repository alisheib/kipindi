# R5-A brief — home, cards, results, legal, footer, hub, channels, capture

You are helper R5-A in round 5 of 50pick's visual pass for Vodacom. Read first, completely: S\briefs\r5-common.md (the
rules — consistency above all), then S\visual\triage-r5.md (the findings with tiles and measurements).
Worktree: F:\kipindi-r5a (branch vodacom-visual-r5a at 1699302a). Suite: scripts/visual-pass-r5a.test.mts →
test:visual-pass-r5a.
S = C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad

YOUR ITEMS (ids from triage-r5.md):
- F2 the featured card at 1024–1280 sits 4.5–6.5px low against the hero column (centred on the layout box, a near-miss
  with the eyebrow) → top-align: the card's top edge on the eyebrow's cap top at every desktop width, journey AND
  classic home (a shared body) — measure from the tiles, compute from the CSS.
- F12 /results 1280 featured meta "· ⚇ 2 Watabiri" — a capital mid-line (cards say "2 watabiri") → the sentence word;
  find every count+noun meta line that uses a capitalised label key mid-line (siblings) and bring them to one
  convention.
- F15 /markets 1280 BWAWA chips "TZS 10k+" / "TZS 50k+" in the sans with a lower-case k, while every compact sum is mono
  with a capital K ("TZS 49K") → the app's money format (formatTzs compact / .amount); every money chip/filter label
  sibling.
- F16 legal rules sw 390 heading "Kanuni za / Michezo" → balanced; every legal page heading sibling. (The legal tree is
  pinned byte-for-byte by test:house-bot-disclosure D19a until the branch is main — known red, not yours.)
- F17 hub row "Thibitisha ID" (sw) while the page it opens is "Thibitisha kitambulisho" → the row uses the page's own
  key; check EVERY hub row against the h1 of the page it opens (one page, one name — the R4-H E4/E33 rule) and fix every
  mismatch with existing keys.
- F18 the JOURNEY footer at en 1024 splits the regulator's name "Licensed by the Gaming / Board of Tanzania." → keep the
  regulator's name whole (journey footer only — public-footer.tsx's `journeyShown` prop, as R4-F did; the classic
  footer is frozen chrome).
- F19 the featured card's tracked "NDIO" label ends 2px short of the shared right edge (x355 vs x357–358: trailing
  letter-spacing + side bearing) → flush; every right-aligned tracked label sibling (R3-C's right-aligned table heads
  are the precedent).
- F20 the channels panel's × sits 1.7px below the title's cap-band centre while R4-E put the guest sheet's × on the cap
  band (and R4-I the bet confirm's) → ONE convention for every close × in the app's panels, sheets and dialogs; list
  each × you found and where it sits now vs after.
- F5 CAPTURE (repo harness scripts/qa-journey-shell.mjs): hover left on a desktop nav tab (095 099) and a featured card
  (327) → park the pointer before EVERY shot, exactly as R4-G did in the edges drive (`parkPointer`: mouse.move(2, half
  the viewport height), then settle) — read S\edges\qa-journey-edges.mjs for it; `node --check` the harness and extend
  its self-test if it has one.
- ADDED LATER (consistency, from R5-F's audit of the filter bars): eight routes withhold their filter bar on an empty
  book by design (§A5 — positions/page.tsx:372, wallet-client.tsx:785, updown/history/page.tsx:335,
  proposals/page.tsx:238, watchlist/page.tsx:179, fairness/page.tsx:249, positions/performance/page.tsx:191), but
  /results (results/page.tsx:453) renders its bar over an EMPTY archive. Bring /results to the same §A5 behaviour
  (withhold the bar and the search band when there is nothing to filter), match §A5's wording in your comment, and
  guard it with a plant. (R5-B has /notifications, the other outlier.)
- CHECKS (decide each with numbers; fix if it is a defect): the /markets grid cards' pool figure "TZS 10,800" unlabelled
  at ~11px (R4-A labelled only the featured card; R3-A measured no room for a word at 360 — a pool glyph as its label,
  as other figures carry glyphs?); /markets 390 box → filters 31px vs 34 everywhere else (R4-C's band rule); the
  featured state pill 19.3px tall beside the 18px category pill; the AML heading's gradient dimming its line 3 (208);
  the guest hub's "Matokeo" and "Uthibitisho wa utatuzi" sharing one glyph (197); the Up & Down chart with a dead price
  feed showing "Inapakia…" (loading) for ever on an empty card (163 164 200) — a dead feed must say so with an existing
  sentence, never loading indefinitely (the previous run found `udChartError` "Chart unavailable — retrying" as the
  honest existing sentence and was checking whether the history route can hang on a dead feed).
