/**
 * Anchors for `red:second-officer-switch` (programme FEE-TAX-2026-10, release R1; ruling 6 of 2026-10-24) — each puts back one
 * way the Owner's "Second-officer checks" could be built wrong, in the real source, and names the assertion that must turn
 * red, and in which suite:
 *   · switch    — `test:second-officer-switch` (`scripts/second-officer-switch.test.mts`, the memory store)
 *   · open-lock — `test:maswali-open-lock` (`scripts/maswali-open-lock.test.mts`, the memory store)
 * DATA, so `test:red-anchors` can audit that every `from` still resolves exactly once without running the harness.
 *
 * The kinds the release asks for, and two more that hold its other half:
 *   (a) a check that SKIPS the gate even when the setting is ON — one per gate site: the same officer then acts under a
 *       stored ON, so the check's own ON case (`N.a · ON`) goes red;
 *   (b) a failed read treated as OFF — each way a read fails, and a row the version cannot understand;
 *   (c) a stored ON ignored — the Owner's act to turn the checks back on would change nothing;
 *   (d) the Millionea open lock dropped;
 *   (o) a check that ignores the setting's OFF — it refuses the same officer under a stored OFF (`N.c · OFF`);
 *   (e) nothing stored read as ON — the Owner's ruling (OFF from the release, with no click) undone in code.
 * `expect` is the start of the case's own label: any other red is WRONG-ASSERTION.
 * ⛔ A red anchor quotes SOURCE. Editing one of these lines must be paired with re-anchoring here.
 * ⚠️ This file carries no backslash: line breaks are built from their code point.
 */
const NL = String.fromCharCode(10);
const POLICY = "src/lib/server/second-officer-policy.ts";
const SVC = "src/lib/server/maswali-service.ts";
const OBJECTIONS = "src/lib/server/maswali-objections.ts";
const TWO_OFFICER = "src/lib/server/two-officer.ts";
const KYC_RISK = "src/lib/server/kyc-risk.ts";
const PACK = "src/lib/server/report-pack.ts";
const PURGE = "src/app/admin/retention/purge-stage1-store.ts";
const AML = "src/app/admin/aml/stage1-store.ts";
const ADJUST = "src/app/admin/players/[id]/adjust-stage1-store.ts";
const CLASSIC = "src/lib/server/objections-service.ts";
const STAGING = "src/lib/server/contacts/import-staging.ts";

const DRAFTER_BAR = `    if (secondReader && week.createdBy === input.officerId) return refuse(`;
const EDITORS = `    const authorship = secondReader ? await draftAuthorship(week, current, input.readHistory) : { editors: new Set<string>() };`;
const CORRECTION = `    if (authorOnly) {${NL}      const author = await presentResultAuthor(q, week.marketId);`;
const RULING_BLOCK = `    if (secondOfficer) {${NL}      if (q.sealedBy === input.officerId || q.stage2By === input.officerId) {`;
const AML_STEP = `  if (grossTzs < TWO_PERSON_THRESHOLD_TZS || !(await secondOfficerChecksOn())) return`;
const ADJUST_OFF = `  if (!(await secondOfficerChecksOn())) {${NL}    return { kind: "apply", countersigns: first && first.signed === signed ? first : null, large: true };`;
const HOLD_BAR = `  if (await secondOfficerChecksOn()) return true;`;
const IMPORT_RULE = `  return createdBy === officerId || (await isAdmin(officerId)) || !(await secondOfficerChecksOn());`;

export const MUTATIONS = [
  // ── (a) a check that skips the gate even when the setting is ON: the same officer acts under a stored ON ─────────────
  { name: "(a1) Millionea: the drafter's bar is skipped even while the checks are ON", file: SVC,
    from: DRAFTER_BAR, to: `    if (false && secondReader && week.createdBy === input.officerId) return refuse(`, expect: "1.a · ON", suite: "switch" },
  { name: "(a2) Millionea: the editors' bar and its history read are skipped even while the checks are ON", file: SVC,
    from: EDITORS, to: `    const authorship = false ? await draftAuthorship(week, current, input.readHistory) : { editors: new Set<string>() };`, expect: "2.a · ON", suite: "switch" },
  { name: "(a3) Millionea: any officer corrects a result even while the checks are ON", file: SVC,
    from: CORRECTION, to: `    if (false) {${NL}      const author = await presentResultAuthor(q, week.marketId);`, expect: "3.a · ON", suite: "switch" },
  { name: "(a4) Millionea: a question's sealer and confirmer rule on its objections even while the checks are ON", file: OBJECTIONS,
    from: `      if (q.sealedBy === input.officerId || q.stage2By === input.officerId) {`, to: `      if (false) {`, expect: "4.a · ON", suite: "switch" },
  { name: "(a5) Millionea: the present result's author rules on its next objection even while the checks are ON", file: OBJECTIONS,
    from: `      if (lastUpheldRuler(await db.objection.listForMarket(o.marketId), q.slot) === input.officerId) {`, to: `      if (false) {`, expect: "5.a · ON", suite: "switch" },
  { name: "(a6) identity: the high-risk maker-checker and its risk read are skipped even while the checks are ON", file: KYC_RISK,
    from: `  const checksOn = await secondOfficerChecksOn();`, to: `  const checksOn = false;`, expect: "6.a · ON", suite: "switch" },
  { name: "(a7) the monthly pack's preparer approves it even while the checks are ON", file: PACK,
    from: `  return secondOfficerGate({${NL}    makerId: pack.preparedBy,`, to: `  return null && secondOfficerGate({${NL}    makerId: pack.preparedBy,`, expect: "7.a · ON", suite: "switch" },
  { name: "(a8) the officer who recorded a purge's reason completes it even while the checks are ON", file: PURGE,
    from: `  return secondOfficerGate({${NL}    makerId: stage1.actorId,`, to: `  return null && secondOfficerGate({${NL}    makerId: stage1.actorId,`, expect: "8.a · ON", suite: "switch" },
  { name: "(a9) a held large withdrawal is released by one approval even while the checks are ON", file: AML,
    from: AML_STEP, to: `  if (true || grossTzs < TWO_PERSON_THRESHOLD_TZS || !(await secondOfficerChecksOn())) return`, expect: "9.a · ON", suite: "switch" },
  { name: "(a10) a large balance adjustment applies on one submission even while the checks are ON", file: ADJUST,
    from: ADJUST_OFF, to: `  if (true) {${NL}    return { kind: "apply", countersigns: first && first.signed === signed ? first : null, large: true };`, expect: "10.a · ON", suite: "switch" },
  { name: "(a11) the officer who placed a poll hold rules on it even while the checks are ON", file: CLASSIC,
    from: HOLD_BAR, to: `  if (false) return true;`, expect: "11.a · ON", suite: "switch" },
  { name: "(a12) another officer carries a contacts import on even while the checks are ON", file: STAGING,
    from: IMPORT_RULE, to: `  return true || createdBy === officerId || (await isAdmin(officerId)) || !(await secondOfficerChecksOn());`, expect: "12.a · ON", suite: "switch" },

  // ── (b) a failed read treated as OFF — a database fault would remove the second officer ──────────────────────────
  { name: "(b1) a read that THROWS reads OFF", file: POLICY,
    from: `    return { source: "unreadable", on: true };`, to: `    return { source: "unreadable", on: false } as never;`, expect: "0.2 ·", suite: "switch" },
  { name: "(b2) a read that answers it could not be asked reads OFF", file: POLICY,
    from: `  if (!res.ok) return { source: "unreadable", on: true };`, to: `  if (!res.ok) return { source: "unreadable", on: false } as never;`, expect: "0.3 ·", suite: "switch" },
  { name: "(b3) a stored row this version cannot understand reads OFF", file: POLICY,
    from: `  if (!p) return { source: "malformed", on: true };`, to: `  if (!p) return { source: "malformed", on: false } as never;`, expect: "0.4 ·", suite: "switch" },

  // ── (c) a stored ON ignored — the Owner's act to turn the checks back on changes nothing ─────────────────────────
  { name: "(c) a stored, well-formed ON reads OFF", file: POLICY,
    from: `  return { source: "stored", on: p.on, changedBy: p.changedBy, changedAt: p.changedAt, reason: p.reason };`,
    to: `  return { source: "stored", on: false, changedBy: p.changedBy, changedAt: p.changedAt, reason: p.reason };`, expect: "0.6 ·", suite: "switch" },

  // ── (d) the Millionea open lock dropped ─────────────────────────────────────────────────────────────────────────
  { name: "(d) the S8 hold is dropped: a public week opens on the old fee model", file: SVC,
    from: `  if (held) return refuse(held);${NL}`, to: ``, expect: "1.1 ·", suite: "open-lock" },

  // ── (o) a check that ignores the setting's OFF: the same officer stays refused under a stored OFF ───────────────────
  { name: "(o1) Millionea: the drafter's bar ignores the setting", file: SVC,
    from: DRAFTER_BAR, to: `    if (week.createdBy === input.officerId) return refuse(`, expect: "1.c · OFF", suite: "switch" },
  { name: "(o2) Millionea: the editors' bar and its history read ignore the setting", file: SVC,
    from: EDITORS, to: `    const authorship = await draftAuthorship(week, current, input.readHistory);`, expect: "2.c · OFF", suite: "switch" },
  { name: "(o3) Millionea: the correction asks who set the result whatever the setting says", file: SVC,
    from: CORRECTION, to: `    if (true) {${NL}      const author = await presentResultAuthor(q, week.marketId);`, expect: "3.c · OFF", suite: "switch" },
  { name: "(o4) Millionea: a question's own officers are barred from its objections whatever the setting says", file: OBJECTIONS,
    from: RULING_BLOCK, to: `    if (true) {${NL}      if (q.sealedBy === input.officerId || q.stage2By === input.officerId) {`, expect: "4.c · OFF", suite: "switch" },
  { name: "(o6) identity: the KYC maker-checker ignores the setting", file: KYC_RISK,
    from: `  if (!checksOn) return { ok: true, riskScore: risk?.score ?? null, makerChecker: false };`, to: ``, expect: "6.c · OFF", suite: "switch" },
  { name: "(o7) the second-officer gate (the pack's approval, the purge's stage 2) asks the plain comparison whatever the setting says", file: TWO_OFFICER,
    from: `  if (!(await secondOfficerChecksOn())) return null;${NL}  return twoOfficerGate(p);`, to: `  return twoOfficerGate(p);`, expect: "7.c · OFF", suite: "switch" },
  { name: "(o9) a held large withdrawal needs two approvers whatever the setting says", file: AML,
    from: AML_STEP, to: `  if (grossTzs < TWO_PERSON_THRESHOLD_TZS) return`, expect: "9.c · OFF", suite: "switch" },
  { name: "(o10) a large balance adjustment needs a second officer whatever the setting says", file: ADJUST,
    from: `${ADJUST_OFF}${NL}  }`, to: ``, expect: "10.c · OFF", suite: "switch" },
  { name: "(o11) the officer who placed a poll hold is barred from it whatever the setting says", file: CLASSIC,
    from: HOLD_BAR, to: `  return true;`, expect: "11.c · OFF", suite: "switch" },
  { name: "(o12) a contacts import stays its creator's whatever the setting says", file: STAGING,
    from: IMPORT_RULE, to: `  return createdBy === officerId || (await isAdmin(officerId));`, expect: "12.c · OFF", suite: "switch" },

  // ── (e) nothing stored read as ON — the Owner's ruling undone in code ───────────────────────────────────────────
  { name: "(e) nothing stored reads ON again: the Owner's ruling of 2026-10-24 needs a click after the release", file: POLICY,
    from: `  if (res.value === null || res.value === undefined) return { source: "absent", on: false };`,
    to: `  if (res.value === null || res.value === undefined) return { source: "absent", on: true } as never;`, expect: "0.1 ·", suite: "switch" },
];
