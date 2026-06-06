/**
 * 50pick — glyph pack additions (Claude Design, finishing the lucide purge).
 * Paste these entries into the `I` object in `src/components/ui/glyphs.tsx`.
 * Same construction as the existing family: 24×24 grid · 1.9 stroke ·
 * round caps + joins · currentColor · fill="none" (tiny accent dots fill).
 *
 * The <G> wrapper + GlyphProps type already exist in glyphs.tsx — these are
 * drop-in members of `I`. After pasting, swap remaining `lucide` → `I.<key>`
 * (player surfaces first, then admin) to make the platform lucide-free.
 *
 * Lucide refs are noted per key so you can map old import sites 1:1.
 */

// ───────────────────────── A1 · player-facing ─────────────────────────

  /* Mail — help, forgot-password, account */
  mail: (p: GlyphProps) => <G {...p}><rect x="2.5" y="4.5" width="19" height="15" rx="2.5" /><path d="M3 7l8.4 5.4a1.9 1.9 0 0 0 2 0L22 7" /></G>,

  /* Calendar — proposals/new, account (DOB) */
  calendar: (p: GlyphProps) => <G {...p}><rect x="3" y="4.5" width="18" height="16.5" rx="2.5" /><path d="M3 9.5h18" /><path d="M8 2.5v4M16 2.5v4" /></G>,

  /* MonitorSmartphone — a logged-in device (profile · sessions) */
  device: (p: GlyphProps) => <G {...p}><rect x="2.5" y="4" width="12" height="9.5" rx="2" /><path d="M6 17.5h5" /><path d="M8.5 13.5V17.5" /><rect x="16" y="9" width="5.5" height="11.5" rx="1.6" /><path d="M18.4 18h.7" /></G>,

  /* Vibrate — haptics toggle (settings · sound & feedback) */
  vibrate: (p: GlyphProps) => <G {...p}><rect x="9" y="5" width="6" height="14" rx="1.6" /><path d="M5.5 8.5l-1.5 3.5 1.5 3.5" /><path d="M18.5 8.5l1.5 3.5-1.5 3.5" /></G>,

  /* Smartphone — mobile handset (distinct from `phone` call-handset) */
  smartphone: (p: GlyphProps) => <G {...p}><rect x="5.5" y="2.5" width="13" height="19" rx="2.6" /><path d="M10 18.5h4" /></G>,

  /* ShieldQuestion — recovery / "why we ask" (uses kit shield path) */
  shieldQuestion: (p: GlyphProps) => <G {...p}><path d="M12 3l7 2.5v5c0 5-3.4 8.4-7 9.5-3.6-1.1-7-4.5-7-9.5v-5z" /><path d="M9.7 9.6a2.6 2.6 0 0 1 4.4 1.6c0 1.6-2.1 1.7-2.1 3" /><path d="M12 16.4h.01" /></G>,

  /* FileSignature — SOF declaration (document being signed) */
  fileSignature: (p: GlyphProps) => <G {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" /><path d="M14 3v5h5" /><path d="M8 16.5c.8-1.3 1.5-1.3 2 0 .4-1.4 1.1-1.7 1.9-.8" /><path d="M8 19.5h6.5" /></G>,

  /* Percent — affiliate commission */
  percent: (p: GlyphProps) => <G {...p}><path d="M19 5L5 19" /><circle cx="7" cy="7" r="2.3" /><circle cx="17" cy="17" r="2.3" /></G>,

  /* Link2 — referral link */
  link: (p: GlyphProps) => <G {...p}><path d="M9 17H7.4a5 5 0 0 1 0-10H9" /><path d="M15 7h1.6a5 5 0 0 1 0 10H15" /><path d="M8 12h8" /></G>,

  /* WhatsApp share — profile · invite (replaces today's MessageCircle) */
  messageWhatsapp: (p: GlyphProps) => <G {...p}><path d="M4 12a8 8 0 1 1 3.3 6.45L4 19.5l1.1-3.2A7.9 7.9 0 0 1 4 12z" /><path d="M9.4 9c-.2 0-.5.1-.6.4-.3.5-.6 1.1-.5 1.8.2 1.6 1.3 3 2.8 3.8.7.4 1.4.5 2 .4.4 0 .9-.4 1-.8.1-.3 0-.5-.2-.7l-1-.7c-.2-.1-.4-.1-.6.1l-.4.4c-.7-.4-1.3-1-1.6-1.7l.4-.4c.2-.2.2-.4.1-.6l-.6-1c-.1-.2-.3-.3-.5-.3z" /></G>,

// ───────────────────────────── A2 · admin ─────────────────────────────

  /* KeyRound — API key / TOTP */
  keyRound: (p: GlyphProps) => <G {...p}><circle cx="7.5" cy="15.5" r="4" /><path d="M10.4 12.7L20 3.1" /><path d="M16.5 6.6l2.4 2.4M14.6 8.5l1.9 1.9" /></G>,

  /* Megaphone — affiliate / promotion */
  megaphone: (p: GlyphProps) => <G {...p}><path d="M4 11l15-4.5v11L4 13z" /><path d="M11 16.5a2.7 2.7 0 0 1-5.2-1.4" /><path d="M19 9.5a2.5 2.5 0 0 1 0 4" /></G>,

  /* Database — data / snapshot */
  database: (p: GlyphProps) => <G {...p}><ellipse cx="12" cy="5.5" rx="7.5" ry="3" /><path d="M4.5 5.5v13c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3v-13" /><path d="M4.5 12c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3" /></G>,

  /* Server — system / infra */
  server: (p: GlyphProps) => <G {...p}><rect x="3" y="3.5" width="18" height="7" rx="2" /><rect x="3" y="13.5" width="18" height="7" rx="2" /><path d="M6.5 7h.01M6.5 17h.01" /><path d="M10.5 7h6.5M10.5 17h6.5" /></G>,

  /* Landmark — bank / house-pool treasury */
  landmark: (p: GlyphProps) => <G {...p}><path d="M12 3l8.5 4.5H3.5z" /><path d="M3.5 7.5h17" /><path d="M6 11v6.5M10 11v6.5M14 11v6.5M18 11v6.5" /><path d="M3 21h18" /></G>,

  /* FileText — report / document */
  fileText: (p: GlyphProps) => <G {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M8.5 12.5h7M8.5 16h5" /></G>,

  /* FileCheck — verified document / candidate approved */
  fileCheck: (p: GlyphProps) => <G {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M8.6 14.6l1.8 1.8 3.5-3.9" /></G>,

  /* FileSpreadsheet — XLSX export */
  fileSpreadsheet: (p: GlyphProps) => <G {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M8 13h8M8 17h8M12 13v4" /></G>,

  /* Brain — AI market generation */
  brain: (p: GlyphProps) => <G {...p}><path d="M12 4.5A3 3 0 0 0 9 7 3 3 0 0 0 6.5 11 2.8 2.8 0 0 0 6.5 15.5 3 3 0 0 0 9.5 19 2.6 2.6 0 0 0 12 20.5" /><path d="M12 4.5A3 3 0 0 1 15 7 3 3 0 0 1 17.5 11 2.8 2.8 0 0 1 17.5 15.5 3 3 0 0 1 14.5 19 2.6 2.6 0 0 1 12 20.5" /><path d="M12 4.5V20.5" /><path d="M9.3 10.2c1 .4 1.5 1.2 1.5 2.3M14.7 10.2c-1 .4-1.5 1.2-1.5 2.3" /></G>,

  /* Bot — AI assistant / poll bot */
  bot: (p: GlyphProps) => <G {...p}><path d="M12 8V4.5H8.5" /><circle cx="12" cy="3.5" r="1.1" fill="currentColor" stroke="none" /><rect x="4" y="8" width="16" height="12" rx="2.5" /><path d="M2 14h2M20 14h2" /><path d="M9 13v2M15 13v2" /></G>,

  /* ShieldAlert — compliance alert (uses kit shield path) */
  shieldAlert: (p: GlyphProps) => <G {...p}><path d="M12 3l7 2.5v5c0 5-3.4 8.4-7 9.5-3.6-1.1-7-4.5-7-9.5v-5z" /><path d="M12 8.5v4.2M12 16h.01" /></G>,

  /* ShieldOff — suspended / unprotected (uses kit shield path + slash) */
  shieldOff: (p: GlyphProps) => <G {...p}><path d="M12 3l7 2.5v5c0 5-3.4 8.4-7 9.5-3.6-1.1-7-4.5-7-9.5v-5z" /><path d="M4.8 4.5l14.4 14.4" /></G>,

  /* HeartPulse — responsible-gambling health */
  heartPulse: (p: GlyphProps) => <G {...p}><path d="M19 14c1.5-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7z" /><path d="M3.4 12h6l.6-1.2 2 4.6 2-7 1.5 3.6h5.2" /></G>,

  /* RotateCcw — restore / undo (moderation) */
  rotateCcw: (p: GlyphProps) => <G {...p}><path d="M3 12a9 9 0 1 0 2.6-6.3L3 8" /><path d="M3 3.5V8h4.5" /></G>,

  /* Archive — retention / archive */
  archive: (p: GlyphProps) => <G {...p}><rect x="3" y="4" width="18" height="4.6" rx="1.5" /><path d="M4.5 8.6V18a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8.6" /><path d="M9.5 12.2h5" /></G>,

  /* XCircle — declined / reject (circle variant) */
  xCircle: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="9" /><path d="M15 9l-6 6M9 9l6 6" /></G>,

  /* AlertOctagon — stop / critical (octagon) */
  alertOctagon: (p: GlyphProps) => <G {...p}><path d="M8.4 2.5h7.2L21.5 8.4v7.2L15.6 21.5H8.4L2.5 15.6V8.4z" /><path d="M12 8v4.5M12 16h.01" /></G>,

  /* ArrowUpFromLine — withdraw / payout out */
  arrowUpFromLine: (p: GlyphProps) => <G {...p}><path d="M18 9l-6-6-6 6" /><path d="M12 3v13.5" /><path d="M5 21h14" /></G>,

  /* ArrowDownToLine — deposit / funds in */
  arrowDownToLine: (p: GlyphProps) => <G {...p}><path d="M12 3v13.5" /><path d="M6 10.5l6 6 6-6" /><path d="M5 21h14" /></G>,

  /* ScrollText — legal / terms */
  scrollText: (p: GlyphProps) => <G {...p}><path d="M15 12h-5M15 8h-5" /><path d="M19 17V5a2 2 0 0 0-2-2H4" /><path d="M8 21h11a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1h-9a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3" /></G>,


/* ─────────────────── BONUS · empty-state line-arts (Part C) ───────────────────
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

  /* positions — you haven't staked anything */
  emptyPositions: (p: GlyphProps) => <GL {...p}><rect x="8" y="18" width="48" height="34" rx="4" /><path d="M22 18v-3a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v3" /><path d="M8 32h48" /><path d="M37 32v6h-10v-6" /><path d="M24 45h7" /></GL>,

  /* leaderboard — no players ranked this round */
  emptyLeaderboard: (p: GlyphProps) => <GL {...p}><path d="M19 12h26v9a13 13 0 0 1-26 0z" /><path d="M19 16h-7v3a7 7 0 0 0 7 7M45 16h7v3a7 7 0 0 1-7 7" /><path d="M32 34v6M25 52h14M27 52l1.5-8h7l1.5 8" /><path d="M32 20l1.4 2.9 3.2.4-2.3 2.2.6 3.1L32 29.3l-2.9 1.3.6-3.1-2.3-2.2 3.2-.4z" fill="currentColor" stroke="none" /></GL>,
