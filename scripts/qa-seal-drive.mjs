/**
 * THE STRUCK SEAL, DRIVEN — the win celebration's layout matrix AND a real
 * settled outcome, against a LOCAL dev server (memory store, no prod risk).
 *
 *   SESSION_SECRET=… OTP_PEPPER=… DISABLE_ADMIN_TOTP=true npx next dev -p 3009
 *   BASE=http://localhost:3009 SHOT_DIR=.qa-design node scripts/qa-seal-drive.mjs [matrix|real|all]
 *
 * Part A — MATRIX. Fires the real `50pick:celebrate` event at the real
 * `WinCelebrationHost` (AppShell) as a signed-in demo player, at
 * 360 / 768 / 1280 × EN / SW / ZH, plus one reduced-motion cell. Honest
 * evidence about layout, copy, theme and the choreography's end state — the
 * struck amount (`.gilt-ink`), the seal layers, the needle group. It is NOT
 * wiring proof; that is part B.
 *
 * Part B — REAL OUTCOME. Seeds an Up & Down chain on the `mock-bars` DATED
 * feed (a different price per boundary — decisive settles, where plain `mock`
 * voids every round on no-move), puts TWO players on opposite sides of one
 * round, forces the boundary, and asserts:
 *   · the WINNER's mounted board fires the struck-seal celebration, and the
 *     headlined amount equals the realised payout TO THE SHILLING —
 *     re-derived from the winner's own wallet: payout = after − before + stake;
 *   · the LOSER gets the factual receipt (M7 — no seal, no ceremony), and
 *     their wallet moved by exactly −stake.
 *
 * ⚠️ Timing traps already paid for by live-s31: the payout is a rolling
 * counter (~900ms after a 600ms hold) — shoot after it settles; the popup
 * auto-dismisses at 4.5s — shoot inside the window.
 *
 * ⚠️ Run part B against a FRESH dev server. The memory store persists across
 * driver runs, and an abandoned pending round from a previous run settles
 * DURING the next run's measurement window — the winner's wallet then moves by
 * two payouts while the modal names one, which reads exactly like a money bug
 * and is entirely the harness's (measured: wallet-derived 3,480 vs a correct
 * modal 1,740, twice, before the restart).
 */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3009";
const SHOT = process.env.SHOT_DIR ?? ".qa-design";
const MODE = process.argv[2] ?? "all";
mkdirSync(`${SHOT}/seal`, { recursive: true });

const AMOUNT = 3470, NET = 1480;
const L = {
  en: { heading: "You won", eyebrow: "POSITION WON", label: "Up & Down · Down", lost: "Round lost" },
  sw: { heading: "Umeshinda!", eyebrow: "MADAU YAMEFANIKIWA", label: "Juu na Chini · Chini", lost: "Raundi imepotea" },
  zh: { heading: "赢了！", eyebrow: "持仓获胜", label: "涨跌 · 跌", lost: "本轮未中" },
};

let pass = 0, fail = 0;
const ok = (cond, msg, detail = "") => {
  console.log(`  ${cond ? "PASS" : "FAIL"} ${msg}${cond ? "" : detail ? ` — ${detail}` : ""}`);
  if (cond) pass++; else fail++;
};

const tzs = (n) => `TZS ${new Intl.NumberFormat("en-US").format(n)}`;
/** Parse "TZS 3,470" → 3470 from an element's text. */
const parseTzs = (s) => Number((/TZS\s*([\d,]+)/.exec(s ?? "")?.[1] ?? "NaN").replace(/,/g, ""));

async function demoLogin(ctx, locale) {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/auth/demo`, { waitUntil: "domcontentloaded" });
  await ctx.addCookies([{ name: "kp-locale", value: locale, url: BASE }]);
  return page;
}

/** Dispatch the celebration event once hydration has the listener mounted. */
async function fireCelebration(page, locale) {
  const detail = { kind: "WIN", amount: AMOUNT, net: NET, label: L[locale].label };
  for (let tries = 0; tries < 6; tries++) {
    await page.evaluate((d) => {
      window.dispatchEvent(new CustomEvent("50pick:celebrate", { detail: d }));
    }, detail);
    try {
      await page.getByRole("dialog").waitFor({ state: "visible", timeout: 900 });
      return true;
    } catch { /* pre-hydration dispatch is lost — try again */ }
  }
  return false;
}

async function matrixCell(b, locale, width) {
  const ctx = await b.newContext({ viewport: { width, height: width < 768 ? 780 : 900 } });
  try {
    const page = await demoLogin(ctx, locale);
    await page.goto(`${BASE}/updown`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    const lang = await page.evaluate(() => document.documentElement.lang);
    if (lang !== locale) throw new Error(`locale did not apply: asked ${locale}, got ${lang}`);

    const fired = await fireCelebration(page, locale);
    ok(fired, `${locale}/${width} · the celebration modal opened`);
    if (!fired) return;

    // Let the whole beat land: cascade (~520+160ms), roll (600ms hold + 900ms),
    // flip (1140+340ms), sheen (1760+620ms) — 2.6s covers it, inside the 4.5s window.
    await page.waitForTimeout(2700);
    const dialog = page.getByRole("dialog");

    const heading = await dialog.locator("h2").first().innerText().catch(() => "");
    ok(heading.trim() === L[locale].heading, `${locale}/${width} · one-line headline reads "${L[locale].heading}"`, `got "${heading.trim()}"`);

    const amountEl = dialog.locator("p.font-mono.tabular-nums").first();
    const amountText = (await amountEl.innerText().catch(() => "")).trim();
    ok(amountText === tzs(AMOUNT), `${locale}/${width} · the roll completed at ${tzs(AMOUNT)}`, `got "${amountText}"`);
    const struck = await amountEl.evaluate((el) => el.classList.contains("gilt-ink")).catch(() => false);
    ok(struck, `${locale}/${width} · the amount STRUCK to gilt (.gilt-ink)`);

    for (const sel of [".seal-rim", ".seal-enamel", ".seal-band.seal-sheen", "g.needle-sweep", ".seal-mark-flip"]) {
      ok((await dialog.locator(sel).count()) > 0, `${locale}/${width} · seal layer present: ${sel}`);
    }
    // M7's other half in the same breath: no trophy, no rays. The old burst was
    // 12 stroked <path>s in a 220-viewBox svg; the seal draws no ray strokes.
    ok((await dialog.locator("svg[viewBox='0 0 220 220']").count()) === 0, `${locale}/${width} · the ray burst is gone`);

    await dialog.screenshot({ path: `${SHOT}/seal/seal-${locale}-${width}.png` });
    await page.screenshot({ path: `${SHOT}/seal/page-${locale}-${width}.png` });
  } finally {
    await ctx.close();
  }
}

async function reducedMotionCell(b) {
  const ctx = await b.newContext({ viewport: { width: 360, height: 780 }, reducedMotion: "reduce" });
  try {
    const page = await demoLogin(ctx, "en");
    await page.goto(`${BASE}/updown`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    const fired = await fireCelebration(page, "en");
    ok(fired, "reduced-motion · the modal still opens");
    if (!fired) return;
    // No roll under reduced motion: the amount must be FINAL and STRUCK at once,
    // and the closing band must rest unseen (motion.css writes opacity: 0).
    await page.waitForTimeout(250);
    const dialog = page.getByRole("dialog");
    const amountEl = dialog.locator("p.font-mono.tabular-nums").first();
    const amountText = (await amountEl.innerText().catch(() => "")).trim();
    ok(amountText === tzs(AMOUNT), "reduced-motion · the amount SNAPS to its end frame", `got "${amountText}"`);
    ok(await amountEl.evaluate((el) => el.classList.contains("gilt-ink")).catch(() => false),
      "reduced-motion · …already struck");
    const sheenOpacity = await dialog.locator(".seal-sheen").evaluate((el) => getComputedStyle(el).opacity).catch(() => "?");
    ok(sheenOpacity === "0", "reduced-motion · the closing band rests unseen (opacity 0)", `got ${sheenOpacity}`);
    await dialog.screenshot({ path: `${SHOT}/seal/seal-reduced-360.png` });
  } finally {
    await ctx.close();
  }
}

/* ── Part B — the real outcome ──────────────────────────────────────────── */

async function post(path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body ?? {}),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.ok === false) throw new Error(`${path} → ${r.status} ${JSON.stringify(j).slice(0, 300)}`);
  return j;
}

async function readPill(page) {
  const t = await page.getByTestId("wallet-balance-pill").innerText();
  const n = parseTzs(t);
  if (!Number.isFinite(n)) throw new Error(`could not read wallet pill: "${t}"`);
  return n;
}

/** Register a fresh player through the real form — email + BOTH required
 *  checkboxes, the segmented DOB and the password pair. ⚠️ Fill only after
 *  networkidle: PhoneInput mirrors the visible field into a hidden input on
 *  React onChange, so a pre-hydration fill posts a blank identifier. */
async function registerPlayer(ctx, phone, email) {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/auth/register`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
  await page.locator("#phone").fill(phone);
  await page.locator("#email").fill(email);
  // The password PAIR — both halves, or the form refuses.
  const pws = page.locator("input[type=password]");
  await pws.nth(0).fill("seal-drive-9x!");
  if ((await pws.count()) > 1) await pws.nth(1).fill("seal-drive-9x!");
  // DOB — the segmented DD/MM/YYYY field, addressed by each segment's own
  // accessible name (the phone field is inputmode=numeric too, so "first
  // numeric input" is the wrong element).
  await page.getByLabel("Day", { exact: true }).pressSequentially("01", { delay: 30 });
  await page.getByLabel("Month", { exact: true }).pressSequentially("01", { delay: 30 });
  await page.getByLabel("Year", { exact: true }).pressSequentially("1990", { delay: 30 });
  // The kit Checkbox hides its native input but keeps it accessible — check()
  // reaches it; a stubborn one gets its label clicked instead.
  for (const name of ["acceptAge", "acceptTerms"]) {
    const box = page.locator(`input[name=${name}]`);
    await box.check({ force: true }).catch(async () => {
      await box.evaluate((el) => (el.closest("label") ?? el).dispatchEvent(new MouseEvent("click", { bubbles: true })));
    });
  }
  await page.locator("form button[type=submit]").last().click();
  await page.waitForURL((u) => !u.pathname.includes("/auth/register"), { timeout: 30_000 });
  return page;
}

async function realOutcome(b) {
  console.log("\n— part B · a REAL settled outcome on the mock-bars dated feed —");
  await post("/api/dev-test/updown-seed", { durations: [5], feedProvider: "mock-bars" });
  await post("/api/dev-test/updown-advance");

  // Player A — the demo player.
  const ctxA = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const pageA = await demoLogin(ctxA, "en");
  // Player B — registered through the real form, funded by the dev seeder.
  const ctxB = await b.newContext({ viewport: { width: 1280, height: 900 } });
  // National format — the PhoneInput carries its own +255 prefix and rejects a
  // pasted international string. 9 digits starting with 7.
  const nationalB = `7${String(Math.floor(10_000_000 + Math.random() * 89_999_999))}`;
  const phoneB = `+255${nationalB}`;
  const pageB = await registerPlayer(ctxB, nationalB, `seal.${Date.now()}@50pick.test`);
  await post("/api/dev-test/seed-wallet", { phone: phoneB, amount: 50_000 });

  try {
    for (let round = 0; round < 4; round++) {
      await pageA.goto(`${BASE}/updown`, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await pageA.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
      await pageB.goto(`${BASE}/updown`, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await pageB.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});

      const a0 = await readPill(pageA);
      const b0 = await readPill(pageB);

      const upBtn = pageA.getByRole("button", { name: /^Up — Bitcoin/ }).first();
      if (!(await upBtn.count()) || !(await upBtn.isEnabled().catch(() => false))) {
        console.log("    (no bettable Bitcoin round — advancing the grid)");
        await post("/api/dev-test/updown-advance");
        continue;
      }
      await upBtn.click();
      await pageB.getByRole("button", { name: /^Down — Bitcoin/ }).first().click();
      await pageA.waitForTimeout(1500); // let both commits land + pills refresh

      const aAfterBet = await readPill(pageA);
      const bAfterBet = await readPill(pageB);
      const stakeA = a0 - aAfterBet, stakeB = b0 - bAfterBet;
      ok(stakeA > 0 && stakeB > 0, `both stakes committed (A −${stakeA} · B −${stakeB})`);

      await post("/api/dev-test/updown-advance"); // the boundary passes; the round CLOSES
      // ⚠️ Resolution is NOT instant: the close price confirms and the round
      // resolves on the lifecycle healer's ~60s cadence ([updown-heal] in the
      // server log). Wait out up to two ticks, nudging the boards' refresh so
      // the announcer observes the transition while mounted.
      // ⚠️ Patience over parallelism: abandoning a pending round and betting the
      // next one lets the FIRST round's late payout land inside the second's
      // measurement window, which reads exactly like a money bug (a wallet delta
      // twice the celebrated figure). One round at a time, fully resolved.
      let winner = null, voided = false, loserReceipt = null;
      for (let i = 0; i < 150 && !winner && !voided; i++) {
        if (i % 4 === 0) {
          for (const p of [pageA, pageB]) {
            await p.evaluate(() => window.dispatchEvent(new Event("50pick:refresh"))).catch(() => {});
          }
        }
        // The loss receipt is a 6s toast that can fire on the same beat as the
        // winner's dialog — witness it DURING the wait, not after.
        if (!loserReceipt) {
          if (await pageA.getByText(/Round lost/i).first().isVisible().catch(() => false)) loserReceipt = "A";
          else if (await pageB.getByText(/Round lost/i).first().isVisible().catch(() => false)) loserReceipt = "B";
        }
        if (await pageA.getByRole("dialog").isVisible().catch(() => false)) winner = "A";
        else if (await pageB.getByRole("dialog").isVisible().catch(() => false)) winner = "B";
        else {
          // A refund toast on either board = a no-move VOID; try the next round.
          for (const p of [pageA, pageB]) {
            if (await p.getByText(/Stake returned/i).first().isVisible().catch(() => false)) voided = true;
          }
          await pageA.waitForTimeout(1000);
        }
      }
      if (voided) { console.log("    (VOID — stakes returned; trying the next round)"); continue; }
      if (!winner) {
        console.log("    (no result in 150s — trying the next round)");
        continue;
      }

      const [wPage, lPage] = winner === "A" ? [pageA, pageB] : [pageB, pageA];
      const [wBefore, wStake, lBefore, lStake] =
        winner === "A" ? [a0, stakeA, b0, stakeB] : [b0, stakeB, a0, stakeA];

      console.log(`    winner: player ${winner}`);
      await wPage.waitForTimeout(1800); // let the roll finish inside the 4.5s window
      const dialog = wPage.getByRole("dialog");
      const amountEl = dialog.locator("p.font-mono.tabular-nums").first();
      const shownPayout = parseTzs(await amountEl.innerText().catch(() => ""));
      ok(await dialog.locator(".seal-rim").count() > 0, "the winner got THE SEAL");
      await dialog.screenshot({ path: `${SHOT}/seal/real-win.png` });

      // The loser's receipt — factual, no seal (M7's other half). Witnessed in
      // the wait loop above (the toast lives 6s); a still-visible one is shot.
      const stillVisible = await lPage.getByText(new RegExp(L.en.lost, "i")).first().isVisible().catch(() => false);
      ok(loserReceipt === (winner === "A" ? "B" : "A") || stillVisible,
        "the loser got the factual receipt, not a ceremony",
        `receipt seen on ${loserReceipt ?? "neither"} while winner is ${winner}`);
      ok((await lPage.locator(".seal-rim").count()) === 0, "…and no seal anywhere on the loser's page");
      await lPage.screenshot({ path: `${SHOT}/seal/real-loss-toast.png` });

      // THE SHILLING TEST — the celebrated figure re-derived from the wallet.
      await wPage.getByRole("button", { name: /continue|endelea|继续/i }).click().catch(() => {});
      await wPage.waitForTimeout(1200);
      await wPage.goto(`${BASE}/updown`, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await wPage.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
      const wAfter = await readPill(wPage);
      const realisedPayout = wAfter - (wBefore - wStake);
      ok(shownPayout === realisedPayout,
        `the celebrated amount IS the realised payout (${shownPayout} = ${wAfter} − ${wBefore - wStake})`,
        `modal ${shownPayout} vs wallet-derived ${realisedPayout}`);

      await lPage.goto(`${BASE}/updown`, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await lPage.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
      const lAfter = await readPill(lPage);
      ok(lAfter === lBefore - lStake, `the loser's wallet moved by exactly −${lStake}`,
        `${lBefore} → ${lAfter}`);

      // Conservation: winner's gain + loser's loss = the house fee, and the
      // winner is never paid below stake (the platform's printed promise).
      ok(shownPayout >= wStake, `the winner was not paid below stake (${shownPayout} ≥ ${wStake})`);
      // The printed promise: the house never takes more than a THIRD of the
      // smaller side (fee = min(commission·pool, ceiling·smaller)). The
      // commission rate itself is admin-tunable, so the ceiling is the invariant
      // a driver may assert — not a hardcoded rate (§5b rule 10).
      const fee = wStake + lStake - shownPayout;
      const ceiling = Math.ceil(Math.min(wStake, lStake) / 3) + 1;
      ok(fee >= 0 && fee <= ceiling,
        `money conserved: pool ${wStake + lStake} = payout ${shownPayout} + fee ${fee} (≤ ⅓·smaller = ${ceiling})`);
      return;
    }
    ok(false, "a decisive round settled within 4 attempts");
  } finally {
    await ctxA.close(); await ctxB.close();
  }
}

// QA_CHROMIUM_PATH — same escape hatch qa:live carries: a sandbox whose pinned
// headless-shell is missing points this at any real chromium binary instead.
const b = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
  ...(process.env.QA_CHROMIUM_PATH ? { executablePath: process.env.QA_CHROMIUM_PATH } : {}),
});
try {
  if (MODE === "matrix" || MODE === "all") {
    console.log("— part A · layout matrix, dispatch-driven —");
    for (const locale of ["en", "sw", "zh"]) {
      for (const width of [360, 768, 1280]) await matrixCell(b, locale, width);
    }
    await reducedMotionCell(b);
  }
  if (MODE === "real" || MODE === "all") await realOutcome(b);
} finally {
  await b.close();
}

console.log(`\nqa:seal — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
