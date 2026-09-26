// Landing v3 · WP14 on PRODUCTION — signs in ONCE as `mobile01` (the never-funded QA player; a second
// sign-in revokes the first, so run it when no other lane is driving that account) and proves:
//   · signed-in pages RENDER with the new client code (the chip, the Wallet, useLiveBalance) — a crash
//     there is an HTTP 200 with an error screen, so the page's own h1 and landmarks are asked for;
//   · at ZERO the header shows a labelled gold Deposit and no capsule, and never prints "TZS 0";
//   · no page error at 360 and 1280, in sw and en; /wallet renders too.
// The FUNDED Wallet (chip → sheet/panel, parity, focus, Esc) is driven locally by wallet.mjs — production
// has no funded QA player, and this lane does not move money to make one.
//   LIVE_BASE=https://www.50pick.tz OUT=.qa-shots/landing-v3/w1prod node scripts/qa/landing-v3/wallet-prod.mjs
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { BASE, loginOnce } from "../../live/harness.mjs";

const OUT = process.env.OUT || ".qa-shots/landing-v3/wallet-prod";
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ headless: true });
let bad = 0;
const lines = [];
try {
  const state = await loginOnce(b, "mobile01");
  if (!state.cookies.length) throw new Error("sign-in left an empty cookie jar — stop, do not retry (lockout)");
  for (const [w, h] of [[360, 780], [1280, 860]]) for (const loc of ["sw", "en"]) for (const path of ["/", "/wallet"]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, storageState: state, isMobile: w < 640, hasTouch: w < 640 });
    await ctx.addCookies([{ name: "kp-locale", value: loc, domain: new URL(BASE).hostname, path: "/" }]);
    await ctx.addInitScript(() => { try { localStorage.setItem("50pick-primer-seen", "1"); } catch {} });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
    const id = `prod-${w}-${loc}${path === "/" ? "-home" : "-wallet"}`;
    const f = [];
    try {
      const res = await page.goto(BASE + path, { waitUntil: "load", timeout: 90000 });
      await page.waitForTimeout(3500);
      const decline = page.getByTestId("consent-decline");
      if (await decline.count()) await decline.first().click({ timeout: 5000 }).catch(() => {});
      const m = await page.evaluate(() => {
        const vis = (el) => { const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return s.display !== "none" && s.visibility !== "hidden" && r.width > 0 && r.height > 0; };
        const bar = document.querySelector("header");
        const dep = [...document.querySelectorAll('header a[href="/wallet/deposit"]')].find(vis);
        const cap = document.querySelector('[data-testid="wallet-balance-capsule"]');
        return {
          url: location.pathname,
          h1: document.querySelector("h1")?.textContent?.trim().slice(0, 60) ?? null,
          signedIn: !!document.querySelector('header [aria-haspopup="menu"], header [data-testid="avatar-menu"], header button[aria-label]'),
          deposit: dep ? dep.innerText.replace(/\s+/g, " ").trim() : null,
          capsule: !!(cap && vis(cap)),
          tzsZero: /TZS\s*0(?![\d,.])/.test(bar?.innerText ?? ""),
          errorScreen: /something went wrong|hitilafu|出错/i.test(document.body.innerText.slice(0, 3000)),
          overflowX: document.documentElement.scrollWidth - innerWidth,
          // WP14 part 2 — the signed-in hero (home only)
          mine: (() => {
            const root = document.querySelector('[data-testid="landing-mine"]');
            if (!root) return null;
            return {
              stats: [...root.querySelectorAll(".kp-mine__stat")].filter(vis).length,
              lead: [...root.querySelectorAll(".kp-mine__lead")].filter(vis).map((p) => p.innerText.trim()),
              deposit: vis(root.querySelector('[data-testid="hero-deposit"]') ?? document.createElement("i")),
              withdraw: vis(root.querySelector('[data-testid="hero-withdraw"]') ?? document.createElement("i")),
              limits: vis(root.querySelector('a[href="/profile/responsible-gambling"]') ?? document.createElement("i")),
            };
          })(),
        };
      });
      await page.screenshot({ path: join(OUT, `${id}.png`) });
      if (!res || res.status() >= 400) f.push(`HTTP ${res?.status()}`);
      if (m.url.startsWith("/auth")) f.push("bounced to sign-in — the session is gone");
      if (!m.h1) f.push("no h1 — not the page");
      if (m.errorScreen) f.push("error screen");
      if (m.overflowX > 0) f.push(`page scrolls sideways ${m.overflowX}px`);
      if (m.capsule) f.push("zero balance shows the capsule");
      if (m.tzsZero) f.push('header prints "TZS 0"');
      if (!m.deposit) f.push("no visible header Deposit at zero");
      if (path === "/") {
        // mobile01 is never funded and holds no picks: the empty-balance line ALONE, Deposit, no Withdraw.
        if (!m.mine) f.push("the signed-in hero did not render ([data-testid=landing-mine])");
        else {
          if (m.mine.stats) f.push(`a player with no picks sees ${m.mine.stats} stats`);
          if (m.mine.lead.length !== 1) f.push(`want the empty-balance line alone, got ${m.mine.lead.length}`);
          if (!m.mine.deposit) f.push("no Deposit in the hero");
          if (m.mine.withdraw) f.push("Withdraw offered at zero");
          if (!m.mine.limits) f.push("no Set limits in the hero");
        }
      }
      if (errors.length) f.push("page error: " + errors[0]);
      lines.push(`${f.length ? "FAIL" : "ok  "} ${id}  h1="${m.h1}" deposit="${m.deposit}"${f.length ? " — " + f.join(" | ") : ""}`);
    } catch (e) {
      f.push("drive error: " + String(e).slice(0, 160));
      lines.push(`FAIL ${id} — ${f.join(" | ")}`);
    }
    bad += f.length;
    console.log(lines[lines.length - 1]);
    await ctx.close();
  }
} finally {
  await b.close();
}
writeFileSync(join(OUT, "wallet-prod.txt"), lines.join("\n") + "\n");
console.log(bad ? `WALLET-PROD: ${bad} finding(s)` : "WALLET-PROD: all cells clean");
process.exit(bad ? 1 : 0);
