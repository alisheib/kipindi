/**
 * Anchors for red:sms-cost-guard — each reintroduces, on the real file, a defect in the SMS credit
 * floor or the balance reading it runs on (and, since 2026-09-26, the alarm and the /admin/system tile). DATA, so `test:red-anchors` §3 can audit that every
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
    // ⚠️ RE-ANCHORED 2026-09-26: sendBatch's inline copy of the refresh was replaced by the one
    // `refreshSmsBalance` path; the defect (no refresh before the floor decides) is unchanged.
    name: "sms.ts — a missing or stale reading is no longer refreshed from the balance endpoint",
    file: "src/lib/server/sms.ts",
    from: `    await refreshSmsBalance({ maxAgeMs: balanceTtlMs() });`,
    to: `    /* no refresh before the floor decides */`,
    expect: `§3 …because the stale reading was replaced by a real balance read`,
  },

  // ══ 2026-09-26 · owner rulings D7/D8 — the one refresh path, the alarm, the admin tile ══════════
  {
    // "TZS 30 on the card → top up → send" refused for up to 15 minutes on a figure already false.
    name: "sms.ts — a low reading is trusted by the floor without a re-check",
    file: "src/lib/server/sms.ts",
    from: `    if (smsBalanceSnapshot().belowFloor) await refreshSmsBalance({ maxAgeMs: LOW_READING_RECHECK_MS });`,
    to: `    /* no re-check before refusing */`,
    expect: `§3 ⭐ a LOW reading over a minute old is re-checked before refusing: a top-up is honoured`,
  },
  {
    name: "sms.ts — a fresh reading is not reused, so every render calls the vendor",
    file: "src/lib/server/sms.ts",
    from: `  if (before.tzs !== null && before.at !== null && Date.now() - before.at < (opts.maxAgeMs ?? 60_000)) return answer("reused");`,
    to: `  /* no reuse */`,
    expect: `§7 a reading under a minute old is reused: a page render cannot hammer the vendor`,
  },
  {
    // The balance endpoint validates before it authenticates: a refusal answers balance 0.0.
    name: "sms.ts — a refused balance read's 0.0 is taken as the balance",
    file: "src/lib/server/sms.ts",
    from: `    const tzs = r.ok ? r.balance : null;`,
    to: `    const tzs = r.balance;`,
    expect: `§7 ⛔ a REFUSED read records nothing: its 0.0 is not the account's balance, and unknown is never low`,
  },
  {
    // The read is the one free live credential check; an outage reported as "refused" sends the operator to
    // re-issue keys that were never wrong.
    name: "sms.ts — every failed balance read is reported as refused",
    file: "src/lib/server/sms.ts",
    from: `    return { tzs: null, error: r.transport !== null || r.httpStatus >= 500 ? "unreachable" : "refused" };`,
    to: `    return { tzs: null, error: "refused" };`,
    expect: `§7 no response, or the vendor's own 5xx, says UNREACHABLE: an outage never reads as wrong credentials`,
  },
  {
    // The verdict survives only as long as the request: a reload inside the retry window forgets why it failed.
    name: "sms.ts — a failed read forgets why it failed",
    file: "src/lib/server/sms.ts",
    from: `      if (r.tzs === null) { st.failedAt = Date.now(); st.error = r.error; return false; }`,
    to: `      if (r.tzs === null) { st.failedAt = Date.now(); return false; }`,
    expect: `§7 a refused read says REFUSED, so the card can tell wrong credentials from an outage`,
  },
  {
    // A hanging vendor re-paid its full timeout on every reload of the kill-switch page.
    name: "sms.ts — a failed read is not remembered",
    file: "src/lib/server/sms.ts",
    from: `  if (!st.inflight && st.failedAt !== null && Date.now() - st.failedAt < balanceRetryMs()) return answer("failed");`,
    to: `  /* failure not remembered */`,
    expect: `§7 a read that failed moments ago is not repeated: a reload cannot re-pay a failing vendor`,
  },
  {
    name: "sms.ts — concurrent callers each send their own balance request",
    file: "src/lib/server/sms.ts",
    from: `  if (st.inflight) return st.inflight;`,
    to: `  /* no in-flight sharing */`,
    expect: `§7 two concurrent reads share ONE request`,
  },
  {
    // The System page (and its maintenance kill-switch) waited out the vendor's 8 s timeout.
    name: "sms.ts — the render budget is ignored",
    file: "src/lib/server/sms.ts",
    from: `  if (budgetMs === undefined) return p;`,
    to: `  return p;`,
    expect: `§7 ⛔ a slow vendor cannot hold a render: the read returns within its budget`,
  },
  {
    name: "sms.ts — a restart swallows a balance that is already low",
    file: "src/lib/server/sms.ts",
    from: `  } else if (prev === null && tzs <= threshold) {`,
    to: `  } else if (false) {`,
    expect: `§4b a first reading after a restart already at or below the alert line raises ONE alarm`,
  },
  {
    // Every push to main is a restart; an alarm per deploy is noise that gets ignored.
    name: "sms.ts — every restart re-raises the low-balance alarm",
    file: "src/lib/server/sms.ts",
    from: `    if (Number.isFinite(last) && Date.now() - last < BOOT_ALARM_REPEAT_MS) return;`,
    to: `    /* every restart alarms */`,
    expect: `§4b …and a second restart inside a day does not raise it again: a restart is not a crossing`,
  },
  {
    // The alarm as it shipped: an audit row nothing read.
    name: "sms.ts — the low-balance alarm reaches nobody",
    file: "src/lib/server/sms.ts",
    from: `    .then((m) => m.notifyAdminsSmsCreditLow({ tzs, alertTzs: threshold, floorTzs: floor }))`,
    to: `    .then(() => undefined)`,
    expect: `§4c the alarm reaches the officers: a SECURITY bell row that links to /admin/system`,
  },
  {
    name: "admin/system — the page waits for the vendor with no budget",
    file: "src/app/admin/system/page.tsx",
    from: `  const smsRead = refreshSmsBalance({ maxAgeMs: 60_000, budgetMs: SMS_BALANCE_RENDER_BUDGET_MS }).catch(() => null);`,
    to: `  const smsRead = refreshSmsBalance({ maxAgeMs: 60_000 }).catch(() => null);`,
    expect: `§8 the System page reads the balance live within its render budget`,
  },
  {
    // /api/health published whatever the process last saw: null after a deploy, then that figure forever.
    name: "api/health — the balance is no longer refreshed",
    file: "src/app/api/health/route.ts",
    from: `    const smsRead = refreshSmsBalance({ maxAgeMs: 60_000, budgetMs: SMS_BALANCE_HEALTH_BUDGET_MS }).catch(() => null);`,
    to: `    const smsRead = Promise.resolve(null);`,
    expect: `§8 /api/health refreshes the balance within a short budget`,
  },
  {
    // An unconfirmed figure shown as today's credit, exactly as the tile did before D7.
    name: "sms-credit-tile — an unconfirmed reading is shown as current",
    file: "src/app/admin/system/sms-credit-tile.ts",
    from: `  const confirmed = i.read !== null && (i.read.outcome === "fresh" || i.read.outcome === "reused");`,
    to: `  const confirmed = true;`,
    expect: `§9 …a read still in flight too: never shown as current`,
  },
  {
    // A figure the gate itself treats as unknown, headlined as the credit — "TZS 185" from hours ago.
    name: "sms-credit-tile — a reading past the TTL is headlined as today's credit",
    file: "src/app/admin/system/sms-credit-tile.ts",
    from: `  if (s.stale) {`,
    to: `  if (false) {`,
    expect: `§9 stale: a reading past the TTL is headlined as a dash, its figure and time in the caption`,
  },
  {
    // "Couldn't read" with no reason: wrong keys and an outage look the same.
    name: "sms-credit-tile — an unknown balance no longer says why",
    file: "src/app/admin/system/sms-credit-tile.ts",
    from: `    const why = unknownBecause(i.read, i.provider, name);`,
    to: `    const why = null;`,
    expect: `§9 unknown says WHY: wrong credentials read differently from an outage`,
  },
  {
    // DG-A-10: "▲ 14 entries" — an arrow on a count, beside the SMS tile.
    name: "admin/system — the Audit chain tile draws an arrow again",
    file: "src/app/admin/system/page.tsx",
    from: `tone={chain.valid ? "success" : "danger"} pulse={!chain.valid} />`,
    to: `deltaDir={chain.valid ? "up" : "down"} pulse={!chain.valid} />`,
    expect: `§8 the Audit chain tiles carry valid/broken by word and tone, never an arrow`,
  },
  {
    // "blackball · 0" / "sent · TZS 185" at 360 — read as money sent.
    name: "sms-credit-tile — the count may break from its noun",
    file: "src/app/admin/system/sms-credit-tile.ts",
    from: "${SEP}${keep(`${i.health.sent} sent`)} since restart",
    to: "${SEP}${i.health.sent} sent since restart",
    expect: `§9 …and never splits inside 'N sent' or the rate`,
  },
  {
    // Low credit was a grey arrow in the same ink as every other caption.
    name: "sms-credit-tile — below the alert line loses its warning ink",
    file: "src/app/admin/system/sms-credit-tile.ts",
    from: `  const tone: SmsCreditTile["tone"] = s.belowFloor ? "danger" : s.belowAlert ? "warning" : undefined;`,
    to: `  const tone: SmsCreditTile["tone"] = s.belowFloor ? "danger" : undefined;`,
    expect: `§9 below the alert line: the word, in warning ink`,
  },
];
