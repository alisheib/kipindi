/* 50pick — glyph additions (Claude Design, 2026-07-07)
   Same idiom as components/ui/glyphs.tsx: 24×24 grid, 1.9px stroke,
   round caps/joins, currentColor, fill="none"; filled accents use
   fill="currentColor" stroke="none". 64×64 grid for empty-state art.
   Merge into the existing `I` export. */
import type { SVGProps } from "react";
type GlyphProps = { s?: number; size?: number } & Omit<SVGProps<SVGSVGElement>, "ref">;

const G = ({ children, s, size, ...p }: GlyphProps & { children: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" width={s ?? size ?? 24} height={s ?? size ?? 24}
       fill="none" stroke="currentColor" strokeWidth="1.9"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>{children}</svg>
);
const G64 = ({ children, s, size, ...p }: GlyphProps & { children: React.ReactNode }) => (
  <svg viewBox="0 0 64 64" width={s ?? size ?? 64} height={s ?? size ?? 64}
       fill="none" stroke="currentColor" strokeWidth="2.2"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>{children}</svg>
);

export const Iplus = {

  // ── Controlled Poll ──
  calendarClock: (p: GlyphProps) => <G {...p}><path d="M21 7.8V6.5A2.5 2.5 0 0 0 18.5 4h-13A2.5 2.5 0 0 0 3 6.5v12A2.5 2.5 0 0 0 5.5 21H8"/><path d="M16 2.5v4M8 2.5v4M3 9.5h5.5"/><circle cx="16" cy="16" r="5.6"/><path d="M16 13.5V16l2 1.5"/></G>, // date+time pickers
  hourglassHalf: (p: GlyphProps) => <G {...p}><path d="M6 2.5h12M6 21.5h12"/><path d="M7.5 2.5v3.7a2 2 0 0 0 .59 1.42L12 12l3.91-4.38A2 2 0 0 0 16.5 6.2V2.5"/><path d="M16.5 21.5v-3.7a2 2 0 0 0-.59-1.42L12 12l-3.91 4.38a2 2 0 0 0-.59 1.42v3.7"/><path d="M9.6 19.7h4.8L12 17z" fill="currentColor" stroke="none"/><circle cx="12" cy="14.6" r=".8" fill="currentColor" stroke="none"/></G>, // closing-soon countdown
  hourglassOff: (p: GlyphProps) => <G {...p}><path d="M6 2.5h12M6 21.5h12"/><path d="M7.5 2.5v3.7a2 2 0 0 0 .59 1.42L12 12l3.91-4.38A2 2 0 0 0 16.5 6.2V2.5"/><path d="M16.5 21.5v-3.7a2 2 0 0 0-.59-1.42L12 12l-3.91 4.38a2 2 0 0 0-.59 1.42v3.7"/><path d="M4 4l16 16"/></G>, // selection closed · waiting
  target: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/></G>, // controlled-poll mode
  sliders: (p: GlyphProps) => <G {...p}><path d="M3.5 6h8.5M16.5 6h4M3.5 12h3M11 12h9.5M3.5 18h11M19 18h1.5"/><path d="M14 3.8v4.4M8.5 9.8v4.4M16.5 15.8v4.4"/></G>, // advanced config
  calendarRange: (p: GlyphProps) => <G {...p}><rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/><circle cx="8" cy="13.5" r="1.4" fill="currentColor" stroke="none"/><circle cx="16" cy="17" r="1.4" fill="currentColor" stroke="none"/><path d="M9.4 14.1l5.2 2.3" strokeWidth="1.3"/></G>, // close→resolve span
  gauge: (p: GlyphProps) => <G {...p}><path d="M4 16a8 8 0 0 1 16 0"/><path d="M12 16l4.2-4.2"/><circle cx="12" cy="16" r="1.4" fill="currentColor" stroke="none"/><path d="M4 16h1.6M18.4 16H20"/></G>, // confidence / quality
  shuffle: (p: GlyphProps) => <G {...p}><path d="M2.5 18h1.6c1.3 0 2.5-.6 3.2-1.7l6.4-8.6c.8-1.1 2-1.7 3.3-1.7h4.5"/><path d="M17.5 2l4 4-4 4"/><path d="M2.5 6h2c1.5 0 2.9.8 3.6 2.1"/><path d="M21.5 18h-5.5c-1.3 0-2.6-.7-3.3-1.8l-.6-.8"/><path d="M17.5 14l4 4-4 4"/></G>, // mixed categories
  circleStop: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="8.6"/><rect x="9" y="9" width="6" height="6" rx="1"/></G>, // force-stop sentinel
  timerReset: (p: GlyphProps) => <G {...p}><path d="M10 2.5h4"/><path d="M4.5 13a7.7 7.7 0 0 1 7.7-6.7 7.7 7.7 0 1 1-5.1 13.5L4.5 17.6"/><path d="M9 17.2H4.5v4.5"/><path d="M12.2 14v-3.8"/></G>, // sentinel timer reset
  listFilter: (p: GlyphProps) => <G {...p}><path d="M3.5 6h13M3.5 12h9M3.5 18h5.5"/><path d="M15 11.5h6.5L19 14.8v4.4l-1.5-1.2v-3.2z"/></G>, // filtered poll state
  stepForward: (p: GlyphProps) => <G {...p}><path d="M6.5 5.2 15.6 12l-9.1 6.8z" fill="currentColor" stroke="none"/><path d="M18.5 5v14"/></G>, // run now

  // ── Payments & money ──
  cardPay: (p: GlyphProps) => <G {...p}><rect x="2.5" y="5.5" width="19" height="13" rx="2.5"/><path d="M2.5 10h19M6 15h4"/></G>, // card provider tile
  bank: (p: GlyphProps) => <G {...p}><path d="M12 3 3.5 8.5h17z"/><path d="M5.5 12v6.5M10 12v6.5M14 12v6.5M18.5 12v6.5"/><path d="M3.5 21h17"/></G>, // bank tile · landmark redraw
  mobileMoney: (p: GlyphProps) => <G {...p}><rect x="7" y="2.5" width="10" height="19" rx="2.5"/><circle cx="12" cy="12" r="3.1"/><path d="M12 10.6v2.8M10.5 5.5h3"/></G>, // generic MNO fallback
  cashOut: (p: GlyphProps) => <G {...p}><rect x="2.5" y="7" width="12.5" height="10" rx="2"/><circle cx="8.75" cy="12" r="2.2"/><path d="M17 12h4.5M19.4 9.7l2.3 2.3-2.3 2.3"/></G>, // withdraw / payout
  cashback: (p: GlyphProps) => <G {...p}><circle cx="13" cy="13.5" r="5.2"/><path d="M13 11.6v3.8"/><path d="M3.5 4.5V9H8"/><path d="M3.8 8.8A9.2 9.2 0 0 1 12.6 4.4"/></G>, // cash-back bonus
  percent: (p: GlyphProps) => <G {...p}><path d="M18.5 5.5l-13 13"/><circle cx="7.3" cy="7.3" r="2.7"/><circle cx="16.7" cy="16.7" r="2.7"/></G>, // REDRAW · heavier at 12px

  // ── Source of funds ──
  sofSalary: (p: GlyphProps) => <G {...p}><rect x="3.5" y="8" width="17" height="11.5" rx="2.2"/><path d="M9 8V6.2A2.2 2.2 0 0 1 11.2 4h1.6A2.2 2.2 0 0 1 15 6.2V8"/><circle cx="12" cy="13.7" r="1.3" fill="currentColor" stroke="none"/></G>, // salary / employment
  sofBusiness: (p: GlyphProps) => <G {...p}><path d="M5 9 6 4.5h12L19 9M4 9h16"/><path d="M5.5 9v10.5h13V9"/><path d="M10.3 19.5V14h3.4v5.5"/></G>, // business income
  sofSavings: (p: GlyphProps) => <G {...p}><path d="M6.5 6.5h11"/><path d="M8.5 6.5V4.5h7v2"/><path d="M6.5 6.5v9.8a4.2 4.2 0 0 0 4.2 4.2h2.6a4.2 4.2 0 0 0 4.2-4.2V6.5"/><circle cx="12" cy="13.8" r="1.3" fill="currentColor" stroke="none"/></G>, // savings
  sofInvestment: (p: GlyphProps) => <G {...p}><path d="M3.5 4v16.5H21"/><path d="M6.5 15.5l4-4.5 3 2.6 5.5-6.6"/><path d="M15.7 7h3.4v3.4"/></G>, // investment returns
  sofGift: (p: GlyphProps) => <G {...p}><rect x="4.5" y="11.5" width="15" height="10" rx="1.5"/><rect x="3.5" y="8" width="17" height="3.5" rx="1"/><path d="M12 8v13.5"/><path d="M12 8c-1.6-3.4-5.9-3.3-5.9-1.1S10 9.4 12 8zM12 8c1.6-3.4 5.9-3.3 5.9-1.1S14 9.4 12 8z"/></G>, // gift / family support

  // ── Devices & sessions ──
  devicePhone: (p: GlyphProps) => <G {...p}><rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M10.8 18.5h2.4"/></G>, // phone session
  deviceDesktop: (p: GlyphProps) => <G {...p}><rect x="2.5" y="4" width="19" height="13" rx="2"/><path d="M12 17v3.5M8 20.5h8"/></G>, // desktop session
  deviceTablet: (p: GlyphProps) => <G {...p}><rect x="4.5" y="2.5" width="15" height="19" rx="2.5"/><circle cx="12" cy="18.6" r=".9" fill="currentColor" stroke="none"/></G>, // tablet session

  // ── Help & support ──
  compass: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="8.6"/><path d="M15 9l-1.8 4.2L9 15l1.8-4.2z"/></G>, // getting started
  idCard: (p: GlyphProps) => <G {...p}><rect x="2.5" y="5" width="19" height="14" rx="2.5"/><circle cx="8" cy="10.3" r="1.9"/><path d="M5.2 15.6a2.9 2.9 0 0 1 5.6 0"/><path d="M13.8 9.5h5M13.8 12.5h5M13.8 15.5h3"/></G>, // KYC / identity
  headset: (p: GlyphProps) => <G {...p}><path d="M4.5 14v-2a7.5 7.5 0 0 1 15 0v2"/><rect x="3" y="13" width="3.8" height="6" rx="1.7"/><rect x="17.2" y="13" width="3.8" height="6" rx="1.7"/><path d="M19.1 19v.6a2.4 2.4 0 0 1-2.4 2.4h-3.2"/></G>, // contact support
  questionCircle: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="8.6"/><path d="M9.5 9.3a2.6 2.6 0 0 1 5.1.6c0 1.7-2.6 2.1-2.6 3.6"/><circle cx="12" cy="16.8" r=".9" fill="currentColor" stroke="none"/></G>, // general question

  // ── Status & tags ──
  sealCheck: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="8.6"/><path d="M8 12.4l2.7 2.7 5.3-6"/></G>, // resolved seal
  voidX: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="8.6"/><path d="M8.8 8.8l6.4 6.4M15.2 8.8l-6.4 6.4"/></G>, // voided market
  clockPending: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="8.6" strokeDasharray="3.4 3"/><path d="M12 7.5V12l3 2"/></G>, // pending / provisional
  lockSide: (p: GlyphProps) => <G {...p}><rect x="5" y="10.5" width="14" height="10" rx="2.2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/><circle cx="12" cy="15.5" r="1.2" fill="currentColor" stroke="none"/></G>, // locked side / KYC gate
  sparkleNew: (p: GlyphProps) => <G {...p}><path d="M12 4l1.7 4.3L18 10l-4.3 1.7L12 16l-1.7-4.3L6 10l4.3-1.7z"/><path d="M18.5 15.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" strokeWidth="1.4"/></G>, // new market
  flame: (p: GlyphProps) => <G {...p}><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></G>, // hot
  tippingScales: (p: GlyphProps) => <G {...p}><path d="M12 3.5v17M8 20.5h8"/><path d="M5 8.5l14-2.4"/><path d="M5 8.5l-2.2 4.3a2.6 2.6 0 0 0 4.4 0zM19 6.1l-2.2 4.3a2.6 2.6 0 0 0 4.4 0z" strokeWidth="1.6"/></G>, // tipping · near 50/50
  podium: (p: GlyphProps) => <G {...p}><path d="M3.5 20.5h17"/><path d="M9 20.5V9h6v11.5"/><path d="M3.5 20.5v-6H9M20.5 20.5v-4.5H15"/></G>, // leaderboard

  // ── System ──
  qr: (p: GlyphProps) => <G {...p}><rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1"/><rect x="14" y="3.5" width="6.5" height="6.5" rx="1"/><rect x="3.5" y="14" width="6.5" height="6.5" rx="1"/><path d="M14 14h3v3h-3zM20.5 14v3.2M14 20.5h3.2M20 20.3l.01.01"/></G>, // invite share QR
  wifiOff: (p: GlyphProps) => <G {...p}><path d="M8.5 13.2a6.3 6.3 0 0 1 7 0"/><path d="M5 10a10.6 10.6 0 0 1 4.2-2.3M14.8 7.7A10.6 10.6 0 0 1 19 10"/><circle cx="12" cy="17.2" r="1" fill="currentColor" stroke="none"/><path d="M4 4l16 16"/></G>, // offline route
  activity: (p: GlyphProps) => <G {...p}><path d="M2.5 12h4L9.2 5.5l5.6 13L17.5 12h4"/></G>, // REDRAW · peaks kept in box

  // ── Utility ──
  copy: (p: GlyphProps) => <G {...p}><rect x="8.5" y="8.5" width="12" height="12" rx="2.2"/><path d="M5.5 15.5h-1A1.5 1.5 0 0 1 3 14V4.5A1.5 1.5 0 0 1 4.5 3H14a1.5 1.5 0 0 1 1.5 1.5v1"/></G>, // copy code / reference
  externalLink: (p: GlyphProps) => <G {...p}><path d="M13.5 5H6.5A2.5 2.5 0 0 0 4 7.5v10A2.5 2.5 0 0 0 6.5 20h10a2.5 2.5 0 0 0 2.5-2.5v-7"/><path d="M13 11 20.5 3.5M15 3.5h5.5V9"/></G>, // source link
  sortAsc: (p: GlyphProps) => <G {...p}><path d="M4 7h9M4 12h6.5M4 17h4"/><path d="M17.5 17V7M14.5 10l3-3 3 3"/></G>, // sort ascending
  sortDesc: (p: GlyphProps) => <G {...p}><path d="M4 7h4M4 12h6.5M4 17h9"/><path d="M17.5 7v10M14.5 14l3 3 3-3"/></G>, // sort descending
  dragHandle: (p: GlyphProps) => <G {...p}><circle cx="9" cy="6" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="6" r="1.3" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="18" r="1.3" fill="currentColor" stroke="none"/></G>, // reorder
  csvExport: (p: GlyphProps) => <G {...p}><path d="M13.5 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5z"/><path d="M13.5 3v5.5H19"/><path d="M12 18.5v-6M9.2 15.3 12 12.5l2.8 2.8"/></G>, // export CSV
  ussd: (p: GlyphProps) => <G {...p}><rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M9.9 9.9l4.2 4.2M14.1 9.9l-4.2 4.2M12 9v6M9.4 12h5.2" strokeWidth="1.5"/></G>, // USSD deposit path
  simCard: (p: GlyphProps) => <G {...p}><path d="M14.5 3H7.5A2.5 2.5 0 0 0 5 5.5v13A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V7.5z"/><rect x="9" y="11" width="6" height="6.5" rx="1.3"/><path d="M12 11v6.5"/></G>, // SIM / MNO context
  attest: (p: GlyphProps) => <G {...p}><path d="M4.5 8.5 9 4l4 4-4.5 4.5z"/><path d="M11 10.5l8 8"/><path d="M13.5 21h6.5" strokeWidth="1.7"/></G>, // officer attestation
  reconcile: (p: GlyphProps) => <G {...p}><path d="M12 4v16M8.5 20h7"/><path d="M5.5 8h13"/><path d="M5.5 8l-2 4a2.4 2.4 0 0 0 4 0zM18.5 8l-2 4a2.4 2.4 0 0 0 4 0z" strokeWidth="1.6"/></G>, // ledger reconciliation

  // ── Categories (reference) ──
  catSports: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="8.6"/><path d="M12 8.8L15.04 11.01L13.88 14.59L10.12 14.59L8.96 11.01Z"/><path d="M12 8.8V3.4M15.04 11.01L20.18 9.34M13.88 14.59L17.06 18.96M10.12 14.59L6.94 18.96M8.96 11.01L3.82 9.34"/></G>, // Sports · Michezo · 体育
  catMacro: (p: GlyphProps) => <G {...p}><path d="M3.5 20.5h17"/><path d="M4.5 16.5l4.5-5 3 2.7 6.5-7.7"/><path d="M15.3 6h3.5v3.5"/></G>, // Macro · Uchumi · 宏观
  catWeather: (p: GlyphProps) => <G {...p}><path d="M17 16.5H8a4 4 0 0 1-.6-7.95A5.5 5.5 0 0 1 18 7.6a4.2 4.2 0 0 1-1 8.9z"/><path d="M8.8 19.5v1.6M12.2 19.5v1.6M15.6 19.5v1.6"/></G>, // Weather · Hali ya hewa · 天气
  catCrypto: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="8.6"/><path d="M9.8 8h3.4a2 2 0 0 1 0 4H9.8m0 0h4a2 2 0 0 1 0 4H9.8M9.8 8v8"/><path d="M11.5 6.3V8M13.5 16v1.7"/></G>, // Crypto · Kripto · 加密货币
  catCulture: (p: GlyphProps) => <G {...p}><path d="M12 4l2.3 5 5.2.6-3.9 3.5 1.1 5.1L12 15.6 7.3 18.2l1.1-5.1L4.5 9.6 9.7 9z"/></G>, // Culture · Utamaduni · 文化
  catTech: (p: GlyphProps) => <G {...p}><rect x="6.5" y="6.5" width="11" height="11" rx="2"/><rect x="10" y="10" width="4" height="4" rx="1"/><path d="M9 6.5v-3M15 6.5v-3M9 17.5v3M15 17.5v3M6.5 9h-3M6.5 15h-3M17.5 9h3M17.5 15h3"/></G>, // Tech · Teknolojia · 科技
  catForex: (p: GlyphProps) => <G {...p}><path d="M4 8h13M14 4.8 17.2 8 14 11.2"/><path d="M20 16H7M10 12.8 6.8 16l3.2 3.2" /></G>, // Forex · Fedha · 外汇
  catOther: (p: GlyphProps) => <G {...p}><circle cx="5.5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="8.6"/></G>, // Other · Nyinginezo · 其他

  // ── Empty-state illustrations (64-grid) ──
  emptyProposals: (p: GlyphProps) => <G64 {...p}><path d="M10 32l4-6h36l4 6"/><rect x="10" y="32" width="44" height="20" rx="4"/><path d="M26 29h12"/><path d="M26 23v-9a3 3 0 0 1 3-3h8l7 7v5"/><path d="M37 11v6h7"/><path d="M29.5 17.5l2.7 2.7 4.3-5"/></G64>, // proposals · ballot + approved paper
  kycRail: (p: GlyphProps) => <G64 {...p}><rect x="18" y="8" width="28" height="18" rx="3"/><circle cx="26" cy="15" r="2.6"/><path d="M22.5 21.5a3.6 3.6 0 0 1 7 0"/><path d="M36 13h7M36 18h5"/><path d="M8 46h48"/><circle cx="14" cy="46" r="4" fill="currentColor" stroke="none"/><circle cx="28" cy="46" r="4" fill="currentColor" stroke="none"/><circle cx="42" cy="46" r="4"/><circle cx="56" cy="46" r="4"/></G64>, // KYC rail · filled = done
  fairnessChain: (p: GlyphProps) => <G64 {...p}><circle cx="13" cy="34" r="8"/><circle cx="32" cy="34" r="8"/><circle cx="51" cy="34" r="8"/><path d="M21 34h3M40 34h3"/><path d="M28.5 34l2.5 2.5 4.5-5"/><path d="M32 23v-4"/></G64>, // provably-fair · two-officer chain
  rgSelfCare: (p: GlyphProps) => <G64 {...p}><path d="M8 46h48"/><path d="M20 46a12 12 0 0 1 24 0"/><path d="M32 24v-7M17.5 29.5l-5-5M46.5 29.5l5-5M12 38H5M59 38h-7"/></G64>, // RG · sunrise, calm
  adminGeneric: (p: GlyphProps) => <G64 {...p}><rect x="16" y="9" width="28" height="44" rx="4"/><rect x="24" y="5" width="12" height="7" rx="2.5"/><path d="M22 22h16M22 30h16M22 38h9"/><circle cx="43" cy="43" r="7.5"/><path d="M48.5 48.5l6.5 6.5"/></G64>, // admin · nothing to review
};
