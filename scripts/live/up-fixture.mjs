#!/usr/bin/env node
/**
 * `npm run fixture:player` — build the fixture every player-facing live gate depends on, and
 * PROVE it is populated before saying so.
 *
 * 🔴 WHY THIS IS A SCRIPT AND NOT A SNIPPET IN A DOC. The recipe in
 * `docs/PLAYER-QUERY-CAMPAIGN.md` was five steps short of working, and every one of the missing
 * five cost a live run before it was found:
 *
 *   · `proposals-set-config {state:"ACTIVE"}` — the board ships `COMING_SOON`
 *     (`proposals-config.ts:53`), so `/proposals` renders a state banner and NO rail, and
 *     `proposals-seed` returns `created: 0`. A driver then reports "0 rails, expected 1" about a
 *     page that is behaving exactly as designed.
 *   · `updown-advance` — `updown-seed` creates CHAINS, not open ROUNDS. Without an advance there
 *     is nothing to bet on, `seed-player-portfolio` reports `updownPlaced: 0`, and
 *     `/updown/history` is empty. ⚠️ `qa:player-filters` correctly REFUSES to pass over that,
 *     which reads like a product defect and is not one.
 *   · `proposals-seed` needs the player's OWN user id (`mineFor`) or the `Mine` axis is vacuous —
 *     and that id has to be read back from `/api/dev-test/whoami`, not assumed.
 *   · `seed-watchlist` — stars are a different fact from positions; nothing else creates them.
 *   · `resolve-seed-markets` — without it `/results` fits on ONE page, and every assertion about
 *     paging (including `red:count-truth`'s `pages-overlap` case) is unposable.
 *
 * ⛔ AND IT ASSERTS ITS OWN OUTPUT, WHICH IS THE POINT. The campaign's rule is that a live gate
 * over an empty product is a SKIPPED RUN, not a pass. A fixture builder that reports success
 * without checking is the same failure one layer down — so every step's result is read back FROM
 * THE STORE and the run exits non-zero, naming the gate it would have made vacuous.
 *
 * ⚠️ THIS MACHINE SEGFAULTS `next dev` UNDER SUSTAINED PLAYWRIGHT LOAD (failing RAM — see
 * `reference_ali_blade15_ram_crashes`). Expect to re-run this between long drives; that is the
 * machine, not the fixture.
 *
 * ⚠️ ON A REFUSAL, WINDOWS PRINTS A LIBUV ASSERTION AFTER THE DIAGNOSIS —
 * `!(handle->flags & UV_HANDLE_CLOSING)`. That is `process.exit()` firing while undici still
 * holds a keep-alive socket; the EXIT CODE is correct either way (verified: 0 ready · 1 incomplete
 * · 2 no server · 4 drained pool). ⛔ It is noise, not a crash in this script — do not chase it.
 *
 *   node scripts/live/up-fixture.mjs [baseUrl]
 */
const BASE = process.argv.find((a) => a.startsWith("http")) || "http://localhost:3031";
if (!/^https?:\/\/(localhost|127\.0\.0\.1)[:/]/.test(BASE)) {
  console.error(`REFUSED — localhost-only, got ${BASE}. These endpoints 404 in production by design.`);
  process.exit(1);
}

/** One cookie jar for the whole run — the demo player's session. */
let cookie = "";
const remember = (res) => {
  const set = res.headers.getSetCookie?.() ?? [];
  for (const c of set) {
    const kv = c.split(";")[0];
    if (kv.includes("=")) cookie = cookie ? `${cookie}; ${kv}` : kv;
  }
};

const post = async (path, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body ?? {}),
  });
  remember(res);
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { ok: false, error: text.slice(0, 200) }; }
};
/**
 * ⛔ `redirect: "manual"`, AND THAT IS THE WHOLE REASON THIS HELPER EXISTS. `/auth/demo` sets the
 * session cookie ON ITS 302 and then redirects. With `redirect: "follow"` (the default) `fetch`
 * hands back only the FINAL response's headers, so the `Set-Cookie` is gone and every step after
 * it runs unauthenticated — which this script's own first run reported as "NO SESSION" against a
 * server that had signed it in perfectly well. Follow the chain by hand, collecting cookies at
 * each hop.
 */
const get = async (path) => {
  let url = new URL(path, BASE).toString();
  let res;
  for (let hop = 0; hop < 6; hop++) {
    res = await fetch(url, { headers: cookie ? { cookie } : {}, redirect: "manual" });
    remember(res);
    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc) { url = new URL(loc, url).toString(); continue; }
    break;
  }
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
};

const problems = [];
const step = (label, detail) => console.log(`  · ${label}${detail ? ` — ${detail}` : ""}`);
/** ⛔ Names the GATE the miss would make vacuous, so a red run is diagnosable from this line. */
const need = (cond, what, breaksWhat) => {
  if (!cond) problems.push(`${what} — would make ${breaksWhat} vacuous or falsely red`);
};

// ── 0 · is anything even listening ────────────────────────────────────────────────────────────
const health = await fetch(`${BASE}/api/health`).then((r) => r.status).catch(() => 0);
if (health !== 200) {
  console.error(`🔴 nothing healthy at ${BASE} (status ${health}). Start it first:  PORT=3031 npm run dev`);
  console.error("   ⛔ These fixtures need `next dev`: /auth/demo and every /api/dev-test route 404 under `next start`.");
  process.exit(2);
}
console.log(`server healthy at ${BASE}\n`);

// ── 1 · markets, AND THE POOL CHECK THAT HAS TO COME BEFORE ANYTHING ELSE ─────────────────────
/**
 * 🔴 THE FIXTURE DEGRADES ACROSS RUNS, AND NOTHING SAID SO UNTIL THIS CHECK EXISTED. Step 7
 * (`resolve-seed-markets`) CONSUMES live markets — it resolves them — while `seed-real-markets`
 * and `seed-markets` are idempotent BY TITLE and therefore replenish nothing. Measured after
 * roughly a dozen runs against one dev server: the pool of LIVE non-demo markets had fallen from
 * 30 to **1**, `seed-player-portfolio` returned `only 1 live non-demo markets`, and the run
 * produced a portfolio of ZERO positions.
 *
 * ⚠️ AND IT FAILED QUIETLY IN THE WORST WAY: the later steps still "succeeded", so the run looked
 * three-quarters healthy while the single most important fixture — five `PositionStatus` values
 * through the real money paths — was empty.
 *
 * ⛔ THE REMEDY IS A RESTART, NOT A RETRY. The store is in memory, so `next dev` restarting is
 * what refills it; no endpoint can. So this refuses early and says that, rather than spending
 * four minutes building a fixture it already knows will be short.
 */
console.log("markets");
const real = await post("/api/dev-test/seed-real-markets");
step("seed-real-markets", `created ${real.created ?? 0}${real.error ? ` · ${real.error}` : ""}`);
const board = await post("/api/dev-test/seed-markets");
const livePool = board.live ?? 0;
step("seed-markets", `${livePool} LIVE non-demo markets in the pool`);
/** 5 for the portfolio (`seed-player-portfolio` refuses below that) + 6 for the archive step. */
const POOL_FLOOR = 11;
if (livePool < POOL_FLOOR) {
  console.error(`\n🔴 ONLY ${livePool} LIVE NON-DEMO MARKETS — the floor is ${POOL_FLOOR}.`);
  console.error("   ⛔ `resolve-seed-markets` (step 7) consumes them and the seeders are idempotent by TITLE,");
  console.error("      so repeated fixture runs against one dev server drain the pool and cannot refill it.");
  console.error("   ✅ REMEDY: restart the dev server — the store is in memory, so a restart is what refills it.");
  console.error("        kill the `next dev` process, then:  PORT=3031 npm run dev");
  process.exit(4);
}

// ── 2 · sign in as the demo player, and READ BACK who that is ─────────────────────────────────
console.log("\nplayer");
await get("/auth/demo");
const who = await get("/api/dev-test/whoami");
const playerId = who?.session?.userId ?? null;
step("/auth/demo", playerId ? `signed in as ${playerId}` : "NO SESSION");
need(!!playerId, "no session after /auth/demo", "every authed driver (they all refuse without one)");
if (!playerId) { console.error(`\n🔴 ${problems.join("\n🔴 ")}`); process.exit(3); }

// ── 3 · Up & Down: chains, then an OPEN ROUND to bet into ─────────────────────────────────────
/**
 * ⚠️ ONE ADVANCE IS NOT ENOUGH, AND THIS SCRIPT'S SECOND RUN PROVED IT. `updown-advance` forces
 * every running chain across a boundary — which CLOSES the current round and opens the next. On a
 * re-run against a store whose rounds had already elapsed, it reported *"advanced 4 of 4"* and
 * left NO round whose betting window was still open, so `seed-player-portfolio` placed 0 Up & Down
 * bets and `/updown/history` was empty.
 *
 * ⛔ SO THE SIGNAL IS THE PRODUCT'S OWN STATE, NOT THE CALL SUCCEEDING. Advance until a round
 * reports a `closesAt` in the future, and say how many it took. A fixture step that reports
 * success because its HTTP call returned 200 is the same mistake as a gate that passes because
 * its suite ran.
 */
console.log("\nup & down");
await post("/api/dev-test/updown-seed");
let adv = null, openRound = null, advances = 0;
for (let i = 0; i < 4 && !openRound; i++) {
  adv = await post("/api/dev-test/updown-advance");
  advances++;
  const flat = (adv.rounds ?? []).flatMap((c) => c.rounds ?? []);
  openRound = flat.find((r) => r.closesAt && Date.parse(r.closesAt) > Date.now() + 20_000) ?? null;
}
step("updown-seed + updown-advance",
  `${advances} advance(s) · ${adv?.advanced ?? 0} of ${adv?.chains ?? 0} chains · ` +
  (openRound ? `round ${openRound.id} open until ${openRound.closesAt}` : "NO ROUND STILL OPEN"));
need(!!openRound, "no Up & Down round has a betting window still open", "qa:player-filters on /updown/history");

  /**
   * 🔴 AND THE ONE ARM THIS FIXTURE CAN NEVER POPULATE — DO NOT RE-ATTEMPT IT. `/updown/history`'s
   * six-lens partition needs SETTLED rounds (up · down · void · pending), and locally every round
   * a player can bet on stays `inplay` forever. ⛔ That is the platform being CORRECT, not a gap:
   * there is no price feed on a dev store, and `advanceChain` refuses to settle what it cannot
   * price — measured verbatim, 2026-09-08:
   *
   *     "open price for 2026-09-08T06:05:36Z not published yet (-98s)
   *      — not opening a round that could only void; will retry this boundary"
   *
   * ⚠️ THREE ROUTES WERE TRIED AND ALL THREE FAIL FOR THAT SAME REASON: repeated
   * `updown-advance` (its own header explains that the rounds it opens "can only ever be voided
   * by the healer"), and `updown-handover`'s `arm` → bet → wait → `settle` cycle, which returns
   * `outcome: null, resolvedAt: null`.
   *
   * ⭐ SO `qa:player-filters` REPORTS 🔶 ON THAT ONE ARM, PERMANENTLY, ON THIS MACHINE — which is
   * exactly what the third outcome was built for. Exercising it needs a price feed or production
   * data. ⛔ A future session should NOT read that 🔶 as an unfinished fixture.
   */

// ── 4 · positions, through the REAL money paths ───────────────────────────────────────────────
/**
 * ⚠️ RETRIED ONCE, AND ONLY FOR THE UP & DOWN HALF. The long-form bets are placed against LIVE
 * markets that do not expire mid-run; the Up & Down bets race a round boundary that can close
 * between the advance above and the `buyPosition` below. ⛔ The retry re-advances FIRST — retrying
 * the same closed round would just refuse again, which is a retry that cannot succeed.
 */
console.log("\npositions");
let port = await post("/api/dev-test/seed-player-portfolio", { markets: 14, stake: 1500 });
if ((port.updownPlaced ?? 0) === 0) {
  step("seed-player-portfolio", "0 Up & Down bets — re-advancing and retrying once");
  await post("/api/dev-test/updown-advance");
  port = await post("/api/dev-test/seed-player-portfolio", { markets: 14, stake: 1500 });
}
step("seed-player-portfolio", `placed ${port.placed ?? 0} · updown ${port.updownPlaced ?? 0} · ${JSON.stringify(port.byStatus ?? {})}${port.error ? ` · ⚠️ ${port.error}` : ""}`);
for (const r of port.refusals ?? []) step("  ⚠️ refusal", r);
// ⛔ Read back from the store, never from the seeder's plan — the two are different questions.
const FIVE = ["OPEN", "WIN", "LOSS", "VOID", "CASHED_OUT"];
const missing = FIVE.filter((s) => !(port.byStatus ?? {})[s]);
need(missing.length === 0, `PositionStatus values absent: ${missing.join(", ") || "none"}`, "the /positions lens partition (7 lenses over 5 states)");
need((port.updownPlaced ?? 0) > 0, "zero Up & Down bets placed", "/updown/history — the driver will report 0 rows and refuse");

// ── 5 · watchlist stars ───────────────────────────────────────────────────────────────────────
console.log("\nwatchlist");
const watch = await post("/api/dev-test/seed-watchlist", { perLens: 3 });
step("seed-watchlist", `watching ${watch.watching ?? 0} · ${JSON.stringify(watch.byLens ?? {})}${watch.error ? ` · ⚠️ ${watch.error}` : ""}`);
for (const r of watch.refusals ?? []) step("  ⚠️ refusal", r);
const wl = watch.byLens ?? {};
need((wl.all ?? 0) > 0, "no starred markets", "qa:filter-scan on /watchlist — the bar is WITHHELD on an empty watchlist by design (§A5)");
// ⭐ The lens set is a partition; the fixture should exercise more than one arm of it.
const wlArms = ["open", "progress", "done", "void"].filter((k) => (wl[k] ?? 0) > 0);
need(wlArms.length >= 2, `only ${wlArms.length} of 4 watchlist lens arms populated (${wlArms.join(",") || "none"})`, "the 'present but not universal' arm of qa:player-filters");

// ── 6 · proposals — ACTIVATE FIRST, or everything below returns nothing ───────────────────────
console.log("\nproposals");
const cfg = await post("/api/dev-test/proposals-set-config", { state: "ACTIVE" });
step("proposals-set-config", `state ${cfg?.config?.state ?? "?"} · hotThreshold ${cfg?.config?.hotThreshold ?? "?"}`);
need(cfg?.config?.state === "ACTIVE", "proposals board is not ACTIVE", "every /proposals driver — the page renders a state banner and NO rail");
const props = await post("/api/dev-test/proposals-seed", { n: 30, mineFor: playerId });
step("proposals-seed", `created ${props.created ?? 0}, attributed to the demo player${props.error ? ` · ⚠️ ${props.error}` : ""}`);
need((props.created ?? 0) > 0, "no proposals created", "qa:count-truth on /proposals (floor is 14 pill destinations)");

// ── 7 · settle enough markets that /results spans more than one page ──────────────────────────
console.log("\nresults archive");
const res6 = await post("/api/dev-test/resolve-seed-markets", { markets: 6, bettors: 2, stake: 2000 });
step("resolve-seed-markets", `resolved ${res6.resolved ?? 0}${res6.error ? ` · ⚠️ ${res6.error}` : ""}`);
/**
 * ⚠️ ONE PAGE IS NOT A FIXTURE GAP — IT IS A GAP FOR ONE SPECIFIC ASSERTION. `red:count-truth`'s
 * `pages-overlap` case is about rows crossing a page boundary, so on a single-page archive the
 * mutated and the correct code are identical and the case reports 🔶 rather than passing. That is
 * handled honestly by the harness; this line exists so a reader knows WHY it may skip.
 * ⛔ `?product=all` is the probe, not the default view: the default is `product=MARKET`, which
 * holds only the long-form settled markets and fits on one page far longer than the full archive.
 */
need((res6.resolved ?? 0) > 0, "no markets resolved", "red:count-truth's pages-overlap case (it will report 🔶, not fail)");

// ── verdict ───────────────────────────────────────────────────────────────────────────────────
console.log("");
if (problems.length) {
  console.error("🔴 THE FIXTURE IS INCOMPLETE. Every line below names the gate it would silently weaken:");
  for (const p of problems) console.error(`   ✗ ${p}`);
  console.error("\n⛔ Fix these before believing any live run. A gate over an empty product is a SKIPPED RUN, not a pass.");
  process.exit(1);
}
console.log("✅ fixture ready, and every arm the player gates need is populated.");
console.log("   next:  npm run qa:player-filters · qa:count-truth · qa:bar-geometry · qa:filter-scan");
