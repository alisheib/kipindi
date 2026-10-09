/**
 * ROUND 3 OF THE VISUAL PASS, HELPER C (2026-10-09) — every fix a later edit could silently undo, held, each beside a
 * control or a plant that proves the check can fail.
 *
 *   npx tsx scripts/visual-pass-r3c.test.mts        (npm run test:visual-pass-r3c)
 *
 * The owner's rule (Ali, 2026-10-08): only perfect visual and logical results. Each section names the tiles the defect
 * was measured on (S/visual/tiles-m) and the file that fixes it; the measurements themselves are in those files' notes.
 *   §1 widows: the last two words break together (`keepLastWords`), the card-size hint under the whole row, balanced leads
 *   §2 the empty state: a YES/NO pair on one line; each drawing's box starts at its ink (centred content)
 *   §3 a filter strip has room for a selected pill's halo
 *   §4 /leaderboard: the tier is not gold; the sort row keeps the page's 32px rhythm; right-aligned heads end on the column
 *   §5 the hub's Needle row is one of the hub's rows
 *   §6 the guest tickets sheet's title stands on the ×'s line
 *   §7 Chinese is never slanted
 *   §8 notifications: no "..", no raw position id in a sentence — the id rides the link to the ticket
 *   §9 a "A · B" line breaks between its parts and its dot never ends a line (`DotSeq`)
 *   §10 the capture waits for the unread sign it shoots, and its pointer leaves what it pressed
 */
import { readFileSync } from "node:fs";
import { decomment, decommentCss } from "./lib/decomment.mts";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { keepLastWords } from "../src/components/ui/keep-words.tsx";
import { DotSeq } from "../src/components/ui/dot-seq.tsx";
import { emptyStateBody, emptyStateRanges } from "../src/components/ui/empty-state-text.ts";
import { runAndDashRanges } from "../src/components/ui/keep-run.tsx";
import { endClause, readableNotificationBody, roundTicketHref, ticketHref } from "../src/lib/notification-text.ts";
import { QUERY_BAR_ROW2_CLASS } from "../src/components/ui/query-bar.tsx";
import { cn } from "../src/lib/utils.ts";
import { dict as DICTS } from "../src/lib/i18n-dict.ts";
import { createRequire } from "node:module";

let pass = 0;
const fails: string[] = [];
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};
const section = (s: string) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 100 - s.length))}`);
const read = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
/** Comments out, so a rule quoted in a note is never mistaken for the rule. */
// Source and the stylesheet are read through the shared scanners (scripts/lib/decomment.mts) — test:decomment's
// private-stripper ratchet; decommentCss for CSS, whose strings and urls a JS scanner must not judge.
const code = decomment;
const css = decommentCss(read("src/app/globals.css"));
const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);
const NBSP = String.fromCharCode(0x00a0);

/** One rule's declarations, by its exact selector at the start of a line (comments already out). */
function rule(src: string, selector: string): string {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // The selector alone, or one member of a selector list (".kp-seq__dot, .mcardp-src__dot {" — round 3's merge put the
  // featured card's meta line on the same rules): never a longer selector that merely starts with it.
  const m = new RegExp(`(?:^|\\n)\\s*(?:[^{}\\n]*,\\s*)?${esc}(?![\\w-])\\s*(?:,[^{}\\n]*)?\\{([^}]*)\\}`).exec(src);
  return m ? m[1] : "";
}
/** The CSS custom properties of :root, resolved to px where they are px. */
const ROOT_PX: Record<string, number> = {};
for (const m of read("src/app/globals.css").matchAll(/(--(?:sp|type)-[a-z0-9-]+):\s*([0-9.]+)px/g)) ROOT_PX[m[1]] ??= Number(m[2]);
const px = (v: string) => (ROOT_PX[v] ?? NaN);

/* ══ §1 · WIDOWS ═════════════════════════════════════════════════════════════════════════════════════════════════════ */
section("1 · a short sentence never ends on one word alone");
{
  const sw = DICTS.sw, en = DICTS.en, zh = DICTS.zh;
  const hint = html(h("p", null, keepLastWords(sw.nav.cardSpacingHint)));
  ok("1.1 · keepLastWords holds the last two words in one nowrap span: \"Kwa simu tu. <Hakuna kinachofichwa.>\"",
    hint === `<p>Kwa simu tu. <span class="whitespace-nowrap">Hakuna kinachofichwa.</span></p>`, hint);
  ok("1.2 · …and leaves Chinese, and a text of two words or fewer, exactly as written",
    keepLastWords(zh.nav.cardSpacingHint) === zh.nav.cardSpacingHint && keepLastWords("Wafanyakazi tu") === "Wafanyakazi tu" && keepLastWords("x") === "x");
  ok("1.2′ CONTROL · the text itself is unchanged — the span only removes the one break before the last word",
    html(h("p", null, keepLastWords(sw.kycGate.frozenBody))).replace(/<[^>]+>/g, "") === sw.kycGate.frozenBody);

  // Call sites: each widow the tiles found is now held.
  const cardRow = read("src/components/journey/account/card-size-row.tsx");
  const wallet = read("src/components/layout/wallet-sheet.tsx");
  const fair = read("src/app/fairness/page.tsx");
  // ⚠️ ROUND 4 (2026-10-09, tile 259) moved the card-size hint back into the text column, so the row is an ordinary
  // two-line hub row (its switch on the row's centre, 56px where the hint fits), and keeps the hint's SENTENCES whole —
  // the widow this section was written for cannot return. The row's geometry is test:visual-pass-r4e §1.
  ok("1.3 · the hub's card-size hint (tiles 124 127 256 264 294 295 298 302 306 331) never leaves a word alone: its sentences are kept whole",
    cardRow.includes("{keepSentences(t.nav.cardSpacingHint)}") && /<span id=\{hintId\} className="kp-hub__sub">/.test(cardRow)
      && /className="kp-hub__row"/.test(cardRow));
  ok("1.4 · the held Wallet's notice (tile 092) keeps its last two words together", wallet.includes("{keepLastWords(t.kycGate.frozenBody)}"));
  ok("1.5 · the fairness lead (tiles 187 204) keeps its last two words together", /\{keepLastWords\(fill\(t\.common\.fairnessIntro/.test(fair));

  // The round-3 grid is gone (round 4): no rule hangs the hint under the switch's column any more.
  ok("1.6 · no .kp-hub__row--switch grid remains — the switch no longer sits on the label's line (round 4, tile 259)",
    !/\.kp-hub__row--switch/.test(css) && !/kp-hub__row--switch|kp-hub__row-hint/.test(cardRow));
  ok("1.6′ PLANT · the round-3 grid rule put back is reported", /\.kp-hub__row--switch/.test(`${css}\n.kp-hub__row--switch { display: grid; }`));

  // ⭐ THE WIDTH MODEL — the repo's own Inter (src/lib/server/reports/fonts), advances with kerning, as G3 measured (within
  // ~1% of the tiles). Round 4: the hint keeps to the text column beside the switch — viewport − 2×16 gutter − 2×1 card
  // border − 2×16 row padding − 20 glyph − 12 gap − 12 gap − 44 switch = viewport − 154: 166 at 320, 206 at 360, 236 at 390.
  const fontkit = createRequire(import.meta.url)("fontkit") as { openSync: (p: string) => { layout: (s: string) => { positions: { xAdvance: number }[] }; unitsPerEm: number } };
  const inter = fontkit.openSync("src/lib/server/reports/fonts/Inter-Regular.ttf");
  const width = (s: string, size: number) => inter.layout(s).positions.reduce((a, p) => a + p.xAdvance, 0) / inter.unitsPerEm * size;
  const rowPad = rule(css, ".kp-hub__row");
  ok("1.7.locate · the hub row's padding and gap are the ones the model assumes (8/16px, 12px gap) and the sub-line is 13px",
    /padding:\s*var\(--sp-2\) var\(--sp-4\)/.test(rowPad) && /gap:\s*var\(--sp-3\)/.test(rowPad) && px("--type-small") === 13, rowPad);
  const line = (vw: number) => vw - 154;
  ok("1.7 · the hint is ONE line from 360 in en (≤ 206px) and zh (14 ideographs at 1em), from 390 in sw (≤ 236)",
    width(en.nav.cardSpacingHint, 13) <= line(360) && [...zh.nav.cardSpacingHint].length * 13 <= line(360) && width(sw.nav.cardSpacingHint, 13) <= line(390),
    `sw ${width(sw.nav.cardSpacingHint, 13).toFixed(1)} en ${width(en.nav.cardSpacingHint, 13).toFixed(1)} vs ${line(360)} / ${line(390)}`);
  ok("1.8 · where it wraps (sw below 390, every language at 320) each sentence fits its line, so it breaks between them: \"Kwa simu tu.\" / \"Hakuna kinachofichwa.\"",
    width("Hakuna kinachofichwa.", 13) <= line(320) && width("Nothing is hidden.", 13) <= line(320) && width(sw.nav.cardSpacingHint, 13) > line(360),
    `${width("Hakuna kinachofichwa.", 13).toFixed(1)} vs ${line(320)}`);
  ok("1.8′ CONTROL · beside the value AND the switch (round 2's 113px at 320) the same sentence could not hold a line at 320",
    width("Hakuna kinachofichwa.", 13) > 113);

  // The two leads on /profile/responsible-gambling (tile 179) are balanced.
  const rg = read("src/app/profile/responsible-gambling/page.tsx");
  ok("1.9 · the RG lead and the support line are text-balance (\"…pumzika au\" / \"jizuie.\" and \"…kupitia\" / \"begambleaware.org.\")",
    /max-w-prose text-balance">\s*\{t\.rg\.pageDescription\}/.test(rg) && /text-body-sm text-text-muted leading-snug text-balance">[\s\S]{0,200}\{t\.rg\.intlSupport\}/.test(rg));
}

/* ══ §2 · THE EMPTY STATE ════════════════════════════════════════════════════════════════════════════════════════════ */
section("2 · the empty state: a YES/NO pair on one line, and content centred in its box");
{
  // Every dictionary sentence that writes an all-caps pair joined by au/or is bound — found, not listed.
  const PAIR = /\b([A-Z]{2,}) (au|or) ([A-Z]{2,})\b/;
  const found: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === "string") { if (PAIR.test(v)) found.push(v); }
    else if (v && typeof v === "object") for (const x of Object.values(v)) walk(x);
  };
  walk(DICTS.sw); walk(DICTS.en);
  ok("2.locate · the dictionary has YES/NO pairs to hold (the Tiketi zangu empty body among them)",
    found.some((s) => s.includes("NDIO au HAPANA")) && found.some((s) => s.includes("YES or NO")), `${found.length} found`);
  // ⚠️ Pins moved 2026-10-09 (round 5, R5-E, review 3 H4): the pair and the dash are held by nowrap SPANS (`keepRanges`,
  // keep-run.tsx), no longer by no-break spaces and a word joiner inserted into the words — those travelled into a copy,
  // a find-in-page and the accessible text. The same breaks: a held run is what a no-break space held, and nothing more.
  const held = (s: string) => emptyStateRanges(s).map(([a, b]) => s.slice(a, b));
  const unbound = found.filter((s) => !held(s).some((r) => /[A-Z]{2,} (au|or) [A-Z]{2,}/.test(r)));
  ok("2.1 · emptyStateBody holds every pair in one nowrap run (\"NDIO au HAPANA\", \"YES or NO\")", unbound.length === 0, unbound.join(" | "));
  const body = renderToStaticMarkup(h("p", null, emptyStateBody("Chagua swali, bonyeza NDIO au HAPANA — tiketi")));
  ok("2.2 · …and keeps G3's dash rule: the dash is held to the word before it, in the same run — and no character is added",
    body === `<p>Chagua swali, bonyeza <span class="whitespace-nowrap">NDIO au HAPANA —</span> tiketi</p>` && !body.includes(NBSP), body);
  ok("2.3 CONTROL · lower-case \"au\"/\"or\" and Chinese are left to break as before",
    emptyStateRanges("Juu au Chini, ndio au hapana").length === 0 && emptyStateRanges("按 是 或 否").length === 0);
  ok("2.3′ PLANT · the dash rule alone does not hold the pair — the pair rule is what does",
    !runAndDashRanges("bonyeza NDIO au HAPANA — tiketi").some(([a, b]) => "bonyeza NDIO au HAPANA — tiketi".slice(a, b).includes("NDIO au")));
  const es = read("src/components/ui/empty-state.tsx");
  // ⚠️ Pin moved 2026-10-09 (round 4, R4-K, E50) to `{hangCjkMarks(emptyStateBody(body))}`, and again in round 5 (R5-E,
  // H4): `emptyStateBody` now draws the spans and hangs each part's marks itself, so the call is `{emptyStateBody(body)}`.
  ok("2.4 · EmptyState renders its body through emptyStateBody", es.includes("{emptyStateBody(body)}") && !/function dashOnItsWord/.test(es));

  // ⭐ EACH DRAWING'S INK TOP, COMPUTED FROM ITS OWN GEOMETRY, IS ITS ROW IN INK_TOP (floor), AND EACH SVG USES ITS ROW.
  const inkTop = INK_TOP_OF(es);
  const table = Object.fromEntries([...(/const INK_TOP[^=]*=\s*\{([\s\S]*?)\};/.exec(code(es))?.[1] ?? "").matchAll(/(\w+):\s*(\d+)/g)].map((m) => [m[1], Number(m[2])]));
  const kinds = Object.keys(inkTop);
  ok("2.5.locate · twelve drawings were read and measured", kinds.length === 12, kinds.join(","));
  const wrong = kinds.filter((k) => table[k] !== Math.floor(inkTop[k] + 1e-9)).map((k) => `${k}: table ${table[k]} vs ink ${inkTop[k].toFixed(2)}`);
  ok("2.5 · every INK_TOP row is its drawing's first ink row (the topmost stroke, less half the 1.5px stroke, rounded down)", wrong.length === 0, wrong.join(" · "));
  const framed = kinds.filter((k) => !new RegExp(`case "${k}":[\\s\\S]{0,40}<svg \\{\\.\\.\\.frame\\(INK_TOP\\.${k}\\)\\}`).test(es) && !(k === "default" && /default:[\s\S]{0,40}<svg \{\.\.\.frame\(INK_TOP\.default\)\}/.test(es)));
  ok("2.6 · every drawing's svg takes its frame from its own row, and none is a full 56px square any more",
    framed.length === 0 && !/viewBox="0 0 56 56"/.test(es), framed.join(","));
  ok("2.7 · frame() starts the viewBox at the row, keeps the 56-unit width, and shortens the svg by the same amount",
    /viewBox:\s*`0 \$\{top\} 56 \$\{56 - top\}`, width: 56, height: 56 - top/.test(es));
  const plant = es.replace("audit: 7,", "audit: 8,");
  const plantTable = Object.fromEntries([...(/const INK_TOP[^=]*=\s*\{([\s\S]*?)\};/.exec(code(plant))?.[1] ?? "").matchAll(/(\w+):\s*(\d+)/g)].map((m) => [m[1], Number(m[2])]));
  ok("2.5′ PLANT · a row one unit too deep (audit 8, which would clip its top stroke) is reported", plantTable.audit !== Math.floor(inkTop.audit));
  // The box itself: 48px each side, which is what makes "ink 48px under the border" the centre.
  const box = read("src/components/ui/empty-state-classes.ts");
  ok("2.8 · the box's padding is still 48px top and bottom (py-8 on the overridden scale), the button's 48px under its ink",
    /EMPTY_STATE_BOX =\s*\n?\s*"[^"]*\bpy-8\b/.test(box) && /"8":\s*"48px"/.test(read("tailwind.config.ts")));
}

/** Each DefaultIllustration case's ink top, in svg units, from its lines, rects, circles, ellipses and paths. */
function INK_TOP_OF(src: string): Record<string, number> {
  const body = src.slice(src.indexOf("function DefaultIllustration"), src.indexOf("function ErrorMark"));
  const parts = body.split(/\n\s*(?=case "\w+":|default:)/).slice(1);
  const out: Record<string, number> = {};
  const num = (s: string, a: string) => Number(new RegExp(`\\b${a}="([-0-9.]+)"`).exec(s)?.[1] ?? NaN);
  for (const part of parts) {
    const kind = /^case "(\w+)":/.exec(part)?.[1] ?? (part.startsWith("default:") ? "default" : "");
    if (!kind) continue;
    let top = Infinity;
    for (const el of part.matchAll(/<(line|rect|circle|ellipse|path)\b([^>]*?)\/?>/g)) {
      const [, tag, a] = el;
      const half = /stroke="none"/.test(a) ? 0 : 0.75;
      if (tag === "line") top = Math.min(top, Math.min(num(a, "y1"), num(a, "y2")) - half);
      if (tag === "rect") top = Math.min(top, num(a, "y") - half);
      if (tag === "circle") top = Math.min(top, num(a, "cy") - num(a, "r") - half);
      if (tag === "ellipse") top = Math.min(top, num(a, "cy") - num(a, "ry") - half);
      if (tag === "path") top = Math.min(top, pathTop(/\bd="([^"]+)"/.exec(a)?.[1] ?? "") - half);
    }
    out[kind] = top;
  }
  return out;
}
/** The smallest y a path reaches: vertices, quadratic extremes and sampled arcs (M L H V Q A, absolute or relative, Z). */
function pathTop(d: string): number {
  const toks = d.match(/[a-zA-Z]|-?[0-9]*\.?[0-9]+/g) ?? [];
  let i = 0, x = 0, y = 0, sx = 0, sy = 0, cmd = "", top = Infinity;
  const n = () => Number(toks[i++]);
  const see = (yy: number) => { top = Math.min(top, yy); };
  while (i < toks.length) {
    if (/[a-zA-Z]/.test(toks[i])) cmd = toks[i++];
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    if (C === "Z") { x = sx; y = sy; continue; }
    if (C === "M" || C === "L") { const nx = n() + (rel ? x : 0), ny = n() + (rel ? y : 0); x = nx; y = ny; if (C === "M") { sx = x; sy = y; } see(y); continue; }
    if (C === "H") { x = n() + (rel ? x : 0); see(y); continue; }
    if (C === "V") { y = n() + (rel ? y : 0); see(y); continue; }
    if (C === "Q") {
      const cx = n() + (rel ? x : 0), cy = n() + (rel ? y : 0), ex = n() + (rel ? x : 0), ey = n() + (rel ? y : 0);
      const den = y - 2 * cy + ey, t = den === 0 ? -1 : (y - cy) / den;
      if (t > 0 && t < 1) see((1 - t) * (1 - t) * y + 2 * (1 - t) * t * cy + t * t * ey);
      see(ey); x = ex; y = ey; continue;
    }
    if (C === "A") {
      let rx = Math.abs(n()), ry = Math.abs(n()); const phi = (n() * Math.PI) / 180; const large = n(), sweep = n();
      const ex = n() + (rel ? x : 0), ey = n() + (rel ? y : 0);
      // SVG's endpoint-to-centre conversion (implementation notes F.6.5), then sampled.
      const dx2 = (x - ex) / 2, dy2 = (y - ey) / 2;
      const x1 = Math.cos(phi) * dx2 + Math.sin(phi) * dy2, y1 = -Math.sin(phi) * dx2 + Math.cos(phi) * dy2;
      const lam = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
      if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
      const sign = large === sweep ? -1 : 1;
      const co = sign * Math.sqrt(Math.max(0, (rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1) / (rx * rx * y1 * y1 + ry * ry * x1 * x1)));
      const cxp = (co * rx * y1) / ry, cyp = (-co * ry * x1) / rx;
      const cx = Math.cos(phi) * cxp - Math.sin(phi) * cyp + (x + ex) / 2, cy = Math.sin(phi) * cxp + Math.cos(phi) * cyp + (y + ey) / 2;
      const ang = (ux: number, uy: number, vx: number, vy: number) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
      const t1 = ang(1, 0, (x1 - cxp) / rx, (y1 - cyp) / ry);
      let dt = ang((x1 - cxp) / rx, (y1 - cyp) / ry, (-x1 - cxp) / rx, (-y1 - cyp) / ry);
      if (!sweep && dt > 0) dt -= 2 * Math.PI; else if (sweep && dt < 0) dt += 2 * Math.PI;
      for (let k = 0; k <= 64; k++) {
        const t = t1 + (dt * k) / 64;
        see(Math.sin(phi) * rx * Math.cos(t) + Math.cos(phi) * ry * Math.sin(t) + cy);
      }
      x = ex; y = ey; continue;
    }
    i++; // an unknown token is skipped rather than looped on
  }
  return top;
}

/* ══ §3 · THE STRIP'S HALO ═══════════════════════════════════════════════════════════════════════════════════════════ */
section("3 · a filter strip has room for the selected pill's halo (tile 319)");
{
  const block = /@media \(max-width: 1023\.98px\)\s*\{\s*\.kp-strip-fade\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
  const pad = (prop: string) => new RegExp(`${prop}:\\s*var\\((--sp-\\d+)\\)`).exec(block)?.[1];
  const neg = (prop: string) => new RegExp(`${prop}:\\s*calc\\(-1 \\* var\\((--sp-\\d+)\\)\\)`).exec(block)?.[1];
  ok("3.1 · below 1024 the strip pads above, below and before its pills and takes the same back as negative margin",
    !!pad("padding-block") && pad("padding-block") === neg("margin-block") && !!pad("padding-left") && pad("padding-left") === neg("margin-left"), block.trim());
  const glow = /--glow-selected:\s*0 0 ([0-9.]+)px (-?[0-9.]+)px/.exec(read("src/app/globals.css"));
  const reach = glow ? Number(glow[1]) + Number(glow[2]) : NaN;
  const room = px(pad("padding-block") ?? "") ;
  ok("3.2 · the room (12px) is at least the halo's reach (blur + spread = 11px), above, below and before",
    reach <= room && reach <= px(pad("padding-left") ?? ""), `reach ${reach} room ${room}`);
  ok("3.2′ PLANT · a halo grown to 16px of blur would outreach the room and is reported", 16 + Number(glow?.[2] ?? 0) > room);
  ok("3.3 · the trailing side keeps its own room: the strip's pr-2 (12px), and no margin is taken back there",
    /\bpr-2\b/.test(read("src/components/ui/query-bar.tsx")) && !/margin-right/.test(block));
  const start = /\.kp-strip-fade\[data-edges="start"\]\s*\{[^}]*mask-image:\s*linear-gradient\(to right, transparent 12px, #000 44px\)/.test(css);
  const both = /\.kp-strip-fade\[data-edges="both"\]\s*\{[^}]*mask-image:\s*linear-gradient\(to right, transparent 12px, #000 44px,/.test(css);
  ok("3.4 · the leading fade moved in by the same 12px (transparent to 12, opaque from 44): a chip scrolled off the start fades from the content edge, as before",
    start && both && /scroll-padding-inline:\s*44px 72px/.test(css));
  // The trailing ramp (round 3, tile 326): at least 64px, ending 8px inside, in the "end" and "both" masks alike, and the
  // keyboard's end padding covers it. Measured from the mask strings the stylesheet ships.
  const ramps = (src: string) => [...src.matchAll(/#000 calc\(100% - (\d+)px\), transparent calc\(100% - (\d+)px\)/g)]
    .map((m) => ({ ramp: Number(m[1]) - Number(m[2]), inset: Number(m[2]) }));
  const real = ramps(css);
  const endPad = Number(/scroll-padding-inline:\s*44px (\d+)px/.exec(css)?.[1] ?? NaN);
  ok("3.5 · the trailing ramp is at least 64px and ends 8px inside the strip, in every mask that has one (4: end and both, -webkit- and plain), and the keyboard's end padding reaches past it",
    real.length === 4 && real.every((r) => r.ramp >= 64 && r.inset === 8) && endPad >= Math.max(...real.map((r) => r.ramp + r.inset)), JSON.stringify({ real, endPad }));
  const old = ramps(css.split("calc(100% - 72px)").join("calc(100% - 40px)"));
  ok("3.5′ PLANT · G1's 32px ramp put back is reported (it fell wholly on a hidden chip's padding at sw 390, tile 326)",
    old.length === 4 && old.some((r) => r.ramp < 64));
}

/* ══ §4 · /leaderboard ═══════════════════════════════════════════════════════════════════════════════════════════════ */
section("4 · /leaderboard: the tier is not gold, the sort keeps the page's rhythm, a right-aligned head ends on its column");
{
  const lb = read("src/app/leaderboard/page.tsx");
  const ribbon = read("src/components/layout/page-ribbon.tsx");
  ok("4.1 · the top tier stat has no accent (it was \"gold\": \"Fedha\" — silver — in the money ink)",
    /\{ label: t\.leaderboard\.topTier, value: tierDisplayName\([^)]*\) \}/.test(lb) && !/accent:\s*"gold"/.test(code(lb)));
  ok("4.2 · …and the ribbon offers no gold accent to reach for (`test:gold-is-money` holds the file)",
    !/"gold"/.test(code(ribbon)) && !/text-gold/.test(code(ribbon)) && /page-ribbon\.tsx/.test(read("scripts/gold-is-money.test.mts")));
  const row = cn(QUERY_BAR_ROW2_CLASS, "py-0");
  ok("4.3 · the sort row is the bar's row with its padding handed back (py-0): 32px above and below, like every gap on the page",
    lb.includes(`<div className={cn(QUERY_BAR_ROW2_CLASS, "py-0")}>`) && /\bpy-0\b/.test(row) && !/\bp[tb]-/.test(row), row);
  // Round 4 (2026-10-09) moved the bar's row 2 to 12px under row 1 (pt-2, test:visual-pass-r4c §1); the control follows it.
  ok("4.3′ CONTROL · the bar's own row carries 12px over and 10px under (pt-2, pb-2.5) — the 44/42px gaps this removes",
    /(?:^|\s)pt-2(?:\s|$)/.test(QUERY_BAR_ROW2_CLASS) && /\bpb-2\.5\b/.test(QUERY_BAR_ROW2_CLASS));
  const after = rule(css, ".admin-tbl thead th.text-right::after");
  const track = /\.mcardp-pctcap\s*\{\s*letter-spacing:\s*([0-9.]+)em/.exec(css)?.[1];
  const back = /margin-right:\s*-([0-9.]+)em/.exec(after)?.[1];
  ok("4.4 · a right-aligned head takes back the letter-space the eyebrow rule puts after its last letter",
    /content:\s*""/.test(after) && !!track && back === track, `track ${track} back ${back}`);
  ok("4.4.locate · the eyebrow rule's selector list still covers `.admin-tbl thead`", /\.admin-tbl thead,[\s\S]{0,600}?letter-spacing:\s*0\.14em/.test(css));
  ok("4.4′ PLANT · a head tracked 0.12em while the rule takes 0.14 back is reported", "0.12" !== back);
}

/* ══ §5 · THE HUB'S NEEDLE ROW ═══════════════════════════════════════════════════════════════════════════════════════ */
section("5 · the hub's Needle row is one of the hub's rows (tiles 122–130 158 264–275 294 295)");
{
  const hub = read("src/components/journey/account/hub-row.tsx");
  const drawer = read("src/components/layout/needle-drawer.tsx");
  ok("5.1 · the hub asks the drawer for its hub row, in a plain list item", /<li>\s*<NeedleControlsDrawer variant="hub-row" \/>\s*<\/li>/.test(hub));
  const branch = /variant === "hub-row" \? \(([\s\S]*?)\) : \(/.exec(drawer)?.[1] ?? "";
  const ordinary = /<Link href=\{row\.href as never\} className="kp-hub__row">([\s\S]*?)<\/Link>/.exec(hub)?.[1] ?? "";
  const parts = (s: string) => ({
    row: /className="kp-hub__row"/.test(s) || /className="kp-hub__row">/.test(s),
    glyph: /className="kp-hub__glyph" aria-hidden><[A-Za-z.]+ (?:s|size)=\{20\}/.test(s),
    label: /className="kp-hub__label"/.test(s),
    chev: /<I\.chevronRight s=\{18\} className="kp-hub__chev"/.test(s),
  });
  const a = parts(branch), b = parts(`className="kp-hub__row">${ordinary}`);
  ok("5.2 · its row, its 20px glyph slot, its label and its 18px chevron are the ordinary row's", a.row && a.glyph && a.label && a.chev && b.glyph && b.chev, JSON.stringify({ needle: a, ordinary: b }));
  ok("5.3 · its value is the hub's value (not the menu's mono capitals)", /<span className="kp-hub__value">\{shownLabel\}<\/span>/.test(branch));
  ok("5.4 · the padded item and its rules are gone", !/\.kp-hub__needle\b/.test(css) && !/kp-hub__needle/.test(hub));
  ok("5.4′ CONTROL · the account menu keeps its own row (variant menu-row is untouched)", /variant === "menu-row" \?/.test(drawer));
}

/* ══ §6 · THE GUEST SHEET'S TITLE ON THE ×'S LINE ════════════════════════════════════════════════════════════════════ */
section("6 · the guest tickets sheet's title stands on the ×'s line (tiles 113–121 156)");
{
  const modal = read("src/components/ui/modal.tsx");
  const tw = read("tailwind.config.ts");
  const step = (k: string) => Number(new RegExp(`"${k.replace(".", "\\.")}":\\s*"([0-9.]+)px"`).exec(tw)?.[1] ?? NaN);
  // R4-I (2026-10-09): the ✕ is one component, `CloseX` (48px box), which Modal pins `absolute right-3 top-3`.
  const close = /className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center/.test(modal)
    || (/<CloseX onClick=\{onClose\} label=\{t\.common\.close\} className="absolute right-3 top-3" \/>/.test(modal)
      && /className=\{`\$\{className\} inline-flex h-8 w-8 items-center justify-center/.test(modal));
  const xCentre = step("3") + step("8") / 2; // top-3 + half of h-8
  ok("6.locate · the Modal's × is `absolute top-3 h-8` — 16px down, a 48px box — centred 40px under the padding edge", close && xCentre === 40, String(xCentre));
  const title = rule(css, ".kp-jsheet__title");
  const sheet = rule(css, ".kp-wsheet");
  const grab = rule(css, ".kp-wsheet__grab");
  // ⚠️ Round 4 (2026-10-09, tiles 113–121) centres the title's CAPITALS rather than its line box — Sora's cap band sits
  // 0.6em down a 1.25em line, 0.5px above the middle at 20px — so the margin's factor is 0.6, not 1.25 / 2, and the line
  // box stands 0.5px under the ×'s centre. The derivation from the font's metrics is test:visual-pass-r4e §3.
  const mt = /margin:\s*calc\(var\((--sp-\d+)\) - var\((--sp-\d+)\) - var\((--type-h3)\) \* ([0-9.]+)\) 0 0/.exec(title);
  const margin = mt ? px(mt[1]) - px(mt[2]) - px(mt[3]) * Number(mt[4]) : NaN;
  const lh = /line-height:\s*1\.25/.test(title) ? px("--type-h3") * 1.25 : NaN;
  const below1024 = px(/padding:\s*var\((--sp-\d+)\)/.exec(sheet)?.[1] ?? "") + Number(/height:\s*([0-9]+)px/.exec(grab)?.[1]) + px(/gap:\s*var\((--sp-\d+)\)/.exec(sheet)?.[1] ?? "");
  const from1024 = step("6"); // the panel's lg:p-6, the grab hidden
  const centre = (top: number) => top + margin + lh / 2;
  ok("6.1 · below 1024 (12 + 4 + 16 = 32px down) and from 1024 (32px of padding) the title's first line stands on the ×'s 40px (within the 0.5px its capitals ask)",
    Math.abs(centre(below1024) - xCentre) <= 0.5 && Math.abs(centre(from1024) - xCentre) <= 0.5 && Math.abs(centre(below1024) - centre(from1024)) < 0.01 && /p-5 lg:p-6/.test(modal),
    `margin ${margin} · below ${centre(below1024)} · from ${centre(from1024)}`);
  ok("6.1′ PLANT · with no margin the line is centred 44.5px down, 4.5px under the × — reported", Math.abs(below1024 + lh / 2 - xCentre) > 4);
}

/* ══ §7 · CHINESE IS NEVER SLANTED ═══════════════════════════════════════════════════════════════════════════════════ */
section("7 · Chinese is never slanted (tile 275)");
{
  ok("7.1 · a zh page draws no synthesized oblique", /html:lang\(zh\)\s*\{\s*font-synthesis-style:\s*none;\s*\}/.test(css));
  ok("7.1′ CONTROL · the rule has something to do: the footer's stop-gambling line still wears italic",
    /className="italic[^"]*">\{t\.footer\.stopGambling\}/.test(read("src/components/layout/app-shell.tsx")));
  ok("7.2 · the app loads no italic face of its own (so an upright zh page loses nothing)", !/style:\s*\[?"italic"/.test(read("src/app/layout.tsx")));
}

/* ══ §8 · NOTIFICATIONS ══════════════════════════════════════════════════════════════════════════════════════════════ */
section("8 · notifications: never \"..\", and no raw position id in a sentence (tile 192)");
{
  ok("8.1 · endClause ends an officer's reason once: \"settlement.\" + \".\" is one stop; Chinese takes 。; ? and ! keep their mark",
    endClause("before settlement.", ".") === "before settlement." && endClause("before settlement", ".") === "before settlement."
      && endClause("before settlement.", "。") === "before settlement。" && endClause("Why?", ".") === "Why?" && endClause("x.  ", ".") === "x.");
  const tile = "\"Je, S&P 500 itafungwa juu wiki hii?\" limefutwa: Dev fixture — source withdrawn before settlement.. Dau lako lote limerejeshwa kwenye pochi yako. · pos_34d10350dfa7510cfad5";
  const fixed = readableNotificationBody(tile);
  ok("8.2 · a row written before the fix reads without its \"..\" and its \" · pos_…\" (the tile-192 sentence)",
    fixed === "\"Je, S&P 500 itafungwa juu wiki hii?\" limefutwa: Dev fixture — source withdrawn before settlement. Dau lako lote limerejeshwa kwenye pochi yako.", fixed);
  ok("8.3 · …and a win's old label (\"<title> · pos_… kimelipa.\") loses its id too", readableNotificationBody("Je mvua · pos_ab12 kimelipa. Bonyeza kuona.") === "Je mvua kimelipa. Bonyeza kuona.");
  ok("8.4 CONTROL · an ellipsis, a labelled reference and a sentence written today pass through unchanged",
    readableNotificationBody("Subiri...") === "Subiri..." && readableNotificationBody("Reference txn_12.") === "Reference txn_12."
      && readableNotificationBody("Kura batili limebatilishwa. Dau lako limerudishwa.") === "Kura batili limebatilishwa. Dau lako limerudishwa." && readableNotificationBody("已取消：x.。y") === "已取消：x。y");
  ok("8.5 · a position's notice opens its ticket: the market's page at the position's anchor; an orphan, its permalink; none, the given link",
    ticketHref("mkt_1", "pos_a", "/x") === "/markets/mkt_1#pos_a" && ticketHref("", "pos_a", "/x") === "/positions/pos_a" && ticketHref("mkt_1", undefined, "/wallet") === "/wallet");
  ok("8.6 · an Up & Down result opens the round's page at the ticket (where /positions/<id> resolves it)",
    roundTicketHref("/updown/udr_1", "pos_b") === "/updown/udr_1#pos_b" && roundTicketHref("/updown/udr_1", undefined) === "/updown/udr_1");
  const ns = code(read("src/lib/server/notification-service.ts"));
  ok("8.7 · no notice writes a position id into its words any more", !/\$\{ref\}/.test(ns) && !/` · \$\{opts\.positionId\}`/.test(ns));
  // R5-B (round 5, 2026-10-09, F10): a reason may be cut first — `endClause(clipQuote(opts.reason, 120), ".")`, a cut at a word
  // with "…" where `.slice(0, 120)` cut mid-word — and it still ends through `endClause` (which keeps a cut's "…").
  const reasons = [...ns.matchAll(/\$\{(?:endClause\()?(?:clipQuote\()?opts\.reason[^}]*\}[.。]?/g)].map((m) => m[0]);
  const raw = reasons.filter((r) => !r.startsWith("${endClause(") && /[.。]$/.test(r));
  ok("8.8 · every officer reason that a template ends with a stop goes through endClause (cancelled and declined, three languages each)",
    raw.length === 0 && reasons.filter((r) => r.startsWith("${endClause(")).length >= 6, `raw: ${raw.join(" ")}`);
  const ms = code(read("src/lib/server/market-service.ts"));
  ok("8.9 · a win's label is the market's name alone (its link is the position's permalink)",
    /notifyWin\(p\.userId, payout, localizedText\(m\.titleEn, m\.titleSw, m\.titleZh\), positionPermalinkHref\(p\.id\)\)/.test(ms) && !/· \$\{p\.id\}/.test(ms));
  const panel = read("src/components/layout/notifications-panel.tsx");
  const page = read("src/app/notifications/page.tsx");
  ok("8.10 · the bell and /notifications read every body through readableNotificationBody",
    (panel.match(/readableNotificationBody\(/g) ?? []).length >= 3 && /readableNotificationBody\(locale === "sw"/.test(page));
  ok("8.7′ PLANT · the old composition is what 8.7 reports", /\$\{ref\}/.test("bodyEn: `x.${ref}`"));
}

/* ══ §9 · DotSeq ═════════════════════════════════════════════════════════════════════════════════════════════════════ */
section("9 · a line written \"A · B\" breaks only between its parts, and its dot never ends a line (tiles 181 207)");
{
  const two = html(h(DotSeq, { text: "Toleo 2026-10-07 · Imeoanishwa na Tanzania", mono: true }));
  ok("9.1 · two parts, two items, the second carrying its dot hidden from assistive tech, the mono gap asked for",
    two === `<span class="kp-seq kp-seq--mono"><span class="kp-seq__item">Toleo 2026-10-07</span><span class="kp-seq__item"> <span class="kp-seq__dot" aria-hidden="true">·</span> Imeoanishwa na Tanzania</span></span>`
      // …and no word fused to the dot's closing tag — qa:live's own rule (pre-deploy-live-check.mjs spanFusedIn: a </span>
      // whose last character is not a space, followed by a word, inside running text). M7 caught "·</span>Imetolewa".
      && !/\S<\/span>[A-Za-zÀ-ɏ]{2,}/.test(two), two);
  ok("9.2 CONTROL · a line with no \" · \" is one plain span, byte for byte", html(h(DotSeq, { text: "Wafanyakazi tu", className: "kp-hub__sub" })) === `<span class="kp-hub__sub">Wafanyakazi tu</span>`);
  ok("9.3 · the dot hangs in the gap before its part and the box clips its left edge, so a dot that would open a line is not drawn",
    /position:\s*absolute;\s*top:\s*0;\s*right:\s*100%/.test(rule(css, ".kp-seq__dot")) && /clip-path:\s*inset\(-100vmax -100vmax -100vmax 0\)/.test(rule(css, ".kp-seq"))
      && /--seq-gap:\s*3ch/.test(rule(css, ".kp-seq--mono")) && !/kp-hub__seq/.test(css));
  ok("9.4 · the hub's second lines, the legal header's version line and the invite page's call all draw it",
    /<DotSeq text=\{text\} className="kp-hub__sub" \/>/.test(read("src/components/journey/account/hub-row.tsx"))
      && /<DotSeq text=\{meta\} mono(?: renderPart=\{keepYears\})? \/>/.test(read("src/app/legal/_components.tsx"))
      && /<DotSeq text=\{paid \? t\.profile\.inviteEarnSub : t\.profile\.inviteFriendsSub\} \/>/.test(read("src/app/profile/invite/page.tsx")));
  const inv = read("src/app/profile/invite/page.tsx");
  ok("9.5 · on a phone the invite's call takes the card's width under the dial and its caption; from sm the row is as it was",
    /grid grid-cols-\[auto_minmax\(0,1fr\)\] items-center gap-x-4 gap-y-3 sm:flex/.test(inv) && /className="contents sm:block sm:min-w-0 sm:flex-1"/.test(inv)
      && /className="col-span-2 font-display text-\[19px\] font-bold leading-tight text-balance"/.test(inv));
  const sw = DICTS.sw.profile;
  ok("9.5.locate · every invite call is written as two parts, so each reads as two lines at most on a phone",
    [sw.inviteFriendsSub, sw.inviteEarnSub, DICTS.en.profile.inviteFriendsSub, DICTS.zh.profile.inviteFriendsSub].every((s) => s.split(" · ").length === 2));
}

/* ══ §10 · THE CAPTURE ═══════════════════════════════════════════════════════════════════════════════════════════════ */
section("10 · the capture waits for the unread sign it shoots, and its pointer leaves what it pressed");
{
  const drive = read("scripts/qa-journey-shell.mjs");
  ok("10.1 · the demo player's tab and hub tiles wait for the counter mounted at their width (dot below 1024, bell from 1024)",
    /async function unreadLanded\(page, width/.test(drive) && /if \(viewer === 'player'\) await unreadLanded\(page, width\);/.test(drive)
      && /if \(vw\.id === 'player'\) await unreadLanded\(v\.page, width, \{ arifa: true \}\);/.test(drive)
      && /lgUp \? await seen\(BELL_AT_LEAST, 1, UNREAD_WAIT_MS\) : await seen\(DOT_SHOWN, null, UNREAD_WAIT_MS\)/.test(drive));
  ok("10.2 · the wait outlasts one failed read's retry (21–39 s) and asks the once-reading Arifa row to read again",
    /UNREAD_WAIT_MS = 45_000/.test(drive) && /new Event\('50pick:refresh-notifications'\)/.test(drive)
      && /INBOX_CHANGED = "50pick:refresh-notifications"/.test(read("src/lib/journey/unread-count.ts")));
  ok("10.3 · after pressing the hub's Matokeo row the pointer moves off the page's controls (the HAPANA hover fill on tile 326)",
    /a\.kp-hub__row\[href='\/results'\]`\)\.first\(\)\.click[\s\S]{0,600}?page\.mouse\.move\(2,/.test(drive));
}

console.log(`\nvisual-pass-r3c: ${pass} passed, ${fails.length} failed\n`);
if (fails.length) {
  for (const f of fails) console.error(`  · ${f}`);
  process.exit(1);
}
