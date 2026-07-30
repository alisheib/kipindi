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
  isPayoutPath,
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

console.log("\n── 6 · 🔴 THE LADDER'S BEHAVIOUR (money-safety) ────────────────");

// Drive the real adapter. `selcomDisburseEnv()` reads these.
process.env.PAYMENT_API_URL = ENV.baseUrl;
process.env.PAYMENT_API_KEY = ENV.apiKey;
process.env.PAYMENT_API_SECRET = ENV.apiSecret;
process.env.PAYMENT_VENDOR_ID = ENV.vendor;
process.env.PAYMENT_VENDOR_PIN = ENV.pin;
const { selcomAdapter } = await import("../src/lib/server/payments.ts");
const dispatch = (correlationId: string) =>
  selcomAdapter.withdraw({ provider: "MPESA", amount: 4925, msisdn: "0757619808", userId: "u1", correlationId });

/** Which rail endpoints were actually POSTed to, in order. */
const posted = (calls: string[]) =>
  calls.filter((u) => u.includes("/process") || u.includes("/cashin"))
    .map((u) => (PAYOUT_RAIL_IDS.find((r) => u.includes(PAYOUT_RAILS[r].process)) ?? "?"));

// A definitive refusal on rung 1 → the ladder ADVANCES to rung 2.
await withFetch((u) => u.includes("/walletcashin/process")
  ? jsonResp("403", 403, "API endpoint not enabled for the vendor (4035)")
  : jsonResp("000"), async (calls) => {
  const r = await dispatch("wdr_ladder_1");
  ok("a definitive 4035 on rail 1 ADVANCES to rail 2", posted(calls).join(">") === "WALLET_CASHIN>SELCOM_PESA", posted(calls).join(" > "));
  ok("…and the payout ends up ACCEPTED on the rail that took it", r.ok && r.status === "PENDING");
  ok("…tagged with the rail that actually carried it", r.ok && r.rail === "SELCOM_PESA");
  ok("…and the trail records BOTH rungs", (r.attempts ?? []).length === 2);
  ok("…rung 1 recorded as FAILED, rung 2 as ACCEPTED",
    r.attempts?.[0].outcome === "FAILED" && r.attempts?.[1].outcome === "ACCEPTED");
  // Selcom treats transid as the idempotency key — reusing one across two endpoints
  // muddles the single identifier used to ask "did this pay?".
  ok("…each rung used a DISTINCT transid", r.attempts![0].transid !== r.attempts![1].transid);
  ok("…rung 1 kept the audited correlation id", r.attempts![0].transid === "wdr_ladder_1");
  ok("…providerRef is the transid of the rail that took it", r.ok && r.providerRef === r.attempts![1].transid);
});

// 🔴 THE ONE THAT MATTERS. A timeout on rung 1 might have been taken by Selcom.
// The ladder MUST stop: trying rung 2 here pays the player twice.
await withFetch((u) => u.includes("/walletcashin/process")
  ? (() => { throw Object.assign(new Error("aborted"), { name: "AbortError" }); })()
  : jsonResp("000"), async (calls) => {
  const r = await dispatch("wdr_ladder_2");
  ok("🔴 an AMBIGUOUS rail 1 STOPS the ladder — rail 2 is never called",
    posted(calls).join(">") === "WALLET_CASHIN",
    "advancing on a timeout is a DOUBLE PAYMENT: the first rail may still be in flight");
  ok("…the payout stays PENDING so the hold is KEPT, not reversed", r.ok && r.status === "PENDING");
  ok("…and it is attributed to the rail that might hold it", r.ok && r.rail === "WALLET_CASHIN");
});

// Same rule for an HTTP error that is not a 401/403.
await withFetch((u) => u.includes("/walletcashin/process") ? jsonResp("500", 500) : jsonResp("000"), async (calls) => {
  const r = await dispatch("wdr_ladder_3");
  ok("🔴 an HTTP 500 on rail 1 also STOPS the ladder", posted(calls).join(">") === "WALLET_CASHIN");
  ok("…hold kept (PENDING), never reversed", r.ok && r.status === "PENDING");
});

// Every rung definitively refused → clean failure, so the caller returns the money.
// An honest "unavailable" beats an eternal pending with the player's balance held.
await withFetch(() => jsonResp("403", 403, "API endpoint not enabled for the vendor (4035)"), async (calls) => {
  const r = await dispatch("wdr_ladder_4");
  ok("all rails definitively refused → PROVIDER_DOWN (money returned)", !r.ok && r.reason === "PROVIDER_DOWN");
  ok("…every rung was actually tried", posted(calls).length === PAYOUT_LADDER.length);
  ok("…and the failure names each rung for an operator",
    !r.ok && PAYOUT_LADDER.every((rail) => (r.detail ?? "").includes(rail)), r.detail);
});

// Accepted on the first rail → the ladder stops immediately; no stray second call.
await withFetch(() => jsonResp("000"), async (calls) => {
  const r = await dispatch("wdr_ladder_5");
  ok("an accepted rail 1 never touches rail 2", posted(calls).join(">") === "WALLET_CASHIN");
  ok("…and reads exactly like a pre-ladder payout (correlation id preserved)",
    r.ok && r.providerRef === "wdr_ladder_5" && r.rail === "WALLET_CASHIN");
});

// The float PIN is a hard precondition — wallet-cashin cannot be signed without it.
await withFetch(() => jsonResp("000"), async (calls) => {
  const saved = process.env.PAYMENT_VENDOR_PIN;
  delete process.env.PAYMENT_VENDOR_PIN;
  const r = await dispatch("wdr_ladder_6");
  ok("no float PIN → refused BEFORE any network call", !r.ok && calls.length === 0);
  ok("…and it says which precondition failed", !r.ok && (r.detail ?? "").includes("float PIN"));
  process.env.PAYMENT_VENDOR_PIN = saved;
});

console.log("\n── 7 · The capability probe ────────────────────────────────────");

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

// ── §6 · The wire capture covers EVERY rail endpoint ─────────────────────────
// Behavioural, not structural — this one can be driven, so it is.
//
// The first implementation substring-matched "cashin", which silently excluded
// `/selcompesa/query`: no "cashin" in it. That is the precise endpoint the
// double-pay regression in §3 is about, so a Selcom Pesa payout could have gone
// wrong in the one way that costs real money with nothing in the capture to show
// it. Deriving from PAYOUT_RAILS means a rail added later cannot be missed.
console.log("\n── 6 · SELCOM_WIRE_LOG=payouts covers every rail endpoint ──");
for (const [rail, spec] of Object.entries(PAYOUT_RAILS)) {
  ok(`${rail}: process endpoint is captured`, isPayoutPath(spec.process), spec.process);
  ok(`${rail}: query endpoint is captured`, isPayoutPath(spec.query), spec.query);
}
ok("the float read is captured (a dry float looks like a refusal)", isPayoutPath("/vendor/balance"));
ok("qwiksend is captured ahead of being integrated", isPayoutPath("/qwiksend/process"));
// …and the deposit half is NOT, or "payouts" would mean nothing.
ok("deposit checkout is NOT captured in payouts mode", !isPayoutPath("/checkout/create-order-minimal"));
ok("deposit wallet-payment is NOT captured in payouts mode", !isPayoutPath("/checkout/wallet-payment"));
ok("deposit order-status is NOT captured in payouts mode", !isPayoutPath("/checkout/order-status"));

console.log(`\n──────────────────────────────────────────────────────────────`);
console.log(`  PAYOUT RAILS: ${pass} passed, ${fail} failed`);
console.log(`──────────────────────────────────────────────────────────────`);
if (fail > 0) process.exit(1);
