/**
 * Durable key/value config store — backs the admin-tunable settings that were
 * previously globalThis-only (and therefore reset to code defaults on every
 * deploy). Each config module keeps its fast in-memory cache but now hydrates it
 * from here on first read and writes through on every change.
 *
 * No DATABASE_URL (local dev / unit tests) → both calls no-op, so modules fall
 * back to their in-memory defaults exactly as before. Neither call ever throws:
 * a config write must never break an admin action.
 */
import { hasDatabase, prisma } from "./prisma";

/**
 * Read a persisted config value, SAYING WHETHER THE READ ACTUALLY HAPPENED.
 *
 * 🔴 THIS EXISTS BECAUSE `loadConfig` COLLAPSES THREE STATES INTO ONE `null`, AND A
 * HYDRATION GATE CANNOT BE WRITTEN CORRECTLY ON TOP OF IT (found 2026-09-09).
 * "no database", "no row yet" and "the query FAILED" all returned `null`, so every
 * `if (stored) …; flag = true;` hydration raised its gate on a read that never landed —
 * pinning that container on code defaults for its entire life, with no retry. Both
 * `market-config.ts` and `payment-ops.ts` carried docblocks stating the opposite
 * ("a failure leaves the flag DOWN so the next read retries"), and
 * `MONEY-GATE-REMEDIATION.md` §1.2 declared that blocker closed on the strength of them.
 *
 * ⛔ AND MOVING THE FLAG INSIDE `if (stored)` IS NOT THE FIX. On a fresh install the row
 * legitimately does not exist, so that shape never hydrates and every caller waits for ever.
 * The gate needs the one distinction this adds and `loadConfig` cannot express: **did the
 * store answer?** — not **was there anything in it?**
 *
 * `ok: true, value: null` — the store answered and holds nothing (fresh install, or no DB
 * at all). Both are legitimately final, so a gate may close on them.
 * `ok: false` — we could not ask. The caller must leave its gate DOWN and retry.
 */
export async function loadConfigResult<T>(
  key: string,
): Promise<{ ok: true; value: T | null } | { ok: false; error: string }> {
  if (!hasDatabase()) return { ok: true, value: null };
  const client = prisma();
  if (!client) return { ok: true, value: null };
  try {
    const row = await client.systemConfig.findUnique({ where: { key } });
    return { ok: true, value: row ? (row.value as T) : null };
  } catch (err) {
    const error = String((err as Error)?.message ?? err);
    console.error(`[config] load "${key}" failed:`, error);
    return { ok: false, error };
  }
}

/**
 * Read a persisted config value by key. Returns null if no DB, not stored, OR THE READ
 * FAILED — the three are indistinguishable here, by design and by history.
 *
 * ⚠️ DO NOT BUILD A HYDRATION GATE ON THIS. Use `loadConfigResult`, which says whether the
 * store answered. Kept for the callers that only want a value and treat absence and failure
 * alike — correct for them, never correct for a gate.
 */
export async function loadConfig<T>(key: string): Promise<T | null> {
  const r = await loadConfigResult<T>(key);
  return r.ok ? r.value : null;
}

/**
 * Delete a persisted config value. No-op without a DB; never throws.
 *
 * 🔴 IT EXISTS FOR A PII MIGRATION, NOT FOR TIDINESS (audit F-11b). `SystemConfig.key` is a
 * primary key, so a key that CONTAINS a phone number stores that number in a place no
 * retention pass, no erasure routine and no export projection can see — the value can be
 * rewritten, the key cannot. `bootstrap.login_promoted:+255…` did exactly that.
 *
 * The only correct migration for a key like that is: read the legacy key, write the new one,
 * then DELETE the legacy row. Without this function the third step is impossible and the phone
 * number stays for ever behind a key nobody thinks of as data.
 */
export async function deleteConfig(key: string): Promise<boolean> {
  if (!hasDatabase()) return false;
  const client = prisma();
  if (!client) return false;
  try {
    const res = await client.systemConfig.deleteMany({ where: { key } });
    return res.count > 0;
  } catch (err) {
    console.error(`[config] delete "${key}" failed:`, (err as Error)?.message ?? err);
    return false;
  }
}

/** Persist a config value (write-through upsert). No-op without a DB; never throws. */
export async function saveConfig(key: string, value: unknown): Promise<void> {
  if (!hasDatabase()) return;
  const client = prisma();
  if (!client) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = value as any;
    await client.systemConfig.upsert({
      where: { key },
      create: { key, value: json },
      update: { value: json },
    });
  } catch (err) {
    console.error(`[config] save "${key}" failed:`, (err as Error)?.message ?? err);
  }
}
