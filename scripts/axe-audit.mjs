/**
 * Accessibility audit (Phase D) — axe-core WCAG 2.1 A/AA sweep.
 *
 * Complements the fast manual a11y-audit.mjs with the full axe-core rulesets
 * (contrast, ARIA, roles, names, landmarks…). Loads each key route (player +
 * admin), injects axe-core, and reports every serious/critical violation with
 * a sample target. The Phase-D bar is 0 serious/critical.
 *
 * Run against a FRESH dev server:
 *   SESSION_SECRET=… OTP_PEPPER=… DISABLE_ADMIN_TOTP=true npx next dev -p 3000
 *   node scripts/axe-audit.mjs
 *
 * Env: ONLY=/markets,/wallet (filter) · WIDTHS=1280 · IMPACT=serious,critical
 */
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const AXE = join(__dirname, "..", "node_modules", "axe-core", "axe.min.js");
const BASE = process.env.BASE || "http://localhost:3000";
const WIDTHS = process.env.WIDTHS ? process.env.WIDTHS.split(",").map(Number) : [1280];
const ONLY = process.env.ONLY ? process.env.ONLY.split(",") : null;
const FAIL_IMPACTS = new Set((process.env.IMPACT || "serious,critical").split(","));

const ROUTES = [
  { path: "/", ctx: "player" },
  { path: "/markets", ctx: "player" },
  { path: "/live", ctx: "player" },
  { path: "/results", ctx: "player" },
  { path: "/leaderboard", ctx: "player" },
  { path: "/wallet", ctx: "player" },
  { path: "/wallet/deposit", ctx: "player" },
  { path: "/wallet/withdraw", ctx: "player" },
  { path: "/positions", ctx: "player" },
  { path: "/proposals", ctx: "player" },
  { path: "/profile", ctx: "player" },
  { path: "/profile/responsible-gambling", ctx: "player" },
  { path: "/help", ctx: "player" },
  { path: "/fairness", ctx: "player" },
  { path: "/auth/login", ctx: "guest" },
  { path: "/auth/register", ctx: "guest" },
  { path: "/admin", ctx: "admin" },
  { path: "/admin/players", ctx: "admin" },
  { path: "/admin/finance", ctx: "admin" },
  { path: "/admin/reports", ctx: "admin" },
  { path: "/admin/system", ctx: "admin" },
  { path: "/admin/aml", ctx: "admin" },
  { path: "/admin/audit", ctx: "admin" },
  { path: "/admin/compliance", ctx: "admin" },
  { path: "/admin/affiliate", ctx: "admin" },
  { path: "/admin/config", ctx: "admin" },
  { path: "/admin/candidates", ctx: "admin" },
  { path: "/admin/bonuses", ctx: "admin" },
  { path: "/admin/invites", ctx: "admin" },
  { path: "/admin/markets", ctx: "admin" },
  { path: "/admin/retention", ctx: "admin" },
  { path: "/admin/privacy", ctx: "admin" },
  { path: "/admin/self-exclusions", ctx: "admin" },
  { path: "/admin/sources", ctx: "admin" },
  { path: "/admin/live", ctx: "admin" },
  { path: "/admin/approvals", ctx: "admin" },
  { path: "/admin/ai-usage", ctx: "admin" },
  { path: "/admin/ai-polls", ctx: "admin" },
  { path: "/admin/payments", ctx: "admin" },
];

const browser = await chromium.launch();
const player = await browser.newContext();
await player.request.get(`${BASE}/auth/demo`);
const admin = await browser.newContext();
await admin.request.post(`${BASE}/api/dev-test/seed-admin`);
await admin.request.get(`${BASE}/admin`).catch(() => {});
const guest = await browser.newContext();
const ctxOf = { player, admin, guest };

const findings = [];
let auditCount = 0;

for (const route of ROUTES) {
  if (ONLY && !ONLY.includes(route.path)) continue;
  for (const w of WIDTHS) {
    const page = await ctxOf[route.ctx].newPage();
    await page.setViewportSize({ width: w, height: 900 });
    try {
      await page.goto(`${BASE}${route.path}`, { waitUntil: "domcontentloaded", timeout: 40000 });
      await page.waitForLoadState("load", { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(700);
      await page.addScriptTag({ path: AXE });
      const result = await page.evaluate(async () => {
        // eslint-disable-next-line no-undef
        return await axe.run(document, {
          runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
          resultTypes: ["violations"],
        });
      });
      auditCount++;
      const vio = result.violations.filter((v) => FAIL_IMPACTS.has(v.impact));
      for (const v of vio) {
        findings.push({
          route: route.path, w, impact: v.impact, id: v.id, help: v.help,
          count: v.nodes.length,
          sample: v.nodes[0]?.target?.join(" ") ?? "",
          sampleHtml: (v.nodes[0]?.html ?? "").slice(0, 140),
        });
      }
      console.log(`  ${vio.length === 0 ? "\x1b[32mOK \x1b[0m" : "\x1b[31mVIO\x1b[0m"} ${(route.path + "@" + w).padEnd(40)} ${vio.map((v) => `${v.id}(${v.nodes.length})`).join(", ")}`);
    } catch (e) {
      console.log(`  \x1b[33mERR\x1b[0m ${route.path}@${w} — ${String(e).split("\n")[0]}`);
    }
    await page.close();
  }
}

await browser.close();

console.log(`\n${"─".repeat(72)}`);
if (findings.length === 0) {
  console.log(`  axe: 0 ${[...FAIL_IMPACTS].join("/")} violations across ${auditCount} page audits ✓`);
} else {
  // De-dup by rule id for the summary, but list each occurrence.
  console.log(`  axe: ${findings.length} finding(s) [${[...FAIL_IMPACTS].join("/")}]:\n`);
  for (const f of findings) {
    console.log(`  ${f.impact.toUpperCase()} · ${f.id} · ${f.route}@${f.w} (${f.count} node${f.count === 1 ? "" : "s"})`);
    console.log(`      ${f.help}`);
    console.log(`      → ${f.sample}`);
    console.log(`      ${f.sampleHtml}\n`);
  }
}
console.log(`${"─".repeat(72)}\n`);
process.exit(findings.length ? 1 : 0);
