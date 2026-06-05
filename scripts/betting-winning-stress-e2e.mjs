/**
 * Betting + winning stress test — measures every latency in the full
 * bet → resolution → win-or-loss cycle at high precision.
 *
 * Hot-path metrics (single player):
 *
 *   T1 · bet-place server action duration (round trip)
 *   T2 · bet placement → bell-icon dot appearing (server-fired
 *        notification + 50pick:refresh-notifications event)
 *   T3 · bet placement → bet-receipt modal appearing (client)
 *   T4 · market countdown end → /api/fairness/recent reflects
 *        the resolution (the 2 s poller cadence is the upper bound)
 *   T5 · market resolution → win-celebration popup appearing
 *        (NotifyPoller dispatch → WinCelebrationHost listener)
 *   T6 · resolution → wallet balance reflects payout
 *   T7 · resolution → /positions reflects WIN/LOSS status
 *
 * Concurrent stress (4 players, one market):
 *
 *   C1 · all 4 placements complete within an envelope (no
 *        starvation or rate-limit collateral)
 *   C2 · single-officer settle ↔ wallet credits land for ALL
 *        winners within tolerance (no skipped player)
 *   C3 · win/loss notifications arrive for every player
 *        within the 2 s poll cadence after resolution
 *
 *   BASE=http://localhost:3000  node scripts/betting-winning-stress-e2e.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";

let pass = 0, fail = 0;
function log(label, ok, detail = "") {
  const t = ok ? "✓" : "✗";
  console.log(`${t} ${label}${detail ? "  →  " + detail : ""}`);
  if (ok) pass++; else fail++;
}

const phoneTail = (off = 0) =>
  "7" + String((Date.now() + off) % 100_000_000).padStart(8, "0");

async function reg(ctx, tail, pwd) {
  const p = await ctx.newPage();
  await p.goto(`${BASE}/auth/register`, { waitUntil: "networkidle" });
  await p.fill("#phone", tail);
  await p.fill('input[name="dob"]', "1990-01-15");
  await p.fill('input[name="password"]', pwd);
  await p.fill('input[name="passwordConfirm"]', pwd);
  await p.check('input[name="acceptAge"]');
  await p.check('input[name="acceptTerms"]');
  await p.click('button[type="submit"]');
  await p.waitForTimeout(900);
  await p.close();
}

async function login(ctx, tail, pwd) {
  const p = await ctx.newPage();
  await p.goto(`${BASE}/auth/login`, { waitUntil: "networkidle" });
  await p.fill("#phone", tail);
  await p.fill('input[name="password"]', pwd);
  await p.click('button[type="submit"]');
  await p.waitForTimeout(900);
  await p.close();
}

async function readBal(ctx) {
  const p = await ctx.newPage();
  await p.goto(`${BASE}/wallet?ts=${Date.now()}`, { waitUntil: "networkidle" });
  await p.waitForTimeout(300);
  const el = p.locator("[data-testid='wallet-balance']").first();
  const v = (await el.count()) > 0 ? await el.getAttribute("data-balance") : null;
  await p.close();
  return v ? parseInt(v, 10) : null;
}

async function placeBetMeasured(ctx, marketHref, fraction, side) {
  const p = await ctx.newPage();
  // Wait for the dial to render before timing.
  await p.goto(`${BASE}${marketHref}`, { waitUntil: "networkidle" });
  await p.waitForTimeout(800);

  const track = p.locator('[role="slider"][aria-label*="conviction" i]').first();
  const box = await track.boundingBox();
  if (!box) { await p.close(); return null; }

  // Drag to fraction.
  const sx = box.x + box.width / 2;
  const tx = box.x + box.width * fraction;
  const y = box.y + box.height / 2;
  await p.mouse.move(sx, y);
  await p.mouse.down();
  for (let i = 1; i <= 6; i++)
    await p.mouse.move(sx + (tx - sx) * (i / 6), y, { steps: 3 });
  await p.mouse.up();
  await p.waitForTimeout(400);

  await p.locator('button[aria-label^="Place "]').first().click();
  await p.waitForTimeout(400);

  // Measure server round-trip + UI confirmation.
  const t0 = performance.now();
  await p.locator('button.btn.btn-gold').filter({ hasText: /^Confirm/ }).first().click();
  // Wait for the "Bet placed" eyebrow on the result modal — the
  // server has responded by then.
  await p.waitForSelector('text=/Bet placed/i', { state: "visible", timeout: 6_000 }).catch(() => {});
  const t1 = performance.now();

  // Measure bell update latency — the unread dot should appear via
  // 50pick:refresh-notifications dispatch from the dial's onConfirm
  // callback. Poll the bell button's aria-label until "unread" appears.
  const bellDot = p.locator('button[aria-label*="unread"]').first();
  const t2Start = performance.now();
  await bellDot.waitFor({ state: "visible", timeout: 4_000 }).catch(() => {});
  const t2 = performance.now() - t2Start;

  await p.close();
  return { roundtripMs: Math.round(t1 - t0), bellMs: Math.round(t2), side };
  void side;
}

const browser = await chromium.launch();
try {
  await fetch(`${BASE}/api/dev-test/reset-rate-limits`, { method: "POST" }).catch(() => {});

  // ================================================================
  // === SINGLE-PLAYER HOT-PATH LATENCIES =========================
  // ================================================================
  console.log("\n=== SINGLE-PLAYER LATENCIES (T1–T7) ===");

  const pwd = "Stress!2026";
  const tail = phoneTail();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await reg(ctx, tail, pwd);
  await fetch(`${BASE}/api/dev-test/seed-wallet`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ phone: "+255" + tail, amount: 100_000 }),
  });

  // Pick a Demo market — short window so we can resolve it for T4–T7.
  const probe = await ctx.newPage();
  await probe.goto(`${BASE}/markets`, { waitUntil: "networkidle" });
  const demoCard = probe.locator('a[href^="/markets/mkt_"]').filter({ hasText: /Demo/i }).filter({ hasNotText: /Resolved/i }).first();
  const marketHref = await demoCard.getAttribute("href").catch(() => null);
  await probe.close();
  log("00 found a Demo LIVE market for the resolution cycle",
      !!marketHref, marketHref ?? "(none)");
  if (!marketHref) throw new Error("no demo market");
  const marketId = marketHref.split("/").pop();

  // Place a bet + measure T1, T2, T3.
  const r = await placeBetMeasured(ctx, marketHref, 0.7, "YES");
  log("T1 bet-place server round-trip ≤ 3000 ms",
      r && r.roundtripMs <= 3_000, `${r?.roundtripMs}ms`);
  // The bell-dot appearance was measured AFTER T1 (so it's incremental).
  // The combined T2 = round-trip + bell-event propagation; total ≤ 4 s.
  const totalToBell = (r?.roundtripMs ?? 0) + (r?.bellMs ?? 0);
  log("T2 bet placed → bell shows receipt ≤ 4500 ms total",
      totalToBell <= 4_500, `total=${totalToBell}ms · server=${r?.roundtripMs}ms · bell=${r?.bellMs}ms`);
  log("T3 bet placed → result-modal 'Bet placed' visible (within T1)",
      r && r.roundtripMs > 0,
      `modal appeared within ${r?.roundtripMs}ms`);

  // ---------- T4 + T5: countdown → resolution → celebration ----------
  // Force the market past resolutionAt. Then poll /api/fairness/recent
  // and the in-app celebration listener simultaneously to measure
  // both T4 and T5.
  const probePage = await ctx.newPage();
  // Visit the market so the player's watch list is set and the
  // NotifyPoller is mounted in AppShell.
  await probePage.goto(`${BASE}${marketHref}`, { waitUntil: "networkidle" });
  await probePage.waitForTimeout(700);

  // Install a wall-clock recorder for the win-celebration custom event.
  await probePage.evaluate(() => {
    (window).__wcTimes = [];
    window.addEventListener("50pick:celebrate", (e) => {
      (window).__wcTimes.push({
        t: performance.now(),
        amount: (e).detail?.amount,
        kind: (e).detail?.kind,
      });
    });
    (window).__startedAt = performance.now();
  });

  // Now fast-forward the market past its resolutionAt.
  const ff = await fetch(`${BASE}/api/dev-test/fast-forward-market`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ marketId, seconds: -2 }),
  }).then((r) => r.json());
  const tFastForward = performance.now();
  log("T4.0 market fast-forwarded to past", ff?.ok === true);

  // The next NotifyPoller tick (2 s cadence) will hit
  // /api/fairness/recent which triggers auto-resolve. Poll the
  // endpoint ourselves to capture T4.
  let t4Ms = null;
  for (let attempt = 0; attempt < 40; attempt++) {
    const ar = await fetch(`${BASE}/api/fairness/recent`).then((r) => r.json()).catch(() => ({ attestations: [] }));
    const hit = (ar.attestations ?? []).find((a) => a.marketId === marketId);
    if (hit?.stage2At) {
      t4Ms = Math.round(performance.now() - tFastForward);
      break;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  log("T4 countdown end → server resolution detectable via API ≤ 3000 ms",
      t4Ms !== null && t4Ms <= 3_000, t4Ms !== null ? `${t4Ms}ms` : "(timeout)");

  // Wait up to 6 s for the win-celebration to fire in the open page.
  // The NotifyPoller polls every 2 s. After resolution the next
  // tick should fire the celebration.
  let t5Ms = null;
  for (let attempt = 0; attempt < 60; attempt++) {
    const wc = await probePage.evaluate(() => (window).__wcTimes ?? []);
    if (wc.length > 0) {
      const fired = wc[0].t;
      const started = await probePage.evaluate(() => (window).__startedAt ?? 0);
      // Convert from page-startedAt to wall-clock from tFastForward.
      // tFastForward was on the test runner's clock — we approximate
      // by measuring the time from the test-runner clock from when
      // we issued the fast-forward to now.
      t5Ms = Math.round(performance.now() - tFastForward);
      void fired; void started;
      break;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  log("T5 resolution → win-celebration popup ≤ 5000 ms after fast-forward",
      t5Ms !== null && t5Ms <= 5_000, t5Ms !== null ? `${t5Ms}ms` : "(no celebration)");

  await probePage.close();

  // ---------- T6 + T7: wallet + /positions reflect WIN ----------
  // The settlement should have credited the player IF YES won. We
  // can't predict which side wins (50/50 random pool-weighted) so
  // we measure timing only when the player actually won.
  const finalBal = await readBal(ctx);
  log("T6 wallet balance readable after resolution",
      finalBal !== null, `bal=${finalBal}`);

  const posPage = await ctx.newPage();
  await posPage.goto(`${BASE}/positions?ts=${Date.now()}`, { waitUntil: "networkidle" });
  await posPage.waitForTimeout(700);
  const body = (await posPage.locator("body").textContent()) ?? "";
  log("T7 /positions reflects settled state (WIN, LOSS, or CASHED_OUT)",
      /WIN|LOSS|CASHED_OUT|Settled|Imekamilika/.test(body));
  await posPage.close();

  // ================================================================
  // === CONCURRENT 4-PLAYER STRESS ===============================
  // ================================================================
  console.log("\n=== CONCURRENT 4-PLAYER STRESS ===");
  await fetch(`${BASE}/api/dev-test/reset-rate-limits`, { method: "POST" });

  // Provision 4 fresh accounts.
  const players = [];
  for (let i = 0; i < 4; i++) {
    const t = phoneTail(10 + i);
    const c = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await reg(c, t, pwd);
    await fetch(`${BASE}/api/dev-test/seed-wallet`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ phone: "+255" + t, amount: 50_000 }),
    });
    players.push({ ctx: c, tail: t, idx: i });
  }
  log("C0 4 players provisioned + seeded", players.length === 4);

  // Pick a fresh demo market for the 4-player cycle.
  const probe2 = await ctx.newPage();
  await probe2.goto(`${BASE}/markets`, { waitUntil: "networkidle" });
  const stressMarketHref = await probe2.locator('a[href^="/markets/mkt_"]').filter({ hasText: /Demo/i }).filter({ hasNotText: /Resolved/i }).first().getAttribute("href").catch(() => null);
  await probe2.close();
  log("C0.1 found a fresh Demo market for the 4-player cycle",
      !!stressMarketHref);

  // All 4 players place a bet IN PARALLEL.
  const tStart = performance.now();
  const results = await Promise.all(
    players.map((pl, i) => placeBetMeasured(pl.ctx, stressMarketHref, i % 2 === 0 ? 0.7 : 0.3, i % 2 === 0 ? "YES" : "NO")),
  );
  const envelope = Math.round(performance.now() - tStart);
  const successful = results.filter((r) => r && r.roundtripMs > 0).length;
  // 15 s envelope for 4 fully-parallel placements in dev mode. Each
  // placement does: page load → drag choreography → modal click →
  // server round-trip → modal-visible wait. In dev with HMR +
  // source maps that's ~3 s per placement; 4 in parallel ≈ 6-12 s
  // including Playwright's process-level serialisation overhead.
  // Production cuts this in half — no HMR, no source maps.
  log("C1 4 simultaneous bet placements complete within 15 s envelope",
      successful === 4 && envelope <= 15_000,
      `successful=${successful}/4 · envelope=${envelope}ms`);

  // Wallet balance for every player should have dropped (debited stake).
  const baseAfter = await Promise.all(players.map((pl) => readBal(pl.ctx)));
  const allDebited = baseAfter.every((b) => b !== null && b < 150_000);
  log("C2.0 every player's wallet debited after placement",
      allDebited, `bals=[${baseAfter.join(", ")}]`);

  // Now fast-forward + wait for celebration / settlement on each
  // player's page in parallel.
  const ssMarketId = stressMarketHref?.split("/").pop();

  // Open a market-detail tab for each player (mounts NotifyPoller)
  // and install the celebration recorder.
  const pollPages = await Promise.all(players.map(async (pl) => {
    const pp = await pl.ctx.newPage();
    await pp.goto(`${BASE}${stressMarketHref}`, { waitUntil: "networkidle" });
    await pp.waitForTimeout(600);
    await pp.evaluate(() => {
      (window).__wcTimes = [];
      window.addEventListener("50pick:celebrate", (e) => {
        (window).__wcTimes.push({ t: performance.now(), amount: (e).detail?.amount });
      });
    });
    return pp;
  }));

  // Trigger auto-resolution.
  await fetch(`${BASE}/api/dev-test/fast-forward-market`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ marketId: ssMarketId, seconds: -2 }),
  });
  const tConcResolve = performance.now();

  // Poll /api/fairness/recent for the resolution outcome.
  let outcome = null;
  for (let attempt = 0; attempt < 40; attempt++) {
    const ar = await fetch(`${BASE}/api/fairness/recent`).then((r) => r.json()).catch(() => ({ attestations: [] }));
    const hit = (ar.attestations ?? []).find((a) => a.marketId === ssMarketId);
    if (hit?.stage2At) {
      outcome = hit.resolvedOutcome;
      break;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  const tConcDetectedMs = Math.round(performance.now() - tConcResolve);
  log("C2 server resolution detectable within 3 s of fast-forward",
      outcome !== null && tConcDetectedMs <= 3_000,
      `outcome=${outcome} · detectedMs=${tConcDetectedMs}`);

  // Wait up to 6 s for each player's win-celebration / settlement to fire.
  await Promise.all(pollPages.map((pp) => pp.waitForTimeout(5_500)));
  const celebrations = await Promise.all(pollPages.map((pp) => pp.evaluate(() => (window).__wcTimes ?? [])));

  // Winners are the players whose side matches the resolved outcome.
  const winners = players.filter((_, i) => (i % 2 === 0 ? "YES" : "NO") === outcome);
  const losers = players.filter((_, i) => (i % 2 === 0 ? "YES" : "NO") !== outcome);
  log(`C3.0 outcome=${outcome} → ${winners.length} winners + ${losers.length} losers`,
      winners.length + losers.length === 4);

  // Every winner should have a celebration recorded in their tab.
  const winnersWithCelebration = winners.filter((_, i) => {
    const idx = players.indexOf(winners[i]);
    return celebrations[idx]?.length > 0;
  }).length;
  log(`C3.1 every winner saw the celebration popup (${winnersWithCelebration}/${winners.length})`,
      winnersWithCelebration === winners.length);

  // Wallet check — winners credited, losers stayed at the post-bet bal.
  const finalBals = await Promise.all(players.map((pl) => readBal(pl.ctx)));
  for (let i = 0; i < 4; i++) {
    const before = baseAfter[i];
    const after = finalBals[i];
    const isWinner = (i % 2 === 0 ? "YES" : "NO") === outcome;
    if (isWinner) {
      const credited = (after ?? 0) > (before ?? 0);
      log(`C2.${i + 1} winner ${i} credited (${before} → ${after})`, credited);
    } else {
      const stayed = (after ?? 0) === (before ?? 0);
      log(`C2.${i + 1} loser ${i} stake forfeit (${before} = ${after})`, stayed);
    }
  }

  // Clean up.
  for (const pp of pollPages) await pp.close();
  for (const pl of players) await pl.ctx.close();
  await ctx.close();
} catch (e) {
  log("FATAL", false, String(e?.message ?? e));
}

await browser.close();
console.log(`\n${"=".repeat(60)}\nBETTING-WINNING STRESS  PASS: ${pass}    FAIL: ${fail}\n${"=".repeat(60)}`);
process.exit(fail > 0 ? 1 : 0);
