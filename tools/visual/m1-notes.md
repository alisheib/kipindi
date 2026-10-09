# Turn M1 on vodacom-visual 8a2d9d26 (main e16f9353 + the pass)

- typecheck: exit 0, 0 errors (the first full tsc on the merged pass; G1 could not run one).
- test:all with the DB suites: 468/474, 3321 s. The six failures, each alone here and alone on main d9b7a5b6:
  - audit-drain 1/1 · revoked-deadend 1/1 · admin-section-gate 1/1 · needle-rest 1/1 (no server in the battery;
    M1 runs it on a server) · orphans 1/1 — main's own.
  - house-bot-disclosure 4 / main 0 — THE BRANCH ONLY, by construction: §5.1 (D19a) pins every tracked file under
    src/app/legal/ byte-identical to origin/main, and G4's legal-nav fix (one class, `pl-[12px]` on the active row,
    plus its comment — no published word) is under that tree. D19a is about WORDS (no disclosure line, no carve-out;
    COMPLIANCE-DECISIONS :2340); nine commits on main changed the legal tree since D19a, each green once it was main.
    To show after the push: test:house-bot-disclosure green on main.
- red:journey-shell 169/169 caught, 339 proofs, tree same. red:wallet-reach 27/27, files restored.
- qa:journey-header-fit 6/6 over 66 cells, least slack 10.7px at sw 320 (TZS 999,999) — G5's figure; red 10/10.
- qa:landmark-seal --journey 504 cells, 0 problems; classic 276 cells, 0 problems.
- needle-rest 20/20 on a server (G1's text rule): no sample rests on a control at 360 or 768.
- qa:journey-preview 33/33 with the settle step.
- local qa:live: STOPPED at the sw pass's /legal/agent-terms (page.goto 30 s timeout; the server never logged the
  request; the en pass served it 200 in 1976 ms; 161 checks passed before it). Earlier runs on main served the sw page
  twice each; the branch's only legal-tree change is one class on the nav, which had just rendered the sw RG page.
  Rerun queued as M4 (same commit, fresh server; a second run if the first fails).
