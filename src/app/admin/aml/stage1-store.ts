/**
 * First-officer co-signature store for the AML two-person rule (B-9).
 *
 * Durable (config-store → SystemConfig row in prod) so the two-person link
 * survives restarts, AND mirrored in-process so it's reliable regardless of how
 * many audit events occur between the two clicks. This replaced the old
 * getAuditPage({limit:200}) scan, which silently lost the signature on a busy
 * day — downgrading two-officer to one.
 *
 * Lives in its own module (not the "use server" actions file) so the queue PAGE
 * can read the same durable store the actions write — the page used to scan the
 * audit ring under the WRONG category and never showed a stage-1 badge at all.
 *
 * ⭐ FEE-TAX R1 · and so the two-person step itself (`amlReleaseStep`) lives here too: it can
 * be driven without a session, and it applies only while the Owner's "Second-officer checks"
 * are ON (`second-officer-policy.ts`; ruling 6 of 2026-10-24).
 */
import { loadConfig, saveConfig } from "@/lib/server/config-store";
import { secondOfficerChecksOn } from "@/lib/server/second-officer-policy";
import { TWO_PERSON_THRESHOLD_TZS } from "./constants";

export type Stage1Sig = { actorId: string; at: string };

const STAGE1_KEY = (txnId: string) => `aml.stage1:${txnId}`;
const stage1Mem = new Map<string, Stage1Sig>();

export async function getFirstSignature(txnId: string): Promise<Stage1Sig | null> {
  const mem = stage1Mem.get(txnId);
  if (mem) return mem;
  const persisted = await loadConfig<Stage1Sig>(STAGE1_KEY(txnId));
  if (persisted) stage1Mem.set(txnId, persisted);
  return persisted;
}

export async function setFirstSignature(txnId: string, sig: Stage1Sig): Promise<void> {
  stage1Mem.set(txnId, sig);
  await saveConfig(STAGE1_KEY(txnId), sig);
}

/** Resolve the stage-1 signature for each id (the queue page's batch read). */
export async function listFirstSignatures(txnIds: string[]): Promise<Map<string, Stage1Sig>> {
  const out = new Map<string, Stage1Sig>();
  for (const id of txnIds) {
    const sig = await getFirstSignature(id);
    if (sig) out.set(id, sig);
  }
  return out;
}

/**
 * ⭐ THE TWO-PERSON STEP FOR RELEASING ONE HELD WITHDRAWAL (FEE-TAX R1) — the one decision `approveAmlAction` asks before it
 * dispatches (under its `aml-txn:` lock), kept here so it can be driven without a session.
 *   · below TWO_PERSON_THRESHOLD_TZS, or while the Owner's "Second-officer checks" are OFF: `release` — this approval
 *     dispatches the payout, as any officer's does;
 *   · at or above it while they are ON (a stored ON, or a read that fails — nothing stored is the Owner's OFF): the first
 *     approval records stage 1 and stops
 *     (`first`, the txn stays AML_REVIEW); the SAME officer's second approval is refused (`same`); a different officer's
 *     releases it.
 * `firstOfficerId` names a stage-1 signer on file, for the release's audit row (null when there is none).
 */
export async function amlReleaseStep(txnId: string, officerId: string, grossTzs: number): Promise<
  { kind: "release"; firstOfficerId: string | null } | { kind: "first" } | { kind: "same" }
> {
  const first = await getFirstSignature(txnId);
  if (grossTzs < TWO_PERSON_THRESHOLD_TZS || !(await secondOfficerChecksOn())) return { kind: "release", firstOfficerId: first?.actorId ?? null };
  if (!first) {
    await setFirstSignature(txnId, { actorId: officerId, at: new Date().toISOString() });
    return { kind: "first" };
  }
  if (first.actorId === officerId) return { kind: "same" };
  return { kind: "release", firstOfficerId: first.actorId };
}
