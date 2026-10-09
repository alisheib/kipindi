/**
 * ROUND 4 OF THE VISUAL PASS, HELPER E (2026-10-09) — every fix a later edit could silently undo, held, each beside a
 * control or a plant that proves the check can fail.
 *
 *   npx tsx scripts/visual-pass-r4e.test.mts        (npm run test:visual-pass-r4e)
 *
 * The owner's rule (Ali, 2026-10-08): only perfect visual and logical results. Each section names the tiles the defect
 * was measured on (S/visual/tiles-r4) and the file that fixes it; the measurements are in those files' notes.
 *   §1  the hub's card-size row is a two-line hub row: glyph and switch centred on the row, 56px where the hint fits
 *   §2  the hub's Needle row draws a glyph of the row family (one ink, the family's ring)
 *   §3  the guest sheet's title centres its CAPITALS on the ×, and the sheet's height is whole
 *   §4  the badge names stack their two parts, never a line on "·", never "Kwanza" alone
 *   §5  one content edge per column: /profile's stat strip, the RG page's cards, the proposals notice
 *   §6  /profile's settings cards are 16px apart, the hub's gutter
 *   §7  /fairness' step numerals stand on the card's content edge
 *   §8  the Wallet's text links wear the house focus ring
 *   §9  a <Stat> hint is balanced
 *   §10 a year keeps the word before it in the legal version line
 *   §11 the payment-provider grid: a short last row shares the row
 *   §12 the journey capsule centres its caption and figure in the box D31 reserves
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { decomment, decommentCss } from "./lib/decomment.mts";
import { keepLastWords, keepSentences, keepYears } from "../src/components/ui/keep-words.tsx";
import { DotSeq } from "../src/components/ui/dot-seq.tsx";
import { cn } from "../src/lib/utils.ts";
import { dict as DICTS } from "../src/lib/i18n-dict.ts";

let pass = 0;
const fails: string[] = [];
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};
const section = (s: string) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 100 - s.length))}`);
const raw = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
/** Source with its comments out (the shared scanner), so a rule quoted in a note is never mistaken for the rule. */
const read = (p: string) => decomment(raw(p));
const CSS = decommentCss(raw("src/app/globals.css"));
const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** One rule's declarations, by its exact selector (or one member of a selector list) at the start of a line. */
function rule(src: string, selector: string): string {
  const m = new RegExp(`(?:^|\\n)\\s*(?:[^{}\\n]*,\\s*)?${esc(selector)}(?![\\w-])\\s*(?:,[^{}\\n]*)?\\{([^}]*)\\}`).exec(src);
  return m ? m[1] : "";
}
/** The body of the first `@media (min-width: Npx) { … }` block that mentions `needle`. */
function mediaBlock(src: string, minWidth: number, needle: string): string {
  const opener = `@media (min-width: ${minWidth}px) {`;
  let at = src.indexOf(opener);
  while (at >= 0) {
    let depth = 0, i = at + opener.length - 1;
    for (; i < src.length; i++) { if (src[i] === "{") depth++; else if (src[i] === "}" && --depth === 0) break; }
    const body = src.slice(at + opener.length, i);
    if (body.includes(needle)) return body;
    at = src.indexOf(opener, i);
  }
  return "";
}
/** :root's px custom properties. */
const ROOT_PX: Record<string, number> = {};
for (const m of raw("src/app/globals.css").matchAll(/(--(?:sp|type|h-control|r)-[a-z0-9-]+):\s*([0-9.]+)px/g)) ROOT_PX[m[1]] ??= Number(m[2]);
const px = (v: string) => ROOT_PX[v] ?? NaN;
const tw = raw("tailwind.config.ts");
const twStep = (k: string) => Number(new RegExp(`"${esc(k)}":\\s*"([0-9.]+)px"`).exec(tw)?.[1] ?? NaN);

// The repo's own fonts (src/lib/server/reports/fonts), advances with kerning — visual-pass-r3c's model, within ~1% of tiles.
const fontkit = createRequire(import.meta.url)("fontkit") as {
  openSync: (p: string) => { layout: (s: string, f?: string[]) => { positions: { xAdvance: number }[]; glyphs: { bbox: { minX: number } }[] }; unitsPerEm: number };
};
const F = (n: string) => fontkit.openSync(`src/lib/server/reports/fonts/${n}.ttf`);
const inter = F("Inter-Regular"), interMed = F("Inter-Medium"), mono = F("JetBrainsMono-Bold");
const width = (f: ReturnType<typeof F>, s: string, size: number) => f.layout(s).positions.reduce((a, p) => a + p.xAdvance, 0) / f.unitsPerEm * size;
const ideographs = (s: string) => [...s].filter((c) => /[㐀-鿿豈-﫿　-〿＀-￯]/.test(c)).length;
/** Width of a string that may hold ideographs: each ideograph at 1em, the rest in the given face. */
const widthMixed = (f: ReturnType<typeof F>, s: string, size: number) =>
  ideographs(s) * size + width(f, [...s].filter((c) => !/[㐀-鿿豈-﫿　-〿＀-￯]/.test(c)).join(""), size);

const sw = DICTS.sw, en = DICTS.en, zh = DICTS.zh;

/* ══ §1 · THE CARD-SIZE ROW ═══════════════════════════════════════════════════════════════════════════════════════ */
section("1 · the hub's card-size row is a two-line hub row (tile 259)");
{
  const row = read("src/components/journey/account/card-size-row.tsx");
  const btn = /<button[\s\S]*?<\/button>/.exec(row)?.[0] ?? "";
  const shape = (s: string) => {
    const at = (needle: string) => s.indexOf(needle);
    const glyph = at('className="kp-hub__glyph"'), text = at('className="kp-hub__text"'), pair = at('className="kp-hub__pair"');
    const label = at('className="kp-hub__label"'), value = at('className="kp-hub__value"'), hint = at('className="kp-hub__sub"');
    const toggle = at("<Toggle on={compact} decorative />"), textEnd = s.indexOf("</span>\n        <Toggle");
    return [
      !/className="kp-hub__row"/.test(s) && "the button is not a plain hub row",
      /kp-hub__row--switch|kp-hub__row-hint/.test(s) && "round 3's grid hooks are still on it",
      !(glyph >= 0 && glyph < text && text < pair && pair < label && label < value && value < hint) && "glyph, then the text column holding label + value, then the hint",
      !(hint < toggle && textEnd > hint && textEnd < toggle) && "the switch is not the trailing child after the text column",
      !/\{keepSentences\(t\.nav\.cardSpacingHint\)\}/.test(s) && "the hint does not keep its sentences whole",
    ].filter(Boolean) as string[];
  };
  ok("1.1 · glyph | text column (label with its value, then the hint) | switch — an ordinary hub row, the hint kept by sentence",
    btn !== "" && shape(btn).length === 0, shape(btn).join(" · "));
  const r3 = btn.replace('className="kp-hub__row"', 'className="kp-hub__row kp-hub__row--switch"');
  ok("1.1′ PLANT · round 3's grid hook put back is reported", shape(r3).length > 0);
  const switchAfter = btn.replace("<Toggle on={compact} decorative />", "").replace('<span className="kp-hub__glyph"', '<Toggle on={compact} decorative />\n<span className="kp-hub__glyph"');
  ok("1.1″ PLANT · the switch moved before the words is reported", shape(switchAfter).length > 0);

  // The stylesheet: no grid survives, the pair wraps on its baseline, and the row is the rung's.
  ok("1.2 · no `.kp-hub__row--switch` rule remains (the grid that put the switch on the label's line)", !/\.kp-hub__row--switch/.test(CSS) && !/\.kp-hub__row-hint/.test(CSS));
  const pairRule = rule(CSS, ".kp-hub__pair");
  ok("1.2′ · `.kp-hub__pair` is a wrapping baseline flex line with the hub's 12px gap between label and value",
    /display:\s*flex/.test(pairRule) && /flex-wrap:\s*wrap/.test(pairRule) && /align-items:\s*baseline/.test(pairRule) && /gap:\s*2px var\(--sp-3\)/.test(pairRule), pairRule);
  const hubRow = rule(CSS, ".kp-hub__row");
  ok("1.3.locate · the hub row is flex, centred, 12px gap, 8/16px padding, the 56px rung",
    /display:\s*flex/.test(hubRow) && /align-items:\s*center/.test(hubRow) && /gap:\s*var\(--sp-3\)/.test(hubRow)
      && /padding:\s*var\(--sp-2\) var\(--sp-4\)/.test(hubRow) && /min-height:\s*var\(--h-control-xl\)/.test(hubRow) && px("--h-control-xl") === 56, hubRow);

  // ⭐ THE GEOMETRY. The text column: viewport − 2×16 gutter − 2×1 card border − 2×16 row padding − 20 glyph − 12 gap −
  // 12 gap − 44 switch = viewport − 154. The switch is 44×26 (toggle.tsx); a 56px row's two lines (19.5 + 2 + 17.55,
  // centred) both overlap its band, so neither line may run under it.
  const toggle = raw("src/components/ui/toggle.tsx");
  const tW = Number(/width: (\d+),\s*\n\s*height: 26/.exec(toggle)?.[1] ?? NaN);
  const gap = px("--sp-3"), pad = px("--sp-4");
  const col = (vw: number) => vw - 2 * 16 - 2 - 2 * pad - 20 - gap - gap - tW;
  ok("1.3 · the text column is viewport − 154 (166 at 320, 206 at 360, 236 at 390)", col(320) === 166 && col(360) === 206 && col(390) === 236, `${col(320)} ${col(360)} ${col(390)}`);
  // The first line holds the 15px label (line 1.3) and the 13px value (the body's 1.5) on one baseline, so its height is
  // the larger part above the baseline plus the larger part below (Inter: ascent 1984, descent 494 per 2048).
  const im = JSON.parse(readFileSync("node_modules/next/dist/server/capsize-font-metrics.json", "utf8")).inter as { ascent: number; descent: number; unitsPerEm: number };
  const split = (size: number, lh: number) => { const content = (im.ascent - im.descent) / im.unitsPerEm * size, above = (lh * size - content) / 2 + im.ascent / im.unitsPerEm * size; return [above, lh * size - above]; };
  const [la, lb] = split(px("--type-body"), 1.3), [va, vb] = split(px("--type-small"), 1.5);
  const line1 = Math.max(la, va) + Math.max(lb, vb), sub = px("--type-small") * 1.35;
  const twoLines = px("--sp-2") * 2 + line1 + 2 + sub;
  ok("1.4 · two lines fit the 56px rung (8 + 20.2 + 2 + 17.55 + 8 = 55.8) and so does the 26px switch, centred",
    twoLines <= 56 && 26 <= 56 - 2 * px("--sp-2") && /\.kp-hub__label\s*\{[^}]*line-height:\s*1\.3/.test(CSS) && /\.kp-hub__sub\s*\{[^}]*line-height:\s*1\.35/.test(CSS)
      && /body\s*\{[^}]*line-height:\s*1\.5;/.test(CSS) && !/line-height/.test(rule(CSS, ".kp-hub__value")), twoLines.toFixed(2));
  const hintW = { sw: width(inter, sw.nav.cardSpacingHint, 13), en: width(inter, en.nav.cardSpacingHint, 13), zh: widthMixed(inter, zh.nav.cardSpacingHint, 13) };
  ok("1.5 · the hint is ONE line — a 56px row — from 360 in en and zh, and from 390 in sw",
    hintW.en <= col(360) && hintW.zh <= col(360) && hintW.sw <= col(390), JSON.stringify(hintW));
  ok("1.5′ CONTROL · sw at 360 does not fit (224.9 against 206): there the hint breaks between its sentences and the row grows",
    hintW.sw > col(360));
  const sentences = (s: string) => s.split(/(?<=[.!?])\s+/);
  const longest = Math.max(...[sw, en].flatMap((d) => sentences(d.nav.cardSpacingHint).map((x) => width(inter, x, 13))));
  ok("1.6 · every sentence fits the narrowest line (320), so \"two whole lines\" holds at every width it wraps", longest <= col(320), longest.toFixed(1));
  const pairW = (d: typeof sw) => width(interMed, d.journey.hubCardSize, 15) + gap + Math.max(width(inter, d.nav.densityCompact, 13), width(inter, d.nav.densityComfortable, 13));
  const pairZh = widthMixed(interMed, zh.journey.hubCardSize, 15) + gap + Math.max(widthMixed(inter, zh.nav.densityCompact, 13), widthMixed(inter, zh.nav.densityComfortable, 13));
  ok("1.7 · label and value share the first line from 360 in every language, and in en and zh at 320",
    pairW(sw) <= col(360) && pairW(en) <= col(320) && pairZh <= col(320), `sw ${pairW(sw).toFixed(1)} en ${pairW(en).toFixed(1)} zh ${pairZh.toFixed(1)}`);
  ok("1.7′ CONTROL · at sw 320 the pair is wider than its line (171 against 166) — the value wraps under the label, the label stays whole",
    pairW(sw) > col(320) && width(interMed, sw.journey.hubCardSize, 15) <= col(320));

  // keepSentences: two nowrap sentences, the words unchanged; Chinese and a one-sentence text as documented.
  const kept = html(h("p", null, keepSentences(sw.nav.cardSpacingHint)));
  ok("1.8 · keepSentences: \"<Kwa simu tu.> <Hakuna kinachofichwa.>\", the text itself unchanged",
    kept === `<p><span class="whitespace-nowrap">Kwa simu tu.</span> <span class="whitespace-nowrap">Hakuna kinachofichwa.</span></p>` && kept.replace(/<[^>]+>/g, "") === `${sw.nav.cardSpacingHint}`, kept);
  ok("1.8′ CONTROL · Chinese is returned as written, and one sentence falls back to keepLastWords",
    keepSentences(zh.nav.cardSpacingHint) === zh.nav.cardSpacingHint
      && html(h("p", null, keepSentences("Weka mipaka yako sasa."))) === html(h("p", null, keepLastWords("Weka mipaka yako sasa."))));
  ok("1.8″ · no lookbehind in keep-words.tsx (a client bundle with one fails to parse on Safari before 16.4)", !/\(\?<[=!]/.test(read("src/components/ui/keep-words.tsx")));
}

/* ══ §2 · THE NEEDLE ROW'S GLYPH ═════════════════════════════════════════════════════════════════════════════════ */
section("2 · the hub's Needle row draws a glyph of the row family (tiles 122–130)");
{
  const drawer = read("src/components/layout/needle-drawer.tsx");
  const branch = (s: string) => /variant === "hub-row" \? \(([\s\S]*?)\) : \(/.exec(s)?.[1] ?? "";
  const family = (s: string) => /<span className="kp-hub__glyph" aria-hidden><I\.needle s=\{20\} \/><\/span>/.test(branch(s)) && !/NeedleMark/.test(branch(s));
  ok("2.1 · the hub row's glyph slot holds `I.needle` at 20, not the two-tone NeedleMark", family(drawer), branch(drawer).slice(0, 200));
  ok("2.1′ PLANT · NeedleMark put back in the slot is reported", !family(drawer.replace("<I.needle s={20} />", "<NeedleMark size={20} />")));
  const glyphs = read("src/components/ui/glyphs.tsx");
  const needle = /needle: \(p: GlyphProps\) => <G \{\.\.\.p\}>([\s\S]*?)<\/G>,/.exec(glyphs)?.[1] ?? "";
  const ring = (name: string) => /<circle cx="12" cy="12" r="([0-9.]+)" \/>/.exec(new RegExp(`${name}: \\(p: GlyphProps\\) => <G \\{\\.\\.\\.p\\}>([\\s\\S]*?)</G>,`).exec(glyphs)?.[1] ?? "")?.[1];
  ok("2.2 · I.needle is drawn by G (the 24 grid, one 1.9 stroke, currentColor) with the ring of globe and checkCircle, no opacity",
    needle !== "" && ring("needle") === "9" && ring("globe") === "9" && ring("checkCircle") === "9" && !/opacity/.test(needle), needle);
  const seg = /d="M([0-9.]+) ([0-9.]+)l([0-9.]+) ([0-9.]+)"/.exec(needle);
  const [x1, y1] = [Number(seg?.[1]), Number(seg?.[2])], [x2, y2] = [x1 + Number(seg?.[3]), y1 + Number(seg?.[4])];
  const reach = [Math.hypot(x1 - 12, y1 - 12), Math.hypot(x2 - 12, y2 - 12)];
  const tilt = Math.atan2(x2 - x1, y2 - y1), markTilt = Math.atan2(62 - 38, 92 - 8);
  ok("2.3 · the needle crosses the pivot at the mark's tilt and ends on the ring's stroke at both ends",
    Math.abs(tilt - markTilt) < 0.005 && reach.every((r) => Math.abs(r - 9) <= 0.95) && Math.abs((x1 + x2) / 2 - 12) < 0.01 && Math.abs((y1 + y2) / 2 - 12) < 0.01,
    `tilt ${tilt.toFixed(4)} vs ${markTilt.toFixed(4)} · reach ${reach.map((r) => r.toFixed(2)).join("/")}`);
  ok("2.4 CONTROL · NeedleMark keeps its two tones where it is the mark (the account menu's row)",
    /<circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" opacity="0\.5" \/>/.test(drawer) && /variant === "menu-row" \?[\s\S]{0,900}<NeedleMark \/>/.test(drawer));
}

/* ══ §3 · THE GUEST SHEET'S × ON THE TITLE'S CAPITALS ════════════════════════════════════════════════════════════ */
section("3 · the guest tickets sheet's title centres its capitals on the × (tiles 113–121)");
{
  const metrics = JSON.parse(readFileSync("node_modules/next/dist/server/capsize-font-metrics.json", "utf8")).sora as { ascent: number; descent: number; capHeight: number; unitsPerEm: number };
  const title = rule(CSS, ".kp-jsheet__title");
  const lh = Number(/line-height:\s*([0-9.]+)/.exec(title)?.[1] ?? NaN);
  const k = Number(/margin:\s*calc\(var\(--sp-10\) - var\(--sp-8\) - var\(--type-h3\) \* ([0-9.]+)\) 0 0/.exec(title)?.[1] ?? NaN);
  const { ascent, descent, capHeight, unitsPerEm } = metrics;
  // The cap band's centre, down from the top of a line box `lh` em tall: half-leading + ascent − half the cap height.
  const capCentre = (lh - (ascent - descent) / unitsPerEm) / 2 + (ascent - capHeight / 2) / unitsPerEm;
  ok("3.locate · Sora's metrics are next's (ascent 970, descent −290, cap 730 per 1000) and the title is the display face at --type-h3 in a 1.25 line",
    ascent === 970 && descent === -290 && capHeight === 730 && unitsPerEm === 1000 && lh === 1.25 && /font-family:\s*var\(--font-display\)/.test(title) && /font-size:\s*var\(--type-h3\)/.test(title), JSON.stringify(metrics));
  ok("3.1 · the margin's factor is the cap band's centre, 0.6em down the line (not the line's middle, 0.625)", Math.abs(k - capCentre) < 1e-9, `factor ${k} · cap centre ${capCentre}`);
  const xCentre = twStep("3") + twStep("8") / 2; // the Modal's × box: top-3, h-8
  const h3 = px("--type-h3");
  const margin = px("--sp-10") - px("--sp-8") - h3 * k;
  const top = { phone: px("--sp-3") + 4 + px("--sp-4"), desk: twStep("6") }; // 12 + the 4px grab + the 16px gap · lg:p-6, grab hidden
  const capAt = (t: number) => t + margin + h3 * capCentre;
  ok("3.2 · below 1024 and from 1024 the capitals' centre meets the ×'s centre (40px under the padding edge)",
    Math.abs(capAt(top.phone) - xCentre) < 0.01 && Math.abs(capAt(top.desk) - xCentre) < 0.01 && /height:\s*4px/.test(rule(CSS, ".kp-wsheet__grab")), `${capAt(top.phone)} ${capAt(top.desk)} vs ${xCentre}`);
  // The sheet docks to a whole-pixel bottom edge, so a fractional height puts its border and × on a half pixel.
  const sheetH = (lines: number) => 2 + px("--sp-3") + 4 + px("--sp-4") + margin + lines * h3 * lh + px("--sp-4") + px("--h-control-xl") + px("--sp-5");
  ok("3.3 · the sheet's height is whole (one line 147, two 172), so its top never sits on a half pixel",
    Number.isInteger(sheetH(1)) && Number.isInteger(sheetH(2)), `${sheetH(1)} ${sheetH(2)}`);
  const r3 = 40 - 32 - h3 * lh / 2;
  ok("3.3′ PLANT · round 3's line-box margin (−4.5px) is reported: capitals 0.5px high and a 146.5px sheet",
    Math.abs(top.phone + r3 + h3 * capCentre - xCentre) >= 0.5 && !Number.isInteger(sheetH(1) - margin + r3), String(r3));
}

/* ══ §4 · THE BADGE NAMES ════════════════════════════════════════════════════════════════════════════════════════ */
section("4 · the badge shelf's bilingual names stack, never a line on \"·\" (tiles 186 188)");
{
  const shelf = read("src/components/badges/Badge.tsx");
  ok("4.1 · each caption is drawn by DotSeq, stacked, each part's last two words kept", /<figcaption[^>]*>\s*<DotSeq text=\{it\.title\} stack renderPart=\{keepLastWords\} \/>\s*<\/figcaption>/.test(shelf));
  ok("4.1′ PLANT · the bare title back in the caption is reported",
    !/<figcaption[^>]*>\s*<DotSeq text=\{it\.title\} stack renderPart=\{keepLastWords\} \/>/.test(shelf.replace("<DotSeq text={it.title} stack renderPart={keepLastWords} />", "{it.title}")));
  const out = html(h(DotSeq, { text: "First Win · Ushindi wa Kwanza", stack: true, renderPart: keepLastWords }));
  ok("4.2 · \"First Win\" over \"Ushindi <wa Kwanza>\": two items, the dot hidden from assistive tech and still in a copy",
    out === `<span class="kp-seq kp-seq--stack"><span class="kp-seq__item">First Win</span><span class="kp-seq__item"> <span class="kp-seq__dot" aria-hidden="true">·</span> Ushindi <span class="whitespace-nowrap">wa Kwanza</span></span></span>`, out);
  ok("4.2′ CONTROL · without `renderPart` and `stack` DotSeq renders exactly as before (round 3's markup)",
    html(h(DotSeq, { text: "A · B" })) === `<span class="kp-seq"><span class="kp-seq__item">A</span><span class="kp-seq__item"> <span class="kp-seq__dot" aria-hidden="true">·</span> B</span></span>`);
  const stack = rule(CSS, ".kp-seq--stack"), dot = rule(CSS, ".kp-seq--stack .kp-seq__dot");
  ok("4.3 · a stacked sequence is a centred column and its dot is painted transparent", /flex-direction:\s*column/.test(stack) && /align-items:\s*center/.test(stack) && /opacity:\s*0/.test(dot), `${stack} | ${dot}`);
  // Every name: two parts, and no part's unbreakable run is wider than the narrowest caption (the shelf's 96px track).
  const ach = raw("src/lib/server/achievements.ts");
  const titles = [...ach.matchAll(/title: "([^"]+ · [^"]+)"/g)].map((m) => m[1]);
  const track = Number(/minmax\((\d+)px, 1fr\)/.exec(shelf)?.[1] ?? NaN);
  const runs = titles.flatMap((t) => t.split(" · ").map((p) => { const w = p.split(" "); return w.length >= 3 ? [...w.slice(0, -2), w.slice(-2).join(" ")] : w; }).flat());
  const widest = Math.max(...runs.map((r) => width(inter, r, 13)));
  ok("4.4 · six bilingual names, two parts each, and every unbreakable run fits the 96px track (the widest, \"Mtengeneza\" or a kept pair)",
    titles.length === 6 && titles.every((t) => t.split(" · ").length === 2) && widest <= track, `${titles.length} names · widest ${widest.toFixed(1)} vs ${track}`);
}

/* ══ §5 · ONE CONTENT EDGE PER COLUMN ════════════════════════════════════════════════════════════════════════════ */
section("5 · one content edge per column (tiles 182 185 186 187 188)");
{
  const prof = read("src/app/profile/page.tsx");
  const heroPad = /<div className="relative z-10 p-5 lg:p-6 flex items-start gap-4 lg:gap-5">/.test(prof);
  // Each strip cell's own className is the line before its labelClassName (an icon's className comes earlier).
  const stats = [...prof.matchAll(/^\s*className="([^"]*)"\s*\n\s*labelClassName=/gm)].map((m) => m[1]);
  const merged = stats.map((c) => cn("px-4 py-3.5", c)); // the Stat box `pad` merged with each call site's class
  const edge = (cls: string[]) => cls.length === 3 && cls.every((c) => /(^| )px-5( |$)/.test(c) && /(^| )lg:px-6( |$)/.test(c) && !/(^| )px-4( |$)/.test(c));
  ok("5.1 · /profile: the stat strip's three cells pad like the hero (24px, 32px from 1024) — px-4 merged away", heroPad && edge(merged), merged.join(" | "));
  ok("5.1′ PLANT · a cell left on the Stat box's px-4 is reported", !edge(merged.map((c, i) => (i === 1 ? c.replace("px-5", "px-4") : c))));
  ok("5.1.locate · the scale's 5 and 6 are 24 and 32, and --sp-6 and --sp-8 agree", twStep("5") === 24 && twStep("6") === 32 && px("--sp-6") === 24 && px("--sp-8") === 32);

  const rg = read("src/app/profile/responsible-gambling/page.tsx");
  const card = /<section className="flex items-start gap-3\.5 rounded-xl border border-success-border bg-success\/\[0\.08\] ([^"]+)">\s*<RgSunriseArt size=\{44\} className="-ml-([0-9.]+) shrink-0 text-success-fg" \/>/.exec(rg);
  // The art's first ink, from its own geometry: the leftmost line end less half the round-capped stroke, at 44 of 56.
  const art = raw("src/components/rg/self-care-art.tsx");
  const stroke = Number(/strokeWidth=\{([0-9.]+)\}/.exec(art)?.[1] ?? NaN);
  const xs = [...art.matchAll(/<line x1="([0-9.]+)" y1="[0-9.]+" x2="([0-9.]+)"/g)].flatMap((m) => [Number(m[1]), Number(m[2])]);
  const inkLeft = (Math.min(...xs) - stroke / 2) * 44 / 56;
  // The step back is the inset's whole pixels (a fractional margin is snapped with the svg's box), so the ink's first,
  // partly covered pixel is the column's edge pixel — x41 at 390, x165 at 1280.
  const stepBack = twStep(card?.[2] ?? "");
  ok("5.2 · RG: the help card pads sideways like the hero (px-5 lg:px-6) and its art steps back by the whole pixels of its own ink inset (4 of 4.75)",
    !!card && /(^| )px-5( |$)/.test(card[1]) && /(^| )lg:px-6( |$)/.test(card[1]) && stepBack === Math.floor(inkLeft) && inkLeft - stepBack < 1,
    `${card?.[1]} · -ml-${card?.[2]} = ${stepBack}px vs ink ${inkLeft.toFixed(3)}`);
  ok("5.2′ CONTROL · the card keeps its height: its block padding is unchanged (py-4 lg:py-5, round 3's p-4 lg:p-5)", !!card && /(^| )py-4( |$)/.test(card[1]) && /(^| )lg:py-5( |$)/.test(card[1]));
  ok("5.3 · RG: the sound-and-touch card pads p-5 lg:p-6 like every card in the column", /<section className="rounded-xl border border-border bg-bg-elevated p-5 lg:p-6">/.test(read("src/components/settings/feedback-settings.tsx"))
    && /<FeedbackSettings \/>/.test(rg) && /contentClassName = "relative z-10 p-5 lg:p-6"/.test(read("src/components/ui/page-hero.tsx")));
  const banner = read("src/components/ui/coming-soon-banner.tsx");
  const bannerCls = /<Callout role="status" size="md" surface="panel" tone=\{tone\} glyph=\{glyph\} className="([^"]+)">/.exec(banner)?.[1] ?? "";
  const bannerMerged = cn("flex items-start border", "gap-3 rounded-xl px-4 py-3.5", bannerCls);
  ok("5.4 · /proposals: the notice's inline inset is the hero's (px-5 lg:px-6 over the Callout's px-4), its block inset unchanged",
    /(^| )px-5( |$)/.test(bannerMerged) && /(^| )lg:px-6( |$)/.test(bannerMerged) && /(^| )py-3\.5( |$)/.test(bannerMerged) && !/(^| )px-4( |$)/.test(bannerMerged)
      && /contentClassName="relative z-10 p-5 lg:p-6 /.test(read("src/app/proposals/page.tsx")), bannerMerged);
  ok("5.4′ PLANT · round 3's uniform p-3.5 is reported", !/(^| )px-5( |$)/.test(cn("flex items-start border", "gap-3 rounded-xl px-4 py-3.5", "p-3.5")));
}

/* ══ §6 · /profile's GUTTER ══════════════════════════════════════════════════════════════════════════════════════ */
section("6 · /profile's settings cards are 16px apart, the hub's gutter (tile 188)");
{
  const prof = read("src/app/profile/page.tsx");
  const gapKey = /<div className="grid grid-cols-1 gap-([0-9.]+) md:grid-cols-2">/.exec(prof)?.[1] ?? "";
  const hubGap = /gap:\s*var\((--sp-\d+)\)/.exec(rule(CSS, ".kp-hub__grid"))?.[1] ?? "";
  ok("6.1 · the settings grid's gap equals the hub's card gutter (16px)", twStep(gapKey) === px(hubGap) && px(hubGap) === 16, `gap-${gapKey} = ${twStep(gapKey)} · hub ${hubGap} = ${px(hubGap)}`);
  ok("6.1′ CONTROL · round 3's gap-2 is 12px, which is what this reports", twStep("2") === 12 && twStep("2") !== px(hubGap));
}

/* ══ §7 · /fairness' NUMERALS ════════════════════════════════════════════════════════════════════════════════════ */
section("7 · /fairness' step numerals stand on the card's content edge (tile 190)");
{
  const fair = read("src/app/fairness/page.tsx");
  const list = /<ol role="list" className="fairness-steps [^"]*">/.test(fair) && !/list-decimal/.test(fair) && !/marker:/.test(fair);
  ok("7.1 · the steps are `.fairness-steps` (a list by role), no browser marker hanging into the indent", list);
  const li = rule(CSS, ".fairness-steps > li"), before = rule(CSS, ".fairness-steps > li::before");
  ok("7.2 · each numeral is its item's box at left 0, the words indented 24px (round 3's pl-5), bold, in the old marker's gold",
    /counter-reset:\s*fairness-step/.test(rule(CSS, ".fairness-steps")) && /padding-left:\s*var\(--sp-6\)/.test(li) && px("--sp-6") === twStep("5")
      && /position:\s*absolute/.test(before) && /left:\s*0/.test(before) && /content:\s*counter\(fairness-step\) "\."/.test(before) && /font-weight:\s*700/.test(before) && /color:\s*var\(--gold-300\)/.test(before), `${li} | ${before}`);
  // Proportional digits, left-aligned: their ink starts within a few hundredths of a pixel of each other.
  const bold = F("Inter-Bold");
  const lsb = ["1", "2", "3", "4", "5"].map((d) => bold.layout(`${d}.`).glyphs[0].bbox.minX / bold.unitsPerEm * 14);
  ok("7.3 · Inter Bold's 1–5 start their ink within 0.25px of each other at 14px (proportional, not tabular)",
    Math.max(...lsb) - Math.min(...lsb) < 0.25 && !/tabular-nums/.test(before), lsb.map((v) => v.toFixed(2)).join(" "));
  const tab = ["1", "2", "3", "4", "5"].map((d) => bold.layout(`${d}.`, ["tnum"]).glyphs[0].bbox.minX / bold.unitsPerEm * 14);
  ok("7.3′ CONTROL · tabular figures would spread them (a centred narrow 1)", Math.max(...tab) - Math.min(...tab) > Math.max(...lsb) - Math.min(...lsb));
}

/* ══ §8 · THE WALLET'S LINK RING ═════════════════════════════════════════════════════════════════════════════════ */
section("8 · the Wallet's text links wear the house focus ring (tile 154)");
{
  const J = ":root:has(#kp-journey-shell) ";
  const link = rule(CSS, `${J}.kp-wsheet__link`), focus = rule(CSS, `${J}.kp-wsheet__link:focus-visible`), btn = rule(CSS, ".btn:focus-visible");
  const halo = (s: string) => /box-shadow:\s*([^;]+);/.exec(s)?.[1]?.trim();
  const ringed = (l: string, f: string) => /border-radius:\s*var\(--r-sm\)/.test(l) && /padding-inline:\s*var\(--sp-1\)/.test(l) && /margin-inline:\s*calc\(-1 \* var\(--sp-1\)\)/.test(l)
    && !!halo(f) && halo(f) === halo(btn);
  ok("8.1 · in the journey's Wallet: rounded, padded 4px each side and given back by a negative margin (no word moves), with the button ring's halo",
    ringed(link, focus), `${link} | ${focus}`);
  ok("8.2 · the outline is still the catch-all's 2px --brand-500 at offset 2 (the capture's focus probe asks for 2px)",
    !/outline/.test(link) && !/outline/.test(focus) && /:where\(a, button, input, select, textarea, summary, \[tabindex\]:not\(\[tabindex="-1"\]\)\):focus-visible\s*\{\s*outline:\s*2px solid var\(--brand-500\);\s*outline-offset:\s*2px;/.test(CSS)
      && /a\.kp-wsheet__link\[href='\/profile\/responsible-gambling'\]`, offset: '2px'/.test(raw("scripts/qa-journey-shell.mjs")));
  ok("8.2′ PLANT · a square ring (the radius dropped) is reported", !ringed(link.replace("border-radius: var(--r-sm);", ""), focus));
  const classic = rule(CSS, ".kp-wsheet__link");
  ok("8.3 CONTROL · the classic capsule's Wallet (the same sheet, classic chrome frozen) keeps its link rule untouched — no radius, padding or margin",
    /min-height:\s*var\(--h-control-md\)/.test(classic) && !/border-radius|padding-inline|margin-inline/.test(classic) && !rule(CSS, ".kp-wsheet__link:focus-visible"), classic);
}

/* ══ §9 · <Stat> HINTS ═══════════════════════════════════════════════════════════════════════════════════════════ */
section("9 · a <Stat> hint is balanced (tile 197)");
{
  const stat = read("src/components/ui/stat.tsx");
  const hint = /<p className=\{cn\("([^"]+)", sz\.hint\)\}>\{hint\}<\/p>/.exec(stat)?.[1] ?? "";
  ok("9.1 · the hint line is text-balance and keeps its 13px rung and its ink", /(^| )text-balance( |$)/.test(hint) && /(^| )text-text-subtle( |$)/.test(cn(hint, "text-body-sm")) && /(^| )text-balance( |$)/.test(cn(hint, "text-body-sm")), hint);
  ok("9.1′ CONTROL · cn keeps text-balance beside a colour and a size (tailwind-merge's text-wrap group, not a colour)",
    cn("text-text-subtle text-balance", "text-body-sm").split(" ").length === 3);
}

/* ══ §10 · A YEAR KEEPS ITS WORD ═════════════════════════════════════════════════════════════════════════════════ */
section("10 · a year keeps the word before it in the legal version line (tile 210)");
{
  const legal = read("src/app/legal/_components.tsx");
  ok("10.1 · the legal header draws its meta line with DotSeq, mono, keeping years", /<DotSeq text=\{meta\} mono renderPart=\{keepYears\} \/>/.test(legal));
  const privacy = raw("src/app/legal/privacy/page.tsx");
  const meta = (l: string) => new RegExp(`${l}: "([^"]+)"`).exec(privacy.slice(privacy.indexOf("const META")))?.[1] ?? "";
  const out = html(h(DotSeq, { text: meta("sw"), mono: true, renderPart: keepYears }));
  ok("10.2 · sw: \"…Protection <Act 2022> na kanuni…\" — the year with the Act's name, the date and the words unchanged",
    out.includes(`Protection <span class="whitespace-nowrap">Act 2022</span> na kanuni`) && out.includes("Toleo 2026-10-07</span>") && out.replace(/<[^>]+>/g, "") === meta("sw"), out);
  const zhOut = html(h("p", null, keepYears(meta("zh"))));
  ok("10.3 · zh keeps \"Act 2022\" too (a Latin name inside Chinese)", zhOut.includes(`<span class="whitespace-nowrap">Act 2022</span>`), zhOut);
  ok("10.3′ CONTROL · a date, a five-digit number and \"Cap 423\" are not years",
    keepYears("Toleo 2026-10-07") === "Toleo 2026-10-07" && keepYears("Agreement 16221.") === "Agreement 16221." && keepYears("AML Act (Cap 423)") === "AML Act (Cap 423)");
}

/* ══ §11 · THE PROVIDER GRID ═════════════════════════════════════════════════════════════════════════════════════ */
section("11 · the payment-provider grid: a short last row shares the row (tile 069)");
{
  const grid = read("src/components/wallet/provider-radio-grid.tsx");
  ok("11.1 · four rails take `kp-provgrid--quarters`, any other count `kp-provgrid--thirds`; no Tailwind column count is left",
    /const cols = providers\.length === 4 \? "kp-provgrid kp-provgrid--quarters" : "kp-provgrid kp-provgrid--thirds";/.test(grid) && /<div className=\{cols\}>/.test(grid) && !/grid-cols-/.test(grid));
  // ⭐ THE STYLESHEET, EVALUATED: each rule's selectors matched against tile i of n (nth-child arithmetic), the
  // winner by specificity then order, then the grid auto-placed row by row — every row must fill its tracks.
  type Rule = { sels: string[]; col: string; order: number };
  const rulesOf = (src: string, order0: number): Rule[] => [...src.matchAll(/([^{}]*kp-provgrid[^{}]*)\{\s*grid-column:\s*([^;]+);\s*\}/g)]
    .map((m, i) => ({ sels: m[1].split(",").map((s) => s.trim()), col: m[2].trim(), order: order0 + i }));
  const nth = (expr: string, k: number) => {
    if (expr === "odd") return k % 2 === 1;
    if (expr === "even") return k % 2 === 0;
    const m = /^(?:(\d*)n)?\s*\+?\s*(\d+)?$/.exec(expr.replace(/\s/g, ""));
    if (!m) return false;
    const a = m[1] === undefined ? 0 : m[1] === "" ? 1 : Number(m[1]), b = Number(m[2] ?? 0);
    return a === 0 ? k === b : (k - b) % a === 0 && (k - b) / a >= 0;
  };
  const matches = (sel: string, cls: string[], i: number, n: number) => {
    const m = /^\.([\w-]+) > (.*)$/.exec(sel);
    if (!m || !cls.includes(m[1])) return null;
    const simple = m[2];
    if (simple === "*") return 1;
    let spec = 1;
    for (const p of simple.matchAll(/:(nth-child|nth-last-child)\(([^)]+)\)|:(last-child)/g)) {
      spec++;
      if (p[3] === "last-child") { if (i !== n) return null; continue; }
      if (!nth(p[2], p[1] === "nth-child" ? i : n - i + 1)) return null;
    }
    return spec;
  };
  const base = rulesOf(CSS.slice(0, CSS.indexOf("@media (min-width: 640px) {\n  .kp-provgrid--thirds")), 0).filter((r) => r.sels.every((s) => s.startsWith(".kp-provgrid >")));
  const sm = rulesOf(mediaBlock(CSS, 640, "kp-provgrid--thirds"), 100);
  const tracks = (rules: string, cls: string) => Number(new RegExp(`\\.${cls} \\{[^}]*grid-template-columns:\\s*repeat\\((\\d+), minmax\\(0, 1fr\\)\\)`).exec(rules)?.[1] ?? NaN);
  const layout = (n: number, cls: string[], rules: Rule[], T: number) => {
    const spans: number[] = [];
    for (let i = 1; i <= n; i++) {
      let best: { spec: number; order: number; col: string } | null = null;
      for (const r of rules) for (const s of r.sels) {
        const spec = matches(s, cls, i, n);
        if (spec !== null && (!best || spec > best.spec || (spec === best.spec && r.order > best.order))) best = { spec, order: r.order, col: r.col };
      }
      const col = best?.col ?? "auto";
      spans.push(col === "1 / -1" ? T : /^span (\d+)$/.test(col) ? Number(/^span (\d+)$/.exec(col)![1]) : 1);
    }
    const rows: number[][] = [[]];
    let used = 0;
    for (const s of spans) { if (used + s > T) { rows.push([]); used = 0; } rows[rows.length - 1].push(s); used += s; }
    return { spans, rows, full: rows.every((r) => r.reduce((a, b) => a + b, 0) === T) };
  };
  const T2 = tracks(CSS, "kp-provgrid"), T6 = tracks(mediaBlock(CSS, 640, "kp-provgrid--thirds"), "kp-provgrid--thirds");
  const T4 = tracks(mediaBlock(CSS, 768, "kp-provgrid--quarters"), "kp-provgrid--quarters");
  ok("11.locate · two tracks on a phone, six from 640 for thirds, four from 768 for quarters, 12px apart",
    T2 === 2 && T6 === 6 && T4 === 4 && /gap:\s*var\(--sp-3\)/.test(rule(CSS, ".kp-provgrid")) && px("--sp-3") === 12, `${T2} ${T6} ${T4}`);
  const phone = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => layout(n, ["kp-provgrid", "kp-provgrid--thirds"], base, T2));
  const thirds = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => layout(n, ["kp-provgrid", "kp-provgrid--thirds"], [...base, ...sm], T6));
  ok("11.2 · on a phone every row is full for 1–8 tiles (a lone last tile spans both columns)", phone.every((l) => l.full), JSON.stringify(phone.map((l) => l.rows)));
  ok("11.3 · from 640 every row is full for 1–8 tiles: rows of three; a last row of two takes three tracks each, of one the row",
    thirds.every((l) => l.full) && JSON.stringify(thirds[4].rows) === "[[2,2,2],[3,3]]" && JSON.stringify(thirds[3].rows) === "[[2,2,2],[6]]" && JSON.stringify(thirds[2].rows) === "[[2,2,2]]",
    JSON.stringify(thirds.map((l) => l.rows)));
  const four = layout(4, ["kp-provgrid", "kp-provgrid--quarters"], base, T4);
  ok("11.4 · withdraw's four rails: 2 × 2 on a phone and one row of four from 768", layout(4, ["kp-provgrid", "kp-provgrid--quarters"], base, T2).full && four.full && four.rows.length === 1);
  const r3 = layout(5, ["kp-provgrid"], [], 3);
  ok("11.4′ PLANT · round 3's three plain columns with five tiles leave a short row (the empty third cell)", !r3.full, JSON.stringify(r3.rows));
  const broken = layout(5, ["kp-provgrid", "kp-provgrid--thirds"], [...base, ...sm.filter((r) => !r.sels.some((s) => s.includes(":nth-child(3n+2):last-child")))], T6);
  ok("11.4″ PLANT · the last-row-of-two rule dropped is reported (Card back in a two-track cell)", !broken.full, JSON.stringify(broken.rows));
}

/* ══ §12 · THE JOURNEY CAPSULE ═══════════════════════════════════════════════════════════════════════════════════ */
section("12 · the journey capsule centres caption and figure in the box D31 reserves (tiles 072 074 076)");
{
  const col = rule(CSS, ".kp-jbal__col"), fig = rule(CSS, ".kp-jbal__fig"), delta = rule(CSS, ".kp-jbal__delta");
  ok("12.1 · the caption column, the figure's box and the delta's row all centre", /align-items:\s*center/.test(col) && /justify-items:\s*center/.test(fig) && /text-align:\s*center/.test(delta), `${col} | ${fig} | ${delta}`);
  const pill = read("src/components/layout/wallet-balance-pill.tsx");
  ok("12.2 · D31 is untouched: the box is still the wider of the target figure and the mask, three cells in one",
    pill.includes('<span aria-hidden className="kp-jbal__sizer">{figure}</span>') && pill.includes('<span aria-hidden className="kp-jbal__sizer">{BALANCE_MASK}</span>')
      && /\.kp-jbal__fig > span \{ grid-area: 1 \/ 1; \}/.test(CSS) && /const BALANCE_MASK = "TZS •••••";/.test(pill));
  // The insets, from the mono face's advance: 12px below 360, the capsule's 10px padding.
  const adv = width(mono, "0", 12);
  const boxW = Math.max(width(mono, "TZS 0", 12), width(mono, "TZS •••••", 12));
  const insets = (justify: "center" | "end", s: string) => { const slack = boxW - width(mono, s, 12); return justify === "center" ? [10 + slack / 2, 10 + slack / 2] : [10 + slack, 10]; };
  const now = insets("center", "TZS 0"), was = insets("end", "TZS 0");
  ok("12.3 · \"TZS 0\" at 320 stands 24.4px from each side of the capsule (it stood 38.8 and 10)",
    Math.abs(now[0] - now[1]) < 0.01 && Math.abs(was[0] - 38.8) < 0.5 && Math.abs(adv - 7.2) < 0.01, `now ${now.map((v) => v.toFixed(1))} · was ${was.map((v) => v.toFixed(1))}`);
  ok("12.3′ PLANT · flush-right put back is reported (the slack all on one side)", !/justify-items:\s*center/.test(fig.replace("justify-items: center", "justify-items: end")) && Math.abs(was[0] - was[1]) > 20);
  ok("12.4 · journey-only: the captioned capsule is the only wearer of these classes",
    !/kp-jbal__(col|fig|cap)/.test(pill.slice(0, pill.indexOf("export function WalletBalanceCaptioned"))));
}

console.log(`\nvisual-pass-r4e: ${pass} passed, ${fails.length} failed\n`);
if (fails.length) {
  for (const f of fails) console.error(`  · ${f}`);
  process.exit(1);
}
