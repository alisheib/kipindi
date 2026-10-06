/**
 * Anchors for red:support-contact — each reintroduces, on the real files, one way a public fact (the
 * helpline, the licence, the desk line) stops being the one value the admin saved, a number the admin
 * types is refused again, or the helpline comes back to a player surface (the owner's ruling, 2026-10-06).
 * DATA, so `test:red-anchors` §3 can audit that every `from` still resolves exactly once without running the harness.
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
    // ⭐ THE OWNER'S RULING OF 2026-10-06, AT THE LAST RESORT. The root error page imports nothing, so a
    // helpline there is a hand-typed copy — which is exactly what it carried, in all three languages,
    // until that day.
    name: "global-error.tsx — a hand-written helpline comes back to the error page",
    file: "src/app/global-error.tsx",
    from: `    rg: "Responsible gaming",`,
    to: `    rg: "Responsible gaming",\n    helpline: "Helpline 0800 11 0011",`,
    expect: `§15.3 ★ the root error page prints no helpline and reads no published one`,
  },
  {
    // ⭐ THE RULING ON EVERY PAGE: the footer is on all of them, and it is where the helpline sat.
    // ⚠️ THE EXPECTED LABEL STOPS AT THE EM-DASH, BECAUSE THAT IS WHERE THE RUNNER STOPS. It reads
    // the gate's `FAIL <label> — <detail>` line and matches on the label half.
    name: "public-footer.tsx — the helpline comes back to the footer of every page",
    file: "src/components/layout/public-footer.tsx",
    from: `<span className="whitespace-nowrap">{supportPhone}</span>`,
    to: `<span className="whitespace-nowrap">{supportPhone}</span>{" "}<span className="whitespace-nowrap">{HELPLINE()}</span>`,
    expect: `§15.1 ★ no player-facing file reads the helpline`,
  },
  {
    // …and in the inbox: the footer of every email carried "Helpline <number>" until 2026-10-06. Single-quoted
    // so the `${` in the source is literal.
    name: "email.ts — the helpline comes back to the footer of every email",
    file: "src/lib/server/email.ts",
    from: '      <a href="mailto:${REPLY_TO()}" style="color:${TEXT_SUBTLE};text-decoration:none">${REPLY_TO()}</a>',
    to: '      Helpline ${HELPLINE()} · <a href="mailto:${REPLY_TO()}" style="color:${TEXT_SUBTLE};text-decoration:none">${REPLY_TO()}</a>',
    expect: `§15.1 ★ no player-facing file reads the helpline`,
  },
  {
    // …and in the Help chat's instructions, a prompt string a player receives through the model.
    name: "chat.ts — the Help chat is told to hand out the helpline again",
    file: "src/app/_actions/chat.ts",
    from: '- 18+ only, licensed by the Gaming Board of Tanzania. Our own support desk is ${SUPPORT_PHONE()}, ${SUPPORT_EMAIL()}.',
    to: '- 18+ only, licensed by the Gaming Board of Tanzania. Our own support desk is ${SUPPORT_PHONE()}, ${SUPPORT_EMAIL()}.\n- The helpline is ${HELPLINE()}.',
    expect: `§15.1 ★ no player-facing file reads the helpline`,
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
    // 🔴 THE RULE THE OWNER REMOVED, PUT BACK (2026-10-06). E-328's refusal of our own desk as the helpline is
    // the one rule he named; a validator that grows it again is what §10's ★ rows exist to catch.
    name: "server/support-config.ts — the refusal of our own desk number as the helpline comes back",
    file: "src/lib/server/support-config.ts",
    from: `  // ── The licence number (editable since 2026-10-03). ──`,
    to: `  if (toSupportDial(c.nationalHelpline) === toSupportDial(c.phoneTel || c.phone)) return { ok: false, reason: "That is our own support number." };\n  // ── The licence number (editable since 2026-10-03). ──`,
    expect: "§10 ★ accepts the helpline set to our OWN support number (E-328's refusal is gone)",
  },
  {
    // ⭐ "ANY NUMBERS HE WANTS" (2026-10-06): the support phone narrowed back to Tanzanian formats only.
    name: "support-config.ts — the support phone takes Tanzanian formats only again",
    file: "src/lib/support-config.ts",
    from: `  return toDialTarget(input) || toHelplineDial(input);`,
    to: `  return toDialTarget(input);`,
    expect: "§10 ★ accepts a support phone that is a short code",
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
];
