/**
 * Anchors for `red:maswali-rbac` (MASWALI-BUILD S4) — each puts back one way Millionea's console could hand a control to
 * the wrong officer, in the real source, and names the `test:maswali-rbac` assertion that must turn red.
 * DATA, so `test:red-anchors` can audit that every `from` still resolves exactly once without running the harness.
 * ⛔ A red anchor quotes SOURCE. Editing one of these lines must be paired with re-anchoring here.
 */
export const MUTATIONS = [
  {
    name: "(1) the money page falls to trading (the week's own officer could release its payout)",
    file: "src/lib/server/roles.ts",
    from: "  [\"/admin/maswali/pools\", \"accounting\"],",
    to: "  [\"/admin/maswali/pools\", \"trading\"],",
    expect: "1 · pools /admin/maswali/pools → accounting",
    suite: "rbac",
  },
  {
    name: "(2) the release is registered as a trading control",
    file: "src/lib/server/control-gates.ts",
    from: "  releaseMaswaliSettlement: \"accounting\",",
    to: "  releaseMaswaliSettlement: \"trading\",",
    expect: "2 · releaseMaswaliSettlement is registered accounting",
    suite: "rbac",
  },
  {
    name: "(3) the rollout switch is handed to compliance",
    file: "src/lib/server/control-gates.ts",
    from: "  setMillioneaRollout: \"ops\",",
    to: "  setMillioneaRollout: \"compliance\",",
    expect: "2 · setMillioneaRollout is registered ops",
    suite: "rbac",
  },
  {
    name: "(4) the guarantee funding enforces a literal domain instead of its own control",
    file: "src/app/admin/maswali/pools/actions.ts",
    from: "requireStaff(CONTROL_DOMAIN.fundMaswaliGuarantee, \"fundMaswaliGuarantee\")",
    to: "requireStaff(\"accounting\", \"fundMaswaliGuarantee\")",
    expect: "3 · fundMaswaliGuarantee is enforced",
    suite: "rbac",
  },
  {
    name: "(5) the forfeit is enforced as the release's control",
    file: "src/app/admin/maswali/integrity/actions.ts",
    from: "requireStaff(CONTROL_DOMAIN.forfeitMaswaliShare, \"forfeitMaswaliShare\")",
    to: "requireStaff(CONTROL_DOMAIN.releaseMaswaliShare, \"forfeitMaswaliShare\")",
    expect: "3 · forfeitMaswaliShare is enforced",
    suite: "rbac",
  },
  {
    name: "(6) the integrity page's nav entry claims trading",
    file: "src/components/admin/admin-nav-groups.ts",
    // PHOSPHOR-MIGRATION W3: the item carries its REQUIRED glyph now (`NavItem.glyph`); the plant is unchanged — the domain.
    from: "{ href: \"/admin/maswali/integrity\", label: \"Integrity\", key: \"maswali-integrity\", glyph: \"integrity\", domain: \"compliance\" },",
    to: "{ href: \"/admin/maswali/integrity\", label: \"Integrity\", key: \"maswali-integrity\", glyph: \"integrity\", domain: \"trading\" },",
    expect: "5 · nav /admin/maswali/integrity",
    suite: "rbac",
  },
  /* ── MASWALI-BUILD S7-F2 · the Owner's two forms on the trading page. ── */
  {
    name: "(7) the public-holiday list is handed to the week's own officer (trading)",
    file: "src/lib/server/control-gates.ts",
    from: "  saveMaswaliHolidays: \"ops\",",
    to: "  saveMaswaliHolidays: \"trading\",",
    expect: "2 · saveMaswaliHolidays is registered ops",
    suite: "rbac",
  },
  {
    name: "(8) the rules save is enforced as the draft's control, so a trading officer could change the price and the floor",
    file: "src/app/admin/maswali/actions.ts",
    from: "requireStaff(CONTROL_DOMAIN.saveMaswaliConfig, \"saveMaswaliConfig\")",
    to: "requireStaff(CONTROL_DOMAIN.createMaswaliWeek, \"saveMaswaliConfig\")",
    expect: "3 · saveMaswaliConfig is enforced",
    suite: "rbac",
  },
  /* ── MASWALI-BUILD S7-F3 · the holiday save's own gate, beside (7)'s registry plant. ── */
  {
    name: "(9) the holiday save is enforced as the draft's control, so a trading officer could change the days no week opens or closes on",
    file: "src/app/admin/maswali/actions.ts",
    from: 'requireStaff(CONTROL_DOMAIN.saveMaswaliHolidays, "saveMaswaliHolidays")',
    to: 'requireStaff(CONTROL_DOMAIN.createMaswaliWeek, "saveMaswaliHolidays")',
    expect: "3 · saveMaswaliHolidays is enforced",
    suite: "rbac",
  },
  // 2026-10-18 · MASWALI-BUILD S6 (MB-92): the evidence pack carries every ticket's answers.
  {
    name: "(10) the evidence page falls to trading (the officer who seals could read every ticket's answers)",
    file: "src/lib/server/roles.ts",
    from: "  [\"/admin/maswali/evidence\", \"compliance\"],",
    to: "  [\"/admin/maswali/evidence\", \"trading\"],",
    expect: "1 · evidence /admin/maswali/evidence → compliance",
    suite: "rbac",
  },
  {
    // 2026-10-18 · S6 review R2-5: the decision moved from the route into its door, unchanged; re-anchored there.
    name: "(11) the evidence download answers the cookie's audience instead of the page's",
    file: "src/lib/server/maswali-evidence-door.ts",
    from: "(await canView(u.role, domainForPath(EVIDENCE_PAGE)))",
    to: "(await canView(u.role, \"overview\"))",
    expect: "7 · the download's door asks the evidence PAGE's own domain",
    suite: "rbac",
  },
  // 2026-10-18 · MASWALI-BUILD S6 (MB-64): the support desk's lookup of one ticket.
  {
    name: "(12) the desk's lookup falls to trading (the officer who seals could open tickets one by one)",
    file: "src/lib/server/roles.ts",
    from: '  ["/admin/maswali/lookup", "support"],',
    to: '  ["/admin/maswali/lookup", "trading"],',
    expect: "1 · lookup /admin/maswali/lookup → support",
    suite: "rbac",
  },
  {
    name: "(13) the lookup answers any console role instead of the page's own audience",
    file: "src/app/admin/maswali/lookup/actions.ts",
    from: "!(await canView(guard.role, domainForPath(LOOKUP_PAGE)))",
    to: '!(await canView(guard.role, "overview"))',
    expect: "8 · the lookup asks the lookup PAGE's own domain",
    suite: "rbac",
  },
  {
    name: "(14) the lookup answers although its record was not written",
    file: "src/lib/server/maswali-support.ts",
    from: "  if (!record.recorded) return { ok: false, error: DESK_UNRECORDED };",
    to: "  void record;",
    expect: "8 · ⭐ the lookup records itself before it answers",
    suite: "rbac",
  },
  {
    name: "(15) the lookup hands over a running week's answers",
    file: "src/lib/server/maswali-support.ts",
    from: "answers: final ? view.slots.map(",
    to: "answers: true ? view.slots.map(",
    expect: "8 · ⛔ MB-34 · a ticket's answers are read only once its week is final",
    suite: "rbac",
  },
  // 2026-10-18 · S6 review round 2 (R2-1): a held share's note on the integrity page. Round 3: re-anchored on the
  // console's projection, which replaced the neutral one in both cells.
  {
    name: "(16) the integrity page prints a held share's raw mark again",
    file: "src/app/admin/maswali/integrity/page.tsx",
    from: "{consoleShareNoteOf(h.reason)}",
    to: "{h.reason}",
    expect: "9.1 · ⛔ R2-1 · D19",
    suite: "rbac",
  },
  // S6 review round 2 (R2-4, R2-12): the desk lookup's budget, and what an unknown serial costs.
  {
    name: "(17) the desk lookup's production budget never refuses",
    file: "src/lib/server/maswali-support.ts",
    from: 'budget: (officerId: string) => rateCheckAsync(officerId, "maswali.lookup"),',
    to: "budget: async (officerId: string) => ({ allowed: officerId.length >= 0, retryAfterSec: 0 }),",
    expect: "8 · ⛔ R2-4",
    suite: "rbac",
  },
  {
    name: "(18) the desk lookup reads the account only when the serial exists",
    file: "src/lib/server/maswali-support.ts",
    from: "  const caller = await db.user.findByPhone(`+${toMsisdn255(typed)}`);",
    to: "  const caller = stored ? await db.user.findById(stored.userId) : null;",
    expect: "8 · ⛔ R2-12",
    suite: "rbac",
  },
  // 2026-10-18 · S6 review round 3: the deciding officer's "Why", the regulator's CSV, and the cluster table's keys.
  {
    name: "(19) the winners table reads the neutral projection again (the deciding officer cannot tell one hold from another)",
    file: "src/app/admin/maswali/integrity/page.tsx",
    from: "{consoleShareNoteOf(w.frozenReason)}",
    to: "{shareNoteOf(w.frozenReason)}",
    expect: "9.1 · ⛔ R2-1 · D19",
    suite: "rbac",
  },
  {
    name: "(20) the regulator's CSV reads the console's allowlist (the settlement's own hold words leave the console)",
    file: "src/lib/server/maswali-evidence.ts",
    from: "won ? shareNoteOf(t.frozenReason) : null",
    to: "won ? consoleShareNoteOf(t.frozenReason) : null",
    expect: "9.5 · ⛔ R3",
    suite: "rbac",
  },
  {
    // Round 6: re-anchored on the row the page builds from the report's helper.
    name: "(21) the cluster table keys its lines by their place in the list again",
    file: "src/app/admin/maswali/integrity/page.tsx",
    from: "({ c, g, key: `${c.weekId}.${g.id}` })",
    to: "({ c, g, key: `${c.weekId}.${c.lines.indexOf(g)}` })",
    expect: "9.6 · R3",
    suite: "rbac",
  },
  // 2026-10-18 · S6 review round 4: the allowlist's type.
  {
    name: "(22) the console's allowlist loses its type (a renamed reason would turn neutral in silence)",
    file: "src/lib/maswali-share-note.ts",
    from: "] as const satisfies readonly HoldReason[]);",
    to: "] as const);",
    expect: "9.7 · R4",
    suite: "rbac",
  },
  {
    // Round 6: on the report's own sort, so the plant changes behaviour again — its lines fall back to the order they were
    // built in, the groups first and the crowded places after them.
    name: "(23) the report lists the groups first and the crowded places after them again",
    file: "src/lib/server/maswali-integrity.ts",
    from: ".values()].sort(clusterLineOrder);",
    to: ".values()];",
    expect: "9.8 · ⭐ R4",
    suite: "rbac",
  },
  {
    name: "(24) an opened crowded line is called one group's accounts",
    file: "src/app/admin/maswali/integrity/page.tsx",
    from: "holders on one crowded place`",
    to: "accounts in one group`",
    expect: "9.9 · R4",
    suite: "rbac",
  },
  // 2026-10-18 · S6 review round 5: the one order across the weeks the table shows. Rounds 6–8: on the page's helper,
  // whose order is three tiers — the weeks not yet settled, then the settled weeks still holding a share, then the
  // decided ones — and the one order within each.
  {
    name: "(25) the cluster table drops its order across the weeks it shows (three tiers — not yet settled, settled holding a share, decided — then the one order)",
    file: "src/lib/server/maswali-integrity.ts",
    from: "    .sort((a, b) => paidOut(a.report) - paidOut(b.report) || clusterLineOrder(a.line, b.line));",
    to: "    ;",
    expect: "9.8 · ⭐ R4",
    suite: "rbac",
  },
  {
    name: "(26) round 17 (M1) · the integrity page draws the letters' check from a pending answer (every role that opens it gets the control)",
    file: "src/app/admin/maswali/integrity/page.tsx",
    from: "{canClearLetters ? <ClearLettersControl ",
    to: "{canUseControl(role, \"clearUnresolvedLetter\") ? <ClearLettersControl ",
    expect: "10 · /admin/maswali/integrity draws the letters' check",
    suite: "rbac",
  },
  // 2026-10-22 · S6-DOCS · MB-92 as built (the lead's ruling (m)): the Auditor reads the Millionea console, read-only, and
  // nothing beyond it.
  {
    name: "(27) MB-92 · the Auditor's route exception widens past the Millionea console (every console page opens to it)",
    file: "src/lib/server/roles.ts",
    from: "export const AUDITOR_CONSOLE_PREFIX = \"/admin/maswali\";",
    to: "export const AUDITOR_CONSOLE_PREFIX = \"/admin\";",
    expect: "7 · ⛔ the Auditor opens no other trading page",
    suite: "rbac",
  },
  {
    name: "(28) MB-92 · the Auditor is handed an act (its compliance grant arms every Compliance control)",
    file: "src/lib/server/roles.ts",
    from: "    compliance: { canView: true, canAct: false },",
    to: "    compliance: { canView: true, canAct: true },",
    expect: "7 · ⛔ …and acts on NONE",
    suite: "rbac",
  },
  {
    name: "(29) MB-92 · the page gate stops asking the path (the Auditor is refused the week list its nav offers)",
    file: "src/components/admin/admin-section-gate.tsx",
    from: "  const viewBlocked = ownerOnly ? !isAdmin(role) : !(await canViewPath(role, path));",
    to: "  const viewBlocked = ownerOnly ? !isAdmin(role) : !(await canView(role, domain));",
    expect: "7 · the page gate asks canViewPath",
    suite: "rbac",
  },
];
