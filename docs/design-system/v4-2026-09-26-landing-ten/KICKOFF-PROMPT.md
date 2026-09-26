Paste everything below the line into Claude Code, opened on `alisheib/kipindi` (branch `main`).

---

You are rebuilding the 50pick landing page (`/`) to a signed-off 10/10. The complete brief is in `docs/design-brief/landing-10/`. It is the only evidence of what was agreed, so follow it exactly. Where it is silent, ask; do not guess.

**Before writing any code**
1. Read, in order: `CLAUDE.md`, `docs/LANDING-TEN.md`, `docs/design-brief/handover-2026-08/LAWS.md`, `docs/DESIGN_AUTHORITY.md` (§B6, §B11, §C5), `docs/RULES.md`.
2. Then read the brief: `README.md`, `HANDOVER-LANDING-10.md`, `SPEC-VALUES.md`, `ACCEPTANCE.md`, `i18n-draft.json`.
3. Open `design/50pick Home Concept v3.dc.html` in a browser at 360, 768 and 1280 wide, in each URL state listed in the README. Save screenshots to `.qa-shots/landing-10/concept/`.
4. Run `npm run qa:landing-ten` on production and save its output as the baseline.
5. Write back a short plan: the PR list (WP1–WP17 plus WP14b), what each PR touches, and any conflict you found between the brief and the repo's rules. **The repo's laws win every conflict.** Report the conflict; don't resolve it quietly.

**While building**
- One work package per PR, in the order given. Each PR includes:
  - before and after screenshots at 360, 768 and 1280, in sw, en and zh
  - the gate classes it affects, re-run
  - any new gate check, with its RED control reporting PROVED
- Mobile first: build and check at 360 before anything wider.
- Every number comes from `SPEC-VALUES.md` mapped onto existing tokens. If no token fits, stop and ask; don't add one.
- Strings: reuse existing i18n keys where the meaning matches. Add new keys in en, sw and zh. Mark sw and zh as `needs-native-review` until Ali confirms sign-off.
- Never touch fee, settlement or wallet-ledger code. The estimate multiplier calls the settlement module's own function.
- Seven items in HANDOVER §8 are Ali's decisions. Ask him and wait; build everything else meanwhile.

**Done means**
Every checkbox in `ACCEPTANCE.md` is ticked with evidence (a screenshot path, gate output or test name). V1–V21 are clean except Ali's open decisions. `npm run test:all` and typecheck pass. The device tests pass. The eight-reviewer re-score is recorded in `docs/LANDING-TEN.md`. `design-brief/00-NEXT-SESSION-PROMPT.md` is left empty.
