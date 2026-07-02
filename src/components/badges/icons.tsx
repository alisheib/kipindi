/**
 * Achievement badge line-art icons + metadata — heraldic engraved medal language.
 * viewBox 0 0 56 56, stroke=currentColor, 2.2px, round caps/joins.
 * Single gold accent per badge via `.badge-gold-accent` (desaturates when locked).
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
  /* Viewfinder locking onto the point — your first committed call. */
  "first-prediction": wrap(<>
    <path d="M19 10 H15 Q10 10 10 15 V19" />
    <path d="M37 10 H41 Q46 10 46 15 V19" />
    <path d="M19 46 H15 Q10 46 10 41 V37" />
    <path d="M37 46 H41 Q46 46 46 41 V37" />
    <line x1="28" y1="19" x2="28" y2="24" />
    <line x1="28" y1="32" x2="28" y2="37" />
    <line x1="19" y1="28" x2="24" y2="28" />
    <line x1="32" y1="28" x2="37" y2="28" />
    <circle className="badge-gold-accent" cx="28" cy="28" r="2.6" stroke="none" fill={gold} />
  </>),
  /* Open laurel wreath, gilt check at its heart. */
  "first-win": wrap(<>
    <path d="M21 46 Q13 38 13 26 Q13 18 17 12" />
    <path d="M14 36 q-6 -1 -8 -6" />
    <path d="M13 27 q-6 -2 -7 -7" />
    <path d="M15 19 q-5 -3 -5 -8" />
    <path d="M35 46 Q43 38 43 26 Q43 18 39 12" />
    <path d="M42 36 q6 -1 8 -6" />
    <path d="M43 27 q6 -2 7 -7" />
    <path d="M41 19 q5 -3 5 -8" />
    <path className="badge-gold-accent" d="M21 28 l5.5 6 L36 21" stroke={gold} />
  </>),
  /* Precision sight — trued rings, balanced ticks, gilt bullseye. */
  "sharp": wrap(<>
    <circle cx="28" cy="28" r="17" />
    <circle cx="28" cy="28" r="10.5" />
    <line x1="28" y1="6" x2="28" y2="12" />
    <line x1="28" y1="44" x2="28" y2="50" />
    <line x1="6" y1="28" x2="12" y2="28" />
    <line x1="44" y1="28" x2="50" y2="28" />
    <circle className="badge-gold-accent" cx="28" cy="28" r="2.6" stroke="none" fill={gold} />
  </>),
  /* Banded gavel over a gilt sounding block. */
  "market-maker": wrap(<>
    <g transform="rotate(-35 26 20)">
      <rect x="14" y="14" width="24" height="11" rx="3" />
      <line x1="19" y1="14" x2="19" y2="25" />
      <line x1="33" y1="14" x2="33" y2="25" />
      <line x1="26" y1="25" x2="26" y2="45" />
    </g>
    <line className="badge-gold-accent" x1="13" y1="48" x2="37" y2="48" stroke={gold} />
  </>),
  /* Constellation — the network you brought in; newest node gilt. */
  "connector": wrap(<>
    <line x1="19.5" y1="18.4" x2="37.5" y2="15.6" />
    <line x1="16.7" y1="23.3" x2="20.5" y2="36.6" />
    <line x1="26.5" y1="40.6" x2="38.9" y2="39.4" />
    <line x1="41.2" y1="18.5" x2="41.9" y2="35.9" />
    <circle cx="15" cy="19" r="4.5" />
    <circle cx="41" cy="15" r="3.5" />
    <circle cx="22" cy="41" r="4.5" />
    <circle className="badge-gold-accent" cx="42" cy="39" r="3" stroke="none" fill={gold} />
  </>),
  /* Double-walled heater shield, gilt check. */
  "verified": wrap(<>
    <path d="M28 7 L45 13 V26 C45 37 38 44.5 28 49 C18 44.5 11 37 11 26 V13 Z" />
    <path d="M28 12 L40.5 16.5 V26 C40.5 34.5 35.5 40.5 28 44 C20.5 40.5 15.5 34.5 15.5 26 V16.5 Z" />
    <path className="badge-gold-accent" d="M21 27.5 l5 6 L36 20.5" stroke={gold} />
  </>),
  /* Engraved flame with a gilt core. */
  "hot-streak": wrap(<>
    <path d="M28 8 C33 15 41 21 41 31 A13 13 0 0 1 15 31 C15 21 23 15 28 8 Z" />
    <path className="badge-gold-accent" d="M28 26 C30.5 29.5 33 31.5 33 35 A5 5 0 0 1 23 35 C23 31.5 25.5 29.5 28 26 Z" stroke={gold} />
  </>),
  /* Radiant all-seeing eye, gilt pupil. */
  "oracle": wrap(<>
    <path d="M8 30 Q28 15 48 30 Q28 45 8 30 Z" />
    <circle cx="28" cy="30" r="6.5" />
    <circle className="badge-gold-accent" cx="28" cy="30" r="2.6" stroke="none" fill={gold} />
    <line x1="28" y1="7" x2="28" y2="12" />
    <line x1="17" y1="10" x2="19.5" y2="14.5" />
    <line x1="39" y1="10" x2="36.5" y2="14.5" />
    <line x1="9" y1="17" x2="13" y2="20" />
    <line x1="47" y1="17" x2="43" y2="20" />
  </>),
  /* Coin stack crowned in gilt. */
  "high-roller": wrap(<>
    <ellipse cx="28" cy="42" rx="13" ry="4.5" />
    <ellipse cx="28" cy="34" rx="13" ry="4.5" />
    <line x1="15" y1="34" x2="15" y2="42" />
    <line x1="41" y1="34" x2="41" y2="42" />
    <path className="badge-gold-accent" d="M19 25 V16 L24.5 20 L28 13 L31.5 20 L37 16 V25" stroke={gold} />
  </>),
  /* Gilt sun rising on the horizon — launch-window collectible. */
  "day-one": wrap(<>
    <line x1="9" y1="38" x2="47" y2="38" />
    <path className="badge-gold-accent" d="M19 38 A9 9 0 0 1 37 38" stroke={gold} />
    <line x1="28" y1="15" x2="28" y2="20" />
    <line x1="14.5" y1="20.5" x2="18" y2="24" />
    <line x1="41.5" y1="20.5" x2="38" y2="24" />
    <line x1="17" y1="44" x2="23" y2="44" />
    <line x1="33" y1="44" x2="39" y2="44" />
  </>),
  /* The needle at rest — simplified 50pick mark. */
  "default": wrap(<>
    <circle cx="28" cy="28" r="17" />
    <circle cx="28" cy="28" r="4.5" />
    <line className="badge-gold-accent" x1="17.5" y1="38.5" x2="24.8" y2="31.2" stroke={gold} />
    <line className="badge-gold-accent" x1="31.2" y1="24.8" x2="38.5" y2="17.5" stroke={gold} />
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
