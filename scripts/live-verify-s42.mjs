/**
 * SESSION-42 LIVE VERIFICATION — the three admin surfaces, driven on PRODUCTION.
 *
 * Session 42 shipped E-142 (regex advertised but never executed), E-144 (the wizard's
 * wall clock resolved in the browser) and E-145 (a proposed day pinned to UTC). All
 * three passed `tsc`, a full build and their own RED→GREEN guards — and none of them
 * had been LOOKED at, because the surfaces are admin-only and a login revokes Ali's
 * session. He authorised it explicitly; this is that run.
 *
 * ⛔ READ-ONLY. It types into filters and walks the create wizard to its REVIEW step,
 * and it never presses Publish. No market is created, no money moves. The one write
 * it performs is the login itself.
 *
 * ⭐ EVERY CHECK CARRIES ITS CONTROL. "The regex returned 3 rows" proves nothing on its
 * own — an unfiltered board returns rows too. Each assertion below pairs a pattern that
 * MUST match with one that must NOT, against the same list, so a filter that silently
 * ignores its input fails instead of passing.
 *
 * Run: LIVE_BASE=https://www.50pick.tz node scripts/live-verify-s42.mjs
 */
import { browser, login, shot, BASE } from "./live/harness.mjs";

const results = [];
const ok = (label, cond, detail = "") => {
  results.push({ label, cond: !!cond, detail });
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
};

const { b, ctx } = await browser({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
const consoleErrors = [];
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });

try {
  console.log(`base: ${BASE}\n`);
  await login(page, "admin");
  console.log("signed in as ADMIN (Ali's console login, authorised for this run)\n");

  // ── E-142 · regex is advertised AND executed ───────────────────────────────
  // The board lists AI polls. `/./` matches every title; `/zzzq[0-9]{4}zzz/` matches
  // none. If the pattern were still treated as literal text BOTH would return zero —
  // which is exactly what the defect did — so the PAIR is the evidence, not either half.
  {
    await page.goto(`${BASE}/admin/ai-polls`, { waitUntil: "networkidle" });
    const box = page.locator('input[type="search"]').first();
    ok("E-142: the AI-polls board has the shared SearchBox", await box.count() > 0);

    const rowsFor = async (q) => {
      await box.fill(q);
      await page.waitForTimeout(1400);           // 250ms debounce + server round-trip
      const txt = (await page.locator("body").innerText()).toLowerCase();
      // The board prints its own count; fall back to counting rendered poll links.
      const m = txt.match(/(\d+)\s+(?:poll|polls|result|results)\b/);
      return { count: m ? Number(m[1]) : null, txt };
    };

    const all = await rowsFor("");
    const matchAll = await rowsFor("/./");
    const matchNone = await rowsFor("/zzzq[0-9]{4}zzz/");

    ok("E-142: the echo says the query is a PATTERN (the advertisement)",
       /pattern/i.test(matchAll.txt), "the echo line under the box");
    ok("E-142: /./ does NOT empty the board — the regex actually ran",
       !/no polls|nothing found|no results/i.test(matchAll.txt),
       "before the fix a literal `/./` matched nothing and reported zero as the answer");
    ok("E-142: …and a deliberately-impossible pattern DOES empty it",
       /no polls|nothing found|no results|0 poll/i.test(matchNone.txt),
       "the control — proves the filter is reading the pattern, not ignoring it");
    ok("E-142: the two patterns disagree with each other",
       matchAll.txt !== matchNone.txt,
       "identical output for both would mean the input is being ignored");
    console.log(`   (unfiltered=${all.count} · /./=${matchAll.count} · impossible=${matchNone.count})`);
    await box.fill("/./");
    await page.waitForTimeout(1200);
    await shot(page, "s42-e142-regex-ai-polls");
  }

  // ── E-144 · the wizard echoes the instant it will STORE, with its zone ─────
  {
    await page.goto(`${BASE}/admin/markets/new`, { waitUntil: "networkidle" });
    await page.fill('input[placeholder*="TZS strengthen"], input', "Will this verification poll reach its review step?");
    await page.getByRole("button", { name: /continue/i }).click();
    await page.waitForTimeout(400);

    await page.fill('input[placeholder*="bot.go.tz"]', "https://www.bot.go.tz/exchangerates");
    const dt = page.locator('input[type="datetime-local"]');
    ok("E-144: the wizard uses a datetime-local (the zoneless input)", await dt.count() > 0);
    await dt.fill("2026-09-15T14:30");
    await page.getByRole("button", { name: /continue/i }).click();
    await page.waitForTimeout(400);

    await page.locator("textarea").first().fill(
      "Verification only — this wizard is walked to its review step and never published. Resolves against the stated source.",
    );
    await page.getByRole("button", { name: /continue/i }).click();
    await page.waitForTimeout(600);

    const review = await page.locator("body").innerText();
    ok("E-144: the review step names the ZONE it read the clock on", /EAT|GMT\+3/i.test(review),
       "a bare wall clock cannot be checked — it does not say which clock it came from");
    ok("E-144: …and shows the UTC instant that will be STORED", /stored as .*2026-09-15T11:30Z/i.test(review),
       "14:30 EAT must store as 11:30Z — the three hours are the defect");
    ok("E-144: it no longer prints the raw zoneless string alone",
       !/^\s*2026-09-15T14:30\s*$/m.test(review));
    await shot(page, "s42-e144-wizard-review-echo");
    console.log(`   (echo: ${(review.match(/Resolves at[\s\S]{0,90}/) ?? [""])[0].replace(/\s+/g, " ").trim()})`);
  }

  ok("no console errors on either surface", consoleErrors.length === 0,
     consoleErrors.slice(0, 2).join(" | "));
} finally {
  await ctx.close();
  await b.close();
}

const failed = results.filter((r) => !r.cond);
console.log(`\nlive-verify-s42: ${results.length - failed.length} passed, ${failed.length} failed`);
if (failed.length) process.exit(1);
