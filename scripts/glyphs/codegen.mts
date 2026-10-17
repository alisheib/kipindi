/**
 * THE GLYPH CODEGEN — PHOSPHOR-MIGRATION W1 (docs/PHOSPHOR-MIGRATION.md §5).
 *
 *   npm run glyphs:gen                                   write the generated files
 *   npx tsx scripts/glyphs/codegen.mts --check           exit 1 when a committed file differs from a fresh build
 *   npx tsx scripts/glyphs/codegen.mts --sheet <out>     write the contact sheet Ali reviews before the swap (W2)
 *
 * Reads the exact-pinned devDependency @phosphor-icons/core (never @phosphor-icons/react, whose modules each carry all
 * six weights) and scripts/glyphs/map.ts, and writes three files:
 *   src/components/ui/glyph-registry.generated.ts — per house key: its sprite symbol stem and each variant's ink box
 *   public/icons/g/glyphs.<hash8>.svg             — one <symbol> per drawing, content-hashed, MIT notice inside
 *   THIRD_PARTY_NOTICES.md                        — the package's licence, verbatim
 * Variants: regular (16-unit stroke), bold (24), fill, duo (Phosphor's Duotone: its Regular outline plus a tone layer
 * whose 0.2 becomes `var(--glyph-tone, 0.2)`). In W1 nothing imports the outputs: the live site still draws the house
 * family, so this wave changes nothing a player sees. The swap (W2) builds `I` from them.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync, unlinkSync } from "node:fs";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { ALIASES, GLYPH_MAP, NEW_KEYS, PHOSPHOR_PACKAGE, PHOSPHOR_VERSION, type MapEntry } from "./map";
import { EXTRAS, type Drawing, type Variant } from "./extras";
import { pathBounds, round2, type Box } from "./reach.mts";

export const ROOT = new URL("../../", import.meta.url);
const PKG = new URL(`node_modules/${PHOSPHOR_PACKAGE}/`, ROOT);
export const VARIANTS: Variant[] = ["regular", "bold", "fill", "duo"];
const WEIGHT_DIR: Record<Variant, string> = { regular: "regular", bold: "bold", fill: "fill", duo: "duotone" };
export const REGISTRY_PATH = "src/components/ui/glyph-registry.generated.ts";
export const SPRITE_DIR = "public/icons/g";
export const NOTICES_PATH = "THIRD_PARTY_NOTICES.md";
const D_OK = /^[MmLlHhVvCcSsQqTtAaZz0-9., -]+$/;
const NL = String.fromCharCode(10);

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
export function liveEntries(): Array<[string, Exclude<MapEntry, { retire: string }>]> {
  const all: Record<string, MapEntry> = { ...GLYPH_MAP, ...NEW_KEYS };
  return Object.keys(all)
    .sort()
    .filter((k) => !("retire" in all[k]))
    .map((k) => [k, all[k] as Exclude<MapEntry, { retire: string }>]);
}

export function drawingOf(key: string, entry: Exclude<MapEntry, { retire: string }>, v: Variant): Drawing {
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

export const stemOf = (key: string, entry: Exclude<MapEntry, { retire: string }>) => ("ph" in entry ? `p-${entry.ph}` : `x-${key}`);

const NOTICE =
  `Phosphor Icons (${PHOSPHOR_PACKAGE} ${PHOSPHOR_VERSION}), MIT License, Copyright (c) 2023 Phosphor Icons. ` +
  "The house extras (needle, mobileMoney, ussd) are 50pick's own. Generated by scripts/glyphs/codegen.mts; do not edit.";

export type Built = { files: Map<string, string>; spritePath: string; symbols: Map<string, string> };

/** Everything the codegen writes, built in memory. Deterministic: sorted keys, sorted symbols, a content hash. */
export function build(): Built {
  const entries = liveEntries();
  const symbols = new Map<string, string>();
  const rows: string[] = [];
  for (const [key, entry] of entries) {
    const stem = stemOf(key, entry);
    const ink: string[] = [];
    for (const v of VARIANTS) {
      const drawing = drawingOf(key, entry, v);
      const id = `${stem}-${v}`;
      const markup = `<symbol id="${id}" viewBox="0 0 256 256">${drawing.map(partMarkup).join("")}</symbol>`;
      const seen = symbols.get(id);
      if (seen !== undefined && seen !== markup) throw new Error(`symbol ${id} drawn two ways`);
      symbols.set(id, markup);
      ink.push(`${v}: [${inkOf(drawing).join(", ")}]`);
    }
    rows.push(`  ${JSON.stringify(key)}: { s: ${JSON.stringify(stem)}, i: { ${ink.join(", ")} } },`);
  }
  const sprite =
    `<svg xmlns="http://www.w3.org/2000/svg"><!-- ${NOTICE} -->` + NL +
    [...symbols.keys()].sort().map((id) => symbols.get(id)).join(NL) + NL + "</svg>" + NL;
  const hash = createHash("sha256").update(sprite).digest("hex").slice(0, 8);
  const spritePath = `${SPRITE_DIR}/glyphs.${hash}.svg`;
  const registry = [
    "/**",
    ` * GENERATED by scripts/glyphs/codegen.mts (npm run glyphs:gen); do not edit by hand. test:glyph-sync fails on any drift.`,
    ` * Source: ${PHOSPHOR_PACKAGE} ${PHOSPHOR_VERSION} (MIT License, Copyright (c) 2023 Phosphor Icons) and the house extras in`,
    " * scripts/glyphs/extras.ts. PHOSPHOR-MIGRATION W1: dormant; nothing imports it until the swap (W2).",
    " */",
    `export const GLYPH_SOURCE = { package: ${JSON.stringify(PHOSPHOR_PACKAGE)}, version: ${JSON.stringify(PHOSPHOR_VERSION)} } as const;`,
    `export const GLYPH_SPRITE = ${JSON.stringify("/" + spritePath.replace(/^public\//, ""))};`,
    `export type GlyphVariant = "regular" | "bold" | "fill" | "duo";`,
    "export type GlyphInk = readonly [x0: number, x1: number, y0: number, y1: number];",
    "/** Per key: its symbol stem (`<stem>-<variant>` in the sprite) and each variant's ink box on the 256 grid. */",
    "export const GLYPH_REGISTRY: Record<string, { s: string; i: Record<GlyphVariant, GlyphInk> }> = {",
    ...rows,
    "};",
    "/** Keys that share one drawing because they mean the same thing (scripts/glyphs/map.ts ALIASES). */",
    `export const GLYPH_ALIASES: ReadonlyArray<readonly [string, string]> = ${JSON.stringify(ALIASES)};`,
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
    "`scripts/glyphs/codegen.mts` reads the exact-pinned devDependency and writes the sprite in `public/icons/g/` and",
    "`src/components/ui/glyph-registry.generated.ts`; the sprite carries this notice in its first line.",
    "",
    "```",
    licence,
    "```",
    "",
  ].join(NL);
  const files = new Map<string, string>([[REGISTRY_PATH, registry], [spritePath, sprite], [NOTICES_PATH, notices]]);
  return { files, spritePath, symbols };
}

/** Where the committed files are read from — the repository, or an in-memory copy a red twin plants a defect in. */
export type Disk = { read(rel: string): string | null; list(dir: string): string[] };
export const realDisk: Disk = {
  read: (rel) => {
    const url = new URL(rel, ROOT);
    return existsSync(url) ? readFileSync(url, "utf8").replace(/\r\n/g, NL) : null;
  },
  list: (dir) => {
    const url = new URL(`${dir}/`, ROOT);
    return existsSync(url) ? readdirSync(url) : [];
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
  for (const f of disk.list(SPRITE_DIR)) {
    if (`${SPRITE_DIR}/${f}` !== built.spritePath) out.push(`${SPRITE_DIR}/${f} is a stale sprite — the current one is ${built.spritePath}`);
  }
  return out;
}

/** The contact sheet: every live key in every variant, on 50pick's canvas, the sprite inlined. */
export function contactSheet(built: Built = build()): string {
  const sprite = built.files.get(built.spritePath)!.replace(/^<svg /, '<svg width="0" height="0" style="position:absolute" ');
  const cells = liveEntries().map(([key, entry]) => {
    const stem = stemOf(key, entry);
    const src = "ph" in entry ? entry.ph : "house extra";
    const g = (v: Variant, s: number) => `<svg width="${s}" height="${s}"><use href="#${stem}-${v}"/></svg>`;
    return `<figure><div class="row">${g("regular", 32)}${g("bold", 32)}${g("fill", 32)}${g("duo", 32)}</div>` +
      `<div class="row small">${g("bold", 14)}${g("bold", 16)}${g("bold", 20)}${g("bold", 24)}</div>` +
      `<figcaption><b>${key}</b><span>${src}</span></figcaption></figure>`;
  });
  return `<!doctype html><meta charset="utf-8"><title>Glyph contact sheet</title><style>
body{margin:0;padding:24px 16px;background:oklch(6.5% 0.13 268);color:oklch(86% 0.04 268);font:13px system-ui}
h1{font:600 20px system-ui;color:oklch(98% 0.012 268)}main{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(210px,1fr))}
figure{margin:0;padding:12px;border:1px solid oklch(36% 0.13 268);border-radius:12px;background:oklch(20% 0.13 268);display:grid;gap:8px}
.row{display:flex;gap:10px;align-items:center;color:oklch(98% 0.012 268)}.small{gap:12px}
figcaption{display:flex;flex-direction:column}figcaption span{color:oklch(70% 0.08 268);font-size:12px}
</style><h1>50pick glyphs on Phosphor — ${PHOSPHOR_PACKAGE} ${PHOSPHOR_VERSION} (regular · bold · fill · duo; bold at 14 / 16 / 20 / 24)</h1>${sprite}<main>${cells.join("")}</main>`;
}

function main() {
  const args = process.argv.slice(2);
  const built = build();
  if (args[0] === "--check") {
    const d = drift(built);
    for (const x of d) console.log(`FAIL ${x}`);
    console.log(d.length ? `${d.length} drift(s)` : `glyphs: in sync (${built.symbols.size} symbols)`);
    process.exit(d.length ? 1 : 0);
  }
  if (args[0] === "--sheet") {
    if (!args[1]) throw new Error("--sheet needs an output path");
    writeFileSync(args[1], contactSheet(built));
    console.log(`contact sheet: ${args[1]}`);
    return;
  }
  const dir = new URL(`${SPRITE_DIR}/`, ROOT);
  mkdirSync(dir, { recursive: true });
  for (const f of readdirSync(dir)) if (`${SPRITE_DIR}/${f}` !== built.spritePath) unlinkSync(new URL(f, dir));
  for (const [rel, content] of built.files) writeFileSync(new URL(rel, ROOT), content);
  console.log(`glyphs: wrote ${[...built.files.keys()].join(", ")} (${built.symbols.size} symbols)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
