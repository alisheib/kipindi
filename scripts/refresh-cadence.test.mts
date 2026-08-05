/**
 * E-102 · A RESULT THAT ARRIVES MUST ARRIVE ON THE SCREEN.
 *
 *   npm run test:refresh-cadence
 *
 * ⛔ EVERY CHECK HERE MUST FAIL IF THE FEATURE IS DELETED. The behaviour before this shipped is
 * "the round page has no poller at all", so §3.1 must break the moment the `<RefreshPoller>` is
 * removed from `/updown/[roundId]`, and §1/§2 must break if the cadence collapses to a constant.
 *
 * ⚠️ §3 IS SOURCE-LEVEL BECAUSE THE THING IT GUARDS IS A `setInterval` INSIDE A CLIENT
 * COMPONENT, which no node suite can drive. That is exactly why the DECISION was extracted into
 * `refreshCadence()` — the part worth guarding is the rule, and the rule is pure. The wiring
 * checks below assert the call site, never the symbol (standards §5b.1): `RefreshPoller` is
 * mentioned in 8 files legitimately, so a grep for the name would be green on a broken page.
 */
import { readFileSync } from "node:fs";
import { refreshCadence, AWAITING_RESULT_MS, LIVE_ROUND_MS } from "../src/lib/refresh-cadence.ts";

let pass = 0; const fails: string[] = [];
function ok(name: string, cond: boolean, detail = "") {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
}
const read = (p: string) => { try { return readFileSync(p, "utf8"); } catch { return ""; } };
const code = (p: string) => read(p).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

console.log("\n── 1 · while a result is landing, the page asks OFTEN ──");
{
  const c = refreshCadence({ settled: false, awaitingResult: true });
  ok("1.1 ⭐ it polls", c.enabled === true);
  ok("1.2 ⭐ and FASTER than the board's 20s — the result lands ~92s after the boundary and the player is watching",
    c.intervalMs < LIVE_ROUND_MS, `${c.intervalMs}ms vs ${LIVE_ROUND_MS}ms`);
  ok("1.3 …but not so fast it becomes a hammer (≥ 2s)", c.intervalMs >= 2_000, `${c.intervalMs}ms`);
  ok("1.4 the constant is the one the page uses", c.intervalMs === AWAITING_RESULT_MS);
}

console.log("\n── 2 · open / locked matches the board, and a DECIDED round stops entirely ──");
{
  const live = refreshCadence({ settled: false, awaitingResult: false });
  ok("2.1 a live round polls at the board's cadence, so two views never disagree about freshness",
    live.enabled === true && live.intervalMs === LIVE_ROUND_MS, `${live.intervalMs}ms`);
  const done = refreshCadence({ settled: true, awaitingResult: false });
  // ⛔ THE POINT OF A RULE RATHER THAN A CONSTANT. Outcome, proof and payout are final; polling
  // a decided round forever is pure waste on the low-end Android over 2G the standards bar names.
  ok("2.2 ⭐ a SETTLED round stops polling — nothing about it can change again", done.enabled === false);
  const both = refreshCadence({ settled: true, awaitingResult: true });
  ok("2.3 settled wins over awaiting, so a caller deriving both independently cannot poll forever",
    both.enabled === false);
}

console.log("\n── 3 · the round page is WIRED to it (the defect was that it had no poller at all) ──");
{
  const round = code("src/app/updown/[roundId]/page.tsx");
  ok("3.1 ⭐ /updown/[roundId] renders a RefreshPoller — it rendered NONE before E-102",
    /<RefreshPoller/.test(round), "no <RefreshPoller> on the round page");
  ok("3.2 …driven by the rule, not by a hardcoded number",
    /refreshCadence\(/.test(round), "no refreshCadence( call on the round page");
  // ⛔ ASSERT WHAT THE CALL CARRIES, NOT THAT THE WORDS APPEAR (standards §5b.2).
  //
  // 🔴 THE FIRST VERSION OF THIS CHECK WAS ITSELF THE TRAP IT GUARDS AGAINST. It asked whether
  // the argument object mentioned `settled` and `awaiting` — and `{ settled: false,
  // awaitingResult: false }` mentions both. `red:refresh-cadence` caught it: the
  // `cadence-called-with-constants` mutation pinned every round to one cadence and the suite
  // reported 16 passed, 0 failed. A check that cannot fail is not a check.
  //
  // So: parse the object and assert each value is BOUND TO SOMETHING, never a literal.
  const call = /refreshCadence\(\{([\s\S]{0,220}?)\}\)/.exec(round);
  const bindings = new Map<string, string>();
  for (const part of (call?.[1] ?? "").split(",")) {
    const [rawKey, rawVal] = part.split(":");
    const key = (rawKey ?? "").trim();
    if (!key) continue;
    // Shorthand (`{ awaitingResult }`) binds the key to the identifier of the same name.
    bindings.set(key, (rawVal ?? key).trim());
  }
  const isLiteral = (v: string | undefined) => v == null || /^(true|false|\d+|null|undefined|["'`])/.test(v);
  ok("3.3 ⭐ …and it is asked about THIS round's state — both arguments bound, neither a literal",
    !!call && !isLiteral(bindings.get("settled")) && !isLiteral(bindings.get("awaitingResult")),
    call ? `settled=${bindings.get("settled")} awaitingResult=${bindings.get("awaitingResult")}` : "no refreshCadence({…}) call found");

  const poller = code("src/components/ui/refresh-poller.tsx");
  ok("3.4 the kit poller accepts `enabled`", /enabled/.test(poller), "RefreshPoller has no `enabled` prop");
  // ⛔ "Accepts it" is not "honours it". Assert the early return, in statement position.
  ok("3.5 ⭐ …and HONOURS it by registering no interval at all, not by polling slowly",
    /if\s*\(\s*!enabled\s*\)\s*return/.test(poller),
    "no `if (!enabled) return` guard inside the effect");
}

console.log("\n── 4 · the surfaces that already refreshed still do (do not 'fix' what works) ──");
{
  // ⚠️ Ali's report said the long-form market page does not refresh. It DOES — 15s, force-dynamic
  // — and it was verified live rather than accepted or 'fixed'. This check exists so a future
  // edit cannot quietly remove the thing that made half the report wrong.
  const market = code("src/app/markets/[id]/page.tsx");
  ok("4.1 /markets/[id] still polls", /<RefreshPoller/.test(market));
  ok("4.2 …and is force-dynamic, so a refresh actually re-reads", /export const dynamic = "force-dynamic"/.test(market));
  const board = code("src/app/updown/page.tsx");
  ok("4.3 the Up & Down board still polls", /<RefreshPoller/.test(board));
  const roundSrc = code("src/app/updown/[roundId]/page.tsx");
  ok("4.4 the round page is force-dynamic, or a refresh would return the same cached tree",
    /export const dynamic = "force-dynamic"/.test(roundSrc));
}

console.log(`\n${pass} passed, ${fails.length} failed`);
if (fails.length) { for (const f of fails) console.log(`  · ${f}`); process.exit(1); }
