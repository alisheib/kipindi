/**
 * SESSION 28 · §6b item ④b — IS THE ADD-CHAIN BAND TRIGGER TRUNCATING AGAIN?
 *
 * Session 27 saw `Smallest possible (recommende…` in ONE full-page shot at 1440 and filed it
 * as an UNVERIFIED suspicion rather than a finding. That was the right call; this measures it.
 *
 * ⛔ MEASURE THE SPAN, NEVER THE BUTTON. The kit puts `.truncate` on the span INSIDE the
 * trigger (`src/components/ui/select.tsx:220`), so the button's own `scrollWidth ===
 * clientWidth` and a probe written against the button reports "no overflow" over text the
 * operator cannot read. That is E-85's exact shape, and it is why the first probe for it lied.
 *
 * ⛔ AND IT MUST NOT PASS VACUOUSLY. `[].every()` is true, so a run that failed to open the
 * form would score every check green with the feature absent. Each stage throws instead.
 *
 *   node scripts/live-s28-clip.mjs
 */
import { browser, login, clickByName, recorder, BASE, SHOT } from "./live/harness.mjs";

const WIDTHS = [1280, 1440, 1920];
const rec = recorder("S28 · item 4b · the truncating SPAN, measured at three widths");

/**
 * Every kit Select trigger inside `scope`, measured at its `.truncate` SPAN.
 * `over > 1` means the operator is reading less than the control actually says.
 */
async function measureTriggers(page, scopeSel) {
  // ⚠️ EVALUATE ON THE LOCATOR, NOT ON THE PAGE. `:has-text()` is a Playwright engine
  // selector; `document.querySelector` throws `not a valid selector` on it. Passing the
  // resolved element in is the only way to scope a DOM measurement to a Playwright match —
  // and scoping is the rule that stops a page-wide read describing the wrong control.
  const scope = page.locator(scopeSel).first();
  if (!(await scope.count())) return null;
  return scope.evaluate((scope) => {
    return [...scope.querySelectorAll('button[role="combobox"]')].map((btn) => {
      const span = btn.querySelector("span");   // the label node, first child
      // ⭐ LINE COUNT, BECAUSE GEOMETRY ALONE IS BLIND TO A WRAP. Once the kit stopped
      // truncating (E-98), `scrollWidth === clientWidth` became true for a label that FITS
      // and for one that WRAPPED ONTO THREE LINES alike — so the overflow measure below
      // cannot tell a good layout from a cramped one. It said 0px hidden while `② 5 min`
      // was stacked over two lines, and only the screenshot showed it. Height/line-height
      // is the measurable difference, so the next run does not need my eye for this.
      const lh = parseFloat(getComputedStyle(span ?? btn).lineHeight) || 0;
      return {
        text: (span?.innerText ?? btn.innerText).replace(/\s+/g, " ").trim(),
        cls: span?.className ?? "",
        scrollW: span?.scrollWidth ?? -1,
        clientW: span?.clientWidth ?? -1,
        over: (span?.scrollWidth ?? 0) - (span?.clientWidth ?? 0),
        lines: lh > 0 ? Math.max(1, Math.round((span?.clientHeight ?? 0) / lh)) : 1,
        btnW: Math.round(btn.getBoundingClientRect().width),
      };
    });
  });
}

const { b, ctx } = await browser();
const page = await ctx.newPage();
try {
  await login(page, "admin");

  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`${BASE}/admin/updown`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("table", { timeout: 30_000 });

    // ── the ADD form ─────────────────────────────────────────────────────────
    await clickByName(page, /add chain/i);
    const formSel = 'form:has-text("Add chain")';
    await page.waitForSelector(formSel, { timeout: 15_000 });
    const add = await measureTriggers(page, formSel);
    if (!add?.length) throw new Error(`${width}: no comboboxes in the Add-chain form — a vacuous pass`);

    console.log(`\n  ── ${width}px · Add chain (${add.length} triggers) ──`);
    for (const t of add)
      console.log(`     ${t.text.padEnd(34)} span ${String(t.scrollW).padStart(4)}/${String(t.clientW).padStart(4)}  over=${String(t.over).padStart(3)}  lines=${t.lines}  btn=${t.btnW}`);

    // ⚠️ The band trigger is identified by ITS OWN TEXT, not by index. Session 27 lost a
    // reading to an index-based click when two assets vanished from a list between the read
    // and the click — prove which control you are looking at, every time.
    const band = add.find((t) => /smallest possible|narrow|wide|inherit/i.test(t.text));
    rec.check(`${width} · the band trigger is on screen`, !!band,
      band ? "" : `triggers read: ${add.map((t) => t.text).join(" | ")}`);
    if (band) {
      rec.check(`${width} · ⭐ the band trigger's span does NOT truncate`,
        band.over <= 1,
        `"${band.text}" — span wants ${band.scrollW}px inside ${band.clientW}px, ${band.over}px hidden`);
      // ⛔ THE CHECK THAT USED TO SIT HERE WAS A LIAR, AND IT IS INSTRUCTIVE.
      // It asserted `/\(recommended\)/.test(band.text)` — "the word survives" — and it passed
      // GREEN at 1280 while the screenshot plainly read `Smallest possible (reco…`. Of course
      // it did: `text-overflow: ellipsis` is PAINT. `innerText` hands back the whole string no
      // matter how little of it reaches the operator's eye, so that check would have passed
      // with the label 100% invisible. It is exactly the shape §0's "would this still pass if
      // the feature were absent?" is meant to catch, and it was written by the same run that
      // was hunting for that shape.
      // ⭐ The GEOMETRY above is the only honest assertion here; the words are not evidence.
    }
    const clipped = add.filter((t) => t.over > 1);
    rec.check(`${width} · no trigger anywhere in the Add-chain form truncates`,
      clipped.length === 0, clipped.map((t) => `${t.text} (-${t.over}px)`).join(" · "));
    // ⚠️ ONE LINE IS ASSERTED FOR THE ADD FORM ONLY. This form owns its own width and has
    // room, so a wrap there means the column split is wrong. The EDIT panel does NOT own its
    // width — it renders inside a table cell — so wrapping is the correct, honest behaviour
    // there and asserting one line would be demanding the truncation E-98 just removed.
    const wrapped = add.filter((t) => t.lines > 1);
    rec.check(`${width} · …and every trigger reads on ONE line, so no column is starved`,
      wrapped.length === 0, wrapped.map((t) => `${t.text} (${t.lines} lines)`).join(" · "));

    await page.locator(formSel).screenshot({ path: `${SHOT}/s28-addchain-${width}.png` }).catch(() => {});
    await page.keyboard.press("Escape");

    // ── the EDIT panel, which renders inside a ~390px TABLE CELL ──────────────
    // E-85's other half: `sm:grid-cols-3` responded to the VIEWPORT while the panel only had
    // a cell's width, so the band read "Sma…". It is stacked now; this proves it stayed so.
    const row = page.locator('tbody tr:has-text("BTC 5m")').first();
    if (await row.count()) {
      await row.getByRole("button", { name: /^edit$/i }).click();
      const editSel = 'form:has-text("Edit BTC 5m")';
      await page.waitForSelector(editSel, { timeout: 15_000 });
      const edit = await measureTriggers(page, editSel);
      if (!edit?.length) throw new Error(`${width}: no comboboxes in the Edit panel — a vacuous pass`);
      console.log(`  ── ${width}px · Edit BTC 5m (${edit.length} triggers) ──`);
      for (const t of edit)
        console.log(`     ${t.text.padEnd(34)} span ${String(t.scrollW).padStart(4)}/${String(t.clientW).padStart(4)}  over=${String(t.over).padStart(3)}  btn=${t.btnW}`);
      const bad = edit.filter((t) => t.over > 1);
      rec.check(`${width} · the in-cell Edit panel's band does not truncate either`,
        bad.length === 0, bad.map((t) => `${t.text} (-${t.over}px)`).join(" · "));
      await page.locator(editSel).screenshot({ path: `${SHOT}/s28-editchain-${width}.png` }).catch(() => {});
    } else {
      rec.note(`${width}: no BTC 5m row — the Edit panel was not measured`);
    }
  }
} finally {
  await b.close();
}
process.exit(rec.done());
