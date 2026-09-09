/**
 * MUTATIONS for `npm run red:payment-control` — the RED proof of the payment-control gate.
 *
 * ⛔ WHY THIS FILE EXISTS. `test:red-anchors` §4 is an equality ratchet on how many red harnesses
 * do NOT declare their anchors, and raising it is the one edit that file forbids. This harness
 * arrived undeclared on 2026-09-08 and pushed the count past the ceiling; the answer is a
 * declaration, not a bump. Declaring puts every anchor under §3's static audit — the only check
 * that notices a `from` string rotting while the harness still prints a verdict.
 *
 * ⚠️ `file` WAS A `URL` AND IS NOW A REPO-RELATIVE STRING, because the auditor resolves
 * `${ROOT}/${m.file}` and a `URL` stringifies to `file:///F:/…`, which resolves nowhere. The
 * harness converts back at its one call site.
 *
 * ⭐ NOTE THE THREE `over-correction-*` CASES. They are not defects the platform shipped — they
 * are the MIRROR of the ones it did, and they exist so the gate is shown to refuse both
 * directions. A gate that only catches "too permissive" gets fixed by clamping everything shut,
 * and the clamp ships. Keep them.
 */
export const MUTATIONS = [
  {
    name: "unset-falls-back-to-the-mock",
    why: "⭐ THE ACTUAL PRE-2026-09-08 STATE — real money LIVE, nothing chosen, and the resolver hands back the simulator. A deposit 'confirms' and a real wallet is credited for money that never arrived",
    file: "src/lib/server/payment-control.ts",
    from: `  if (isLiveMoneyMode()) {`,
    to: `  if (false) {`,
  },
  {
    name: "dispatch-ignores-the-refusal",
    why: "★ the resolver still refuses but the MONEY PATH does not listen — `adapterFor` falls through its `default` arm straight back to the mock. The view would look correct while wallets were credited",
    file: "src/lib/server/payments.ts",
    from: `  if (!resolution.ok) {`,
    to: `  if (false && !resolution.ok) {`,
  },
  {
    name: "a-typo-counts-as-a-choice",
    why: "PAYMENT_AGGREGATOR=selcomm in Railway. Any non-empty string is treated as a deliberate selection, so a misspelt variable re-activates the simulator on real money",
    file: "src/lib/server/payment-control.ts",
    from: `  return { provider: (ALL_PROVIDERS as string[]).includes(v) ? (v as PaymentProviderId) : null, raw };`,
    to: `  return { provider: (raw ? (v as PaymentProviderId) : null), raw };`,
  },
  {
    name: "the-view-denies-it",
    why: "the money path refuses but /admin/payments reports a healthy rail — the operator is never told why every deposit is failing",
    file: "src/lib/server/payment-control.ts",
    from: `    moneyRailUnset: !resolved.ok,`,
    to: `    moneyRailUnset: false,`,
  },
  {
    name: "over-correction-a-CHOSEN-mock-is-refused-too",
    why: "⚠️ NOT THE OLD DEFECT — the mirror. Refusing a mock an officer deliberately selected silently REVERSES the owner decision of 2026-07-24; the positive control must catch it",
    file: "src/lib/server/payment-control.ts",
    from: `  if (store.provider !== null) return { ok: true, provider: store.provider, source: "officer" };`,
    to: `  if (store.provider !== null && store.provider !== "mock") return { ok: true, provider: store.provider, source: "officer" };`,
  },
  {
    name: "over-correction-TEST-mode-refuses-too",
    why: "⚠️ NOT A MONEY DEFECT — it breaks every developer machine and CI box, which boot with no configuration at all and must still run the mock",
    file: "src/lib/server/payment-control.ts",
    from: `  // TEST: unchanged — a deployment with no configuration behaves exactly as it did.\n  return { ok: true, provider: "mock", source: "env" };`,
    to: `  return { ok: false, provider: null, source: "none", envRaw: "", reason: "refused in every mode" };`,
  },
  {
    name: "hydration-flag-raised-before-the-read",
    why: "★ §H — the flag goes up before `await loadConfig`, so a caller arriving during that round-trip reads the DEFAULTS as though they were the officer's saved row",
    file: "src/lib/server/payment-control.ts",
    from: `      globalThis.__50PICK_PAY_CONTROL_HYDRATED = true;\n    })()`,
    to: `    })()`,
    extra: {
      from: `    globalThis.__50PICK_PAY_CONTROL_HYDRATING = (async () => {`,
      to: `    globalThis.__50PICK_PAY_CONTROL_HYDRATED = true;\n    globalThis.__50PICK_PAY_CONTROL_HYDRATING = (async () => {`,
    },
  },
];
