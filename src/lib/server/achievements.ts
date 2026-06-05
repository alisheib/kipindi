/**
 * Achievement shelf — DERIVES the player's badge states from facts we already
 * store (positions, KYC, referrals, proposals). No separate tracking engine:
 * each badge is computed at render time from the source of truth. The 4
 * coming-soon badges (hot-streak/oracle/high-roller/day-one) are not shown yet.
 */
import { db } from "./store";
import { listPositionsForUser } from "./market-service";
import { getPlayerReferralSummary } from "./affiliate-service";
import type { AchievementId } from "@/components/badges/icons";

export type ShelfItem = {
  achievement: AchievementId;
  state: "locked" | "unlocked" | "progress";
  progress?: { value: number; max: number; tier?: string };
  title: string;
};

export function computeAchievementShelf(userId: string): ShelfItem[] {
  const positions = listPositionsForUser(userId, 500);
  const settled = positions.filter((p) => p.status === "WIN" || p.status === "LOSS");
  const wins = positions.filter((p) => p.status === "WIN").length;
  const hasBet = positions.length > 0;

  const kyc = db.kyc.findByUserId(userId);
  const verified = kyc?.status === "APPROVED";

  // Defensive: never let the referral lookup crash the whole shelf render.
  let recruits = 0;
  try { recruits = getPlayerReferralSummary(userId).recruitCount; } catch { recruits = 0; }
  const listed = db.proposal.listByProposer(userId).some((p) => p.status === "LISTED" || p.status === "RESOLVED");

  // Connector — tiered 1 · 5 · 25.
  const connTier = recruits >= 25 ? "III" : recruits >= 5 ? "II" : recruits >= 1 ? "I" : null;
  const connNext = recruits >= 5 ? 25 : recruits >= 1 ? 5 : 1;

  // Sharp — ≥60% accuracy over ≥20 settled.
  const acc = settled.length ? wins / settled.length : 0;
  const sharpUnlocked = settled.length >= 20 && acc >= 0.6;

  return [
    { achievement: "first-prediction", title: "First Prediction · Ubashiri wa Kwanza", state: hasBet ? "unlocked" : "locked" },
    { achievement: "first-win", title: "First Win · Ushindi wa Kwanza", state: wins > 0 ? "unlocked" : "locked" },
    { achievement: "verified", title: "Verified · Umethibitishwa", state: verified ? "unlocked" : "locked" },
    { achievement: "market-maker", title: "Market Maker · Mtengeneza Soko", state: listed ? "unlocked" : "locked" },
    {
      achievement: "connector",
      title: "Connector · Mwunganishi",
      state: recruits >= 25 ? "unlocked" : recruits >= 1 ? "progress" : "locked",
      progress: recruits >= 1 && recruits < 25 ? { value: recruits, max: connNext, tier: connTier ?? undefined } : undefined,
    },
    {
      achievement: "sharp",
      title: "Sharp · Mahiri",
      state: sharpUnlocked ? "unlocked" : settled.length > 0 ? "progress" : "locked",
      progress: !sharpUnlocked && settled.length > 0 ? { value: Math.min(settled.length, 20), max: 20 } : undefined,
    },
  ];
}
