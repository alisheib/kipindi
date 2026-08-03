/**
 * A REAL MARKET, DRIVEN END TO END ON PRODUCTION — create → bet → resolve → settle.
 *
 *   SHOT_DIR=./shots node scripts/live-market-lifecycle.mjs create
 *   SHOT_DIR=./shots node scripts/live-market-lifecycle.mjs resolve <marketId> <YES|NO|VOID>
 *
 * ⚠️ THIS SPENDS REAL MONEY from the QA wallets and publishes a real market that real
 * players can see and bet on. Ali's standing mandate covers it ("test every flow live…
 * live data is disposable"), and he asked for this one specifically. Two obligations
 * follow: the question must be **honestly resolvable from a public source**, and it must
 * actually be resolved — not left on the board. The criterion below names the exact
 * source, the exact instant and the void condition, so resolution is mechanical rather
 * than a judgement call made later by whoever finds it.
 *
 * ⚠️ TIMEZONE. The wizard's `resolutionAt` is a `datetime-local` and the client does
 * `new Date(value).toISOString()`, so it is parsed in the BROWSER's zone. The context is
 * therefore pinned to Africa/Dar_es_Salaam and the value is EAT wall time — otherwise the
 * market resolves three hours from where the operator thinks it does, which is precisely
 * the class of bug §3 of the campaign doc exists for.
 *
 * ⚠️ THE CONTROL THIS RUN PROVIDES. E-43 gated the refund emitters on
 * `perEventNotificationsSuppressed`, which is UPDOWN-only. A long-form poll must STILL
 * send per-event win/loss messages. Driving a poll to settlement and seeing those arrive
 * is the control that proves the gate did not over-suppress — asking for the control by
 * what it IS, not by the attribute expected of it.
 */
import { chromium } from "playwright";
import { login, bodyText, clickByName, BASE, SHOT } from "./live/harness.mjs";

const MODE = process.argv[2] ?? "create";
const STAKE = 2000;

// ── The question. Decidable, sourced, with its own void condition. ──────────
const RESOLVES_EAT = process.env.RESOLVES_EAT ?? "2026-08-03T03:00";
const THRESHOLD = 63_000;
const TITLE_EN = `Will Bitcoin trade above US$${THRESHOLD.toLocaleString("en-US")} at 03:00 EAT on 3 August 2026?`;
const TITLE_SW = `Je, Bitcoin itauzwa zaidi ya US$${THRESHOLD.toLocaleString("en-US")} saa 3:00 asubuhi (EAT) tarehe 3 Agosti 2026?`;
const TITLE_ZH = `2026年8月3日东非时间03:00，比特币价格是否高于 63,000 美元？`;
const SOURCE = "https://api.twelvedata.com/quote";
const CRITERION =
  `Resolves YES if the Twelve Data quote for BTC/USD, read at or immediately after ` +
  `00:00 UTC on 3 August 2026 (03:00 EAT), shows a price strictly above US$63,000.00. ` +
  `Resolves NO if that quote is at or below US$63,000.00. If no quote can be read from ` +
  `the named source within 30 minutes of that instant, this market is VOIDED and every ` +
  `stake is refunded in full.`;

async function ctxFor(br, who) {
  const ctx = await br.newContext({
    viewport: { width: 1440, height: 1000 },
    timezoneId: "Africa/Dar_es_Salaam",   // see the header — the wizard parses locally
  });
  const page = await ctx.newPage();
  await login(page, who);
  return { ctx, page };
}
const shot = async (page, name) => {
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SHOT}/${name}.png`, fullPage: false });
  console.log(`  shot ${name}.png`);
};

const br = await chromium.launch();
const open = [];
try {
  if (MODE === "create") {
    const { ctx, page } = await ctxFor(br, "trading");
    open.push(ctx);

    await page.goto(`${BASE}/admin/markets/new`, { waitUntil: "networkidle" });

    // Step 1 · the question, in all three languages.
    await page.fill('input[placeholder*="Will the TZS strengthen"]', TITLE_EN);
    await page.fill('input[placeholder*="itaimarika"]', TITLE_SW);
    await page.fill('input[placeholder*="坦桑尼亚"]', TITLE_ZH);
    // 🔴 THE CATEGORY IS NOT COSMETIC — the trusted-source allowlist is PER CATEGORY.
    // The first attempt left it at the default `sports` and the platform correctly
    // refused: "No enabled trusted source for sports matching api.twelvedata.com".
    // That refusal is the source guard working, and it is captured as L5-refused.png.
    // The kit Select is a role="combobox" driving role="option" buttons — not a native
    // <select>, so `selectOption` finds nothing.
    await page.getByRole("combobox").first().click();
    await page.getByRole("option", { name: /^crypto$/i }).first().click();
    await page.waitForTimeout(300);
    await shot(page, "L1-step1-question");
    await clickByName(page, /^continue$/i);   // "Continue", NOT "Next" — asked the DOM, not memory

    // Step 2 · where it resolves from, and when.
    await page.fill('input[placeholder*="bot.go.tz"]', SOURCE);
    await page.fill('input[type="datetime-local"]', RESOLVES_EAT);
    await shot(page, "L2-step2-source");
    await clickByName(page, /^continue$/i);   // "Continue", NOT "Next" — asked the DOM, not memory

    // Step 3 · the criterion — the text players and resolvers are held to.
    await page.fill("textarea", CRITERION);
    await shot(page, "L3-step3-criterion");
    await clickByName(page, /^continue$/i);   // "Continue", NOT "Next" — asked the DOM, not memory

    // Step 4 · review, then publish.
    await shot(page, "L4-step4-review");
    await clickByName(page, /publish market/i);
    // ⚠️ NOT /\/admin\/markets/ — that matches `/admin/markets/NEW`, the page we are
    // already on, so it returned instantly and the shot caught "Publishing…" mid-flight
    // while the market had in fact been created. Anchor on the destination itself.
    await page.waitForURL(/\/admin\/markets(\?|$)/, { timeout: 45_000 }).catch(() => {});
    await page.waitForLoadState("networkidle").catch(() => {});
    await shot(page, "L5-published");

    // Find it by its own title — never by "the first row", which is whatever else
    // an operator created while this was running.
    const link = await page
      .locator(`tr:has-text("${THRESHOLD.toLocaleString("en-US")}") a[href^="/admin/markets/mkt_"]`)
      .first().getAttribute("href").catch(() => null);
    const marketId = link?.split("/").pop() ?? null;
    console.log(`\nMARKET_ID=${marketId ?? "NOT FOUND — check L5-published.png"}`);
    if (!marketId) process.exit(1);

    // ── Two players, opposite sides, so settlement produces a real WIN and a real
    // LOSS rather than a one-sided refund (which pays nothing and proves less).
    await placeBothBets(marketId);
  }

  if (MODE === "bet") {
    await placeBothBets(process.argv[3]);
  }

  async function placeBothBets(marketId) {
    for (const [who, side] of [["alpha", "YES"], ["echo", "NO"]]) {
      const { ctx: c, page: p } = await ctxFor(br, who);
      open.push(c);
      // 🔴 NOT `networkidle`. A live market page holds an open event stream, so it never
      // fires and a perfectly healthy page times out — session 13 recorded this for
      // /updown; it is true of /markets/[id] too. Wait for the betting UI instead.
      await p.goto(`${BASE}/markets/${marketId}`, { waitUntil: "domcontentloaded" });
      await p.getByRole("radiogroup").first().waitFor({ state: "visible", timeout: 30_000 })
        .catch(() => p.waitForTimeout(3000));
      // ⛔ THE BETTING-DIAL CONTRACT — §6h of docs/LIVE-QA-CAMPAIGN.md, and the first
      // attempt here ignored it and silently placed NOTHING. All four traps apply:
      //  1. the side control's accessible name is `Back YES at 50%`, an aria-label that
      //     overrides the visible "YES @ 50%" — /^yes/i matches nothing;
      //  2. the dial (stake field + CTA) DOES NOT EXIST until a side is picked;
      //  3. the CTA `Place YES TZS 2,000` opens a MODAL, and only that modal's
      //     `Confirm · TZS 2,000` calls buyPositionAction;
      //  4. `.first()` matters — related markets render their own `Back … at …`.
      const label = side === "YES" ? /^back yes at/i : /^back no at/i;
      await p.getByRole("button", { name: label }).first().click();
      const stake = p.locator('input[inputmode="numeric"]').first();
      await stake.waitFor({ state: "visible", timeout: 20_000 });
      await stake.fill(String(STAKE));
      await p.waitForTimeout(400);
      await shot(p, `L6-${who}-dial`);
      await p.getByRole("button", { name: new RegExp(`place ${side}`, "i") }).first().click();
      await p.waitForTimeout(900);
      await shot(p, `L6b-${who}-modal`);
      const placed = await p.getByRole("button", { name: /^confirm/i }).first()
        .click().then(() => true).catch(() => false);
      await p.waitForTimeout(3000);
      await shot(p, `L7-${who}-after-confirm`);
      console.log(`  ${who} ${placed ? "placed" : "COULD NOT PLACE"} ${STAKE} on ${side}`);
      console.log(`    ${(await bodyText(p)).slice(0, 200)}`);
    }
    console.log(`\nNow wait until after ${RESOLVES_EAT} EAT, then:`);
    console.log(`  SHOT_DIR=${SHOT} node scripts/live-market-lifecycle.mjs resolve ${marketId} <YES|NO|VOID>`);
  }

  if (MODE === "resolve") {
    const marketId = process.argv[3];
    const outcome = (process.argv[4] ?? "").toUpperCase();
    if (!marketId || !["YES", "NO", "VOID"].includes(outcome)) {
      console.error("usage: … resolve <marketId> <YES|NO|VOID>");
      process.exit(2);
    }
    const { ctx, page } = await ctxFor(br, "trading");
    open.push(ctx);

    // 🔴 RESOLVE FROM THE MARKET'S OWN URL, NOT FROM THE QUEUE.
    //
    // The first attempt scoped a card inside /admin/resolver-queue by climbing three
    // ancestors from a text match, clicked "Resolve YES", and hit a ConfirmModal reading
    // "Settle YES now? · Yes, settle yes / Not yet · Bado" — which NAMES NO MARKET. The
    // click regex (/confirm|resolve|seal/) matched neither button, a `.catch()` swallowed
    // it, and the run looked like it had worked. The database said otherwise: still
    // CLOSED, both positions still OPEN.
    //
    // ⛔ The near-miss is the real lesson. That same queue was holding a market with
    // TZS 59,450 of REAL player money on it. An ancestor-climbing locator that picks the
    // wrong card, plus a dialog that does not say what it is about, is one mis-click away
    // from sealing a stranger's verdict. The per-market page puts the market id in the
    // URL, so there is nothing to mis-scope — and the title is asserted before anything
    // is clicked.
    await page.goto(`${BASE}/admin/resolver/${marketId}`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});
    const onPage = await bodyText(page);
    if (!onPage.includes(THRESHOLD.toLocaleString("en-US").toLowerCase())) {
      throw new Error(`/admin/resolver/${marketId} does not show the expected market — refusing to click. Saw: ${onPage.slice(0, 200)}`);
    }
    await shot(page, "L9-resolver-page");

    // The ceremony is not one button. It is: pick the outcome, paste the EVIDENCE the
    // verdict rests on, type SEAL, then seal. The outcome buttons are labelled
    // "YES / NDIO", "NO / HAPANA", "VOID / BATILISHA" — two lines, so their accessible
    // name is "YES NDIO", and an anchored /^YES$/ matches nothing.
    // 🔴 AND `\b` DOES NOT SURVIVE A TEMPLATE LITERAL. The previous line was
    // `new RegExp(`^${outcome}\b`, "i")`, which puts a literal BACKSPACE (U+0008) in the
    // pattern rather than a word boundary — so it matched nothing, and Playwright's error
    // printed it as `/^YES/i` because a backspace is invisible. Three guesses at this
    // control's name were spent before `scripts/live-probe-resolver.mjs` asked the DOM:
    // it is "YES NDIO", which plain `^YES` had matched all along.
    await page.getByRole("button", { name: new RegExp(`^${outcome}`, "i") }).first().click();
    await page.waitForTimeout(500);

    // ⚠️ The evidence is the reading taken from the market's OWN declared source at the
    // instant its criterion names — not the AI sentinel's summary, which this very page
    // flags as "NOT THE APPROVED SOURCE". They agree here; the approved one is what the
    // verdict is recorded against.
    const EVIDENCE = process.env.EVIDENCE ??
      "Twelve Data quote for BTC/USD, provider-quoted 2026-08-03T00:00:00.000Z: US$63,570.00 — " +
      "strictly above the US$63,000.00 threshold, so the criterion resolves YES. Read through the " +
      "platform's own quoteAsset against the declared source api.twelvedata.com/quote at " +
      "00:00:15 UTC, skew 19s (limit 90s). Independent cross-check: the AI sentinel returned YES " +
      "at 88% confidence from Bybit/CoinGecko/Yahoo/CoinDesk, all above the threshold.";
    await page.locator("textarea").first().fill(EVIDENCE);
    await page.waitForTimeout(300);

    // "Type SEAL to arm" — a deliberate friction, and the reason a stray click cannot
    // publish a verdict. Find the field by its own placeholder.
    await page.locator('input[placeholder="SEAL" i], input[placeholder*="SEAL"]').first().fill("SEAL");
    await page.waitForTimeout(300);
    await shot(page, "L10-ceremony-armed");
    await page.getByRole("button", { name: /resolve & seal/i }).first().click();
    await page.waitForTimeout(3000);
    await shot(page, "L11-after-resolve");

    // ⚠️ THERE IS NO SECOND CONFIRM DIALOG HERE. "Resolve & seal" on the ceremony page
    // seals immediately — the ConfirmModal ("Settle YES now? · Yes, settle yes") belongs
    // to the QUEUE's inline controls, not to this page. A first version waited 30s for a
    // dialog that never opens, on a verdict that had ALREADY been sealed.
    //
    // ⛔ And sealing is NOT paying. The market goes RESOLVED with `settledAt = null` and
    // every position stays OPEN until the 24-hour objection window closes. Do not read
    // "verdict sealed" as "the players were paid" — check the wallet, not the toast.
    console.log((await bodyText(page)).slice(0, 300));
  }
} finally {
  for (const c of open) await c.close().catch(() => {});
  await br.close();
}
