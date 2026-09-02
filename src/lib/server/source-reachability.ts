/**
 * CAN THE AI'S FETCHER ACTUALLY READ THIS DOMAIN? — asked when an operator ADDS or ENABLES
 * a trusted source, instead of being discovered months later while a market is settling.
 *
 * 🔴 THE DEFECT THIS CLOSES (E-254, open half). `market-sentinel.ts` pins both server tools
 * to a market's approved host with `allowed_domains`, enforced server-side by Anthropic's
 * tool service. Some sites block Anthropic's crawler, and a pin at one of them does NOT
 * degrade politely: the request is rejected at VALIDATION with
 * `400 invalid_request_error — "The following domains are not accessible to our user agent:
 * ['bbc.com']"`, in ~0.3s, before the model does anything. Probed across every host this
 * platform used at the time, `bbc.com` and `reuters.com` were blocked — and both are exactly
 * what an operator would add for a news or finance market.
 *
 * The sentinel already survives it: it catches that one error and retries UNPINNED, and the
 * citation gate still refuses to auto-seal an off-host read. So nothing is unsafe. What was
 * wrong is that the operator was never TOLD. They added a source, the console accepted it in
 * silence, and the consequence — this market can never be read directly, every check on it
 * falls back — surfaced at resolve time, to somebody else, weeks later.
 *
 * ⛔ SO THIS IS A WARNING WITH A DOOR, NOT A WALL. Refusing `bbc.com` outright would delete
 * two of the most authoritative news sources on the platform to fix a silence. The operator
 * is refused ONCE, told exactly what will happen, and may proceed deliberately — and the
 * choice is written to the audit chain either way (`source-registry.ts` records
 * `aiReachable` on `source.added`), so "we did not know" stops being available.
 *
 * ⛔ AND IT FAILS OPEN, WHICH IS THE PART MOST LIKELY TO BE "TIDIED UP" LATER. A probe that
 * cannot reach the API — no key, a network blip, a rate limit, an outage — returns `unknown`
 * and the add PROCEEDS. A source registry that silently stops accepting sources whenever
 * Anthropic is unwell is a worse failure than the one this file exists to fix, and it would
 * present as "the button does nothing".
 */
import Anthropic from "@anthropic-ai/sdk";
import { ai } from "./ai-config";

export type ReachabilityVerdict =
  /** Anthropic's fetcher can read this host — a pinned call will work. */
  | { state: "reachable" }
  /** Anthropic's fetcher is blocked by this host — a pinned call 400s and falls back. */
  | { state: "blocked"; detail: string }
  /** We could not find out. ⛔ Callers MUST treat this as permission, never as refusal. */
  | { state: "unknown"; detail: string };

/**
 * The exact validation error, matched on the words Anthropic actually returns.
 *
 * ⚠️ MATCHED ON THE SENTENCE, NOT THE STATUS CODE. A 400 from this endpoint has many other
 * causes (a malformed tool block, an unknown tool version, a bad model id), and treating all
 * of them as "this domain is blocked" would tell an operator a true-sounding thing about the
 * wrong subject — and would do it most often exactly when we had just broken the tool
 * definition ourselves. `market-sentinel.ts` keys its retry on the same sentence.
 */
export const CRAWLER_BLOCK_SIGNATURE = /not accessible to our user agent/i;

/**
 * The whole decision, as a PURE function of the error text.
 *
 * ⭐ SPLIT OUT DELIBERATELY SO IT CAN BE GUARDED WITHOUT AN API KEY. The network half cannot
 * run in CI; this half is where every classification mistake would live, so this is the half
 * `test:source-reachability` drives — including the case that matters most, an unrelated
 * failure that must NOT be reported as a blocked domain.
 */
export function classifyProbeError(message: string): ReachabilityVerdict {
  const msg = String(message ?? "");
  if (CRAWLER_BLOCK_SIGNATURE.test(msg)) {
    return { state: "blocked", detail: msg.slice(0, 300) };
  }
  return { state: "unknown", detail: msg.slice(0, 300) || "the reachability probe failed with no message" };
}

/**
 * Ask Anthropic whether a pinned call to this host would be accepted.
 *
 * ⭐ IT COSTS ALMOST NOTHING, AND THE REASON IS THE WHOLE TRICK: `allowed_domains` is
 * validated BEFORE the model is invoked, so a blocked host is refused in ~0.3s having spent
 * no tokens at all. A reachable host runs the cheapest model with `max_tokens: 1`.
 *
 * ⚠️ DELIBERATELY NOT METERED, AND THIS IS A JUDGEMENT WORTH RE-OPENING RATHER THAN AN
 * OVERSIGHT. `recordAiUsage` requires a `subjectType`, and that enum is a closed list of six
 * — market, two Up & Down kinds, two poll kinds, chat. A source probe is none of them, and
 * filing it under `market` to satisfy the type would put spend against a market that does
 * not exist: precisely the false attribution the metering design exists to prevent. Adding a
 * seventh member is the honest fix, but it ripples into `test:ai-cycles` §14's coverage
 * assertion and the admin AI-usage labels, so it is its own change. The bound being accepted
 * meanwhile is explicit: ≤1 output token of the cheapest model per source ADD or re-add, on
 * a form an operator uses a handful of times a year.
 */
export async function probeDomainReachable(domain: string): Promise<ReachabilityVerdict> {
  const host = String(domain ?? "").trim().toLowerCase();
  if (!host) return { state: "unknown", detail: "no domain given" };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { state: "unknown", detail: "no ANTHROPIC_API_KEY in this environment" };


  try {
    const client = new Anthropic({ apiKey });
    await client.messages.create({
      model: ai.triageModel,
      max_tokens: 1,
      messages: [{ role: "user", content: "ok" }],
      tools: [{
        type: ai.webFetchTool.type,
        name: ai.webFetchTool.name,
        max_uses: 1,
        allowed_domains: [host],
      } as unknown as Anthropic.Tool],
    });

    return { state: "reachable" };
  } catch (err) {
    return classifyProbeError(String((err as Error)?.message ?? ""));
  }
}

/**
 * The sentence an operator reads. Kept beside the classifier so the words and the states
 * cannot drift apart — the copy for a state that no longer exists is how a console starts
 * explaining a rule it no longer applies.
 */
export function reachabilityRefusal(domain: string): string {
  return `Anthropic's fetcher is blocked by ${domain}, so the AI can never read it directly. ` +
    `Markets naming this source still work — every check falls back to an unpinned search and ` +
    `the citation gate still refuses to auto-seal an off-host read — but they will not auto-resolve ` +
    `from this site. Add it again to confirm you want it anyway.`;
}
