/**
 * E-40 acceptance — press "Ask the AI to propose" on LIVE PRODUCTION.
 *
 * Driven as the QA TRADING officer (712000104), which is the narrowest identity that
 * holds `trading` — generate is a `trading` action. NOT as ADMIN: an owner bypass would
 * prove nothing about whether a real operator can do this.
 *
 * ⚠️ §3 traps honoured:
 *  · the phone field takes the 9-digit local part, not 10;
 *  · assertions compare LOWERCASED collapsed body text, never raw innerText
 *    (Chrome applies text-transform, so CSS-uppercased UI fails a case-sensitive match);
 *  · the submit control is asked for by WHAT IT IS (its accessible name), not by
 *    `button[type=submit]` — the kit renders `type="button"` and submits in JS, which is
 *    what made the withdrawal form look broken when it was fine.
 *
 * This SPENDS real Anthropic credit (~$0.09) and writes a real proposal row. That is the
 * point: a probe is not a round, and a green build is not evidence.
 */
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const BASE = "https://50pick.tz";
const SHOT = process.env.SHOT_DIR ?? ".";

function qaEnv(name) {
  const txt = readFileSync(new URL("../.env.qa.local", import.meta.url), "utf8");
  const m = txt.match(new RegExp(`^${name}\\s*=\\s*(.+)$`, "m"));
  if (!m) throw new Error(`${name} missing from .env.qa.local`);
  return m[1].trim().replace(/^["']|["']$/g, "");
}

const bodyText = async (page) =>
  (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, " ").toLowerCase();

let pass = 0; const fails = [];
const check = (name, ok, detail = "") => {
  if (ok) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();

// Surface the server's own complaint if the action fails again.
page.on("console", (m) => { if (m.type() === "error") console.log(`    [browser console] ${m.text().slice(0, 200)}`); });

try {
  console.log("\nE-40 — 'Ask the AI to propose' on production\n");

  // ── Sign in as the trading officer ────────────────────────────────────────
  await page.goto(`${BASE}/auth/admin`, { waitUntil: "domcontentloaded" });
  // ⚠️ §3: `PhoneInput` renders a VISIBLE `input#phone[type=text][inputmode=numeric]`
  // and mirrors it into a HIDDEN `input[name=phone]`. Filling the hidden one times out
  // ("locator resolved to <input type=hidden…>"), which reads as a broken login page on a
  // page that is fine — the same "ask for the control by what it IS" lesson as §4b's
  // withdrawal-form false alarm. The visible node is `#phone`, and it takes 9 digits.
  await page.fill("#phone", "712000104");
  await page.fill('input[type="password"]', qaEnv("QA_TRADING_PASSWORD"));
  await page.getByRole("button", { name: /sign in|log in|ingia/i }).first().click();
  await page.waitForLoadState("networkidle", { timeout: 45_000 }).catch(() => {});
  check("signed in as the trading officer", !/sign in to the console|invalid/i.test(await bodyText(page)));

  // ── The proposals queue ───────────────────────────────────────────────────
  await page.goto(`${BASE}/admin/updown/proposals`, { waitUntil: "networkidle", timeout: 60_000 });
  const before = await bodyText(page);
  check("the proposals page renders for a trading officer", before.includes("propose a chain"), before.slice(0, 160));
  check("AI generation is ON (button is not the 'off' label)", !before.includes("ai generation is off"));
  // The BASELINE the growth assertion is measured against — read before the click, so
  // "it grew" is a real comparison rather than "it is non-zero".
  const before_total = Number((before.match(/(\d+) of (\d+)/) ?? [])[2] ?? 0);
  console.log(`    queue holds ${before_total} proposal(s) before the click`);
  await page.screenshot({ path: `${SHOT}/e40-1-before.png`, fullPage: true });

  // ── Press the button, by its accessible name (§3: not by type=submit) ─────
  const btn = page.getByRole("button", { name: /ask the ai to propose/i }).first();
  check("the 'Ask the AI to propose' button is present and enabled",
    (await btn.count()) > 0 && await btn.isEnabled());

  await btn.click();
  console.log("    …clicked; the AI call takes ~20-60s");

  // Wait for EITHER outcome toast — success, "didn't pass the checks", or the failure.
  await page.waitForFunction(
    () => /proposal ready for review|did not pass the checks|could not generate a proposal/i
      .test(document.body.innerText),
    { timeout: 180_000 },
  ).catch(() => console.log("    (no toast within 180s)"));

  const after = await bodyText(page);
  await page.screenshot({ path: `${SHOT}/e40-2-after.png`, fullPage: true });

  // THE ASSERTION THAT MATTERS: the old failure must be gone.
  check("no 'could not generate a proposal' failure", !after.includes("could not generate a proposal"),
    after.includes("could not generate a proposal") ? "the action still refuses" : "");

  // ⚠️ DO NOT assert on the toast. It is transient — `deferToast` fires after
  // `router.refresh()` and it auto-dismisses, so a poll can miss it entirely and report
  // a working generation as a failure (it did, on the first run of this script, against
  // a proposal that had in fact been written and audited). Assert on DURABLE state: the
  // queue row. Same lesson as §3 — pair the claim with the state it reflects.
  await page.reload({ waitUntil: "networkidle" });
  const queue = await bodyText(page);

  check("the queue no longer says 'no proposals yet'", !queue.includes("no proposals yet"),
    queue.includes("no proposals yet") ? "reads are still failing silently" : "");

  // The counter the page prints — "N of M" — must have grown past zero.
  const total = Number((queue.match(/(\d+) of (\d+)/) ?? [])[2] ?? 0);
  check("the queue holds at least one proposal", total > before_total,
    `before ${before_total}, after ${total}`);

  // And the row must carry a real verdict, not an empty shell.
  const verdict = /ready for review|didn't pass checks|approved|armed|failed/.test(queue);
  check("the proposal carries a state (ready / didn't pass / approved / armed)", verdict,
    verdict ? "" : queue.slice(0, 240));
  await page.screenshot({ path: `${SHOT}/e40-3-queue.png`, fullPage: true });

  console.log(`\nscreenshots: e40-1-before.png · e40-2-after.png · e40-3-queue.png`);
} catch (err) {
  check("the run completed without throwing", false, String(err).slice(0, 300));
  await page.screenshot({ path: `${SHOT}/e40-error.png`, fullPage: true }).catch(() => {});
} finally {
  await browser.close();
}

console.log(`\n${pass} passed, ${fails.length} failed\n`);
for (const f of fails) console.log(`  · ${f}`);
process.exit(fails.length ? 1 : 0);
