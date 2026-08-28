/**
 * DRIVE THE RESOLVER QUEUE'S BULK BAR IN A REAL BROWSER.
 *
 * ⛔ THE SUITE READS SOURCE; THIS READS THE SCREEN. `bulk-resolve.test.mts` proves the code
 * says the right things — it cannot prove the officer can reach the field, that the count
 * on the chip matches what the dialog promises, or that a disabled button explains itself.
 * Every assertion here is made against a rendered rectangle or rendered text.
 *
 * ⭐ WHAT IT IS ACTUALLY PROVING, in order:
 *   1. ONE reason field exists for a whole page of refused rows, not one per row.
 *   2. The disabled button ALWAYS has a tooltip — the reported defect was a dead control
 *      in the one state (every selected row refused) that had no explanation at all.
 *   3. A short reason blocks and says how many characters are missing.
 *   4. A full reason arms the button, and the chip count, the dialog heading and the listed
 *      rows all agree — the count must not promise a seal the server will refuse.
 *   5. Nothing overflows horizontally at 360/768/1280/1920.
 *
 *   BASE=http://localhost:3001 node scripts/resolver-queue-drive.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3001";
const MIN_REASON = 12;

let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`PASS ${name}${detail ? ` — ${detail}` : ""}`); }
  else { fail++; console.log(`FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 }, colorScheme: "dark" });
const page = await ctx.newPage();

/* A REAL admin session. `promote-admin` only flips the DB row — the session stays PLAYER
   and the bulk bar never renders, which is a silent no-op the drive would score as green. */
await page.goto(BASE + "/auth/demo", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.request.post(BASE + "/api/dev-test/seed-admin", { data: { phone: "+255700000001" }, timeout: 120000 });

/* ⛔ SEED THE VERDICT CLASSES, OR THIS FILE PROVES NOTHING. The sentinel fields are only
   written by a real AI call, so with no model key every row is blocked on `no-assessment`
   — which carries no outcome and is therefore not overridable. The whole of sections 3-5
   then never executes and the script prints ALL PASS. Seeding is part of the drive, not a
   prerequisite left to the operator to remember. */
const seeded = await page.request.post(BASE + "/api/dev-test/seed-resolver-verdicts", { data: {}, timeout: 180000 });
console.log("  seed:", (await seeded.text()).slice(0, 140));

await page.goto(BASE + "/admin/resolver-queue", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForLoadState("load", { timeout: 60000 }).catch(() => {});
await page.waitForTimeout(2000);

/* ── 0 · LIVENESS. A drive against an empty queue prints the same "0 failures" as a
      drive against a working one. Prove there is a population first. */
const bar = page.locator("[data-bulk-bar]");
ok("0.1 the bulk bar rendered (a real ADMIN session)", await bar.count() === 1, `${await bar.count()} bars`);
const boxes = page.locator('input[type="checkbox"]');
const rowCount = Math.max(0, await boxes.count() - 1); // minus the header's select-all
ok("0.2 the queue has rows to act on", rowCount > 0, `${rowCount} rows`);
if (rowCount === 0 || await bar.count() !== 1) {
  console.log("\nNO POPULATION — seed the queue first (node scripts/_seed-queue.mjs). Refusing to report green.");
  await browser.close();
  process.exit(1);
}

/* ── 1 · SELECT EVERYTHING and read the screen back. */
/* ⛔ CLICK THE LABEL, NOT THE INPUT. The kit Checkbox hides a real `<input>` as `sr-only`
   and makes the 44px LABEL the hit area — so `.check()` on the input times out against a
   perfectly working control ("label intercepts pointer events"). Driving the label is also
   what an officer actually does, which is the point of a drive. */
await page.locator('[data-bulk-bar] label').first().click();
await page.waitForTimeout(600);

const textareas = page.locator("textarea");
const taCount = await textareas.count();
const chipText = async () => (await page.locator("[data-bulk-bar]").innerText()).replace(/\s+/g, " ");

/* ⛔ CASE-INSENSITIVE, BECAUSE `innerText` RETURNS PAINTED TEXT. The chips are
   `uppercase` in CSS, so the DOM says "20 WILL SKIP" and a `/will skip/` needle matches
   nothing — scoring a working screen as 0 and passing every downstream assertion
   vacuously. This exact trap already cost this session one false read on "Purged". */
const willSeal = Number((await chipText()).match(/([0-9]+) will seal/i)?.[1] ?? 0);
const willSkip = Number((await chipText()).match(/([0-9]+) will skip/i)?.[1] ?? 0);
console.log(`\n  selected ${rowCount} rows · ${willSeal} will seal · ${willSkip} will skip · ${taCount} reason field(s)\n`);

/* ── 1a · THE POPULATION MUST CONTAIN THE STATES UNDER TEST ──────────────────
   ⭐ THE ASSERTION THAT STOPS THIS FILE LYING. Sections 3-5 are the whole point of the
   drive, and they are wrapped in `if (taCount === 1)`. Against a queue whose every row is
   blocked on `no-assessment` — which is what a machine with no model key produces — that
   branch never runs and the script prints ALL PASS having proved nothing about the shared
   field, the counts or the dialog. So the absence of an overridable row is a FAILURE of
   the drive, not a quiet skip. */
ok("1.0 the queue contains at least one OVERRIDABLE row (else 3-5 prove nothing)",
   taCount === 1, taCount === 0
     ? "no reason field rendered — seed with /api/dev-test/seed-resolver-verdicts"
     : `${taCount} fields`);

/* ⭐ THE HEADLINE ASSERTION. Twenty refused rows used to paint twenty boxes. */
ok("1.1 there is at most ONE reason field on the whole page", taCount <= 1, `${taCount} textareas over ${rowCount} rows`);
ok("1.2 the selection is accounted for — every ticked row seals or skips",
   willSeal + willSkip === rowCount, `${willSeal} + ${willSkip} vs ${rowCount} selected`);

const submit = page.locator('[data-bulk-bar] button', { hasText: /Resolve|Seal|Stage/ }).last();
const isDisabled = await submit.isDisabled();

/* ── 2 · A DISABLED CONTROL MUST SAY WHY. This is the defect that was reported as
      "I selected but nothing happened". */
if (isDisabled) {
  const tip = (await submit.getAttribute("title")) ?? "";
  ok("2.1 the disabled submit explains itself", tip.trim().length > 0, JSON.stringify(tip));
  ok("2.2 …and the explanation is about THIS state, not a generic label",
     /refused|compliance|characters|select/i.test(tip), JSON.stringify(tip.slice(0, 90)));
} else {
  ok("2.1 the submit is armed (some row is eligible with no reason typed)", willSeal > 0, `${willSeal} will seal`);
}

/* ── 3 · THE SHORT REASON. */
if (taCount === 1) {
  const ta = textareas.first();
  ok("3.0 the field is reachable and labelled",
     ((await ta.getAttribute("aria-label")) ?? "").length > 0, await ta.getAttribute("aria-label"));

  await ta.fill("too short");
  await page.waitForTimeout(400);
  ok("3.1 a short reason keeps the submit disabled", await submit.isDisabled(), "9 chars");
  const helpText = (await page.locator("#bulk-override-help").innerText()).replace(/\s+/g, " ");
  ok("3.2 …and the screen says how many characters are missing",
     /([0-9]+) more character/i.test(helpText), helpText.slice(0, 90));
  const missing = Number(helpText.match(/([0-9]+) more character/i)?.[1] ?? -1);
  ok("3.3 …and the number is right", missing === MIN_REASON - "too short".length, `said ${missing}, expected ${MIN_REASON - 9}`);

  /* ── 4 · THE FULL REASON ARMS THE BATCH. */
  await ta.fill("The AI cited an official mirror of the approved source domain.");
  await page.waitForTimeout(500);
  const sealAfter = Number((await chipText()).match(/([0-9]+) will seal/i)?.[1] ?? 0);
  ok("4.1 one typed reason arms the whole batch", !(await submit.isDisabled()), `${sealAfter} will seal`);
  ok("4.2 …and it covers MORE rows than before (the reason did something)",
     sealAfter > willSeal, `${willSeal} → ${sealAfter}`);

  /* ── 5 · THE COUNT MUST NOT LIE. Chip, dialog heading and listed rows must agree. */
  await submit.click();
  await page.waitForTimeout(900);
  const dialog = page.locator('[role="dialog"],[role="alertdialog"]');
  if (await dialog.count() > 0) {
    const dText = (await dialog.first().innerText()).replace(/\s+/g, " ");
    const heading = Number(dText.match(/Seal ([0-9]+) market/i)?.[1] ?? dText.match(/Stage ([0-9]+) market/i)?.[1] ?? -1);
    ok("5.1 the confirmation opened", true, dText.slice(0, 70));
    ok("5.2 the dialog's count matches the chip", heading === sealAfter, `chip ${sealAfter} · dialog ${heading}`);

    /* ⛔ THE BLOCKER THIS SESSION FIXED, ASSERTED ON THE PAINTED DIALOG.
       A market whose AI read produced no outcome can NEVER be sealed — `bulk-resolve-action`
       skips it unconditionally — yet the client used to count it, list it with a BLANK
       outcome, and add its pool to "player money held on the selected markets". So: every
       row the dialog lists must carry a YES or a NO. */
    /* ⛔ READ THE VALUE, NOT THE PROSE. An earlier version of this assertion scanned each
       row's TEXT for YES/NO and passed against the defect: a row with nothing to seal
       carries the reason "The AI returned no YES/NO outcome", and the scanner matched the
       "no" in the sentence describing the absence. `data-outcome` holds the outcome itself
       and nothing else. */
    const listed = await dialog.first().evaluate(() => {
      const root = document.querySelector('[role="dialog"],[role="alertdialog"]');
      return [...root.querySelectorAll("li")].map((el) => ({
        text: (el.innerText || "").replace(/\s+/g, " ").trim(),
        outcome: el.querySelector("[data-outcome]")?.getAttribute("data-outcome") ?? null,
      }));
    });
    ok("5.3 the dialog actually lists the markets (else 5.4 is vacuous)",
       listed.length > 0, `${listed.length} rows listed`);
    ok("5.3b …and every row exposes a machine-readable outcome slot",
       listed.every((r) => r.outcome !== null), "a row rendered no [data-outcome] element at all");
    const outcomeless = listed.filter((r) => r.outcome !== "YES" && r.outcome !== "NO");
    ok("5.4 every listed market carries an outcome to seal",
       outcomeless.length === 0,
       outcomeless.length
         ? `BLANK outcome on ${outcomeless.length} row(s): ${outcomeless.slice(0, 2).map((r) => r.text.slice(0, 70)).join(" | ")}`
         : `${listed.length} rows, all with a YES/NO to seal`);
    await page.keyboard.press("Escape");
  } else {
    ok("5.1 the confirmation opened", false, "no dialog appeared after clicking an ARMED submit");
  }
}

/* ── 6 · RESPONSIVE. A bar that overflows is a bar with controls off-screen. */
await page.keyboard.press("Escape");
for (const w of [360, 768, 1280, 1920]) {
  await page.setViewportSize({ width: w, height: 900 });
  await page.waitForTimeout(500);
  const over = await page.evaluate(() =>
    Math.max(document.documentElement.scrollWidth - document.documentElement.clientWidth, 0));
  ok(`6 · no horizontal overflow @${w}`, over <= 1, `${over}px past the fold`);
}

/* ── 7 · SORTING AND PAGING, ON THE RENDERED PAGE ────────────────────────────
   The suite proves the comparators are total and distinct; only a browser can prove the
   control is wired to them, that the officer's choice survives a page turn, and that the
   pager and the order agree about which rows exist. */
await page.setViewportSize({ width: 1280, height: 1000 });
const titlesOn = async (url) => {
  await page.goto(BASE + url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(1200);
  return page.evaluate(() => [...document.querySelectorAll("h3, h2 a, [data-market-title]")]
    .map((el) => (el.textContent || "").trim()).filter(Boolean).slice(0, 20));
};

const dueOrder = await titlesOn("/admin/resolver-queue?window=all&sort=due");
const moneyOrder = await titlesOn("/admin/resolver-queue?window=all&sort=money");
ok("7.1 the queue renders rows under an explicit sort", dueOrder.length > 0, `${dueOrder.length} titles`);
/* ⛔ NOT "the two arrays differ" — with every pool at 0 they legitimately would not, and the
   assertion would then fail against a correct page. The honest question is whether the
   CONTROL is wired: does the page echo back the sort it was given? */
const sortEcho = await page.evaluate(() => {
  const sel = document.querySelector('select[name="sort"], [name="sort"]');
  return sel ? (sel.value ?? sel.getAttribute("value")) : null;
});
ok("7.2 the sort control exists and echoes the ACTIVE order, not a default",
   sortEcho === "money", `control reads ${JSON.stringify(sortEcho)} on ?sort=money`);

/* ⛔ THE PAGER MUST CARRY IT. This is the defect that makes a sort worse than none: the
   officer orders by money, clicks page 2, and is silently reading a different queue. */
const pagerHrefs = await page.evaluate(() =>
  [...document.querySelectorAll('a[href*="/admin/resolver-queue"]')]
    .map((a) => a.getAttribute("href")).filter((h) => h && h.includes("page=")));
if (pagerHrefs.length > 0) {
  ok("7.3 every pager link carries the active sort",
     pagerHrefs.every((h) => h.includes("sort=money")),
     pagerHrefs.find((h) => !h.includes("sort=money")) ?? `${pagerHrefs.length} links, all carry it`);
} else {
  /* One page of results is a legitimate state — but it must be REPORTED, never counted as
     a pass, or a single-page queue certifies the pager for ever. */
  ok("7.3 every pager link carries the active sort", false,
     "NO pager links rendered — seed more than one page before trusting this");
}

/* An unknown order must fall back, not empty the queue or throw. */
const bogus = await titlesOn("/admin/resolver-queue?window=all&sort=nonsense");
ok("7.4 an unknown ?sort= falls back to the default rather than emptying the queue",
   bogus.length === dueOrder.length, `${bogus.length} rows vs ${dueOrder.length} under the default`);

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail === 0 ? 0 : 1);
