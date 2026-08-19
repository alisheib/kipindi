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
import {
  refreshCadence, handoverPollUntil,
  AWAITING_RESULT_MS, LIVE_ROUND_MS, HANDOVER_MS, HANDOVER_GRACE_MS, HANDOVER_MAX_MS,
} from "../src/lib/refresh-cadence.ts";

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
  //
  // ⚠️ REWRITTEN 2026-08-19 (E-166), AND THE REWRITE IS THE POINT. The parse used to be
  // `/refreshCadence\(\{([\s\S]{0,220}?)\}\)/` plus `split(",")`, which assumed a short, FLAT
  // argument object. The handover arm added a nested `handover: { … }` and the regex stopped
  // matching at all — so `call` went null and this check reported the round page as UNWIRED
  // while it was wired correctly. ⛔ A guard that breaks when its subject grows is a guard that
  // will be deleted by the next person in a hurry. It now balances braces and splits at the top
  // level only, so it reads the call however the call is shaped.
  const at = round.indexOf("refreshCadence({");
  let call: string | null = null;
  if (at >= 0) {
    const from = round.indexOf("{", at);
    let depth = 0;
    for (let i = from; i < round.length; i++) {
      const ch = round[i];
      if (ch === "{" || ch === "(" || ch === "[") depth++;
      else if (ch === "}" || ch === ")" || ch === "]") {
        depth--;
        if (depth === 0) { call = round.slice(from + 1, i); break; }
      }
    }
  }
  /** Split on commas that sit at nesting depth 0 — a nested object is ONE part, not many. */
  const topLevelParts = (src: string): string[] => {
    const out: string[] = []; let depth = 0, start = 0;
    for (let i = 0; i < src.length; i++) {
      const ch = src[i];
      if (ch === "{" || ch === "(" || ch === "[") depth++;
      else if (ch === "}" || ch === ")" || ch === "]") depth--;
      else if (ch === "," && depth === 0) { out.push(src.slice(start, i)); start = i + 1; }
    }
    out.push(src.slice(start));
    return out.map((s) => s.trim()).filter(Boolean);
  };
  const bindings = new Map<string, string>();
  for (const part of topLevelParts(call ?? "")) {
    const colon = part.indexOf(":");
    // Shorthand (`{ awaitingResult }`) binds the key to the identifier of the same name.
    const key = (colon === -1 ? part : part.slice(0, colon)).trim();
    if (!key) continue;
    bindings.set(key, (colon === -1 ? key : part.slice(colon + 1)).trim());
  }
  const isLiteral = (v: string | undefined) => v == null || /^(true|false|\d+|null|undefined|["'`])/.test(v);
  ok("3.3 ⭐ …and it is asked about THIS round's state — both arguments bound, neither a literal",
    !!call && !isLiteral(bindings.get("settled")) && !isLiteral(bindings.get("awaitingResult")),
    call ? `settled=${bindings.get("settled")} awaitingResult=${bindings.get("awaitingResult")}` : "no refreshCadence({…}) call found");
  // ⛔ AND THE NEW ARM IS SUBJECT TO THE SAME LAW. `handover: { active: true, … }` is exactly the
  // `cadence-called-with-constants` mutation one level down: it would pin the page to a
  // permanent handover poll on a decided round, which is §2.2's defect wearing a new field name.
  const hv = bindings.get("handover");
  ok("3.3b ⭐ …and so is the handover arm — `active` is derived from the round, never a literal",
    hv == null || (!/active:\s*(true|false)\b/.test(hv) && /active:/.test(hv)),
    `handover=${hv?.slice(0, 90)}`);

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

console.log("\n── 5 · E-166 · the HANDOVER arm polls a settled round, and PROVABLY STOPS ──");
{
  // ⛔ THE WHOLE RISK OF THIS ARM IS THAT IT RE-CREATES THE DEFECT §2.2 EXISTS TO PREVENT.
  // `settled ⇒ enabled:false` is a rule about the low-end Android over 2G, and "poll a decided
  // round while it waits for its successor" is one careless edit away from "poll for ever".
  const SETTLED = Date.parse("2026-08-19T09:18:31.200Z");
  const OPENS = Date.parse("2026-08-19T09:23:00.000Z");

  const waiting = refreshCadence({
    settled: true, awaitingResult: false,
    handover: { active: true, untilMs: SETTLED + 60_000, nowMs: SETTLED + 1_000 },
  });
  ok("5.1 ⭐ a settled round WAITING for its successor polls again — this is the dead end Ali "
    + "reported, and it is the only reason the arm exists",
    waiting.enabled === true);
  ok("5.2 …at the result cadence, not a new number", waiting.intervalMs === HANDOVER_MS);
  ok("5.3 ⛔ and that cadence is not slower than the board's, or the wait is worse than before",
    waiting.intervalMs <= LIVE_ROUND_MS, `${waiting.intervalMs}ms`);

  // ⛔ TWO INDEPENDENT OFF SWITCHES. Either alone must stop it.
  ok("5.4 ⭐ STOPS DEAD one millisecond past the bound",
    refreshCadence({ settled: true, awaitingResult: false,
      handover: { active: true, untilMs: SETTLED + 60_000, nowMs: SETTLED + 60_001 } }).enabled === false);
  ok("5.5 ⭐ and stops the instant the caller says the handover is no longer active — a "
    + "successor in hand has nothing left to ask about",
    refreshCadence({ settled: true, awaitingResult: false,
      handover: { active: false, untilMs: SETTLED + 600_000, nowMs: SETTLED } }).enabled === false);
  ok("5.6 ⛔ exactly AT the bound is still allowed (an inclusive deadline, so a tick landing on "
    + "it is not silently dropped)",
    refreshCadence({ settled: true, awaitingResult: false,
      handover: { active: true, untilMs: SETTLED + 60_000, nowMs: SETTLED + 60_000 } }).enabled === true);
  // ⛔ THE UNCHANGED PROMISE: with no handover argument at all, a settled round is silent.
  ok("5.7 ⭐ §2.2 still holds — a settled round with no handover polls NOT AT ALL",
    refreshCadence({ settled: true, awaitingResult: false }).enabled === false);

  console.log("\n── 5b · the BOUND itself is finite on every input ──");
  // ⛔ THERE MUST BE NO INPUT THAT PRODUCES AN UNBOUNDED POLL. Enumerated, not asserted in prose.
  let unbounded = 0, tooLong = 0;
  for (const settledAtMs of [null, SETTLED, SETTLED - 3_600_000]) {
    for (const successorOpensAtMs of [null, OPENS, SETTLED - 1, SETTLED + 86_400_000]) {
      const until = handoverPollUntil({ settledAtMs, successorOpensAtMs, nowMs: SETTLED });
      if (!Number.isFinite(until)) unbounded++;
      // The ceiling is measured from the settle (or from now on a legacy row), and nothing may
      // out-run it — including a successor instant a day away.
      if (until > (settledAtMs ?? SETTLED) + HANDOVER_MAX_MS) tooLong++;
    }
  }
  ok("5b.1 ⭐ over 12 input combinations the bound is always FINITE", unbounded === 0, `${unbounded} infinite`);
  ok("5b.2 ⭐ …and never beyond the hard ceiling, however far away the successor is",
    tooLong === 0, `${tooLong} over ceiling`);
  ok("5b.3 ⭐ a KNOWN open instant bounds the poll to that instant plus a grace — not the ceiling",
    handoverPollUntil({ settledAtMs: SETTLED, successorOpensAtMs: OPENS, nowMs: SETTLED })
      === OPENS + HANDOVER_GRACE_MS);
  ok("5b.4 ⭐ an UNKNOWN one falls back to the settle plus the ceiling",
    handoverPollUntil({ settledAtMs: SETTLED, successorOpensAtMs: null, nowMs: SETTLED })
      === SETTLED + HANDOVER_MAX_MS);
  // ⛔ ANTI-CONSTANT: a different open instant must move the bound.
  ok("5b.5 ⛔ the bound FOLLOWS the instant — two successors, two deadlines",
    handoverPollUntil({ settledAtMs: SETTLED, successorOpensAtMs: OPENS, nowMs: SETTLED })
      !== handoverPollUntil({ settledAtMs: SETTLED, successorOpensAtMs: OPENS + 30_000, nowMs: SETTLED }));
  ok("5b.6 ⛔ and the ceiling is a real bound, not an hour: measured gaps reach 83 minutes and "
    + "the poll must not chase them",
    HANDOVER_MAX_MS <= 10 * 60_000, `${HANDOVER_MAX_MS}ms`);

  console.log("\n── 5c · the round page is WIRED to the bounded arm ──");
  const round = code("src/app/updown/[roundId]/page.tsx");
  ok("5c.1 ⭐ the page passes a handover to the cadence rule", /handover:\s*\{/.test(round));
  // ⛔ ASSERT WHAT THE CALL CARRIES (§5b.2). `handover: { active: true }` would satisfy 5c.1 and
  // be an unbounded poll on a decided round.
  ok("5c.2 ⭐ …bounded by the shared rule, never by a number typed on the page",
    /untilMs:\s*handoverPollUntil\(\{/.test(round));
  ok("5c.3 ⭐ and `active` is false the moment a successor is in hand",
    /active:\s*decided && round\.successor\.chainRunning && round\.successor\.roundId == null/.test(round));
  ok("5c.4 ⛔ the page's clock is the SERVER's, so the bound cannot be beaten by a fast handset",
    /nowMs:\s*round\.serverNowMs/.test(round));
}

console.log(`\n${pass} passed, ${fails.length} failed`);
if (fails.length) { for (const f of fails) console.log(`  · ${f}`); process.exit(1); }
