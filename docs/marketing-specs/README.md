# Marketing campaign & contacts — the design record

The specs, binding decisions and adversarial critiques behind the 52-unit programme in
`docs/MARKETING-CAMPAIGN-AND-CONTACTS-SETUP.md` (the tracker — always the authority for status and order).

- `DECISIONS-U21-U28.md`, `DECISIONS-U29-U40.md` — the binding decisions settled on 2026-10-01 (folded into the
  tracker's plan §9; where the two disagree, §9 and the tracker's later OD entries win).
- `CRITIC-U21-U28.md`, `CRITIC-U29-U40.md` — the critics' findings those decisions answered.
- `U21.md` … `U40.md` — the per-unit specs as designed on 2026-10-01 (the code and the tracker supersede them where a
  unit has shipped; read the unit's STEP entry first).
- `U33a-U37c-OD58.md` — the send gate under OD58 and the test send to any typed number (OD59, 2026-10-03).
- `ENGINE-SPEC.md` — the send engine and its monitoring (2026-10-04, against `31777791`): U41, U43-0, U49s, U38b,
  U40a/b, U16a, U13, U42, U43a/y/b, U49a, U46a, U47b, U48a/b, U52a — build order, estimates, parallel sets, the defects
  found in today's SMS code, and the owner's questions (each with its built default).
- `reviews/` — the first tranche's adversarial review records (2026-10-01), as returned.

⟶ **2026-10-09 · the owner's ruling** (`docs/COMPLIANCE-DECISIONS.md`, the top entry): a marketing SMS — a campaign's or
a test's — is sent exactly as the officer wrote it. Nothing is appended: no source line, no "50pick 18+", no helpline, no
"Acha:" stop link; the counter's room is the whole message (160 GSM-7 characters, 70 in Unicode). Every recipient row
still gets its opt-out token, and `/s/<token>` keeps working for every link sent before. Every passage in these files
that prints, prices or proves a footer, a stop link, "50pick 18+", the helpline or a source line in a message describes
the design before that ruling — the code, its suites and the tracker hold the present. `ENGINE-SPEC.md`,
`U33a-U37c-OD58.md` and `U37.md` carry the same note at their head, and `DECISIONS-U29-U40.md` at M5 and G5.

Moved here from a session's scratch folder on 2026-10-03: until then they existed on one laptop only.
