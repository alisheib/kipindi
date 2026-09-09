/**
 * defineConfig — the ONE factory for an admin-controlled, DB-persisted global
 * config object. Collapses the boilerplate that ~9 config modules each copy:
 *   • a `globalThis` cache that survives Next hot-reloads,
 *   • eager write-through hydration from SystemConfig on boot,
 *   • a sync `get()` that returns a defensive copy,
 *   • a `set(updates, officerId)` that merges → validates → caches → persists →
 *     writes an ADMIN audit event with a `{ before, after, changes }` payload.
 *
 * Behaviour is identical to the hand-rolled modules (same cache semantics, same
 * eager `loadConfig().then(merge)`, same audit shape). Callers that need extra
 * exports (per-field setters, derived math, etc.) keep those alongside.
 *
 * `merge` defaults to a shallow spread `{ ...current, ...updates }`; nested
 * configs (e.g. affiliate) can pass a deep-merge fn to adopt the factory too.
 */
import { audit } from "./audit";
import { configChanges, loadConfigResult, saveConfig } from "./config-store";
import { hasDatabase } from "./prisma";

export type ConfigValidator<T> = (c: T) => { ok: true } | { ok: false; reason: string };

type DefineConfigOpts<T extends object, U> = {
  /** SystemConfig persistence key, e.g. "bonus.config". */
  key: string;
  /** Full default config — also the shape restored/merged onto persisted values. */
  defaults: T;
  /** Optional guard run on the merged config before it is accepted. */
  validate?: ConfigValidator<T>;
  /** ADMIN audit event emitted on a successful set. Omit to skip auditing. */
  audit?: { action: string; targetType: string };
  /** How `updates` combine with the current config. Default: shallow spread.
   *  `U` is the update shape (Partial<T> by default; DeepPartial<T> for nested). */
  merge?: (current: T, updates: U) => T;
  /** Optional one-way migration applied to a persisted snapshot BEFORE it is
   *  merged onto `defaults`. Lets a config evolve its shape (rename/replace a
   *  field) without breaking hydration of older stored values. Receives the raw
   *  persisted object and returns a clean `Partial<T>` in the current shape;
   *  keys it drops fall back to the default. No-op when omitted. */
  migrate?: (persisted: Record<string, unknown>) => Partial<T>;
  /**
   * ⚠️ TEST SEAM ONLY — never pass this from application code.
   *
   * The hydration gate's whole behaviour is asynchronous and depends on whether the STORE
   * answered, which cannot be exercised in-memory: with no database the factory settles the
   * gate synchronously (correctly), so every asynchronous path would go untested. Injecting
   * the three store functions lets `test:define-config-gate` drive the real factory against a
   * store that fails on demand, rather than against a re-implementation of it.
   */
  deps?: {
    loadConfigResult?: typeof loadConfigResult;
    saveConfig?: typeof saveConfig;
    hasDatabase?: typeof hasDatabase;
  };
};

/** The registry lives on globalThis so the in-memory cache survives hot-reloads,
 *  exactly like the per-module `var __50PICK_*` globals it replaces. */
declare global {
  // eslint-disable-next-line no-var
  var __50PICK_CONFIGS: Map<string, unknown> | undefined;
  // eslint-disable-next-line no-var
  var __50PICK_CONFIGS_HYDRATED: Set<string> | undefined;
}
const registry: Map<string, unknown> = (globalThis.__50PICK_CONFIGS ??= new Map());
const hydrated: Set<string> = (globalThis.__50PICK_CONFIGS_HYDRATED ??= new Set());
/** Keys with a hydration attempt in flight — so a re-arm cannot stampede the DB. Process-local
 *  on purpose: it guards concurrency, not state, and must not survive a hot-reload. */
const inFlight = new Set<string>();

export function defineConfig<T extends object, U = Partial<T>>(opts: DefineConfigOpts<T, U>) {
  const { key, defaults, validate, audit: auditOpts, migrate } = opts;
  const load = opts.deps?.loadConfigResult ?? loadConfigResult;
  const save = opts.deps?.saveConfig ?? saveConfig;
  const dbPresent = opts.deps?.hasDatabase ?? hasDatabase;
  const merge = opts.merge ?? ((current: T, updates: U) => ({ ...current, ...(updates as object) }) as T);

  if (!registry.has(key)) registry.set(key, { ...defaults });

  /**
   * 🔴 THE GATE CLOSES ONLY ON A READ THAT ANSWERED — and it did not, until 2026-09-09.
   *
   * This raised `hydrated.add(key)` BEFORE the load and read through `loadConfig`, which
   * collapses "no row", "no database" and **"the query FAILED"** into one `null`. So a single
   * boot-time DB blip — a container reaching Postgres before it accepts connections, a
   * failover, a pool timeout — pinned that container on **code defaults for its entire life**,
   * with nothing that could ever retry: `__50PICK_CONFIGS_HYDRATED` has no reset anywhere in
   * the repo. (money-gate `LEAD-B.3`, CONFIRMED; `MONEY-GATE-REMEDIATION.md` §7.14.)
   *
   * ⛔ IT IS THE DEFECT `2499f324` FIXED FOR FOUR OTHER MODULES AND THIS FACTORY DID NOT GET.
   * Six configs hang off it, `agent.config` among them, and `config-store.ts`'s own docblock
   * on `loadConfig` says in capitals **"DO NOT BUILD A HYDRATION GATE ON THIS."**
   *
   * ⭐ `ok: true, value: null` still closes the gate: a fresh install legitimately has no row,
   * and gating on a VALUE would leave every caller waiting for ever. `ok: false` means we could
   * not ask — the gate stays down and the next `get`/`set` re-arms the attempt.
   */
  const tryHydrate = (): void => {
    if (hydrated.has(key) || inFlight.has(key)) return;
    /**
     * ⛔ NO DATABASE — SETTLE IT SYNCHRONOUSLY. `loadConfigResult` answers `ok: true,
     * value: null` here, but it answers on a MICROTASK, and `set()` is synchronous: a suite or
     * a local process that configures something on the first tick would be refused by a gate
     * that has not resolved yet. `proposals-state` caught exactly that — two assertions, on the
     * first commit of this change.
     *
     * ⭐ And the distinction is real, not an exemption carved out to make a test pass: the gate
     * exists to stop a de-hydrated process overwriting a PERSISTED row. With no database there
     * is no row, nothing to lose, and nothing to wait for.
     */
    if (!dbPresent()) { hydrated.add(key); return; }
    inFlight.add(key);
    void load<Record<string, unknown>>(key)
      .then((res) => {
        if (!res.ok) return; // could not ask — gate stays DOWN, a later call retries
        if (res.value) {
          const restored = migrate ? migrate(res.value) : (res.value as Partial<T>);
          registry.set(key, { ...defaults, ...restored });
        }
        hydrated.add(key); // ⛔ LAST, and only on a read that landed
      })
      .finally(() => { inFlight.delete(key); });
  };

  tryHydrate();

  const get = (): T => {
    // ⚠️ Sync by contract — ~40 call sites, and `get()` cannot become async without changing
    // every one. So this RE-ARMS a failed hydration rather than awaiting one: the value
    // returned now may still be defaults, but the container is no longer pinned on them.
    tryHydrate();
    return { ...((registry.get(key) as T | undefined) ?? defaults) };
  };

  const set = (
    updates: U,
    officerId: string,
  ): { ok: true; config: T } | { ok: false; error: string } => {
    /**
     * ⛔ A DE-HYDRATED PROCESS MAY NOT PERSIST. `set` merges onto `get()` and writes the WHOLE
     * object, and an admin settings form posts every field — so a container that never
     * hydrated would overwrite each persisted value with a code default, silently, on the
     * first officer save. That is the destructive half of `LEAD-B.3`, and it is how a live
     * rate could be reset by someone who touched an unrelated field.
     *
     * ⭐ Refusing is the safe direction: an officer sees "try again", instead of a save that
     * appears to succeed while wiping the row. `hydrated` also holds for a no-database
     * process (`loadConfigResult` answers `ok: true, value: null`), so tests and local dev are
     * unaffected.
     */
    if (!hydrated.has(key)) {
      tryHydrate();
      return { ok: false, error: "Settings have not finished loading yet — refresh and try again." };
    }
    const before = get();
    const merged = merge(before, updates);
    if (validate) {
      const v = validate(merged);
      if (!v.ok) return { ok: false, error: v.reason };
    }
    registry.set(key, merged);
    void save(key, merged);
    if (auditOpts) {
      audit({
        category: "ADMIN",
        action: auditOpts.action,
        actorId: officerId,
        targetType: auditOpts.targetType,
        targetId: "global",
        payload: { before, after: merged, changes: configChanges(before as Record<string, unknown>, merged as Record<string, unknown>) },
      });
    }
    return { ok: true, config: { ...merged } };
  };

  return { get, set };
}
