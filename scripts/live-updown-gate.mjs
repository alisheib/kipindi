/**
 * LIVE VERIFICATION — the dynamic per-asset gate, driven on production.
 *
 *   SHOT_DIR=./shots node scripts/live-updown-gate.mjs
 *
 * ⛔ WHAT THIS EXISTS TO PROVE, AND WHY A GREEN SUITE IS NOT IT. The gate's engine had 22
 * green checks and no caller for a whole session (§6ap). Unit tests cannot tell "the function
 * is correct" from "the screen calls it": only opening the dropdown can. So this reads the
 * REAL options out of the REAL console — their marks, their greying and their hints — and
 * pairs each one against the record shown in the asset table.
 *
 * ⚠️ The duration control is the kit Select, a custom combobox: the options exist only once
 * the trigger is opened, and a greyed one carries `aria-disabled`, never `disabled` (a
 * `disabled` button leaves the accessibility tree). Read them from `[role=option]`.
 */
import { browser, login, recorder, BASE, SHOT, bodyText, clickByName } from "./live/harness.mjs";

const rec = recorder("LIVE · the dynamic per-asset gate on production");
const { b, ctx } = await browser({ viewport: { width: 1600, height: 1100 } });
const page = await ctx.newPage();

try {
  // ADMIN, because /admin/updown's controls are gated on `accounting` and this is a
  // console-shape check rather than an RBAC one.
  await login(page, "admin");
  await page.goto(`${BASE}/admin/updown`, { waitUntil: "networkidle" });

  // ── 1 · THE RECORD IS ON THE PAGE, AND IT IS THE REAL ONE ──────────────────
  const assetRows = await page.evaluate(() => {
    const table = [...document.querySelectorAll("table")].find((t) =>
      /feed record/i.test(t.querySelector("thead")?.innerText ?? ""));
    if (!table) return null;
    const heads = [...table.querySelectorAll("thead th")].map((th) => th.innerText.trim());
    const col = heads.findIndex((h) => /feed record/i.test(h));
    return [...table.querySelectorAll("tbody tr")].map((tr) => {
      const tds = [...tr.querySelectorAll("td")];
      return { key: tds[0]?.innerText.trim(), record: tds[col]?.innerText.replace(/\s+/g, " ").trim() };
    });
  });
  rec.check("1.1 the asset table has a Feed record column", !!assetRows, "no table with that heading");
  const byKey = Object.fromEntries((assetRows ?? []).map((r) => [r.key, r.record]));
  rec.note(`asset records: ${JSON.stringify(byKey)}`);

  // BTC has 204 readings on production — it must show a real record, not "not measured".
  rec.check("1.2 ⭐ BTC shows a measured record with its sample size",
    /\d{2,} reads/.test(byKey.BTC ?? "") && /% ok/.test(byKey.BTC ?? ""), byKey.BTC);
  rec.check("1.3 …and the typical wait, which is what greys the short rounds",
    /\+\d+s typical/.test(byKey.BTC ?? ""), byKey.BTC);
  // SOL has 2. ⛔ A-5: it must say so and quote NO average.
  rec.check("1.4 ⭐ SOL reads NOT MEASURED — two readings are not a median",
    /not measured yet/i.test(byKey.SOL ?? ""), byKey.SOL);
  rec.check("1.5 …and quotes no typical figure it cannot support",
    !/typical/i.test(byKey.SOL ?? ""), byKey.SOL);

  const tbl = page.locator("table").filter({ hasText: "Feed record" }).first();
  await tbl.screenshot({ path: `${SHOT}/gate-asset-record.png` }).catch(() => {});

  // ── 2 · THE DURATION LIST, READ OUT OF THE REAL DROPDOWN ───────────────────
  await clickByName(page, /add chain/i);
  await page.waitForSelector('form:has-text("Add chain")', { timeout: 15_000 });

  /** Open a named kit Select and read every option: label, greyed, hint. */
  const readOptions = async (fieldLabel) => {
    const trigger = page.locator(`form:has-text("Add chain") button[role="combobox"]`).nth(
      fieldLabel === "Asset" ? 0 : fieldLabel === "Duration" ? 1 : 2);
    await trigger.click();
    await page.waitForSelector('[role="option"]', { timeout: 10_000 });
    // ⛔ WAIT FOR THE PANEL TO FINISH ARRIVING. `.m-float-in` animates opacity 0 → 1, and
    // `page.screenshot()` (unlike `locator.screenshot()`) does NOT wait for animations — so a
    // shot taken here catches the listbox half-transparent with the page bleeding through it,
    // which photographs exactly like an unreadable dropdown on a control that is fine. The
    // panel's own `bg-bg-elevated` is opaque; it simply had not got there yet.
    await page.waitForFunction(
      () => {
        const p = document.querySelector('[role="listbox"]');
        return !!p && getComputedStyle(p).opacity === "1";
      },
      undefined,
      { timeout: 5_000 },
    ).catch(() => {});
    // ⚠️ THE LABEL IS THE SECOND SPAN, NOT THE FIRST — a harness bug this run paid for.
    // The kit wraps label+hint in one `<span class="min-w-0 flex-1">`, so `querySelector("span")`
    // returns the WRAPPER and its innerText is label AND reason concatenated. Gold's 3-minute
    // reason contains the words "Over 15 minutes or more", so a search for the 15-minute option
    // matched the greyed 3-minute one and reported a correct console as broken. Read the label
    // span and the hint span separately, as the DOM actually nests them.
    const opts = await page.evaluate(() => [...document.querySelectorAll('[role="option"]')].map((o) => {
      const spans = [...o.querySelectorAll("span")];
      return {
        label: (spans[1]?.innerText ?? o.innerText).replace(/\s+/g, " ").trim(),
        hint: (spans[2]?.innerText ?? "").replace(/\s+/g, " ").trim(),
        text: o.innerText.replace(/\s+/g, " ").trim(),
        greyed: o.getAttribute("aria-disabled") === "true",
      };
    }));
    return { trigger, opts };
  };
  /** A duration option by its label — `\bN min\b`, which "15 minutes" cannot satisfy. */
  const byMinutes = (opts, m) => opts.find((o) => new RegExp(`\\b${m} min\\b`).test(o.label));

  // The asset picker first — the mark belongs at the moment of the choice.
  const assets = await readOptions("Asset");
  rec.note(`asset options: ${assets.opts.map((o) => `${o.label}${o.greyed ? " [GREYED]" : ""}`).join(" | ")}`);
  const btcOpt = assets.opts.find((o) => /\bBTC\b/.test(o.label));
  rec.check("2.1 ⭐ Bitcoin is offered, not greyed — 198 of 204 readings priced",
    !!btcOpt && !btcOpt.greyed, btcOpt ? `greyed=${btcOpt.greyed} · ${btcOpt.text.slice(0, 120)}` : "not listed");
  rec.check("2.2 …and it does NOT claim its rounds cannot be priced",
    !/cannot be priced/i.test(btcOpt?.text ?? ""), btcOpt?.text?.slice(0, 160));
  if (btcOpt) await page.locator('[role="option"]').filter({ hasText: "BTC" }).first().click();

  const durs = await readOptions("Duration");
  rec.note(`duration options: ${durs.opts.map((o) => `${o.label}${o.greyed ? " [GREYED]" : ""}`).join(" | ")}`);
  const dur = (m) => byMinutes(durs.opts, m);
  rec.check("2.3 ⭐ every allowed round length is OFFERED for Bitcoin, none greyed",
    durs.opts.length >= 6 && durs.opts.every((o) => !o.greyed),
    durs.opts.filter((o) => o.greyed).map((o) => o.label).join(", ") || `${durs.opts.length} options`);
  // The measured caution: 132s of a 3-minute round's 180s betting window is gone.
  rec.check("2.4 ⭐ 3 minutes carries the MEASURED betting-window sentence, in seconds",
    /betting/i.test(dur(3)?.text ?? "") && /\d+s/.test(dur(3)?.text ?? ""), dur(3)?.text?.slice(0, 220));
  rec.check("2.5 …and it says the round still settles, so a working length is not scared off",
    /settles correctly/i.test(dur(3)?.text ?? ""), dur(3)?.text?.slice(0, 220));
  rec.check("2.6 …and names the length it advises instead",
    /advise not running/i.test(dur(3)?.text ?? ""), dur(3)?.text?.slice(0, 220));
  rec.check("2.7 ⭐ 15 minutes carries no betting-window warning at all",
    !/betting/i.test(dur(15)?.text ?? ""), dur(15)?.text?.slice(0, 160));

  // ⚠️ THE VIEWPORT, NOT THE FORM. The kit Select renders its panel in a PORTAL at the document
  // root, so a `form`-scoped `locator.screenshot()` photographs the form with the open dropdown
  // CLIPPED — the one thing the shot exists to show. (Still not `fullPage`: that re-lays-out the
  // page and detaches the popover entirely.)
  await page.screenshot({ path: `${SHOT}/gate-add-chain.png` }).catch(() => {});

  // ⛔ AND LOOK AT THE TRIGGERS, not only the options. A money control whose chosen value is
  // truncated to "Smallest possible…" has not told the operator what the band is.
  // ⚠️ MEASURE THE SPAN THAT TRUNCATES, NOT THE BUTTON AROUND IT. The kit puts `.truncate` on
  // the inner span, so the button's own `scrollWidth` equals its `clientWidth` and a clipped
  // label reads as fine — the first version of this check called "Smallest possible…" unclipped
  // while the screenshot showed the ellipsis.
  const triggerLabels = await page.evaluate(() => [...document.querySelectorAll('form button[role="combobox"]')]
    .map((el) => {
      const span = el.querySelector("span") ?? el;
      return {
        shown: el.innerText.replace(/\s+/g, " ").trim(),
        clipped: span.scrollWidth > span.clientWidth + 1,
      };
    }));
  rec.note(`trigger labels: ${JSON.stringify(triggerLabels)}`);
  rec.check("2.8 no Add-chain trigger clips the value it is showing",
    triggerLabels.every((t) => !t.clipped && !/…|\.\.\./.test(t.shown)),
    triggerLabels.filter((t) => t.clipped || /…/.test(t.shown)).map((t) => t.shown).join(" | "));
  await page.keyboard.press("Escape");

  // ── 3 · GOLD IS STILL GREYED BELOW 15 MINUTES ──────────────────────────────
  //
  // ⛔ The catalogue floor must survive the measured record — measurement ESCALATES ONLY.
  // Gold has no readings at all here, so if the record had replaced the floor rather than
  // adding to it, gold would now be offered at 3 minutes.
  const goldOpt = assets.opts.find((o) => /\bXAU\b|gold/i.test(o.label));
  if (goldOpt) {
    const t = page.locator(`form:has-text("Add chain") button[role="combobox"]`).nth(0);
    await t.click();
    await page.locator('[role="option"]').filter({ hasText: /XAU|Gold/i }).first().click();
    const gd = await readOptions("Duration");
    rec.note(`gold durations: ${gd.opts.map((o) => `${o.label}${o.greyed ? " [GREYED]" : ""}`).join(" | ")}`);
    const g3 = byMinutes(gd.opts, 3);
    const g15 = byMinutes(gd.opts, 15);
    rec.check("3.1 ⭐ gold at 3 minutes is STILL greyed — measurement escalates, it never lifts a floor",
      !!g3?.greyed, g3 ? `greyed=${g3.greyed}` : "3m not listed");
    rec.check("3.2 …with the seam reason, not a feed-record one",
      /disagrees/i.test(g3?.text ?? ""), g3?.text?.slice(0, 160));
    rec.check("3.3 …and 15 minutes is offered", !!g15 && !g15.greyed, g15 ? `greyed=${g15.greyed}` : "15m not listed");
    await page.keyboard.press("Escape");
  } else {
    rec.note("gold is not an enabled asset on production — 3.x skipped");
  }

  const t = await bodyText(page);
  rec.check("4.1 the page did not error out under the new lookup", !/application error|something went wrong/.test(t));
} catch (e) {
  rec.check("driver completed", false, e.message);
  await page.screenshot({ path: `${SHOT}/gate-crash.png`, fullPage: true }).catch(() => {});
} finally {
  await b.close();
}

process.exit(rec.done() === 0 ? 0 : 1);
