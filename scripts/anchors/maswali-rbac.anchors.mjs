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
    from: "{ href: \"/admin/maswali/integrity\", label: \"Integrity\", key: \"maswali-integrity\", domain: \"compliance\" },",
    to: "{ href: \"/admin/maswali/integrity\", label: \"Integrity\", key: \"maswali-integrity\", domain: \"trading\" },",
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
];
