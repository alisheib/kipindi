/**
 * Payments operations control-plane — resolver + LIVE-mode hard-lock proofs.
 *
 * Pins the safety matrix so nobody can silently widen it: the mock is forbidden on
 * real money, a real provider must be configured before it can be selected, and
 * demo-async is forced off in LIVE mode. Also confirms the env-fallback behaviour
 * (no DB override → behave exactly as the deployment env did) and the dispatch-level
 * refusal (real money never routes to the mock). No real DB — the in-memory store
 * is reset between phases.
 *
 * The old global `autoSettle` / `AUTO_SETTLE` axis is DELETED — settlement is now
 * driven by per-market timers (market-scheduler.ts), not by a payments toggle. The
 * assertions that used to cover it are replaced (not dropped) by pins that the axis
 * cannot come back through this control-plane: the view exposes no settlement field,
 * the env fallback hint carries no settlement key, and a stray `autoSettle` in an
 * update is inert. Plus the credential gate and the no-partial-application rule are
 * now proven in TEST mode too, not only in LIVE.
 */
import {
  getPaymentProvider,
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
const AZAM = ["AZAMPAY_CLIENT_ID", "AZAMPAY_CLIENT_SECRET"];
const TOUCHED = ["NODE_ENV", "TEST_FUNDING", "PAYMENT_AGGREGATOR", "PAYMENTS_DEMO_ASYNC", "PAYMENT_VENDOR_PIN", ...CREDS, ...AZAM];
const orig: Record<string, string | undefined> = {};
for (const k of TOUCHED) orig[k] = E[k];
// AzamPay is an unwired stub — pin its creds ABSENT so it is the deterministic
// "real provider that is NOT configured" fixture (restored with the rest at the end).
for (const k of AZAM) delete E[k];

function resetStore() {
  // Mutate the SAME object the module captured at import — reassigning the global
  // reference would leave the module holding the old store.
  const s = g.__50PICK_PAY_CONTROL;
  if (s) { s.provider = null; s.demoAsync = null; }
  else g.__50PICK_PAY_CONTROL = { provider: null, demoAsync: null };
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
resetStore(); setEnv("development", undefined); delete E.PAYMENT_AGGREGATOR; delete E.PAYMENTS_DEMO_ASYNC;
ok("no config → provider mock", (await getPaymentProvider()) === "mock");
ok("no config → demoAsync off", (await getDemoAsyncEnabled()) === false);
// The settlement axis is GONE from this control-plane (per-market timers own it now).
// Pin both halves of its absence so it cannot be quietly reintroduced as a global
// on/off over real payouts: no field on the view, no key on the env fallback hint.
const bare = await getPaymentControls();
ok("no config → view carries NO settlement axis", !("autoSettle" in bare) && !("autoSettle" in bare.locks) && !("autoSettle" in bare.selectable));
ok("no config → env fallback hint is exactly {provider, demoAsync}", Object.keys(bare.env).sort().join(",") === "demoAsync,provider");
E.PAYMENT_AGGREGATOR = "selcom";
ok("env PAYMENT_AGGREGATOR=selcom → provider selcom", (await getPaymentProvider()) === "selcom");
delete E.PAYMENT_AGGREGATOR;
E.PAYMENTS_DEMO_ASYNC = "true";
ok("env PAYMENTS_DEMO_ASYNC=true → demoAsync on", (await getDemoAsyncEnabled()) === true);
delete E.PAYMENTS_DEMO_ASYNC;

// ── paymentProviderConfigured ─────────────────────────────────────────────────
setCreds(false); ok("selcom not configured w/o creds", paymentProviderConfigured("selcom") === false);
setCreds(true);  ok("selcom configured with 4 creds", paymentProviderConfigured("selcom") === true);
ok("mock never configured", paymentProviderConfigured("mock") === false);
ok("azampay NOT configured from Selcom's shared creds", paymentProviderConfigured("azampay") === false);

// ── TEST-mode overrides (freely settable) ─────────────────────────────────────
resetStore(); setEnv("development", undefined); setCreds(true);
ok("TEST: set provider selcom → ok", (await setPaymentControls({ provider: "selcom" }, "officer")).ok === true);
ok("TEST: provider now selcom", (await getPaymentProvider()) === "selcom");
ok("TEST: set demoAsync true → ok", (await setPaymentControls({ demoAsync: true }, "officer")).ok === true);
ok("TEST: demoAsync now on", (await getDemoAsyncEnabled()) === true);
// The credential gate is NOT a LIVE-only rule — an unconfigured real provider is
// refused in TEST too, so a half-wired rail can never become the active one.
const azamNoCreds = await setPaymentControls({ provider: "azampay" }, "officer");
ok("TEST: azampay w/o creds REFUSED", azamNoCreds.ok === false);
ok("TEST: refused write left provider on selcom", (await getPaymentProvider()) === "selcom");
// No partial application: one invalid field rejects the WHOLE update — the valid
// sibling field must not land either.
const mixed = await setPaymentControls({ demoAsync: false, provider: "azampay" }, "officer");
ok("TEST: mixed valid+invalid update REFUSED whole", mixed.ok === false);
ok("TEST: mixed refusal did not apply the valid half", (await getDemoAsyncEnabled()) === true);
// A stray `autoSettle` cannot resurrect the deleted settlement axis: it is ignored,
// never stored, and never surfaces on the view.
const smuggled = await setPaymentControls({ autoSettle: true } as unknown as Parameters<typeof setPaymentControls>[0], "officer");
ok("TEST: stray autoSettle field is inert (not stored, not on the view)",
  smuggled.ok === true && !("autoSettle" in smuggled.controls) && g.__50PICK_PAY_CONTROL.autoSettle === undefined);

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
