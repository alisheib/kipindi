// Landing v3 · WP6 — put money on the local (in-memory) book so a one-sided, a lopsided and a
// contested market all exist. The dev seed places no bets, so without this a local V17 of 0 proves
// nothing (every card is the cold-start state).
//   BASE=http://localhost:3057 OUT=<dir with seed-markets.json + resolve-seed.json> PHASE=1|2 node scripts/qa/landing-v3/seed-onesided.mjs
// PHASE 1 — one-sided markets only (so the FEATURED card and the board rows are one-sided):
//   O1 YES only 2×25,000 · O2 NO only 1×30,000 · O3 YES only 1×12,000
// PHASE 2 — then three contested markets and one lopsided two-sided market (25,000-scale vs 100 is
//   below the TZS 1,000 minimum stake, so 200,000 vs 1,000 = 99.5%, which Math.round makes 100):
//   the hero fills with priced markets, a one-sided market is left for a board row and the grid.
// Writes <OUT>/seed-onesided-phase<N>.json with each market's id and resulting pools.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE || "http://localhost:3057";
const OUT = process.env.OUT || ".qa-shots/landing-v3/wp6";
const PHASE = Number(process.env.PHASE || 1);

const seeded = JSON.parse(readFileSync(join(OUT, "seed-markets.json"), "utf8"));
let resolvedIds = new Set();
try {
  const raw = readFileSync(join(OUT, "resolve-seed.json"), "utf8");
  resolvedIds = new Set(raw.match(/mkt_[A-Za-z0-9_]+/g) ?? []);
} catch {}
const pool = (seeded.ids ?? []).map((x) => x.id).filter((id) => !resolvedIds.has(id));
if (pool.length < 10) { console.error(`only ${pool.length} unused live markets`); process.exit(1); }

// Fixed seats, so phase 2 never re-uses a phase-1 market.
const SEATS = { O1: pool[3], O2: pool[4], O3: pool[5], C1: pool[6], C2: pool[7], C3: pool[8], L: pool[9] };

const bet = async (marketId, n, stake, yesRatio, userPrefix) => {
  const r = await fetch(`${BASE}/api/dev-test/stress-bulk-bet`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ marketId, n, stake, yesRatio, userPrefix }),
  });
  const j = await r.json().catch(() => ({}));
  const accepted = j.accepted ?? null;
  if (r.status !== 200 || !accepted) {
    console.error(`bet ${marketId} ${userPrefix}: HTTP ${r.status} accepted=${accepted} ${JSON.stringify(j).slice(0, 300)}`);
    process.exitCode = 1;
  }
  return { status: r.status, accepted, yesPool: j.marketYesPool, noPool: j.marketNoPool, rejected: j.rejected, errors: j.errors ?? j.rejections };
};

const plan = PHASE === 1
  ? [
      ["O1", 2, 25_000, 1, "oa"],
      ["O2", 1, 30_000, 0, "ob"],
      ["O3", 1, 12_000, 1, "oc"],
    ]
  : [
      ["C1", 2, 3_000, 1, "ca"], ["C1", 1, 2_000, 0, "cb"],
      ["C2", 2, 4_000, 1, "cc"], ["C2", 2, 3_000, 0, "cd"],
      ["C3", 1, 5_000, 1, "ce"], ["C3", 2, 4_000, 0, "cf"],
      ["L", 1, 200_000, 1, "la"], ["L", 1, 1_000, 0, "lb"],
    ];

const log = [];
for (const [seat, n, stake, yesRatio, prefix] of plan) {
  const r = await bet(SEATS[seat], n, stake, yesRatio, prefix);
  log.push({ seat, marketId: SEATS[seat], n, stake, side: yesRatio ? "YES" : "NO", ...r });
  console.log(`phase ${PHASE} ${seat} ${SEATS[seat]} ${n}×${stake} ${yesRatio ? "YES" : "NO"} → HTTP ${r.status} accepted=${r.accepted} pools=${r.yesPool}/${r.noPool}`);
}
writeFileSync(join(OUT, `seed-onesided-phase${PHASE}.json`), JSON.stringify({ seats: SEATS, log }, null, 2));
