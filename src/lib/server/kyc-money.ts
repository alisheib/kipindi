/**
 * IDENTITY × MONEY — the one server read that joins who we have verified with what they hold.
 *
 * ⭐ WHY IT EXISTS (2026-09-13). From that date identity is asked before a WITHDRAWAL and before
 * nothing else (docs/COMPLIANCE-DECISIONS.md, 2026-09-13), so every unverified account can hold
 * money. Four consoles now ask the same joined question — the finance "Held for unverified"
 * figure (`unverifiedLiability()` in analytics.ts), the roster's funded stage, the KYC queue's
 * "funded, nothing submitted" list, and /admin/approvals' "Funded · no submission" tile and SOF
 * identity column (via `readKycQueueIdentity` in kyc-risk.ts) — and four hand-written joins of
 * `listStageFacts` with the wallet table would be four answers. This is the join; the WORDS and the SUMS stay in the pure
 * module `src/lib/kyc-stage.ts`, so the rules can be unit-tested without a database.
 *
 * ⛔ NEVER `db.kyc.list()` — `include: { documents: true }` pulls every inline base64 image
 * through a population read. `listStageFacts` is the narrow feed (newest submission per user,
 * ordered exactly as `db.kyc.findByUserId`, which is the row the withdrawal gate reads).
 *
 * ⛔ A FAILED READ IS A RESULT, NOT A ZERO. Each half reports its own failure, so a caller can say
 * "could not be read" instead of printing TZS 0 held for unverified accounts — a false compliance
 * all-clear (the rule /admin/aml already states).
 *
 * ⚠️ THE TWO READS ARE SEQUENTIAL, FACTS FIRST, AND THE ORDER IS CHOSEN. They are milliseconds
 * apart. Read in this order, the only skew is toward OVER-stating unverified money: an approval
 * landing between them still counts as unverified for one render, and a deposit landing between
 * them is included because the wallets are read second. The reverse order would under-state
 * both ways. On a compliance figure the safe error is the larger one.
 */
import { db, type StoredKycStageRow, type StoredWallet } from "./store";
import { approvedEver } from "../kyc-approval";
import { kycStage, walletHeldTzs, type KycStage } from "../kyc-stage";

export type KycMoneySnapshot =
  | { ok: true; facts: StoredKycStageRow[]; wallets: StoredWallet[] }
  | { ok: false; failed: "kyc" | "wallets" };

/** Both population reads, each failure named. Never throws. */
export async function readKycMoneySnapshot(): Promise<KycMoneySnapshot> {
  let facts: StoredKycStageRow[];
  try {
    facts = await db.kyc.listStageFacts();
  } catch {
    return { ok: false, failed: "kyc" };
  }
  let wallets: StoredWallet[];
  try {
    wallets = await db.wallet.listAll();
  } catch {
    return { ok: false, failed: "wallets" };
  }
  return { ok: true, facts, wallets };
}

/** One account that can hold money — i.e. one wallet — with its identity standing beside it. */
export type KycMoneyRow = {
  userId: string;
  /** The newest submission, or `null` when the account has none (the normal state of a new player). */
  facts: StoredKycStageRow | null;
  walletStatus: StoredWallet["status"];
  balance: number;
  hold: number;
  /** `walletHeldTzs` — `balance + hold`, the liability basis. */
  heldTzs: number;
  /** `approvedEver` — the withdrawal gate's own predicate. */
  everApproved: boolean;
  /** The roster's stage word, with money APPLIED — the same `kycStage` the roster calls. */
  stage: KycStage;
};

/**
 * Join a snapshot into one row per wallet. Pure over its inputs.
 * ⚠️ ONE ROW PER WALLET, NOT PER USER: an account with no wallet holds nothing and cannot appear
 * in a money question. Use the roster (`db.user.list()`) when the population is PEOPLE.
 * ⛔ This row is for a viewer WITH money rights — `stage` has money applied, so it can read
 * "funded_nothing_yet". Do not render it to SUPPORT (RBAC: `money.figures` is masked for them).
 */
export function kycMoneyRows(facts: readonly StoredKycStageRow[], wallets: readonly StoredWallet[]): KycMoneyRow[] {
  const factsByUser = new Map<string, StoredKycStageRow>();
  // First row per user wins — the DAL's (createdAt desc, id desc) order defines "newest".
  for (const f of facts) if (!factsByUser.has(f.userId)) factsByUser.set(f.userId, f);
  return wallets.map((w) => {
    const f = factsByUser.get(w.userId) ?? null;
    const heldTzs = walletHeldTzs(w);
    return {
      userId: w.userId,
      facts: f,
      walletStatus: w.status,
      balance: w.balance,
      hold: w.hold ?? 0,
      heldTzs,
      everApproved: approvedEver(f),
      stage: kycStage(f, { heldTzs }),
    };
  });
}
