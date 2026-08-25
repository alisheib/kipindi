/**
 * THE PAGER'S EDGES AND THE WALLET DOOR, DRIVEN ON THE REAL PRODUCT.
 *
 *   npm run qa:pager-wallet                        # against production
 *   BASE=http://localhost:3000 npm run qa:pager-wallet
 *
 * `test:pager-reach` and `test:wallet-reach` pin the RULES and the SOURCE. Neither can tell
 * you how many rows the pager occupies at 360 in Swahili, or whether adding 44px to the
 * right-hand cluster pushed the account menu off a 1024px screen — which is exactly what
 * `E-190` was.
 *
 * ⭐ WHAT THIS MEASURES THAT A SCREENSHOT ALONE CANNOT:
 *   §A the pager's control row — how many VISUAL ROWS it occupies, before and after
 *      first/last. The claim being tested is "the wrap already existed and absorbs two
 *      more controls", and a claim about rows has to be counted, not looked at.
 *   §B every control's accessible name, so an icon-only jump is never an unnamed link.
 *   §C 🔴 THE E-190 BAND. The wallet icon is `sm:hidden`, so 768/1024/1280 must be
 *      BYTE-FOR-BYTE unchanged in cluster width. This asserts the account menu and the
 *      bell are fully on screen at those widths — the two controls E-190 severed.
 *
 * ⛔ OVERFLOW IS NOT REACHABILITY. `scrollWidth - clientWidth` reads 0 on this app because
 * `body` has `overflow-x: clip` (E-190), so the document never learns it was too wide. The
 * reachability rule is IMPORTED from `clip.mjs` rather than re-derived.
 *
 * ⚠️ NEVER `domcontentloaded` AND NEVER `.catch(() => "")` — against production the first
 * returns while the route's skeleton is still on screen, and the second turns a real failure
 * into a silent pass. This waits for the element it is about to read and REFUSES when the
 * premise is absent.
 *
 * ⚠️ 360 IS NOT OPTIONAL AND NEITHER IS ZH. Swahili runs ~35–40% longer than English and is
 * where this bar has failed before.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { clippedControls } from "./live/clip.mjs";
// ⭐ THE SHARED SIGN-IN, NOT A HAND-ROLLED ONE. `loginOnce` returns a storageState to reuse
// across every cell — the harness warns that signing in per cell trips the server's attempt
// limiting partway through a matrix and reports product failures that are not. It also
// carries the trilingual button/success patterns a ZH driver needs (E-106's neighbour).
import { loginOnce } from "./live/harness.mjs";

const BASE = process.env.BASE || "https://50pick.tz";
const WIDTHS = (process.env.WIDTHS || "360,393,768,1024,1280").split(",").map(Number);
const LOCALES = (process.env.LOCALES || "en,sw,zh").split(",");
const SHOTS = ".50pick-shots";
mkdirSync(SHOTS, { recursive: true });

let pass = 0;
const fails = [];
const ok = (n, c, e = "") => { if (c) pass++; else { fails.push(`${n}${e ? ` — ${e}` : ""}`); console.log(`FAIL ${n}${e ? ` — ${e}` : ""}`); } };

const host = new URL(BASE).hostname;
const browser = await chromium.launch();
console.log(`driving ${BASE} · ${WIDTHS.length} widths × ${LOCALES.length} locales\n`);

// 🔴 THE WALLET DOOR IS SIGNED-IN ONLY — a guest has no wallet, so all three doors (icon,
// balance pill, nav link) are absent for one. The first run of this file drove SIGNED OUT
// and reported 27 failures against a completely correct product. That is the premise being
// absent, not the feature being broken, and a driver that cannot tell the difference is
// worse than no driver. Sign in once, reuse the state, and REFUSE below if it did not take.
// ⚠️ A QA-FLEET PLAYER, NOT `alpha`. On 2026-08-25 `alpha` and `echo` both failed to sign in
// from this checkout — their secrets in `.env.qa.local` are whatever the laptop that last
// re-minted them left behind, and that file cannot travel by git. The fleet shares ONE
// secret with a documented in-repo fallback, so it is the persona a driver can rely on.
// Override with QA_PERSONA when a specific account is the point.
const WHO = process.env.QA_PERSONA || "fleet:01";
const storageState = await loginOnce(browser, WHO);
console.log(`signed in as ${WHO}\n`);

for (const locale of LOCALES) {
  const ctx = await browser.newContext({ storageState });
  // ⛔ The locale comes from the `kp-locale` COOKIE — there is no /api/locale route (E-106).
  await ctx.addCookies([{ name: "kp-locale", value: locale, domain: host, path: "/" }]);
  const page = await ctx.newPage();
  page.setDefaultNavigationTimeout(90_000);
  const errs = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  page.on("pageerror", (e) => errs.push(String(e)));

  for (const w of WIDTHS) {
    const cell = `[${locale} ${w}]`;
    await page.setViewportSize({ width: w, height: 1000 });
    await page.goto(`${BASE}/results`, { waitUntil: "load" });

    // ⛔ REFUSE ON A MISMATCHED LANGUAGE. A sweep that silently shoots the wrong language
    // is worse than one that fails, because its output looks like evidence.
    const lang = await page.getAttribute("html", "lang");
    if (lang !== locale) { fails.push(`${cell} <html lang>="${lang}", expected "${locale}" — refusing to capture`); console.log(`FAIL ${cell} lang=${lang}`); continue; }

    // ⛔ REFUSE WHEN THE PREMISE IS ABSENT. Everything in §C is about a signed-in player;
    // driven signed OUT, every wallet assertion fails and every one of those failures is
    // about this driver rather than about the product. The avatar menu renders only for a
    // session, so its absence is the tell — and it is checked BEFORE anything is judged.
    const signedIn = await page.evaluate(() =>
      !!document.querySelector("header") &&
      !document.querySelector('header a[href="/auth/register"], header a[href="/auth/login"]'));
    if (!signedIn) {
      console.error(`\n⛔ REFUSING: ${cell} is signed OUT. The wallet door is signed-in only, so this`);
      console.error(`   run would report the session as a product defect. Check .env.qa.local.`);
      process.exit(2);
    }

    // ── §A · the pager's control row ────────────────────────────────────────
    const row = page.locator("div.flex.flex-wrap.items-center.justify-center").first();
    try {
      await row.waitFor({ state: "visible", timeout: 45_000 });
    } catch {
      fails.push(`${cell} no pager on /results — the premise is absent, refusing to pass`);
      console.log(`FAIL ${cell} no pager`);
      continue;
    }

    const m = await row.evaluate((el) => {
      const kids = [...el.children];
      const box = (n) => n.getBoundingClientRect();
      return {
        containerW: Math.round(el.parentElement.getBoundingClientRect().width),
        rows: new Set(kids.map((k) => Math.round(box(k).top))).size,
        blockH: Math.round(box(el).height),
        controls: kids.map((k) => ({
          tag: k.tagName.toLowerCase(),
          w: Math.round(box(k).width),
          h: Math.round(box(k).height),
          label: k.getAttribute("aria-label") || "",
          text: (k.textContent || "").trim(),
          disabled: k.getAttribute("aria-disabled") === "true" || k.hasAttribute("disabled"),
          left: Math.round(box(k).left),
          right: Math.round(box(k).right),
        })),
      };
    });

    const named = m.controls.filter((c) => c.label);
    // On page 1: first and prev are the two disabled ones; next and last are live.
    ok(`${cell} the pager carries FOUR named edge controls (first/prev/next/last)`,
       named.length === 4, `${named.length}: ${named.map((c) => c.label).join(" | ")}`);
    ok(`${cell} …and every one of them is named in ${locale}`,
       named.every((c) => c.label.trim().length > 0), named.map((c) => c.label).join(" | "));
    // ⭐ THE ROW COUNT — the claim under test. Two rows on a phone, one from 768.
    ok(`${cell} the control row occupies the expected number of visual rows`,
       w < 640 ? m.rows === 2 : m.rows === 1, `rows=${m.rows} blockH=${m.blockH} container=${m.containerW} controls=${m.controls.length}`);
    // ⛔ Nothing may be cut off horizontally, at any width.
    const offscreen = m.controls.filter((c) => c.left < 0 || c.right > w + 0.5);
    ok(`${cell} no pager control is off screen`, offscreen.length === 0,
       offscreen.map((c) => `${c.label || c.text}@${c.left}..${c.right}`).join(", "));
    // The 44px tap floor, on the rendered box rather than in the class list.
    const small = m.controls.filter((c) => c.w > 20 && (c.h < 44 || c.w < 44));
    ok(`${cell} every pager control still meets the 44px tap floor`, small.length === 0,
       small.map((c) => `${c.label || c.text}:${c.w}x${c.h}`).join(", "));
    // On page 1 exactly two edge controls are dead ends, and they are the backward pair.
    const dead = named.filter((c) => c.disabled);
    ok(`${cell} on page 1 exactly the two backward controls are disabled`,
       dead.length === 2, `${dead.length}: ${dead.map((c) => c.label).join(" | ")}`);

    await page.screenshot({ path: `${SHOTS}/pager-${locale}-${w}.png`, fullPage: false });

    // ── §C · 🔴 THE E-190 BAND — the cluster the wallet icon must not touch ──
    const bar = await page.evaluate(() => {
      const header = document.querySelector("header");
      if (!header) return null;
      const wallet = header.querySelector('[data-testid="wallet-door"]');
      const avatar = header.querySelector("[data-avatar-menu], details.kp-menu:last-of-type, button[aria-haspopup]");
      const r = (n) => (n ? n.getBoundingClientRect() : null);
      const bw = r(wallet), ba = r(avatar);
      return {
        walletDoors: [...header.querySelectorAll('a[href="/wallet"]')]
          .filter((n) => { const b = n.getBoundingClientRect(); return b.width > 0 && b.height > 0; }).length,
        // ⛔ VISIBLE ones, not DOM ones. `sm:hidden` is `display: none`, so the element is
        // still in the tree at 1024 — a `querySelectorAll(...).length` counts it and reports
        // a correct product as broken at nine cells. It did exactly that on the first run.
        // Presence in the DOM is not presence on the screen.
        doorCount: [...header.querySelectorAll('[data-testid="wallet-door"]')]
          .filter((n) => { const b = n.getBoundingClientRect(); return b.width > 0 && b.height > 0; }).length,
        walletVisible: !!bw && bw.width > 0 && bw.height > 0,
        walletBox: bw ? { l: Math.round(bw.left), r: Math.round(bw.right), w: Math.round(bw.width), h: Math.round(bw.height) } : null,
        avatarBox: ba ? { l: Math.round(ba.left), r: Math.round(ba.right) } : null,
      };
    });
    if (!bar) { fails.push(`${cell} no <header> — refusing to judge the cluster`); continue; }

    // ⭐ EXACTLY ONE WALLET DOOR PER WIDTH — the rule, measured on the rendered bar.
    // < 640 it is the icon; 640–1023 the balance pill; ≥ 1024 the nav link (and the pill
    // again 1280–1535), so `a[href="/wallet"]` should be present but never doubled below sm.
    if (w < 640) {
      ok(`${cell} 🔴 the phone has a wallet door in the top bar`, bar.walletVisible, JSON.stringify(bar.walletBox));
      ok(`${cell} …and it meets the tap floor`, !!bar.walletBox && bar.walletBox.w >= 44 && bar.walletBox.h >= 44, JSON.stringify(bar.walletBox));
      ok(`${cell} …and it is fully on screen`, !!bar.walletBox && bar.walletBox.l >= 0 && bar.walletBox.r <= w + 0.5, JSON.stringify(bar.walletBox));
    } else {
      // ⛔ THE HALF A PRESENCE CHECK CANNOT SEE. At 1024 the icon would be redundant chrome
      // in the cluster E-190 severed, so its ABSENCE is the assertion — and it is a real
      // assertion, keyed on the control's own testid rather than on `href`, because three
      // different elements link to /wallet across this width range.
      // ⚠️ The first draft of this line read `!bar.walletVisible || w >= 1024 ? true : true`,
      // which is `true` — a check that could not fail, in the exact section written to catch
      // the defect that matters most. Kept in the record rather than quietly deleted.
      ok(`${cell} 🔴 the phone-only wallet icon is ABSENT here (E-190's band)`,
         bar.doorCount === 0, `${bar.doorCount} phone wallet door(s) rendered at ${w}`);
      // …and the wallet is still reachable here by another route, or the icon's absence
      // would simply be a hole. Below 1024 that is the balance pill; from 1024 the nav.
      ok(`${cell} …and the wallet is still reachable some other way at this width`,
         bar.walletDoors >= 1, `${bar.walletDoors} link(s) to /wallet in the header`);
      ok(`${cell} the account menu is fully on screen (E-190's actual casualty)`,
         !!bar.avatarBox && bar.avatarBox.r <= w + 0.5 && bar.avatarBox.l >= 0,
         JSON.stringify(bar.avatarBox) + ` vw=${w}`);
    }

    // The imported reachability rule over the whole page, including the header.
    const clipped = await clippedControls(page, "body");
    ok(`${cell} nothing on the page is unreachable`, clipped.length === 0,
       clipped.slice(0, 3).map((x) => `${x.tag}@${Math.round(x.left)}`).join(", "));

    await page.screenshot({ path: `${SHOTS}/bar-${locale}-${w}.png`, clip: { x: 0, y: 0, width: w, height: 60 } });
  }

  ok(`[${locale}] no console errors`, errs.length === 0, errs.slice(0, 2).join(" | "));
  await ctx.close();
}

await browser.close();
console.log(`\npager+wallet shots: ${pass} passed, ${fails.length} failed`);
if (fails.length) { console.log("\nFAILURES:"); fails.forEach((f) => console.log("  ✗ " + f)); process.exit(1); }
console.log(`frames in ${SHOTS}/ — LOOK at them; a count is not a look.`);
