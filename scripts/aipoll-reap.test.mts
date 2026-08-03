/**
 * E-60 · the reaper — an abandoned generation must reach a terminal state, and a LIVE one
 * must not be touched.
 *
 *   npm run test:aipoll-reap
 *
 * The two failures this guards are opposite, and the second is far worse than the first:
 *  · too slow / absent → rows sit `GENERATING` forever (seven did, the oldest 878 hours);
 *  · too eager → it kills a generation that is still running, which turns a working
 *    feature into an intermittent one. So the cutoff is asserted from BOTH sides.
 */
import { readFileSync } from "node:fs";
import { STUCK_GENERATION_MINUTES } from "../src/lib/server/ai-poll-generation.ts";

const SRC = readFileSync(new URL("../src/lib/server/ai-poll-generation.ts", import.meta.url), "utf8");
const LIFE = readFileSync(new URL("../src/lib/server/lifecycle.ts", import.meta.url), "utf8");

let pass = 0;
const fails: string[] = [];
const ok = (n: string, c: boolean, d = "") => { if (c) pass++; else fails.push(`${n}${d ? ` — ${d}` : ""}`); };

// ── §1 · the cutoff is sane from both directions ───────────────────────────────
{
  // A healthy single generation completed in 24s on production (generate_started
  // 10:13:23 → pending_review 10:13:47). The cutoff must be far above that…
  ok("§1 the cutoff is at least 5 minutes — an order of magnitude above a real generation",
     STUCK_GENERATION_MINUTES >= 5, `got ${STUCK_GENERATION_MINUTES}`);
  // …and far below the 878 hours a corpse actually survived.
  ok("§1 …and no more than an hour, or corpses outlive an operator's shift",
     STUCK_GENERATION_MINUTES <= 60, `got ${STUCK_GENERATION_MINUTES}`);
}

// ── §2 · ⛔ it only ever touches GENERATING ─────────────────────────────────────
{
  const fn = SRC.slice(SRC.indexOf("export async function reapStuckGenerations"),
                       SRC.indexOf("/** Progress toward today's poll target"));
  ok("§2 the reaper exists and is exported", fn.length > 0);
  ok("§2 ⭐ it skips anything not GENERATING",
     /state !== "GENERATING"\)\s*continue/.test(fn),
     "a reaper that can touch PENDING_REVIEW or PUBLISHED would destroy an officer's work");
  ok("§2 ⭐ it skips rows younger than the cutoff",
     /createdAt\) > cutoff\)\s*continue/.test(fn),
     "without this it kills live generations");
  ok("§2 the terminal state is one the console already renders",
     /state: "VALIDATION_FAILED"/.test(fn));
  // ⛔ E-1: a reason key with no translation renders raw enum text to a SW/ZH reader.
  // ⚠️ Assert the ASSIGNMENT, not the word. The first version banned the string outright
  // and failed on the COMMENT that explains why the string must not be assigned — a check
  // that cannot tell code from prose is the same class of miss as one that cannot tell a
  // symbol from its value.
  ok("§2 ⭐ it does NOT write a rejectReasons member", !/rejectReasons\s*:/.test(fn),
     "rejectReasons is a typed FilterReason union with a per-locale label map (E-1)");
  ok("§2 it records WHY in the audit chain instead",
     /action: "aipoll\.generation_reaped"/.test(fn) && /ageMinutes/.test(fn));
  ok("§2 it never throws (a chore must not take the ticker down)", /catch \(e\)/.test(fn));
}

// ── §3 · ⭐ THE CALL SITE — a reaper nothing calls reaps nothing ────────────────
{
  ok("§3 lifecycle imports it",
     /import \{ reapStuckGenerations \} from "\.\/ai-poll-generation"/.test(LIFE));
  // Assert the CALL, in statement position, not merely the symbol's presence.
  ok("§3 ⭐ the ticker actually calls it",
     /^\s*await reapStuckGenerations\(\)/m.test(LIFE),
     "the import can exist while nothing invokes it");
  ok("§3 it has its own catch, so another chore's failure cannot silence it",
     /reapStuckGenerations\(\)\.catch\(/.test(LIFE));
}

const label = "E-60 · aipoll reap";
if (fails.length) {
  console.error(`\n${label} — ${pass} passed, ${fails.length} FAILED\n`);
  for (const f of fails) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`${label} — ${pass} passed, 0 failed`);
