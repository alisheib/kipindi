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

/**
 * Delete a persisted config value ONLY WHILE IT STILL HOLDS EXACTLY `value` (Postgres jsonb equality — key order does not
 * matter). No-op without a DB; never throws; `true` when a row was deleted.
 *
 * ⛔ FOR A ROLLBACK THAT MUST NOT TAKE BACK SOMEBODY ELSE'S WRITE (U49s review, 2026-10-06). The marketing live switch's
 * open path puts its own row back off when it cannot stand behind it (a read-back that failed, an audit that was not
 * recorded). An unconditional `deleteConfig` there would also delete a second owner's opening written in between — telling
 * them "on" while the switch is off, with no record of the close. This deletes only the row this call wrote.
 */
export async function deleteConfigIfValue(key: string, value: unknown): Promise<boolean> {
  // ⛔ Prisma DROPS an `undefined` filter (and a JSON null needs its own sentinel), so either would turn this into an
  // UNCONDITIONAL delete of the key — the exact thing this function exists not to do (the U49s re-review's m3).
  if (value === undefined || value === null) return false;
  if (!hasDatabase()) return false;
  const client = prisma();
  if (!client) return false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = value as any;
    const res = await client.systemConfig.deleteMany({ where: { key, value: { equals: json } } });
    return res.count > 0;
  } catch (err) {
    console.error(`[config] conditional delete "${key}" failed:`, (err as Error)?.message ?? err);
    return false;
  }
}

/**
 * Delete a persisted config value AND SAY WHAT WAS DELETED (`DELETE … RETURNING`): `deleted` is the removed row's value,
 * or null when there was no row at that instant (P2025). ⛔ `ok: false` means THE OUTCOME IS UNKNOWN — the delete may not
 * have been asked, or may have committed and lost its reply; a caller must find out from what is there now, never assume
 * either. No DB → nothing to delete.
 *
 * With `expected`, it deletes ONLY while the row still holds exactly that value (jsonb equality, key order ignored):
 * `deleted` is then that value, or null when the row holds anything else (or none). A null `expected` takes nothing.
 *
 * ⛔ FOR A CLOSE THAT MUST RECORD THE ROW IT ACTUALLY REMOVED (the U49s re-review's m2): a close that recorded what it
 * read FIRST could name a row that was already gone, or miss one that landed between its read and its delete. And a close
 * that tries again after a delete whose reply was lost passes `expected` (the U49s fourth review's m2): that delete may
 * have worked, so a blind second one could take an opening that landed after it.
 */
export async function takeConfig(key: string, expected?: unknown): Promise<{ ok: true; deleted: unknown } | { ok: false; error: string }> {
  if (!hasDatabase()) return { ok: true, deleted: null };
  const client = prisma();
  if (!client) return { ok: true, deleted: null };
  try {
    if (expected !== undefined) {
      // ⛔ Prisma would DROP a null filter and delete whatever is there: a null `expected` takes nothing.
      if (expected === null) return { ok: true, deleted: null };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await client.systemConfig.deleteMany({ where: { key, value: { equals: expected as any } } });
      return { ok: true, deleted: res.count > 0 ? expected : null };
    }
    const row = await client.systemConfig.delete({ where: { key } });
    return { ok: true, deleted: row.value };
  } catch (err) {
    // P2025 — no row to delete: nothing was taken.
    if ((err as { code?: unknown })?.code === "P2025") return { ok: true, deleted: null };
    const error = String((err as Error)?.message ?? err);
    console.error(`[config] take "${key}" failed:`, error);
    return { ok: false, error };
  }
}

/**
 * Create a config row ONLY IF THE KEY HAS NONE: "created", or "exists" when the key is already taken (P2002). Any other
 * failure THROWS (the outcome is unknown — it may have committed). ⛔ Throws without a database: a caller that needs this
 * has already refused to run without one.
 *
 * ⛔ FOR A WRITER THAT MUST NEVER LAY A ROW OVER SOMEBODY ELSE'S (the U49s third review's MAJOR-2): an upsert lets the
 * second of two concurrent openings replace the first after the first was told "on until 09:30".
 */
export async function createConfigIfAbsent(key: string, value: unknown): Promise<"created" | "exists"> {
  const client = hasDatabase() ? prisma() : null;
  if (!client) throw new Error(`[config] create "${key}": no database`);
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await client.systemConfig.create({ data: { key, value: value as any } });
    return "created";
  } catch (err) {
    if ((err as { code?: unknown })?.code === "P2002") return "exists";
    throw err;
  }
}

/**
 * Replace a config row's value ONLY WHILE IT STILL HOLDS EXACTLY `expected` (jsonb equality, key order ignored): true when
 * it was replaced, false when the row holds something else (or none). Any other failure THROWS (outcome unknown).
 * ⛔ An undefined or null `expected` replaces nothing — Prisma would drop the filter and replace whatever is there.
 */
export async function replaceConfigIfValue(key: string, expected: unknown, value: unknown): Promise<boolean> {
  if (expected === undefined || expected === null) return false;
  const client = hasDatabase() ? prisma() : null;
  if (!client) throw new Error(`[config] replace "${key}": no database`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await client.systemConfig.updateMany({ where: { key, value: { equals: expected as any } }, data: { value: value as any } });
  return res.count === 1;
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

/**
 * Persist a config value and THROW when the write fails. No-op without a DB.
 *
 * ⛔ For a caller whose correctness depends on the write landing — a leader lease (04 A24). `saveConfig` above
 * swallows its error, so a lease claimed through it reports success even when no lease was stored, and a
 * second container can claim the same work.
 */
export async function saveConfigOrThrow(key: string, value: unknown): Promise<void> {
  if (!hasDatabase()) return;
  const client = prisma();
  if (!client) throw new Error(`[config] save "${key}": no database client`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json = value as any;
  await client.systemConfig.upsert({ where: { key }, create: { key, value: json }, update: { value: json } });
}

/**
 * The FIELDS THAT ACTUALLY MOVED, as `{ field: { from, to } }` — the audit payload's
 * `changes`.
 *
 * 🔴 THE DEFECT THIS EXISTS FOR, AND IT COST A STATUTORY RATE. Every config audit wrote
 * `changes: updates`, and `updates` is the WHOLE POSTED FORM: an admin form seeds its state
 * from all of the current config and submits all of it, so a save that moved one field
 * recorded all sixteen as "changed". On 2026-09-08T17:42:24Z an officer changed the agent
 * programme's Lipa fee destination — and in the same save `feeVatRatePct` went **18 → 0**,
 * taking the registration fee from TZS 118,000 to 100,000 and VAT to nothing. The audit row
 * recorded sixteen identical-looking "changes"; `/admin/config` → History renders that blob
 * `JSON.stringify`'d into one truncated cell. **Nothing on any screen could show which field
 * moved.** (money-gate `LEAD-B.1a`, CONFIRMED; `MONEY-GATE-REMEDIATION.md` §7.1.)
 *
 * ⭐ `before` and `after` were always there and always complete, so nothing was ever LOST —
 * the row was unreadable, not incomplete. This makes the one field a human reads say the
 * true thing, and shortens the rendered cell from ~1,300 characters to ~30.
 *
 * ⛔ Comparison is by `JSON.stringify` per field, so it is exact for the scalars every config
 * is made of and treats an unchanged nested object as unchanged. A field present in `after`
 * and absent from `before` reads `from: undefined` — an ADDITION, which is what it is.
 */
export function configChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): Record<string, { from: unknown; to: unknown }> {
  const out: Record<string, { from: unknown; to: unknown }> = {};
  for (const k of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) out[k] = { from: before[k], to: after[k] };
  }
  return out;
}
