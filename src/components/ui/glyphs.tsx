/**
 * 50pick's glyph family — drawn by Phosphor Icons (PHOSPHOR-MIGRATION, docs/PHOSPHOR-MIGRATION.md; Ali, 2026-10-17:
 * "Switch to Phosphor"). Use `<I.crypto s={14} />` — the same call sites as the hand-drawn family it replaced.
 *
 * ⭐ ONE DOOR, THREE TIERS. Every icon on every page comes from `I` (AGENTS.md §7; `test:glyph-source` holds it in
 * predeploy). What each key draws is decided once, in `scripts/glyphs/map.ts`; the drawings themselves are generated from
 * the exact-pinned `@phosphor-icons/core` into `glyph-registry.generated.ts` and the sprites (`npm run glyphs:gen`;
 * `test:glyph-sync` fails on any drift). A glyph draws in one of three tiers (`tier`):
 *   line — the default: Phosphor Bold up to 26 px, Regular from 27 px (R-WEIGHT: 20 px paints 1.88 px, 24 px 2.25 px)
 *   fill — Phosphor Fill: a selected destination, a toggled-on state, a seal (R-INDICATOR)
 *   duo  — Phosphor Duotone: its Regular outline over a tone of the same ink at `--glyph-tone` (R-TONE)
 * A tier a key does not ship falls back to Bold, so a glyph is never blank.
 *
 * ⭐ WHERE THE DRAWINGS LIVE. A glyph renders `<svg><use href></svg>`: the chrome's keys (the tab bars and headers) point
 * at symbols the root layout inlines once per page (`GlyphShellSprite`), so they paint with the first byte of HTML; every
 * other key points into a content-hashed sprite (`/icons/g/app.<hash>.svg`, cached for good, served by the service
 * worker), and the console's own keys into `/icons/g/admin.<hash>.svg`, which a player never downloads. The browser
 * downloads each drawing once — not once per component bundle, as an icon library's React components would.
 */
import { Children, cloneElement, isValidElement, type CSSProperties, type ReactElement, type ReactNode, type SVGProps } from "react";
import { GLYPH_REGISTRY, GLYPH_SPRITES, type GlyphKey as RegistryKey, type GlyphVariant } from "./glyph-registry.generated";

/** The side of its run a glyph stands on: its ink, not its box, lands on that edge (R9-A4, `edge` below). */
export type GlyphEdge = "start" | "end";
/** The face and weight of the words a mark stands among: it strokes at their stem (R9-A4, `text` and `GLYPH_STEM` below). */
export type GlyphText = keyof typeof GLYPH_STEM;
/** How much body a glyph carries: line (the default), fill, duo. */
export type GlyphTier = "line" | "fill" | "duo";
export type GlyphKey = RegistryKey;
/**
 * The keys that ship a Fill (map.ts FILL_KEYS), read from the registry. A Fill a key does not ship falls back to Bold
 * without a sound, so every door that draws its glyph in Fill — Callout, NoticeBar, StatusFlag, the KYC panel, a
 * receipt's or a proposal's status, a won ticket, a won notification — takes this type, and tsc refuses a key without one
 * (PHOSPHOR-MIGRATION W4; `test:glyph-map` §9c holds the literal `tier="fill"` call sites).
 */
export type FillGlyphKey = {
  [K in RegistryKey]: (typeof GLYPH_REGISTRY)[K]["i"] extends { readonly fill: unknown } ? K : never;
}[RegistryKey];
/**
 * The keys that ship a Duotone (map.ts DUO_KEYS), read from the registry the same way. A door that stands a key on an
 * identity plate in Duotone — the hub's rows, a notification's plate (release 2, W5) — takes this type, so tsc refuses a
 * key whose Duotone would fall back to Bold.
 */
export type DuoGlyphKey = {
  [K in RegistryKey]: (typeof GLYPH_REGISTRY)[K]["i"] extends { readonly duo: unknown } ? K : never;
}[RegistryKey];
type GlyphProps ={ s?: number; edge?: GlyphEdge; text?: GlyphText; tier?: GlyphTier; draw?: boolean } & Omit<SVGProps<SVGSVGElement>, "ref">;

/* ⭐ DG-A-19 — THE SIZE CONSTANTS DESCRIBE WHAT IS THERE. `s` is the size prop (the lucide-compatible `size` alias is gone
   and a reintroduction is a compile error). These are the pixels the call sites already render; a constant names a
   context only when someone has ruled on it, and `test:icon-sizes` stops new sizes spreading. */
export const GLYPH = {
  /** Inside a line of text, on the text's own baseline. */
  inline: 12,
  /** The lead glyph of a table/list ROW. */
  row: 16,
  /** The lead glyph of a CARD or section head. */
  card: 18,
} as const;

/** The glyph that sits centred on an `IconPlate` of the given edge, derived — never hand-picked. Release 2 (W5) put every
 *  plate on the atom, and the sizes it found in use joined the table at the glyphs they already drew: 26 (the invite
 *  page's promises) 14, 32 (a notification) 16, 42 (the Propose promo) 22. */
export function plateGlyph(plateEdge: 26 | 32 | 36 | 40 | 42 | 44 | 48 | 56): number {
  return { 26: 14, 32: 16, 36: 19, 40: 20, 42: 22, 44: 23, 48: 24, 56: 28 }[plateEdge];
}

/* ⭐ R9-A4 · THE EDGE RULE — A GLYPH AT A RUN'S START OR END PUTS ITS INK ON THAT EDGE. Every drawing pads itself inside
   its box, so a glyph that starts or ends a link, a row or a control is pulled past its run's edge by exactly the gap
   between its box and its ink — read from the generated ink table, so a redrawn glyph cannot leave a stale number behind.
   ⭐ `text` IS THE OTHER HALF — A MARK AMONG WORDS STROKES AT THE WORDS' OWN STEM. The marks that stand inside a run of
   words (chevrons, arrows, the external-link mark, info, the wallet) are drawn as strokes on Phosphor's own centrelines
   (`scripts/glyphs/marks.ts`; their bounds equal Phosphor's Regular outlines, checked by `test:glyph-map`), so their
   weight follows the font, not the box: `.kp-gtext` strokes them at `--g-stem`, the stem of the run's face and weight in
   em. A centred control frames its ink the same way (R10-A6): the slots (`Button`, `SubmitButton`, `RgConfirmSubmit`,
   `FilterPill`, `Tabs`) pull their glyph with `edgeGlyph`. */

/** A stem as a fraction of its type size, for each face and weight a mark is set among — read from the faces themselves:
 *  `body` is Inter (its `l`: 400 0.0879 · 500 0.1074 · 700 0.1465, the repo's own TTFs; 600 between 500 and 700), `display`
 *  Sora (its `I`: 600 0.142 · 700 0.164, Sora v17 as fonts.gstatic.com serves it), `mono` JetBrains Mono (its `H`: 400
 *  0.090 · 700 0.125, the repo's TTFs; 600 between). `test:visual-pass-r9a` §4 reads the Inter and JetBrains Mono values. */
export const GLYPH_STEM = {
  "body-400": 0.088, "body-500": 0.107, "body-600": 0.127, "body-700": 0.147,
  "display-600": 0.142, "display-700": 0.164,
  "mono-400": 0.09, "mono-600": 0.108, "mono-700": 0.125,
} as const;

/** R-WEIGHT: the Line tier is Bold up to this size, Regular above it. */
const BOLD_UP_TO = 26;
type Ink = readonly [number, number];
type Entry = {
  s: string;
  g: "shell" | "app" | "admin";
  /** A shell key whose Fill the chrome does not draw: that Fill rides in the app sprite (map.ts CHROME_FILLS). */
  fa?: 1;
  i: Partial<Record<GlyphVariant, Ink>>;
  m?: { d: string; x: Ink; f?: string; fx?: Ink };
};
const REG = GLYPH_REGISTRY as unknown as Record<string, Entry>;
const fix = (v: number) => Math.round(v * 1000) / 1000;

/** The variant a glyph draws: its tier, and for the Line tier its size. Bold when the asked-for variant is not shipped. */
function variantOf(e: Entry, size: number, tier: GlyphTier | undefined): GlyphVariant {
  const want: GlyphVariant = tier === "fill" ? "fill" : tier === "duo" ? "duo" : size <= BOLD_UP_TO ? "bold" : "regular";
  return e.i[want] ? want : "bold";
}

/** Where a drawing lives: the chrome's Bold, and the Fills the chrome draws, in the page's own inline symbols; everything
 *  else in a sprite file. */
function hrefOf(e: Entry, v: GlyphVariant): string {
  const id = `${e.s}-${v}`;
  if (e.g === "shell" && (v === "bold" || (v === "fill" && !e.fa))) return `#${id}`;
  return `${e.g === "admin" ? GLYPH_SPRITES.admin : GLYPH_SPRITES.app}#${id}`;
}

/** Every glyph component of the family, and its key — how `edgeGlyph` and `glyphInkGaps` know a glyph from anything else. */
const KEY_OF = new Map<unknown, string>();

function make(key: string) {
  const e = REG[key];
  function Glyph({ s, edge, text, tier, draw, style, className, ...rest }: GlyphProps): ReactElement {
    const size = s ?? 24;
    const k = size / 256;
    if (draw && key === "check" && e.m) {
      // The success receipt draws Phosphor's own check centreline once on mount.
      // `e.m` is generated from marks.ts and shape-checked against the pinned
      // Regular asset. The path is still rendered only through I.check.
      return (
        <svg viewBox="0 0 256 256" width={size} height={size} aria-hidden data-g="check.draw" {...rest}
          className={className} style={style}>
          <path d={e.m.d} fill="none" stroke="currentColor" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round"
            pathLength={100} className="m-draw" style={{ strokeDasharray: 100, strokeDashoffset: 100 }} />
        </svg>
      );
    }
    if (text && e.m) {
      // A mark among words: Phosphor's centreline, stroked at the words' stem (`.kp-gtext`, a non-scaling stroke).
      const m = e.m;
      const half = GLYPH_STEM[text] / 2;
      const st: Record<string, string | number> = { ...(style as Record<string, string | number> | undefined), "--g-stem": `${GLYPH_STEM[text]}em` };
      if (edge === "end") st.marginInlineEnd = `calc(${fix(-(256 - Math.max(m.x[1], m.fx ? m.fx[1] : -Infinity)) * k)}px + ${half}em)`;
      else if (edge === "start") st.marginInlineStart = `calc(${fix(-Math.min(m.x[0], m.fx ? m.fx[0] : Infinity) * k)}px + ${half}em)`;
      return (
        <svg viewBox="0 0 256 256" width={size} height={size} aria-hidden data-g={`${key}.text`} {...rest}
          className={className ? `kp-gtext ${className}` : "kp-gtext"} style={st as CSSProperties}>
          <path d={m.d} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
          {m.f ? <path d={m.f} fill="currentColor" /> : null}
        </svg>
      );
    }
    const v = variantOf(e, size, tier);
    const ink = e.i[v] as Ink;
    const st: CSSProperties | undefined = edge
      ? { ...style, ...(edge === "end" ? { marginInlineEnd: `${fix(-(256 - ink[1]) * k)}px` } : { marginInlineStart: `${fix(-ink[0] * k)}px` }) }
      : style;
    return (
      <svg viewBox="0 0 256 256" width={size} height={size} aria-hidden data-g={`${key}.${v}`} {...rest} className={className} style={st}>
        <use href={hrefOf(e, v)} />
      </svg>
    );
  }
  Glyph.displayName = `I.${key}`;
  KEY_OF.set(Glyph, key);
  return Glyph;
}

type MarkKey = { [K in RegistryKey]: (typeof GLYPH_REGISTRY)[K] extends { m: unknown } ? K : never }[RegistryKey];
type Family = {
  readonly [K in RegistryKey]: K extends "check" ? (p: GlyphProps) => ReactElement
    : K extends MarkKey ? (p: Omit<GlyphProps, "draw">) => ReactElement
    : (p: Omit<GlyphProps, "draw" | "text">) => ReactElement;
};
/** The family: one component per key. `text` is accepted only by keys with a source centreline. */
export const I = Object.fromEntries(Object.keys(REG).map((k) => [k, make(k)])) as unknown as Family;

/** Is this node one of the family's glyphs? A slot that leads or ends a run (PageHeader's and AuthHeader's eyebrow) pulls
 *  a glyph to its edge, and leaves anything else as given. */
export function edgeGlyph(node: ReactNode, edge: GlyphEdge): ReactNode {
  if (!isValidElement(node) || !KEY_OF.has(node.type)) return node;
  return cloneElement(node as ReactElement<GlyphProps>, { edge });
}

/** A family glyph's gap between its box and its ink on each side, in px at its size: exactly what `edge` pulls it by. For a
 *  mark that strokes at its words' stem (`text`) the answer is in em, so null — as for anything that is not a family glyph
 *  (round 10: the search box's spinner takes the magnifier's slot at the magnifier's own width). */
export function glyphInkGaps(node: ReactNode): { start: number; end: number } | null {
  if (!isValidElement(node)) return null;
  const key = KEY_OF.get(node.type);
  if (!key) return null;
  const p = node.props as GlyphProps;
  if (p.text) return null;
  const e = REG[key], size = p.s ?? 24, ink = e.i[variantOf(e, size, p.tier)] as Ink, k = size / 256;
  return { start: fix(ink[0] * k), end: fix((256 - ink[1]) * k) };
}

/** Does a control's content hold anything but white space — words, a figure, an element? A slot's glyph with nothing
 *  beside it is alone in its control and keeps its box (round 10, R10-A6). */
export function hasWords(content: ReactNode): boolean {
  return Children.toArray(content).some((c) => typeof c !== "string" || c.trim() !== "");
}

/** Map a market category to its sigil. Falls back to Other's: a category is never drawn as the board (`markets`), the
 *  board tab's glyph, nor as "All" (`layoutGrid`) beside it in a chip row (PHOSPHOR-MIGRATION W2). */
const CATEGORY_GLYPH: Record<string, DuoGlyphKey> = {
  sports: "football", football: "football",
  politics: "politics", macro: "economy", economy: "economy", forex: "forex",
  weather: "weather", crypto: "crypto",
  culture: "entertainment", entertainment: "entertainment", tech: "tech",
  mixed: "shuffle", other: "assorted", infrastructure: "landmark",
};
export function categoryGlyph(category: string): DuoGlyphKey {
  return CATEGORY_GLYPH[category?.toLowerCase?.() ?? ""] ?? "assorted";
}
