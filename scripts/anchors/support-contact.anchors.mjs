/**
 * Anchors for red:support-contact — each reintroduces, on the real files, one way a public fact (the
 * helpline, the licence, the desk line) stops being the one value the admin saved. DATA, so `test:red-anchors` §3 can audit that every `from` still
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
    name: "global-error.tsx — one hand-written helpline copy drifts from the default",
    file: "src/app/global-error.tsx",
    from: `    helpline: "Helpline 0800 11 0011",`,
    to: `    helpline: "Helpline 0800 11 9999",`,
    expect: `§15.1 ★ every helpline copy in the root error boundary matches the default helpline`,
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
    // 🔴 THE SHAPE §14.1 COULD NOT SEE (MOBILE-VISUAL-FINDINGS S08-05 / S08-info-H02): /help's at-risk answer printing
    // the helpline from a STRING — no tel:, nothing to tap — which is how it shipped until 2026-09-26. Single-quoted
    // so the backticks and `${` in the source are literal.
    name: "help/page.tsx — the at-risk answer's helpline goes back to untappable text",
    file: "src/app/help/page.tsx",
    from: '                      <a href={`tel:${HELPLINE_TEL()}`} className="whitespace-nowrap font-mono text-brand-300 underline-offset-2 hover:underline">{HELPLINE()}</a>',
    to: '                      {`${HELPLINE()}`}',
    expect: `§14.5 ★ no support contact is rendered as bare text from a string or after a label expression`,
  },
  {
    // 🔴 E-328 IN ITS 2026-10-03 FORM. The helpline is editable now, so the defect is no longer "the
    // constant became settable" — it is the STALE `helpline` key in the live row (our own desk,
    // `+255769777877`) being read back as the helpline. The editable value lives under
    // `nationalHelpline` precisely so that cannot happen; this plants the one-word slip that undoes it.
    name: "server/support-config.ts — migrate reads the stale `helpline` key as the national helpline",
    file: "src/lib/server/support-config.ts",
    from: `  if (typeof persisted.nationalHelpline === "string" && persisted.nationalHelpline.trim()) out.nationalHelpline = persisted.nationalHelpline;`,
    to: `  if (typeof persisted.helpline === "string" && persisted.helpline.trim()) out.nationalHelpline = persisted.helpline;`,
    expect: "§2.1 the stale `helpline` key in the saved row does NOT become the helpline",
  },
  {
    // 🔴 THE LOCK'S REPLACEMENT, REMOVED. With the field editable, the only thing standing between an
    // admin and publishing our own desk as the "Helpline" is this refusal.
    name: "server/support-config.ts — the refusal of our own desk number as the helpline is switched off",
    file: "src/lib/server/support-config.ts",
    from: `  if (desk && toDialTarget(c.nationalHelpline) === desk) {`,
    to: `  if (false && desk && toDialTarget(c.nationalHelpline) === desk) {`,
    expect: "§10 refuses the helpline set to our OWN support number (E-328)",
  },
  {
    // The browser half of the reader: a client component that stops reading <html> prints the default
    // for ever — an admin's save would look like it never landed, which is how this campaign began.
    name: "support-config.ts — the browser reader stops reading the published <html> attributes",
    file: "src/lib/support-config.ts",
    from: `    const v = window.document.documentElement.getAttribute(PUBLIC_FACT_ATTRS[name]);`,
    to: `    const v = "";`,
    expect: "§2.5 ★ in a browser, the readers return what the layout published on <html>",
  },
  {
    // And the server half of the same channel: the layout stops publishing, so every browser falls back.
    name: "layout.tsx — the root layout stops publishing the saved facts on <html>",
    file: "src/app/layout.tsx",
    from: ` {...publicFactAttrs(getSupportConfig())} suppressHydrationWarning`,
    to: ` suppressHydrationWarning`,
    expect: "§16.4 ★ the root layout publishes the SAVED facts on <html> (what HELPLINE() reads in a browser)",
  },
  {
    // ⭐ THE OWNER'S RULE ITSELF (2026-10-03): a greyed-out box is what his admin reported as "read-only".
    name: "system-client.tsx — the licence box goes back to read-only",
    file: "src/app/admin/system/system-client.tsx",
    from: `<Input name="licenceNumber" defaultValue={config.licenceNumber} required mono />`,
    to: `<Input name="licenceNumber" defaultValue={config.licenceNumber} readOnly disabled mono />`,
    expect: "§16.1 ★ the Support contacts card has no read-only or disabled box",
  },
  {
    // The error page's dial fallback is the copy a player TAPS when nothing was published. A drifted
    // display string is a bad number to read out; a drifted href dials one.
    name: "global-error.tsx — the fallback tel: target drifts while the printed text stays right",
    file: "src/app/global-error.tsx",
    from: `const HELPLINE_FALLBACK_TEL = "0800110011";`,
    to: `const HELPLINE_FALLBACK_TEL = "0800119999";`,
    expect: "§15.1 ★ every helpline copy in the root error boundary matches the default helpline",
  },
];
