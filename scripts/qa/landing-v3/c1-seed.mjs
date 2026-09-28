// Landing v3 · C1 — seed every price state the C1 drive reads, on the LOCAL in-memory store, and write
// <OUT>/c1-seats.json (seat → market id, round id, and the pools the seed produced — the drive's PRECONDITION).
//   BASE=http://localhost:3057 OUT=<dir> node scripts/qa/landing-v3/c1-seed.mjs
// Expects <OUT>/seed-markets.json (POST /api/dev-test/seed-markets) and a fresh Up & Down seed + advance.
// Seats (spec §7):
//   S1 settled one-sided (YES only, resolved YES, settled) · S2 one-sided resolved AGAINST its money, unsettled
//   P1 two-sided, resolved (plus one stage-1 and one contested LIVE from the same call)
//   O1 YES 2×25,000 · O2 NO 30,000 · O3 YES 12,000 (seed-onesided.mjs PHASE=1)
//   E2 closed by time, never bet · F fresh, never bet
//   UD1 an open Up & Down round funded on ONE side · UD2 one funded on both
//   C1–C3 contested · L 200,000 v 1,000 (seed-onesided.mjs PHASE=2)
// ⛔ Dev-only endpoints (404 in production). Never point BASE at production.
import { readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const BASE = (process.env.BASE || "http://localhost:3057").replace(/\/$/, "");
const OUT = process.env.OUT || ".qa-shots/landing-v3/c1";
if (!/localhost/.test(BASE)) { console.error(`refusing: ${BASE} is not local`); process.exit(2); }

const post = async (path, body) => {
  const r = await fetch(`${BASE}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body ?? {}) });
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  console.log(`${path} ${JSON.stringify(body ?? {}).slice(0, 120)} → HTTP ${r.status}`);
  return { status: r.status, json, text };
};

// ── 1 · the resolved seats, one call each; every output lands in resolve-seed.json so later seats skip them ──
const resolveLog = join(OUT, "resolve-seed.json");
writeFileSync(resolveLog, "");
const resolveSeat = async (body) => {
  const r = await post("/api/dev-test/resolve-seed-markets", body);
  appendFileSync(resolveLog, r.text + "\n");
  if (r.status !== 200 || !r.json?.ok) throw new Error(`resolve-seed-markets failed: ${r.text.slice(0, 300)}`);
  return r.json.markets;
};
const s1 = await resolveSeat({ markets: 1, bettors: 2, stake: 1000, side: "YES", outcome: "YES", stage: "complete", settle: true });
const s2 = await resolveSeat({ markets: 1, bettors: 2, stake: 1000, side: "YES", outcome: "NO", stage: "complete" });
const def = await resolveSeat({ markets: 3, bettors: 4, stake: 1000 });

// ── 2 · one-sided money on the open book (O1–O3) ─────────────────────────────────────────────────────
const phase = (n) => {
  const r = spawnSync(process.execPath, ["scripts/qa/landing-v3/seed-onesided.mjs"], { env: { ...process.env, BASE, OUT, PHASE: String(n) }, encoding: "utf8" });
  process.stdout.write(r.stdout ?? ""); process.stderr.write(r.stderr ?? "");
  if (r.status !== 0) throw new Error(`seed-onesided PHASE=${n} exited ${r.status}`);
  return JSON.parse(readFileSync(join(OUT, `seed-onesided-phase${n}.json`), "utf8"));
};
const p1 = phase(1);

// ── 3 · E2 (closed by time, never bet) and F (fresh): untouched markets that no other seat uses ──────────
const seeded = JSON.parse(readFileSync(join(OUT, "seed-markets.json"), "utf8"));
const resolvedIds = new Set(readFileSync(resolveLog, "utf8").match(/mkt_[A-Za-z0-9_]+/g) ?? []);
const unused = (seeded.ids ?? []).map((x) => x.id).filter((id) => !resolvedIds.has(id));
const taken = new Set(Object.values(p1.seats));
const free = unused.filter((id) => !taken.has(id));
const E2 = free[0];
const F = free[1];
if (!E2 || !F) throw new Error(`no untouched market left for E2/F (${free.length} free)`);
await post("/api/dev-test/fast-forward-market", { marketId: E2, seconds: -60 });

// ── 4 · Up & Down: an open round funded on ONE side (UD1) and one on both (UD2) ─────────────────────────
const board = await (await fetch(`${BASE}/updown`)).text();
const roundIds = [...new Set(board.match(/udr_[a-z0-9]+/g) ?? [])];
const rounds = [];
for (const rid of roundIds.slice(0, 12)) {
  const html = await (await fetch(`${BASE}/updown/${rid}`)).text();
  const m = /marketId\\?":\\?"(mkt_[A-Za-z0-9_]+)/.exec(html);
  if (m) rounds.push({ roundId: rid, marketId: m[1] });
}
const ud = { UD1: null, UD2: null };
for (const [seat, yesRatio] of [["UD1", 1], ["UD2", 0.5]]) {
  for (const r of rounds) {
    if (Object.values(ud).some((x) => x?.roundId === r.roundId)) continue;
    const b = await post("/api/dev-test/stress-bulk-bet", { marketId: r.marketId, n: 2, stake: 2_000, yesRatio, userPrefix: seat.toLowerCase() });
    if (b.status === 200 && b.json?.accepted > 0) {
      ud[seat] = { ...r, yesPool: b.json.marketYesPool, noPool: b.json.marketNoPool, accepted: b.json.accepted };
      break;
    }
  }
}

// ── 5 · the contested seats and the lopsided two-sided one (C1–C3, L) ────────────────────────────────────
const p2 = phase(2);

const byState = (list, state) => (list ?? []).find((m) => m.state === state)?.id ?? null;
const pools = {};
for (const e of [...p1.log, ...p2.log]) pools[e.seat] = { yesPool: e.yesPool, noPool: e.noPool };
const seats = {
  S1: s1?.[0]?.id ?? null, S2: s2?.[0]?.id ?? null,
  P1: byState(def, "complete"), P1_stage1: byState(def, "stage1"), P1_live: byState(def, "bets"),
  ...p1.seats, ...Object.fromEntries(Object.entries(p2.seats).filter(([k]) => /^(C1|C2|C3|L)$/.test(k))),
  E2, F, UD1: ud.UD1, UD2: ud.UD2,
};
const precondition = {
  S1: s1?.[0] ?? null, S2: s2?.[0] ?? null, pools,
  UD1: ud.UD1 ? { yesPool: ud.UD1.yesPool, noPool: ud.UD1.noPool } : null,
  UD2: ud.UD2 ? { yesPool: ud.UD2.yesPool, noPool: ud.UD2.noPool } : null,
};
writeFileSync(join(OUT, "c1-seats.json"), JSON.stringify({ seats, precondition, rounds }, null, 2));
console.log(JSON.stringify(seats, null, 2));
if (!ud.UD1 || !ud.UD2) console.error("⚠️ an Up & Down seat could not be funded — the drive will report its premise as ABSENT, never green");
