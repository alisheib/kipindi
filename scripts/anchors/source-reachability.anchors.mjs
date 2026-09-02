/**
 * RED anchors for `npm run test:source-reachability` (E-254, open half).
 *
 * ⛔ EVERY CASE MUST MAKE THE SUITE EXIT NON-ZERO *AND* PRINT ITS OWN `FAIL <expect>` LINE.
 * "The file changed" is not a RED, and neither is "something went red".
 *
 * ⭐ THE TWO THAT MATTER MOST ARE NOT ABOUT DOMAINS AT ALL:
 * `fails-closed` (an outage stops the console accepting ANY source, and presents as a dead
 * button) and `believes-the-client` (the audit chain records "blocked" about a host nobody
 * measured, because a form field said so). Both are silent, and both are the shape this
 * repo keeps re-finding: an instrument that is green while measuring the wrong thing.
 */

const PROBE = "src/lib/server/source-reachability.ts";
const ACTION = "src/app/admin/sources/actions.ts";
const REGISTRY = "src/lib/server/source-registry.ts";
const CONTROLS = "src/app/admin/sources/source-controls.tsx";

export const MUTATIONS = [
  {
    name: "🔴 the classifier calls EVERY failure a blocked domain (our own bug reported as the site's)",
    file: PROBE,
    expect: "1.3 an UNRELATED 400 is NOT reported as a blocked domain",
    from: `  if (CRAWLER_BLOCK_SIGNATURE.test(msg)) {`,
    to: `  if (msg.length >= 0) {`,
  },
  {
    name: "⭐ POSITIVE CONTROL · the classifier can never report a blocked domain (a dead feature that looks healthy)",
    file: PROBE,
    expect: "1.1 the real Anthropic refusal classifies as BLOCKED",
    from: `    return { state: "blocked", detail: msg.slice(0, 300) };`,
    to: `    return { state: "unknown", detail: msg.slice(0, 300) };`,
  },
  {
    name: "🔴 THE PROBE FAILS CLOSED — no API key now REFUSES, so an outage silently stops all source adds",
    file: PROBE,
    expect: "2.1 with no API key the probe returns UNKNOWN, never blocked",
    from: `  if (!apiKey) return { state: "unknown", detail: "no ANTHROPIC_API_KEY in this environment" };`,
    to: `  if (!apiKey) return { state: "blocked", detail: "no ANTHROPIC_API_KEY in this environment" };`,
  },
  {
    name: "🔴 `unknown` starts refusing too — the fail-open direction inverted at the CALLER",
    file: ACTION,
    expect: "2.3 the action refuses ONLY on `blocked`",
    from: `  if (!acknowledged && reach.state === "blocked") {`,
    to: `  if (!acknowledged && reach.state !== "reachable") {`,
  },
  {
    name: "🔴 BELIEVES THE CLIENT — the acknowledgement short-circuits the probe and is recorded as a measurement",
    file: ACTION,
    expect: "3.1 the probe runs unconditionally, not only when unacknowledged",
    from: `  const reach = await probeDomainReachable(domain);`,
    to: `  const reach = acknowledged ? ({ state: "blocked" } as const) : await probeDomainReachable(domain);`,
  },
  {
    name: "🔴 the audit always records 'not acknowledged', so a deliberate choice reads as an oversight",
    file: REGISTRY,
    expect: "3.5 the audit records what was MEASURED and what was CHOSEN, separately",
    from: `      acknowledgedUnreachable: meta?.acknowledgedUnreachable ?? false,`,
    to: `      acknowledgedUnreachable: false,`,
  },
  {
    name: "🔴 THE ONE THAT SHIPPED — the probe goes back to the triage model, which cannot hold web_fetch, so EVERY domain returns unknown and nothing is ever refused",
    file: PROBE,
    expect: "2b.1 the probe does NOT use the triage model, which cannot hold a server tool",
    from: `      model: ai.model,`,
    to: `      model: ai.triageModel,`,
  },
  {
    name: "🔴 a permanent `unknown` goes silent again, so a dead check is indistinguishable from an outage",
    file: PROBE,
    expect: "2b.5 an `unknown` is announced rather than swallowed",
    from: `      console.warn(\`[source-reachability] could not determine whether \${host} is fetchable — ADDING PROCEEDS. \${v.detail}\`);`,
    to: `      void v;`,
  },
  {
    name: "🔴 the acknowledgement becomes a hidden input, so it survives into a LATER add of a different domain",
    file: CONTROLS,
    expect: "4.3 the acknowledgement is not carried in the form's DOM",
    from: `            <Button type="button" variant="ghost" size="sm" onClick={() => setUnreachable(null)}>`,
    to: `            <input type="hidden" name="acknowledgeUnreachable" value="true" />
            <Button type="button" variant="ghost" size="sm" onClick={() => setUnreachable(null)}>`,
  },
  {
    name: "🔴 the retry replays the REFUSED payload instead of re-reading the form the operator just corrected",
    file: CONTROLS,
    expect: "4.4 the retry re-reads the live form rather than replaying the refused payload",
    from: `                const fd = new FormData(unreachable.form);`,
    to: `                const fd = new FormData(unreachable.form.ownerDocument.createElement("form"));`,
  },
];
