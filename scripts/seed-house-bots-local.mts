/**
 * THE HOUSE-BOT WORLD A HUMAN CAN OPEN — Phase D's local seed (PLAN §12; 03 §D, 462-467).
 *
 *   npm run db:scratch                      # terminal 1 — leave it running, it prints the URL
 *   export DATABASE_URL='postgresql://postgres:scratch@127.0.0.1:5433/postgres'   # terminal 2
 *   npx prisma migrate deploy
 *   npm run db:seed-house-bots-local
 *   DISABLE_ADMIN_TOTP=true npm run start   # then open /admin/desk as the admin printed below
 *
 * ⛔ IT IS NOT RUN THROUGH `db:scratch --run`. That mode STOPS the cluster when its command exits, so a
 * seed wrapped in it would appear to work and leave nothing behind for the browser to open. The cluster
 * must OUTLIVE this process, which is why the key runs the seed directly and the lines above start the
 * cluster in a terminal of its own.
 *
 * ── WHY THIS EXISTS WHEN `loadWorld()` ALREADY BUILDS A WORLD ──────────────────────────────────
 * `loadWorld()` is an in-process fixture API: a suite builds a world and then does its own work in the
 * same process. This is a DIFFERENT shape — a standalone process that writes a world a DIFFERENT
 * process (`next start`, plus a human's browser) reads later. So the fixtures are reused and the
 * SERVICES are not: `world.bot()` designates through the DAL and always ends ACTIVE, and a seeded world
 * that the product could not have produced is worth nothing to look at. Every account here is
 * designated through `designateHouseBot`, started through `startHouseBot`, and the AUTO_PAUSED one gets
 * there through a REAL password change and the REAL holder hook — never by poking a status column.
 *
 * ⛔ LOOPBACK ONLY, and it refuses anything else — the refusal is `seed-admin-local.mts`'s, copied
 * rather than invented. Seeding accounts into production and signing in as one of them would revoke
 * Ali's live session (single active session), and designating a REAL player as a house bot would be a
 * money-and-consent act on a live account.
 *
 * ⛔ THE MASTER SWITCH IS LEFT OFF AND THIS SCRIPT CANNOT TURN IT ON. The owner alone turns house bets
 * on (D19/D20). The seeded world is a desk with a roster and no house money in it: 0 marked rows, which
 * is also what makes it a world you can watch the first stake appear in.
 *
 * ⛔ D19: it prints to a TERMINAL and may name the feature there.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;

const argv = process.argv.slice(2);
const AGAIN = argv.includes("--again");

// ── the refusals, before anything is imported that would open a connection ─────────────────────
const url = process.env.DATABASE_URL ?? "";
if (!url) {
  console.error("DATABASE_URL is required. Start `npm run db:scratch` in its own terminal and export the URL it prints.");
  process.exit(2);
}
if (/rlwy\.net|railway\.app|50pick\.tz|railway\.internal/i.test(url)) {
  console.error("REFUSED — that DATABASE_URL is production. This script designates house bots and seeds accounts.");
  process.exit(2);
}
if (!/@(localhost|127\.0\.0\.1)[:/]/i.test(url)) {
  console.error("REFUSED — loopback only (localhost or 127.0.0.1).");
  process.exit(2);
}
if (process.env.NODE_ENV === "production") {
  console.error("REFUSED — NODE_ENV=production.");
  process.exit(2);
}
process.env.USE_PRISMA_DAL = "true";

const { spawnSync } = await import("node:child_process");
const { dirname, join } = await import("node:path");
const { fileURLToPath } = await import("node:url");
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// ⛔ THE SCHEMA IS CHECKED WITH THE GATE THE ENGINE ITSELF USES, not with a query written here. If this
// database is not migrated, the desk would render an error instead of a world, and the operator would
// debug the page rather than the missing step.
const { houseBotSchemaReady } = await import("../src/lib/server/house-bot/schema-ready.ts");
const schema = await houseBotSchemaReady();
if (!schema.ready) {
  console.error(`REFUSED — the house schema is not ready on this database (missing tables: ${schema.missingTables.join(", ") || "none"}; missing columns: ${schema.missingColumns.join(", ") || "none"}).`);
  console.error("Run `npx prisma migrate deploy` against this DATABASE_URL first.");
  process.exit(2);
}

// ── the owner account, through the seed that already owns that job ─────────────────────────────
const admin = spawnSync("npx", ["tsx", "scripts/seed-admin-local.mts"], {
  cwd: ROOT, env: process.env, encoding: "utf8", shell: process.platform === "win32", timeout: 5 * 60_000,
});
if (admin.status !== 0) {
  console.error(`REFUSED — the admin seed failed:\n${admin.stdout ?? ""}${admin.stderr ?? ""}`);
  process.exit(1);
}
const ADMIN_PHONE = "+255700000000";
const ADMIN_PASSWORD = "QaAdmin2026!";

// ── the world ──────────────────────────────────────────────────────────────────────────────────
const { loadWorld }: Any = await import("./lib/house-bot-world.mts");
const w: Any = await loadWorld();
const D: Any = await import("../src/lib/server/house-bot/designation.ts");
const RULES: Any = await import("../src/lib/house-bot/rules.ts");
const CRYPTO: Any = await import("../src/lib/server/crypto.ts");
const HOOK: Any = await import("../src/lib/server/house-bot/holder-hook.ts");
const { MARKET_CATEGORIES }: Any = await import("../src/lib/server/market-service.ts");
const { ALLOWED_DURATIONS }: Any = await import("../src/lib/updown-durations.ts");

const existing: Any[] = await w.dal.houseBotStore.listNonRemoved();
if (existing.length > 0 && !AGAIN) {
  console.error(`REFUSED — this database already holds ${existing.length} designated account(s): ${existing.map((b: Any) => `${b.id} (${b.status})`).join(", ")}.`);
  console.error("A second world seeded silently on top of the first is the failure this refusal exists to prevent.");
  console.error("Re-run with --again to add a SECOND set of accounts, or drop the database and start over.");
  process.exit(2);
}

const officer = (await w.db.user.findByPhone(ADMIN_PHONE))?.id as string;
if (!officer) { console.error("REFUSED — the admin account was not found after its own seed ran."); process.exit(1); }

const HOLDER_PASSWORD = "Tembo-Kubwa-2026!";
const CHANGED_PASSWORD = "Tembo-Kubwa-2026-Mpya!";

/** A holder account with a real password hash — the officer flow's columns, written the officer flow's way. */
async function holder(name: string, balance: number): Promise<string> {
  const id = await w.user({ balance });
  const salt = CRYPTO.randomId(16);
  await w.setUserFields(id, {
    displayName: name,
    passwordHash: await CRYPTO.hashPassword(HOLDER_PASSWORD, salt), passwordSalt: salt,
    passwordSetAt: new Date().toISOString(), passwordSetVia: "SELF_CHANGE",
  });
  return id;
}

const CTX = {
  stakeBounds: { minTzs: 1_000, maxTzs: 1_000_000 }, betPlaceRefillPerMin: 10, chains: [],
  categories: MARKET_CATEGORIES, durations: ALLOWED_DURATIONS,
  exitRates: { polls: { freeExitGraceMinutes: 5, paidExitWindowMinutes: 0 }, updown: {} },
  pollMinLifetimeMin: 120, limits: null, bots: [],
};

async function designate(label: string, userId: string): Promise<string> {
  const r = await D.designateHouseBot({ officerId: officer, userId, label, note: null, password: HOLDER_PASSWORD, submitId: null });
  if (!r?.ok) throw new Error(`designate ${label} refused: ${JSON.stringify(r)}`);
  return r.bot.id as string;
}
async function start(botId: string): Promise<void> {
  const b = await w.dal.houseBotStore.get(botId);
  const rules = structuredClone(RULES.DEFAULT_RULES_V1(CTX));
  rules.scope.products.polls = true;
  rules.scope.categories = ["macro"];
  rules.modes.polls.fill = true;
  const saved = await w.dal.houseBotStore.saveRules(botId, b.rulesVersion, { rules, ...w.OPEN_CAPS, freqMinGapSec: 20 });
  if (!saved.ok) throw new Error(`saveRules ${botId} CAS failed`);
  const r = await D.startHouseBot({ officerId: officer, botId, rulesContext: CTX });
  if (!r?.ok) throw new Error(`start ${botId} refused: ${JSON.stringify(r)}`);
}

await w.limits();

// ── two polls, so the desk has something to look at ────────────────────────────────────────────
const markets: Array<{ id: string; title: string }> = [];
for (const title of ["Will the policy rate hold at the next meeting?", "Will the ferry route reopen this week?"]) {
  const m = await w.poll({ graceMin: 5, resolutionInMs: 3 * 86_400_000 });
  await w.prisma().$executeRawUnsafe('UPDATE "PredictionMarket" SET "titleEn" = $1, "titleSw" = $1 WHERE id = $2', title, m.id);
  markets.push({ id: m.id, title });
}
// One player with money on the board, so the market pages are not empty.
const player = await w.user({ balance: 2_000_000 });
await w.setUserFields(player, { displayName: "Local Player" });
const bet = await w.svc.buyPosition(player, { marketId: markets[0].id, side: "NO", stake: 20_000, idempotencyKey: crypto.randomUUID() });
if (!bet.ok) throw new Error(`the player's stake was refused: ${JSON.stringify(bet)}`);

// ── the four accounts, one per status a human needs to see ─────────────────────────────────────
const out: Array<{ label: string; botId: string; userId: string; want: string }> = [];

const hNew = await holder("Desk Holder · new", 3_000_000);
const botNew = await designate("Evening desk - new", hNew);
out.push({ label: "Evening desk - new", botId: botNew, userId: hNew, want: "PAUSED / NEW" });

const hActive = await holder("Desk Holder · active", 5_000_000);
const botActive = await designate("Morning desk - running", hActive);
await start(botActive);
out.push({ label: "Morning desk - running", botId: botActive, userId: hActive, want: "ACTIVE" });

// ⛔ THE AUTO_PAUSED ONE GETS THERE THE WAY THE PRODUCT GETS THERE. The holder's password really
// changes and the REAL holder hook applies it — the fingerprint recorded at designation no longer
// matches, which is the whole mechanism. A status poked into the column would seed a world the
// product could not produce, and the first thing a human would learn from it would be false.
const hChanged = await holder("Desk Holder · password changed", 4_000_000);
const botChanged = await designate("Night desk - password changed", hChanged);
await start(botChanged);
{
  const salt = CRYPTO.randomId(16);
  await w.setUserFields(hChanged, {
    passwordHash: await CRYPTO.hashPassword(CHANGED_PASSWORD, salt), passwordSalt: salt,
    passwordSetAt: new Date().toISOString(), passwordSetVia: "SELF_CHANGE",
  });
  await HOOK.onHolderAccountChanged(hChanged, "PASSWORD_SELF_CHANGE");
}
out.push({ label: "Night desk - password changed", botId: botChanged, userId: hChanged, want: "AUTO_PAUSED / PASSWORD_CHANGED" });

const hRemoved = await holder("Desk Holder · removed", 1_000_000);
const botRemoved = await designate("Weekend desk - removed", hRemoved);
await w.dal.houseBotStore.setStatus(botRemoved, {
  from: ["PAUSED"], to: "REMOVED", pauseReason: null, pausedFromStatus: null,
  removal: { byId: officer, reason: "seeded as the removed example", cause: "MANUAL" },
});
out.push({ label: "Weekend desk - removed", botId: botRemoved, userId: hRemoved, want: "REMOVED" });

// ── READ BACK from the database, never from what this script believes it wrote ─────────────────
const control = await w.dal.houseBotControlStore.get();
const [marked] = (await w.prisma().$queryRawUnsafe(`SELECT count(*)::int AS "n" FROM "Position" WHERE "houseBotId" IS NOT NULL`)) as Array<{ n: number }>;
const rows: Array<{ label: string; botId: string; userId: string; status: string; pauseReason: string | null; removedCause: string | null; fingerprintChanged: boolean }> = [];
for (const o of out) {
  const b = await w.dal.houseBotStore.get(o.botId);
  const u = await w.db.user.findById(o.userId);
  const { passwordFingerprint }: Any = await import("../src/lib/server/password-reset.ts");
  rows.push({
    label: o.label, botId: o.botId, userId: o.userId,
    status: String(b?.status), pauseReason: b?.pauseReason ?? null, removedCause: b?.removedCause ?? null,
    fingerprintChanged: passwordFingerprint(u?.passwordHash ?? "") !== b?.passwordFingerprint,
  });
}

console.log(`\n══ house bots · local world ══`);
console.log(`   database         ${url.replace(/:[^:@/]*@/, ":****@")}`);
console.log(`   master switch    ${control.enabled ? "⛔ ON — this script did not do that" : "OFF (the owner alone turns it on)"}   · off cause ${control.offCause ?? "—"}`);
console.log(`   marked rows      ${marked?.n ?? "—"}   · a desk with a roster and no house money in it yet`);
console.log(`\n   admin            ${ADMIN_PHONE} / ${ADMIN_PASSWORD}   → http://127.0.0.1:3000/admin/desk`);
console.log(`   holder password  ${HOLDER_PASSWORD}   (the night desk's holder is now ${CHANGED_PASSWORD})`);
console.log(`\n   accounts (read back from the database):`);
for (const r of rows) {
  console.log(`     ${r.status.padEnd(12)} ${r.pauseReason ? `(${r.pauseReason})`.padEnd(20) : r.removedCause ? `(${r.removedCause})`.padEnd(20) : "".padEnd(20)} ${r.label}`);
  console.log(`       bot ${r.botId} · holder ${r.userId}${r.fingerprintChanged ? " · ⚠️ the consent fingerprint no longer matches the holder's password (that is why it is paused)" : ""}`);
}
console.log(`\n   markets:`);
for (const m of markets) console.log(`     ${m.id}  ${m.title}`);
console.log(`     player ${player} holds a NO stake on the first one`);
console.log(`\n   next: DISABLE_ADMIN_TOTP=true npm run start   — then sign in and open /admin/desk\n`);
process.exit(0);
