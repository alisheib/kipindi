/**
 * THE GLYPH CODEGEN — PHOSPHOR-MIGRATION (docs/PHOSPHOR-MIGRATION.md §5).
 *
 *   npm run glyphs:gen                                   write the generated files
 *   npx tsx scripts/glyphs/codegen.mts --check           exit 1 when a committed file differs from a fresh build
 *   npx tsx scripts/glyphs/codegen.mts --sheet <out>     write the contact sheet (every live key, all four variants)
 *
 * Reads the exact-pinned devDependency @phosphor-icons/core (never @phosphor-icons/react, whose modules each carry all
 * six weights) and scripts/glyphs/map.ts, extras.ts and marks.ts, and writes:
 *   src/components/ui/glyph-registry.generated.ts      per key: symbol stem, group, the ink box of each shipped variant,
 *                                                      and — for the ten marks that stand among words — the centreline
 *   src/components/ui/glyph-shell-sprite.generated.ts  the chrome's symbols, inlined by the root layout
 *   public/icons/g/app.<hash8>.svg · admin.<hash8>.svg every other shipped symbol, content-hashed, MIT notice inside
 *   src/lib/offline-glyphs.generated.ts                the offline page's two glyphs, inline (it cannot load a sprite)
 *   THIRD_PARTY_NOTICES.md                             the package's licence, verbatim
 * Variants: bold and regular (the Line tier: Bold up to 26 px, Regular from 27 — R-WEIGHT), fill, duo (Phosphor's
 * Duotone: its Regular outline plus a tone layer whose 0.2 is `var(--glyph-tone, 0.2)` — R-TONE). Only what map.ts asks
 * for is shipped: Bold for every live key, Regular / Fill / Duo for the keys listed.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync, unlinkSync } from "node:fs";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import {
  ADMIN_KEYS, ALIASES, DUO_KEYS, FILL_KEYS, GLYPH_MAP, NEW_KEYS, PHOSPHOR_PACKAGE, PHOSPHOR_VERSION, REGULAR_KEYS, SHELL_KEYS,
  type MapEntry,
} from "./map";
import { EXTRAS, type Drawing, type Variant } from "./extras";
import { TEXT_MARKS } from "./marks";
import { pathBounds, round2, type Box } from "./reach.mts";

export const ROOT = new URL("../../", import.meta.url);
const PKG = new URL(`node_modules/${PHOSPHOR_PACKAGE}/`, ROOT);
export const VARIANTS: Variant[] = ["regular", "bold", "fill", "duo"];
const WEIGHT_DIR: Record<Variant, string> = { regular: "regular", bold: "bold", fill: "fill", duo: "duotone" };
export const REGISTRY_PATH = "src/components/ui/glyph-registry.generated.ts";
export const SHELL_PATH = "src/components/ui/glyph-shell-sprite.generated.ts";
export const OFFLINE_PATH = "src/lib/offline-glyphs.generated.ts";
export const SPRITE_DIR = "public/icons/g";
export const NOTICES_PATH = "THIRD_PARTY_NOTICES.md";
/** The offline page's glyphs, and the variant it draws them in (both under 27 px, so Bold). */
const OFFLINE_KEYS = ["wifiOff", "rotateCcw"] as const;
const D_OK = /^[MmLlHhVvCcSsQqTtAaZz0-9., -]+$/;
const NL = String.fromCharCode(10);

type Live = Exclude<MapEntry, { retire: string }>;
export type Group = "shell" | "app" | "admin";

/** The asset file of one Phosphor name in one variant, as the package lays it out. */
export function phosphorFile(name: string, v: Variant): URL {
  const w = WEIGHT_DIR[v];
  return new URL(`assets/${w}/${w === "regular" ? name : `${name}-${w}`}.svg`, PKG);
}

/** One Phosphor drawing as parts: every <path d> (and whether it is the Duotone tone layer), each checked to be path data. */
export function phosphorDrawing(name: string, v: Variant): Drawing {
  const file = phosphorFile(name, v);
  const svg = readFileSync(file, "utf8");
  const parts = [...svg.matchAll(/<path d="([^"]+)"( opacity="0\.2")?\s*\/>/g)].map((m) => ({ d: m[1], tone: Boolean(m[2]) }));
  if (!parts.length) throw new Error(`no <path> in ${file.pathname}`);
  for (const p of parts) if (!D_OK.test(p.d)) throw new Error(`unexpected characters in a path of ${file.pathname}`);
  const rest = svg.replace(/<path d="[^"]+"( opacity="0\.2")?\s*\/>/g, "");
  if (!/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 256 256" fill="currentColor"><\/svg>\s*$/.test(rest)) {
    throw new Error(`${file.pathname} carries something other than paths`);
  }
  return parts;
}

/** Every key that survives the swap, with its source; retired keys are left out. */
export function liveEntries(): Array<[string, Live]> {
  const all: Record<string, MapEntry> = { ...GLYPH_MAP, ...NEW_KEYS };
  return Object.keys(all).sort().filter((k) => !("retire" in all[k])).map((k) => [k, all[k] as Live]);
}

export function drawingOf(key: string, entry: Live, v: Variant): Drawing {
  if ("ph" in entry) return phosphorDrawing(entry.ph, v);
  const x = EXTRAS[key];
  if (!x) throw new Error(`extra ${key} has no drawing in scripts/glyphs/extras.ts`);
  return x[v];
}

/** The ink box of a drawing: its geometry, widened by half a stroke where stroked. The tone layer sits inside and is left out. */
export function inkOf(drawing: Drawing): Box {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const part of drawing) {
    if (part.tone) continue;
    const b = pathBounds(part.d), h = (part.stroke ?? 0) / 2;
    x0 = Math.min(x0, b[0] - h); x1 = Math.max(x1, b[1] + h); y0 = Math.min(y0, b[2] - h); y1 = Math.max(y1, b[3] + h);
  }
  return [round2(x0), round2(x1), round2(y0), round2(y1)];
}

function partMarkup(p: Drawing[number]): string {
  if (p.tone) return `<path d="${p.d}" fill="currentColor" style="opacity:var(--glyph-tone,0.2)"/>`;
  if (p.stroke) {
    return `<path d="${p.d}" fill="none" stroke="currentColor" stroke-width="${p.stroke}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  return `<path d="${p.d}" fill="currentColor"${p.evenodd ? ' fill-rule="evenodd"' : ""}/>`;
}

export const stemOf = (key: string, entry: Live) => ("ph" in entry ? `p-${entry.ph}` : `x-${key}`);
export const groupOf = (key: string): Group => (SHELL_KEYS.includes(key) ? "shell" : ADMIN_KEYS.includes(key) ? "admin" : "app");
/** The variants a key ships, in a fixed order. */
export function shippedOf(key: string): Variant[] {
  return VARIANTS.filter((v) =>
    v === "bold" || (v === "regular" && REGULAR_KEYS.includes(key)) || (v === "fill" && FILL_KEYS.includes(key)) || (v === "duo" && DUO_KEYS.includes(key)),
  );
}
/** Where one shipped (key, variant) lives: the chrome's Bold and Fill are inlined; everything else is in a sprite file. */
export const placeOf = (key: string, v: Variant): Group => {
  const g = groupOf(key);
  if (g === "shell") return v === "bold" || v === "fill" ? "shell" : "app";
  return g;
};

const NOTICE =
  `Phosphor Icons (${PHOSPHOR_PACKAGE} ${PHOSPHOR_VERSION}), MIT License, Copyright (c) 2023 Phosphor Icons. ` +
  "The house extras (needle, mobileMoney, ussd) are 50pick's own. Generated by scripts/glyphs/codegen.mts; do not edit.";
const symbol = (id: string, drawing: Drawing) => `<symbol id="${id}" viewBox="0 0 256 256">${drawing.map(partMarkup).join("")}</symbol>`;
const hash8 = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 8);
const sortedJoin = (m: Map<string, string>) => [...m.keys()].sort().map((id) => m.get(id)).join(NL);
const markBox = (d: string): [number, number] => { const b = pathBounds(d); return [round2(b[0]), round2(b[1])]; };

export type Built = { files: Map<string, string>; sprites: Record<"app" | "admin", string>; symbols: number };

/** Everything the codegen writes, built in memory. Deterministic: sorted keys, sorted symbols, content hashes. */
export function build(): Built {
  const places: Record<Group, Map<string, string>> = { shell: new Map(), app: new Map(), admin: new Map() };
  const rows: string[] = [];
  for (const [key, entry] of liveEntries()) {
    const stem = stemOf(key, entry);
    const ink: string[] = [];
    for (const v of shippedOf(key)) {
      const drawing = drawingOf(key, entry, v);
      const id = `${stem}-${v}`, markup = symbol(id, drawing), at = places[placeOf(key, v)];
      const seen = at.get(id);
      if (seen !== undefined && seen !== markup) throw new Error(`symbol ${id} drawn two ways`);
      at.set(id, markup);
      const box = inkOf(drawing);
      ink.push(`${v}: [${box[0]}, ${box[1]}]`);
    }
    const mark = TEXT_MARKS[key];
    const m = mark
      ? `, m: { d: ${JSON.stringify(mark.stroke)}, x: [${markBox(mark.stroke).join(", ")}]` +
        (mark.fill ? `, f: ${JSON.stringify(mark.fill)}, fx: [${markBox(mark.fill).join(", ")}]` : "") + " }"
      : "";
    rows.push(`  ${JSON.stringify(key)}: { s: ${JSON.stringify(stem)}, g: ${JSON.stringify(groupOf(key))}, i: { ${ink.join(", ")} }${m} },`);
  }
  const file = (g: "app" | "admin") => `<svg xmlns="http://www.w3.org/2000/svg"><!-- ${NOTICE} -->` + NL + sortedJoin(places[g]) + NL + "</svg>" + NL;
  const appSvg = file("app"), adminSvg = file("admin");
  const sprites = { app: `${SPRITE_DIR}/app.${hash8(appSvg)}.svg`, admin: `${SPRITE_DIR}/admin.${hash8(adminSvg)}.svg` };
  const url = (rel: string) => "/" + rel.replace(/^public\//, "");
  const header = (what: string) => [
    "/**",
    ` * GENERATED by scripts/glyphs/codegen.mts (npm run glyphs:gen); do not edit by hand. test:glyph-sync fails on any drift.`,
    ` * Source: ${PHOSPHOR_PACKAGE} ${PHOSPHOR_VERSION} (MIT License, Copyright (c) 2023 Phosphor Icons) and the house extras in`,
    ` * scripts/glyphs/extras.ts. ${what}`,
    " */",
  ];
  const registry = [
    ...header("PHOSPHOR-MIGRATION: what every glyph of the family `I` draws, and where its drawings live."),
    `export const GLYPH_SOURCE = { package: ${JSON.stringify(PHOSPHOR_PACKAGE)}, version: ${JSON.stringify(PHOSPHOR_VERSION)} } as const;`,
    `export const GLYPH_SPRITES = { app: ${JSON.stringify(url(sprites.app))}, admin: ${JSON.stringify(url(sprites.admin))} } as const;`,
    `export type GlyphVariant = "regular" | "bold" | "fill" | "duo";`,
    "export type GlyphInk = readonly [x0: number, x1: number];",
    "/**",
    " * Per key: `s` its symbol stem (`<stem>-<variant>`), `g` its group (shell keys' Bold and Fill are inlined by the root",
    " * layout; the rest live in GLYPH_SPRITES), `i` the inline reach of each shipped variant's ink on the 256 grid (what",
    " * `edge` and `glyphInkGaps` read; the box's height is not needed at runtime), and for a mark that",
    " * stands among words `m`: its centreline `d` and that geometry's x-reach `x`, plus any solid part `f` and its reach `fx`.",
    " */",
    "export const GLYPH_REGISTRY = {",
    ...rows,
    "} as const;",
    "export type GlyphKey = keyof typeof GLYPH_REGISTRY;",
    "/** Keys that share one drawing because they mean the same thing (scripts/glyphs/map.ts ALIASES). */",
    `export const GLYPH_ALIASES: ReadonlyArray<readonly [string, string]> = ${JSON.stringify(ALIASES)};`,
    "",
  ].join(NL);
  const shell = [
    ...header("The chrome's symbols (the tab bars and headers), inlined once per page by the root layout."),
    `export const GLYPH_SHELL_SYMBOLS = ${JSON.stringify(`<!-- ${NOTICE} -->` + sortedJoin(places.shell))};`,
    "",
  ].join(NL);
  const live = Object.fromEntries(liveEntries());
  const offline = [
    ...header("The offline page's two glyphs, inline: it cannot load the app or a sprite. Bold (both are drawn under 27 px)."),
    "export const OFFLINE_GLYPHS = {",
    ...OFFLINE_KEYS.map((k) => `  ${k}: ${JSON.stringify(drawingOf(k, live[k], "bold").map(partMarkup).join(""))},`),
    "} as const;",
    "",
  ].join(NL);
  const licence = readFileSync(new URL("LICENSE", PKG), "utf8").replace(/\r\n/g, NL).trim();
  const notices = [
    "# Third-party notices",
    "",
    "Notices for third-party material that the build copies into this repository's own files. Packages installed from npm",
    "carry their own licences in `node_modules`.",
    "",
    `## Phosphor Icons — \`${PHOSPHOR_PACKAGE}\` ${PHOSPHOR_VERSION}`,
    "",
    "Every icon in the product is drawn from Phosphor Icons (programme `PHOSPHOR-MIGRATION`, `docs/PHOSPHOR-MIGRATION.md`).",
    "`scripts/glyphs/codegen.mts` reads the exact-pinned devDependency and writes the sprites in `public/icons/g/`, the",
    "inline chrome symbols and the glyph registry; every sprite and the inline symbols carry this notice.",
    "",
    "```",
    licence,
    "```",
    "",
  ].join(NL);
  const files = new Map<string, string>([
    [REGISTRY_PATH, registry], [SHELL_PATH, shell], [OFFLINE_PATH, offline],
    [sprites.app, appSvg], [sprites.admin, adminSvg], [NOTICES_PATH, notices],
  ]);
  return { files, sprites, symbols: places.shell.size + places.app.size + places.admin.size };
}

/** Where the committed files are read from — the repository, or an in-memory copy a red twin plants a defect in. */
export type Disk = { read(rel: string): string | null; list(dir: string): string[] };
export const realDisk: Disk = {
  read: (rel) => {
    const u = new URL(rel, ROOT);
    return existsSync(u) ? readFileSync(u, "utf8").replace(/\r\n/g, NL) : null;
  },
  list: (dir) => {
    const u = new URL(`${dir}/`, ROOT);
    return existsSync(u) ? readdirSync(u) : [];
  },
};

/** What differs between a fresh build and the repository: changed or missing files, and any stale sprite left behind. */
export function drift(built: Built = build(), disk: Disk = realDisk): string[] {
  const out: string[] = [];
  for (const [rel, content] of built.files) {
    const have = disk.read(rel);
    if (have === null) out.push(`${rel} is missing — run npm run glyphs:gen`);
    else if (have !== content) out.push(`${rel} differs from a fresh build — run npm run glyphs:gen`);
  }
  const current = new Set([built.sprites.app, built.sprites.admin]);
  for (const f of disk.list(SPRITE_DIR)) {
    if (!current.has(`${SPRITE_DIR}/${f}`)) out.push(`${SPRITE_DIR}/${f} is a stale sprite — the current ones are ${[...current].join(" and ")}`);
  }
  return out;
}

/** The contact sheet: every live key in all four variants (whatever ships), on 50pick's canvas, its symbols inlined. */
export function contactSheet(): string {
  const all = new Map<string, string>();
  const cells: string[] = [];
  for (const [key, entry] of liveEntries()) {
    const stem = stemOf(key, entry);
    for (const v of VARIANTS) all.set(`${stem}-${v}`, symbol(`${stem}-${v}`, drawingOf(key, entry, v)));
    const g = (v: Variant, s: number) => `<svg width="${s}" height="${s}"><use href="#${stem}-${v}"/></svg>`;
    const src = "ph" in entry ? entry.ph : "house extra";
    cells.push(`<figure><div class="row">${g("regular", 32)}${g("bold", 32)}${g("fill", 32)}${g("duo", 32)}</div>` +
      `<div class="row small">${g("bold", 14)}${g("bold", 16)}${g("bold", 20)}${g("bold", 24)}</div>` +
      `<figcaption><b>${key}</b><span>${src}</span></figcaption></figure>`);
  }
  return `<!doctype html><meta charset="utf-8"><title>Glyph contact sheet</title><style>
body{margin:0;padding:24px 16px;background:oklch(6.5% 0.13 268);color:oklch(86% 0.04 268);font:13px system-ui}
h1{font:600 20px system-ui;color:oklch(98% 0.012 268)}main{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(210px,1fr))}
figure{margin:0;padding:12px;border:1px solid oklch(36% 0.13 268);border-radius:12px;background:oklch(20% 0.13 268);display:grid;gap:8px}
.row{display:flex;gap:10px;align-items:center;color:oklch(98% 0.012 268)}.small{gap:12px}
figcaption{display:flex;flex-direction:column}figcaption span{color:oklch(70% 0.08 268);font-size:12px}
</style><h1>50pick glyphs on Phosphor — ${PHOSPHOR_PACKAGE} ${PHOSPHOR_VERSION} (regular · bold · fill · duo; bold at 14 / 16 / 20 / 24)</h1>` +
    `<svg width="0" height="0" style="position:absolute">${sortedJoin(all)}</svg><main>${cells.join("")}</main>`;
}

function main() {
  const args = process.argv.slice(2);
  if (args[0] === "--sheet") {
    if (!args[1]) throw new Error("--sheet needs an output path");
    writeFileSync(args[1], contactSheet());
    console.log(`contact sheet: ${args[1]}`);
    return;
  }
  const built = build();
  if (args[0] === "--check") {
    const d = drift(built);
    for (const x of d) console.log(`FAIL ${x}`);
    console.log(d.length ? `${d.length} drift(s)` : `glyphs: in sync (${built.symbols} symbols)`);
    process.exit(d.length ? 1 : 0);
  }
  const dir = new URL(`${SPRITE_DIR}/`, ROOT);
  mkdirSync(dir, { recursive: true });
  const keep = new Set([built.sprites.app, built.sprites.admin]);
  for (const f of readdirSync(dir)) if (!keep.has(`${SPRITE_DIR}/${f}`)) unlinkSync(new URL(f, dir));
  for (const [rel, content] of built.files) writeFileSync(new URL(rel, ROOT), content);
  console.log(`glyphs: wrote ${[...built.files.keys()].join(", ")} (${built.symbols} symbols)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
