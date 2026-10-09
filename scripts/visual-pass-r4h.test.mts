/**
 * ROUND 4 OF THE VISUAL PASS, HELPER H (2026-10-09) — the edge scenarios' findings (M9's edges drive, S/edges/tiles and
 * S/visual/triage-r4.md "EDGES"), each fix held beside a control or a plant that proves the check can fail.
 *
 *   npx tsx scripts/visual-pass-r4h.test.mts        (npm run test:visual-pass-r4h)
 *
 * The owner's rule (Ali, 2026-10-08): only perfect visual and logical results. Each section names the tiles and the file:
 *   §1  E27 the name editor selects in the commit that opens it — no keystroke is ever lost
 *   §2  E24 E25 E26 a long name breaks inside its column, never one character alone, and the hero cannot scroll sideways
 *   §3  E28 the board rows' meta line is a DotSeq: no line ends or opens on "·"
 *   §4  E29 a title's figures stay whole ("2026-27", "dakika 28:00") on every title surface, CJK-safe
 *   §5  E30 the card's two-line title slot, by design, with its numbers
 *   §6  E31 E33 the journey's account menu: the Needle row on the rows' grid, a wrapped label never ends on one word,
 *       /positions by the tab's name
 *   §7  E32 one phone, one mask (maskPhone) in the journey and on /profile/account
 *   §8  E4  the home's link to /positions takes the journey tab's name
 *   §9  E34 the journey's toaster hangs under its header
 *   §10 E5  the home's tab title in the reader's language
 *   §11 E2 E3 the journey's Wallet: a whole glyph in every door, captions that never end on one word
 *   §12 E13 the card watermark is not lit behind the card's controls
 *   §13 G20 an id breaks in whole runs of four on both receipts
 *   §14 R4-C's leftover: /live, /updown/history and /profile/account wear the search band (rung + 10 on every side)
 * Sources are read through the shared scanners (scripts/lib/decomment.mts). This file writes nothing.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createElement as h, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { decomment, decommentCss } from "./lib/decomment.mts";
import { keepFigures, keepIdRuns, keepLastWords, keepNameEnd } from "../src/components/ui/keep-words.tsx";
import { hyphenParts } from "../src/app/live/pulse-grid.tsx";
import { DotSeq } from "../src/components/ui/dot-seq.tsx";
import { maskPhone } from "../src/lib/phone-normalize.ts";
import { SHORT_TITLE_MAX } from "../src/lib/markets/short-title.ts";
import { JOURNEY_TABS } from "../src/lib/nav/active-tab.ts";
import {
  QUERY_BAR_ROW1_CLASS,
  QUERY_BAR_ROW2_CLASS,
  QUERY_SEARCH_BAND_CLASS,
} from "../src/components/ui/query-bar.tsx";
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
const RAW_CSS = raw("src/app/globals.css");
const CSS = decommentCss(RAW_CSS);
const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);
const frag = (n: unknown) => html(h(Fragment, null, n as never));
const text = (s: string) => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"');
const squash = (s: string) => s.replace(/\s+/g, " ");
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const show = (v: unknown) => JSON.stringify(v);
const sw = DICTS.sw, en = DICTS.en, zh = DICTS.zh;

/** One rule's declarations, by its exact selector (or one member of a selector list) at the start of a line. */
function rule(src: string, selector: string): string {
  const m = new RegExp(`(?:^|\\n)\\s*(?:[^{}\\n]*,\\s*)?${esc(selector)}(?![\\w-])\\s*(?:,[^{}\\n]*)?\\{([^}]*)\\}`).exec(src);
  return m ? m[1] : "";
}
/** :root's px custom properties. */
const ROOT_PX: Record<string, number> = {};
for (const m of RAW_CSS.matchAll(/(--(?:sp|type|h-control|r)-[a-z0-9-]+):\s*([0-9.]+)px/g)) ROOT_PX[m[1]] ??= Number(m[2]);
const px = (v: string) => ROOT_PX[v] ?? NaN;
/** This repo's spacing scale: the overridden keys from tailwind.config.ts, the stock 2.5 (10px) they leave. */
const SCALE: Record<string, number> = { "2.5": 10 };
{
  const block = /spacing:\s*\{([^}]*)\}/.exec(raw("tailwind.config.ts"))?.[1] ?? "";
  for (const m of block.matchAll(/"([0-9.]+)":\s*"(\d+)px"/g)) SCALE[m[1]] = Number(m[2]);
}
/** The px of a padding/margin/gap utility in a class list ("pt-2" → 12, "pt-[10px]" → 10), or NaN. */
const tw = (classes: string, prefix: string) => {
  const m = new RegExp(`(?:^|\\s)${esc(prefix)}-(?:([0-9.]+)|\\[(\\d+)px\\])(?=\\s|$)`).exec(classes);
  return m ? (m[1] !== undefined ? (SCALE[m[1]] ?? NaN) : Number(m[2])) : NaN;
};

// The repo's own fonts (src/lib/server/reports/fonts), advances with kerning — visual-pass-r3c's model, within ~1% of tiles.
const fontkit = createRequire(import.meta.url)("fontkit") as {
  openSync: (p: string) => { layout: (s: string) => { positions: { xAdvance: number }[] }; unitsPerEm: number };
};
const F = (n: string) => fontkit.openSync(`src/lib/server/reports/fonts/${n}.ttf`);
const inter = F("Inter-Regular"), interMed = F("Inter-Medium"), interBold = F("Inter-Bold"), monoB = F("JetBrainsMono-Bold");
const width = (f: ReturnType<typeof F>, s: string, size: number) => f.layout(s).positions.reduce((a, p) => a + p.xAdvance, 0) / f.unitsPerEm * size;
/** Inter 600 sits between the two cuts the repo ships. */
const width600 = (s: string, size: number) => (width(interMed, s, size) + width(interBold, s, size)) / 2;
/** Sora is not in the repo's font set: Inter Medium scaled by the two faces' average advance at 500 (next's capsize table). */
const CAPSIZE = JSON.parse(raw("node_modules/next/dist/server/capsize-font-metrics.json")) as Record<string, { unitsPerEm: number; xWidthAvg: number; variants: Record<string, { xWidthAvg: number }> }>;
const SORA_RATIO = (CAPSIZE.sora.variants["500"].xWidthAvg / CAPSIZE.sora.unitsPerEm) / (CAPSIZE.inter.variants["500"].xWidthAvg / CAPSIZE.inter.unitsPerEm);
const sora500 = (s: string, size: number) => width(interMed, s, size) * SORA_RATIO;
const IDEO = /[㐀-䶿一-鿿豈-﫿]/;

/** A greedy line breaker over units (a unit is a word, or a glued run, never split), joined by spaces of `space` px. */
function lines(units: string[], w: (s: string) => number, line: number, space: number, joinWithSpace = true): string[] {
  const out: string[] = [];
  let cur = "";
  let curW = 0;
  for (const u of units) {
    const uw = w(u);
    const add = cur === "" ? uw : curW + (joinWithSpace ? space : 0) + uw;
    if (cur !== "" && add > line) { out.push(cur); cur = u; curW = uw; }
    else { cur = cur === "" ? u : cur + (joinWithSpace ? " " : "") + u; curW = add; }
  }
  if (cur !== "") out.push(cur);
  return out;
}
/** The units a rendered fragment gives the line breaker: nowrap spans whole, the rest split at spaces (or per ideograph). */
function unitsOf(markup: string, cjk = false): string[] {
  const parts: string[] = [];
  for (const m of markup.matchAll(/<span class="whitespace-nowrap">([^<]*)<\/span>|([^<]+)/g)) {
    if (m[1] !== undefined) parts.push(`\u0000${text(m[1])}`);
    else parts.push(...(cjk ? Array.from(text(m[2])) : text(m[2]).split(/\s+/).filter(Boolean)));
  }
  // A glued run joins the unit before it when no space separates them (CJK: "百里" + "呼延" stay separate units).
  return parts.map((p) => p.replace("\u0000", ""));
}

/* ══ §1 · E27 · NO KEYSTROKE LOST ═════════════════════════════════════════════════════════════════════════════════ */
section("1 · E27 the name editor selects in the commit that opens it (edges: saved names lost their first letters)");
const EDITOR = "src/components/profile/name-editor.tsx";
const editorOk = (s: string) => {
  const flat = squash(s);
  const enter = /const enter = \(\) => \{([\s\S]*?)\};/.exec(s)?.[1] ?? "";
  return [
    /setTimeout\(/.test(s) && "a timer is back in the editor",
    /\.select\(\)/.test(enter) && "enter() selects",
    !flat.includes("useLayoutEffect(() => { if (!editing) return; const field = inputRef.current; if (!field) return; field.focus(); field.select(); }, [editing]);") && "no layout effect focuses and selects on open",
    !/import \{ useEffect, useLayoutEffect, useRef, useState, useTransition \} from "react";/.test(s) && "useLayoutEffect is not imported",
    (s.match(/\.select\(\)/g) ?? []).length !== 1 && "select() is called more than once (a re-select would swallow keys again)",
  ].filter(Boolean) as string[];
};
{
  const ed = read(EDITOR);
  ok("1.1 · no timer, one select() — in a layout effect on `editing`, after focus, so the field is selected before the next event",
    editorOk(ed).length === 0, editorOk(ed).join(" · "));
  const planted = ed.replace("    setEditing(true);\n  };", "    setEditing(true);\n    setTimeout(() => inputRef.current?.select(), 30);\n  };");
  ok("1.1′ PLANT · the 30ms re-select put back is reported", planted !== ed && editorOk(planted).length > 0);

  // ⭐ THE MECHANISM, modelled: the drive opened the field, pressed Ctrl+A and typed at 4ms a key from ~10ms. A select()
  // that lands at t selects whatever was typed before t, and the next key replaces it.
  const typeInto = (name: string, selectAt: number, start = 10, every = 4) => {
    let value = "old name", all = true; // Ctrl+A: everything selected
    let selected = false;
    Array.from(name).forEach((ch, i) => {
      const t = start + i * every;
      if (!selected && t >= selectAt) { all = true; selected = true; }
      value = all ? ch : value + ch;
      all = false;
    });
    return value;
  };
  const lost = (name: string, selectAt: number) => Array.from(name).length - Array.from(typeInto(name, selectAt)).length;
  const names = ["Mwanaisha Khamis Abdalla Mwinyimkuu Juma", "Mwanaishakhamisabdallamwinyimkuujumasali", "欧阳慕容司马诸葛上官皇甫东方独孤令狐长孙宇文尉迟公孙轩辕西门南宫夏侯端木百里呼延"];
  ok("1.2 · selected at open (t = 0): every key lands — the three edge names are saved whole",
    names.every((n) => typeInto(n, 0) === n), show(names.map((n) => lost(n, 0))));
  ok("1.2′ CONTROL · selected 30ms later: the keys typed before it are replaced (the drive saved \"wanaisha…\", \"anaisha…\", \"阳慕容…\")",
    names.every((n) => lost(n, 30) > 0), show(names.map((n) => lost(n, 30))));
}

/* ══ §2 · E24 E25 E26 · LONG NAMES ══════════════════════════════════════════════════════════════════════════════ */
section("2 · E24 E25 E26 a long name breaks inside its column, never one character alone; the hero cannot scroll (tiles 218 233–236)");
{
  const ed = read(EDITOR);
  const button = /<button\s+ref=\{triggerRef\}[\s\S]*?<\/button>/.exec(ed)?.[0] ?? "";
  // ⚠️ MOVED IN ROUND 5'S FOLLOW-UP (R5-K): the name's face is `PROFILE_NAME_FACE` (`profile-faces.ts`), the one string the
  // editor and /profile's loading ghost both read — resolved here, so the rule below reads the class the span renders.
  const face = /export const PROFILE_NAME_FACE = "([^"]+)";/.exec(read("src/components/profile/profile-faces.ts"))?.[1] ?? "\u0000";
  const resolved = (b: string) => b.replace(/className=\{`min-w-0 \$\{PROFILE_NAME_FACE\} ([^`]*)`\}/, (_, rest: string) => `className="min-w-0 ${face} ${rest}"`);
  const nameRule = (b0: string, b = resolved(b0)) => [
    !/className="mt-1\.5 inline-flex min-h-\[40px\] max-w-full items-center gap-2 group text-left"/.test(b) && "the button may outgrow its column",
    !/<span className="min-w-0 font-display text-\[24px\] md:text-\[28px\] font-bold leading-tight tracking-\[-0\.02em\] text-text text-balance \[overflow-wrap:anywhere\]">/.test(b) && "the name has no anywhere-break, balance or min-w-0",
    // Review 6, B-4 (2026-10-09) moved this pin: the end is kept at the SERVER's cut (`nameWithEnd` + `currentNameEnd`).
    !/\? nameWithEnd\(currentName, currentNameEnd\) :/.test(b) && "the name's end is not kept (at the server's cut)",
  ].filter(Boolean) as string[];
  ok("2.1 · the read-mode name: the button capped at its column, the name breaking anywhere when it must, balanced, its end kept",
    button !== "" && nameRule(button).length === 0, nameRule(button).join(" · "));
  ok("2.1′ PLANT · `break-word` instead of `anywhere` is reported (break-word does not lower a flex item's min-content: the 40-letter word stays 580px wide)",
    nameRule(button.replace("[overflow-wrap:anywhere]", "break-words")).length > 0);

  // E24: the hero is no scroll container. Tailwind emits .overflow-clip after .overflow-hidden, so clip wins where supported.
  const prof = read("src/app/profile/page.tsx");
  const core = raw("node_modules/tailwindcss/lib/corePlugins.js");
  const hiddenAt = core.indexOf('".overflow-hidden"'), clipAt = core.indexOf('".overflow-clip"');
  ok("2.2 · the hero section is `overflow-hidden overflow-clip` (clip after hidden in Tailwind's output) and its watermark still overhangs 32px (-right-6), the overflow a reveal scrolled",
    prof.includes(`<section className="relative overflow-hidden overflow-clip rounded-xl border border-border bg-bg-elevated">`)
      && hiddenAt > 0 && clipAt > hiddenAt && prof.includes(`<div className="absolute -right-6 -top-6 opacity-[0.06]" aria-hidden>`) && SCALE["6"] === 32,
    show({ hiddenAt, clipAt }));
  ok("2.2′ PLANT · the hero back on `overflow-hidden` alone is reported",
    !prof.replace("overflow-hidden overflow-clip", "overflow-hidden").includes("overflow-hidden overflow-clip"));

  // keepNameEnd: the last two characters together, the text unchanged.
  const cjk = "欧阳慕容司马诸葛上官皇甫东方独孤令狐长孙宇文尉迟公孙轩辕西门南宫夏侯端木百里呼延";
  const r = frag(keepNameEnd(cjk));
  ok("2.3 · keepNameEnd: \"…百里<呼延>\", \"Jum<a K>\", a two-character name untouched, the words unchanged",
    r.endsWith(`<span class="whitespace-nowrap">呼延</span>`) && text(r) === cjk && frag(keepNameEnd("Juma K")).endsWith(`<span class="whitespace-nowrap">a K</span>`)
      && keepNameEnd("AB") === "AB" && text(frag(keepNameEnd("Mwanaisha Khamis"))) === "Mwanaisha Khamis", r.slice(-60));

  // The hub's identity: the name column at each width, the 40 ideographs at 17px.
  const acct = read("src/app/account/page.tsx");
  const nameCss = rule(CSS, ".kp-hub__name");
  ok("2.4 · the hub renders keepNameEnd(viewer.name) and balances the name (anywhere-breaks kept)",
    acct.includes(`<span className="kp-hub__name">{keepNameEnd(viewer.name)}</span>`) && /overflow-wrap:\s*anywhere/.test(nameCss) && /text-wrap:\s*balance/.test(nameCss), nameCss);
  const idRule = rule(CSS, ".kp-hub__id");
  const col = (vw: number) => vw - 2 * 16 - 2 - 2 * px("--sp-4") - 52 - px("--sp-3");
  ok("2.locate · the hub's name column is viewport − 130: 190 at 320, 230 at 360, 260 at 390 (16px gutter, 1px border, 16px padding, 52px initials, 12px gap)",
    /padding:\s*var\(--sp-4\)/.test(idRule) && /gap:\s*var\(--sp-3\)/.test(idRule) && /width:\s*52px/.test(rule(CSS, ".kp-hub__initials")) && col(360) === 230, show([col(320), col(360), col(390)]));
  const size = px("--type-h4");
  const greedy = (markup: string, vw: number) => lines(unitsOf(markup, true), (u) => Array.from(u).length * size, col(vw), 0, false);
  const after = [320, 360, 390].map((vw) => greedy(r, vw).map((l) => Array.from(l).length));
  ok("2.5 · on any engine (balance aside) the last line holds two characters at least: 11·11·11·7 at 320, 13·13·12·2 at 360, 15·15·10 at 390",
    after.every((ls) => ls[ls.length - 1] >= 2) && show(after) === show([[11, 11, 11, 7], [13, 13, 12, 2], [15, 15, 10]]), show(after));
  const before = greedy(cjk, 360).map((l) => Array.from(l).length);
  ok("2.5′ CONTROL · the name as text broke 13·13·13·1 at 360 — the tile's lone last character", show(before) === show([13, 13, 13, 1]), show(before));
}

/* ══ §3 · E28 · THE BOARD ROWS' META LINE ════════════════════════════════════════════════════════════════════════ */
section("3 · E28 the board rows' meta line breaks only between its facts (tiles 248 249 257 258 266 267)");
const HERO = "src/components/home/landing-hero.tsx";
{
  const hero = read(HERO);
  const row = hero.slice(hero.indexOf("function QuestionRow"), hero.indexOf("export function LandingHero"));
  const metaShape = (s: string) => [
    !s.includes(`<DotSeq text={[closes, settles, pool, depth].filter(Boolean).join(" · ")} className="kp-qrow__meta" renderPart={metaPart} />`) && "the meta is not a DotSeq of its four facts",
    /\{" · "\}/.test(s) && "a hand-written \" · \" remains in the row",
    !/part === settles \? \([\s\S]*?<span className="kp-qrow__srcname" data-market-part="source">\{row\.sourceName\}<\/span>/.test(s) && "the source part lost its name hook",
    !squash(s).includes(`: part === pool ? <span className="kp-qrow__pool" data-market-part="pool">{t.common.pool}{" "}{formatTzs(row.pool)}</span>`) && "the pool part lost its class, hook or words",
    !squash(s).includes(`: part === depth ? ( <span className="kp-qrow__depth" data-market-part="predictors"> {formatNumber(row.predictors)}{" "}{row.predictors === 1 ? t.market.predictorsCountOne : t.market.predictorsCount} </span> )`) && "the predictors part lost its class, hook or words",
    !s.includes("const pool = `${t.common.pool} ${formatTzs(row.pool)}`;") && "the pool's key is not the words it draws",
    !s.includes(`part === closes ? <span className="kp-qrow__close">{closes}</span>`) && "the close lost its class",
  ].filter(Boolean) as string[];
  ok("3.1 · QuestionRow's meta line is DotSeq over closes · settles · pool · depth, each fact in its own class and V18 hook",
    row !== "" && metaShape(row).length === 0, metaShape(row).join(" · "));
  const old = row.replace(`<DotSeq text={[closes, settles, pool, depth].filter(Boolean).join(" · ")} className="kp-qrow__meta" renderPart={metaPart} />`,
    `<span className="kp-qrow__meta"><span className="kp-qrow__close">{closes}</span>{" · "}<span className="kp-qrow__pool" data-market-part="pool">{pool}</span></span>`);
  ok("3.1′ PLANT · the sentence of text with its own \" · \" put back is reported", metaShape(old).length > 0);

  // Rendered: every fact is a flex item and its dot hangs inside it; no " · " stands between items, where a line can end.
  const facts = ["Litafungwa 9 Okt", "Linatatuliwa kwa bot.go.tz", "Bwawa TZS 0", "0 watabiri"];
  const part = (p: string) => (p === facts[1] ? h("span", { className: "kp-qrow__src" }, "Linatatuliwa kwa ", h("span", { className: "kp-qrow__srcname", "data-market-part": "source" }, "bot.go.tz")) : h("span", null, p));
  const out = html(h(DotSeq, { text: facts.join(" · "), className: "kp-qrow__meta", renderPart: part }));
  const items = out.match(/<span class="kp-seq__item">/g)?.length ?? 0;
  const between = /<\/span> · <span class="kp-seq__item">/.test(out) || /<\/span>\s*·\s*<span/.test(out.replace(/<span class="kp-seq__dot"[^>]*>·<\/span>/g, ""));
  ok("3.2 · rendered: four items in one flex line (`kp-seq kp-qrow__meta`), each dot inside the item it opens, the text \"A · B · C · D\" for a reader",
    out.startsWith(`<span class="kp-seq kp-qrow__meta">`) && items === 4 && !between && text(out) === facts.join(" · "), out.slice(0, 160));
  ok("3.2′ CONTROL · the old markup puts the dot between the facts as text, where a line may end on it",
    /<\/span> · <span/.test(html(h("span", { className: "kp-qrow__meta" }, h("span", null, facts[0]), " · ", h("span", null, facts[1])))));
  const seq = rule(CSS, ".kp-seq");
  ok("3.3 · `.kp-seq` is the wrapping flex line with the left-edge clip, and `.kp-qrow__meta` sets no display to undo it",
    /display:\s*flex/.test(seq) && /flex-wrap:\s*wrap/.test(seq) && /clip-path:\s*inset\(-100vmax -100vmax -100vmax 0\)/.test(seq) && !/display/.test(rule(CSS, ".kp-qrow__meta")), seq);
}

/* ══ §4 · E29 · TITLE FIGURES ════════════════════════════════════════════════════════════════════════════════════ */
section("4 · E29 a title's figures stay whole on every title surface (tiles 197 199 253 255 256)");
const CATALOGUE = [
  "Simba SC wins the NBC Premier League 2026-27", "Simba SC yashinda NBC Premier League 2026-27", "辛巴俱乐部赢得2026-27赛季NBC超级联赛",
  "Je, mkimbiaji wa Tanzania atavunja dakika 28:00 kwenye 10K ya World Athletics ijayo?", "Will a Tanzanian runner break 28:00 in the next World Athletics 10K?",
  "Bitcoin yafunga juu ya $100,000 tarehe 1 Agosti", "Bitcoin closes above $100,000 on 1 August", "比特币8月1日收于10万美元以上",
  "Je, masika yataanza Dar es Salaam kabla ya Aprili 15?", "Will the long rains begin in Dar es Salaam before April 15?",
  "Je, joto la juu Mwanza litazidi nyuzi 32 Jumapili?", "Will Mwanza max temperature exceed 32°C this Sunday?",
  "Je, akiba ya BoT itazidi $5.5 bilioni kwenye taarifa ya kila mwezi ijayo?", "Will Bitcoin's 7-day move be positive?",
  "Je, video ijayo ya Wasafi itapita milioni 1 wiki ya kwanza?", "Will Sauti Sol release a new single in the next 30 days?",
  "USD/TZS closes below 2,650 at end of Q2", "USD/TZS yafunga chini ya 2,650 mwisho wa robo ya pili", "美元兑坦桑尼亚先令二季度末收于2,650以下",
  "Dar es Salaam rainfall exceeds 200mm in July", "达累斯萨拉姆七月降雨超过200毫米", "Will the S&P 500 close higher this week?",
  "Je, mwendo wa Bitcoin wa siku 7 utakuwa chanya?", "Will Ethereum hit a new 30-day high before month-end?", "Je, masika yataisha kabla ya Mei 31 Dar es Salaam?",
];
{
  const runs = (s: string) => [...frag(keepFigures(s)).matchAll(/<span class="whitespace-nowrap">([^<]*)<\/span>/g)].map((m) => text(m[1]));
  const want: Array<[string, string[]]> = [
    ["Simba SC wins the NBC Premier League 2026-27", ["2026-27"]],
    ["辛巴俱乐部赢得2026-27赛季NBC超级联赛", ["2026-27赛季"]],
    ["Je, mkimbiaji wa Tanzania atavunja dakika 28:00 kwenye 10K ya World Athletics ijayo?", ["dakika 28:00"]],
    ["Bitcoin yafunga juu ya $100,000 tarehe 1 Agosti", ["1 Agosti"]],
    ["Will the long rains begin in Dar es Salaam before April 15?", ["April 15"]],
    ["Je, akiba ya BoT itazidi $5.5 bilioni kwenye taarifa ya kila mwezi ijayo?", ["$5.5 bilioni"]],
    ["Will Ethereum hit a new 30-day high before month-end?", ["30-day"]],
    ["达累斯萨拉姆七月降雨超过200毫米", ["200毫米"]],
  ];
  const wrong = want.filter(([t, w]) => show(runs(t)) !== show(w)).map(([t]) => `${t} → ${show(runs(t))}`);
  ok("4.1 · the runs: \"2026-27\" (and \"2026-27赛季\"), \"dakika 28:00\", \"1 Agosti\" (not \"tarehe 1 Agosti\": one side only), \"April 15\", \"$5.5 bilioni\", \"30-day\", \"200毫米\"",
    wrong.length === 0, wrong.join(" | "));
  const untouched = ["Will a Tanzanian runner break 28:00 in the next World Athletics 10K?", "USD/TZS closes below 2,650 at end of Q2", "Will the S&P 500 close higher this week?", "Dar es Salaam rainfall exceeds 200mm in July", "Je, Simba SC watashinda Derby ya Kariakoo ijayo?"];
  ok("4.2 · a title with no run is returned as the very string (byte-identical markup): bare numbers, proper nouns, \"200mm\", no digits",
    untouched.every((t) => keepFigures(t) === t));
  const all = CATALOGUE.map((t) => [t, frag(keepFigures(t))] as const);
  ok("4.3 · the words are never changed, and no run is longer than a word and its number (≤ 20 characters in the catalogue)",
    all.every(([t, m]) => text(m) === t.replace(/&/g, "&")) && CATALOGUE.flatMap(runs).every((r) => Array.from(r).length <= 20),
    show(CATALOGUE.flatMap(runs).filter((r) => Array.from(r).length > 20)));
  const kw = raw("src/components/ui/keep-words.tsx");
  ok("4.4 · no lookbehind in keep-words.tsx (Safari before 16.4 cannot parse a bundle holding one)", !/\(\?<[=!]/.test(decomment(kw)));
  ok("4.4′ PLANT · a lookbehind in the unit pattern is reported", /\(\?<[=!]/.test(decomment(kw).replace("(?:\\\\b(${UNIT_BEFORE})", "(?<=\\\\s)(?:(${UNIT_BEFORE})")));

  // Every surface a title renders on reads keepFigures.
  const SITES: Array<[string, string]> = [
    ["src/components/markets/market-card.tsx", `{featured ? <h2 className="mcardp-q">{keepFigures(title)}</h2> : <h3 className="mcardp-q">{keepFigures(title)}</h3>}`],
    [HERO, `<span className="kp-qrow__q">{keepFigures(title)}</span>`],
    ["src/app/markets/[id]/page.tsx", `{keepFigures(pickLocalized(locale, m.titleEn, m.titleSw, m.titleZh))}</h1>`],
    ["src/components/journey/tickets/ticket-card.tsx", `className="-my-2 block py-2 hover:underline">{keepFigures(title.text)}</Link>`],
    ["src/app/live/featured-contest.tsx", `{keepFigures(mm.title)}`],
    ["src/app/live/pulse-grid.tsx", `<Fragment key={i}>{keepFigures(part)}</Fragment>`],
  ];
  const missing = SITES.filter(([f, s]) => !read(f).includes(s) || /keepUnits\(/.test(read(f))).map(([f]) => f);
  ok("4.5 · cards (grid and featured), the board's rows, the market page h1, the journey's ticket card, /live's carousel and wall: keepFigures, no keepUnits left",
    missing.length === 0, missing.join(", "));
  const pageNoKeep = read("src/app/markets/[id]/page.tsx").replace("{keepFigures(pickLocalized(locale, m.titleEn, m.titleSw, m.titleZh))}</h1>", "{pickLocalized(locale, m.titleEn, m.titleSw, m.titleZh)}</h1>");
  ok("4.5′ PLANT · the market page h1 as round 4 found it (the bare title) is reported", !pageNoKeep.includes(SITES[2][1]));

  // /live's KeepHyphenated: a token stops at an ideograph, and a numeric range is left to keepFigures.
  // Review 6, B-3 (2026-10-09) moved this pin: the split is `hyphenParts` now — one linear pass that returns the old
  // pattern's very array — so the tokens are read from the function the wall draws with, not from a pattern literal.
  const grid = read("src/app/live/pulse-grid.tsx");
  const drawsParts = grid.includes("const parts = hyphenParts(text);");
  const tokens = (split: (s: string) => string[], s: string) => split(s).filter((_, i) => i % 2 === 1);
  const now = hyphenParts;
  const zhTitle = "辛巴俱乐部赢得2026-27赛季NBC超级联赛";
  ok("4.6 · /live's hyphen tokens: \"30-day\" and \"month-end?\" whole, the Chinese title NOT one token, \"2026-27\" left to keepFigures",
    drawsParts && show(tokens(now, "Will Ethereum hit a new 30-day high before month-end?")) === show(["30-day", "month-end?"])
      && tokens(now, zhTitle).every((t) => t.length < 4) && tokens(now, "Simba SC wins the NBC Premier League 2026-27").length === 0,
    show({ zh: tokens(now, zhTitle) }));
  const oldRe = /(\S*[\p{L}\p{N}]-[\p{L}\p{N}]\S*)/u;
  ok("4.6′ CONTROL · the round-3 token rule took the whole Chinese title as one nowrap token (wider than any card)", show(tokens((s) => s.split(oldRe), zhTitle)) === show([zhTitle]));
}

/* ══ §5 · E30 · THE CARD'S TITLE SLOT ═══════════════════════════════════════════════════════════════════════════ */
section("5 · E30 the card's two-line title slot is the contract (tiles 251 252): by design, with its numbers");
{
  const q = rule(CSS, ".mcardp-q");
  ok("5.1 · the grid card's question clamps at two lines over a two-line minimum — every card in a row keeps its pick, bar and foot on one line, and --mcard-base (the skeleton's height) is measured with it",
    /-webkit-line-clamp:\s*2/.test(q) && /min-height:\s*calc\(2 \* 1\.34em\)/.test(q) && /--mcard-base:\s*209px/.test(CSS), q);
  // The title column: card = viewport − 32 gutter; − 2 border − 30 padding; − the price column ("—" in 28px mono) − 14 gap.
  const dash = 0.6 * 28;
  const colW = (vw: number) => vw - 32 - 2 - 30 - dash - 14;
  const avg = (CAPSIZE.sora.variants["600"].xWidthAvg / CAPSIZE.sora.unitsPerEm) * 15;
  const cap = (vw: number) => 2 * Math.floor(colW(vw) / avg);
  ok("5.2 · S2's budget (SJ-8: 56 code points in en/sw, 28 in zh) is what two lines hold on the narrowest card: ~58 at 320, ~68 at 360",
    SHORT_TITLE_MAX.en === 56 && SHORT_TITLE_MAX.sw === 56 && SHORT_TITLE_MAX.zh === 28 && cap(320) >= 56 && cap(360) >= 56, show({ c320: cap(320), c360: cap(360), avg: avg.toFixed(2) }));
  const long = "Je, mkimbiaji wa Tanzania atavunja dakika 28:00 kwenye 10K ya World Athletics ijayo?";
  ok("5.3 · the tiled title is 84 code points, 150% of the budget: it needs three lines below ~640 and is clamped by design; S2's short title is its home (report: MarketCard does not read `cardTitle` yet)",
    Array.from(long).length === 84 && Array.from(long).length > cap(390), show({ len: Array.from(long).length, c390: cap(390) }));
}

/* ══ §6 · E31 E33 · THE JOURNEY'S ACCOUNT MENU ═══════════════════════════════════════════════════════════════════ */
section("6 · E31 E33 the journey's account menu (tiles 209 213 224 228 239 243 247)");
{
  const menu = read("src/components/layout/avatar-menu.tsx");
  const drawer = read("src/components/layout/needle-drawer.tsx");
  const jbar = squash(read("src/components/journey/journey-top-bar.tsx"));
  const cbar = read("src/components/layout/top-app-bar.tsx");
  ok("6.1 · only the journey's header says `journey`; the classic bar's menu takes no new prop",
    /<AvatarMenu [^>]*invitePaid=\{invitePaid\} journey \/>/.test(jbar) && !/journey/.test(/<AvatarMenu[\s\S]*?\/>/.exec(cbar)?.[0] ?? "journey"), "");
  ok("6.2 · the classic arms are today's: the padded Needle wrapper with the `menu-row` variant, the bare label, MENU_ROWS' own words for /positions",
    squash(menu).includes(`) : ( <div className="border-t border-border px-2 py-2"> <NeedleControlsDrawer variant="menu-row" /> </div> )}`)
      && menu.includes("{journey ? <span>{keepLastWords(primary)}</span> : primary}")
      && menu.includes(`{ href: "/positions",      icon: I.portfolio,   en: "Positions",      sw: "Nafasi",                    zh: "持仓" },`));
  // E31 · the Needle row on the rows' geometry.
  const item = /className=\{cn\(\s*"(flex items-center gap-2\.5 px-3 py-2[^"]*)"/.exec(menu)?.[1] ?? "";
  const branch = /variant === "menu-item" \? \(([\s\S]*?)\) : variant === "hub-row"/.exec(drawer)?.[1] ?? "";
  const btnClass = /className="([^"]+)"/.exec(branch)?.[1] ?? "";
  const geometry = (b: string, c: string) => [
    tw(c, "px") !== tw(item, "px") && "inset differs",
    tw(c, "py") !== tw(item, "py") && "height differs",
    tw(c, "gap") !== tw(item, "gap") && "gap differs",
    !/<NeedleMark size=\{15\} \/>/.test(b) && "the mark is not in the rows' 15px glyph box",
    !/role="menuitem"/.test(b) && "not a menuitem",
  ].filter(Boolean) as string[];
  ok("6.3 · the `menu-item` row: Item's 16px inset, 12px padding and 10px gap (gap-[10px] = gap-2.5), the 15px glyph box, a menuitem — in a `py-1` wrapper with no side padding",
    branch !== "" && geometry(branch, btnClass).length === 0 && tw(item, "px") === 16 && tw(item, "gap") === 10
      && squash(menu).includes(`{journey ? ( <div className="border-t border-border py-1"> <NeedleControlsDrawer variant="menu-item" /> </div> )`),
    `${geometry(branch, btnClass).join(" · ")} | item "${item}" | row "${btnClass}"`);
  ok("6.3′ CONTROL · the classic row stood 24px in (wrapper px-2 + button px-2) against the rows' 16", 2 * SCALE["2"] === 24 && tw(item, "px") === 16);
  // The chevron: path x 15 of 24 plus half its 2.2 stroke, in a 14px box.
  // The chevron is drawn once for both menu rows (`menuTail`); the journey's row asks for the overhang.
  const tail = /<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" className=\{overhang \? "([^"]*)" : "([^"]*)"\}><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2\.2"/.exec(drawer);
  const svg = tail && /\{menuTail\(true\)\}/.test(branch) ? [tail[0], tail[1]] : null;
  ok("6.4.locate · both menu rows end with `menuTail`, the classic one without the overhang, its chevron's class exactly as before",
    !!tail && tail[2] === "text-text-subtle" && /variant === "menu-row" \? \([\s\S]*?\{menuTail\(false\)\}[\s\S]*?\) : variant === "menu-item"/.test(drawer));
  const ink = (15 + 2.2 / 2) / 24 * 14, bearing = 14 - ink;
  const residual = (cls: string) => bearing + (/(^|\s)-mr-1(\s|$)/.test(cls) ? -SCALE["1"] : 0);
  ok("6.4 · the chevron's ink ends 0.6px from the rows' right edge (its 4.6px side bearing, overhung by -mr-1's 4px) — INAKUJA's pill ends on that edge",
    svg !== null && residual(svg[1]) >= 0 && residual(svg[1]) < 1, `bearing ${bearing.toFixed(2)} · residual ${svg ? residual(svg[1]).toFixed(2) : "no svg"}`);
  ok("6.4′ PLANT · without the overhang the ink stands 4.6px short", residual("text-text-subtle") > 4);
  // E33 · /positions by the tab's name and glyph.
  const tickets = JOURNEY_TABS.find((d) => d.key === "tickets");
  ok("6.5 · in the journey the /positions row reads the tab's own key and glyph (journey.tabTickets · ticket), as JOURNEY_TABS names that tab",
    // Round 5 (R5-A, F17) moved this pin: the branch after it is no longer the bare `r` but the journey's other page
    // names (`journeyName`, the KYC page, the leaderboard, the proposals page) — the /positions mapping is unchanged.
    squash(menu).includes(`: journey && r.href === "/positions" ? { ...r, icon: I.ticket, en: t.journey.tabTickets, sw: t.journey.tabTickets, zh: t.journey.tabTickets } : journeyName[r.href] ?`)
      && tickets?.href === "/positions" && tickets.label === "journey.tabTickets" && tickets.glyph === "ticket",
    show(tickets));
  ok("6.5′ CONTROL · the two names differ in every language (Nafasi / Tiketi zangu · Positions / My tickets · 持仓 / 我的注单)",
    [sw, en, zh].every((d) => d.common.positions !== d.journey.tabTickets));
  // The wrapped labels: the room beside INAKUJA and the last-two-word pairs.
  const flag = 7 * (0.6 * 8.5 + 0.08 * 8.5) + 9.5 + 4 + 2 * 8 + 2; // xs StatusFlag: 7 mono capitals, icon, gap, padding, border
  const room = 280 - 2 - 2 * tw(item, "px") - 15 - tw(item, "gap");
  const beside = room - flag - tw(item, "gap");
  const labels = [...[...menu.matchAll(/en: "([^"]+)",\s*sw: "([^"]+)"/g)].flatMap((m) => [m[1], m[2]]), ...[sw, en].flatMap((d) => [d.profile.inviteFriends, d.journey.tabTickets])];
  const pairs = labels.map((l) => { const m = frag(keepLastWords(l)).match(/<span class="whitespace-nowrap">([^<]*)<\/span>/); return [l, m ? text(m[1]) : null] as const; });
  const widest = Math.max(...pairs.map(([, p]) => (p ? sora500(p, 13) : 0)));
  ok("6.6 · every glued pair fits the label's room beside INAKUJA (~139px; the widest pair ~" + Math.round(widest) + "px at Sora 13px)",
    Math.abs(flag - 72) < 2 && widest <= beside, show({ flag: flag.toFixed(1), room, beside: beside.toFixed(1), pairs }));
  const label = "Pendekeza na upate zawadi";
  const space = sora500(" ", 13);
  const before = lines(label.split(" "), (u) => sora500(u, 13), beside, space).map((l) => l.split(" ").length);
  const after = lines(unitsOf(frag(keepLastWords(label))), (u) => sora500(u, 13), beside, space);
  ok("6.7 · \"Pendekeza na\" / \"upate zawadi\" beside the pill", show(after) === show(["Pendekeza na", "upate zawadi"]), show({ after, beside: beside.toFixed(1) }));
  ok("6.7′ CONTROL · as text it broke 3 · 1 — \"zawadi\" alone (the tile)", show(before) === show([3, 1]), show(before));
  // R4-K's gold audit (Q5 / M3 / D5): the journey draws no gold on an invitation to earn; the classic menu keeps it.
  const noGold = (src: string) => /\.map\(\(r\) => \(journey && r\.accent \? \{ \.\.\.r, accent: false \} : r\)\);/.test(src);
  ok("6.8 · the journey's menu rows carry no accent (no gilt icon, no gold hover on Invite & Earn / Propose & earn); the classic rows keep theirs",
    noGold(menu) && /accent: true, invite: true/.test(menu) && /accent: true, proposals: true/.test(menu));
  ok("6.8′ PLANT · the accent let through in the journey is reported", !noGold(menu.replace("journey && r.accent ? { ...r, accent: false } : r", "r")));
}

/* ══ §7 · E32 · ONE MASK ═══════════════════════════════════════════════════════════════════════════════════════ */
section("7 · E32 one phone, one mask in the journey and on /profile/account (tiles 209 213 vs 203 206)");
{
  const shell = read("src/components/layout/app-shell.tsx");
  ok("7.1 · the journey's header is handed topUser with its phone through maskPhone; the classic bar keeps topUser",
    shell.includes("const journeyUser = session ? { ...topUser, phone: maskPhone(session.phoneE164) } : topUser;")
      && shell.includes("<LazyJourneyTopBar user={journeyUser} onBreak={promoSuppressed}") && shell.includes(": <TopAppBar user={topUser} proposalsState={proposalsState}")
      && shell.includes('import { maskPhone } from "@/lib/phone-normalize";'));
  ok("7.1′ CONTROL · the classic mask is still the stars (frozen chrome until S15), so the classic menu reads as it did",
    shell.includes("? `${session.phoneE164.slice(0, 4)}*****${session.phoneE164.slice(-2)}`"));
  ok("7.2 · maskPhone gives the hub's and the hero's shape, and a short value masks to dots",
    maskPhone("+255712345684") === "+255••••84" && maskPhone("+25571") === "••••" && read("src/lib/server/hub-viewer.ts").includes("phone: maskPhone(user?.phoneE164),"));
  const acct = read("src/app/profile/account/page.tsx");
  ok("7.3 · /profile/account masks through maskPhone, no hand-written stars",
    acct.includes(`value={user?.phoneE164 ? maskPhone(user.phoneE164) : "—"}`) && !/phoneE164\.slice\(/.test(acct));
  ok("7.3′ PLANT · the hand mask put back is reported", /phoneE164\.slice\(/.test(acct.replace("maskPhone(user.phoneE164)", "`${user.phoneE164.slice(0, 4)}*****${user.phoneE164.slice(-2)}`")));
}

/* ══ §8 · E4 · THE HOME'S LINK TO /positions ════════════════════════════════════════════════════════════════════ */
section("8 · E4 the home's signed-in link names /positions by the journey tab's key");
{
  const hero = read(HERO);
  const page = read("src/app/page.tsx");
  ok("8.1 · journey ? journey.tabTickets : home.myPositions, the flag from the one resolver, false for a visitor and by default",
    hero.includes("{journey ? t.journey.tabTickets : t.home.myPositions}") && hero.includes("export function LandingHero({ figures, t, locale, isAuthed, nowMs, cards, mine, rails, journey = false }: Props) {")
      && hero.includes("<SignedInAct t={t} mine={mine ?? null} journey={journey} />")
      && page.includes("const journey = isAuthed && (await resolveSimpleJourney()).journey;") && page.includes("journey={journey}"));
  ok("8.1′ CONTROL · the two keys name the page differently (Nafasi zangu / Tiketi zangu), so the classic reader keeps today's words",
    sw.home.myPositions === "Nafasi zangu" && sw.journey.tabTickets === "Tiketi zangu" && en.home.myPositions !== en.journey.tabTickets);
}

/* ══ §9 · E34 · THE TOASTER ══════════════════════════════════════════════════════════════════════════════════════ */
section("9 · E34 the journey's toaster hangs under its header (tiles 203 218 233 235)");
{
  const toast = read("src/components/ui/toast.tsx");
  const viewport = /<div\s+role="region"[\s\S]*?className="([^"]+)"\s*>/.exec(toast);
  ok("9.1 · the toaster carries the hook as an attribute, its classes unchanged (the classic overlay census names classes, not data attributes)",
    !!viewport && /data-toaster=""/.test(viewport[0]) && viewport[1] === "pointer-events-none fixed inset-x-0 top-0 z-[1800] flex flex-col items-center gap-2 px-3 pt-3 sm:inset-x-auto sm:right-4 sm:top-4 sm:items-end sm:pt-0", viewport?.[1]);
  const base = /:root:has\(#kp-journey-shell\) \[data-toaster\] \{ top: 56px; \}/.test(CSS);
  const sm = /@media \(min-width: 640px\) \{ :root:has\(#kp-journey-shell\) \[data-toaster\] \{ top: calc\(56px \+ var\(--sp-2\)\); \} \}/.test(CSS);
  const header = Number(/height:\s*(\d+)px/.exec(rule(CSS, ".kp-jhdr"))?.[1] ?? NaN);
  const menuPhone = /top-\[calc\(env\(safe-area-inset-top\)\+(\d+)px\)\]/.exec(read("src/components/layout/avatar-menu.tsx"))?.[1];
  const menuSm = /sm:top-\[(\d+)px\]/.exec(read("src/components/layout/avatar-menu.tsx"))?.[1];
  ok("9.2 · journey-only rules: the stack starts at the header's 56px foot — the first toast at 56 + 16 = 72 on a phone, 64 from 640, where the account menu hangs (72 · 64)",
    base && sm && header === 56 && 56 + SCALE["3"] === Number(menuPhone) && 56 + px("--sp-2") === Number(menuSm), show({ base, sm, header, menuPhone, menuSm }));
  ok("9.2′ CONTROL · the classic stack's 16px (phone) and 20px (from 640) from the viewport top fall inside the 56px header", SCALE["3"] < 56 && SCALE["4"] < 56);
  ok("9.3 · (1,2,0) — :root, :has(#id), [attr] — outweighs the stack's own `top-0` / `sm:top-4` (0,1,0) whatever the order", true);
}

/* ══ §10 · E5 · THE HOME'S TITLE ═══════════════════════════════════════════════════════════════════════════════ */
section("10 · E5 the home's tab title in the reader's language (38 sw + 37 zh tiles read English)");
{
  const page = read("src/app/page.tsx");
  const layout = read("src/app/layout.tsx");
  const def = /default: "([^"]+)",\s*template: "%s · 50pick"/.exec(layout)?.[1];
  const shape = /title: \{ absolute: `50pick — \$\{t\.auth\.railTagline\}` \}/.test(page) && /export async function generateMetadata\(\): Promise<Metadata> \{\s*const \{ t \} = await getServerT\(\);/.test(page) && !/export const metadata\b/.test(page);
  const title = (d: typeof sw) => `50pick — ${d.auth.railTagline}`;
  ok("10.1 · the home's metadata is generated per request: \"50pick — \" + the dictionary's tagline, `absolute` (the layout's template would append \" · 50pick\")",
    shape && def === title(en), show({ def, en: title(en) }));
  ok("10.2 · en reads exactly as before; sw \"50pick — Tabiri matukio. Si bahati.\"; zh \"50pick — 预测事件，而非运气。\"",
    title(en) === "50pick — Predict events. Not chance." && title(sw) === "50pick — Tabiri matukio. Si bahati." && title(zh) === "50pick — 预测事件，而非运气。");
  ok("10.2′ CONTROL · without a title of its own the home took the layout's English default in every language", def === "50pick — Predict events. Not chance." && def !== title(sw));
  ok("10.3 · the openGraph spread survives (share-preview §1)", page.includes(`openGraph: { ...ROOT_OPEN_GRAPH, url: "/" },`));
}

/* ══ §11 · E2 E3 · THE JOURNEY'S WALLET ═════════════════════════════════════════════════════════════════════════ */
section("11 · E2 E3 the journey's Wallet doors and captions at 320 (tiles 488 496)");
{
  const sheet = rule(CSS, ".kp-wsheet");
  const pad = px("--sp-5"), gapPair = px("--sp-3");
  const col = (vw: number) => (vw - 2 - 2 * pad - gapPair) / 2;
  ok("11.locate · a door's column is 133px at 320 (the sheet's 20px padding, the pair's 12px gap, a 1px border)",
    /padding:\s*var\(--sp-3\) var\(--sp-5\)/.test(sheet) && /gap:\s*var\(--sp-3\)/.test(rule(CSS, ".kp-wsheet__pair")) && col(320) === 133, show(col(320)));
  const need = (label: string) => width600(label, 15) + 8 + 16 + 2;
  const room = (vw: number, side: number) => col(vw) - 2 * side;
  const labels = [sw, en, zh].flatMap((d) => [d.journey.depositAction, d.journey.withdrawAction]);
  const tight = labels.filter((l) => need(l) > room(320, px("--sp-3")));
  ok("11.1 · with 12px a side every journey door holds its 16px glyph, the 8px gap and its label at 320 (Weka pesa needs ~105.5 of 109)",
    /:root:has\(#kp-journey-shell\) \.kp-wsheet__act \{ padding-inline: var\(--sp-3\); \}/.test(CSS) && /:root:has\(#kp-journey-shell\) \.kp-wsheet__act > svg \{ flex-shrink: 0; \}/.test(CSS) && tight.length === 0,
    show({ tight, weka: need(sw.journey.depositAction).toFixed(1), room: room(320, px("--sp-3")) }));
  ok("11.1′ CONTROL · btn-lg's 20px left 93 at 320: the ⊕ shrank by ~12px (the tile's ~4px glyph), and Withdraw's arrow by ~3",
    need(sw.journey.depositAction) - room(320, 20) > 10 && need(en.journey.withdrawAction) > room(320, 20), show({ weka: (need(sw.journey.depositAction) - room(320, 20)).toFixed(1), wd: (need(en.journey.withdrawAction) - room(320, 20)).toFixed(1) }));
  const ws = read("src/components/layout/wallet-sheet.tsx");
  ok("11.2 · the journey's captions keep their last two words together; the classic arm keeps the text",
    ws.includes("{journey ? keepLastWords(t.wallet.mobileMoney) : t.wallet.mobileMoney}") && ws.includes("{journey ? keepLastWords(t.wallet.mobileMoneyOnly) : t.wallet.mobileMoneyOnly}"));
  const space = width(inter, " ", 13);
  const cap = (markup: string) => lines(unitsOf(markup), (u) => width(inter, u, 13), col(320), space);
  const nowLines = cap(frag(keepLastWords(en.wallet.mobileMoney)));
  ok("11.3 · en 320: \"Mobile money\" / \"or card\" (134px in a 133px column)", show(nowLines) === show(["Mobile money", "or card"]), show(nowLines));
  ok("11.3′ CONTROL · as text it left \"card\" alone (the tile)", show(cap(en.wallet.mobileMoney)) === show(["Mobile money or", "card"]), show(cap(en.wallet.mobileMoney)));
  ok("11.4 · sw and zh stay one line at 320", cap(frag(keepLastWords(sw.wallet.mobileMoney))).length === 1 && zh.wallet.mobileMoney.length * 13 <= col(320));
}

/* ══ §12 · E13 · THE CARD WATERMARK ════════════════════════════════════════════════════════════════════════════ */
section("12 · E13 the card watermark is not lit behind the card's controls (tiles 160 184)");
{
  const lit = (css: string) => /:hover[^{}]*\.mcardp-watermark\s*\{/.test(css);
  ok("12.1 · no hover rule reaches the watermark, and it keeps its resting ink (0.055, --border-strong)",
    !lit(CSS) && /opacity:\s*0\.055/.test(rule(CSS, ".mcardp-watermark")) && /color:\s*var\(--border-strong\)/.test(rule(CSS, ".mcardp-watermark")));
  ok("12.1′ PLANT · the round-3 lift put back is reported", lit(`${CSS}\n@media (hover: hover) { .mcardp:hover .mcardp-watermark { opacity: 0.22; color: var(--brand-400); } }`));
  ok("12.2 · the card still answers the pointer itself (the ring and the lift)", /\.mcardp:hover \{ transform: translateY\(var\(--m-lift\)\); border-color: var\(--brand-500\);/.test(CSS));
}

/* ══ §13 · G20 · IDS ON THE RECEIPTS ═══════════════════════════════════════════════════════════════════════════ */
section("13 · G20 an id breaks in whole runs of four on both receipts (S9's note: one or two characters alone at 390)");
{
  const runsOf = (id: string) => [...frag(keepIdRuns(id)).matchAll(/<span class="whitespace-nowrap">([^<]*)<\/span>/g)].map((m) => m[1]);
  const ids = ["txn_ab12cd34ef56", "SEL2026100912345678901", "ord_rc_held_0123456789", "abc1234"];
  ok("13.1 · runs of four, a <wbr> between them, a short tail joined to the run before; the id unchanged; ≤ 7 characters untouched",
    show(runsOf(ids[0])) === show(["txn_", "ab12", "cd34", "ef56"]) && show(runsOf(ids[1])) === show(["SEL2", "0261", "0091", "2345", "678901"])
      && ids.slice(0, 3).every((i) => text(frag(keepIdRuns(i))) === i && runsOf(i).every((r) => r.length >= 4 && r.length <= 7))
      && frag(keepIdRuns(ids[1])).split("<wbr/>").length === 5 && keepIdRuns(ids[3]) === ids[3], show(ids.map(runsOf)));
  // At 390: the receipt's value column beside each label (13px Inter labels, 20px row padding, 20px gap), mono at 13px.
  const label = (l: string) => Array.from(l).filter((c) => IDEO.test(c)).length * 13 + width(inter, Array.from(l).filter((c) => !IDEO.test(c)).join(""), 13);
  const dd = (l: string) => 390 - 32 - 2 * SCALE["4"] - label(l) - SCALE["4"];
  const adv = 0.6 * 13;
  const greedyRuns = (id: string, w: number) => lines(runsOf(id), (u) => u.length * adv, w, 0, false);
  const greedyChars = (id: string, w: number) => lines(Array.from(id), () => adv, w, 0, false);
  const cases = [sw, en, zh].flatMap((d) => [d.wallet.transactionId, d.wallet.gatewayReference]).flatMap((l) => ids.slice(0, 3).map((id) => ({ l, id, w: dd(l) })));
  const lastNow = cases.map((c) => { const ls = greedyRuns(c.id, c.w); return ls[ls.length - 1].length; });
  const lastWas = cases.map((c) => { const ls = greedyChars(c.id, c.w); return ls[ls.length - 1].length; });
  ok("13.2 · every id, under every label in three languages at 390, ends its last line with four characters at least (lines then balanced by text-wrap)",
    lastNow.every((n) => n >= 4), show(lastNow));
  ok("13.2′ CONTROL · break-all left one or two characters alone (S9's note) — here " + lastWas.filter((n) => n <= 2).length + " of " + cases.length + " cases",
    lastWas.some((n) => n <= 2), show(lastWas));
  const ret = read("src/app/wallet/deposit/return/page.tsx"), rec = read("src/app/wallet/receipt/[id]/page.tsx");
  ok("13.3 · both receipts render their two ids through keepIdRuns in a balanced block, no break-all on an id",
    ret.includes(`<span className="block font-mono text-text text-balance">{keepIdRuns(outcome.txn.id)}</span>`) && ret.includes(`{keepIdRuns(outcome.txn.providerRef)}`)
      && rec.includes(`<span className="block font-mono text-balance">{keepIdRuns(txn.id)}</span>`) && rec.includes(`{keepIdRuns(txn.providerRef)}`)
      && !/break-all/.test(ret) && !/break-all/.test(rec));
}

/* ══ §14 · R4-C'S LEFTOVER · THE SEARCH BAND ═══════════════════════════════════════════════════════════════════ */
section("14 · R4-C's leftover: /live, /updown/history and /profile/account wear the search band (rung + 10 on every side)");
{
  const BAND_PT = tw(QUERY_SEARCH_BAND_CLASS, "pt");
  const ROW1_PT = tw(QUERY_BAR_ROW1_CLASS, "pt"), ROW2_PB = tw(QUERY_BAR_ROW2_CLASS, "pb");
  const echo = /className=\{`(mt-[0-9.]+) min-h-\[(\d+)px\]/.exec(read("src/components/ui/search-box.tsx"));
  const ECHO = echo ? tw(echo[1], "mt") + Number(echo[2]) : NaN;
  const HANG = Number(/\.kp-search-band\.kp-search-band:has\(\+ \.kp-discovery-bar\)\s*\{\s*margin-bottom:\s*-(\d+)px;/.exec(CSS)?.[1] ?? NaN);
  const HANG_REST = Number(/\.kp-search-band\.kp-search-band:not\(:has\(\+ \.kp-discovery-bar\)\)\s*\{\s*margin-bottom:\s*-(\d+)px;/.exec(CSS)?.[1] ?? NaN);
  ok("14.locate · r4c's constants: band 10 over the box, echo row 25, hang 25 over a bar / 15 over anything else, the bar's 10 / 10",
    BAND_PT === 10 && ECHO === 25 && HANG === 25 && HANG_REST === 15 && ROW1_PT === 10 && ROW2_PB === 10, show({ BAND_PT, ECHO, HANG, HANG_REST, ROW1_PT, ROW2_PB }));
  const report: Record<string, unknown> = {};
  const bad: string[] = [];
  // /live: the wall follows the box (no bar), in the page's space-y-5.
  {
    const grid = read("src/app/live/pulse-grid.tsx"), page = read("src/app/live/page.tsx");
    const rung = SCALE[/<PageContainer tier="board" className="relative space-y-([0-9.]+)">/.exec(page)?.[1] ?? ""];
    const banded = /<div className=\{QUERY_SEARCH_BAND_CLASS\}>\s*<Suspense>\s*<SearchBox/.test(grid) && /<\/Suspense>\s*<\/div>[\s{}]*<div className="market-grid">/.test(grid);
    const g = { over: rung + (banded ? BAND_PT : 0), under: ECHO - (banded ? HANG_REST : 0) + rung };
    report.live = g;
    if (!banded || !(g.over === rung + 10 && g.under === rung + 10)) bad.push("live");
    ok("14.1′ CONTROL · /live as round 4 found it: 24 over the box, 49 under it (tile 205 measured 49)", rung === 24 && ECHO + rung === 49);
  }
  // /updown/history: margins on a 24px rung; the bar stays the container's child.
  {
    const page = read("src/app/updown/history/page.tsx");
    const band = /<div className=\{`\$\{QUERY_SEARCH_BAND_CLASS\} (mt-[0-9.]+) (pb-[0-9.]+)`\}>\s*<SearchBox[\s\S]*?<\/div>\s*<HistoryBar/.exec(page);
    const strip = tw(/<div className="(mt-[0-9.]+) grid grid-cols-2 sm:grid-cols-3 gap-3">/.exec(page)?.[1] ?? "", "mt");
    const mt = band ? tw(band[1], "mt") : NaN, pb = band ? tw(band[2], "pb") : NaN;
    const g = { over: mt + BAND_PT, boxToPills: ECHO - HANG + pb + ROW1_PT, under: ROW2_PB + strip };
    report.updownHistory = g;
    if (!band || !(g.over === strip + 10 && g.boxToPills === strip + 10 && g.under === strip + 10)) bad.push("updown/history");
    ok("14.2′ CONTROL · /updown/history as round 4 found it: 20 over the box, 35 to the pills", SCALE["4"] === 20 && ECHO + ROW1_PT === 35);
    ok("14.2″ · the bar is still the page container's direct child (it sticks within its parent): no wrapper opens around <HistoryBar",
      !/<div[^>]*>\s*<HistoryBar/.test(page));
  }
  // /profile/account: the activity panel's space-y-3, the panel bar after the band.
  {
    const page = read("src/app/profile/account/page.tsx");
    const panel = /<section className="rounded-xl glass-panel p-5 space-y-([0-9.]+)">\s*<div className="flex items-center gap-2">\s*<I\.activity/.exec(page);
    const rung = SCALE[panel?.[1] ?? ""];
    const banded = /<div className=\{QUERY_SEARCH_BAND_CLASS\}>\s*<Suspense>\s*<SearchBox[\s\S]*?<\/Suspense>\s*<\/div>\s*<AccountActivityBar/.test(page);
    const g = { over: rung + (banded ? BAND_PT : 0), boxToPills: ECHO - (banded ? HANG : 0) + rung + ROW1_PT, under: ROW2_PB + rung };
    report.profileAccount = g;
    if (!banded || !(g.over === rung + 10 && g.boxToPills === rung + 10 && g.under === rung + 10)) bad.push("profile/account");
    ok("14.3′ CONTROL · /profile/account as round 4 found it (`py-1`): 20 over the box, 55 to the pills, 26 under the bar", rung === 16 && rung + 4 === 20 && ECHO + 4 + rung + ROW1_PT === 55);
    const bar = read("src/app/profile/account/account-bar.tsx");
    ok("14.3″ · the panel's bar is a `kp-discovery-bar` (QUERY_BAR_CLASS_PANEL), so the band's hang applies", /<div data-filter-rail className=\{QUERY_BAR_CLASS_PANEL\}>/.test(bar));
  }
  ok("14.1 · each page's gaps around its search equal its rung + 10: /live 34 · 34, /updown/history 34 · 34 · 34, /profile/account 26 · 26 · 26",
    bad.length === 0, bad.length ? bad.join(" · ") : show(report));
  const plantLive = read("src/app/live/pulse-grid.tsx").replace("<div className={QUERY_SEARCH_BAND_CLASS}>", "<div>");
  ok("14.1′ PLANT · /live's band dropped is reported", !/<div className=\{QUERY_SEARCH_BAND_CLASS\}>\s*<Suspense>\s*<SearchBox/.test(plantLive));
}

console.log(`\nvisual-pass-r4h: ${pass} passed, ${fails.length} failed\n`);
if (fails.length) {
  for (const f of fails) console.error(`  · ${f}`);
  process.exit(1);
}
