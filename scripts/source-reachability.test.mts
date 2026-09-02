/**
 * `npm run test:source-reachability` — E-254's open half.
 *
 * ⛔ WHAT THIS GUARDS IS A REFUSAL THAT MUST NOT BECOME A WALL. An operator adding a trusted
 * source is now told, at the moment of the decision, when Anthropic's fetcher cannot read
 * that host — and is then allowed to proceed deliberately. Three things can go wrong and all
 * three are silent:
 *
 *   ① the probe reports "blocked" for an unrelated failure, so a healthy domain is refused
 *      with a confident, wrong sentence;
 *   ② the probe FAILS CLOSED, so an API outage quietly stops the console accepting any
 *      source at all — which presents as a dead button, not as an outage;
 *   ③ the acknowledgement is believed instead of measured, so the audit chain records
 *      "blocked" about a host nobody probed.
 *
 * ⭐ THE CLASSIFIER IS PURE FOR EXACTLY THIS REASON. The network half cannot run in CI, so
 * every decision it makes lives in `classifyProbeError`, which runs anywhere.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { decomment } from "./lib/decomment.mts";
import {
  classifyProbeError,
  probeDomainReachable,
  reachabilityRefusal,
  CRAWLER_BLOCK_SIGNATURE,
} from "../src/lib/server/source-reachability.ts";

const ROOT = process.cwd();
let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra = "") => {
  if (cond) pass++; else fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${extra ? ` — ${extra}` : ""}`);
};
/* Source checks run on CODE, not on the prose explaining it — the shared stripper, never a
   private one (`test:decomment` holds that population behind a shrink-only ratchet). */
const read = (rel: string) => decomment(readFileSync(join(ROOT, rel), "utf8"));

// ── 1 · THE CLASSIFIER ───────────────────────────────────────────────────────
{
  // The sentence Anthropic actually returns, recorded verbatim from the 2026-08-29 probe.
  const real = `400 invalid_request_error — The following domains are not accessible to our user agent: ['bbc.com']`;
  const v = classifyProbeError(real);
  ok("1.1 the real Anthropic refusal classifies as BLOCKED", v.state === "blocked", v.state);
  ok("1.2 …and it carries the detail rather than swallowing it",
     v.state === "blocked" && v.detail.includes("bbc.com"), JSON.stringify(v));

  /* ⛔ THE ONE THAT MATTERS MOST. A 400 from this endpoint has many causes, and the most
     likely one is that WE broke the tool block. Reporting that as "this domain is blocked"
     would tell an operator a confident, false thing about a healthy source — and would do it
     most reliably at the exact moment we had just shipped a bug. */
  const ours = `400 invalid_request_error — tools.0.custom.name: Extra inputs are not permitted`;
  ok("1.3 an UNRELATED 400 is NOT reported as a blocked domain",
     classifyProbeError(ours).state === "unknown", classifyProbeError(ours).state);
  ok("1.4 a network error is unknown, not blocked",
     classifyProbeError("fetch failed: ECONNRESET").state === "unknown");
  ok("1.5 an empty message is unknown, and still says something",
     classifyProbeError("").state === "unknown"
     && (classifyProbeError("") as { detail: string }).detail.length > 0);

  /* ⭐ THE DISCRIMINATION. Every assertion above passes just as well if the classifier
     returns "unknown" for EVERYTHING — a probe that can never report a blocked domain is a
     dead feature that looks perfectly healthy. 1.1 is the positive half; this states the
     population is not one-sided. */
  const population = [real, ours, "fetch failed", "", "429 rate_limit_error"];
  const states = population.map((m) => classifyProbeError(m).state);
  ok("1.6 the population is real", population.length === 5, String(population.length));
  ok("1.7 the classifier is not constant — it returns BOTH states over the population",
     new Set(states).size === 2, states.join(","));
  ok("1.8 …and exactly one of them is `blocked`",
     states.filter((s) => s === "blocked").length === 1, states.join(","));

  // The signature is matched case-insensitively — the wording has changed casing before.
  ok("1.9 the signature is case-insensitive", CRAWLER_BLOCK_SIGNATURE.test("NOT ACCESSIBLE TO OUR USER AGENT"));
}

// ── 2 · IT FAILS OPEN ────────────────────────────────────────────────────────
/**
 * ⛔ THE DIRECTION OF FAILURE IS THE WHOLE SAFETY ARGUMENT. A source registry that stops
 * accepting sources whenever Anthropic is unwell is a worse defect than the silence this
 * change closes, and it would reach an operator as "the Add button does nothing".
 */
{
  const saved = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  const v = await probeDomainReachable("bbc.com");
  if (saved !== undefined) process.env.ANTHROPIC_API_KEY = saved;

  ok("2.1 with no API key the probe returns UNKNOWN, never blocked", v.state === "unknown", v.state);
  ok("2.2 an empty domain is unknown, not blocked",
     (await probeDomainReachable("")).state === "unknown");

  // ⛔ AND THE CALLER MUST HONOUR IT. `unknown` is permission; only `blocked` refuses.
  const actions = read("src/app/admin/sources/actions.ts");
  ok("2.3 the action refuses ONLY on `blocked`",
     /reach\.state === "blocked"/.test(actions) && !/reach\.state !== "reachable"/.test(actions));
}

// ── 2b · THE PROBE MUST USE A MODEL THAT CAN ACTUALLY HOLD THE TOOL ──────────
/**
 * 🔴 THIS SECTION EXISTS BECAUSE THE FIRST VERSION SHIPPED BROKEN TO PRODUCTION AND EVERY
 * ASSERTION ABOVE STILL PASSED.
 *
 * The probe was written with `ai.triageModel` (Haiku) because it is cheapest. Driven on
 * production against `bbc.com` — a host measured as BLOCKED four days earlier — it returned
 * `unknown`, the add proceeded, and the audit row read `"aiReachable":"unknown"`. The cause
 * was not the domain: **`web_fetch` is not available to the triage model**, so the call
 * 400'd on the TOOL and every domain in the world looked unknowable.
 *
 * ⛔ A CHECK THAT FAILS OPEN ON EVERY INPUT IS INVISIBLE. It never refuses, so it never looks
 * wrong; §1 kept passing because the classifier was never the broken part. The only
 * instrument that could see it was a live drive.
 *
 * ⭐ SO THE ASSERTION IS ABOUT PROVENANCE, NOT ABOUT A MODEL NAME: arm the server tool with
 * the SAME model that `market-sentinel.ts` arms it with — the call whose 400 discovered the
 * blocked-domain behaviour in the first place.
 */
{
  const probe = read("src/lib/server/source-reachability.ts");
  const sentinel = read("src/lib/server/market-sentinel.ts");

  ok("2b.1 the probe does NOT use the triage model, which cannot hold a server tool",
     !/model: ai\.triageModel/.test(probe));
  ok("2b.2 …it uses `ai.model`, the shape `market-sentinel.ts` proves works",
     /model: ai\.model,/.test(probe));
  /* ⛔ THE DISCRIMINATION. 2b.2 would pass over a probe that no longer arms `web_fetch` at
     all — which would also never refuse anything, by a different route. */
  ok("2b.3 …and it still arms the fetch tool pinned to the one domain",
     /allowed_domains: \[host\]/.test(probe) && /ai\.webFetchTool\.type/.test(probe));
  ok("2b.4 the sentinel still arms the same tool, so the provenance claim stays true",
     /ai\.webFetchTool\.type/.test(sentinel) && /allowed_domains: \[approvedHost\]/.test(sentinel));

  // ⛔ AND A PERMANENT `unknown` MUST BE AUDIBLE. Failing open in silence is how this dies.
  ok("2b.5 an `unknown` is announced rather than swallowed",
     /console\.warn\(`\[source-reachability\]/.test(probe));
}

// ── 3 · THE ACKNOWLEDGEMENT IS A PERMISSION, NEVER AN OBSERVATION ────────────
/**
 * 🔴 THE BUG THIS EXISTS TO PREVENT WAS WRITTEN AND CAUGHT DURING THE CHANGE ITSELF. The
 * first draft skipped the probe when the form carried `acknowledgeUnreachable`, and then
 * recorded `aiReachable: "blocked"` — a fact about the world, asserted into an append-only
 * chain on the strength of a field the CLIENT chose to send.
 */
{
  const actions = read("src/app/admin/sources/actions.ts");

  ok("3.1 the probe runs unconditionally, not only when unacknowledged",
     /const reach = await probeDomainReachable\(domain\);/.test(actions));
  ok("3.2 …so the acknowledgement never short-circuits the measurement",
     !/acknowledged\s*\?[\s\S]{0,120}state: "blocked"/.test(actions));
  ok("3.3 the acknowledgement only decides whether we REFUSE",
     /if \(!acknowledged && reach\.state === "blocked"\)/.test(actions));
  ok("3.4 the refusal is addressable and re-triable",
     /needsAck: true/.test(actions) && /fieldError\("domain"/.test(actions));

  const registry = read("src/lib/server/source-registry.ts");
  ok("3.5 the audit records what was MEASURED and what was CHOSEN, separately",
     /aiReachable: meta\?\.aiReachable \?\? null/.test(registry)
     && /acknowledgedUnreachable: meta\?\.acknowledgedUnreachable \?\? false/.test(registry));

  /* ⛔ AND IT IS AUDIT-ONLY. `addSource` spreads `input` verbatim into the stored row, so a
     reachability field added THERE would become a property of the domain in the registry —
     a measurement taken once, at 01:00 on one Tuesday, frozen as though it were permanent. */
  ok("3.6 the probe result is a SECOND parameter, never spread into the stored row",
     /meta\?: \{ aiReachable\?:/.test(registry)
     && !/\.\.\.input,[\s\S]{0,80}aiReachable/.test(registry));
}

// ── 4 · THE OPERATOR'S DOOR ──────────────────────────────────────────────────
{
  const controls = read("src/app/admin/sources/source-controls.tsx");

  ok("4.1 the refusal is held as state, not thrown away as a toast",
     /setUnreachable\(\{ message: r\.error, form \}\)/.test(controls));
  ok("4.2 the second attempt sets the acknowledgement explicitly",
     /fd\.set\("acknowledgeUnreachable", "true"\)/.test(controls));

  /* ⛔ NEVER A HIDDEN INPUT. A flag rendered into the form would survive into a LATER add of
     a DIFFERENT domain — the operator would silently acknowledge something they were never
     shown. It is passed to ONE call and dies there. */
  ok("4.3 the acknowledgement is not carried in the form's DOM",
     !/name="acknowledgeUnreachable"/.test(controls));

  /* ⛔ A FRESH FormData OFF THE LIVE FORM. Re-sending the captured copy would add the host
     the refusal was raised about even if the operator corrected the typo while reading it. */
  ok("4.4 the retry re-reads the live form rather than replaying the refused payload",
     /new FormData\(unreachable\.form\)/.test(controls));
  ok("4.5 the panel clears once a source is actually added",
     /setUnreachable\(null\);/.test(controls));

  // The copy has to state that the source still WORKS, or an operator reads it as breakage.
  const words = reachabilityRefusal("bbc.com");
  ok("4.6 the sentence names the domain", words.includes("bbc.com"), words);
  ok("4.7 …and says the source still works rather than implying it is broken",
     /still work/i.test(words), words);
  ok("4.8 …and says what to do next", /add it again/i.test(words), words);
}

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
