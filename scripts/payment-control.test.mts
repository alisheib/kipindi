/**
 * Payments operations control-plane — resolver + operator-switchable-provider proofs.
 *
 * Owner decision 2026-07-24 (docs/COMPLIANCE-DECISIONS.md): admins may switch the
 * provider — INCLUDING to the mock — in ANY money mode; the LIVE-mode mock/demo-async
 * hard-locks are GONE. This suite pins the NEW matrix so nobody re-adds a hard-lock
 * or silently removes the remaining guardrail: the mock is always selectable and, in
 * LIVE mode, dispatch HONOURS it as a deliberate simulation (flagged, not refused);
 * demo-async is settable in every mode; the ONE surviving gate is that a REAL
 * provider must be configured before it can be selected. Also confirms the
 * env-fallback behaviour (no DB override → behave exactly as the deployment env did).
 * No real DB — the in-memory store is reset between phases.
 *
 * The old global `autoSettle` / `AUTO_SETTLE` axis is DELETED — settlement is now
 * driven by per-market timers (market-scheduler.ts), not by a payments toggle. The
 * assertions that used to cover it are replaced (not dropped) by pins that the axis
 * cannot come back through this control-plane: the view exposes no settlement field,
 * the env fallback hint carries no settlement key, and a stray `autoSettle` in an
 * update is inert.
 *
 * ── 🔴 2026-09-08 · AND FOUR OF ITS OWN ASSERTIONS WERE THE DEFECT ────────────
 * This suite used to certify, GREEN, that a LIVE-money deployment with **no
 * `PAYMENT_AGGREGATOR` and no officer row** resolves to the MOCK and that
 * `dispatchDeposit` RUNS it. The mock fabricates confirmations — a deposit
 * "confirms" and a real wallet is credited for money that never arrived. The guard
 * was not blind to the money-printing path; it was asserting it was correct.
 *
 * The line the suite now holds, and the whole point of the fix:
 *   **a mock that was CHOSEN runs** — Ali's decision of 2026-07-24, audited, typed
 *   confirm, persistent banner — and **a mock that nobody chose is refused**, because
 *   an unset or misspelt environment variable is not a decision. §X below drives both
 *   arms, and the CHOSEN-mock arm is the positive control that keeps the refusal from
 *   quietly becoming "refuse everything" and reversing the owner's call.
 * RED harness: `node scripts/payment-control-red.mjs` (`npm run red:payment-control`).
 */
import { readFileSync } from "node:fs";
import {
  getPaymentProvider,
  resolvePaymentProvider,
  getDemoAsyncEnabled,
  getPaymentControls,
  setPaymentControls,
  paymentProviderConfigured,
} from "../src/lib/server/payment-control.ts";
import { isLiveMoneyMode, moneyMode } from "../src/lib/server/runtime-mode.ts";
import { dispatchDeposit, dispatchWithdrawal } from "../src/lib/server/payments.ts";

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
ok("no config → env fallback hint is exactly {provider, providerRaw, demoAsync}", Object.keys(bare.env).sort().join(",") === "demoAsync,provider,providerRaw");
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

// ── LIVE-mode: NO hard-locks — provider is operator-switchable, mock guardrailed ─
resetStore(); setEnv("production", undefined); setCreds(true);
const mockLive = await setPaymentControls({ provider: "mock" }, "officer");
ok("LIVE: provider=mock now ALLOWED (deliberate simulation)", mockLive.ok === true);
ok("LIVE: provider now mock", (await getPaymentProvider()) === "mock");
const demoLive = await setPaymentControls({ demoAsync: true }, "officer");
ok("LIVE: demoAsync=true now ALLOWED", demoLive.ok === true);
ok("LIVE: demoAsync honoured (not forced off)", (await getDemoAsyncEnabled()) === true);
// The ONE surviving gate: a REAL provider must still have its creds.
setCreds(false);
const selcomNoCreds = await setPaymentControls({ provider: "selcom" }, "officer");
ok("LIVE: selcom w/o creds still REFUSED (credential gate remains)", selcomNoCreds.ok === false);
setCreds(true);
const selcomLive = await setPaymentControls({ provider: "selcom" }, "officer");
ok("LIVE: selcom WITH creds → ok", selcomLive.ok === true);

// ── 🔴 §X · LIVE MONEY + NOBODY CHOSE A RAIL → REFUSE ─────────────────────────
//
// ⛔ THIS SECTION REPLACES FOUR ASSERTIONS THAT PINNED THE DEFECT AS CORRECT. Until
// 2026-09-08 this file asserted, GREEN:
//     ok("view provider mock (fallback)",            view.provider === "mock");
//     ok("view simulationActiveOnLiveMoney true",    view.simulationActiveOnLiveMoney === true);
//     ok("LIVE + mock → dispatch RUNS the simulator (ok)", dep.ok === true);
// on a fixture whose env has NO `PAYMENT_AGGREGATOR` and no officer row. That is a
// LIVE-money deployment where nobody chose a payment rail, and the suite certified
// that it runs the MOCK — an adapter whose own doc says it "fabricates confirmations:
// deposits credit real wallets with no money received". The guard was not silent about
// the money-printing path; it was asserting it.
//
// The distinction the fix draws, and this section holds:
//   CHOSEN mock  → runs. Ali's decision of 2026-07-24, guardrailed and audited.
//   NOBODY chose → refuses. Not a decision, so not honoured.
resetStore(); setEnv("production", undefined); setCreds(false); delete E.PAYMENT_AGGREGATOR;
const unsetRes = await resolvePaymentProvider();
ok("LIVE + unset → resolution REFUSES", unsetRes.ok === false);
ok("LIVE + unset → source is `none`", unsetRes.source === "none");
ok("LIVE + unset → provider is null, NOT the mock", (await getPaymentProvider()) === null);
const view = await getPaymentControls();
ok("view mode LIVE", view.mode === "LIVE");
ok("★ view provider is null — no rail is active", view.provider === null);
ok("★ view flags moneyRailUnset", view.moneyRailUnset === true);
ok("★ …and does NOT call it a simulation (nobody chose it)", view.simulationActiveOnLiveMoney === false);
ok("view carries the reason for the screen", typeof view.moneyRailUnsetReason === "string" && view.moneyRailUnsetReason.length > 0);
ok("view locks.mockForbidden false (no hard-lock)", view.locks.mockForbidden === false);
ok("view locks.demoAsyncLocked false (no hard-lock)", view.locks.demoAsyncLocked === false);
ok("view selectable.mock true (always selectable)", view.selectable.mock === true);
ok("view selectable.selcom false (no creds)", view.selectable.selcom === false);
setCreds(true);
const view2 = await getPaymentControls();
ok("view selectable.selcom true (creds present)", view2.selectable.selcom === true);
ok("★ creds alone do not choose a rail — still refused", view2.moneyRailUnset === true && view2.provider === null);

// ⛔ A TYPO IS A FAILED CHOICE, NOT A CHOICE. `PAYMENT_AGGREGATOR=selcomm` in Railway
// used to fall through the same `? :` and activate the simulator on real money.
resetStore(); setEnv("production", undefined); setCreds(true); E.PAYMENT_AGGREGATOR = "selcomm";
const typo = await resolvePaymentProvider();
ok("★ LIVE + unrecognised PAYMENT_AGGREGATOR → REFUSED", typo.ok === false);
ok("…and the refusal quotes what was actually set", typo.ok === false && typo.reason.includes("selcomm"));
ok("…and the view shows the raw value", (await getPaymentControls()).env.providerRaw === "selcomm");
delete E.PAYMENT_AGGREGATOR;

// ── Dispatch-level: the refusal is on the MONEY PATH, not just the view ───────
resetStore(); setEnv("production", undefined); delete E.PAYMENT_AGGREGATOR; setCreds(false);
const depRefused = await dispatchDeposit({ provider: "MPESA", amount: 1000, userId: "u_test" });
ok("★★ LIVE + unset → dispatchDeposit REFUSES", depRefused.ok === false);
ok("★★ …with PROVIDER_DOWN", depRefused.ok === false && depRefused.reason === "PROVIDER_DOWN");
const wdrRefused = await dispatchWithdrawal({ provider: "MPESA", amount: 1000, userId: "u_test" });
ok("★★ LIVE + unset → dispatchWithdrawal REFUSES", wdrRefused.ok === false);
ok("★★ …with PROVIDER_DOWN", wdrRefused.ok === false && wdrRefused.reason === "PROVIDER_DOWN");

// ── ⭐ POSITIVE CONTROL, same run — a CHOSEN mock still runs on LIVE money ─────
// Without this, the refusal above could be passing because dispatch refuses
// everything, and the owner decision of 2026-07-24 would have been silently reversed.
resetStore(); setEnv("production", undefined); setCreds(false); E.PAYMENT_AGGREGATOR = "mock";
const envMock = await resolvePaymentProvider();
ok("⭐ LIVE + PAYMENT_AGGREGATOR=mock → chosen, source env", envMock.ok === true && envMock.provider === "mock" && envMock.source === "env");
const envMockView = await getPaymentControls();
ok("⭐ …the view calls THAT a simulation, not a refusal", envMockView.simulationActiveOnLiveMoney === true && envMockView.moneyRailUnset === false);
const depChosenEnv = await dispatchDeposit({ provider: "MPESA", amount: 1000, userId: "u_test" });
ok("⭐★ LIVE + CHOSEN mock → dispatch RUNS (Ali's 2026-07-24 decision, intact)", depChosenEnv.ok === true);
delete E.PAYMENT_AGGREGATOR;

resetStore(); setEnv("production", undefined); setCreds(true);
await setPaymentControls({ provider: "mock" }, "officer");
const officerMock = await resolvePaymentProvider();
ok("⭐ LIVE + officer-saved mock → chosen, source officer", officerMock.ok === true && officerMock.provider === "mock" && officerMock.source === "officer");
const depChosenOfficer = await dispatchDeposit({ provider: "MPESA", amount: 1000, userId: "u_test" });
ok("⭐★ LIVE + officer-chosen mock → dispatch RUNS", depChosenOfficer.ok === true);

// TEST mode: unchanged — a machine with no configuration at all still boots and runs.
resetStore(); setEnv("development", undefined); delete E.PAYMENT_AGGREGATOR;
ok("TEST + unset → still resolves mock (local dev unchanged)", (await getPaymentProvider()) === "mock");
ok("TEST + unset → NOT flagged as an unset rail", (await getPaymentControls()).moneyRailUnset === false);
const dep2 = await dispatchDeposit({ provider: "MPESA", amount: 1000, userId: "u_test" });
ok("TEST + mock → dispatch runs (ok)", dep2.ok === true);

// ── §H · THE HYDRATION FLAG IS RAISED AFTER THE READ LANDS ───────────────────
//
// ⚠️ ASSERTED ON THE SOURCE, and that is a deliberate second-best. Every phase above
// forces `__50PICK_PAY_CONTROL_HYDRATED = true` in `resetStore()` so the suite never
// touches a database, which means no assertion in this file can EXERCISE hydration.
// The defect is real and invisible to behaviour tests: the flag used to be raised on
// the line BEFORE `await loadConfig`, so a second caller arriving during that one
// round-trip saw "hydrated", skipped the wait, and read the DEFAULTS — "no officer
// choice" — while the officer's row was still on the wire. Every money-path read
// calls `ensureHydrated` first precisely so it cannot be eventually-consistent.
// ⛔ A red here means the ordering regressed; it does not mean "relax the check".
{
  const src = readFileSync(new URL("../src/lib/server/payment-control.ts", import.meta.url), "utf8");
  /** null = the function could not be found — a FAILURE, never a silent pass. */
  const flagSetAfterRead = (source: string): boolean | null => {
    const at = source.indexOf("async function ensureHydrated");
    if (at < 0) return null;
    // The body ends at the next top-level `\n}` after the signature.
    const end = source.indexOf("\n}", at);
    if (end < 0) return null;
    const body = source.slice(at, end);
    const read = body.indexOf("await loadConfig");
    const flag = body.indexOf("__50PICK_PAY_CONTROL_HYDRATED = true");
    if (read < 0 || flag < 0) return null;
    return flag > read;
  };
  const verdict = flagSetAfterRead(src);
  ok("H.1 · ensureHydrated is still findable — ⚠️ a red here means RE-ANCHOR, not relax", verdict !== null, String(verdict));
  ok("H.2 · ★ the hydrated flag is raised AFTER the config read lands", verdict === true, String(verdict));

  // ⭐ POSITIVE CONTROL — the pre-fix shape, verbatim, must be REJECTED, or H.2 is
  // passing by never being able to say no.
  const PRE_FIX = `async function ensureHydrated(): Promise<void> {
  if (globalThis.__50PICK_PAY_CONTROL_HYDRATED) return;
  globalThis.__50PICK_PAY_CONTROL_HYDRATED = true;
  const stored = await loadConfig<Partial<Controls>>(KEY);
  if (stored) { store.provider = stored.provider ?? null; }
}`;
  ok("H.3 · ★ the checker REJECTS the pre-fix ordering", flagSetAfterRead(PRE_FIX) === false, String(flagSetAfterRead(PRE_FIX)));
  ok("H.4 · …and returns null (never a pass) when there is no such function", flagSetAfterRead("const x = 1;") === null, String(flagSetAfterRead("const x = 1;")));
}

// restore env
for (const k of TOUCHED) { if (orig[k] === undefined) delete E[k]; else E[k] = orig[k]; }
resetStore();
console.log(`\npayment-control: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
