/**
 * ROUND 5 OF THE VISUAL PASS, HELPER B (2026-10-09) — the Wallet and its sheets, the notices, Tiketi zangu, the bell: every
 * fix a later edit could silently undo, held, each beside a CONTROL or a PLANT that proves the check can fail.
 *
 *   npx tsx scripts/visual-pass-r5b.test.mts        (npm run test:visual-pass-r5b)
 *
 * The owner's rule (Ali, 2026-10-08/09): only perfect visual and logical results, and consistency in every move — so each
 * section holds the fix AND the siblings it was brought in line with. Findings and tiles: S/visual/triage-r5.md.
 *   §1  F3   the Wallet's hairline stands in the middle of its gap (16 | 16); the filter sheet and the bet confirm already do
 *   §2  F6   the journey's section rails start on the column edge, their rule too; /wallet's ghost draws the same rail
 *   §3  F7   a sheet docked to the screen's bottom draws no bottom edge — every docked sheet the journey can open
 *   §4  F8   the journey's bell pip casts no shadow; the classic pip keeps its glow and its drop
 *   §5  F9   every moment a notice states is said in each reader's words — the bell, its push, the revoked agent's letter
 *   §6  F10  a title quoted in a notice is cut at a word, with "…" — the bodies and the email subjects
 *   §7  F11  the journey's money doors say the journey's words
 *   §8  F13  /wallet's receipts door stands in the bar's rhythm (42 · 42)
 *   §9  F14  a count line under a bar has 12px of air on both sides — /wallet, /wallet/receipts and its ghost
 *   §10 §A5  /notifications withholds its search band and its bar on a genuinely empty inbox, as seven pages already do
 *   §11 CHECKS the zero-balance lead keeps the payment method's name whole; the deposit pip clears the logo it marks
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-aaaa";
process.env.OTP_PEPPER ??= "test-only-otp-pepper-16chars";

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement as h } from "react";
import { decomment, decommentCss } from "./lib/decomment.mts";
import { dict as DICTS } from "../src/lib/i18n-dict.ts";
import { clipQuote } from "../src/lib/notification-text.ts";
import { formatEatDate, formatEatDateTime } from "../src/lib/eat-day.ts";
import { keepText } from "../src/components/ui/keep-run.tsx";
import { methodRunIn } from "../src/components/home/landing-hero.tsx";
import { QUERY_BAR_ROW1_CLASS, QUERY_BAR_ROW1_WRAP_CLASS, QUERY_BAR_ROW2_CLASS } from "../src/components/ui/query-bar.tsx";
import { db, type StoredWallet } from "../src/lib/server/store.ts";

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
const count = (s: string, needle: string) => s.split(needle).length - 1;

/** One rule's declarations, by its exact selector (or one member of a selector list) at the start of a line. */
function rule(src: string, selector: string): string {
  const m = new RegExp(`(?:^|\\n)\\s*(?:[^{}\\n]*,\\s*)?${esc(selector)}(?![\\w-])\\s*(?:,[^{}\\n]*)?\\{([^}]*)\\}`).exec(src);
  return m ? m[1] : "";
}
/** The body of the first `@media (<query>) { … }` block holding `needle`. */
function mediaBlock(src: string, query: string, needle: string): string {
  const opener = `@media (${query}) {`;
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
/** The repo's OVERRIDDEN spacing scale (tailwind.config.ts), with Tailwind's own default for a key it does not override. */
const twStep = (k: string) => Number(new RegExp(`"${esc(k)}":\\s*"([0-9.]+)px"`).exec(tw)?.[1] ?? ({ "2.5": 10, "3.5": 14 } as Record<string, number>)[k] ?? NaN);

// Font metrics: Next's capsize table (the faces the app ships), and the repo's own Inter for advances (r3c/r4e's model).
const METRICS = JSON.parse(readFileSync("node_modules/next/dist/server/capsize-font-metrics.json", "utf8")) as Record<string, { ascent: number; descent: number; capHeight: number; unitsPerEm: number }>;
/** Where a line's capitals start and its baseline sits, measured from the top of its line box. */
function lineGeom(face: "inter" | "jetBrainsMono", size: number, lineHeight: number) {
  const m = METRICS[face];
  const content = (m.ascent - m.descent) / m.unitsPerEm * size;
  const half = (lineHeight - content) / 2;
  const baseline = half + m.ascent / m.unitsPerEm * size;
  return { capTop: baseline - m.capHeight / m.unitsPerEm * size, baseline, belowBaseline: lineHeight - baseline };
}
const fontkit = createRequire(import.meta.url)("fontkit") as {
  openSync: (p: string) => { layout: (s: string) => { positions: { xAdvance: number }[] }; unitsPerEm: number };
};
const inter = fontkit.openSync("src/lib/server/reports/fonts/Inter-Regular.ttf");
const widthOf = (s: string, size: number) => inter.layout(s).positions.reduce((a, p) => a + p.xAdvance, 0) / inter.unitsPerEm * size;

const sw = DICTS.sw, en = DICTS.en, zh = DICTS.zh;
const JOURNEY = ":root:has(#kp-journey-shell)";

/* ══ §1 · F3 · THE WALLET'S HAIRLINE ══════════════════════════════════════════════════════════════════════════════ */
section("1 · F3 the Wallet's hairline stands in the middle of its gap (tiles 092 132–137 151–154)");
{
  const sheet = rule(CSS, ".kp-wsheet"), foot = rule(CSS, ".kp-wsheet__foot");
  const jfoot = rule(CSS, `${JOURNEY} .kp-wsheet__foot`);
  const gapAbove = px(/gap:\s*var\((--sp-\d+)\)/.exec(sheet)?.[1] ?? "");
  const below = (src: string) => px(/padding-top:\s*var\((--sp-\d+)\)/.exec(src)?.[1] ?? "");
  ok("1.1 · in the journey the rule stands 16 under the content (the sheet's gap) and 16 over the row (the foot's padding)",
    gapAbove === 16 && below(jfoot) === 16 && /border-top:\s*1px solid var\(--border\)/.test(foot), `${gapAbove} | ${below(jfoot)}`);
  ok("1.1′ CONTROL · the base rule is the classic capsule's, untouched (8 under the rule): the measured 16 | 8 of tile 132",
    below(foot) === 8 && gapAbove !== below(foot));
  const planted = CSS.replace(`${JOURNEY} .kp-wsheet__foot { padding-top: var(--sp-4); }`, "");
  ok("1.1″ PLANT · the journey's rule dropped leaves 16 | 8, and is reported", below(rule(planted, `${JOURNEY} .kp-wsheet__foot`)) !== 16);
  // Its siblings, measured to what the eye sees on each side of the rule.
  const fs = rule(CSS, ".kp-fsheet-foot");
  ok("1.2 · the filter sheet's footer: 16 above the rule (margin) and 16 below (padding) — the convention's reference",
    /margin-top:\s*var\(--sp-4\)/.test(fs) && /padding-top:\s*var\(--sp-4\)/.test(fs) && px("--sp-4") === 16);
  const bcm = read("src/components/markets/bet-confirm-modal.tsx");
  const bodyPb = twStep(/data-testid="bet-confirm-body"/.test(bcm) ? (/overflow-y-auto overscroll-contain px-5 pt-5 pb-(\d(?:\.\d)?) /.exec(bcm)?.[1] ?? "") : "");
  const footPt = twStep(/border-t border-border px-5 pt-(\d(?:\.\d)?) /.exec(bcm)?.[1] ?? "");
  const caption = /<div className="flex items-center gap-2 text-\[12px\] text-text-subtle">/.test(bcm);
  const capBelow = footPt + lineGeom("inter", 12, 12 * 1.5).capTop;
  ok("1.3 · the bet confirm's: its last box 20 over the rule, its quote caption's capitals 20.6 under it (within 1px)",
    caption && bodyPb === 20 && Math.abs(capBelow - bodyPb) < 1, `${bodyPb} | ${capBelow.toFixed(2)}`);
}

/* ══ §2 · F6 · THE JOURNEY'S SECTION RAILS ═══════════════════════════════════════════════════════════════════════ */
section("2 · F6 the journey's section rails start on the column edge (tiles 165–168 171 172)");
{
  const sel = `${JOURNEY} :is([data-section-rail], [data-rail-ghost])`;
  const rail = rule(CSS, sel), opt = rule(CSS, `${sel} > *`);
  const bleed = /margin-inline-start:\s*calc\(-1 \* var\((--sp-\d+)\)\)/.exec(rail)?.[1];
  const bg = /background:\s*linear-gradient\(var\(--border\), var\(--border\)\) var\((--sp-\d+)\) 100% \/ calc\(100% - var\((--sp-\d+)\)\) 1px no-repeat border-box/.exec(rail);
  const pad = /padding-inline:\s*var\((--sp-\d+)\)/.exec(opt)?.[1];
  const tabs = read("src/components/ui/tabs.tsx");
  const kitPad = twStep(/"group relative h-\[44px\] px-(\d) rounded-md/.exec(tabs)?.[1] ?? "");
  const inset = twStep(/"m-indicator absolute left-(\d) right-\1 bottom-0 h-\[2px\] rounded-pill"/.exec(tabs)?.[1] ?? "");
  ok("2.1.locate · the kit's option: a 20px-padded box, its underline 12px in; the rail's rule is its border; a link rail wears `data-section-rail`",
    kitPad === 20 && inset === 12 && /"scrollx flex items-end gap-1 border-b border-border overflow-x-auto"/.test(tabs) && /data-section-rail=""/.test(tabs), `${kitPad} ${inset}`);
  // Positions against the column edge (0): the rail reaches `bleed` into the gutter, the option pads `pad`, the underline is
  // `inset` into the option, the rule's line starts `bg` into the rail.
  const geom = (b: number, p: number, i: number, r: number) => ({ label: -b + p, underline: -b + i, underlineOverhang: i - p, rule: -b + r });
  const jr = geom(px(bleed ?? ""), px(pad ?? ""), inset, px(bg?.[1] ?? ""));
  ok("2.1 · journey: the first label, its underline and the rule all start ON the column edge, the underline exactly the label's width",
    jr.label === 0 && jr.underline === 0 && jr.underlineOverhang === 0 && jr.rule === 0 && bg?.[1] === bg?.[2] && /border-bottom-color:\s*transparent/.test(rail), JSON.stringify(jr));
  const classic = geom(0, kitPad, inset, 0);
  ok("2.1′ CONTROL · the same model without the journey rule is the tile: label 20 in, underline 12 in (390: x36 / x28 against x16)",
    classic.label === 20 && classic.underline === 12 && 16 + classic.label === 36 && 16 + classic.underline === 28);
  ok("2.1″ PLANT · a rail that does not bleed puts the label 12px in again, and is reported",
    geom(0, px(pad ?? ""), inset, px(bg?.[1] ?? "")).label !== 0);
  ok("2.2 · the bleed is drawn on screen: 12px into the 16px phone gutter (PageContainer `px-3`)", px(bleed ?? "") <= twStep("3") && twStep("3") === 16);
  const jnav = rule(CSS, ".kp-jnav__link"), jafter = rule(CSS, ".kp-jnav__link::after");
  ok("2.3 · it is the journey header's own line-tab geometry: `.kp-jnav__link` pads 12 a side and its underline is 12 in",
    /padding:\s*0 var\(--sp-3\)/.test(jnav) && /left:\s*var\(--sp-3\); right:\s*var\(--sp-3\)/.test(jafter) && pad === "--sp-3");
  // ⚠️ MOVED IN ROUND 5'S FOLLOW-UP (R5-H, G-2): /wallet's picture is drawn in the browser, by `wallet-ghost.tsx` beside the
  // loading file (which asks the server the one thing the browser cannot: whether the bonus programme is live).
  const ghost = read("src/app/wallet/wallet-ghost.tsx");
  const ghostShape = (s: string) => [
    !/<nav className="flex items-end gap-1 border-b border-border" data-rail-ghost="" aria-hidden>/.test(s) && "the ghost rail is not the rail's box with its hook",
    !/className="relative inline-flex h-\[44px\] items-center whitespace-nowrap px-4 text-body-sm font-semibold text-text-subtle"/.test(s) && "the ghost option is not the kit's option",
    !/\{i === 0 && <span className="absolute bottom-0 left-2 right-2 h-\[2px\] rounded-pill bg-brand-500" \/>\}/.test(s) && "the first ghost option has no inset underline",
    /font-display text-\[13px\]|px-3\.5|border-b-2 border-brand-500/.test(s) && "the old ghost (display face, 14px in, box-wide underline) is back",
  ].filter(Boolean) as string[];
  ok("2.4 · /wallet's ghost draws the rail's own geometry (both shells), and the journey's rule draws it as it draws the rail", ghostShape(ghost).length === 0, ghostShape(ghost).join(" · "));
  ok("2.4′ PLANT · the ghost back on `px-3.5` with a box-wide underline is reported",
    ghostShape(ghost.replace("whitespace-nowrap px-4 text-body-sm", "whitespace-nowrap px-3.5 text-body-sm")).length > 0);
  const rails = [read("src/components/journey/tickets/ticket-switch-rail.tsx"), read("src/app/wallet/wallet-client.tsx")];
  ok("2.5 · the journey's line-tab strips are the kit's link rails — Tiketi zangu's (both kinds) and /wallet's — so the one rule reaches both",
    /<Tabs variant="line" ariaLabel=\{ariaLabel\} value=\{value\} tabs=\{tabs\} \/>/.test(rails[0]) && /<Tabs\s+variant="line"\s+tabs=\{tabs\}/.test(rails[1])
      && /href: sectionHrefs\.activity/.test(rails[1]) && /href: "\/positions"/.test(read("src/components/journey/tickets/ticket-switch.tsx")));
}

/* ══ §3 · F7 · DOCKED SHEETS ═════════════════════════════════════════════════════════════════════════════════════ */
section("3 · F7 a sheet docked to the screen's bottom draws no bottom edge (tiles 132 134 136 151 152)");
{
  const modal = read("src/components/ui/modal.tsx");
  const wrapMark = /data-dock-wrap=\{tall \? "lg" : sheet \? "sm" : undefined\}\s*className=\{`fixed inset-0 flex justify-center/.test(modal);
  const panelMark = /data-rung="modal"\s*data-dock=\{tall \? "lg" : sheet \? "sm" : undefined\}/.test(modal);
  ok("3.1 · Modal marks the box that runs past the screen (its wrapper) and the sheet (its panel), by the width below which it docks",
    wrapMark && panelMark && /const tall = sheet && sheetUntil === "lg";/.test(modal));
  const lgBlock = mediaBlock(CSS, "max-width: 1023.98px", "data-dock-wrap"), smBlock = mediaBlock(CSS, "max-width: 639.98px", "data-dock-wrap");
  const dockRules = (b: string, size: "lg" | "sm", extra: string) => [
    new RegExp(`${esc(JOURNEY)} :is\\(\\[data-dock-wrap="${size}"\\]${extra}\\) \\{ bottom: -1px; \\}|${esc(JOURNEY)} \\[data-dock-wrap="${size}"\\] \\{ bottom: -1px; \\}`).test(b),
    new RegExp(`${esc(JOURNEY)} (?::is\\(\\[data-dock="${size}"\\]${extra}\\)|\\[data-dock="${size}"\\]) \\{ border-bottom-width: 0; padding-bottom: calc\\(var\\(--dock-pb, var\\(--sp-6\\)\\) \\+ 1px\\) !important; \\}`).test(b),
  ];
  const lg = dockRules(lgBlock, "lg", ", \\.kp-fsheet-panel"), sm = dockRules(smBlock, "sm", "");
  ok("3.2 · in the journey, below each width, the box runs 1px past the last row and the sheet drops its bottom border, its padding +1px",
    lg.every(Boolean) && sm.every(Boolean), JSON.stringify({ lg, sm }));
  ok("3.2′ PLANT · the box left on the screen's edge (`bottom: 0`) is reported",
    !dockRules(lgBlock.replace(/bottom: -1px/g, "bottom: 0"), "lg", ", \\.kp-fsheet-panel").every(Boolean));
  ok("3.3 · the default `--dock-pb` (24) is Modal's own `p-5` (24 on this scale), so a plain docked sheet keeps its air",
    px("--sp-6") === twStep("5") && /mat-modal relative w-full p-5 lg:p-6/.test(modal));
  const padBottom = (decl: string) => /padding:\s*\S+(?:\s+\S+)?\s+(calc\([^)]*\)[^;]*\))/.exec(decl)?.[1]?.replace(/\s+/g, " ").trim() ?? "";
  const wsDock = /--dock-pb:\s*([^;]+);/.exec(rule(CSS.slice(CSS.indexOf(".kp-wsheet { --dock-pb")), ".kp-wsheet"))?.[1]?.trim();
  const fsDock = /--dock-pb:\s*([^;]+);/.exec(rule(CSS.slice(CSS.indexOf(".kp-fsheet-panel { --dock-pb")), ".kp-fsheet-panel"))?.[1]?.trim();
  const fsPadding = /padding:\s*var\(--sp-3\) var\(--sp-5\) (calc\(env\(safe-area-inset-bottom, 0px\) \+ var\(--sp-4\)\))/.exec(rule(CSS, ".kp-fsheet-panel"))?.[1];
  ok("3.4 · each sheet's `--dock-pb` IS its own bottom padding — the Wallet's 20 + inset, the filter sheet's inset + 16",
    wsDock === padBottom(rule(CSS, ".kp-wsheet")) && wsDock === "calc(var(--sp-5) + env(safe-area-inset-bottom, 0px))" && fsDock === fsPadding, `${wsDock} | ${fsDock}`);
  const primer = read("src/components/onboarding/first-visit-primer.tsx");
  const needle = read("src/components/layout/needle-drawer.tsx");
  const needlePb = /"pb-\[(calc\(16px\+env\(safe-area-inset-bottom\)\))\] \[--dock-pb:(calc\(16px\+env\(safe-area-inset-bottom\)\))\]"/.exec(needle);
  ok("3.5 · the primer (`!p-0`) docks on 0, and the Needle's drawer — a sheet of its own below `sm` — carries both marks and its own padding",
    /panelClassName="!p-0 \[--dock-pb:0px\] /.test(primer) && /data-dock="sm"\s*data-dock-wrap="sm"/.test(needle) && !!needlePb && needlePb[1] === needlePb[2]
      && /"left-0 right-0 bottom-0 rounded-t-modal px-4 pt-4"/.test(needle));
  const skewed = /"pb-\[(calc\([^\]]*\))\] \[--dock-pb:(calc\([^\]]*\))\]"/.exec(needle.replace("[--dock-pb:calc(16px", "[--dock-pb:calc(20px"));
  ok("3.5′ PLANT · the drawer's dock padding out of step with its own is reported", !!skewed && skewed[1] !== skewed[2]);
  ok("3.6 · the chat's sheet drops its border alone below 1024: its composer paints over the light's row with an opaque fill",
    new RegExp(`${esc(JOURNEY)} \\.cm-panel-sheet \\{ border-bottom-width: 0; \\}`).test(lgBlock)
      && /--chat-canvas:\s*oklch\(15% 0\.130 268\);/.test(raw("src/styles/chat/chat-tokens.css"))
      && /background:\s*linear-gradient\(180deg, oklch\(17% 0\.120 268\) 0%, var\(--chat-canvas\) 100%\)/.test(raw("src/styles/chat/chat-styles.css")));
  // The census: every Modal sheet in the player's tree is one of the docked sheets the rule names.
  const sheets = ["src/components/layout/wallet-sheet.tsx", "src/components/journey/tickets-guest-sheet.tsx", "src/components/onboarding/first-visit-primer.tsx", "src/components/rg/reality-check.tsx"]
    .map((f) => [f, /<Modal[\s\S]{0,200}?\n\s+sheet\n/.test(raw(f))] as const);
  ok("3.7 · the docked Modal sheets a journey reader can open: the Wallet and the guest sheet (lg), the primer and the reality check (sm)",
    sheets.every(([, s]) => s) && /sheetUntil="lg"/.test(raw(sheets[0][0])) && /sheetUntil="lg"/.test(raw(sheets[1][0])), sheets.filter(([, s]) => !s).map(([f]) => f).join(", "));
}

/* ══ §4 · F8 · THE JOURNEY'S BELL PIP ════════════════════════════════════════════════════════════════════════════ */
section("4 · F8 the journey's bell pip casts no shadow (tile 225)");
{
  const j = rule(CSS, ".kp-jhdr__bell .count-badge"), rose = rule(CSS, '.count-badge[data-lift="rose"]');
  const jAt = CSS.indexOf(".kp-jhdr__bell .count-badge {"), roseAt = CSS.indexOf('.count-badge[data-lift="rose"] {');
  ok("4.1 · the journey's pip: `box-shadow: none`, after the lift's rule at the same (0,2,0), so it wins on order",
    /box-shadow:\s*none/.test(j) && jAt > roseAt && roseAt > 0, `${roseAt} < ${jAt}`);
  ok("4.1′ CONTROL · the classic pip keeps its rose glow AND its dark drop (frozen chrome)",
    /0 0 8px var\(--no-500\), 0 2px 4px color-mix\(in oklab, var\(--royal-950\) 40%, transparent\)/.test(rose));
  ok("4.1″ PLANT · the drop put back on the journey's pip is reported",
    !/box-shadow:\s*none/.test(rule(CSS.replace(/(\.kp-jhdr__bell \.count-badge \{[^}]*)box-shadow: none;/, "$1box-shadow: 0 2px 4px color-mix(in oklab, var(--royal-950) 40%, transparent);"), ".kp-jhdr__bell .count-badge")));
  ok("4.2 · the pip's separation is its own 2px ring of the bar's ground — a BORDER, which `box-shadow: none` leaves alone",
    /\.\.\.\(ring \? \{ border: `2px solid \$\{ring\}` \} : null\)/.test(read("src/components/ui/count-badge.tsx")));
}

/* ══ §5 · F9 · A NOTICE'S MOMENTS IN THE READER'S WORDS ══════════════════════════════════════════════════════════ */
section("5 · F9 every moment a notice states is said in each reader's words (tile 192)");
// A month word that differs between English and Swahili, seen in a Swahili sentence, is an English date there.
const EN_ONLY_MONTH = /\b(Mar|May|Aug|Oct|Dec)\b/;
{
  const ns = read("src/lib/server/notification-service.ts");
  ok("5.1 · the notifier formats no date the English way: no formatDateShort / formatDateTime / toLocale*String",
    !/\bformatDateShort\(|\bformatDateTime\(|\.toLocale(?:Date|Time)?String\(/.test(ns));
  ok("5.1′ PLANT · the old `formatDateShort(opts.reapplyAt)` put back is reported",
    /\bformatDateShort\(/.test(ns.replace("await instantIn(opts.reapplyAt, formatEatDate, \"\")", "formatDateShort(opts.reapplyAt)")));
  ok("5.2 · one path: the verdict, the re-apply day and a break's end all go through `instantIn` with eat-day's formatters",
    /instantIn\(opts\.paysAt, formatEatDateTime, "—"\)/.test(ns) && /instantIn\(opts\.reapplyAt, formatEatDate, ""\)/.test(ns)
      && /return instantIn\(untilIso, formatBreakEnd, untilIso\.slice\(0, 10\)\);/.test(ns)
      && /en: say\(at, now, dict\.en\.common\.monthsShort, "en"\),\s*sw: say\(at, now, dict\.sw\.common\.monthsShort, "sw"\),\s*zh: say\(at, now, dict\.zh\.common\.monthsShort, "zh"\),/.test(ns));
  const ms = read("src/lib/server/market-service.ts");
  const fan = /export async function notifyVerdictRecordedForMarket\([\s\S]*?\n\}\n/.exec(ms)?.[0] ?? "";
  ok("5.3 · the verdict's caller hands the market's own instant, not a formatted English string",
    /const paysAt = m\.objectionsClosedAt;/.test(fan) && /\bpaysAt,/.test(fan) && !/formatDateTime\(/.test(fan));

  // Driven: the rows a player's bell, /notifications and the push read.
  const N = await import("../src/lib/server/notification-service.ts");
  const E = await import("../src/lib/server/email.ts");
  const nowIso = new Date().toISOString();
  await db.user.create({ id: "r5b_player", phoneE164: "+255789000501", email: "r5b@test.tz", passwordHash: null, passwordSalt: null, failedLoginCount: 0,
    lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "SW", displayName: null, dob: null, region: null, acceptedTermsVersion: null,
    acceptedTermsAt: null, marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null, createdAt: nowIso, updatedAt: nowIso, lastLoginAt: null, closedAt: null } as never);
  await db.wallet.create({ id: "wal_r5b_player", userId: "r5b_player", balance: 0, pending: 0, hold: 0, bonusBalance: 0, currency: "TZS", status: "ACTIVE", createdAt: nowIso, updatedAt: nowIso } as StoredWallet);
  const at = "2026-10-09T08:53:00.000Z", atMs = Date.parse(at);
  const v = await N.notifyVerdictRecorded("r5b_player", { marketTitle: { en: "Sealed poll", sw: "Kura iliyofungwa", zh: "已封存的投票" }, marketId: "mkt_r5b_1", outcome: "YES", paysAt: at });
  const say = (l: "en" | "sw" | "zh") => formatEatDateTime(atMs, Date.now(), DICTS[l].common.monthsShort, l);
  ok("5.4 · the verdict notice: \"Payout from 9 Oct, 11:53\" · \"Malipo kuanzia 9 Okt, 11:53\" · \"赔付不早于 2026年10月9日 11:53\" (EAT)",
    !!v && v.bodyEn.includes(`Payout from ${say("en")}`) && v.bodySw.includes(`Malipo kuanzia ${say("sw")}`) && (v.bodyZh ?? "").includes(`赔付不早于 ${say("zh")}`)
      && say("sw").startsWith("9 Okt") && !EN_ONLY_MONTH.test(v.bodySw), v ? `${v.bodySw} | ${v.bodyZh}` : "no row");
  ok("5.4′ PLANT · the old body — one English string in the Swahili sentence — is reported", EN_ONLY_MONTH.test("Hakuna fedha iliyohamishwa bado. Malipo kuanzia 9 Oct 2026, 11:53"));
  const reapply = "2026-12-06T10:00:00.000Z";
  const r = await N.notifyAgentRevoked("r5b_player", { reapplyAt: reapply });
  const day = (l: "en" | "sw" | "zh") => formatEatDate(Date.parse(reapply), Date.now(), DICTS[l].common.monthsShort, l);
  ok("5.5 · the revoked agent's notice: \"from 6 Dec\" · \"kuanzia 6 Des\" · \"您可从 2026年12月6日 起\"",
    !!r && r.bodyEn.includes(`You may apply again from ${day("en")}.`) && r.bodySw.includes(`kuanzia ${day("sw")}.`) && (r.bodyZh ?? "").includes(`您可从 ${day("zh")} 起`)
      && day("sw").startsWith("6 Des") && !EN_ONLY_MONTH.test(r.bodySw), r ? r.bodySw : "no row");
  const letter = E.agentRevokedHtml({ reapplyAt: reapply }), none = E.agentRevokedHtml({ reapplyAt: null });
  ok("5.6 · …and its letter: the English line says \"from 6 Dec\", the Swahili line \"kuanzia 6 Des\" (it printed \"kuanzia 06 Dec\")",
    letter.includes(`You may apply again from ${day("en")}.`) && letter.includes(`Unaweza kuomba tena kuanzia ${day("sw")}.`) && !/kuanzia 0?6 Dec/.test(letter)
      && !none.includes("kuanzia") && !none.includes("apply again"));
}

/* ══ §6 · F10 · A QUOTED TITLE, CUT AT A WORD ════════════════════════════════════════════════════════════════════ */
section("6 · F10 a title quoted in a notice is cut at a word, with \"…\" (tile 192)");
{
  const JUNK = /[\s,;:.·\-–—(\[{“‘«「『（【〈《〔…、，：；。]$/u;
  // ⚠️ Chosen so that BOTH the old cut (60) and a cut that never steps back (59, the room) land inside a word ("Tanzania"):
  // a title whose 59th character is a space would let a missing step-back pass unseen (the mutation proof found one).
  const swTitle = "Je, Simba SC watashinda mechi zote tano za Ligi Kuu ya Tanzania Bara msimu huu?";
  const c = clipQuote(swTitle, 60), head = c.slice(0, -1);
  ok("6.1 · a long Swahili title ends at a word, on \"…\", within 60 code points, the words before it unchanged",
    c.endsWith("…") && Array.from(c).length <= 60 && swTitle.startsWith(head) && swTitle[head.length] === " " && !JUNK.test(head), c);
  ok("6.1′ CONTROL · `.slice(0, 60)` — the old cut — ends inside a word (\"…Ligi Kuu ya Tanza\"), and so would a cut at the room (59)",
    /\S$/.test(swTitle.slice(0, 60)) && swTitle[60] !== " " && /\S$/.test(swTitle.slice(0, 59)) && swTitle[59] !== " ");
  ok("6.2 · a text that fits is returned exactly as given", clipQuote("Sealed poll", 60) === "Sealed poll" && clipQuote(swTitle, 200) === swTitle);
  const zhTitle = "达累斯萨拉姆七月降雨超过200毫米吗NBC联赛2026-27赛季的最终排名";
  const LATIN = /[A-Za-z0-9-]/;
  const zc = Array.from({ length: 20 }, (_, i) => clipQuote(zhTitle, 12 + i));
  const insideRun = (s: string) => { const head = s.slice(0, -1); return LATIN.test(head.slice(-1)) && LATIN.test(zhTitle.slice(head.length, head.length + 1)); };
  ok("6.3 · Chinese breaks between ideographs but never inside a Latin word or a figure (\"200\", \"NBC\", \"2026-27\") — at any room 12…31",
    zc.every((s) => s.endsWith("…") && zhTitle.startsWith(s.slice(0, -1)) && !insideRun(s)), zc.filter(insideRun).join(" | "));
  ok("6.3′ CONTROL · `.slice` would have cut inside them (at 14, 20, 26: \"…20\", \"…NB\", \"…202\")",
    [14, 20, 26].every((n) => { const s = `${zhTitle.slice(0, n)}…`; return insideRun(s); }));
  ok("6.4 · a lone word longer than the room is cut at a character; a cut never ends on junk (\"「\", \", \", \"...\")",
    clipQuote("Supercalifragilisticexpialidocious", 10) === "Supercali…" && clipQuote("选「是」还是「否」——一个非常长的问题", 3) === "选…"
      && clipQuote("Hello, world and more", 9) === "Hello…" && clipQuote("Wait... what is it all about", 9) === "Wait…");
  const emoji = clipQuote("😀😀😀😀😀😀", 4);
  const loneHalf = [...emoji].some((ch) => ch.length === 1 && ch.charCodeAt(0) >= 0xd800 && ch.charCodeAt(0) <= 0xdfff);
  ok("6.5 · counted in code points: a pair of surrogates is never split", Array.from(emoji).length === 4 && !loneHalf && emoji === "😀😀😀…");
  const ns = read("src/lib/server/notification-service.ts");
  const CUT = /\b(?:marketTitle(?:\.(?:en|sw|zh))?|title(?:\.(?:en|sw|zh))?|titleEn|note|reason|playerLabel)\.slice\(0, \d+\)/;
  ok("6.6 · no notice cuts what it quotes with `.slice(0, n)` any more — every cut is `clipQuote` (82 of them)", !CUT.test(ns) && count(ns, "clipQuote(") >= 80, String(count(ns, "clipQuote(")));
  ok("6.6′ PLANT · one `.slice(0, 70)` put back is reported", CUT.test(ns.replace("${clipQuote(opts.marketTitle.en, 70)} · your side didn't win.", "${opts.marketTitle.en.slice(0, 70)} · your side didn't win.")));
  const ms = read("src/lib/server/market-service.ts");
  const subjects = [...ms.matchAll(/subject: `[^`\n]*`/g)].map((m) => m[0]);
  ok("6.7 · the email subjects that quote a title cut it the same way (bet placed, betting closed, awaiting resolution, cancelled)",
    subjects.filter((s) => /clipQuote\((?:market|m)\.titleEn, \d+\)/.test(s)).length === 4 && !subjects.some((s) => /titleEn\.slice\(0, \d+\)/.test(s))
      && /bodySw: `\$\{clipQuote\(market\.titleSw, 60\)\} — uko kwenye raundi hii\.`/.test(ms), subjects.filter((s) => /titleEn/.test(s)).join(" | "));
  ok("6.7′ CONTROL · the ledger's own descriptions keep their pinned shape (`red:updown-void-copy`): money records, not notices",
    ms.includes('description: `${refundDescription ?? "Refund"} · "${m.titleEn.slice(0, 60)}"${refundDescription ? "" : " voided"}`,'));
}

/* ══ §7 · F11 · THE JOURNEY'S MONEY DOORS ════════════════════════════════════════════════════════════════════════ */
section("7 · F11 the journey's money doors say the journey's words (tiles 171 172)");
{
  const wc = read("src/app/wallet/wallet-client.tsx");
  const doors = (s: string) => [
    !/<I\.arrowDown s=\{14\} \/>\s*\{journey \? t\.journey\.depositAction : t\.common\.deposit\}/.test(s) && "the header's Deposit",
    !/<I\.arrowUp s=\{14\} \/>\s*\{journey \? t\.journey\.withdrawAction : t\.common\.withdraw\}/.test(s) && "the header's Withdraw",
    !/<I\.plus s=\{12\} \/>\s*\{journey \? t\.journey\.depositAction : t\.common\.addFunds\}/.test(s) && "the balance card's Add funds",
    !/\{journey \? t\.journey\.depositAction : t\.common\.depositCta\}/.test(s) && "the empty account's Deposit",
    !/<BalanceCard [^>]*journey=\{journey\} \/>/.test(s) && "the card is not told",
    !/kycFirstDepositNotice = null,\s*journey = false,/.test(s) && "the page's default is not the classic words",
  ].filter(Boolean) as string[];
  ok("7.1 · /wallet: the header's two doors, the balance card's link and the empty account's Deposit take the journey's pair", doors(wc).length === 0, doors(wc).join(" · "));
  ok("7.1′ PLANT · the header's Deposit back on `common.deposit` is reported",
    doors(wc.replace("{journey ? t.journey.depositAction : t.common.deposit}", "{t.common.deposit}")).length > 0);
  ok("7.2 · the page asks the one per-request resolver (after its session gate); the receipts page does too",
    /journey=\{\(await resolveSimpleJourney\(\)\)\.journey\}/.test(read("src/app/wallet/page.tsx"))
      && /const \{ journey \} = await resolveSimpleJourney\(\);/.test(read("src/app/wallet/receipts/page.tsx"))
      && /\{journey \? t\.journey\.depositAction : t\.common\.depositCta\}/.test(read("src/app/wallet/receipts/page.tsx")));
  ok("7.3 · the pair is the journey's own (sw \"Weka pesa\" / \"Toa pesa\"; en Deposit / Withdraw; zh 充值 / 提现) — and it is not the classic sw pair",
    sw.journey.depositAction === "Weka pesa" && sw.journey.withdrawAction === "Toa pesa" && en.journey.depositAction === "Deposit" && zh.journey.withdrawAction === "提现"
      && sw.common.deposit === "Amana" && sw.common.withdraw === "Toa");
  const sheet = read("src/components/layout/wallet-sheet.tsx"), bar = read("src/components/journey/journey-top-bar.tsx");
  ok("7.4 · every other door the journey shows already says it: the header pill, the Wallet's two doors, the hub's Withdraw, the deposit page's Withdraw",
    /t\.journey\.depositAction/.test(bar) && /\{journey \? t\.journey\.depositAction : t\.common\.deposit\}/.test(sheet) && /\{journey \? t\.journey\.withdrawAction : t\.common\.withdraw\}/.test(sheet)
      && /label: "journey\.withdrawAction"/.test(read("src/components/journey/account/hub-rows.ts"))
      && /\{journey \? t\.journey\.withdrawAction : t\.common\.withdraw\}/.test(read("src/app/wallet/deposit/page.tsx")));
}

/* ══ §8 · F13 · THE RECEIPTS DOOR IN THE BAR'S RHYTHM ═══════════════════════════════════════════════════════════ */
section("8 · F13 /wallet's receipts door stands in the bar's rhythm (tile 172)");
{
  const door = rule(CSS, ".kp-discovery-bar + .kp-wallet-door.kp-wallet-door");
  const mt = Number(/margin-top:\s*(-?\d+)px/.exec(door)?.[1] ?? NaN), mb = Number(/margin-bottom:\s*(-?\d+)px/.exec(door)?.[1] ?? NaN);
  const wc = read("src/app/wallet/wallet-client.tsx");
  const rung = twStep(/<PageContainer tier="reading" className="space-y-(\d)">/.exec(wc)?.[1] ?? "");
  const barPb = twStep(/\bpb-(\d(?:\.\d)?)\b/.exec(QUERY_BAR_ROW2_CLASS)?.[1] ?? "");
  // The link: `inline-flex min-h-[44px] items-center … text-body-sm` (13px on an 18px line), centred in its 44px box.
  const link = /className="inline-flex min-h-\[44px\] items-center gap-1\.5 text-body-sm font-semibold text-brand-300/.test(wc);
  const g = lineGeom("inter", 13, 18), top = (44 - 18) / 2;
  const capIn = top + g.capTop, underBase = 44 - (top + g.baseline);
  const above = barPb + mt + capIn, below = underBase + rung + mb;
  ok("8.1.locate · the page's rung is 32 (`space-y-6`), the bar ends 10 under its pills (row 2's `pb-2.5`), the door is a 13px line in a 44px box",
    rung === 32 && barPb === 10 && link && Math.abs(capIn - 17.27) < 0.01 && Math.abs(underBase - 17.27) < 0.01, `${rung} ${barPb} ${capIn.toFixed(2)}`);
  ok("8.1 · the words stand rung + 10 = 42 under the last pills and their baseline 42 over what follows (42.27 · 42.27)",
    Math.abs(above - (rung + barPb)) <= 0.5 && Math.abs(below - (rung + barPb)) <= 0.5, `${above.toFixed(2)} · ${below.toFixed(2)}`);
  ok("8.1′ CONTROL · without the rule the door stands on the rung both sides: 59.27 · 49.27 — the measured 59 · 49 of tile 172",
    Math.abs(barPb + rung + capIn - 59.27) < 0.01 && Math.abs(underBase + rung - 49.27) < 0.01);
  ok("8.1″ PLANT · a door left on the page's 32 over it is reported", Math.abs(barPb + 32 + capIn - (rung + barPb)) > 0.5);
  ok("8.2 · the door row wears the hook, right after the bar it follows; the selector ties `space-y-*` at (0,3,0)",
    /\{emptyCause !== "no-rows" && activityBar\}\s*(?:\{\s*\}\s*)*\{emptyCause !== "no-rows" && \(\s*<div className="kp-wallet-door flex justify-end">/.test(wc)
      && (".kp-discovery-bar + .kp-wallet-door.kp-wallet-door".match(/\.[\w-]+/g) ?? []).length === 3);
}

/* ══ §9 · F14 · THE COUNT LINE'S AIR ════════════════════════════════════════════════════════════════════════════ */
section("9 · F14 a count line under a bar has 12px of air on both sides (tile 171)");
{
  ok("9.1.locate · the wrapped row is row 1 plus the wrap, an 8px row gap, a 4px reach into row 2, one line from lg",
    QUERY_BAR_ROW1_WRAP_CLASS === `${QUERY_BAR_ROW1_CLASS} flex-wrap justify-end gap-y-1.5 -mb-1 lg:mb-0 lg:flex-nowrap` && twStep("1.5") === 8 && twStep("1") === 4);
  // The count: `font-mono text-[11.5px]` on the body's 1.5 line.
  const qb = read("src/components/ui/query-bar.tsx");
  const g = lineGeom("jetBrainsMono", 11.5, 11.5 * 1.5);
  const row2Pt = twStep(/\bpt-(\d)\b/.exec(QUERY_BAR_ROW2_CLASS)?.[1] ?? "");
  const capAir = (gap: number) => gap + g.capTop, baseAir = (reach: number) => g.belowBaseline + row2Pt - reach;
  const gapY = twStep(/\bgap-y-(\d(?:\.\d)?)\b/.exec(QUERY_BAR_ROW1_WRAP_CLASS)?.[1] ?? ""), reach = twStep(/(?:^|\s)-mb-(\d(?:\.\d)?)\b/.exec(QUERY_BAR_ROW1_WRAP_CLASS)?.[1] ?? "");
  ok("9.1 · its capitals 12 under the pills (8 + 4.37) and its baseline 12 over row 2's control (4.49 + 12 − 4)",
    /className="shrink-0 font-mono text-\[11\.5px\] tabular-nums text-text-subtle"/.test(qb) && Math.abs(capAir(gapY) - 12) < 0.5 && Math.abs(baseAir(reach) - 12) < 0.5,
    `${capAir(gapY).toFixed(2)} | ${baseAir(reach).toFixed(2)}`);
  ok("9.1′ CONTROL · the old `gap-y-1` put the capitals 8.37 under the pills — tile 171's measured 8 (y697 → y706)", Math.abs(capAir(4) - 8.37) < 0.01);
  const mk = mediaBlock(CSS, "max-width: 639.98px", "grid-template-columns: minmax(160px, 1fr) auto auto");
  ok("9.2 · the /markets phone bar's count line takes the same 8px each way (R4-D)", /row-gap:\s*var\(--sp-2\);/.test(mk) && px("--sp-2") === 8);
  // ⚠️ MOVED IN ROUND 5'S FOLLOW-UP (R5-H, G-2b): the receipts ghost's bar is the money books' one bar ghost now — /wallet's
  // too (its ghost had none) — with every pill as wide as the page's in every language (`test:visual-pass-r5h` §4).
  const users = ["src/app/wallet/wallet-bar.tsx", "src/app/wallet/receipts/receipts-bar.tsx", "src/app/wallet/money-bar-ghost.tsx"].map((f) => [f, read(f)] as const);
  ok("9.3 · both money bars and the receipts ghost take the one constant; nobody retypes the wrap",
    users.every(([, s]) => /<div className=\{QUERY_BAR_ROW1_WRAP_CLASS\}>/.test(s) && !/gap-y-1 lg:flex-nowrap/.test(s)), users.filter(([, s]) => !/QUERY_BAR_ROW1_WRAP_CLASS/.test(s)).map(([f]) => f).join(", "));
  ok("9.3′ PLANT · a bar back on its own `gap-y-1` recipe is reported",
    /gap-y-1 lg:flex-nowrap/.test(users[0][1].replace("<div className={QUERY_BAR_ROW1_WRAP_CLASS}>", '<div className={cn(QUERY_BAR_ROW1_CLASS, "flex-wrap justify-end gap-y-1 lg:flex-nowrap")}>')));
  // ⚠️ MOVED IN ROUND 5'S FOLLOW-UP (R5-H, G-2b): the count is set in `QueryResultCount`'s own type with its words not shown —
  // the line is the count's by construction (17.25 = 11.5 × 1.5), and its width the phrase's, which decides where row 1 wraps
  // from lg.
  ok("9.4 · the ghost's count is as tall as the count's line (17.25), so row 2 lands where the page puts it",
    /<p className="shrink-0 font-mono text-\[11\.5px\] tabular-nums text-transparent"><span className="rounded bg-bg-overlay">\{count\}<\/span><\/p>/.test(users[2][1])
      && /className="shrink-0 font-mono text-\[11\.5px\] tabular-nums text-text-subtle"/.test(read("src/components/ui/query-bar.tsx")) && 11.5 * 1.5 === 17.25);
}

/* ══ §10 · §A5 · /notifications ON AN EMPTY INBOX ═══════════════════════════════════════════════════════════════ */
section("10 · §A5 /notifications withholds its band and its bar on a genuinely empty inbox");
{
  const page = read("src/app/notifications/page.tsx");
  const shape = (s: string) => [
    !/const inboxEmpty = !q && counts\.all === 0 && counts\.cleared === 0;/.test(s) && "\"genuinely empty\" is not: no search, none live, none cleared",
    !/\{!inboxEmpty && \(\s*<Suspense>\s*<SearchBox/.test(s) && "the search band is not withheld with it",
    !/\{!inboxEmpty && \(\s*<NotificationsBar/.test(s) && "the bar is not withheld",
    !/const empty = inboxEmpty \? EMPTY\.all : EMPTY\[filter\];/.test(s) && "an empty inbox under a lens does not read the inbox's sentence",
    !/title=\{q \? `\$\{t\.results\.noResultsMatch\} "\$\{q\}"` : empty\.title\}/.test(s) && "the empty state does not read it",
    count(s, "<NotificationsBar") !== 1 && "the bar is rendered more than once",
  ].filter(Boolean) as string[];
  ok("10.1 · the band and the bar stand only over something to filter; a search keeps them (its miss is the way out)", shape(page).length === 0, shape(page).join(" · "));
  ok("10.1′ PLANT · the cleared rows forgotten (a player who cleared everything would lose the Cleared lens) is reported",
    shape(page.replace(" && counts.cleared === 0;", ";")).length > 0);
  ok("10.1″ PLANT · the bar drawn unconditionally again is reported", shape(page.replace("{!inboxEmpty && (\n        <NotificationsBar", "{(\n        <NotificationsBar")).length > 0);
  // The counts the rule reads, driven on the store a player's inbox lives in.
  const pageOf = () => db.notification.page({ userId: "r5b_inbox", filter: "all", sort: "newest", page: 1, perPage: 20, q: "" }) as unknown as { counts: { all: number; cleared: number } };
  const empty0 = pageOf().counts;
  const N = await import("../src/lib/server/notification-service.ts");
  const row = await N.notifyPasswordChanged("r5b_inbox");
  const one = pageOf().counts;
  if (row) await db.notification.dismiss(row.id, "r5b_inbox");
  const cleared = pageOf().counts;
  const isEmpty = (c: { all: number; cleared: number }) => c.all === 0 && c.cleared === 0;
  ok("10.2 · driven: a new player's inbox is empty (the band and bar withheld); one notice keeps them; that notice cleared still keeps them",
    isEmpty(empty0) && !isEmpty(one) && one.all === 1 && !isEmpty(cleared) && cleared.cleared === 1, JSON.stringify({ empty0, one, cleared }));
  const siblings: Array<[string, RegExp]> = [
    ["src/app/positions/page.tsx", /\{positions\.length > 0 && \(\s*<>\s*(?:\{\s*\}\s*)*<SearchBox/],
    ["src/app/wallet/wallet-client.tsx", /\{emptyCause !== "no-rows" && activityBar\}/],
    ["src/app/updown/history/page.tsx", /\{allRows\.length > 0 && \(/],
    ["src/app/proposals/page.tsx", /\{rows\.length > 0 && \(/],
    ["src/app/watchlist/page.tsx", /\{rows\.length > 0 && \(/],
    ["src/app/fairness/page.tsx", /\{rows\.length > 0 && \(/],
    ["src/app/positions/performance/page.tsx", /\{settledAll\.length > 0 && lenses\.length > 2 && \(/],
    ["src/app/wallet/receipts/page.tsx", /\{cause !== "no-rows" && <ReceiptsBar/],
  ];
  const missing = siblings.filter(([f, re]) => !re.test(read(f))).map(([f]) => f);
  ok("10.3 · the rule /notifications joins: every one of its siblings withholds its controls on an empty book", missing.length === 0, missing.join(", "));
}

/* ══ §11 · CHECKS ══════════════════════════════════════════════════════════════════════════════════════════════ */
section("11 · CHECKS the zero-balance lead keeps the method's name whole (079 083); the deposit pip clears the logo (067)");
{
  const hero = read("src/components/home/landing-hero.tsx");
  ok("11.1 · the lead is kept by the method's own label, found in the sentence (no new words)",
    /<p className="kp-mine__lead">\{keepText\(t\.home\.emptyBalance, methodRunIn\(t\.home\.emptyBalance, t\.wallet\.mobileMoneyOnly\)\)\}<\/p>/.test(hero));
  const kept = (d: typeof sw) => html(h("p", null, keepText(d.home.emptyBalance, methodRunIn(d.home.emptyBalance, d.wallet.mobileMoneyOnly))));
  ok("11.2 · rendered: \"pesa ya simu\" and \"mobile money\" are each one unbreakable run; the sentence itself is unchanged",
    kept(sw).includes('<span class="whitespace-nowrap">pesa ya simu</span>') && kept(en).includes('<span class="whitespace-nowrap">mobile money</span>')
      && kept(sw).replace(/<[^>]+>/g, "") === sw.home.emptyBalance && kept(en).replace(/<[^>]+>/g, "") === en.home.emptyBalance, `${kept(sw)}`);
  ok("11.2′ CONTROL · Chinese names it 手机钱包, not the Wallet's 移动支付: no run — `keep-all` (`.kp-mine__lead:lang(zh)`) already keeps it",
    methodRunIn(zh.home.emptyBalance, zh.wallet.mobileMoneyOnly).length === 0 && /\.kp-mine__lead:lang\(zh\)\s*\{\s*word-break:\s*keep-all;/.test(CSS));
  const runW = Math.max(widthOf("pesa ya simu", 17), widthOf("mobile money", 17));
  ok("11.3 · the run fits the narrowest line it can meet (288px at 320): a kept run never overflows", runW < 288, runW.toFixed(1));
  // `text-wrap: balance` modelled as Chrome does it: the narrowest width that keeps the greedy line count, then greedy.
  const greedy = (toks: string[], w: number) => { const out: string[] = []; let cur = ""; for (const t of toks) { const n = cur ? `${cur} ${t}` : t; if (widthOf(n, 17) <= w || !cur) cur = n; else { out.push(cur); cur = t; } } if (cur) out.push(cur); return out; };
  const balanced = (toks: string[], w: number) => { const n = greedy(toks, w).length; let lo = 0, hi = w; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (greedy(toks, m).length > n) lo = m; else hi = m; } return greedy(toks, hi); };
  const toks = (text: string, keep: string | null) => { const words = text.split(" "); if (!keep) return words; const k = keep.split(" ").length, out: string[] = []; for (let i = 0; i < words.length; i++) { const j = words.slice(i, i + k).join(" "); if (j.toLowerCase() === keep.toLowerCase()) { out.push(j); i += k - 1; } else out.push(words[i]); } return out; };
  const measure = Number(/--mine-measure:\s*calc\((\d+) \* var\(--type-h4\)\)/.exec(rule(CSS, ".kp-mine"))?.[1] ?? NaN) * px("--type-h4");
  const before = { sw: balanced(toks(sw.home.emptyBalance, null), measure), en: balanced(toks(en.home.emptyBalance, null), measure) };
  const after = { sw: balanced(toks(sw.home.emptyBalance, "pesa ya simu"), measure), en: balanced(toks(en.home.emptyBalance, "mobile money"), measure) };
  ok("11.4 · at 1024–1280 (578px) the lead was split inside the name (\"…pesa ya\" / \"simu…\", \"…mobile\" / \"money…\") and is not now",
    before.sw[0].endsWith("pesa ya") && before.en[0].endsWith("mobile") && after.sw.length === 2 && after.en.length === 2
      && after.sw.every((l) => !/pesa ya$|pesa$/.test(l)) && after.sw[0].endsWith("pesa ya simu") && after.en[0].endsWith("Add funds by"),
    JSON.stringify({ before, after }));
  const grid = read("src/components/wallet/provider-radio-grid.tsx");
  const pip = /className="absolute right-(\d(?:\.\d)?) top-\1 inline-flex h-(\d) w-\2 items-center justify-center rounded-full bg-brand-500/.exec(grid);
  const tile320 = 113, logo = 48, border = 1;
  const air = (inset: number, size: number) => tile320 / 2 - logo / 2 - border - inset - size;
  ok("11.5 · the deposit pip stands 4px into the tile's corner: 7.5px clear of the logo at sw 320 (a 113px tile, a 48px plate)",
    !!pip && twStep(pip[1]) === 4 && twStep(pip[2]) === 20 && air(twStep(pip[1]), twStep(pip[2])) >= 7, pip ? `${air(twStep(pip[1]), twStep(pip[2]))}` : "no pip");
  ok("11.5′ CONTROL · at 8px in (`1.5`) it was 3.5 — tile 067's 3 clear columns (plate to x121, pip from x125)", air(twStep("1.5"), 20) === 3.5);
}

console.log(`\n${pass} passed, ${fails.length} failed`);
if (fails.length) {
  console.log(fails.map((f) => `  · ${f}`).join("\n"));
  process.exit(1);
}
process.exit(0);
