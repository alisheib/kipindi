/**
 * Email suppression list — addresses that hard-bounced or filed a spam complaint
 * (fed by the Postmark webhook at /api/webhooks/postmark). sendEmail() skips any
 * address in here so we stop mailing dead/complaining addresses, which protects
 * sender reputation and deliverability as volume ramps.
 *
 * In-memory Set (hot, synchronous for the send path) write-through to the
 * SystemConfig table so the list survives deploys. No DATABASE_URL (dev/test) →
 * the Set is simply per-process.
 */
import { loadConfig, saveConfig } from "./config-store";

const KEY = "email.suppression";

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_EMAIL_SUPPRESS: Set<string> | undefined;
}
const set: Set<string> = globalThis.__50PICK_EMAIL_SUPPRESS ?? (globalThis.__50PICK_EMAIL_SUPPRESS = new Set());

let hydrated = false;
async function hydrate(): Promise<void> {
  if (hydrated) return;
  hydrated = true;
  const stored = await loadConfig<string[]>(KEY);
  if (stored) for (const e of stored) set.add(e.toLowerCase());
}
// Fire-and-forget hydrate at module load; the send path reads the Set sync.
void hydrate();

const norm = (e: string) => e.trim().toLowerCase();

/** True if this address has bounced/complained and should not be mailed. */
export function isSuppressed(email: string): boolean {
  return set.has(norm(email));
}

/** Add an address to the suppression list (write-through). Idempotent. */
export async function suppressEmail(email: string, reason: string): Promise<void> {
  const e = norm(email);
  if (!e || set.has(e)) return;
  set.add(e);
  await saveConfig(KEY, Array.from(set));
  const { audit } = await import("./audit");
  audit({ category: "SYSTEM", action: "email.suppressed", actorId: null, targetType: null, targetId: null, payload: { email: e, reason } });
}

/** Remove an address (e.g. operator reinstated it after a fixed mailbox). */
export async function unsuppressEmail(email: string): Promise<void> {
  const e = norm(email);
  if (!set.delete(e)) return;
  await saveConfig(KEY, Array.from(set));
}
