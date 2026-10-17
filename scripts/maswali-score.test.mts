/**
 * test:maswali-score — THE ONE GRADER, OVER EVERY SHAPE A WEEK CAN END IN (MASWALI-BUILD S2; MR-17…MR-19).
 *
 *   npx tsx scripts/maswali-score.test.mts     (npm run test:maswali-score)
 *
 *   §1 ⭐ the table: 0…10 voided mains × all 32 reserve-void patterns = 352 cases, against an oracle written another way
 *   §2 the plan's named cases (MR-17's four), and the set depends on HOW MANY mains voided, never which or when
 *   §3 the gate (MR-19): what still needs sealing; later reserves do not gate; all five sealed decides a week void
 *   §4 weekVoidCertain: true the moment the voids outnumber what could still come back
 *   §5 scoring: 10/10 wins, 9/10 does not, an unused reserve is never graded, PENDING is never a score
 *   §6 the display map: stable under a late seal of an unused reserve; every slot accounted for
 *   §7 refusals: a malformed week, a partial ticket, an unknown outcome
 */
import {
  MAIN_COUNT, RESERVE_COUNT, SLOT_COUNT, canonicalPicks, displayMap, grade, gradedSet, settlementGate, slotLabel, slotOf,
  topScore, weekVoidCertain, type GradableQuestion, type MaswaliOutcome, type MaswaliPick,
} from "../src/lib/maswali-score.ts";

process.exitCode = 1;
let pass = 0, fail = 0;
const failures: string[] = [];
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) { pass++; return; }
  fail++; failures.push(label);
  console.log(`FAIL ${label}${detail ? ` — ${detail}` : ""}`);
};
const loud = (label: string, cond: boolean, detail = "") => { ok(label, cond, detail); if (cond) console.log(`PASS ${label}`); };
const throws = (fn: () => unknown) => { try { fn(); return false; } catch { return true; } };

/** A week whose every question is sealed: mains YES unless voided, reserves NO unless voided. */
function week(voidedMains: readonly number[], voidedReserves: readonly number[], unsealed: readonly number[] = []): GradableQuestion[] {
  const qs: GradableQuestion[] = [];
  for (let i = 1; i <= MAIN_COUNT; i++) qs.push({ role: "MAIN", ordinal: i, outcome: voidedMains.includes(i) ? "VOID" : "YES" });
  for (let j = 1; j <= RESERVE_COUNT; j++) qs.push({ role: "RESERVE", ordinal: j, outcome: voidedReserves.includes(j) ? "VOID" : "NO" });
  for (const slot of unsealed) qs[slot - 1] = { ...qs[slot - 1], outcome: null };
  return qs;
}
/** Picks that match every sealed outcome (mains YES, reserves NO). */
const perfect: MaswaliPick[] = [...Array(MAIN_COUNT).fill("YES"), ...Array(RESERVE_COUNT).fill("NO")];

// ── §1 · the 352-case table ─────────────────────────────────────────────────
console.log("\n§1 · ⭐ 11 voided-main counts × 32 reserve-void patterns = 352 cases");
{
  let cases = 0;
  for (let v = 0; v <= MAIN_COUNT; v++) {
    for (let pattern = 0; pattern < 32; pattern++) {
      cases++;
      // Which mains void varies with the pattern too, so "which" is exercised alongside "how many".
      const order = Array.from({ length: MAIN_COUNT }, (_, i) => ((i * 7 + pattern) % MAIN_COUNT) + 1);
      const voidedMains = order.slice(0, v).sort((a, b) => a - b);
      const voidedReserves = [1, 2, 3, 4, 5].filter((j) => (pattern >> (j - 1)) & 1);
      // The oracle, written as bit arithmetic rather than the module's filter-and-slice.
      const usableReserves: number[] = [];
      for (let j = 1; j <= RESERVE_COUNT; j++) if (!((pattern >> (j - 1)) & 1)) usableReserves.push(MAIN_COUNT + j);
      const expectVoid = v > usableReserves.length;
      const expectSlots = expectVoid ? null : [...Array.from({ length: MAIN_COUNT }, (_, i) => i + 1).filter((s) => !voidedMains.includes(s)), ...usableReserves.slice(0, v)];
      const qs = week(voidedMains, voidedReserves);
      const set = gradedSet(qs);
      const g = grade(qs, perfect);
      const tag = `v=${v} reserves-void=${voidedReserves.join("") || "none"} mains-void=${voidedMains.join(",") || "none"}`;
      if (expectVoid) {
        ok(`1 · ${tag} → WEEK_VOID`, set.kind === "WEEK_VOID" && g.kind === "WEEK_VOID" && weekVoidCertain(qs), JSON.stringify(set));
      } else {
        ok(`1 · ${tag} → graded ${expectSlots!.join(",")}`, set.kind === "SET" && JSON.stringify(set.slots) === JSON.stringify(expectSlots)
          && g.kind === "GRADED" && g.score === MAIN_COUNT && g.wins && !weekVoidCertain(qs), JSON.stringify(set));
        if (set.kind === "SET") {
          ok(`1 · ${tag} → the k-th voided main pairs with the k-th usable reserve`,
            JSON.stringify(set.pairs) === JSON.stringify(voidedMains.map((main, k) => ({ main, reserve: usableReserves[k] }))));
        }
      }
    }
  }
  loud(`1.count · all ${cases} cases ran`, cases === 352, String(cases));
  loud("1.table · every case agrees with the oracle", failures.filter((f) => f.startsWith("1 · ")).length === 0);
}

// ── §2 · the named cases ────────────────────────────────────────────────────
console.log("\n§2 · MR-17's named cases");
{
  const g0 = gradedSet(week([], []));
  loud("2.1 · 0 voids: M1…M10 are graded", g0.kind === "SET" && JSON.stringify(g0.slots) === JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
  const g1 = gradedSet(week([3], [1]));
  loud("2.2 · M3 void and R1 void: R2 is graded", g1.kind === "SET" && g1.slots.includes(12) && !g1.slots.includes(3) && !g1.slots.includes(11)
    && JSON.stringify(g1.pairs) === JSON.stringify([{ main: 3, reserve: 12 }]));
  loud("2.3 · 5 voids with R3 void: WEEK_VOID", gradedSet(week([1, 2, 3, 4, 5], [3])).kind === "WEEK_VOID");
  loud("2.4 · 6 voids: WEEK_VOID", gradedSet(week([1, 2, 3, 4, 5, 6], [])).kind === "WEEK_VOID");
  loud("2.5 · 5 voids, no reserve void: all five reserves graded", (() => { const s = gradedSet(week([2, 4, 6, 8, 10], [])); return s.kind === "SET" && [11, 12, 13, 14, 15].every((x) => s.slots.includes(x)); })());
  // The SET depends only on how many voided: two different pairs of voided mains give the same reserves.
  const a = gradedSet(week([1, 2], [])), b = gradedSet(week([9, 10], []));
  loud("2.6 · which mains void never changes which reserves score", a.kind === "SET" && b.kind === "SET"
    && JSON.stringify(a.slots.filter((s) => s > 10)) === JSON.stringify(b.slots.filter((s) => s > 10)));
}

// ── §3 · the gate ───────────────────────────────────────────────────────────
console.log("\n§3 · the settlement gate (MR-19)");
{
  const allButM4 = week([], [], [4]);
  const g = settlementGate(allButM4);
  loud("3.1 · an unsealed main gates everything", !g.ready && g.needs.includes(4));
  loud("3.2 · …and grade() says PENDING, never a score", grade(allButM4, perfect).kind === "PENDING");
  const noVoidReservesOpen = week([], [], [11, 12, 13, 14, 15]);
  loud("3.3 · no main voided: ready with every reserve still unsealed (later reserves do not gate)", settlementGate(noVoidReservesOpen).ready);
  const twoVoidsR1VoidR2open = week([2, 7], [1], [12, 13, 14, 15]);
  const g2 = settlementGate(twoVoidsR1VoidR2open);
  loud("3.4 · two voided mains, R1 void, R2 unsealed: not ready, R2 onward needed", !g2.ready && g2.needs[0] === 12, JSON.stringify(g2));
  const reached = week([2, 7], [1], [14, 15]);
  loud("3.5 · …R2 and R3 sealed usable: ready — R4 and R5 do not gate", settlementGate(reached).ready && !settlementGate(reached).weekVoid);
  const sixVoids = week([1, 2, 3, 4, 5, 6], [], [15]);
  loud("3.6 · six voided mains with R5 unsealed: not ready (MR-19 needs all five sealed)", !settlementGate(sixVoids).ready);
  const sixVoidsAll = week([1, 2, 3, 4, 5, 6], []);
  loud("3.7 · …all five sealed: ready, and it is a week void", settlementGate(sixVoidsAll).ready && settlementGate(sixVoidsAll).weekVoid);
}

// ── §4 · weekVoidCertain ────────────────────────────────────────────────────
console.log("\n§4 · a week void is known as soon as it is certain");
{
  loud("4.1 · three voided mains with R1…R3 void and R4, R5 unsealed: certain (3 > 2)", weekVoidCertain(week([1, 2, 3], [1, 2, 3], [14, 15])));
  loud("4.2 · two voided mains with R1…R3 void and R4, R5 unsealed: not yet (2 ≤ 2)", !weekVoidCertain(week([1, 2], [1, 2, 3], [14, 15])));
  loud("4.3 · six voided mains, reserves unsealed: certain (6 > 5)", weekVoidCertain(week([1, 2, 3, 4, 5, 6], [], [11, 12, 13, 14, 15])));
  loud("4.4 · a clean week: never", !weekVoidCertain(week([], [])));
}

// ── §5 · scoring ────────────────────────────────────────────────────────────
console.log("\n§5 · scoring");
{
  const qs = week([4], []);
  loud("5.1 · a perfect ticket wins 10/10 with R1 standing in for M4", (() => { const g = grade(qs, perfect); return g.kind === "GRADED" && g.score === 10 && g.wins; })());
  const miss = [...perfect]; miss[0] = "NO";
  loud("5.2 · one wrong main: 9/10 does not win", (() => { const g = grade(qs, miss); return g.kind === "GRADED" && g.score === 9 && !g.wins; })());
  const wrongVoided = [...perfect]; wrongVoided[3] = "NO";
  loud("5.3 · a wrong answer on the VOIDED main costs nothing", (() => { const g = grade(qs, wrongVoided); return g.kind === "GRADED" && g.wins; })());
  const wrongUnused = [...perfect]; wrongUnused[14] = "YES";
  loud("5.4 · a wrong answer on an UNUSED reserve costs nothing (never graded)", (() => { const g = grade(qs, wrongUnused); return g.kind === "GRADED" && g.wins; })());
  const wrongUsed = [...perfect]; wrongUsed[10] = "YES";
  loud("5.5 · a wrong answer on the reserve that stood in DOES cost", (() => { const g = grade(qs, wrongUsed); return g.kind === "GRADED" && g.score === 9; })());
  loud("5.6 · a week void grades no ticket", grade(week([1, 2, 3, 4, 5, 6], []), perfect).kind === "WEEK_VOID");
  loud("5.7 · topScore: the best score and how many hold it", JSON.stringify(topScore([7, 9, 9, 3])) === JSON.stringify({ score: 9, tickets: 2 }) && topScore([]) === null);
}

// ── §6 · the display map ────────────────────────────────────────────────────
console.log("\n§6 · the display map");
{
  const before = displayMap(week([4], [], [13, 14, 15]));
  const after = displayMap(week([4], [3]));
  loud("6.1 · it maps all fifteen slots", before !== null && before.length === SLOT_COUNT);
  loud("6.2 · M4 reads REPLACED_BY A1 (slot 11)", before?.[3]?.state === "REPLACED_BY" && (before?.[3] as { reserve: number }).reserve === 11);
  const graded = (m: typeof before) => JSON.stringify(m?.filter((r) => r.state === "GRADED" || r.state === "REPLACED_BY"));
  loud("6.3 · ⭐ stable: a later seal of an unused reserve (A3 voided) changes nothing graded", graded(before) === graded(after));
  loud("6.4 · …and that reserve now reads VOID, the others UNUSED", after?.[12]?.state === "VOID" && after?.[13]?.state === "UNUSED");
  loud("6.5 · no map before the record is final", displayMap(week([], [], [1])) === null);
  loud("6.6 · labels: M1…M10 and A1…A5", slotLabel(1) === "M1" && slotLabel(10) === "M10" && slotLabel(11) === "A1" && slotLabel(15) === "A5" && slotOf("RESERVE", 5) === 15);
}

// ── §7 · refusals ───────────────────────────────────────────────────────────
console.log("\n§7 · refusals");
{
  loud("7.1 · a week of 14 questions", throws(() => gradedSet(week([], []).slice(0, 14))));
  loud("7.2 · a main twice", throws(() => gradedSet([...week([], []).slice(0, 14), { role: "MAIN", ordinal: 1, outcome: "YES" }])));
  loud("7.3 · a reserve ordinal 6", throws(() => slotOf("RESERVE", 6)));
  loud("7.4 · an unknown outcome", throws(() => gradedSet([...week([], []).slice(0, 14), { role: "RESERVE", ordinal: 5, outcome: "MAYBE" as MaswaliOutcome }])));
  loud("7.5 · a ticket of 14 picks", throws(() => canonicalPicks(perfect.slice(0, 14))));
  loud("7.6 · a pick that is not YES or NO", throws(() => canonicalPicks([...perfect.slice(0, 14), "VOID"])));
}

console.log(`\n${"═".repeat(70)}\n  MASWALI SCORE: ${pass} passed, ${fail} failed\n${"═".repeat(70)}`);
const MIN_ASSERTIONS = 1;
if (pass < MIN_ASSERTIONS) { console.error(`!! FLOOR — ran ${pass}, fewer than ${MIN_ASSERTIONS}.`); process.exit(4); }
process.exit(fail === 0 ? 0 : 1);
