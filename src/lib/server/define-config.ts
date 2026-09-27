/**
 * defineConfig — the ONE factory for an admin-controlled, DB-persisted global
 * config object. Collapses the boilerplate that ~9 config modules each copy:
 *   • a `globalThis` cache that survives Next hot-reloads,
 *   • eager write-through hydration from SystemConfig on boot,
 *   • a sync `get()` that returns a defensive copy,
 *   • a `set(updates, officerId)` that merges → validates → caches → persists →
 *     writes an ADMIN audit event with a `{ before, after, changes }` payload,
 *   • a `setVerified` that reads the row back before it says "saved", and
 *   • a `reload()` that re-reads the row and replaces the cache, for a caller that must not act on
 *     a value another container may have changed since this one booted (see its own docblock).
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
/** ⭐ `reload()`'s ordering state — process-local for the same reason as `inFlight`.
 *  · `cacheGen` moves on every write THIS process makes to a key's cache (`set`, `setVerified`,
 *    `reload`), so a read that started before one cannot land after it and put the older value back.
 *  · `pendingSave` is the latest fire-and-forget `set()` write, so a reload reads AFTER it resolved.
 *  · `reloading` is the reload in flight, so concurrent callers share one read. */
const cacheGen = new Map<string, number>();
const pendingSave = new Map<string, Promise<void>>();
const reloading = new Map<string, Promise<unknown>>();
const genOf = (key: string): number => cacheGen.get(key) ?? 0;
const bumpGen = (key: string): void => { cacheGen.set(key, genOf(key) + 1); };

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
    const genAtStart = genOf(key);
    void load<Record<string, unknown>>(key)
      .then((res) => {
        if (!res.ok) return; // could not ask — gate stays DOWN, a later call retries
        // ⛔ A `reload()` that landed while this boot read was in flight holds a NEWER row: this older
        // read must not put the previous value back over it. The gate still closes — the store answered.
        if (res.value && genOf(key) === genAtStart) {
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
    bumpGen(key);
    /* Still fire-and-forget — the sync contract above. The pending write is REMEMBERED (never awaited
       here) so a `reload()` reads after it has resolved instead of racing it back to the older row. */
    pendingSave.set(key, Promise.resolve(save(key, merged)).then(() => undefined, () => undefined));
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

  /**
   * 🔴 THE SAVE THAT NEVER LANDS LOOKS EXACTLY LIKE ONE THAT DID — and `set()` above cannot
   * tell the difference, by construction.
   *
   * `set()` does `void save(key, merged)` and returns `{ok:true}` on the next line. `saveConfig`
   * is documented *"never throws"* and its body catches every error into a `console.error`. So a
   * failed upsert — pool timeout, failover, read-only replica — produces a GREEN TOAST, a mutated
   * in-process registry so the page re-renders the new value, **and an ADMIN audit row claiming a
   * change that is not on disk.** It reverts at the next restart, and the officer's only evidence
   * says it worked. That is how this campaign started: an officer reporting fields that "would
   * not change" after saving them twice.
   *
   * ⛔ `await`ING `save` FIXES NOTHING ON ITS OWN. There is no rejection to await — that is the
   * documented contract. The answer is **await + READ THE ROW BACK**, which is the shape this
   * repo already uses in `chain-purge.ts:putJob`, under a docblock that states the reason
   * exactly: *"a failed write is indistinguishable from a successful one at the call site."*
   *
   * ⛔ AND `set()` KEEPS ITS SYNCHRONOUS SIGNATURE, DELIBERATELY. `tryHydrate` settles the
   * no-database path synchronously *because* `set()` is sync — `proposals-state` caught two
   * assertions on the first commit that changed it — and every suite in this repo runs with no
   * `DATABASE_URL`, so that is the path they all take. Seven configs and their non-awaiting
   * callers depend on it. So verification lives HERE, on a separate async path used only by admin
   * actions, which are already `async` and already `await`. That is also exactly where the defect
   * is: an officer being shown a success they did not get.
   *
   * ⚠️ `dbPresent()` gates the read-back for the same reason `tryHydrate` gates on it: with no
   * database there is no row that can fail to land, and nothing to verify.
   *
   * ⭐ ORDER IS LOAD-BEARING. The registry mutation, the audit row and `{ok:true}` all happen
   * AFTER the read-back succeeds — so a failed write leaves no cached value, NO AUDIT ROW, and a
   * refusal the caller can show. A `set()` that returned `{ok:false}` having already mutated the
   * registry would satisfy a naive test and reproduce the defect.
   */
  const setVerified = async (
    updates: U,
    officerId: string,
  ): Promise<{ ok: true; config: T } | { ok: false; error: string }> => {
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

    if (dbPresent()) {
      await save(key, merged);
      const readBack = await load<Record<string, unknown>>(key);
      if (!readBack.ok) {
        return { ok: false, error: "Saved, but we could not confirm it was stored. Nothing has been changed — please try again." };
      }
      const restored = readBack.value
        ? ({ ...defaults, ...(migrate ? migrate(readBack.value) : (readBack.value as Partial<T>)) } as T)
        : null;
      if (!restored || !sameConfig(restored, merged)) {
        return { ok: false, error: "The change did not reach the database, so nothing has been changed. Please try again." };
      }
    }

    registry.set(key, merged);
    bumpGen(key);
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

  /** `stored` — the row EXISTS. False means the store answered "no row" and `config` is the defaults: a
   *  caller that must not act on shipped defaults (the money path) refuses on it (review, 2026-09-26). */
  type ReloadResult = { ok: true; config: T; stored: boolean } | { ok: false; error: string };

  /**
   * ⭐ RE-READ THE PERSISTED ROW NOW AND REPLACE THIS PROCESS'S CACHE WITH IT (added 2026-09-26).
   *
   * 🔴 WHY. Every config here hydrates ONCE per container and is never propagated: `set()` and
   * `setVerified()` change only the container that ran them. A deploy runs the old and the new
   * container side by side for about a minute (`railway.json` `overlapSeconds`), and a second replica
   * would make that permanent — so a container keeps acting on the config it booted with. On the player
   * invite that is money: the Owner makes invites payable with "Nothing yet" (every reward OFF) on one
   * container while the other still caches the shipped prize ON at TZS 10,000, reads the switch fresh
   * and pays the prize from its stale cache. A caller that must not act on a stale value re-reads here.
   *
   * ⭐ THE SAME PATH AS HYDRATION: `migrate` (a sanitizer, where the config has one) onto `defaults`, and
   * an ABSENT row is the defaults — exactly what a container booting now would hold. A read that
   * answered also closes the hydration gate, because it IS a read that answered.
   * ⛔ FAILS CLOSED: a read that could not ask answers `ok: false` and leaves the cache as it was. The
   * CALLER must then refuse the act it was about to price — never fall back to the cached value, which
   * is the stale value this exists to replace.
   * ⭐ ORDERED AGAINST THIS PROCESS'S OWN WRITES: it reads after a pending `set()` write has resolved,
   * and a read overtaken by a local write (`set`, `setVerified`, another reload) neither lands over it
   * nor discards itself: it answers only when the read and the local value AGREE, and otherwise answers
   * `ok: false` — the two cannot be ordered, so the caller refuses rather than guess. Concurrent callers
   * share one read. `stored: false` says the store has NO row (the defaults were answered).
   * ⚠️ With no database there is no row another container could have changed: the cache IS the store,
   * and this answers it without a read (every suite and local dev take that path).
   */
  const reload = (): Promise<ReloadResult> => {
    if (!dbPresent()) return Promise.resolve<ReloadResult>({ ok: true, config: get(), stored: true });
    const shared = reloading.get(key) as Promise<ReloadResult> | undefined;
    if (shared) return shared;
    const genAtStart = genOf(key);
    const run: Promise<ReloadResult> = (async (): Promise<ReloadResult> => {
      await pendingSave.get(key);
      const res = await load<Record<string, unknown>>(key);
      if (!res.ok) return { ok: false, error: res.error };
      const next = (res.value
        ? { ...defaults, ...(migrate ? migrate(res.value) : (res.value as Partial<T>)) }
        : { ...defaults }) as T;
      /* ⛔ A LOCAL WRITE LANDED WHILE THIS READ WAS IN FLIGHT, and the two cannot be ordered: this read may
         have executed AFTER another container's newer write, or before the local one landed. So it answers
         only when the read and the local value AGREE — and otherwise fails closed, for the caller to refuse
         (review 2026-09-26: answering the local value alone could discard a newer row it had just read). */
      if (genOf(key) !== genAtStart) {
        const local = get();
        return sameConfig(next, local) ? { ok: true, config: local, stored: !!res.value } : { ok: false, error: "The settings changed while they were being read. Try again." };
      }
      registry.set(key, next);
      bumpGen(key);
      hydrated.add(key);
      return { ok: true, config: { ...next }, stored: !!res.value };
    })()
      .catch((err: unknown): ReloadResult => ({ ok: false, error: String((err as Error)?.message ?? err) }))
      .finally(() => { if (reloading.get(key) === run) reloading.delete(key); });
    reloading.set(key, run);
    return run;
  };

  return { get, set, setVerified, reload };
}

/**
 * Compare two config objects by VALUE, independent of key order.
 *
 * ⚠️ Not `JSON.stringify(a) === JSON.stringify(b)`: a round-trip through Postgres `Json` does not
 * promise key order, so a stringify comparison would report a perfectly stored row as a failed
 * write — turning this verification into a source of false refusals on a money-adjacent console.
 */
function sameConfig(a: object, b: object): boolean {
  const ka = Object.keys(a).sort(), kb = Object.keys(b).sort();
  if (ka.length !== kb.length || ka.some((k, i) => k !== kb[i])) return false;
  return ka.every((k) => {
    const va = (a as Record<string, unknown>)[k], vb = (b as Record<string, unknown>)[k];
    if (va && vb && typeof va === "object" && typeof vb === "object") return sameConfig(va, vb);
    return va === vb;
  });
}
