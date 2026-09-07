/**
 * AGENT FIXTURES — the ONE way a guard mints an approved agent, a user, a wallet.
 *
 * 🔴 WHY THIS FILE EXISTS. Three predeploy guards used to fixture an "agent" as
 * `role: "AGENT"` and nothing else. No `approvedAt`, no rate, no `active`. Under the
 * 2026-09-07 rule — `approvedAt` ALONE identifies an agent, and `inviteStateFor` keys on
 * standing rather than role — those fixtures are not agents at all, and the guards went red
 * on the day the rule landed. Each suite would then have grown its own private helper, and
 * three helpers is how one of them drifts back to role-only and a guard quietly starts
 * measuring the wrong population again.
 *
 * ⛔ THIS IS NOT `approveAgent`. The real approval lives in `agent-application-service.ts`,
 * behind KYC, the fee, the officer, the two-party control and the audit chain, and
 * `test:agent-application-security` drives THAT. This helper writes the same three columns
 * the real approval writes (`approvedAt`, `commissionPct`, `active`) plus the role, directly,
 * so an ENGINE guard can put an approved agent on the table without the paperwork. It must
 * write nothing the real approval does not.
 */
import { db, type StoredWallet } from "../../src/lib/server/store.ts";
import { ensureAffiliateAccount, AGENT_CODE_PREFIX } from "../../src/lib/server/affiliate-service.ts";
import { splitWithholding } from "../../src/lib/agent-commission.ts";
import { getAgentConfig } from "../../src/lib/server/agent-config.ts";

const now = () => new Date().toISOString();
let seq = 0;

/** A minimal ACTIVE user with a wallet. `role` defaults to PLAYER; `status` to ACTIVE. */
export async function mkFixtureUser(
  id: string,
  opts: { role?: "PLAYER" | "AGENT" | "ADMIN" | "COMPLIANCE" | "SUPPORT"; status?: "ACTIVE" | "PENDING_KYC" | "SUSPENDED" | "SELF_EXCLUDED" | "COOLED_OFF" | "CLOSED"; walletStatus?: StoredWallet["status"]; phone?: string } = {},
): Promise<void> {
  const phone = opts.phone ?? `+25576${String(++seq).padStart(7, "0")}`;
  await db.user.create({
    id, phoneE164: phone, email: `${id}@t.tz`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: opts.role ?? "PLAYER", status: opts.status ?? "ACTIVE", locale: "EN",
    displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null, recruitedBy: null,
    createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({
    id: `wal_${id}`, userId: id, balance: 0, pending: 0, hold: 0, bonusBalance: 0,
    currency: "TZS", status: opts.walletStatus ?? "ACTIVE", createdAt: now(), updatedAt: now(),
  } as StoredWallet);
}

/**
 * ⭐ Make an existing user an APPROVED agent, the way the real approval does: `approvedAt`
 * set, a PERCENT rate, `active` true, role AGENT. Returns their code.
 * ⚠️ The affiliate row is UPDATED, never created — the real `approveAgent` updates a row that
 * already exists with a player-format code, and memory `create` would silently overwrite.
 */
export async function approveFixtureAgent(userId: string, opts: { commissionPct?: number; active?: boolean } = {}): Promise<string> {
  await ensureAffiliateAccount(userId);
  // ⭐ A NEW code in the agent format, exactly as the real approval mints one — the player-format
  // code the row was auto-minted with dies at approval, and a guard that kept binding through
  // the OLD code would be measuring a code the product no longer hands out.
  const code = `${AGENT_CODE_PREFIX}${String(++codeSeq).padStart(6, "0").replace(/0/g, "Z")}`;
  await db.affiliate.update(userId, {
    code,
    approvedAt: now(),
    approvedBy: "test-officer",
    commissionPct: opts.commissionPct ?? 20,
    active: opts.active ?? true,
    deactivatedAt: null,
  });
  await db.user.update(userId, { role: "AGENT" });
  return code;
}
let codeSeq = 0;

/** An agent an officer switched off. Prospective only — the row, code and history stay. */
export async function deactivateFixtureAgent(userId: string): Promise<void> {
  await db.affiliate.update(userId, { active: false, deactivatedAt: now() });
}

export const cashOf = async (uid: string) => (await db.wallet.findByUserId(uid))?.balance ?? -1;
export const bonusOf = async (uid: string) => (await db.wallet.findByUserId(uid))?.bonusBalance ?? -1;

/**
 * ⭐ THE CASH A GROSS ACCRUAL ACTUALLY LANDS AS, after management's withholding tax.
 *
 * 🔴 WHY THIS IS ONE HELPER AND NOT A LITERAL IN EACH SUITE. On 2026-09-08 management's
 * waterfall added a 5% withholding line, and every agent engine guard that asserted a wallet
 * balance went red at once — five suites, twenty-three assertions, all of them stating the
 * pre-tax figure. Editing 1,900 into each by hand is how the suites stop describing an
 * arithmetic and start describing a snapshot: the next rate change breaks them all again, and
 * the reader can no longer tell which literals are the CLAIM and which are just today's
 * value.
 *
 * ⛔ SO A GUARD STATES THE GROSS — the number the programme's rules produce — and wraps it in
 * `netAfterWht`. `netAfterWht(2_000)` reads as "TZS 2,000 of commission, less whatever is
 * withheld", which is the assertion the suite actually means.
 *
 * ⚠️ IT READS THE LIVE RATE AND USES THE ENGINE'S OWN FUNCTION, so it cannot drift from what
 * the accrual pays. That makes it unsuitable as the SOLE assertion about the tax itself —
 * a helper sharing the engine's function agrees with a broken engine. The tax arithmetic is
 * pinned to literals in `commission-bounded.test.mts` §1/§6/§7, which is where that claim
 * belongs; here the helper is only removing an irrelevant deduction from an assertion about
 * something else (idempotency, isolation, a clawback).
 */
export function netAfterWht(grossTzs: number): number {
  return splitWithholding(grossTzs, getAgentConfig().agentWithholdingTaxPct).netTzs;
}

/** The tax withheld from a gross accrual, by the same route. */
export function whtOn(grossTzs: number): number {
  return splitWithholding(grossTzs, getAgentConfig().agentWithholdingTaxPct).taxWithheldTzs;
}
