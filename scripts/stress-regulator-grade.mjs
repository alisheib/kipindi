/**
 * Regulator-grade scale stress.
 *
 * Drives /api/dev-test/stress-regulator-grade with progressively larger
 * scenarios. Each scenario asserts:
 *   • Pool math: Σ stakes ≡ Σ pools
 *   • Wallet conservation: wallet + pool = bank (constant)
 *   • Conservation through resolution: 0% ≤ implied margin ≤ 30%
 *   • Audit chain: monotonic non-decreasing
 *   • Memory delta: reasonable bound (RSS Δ < 500 MB even at peak)
 *
 * Output is the report you can hand to a regulator: a per-phase
 * timing + invariant scorecard.
 *
 *   BASE=http://localhost:3000  node scripts/stress-regulator-grade.mjs
 */
const BASE = process.env.BASE || "http://localhost:3000";

let pass = 0, fail = 0;
function log(label, ok, detail = "") {
  const t = ok ? "✓" : "✗";
  console.log(`${t} ${label}${detail ? "  →  " + detail : ""}`);
  if (ok) pass++; else fail++;
}

async function run(label, body) {
  console.log(`\n========== ${label} ==========`);
  console.log(`config: n=${body.n} markets · u=${body.u} users · b=${body.b} bets · r=${body.r} resolved`);
  const t0 = Date.now();
  const r = await fetch(`${BASE}/api/dev-test/stress-regulator-grade`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  const totalMs = Date.now() - t0;
  if (!r.ok || !j.ok) {
    log(`${label}: endpoint OK`, false, `status=${r.status} body=${JSON.stringify(j).slice(0, 200)}`);
    return;
  }
  // Phase timings
  console.log(`\n  total wall time: ${totalMs} ms`);
  for (const [phase, info] of Object.entries(j.timing)) {
    console.log(`  ${phase.padEnd(14)} ${info.ms.toString().padStart(6)} ms   ${info.ok ? "✓" : "✗"}  ${info.detail ?? ""}`);
  }

  // Invariants
  console.log();
  log(`${label}: bets accepted > 0`, j.bets.accepted > 0, `${j.bets.accepted}/${body.b}`);
  log(`${label}: pool math invariant after bets`, j.poolBetMath === "PASS", j.poolBetMath);
  log(`${label}: wallet+pool conservation after bets`, j.walletPostBet === "PASS", j.walletPostBet);
  log(`${label}: settlement implied margin in [0%, 30%]`, j.conservation.startsWith("PASS"), j.conservation);
  log(`${label}: audit chain monotonic`, j.audit.monotonic, `delta=${j.audit.delta} entries`);
  log(`${label}: memory RSS delta < 500 MB`, j.memoryDelta.rssMB < 500, `Δ ${j.memoryDelta.rssMB} MB · final ${j.memoryFinal.rssMB} MB`);

  // Stats
  console.log(`\n  positions: open=${j.positions.open} win=${j.positions.win} loss=${j.positions.loss}`);
  console.log(`  money: bank=${j.money.initialWalletSum.toLocaleString()} → post-bet wallet=${j.money.walletSumAfterBets.toLocaleString()} + pool=${j.money.totalPoolAfterBets.toLocaleString()}`);
  console.log(`  money: post-resolve wallet=${j.money.walletSumFinal.toLocaleString()} · live pool=${j.money.livePool.toLocaleString()} · settled pool=${j.money.settledPool.toLocaleString()} · paid back=${j.money.moneyPaidOut.toLocaleString()} · implied margin=${j.money.impliedMarginPct}%`);
  if (j.bets.topErrors.length > 0) {
    console.log(`\n  top rejection reasons:`);
    for (const e of j.bets.topErrors) console.log(`    ${e.count}× ${e.msg}`);
  }
}

console.log("\n=== REGULATOR-GRADE STRESS ===");

// Scenario 1: warm-up — proves the harness wires up
await run("WARMUP",   { n: 50,   u: 20,  b: 200,  r: 10,  prefix: "wm" });
// Scenario 2: realistic-load — typical day in moderate volume
await run("MODERATE", { n: 200,  u: 100, b: 2000, r: 40,  prefix: "md" });
// Scenario 3: heavy-load — Ali's target shape
await run("HEAVY",    { n: 1000, u: 200, b: 5000, r: 100, prefix: "hv" });
// Scenario 4: spike — concentrated burst, fewer users, many bets
await run("SPIKE",    { n: 100,  u: 50,  b: 5000, r: 25,  prefix: "sp" });

console.log(`\n${"=".repeat(60)}`);
console.log(`REGULATOR-GRADE  PASS: ${pass}    FAIL: ${fail}`);
console.log(`${"=".repeat(60)}`);
process.exit(fail > 0 ? 1 : 0);
