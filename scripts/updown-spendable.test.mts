/**
 * test:updown-spendable — UP & DOWN PRE-CHECKS A STAKE AGAINST WHAT THE BET PATH WILL TAKE (live fix, 2026-10-14;
 * S12-PLAN "Found while planning" F1).
 *
 *   npm run test:updown-spendable        the in-memory store
 *   npm run test:updown-spendable-db     the same suite on a real Postgres (boots the on-box cluster through db-scratch)
 *   npm run red:updown-spendable         --prove-red: §2's defects planted IN MEMORY, each must be caught
 *
 * 🔴 THE DEFECT. The board's balance read (`walletBalanceOf`, updown-board.ts) returned `wallet.balance` — the cash alone —
 * and the one-tap gate (`insufficientFor`, use-quick-bet.ts) disables Up and Down on it. `buyPosition` funds a stake from
 * the cash FIRST and the bonus wallet for the rest (market-service.ts, SEAM:cash), and the classic dial and the journey
 * sheet already pre-check against balance + bonus. So a player whose bonus covered the stake read "Salio halitoshi" on
 * the board and on the round page, for a bet the server would have taken.
 * ⭐ ONE FIGURE: `spendableOf` (src/lib/spendable.ts) is what the bet path states when it refuses (`balance_insufficient`,
 * `detail.balance`) and what the board pre-checks against. The bet path still decides, inside the wallet lock.
 *
 *   §1 THE BEHAVIOUR, on the store the service chose. An Up & Down round open for betting; for each wallet in the table
 *      (cash only, bonus only, both, the boundary and one shilling past it) the board's figure, the round page's figure
 *      and the client's own gate (`insufficientFor`, stake-math.ts) are compared with the REAL `buyPosition` on the same
 *      wallet: the gate refuses exactly when the bet path refuses, a bonus-funded affordable stake is offered AND placed
 *      (its bonus part recorded), and a stake one shilling past balance + bonus is refused on screen AND by the server
 *      with the same figure, moving no money. Its red is the parent commit's: there the board's figure is the cash alone.
 *   §2 THE SOURCE. `spendableOf` is defined once (src/lib/spendable.ts) and executed from its text; the board's balance read
 *      returns it; the bet path's refusal states it.
 *
 * ⛔ §1 runs on the real tree only (a planted market-service cannot be rebuilt in memory). `--prove-red` plants §2 in a copy
 * of the text held in memory, under a GREEN control in which nothing may fail.
 * ⛔ The bonus product is WITHDRAWN (feature-state.ts): a grant is minted here through the real `creditBonus` under the ON
 * state (`scripts/lib/bonus-feature-on.mts`, LAW 2), so the wallet holds a bonus exactly as a grant leaves it — never a
 * `bonusBalance` written by hand that no grant backs (the bet path would refuse to spend it).
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, relative, sep } from "node:path";
import ts from "typescript";
import pg from "pg";
import { decomment } from "./lib/decomment.mts";

const PROVE_RED = process.argv.includes("--prove-red");
const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const readRaw = (rel: string) => readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
const SPENDABLE = "src/lib/spendable.ts";
const BOARD = "src/lib/server/updown-board.ts";
const SERVICE = "src/lib/server/market-service.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra = "") => {
  cond ? pass++ : fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${!cond && extra ? ` — ${extra}` : ""}`);
};
const J = (v: unknown) => JSON.stringify(v);

/* ── §2 · the source, as a pure function of the text — so --prove-red can plant it ─────────────────────────────── */
type World = { read: (rel: string) => string | null; srcFiles: () => Array<[string, string]> };
/** A function's text, from its declaration to the next top-level declaration. */
function fnText(src: string, name: string): string {
  const at = src.search(new RegExp(`\\n(?:export )?(?:async )?function ${name}\\(`));
  if (at < 0) return "";
  const rest = src.slice(at + 1);
  const next = rest.slice(1).search(/\n(?:export |async |function |const |type |\/\*\*)/);
  return next < 0 ? rest : rest.slice(0, next + 1);
}
function runSource(world: World, log: (l: string) => void): string[] {
  const failed: string[] = [];
  const check = (id: string, cond: boolean, extra = "") => {
    log(`${cond ? "  ✓" : "  ✗"} ${id}${!cond && extra ? ` — ${extra}` : ""}`);
    if (!cond) failed.push(id);
  };
  // 2.1 · executed from its own text: the figure is balance + bonus, a missing bonus is none.
  const rawSpendable = world.read(SPENDABLE);
  let spendableOf: ((w: { balance: number; bonusBalance?: number | null }) => number) | null = null;
  if (rawSpendable) {
    try {
      const module = { exports: {} as Record<string, unknown> };
      const js = ts.transpileModule(rawSpendable, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
      new Function("require", "module", "exports", js)(() => { throw new Error("spendable.ts imports nothing"); }, module, module.exports);
      spendableOf = (module.exports.spendableOf as typeof spendableOf) ?? null;
    } catch { spendableOf = null; }
  }
  const table: Array<[{ balance: number; bonusBalance?: number | null }, number]> = [
    [{ balance: 5_000, bonusBalance: 0 }, 5_000], [{ balance: 0, bonusBalance: 2_000 }, 2_000], [{ balance: 300, bonusBalance: 1_700 }, 2_000],
    [{ balance: 1_200 }, 1_200], [{ balance: 750, bonusBalance: null }, 750],
  ];
  check("2.1 spendableOf is balance + bonus, a missing bonus counting nothing (executed from src/lib/spendable.ts)",
    !!spendableOf && table.every(([w, want]) => spendableOf!(w) === want),
    spendableOf ? J(table.map(([w]) => spendableOf!(w))) : "src/lib/spendable.ts has no spendableOf");
  // 2.2 · ONE definition in the tree.
  const DEF = /\bfunction spendableOf\(/;
  const defines = world.srcFiles().filter(([, s]) => DEF.test(decomment(s))).map(([p]) => p);
  check("2.2 ONE definition — `function spendableOf(` is defined in src/lib/spendable.ts and nowhere else",
    defines.length === 1 && defines[0] === SPENDABLE, defines.join(", ") || "none");
  // 2.3 · the board's balance read returns it, from the wallet row, and never the cash alone.
  const board = decomment(world.read(BOARD) ?? "");
  const read = fnText(board, "walletBalanceOf");
  check("2.3 the board's balance read returns spendableOf(the wallet row) — the board and the round page read it",
    /import \{ spendableOf \} from "@\/lib\/spendable";/.test(board) && /return w \? spendableOf\(w\) : null;/.test(read)
      && !/return w \? Number\(w\.balance\) : null;/.test(read) && /walletBalanceOf\(opts\?\.userId\)/.test(board) && /walletBalanceOf\(userId\)/.test(board),
    read.slice(0, 160));
  // 2.4 · the bet path states the same figure when it refuses for funds.
  const svc = decomment(world.read(SERVICE) ?? "");
  const refusal = svc.indexOf('reason: "balance_insufficient" as const,');
  const near = refusal < 0 ? "" : svc.slice(refusal, refusal + 400);
  check("2.4 the bet path's balance_insufficient refusal states spendableOf(wallet) — the figure the board pre-checks",
    /import \{ spendableOf \} from "@\/lib\/spendable";/.test(svc) && /detail: \{ balance: spendableOf\(wallet\), needed: opts\.stake \}/.test(near),
    near.slice(0, 200));
  return failed;
}

function realWorld(): World {
  const walk = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
  return {
    read: (rel) => (existsSync(join(ROOT, rel)) ? readRaw(rel) : null),
    srcFiles: () => walk(join(ROOT, "src")).map((f) => [relative(ROOT, f).split(sep).join("/"), readFileSync(f, "utf8")]),
  };
}

if (PROVE_RED) {
  const real = realWorld();
  const files = real.srcFiles();
  const planted = (rel: string, from: string, to: string): World => {
    const base = real.read(rel);
    if (base === null || base.split(from).length !== 2) throw new Error(`missing or ambiguous live anchor in ${rel}: ${from}`);
    return {
      read: (r) => (r === rel ? base.replace(from, to) : real.read(r)),
      srcFiles: () => files.map(([p, s]) => [p, p === rel ? s.replace(/\r\n/g, "\n").replace(from, to) : s]),
    };
  };
  const control = runSource(real, () => {});
  console.log(`control (the real tree): ${control.length === 0 ? "every §2 check passes" : `FAILS ${control.join(", ")}`}`);
  let missed = control.length;
  const plants: Array<[string, string, string, string, string]> = [
    ["the figure is the cash alone", SPENDABLE, "return wallet.balance + (wallet.bonusBalance ?? 0);", "return wallet.balance;", "2.1"],
    ["one shilling more than the bet path takes", SPENDABLE, "return wallet.balance + (wallet.bonusBalance ?? 0);", "return wallet.balance + (wallet.bonusBalance ?? 0) + 1;", "2.1"],
    ["the board reads the cash alone again", BOARD, "return w ? spendableOf(w) : null;", "return w ? Number(w.balance) : null;", "2.3"],
    ["a second definition beside the board", BOARD, "return w ? spendableOf(w) : null;", "return w ? spendableOf(w) : null;\n}\nfunction spendableOf(w: { balance: number }) { return w.balance;", "2.2"],
    ["the bet path states its own sum", SERVICE, "detail: { balance: spendableOf(wallet), needed: opts.stake }", "detail: { balance: realAvail + bonusAvail, needed: opts.stake }", "2.4"],
  ];
  for (const [name, rel, from, to, want] of plants) {
    const failed = runSource(planted(rel, from, to), () => {});
    const hit = failed.some((f) => f.startsWith(want));
    console.log(`${hit ? "PROVED" : "MISSED"} ${name} → ${want} (${failed.join(", ") || "nothing failed"})`);
    if (!hit) missed++;
  }
  console.log(`\nupdown-spendable red: ${plants.length} plants, ${plants.length - (missed - control.length)} caught; control ${control.length === 0 ? "green" : "RED"}`);
  process.exit(missed === 0 ? 0 : 1);
}

/* ── the store: Postgres when the cluster is offered, else memory ─────────────────────────────────────────────── */
const RAW = process.env.VERIFY_DATABASE_URL ?? "";
let DB = "", BASE = "";
let appPrisma: { $disconnect(): Promise<void> } | null = null;
if (RAW) {
  let host = "";
  try { host = new URL(RAW).hostname; } catch { /* refused below */ }
  if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(host)) {
    console.error("!! refusing: this suite creates and drops a database and runs only against a loopback cluster.");
    process.exit(2);
  }
  BASE = RAW.replace(/\/[^/?]*(\?.*)?$/, "");
  DB = `ud_spendable_${process.pid}`;
  const admin = new pg.Client({ connectionString: RAW });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`);
  await admin.query(`CREATE DATABASE "${DB}"`);
  await admin.end();
  const URL_DB = `${BASE}/${DB}?connect_timeout=30`;
  console.log(`Applying migrations to ${DB} …`);
  execFileSync("npx", ["prisma", "migrate", "deploy"], { env: { ...process.env, DATABASE_URL: URL_DB }, stdio: "inherit", shell: process.platform === "win32" });
  // The stores choose Postgres when first imported, so the URL is set BEFORE the first app import.
  process.env.DATABASE_URL = URL_DB;
  process.env.USE_PRISMA_DAL = "true";
}
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";
process.env.MARKET_SCHEDULER = "false";
process.env.HOUSE_BOT_ENGINE = "false";
delete process.env.ANTHROPIC_API_KEY;
const ON_POSTGRES = !!process.env.DATABASE_URL && process.env.USE_PRISMA_DAL !== "false";

try {
  await import("./lib/bonus-feature-on.mts");
  await import("./lib/verified-fixtures.mts");
  const { db } = await import("../src/lib/server/store.ts");
  const { buyPosition } = await import("../src/lib/server/market-service.ts");
  const { creditBonus } = await import("../src/lib/server/bonus-service.ts");
  const { getBoard, getRoundDetail } = await import("../src/lib/server/updown-board.ts");
  const UC = await import("../src/lib/server/updown-config.ts");
  const UD = await import("../src/lib/server/updown-dal.ts");
  const { openRound } = await import("../src/lib/server/updown-service.ts");
  const { seedDefaultSources, addSource } = await import("../src/lib/server/source-registry.ts");
  const { insufficientFor } = await import("../src/components/updown/stake-math.ts");
  if (ON_POSTGRES) appPrisma = (await import("../src/lib/server/prisma.ts")).prisma() as never;
  console.log(`\nstore: ${ON_POSTGRES ? `Postgres (${DB})` : "memory"}`);

  if (!ON_POSTGRES) { UD.__resetUpDownMemoryStores(); UC.__resetUpDownConfig(); }
  await seedDefaultSources();
  try { await addSource({ domain: "kitco.com", label: "Kitco", category: "crypto", rationale: "test fixture", addedBy: "system" }); } catch { /* present */ }

  /* ── an Up & Down round, open for betting ── */
  const KEY = `SPB${process.pid % 1000}`;
  const asset = await UC.createAsset({ key: KEY, symbol: "BTC/USD", nameEn: "Bitcoin", nameSw: "Bitcoin", nameZh: "比特币", iconKey: "crypto",
    priceSourceUrl: "https://www.kitco.com/price/crypto", category: "crypto", decimals: 2, minMoveTicks: 2 }, "off");
  if (!asset.ok) throw new Error(`asset: ${asset.error}`);
  await UC.setAssetEnabled(asset.data.id, true, "off");
  const chainR = await UC.createChain({ assetId: asset.data.id, durationMinutes: 5 }, "off");
  if (!chainR.ok) throw new Error(`chain: ${chainR.error}`);
  await UC.setChainState(chainR.data.id, "RUNNING", "off");
  const chain = (await UD.chainStore.get(chainR.data.id))!;
  const openIso = new Date(Date.now() - 60_000).toISOString();          // opened a minute ago, closes in four: bettable throughout
  const obs = await UD.observationStore.ensure(asset.data.id, openIso);
  await UD.observationStore.confirm(obs.id, { price: 62_000, sourceUrl: asset.data.priceSourceUrl, sourceQuotedAt: openIso, evidence: "q", confidence: 95, model: "t", rawHash: "h-spendable" });
  const round = await openRound(chain, openIso, obs.id, 62_000);
  if (!round.ok) throw new Error(`round: ${round.error}`);
  const marketId = round.data.marketId, roundId = round.data.id;
  const bounds = await UC.stakeBoundsFor(chain);
  ok("1.0 control · the round is open, on the board, and its bounds admit every stake below",
    bounds.min <= 500 && bounds.max >= 5_001, J(bounds));

  /* ── a player: cash and a bonus grant minted through the real creditBonus ── */
  let seq = 0;
  async function player(cash: number, bonus: number): Promise<string> {
    const id = `usr_spb_${process.pid}_${++seq}`;
    const now = new Date().toISOString();
    await db.user.create({ id, phoneE164: `+2557${String(process.pid % 10_000).padStart(4, "0")}${String(seq).padStart(4, "0")}`, email: null,
      passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "SW",
      displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null, marketingOptIn: false,
      twoFactorEnabled: false, avatarDataUrl: null, recruitedBy: null, createdAt: now, updatedAt: now, lastLoginAt: null, closedAt: null } as never);
    await db.wallet.create({ id: `wal_${id}`, userId: id, balance: cash, pending: 0, hold: 0, bonusBalance: 0, currency: "TZS", status: "ACTIVE", createdAt: now, updatedAt: now } as never);
    if (bonus > 0) {
      const g = await creditBonus(id, { amountTzs: bonus, source: "ADMIN", sourceRef: `spb_${id}`, wagerMultiplier: 5, notifyPlayer: false });
      if (!g.ok) throw new Error(`grant for ${id}: ${g.error}`);
    }
    return id;
  }
  const walletOf = async (id: string) => { const w = (await db.wallet.findByUserId(id))!; return { cash: Number(w.balance), bonus: Number(w.bonusBalance ?? 0) }; };

  /* ── §1 · the table: the board's gate against the real bet path, wallet by wallet ── */
  console.log("\n§1 · the board's figure, the round page's figure and the gate, against buyPosition");
  const CASES: Array<{ name: string; cash: number; bonus: number; stake: number; placed: boolean; bonusPart?: number }> = [
    { name: "cash covers the stake (control)", cash: 5_000, bonus: 0, stake: 2_000, placed: true, bonusPart: 0 },
    { name: "⭐ bonus alone covers the stake", cash: 0, bonus: 2_000, stake: 2_000, placed: true, bonusPart: 2_000 },
    { name: "⭐ cash and bonus together cover it, to the shilling", cash: 300, bonus: 1_700, stake: 2_000, placed: true, bonusPart: 1_700 },
    { name: "⛔ one shilling past cash + bonus", cash: 300, bonus: 1_700, stake: 2_001, placed: false },
    { name: "⛔ cash alone short, no bonus (control)", cash: 1_500, bonus: 0, stake: 2_000, placed: false },
    { name: "⛔ bonus alone short", cash: 0, bonus: 499, stake: 500, placed: false },
  ];
  for (const c of CASES) {
    const id = await player(c.cash, c.bonus);
    const before = await walletOf(id);
    const board = await getBoard({ assetKey: KEY, durationMinutes: 5, userId: id });
    const row = board.rounds.find((r) => r.marketId === marketId);
    const detail = await getRoundDetail(roundId, id);
    const figure = board.walletBalance;
    const gateRefuses = insufficientFor(figure, 0, c.stake);
    const res = await buyPosition(id, { marketId, side: "YES", stake: c.stake, idempotencyKey: `spb-${id}` }) as {
      ok: boolean; reason?: string; detail?: { balance?: number; needed?: number }; data?: { bonusStakeTzs?: number } };
    const after = await walletOf(id);
    const label = `${c.name} (cash ${c.cash} · bonus ${c.bonus} · stake ${c.stake})`;
    ok(`1.${seq} fixture · the wallet holds exactly that, the bonus behind a real grant · ${label}`,
      before.cash === c.cash && before.bonus === c.bonus && row?.state === "open", J({ before, state: row?.state }));
    ok(`1.${seq} the board's figure and the round page's are both cash + bonus · ${label}`,
      figure === c.cash + c.bonus && detail?.walletBalance === c.cash + c.bonus, J({ board: figure, round: detail?.walletBalance }));
    ok(`1.${seq} ★ the gate ${c.placed ? "OFFERS the bet" : "REFUSES the bet"} and the bet path ${c.placed ? "places it" : "refuses it"} — they agree · ${label}`,
      gateRefuses === !c.placed && res.ok === c.placed, J({ gateRefuses, server: res.ok ? "placed" : res.reason }));
    if (c.placed) {
      ok(`1.${seq} the stake left the wallet once, the bonus part as the bet path records it · ${label}`,
        res.data?.bonusStakeTzs === c.bonusPart && before.cash + before.bonus - (after.cash + after.bonus) === c.stake,
        J({ bonusStakeTzs: res.data?.bonusStakeTzs, before, after }));
    } else {
      ok(`1.${seq} ⛔ refused for funds, stating the SAME figure the board pre-checked, and no money moved · ${label}`,
        res.reason === "balance_insufficient" && res.detail?.balance === figure && res.detail?.needed === c.stake && J(after) === J(before),
        J({ reason: res.reason, detail: res.detail, before, after }));
    }
  }
  // After a bonus-funded bet, the next read is what is LEFT to stake — nothing — and the gate refuses the minimum.
  {
    const id = await player(0, 2_000);
    await buyPosition(id, { marketId, side: "NO", stake: 2_000, idempotencyKey: `spb-spent-${id}` });
    const board = await getBoard({ assetKey: KEY, durationMinutes: 5, userId: id });
    ok("1.after · a spent bonus leaves nothing to stake: the figure reads 0 and the minimum is refused on screen",
      board.walletBalance === 0 && insufficientFor(board.walletBalance, 0, bounds.min), J({ figure: board.walletBalance }));
  }
  {
    const board = await getBoard({ assetKey: KEY, durationMinutes: 5 });
    ok("1.guest · signed out, the figure is unknown — null, never 0 (B-1), so the gate does not arm",
      board.walletBalance === null && !insufficientFor(board.walletBalance, 0, 500));
  }

  console.log("\n§2 · the source");
  const failed2 = runSource(realWorld(), (l) => console.log(l));
  for (const id of ["2.1", "2.2", "2.3", "2.4"]) ok(`§${id} (see above)`, !failed2.some((f) => f.startsWith(id)));
} finally {
  try { await appPrisma?.$disconnect(); } catch { /* nothing to close */ }
  if (DB) {
    const drop = new pg.Client({ connectionString: RAW });
    try { await drop.connect(); await drop.query(`DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`); }
    catch (e) { console.error(`!! scratch database "${DB}" not dropped: ${e instanceof Error ? e.message : String(e)}`); }
    finally { try { await drop.end(); } catch { /* gone */ } }
  }
}

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — test:updown-spendable (${ON_POSTGRES ? "Postgres" : "memory"}): ${pass} passed, ${fail} failed`);
if (pass === 0) { console.error("!! ZERO assertions ran — treating as failure."); process.exit(3); }
process.exit(fail === 0 ? 0 : 1);
