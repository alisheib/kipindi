import { loadConfig, saveConfig, deleteConfig } from "@/lib/server/config-store";

/**
 * THE DURABLE FIRST SIGNATURE for the chain-purge ceremony.
 *
 * Copied in shape from `src/app/admin/aml/stage1-store.ts` — the same `SystemConfig`-backed
 * K/V with an in-process mirror — because that is the mechanism this platform already trusts
 * for a two-officer stage 1.
 *
 * ⛔ NOT AN AUDIT-RING SCAN, and that is the whole reason this file exists. Deriving "did
 * someone already sign?" by scanning the audit ring is the documented way two-officer silently
 * downgraded to one: the ring is capped at 10k entries PER CONTAINER, so on a busy day, or on
 * a second container, officer A's signature simply is not there — and a missing maker reads as
 * "no conflict", which PASSES.
 *
 * ── THREE THINGS THIS DOES THAT THE AML ORIGINAL DOES NOT ────────────────────
 *
 * ⭐ 1. IT VERIFIES ITS OWN WRITE. `saveConfig` NEVER THROWS — it catches, logs and returns
 * void — so a failed stage-1 write is indistinguishable from a successful one at the call
 * site. That matters more here than anywhere: `twoOfficerGate` treats an ABSENT maker as no
 * conflict and returns null, i.e. PASSES. So a silently-dropped stage 1 does not make the
 * ceremony fail closed, it makes one officer sufficient. `setFirstSignature` reads the row
 * back and reports whether it is really there; the caller must refuse on false.
 *
 * ⭐ 2. IT CAN BE CLEARED. The AML original has no delete at all, so `aml.stage1:<txnId>`
 * persists in SystemConfig for ever and the in-process Map grows without bound. Worse for a
 * ceremony: a stale first signature left behind after a completed purge is a live half-armed
 * gate — the next officer to open the dialog would be completing someone else's ceremony from
 * a week ago. `clearFirstSignature` is called on completion AND on refusal.
 *
 * ⭐ 3. IT EXPIRES. A first signature is a statement about an intention held right now. Twelve
 * hours is deliberately generous for a shift handover and deliberately short of "indefinitely":
 * past it, the record is treated as absent and the ceremony starts again. ⚠️ Expiry is computed
 * on READ rather than swept, so a container that never runs a sweep cannot leave a live one.
 *
 * ⚠️ Keys are a PRIMARY KEY in `SystemConfig`, one row per chain, so two officers racing on the
 * same chain contend on one row — which is why the action wraps the whole ceremony in
 * `withLock`, exactly as the AML action does.
 */
export type PurgeStage1 = {
  actorId: string;
  at: string;
  /** The typed reason, ≥ 5 chars, as AML requires to release funds. */
  reason: string;
  /** The statutory basis the officer named. */
  basis: string;
};

const KEY = (chainId: string) => `updown.purge.stage1:${chainId}`;
const mem = new Map<string, PurgeStage1>();

/** ⚠️ Twelve hours. See the header — generous for a handover, short of "for ever". */
export const STAGE1_TTL_MS = 12 * 60 * 60 * 1000;

function fresh(sig: PurgeStage1 | null, now: number): PurgeStage1 | null {
  if (!sig) return null;
  const at = Date.parse(sig.at);
  // ⛔ An unparseable timestamp is treated as EXPIRED, not as valid-for-ever. A corrupt row
  // must not be able to hold a gate half-open, and `config-store` does no runtime validation
  // — it casts whatever JSON it finds to the type you asked for.
  if (!Number.isFinite(at) || now - at > STAGE1_TTL_MS) return null;
  return sig;
}

export async function getFirstSignature(chainId: string, now = Date.now()): Promise<PurgeStage1 | null> {
  const cached = fresh(mem.get(chainId) ?? null, now);
  if (cached) return cached;
  const persisted = fresh(await loadConfig<PurgeStage1>(KEY(chainId)), now);
  if (persisted) mem.set(chainId, persisted);
  else mem.delete(chainId);
  return persisted;
}

/**
 * Writes the first signature and READS IT BACK. Returns false when the write did not land —
 * the caller must refuse rather than proceed, because an absent maker passes the gate.
 */
export async function setFirstSignature(chainId: string, sig: PurgeStage1): Promise<boolean> {
  mem.set(chainId, sig);
  await saveConfig(KEY(chainId), sig);
  const readBack = await loadConfig<PurgeStage1>(KEY(chainId));
  if (!readBack || readBack.actorId !== sig.actorId) {
    // Do not leave a memory-only signature behind: on another container it would not exist,
    // so the ceremony would behave differently depending on which pod answered.
    mem.delete(chainId);
    return false;
  }
  return true;
}

/** Called on completion AND on refusal — a stale stage 1 is a half-armed gate. */
export async function clearFirstSignature(chainId: string): Promise<void> {
  mem.delete(chainId);
  await deleteConfig(KEY(chainId));
}
