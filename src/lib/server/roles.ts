/**
 * Admin role tiers — ONE source of truth for "who may do what".
 *
 * Previously every admin action redefined `ADMIN_ROLES = {ADMIN,COMPLIANCE,MODERATOR}`
 * locally, so a MODERATOR (a content/market moderator) could release AML money,
 * approve KYC, view raw NIDA images, export PII, retune settlement fees, and reset
 * player credentials. These tiers split that authority. Server actions import the
 * tier appropriate to what they do; the admin console (read access) stays broad.
 *
 * Keep these tight — widening one re-grants authority across every action that
 * imports it.
 */

export type Role = "PLAYER" | "AGENT" | "MODERATOR" | "ADMIN" | "COMPLIANCE" | "SUPPORT";

/** Can OPEN the admin console (read-level access + market-ops). Broadest tier. */
export const ADMIN_CONSOLE_ROLES = new Set<Role>(["ADMIN", "COMPLIANCE", "MODERATOR"]);

/** Market operations: create / resolve / void / candidates / proposals /
 *  moderation / sources. Resolution is separately two-officer-gated. */
export const MARKET_OPS_ROLES = new Set<Role>(["ADMIN", "COMPLIANCE", "MODERATOR"]);

/** Money movement: AML release/reject, manual credits, bonus grants, affiliate
 *  payout config, invites that grant bonuses. NEVER MODERATOR. */
export const MONEY_ROLES = new Set<Role>(["ADMIN", "COMPLIANCE"]);

/** Compliance decisions + sensitive PII: KYC/SoF review, KYC-document access,
 *  privacy/DSAR tooling, player credential changes (password/email). NEVER MODERATOR. */
export const COMPLIANCE_ROLES = new Set<Role>(["ADMIN", "COMPLIANCE"]);

/** Platform configuration + system + reports/exports + AI spend controls.
 *  These change economics or expose regulator-grade data. NEVER MODERATOR. */
export const CONFIG_ROLES = new Set<Role>(["ADMIN", "COMPLIANCE"]);

/** True if `role` is in `tier`. Null/undefined-safe. */
export function hasRole(role: string | null | undefined, tier: Set<Role>): boolean {
  return !!role && tier.has(role as Role);
}
