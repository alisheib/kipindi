/**
 * PAYOUT RAILS — the fallback ladder, and the double-payment it exists to avoid.
 *
 * Two things are proven here, and the second one is the reason this file exists.
 *
 * 1 · THE LADDER ADVANCES ONLY ON A DEFINITIVE REFUSAL.
 *     A payout that is refused at the door (401/403, or a hard-fail resultcode) cannot
 *     be in flight, so trying the next rail is safe. A payout that timed out, or died
 *     on a network error, or came back 502 MIGHT have been taken — trying another rail
 *     there pays the player twice. The ladder must stop dead on AMBIGUOUS. That single
 *     rule is the difference between a fallback and a duplicate disbursement.
 *
 * 2 · A PAYOUT IS RE-QUERIED ON THE RAIL IT ACTUALLY WENT OUT ON.
 *     Each Selcom rail's status endpoint only knows its own transids. Ask
 *     /walletcashin/query about a payout sent through /selcompesa/cashin and you get an
 *     envelope for a transaction it has never heard of; any resultcode outside
 *     000/111/927/999 resolves to FAILED; the stale reconcile sweep treats FAILED as
 *     "definitively did not happen" and refunds the player. The money is already gone.
 *     A double payment caused by nothing but asking the wrong endpoint.
 *
 * Pure functions + a stubbed `fetch`. No DB, no network.
 */
import {
  PAYOUT_RAILS,
  PAYOUT_RAIL_IDS,
  isPayoutRail,
  railOf,
  selcomPayout,
  selcomVerifyPayout,
  selcomProbeRail,
  type PayoutRail,
} from "../src/lib/server/selcom.ts";
import { PAYOUT_LADDER } from "../src/lib/server/payments.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  if (cond) { pass++; console.log(`PASS ${label}${extra ? ` — ${extra}` : ""}`); }
  else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
};

const ENV = { baseUrl: "https://apigw.selcommobile.com/v1", apiKey: "k", apiSecret: "s", vendor: "SW00212780", pin: "1234", timeoutMs: 5_000 };

function jsonResp(resultcode: string, httpStatus = 200, message = "stub") {
  return new Response(JSON.stringify({ resultcode, result: resultcode === "000" ? "SUCCESS" : "FAIL", message, data: [] }), {
    status: httpStatus, headers: { "content-type": "application/json" },
  });
}

/** Swap `fetch`, recording every URL the code under test actually called. */
async function withFetch(
  handler: (url: string, method: string, init?: RequestInit) => Promise<Response> | Response,
  fn: (calls: string[]) => Promise<void>,
) {
  const real = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
    calls.push(String(url));
    return handler(String(url), init?.method ?? "GET", init);
  }) as typeof fetch;
  try { await fn(calls); } finally { globalThis.fetch = real; }
}

console.log("\n── 1 · The rail table is complete and self-consistent ──────────");

for (const rail of PAYOUT_RAIL_IDS) {
  const spec = PAYOUT_RAILS[rail];
  ok(`${rail}: has a process endpoint`, !!spec.process && spec.process.startsWith("/"));
  ok(`${rail}: has its OWN query endpoint`, !!spec.query && spec.query.startsWith("/"));
  ok(`${rail}: builds a body with a transid`, "transid" in spec.body(ENV, { transid: "t", amount: 1000, msisdn: "0712345678" }));
}
// Distinct query endpoints are the whole premise: if two rails shared one, the rail
// column would be decorative and the wrong-endpoint bug would still be live.
const queries = PAYOUT_RAIL_IDS.map((r) => PAYOUT_RAILS[r].query);
ok("every rail has a DISTINCT query endpoint", new Set(queries).size === queries.length, queries.join(" · "));

// Key insertion order IS the Signed-Fields order — reordering after signing is a 401.
const wcBody = PAYOUT_RAILS.WALLET_CASHIN.body(ENV, { transid: "t", amount: 1000, msisdn: "0712345678", utilityCode: "VMCASHIN" });
ok("WALLET_CASHIN field order matches the API reference",
  Object.keys(wcBody).join(",") === "transid,utilitycode,utilityref,amount,vendor,pin");
ok("WALLET_CASHIN utilityref is the PAYEE, normalised to 255…", wcBody.utilityref === "255712345678");
ok("WALLET_CASHIN carries the per-MNO utility code", wcBody.utilitycode === "VMCASHIN");

const spBody = PAYOUT_RAILS.SELCOM_PESA.body(ENV, { transid: "t", amount: 1000, msisdn: "0712345678" });
ok("SELCOM_PESA field order matches the API reference sample",
  Object.keys(spBody).join(",") === "transid,utilityref,amount,vendor,pin");

const hdBody = PAYOUT_RAILS.HUDUMA_AGENT.body(ENV, { transid: "t", amount: 1000, msisdn: "0712345678", name: "Jane Doe" });
ok("HUDUMA_AGENT field order matches the API reference",
  Object.keys(hdBody).join(",") === "transid,utilitycode,utilityref,amount,vendor,pin,name");
ok("HUDUMA_AGENT sends the static HUDUMACI code", hdBody.utilitycode === "HUDUMACI");
// An optional field must be ABSENT, not empty — an empty value still joins
// Signed-Fields and changes the signature.
ok("HUDUMA_AGENT omits `name` entirely when unknown",
  !("name" in PAYOUT_RAILS.HUDUMA_AGENT.body(ENV, { transid: "t", amount: 1000, msisdn: "0712345678" })));

ok("amounts are whole TZS, never cents", PAYOUT_RAILS.WALLET_CASHIN.body(ENV, { transid: "t", amount: 4924.6, msisdn: "0712345678" }).amount === 4925);
// The PIN must reach the wire but never a log — asserted here at the body level and
// in payout-observability at the log level.
ok("the float PIN is sent in the body", wcBody.pin === "1234");

console.log("\n── 2 · railOf() — legacy rows resolve to the rail that ran ─────");

ok("null → WALLET_CASHIN", railOf(null) === "WALLET_CASHIN");
ok("undefined → WALLET_CASHIN", railOf(undefined) === "WALLET_CASHIN");
ok("garbage → WALLET_CASHIN (never throws on a money path)", railOf("NONSENSE") === "WALLET_CASHIN");
ok("a real rail passes through", railOf("SELCOM_PESA") === "SELCOM_PESA");
ok("isPayoutRail rejects a non-rail", !isPayoutRail("QWIKSEND") && isPayoutRail("HUDUMA_AGENT"));

console.log("\n── 3 · 🔴 THE DOUBLE-PAY REGRESSION ────────────────────────────");

// Settle a payout that went out on SELCOM_PESA. The re-query MUST hit
// /selcompesa/query. If it ever hits /walletcashin/query again, that endpoint answers
// about a transid it has never seen, the verdict resolves to FAILED, and
// reconcileStalePayments refunds a player whose money has already left the float.
await withFetch(() => jsonResp("000"), async (calls) => {
  await selcomVerifyPayout(ENV, "SELCOM_PESA", "wdr_pesa_1");
  ok("a SELCOM_PESA payout is re-queried on /selcompesa/query",
    calls.some((u) => u.includes("/selcompesa/query")),
    calls.join(" · "));
  ok("…and NEVER on /walletcashin/query",
    !calls.some((u) => u.includes("/walletcashin/query")),
    "asking the wrong rail returns a stranger's envelope → FAILED → refund on top of a completed payout");
});

await withFetch(() => jsonResp("000"), async (calls) => {
  await selcomVerifyPayout(ENV, "HUDUMA_AGENT", "wdr_huduma_1");
  ok("a HUDUMA_AGENT payout is re-queried on /hudumacashin/query",
    calls.some((u) => u.includes("/hudumacashin/query")) && !calls.some((u) => u.includes("/walletcashin/query")));
});

// The legacy default must still work: a row with no rail is a wallet-cashin payout.
await withFetch(() => jsonResp("000"), async (calls) => {
  await selcomVerifyPayout(ENV, railOf(null), "wdr_legacy_1");
  ok("a legacy payout (no rail stored) still re-queries /walletcashin/query",
    calls.some((u) => u.includes("/walletcashin/query")));
});

console.log("\n── 4 · The verdict taxonomy is identical on every rail ─────────");

// The AMBIGUOUS-vs-FAILED distinction is what makes the ladder safe. It must not be
// something only the original rail happens to get right.
for (const rail of PAYOUT_RAIL_IDS) {
  await withFetch(() => { throw Object.assign(new Error("aborted"), { name: "AbortError" }); }, async () => {
    const r = await selcomPayout(ENV, rail, { transid: "t", amount: 1000, msisdn: "0712345678", utilityCode: "VMCASHIN" });
    ok(`${rail}: timeout → AMBIGUOUS (never reverse)`, !r.ok && r.reason === "AMBIGUOUS");
  });
  await withFetch(() => jsonResp("403", 403, "API endpoint not enabled for the vendor (4035)"), async () => {
    const r = await selcomPayout(ENV, rail, { transid: "t", amount: 1000, msisdn: "0712345678", utilityCode: "VMCASHIN" });
    ok(`${rail}: 403/4035 → FAILED (refused at the door)`, !r.ok && r.reason === "FAILED");
    ok(`${rail}: the 4035 reason survives for diagnosis`, !r.ok && r.detail.includes("4035"));
  });
  await withFetch(() => jsonResp("500", 500), async () => {
    const r = await selcomPayout(ENV, rail, { transid: "t", amount: 1000, msisdn: "0712345678", utilityCode: "VMCASHIN" });
    ok(`${rail}: HTTP 500 → AMBIGUOUS (may be in flight)`, !r.ok && r.reason === "AMBIGUOUS");
  });
  await withFetch(() => jsonResp("999", 200, "No reponse from upstream system"), async () => {
    const r = await selcomPayout(ENV, rail, { transid: "t", amount: 1000, msisdn: "0712345678", utilityCode: "VMCASHIN" });
    ok(`${rail}: 999 AMBIGUOUS envelope → ACCEPTED, hold kept`, r.ok);
  });
  await withFetch(() => jsonResp("010", 200, "Invalid mobile number or operator not supported"), async () => {
    const r = await selcomPayout(ENV, rail, { transid: "t", amount: 1000, msisdn: "0712345678", utilityCode: "VMCASHIN" });
    ok(`${rail}: 010 → FAILED (definitive, safe to advance)`, !r.ok && r.reason === "FAILED");
  });
}

// Each rail must post to ITS OWN endpoint, or the ladder is three names for one call.
for (const rail of PAYOUT_RAIL_IDS) {
  await withFetch(() => jsonResp("000"), async (calls) => {
    await selcomPayout(ENV, rail, { transid: "t", amount: 1000, msisdn: "0712345678", utilityCode: "VMCASHIN" });
    ok(`${rail}: posts to ${PAYOUT_RAILS[rail].process}`, calls.some((u) => u.includes(PAYOUT_RAILS[rail].process)));
  });
}

console.log("\n── 5 · The ladder's shape ──────────────────────────────────────");

ok("the ladder is not empty", PAYOUT_LADDER.length > 0);
ok("every rung is a real rail", PAYOUT_LADDER.every((r) => isPayoutRail(r)));
ok("no rung is repeated", new Set(PAYOUT_LADDER).size === PAYOUT_LADDER.length);
ok("WALLET_CASHIN leads (the destination the player actually chose)", PAYOUT_LADDER[0] === "WALLET_CASHIN");
// 🔴 Huduma pays CASH at an agent the player must travel to. Auto-switching someone
// who is waiting for an M-Pesa SMS into a trip across town is not a fallback, it is a
// different product. It stays implemented, probe-checked and operator-dispatchable —
// but out of the automatic ladder until there is a consent step.
ok("HUDUMA_AGENT is NOT in the automatic ladder",
  !PAYOUT_LADDER.includes("HUDUMA_AGENT" as PayoutRail),
  "cash-at-an-agent must never be substituted for mobile money behind the player's back");

console.log("\n── 6 · The capability probe ────────────────────────────────────");

await withFetch(() => jsonResp("403", 403, "API endpoint not enabled for the vendor (4035)"), async () => {
  const p = await selcomProbeRail(ENV, "SELCOM_PESA");
  ok("403/4035 → NOT_ENABLED", p.verdict === "NOT_ENABLED");
});
await withFetch(() => jsonResp("999", 200, "No reponse from upstream system"), async () => {
  const p = await selcomProbeRail(ENV, "WALLET_CASHIN");
  ok("a 200 envelope → ENABLED (even 999/not-found)", p.verdict === "ENABLED",
    "the endpoint engaged with us on its merits — that is all 'enabled' has to mean");
});
await withFetch(() => { throw Object.assign(new Error("aborted"), { name: "AbortError" }); }, async () => {
  const p = await selcomProbeRail(ENV, "WALLET_CASHIN");
  ok("a timeout → UNKNOWN, never NOT_ENABLED", p.verdict === "UNKNOWN",
    "one bad minute must not permanently disable a working rail");
});
// The probe must stay money-free: a status query and nothing else.
await withFetch(() => jsonResp("000"), async (calls) => {
  await selcomProbeRail(ENV, "WALLET_CASHIN");
  ok("the probe never touches a /process or /cashin endpoint",
    calls.every((u) => !u.includes("/process") && !u.includes("/cashin")),
    calls.join(" · "));
});

console.log(`\n──────────────────────────────────────────────────────────────`);
console.log(`  PAYOUT RAILS: ${pass} passed, ${fail} failed`);
console.log(`──────────────────────────────────────────────────────────────`);
if (fail > 0) process.exit(1);
