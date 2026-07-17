/**
 * Payments operations control-plane — resolver + LIVE-mode hard-lock proofs.
 *
 * Pins the safety matrix so nobody can silently widen it: the mock is forbidden on
 * real money, a real provider must be configured before it can be selected, and
 * demo-async is forced off in LIVE mode. Also confirms the env-fallback behaviour
 * (no DB override → behave exactly as the deployment env did) and the dispatch-level
 * refusal (real money never routes to the mock). No real DB — the in-memory store
 * is reset between phases.
 */
import {
  getPaymentProvider,
  getAutoSettleEnabled,
  getDemoAsyncEnabled,
  getPaymentControls,
  setPaymentControls,
  paymentProviderConfigured,
} from "../src/lib/server/payment-control.ts";
import { isLiveMoneyMode, moneyMode } from "../src/lib/server/runtime-mode.ts";
import { dispatchDeposit } from "../src/lib/server/payments.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean) => { if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}`); } };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g = globalThis as any;
const E = process.env as Record<string, string | undefined>;
const CREDS = ["PAYMENT_API_KEY", "PAYMENT_API_SECRET", "PAYMENT_VENDOR_ID", "PAYMENT_API_URL"];
const TOUCHED = ["NODE_ENV", "TEST_FUNDING", "PAYMENT_AGGREGATOR", "AUTO_SETTLE", "PAYMENTS_DEMO_ASYNC", "PAYMENT_VENDOR_PIN", ...CREDS];
const orig: Record<string, string | undefined> = {};
for (const k of TOUCHED) orig[k] = E[k];

function resetStore() {
  // Mutate the SAME object the module captured at import — reassigning the global
  // reference would leave the module holding the old store.
  const s = g.__50PICK_PAY_CONTROL;
  if (s) { s.provider = null; s.autoSettle = null; s.demoAsync = null; }
  else g.__50PICK_PAY_CONTROL = { provider: null, autoSettle: null, demoAsync: null };
  g.__50PICK_PAY_CONTROL_HYDRATED = true;
}
function setEnv(nodeEnv: string | undefined, testFunding: string | undefined) {
  if (nodeEnv === undefined) delete E.NODE_ENV; else E.NODE_ENV = nodeEnv;
  if (testFunding === undefined) delete E.TEST_FUNDING; else E.TEST_FUNDING = testFunding;
}
function setCreds(present: boolean) {
  if (present) { E.PAYMENT_API_KEY = "k"; E.PAYMENT_API_SECRET = "s"; E.PAYMENT_VENDOR_ID = "v"; E.PAYMENT_API_URL = "https://apigwtest.selcommobile.com/v1"; }
  else { for (const k of CREDS) delete E[k]; }
}

// ── LIVE vs TEST mode ─────────────────────────────────────────────────────────
setEnv("production", undefined); ok("prod + TEST_FUNDING unset → LIVE", isLiveMoneyMode() === true && moneyMode() === "LIVE");
setEnv("production", "true");    ok("prod + TEST_FUNDING=true → TEST", isLiveMoneyMode() === false);
setEnv("development", undefined);ok("dev → TEST", isLiveMoneyMode() === false);

// ── Env fallback (TEST mode, no DB override) ──────────────────────────────────
resetStore(); setEnv("development", undefined); delete E.PAYMENT_AGGREGATOR; delete E.AUTO_SETTLE; delete E.PAYMENTS_DEMO_ASYNC;
ok("no config → provider mock", (await getPaymentProvider()) === "mock");
ok("no config → autoSettle off", (await getAutoSettleEnabled()) === false);
ok("no config → demoAsync off", (await getDemoAsyncEnabled()) === false);
E.PAYMENT_AGGREGATOR = "selcom";
ok("env PAYMENT_AGGREGATOR=selcom → provider selcom", (await getPaymentProvider()) === "selcom");
delete E.PAYMENT_AGGREGATOR;
E.AUTO_SETTLE = "true";
ok("env AUTO_SETTLE=true → autoSettle on", (await getAutoSettleEnabled()) === true);
delete E.AUTO_SETTLE;

// ── paymentProviderConfigured ─────────────────────────────────────────────────
setCreds(false); ok("selcom not configured w/o creds", paymentProviderConfigured("selcom") === false);
setCreds(true);  ok("selcom configured with 4 creds", paymentProviderConfigured("selcom") === true);
ok("mock never configured", paymentProviderConfigured("mock") === false);
ok("azampay NOT configured from Selcom's shared creds", paymentProviderConfigured("azampay") === false);

// ── TEST-mode overrides (freely settable) ─────────────────────────────────────
resetStore(); setEnv("development", undefined); setCreds(true);
ok("TEST: set provider selcom → ok", (await setPaymentControls({ provider: "selcom" }, "officer")).ok === true);
ok("TEST: provider now selcom", (await getPaymentProvider()) === "selcom");
ok("TEST: set autoSettle true → ok", (await setPaymentControls({ autoSettle: true }, "officer")).ok === true);
ok("TEST: autoSettle now on", (await getAutoSettleEnabled()) === true);
ok("TEST: set demoAsync true → ok", (await setPaymentControls({ demoAsync: true }, "officer")).ok === true);
ok("TEST: demoAsync now on", (await getDemoAsyncEnabled()) === true);

// ── LIVE-mode hard-locks ──────────────────────────────────────────────────────
resetStore(); setEnv("production", undefined); setCreds(true);
const mockLive = await setPaymentControls({ provider: "mock" }, "officer");
ok("LIVE: provider=mock REFUSED", mockLive.ok === false);
const demoLive = await setPaymentControls({ demoAsync: true }, "officer");
ok("LIVE: demoAsync=true REFUSED", demoLive.ok === false);
ok("LIVE: demoAsync forced off", (await getDemoAsyncEnabled()) === false);
setCreds(false);
const selcomNoCreds = await setPaymentControls({ provider: "selcom" }, "officer");
ok("LIVE: selcom w/o creds REFUSED", selcomNoCreds.ok === false);
setCreds(true);
const selcomLive = await setPaymentControls({ provider: "selcom" }, "officer");
ok("LIVE: selcom WITH creds → ok", selcomLive.ok === true);

// ── getPaymentControls view (LIVE, mock via env fallback = misconfig) ─────────
resetStore(); setEnv("production", undefined); setCreds(false); delete E.PAYMENT_AGGREGATOR;
const view = await getPaymentControls();
ok("view mode LIVE", view.mode === "LIVE");
ok("view provider mock (fallback)", view.provider === "mock");
ok("view liveMockRefused true", view.liveMockRefused === true);
ok("view locks.mockForbidden true", view.locks.mockForbidden === true);
ok("view locks.demoAsyncLocked true", view.locks.demoAsyncLocked === true);
ok("view selectable.mock false (LIVE)", view.selectable.mock === false);
ok("view selectable.selcom false (no creds)", view.selectable.selcom === false);
setCreds(true);
const view2 = await getPaymentControls();
ok("view selectable.selcom true (creds present)", view2.selectable.selcom === true);

// ── Dispatch-level: real money NEVER routes to the mock ───────────────────────
resetStore(); setEnv("production", undefined); delete E.PAYMENT_AGGREGATOR; setCreds(false); // → provider resolves mock
const dep = await dispatchDeposit({ provider: "MPESA", amount: 1000, userId: "u_test" });
ok("LIVE + mock → dispatch refused PROVIDER_DOWN", dep.ok === false && dep.reason === "PROVIDER_DOWN");

// TEST mode: mock is allowed to run.
resetStore(); setEnv("development", undefined); delete E.PAYMENT_AGGREGATOR;
const dep2 = await dispatchDeposit({ provider: "MPESA", amount: 1000, userId: "u_test" });
ok("TEST + mock → dispatch runs (ok)", dep2.ok === true);

// restore env
for (const k of TOUCHED) { if (orig[k] === undefined) delete E[k]; else E[k] = orig[k]; }
resetStore();
console.log(`\npayment-control: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
