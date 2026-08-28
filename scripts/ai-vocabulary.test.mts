/**
 * THE AI CONSOLE CAN FILTER FOR EVERYTHING THE PIPELINE PRODUCES.
 *
 * 🔴 THE DEFECT (S-08, scan #1, 2026-08-28). Four hand-copied vocabularies, none derived, and
 * they had drifted:
 *   · `/admin/ai-polls` offered 7 of the 8 poll categories — `other` was missing, and `other`
 *     is the validator's documented FALLBACK. The category a poll is most likely to acquire by
 *     default was the one nobody could narrow to.
 *   · `/admin/candidates` offered 7 of `CandidateState`'s 8 arms — `VERIFYING` was missing,
 *     which is exactly the state a candidate sits in when verification hangs or fails.
 *
 * ⛔ ASSERT SET EQUALITY, NOT MEMBERSHIP. The scan said this in as many words, and it is the
 * whole design of this file: "every chip is a valid category" is TRUE of a rail missing two
 * categories. A subset check stays green over precisely this defect, for ever. Every rule below
 * compares two SETS and names the symmetric difference in both directions.
 *
 * ⭐ AND EXCLUSIONS ARE NAMED, NOT TOLERATED. `AIPollState.EDITING` is legitimately not offered
 * — the schema records that no path enters it — so it sits in `STATE_EXCLUSIONS` with its
 * reason. That is the difference between a documented omission and a silent one, and it is why
 * a second missing state cannot hide behind the first.
 *
 * ⚠️ THE STATES ARE RECONCILED AGAINST `prisma/schema.prisma` ITSELF, read as text. The database
 * is the source of truth for a state; a TypeScript list that can only be compared against
 * another TypeScript list is just a fourth copy waiting to drift.
 *
 * Run: npm run test:ai-vocabulary
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { decomment } from "./lib/decomment.mts";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

/**
 * ⛔ SOURCE IS READ THROUGH THE SHARED STRIPPER, never raw — and the second reason is the real
 * one. `test:decomment` ratchets how many files roll their own stripping, so a private regex
 * here raises a ceiling that may only fall. AND every rule below would match its own prose:
 * this file NAMES the category and state ids it forbids, so a raw read finds them in the very
 * comments that explain why they are forbidden. That is E-136 verbatim — merely NAMING a thing
 * in prose marked it present.
 */
const readSrc = (rel: string) => decomment(readFileSync(join(ROOT, rel), "utf8"));
/* ⚠️ The SCHEMA goes through it too. Prisma's enum blocks carry line comments — including the
   one recording that no path enters EDITING — and a private line-comment stripper here would
   have made this file a 56th carrier against a ceiling that may only fall.
   ⛔ AND THE PROSE MUST NOT QUOTE THE PATTERN EITHER. `test:decomment` finds carriers by reading
   RAW source for a stripper-shaped regex literal, so writing one inside this very comment to
   explain its absence put the file straight back in the population. Same shape as E-136, which
   this repo already paid for: merely NAMING a thing in prose marked it present. */
const schema = readSrc("prisma/schema.prisma");

const {
  AI_POLL_CATEGORIES, CANDIDATE_CATEGORIES, AI_POLL_STATES, CANDIDATE_STATES,
  STATE_EXCLUSIONS, CATEGORY_LABEL, STATE_LABEL,
} = await import("../src/lib/ai/poll-vocabulary.ts");

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

/** The members of a prisma `enum X { … }` block, in declaration order. */
function enumMembers(name: string): string[] {
  const m = schema.match(new RegExp(`enum ${name}\\s*\\{([^}]*)\\}`));
  if (!m) return [];
  return m[1].split("\n").map((l) => l.trim()).filter((l) => /^[A-Z_]+$/.test(l));
}

/** Symmetric difference, reported in BOTH directions — a missing arm and a phantom one are
 *  different defects and a single "sets differ" message hides which one happened. */
function equal(label: string, offered: readonly string[], canonical: readonly string[], excluded: readonly string[] = []) {
  const want = canonical.filter((c) => !excluded.includes(c));
  const missing = want.filter((c) => !offered.includes(c));
  const phantom = offered.filter((c) => !canonical.includes(c));
  ok(`${label} offers every canonical member`, missing.length === 0,
    missing.length ? `MISSING: ${missing.join(", ")} — a filter that cannot reach real rows` : "");
  ok(`${label} offers NOTHING the pipeline cannot produce`, phantom.length === 0,
    phantom.length ? `PHANTOM: ${phantom.join(", ")} — a filter that always returns zero rows` : "");
}

console.log("AI console vocabularies\n");

// ── 1 · THE SCHEMA ENUMS ARE READABLE — the positive control ─────────────────
{
  const poll = enumMembers("AIPollState");
  const cand = enumMembers("CandidateState");
  // ⛔ If the enums cannot be read, every comparison below is against an empty set and passes
  // vacuously. That is the shape this repo has paid for on every scanner that went blind.
  ok("1: AIPollState was read from the schema", poll.length >= 8, `${poll.length} members`);
  ok("1: CandidateState was read from the schema", cand.length >= 8, `${cand.length} members`);
}

// ── 2 · STATES — set equality against the schema, minus NAMED exclusions ─────
{
  const pollEnum = enumMembers("AIPollState");
  const candEnum = enumMembers("CandidateState");
  const excluded = Object.keys(STATE_EXCLUSIONS);

  equal("2: /admin/ai-polls states", AI_POLL_STATES, pollEnum, excluded);
  equal("2: /admin/candidates states", CANDIDATE_STATES, candEnum, excluded);

  /* ⭐ EVERY EXCLUSION MUST BE REAL, AND MUST STILL BE JUSTIFIED. An exclusion list is a hole in
     a set-equality check, so it is itself checked: the name must exist in one of the enums (or
     it is stale and hiding nothing), and it must carry a reason (or it is an unexplained gap
     that the next reader will copy). */
  for (const [name, reason] of Object.entries(STATE_EXCLUSIONS)) {
    ok(`2: the excluded state ${name} still exists in the schema`,
      pollEnum.includes(name) || candEnum.includes(name),
      "a stale exclusion hides nothing and licenses the next one");
    ok(`2: …and its exclusion carries a reason`, typeof reason === "string" && reason.length > 20, reason);
  }
  ok("2: ⛔ VERIFYING is offered — the state a candidate sits in when verification hangs",
    CANDIDATE_STATES.includes("VERIFYING"));
  ok("2: ⛔ EDITING is the ONLY excluded state", excluded.length === 1, excluded.join(", "));
}

// ── 3 · CATEGORIES — two vocabularies, and they are NOT the same one ─────────
{
  /* ⛔ THE SCAN GOT THIS ONE WRONG, AND THE CORRECTION IS THE ASSERTION. It read /admin/candidates'
     six categories as "missing tech and other" and proposed deriving both rails from the poll
     set. But a MarketCandidate can only ever hold the six: adding the other two would offer two
     filters that always return zero rows — a narrowing control that cannot narrow, which is
     worse than a missing one. So the two lists are asserted to be DIFFERENT, deliberately. */
  ok("3: the candidate categories are a STRICT subset of the poll categories",
    CANDIDATE_CATEGORIES.every((c) => (AI_POLL_CATEGORIES as readonly string[]).includes(c)) &&
      CANDIDATE_CATEGORIES.length < AI_POLL_CATEGORIES.length);
  ok("3: ⛔ …and NOT equal to them — a candidate cannot hold `tech` or `other`",
    AI_POLL_CATEGORIES.some((c) => !(CANDIDATE_CATEGORIES as readonly string[]).includes(c)),
    "if these ever become equal, one rail has gained a filter that returns nothing");
  ok("3: `other` is offered on the poll rail — it is the validator's documented fallback",
    (AI_POLL_CATEGORIES as readonly string[]).includes("other"));

  // The canonical type in market-candidate.ts must still agree with the runtime list.
  const mc = readSrc("src/lib/server/market-candidate.ts");
  const declared = (mc.match(/export type CandidateCategory\s*=([^;]*);/)?.[1] ?? "")
    .split("|").map((s) => s.trim().replace(/^"|"$/g, "")).filter(Boolean);
  ok("3: CandidateCategory was located in market-candidate.ts", declared.length > 0, `${declared.length} arms`);
  equal("3: CANDIDATE_CATEGORIES vs the CandidateCategory type", CANDIDATE_CATEGORIES, declared);
}

// ── 4 · EVERY MEMBER HAS A LABEL — no rail may render a raw enum at an officer ─
{
  const unlabelledCat = [...AI_POLL_CATEGORIES, ...CANDIDATE_CATEGORIES].filter((c) => !CATEGORY_LABEL[c]);
  ok("4: every category has an admin label", unlabelledCat.length === 0, unlabelledCat.join(", "));
  const unlabelledState = [...AI_POLL_STATES, ...CANDIDATE_STATES].filter((s) => !STATE_LABEL[s]);
  ok("4: every offered state has an admin label", unlabelledState.length === 0, unlabelledState.join(", "));
}

// ── 5 · THE RAILS DERIVE, they do not re-type ────────────────────────────────
/**
 * ⛔ WITHOUT THIS, §2-§4 GUARD A LIST NOBODY RENDERS. Everything above proves the canonical
 * module is correct; none of it proves the rails use it. Re-typing a literal beside the import
 * would satisfy every check above while shipping the original defect.
 */
{
  for (const [rail, needed] of [
    ["src/app/admin/ai-polls/poll-filters.tsx", ["AI_POLL_CATEGORIES", "AI_POLL_STATES"]],
    ["src/app/admin/candidates/candidate-filters.tsx", ["CANDIDATE_CATEGORIES", "CANDIDATE_STATES"]],
  ] as const) {
    const src = readSrc(rail);
    ok(`5: ${rail} imports the canonical vocabulary`, /from "@\/lib\/ai\/poll-vocabulary"/.test(src));
    for (const n of needed) ok(`5: …and derives its list from ${n}`, new RegExp(`\\.\\.\\.${n}\\.map`).test(src));
    // A re-typed literal beside the import is the regression this catches.
    ok(`5: ⛔ …and re-types no category id of its own`,
      !/\{\s*id:\s*"(sports|macro|weather|crypto|culture|infrastructure|tech|other)"/.test(src),
      "a literal category id back in the rail is the defect returning");
    ok(`5: ⛔ …and re-types no state id of its own`,
      !/\{\s*id:\s*"(PENDING_REVIEW|APPROVED|PUBLISHED|REJECTED|EXTRACTED|SCORED|VERIFYING|GENERATING|FILTERED|FILTERED_OUT|VALIDATION_FAILED)"/.test(src),
      "a literal state id back in the rail is the defect returning");
  }

  // And the two SERVER copies that started this — the validator and the model's tool schema.
  for (const f of ["src/lib/server/ai-poll-generation.ts", "src/lib/server/ai-provider-claude.ts"]) {
    const src = readSrc(f);
    ok(`5: ${f} builds VALID_CATEGORIES from the canonical list`,
      /VALID_CATEGORIES[^=]*=\s*(new Set<string>\()?AI_POLL_CATEGORIES/.test(src));
    ok(`5: ⛔ …and no longer types the eight ids out`,
      !/"sports",\s*"macro",\s*"weather"/.test(src),
      "the hand-copied list is back");
  }
}

console.log(`\nai-vocabulary: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
