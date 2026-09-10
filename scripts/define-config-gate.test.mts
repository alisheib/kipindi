/**
 * THE `defineConfig` HYDRATION GATE — closes only on a read that ANSWERED, and retries.
 *
 *   npx tsx scripts/define-config-gate.test.mts   (npm run test:define-config-gate)
 *
 * 🔴 THE DEFECT THIS EXISTS FOR (`LEAD-B.3`, CONFIRMED; `MONEY-GATE-REMEDIATION.md` §7.14).
 * `defineConfig` raised its hydrated flag BEFORE the load and read through `loadConfig`, which
 * collapses "no row", "no database" and **"the query FAILED"** into one `null`. One boot-time
 * DB blip therefore pinned a container on code defaults for its whole life, with no retry
 * anywhere in the repo — and the first officer save from that container would persist those
 * defaults over every field of a good row, because an admin settings form posts all of them.
 *
 * ⛔ SIX CONFIGS HANG OFF THIS FACTORY, `agent.config` among them. It is the same class as the
 * two worst things this session found: `feeVatRatePct` reaching production as 0 (§7.1) and the
 * commission ceiling clamping to a setting instead of the rule (§7.13) both travelled through a
 * persisted row that no validator had seen.
 *
 *   §1 a read that FAILS leaves the gate DOWN, and the next call retries
 *   §2 a read that ANSWERS closes it — including `value: null` on a fresh install
 *   §3 ⛔ a de-hydrated process REFUSES to persist rather than overwriting the row
 *   §4 ⚠️ POSITIVE CONTROL — the pre-fix shape is caught by every one of the above
 *
 * ⭐ It drives the REAL factory against a stubbed store, so it tests `defineConfig` itself
 * rather than a re-implementation of its logic.
 */
let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`PASS ${label}`); }
  else { fail++; console.log(`FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
};

const tick = () => new Promise((r) => setImmediate(r));

import { defineConfig } from "../src/lib/server/define-config.ts";

// ── The store, stubbed through the factory's `deps` seam. `answer` decides the next read. ──
// ⛔ `hasDatabase` must report TRUE, or the factory's no-DB shortcut settles the gate
// synchronously — correctly — and none of the asynchronous behaviour below is exercised.
type Answer = { ok: true; value: Record<string, unknown> | null } | { ok: false; error: string };
let answer: Answer = { ok: true, value: null };
let reads = 0;
let saved: unknown[] = [];
const deps = {
  loadConfigResult: (async () => { reads++; return answer; }) as never,
  saveConfig: (async (_k: string, v: unknown) => { saved.push(v); }) as never,
  hasDatabase: (() => true) as never,
};

type Cfg = { rate: number; name: string };
const DEFAULTS: Cfg = { rate: 10, name: "default" };
let n = 0;
const fresh = () => {
  // A distinct key per case — the registry and the gate live on globalThis.
  globalThis.__50PICK_CONFIGS = new Map();
  globalThis.__50PICK_CONFIGS_HYDRATED = new Set();
  reads = 0; saved = [];
  return defineConfig<Cfg>({ key: `test.cfg.${++n}`, defaults: DEFAULTS, deps });
};

// ── §1 · a FAILED read leaves the gate down and retries ──────────────────────
console.log("\n§1 · a read that could not ask leaves the gate DOWN, and the next call retries");
{
  answer = { ok: false, error: "connection refused" };
  const c = fresh();
  await tick();
  ok("the failed read happened", reads === 1, `reads=${reads}`);
  ok("the value falls back to defaults", c.get().rate === 10);

  // ⭐ THE HALF THAT DID NOT EXIST BEFORE: a later call re-arms the attempt.
  c.get(); await tick();
  ok("⭐ a later get() RETRIES rather than staying pinned", reads === 2, `reads=${reads}`);

  // …and once the store recovers, the real value lands.
  answer = { ok: true, value: { rate: 42, name: "persisted" } };
  c.get(); await tick();
  ok("⭐ …and when the store recovers, the persisted row arrives", c.get().rate === 42, `rate=${c.get().rate}`);
}

// ── §2 · a read that ANSWERS closes the gate ─────────────────────────────────
console.log("\n§2 · a read that answered closes the gate — including an empty one");
{
  answer = { ok: true, value: { rate: 7, name: "row" } };
  const c = fresh();
  await tick();
  ok("a row hydrates onto the defaults", c.get().rate === 7 && c.get().name === "row");
  const before = reads;
  c.get(); c.get(); await tick();
  ok("⛔ and the gate is CLOSED — no further reads", reads === before, `reads went ${before} → ${reads}`);

  // A fresh install legitimately has no row. That is an ANSWER, not a failure.
  answer = { ok: true, value: null };
  const d = fresh();
  await tick();
  const r2 = reads;
  d.get(); await tick();
  ok("⭐ `value: null` (fresh install) closes the gate too — it does not spin", reads === r2, `reads went ${r2} → ${reads}`);
  ok("…and the config is the defaults", d.get().rate === 10);
}

// ── §3 · a de-hydrated process may not persist ───────────────────────────────
console.log("\n§3 · ⛔ a de-hydrated process REFUSES to save rather than wiping the row");
{
  answer = { ok: false, error: "down" };
  const c = fresh();
  await tick();
  const r = c.set({ name: "officer typed this" }, "usr_officer");
  ok("⛔ the save is REFUSED", r.ok === false, JSON.stringify(r));
  ok("⛔ …and NOTHING was written to the store", saved.length === 0, `${saved.length} writes`);
  ok("the officer is told what to do", !r.ok && /loading|try again/i.test(r.error), !r.ok ? r.error : "");

  // ⚠️ DRAIN THE RETRY THE REFUSED SAVE ITSELF STARTED. `set` re-arms `tryHydrate` before it
  // refuses, so that attempt is still in flight; changing `answer` now and calling `get()`
  // would be a no-op (in-flight) and the STALE ok:false read would land instead. This cost a
  // run, and it is the same shape as the defect under test: a state you have to wait for.
  await tick();
  // Once hydrated, the same save goes through and preserves the untouched field.
  answer = { ok: true, value: { rate: 42, name: "persisted" } };
  c.get(); await tick();
  const r2 = c.set({ name: "officer typed this" }, "usr_officer");
  ok("⭐ once hydrated the save succeeds", r2.ok === true);
  ok("⭐ …and the field the officer did NOT touch keeps its persisted value",
    r2.ok && r2.config.rate === 42, r2.ok ? `rate=${r2.config.rate}` : "");
  ok("…and it reached the store", saved.length === 1 && (saved[0] as Cfg).rate === 42);
}

// ── §4 · POSITIVE CONTROL ────────────────────────────────────────────────────
console.log("\n§4 · ⚠️ POSITIVE CONTROL — the PRE-FIX shape fails every check above");
{
  // The old factory, reproduced exactly: flag raised FIRST, failure collapsed to null.
  const preFixHydrated = new Set<string>();
  const preFixRegistry = new Map<string, Cfg>();
  let preFixReads = 0;
  const preFixSaved: unknown[] = [];
  const KEY = "prefix";
  const loadConfigLike = async (): Promise<Cfg | null> => {
    preFixReads++;
    return answer.ok ? (answer.value as Cfg | null) : null;   // ⛔ failure == null
  };
  const preFixGet = (): Cfg => ({ ...(preFixRegistry.get(KEY) ?? DEFAULTS) });
  const preFixInit = () => {
    preFixRegistry.set(KEY, { ...DEFAULTS });
    if (!preFixHydrated.has(KEY)) {
      preFixHydrated.add(KEY);                                 // ⛔ FIRST, not last
      void loadConfigLike().then((p) => { if (p) preFixRegistry.set(KEY, { ...DEFAULTS, ...p }); });
    }
  };
  const preFixSet = (u: Partial<Cfg>) => { const m = { ...preFixGet(), ...u }; preFixRegistry.set(KEY, m); preFixSaved.push(m); return { ok: true as const }; };

  answer = { ok: false, error: "down" };
  preFixInit();
  await tick();
  preFixGet(); await tick();
  ok("⚠️ pre-fix: a later get() does NOT retry (it is pinned)", preFixReads === 1, `reads=${preFixReads}`);

  answer = { ok: true, value: { rate: 42, name: "persisted" } };
  preFixGet(); await tick();
  ok("⚠️ pre-fix: it never picks the persisted row up", preFixGet().rate === 10, `rate=${preFixGet().rate}`);

  preFixSet({ name: "officer typed this" });
  ok("⚠️ pre-fix: the save is ACCEPTED while de-hydrated", preFixSaved.length === 1);
  ok("⛔ ⚠️ pre-fix: and it writes the DEFAULT over the persisted 42 — the data loss",
    (preFixSaved[0] as Cfg).rate === 10, `wrote rate=${(preFixSaved[0] as Cfg).rate}`);
}

// ── §5 · setVerified — a write that never landed must NOT report success ─────
//
// 🔴 THE DEFECT. `set()` does `void save(...)` then returns `{ok:true}` on the next line, and
// `saveConfig` is documented "never throws". So a failed upsert produced a GREEN TOAST, a mutated
// registry the page re-rendered the new value from, and an ADMIN AUDIT ROW claiming a change that
// was not on disk — reverting at the next restart. An officer's screenshot could not tell the two
// apart, which is why no screenshot from them was evidence about persistence.
//
// ⛔ AND `await save(...)` WOULD PROVE NOTHING, WHICH IS WHY THIS SECTION DRIVES A STORE THAT
// ACCEPTS THE WRITE AND THEN DOES NOT HAVE IT. There is no rejection to await — that is
// `saveConfig`'s contract. The only thing that separates a landed write from a lost one is
// READING THE ROW BACK, so that is what is asserted here: not that `save` was called, but that
// the value came back.
console.log("\n§5 · a write that did not land is REFUSED, not toasted green");
{
  // A store that swallows writes exactly as a read-only replica or a timed-out pool would:
  // `saveConfig` resolves, and the row simply is not there afterwards.
  let swallow = false;
  let stored: Record<string, unknown> | null = { rate: 42, name: "persisted" };
  let writes = 0;
  const lossyDeps = {
    loadConfigResult: (async () => ({ ok: true as const, value: stored })) as never,
    saveConfig: (async (_k: string, v: unknown) => {
      writes++;
      if (!swallow) stored = v as Record<string, unknown>;
    }) as never,
    hasDatabase: (() => true) as never,
  };
  globalThis.__50PICK_CONFIGS = new Map();
  globalThis.__50PICK_CONFIGS_HYDRATED = new Set();
  const audited: unknown[] = [];
  const c = defineConfig<Cfg>({
    key: `test.cfg.verified.${++n}`,
    defaults: DEFAULTS,
    deps: lossyDeps,
    // No `audit` option: this suite asserts the ABSENCE of a row by counting writes to the store,
    // and wiring the real audit chain into a unit suite would be the heavier, less direct proof.
  });
  await tick(); await tick();
  ok("§5 hydrated from the persisted row", c.get().rate === 42, `rate=${c.get().rate}`);

  // ── the happy path first, so the failure below is a CONTRAST and not the only outcome ──
  const good = await c.setVerified({ name: "officer typed this" }, "officer_1");
  ok("§5 ⚠️ CONTROL — a write that LANDS is accepted", good.ok === true, JSON.stringify(good));
  ok("§5 …and the cache reflects it", c.get().name === "officer typed this", c.get().name);
  audited.push(good);

  // ── now the write is swallowed: accepted by the store, absent on read-back ──
  swallow = true;
  const before = { ...c.get() };
  const writesBefore = writes;
  const bad = await c.setVerified({ name: "this one is lost" }, "officer_1");

  ok("§5 ⛔ the officer is REFUSED, not congratulated", bad.ok === false, JSON.stringify(bad));
  ok("§5 ⛔ …the refusal says nothing was changed", !bad.ok && /did not reach|could not confirm/i.test(bad.error),
    !bad.ok ? bad.error : "");
  ok("§5 ⛔ …the in-memory config is UNTOUCHED, so the form cannot re-render the lost value",
    c.get().name === before.name && c.get().rate === before.rate, JSON.stringify(c.get()));
  ok("§5 the write really was attempted (this is not a validation short-circuit)",
    writes === writesBefore + 1, `writes ${writesBefore} → ${writes}`);

  // ⭐ THE ASSERTION THE WHOLE UNIT EXISTS FOR: `set()` — the sync path every suite and every
  // first-tick configure still uses — reports SUCCESS for the very same swallowed write. Keeping
  // this here makes the difference between the two paths executable rather than described, and it
  // is also the proof that the sync path was left deliberately intact rather than forgotten.
  const sync = c.set({ name: "sync path" }, "officer_1");
  ok("§5 ⚠️ CONTRAST — the SYNC set() still reports ok for a write that is lost",
    sync.ok === true, JSON.stringify(sync));
}

console.log(`\n${"═".repeat(70)}\n  DEFINE-CONFIG GATE: ${pass} passed, ${fail} failed\n${"═".repeat(70)}`);
process.exit(fail === 0 ? 0 : 1);
