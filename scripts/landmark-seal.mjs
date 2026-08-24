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
 *   · ⭐ NO UNREACHABLE CONTROL — no button/link past the viewport edge with no
 *     scrollable ancestor                                    (E-190, `live/clip.mjs`)
 *   · a gated route resolved to itself, not to /auth/login   (E-187)
 *
 * ⭐ WHY THE LAST TWO ARE DIFFERENT CHECKS, AND WHY BOTH ARE NEEDED. `body` carries
 * `overflow-x: clip`, so a control severed 30px past the right edge leaves
 * `documentElement.scrollWidth - clientWidth` at **0**. Overflow and reachability are
 * not the same question, and the one that matters to a player is the second.
 *
 * ⛔ READ-ONLY. It loads pages as a real player on production and moves NO money:
 * no bets, no settlements, no payouts. Keep it that way — the value of a seal you
 * can run any time is that running it is never a decision.
 *
 * 📌 First green: 2026-08-23, **171 cells · 0 problems** (10 public + 9 gated
 * routes × 360/768/1280 × EN/SW/ZH) on the deploy that shipped `E-185`.
 * 📌 2026-08-24: **1024 added** and the reachability rule with it — see `live/clip.mjs`
 * for what the old width set could not see, and `red:header-fit` for the proof it fails.
 */
import { browser, loginOnce, BASE } from "./live/harness.mjs";
// ⛔ ONE definition of "unreachable", shared with `red:header-fit`. See `live/clip.mjs`.
import { CLIP_PROBE, LG_XL_BAND } from "./live/clip.mjs";

const GATED = ["/wallet", "/profile", "/positions", "/notifications", "/profile/security",
               "/wallet/deposit", "/wallet/withdraw", "/profile/kyc", "/positions/performance"];
const PUBLIC = ["/", "/markets", "/results", "/leaderboard", "/help", "/legal/privacy",
                "/proposals", "/live", "/updown", "/fairness"];
/**
 * ⭐ 1024 IS IN THIS LIST BECAUSE ITS ABSENCE IS WHAT LET E-190 SHIP. The sweep ran
 * 360/768/1280 and stepped straight over the `lg`–`xl` band — the one band where the desktop
 * nav is on AND the bar has no slack — so the width at which the account menu was severed was
 * the width nothing looked at. A width set that skips a breakpoint is a width set that cannot
 * see the defect that lives in it.
 */
const WIDTHS = [360, 768, LG_XL_BAND, 1280];
const LOCALES = ["en", "sw", "zh"];

/**
 * ⭐ LOCAL MODE, so this seal can be REHEARSED and PROVEN RED without touching production.
 * Session 59's lesson, applied: *"an ops script nobody can rehearse is one whose first run is
 * on the real thing."* `/auth/demo` is the local sign-in (it 404s in any production build, so
 * this branch can only ever be taken against localhost), and the gated-route assertion below
 * is unchanged — a redirect still cannot read as a pass in either mode.
 */
const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1)([:/]|$)/.test(BASE);

/**
 * ⚠️ `ONLY=/markets,/wallet` narrows the route list — the same env name and meaning
 * `responsive-audit.mjs` uses, deliberately, because two vocabularies for one idea is how a
 * flag gets passed to the wrong sweep. It exists so this seal can be REHEARSED against a dev
 * server without waiting on a cold compile of nineteen routes. ⛔ A narrowed run is not a seal:
 * the count printed at the end says how many routes were actually measured, so a partial run
 * can never be mistaken for a full one.
 *
 * ⚠️ ON GIT BASH, WRITE IT WITHOUT LEADING SLASHES — `ONLY=updown,wallet`. MSYS rewrites a
 * leading `/` in an environment value into a Windows path (`ONLY=/markets` arrives as
 * `C:/Program Files/Git/markets`), so the filter silently drops that route and the run is
 * narrower than you asked for. Matching is by substring, so the slashless form is exact enough.
 */
const ONLY = process.env.ONLY ? process.env.ONLY.split(",").map((s) => s.trim()) : null;
const keep = (r) => !ONLY || ONLY.some((s) => r.includes(s));

const { b } = await browser();
const state = await (async () => {
  if (!LOCAL) return loginOnce(b, "fleet:07");
  const c = await b.newContext();
  await c.request.get(`${BASE}/auth/demo`);
  const s = await c.storageState();
  await c.close();
  s.cookies = s.cookies.filter((x) => x.name !== "kp-locale");
  return s;
})();
let cells = 0, bad = 0;
const problems = [];

for (const locale of LOCALES) {
  const ctx = await b.newContext({ storageState: state, viewport: { width: 1280, height: 900 } });
  await ctx.addCookies([{ name: "kp-locale", value: locale, url: BASE }]);
  for (const r of [...PUBLIC, ...GATED].filter(keep)) {
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
        // ⛔ SEPARATE FROM `ovf`, AND THAT SEPARATION IS THE WHOLE POINT (E-190). `body` carries
        // `overflow-x: clip`, so a control 30px past the right edge leaves `ovf` at 0 — the
        // document never learns. This asks the only question that matters to a player: is there
        // an interactive control they cannot reach at all?
        const clipped = await p.evaluate(CLIP_PROBE, "body");
        const path = new URL(p.url()).pathname;
        cells++;
        const ok = d.n === 1 && d.ids === "main-content" && d.nested === 0 && d.skip
          && d.lang === locale && d.ovf <= 1 && clipped.length === 0
          && (PUBLIC.includes(r) || path === r);
        if (!ok) { bad++; problems.push(`${r}@${w}·${locale} → ${path} mains=${d.n}[${d.ids}] nested=${d.nested} skip=${d.skip} lang=${d.lang} ovf=${d.ovf}${clipped.length ? ` CLIPPED: ${clipped.join(" | ")}` : ""}`); }
      } catch (e) { cells++; bad++; problems.push(`${r}@${w}·${locale} LOAD FAILED ${String(e).split("\n")[0].slice(0, 50)}`); }
      await p.close();
    }
  }
  await ctx.close();
}
await b.close();
// ⛔ THE HEADING NAMES THE ENVIRONMENT, because "which environment produced this green?" is a
// question this campaign has had to ask after the fact more than once. A rehearsal on localhost
// must never print the word PRODUCTION.
console.log(`${LOCAL ? "LOCAL REHEARSAL" : "PRODUCTION SEAL"} — ${BASE}`);
console.log(`  ${PUBLIC.filter(keep).length} public + ${GATED.filter(keep).length} gated routes × ${WIDTHS.length} widths × ${LOCALES.length} locales${ONLY ? `   ⚠️ NARROWED by ONLY=${ONLY.join(",")} — not a full seal` : ""}`);
console.log(`  ${cells} cells measured · ${bad} problem(s)`);
if (problems.length) { console.log("\n  PROBLEMS:"); for (const x of problems.slice(0, 25)) console.log("    " + x); }
process.exit(bad ? 1 : 0);
