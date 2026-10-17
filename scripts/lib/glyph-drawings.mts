/**
 * THE GLYPH FAMILY'S DRAWINGS AS THE BROWSER RECEIVES THEM — for a guard that reads what a glyph DRAWS (its ink, its parts),
 * not how the engine places it (PHOSPHOR-MIGRATION W2, docs/PHOSPHOR-MIGRATION.md §5).   `scripts/lib/glyph-drawings.mts`
 *
 * Until W2 every guard read a glyph's drawing from its line in `src/components/ui/glyphs.tsx`. The drawings now ship as
 * symbols: a shell key's Bold and Fill in the inline chrome symbols the root layout prints (`GLYPH_SHELL_SYMBOLS`), every
 * other drawing in the app or the admin sprite the registry names (`GLYPH_SPRITES`), and the ten marks that stand among
 * words as a centreline in the registry itself (`m`). This file reads those shipped files and the registry — never the
 * codegen, never the engine — so a guard can read a drawing with its own path reader and hold the engine to it.
 *
 *   GLYPH_ENTRIES          every key of the family: its symbol stem, its group, the ink the engine reads, its mark
 *   drawingOf(key, v)      the inner markup of the symbol that draws `key` at variant `v`, as shipped (null if not shipped)
 *   shippedDrawings()      every (key, variant) the family ships, with its markup
 *   lineVariant(size)      what the Line tier draws at a size (R-WEIGHT 1B), stated apart from the engine
 *   symbolsOf(text)        a sprite's (or the inline symbols') symbols, id → inner markup — for an in-memory plant
 *
 * ⚠️ This file holds no backslash (the editing tools turn some escapes into control characters).
 */
import { readFileSync } from "node:fs";
import { GLYPH_REGISTRY, GLYPH_SPRITES } from "../../src/components/ui/glyph-registry.generated.ts";
import { GLYPH_SHELL_SYMBOLS } from "../../src/components/ui/glyph-shell-sprite.generated.ts";

export type GlyphVariant = "regular" | "bold" | "fill" | "duo";
export const VARIANTS: readonly GlyphVariant[] = ["regular", "bold", "fill", "duo"];
export type Ink = readonly [x0: number, x1: number];
export type GlyphMark = { d: string; x: Ink; f?: string; fx?: Ink };
export type GlyphEntry = {
  key: string;
  /** The symbol stem: the drawing of variant v is the symbol `${stem}-${v}`. */
  stem: string;
  group: "shell" | "app" | "admin";
  /** The inline reach of each shipped variant's ink on the 256 grid — the numbers the engine's `edge` reads. */
  ink: Partial<Record<GlyphVariant, Ink>>;
  /** A mark that stands among words: its centreline, stroked at the words' stem (`text`). */
  mark?: GlyphMark;
};
type RawEntry = { s: string; g: GlyphEntry["group"]; i: GlyphEntry["ink"]; m?: GlyphMark };

/** The Line tier draws Phosphor Bold up to 26 px and Regular from 27 px — Ali's R-WEIGHT 1B (2026-10-17), stated here for
 *  the guards apart from the engine, so a guard can hold `glyphs.tsx` to the ruling rather than to itself. */
export const LINE_BOLD_UP_TO = 26;
export const lineVariant = (size: number): GlyphVariant => (size <= LINE_BOLD_UP_TO ? "bold" : "regular");

export const GLYPH_ENTRIES: ReadonlyMap<string, GlyphEntry> = new Map(
  Object.entries(GLYPH_REGISTRY as unknown as Record<string, RawEntry>).map(([key, e]) => [key, { key, stem: e.s, group: e.g, ink: e.i, ...(e.m ? { mark: e.m } : {}) }]),
);

/** A text's symbols: id → the symbol's inner markup. */
export function symbolsOf(text: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of text.matchAll(/<symbol id="([^"]+)" viewBox="0 0 256 256">([^]*?)<[/]symbol>/g)) out.set(m[1], m[2]);
  return out;
}

const read = (rel: string) => readFileSync(rel, "utf8");
/** The shipped symbol files: the inline chrome symbols and the two sprites the registry names (paths from the repo root). */
export const SHIPPED = {
  inline: symbolsOf(GLYPH_SHELL_SYMBOLS),
  app: symbolsOf(read(`public${GLYPH_SPRITES.app}`)),
  admin: symbolsOf(read(`public${GLYPH_SPRITES.admin}`)),
} as const;

/** Where a key's variant ships: a shell key's Bold and Fill inline, the console's keys in the admin sprite, the rest in the
 *  app sprite — the placement `test:glyph-sync` §2 holds. */
export function shipsIn(e: GlyphEntry, v: GlyphVariant): keyof typeof SHIPPED {
  if (e.group === "shell" && (v === "bold" || v === "fill")) return "inline";
  return e.group === "admin" ? "admin" : "app";
}

/** The inner markup of the symbol that draws `key` at variant `v`, read from the file that ships it; null when the key
 *  does not ship that variant (the engine then draws Bold). */
export function drawingOf(key: string, v: GlyphVariant): string | null {
  const e = GLYPH_ENTRIES.get(key);
  if (!e || !e.ink[v]) return null;
  return SHIPPED[shipsIn(e, v)].get(`${e.stem}-${v}`) ?? null;
}

/** Every (key, variant) the family ships, with the markup that draws it. */
export function shippedDrawings(): Array<{ key: string; variant: GlyphVariant; body: string | null }> {
  return [...GLYPH_ENTRIES.values()].flatMap((e) => VARIANTS.filter((v) => e.ink[v]).map((v) => ({ key: e.key, variant: v, body: drawingOf(e.key, v) })));
}
