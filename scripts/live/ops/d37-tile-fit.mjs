/**
 * D37 (fit half) · DOES THE P&L TILE HOLD A SEVEN-FIGURE NET AT 320/360/412?
 *
 *   LIVE_BASE=https://www.50pick.tz node scripts/live/ops/d37-tile-fit.mjs
 *
 * ⛔ WHAT THIS IS, AND WHAT IT IS NOT. It measures the tile's GEOMETRY against production's own
 * stylesheet, fonts and tokens, by injecting the strip's exact markup into a real page at a real
 * width. It does NOT exercise the page's data path — that half is `test:updown-history-pnl`,
 * which proves the figures come from the VIEW and not the page, with 6/6 mutations caught.
 *
 * 🔴 WHY NOT THE REAL PAGE WITH REAL ROWS. Two doors were tried and both are shut:
 *   · PRODUCTION — no account has any Up & Down history (`mobile01` is "wallet 0, never funded"),
 *     so the strip does not render at all and there is nothing to measure.
 *   · LOCAL — the seeded drive Ali chose could not place a bet, because **React does not hydrate
 *     in dev on this machine**: measured 2026-09-24 on BOTH dev servers and on every route
 *     (`/`, `/markets`, `/updown`, `/updown/history`, `/updown/{id}`), 4 hydrated elements out of
 *     367–560 — and those four are two `<link>`s and the Next dev portal. The same probe against
 *     production reads 215 of 543. So no click in dev can ever become a bet, and the fixture
 *     cannot be built through the UI here. That is an ENVIRONMENT fault, not a product one.
 *
 * ⭐ IT IS A DELTA, NOT A THRESHOLD. Both the OLD markup and the NEW one are injected side by
 * side and measured in the same frame. "The new one fits" alone would prove nothing — it has to
 * fit WHERE THE OLD ONE SPILLED, or the measurement never touched the defect.
 */
import { chromium } from "playwright";

const BASE = process.env.LIVE_BASE;
if (!BASE) { console.error("⛔ set LIVE_BASE"); process.exit(2); }
console.log(`\n  TARGET: ${BASE}\n`);

const verdicts = [];
const say = (v, name, detail) => { verdicts.push({ v, name }); console.log(`  ${v.padEnd(8)} ${name}${detail ? ` — ${detail}` : ""}`); };

/** A seven-figure book: the worst case the strip can be asked to print. */
const NET = "+TZS 1,234,567", STAKED = "TZS 4,111,000", RETURNED = "TZS 5,345,567";

/* The two spellings of the ONE tile that changed, class-for-class as they ship.
   OLD: one `.amount` run — `.amount.amount` sets white-space:nowrap at doubled specificity.
   NEW: `.amount` on each NUMBER, the arrow a wrap point. */
const TILE = (variant) => `
  <div class="rounded-xl border border-border bg-bg-elevated p-3.5" data-probe="${variant}">
    <div class="font-mono text-micro uppercase eyebrow text-text-faint">Faida halisi</div>
    <div class="mt-0.5 font-mono text-[19px] font-bold tabular-nums">${NET}</div>
    ${variant === "old"
      ? `<div class="amount text-micro text-text-subtle">${STAKED} → ${RETURNED}</div>`
      : `<div class="flex flex-wrap items-baseline gap-x-1 text-micro text-text-subtle">
           <span class="amount">${STAKED}</span><span>→</span><span class="amount">${RETURNED}</span>
         </div>`}
  </div>`;

/** The real strip: the same grid the page uses, with the changed tile plus two siblings. */
const STRIP = (variant) => `
  <div class="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3" data-probe-strip="${variant}">
    ${TILE(variant)}
    <div class="rounded-xl border border-border bg-bg-elevated p-3.5">
      <div class="font-mono text-micro uppercase eyebrow text-text-faint">Raundi</div>
      <div class="mt-0.5 font-mono text-[19px] font-bold tabular-nums text-text">94</div>
      <div class="font-mono text-[10px] text-text-subtle">287 dau</div>
    </div>
    <div class="rounded-xl border border-border bg-bg-elevated p-3.5 col-span-2 sm:col-span-1">
      <div class="font-mono text-micro uppercase eyebrow text-text-faint">Kiwango cha ushindi</div>
      <div class="mt-0.5 font-mono text-[19px] font-bold tabular-nums text-text">61%</div>
      <div class="font-mono text-[10px] text-text-subtle">57/94 decided</div>
    </div>
  </div>`;

const b = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
try {
  const { loginOnce } = await import("../harness.mjs");
  let state = null;
  try { state = await loginOnce(b, "mobile01"); } catch (e) { console.log(`  ⚠️ sign-in failed: ${String(e).slice(0, 90)}`); }

  for (const width of [320, 360, 412]) {
    const ctx = await b.newContext({ viewport: { width, height: 900 }, ...(state ? { storageState: state } : {}) });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/updown/history`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(800);

    const out = await page.evaluate(([oldHtml, newHtml]) => {
      // ⛔ INTO THE PAGE'S OWN MEASURE WRAPPER, so the tile inherits the real content width —
      //    injecting into <body> would measure a full-viewport box the strip never gets.
      const main = document.querySelector("main") ?? document.body;
      const host = [...main.querySelectorAll("div")].find((d) => {
        const c = getComputedStyle(d);
        return /^(1280|1080)px$/.test(c.maxWidth) && parseFloat(c.paddingLeft) > 0;
      });
      if (!host) return { error: "no measure wrapper found on the page" };
      const holder = document.createElement("div");
      holder.innerHTML = oldHtml + newHtml;
      host.appendChild(holder);
      const read = (v) => {
        const tile = document.querySelector(`[data-probe="${v}"]`);
        if (!tile) return null;
        const all = [tile, ...tile.querySelectorAll("*")];
        return {
          overflow: Math.max(...all.map((n) => n.scrollWidth - n.clientWidth)),
          height: Math.round(tile.getBoundingClientRect().height),
          width: Math.round(tile.getBoundingClientRect().width),
        };
      };
      return { old: read("old"), neu: read("new") };
    }, [STRIP("old"), STRIP("new")]);

    if (out.error || !out.old || !out.neu) {
      say("BLIND", `D37 fit @${width}`, out.error ?? "a tile did not render");
    } else {
      console.log(`  ${width}px → old ${JSON.stringify(out.old)} · new ${JSON.stringify(out.neu)}`);
      if (out.old.overflow <= 0) {
        // ⛔ NO DELTA = NO EVIDENCE. If the old markup does not spill at this width, this cell
        //    cannot tell a fix from a no-op, whatever the new one does.
        say("BLIND", `D37 fit @${width} · the old markup did not spill here`,
          `old overflow ${out.old.overflow}px — nothing for the fix to have repaired at this width`);
      } else {
        say(out.neu.overflow <= 0 ? "PROVED" : "REFUTED", `D37 fit @${width} · the spill is gone where it was`,
          `old spilled ${out.old.overflow}px, new spills ${out.neu.overflow}px (tile ${out.neu.width}px wide, ${out.old.height}→${out.neu.height}px tall)`);
      }
    }
    await ctx.close();
  }
} finally { await b.close(); }

console.log("\n──────────────────────────────────────────────────────────────────────");
const n = (v) => verdicts.filter((x) => x.v === v).length;
console.log(`  ${n("PROVED")} proved · ${n("BLIND")} blind · ${n("REFUTED")} refuted`);
if (n("REFUTED") > 0) process.exit(1);
if (n("BLIND") > 0) { console.log("  ⚠️ BLIND is not a pass — say so in the record."); process.exit(3); }
