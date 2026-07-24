/**
 * OPS — stand up exactly ONE Up & Down chain, so the design and the live timer can be
 * seen on a real board.
 *
 *   railway run npx tsx scripts/ops-updown-seed-one.mts
 *   railway run npx tsx scripts/ops-updown-seed-one.mts -- --stop   (stop it again)
 *
 * ⚠️ THIS WRITES TO WHATEVER DATABASE `DATABASE_URL` POINTS AT. Run it through
 * `railway run` so the environment is explicit, and read the summary it prints.
 *
 * It goes through the SAME service functions the admin UI calls — `addSource`,
 * `createAsset`, `setAssetEnabled`, `createChain`, `setChainState` — so the
 * trusted-source gate, the winner-floor guardrail and every audit entry apply exactly
 * as if an operator had clicked. Nothing here bypasses a control.
 *
 * What it creates: ONE asset (Gold) and ONE 5-minute chain, started. The chain
 * scheduler then opens rounds on the grid by itself.
 *
 * What it will NOT do: invent a price. Without ANTHROPIC_API_KEY the oracle cannot
 * confirm a reading, so rounds open and honestly show "awaiting read" rather than a
 * fabricated number — and a boundary that never confirms VOIDS its round and refunds
 * every stake in full.
 *
 * Idempotent: re-running finds what exists and only fills the gaps.
 */
import { seedDefaultSources, addSource, listSources } from "../src/lib/server/source-registry.ts";
import {
  createAsset, setAssetEnabled, createChain, setChainState,
  listAssets, listChains,
} from "../src/lib/server/updown-config.ts";
import { roundStore } from "../src/lib/server/updown-dal.ts";

const ACTOR = "ops_seed_one";
const STOP = process.argv.includes("--stop");

const url = process.env.DATABASE_URL ?? "";
if (!url) {
  console.error("✗ DATABASE_URL is not set. Run this through `railway run` so the target is explicit.");
  process.exit(1);
}
// Host only — never print credentials.
console.log(`target: ${(() => { try { return new URL(url).host; } catch { return "unparseable"; } })()}`);
console.log(`mode:   ${STOP ? "STOP the chain" : "SEED one asset + one 5-min chain"}\n`);

// ── STOP ─────────────────────────────────────────────────────────────────────
if (STOP) {
  const chains = await listChains();
  let stopped = 0;
  for (const c of chains.filter((x) => x.state === "RUNNING")) {
    const r = await setChainState(c.id, "STOPPED", ACTOR);
    if (r.ok) { stopped++; console.log(`  stopped chain ${c.id} (${c.durationMinutes}m)`); }
    else console.log(`  ✗ ${c.id}: ${r.error}`);
  }
  console.log(`\n✓ stopped ${stopped} chain(s). Rounds already open settle normally — no player is left holding an unsettled stake.`);
  process.exit(0);
}

// ── SEED ─────────────────────────────────────────────────────────────────────
await seedDefaultSources();

// The asset's price source must be an ENABLED trusted source in its category. Kitco is
// the natural metals source; add it if this deployment does not have it yet. That is an
// audited admin action, exactly as it would be from /admin/sources.
const sources = await listSources({ enabledOnly: true });
if (!sources.some((s) => s.domain === "kitco.com")) {
  await addSource({
    domain: "kitco.com", label: "Kitco", category: "macro",
    rationale: "Spot precious-metals prices — Up & Down resolution source.",
    addedBy: ACTOR,
  });
  console.log("  + trusted source kitco.com (macro)");
} else {
  console.log("  = trusted source kitco.com already present");
}

const assets = await listAssets();
let gold = assets.find((a) => a.key === "XAU");
if (!gold) {
  const r = await createAsset({
    key: "XAU", symbol: "XAU/USD",
    nameEn: "Gold", nameSw: "Dhahabu", nameZh: "黄金",
    iconKey: "gold",
    priceSourceUrl: "https://www.kitco.com/price/precious-metals",
    category: "macro", decimals: 2, minMoveTicks: 1, sortOrder: 0,
  }, ACTOR);
  if (!r.ok) { console.error(`✗ create asset: ${r.error}`); process.exit(1); }
  gold = r.data;
  console.log("  + asset XAU (Gold) — created DISABLED, as designed");
} else {
  console.log("  = asset XAU already exists");
}

if (!gold.enabled) {
  const e = await setAssetEnabled(gold.id, true, ACTOR);
  if (!e.ok) { console.error(`✗ enable asset: ${e.error}`); process.exit(1); }
  console.log("  + asset enabled (source re-checked at enable time)");
}

const chains = await listChains({ assetId: gold.id });
let chain = chains.find((c) => c.durationMinutes === 5);
if (!chain) {
  const c = await createChain({ assetId: gold.id, durationMinutes: 5 }, ACTOR);
  if (!c.ok) { console.error(`✗ create chain: ${c.error}`); process.exit(1); }
  chain = c.data;
  console.log("  + 5-minute chain — created STOPPED, as designed");
} else {
  console.log("  = 5-minute chain already exists");
}

if (chain.state !== "RUNNING") {
  const s = await setChainState(chain.id, "RUNNING", ACTOR);
  if (!s.ok) { console.error(`✗ start chain: ${s.error}`); process.exit(1); }
  console.log("  + chain STARTED");
}

const fresh = (await listChains({ assetId: gold.id })).find((c) => c.durationMinutes === 5)!;
const rounds = await roundStore.list({ chainId: fresh.id, limit: 3 });

console.log(`\n✓ ONE chain running: XAU · 5 min`);
console.log(`  next boundary : ${fresh.nextBoundaryAt ?? "(arming)"}`);
console.log(`  rounds so far : ${rounds.length}`);
for (const r of rounds) {
  console.log(`    #${r.roundNumber} opens ${r.opensAt} closes ${r.closesAt} open=${r.openPrice ?? "—"} outcome=${r.outcome ?? "pending"}`);
}
console.log(`\n  Board: https://www.50pick.tz/updown`);
console.log(`  The price will read "—  awaiting read" until ANTHROPIC_API_KEY is set — the`);
console.log(`  oracle refuses to invent one. The countdown and the whole card are live.`);
console.log(`\n  To stop:  railway run npx tsx scripts/ops-updown-seed-one.mts -- --stop`);
