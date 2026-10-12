/**
 * test:bet-landed-key — A LOST ANSWER CAN NEVER BECOME A SECOND BET (live fix L2, the Vodacom plan's S8-PLAN A23 item 1;
 * Ali's ruling of 2026-10-12: "fix now").
 *
 *   npm run test:bet-landed-key     (in predeploy)
 *   npm run red:bet-landed-key      (--prove-red: every source defect below is planted IN MEMORY and must be caught)
 *
 * 🔴 THE DEFECT IT CLOSES, FOR EVERY PLAYER. A bet carries an idempotency key, and the same key is the same bet: the
 * dial and the quick bet retry an unknown outcome with it. But the replay sat INSIDE the wallet lock, after every gate
 * before it, so when a bet LANDED and only its answer was lost, the same-key retry could be refused by a gate that came
 * up meanwhile — maintenance answered "Nothing has been charged" about a bet that had been charged, the dial wiped
 * itself on that terminal refusal, and its next confirm minted a fresh key: a SECOND bet. `buyPosition` now answers any
 * refusal of a keyed request (but BUSY) with the receipt of the bet the key already placed for that player.
 *
 *   §1 THE BEHAVIOUR — the real `buyPosition` on the in-memory store. A bet lands under K1. Then, under each gate in
 *      turn — maintenance, a drained rate bucket, betting closed, a cooling-off break — the same player's K1 is answered
 *      with that bet (`replayed`, its own id and `placedAt`) while a fresh key is still refused by the gate. Another
 *      player's use of K1 is never answered with it (refused by the gate, then as a conflict); a request with no key is
 *      refused as before; the wallet is debited once and the player holds one position throughout. And when the key's
 *      read fails, the answer is the unknown outcome (`system_error`), never a refusal that says nothing was charged.
 *   §2 THE SOURCE — `buyPosition` asks `landedKeyAnswer` after a keyed refusal and only then; the BUSY shed returns
 *      before it; the answer checks the owner and refuses a house stake's key; its failed read is `system_error`; and
 *      `placeHouseBet` does not ask (the house answers its key at H0).
 *   §3 THE WIRING — this suite in predeploy; its red twin declared.
 *
 * ⛔ §1 runs only on the real tree (a planted market-service cannot be rebuilt in memory); its red is the parent
 * commit's: on it §1.2, §1.7, §1.9, §1.11 and §1.12 fail — each gate's refusal returned for a key that had landed (on
 * maintenance, "Nothing has been charged"). `--prove-red` plants §2 and §3 in a copy of the text held in memory, with a
 * GREEN control (a sound rewrite) under which nothing may fail.
 */
import "./lib/verified-fixtures.mts";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { decomment } from "./lib/decomment.mts";
import { db, type StoredWallet } from "../src/lib/server/store.ts";
import { createMarket, buyPosition, getMarket } from "../src/lib/server/market-service.ts";
import { positionStore, marketStore } from "../src/lib/server/market-dal.ts";
import { setPlatformConfig } from "../src/lib/server/platform-config.ts";
import { rateCheck, rateRefund } from "../src/lib/server/rate-limit.ts";
import { coolOff } from "../src/lib/server/responsible-gambling.ts";

const PROVE_RED = process.argv.includes("--prove-red");
const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const readRaw = (rel: string) => readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
const SERVICE = "src/lib/server/market-service.ts";
/** §1 runs on whichever store the service chose — Postgres when DATABASE_URL is set and USE_PRISMA_DAL is not "false" (market-dal.ts). */
const ON_POSTGRES = !!process.env.DATABASE_URL && process.env.USE_PRISMA_DAL !== "false";
const PKG = "package.json";

type World = { read: (rel: string) => string };
const REAL: World = { read: readRaw };

/** A function's text, from `export async function <name>(` (or `async function`) to the next top-level declaration. */
function fnText(src: string, name: string): string {
  const at = src.search(new RegExp(`\\n(?:export )?async function ${name}\\(`));
  if (at < 0) return "";
  const rest = src.slice(at + 1);
  const next = rest.slice(1).search(/\n(?:export |async |function |const |type |\/\*\*)/);
  return next < 0 ? rest : rest.slice(0, next + 1);
}

function runSource(world: World, log: (l: string) => void): string[] {
  const failed: string[] = [];
  const ok = (id: string, label: string, cond: boolean, extra = "") => {
    log(`${cond ? "  ✓" : "  ✗"} ${id} ${label}${!cond && extra ? ` — ${extra}` : ""}`);
    if (!cond) failed.push(`${id} ${label}`);
  };
  const src = decomment(world.read(SERVICE));
  log("§2 the source");
  const buy = fnText(src, "buyPosition");
  const ask = buy.indexOf("landedKeyAnswer(");
  const admit = buy.indexOf("withAdmission(");
  ok("2.1", "buyPosition asks landedKeyAnswer after the bet path ran", ask > admit && admit >= 0, `admission at ${admit}, the ask at ${ask}`);
  ok("2.2", "…only for a refusal of a keyed request, and answers with it or the refusal",
    /if\s*\(\s*!r\.ok\s*&&\s*opts\.idempotencyKey\s*\)\s*return\s*\(\s*await\s+landedKeyAnswer\(\s*userId\s*,\s*opts\.idempotencyKey\s*\)\s*\)\s*\?\?\s*r\s*;/.test(buy));
  const busy = buy.indexOf("instanceof AdmissionBusy");
  const busyReturn = busy < 0 ? -1 : buy.indexOf("return", busy);
  ok("2.3", "the BUSY shed returns before it", busy >= 0 && busyReturn > busy && busyReturn < ask);
  const answer = fnText(src, "landedKeyAnswer");
  ok("2.4", "the answer checks the owner and refuses a house stake's key", /p\.userId\s*!==\s*userId/.test(answer) && /p\.houseBotId\s*!=\s*null/.test(answer));
  ok("2.5", "the answer is the bet's own receipt, marked replayed", /replayed:\s*true/.test(answer) && /placedAt:\s*p\.placedAt/.test(answer) && /positionId:\s*p\.id/.test(answer));
  ok("2.6", "a failed read answers system_error, never null", /catch\s*\{[^}]*reason:\s*"system_error"/.test(answer.replace(/\n/g, " ")));
  ok("2.7", "placeHouseBet does not ask it (the house answers its key at H0)", fnText(src, "placeHouseBet").length > 0 && !fnText(src, "placeHouseBet").includes("landedKeyAnswer"));
  log("§3 the wiring");
  const sc = (JSON.parse(world.read(PKG)) as { scripts: Record<string, string> }).scripts;
  ok("3.1", "test:bet-landed-key runs this suite", sc["test:bet-landed-key"] === "tsx scripts/bet-landed-key.test.mts");
  ok("3.2", "red:bet-landed-key is its red twin", sc["red:bet-landed-key"] === "tsx scripts/bet-landed-key.test.mts --prove-red");
  ok("3.3", "predeploy runs it", (sc.predeploy ?? "").split("&&").map((x) => x.trim()).includes("npm run test:bet-landed-key"));
  return failed;
}

// ── §1 the behaviour ───────────────────────────────────────────────────────────────────────────────────────────────────
async function runBehaviour(log: (l: string) => void): Promise<string[]> {
  const failed: string[] = [];
  const ok = (id: string, label: string, cond: boolean, extra = "") => {
    log(`${cond ? "  ✓" : "  ✗"} ${id} ${label}${!cond && extra ? ` — ${extra}` : ""}`);
    if (!cond) failed.push(`${id} ${label}`);
  };
  const now = () => new Date().toISOString();
  const player = async (id: string, phone: string) => {
    await db.user.create({
      id, phoneE164: phone, passwordHash: null, passwordSalt: null,
      failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
      displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
      marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
      createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null,
    } as never);
    await db.wallet.create({ id: `wal_${id}`, userId: id, balance: 100_000, pending: 0, hold: 0, currency: "TZS", status: "ACTIVE", createdAt: now(), updatedAt: now() } as StoredWallet);
  };
  await player("lk_a", "+255760000101");
  await player("lk_b", "+255760000102");
  const market = await createMarket({
    titleEn: "Landed-key market", titleSw: "Soko la majaribio", category: "macro",
    sourceUrl: "https://bot.go.tz", resolutionCriterion: "Resolves at the official date.",
    resolutionAt: new Date(Date.now() + 7 * 864e5).toISOString(), proposedBy: "test",
  } as never);
  const STAKE = 5_000;
  const bal = async (uid: string) => (await db.wallet.findByUserId(uid))?.balance ?? -1;
  const held = async (uid: string) => (await positionStore.listForUserAndMarket(uid, market.id)).length;
  const bet = (uid: string, key?: string) => buyPosition(uid, { marketId: market.id, side: "YES", stake: STAKE, ...(key ? { idempotencyKey: key } : {}) });
  type R = Awaited<ReturnType<typeof buyPosition>>;
  const show = (r: R) => JSON.stringify(r.ok ? { ok: true, id: r.data?.positionId, replayed: r.data?.replayed } : { ok: false, code: r.code, reason: (r as { reason?: string }).reason });
  const reasonOf = (r: R) => (r.ok ? null : (r as { reason?: string }).reason ?? null);

  log(`§1 the behaviour (the real buyPosition, ${ON_POSTGRES ? "on Postgres" : "in memory"})`);
  const K1 = "lk-key-1";
  const first = await bet("lk_a", K1);
  ok("1.1", "control: a bet under K1 lands, once", first.ok && !first.data?.replayed, show(first));
  if (!first.ok || !first.data) return [...failed, "1.1 the fixture bet did not land: nothing else can be measured"];
  const id = first.data.positionId, placedAt = first.data.placedAt;
  const isK1 = (r: R) => r.ok && r.data?.replayed === true && r.data.positionId === id && r.data.placedAt === placedAt;

  await setPlatformConfig({ maintenanceMode: true, maintenanceNote: null }, "lk_officer");
  const m1 = await bet("lk_a", K1);
  ok("1.2", "maintenance on: the same player's K1 is answered with its bet, not \"Nothing has been charged\"", isK1(m1), show(m1));
  const m2 = await bet("lk_a", "lk-key-2");
  ok("1.3", "…while a fresh key is refused for maintenance (a gate still guards a NEW bet)", reasonOf(m2) === "maintenance", show(m2));
  const m3 = await bet("lk_b", K1);
  ok("1.4", "…and another player's use of K1 is never answered with it (refused for maintenance)", !m3.ok && reasonOf(m3) === "maintenance", show(m3));
  const m4 = await bet("lk_a");
  ok("1.5", "…and a request with no key is refused as before", !m4.ok && reasonOf(m4) === "maintenance", show(m4));
  await setPlatformConfig({ maintenanceMode: false, maintenanceNote: null }, "lk_officer");
  const c1 = await bet("lk_b", K1);
  ok("1.6", "maintenance off: another player's K1 is refused as a conflict, as before", !c1.ok && reasonOf(c1) === "idempotency_key_conflict", show(c1));

  let drained = 0;
  while (rateCheck("lk_a", "bet.place").allowed) drained++;
  const r1 = await bet("lk_a", K1);
  ok("1.7", "a drained rate bucket: K1 is answered with its bet", isK1(r1), show(r1));
  const r2 = await bet("lk_a", "lk-key-3");
  ok("1.8", "…while a fresh key is told to slow down", reasonOf(r2) === "rate_limited", show(r2));
  for (let i = 0; i <= drained + 2; i++) rateRefund("lk_a", "bet.place");

  const kept = (await getMarket(market.id))?.selectionClosedAt ?? null;
  await marketStore.stamp(market.id, { selectionClosedAt: new Date(Date.now() - 60_000).toISOString() });
  const s1 = await bet("lk_a", K1);
  ok("1.9", "betting closed: K1 is answered with its bet", isK1(s1), show(s1));
  const s2 = await bet("lk_a", "lk-key-4");
  ok("1.10", "…while a fresh key is refused (selection closed)", !s2.ok && s2.code === "SELECTION_CLOSED", show(s2));
  await marketStore.stamp(market.id, { selectionClosedAt: kept });

  // The key's read fails: the in-memory positions (one Map on globalThis, shared by every copy of the store module —
  // a method patched on this file's `positionStore` would not reach the service's copy) refuse to be read, for this one
  // call. Under maintenance the gate refuses before the wallet lock, so the only read of them is the key's.
  // ⚠️ On the in-memory store only: on Postgres the read is a query this file cannot make fail, and the line says so.
  if (ON_POSTGRES) log("  · 1.11 NOT RUN on Postgres — the failed read is planted on the in-memory store (run without DATABASE_URL)");
  else {
    await setPlatformConfig({ maintenanceMode: true, maintenanceNote: null }, "lk_officer");
    const rows = (globalThis as { __50PICK_POSITIONS?: Map<string, unknown> }).__50PICK_POSITIONS;
    if (rows) (rows as unknown as { values: () => never }).values = () => { throw new Error("planted: the key's read fails"); };
    const f1 = await bet("lk_a", K1);
    if (rows) delete (rows as unknown as { values?: unknown }).values;
    ok("1.11", "the key's read failing: the answer is the unknown outcome (system_error), never the maintenance refusal", !!rows && reasonOf(f1) === "system_error", show(f1));
    await setPlatformConfig({ maintenanceMode: false, maintenanceNote: null }, "lk_officer");
  }

  await coolOff("lk_a", "1h");
  const b1 = await bet("lk_a", K1);
  ok("1.12", "a cooling-off break: K1 is answered with its bet (a replay places nothing)", isK1(b1), show(b1));
  const b2 = await bet("lk_a", "lk-key-5");
  ok("1.13", "…while a fresh key is refused for the break", !b2.ok && reasonOf(b2) === "cooling_off", show(b2));

  const a = await bal("lk_a"), b = await bal("lk_b");
  ok("1.14", "the wallet was debited once: A holds 100,000 less one stake, B untouched", a === 100_000 - STAKE && b === 100_000, `A ${a}, B ${b}`);
  const ha = await held("lk_a"), hb = await held("lk_b");
  ok("1.15", "and one bet stands: A holds K1's bet alone on the market, B none", ha === 1 && hb === 0 && (await positionStore.findByIdempotencyKey(K1))?.id === id, `A ${ha}, B ${hb}`);
  return failed;
}

// ── the run ────────────────────────────────────────────────────────────────────────────────────────────────────────────

if (!PROVE_RED) {
  console.log("bet-landed-key — live fix L2: a lost answer can never become a second bet");
  const failed = [...(await runBehaviour((l) => console.log(l))), ...runSource(REAL, (l) => console.log(l))];
  console.log(`\nBET LANDED KEY — ${failed.length === 0 ? "all checks passed" : `${failed.length} failed`}\n`);
  process.exitCode = failed.length === 0 ? 0 : 1;
} else {
  const plantIn = (file: string, from: string, to: string, base: World = REAL): World => {
    const raw = base.read(file);
    const n = raw.split(from).length - 1;
    if (n !== 1) throw new Error(`plant anchor in ${file} occurs ${n} times, not once: ${JSON.stringify(from.slice(0, 60))}`);
    const planted = raw.replace(from, to);
    return { read: (rel) => (rel === file ? planted : base.read(rel)) };
  };
  const ASK = "  if (!r.ok && opts.idempotencyKey) return (await landedKeyAnswer(userId, opts.idempotencyKey)) ?? r;\n";
  type Plant = { name: string; expect: RegExp; world: () => World };
  const plants: Plant[] = [
    { name: "buyPosition never asks (the defect as it was)", expect: /^2\.(1|2) /, world: () => plantIn(SERVICE, ASK, "") },
    { name: "it asks of a keyless request too", expect: /^2\.2 /,
      world: () => plantIn(SERVICE, ASK, "  if (!r.ok) return (await landedKeyAnswer(userId, opts.idempotencyKey ?? \"\")) ?? r;\n") },
    { name: "the owner is not checked (another player's key would be answered with that player's bet)", expect: /^2\.4 /,
      world: () => plantIn(SERVICE, "if (!p || p.userId !== userId || p.houseBotId != null) return null;", "if (!p || p.houseBotId != null) return null;") },
    { name: "a house stake's key is answered to a player", expect: /^2\.4 /,
      world: () => plantIn(SERVICE, "if (!p || p.userId !== userId || p.houseBotId != null) return null;", "if (!p || p.userId !== userId) return null;") },
    { name: "a failed read returns null (the refusal, maybe \"nothing charged\", stands)", expect: /^2\.6 /,
      world: () => plantIn(SERVICE, "    return { ok: false, error: \"We couldn't confirm this bet. Check your wallet before trying again.\", code: \"BUSY\", reason: \"system_error\" };\n", "    return null;\n") },
    { name: "the house path asks it as well", expect: /^2\.7 /,
      world: () => plantIn(SERVICE, "    { maxWaitMs: 0 });\n  } catch (err) {", "    { maxWaitMs: 0 }).then(async (x) => (x.ok ? x : (await landedKeyAnswer(botUserId, opts.idempotencyKey)) ?? x));\n  } catch (err) {") },
    { name: "predeploy without the suite", expect: /^3\.3 /, world: () => plantIn(PKG, "npm run test:bet-landed-key && ", "") },
  ];
  // ⭐ GREEN: the same rule written differently (a braced if, the answer held in a const) — nothing may fail.
  const green = plantIn(SERVICE, ASK, "  if (!r.ok && opts.idempotencyKey) return (await landedKeyAnswer(userId, opts.idempotencyKey)) ?? r;\n  // a sound comment line\n");
  let caught = 0, fail = 0;
  const ok = (label: string, cond: boolean, extra = "") => { if (!cond) fail++; console.log(`${cond ? "PROVED  " : "MISSED  "} ${label}${extra ? ` — ${extra}` : ""}`); };
  const quiet = () => {};
  const clean = runSource(REAL, quiet);
  ok("the REAL tree passes every source check", clean.length === 0, clean.join(" | "));
  const g = runSource(green, quiet);
  ok("GREEN: a sound variant passes every source check", g.length === 0, g.join(" | "));
  for (const p of plants) {
    let failures: string[];
    try { failures = runSource(p.world(), quiet); } catch (e) { ok(p.name, false, `the plant could not be made: ${(e as Error).message}`); continue; }
    const hit = failures.some((f) => p.expect.test(f));
    if (hit) caught++;
    ok(p.name, hit, hit ? "" : failures.length === 0 ? "NOTHING failed — the gate cannot see this defect" : `failed instead: ${failures.slice(0, 2).join(" | ")}`);
  }
  console.log(`\nRED CONTROL — ${caught}/${plants.length} caught${fail === 0 ? "" : ` · ${fail} FAILED`}\n`);
  process.exitCode = fail === 0 ? 0 : 1;
}
