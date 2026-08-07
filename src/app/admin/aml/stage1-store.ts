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
 */
import { loadConfig, saveConfig } from "@/lib/server/config-store";

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
