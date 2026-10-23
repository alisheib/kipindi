/**
 * test:notice-bar-widow — A NOTICE BAR'S SENTENCE NEVER ENDS ON ONE WORD ALONE (MASWALI-BUILD S5 round 2, 2026-10-22; the
 * platform lane's finding: at en 320 Millionea's staff preview bar put "only." alone on its second line).
 *
 *   npx tsx scripts/notice-bar-widow.test.mts     (npm run test:notice-bar-widow)
 *
 * The kit's NoticeBar applies the platform's widow rule (`keepLastWords`, keep-words.tsx) to the words it is handed:
 *   §1 the bar's text is `barWords(children)`; rendered with every plain sentence the product hands a bar (the journey's
 *      preview marker and Millionea's preview bar, in sw/en/zh) its last two words stand in ONE `whitespace-nowrap` span
 *      and its words are unchanged; Chinese, a two-word bar, a pair longer than `KEEP_PAIR_MAX` (an operator's address)
 *      and built words (a fact line, a bold head) are drawn exactly as before
 *   §2 PLANTS: the rule taken out of the bar, and the pair's length guard taken out, are each reported
 * Which lines move on screen — only a lone last word's, never another — is `qa:notice-bar-widow` (a running server),
 * which shoots every bar the drives reach, before (the plain words) and after, at six widths in three languages.
 */
import "next/dist/server/node-environment.js";
import { readFileSync } from "node:fs";
import { createRequire, Module as NodeModule } from "node:module";
import { join } from "node:path";
import ts from "typescript";

const ROOT = join(import.meta.dirname, "..");
const req = createRequire(import.meta.url);
const raw = (p: string) => readFileSync(join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
let pass = 0;
const fails: string[] = [];
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};
/** A module built from (possibly PLANTED) source at its real path, so its own imports resolve as the real file's do. */
function fromSource<T>(rel: string, source: string): T {
  const file = join(ROOT, rel);
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }, fileName: file }).outputText;
  const m = new NodeModule(file) as NodeModule & { _compile: (code: string, filename: string) => void; paths: string[] };
  m.filename = file;
  m.paths = (NodeModule as unknown as { _nodeModulePaths: (d: string) => string[] })._nodeModulePaths(join(file, ".."));
  m._compile(js, file);
  return m.exports as T;
}
const plant = (src: string, from: string, to: string) => {
  if (!src.includes(from)) throw new Error(`plant did not apply: ${from.slice(0, 80)}`);
  return src.replace(from, to);
};

const React = req("react") as typeof import("react");
const h = React.createElement;
const { renderToStaticMarkup } = req("react-dom/server") as typeof import("react-dom/server");
type Bar = { NoticeBar: (p: { children: unknown; tone?: string; glyph?: string }) => unknown; barWords: (c: unknown) => unknown; KEEP_PAIR_MAX: number };
const BAR_FILE = "src/components/ui/notice-bar.tsx";
const SRC = raw(BAR_FILE);
const real = fromSource<Bar>(BAR_FILE, SRC);
type Dict = { journey: { previewMarker: string }; millionea: { previewMark: string } };
const { dict } = req("../src/lib/i18n-dict.ts") as { dict: Record<"sw" | "en" | "zh", Dict> };

/** The bar's text paragraph, rendered. */
const para = (M: Bar, children: unknown) => {
  const html = renderToStaticMarkup(h(M.NoticeBar as never, { tone: "info", glyph: "eye" } as never, children as never));
  return /<p class="[^"]*">([\s\S]*?)<\/p>/.exec(html)?.[1] ?? "";
};
const textOf = (html: string) => html.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"');
const KEPT = /<span class="whitespace-nowrap">([^<]*)<\/span>$/;

/** Each plain sentence the product hands a bar, with the pair it must keep (null: drawn untouched). */
const SENTENCES: Array<[string, string, string | null]> = [];
for (const l of ["sw", "en", "zh"] as const) {
  for (const [name, s] of [["journey preview marker", dict[l].journey.previewMarker], ["Millionea preview bar", dict[l].millionea.previewMark]] as const) {
    const words = s.trim().split(/\s+/);
    SENTENCES.push([`${l} ${name}`, s, l === "zh" ? null : words.slice(-2).join(" ")]);
  }
}
function judge(M: Bar) {
  const kept = SENTENCES.map(([name, s, pair]) => {
    const p = para(M, s);
    const got = KEPT.exec(p)?.[1] ?? null;
    return { name, okPair: got === pair, okText: textOf(p) === s, got };
  });
  const long = "Scheduled maintenance tonight, details at https://status.50pick.tz/maintenance-window";
  const built = h("span", null, h("span", { className: "font-semibold" }, "Offline"), " · Reconnect to keep playing.");
  return {
    kept,
    two: !/whitespace-nowrap/.test(para(M, "Preview only")),
    longPair: !/whitespace-nowrap/.test(para(M, long)) && textOf(para(M, long)) === long,
    builtSame: para(M, built) === renderToStaticMarkup(built as never),
  };
}

console.log("§1 · the widow rule, in the kit");
{
  ok("1.1 · the bar's text paragraph draws `barWords(children)`", /<p className="min-w-0 grow basis-\[14rem\] text-body-sm leading-snug font-medium">\{barWords\(children\)\}<\/p>/.test(SRC)
    && /import \{ keepLastWords, lastTwo \} from "@\/components\/ui\/keep-words";/.test(SRC));
  const r = judge(real);
  for (const k of r.kept) ok(`1.2 · ${k.name}: ${k.got === null ? "drawn untouched" : `"${k.got}" kept together`}, its words unchanged`, k.okPair && k.okText, JSON.stringify(k));
  ok("1.3 · a two-word bar is drawn untouched (nothing to strand)", r.two);
  ok(`1.4 · a pair longer than KEEP_PAIR_MAX (${real.KEEP_PAIR_MAX}: an operator's address) is left to wrap as words do`, r.longPair && real.KEEP_PAIR_MAX === 24);
  ok("1.5 · built words (a bold head and a sentence) are drawn exactly as before", r.builtSame);
}

console.log("\n§2 · PLANTS");
{
  const off = fromSource<Bar>(BAR_FILE, plant(SRC, "{barWords(children)}</p>", "{children}</p>"));
  const r = judge(off);
  ok("2.1 · the rule taken out of the bar: every en/sw sentence loses its kept pair (1.2 reports it)", r.kept.filter((k) => !k.okPair).length === 4);
  const unguarded = fromSource<Bar>(BAR_FILE, plant(SRC, "if (at <= 0 || children.trimEnd().length - at > KEEP_PAIR_MAX) return children;", "if (at <= 0) return children;"));
  ok("2.2 · the pair's length guard taken out: the operator's long address is kept unbreakable (1.4 reports it)", !judge(unguarded).longPair);
}

console.log(`\nnotice-bar-widow: ${pass} passed, ${fails.length} failed`);
if (fails.length) { for (const f of fails) console.log(`  ✗ ${f}`); process.exitCode = 1; }
