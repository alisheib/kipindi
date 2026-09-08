/**
 * `npm run test:lifecycle-reach` — CAN A PLAYER REACH EVERY STATE THEY CAN BE IN?
 *
 * 🔴 THIS IS THE GUARD THAT ANSWERS THE CAMPAIGN'S ACTUAL COMPLAINT, in the player's own words:
 * they cannot tell *"what is still running from what is finished, and inside what is finished
 * cannot tell won from lost from voided-and-refunded."* Every other gate in this programme checks
 * that a control BEHAVES — that its count is honest, that its pills do not overlap, that its
 * words are translated. None of them asks the prior question: is there a control at all?
 *
 * ⛔ THE POPULATION IS DERIVED FROM `prisma/schema.prisma`, NEVER TYPED HERE. That is the whole
 * design. A hand-typed list of statuses would be a copy of the schema that agrees with it today —
 * so a value added tomorrow would be unreachable by every control on the platform AND invisible to
 * the guard written to notice exactly that. §6's own words: *"a new enum value fails it by default
 * instead of quietly having no lens."*
 *
 * ⭐ AND IT RUNS THE REAL PREDICATES, not a description of them. Each contract's own
 * `matches…Lens` is imported and executed against a synthetic row per enum value, so what is
 * asserted is what the page will do. A gate that re-implemented the lens logic would be checking
 * its own copy — the "guards that agree, and are both wrong" failure.
 *
 * ── WHAT IT ASSERTS, PER ENUM ────────────────────────────────────────────────────────────────
 *   §1 REACHABLE — every stored value is selected by at least one lens that is NOT `all`.
 *      ⛔ `all` is excluded deliberately: "you can see it if you look at everything" is not
 *      reachability, it is the absence of it. That exclusion is the entire point of the check.
 *   §2 DISJOINT  — no value is selected by two non-`all` lenses. Two pills claiming one row is
 *      how a player is told two different things about the same bet.
 *   §3 CONTROLS  — the enum was really parsed (a schema that stopped parsing would make §1
 *      vacuously true over zero values), and the lens sets are non-trivial.
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { FOLLOW_LENSES, matchesFollowLens, type FollowRow } from "../src/lib/watchlist/following.ts";
import { POSITION_LENSES, matchesLens, type PortfolioRow } from "../src/lib/positions/portfolio.ts";
import { BOARD_LENSES, matchesBoardLens, type BoardRow } from "../src/lib/proposals/board.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => {
  c ? pass++ : fail++;
  console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`);
};

/**
 * ⛔ THE SCHEMA IS THE SOURCE. Parsed rather than imported, because the generated Prisma client
 * is a BUILD ARTEFACT — it can be stale, and this repo has a recorded case of exactly that
 * ("Prisma client stale after a pull"). The `.prisma` file is what a migration changes.
 *
 * ⚠️ Comment lines are dropped before the values are read: `///` doc comments sit inside these
 * enum bodies, and a scan that kept them would invent values like `Clawed`.
 */
const SCHEMA = readFileSync(join(ROOT, "prisma/schema.prisma"), "utf8");
function enumValues(name: string): string[] {
  const m = SCHEMA.match(new RegExp(`enum\\s+${name}\\s*\\{([\\s\\S]*?)\\}`));
  if (!m) return [];
  return m[1]
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("//") && /^[A-Z][A-Z0-9_]*$/.test(l));
}

/**
 * One lifecycle axis: the stored enum, the lens set that is supposed to cover it, and how to build
 * a row that is IN a given state.
 *
 * ⚠️ `row` BUILDS THE MINIMUM THE PREDICATE READS, and each one is commented where the predicate
 * needs more than the status alone — `/watchlist`'s `open` arm is `status === "LIVE" && !
 * selectionClosed`, so a LIVE row must say it is still taking bets or the lens set would look
 * broken when the FIXTURE was.
 */
const AXES = [
  {
    enumName: "PredictionMarketStatus",
    surface: "/watchlist",
    lenses: FOLLOW_LENSES as readonly string[],
    matches: (v: string, lens: string) =>
      matchesFollowLens(
        // ⛔ `selectionClosed: false` — a LIVE market still taking bets. See the note above.
        { status: v, selectionClosed: false } as unknown as FollowRow,
        lens as never,
      ),
  },
  {
    enumName: "PositionStatus",
    surface: "/positions",
    lenses: POSITION_LENSES as readonly string[],
    // ⚠️ `/positions` has a `settled` UNION pill as well as the four outcome arms, so a settled
    //    value is legitimately matched by TWO lenses. §2 handles it — see DISJOINT_EXEMPT.
    matches: (v: string, lens: string) =>
      matchesLens({ status: v } as unknown as PortfolioRow, lens as never),
  },
  {
    enumName: "ProposalStatus",
    surface: "/proposals",
    lenses: BOARD_LENSES as readonly string[],
    matches: (v: string, lens: string) =>
      matchesBoardLens({ status: v } as unknown as BoardRow, lens as never),
  },
] as const;

/**
 * ⛔ THE DECLARED UNION LENSES, AND THEY ARE EXCLUDED FROM BOTH ARMS — which is not what the first
 * draft did, and the difference is the whole value of this gate.
 *
 * `/positions` offers `settled` as the UNION of `win | loss | void | cashed`, deliberately: today's
 * `?tab=settled` links must keep working, and "show me everything that finished" is a question a
 * player asks. So a settled value legitimately appears in two pills.
 *
 * 🔴 BUT THE FIRST DRAFT ONLY EXEMPTED IT FROM §2, AND ITS OWN RED CONTROL PROVED THAT WRONG. The
 * mutation `lens-stops-matching-its-own-value` breaks `cashed` so that NOTHING names a cashed-out
 * position — and the gate stayed GREEN, because `settled` still matched it and `settled` is not
 * `all`. ⛔ That is reachability in NAME only: the campaign's complaint is precisely that a player
 * *"cannot tell won from lost from voided-and-refunded"*, and a union pill does not answer it. A
 * value whose only control is a union is exactly as unreachable as one whose only control is `all`.
 *
 * ⭐ THE RED CONTROL FOUND A HOLE IN THE GATE BEFORE THE GATE WAS BELIEVED, which is the entire
 * argument for building the control first. §8 says the gate does not bend — here the gate was
 * WRONG, and the control is what said so.
 */
const UNION_LENSES: Record<string, readonly string[]> = { "/positions": ["settled"] };

for (const axis of AXES) {
  const values = enumValues(axis.enumName);
  const exempt = UNION_LENSES[axis.surface] ?? [];
  // ⛔ `all` AND every declared union are out of the reachability population. What is left is the
  //    set of controls that NAME a single state — the only kind that answers the complaint.
  const arms = axis.lenses.filter((l) => l !== "all" && !exempt.includes(l));

  // §3 first — a control that runs BEFORE the thing it controls for.
  ok(`3.${axis.enumName} the enum was really parsed out of schema.prisma`,
    values.length >= 2, `${values.length} values: ${values.join(", ")}`);
  ok(`3.${axis.enumName} the lens set is non-trivial (more than just \`all\`)`,
    arms.length >= 2, `${arms.length} arms: ${arms.join(", ")}`);

  for (const v of values) {
    const hit = arms.filter((l) => axis.matches(v, l));
    /**
     * ⛔ §1 — THE ASSERTION THE CAMPAIGN EXISTS FOR. `all` is excluded from `arms`, so a value
     * that only `all` can show counts as UNREACHABLE. That is the exact defect the complaint
     * describes: the row is on the page and no control selects it.
     */
    ok(`1.${axis.surface}.${v} is reachable by a lens that is not \`all\``,
      hit.length >= 1,
      hit.length === 0 ? `NO control on ${axis.surface} selects ${axis.enumName}.${v}` : "");

    // ⚠️ `arms` already excludes the declared unions, so this is disjointness among the lenses
    //    that NAME a single state — which is where two pills claiming one row would mislead.
    ok(`2.${axis.surface}.${v} is claimed by exactly one lens (unions declared)`,
      hit.length <= 1,
      hit.length > 1 ? `selected by ${hit.join(" AND ")}` : "");
  }
}

/**
 * ⛔ THE VACUITY FLOOR. Three axes × their values is the arithmetic this run assumes; a schema
 * rename that made every `enumValues` call return `[]` would leave §1 and §2 with nothing to
 * iterate and this file would print a cheerful row of passes over nothing.
 */
const totalValues = AXES.reduce((n, a) => n + enumValues(a.enumName).length, 0);
ok("4.1 the run covered a real population, not an empty one",
  totalValues >= 14, `${totalValues} enum values across ${AXES.length} axes`);

console.log(`\nlifecycle-reach: ${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.error(
    "\n✗ LIFECYCLE REACH FAILED.\n" +
    "  A stored state exists that NO control on its own page can select. Add the lens — do not\n" +
    "  add the value to an exemption. ⛔ If the value is genuinely unreachable BY DESIGN, the\n" +
    "  fix is a residual arm in the contract, not a hole in this gate: `following.ts`'s\n" +
    "  `progress` is the pattern (defined as `not open and not settled`, so a status added\n" +
    "  tomorrow lands in it on the day it is added).\n",
  );
  process.exit(1);
}
console.log("lifecycle-reach: OK — every stored lifecycle value a player can be in has a control that selects it");
