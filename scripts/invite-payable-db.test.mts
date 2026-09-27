/**
 * THE OWNER'S "PAYABLE / NOT PAYABLE" SWITCH IN DATABASE MODE — a container that acts on the reward
 * settings it BOOTED with (2026-09-26).
 *
 * `test:player-invite-unpaid` §8 proves the switch in memory, where every read is fresh by construction.
 * This suite proves the part only a DATABASE can break. Config on this platform loads ONCE per container
 * and is never propagated, and a deploy runs the old and the new container side by side for about a
 * minute (`railway.json` `overlapSeconds`). So one container can read the switch fresh and still price a
 * reward from the settings it booted with — the shipped prize ON at TZS 10,000 — after the Owner chose
 * "Make payable → Nothing yet" on the other one. The money path, the ceremony and the Save therefore
 * RE-READ the settings row (`reloadAffiliateConfig` → `defineConfig.reload()`), and this suite watches
 * them do it, against a stale container built on purpose (`globalThis.__50PICK_CONFIGS`).
 *
 *   §1 · `defineConfig.reload()` itself, through its `deps` seam (the define-config-gate shape)
 *   §2 · the money path — `accrualContextFor`, `payPrize`, `payBonus` — on a stale container
 *   §3 · the Owner's ceremony and the reward Save on a stale container
 *   §4 · a stored row that still arms a RETIRED deposit-tied mode (loads OFF, refused out loud, clears on a Save)
 *   §5 · the compliance records when the database REFUSES them (the attempt, the outcome, the raised terms)
 *   §6 · no settings row at all — refused on the money path, never promised on a screen
 *
 * ⛔ WHY ITS OWN PROCESS. Database mode is a property of the whole module graph (`hasDatabase()` reads
 * DATABASE_URL on every call), and with no DATABASE_URL a reload reads nothing — every reload defect
 * would be invisible. So the environment and a fake Prisma client are installed BEFORE ANY IMPORT, and
 * every repo module is imported dynamically below them (a static import would be evaluated first).
 *
 * ⛔ IT CAN NEVER TOUCH A REAL DATABASE. It refuses to start when DATABASE_URL is already set to anything
 * but its own fake URL (non-routable, 127.0.0.1:1); it pins `globalThis.__50PICK_PRISMA` to the fake
 * before `prisma()` could build a real client; and it refuses again unless `prisma()` returns exactly
 * that fake and the store is the in-memory one. `USE_PRISMA_DAL=false` keeps users, wallets and reward
 * rows on the in-memory store: only the CONFIG layer — the one SystemConfig table below — is in database
 * mode, which is exactly the layer under test.
 *
 * ⚠️ THE FAKE TAKES NO LOCKS. In database mode `withLock` is a Postgres advisory lock inside
 * `$transaction`; here `$transaction` simply runs its callback. Every case below is sequential, and lock
 * semantics belong to `test:concurrency`. Every other table the modules touch in database mode (the audit
 * chain's rows, the ledger mirror) is a benign no-op, counted and printed at the end.
 *
 * Red harness: `npm run red:invite-payable-db` — anchors in `scripts/anchors/agent.anchors.mjs`, gate
 * `invite-payable-db`; each planted defect must turn ITS OWN label red.
 *
 *   npx tsx scripts/invite-payable-db.test.mts
 */

// ── 0 · THE GUARD — before a single repo module is loaded ───────────────────────────────────────────
const FAKE_DATABASE_URL = "postgresql://invite-payable-db:fake@127.0.0.1:1/never_a_real_database";
if (process.env.DATABASE_URL !== undefined && process.env.DATABASE_URL !== FAKE_DATABASE_URL) {
  console.log("FAIL 0.guard · ⛔ REFUSED — DATABASE_URL is already set in this environment. This suite installs its OWN fake URL and a fake client and never runs beside a real one: unset DATABASE_URL and run it again.");
  process.exit(1);
}
if (process.env.NODE_ENV === "production") {
  console.log("FAIL 0.guard · ⛔ REFUSED — NODE_ENV=production. The in-memory store refuses to start there, and this suite has no business on a production process.");
  process.exit(1);
}
process.env.DATABASE_URL = FAKE_DATABASE_URL;
process.env.USE_PRISMA_DAL = "false";
delete process.env.FEATURE_INVITEREWARDS;

// ── THE FAKE SystemConfig TABLE — the one table in database mode ────────────────────────────────────
const TABLE = new Map<string, unknown>();
/** Every SystemConfig key read, in order — how "the unpaid platform pays nothing for the reload" is counted. */
const READS: string[] = [];
/** Keys whose reads throw, as a pool timeout would. */
const FAIL = new Set<string>();
/** After `remaining` more reads of `key`, the row becomes `value` — another container writing between two reads. */
let flip: { key: string; remaining: number; value: unknown } | null = null;
/** After `remaining` more GOOD reads of `key`, its reads throw. */
let failAfter: { key: string; remaining: number } | null = null;
/** After `remaining` more reads of `key`, the row is GONE — deleted between two reads. */
let vanishAfter: { key: string; remaining: number } | null = null;
/** Audit actions whose durable INSERT fails (the fake `AuditLog.create` throws), as a database that refuses the row. */
const AUDIT_FAIL = new Set<string>();
const OTHER = new Map<string, number>();
const noted = (name: string) => { OTHER.set(name, (OTHER.get(name) ?? 0) + 1); };
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

const systemConfig = {
  findUnique: async ({ where: { key } }: { where: { key: string } }) => {
    READS.push(key);
    if (FAIL.has(key)) throw new Error(`fake SystemConfig: the read of ${key} failed (simulated)`);
    if (failAfter && failAfter.key === key) {
      if (failAfter.remaining === 0) throw new Error(`fake SystemConfig: the read of ${key} failed (simulated)`);
      failAfter.remaining--;
    }
    if (flip && flip.key === key) {
      if (flip.remaining === 0) { TABLE.set(key, flip.value); flip = null; } else flip.remaining--;
    }
    if (vanishAfter && vanishAfter.key === key) {
      if (vanishAfter.remaining === 0) { TABLE.delete(key); vanishAfter = null; } else vanishAfter.remaining--;
    }
    return TABLE.has(key) ? { key, value: clone(TABLE.get(key)) } : null;
  },
  upsert: async ({ where: { key }, update }: { where: { key: string }; update: { value: unknown } }) => {
    TABLE.set(key, clone(update.value));
    return { key, value: clone(update.value) };
  },
  deleteMany: async ({ where: { key } }: { where: { key: string } }) => ({ count: TABLE.delete(key) ? 1 : 0 }),
};

/** Any other model: answers like an empty database and records that it was asked. */
const benignModel = (model: string) => new Proxy({}, {
  get: (_target, method) => {
    if (typeof method !== "string") return undefined;
    return async (args?: { data?: unknown; create?: unknown }) => {
      noted(`${model}.${method}`);
      switch (method) {
        case "findMany": case "groupBy": return [];
        case "findFirst": case "findUnique": return null;
        case "count": return 0;
        case "aggregate": return { _sum: {}, _count: {}, _avg: {}, _min: {}, _max: {} };
        case "createMany": case "updateMany": case "deleteMany": return { count: Array.isArray(args?.data) ? args.data.length : 0 };
        case "create": case "update": return { ...((args?.data ?? {}) as object) };
        case "upsert": return { ...((args?.create ?? {}) as object) };
        default: return null;
      }
    };
  },
});

/**
 * The audit chain's table: benign — its INSERT answers like a real one, so `appendPersisted` SUCCEEDS and the row
 * is recorded (5.durable.control proves it) — except for the actions in AUDIT_FAIL, whose insert throws. The audit
 * layer then keeps the entry in its ring only (fail-open) and `audit()` resolves `recorded: false`,
 * `unrecorded: "PERSIST_FAILED"`.
 */
const auditLogModel = (() => {
  const benign = benignModel("auditLog") as Record<string, (args?: { data?: { action?: string } }) => Promise<unknown>>;
  return new Proxy({}, {
    get: (_target, method) => {
      if (method !== "create") return benign[method as string];
      return async (args?: { data?: { action?: string } }) => {
        if (args?.data?.action && AUDIT_FAIL.has(args.data.action)) {
          noted("auditLog.create(refused)");
          throw new Error(`fake AuditLog: the insert of ${args.data.action} failed (simulated)`);
        }
        return benign.create(args);
      };
    },
  });
})();

const fake: Record<string, unknown> = new Proxy({} as Record<string, unknown>, {
  get: (_target, prop) => {
    if (prop === "systemConfig") return systemConfig;
    if (prop === "auditLog") return auditLogModel;
    if (typeof prop !== "string" || prop === "then") return undefined;
    if (prop === "$transaction") {
      return async (arg: unknown) => {
        noted("$transaction");
        return typeof arg === "function" ? (arg as (tx: unknown) => unknown)(fake) : Promise.all(arg as unknown[]);
      };
    }
    if (prop === "$executeRaw" || prop === "$executeRawUnsafe") return async () => { noted(prop); return 0; };
    if (prop === "$queryRaw" || prop === "$queryRawUnsafe") return async () => { noted(prop); return []; };
    if (prop.startsWith("$")) return async () => undefined;
    return benignModel(prop);
  },
});
(globalThis as { __50PICK_PRISMA?: unknown }).__50PICK_PRISMA = fake;

let pass = 0;
const fails: string[] = [];
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`PASS ${label}`); }
  else { fails.push(label); console.log(`FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
};
const j = (v: unknown) => JSON.stringify(v);
const tick = (ms = 0) => new Promise<void>((r) => (ms ? setTimeout(r, ms) : setImmediate(r)));

// ── The rows "another container" writes. BOOT is what THIS container hydrates: every mode ON. ────────
// ⛔ No deposit-tied mode is armed here (they are retired): the bonus is the SIGN-UP bonus, the prize FIRST_BET.
// The row stays COMPLETE — exactly the fields `affiliate-rules.ts` names, no more and no fewer — so a stale
// copy of it validates exactly as the row does and a planted defect is caught for its own reason, never by a
// validation refusal. (§4 below is the one row that still arms the retired modes, on purpose.)
const BOOT = {
  enabled: true,
  commission: { enabled: true, rate: 0.5, windowMonths: 24, capPerRecruitTzs: 250_000 },
  bonus: { enabled: true, recipient: "REFERRER", newAmountTzs: 2_000, referrerAmountTzs: 5_000, trigger: "SIGNUP" },
  prize: { enabled: true, milestone: "FIRST_BET", amountTzs: 10_000, capPerReferrer: 20, minBetAmountTzs: 1_000, requireDeposit: false },
};
type Cfg = typeof BOOT;
const allOff = (c: Cfg): Cfg => ({ ...c, commission: { ...c.commission, enabled: false }, bonus: { ...c.bonus, enabled: false }, prize: { ...c.prize, enabled: false } });
const NOTHING = allOff(BOOT);                                      // "Make payable → Nothing yet", written elsewhere
const PRIZE_ONLY = { ...NOTHING, prize: { ...BOOT.prize, enabled: true } };
const BONUS_ONLY = { ...NOTHING, bonus: { ...BOOT.bonus, enabled: true } };
TABLE.set("affiliate.config", clone(BOOT));

// ── THE MODULES, NOW — and the guard's second half ───────────────────────────────────────────────────
const { prisma, hasDatabase } = await import("../src/lib/server/prisma.ts");
if (!hasDatabase() || prisma() !== (fake as unknown)) {
  console.log("FAIL 0.guard · ⛔ REFUSED — prisma() is not this suite's fake client; stopping before any module can reach a database.");
  process.exit(1);
}
const { db } = await import("../src/lib/server/store.ts");
const probe = (db.user.findById as unknown as (id: string) => unknown)("ipdb_guard_probe");
if (probe !== null && typeof (probe as { then?: unknown })?.then === "function") {
  console.log("FAIL 0.guard · ⛔ REFUSED — the store is the Prisma DAL, not the in-memory store (USE_PRISMA_DAL was not honoured).");
  process.exit(1);
}
ok("0.guard · database mode on this suite's OWN fake: prisma() is the fake, the store is in memory", true);

const { defineConfig } = await import("../src/lib/server/define-config.ts");
const SVC = await import("../src/lib/server/affiliate-service.ts");
const S = await import("../src/lib/server/invite-rewards-switch.ts");
const A = await import("../src/lib/server/affiliate-config.ts");
const C = await import("../src/lib/server/invite-rewards-ceremony.ts");
const R = await import("../src/lib/affiliate-rules.ts");
const { getAuditPage, auditFlush, audit } = await import("../src/lib/server/audit.ts");
const { mkFixtureUser, cashOf } = await import("./lib/agent-fixtures.mts");

// ════════════════════════════════════════════════════════════════════════════════════════════════════
// §1 · defineConfig.reload() — the real factory, through its `deps` seam
// ════════════════════════════════════════════════════════════════════════════════════════════════════
console.log("\n§1 · defineConfig.reload()");
{
  type Unit = { rate: number; name: string };
  const DEFAULTS: Unit = { rate: 10, name: "default" };
  type Store = { row: Unit | null; reads: number; mode: "ok" | "fail" | "throw"; delay: number; saves: unknown[]; saveDelay: number; deps: Record<string, unknown> };
  const mkStore = (row: Unit | null): Store => {
    const s: Store = { row, reads: 0, mode: "ok", delay: 0, saves: [], saveDelay: 0, deps: {} };
    s.deps = {
      hasDatabase: () => true,
      loadConfigResult: async () => {
        s.reads++;
        const seen = s.row === null ? null : clone(s.row); // a read sees the row AS IT WAS WHEN IT STARTED
        const mode = s.mode;
        if (s.delay) await tick(s.delay);
        if (mode === "fail") return { ok: false, error: "pool timeout (simulated)" };
        if (mode === "throw") throw new Error("boom (simulated)");
        return { ok: true, value: seen };
      },
      saveConfig: async (_k: string, v: unknown) => { if (s.saveDelay) await tick(s.saveDelay); s.saves.push(v); s.row = clone(v as Unit); },
    };
    return s;
  };
  let n = 0;
  const mk = (st: Store, extra: Record<string, unknown> = {}) =>
    defineConfig<Unit>({ key: `ipdb.reload.unit.${++n}`, defaults: DEFAULTS, deps: st.deps as never, ...extra });

  { // another container changed the row
    const st = mkStore({ rate: 7, name: "boot" });
    const c = mk(st);
    await tick();
    ok("1.hydrated · SETUP — the factory hydrated the boot row", c.get().rate === 7);
    st.row = { rate: 99, name: "changed elsewhere" };
    ok("1.stale · SETUP — the cache still holds the boot row: config is not propagated between containers", c.get().rate === 7);
    const r = await c.reload();
    ok("1.answer · a reload answers the row as it is NOW", r.ok === true && r.config.rate === 99, j(r));
    ok("1.replace · …and REPLACES the cache the rest of the process reads", c.get().rate === 99 && c.get().name === "changed elsewhere", j(c.get()));
  }
  { // a failed read fails closed
    const st = mkStore({ rate: 7, name: "boot" });
    const c = mk(st);
    await tick();
    st.row = { rate: 99, name: "x" };
    st.mode = "fail";
    const r = await c.reload();
    ok("1.fail · a read that could not ask answers ok:false — never the cached value", r.ok === false && /pool timeout/.test(r.error), j(r));
    ok("1.untouched · …and leaves the cache exactly as it was", c.get().rate === 7);
    st.mode = "throw";
    const r2 = await c.reload();
    ok("1.throw · a store that THROWS answers ok:false too", r2.ok === false, j(r2));
  }
  { // the same path as hydration
    const st = mkStore({ rate: 7, name: "boot" });
    const c = mk(st, { migrate: (p: Record<string, unknown>) => ({ rate: typeof p.rate === "number" && p.rate <= 50 ? p.rate : 0, name: String(p.name ?? "") }) });
    await tick();
    st.row = { rate: 900, name: "hand edit" };
    const r = await c.reload();
    ok("1.migrate · a reload goes through `migrate`, like hydration — a hand-edited 900 is repaired to 0", r.ok && r.config.rate === 0 && c.get().rate === 0, j(r));
    st.row = null;
    const r2 = await c.reload();
    ok("1.absent · an absent row reloads as the DEFAULTS — what a container booting now would hold", r2.ok && r2.config.rate === 10 && c.get().name === "default", j(r2));
  }
  { // overtaken by a local write — the two cannot be ordered, so the read answers only when they AGREE
    const st = mkStore({ rate: 7, name: "boot" });
    const c = mk(st);
    await tick();
    st.delay = 20;
    const slow = c.reload();            // reads { rate: 7 } slowly
    await tick(5);
    st.delay = 0;
    const w = await c.setVerified({ rate: 8 }, "officer");
    const r = await slow;
    ok("1.localsave · SETUP — a local verified save landed while the reload was in flight", w.ok === true, j(w));
    ok("1.overtaken · ⛔ the older read does NOT put the previous value back, and — disagreeing with the local write — answers ok:false (\"The settings changed while they were being read. Try again.\"), never either value",
      c.get().rate === 8 && r.ok === false && r.error === "The settings changed while they were being read. Try again.",
      `cache=${c.get().rate} answered=${j(r)}`);
  }
  { // overtaken, but the read and the local write AGREE — the answer is safe to give
    const st = mkStore({ rate: 7, name: "boot" });
    const c = mk(st);
    await tick();
    st.delay = 20;
    const slow = c.reload();            // reads { rate: 7, name: "boot" } slowly
    await tick(5);
    st.delay = 0;
    const w = await c.setVerified({ rate: 7, name: "boot" }, "officer");
    const r = await slow;
    ok("1.overtaken.agree · overtaken by a local write that AGREES with what it read: the reload answers ok, with the local value",
      w.ok === true && r.ok === true && r.config.rate === 7 && c.get().rate === 7, j({ w: w.ok, r }));
  }
  { // a pending fire-and-forget set()
    const st = mkStore({ rate: 7, name: "boot" });
    const c = mk(st);
    await tick();
    st.saveDelay = 20;
    const s = c.set({ rate: 12 }, "test");
    ok("1.setsync · SETUP — set() still answers synchronously (its contract)", s.ok === true);
    const r = await c.reload();
    ok("1.pending · the reload reads AFTER this process's own pending save resolved — no revert to 7",
      r.ok && r.config.rate === 12 && c.get().rate === 12 && st.saves.length === 1, j({ r, saves: st.saves.length }));
  }
  { // concurrent callers
    const st = mkStore({ rate: 7, name: "boot" });
    const c = mk(st);
    await tick();
    st.delay = 10;
    const before = st.reads;
    const [a, b, d] = await Promise.all([c.reload(), c.reload(), c.reload()]);
    ok("1.share · three concurrent reloads cost ONE store read", st.reads - before === 1 && a.ok && b.ok && d.ok, `reads=${st.reads - before}`);
  }
  { // a reload is a read that answered: it closes a de-hydrated gate
    const st = mkStore({ rate: 42, name: "persisted" });
    st.mode = "fail";
    const c = mk(st);
    await tick();
    const refused = c.set({ name: "x" }, "o");
    ok("1.dehydrated · SETUP — a factory whose boot read failed refuses set()", refused.ok === false);
    await tick();
    st.mode = "ok";
    const r = await c.reload();
    ok("1.gate · a reload that answered hydrates it — with the ROW, not the defaults", r.ok && c.get().rate === 42, j(r));
    ok("1.accepts · …and set() is accepted afterwards", c.set({ name: "y" }, "o").ok === true);
  }
  { // no database
    const st = mkStore({ rate: 7, name: "boot" });
    st.deps.hasDatabase = () => false;
    const c = mk(st);
    c.set({ rate: 3 }, "test");
    const r = await c.reload();
    ok("1.nodb · with no database a reload reads NOTHING and answers the cache", r.ok && r.config.rate === 3 && st.reads === 0, j({ r, reads: st.reads }));
  }
  { // the boot hydration must not land over a newer reload
    const st = mkStore({ rate: 7, name: "boot" });
    st.delay = 30;                       // the boot read is slow
    const c = mk(st);                    // tryHydrate starts its (slow) read of { rate: 7 }
    await tick(5);
    st.row = { rate: 55, name: "newer" };
    st.delay = 0;
    const r = await c.reload();          // a fast read of { rate: 55 }
    await tick(40);                      // the boot read lands now
    ok("1.slowboot · the slow boot read does not overwrite the newer reload", r.ok && c.get().rate === 55, `cache=${c.get().rate}`);
  }
}

// ════════════════════════════════════════════════════════════════════════════════════════════════════
// §2 · the money path on a stale container
// ════════════════════════════════════════════════════════════════════════════════════════════════════
console.log("\n§2 · the money path on a stale container");
const sealed = (payable: boolean, seq: number) =>
  S.sealInviteSwitch({ payable, seq, changedAt: new Date().toISOString(), changedBy: "ipdb_owner", reason: "Gaming Board cleared it" });
/** Make THIS process's cache hold `cfg` again — the container that booted before the change. */
const staleCache = (cfg: unknown) => { (globalThis as { __50PICK_CONFIGS?: Map<string, unknown> }).__50PICK_CONFIGS!.set("affiliate.config", clone(cfg)); };
/**
 * ⭐ THE REWARD SAVE AS THE PAGE POSTS IT (2026-09-26): `{ baseFingerprint, changes }` — the fingerprint of the
 * settings as the ROW holds them (the page re-reads the row before it fingerprints) and only the fields changed.
 * ⚠️ The base is read straight from the table, NOT through `reloadAffiliateConfig`, which would replace this
 * container's stale cache — the very thing the cases below keep stale on purpose. A throw is reported as a
 * refusal carrying the error, so a planted defect is read as that case's FAIL, never as a crashed suite.
 */
const rowFingerprint = () => R.affiliateConfigFingerprint(R.sanitizePersistedAffiliateConfig(clone(TABLE.get("affiliate.config"))) as never);
const saveOnRow = async (changes: unknown, who: string): Promise<{ ok: boolean; error?: string; warning?: string; config?: unknown }> => {
  try {
    return await C.saveInviteRewardSettings({ baseFingerprint: rowFingerprint(), changes } as never, who);
  } catch (e) {
    return { ok: false, error: `THREW: ${String((e as Error)?.message ?? e)}` };
  }
};
const readsDuring = async (fn: () => Promise<unknown>) => { const at = READS.length; await fn(); return READS.slice(at); };
const configReads = (reads: string[]) => reads.filter((k) => k === "affiliate.config").length;
const rewardsFor = async (recruit: string) => db.referralReward.listByRecruit(recruit);
const refusalsNamed = async (code: string) => {
  await auditFlush();
  return getAuditPage({ limit: 10_000 }).filter((e) => e.action === "affiliate.accrual_refused" && (e.payload as { refusal?: string } | undefined)?.refusal === code);
};
const REF = "ipdb_ref";
const bet = (recruit: string) => SVC.onRecruitBet(recruit, { stake: 5_000, houseBotId: null });
/** The sign-up bonus is paid FROM the bind (`bindRecruit` → `payBonus`), so binding IS its event. */
const signUp = async (recruit: string) => (await SVC.bindRecruit({ recruitUserId: recruit, code: CODE })).bound === true;
let CODE = "";

await tick(20); // the boot hydration of affiliate.config lands
{
  await mkFixtureUser(REF);
  CODE = (await SVC.ensureAffiliateAccount(REF)).code;
  // Bound now, while Not payable (no switch row): the boot row's sign-up bonus is refused at the switch.
  let bound = 0;
  for (let i = 1; i <= 12; i++) {
    await mkFixtureUser(`ipdb_r${i}`);
    if (await signUp(`ipdb_r${i}`)) bound++;
  }
  // Signed up LATER, inside the sign-up bonus cases.
  for (let i = 1; i <= 3; i++) await mkFixtureUser(`ipdb_s${i}`);
  const cfg = A.getAffiliateConfig();
  ok("2.boot · SETUP — database mode, this container hydrated the boot row (every mode ON, the prize TZS 10,000), and 12 friends are bound — paid nothing",
    cfg.prize.enabled === true && cfg.prize.amountTzs === 10_000 && cfg.commission.enabled === true && cfg.bonus.enabled === true && bound === 12
      && (await cashOf(REF)) === 0, j({ prize: cfg.prize, bound, cash: await cashOf(REF) }));
}

{ // NOT PAYABLE: the settings row is never read
  let reads = await readsDuring(async () => { await bet("ipdb_r1"); await SVC.accrualContextFor("ipdb_r1"); });
  ok("2.unpaid.switch · not payable (no switch row): the money path DOES read the switch…", reads.includes("invite.rewards.switch"), j(reads));
  ok("2.unpaid.reads · …but reads affiliate.config ZERO times — an unpaid platform pays nothing for the reload", configReads(reads) === 0, j(reads));
  ok("2.unpaid.zero · …and nothing is paid", (await rewardsFor("ipdb_r1")).length === 0 && (await cashOf(REF)) === 0);
  TABLE.set("invite.rewards.switch", sealed(false, 1));
  reads = await readsDuring(async () => { await bet("ipdb_r1"); await SVC.accrualContextFor("ipdb_r1"); });
  ok("2.off.reads · a stored OFF record: the switch is read, the settings still ZERO times",
    reads.includes("invite.rewards.switch") && configReads(reads) === 0, j(reads));
  TABLE.set("invite.rewards.switch", sealed(true, 2));
  process.env.FEATURE_INVITEREWARDS = "WITHDRAWN";
  try {
    reads = await readsDuring(async () => { await bet("ipdb_r1"); await SVC.accrualContextFor("ipdb_r1"); });
    ok("2.kill.reads · env WITHDRAWN over a stored ON record: no settings read, and not even a switch read",
      configReads(reads) === 0 && !reads.includes("invite.rewards.switch"), j(reads));
  } finally {
    delete process.env.FEATURE_INVITEREWARDS;
  }
}

// Another container: "Make payable → Nothing yet". The row is NOTHING, the switch ON; THIS cache is still BOOT.
TABLE.set("affiliate.config", clone(NOTHING));
TABLE.set("invite.rewards.switch", sealed(true, 3));
ok("2.stale · SETUP — this container's cache is STALE: it still says prize ON at TZS 10,000", A.getAffiliateConfig().prize.enabled === true);
{
  const ctx = await SVC.accrualContextFor("ipdb_r2");
  ok("2.price · the accrual is priced from the ROW — commission rate 0 — where the stale cache says 50%",
    ctx.ok === true && ctx.ctx.policy.rate === 0, j(ctx.ok ? ctx.ctx.policy : ctx));
  ok("2.replaced · …and the cache is REPLACED, so the hooks read the row next",
    A.getAffiliateConfig().prize.enabled === false && A.getAffiliateConfig().commission.enabled === false);

  // THE CASE: the stale cache has the prize ON, the row says Nothing yet → a qualifying first bet pays NOTHING
  staleCache(BOOT);
  const cash0 = await cashOf(REF);
  const reads = await readsDuring(() => bet("ipdb_r3"));
  ok("2.nothing · ⛔ stale cache (prize ON, TZS 10,000) + row \"Nothing yet\" → the first bet pays NOTHING",
    (await rewardsFor("ipdb_r3")).length === 0 && (await cashOf(REF)) === cash0, j(await rewardsFor("ipdb_r3")));
  ok("2.oneread · …because the payable path re-read the row, once", configReads(reads) === 1, j(reads));

  // CONTROL — the row arms the prize; a stale OFF cache must not under-pay either
  TABLE.set("affiliate.config", clone(PRIZE_ONLY));
  staleCache(NOTHING);
  const cash1 = await cashOf(REF);
  await bet("ipdb_r4");
  const r4 = await rewardsFor("ipdb_r4");
  ok("2.paid · CONTROL — row prize ON → the first bet pays ONE prize of TZS 10,000, in CASH (the zero above is not vacuous)",
    r4.length === 1 && r4[0].type === "PRIZE" && r4[0].amountTzs === 10_000 && r4[0].status === "PAID" && (await cashOf(REF)) === cash1 + 10_000,
    j(r4.map((r) => [r.type, r.status, r.amountTzs])));

  // payPrize re-reads: the prize is switched off between the accrual's read and the payer's
  flip = { key: "affiliate.config", remaining: 1, value: clone(NOTHING) };
  await bet("ipdb_r5");
  flip = null;
  ok("2.payprize · ⛔ the prize switched OFF between the accrual's read and the payer's → NO prize", (await rewardsFor("ipdb_r5")).length === 0, j(await rewardsFor("ipdb_r5")));

  // payBonus re-reads (the SIGN-UP bonus, paid from the bind itself), with its control
  TABLE.set("affiliate.config", clone(BONUS_ONLY));
  staleCache(BONUS_ONLY);
  const cash2 = await cashOf(REF);
  const s1 = await signUp("ipdb_s1");
  const b1 = await rewardsFor("ipdb_s1");
  ok("2.signup · CONTROL — row bonus ON → a friend signing up with the link pays the inviter TZS 5,000, in CASH",
    s1 && b1.length === 1 && b1[0].type === "BONUS" && b1[0].amountTzs === 5_000 && (await cashOf(REF)) === cash2 + 5_000, j(b1.map((r) => [r.type, r.amountTzs])));
  TABLE.set("affiliate.config", clone(NOTHING)); // another container switched the bonus off…
  staleCache(BONUS_ONLY);                        // …while this one still caches it ON
  const s2 = await signUp("ipdb_s2");
  ok("2.paybonus · ⛔ the bonus switched OFF in the row while this container's cache says ON → the sign-up pays NO bonus",
    s2 && (await rewardsFor("ipdb_s2")).length === 0, j(await rewardsFor("ipdb_s2")));
}

{ // a failed settings read REFUSES — never the stale cache
  TABLE.set("affiliate.config", clone(PRIZE_ONLY));
  staleCache(BOOT);
  FAIL.add("affiliate.config");
  try {
    const ctx = await SVC.accrualContextFor("ipdb_r8");
    ok("2.cfgfail.refused · ⛔ the settings row cannot be read → the accrual is REFUSED: player_config_unreadable",
      ctx.ok === false && ctx.refusal === "player_config_unreadable", j(ctx.ok ? "RESOLVED from the stale cache" : ctx.refusal));
    const before = (await refusalsNamed("player_config_unreadable")).length;
    const cash = await cashOf(REF);
    await bet("ipdb_r8");
    ok("2.cfgfail.zero · …a qualifying bet pays NOTHING, although the stale cache says prize ON", (await rewardsFor("ipdb_r8")).length === 0 && (await cashOf(REF)) === cash);
    ok("2.cfgfail.audit · …the zero is explained by an audit row", (await refusalsNamed("player_config_unreadable")).length === before + 1);
    ok("2.cfgfail.cache · …and the stale cache was NOT touched: nothing was learned from a read that failed",
      A.getAffiliateConfig().prize.enabled === true && A.getAffiliateConfig().commission.enabled === true);
  } finally {
    FAIL.delete("affiliate.config");
  }

  // the accrual's read works, the prize payer's own read fails
  failAfter = { key: "affiliate.config", remaining: 1 };
  const beforeP = (await refusalsNamed("player_config_unreadable")).length;
  await bet("ipdb_r9");
  failAfter = null;
  const afterP = await refusalsNamed("player_config_unreadable");
  ok("2.prizefail · ⛔ the prize payer's own settings read fails → NO prize", (await rewardsFor("ipdb_r9")).length === 0, j(await rewardsFor("ipdb_r9")));
  ok("2.prizeaudit · …and it is audited, hook prize", afterP.length === beforeP + 1 && (afterP[0]?.payload as { hook?: string } | undefined)?.hook === "prize", j(afterP[0]?.payload));

  // the same for the bonus payer — a sign-up whose settings read fails. The bind itself still lands:
  // the friend is counted, only the money is refused.
  TABLE.set("affiliate.config", clone(BONUS_ONLY));
  staleCache(BONUS_ONLY);
  const beforeB = (await refusalsNamed("player_config_unreadable")).length;
  let s3 = false;
  FAIL.add("affiliate.config");
  try {
    s3 = await signUp("ipdb_s3");
  } finally {
    FAIL.delete("affiliate.config");
  }
  const afterB = await refusalsNamed("player_config_unreadable");
  ok("2.bonusfail · ⛔ the bonus payer's own settings read fails → the friend is counted, NO bonus is paid, and it is audited (hook bonus)",
    s3 && (await rewardsFor("ipdb_s3")).length === 0 && afterB.length === beforeB + 1 && (afterB[0]?.payload as { hook?: string } | undefined)?.hook === "bonus", j({ s3, audit: afterB[0]?.payload }));
}

{ // FORCED — payable without a switch row: the reload still happens
  TABLE.set("invite.rewards.switch", sealed(false, 4));
  TABLE.set("affiliate.config", clone(NOTHING));
  staleCache(BOOT);
  process.env.FEATURE_INVITEREWARDS = "ACTIVE";
  try {
    const reads = await readsDuring(() => bet("ipdb_r11"));
    ok("2.forced · env ACTIVE: payment is forced on, the settings row is re-read, and the stale prize is NOT paid",
      configReads(reads) >= 1 && (await rewardsFor("ipdb_r11")).length === 0, j(reads));
  } finally {
    delete process.env.FEATURE_INVITEREWARDS;
  }
}

// ════════════════════════════════════════════════════════════════════════════════════════════════════
// §3 · the Owner's ceremony and the reward Save on a stale container
// ════════════════════════════════════════════════════════════════════════════════════════════════════
console.log("\n§3 · the ceremony and the Save on a stale container");
{
  const OWNER = "ipdb_owner";
  await mkFixtureUser(OWNER, { role: "ADMIN" });
  const OK_TOTP = { totp: "ok" as const };
  const seqNow = async () => { const s = await S.readStoredSwitchFresh(); return s.kind === "SET" ? s.seq : 0; };
  const on = async (over: Record<string, unknown> = {}) =>
    C.switchInvitePayable(OWNER, { to: "PAYABLE", reason: "Gaming Board cleared it", typed: C.INVITE_PAYABLE_WORD, start: "NOTHING", expectSeq: await seqNow(), ...over } as never, OK_TOTP);
  const stop = async () => C.switchInvitePayable(OWNER, { to: "NOT_PAYABLE", reason: "Pause for the audit", expectSeq: await seqNow() }, OK_TOTP);
  const row = () => TABLE.get("affiliate.config") as Cfg;
  const switchPayable = async () => { const s = await S.readStoredSwitchFresh(); return s.kind === "SET" && s.payable === true; };

  TABLE.set("invite.rewards.switch", sealed(false, 10));
  const ROW_7K_OFF = { ...NOTHING, prize: { ...BOOT.prize, enabled: false, amountTzs: 7_000 } };
  TABLE.set("affiliate.config", clone(ROW_7K_OFF));
  staleCache(BOOT);

  // "The settings on this page", priced from this container's STALE copy, must not arm it
  let res = await on({ start: "AS_SHOWN", pricedFingerprint: R.affiliateConfigFingerprint(BOOT as never) });
  ok("3.asshown · ⛔ a price the Owner saw from this container's STALE copy is refused against the row", !res.ok && (res as { field?: string }).field === "start", j(res));
  ok("3.untouched · …the switch stays OFF and the row is untouched (prize off, TZS 7,000)",
    !(await switchPayable()) && row().prize.enabled === false && row().prize.amountTzs === 7_000, j(row().prize));

  // the settings row cannot be read: Make payable refuses
  staleCache(BOOT);
  FAIL.add("affiliate.config");
  try {
    res = await on();
    ok("3.cfgunread · ⛔ Make payable with an unreadable settings row is refused, and invites stay Not payable",
      !res.ok && /could not be read/.test((res as { error?: string }).error ?? "") && !(await switchPayable()), j(res));
  } finally {
    FAIL.delete("affiliate.config");
  }

  // "Nothing yet" merges onto the ROW: another container's TZS 7,000 is not reverted to the stale 10,000
  TABLE.set("affiliate.config", clone({ ...ROW_7K_OFF, prize: { ...ROW_7K_OFF.prize, enabled: true } }));
  staleCache(BOOT);
  res = await on();
  ok("3.onstale · Make payable (Nothing yet) lands on a stale container", res.ok === true && (res as { changed?: boolean }).changed === true, j(res));
  // ⭐ The fake's audit table PERSISTS: the attempt row and the outcome row were durably chained, so the answer is
  // "recorded" with no warning. (If the fake silently refused audit rows, the attempt row would fail and every
  // ceremony here would be refused — §5 plants exactly that, on purpose.)
  ok("3.recorded · …and its compliance rows were durably written: recorded, no warning note",
    (res as { recorded?: boolean }).recorded === true && (res as { warn?: boolean }).warn === false && (OTHER.get("auditLog.create") ?? 0) > 0,
    j({ res, creates: OTHER.get("auditLog.create") }));
  ok("3.merged · …every mode is OFF in the ROW, and the amount stays TZS 7,000 — the stale 10,000 is not written back",
    row().prize.enabled === false && row().bonus.enabled === false && row().commission.enabled === false && row().prize.amountTzs === 7_000, j(row()));

  // Stop paying never depends on the settings row
  FAIL.add("affiliate.config");
  try {
    res = await stop();
    ok("3.stopunread · Stop paying lands even while the settings row cannot be read", res.ok === true && (res as { changed?: boolean }).changed === true && !(await switchPayable()), j(res));
  } finally {
    FAIL.delete("affiliate.config");
  }
  res = await on();
  ok("3.again · SETUP — payable again", res.ok === true && (res as { changed?: boolean }).changed === true, j(res));

  // the ROW says paused (another container), this copy says running → the Save stays locked
  TABLE.set("affiliate.config", clone({ ...row(), enabled: false }));
  staleCache({ ...row(), enabled: true });
  let sv = await saveOnRow({ prize: { amountTzs: 9_000 } }, OWNER);
  ok("3.pausedrow · a Save is LOCKED when the ROW says paused, whatever this copy says", !sv.ok && /Locked/.test((sv as { error?: string }).error ?? "") && row().prize.amountTzs === 7_000, j(sv));

  // the Save merges onto the row: the stale copy's commission ON at 50% is not resurrected
  TABLE.set("affiliate.config", clone({ ...row(), enabled: true }));
  staleCache(BOOT);
  sv = await saveOnRow({ prize: { enabled: true } }, OWNER);
  ok("3.savemerge · ⛔ a Save on a stale container lands on the ROW: prize ON at the row's TZS 7,000, commission stays OFF",
    sv.ok === true && row().prize.enabled === true && row().prize.amountTzs === 7_000 && row().commission.enabled === false, j({ sv: sv.ok, row: row() }));

  // the row cannot be read: nothing saved
  FAIL.add("affiliate.config");
  try {
    sv = await saveOnRow({ prize: { amountTzs: 1_000 } }, OWNER);
    ok("3.saveunread · ⛔ a Save with an unreadable settings row saves nothing, and says why", !sv.ok && /could not be read/.test((sv as { error?: string }).error ?? ""), j(sv));
  } finally {
    FAIL.delete("affiliate.config");
  }
  ok("3.rowkept · …and the row still holds TZS 7,000", row().prize.amountTzs === 7_000, j(row().prize));
}

// ════════════════════════════════════════════════════════════════════════════════════════════════════
// §4 · a stored row that still arms a RETIRED deposit-tied mode (2026-09-26)
// ════════════════════════════════════════════════════════════════════════════════════════════════════
// The RG policy promises "No bonus offers tied to deposit increases", so the FIRST_DEPOSIT bonus and the
// DEPOSIT_THRESHOLD prize are retired — but production's `affiliate.config` row can still hold either, written
// before the retirement. It must load with the mode OFF; the deposit hook must still refuse it OUT LOUD, which it
// can only do because the row is NOTED as it is read (the loaded config can no longer say what the row armed);
// and the note must clear once a Save rewrites the row. ⭐ Only a database row exercises the note: with no
// database nothing is ever read, which is why this case lives here and not in player-invite-unpaid §8.
console.log("\n§4 · a stored row that still arms a retired deposit-tied mode");
{
  const STALE_ROW = {
    enabled: true,
    commission: { enabled: false, rate: 0.5, windowMonths: 24, capPerRecruitTzs: 250_000 },
    bonus: { enabled: true, recipient: "REFERRER", newAmountTzs: 2_000, referrerAmountTzs: 5_000, trigger: "FIRST_DEPOSIT" },
    prize: { enabled: true, milestone: "DEPOSIT_THRESHOLD", depositThresholdTzs: 10_000, amountTzs: 10_000, capPerReferrer: 20, minBetAmountTzs: 1_000, requireDeposit: false },
  };
  TABLE.set("invite.rewards.switch", sealed(true, 50));
  TABLE.set("affiliate.config", clone(STALE_ROW));
  const loaded = await A.reloadAffiliateConfig();
  ok("4.load · the stored row loads with BOTH retired modes switched OFF, the rest of the row kept",
    loaded.ok === true && loaded.config.bonus.enabled === false && loaded.config.prize.enabled === false
      && loaded.config.bonus.referrerAmountTzs === 5_000 && loaded.config.prize.amountTzs === 10_000, j(loaded));
  const noted = A.armedRetiredDepositModes();
  ok("4.note · …and what the ROW armed is remembered: armedRetiredDepositModes() names both", noted.bonus === true && noted.prize === true, j(noted));

  const before = (await refusalsNamed("player_deposit_trigger_retired")).length;
  const cash = await cashOf(REF);
  await SVC.onRecruitDeposit("ipdb_r12", { cumulativeDepositsTzs: 7_000 });
  const after = await refusalsNamed("player_deposit_trigger_retired");
  const p = after[0]?.payload as { hook?: string; bonusOnDeposit?: boolean; prizeOnDeposit?: boolean; cumulativeDepositsTzs?: number } | undefined;
  ok("4.deposit · ⛔ a deposit on the payable path pays NOTHING and is refused out loud: player_deposit_trigger_retired {hook deposit, bonusOnDeposit, prizeOnDeposit, cumulativeDepositsTzs}",
    after.length === before + 1 && p?.hook === "deposit" && p?.bonusOnDeposit === true && p?.prizeOnDeposit === true && p?.cumulativeDepositsTzs === 7_000
      && (await rewardsFor("ipdb_r12")).length === 0 && (await cashOf(REF)) === cash, j({ rows: after.length - before, p }));

  // A Save rewrites the row without them: the note clears, and the next deposit has nothing to refuse.
  const sv = await saveOnRow({ prize: { amountTzs: 10_000 } }, "ipdb_owner");
  const cleared = A.armedRetiredDepositModes();
  const rowNow = R.retiredDepositModes(TABLE.get("affiliate.config"));
  const before2 = (await refusalsNamed("player_deposit_trigger_retired")).length;
  await SVC.onRecruitDeposit("ipdb_r7", { cumulativeDepositsTzs: 7_000 });
  ok("4.cleared · once a Save rewrites the row without them, the note clears and a deposit has nothing to refuse — and still pays nothing",
    sv.ok === true && !cleared.bonus && !cleared.prize && !rowNow.bonus && !rowNow.prize
      && (await refusalsNamed("player_deposit_trigger_retired")).length === before2 && (await rewardsFor("ipdb_r7")).length === 0,
    j({ sv: sv.ok, cleared, rowNow }));
}

// ════════════════════════════════════════════════════════════════════════════════════════════════════
// §5 · the compliance records, when the DATABASE refuses them (2026-09-27)
// ════════════════════════════════════════════════════════════════════════════════════════════════════
// ⛔ `audit()` NEVER REJECTS: a database that refuses the row keeps it in this container's memory and resolves.
// So "the attempt is on record before any write" can only be held by READING the answer: `audit()` resolves a copy
// carrying `recorded` (false, with `unrecorded: "PERSIST_FAILED"`, when the database refused the append — replan
// ruling 543), and the ceremony and the Save read it; no try/catch could see this. Planted here with the fake
// audit table refusing one action's INSERT.
console.log("\n§5 · the compliance records, when the database refuses them");
{
  const OWNER = "ipdb_owner";
  const OK_TOTP = { totp: "ok" as const };
  const seqNow = async () => { const s = await S.readStoredSwitchFresh(); return s.kind === "SET" ? s.seq : 0; };
  const on = async () => C.switchInvitePayable(OWNER, { to: "PAYABLE", reason: "Gaming Board cleared it", typed: C.INVITE_PAYABLE_WORD, start: "NOTHING", expectSeq: await seqNow() } as never, OK_TOTP);
  const stop = async () => C.switchInvitePayable(OWNER, { to: "NOT_PAYABLE", reason: "Pause for the audit", expectSeq: await seqNow() }, OK_TOTP);
  const switchPayable = async () => { const s = await S.readStoredSwitchFresh(); return s.kind === "SET" && s.payable === true; };
  const ringCount = async (action: string) => { await auditFlush(); return getAuditPage({ limit: 10_000 }).filter((e) => e.action === action).length; };
  type Res = { ok: boolean; error?: string; changed?: boolean; payable?: boolean; recorded?: boolean; warn?: boolean; note?: string | null };
  const NOT_RECORDED = "⚠️ Its compliance record could not be written — tell whoever keeps the records.";
  const ATTEMPT_UNRECORDED = "The compliance record could not be written first, so nothing changed. Try again.";
  const TERMS_NOT_RECORDED = "Saved — ⚠️ but the compliance record of the raised terms could not be written. Tell whoever keeps the records.";
  const probe = { category: "SYSTEM" as const, action: "ipdb.durable.probe", actorId: null, targetType: "Probe", targetId: "ipdb" };

  const good = await audit({ ...probe, payload: { probe: 1 } });
  AUDIT_FAIL.add("ipdb.durable.probe");
  let lost: Awaited<ReturnType<typeof audit>>;
  try {
    lost = await audit({ ...probe, payload: { probe: 2 } });
  } finally {
    AUDIT_FAIL.delete("ipdb.durable.probe");
  }
  ok("5.durable.control · CONTROL — on its normal path the fake's audit INSERT succeeds: audit() resolves recorded:true",
    good.recorded === true && good.unrecorded === undefined, j({ recorded: good.recorded, unrecorded: good.unrecorded }));
  ok("5.durable.lost · …and when the INSERT is refused it resolves — never rejects — recorded:false, unrecorded PERSIST_FAILED",
    lost.recorded === false && lost.unrecorded === "PERSIST_FAILED", j({ recorded: lost.recorded, unrecorded: lost.unrecorded }));

  TABLE.set("affiliate.config", clone(NOTHING));
  staleCache(NOTHING);
  TABLE.set("invite.rewards.switch", sealed(false, 60));
  const snapshot = () => j({ sw: TABLE.get("invite.rewards.switch"), cfg: TABLE.get("affiliate.config") });

  // (a) the ATTEMPT row is refused → nothing is written, in either direction
  AUDIT_FAIL.add("affiliate.payable.attempt");
  try {
    let before = snapshot();
    const on0 = await ringCount("affiliate.payable.on");
    let res = (await on()) as Res;
    ok("5.attempt.on · ⛔ the attempt row is not persisted: Make payable is REFUSED — 'The compliance record could not be written first, so nothing changed. Try again.' — the switch and settings rows untouched, no affiliate.payable.on row",
      !res.ok && res.error === ATTEMPT_UNRECORDED && snapshot() === before && (await ringCount("affiliate.payable.on")) === on0 && !(await switchPayable()), j(res));
    TABLE.set("invite.rewards.switch", sealed(true, 61));
    before = snapshot();
    const off0 = await ringCount("affiliate.payable.off");
    res = (await stop()) as Res;
    ok("5.attempt.off · ⛔ …and Stop paying likewise: REFUSED, the switch still Payable, no affiliate.payable.off row",
      !res.ok && res.error === ATTEMPT_UNRECORDED && snapshot() === before && (await ringCount("affiliate.payable.off")) === off0 && (await switchPayable()), j(res));
  } finally {
    AUDIT_FAIL.delete("affiliate.payable.attempt");
  }

  // (b) the OUTCOME row is refused → the act has landed and been read back: it stands, with the warning
  TABLE.set("invite.rewards.switch", sealed(false, 62));
  AUDIT_FAIL.add("affiliate.payable.on");
  let resOn: Res;
  try {
    resOn = (await on()) as Res;
  } finally {
    AUDIT_FAIL.delete("affiliate.payable.on");
  }
  ok("5.outcome.on · ⛔ the outcome row is not persisted: the switch LANDS (Payable, record #63) and the answer says the record could not be written — recorded false, a warning",
    resOn.ok && resOn.changed === true && resOn.payable === true && resOn.recorded === false && resOn.warn === true && (resOn.note ?? "").includes(NOT_RECORDED)
      && (await switchPayable()) && (await seqNow()) === 63, j(resOn));
  AUDIT_FAIL.add("affiliate.payable.off");
  let resOff: Res;
  try {
    resOff = (await stop()) as Res;
  } finally {
    AUDIT_FAIL.delete("affiliate.payable.off");
  }
  ok("5.outcome.off · ⛔ …and Stop paying: it lands (Not payable, record #64), recorded false, with the not-recorded note",
    resOff.ok && resOff.changed === true && resOff.recorded === false && (resOff.note ?? "").includes(NOT_RECORDED) && !(await switchPayable()) && (await seqNow()) === 64, j(resOff));

  // (c) a Save that RAISES the terms, whose COMPLIANCE terms row is refused → it lands, with the warning
  const again = (await on()) as Res;
  const t0 = await ringCount("affiliate.reward.terms");
  let sv = await saveOnRow({ prize: { enabled: true } }, OWNER);
  ok("5.terms.control · CONTROL — payable again, a Save that arms the prize lands with NO warning and writes its terms row",
    again.ok && sv.ok && sv.warning === undefined && (await ringCount("affiliate.reward.terms")) === t0 + 1 && (TABLE.get("affiliate.config") as Cfg).prize.enabled === true, j({ again, sv }));
  AUDIT_FAIL.add("affiliate.reward.terms");
  try {
    sv = await saveOnRow({ prize: { amountTzs: 12_000 } }, OWNER);
  } finally {
    AUDIT_FAIL.delete("affiliate.reward.terms");
  }
  ok("5.terms.lost · ⛔ a raised-terms Save whose terms row is not persisted LANDS (the row holds TZS 12,000) and says so: 'Saved — ⚠️ but the compliance record of the raised terms could not be written…'",
    sv.ok === true && sv.warning === TERMS_NOT_RECORDED && (TABLE.get("affiliate.config") as Cfg).prize.amountTzs === 12_000, j(sv));
}

// ════════════════════════════════════════════════════════════════════════════════════════════════════
// §6 · NO settings row at all (review P10, 2026-09-26)
// ════════════════════════════════════════════════════════════════════════════════════════════════════
// An absent `affiliate.config` answers the shipped DEFAULTS — the prize ON at TZS 10,000 — which nobody stored or
// saw priced. On the money path that is refused exactly like a row that cannot be read; the screens say nothing
// about money.
console.log("\n§6 · no settings row at all");
{
  TABLE.set("invite.rewards.switch", sealed(true, 70));
  TABLE.delete("affiliate.config");
  staleCache(PRIZE_ONLY);
  const ctx = await SVC.accrualContextFor("ipdb_r6");
  ok("6.absent.accrual · ⛔ NO settings row: the accrual is REFUSED player_config_unreadable — never priced from the defaults (the prize ON at TZS 10,000)",
    ctx.ok === false && ctx.refusal === "player_config_unreadable", j(ctx.ok ? ctx.ctx.policy : ctx.refusal));
  staleCache(PRIZE_ONLY);
  const cash = await cashOf(REF);
  await bet("ipdb_r6");
  ok("6.absent.zero · …and a qualifying first bet pays nothing", (await rewardsFor("ipdb_r6")).length === 0 && (await cashOf(REF)) === cash, j(await rewardsFor("ipdb_r6")));

  // the prize payer: the row is there for the accrual's read and GONE by the payer's
  TABLE.set("affiliate.config", clone(PRIZE_ONLY));
  staleCache(PRIZE_ONLY);
  const beforeP = (await refusalsNamed("player_config_unreadable")).length;
  vanishAfter = { key: "affiliate.config", remaining: 1 };
  try {
    await bet("ipdb_r10");
  } finally {
    vanishAfter = null;
  }
  const afterP = await refusalsNamed("player_config_unreadable");
  const pp = afterP[0]?.payload as { hook?: string; row?: string } | undefined;
  ok("6.absent.prize · ⛔ the row is gone by the prize payer's read: NO prize — refused and audited (hook prize, row absent)",
    (await rewardsFor("ipdb_r10")).length === 0 && afterP.length === beforeP + 1 && pp?.hook === "prize" && pp?.row === "absent", j({ rows: await rewardsFor("ipdb_r10"), audit: pp }));

  // the bonus payer: a sign-up with no row
  TABLE.delete("affiliate.config");
  staleCache(BONUS_ONLY);
  await mkFixtureUser("ipdb_s4");
  const beforeB = (await refusalsNamed("player_config_unreadable")).length;
  const s4 = await signUp("ipdb_s4");
  const afterB = await refusalsNamed("player_config_unreadable");
  const pb = afterB[0]?.payload as { hook?: string; row?: string } | undefined;
  ok("6.absent.bonus · ⛔ a sign-up with NO settings row: the friend is counted, NO bonus, and the refusal is audited (hook bonus, row absent)",
    s4 && (await rewardsFor("ipdb_s4")).length === 0 && afterB.length === beforeB + 1 && pb?.hook === "bonus" && pb?.row === "absent", j({ s4, audit: pb }));

  // the screens' "paid": nothing to promise from defaults nobody stored
  TABLE.delete("affiliate.config");
  const noRow = await S.invitePaysPlayersNow(0);
  TABLE.set("affiliate.config", clone(PRIZE_ONLY));
  const withRow = await S.invitePaysPlayersNow(0);
  ok("6.absent.screens · the screens' 'paid' is FALSE with no settings row — the defaults are not a promise — and TRUE once the row arms the prize (CONTROL)",
    noRow === false && withRow === true, j({ noRow, withRow }));
}

console.log(`\n  other tables touched in database mode (benign fakes):${[...OTHER].map(([k, v]) => `${k}×${v}`).join(", ") || "none"}`);
console.log(`\ninvite-payable-db: ${pass} passed, ${fails.length} failed`);
if (pass === 0) { console.log("⛔ 0 passed — a zero-assertion run is a SKIPPED run, never a green one."); process.exit(1); }
process.exit(fails.length ? 1 : 0);
