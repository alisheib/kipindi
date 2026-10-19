/**
 * One store's run of `test:message-titles` (the Vodacom plan's S12, WP12 and WP13). The two-store runner starts this file
 * twice — the memory store, then a fresh scratch Postgres with every migration applied — because every store picks its
 * backend when it is first imported, so a store is a process. `HB_MONEY_STORE` names the store; every line carries it.
 * `red:message-titles` runs it on the memory store alone, once per planted defect.
 *
 * WHAT IT HOLDS. A message that leaves the site — a bell row and its push, a player's letter, the share picture, the win
 * card, the share preview — carries a market's OFFICER-APPROVED SHORT TITLE only once the new journey is ACTIVE for
 * everyone (the S15 flip), and the full title until then and on any failure:
 *   §A  the rule (`messageTitle` / `messageTitles`, lib/markets/short-title.ts): off returns the caller's own title
 *       untouched; on is exactly what a card shows (`cardTitle`), each language its own, never another's.
 *   §B  the switch (`shortTitlesInMessagesNow`, lib/server/message-titles.ts): true only when the rollout is ACTIVE; the
 *       shipped STAFF_PREVIEW ceiling answers no without reading the switch's row; every failure answers no.
 *   §C  every call site, driven through the real services on the real store, in four switch states — STAFF_PREVIEW (as
 *       shipped), WITHDRAWN, the switch's read failing, and ACTIVE: the bet receipt, the sale, the closing-soon and
 *       settled watcher alerts, betting closed, the verdict, the win, the loss, the one-sided refund, the void refund and
 *       the cancellation — eleven emitters, seven player letters, two subjects. Three twins: a market with all three
 *       short titles (S), one with an English short title only (P), one with none (N). Off, S and P read byte for byte
 *       as N; at ACTIVE, S reads as N with each language's short title where its full one stood, P only in English, and
 *       N as it read before the flip. An Up & Down round keeps its round title even with short titles forced onto its
 *       row, and the officers' cancellation copies keep the full English question.
 *   §D  the share surfaces in the same four states: the OG card, its win variant, the win card's projection
 *       (`resolveWinShareToken`) and the market page's share metadata (`generateMetadata`, run from its own source).
 *
 * FIXTURES, EACH DECLARED: users and wallets are written to the store directly (a confirmed address, so player letters go
 * out), the seed cash booked as a deposit; markets are made by `createMarket` with the officer's short titles (the
 * wizard's own path); betting closes by the market's `selectionClosedAt` stamped into the past (a fixture of TIME); the
 * round's outcome is stamped the way `updown-service.ts` stamps it, then settled by `settleMarket`; the round's forced
 * short titles go through the narrow writer `marketStore.setShortTitles` (a fixture of STATE: `createMarket` and the
 * admin edit both refuse one on a round). `next/og`'s ImageResponse is replaced by a recorder, so the card's words are
 * read from the element tree the real handler builds.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createRequire } from "node:module";
import NodeModule from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type Any = any;
type L = "en" | "sw" | "zh";
const LANGS: L[] = ["en", "sw", "zh"];
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const STORE = process.env.HB_MONEY_STORE ?? "memory";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) pass++; else fail++;
  console.log(`${cond ? "PASS" : "FAIL"} [${STORE}] ${label}${detail ? ` — ${detail}` : ""}`);
};
const j = (v: unknown) => JSON.stringify(v);
const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

// ── 0 · the guard, before any repo module is loaded ─────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV === "production") { console.log("FAIL 0.guard · REFUSED — NODE_ENV=production"); process.exit(1); }
{
  const url = process.env.DATABASE_URL ?? "";
  let host = "";
  try { host = url ? new URL(url).hostname : ""; } catch { host = "?"; }
  if (url && !["127.0.0.1", "localhost", "::1", "[::1]"].includes(host)) {
    console.log("FAIL 0.guard · REFUSED — this suite writes to its store and runs only on memory or a loopback scratch database");
    process.exit(1);
  }
}
process.env.SESSION_SECRET ??= "s12f-message-titles-session-secret-0123456789";
process.env.MARKET_SCHEDULER = "false";
process.env.EMAIL_OUTBOX_CAPTURE = "1";
process.env.HOUSE_BOT_ENGINE = "false";
delete process.env.FEATURE_SIMPLEJOURNEY;

const req = createRequire(import.meta.url);

/* The share picture's renderer, recorded: the real handler builds its element tree and hands it to this. */
{
  const at = req.resolve("next/og");
  const stub = new NodeModule(at);
  stub.filename = at; stub.loaded = true;
  stub.exports = { ImageResponse: class { el: unknown; constructor(el: unknown) { this.el = el; } } };
  (req.cache as Record<string, unknown>)[at] = stub;
}

const svc: Any = req("../../src/lib/server/market-service.ts");
const mdal: Any = req("../../src/lib/server/market-dal.ts");
const { db }: Any = req("../../src/lib/server/store.ts");
const notif: Any = req("../../src/lib/server/notification-service.ts");
const mail: Any = req("../../src/lib/server/email.ts");
const watch: Any = req("../../src/lib/server/watchlist-service.ts");
const share: Any = req("../../src/lib/server/share-token.ts");
const sw: Any = req("../../src/lib/server/simple-journey-switch.ts");
const { shortTitlesInMessagesNow }: Any = req("../../src/lib/server/message-titles.ts");
const st: Any = req("../../src/lib/markets/short-title.ts");
const { localizedText, pickLocalized }: Any = req("../../src/lib/localized.ts");
const { postLedgerEntries, depositEntries }: Any = req("../../src/lib/server/ledger.ts");
const route: Any = req("../../src/app/api/og/market/[id]/route.tsx");
const preview: Any = req("../../src/lib/markets/share-preview.ts");
const { shownPredictors }: Any = req("../../src/lib/markets/predictors.ts");
const { formatTzs }: Any = req("../../src/lib/utils.ts");
const { dict }: Any = req("../../src/lib/i18n-dict.ts");
const esbuild = req("esbuild") as { transformSync: (c: string, o: { loader: string }) => { code: string } };
const onPostgres = !!process.env.DATABASE_URL && process.env.USE_PRISMA_DAL !== "false";

/* ══ THE FIXTURES ═══════════════════════════════════════════════════════════════════════════════════════════════════
 * One question in three languages, each under every room a notice or a subject cuts a title to (40 is the smallest),
 * so a title is quoted whole and a substitution is exact; and its officer-approved short titles. */
const FULL: Record<L, string> = { en: "Will Simba win the derby on Sunday?", sw: "Je, Simba itashinda dabi Jumapili?", zh: "辛巴会赢得周日的德比吗？" };
const SHORT: Record<L, string> = { en: "Simba wins the derby?", sw: "Je, Simba atashinda dabi?", zh: "辛巴赢德比？" };
type Kind = "S" | "P" | "N";
const KINDS: Kind[] = ["S", "P", "N"];
/** S: all three short titles · P: an English one only · N: none. */
const SHORTS: Record<Kind, Partial<Record<L, string>>> = { S: SHORT, P: { en: SHORT.en }, N: {} };
const ROUND_FULL: Record<L, string> = { en: "Bitcoin Up or Down · 15 min", sw: "Bitcoin Juu au Chini · dakika 15", zh: "比特币涨跌 · 15 分钟" };
const ROUND_FORCED: Record<L, string> = { en: "Bitcoin goes up?", sw: "Je, Bitcoin itapanda?", zh: "比特币会涨吗？" };
/** Every player role in a kind's markets: A backs YES and wins, B backs NO and loses, C sells in the free window, W
 *  watches, D is alone on a one-sided market, E holds a voided one, F a cancelled one. */
const ROLES = ["A", "B", "C", "W", "D", "E", "F"] as const;
type Role = (typeof ROLES)[number];
/** The bell rows and the player letters each role is owed — the census of §C. */
const ROWS: Record<Role, string[]> = {
  A: ["BET_PLACED", "SELECTION_CLOSED", "VERDICT", "WIN"], B: ["BET_PLACED", "SELECTION_CLOSED", "VERDICT", "LOSS"],
  C: ["BET_PLACED", "WIN"], W: ["WATCHLIST", "WATCHLIST"], D: ["BET_PLACED", "VERDICT", "REFUND"], E: ["BET_PLACED", "VERDICT", "REFUND"], F: ["BET_PLACED", "REFUND"],
};
const LETTERS: Record<Role, string[]> = {
  A: ["bet-placed", "selection-closed", "win"], B: ["bet-placed", "selection-closed", "loss"], C: ["bet-placed", "cashout"], W: [],
  D: ["bet-placed", "one-sided-refund"], E: ["bet-placed"], F: ["bet-placed", "market-cancelled-refund"],
};

let seq = 0;
const uid = (p: string) => `${p}_${process.pid}_${++seq}`;
const iso = (msFromNow = 0) => new Date(Date.now() + msFromNow).toISOString();

/** A player (or officer) with cash, a confirmed address — so player letters go out — and the seed booked as a deposit. */
async function user(p: string, role = "PLAYER", balance = 50_000): Promise<string> {
  const id = uid(p);
  const now = iso();
  await db.user.create({
    id, phoneE164: `+2557${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`, email: `${id}@t.tz`,
    passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role, status: "ACTIVE", locale: "EN", displayName: null, dob: null, region: null,
    acceptedTermsVersion: null, acceptedTermsAt: null, marketingOptIn: false, twoFactorEnabled: false,
    avatarDataUrl: null, recruitedBy: null, createdAt: now, updatedAt: now, lastLoginAt: null, closedAt: null,
  });
  await db.wallet.create({
    id: `wal_${id}`, userId: id, balance, pending: 0, hold: 0, bonusBalance: 0,
    currency: "TZS", status: "ACTIVE", createdAt: now, updatedAt: now,
  });
  if (balance > 0) await postLedgerEntries(`seed_${id}`, depositEntries({ txnId: `seed_${id}`, userId: id, amount: balance, provider: "TEST_SEED" }));
  await db.user.update(id, { emailVerifiedAt: now });
  return id;
}

/** Move a position's placement into the past — a fixture of TIME, the house-bot world's own (`house-bot-world.mts`). */
async function backdate(positionId: string, byMs: number): Promise<void> {
  if (onPostgres) {
    const { prisma }: Any = req("../../src/lib/server/prisma.ts");
    await prisma()!.$executeRawUnsafe(`UPDATE "Position" SET "placedAt" = "placedAt" - ($1::int * interval '1 millisecond') WHERE "id" = $2`, byMs, positionId);
  } else {
    const p = await mdal.positionStore.get(positionId);
    p.placedAt = new Date(Date.parse(p.placedAt) - byMs).toISOString();
  }
}

async function until<T>(read: () => Promise<T>, done: (v: T) => boolean, ms = 15_000): Promise<T> {
  let v = await read();
  for (let waited = 0; !done(v) && waited < ms; waited += 50) { await sleep(50); v = await read(); }
  return v;
}

const OFFICERS = { a: "", b: "" };
let switchSeq = 0;
/** A sealed Owner record, written through the switch's own store (the memory row, or the SystemConfig row on Postgres). */
async function writeCap(cap: "WITHDRAWN" | "STAFF_PREVIEW" | "ACTIVE"): Promise<boolean> {
  const r = await sw.writeJourneySwitchVerified({
    cap, links: [], seq: ++switchSeq, changedAt: new Date().toISOString(), changedBy: OFFICERS.a || "usr_owner",
    reason: `test:message-titles sets ${cap}`,
  });
  return r.ok === true;
}

/* ══ §A · THE RULE ═════════════════════════════════════════════════════════════════════════════════════════════════ */
function sectionA() {
  console.log("\n§A · the rule — off, the caller's own title untouched; on, exactly what a card shows");
  const m = { titleEn: FULL.en, titleSw: FULL.sw, titleZh: FULL.zh, shortTitleEn: SHORT.en, shortTitleSw: SHORT.sw, shortTitleZh: SHORT.zh };
  const partial = { ...m, shortTitleSw: null, shortTitleZh: null };
  const none = { ...m, shortTitleEn: null, shortTitleSw: null, shortTitleZh: null };
  const full = localizedText(FULL.en, FULL.sw, FULL.zh);
  ok("A.1 · off: `messageTitles` returns the very object it was handed, and `messageTitle` the very string — on a market that HAS short titles",
    st.messageTitles(false, full, m) === full && LANGS.every((l) => st.messageTitle(false, l, full[l], m) === full[l]));
  ok("A.2 · anything but exactly `true` is off (a truthy word, 1, undefined, null, \"true\")",
    [("ACTIVE" as unknown), 1, undefined, null, "true"].every((on) => st.messageTitles(on as boolean, full, m) === full && st.messageTitle(on as boolean, "sw", FULL.sw, m) === FULL.sw));
  const on = st.messageTitles(true, full, m);
  ok("A.3 · on: each language's officer-approved short title", j(on) === j(SHORT), j(on));
  ok("A.4 · on IS the card's rule — `cardTitle`, language by language, for all three markets",
    [m, partial, none].every((x) => LANGS.every((l) => st.messageTitles(true, full, x)[l] === st.cardTitle(l, x).text && st.messageTitle(true, l, full[l], x) === st.cardTitle(l, x).text)));
  const p = st.messageTitles(true, full, partial);
  ok("A.5 · ⛔ no cross-language fallback: an English short title only — English carries it, Swahili and Chinese keep their FULL titles",
    p.en === SHORT.en && p.sw === FULL.sw && p.zh === FULL.zh, j(p));
  const n = st.messageTitles(true, full, none);
  ok("A.6 · no short title: on reads byte for byte as off", j(n) === j(full), j(n));
  const blank = { titleEn: FULL.en, titleSw: "", titleZh: null, shortTitleEn: null, shortTitleSw: null, shortTitleZh: null };
  const bf = localizedText(blank.titleEn, blank.titleSw, blank.titleZh);
  ok("A.7 · a blank translation and no short title: on reads exactly as the bell reads today (`localizedText` and `pickLocalized` are one rule)",
    j(st.messageTitles(true, bf, blank)) === j(bf) && LANGS.every((l) => bf[l] === pickLocalized(l, blank.titleEn, blank.titleSw, blank.titleZh)), j(bf));
}

/* ══ §B · THE SWITCH ═══════════════════════════════════════════════════════════════════════════════════════════════ */
async function sectionB() {
  console.log("\n§B · the switch — yes only at ACTIVE; the shipped ceiling reads nothing; every failure answers no");
  let reads = 0;
  const injected = (answer: () => Promise<Any>) => sw.__setJourneySwitchStoreForTests({ hasDatabase: () => true, loadConfigResult: async () => { reads++; return answer(); } });
  const sealedRow = (cap: string) => sw.sealJourneySwitch({ cap, links: [], seq: 1, changedAt: new Date().toISOString(), changedBy: "usr_owner", reason: "test:message-titles" });
  const absent = async () => ({ ok: true, value: null });
  const env = (v: string | undefined) => { if (v === undefined) delete process.env.FEATURE_SIMPLEJOURNEY; else process.env.FEATURE_SIMPLEJOURNEY = v; };

  env(undefined); reads = 0;
  injected(async () => ({ ok: true, value: sealedRow("ACTIVE") }));
  const shipped = await shortTitlesInMessagesNow();
  ok("B.1 · the shipped STAFF_PREVIEW ceiling: no — even over an Owner record saying ACTIVE — and the switch's row is never read",
    shipped === false && reads === 0, `answer ${shipped}, reads ${reads}`);
  env("STAFF_PREVIEW"); reads = 0;
  ok("B.1b · a STAFF_PREVIEW ceiling set in the environment: no, nothing read", (await shortTitlesInMessagesNow()) === false && reads === 0);
  env("WITHDRAWN"); reads = 0;
  ok("B.2 · a WITHDRAWN ceiling: no, nothing read", (await shortTitlesInMessagesNow()) === false && reads === 0);
  env("ACTIVE"); reads = 0;
  injected(absent);
  const yes = await shortTitlesInMessagesNow();
  ok("B.3 · an ACTIVE ceiling and no Owner record: YES — and the row was read", yes === true && reads >= 1, `answer ${yes}, reads ${reads}`);
  const caps: Array<[string, boolean]> = [["STAFF_PREVIEW", false], ["WITHDRAWN", false], ["ACTIVE", true]];
  const capAnswers: string[] = [];
  for (const [cap, want] of caps) {
    injected(async () => ({ ok: true, value: sealedRow(cap) }));
    const got = await shortTitlesInMessagesNow();
    if (got !== want) capAnswers.push(`${cap}→${got}`);
  }
  ok("B.4 · an ACTIVE ceiling under the Owner's cap: no at STAFF_PREVIEW and at WITHDRAWN (the kill), yes only at ACTIVE", capAnswers.length === 0, capAnswers.join(" "));
  injected(async () => { throw new Error("simulated: the SystemConfig read failed"); });
  const threw = await shortTitlesInMessagesNow();
  injected(async () => ({ ok: false, error: "simulated" }));
  const refused = await shortTitlesInMessagesNow();
  ok("B.5 · an ACTIVE ceiling and the switch's read failing (a throw, a refusal): no — the full title", threw === false && refused === false, `${threw} ${refused}`);
  const bad = [{ token: "not-a-seal" }, { token: "x.y" }, { token: sealedRow("ACTIVE").token, extra: 1 }, "ACTIVE", { cap: "ACTIVE" }];
  const malformed: string[] = [];
  for (const value of bad) {
    injected(async () => ({ ok: true, value }));
    if ((await shortTitlesInMessagesNow()) !== false) malformed.push(j(value).slice(0, 40));
  }
  ok("B.6 · an ACTIVE ceiling over a row that is not a correctly sealed record: no", malformed.length === 0, malformed.join(" | "));
  const garbage: string[] = [];
  for (const v of ["active", " ACTIVE", "ACTIVE ", "Active", "1", "true"]) {
    env(v);
    injected(async () => ({ ok: true, value: sealedRow("ACTIVE") }));
    if ((await shortTitlesInMessagesNow()) !== false) garbage.push(j(v));
  }
  ok("B.7 · a mistyped FEATURE_SIMPLEJOURNEY is the shipped ceiling: no", garbage.length === 0, garbage.join(" "));
  // The real store — the memory row, or the SystemConfig row on Postgres — read by the switch's own reader.
  env("ACTIVE");
  sw.__setJourneySwitchStoreForTests(null);
  const realAbsent = await shortTitlesInMessagesNow();
  const killed = (await writeCap("WITHDRAWN")) && (await shortTitlesInMessagesNow()) === false;
  const previewCap = (await writeCap("STAFF_PREVIEW")) && (await shortTitlesInMessagesNow()) === false;
  const back = (await writeCap("ACTIVE")) && (await shortTitlesInMessagesNow()) === true;
  ok(`B.8 · the real store (${onPostgres ? "the SystemConfig row" : "the memory row"}): ACTIVE with no record is yes; the Owner's kill and a preview cap are no at once; ACTIVE again is yes`,
    realAbsent === true && killed && previewCap && back, j({ realAbsent, killed, previewCap, back }));
  env(undefined);
  sw.__setJourneySwitchStoreForTests(null);
}

/* ══ §C · THE CALL SITES ═══════════════════════════════════════════════════════════════════════════════════════════ */
type State = "STAFF_PREVIEW" | "WITHDRAWN" | "READ_FAILS" | "ACTIVE";
const STATES: State[] = ["STAFF_PREVIEW", "WITHDRAWN", "READ_FAILS", "ACTIVE"];

/** Put the switch in one state. Every state but ACTIVE must leave every message with its full title. */
async function setState(s: State): Promise<void> {
  sw.__setJourneySwitchStoreForTests(null);
  if (s === "STAFF_PREVIEW") {
    // As shipped — and over an Owner record saying ACTIVE, so a switch that ignored the ceiling would show.
    delete process.env.FEATURE_SIMPLEJOURNEY;
    await writeCap("ACTIVE");
  } else if (s === "WITHDRAWN") {
    process.env.FEATURE_SIMPLEJOURNEY = "WITHDRAWN";
    await writeCap("ACTIVE");
  } else if (s === "READ_FAILS") {
    process.env.FEATURE_SIMPLEJOURNEY = "ACTIVE";
    sw.__setJourneySwitchStoreForTests({ hasDatabase: () => true, loadConfigResult: async () => { throw new Error("simulated: the SystemConfig read failed"); } });
  } else {
    process.env.FEATURE_SIMPLEJOURNEY = "ACTIVE";
    await writeCap("ACTIVE");
  }
}

type Bell = { kind: string; titleEn: string; titleSw: string; titleZh: string; bodyEn: string; bodySw: string; bodyZh: string; href: string };
type Letter = { subject: string; html: string; tag: string };
/** Everything one tour sent, keyed `<kind>:<role>:<row kind>:<row title>` (letters `<kind>:<role>:<tag>`), every id
 *  replaced by its role — the SAME placeholder in every kind, so twins compare byte for byte. */
type Transcript = { bells: Map<string, Bell>; letters: Map<string, Letter>; officer: { bells: Bell[]; letters: Letter[] }; round: Bell[]; share: Map<string, Any> };

async function tour(state: State): Promise<Transcript> {
  await setState(state);
  mail.clearEmailOutbox();
  const ids = new Map<string, string>();
  const norm = (s: string) => { let out = s ?? ""; for (const [raw, role] of ids) out = out.split(raw).join(role); return out; };
  const per = { S: {}, P: {}, N: {} } as Record<Kind, Record<Role, string>>;
  const pos = { S: {}, P: {}, N: {} } as Record<Kind, Record<string, string>>;
  const market = async (role: string, kind: Kind, cutoff: string, paidExitMinutes = 0) => {
    const s = SHORTS[kind];
    const m = await svc.createMarket({
      titleEn: FULL.en, titleSw: FULL.sw, titleZh: FULL.zh,
      ...(s.en ? { shortTitleEn: s.en } : {}), ...(s.sw ? { shortTitleSw: s.sw } : {}), ...(s.zh ? { shortTitleZh: s.zh } : {}),
      category: "macro", sourceUrl: "https://bot.go.tz", resolutionCriterion: "Resolves at the official result.",
      resolutionAt: iso(7 * 864e5), selectionClosedAt: cutoff, proposedBy: OFFICERS.a,
      rateOverrides: { freeExitGraceMinutes: 5, paidExitWindowMinutes: paidExitMinutes, cashOutFeeRate: 0.1 },
    });
    ids.set(m.id, `<M:${role}>`);
    return m;
  };
  const player = async (kind: Kind, role: Role) => { const id = await user(`mt_${kind}${role}`); ids.set(id, `<U:${role}>`); per[kind][role] = id; return id; };
  const bet = async (u: string, mid: string, side: "YES" | "NO", kind: Kind, role: string) => {
    const r = await svc.buyPosition(u, { marketId: mid, side, stake: 1_000, idempotencyKey: crypto.randomUUID() });
    if (!r.ok) throw new Error(`fixture bet refused (${state}, ${kind}${role}): ${j(r)}`);
    ids.set(r.data.positionId, `<P:${role}>`);
    pos[kind][role] = r.data.positionId;
    return r.data.positionId as string;
  };
  const resolve = async (mid: string, outcome: "YES" | "NO" | "VOID") => {
    const r1 = await svc.resolveMarket({ marketId: mid, outcome, officerId: OFFICERS.a, evidence: "test:message-titles" });
    if (!r1.ok) throw new Error(`fixture resolve refused: ${j(r1)}`);
    if (r1.data.stage === "stage1") {
      const r2 = await svc.resolveMarket({ marketId: mid, outcome, officerId: OFFICERS.b, evidence: "test:message-titles" });
      if (!r2.ok) throw new Error(`fixture stage-2 refused: ${j(r2)}`);
    }
  };
  const settle = async (mid: string, actorId = OFFICERS.a, force = true) => {
    const r = await svc.settleMarket(mid, { force, actorId });
    if (!r.ok) throw new Error(`fixture settle refused: ${j(r)}`);
  };
  const rowsOf = async (u: string) => (await notif.listForUser(u, 100)) as Bell[];
  /** Wait until a player holds a row of `kind` — the verdict is fire-and-forget, and the money must not overtake it. */
  const waitKind = async (u: string, kind: string) => {
    const rows = await until(() => rowsOf(u), (r) => r.some((x) => x.kind === kind));
    if (!rows.some((x) => x.kind === kind)) throw new Error(`fixture: no ${kind} row for ${ids.get(u) ?? u} (${state})`);
  };

  // ── the three main markets and their watchers first, with ONE close, so every watcher's "about N minutes" agrees ──
  const cutoff = iso(30 * 60_000 + 20_000);
  const main = {} as Record<Kind, Any>, one = {} as Record<Kind, Any>, voided = {} as Record<Kind, Any>, cancel = {} as Record<Kind, Any>;
  // The main market keeps a paid exit window: only a PAID exit's receipt quotes the market (a free exit's says nothing of it).
  for (const k of KINDS) { main[k] = await market("main", k, cutoff, 15); await player(k, "W"); }
  for (const k of KINDS) {
    await watch.toggleWatch(main[k].id, per[k].W);
    const r = await svc.notifyClosingSoonForMarket(main[k].id);
    if (!r.notified || r.watchers !== 1) throw new Error(`fixture closing-soon did not alert (${k}): ${j(r)}`);
  }
  for (const k of KINDS) {
    one[k] = await market("one", k, cutoff);
    voided[k] = await market("void", k, cutoff);
    cancel[k] = await market("cancel", k, cutoff);
    for (const r of ROLES) if (r !== "W") await player(k, r);
  }
  for (const k of KINDS) {
    const m = main[k];
    ok(`C.${state}.0 · fixture · the ${k} market carries exactly its officer-approved short titles (createMarket, the wizard's path)`,
      (m.shortTitleEn ?? null) === (SHORTS[k].en ?? null) && (m.shortTitleSw ?? null) === (SHORTS[k].sw ?? null) && (m.shortTitleZh ?? null) === (SHORTS[k].zh ?? null),
      j([m.shortTitleEn, m.shortTitleSw, m.shortTitleZh]));
  }
  for (const k of KINDS) {
    const u = per[k];
    await bet(u.A, main[k].id, "YES", k, "A");
    await bet(u.B, main[k].id, "NO", k, "B");
    await bet(u.C, main[k].id, "YES", k, "C");
    await backdate(pos[k].C, 6 * 60_000); // past the free window, inside the paid one (a fixture of time)
    const sold = await svc.cashOutPosition(u.C, pos[k].C);
    if (!sold.ok) throw new Error(`fixture sale refused (${k}): ${j(sold)}`);
    await bet(u.D, one[k].id, "YES", k, "D");
    await bet(u.E, voided[k].id, "YES", k, "E");
    await bet(u.F, cancel[k].id, "YES", k, "F");
  }
  for (const k of KINDS) {
    const u = per[k];
    // Betting closes (a fixture of time), then the verdict, then the money — never the money before the verdict's notice.
    await mdal.marketStore.stamp(main[k].id, { selectionClosedAt: iso(-60_000) });
    const c = await svc.notifySelectionClosedForMarket(main[k].id);
    if (!c.notified || c.bettors !== 2) throw new Error(`fixture close did not notify (${k}): ${j(c)}`);
    await resolve(main[k].id, "YES");
    await waitKind(u.A, "VERDICT");
    await waitKind(u.B, "VERDICT");
    await settle(main[k].id);
    await resolve(one[k].id, "YES");
    await waitKind(u.D, "VERDICT");
    await settle(one[k].id);
    await resolve(voided[k].id, "VOID");
    await waitKind(u.E, "VERDICT");
    await settle(voided[k].id);
    const v = await svc.emergencyVoidMarket({ marketId: cancel[k].id, officerId: OFFICERS.a, reason: "The source withdrew the fixture." });
    if (!v.ok) throw new Error(`fixture cancellation refused (${k}): ${j(v)}`);
  }
  // ── an Up & Down round: no short title by the rule, then short titles forced onto its row (a fixture of state) ──
  const round = await svc.createMarket({
    titleEn: ROUND_FULL.en, titleSw: ROUND_FULL.sw, titleZh: ROUND_FULL.zh,
    shortTitleEn: ROUND_FORCED.en, shortTitleSw: ROUND_FORCED.sw, shortTitleZh: ROUND_FORCED.zh,
    category: "crypto", sourceUrl: "https://bot.go.tz", resolutionCriterion: "Up if the close beats the open.",
    resolutionAt: iso(7 * 864e5), proposedBy: OFFICERS.a, productLine: "UPDOWN",
  });
  ids.set(round.id, "<M:round>");
  ok(`C.${state}.round.0 · fixture · createMarket stores NO short title on an Up & Down round, whatever it is handed`,
    round.shortTitleEn == null && round.shortTitleSw == null && round.shortTitleZh == null, j([round.shortTitleEn, round.shortTitleSw, round.shortTitleZh]));
  await mdal.marketStore.setShortTitles(round.id, { shortTitleEn: ROUND_FORCED.en, shortTitleSw: ROUND_FORCED.sw, shortTitleZh: ROUND_FORCED.zh, competition: null });
  const G = await user("mt_roundG"), H = await user("mt_roundH");
  for (const [u, side] of [[G, "YES"], [H, "NO"]] as const) {
    const r = await svc.buyPosition(u, { marketId: round.id, side, stake: 1_000, idempotencyKey: crypto.randomUUID() });
    if (!r.ok) throw new Error(`fixture round bet refused: ${j(r)}`);
  }
  // The round's outcome, stamped as `updown-service.ts` stamps it (a zero-length objection window), then the money.
  const now = iso();
  await mdal.marketStore.stamp(round.id, {
    status: "RESOLVED", resolvedOutcome: "YES",
    resolutionStage1By: "system_updown", resolutionStage1At: now, resolutionStage2By: "system_updown", resolutionStage2At: now,
    resolutionEvidence: "Open 100 → close 101 (fixture).", objectionsClosedAt: now, resolutionNotifiedAt: now, settledAt: null, updatedAt: now,
  });
  await settle(round.id, "system_updown", false);

  // ── collect: every row and letter, once every fire-and-forget send has landed ──
  const bells = new Map<string, Bell>();
  const letters = new Map<string, Letter>();
  for (const k of KINDS) {
    for (const r of ROLES) {
      const rows = await until(() => rowsOf(per[k][r]), (x) => x.length >= ROWS[r].length);
      for (const row of rows) {
        bells.set(`${k}:${r}:${row.kind}:${row.titleEn.replace(/\d[\d,]*/g, "#")}`, {
          kind: row.kind, titleEn: norm(row.titleEn), titleSw: norm(row.titleSw), titleZh: norm(row.titleZh ?? ""),
          bodyEn: norm(row.bodyEn), bodySw: norm(row.bodySw), bodyZh: norm(row.bodyZh ?? ""), href: norm(row.href ?? ""),
        });
      }
      const mine = await until(async () => (mail.emailOutbox() as Array<{ to: string; subject: string; html: string; tag?: string }>).filter((e) => e.to === `${per[k][r]}@t.tz`),
        (x) => x.length >= LETTERS[r].length);
      for (const e of mine) letters.set(`${k}:${r}:${e.tag}`, { subject: norm(e.subject), html: norm(e.html), tag: e.tag ?? "" });
    }
  }
  const officerBells = ((await notif.listForUser(OFFICERS.a, 400)) as Bell[]).filter((b) => b.href === "/admin/markets" && /cancelled/i.test(b.titleEn));
  const officerLetters = await until(async () => (mail.emailOutbox() as Array<{ to: string; subject: string; html: string; tag?: string }>)
    .filter((e) => e.to === `${OFFICERS.a}@t.tz` && e.tag === "market-cancelled-admin"), (x) => x.length >= 3);
  const roundRows: Bell[] = [];
  for (const u of [G, H]) for (const row of await until(() => rowsOf(u), (x) => x.length >= 1)) roundRows.push({ ...row, titleZh: row.titleZh ?? "", bodyZh: row.bodyZh ?? "" });

  // ── §D · the share surfaces, on the three main markets, in this same state ──
  const shareOut = new Map<string, Any>();
  for (const k of KINDS) {
    const id = main[k].id;
    shareOut.set(`${k}:og`, await ogTexts(id));
    const token = await share.mintWinShareToken(per[k].A, pos[k].A);
    shareOut.set(`${k}:winshare`, token ? await share.resolveWinShareToken(token) : null);
    shareOut.set(`${k}:ogwin`, token ? await ogTexts(id, token) : null);
    shareOut.set(`${k}:meta`, await metadata(id));
    shareOut.set(`${k}:metawin`, token ? await metadata(id, token) : null);
  }
  return { bells, letters, officer: { bells: officerBells, letters: officerLetters.map((e) => ({ subject: e.subject, html: e.html, tag: e.tag ?? "" })) }, round: roundRows, share: shareOut };
}

/** The words of the card the real handler builds, read from its element tree. */
async function ogTexts(id: string, w?: string): Promise<string[]> {
  const url = `http://local.test/api/og/market/${id}${w ? `?w=${encodeURIComponent(w)}` : ""}`;
  const res: Any = await route.GET(new Request(url), { params: Promise.resolve({ id }) });
  const out: string[] = [];
  const walk = (n: Any) => {
    if (n == null || typeof n === "boolean") return;
    if (typeof n === "string" || typeof n === "number") { out.push(String(n)); return; }
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (n.props) walk(n.props.children);
  };
  walk(res?.el);
  return out;
}

/** `/markets/[id]`'s generateMetadata, transpiled from its own source and run with the real readers and rule. */
const META_FN = (() => {
  const src = readFileSync(join(ROOT, "src/app/markets/[id]/page.tsx"), "utf8").replace(/\r\n/g, "\n");
  const at = src.indexOf("export async function generateMetadata(");
  let i = src.indexOf("(", at), depth = 0;
  for (; i < src.length; i++) { if (src[i] === "(") depth++; else if (src[i] === ")" && --depth === 0) break; }
  const open = src.indexOf("{", i);
  depth = 0;
  let end = -1;
  for (let k = open; k < src.length; k++) { if (src[k] === "{") depth++; else if (src[k] === "}" && --depth === 0) { end = k; break; } }
  return esbuild.transformSync(src.slice(at, end + 1).replace(/^export\s+/, ""), { loader: "ts" }).code;
})();
async function metadata(id: string, w?: string): Promise<Any> {
  const deps: Record<string, unknown> = {
    getServerT: async () => ({ t: dict.en, locale: "en" }),
    getMarket: svc.getMarket, notFoundMetadata: async () => ({ title: "not found" }),
    pickLocalized, sharePreviewPrice: preview.sharePreviewPrice, sharePreviewSettled: preview.sharePreviewSettled,
    sharePreviewDescription: preview.sharePreviewDescription, shownPredictors, formatTzs,
    resolveWinShareToken: share.resolveWinShareToken, ROOT_OPEN_GRAPH: { siteName: "50pick" },
    shortTitlesInMessagesNow, messageTitle: st.messageTitle,
  };
  const generateMetadata = new Function(...Object.keys(deps), `${META_FN}\nreturn generateMetadata;`)(...Object.values(deps));
  return generateMetadata({ params: Promise.resolve({ id }), searchParams: Promise.resolve(w ? { w } : {}) });
}

/* ── the comparisons ─────────────────────────────────────────────────────────────────────────────────────────────── */
const FIELDS: Record<L, Array<keyof Bell>> = { en: ["titleEn", "bodyEn"], sw: ["titleSw", "bodySw"], zh: ["titleZh", "bodyZh"] };
const ALL_TEXT: Array<keyof Bell> = ["titleEn", "titleSw", "titleZh", "bodyEn", "bodySw", "bodyZh"];
/** The parts a twin is compared on byte for byte: every one, but a verdict's body, which states an instant. */
const timeFree = (b: Bell) => (b.kind === "VERDICT" ? { ...b, bodyEn: "", bodySw: "", bodyZh: "" } : b);
/** Each language's full title, where it stood, replaced by that language's expected title. */
function substitute(b: Bell, want: Partial<Record<L, string>>): Bell {
  const out = { ...b };
  for (const l of LANGS) if (want[l]) for (const f of FIELDS[l]) out[f] = String(out[f]).split(FULL[l]).join(want[l]!);
  return out;
}
/** A kind's key, re-keyed for its twin (`S:A:…` → `N:A:…`). */
const twinKey = (key: string, to: Kind) => `${to}${key.slice(1)}`;
const anyShortIn = (s: string, shorts: Partial<Record<L, string>>) => Object.values(shorts).some((v) => !!v && s.includes(v));

function census(state: State, t: Transcript) {
  const missing: string[] = [];
  for (const k of KINDS) {
    for (const r of ROLES) {
      const got = [...t.bells.keys()].filter((x) => x.startsWith(`${k}:${r}:`)).map((x) => x.split(":")[2]).sort();
      if (j(got) !== j([...ROWS[r]].sort())) missing.push(`${k}${r} rows ${j(got)}`);
      for (const tag of LETTERS[r]) if (!t.letters.has(`${k}:${r}:${tag}`)) missing.push(`${k}${r} letter ${tag}`);
    }
  }
  ok(`C.${state}.census · every title-carrying player emitter (11) and every player letter (7, two subjects among them) fired, exactly as owed, for all three markets`,
    missing.length === 0, missing.slice(0, 6).join(" | "));
}

/**
 * ⭐ THE COMPARISONS HAVE SOMETHING TO COMPARE. A twin comparison over rows that quote no title would pass whatever the
 * switch did, so the rows of the market without short titles must quote its full question where today's emitters quote
 * one — counted per language and pinned. A count that moves is an emitter's copy that moved: re-pin it in the open.
 * Of the 20 rows, every one quotes it in English and Chinese; Swahili in 17, because the Swahili "betting closed" (A, B)
 * and paid-exit (C) notices name no market — S6-VISUAL-PASS-STATE item 71, an owner question. All 13 letters quote it.
 */
const QUOTED = { en: 20, sw: 17, zh: 20, letters: 13 };
function quotes(state: State, t: Transcript) {
  const rows = (l: L) => [...t.bells].filter(([key, b]) => key.startsWith("N:") && FIELDS[l].some((f) => String(b[f]).includes(FULL[l]))).length;
  const q = { en: rows("en"), sw: rows("sw"), zh: rows("zh"), letters: [...t.letters].filter(([key, e]) => key.startsWith("N:") && e.html.includes(FULL.en)).length };
  ok(`C.${state}.quotes · the comparisons have something to compare: the no-short-title market's rows quote its full question (en ${q.en}, sw ${q.sw}, zh ${q.zh} of ${[...t.bells.keys()].filter((k) => k.startsWith("N:")).length}) and its letters their English question (${q.letters})`,
    j(q) === j(QUOTED), `want ${j(QUOTED)}`);
}

function judgeOff(state: State, t: Transcript) {
  const leaks: string[] = [];
  for (const [key, b] of t.bells) if (ALL_TEXT.some((f) => anyShortIn(String(b[f]), SHORT))) leaks.push(`bell ${key}`);
  for (const [key, e] of t.letters) if (anyShortIn(e.subject, SHORT) || anyShortIn(e.html, SHORT)) leaks.push(`letter ${key}`);
  ok(`C.${state}.full · ⛔ no player notice or letter carries a short title — every one quotes the full question (${t.bells.size} rows, ${t.letters.size} letters)`,
    leaks.length === 0 && t.bells.size > 0 && t.letters.size > 0, leaks.slice(0, 4).join(" | "));
  const differ: string[] = [];
  for (const k of ["S", "P"] as Kind[]) {
    for (const [key, b] of t.bells) {
      if (!key.startsWith(`${k}:`)) continue;
      const twin = t.bells.get(twinKey(key, "N"));
      if (!twin || j(timeFree(b)) !== j(timeFree(twin))) differ.push(`bell ${key}`);
    }
    for (const [key, e] of t.letters) {
      if (!key.startsWith(`${k}:`)) continue;
      const twin = t.letters.get(twinKey(key, "N"));
      if (!twin || twin.subject !== e.subject || !e.html.includes(FULL.en)) differ.push(`letter ${key}`);
    }
  }
  ok(`C.${state}.twin · byte for byte: the markets WITH short titles read exactly as their twin without (every row's words and link, every subject; the letter's question line)`,
    differ.length === 0, differ.slice(0, 4).join(" | "));
  const roundLeak = t.round.filter((b) => ALL_TEXT.some((f) => anyShortIn(String(b[f]), ROUND_FORCED)));
  ok(`C.${state}.round · an Up & Down round's result rows carry its round title`, t.round.length >= 2 && roundLeak.length === 0, `${t.round.length} rows`);
}

function judgeActive(t: Transcript, before: Transcript) {
  const wrong: Record<Kind, string[]> = { S: [], P: [], N: [] };
  for (const k of KINDS) {
    const want = SHORTS[k];
    for (const [key, b] of t.bells) {
      if (!key.startsWith(`${k}:`)) continue;
      const twin = t.bells.get(twinKey(key, "N"));
      if (!twin) { wrong[k].push(`no twin for ${key}`); continue; }
      if (b.kind === "VERDICT") {
        // The verdict states an instant: judged on its question alone, language by language.
        for (const l of LANGS) {
          if (!FIELDS[l].some((f) => String(twin[f]).includes(FULL[l]))) continue;
          const expect = want[l] ?? FULL[l];
          if (!FIELDS[l].some((f) => String(b[f]).includes(expect)) || (want[l] && FIELDS[l].some((f) => String(b[f]).includes(FULL[l])))) wrong[k].push(`${key} ${l}`);
        }
      } else if (j(b) !== j(substitute(twin, want))) wrong[k].push(`bell ${key}`);
    }
    for (const [key, e] of t.letters) {
      if (!key.startsWith(`${k}:`)) continue;
      const twin = t.letters.get(twinKey(key, "N"));
      const expect = want.en ?? FULL.en;
      if (!twin || e.subject !== twin.subject.split(FULL.en).join(expect) || !e.html.includes(expect) || (want.en && e.html.includes(FULL.en))
        || anyShortIn(e.subject + e.html, { sw: SHORT.sw, zh: SHORT.zh })) wrong[k].push(`letter ${key}`);
    }
  }
  ok("C.ACTIVE.S · at ACTIVE every row reads as its twin with each language's officer-approved short title where its full title stood (en, sw, zh), and every player letter's question line and subject carry the English short title", wrong.S.length === 0, wrong.S.slice(0, 4).join(" | "));
  ok("C.ACTIVE.P · ⛔ no cross-language fallback: an English short title only — English carries it; Swahili and Chinese keep their FULL titles", wrong.P.length === 0, wrong.P.slice(0, 4).join(" | "));
  const drift: string[] = [];
  for (const [key, b] of t.bells) {
    if (!key.startsWith("N:")) continue;
    const old = before.bells.get(key);
    if (!old || j(timeFree(b)) !== j(timeFree(old))) drift.push(`bell ${key}`);
  }
  for (const [key, e] of t.letters) {
    if (!key.startsWith("N:")) continue;
    const old = before.letters.get(key);
    if (!old || old.subject !== e.subject || !e.html.includes(FULL.en)) drift.push(`letter ${key}`);
  }
  ok("C.ACTIVE.N · a market with no approved short title reads at ACTIVE byte for byte as it read before the flip (every row's words and link, every subject, the question line)",
    wrong.N.length === 0 && drift.length === 0 && t.bells.size === before.bells.size && t.letters.size === before.letters.size,
    [...wrong.N, ...drift].slice(0, 4).join(" | ") || `${t.bells.size}/${before.bells.size} rows, ${t.letters.size}/${before.letters.size} letters`);
  const roundOk = t.round.length >= 2 && t.round.every((b) => !ALL_TEXT.some((f) => anyShortIn(String(b[f]), ROUND_FORCED)))
    && t.round.every((b) => b.bodyEn.includes(ROUND_FULL.en) && b.bodySw.includes(ROUND_FULL.sw) && b.bodyZh.includes(ROUND_FULL.zh));
  ok("C.ACTIVE.round · an Up & Down round keeps its round title at ACTIVE, even with short titles forced onto its row", roundOk,
    t.round.map((b) => `${b.kind}: ${b.bodyEn.slice(0, 40)}`).join(" | "));
  // ⚠️ The officers' bell row is deduped (`notify()`: the same words and link inside 90 s are one event), so the three
  // cancellations of a tour — and of the tours before it — leave as few as ONE row; a row with a short title in it would
  // not be a repeat, would stand on its own, and would be read here. The letters are not deduped: three per tour.
  const officerOk = t.officer.bells.length >= 1 && t.officer.letters.length >= 3
    && t.officer.bells.every((b) => b.bodyEn.includes(FULL.en) && !anyShortIn(b.bodyEn + b.bodyZh, SHORT))
    && t.officer.letters.every((e) => e.subject.includes(FULL.en) && !anyShortIn(e.subject + e.html, SHORT));
  ok("C.ACTIVE.officer · the officers' cancellation notice and letter keep the full English question (the console is English by design)", officerOk,
    `${t.officer.bells.length} rows, ${t.officer.letters.length} letters`);
}

/* ══ §D · THE SHARE SURFACES ═══════════════════════════════════════════════════════════════════════════════════════ */
function judgeShare(state: State, t: Transcript) {
  const on = state === "ACTIVE";
  const og: string[] = [], win: string[] = [], meta: string[] = [];
  for (const k of KINDS) {
    const expect = on ? (SHORTS[k].en ?? FULL.en) : FULL.en;
    const notExpect = expect === FULL.en ? SHORT.en : FULL.en;
    const card: string[] = t.share.get(`${k}:og`) ?? [];
    if (!card.includes(expect) || card.some((x) => x.includes(notExpect) || anyShortIn(x, { sw: SHORT.sw, zh: SHORT.zh }))) og.push(`${k} card ${j(card.slice(0, 5))}`);
    const ogwin: string[] | null = t.share.get(`${k}:ogwin`);
    if (!ogwin || !ogwin.includes(expect) || ogwin.some((x) => x.includes(notExpect))) og.push(`${k} win card ${j(ogwin?.slice(0, 6))}`);
    const ws = t.share.get(`${k}:winshare`);
    if (!ws || ws.marketTitle !== expect) win.push(`${k} ${j(ws?.marketTitle)}`);
    const md = t.share.get(`${k}:meta`);
    const mw = t.share.get(`${k}:metawin`);
    if (!md || md.openGraph?.title !== expect || md.twitter?.title !== expect || md.title !== FULL.en) meta.push(`${k} ${j([md?.openGraph?.title, md?.twitter?.title, md?.title])}`);
    if (!mw || !String(mw.description).endsWith(` · ${expect}`) || String(mw.description).includes(notExpect)) meta.push(`${k} win ${j(mw?.description)}`);
  }
  const what = on ? "the English short title where an officer approved one (S and P), the full question where none (N)" : "the full English question, every market";
  ok(`D.${state}.og · the share picture — the card and its win variant — names ${what}`, og.length === 0, og.join(" | "));
  ok(`D.${state}.win · the win card's projection (\`resolveWinShareToken\`) names ${what}`, win.length === 0, win.join(" | "));
  ok(`D.${state}.meta · the share preview (og:title, twitter:title, a win's description) names ${what}; the browser tab keeps the page's own title`, meta.length === 0, meta.join(" | "));
}

/* ══ THE RUN ═══════════════════════════════════════════════════════════════════════════════════════════════════════ */
OFFICERS.a = await user("mt_officer_a", "ADMIN", 0);
OFFICERS.b = await user("mt_officer_b", "ADMIN", 0);
sectionA();
await sectionB();
console.log("\n§C/§D · every call site and every share surface, in four switch states");
const tours = new Map<State, Transcript>();
for (const s of STATES) {
  const t = await tour(s);
  tours.set(s, t);
  census(s, t);
  quotes(s, t);
  if (s !== "ACTIVE") judgeOff(s, t);
  judgeShare(s, t);
}
judgeActive(tours.get("ACTIVE")!, tours.get("STAFF_PREVIEW")!);
delete process.env.FEATURE_SIMPLEJOURNEY;
sw.__setJourneySwitchStoreForTests(null);
ok(`0.store · the cases ran on the ${STORE} store`, onPostgres === (STORE === "postgres"), `onPostgres ${onPostgres}`);

console.log(`${String.fromCharCode(10)}@@SUMMARY ${JSON.stringify({ pass, fail, store: STORE })}`);
process.exit(fail === 0 ? 0 : 1);
