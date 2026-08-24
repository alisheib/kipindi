/**
 * Capture the AI-SPEND-CYCLES admin-guide screenshots FROM PRODUCTION.
 *
 *   node scripts/capture-cycles-guide-shots.mjs          (npm run qa:cycles-guide-shots)
 *   node scripts/capture-cycles-guide-shots.mjs --dry    (report what it would shoot, write nothing)
 *
 * ── WHY THIS FILE EXISTS AT ALL ──────────────────────────────────────────────────────────
 * 🔴 IT DID NOT, AND THE HANDOFF THAT DEPENDED ON IT SAID IT DID. Session 59 shipped
 * `docs/50pick-ai-cycles-admin-guide.pdf` with seven screenshots and closed with the
 * instruction: *"⛔ `docs/guide-img/cyc-*.png` must be re-shot if the page changes, or the guide
 * quietly starts describing a screen that no longer exists."* The images were captured by a
 * driver that was never committed — `grep -rn "cyc-cost" scripts/` finds nothing — so the
 * instruction was unactionable from the moment it was written. `scripts/live/ops/README.md`
 * states this repo's rule in its own words: **a tool named in a handoff has to exist in the
 * repo, or the handoff is fiction.**
 *
 * ⭐ AND THE PAGE DID CHANGE, within the day. Setting the USD→TZS rate on production (2026-08-24)
 * made two of the seven images describe a screen that no longer exists: `cyc-cost.png` still
 * shows *"No USD→TZS rate is set, so every shilling figure reads —"* above a dashed Suggested
 * column, and `cyc-settings.png` still shows both rate fields EMPTY with their placeholders.
 *
 * ── THE TWO RULES IT INHERITS, both already paid for by `capture-guide-shots-live.mjs` ────
 *
 * 1 · ⛔ **SHOOT PRODUCTION, NOT A SEEDED DEV BUILD.** That file's header records why: its
 *      predecessor's `rounds.png` showed *"a column of VOID at TZS 0 — a screen that no longer
 *      exists, from a configuration that has been retired, presented in the manual as what the
 *      operator should expect. An operator manual whose pictures do not match the screen is
 *      worse than one with no pictures, because staff stop trusting it the first time a button
 *      is not where it was drawn."* The figures here are real production figures, which is also
 *      what the no-fabrication rule wants.
 *
 * 2 · ⛔ **ELEMENT SHOTS, NEVER `fullPage`.** A fullPage capture of this console stitches a tall
 *      canvas and renders sticky elements at the wrong offset — it invents layout bugs that are
 *      not there, and this campaign has already chased two of them.
 *
 * ⚠️ 1180 × deviceScaleFactor 2 IS NOT A TASTE, IT IS A MATCH. Every existing `cyc-*.png` is
 * exactly 1800px wide; the admin card renders at viewport − 280, so 1180 reproduces the 900 CSS
 * px card the guide was laid out against. Changing it re-flows seven figures in a finished PDF.
 *
 * ⛔ IT REFUSES TWO OF THE SEVEN, BY NAME, RATHER THAN SKIPPING THEM QUIETLY. `cyc-paused.png`
 * and `cyc-start-dialog.png` only exist when the AI is PAUSED at a cycle boundary — a state this
 * script will not manufacture, because manufacturing it means stopping AI poll posting and AI
 * resolving on the live platform to take a photograph. They keep their session-59 captures and
 * the run says so.
 *
 * 💰 READ-ONLY. It signs in as ADMIN, loads one page and photographs it. No cycle is started,
 * closed or edited; no setting is saved; no money moves.
 */
import { mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { BASE, loginOnce, browser } from "./live/harness.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, "docs/guide-img");
const DRY = process.argv.includes("--dry");
mkdirSync(OUT, { recursive: true });

/**
 * Each shot, keyed by the CARD TITLE the console actually renders.
 *
 * ⛔ MATCHED ON THE TITLE, NOT ON A POSITION OR A CLASS. `AdminCard` renders its title as a
 * `p.font-display` inside a `div.glass-panel`; an `nth-child` selector would silently
 * photograph the wrong card the first time a panel is added above it, and this campaign has
 * already had an `nth(3)` table selector pick the wrong table once.
 */
const SHOTS = [
  { file: "cyc-running.png",  title: "Spend cycles" },
  { file: "cyc-ledger.png",   title: "Every cycle" },
  { file: "cyc-year.png",     title: "Cycles by year" },
  { file: "cyc-cost.png",     title: "Cost per resolution, and what to charge" },
  { file: "cyc-settings.png", title: "Cycle settings" },
];

/** The two that need a PAUSED platform. Named, never silently skipped. */
const NEEDS_PAUSE = [
  { file: "cyc-paused.png",       why: "the red 'AI is paused' bar only renders at a spent cycle boundary" },
  { file: "cyc-start-dialog.png", why: "the Start-cycle confirm dialog only opens when a cycle has ended" },
];

const b = (await browser()).b;
const state = await loginOnce(b, "admin");
const ctx = await b.newContext({ storageState: state, viewport: { width: 1180, height: 1400 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

await page.goto(`${BASE}/admin/ai-usage`, { waitUntil: "domcontentloaded", timeout: 90_000 });
await page.waitForTimeout(5_000);

const path = new URL(page.url()).pathname;
if (/\/auth\//.test(path)) {
  console.error(`\n🔴 PREMISE ABSENT — landed on ${path}, not the console. This page is ADMIN-only; check ADMIN_LOGIN_* in .env.qa.local.\n`);
  process.exit(2);
}

console.log(`\nAI-cycles guide shots — ${BASE}/admin/ai-usage  (1180 × dsf 2 → 1800px wide)\n`);

let ok = 0;
const missed = [];
for (const s of SHOTS) {
  const el = page.locator(`.glass-panel:has(p.font-display:text-is("${s.title}"))`).first();
  const n = await el.count().catch(() => 0);
  if (!n) { missed.push(`${s.file} — no card titled "${s.title}" on the page`); console.log(`  MISS ${s.file.padEnd(20)} "${s.title}"`); continue; }
  const box = await el.boundingBox();
  if (DRY) { console.log(`  dry  ${s.file.padEnd(20)} "${s.title}"  ${Math.round(box.width)}×${Math.round(box.height)} CSS`); ok++; continue; }
  await el.screenshot({ path: resolve(OUT, s.file) });
  ok++;
  console.log(`  ✓    ${s.file.padEnd(20)} "${s.title}"  ${Math.round(box.width)}×${Math.round(box.height)} CSS → ${Math.round(box.width * 2)}px`);
}

console.log("");
for (const k of NEEDS_PAUSE) {
  const held = existsSync(resolve(OUT, k.file));
  console.log(`  ⏭  ${k.file.padEnd(20)} NOT RE-SHOT — ${k.why}.`);
  console.log(`     ${held ? "Its existing capture is kept." : "🔴 AND IT IS MISSING FROM docs/guide-img/."}`);
}
console.log(`     ⛔ Pausing the live platform to take a photograph is not a trade this script will make.`);

console.log(`\n  ${ok}/${SHOTS.length} shot${DRY ? " (dry run — nothing written)" : ""} · ${NEEDS_PAUSE.length} deliberately not re-shot`);
if (missed.length) { console.log("\n  MISSED:"); for (const m of missed) console.log("    · " + m); }
if (!DRY && !missed.length) console.log(`\n  Now: node scripts/generate-pdfs.mjs   then rasterise and LOOK — a capture is not a check.`);

await ctx.close();
await b.close();
process.exit(missed.length ? 1 : 0);
