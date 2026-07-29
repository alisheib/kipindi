/**
 * PAYOUT OBSERVABILITY — the payout path must always be able to say what happened.
 *
 * 🔴 THE INCIDENT THIS ENCODES. On 2026-07-29 two real payouts (10,000 and 5,000
 * TZS) sat in PROCESSING. Selcom accepted both and issued references; no callback
 * ever arrived; nothing landed on the payee's handset. An hour went into guessing
 * between a dry float, a disabled product and a wrong utility code — because:
 *
 *   · `selcomWithdraw` returned a bare `{ok:true}` and DISCARDED the envelope,
 *   · `selcomVerifyCashin` returned a bare status and discarded it too,
 *   · `selcomFloatBalance` returned `null` for four different causes, so "the
 *     gateway refused our IP" was indistinguishable from "the PIN is missing",
 *   · and `Transaction.providerStatus` — the column that exists precisely to hold
 *     the gateway's answer — had NEVER been written by any code path in the repo.
 *
 * `describeSelcom()` already existed, with a header saying "a failed money movement
 * must be explainable after the fact". It was wired into the DEPOSIT path only. The
 * half that sends money to a real human was the undiagnosable half.
 *
 * These assertions are deliberately structural. The behaviour they protect can only
 * be exercised against a live gateway, so a behavioural-only suite would go green
 * while the payout path silently went blind again — which is exactly the class of
 * "passing gate over a broken thing" this repo has been bitten by three times.
 */
import { readFileSync } from "node:fs";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; console.log(`PASS ${label}${extra ? ` — ${extra}` : ""}`); }
  else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}
const read = (p: string) => readFileSync(new URL(`../src/lib/server/${p}`, import.meta.url), "utf8");
const selcom = read("selcom.ts");
const payments = read("payments.ts");
const wallet = read("wallet-service.ts");
const store = read("store.ts");
const dal = read("prisma-dal.ts");

/** Slice out one function body by its signature, up to the next top-level export. */
function bodyOf(src: string, signature: string): string {
  const start = src.indexOf(signature);
  if (start < 0) return "";
  const next = src.indexOf("\nexport ", start + signature.length);
  return src.slice(start, next < 0 ? src.length : next);
}

console.log("\n── 1 · The gateway's answer is captured, not discarded ─────────");

const withdrawFn = bodyOf(selcom, "export async function selcomWithdraw");
ok("selcomWithdraw was found", withdrawFn.length > 0);
ok("selcomWithdraw describes the reply", withdrawFn.includes("describeSelcom"));
ok("selcomWithdraw returns detail on the ACCEPTED arm too",
  /ok:\s*true,\s*detail/.test(withdrawFn),
  "'accepted' is the state that stalled — it is the most important one to explain");
ok("selcomWithdraw returns detail on every failure arm",
  (withdrawFn.match(/ok:\s*false[^}]*detail/g) ?? []).length >= 3);
ok("selcomWithdraw logs the request shape (utilitycode/amount/pin-presence)",
  withdrawFn.includes("utilitycode=") && withdrawFn.includes("pin="),
  "a wrong utility code and an empty float look identical without it");
ok("selcomWithdraw NEVER logs the pin value",
  !/pin=\$\{(env\.)?pin\}/.test(withdrawFn) && withdrawFn.includes('pin ? "set" : "MISSING"'));
ok("selcomWithdraw masks the payee number", withdrawFn.includes("maskMsisdn"));

const verifyFn = bodyOf(selcom, "export async function selcomVerifyCashin");
ok("selcomVerifyCashin returns detail", verifyFn.includes("detail"));
ok("selcomVerifyCashin explains a network failure rather than a bare null",
  verifyFn.includes("network:"));

const floatFn = bodyOf(selcom, "export async function selcomFloatBalanceDetailed");
ok("a detailed float-balance query exists", floatFn.length > 0);
for (const cause of ["float PIN not set", "network:", "HTTP error", "rejected", "unparseable"]) {
  ok(`float balance distinguishes: ${cause}`, floatFn.includes(cause));
}

console.log("\n── 2 · It reaches the caller ───────────────────────────────────");

ok("WithdrawResult carries detail on both arms",
  (bodyOf(payments, "export type WithdrawResult").match(/detail\?:\s*string/g) ?? []).length >= 2);
ok("verifyWithdrawalStatus carries detail", /verifyWithdrawalStatus[\s\S]{0,400}detail/.test(payments));
const adapterWithdraw = payments.slice(payments.indexOf("async withdraw({ provider"), payments.indexOf("// ── AUTHORITATIVE STATUS RE-QUERY"));
ok("every selcom withdraw precondition says WHICH one failed",
  (adapterWithdraw.match(/detail:/g) ?? []).length >= 5,
  "three separate causes used to collapse into one indistinguishable PROVIDER_DOWN");

console.log("\n── 3 · It is persisted, not just logged ────────────────────────");

ok("StoredTxn exposes providerStatus", /providerStatus\?:\s*string\s*\|\s*null/.test(store));
ok("the Prisma DAL maps providerStatus", /providerStatus:\s*t\.providerStatus/.test(dal));
// A log line is lost on the next deploy; the row is what an operator reads at 2am.
ok("withdraw() persists the accepted detail", /providerRef:\s*result\.providerRef[\s\S]{0,200}providerStatus/.test(wallet));
ok("withdraw() persists the detail on failure BEFORE reversing",
  /if \(!result\.ok\)[\s\S]{0,400}providerStatus[\s\S]{0,200}settleWithdrawalFailed/.test(wallet),
  "or the reason dies with the request");
ok("the fast payout lane refreshes providerStatus each pass",
  bodyOf(wallet, "export async function settleConfirmedWithdrawals").includes("providerStatus"));
ok("the stale reconcile refreshes providerStatus each sweep",
  bodyOf(wallet, "export async function reconcileStalePayments").includes("providerStatus"));

console.log("\n── 4 · A refusal must not freeze a player's money ──────────────");

// 2026-07-29: Selcom answered every wallet-cashin call with HTTP 403 "API endpoint
// not enabled for the vendor (4035)". Classified as AMBIGUOUS, that parked two real
// payouts in PROCESSING forever — a 403 never becomes terminal, so the stale sweep
// could not resolve them either, and the player's money stayed held indefinitely.
ok("a 401/403 on dispatch is DEFINITIVE, not ambiguous",
  /res\.httpStatus === 401 \|\| res\.httpStatus === 403/.test(withdrawFn) &&
  /httpStatus === 403[\s\S]{0,400}reason: "FAILED"/.test(withdrawFn),
  "refused at the door ⇒ nothing dispatched ⇒ safe to return the money");
ok("other HTTP errors stay AMBIGUOUS (a timeout may really be in flight)",
  /reason: "AMBIGUOUS"/.test(withdrawFn),
  "this must NOT generalise — reversing a live payout double-pays");
ok("a PROVIDER_DOWN tells the player the rail is down, not that they failed",
  /PROVIDER_DOWN[\s\S]{0,200}temporarily unavailable/.test(wallet));

// And the escape hatch for payouts already frozen under the old behaviour.
const actions = readFileSync(new URL("../src/app/admin/payments/payment-actions.ts", import.meta.url), "utf8");
const reverseFn = actions.slice(actions.indexOf("export async function reverseStuckPayoutAction"));
ok("an officer can release a frozen payout", reverseFn.length > 0);
ok("it only touches a PROCESSING withdrawal",
  /t\.type !== "WITHDRAWAL"/.test(reverseFn) && /t\.status !== "PROCESSING"/.test(reverseFn));
// Anchored at BOTH ends — it must re-query, branch on CONFIRMED, and bail out. The
// window only spans the audit call that sits between the branch and the return.
ok("⛔ it RE-QUERIES the provider and REFUSES on CONFIRMED",
  /verifyWithdrawalStatus[\s\S]{0,400}if \(v\.status === "CONFIRMED"\)[\s\S]{0,700}return \{ ok: false/.test(reverseFn),
  "reversing a settled payout would pay the player twice");
// …and the refusal must come BEFORE anything that could move money.
ok("the CONFIRMED refusal precedes the reversal call",
  reverseFn.indexOf('v.status === "CONFIRMED"') < reverseFn.indexOf("settleWithdrawalFailed"));
ok("it demands a typed reason", /reason\.length < 10/.test(reverseFn));
ok("it reverses through the idempotent shared path", reverseFn.includes("settleWithdrawalFailed"));
ok("it records a watched COMPLIANCE audit entry",
  /category: "COMPLIANCE"[\s\S]{0,120}payout_reversed/.test(reverseFn));
ok("a refusal is audited too, not silently swallowed",
  /payout_reverse_refused/.test(reverseFn));

console.log("\n── 5 · No credential can leak through the new detail ───────────");

// describeSelcom is the ONLY thing allowed to render a gateway reply, and it must
// never widen to the request body (which carries the float PIN).
const describeFn = bodyOf(selcom, "export function describeSelcom");
ok("describeSelcom renders only status/resultcode/result/message",
  describeFn.includes("resultcode") && describeFn.includes("message") &&
  !describeFn.includes("pin") && !describeFn.includes("apiSecret") && !describeFn.includes("apiKey"));
ok("describeSelcom truncates the message", describeFn.includes("slice(0, 200)"));
ok("persisted detail is length-capped", (wallet.match(/slice\(0,\s*500\)/g) ?? []).length >= 4);

console.log(`\n${"─".repeat(64)}\n  PAYOUT OBSERVABILITY: ${pass} passed, ${fail} failed\n${"─".repeat(64)}`);
process.exit(fail === 0 ? 0 : 1);
