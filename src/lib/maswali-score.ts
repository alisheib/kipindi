/**
 * MASWALI MILLIONEA — THE ONE GRADER (MASWALI-BUILD S2; MASWALI-PLAN §3 MR-17…MR-19, manifest L9).
 *
 * ⭐ ONE IMPLEMENTATION. The slip's preview, the ticket page, the register, the officer's gate and settlement all import
 * THIS module, so the screen and the money can never grade a ticket two ways. Pure and isomorphic: no Prisma, no
 * `server-only`, no config, no clock.
 *
 * A week has fifteen questions on fifteen canonical SLOTS: M1…M10 on slots 1–10, R1…R5 (shown A1–A5) on 11–15.
 * A ticket's picks are fifteen YES/NO answers indexed by slot (`picks[slot - 1]`).
 *
 * THE RULE (MR-17):
 *   voided = the mains sealed VOID, in ascending ordinal;
 *   usable = the reserves sealed YES or NO, in ascending ordinal (a void reserve is skipped);
 *   if |voided| > |usable|                → WEEK_VOID (MR-18: every ticket refunded in full);
 *   graded = every non-void main + the first |voided| usable reserves (the k-th voided main ← the k-th usable reserve);
 *   score  = how many of the ten graded questions the ticket answered right; it WINS only at 10 of 10.
 * ⭐ The graded SET depends only on how many mains voided — never on when or in what order. The pairing (M4 → R1) is
 *    for display only (`displayMap`).
 *
 * ⛔ Nothing here grades an UNFINISHED record: until `settlementGate` says ready, `grade` answers PENDING, so a screen
 *    can never show a provisional score as if it were the week's.
 */

export type MaswaliOutcome = "YES" | "NO" | "VOID";
export type MaswaliPick = "YES" | "NO";
export type MaswaliRole = "MAIN" | "RESERVE";

export const MAIN_COUNT = 10;
export const RESERVE_COUNT = 5;
export const SLOT_COUNT = MAIN_COUNT + RESERVE_COUNT;

/** The question as the grader sees it: where it sits, and its sealed outcome (null while unsealed). */
export type GradableQuestion = { role: MaswaliRole; ordinal: number; outcome: MaswaliOutcome | null };

/** The canonical slot of a question: M1…M10 → 1…10, R1…R5 → 11…15. Throws on an ordinal outside its role's range. */
export function slotOf(role: MaswaliRole, ordinal: number): number {
  if (!Number.isInteger(ordinal)) throw new Error(`[maswali-score] ordinal ${ordinal} is not a whole number`);
  if (role === "MAIN" && ordinal >= 1 && ordinal <= MAIN_COUNT) return ordinal;
  if (role === "RESERVE" && ordinal >= 1 && ordinal <= RESERVE_COUNT) return MAIN_COUNT + ordinal;
  throw new Error(`[maswali-score] ${role} ordinal ${ordinal} is outside the week's shape`);
}

/** The label a player reads: M1…M10, and A1…A5 for the reserves ("Akiba", O-8). The code keeps R1…R5. */
export function slotLabel(slot: number): string {
  if (slot >= 1 && slot <= MAIN_COUNT) return `M${slot}`;
  if (slot > MAIN_COUNT && slot <= SLOT_COUNT) return `A${slot - MAIN_COUNT}`;
  throw new Error(`[maswali-score] slot ${slot} is outside 1…${SLOT_COUNT}`);
}

type Shaped = { mains: GradableQuestion[]; reserves: GradableQuestion[] };

/**
 * The week's fifteen questions in canonical order — or a throw. ⛔ A week that is not exactly ten mains and five reserves
 * with each ordinal once is not a week the grader may answer for (the schema's CHECKs make this unreachable).
 */
function shape(questions: readonly GradableQuestion[]): Shaped {
  const mains: GradableQuestion[] = new Array(MAIN_COUNT);
  const reserves: GradableQuestion[] = new Array(RESERVE_COUNT);
  for (const q of questions) {
    const slot = slotOf(q.role, q.ordinal);
    const into = q.role === "MAIN" ? mains : reserves;
    const i = q.role === "MAIN" ? slot - 1 : slot - MAIN_COUNT - 1;
    if (into[i]) throw new Error(`[maswali-score] ${slotLabel(slot)} appears twice`);
    if (q.outcome !== null && q.outcome !== "YES" && q.outcome !== "NO" && q.outcome !== "VOID") {
      throw new Error(`[maswali-score] ${slotLabel(slot)} has an outcome the grader does not know: ${JSON.stringify(q.outcome)}`);
    }
    into[i] = q;
  }
  if (questions.length !== SLOT_COUNT || mains.some((q) => !q) || reserves.some((q) => !q)) {
    throw new Error(`[maswali-score] a week is exactly ${MAIN_COUNT} mains and ${RESERVE_COUNT} reserves (got ${questions.length})`);
  }
  return { mains, reserves };
}

/**
 * ⭐ MR-19 · IS THE RECORD FINAL ENOUGH TO GRADE? The question half of the gate (objections and the settled stamp are the
 * service's half, checked inside its lock):
 *   · all ten mains sealed;
 *   · R1…Rj sealed, where j is the smallest index whose non-void count reaches the number of voided mains (j = 0 when no
 *     main voided);
 *   · if no such j ≤ 5 exists, all five reserves sealed — which is the whole-week void.
 * `needs` lists the slots still to seal for the gate (empty when ready); later reserves are sealed for the record but do
 * not gate payout.
 */
export type GateState =
  | { ready: true; weekVoid: boolean; needs: [] }
  | { ready: false; weekVoid: false; needs: number[] };

export function settlementGate(questions: readonly GradableQuestion[]): GateState {
  const { mains, reserves } = shape(questions);
  const unsealedMains = mains.filter((q) => q.outcome === null).map((q) => slotOf("MAIN", q.ordinal));
  if (unsealedMains.length > 0) {
    // The reserves a void could still need are every reserve not yet sealed; list the mains first, they gate everything.
    return { ready: false, weekVoid: false, needs: [...unsealedMains, ...reserves.filter((q) => q.outcome === null).map((q) => slotOf("RESERVE", q.ordinal))] };
  }
  const voided = mains.filter((q) => q.outcome === "VOID").length;
  if (voided === 0) return { ready: true, weekVoid: false, needs: [] };
  let usable = 0;
  for (let j = 0; j < RESERVE_COUNT; j++) {
    const r = reserves[j];
    if (r.outcome === null) {
      // R(j+1) decides whether the count is reached; it and every unsealed reserve after it may still be needed.
      return { ready: false, weekVoid: false, needs: reserves.slice(j).filter((q) => q.outcome === null).map((q) => slotOf("RESERVE", q.ordinal)) };
    }
    if (r.outcome !== "VOID") usable++;
    if (usable >= voided) return { ready: true, weekVoid: false, needs: [] };
  }
  // Every reserve sealed and still too few usable: MR-18.
  return { ready: true, weekVoid: true, needs: [] };
}

/**
 * ⭐ MR-18 · IS THE WHOLE-WEEK VOID ALREADY CERTAIN? True as soon as the voided mains outnumber the reserves that could
 * still come back usable — before every question is sealed, so sales can stop the moment a pre-close void dooms the week.
 */
export function weekVoidCertain(questions: readonly GradableQuestion[]): boolean {
  const { mains, reserves } = shape(questions);
  const voided = mains.filter((q) => q.outcome === "VOID").length;
  const couldBeUsable = reserves.filter((q) => q.outcome !== "VOID").length;
  return voided > couldBeUsable;
}

/** The graded set: which ten slots score, and which reserve stands in for which voided main (display only). */
export type GradedSet =
  | { kind: "PENDING"; needs: number[] }
  | { kind: "WEEK_VOID" }
  | { kind: "SET"; slots: number[]; pairs: Array<{ main: number; reserve: number }> };

/** MR-17 over a FINAL record (`settlementGate` ready). The slots ascend: graded mains first, then the reserves used. */
export function gradedSet(questions: readonly GradableQuestion[]): GradedSet {
  const gate = settlementGate(questions);
  if (!gate.ready) return { kind: "PENDING", needs: gate.needs };
  if (gate.weekVoid) return { kind: "WEEK_VOID" };
  const { mains, reserves } = shape(questions);
  const voided = mains.filter((q) => q.outcome === "VOID").map((q) => slotOf("MAIN", q.ordinal));
  const usable = reserves.filter((q) => q.outcome === "YES" || q.outcome === "NO").map((q) => slotOf("RESERVE", q.ordinal));
  if (voided.length > usable.length) return { kind: "WEEK_VOID" };
  const used = usable.slice(0, voided.length);
  const slots = [...mains.filter((q) => q.outcome !== "VOID").map((q) => slotOf("MAIN", q.ordinal)), ...used];
  if (slots.length !== MAIN_COUNT) throw new Error(`[maswali-score] the graded set has ${slots.length} questions, not ${MAIN_COUNT}`);
  return { kind: "SET", slots, pairs: voided.map((main, k) => ({ main, reserve: used[k] })) };
}

/** A ticket's fifteen picks, indexed by slot − 1. ⛔ Read only through `canonicalPicks`, which refuses a partial ticket. */
export type CanonicalPicks = readonly MaswaliPick[];

/** Validate and copy fifteen picks. Throws on anything but exactly fifteen YES/NO answers (MR-9). */
export function canonicalPicks(raw: unknown): CanonicalPicks {
  if (!Array.isArray(raw) || raw.length !== SLOT_COUNT) throw new Error(`[maswali-score] a ticket answers all ${SLOT_COUNT} questions`);
  return raw.map((p, i) => {
    if (p !== "YES" && p !== "NO") throw new Error(`[maswali-score] ${slotLabel(i + 1)} is not answered YES or NO`);
    return p;
  });
}

export type Grade =
  | { kind: "PENDING"; needs: number[] }
  | { kind: "WEEK_VOID" }
  | { kind: "GRADED"; slots: number[]; score: number; wins: boolean };

/** ⭐ MR-17 · grade one ticket against a final record. PENDING until the gate is ready; never a provisional score. */
export function grade(questions: readonly GradableQuestion[], picks: CanonicalPicks): Grade {
  const set = gradedSet(questions);
  if (set.kind !== "SET") return set;
  const { mains, reserves } = shape(questions);
  const outcomeAt = (slot: number) => (slot <= MAIN_COUNT ? mains[slot - 1] : reserves[slot - MAIN_COUNT - 1]).outcome;
  const p = canonicalPicks(picks);
  const score = set.slots.filter((slot) => p[slot - 1] === outcomeAt(slot)).length;
  return { kind: "GRADED", slots: set.slots, score, wins: score === MAIN_COUNT };
}

/**
 * The register's display map: for each of the fifteen slots, what it did in the graded week. Built ONLY from the final
 * record (`gradedSet`), so it is stable — a seal that arrives later for an unused reserve changes nothing graded.
 *   GRADED      — one of the ten that score;
 *   REPLACED_BY — a voided main, with the reserve that stood in for it;
 *   UNUSED      — a reserve the week did not need (never graded);
 *   VOID        — a voided reserve, skipped.
 */
export type DisplayRow =
  | { slot: number; state: "GRADED" }
  | { slot: number; state: "REPLACED_BY"; reserve: number }
  | { slot: number; state: "UNUSED" }
  | { slot: number; state: "VOID" };

export function displayMap(questions: readonly GradableQuestion[]): DisplayRow[] | null {
  const set = gradedSet(questions);
  if (set.kind !== "SET") return null;
  const { reserves } = shape(questions);
  const graded = new Set(set.slots);
  const replaced = new Map(set.pairs.map((p) => [p.main, p.reserve]));
  const rows: DisplayRow[] = [];
  for (let slot = 1; slot <= SLOT_COUNT; slot++) {
    if (graded.has(slot)) rows.push({ slot, state: "GRADED" });
    else if (replaced.has(slot)) rows.push({ slot, state: "REPLACED_BY", reserve: replaced.get(slot) as number });
    else if (slot > MAIN_COUNT && reserves[slot - MAIN_COUNT - 1].outcome === "VOID") rows.push({ slot, state: "VOID" });
    else rows.push({ slot, state: "UNUSED" });
  }
  return rows;
}

/**
 * OD-03 · the sunset's fallback: when a final or regulator-ordered distribution has no 10/10, the highest score among
 * the graded tickets shares. Returns the top score and how many tickets hold it (0 tickets → null).
 */
export function topScore(scores: readonly number[]): { score: number; tickets: number } | null {
  if (scores.length === 0) return null;
  for (const s of scores) if (!Number.isInteger(s) || s < 0 || s > MAIN_COUNT) throw new Error(`[maswali-score] a score of ${s} is not 0…${MAIN_COUNT}`);
  const best = Math.max(...scores);
  return { score: best, tickets: scores.filter((s) => s === best).length };
}
