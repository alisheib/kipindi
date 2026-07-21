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
import { loadConfig, saveConfig } from "./config-store";

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

export function defineConfig<T extends object, U = Partial<T>>(opts: DefineConfigOpts<T, U>) {
  const { key, defaults, validate, audit: auditOpts, migrate } = opts;
  const merge = opts.merge ?? ((current: T, updates: U) => ({ ...current, ...(updates as object) }) as T);

  if (!registry.has(key)) registry.set(key, { ...defaults });

  // Eager hydrate once per key (guarded so re-imports under hot-reload don't
  // re-hit the DB). No-ops without a database. A persisted snapshot is run
  // through `migrate` first (if provided) so an older stored shape hydrates
  // into the current one rather than leaking dead keys onto the config.
  if (!hydrated.has(key)) {
    hydrated.add(key);
    void loadConfig<Record<string, unknown>>(key)
      .then((persisted) => {
        if (!persisted) return;
        const restored = migrate ? migrate(persisted) : (persisted as Partial<T>);
        registry.set(key, { ...defaults, ...restored });
      })
      .catch(() => {});
  }

  const get = (): T => ({ ...((registry.get(key) as T | undefined) ?? defaults) });

  const set = (
    updates: U,
    officerId: string,
  ): { ok: true; config: T } | { ok: false; error: string } => {
    const before = get();
    const merged = merge(before, updates);
    if (validate) {
      const v = validate(merged);
      if (!v.ok) return { ok: false, error: v.reason };
    }
    registry.set(key, merged);
    void saveConfig(key, merged);
    if (auditOpts) {
      audit({
        category: "ADMIN",
        action: auditOpts.action,
        actorId: officerId,
        targetType: auditOpts.targetType,
        targetId: "global",
        payload: { before, after: merged, changes: updates },
      });
    }
    return { ok: true, config: { ...merged } };
  };

  return { get, set };
}
