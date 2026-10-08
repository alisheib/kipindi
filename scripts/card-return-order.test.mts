/**
 * test:card-return-order — a card payer comes back to the deposit THEY made (MONEY-GATE §3.2; the Vodacom plan §2, S9).
 *
 *   npm run test:card-return-order   (in test:all)
 *   npm run red:card-return-order    (--prove-red: wrong helpers and wrong call sites are planted IN MEMORY and must be caught)
 *
 * Selcom returns the buyer from its hosted card page to our `redirect_url` with only `payment_status` and `transid`
 * appended, so the order id must already be inside the URL we hand it. Until 2026-10-09 it was not: a payer who had
 * just been charged read "We couldn't find that payment", while every test passed against a test gateway that
 * appended an `order_id` of its own.
 *
 *   §1 `withOrderId`: the id lands in the redirect and the cancel URL, replaces a stale one, keeps `cancelled=1`.
 *   §2 `cardReturnOrderId`: the page's reading — plain, after a gateway's second `?`, absent, padded, over-long.
 *   §3 the REAL `selcomCardCheckout`, its request captured: redirect_url and cancel_url decode to our URLs WITH the id.
 *   §4 the whole return leg on the in-memory store: the REAL `deposit()` through the REAL Selcom adapter to a gateway
 *      that behaves as Selcom does (in process, no port), back on the URL Selcom would build, read by the page's own
 *      reading, settled by the REAL `settleDepositFromReturn`: paid once and credited once; the cancel leg finds its
 *      order too; and the control — the same URL without our id — finds nothing, as production did.
 *   §5 the call sites, read from the source: selcom.ts seeds BOTH urls through the helper, the page reads through the
 *      helper, and the shared test gateway appends no `order_id` of its own (the July blind spot, pinned).
 *
 * ⛔ IN-PROCESS: no file is written. The red plants wrong helpers (§1, §2) and mutated source (§5); §3 and §4 run the
 * real code, and their red is the control run on the parent tree recorded in the Vodacom plan §0.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { decomment } from "./lib/decomment.mts";
import * as CR from "../src/lib/wallet/card-return.ts";
import { selcomCardCheckout, type SelcomEnv } from "../src/lib/server/selcom.ts";
import { db } from "../src/lib/server/store.ts";
import { deposit, settleDepositFromReturn } from "../src/lib/server/wallet-service.ts";
import { setPaymentControls } from "../src/lib/server/payment-control.ts";

const PROVE_RED = process.argv.includes("--prove-red");
const ROOT = join(import.meta.dirname, "..");
const read = (p: string) => decomment(readFileSync(join(ROOT, p), "utf8"));

type Impl = {
  seed: typeof CR.withOrderId;
  readId: typeof CR.cardReturnOrderId;
  selcomSrc: string;
  pageSrc: string;
  stubSrc: string;
};
const REAL: Impl = {
  seed: CR.withOrderId,
  readId: CR.cardReturnOrderId,
  selcomSrc: read("src/lib/server/selcom.ts"),
  pageSrc: read("src/app/wallet/deposit/return/page.tsx"),
  stubSrc: read("scripts/selcom-stub-gateway.mjs"),
};

const RET = "https://www.50pick.tz/wallet/deposit/return";

/** The pure checks and the call sites — what a plant can reach. Returns the failed check labels. */
function runPlantable(impl: Impl, log: (l: string) => void): string[] {
  const failed: string[] = [];
  const ok = (label: string, cond: boolean, extra = "") => {
    if (!cond) failed.push(label);
    log(`${cond ? "PASS" : "FAIL"} ${label}${!cond && extra ? ` — ${extra}` : ""}`);
  };

  // ── §1 withOrderId ──────────────────────────────────────────────────────────
  const r1 = impl.seed(RET, "dep_abc123");
  ok("1.1 the bare return URL gains our order id", r1 === `${RET}?order_id=dep_abc123`, r1);
  const r2 = impl.seed(`${RET}?cancelled=1`, "dep_abc123");
  ok("1.2 the cancel URL keeps its own marker and gains the id", r2 === `${RET}?cancelled=1&order_id=dep_abc123`, r2);
  const r3 = impl.seed(`${RET}?order_id=dep_OLD`, "dep_abc123");
  ok("1.3 a stale order id is replaced, never doubled",
    new URL(r3).searchParams.getAll("order_id").join(",") === "dep_abc123", r3);
  const r4 = impl.seed("/wallet/deposit/return", "dep_abc123");
  ok("1.4 a relative URL (a configuration fault) still carries the id", r4 === "/wallet/deposit/return?order_id=dep_abc123", r4);
  const r5 = impl.seed(RET, "dep a&b");
  ok("1.5 the id is URL-encoded and reads back whole", new URL(r5).searchParams.get("order_id") === "dep a&b", r5);

  // ── §2 cardReturnOrderId ────────────────────────────────────────────────────
  const id = (raw: string | null | undefined) => impl.readId(raw);
  ok("2.1 a plain id reads back as itself", id("dep_abc123") === "dep_abc123");
  ok("2.2 a gateway's second `?` is cut off the id",
    id("dep_abc123?payment_status=COMPLETED&transid=TX1") === "dep_abc123", id("dep_abc123?payment_status=COMPLETED"));
  ok("2.3 no id reads as empty (the page then shows the not-found answer, as before)",
    id(undefined) === "" && id(null) === "" && id("") === "");
  ok("2.4 padding is trimmed", id("  dep_abc123  ") === "dep_abc123", JSON.stringify(id("  dep_abc123  ")));
  ok("2.5 an over-long id is cut to 64 characters", id("x".repeat(80)).length === 64);

  // ── §5 the call sites ───────────────────────────────────────────────────────
  const s = impl.selcomSrc;
  ok("5.1 selcom.ts sends redirect_url WITH our order id (through the helper)",
    /redirect_url:\s*Buffer\.from\(withOrderId\(opts\.redirectUrl,\s*opts\.orderId\)\)\.toString\("base64"\)/.test(s));
  ok("5.2 selcom.ts sends cancel_url WITH our order id (through the helper)",
    /cancel_url:\s*Buffer\.from\(withOrderId\(opts\.cancelUrl,\s*opts\.orderId\)\)\.toString\("base64"\)/.test(s));
  ok("5.3 the return page reads the id through the helper, and nowhere raw",
    /cardReturnOrderId\(sp\.order_id\)/.test(impl.pageSrc) && !/sp\.order_id\s*\?\?/.test(impl.pageSrc));
  const gw = impl.stubSrc.match(/const gatewayUrl = `[^`]*`/)?.[0] ?? "";
  ok("5.4 the shared test gateway appends only payment_status + transid, never an order_id of its own (the July blind spot)",
    gw !== "" && /payment_status=/.test(gw) && /transid=/.test(gw) && !/order_id/.test(gw), gw || "gatewayUrl template not found");
  return failed;
}

// ── A gateway that behaves as Selcom does, in process (no port, no child) ─────────
const ENV: SelcomEnv = {
  baseUrl: "https://apigw.example.test/v1", apiKey: "k", apiSecret: "s", vendor: "SW00000000",
  webhookUrl: "https://www.50pick.tz/api/webhooks/payments", timeoutMs: 5_000,
};
type Order = { amount: number; status: string; redirect: string; cancel: string };
const orders = new Map<string, Order>();
const dec = (v: unknown) => Buffer.from(String(v), "base64").toString("utf8");
const realFetch = globalThis.fetch;
function selcomLikeFetch(): void {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const reply = (json: unknown) => new Response(JSON.stringify(json), { status: 200, headers: { "content-type": "application/json" } });
    if (url.pathname.endsWith("/checkout/create-order")) {
      const b = JSON.parse(String(init?.body ?? "{}"));
      orders.set(String(b.order_id), { amount: Number(b.amount), status: "PENDING", redirect: dec(b.redirect_url), cancel: dec(b.cancel_url) });
      return reply({
        reference: "R1", resultcode: "000", result: "SUCCESS", message: "Order creation successful",
        data: [{ gateway_buyer_uuid: "u", payment_token: "t", payment_gateway_url: Buffer.from(`https://checkout.example.test/pg/${b.order_id}`).toString("base64") }],
      });
    }
    if (url.pathname.endsWith("/checkout/order-status")) {
      const o = orders.get(url.searchParams.get("order_id") ?? "");
      if (!o) return reply({ resultcode: "038", result: "FAILED", message: "Order not found", data: [] });
      return reply({
        reference: "R2", resultcode: "000", result: "SUCCESS", message: "Order fetch successful",
        data: [{ order_id: url.searchParams.get("order_id"), amount: String(o.amount), payment_status: o.status,
          transid: o.status === "COMPLETED" ? "TX1" : null, channel: o.status === "COMPLETED" ? "CARD" : null }],
      });
    }
    return new Response(JSON.stringify({ resultcode: "404", result: "FAILED" }), { status: 404 });
  }) as typeof fetch;
}
/** Where the buyer's browser lands: OUR url, with Selcom's two parameters appended — and nothing else. */
const selcomReturn = (ours: string, status: string, sep = ours.includes("?") ? "&" : "?") =>
  `${ours}${sep}payment_status=${status}&transid=TX1`;

const iso = () => new Date().toISOString();
let seq = 0;
async function mkPlayer(id: string): Promise<void> {
  await db.user.create({
    id, phoneE164: `+25578${String(++seq).padStart(7, "0")}`,
    passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "ACTIVE", locale: "EN", displayName: "Return Tester", dob: "1990-01-01", region: "TZ",
    acceptedTermsVersion: "v1", acceptedTermsAt: iso(), marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    email: `${id}@t.tz`, emailVerifiedAt: iso(), createdAt: iso(), updatedAt: iso(), lastLoginAt: iso(), closedAt: null,
  } as never);
  await db.wallet.create({
    id: `wal_${id}`, userId: id, balance: 0, pending: 0, hold: 0, currency: "TZS", status: "ACTIVE", createdAt: iso(), updatedAt: iso(),
  } as never);
}
const CARD_CTX = {
  buyerEmail: "ret@example.com", buyerName: "Return Tester", buyerPhone: "+255712345678",
  billing: { firstName: "Ret", lastName: "Tester", address1: "1 Test St", city: "Dar es Salaam", stateOrRegion: "Dar es Salaam",
    postcodeOrPobox: "P.O. Box 1", country: "TZ", phone: "+255712345678" },
  redirectUrl: RET,
  cancelUrl: `${RET}?cancelled=1`,
};

/** §3 and §4 — the real code, end to end. Returns the failed check labels. */
async function runReal(log: (l: string) => void): Promise<string[]> {
  const failed: string[] = [];
  const ok = (label: string, cond: boolean, extra = "") => {
    if (!cond) failed.push(label);
    log(`${cond ? "PASS" : "FAIL"} ${label}${!cond && extra ? ` — ${extra}` : ""}`);
  };
  selcomLikeFetch();
  try {
    // ── §3 the REAL selcomCardCheckout ────────────────────────────────────────
    orders.clear();
    const c = await selcomCardCheckout(ENV, { orderId: "dep_abc123", amount: 10_000, buyerEmail: "a@example.com", userId: "usr_x",
      buyerName: "A B", buyerPhone: "0712345678", billing: CARD_CTX.billing, redirectUrl: RET, cancelUrl: `${RET}?cancelled=1` });
    const sent = orders.get("dep_abc123");
    ok("3.1 the order is created", c.ok === true && !!sent);
    ok("3.2 redirect_url carries our order id", sent?.redirect === `${RET}?order_id=dep_abc123`, sent?.redirect);
    ok("3.3 cancel_url carries our order id after its own marker", sent?.cancel === `${RET}?cancelled=1&order_id=dep_abc123`, sent?.cancel);

    // ── §4 the whole return leg ────────────────────────────────────────────────
    process.env.PAYMENT_API_URL = ENV.baseUrl;
    process.env.PAYMENT_API_KEY = ENV.apiKey;
    process.env.PAYMENT_API_SECRET = ENV.apiSecret;
    process.env.PAYMENT_VENDOR_ID = ENV.vendor;
    await setPaymentControls({ provider: "selcom" }, "card-return-order");

    // 4.1–4.6 PAID: the buyer pays and comes back on the URL Selcom builds.
    await mkPlayer("usr_ret_paid");
    const started = await deposit("usr_ret_paid", { provider: "CARD", amount: 20_000 }, undefined, CARD_CTX);
    const txn = (await db.txn.findByUser("usr_ret_paid"))[0];
    const ref = txn?.providerRef ?? "";
    const order = orders.get(ref);
    ok("4.1 the deposit is accepted and parked PROCESSING", started.ok && txn?.status === "PROCESSING", !started.ok ? started.error : txn?.status);
    ok("4.2 the URL handed to Selcom names THIS deposit", !!order && new URL(order.redirect).searchParams.get("order_id") === ref, order?.redirect);
    if (order) order.status = "COMPLETED";
    const back = new URL(selcomReturn(order?.redirect ?? RET, "COMPLETED"));
    const readBack = CR.cardReturnOrderId(back.searchParams.get("order_id"));
    ok("4.3 the page reads this deposit's id off the URL the buyer lands on", readBack !== "" && readBack === ref, back.toString());
    const out1 = await settleDepositFromReturn("usr_ret_paid", readBack);
    ok("4.4 the return leg answers PAID, not \"couldn't find that payment\"", out1.state === "PAID", out1.state);
    ok("4.5 credited once", (await db.wallet.findByUserId("usr_ret_paid"))?.balance === 20_000);
    const out2 = await settleDepositFromReturn("usr_ret_paid", readBack);
    ok("4.6 a refresh of the return page is still PAID and credits nothing more",
      out2.state === "PAID" && (await db.wallet.findByUserId("usr_ret_paid"))?.balance === 20_000);

    // 4.7 the cancel leg: the buyer gives up on Selcom's page and lands on OUR cancel URL.
    await mkPlayer("usr_ret_cancel");
    await deposit("usr_ret_cancel", { provider: "CARD", amount: 20_000 }, undefined, CARD_CTX);
    const cref = (await db.txn.findByUser("usr_ret_cancel"))[0]?.providerRef ?? "";
    const corder = orders.get(cref);
    if (corder) corder.status = "USERCANCELLED";
    const cback = new URL(corder?.cancel ?? RET);
    const cout = await settleDepositFromReturn("usr_ret_cancel", CR.cardReturnOrderId(cback.searchParams.get("order_id")));
    ok("4.7 the cancel leg finds its order (FAILED, nothing credited), and keeps cancelled=1",
      cout.state === "FAILED" && cback.searchParams.get("cancelled") === "1" && (await db.wallet.findByUserId("usr_ret_cancel"))?.balance === 0,
      `${cout.state} · ${cback}`);

    // 4.8 a gateway that appends with a second `?`: the id is still read whole.
    await mkPlayer("usr_ret_naive");
    await deposit("usr_ret_naive", { provider: "CARD", amount: 20_000 }, undefined, CARD_CTX);
    const nref = (await db.txn.findByUser("usr_ret_naive"))[0]?.providerRef ?? "";
    const norder = orders.get(nref);
    if (norder) norder.status = "COMPLETED";
    const nback = new URL(selcomReturn(norder?.redirect ?? RET, "COMPLETED", "?"));
    const nout = await settleDepositFromReturn("usr_ret_naive", CR.cardReturnOrderId(nback.searchParams.get("order_id")));
    ok("4.8 a second `?` from the gateway still finds the deposit (PAID)", nout.state === "PAID", `${nout.state} · ${nback}`);

    // 4.9 CONTROL: the URL production handed Selcom until today — no id — finds nothing. This check can fail.
    await mkPlayer("usr_ret_control");
    const bare = new URL(selcomReturn(RET, "COMPLETED"));
    const ctl = await settleDepositFromReturn("usr_ret_control", CR.cardReturnOrderId(bare.searchParams.get("order_id")));
    ok("4.9 control: without our id the same return reads UNKNOWN (what a charged payer was shown)", ctl.state === "UNKNOWN", ctl.state);
  } finally {
    globalThis.fetch = realFetch;
  }
  return failed;
}

if (!PROVE_RED) {
  console.log("card-return-order — a card payer comes back to the deposit they made");
  const failed = [...runPlantable(REAL, console.log), ...(await runReal(console.log))];
  console.log(`\nCARD RETURN ORDER — ${failed.length === 0 ? "all checks passed" : `${failed.length} failed: ${failed.join(" | ")}`}\n`);
  process.exitCode = failed.length === 0 ? 0 : 1;
} else {
  const quiet = () => {};
  type Plant = { name: string; expect: RegExp; impl: Impl };
  const plants: Plant[] = [
    { name: "the id is never added (the URL production sent until 2026-10-09)", expect: /^1\.1 /, impl: { ...REAL, seed: (u) => u } },
    { name: "the id is appended, not set: a stale one doubles", expect: /^1\.3 /,
      impl: { ...REAL, seed: (u, o) => `${u}${u.includes("?") ? "&" : "?"}order_id=${encodeURIComponent(o)}` } },
    { name: "the other parameters are dropped (the cancel leg loses cancelled=1)", expect: /^1\.2 /,
      impl: { ...REAL, seed: (u, o) => { try { const x = new URL(u); return `${x.origin}${x.pathname}?order_id=${encodeURIComponent(o)}`; } catch { return u; } } } },
    { name: "the id is not encoded", expect: /^1\.5 /,
      impl: { ...REAL, seed: (u, o) => `${u}${u.includes("?") ? "&" : "?"}order_id=${o}` } },
    { name: "the page keeps a gateway's second `?` on the id", expect: /^2\.2 /,
      impl: { ...REAL, readId: (r) => String(r ?? "").trim().slice(0, 64) } },
    { name: "the page does not trim", expect: /^2\.4 /, impl: { ...REAL, readId: (r) => String(r ?? "").split("?")[0].slice(0, 64) } },
    { name: "selcom.ts sends the bare redirect_url again", expect: /^5\.1 /,
      impl: { ...REAL, selcomSrc: REAL.selcomSrc.replace("Buffer.from(withOrderId(opts.redirectUrl, opts.orderId))", "Buffer.from(opts.redirectUrl)") } },
    { name: "selcom.ts seeds the redirect but not the cancel URL", expect: /^5\.2 /,
      impl: { ...REAL, selcomSrc: REAL.selcomSrc.replace("Buffer.from(withOrderId(opts.cancelUrl, opts.orderId))", "Buffer.from(opts.cancelUrl)") } },
    { name: "the page reads sp.order_id raw again", expect: /^5\.3 /,
      impl: { ...REAL, pageSrc: REAL.pageSrc.replace("cardReturnOrderId(sp.order_id)", '(sp.order_id ?? "").trim().slice(0, 64)') } },
    { name: "the test gateway appends an order_id of its own again (the July blind spot)", expect: /^5\.4 /,
      impl: { ...REAL, stubSrc: REAL.stubSrc.replace("payment_status=", "order_id=${encodeURIComponent(orderId)}&payment_status=") } },
  ];
  let caught = 0, fail = 0;
  const ok = (label: string, cond: boolean, extra = "") => { if (!cond) fail++; console.log(`${cond ? "PROVED  " : "MISSED  "} ${label}${extra ? ` — ${extra}` : ""}`); };
  const clean = runPlantable(REAL, quiet);
  ok("the REAL helpers and call sites pass every plantable check", clean.length === 0, clean.join(" | "));
  for (const p of plants) {
    const failures = runPlantable(p.impl, quiet);
    const hit = failures.some((f) => p.expect.test(f));
    if (hit) caught++;
    ok(p.name, hit, hit ? "" : failures.length === 0 ? "NOTHING failed — the guard cannot see this defect" : `failed instead: ${failures.slice(0, 2).join(" | ")}`);
  }
  console.log(`\nRED CONTROL — ${caught}/${plants.length} caught${fail === 0 ? "" : ` · ${fail} FAILED`}\n`);
  process.exitCode = fail === 0 ? 0 : 1;
}
