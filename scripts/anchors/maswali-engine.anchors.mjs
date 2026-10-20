/**
 * Anchors for `red:maswali-engine` (MASWALI-BUILD S2) — each puts back one way a Millionea week could be run wrong, in the
 * real source, and names the assertion that must turn red, and in which suite:
 *   · engine — the memory child of `test:maswali-engine` (`scripts/lib/maswali-engine-child.mts`)
 *   · score  — `test:maswali-score` (the 352-case table)
 *   · money  — `test:maswali-money` (the grid and worked example A)
 * DATA, so `test:red-anchors` can audit that every `from` still resolves exactly once without running the harness.
 *
 * `expect` is the start of (or a phrase in) the case's own label: any other red is WRONG-ASSERTION.
 * ⛔ A red anchor quotes SOURCE. Editing one of these lines must be paired with re-anchoring here.
 */
const DAL = "src/lib/server/maswali-dal.ts";
const SVC = "src/lib/server/maswali-service.ts";
const BATCH = "src/lib/maswali-seal-batch.ts";
const INTEGRITY = "src/lib/server/maswali-integrity.ts";

export const MUTATIONS = [
  {
    name: "(1) the freeze is removed: a question's English text becomes patchable after the open",
    file: DAL,
    from: "const QUESTION_PATCHABLE: Record<string, (v: unknown) => unknown> = {\n  outcome: (v) => v,",
    to: "const QUESTION_PATCHABLE: Record<string, (v: unknown) => unknown> = {\n  textEn: (v) => v,\n  outcome: (v) => v,",
    expect: "4.2 · ⛔ questionStore.patch refuses 'textEn'",
    suite: "engine",
  },
  {
    name: "(2) the close guard is off by one minute (29 minutes pass for 30)",
    file: SVC,
    from: "  if (closeMs > earliest - rules.minLockBufferMinutes * 60_000) {",
    to: "  if (closeMs > earliest - rules.minLockBufferMinutes * 60_000 + 60_000) {",
    expect: "2.10 · ⛔ …and at 18:29",
    suite: "engine",
  },
  {
    name: "(3) a void reserve is not skipped: it stands in for a voided main",
    file: "src/lib/maswali-score.ts",
    from: "  const usable = reserves.filter((q) => q.outcome === \"YES\" || q.outcome === \"NO\").map((q) => slotOf(\"RESERVE\", q.ordinal));",
    to: "  const usable = reserves.filter((q) => q.outcome !== null).map((q) => slotOf(\"RESERVE\", q.ordinal));",
    expect: "1 · v=1 reserves-void=1 ",
    suite: "score",
  },
  {
    name: "(4) the close is stamped twice: the store's claim no longer checks the week is still open",
    file: DAL,
    from: "    if (!cur || cur.state !== \"OPEN\" || cur.closedAt != null) return false;",
    to: "    if (!cur) return false;",
    expect: "5.9 · ⛔ a second stampClose loses the claim",
    suite: "engine",
  },
  {
    name: "(5) a question can be sealed after the week settled",
    file: SVC,
    from: "    if (week.state === \"SETTLED\" || week.state === \"VOIDED\" || week.state === \"DRAFT\") return refuse(",
    to: "    if (week.state === \"VOIDED\" || week.state === \"DRAFT\") return refuse(",
    expect: "9.6 · ⛔ nothing can be sealed on a SETTLED week",
    suite: "engine",
  },
  {
    name: "(6) the floor is forgotten: J is only R + S",
    file: "src/lib/maswali-money.ts",
    from: "  const J = Math.max(floor, R + S);",
    to: "  const J = R + S;",
    expect: "2.2 · week 2",
    suite: "money",
  },
  {
    name: "(7) the top-up loses its max(0, …): a week above the floor gets a negative top-up for its dust",
    file: "src/lib/maswali-money.ts",
    from: "  const U = Math.max(0, F + paid - (R + S));",
    to: "  const U = F + paid - (R + S);",
    expect: "no top-up when R + S already reaches the floor",
    suite: "money",
  },
  {
    name: "(8) a partial bulk seal skips the device audit until every row succeeds",
    file: BATCH,
    from: "  if (sealed.length) {",
    to: "  if (sealed.length && !failure) {",
    expect: "7.8 · ⭐ a partial batch still records exactly",
    suite: "engine",
  },
  {
    name: "(9) second-officer confirmation ignores a changed outcome",
    file: SVC,
    from: '    if (q.outcome !== input.expectedOutcome || q.sealedAt !== input.expectedSealedAt) {\n      return refuse("This seal changed since you reviewed it. Refresh the week and read the result again.");\n    }',
    to: '    if (q.sealedAt !== input.expectedSealedAt) {\n      return refuse("This seal changed since you reviewed it. Refresh the week and read the result again.");\n    }',
    expect: "7.2 · ⛔ a changed outcome cannot be confirmed",
    suite: "engine",
  },
  {
    name: "(10) second-officer confirmation ignores a changed seal timestamp",
    file: SVC,
    from: '    if (q.outcome !== input.expectedOutcome || q.sealedAt !== input.expectedSealedAt) {\n      return refuse("This seal changed since you reviewed it. Refresh the week and read the result again.");\n    }',
    to: '    if (q.outcome !== input.expectedOutcome) {\n      return refuse("This seal changed since you reviewed it. Refresh the week and read the result again.");\n    }',
    expect: "7.3 · ⛔ even a same-outcome reseal",
    suite: "engine",
  },
  {
    name: "(11) the bulk form erases every input after a partial seal",
    file: BATCH,
    from: "  return remaining;",
    to: "  return {};",
    expect: "7.9 · the form clears only landed picks",
    suite: "engine",
  },
  {
    name: "(12) the admin action bypasses the batch device note",
    file: "src/app/admin/maswali/actions.ts",
    from: "    (sealed) => noteDevice(session.userId, weekId, sealed),",
    to: "    async () => {},",
    expect: "7.13 · the real admin action gives the batch helper",
    suite: "engine",
  },
  {
    name: "(13) the seal form clears all chosen inputs instead of only landed slots",
    file: "src/app/admin/maswali/[weekId]/week-controls.tsx",
    from: "withoutSealedPicks(current, result.sealed)",
    to: "withoutSealedPicks(current, chosen.map((row) => row.slot))",
    expect: "7.14 · the real seal form clears only returned successes",
    suite: "engine",
  },
  {
    name: "(14) bulk input accepts a question slot outside the week",
    file: BATCH,
    from: "row.slot < 1 || row.slot > 15 ||",
    to: "false ||",
    expect: "7.16 · ⛔ only integer question slots",
    suite: "engine",
  },
  {
    name: "(15) bulk input accepts the same slot twice",
    file: BATCH,
    from: "    if (seen.has(row.slot)) return `Slot ${row.slot} appears more than once.`;",
    to: "    if (false) return `Slot ${row.slot} appears more than once.`;",
    expect: "7.17 · ⛔ duplicate slots cannot partially seal",
    suite: "engine",
  },
  {
    name: "(16) a resolved but unrecorded device audit is treated as complete",
    file: BATCH,
    from: "      if (!audited) auditWarning = SEAL_DEVICE_AUDIT_WARNING;",
    to: "      if (false) auditWarning = SEAL_DEVICE_AUDIT_WARNING;",
    expect: "7.19 · ⛔ a resolved but unrecorded device audit",
    suite: "engine",
  },
  {
    name: "(17) the note ignores a durable ADMIN or COMPLIANCE audit failure",
    file: INTEGRITY,
    from: "    return historyReadable && device.recorded && newDeviceRecorded;",
    to: "    return historyReadable;",
    expect: "7.20 · ⛔ an ADMIN audit that resolves unrecorded",
    suite: "engine",
  },
  {
    name: "(18) an incomplete device history is called a new device",
    file: INTEGRITY,
    from: "    const historyReadable = past !== null && (matched || !past.truncated);",
    to: "    const historyReadable = past !== null;",
    expect: "7.22 · ⛔ truncated seal history never invents",
    suite: "engine",
  },
  {
    name: "(19) a void action drops its landed-seal audit warning",
    file: "src/app/admin/maswali/actions.ts",
    from: "    try { refresh(weekId); } catch { /* The seal already landed; the client refreshes too. */ }\n    return { ok: true, weekId, auditWarning: audited ? null : SEAL_DEVICE_AUDIT_WARNING };",
    to: "    try { refresh(weekId); } catch { /* The seal already landed; the client refreshes too. */ }\n    return { ok: true, weekId, auditWarning: null };",
    expect: "7.24 · successful void and correction actions",
    suite: "engine",
  },
  {
    name: "(20) the seal form drops a successful action's audit warning",
    file: "src/app/admin/maswali/[weekId]/week-controls.tsx",
    from: "      onWarning?.(r.auditWarning ?? null);",
    to: "      void r.auditWarning;",
    expect: "7.24 · successful void and correction actions",
    suite: "engine",
  },
  {
    name: "(21) a correction records blank evidence",
    file: SVC,
    from: '  expectedOutcome: MaswaliOutcome; expectedSealedAt: string; officerId: string; now?: Date;\n}): Promise<Result> {\n  const nowMs = (input.now ?? new Date()).getTime();\n  const evidence = input.evidence.trim();\n  if (evidence.length < 10) return refuse("A seal records its evidence (at least 10 characters).");',
    to: '  expectedOutcome: MaswaliOutcome; expectedSealedAt: string; officerId: string; now?: Date;\n}): Promise<Result> {\n  const nowMs = (input.now ?? new Date()).getTime();\n  const evidence = input.evidence.trim();\n  if (false) return refuse("A seal records its evidence (at least 10 characters).");',
    expect: "6.10a · ⛔ a correction without evidence",
    suite: "engine",
  },
  {
    name: "(22) a correction accepts an outcome outside the closed list",
    file: SVC,
    from: '  if (input.outcome !== "YES" && input.outcome !== "NO" && input.outcome !== "VOID") return refuse("A result is YES, NO or VOID.");\n  if (input.outcome === "VOID" && !isMaswaliVoidReason(input.voidReason)) return refuse("A void names its ground from the closed list (MR-15).");\n  if (input.outcome !== "VOID" && input.voidReason) return refuse("Only a VOID carries a void ground.");\n  if ((input.expectedOutcome',
    to: '  if (false) return refuse("A result is YES, NO or VOID.");\n  if (input.outcome === "VOID" && !isMaswaliVoidReason(input.voidReason)) return refuse("A void names its ground from the closed list (MR-15).");\n  if (input.outcome !== "VOID" && input.voidReason) return refuse("Only a VOID carries a void ground.");\n  if ((input.expectedOutcome',
    expect: "6.10b · ⛔ an outcome outside YES, NO, VOID",
    suite: "engine",
  },
  {
    name: "(23) a correction accepts a premature not-played VOID",
    file: SVC,
    from: '    if (q.outcome !== input.expectedOutcome || q.sealedAt !== input.expectedSealedAt) {\n      return refuse("The seal changed; reload the week and review it again before correcting it.");\n    }\n    if (input.outcome === "VOID" && !voidGroundAvailable(input.voidReason as MaswaliVoidReason, Date.parse(q.voidDeadlineAt), nowMs)) {',
    to: '    if (q.outcome !== input.expectedOutcome || q.sealedAt !== input.expectedSealedAt) {\n      return refuse("The seal changed; reload the week and review it again before correcting it.");\n    }\n    if (false) {',
    expect: "6.10c · ⛔ a correction cannot use not-played",
    suite: "engine",
  },
  {
    name: "(24) a correction bypasses its reviewed seal version",
    file: SVC,
    from: '    if (q.outcome !== input.expectedOutcome || q.sealedAt !== input.expectedSealedAt) {\n      return refuse("The seal changed; reload the week and review it again before correcting it.");\n    }',
    to: '    if (false) {\n      return refuse("The seal changed; reload the week and review it again before correcting it.");\n    }',
    expect: "6.11a · ⛔ concurrent corrections",
    suite: "engine",
  },
  {
    name: "(25) a same-clock correction reuses the reviewed seal version",
    file: SVC,
    from: '    const revisedAt = new Date(Math.max(nowMs, Date.parse(q.sealedAt!) + 1)).toISOString();',
    to: '    const revisedAt = new Date(nowMs).toISOString();',
    expect: "6.11a · ⛔ concurrent corrections",
    suite: "engine",
  },
];
