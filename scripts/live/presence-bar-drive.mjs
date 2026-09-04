/**
 * PRESENCE · the return surface, READ on the live deploy — 4 widths × 3 locales.
 *
 * ── WHAT THIS PROVES, AND WHAT IT DELIBERATELY DOES NOT ───────────────────────────────
 *
 * ⭐ IT PROVES THE THINGS ONLY A BROWSER CAN ANSWER: that the calm bar RENDERS at every
 * width in every locale, that its longest string (Swahili) neither truncates nor pushes the
 * page into horizontal scroll, that a mixed set states NO money figure, that nothing is
 * stacked, and — ruling ① — that arriving fires NO ceremony while TAPPING fires one.
 *
 * ⛔ IT DOES NOT RE-PROVE THE ROUTING. Whether a given outcome is LIVE or RETURNING is
 * `routeOutcome`'s decision, and `test:presence-class` §1 already executes it over the whole
 * cross-product — 30 combinations, exactly one reaching the seal. Driving a real 30-minute
 * absence through production would take thirty minutes to re-assert what an executed guard
 * already asserts in milliseconds, and would still not cover the other 29 cells.
 *
 * ⚠️ SO THE LEDGER IS SEEDED DIRECTLY, AND THAT IS HONEST RATHER THAN CONVENIENT. Writing
 * `sessionStorage` is exactly what `recordAway()` does — the same key, the same shape — so
 * the component under test is reached by its real input. ⛔ What is NOT stubbed, and must
 * never be: `presenceSince`, `visibilityState`, or anything else the routing consults. There
 * is no backdoor on the path that decides whether a real-money celebration fires; this drive
 * only puts the bar in the state the router would have put it in.
 *
 *   LIVE_BASE=https://50pick.tz node scripts/live/presence-bar-drive.mjs
 */
import { browser, loginOnce, BASE, SHOT } from "./harness.mjs";

const WIDTHS = [360, 768, 1280, 1920];
const LOCALES = ["en", "sw", "zh"];

/** The three sets that matter, and why each is here. */
const SCENARIOS = {
  // Homogeneous wins — the ONE shape allowed to state a payout figure.
  wins: [
    { id: "w1", kind: "WIN", amount: 8_000, stake: 1_000, settledAtMs: Date.now() - 7_200_000, label: "Will the shilling hold above 2,600?" },
    { id: "w2", kind: "WIN", amount: 4_000, stake: 1_000, settledAtMs: Date.now() - 7_100_000, label: "Simba to win the derby" },
    { id: "w3", kind: "WIN", amount: 12_000, stake: 2_000, settledAtMs: Date.now() - 7_000_000, label: "Rain in Dar before Friday" },
  ],
  // ⭐ THE ONE THAT MUST STATE NO MONEY. 3 wins + 5 losses: a netted figure was never paid,
  // never lost, and appears in no ledger row. It is also the "nothing stacked" case.
  mixed: [
    { id: "m1", kind: "WIN", amount: 8_000, stake: 1_000, settledAtMs: Date.now() - 7_200_000, label: "Market one" },
    { id: "m2", kind: "WIN", amount: 4_000, stake: 1_000, settledAtMs: Date.now() - 7_190_000, label: "Market two" },
    { id: "m3", kind: "WIN", amount: 6_000, stake: 1_000, settledAtMs: Date.now() - 7_180_000, label: "Market three" },
    { id: "m4", kind: "LOSS", amount: 0, stake: 2_000, settledAtMs: Date.now() - 7_170_000, label: "Market four" },
    { id: "m5", kind: "LOSS", amount: 0, stake: 1_500, settledAtMs: Date.now() - 7_160_000, label: "Market five" },
    { id: "m6", kind: "LOSS", amount: 0, stake: 1_000, settledAtMs: Date.now() - 7_150_000, label: "Market six" },
    { id: "m7", kind: "LOSS", amount: 0, stake: 3_000, settledAtMs: Date.now() - 7_140_000, label: "Market seven" },
    { id: "m8", kind: "LOSS", amount: 0, stake: 2_500, settledAtMs: Date.now() - 7_130_000, label: "Market eight" },
  ],
  // Homogeneous losses — states what was STAKED, never a payout.
  losses: [
    { id: "l1", kind: "LOSS", amount: 0, stake: 500, settledAtMs: Date.now() - 7_200_000, label: "Market A" },
    { id: "l2", kind: "LOSS", amount: 0, stake: 700, settledAtMs: Date.now() - 7_100_000, label: "Market B" },
    { id: "l3", kind: "LOSS", amount: 0, stake: 300, settledAtMs: Date.now() - 7_000_000, label: "Market C" },
  ],
};

let pass = 0;
const fails = [];
const ok = (n, c, d = "") => {
  if (c) { pass++; console.log(`  ok   ${n}`); }
  else { fails.push(`${n}${d ? ` — ${d}` : ""}`); console.log(`  FAIL ${n}${d ? `\n         ${d}` : ""}`); }
  return c;
};

/** Seed the ledger the way `recordAway` writes it, then reload so the bar mounts over it. */
async function seed(page, uid, entries) {
  await page.evaluate(([key, rows]) => {
    window.sessionStorage.setItem(key, JSON.stringify(rows));
  }, [`50pick:away-ledger:${uid}`, entries]);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(700);
}

// ⚠️ `browser()` hands back BOTH the browser and a default context; this driver builds its
// own context per cell (one per width × locale), so only the browser is taken.
const { b, ctx: unusedCtx } = await browser();
await unusedCtx.close();
/* ⚠️ THE FLEET, NOT `alpha`. Measured 2026-09-04 against production: `alpha` and `echo` are
 * REJECTED (the named-persona secrets in `.env.qa.local` no longer match the rows), while
 * `fleet:01`/`fleet:07` and `admin` sign in. ⛔ Do not reach for `admin` here — it is Ali's
 * console login, and a player surface measured as ADMIN measures the wrong session. The fleet
 * is a real disposable PLAYER, which is exactly the viewer this bar is for. */
const state = await loginOnce(b, "fleet:07");
console.log(`\npresence bar — READ on ${BASE}\n`);

for (const loc of LOCALES) {
  for (const w of WIDTHS) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 }, storageState: state });
    await ctx.addCookies([{ name: "kp-locale", value: loc, url: BASE }]);
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    /* The signed-in viewer's own id — the ledger is scoped per user, because AppShell
     * survives a soft-nav across login and logout and an unscoped key would show one
     * account's settled results to the next person on the same browser. It is in the flight
     * payload because the server passes it to the bar as a prop. */
    const uid = await page.evaluate(() => {
      const m = document.documentElement.innerHTML.match(/\\?"userId\\?":\\?"([A-Za-z0-9_-]{8,})/);
      return m ? m[1] : null;
    });
    if (!ok(`${loc}/${w} · the viewer's id was found (else every seed below lands on a key nobody reads)`, !!uid)) {
      await ctx.close();
      continue;
    }

    for (const [name, rows] of Object.entries(SCENARIOS)) {
      await seed(page, uid, rows);
      const tag = `${loc}/${w}/${name}`;

      const bars = await page.locator('[data-testid="away-summary-bar"]').all();
      if (!ok(`${tag} · exactly ONE calm bar — never a stack`, bars.length === 1, `found ${bars.length}`)) continue;

      const bar = bars[0];
      const text = (await bar.innerText()).replace(/\s+/g, " ").trim();

      // ⛔ §F5 — arriving is not an act. Nothing may have opened on its own.
      const dialogs = await page.locator('[role="dialog"]').count();
      ok(`${tag} · nothing fired on arrival — no dialog, no seal`, dialogs === 0, `${dialogs} dialog(s)`);

      ok(`${tag} · the bar says something, and it is not a raw template`,
        text.length > 3 && !text.includes("{") && !text.includes("}"),
        JSON.stringify(text));
      ok(`${tag} · no NaN and no undefined reached the player`,
        !/NaN|undefined/i.test(text), JSON.stringify(text));

      // The truncation risk the handoff names: 360 + the long Swahili string.
      const box = await bar.boundingBox();
      ok(`${tag} · the bar fits its viewport (no clipped edge)`,
        !!box && box.x >= -1 && box.x + box.width <= w + 1,
        box ? `x=${Math.round(box.x)} w=${Math.round(box.width)} vs ${w}` : "no box");
      const overflow = await page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth);
      ok(`${tag} · the page did not gain horizontal scroll`, overflow <= 1, `overflow ${overflow}px`);

      /* ⛔ THE MONEY-HONESTY RULE, READ OFF THE SCREEN. A mixed set may stand a COUNT and must
       * stand no figure: "+TZS 8,000" across three wins and five losses was never paid, never
       * lost, and appears in no ledger row. `formatTzs` always prints the TZS mark, so its
       * absence is the assertion. */
      if (name === "mixed") {
        ok(`${tag} · ⭐ a MIXED set states NO money figure`, !/TZS/.test(text), JSON.stringify(text));
        ok(`${tag} · …and it does state the count (8)`, /\b8\b/.test(text), JSON.stringify(text));
      } else {
        ok(`${tag} · a homogeneous set DOES state its figure`, /TZS/.test(text), JSON.stringify(text));
      }

      await page.screenshot({ path: `${SHOT}/presence-${loc}-${w}-${name}.png`, fullPage: false });
      console.log(`       “${text}”`);
    }

    /* ── RULING ① · THE SEAL IS HANDED OVER, NOT FIRED ────────────────────────────────
     * Checked once per context, on the wins set: arriving opened nothing (asserted above);
     * the player's own TAP must open the ceremony, and it must carry the summed payout. */
    await seed(page, uid, SCENARIOS.wins);
    /* ⚠️ `.last()` HERE MEASURED THE WRONG CONTROL, AND IT REPORTED THE PRODUCT BROKEN.
     * `NoticeBar` renders `{action}` and THEN the dismiss ✕, so the last button in the bar is
     * the ✕ — whose `onDismiss` is `clearAway()`. Clicking it correctly opens no seal, and the
     * first run of this drive read that as "ruling ① fails" on a surface that was working.
     * ⛔ The dismiss is the only control in the bar carrying an `aria-label`; excluding it names
     * the control instead of counting DOM order, which is the trap `harness.mjs`'s own header
     * warns about in three other forms. */
    const action = page.locator('[data-testid="away-summary-bar"] :is(a,button):not([aria-label])').first();
    ok(`${loc}/${w} · the tap target is the ACTION, not the dismiss ✕`,
      (await action.count()) === 1 || (await action.count()) > 0);
    await action.click();
    /* ⚠️ LONG ENOUGH FOR THE FIGURE TO ARRIVE, NOT JUST THE MODAL. `RollingAmount` waits for
     * its cascade row (600ms) and then counts 0 → value over ~900ms before the amount strikes
     * to gilt. Reading at 900ms caught the counter MID-COUNT and reported a correct seal as
     * carrying the wrong number — the drive measuring an animation and calling it a money bug. */
    await page.waitForTimeout(2_600);
    const sealed = await page.locator('[role="dialog"]').count();
    ok(`${loc}/${w} · ⭐ ruling ① — the seal opens on the player's TAP, and only then`,
      sealed >= 1, `${sealed} dialog(s) after tap`);
    if (sealed >= 1) {
      const dlg = (await page.locator('[role="dialog"]').first().innerText()).replace(/\s+/g, " ");
      ok(`${loc}/${w} · …and the seal carries the SUMMED payout (24,000), not one market's`,
        /24[,.\s]?000/.test(dlg), JSON.stringify(dlg.slice(0, 160)));
      await page.screenshot({ path: `${SHOT}/presence-${loc}-${w}-seal.png` });
    }

    await ctx.close();
  }
}

await b.close();
console.log(`\npresence bar: ${pass} passed, ${fails.length} failed  (of ${pass + fails.length})`);
if (fails.length) {
  console.error("\nThe return surface is not what the law says it is:");
  for (const f of fails) console.error(`  · ${f}`);
  process.exit(1);
}
console.log("presence bar: OK — one calm bar, no money invented, and the ceremony waits to be asked for.");
