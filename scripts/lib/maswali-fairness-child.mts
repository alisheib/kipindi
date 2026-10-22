/**
 * test:maswali-fairness — WHAT /fairness PUBLISHES FOR MILLIONEA AND ONE OWNER'S INCLUSION PROOF, ON BOTH STORES; and, in the
 * memory child only, the static half of MASWALI-BUILD S6 lane L (MASWALI-PLAN §7b S6 items 1 and 10; MB-33, MB-69, MB-70,
 * MB-71).
 *
 *   npx tsx scripts/maswali-fairness.test.mts     (npm run test:maswali-fairness)
 *
 *   §F the commitments (`millioneaFairnessView`): hidden reads nothing; found by state, never newest-N; public only; the
 *      close's stamp exactly as stamped; final weeks link to the register
 *   §P the proof (`millioneaTicketProof`): the owner only, one answer for every other serial (MB-95); awaiting the close,
 *      cancelled, committed — through the settlement and a week void; a drive ticket; two fault fixtures caught as a
 *      mismatch and undone where they are made; the week's tree kept once it reproduces the stamp, read with no ticket
 *      list, equal to the RFC's transcription at every index, and bounded (review #9)
 *   §W the binding figures (`millioneaBindingFigures`): a week on sale is printed from its own record — the open an officer
 *      made, the close as it stands, the void hours its questions carry — never from the rules its open froze (review #8)
 *   §C the chat (memory): no facts → today's prompt byte for byte, against origin/main's own build; facts → every scoping
 *      swap lands once, Millionea's section before KEY PAGES with every figure driven at a non-default value; the
 *      journey's swaps still land; nothing below ACTIVE; no assurance and no house word in what was added
 *   §L the binding rules (memory): the version and its text hash, the figures driven at non-default values in three
 *      languages, the gate; the chooser's slots keep today's expressions as their else arms
 *   §H the hooks (memory): /help's block and its scope line; /fairness's one line; the proof route's gate, sign-in and 404,
 *      and its loading and error states printing no product word
 *
 * ⏱ The weeks are the money world's (`maswali-money-world.mts`): two and more weeks ahead, opened, closed and sealed on
 * their own clocks; purchases and the free cancel read the real clock. ⛔ Every week and ticket goes through the product's
 * own doors. The two FIXTURES OF A FAULT (§P.6: a stored leaf, then a stored salt) are labelled where they are made and
 * undone there, on both stores.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
const STORE = process.env.HB_MONEY_STORE ?? "unknown";
process.env.SESSION_SECRET ??= "maswali-fairness-session-secret-0123456789abcdef";

const { loadMaswaliWorld } = await import("./maswali-money-world.mts");
const W: any = await loadMaswaliWorld();
const { dal, money } = W;
const FAIR: any = await import("../../src/lib/server/maswali-fairness.ts");
const COMMIT: any = await import("../../src/lib/maswali-commitment.ts");
const { readFileSync } = await import("node:fs");
const { execFileSync } = await import("node:child_process");

process.exitCode = 1;
let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) pass++; else fail++;
  console.log(`${cond ? "PASS" : "FAIL"} [${STORE}] ${label}${detail ? ` — ${detail}` : ""}`);
};
const NL = String.fromCharCode(10);
const CR = String.fromCharCode(13);
const section = (title: string) => console.log(`${NL}${title}`);
const J = (x: unknown) => JSON.stringify(x);
const DAY = 86_400_000;
const HEX64 = /^[0-9a-f]{64}$/;
const read = (rel: string) => readFileSync(rel, "utf8").split(CR + NL).join(NL);
const count = (s: string, t: string) => (t ? s.split(t).length - 1 : 0);
const SERIAL_UNKNOWN = "MLN-2099-W01-000001";

await W.setup({ guarantee: 20_000_000 });
const P1 = await W.user({ balance: 50_000 });
const P2 = await W.user({ balance: 50_000 });
const P3 = await W.user({ balance: 50_000 });
const STRANGER = await W.user({ balance: 10_000 });
const ADMITTED = { visible: true };
const view = () => FAIR.millioneaFairnessView(ADMITTED);
/** The proof route's kept trees, reached as the module keeps them: on `globalThis` under its registered symbol — no mutator
 *  is exported (round 3, L5). Made here first if no proof has been built yet; the module adopts the same object. */
const proofTrees = (): { trees: Map<string, unknown>; building: Map<string, unknown>; bound: number } =>
  ((globalThis as any)[Symbol.for("millionea.proof-trees")] ??= { trees: new Map(), building: new Map(), bound: FAIR.MILLIONEA_PROOF_TREES });
const keptTrees = () => [...proofTrees().trees.keys()];
const resetTrees = (bound?: number) => { proofTrees().trees.clear(); if (bound !== undefined) proofTrees().bound = bound; };

// ── §F · the commitments ─────────────────────────────────────────────────────────────────────────────────────────
section("§F · the commitments /fairness publishes");
{
  const real = dal.weekStore.list;
  let reads = 0;
  dal.weekStore.list = async (...a: any[]) => { reads++; return real.apply(dal.weekStore, a); };
  let hidden: unknown = "unset";
  try { hidden = await FAIR.millioneaFairnessView({ visible: false }); } finally { dal.weekStore.list = real; }
  ok("F.1 · ⛔ hidden: the summary is null and not one week is read — a Yes/No or Up & Down reader's /fairness costs nothing and shows nothing",
    hidden === null && reads === 0, J({ hidden, reads }));
  const empty = await view();
  ok("F.2 · admitted, before any week opened: nothing current and nothing final (the section says no week has opened)",
    !!empty && empty.current.length === 0 && empty.recent.length === 0, J(empty));
}

const { week: A, start: aStart } = await W.openWeek({ weeksAhead: 2 });
{
  const v = await view();
  const row = v?.current?.[0];
  ok("F.3 · a public week on sale: its question set's hash and the instant the open stamped it; no root, no count, no close yet; not on the register",
    v?.current.length === 1 && row?.code === A.code && row.state === "OPEN" && HEX64.test(row.questionSetHash ?? "") && row.questionSetHash === A.questionSetHash
      && row.hashPublishedAt === A.opensAt && row.closesAt === A.closesAt && row.ticketMerkleRoot === null && row.ticketCount === null
      && row.closedAt === null && row.onRegister === false && v.recent.length === 0, J(v));
}
const { week: D } = await W.openWeek({ weeksAhead: 3, visibility: "DRIVE" });
{
  const v = await view();
  const drives = await dal.weekStore.list({ visibility: "DRIVE" });
  ok("F.4 · ⛔ a DRIVE week (OD-21) is never in the summary — and the population is real: the drive week is open beside the public one",
    drives.some((w: any) => w.id === D.id && w.state === "OPEN") && v?.current.length === 1 && v.current[0].code === A.code
      && ![...v.current, ...v.recent].some((r: any) => r.code === D.code), J({ current: v?.current.map((r: any) => r.code), drive: D.code }));
}
for (const ahead of [6, 7, 8]) {
  const start = W.weekStartAhead(ahead);
  const c = await W.svc.createWeek({ weekStartMs: start, visibility: "PUBLIC", questions: W.questions(start), officerId: "usr_mln_drafter", now: new Date(start - 3 * DAY) });
  if (!c.ok) console.log(`  (draft at +${ahead} refused: ${c.error})`);
}
{
  const drafts = await dal.weekStore.list({ visibility: "PUBLIC", states: ["DRAFT"] });
  const v = await view();
  ok("F.5 · ⛔ found by state, never newest-N (S5 review L1): three newer drafts neither appear nor push the week on sale out",
    drafts.length >= 3 && v?.current.length === 1 && v.current[0].code === A.code && ![...v.current, ...v.recent].some((r: any) => r.state === "DRAFT"),
    J({ drafts: drafts.length, current: v?.current.map((r: any) => r.code) }));
}

// ── §P · the proof, before the close ─────────────────────────────────────────────────────────────────────────────
section("§P · one owner's inclusion proof");
const b1 = await W.buy(P1, A.id, [W.WIN, W.WIN, W.LOSE], { key: "fair-p1-a-0001" });
const b2 = await W.buy(P2, A.id, [W.LOSE, W.WIN], { key: "fair-p2-a-0001" });
const b3 = await W.buy(P3, A.id, [W.WIN], { key: "fair-p3-a-0001" });
const bd = await W.buy(P2, D.id, [W.WIN], { key: "fair-p2-d-0001" });
const t1 = b1.ok ? b1.data.maswali.tickets : [];
const t2 = b2.ok ? b2.data.maswali.tickets : [];
const t3 = b3.ok ? b3.data.maswali.tickets : [];
const td = bd.ok ? bd.data.maswali.tickets : [];
ok("P.0 · the population: six tickets bought through the one bet path — three, two and one in the public week, one in the drive week",
  t1.length === 3 && t2.length === 2 && t3.length === 1 && td.length === 1, J({ b1: b1.ok || b1.error, b2: b2.ok || b2.error, b3: b3.ok || b3.error, bd: bd.ok || bd.error }));
const cancel3 = await money.cancelMaswaliTicket({ userId: P3, positionId: t3[0]?.positionId });
ok("P.0b · …and P3's one ticket is cancelled inside its free window (RULES §2.6), leaving five live in the public week", cancel3.ok === true, J(cancel3));
{
  const p = await FAIR.millioneaTicketProof(P1, t1[0]?.serial);
  ok("P.1 · before the close: the owner's leaf inputs and leaf, recomputed and matching; the root is awaited, so there is no path yet",
    !!p && p.standing === "AWAITING_CLOSE" && p.proof === null && p.verifies === false && p.leafMatches === true && p.ticket.picks === "Y".repeat(15)
      && p.ticket.leaf === t1[0].selectionsHash && /^[0-9a-f]{32}$/.test(p.ticket.salt) && p.week.code === A.code && p.week.ticketMerkleRoot === null
      && p.week.closedAt === null && p.week.ticketCount === null, J(p && { standing: p.standing, picks: p.ticket.picks, match: p.leafMatches }));
  const answers = [
    await FAIR.millioneaTicketProof(STRANGER, t1[0]?.serial),
    await FAIR.millioneaTicketProof(P1, SERIAL_UNKNOWN),
    await FAIR.millioneaTicketProof(P1, "not-a-serial"),
    await FAIR.millioneaTicketProof(P1, 42),
    await FAIR.millioneaTicketProof("", t1[0]?.serial),
  ];
  ok("P.2 · ⛔ MB-95 · someone else's serial, a serial nobody holds, a malformed serial, a non-string and no viewer: one answer — null — so walking serials learns nothing",
    answers.every((a) => a === null), J(answers));
  const lower = await FAIR.millioneaTicketProof(P1, String(t1[0]?.serial).toLowerCase());
  ok("P.2b · CONTROL · the owner's own serial typed in lower case is still theirs (the serial is normalised, as the ticket page reads it)",
    !!lower && lower.serial === t1[0].serial, J(lower && lower.serial));
  const c = await FAIR.millioneaTicketProof(P3, t3[0]?.serial);
  ok("P.3 · a cancelled ticket left the commitment (MR-12): CANCELLED, no path, never verified", !!c && c.standing === "CANCELLED" && c.proof === null && c.verifies === false, J(c && c.standing));
}

await W.svc.closeWeek({ weekId: A.id, now: new Date(Date.parse(A.closesAt) + 60_000) });
const Aclosed = await dal.weekStore.get(A.id);
{
  const v = await view();
  const row = v?.current?.find((r: any) => r.code === A.code);
  ok("F.6 · after the close: the root, the count and the close exactly as the close stamped them (MR-13) — five live tickets, the cancelled one out",
    !!row && row.state === "CLOSED" && row.ticketMerkleRoot === Aclosed.ticketMerkleRoot && HEX64.test(row.ticketMerkleRoot ?? "")
      && row.ticketCount === 5 && Aclosed.ticketCount === 5 && row.closedAt === Aclosed.closedAt && row.onRegister === false, J(row));
}
const live = [...t1, ...t2];
{
  const proofs = await Promise.all(live.map((t: any, i: number) => FAIR.millioneaTicketProof(i < 3 ? P1 : P2, t.serial)));
  const allOk = proofs.every((p: any) => p && p.standing === "COMMITTED" && p.verifies === true && p.proof.size === 5
    && COMMIT.verifyInclusion(p.proof, Aclosed.ticketMerkleRoot) === true && p.proof.leaf === p.ticket.leaf);
  const indexes = proofs.map((p: any) => p?.proof?.index).sort();
  ok("P.4 · after the close: every one of the five live tickets' proofs reaches the stamped root (RFC 6962), each at its own index",
    allOk && J(indexes) === J([0, 1, 2, 3, 4]), J(proofs.map((p: any) => p && [p.standing, p.proof?.index, p.proof?.size])));
  const rows = await dal.ticketStore.listForWeek(A.id);
  const rebuilt = COMMIT.merkleRoot(rows.filter((x: any) => x.status !== "CANCELLED").map((x: any) => ({ ticketId: x.id, leaf: x.selectionsHash })));
  const withCancelled = COMMIT.merkleRoot(rows.map((x: any) => ({ ticketId: x.id, leaf: x.selectionsHash })));
  ok("P.4b · the committed set is the close's own: the non-cancelled tickets rebuild the stamped root, and with the cancelled ticket put back they do not",
    rebuilt === Aclosed.ticketMerkleRoot && withCancelled !== Aclosed.ticketMerkleRoot && rows.length === 6, J({ rebuilt, stamped: Aclosed.ticketMerkleRoot, rows: rows.length }));
  const p0 = proofs[0];
  const otherRoot = COMMIT.toHex(COMMIT.sha256(new TextEncoder().encode("another week")));
  const flipped = COMMIT.leafHash({ weekId: A.id, ticketId: p0.ticket.id, salt: p0.ticket.salt, picks: ["NO", ...Array.from({ length: 14 }, () => "YES")] });
  const reversed = { ...p0.proof, path: [...p0.proof.path].reverse() };
  ok("P.5 · CONTROLS · the same proof against another root is refused, one flipped answer gives another leaf, and the path in the wrong order is refused",
    COMMIT.verifyInclusion(p0.proof, otherRoot) === false && flipped !== p0.ticket.leaf
      && (p0.proof.path.length < 2 || COMMIT.verifyInclusion(reversed, Aclosed.ticketMerkleRoot) === false), J({ path: p0.proof.path.length }));
}
{
  // ⚠️ FIXTURE OF A FAULT, MADE AND UNDONE HERE: one other ticket's stored leaf, then the owner's own salt, as a corrupted
  // row would carry them. The stamped root never moves — that is what the check is measured against.
  const setColumn = async (id: string, column: "selectionsHash" | "salt", value: string) => {
    if (W.onPostgres) await W.prisma().$executeRawUnsafe(`UPDATE "MaswaliTicket" SET "${column}" = $1 WHERE "id" = $2`, value, id);
    else (globalThis as any).__50PICK_MLN_TICKETS.get(id)[column] = value;
  };
  const other = await dal.ticketStore.get(t2[0].ticketId);
  // The kept tree (review #9) is the close's own and is rebuilt only when none is kept: this fixture measures the rebuild,
  // so it starts with none — a kept tree, by design, never reads the rows again (P.6b).
  resetTrees();
  await setColumn(other.id, "selectionsHash", "f".repeat(64));
  const broken = await FAIR.millioneaTicketProof(P1, t1[0].serial);
  const keptAfterMiss = keptTrees();
  await setColumn(other.id, "selectionsHash", other.selectionsHash);
  const mine = await dal.ticketStore.get(t1[0].ticketId);
  await setColumn(mine.id, "salt", "0".repeat(32));
  const saltless = await FAIR.millioneaTicketProof(P1, t1[0].serial);
  await setColumn(mine.id, "salt", mine.salt);
  const healed = await FAIR.millioneaTicketProof(P1, t1[0].serial);
  ok("P.6 · ⛔ a stored row that no longer matches the stamp is reported, never re-rooted: another ticket's leaf changed → MISMATCH (the path misses the stamped root, and that rebuild is not kept); the owner's salt changed → MISMATCH (the leaf no longer recomputes); both undone → COMMITTED",
    broken?.standing === "MISMATCH" && broken.verifies === false && keptAfterMiss.length === 0 && saltless?.standing === "MISMATCH" && saltless.leafMatches === false
      && healed?.standing === "COMMITTED" && healed.verifies === true && healed.leafMatches === true,
    J({ broken: broken && [broken.standing, broken.verifies], kept: keptAfterMiss, saltless: saltless && [saltless.standing, saltless.leafMatches], healed: healed?.standing }));
}
{
  // ⭐ Review #9 · the week's tree is built once and then READ: no ticket list, and exactly the path the rows give.
  const real = dal.ticketStore.listForWeek;
  let reads = 0;
  dal.ticketStore.listForWeek = async (...a: any[]) => { reads++; return real.apply(dal.ticketStore, a); };
  let warm: any[] = [];
  try { warm = await Promise.all(live.map((t: any, i: number) => FAIR.millioneaTicketProof(i < 3 ? P1 : P2, t.serial))); } finally { dal.ticketStore.listForWeek = real; }
  const committed = (await dal.ticketStore.listForWeek(A.id)).filter((x: any) => x.status !== "CANCELLED").map((x: any) => ({ ticketId: x.id, leaf: x.selectionsHash }));
  const same = warm.length === 5 && warm.every((p: any) => p?.standing === "COMMITTED" && J(p.proof) === J(COMMIT.inclusionProof(committed, p.ticket.id)));
  const kept = keptTrees();
  ok("P.6b · ⭐ review #9 · the week's tree is kept once it reproduces the stamp: five proof views read no ticket list at all, and each path is exactly the one rebuilt from every committed row",
    reads === 0 && same && J(kept) === J([`${A.id}|${Aclosed.ticketMerkleRoot}`]), J({ reads, same, kept }));
}
{
  // ⭐ Round 3, L3 · proof views that arrive together while no tree is kept share ONE build — one ticket list read, not five.
  resetTrees();
  const real = dal.ticketStore.listForWeek;
  let reads = 0;
  dal.ticketStore.listForWeek = async (...a: any[]) => { reads++; return real.apply(dal.ticketStore, a); };
  let together: any[] = [];
  try { together = await Promise.all(live.map((t: any, i: number) => FAIR.millioneaTicketProof(i < 3 ? P1 : P2, t.serial))); } finally { dal.ticketStore.listForWeek = real; }
  ok("P.6d · five proof views of one week, arriving together with no tree kept, share one build: ONE ticket list read, every proof committed, nothing left in flight",
    reads === 1 && together.length === 5 && together.every((p: any) => p?.standing === "COMMITTED" && p.verifies === true)
      && proofTrees().building.size === 0 && J(keptTrees()) === J([`${A.id}|${Aclosed.ticketMerkleRoot}`]), J({ reads, building: proofTrees().building.size }));
}
{
  // The kept tree against the RFC's direct transcription, at every index of every small size and at the edges of larger
  // ones; the tickets arrive in reverse order, so the tree sorts them itself, as the stamp's own build does.
  const idOf = (i: number) => `mlt_${String(i).padStart(4, "0")}`;
  const leafOf = (i: number) => COMMIT.toHex(COMMIT.sha256(new TextEncoder().encode(`leaf ${i}`)));
  const defects: string[] = [];
  for (const size of [...Array.from({ length: 25 }, (_, i) => i), 31, 32, 33, 63, 64, 65, 100]) {
    const tickets = Array.from({ length: size }, (_, i) => ({ ticketId: idOf(i), leaf: leafOf(i) })).reverse();
    const tree = COMMIT.commitmentTree(tickets);
    if (tree.root !== COMMIT.merkleRoot(tickets) || tree.size !== size) defects.push(`the root or size at ${size}`);
    const at = size <= 24 ? Array.from({ length: size }, (_, i) => i) : [0, 1, size >> 1, size - 2, size - 1];
    for (const i of at) if (J(tree.proof(idOf(i))) !== J(COMMIT.inclusionProof(tickets, idOf(i)))) defects.push(`the path of ${i} at ${size}`);
    if (tree.proof("mlt_absent") !== null) defects.push(`an absent ticket at ${size}`);
  }
  ok("P.6c · the kept tree's root and every path equal the RFC 6962 transcription's (merkleRoot, inclusionProof): sizes 0 to 24 at every index, 31 to 100 at their edges, and an absent ticket has none",
    defects.length === 0, defects.slice(0, 5).join(" · "));
}

const doneA = await W.closeAndSeal(A, aStart);
const relA = await W.release(A.id, doneA);
{
  const p = await FAIR.millioneaTicketProof(P1, t1[0].serial);
  const row = await dal.ticketStore.get(t1[0].ticketId);
  ok("P.7 · settled, a ticket's proof still reaches the root: the committed set is every ticket not cancelled, SETTLED ones included",
    relA.ok === true && row?.status === "SETTLED" && p?.standing === "COMMITTED" && p.verifies === true, J({ rel: relA.ok || relA.error, status: row?.status, standing: p?.standing }));
  const v = await view();
  ok("F.7 · a settled week leaves the current list for the final one, its root unchanged and its register page named",
    !!v && !v.current.some((r: any) => r.code === A.code) && v.recent[0]?.code === A.code && v.recent[0].state === "SETTLED"
      && v.recent[0].onRegister === true && v.recent[0].ticketMerkleRoot === Aclosed.ticketMerkleRoot, J(v?.recent));
}

const { week: V, start: vStart } = await W.openWeek({ weeksAhead: 4 });
const bv = await W.buy(P1, V.id, [W.WIN, W.LOSE], { key: "fair-p1-v-0001" });
const tv = bv.ok ? bv.data.maswali.tickets : [];
await W.svc.closeWeek({ weekId: V.id, now: new Date(Date.parse(V.closesAt) + 60_000) });
for (let slot = 1; slot <= 15; slot++) {
  await W.svc.sealQuestion({ weekId: V.id, slot, outcome: "VOID", voidReason: "not_played", evidence: `Event ${slot} was not played at all`, officerId: "usr_mln_sealer", now: new Date(vStart + 9 * DAY) });
}
const voided = await W.svc.voidWeek({ weekId: V.id, now: new Date(Date.parse((await dal.weekStore.get(V.id)).objectionsCloseAt) + 60_000) });
{
  const p = await FAIR.millioneaTicketProof(P1, tv[0]?.serial);
  const row = tv[0] ? await dal.ticketStore.get(tv[0].ticketId) : null;
  ok("P.8 · a week voided whole: its refunded tickets were live at the close, so their proofs still reach the root",
    voided.ok === true && row?.status === "REFUNDED" && p?.standing === "COMMITTED" && p.verifies === true, J({ voided: voided.ok || voided.error, status: row?.status, standing: p?.standing }));
  const v = await view();
  ok("F.8 · the final weeks, newest first: the voided week, then the settled one — each with its root and its register page",
    !!v && v.recent.length === 2 && v.recent[0].code === V.code && v.recent[0].state === "VOIDED" && HEX64.test(v.recent[0].ticketMerkleRoot ?? "")
      && v.recent[0].onRegister === true && v.recent[1].code === A.code && v.current.length === 0, J(v && v.recent.map((r: any) => [r.code, r.state])));
}
{
  const before = await FAIR.millioneaTicketProof(P2, td[0]?.serial);
  await W.svc.closeWeek({ weekId: D.id, now: new Date(Date.parse(D.closesAt) + 60_000) });
  const after = await FAIR.millioneaTicketProof(P2, td[0]?.serial);
  const v = await view();
  ok("P.9 · a drive ticket's owner reaches their own proof (the week is private, the ticket is theirs): awaited, then committed after the drive's close",
    before?.standing === "AWAITING_CLOSE" && before.week.visibility === "DRIVE" && after?.standing === "COMMITTED" && after.verifies === true, J({ before: before?.standing, after: after?.standing }));
  ok("F.9 · ⛔ …and the closed drive week is still in no list of the summary", !!v && ![...v.current, ...v.recent].some((r: any) => r.code === D.code), J(v && [...v.current, ...v.recent].map((r: any) => r.code)));
}
ok("F.10 · the summary prints at most MILLIONEA_FAIRNESS_RECENT final weeks, a layout constant (the register holds every one)",
  typeof FAIR.MILLIONEA_FAIRNESS_RECENT === "number" && FAIR.MILLIONEA_FAIRNESS_RECENT >= 1, String(FAIR.MILLIONEA_FAIRNESS_RECENT));
ok("F.11 · the proof's address is under /fairness, by its serial", FAIR.millioneaProofHref("MLN-2026-W44-000123") === "/fairness/millionea/MLN-2026-W44-000123");
{
  // The kept trees are bounded (review #9): at a bound of one, another week's proof puts the first week's tree out.
  resetTrees(1);
  const real = dal.ticketStore.listForWeek;
  let reads = 0;
  dal.ticketStore.listForWeek = async (...a: any[]) => { reads++; return real.apply(dal.ticketStore, a); };
  const answers: any[] = [];
  const seen: string[][] = [];
  try {
    for (const s of [t1[0].serial, tv[0].serial, t1[0].serial]) {
      answers.push(await FAIR.millioneaTicketProof(P1, s));
      seen.push(keptTrees());
    }
  } finally {
    dal.ticketStore.listForWeek = real;
    resetTrees(FAIR.MILLIONEA_PROOF_TREES);
  }
  const keyA = `${A.id}|${Aclosed.ticketMerkleRoot}`, keyV = `${V.id}|${(await dal.weekStore.get(V.id))?.ticketMerkleRoot}`;
  ok("P.10 · the kept trees are bounded: at a bound of one, the voided week's proof puts the settled week's tree out, and that week's next proof rebuilds it — one ticket list each time, every answer committed",
    reads === 3 && answers.every((p: any) => p?.standing === "COMMITTED" && p.verifies === true) && J(seen) === J([[keyA], [keyV], [keyA]])
      && keptTrees().length === 0 && proofTrees().bound === FAIR.MILLIONEA_PROOF_TREES && FAIR.MILLIONEA_PROOF_TREES >= 1, J({ reads, seen }));
  const exported = Object.keys(FAIR).filter((k) => k.startsWith("__"));
  ok("P.11 · ⛔ round 3, L5 · the proof module exports no test mutator a page could import — its kept trees are reached only through their registered symbol, the house's test-seam pattern",
    exported.length === 0 && proofTrees() === (globalThis as any)[Symbol.for("millionea.proof-trees")], J(exported));
}

// ── §W · the binding figures: the week's own record (review #8) ──────────────────────────────────────────────────
section("§W · the binding rules print a week on sale from its own record");
{
  const LEGAL: any = await import("../../src/lib/server/millionea-legal.ts");
  const CFG: any = await import("../../src/lib/server/maswali-config.ts");
  const start = W.weekStartAhead(5);
  const drafted = await W.svc.createWeek({ weekStartMs: start, visibility: "PUBLIC", questions: W.questions(start), officerId: "usr_mln_drafter", now: new Date(start - 3 * DAY) });
  // The config moves AFTER the draft and BEFORE the open: the open freezes the new figures and (S7, `deadlinesUnderRules`)
  // re-freezes the week's final deadline and every void deadline from them; the drafted close and the open instant stay.
  const moved = await CFG.saveMaswaliConfig({ voidDeadlineHours: 30, closeAt: "17:00" }, "usr_mln_drafter");
  // S6-INT · S5-FIX-SRV's attestation names the draft version the reader read (`readDraftVersion`), as the money world does.
  const attested = drafted.ok ? await W.svc.attestParity({ weekId: drafted.week.id, officerId: "usr_mln_reader", readVersion: await W.svc.readDraftVersion(drafted.week.id) }) : { ok: false };
  const opened = drafted.ok ? await W.svc.openWeek({ weekId: drafted.week.id, officerId: "usr_mln_drafter", guarantee: money.guaranteeReader, now: new Date(start + 60_000) }) : { ok: false, error: "no draft" };
  const wk = opened.ok ? opened.week : null;
  const snap = wk ? W.svc.frozenRules(wk) : null;
  const fig = await LEGAL.millioneaBindingFigures({ userId: null, state: "ACTIVE" });
  // Once open, a week's figures are its own (round 4, item 2): a settings change after the open moves none of them.
  const later = await CFG.saveMaswaliConfig({ voidDeadlineHours: 40, closeAt: "16:00" }, "usr_mln_drafter");
  const still = await LEGAL.millioneaBindingFigures({ userId: null, state: "ACTIVE" });
  ok("W.1 · ⭐ review #8, round 4 · a week on sale prints ITS record: the open an officer made (Monday 00:01, not the default 00:00), the close its draft stamped (Friday 18:00, not the 17:00 its open froze), the void hours its questions carry as its open re-froze them (30, the rules it froze — not the draft's 48) and its final deadline; a settings change after the open moves none of them",
    moved.ok === true && attested.ok === true && !!wk && snap?.voidDeadlineHours === 30 && snap?.closeAt === "17:00"
      && fig.source === "WEEK" && fig.weekCode === wk.code && fig.openWeekday === 1 && fig.openAt === "00:01" && fig.closeWeekday === 5
      && fig.closeAt === "18:00" && fig.voidDeadlineHours === 30 && fig.finalDeadlineWeekday === 1 && fig.finalDeadlineAt === "23:59"
      && later.ok === true && J(still) === J(fig),
    J({ moved: moved.ok || moved.error, opened: opened.ok || opened.error, fig: [fig.source, fig.openWeekday, fig.openAt, fig.closeWeekday, fig.closeAt, fig.voidDeadlineHours, fig.finalDeadlineAt], still: J(still) === J(fig) }));
  // S6-INT · S5-FIX-SRV's move names the close the officer reviewed (`expectedClosesAt`): the week's own, as opened.
  const mv = wk ? await W.svc.moveClose({ weekId: wk.id, toCloseAt: new Date(W.eatWeekAt(start, 5, "17:30")).toISOString(), expectedClosesAt: wk.closesAt, officerId: "usr_mln_drafter", now: new Date(start + 120_000) }) : { ok: false, error: "no week" };
  const after = await LEGAL.millioneaBindingFigures({ userId: null, state: "ACTIVE" });
  ok("W.2 · …and a close an officer moves is the close the rules print, the moment it moves (Friday 17:30)",
    mv.ok === true && after.closeWeekday === 5 && after.closeAt === "17:30" && after.openAt === "00:01", J({ mv: mv.ok || mv.error, closeAt: after.closeAt }));
  await CFG.saveMaswaliConfig({ voidDeadlineHours: 48, closeAt: "18:00" }, "usr_mln_drafter");
}

// ══ THE STATIC HALF — the memory child only (the same in both stores, so measured once) ═══════════════════════════
if (STORE === "memory") {
  const { transformSync } = await import("esbuild");
  const { createHash } = await import("node:crypto");
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { decomment } = await import("./decomment.mts");
  const { assuranceHits } = (await import("./house-bot-assurances.mjs")) as any;
  const { houseHits } = (await import("./house-bot-vocabulary.mjs")) as any;
  const Validators: any = await import("../../src/lib/server/validators.ts");
  const Payout: any = await import("../../src/lib/payout.ts");
  const Utils: any = await import("../../src/lib/utils.ts");
  const { dict }: any = await import("../../src/lib/i18n-dict.ts");
  const { sideWordIn }: any = await import("../../src/lib/side-label.ts");
  const CHATF: any = await import("../../src/lib/server/millionea-chat.ts");
  const PLAYER: any = await import("../../src/lib/server/maswali-player.ts");
  const VERSION: any = await import("../../src/lib/millionea-rules-version.ts");
  const { millioneaContent }: any = await import("../../src/app/legal/rules/_content-millionea.tsx");
  const { MillioneaHelp }: any = await import("../../src/app/help/millionea-help.tsx");
  const { ProofCheck }: any = await import("../../src/app/fairness/millionea/[serial]/proof-check.tsx");
  const LOCS = ["en", "sw", "zh"] as const;
  const plain = (node: unknown): string =>
    renderToStaticMarkup(createElement(() => node as any)).replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&").replace(/&#x27;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&ldquo;|&rdquo;/g, '"')
      .replace(/\s+/g, " ").trim();
  const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 32 * 1024 * 1024 });
  const mainBlob = (rel: string): string | null => { try { return git("show", `origin/main:${rel}`).split(CR + NL).join(NL); } catch { return null; } };

  // ── §C · the help assistant ─────────────────────────────────────────────────────────────────────────────────────
  section("§C · the help assistant's Millionea passage");
  const CHAT = "src/app/_actions/chat.ts";
  const buildChat = (src: string, exportsLine: string): any => {
    const code = transformSync(`${src}${NL}${exportsLine}${NL}`, { loader: "ts", format: "cjs", target: "es2022" }).code;
    const deps: Record<string, unknown> = {
      "@/lib/server/session": { getSession: async () => null },
      "@/lib/server/rate-limit": { rateCheckAsync: async () => ({ allowed: true }) },
      "@/lib/server/config-store": { loadConfig: async () => null, saveConfig: async () => undefined },
      "@/lib/server/market-config": { getGlobalConfig: async () => ({ objectionWindowHours: 24 }) },
      // Stand-ins, never the real contact (test:support-contact §8: a contact is written once, in support-config.ts).
      "@/lib/server/support-config": { SUPPORT_EMAIL: () => "SUPPORT_EMAIL()", SUPPORT_PHONE: () => "SUPPORT_PHONE()" },
      "@/lib/server/validators": Validators, "@/lib/payout": Payout, "@/lib/utils": Utils,
      "@/lib/server/simple-journey-switch": { simpleJourneyStateNow: async () => "STAFF_PREVIEW" },
    };
    const mod = { exports: {} as any };
    const need = (spec: string) => {
      if (spec in deps) return deps[spec];
      throw new Error(`chat.ts imports ${spec}, which test:maswali-fairness does not provide`);
    };
    new Function("require", "module", "exports", code)(need, mod, mod.exports);
    return mod.exports;
  };
  let M: any = null, BASE: any = null;
  try { M = buildChat(read(CHAT), "export { buildSystemPrompt as __today, systemPrompt as __prompt, MILLIONEA_SWAPS as __mln, JOURNEY_SWAPS as __journey };"); } catch (e) { console.log(`  chat.ts did not build: ${(e as Error).message}`); }
  const mainChat = mainBlob(CHAT);
  try { if (mainChat) BASE = buildChat(mainChat, "export { systemPrompt as __prompt };"); } catch (e) { console.log(`  origin/main's chat.ts did not build: ${(e as Error).message}`); }
  ok("C.0 · POPULATION · the action's prompt builders build from the tree, and origin/main's own chat.ts builds beside them (the reference for 'today')",
    !!M && typeof M.__prompt === "function" && Array.isArray(M.__mln) && M.__mln.length >= 5 && !!BASE && typeof BASE.__prompt === "function",
    J({ built: !!M, swaps: M?.__mln?.length, main: !!BASE }));
  if (M && BASE) {
    const same = LOCS.every((l) => [false, true].every((jy) => M.__prompt(l, 24, jy) === M.__prompt(l, 24, jy, null) && M.__prompt(l, 24, jy) === BASE.__prompt(l, 24, jy)));
    ok("C.1 · ⛔ BYTE FOR BYTE · with no Millionea facts (every rollout below ACTIVE) the prompt is origin/main's own, today's and the journey's, in en, sw and zh",
      same && M.__prompt("en", 24, false) === M.__today("en", 24), "the prompt for a reader with no Millionea facts moved");
    const FACTS = {
      price: "TZS 2,500", floor: "TZS 3,000,000", feePct: 11, cap: 7, openDay: "Tuesday", openAt: "06:00", closeDay: "Thursday", closeAt: "20:30",
      freeCancelMinutes: 9, checkWindowHours: 36,
    };
    const today = M.__prompt("en", 24, false), journey = M.__prompt("en", 24, true);
    const mToday = M.__prompt("en", 24, false, FACTS), mJourney = M.__prompt("en", 24, true, FACTS);
    const swapDefects: string[] = [];
    for (const s of M.__mln as Array<{ phrase: string; to: string }>) {
      if (count(today, s.phrase) !== 1 || count(journey, s.phrase) !== 1) swapDefects.push(`phrase not found exactly once: ${s.phrase.slice(0, 50)}`);
      for (const [name, p] of [["today", mToday], ["journey", mJourney]] as const) {
        if (count(p, s.to) !== 1) swapDefects.push(`${name}: "${s.to.slice(0, 50)}" lands ${count(p, s.to)} times`);
        if (!s.to.includes(s.phrase) && count(p, s.phrase) !== 0) swapDefects.push(`${name}: the unscoped phrase survives: ${s.phrase.slice(0, 50)}`);
      }
    }
    ok("C.2 · every scoping swap's phrase is in today's and the journey's prompt exactly once, and lands exactly once — 'both games', 'never paid less than its stake', 'one-sided' and the platform's own description, named as YES/NO and Up & Down facts",
      swapDefects.length === 0, swapDefects.join(" · "));
    const lines = mToday.split(NL);
    const head = lines.findIndex((l: string) => l.startsWith("MASWALI MILLIONEA — THE THIRD PRODUCT"));
    const keyPages = lines.flatMap((l: string, i: number) => (l.startsWith("KEY PAGES:") ? [i] : []));
    ok("C.3 · Millionea's section goes in once, before the one KEY PAGES line, and states its never-suggest rule",
      head >= 0 && count(mToday, "MASWALI MILLIONEA — THE THIRD PRODUCT") === 1 && keyPages.length === 1 && head < keyPages[0]
        && mToday.includes("NEVER suggest answers to any Millionea question"), J({ head, keyPages }));
    const driven = ["A ticket costs TZS 2,500", "never less than TZS 3,000,000", "The fee is 11% of the jackpot", "At most 7 tickets per account per week",
      "sales open Tuesday 06:00 and close Thursday 20:30 EAT", "within 9 minutes of buying", "at least 9 minutes of sales remained", "a 36-hour check window"];
    ok("C.4 · ⭐ EVERY FIGURE IS READ · driven at non-default figures, the section says THOSE — and none of them is in today's prompt, so no literal could pass",
      driven.every((d) => mToday.includes(d) && !today.includes(d)), J(driven.filter((d) => !mToday.includes(d))));
    const noFloor = M.__prompt("en", 24, false, { ...FACTS, floor: null });
    ok("C.5 · a rules set with no floor (0) claims none", !noFloor.includes("never less than") && mToday.includes("never less than"));
    const jSwapTo = (M.__journey as Array<{ to: string }>).map((s) => s.to.split(NL)[0]);
    ok("C.6 · with both the journey and Millionea, every journey swap still lands and the KEY PAGES line is the journey's",
      jSwapTo.every((t) => mJourney.includes(t)) && mJourney.includes("KEY PAGES: / (the questions)") && count(mJourney, "MASWALI MILLIONEA — THE THIRD PRODUCT") === 1,
      J(jSwapTo.filter((t) => !mJourney.includes(t)).map((t) => t.slice(0, 40))));
    const added = mToday.split(NL).filter((l: string) => !today.split(NL).includes(l)).join(NL);
    const hits = [...assuranceHits(added), ...houseHits(added)];
    ok("C.7 · D19 / D19d · what Millionea adds to the prompt carries no assurance and no house word (the house lane's own matchers)",
      added.length > 1500 && hits.length === 0, J({ added: added.length, hits }));
    const scoped = [
      "On a YES/NO market or an Up & Down round, the moment betting CLOSES the pools freeze",
      'If a player asks "can I win and still lose money?" about a YES/NO market or Up & Down, the answer is NO',
      "- Resolution of a YES/NO market: an officer seals the outcome",
    ];
    const unscoped = ["The moment betting CLOSES the pools freeze", 'If a player asks "can I win and still lose money?", the answer is NO', "- Resolution: an officer seals the outcome"];
    ok("C.12 · ⛔ round 5, item 3 · the floor the assistant quotes is a 10 of 10 week's — a final week with no 10 of 10 pays its top scores with no floor — and the old promise, a floor for any week with a winner, is gone",
      mToday.includes("in a week with a 10 of 10 ticket it is never less than TZS 3,000,000") && !mToday.includes("in a week that has a winner it is never less than")
        && !mJourney.includes("in a week that has a winner it is never less than"), J({ floorLine: mToday.split(NL).find((l: string) => l.includes("never less than"))?.slice(0, 120) }));
    ok("C.11 · ⛔ review #11 · each market-only line is scoped in its own words — the payout frozen at the close, the never-lose answer, the objection window — in today's prompt and the journey's, none survives unscoped, and the journey's own estimate line still lands",
      [mToday, mJourney].every((p) => scoped.every((s) => count(p, s) === 1) && unscoped.every((u) => count(p, u) === 0))
        && count(mJourney, "- The estimate shown before a bet is marked") === 1,
      J(scoped.filter((s) => count(mToday, s) !== 1 || count(mJourney, s) !== 1).map((s) => s.slice(0, 40))));
  }
  {
    let called = 0;
    const howTo = (over: Record<string, unknown> = {}) => async () => {
      called++;
      return { source: "CONFIG", weekCode: null, ticketPrice: 2500, floor: 3_000_000, feeRate: 0.11, traRate: 0.1, gbtRate: 0.05, ticketCap: 7,
        openWeekday: 2, openAt: "06:00", closeWeekday: 4, closeAt: "20:30", minLockBufferMinutes: 40, voidDeadlineHours: 36,
        objectionWindowHours: 36, objectionNotBeforeAt: "11:00", freeCancelMinutes: 9, examples: { shared: null, floorWeek: null }, ...over };
    };
    const below = [await CHATF.millioneaChatFactsFor("WITHDRAWN", howTo()), await CHATF.millioneaChatFactsFor("STAFF_PREVIEW", howTo())];
    const callsBelow = called;
    const at = await CHATF.millioneaChatFactsFor("ACTIVE", howTo());
    const zeroFloor = await CHATF.millioneaChatFactsFor("ACTIVE", howTo({ floor: 0 }));
    const broken = await CHATF.millioneaChatFactsFor("ACTIVE", async () => { throw new Error("rules unreadable"); });
    ok("C.8 · ⛔ the facts follow Millionea's GLOBAL rollout: none below ACTIVE, without reading the rules at all",
      below.every((b) => b === null) && callsBelow === 0, J({ below, callsBelow }));
    ok("C.9 · at ACTIVE, the facts are the rules' own, formatted as the platform prints them; a zero floor is no floor; an unreadable rules read gives no facts (today's prompt)",
      J(at) === J({ price: "TZS 2,500", floor: "TZS 3,000,000", feePct: 11, cap: 7, openDay: "Tuesday", openAt: "06:00", closeDay: "Thursday", closeAt: "20:30", freeCancelMinutes: 9, checkWindowHours: 36 })
        && zeroFloor?.floor === null && broken === null, J({ at, zeroFloor: zeroFloor?.floor, broken }));
    const chatSrc = decomment(read(CHAT));
    const mlnSrc = decomment(read("src/lib/server/millionea-chat.ts"));
    ok("C.10 · the action loads the reader inside itself and hands its answer to the builder as the fourth input; the reader asks the global rollout and the rules with no user",
      count(chatSrc, 'const millioneaChatFacts = await import("@/lib/server/millionea-chat").then((m) => m.millioneaChatFacts, () => async () => null);') === 1
        && count(chatSrc, '(await simpleJourneyStateNow()) === "ACTIVE", await millioneaChatFacts()),') === 1
        && /millioneaStateNow\(\)/.test(mlnSrc) && mlnSrc.includes('millioneaHowTo({ userId: null, state: "ACTIVE" })')
        && !/getSession|resolveMillionea|cookies\(|headers\(/.test(mlnSrc));
  }

  // ── §L · the binding rules ──────────────────────────────────────────────────────────────────────────────────────
  section("§L · the binding rules: version, text hash, figures");
  const PAGE = "src/app/legal/rules/millionea/page.tsx", CONTENT = "src/app/legal/rules/_content-millionea.tsx";
  {
    const page = decomment(read(PAGE));
    const meta = page.slice(page.indexOf("const META"), page.indexOf("};", page.indexOf("const META")) + 2);
    ok("L.1 · the page prints the ONE version constant in all three META lines, with no date typed",
      /^\d{4}-\d{2}-\d{2}$/.test(VERSION.MILLIONEA_RULES_VERSION) && /import \{ MILLIONEA_RULES_VERSION \} from "@\/lib\/millionea-rules-version";/.test(page)
        && count(meta, "${MILLIONEA_RULES_VERSION}") === 3 && !/20\d\d-\d\d-\d\d/.test(meta), meta.slice(0, 120));
    // The metadata asks the gate inside a try (it never rejects, `test:visual-pass-r5d` 1.4″), or S5's door, as S5's pages do.
    const metaFn = page.slice(page.indexOf("export async function generateMetadata"), page.indexOf("export default async function"));
    const metaGate = /try \{\s*await millioneaGate\(\);\s*\} catch \{\s*return notFoundMetadata\(\);\s*\}|if \(!\(await millioneaDoor\(\)\)\.visible\) return notFoundMetadata\(\);/.exec(metaFn);
    ok("L.2 · ⛔ the gate first, in the page AND its metadata (a hidden product's address answers as a missing page), and the page is dynamic",
      count(page, "const gate = await millioneaGate();") === 1 && !!metaGate && metaGate.index < metaFn.indexOf("getServerT()")
        && /export const dynamic = "force-dynamic";/.test(page));
  }
  {
    const JS_WS = /\s+/g; // JavaScript's own whitespace class: what `test:terms-binding`'s `hashBodies` normalises
    const hashOf = (s: string) => createHash("sha256").update(s.replace(JS_WS, " ").trim(), "utf8").digest("hex").slice(0, 12);
    const raw = read(CONTENT);
    const bodies = raw.indexOf("export function millioneaContent(") >= 0 ? raw.slice(raw.indexOf("export function millioneaContent(")) : "";
    const comp = read("src/app/legal/_components.tsx");
    const bAt = comp.indexOf("export const LEGAL_BINDING_LANGUAGE");
    const binding = bAt >= 0 ? comp.slice(bAt, comp.indexOf("};", bAt) + 2) : "";
    const pinned = `${bodies}${NL}${binding}`;
    ok("L.3 · POPULATION · the binding bodies span all three languages and the binding-language sentence was extracted",
      bodies.length > 20_000 && bodies.includes("Introduction and scope") && bodies.includes("Utangulizi na upeo") && bodies.includes("导言与适用范围")
        && /legally binding text/.test(binding), J({ bodies: bodies.length, binding: binding.length }));
    ok("L.4 · 🔴 the pinned hash matches the binding text — if this fails, MOVE MILLIONEA_RULES_VERSION TOO (millionea-rules-version.ts)",
      hashOf(pinned) === VERSION.MILLIONEA_RULES_TEXT_SHA, `the text hashes to ${hashOf(pinned)}, the module pins ${VERSION.MILLIONEA_RULES_TEXT_SHA}`);
    ok("L.4b · CONTROLS · a one-word change moves the hash; a whitespace-only reformat does not",
      hashOf(pinned.replace("Introduction and scope", "Introduction and range")) !== hashOf(pinned) && hashOf(pinned.split(NL).join(`${NL}  `)) === hashOf(pinned));
  }
  // The binding text at L.5's driven figures, rendered once in the next block and read by L.16 too, whose block is its own:
  // L.16 read `text` out of its scope from round 3 on, a ReferenceError that ended the memory run there (fixed at the
  // integration, 2026-10-19, the suite's first run).
  let bindingText: Record<string, string> = {};
  {
    const rates = { traRate: 0.1, gbtRate: 0.05 };
    const examples = PLAYER.millioneaExamplesFor({ ticketPrice: 2500, floor: 3_000_000, feeRate: 0.11, ...rates });
    const FIG = {
      source: "WEEK", weekCode: "MLN-2026-W50", licence: "GBT-TEST-0099", ticketPrice: 2500, floor: 3_000_000, feePct: 11, traPct: 10, gbtPct: 5,
      ticketCap: 7, openWeekday: 2, openAt: "06:00", closeWeekday: 4, closeAt: "20:30", minLockBufferMinutes: 40, voidDeadlineHours: 36,
      finalDeadlineWeekday: 2, finalDeadlineAt: "21:15", objectionWindowHours: 30, objectionNotBeforeAt: "11:00", freeCancelMinutes: 9,
      withdrawalFeePct: 2.5, examples,
    };
    const docs = millioneaContent(FIG);
    const text = Object.fromEntries(LOCS.map((l) => [l, plain(docs[l])])) as Record<string, string>;
    bindingText = text;
    const sf = examples.shared?.figures;
    const want: Record<string, string[]> = {
      en: ["A ticket costs TZS 2,500", "at most 7 tickets in one week", "Tuesday 06:00 EAT", "Thursday 20:30 EAT", "at least 40 minutes before the earliest",
        "void deadline is 36 hours after its scheduled start", "Tuesday 21:15 EAT of the week after the close", "a check window of 30 hours opens",
        "never closes before 11:00 EAT", "never less than TZS 3,000,000", "Our fee is 11% of the jackpot", "TRA's 10% and GBT's 5%",
        "within 9 minutes of buying it", "in the last 9 minutes before the close can never be cancelled", "withdrawal fee of 2.5%", "licence number GBT-TEST-0099",
        "froze when it opened, with its open and close as they stand now"],
      sw: ["Tiketi ni TZS 2,500", "tiketi zisizozidi 7", "Jumanne 06:00 EAT", "Alhamisi 20:30 EAT", "ni saa 36 baada ya mwanzo wake", "muda wa ukaguzi wa saa 30",
        "haipungui kamwe TZS 3,000,000", "ni 11% ya jackpot", "ndani ya dakika 9", "dakika 9 za mwisho kabla ya kufunga"],
      zh: ["每张彩票 TZS 2,500", "最多持有 7 张彩票", "周二 06:00 EAT", "周四 20:30 EAT", "预定开始后 36 小时", "30 小时的复核期", "绝不低于 TZS 3,000,000",
        "大奖的 11%", "购买彩票后 9 分钟内"],
    };
    const missing = LOCS.flatMap((l) => want[l].filter((w) => !text[l].includes(w)).map((w) => `${l}: ${w}`));
    ok("L.5 · ⭐ EVERY FIGURE IS READ · driven at non-default figures, the binding text says THOSE in en, sw and zh — price, cap, days and times, buffer, void deadline and its cap, the check window, the floor, the fee and the levies, the free cancel, the withdrawal fee, the licence, the week",
      missing.length === 0, missing.join(" · "));
    const defaults = ["A ticket costs TZS 1,000", "at most 10 tickets", "Friday 18:00", "13% of the jackpot", "within 5 minutes", "48 hours after its scheduled start"];
    ok("L.5b · …and none of the ruled defaults survives in that text, so no literal could have passed L.5", defaults.every((d) => !text.en.includes(d)), J(defaults.filter((d) => text.en.includes(d))));
    ok("L.6 · the worked examples are the settlement's own arithmetic over the driven rules (the shared week's share and the floor week's top-up)",
      !!sf && !!examples.floorWeek && text.en.includes(Utils.formatTzs(sf.share)) && text.en.includes(Utils.formatTzs(examples.floorWeek.figures.U))
        && text.sw.includes(Utils.formatTzs(sf.F)) && text.zh.includes(Utils.formatTzs(sf.J)), J({ shared: sf && [sf.J, sf.F, sf.share], floorU: examples.floorWeek?.figures?.U }));
    const yes = LOCS.map((l) => sideWordIn(l, "YES", "MASWALI")), no = LOCS.map((l) => sideWordIn(l, "NO", "MASWALI"));
    ok("L.7 · the answers are the product's own words in each language (NDIO/HAPANA, 是/否)", LOCS.every((l, i) => text[l].includes(yes[i]) && text[l].includes(no[i])), J({ yes, no }));
    const bare = millioneaContent({ ...FIG, floor: 0, examples: { shared: null, floorWeek: null } });
    ok("L.8 · a rules set with no floor states none, and with no truthful example the section says where every figure is published instead",
      !plain(bare.en).includes("never less than") && plain(bare.en).includes("on its register once its results are final"));
    const words = LOCS.flatMap((l) => houseHits(text[l]));
    ok("L.9 · D19 · the binding text names no house word in any language (the staff bar is the only buyer bar it states)", words.length === 0, J(words));
    const mustSay: Record<string, string[]> = {
      en: ["a holder of an uncancelled ticket in the week who believes a result is wrong may raise it with support",
        "Until the window closes, the officer who set a result may correct it, recording the evidence; the corrected result is confirmed by a second officer whenever the original seal needed one",
        "where two-officer authorisation is switched on when the result is set, a second officer confirms it",
        "the withdrawal fee is the platform's current one",
        "a planned final week, named at least a full week before its sales open: from then on the Millionea page and its card on the home page name it, and its sales open no earlier than the time announced",
        "a stop ordered while a week is on sale: that week becomes the final week",
        "a stop ordered while no week is on sale and a week's results are being decided — its sales closed, the week not yet settled: that week settles under its own rules",
        "the next week to open becomes the final week; its buyers are told when they buy",
        "A stop ordered between weeks, while no week is on sale or being decided, is a planned final week",
        "After a final week that ran, no public week opens again, and what the jackpot account still holds — a rounding remainder, or a share forfeited after review — stays in it",
        "its outcome was settled in public, or its event had begun, before the sales close;",
        "it was materially wrong, or its English and Swahili texts differed; found before the close, or after it and before the check window ends",
        "In a week with a 10 of 10 ticket it is never less than",
        // ⚠️ A figure the legal pass wraps (section 11, section 2) renders with a space before the bracket that follows it in
        //    this plain text, so no pin runs across one.
        "joins the next jackpot as far as the week's own money covers it (in a final week it stays in the jackpot account, section",
        "; the rest stays with the guarantee, whose top-up covers only the fee and the shares — so in a week the guarantee tops up, the whole remainder stays with it",
        "the set of counted questions depends only on which questions voided",
        "made from its week id and its ticket id", "A forfeited share goes back to the jackpot"],
      sw: ["ambayo haijaghairiwa", "matokeo yaliyorekebishwa yanahitaji idhini ya afisa wa pili kila mara muhuri wa awali ulipoihitaji",
        "ada ya kutoa pesa ni ile ya sasa ya jukwaa", "hakuna wiki ya umma inayofunguliwa tena", "kwa mojawapo ya njia tatu",
        "ukurasa wa Millionea na kadi yake kwenye ukurasa wa mwanzo huitaja", "wakati hakuna wiki inayouzwa na matokeo ya wiki yanaamuliwa", "wanunuzi wake wanaambiwa wanaponunua",
        "Usimamishaji unaoamriwa kati ya wiki", "kinachobaki kwenye akaunti ya jackpot", "au tukio lake lilianza, kabla ya mauzo kufungwa",
        "Katika wiki yenye tiketi ya 10 kati ya 10 haipungui kamwe", "(katika wiki ya mwisho linabaki kwenye akaunti ya jackpot, kifungu cha",
        "kinachobaki kinabaki kwenye dhamana, ambayo nyongeza yake hulipa ada na sehemu tu",
        "inategemea tu maswali yapi yalibatilishwa", "msimbo wa wiki yake na msimbo wa tiketi", "Sehemu iliyonyang'anywa inarudi kwenye jackpot"],
      zh: ["持有该周未取消彩票的玩家", "原始结果需经第二位官员确认的，更正后的结果同样须由第二位官员确认", "提现手续费为平台当前的费率", "不再开放任何公开的周",
        "以下列三种方式之一确定", "Millionea 页面及首页上的 Millionea 卡片即标明该周",
        "在无周正在销售、且某周结果正在确定期间（其销售已截止、尚未结算）下令停办", "其购买者在购买时即获告知", "在两周之间", "留存于该账户中",
        "或其事件在销售截止前已开始；", "在有 10/10 彩票的一周", "（最后一周则留存于大奖账户，见第 11 条）", "其余部分留在保底资金中，因为保底补足只支付费用与份额", "计分题的集合仅取决于哪些题目作废", "被没收的份额回归大奖"],
    };
    // ⛔ What no language may say: an objection path, a regulator refund, a fault void, a per-ticket refund, the leaf's
    //    "identifier" (sw in either number, round 3 L6), a remainder that is "none" in a topped-up week, an announcement
    //    "in advance" the hub does not make, the floor promised to any winning week, the counted set by main voids alone.
    const mustNot: Record<string, RegExp> = {
      en: /\bobject(?:ion|ions|s|ed)?\b|regulator|fault on 50pick|tickets being refunded|identifier|there is none|announced at least|a week that has a winner it is never less|on how many main|is never 50pick's|no week opens again|needs it again|pays only what is paid out/i,
      sw: /pingamizi|udhibiti|Hitilafu|[kv]itambulisho|hakuna salio|inayotangazwa angalau|wiki yenye mshindi haipungui|idadi ya maswali\s+makuu|kamwe si la 50pick|hakuna wiki inayofunguliwa tena|yanaihitaji tena|hulipa tu kinacholipwa/i,
      zh: /异议|监管|故障|不存在余数|一整周公布|有中奖者的一周，大奖绝不低于|作废主题的数量|始终不足一先令——绝不归|不再开放任何一周|须再次确认|只支付实际赔付/,
    };
    const said = LOCS.flatMap((l) => mustSay[l].filter((s) => !text[l].includes(s)).map((s) => `${l} lacks: ${s.slice(0, 50)}`));
    const unsaid = LOCS.flatMap((l) => { const hit = mustNot[l].exec(text[l]); return hit ? [`${l} says: ${hit[0]}`] : []; });
    const swProof = Object.values(dict.sw.millioneaFairness as Record<string, string>).filter((v) => /[kv]itambulisho/i.test(v));
    ok("L.13 · ⛔ THE TEXT STATES ONLY WHAT IS BUILT (reviews of rounds 2 and 3) · the check window as built (support, the sealing officer's own correction with its evidence and its second officer, uncancelled holders), the sunset's three cases exactly as mln-s7-fix accepts them and the stop between weeks, the planned week as the lead builds its announcement, the jackpot account after the last week, MR-5's case under its plan ground, the floor scoped to a 10 of 10 week, the remainder of a week raised to the floor, the counted set, the proof's own identifiers (and the proof page's sw words), a forfeited share — and none of the old promises, in any language",
      said.length === 0 && unsaid.length === 0 && swProof.length === 0, [...said, ...unsaid, ...swProof.map((v) => `sw proof words: ${v.slice(0, 40)}`)].join(" · "));
    const cfgDocs = millioneaContent({ ...FIG, source: "CONFIG", weekCode: null, voidDeadlineHours: null });
    const cfgText = Object.fromEntries(LOCS.map((l) => [l, plain(cfgDocs[l])])) as Record<string, string>;
    const weekSays: Record<string, string> = {
      en: "Week MLN-2026-W50 went on sale on Tuesday 06:00 EAT, when an officer opened it, and its close is Thursday 20:30 EAT.",
      sw: "Wiki MLN-2026-W50 ilianza kuuzwa Jumanne 06:00 EAT, afisa alipoifungua, na muda wake wa kufunga ni Alhamisi 20:30 EAT.",
      zh: "第 MLN-2026-W50 周于周二 06:00 EAT 由官员开放并开始销售，其截止时间为周四 20:30 EAT。",
    };
    const configSays: Record<string, string> = {
      en: "A week sells from the moment an officer opens it — by default Tuesday 06:00 EAT — to its close, by default Thursday 20:30 EAT.",
      sw: "Wiki inauza tangu afisa anapoifungua — kwa kawaida Jumanne 06:00 EAT — hadi inapofungwa, kwa kawaida Alhamisi 20:30 EAT.",
      zh: "每周自官员开放之时起销售——默认为周二 06:00 EAT——至截止时止，默认截止时间为周四 20:30 EAT。",
    };
    const capOnly: Record<string, string> = {
      en: "A question's void deadline is never later than Tuesday 21:15 EAT of the week after the close.",
      sw: "Muda wa mwisho wa kubatilisha swali kamwe si baada ya Jumanne 21:15 EAT ya wiki inayofuata baada ya kufunga.",
      zh: "题目的作废截止时间绝不晚于截止后一周的周二 21:15 EAT。",
    };
    const off = LOCS.flatMap((l) => [
      ...(text[l].includes(weekSays[l]) && !text[l].includes(configSays[l]) ? [] : [`${l}: the week's own sales sentence`]),
      ...(cfgText[l].includes(configSays[l]) && !cfgText[l].includes(weekSays[l]) ? [] : [`${l}: the defaults' sales sentence`]),
      ...(cfgText[l].includes(capOnly[l]) ? [] : [`${l}: the cap alone`]),
    ]);
    const settings: Record<string, [string, RegExp]> = {
      en: ["the figures in these rules are today's settings, and a week's own figures are fixed when it opens, its close excepted (section", /already drafted/],
      sw: ["takwimu za kanuni hizi ni mipangilio ya leo, na takwimu za wiki yenyewe hufungwa inapofunguliwa, isipokuwa muda wake wa kufunga (kifungu cha", /tayari imeandaliwa/],
      zh: ["本规则中的数值为当前设置；每周自身的数值在该周开放时确定，截止时间除外（第 2 条）", /已拟定的周/],
    };
    const settingsOff = LOCS.filter((l) => !cfgText[l].includes(settings[l][0]) || settings[l][1].test(cfgText[l]));
    ok("L.14 · review #7, #8, round 4 · a week on sale is described by its own open and close, the template by its defaults and the officer's open, questions that share no void hours print the cap alone, and with no week current the text gives today's settings — a week's own figures fixed when it opens, no drafted week promised its own (S7 re-freezes them) — in en, sw and zh",
      off.length === 0 && settingsOff.length === 0 && !cfgText.en.includes("hours after its scheduled start") && text.en.includes("void deadline is 36 hours after its scheduled start"),
      [...off, ...settingsOff.map((l) => `${l}: today's settings`)].join(" · "));
  }
  {
    const text = bindingText;
    const VOID: any = await import("../../src/lib/maswali-void-reason.ts");
    const { settleArithmetic }: any = await import("../../src/lib/maswali-money.ts");
    const words = (k: string) => LOCS.map((l) => dict[l].millionea[VOID.MASWALI_VOID_REASON_KEY[k]] as string);
    // S6-INT 10 · the zh ground names its event 事件, the lead's zh word for a Millionea event (test:maswali-design 4.D).
    const [sbcEn, sbcSw, sbcZh] = words("settled_before_close"), [objEn, objSw, objZh] = words("criterion_objection");
    const guide = read("docs/maswali-operator-guide.html");
    // MASWALI-BUILD S6-DOCS · the guide's "while it sells" step (part 2, B5) is where an officer meets MR-5's case: it names
    // the ground as the console prints it, a quoted label (`test:maswali-admin-guide` holds every such label to its source).
    const sells = guide.indexOf('<section class="step" id="sells">');
    const g62 = sells < 0 ? "" : guide.slice(sells, guide.indexOf("</section>", sells));
    ok("L.15 · ⛔ round 3, M2 · MR-5's case has a ground whose words are true: MR-15's own (\"settled before the close (MR-5)\") now names an event that had begun, on the console and on the register in three languages, and the guide's step for a selling week sends officers to it; the after-close ground no longer claims a player's objection that no path files",
      /begun/.test(VOID.MASWALI_VOID_REASON_LABEL.settled_before_close) && /begun/.test(sbcEn) && /lilianza/.test(sbcSw) && /事件已开始/.test(sbcZh)
        && !/objection/i.test(VOID.MASWALI_VOID_REASON_LABEL.criterion_objection) && !/objection/i.test(objEn) && !/pingamizi/i.test(objSw) && !/异议/.test(objZh)
        && /after the close/.test(objEn) && g62.includes(`<b class="ui" data-screen="week">${VOID.MASWALI_VOID_REASON_LABEL.settled_before_close}</b>`) && !g62.includes("Objection to the criterion upheld")
        && VOID.MASWALI_VOID_REASONS.length === 6,
      J({ sbc: VOID.MASWALI_VOID_REASON_LABEL.settled_before_close, obj: VOID.MASWALI_VOID_REASON_LABEL.criterion_objection, g62: g62.length }));
    // A week raised to the floor and topped up: the split leaves a remainder (the register prints it) and NONE of it
    // carries; and the edge where the floor raises the jackpot but the week's own money pays it — what carries is that
    // money's rest, less than the remainder (round 3, item 4).
    const rates = { traTaxOnCommissionRate: 0.1, gbtLevyOnCommissionRate: 0.05 };
    const topped = settleArithmetic({ rolloverIn: 0, sales: 300_000, winners: 7, floor: 1_000_000, feeRate: 0.13, rates });
    // 870,000 shared seven ways leaves 5; a week whose own money is 999,997 is raised to the floor and yet needs no top-up.
    const edge = settleArithmetic({ rolloverIn: 997, sales: 999_000, winners: 7, floor: 1_000_000, feeRate: 0.13, rates });
    ok("L.16 · round 3, item 4 · a topped-up week still has a remainder on its register and carries none of it; a week raised to the floor without a top-up carries only its own money's rest (less than its remainder) — the text says exactly this, with no 'there is none'",
      topped.kind === "PAYOUT" && topped.U > 0 && topped.dust > 0 && topped.carryOut === 0
        && edge.kind === "PAYOUT" && edge.J === 1_000_000 && edge.U === 0 && edge.carryOut === 999_997 - edge.F - edge.paid && edge.carryOut > 0 && edge.carryOut < edge.dust
        && text.en.includes("so in a week the guarantee tops up, the whole remainder stays with it") && !text.en.includes("there is none") && !/is never 50pick's/.test(text.en)
        && text.en.includes("whose top-up covers only the fee and the shares") && !/pays only what is paid out/.test(text.en),
      J({ topped: topped.kind === "PAYOUT" && [topped.U, topped.dust, topped.carryOut], edge: edge.kind === "PAYOUT" && [edge.J, edge.U, edge.dust, edge.carryOut] }));
  }
  {
    const LEGAL: any = await import("../../src/lib/server/millionea-legal.ts");
    const H = 3_600_000, fin = "2026-11-03T18:15:00.000Z";
    const q = (start: string, hours: number) => ({ eventStartsAt: start, voidDeadlineAt: new Date(Math.min(Date.parse(start) + hours * H, Date.parse(fin))).toISOString() });
    const same = [q("2026-10-31T12:00:00.000Z", 36), q("2026-11-01T15:00:00.000Z", 36), q("2026-11-02T20:00:00.000Z", 36)];
    ok("L.12 · review #8 · the void hours are the week's questions' own — the figure the uncapped ones share; none when two disagree, when the cap reached them all, or when a time is unreadable — and an instant prints as its EAT weekday and clock",
      LEGAL.questionsVoidHours(same, fin) === 36 && LEGAL.questionsVoidHours([...same, q("2026-10-31T09:00:00.000Z", 48)], fin) === null
        && LEGAL.questionsVoidHours([q("2026-11-03T00:00:00.000Z", 36)], fin) === null
        && LEGAL.questionsVoidHours([{ eventStartsAt: "soon", voidDeadlineAt: fin }], fin) === null
        && J(LEGAL.eatWeekdayClock(fin)) === J({ weekday: 2, at: "21:15" }) && J(LEGAL.eatWeekdayClock("2026-10-26T21:00:00.000Z")) === J({ weekday: 2, at: "00:00" })
        && J(LEGAL.eatWeekdayClock("2026-11-01T20:59:00.000Z")) === J({ weekday: 7, at: "23:59" }) && LEGAL.eatWeekdayClock("not a time") === null);
  }
  {
    const now = decomment(read("src/app/legal/rules/page.tsx"));
    const main = mainBlob("src/app/legal/rules/page.tsx");
    const before = main ? decomment(main) : "";
    const block = (s: string, from: string, to: string) => { const i = s.indexOf(from); const k = i < 0 ? -1 : s.indexOf(to, i); return i < 0 || k < 0 ? "" : s.slice(i, k + to.length); };
    const grid = block(before, '<div className="grid grid-cols-1 gap-3 md:grid-cols-2">', "</div>");
    const commission = block(before, "<p>\n          {locale === \"en\" && (", "</p>");
    const consts = ["const INTRO: Record<Locale, string> = {", "const COMMON: Record<Locale, readonly string[]> = {", "const CARDS = (l: Locale)"].map((c) => block(before, c, "};"));
    ok("L.10 · POPULATION · origin/main's chooser was read and today's grid, commission paragraph and copy constants were found in it",
      before.length > 3000 && grid.length > 200 && commission.length > 200 && consts.every((c) => c.length > 100), J({ grid: grid.length, commission: commission.length }));
    ok("L.11 · ⛔ every chooser change is a slot whose else arm is today's expression, word for word: the intro, the doors, the section title, the commission sentence; the copy constants are untouched",
      now.includes("const mln = (await resolveMillionea()).visible;") && now.includes("{mln ? INTRO_THREE(locale) : INTRO[locale]}")
        && now.includes(`{mln ? <ThreeDoors locale={locale} c={c} /> : ${grid}}`) && now.includes("title={mln ? COMMON_TWO(locale) : c.common}")
        && now.includes(`{mln ? <CommissionOfTwo locale={locale} pct={r.commissionPct} /> : ${commission}}`) && consts.every((c) => now.includes(c)),
      "a slot's else arm differs from today's page");
  }

  // ── §H · the hooks ──────────────────────────────────────────────────────────────────────────────────────────────
  section("§H · /help's block, /fairness's line, the proof route");
  {
    const help = decomment(read("src/app/help/page.tsx"));
    ok("H.1 · /help reads nothing for Millionea below the rollout, hides the block when its rules cannot be read, and draws it in one slot",
      help.includes("const mln = await resolveMillionea();") && help.includes("const millioneaRules = mln.visible ? await millioneaHowTo({ userId: null, state: mln.state }).catch(() => null) : null;")
        && count(help, "{millioneaRules && <MillioneaHelp t={t} locale={locale} h={millioneaRules} />}") === 1);
    const h = { source: "CONFIG", weekCode: null, ticketPrice: 2500, floor: 3_000_000, feeRate: 0.11, traRate: 0.1, gbtRate: 0.05, ticketCap: 7, openWeekday: 2,
      openAt: "06:00", closeWeekday: 4, closeAt: "20:30", minLockBufferMinutes: 40, voidDeadlineHours: 36, objectionWindowHours: 30, objectionNotBeforeAt: "11:00",
      freeCancelMinutes: 9, examples: { shared: null, floorWeek: null } };
    const out = Object.fromEntries(LOCS.map((l) => [l, plain(createElement(MillioneaHelp, { t: dict[l], locale: l, h }))])) as Record<string, string>;
    const scoped = LOCS.every((l) => out[l].includes(Utils.fill(dict[l].millioneaFairness.helpScope, { yes: sideWordIn(l, "YES", "MARKET"), no: sideWordIn(l, "NO", "MARKET") })));
    ok("H.2 · the block opens by naming the products the FAQ above is about (MB-71), in every language", scoped, J(LOCS.map((l) => out[l].slice(0, 90))));
    ok("H.3 · ⭐ its figures are the rules': the price, the fee and the free cancel driven at non-default values appear, in every language",
      LOCS.every((l) => out[l].includes("TZS 2,500") && out[l].includes("11%") && out[l].includes("9")) && !out.en.includes("TZS 1,000") && !out.en.includes("13%"),
      J(LOCS.map((l) => out[l].length)));
    ok("H.4 · the five questions are answered, and the share that can fall below the price is said (MR-25)",
      LOCS.every((l) => ["helpQ1", "helpQ2", "helpQ3", "helpQ4", "helpQ5"].every((k) => out[l].includes(dict[l].millioneaFairness[k])))
        && out.en.includes("one share can be smaller than the ticket price"));
    const sunset: Record<string, string[]> = {
      en: ["the week on sale when the stop is ordered", "while no week is on sale and a week's results are being decided",
        "the next week to open, even at less than a week's notice", "a week named a full week ahead", "A final week never opens before its announced time",
        "once a week is final, the Millionea page and every ticket form opened from then on say so", "and a ticket cannot be bought from a form opened before.",
        "highest-scoring tickets"],
      sw: ["wiki inayouzwa wakati usimamishaji unapoamriwa", "wakati hakuna wiki inayouzwa na matokeo ya wiki yanaamuliwa", "hata kwa notisi ya chini ya wiki moja",
        "au, wakati wowote, wiki inayotajwa wiki nzima kabla", "haifunguliwi kabla ya muda wake uliotangazwa",
        "wiki ikishakuwa ya mwisho, ukurasa wa Millionea na kila fomu ya kujaza tiketi inayofunguliwa baada ya hapo husema hivyo",
        "na tiketi haiwezi kununuliwa kupitia fomu iliyofunguliwa kabla ya hapo.", "tiketi zenye alama za juu zaidi"],
      zh: ["下令停办时正在销售的一周", "若在无周正在销售、且某周结果正在确定期间下令停办", "即使通知不足一周", "或随时提前一整周指定的一周", "绝不早于其公布的时间开放",
        "一周一旦成为最后一周，Millionea 页面及此后打开的每个填写彩票页面都会注明", "且不能通过此前打开的填写彩票页面购票。", "本周得分最高的彩票"],
    };
    // S6-INT 9 · the lead ruling of 2026-10-22 (S7-F9 3): ONE wording for the final week's rule. The stop line ends in {rule},
    // which How to play fills with `finalWeekRule`, so the line is read as it is drawn; its stop clauses stay these.
    const sunsetLine = Object.fromEntries(LOCS.map((l) => [l, Utils.fill(dict[l].millionea.ruleSunset, { rule: dict[l].millionea.finalWeekRule }) as string])) as Record<string, string>;
    const sunsetOff = LOCS.flatMap((l) => sunset[l].filter((s) => !sunsetLine[l].includes(s)).map((s) => `${l}: ${s.slice(0, 30)}`));
    // Round 6 · the old promises refused: an announcement "in advance", round 4's "or else" (the full-notice path is open
    // at any time), and "its buyers are told" (a week made final on sale tells only the forms opened from then on).
    const SUNSET_OLD = /announced in advance|inatangazwa mapema|将提前公布|house|nyumba|平台|or else a week|au vinginevyo|否则为|its buyers are told|wanunuzi wake wanaambiwa|其购买者会被告知/i;
    const sunsetOld = LOCS.filter((l) => SUNSET_OLD.test(sunsetLine[l]));
    // Round 8 · the pattern's own control: mln-sf's three old sunset lines, each of which it must catch.
    const OLD_SUNSET = ["If Millionea is ever stopped for good, its final week is announced in advance, and the unwon pool goes to that week's highest-scoring tickets",
      "Ikiwa Millionea itafungwa kabisa, wiki yake ya mwisho inatangazwa mapema, na bwawa ambalo halijashindwa linakwenda kwa tiketi zenye alama za juu za wiki hiyo",
      "若 Millionea 永久停办，其最后一周将提前公布，未中奖的奖池归该周得分最高的彩票"];
    // ⛔ Round 5, HIGH-1 · the insider line beside it once named the house in all three languages (mln-sf fixed it,
    //    6a15b66f): its own words are held here too, against the old strings as the control.
    const HOUSE_RULE = /house|nyumba|平台/i;
    const insiderHouse = LOCS.filter((l) => HOUSE_RULE.test(dict[l].millionea.ruleInsider));
    const OLD_INSIDER = ["Staff and house accounts cannot buy", "Watumishi na akaunti za nyumba hawawezi kununua", "员工与平台账户不能购买"];
    ok("H.12 · ⛔ rounds 4 to 8, and S7 round 3's stale-form refusal at the merge · How to play's sunset line says what is built — the week on sale made final at once; while no week is on sale and one is being decided, the next week, even at short notice; at any time a full week ahead; never opened before its announced time; once final, the page and every ticket form opened from then on say so, and a ticket cannot be bought from a form opened before; and the final week's rule in its one wording (`finalWeekRule`, filled in as {rule}): if no ticket gets 10/10, the pool is shared by that week's highest-scoring tickets — with none of the old promises, and neither it nor the insider line beside it names the house, in any language (the old sunset and insider strings, each caught, are the controls)",
      sunsetOff.length === 0 && sunsetOld.length === 0 && insiderHouse.length === 0 && OLD_INSIDER.every((s) => HOUSE_RULE.test(s))
        && OLD_SUNSET.every((s) => SUNSET_OLD.test(s)) && /at any time, a week named a full week ahead/.test(dict.en.millionea.ruleSunset),
      [...sunsetOff, ...sunsetOld, ...insiderHouse.map((l) => `${l}: ruleInsider names the house`)].join(" · "));
    ok("H.10 · ⛔ round 3, item 3 · How to play's 10/10 and carry lines are followed at once by the final week's exception, in every language, in its one wording (`finalWeekRule`; the lead's ruling (a) of 2026-10-22 retired /help's own sentence) — /help says nothing false in a final week",
      LOCS.every((l) => { const at = out[l].indexOf(dict[l].millionea.howFour); const ex = out[l].indexOf(dict[l].millionea.finalWeekRule); return at >= 0 && ex > at; })
        && /highest-scoring/.test(dict.en.millionea.finalWeekRule) && LOCS.every((l) => !("helpFinalWeek" in dict[l].millioneaFairness)),
      J(LOCS.map((l) => out[l].indexOf(dict[l].millionea.finalWeekRule))));
    const guide = read("docs/maswali-operator-guide.html");
    // MASWALI-BUILD S6-DOCS · the guide's part 1 ("How Millionea works", what every admin reads first) is where staff learn
    // what to tell a player; the desk's scripts themselves live on the Ticket lookup page, read from their one source.
    const p1 = guide.indexOf('<h2 id="part-1">'), p2 = guide.indexOf('<h2 id="part-2">');
    const told = p1 < 0 || p2 < p1 ? "" : guide.slice(p1, p2);
    const row = (name: string) => told.slice(told.indexOf(`<tr><td>${name}</td>`), told.indexOf("</tr>", told.indexOf(`<tr><td>${name}</td>`)));
    ok("H.11 · ⛔ round 3, M3 · the admin guide promises no unbuilt path — no fault void, no player objection pulling a reserve in — and its part 1 carries the final week's exception where it states the win and the rollover, and states the exception itself (the highest score shares)",
      !guide.includes("a platform fault voids the whole week") && !guide.includes("An objection that voids a main later")
        && /final week/.test(row("Ten counted of fifteen")) && /final\s+week/.test(row("Rollover")) && /highest score share/.test(row("The final week"))
        && told.length > 1000, J({ told: told.length }));
  }
  {
    const page = decomment(read("src/app/fairness/page.tsx"));
    const sectionSrc = decomment(read("src/app/fairness/millionea-section.tsx"));
    ok("H.5 · /fairness gains one import and one element, and the section's first act is the rollout: below it, nothing is drawn",
      count(page, 'import { MillioneaFairness } from "./millionea-section";') === 1 && count(page, "<MillioneaFairness t={t} locale={locale} />") === 1
        && /const r = await resolveMillionea\(\);\s*if \(!r\.visible\) return null;/.test(sectionSrc));
  }
  {
    const dir = "src/app/fairness/millionea/[serial]";
    const page = decomment(read(`${dir}/page.tsx`));
    const at = (s: string) => page.indexOf(s);
    // ⭐ S6-DOCS (item 1) · the page asks the TICKETS' gate (L5: a kill hides the product, never a holder's own tickets —
    // the ticket page's own; it asked the product's gate, the review's finding), and its title S5's tickets door, as the
    // ticket page does. A predicate, so the control below can plant the product's gate back and see it caught.
    const proofGateOk = (src: string) => {
      const fn = src.slice(src.indexOf("export async function generateMetadata"), src.indexOf("export default async function"));
      const door = /if \(!\(await millioneaTicketsDoor\(\)\)\) return notFoundMetadata\(\);/.exec(fn);
      return (src.match(/const gate = await millioneaTicketGate\(\);/g) ?? []).length === 1 && !/millioneaGate\(/.test(src)
        && !!door && door.index < fn.indexOf("getServerT()");
    };
    ok("H.6 · ⛔ the proof route: the gate in the page and its metadata, sign-in for every signed-out reader before anything is read, and the one 404 for every other serial",
      proofGateOk(page)
        && at("if (!gate.userId) redirect(") > 0 && at("if (!gate.userId) redirect(") < at("await millioneaTicketProof(gate.userId, serial)")
        && page.includes("if (!p) notFound();") && page.includes("return { title: `${t.millioneaFairness.proofTitle} · ${t.millionea.productLabel}` };"));
    ok("H.6c · control · the page planted back on the product's gate (a holder's proof hidden at a kill) is caught",
      !proofGateOk(page.replace("const gate = await millioneaTicketGate();", "const gate = await millioneaGate();")));
    // ⛔ Read as what each file PRINTS — its string literals, template parts and JSX text, the platform's one print measure
    // (`player-surface-text.mts`) — never the span between two literals: a quote-to-quote pattern ran from the last import's
    // closing quote across the component's own name (`MillioneaProofLoading`) to the next literal, and failed both files at
    // the suite's first run (the integration, 2026-10-19). The controls plant a product word as JSX text, as a literal and as
    // a dictionary read (each caught), and hold that each component's name, an identifier, is in the code and not caught.
    const { printedTexts } = await import("./player-surface-text.mts");
    const printsProduct = (file: string, code: string) => /\bt\.millionea/.test(code) || /Millionea/.test(printedTexts(file, code));
    const quiet = ["loading.tsx", "error.tsx"].map((f) => ({ file: `${dir}/${f}`, code: decomment(read(`${dir}/${f}`)) }));
    const plants = [
      [quiet[0], "title={<GhostText>{t.footer.fairness}</GhostText>}", "title={<GhostText>Millionea</GhostText>}"],
      [quiet[1], 'logTag="millionea-proof"', 'logTag="Millionea proof"'],
      [quiet[0], "eyebrow={t.footer.fairness}", "eyebrow={t.millionea.productLabel}"],
    ] as const;
    const caught = plants.map(([q, from, to]) => { const planted = q.code.replace(from, to); return planted !== q.code && printsProduct(q.file, planted); });
    ok("H.7 · ⛔ its loading and error states print no word of the product (they render before, or beside, the gate's answer) — what each file prints, never the span between two literals; a product word planted as JSX text, as a literal or as a dictionary read is caught, and each component's own name is not",
      quiet.every((q) => !printsProduct(q.file, q.code) && /Millionea/.test(q.code)) && caught.every(Boolean) && /^"use client";/.test(read(`${dir}/loading.tsx`).trim()),
      J({ printing: quiet.filter((q) => printsProduct(q.file, q.code)).map((q) => q.file), caught }));
    const proof = await FAIR.millioneaTicketProof(P1, t1[0].serial);
    const html = proof?.proof ? renderToStaticMarkup(createElement(ProofCheck, {
      weekId: proof.week.id, ticketId: proof.ticket.id, salt: proof.ticket.salt, picks: proof.ticket.picks, proof: proof.proof,
      root: proof.week.ticketMerkleRoot, words: { checking: "CHECKING", ok: "MATCHES", bad: "DIFFERS" },
    })) : "";
    ok("H.8 · the browser's own re-check never claims a result on the server: its first frame says it is checking",
      html.includes("CHECKING") && !html.includes("MATCHES") && !html.includes("DIFFERS"), html.slice(0, 120));
    const marked = ["src/app/legal/rules/millionea/page.tsx", `${dir}/page.tsx`].map((f) => decomment(read(f)));
    ok("H.9 · review #15 · the rules page and the proof route wear the Preview mark at STAFF_PREVIEW — S5's one component, once each — and the proof's loading state draws none, as no S5 loading state does",
      marked.every((s) => count(s, 'import { MillioneaPreviewMark } from "@/app/millionea/millionea-parts";') === 1 && count(s, "{gate.preview && <MillioneaPreviewMark t={t} />}") === 1)
        && !read(`${dir}/loading.tsx`).includes("MillioneaPreviewMark"));
  }
}

console.log(`${NL}@@SUMMARY ${JSON.stringify({ pass, fail, store: STORE })}`);
process.exit(fail === 0 ? 0 : 1);
