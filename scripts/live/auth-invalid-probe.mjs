/**
 * Probe (S10, 2026-10-02) — does a failed sign-in / sign-up MARK the field it refused, for a screen reader?
 *
 * The Input atom derives `aria-invalid` from its `error` prop ALONE and writes it after the spread ("the two are one
 * fact", input.tsx), so a caller that passed only `aria-invalid` had it silently dropped: /auth/login's identifier
 * and /auth/register's phone and email said "no account" / "already registered" in words while every field read
 * valid. This loads each error state at phone and desktop width and reads the attribute the browser actually holds.
 *
 *   BASE=http://localhost:3010 node scripts/live/auth-invalid-probe.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE || "http://localhost:3010";
const SHOTS = ".qa-shots/marketing-setup/auth-invalid";
mkdirSync(SHOTS, { recursive: true });
let pass = 0, fail = 0;
const ok = (l, c, x = "") => { if (c) pass++; else fail++; console.log(`  ${c ? "ok  " : "FAIL"} ${l}${x ? ` -- ${x}` : ""}`); };

const CASES = [
  { path: "/auth/login?error=no_account", field: "#identifier", want: "true", name: "login-no-account" },
  { path: "/auth/login", field: "#identifier", want: null, name: "login-clean" },
  { path: "/auth/register?error=exists", field: "#phone", want: "true", name: "register-exists-phone" },
  { path: "/auth/register", field: "#phone", want: null, name: "register-clean" },
];
const browser = await chromium.launch();
for (const vp of [{ name: "360x780", width: 360, height: 780 }, { name: "1280x800", width: 1280, height: 800 }]) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();
  console.log(`\n[auth-invalid] ${vp.name}`);
  for (const c of CASES) {
    await page.goto(BASE + c.path, { waitUntil: "networkidle" }).catch(() => {});
    const count = await page.locator(c.field).count();
    const got = count ? await page.locator(c.field).first().getAttribute("aria-invalid") : "MISSING";
    ok(`${vp.name} · ${c.path} · ${c.field} reads aria-invalid=${c.want ?? "(absent)"}`, got === c.want, `got ${got}`);
    if (count) {
      await page.locator(c.field).first().scrollIntoViewIfNeeded().catch(() => {});
      await page.screenshot({ path: `${SHOTS}/${vp.name}-${c.name}.png` });
    }
  }
  await ctx.close();
}
await browser.close();
console.log(`\nauth-invalid-probe: ${pass} passed, ${fail} failed\nshots: ${SHOTS}`);
process.exitCode = fail === 0 ? 0 : 1;
