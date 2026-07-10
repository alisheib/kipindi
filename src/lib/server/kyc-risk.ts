/**
 * ADM3 — KYC/AML risk scoring (Batch 3 §3).
 *
 * A real, explainable risk score (0–100) derived ONLY from live signals — no
 * fabricated numbers. Every point is attributed to a named factor the officer
 * can see. Approvals at or above KYC_MAKER_CHECKER_THRESHOLD require a second
 * officer (maker-checker), enforced in the workstation actions.
 *
 * We deliberately DON'T invent a sanctions/PEP score or a document-liveness
 * score — those feeds don't exist yet, so they stay as officer-judgment
 * checklist items rather than fake meter points.
 */
import { db } from "./store";
import { getAuditPage } from "./audit";

export const KYC_MAKER_CHECKER_THRESHOLD = 70;
const AML_THRESHOLD_TZS = 1_000_000;

export type RiskFactor = { label: string; points: number; detail: string };
export type KycRisk = { score: number; band: "low" | "medium" | "high"; factors: RiskFactor[] };

export async function kycRiskScore(userId: string): Promise<KycRisk> {
  const factors: RiskFactor[] = [];
  const now = Date.now();
  const user = await db.user.findById(userId);
  const txns = (await db.txn.listAll()).filter((t) => t.userId === userId);
  const confirmed = txns.filter((t) => t.status === "CONFIRMED");

  // 1 · Large withdrawals over the AML reporting threshold.
  const bigWd = confirmed.filter((t) => t.type === "WITHDRAWAL" && Math.abs(t.amount) >= AML_THRESHOLD_TZS);
  if (bigWd.length) factors.push({ label: "Large withdrawals", points: Math.min(30, bigWd.length * 15), detail: `${bigWd.length} ≥ TZS ${AML_THRESHOLD_TZS.toLocaleString()}` });

  // 2 · Transactions already held for AML review.
  const amlTxns = txns.filter((t) => t.status === "AML_REVIEW");
  if (amlTxns.length) factors.push({ label: "AML-held transactions", points: Math.min(30, amlTxns.length * 20), detail: `${amlTxns.length} awaiting AML clearance` });

  // 3 · Rapid deposit velocity (structuring signal).
  const dep24 = confirmed.filter((t) => t.type === "DEPOSIT" && Date.parse(t.createdAt) >= now - 24 * 3600_000);
  if (dep24.length >= 5) factors.push({ label: "Rapid deposits", points: Math.min(20, (dep24.length - 4) * 5), detail: `${dep24.length} deposits in 24h` });

  // 4 · Brand-new account.
  if (user && Date.parse(user.createdAt) >= now - 3 * 24 * 3600_000) {
    factors.push({ label: "New account", points: 10, detail: "opened < 3 days ago" });
  }

  // 5 · Source-of-funds missing despite large cumulative deposits.
  const totalDeposits = confirmed.filter((t) => t.type === "DEPOSIT").reduce((s, t) => s + t.amount, 0);
  const sof = await Promise.resolve(db.sourceOfFunds.get(userId)).catch(() => null);
  if (totalDeposits >= 5_000_000 && !sof) {
    factors.push({ label: "No source-of-funds", points: 15, detail: `TZS ${totalDeposits.toLocaleString()} deposited, SoF not on file` });
  }

  const score = Math.min(100, factors.reduce((s, f) => s + f.points, 0));
  const band: KycRisk["band"] = score >= KYC_MAKER_CHECKER_THRESHOLD ? "high" : score >= 40 ? "medium" : "low";
  return { score, band, factors };
}

/** Audit-derived approval recommendation (maker) for the high-risk two-officer
 *  path. Returns the recommender + when, if a live recommendation exists that
 *  is newer than the last decision reset. */
export async function getApprovalRecommendation(userId: string): Promise<{ officerId: string; officerName: string | null; at: string } | null> {
  const events = getAuditPage({ category: "COMPLIANCE", limit: 10000 }).filter(
    (e) => e.targetId === userId && (e.action === "kyc.approve.recommended" || e.action === "kyc.approve.recommendation_cleared"),
  );
  const latest = events[0]; // newest-first
  if (!latest || latest.action !== "kyc.approve.recommended" || !latest.actorId) return null;
  const u = await db.user.findById(latest.actorId);
  return { officerId: latest.actorId, officerName: u?.displayName?.trim() || latest.actorId, at: latest.createdAt };
}
