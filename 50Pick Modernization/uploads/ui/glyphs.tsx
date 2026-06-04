/**
 * 50pick custom line-icon family — 24px grid · 1.9 stroke · round joins.
 * Ported from Claude Design's Identity Sprint. One coherent heraldic set:
 * categories · actions · nav · status · trust + decoratives (crown/shield/seal).
 * Pure SVG, dependency-free, currentColor. Use `<I.crypto s={14} />`.
 */
import type { SVGProps } from "react";

type GlyphProps = { s?: number } & Omit<SVGProps<SVGSVGElement>, "ref">;

const G = ({ children, s, ...p }: GlyphProps & { children: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" width={s || 24} height={s || 24} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>{children}</svg>
);

export const I = {
  /* categories */
  football: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7.5l3.2 2.4-1.2 3.8h-4l-1.2-3.8z" /><path d="M12 7.5V4.5M15.2 9.9l2.8-1M13.8 13.7l1.8 2.5M10.2 13.7l-1.8 2.5M8.8 9.9l-2.8-1" /></G>,
  politics: (p: GlyphProps) => <G {...p}><path d="M3 9l9-5 9 5" /><path d="M4 9h16" /><path d="M6 9v8M10 9v8M14 9v8M18 9v8" /><path d="M3 21h18" /><path d="M4 17h16" /></G>,
  forex: (p: GlyphProps) => <G {...p}><path d="M4 8h12l-3-3M20 16H8l3 3" /><path d="M7.5 11.5v1M7 12h1" /></G>,
  weather: (p: GlyphProps) => <G {...p}><path d="M7 16a4 4 0 1 1 1-7.9 5 5 0 0 1 9.6 1.4A3.3 3.3 0 0 1 17 16H7z" /><path d="M8 19l-1 2M12 19l-1 2M16 19l-1 2" /></G>,
  economy: (p: GlyphProps) => <G {...p}><path d="M4 4v16h16" /><path d="M7 15l3.5-4 3 2.5L20 7" /><path d="M20 7v3.5M20 7h-3.5" /></G>,
  crypto: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="9" /><path d="M12 6.5v11M9.5 9h4a1.8 1.8 0 0 1 0 3.6h-4M9.5 12.6h4.5a1.8 1.8 0 0 1 0 3.6H9.5" /></G>,
  entertainment: (p: GlyphProps) => <G {...p}><path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 17l-5.3 2.8 1-5.8L3.5 9.7l5.9-.9z" /></G>,
  tech: (p: GlyphProps) => <G {...p}><rect x="7" y="7" width="10" height="10" rx="1.5" /><path d="M10 7V4M14 7V4M10 20v-3M14 20v-3M7 10H4M7 14H4M20 10h-3M20 14h-3" /></G>,
  /* actions */
  trade: (p: GlyphProps) => <G {...p}><path d="M8 4v16M8 20l-3-3M8 20l3-3" /><path d="M16 20V4M16 4l-3 3M16 4l3 3" /></G>,
  watch: (p: GlyphProps) => <G {...p}><path d="M6 4h12v16l-6-4-6 4z" /></G>,
  share: (p: GlyphProps) => <G {...p}><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6" /></G>,
  comment: (p: GlyphProps) => <G {...p}><path d="M5 5h14v10H9l-4 4z" /><path d="M8.5 10h7M8.5 7.5h4" /></G>,
  bell: (p: GlyphProps) => <G {...p}><path d="M7 10a5 5 0 0 1 10 0c0 4 1.5 5 2 6H5c.5-1 2-2 2-6z" /><path d="M10.5 20a1.7 1.7 0 0 0 3 0" /></G>,
  search: (p: GlyphProps) => <G {...p}><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.5-4.5" /></G>,
  filter: (p: GlyphProps) => <G {...p}><path d="M4 5h16l-6 7v5l-4 2v-7z" /></G>,
  plus: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 8.5v7M8.5 12h7" /></G>,
  /* nav */
  home: (p: GlyphProps) => <G {...p}><path d="M4 11l8-6 8 6" /><path d="M6 10v9h12v-9" /><path d="M10 19v-5h4v5" /></G>,
  markets: (p: GlyphProps) => <G {...p}><path d="M12 4v16" /><path d="M6 7h12" /><path d="M6 7l-2.5 6a2.5 2.5 0 0 0 5 0z" /><path d="M18 7l-2.5 6a2.5 2.5 0 0 0 5 0z" /><path d="M8.5 20h7" /></G>,
  portfolio: (p: GlyphProps) => <G {...p}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M3 12h18M14 12v2.5h-4V12" /></G>,
  trophy: (p: GlyphProps) => <G {...p}><path d="M7 4h10v4a5 5 0 0 1-10 0z" /><path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" /><path d="M12 13v3M9 20h6M10 20l.5-4h3l.5 4" /></G>,
  profile: (p: GlyphProps) => <G {...p}><circle cx="12" cy="8.5" r="3.5" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0z" /></G>,
  /* status */
  live: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" /><path d="M7.5 7.5a6 6 0 0 0 0 9M16.5 7.5a6 6 0 0 1 0 9M5 5a9 9 0 0 0 0 14M19 5a9 9 0 0 1 0 14" /></G>,
  tipping: (p: GlyphProps) => <G {...p}><path d="M12 4v16M7 20h10" /><path d="M12 6l-7 2 7-2 7 2" transform="rotate(-8 12 7)" /><path d="M5 8l-2 4.5a2.3 2.3 0 0 0 4 0z" transform="rotate(-8 12 7)" /><path d="M19 8l-2 4.5a2.3 2.3 0 0 0 4 0z" transform="rotate(-8 12 7)" /></G>,
  hot: (p: GlyphProps) => <G {...p}><path d="M12 3c.5 2.5 2 4 3.5 5.5S18 12 18 14a6 6 0 0 1-12 0c0-1.2.4-2.3 1-3 .2 1 .8 1.8 1.6 2.2C8.3 11 9 8.5 8.5 6.5c2 .8 3 2.4 3.2 4 .6-.6 1-1.6 1-2.8 0-1.6-.7-3.2-.7-4.7z" /></G>,
  soon: (p: GlyphProps) => <G {...p}><path d="M7 3h10M7 21h10" /><path d="M8 3c0 4 8 4.5 8 9s-8 5-8 9M16 3c0 4-8 4.5-8 9s8 5 8 9" /></G>,
  resolved: (p: GlyphProps) => <G {...p}><path d="M12 3l1.9 1.4 2.3-.3 1 2.1 2.1 1-.3 2.3L21 13l-1.4 1.9.3 2.3-2.1 1-1 2.1-2.3-.3L12 21l-1.9-1.4-2.3.3-1-2.1-2.1-1 .3-2.3L3 13l1.4-1.9-.3-2.3 2.1-1 1-2.1 2.3.3z" /><path d="M9 12.5l2 2 4-4.5" /></G>,
  void: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="8.5" /><path d="M9 9l6 6M15 9l-6 6" /></G>,
  /* trust / misc */
  shieldcheck: (p: GlyphProps) => <G {...p}><path d="M12 3l7 2.5v5c0 5-3.4 8.4-7 9.5-3.6-1.1-7-4.5-7-9.5v-5z" /><path d="M9 11.5l2 2 4-4.5" /></G>,
  bolt: (p: GlyphProps) => <G {...p}><path d="M13 3L5 13h6l-1 8 8-10h-6z" /></G>,
  wallet: (p: GlyphProps) => <G {...p}><rect x="3" y="6" width="18" height="13" rx="2.5" /><path d="M16 12.5h.01M3 9h13a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H3" /></G>,
  /* heraldic decoratives */
  crown: (p: GlyphProps) => <G {...p}><path d="M4 18h16M5 18l-1.5-9 5 4 3.5-7 3.5 7 5-4L19 18z" /><circle cx="3.5" cy="9" r="1" fill="currentColor" stroke="none" /><circle cx="20.5" cy="9" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="6" r="1" fill="currentColor" stroke="none" /></G>,
  shield: (p: GlyphProps) => <G {...p}><path d="M12 3l7 2.5v5c0 5-3.4 8.4-7 9.5-3.6-1.1-7-4.5-7-9.5v-5z" /></G>,
  sparkle: (p: GlyphProps) => <G {...p}><path d="M12 3c.4 4 1.5 5.1 5.5 5.5C13.5 8.9 12.4 10 12 14c-.4-4-1.5-5.1-5.5-5.5C10.5 8.1 11.6 7 12 3z" fill="currentColor" stroke="none" /><path d="M18.5 14c.2 2 .8 2.6 2.8 2.8-2 .2-2.6.8-2.8 2.8-.2-2-.8-2.6-2.8-2.8 2-.2 2.6-.8 2.8-2.8z" fill="currentColor" stroke="none" /></G>,
  star: (p: GlyphProps) => <G {...p}><path d="M12 3.5l2.5 5.1 5.6.8-4.05 3.95.96 5.6L12 16.3 6.99 18.95l.96-5.6L3.9 9.4l5.6-.8z" /></G>,
  flame2: (p: GlyphProps) => <G {...p}><path d="M12 3c1 3 3 4.5 3 8a3 3 0 1 1-6 0c0-1 .3-1.8.8-2.4C9 11 10 12.5 11 12c-.5-2 .5-7 1-9z" /></G>,
} as const;

export type GlyphKey = keyof typeof I;

/** Map a market category to its sigil. Falls back to the markets glyph. */
const CATEGORY_GLYPH: Record<string, GlyphKey> = {
  sports: "football", football: "football",
  politics: "politics", macro: "economy", economy: "economy", forex: "forex",
  weather: "weather", crypto: "crypto",
  culture: "entertainment", entertainment: "entertainment", tech: "tech",
};
export function categoryGlyph(category: string): GlyphKey {
  return CATEGORY_GLYPH[category?.toLowerCase?.() ?? ""] ?? "markets";
}
