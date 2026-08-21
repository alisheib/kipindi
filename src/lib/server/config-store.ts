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

/** Read a persisted config value by key. Returns null if no DB or not stored. */
export async function loadConfig<T>(key: string): Promise<T | null> {
  if (!hasDatabase()) return null;
  const client = prisma();
  if (!client) return null;
  try {
    const row = await client.systemConfig.findUnique({ where: { key } });
    return row ? (row.value as T) : null;
  } catch (err) {
    console.error(`[config] load "${key}" failed:`, (err as Error)?.message ?? err);
    return null;
  }
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
