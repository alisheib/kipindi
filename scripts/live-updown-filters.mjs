/**
 * UD-13b LIVE — the Up & Down board's phone filters, driven on production.
 *
 *   npm run qa:updown-filters
 *
 * ⭐ WHAT IT PROVES, AND THE ORDER MATTERS. §1 measures the two rails at the DESKTOP bands and
 * requires them UNCHANGED — because the easiest way to "fix" a phone is to take something away
 * from everyone. §2 measures the phone bands. §3 opens the sheet and actually filters with it,
 * because a drawer that renders and does not work is the shape this campaign keeps finding.
 *
 * 🔴 THE BASELINE THIS REPLACED, measured on production 2026-08-25 before any code moved:
 * at 360 and 414 the asset rail and the duration rail wrapped to FOUR rows — 100px + 96px =
 * **196px** — and the first game card sat at **top 652 of a 900px viewport**. At 768 and 1280
 * each rail was a single 44px row (88px total) and there was nothing wrong with them.
 * **That is why the split is at `sm`.**
 *
 * ⚠️ `domcontentloaded`, never `networkidle`: `/updown` holds a live price stream open, so the
 * network never goes idle and the wait could only ever expire — which prints as a dead page.
 */
import { BASE, loginOnce, browser, recorder } from "./live/harness.mjs";
import { mkdirSync } from "node:fs";

const SHOTS = ".qa-design-geometry/shots";
mkdirSync(SHOTS, { recursive: true });

const PHONE = [360, 414];
const DESKTOP = [768, 1280];

const r = recorder(`UD-13b · the Up & Down phone filters, on ${BASE}`);
const { b, ctx: boot } = await browser({});
await boot.close();
const state = await loginOnce(b, "alpha");

/** What the board looks like at one width. */
async function shape(w, shot) {
  const ctx = await b.newContext({ storageState: state, viewport: { width: w, height: 900 }, reducedMotion: "reduce" });
  const p = await ctx.newPage();
  try {
    await p.goto(`${BASE}/updown`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await p.waitForTimeout(3_500);
    const m = await p.evaluate(() => {
      // ⛔ VISIBILITY, NOT PRESENCE. `sm:hidden` is `display:none`, so the node is still in the
      // DOM — session 62 shipped a live driver that counted `querySelectorAll(…).length` and
      // reported a control present at a width where it was invisible. Ask for the BOX.
      const vis = (el) => { const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
      const rails = [...document.querySelectorAll("[data-filter-rail]")].filter(vis);
      const trig = [...document.querySelectorAll(".kp-fsheet-trigger")].filter(vis);
      const firstCard = document.querySelector('[class*="udcard"], [class*="ud-card"], .mcardp, section[class*="card"]');
      return {
        railCount: rails.length,
        railHeight: rails.reduce((a, x) => a + Math.round(x.getBoundingClientRect().height), 0),
        triggerCount: trig.length,
        triggerText: trig[0] ? (trig[0].innerText || "").replace(/\s+/g, " ").trim() : null,
        triggerAria: trig[0] ? trig[0].getAttribute("aria-label") : null,
        triggerH: trig[0] ? Math.round(trig[0].getBoundingClientRect().height) : null,
        firstCardTop: firstCard ? Math.round(firstCard.getBoundingClientRect().top + scrollY) : null,
        overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    });
    // ⚠️ A SHOT IS EVIDENCE, NOT AN ASSERTION. Left un-caught, a font-loading timeout in
    // `page.screenshot` aborts the whole driver and prints as a product failure — which is
    // this campaign's single most repeated defect, wearing yet another costume.
    if (shot) await p.screenshot({ path: `${SHOTS}/${shot}.png`, timeout: 15_000 }).catch(() => {});
    return { m, p, ctx };
  } catch (e) {
    await ctx.close();
    throw e;
  }
}

try {
  // ── 1 · DESKTOP IS UNCHANGED ────────────────────────────────────────────────
  for (const w of DESKTOP) {
    const { m, ctx } = await shape(w, `updown-${w}-after`);
    r.check(`1: @${w} both rails are still visible`, m.railCount === 2, `${m.railCount} rail(s)`);
    r.check(`1: @${w} they are still ONE row each (88px total)`, m.railHeight === 88, `${m.railHeight}px`);
    r.check(`1: @${w} ⛔ the phone sheet is NOT shown`, m.triggerCount === 0, `${m.triggerCount} trigger(s)`);
    await ctx.close();
  }

  // ── 2 · THE PHONE SHOWS ONE TRIGGER, NAMING THE BOARD ──────────────────────
  for (const w of PHONE) {
    const { m, ctx } = await shape(w, `updown-${w}-after`);
    r.check(`2: @${w} the two chip rails are gone`, m.railCount === 0, `${m.railCount} visible rail(s), ${m.railHeight}px`);
    r.check(`2: @${w} exactly ONE filter trigger`, m.triggerCount === 1, `${m.triggerCount}`);
    // ⭐ THE REQUIREMENT. The trigger must say what the board is showing, or the player has
    // traded four rows of chips for a button that answers nothing.
    const named = /bitcoin|ethereum|solana|gold|xrp|bnb/i.test(m.triggerText ?? "")
               && /\d+\s*min/i.test(m.triggerText ?? "");
    r.check(`2: @${w} ⭐ …and it NAMES the active asset and duration`, named, JSON.stringify(m.triggerText));
    r.check(`2: @${w} the accessible name carries them too`,
      /bitcoin|ethereum|solana|gold|xrp|bnb/i.test(m.triggerAria ?? "") && /\d+\s*min/i.test(m.triggerAria ?? ""),
      JSON.stringify(m.triggerAria));
    r.check(`2: @${w} the trigger meets the 44px tap floor`, (m.triggerH ?? 0) >= 44, `${m.triggerH}px`);
    r.check(`2: @${w} no horizontal overflow`, !m.overflowX);
    r.note(`@${w} first card now at top ${m.firstCardTop} (was 652 at 360, 640 at 414)`);
    await ctx.close();
  }

  // ── 3 · IT ACTUALLY FILTERS ────────────────────────────────────────────────
  {
    const ctx = await b.newContext({ storageState: state, viewport: { width: 360, height: 900 }, reducedMotion: "reduce" });
    const p = await ctx.newPage();
    try {
      await p.goto(`${BASE}/updown`, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await p.waitForTimeout(3_500);
      const before = await p.evaluate(() =>
        (document.querySelector(".kp-fsheet-trigger")?.innerText || "").replace(/\s+/g, " ").trim());

      await p.locator(".kp-fsheet-trigger").first().click();
      await p.waitForTimeout(900);
      const opened = await p.evaluate(() => {
        const d = document.querySelector('.kp-fsheet-panel[role="dialog"]');
        if (!d) return { open: false };
        const b = d.getBoundingClientRect();
        return { open: b.width > 0 && b.height > 0, w: Math.round(b.width), h: Math.round(b.height),
                 groups: document.querySelectorAll(".kp-fsheet-grp").length,
                 options: document.querySelectorAll(".kp-fsheet-panel a").length };
      });
      r.check("3: the sheet opens", opened.open === true, JSON.stringify(opened));
      r.check("3: …with both filter groups inside", opened.groups === 2, `${opened.groups} group(s)`);
      r.check("3: …and every option is a real link", (opened.options ?? 0) >= 6, `${opened.options} option(s)`);
      await p.screenshot({ path: `${SHOTS}/updown-360-sheet-open.png`, timeout: 15_000 }).catch(() => {});

      // Pick a DIFFERENT asset than the one currently on, then confirm the trigger followed.
      const picked = await p.evaluate(() => {
        const on = document.querySelector('.kp-fsheet-panel a[aria-current="true"], .kp-fsheet-panel a[data-on]');
        const all = [...document.querySelectorAll(".kp-fsheet-panel a")];
        const other = all.find((a) => a !== on && /bnb|ethereum|solana|gold|xrp|bitcoin/i.test(a.innerText || ""));
        if (other) { other.click(); return (other.innerText || "").trim(); }
        return null;
      });
      await p.waitForTimeout(4_000);
      const after = await p.evaluate(() =>
        (document.querySelector(".kp-fsheet-trigger")?.innerText || "").replace(/\s+/g, " ").trim());
      r.check("3: ⭐ choosing an asset in the sheet changes what the trigger says",
        !!picked && after !== before && new RegExp(picked.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(after),
        `picked=${JSON.stringify(picked)} · "${before}" → "${after}"`);

      // Close it. ⚠️ The `<details>` is uncontrolled on purpose and stays open across the
      // navigation, which is what lets a player set both axes in one visit.
      await p.getByRole("button", { name: /done|imekamilika|完成/i }).first().click().catch(() => {});
      await p.waitForTimeout(900);
      const closed = await p.evaluate(() => {
        const d = document.querySelector('.kp-fsheet-panel[role="dialog"]');
        if (!d) return true;
        const b = d.getBoundingClientRect();
        return !(b.width > 0 && b.height > 0);
      });
      r.check("3: the sheet closes", closed === true);
    } finally { await ctx.close(); }
  }
} catch (e) {
  r.check("driver completed", false, String(e.message ?? e).slice(0, 250));
} finally {
  await b.close();
}

process.exit(r.done() === 0 ? 0 : 1);
