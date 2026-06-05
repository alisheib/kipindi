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
  /* ---- kit50.jsx extended set — replaces lucide-react for consistency ---- */
  check: (p: GlyphProps) => <G {...p}><path d="M5 12.5l4.5 4.5L19 7" /></G>,
  x: (p: GlyphProps) => <G {...p}><path d="M6 6l12 12M18 6L6 18" /></G>,
  info: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></G>,
  ext: (p: GlyphProps) => <G {...p}><path d="M14 5h5v5M19 5l-8 8M12 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-6" /></G>,
  phone: (p: GlyphProps) => <G {...p}><rect x="7" y="3" width="10" height="18" rx="2" /><path d="M11 18h2" /></G>,
  globe: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.6 2.5 2.6 15 0 18M12 3c-2.6 2.5-2.6 15 0 18" /></G>,
  chart: (p: GlyphProps) => <G {...p}><path d="M4 19V5M4 19h16M8 16v-4M12 16V8M16 16v-6" /></G>,
  warning: (p: GlyphProps) => <G {...p}><path d="M12 4.2 21 19.5H3z" /><path d="M12 10v4.5M12 17.4h.01" /></G>,
  alertCircle: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></G>,
  eye: (p: GlyphProps) => <G {...p}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></G>,
  eyeOff: (p: GlyphProps) => <G {...p}><path d="M3 3l18 18" /><path d="M10.6 5.2A10.6 10.6 0 0 1 12 5.1c6 0 9.5 6.9 9.5 6.9a17.3 17.3 0 0 1-3.1 3.9M6.5 6.6A17.2 17.2 0 0 0 2.5 12S6 18.9 12 18.9a10.5 10.5 0 0 0 4.2-.9" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></G>,
  edit: (p: GlyphProps) => <G {...p}><path d="M4 20h4L18.5 9.5a2.12 2.12 0 0 0-3-3L5 17z" /><path d="M13.5 7.5l3 3" /></G>,
  camera: (p: GlyphProps) => <G {...p}><path d="M4 8h3l1.5-2.2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" /><circle cx="12" cy="13" r="3.2" /></G>,
  trash: (p: GlyphProps) => <G {...p}><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6.5 7l.9 13a1 1 0 0 0 1 .9h7.2a1 1 0 0 0 1-.9L18.5 7M10 11v6M14 11v6" /></G>,
  flag: (p: GlyphProps) => <G {...p}><path d="M5.5 21V4M5.5 4.5h11l-2.2 3.2 2.2 3.2h-11" /></G>,
  menu: (p: GlyphProps) => <G {...p}><path d="M4 7h16M4 12h16M4 17h16" /></G>,
  chevronDown: (p: GlyphProps) => <G {...p}><path d="M6 9l6 6 6-6" /></G>,
  chevronUp: (p: GlyphProps) => <G {...p}><path d="M6 15l6-6 6 6" /></G>,
  chevronRight: (p: GlyphProps) => <G {...p}><path d="M9 6l6 6-6 6" /></G>,
  chevronLeft: (p: GlyphProps) => <G {...p}><path d="M15 6l-6 6 6 6" /></G>,
  checkCircle: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="9" /><path d="M8.4 12.4l2.5 2.5 4.7-5.2" /></G>,
  bellRing: (p: GlyphProps) => <G {...p}><path d="M7 10a5 5 0 0 1 10 0c0 4 1.5 5 2 6H5c.5-1 2-2 2-6z" /><path d="M10.5 20a1.7 1.7 0 0 0 3 0" /><path d="M3.6 6.4A6 6 0 0 1 6 3M20.4 6.4A6 6 0 0 0 18 3" /></G>,
  bellOff: (p: GlyphProps) => <G {...p}><path d="M8.6 4.2A5 5 0 0 1 17 8c0 2.6.6 4 1.2 5M16.5 16.5H5c.5-1 2-2 2-6 0-.4 0-.7.05-1M10.5 20a1.7 1.7 0 0 0 3 0M3 3l18 18" /></G>,
  trendingUp: (p: GlyphProps) => <G {...p}><path d="M3 17l6-6 4 4 8-8" /><path d="M21 7v5M21 7h-5" /></G>,
  trendingDown: (p: GlyphProps) => <G {...p}><path d="M3 7l6 6 4-4 8 8" /><path d="M21 17v-5M21 17h-5" /></G>,
  clock: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></G>,
  arrowDown: (p: GlyphProps) => <G {...p}><path d="M12 5v14M6 13l6 6 6-6" /></G>,
  arrowUp: (p: GlyphProps) => <G {...p}><path d="M12 19V5M6 11l6-6 6 6" /></G>,
  arrowRight: (p: GlyphProps) => <G {...p}><path d="M5 12h14M13 6l6 6-6 6" /></G>,
  play: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="9" /><path d="M10 8.5l5.5 3.5L10 15.5z" fill="currentColor" stroke="none" /></G>,
  download: (p: GlyphProps) => <G {...p}><path d="M12 5v10M7 12l5 5 5-5M5 19h14" /></G>,
  upload: (p: GlyphProps) => <G {...p}><path d="M12 15V5M7 8l5-5 5 5M5 19h14" /></G>,
  copy: (p: GlyphProps) => <G {...p}><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M4 16V6a2 2 0 0 1 2-2h10" /></G>,
  lock: (p: GlyphProps) => <G {...p}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></G>,
  unlock: (p: GlyphProps) => <G {...p}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 7.4-2" /></G>,
  user: (p: GlyphProps) => <G {...p}><circle cx="12" cy="8.5" r="3.5" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0z" /></G>,
  users: (p: GlyphProps) => <G {...p}><circle cx="9" cy="8" r="3" /><path d="M4 19a5 5 0 0 1 10 0" /><circle cx="17" cy="9" r="2.5" /><path d="M20.5 19a4 4 0 0 0-5-3.6" /></G>,
  settings: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="3" /><path d="M12 1.5v3M12 19.5v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1.5 12h3M19.5 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></G>,
  logOut: (p: GlyphProps) => <G {...p}><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" /></G>,
  logIn: (p: GlyphProps) => <G {...p}><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M3 12h12M10 7l5 5-5 5" /></G>,
  gift: (p: GlyphProps) => <G {...p}><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13M3 12h18v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7" /><path d="M7.5 8C7.5 6 9 4.5 10.5 4.5S12 6 12 8M16.5 8c0-2-1.5-3.5-3-3.5S12 6 12 8" /></G>,
  receipt: (p: GlyphProps) => <G {...p}><path d="M4 2v20l3-2 3 2 3-2 3 2 3-2V2l-3 2-3-2-3 2-3-2z" /><path d="M8 10h8M8 14h5" /></G>,
  coins: (p: GlyphProps) => <G {...p}><circle cx="10" cy="10" r="6" /><path d="M14.5 13.5a6 6 0 1 0 0-7" /><path d="M10 8v4M8.5 10.5h3" /></G>,
  activity: (p: GlyphProps) => <G {...p}><path d="M3 12h4l3-8 4 16 3-8h4" /></G>,
  ticket: (p: GlyphProps) => <G {...p}><path d="M2 9a3 3 0 0 1 0 6v4h20v-4a3 3 0 0 1 0-6V5H2z" /><path d="M13 5v2M13 17v2M13 11v2" /></G>,
  /* aliases — map lucide naming to kit naming */
  listChecks: (p: GlyphProps) => <G {...p}><path d="M3 6h2.5M3 12h2.5M3 18h2.5M8 6h13M8 12h13M8 18h13" /><path d="M1 5.5l1 1 2-2M1 11.5l1 1 2-2M1 17.5l1 1 2-2" /></G>,
  layoutGrid: (p: GlyphProps) => <G {...p}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></G>,
  radio: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" /><path d="M7.5 7.5a6 6 0 0 0 0 9M16.5 7.5a6 6 0 0 1 0 9M5 5a9 9 0 0 0 0 14M19 5a9 9 0 0 1 0 14" /></G>,
  pause: (p: GlyphProps) => <G {...p}><rect x="7" y="5" width="3" height="14" rx="1" /><rect x="14" y="5" width="3" height="14" rx="1" /></G>,
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
