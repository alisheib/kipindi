/**
 * Anchors for red:sms-cost-guard — each reintroduces, on the real file, a defect in the SMS credit
 * floor or the balance reading it runs on. DATA, so `test:red-anchors` §3 can audit that every
 * `from` still resolves exactly once without running the harness.
 *
 * ⛔ A red anchor quotes SOURCE. Editing any of these lines in `sms.ts` must be paired with
 * re-anchoring here, or the harness reports ANCHOR FAIL — loudly, by design.
 */
export const MUTATIONS = [
  {
    // 🔴 THE LATCH, EXACTLY AS IT SHIPPED. A refused reply answers `balance: 0.0` because
    // Blackball validates before it authenticates; recording it stores TZS 0 and trips the floor.
    name: "sms.ts — the balance is recorded from refused replies too",
    file: "src/lib/server/sms.ts",
    from: `    if (outcome.ok) {
      recordBalance(outcome.balance);`,
    to: `    if (true) {
      recordBalance(outcome.balance);`,
    expect: `§2 ⛔ the refusal's balance 0.0 is NOT recorded`,
  },
  {
    // ⚠️ AT SEND TIME THE BALANCE REFRESH NOW MASKS THIS — a stale reading is replaced before the
    // floor decides — so the defect is visible where it still does harm: the snapshot that
    // /admin/system and /api/health render, which would show a stale reading as "below floor".
    name: "sms.ts — a stale balance reading is trusted forever",
    file: "src/lib/server/sms.ts",
    from: `  const live = b !== null && !stale;`,
    to: `  const live = b !== null;`,
    expect: `§3 …and is not treated as below the floor`,
  },
  {
    // Refusing a login code to save TZS 6 is a self-inflicted outage.
    name: "sms.ts — the floor stops exempting OTP",
    file: "src/lib/server/sms.ts",
    from: `  if (!everyMessageIsOtp) {`,
    to: `  if (true) {`,
    expect: `§1 ⭐ under the SAME floor, an OTP still sends`,
  },
  {
    // A level-triggered alarm writes a permanent row per send into a chain that cannot be pruned.
    name: "sms.ts — the low-balance alarm becomes level-triggered",
    file: "src/lib/server/sms.ts",
    from: `  if (prev !== null && prev > threshold && tzs <= threshold) {`,
    to: `  if (tzs <= threshold) {`,
    expect: `§4 crossing the alert line writes exactly ONE alarm, not one per send`,
  },
  {
    // The refused row would carry a figure that was never the account's balance.
    name: "sms.ts — a refused row stores the refusal's false balance",
    file: "src/lib/server/sms.ts",
    from: `          // A refusal's \`balance\` is not the account's (it reads 0.0 before auth) — no figure beats a false one.
          balanceTzs: null,`,
    to: `          balanceTzs: outcome.balance,`,
    expect: `§2 the refused row stores NO balance rather than a false 0`,
  },
  {
    // "No reading yet" read as "empty" would take the rail down on every cold start.
    name: "sms.ts — an absent balance reading is treated as below the floor",
    file: "src/lib/server/sms.ts",
    from: `    belowFloor: live && b!.tzs < balanceFloor(),`,
    to: `    belowFloor: b === null || (live && b!.tzs < balanceFloor()),`,
    expect: `§6 ⛔ an unreadable balance does NOT hold a campaign: unknown is not low`,
  },
  {
    // Without the refresh, a campaign is judged on a missing or stale reading — and a campaign
    // held by the floor makes no request that could ever refresh it.
    name: "sms.ts — a missing or stale reading is no longer refreshed from the balance endpoint",
    file: "src/lib/server/sms.ts",
    from: `    if ((before.tzs === null || before.stale) && transport.balance) {`,
    to: `    if (false) {`,
    expect: `§3 …because the stale reading was replaced by a real balance read`,
  },
];
