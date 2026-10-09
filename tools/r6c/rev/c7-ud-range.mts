// C7: Up & Down's custom-amount range line is ONE nowrap `.amount` paragraph (sentence + two figures).
// Width in JetBrains Mono (every glyph 0.6em) at text-micro 10px (.amount.amount resets the tracking to 0),
// against the content box of the .mcardp card at phone widths (page gutter 16px, card border 1px, padding 15px).
import { readFileSync } from "node:fs";
import { dict } from "file:///F:/kipindi-r6c/src/lib/i18n-dict.ts";
import { formatTzs } from "file:///F:/kipindi-r6c/src/lib/utils.ts";
import { PLATFORM_MIN_STAKE, PLATFORM_MAX_STAKE } from "file:///F:/kipindi-r6c/src/lib/payout.ts";
const R = "F:/kipindi-r6c/";
const src = readFileSync(R + "src/components/updown/updown-stake-controls.tsx", "utf8").split(/\r?\n/);
const at = src.findIndex((l) => l.includes("udStakeRange"));
console.log(`updown-stake-controls.tsx:${at}  ${src[at - 1].trim()}`);
console.log(`updown-stake-controls.tsx:${at + 1}  ${src[at].trim()}`);
const css = readFileSync(R + "src/app/globals.css", "utf8");
console.log("globals.css: " + /\.amount\.amount \{[^}]*\}/.exec(css)![0]);
console.log("globals.css: " + /\.mcardp \{[^\n]*/.exec(css)![0].slice(0, 120));
const range = `${formatTzs(PLATFORM_MIN_STAKE)} – ${formatTzs(PLATFORM_MAX_STAKE)}`;
const cjk = (ch: string) => /[\u3000-\u9fff\uff00-\uffef]/.test(ch);
const width = (s: string) => [...s].reduce((w, ch) => w + (cjk(ch) ? 10 : 6), 0); // 10px: mono 0.6em; a CJK fallback glyph ~1em
for (const loc of ["sw", "en", "zh"] as const) {
  const line = `${(dict as any)[loc].market.udStakeRange} · ${range}`;
  const w = width(line);
  const boxes = [320, 360, 390, 412].map((vw) => { const box = vw - 32 - 2 - 30; return `${vw}:${box}px ${w > box ? `OVER by ${w - box}` : "fits"}`; });
  console.log(`[${loc}] "${line}" = ${[...line].length} chars ≈ ${w}px | ${boxes.join(" · ")}`);
}
console.log(`valid state "${range}" ≈ ${width(range)}px (fits everywhere)`);
