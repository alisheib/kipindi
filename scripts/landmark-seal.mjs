/**
 * LANDMARK SEAL — the live, SIGNED-IN landmark check.   `npm run qa:landmark-seal`
 *
 *   BASE=https://50pick.tz npm run qa:landmark-seal
 *
 * ⭐ WHY THIS EXISTS RATHER THAN JUST `test:responsive`. That audit signs in with
 * `GET /auth/demo`, which is dev-only and 404s in ANY production build — so
 * against production it silently runs as a GUEST, every gated route 302s to
 * /auth/login, and it prints a green cell named `/wallet` that measured the
 * sign-in page (`E-187`). This script uses a REAL QA-fleet session
 * (`live/harness.mjs` → `loginOnce`) and **asserts the gated routes landed on
 * themselves**, so a redirect can never read as a pass.
 *
 * Per cell it asserts, on the rendered DOM:
 *   · exactly ONE `<main>`, and its id is `main-content`   (B7 rule 5)
 *   · none of them nested inside another
 *   · the skip-link and its target both exist
 *   · `<html lang>` matches the locale cookie                (E-106's defect)
 *   · zero horizontal overflow
 *   · a gated route resolved to itself, not to /auth/login   (E-187)
 *
 * ⛔ READ-ONLY. It loads pages as a real player on production and moves NO money:
 * no bets, no settlements, no payouts. Keep it that way — the value of a seal you
 * can run any time is that running it is never a decision.
 *
 * 📌 First green: 2026-08-23, **171 cells · 0 problems** (10 public + 9 gated
 * routes × 360/768/1280 × EN/SW/ZH) on the deploy that shipped `E-185`.
 */
import { browser, loginOnce, BASE } from "./live/harness.mjs";

const GATED = ["/wallet", "/profile", "/positions", "/notifications", "/profile/security",
               "/wallet/deposit", "/wallet/withdraw", "/profile/kyc", "/positions/performance"];
const PUBLIC = ["/", "/markets", "/results", "/leaderboard", "/help", "/legal/privacy",
                "/proposals", "/live", "/updown", "/fairness"];
const WIDTHS = [360, 768, 1280];
const LOCALES = ["en", "sw", "zh"];

const { b } = await browser();
const state = await loginOnce(b, "fleet:07");
let cells = 0, bad = 0;
const problems = [];

for (const locale of LOCALES) {
  const ctx = await b.newContext({ storageState: state, viewport: { width: 1280, height: 900 } });
  await ctx.addCookies([{ name: "kp-locale", value: locale, url: BASE }]);
  for (const r of [...PUBLIC, ...GATED]) {
    for (const w of WIDTHS) {
      const p = await ctx.newPage();
      await p.setViewportSize({ width: w, height: 900 });
      try {
        await p.goto(`${BASE}${r}`, { waitUntil: "domcontentloaded", timeout: 40000 });
        await p.waitForLoadState("load", { timeout: 8000 }).catch(() => {});
        await p.waitForTimeout(700);
        const d = await p.evaluate(() => ({
          n: document.querySelectorAll("main").length,
          ids: [...document.querySelectorAll("main")].map((m) => m.id || "(no id)").join(","),
          nested: [...document.querySelectorAll("main")].filter((m) => m.parentElement && m.parentElement.closest("main")).length,
          skip: !!document.querySelector('a[href="#main-content"]') && !!document.getElementById("main-content"),
          lang: document.documentElement.lang,
          ovf: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        }));
        const path = new URL(p.url()).pathname;
        cells++;
        const ok = d.n === 1 && d.ids === "main-content" && d.nested === 0 && d.skip
          && d.lang === locale && d.ovf <= 1 && (PUBLIC.includes(r) || path === r);
        if (!ok) { bad++; problems.push(`${r}@${w}·${locale} → ${path} mains=${d.n}[${d.ids}] nested=${d.nested} skip=${d.skip} lang=${d.lang} ovf=${d.ovf}`); }
      } catch (e) { cells++; bad++; problems.push(`${r}@${w}·${locale} LOAD FAILED ${String(e).split("\n")[0].slice(0, 50)}`); }
      await p.close();
    }
  }
  await ctx.close();
}
await b.close();
console.log(`PRODUCTION SEAL — ${BASE}`);
console.log(`  ${PUBLIC.length} public + ${GATED.length} gated routes × ${WIDTHS.length} widths × ${LOCALES.length} locales`);
console.log(`  ${cells} cells measured · ${bad} problem(s)`);
if (problems.length) { console.log("\n  PROBLEMS:"); for (const x of problems.slice(0, 25)) console.log("    " + x); }
process.exit(bad ? 1 : 0);
