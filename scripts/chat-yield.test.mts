/**
 * test:chat-yield — AT REST OVER TEXT OR A FIGURE THE CHAT BUBBLE YIELDS: IT FADES, IT NEVER MOVES, IT IS NEVER DISABLED
 * (MASWALI-BUILD S5-FIX-PLATFORM D15, 2026-10-21; the register critic's M5, ruled by the lead the same day — the third
 * ruled classic change, DESIGN_AUTHORITY §M8a item 11).
 *
 *   npx tsx scripts/chat-yield.test.mts     (npm run test:chat-yield)
 *
 *   §1 the token — `--state-yield-opacity` in state-tokens.css, a number between 0 and 1, its meaning written beside
 *      `--state-disabled-opacity` there and in DESIGN_AUTHORITY
 *   §2 the rules — globals.css yields the marked bubble to that token (never the disabled one), BELOW D3 and D75 in the
 *      cascade (their opacity 0 still clears it whole while the page moves and once the reader is idle), never while its
 *      panel is open or a focus is within it, back to 1 under a pointer's hover (inside `@media (hover: hover)`), and
 *      takes no taps away (no `pointer-events`); no move (no `transform`)
 *   §3 the census and its wiring — `fab-census.ts` counts every `.amount` box and every visible line of text under the
 *      bubble's resting rect (its box less the fade's translate, grown by its ring: needle-rest.ts `bubbleInk`), never the
 *      bubble or the Needle; ChatRoot asks it at most once a frame (scroll, resize, a new page, the body's size, the
 *      fonts, and D3/D75 handing the bubble back), never while the bubble is away or open, and writes the mark only when
 *      it changes
 *   §4 PLANTS — each way the rule could quietly not hold is reported
 * The behaviour (the computed opacity over a figure and clear of one, at 320 and 360, the hover, the focus, the tap, and
 * the census switched off) is `qa:chat-yield`; the token's value is its `--measure` table. No server, no browser.
 */
import { readFileSync } from "node:fs";
import { decommentCss } from "./lib/decomment.mts";

let pass = 0;
const fails: string[] = [];
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};
const read = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
const flat = (css: string) => decommentCss(css).replace(/\s+/g, " ");

const TOKENS = read("src/app/state-tokens.css");
const GLOBALS = read("src/app/globals.css");
const ROOT = read("src/components/chat/ChatRoot.tsx");
const CENSUS = read("src/lib/chat/fab-census.ts");
const RULEBOOK = read("docs/DESIGN_AUTHORITY.md");

/** Every style rule with the at-rule preludes it stands inside and its declarations (a small brace walker). */
function rules(css: string): Array<{ selector: string; within: string[]; body: string }> {
  const s = decommentCss(css);
  const out: Array<{ selector: string; within: string[]; body: string }> = [];
  const stack: string[] = [];
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "{") {
      const prelude = s.slice(start, i).trim();
      if (prelude.startsWith("@")) stack.push(prelude.replace(/\s+/g, " "));
      else {
        let depth = 1, k = i + 1;
        for (; k < s.length && depth > 0; k++) { if (s[k] === "{") depth++; else if (s[k] === "}") depth--; }
        out.push({ selector: prelude.replace(/\s+/g, " "), within: [...stack], body: s.slice(i + 1, k - 1).replace(/\s+/g, " ").trim() });
        i = k - 1;
      }
      start = i + 1;
    } else if (c === "}") { stack.pop(); start = i + 1; }
    else if (c === ";" && s.slice(start, i).trim().startsWith("@")) start = i + 1;
  }
  return out;
}
/** Specificity [ids, classes+attributes+pseudo-classes, types] of one simple selector list entry (enough for these). */
function specificity(sel: string): [number, number, number] {
  let ids = 0, cls = 0, types = 0;
  // :not(X) counts as X.
  const inner = sel.replace(/:not\(([^()]*)\)/g, " $1 ");
  ids += (inner.match(/#[\w-]+/g) ?? []).length;
  cls += (inner.match(/\.[\w-]+/g) ?? []).length + (inner.match(/\[[^\]]+\]/g) ?? []).length + (inner.match(/:(?!:)[\w-]+/g) ?? []).length;
  types += (inner.replace(/\[[^\]]+\]/g, "").match(/(^|[\s>+~])[a-z][\w-]*/gi) ?? []).length;
  return [ids, cls, types];
}
const lower = (a: number[], b: number[]) => a[0] < b[0] || (a[0] === b[0] && (a[1] < b[1] || (a[1] === b[1] && a[2] < b[2])));

const YIELD_SEL = ".cm-fab[data-over-content]:not(.cm-fab--open):not(:focus-within)";
const HOVER_SEL = ".cm-fab[data-over-content]:not(.cm-fab--open):hover";
const D3_SEL = "html[data-scrolling] .cm-fab:not(.cm-fab--open):not(:focus-within)";
const D75_SEL = "html[data-fab-idle] .cm-fab:not(.cm-fab--open):not(:focus-within)";

function checkRules(css: string) {
  const all = rules(css);
  const fade = all.filter((r) => r.selector === YIELD_SEL && r.within.length === 0);
  const hover = all.filter((r) => r.selector === HOVER_SEL);
  const marked = all.filter((r) => /\[data-over-content\]/.test(r.selector));
  const d3 = all.find((r) => r.selector === D3_SEL && r.within.length === 0);
  const d75 = all.find((r) => r.selector === D75_SEL && r.within.length === 0);
  return {
    one: fade.length === 1 && fade[0].body === "opacity: var(--state-yield-opacity);",
    neverDisabled: !marked.some((r) => /--state-disabled-opacity/.test(r.body)),
    below: !!d3 && !!d75 && /opacity: 0;/.test(d3.body) && /opacity: 0;/.test(d75.body)
      && lower(specificity(YIELD_SEL), specificity(D3_SEL)) && lower(specificity(YIELD_SEL), specificity(D75_SEL))
      && !marked.some((r) => /!important/.test(r.body)),
    hover: hover.length === 1 && hover[0].within.length === 1 && hover[0].within[0] === "@media (hover: hover)" && hover[0].body === "opacity: 1;"
      && specificity(HOVER_SEL).join() === specificity(YIELD_SEL).join() && all.indexOf(hover[0]) > all.indexOf(fade[0]),
    live: !marked.some((r) => /pointer-events|transform|translate/.test(r.body)),
    marked: marked.map((r) => `${r.selector} {${r.body}} within ${JSON.stringify(r.within)}`),
  };
}

console.log("§1 · the token: floating chrome yielding to the content beneath it — still live, never disabled");
{
  const m = /--state-yield-opacity:\s*([0-9.]+);/.exec(flat(TOKENS));
  const v = m ? Number(m[1]) : NaN;
  ok(`1.1 · state-tokens.css declares --state-yield-opacity as a number between 0 and 1 (${m?.[1]})`, v > 0 && v < 1);
  ok("1.2 · …its meaning written there: yielding, still live, never disabled, measured — not the disabled value",
    /FLOATING CHROME YIELDING TO THE CONTENT BENEATH IT — STILL LIVE, NEVER DISABLED/.test(TOKENS) && /ITS VALUE IS MEASURED/.test(TOKENS)
    && /NOT\s+`--state-disabled-opacity`/.test(TOKENS));
  ok("1.3 · DESIGN_AUTHORITY records the token's meaning beside --state-disabled-opacity, and D15 as the third ruled classic change",
    /`--state-yield-opacity`[^\n]*floating chrome yielding to the content beneath it; still live, never disabled/.test(RULEBOOK)
    && /`--state-disabled-opacity`/.test(RULEBOOK) && /third ruled classic change/i.test(RULEBOOK.replace(/\s+/g, " "))
    && /lead 2026-10-21, the 10\/10 pass/.test(RULEBOOK.replace(/\s+/g, " ")));
}

console.log("\n§2 · the rules: fade only, below D3 and D75, back to 1 under a pointer and a focus, taps kept");
{
  const r = checkRules(GLOBALS);
  ok("2.1 · ONE rule yields the marked bubble to --state-yield-opacity, at the top level, nothing else in it", r.one, r.marked.join(" | "));
  ok("2.2 · no rule for the marked bubble reads --state-disabled-opacity", r.neverDisabled);
  ok("2.3 · it stands BELOW D3 and D75 in the cascade (their opacity 0 still clears it whole), and nothing is !important", r.below);
  ok("2.4 · a pointer's hover brings it back to 1 — inside @media (hover: hover), as specific, later", r.hover);
  ok("2.5 · an open panel and any focus within keep it whole (the yield's own :not()s)", YIELD_SEL.includes(":not(.cm-fab--open)") && YIELD_SEL.includes(":not(:focus-within)") && r.one);
  ok("2.6 · it takes no taps away and moves nothing (no pointer-events, no transform in any marked rule)", r.live, r.marked.join(" | "));
}

console.log("\n§3 · the census and its wiring");
{
  ok("3.1 · fab-census.ts counts every .amount box and every visible line of text (a TreeWalker over text, its parent seen)",
    /document\.querySelectorAll<HTMLElement>\("\.amount"\)/.test(CENSUS) && /createTreeWalker\(document\.body, NodeFilter\.SHOW_ELEMENT \| NodeFilter\.SHOW_TEXT/.test(CENSUS)
    && /range\.getClientRects\(\)/.test(CENSUS) && /if \(seen\(parent\)\) return true;/.test(CENSUS) && /checkVisibility/.test(CENSUS));
  ok("3.2 · …against the RESTING rect: the .cm-bubble box less the fade's translate, grown by its ring (needle-rest.ts bubbleInk)",
    /import \{ bubbleInk, type Box \} from "@\/lib\/needle-rest";/.test(CENSUS) && /fab\.querySelector<HTMLElement>\("\.cm-bubble"\)/.test(CENSUS)
    && /new DOMMatrixReadOnly\(t\)/.test(CENSUS) && /return bubbleInk\(\{ left: r\.left - dx, right: r\.right - dx, top: r\.top - dy, bottom: r\.bottom - dy \}\);/.test(CENSUS));
  ok("3.3 · …never the bubble itself or the Needle", /if \(el === fab \|\| el\.id === NEEDLE_ROOT \|\| SKIP\.has\(el\.tagName\)\) return NodeFilter\.FILTER_REJECT;/.test(CENSUS)
    && /const NEEDLE_ROOT = "needle-root";/.test(CENSUS) && /if \(fab\.contains\(a\)\) continue;/.test(CENSUS));
  const effect = ROOT.slice(ROOT.indexOf("⭐ D15 ·"), ROOT.indexOf("// Desktop click-outside"));
  ok("3.4 · ChatRoot asks it from the bubble's own wrapper, at most once a frame",
    /import \{ contentUnder \} from "@\/lib\/chat\/fab-census";/.test(ROOT) && /const fab = bubbleRef\.current;/.test(effect)
    && /const schedule = \(\) => \{ if \(!frame\) frame = requestAnimationFrame\(ask\); \};/.test(effect) && /const over = contentUnder\(fab\);/.test(effect));
  ok("3.5 · …on a scroll (passive) and a resize, a new page, the body's size, the fonts, and D3/D75 handing it back",
    /window\.addEventListener\("scroll", schedule, \{ passive: true \}\);/.test(effect) && /window\.addEventListener\("resize", schedule\);/.test(effect)
    && /handedBack\.observe\(root, \{ attributes: true, attributeFilter: \["data-scrolling", "data-fab-idle"\] \}\);/.test(effect)
    && /grown\?\.observe\(document\.body\);/.test(effect) && /document\.fonts\?\.ready/.test(effect) && /\}, \[open, pathname\]\);/.test(effect));
  ok("3.6 · …never while the bubble is away (moving, idle) or its panel open; the mark written only when it changes",
    /if \(open \|\| root\.hasAttribute\("data-scrolling"\) \|\| root\.hasAttribute\("data-fab-idle"\)\) return;/.test(effect)
    && /if \(over !== fab\.hasAttribute\("data-over-content"\)\) fab\.toggleAttribute\("data-over-content", over\);/.test(effect));
  ok("3.7 · …and lets go of every listener when it re-runs",
    /window\.removeEventListener\("scroll", schedule\);/.test(effect) && /window\.removeEventListener\("resize", schedule\);/.test(effect)
    && /handedBack\.disconnect\(\);/.test(effect) && /grown\?\.disconnect\(\);/.test(effect) && /cancelAnimationFrame\(frame\)/.test(effect));
}

console.log("\n§4 · PLANTS — each way the yield could quietly not hold is reported");
{
  const plant = (name: string, from: string, to: string, src: string, caught: (planted: string) => boolean) => {
    const planted = src.replace(from, to);
    ok(`${name}`, planted !== src && caught(planted), planted === src ? "(the plant did not apply)" : "");
  };
  const fadeRule = `${YIELD_SEL} { opacity: var(--state-yield-opacity); }`;
  plant("4.1 · the yield reads the DISABLED token", fadeRule, `${YIELD_SEL} { opacity: var(--state-disabled-opacity); }`, GLOBALS, (g) => { const r = checkRules(g); return !r.one || !r.neverDisabled; });
  plant("4.2 · the yield raised above D3/D75 (an html[…] prefix)", fadeRule, `html[data-kp] ${YIELD_SEL} { opacity: var(--state-yield-opacity); }`, GLOBALS, (g) => !checkRules(g).one || !checkRules(g).below);
  plant("4.3 · the yield made !important", fadeRule, `${YIELD_SEL} { opacity: var(--state-yield-opacity) !important; }`, GLOBALS, (g) => !checkRules(g).one || !checkRules(g).below);
  plant("4.4 · no hover restore", `  ${HOVER_SEL} { opacity: 1; }`, "", GLOBALS, (g) => !checkRules(g).hover);
  plant("4.5 · the hover restore outside the hover gate (a tap would stick it)", `@media (hover: hover) {\n  ${HOVER_SEL} { opacity: 1; }\n}`, `${HOVER_SEL} { opacity: 1; }`, GLOBALS, (g) => !checkRules(g).hover);
  plant("4.6 · the yield takes the taps away", fadeRule, `${YIELD_SEL} { opacity: var(--state-yield-opacity); pointer-events: none; }`, GLOBALS, (g) => !checkRules(g).live || !checkRules(g).one);
  plant("4.7 · the yield nudges (a translate)", fadeRule, `${YIELD_SEL} { opacity: var(--state-yield-opacity); transform: translateX(-24px); }`, GLOBALS, (g) => !checkRules(g).live || !checkRules(g).one);
  const effectOf = (src: string) => src.slice(src.indexOf("⭐ D15 ·"), src.indexOf("// Desktop click-outside"));
  plant("4.8 · the census never asked on a scroll (the listener gone)", `    window.addEventListener("scroll", schedule, { passive: true });\n`, "", ROOT,
    (s) => !/window\.addEventListener\("scroll", schedule, \{ passive: true \}\);/.test(effectOf(s)));
  plant("4.9 · the census asked on every scroll event, unthrottled", "const schedule = () => { if (!frame) frame = requestAnimationFrame(ask); };", "const schedule = () => ask();", ROOT,
    (s) => !/const schedule = \(\) => \{ if \(!frame\) frame = requestAnimationFrame\(ask\); \};/.test(effectOf(s)));
  plant("4.10 · no re-check when D3/D75 hand the bubble back", `    handedBack.observe(root, { attributes: true, attributeFilter: ["data-scrolling", "data-fab-idle"] });\n`, "", ROOT,
    (s) => !/handedBack\.observe/.test(effectOf(s)));
  plant("4.11 · the mark never written (the census switched off)", `if (over !== fab.hasAttribute("data-over-content")) fab.toggleAttribute("data-over-content", over);`, "void over;", ROOT,
    (s) => !/fab\.toggleAttribute\("data-over-content", over\)/.test(effectOf(s)));
  plant("4.12 · the census forgets the figures (.amount)", `for (const a of document.querySelectorAll<HTMLElement>(".amount")) {`, `for (const a of [] as HTMLElement[]) {`, CENSUS,
    (s) => !/document\.querySelectorAll<HTMLElement>\("\.amount"\)/.test(s));
}

console.log(`\nchat-yield: ${pass} passed, ${fails.length} failed`);
if (fails.length) { for (const f of fails) console.log(`  ✗ ${f}`); process.exitCode = 1; }
