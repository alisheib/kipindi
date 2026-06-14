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
