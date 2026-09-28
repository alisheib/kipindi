// Landing v3 · WP3 + WP4 — put the states the featured card and the board rows must show on the LOCAL book.
//   BASE=http://localhost:3057 OUT=<dir with seed-markets.json (+ resolve-seed.json, seed-onesided-phase*.json)> STEP=tick|crowd node scripts/qa/landing-v3/wp34-seed.mjs
// STEP=tick  — market T: two-sided money (3 YES + 3 NO bettors, 2,000 each), then its readings are moved 30 hours
//              back (POST /api/dev-test/backdate-history — dev-only, in-memory), then NO 4,000 and YES 2×3,000 are
//              placed TODAY: the day's first reading is 38% and the last 55%, so the featured card draws its 24h
//              mark at 38 and prints "▲17 · 24h ago". T is pulled to close in 5 hours, so it is the one market
//              closing today and takes the featured seat (hero.ts: priced first, closing today first). 9 bettors:
//              BELOW the predictor floor (10), so the featured card withholds its count and its crest row.
// STEP=crowd — three more bettors on T (12, past the floor: the count shows) and T pulled to close in 40 minutes:
//              the minutes label and SOON in every locale (L17), with the top row at its most crowded.
// Writes <OUT>/wp34-seats.json { T, closesAt, pools, predictors, move }.
// ⛔ Dev-only endpoints (404 in production). Never point BASE at production.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const BASE = (process.env.BASE || "http://localhost:3057").replace(/\/$/, "");
const OUT = process.env.OUT || ".qa-shots/landing-v3/wp34";
const STEP = process.env.STEP || "tick";
if (!/localhost/.test(BASE)) { console.error(`refusing: ${BASE} is not local`); process.exit(2); }

const post = async (path, body) => {
  const r = await fetch(`${BASE}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body ?? {}) });
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  console.log(`${path} ${JSON.stringify(body ?? {}).slice(0, 110)} → HTTP ${r.status}`);
  if (r.status !== 200) { console.error(text.slice(0, 300)); process.exitCode = 1; }
  return json ?? {};
};
const bet = async (marketId, n, stake, yesRatio, userPrefix) => {
  const j = await post("/api/dev-test/stress-bulk-bet", { marketId, n, stake, yesRatio, userPrefix });
  if (!j.accepted) { console.error(`bet ${userPrefix}: nothing accepted ${JSON.stringify(j).slice(0, 200)}`); process.exitCode = 1; }
  return j;
};

const SEATS = join(OUT, "wp34-seats.json");
if (STEP === "tick") {
  // A market no other seed touches: not the settled-row seed's (the FIRST live markets) and not seed-onesided's
  // seats (the LAST seven), so every phase of every drive can run in one boot.
  const seeded = JSON.parse(readFileSync(join(OUT, "seed-markets.json"), "utf8"));
  const used = new Set();
  for (const f of ["resolve-seed.json", "seed-onesided-phase1.json", "seed-onesided-phase2.json"]) {
    const p = join(OUT, f);
    if (existsSync(p)) for (const id of readFileSync(p, "utf8").match(/mkt_[A-Za-z0-9_]+/g) ?? []) used.add(id);
  }
  const pool = (seeded.ids ?? []).map((x) => x.id).filter((id) => !used.has(id));
  const T = pool[Math.floor(pool.length / 2)];
  if (!T) { console.error("no unused live market for T"); process.exit(1); }
  await bet(T, 3, 2_000, 1, "wa");
  await bet(T, 3, 2_000, 0, "wb");
  const back = await post("/api/dev-test/backdate-history", { marketId: T, hours: 30 });
  if (!back.ok) { console.error("backdate failed — the mark cannot be shown locally"); process.exit(1); }
  await bet(T, 1, 4_000, 0, "wc");
  const last = await bet(T, 2, 3_000, 1, "wd");
  await post("/api/dev-test/fast-forward-market", { marketId: T, seconds: 6 * 3600, selectionSeconds: 5 * 3600 });
  const yes = last.marketYesPool, no = last.marketNoPool;
  const seat = { T, step: "tick", pools: { yes, no }, predictors: 9, expect: { yesPct: Math.round((yes / (yes + no)) * 100), dayAgo: 38, move: Math.round((yes / (yes + no)) * 100) - 38 } };
  writeFileSync(SEATS, JSON.stringify(seat, null, 2));
  console.log(`T=${T} pools ${yes}/${no} — expect the mark at 38 and ▲${seat.expect.move}; 9 bettors (count withheld)`);
} else if (STEP === "crowd") {
  const seat = JSON.parse(readFileSync(SEATS, "utf8"));
  const j = await bet(seat.T, 3, 1_000, 0.34, "we");
  await post("/api/dev-test/fast-forward-market", { marketId: seat.T, seconds: 3600, selectionSeconds: 40 * 60 });
  seat.step = "crowd";
  seat.pools = { yes: j.marketYesPool, no: j.marketNoPool };
  seat.predictors = 12;
  writeFileSync(SEATS, JSON.stringify(seat, null, 2));
  console.log(`T=${seat.T} pools ${seat.pools.yes}/${seat.pools.no}; 12 bettors (count shows); closes in 40 minutes (SOON)`);
} else {
  console.error(`STEP must be tick or crowd, not ${STEP}`);
  process.exit(2);
}
