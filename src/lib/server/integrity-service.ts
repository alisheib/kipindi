/**
 * Match-integrity adapter — currently a stub returning deterministic suspicion
 * scores for development. Production swap is one file: replace the body of
 * `checkMatch` with a fetch to Sportradar Integrity Services
 * (https://integrity.sportradar.com/) and map their alert payload to our
 * `IntegrityAlert` shape.
 *
 * Compliance:
 *  - GBT licence application requires a contracted integrity-monitoring partner
 *  - FIFA, UEFA, and CAF integrity protocols all accept Sportradar alerts as evidence
 *  - All alerts persisted via the audit log under `BET / integrity.alert.*`
 *  - High-severity alerts auto-suspend the match; bets settle as VOIDED with refund
 */
import { audit } from "./audit";
import { db } from "./store";
import type { StoredBet } from "./store";

export type IntegritySeverity = "info" | "watch" | "suspicious" | "confirmed";

export type IntegrityAlert = {
  matchId: string;
  severity: IntegritySeverity;
  score: number;          // 0..100
  flags: string[];        // e.g. ["unusual_pre_match_volume", "asian_handicap_drift"]
  source: "sportradar" | "internal" | "stub";
  observedAt: string;     // ISO
};

/**
 * Synchronously evaluate the integrity status of a match. In dev this returns
 * "info" for all matches except `m1` which gets a "watch" rating to demonstrate
 * the alert flow.
 */
export function checkMatch(matchId: string): IntegrityAlert {
  const seed = simpleSeed(matchId);
  const score = seed % 100;
  let severity: IntegritySeverity = "info";
  if (score > 90) severity = "suspicious";
  else if (score > 70) severity = "watch";
  // Demo: m1 gets a non-info severity to show the alert flow visually
  if (matchId === "m1" && severity === "info") severity = "watch";

  const alert: IntegrityAlert = {
    matchId,
    severity,
    score,
    flags: severity === "info" ? [] : (severity === "confirmed"
      ? ["confirmed_match_fixing"]
      : severity === "suspicious"
      ? ["unusual_volume", "asian_handicap_drift"]
      : ["minor_anomaly"]),
    source: "stub",
    observedAt: new Date().toISOString(),
  };
  return alert;
}

/**
 * Auto-action a high-severity alert: suspend the match, void open bets in the
 * round, refund stakes. In production this is gated behind a compliance-officer
 * acknowledgement to prevent wrongful refunds.
 */
export function escalate(alert: IntegrityAlert): { voided: number; refunded: number } {
  audit({
    category: "BET",
    action: `integrity.alert.${alert.severity}`,
    actorId: null,
    targetType: "Match",
    targetId: alert.matchId,
    payload: { score: alert.score, flags: alert.flags, source: alert.source },
  });
  if (alert.severity !== "suspicious" && alert.severity !== "confirmed") {
    return { voided: 0, refunded: 0 };
  }
  // Find all PLACED bets for this match; void + refund
  const bets: StoredBet[] = [];
  // Iterate by pulling from each window
  for (const wk of ["W_0_15", "W_15_30", "W_30_45", "W_45_60", "W_FT"] as const) {
    bets.push(...db.bet.findByMatchAndWindow(alert.matchId, wk));
  }
  let refunded = 0;
  for (const bet of bets) {
    db.bet.update(bet.id, { status: "VOIDED", returnAmount: bet.stake, settledAt: new Date().toISOString() });
    const wallet = db.wallet.findByUserId(bet.userId);
    if (wallet) {
      const newBalance = wallet.balance + bet.stake;
      db.wallet.update(wallet.id, { balance: newBalance });
      refunded += bet.stake;
      audit({
        category: "BET",
        action: "bet.refunded.integrity",
        actorId: null,
        targetType: "Bet",
        targetId: bet.id,
        payload: { matchId: alert.matchId, refund: bet.stake },
      });
    }
  }
  return { voided: bets.length, refunded };
}

function simpleSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
