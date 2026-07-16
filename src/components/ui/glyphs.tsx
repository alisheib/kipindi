/**
 * 50pick custom line-icon family â€” 24px grid Â· 1.9 stroke Â· round joins.
 * Ported from Claude Design's Identity Sprint. One coherent heraldic set:
 * categories Â· actions Â· nav Â· status Â· trust + decoratives (crown/shield/seal).
 * Pure SVG, dependency-free, currentColor. Use `<I.crypto s={14} />`.
 */
import type { SVGProps } from "react";

/* `s` is the kit size prop; `size` is accepted as a lucide-compatible alias so
   icons swap from lucide → I.* without renaming every call site's prop. */
type GlyphProps = { s?: number; size?: number } & Omit<SVGProps<SVGSVGElement>, "ref">;

const G = ({ children, s, size, ...p }: GlyphProps & { children: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" width={s ?? size ?? 24} height={s ?? size ?? 24} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>{children}</svg>
);

const GL = ({ children, s, size, ...p }: GlyphProps & { children: React.ReactNode }) => (
  <svg viewBox="0 0 64 64" width={s ?? size ?? 64} height={s ?? size ?? 64} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>{children}</svg>
);

/* 64-grid wrapper for the kit's empty-state art (2.2 stroke per glyphs-additions). */
const G64 = ({ children, s, size, ...p }: GlyphProps & { children: React.ReactNode }) => (
  <svg viewBox="0 0 64 64" width={s ?? size ?? 64} height={s ?? size ?? 64} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>{children}</svg>
);

const Ibase = {
  /* categories */
  football: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="9.2" /><path d="M12 8.4L15.4 10.9L14.1 14.9H9.9L8.6 10.9Z" /><line x1="12" y1="8.4" x2="12" y2="2.8" /><line x1="15.4" y1="10.9" x2="20.8" y2="9.2" /><line x1="14.1" y1="14.9" x2="17.4" y2="19.5" /><line x1="9.9" y1="14.9" x2="6.6" y2="19.5" /><line x1="8.6" y1="10.9" x2="3.2" y2="9.2" /></G>,
  politics: (p: GlyphProps) => <G {...p}><path d="M3.5 8L12 3L20.5 8H3.5Z" /><line x1="7" y1="10.5" x2="7" y2="16.5" /><line x1="12" y1="10.5" x2="12" y2="16.5" /><line x1="17" y1="10.5" x2="17" y2="16.5" /><line x1="4.5" y1="18.5" x2="19.5" y2="18.5" /><line x1="3" y1="21" x2="21" y2="21" /></G>,
  forex: (p: GlyphProps) => <G {...p}><path d="M19.5 8.5A8 8 0 0 0 5.5 5.8" /><path d="M5.3 1.8L5.5 6L9.7 6.4" /><path d="M4.5 15.5A8 8 0 0 0 18.5 18.2" /><path d="M18.7 22.2L18.5 18L14.3 17.6" /></G>,
  weather: (p: GlyphProps) => <G {...p}><path d="M6.5 14H17.5A3.6 3.6 0 0 0 17.9 6.8A5.2 5.2 0 0 0 7.9 5.6A4.2 4.2 0 0 0 6.5 14Z" /><line x1="9.5" y1="17" x2="8" y2="20.5" /><line x1="13.5" y1="17" x2="12" y2="20.5" /><line x1="17.5" y1="17" x2="16" y2="20.5" /></G>,
  economy: (p: GlyphProps) => <G {...p}><path d="M4 3.5V19.5H21" /><path d="M6.5 15.5L11 11L13.5 13L19 7" /><path d="M15.5 6.5H19.5V10.5" /></G>,
  crypto: (p: GlyphProps) => <G {...p}><path d="M12 3L19.5 7.5V16.5L12 21L4.5 16.5V7.5Z" /><circle cx="12" cy="12.2" r="2.2" /><line x1="13.9" y1="11.1" x2="19.5" y2="7.5" /><line x1="12" y1="14.4" x2="12" y2="21" /><line x1="10.1" y1="11.1" x2="4.5" y2="7.5" /></G>,
  entertainment: (p: GlyphProps) => <G {...p}><ellipse cx="12" cy="6.5" rx="6.5" ry="2.4" /><path d="M5.5 6.5C5.5 12 7 15.5 8 19" /><path d="M18.5 6.5C18.5 12 17 15.5 16 19" /><path d="M8 19A4.5 1.8 0 0 0 16 19" /><line x1="8" y1="9.5" x2="13.5" y2="15.5" /><line x1="16" y1="9.5" x2="10.5" y2="15.5" /></G>,
  tech: (p: GlyphProps) => <G {...p}><line x1="12" y1="21" x2="12" y2="10" /><circle cx="12" cy="7.5" r="2" /><path d="M9 10A4.2 4.2 0 0 1 9 5" /><path d="M6.8 11.5A7.4 7.4 0 0 1 6.8 3.5" /><path d="M15 5A4.2 4.2 0 0 1 15 10" /><path d="M17.2 3.5A7.4 7.4 0 0 1 17.2 11.5" /><line x1="7" y1="21" x2="17" y2="21" /></G>,
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
  live: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="2.1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="5.4" /><circle cx="12" cy="12" r="9" /></G>,
  tipping: (p: GlyphProps) => <G {...p}><line x1="4" y1="13.8" x2="20" y2="9.2" /><path d="M10.3 14.6L13.7 14.6L12 11.6Z" /><line x1="4.6" y1="14.2" x2="4.6" y2="17" /><path d="M2.2 17A2.5 2.5 0 0 0 7 17" /><line x1="19.4" y1="9.6" x2="19.4" y2="12.4" /><path d="M17 12.4A2.5 2.5 0 0 0 21.8 12.4" /><line x1="8.5" y1="18.5" x2="15.5" y2="18.5" /></G>,
  hot: (p: GlyphProps) => <G {...p}><path d="M12 2.8C14.6 6 18 8.8 18 13.2A6 6 0 0 1 6 13.2C6 8.8 9.4 6 12 2.8Z" /><path d="M12 10.5C13.3 12.2 14.6 13.3 14.6 15.2A2.6 2.6 0 0 1 9.4 15.2C9.4 13.3 10.7 12.2 12 10.5Z" /></G>,
  soon: (p: GlyphProps) => <G {...p}><path d="M7 3h10M7 21h10" /><path d="M8 3c0 4 8 4.5 8 9s-8 5-8 9M16 3c0 4-8 4.5-8 9s8 5 8 9" /></G>,
  resolved: (p: GlyphProps) => <G {...p}><path d="M7.5 12.3l3.2 3.7L16.8 8.2" /><line x1="21.3" y1="12" x2="23.3" y2="12" /><line x1="18.6" y1="5.4" x2="20" y2="4" /><line x1="12" y1="2.7" x2="12" y2="0.7" /><line x1="5.4" y1="5.4" x2="4" y2="4" /><line x1="2.7" y1="12" x2="0.7" y2="12" /><line x1="5.4" y1="18.6" x2="4" y2="20" /><line x1="12" y1="21.3" x2="12" y2="23.3" /><line x1="18.6" y1="18.6" x2="20" y2="20" /></G>,
  void: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="8.5" /><path d="M9 9l6 6M15 9l-6 6" /></G>,
  /* trust / misc */
  shieldcheck: (p: GlyphProps) => <G {...p}><path d="M12 2.8L20 5.8V11.5C20 16.8 16.7 20 12 21.6C7.3 20 4 16.8 4 11.5V5.8Z" /><path d="M8.6 11.8l2.6 3L15.6 9" /></G>,
  bolt: (p: GlyphProps) => <G {...p}><path d="M13 3L5 13h6l-1 8 8-10h-6z" /></G>,
  wallet: (p: GlyphProps) => <G {...p}><rect x="3" y="6" width="18" height="13" rx="2.5" /><path d="M16 12.5h.01M3 9h13a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H3" /></G>,
  /* heraldic decoratives */
  crown: (p: GlyphProps) => <G {...p}><path d="M4.5 16.5V9.5L9 12.5L12 6.5L15 12.5L19.5 9.5V16.5Z" /><line x1="5" y1="19.5" x2="19" y2="19.5" /><circle cx="4.5" cy="7.3" r="1.1" fill="currentColor" stroke="none" /><circle cx="12" cy="4.3" r="1.1" fill="currentColor" stroke="none" /><circle cx="19.5" cy="7.3" r="1.1" fill="currentColor" stroke="none" /></G>,
  shield: (p: GlyphProps) => <G {...p}><path d="M12 2.8L20 5.8V11.5C20 16.8 16.7 20 12 21.6C7.3 20 4 16.8 4 11.5V5.8Z" /><path d="M12 5.6L17.4 7.7V11.5C17.4 15.3 15.2 17.6 12 18.9C8.8 17.6 6.6 15.3 6.6 11.5V7.7Z" /></G>,
  sparkle: (p: GlyphProps) => <G {...p}><path d="M12 3.5Q13.1 9.9 19.5 11Q13.1 12.1 12 18.5Q10.9 12.1 4.5 11Q10.9 9.9 12 3.5Z" /><circle cx="18.5" cy="5" r="1.2" fill="currentColor" stroke="none" /></G>,
  star: (p: GlyphProps) => <G {...p}><path d="M12 3L14.3 9.3L21 9.6L15.7 13.7L17.6 20.2L12 16.4L6.4 20.2L8.3 13.7L3 9.6L9.7 9.3Z" /></G>,
  flame2: (p: GlyphProps) => <G {...p}><path d="M12 3c1 3 3 4.5 3 8a3 3 0 1 1-6 0c0-1 .3-1.8.8-2.4C9 11 10 12.5 11 12c-.5-2 .5-7 1-9z" /></G>,
  /* ---- kit50.jsx extended set â€” replaces lucide-react for consistency ---- */
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
  /* aliases â€” map lucide naming to kit naming */
  listChecks: (p: GlyphProps) => <G {...p}><path d="M3 6h2.5M3 12h2.5M3 18h2.5M8 6h13M8 12h13M8 18h13" /><path d="M1 5.5l1 1 2-2M1 11.5l1 1 2-2M1 17.5l1 1 2-2" /></G>,
  layoutGrid: (p: GlyphProps) => <G {...p}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></G>,
  radio: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" /><path d="M7.5 7.5a6 6 0 0 0 0 9M16.5 7.5a6 6 0 0 1 0 9M5 5a9 9 0 0 0 0 14M19 5a9 9 0 0 1 0 14" /></G>,
  pause: (p: GlyphProps) => <G {...p}><rect x="7" y="5" width="3" height="14" rx="1" /><rect x="14" y="5" width="3" height="14" rx="1" /></G>,
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ A1 Â· player-facing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /* Mail â€” help, forgot-password, account */
  mail: (p: GlyphProps) => <G {...p}><rect x="2.5" y="4.5" width="19" height="15" rx="2.5" /><path d="M3 7l8.4 5.4a1.9 1.9 0 0 0 2 0L22 7" /></G>,

  /* Calendar â€” proposals/new, account (DOB) */
  calendar: (p: GlyphProps) => <G {...p}><rect x="3" y="4.5" width="18" height="16.5" rx="2.5" /><path d="M3 9.5h18" /><path d="M8 2.5v4M16 2.5v4" /></G>,

  /* MonitorSmartphone â€” a logged-in device (profile Â· sessions) */
  device: (p: GlyphProps) => <G {...p}><rect x="2.5" y="4" width="12" height="9.5" rx="2" /><path d="M6 17.5h5" /><path d="M8.5 13.5V17.5" /><rect x="16" y="9" width="5.5" height="11.5" rx="1.6" /><path d="M18.4 18h.7" /></G>,

  /* Vibrate â€” haptics toggle (settings Â· sound & feedback) */
  vibrate: (p: GlyphProps) => <G {...p}><rect x="9" y="5" width="6" height="14" rx="1.6" /><path d="M5.5 8.5l-1.5 3.5 1.5 3.5" /><path d="M18.5 8.5l1.5 3.5-1.5 3.5" /></G>,

  /* Smartphone â€” mobile handset (distinct from `phone` call-handset) */
  smartphone: (p: GlyphProps) => <G {...p}><rect x="5.5" y="2.5" width="13" height="19" rx="2.6" /><path d="M10 18.5h4" /></G>,

  /* ShieldQuestion â€” recovery / "why we ask" (uses kit shield path) */
  shieldQuestion: (p: GlyphProps) => <G {...p}><path d="M12 2.8L20 5.8V11.5C20 16.8 16.7 20 12 21.6C7.3 20 4 16.8 4 11.5V5.8Z" /><path d="M9.7 9.6a2.6 2.6 0 0 1 4.4 1.6c0 1.6-2.1 1.7-2.1 3" /><path d="M12 16.4h.01" /></G>,

  /* FileSignature â€” SOF declaration (document being signed) */
  fileSignature: (p: GlyphProps) => <G {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" /><path d="M14 3v5h5" /><path d="M8 16.5c.8-1.3 1.5-1.3 2 0 .4-1.4 1.1-1.7 1.9-.8" /><path d="M8 19.5h6.5" /></G>,

  /* Percent â€” affiliate commission */
  percent: (p: GlyphProps) => <G {...p}><path d="M19 5L5 19" /><circle cx="7" cy="7" r="2.3" /><circle cx="17" cy="17" r="2.3" /></G>,

  /* Link2 â€” referral link */
  link: (p: GlyphProps) => <G {...p}><path d="M9 17H7.4a5 5 0 0 1 0-10H9" /><path d="M15 7h1.6a5 5 0 0 1 0 10H15" /><path d="M8 12h8" /></G>,

  /* WhatsApp share â€” profile Â· invite (replaces today's MessageCircle) */
  messageWhatsapp: (p: GlyphProps) => <G {...p}><path d="M4 12a8 8 0 1 1 3.3 6.45L4 19.5l1.1-3.2A7.9 7.9 0 0 1 4 12z" /><path d="M9.4 9c-.2 0-.5.1-.6.4-.3.5-.6 1.1-.5 1.8.2 1.6 1.3 3 2.8 3.8.7.4 1.4.5 2 .4.4 0 .9-.4 1-.8.1-.3 0-.5-.2-.7l-1-.7c-.2-.1-.4-.1-.6.1l-.4.4c-.7-.4-1.3-1-1.6-1.7l.4-.4c.2-.2.2-.4.1-.6l-.6-1c-.1-.2-.3-.3-.5-.3z" /></G>,

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ A2 Â· admin â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /* KeyRound â€” API key / TOTP */
  keyRound: (p: GlyphProps) => <G {...p}><circle cx="7.5" cy="15.5" r="4" /><path d="M10.4 12.7L20 3.1" /><path d="M16.5 6.6l2.4 2.4M14.6 8.5l1.9 1.9" /></G>,

  /* Megaphone â€” affiliate / promotion */
  megaphone: (p: GlyphProps) => <G {...p}><path d="M4 11l15-4.5v11L4 13z" /><path d="M11 16.5a2.7 2.7 0 0 1-5.2-1.4" /><path d="M19 9.5a2.5 2.5 0 0 1 0 4" /></G>,

  /* Database â€” data / snapshot */
  database: (p: GlyphProps) => <G {...p}><ellipse cx="12" cy="5.5" rx="7.5" ry="3" /><path d="M4.5 5.5v13c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3v-13" /><path d="M4.5 12c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3" /></G>,

  /* Server â€” system / infra */
  server: (p: GlyphProps) => <G {...p}><rect x="3" y="3.5" width="18" height="7" rx="2" /><rect x="3" y="13.5" width="18" height="7" rx="2" /><path d="M6.5 7h.01M6.5 17h.01" /><path d="M10.5 7h6.5M10.5 17h6.5" /></G>,

  /* Landmark â€” civic building / treasury. B9 optical redraw: the old apex-roof
     + a separate entablature line ~1px below it merged into a blur at 12/14px.
     Redrawn to the kit's canonical geometry (same as `bank`): one closed pediment
     (no redundant entablature) + a breathing gap before the columns start. */
  landmark: (p: GlyphProps) => <G {...p}><path d="M12 3 3.5 8.5h17z" /><path d="M5.5 12v6.5M10 12v6.5M14 12v6.5M18.5 12v6.5" /><path d="M3.5 21h17" /></G>,

  /* FileText â€” report / document */
  fileText: (p: GlyphProps) => <G {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M8.5 12.5h7M8.5 16h5" /></G>,

  /* FileCheck â€” verified document / candidate approved */
  fileCheck: (p: GlyphProps) => <G {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M8.6 14.6l1.8 1.8 3.5-3.9" /></G>,

  /* FileSpreadsheet â€” XLSX export */
  fileSpreadsheet: (p: GlyphProps) => <G {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M8 13h8M8 17h8M12 13v4" /></G>,

  /* Brain â€” AI market generation */
  brain: (p: GlyphProps) => <G {...p}><path d="M12 4.5A3 3 0 0 0 9 7 3 3 0 0 0 6.5 11 2.8 2.8 0 0 0 6.5 15.5 3 3 0 0 0 9.5 19 2.6 2.6 0 0 0 12 20.5" /><path d="M12 4.5A3 3 0 0 1 15 7 3 3 0 0 1 17.5 11 2.8 2.8 0 0 1 17.5 15.5 3 3 0 0 1 14.5 19 2.6 2.6 0 0 1 12 20.5" /><path d="M12 4.5V20.5" /><path d="M9.3 10.2c1 .4 1.5 1.2 1.5 2.3M14.7 10.2c-1 .4-1.5 1.2-1.5 2.3" /></G>,

  /* Bot â€” AI assistant / poll bot */
  bot: (p: GlyphProps) => <G {...p}><path d="M12 8V4.5H8.5" /><circle cx="12" cy="3.5" r="1.1" fill="currentColor" stroke="none" /><rect x="4" y="8" width="16" height="12" rx="2.5" /><path d="M2 14h2M20 14h2" /><path d="M9 13v2M15 13v2" /></G>,

  /* ShieldAlert â€” compliance alert (uses kit shield path) */
  shieldAlert: (p: GlyphProps) => <G {...p}><path d="M12 2.8L20 5.8V11.5C20 16.8 16.7 20 12 21.6C7.3 20 4 16.8 4 11.5V5.8Z" /><path d="M12 8.5v4.2M12 16h.01" /></G>,

  /* ShieldOff â€” suspended / unprotected (uses kit shield path + slash) */
  shieldOff: (p: GlyphProps) => <G {...p}><path d="M12 2.8L20 5.8V11.5C20 16.8 16.7 20 12 21.6C7.3 20 4 16.8 4 11.5V5.8Z" /><path d="M4.8 4.5l14.4 14.4" /></G>,

  /* HeartPulse â€” responsible-gambling health */
  heartPulse: (p: GlyphProps) => <G {...p}><path d="M19 14c1.5-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7z" /><path d="M3.4 12h6l.6-1.2 2 4.6 2-7 1.5 3.6h5.2" /></G>,

  /* RotateCcw â€” restore / undo (moderation) */
  rotateCcw: (p: GlyphProps) => <G {...p}><path d="M3 12a9 9 0 1 0 2.6-6.3L3 8" /><path d="M3 3.5V8h4.5" /></G>,

  /* Archive â€” retention / archive */
  archive: (p: GlyphProps) => <G {...p}><rect x="3" y="4" width="18" height="4.6" rx="1.5" /><path d="M4.5 8.6V18a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8.6" /><path d="M9.5 12.2h5" /></G>,

  /* XCircle â€” declined / reject (circle variant) */
  xCircle: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="9" /><path d="M15 9l-6 6M9 9l6 6" /></G>,

  /* AlertOctagon â€” stop / critical (octagon) */
  alertOctagon: (p: GlyphProps) => <G {...p}><path d="M8.4 2.5h7.2L21.5 8.4v7.2L15.6 21.5H8.4L2.5 15.6V8.4z" /><path d="M12 8v4.5M12 16h.01" /></G>,

  /* ArrowUpFromLine â€” withdraw / payout out */
  arrowUpFromLine: (p: GlyphProps) => <G {...p}><path d="M18 9l-6-6-6 6" /><path d="M12 3v13.5" /><path d="M5 21h14" /></G>,

  /* ArrowDownToLine â€” deposit / funds in */
  arrowDownToLine: (p: GlyphProps) => <G {...p}><path d="M12 3v13.5" /><path d="M6 10.5l6 6 6-6" /><path d="M5 21h14" /></G>,

  /* ScrollText â€” legal / terms */
  scrollText: (p: GlyphProps) => <G {...p}><path d="M15 12h-5M15 8h-5" /><path d="M19 17V5a2 2 0 0 0-2-2H4" /><path d="M8 21h11a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1h-9a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3" /></G>,


/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ BONUS Â· empty-state line-arts (Part C) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * Larger viewBox (0 0 64 64) so they read at ~64px in an empty panel.
 * Same 1.9 stroke + round joins; render with a dedicated wrapper, e.g.:
 *
 *   const GL = ({ children, s = 64, ...p }: GlyphProps & {children: React.ReactNode}) => (
 *     <svg viewBox="0 0 64 64" width={s} height={s} fill="none" stroke="currentColor"
 *          strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>{children}</svg>
 *   );
 *
 * Use color: var(--text-subtle); center in the empty panel.
 */

  
/* markets — nothing live in this category */
  emptyMarkets: (p: GlyphProps) => <GL {...p}><path d="M32 6v20" /><path d="M16 11h32" /><path d="M16 11l-6.5 15a6.5 6.5 0 0 0 13 0z" /><path d="M48 11l-6.5 15a6.5 6.5 0 0 0 13 0z" /><path d="M22 52h20" /><path d="M32 26v26" /><circle cx="50" cy="50" r="2" fill="currentColor" stroke="none" /></GL>,

  /* positions â€” you haven't staked anything */
  emptyPositions: (p: GlyphProps) => <GL {...p}><rect x="8" y="18" width="48" height="34" rx="4" /><path d="M22 18v-3a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v3" /><path d="M8 32h48" /><path d="M37 32v6h-10v-6" /><path d="M24 45h7" /></GL>,

  /* leaderboard â€” no players ranked this round */
  emptyLeaderboard: (p: GlyphProps) => <GL {...p}><path d="M19 12h26v9a13 13 0 0 1-26 0z" /><path d="M19 16h-7v3a7 7 0 0 0 7 7M45 16h7v3a7 7 0 0 1-7 7" /><path d="M32 34v6M25 52h14M27 52l1.5-8h7l1.5 8" /><path d="M32 20l1.4 2.9 3.2.4-2.3 2.2.6 3.1L32 29.3l-2.9 1.3.6-3.1-2.3-2.2 3.2-.4z" fill="currentColor" stroke="none" /></GL>,
};

/* ── Controlled-Poll glyph additions ──
   Spread last so the three redraws (percent, activity) and the final
   controlled-poll geometry win over any interim originals in Ibase. */
const Iplus = {

  // ── Controlled Poll ──
  calendarClock: (p: GlyphProps) => <G {...p}><path d="M21 7.8V6.5A2.5 2.5 0 0 0 18.5 4h-13A2.5 2.5 0 0 0 3 6.5v12A2.5 2.5 0 0 0 5.5 21H8"/><path d="M16 2.5v4M8 2.5v4M3 9.5h5.5"/><circle cx="16" cy="16" r="5.6"/><path d="M16 13.5V16l2 1.5"/></G>,
  hourglassHalf: (p: GlyphProps) => <G {...p}><path d="M6 2.5h12M6 21.5h12"/><path d="M7.5 2.5v3.7a2 2 0 0 0 .59 1.42L12 12l3.91-4.38A2 2 0 0 0 16.5 6.2V2.5"/><path d="M16.5 21.5v-3.7a2 2 0 0 0-.59-1.42L12 12l-3.91 4.38a2 2 0 0 0-.59 1.42v3.7"/><path d="M9.6 19.7h4.8L12 17z" fill="currentColor" stroke="none"/><circle cx="12" cy="14.6" r=".8" fill="currentColor" stroke="none"/></G>,
  hourglassOff: (p: GlyphProps) => <G {...p}><path d="M6 2.5h12M6 21.5h12"/><path d="M7.5 2.5v3.7a2 2 0 0 0 .59 1.42L12 12l3.91-4.38A2 2 0 0 0 16.5 6.2V2.5"/><path d="M16.5 21.5v-3.7a2 2 0 0 0-.59-1.42L12 12l-3.91 4.38a2 2 0 0 0-.59 1.42v3.7"/><path d="M4 4l16 16"/></G>,
  target: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/></G>,
  sliders: (p: GlyphProps) => <G {...p}><path d="M3.5 6h8.5M16.5 6h4M3.5 12h3M11 12h9.5M3.5 18h11M19 18h1.5"/><path d="M14 3.8v4.4M8.5 9.8v4.4M16.5 15.8v4.4"/></G>,
  calendarRange: (p: GlyphProps) => <G {...p}><rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/><circle cx="8" cy="13.5" r="1.4" fill="currentColor" stroke="none"/><circle cx="16" cy="17" r="1.4" fill="currentColor" stroke="none"/><path d="M9.4 14.1l5.2 2.3" strokeWidth="1.3"/></G>,
  gauge: (p: GlyphProps) => <G {...p}><path d="M4 16a8 8 0 0 1 16 0"/><path d="M12 16l4.2-4.2"/><circle cx="12" cy="16" r="1.4" fill="currentColor" stroke="none"/><path d="M4 16h1.6M18.4 16H20"/></G>,
  shuffle: (p: GlyphProps) => <G {...p}><path d="M2.5 18h1.6c1.3 0 2.5-.6 3.2-1.7l6.4-8.6c.8-1.1 2-1.7 3.3-1.7h4.5"/><path d="M17.5 2l4 4-4 4"/><path d="M2.5 6h2c1.5 0 2.9.8 3.6 2.1"/><path d="M21.5 18h-5.5c-1.3 0-2.6-.7-3.3-1.8l-.6-.8"/><path d="M17.5 14l4 4-4 4"/></G>,
  circleStop: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="8.6"/><rect x="9" y="9" width="6" height="6" rx="1"/></G>,
  timerReset: (p: GlyphProps) => <G {...p}><path d="M10 2.5h4"/><path d="M4.5 13a7.7 7.7 0 0 1 7.7-6.7 7.7 7.7 0 1 1-5.1 13.5L4.5 17.6"/><path d="M9 17.2H4.5v4.5"/><path d="M12.2 14v-3.8"/></G>,
  listFilter: (p: GlyphProps) => <G {...p}><path d="M3.5 6h13M3.5 12h9M3.5 18h5.5"/><path d="M15 11.5h6.5L19 14.8v4.4l-1.5-1.2v-3.2z"/></G>,
  stepForward: (p: GlyphProps) => <G {...p}><path d="M6.5 5.2 15.6 12l-9.1 6.8z" fill="currentColor" stroke="none"/><path d="M18.5 5v14"/></G>,

  // ── Payments & money ──
  cardPay: (p: GlyphProps) => <G {...p}><rect x="2.5" y="5.5" width="19" height="13" rx="2.5"/><path d="M2.5 10h19M6 15h4"/></G>,
  bank: (p: GlyphProps) => <G {...p}><path d="M12 3 3.5 8.5h17z"/><path d="M5.5 12v6.5M10 12v6.5M14 12v6.5M18.5 12v6.5"/><path d="M3.5 21h17"/></G>,
  mobileMoney: (p: GlyphProps) => <G {...p}><rect x="7" y="2.5" width="10" height="19" rx="2.5"/><circle cx="12" cy="12" r="3.1"/><path d="M12 10.6v2.8M10.5 5.5h3"/></G>,
  cashOut: (p: GlyphProps) => <G {...p}><rect x="2.5" y="7" width="12.5" height="10" rx="2"/><circle cx="8.75" cy="12" r="2.2"/><path d="M17 12h4.5M19.4 9.7l2.3 2.3-2.3 2.3"/></G>,
  cashback: (p: GlyphProps) => <G {...p}><circle cx="13" cy="13.5" r="5.2"/><path d="M13 11.6v3.8"/><path d="M3.5 4.5V9H8"/><path d="M3.8 8.8A9.2 9.2 0 0 1 12.6 4.4"/></G>,
  percent: (p: GlyphProps) => <G {...p}><path d="M18.5 5.5l-13 13"/><circle cx="7.3" cy="7.3" r="2.7"/><circle cx="16.7" cy="16.7" r="2.7"/></G>,

  // ── Source of funds ──
  sofSalary: (p: GlyphProps) => <G {...p}><rect x="3.5" y="8" width="17" height="11.5" rx="2.2"/><path d="M9 8V6.2A2.2 2.2 0 0 1 11.2 4h1.6A2.2 2.2 0 0 1 15 6.2V8"/><circle cx="12" cy="13.7" r="1.3" fill="currentColor" stroke="none"/></G>,
  sofBusiness: (p: GlyphProps) => <G {...p}><path d="M5 9 6 4.5h12L19 9M4 9h16"/><path d="M5.5 9v10.5h13V9"/><path d="M10.3 19.5V14h3.4v5.5"/></G>,
  sofSavings: (p: GlyphProps) => <G {...p}><path d="M6.5 6.5h11"/><path d="M8.5 6.5V4.5h7v2"/><path d="M6.5 6.5v9.8a4.2 4.2 0 0 0 4.2 4.2h2.6a4.2 4.2 0 0 0 4.2-4.2V6.5"/><circle cx="12" cy="13.8" r="1.3" fill="currentColor" stroke="none"/></G>,
  sofInvestment: (p: GlyphProps) => <G {...p}><path d="M3.5 4v16.5H21"/><path d="M6.5 15.5l4-4.5 3 2.6 5.5-6.6"/><path d="M15.7 7h3.4v3.4"/></G>,
  sofGift: (p: GlyphProps) => <G {...p}><rect x="4.5" y="11.5" width="15" height="10" rx="1.5"/><rect x="3.5" y="8" width="17" height="3.5" rx="1"/><path d="M12 8v13.5"/><path d="M12 8c-1.6-3.4-5.9-3.3-5.9-1.1S10 9.4 12 8zM12 8c1.6-3.4 5.9-3.3 5.9-1.1S14 9.4 12 8z"/></G>,

  // ── Devices & sessions ──
  devicePhone: (p: GlyphProps) => <G {...p}><rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M10.8 18.5h2.4"/></G>,
  deviceDesktop: (p: GlyphProps) => <G {...p}><rect x="2.5" y="4" width="19" height="13" rx="2"/><path d="M12 17v3.5M8 20.5h8"/></G>,
  deviceTablet: (p: GlyphProps) => <G {...p}><rect x="4.5" y="2.5" width="15" height="19" rx="2.5"/><circle cx="12" cy="18.6" r=".9" fill="currentColor" stroke="none"/></G>,

  // ── Help & support ──
  compass: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="8.6"/><path d="M15 9l-1.8 4.2L9 15l1.8-4.2z"/></G>,
  idCard: (p: GlyphProps) => <G {...p}><rect x="2.5" y="5" width="19" height="14" rx="2.5"/><circle cx="8" cy="10.3" r="1.9"/><path d="M5.2 15.6a2.9 2.9 0 0 1 5.6 0"/><path d="M13.8 9.5h5M13.8 12.5h5M13.8 15.5h3"/></G>,
  headset: (p: GlyphProps) => <G {...p}><path d="M4.5 14v-2a7.5 7.5 0 0 1 15 0v2"/><rect x="3" y="13" width="3.8" height="6" rx="1.7"/><rect x="17.2" y="13" width="3.8" height="6" rx="1.7"/><path d="M19.1 19v.6a2.4 2.4 0 0 1-2.4 2.4h-3.2"/></G>,
  questionCircle: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="8.6"/><path d="M9.5 9.3a2.6 2.6 0 0 1 5.1.6c0 1.7-2.6 2.1-2.6 3.6"/><circle cx="12" cy="16.8" r=".9" fill="currentColor" stroke="none"/></G>,

  // ── Status & tags ──
  sealCheck: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="8.6"/><path d="M8 12.4l2.7 2.7 5.3-6"/></G>,
  voidX: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="8.6"/><path d="M8.8 8.8l6.4 6.4M15.2 8.8l-6.4 6.4"/></G>,
  clockPending: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="8.6" strokeDasharray="3.4 3"/><path d="M12 7.5V12l3 2"/></G>,
  lockSide: (p: GlyphProps) => <G {...p}><rect x="5" y="10.5" width="14" height="10" rx="2.2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/><circle cx="12" cy="15.5" r="1.2" fill="currentColor" stroke="none"/></G>,
  sparkleNew: (p: GlyphProps) => <G {...p}><path d="M12 4l1.7 4.3L18 10l-4.3 1.7L12 16l-1.7-4.3L6 10l4.3-1.7z"/><path d="M18.5 15.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" strokeWidth="1.4"/></G>,
  flame: (p: GlyphProps) => <G {...p}><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></G>,
  tippingScales: (p: GlyphProps) => <G {...p}><path d="M12 3.5v17M8 20.5h8"/><path d="M5 8.5l14-2.4"/><path d="M5 8.5l-2.2 4.3a2.6 2.6 0 0 0 4.4 0zM19 6.1l-2.2 4.3a2.6 2.6 0 0 0 4.4 0z" strokeWidth="1.6"/></G>,
  podium: (p: GlyphProps) => <G {...p}><path d="M3.5 20.5h17"/><path d="M9 20.5V9h6v11.5"/><path d="M3.5 20.5v-6H9M20.5 20.5v-4.5H15"/></G>,

  // ── System ──
  qr: (p: GlyphProps) => <G {...p}><rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1"/><rect x="14" y="3.5" width="6.5" height="6.5" rx="1"/><rect x="3.5" y="14" width="6.5" height="6.5" rx="1"/><path d="M14 14h3v3h-3zM20.5 14v3.2M14 20.5h3.2M20 20.3l.01.01"/></G>,
  wifiOff: (p: GlyphProps) => <G {...p}><path d="M8.5 13.2a6.3 6.3 0 0 1 7 0"/><path d="M5 10a10.6 10.6 0 0 1 4.2-2.3M14.8 7.7A10.6 10.6 0 0 1 19 10"/><circle cx="12" cy="17.2" r="1" fill="currentColor" stroke="none"/><path d="M4 4l16 16"/></G>,
  activity: (p: GlyphProps) => <G {...p}><path d="M2.5 12h4L9.2 5.5l5.6 13L17.5 12h4"/></G>,

  // ── Utility ──
  externalLink: (p: GlyphProps) => <G {...p}><path d="M13.5 5H6.5A2.5 2.5 0 0 0 4 7.5v10A2.5 2.5 0 0 0 6.5 20h10a2.5 2.5 0 0 0 2.5-2.5v-7"/><path d="M13 11 20.5 3.5M15 3.5h5.5V9"/></G>,
  sortAsc: (p: GlyphProps) => <G {...p}><path d="M4 7h9M4 12h6.5M4 17h4"/><path d="M17.5 17V7M14.5 10l3-3 3 3"/></G>,
  sortDesc: (p: GlyphProps) => <G {...p}><path d="M4 7h4M4 12h6.5M4 17h9"/><path d="M17.5 7v10M14.5 14l3 3 3-3"/></G>,
  dragHandle: (p: GlyphProps) => <G {...p}><circle cx="9" cy="6" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="6" r="1.3" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="18" r="1.3" fill="currentColor" stroke="none"/></G>,
  csvExport: (p: GlyphProps) => <G {...p}><path d="M13.5 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5z"/><path d="M13.5 3v5.5H19"/><path d="M12 18.5v-6M9.2 15.3 12 12.5l2.8 2.8"/></G>,
  ussd: (p: GlyphProps) => <G {...p}><rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M9.9 9.9l4.2 4.2M14.1 9.9l-4.2 4.2M12 9v6M9.4 12h5.2" strokeWidth="1.5"/></G>,
  simCard: (p: GlyphProps) => <G {...p}><path d="M14.5 3H7.5A2.5 2.5 0 0 0 5 5.5v13A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V7.5z"/><rect x="9" y="11" width="6" height="6.5" rx="1.3"/><path d="M12 11v6.5"/></G>,
  attest: (p: GlyphProps) => <G {...p}><path d="M4.5 8.5 9 4l4 4-4.5 4.5z"/><path d="M11 10.5l8 8"/><path d="M13.5 21h6.5" strokeWidth="1.7"/></G>,
  reconcile: (p: GlyphProps) => <G {...p}><path d="M12 4v16M8.5 20h7"/><path d="M5.5 8h13"/><path d="M5.5 8l-2 4a2.4 2.4 0 0 0 4 0zM18.5 8l-2 4a2.4 2.4 0 0 0 4 0z" strokeWidth="1.6"/></G>,

  // ── Categories (reference) ──
  catSports: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="8.6"/><path d="M12 8.8L15.04 11.01L13.88 14.59L10.12 14.59L8.96 11.01Z"/><path d="M12 8.8V3.4M15.04 11.01L20.18 9.34M13.88 14.59L17.06 18.96M10.12 14.59L6.94 18.96M8.96 11.01L3.82 9.34"/></G>,
  catMacro: (p: GlyphProps) => <G {...p}><path d="M3.5 20.5h17"/><path d="M4.5 16.5l4.5-5 3 2.7 6.5-7.7"/><path d="M15.3 6h3.5v3.5"/></G>,
  catWeather: (p: GlyphProps) => <G {...p}><path d="M17 16.5H8a4 4 0 0 1-.6-7.95A5.5 5.5 0 0 1 18 7.6a4.2 4.2 0 0 1-1 8.9z"/><path d="M8.8 19.5v1.6M12.2 19.5v1.6M15.6 19.5v1.6"/></G>,
  catCrypto: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="8.6"/><path d="M9.8 8h3.4a2 2 0 0 1 0 4H9.8m0 0h4a2 2 0 0 1 0 4H9.8M9.8 8v8"/><path d="M11.5 6.3V8M13.5 16v1.7"/></G>,
  catCulture: (p: GlyphProps) => <G {...p}><path d="M12 4l2.3 5 5.2.6-3.9 3.5 1.1 5.1L12 15.6 7.3 18.2l1.1-5.1L4.5 9.6 9.7 9z"/></G>,
  catTech: (p: GlyphProps) => <G {...p}><rect x="6.5" y="6.5" width="11" height="11" rx="2"/><rect x="10" y="10" width="4" height="4" rx="1"/><path d="M9 6.5v-3M15 6.5v-3M9 17.5v3M15 17.5v3M6.5 9h-3M6.5 15h-3M17.5 9h3M17.5 15h3"/></G>,
  catForex: (p: GlyphProps) => <G {...p}><path d="M4 8h13M14 4.8 17.2 8 14 11.2"/><path d="M20 16H7M10 12.8 6.8 16l3.2 3.2" /></G>,
  catOther: (p: GlyphProps) => <G {...p}><circle cx="5.5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="8.6"/></G>,

  // ── Empty-state illustrations (64-grid) ──
  emptyProposals: (p: GlyphProps) => <G64 {...p}><path d="M10 32l4-6h36l4 6"/><rect x="10" y="32" width="44" height="20" rx="4"/><path d="M26 29h12"/><path d="M26 23v-9a3 3 0 0 1 3-3h8l7 7v5"/><path d="M37 11v6h7"/><path d="M29.5 17.5l2.7 2.7 4.3-5"/></G64>,
  kycRail: (p: GlyphProps) => <G64 {...p}><rect x="18" y="8" width="28" height="18" rx="3"/><circle cx="26" cy="15" r="2.6"/><path d="M22.5 21.5a3.6 3.6 0 0 1 7 0"/><path d="M36 13h7M36 18h5"/><path d="M8 46h48"/><circle cx="14" cy="46" r="4" fill="currentColor" stroke="none"/><circle cx="28" cy="46" r="4" fill="currentColor" stroke="none"/><circle cx="42" cy="46" r="4"/><circle cx="56" cy="46" r="4"/></G64>,
  fairnessChain: (p: GlyphProps) => <G64 {...p}><circle cx="13" cy="34" r="8"/><circle cx="32" cy="34" r="8"/><circle cx="51" cy="34" r="8"/><path d="M21 34h3M40 34h3"/><path d="M28.5 34l2.5 2.5 4.5-5"/><path d="M32 23v-4"/></G64>,
  rgSelfCare: (p: GlyphProps) => <G64 {...p}><path d="M8 46h48"/><path d="M20 46a12 12 0 0 1 24 0"/><path d="M32 24v-7M17.5 29.5l-5-5M46.5 29.5l5-5M12 38H5M59 38h-7"/></G64>,
  adminGeneric: (p: GlyphProps) => <G64 {...p}><rect x="16" y="9" width="28" height="44" rx="4"/><rect x="24" y="5" width="12" height="7" rx="2.5"/><path d="M22 22h16M22 30h16M22 38h9"/><circle cx="43" cy="43" r="7.5"/><path d="M48.5 48.5l6.5 6.5"/></G64>,
};

export const I = { ...Ibase, ...Iplus } as const;

export type GlyphKey = keyof typeof I;

/** Map a market category to its sigil. Falls back to the markets glyph. */
const CATEGORY_GLYPH: Record<string, GlyphKey> = {
  sports: "football", football: "football",
  politics: "politics", macro: "economy", economy: "economy", forex: "forex",
  weather: "weather", crypto: "crypto",
  culture: "entertainment", entertainment: "entertainment", tech: "tech",
  mixed: "shuffle", other: "markets", infrastructure: "landmark",
};
export function categoryGlyph(category: string): GlyphKey {
  return CATEGORY_GLYPH[category?.toLowerCase?.() ?? ""] ?? "markets";
}

