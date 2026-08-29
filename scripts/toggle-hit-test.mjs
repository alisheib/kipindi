/**
 * PROVE the kit Switch's hit area — and prove it stole nothing.  DG-A-02 / DG-P-02.
 *
 * ⛔ WHY A HIT TEST AND NOT A MEASUREMENT. The fix is an absolutely-positioned `::after`
 * (`globals.css`, `.toggle-switch::after`), so `getBoundingClientRect()` on the switch returns
 * 44×26 before AND after — correctly. `scripts/responsive-audit.mjs:278` already selects
 * `[role="switch"]` and flags `height < 40` from that very box, so it will warn about this
 * control forever, fix or no fix. **No existing driver can tell this fix from its absence.**
 * `document.elementFromPoint` is what actually answers "would a finger here throw the switch?".
 *
 * ⛔ AND IT MUST BE RE-PROVEN, NEVER ASSUMED. `.pchart-range` tried this exact technique and
 * measured 36px, not 40 — `up 16 / down 19`, because a later sibling took the pixels back by
 * paint order (globals.css, the `.pchart-range` ruling). That control was made genuinely tall
 * instead. This one cannot be: the track is 44×26 by design on ~100 instances.
 *
 * Four assertions per switch, and assertion 4 is what makes 1 safe rather than reckless:
 *   1. reach ≥ --tap-min (40px) top-to-bottom, by probing real coordinates;
 *   2. the PAINT did not move — still 44×26;
 *   3. the reach is CENTRED (|up − down| ≤ 1), so it grew both ways, not into one neighbour;
 *   4. nothing was STOLEN — every other interactive control still owns its own centre.
 *      `.btn` declares no `position`, so it is static and a bleeding `::after` would paint over
 *      the Save that COMMITS a master switch.
 *
 *   node scripts/toggle-hit-test.mjs [baseUrl]      (default: production)
 */
import { chromium } from "playwright";
import { loginOnce, BASE as DEFAULT_BASE } from "./live/harness.mjs";

const BASE = process.argv[2] || DEFAULT_BASE;
const TAP_MIN = 40;

/** Routes chosen for the FAILURE MODES they carry, not for coverage. */
const ROUTES = [
  { path: "/admin/roles", why: "the dense case — 6 roles × 7 domains × 2, two switches 20px apart" },
  { path: "/admin/affiliate", why: "master switch beside a 40px Save, inside an overflow-hidden RewardCard" },
  { path: "/admin/bonuses", why: "master switch beside a 40px Save" },
  { path: "/admin/payments", why: "THE KILL-SWITCHES — the P0 reason this exists" },
  { path: "/admin/updown", why: "inside ScrollX (a clipping box), beside 40px Edit" },
  { path: "/admin/system", why: "the claret maintenance lever" },
];
const WIDTHS = [{ n: "1280", w: 1280, h: 900 }, { n: "390", w: 390, h: 844 }];

const probe = (tapMin) => {
  const sws = [...document.querySelectorAll('[role="switch"].toggle-switch')];
  const owns = (sw, el) => !!el && (el === sw || sw.contains(el) || el.closest(".toggle-switch") === sw);
  const reach = sws.map((sw) => {
    const r = sw.getBoundingClientRect();
    const x = Math.round((r.left + r.right) / 2);
    const cy = (r.top + r.bottom) / 2;
    let up = 0, down = 0;
    for (let d = 0; d <= 30; d++) { if (owns(sw, document.elementFromPoint(x, Math.round(cy - d)))) up = d; else break; }
    for (let d = 0; d <= 30; d++) { if (owns(sw, document.elementFromPoint(x, Math.round(cy + d)))) down = d; else break; }
    return {
      label: (sw.getAttribute("aria-label") || "").slice(0, 40),
      w: Math.round(r.width), h: Math.round(r.height),
      up, down, reach: up + down + 1,
      pass: up + down + 1 >= tapMin && Math.round(r.height) === 26 && Math.round(r.width) === 44 && Math.abs(up - down) <= 1,
    };
  });
  // 4 · did the pseudo-element steal anyone's centre?
  const sel = 'button, a[href], input:not([type=hidden]), select, textarea, [role="button"]';
  const stolen = [...document.querySelectorAll(sel)]
    .filter((el) => !el.matches(".toggle-switch"))
    .filter((el) => { const q = el.getBoundingClientRect(); return q.height > 8 && q.top > 60 && q.bottom < innerHeight - 45; })
    .filter((el) => {
      const q = el.getBoundingClientRect();
      const hit = document.elementFromPoint(Math.round((q.left + q.right) / 2), Math.round((q.top + q.bottom) / 2));
      return !!hit && hit !== el && !el.contains(hit) && !!hit.closest(".toggle-switch");
    })
    .map((el) => (el.getAttribute("aria-label") || el.textContent || el.tagName).trim().slice(0, 40));
  return { reach, stolen };
};

const b = await chromium.launch();
const state = await loginOnce(b, "admin");
const failures = [];
let probed = 0, routesWithSwitches = 0;

for (const { path, why } of ROUTES) {
  for (const W of WIDTHS) {
    const ctx = await b.newContext({ storageState: state, viewport: { width: W.w, height: W.h }, colorScheme: "dark" });
    const p = await ctx.newPage();
    try {
      await p.goto(`${BASE}${path}`, { waitUntil: "load", timeout: 90_000 });
      await p.waitForLoadState("networkidle", { timeout: 6_000 }).catch(() => {});
      await p.waitForTimeout(800);
      // ⛔ A revoked session renders the sign-in page at HTTP 200. Say so instead of scoring 0/0 green.
      if (/\/auth\/(admin|login)/.test(p.url())) { failures.push(`${path}@${W.n}: SESSION REVOKED — measured the sign-in page`); await ctx.close(); continue; }

      const n = await p.locator('[role="switch"].toggle-switch').count();
      if (n === 0) { await ctx.close(); continue; }
      routesWithSwitches++;

      // ⚠️ elementFromPoint is VIEWPORT-based: a switch below the fold probes nothing at all and
      // would score a silent pass. Walk the page in viewport-sized steps and probe what is visible.
      const seen = new Map();
      const steps = Math.min(await p.evaluate(() => Math.ceil(document.body.scrollHeight / innerHeight)), 12);
      for (let s = 0; s < steps; s++) {
        await p.evaluate((i) => scrollTo(0, i * innerHeight * 0.9), s);
        await p.waitForTimeout(250);
        const { reach, stolen } = await p.evaluate(probe, TAP_MIN);
        for (const r of reach) if (r.reach > 1) seen.set(`${r.label}|${r.w}x${r.h}|${r.up}`, r);
        for (const s2 of stolen) failures.push(`${path}@${W.n}: STOLEN — "${s2}" no longer owns its own centre`);
      }

      const rows = [...seen.values()];
      probed += rows.length;
      const bad = rows.filter((r) => !r.pass);
      for (const r of bad) failures.push(`${path}@${W.n}: "${r.label}" reach=${r.reach} (up ${r.up}/down ${r.down}) paint=${r.w}×${r.h}`);
      console.log(`${path.padEnd(20)} @${W.n.padEnd(5)} n=${String(n).padStart(3)} probed=${String(rows.length).padStart(3)} ${bad.length ? `✗ ${bad.length} FAIL` : "✓ all ≥40, paint 44×26, centred"}  — ${why}`);
    } catch (e) {
      failures.push(`${path}@${W.n}: ${e.message.slice(0, 90)}`);
    }
    await ctx.close();
  }
}
await b.close();

console.log(`\ntoggle-hit: ${probed} switch probes across ${routesWithSwitches} route/width pairs`);
// ⛔ ZERO PROBES IS A SKIPPED RUN, NEVER A GREEN ONE. This campaign has twice closed a gate that
// measured nothing at all; a guard that cannot fail is not a guard.
if (probed === 0) { console.error("FAIL — probed 0 switches. That is a broken drive, not a pass."); process.exit(1); }
if (failures.length) { console.error(`\nFAIL (${failures.length}):`); for (const f of failures) console.error("  · " + f); process.exit(1); }
console.log("PASS — every kit Switch reaches --tap-min by hit test, paints 44×26, and stole nothing.");
