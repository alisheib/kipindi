# OPEN-QUESTIONS — MASWALI-DESIGN-R2

Everything drawn provisionally is labelled "provisional" on its canvas and listed here.

## Answered by the owner on 2026-10-17 (applied — see DECISIONS "OWNER RULINGS RECEIVED")

1. Attestation times — supplied; every register, ticket and live frame re-exported on them.
2. The second serial — MLN-W42-003310 (and MLN-W42-002083 for a third). 
3. The moved close — Ijumaa 23 Okt 16:00 EAT (awali 18:00), announced Alhamisi 22 Okt 10:15.
5. The closing pill — printed close always; the pill only in the last hour, counting minutes.
7. The seal door — "Ona matokeo" (notif.awayView), on the ticket and the away line.
8. O-6 — success word, gold only on the amount. 9. O-7 — keep. 10. O-8 — keep. 11. The sunset score line — keep.

## Still open (build-time items, not design gaps)

4. **Source labels** ("Chanzo: NBC Premier League · TMA · DSE · Boomplay · Premier League · TFF · LaLiga · BoT · Coinbase") are drafts for sizing; sources are data and belong to the question record.
6. **The week-void refund time** is now the owner's Tue 27 Oct 12:00 (= the check-window close); confirm the engine computes it the same way in Timeline D.
12. **The break frame.** BetBreakNotice is not in 06-frames; its text is a draft ("Uko kwenye mapumziko…"). Draw from the live component at build.
13. **The guest Tiketi zangu** is drawn as an inline door; the live guest sheet (not in 06-frames) replaces it.
14. **The locale switch in the motion harness** toggles the `hidden` attribute (DECISIONS D-M5). Confirm this reading of "JavaScript may ONLY add or remove classes".
15. **The previous week's serial** on the mixed list (MLN-W41-00····) is the one remaining mask — no W41 serial was given.
16. **status-tone.ts and O-6.** `WIN: { player: "gilt" }` vs the owner's success-word ruling — one line to change, or one page where Millionea's won chip differs from its siblings (DECISIONS, O-6).

## Legal slots

- The win ledger's legal line is the two-officer attestation sentence (`resTwoOfficer` + `resolutionAttestation`); no placeholder remains. Licence wording, if any, is the owner's to add.
- No licence wording, number, tax statement beyond the levy line, helpline or age claim beyond the existing 18+ mark appears anywhere.

## The 1024–1279 band

- No new header control: the hub, slip, ticket and register add nothing to the desktop header. Millionea reaches the classic top bar only through the Zaidi overflow (H-classic-topbar-overflow-1280); an inline link would re-break the band.
- The slip's 1280 layout (640 + 400 sticky) is drawn at 1280. Between 1024 and 1279 the right panel narrows to the remaining width inside the 1080 reading column (≥ 344px); at 1024 the two-column slip should fall back to the one-column 768 layout with the rail — not drawn, flagged.
- The hub's 1280 split (640 / 400) has the same fallback at 1024–1279: one column with the pool block first.
- The register table at 768 is dense (nine columns); between 1024 and 1279 the table keeps the 768 column widths and the question column absorbs the rest.

## Frames not finished

See FRAME-INDEX.md: every cell is listed with "done" (a PNG exists), "canvas-only" (reachable in the canvas by `?from=N&limit=1`, no PNG) or "missing". Nothing is a silent gap.

## Assumptions safe to correct

- The journey header's balance pill and gold "Weka pesa" door, the 18+ ring, the four tabs, the classic top bar, ticker, five-track rail, Needle and chat bubble are drawn from 06-frames; their exact fills follow the tokens that match the captures (`--panel`, `--pill-active`, `--gold-subtle`, `--gilt`).
- The home's question cards show the cold-start copy ("Kuwa wa kwanza") with our sample questions, because the captures' market data may not be copied.
- Frames are exported at 1× (FRAME-INDEX.md).
