/** Whole AdminKpi captions and aligned figures on the real local pages, including two actual CSS fault plants.
 * BASE=http://localhost:3047 node scripts/qa-admin-kpi.mjs OUTSIDE_REPO_OUTPUT
 * Local memory only; seeds its own synthetic admin session, never a database or a production account.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(process.argv[2] ?? "");
const rel = relative(ROOT, OUT);
if (!process.argv[2] || (!rel.startsWith("..") && !isAbsolute(rel))) throw new Error("Output must be outside the repository");
const BASE = process.env.BASE ?? "http://localhost:3047";
if (!/^http:\/\/localhost:\d+$/.test(BASE)) throw new Error("Local memory preview only");
const health = await fetch(`${BASE}/api/health`).then(r => r.json());
if (health.database?.configured !== false || health.security?.adminTotp !== "DISABLED") throw new Error("Refused configured database or non-preview authentication");
mkdirSync(OUT, { recursive: true });
const results = [], cells = [], errors = [];
const record = (label, pass, detail = "") => { results.push({ label, pass, detail }); console.log(`${pass ? "PASS" : "FAIL"} ${label}`); };

function readKpis() {
  const rect = element => { const r = element.getBoundingClientRect(); return { x:r.x, y:r.y, width:r.width, height:r.height, right:r.right, bottom:r.bottom }; };
  const read = element => {
    const header = element.children[0], label = header.tagName === "SPAN" ? header : header.children[0];
    const body = element.children[1], figure = body?.children[0];
    if (!label || !figure) return { error:"Missing caption/body/figure" };
    const range = document.createRange(); range.selectNodeContents(label);
    const box = rect(label), rows = [...range.getClientRects()].filter(r=>r.width > 0).map(r=>({x:r.x,y:r.y,right:r.right,bottom:r.bottom}));
    const style = getComputedStyle(label), pulse = header.tagName === "DIV" ? header.children[1] : null;
    return {
      label:label.textContent, box:rect(element), caption:box, glyphs:rows, figure:rect(figure),
      parent:[...document.querySelectorAll(".admin-kpi")].map(n=>n.parentElement).indexOf(element.parentElement),
      style:{font:style.fontFamily,size:style.fontSize,tracking:style.letterSpacing,whiteSpace:style.whiteSpace,overflow:style.overflow,textOverflow:style.textOverflow},
      pulse:pulse ? rect(pulse) : null,
      full:rows.length>0 && rows.every(r=>r.x>=box.x-1 && r.right<=box.right+1 && r.y>=box.y-1 && r.bottom<=box.bottom+1),
      unavailable:element.title.includes("NOT zero")
    };
  };
  return {
    lang:document.documentElement.lang, fonts:document.fonts.status,
    woff:performance.getEntriesByType("resource").filter(r=>/\.woff2?(?:\?|$)/.test(r.name)).length,
    tiles:[...document.querySelectorAll(".admin-kpi")].map(read)
  };
}
function verdict(cell) {
  const issues = [];
  if (!cell.tiles.length || cell.tiles.some(t=>t.error)) return ["No real KPI tiles or missing body"];
  if (cell.fonts!=="loaded" || cell.woff<3) issues.push("Project font resources did not load");
  for (const tile of cell.tiles) {
    if (!tile.full) issues.push(`Caption cut: ${tile.label}`);
    if (tile.style.size!=="9.5px") issues.push(`Caption size changed: ${tile.label}`);
    if (tile.figure.y<tile.caption.bottom-1) issues.push(`Figure collides with caption: ${tile.label}`);
    if (tile.pulse && (tile.pulse.x<tile.caption.right-1 || tile.pulse.right>tile.box.right-1 || tile.pulse.y<tile.caption.y-1 || tile.pulse.bottom>tile.caption.y+20)) issues.push(`Live signal escapes first line: ${tile.label}`);
  }
  const bands = new Map();
  for (const tile of cell.tiles) {
    const key = `${tile.parent}:${Math.round(tile.box.y)}`;
    const row = bands.get(key) ?? []; row.push(tile); bands.set(key,row);
  }
  for (const row of bands.values()) if (row.length>1 && Math.max(...row.map(t=>t.figure.y))-Math.min(...row.map(t=>t.figure.y))>1) issues.push(`Unaligned figures: ${row.map(t=>t.label).join(" / ")}`);
  return issues;
}

const browser = await chromium.launch(process.env.QA_CHROMIUM_PATH ? { executablePath:process.env.QA_CHROMIUM_PATH } : {});
try {
  for (const locale of ["en","sw"]) {
    const context = await browser.newContext();
    try {
      await context.addCookies([{ name:"kp-locale", value:locale, url:BASE }]);
      const seeded = await context.request.post(`${BASE}/api/dev-test/seed-admin`, { data:{ role:"ADMIN", phone:"+255700000077", name:"KPI Layout QA" }, timeout:240_000 });
      if (!seeded.ok()) throw new Error(`Synthetic own admin session failed (${seeded.status()})`);
      for (const width of [320,1280]) for (const route of ["/admin","/admin/markets","/admin/players","/admin/house"]) {
        const page = await context.newPage();
        try {
          await page.setViewportSize({ width,height:900 });
          const pageErrors = [];
          page.on("pageerror",error=>pageErrors.push(error.message));
          const response = await page.goto(BASE+route,{ waitUntil:"domcontentloaded",timeout:240_000 });
          await page.locator(".admin-kpi").first().waitFor({timeout:90_000});
          await page.evaluate(()=>document.fonts.ready); await page.waitForTimeout(700);
          const cell = await page.evaluate(readKpis), label=`${locale} ${width} ${route}`;
          const issues = verdict(cell);
          cells.push({label,status:response.status(),...cell,issues,pageErrors});
          record(label,response.status()===200 && cell.lang===locale && !issues.length && !pageErrors.length,issues.join("; "));
          await page.screenshot({path:join(OUT,`${locale}-${width}-${route.replaceAll("/","_")}.png`)});
          // Every cell uses the same geometry verdict: restore the actual old truncate declaration.
          await page.evaluate(()=>document.querySelectorAll(".admin-kpi").forEach(element=>{
            const header=element.children[0],caption=header.tagName==="SPAN"?header:header.children[0];
            caption.style.whiteSpace="nowrap";caption.style.overflow="hidden";caption.style.textOverflow="ellipsis";
          }));
          if (width===320 && ["/admin","/admin/markets"].includes(route)) {
            const planted=await page.evaluate(readKpis),truncated = verdict(planted);
            record(`${label} RED old caption truncation`,planted.tiles.some(tile=>!tile.full) && truncated.some(issue=>issue.startsWith("Caption cut:")),truncated.join("; "));
          }
          if (route==="/admin/markets" && width===320) {
            await page.evaluate(()=>document.querySelectorAll(".admin-kpi").forEach(element=>{
              const header=element.children[0],caption=header.tagName==="SPAN"?header:header.children[0];
              caption.style.whiteSpace="normal";caption.style.overflow="visible";caption.style.textOverflow="clip";
              element.style.gridTemplateRows="auto auto";element.style.gridRow="auto";
            }));
            const unaligned = verdict(await page.evaluate(readKpis));
            record(`${label} RED remove shared header tracks`,unaligned.some(issue=>issue.startsWith("Unaligned figures:")),unaligned.join("; "));
          }
        } finally { await page.close(); }
      }
    } finally { await context.close(); }
  }
} catch (error) { errors.push(String(error.message));record("Driver premise or navigation",false,error.message); }
finally { await browser.close(); }
writeFileSync(join(OUT,"evidence.json"),JSON.stringify({base:BASE,results,cells,errors},null,2));
const failures=results.filter(r=>!r.pass);
console.log(`AdminKpi real-page proof: ${results.length-failures.length} passed, ${failures.length} failed`);
process.exitCode=failures.length ? 1 : 0;
