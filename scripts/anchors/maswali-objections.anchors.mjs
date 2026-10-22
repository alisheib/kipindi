/**
 * Anchors for `red:maswali-objections` (MASWALI-BUILD S7-OB; MASWALI-PLAN §3 MR-16, MB-23) — each puts back one way the
 * Millionea objection door could break its rule, in the real source, and names the assertion of
 * `scripts/lib/maswali-objections-child.mts` that must turn red on the memory store. DATA, so `test:red-anchors` can audit
 * that every `from` still resolves exactly once without running the harness.
 *
 * `expect` is the start of the case's own label: any other red is WRONG-ASSERTION.
 * ⚠️ MEMORY CHILD ONLY, like `red:maswali-fence`: the PostgreSQL twins of the store's own rules (the partial unique index,
 * the conditional update) are read by the suite's PostgreSQL child itself (§6.5, §6.6) through the real DAL on a migrated
 * cluster; their memory twins are planted here.
 *
 * ⛔ A red anchor quotes SOURCE. Editing one of these lines must be paired with re-anchoring here.
 */
const DOOR = "src/lib/server/maswali-objections.ts";
const STORE = "src/lib/server/store.ts";
const CLASSIC = "src/lib/server/objections-service.ts";
const NL = String.fromCharCode(10);

export const MUTATIONS = [
  // ── the window ────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    name: "(1) a filing before the graded set is final (no window yet)",
    file: DOOR,
    from: `  if (week.state !== "RESOLVING" || !week.gradedSetFinalAt || !week.objectionsCloseAt) return { state: "NOT_YET" };${NL}`,
    to: "",
    expect: "1.1 ·",
  },
  {
    name: "(2) a filing at the window's close lands (the close itself counted open)",
    file: DOOR,
    from: "  return nowMs < Date.parse(week.objectionsCloseAt)",
    to: "  return nowMs <= Date.parse(week.objectionsCloseAt)",
    expect: "1.9 ·",
  },
  // ── standing ──────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    name: "(3) standing without a live ticket (a cancelled ticket, or none, files)",
    file: DOOR,
    from: `  if ((await ticketStore.countLiveForUser(week.id, userId)) === 0) return { eligible: false, why: "NO_TICKET" };${NL}`,
    to: "",
    expect: "1.6 ·",
  },
  {
    name: "(4) the door's own one-per-question read dropped (the player is offered a second case on one question)",
    file: DOOR,
    from: `  if (mine) return { eligible: false, why: mine.status === "OPEN" ? "ALREADY_OBJECTED" : "ALREADY_DECIDED" };${NL}`,
    to: "",
    expect: "1.4 ·",
  },
  {
    name: "(5) the memory store's one-per-key dropped (the partial unique index's twin)",
    file: STORE,
    from: "      if (o.questionOrdinal != null && (Array.from(store.objections.values()) as StoredObjection[])",
    to: "      if (false && (Array.from(store.objections.values()) as StoredObjection[])",
    expect: "6.5 ·",
  },
  // ── the ruling ────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    name: "(6) the sealer rules on their own seal",
    file: DOOR,
    from: "    if (q.sealedBy === input.officerId || q.stage2By === input.officerId) {",
    to: "    if (false) {",
    expect: "2.2 ·",
  },
  {
    name: "(7) the seal's confirmer (the two-officer rule's second signature) rules on it",
    file: DOOR,
    from: "    if (q.sealedBy === input.officerId || q.stage2By === input.officerId) {",
    to: "    if (q.sealedBy === input.officerId) {",
    expect: "2.13 ·",
  },
  {
    name: "(8) the objector rules on their own case",
    file: DOOR,
    from: "    if (o.userId === input.officerId) {",
    to: "    if (false) {",
    expect: "2.14 ·",
  },
  {
    name: "(9) an officer holding a live ticket in the week rules",
    file: DOOR,
    from: "    if ((await ticketStore.countLiveForUser(week.id, input.officerId, tx ?? undefined)) > 0) {",
    to: "    if (false) {",
    expect: "2.15 ·",
  },
  {
    name: "(22) the officer whose upheld ruling set a question's present result rules on its next objection",
    file: DOOR,
    from: "    if (lastUpheldRuler(await db.objection.listForMarket(o.marketId), q.slot) === input.officerId) {",
    to: "    if (false) {",
    expect: "2.17 ·",
  },
  {
    name: "(10) the result reviewed is not the result ruled (a stale ruling lands, two REVERSEs can stack)",
    file: DOOR,
    from: "    if (q.outcome !== input.expectedOutcome || q.sealedAt !== input.expectedSealedAt) {",
    to: "    if (false) {",
    expect: "2.3 ·",
  },
  {
    name: "(11) the case is not read again under the lock (a decided case is ruled again — only the store's update stops it)",
    file: DOOR,
    from: `    if (o.status !== "OPEN") return refuse("This objection has already been decided.");${NL}`,
    to: "",
    expect: "2.6 ·",
  },
  {
    name: "(12) the memory store rules on a decided case (the conditional update's twin)",
    file: STORE,
    from: `      if (!o || o.status !== "OPEN") return false;${NL}      store.objections.set(id, { ...o, ...patch });`,
    to: `      if (!o) return false;${NL}      store.objections.set(id, { ...o, ...patch });`,
    expect: "6.6 ·",
  },
  {
    name: "(13) an upheld change never restarts the window",
    file: DOOR,
    from: "    const restarted = changed && !week.objectionRestarted;",
    to: "    const restarted = false;",
    expect: "2.8 ·",
  },
  {
    name: "(14) every upheld change restarts the window (never once)",
    file: DOOR,
    from: "    const restarted = changed && !week.objectionRestarted;",
    to: "    const restarted = changed;",
    expect: "2.9 ·",
  },
  {
    name: "(15) a void is REVERSEd (a void has no side to flip)",
    file: DOOR,
    from: "      if (q.outcome === \"VOID\") return refuse(`${slotLabel(q.slot)} is void: a void is reversed by REINSTATE, with its result.`);",
    to: "",
    expect: "3.1 ·",
  },
  {
    name: "(16) a void ruled off the closed list of grounds",
    file: DOOR,
    from: `  if (input.ruling === "VOID" && !isMaswaliVoidReason(voidReason)) return refuse("A void names its ground from the closed list (MR-15).");${NL}`,
    to: "",
    expect: "3.2 ·",
  },
  // ── the Yes/No doors' fences ──────────────────────────────────────────────────────────────────────────────────────
  {
    name: "(17) the Yes/No officer queue lists Millionea cases",
    file: CLASSIC,
    from: "  const all = (await db.objection.list()).filter((o) => o.questionOrdinal == null);",
    to: "  const all = await db.objection.list();",
    expect: "6.1 ·",
  },
  {
    name: "(18) the Yes/No rejection rules a Millionea case",
    file: CLASSIC,
    from: `  if (o.questionOrdinal != null) return { ok: false, error: MILLIONEA_RULED_ELSEWHERE, code: "INVALID" };${NL}  if (o.status !== "OPEN") return { ok: false, error: "This objection has already been decided.", code: "INVALID" };${NL}  // Separation of duties`,
    to: `  if (o.status !== "OPEN") return { ok: false, error: "This objection has already been decided.", code: "INVALID" };${NL}  // Separation of duties`,
    expect: "6.2 ·",
  },
  {
    name: "(19) a Millionea ruling signs off its week's market (the memory store's sign-off read)",
    file: STORE,
    from: "        .filter((o) => o.status === \"UPHELD\" && (o.remedy === \"REVERSE\" || o.remedy === \"VOID\") && o.questionOrdinal == null)",
    to: "        .filter((o) => o.status === \"UPHELD\" && (o.remedy === \"REVERSE\" || o.remedy === \"VOID\"))",
    expect: "6.3 ·",
  },
  {
    name: "(20) the Yes/No filing opens on a Millionea week whose market row reads RESOLVED",
    file: CLASSIC,
    from: "  if (!m || isFencedMaswali(m) || (m.status !== \"RESOLVED\" && m.status !== \"VOIDED\")) return { eligible: false, why: \"NOT_ADJUDICATED\" };",
    to: "  if (!m || (m.status !== \"RESOLVED\" && m.status !== \"VOIDED\")) return { eligible: false, why: \"NOT_ADJUDICATED\" };",
    expect: "6.4 ·",
  },
  {
    name: "(21) the Yes/No ruling takes any remedy a form posts",
    file: CLASSIC,
    from: "  if (input.remedy !== \"VOID\" && input.remedy !== \"REVERSE\") {",
    to: "  if (false) {",
    expect: "6.7 ·",
  },
];
