/**
 * test:stake-minimum-db — THE 2026-10-12 RECONCILE, ON A REAL POSTGRES. Production's stored rows, planted exactly, are
 * lowered by the first read after the deploy, written back at the new version, and the money path then takes TZS 500.
 *
 *   npm run test:stake-minimum-db     (boots the on-box Postgres through db-scratch; run it alone)
 *
 * Ali, 2026-10-12: *"turn minimum stake instead of 1k to 500, everywhere in the platform where needed"*.
 * docs/COMPLIANCE-DECISIONS.md § "2026-10-12 · The minimum stake is TZS 500 again; the minimum deposit stays TZS 1,000
 * (owner)"; docs/RULES.md §2.3.
 *
 * ⛔ WHY A DATABASE AND NOT ONLY `test:config`. `test:config` §6b calls the two reconcile functions directly, which proves
 * their arithmetic. It cannot prove the thing that moves production: that `hydrateNow` / `hydrateUpDownNow` read the
 * stored row, run the step, put the lowered value where every reader looks, and WRITE THE ROW BACK at the new version —
 * a reconcile that is right in memory and never persisted would re-run on every boot and leave the row on 1,000. Without
 * a database the store answers "no row" and the hydration path never runs at all, so on the memory store every one of
 * these lines would be green over nothing.
 *
 * SECTIONS
 *   §0  control — the planted rows really hold production's shape (1,000 at market v3, 1,000 at Up & Down v4)
 *   §1  ★ production's shape: both reads say 500, both rows are written back at v4 / v5 holding 500, the maximum, the
 *       rate profile and a per-market override are untouched, and the floor-on-read alone would NOT have done it
 *   §2  ★ the money path on that database: 499 refused as below the minimum, 500 placed
 *   §3  a deliberate narrower window (2,500 / 5,000) survives the deploy, value and row
 *   §4  an already-migrated row on 1,000 — an operator's choice made after the change — is left alone
 *
 * ⛔ NO POSTGRES IS A FAILURE, NOT A SKIP: with no `VERIFY_DATABASE_URL` it exits 3 and says what to run.
 */
import { execFileSync } from "node:child_process";
import pg from "pg";

const RAW = process.env.VERIFY_DATABASE_URL ?? "";
if (!RAW) {
  console.error(
    "!! NO DATABASE. This guard refuses to skip — a skipped guard prints green over nothing. Run it with a real Postgres:\n\n" +
    "   npm run test:stake-minimum-db\n",
  );
  process.exit(3);
}
let host = "";
try { host = new URL(RAW).hostname; } catch { /* refused below */ }
if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(host)) {
  console.error("!! refusing: this guard creates and drops a database and runs only against a loopback cluster.");
  process.exit(2);
}

const BASE = RAW.replace(/\/[^/?]*(\?.*)?$/, "");
const DB = `stake_min_${process.pid}`;
const URL_DB = `${BASE}/${DB}?connect_timeout=30`;

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra = "") => {
  cond ? pass++ : fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${extra ? ` — ${extra}` : ""}`);
};
const section = (s: string) => console.log(`\n── ${s}`);
const J = (v: unknown) => JSON.stringify(v);
/** jsonb does not keep the order an object was written in, so a stored object is compared by its sorted keys. */
const canon = (v: unknown): string =>
  v && typeof v === "object" && !Array.isArray(v)
    ? `{${Object.keys(v as object).sort().map((k) => `${JSON.stringify(k)}:${canon((v as Record<string, unknown>)[k])}`).join(",")}}`
    : JSON.stringify(v);
let appPrisma: { $disconnect(): Promise<void> } | null = null;

const admin = new pg.Client({ connectionString: RAW });
await admin.connect();
await admin.query(`DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`);
await admin.query(`CREATE DATABASE "${DB}"`);
await admin.end();

const raw = new pg.Client({ connectionString: URL_DB });
try {
  console.log(`Applying migrations to ${DB} …`);
  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: URL_DB }, stdio: "inherit", shell: process.platform === "win32",
  });

  // The DAL and the config stores read `DATABASE_URL` when first used, so it is set BEFORE the first app import.
  process.env.DATABASE_URL = URL_DB;
  process.env.USE_PRISMA_DAL = "true";
  process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";

  const { PLATFORM_MIN_STAKE, PLATFORM_MAX_STAKE } = await import("../src/lib/payout.ts");
  const MC = await import("../src/lib/server/market-config.ts");
  const UC = await import("../src/lib/server/updown-config.ts");
  const { db } = await import("../src/lib/server/store.ts");
  const { createMarket, buyPosition } = await import("../src/lib/server/market-service.ts");
  appPrisma = (await import("../src/lib/server/prisma.ts")).prisma() as never;

  await raw.connect();
  const put = (key: string, value: unknown) =>
    raw.query(`INSERT INTO "SystemConfig"(key, value, "updatedAt") VALUES ($1, $2::jsonb, now())
               ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, "updatedAt" = now()`, [key, J(value)]);
  const row = async (key: string): Promise<Record<string, any> | null> =>
    (await raw.query(`SELECT value FROM "SystemConfig" WHERE key = $1`, [key])).rows[0]?.value ?? null;
  /** The write-back is fire-and-forget, so wait for the row to say what it should — never a fixed sleep. */
  const settled = async (key: string, pred: (v: Record<string, any> | null) => boolean, ms = 15_000) => {
    const end = Date.now() + ms;
    for (;;) {
      const v = await row(key);
      if (pred(v) || Date.now() > end) return v;
      await new Promise((r) => setTimeout(r, 100));
    }
  };
  const g = globalThis as Record<string, unknown>;
  /** A new process after a deploy: the next read hydrates from the rows again. */
  const reboot = () => {
    g.__50PICK_MARKET_CONFIG_HYDRATED = false;
    g.__50PICK_UPDOWN_CONFIG_HYDRATED = false;
    g.__50PICK_UPDOWN_CONFIG = undefined;
  };
  const OVERRIDE_ID = "mkt_stake_min_override";

  // ── §0 ────────────────────────────────────────────────────────────────────────────────────────────
  section("§0 · control — production's shape, planted");
  ok("0.0 the rule this release ships: the stake minimum is 500 and the maximum 1,000,000",
    PLATFORM_MIN_STAKE === 500 && PLATFORM_MAX_STAKE === 1_000_000, `${PLATFORM_MIN_STAKE}/${PLATFORM_MAX_STAKE}`);
  await put("market.config", {
    global: { ...MC.DEFAULT_GLOBAL_CONFIG, minStake: 1_000, maxStake: 1_000_000 },
    perMarket: [[OVERRIDE_ID, { minStake: 1_000 }]],
    v: 3,
  });
  await put("updown.config", { ...UC.DEFAULT_UPDOWN_CONFIG, defaultMinStake: 1_000, defaultMaxStake: 1_000_000, v: 4 });
  const m0 = await row("market.config"), u0 = await row("updown.config");
  ok("0.1 control · the market row holds 1,000 at v3 and the Up & Down row 1,000 at v4 — exactly what production stores",
    m0?.global?.minStake === 1_000 && m0?.v === 3 && u0?.defaultMinStake === 1_000 && u0?.v === 4,
    J({ market: [m0?.global?.minStake, m0?.v], updown: [u0?.defaultMinStake, u0?.v] }));
  ok("0.2 control · the floor on read cannot lower it — `floorStakeBounds` keeps a stored 1,000 at 1,000",
    MC.floorStakeBounds({ minStake: 1_000, maxStake: 1_000_000 }).minStake === 1_000);

  // ── §1 ────────────────────────────────────────────────────────────────────────────────────────────
  section("§1 · the first read after the deploy");
  reboot();
  const gc = await MC.getGlobalConfig();
  const uc = await UC.getUpDownConfig();
  ok("1.1 ★ the polls' minimum reads 500", gc.minStake === 500, String(gc.minStake));
  ok("1.2 ★ Up & Down's product minimum reads 500", uc.defaultMinStake === 500, String(uc.defaultMinStake));
  ok("1.3 ★ the STORED value moved too — not a read-time floor over a stored 1,000",
    (await MC.getStoredStakeBounds()).minStake === 500 && (await UC.getStoredUpDownStakeDefaults()).defaultMinStake === 500);
  const m1 = await settled("market.config", (v) => v?.v === 4);
  const u1 = await settled("updown.config", (v) => v?.v === 5);
  ok("1.4 ★ the market row is written back at v4 holding 500 — the next boot does not re-run it",
    m1?.v === 4 && m1?.global?.minStake === 500, J({ v: m1?.v, minStake: m1?.global?.minStake }));
  ok("1.5 ★ the Up & Down row is written back at v5 holding 500",
    u1?.v === 5 && u1?.defaultMinStake === 500, J({ v: u1?.v, defaultMinStake: u1?.defaultMinStake }));
  ok("1.6 the maxima are untouched, on the read and in the rows",
    gc.maxStake === 1_000_000 && uc.defaultMaxStake === 1_000_000 && m1?.global?.maxStake === 1_000_000 && u1?.defaultMaxStake === 1_000_000);
  ok("1.7 nothing else in either row moved — the fee rates and Up & Down's rate profile are what was stored",
    m1?.global?.withdrawalFeeRate === MC.DEFAULT_GLOBAL_CONFIG.withdrawalFeeRate
      && canon(u1?.defaultRateProfile) === canon(UC.DEFAULT_UPDOWN_CONFIG.defaultRateProfile),
    J({ wd: m1?.global?.withdrawalFeeRate, profile: u1?.defaultRateProfile }));
  ok("1.8 a per-market override of 1,000 is an operator's per-item choice and is NOT reconciled — kept in the row and read",
    J(m1?.perMarket) === J([[OVERRIDE_ID, { minStake: 1_000 }]]) && (await MC.getEffectiveConfig(OVERRIDE_ID)).minStake === 1_000,
    J(m1?.perMarket));

  // ── §2 ────────────────────────────────────────────────────────────────────────────────────────────
  section("§2 · the money path, on this database");
  const now = new Date().toISOString();
  // The fixture shape the two-store suites write on Postgres (`scripts/lib/house-bot-world.mts`).
  await db.user.create({ id: "usr_stake_min", phoneE164: "+255740009911", email: null, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN", displayName: null, dob: null,
    region: null, acceptedTermsVersion: null, acceptedTermsAt: null, marketingOptIn: false, twoFactorEnabled: false,
    avatarDataUrl: null, recruitedBy: null, createdAt: now, updatedAt: now, lastLoginAt: null, closedAt: null } as never);
  await db.wallet.create({ id: "wal_stake_min", userId: "usr_stake_min", balance: 20_000, pending: 0, hold: 0, bonusBalance: 0,
    currency: "TZS", status: "ACTIVE", createdAt: now, updatedAt: now } as never);
  const m = await createMarket({ titleEn: "Minimum stake market", titleSw: "Soko la dau la chini", category: "macro",
    sourceUrl: "https://bot.go.tz", resolutionCriterion: "Resolves at the official date.",
    resolutionAt: new Date(Date.now() + 7 * 864e5).toISOString(), proposedBy: "test" } as never);
  const b499 = await buyPosition("usr_stake_min", { marketId: m.id, side: "YES", stake: 499 }) as { ok: boolean; reason?: string; detail?: { min?: number } };
  ok("2.1 ★ a 499 stake is refused as below the minimum, against a minimum of 500",
    !b499.ok && b499.reason === "stake_below_min" && b499.detail?.min === 500, J(b499));
  const balAfterRefusal = (await db.wallet.findByUserId("usr_stake_min"))?.balance;
  ok("2.2 …and moved no money", Number(balAfterRefusal) === 20_000, String(balAfterRefusal));
  const b500 = await buyPosition("usr_stake_min", { marketId: m.id, side: "YES", stake: 500 });
  const balAfterBet = (await db.wallet.findByUserId("usr_stake_min"))?.balance;
  ok("2.3 ★ a 500 stake is placed, and exactly 500 leaves the wallet", b500.ok && Number(balAfterBet) === 19_500,
    J({ ok: b500.ok, balance: balAfterBet }));

  // ── §3 ────────────────────────────────────────────────────────────────────────────────────────────
  section("§3 · a deliberate narrower window survives the deploy");
  await put("market.config", { global: { ...MC.DEFAULT_GLOBAL_CONFIG, minStake: 2_500, maxStake: 1_000_000 }, perMarket: [], v: 3 });
  await put("updown.config", { ...UC.DEFAULT_UPDOWN_CONFIG, defaultMinStake: 5_000, defaultMaxStake: 250_000, v: 4 });
  reboot();
  const gd = await MC.getGlobalConfig(), ud = await UC.getUpDownConfig();
  const m3 = await settled("market.config", (v) => v?.v === 4), u3 = await settled("updown.config", (v) => v?.v === 5);
  ok("3.1 ★ a stored 2,500 stays 2,500 — read and row (the row moves to v4 and keeps the value)",
    gd.minStake === 2_500 && m3?.v === 4 && m3?.global?.minStake === 2_500, J({ read: gd.minStake, row: [m3?.global?.minStake, m3?.v] }));
  ok("3.2 ★ a stored Up & Down 5,000 / 250,000 stays — read and row",
    ud.defaultMinStake === 5_000 && ud.defaultMaxStake === 250_000 && u3?.v === 5 && u3?.defaultMinStake === 5_000 && u3?.defaultMaxStake === 250_000,
    J({ read: [ud.defaultMinStake, ud.defaultMaxStake], row: [u3?.defaultMinStake, u3?.defaultMaxStake, u3?.v] }));

  // ── §4 ────────────────────────────────────────────────────────────────────────────────────────────
  section("§4 · an already-migrated 1,000 is an operator's choice");
  await put("market.config", { global: { ...MC.DEFAULT_GLOBAL_CONFIG, minStake: 1_000, maxStake: 1_000_000 }, perMarket: [], v: 4 });
  await put("updown.config", { ...UC.DEFAULT_UPDOWN_CONFIG, defaultMinStake: 1_000, defaultMaxStake: 1_000_000, v: 5 });
  reboot();
  const ge = await MC.getGlobalConfig(), ue = await UC.getUpDownConfig();
  // Nothing is written for a current version, so give a stray write-back the chance to land before reading the rows.
  await new Promise((r) => setTimeout(r, 1_000));
  const m4 = await row("market.config"), u4 = await row("updown.config");
  ok("4.1 ★ a v4 market row on 1,000 reads 1,000 and the row is not rewritten",
    ge.minStake === 1_000 && m4?.v === 4 && m4?.global?.minStake === 1_000, J({ read: ge.minStake, row: [m4?.global?.minStake, m4?.v] }));
  ok("4.2 ★ a v5 Up & Down row on 1,000 reads 1,000 and the row is not rewritten",
    ue.defaultMinStake === 1_000 && u4?.v === 5 && u4?.defaultMinStake === 1_000, J({ read: ue.defaultMinStake, row: [u4?.defaultMinStake, u4?.v] }));
} finally {
  try { await raw.end(); } catch { /* the connection may never have opened */ }
  // The app's own pool, closed before the drop, so the FORCE has nothing of ours to terminate.
  try { await appPrisma?.$disconnect(); } catch { /* nothing to close */ }
  const drop = new pg.Client({ connectionString: RAW });
  try {
    await drop.connect();
    await drop.query(`DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`);
  } catch (e) {
    console.error(`\n!! SCRATCH DATABASE NOT DROPPED — "${DB}" is still on the cluster. Drop it by hand:`);
    console.error(`!!   psql "${BASE}/postgres" -c 'DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)'`);
    console.error(`!! Reason: ${e instanceof Error ? e.message : String(e)} — the suite's own result is unaffected.`);
  } finally {
    try { await drop.end(); } catch { /* already gone */ }
  }
}

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — test:stake-minimum-db: ${pass} passed, ${fail} failed`);
if (pass === 0) { console.error("!! ZERO assertions ran — treating as failure."); process.exit(3); }
process.exit(fail === 0 ? 0 : 1);
