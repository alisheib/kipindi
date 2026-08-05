/**
 * SESSION 27 · BUILD THE BOARD BACK THROUGH THE CONSOLE — the guide's §9, driven.
 *
 * The board was deliberately emptied at the end of session 26 (§6as): 4 assets, 0 chains,
 * 0 rounds, 0 observations. Re-creating it through the operator's own screens IS the first
 * test — a walkthrough nobody has walked is a claim, not a document.
 *
 *   node scripts/live-s27-board.mjs read      # asset table + Add-chain dropdowns, nothing written
 *   node scripts/live-s27-board.mjs create    # BTC · 5 min · Smallest possible
 *   node scripts/live-s27-board.mjs start     # start it (confirm scoped to the dialog)
 *   node scripts/live-s27-board.mjs generate  # press Generate round on the BTC row
 *
 * ⛔ Traps this file already encodes, all paid for by earlier sessions:
 *  · `clickByName` is PAGE-WIDE and takes `.first()`. On a grid where every row has its own
 *    Start, a confirm click after a row click lands on the NEXT row. Every confirm here is
 *    scoped to `[role=dialog]` / `[role=alertdialog]`.
 *  · The kit Select renders its panel in a PORTAL at the document root and fades it in with
 *    `.m-float-in`, so a shot taken on open photographs an opaque panel as see-through.
 *    Wait for `opacity === 1` before reading or shooting.
 *  · The option LABEL is the second span; the first is the wrapper carrying label+hint
 *    concatenated, so a naive read matches gold's 3-minute reason against the 15-minute one.
 */
import { browser, login, clickByName, recorder, BASE, SHOT } from "./live/harness.mjs";

const CMD = process.argv[2] ?? "read";
const rec = recorder(`S27 · board build · ${CMD}`);

/** Read every option of the Nth kit Select inside the Add-chain form. */
async function readSelect(page, idx) {
  const trigger = page.locator(`form:has-text("Add chain") button[role="combobox"]`).nth(idx);
  await trigger.click();
  await page.waitForSelector('[role="option"]', { timeout: 10_000 });
  await page.waitForFunction(() => {
    const p = document.querySelector('[role="listbox"]');
    return !!p && getComputedStyle(p).opacity === "1";
  }, undefined, { timeout: 5_000 }).catch(() => {});
  const opts = await page.evaluate(() => [...document.querySelectorAll('[role="option"]')].map((o) => {
    const spans = [...o.querySelectorAll("span")];
    return {
      label: (spans[1]?.innerText ?? o.innerText).replace(/\s+/g, " ").trim(),
      hint: (spans[2]?.innerText ?? "").replace(/\s+/g, " ").trim(),
      greyed: o.getAttribute("aria-disabled") === "true",
    };
  }));
  return { trigger, opts };
}

/** Pick an option by a regex over its label, from the panel that is already open. */
/**
 * Click the option whose LABEL matches, from the panel that is already open.
 *
 * ⛔ NOT `filter({ hasText })`. Playwright matches a RegExp against `textContent`, which is
 * unnormalised and concatenates the option's label with its hint — so the panel shown above
 * renders as `②5 minBTC has only 0 recorded…` and `/\b5 min\b/` cannot match it: the character
 * after "min" is "B". The label and the hint are separate spans in the DOM (that is how the kit
 * nests them), so match the LABEL span and click by index.
 */
async function pick(page, opts, re) {
  const i = opts.findIndex((o) => re.test(o.label));
  if (i < 0) throw new Error(`no option matching ${re} — panel had ${opts.length}: ${opts.map((o) => o.label).join(" | ")}`);
  await page.locator('[role="option"]').nth(i).click();
}

/** The asset table's rows: key → the Feed record cell, read as the operator sees it. */
async function assetRecords(page) {
  return page.evaluate(() => {
    // ⛔ CASE-INSENSITIVE. The thead carries `uppercase`, and Chrome applies text-transform
    // to innerText — so `<th>Feed record</th>` reads back as "FEED RECORD". A case-sensitive
    // match here reported a column that is plainly on screen as missing, and then two checks
    // below it passed VACUOUSLY over the empty array that produced.
    const tbl = [...document.querySelectorAll("table")].find((t) =>
      /feed record/i.test(t.querySelector("thead")?.innerText ?? ""));
    if (!tbl) return null;
    const heads = [...tbl.querySelectorAll("thead th")].map((th) => th.innerText.trim());
    const col = heads.findIndex((h) => /feed record/i.test(h));
    return [...tbl.querySelectorAll("tbody tr")].map((tr) => {
      const cells = [...tr.querySelectorAll("td")].map((td) => td.innerText.replace(/\s+/g, " ").trim());
      return { key: (cells[0] ?? "").split(" ")[0], record: cells[col] ?? "", cells };
    });
  });
}

const { b, ctx } = await browser();
const page = await ctx.newPage();
try {
  await login(page, "admin");
  await page.goto(`${BASE}/admin/updown`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('table', { timeout: 30_000 });

  if (CMD === "read") {
    const rows = await assetRecords(page);
    rec.check("1.1 the asset table renders with a Feed record column", !!rows,
      rows === null ? "no table carried that heading" : "");
    // ⛔ REFUSE TO CONTINUE WHEN THE PREMISE IS ABSENT. `[].every()` is TRUE, so 1.2 and 1.3
    // scored green on a table this run could not find — a check that passes with the feature
    // removed is worth less than no check.
    if (!rows?.length) throw new Error("no asset rows found — 1.2/1.3 would have passed vacuously");
    for (const r of rows) rec.note(`${r.key.padEnd(4)} ${r.record}`);
    // The board was wiped, so EVERY asset must say it has never been read — and must quote
    // no average at all. A median off zero readings renders identically to one off two
    // thousand, which is exactly the fabrication A-5 forbids.
    rec.check("1.2 ⭐ every asset reads `no readings yet` after the wipe",
      rows.every((r) => /no readings yet/i.test(r.record)),
      rows.map((r) => `${r.key}=${r.record}`).join(" | "));
    rec.check("1.3 …and none quotes a typical wait or a success rate it cannot support",
      rows.every((r) => !/typical|% ok/i.test(r.record)),
      rows.filter((r) => /typical|% ok/i.test(r.record)).map((r) => r.key).join(", "));

    const tbl = page.locator("table").filter({ hasText: "Feed record" }).first();
    await tbl.screenshot({ path: `${SHOT}/s27-assets-no-readings.png` }).catch(() => {});

    await clickByName(page, /add chain/i);
    await page.waitForSelector('form:has-text("Add chain")', { timeout: 15_000 });

    const assets = await readSelect(page, 0);
    rec.note(`assets: ${assets.opts.map((o) => `${o.label}${o.greyed ? " [GREYED]" : ""}`).join(" | ")}`);
    const btc = assets.opts.find((o) => /\bBTC\b/.test(o.label));
    // ⛔ E-84's lesson: an UNMEASURED asset must not be blocked. The gate reasons from a
    // record that no longer exists, so if "no readings" resolved to ③ the flagship asset
    // would be unselectable on a board the operator was told to build from.
    rec.check("2.1 ⭐ BTC is selectable with zero readings — unmeasured is not unusable",
      !!btc && !btc.greyed, btc ? `greyed=${btc.greyed} · ${btc.hint}` : "not listed");
    await pick(page, assets.opts, /BTC/);

    const durs = await readSelect(page, 1);
    rec.note(`durations: ${durs.opts.map((o) => `${o.label}${o.greyed ? " [GREYED]" : ""} ${o.hint}`).join(" | ")}`);
    rec.check("2.2 ⭐ no round length is greyed for an unmeasured BTC",
      durs.opts.length >= 6 && durs.opts.every((o) => !o.greyed),
      durs.opts.filter((o) => o.greyed).map((o) => o.label).join(", ") || `${durs.opts.length} options`);
    const three = durs.opts.find((o) => /\b3 min\b/.test(o.label));
    rec.check("2.3 …and 3 minutes carries the UNMEASURED caution, not a fabricated median",
      !!three && !/\+\d+s typical|\d+s of/i.test(three.hint), three ? three.hint : "3 min not listed");
    // ⛔ THE GUIDE'S §8.5 DEFINES TWO STATES, and the console's own asset table renders both:
    // `no readings yet` (never read) and `not measured yet` (read, under the 20-sample floor).
    // The gate's sentence must not collapse them into "only 0 recorded readings" — which is
    // both a different fact and not a sentence a person would write.
    rec.check("2.4 ⭐ the ZERO-reading hint reads as never-read, not as `only 0 readings`",
      !!three && !/only 0 recorded reading/i.test(three.hint), three ? three.hint : "3 min not listed");
    await pick(page, durs.opts, /\b5 min\b/);

    const bands = await readSelect(page, 2);
    rec.note(`bands: ${bands.opts.map((o) => `${o.label} — ${o.hint}`).join(" | ")}`);
    rec.check("2.5 the recommended band is named in the option itself",
      bands.opts.some((o) => /recommended/i.test(o.label)),
      bands.opts.map((o) => o.label).join(" | "));
    await page.keyboard.press("Escape");
    await page.screenshot({ path: `${SHOT}/s27-add-chain.png` }).catch(() => {});
  }

  if (CMD === "create") {
    // ⛔ IDEMPOTENT. A second `create` run makes a SECOND BTC 5m chain on production, and two
    // chains on one asset double the provider reads at every boundary — the exact accident
    // §6aq's page-wide-confirm trap caused. Verify-only when the row is already there.
    const existing = await page.locator('tbody tr:has-text("BTC 5m")').count();
    if (existing > 0) rec.note(`BTC 5m already exists (${existing} row) — verifying, creating nothing`);
    if (existing === 0) {
    await clickByName(page, /add chain/i);
    await page.waitForSelector('form:has-text("Add chain")', { timeout: 15_000 });
    const a = await readSelect(page, 0); await pick(page, a.opts, /BTC/);
    const d = await readSelect(page, 1); await pick(page, d.opts, /\b5 min\b/);
    const m = await readSelect(page, 2); await pick(page, m.opts, /smallest possible/i);
    // The trigger labels are what the operator actually reads before pressing Add — assert
    // the CHOSEN values, not that a dropdown exists.
    const chosen = await page.locator('form:has-text("Add chain") button[role="combobox"]')
      .evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, " ").trim()));
    rec.note(`chosen: ${JSON.stringify(chosen)}`);
    rec.check("3.1 the form shows BTC · 5 min · Smallest possible before submit",
      /BTC/.test(chosen[0] ?? "") && /5 min/.test(chosen[1] ?? "") && /smallest possible/i.test(chosen[2] ?? ""),
      chosen.join(" | "));
    await page.locator('form:has-text("Add chain") button[type="submit"]').click();
    }
    // A row appearing is the outcome; a toast is chrome.
    // ⚠️ THE CHAIN'S LABEL IS `BTC 5m`, NOT "5 min" — the dropdown says "5 min", the row says
    // "5m", and matching the form's wording against the grid reported a chain that had just
    // been written to the database as missing. Assert what the GRID renders.
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector("table", { timeout: 30_000 });
    const row = await page.evaluate(() => {
      const tr = [...document.querySelectorAll("tbody tr")].find((r) => /BTC\s*5m/i.test(r.innerText));
      return tr ? tr.innerText.replace(/\s+/g, " ").trim() : null;
    });
    rec.note(`chain row: ${row}`);
    rec.check("3.2 ⭐ the chain exists and is STOPPED, as the guide says it will be",
      !!row && /stopped/i.test(row), row ?? "no BTC 5 min row");
    rec.check("3.3 …its market reads open", !!row && /open/i.test(row), row ?? "");
    rec.check("3.4 …and its margin is the tick floor, ±0.02 · min move",
      !!row && /±0\.02/.test(row) && /min move/i.test(row), row ?? "");
  }

  // ── §14.2 · the operator's OWN lever for a no-move refund ────────────────────
  //
  // ⛔ THROUGH THE CONSOLE, NEVER THE DATABASE. The guide tells the operator to widen the band
  // from the chain row's Edit panel and to put it back afterwards; driving it any other way
  // tests something the operator cannot do.
  // ⚠️ A ROUND FREEZES ITS BAND AT OPEN, so this lands on the NEXT round. Reading the running
  // one and finding ±0.02 is what "the control did nothing" looks like when it worked.
  if (CMD === "band") {
    const want = process.argv[3];                       // "0.50" | "" (inherit) | "0.02"
    if (want === undefined) throw new Error('usage: band <"0.50"|"0.02"|""> — the value the Select carries');
    const row = page.locator('tbody tr:has-text("BTC 5m")').first();
    await row.getByRole("button", { name: /^edit$/i }).click();
    await page.waitForSelector('form:has-text("Edit BTC 5m")', { timeout: 15_000 });
    const trigger = page.locator('form:has-text("Edit BTC 5m") button[role="combobox"]').first();
    await trigger.click();
    await page.waitForSelector('[role="option"]', { timeout: 10_000 });
    const opts = await page.evaluate(() => [...document.querySelectorAll('[role="option"]')].map((o) => {
      const spans = [...o.querySelectorAll("span")];
      return { label: (spans[1]?.innerText ?? o.innerText).replace(/\s+/g, " ").trim() };
    }));
    rec.note(`band options: ${opts.map((o) => o.label).join(" | ")}`);
    const wanted = want === "" ? /^inherit/i : want === "0.50" ? /very wide/i : /smallest possible/i;
    const i = opts.findIndex((o) => wanted.test(o.label));
    if (i < 0) throw new Error(`no band option matching ${wanted} — had: ${opts.map((o) => o.label).join(" | ")}`);
    await page.locator('[role="option"]').nth(i).click();
    const shown = await trigger.innerText();
    rec.note(`band trigger now: ${shown.replace(/\s+/g, " ").trim()}`);
    await page.locator('form:has-text("Edit BTC 5m") button[type="submit"]').click();
    await page.waitForTimeout(4000);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector("table", { timeout: 30_000 });
    const after = (await page.locator('tbody tr:has-text("BTC 5m")').first().innerText()).replace(/\s+/g, " ").trim();
    rec.note(`row after: ${after}`);
    // ⛔ Assert the OUTCOME — the MARGIN cell the operator reads — not that a form submitted.
    const expect = want === "0.50" ? /0\.50%/ : /±0\.02/;
    rec.check(`5.1 the chain row shows the band that was just chosen (${want || "inherit"})`,
      expect.test(after), after);
  }

  if (CMD === "start" || CMD === "generate") {
    const rowSel = 'tbody tr:has-text("BTC 5m")';
    const row = page.locator(rowSel).first();
    await row.waitFor({ state: "visible", timeout: 20_000 });
    if (CMD === "start") {
      // ⚠️ START HAS NO CONFIRM, AND THAT IS THE DESIGN, NOT A GAP: `Stop` is the destructive
      // one (it ends a source of rounds) and carries a ConfirmDialog; starting is reversible by
      // the button next to it. This driver expected a dialog and timed out — the harness was
      // wrong, the console was not. ⛔ The row scope stays regardless: `getByRole` off the ROW,
      // never off the page, because every row has its own Start.
      await row.getByRole("button", { name: /^start$/i }).click();
    } else {
      await row.getByRole("button", { name: /generate round/i }).click();
    }
    await page.waitForTimeout(6000);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector("table", { timeout: 30_000 });
    const after = await page.locator(rowSel).first().innerText();
    rec.note(`row after ${CMD}: ${after.replace(/\s+/g, " ").trim()}`);
    if (CMD === "start") {
      rec.check("4.1 the chain is RUNNING", /running/i.test(after), after.replace(/\s+/g, " ").slice(0, 200));
    }
  }
} finally {
  await b.close();
}
process.exit(rec.done());
