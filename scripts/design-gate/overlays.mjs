/**
 * DESIGN SCAN — overlays drive: every dropdown, menu, drawer, sheet, listbox.
 * Read-only: only clicks openers that are structurally menus (aria-haspopup / aria-expanded /
 * details>summary / role=combobox) or whose accessible name is on a SAFE list. Never clicks a verb.
 *
 *   SURFACE=admin  PERSONA=admin node .qa-design-adminscan/overlays.mjs
 *   SURFACE=player PERSONA=alpha node .qa-design-adminscan/overlays.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { loginOnce, BASE } from "../live/harness.mjs";

const SURFACE = process.env.SURFACE || "admin";
const PERSONA = process.env.PERSONA || (SURFACE === "admin" ? "admin" : "alpha");
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "..", "..", ".qa-design-gate", `out-${SURFACE}-overlays`);
mkdirSync(OUT, { recursive: true });

const PAGES = SURFACE === "admin"
  ? { 1440: ["/admin", "/admin/markets", "/admin/players", "/admin/transactions", "/admin/candidates", "/admin/ai-polls", "/admin/resolver-queue", "/admin/updown", "/admin/updown/rounds", "/admin/audit", "/admin/events", "/admin/reports", "/admin/payments", "/admin/config", "/admin/insights", "/admin/aml", "/admin/proposals"], 390: ["/admin", "/admin/markets", "/admin/players"] }
  : { 1440: ["/", "/markets", "/updown", "/results", "/leaderboard", "/proposals", "/wallet", "/wallet/withdraw", "/wallet/deposit", "/positions", "/profile/account", "/profile/activity", "/notifications", "/updown/history"], 390: ["/", "/markets", "/updown", "/wallet", "/results", "/positions"] };

const SAFE_NAME = /^(filters?|sort|more|menu|language|lugha|语言|notifications?|account|profile|avatar|columns|options|view|show|hide|expand|collapse|open menu|close|details|ai|toolkit|range|period|date|when|status|category|topic|asset|type|role|page size|per page|advanced|help|\?|…|⋯|\.\.\.)$/i;
const DANGER = /confirm|delete|void|suspend|approve|reject|pay|resolve|settle|retry|generate|send|kill|reset|publish|seed|regenerat|export|download|run|toggle|enable|disable|switch|submit|save|withdraw|deposit|place|bet|buy|sell|cash|sign out|log out|logout|ondoka|退出|verify|claim|refresh|apply|clear|remove|add|create|new|edit|update|invite|promote|revoke|lock|unlock|freeze|adjust|credit|debit|refund|override|force|start|stop|pause|resume|archive|close round|open round/i;

const slug = (r) => r.replace(/^\/(admin\/?)?/, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || (SURFACE === "admin" ? "overview" : "home");

async function gotoSettled(page, url) {
  await page.goto(url, { waitUntil: "load", timeout: 60_000 });
  await page.waitForLoadState("networkidle", { timeout: 6_000 }).catch(() => {});
  await page.waitForTimeout(700);
}

/** Snapshot of visible "floating" elements — used to detect what an opener revealed. */
function floatingSnapshot() {
  const out = [];
  for (const el of document.querySelectorAll("*")) {
    const s = getComputedStyle(el); const r = el.getBoundingClientRect();
    if (r.width < 40 || r.height < 24 || s.visibility === "hidden" || s.display === "none" || s.opacity === "0") continue;
    const role = el.getAttribute("role") || "";
    const floating = ["fixed", "absolute"].includes(s.position) && (parseInt(s.zIndex) > 5 || role) || /^(menu|listbox|dialog|alertdialog)$/.test(role) || el.matches("details[open] > :not(summary)");
    if (!floating) continue;
    if (out.some((o) => o.el.contains(el))) continue; // outermost only
    out.push({ el });
  }
  return out;
}

function describeOverlay(el) {
  const cs = (e) => getComputedStyle(e);
  const px = (v) => Math.round(parseFloat(v) * 10) / 10;
  const fam = (s) => s.fontFamily.split(",")[0].replace(/['"]/g, "").trim();
  const txt = (e) => (e.innerText || e.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim().slice(0, 40);
  const s = cs(el); const r = el.getBoundingClientRect();
  const items = Array.from(el.querySelectorAll('[role="menuitem"], [role="option"], [role="menuitemradio"], a, button, label, li, [role="tab"]')).filter((e) => { const rr = e.getBoundingClientRect(); const ss = cs(e); return rr.height > 0 && ss.visibility !== "hidden" && !Array.from(e.querySelectorAll('[role="menuitem"], [role="option"], a, button')).length; }).slice(0, 24).map((e) => { const ss = cs(e); const rr = e.getBoundingClientRect(); return { tag: e.tagName.toLowerCase(), role: e.getAttribute("role") || "", text: txt(e), h: Math.round(rr.height), w: Math.round(rr.width), fs: px(ss.fontSize), ff: fam(ss), fw: ss.fontWeight, tt: ss.textTransform, pl: px(ss.paddingLeft), br: ss.borderRadius, color: ss.color, bg: ss.backgroundColor, selected: e.getAttribute("aria-selected") || e.getAttribute("aria-current") || e.getAttribute("aria-checked") || (e.hasAttribute("data-on") ? "data-on" : "") }; });
  const heads = Array.from(el.querySelectorAll("h1,h2,h3,p,span,div")).filter((e) => { const ss = cs(e); return ss.textTransform === "uppercase" && px(ss.fontSize) <= 12 && e.children.length === 0 && e.textContent.trim(); }).slice(0, 6).map((e) => { const ss = cs(e); return { text: txt(e), fs: px(ss.fontSize), ls: ss.letterSpacing, fw: ss.fontWeight, color: ss.color }; });
  return { tag: el.tagName.toLowerCase(), role: el.getAttribute("role") || "", cls: (typeof el.className === "string" ? el.className : "").slice(0, 120), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), br: s.borderRadius, bw: px(s.borderTopWidth), bc: s.borderTopColor, bg: s.backgroundColor, shadow: s.boxShadow.slice(0, 120), pad: [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft].map(px).join("/"), backdrop: s.backdropFilter, zIndex: s.zIndex, position: s.position, items, heads, offscreen: r.right > innerWidth + 1 || r.bottom > innerHeight + 1 || r.left < -1 || r.top < -1 };
}

const browser = await chromium.launch();
let state;
try { state = await loginOnce(browser, PERSONA); console.log("logged in as", PERSONA); }
catch (e) { console.error("LOGIN FAILED:", e.message.slice(0, 200)); await browser.close(); process.exit(2); }

const results = [];
for (const [wStr, pages] of Object.entries(PAGES)) {
  const w = Number(wStr);
  const ctx = await browser.newContext({ storageState: state, viewport: w === 390 ? { width: 390, height: 844 } : { width: 1440, height: 900 }, colorScheme: "dark", ...(w === 390 ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}) });
  for (const route of pages) {
    const page = await ctx.newPage();
    const rec = { route, w, openers: [] };
    try {
      await gotoSettled(page, BASE + route);
      // collect openers
      const openers = await page.$$('[aria-haspopup], [aria-expanded], details > summary, [role="combobox"], button, [role="button"]');
      let n = 0;
      const seen = new Set();
      for (const h of openers) {
        if (n >= 14) break;
        const info = await h.evaluate((el) => {
          const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
          const name = (el.getAttribute("aria-label") || el.innerText || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40);
          const structural = el.hasAttribute("aria-haspopup") || el.hasAttribute("aria-expanded") || el.matches("details > summary, [role=combobox]");
          return { name, structural, visible: r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none", disabled: el.matches(":disabled"), inTable: !!el.closest("table"), cls: (typeof el.className === "string" ? el.className : "").slice(0, 80), tag: el.tagName.toLowerCase(), key: el.tagName + "|" + name + "|" + (typeof el.className === "string" ? el.className : "").slice(0, 40) };
        }).catch(() => null);
        if (!info || !info.visible || info.disabled || info.inTable) continue;
        if (seen.has(info.key)) continue;
        if (!info.structural && !SAFE_NAME.test(info.name)) continue;
        if (DANGER.test(info.name) && !info.structural) continue;
        if (DANGER.test(info.name) && info.structural && !/^(sort|filter|more|menu|language|notifications?|account|profile)/i.test(info.name) && !/combobox|summary/.test(info.tag) && !info.cls.includes("kp-")) { /* structural but verb-named: still a popup opener, allow */ }
        seen.add(info.key);
        const before = await page.evaluate(() => { const snap = []; for (const el of document.querySelectorAll('[role="menu"], [role="listbox"], [role="dialog"], details[open]')) { const r = el.getBoundingClientRect(); if (r.width > 0) snap.push(el.outerHTML.slice(0, 60)); } return snap.length; });
        try {
          await h.scrollIntoViewIfNeeded();
          await h.click({ timeout: 3000 });
          await page.waitForTimeout(450);
          const overlay = await page.evaluate((desc) => {
            const cands = [];
            for (const el of document.querySelectorAll('[role="menu"], [role="listbox"], [role="dialog"], [role="alertdialog"], details[open] > *:not(summary), [data-state="open"], .kp-fsheet[open] .kp-fsheet-panel, [class*="popover"], [class*="dropdown"], [class*="drawer"], [class*="sheet"], [class*="menu"]')) {
              const s = getComputedStyle(el); const r = el.getBoundingClientRect();
              if (r.width < 40 || r.height < 24 || s.visibility === "hidden" || s.display === "none" || s.opacity === "0") continue;
              if (!["fixed", "absolute"].includes(s.position) && !el.getAttribute("role") && !el.closest("details[open]")) continue;
              if (cands.some((c) => c.contains(el))) continue;
              cands.push(el);
            }
            const fn = new Function("el", desc + "; return describeOverlay(el);");
            return cands.map((el) => fn(el));
          }, describeOverlay.toString());
          const entry = { opener: info.name, tag: info.tag, cls: info.cls, structural: info.structural, overlays: overlay };
          if (overlay.length) {
            // hover first item and read its hover paint
            const first = await page.$('[role="menu"] [role="menuitem"], [role="listbox"] [role="option"], [role="menu"] a, [role="menu"] button, details[open] a, details[open] button, [role="dialog"] a, [role="dialog"] button');
            if (first) {
              const b0 = await first.evaluate((e) => { const s = getComputedStyle(e); return [s.backgroundColor, s.color, s.boxShadow]; }).catch(() => null);
              await first.hover({ timeout: 1500 }).catch(() => {});
              await page.waitForTimeout(220);
              const b1 = await first.evaluate((e) => { const s = getComputedStyle(e); return [s.backgroundColor, s.color, s.boxShadow]; }).catch(() => null);
              entry.itemHover = b0 && b1 ? { before: b0, after: b1, changed: b0.join() !== b1.join() } : null;
            }
            const file = `${slug(route)}-${w}-${n + 1}-${info.name.replace(/[^a-z0-9]+/gi, "_").slice(0, 24) || "opener"}.png`;
            await page.screenshot({ path: path.join(OUT, file) });
            entry.shot = file;
            n++;
          }
          rec.openers.push(entry);
        } catch (e) { rec.openers.push({ opener: info.name, error: e.message.slice(0, 80) }); }
        // close: Escape, then click the opener again if something is still open
        await page.keyboard.press("Escape").catch(() => {});
        await page.waitForTimeout(200);
        const still = await page.evaluate(() => Array.from(document.querySelectorAll('[role="menu"], [role="listbox"], [role="dialog"], details[open]')).some((el) => el.getBoundingClientRect().width > 0));
        if (still) { await h.click({ timeout: 1500 }).catch(() => {}); await page.waitForTimeout(200); }
        const still2 = await page.evaluate(() => Array.from(document.querySelectorAll('[role="menu"], [role="listbox"], [role="dialog"], details[open]')).some((el) => el.getBoundingClientRect().width > 0));
        if (still2) { await page.mouse.click(2, Math.min(600, 400)).catch(() => {}); await page.waitForTimeout(200); }
        const still3 = await page.evaluate(() => Array.from(document.querySelectorAll('[role="menu"], [role="listbox"], [role="dialog"], details[open]')).some((el) => el.getBoundingClientRect().width > 0));
        if (still3) { await gotoSettled(page, BASE + route); }
      }
      console.log(`${route.padEnd(24)} @${w}  openers tried=${rec.openers.length} overlays=${rec.openers.filter((o) => o.overlays?.length).length}`);
    } catch (e) { rec.error = e.message.slice(0, 160); console.log(route, w, "ERROR", rec.error); }
    results.push(rec);
    await page.close();
  }
  await ctx.close();
}
writeFileSync(path.join(OUT, "_overlays.json"), JSON.stringify(results, null, 1));
await browser.close();
console.log("done");
