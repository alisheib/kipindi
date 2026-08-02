/**
 * LIVE PROOF — the AI progress bar, captured MID-GENERATION on production.
 *
 * A progress bar is the one feature you cannot verify from a finished state: by the time
 * the call returns it has gone. So this triggers a REAL Up & Down proposal generation and
 * samples the DOM while it is running — reading the bar's actual rendered width, the phase
 * label, and the elapsed counter — then confirms the run completed.
 *
 * ⚠️ Spends real Anthropic credit (~$0.10–0.16). Ali authorised it: "no matter needed
 * coins or tokens". It creates one proposal row on production, which is the normal
 * artefact of the feature working.
 *
 * Driven as the TRADING officer — generate is `trading`, and it is the narrowest identity
 * that holds it.
 */
import { BASE, bodyText, browser, login, recorder, shot } from "./live/harness.mjs";

const r = recorder("AI progress bar — captured mid-generation on production");
const { b, ctx } = await browser();
const page = await ctx.newPage();

try {
  await login(page, "trading");
  await page.goto(`${BASE}/admin/updown/proposals`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(3_000);

  const before = await bodyText(page);
  r.check("the proposals console renders", before.includes("propose a chain"), before.slice(0, 140));
  r.check("no progress bar is shown while idle", !/asking the ai to open/.test(before));

  // Fire the real generation. Do NOT await the action — the whole point is to observe
  // the page WHILE the server is still working.
  await page.getByRole("button", { name: /ask the ai to propose/i }).first().click();

  // Sample the live DOM every second for the first 30s of the call.
  const samples = [];
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(1_000);
    const s = await page.evaluate(() => {
      // The bar is the only element with a linear-gradient width animation in the form.
      const bar = [...document.querySelectorAll("div")]
        .find((d) => (d.getAttribute("style") ?? "").includes("linear-gradient") &&
                     (d.getAttribute("style") ?? "").includes("width"));
      const status = document.querySelector('[role="status"]');
      return {
        width: bar ? /** @type {HTMLElement} */ (bar).style.width : null,
        text: status ? status.textContent.replace(/\s+/g, " ").trim().slice(0, 90) : null,
      };
    });
    if (s.width) samples.push({ at: i + 1, ...s });
    if (i === 2) await shot(page, "P1-progress-early");
    if (i === 12) await shot(page, "P2-progress-mid");
    // Stop early once the generation has clearly finished.
    if (samples.length > 2 && !s.width) break;
  }

  r.check("the progress bar APPEARED during the call", samples.length > 0,
    `${samples.length} samples with a rendered bar`);
  if (samples.length) {
    r.note(`first: ${JSON.stringify(samples[0])}`);
    r.note(`last : ${JSON.stringify(samples[samples.length - 1])}`);
  }

  const widths = [...new Set(samples.map((s) => s.width))];
  r.check("the bar ADVANCED through more than one phase", widths.length > 1, widths.join(" → "));
  r.check("it never reached 100% mid-flight (it must not lie)",
    !widths.includes("100%"), widths.join(", "));

  const labels = [...new Set(samples.map((s) => (s.text ?? "").replace(/\d+s$/, "").trim()))];
  r.check("the phase LABEL changed as it advanced", labels.length > 1, labels.join(" | "));
  r.check("the elapsed counter is running",
    samples.some((s) => /\d+s/.test(s.text ?? "")), samples.at(-1)?.text ?? "");

  // And the generation really completed.
  await page.waitForFunction(
    () => !/asking the ai to open|reading the live price/i.test(document.body.innerText),
    undefined, { timeout: 180_000 },
  ).catch(() => {});
  await page.waitForTimeout(2_000);
  const after = await bodyText(page);
  await shot(page, "P3-after");
  r.check("the bar is gone once the call finished", !/asking the ai to open/.test(after));
  r.check("the generation produced a result (ready for review, or did not pass)",
    /ready for review|did not pass|didn't pass/.test(after), after.slice(0, 200));
} catch (err) {
  r.check("the run completed without throwing", false, String(err).slice(0, 400));
  await shot(page, "P-error");
} finally {
  await b.close();
}

process.exit(r.done() ? 1 : 0);
