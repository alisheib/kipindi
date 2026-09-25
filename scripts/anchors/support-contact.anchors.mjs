/**
 * Anchors for red:support-contact — each reintroduces, on the real files, one way the statutory
 * helpline stops being one number. DATA, so `test:red-anchors` §3 can audit that every `from` still
 * resolves exactly once without running the harness.
 *
 * ⛔ A red anchor quotes SOURCE. Editing any of these lines must be paired with re-anchoring here, or
 * the audit reports ANCHOR FAIL — loudly, by design. This lane learned that twice in one day.
 *
 * ── WHY THIS HARNESS DID NOT EXIST UNTIL 2026-09-25 (marketing plan U5) ──────
 * `test:support-contact` is fifteen sections and one of the most careful suites in this repo — it
 * discovers its population rather than listing it, and it carries controls that prove its detectors
 * reject a drifted copy and accept a good one. ⭐ AND NOTHING HAD EVER PROVEN ANY OF IT CAN FAIL.
 * It had no `red:` key at all. A suite with fifteen sections and no red control is fifteen claims on
 * trust; §5.11 of the plan says every guard ships with a control that reintroduces the real defect,
 * and this is that control.
 *
 * ⭐ DECLARED RATHER THAN IN-PROCESS, DELIBERATELY. The suite reads the tree from disk — that is its
 * whole method — so an in-memory plant would have to fake `readFileSync` for the entire sweep, which
 * tests the fake and not the suite. Mutating the real file and restoring it is what actually proves
 * the sweep sees the change. Declaring the anchors here is also what keeps `test:red-anchors`'s
 * undeclared count (68 against a ceiling of 65 on `main`) from moving at all.
 */
export const MUTATIONS = [
  {
    // 🔴 THE DEFECT D6 IS ABOUT, IN ITS SMALLEST FORM. The root error boundary carries four
    // hand-written copies of the helpline and keeps them BY DESIGN — it must import nothing, because
    // it renders when the root layout itself has failed. The copies are fine; a copy that has
    // drifted is not, and before §15 existed nothing compared them to anything.
    name: "global-error.tsx — one hand-written helpline copy drifts from the pinned constant",
    file: "src/app/global-error.tsx",
    from: `    helpline: "Helpline 0800 11 0011",`,
    to: `    helpline: "Helpline 0800 11 9999",`,
    expect: `§15.1 ★ every helpline copy in the root error boundary matches the pinned constant`,
  },
  {
    // ⭐ THE CONTROL'S OWN CONTROL. §15.1 passes beautifully over a file that has stopped printing
    // the helpline at all — every surviving copy still matches. The error page is where a player
    // lands when everything else is broken, so losing the statutory number there silently is the
    // outcome §15.2 exists to make loud. This proves §15.2 is not decoration.
    name: "global-error.tsx — a helpline copy disappears rather than drifting",
    file: "src/app/global-error.tsx",
    from: `    helpline: "Simu ya msaada 0800 11 0011",`,
    to: `    helpline: "Simu ya msaada",`,
    // ⚠️ THE EXPECTED LABEL STOPS AT THE EM-DASH, BECAUSE THAT IS WHERE THE RUNNER STOPS. It reads
    // the gate's `FAIL <label> — <detail>` line and matches on the label half, so an `expect`
    // carrying the detail half can never match and the harness reports WRONG REASON — which is
    // exactly what it did here, on a mutation that was in fact caught correctly.
    expect: `§15.2 ⚠️ CONTROL`,
  },
  {
    // 🔴 THE ONE THAT WAS TRUE ON PRODUCTION FOR THREE WEEKS. An operator saved their OWN number
    // into the support row's `helpline` field, and the readers took it. The statutory helpline is
    // not the operator's to set: it is a pinned constant with no setter and no persisted field, and
    // §2 is what holds that. This mutation makes the constant something an operator's row could
    // plausibly contain.
    //
    // ⚠️ IT NECESSARILY FIRES §15.1 TOO, AND THAT IS THE DESIGN RATHER THAN A SLOPPY ANCHOR: the
    // four copies in the error boundary are pinned TO this constant, so moving the constant must
    // break them. `expect` names §2 because that is the claim under test; a harness that accepted
    // "something went red" would not be able to tell these two apart.
    //
    // ⛔ AND THE REPLACEMENT IS A PLAINLY FAKE NUMBER, NOT THE OPERATOR'S REAL DESK LINE — which is
    // what this first said, and §8 of the very suite under test caught it: "no support contact is a
    // literal outside support-config.ts", and `scripts/` is inside its sweep. The guard was right;
    // a red harness that seeds a real contact number into the tree is a red harness that leaks one.
    name: "support-config.ts — the statutory helpline becomes an operator-settable number",
    file: "src/lib/support-config.ts",
    from: `const STATUTORY_HELPLINE = "0800 11 0011";`,
    to: `const STATUTORY_HELPLINE = "+255700000000";`,
    expect: `§2 helpline ignores the saved row`,
  },
  {
    // The tel: href is the copy a player actually TAPS. A drifted display string is a bad number to
    // read out; a drifted href dials one.
    name: "global-error.tsx — the tel: href drifts while the printed text stays right",
    file: "src/app/global-error.tsx",
    from: `              <a href="tel:0800110011" style={{ color: TEXT_MUTED, textDecoration: "none" }}>`,
    to: `              <a href="tel:0800119999" style={{ color: TEXT_MUTED, textDecoration: "none" }}>`,
    expect: `§15.1 ★ every helpline copy in the root error boundary matches the pinned constant`,
  },
];
