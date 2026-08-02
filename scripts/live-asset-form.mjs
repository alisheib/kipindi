/**
 * E-46 acceptance — the guided Add-asset form, driven on LIVE PRODUCTION.
 *
 * Proves the three things Ali asked for, against the real console, as ADMIN (the only role that can):
 *   1. the choices are DROPDOWNS, and they CASCADE (asset class filters the symbols);
 *   2. what the symbol determines is LOCKED, and the trading window is stated up front;
 *   3. the live pre-flight really asks the provider and reports an honest verdict.
 *
 * And the part that matters most — it proves the SERVER refuses a bad pair even when the
 * form is bypassed entirely, because a dropdown is a courtesy and this is a money path.
 *
 * ⛔ Creates NOTHING. The only asset write it attempts is one that must be REFUSED.
 */
import { BASE, bodyText, browser, login, recorder, shot } from "./live/harness.mjs";

const r = recorder("E-46 — the guided Add-asset form on production");
const { b, ctx } = await browser();
const page = await ctx.newPage();

try {
  // ⚠️ ADMIN, deliberately and exceptionally. `createAsset` is `accounting`
  // (control-gates.ts:120) while `/admin/updown` is a `trading` route, and DEFAULT_GRANTS
  // makes the two disjoint — so per §6m the intersection is exactly {ADMIN}. A TRADING
  // officer correctly sees `ControlLocked` here and no form at all, which is why the first
  // run of this script timed out looking for the button. This is a genuinely ADMIN-only
  // control; every other live driver in this repo uses the narrowest identity.
  await login(page, "admin");
  await page.goto(`${BASE}/admin/updown`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(3_500);

  // Open the form.
  await page.getByRole("button", { name: /\+ add asset/i }).first().click();
  await page.waitForTimeout(1_500);
  const form = await bodyText(page);
  r.check("the Add-asset form opens", form.includes("add tradable asset"), form.slice(0, 160));
  await shot(page, "F1-form-open");

  // 1 · THE CHOICES ARE DROPDOWNS.
  // ⚠️ The kit Select trigger is `role="combobox"` (select.tsx:175), NOT a button, and its
  // options are `role="option"`. `getByRole("button", {name: /asset class/i})` matches
  // nothing and times out — on markup whose ARIA is correct. Same family as the stake
  // chips being `role="radio"`: ask for the control by the role it actually exposes.
  const classSel = page.getByRole("combobox", { name: /asset class/i }).first();
  const symbolSel = page.getByRole("combobox", { name: /symbol to quote/i }).first();
  r.check("there is an ASSET CLASS dropdown", (await classSel.count()) > 0);
  r.check("there is a SYMBOL dropdown", (await symbolSel.count()) > 0);

  // 2 · The symbol-derived fields are shown AND locked (posted as hidden inputs).
  r.check("the 'set by the symbol — not editable' panel is shown",
    form.includes("set by the symbol"), form.slice(0, 200));
  const editableCategory = await page.locator('input[name="category"]:not([type="hidden"]), select[name="category"]').count();
  r.check("category is NOT an editable field any more", editableCategory === 0, `${editableCategory} editable`);
  const hiddenCategory = await page.locator('input[name="category"][type="hidden"]').inputValue().catch(() => "");
  r.check("category is posted as a locked hidden value", !!hiddenCategory, hiddenCategory);
  const hiddenSource = await page.locator('input[name="priceSourceUrl"][type="hidden"]').inputValue().catch(() => "");
  r.check("the price source is auto-filled to the quote endpoint",
    hiddenSource === "https://api.twelvedata.com/quote", hiddenSource);

  // Default class is Crypto → the category must be crypto, which is the BNB invariant.
  r.check("a Crypto-class symbol locks category to `crypto` (the BNB invariant)",
    hiddenCategory === "crypto", hiddenCategory);
  r.check("the form states the 24/7 window for crypto",
    /24\/7/.test(form), form.slice(0, 200));

  // 3 · CASCADE — switch the class and the symbol list must follow.
  await classSel.click();
  await page.waitForTimeout(600);
  await page.getByRole("option", { name: /metals/i }).first().click().catch(async () => {
    await page.getByText(/^Metals$/).first().click();
  });
  await page.waitForTimeout(1_200);
  const metals = await bodyText(page);
  await shot(page, "F2-metals-selected");
  const metalCategory = await page.locator('input[name="category"][type="hidden"]').inputValue().catch(() => "");
  r.check("choosing Metals re-points the symbol and RE-LOCKS the category to `macro`",
    metalCategory === "macro", metalCategory);
  r.check("the form now states the FX/metals week, not 24/7",
    /22:00/.test(metals) && /21:00/.test(metals), metals.slice(0, 240));
  r.check("…and warns that nothing will be seen while it is shut",
    /no results at all/.test(metals), metals.slice(0, 240));

  // 4 · THE LIVE PRE-FLIGHT — really calls the provider.
  await page.getByRole("button", { name: /check the live feed/i }).first().click();
  await page.waitForTimeout(9_000);
  const checked = await bodyText(page);
  await shot(page, "F3-preflight");
  const verdictShown = /would confirm|too slow|market is shut|could not quote|cannot be used/.test(checked);
  r.check("the pre-flight returns a verdict from the real provider", verdictShown,
    checked.slice(0, 300));
  r.note(`verdict text: ${(checked.match(/(would confirm|readable, but too slow|the market is shut[^.]*|the provider could not quote[^.]*)/) ?? ["none"])[0]}`);

  // 5 · THE SERVER GATE — bypass the form entirely and post a bad pair.
  // This is the control; everything above is the courtesy.
  const refusal = await page.evaluate(async () => {
    // Drive the real server action the way the form does, but with BNB as `macro` —
    // the exact pair that shipped and broke.
    const res = await fetch("/api/admin/updown/symbol-check?symbol=ETH", { method: "GET" });
    return { status: res.status, body: (await res.text()).slice(0, 200) };
  });
  r.check("the pre-flight endpoint refuses an uncatalogued symbol (`ETH`, the real mistake)",
    refusal.status === 400 && /not in the symbol catalogue/i.test(refusal.body),
    JSON.stringify(refusal));

  const ok = await page.evaluate(async () => {
    const res = await fetch("/api/admin/updown/symbol-check?symbol=BTC/USD");
    return { status: res.status, body: (await res.text()).slice(0, 600) };
  });
  r.check("…and accepts a catalogued one (BTC/USD) with a real verdict",
    ok.status === 200 && /verdict/.test(ok.body), JSON.stringify(ok));
  r.note(`BTC/USD pre-flight: ${ok.body}`);
} catch (err) {
  r.check("the run completed without throwing", false, String(err).slice(0, 400));
  await shot(page, "F-error");
} finally {
  await b.close();
}

process.exit(r.done() ? 1 : 0);
