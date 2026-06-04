/**
 * Achievement badge line-art icons + metadata.
 * Same line-art language as EmptyState: viewBox 0 0 56 56, stroke=currentColor
 * (the coin tints it gilt / ghosted), single --gold-400 accent via the
 * `.badge-gold-accent` class so the locked state can desaturate it.
 * Ported from Claude Design's svg-badges.js → React.
 */
import type { ReactNode } from "react";

export type AchievementId =
  | "first-prediction" | "first-win" | "sharp" | "market-maker" | "connector" | "verified"
  | "hot-streak" | "oracle" | "high-roller" | "day-one" | "default";

const wrap = (inner: ReactNode): ReactNode => (
  <svg viewBox="0 0 56 56" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {inner}
  </svg>
);

const gold = "var(--gold-400)";

export const BADGE_ICONS: Record<AchievementId, ReactNode> = {
  "first-prediction": wrap(<>
    <circle cx="28" cy="28" r="18" />
    <line x1="20" y1="12" x2="36" y2="44" />
    <circle className="badge-gold-accent" cx="28" cy="28" r="2.4" stroke="none" fill={gold} />
  </>),
  "first-win": wrap(<>
    <circle cx="28" cy="23" r="13" />
    <path className="badge-gold-accent" d="M22 23 l4.5 5 l9 -11" stroke={gold} />
    <line x1="23" y1="35" x2="20" y2="47" />
    <line x1="33" y1="35" x2="36" y2="47" />
    <line x1="20" y1="47" x2="28" y2="42" />
    <line x1="36" y1="47" x2="28" y2="42" />
  </>),
  "sharp": wrap(<>
    <circle cx="28" cy="28" r="18" />
    <circle cx="28" cy="28" r="10.5" />
    <line x1="28" y1="6" x2="28" y2="13" />
    <line x1="28" y1="43" x2="28" y2="50" />
    <line x1="6" y1="28" x2="13" y2="28" />
    <line x1="43" y1="28" x2="50" y2="28" />
    <circle className="badge-gold-accent" cx="28" cy="28" r="3" stroke="none" fill={gold} />
  </>),
  "market-maker": wrap(<>
    <g transform="rotate(-32 28 26)">
      <rect x="15" y="11" width="23" height="9" rx="2.5" />
      <line x1="26.5" y1="20" x2="26.5" y2="41" />
    </g>
    <line className="badge-gold-accent" x1="13" y1="47" x2="40" y2="47" stroke={gold} />
  </>),
  "connector": wrap(<>
    <line x1="18" y1="20" x2="38" y2="20" />
    <line x1="19" y1="23" x2="26" y2="38" />
    <line x1="37" y1="23" x2="30" y2="38" />
    <circle cx="16" cy="19" r="4.5" />
    <circle cx="28" cy="41" r="4.5" />
    <circle className="badge-gold-accent" cx="40" cy="19" r="4.5" stroke={gold} />
  </>),
  "verified": wrap(<>
    <path d="M28 7 L44 13 V27 C44 37 37 44 28 48 C19 44 12 37 12 27 V13 Z" />
    <path className="badge-gold-accent" d="M21 27 l5 6 l11 -13" stroke={gold} />
  </>),
  "hot-streak": wrap(<>
    <path d="M16 40 L28 30 L40 40" />
    <path d="M16 31 L28 21 L40 31" />
    <path className="badge-gold-accent" d="M16 22 L28 12 L40 22" stroke={gold} />
  </>),
  "oracle": wrap(<>
    <path d="M9 28 Q28 13 47 28 Q28 43 9 28 Z" />
    <circle cx="28" cy="28" r="6" />
    <circle className="badge-gold-accent" cx="28" cy="28" r="2.4" stroke="none" fill={gold} />
  </>),
  "high-roller": wrap(<>
    <ellipse cx="28" cy="40" rx="13" ry="4.5" />
    <ellipse cx="28" cy="32" rx="13" ry="4.5" />
    <line x1="15" y1="32" x2="15" y2="40" />
    <line x1="41" y1="32" x2="41" y2="40" />
    <ellipse className="badge-gold-accent" cx="28" cy="22" rx="13" ry="4.5" stroke={gold} />
  </>),
  "day-one": wrap(<>
    <line x1="9" y1="39" x2="47" y2="39" />
    <path className="badge-gold-accent" d="M18 39 A10 10 0 0 1 38 39" stroke={gold} />
    <line x1="28" y1="14" x2="28" y2="19" />
    <line x1="14" y1="22" x2="17" y2="25" />
    <line x1="42" y1="22" x2="39" y2="25" />
  </>),
  "default": wrap(<>
    <circle cx="28" cy="28" r="18" />
    <path d="M22 24 q6 -8 12 0" />
    <circle className="badge-gold-accent" cx="38" cy="20" r="2.2" stroke="none" fill={gold} />
  </>),
};

/** Display metadata — names are bilingual (EN · SW); `ship` = in the first release. */
export type AchievementMeta = {
  id: AchievementId;
  name: string;
  nameSw: string;
  cond: string;
  condSw: string;
  rarity: string;
  ship: boolean;
  tiered?: boolean;
};

export const ACHIEVEMENTS: AchievementMeta[] = [
  { id: "first-prediction", name: "First Prediction", nameSw: "Ubashiri wa Kwanza", cond: "Place your first prediction.", condSw: "Weka ubashiri wako wa kwanza.", rarity: "Common", ship: true },
  { id: "first-win", name: "First Win", nameSw: "Ushindi wa Kwanza", cond: "Win your first settled market.", condSw: "Shinda soko lako la kwanza.", rarity: "Common", ship: true },
  { id: "sharp", name: "Sharp", nameSw: "Mahiri", cond: "≥ 60% accuracy over ≥ 20 settled predictions.", condSw: "Usahihi ≥ 60% kwa ubashiri ≥ 20.", rarity: "Rare · skill", ship: true },
  { id: "market-maker", name: "Market Maker", nameSw: "Mtengeneza Soko", cond: "A proposal you wrote gets listed.", condSw: "Pendekezo lako limeorodheshwa.", rarity: "Uncommon", ship: true },
  { id: "connector", name: "Connector", nameSw: "Mwunganishi", cond: "Refer friends — tiers at 1 · 5 · 25.", condSw: "Alika marafiki — 1 · 5 · 25.", rarity: "Tiered", ship: true, tiered: true },
  { id: "verified", name: "Verified", nameSw: "Umethibitishwa", cond: "Complete KYC identity verification.", condSw: "Kamilisha uthibitishaji wa KYC.", rarity: "Utility", ship: true },
  { id: "hot-streak", name: "Hot Streak", nameSw: "Mfululizo", cond: "Win N predictions in a row.", condSw: "Shinda ubashiri N mfululizo.", rarity: "Rare", ship: false },
  { id: "oracle", name: "Oracle", nameSw: "Nabii", cond: "A market you proposed resolves correctly.", condSw: "Soko ulilopendekeza limetatuliwa sawa.", rarity: "Rare", ship: false },
  { id: "high-roller", name: "High Roller", nameSw: "Mchezaji Mkubwa", cond: "Reach a cumulative stake milestone.", condSw: "Fikia kiwango cha jumla ya dau.", rarity: "Uncommon", ship: false },
  { id: "day-one", name: "Day One", nameSw: "Siku ya Kwanza", cond: "Joined during the launch window.", condSw: "Ulijiunga wakati wa uzinduzi.", rarity: "Collectible", ship: false },
];
