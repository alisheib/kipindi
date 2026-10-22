// Disk plants for `red:maswali-admin-plain` (MASWALI-BUILD S6-ADMIN, the lead's rulings G2–G8) and `test:red-anchors`.
// The red runner (`scripts/maswali-admin-plain.test.mts --prove-red`) writes each plant into the real source, runs the
// suite, requires it to fail ON THE NAMED CASE (`failure`), and restores the file byte for byte.
// A line break is built from its code point (LF) and a dot is matched as [.], so no escape is typed for either.
const LF = String.fromCharCode(10);
const ADMIN = "src/app/admin/maswali";

export const MUTATIONS = [
  {
    name: "(AP1) G2 · a fee that cannot be read is printed blank instead of said",
    file: `${ADMIN}/rules-read.tsx`,
    from: "{value === \"\" ? RULE_CANNOT_BE_READ : rulesValueText(f.key, value, policies)}",
    to: "{rulesValueText(f.key, value, policies)}",
    failure: /FAIL 2[.]2 /,
  },
  {
    name: "(AP2) G2 · the frozen rules lose the week's own fee",
    file: `${ADMIN}/rules-form.ts`,
    from: "  return { ...values, jackpotFeeRate: feeRate === null ? \"\" : values.jackpotFeeRate };",
    to: "  return { ...values, jackpotFeeRate: \"\" };",
    failure: /FAIL 2[.]1 /,
  },
  {
    name: "(AP3) G2 · Pools prints an unread fee as 0%",
    file: `${ADMIN}/pools/page.tsx`,
    from: "{w.feeRate === null ? CANNOT_BE_READ : fmtRate(w.feeRate)}",
    to: "{fmtRate(w.feeRate ?? 0)}",
    failure: /FAIL 2[.]4 /,
  },
  {
    name: "(AP4) G3 · an officer with no name on record is printed by the raw id",
    file: "src/lib/maswali-admin-format.ts",
    from: "  return `Officer #${id.replace(/^usr_/, \"\").slice(-6).toUpperCase()}`;",
    to: "  return id;",
    failure: /FAIL 3[.]1 /,
  },
  {
    name: "(AP5) G3 · the new-device seals print the officer's and the week's ids again",
    file: `${ADMIN}/integrity/page.tsx`,
    from: "officer {d.officer ?? \"not on record\"} · week {d.weekCode ?? \"not on record\"}",
    to: "officer {d.officerId ?? \"?\"} · week {d.weekId ?? \"?\"}",
    failure: /FAIL 3[.]4 /,
  },
  {
    name: "(AP6) G4 · the final week's refusal prints its open as a raw time",
    file: "src/lib/server/maswali-service.ts",
    from: "announced to open ${eatInText(week.opensAt)}; it cannot open before then.",
    to: "announced to open at ${week.opensAt}; it cannot open before then.",
    failure: /FAIL 4[.]2 /,
  },
  {
    name: "(AP7) G4 · a time in a sentence loses its zone",
    file: "src/lib/maswali-admin-format.ts",
    from: "  return `${fmtEat(iso)} (EAT)`;",
    to: "  return fmtEat(iso);",
    failure: /FAIL 4[.]1 /,
  },
  {
    name: "(AP8) G5 · the discard is enforced as another control than the draft's",
    file: `${ADMIN}/actions.ts`,
    from: "requireStaff(CONTROL_DOMAIN.createMaswaliWeek, \"discardMaswaliDraft\")",
    to: "requireStaff(CONTROL_DOMAIN.editMaswaliQuestion, \"discardMaswaliDraft\")",
    failure: /FAIL 5[.]1 /,
  },
  {
    name: "(AP9) G5 · the discard's refusal leaves its dialog",
    file: `${ADMIN}/[weekId]/week-controls.tsx`,
    from: "a week that opened is never discarded.</p>" + LF + "          {error && <p role=\"alert\" className=\"text-body-sm text-danger-fg\">{error}</p>}",
    to: "a week that opened is never discarded.</p>",
    failure: /FAIL 5[.]3 /,
  },
  {
    name: "(AP10) G6 · the builder offers its categories as codes again",
    file: `${ADMIN}/new/week-builder.tsx`,
    from: "options={CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABEL[c] ?? c }))}",
    to: "options={CATEGORIES.map((c) => ({ value: c, label: c }))}",
    failure: /FAIL 6[.]2 /,
  },
  {
    name: "(AP11) G7 · the evidence archive lists the newest N, unsearched and unfiltered",
    file: `${ADMIN}/evidence/page.tsx`,
    from: "  const rows = selected.weeks;",
    to: "  const rows = weeks.slice(0, CONSOLE_PER_PAGE);",
    failure: /FAIL 7[.]1 /,
  },
  {
    name: "(AP12) G7 · the week list's state filter offers the enums again",
    file: `${ADMIN}/page.tsx`,
    from: "...WEEK_STATES.map((state) => ({ value: state, label: weekStateChip(state).label }))",
    to: "...WEEK_STATES.map((state) => ({ value: state, label: state }))",
    failure: /FAIL 7[.]4 /,
  },
  {
    name: "(AP13) G8 · the lock chip names a domain's code and asks \"an Admin\"",
    file: "src/components/admin/control-locked.tsx",
    from: "  accounting: { only: \"Finance officers only\", ask: \"the Owner or a Finance officer\" },",
    to: "  accounting: { only: \"accounting only\", ask: \"an Admin or Finance officer\" },",
    failure: /FAIL 8[.]1 /,
  },
  {
    name: "(AP14) G8 · the Winners table prints the role and the account status as enums",
    file: `${ADMIN}/integrity/page.tsx`,
    from: "{roleLabel(w.role)} · {accountStatusLabel(w.status)}",
    to: "{w.role} · {w.status}",
    failure: /FAIL 8[.]5 /,
  },
];
