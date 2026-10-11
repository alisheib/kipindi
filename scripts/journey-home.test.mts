/**
 * test:journey-home — THE HOME ON `/`, HELD BEFORE THE JOURNEY ARM IS BUILT BESIDE IT (the Vodacom plan S7: `docs/VODACOM-PLAN.md`
 * §3.2, "First commit of S7"; `docs/design-system/v5-2026-09-29-simplified-journey/S7-PLAN.md` WP2, amendment A10).
 *
 *   npm run test:journey-home     (in predeploy)
 *   npm run red:journey-home      (--prove-red: every defect below is planted IN MEMORY and must be caught)
 *
 *   §1 THE ROUTE FILE (S7 WP2, the pure move). Today's home body left `src/app/page.tsx` verbatim for
 *      `src/components/home/legacy-landing.tsx` (`LegacyLanding`), so the journey arm can later be added beside it without
 *      touching a classic line. The route keeps exactly what Next reads only from a route file:
 *        · `export const dynamic = "force-dynamic"` — "/" is rendered per request;
 *        · the metadata — `generateMetadata`, the tab title in the reader's language since round 4 of the visual pass —
 *          with "/" as its own canonical and the root layout's open graph SPREAD, never replaced: a partial `openGraph`
 *          once wiped og:image, og:locale, og:site_name and og:type from "/" (the note above `generateMetadata`);
 *        · `ROOT_OPEN_GRAPH` from "./layout", the layout's one definition;
 *      and its default export's one classic return is `<LegacyLanding searchParams={searchParams} />`. The body carries no
 *      directive (an async server component, as the route's body was), and the route is the only file that imports it.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION. `--prove-red` plants each defect into source TEXT held in memory and requires the check
 * named for it to fail; nothing here touches a file on disk, so `test:red-anchors` §4 counts it in the in-process class.
 * ⚠️ Every read is DECOMMENTED (`scripts/lib/decomment.mts`), so a rule quoted in a note is never mistaken for the rule.
 * ⚠️ This file carries no escape a tool could decode on its way to disk: line breaks are built from their code points, and
 * its patterns use look-arounds and character classes, never a word boundary.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";
import { srcFiles } from "./lib/tracked-files.mts";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const PROVE_RED = process.argv.includes("--prove-red");
const LF = String.fromCharCode(10);
const CR = String.fromCharCode(13);

const PAGE = "src/app/page.tsx";
const LANDING = "src/components/home/legacy-landing.tsx";
const LAYOUT = "src/app/layout.tsx";

/** A file's text with CRLF read as LF (this machine checks files out as CRLF). A missing file reads as "", which §1 reports. */
const read = (rel: string) => (existsSync(join(ROOT, rel)) ? readFileSync(join(ROOT, rel), "utf8").split(CR + LF).join(LF) : "");
const count = (hay: string, needle: string) => hay.split(needle).length - 1;
const j = (v: unknown) => JSON.stringify(v);

/** Everything the checks read. The red run plants on copies of it. */
type World = {
  page: string;                  // src/app/page.tsx
  landing: string;               // src/components/home/legacy-landing.tsx
  layout: string;                // src/app/layout.tsx, where ROOT_OPEN_GRAPH is defined
  walked: number;                // how many files under src/ the importer census walked
  naming: Map<string, string>;   // every OTHER file under src/ whose text names legacy-landing: the census's subjects
};

function load(): World {
  const all = srcFiles();
  const naming = new Map<string, string>();
  for (const rel of all) {
    if (rel === PAGE || rel === LANDING) continue;
    const s = read(rel);
    if (s.includes("legacy-landing")) naming.set(rel, s);
  }
  return { page: read(PAGE), landing: read(LANDING), layout: read(LAYOUT), walked: all.length, naming };
}

/* ── what §1 reads for, spelled as the route file spells it ─────────────────────────────────────────────────── */
const DYNAMIC = 'export const dynamic = "force-dynamic";';
const GENERATE = "export async function generateMetadata(): Promise<Metadata> {";
const CANONICAL = 'alternates: { canonical: "/" },';
const SPREAD = 'openGraph: { ...ROOT_OPEN_GRAPH, url: "/" },';
const OG_IMPORT = 'import { ROOT_OPEN_GRAPH } from "./layout";';
const LANDING_IMPORT = 'import { LegacyLanding } from "@/components/home/legacy-landing";';
const CLASSIC_RETURN = "return <LegacyLanding searchParams={searchParams} />;";
const LANDING_EXPORT = "export async function LegacyLanding(";
/** A metadata export of either form. */
const METADATA_EXPORT = /export\s+(?:const\s+metadata(?![\w$])|(?:async\s+)?function\s+generateMetadata(?![\w$]))/g;
/** An import of the landing's body, static, dynamic or re-exported, by any specifier that ends in legacy-landing. */
const IMPORTS_LANDING = /(?:from|import)\s*[(]?\s*["'`][^"'`]*legacy-landing(?:[.]tsx)?["'`]/;
const DIRECTIVE = /["']use (?:client|server)["']/;

function run(w: World, log: (l: string) => void): string[] {
  const failed: string[] = [];
  const ok = (label: string, cond: boolean, extra = "") => {
    if (cond) log(`  PASS ${label}`);
    else { failed.push(label); log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
  };
  const page = decomment(w.page), landing = decomment(w.landing), layout = decomment(w.layout);
  const lineCount = (s: string, want: string) => s.split(LF).filter((l) => l.trim() === want).length;

  /* §1 · the route file (S7 WP2) */
  ok(`1.dynamic · the route file exports dynamic = "force-dynamic", once, and the landing's body declares no route config of its own`,
    lineCount(page, DYNAMIC) === 1 && count(page, "export const dynamic") === 1 && count(landing, "export const dynamic") === 0,
    j({ spelled: lineCount(page, DYNAMIC), route: count(page, "export const dynamic"), body: count(landing, "export const dynamic") }));

  const routeMeta = (page.match(METADATA_EXPORT) ?? []).length, bodyMeta = (landing.match(METADATA_EXPORT) ?? []).length;
  ok("1.metadata · the metadata is the route file's: one generateMetadata in src/app/page.tsx, and no metadata export in the landing's body (Next reads metadata from a route file only)",
    count(page, GENERATE) === 1 && routeMeta === 1 && bodyMeta === 0, j({ generate: count(page, GENERATE), route: routeMeta, body: bodyMeta }));

  const at = page.indexOf(GENERATE);
  const meta = at < 0 ? "" : page.slice(at, page.indexOf(LF + "}", at) + 2);
  ok(`1.spelled · "/" is its own canonical and the root layout's open graph is SPREAD, never replaced: alternates: { canonical: "/" } and openGraph: { ...ROOT_OPEN_GRAPH, url: "/" }, inside generateMetadata, each once`,
    meta.includes(CANONICAL) && meta.includes(SPREAD) && count(page, "alternates:") === 1 && count(page, "openGraph:") === 1,
    meta ? j({ canonical: meta.includes(CANONICAL), spread: meta.includes(SPREAD), alternates: count(page, "alternates:"), openGraph: count(page, "openGraph:") })
      : "no generateMetadata body in the route file");

  const layoutDefines = /export const ROOT_OPEN_GRAPH(?![\w$])/.test(layout);
  ok(`1.layout · ROOT_OPEN_GRAPH comes from "./layout", the root layout's one definition, and the route keeps no copy of its own`,
    lineCount(page, OG_IMPORT) === 1 && !/(?:const|let|var|function|class)\s+ROOT_OPEN_GRAPH(?![\w$])/.test(page) && layoutDefines,
    j({ imported: lineCount(page, OG_IMPORT), layoutDefines }));

  const def = page.indexOf("export default ");
  ok("1.return · the default export's one classic return is <LegacyLanding searchParams={searchParams} />, and the route draws LegacyLanding nowhere else",
    def >= 0 && count(page, CLASSIC_RETURN) === 1 && page.indexOf(CLASSIC_RETURN) > def && count(page, "<LegacyLanding") === 1
      && lineCount(page, LANDING_IMPORT) === 1,
    j({ defaultExport: def >= 0, returns: count(page, CLASSIC_RETURN), drawn: count(page, "<LegacyLanding"), imported: lineCount(page, LANDING_IMPORT) }));

  ok("1.landing · the landing's body is legacy-landing.tsx, an async function exported by name (export async function LegacyLanding), with no default export",
    count(landing, LANDING_EXPORT) === 1 && !/export\s+default(?![\w$])/.test(landing) && landing.length > 5_000,
    j({ named: count(landing, LANDING_EXPORT), chars: landing.length }));

  const directive = landing.match(DIRECTIVE)?.[0] ?? null;
  ok("1.directive · legacy-landing.tsx carries no directive: an async SERVER component, as the route's body was",
    landing.length > 0 && directive === null, directive ?? "the file was not read");

  const subjects: Array<[string, string]> = [[PAGE, w.page], ...w.naming];
  const importers = subjects.filter(([, s]) => IMPORTS_LANDING.test(decomment(s))).map(([rel]) => rel).sort();
  ok("1.importers · only src/app/page.tsx imports legacy-landing.tsx (a census over every file under src/): the route is the body's one mount",
    w.walked >= 500 && j(importers) === j([PAGE]), j({ walked: w.walked, importers }));
  return failed;
}

const REAL = load();
if (!PROVE_RED) {
  console.log("journey-home — the home on / (the Vodacom plan S7)");
  const failed = run(REAL, (l) => console.log(l));
  console.log(`${LF}JOURNEY HOME — ${failed.length === 0 ? "all checks passed" : `${failed.length} failed`}${LF}`);
  process.exitCode = failed.length === 0 ? 0 : 1;
} else {
  const quiet = () => {};
  type Plant = { name: string; expect: RegExp; plant: (w: World) => World };
  /** One swap on a copy of a file's text. ⛔ An anchor that no longer resolves exactly once THROWS, so a plant that changed
   *  nothing is reported as a broken plant, never as a check that missed it. */
  const swap = (text: string, from: string, to: string) => {
    const n = count(text, from);
    if (n !== 1) throw new Error(`the plant's anchor resolves ${n} times, not once: ${from}`);
    return text.replace(from, () => to);
  };
  const PLANTS: Plant[] = [
    { name: "the metadata moved into the landing's body, where Next never reads it (/ would lose its canonical, og:url and og:image)", expect: /^1[.]metadata /,
      plant: (w) => {
        const at = w.page.indexOf("export async function generateMetadata(");
        const end = at < 0 ? -1 : w.page.indexOf(LF + "}" + LF, at);
        if (end < 0) throw new Error("the route file holds no generateMetadata to move");
        return { ...w, page: w.page.slice(0, at) + w.page.slice(end + 2), landing: w.landing + LF + w.page.slice(at, end + 2) + LF };
      } },
    { name: "openGraph replaced instead of spread (the layout's og:image, og:locale, og:site_name and og:type wiped from /)", expect: /^1[.]spelled /,
      plant: (w) => ({ ...w, page: swap(w.page, SPREAD, 'openGraph: { url: "/" },') }) },
    { name: "dynamic dropped (/ no longer forced to render per request)", expect: /^1[.]dynamic /,
      plant: (w) => ({ ...w, page: swap(w.page, DYNAMIC + LF, "") }) },
    { name: "a second importer (the landing's body mounted on another route)", expect: /^1[.]importers /,
      plant: (w) => ({ ...w, naming: new Map(w.naming).set("src/app/markets/page.tsx", LANDING_IMPORT + LF + "export default function Markets() { return null; }" + LF) }) },
    { name: "the open graph copied into the route instead of read from the layout", expect: /^1[.]layout /,
      plant: (w) => ({ ...w, page: swap(w.page, OG_IMPORT, 'const ROOT_OPEN_GRAPH = { type: "website" } as const;') }) },
    { name: "the classic return stops handing the request on (the board's ?sort= is lost)", expect: /^1[.]return /,
      plant: (w) => ({ ...w, page: swap(w.page, "<LegacyLanding searchParams={searchParams} />", "<LegacyLanding searchParams={Promise.resolve({})} />") }) },
    { name: "the landing's body marked use client", expect: /^1[.]directive /,
      plant: (w) => ({ ...w, landing: '"use client";' + LF + LF + w.landing }) },
    { name: "the landing's body a default export again", expect: /^1[.]landing /,
      plant: (w) => ({ ...w, landing: swap(w.landing, LANDING_EXPORT, "export default async function LegacyLanding(") }) },
  ];
  let caught = 0, fail = 0;
  const ok = (label: string, cond: boolean, extra = "") => { if (!cond) fail++; console.log(`${cond ? "PROVED  " : "MISSED  "} ${label}${extra ? ` — ${extra}` : ""}`); };
  const clean = run(REAL, quiet);
  ok("the REAL tree passes every check", clean.length === 0, clean.join(" | "));
  for (const p of PLANTS) {
    let failures: string[];
    try { failures = run(p.plant(REAL), quiet); }
    catch (e) { ok(p.name, false, `the plant is broken: ${(e as Error).message}`); continue; }
    const hit = failures.some((f) => p.expect.test(f));
    if (hit) caught++;
    ok(p.name, hit, hit ? "" : failures.length === 0 ? "NOTHING failed — the gate cannot see this defect" : `failed instead: ${failures.slice(0, 2).join(" | ")}`);
  }
  console.log(`${LF}RED CONTROL — ${caught}/${PLANTS.length} caught${fail === 0 ? "" : ` · ${fail} FAILED`}${LF}`);
  process.exitCode = fail === 0 ? 0 : 1;
}
