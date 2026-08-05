/**
 * OPS — RETIRE AN UP & DOWN ASSET ROW that should never have existed, or no longer should.
 *
 *   railway run -s 50pick -- npx tsx scripts/ops-updown-retire-asset.mts --keys GOLD,SNP500 \
 *     --actor "<name>" --reason "<why>"
 *   …same, plus --apply
 *
 * Dry run is the DEFAULT. Nothing is removed without `--apply`.
 *
 * ── WHY THIS EXISTS ──────────────────────────────────────────────────────────
 * ⛔ THERE IS NO DELETE IN THE CONSOLE, ON PURPOSE (E-59) — a one-click "remove asset" on a
 * money surface is a worse hazard than the missing feature. But the catalogue accumulated two
 * rows that make the console lie about itself, and a screen that lists a thing it cannot use
 * teaches an operator to distrust the rest of it:
 *
 *   GOLD    a DUPLICATE of XAU — the same symbol `XAU/USD`, so the asset list showed **two rows
 *           both named Gold** and nothing on screen said which one a chain would follow.
 *   SNP500  symbol `S&P500`, which the provider does not quote at all (the catalogue's `SPX` is
 *           unsupported on this plan), pointing at `kitco.com` rather than the price feed.
 *
 * ── THE INTERLOCK, AND IT IS THE WHOLE POINT ─────────────────────────────────
 * ⛔ AN ASSET IS NOT A ROW — IT IS THE KEY EVERY REPORT GROUPS BY. `UpDownAsset.key` is stamped
 * into reports, and observations and chains hang off the id. Removing a row that anything still
 * points at would orphan a price ledger and silently change what a historical report totals.
 *
 * So this refuses unless the asset has **no chains and no observations**, and it names what it
 * found. There is no `--force`. The honest sequence is: clear the games first
 * (`ops-updown-reset-games.mts`, which has its own money interlock), then retire the row.
 *
 * ⚠️ It will not touch an ENABLED asset either. Retiring something an operator could still pick
 * from the console is a race, not a cleanup — disable it in the console first, so the decision
 * is visible on the screen where it was made.
 */
process.env.DATABASE_URL = (process.env.DATABASE_URL ?? "")
  .replace(/@postgres\.railway\.internal(:\d+)?/, "@turntable.proxy.rlwy.net:40357");
if (!process.env.DATABASE_URL) {
  console.error("✗ no DATABASE_URL — run under `railway run --service 50pick --`");
  process.exit(2);
}

const arg = (n: string) => {
  const i = process.argv.indexOf(`--${n}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const apply = process.argv.includes("--apply");
const keys = (arg("keys") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const actor = arg("actor");
const reason = arg("reason");

if (!keys.length || !actor || !reason) {
  console.error("usage: --keys A,B --actor \"<name>\" --reason \"<why>\" [--apply]");
  process.exit(2);
}

const { prisma } = await import("../src/lib/server/prisma.ts");
const db = prisma();
if (!db) { console.error("✗ no database client"); process.exit(2); }

const { audit } = await import("../src/lib/server/audit.ts");

console.log(`\nactor:  ${actor}\nreason: ${reason}\nmode:   ${apply ? "APPLY — rows will be removed" : "DRY RUN — nothing will be removed"}\n`);

const rows = await db.upDownAsset.findMany({ where: { key: { in: keys } } });
const missing = keys.filter((k) => !rows.some((r) => r.key === k));
if (missing.length) console.log(`  ·  not present (already gone): ${missing.join(", ")}`);

let blocked = 0;
const clear: typeof rows = [];
for (const a of rows) {
  const [chains, obs] = await Promise.all([
    db.upDownChain.count({ where: { assetId: a.id } }),
    db.upDownObservation.count({ where: { assetId: a.id } }),
  ]);
  const why: string[] = [];
  if (a.enabled) why.push("still ENABLED — disable it in the console first");
  if (chains) why.push(`${chains} chain(s)`);
  if (obs) why.push(`${obs} observation(s)`);
  if (why.length) { blocked++; console.log(`  ✗ ${a.key.padEnd(8)} ${a.symbol.padEnd(10)} REFUSED — ${why.join(" · ")}`); }
  else { clear.push(a); console.log(`  →  ${a.key.padEnd(8)} ${a.symbol.padEnd(10)} disabled · 0 chains · 0 observations`); }
}

if (blocked) {
  console.error(`\n✗ ${blocked} asset(s) still referenced or enabled — nothing removed. Clear the games first.`);
  process.exit(1);
}
if (!clear.length) { console.log("\nnothing to do."); process.exit(0); }
if (!apply) { console.log(`\nDRY RUN — re-run with --apply to remove ${clear.length} row(s).`); process.exit(0); }

for (const a of clear) {
  await db.upDownAsset.delete({ where: { id: a.id } });
  await audit({
    category: "COMPLIANCE",
    action: "updown.asset.retired",
    actorId: `ops:${actor}`,
    targetType: "UpDownAsset",
    targetId: a.id,
    payload: { key: a.key, symbol: a.symbol, nameEn: a.nameEn, sourceDomain: a.sourceDomain, reason },
  });
  console.log(`  ✓ ${a.key} removed and recorded`);
}

const left = await db.upDownAsset.findMany({ orderBy: { key: "asc" } });
console.log(`\nafter: ${left.length} asset(s) — ${left.map((a) => `${a.key}${a.enabled ? "" : " (off)"}`).join(", ")}`);
console.log("✅ retired, with a compliance row against the actor's name.");
