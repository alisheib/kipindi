/**
 * Application monkey test.
 *
 * Crazy A→Z sprint: an authed user is dropped into the app and a
 * monkey performs random actions across every public + protected
 * route. Picks random links, clicks random buttons, types random
 * digits into inputs. The contract is loose: the app must not crash,
 * must not surface a 500, and must not log uncaught errors to the
 * console.
 *
 * Verifies, on every navigation:
 *   • HTTP status is not 5xx
 *   • No "Application error" client crash boundary fires
 *   • No "Unhandled" / "Uncaught" / "TypeError" in console
 *   • No 4xx/5xx network request to /api/* that isn't a known-OK
 *     gate (rate limit, auth required, etc.)
 *
 * Runs N iterations (default 60); each picks one of:
 *   • navigate → random route from a curated public + protected set
 *   • back / forward
 *   • click a random visible button (not destructive)
 *   • focus a random input and type garbage
 *   • scroll
 *
 *   BASE=http://localhost:3000  ITERS=60  node scripts/app-monkey-e2e.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";
const ITERS = parseInt(process.env.ITERS || "60", 10);

let pass = 0, fail = 0;
function log(label, ok, detail = "") {
  const t = ok ? "✓" : "✗";
  console.log(`${t} ${label}${detail ? "  →  " + detail : ""}`);
  if (ok) pass++; else fail++;
}

const phoneTail = "7" + String(Date.now() % 100_000_000).padStart(8, "0");

async function reg(ctx, tail, pwd) {
  const p = await ctx.newPage();
  await p.goto(`${BASE}/auth/register`, { waitUntil: "networkidle" });
  await p.fill("#phone", tail);
  await p.fill('input[name="dob"]', "1990-01-15");
  await p.fill('input[name="password"]', pwd);
  await p.fill('input[name="passwordConfirm"]', pwd);
  await p.check('input[name="acceptAge"]', { force: true });
  await p.check('input[name="acceptTerms"]', { force: true });
  await p.click('button[type="submit"]');
  await p.waitForTimeout(900);
  await p.close();
}

// Curated route pool. Anything destructive (logout, withdraw confirm,
// close account) is OUT — we don't want the monkey nuking state mid-run.
const ROUTES_PUBLIC = [
  "/", "/markets", "/live", "/leaderboard",
  "/legal/privacy", "/legal/terms", "/legal/aml", "/legal/responsible-gambling",
];
const ROUTES_PROTECTED = [
  "/wallet", "/wallet/deposit", "/wallet/withdraw",
  "/profile", "/profile/kyc", "/profile/responsible-gambling",
  "/positions",
];
const ROUTES = [...ROUTES_PUBLIC, ...ROUTES_PROTECTED];

const TYPED_GARBAGE = [
  "1", "12345", "999999", "0", "abc", "5,000",
  "TZS 7,500", "!@#$%", "ä", "<script>", "",
];

const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rndInt = (max) => Math.floor(Math.random() * max);

const browser = await chromium.launch();
const consoleErrors = [];
const networkErrors = [];
const pageCrashes = [];

try {
  await fetch(`${BASE}/api/dev-test/reset-rate-limits`, { method: "POST" }).catch(() => {});

  const pwd = "Monkey!Sprint2026";
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await reg(ctx, phoneTail, pwd);
  await fetch(`${BASE}/api/dev-test/seed-wallet`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ phone: "+255" + phoneTail, amount: 500_000 }),
  });

  const p = await ctx.newPage();

  // Capture every console error / unhandled rejection.
  p.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      // Filter ignorable noise — preload hints, hydration timing, etc.
      if (/Failed to load resource: net::ERR_/i.test(text)) return;
      if (/^Warning:/i.test(text)) return;
      consoleErrors.push(text.slice(0, 200));
    }
  });
  p.on("pageerror", (err) => {
    consoleErrors.push(`pageerror: ${err.message.slice(0, 200)}`);
  });
  p.on("crash", () => {
    pageCrashes.push(p.url());
  });
  p.on("response", async (r) => {
    const url = r.url();
    if (!url.startsWith(BASE)) return;
    const s = r.status();
    if (s < 400) return;
    // Tolerated: dev/auth gates returning 401/403/404 by design.
    if (/\/api\/dev-test\//.test(url)) return;
    if (s === 401 || s === 403) return;
    // 404 only counts if the navigation FROM the monkey caused it
    // (not background image/asset misses).
    if (s === 404 && /\.(png|svg|jpg|ico|woff)/.test(url)) return;
    networkErrors.push(`${s} ${url.replace(BASE, "")}`);
  });

  await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await p.waitForTimeout(400);

  let lastUrl = p.url();
  console.log(`\n=== MONKEY · ${ITERS} actions ===`);

  for (let i = 0; i < ITERS; i++) {
    const action = ["nav", "nav", "click", "type", "back"][rndInt(5)];

    try {
      if (action === "nav") {
        const route = rnd(ROUTES);
        const res = await p.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 8_000 }).catch(() => null);
        if (res && res.status() >= 500) {
          log(`iter ${i} · ${route} → 5xx`, false, `status=${res.status()}`);
        }
        await p.waitForTimeout(150 + rndInt(200));
      } else if (action === "click") {
        // Pick a random visible button — but skip dangerous ones.
        const buttons = await p.$$('button:visible:not([disabled])');
        const safe = [];
        for (const b of buttons) {
          const text = (await b.textContent().catch(() => ""))?.toLowerCase() ?? "";
          if (/log\s*out|sign\s*out|close account|self.?exclud|withdraw|withdraw|cool.?off|delete/.test(text)) continue;
          if (/confirm/.test(text)) continue;
          safe.push(b);
        }
        if (safe.length > 0) {
          const btn = safe[rndInt(safe.length)];
          await btn.click({ timeout: 1_500 }).catch(() => {});
          await p.waitForTimeout(150 + rndInt(200));
        }
      } else if (action === "type") {
        const inputs = await p.$$('input:visible:not([disabled]):not([type="password"])');
        if (inputs.length > 0) {
          const inp = inputs[rndInt(inputs.length)];
          await inp.click({ timeout: 1_500 }).catch(() => {});
          await p.keyboard.press("Control+A").catch(() => {});
          await p.keyboard.press("Delete").catch(() => {});
          await inp.type(rnd(TYPED_GARBAGE), { delay: 5, timeout: 1_500 }).catch(() => {});
          await p.waitForTimeout(80 + rndInt(120));
        }
      } else if (action === "back") {
        await p.goBack({ waitUntil: "domcontentloaded", timeout: 4_000 }).catch(() => {});
        await p.waitForTimeout(150);
      }

      // After every action, sanity check: page still alive, no crash UI.
      const url = p.url();
      const crashedUi = await p.locator("text=/Application error|Something went wrong/i").first().isVisible({ timeout: 100 }).catch(() => false);
      if (crashedUi) {
        log(`iter ${i} · crash-boundary visible at ${url.replace(BASE, "")}`, false);
      }
      lastUrl = url;
    } catch (e) {
      log(`iter ${i} · uncaught: ${String(e?.message ?? e).slice(0, 80)}`, false);
    }
  }

  console.log(`\n=== RESULTS ===`);
  log(`Zero page crashes`, pageCrashes.length === 0, `count=${pageCrashes.length}`);
  log(`Zero uncaught client errors`, consoleErrors.length === 0, `count=${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    console.log("  Console errors (first 5):");
    consoleErrors.slice(0, 5).forEach((e) => console.log(`    · ${e}`));
  }
  log(`Zero 4xx/5xx user-facing responses`, networkErrors.length === 0, `count=${networkErrors.length}`);
  if (networkErrors.length > 0) {
    console.log("  Network errors (first 5):");
    networkErrors.slice(0, 5).forEach((e) => console.log(`    · ${e}`));
  }

  await p.close();
  await ctx.close();
} catch (e) {
  log("FATAL", false, String(e?.message ?? e));
}

await browser.close();
console.log(`\n${"=".repeat(60)}\nAPP MONKEY  PASS: ${pass}    FAIL: ${fail}\n${"=".repeat(60)}`);
process.exit(fail > 0 ? 1 : 0);
