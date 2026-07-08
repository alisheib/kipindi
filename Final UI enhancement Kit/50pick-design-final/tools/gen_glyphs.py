#!/usr/bin/env python3
# 50pick glyph kit generator — one source of truth, two outputs:
#   glyphs-additions.tsx  (drop-in React components, G wrapper idiom)
#   50pick-glyph-kit.html (visual specimen sheet + tag anatomy)
import html as H

# ---- 24-grid glyphs: (name, category, inner_svg, note) -----------------
G24 = [
# — Controlled Poll (specs from glyph-reference-for-design.md) —
("calendarClock","poll",'<path d="M21 7.8V6.5A2.5 2.5 0 0 0 18.5 4h-13A2.5 2.5 0 0 0 3 6.5v12A2.5 2.5 0 0 0 5.5 21H8"/><path d="M16 2.5v4M8 2.5v4M3 9.5h5.5"/><circle cx="16" cy="16" r="5.6"/><path d="M16 13.5V16l2 1.5"/>',"date+time pickers"),
("hourglassHalf","poll",'<path d="M6 2.5h12M6 21.5h12"/><path d="M7.5 2.5v3.7a2 2 0 0 0 .59 1.42L12 12l3.91-4.38A2 2 0 0 0 16.5 6.2V2.5"/><path d="M16.5 21.5v-3.7a2 2 0 0 0-.59-1.42L12 12l-3.91 4.38a2 2 0 0 0-.59 1.42v3.7"/><path d="M9.6 19.7h4.8L12 17z" fill="currentColor" stroke="none"/><circle cx="12" cy="14.6" r=".8" fill="currentColor" stroke="none"/>',"closing-soon countdown"),
("hourglassOff","poll",'<path d="M6 2.5h12M6 21.5h12"/><path d="M7.5 2.5v3.7a2 2 0 0 0 .59 1.42L12 12l3.91-4.38A2 2 0 0 0 16.5 6.2V2.5"/><path d="M16.5 21.5v-3.7a2 2 0 0 0-.59-1.42L12 12l-3.91 4.38a2 2 0 0 0-.59 1.42v3.7"/><path d="M4 4l16 16"/>',"selection closed · waiting"),
("target","poll",'<circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/>',"controlled-poll mode"),
("sliders","poll",'<path d="M3.5 6h8.5M16.5 6h4M3.5 12h3M11 12h9.5M3.5 18h11M19 18h1.5"/><path d="M14 3.8v4.4M8.5 9.8v4.4M16.5 15.8v4.4"/>',"advanced config"),
("calendarRange","poll",'<rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/><circle cx="8" cy="13.5" r="1.4" fill="currentColor" stroke="none"/><circle cx="16" cy="17" r="1.4" fill="currentColor" stroke="none"/><path d="M9.4 14.1l5.2 2.3" stroke-width="1.3"/>',"close→resolve span"),
("gauge","poll",'<path d="M4 16a8 8 0 0 1 16 0"/><path d="M12 16l4.2-4.2"/><circle cx="12" cy="16" r="1.4" fill="currentColor" stroke="none"/><path d="M4 16h1.6M18.4 16H20"/>',"confidence / quality"),
("shuffle","poll",'<path d="M2.5 18h1.6c1.3 0 2.5-.6 3.2-1.7l6.4-8.6c.8-1.1 2-1.7 3.3-1.7h4.5"/><path d="M17.5 2l4 4-4 4"/><path d="M2.5 6h2c1.5 0 2.9.8 3.6 2.1"/><path d="M21.5 18h-5.5c-1.3 0-2.6-.7-3.3-1.8l-.6-.8"/><path d="M17.5 14l4 4-4 4"/>',"mixed categories"),
("circleStop","poll",'<circle cx="12" cy="12" r="8.6"/><rect x="9" y="9" width="6" height="6" rx="1"/>',"force-stop sentinel"),
("timerReset","poll",'<path d="M10 2.5h4"/><path d="M4.5 13a7.7 7.7 0 0 1 7.7-6.7 7.7 7.7 0 1 1-5.1 13.5L4.5 17.6"/><path d="M9 17.2H4.5v4.5"/><path d="M12.2 14v-3.8"/>',"sentinel timer reset"),
("listFilter","poll",'<path d="M3.5 6h13M3.5 12h9M3.5 18h5.5"/><path d="M15 11.5h6.5L19 14.8v4.4l-1.5-1.2v-3.2z"/>',"filtered poll state"),
("stepForward","poll",'<path d="M6.5 5.2 15.6 12l-9.1 6.8z" fill="currentColor" stroke="none"/><path d="M18.5 5v14"/>',"run now"),
# — Payments & money —
("cardPay","pay",'<rect x="2.5" y="5.5" width="19" height="13" rx="2.5"/><path d="M2.5 10h19M6 15h4"/>',"card provider tile"),
("bank","pay",'<path d="M12 3 3.5 8.5h17z"/><path d="M5.5 12v6.5M10 12v6.5M14 12v6.5M18.5 12v6.5"/><path d="M3.5 21h17"/>',"bank tile · landmark redraw"),
("mobileMoney","pay",'<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><circle cx="12" cy="12" r="3.1"/><path d="M12 10.6v2.8M10.5 5.5h3"/>',"generic MNO fallback"),
("cashOut","pay",'<rect x="2.5" y="7" width="12.5" height="10" rx="2"/><circle cx="8.75" cy="12" r="2.2"/><path d="M17 12h4.5M19.4 9.7l2.3 2.3-2.3 2.3"/>',"withdraw / payout"),
("cashback","pay",'<circle cx="13" cy="13.5" r="5.2"/><path d="M13 11.6v3.8"/><path d="M3.5 4.5V9H8"/><path d="M3.8 8.8A9.2 9.2 0 0 1 12.6 4.4"/>',"cash-back bonus"),
("percent","pay",'<path d="M18.5 5.5l-13 13"/><circle cx="7.3" cy="7.3" r="2.7"/><circle cx="16.7" cy="16.7" r="2.7"/>',"REDRAW · heavier at 12px"),
# — Source of funds —
("sofSalary","sof",'<rect x="3.5" y="8" width="17" height="11.5" rx="2.2"/><path d="M9 8V6.2A2.2 2.2 0 0 1 11.2 4h1.6A2.2 2.2 0 0 1 15 6.2V8"/><circle cx="12" cy="13.7" r="1.3" fill="currentColor" stroke="none"/>',"salary / employment"),
("sofBusiness","sof",'<path d="M5 9 6 4.5h12L19 9M4 9h16"/><path d="M5.5 9v10.5h13V9"/><path d="M10.3 19.5V14h3.4v5.5"/>',"business income"),
("sofSavings","sof",'<path d="M6.5 6.5h11"/><path d="M8.5 6.5V4.5h7v2"/><path d="M6.5 6.5v9.8a4.2 4.2 0 0 0 4.2 4.2h2.6a4.2 4.2 0 0 0 4.2-4.2V6.5"/><circle cx="12" cy="13.8" r="1.3" fill="currentColor" stroke="none"/>',"savings"),
("sofInvestment","sof",'<path d="M3.5 4v16.5H21"/><path d="M6.5 15.5l4-4.5 3 2.6 5.5-6.6"/><path d="M15.7 7h3.4v3.4"/>',"investment returns"),
("sofGift","sof",'<rect x="4.5" y="11.5" width="15" height="10" rx="1.5"/><rect x="3.5" y="8" width="17" height="3.5" rx="1"/><path d="M12 8v13.5"/><path d="M12 8c-1.6-3.4-5.9-3.3-5.9-1.1S10 9.4 12 8zM12 8c1.6-3.4 5.9-3.3 5.9-1.1S14 9.4 12 8z"/>',"gift / family support"),
# — Devices & sessions —
("devicePhone","dev",'<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M10.8 18.5h2.4"/>',"phone session"),
("deviceDesktop","dev",'<rect x="2.5" y="4" width="19" height="13" rx="2"/><path d="M12 17v3.5M8 20.5h8"/>',"desktop session"),
("deviceTablet","dev",'<rect x="4.5" y="2.5" width="15" height="19" rx="2.5"/><circle cx="12" cy="18.6" r=".9" fill="currentColor" stroke="none"/>',"tablet session"),
# — Help / FAQ / support —
("compass","faq",'<circle cx="12" cy="12" r="8.6"/><path d="M15 9l-1.8 4.2L9 15l1.8-4.2z"/>',"getting started"),
("idCard","faq",'<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><circle cx="8" cy="10.3" r="1.9"/><path d="M5.2 15.6a2.9 2.9 0 0 1 5.6 0"/><path d="M13.8 9.5h5M13.8 12.5h5M13.8 15.5h3"/>',"KYC / identity"),
("headset","faq",'<path d="M4.5 14v-2a7.5 7.5 0 0 1 15 0v2"/><rect x="3" y="13" width="3.8" height="6" rx="1.7"/><rect x="17.2" y="13" width="3.8" height="6" rx="1.7"/><path d="M19.1 19v.6a2.4 2.4 0 0 1-2.4 2.4h-3.2"/>',"contact support"),
("questionCircle","faq",'<circle cx="12" cy="12" r="8.6"/><path d="M9.5 9.3a2.6 2.6 0 0 1 5.1.6c0 1.7-2.6 2.1-2.6 3.6"/><circle cx="12" cy="16.8" r=".9" fill="currentColor" stroke="none"/>',"general question"),
# — Status / tags —
("sealCheck","tag",'<circle cx="12" cy="12" r="8.6"/><path d="M8 12.4l2.7 2.7 5.3-6"/>',"resolved seal"),
("voidX","tag",'<circle cx="12" cy="12" r="8.6"/><path d="M8.8 8.8l6.4 6.4M15.2 8.8l-6.4 6.4"/>',"voided market"),
("clockPending","tag",'<circle cx="12" cy="12" r="8.6" stroke-dasharray="3.4 3"/><path d="M12 7.5V12l3 2"/>',"pending / provisional"),
("lockSide","tag",'<rect x="5" y="10.5" width="14" height="10" rx="2.2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/><circle cx="12" cy="15.5" r="1.2" fill="currentColor" stroke="none"/>',"locked side / KYC gate"),
("sparkleNew","tag",'<path d="M12 4l1.7 4.3L18 10l-4.3 1.7L12 16l-1.7-4.3L6 10l4.3-1.7z"/><path d="M18.5 15.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" stroke-width="1.4"/>',"new market"),
("flame","tag",'<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',"hot"),
("tippingScales","tag",'<path d="M12 3.5v17M8 20.5h8"/><path d="M5 8.5l14-2.4"/><path d="M5 8.5l-2.2 4.3a2.6 2.6 0 0 0 4.4 0zM19 6.1l-2.2 4.3a2.6 2.6 0 0 0 4.4 0z" stroke-width="1.6"/>',"tipping · near 50/50"),
("podium","tag",'<path d="M3.5 20.5h17"/><path d="M9 20.5V9h6v11.5"/><path d="M3.5 20.5v-6H9M20.5 20.5v-4.5H15"/>',"leaderboard"),
# — System —
("qr","sys",'<rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1"/><rect x="14" y="3.5" width="6.5" height="6.5" rx="1"/><rect x="3.5" y="14" width="6.5" height="6.5" rx="1"/><path d="M14 14h3v3h-3zM20.5 14v3.2M14 20.5h3.2M20 20.3l.01.01"/>',"invite share QR"),
("wifiOff","sys",'<path d="M8.5 13.2a6.3 6.3 0 0 1 7 0"/><path d="M5 10a10.6 10.6 0 0 1 4.2-2.3M14.8 7.7A10.6 10.6 0 0 1 19 10"/><circle cx="12" cy="17.2" r="1" fill="currentColor" stroke="none"/><path d="M4 4l16 16"/>',"offline route"),
("activity","sys",'<path d="M2.5 12h4L9.2 5.5l5.6 13L17.5 12h4"/>',"REDRAW · peaks kept in box"),
# — Utility (micro-detail pass) —
("copy","util",'<rect x="8.5" y="8.5" width="12" height="12" rx="2.2"/><path d="M5.5 15.5h-1A1.5 1.5 0 0 1 3 14V4.5A1.5 1.5 0 0 1 4.5 3H14a1.5 1.5 0 0 1 1.5 1.5v1"/>',"copy code / reference"),
("externalLink","util",'<path d="M13.5 5H6.5A2.5 2.5 0 0 0 4 7.5v10A2.5 2.5 0 0 0 6.5 20h10a2.5 2.5 0 0 0 2.5-2.5v-7"/><path d="M13 11 20.5 3.5M15 3.5h5.5V9"/>',"source link"),
("sortAsc","util",'<path d="M4 7h9M4 12h6.5M4 17h4"/><path d="M17.5 17V7M14.5 10l3-3 3 3"/>',"sort ascending"),
("sortDesc","util",'<path d="M4 7h4M4 12h6.5M4 17h9"/><path d="M17.5 7v10M14.5 14l3 3 3-3"/>',"sort descending"),
("dragHandle","util",'<circle cx="9" cy="6" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="6" r="1.3" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="18" r="1.3" fill="currentColor" stroke="none"/>',"reorder"),
("csvExport","util",'<path d="M13.5 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5z"/><path d="M13.5 3v5.5H19"/><path d="M12 18.5v-6M9.2 15.3 12 12.5l2.8 2.8"/>',"export CSV"),
("ussd","util",'<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M9.9 9.9l4.2 4.2M14.1 9.9l-4.2 4.2M12 9v6M9.4 12h5.2" stroke-width="1.5"/>',"USSD deposit path"),
("simCard","util",'<path d="M14.5 3H7.5A2.5 2.5 0 0 0 5 5.5v13A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V7.5z"/><rect x="9" y="11" width="6" height="6.5" rx="1.3"/><path d="M12 11v6.5"/>',"SIM / MNO context"),
("attest","util",'<path d="M4.5 8.5 9 4l4 4-4.5 4.5z"/><path d="M11 10.5l8 8"/><path d="M13.5 21h6.5" stroke-width="1.7"/>',"officer attestation"),
("reconcile","util",'<path d="M12 4v16M8.5 20h7"/><path d="M5.5 8h13"/><path d="M5.5 8l-2 4a2.4 2.4 0 0 0 4 0zM18.5 8l-2 4a2.4 2.4 0 0 0 4 0z" stroke-width="1.6"/>',"ledger reconciliation"),
# — Category set (reference — chips + watermarks + home row) —
("catSports","cat",'<circle cx="12" cy="12" r="8.6"/><path d="M12 8.8L15.04 11.01L13.88 14.59L10.12 14.59L8.96 11.01Z"/><path d="M12 8.8V3.4M15.04 11.01L20.18 9.34M13.88 14.59L17.06 18.96M10.12 14.59L6.94 18.96M8.96 11.01L3.82 9.34"/>',"Sports · Michezo · 体育"),
("catMacro","cat",'<path d="M3.5 20.5h17"/><path d="M4.5 16.5l4.5-5 3 2.7 6.5-7.7"/><path d="M15.3 6h3.5v3.5"/>',"Macro · Uchumi · 宏观"),
("catWeather","cat",'<path d="M17 16.5H8a4 4 0 0 1-.6-7.95A5.5 5.5 0 0 1 18 7.6a4.2 4.2 0 0 1-1 8.9z"/><path d="M8.8 19.5v1.6M12.2 19.5v1.6M15.6 19.5v1.6"/>',"Weather · Hali ya hewa · 天气"),
("catCrypto","cat",'<circle cx="12" cy="12" r="8.6"/><path d="M9.8 8h3.4a2 2 0 0 1 0 4H9.8m0 0h4a2 2 0 0 1 0 4H9.8M9.8 8v8"/><path d="M11.5 6.3V8M13.5 16v1.7"/>',"Crypto · Kripto · 加密货币"),
("catCulture","cat",'<path d="M12 4l2.3 5 5.2.6-3.9 3.5 1.1 5.1L12 15.6 7.3 18.2l1.1-5.1L4.5 9.6 9.7 9z"/>',"Culture · Utamaduni · 文化"),
("catTech","cat",'<rect x="6.5" y="6.5" width="11" height="11" rx="2"/><rect x="10" y="10" width="4" height="4" rx="1"/><path d="M9 6.5v-3M15 6.5v-3M9 17.5v3M15 17.5v3M6.5 9h-3M6.5 15h-3M17.5 9h3M17.5 15h3"/>',"Tech · Teknolojia · 科技"),
("catForex","cat",'<path d="M4 8h13M14 4.8 17.2 8 14 11.2"/><path d="M20 16H7M10 12.8 6.8 16l3.2 19.2" />',"Forex · Fedha · 外汇"),
("catOther","cat",'<circle cx="5.5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="8.6"/>',"Other · Nyinginezo · 其他"),
]
# fix a typo in catForex path (second arrow)
G24 = [(n,c,(s.replace('l3.2 19.2','l3.2 3.2') if n=='catForex' else s),d) for n,c,s,d in G24]

# ---- 64-grid empty-state illustrations ---------------------------------
G64 = [
("emptyProposals",'<path d="M10 32l4-6h36l4 6"/><rect x="10" y="32" width="44" height="20" rx="4"/><path d="M26 29h12"/><path d="M26 23v-9a3 3 0 0 1 3-3h8l7 7v5"/><path d="M37 11v6h7"/><path d="M29.5 17.5l2.7 2.7 4.3-5"/>',"proposals · ballot + approved paper"),
("kycRail",'<rect x="18" y="8" width="28" height="18" rx="3"/><circle cx="26" cy="15" r="2.6"/><path d="M22.5 21.5a3.6 3.6 0 0 1 7 0"/><path d="M36 13h7M36 18h5"/><path d="M8 46h48"/><circle cx="14" cy="46" r="4" fill="currentColor" stroke="none"/><circle cx="28" cy="46" r="4" fill="currentColor" stroke="none"/><circle cx="42" cy="46" r="4"/><circle cx="56" cy="46" r="4"/>',"KYC rail · filled = done"),
("fairnessChain",'<circle cx="13" cy="34" r="8"/><circle cx="32" cy="34" r="8"/><circle cx="51" cy="34" r="8"/><path d="M21 34h3M40 34h3"/><path d="M28.5 34l2.5 2.5 4.5-5"/><path d="M32 23v-4"/>',"provably-fair · two-officer chain"),
("rgSelfCare",'<path d="M8 46h48"/><path d="M20 46a12 12 0 0 1 24 0"/><path d="M32 24v-7M17.5 29.5l-5-5M46.5 29.5l5-5M12 38H5M59 38h-7"/>',"RG · sunrise, calm"),
("adminGeneric",'<rect x="16" y="9" width="28" height="44" rx="4"/><rect x="24" y="5" width="12" height="7" rx="2.5"/><path d="M22 22h16M22 30h16M22 38h9"/><circle cx="43" cy="43" r="7.5"/><path d="M48.5 48.5l6.5 6.5"/>',"admin · nothing to review"),
]

def svg24(inner, size=24, color="currentColor"):
    return (f'<svg viewBox="0 0 24 24" width="{size}" height="{size}" fill="none" stroke="{color}" '
            f'stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{inner}</svg>')
def svg64(inner, size=64):
    return (f'<svg viewBox="0 0 64 64" width="{size}" height="{size}" fill="none" stroke="currentColor" '
            f'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{inner}</svg>')

# ---------------- TSX output ----------------
def to_jsx(s):
    # convert kebab attrs to camelCase for JSX
    for a,b in [("stroke-width","strokeWidth"),("stroke-linecap","strokeLinecap"),
                ("stroke-linejoin","strokeLinejoin"),("stroke-dasharray","strokeDasharray")]:
        s = s.replace(a,b)
    return s

tsx = ['''/* 50pick — glyph additions (Claude Design, 2026-07-07)
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

export const Iplus = {''']
cat_labels = {"poll":"Controlled Poll","pay":"Payments & money","sof":"Source of funds",
              "dev":"Devices & sessions","faq":"Help & support","tag":"Status & tags",
              "sys":"System","util":"Utility","cat":"Categories (reference)"}
last=None
for n,c,s,d in G24:
    if c!=last:
        tsx.append(f"\n  // ── {cat_labels[c]} ──")
        last=c
    tsx.append(f"  {n}: (p: GlyphProps) => <G {{...p}}>{to_jsx(s)}</G>, // {d}")
tsx.append("\n  // ── Empty-state illustrations (64-grid) ──")
for n,s,d in G64:
    tsx.append(f"  {n}: (p: GlyphProps) => <G64 {{...p}}>{to_jsx(s)}</G64>, // {d}")
tsx.append("};\n")
open("/home/claude/design-out/glyphs-additions.tsx","w").write("\n".join(tsx))

# ---------------- HTML specimen sheet ----------------
def cell(n,c,s,d):
    return f'''<div class="cell"><div class="pair"><span class="g24" style="color:#F5F8FF">{svg24(s,24)}</span><span class="g16" style="color:#C8CBCF">{svg24(s,15)}</span></div><div class="nm">{n}</div><div class="ds">{H.escape(d)}</div></div>'''

sections=[]
for key in ["poll","pay","sof","dev","faq","tag","sys","util","cat"]:
    cells="".join(cell(n,c,s,d) for n,c,s,d in G24 if c==key)
    sections.append(f'<section><div class="eyebrow">{cat_labels[key]}</div><div class="grid">{cells}</div></section>')

e64="".join(f'''<div class="cell big"><span style="color:#FEC766">{svg64(s,64)}</span><div class="nm">{n}</div><div class="ds">{H.escape(d)}</div></div>''' for n,s,d in G64)

def find(name): return next(s for n,c,s,d in G24 if n==name)
def chip(bg,bd,fg,glyph,en,sw,zh,extra=""):
    return (f'<span class="chip" style="background:{bg};border-color:{bd};color:{fg};{extra}">'
            f'{svg24(glyph,11)}<b>{en}</b><i>{sw} · {zh}</i></span>')

tags = "".join([
 chip("rgba(54,186,186,.08)","rgba(54,186,186,.35)","#36BABA",'<circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="8.6"/>',"LIVE","Moja kwa moja","进行中"),
 chip("rgba(230,66,76,.08)","rgba(230,66,76,.35)","#E6424C",find("flame"),"HOT","Inavuma","热门"),
 chip("rgba(254,199,102,.08)","rgba(254,199,102,.35)","#FEC766",find("hourglassHalf"),"ENDING SOON","Inakaribia","即将截止"),
 chip("rgba(54,186,186,.08)","rgba(54,186,186,.35)","#36BABA",find("tippingScales"),"TIPPING","Inayumba","势均力敌"),
 chip("linear-gradient(120deg,#FEC766,#D49824)","#B97F12","#1a1508",find("sealCheck"),"RESOLVED","Imetatuliwa","已结算"),
 chip("rgba(245,248,255,.04)","rgba(245,248,255,.14)","#C8CBCF",find("voidX"),"VOID","Imebatilishwa","已作废"),
 chip("rgba(245,248,255,.04)","rgba(245,248,255,.14)","#C8CBCF",find("clockPending"),"PENDING","Inasubiri","待定"),
 chip("rgba(245,248,255,.04)","rgba(245,248,255,.14)","#C8CBCF",find("hourglassOff"),"WAITING FOR RESULTS","Inasubiri matokeo","等待结果"),
 chip("rgba(245,248,255,.04)","rgba(245,248,255,.14)","#C8CBCF",find("lockSide"),"LOCKED","Imefungwa","已锁定"),
 chip("rgba(73,131,244,.10)","rgba(73,131,244,.4)","#6CA2FF",find("sparkleNew"),"NEW","Mpya","新"),
])
catchips = "".join(
 chip("rgba(73,131,244,.10)","rgba(73,131,244,.4)","#6CA2FF",s,d.split(" · ")[0],d.split(" · ")[1],d.split(" · ")[2])
 for n,c,s,d in G24 if c=="cat")

html_doc = f'''<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>50pick — Glyph &amp; Tag Kit (additions)</title>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
:root{{--canvas:#0A0E33;--panel:#131645;--gold:#D49824;--gold-l:#FEC766;--brand:#4983F4;--aqua:#36BABA;
--yes:#00A24F;--no:#E6424C;--ink:#F5F8FF;--muted:#C8CBCF;--border:rgba(245,248,255,.10)}}
*{{box-sizing:border-box;margin:0;padding:0}}
body{{background:var(--canvas);color:var(--ink);font-family:Inter,system-ui,sans-serif;padding:48px 32px 96px;
background-image:radial-gradient(1100px 520px at 85% -10%,rgba(6,10,80,.7),transparent)}}
.wrap{{max-width:1180px;margin:0 auto}}
h1{{font-family:Sora,sans-serif;font-weight:700;font-size:26px;letter-spacing:-.02em}}
.sub{{color:var(--muted);font-size:13.5px;margin-top:6px;max-width:80ch}}
section{{margin-top:48px}}
.eyebrow{{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--gold);display:flex;align-items:center;gap:10px;margin-bottom:16px}}
.eyebrow::after{{content:"";flex:1;height:1px;background:linear-gradient(90deg,rgba(212,152,36,.4),transparent)}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(168px,1fr));gap:12px}}
.cell{{background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:14px 12px 12px;text-align:center}}
.cell.big{{padding:22px 14px 14px}}
.pair{{display:flex;align-items:center;justify-content:center;gap:12px;height:34px}}
.nm{{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--ink);margin-top:8px}}
.ds{{font-size:10.5px;color:var(--muted);margin-top:2px;line-height:1.35}}
.chips{{display:flex;gap:10px;flex-wrap:wrap}}
.chip{{display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 11px;border-radius:999px;border:1px solid;
font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.06em}}
.chip b{{font-weight:600}} .chip i{{font-style:normal;opacity:.75;font-size:9px}}
.note{{color:var(--muted);font-size:12.5px;margin:-6px 0 14px;max-width:80ch}}
.footer{{margin-top:56px;border-top:1px solid rgba(245,248,255,.06);padding-top:16px;color:var(--muted);font-size:11.5px;font-family:'JetBrains Mono',monospace}}
</style></head><body><div class="wrap">
<h1>50pick — Glyph &amp; Tag Kit · additions</h1>
<p class="sub">Everything the master brief (§4a/§4c/§4e) and the glyph reference name as missing, in the house idiom: 24×24 grid, 1.9&nbsp;px stroke, round caps/joins, currentColor, filled accents only. Each glyph shown at 24&nbsp;px and 15&nbsp;px (small-size legibility check). Copy-ready React components in <b>glyphs-additions.tsx</b> — generated from the same source, so the two can't diverge. MNO brand marks are deliberately absent: source official assets; these glyphs cover everything in-house.</p>

<section><div class="eyebrow">Tag anatomy — every chip form, EN · SW · ZH</div>
<p class="note">Status chips with their glyphs. Colour discipline: aqua = live, rose = hot, gold reserved for the resolved (earned) seal and pre-close urgency, royal = new/selected, neutral = administrative states. SW strings shown are the longest forms — nothing truncates.</p>
<div class="chips">{tags}</div>
<p class="note" style="margin-top:16px">Category chips (topic filter, royal = selectable/nav):</p>
<div class="chips">{catchips}</div>
</section>

{"".join(sections)}

<section><div class="eyebrow">Empty-state illustrations — 64-grid, gilt line-art</div>
<p class="note">The five kinds the brief adds (§4e). Shown in gilt #FEC766 as they render inside EmptyState; they inherit currentColor. No text baked in — captions live in HTML, trilingual.</p>
<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">{e64}</div>
</section>

<div class="footer">50pick glyph additions · 59 glyphs + 5 illustrations · pairs with glyphs-additions.tsx · redraws included: percent, activity, landmark(bank) · no emojis, no mascots, no baked-in text</div>
</div></body></html>'''
open("/home/claude/design-out/50pick-glyph-kit.html","w").write(html_doc)
print("wrote tsx:", len("\n".join(tsx)), "chars · html:", len(html_doc), "chars")
