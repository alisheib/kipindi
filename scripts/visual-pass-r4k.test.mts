/**
 * ROUND 4 OF THE VISUAL PASS, HELPER K (2026-10-09) — the not-found pages, the centred Chinese line, the market page's
 * watermark and clock, and the gold on them: every fix held beside a control or a plant that proves the check can fail.
 *
 *   npx tsx scripts/visual-pass-r4k.test.mts            (npm run test:visual-pass-r4k)
 *   npx tsx scripts/visual-pass-r4k.test.mts --prove    (npm run red:visual-pass-r4k — the mutation proof: each defect
 *                                                        is written into its real file, this suite is run on it and must
 *                                                        fail on that check, and the file is restored byte-identical)
 *
 * The owner's rule (Ali, 2026-10-08): only perfect visual and logical results. The findings are triage-r4 "EDGES"
 * (tiles S/edges/tiles 345–434); each section names its finding, the measurement, and the file that fixes it.
 *   §1 one not-found everywhere (E43 E44): one view, one card order, one link colour, no gold, the root page's words
 *   §2 the not-found's title, in the page's language, with noindex in the head (E47) — and the framework's own lines
 *   §3 the heading and the hint break whole (E42), computed for the Chinese hint at every width
 *   §4 a Chinese mark that ends a centred line hangs its empty part (E50)
 *   §5 the wave fades out (E46)
 *   §6 the content edge is the house gutter (E51)
 *   §7 the market question's column ends before the watermark (E49)
 *   §8 gold is money: the clock's labels, the market panel's eyebrow, the not-found (the gold audit)
 *   §9 E48: the "404" a player's 404 page logs is its own Server Action, answered with the page's status
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { decomment, decommentCss } from "./lib/decomment.mts";
import { dict as DICTS } from "../src/lib/i18n-dict.ts";
import { NotFoundView } from "../src/components/ui/not-found-view.tsx";
// ⚠️ MOVED IN ROUND 5 (R5-D, review G1's sibling): the view is client code, so its words and title live in a data module
// a server file can read (`not-found-words.ts`; `test:visual-pass-r5d` §4).
import { NOT_FOUND_WORDS, notFoundTitle } from "../src/components/ui/not-found-words.ts";
import { hangCjkMarks, CJK_MARK_TRIM, CJK_TRIM_EM } from "../src/lib/cjk-marks.tsx";
import { emptyStateBody } from "../src/components/ui/empty-state-text.ts";
import twConfigModule from "../tailwind.config.ts";
import { MUTATIONS } from "./anchors/visual-pass-r4k.anchors.mjs";

const SELF = "scripts/visual-pass-r4k.test.mts";
const PROVE = process.argv.includes("--prove");

let pass = 0;
const fails: string[] = [];
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};
const section = (s: string) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 100 - s.length))}`);
const read = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
// Source and the stylesheet through the shared scanners (scripts/lib/decomment.mts) — never a private stripper.
const code = (p: string) => decomment(read(p));
const css = decommentCss(read("src/app/globals.css"));
const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);
const twConfig = ((twConfigModule as unknown as { default?: typeof twConfigModule }).default ?? twConfigModule);
const SPACE = (twConfig.theme?.extend?.spacing ?? {}) as Record<string, string>;
const tw = (key: string) => parseFloat(SPACE[key] ?? "NaN");
const FONT_SIZE = (twConfig.theme?.extend?.fontSize ?? {}) as Record<string, [string, unknown]>;
const rung = (key: string) => parseFloat(FONT_SIZE[key]?.[0] ?? "NaN");
/** One rule's declarations, by its exact selector at the start of a line; the first match. */
function rule(src: string, selector: string): string {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = new RegExp(`(?:^|\\n)\\s*${esc}\\s*\\{([^}]*)\\}`).exec(src);
  return m ? m[1] : "";
}
const ROOT_PX: Record<string, number> = {};
for (const m of read("src/app/globals.css").matchAll(/(--(?:sp-[0-9]+|w-form)):\s*([0-9.]+)px/g)) ROOT_PX[m[1]] ??= Number(m[2]);

// The repo's own fonts (src/lib/server/reports/fonts) — the faces `--font-mono` and `--font-body` load, read for metrics.
const fontkit = createRequire(import.meta.url)("fontkit") as {
  openSync: (p: string) => { unitsPerEm: number; glyphForCodePoint: (c: number) => { advanceWidth: number }; layout: (s: string) => { advanceWidth: number } };
};
const JBM = fontkit.openSync("src/lib/server/reports/fonts/JetBrainsMono-Regular.ttf");
const JBM_BOLD = fontkit.openSync("src/lib/server/reports/fonts/JetBrainsMono-Bold.ttf");
const INTER = fontkit.openSync("src/lib/server/reports/fonts/Inter-Regular.ttf");
const spaceEm = (f: typeof JBM) => f.glyphForCodePoint(0x20).advanceWidth / f.unitsPerEm;

/**
 * Microsoft YaHei, measured from its own advance (GDI+ GenericTypographic at 200px, 2026-10-09, this PC — the face the
 * edges tiles were drawn in): where each mark's ink ends inside its 1em, and where an ideograph's begins.
 */
const YAHEI = { inkStart: 0.015, rightEmpty: { "。": 0.690, "，": 0.695, "、": 0.700, "；": 0.685, "：": 0.685, "！": 0.685, "？": 0.530 } as Record<string, number> };
/** A centred one-line run's ink-centre offset from its box's centre, in px: (left gap − right gap) / 2. */
const inkOffset = (px: number, endMark: string, trim: number) => ((YAHEI.inkStart - (YAHEI.rightEmpty[endMark] - trim)) / 2) * px;

/* ══ §1 · ONE NOT-FOUND ═══════════════════════════════════════════════════════════════════════════════════════════════ */
section("1 · one not-found everywhere — one view, one order, one link colour, no gold (E43 E44; tiles 345–398)");
const ROUTES = {
  root: "src/app/not-found.tsx",
  market: "src/app/markets/[id]/not-found.tsx",
  proposal: "src/app/proposals/[id]/not-found.tsx",
} as const;
const VIEW = "src/components/ui/not-found-view.tsx";
const view = code(VIEW);
const viewMarkup = view.slice(view.indexOf("export function NotFoundView"));
/** A not-found route that draws markup of its own (the second design) rather than the one view. */
const ownMarkup = (c: string) => /<nav\b|FiftyMark|BrandTopo|text-gold|grid-cols/.test(c);
for (const [name, p] of Object.entries(ROUTES)) {
  const c = code(p);
  ok(`1.1 · ${name} renders the one view (${p})`, c.includes(`from "@/components/ui/not-found-view"`) && /<NotFoundView\b/.test(c) && !ownMarkup(c));
}
const pages = (["sw", "en", "zh"] as const).map((l) => ({ l, out: html(h(NotFoundView, { words: NOT_FOUND_WORDS[l], recoveryLabel: DICTS[l].error.recoveryLinks })) }));
for (const { l, out } of pages) {
  const hrefs = [...out.matchAll(/<a [^>]*href="([^"]+)"/g)].map((m) => m[1]);
  const w = NOT_FOUND_WORDS[l];
  ok(`1.2 · ${l}: the kicker, the heading and the three cards in ONE order — Home · Markets · Help — then the one way out`,
    out.includes(`>${w.notFoundCode} · ${w.notFound}</p>`) && out.includes(`>${w.notFoundBody}</h1>`)
      && hrefs.join(" ") === "/ /markets /help /markets"
      && out.indexOf(`>${w.home}</p>`) < out.indexOf(`>${w.markets}</p>`) && out.indexOf(`>${w.markets}</p>`) < out.indexOf(`>${w.help}</p>`),
    hrefs.join(" "));
  ok(`1.3 · ${l}: one link colour (brand-300), and no gold anywhere on the page`,
    (out.match(/text-brand-300 hover:text-brand-200/g) ?? []).length === 1 && !/gold|gilt/.test(out));
}
const proposal = html(h(NotFoundView, { words: NOT_FOUND_WORDS.sw, recoveryLabel: DICTS.sw.error.recoveryLinks, way: { href: "/proposals", label: DICTS.sw.error.backToProposals } }));
ok("1.4 · the proposal not-found is the same page with its own way out: the same three cards, then ‘Rudi kwenye mapendekezo’",
  [...proposal.matchAll(/<a [^>]*href="([^"]+)"/g)].map((m) => m[1]).join(" ") === "/ /markets /help /proposals" && proposal.includes(`>${DICTS.sw.error.backToProposals}<svg`));
ok("1.4b · …and its route passes exactly that", /way=\{\{ href: "\/proposals", label: t\.error\.backToProposals \}\}/.test(code(ROUTES.proposal)));
ok("1.5 · E44: the English heading types a typographic apostrophe — ‘couldn’t’ — and no word on the page a straight one",
  NOT_FOUND_WORDS.en.notFoundBody === "We couldn’t find that page" && !Object.values(NOT_FOUND_WORDS.en).some((s) => s.includes("'")));
// The words are the ones the product already ships: the dictionary's own error.* sentences, the only difference the
// apostrophe the dictionary's English types straight (S12 owns that key), so no word here is new.
{
  const d = (l: "sw" | "en" | "zh") => ({ notFoundCode: DICTS[l].error.notFoundCode, notFound: DICTS[l].error.notFound, notFoundBody: DICTS[l].error.notFoundBody, notFoundHint: DICTS[l].error.notFoundHint, home: DICTS[l].common.home, markets: DICTS[l].common.markets, help: DICTS[l].common.help, browseOpenMarkets: DICTS[l].error.browseOpenMarkets });
  const same = (l: "sw" | "en" | "zh") => Object.entries(d(l)).filter(([k, v]) => (NOT_FOUND_WORDS[l] as Record<string, string>)[k] !== v).map(([k]) => k);
  ok("1.6 · sw and zh: every word is the dictionary's own (error.*, common.home/markets/help)", same("sw").length === 0 && same("zh").length === 0, `${same("sw")} ${same("zh")}`);
  ok("1.6b · en: the same, but for the dictionary's straight apostrophe in error.notFoundBody (S12)",
    same("en").join() === "notFoundBody" && DICTS.en.error.notFoundBody.replace("'", "’") === NOT_FOUND_WORDS.en.notFoundBody);
}
{
  const OLD_MARKET = `<div className="mb-5"><FiftyMark size={64} /></div><p className="font-mono text-micro font-bold uppercase tracking-[0.20em] text-gold-300">{t.error.notFoundCode}</p><nav aria-label={t.error.recoveryLinks} className="mt-6 grid w-full max-w-[420px] grid-cols-1 gap-2 sm:grid-cols-3"><Link href="/markets">`;
  ok("1.1′ PLANT · the shipped market page's own markup (a gold 404, Masoko first) is reported by 1.1's test", ownMarkup(OLD_MARKET));
}

/* ══ §2 · THE TITLE ═══════════════════════════════════════════════════════════════════════════════════════════════════ */
section("2 · the not-found's title in the page's language, noindex in the head (E47; tiles 345–398)");
{
  const root = code(ROUTES.root);
  ok("2.1 · the root not-found's metadata: its own title key in the visitor's language, and noindex/nofollow",
    /export async function generateMetadata\(\)/.test(root)
      && root.includes("return { title: notFoundTitle(NOT_FOUND_WORDS[locale]), robots: { index: false, follow: false } };"));
  ok("2.2 · the title reads ‘Hakuna ukurasa · 404’ / ‘Page not found · 404’ / ‘页面未找到 · 404’",
    notFoundTitle(NOT_FOUND_WORDS.sw) === "Hakuna ukurasa · 404" && notFoundTitle(NOT_FOUND_WORDS.en) === "Page not found · 404" && notFoundTitle(NOT_FOUND_WORDS.zh) === "页面未找到 · 404");
  for (const p of [ROUTES.market, ROUTES.proposal]) {
    const c = code(p);
    ok(`2.3 · ${p} exports the root's metadata — the not-found convention reads the DEEPEST not-found's, and these had none`,
      c.includes(`import { generateMetadata as notFoundMetadata } from "@/app/not-found";`) && /export async function generateMetadata\(\) \{\s*return notFoundMetadata\(\);\s*\}/.test(c));
  }
  // ⚠️ 2.4–2.6 MOVED IN ROUND 5 (review F1, R5-D): the market's metadata no longer calls notFound() — Next renders a
  // notFound() thrown in generateMetadata as the not-found PAGE, so a failed read there 404'd a real market. All three
  // record pages now answer the not-found's metadata for a missing record, the board's title in the reader's language
  // for a failed read, and throw nothing (`test:visual-pass-r5d` §1 holds the rule with its plants).
  const market = code("src/app/markets/[id]/page.tsx");
  const mMeta = market.slice(market.indexOf("export async function generateMetadata"), market.indexOf("export default async function"));
  ok("2.4 · the market page's metadata answers the not-found's own metadata for a missing market (the deepest not-found's, 2.3, the same words) — and never throws notFound() (round 5, F1)",
    /let m: [^;]+= null;\s*try \{ m = await getMarket\(id\); \} catch \{ return \{ title: t\.market\.title \}; \}\s*if \(!m\) return notFoundMetadata\(\);/.test(mMeta)
      && !/\bnotFound\(\)/.test(mMeta) && market.includes(`import { generateMetadata as notFoundMetadata } from "@/app/not-found";`));
  const ud = code("src/app/updown/[roundId]/page.tsx");
  const udMeta = ud.slice(ud.indexOf("export async function generateMetadata"), ud.indexOf("export default async function"));
  ok("2.5 · /updown/[roundId]: a round the read did not find is titled by the not-found; a FAILED read keeps the board's neutral title, in the reader's language (round 5: was the English ‘Up & Down’)",
    /try \{\s*d = await getRoundDetail\(roundId\);\s*\} catch \{ return \{ title: t\.market\.udTitle \}; \}\s*if \(!d\) return notFoundMetadata\(\);/.test(udMeta)
      && !/\.catch\(\(\) => null\)/.test(udMeta) && ud.includes(`import { generateMetadata as notFoundMetadata } from "@/app/not-found";`));
  const pr = code("src/app/proposals/[id]/page.tsx");
  const prMeta = pr.slice(pr.indexOf("export async function generateMetadata"), pr.indexOf("export default async function"));
  ok("2.6 · /proposals/[id]: the same — the not-found's title for a proposal that does not exist (unless proposals are DISABLED, when the page redirects), the board's title in the reader's language otherwise (round 5: was the English ‘Proposal’)",
    /if \(!p\) return getProposalsConfig\(\)\.state === "DISABLED" \? \{ title: t\.proposals\.title \} : notFoundMetadata\(\);/.test(prMeta)
      && /\} catch \{ return \{ title: t\.proposals\.title \}; \}/.test(prMeta));
  ok("2.5′ PLANT · the shipped updown metadata (‘Up & Down’ for a missing round) is reported",
    !/if \(!d\) return notFoundMetadata\(\);/.test(`const d = await getRoundDetail(roundId).catch(() => null);\n  return { title: d?.titleEn ?? "Up & Down" };`));
}
// The status: the framework's, line by line — a pin, so an upgrade that changes any of it is noticed here.
{
  const NEXT = "node_modules/next/dist/esm";
  const at = (p: string, needle: string) => {
    const src = existsSync(`${NEXT}/${p}`) ? read(`${NEXT}/${p}`) : "";
    const i = src.indexOf(needle);
    return i < 0 ? 0 : src.slice(0, i).split("\n").length;
  };
  const meta = at("lib/metadata/resolve-metadata.js", "errorMetadataItem[0] = errorMetadataExport;");
  ok(`2.7 · Next reads the deepest not-found's metadata under the error convention (resolve-metadata.js:${meta})`, meta > 0);
  const caught = at("lib/metadata/metadata.js", "return getNotFoundMetadata(tree, pathnameForMetadata");
  ok(`2.8 · a notFound() in generateMetadata is caught and the not-found's metadata resolved instead (metadata.js:${caught})`, caught > 0);
  const status = at("server/app-render/app-render.js", "res.statusCode = getAccessFallbackHTTPStatus(err);");
  ok(`2.9 · the 404 status is set only where the error escaped the shell — the render's catch (app-render.js:${status})`, status > 0);
  const captured = at("server/app-render/create-error-handler.js", "allCapturedErrors.push(thrownValue);");
  const noindex = at("server/app-render/make-get-server-inserted-html.js", 'content: "noindex"');
  ok(`2.10 · a notFound() inside a Suspense boundary is captured (create-error-handler.js:${captured}) and streams a robots noindex (make-get-server-inserted-html.js:${noindex})`, captured > 0 && noindex > 0);
  ok("2.11 · …and the two routes that answer 200 have a loading.tsx — the boundary that commits the status first (⛔ kept: every async route keeps one)",
    existsSync("src/app/markets/[id]/loading.tsx") && existsSync("src/app/updown/[roundId]/loading.tsx") && existsSync("src/app/loading.tsx"));
}

/* ══ §3 · BREAKS ══════════════════════════════════════════════════════════════════════════════════════════════════════ */
section("3 · the heading and the hint break whole (E42; tiles 345 354 355 364 390 396 398)");
{
  const h1 = /<h1 className="([^"]+)">\s*\{words\.notFoundBody\}/.exec(viewMarkup)?.[1] ?? "";
  ok("3.1 · the heading is balanced — ‘Hatukupata / ukurasa huo’, ‘We couldn’t / find that page’ — never one word alone", /\btext-balance\b/.test(h1), h1);
  const hint = /<p className="([^"]+)">\s*\{hangCjkMarks\(words\.notFoundHint\)\}/.exec(viewMarkup)?.[1] ?? "";
  ok("3.2 · the hint is balanced, and Chinese breaks only after its marks (keep-all, break-word the floor)",
    /\btext-balance\b/.test(hint) && hint.includes("[word-break:keep-all]") && hint.includes("[overflow-wrap:break-word]"), hint);
  // The Chinese hint, laid out: 13px, every ideograph and full-width mark 1em; "URL" in the repo's Inter.
  const PX = 13;
  const url = INTER.layout("URL").advanceWidth / INTER.unitsPerEm;
  const segs = ["链接可能已失效，", "市场可能已结算，", "或URL输入有误。", "请选择以下目的地继续。"];
  ok("3.3.locate · the hint is those four clauses, in that order", segs.join("") === NOT_FOUND_WORDS.zh.notFoundHint);
  const em = (s: string) => Array.from(s).reduce((a, c) => a + (/[A-Za-z]/.test(c) ? 0 : 1), 0) + (s.includes("URL") ? url : 0);
  /** A line's width: its clauses at full width, its LAST mark trimmed (the gap after it is gone at the line's end). */
  const lineW = (line: string[]) => (line.reduce((a, s) => a + em(s), 0) - CJK_TRIM_EM.mark) * PX;
  const greedy = (w: number) => {
    const lines: string[][] = [[]];
    for (const s of segs) { const cur = lines[lines.length - 1]; if (cur.length && lineW([...cur, s]) > w) lines.push([s]); else cur.push(s); }
    return lines;
  };
  /** text-wrap: balance — the fewest lines the box allows, at the narrowest width that still gives that many. */
  const balanced = (box: number) => { const n = greedy(box).length; let w = box; while (w > 1 && greedy(w - 1).length === n) w--; return greedy(w); };
  for (const [vw, box] of [[320, 320 - 2 * tw("3")], [360, 360 - 2 * tw("3")], [390, Math.min(420, 390 - 2 * tw("3"))], [1280, 420]] as const) {
    const lines = balanced(box);
    ok(`3.3 · zh hint at ${vw} (${box}px): two lines, ‘…已结算，’ / ‘或URL…继续。’ — 选择 whole, 继续。 not alone, each line ending on a hung mark`,
      lines.length === 2 && lines[0].join("") === segs[0] + segs[1] && lines[1].join("") === segs[2] + segs[3] && lines.every((l) => lineW(l) <= box),
      lines.map((l) => `${l.join("")} (${lineW(l).toFixed(1)}px)`).join(" / "));
  }
  // CONTROL — the same model without keep-all and balance, in the old 24px gutter, reproduces what the tiles measured: a
  // character-level greedy fill split 选择 at 390 (342px) and left 继续。 alone at 1280 (420px).
  const chars = Array.from(NOT_FOUND_WORDS.zh.notFoundHint.replace("URL", "\u0001"));
  const fill = (box: number) => { const out: string[] = [""]; let w = 0; for (const c of chars) { const cw = (c === "\u0001" ? url : 1) * PX; if (w + cw > box) { out.push(""); w = 0; } out[out.length - 1] += c === "\u0001" ? "URL" : c; w += cw; } return out; };
  const at390 = fill(390 - 2 * tw("5")), at1280 = fill(420);
  ok("3.3′ CONTROL · the old fill reproduces the tiles: ‘…请选 / 择…’ at 390 and ‘继续。’ alone at 1280",
    at390[0].endsWith("请选") && at1280[at1280.length - 1] === "继续。", `${at390.join(" / ")} || ${at1280.join(" / ")}`);
}

/* ══ §4 · THE HANGING MARK ════════════════════════════════════════════════════════════════════════════════════════════ */
section("4 · a Chinese mark that ends a centred line hangs its empty part (E50; tiles 390 396 398 427 428 433 434)");
{
  // Latin text is untouched: every sw and en dictionary string comes back as the same string.
  const latin: string[] = [];
  const walk = (v: unknown) => { if (typeof v === "string") latin.push(v); else if (v && typeof v === "object") for (const x of Object.values(v)) walk(x); };
  walk(DICTS.sw); walk(DICTS.en);
  // (Two sw/en strings quote a Chinese example — "[事件]会在[日期]前发生吗？" — and are Chinese text: they are not Latin.)
  const HAN = /[　-〿㐀-鿿＀-￯]/;
  const latinOnly = latin.filter((s) => !HAN.test(s));
  const moved = latinOnly.filter((s) => hangCjkMarks(s) !== s);
  ok(`4.1 · every sw and en dictionary string with no Chinese in it (${latinOnly.length} of ${latin.length}) comes back as itself — no change for Latin text`,
    latinOnly.length > 1000 && latin.length - latinOnly.length < 10 && moved.length === 0, moved.slice(0, 3).join(" | "));
  const end = html(h("p", null, hangCjkMarks("选择一方以设置您的信念并下注。")));
  ok("4.2 · a line-final 。 is set back and nothing follows it", end === `<p>选择一方以设置您的信念并下注<span class="kp-cjk-mark">。</span></p>`, end);
  const mid = html(h("p", null, hangCjkMarks("选择一个问题，点击")));
  // ⚠️ Pin moved 2026-10-09 (round 5, R5-E, review 3's doubt): the gap's space is the stylesheet's (`::after`), so the
  // gap is an EMPTY span and the text is the dictionary's, character for character (copy, find-in-page, textContent).
  ok("4.3 · a mid-text ， is set back AND followed by the gap that pays it back — a space the stylesheet draws, not the text",
    mid === `<p>选择一个问题<span class="kp-cjk-mark">，</span><span aria-hidden="true" class="kp-cjk-gap"></span>点击</p>`
      && /\.kp-cjk-gap::after\s*\{\s*content:\s*" ";\s*\}/.test(css), mid);
  const q = html(h("p", null, hangCjkMarks("它会朝哪个方向结算？")));
  ok("4.4 · ？ takes its own, smaller trim", q.endsWith(`<span class="kp-cjk-mark kp-cjk-mark--q">？</span></p>`), q);
  const pair = html(h("p", null, hangCjkMarks("真的？！")));
  ok("4.5 · two marks in a row: only the last hangs (no mid-line compression)", pair === `<p>真的？<span class="kp-cjk-mark">！</span></p>`, pair);
  const quoted = html(h("p", null, hangCjkMarks("“你好，”他说。")));
  ok("4.5b · a mark before a closing quote is left whole — no gap, so no line can start on the ”",
    quoted === `<p>“你好，”他说<span class="kp-cjk-mark">。</span></p>`, quoted);
  // The stylesheet pays the trim back exactly: the gap is a space in the mono face (0.6em in every weight, from the
  // repo's JetBrains Mono) plus word-spacing — so mid-line a mark is a whole em again.
  const mark = rule(css, ".kp-cjk-mark"), markQ = rule(css, ".kp-cjk-mark--q"), gap = rule(css, ".kp-cjk-gap"), gapQ = rule(css, ".kp-cjk-gap--q");
  const num = (s: string, prop: string) => parseFloat(new RegExp(`${prop}:\\s*(-?[0-9.]+)em`).exec(s)?.[1] ?? "NaN");
  const sp = spaceEm(JBM);
  ok("4.6.locate · the mono face's space is 0.6em, regular and bold", sp === 0.6 && spaceEm(JBM_BOLD) === 0.6, `${sp} ${spaceEm(JBM_BOLD)}`);
  ok("4.6 · the trims are the helper's (0.65em, ？ 0.5em) and each gap is exactly its trim: 0.6 + 0.05 = 0.65, 0.6 − 0.1 = 0.5",
    -num(mark, "margin-inline-end") === CJK_TRIM_EM.mark && -num(markQ, "margin-inline-end") === CJK_TRIM_EM.question
      && Math.abs(sp + num(gap, "word-spacing") - CJK_TRIM_EM.mark) < 1e-9 && Math.abs(sp + num(gapQ, "word-spacing") - CJK_TRIM_EM.question) < 1e-9,
    `${mark} | ${markQ} | ${gap} | ${gapQ}`);
  ok("4.7 · the gap cannot grow the line or be copied: mono face, line-height 0, letter-spacing 0, user-select none",
    /font-family:\s*var\(--font-mono\)/.test(gap) && /line-height:\s*0;/.test(gap) && /letter-spacing:\s*0;/.test(gap) && /(?:^|[^-])user-select:\s*none/.test(gap));
  ok("4.8 · no trim cuts into the ink: every mark's YaHei empty part ≥ its trim",
    Object.keys(CJK_MARK_TRIM).every((c) => YAHEI.rightEmpty[c] >= (c === "？" ? CJK_TRIM_EM.question : CJK_TRIM_EM.mark) + YAHEI.inkStart));
  // Before → after, from the face's advance: the measured tiles (−4.5 at 13px, −4.0 at 17px) against the model.
  const cases: Array<[string, number, string, number]> = [["the not-found hint / the empty state's body · 。 13px", 13, "。", -4.5], ["the hint's first line · ， 13px", 13, "，", NaN], ["the side picker's question · ？ 17px", 17, "？", -4.0], ["the side picker's sub-line · 。 13px", 13, "。", -4.0]];
  for (const [what, px, c, measured] of cases) {
    const before = inkOffset(px, c, 0), after = inkOffset(px, c, c === "？" ? CJK_TRIM_EM.question : CJK_TRIM_EM.mark);
    ok(`4.9 · ${what}: ink centre ${before.toFixed(2)}px → ${after.toFixed(2)}px${Number.isNaN(measured) ? "" : ` (tiles: ${measured})`}`,
      before < -4 && Math.abs(after) < 0.5 && (Number.isNaN(measured) || Math.abs(before - measured) < 0.6));
  }
  // The helper is where the centred Chinese lines are.
  ok("4.10 · applied where the lines are centred: the empty state's title and body, the side picker's question and sub-line, the not-found hint",
    // ⚠️ Pin moved 2026-10-09 (round 5, R5-E, H4): the body's marks hang inside `emptyStateBody`, which draws its held runs
    // as spans (no character inserted), so the call is `{emptyStateBody(body)}` and the rendered body is checked here.
    // Pin moved 2026-10-10 (round 7, R7-A, the owner's item 37): the title hangs its marks through `keepConnectives`, which
    // draws its plain parts with `hangCjkMarks` (a Chinese title has no connective, so it is exactly `hangCjkMarks(title)`).
    code("src/components/ui/empty-state.tsx").includes("{keepConnectives(title, [], hangCjkMarks)}") && code("src/components/ui/empty-state.tsx").includes("{emptyStateBody(body)}")
      && html(h("p", null, emptyStateBody("选择一个问题，点击“是”或“否”——您的注单会显示在这里。"))).endsWith(`显示在这里<span class="kp-cjk-mark">。</span></p>`)
      && code("src/components/markets/side-picker.tsx").includes("{hangCjkMarks(t.market.whichWay)}") && code("src/components/markets/side-picker.tsx").includes("{hangCjkMarks(t.market.chooseSideHelp)}")
      && viewMarkup.includes("{hangCjkMarks(words.notFoundHint)}"));
  ok("4.6′ PLANT · a gap with no word-spacing would leave a mid-line mark 0.05em short", Math.abs(sp + 0 - CJK_TRIM_EM.mark) > 0.01);
  ok("4.9′ PLANT · untrimmed, the 。 line is 4.4px off centre — the defect the tiles measured", inkOffset(13, "。", 0) < -4);
}

/* ══ §5 · THE WAVE ════════════════════════════════════════════════════════════════════════════════════════════════════ */
section("5 · the wave fades out (E46; tile 380: a hard-edged box x320–959, y169–823)");
{
  ok("5.1 · the view nests the wave in its two masks: .kp-nf-topo › .kp-nf-topo__x › BrandTopo",
    /<div aria-hidden className="kp-nf-topo">\s*<div className="kp-nf-topo__x">\s*<BrandTopo id="notfound-topo" opacity=\{0\.09\} \/>/.test(viewMarkup));
  const outer = rule(css, ".kp-nf-topo"), inner = rule(css, ".kp-nf-topo__x");
  const V = "linear-gradient(to bottom, transparent, black var(--sp-16), black calc(100% - var(--sp-16)), transparent)";
  const H = "linear-gradient(to right, transparent, black var(--kp-nf-side), black calc(100% - var(--kp-nf-side)), transparent)";
  // Declaration by declaration — `-webkit-mask-image: …` contains `mask-image: …`, so a substring test would pass with
  // one spelling gone.
  const decls = (body: string) => new Set(body.split(";").map((d) => d.trim().replace(/\s+/g, " ")).filter(Boolean));
  ok("5.2 · top and bottom fade over --sp-16 (64px), both spellings", decls(outer).has(`-webkit-mask-image: ${V}`) && decls(outer).has(`mask-image: ${V}`), outer);
  ok("5.3 · the sides fade over --kp-nf-side, both spellings", decls(inner).has(`-webkit-mask-image: ${H}`) && decls(inner).has(`mask-image: ${H}`), inner);
  const side = /--kp-nf-side:\s*clamp\(0px, calc\(\(100vw - var\(--w-form\)\) \* 1000\), var\(--sp-16\)\);/.test(inner);
  const fade = (vw: number) => Math.min(Math.max(0, (vw - ROOT_PX["--w-form"]) * 1000), ROOT_PX["--sp-16"]);
  ok(`5.4 · the side fade is 0 where the column is the screen and 64px past it: 360→${fade(360)}, 640→${fade(640)}, 768→${fade(768)}, 1280→${fade(1280)}`,
    side && fade(360) === 0 && fade(640) === 0 && fade(768) === 64 && fade(1280) === 64 && ROOT_PX["--w-form"] === 640);
  ok("5.5 · both layers fill the column and take no pointer", /position:\s*absolute;\s*inset:\s*0;\s*pointer-events:\s*none;/.test(rule(css, ".kp-nf-topo, .kp-nf-topo__x")));
  ok("5.1′ PLANT · the shipped root page (BrandTopo straight in the column) is reported", !/<div aria-hidden className="kp-nf-topo">/.test(`<BrandTopo id="notfound-topo" opacity={0.09} />`));
}

/* ══ §6 · THE CONTENT EDGE ════════════════════════════════════════════════════════════════════════════════════════════ */
section("6 · the content edge is the house gutter (E51; tiles 345 351: cards x24–336 at 360)");
{
  const frame = /<div className="(kp-shortpage [^"]+)">/.exec(viewMarkup)?.[1] ?? "";
  const pad = /\bpx-(\d+(?:\.\d+)?)\b/.exec(frame)?.[1] ?? "";
  const house = /pad === "page" && "px-(\d+) lg:px-\d+ py-\d+"/.exec(code("src/components/layout/page-container.tsx"))?.[1] ?? "";
  ok(`6.1 · the column's gutter is px-${pad} = ${tw(pad)}px, the house gutter (PageContainer px-${house} = ${tw(house)}px) — the cards stand at x16 on a phone`,
    pad === house && tw(pad) === 16, frame);
  ok("6.2 · the column is the 640px tier token, not a hand-typed width", /\bmax-w-form\b/.test(frame) && !/max-w-\[/.test(frame) && /--w-form:\s*640px;/.test(css));
  ok("6.1′ PLANT · the old px-5 is 24px — the 8px the tiles measured", tw("5") === 24);
}

/* ══ §7 · THE WATERMARK ═══════════════════════════════════════════════════════════════════════════════════════════════ */
section("7 · the market question's column ends before the watermark (E49; tile 433: 赛's ink to x701 over the mark at x680–741)");
{
  const page = code("src/app/markets/[id]/page.tsx");
  const mark = /<span aria-hidden className="(pointer-events-none absolute right-(\d+) [^"]+)">\s*<Cat s=\{96\} className="h-\[2em\] w-\[2em\]" \/>/.exec(page);
  const h1 = /<h1 data-stem=[^>]*?className="([^"]+)"/.exec(page)?.[1] ?? "";
  const pr = /\bpr-\[calc\(2em\+(\d+)px\)\]/.exec(h1);
  const rungs = (cls: string) => (/(?:^|\s)text-([a-z0-9-]+)\s+md:text-([a-z0-9-]+)/.exec(cls) ?? []).slice(1).join(",");
  ok("7.locate · the watermark is a 2em box at right-N, on the same type rungs as the h1", !!mark && rungs(mark?.[1] ?? "") === rungs(h1) && rungs(h1) === "title-lg,display-3", `${rungs(mark?.[1] ?? "")} vs ${rungs(h1)}`);
  const right = tw(mark?.[2] ?? "");
  const air = Number(pr?.[1] ?? NaN) - right;
  // The page column's right edge: 16px in from the screen on a phone and at 768 (tile 433: x752), the reading tier's
  // inner edge at 1280 ((1280 + 1080) / 2 − 32 = 1148). The gap is the same at every width: it is written in the h1's em.
  for (const [w, px, contentRight] of [[390, rung("title-lg"), 390 - tw("3")], [768, rung("display-3"), 768 - tw("3")], [1280, rung("display-3"), 1148]] as const) {
    const markLeft = contentRight - right - 2 * px;
    const h1Right = contentRight - (2 * px + Number(pr?.[1]));
    ok(`7.1 · at ${w} (${px}px): the question's column ends at x${h1Right}, ${markLeft - h1Right}px before the mark's box at x${markLeft}`, markLeft - h1Right === 8 && air === 8);
  }
  // Re-pinned (round 7, R7-C, 2026-10-10): R4-D's set-back is one rule for every display heading now — the h1 asks the shared
  // module (`stemOf`), and globals.css sets the first line back (0.075em at 700) where its Tailwind utility did.
  ok("7.2 · R4-D's first-line indent is kept", /<h1 data-stem=\{stemOf\(/.test(page) && /\[data-stem=""\]:where\(:not\(\.kp-hero__grp\)\) \{ text-indent: -0\.075em; \}/.test(css) && h1.includes("text-balance"));
  ok("7.1′ PLANT · without the padding the column runs under the mark (tile 433: ink to x701 > the mark's box at x676)", 701 > 752 - right - 2 * rung("display-3"));
}

/* ══ §8 · GOLD IS MONEY ═══════════════════════════════════════════════════════════════════════════════════════════════ */
section("8 · gold is money, and nothing else — the clock's labels, the market panel's eyebrow, the not-found (the gold audit)");
{
  // The class form of the money ink, exactly as test:gold-is-money writes it — read from that file, so the two cannot drift.
  const gim = read("scripts/gold-is-money.test.mts");
  const src = /const MONEY_CLASS = (\/.+\/g);/.exec(gim)?.[1] ?? "";
  const body = src.slice(1, src.lastIndexOf("/"));
  const MONEY_CLASS = new RegExp(body, "g");
  // `--warning-fg` WAS `--gilt` (DESIGN_AUTHORITY F3), so its class was money ink here too. ⭐ R8-A (2026-10-10): Ali's
  // ruling (1) made the warning family amber, so `text-warning-fg` left this money-ink list; a label in it is still a
  // defect — a label is not a warning (§B11) — and 8.1's `text-text-subtle` clause still rejects that shape (8.1′).
  const MONEY_VAR = /var\(\s*--(gilt|gilt-metal|gilt-ink|gilt-strong|gilt-reeding|gold-(300|400|500))\s*\)/g;
  ok("8.locate · gold-is-money's MONEY_CLASS was read, and --warning-fg is no longer --gilt (amber, ruling (1) of 2026-10-10)", src.length > 40 && new RegExp(body).test("text-gold-300") && !/--warning-fg:\s*var\(--gilt\);/.test(css));
  const hits = (s: string) => [...s.matchAll(MONEY_CLASS)].map((m) => m[0]).concat([...s.matchAll(MONEY_VAR)].map((m) => m[0]));
  const cd = code("src/components/markets/countdown.tsx");
  const label = /<span className="([^"]+)">\{resolvedLabel\}<\/span>/.exec(cd)?.[1] ?? "";
  ok("8.1 · the clock's label (‘Uchaguzi unafungwa baada ya’ / ‘Matokeo baada ya’) is the page's label ink, not --warning-fg (then = --gilt; amber since 2026-10-10, and a label is no warning)",
    label.includes("text-text-subtle") && hits(label).length === 0, label);
  const page = code("src/app/markets/[id]/page.tsx");
  const eyebrow = /<p className="([^"]+)">\s*\{t\.market\.signInToPredict\}/.exec(page)?.[1] ?? "";
  ok("8.2 · the market panel's ‘Ingia ili kutabiri’ / 登录以预测 eyebrow is the eyebrow ink the side picker uses in the same slot",
    eyebrow.includes("text-text-subtle") && hits(eyebrow).length === 0 && code("src/components/markets/side-picker.tsx").includes(`<p className="font-mono text-micro uppercase eyebrow font-bold text-text-subtle text-center">`), eyebrow);
  ok("8.3 · the not-found view and its three routes carry no money ink", hits(view).length === 0 && Object.values(ROUTES).every((p) => hits(code(p)).length === 0), hits(view).join());
  // R8-A (2026-10-10): the shipped label's ink is no longer MONEY ink (ruling (1)); 8.1 rejects it by its other clause.
  const shippedLabel = "font-mono text-micro uppercase eyebrow text-warning-fg";
  ok("8.1′ PLANT · the shipped label (text-warning-fg — not the label ink) and the shipped not-found link (text-gold-300 — money ink) are caught",
    !(shippedLabel.includes("text-text-subtle") && hits(shippedLabel).length === 0) && hits(`className="... text-gold-300 hover:text-gold-200"`).length === 1);
}

/* ══ §9 · E48 ═════════════════════════════════════════════════════════════════════════════════════════════════════════ */
section("9 · E48 — the 404 a player's not-found page logs is its own Server Action, answered with the page's status");
{
  const NEXT = "node_modules/next/dist/esm";
  const base = existsSync(`${NEXT}/server/base-server.js`) ? read(`${NEXT}/server/base-server.js`) : "";
  const r404 = base.indexOf("async render404(");
  const line = base.slice(0, r404).split("\n").length;
  ok(`9.1 · an unmatched path renders /_not-found with 404 — for a POST too (base-server.js:${line}, render404 sets res.statusCode = 404)`,
    r404 > 0 && base.slice(r404, r404 + 600).includes("res.statusCode = 404;"));
  const red = existsSync(`${NEXT}/client/components/router-reducer/reducers/server-action-reducer.js`) ? read(`${NEXT}/client/components/router-reducer/reducers/server-action-reducer.js`) : "";
  ok("9.2 · the client takes the action's answer by its RSC content type, whatever the status — the action works; only the browser logs the 404",
    /const isRscResponse = !!\(contentType && contentType\.startsWith\(RSC_CONTENT_TYPE_HEADER\)\);/.test(red) && /if \(!isRscResponse && !redirectLocation\)/.test(red));
  ok("9.3 · the journey's unread dot asks that Server Action from every signed-in page (guests ask nothing: their 404s log only the document)",
    code("src/lib/journey/use-unread-count.ts").includes(`import { fetchMyNotifications } from "@/app/_actions/notifications";`) && /^["']use server["']/.test(read("src/app/_actions/notifications.ts")));
  // Every file the root layout and the manifest name exists: the 404 is not a missing asset.
  const layout = code("src/app/layout.tsx");
  const manifest = JSON.parse(read("public/manifest.json")) as { icons: Array<{ src: string }>; shortcuts: Array<{ icons: Array<{ src: string }> }>; screenshots: Array<{ src: string }> };
  const named = [...layout.matchAll(/(?:url|manifest|images):\s*\[?\s*\{?\s*(?:url:\s*)?"(\/[^"]+)"/g)].map((m) => m[1])
    .concat(manifest.icons.map((i) => i.src), manifest.shortcuts.flatMap((s) => s.icons.map((i) => i.src)), manifest.screenshots.map((s) => s.src));
  const missing = named.filter((p) => !existsSync(`public${p}`));
  ok(`9.4 · every icon, manifest, image and screenshot the layout and manifest name is in public/ (${named.length} checked)`, named.length >= 12 && missing.length === 0, missing.join(", "));
}

/* ══ RESULT ═══════════════════════════════════════════════════════════════════════════════════════════════════════════ */
console.log(`\nvisual-pass-r4k: ${pass} passed, ${fails.length} failed`);
if (fails.length && !PROVE) {
  for (const f of fails) console.error(`  · ${f}`);
  process.exit(1);
}

/* ══ THE MUTATION PROOF (--prove) ═════════════════════════════════════════════════════════════════════════════════════ */
if (PROVE) {
  if (fails.length) { console.error("\n✗ the suite is not green on the real tree — fix that before proving it red"); process.exit(1); }
  // The mutations are DATA in scripts/anchors/visual-pass-r4k.anchors.mjs, so test:red-anchors audits every anchor
  // (exactly once, in its file) without running this harness.
  const PLANTS = MUTATIONS as Array<{ name: string; file: string; from: string; to: string; expect: string }>;

  const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");
  const files = [...new Set(PLANTS.map((p) => p.file))];
  const original = new Map(files.map((f) => [f, readFileSync(f)]));
  let proven = 0;
  const wrong: string[] = [];
  try {
    for (const p of PLANTS) {
      const buf = original.get(p.file)!;
      const text = buf.toString("utf8");
      const eol = text.includes("\r\n") ? "\r\n" : "\n";
      const from = p.from.replace(/\n/g, eol), to = p.to.replace(/\n/g, eol);
      if (text.split(from).length !== 2) { wrong.push(`${p.name}: the anchor is not in ${p.file} exactly once`); continue; }
      writeFileSync(p.file, text.replace(from, to));
      const run = spawnSync(process.execPath, ["--import", "tsx", SELF], { encoding: "utf8", timeout: 180_000 });
      writeFileSync(p.file, buf);
      const out = `${run.stdout ?? ""}${run.stderr ?? ""}`;
      const caught = run.status !== 0 && out.split("\n").some((l) => l.includes("FAIL") && l.includes(` ${p.expect} `));
      const restored = sha(readFileSync(p.file)) === sha(buf);
      console.log(`  ${caught && restored ? "red " : "MISS"} ${p.name} → ${p.expect}${caught ? "" : ` (exit ${run.status})`}${restored ? "" : " — NOT RESTORED"}`);
      if (caught && restored) proven++; else wrong.push(p.name);
    }
  } finally {
    for (const [f, b] of original) writeFileSync(f, b);
  }
  const drift = files.filter((f) => sha(readFileSync(f)) !== sha(original.get(f)!));
  console.log(`\nvisual-pass-r4k --prove: ${proven}/${PLANTS.length} plants caught; ${files.length} files restored byte-identical${drift.length ? ` — ⛔ ${drift.join(", ")} DIFFER` : ""}`);
  if (proven !== PLANTS.length || drift.length) { for (const w of wrong) console.error(`  · ${w}`); process.exit(1); }
}
