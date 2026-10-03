/**
 * test:contacts-boundary — U27a's guard: what the contact book's code may import, in BOTH directions.
 *
 * ⭐ WHY A GRAPH WALK, AND WHY NOTHING ELSE CAN CATCH THIS. Two defects here pass every check the repo runs:
 *   · CLIENT → SERVER/EXCELJS. exceljs's package.json declares a "browser" build (`dist/exceljs.min.js`, ~948 KB), so
 *     `import ExcelJS from "exceljs"` in a `"use client"` file keeps typecheck green AND keeps `next build` green — the
 *     bundler simply ships it into the admin chunk. The same holds for a client island that value-imports the server
 *     graph: the repo uses no `server-only` marker, so tree-shaking is the only thing between the browser and the book.
 *   · SERVER → CLIENT FUNCTION. The 2026-09-05 outage: a plain function exported from a `"use client"` file and called
 *     by a server component throws at render ("Attempted to call kycGateState() from the server"), with tsc and the
 *     build both green. Only a component (PascalCase) may cross that boundary.
 *
 * What it holds, every run, over the REAL tree:
 *   §0 the walker can fail — bare, alias and relative resolution; re-exports, dynamic and side-effect imports
 *      followed; type-only imports erased; the "use server" LEAF; directives under CRLF (on the raw text); the
 *      populations, by name; and no unresolved edge in the client, pure or owned-server graphs (a blind spot)
 *   §1 no owned client file, and no client island an owned route renders, reaches src/lib/server/** (except through
 *      a "use server" leaf — an action reference, never shipped code), the package exceljs, or a Node builtin
 *   §2 the pure modules (src/lib/contacts/**): no directive; no src/lib/server, src/app or client module reached, not
 *      even a leaf; no exceljs, no builtin; every one pinned in `test:client-graph-safe`; the two foundations
 *      (parsed-file.ts, xlsx-limits.ts) import nothing at all; the parsed shape is declared exactly once (C15); the
 *      phone-format remedy is spelled exactly once (A1.6)
 *   §3 exceljs stays where it is: its value importers are exactly the report writer (and U27b's reader once it
 *      exists), and no "use client" file anywhere in src reaches it
 *   §4 every edge from an owned route's server graph into a "use client" module imports only PascalCase bindings, and
 *      the same over every src/app entry as a ratchet (pinned offenders: none; every app-graph edge resolved)
 *   §5 the reader's DATA boundary (U27b): its modules reach no store, Prisma, audit or session module (the parse is a
 *      function of the bytes, never a membership oracle), and nothing under src/lib/server/contacts touches the disk
 *   §6 the TRANSPORT boundary (OD29): next.config.ts raises no body limit, the installed Next still defaults to
 *      1 MB, the derived 700 KiB cap fits under it with its envelope, and the size gate is EXACT (A1.4)
 *   §7 the shared contract, executed: the sniffer, the shape validator (blank rows, `unreadable` — A1.8), the copy
 *      table (every CSV sentence carries the remedy; spaced phone numbers in a sheet name), the shortened detector
 *
 * ⭐ THE WALKER IS `test:client-graph-safe`'s, WIDENED. Same resolution (`@/` → src, relative, the TS extension list,
 * `index` files), but it also follows `export … from`, `import()`, `import "x"` and `require()`, reads bindings, and
 * erases `import type` and all-`type` lists. §0.3 and red R7 prove the narrower regex would be blind here.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION. `--prove-red` plants every defect IN MEMORY — virtual or overridden sources laid over
 * the file reader, a swapped extractor, a swapped contract function — and requires the NAMED assertion to fail. A
 * GREEN control (G1) runs a plant's twin and requires the whole suite to stay green, so that plant's flip is from
 * green to red in one population. This file makes no file-writing call, and spells no such call even in a comment
 * (the disk-touch pattern in §5.2 is built by concatenation), so `test:red-anchors` counts it as in-process.
 *
 * Run:  npm run test:contacts-boundary
 * Red:  npm run red:contacts-boundary
 */
process.exitCode = 1;

import { Buffer } from "node:buffer";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { dirname, join, posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";
import { isDirective } from "./lib/is-directive.mts";
import {
  NEXT_ACTION_BODY_LIMIT_BYTES, XLSX_ENVELOPE_ALLOWANCE, XLSX_MAX_BYTES, XLSX_MAX_BASE64_CHARS, base64LengthFor,
  base64DecodedBytes, xlsxBase64OverCap, PHONE_FORMAT_REMEDY,
  sniffSpreadsheetBytes, spreadsheetHeadKind, xlsxRefusalSentence, formatFileSize, looksExcelShortened,
  excelShortenedSentence, XLSX_REFUSALS, WRONG_FORMAT_KINDS, ODS_MIMETYPE,
} from "../src/lib/contacts/xlsx-limits.ts";
import type { XlsxRefusal, XlsxRefusalContext } from "../src/lib/contacts/xlsx-limits.ts";
import { isParsedContactsFile, formatRowList, NOTE_LIST_CAP } from "../src/lib/contacts/parsed-file.ts";

const PROVE_RED = process.argv.includes("--prove-red");
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/* ── THE TREE, READ ONCE ─────────────────────────────────────────────────────────────────────────────────────── */

const CODE = /\.(?:tsx?|jsx?|mts|mjs)$/;
const BOM = String.fromCharCode(0xfeff);
/** CRLF-normalised and BOM-less: this checkout is `core.autocrlf=true`, and a directive or an anchor must not care. */
const tidy = (s: string): string => (s.startsWith(BOM) ? s.slice(1) : s).replace(/\r\n?/g, "\n");

function listCode(top: string): string[] {
  const out: string[] = [];
  const visit = (rel: string) => {
    for (const e of readdirSync(join(ROOT, rel), { withFileTypes: true })) {
      const child = `${rel}/${e.name}`;
      if (e.isDirectory()) visit(child);
      else if (CODE.test(e.name)) out.push(child);
    }
  };
  visit(top);
  return out.sort();
}
const DISK_SRC = listCode("src");
const diskText = new Map<string, string | null>();
function readDisk(rel: string): string | null {
  if (!diskText.has(rel)) {
    const abs = join(ROOT, rel);
    diskText.set(rel, existsSync(abs) && statSync(abs).isFile() ? tidy(readFileSync(abs, "utf8")) : null);
  }
  return diskText.get(rel) ?? null;
}

/** Repo-relative POSIX path → source; `null` removes the file. Laid over the disk, never written to it. */
type Overlay = Readonly<Record<string, string | null>>;
type Repo = { files: readonly string[]; has(rel: string): boolean; read(rel: string): string | null };

function makeRepo(overlay: Overlay): Repo {
  const virtual = new Map<string, string | null>();
  for (const [rel, text] of Object.entries(overlay)) virtual.set(rel, text === null ? null : tidy(text));
  const set = new Set(DISK_SRC);
  for (const [rel, text] of virtual) {
    if (!rel.startsWith("src/") || !CODE.test(rel)) continue;
    if (text === null) set.delete(rel);
    else set.add(rel);
  }
  return {
    files: [...set].sort(),
    has: (rel) => set.has(rel),
    read: (rel) => (virtual.has(rel) ? virtual.get(rel) ?? null : readDisk(rel)),
  };
}

/* ── THE EXTRACTOR ───────────────────────────────────────────────────────────────────────────────────────────── */

type Binding = { how: "default" | "named" | "namespace"; name: string };
type Edge = { spec: string; kind: "import" | "reexport" | "side" | "dynamic" | "require"; typeOnly: boolean; bindings: Binding[] };
type Extractor = (raw: string) => Edge[];

const IMPORT_FROM = /\bimport\s+(type\s+)?((?:[\w$]+\s*,\s*)?(?:\*\s*as\s+[\w$]+|\{[^{}]*\}|[\w$]+))\s*from\s*(["'])([^"'\n]+)\3/g;
const EXPORT_FROM = /\bexport\s+(type\s+)?(\*(?:\s*as\s+[\w$]+)?|\{[^{}]*\})\s*from\s*(["'])([^"'\n]+)\3/g;
const SIDE_EFFECT = /\bimport\s*(["'])([^"'\n]+)\1/g;
/** `import("x")`, and the member a `.then((m) => m.X)` / `.then((m) => ({ default: m.X }))` picks (next/dynamic's shape). */
const DYNAMIC = /\bimport\s*\(\s*(["'`])([^"'`\n$]+)\1\s*\)(?:\s*\.then\(\s*\(?\s*([\w$]+)\s*\)?\s*=>\s*(?:\(\s*\{\s*default\s*:\s*)?\3\.([\w$]+))?/g;
const REQUIRE = /\brequire\s*\(\s*(["'])([^"'\n]+)\1\s*\)/g;

/** `{ a, b as c, type T }` → the VALUE bindings by their exported name; all-`type` lists are erased by TypeScript. */
function namedList(list: string): { bindings: Binding[]; typeOnly: boolean } {
  const parts = list.slice(1, -1).split(",").map((s) => s.trim()).filter(Boolean);
  const values = parts.filter((part) => !/^type\s+[\w$]/.test(part));
  const bindings = values.map((part): Binding => {
    const [imported, local] = part.split(/\s+as\s+/).map((s) => s.trim());
    return { how: "named", name: imported === "default" && local ? local : imported };
  });
  return { bindings, typeOnly: parts.length > 0 && values.length === 0 };
}

/** ⭐ THE extractor: comments stripped by the shared scanner, every value-import form read. */
const extractEdges: Extractor = (raw) => {
  const code = decomment(raw);
  const edges: Edge[] = [];
  for (const m of code.matchAll(IMPORT_FROM)) {
    const clause = m[2].trim();
    const bindings: Binding[] = [];
    let rest = clause;
    const def = /^([\w$]+)\s*(?:,\s*([\s\S]*))?$/.exec(clause);
    if (def && !clause.startsWith("{") && !clause.startsWith("*")) {
      bindings.push({ how: "default", name: def[1] });
      rest = (def[2] ?? "").trim();
    }
    let listIsTypes = false;
    if (rest.startsWith("*")) bindings.push({ how: "namespace", name: rest.replace(/\s+/g, " ") });
    else if (rest.startsWith("{")) {
      const list = namedList(rest);
      bindings.push(...list.bindings);
      listIsTypes = list.typeOnly;
    }
    edges.push({ spec: m[4], kind: "import", typeOnly: Boolean(m[1]) || (listIsTypes && bindings.length === 0), bindings });
  }
  for (const m of code.matchAll(EXPORT_FROM)) {
    const clause = m[2].trim();
    if (clause.startsWith("*")) {
      edges.push({ spec: m[4], kind: "reexport", typeOnly: Boolean(m[1]), bindings: [{ how: "namespace", name: clause }] });
      continue;
    }
    const list = namedList(clause);
    edges.push({ spec: m[4], kind: "reexport", typeOnly: Boolean(m[1]) || list.typeOnly, bindings: list.bindings });
  }
  for (const m of code.matchAll(SIDE_EFFECT)) edges.push({ spec: m[2], kind: "side", typeOnly: false, bindings: [] });
  for (const m of code.matchAll(DYNAMIC)) {
    edges.push({ spec: m[2], kind: "dynamic", typeOnly: false, bindings: m[4] ? [{ how: "named", name: m[4] }] : [{ how: "namespace", name: "import()" }] });
  }
  for (const m of code.matchAll(REQUIRE)) edges.push({ spec: m[2], kind: "require", typeOnly: false, bindings: [{ how: "namespace", name: "require()" }] });
  return edges;
};

/** ⛔ EVIDENCE, NOT A TOOL: `test:client-graph-safe`'s own regex (import … from, nothing else). Red R7 swaps it in. */
const naiveEdges: Extractor = (raw) => {
  const edges: Edge[] = [];
  for (const m of raw.matchAll(/^[^\S\n]*import\s+([^;]*?)from\s+["']([^"']+)["']/gm)) {
    if (/^\s*type\b/.test(m[1])) continue;
    edges.push({ spec: m[2], kind: "import", typeOnly: false, bindings: [] });
  }
  return edges;
};

/* ── RESOLUTION ──────────────────────────────────────────────────────────────────────────────────────────────── */

type Target = { kind: "file"; rel: string } | { kind: "package"; name: string } | { kind: "asset" } | { kind: "unresolved"; spec: string };
const EXTS = [".ts", ".tsx", ".js", ".jsx", ".mts", ".mjs"];
const isBare = (spec: string): boolean => !spec.startsWith("@/") && !spec.startsWith(".");
/** "exceljs/dist/x" → "exceljs", "@scope/pkg/x" → "@scope/pkg", "node:fs/promises" → "node:fs". */
const packageName = (spec: string): string => {
  if (spec.startsWith("node:")) return `node:${spec.slice(5).split("/")[0]}`;
  const parts = spec.split("/");
  return spec.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
};
const BUILTINS = new Set(["fs", "path", "zlib", "stream", "crypto", "os", "child_process", "worker_threads"]);
const isBuiltin = (pkg: string): boolean => pkg.startsWith("node:") || BUILTINS.has(pkg);

function resolveSpec(repo: Repo, from: string, spec: string): Target {
  if (isBare(spec)) return { kind: "package", name: packageName(spec) };
  const joined = spec.startsWith("@/") ? `src/${spec.slice(2)}` : posix.join(posix.dirname(from), spec);
  const base = posix.normalize(joined).replace(/\/$/, "");
  if (CODE.test(base) && repo.has(base)) return { kind: "file", rel: base };
  for (const e of EXTS) if (repo.has(base + e)) return { kind: "file", rel: base + e };
  for (const e of EXTS) if (repo.has(`${base}/index${e}`)) return { kind: "file", rel: `${base}/index${e}` };
  if (/\.[A-Za-z0-9]+$/.test(base) && !CODE.test(base)) return { kind: "asset" };
  return { kind: "unresolved", spec };
}

/* ── MEMO: each file is decommented and scanned once per extractor, re-read only when a plant changes it ────── */

type Ctx = { repo: Repo; extract: Extractor };
const edgeMemo = new Map<Extractor, Map<string, { text: string; edges: Edge[] }>>();
function edgesOf(ctx: Ctx, rel: string): Edge[] {
  const text = ctx.repo.read(rel);
  if (text === null) return [];
  let memo = edgeMemo.get(ctx.extract);
  if (!memo) { memo = new Map(); edgeMemo.set(ctx.extract, memo); }
  const hit = memo.get(rel);
  if (hit && hit.text === text) return hit.edges;
  const edges = ctx.extract(text);
  memo.set(rel, { text, edges });
  return edges;
}
const directiveMemo = new Map<string, { text: string; client: boolean; server: boolean }>();
function directivesOf(ctx: Ctx, rel: string): { client: boolean; server: boolean } {
  const text = ctx.repo.read(rel);
  if (text === null) return { client: false, server: false };
  const hit = directiveMemo.get(rel);
  if (hit && hit.text === text) return hit;
  const found = { text, client: isDirective(text, "use client"), server: isDirective(text, "use server") };
  directiveMemo.set(rel, found);
  return found;
}
const isClient = (ctx: Ctx, rel: string): boolean => directivesOf(ctx, rel).client;
const isServerAction = (ctx: Ctx, rel: string): boolean => directivesOf(ctx, rel).server;

/* ── THE WALKS ───────────────────────────────────────────────────────────────────────────────────────────────── */

type Walk = { reached: string[]; parent: Map<string, string>; packages: Map<string, string>; leaves: Set<string>; unresolved: string[] };

/**
 * Follow every VALUE import from `entries`.
 * · "client" — what a browser bundle built from these entries would hold. ⭐ A `"use server"` module reached through
 *   an import is a LEAF: the client receives an action REFERENCE, never the module's body or its graph
 *   (`sensitive-reveal.tsx` → `admin/players/actions.ts` is the shape, and §0.6 proves the rule is what makes it clean).
 * · "raw" — every value import followed, leaves included: what a server module, or a pure one, actually pulls in.
 */
function walk(ctx: Ctx, entries: readonly string[], mode: "client" | "raw"): Walk {
  const entrySet = new Set(entries);
  const seen = new Set(entries);
  const queue = [...entries];
  const parent = new Map<string, string>();
  const packages = new Map<string, string>();
  const leaves = new Set<string>();
  const unresolved: string[] = [];
  for (let i = 0; i < queue.length; i++) {
    const file = queue[i];
    if (mode === "client" && !entrySet.has(file) && isServerAction(ctx, file)) { leaves.add(file); continue; }
    for (const e of edgesOf(ctx, file)) {
      if (e.typeOnly) continue;
      const t = resolveSpec(ctx.repo, file, e.spec);
      if (t.kind === "package") { if (!packages.has(t.name)) packages.set(t.name, file); }
      else if (t.kind === "unresolved") unresolved.push(`${file} → ${t.spec}`);
      else if (t.kind === "file" && !seen.has(t.rel)) { seen.add(t.rel); parent.set(t.rel, file); queue.push(t.rel); }
    }
  }
  return { reached: queue, parent, packages, leaves, unresolved };
}

/** How a walk got to `rel`, entry first. */
function chain(w: Walk, rel: string): string {
  const out = [rel];
  let p = w.parent.get(rel);
  while (p && out.length < 10) { out.push(p); p = w.parent.get(p); }
  return out.reverse().join(" → ");
}

type Crossing = { from: string; to: string; bindings: Binding[]; kind: Edge["kind"] };
/**
 * The SERVER graph from `entries`, stopping at every `"use client"` module and recording the edge that crossed.
 * ⛔ An edge it cannot resolve is RETURNED, never skipped: the islands (§1's client population) and every §4 crossing
 * come from this graph, so a dropped edge would drop an island and its crossing with every assertion green.
 */
function serverGraph(ctx: Ctx, entries: readonly string[]): { modules: string[]; crossings: Crossing[]; unresolved: string[] } {
  const starts = entries.filter((f) => !isClient(ctx, f));
  const seen = new Set(starts);
  const queue = [...starts];
  const crossings: Crossing[] = [];
  const unresolved: string[] = [];
  for (let i = 0; i < queue.length; i++) {
    const file = queue[i];
    for (const e of edgesOf(ctx, file)) {
      if (e.typeOnly) continue;
      const t = resolveSpec(ctx.repo, file, e.spec);
      if (t.kind === "unresolved") { unresolved.push(`${file} → ${t.spec}`); continue; }
      if (t.kind !== "file") continue;
      if (isClient(ctx, t.rel)) { crossings.push({ from: file, to: t.rel, bindings: e.bindings, kind: e.kind }); continue; }
      if (!seen.has(t.rel)) { seen.add(t.rel); queue.push(t.rel); }
    }
  }
  return { modules: queue, crossings, unresolved };
}

/** A component name: a capital, then letters and digits with at least one lower-case (so not PER_PAGE, not URL). */
const PASCAL = /^[A-Z](?=[A-Za-z0-9]*[a-z])[A-Za-z0-9]*$/;
/** The bindings of a crossing that a server module could CALL: namespaces, and anything not PascalCase (use* hooks included). */
const badBindings = (c: Crossing): string[] =>
  c.bindings.filter((b) => b.how === "namespace" || !PASCAL.test(b.name)).map((b) => (b.how === "default" ? `default as ${b.name}` : b.name));
const showCrossing = (c: Crossing): string => `${c.from} → ${c.to} {${badBindings(c).join(", ")}}`;

/* ── WHAT IS OURS ────────────────────────────────────────────────────────────────────────────────────────────── */

const OWNED_TREES = [
  "src/app/admin/contacts/", "src/components/admin/contacts/", "src/lib/contacts/", "src/lib/server/contacts/", "src/app/api/admin/contacts/",
];
const PURE_TREE = "src/lib/contacts/";
const FOUNDATIONS = ["src/lib/contacts/parsed-file.ts", "src/lib/contacts/xlsx-limits.ts"];
/** ⭐ exceljs's value importers, exactly: the report writer, and U27b's reader once that file exists. */
const EXCELJS_IMPORTERS = ["src/lib/server/reports/xlsx.ts", "src/lib/server/contacts/import-xlsx.ts"];
const READER_MODULES = ["src/lib/server/contacts/import-xlsx.ts", "src/lib/server/contacts/zip-inspect.ts", "src/lib/server/contacts/xlsx-cells.ts"];
/** The book, the database, the audit trail and the session: a function of the bytes consults none of them. */
const BOOK_MODULES = [
  "src/lib/server/store.ts", "src/lib/server/prisma.ts", "src/lib/server/prisma-dal.ts",
  "src/lib/server/audit.ts", "src/lib/server/auth-service.ts", "src/lib/server/session.ts",
];
const STORE = "src/lib/server/store.ts";
const PAGE = "src/app/admin/contacts/page.tsx";
const LOADER = "src/app/admin/contacts/contacts-loader.ts";
const SENSITIVE_REVEAL = "src/components/ui/sensitive-reveal.tsx";
const CLIENT_GRAPH_SAFE = "scripts/client-graph-safe.test.mjs";
const ACTION_HANDLER = "node_modules/next/dist/server/app-render/action-handler.js";
const APP_ENTRY = /^(?:page|layout|template|loading|error|global-error|not-found|forbidden|unauthorized|default|route|opengraph-image|twitter-image|icon|apple-icon|sitemap|robots|manifest)\.(?:tsx?|jsx?)$/;
const ROOT_ENTRIES = ["src/proxy.ts", "src/middleware.ts", "src/instrumentation.ts"];
/**
 * §4.2's pinned offenders — server modules anywhere in src/app that hand a "use client" module's non-component export
 * to the server. ⛔ MAY ONLY SHRINK. Measured EMPTY on 2026-10-01 (then the eight lazy `import()`s in `app-shell.tsx`,
 * read as the component each `.then` picks; since S6 WP6c AppShell imports its PascalCase `Lazy…` parts from
 * `shell-lazy.tsx`, and `OfflineBanner` from its own file, instead). The live counts are in §4.2's PASS line, never
 * recorded here.
 */
const PINNED_CROSSINGS: readonly string[] = [];

/**
 * §5.2 · what touching the disk looks like. ⛔ BUILT BY CONCATENATION: spelled whole, a file-writing call in this
 * file — even inside a pattern — would move this suite out of `test:red-anchors`' in-process class.
 */
const DISK_CALLS = [
  "write" + "File", "append" + "File", "rm", "unlink", "rename", "copy" + "File", "cp", "mk" + "dtemp",
  "create" + "WriteStream", "tmp" + "dir", "read" + "File",
];
const DISK_TOUCH = new RegExp(/(?<![\w$])/.source + "(?:" + DISK_CALLS.join("|") + ")" + /(?:Sync)?\s*\(/.source);
/** exceljs's streaming reader spools every sheet to a temp file (workbook-reader.js); the in-memory load does not. */
const STREAMING = /\bWorkbookReader\b|\bstream\.xlsx\b|\bxlsx\.readFile\b/;
const DISK_PACKAGES = new Set(["fs", "node:fs", "os", "node:os", "tmp", "tmp-promise"]);
/** §2.6 · a declaration of the shape, as a type or an interface. */
const SHAPE_DECLARATION = /\bexport\s+(?:type|interface)\s+ParsedContactsFile\b/g;
/** §2.7 · the phone-format remedy spelled out (A1.6): only `PHONE_FORMAT_REMEDY` in xlsx-limits.ts may hold it. */
const REMEDY_SPELLED = /Number with 0 decimal places/gi;
const XLSX_LIMITS = "src/lib/contacts/xlsx-limits.ts";

/** The `PINNED` list of `test:client-graph-safe`, read from its source (paths relative to src/). */
function pinnedList(repo: Repo): string[] {
  const text = repo.read(CLIENT_GRAPH_SAFE);
  if (text === null) return [];
  const code = decomment(text);
  const at = code.indexOf("const PINNED = [");
  const end = at < 0 ? -1 : code.indexOf("];", at);
  if (end < 0) return [];
  return [...code.slice(at, end).matchAll(/"([^"\n]+)"/g)].map((m) => m[1]);
}

/* ── THE CONTRACT UNDER TEST, SWAPPABLE ──────────────────────────────────────────────────────────────────────── */

type Contract = {
  limits: { NEXT_ACTION_BODY_LIMIT_BYTES: number; XLSX_ENVELOPE_ALLOWANCE: number; XLSX_MAX_BYTES: number; XLSX_MAX_BASE64_CHARS: number };
  base64LengthFor: (bytes: number) => number;
  decodedBytes: (base64: string) => number;
  overCap: (base64: string) => boolean;
  sniff: typeof sniffSpreadsheetBytes;
  headKind: typeof spreadsheetHeadKind;
  sentence: (r: XlsxRefusal, ctx?: XlsxRefusalContext) => string;
  formatFileSize: (bytes: number) => string;
  isParsed: (x: unknown) => boolean;
  looksShortened: (text: string) => boolean;
  rowList: (lines: readonly number[]) => string;
};
type Impl = { overlay: Overlay; extract: Extractor; contract: Contract };

const REAL_CONTRACT: Contract = {
  limits: { NEXT_ACTION_BODY_LIMIT_BYTES, XLSX_ENVELOPE_ALLOWANCE, XLSX_MAX_BYTES, XLSX_MAX_BASE64_CHARS },
  base64LengthFor,
  decodedBytes: base64DecodedBytes,
  overCap: xlsxBase64OverCap,
  sniff: sniffSpreadsheetBytes,
  headKind: spreadsheetHeadKind,
  sentence: xlsxRefusalSentence,
  formatFileSize,
  isParsed: isParsedContactsFile,
  looksShortened: looksExcelShortened,
  rowList: formatRowList,
};
const REAL: Impl = { overlay: {}, extract: extractEdges, contract: REAL_CONTRACT };

/* ── THE ASSERTIONS ──────────────────────────────────────────────────────────────────────────────────────────── */

const L = {
  c01: "§0.1 POSITIVE · a bare specifier is seen: src/lib/server/reports/xlsx.ts reaches the package exceljs",
  c02: "§0.2 POSITIVE · @/ and relative resolution: every local import of page.tsx and contacts-loader.ts resolves to a file, and page.tsx reaches src/lib/server/store.ts",
  c03: "§0.3 POSITIVE · `export * from` and `export { … } from` are followed (a virtual re-export of a module that imports exceljs reaches exceljs)",
  c04: "§0.4 POSITIVE · a dynamic import() and a side-effect import are followed",
  c05: "§0.5 NEGATIVE · `import type` and an all-`type` named list are erased; a mixed list is still a value import",
  c06: "§0.6 LEAF · a \"use client\" file importing a \"use server\" module is CLEAN, while the same walk with leaves ignored reaches src/lib/server",
  c07: "§0.7 DIRECTIVES · ≥100 \"use client\" files repo-wide; a directive after a comment block under CRLF is seen (on the raw CRLF text, and once tidied), one after code or inside a comment is not",
  c08: "§0.8 POPULATION · the pure modules (≥2) and the client islands the owned routes render (≥1) are not zero",
  c09: "§0.9 every relative and @/ import in the client, pure and owned-server graphs resolves (an unresolved edge is a blind spot, not a pass)",
  s11: "§1.1 no owned client file and no client island an owned route renders reaches src/lib/server/** except through a \"use server\" leaf",
  s12: "§1.2 …nor the package exceljs (its browser build would ship ~948 KB into the admin chunk with typecheck and build green)",
  s13: "§1.3 …nor a Node builtin",
  s21: "§2.1 no module under src/lib/contacts/** carries a \"use client\" or \"use server\" directive (the kycGateState shape)",
  s22: "§2.2 src/lib/contacts/** reaches no src/lib/server/**, no src/app/** (not even a leaf) and no \"use client\" module",
  s23: "§2.3 …and no exceljs and no Node builtin",
  s24: "§2.4 every src/lib/contacts/** module is pinned in test:client-graph-safe's PINNED",
  s25: "§2.5 the two foundations (parsed-file.ts, xlsx-limits.ts) exist and import nothing at all",
  s26: "§2.6 exactly ONE `export type ParsedContactsFile` exists in src, in parsed-file.ts (decision C15: every producer imports it)",
  s27: "§2.7 the phone-format remedy is spelled ONCE in src (A1.6): only xlsx-limits.ts' PHONE_FORMAT_REMEDY holds 'Number with 0 decimal places', and every other sentence interpolates it",
  s31: "§3.1 the src files with a VALUE import of exceljs are exactly the report writer (plus U27b's reader once it exists)",
  s32: "§3.2 no \"use client\" file anywhere in src reaches exceljs (every client walked, leaves respected)",
  s41: "§4.1 every edge from an owned route's server graph into a \"use client\" module imports only PascalCase bindings",
  s42: "§4.2 RATCHET · the same over every src/app entry: no offender outside the pinned list (empty, 2026-10-01), and every edge of that graph resolves",
  s51: "§5.1 the reader modules reach no store, prisma, prisma-dal, audit, auth-service or session module",
  s52: "§5.2 nothing under src/lib/server/contacts/** touches the disk (no streaming WorkbookReader, no temp dir, no fs import, no file call)",
  s61: "§6.1 next.config.ts sets no bodySizeLimit (OD29: the money forms inherit the global ceiling)",
  s62: "§6.2 the installed Next still defaults a server action body to '1 MB' = 1024 * 1024",
  s63: "§6.3 base64LengthFor(XLSX_MAX_BYTES) + XLSX_ENVELOPE_ALLOWANCE ≤ NEXT_ACTION_BODY_LIMIT_BYTES === 1048576",
  s64: "§6.4 the too_large sentence names the measured size, the cap, CSV, and the remedy clause ('Number with 0 decimal places')",
  s65: "§6.5 the size gate is EXACT (A1.4): the decoded size is read off the base64 length and padding, so 700 KiB passes and 700 KiB + 1 and + 2 bytes refuse, by length alone, before any decode",
  s71: "§7.1 the sniffer reads the FULL magic bytes (a CSV starting \"PK\" is text), and the classifier tells xlsx, ods, xls and protected apart — protected even when EncryptionInfo sits past the first 4 KB",
  s72: "§7.2 isParsedContactsFile accepts a well-formed file and refuses every malformed one (order, line, cell, blank row, width, counts, notes, unreadable)",
  s73: "§7.3 every refusal and wrong-format kind has its own sentence with no digit run, every sentence that names CSV carries PHONE_FORMAT_REMEDY, a sheet name with 7+ digits (spaced or not) is never echoed, and sizes round UP",
  s74: "§7.4 the Excel-shortened detector catches 2.55713E+11 in every spelling and never a whole number",
  s75: "§7.5 a note's row list reads \"rows 4, 9 and 12\" and stops at NOTE_LIST_CAP with the true count",
} as const;

let pass = 0, fail = 0;
let QUIET = false;
const failed: string[] = [];
const ok = (l: string, c: boolean, x = "") => {
  if (c) pass++; else { fail++; failed.push(l); }
  if (!c || !QUIET) console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`);
};
const note = (s: string) => { if (!QUIET) console.log(`     ${s}`); };
const named = (list: readonly string[], none: string) => (list.length ? list.join(", ") : none);

const PROBE = "src/__contacts_boundary_probe__";
const PROBE_FILES: Overlay = {
  [`${PROBE}/reexport-star.ts`]: `export * from "./b";\n`,
  [`${PROBE}/reexport-named.ts`]: `export { B as C } from "./b";\n`,
  [`${PROBE}/b.ts`]: `import ExcelJS from "exceljs";\nexport const B = ExcelJS;\n`,
  [`${PROBE}/dynamic.ts`]: `export const load = () => import("exceljs");\n`,
  [`${PROBE}/side.ts`]: `import "./side-target";\n`,
  [`${PROBE}/side-target.ts`]: `import "exceljs";\n`,
  [`${PROBE}/types.ts`]: `import type { CellValue } from "exceljs";\nimport { type Workbook } from "exceljs";\nexport type V = CellValue | Workbook;\n`,
  [`${PROBE}/mixed.ts`]: `import { type Workbook, ValueType } from "exceljs";\nexport type W = Workbook;\nexport const T = ValueType;\n`,
  [`${PROBE}/leaf-dialog.tsx`]: `"use client";\nimport { act } from "./leaf-actions";\nexport function Dialog() { return act ? null : null; }\n`,
  [`${PROBE}/leaf-actions.ts`]: `"use server";\nimport { db } from "@/lib/server/store";\nexport async function act() { return Boolean(db); }\n`,
  [`${PROBE}/directive-after-comments.tsx`]: `/**\r\n * a header\r\n */\r\n// a line\r\n"use client";\r\nexport const A = 1;\r\n`,
  [`${PROBE}/directive-after-code.tsx`]: `export const x = 1;\n"use client";\n`,
  [`${PROBE}/directive-in-comment.tsx`]: `/* "use client" */\nexport const x = 1;\n`,
};

/** A zip whose FIRST local entry is `name` holding `data`, stored (method 0) — enough head for the classifier. */
function zipHead(name: string, data: string): Uint8Array {
  const n = Array.from(name, (ch) => ch.charCodeAt(0));
  const d = Array.from(data, (ch) => ch.charCodeAt(0));
  const lo = d.length & 255, hi = (d.length >> 8) & 255;
  const header = [0x50, 0x4b, 0x03, 0x04, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, lo, hi, 0, 0, lo, hi, 0, 0, n.length, 0, 0, 0];
  return Uint8Array.from([...header, ...n, ...d]);
}
const ascii = (s: string): Uint8Array => Uint8Array.from(Array.from(s, (ch) => ch.charCodeAt(0)));
const utf16le = (s: string): number[] => Array.from(s).flatMap((ch) => [ch.charCodeAt(0), 0]);
const ZIP_HEAD = [0x50, 0x4b, 0x03, 0x04];
const CFB_HEAD = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

function runAssertions(impl: Impl, tag: string): void {
  const p = (label: string) => `${tag}${label}`;
  const ctx: Ctx = { repo: makeRepo(impl.overlay), extract: impl.extract };
  const repo = ctx.repo;
  const probe: Ctx = { repo: makeRepo({ ...impl.overlay, ...PROBE_FILES }), extract: impl.extract };

  // ── the populations, derived every run ────────────────────────────────────────────────────────────────────
  const owned = repo.files.filter((f) => OWNED_TREES.some((t) => f.startsWith(t)));
  const ownedClient = owned.filter((f) => isClient(ctx, f));
  const pure = owned.filter((f) => f.startsWith(PURE_TREE));
  const ownedServer = owned.filter((f) => !f.startsWith(PURE_TREE) && !isClient(ctx, f));
  const ownedGraph = serverGraph(ctx, ownedServer);
  const islands = [...new Set(ownedGraph.crossings.map((c) => c.to))].sort();
  const clientPopulation = [...new Set([...ownedClient, ...islands])].sort();
  const allClients = repo.files.filter((f) => isClient(ctx, f));

  // ── §0 · THE WALKER CAN FAIL ──────────────────────────────────────────────────────────────────────────────
  const xlsxWalk = walk(ctx, ["src/lib/server/reports/xlsx.ts"], "raw");
  ok(p(L.c01), xlsxWalk.packages.has("exceljs"), `${xlsxWalk.reached.length} module(s) walked`);

  const pageWalk = walk(ctx, [PAGE], "raw");
  const localTargets = (f: string) => edgesOf(ctx, f).filter((e) => !e.typeOnly && !isBare(e.spec)).map((e) => ({ spec: e.spec, t: resolveSpec(repo, f, e.spec) }));
  const pageTargets = localTargets(PAGE);
  const loaderTargets = localTargets(LOADER);
  const localMisses = [...pageTargets, ...loaderTargets].filter((x) => x.t.kind !== "file").map((x) => x.spec);
  ok(p(L.c02), pageWalk.reached.includes(STORE) && pageTargets.length >= 3 && loaderTargets.length >= 1 && localMisses.length === 0,
    `page: ${pageTargets.length} local import(s), loader: ${loaderTargets.length}, store reached via ${pageWalk.parent.get(STORE) ?? "nothing"}${localMisses.length ? ` · unresolved ${localMisses.join(", ")}` : ""}`);

  const reachesExcel = (f: string) => walk(probe, [`${PROBE}/${f}`], "raw").packages.has("exceljs");
  ok(p(L.c03), reachesExcel("reexport-star.ts") && reachesExcel("reexport-named.ts"),
    `star ${reachesExcel("reexport-star.ts")} · named ${reachesExcel("reexport-named.ts")}`);
  ok(p(L.c04), reachesExcel("dynamic.ts") && reachesExcel("side.ts"), `dynamic ${reachesExcel("dynamic.ts")} · side-effect ${reachesExcel("side.ts")}`);
  ok(p(L.c05), !reachesExcel("types.ts") && reachesExcel("mixed.ts"), `type-only reaches ${reachesExcel("types.ts")} · mixed reaches ${reachesExcel("mixed.ts")}`);

  const serverIn = (w: Walk) => w.reached.filter((f) => f.startsWith("src/lib/server/") && !w.leaves.has(f));
  const realLeaf = walk(ctx, [SENSITIVE_REVEAL], "client");
  const realRaw = walk(ctx, [SENSITIVE_REVEAL], "raw");
  const virtualLeaf = walk(probe, [`${PROBE}/leaf-dialog.tsx`], "client");
  const virtualRaw = walk(probe, [`${PROBE}/leaf-dialog.tsx`], "raw");
  ok(p(L.c06),
    isClient(ctx, SENSITIVE_REVEAL) && realLeaf.leaves.size > 0 && serverIn(realLeaf).length === 0 && serverIn(realRaw).length > 0
      && virtualLeaf.leaves.has(`${PROBE}/leaf-actions.ts`) && serverIn(virtualLeaf).length === 0 && virtualRaw.reached.includes(STORE),
    `sensitive-reveal: leaf ${named([...realLeaf.leaves], "none")}, raw reaches ${serverIn(realRaw).slice(0, 2).join(", ") || "nothing"}`);

  // The repo reader tidies CRLF away before isDirective sees it, so the CRLF case is ALSO asserted on the raw text
  // (and the raw text is checked to really carry CRLF, so the control cannot quietly become an LF one).
  const rawCrlf = PROBE_FILES[`${PROBE}/directive-after-comments.tsx`] ?? "";
  const rawCrlfAfterCode = "export const x = 1;\r\n\"use client\";\r\n";
  const directiveCases = [
    isClient(probe, `${PROBE}/directive-after-comments.tsx`),
    rawCrlf.includes("\r\n") && isDirective(rawCrlf, "use client"),
    !isDirective(rawCrlfAfterCode, "use client"),
    !isClient(probe, `${PROBE}/directive-after-code.tsx`),
    !isClient(probe, `${PROBE}/directive-in-comment.tsx`),
  ];
  ok(p(L.c07), allClients.length >= 100 && directiveCases.every(Boolean), `${allClients.length} "use client" files · controls ${directiveCases.join("/")}`);

  note(`owned client files (${ownedClient.length}): ${named(ownedClient, "none yet — the rule binds the first one")}`);
  note(`client islands the owned routes render (${islands.length}): ${named(islands, "none")}`);
  note(`owned pure modules (${pure.length}): ${named(pure, "none")}`);
  note(`owned server modules (${ownedServer.length}): ${named(ownedServer, "none")} — their graph: ${ownedGraph.modules.length} modules`);
  ok(p(L.c08), pure.length >= 2 && islands.length >= 1, `pure ${pure.length} · islands ${islands.length} · owned client ${ownedClient.length} · owned server ${ownedServer.length}`);

  const clientWalk = walk(ctx, clientPopulation, "client");
  const pureWalk = walk(ctx, pure, "raw");
  const unresolved = [...clientWalk.unresolved, ...pureWalk.unresolved, ...ownedGraph.unresolved];
  ok(p(L.c09), unresolved.length === 0, unresolved.slice(0, 4).join(" | ")
    || `${clientWalk.reached.length + pureWalk.reached.length} client/pure modules and ${ownedGraph.modules.length} owned-server modules, every edge resolved`);

  // ── §1 · THE CLIENT SIDE OF THE OWNED ROUTES ──────────────────────────────────────────────────────────────
  const serverHits = serverIn(clientWalk);
  ok(p(L.s11), serverHits.length === 0, serverHits.slice(0, 3).map((f) => chain(clientWalk, f)).join(" | ")
    || `${clientPopulation.length} entries, ${clientWalk.reached.length} modules, leaves: ${named([...clientWalk.leaves], "none")}`);
  const excelFrom = clientWalk.packages.get("exceljs");
  ok(p(L.s12), excelFrom === undefined, excelFrom ? `${chain(clientWalk, excelFrom)} → exceljs` : "");
  const clientBuiltins = [...clientWalk.packages.keys()].filter(isBuiltin);
  ok(p(L.s13), clientBuiltins.length === 0, clientBuiltins.map((b) => `${chain(clientWalk, clientWalk.packages.get(b) ?? "")} → ${b}`).join(" | "));

  // ── §2 · THE PURE MODULES ─────────────────────────────────────────────────────────────────────────────────
  const withDirective = pure.filter((f) => isClient(ctx, f) || isServerAction(ctx, f));
  ok(p(L.s21), withDirective.length === 0, withDirective.join(", "));
  const pureBad = pureWalk.reached.filter((f) => f.startsWith("src/lib/server/") || f.startsWith("src/app/") || (!pure.includes(f) && isClient(ctx, f)));
  ok(p(L.s22), pureBad.length === 0, pureBad.slice(0, 3).map((f) => chain(pureWalk, f)).join(" | "));
  const purePackages = [...pureWalk.packages.keys()].filter((n) => n === "exceljs" || isBuiltin(n));
  ok(p(L.s23), purePackages.length === 0, purePackages.map((n) => `${pureWalk.packages.get(n)} → ${n}`).join(" | "));
  const pinned = pinnedList(repo);
  const unpinned = pure.filter((f) => !pinned.includes(f.slice("src/".length)));
  ok(p(L.s24), pinned.length > 0 && unpinned.length === 0, pinned.length ? named(unpinned, "") : "PINNED not found in scripts/client-graph-safe.test.mjs");
  const foundations = FOUNDATIONS.map((f) => ({ f, exists: repo.has(f), imports: edgesOf(ctx, f).length }));
  ok(p(L.s25), foundations.every((x) => x.exists && x.imports === 0),
    foundations.filter((x) => !x.exists || x.imports > 0).map((x) => (x.exists ? `${x.f}: ${x.imports} import(s)` : `${x.f}: missing`)).join(" | "));
  // Only files that name the shape at all are decommented, so this costs one `includes` per file.
  const declarers = repo.files.flatMap((f) => {
    const text = repo.read(f) ?? "";
    if (!text.includes("ParsedContactsFile")) return [];
    const n = (decomment(text).match(SHAPE_DECLARATION) ?? []).length;
    return n === 0 ? [] : [n === 1 ? f : `${f} ×${n}`];
  });
  ok(p(L.s26), declarers.length === 1 && declarers[0] === FOUNDATIONS[0], named(declarers, "none"));
  // The same cheap filter: only files whose raw text says "decimal places" are decommented. Comments may explain the
  // remedy; CODE (strings included) may spell it only in the one constant.
  const spellers = repo.files.flatMap((f) => {
    const text = repo.read(f) ?? "";
    if (!/decimal places/i.test(text)) return [];
    const n = (decomment(text).match(REMEDY_SPELLED) ?? []).length;
    return n === 0 ? [] : [`${f} ×${n}`];
  });
  ok(p(L.s27), spellers.length === 1 && spellers[0] === `${XLSX_LIMITS} ×1` && PHONE_FORMAT_REMEDY.includes("Number with 0 decimal places"),
    named(spellers, "none — the constant lost its words"));

  // ── §3 · EXCELJS STAYS WHERE IT IS ────────────────────────────────────────────────────────────────────────
  const allowed = EXCELJS_IMPORTERS.filter((f) => repo.has(f));
  const importers = repo.files.filter((f) => edgesOf(ctx, f).some((e) => !e.typeOnly && isBare(e.spec) && packageName(e.spec) === "exceljs"));
  const sameSet = importers.length === allowed.length && importers.every((f) => allowed.includes(f));
  ok(p(L.s31), sameSet && importers.includes(EXCELJS_IMPORTERS[0]), `importers: ${named(importers, "none")} · allowed: ${allowed.join(", ")}`);
  const everyClient = walk(ctx, allClients, "client");
  const excelVia = everyClient.packages.get("exceljs");
  ok(p(L.s32), excelVia === undefined, excelVia ? `${chain(everyClient, excelVia)} → exceljs` : `${allClients.length} clients, ${everyClient.reached.length} modules walked`);

  // ── §4 · SERVER → CLIENT: COMPONENTS ONLY ─────────────────────────────────────────────────────────────────
  const ownedBad = ownedGraph.crossings.filter((c) => badBindings(c).length > 0);
  ok(p(L.s41), ownedBad.length === 0, ownedBad.map(showCrossing).join(" | ")
    || `${ownedGraph.crossings.length} crossing(s), e.g. ${ownedGraph.crossings.slice(0, 2).map((c) => `${c.from} → ${c.to} {${c.bindings.map((b) => b.name).join(", ")}}`).join("; ")}`);
  const appEntries = repo.files.filter((f) => (f.startsWith("src/app/") && APP_ENTRY.test(posix.basename(f))) || isServerAction(ctx, f) || ROOT_ENTRIES.includes(f));
  const appGraph = serverGraph(ctx, appEntries);
  const offenders = appGraph.crossings.filter((c) => badBindings(c).length > 0).map(showCrossing);
  const fresh = offenders.filter((o) => !PINNED_CROSSINGS.includes(o));
  const appUnresolved = appGraph.unresolved.map((u) => `unresolved ${u}`);
  ok(p(L.s42), fresh.length === 0 && appUnresolved.length === 0, [...fresh, ...appUnresolved].slice(0, 4).join(" | ")
    || `${appEntries.length} entries, ${appGraph.modules.length} server modules, ${appGraph.crossings.length} crossings, every edge resolved`);

  // ── §5 · THE READER'S DATA BOUNDARY ───────────────────────────────────────────────────────────────────────
  const readers = READER_MODULES.filter((f) => repo.has(f));
  const bookHits: string[] = [];
  for (const r of readers) {
    const w = walk(ctx, [r], "raw");
    for (const f of BOOK_MODULES) if (w.reached.includes(f)) bookHits.push(chain(w, f));
  }
  ok(p(L.s51), bookHits.length === 0, bookHits.slice(0, 3).join(" | ") || `${readers.length} reader module(s)${readers.length ? "" : " — none yet; the rule binds the first one"}`);
  const serverContacts = repo.files.filter((f) => f.startsWith("src/lib/server/contacts/"));
  const diskHits: string[] = [];
  for (const f of serverContacts) {
    const code = decomment(repo.read(f) ?? "");
    const touch = DISK_TOUCH.exec(code) ?? STREAMING.exec(code);
    if (touch) diskHits.push(`${f}: ${touch[0].trim()}`);
    for (const e of edgesOf(ctx, f)) if (!e.typeOnly && isBare(e.spec) && DISK_PACKAGES.has(packageName(e.spec))) diskHits.push(`${f}: imports ${e.spec}`);
  }
  ok(p(L.s52), diskHits.length === 0, diskHits.slice(0, 3).join(" | ") || `${serverContacts.length} module(s) under src/lib/server/contacts`);

  // ── §6 · THE TRANSPORT BOUNDARY (OD29) ────────────────────────────────────────────────────────────────────
  const nextConfig = decomment(repo.read("next.config.ts") ?? "");
  ok(p(L.s61), nextConfig.length > 0 && !/bodySizeLimit/.test(nextConfig), nextConfig.length ? "" : "next.config.ts not found");
  const handler = repo.read(ACTION_HANDLER) ?? "";
  ok(p(L.s62), handler.includes("defaultBodySizeLimit = '1 MB'") && handler.includes("1024 * 1024"), handler ? "" : `${ACTION_HANDLER} not found`);
  const c = impl.contract;
  const sum = c.base64LengthFor(c.limits.XLSX_MAX_BYTES) + c.limits.XLSX_ENVELOPE_ALLOWANCE;
  ok(p(L.s63), c.limits.NEXT_ACTION_BODY_LIMIT_BYTES === 1048576 && sum <= c.limits.NEXT_ACTION_BODY_LIMIT_BYTES
    && c.limits.XLSX_MAX_BASE64_CHARS === c.base64LengthFor(c.limits.XLSX_MAX_BYTES), `${sum} ≤ ${c.limits.NEXT_ACTION_BODY_LIMIT_BYTES}`);
  const tooLarge = c.sentence("too_large", { bytes: 800 * 1024 });
  ok(p(L.s64), tooLarge.includes("800 KB") && tooLarge.includes("700 KB") && tooLarge.includes("CSV")
    && tooLarge.includes(PHONE_FORMAT_REMEDY) && tooLarge.includes("Number with 0 decimal places"), tooLarge);

  // A1.4 · real base64 (Buffer's own encoder) for sizes either side of every padding case and of the cap, padded and
  // unpadded; then the gate at the cap, and a field that is not base64 at all, refused by its length alone.
  const b64 = (n: number): string => Buffer.alloc(n).toString("base64");
  const exact = [0, 1, 2, 3, 4, 5, XLSX_MAX_BYTES - 2, XLSX_MAX_BYTES - 1, XLSX_MAX_BYTES, XLSX_MAX_BYTES + 1, XLSX_MAX_BYTES + 2, XLSX_MAX_BYTES + 3];
  const gateFaults = [
    ...exact.filter((n) => c.decodedBytes(b64(n)) !== n).map((n) => `${n} bytes (padded) read as ${c.decodedBytes(b64(n))}`),
    ...exact.filter((n) => c.decodedBytes(b64(n).replace(/=+$/, "")) !== n).map((n) => `${n} bytes (unpadded) read as ${c.decodedBytes(b64(n).replace(/=+$/, ""))}`),
    b64(XLSX_MAX_BYTES + 1).length === b64(XLSX_MAX_BYTES).length ? "" : "control: 700 KiB and 700 KiB + 1 no longer share a base64 length",
    c.overCap(b64(XLSX_MAX_BYTES)) ? "700 KiB was refused" : "",
    c.overCap(b64(XLSX_MAX_BYTES + 1)) ? "" : "700 KiB + 1 byte reaches the decoder",
    c.overCap(b64(XLSX_MAX_BYTES + 2)) ? "" : "700 KiB + 2 bytes reaches the decoder",
    c.overCap("!".repeat(XLSX_MAX_BASE64_CHARS + 4)) ? "" : "an over-long field that is not base64 was not refused by its length",
    c.overCap("") ? "an empty field was refused as too large" : "",
  ].filter(Boolean);
  ok(p(L.s65), gateFaults.length === 0, gateFaults.join(" · "));

  // ── §7 · THE SHARED CONTRACT, EXECUTED ────────────────────────────────────────────────────────────────────
  const sniffs: Array<[string, boolean]> = [
    ["zip local header", c.sniff(Uint8Array.from([...ZIP_HEAD, 20, 0])) === "zip"],
    ["CFB header", c.sniff(Uint8Array.from([...CFB_HEAD, 0, 0])) === "cfb"],
    ["a CSV starting PK", c.sniff(ascii("PK,phone\n0712345678\n")) === "other"],
    ["an empty zip's end record", c.sniff(Uint8Array.from([0x50, 0x4b, 0x05, 0x06])) === "other"],
    ["a 3-byte head", c.sniff(Uint8Array.from([0x50, 0x4b, 0x03])) === "other"],
    ["no bytes", c.sniff(new Uint8Array(0)) === "other"],
    ["an ODS head", c.headKind(zipHead("mimetype", ODS_MIMETYPE)) === "ods"],
    ["an OOXML head", c.headKind(zipHead("[Content_Types].xml", "<?xml version")) === "xlsx"],
    ["a protected workbook", c.headKind(Uint8Array.from([...CFB_HEAD, ...utf16le("EncryptionInfo")])) === "protected"],
    ["a protected workbook whose EncryptionInfo sits past the first 4 KB", c.headKind(Uint8Array.from([...CFB_HEAD, ...new Array<number>(4096).fill(0), ...utf16le("EncryptionInfo")])) === "protected"],
    ["a legacy .xls", c.headKind(Uint8Array.from([...CFB_HEAD, ...utf16le("Workbook")])) === "xls"],
    ["text", c.headKind(ascii("Name,Phone\n")) === null],
  ];
  ok(p(L.s71), sniffs.every(([, v]) => v), sniffs.filter(([, v]) => !v).map(([n]) => n).join(", "));

  const good = {
    format: "xlsx", fileName: "book.xlsx",
    rows: [{ line: 1, cells: ["Name", "Phone"] }, { line: 3, cells: ["Asha", "0712345678", ""] }, { line: 5, cells: [" ", ""] }],
    width: 3, blankRows: 1, notes: ["Row 2 was blank."], unreadable: [{ line: 4, reason: "This record is cut off before its end, so it was not read." }],
  };
  const noNotes: Record<string, unknown> = { ...good };
  delete noNotes.notes;
  const noUnreadable: Record<string, unknown> = { ...good };
  delete noUnreadable.unreadable;
  const malformed: Array<[string, unknown]> = [
    ["format xls", { ...good, format: "xls" }],
    ["line 0", { ...good, rows: [{ line: 0, cells: ["a"] }], width: 1 }],
    ["lines going down", { ...good, rows: [{ line: 3, cells: ["a"] }, { line: 2, cells: ["b"] }], width: 1 }],
    ["a line repeated", { ...good, rows: [{ line: 2, cells: ["a"] }, { line: 2, cells: ["b"] }], width: 1 }],
    ["a fractional line", { ...good, rows: [{ line: 1.5, cells: ["a"] }], width: 1 }],
    ["a number cell", { ...good, rows: [{ line: 1, cells: [712345678] }], width: 1 }],
    ["a blank row (every cell empty) emitted instead of counted", { ...good, rows: [{ line: 1, cells: ["", ""] }], width: 2 }],
    ["a row with no cells", { ...good, rows: [{ line: 1, cells: [] }], width: 0 }],
    ["width too wide", { ...good, width: 4 }],
    ["width too narrow", { ...good, width: 2 }],
    ["negative blank rows", { ...good, blankRows: -1 }],
    ["a note that is not text", { ...good, notes: [7] }],
    ["a numeric file name", { ...good, fileName: 5 }],
    ["no notes", noNotes],
    ["no unreadable list", noUnreadable],
    ["unreadable that is not a list", { ...good, unreadable: "none" }],
    ["an unreadable line that is also a row's line", { ...good, unreadable: [{ line: 3, reason: "Not read." }] }],
    ["unreadable lines going down", { ...good, unreadable: [{ line: 6, reason: "Not read." }, { line: 4, reason: "Not read." }] }],
    ["an unreadable line 0", { ...good, unreadable: [{ line: 0, reason: "Not read." }] }],
    ["an unreadable record with an empty reason", { ...good, unreadable: [{ line: 4, reason: " " }] }],
    ["an unreadable record with no reason", { ...good, unreadable: [{ line: 4 }] }],
    ["null", null],
    ["an array", [good]],
  ];
  const accepted = [good, { ...good, fileName: null, rows: [], width: 0, blankRows: 0, notes: [], unreadable: [] }].every((x) => c.isParsed(x));
  const lax = malformed.filter(([, x]) => c.isParsed(x)).map(([n]) => n);
  ok(p(L.s72), accepted && lax.length === 0, accepted ? lax.join(", ") : "a well-formed file was refused");

  const sentences = [
    ...XLSX_REFUSALS.map((r) => c.sentence(r)),
    ...WRONG_FORMAT_KINDS.map((k) => c.sentence("wrong_format", { kind: k })),
    c.sentence("too_large", { bytes: 2 * 1024 * 1024 }),
    c.sentence("empty", { sheet: "Contacts" }),
  ];
  const kindSentences = new Set(WRONG_FORMAT_KINDS.map((k) => c.sentence("wrong_format", { kind: k })));
  const refusalSentences = new Set(XLSX_REFUSALS.map((r) => c.sentence(r)));
  /** A run of 7+ digits once the separators a phone number is written with are removed ("0712 345 678" included). */
  const digitRun = (s: string): boolean => /\d{7,}/.test(s.replace(/[\s\-.()+\/]/g, ""));
  const csvWithoutRemedy = sentences.filter((s) => /\bCSV\b/i.test(s) && !s.includes(PHONE_FORMAT_REMEDY));
  const digitSheet = c.sentence("empty", { sheet: "255712345678" });
  const spacedSheets = ["0712 345 678", "+255 712-345-678", "0712.345.678"].map((name) => ({ name, said: c.sentence("empty", { sheet: name }) }));
  const echoedSpaced = spacedSheets.filter(({ name, said }) => said.includes(name) || digitRun(said)).map(({ name }) => name);
  const shortDigitSheet = c.sentence("empty", { sheet: "Contacts 2026" });
  const bellSheet = c.sentence("empty", { sheet: `Con${String.fromCharCode(7)}tacts` });
  const sizes: Array<[number, string]> = [[716800, "700 KB"], [716801, "701 KB"], [718848, "702 KB"], [1468006, "1.4 MB"], [2097152, "2 MB"], [1, "1 KB"], [0, "0 KB"], [Number.NaN, "0 KB"]];
  const wrongSizes = sizes.filter(([b, want]) => c.formatFileSize(b) !== want).map(([b, want]) => `${b} → ${c.formatFileSize(b)} (want ${want})`);
  const overCap = c.sentence("too_large", { bytes: XLSX_MAX_BYTES + 1 });
  const sentenceFaults = [
    ...sentences.filter((s) => typeof s !== "string" || s.length < 20 || !s.endsWith(".") || digitRun(s)).map((s) => `bad sentence: ${s}`),
    kindSentences.size === WRONG_FORMAT_KINDS.length ? "" : "two wrong-format kinds share a sentence",
    refusalSentences.size === XLSX_REFUSALS.length ? "" : "two refusals share a sentence",
    PHONE_FORMAT_REMEDY.includes("Number with 0 decimal places") ? "" : "the remedy clause lost its format step",
    ...csvWithoutRemedy.map((s) => `sends the officer to CSV without the format step: ${s}`),
    digitRun(digitSheet) ? "a digit-run sheet name was echoed" : "",
    ...echoedSpaced.map((name) => `a spaced phone number in a sheet name was echoed: "${name}"`),
    shortDigitSheet.includes('"Contacts 2026"') ? "" : "a sheet name with four digits was not echoed (the rule refuses too much)",
    bellSheet.includes('"Contacts"') ? "" : "a control character survived in the sheet name",
    overCap.includes("is 700 KB") ? "a file over the cap reads as 700 KB" : "",
    ...wrongSizes,
  ].filter(Boolean);
  ok(p(L.s73), sentenceFaults.length === 0, sentenceFaults.join(" · "));

  const shortened = ["2.55713E+11", " 2.55713E+11 ", "2.55713e+11", "2,55713E+11", "2E+11", "+2.55713E+11"];
  const whole = ["255713000000", "0712345678", "+255 712 345 678", "E+11", "2.55713E-05", "Asha", "", "2.55713E+111"];
  const missed = shortened.filter((s) => !c.looksShortened(s));
  const wrongly = whole.filter((s) => c.looksShortened(s));
  ok(p(L.s74), missed.length === 0 && wrongly.length === 0 && excelShortenedSentence().includes(PHONE_FORMAT_REMEDY),
    [...missed.map((s) => `missed "${s}"`), ...wrongly.map((s) => `flagged "${s}"`)].join(", "));

  const sixty = Array.from({ length: 60 }, (_, i) => i + 1);
  const lists: Array<[string, string]> = [[c.rowList([4]), "row 4"], [c.rowList([4, 9]), "rows 4 and 9"], [c.rowList([4, 9, 12]), "rows 4, 9 and 12"]];
  const capped = c.rowList(sixty);
  ok(p(L.s75), lists.every(([got, want]) => got === want) && NOTE_LIST_CAP === 50 && capped.endsWith(", 50 and 10 more") && !capped.includes(" 51"),
    [...lists.filter(([got, want]) => got !== want).map(([got, want]) => `"${got}" (want "${want}")`), capped.length > 120 ? `${capped.slice(0, 40)}…${capped.slice(-30)}` : capped].join(" · "));
}

/* ── RUN ─────────────────────────────────────────────────────────────────────────────────────────────────────── */

if (!PROVE_RED) {
  try { runAssertions(REAL, ""); } catch (e) { fail++; console.log(`FAIL the suite threw — ${(e as Error).stack ?? e}`); }
  console.log(`\ncontacts-boundary: ${pass} passed, ${fail} failed`);
  process.exitCode = fail === 0 ? 0 : 1;
} else {
  const problems: string[] = [];
  try { runAssertions(REAL, "base:"); } catch (e) { fail++; failed.push(`threw: ${(e as Error).message}`); }
  if (fail !== 0) problems.push(`BASELINE: the shipped tree is already red (${failed.join(" | ")})`);
  console.log(`\n§0 baseline: ${pass} passed, ${fail} failed\n`);
  QUIET = true;

  const DIALOG = "src/app/admin/contacts/contacts-import-dialog.tsx";
  const ACTIONS = "src/app/admin/contacts/import-actions.ts";
  const PARSED = "src/lib/contacts/parsed-file.ts";
  const IMPORT_XLSX = "src/lib/server/contacts/import-xlsx.ts";
  const READER_STUB = `import ExcelJS from "exceljs";\nexport const reader = ExcelJS;\n`;
  const prepend = (rel: string, head: string): string => head + (readDisk(rel) ?? "");
  const replaced = (rel: string, from: string, to: string): string => {
    const text = readDisk(rel);
    if (text === null || !text.includes(from)) throw new Error(`plant anchor "${from}" not found in ${rel}`);
    return text.replace(from, to);
  };
  const withOverlay = (overlay: Overlay): Impl => ({ ...REAL, overlay });
  const withContract = (patch: Partial<Contract>): Impl => ({ ...REAL, contract: { ...REAL_CONTRACT, ...patch } });
  /** R4 and its green twin G1 share these, so the ONLY difference between the two runs is the "use server" line. */
  const R4_DIALOG = `"use client";\nimport { readXlsxContactsAction } from "./import-actions";\nexport function ContactsImportDialog() { return readXlsxContactsAction ? null : null; }\n`;
  const R4_ACTIONS = `import { db } from "@/lib/server/store";\nexport async function readXlsxContactsAction() { return Boolean(db); }\n`;
  /** A case whose expectation is this must leave the WHOLE suite green (a control, not a plant). */
  const GREEN = "(the whole suite stays green)";
  const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

  const CASES: Array<{ id: string; name: string; expect: string; impl: () => Impl }> = [
    {
      id: "G1", name: "GREEN CONTROL for R4: the dialog imports an action module that KEEPS its \"use server\" line",
      expect: GREEN,
      impl: () => withOverlay({ [DIALOG]: R4_DIALOG, [ACTIONS]: `"use server";\n${R4_ACTIONS}` }),
    },
    {
      id: "R1", name: "the plan's own: a client import dialog imports exceljs (typecheck and build both stay green)",
      expect: L.s12,
      impl: () => withOverlay({ [DIALOG]: `"use client";\nimport ExcelJS from "exceljs";\nexport function ContactsImportDialog() { return ExcelJS ? null : null; }\n` }),
    },
    {
      id: "R2", name: "two hops: the dialog imports the shared shape, and the shape starts importing the store",
      expect: L.s22,
      impl: () => withOverlay({
        [DIALOG]: `"use client";\nimport { isParsedContactsFile } from "@/lib/contacts/parsed-file";\nexport function ContactsImportDialog() { return isParsedContactsFile(null) ? null : null; }\n`,
        [PARSED]: prepend(PARSED, `import { db } from "@/lib/server/store";\n`),
      }),
    },
    {
      id: "R3", name: "the dialog imports a server module directly",
      expect: L.s11,
      impl: () => withOverlay({ [DIALOG]: `"use client";\nimport { db } from "@/lib/server/store";\nexport function ContactsImportDialog() { return db ? null : null; }\n` }),
    },
    {
      id: "R4", name: "the dialog's action module loses its \"use server\" line — the leaf becomes shipped code (G1 is the same population, green)",
      expect: L.s11,
      impl: () => withOverlay({ [DIALOG]: R4_DIALOG, [ACTIONS]: R4_ACTIONS }),
    },
    {
      id: "R5", name: "the kycGateState shape: an owned server module calls a function exported from a \"use client\" module",
      expect: L.s41,
      impl: () => withOverlay({
        "src/app/admin/contacts/import-preview.ts": `import { parseThing } from "./parse-thing";\nexport const preview = () => parseThing("x");\n`,
        "src/app/admin/contacts/parse-thing.tsx": `"use client";\nexport function parseThing(s: string) { return s.length; }\n`,
      }),
    },
    {
      id: "R6", name: "the shared shape gains a \"use client\" directive",
      expect: L.s21,
      impl: () => withOverlay({ [PARSED]: prepend(PARSED, `"use client";\n`) }),
    },
    {
      id: "R7", name: "the walker is swapped for client-graph-safe's narrower regex (import … from only)",
      expect: L.c03,
      impl: () => ({ ...REAL, extract: naiveEdges }),
    },
    {
      id: "R8", name: "next.config.ts raises the server-action body limit to 10mb",
      expect: L.s61,
      impl: () => withOverlay({ "next.config.ts": replaced("next.config.ts", "experimental: {", `experimental: {\n    serverActions: { bodySizeLimit: "10mb" },`) }),
    },
    {
      id: "R9", name: "the cap is raised to 800 KiB — past what Next's 1 MB body admits as base64",
      expect: L.s63,
      impl: () => withContract({ limits: { ...REAL_CONTRACT.limits, XLSX_MAX_BYTES: 800 * 1024 } }),
    },
    {
      id: "R10", name: "the reader switches to exceljs's streaming WorkbookReader, which spools sheets to temp files",
      expect: L.s52,
      impl: () => withOverlay({ [IMPORT_XLSX]: (readDisk(IMPORT_XLSX) ?? READER_STUB) + `\nexport const streaming = () => new ExcelJS.stream.xlsx.WorkbookReader("upload.xlsx");\n` }),
    },
    {
      id: "R11", name: "the reader imports the store — the parse could consult the book",
      expect: L.s51,
      impl: () => withOverlay({ [IMPORT_XLSX]: `import { db } from "@/lib/server/store";\n` + (readDisk(IMPORT_XLSX) ?? READER_STUB) }),
    },
    {
      id: "R12", name: "a new src/lib/contacts module is not pinned in client-graph-safe",
      expect: L.s24,
      impl: () => withOverlay({ "src/lib/contacts/unpinned-plant.ts": `export const PLANT = 1;\n` }),
    },
    {
      id: "R13", name: "the too_large sentence drops the 0-decimal step (OD29's first wording — the remedy that destroys the digits)",
      expect: L.s64,
      impl: () => withContract({
        sentence: (r, sctx) => (r === "too_large"
          ? `This spreadsheet is ${formatFileSize(sctx?.bytes ?? 0)} — an Excel file can be up to 700 KB here. Save it as CSV instead: there is no size limit on CSV.`
          : xlsxRefusalSentence(r, sctx)),
      }),
    },
    {
      id: "R14", name: "a producer declares its own ParsedContactsFile beside the shared one (the three-shapes conflict C15 settled)",
      expect: L.s26,
      impl: () => withOverlay({ "src/lib/contacts/import-parse.ts": `export type ParsedContactsFile = { format: "csv"; rows: string[][] };\nexport const CSV = 1;\n` }),
    },
    {
      id: "R15", name: "§4.2 can fail: an app page OUTSIDE the owned trees calls a function exported from a \"use client\" module",
      expect: L.s42,
      impl: () => withOverlay({
        "src/app/admin/boundary-plant/page.tsx": `import { parseThing } from "./parse-thing";\nexport default function Page() { return parseThing("x"); }\n`,
        "src/app/admin/boundary-plant/parse-thing.tsx": `"use client";\nexport function parseThing(s: string) { return s.length; }\n`,
      }),
    },
    {
      id: "R16", name: "an owned server module reaches a client island by a spelling the resolver cannot map (\"./plant-island.js\" for .tsx) — the island and its crossing would drop out",
      expect: L.c09,
      impl: () => withOverlay({
        "src/app/admin/contacts/plant-server.ts": `import { plantThing } from "./plant-island.js";\nexport const plant = () => plantThing("x");\n`,
        "src/app/admin/contacts/plant-island.tsx": `"use client";\nexport function plantThing(s: string) { return s.length; }\n`,
      }),
    },
    {
      id: "R17", name: "a second module spells the phone-format remedy out instead of importing PHONE_FORMAT_REMEDY (the two-remedies drift A1.6 settled)",
      expect: L.s27,
      impl: () => withOverlay({ "src/lib/contacts/hint-plant.ts": `export const HINT = "To keep every digit, format the phone column as Number with 0 decimal places.";\n` }),
    },
    {
      id: "K1", name: "the sniffer checks only \"PK\" — a CSV whose first cell starts with P and K is refused as a workbook",
      expect: L.s71,
      impl: () => withContract({ sniff: (h) => (h.length >= 2 && h[0] === 0x50 && h[1] === 0x4b ? "zip" : sniffSpreadsheetBytes(h)) }),
    },
    {
      id: "K2", name: "the validator renumbers instead of checking order — a re-sorted grid passes",
      expect: L.s72,
      impl: () => withContract({
        isParsed: (x) => {
          if (typeof x !== "object" || x === null || Array.isArray(x) || !Array.isArray((x as { rows?: unknown }).rows)) return isParsedContactsFile(x);
          const rows = ((x as { rows: unknown[] }).rows).map((r, i) => (typeof r === "object" && r !== null ? { ...(r as object), line: i + 1 } : r));
          return isParsedContactsFile({ ...(x as object), rows });
        },
      }),
    },
    {
      id: "K3", name: "file sizes round to nearest — a file one byte over the cap reads \"700 KB\"",
      expect: L.s73,
      impl: () => withContract({
        formatFileSize: (b) => (!Number.isFinite(b) || b <= 0 ? "0 KB" : b < 1000 * 1024 ? `${Math.round(b / 1024)} KB` : `${(b / 1048576).toFixed(1).replace(/\.0$/, "")} MB`),
      }),
    },
    {
      id: "K4", name: "the shortened-number detector is case-sensitive — another tool's 2.55713e+11 slips through",
      expect: L.s74,
      impl: () => withContract({ looksShortened: (s) => /^\s*[+-]?\d(?:[.,]\d+)?E\+\d{1,2}\s*$/.test(s) }),
    },
    {
      id: "K5", name: "a note's row list has no cap — a 948-row note lists every row",
      expect: L.s75,
      impl: () => withContract({ rowList: (lines) => (lines.length === 1 ? `row ${lines[0]}` : `rows ${lines.slice(0, -1).join(", ")} and ${lines[lines.length - 1]}`) }),
    },
    {
      id: "K6", name: "the .xls sentence goes back to its first wording — it sends the officer to CSV without the format step",
      expect: L.s73,
      impl: () => withContract({
        sentence: (r, sctx) => (r === "wrong_format" && sctx?.kind === "xls"
          ? "This looks like an old-style Excel file (.xls). Open it in Excel and save it as an Excel Workbook (.xlsx) or as CSV, then choose it again."
          : xlsxRefusalSentence(r, sctx)),
      }),
    },
    {
      id: "K7", name: "the sheet-name rule looks only for an unbroken run of digits — a sheet named \"0712 345 678\" is echoed",
      expect: L.s73,
      impl: () => withContract({
        sentence: (r, sctx) => {
          const sheet = sctx?.sheet;
          return r === "empty" && typeof sheet === "string" && sheet !== "" && !/\d{7,}/.test(sheet)
            ? `The sheet "${sheet}" has no rows to read. Put the contacts on the first visible sheet, save it, and choose it again.`
            : xlsxRefusalSentence(r, sctx);
        },
      }),
    },
    {
      id: "K8", name: "the validator drops the blank-row check — a producer that pushes an all-empty row instead of counting it passes",
      expect: L.s72,
      impl: () => withContract({
        isParsed: (x) => {
          if (!isObject(x) || !Array.isArray(x.rows)) return isParsedContactsFile(x);
          const rows = x.rows.map((r: unknown) => (isObject(r) && Array.isArray(r.cells) && r.cells.length > 0 && r.cells.every((cell: unknown) => cell === "")
            ? { ...r, cells: ["x", ...r.cells.slice(1)] }
            : r));
          return isParsedContactsFile({ ...x, rows });
        },
      }),
    },
    {
      id: "K9", name: "the validator ignores `unreadable` (A1.8) — a missing list, a colliding line or an empty reason passes",
      expect: L.s72,
      impl: () => withContract({ isParsed: (x) => (isObject(x) ? isParsedContactsFile({ ...x, unreadable: [] }) : isParsedContactsFile(x)) }),
    },
    {
      id: "K10", name: "the size gate compares the base64 LENGTH to XLSX_MAX_BASE64_CHARS — 700 KiB + 1 and + 2 bytes share that length and reach the decoder",
      expect: L.s65,
      impl: () => withContract({ overCap: (s) => s.length > XLSX_MAX_BASE64_CHARS }),
    },
    {
      id: "K11", name: "the classifier is handed only the first 4 KB — a protected workbook whose directory sits later reads as an old .xls",
      expect: L.s71,
      impl: () => withContract({ headKind: (b) => spreadsheetHeadKind(b.subarray(0, 4096)) }),
    },
  ];

  let caught = 0;
  let held = 0;
  const plants = CASES.filter((rc) => rc.expect !== GREEN).length;
  const controls = CASES.length - plants;
  for (const [i, rc] of CASES.entries()) {
    pass = 0; fail = 0; failed.length = 0;
    const tag = `red${i + 1}:`;
    console.log(`── case ${rc.id}: ${rc.name}`);
    let impl: Impl;
    try { impl = rc.impl(); } catch (e) { problems.push(`case ${rc.id} (${rc.name}): could not be planted — ${(e as Error).message}`); continue; }
    try { runAssertions(impl, tag); } catch (e) { problems.push(`case ${rc.id} (${rc.name}): the suite threw — ${(e as Error).message}`); continue; }
    if (rc.expect === GREEN) {
      if (fail === 0) { held++; console.log(`   held green → its paired plant flips this same population\n`); }
      else problems.push(`control ${rc.id} (${rc.name}): went RED — ${failed.join(" | ")}`);
      continue;
    }
    if (fail === 0) problems.push(`case ${rc.id} (${rc.name}): stayed GREEN`);
    else if (!failed.includes(`${tag}${rc.expect}`)) problems.push(`case ${rc.id} (${rc.name}): red, but not on "${rc.expect}" — got ${failed.join(" | ")}`);
    else { caught++; console.log(`   caught → ${rc.expect}\n`); }
  }
  console.log(`\n${caught}/${plants} caught · ${held}/${controls} green control(s) held${problems.length === 0 ? " · RED PROOF COMPLETE" : ""}`);
  if (problems.length) {
    console.log("\nPROBLEMS:");
    for (const x of problems) console.log(`  ✗ ${x}`);
    process.exitCode = 1;
  } else {
    process.exitCode = 0;
  }
}
