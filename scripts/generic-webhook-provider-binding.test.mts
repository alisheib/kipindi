/** A generic HMAC must never authorize settlement of an unbound transaction. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const routePath = new URL("../src/app/api/webhooks/payments/route.ts", import.meta.url);
const route = process.argv.includes("--prove-red")
  ? execFileSync("git", ["show", "fcf646a42:src/app/api/webhooks/payments/route.ts"], { cwd: fileURLToPath(new URL("..", import.meta.url)), encoding: "utf8" })
  : readFileSync(routePath, "utf8").replaceAll("\r\n", "\n");
const start = route.indexOf("export async function POST");
const end = route.indexOf("/**\n * Selcom callback handler", start);
assert(start >= 0 && end > start, "generic route source must be found");
const source = route.slice(start, end).replace("export async function", "async function");

async function callback(provider: string, reference: string, status: string, signed = true) {
  let settlements = 0;
  let dedicated = 0;
  const auditActions: string[] = [];
  const bindings = {
    NextResponse: { json: (body: Record<string, unknown>, opts?: { status?: number }) => ({ body, httpStatus: opts?.status ?? 200 }) },
    verifyWebhookSignature: ({ signatureHex }: { signatureHex: string }) => ({ valid: signatureHex === "valid", reason: "bad-signature" }),
    audit: ({ action }: { action: string }) => { auditActions.push(action); },
    normalizeStatus: (raw: unknown) => ["COMPLETED", "CONFIRMED"].includes(String(raw)) ? "CONFIRMED" : String(raw) === "FAILED" ? "FAILED" : null,
    settlePaymentWebhook: async () => { settlements++; return { handled: true, reason: "settled" }; },
    handleSelcomCallback: async () => { dedicated++; return { body: { ok: true }, httpStatus: 200 }; },
    AUTHORITATIVE_ONLY: new Set(["selcom"]),
    KNOWN_PROVIDERS: { azampay: "AZAMPAY_WEBHOOK_SECRET", mixx: "MIXX_WEBHOOK_SECRET" },
    db: { txn: { findByProviderRef: async (ref: string) => ref === reference
      ? { id: "txn_1", type: reference.startsWith("wdr") ? "WITHDRAWAL" : "DEPOSIT", provider: "MPESA", providerRef: ref, payoutRail: reference.startsWith("wdr") ? "WALLET_CASHIN" : null }
      : null } },
  };
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const post = new Function(...Object.keys(bindings), `${js}\nreturn POST;`)(...Object.values(bindings)) as (req: Request) => Promise<{ body: Record<string, unknown>; httpStatus: number }>;
  const req = new Request("https://example.test/api/webhooks/payments", {
    method: "POST",
    headers: provider === "selcom"
      ? { authorization: "SELCOM test" }
      : { "x-provider": provider, "x-signature": signed ? "valid" : "invalid", "x-timestamp": "test" },
    body: JSON.stringify({ reference, status, amount: 1000 }),
  });
  const result = await post(req);
  return { result, settlements, dedicated, auditActions };
}

const selcomPayout = await callback("azampay", "wdr_selcom_ref", "FAILED");
const unboundDeposit = await callback("mixx", "dep_generic_unbound", "COMPLETED");
if (process.argv.includes("--prove-red")) {
  assert.equal(selcomPayout.settlements, 1, "old generic lane must reproduce cross-provider payout refund authority");
  assert.equal(unboundDeposit.settlements, 1, "old generic lane must reproduce unbound deposit credit authority");
  console.log("pre-fix generic lane reproduced cross-provider and unbound settlement");
  process.exit(0);
}
for (const [name, x] of [["Selcom payout", selcomPayout], ["unbound generic deposit", unboundDeposit]] as const) {
  assert.equal(x.settlements, 0, `${name} settled from an unbound generic callback`);
  assert.equal(x.result.body.reason, "provider-unbound", `${name} was not explicitly held for provider binding`);
  assert(x.auditActions.includes("webhook.payment.rejected"), `${name} refusal needs an audit trail`);
}
const unsigned = await callback("azampay", "wdr_selcom_ref", "FAILED", false);
assert.equal(unsigned.result.httpStatus, 401, "invalid generic signature must still be rejected first");
assert.equal(unsigned.settlements, 0);
const dedicated = await callback("selcom", "wdr_selcom_ref", "FAILED");
assert.equal(dedicated.dedicated, 1, "Selcom must still use its dedicated signed callback handler");
assert.equal(dedicated.settlements, 0);
console.log("generic webhook provider binding: cross-provider, unbound, signature, and dedicated controls passed");
