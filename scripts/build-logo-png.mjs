// Renders the brand FiftyMark to two PNG variants (colour + white) used
// by the report renderer. Run once when the mark changes; commits the
// PNGs under public/brand/.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const OUT = resolve(process.cwd(), "public/brand");
mkdirSync(OUT, { recursive: true });

function svgMark({ size = 128, mono = false, inverted = false }) {
  const r = 50, cx = 50, cy = 50, tilt = -14;
  const rad = (tilt * Math.PI) / 180;
  const dx = Math.sin(rad) * 80;
  const dy = Math.cos(rad) * 80;
  const top = { x: cx + dx, y: cy - dy };
  const bot = { x: cx - dx, y: cy + dy };
  const yesColor = mono ? (inverted ? "#FFFFFF" : "#2C8C5E") : "#2C8C5E";
  const noColor  = mono ? (inverted ? "#FFFFFF" : "#B7263A") : "#B7263A";
  const ringColor = mono ? (inverted ? "#FFFFFF" : "#1F2A6E") : "#1F2A6E";
  const numberColor = inverted ? "#1F2A6E" : "#FFFFFF";
  const giltStroke = "#C39A2A";
  const giltPip = "#E2BD5C";
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <defs><clipPath id="c"><circle cx="50" cy="50" r="49"/></clipPath></defs>
  <g clip-path="url(#c)">
    <path d="M ${top.x} ${top.y} A ${r} ${r} 0 0 0 ${bot.x} ${bot.y} L ${top.x} ${top.y} Z" fill="${yesColor}"/>
    <path d="M ${top.x} ${top.y} A ${r} ${r} 0 0 1 ${bot.x} ${bot.y} L ${top.x} ${top.y} Z" fill="${noColor}"/>
    <line x1="${top.x}" y1="${top.y}" x2="${bot.x}" y2="${bot.y}" stroke="${mono ? ringColor : giltStroke}" stroke-width="2" stroke-linecap="round"/>
    <text x="50" y="52" text-anchor="middle" dominant-baseline="middle"
          font-family="Helvetica, Arial, sans-serif" font-weight="700"
          font-size="30" fill="${numberColor}" style="letter-spacing:-0.04em">50</text>
    ${mono ? "" : `<circle cx="50" cy="50" r="1.6" fill="${giltPip}"/>`}
  </g>
  <circle cx="50" cy="50" r="49" fill="none" stroke="${ringColor}" stroke-width="2"/>
  ${mono ? "" : `<circle cx="50" cy="50" r="47.6" fill="none" stroke="${giltStroke}" stroke-width="0.5" opacity="0.55"/>`}
</svg>`.trim();
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 256, height: 256 }, deviceScaleFactor: 2 });

const targets = [
  { name: "fiftymark-color", size: 256, mono: false, inverted: false },
  { name: "fiftymark-white", size: 256, mono: true,  inverted: true  },
];

for (const t of targets) {
  const page = await ctx.newPage();
  const svg = svgMark({ size: t.size, mono: t.mono, inverted: t.inverted });
  await page.setContent(`<!doctype html><html><body style="margin:0;background:transparent">${svg}</body></html>`);
  await page.waitForTimeout(200);
  const el = page.locator("svg").first();
  await el.screenshot({ path: resolve(OUT, `${t.name}.png`), omitBackground: true });
  console.log(`✓ ${t.name}.png`);
  await page.close();
}

await ctx.close();
await browser.close();
