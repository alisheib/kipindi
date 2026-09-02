/**
 * BULK RESOLVE — the auto-resolve verdict, the selection semantics, and the action's
 * structural guarantees.
 *
 *   npx tsx scripts/bulk-resolve.test.mts        (npm run test:bulk-resolve)
 *
 * ─────────────────────────────────────────────────────────────────────────────────────
 * WHAT IS BEING GUARDED, AND WHY IT IS WORTH A SUITE.
 *
 * 🔴 Ali, 2026-08-28: *"the AI auto-resolver is not working — auto-resolve is on and
 * confidence is 90%+."* Measured on production the same day: 17 markets CLOSED, 12 at
 * confidence ≥ 90, and the AI cited the market's own approved source on NONE of them. The
 * resolver was refusing, correctly, because `decideAutoResolve` ANDs `sourceMatches` into
 * `confident` — and the queue never said so. The fix is a VERDICT: one function that
 * re-derives the engine's decision and names the reason, rendered on every row and
 * enforced by the bulk action.
 *
 * ⭐ THE CENTRAL RISK IS DRIFT, NOT LOGIC. The verdict must agree with `decideAutoResolve`
 * on every input, for ever. §2 drives the full 2^6 matrix of the floor's conjuncts through
 * BOTH and asserts they never disagree — the one assertion that makes a second reading of
 * a money rule safe to have at all.
 *
 * ⛔ AND EVERY CHECK HERE IS ASKED THE STRICT QUESTION: *would this still pass if the
 * feature were absent?* §1.9 (a known-good row must be ELIGIBLE) and §0.1 (the population
 * is non-empty) exist precisely because a verdict that refuses everything, or a suite that
 * examines nothing, keeps every safety rule perfectly and proves nothing at all.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { decomment } from "./lib/decomment.mts";
import {
  bulkVerdictFor, storedAssessment, hostOf,
  REASON_ORDER, ROW_STATE, OVERRIDABLE, RESOLVE_CLAIM_TTL_MS,
  type BulkBlockReason, type VerdictMarket,
} from "../src/lib/server/bulk-resolve-eligibility.ts";
import { decideAutoResolve } from "../src/lib/server/market-service.ts";
import { sourceMatchesAny, type TrustedSource } from "../src/lib/server/source-registry.ts";
import { BULK_REASON, composeOverrideJustification } from "../src/app/admin/resolver-queue/bulk-verdict-copy.ts";
import { compareBy, parseSort, SORT_OPTIONS } from "../src/app/admin/resolver-queue/queue-order.ts";

const ROOT = process.cwd();
let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra = "") => {
  if (cond) pass++; else fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${extra ? ` — ${extra}` : ""}`);
};
/**
 * ⛔ SOURCE CHECKS RUN ON CODE, NOT ON PROSE — and this is the fix for a defect this very
 * suite committed on its first run.
 *
 * §4.7 ("the host rule has exactly ONE definition site") went RED at 3 occurrences. Two of
 * them were the DOC COMMENTS explaining why there must only be one. §11.17 ("never `h-8`")
 * went red on the comment warning against `h-8`. A guard that reads its own explanation and
 * calls it a violation is not measuring the code.
 *
 * ⛔ AND THE STRIPPER IS THE SHARED ONE. The first fix hand-rolled a private one — which is
 * how this repo acquired the private-stripper population that `test:decomment` now holds
 * behind a SHRINK-ONLY ratchet, and which this suite pushed from 55 to 56, turning
 * `test:all` red. A private stripper is also simply worse: it has to choose between eating
 * a `//` inside a URL and missing a trailing comment, and `scripts/lib/decomment.mts` has
 * already made that choice correctly.
 */
const read = (rel: string) => decomment(readFileSync(join(ROOT, rel), "utf8"));

/**
 * ⛔ "x COMES BEFORE y" — AND BOTH MUST ACTUALLY BE THERE.
 *
 * Written as `a.indexOf(x) < a.indexOf(y)`, a positional check goes GREEN the moment x is
 * DELETED: `indexOf` returns -1 and -1 is less than every real index. The RED harness
 * proved it on this very suite — removing the payload bound outright left the check that
 * guards it passing. So presence is asserted before order.
 */
const before = (hay: string, x: string, y: string) => {
  const i = hay.indexOf(x), j = hay.indexOf(y);
  return i >= 0 && j >= 0 && i < j;
};

const THRESHOLD = 90;

/** A market that clears every clause. Everything else in this file is this, minus one thing. */
function clean(over: Partial<VerdictMarket> = {}): VerdictMarket {
  return {
    id: "mkt_clean",
    status: "CLOSED",
    sourceUrl: "https://www.premierleague.com/match/1",
    resolutionStage1By: null,
    resolveClaimedAt: null,
    sentinelOutcome: "YES",
    sentinelConfidence: 97,
    sentinelEvidence: "The Premier League match centre records the final score as 2-1 to the home side.",
    sentinelSourceUrl: "https://www.premierleague.com/match/1",
    sentinelDetermined: true,
    resolvedOutcome: null,
    ...over,
  };
}
const V = (m: VerdictMarket, over: Partial<Parameters<typeof bulkVerdictFor>[0]> = {}) =>
  bulkVerdictFor({
    market: m, mode: "auto", threshold: THRESHOLD, sourceMatches: true,
    requireTwoOfficer: false, officerId: "usr_me", now: Date.parse("2026-08-28T12:00:00Z"),
    ...over,
  });

// ── 0 · SCANNER LIVENESS ─────────────────────────────────────────────────────
// ⭐ A suite that examines nothing prints "0 failures" in exactly the same words as a
// clean tree. Before anything else, prove there is a population and that it is real.
{
  ok("0.1 the suite has a non-empty reason population", REASON_ORDER.length >= 10, `${REASON_ORDER.length} reasons`);
  ok("0.2 the eligibility module exists", existsSync(join(ROOT, "src/lib/server/bulk-resolve-eligibility.ts")));
  ok("0.3 the action exists", existsSync(join(ROOT, "src/app/admin/resolver-queue/bulk-resolve-action.ts")));
}

// ── 1 · ONE DEFINITION SITE, AND THE RIGHT BOOLEAN ───────────────────────────
{
  const src = read("src/lib/server/bulk-resolve-eligibility.ts");
  // Anchored on the CALL, not on the identifier appearing somewhere nearby: a doc comment
  // naming `decideAutoResolve` would satisfy a bare `includes()` while an inline copy of
  // the floor sat underneath it.
  ok("1.1 the verdict CALLS decideAutoResolve (one definition site)",
     /decideAutoResolve\(\s*\{/.test(src));
  ok("1.2 the verdict reads `confident`, never `goAuto`",
     /floor\.confident/.test(src) && !/floor\.goAuto/.test(src));

  // ⭐ 1.3 IS THE ONE THAT WOULD HAVE CAUGHT A FEATURE DEAD ON ARRIVAL. `goAuto` is
  // `mode === "auto" && confident`. Key the bar on it and every row goes blocked the
  // moment an operator sets resolution back to `human` — while every fixture that happens
  // to set `mode: "auto"` certifies it green.
  ok("1.3 a HUMAN-mode row with a confident read is ELIGIBLE",
     V(clean(), { mode: "human" }).eligible === true);
  ok("1.4 …and it is still marked as not-auto for the COPY",
     V(clean(), { mode: "human" }).modeIsAuto === false);

  // ⭐ 1.9 THE POSITIVE CONTROL. A verdict that blocks everything keeps every safety rule
  // in this file perfectly. If this ever fails, the guard cannot tell a resolve rule from
  // a resolve ban.
  const good = V(clean());
  ok("1.9 the known-good fixture is ELIGIBLE", good.eligible === true, good.reason ?? "");
  ok("1.9b …with the AI's outcome", good.outcome === "YES");
  ok("1.9c …and no reason at all", good.reason === null && good.all.length === 0);
}

// ── 2 · ⭐ THE AGREEMENT MATRIX — the two readings can never diverge ──────────
// The floor is six conjuncts. Drive every one of the 64 combinations through the engine
// and through the verdict and assert they agree, and that `internal-disagreement` — the
// fail-closed escape hatch — never fires on a legitimate input.
{
  let checked = 0, disagreed = 0, escaped = 0, nullDetWithAssessment = 0;
  /**
   * ⭐ THREE VALUES FOR `determined`, NOT TWO — AND THE THIRD IS THE ENTIRE PRODUCTION
   * POPULATION.
   *
   * The first draft wrote `sentinelDetermined: anyAssessment ? determined : null`, which
   * ties NULL to "no assessment at all" — so the matrix drove 64 combinations and NOT ONE
   * of them was the shape every real row holds: a full 97% reading with the flag simply
   * never recorded. The column ships with no default and no backfill, so on deploy day that
   * is all 17 markets in the live queue. A 2^6 matrix blind to the only input that exists
   * is a very thorough way of testing nothing.
   */
  const DET: (boolean | null)[] = [true, false, null];
  for (let bits = 0; bits < 96; bits++) {
    const hasOutcome = !!(bits & 1);
    const overThreshold = !!(bits & 4);
    const hasEvidence = !!(bits & 8);
    const sourceMatches = !!(bits & 16);
    const anyAssessment = !!(bits & 32);
    const determined = DET[bits % 3];
    if (anyAssessment && determined === null) nullDetWithAssessment++;

    const m = clean({
      sentinelOutcome: anyAssessment ? (hasOutcome ? "YES" : null) : null,
      sentinelConfidence: anyAssessment ? (overThreshold ? 95 : 40) : null,
      sentinelEvidence: anyAssessment ? (hasEvidence ? "A real quoted excerpt from the source." : "") : null,
      sentinelDetermined: anyAssessment ? determined : null,
      sentinelSourceUrl: anyAssessment ? "https://www.espn.com/x" : null,
    });
    const a = storedAssessment(m);
    const engine = decideAutoResolve({ assessment: a, mode: "auto", threshold: THRESHOLD, sourceMatches });
    const v = V(m, { sourceMatches });
    // Row state is clean in every fixture above, so eligibility IS the floor here.
    if (v.eligible !== engine.confident) disagreed++;
    if (v.all.includes("internal-disagreement")) escaped++;
    checked++;
  }
  ok("2.1 the full floor matrix was driven", checked === 96, `${checked} combinations`);
  ok("2.2 the verdict NEVER disagrees with decideAutoResolve", disagreed === 0, `${disagreed} disagreements`);
  ok("2.3 the fail-closed escape hatch never fired on a legitimate input", escaped === 0, `${escaped} escapes`);
  // ⛔ NOT VACUOUS. If the matrix never drives the production shape, 2.2 is a statement
  // about inputs no market on this platform has.
  ok("2.4 the matrix drives a PRESENT assessment with determined NULL (every production row)",
     nullDetWithAssessment > 0, `${nullDetWithAssessment} such combinations`);
}

// ── 3 · DISCRIMINATION — proven FALSE and TRUE in the same run ───────────────
// ⛔ A negative assertion is satisfied by an ABSENCE. "The blocked row is not eligible"
// is also true of a function that returns nothing at all, so the positive case is
// asserted beside it, on the same code path, from the same fixture.
{
  const blocked = V(clean({ sentinelSourceUrl: "https://www.espn.com/x" }), { sourceMatches: false });
  const allowed = V(clean());
  ok("3.1 a citation from the WRONG host blocks the row", blocked.eligible === false);
  ok("3.2 …naming the citation as the reason", blocked.reason === "source-different-domain", String(blocked.reason));
  ok("3.3 …and the SAME fixture with a matching citation is ELIGIBLE", allowed.eligible === true);
  ok("3.4 …so the guard DISCRIMINATES rather than refusing everything",
     blocked.eligible === false && allowed.eligible === true);
  ok("3.5 the blocked row carries the hosts for the operator",
     blocked.citedHost === "www.espn.com" && blocked.approvedHost === "www.premierleague.com",
     `${blocked.citedHost} / ${blocked.approvedHost}`);
}

// ── 4 · THE HOST RULE HAS ONE DEFINITION SITE, AND IT KEEPS ITS LEADING DOT ──
{
  const sources: TrustedSource[] = [{
    id: "s1", domain: "kitco.com", label: "Kitco", category: "crypto",
    rationale: "", enabled: true, addedBy: "test", addedAt: "2026-01-01T00:00:00Z",
  }];
  ok("4.1 the exact host matches", sourceMatchesAny(sources, "https://kitco.com/gold", "crypto") === true);
  ok("4.2 a subdomain matches", sourceMatchesAny(sources, "https://www.kitco.com/gold", "crypto") === true);
  // ⭐ THE DOT. Without it `endsWith("kitco.com")` accepts a domain anyone can buy, and a
  // citation gate is defeated for the price of a registration.
  ok("4.3 a look-alike domain does NOT match", sourceMatchesAny(sources, "https://evilkitco.com/x", "crypto") === false);
  ok("4.4 the wrong category does not match", sourceMatchesAny(sources, "https://kitco.com/x", "sports") === false);
  ok("4.5 a disabled source does not match",
     sourceMatchesAny(sources.map((s) => ({ ...s, enabled: false })), "https://kitco.com/x", "crypto") === false);
  ok("4.6 a malformed URL does not throw and does not match",
     sourceMatchesAny(sources, "not a url", "crypto") === false);

  const reg = read("src/lib/server/source-registry.ts");
  const rules = [...reg.matchAll(/host\.endsWith\(/g)].length;
  ok("4.7 the host rule has exactly ONE definition site", rules === 1, `${rules} occurrences of host.endsWith(`);
  ok("4.8 isSourceTrusted consumes it rather than restating it", /sourceMatchesAny\(await listSources/.test(reg));

  const page = read("src/app/admin/resolver-queue/page.tsx");
  const action = read("src/app/admin/resolver-queue/bulk-resolve-action.ts");
  for (const [name, src] of [["page", page], ["action", action]] as const) {
    ok(`4.9 the ${name} consumes sourceMatchesAny, never its own host rule`,
       src.includes("sourceMatchesAny(") && !/\.endsWith\(`\.\$\{/.test(src) && !src.includes("host.endsWith("));
    // ⛔ BOTH ARMS, or the badge contradicts the gate on a market with no approved source.
    ok(`4.10 the ${name} reproduces BOTH arms of the engine's sourceMatches`,
       /sv === "match"/.test(src) && /sv === "no-approved-source"/.test(src));
  }
}

// ── 5 · `determined` — the conjunct that was never written down ──────────────
{
  const yes = V(clean({ sentinelDetermined: true }));
  const no = V(clean({ sentinelDetermined: false }));
  const unknown = V(clean({ sentinelDetermined: null }));
  ok("5.1 determined=true clears the clause", yes.eligible === true);
  ok("5.2 determined=false BLOCKS", no.eligible === false && no.all.includes("not-determined"));
  // ⭐ NULL IS NOT FALSE, AND THE DISTINCTION IS A NO-FABRICATION RULE. Every row assessed
  // before the column existed reads NULL. Calling that "the AI says it is not locked" is a
  // statement the database cannot support.
  ok("5.3 determined=NULL blocks", unknown.eligible === false);
  ok("5.4 …and is named as NOT RECORDED, never as an AI refusal",
     unknown.all.includes("determined-not-recorded") && !unknown.all.includes("not-determined"),
     unknown.all.join(","));
  ok("5.5 storedAssessment never invents determined=true from a NULL column",
     storedAssessment(clean({ sentinelDetermined: null }))?.determined === false);
  const dal = read("src/lib/server/market-dal.ts");
  ok("5.6 the DAL reads the column as null, never coerced to false",
     dal.includes("sentinelDetermined: r.sentinelDetermined ?? null"));
  const svc = read("src/lib/server/market-service.ts");
  ok("5.7 the engine now PERSISTS determined alongside the other five",
     /sentinelDetermined: a\.determined/.test(svc));
}

// ── 6 · REASON MODEL INVARIANTS ─────────────────────────────────────────────
{
  // `BULK_REASON` is typed `Record<BulkBlockReason, …>`, so TypeScript already guarantees
  // it covers the union exactly. Comparing REASON_ORDER against its keys therefore proves
  // REASON_ORDER covers the union — a thing no runtime check could otherwise see.
  const unionKeys = Object.keys(BULK_REASON) as BulkBlockReason[];
  const missing = unionKeys.filter((r) => !REASON_ORDER.includes(r));
  const extra = REASON_ORDER.filter((r) => !unionKeys.includes(r));
  ok("6.1 REASON_ORDER lists every reason", missing.length === 0, missing.join(","));
  ok("6.2 REASON_ORDER lists nothing else", extra.length === 0, extra.join(","));
  ok("6.3 REASON_ORDER has no duplicates", new Set(REASON_ORDER).size === REASON_ORDER.length);

  const floor = REASON_ORDER.filter((r) => !ROW_STATE.has(r));
  // ⛔ ROW_STATE and OVERRIDABLE must PARTITION the union. A floor reason leaking into
  // ROW_STATE would be silently excluded from §2's agreement check, and the two readings
  // could then diverge with nothing noticing.
  ok("6.4 ROW_STATE and the floor partition every reason",
     floor.length + ROW_STATE.size === REASON_ORDER.length);
  const overlap = [...OVERRIDABLE].filter((r) => ROW_STATE.has(r));
  ok("6.5 nothing is both row-state and overridable", overlap.length === 0, overlap.join(","));
  ok("6.6 every floor reason EXCEPT the fail-closed hatch is overridable",
     floor.every((r) => OVERRIDABLE.has(r)), floor.filter((r) => !OVERRIDABLE.has(r)).join(","));
  ok("6.7 the fail-closed hatch is never overridable", !OVERRIDABLE.has("internal-disagreement"));

  // Every reason an officer can see must have WORDS — never a raw enum on a money screen.
  // ⛔ ASKED ABOUT MEANING, NOT SYNTAX. The first draft rejected any label containing a
  // hyphen, which condemned "…re-check to refresh it" — a perfectly good sentence — while
  // saying nothing about a label that WAS the enum. What matters is that the label is not
  // the key, does not embed the key, and reads as prose.
  const wordless = unionKeys.filter((r) => {
    const l = BULK_REASON[r]?.label ?? "";
    return !l || l === r || l.includes(r) || l.includes("_") || !l.includes(" ");
  });
  ok("6.8 every reason has a human sentence, none leaks the enum", wordless.length === 0, wordless.join(","));
  const copy = read("src/app/admin/resolver-queue/bulk-verdict-copy.ts");
  ok("6.9 the words come from the lexicon, not a private table",
     copy.includes('from "@/lib/admin-status-lexicon"') && !/label:\s*"/.test(copy));
}

// ── 7 · ROW STATE ───────────────────────────────────────────────────────────
{
  ok("7.1 a RESOLVED market is blocked and NOT overridable", (() => {
    const v = V(clean({ status: "RESOLVED" }));
    return v.eligible === false && v.reason === "already-resolved" && v.overridable === false;
  })());
  ok("7.2 a VOIDED market is blocked", V(clean({ status: "VOIDED" })).reason === "already-resolved");
  ok("7.3 a LIVE market is blocked and NOT overridable in bulk", (() => {
    const v = V(clean({ status: "LIVE" }));
    return v.eligible === false && v.reason === "still-live" && v.overridable === false;
  })());
  ok("7.4 a market claimed INSIDE the TTL is blocked", (() => {
    const v = V(clean({ resolveClaimedAt: "2026-08-28T11:55:00Z" }));
    return v.eligible === false && v.all.includes("claimed-elsewhere");
  })());
  ok("7.5 a STALE claim (past the TTL) does not block", (() => {
    const v = V(clean({ resolveClaimedAt: "2026-08-28T11:00:00Z" }));
    return v.eligible === true;
  })());
  // ⛔ A TTL the queue and the engine disagree about is a row that refuses for ever with
  // no explanation — this module's own failure mode, one level down.
  const svc = read("src/lib/server/market-service.ts");
  const engineTtl = /const RESOLVE_CLAIM_TTL_MS = (\d+) \* 60_000/.exec(svc);
  ok("7.6 the queue's claim TTL equals the engine's",
     !!engineTtl && Number(engineTtl[1]) * 60_000 === RESOLVE_CLAIM_TTL_MS,
     `engine ${engineTtl?.[1]}m vs queue ${RESOLVE_CLAIM_TTL_MS / 60_000}m`);
  /**
   * ⛔ AND THE ENGINE MUST RELEASE IT WHEN THE MARKET TRANSITIONS — a live defect until
   * this change, invisible until something started READING the stamp on a CLOSED market.
   * The claim exists to stop two instances paying for the same AI call; once the market has
   * moved it has done its job. Left standing, it made every scheduled close look like "an AI
   * check is running on this market right now" for ten minutes, non-overridable — and it
   * made "Re-check this market now" buy an answer and throw it away with "another check is
   * already running".
   */
  const closeStamp = /status: "CLOSED",\s*\n\s*resolutionNotifiedAt: nowIso,\s*\n\s*resolveClaimedAt: null,/.test(svc);
  ok("7.6b the engine RELEASES the claim when a market transitions", closeStamp);

  // Two-admin: my own stage-1 is not mine to confirm; another officer's is.
  const mine = V(clean({ resolutionStage1By: "usr_me", resolvedOutcome: "YES" }), { requireTwoOfficer: true });
  const theirs = V(clean({ resolutionStage1By: "usr_other", resolvedOutcome: "YES" }), { requireTwoOfficer: true });
  /**
   * ⭐ A COUNTERSIGNATURE IS NEVER A BULK ACT — FOR EITHER OFFICER.
   *
   * An earlier draft let the OTHER officer bulk-confirm a staged row, and attacking it
   * found three defects at once: a staged **VOID** (which the AI's YES/NO vocabulary
   * cannot express) was silently dropped and the AI's YES offered in its place; the
   * eligibility was gated on the AI's read quality, which is not what a countersignature
   * is about; and its override row was indistinguishable in the audit chain from a real
   * floor override. Bulk-countersigning is also the exact rubber stamp POCA §16 exists to
   * prevent. So both are refused and both are pointed at the ceremony.
   */
  ok("7.7 two-admin · my own stage-1 is refused", mine.eligible === false && mine.reason === "awaiting-countersignature");
  ok("7.8 …and is NOT overridable by a typed reason", mine.overridable === false);
  ok("7.9 two-admin · ANOTHER officer's stage-1 is refused too", theirs.eligible === false && theirs.reason === "awaiting-countersignature");
  ok("7.10 …and is not overridable either", theirs.overridable === false);
  // ⛔ A staged VOID must not be reachable at all from here. Before the refusal, this
  // fixture produced `outcome: "YES"` — the AI's read, over an officer's decision to void.
  const drift = V(clean({ resolutionStage1By: "usr_other", resolvedOutcome: "VOID", sentinelOutcome: "YES" }), { requireTwoOfficer: true });
  ok("7.11 a staged VOID cannot be bulk-confirmed", drift.eligible === false && drift.reason === "awaiting-countersignature");
  ok("7.12 single-admin mode reports stage `seal`", V(clean()).stage === "seal");
  ok("7.13 two-admin, unstaged, reports stage `stage1`", V(clean(), { requireTwoOfficer: true }).stage === "stage1");
  ok("7.14 …and is still eligible to STAGE", V(clean(), { requireTwoOfficer: true }).eligible === true);
}

// ── 8 · PRECEDENCE, AND NOTHING HIDDEN BEHIND THE HEADLINE ──────────────────
{
  // A row that fails BOTH the citation and the confidence floor. This is a real shape on
  // production today (conf 88, cited vavel.com, approved skysports.com).
  const both = V(clean({ sentinelConfidence: 88, sentinelSourceUrl: "https://www.vavel.com/x" }), { sourceMatches: false });
  ok("8.1 a doubly-blocked row leads with the CITATION", both.reason === "source-different-domain", String(both.reason));
  ok("8.2 …and still reports the confidence floor in `all`", both.all.includes("below-threshold"), both.all.join(","));
  ok("8.3 `all` is ordered by REASON_ORDER", (() => {
    const idx = both.all.map((r) => REASON_ORDER.indexOf(r));
    return idx.every((n, i) => i === 0 || n > idx[i - 1]);
  })(), both.all.join(","));
  // The accuweather row on production: the citation MATCHES, confidence is 82.
  const thresholdOnly = V(clean({ sentinelConfidence: 82 }));
  ok("8.4 a matching citation under the floor reports the FLOOR, not the source",
     thresholdOnly.reason === "below-threshold", String(thresholdOnly.reason));
  ok("8.5 a row with no assessment at all says so",
     V(clean({ sentinelOutcome: null, sentinelConfidence: null, sentinelEvidence: null, sentinelSourceUrl: null, sentinelDetermined: null })).reason === "no-assessment");
  ok("8.6 a row with no cited URL says so, and does not blame the domain", (() => {
    const v = V(clean({ sentinelSourceUrl: null }), { sourceMatches: false });
    return v.all.includes("source-none-cited") && !v.all.includes("source-different-domain");
  })());
  ok("8.7 thin evidence blocks", V(clean({ sentinelEvidence: "yes" })).all.includes("thin-evidence"));
  ok("8.8 no YES/NO outcome yields a null outcome, never a guess",
     V(clean({ sentinelOutcome: null })).outcome === null);
}

// ── 9 · hostOf ──────────────────────────────────────────────────────────────
{
  ok("9.1 hostOf lowercases", hostOf("https://WWW.ESPN.com/x") === "www.espn.com");
  ok("9.2 hostOf never throws on rubbish", hostOf("not a url") === null);
  ok("9.3 hostOf handles null", hostOf(null) === null);
}

// ── 10 · THE ACTION'S STRUCTURAL GUARANTEES ─────────────────────────────────
// Source-level by necessity (it is a "use server" module that opens DB transactions), but
// each one is a defect that has actually happened in this repo or is one keystroke away.
{
  const a = read("src/app/admin/resolver-queue/bulk-resolve-action.ts");

  ok("10.1 it seals through resolveMarket — the SAME engine as the per-card button",
     /await resolveMarket\(\{/.test(a));
  ok("10.2 it does not re-implement the ceremony", !/marketStore\.stamp\(/.test(a) && !/status: "RESOLVED"/.test(a));
  // ⛔ 20 concurrent withLock transactions is the P2024 pool-exhaustion shape.
  ok("10.3 markets are sealed SEQUENTIALLY", /for \(const id of unique\)/.test(a) && !/Promise\.all\(unique/.test(a));
  // ⛔ resolveMarket does NOT re-validate the outcome; an invalid string marks a market
  // RESOLVED with no winners and locks every stake in it permanently.
  ok("10.4 the outcome is validated before it reaches the engine",
     /outcome !== "YES" && outcome !== "NO"/.test(a));
  ok("10.5 the verdict is RE-DERIVED server-side, never taken from the client",
     /bulkVerdictFor\(\{/.test(a) && !/formData\.get\("eligible"/.test(a));
  ok("10.6 an override reason has a minimum length", /MIN_REASON/.test(a) && /reason\.length < MIN_REASON/.test(a));
  ok("10.7 the override half is gated on its OWN control key",
     /CONTROL_DOMAIN\.bulkResolveOverride/.test(a) && /CONTROL_DOMAIN\.bulkResolveMarkets/.test(a));
  ok("10.8 an override is refused unless the verdict says the row is overridable",
     /v\.overridable/.test(a) && /OVERRIDABLE\.has/.test(a));
  // ⛔ The override reason is ops narration. resolutionEvidence is rendered to PLAYERS on
  // the settlement-proof panel; player surfaces never narrate ops.
  // ⛔ NEITHER the override reason NOR the sentinel's excerpt may be written as the
  // officer's evidence. `resolutionEvidence` renders to PLAYERS under "Officer's recorded
  // evidence", attributed to the person this action names — and this officer typed neither
  // of them. The excerpt survives on the market row and in the audit payload.
  ok("10.9 NOTHING is written as the officer's player-facing evidence",
     /await resolveMarket\(\{ marketId: id, outcome, officerId: g\.userId \}\)/.test(a)
     && !/evidence: (override|typed|m\.sentinelEvidence)/.test(a));
  ok("10.10 a tampered payload naming an unselected market is refused",
     /is not selected/.test(a));
  ok("10.11 the batch is capped at the page size", /unique\.length > PER_PAGE/.test(a));
  ok("10.12 another product line cannot reach resolveMarket", /productLine !== "MARKET"/.test(a));
  // ⛔ Partial success is the normal case. Five buckets, counted apart.
  for (const bucket of ["resolved", "staged", "skipped", "alreadyApplied", "failed"]) {
    ok(`10.13 the result reports \`${bucket}\` separately`, new RegExp(`${bucket}: BulkResolveOutcome\\[\\]`).test(a) || new RegExp(`const ${bucket}: BulkResolveOutcome\\[\\]`).test(a));
  }
  ok("10.14 a double-submit is reported as already-applied, not as a failure",
     /already resolved/i.test(a) && /alreadyApplied\.push/.test(a));
  ok("10.15 each overridden market keeps its OWN compliance row",
     /action: "market\.resolve\.bulk_override"/.test(a));
  ok("10.16 …and the batch has a RUN BOUNDARY of its own",
     /action: "market\.resolve\.bulk"/.test(a) && /batchId/.test(a));
  /**
   * ⛔ COUNTED, NOT MERELY PRESENT — AND THE FIRST DRAFT WAS VACUOUS.
   *
   * `/catch \(err\)/ && /failed\.push/` is satisfied by the OUTER function-level catch plus
   * any one of the surviving pushes, so deleting the INNER per-market guard this check is
   * named for left it green. Without that guard, `resolveMarket` propagating a single
   * `$transaction` rejection unwinds the whole loop: the markets after it are never
   * attempted, the ones already SEALED are reported as nothing at all, and the run-boundary
   * audit row is never written. §4.7 already set the idiom — count the occurrences.
   */
  {
    const catches = [...a.matchAll(/catch \(err\)/g)].length;
    ok("10.17 one market that throws does not abandon the rest (inner AND outer catch)",
       catches === 2, `${catches} catch (err) blocks`);
    // POSITIONAL, not distance-bounded: the first `catch (err)` must fall AFTER the
    // resolveMarket call and BEFORE the post-loop run-boundary audit — i.e. inside the
    // loop. A character budget would only measure how much comment sits between them.
    const iResolve = a.indexOf("await resolveMarket(");
    const iCatch = a.indexOf("} catch (err) {");
    const iBatchAudit = a.indexOf('action: "market.resolve.bulk"');
    ok("10.17b the inner catch wraps resolveMarket, inside the loop",
       iResolve > 0 && iCatch > iResolve && iBatchAudit > iCatch,
       `resolve@${iResolve} catch@${iCatch} audit@${iBatchAudit}`);
  }
  // ⛔ The override audit asserts a real-money act by a named officer, so it may only be
  // written when the floor ACTUALLY refused the row AND the seal ACTUALLY landed. An
  // earlier draft wrote it on the mere presence of a typed reason, outside every result
  // branch — recording overrides for eligible rows and for seals that had failed.
  ok("10.20 the override audit is gated on an override that was actually USED",
     /const usedOverride = !v\.eligible && !!typed/.test(a) && /if \(usedOverride\) \{/.test(a));
  // ⚠️ ANCHORED ON THE BRANCH, NOT ON A PUSH. `alreadyApplied.push` now appears TWICE — the
  // verdict routes an already-resolved row there too — and the FIRST occurrence is above the
  // loop's seal, so an `indexOf` against it started measuring the wrong pair of positions.
  // The claim is "inside `if (r.ok)`, before the engine's already-resolved arm", so that is
  // what is asserted.
  ok("10.21 …and sits inside the seal's success branch",
     before(a, "if (r.ok) {", 'action: "market.resolve.bulk_override"')
     && before(a, 'action: "market.resolve.bulk_override"', 'r.code === "INVALID"'));
  // ⛔ The RAW payload is bounded before it is parsed, not after the Set collapsed it.
  ok("10.22 the raw payload is bounded BEFORE dedupe",
     before(a, "raw.length > PER_PAGE", "new Set(ids)"));
  // ⛔ A batch that throws part-way must still report what it sealed.
  ok("10.23 the buckets are declared OUTSIDE the try, so an abort still reports them",
     before(a, "const resolved: BulkResolveOutcome[] = []", "  try {"));
  ok("10.24 an aborted batch still writes its run-boundary row", /aborted: true/.test(a));
  ok("10.18 the settle timer is armed per market", /armMarket\(id\)/.test(a));

  // ⛔ A "use server" module may export ONLY async functions — a type exported from it
  // typechecks clean and fails the BUILD.
  const exports = [...a.matchAll(/^export\s+(\w+)/gm)].map((m) => m[1]);
  ok("10.19 the action exports nothing but async functions",
     exports.every((e) => e === "async"), exports.join(","));
}

// ── 11 · THE PAGE HALF ──────────────────────────────────────────────────────
{
  const p = read("src/app/admin/resolver-queue/page.tsx");
  ok("11.1 the page computes the verdict on the SERVER", /bulkVerdictFor\(\{/.test(p));
  ok("11.2 the registry is read ONCE, not per row", /listSources\(\{ enabledOnly: true \}\)/.test(p) && !/isSourceTrusted\(/.test(p));
  ok("11.3 the select column cannot force the grid track", /shrink-0/.test(p));
  ok("11.4 the bar is gated on canBulk with a locked alternative",
     /canBulk \?/.test(p) && /<ControlLocked/.test(p));
  ok("11.5 the override gate is passed down separately", /canOverride=\{canOverride\}/.test(p));

  const bar = read("src/app/admin/resolver-queue/bulk-resolve-bar.tsx");
  ok("11.6 the bar reads the ACT gate", /useMayAct\(\)/.test(bar));
  ok("11.7 …as a hook at the top, never as an early return above other hooks",
     !/if \(!mayAct\) return/.test(bar));
  ok("11.8 the confirmation names the money", /formatTzs\(total\)/.test(bar));
  ok("11.9 …and lists each market with its outcome and confidence",
     /willSeal\.map/.test(bar) && /r\.verdict\.confidence/.test(bar));
  /**
   * ⛔ THE TIER AND THE TYPED WORD MUST TRAVEL AS ONE VALUE.
   *
   * Passed as two independent props, `tier: "hard" | "medium"` and
   * `typedWord: string | undefined` let `hard` with NO word sit inside the declared type —
   * and `ConfirmModal` arms on `tier === "hard" && !!typedWord`, so that combination looks
   * gated and silently degrades to an ordinary confirm. The check therefore asserts the
   * CORRELATED form, and asserts the split form is absent: a guard that only looked for
   * `typedWord="RESOLVE"` somewhere in the file would pass on either.
   */
  ok("11.10 a typed word is demanded ONLY when an override is in the batch",
     /hasOverride[\s\S]{0,40}\?[\s\S]{0,60}tier: "hard", typedWord: "RESOLVE"/.test(bar)
     && /tier: "medium"/.test(bar));
  ok("11.10b …and the tier is never passed independently of the word",
     !/tier=\{/.test(bar) && !/typedWord=\{/.test(bar));
  ok("11.11 the headline counts every bucket, never a bare success",
     /alreadyApplied\.length \? /.test(bar) && /skipped\.length \? /.test(bar));
  ok("11.12 the selection scope is stated on screen", /selectionPageOnly/.test(bar));
  ok("11.13 …and names how many rows are NOT covered", /offPage > 0/.test(bar));
  ok("11.14 the bar is not scroll-driven (no sticky, no scroll listener)",
     !/sticky/.test(bar) && !/addEventListener\("scroll"/.test(bar) && !/onScroll/.test(bar));

  const row = read("src/app/admin/resolver-queue/row-select.tsx");
  ok("11.15 the row states a verdict for an ELIGIBLE market too, not only a blocked one",
     /verdict\.eligible \?/.test(row));
  ok("11.16 the tooltip carries EVERY reason, not just the headline", /verdict\.all\.map/.test(row));
  ok("11.17 the tap target is a 44px literal, never an overridden scale class",
     /min-h-\[44px\]/.test(row) && !/\bh-8\b/.test(row) && !/\bh-10\b/.test(row));
  ok("11.18 the checkbox gets an accessible name via the camelCase prop",
     /ariaLabel=/.test(row) && !/aria-label=\{/.test(row.replace(/<textarea[\s\S]*?\/>/g, "")));
  ok("11.19 a row the officer cannot override says so instead of offering a box",
     /canOverride \?/.test(row));

  const cb = read("src/components/ui/checkbox.tsx");
  ok("11.20 the kit checkbox gained indeterminate as a PROP (not a fork)",
     /indeterminate\?: boolean/.test(cb));
  ok("11.21 …driven as a DOM property, which React will not set from JSX",
     /inputRef\.current\.indeterminate =/.test(cb));
  ok("11.22 …and an accessible-name prop in camelCase", /ariaLabel\?: string/.test(cb));
  ok("11.23 the header checkbox uses it", /indeterminate=\{someOn\}/.test(bar));

  const sel = read("src/app/admin/resolver-queue/bulk-selection.tsx");
  ok("11.24 selection is reset when the page changes", /setSelected\(new Set\(\)\)/.test(sel) && /\[key\]/.test(sel));
  ok("11.25 shift-click extends a range", /extendTo/.test(sel));
  ok("11.26 the selection module imports no server action", !/bulk-resolve-action/.test(sel));
}

// ── 12 · THE PRODUCTION POPULATION, AS FIXTURES ─────────────────────────────
// ⭐ The 17 rows measured on production 2026-08-28. Not a re-diagnosis — a check that the
// verdict says the right thing about the exact shapes an officer is looking at today.
{
  const LIVE_SHAPES: Array<{ name: string; conf: number | null; cited: string | null; approved: string; expect: BulkBlockReason }> = [
    { name: "99% espn",            conf: 99,   cited: "https://www.espn.com/x",          approved: "https://www.premierleague.com/x", expect: "source-different-domain" },
    { name: "98% worldfootball",   conf: 98,   cited: "https://www.worldfootball.net/x", approved: "https://www.premierleague.com/x", expect: "source-different-domain" },
    { name: "97% skysports",       conf: 97,   cited: "https://www.skysports.com/x",     approved: "https://www.premierleague.com/x", expect: "source-different-domain" },
    { name: "95% mancity",         conf: 95,   cited: "https://www.mancity.com/x",       approved: "https://www.premierleague.com/x", expect: "source-different-domain" },
    { name: "92% washingtonpost",  conf: 92,   cited: "https://www.washingtonpost.com/x",approved: "https://www.premierleague.com/x", expect: "source-different-domain" },
    { name: "91% vavel",           conf: 91,   cited: "https://www.vavel.com/x",         approved: "https://www.premierleague.com/x", expect: "source-different-domain" },
    { name: "88% vavel",           conf: 88,   cited: "https://www.vavel.com/x",         approved: "https://www.skysports.com/x",     expect: "source-different-domain" },
    { name: "no assessment",       conf: null, cited: null,                              approved: "https://www.premierleague.com/x", expect: "no-assessment" },
  ];
  for (const s of LIVE_SHAPES) {
    const m = clean({
      sentinelConfidence: s.conf,
      sentinelSourceUrl: s.cited,
      sourceUrl: s.approved,
      sentinelOutcome: s.conf == null ? null : "YES",
      sentinelEvidence: s.conf == null ? null : "A real quoted excerpt from the source.",
      /**
       * ⛔ NULL, BECAUSE THAT IS WHAT THESE ROWS ACTUALLY HOLD. The first draft wrote
       * `true` here — fabricating the one column the migration adds with no default and no
       * backfill — and every one of these assertions passed on a headline no officer would
       * ever see. With the real NULL, `determined-not-recorded` joins `all` on all 17 rows,
       * and the ONLY thing keeping the citation failure as the headline is its position in
       * `REASON_ORDER`. Set the fixture honestly and the ordering is under test; fabricate
       * it and the ordering is not.
       */
      sentinelDetermined: null,
    });
    const v = V(m, { sourceMatches: false });
    ok(`12 · ${s.name} → ${s.expect}`, v.reason === s.expect, String(v.reason));
    // ⭐ THE HEADLINE IS NEVER THE MIGRATION ARTIFACT. Every production row carries it, so
    // a precedence that let it lead would have silenced the citation failure on all 12 —
    // the exact sentence this whole feature exists to put on the screen.
    ok(`12 · ${s.name} · the migration artifact never leads`,
       v.reason !== "determined-not-recorded", v.all.join(","));
  }
  // ⭐ AND THE ONE THAT IS NOT A SOURCE PROBLEM — accuweather cited accuweather, at 82%.
  // If the verdict called this one a citation failure it would be accusing a correct AI
  // read, which is the mirror image of the bug being fixed.
  const acc = V(clean({
    sourceUrl: "https://www.accuweather.com/x", sentinelSourceUrl: "https://www.accuweather.com/x",
    sentinelConfidence: 82, sentinelOutcome: "NO", sentinelDetermined: null,
  }), { sourceMatches: true });
  ok("12 · 82% accuweather (citation MATCHES) → below-threshold", acc.reason === "below-threshold", String(acc.reason));
  ok("12 · …and it is NOT accused of a citation failure",
     !acc.all.some((r) => r.startsWith("source-")), acc.all.join(","));
}

// ── 13 · A NULL OUTCOME IS A HARD STOP, AND `overridable` MUST SAY SO ────────
// ⛔ THE COUNT MUST NOT PROMISE A SEAL THE SERVER WILL ALWAYS REFUSE.
// `BulkVerdict.outcome`'s own contract reads "a null here is a hard stop even under
// override", and the action honours it (`outcome !== "YES" && outcome !== "NO"` → skip).
// But `overridable` was computed from the REASON SET alone, and `no-assessment` /
// `outcome-unknown` — the two states that PRODUCE a null outcome — were both in
// OVERRIDABLE. So the officer saw a textarea, typed twelve characters, and the bar said
// "Seal 1 market?" over that market's pool. The batch then sealed nothing.
//
// ⭐ This is asserted on the VERDICT, not on the bar, because the bar, the row's textarea
// and the server all read the same `overridable` boolean. Fixing it here fixes the count,
// the box and the wire in one place; a filter in the bar would have left the row still
// painting a box that can never be honoured.
{
  const noRead = V(clean({ sentinelOutcome: null, sentinelConfidence: null, sentinelEvidence: null,
                           sentinelSourceUrl: null, sentinelDetermined: null }));
  ok("13.1 a market with no AI read is not eligible", !noRead.eligible, String(noRead.reason));
  ok("13.2 …its outcome is null", noRead.outcome === null, String(noRead.outcome));
  ok("13.3 …and it is NOT offered as overridable", noRead.overridable === false,
     `overridable=${noRead.overridable} reasons=${noRead.all.join(",")}`);

  // The sibling: a read exists but says neither YES nor NO.
  const unknown = V(clean({ sentinelOutcome: "UNCLEAR" as never, sentinelDetermined: false }));
  ok("13.4 an UNCLEAR read yields a null outcome", unknown.outcome === null, String(unknown.outcome));
  ok("13.5 …and is NOT overridable", unknown.overridable === false,
     `overridable=${unknown.overridable} reasons=${unknown.all.join(",")}`);

  // ⭐ THE DISCRIMINATION. If the fix were "overridable is always false" every assertion
  // above would pass over a dead feature. A genuine citation failure — which HAS a YES/NO
  // to seal — must still be overridable, or compliance has lost the override entirely.
  const citation = V(clean({ sentinelSourceUrl: "https://www.some-blog.example/x" }), { sourceMatches: false });
  ok("13.6 a citation failure WITH an outcome is still overridable", citation.overridable === true,
     `overridable=${citation.overridable} reasons=${citation.all.join(",")}`);
  ok("13.7 …and it carries the outcome that would be sealed", citation.outcome === "YES", String(citation.outcome));

  // ⛔ AND THE INVARIANT ITSELF, over the whole population rather than three examples:
  // no verdict may ever be overridable without an outcome to seal.
  const population = [noRead, unknown, citation,
    V(clean({ sentinelConfidence: 40 })),
    V(clean({ status: "RESOLVED" })),
    V(clean({ resolvedOutcome: "YES" })),
    V(clean({ sentinelEvidence: "short" })),
  ];
  ok("13.8 the population is real", population.length === 7, String(population.length));
  ok("13.9 NO verdict is ever overridable with a null outcome",
     population.every((v) => !(v.overridable && v.outcome === null)),
     population.filter((v) => v.overridable && v.outcome === null).map((v) => v.all.join("+")).join(" | "));
  // …and the population is not vacuous in the other direction either.
  ok("13.10 the population contains at least one overridable row",
     population.some((v) => v.overridable), "none overridable — 13.9 would be vacuous");
}

// ── 14 · ONE REASON FOR THE BATCH — AND THE AUDIT STILL PER MARKET ───────────
// The officer types the justification ONCE. What must not follow from that is a wire or an
// audit chain that has also collapsed: every overridden market keeps its own `override:<id>`
// entry and its own audit row, exactly as before.
{
  const bar = read("src/app/admin/resolver-queue/bulk-resolve-bar.tsx");
  const row = read("src/app/admin/resolver-queue/row-select.tsx");
  const sel = read("src/app/admin/resolver-queue/bulk-selection.tsx");

  ok("14.1 the reason lives in the bar, not the row", /<textarea/.test(bar) && !/<textarea/.test(row));
  ok("14.2 there is exactly ONE reason field", (bar.match(/<textarea/g) ?? []).length === 1,
     String((bar.match(/<textarea/g) ?? []).length));
  ok("14.3 the context holds a single string, not a per-market map",
     /sharedReason: string/.test(sel) && !/overrides: Map/.test(sel));

  // ⛔ THE ONE THAT PROTECTS THE CHAIN. The action records `overrides: Array.from(overrides
  // .keys())` on the run-boundary audit row. Fanning the shared string over `chosen` rather
  // than `overridden` would name ELIGIBLE markets as overridden in an append-only record a
  // regulator reads — a false assertion about a real-money act, written by a convenience.
  ok("14.4 the reason fans out over `overridden`, never over `chosen`",
     /for \(const r of overridden\)[\s\S]{0,240}?fd\.set\(`override:\$\{r\.marketId\}`/.test(bar)
     /* ⛔ THE NEGATIVE STAYS ANCHORED TO ITS OWN STATEMENT, and this is not pedantry — it
        was briefly written with the same lazy `[\s\S]{0,240}?` as the positive above and
        began matching CORRECT code, because `for (const r of chosen) fd.append("marketIds"…)`
        sits ~90 characters above the override loop. A negative assertion that can reach into
        the next statement is not a guard; it fires on the shape it is meant to permit. */
     && !/for \(const r of chosen\)\s*\{?\s*fd\.set\(`override:/.test(bar));
  ok("14.5 …and the marketIds list is still the full selection",
     /for \(const r of chosen\) fd\.append\("marketIds"/.test(bar));

  // ⛔ BOTH RESET PATHS. A page change and an explicit Clear are two doors out of a
  // selection; a reason surviving either one is a sentence typed about markets that are no
  // longer on the screen, submitted against whatever is selected next.
  const resets = (sel.match(/setSharedReason\(""\)/g) ?? []).length;
  ok("14.6 the reason is cleared on BOTH page-change and clear()", resets === 2, `${resets} reset sites`);
  ok("14.7 …and it is a dependency of the context value", /clear, sharedReason, setSharedReason, someOn/.test(sel));

  // The field may only be offered where it can be honoured.
  ok("14.8 the field is gated on the compliance grant AND on there being a row to cover",
     /canOverride && needOverride\.length > 0 && \(/.test(bar));
  /**
   * ⭐ 14.9 — THE OWNER'S RULING, ASSERTED. Ali: *"if I click autoresolve I'm responsible
   * about it … we don't care, just resolve"*. A typed sentence no longer stands between him
   * and a batch he has decided on.
   *
   * ⛔ AND THE CLAUSE THAT REPLACED IT IS THE LOAD-BEARING HALF. The old shape got
   * `canOverride` for free, because the box only RENDERED under the compliance grant. Gating
   * on nothing at all would let a trading-only officer post overrides the server refuses at a
   * `softRequireStaff` asked ONCE for the whole batch — killing eligible rows too. So this
   * asserts the exact gate, not merely the absence of the old one.
   */
  ok("14.9 the override list is gated on the COMPLIANCE GRANT, not on a typed sentence",
     /const overridden = canOverride \? needOverride : \[\]/.test(bar));
  ok("14.9b …and no length floor survives on the CLIENT to re-block him",
     !/MIN_REASON/.test(bar) && !/shortReason/.test(bar));
  // ⛔ THE DISCRIMINATION. 14.9b passes just as well if the client stopped sending overrides
  // altogether. The server's floor must still be there — it is the forged-payload guard.
  ok("14.9c …while the SERVER's floor is untouched",
     /MIN_REASON/.test(read("src/app/admin/resolver-queue/bulk-resolve-action.ts")));
  ok("14.10 the reason is length-capped at the wire's limit", /maxLength=\{500\}/.test(bar));

  // ⭐ THE LABEL IS THE COUNT. "Why are you sealing this anyway?" over a shared field is
  // ambiguous about scope in a way a per-row box never was; the number closes it.
  ok("14.11 the label names how many markets the one sentence covers",
     /needOverride\.length === 1 \? "this market" : `these \$\{needOverride\.length\} markets`/.test(bar));
  ok("14.12 the row still declares that it is covered", /Needs an override/.test(row));

  // ⛔ A DISABLED CONTROL MUST ALWAYS SAY WHY. The reported defect was a greyed button whose
  // every tooltip branch returned `undefined` in exactly the state an officer reaches by
  // ticking twenty refused rows. A trailing `undefined` is what allows that to come back.
  // ⛔ `\s` NOT `\n`, and the block located by REGEX not `indexOf("title={\n")`. This repo's
  // files are CRLF, so a literal newline in the needle matches nothing, `indexOf` returns
  // -1, and the assertion fails on a correct product — which is exactly how it first failed.
  const titleAt = /title=\{\s*$/m.exec(bar);
  const titleBlock = titleAt ? bar.slice(titleAt.index, titleAt.index + 1200) : "";
  ok("14.13 the disabled button's tooltip has no undefined branch",
     titleBlock.length > 0 && !/:\s*undefined\s*\}/.test(titleBlock),
     titleAt ? "a state with no explanation remains" : "the title prop was not found at all");
  ok("14.14 …and it explains the refused-rows state by name",
     /refused by the resolver/.test(bar));
}

// ── 14b · THE JUSTIFICATION IS COMPOSED, AND AN EMPTY NOTE STILL SEALS ───────
/**
 * ⛔ THE ASSERTION THE WHOLE CHANGE RESTS ON. The typed reason is gone from the client, so
 * the ONLY thing keeping an override above the server's `MIN_REASON` is what
 * `composeOverrideJustification` produces from the row itself. If that can ever come back
 * short, the officer presses seal and the server refuses the entire batch — the exact
 * failure the typed box used to prevent.
 *
 * ⭐ SO IT IS ASSERTED OVER A POPULATION, not one happy example: every overridable reason,
 * with and without a note, with and without a confidence, with and without hosts.
 */
{
  const MIN_ON_THE_WIRE = 12; // mirrors `MIN_REASON` in bulk-resolve-action.ts

  const base = {
    reason: "source-different-domain" as const,
    all: ["source-different-domain"] as const,
    citedHost: "www.washingtonpost.com",
    approvedHost: "www.premierleague.com",
    confidence: 92,
    outcome: "YES" as const,
    threshold: 90,
  };

  const noNote = composeOverrideJustification({ ...base, all: [...base.all] });
  ok("14b.1 an EMPTY note still produces a justification", noNote.length > 0, noNote);
  ok("14b.2 …and it clears the server's floor on its own",
     noNote.length >= MIN_ON_THE_WIRE, `${noNote.length} chars`);
  ok("14b.3 …and it states the outcome being sealed", /YES/.test(noNote), noNote);
  ok("14b.4 …the confidence AND the floor THAT MARKET was judged by",
     /92%/.test(noNote) && /90%/.test(noNote), noNote);
  ok("14b.5 …and which site was read against which was approved",
     /washingtonpost\.com/.test(noNote) && /premierleague\.com/.test(noNote), noNote);

  // ⛔ THE FLOOR IS THE ROW'S OWN, NOT THE QUEUE'S. `page.tsx` used to hand the GLOBAL
  // threshold to the copy while `bulkVerdictFor` refused the row against the per-market one.
  // Composing that global number into an append-only chain would be a false statement about
  // a real-money act, so the number must travel ON the verdict.
  const perMarket = composeOverrideJustification({ ...base, all: [...base.all], threshold: 95 });
  ok("14b.6 the floor is read from the verdict, so a per-market override reaches the chain",
     /95%/.test(perMarket) && !/90%/.test(perMarket), perMarket);

  // An officer's words are ADDED, never required, and never replace the facts.
  const withNote = composeOverrideJustification({ ...base, all: [...base.all], note: "Match finished, result irreversible." });
  ok("14b.7 a note is appended", /Match finished, result irreversible\./.test(withNote), withNote);
  ok("14b.8 …without displacing the composed facts",
     /92%/.test(withNote) && /premierleague\.com/.test(withNote), withNote);
  ok("14b.9 a whitespace-only note adds nothing",
     composeOverrideJustification({ ...base, all: [...base.all], note: "   " }) === noNote);

  // ⭐ EVERY standing refusal, not just the headline — a row refused on three counts and
  // recorded as one is a partial account of what the officer cleared.
  const multi = composeOverrideJustification({
    ...base, all: ["source-different-domain", "below-threshold", "thin-evidence"], confidence: 71,
  });
  ok("14b.10 every standing refusal is named, not just the headline",
     [BULK_REASON["source-different-domain"].label, BULK_REASON["below-threshold"].label,
      BULK_REASON["thin-evidence"].label].every((l) => multi.includes(l)), multi);

  // ⛔ THE WIRE CAP. The action stores at most 500 characters; what the chain records must be
  // what the composer produced, not a server truncation of something longer.
  const huge = composeOverrideJustification({
    ...base,
    all: Object.keys(BULK_REASON) as (keyof typeof BULK_REASON)[],
    note: "x".repeat(900),
  });
  ok("14b.11 the composed string never exceeds the wire's 500-char cap",
     huge.length <= 500, `${huge.length} chars`);

  // ⛔ THE POPULATION. A market with no confidence and no approved source is the thin end,
  // and it is exactly where a composer is most likely to return something short.
  const thin = [
    composeOverrideJustification({ reason: "source-untrusted", all: ["source-untrusted"], citedHost: "some-blog.example", approvedHost: null, confidence: null, outcome: "NO", threshold: 90 }),
    composeOverrideJustification({ reason: "thin-evidence", all: ["thin-evidence"], citedHost: null, approvedHost: null, confidence: null, outcome: "NO", threshold: 90 }),
    composeOverrideJustification({ reason: null, all: [], citedHost: null, approvedHost: null, confidence: null, outcome: null, threshold: 90 }),
  ];
  ok("14b.12 the population is real", thin.length === 3, String(thin.length));
  ok("14b.13 NO composed justification is ever short enough for the server to refuse",
     thin.every((s) => s.length >= MIN_ON_THE_WIRE),
     thin.map((s) => `${s.length}:${s}`).join(" | "));
}

// ── 14c · THE FLOOR TRAVELS ON THE VERDICT ───────────────────────────────────
/**
 * 🔴 THE DEFECT THIS CLOSES, FOUND WHILE WIRING THE COMPOSER. `page.tsx` computed each
 * row's verdict against `getEffectiveConfig(m.id).resolveConfidenceThreshold` — the
 * PER-MARKET floor, which honours an override — and then handed the copy a separate
 * `displayThreshold` read from the GLOBAL config. A market with its own floor was refused
 * against 95 and told the officer "floor 90%".
 *
 * ⚠️ It was cosmetic while it only dressed a chip. It stopped being cosmetic the moment the
 * same number began being composed into an append-only chain a regulator reads.
 */
{
  const page = read("src/app/admin/resolver-queue/page.tsx");
  const row = read("src/app/admin/resolver-queue/row-select.tsx");

  /* ⛔ COUNTED, NOT MERELY PRESENT — and the first draft of this assertion was the very trap
     this repo names most often. `/threshold: cfg\.resolveConfidenceThreshold/` is ALSO
     satisfied by the `bulkVerdictFor({ market: m, mode, threshold: cfg… })` call one line
     above, so swapping the PROJECTION to the queue-wide config left the guard green and
     `red:bulk-resolve` reported the mutation as NOT CAUGHT. Two occurrences is the claim:
     the verdict and the row's copy read the SAME per-market number. */
  const perMarketReads = (page.match(/threshold: cfg\.resolveConfidenceThreshold/g) ?? []).length;
  ok("14c.1 the verdict AND the row's projection read the same per-market floor",
     perMarketReads === 2, `${perMarketReads} reads`);
  ok("14c.1b …and the queue-wide config never supplies a threshold",
     !/threshold: globalCfg\.resolveConfidenceThreshold/.test(page));
  ok("14c.2 …and no queue-wide floor is handed to a row any more",
     !/displayThreshold/.test(page));
  ok("14c.3 the row reads the floor off the verdict rather than a prop",
     /bulkReasonDetail\(verdict\)/.test(row) && !/threshold: number;/.test(row));
  // ⛔ THE DISCRIMINATION. 14c.3 would pass just as well if `bulkReasonDetail` stopped being
  // called at all and the row simply printed no detail.
  ok("14c.4 …and it still renders that detail", /\{detail\}/.test(row));
}

// ── 15 · THE QUEUE ORDER ─────────────────────────────────────────────────────
// ⛔ AN UNSTABLE SORT UNDER PAGINATION LOSES ROWS. Two requests that disagree about the
// order of tied rows put a market on page 2 for one click and page 3 for the next, and an
// officer working front-to-back never sees it. `pool` is 0 across much of the queue and
// `sentinelConfidence` is NULL on every pre-column row, so ties are the COMMON case here,
// not the edge — which is why every comparator must be total.
{
  const M = (id: string, over: Partial<Parameters<typeof compareBy>[0] extends never ? never : {
    id: string; resolutionAt: string; createdAt: string;
    yesPool: number; noPool: number; sentinelConfidence?: number | null;
  }> = {}) => ({
    id, resolutionAt: "2026-08-28T12:00:00Z", createdAt: "2026-08-01T00:00:00Z",
    yesPool: 0, noPool: 0, sentinelConfidence: null as number | null, ...over,
  });

  const ids = (rows: ReturnType<typeof M>[], key: Parameters<typeof compareBy>[0]) =>
    [...rows].sort(compareBy(key)).map((r) => r.id).join(",");

  // ⭐ TOTALITY FIRST, over rows that are identical in the sort field. If the comparator
  // leaves these to the engine, the two shuffles below disagree.
  const tied = [M("mkt_c"), M("mkt_a"), M("mkt_b")];
  const shuffled = [M("mkt_b"), M("mkt_c"), M("mkt_a")];
  for (const key of ["due", "money", "confidence", "newest"] as const) {
    ok(`15.1 ${key} is TOTAL — identical rows sort identically whatever the input order`,
       ids(tied, key) === ids(shuffled, key), `${ids(tied, key)} vs ${ids(shuffled, key)}`);
  }

  /**
   * ⛔ EVERY ID BELOW IS CHOSEN SO ALPHABETICAL ORDER IS THE **OPPOSITE** OF THE EXPECTED
   * ANSWER, and that is the whole reason these assertions are worth anything.
   *
   * The first version of this section named the rows "big"/"small", "high"/"low"/"none",
   * "new"/"old" — and every one of those happens to be alphabetically ordered the way the
   * sort should return them. The final tie-break is `id`, so with the money branch DELETED
   * (`if (false)`) the comparator fell through to the default, sorted by id, and produced
   * exactly the expected string: **the suite reported 184/184 over a sort key that did
   * nothing.** Proven by mutation, not reasoned about.
   *
   * ⭐ So each fixture now makes the fallback WRONG. If a comparator stops doing its own
   * work, the id tie-break returns the reverse and the assertion fails.
   */
  // Money: biggest pool first, and the two halves are ADDED (a market holding 0/900 outranks
  // one holding 400/400 — reading only `yesPool` would get this backwards).
  const byMoney = [M("aa_small", { yesPool: 400, noPool: 400 }), M("zz_big", { yesPool: 0, noPool: 900 })];
  ok("15.2 money orders on yesPool + noPool, largest first",
     ids(byMoney, "money") === "zz_big,aa_small", ids(byMoney, "money"));

  // ⛔ NO READING SORTS LAST — never as 0, which would rank it above a genuine 5%.
  const byConf = [M("aa_none"), M("mm_low", { sentinelConfidence: 5 }), M("zz_high", { sentinelConfidence: 97 })];
  ok("15.3 confidence ranks a NULL reading last, not as zero",
     ids(byConf, "confidence") === "zz_high,mm_low,aa_none", ids(byConf, "confidence"));
  const undef = [M("aa_undef", { sentinelConfidence: undefined }), M("zz_low", { sentinelConfidence: 5 })];
  ok("15.4 …and an ABSENT reading is treated the same as an explicit null",
     ids(undef, "confidence") === "zz_low,aa_undef", ids(undef, "confidence"));

  // Due: most overdue first — the default, and the tie-break every other comparator falls to.
  const byDue = [M("aa_later", { resolutionAt: "2026-08-28T18:00:00Z" }), M("zz_overdue", { resolutionAt: "2026-08-27T00:00:00Z" })];
  ok("15.5 due orders most-overdue first", ids(byDue, "due") === "zz_overdue,aa_later", ids(byDue, "due"));
  const byNew = [M("aa_old", { createdAt: "2026-01-01T00:00:00Z" }), M("zz_new", { createdAt: "2026-08-27T00:00:00Z" })];
  ok("15.6 newest orders most-recently-created first", ids(byNew, "newest") === "zz_new,aa_old", ids(byNew, "newest"));

  // ⭐ AND EACH KEY MUST ACTUALLY DIFFER FROM THE DEFAULT. A dead branch falls through to
  // `due`, so "is this key's order different from due's?" is the question that catches it —
  // asked per key, not as a set-size over all four, which a single surviving difference
  // satisfies while two other keys are dead.
  const mixed = [
    M("row_a", { yesPool: 10, sentinelConfidence: 10, resolutionAt: "2026-08-26T00:00:00Z", createdAt: "2026-01-01T00:00:00Z" }),
    M("row_b", { yesPool: 90, sentinelConfidence: 90, resolutionAt: "2026-08-29T00:00:00Z", createdAt: "2026-08-20T00:00:00Z" }),
  ];
  for (const key of ["money", "confidence", "newest"] as const) {
    ok(`15.7 ${key} produces an order of its own, not the default`,
       ids(mixed, key) !== ids(mixed, "due"), `${key}=${ids(mixed, key)} · due=${ids(mixed, "due")}`);
  }

  // The page half: the order must survive a page turn, or page 2 is a different queue.
  const p = read("src/app/admin/resolver-queue/page.tsx");
  ok("15.8 the pager carries the sort", /buildBaseHref\("\/admin\/resolver-queue", \{[^}]*sort: sp\.sort/.test(p));
  /* ⭐ THE BEHAVIOUR, not the spelling. This used to match the parsing expression as SOURCE
     TEXT in page.tsx, so moving the parser into its own module broke a guard while the
     product was fine — a check pinned to a location rather than to what it guarantees. */
  ok("15.9 an unknown ?sort= falls back to the default rather than emptying the queue",
     parseSort("nonsense") === "due" && parseSort(undefined) === "due" && parseSort("") === "due",
     `${parseSort("nonsense")} / ${parseSort(undefined)} / ${parseSort("")}`);
  ok("15.9b …and every offered option is accepted verbatim",
     SORT_OPTIONS.every((o) => parseSort(o.value) === o.value),
     SORT_OPTIONS.map((o) => `${o.value}→${parseSort(o.value)}`).join(" "));
  ok("15.10 the sort runs over the FILTERED SET, before the page slice",
     before(p, ".sort(compareBy(sortKey))", "pending.slice("));
}

// ── 16 · A STAGED ROW STAYS STAGED WHEN THE POLICY IS TOGGLED OFF ────────────
// ⛔ THE SIGNATURE IS A FACT ABOUT THE ROW, NOT ABOUT THE CURRENT SETTING.
// `staged` was `requireTwoOfficer && !!m.resolutionStage1By`, so the refusal evaporated the
// moment compliance flipped two-admin off — a supported, one-click action. Officer A, who
// had bulk-STAGED ten markets, could then seal all ten with their own single press:
// `resolveMarket` drops its stage-1 and different-officer guards under the same setting, so
// A's press completes A's own stage-1 as a solo seal. The one-officer rule is not enforced
// by the policy flag alone — it is enforced by refusing to bulk-act on a row that already
// carries someone's first signature.
//
// ⭐ And where the staged outcome DIFFERS (a staged VOID, which the AI's YES/NO vocabulary
// cannot express) the engine refuses with "Stage-2 outcome must match" and the row lands
// under the heading "Failed" — a policy refusal reported to the officer as an engine fault.
{
  const stagedRow = clean({ resolutionStage1By: "usr_me" });
  const off = V(stagedRow, { requireTwoOfficer: false });
  ok("16.1 a row carrying a stage-1 signature is NOT eligible with the policy OFF",
     off.eligible === false, `eligible=${off.eligible} reasons=${off.all.join(",")}`);
  ok("16.2 …and it is named as awaiting a countersignature",
     off.all.includes("awaiting-countersignature"), off.all.join(","));
  ok("16.3 …and it is not overridable — a countersignature is never a bulk act",
     off.overridable === false, String(off.overridable));

  const byOther = V(clean({ resolutionStage1By: "usr_someone_else" }), { requireTwoOfficer: false });
  ok("16.4 the same holds when ANOTHER officer staged it", byOther.eligible === false, byOther.all.join(","));

  // Unchanged behaviour with the policy ON — this must not be a regression in the other
  // direction, where the fix simply blocks everything.
  const on = V(stagedRow, { requireTwoOfficer: true });
  ok("16.5 with the policy ON it is still refused, as before", on.eligible === false, on.all.join(","));
  ok("16.6 …and the copy still knows WHO staged it", on.stagedByMe === true, String(on.stagedByMe));

  // ⭐ THE DISCRIMINATION. An unstaged row must remain sealable, or the fix has simply
  // turned the queue off.
  const unstaged = V(clean({ resolutionStage1By: null }), { requireTwoOfficer: false });
  ok("16.7 an UNSTAGED row is still eligible", unstaged.eligible === true, unstaged.all.join(","));
}

// ── 17 · THE BULK PATH IS NEVER LAXER THAN THE ENGINE ────────────────────────
// ⛔ `sourceMatches` HAS TWO ARMS, AND THE SECOND ONE HAS A GATE IN FRONT OF IT.
// The engine's second arm is `isSourceTrusted`, which refuses a DISABLED CATEGORY before it
// considers any host. `sourceMatchesAny` deliberately omits that check — its docstring says
// so — which makes it the caller's debt. Both callers had left it unpaid, so a market whose
// category an operator had disabled was refused by the scheduled resolver and shown as a
// green ELIGIBLE row by the queue, sealable in one press with NO override, NO typed reason
// and NO compliance audit row. ⭐ A bulk convenience that is a LAXER gate than the thing it
// is a shortcut for is the worst possible direction for this defect to point.
{
  const page = read("src/app/admin/resolver-queue/page.tsx");
  const action = read("src/app/admin/resolver-queue/bulk-resolve-action.ts");

  for (const [name, src] of [["page", page], ["action", action]] as const) {
    ok(`17.1 ${name} · the registry arm honours a disabled category`,
       /!disabledCategories\.has\(resolvePublishCategory\(m\.category\)\) &&/.test(src));
    ok(`17.2 ${name} · …and the check sits BEFORE the host match, as the engine orders it`,
       before(src, "!disabledCategories.has(resolvePublishCategory(m.category))", "sourceMatchesAny("));
    ok(`17.3 ${name} · the disabled list is read ONCE, not per row`,
       (src.match(/listDisabledCategories\(\)/g) ?? []).length === 1,
       `${(src.match(/listDisabledCategories\(\)/g) ?? []).length} calls`);
  }

  // ⛔ AND THE TWO CALLERS MUST AGREE WITH EACH OTHER. They are two transcriptions of one
  // engine expression; the page paints the chip and the action moves the money, so a
  // divergence shows the officer a verdict the seal will not honour.
  /* ⛔ SLICE TO THE STATEMENT'S OWN TERMINATOR, not to a fixed window. A 420-character
     window swept up whatever happened to follow the expression in each file and reported
     two identical expressions as different. `trustedSources`/`sources` is the one name that
     legitimately differs between the two callers, so it is normalised away — deliberately
     and narrowly, because normalising more would let a real divergence through. */
  const armOf = (src: string) => {
    const i = src.indexOf("const sourceMatches =");
    if (i < 0) return "";
    const end = src.indexOf(";", i);
    return src.slice(i, end < 0 ? i : end).replace(/\s+/g, " ").replace(/trustedSources|sources/g, "SRC");
  };
  ok("17.4 the page and the action compute `sourceMatches` identically",
     armOf(page).length > 0 && armOf(page) === armOf(action),
     armOf(page) === armOf(action) ? "identical" : `page: ${armOf(page).slice(0, 120)}\n         action: ${armOf(action).slice(0, 120)}`);
}

// ── 18 · THE QUEUE'S READ IS BOUNDED BY ITS OWN RESULT (E-252) ───────────────
/**
 * 🔴 THE DEFECT. `resolver-queue/page.tsx` called `listMarkets()` with NO filter — every
 * non-demo MARKET-line row including RESOLVED and VOIDED — and narrowed to two statuses in
 * JavaScript. The cost was O(every market ever run) to produce O(pending), and the RESOLVED
 * bucket grows for ever. The index it needed already existed, unused:
 * `@@index([productLine, status, resolutionAt])`.
 *
 * ⛔ THIS IS A SOURCE ASSERTION AND IT IS HONEST ABOUT THAT. It proves the READ was pushed
 * down; it cannot prove the query PLAN. `EXPLAIN` needs production credentials, which CI
 * does not have and which this machine does not have either — so the row count is
 * deliberately not quoted anywhere in this change.
 */
{
  const page = read("src/app/admin/resolver-queue/page.tsx");

  ok("18.1 the queue asks for the two statuses it renders",
     /listMarkets\(\{ status: "CLOSED" \}\)/.test(page) && /listMarkets\(\{ status: "LIVE" \}\)/.test(page));
  /* ⛔ THE ONE THAT ACTUALLY CATCHES A REGRESSION. 18.1 stays green if somebody re-adds an
     unfiltered read BESIDE the two filtered ones — which is exactly how this comes back,
     as a "just for the counts" convenience. A bare `listMarkets()` must not exist here. */
  ok("18.2 …and NO unfiltered whole-table read survives on this page",
     !/listMarkets\(\)/.test(page), "a bare listMarkets() is back on the resolver queue");
  ok("18.3 both reads share ONE failure path, so half a queue is never shown as the whole one",
     /Promise\.all\(\[[\s\S]{0,200}?\]\)\.catch\(/.test(page) && /marketsFailed = true;/.test(page));
}

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
