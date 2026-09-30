/**
 * SHORT TITLES — THE ONE WRITE PATH, ON BOTH STORES — `test:short-title-edit` (the Vodacom plan S2,
 * `docs/VODACOM-PLAN.md` §0c; COMPLIANCE-DECISIONS §6 "Short titles and competition labels").
 *
 * `applyShortTitles` (`src/lib/server/short-title-service.ts`) is the ONE way a market's card short titles and its
 * competition change after creation: the admin edit (`setMarketShortTitlesAction`, "via: edit") and the approval of a
 * backfill draft ("via: backfill") both go through it. This suite holds it to what it promises, on the in-memory twin
 * and, in its own process, on the Prisma twin over a fake client:
 *   §1  every HARD issue (too long, not GSM-7, the wrong form, a copy of the English) is refused, names its field, and
 *       changes nothing — no value, no write, no audit row.
 *   §2  a WARNING (a number the full question does not contain) saves, and is handed back to the officer.
 *   §3  ABSENT keeps; "" and null clear.
 *   §4  the competition: an unknown key is refused by name, a known one (trimmed) is stored, "" clears.
 *   §5  an Up & Down round is refused and untouched (rounds are out of S2).
 *   §6  an unknown market, and an act with no officer, are refused.
 *   §7  a no-op is `changed: false` and leaves NO audit row and no write.
 *   §8  the audit row: the right action for edit / backfill, the officer, the market, before and after, the draft.
 *   §9  a curly-quoted Swahili value is stored folded onto GSM-7.
 *   §10 the money and the full wording are untouched.
 *   §11 the write is the narrow one: exactly one `setShortTitles` — never `set`, `stamp` or a pool call.
 *   §12 DATABASE MODE (its own process, a fake client): ONE `predictionMarket.update` whose data keys are exactly the
 *       four columns and `updatedAt`, on the lock's own transaction after the lock and the read; no write on a refusal
 *       or a no-op; the audit row in the table; an audit insert that fails is `ok` with `recorded: false` and the value
 *       landed; `recategoriseMarket` reads and writes on the market lock's transaction (MS-1).
 *   §13 the wiring, read from source: the action's gate comes before the write, it sits after
 *       `adminReopenMarketAction`, absent is not empty, it sends what the page showed (`expectedBefore`) and hands back
 *       the sentinel's verdict, the four pages refresh only on a change; `createMarketAction` and the wizard share the
 *       rule, and the create asks the sentinel about what it stored; the control consults the act gate, reads the
 *       budget, carries the warning above its inputs, sends what its page showed, shows the verdict beside each
 *       language, focuses a refused field only once the save has settled and names a competition it does not know;
 *       the page hides it on a round; `test:admin-action-gate` pins the action; the service calls the sentinel only
 *       after the lock's block and the act's audit row, and its test seam refuses to run in production.
 *   §14 the competition is read RAW (MS-4): a key this build does not know survives a read and an edit of another field
 *       untouched — on the Prisma twin through the real `toStoredMarket` — and displays as none.
 *   §15 the contract the backfill calls: `onlyIfEmpty` (a field the market already has is skipped, and listed),
 *       `expectedBefore` (a field changed since the page loaded is refused by name), `auditExtra` (merged, never
 *       overwriting the act's own record); an untouched stored value is kept verbatim and never blocks another edit.
 *   §16 THE SENTINEL (ST-3): after a write lands, outside the lock and after the act's record, it reads the languages
 *       the act changed (or those named, or none); its verdict comes back and is its own `market.short_title_checked`
 *       row; a throw, a partial answer and "not checked" all read "unchecked", never "agrees";
 *       `recordShortTitleAgreement` (the create path) asks only about present short titles and never throws.
 *   §17 THE RACES (in memory, where the lock really queues): a value set while an `onlyIfEmpty` approval waits for the
 *       lock is never overwritten; a re-file waiting on the lock never puts back a short title applied meanwhile.
 *   §18 the words, pure: `shortTitleIssueSentence` counts and lists the CLEANED value (the rule's own verdict), and the
 *       sentinel's verdict lines say "agrees" / "does not agree: …" / "not checked" (its reason carried beside it, said
 *       once by the surface) and nothing else.
 *
 * ⭐ THE SENTINEL IS FAKED THROUGH ITS ONE SEAM (`__setShortTitleSentinelForTests`), and `ANTHROPIC_API_KEY` is removed
 * before a module loads: no key, no network, and every verdict on demand.
 *
 * ⛔ THE ACTION ITSELF IS NOT CALLED HERE: it needs a request (`currentSession` reads the cookie store), so its gate is
 * held by §13's census — the gate runs before `applyShortTitles`, in that order — and by `test:admin-action-gate` §4.
 *
 * ⭐ RED TWIN, IN PROCESS: `npm run red:short-title-edit` runs the same checks against planted defective
 * implementations (in memory, and in its own process on the fake client) and planted source text, and every plant must
 * be caught by the check named for it. It changes nothing on disk, so `test:red-anchors` counts it as in-process.
 *
 *   npx tsx scripts/short-title-edit.test.mts              the suite
 *   npx tsx scripts/short-title-edit.test.mts --prove-red  the red twin
 */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const THIS = fileURLToPath(import.meta.url);
const REPO = join(THIS, "..", "..");
const PROVE_RED = process.argv.includes("--prove-red");
const DB_MODE = process.env.STE_MODE === "db";
const FAKE_DATABASE_URL = "postgresql://short-title-edit:fake@127.0.0.1:1/never_a_real_database";

// ── 0 · THE GUARD — before a single repo module is loaded ─────────────────────────────────────────────────
if (process.env.NODE_ENV === "production") {
  console.log("FAIL 0.guard · ⛔ REFUSED — NODE_ENV=production.");
  process.exit(1);
}
if (DB_MODE) {
  if (process.env.DATABASE_URL !== FAKE_DATABASE_URL || process.env.USE_PRISMA_DAL === "false") {
    console.log("FAIL 0.guard · ⛔ REFUSED — database mode runs only on this suite's own fake URL, with the Prisma twin on.");
    process.exit(1);
  }
} else if (process.env.DATABASE_URL !== undefined) {
  console.log("FAIL 0.guard · ⛔ REFUSED — DATABASE_URL is set. This suite runs on the in-memory store (and a fake client for §12): unset it.");
  process.exit(1);
}
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";
// No key, no network: the sentinel is the fake installed below, and this is the belt to that braces.
delete process.env.ANTHROPIC_API_KEY;

// ── The fake client for §12 (database mode only) ─────────────────────────────────────────────────────────
type Row = Record<string, unknown>;
type Call = { what: string; tx: number | null; args?: { where?: { id?: string }; data?: Row } };
const ROWS = new Map<string, Row>();
const CALLS: Call[] = [];
const AUDIT_TABLE: Row[] = [];
const AUDIT_FAIL = new Set<string>();
let TX_SEQ = 0;

/** A client whose every call is recorded with the transaction it was made on (null = outside any transaction). */
function makeClient(txId: number | null): Record<string, unknown> {
  const record = (what: string, args?: unknown) => { CALLS.push({ what, tx: txId, args: args as Call["args"] }); };
  const predictionMarket = new Proxy({}, {
    get: (_t, method) => {
      if (typeof method !== "string") return undefined;
      return async (args?: { where?: { id?: string }; data?: Row; create?: Row; update?: Row }) => {
        record(`predictionMarket.${method}`, args);
        const id = args?.where?.id;
        switch (method) {
          case "findUnique": case "findFirst":
            return id && ROWS.has(id) ? { ...ROWS.get(id)! } : null;
          case "update": {
            if (!id || !ROWS.has(id)) throw Object.assign(new Error("fake PredictionMarket: no row to update (simulated)"), { code: "P2025" });
            const next = { ...ROWS.get(id)!, ...(args?.data ?? {}) };
            ROWS.set(id, next);
            return { ...next };
          }
          case "upsert": {
            const next = id && ROWS.has(id) ? { ...ROWS.get(id)!, ...(args?.update ?? {}) } : { ...(args?.create ?? {}) };
            if (id) ROWS.set(id, next);
            return { ...next };
          }
          case "findMany": case "groupBy": return [];
          case "count": return 0;
          case "createMany": case "updateMany": case "deleteMany": return { count: 0 };
          default: return null;
        }
      };
    },
  });
  const auditLog = new Proxy({}, {
    get: (_t, method) => {
      if (typeof method !== "string") return undefined;
      return async (args?: { data?: Row }) => {
        record(`auditLog.${method}`, args);
        if (method === "create") {
          const action = String(args?.data?.action ?? "");
          if (AUDIT_FAIL.has(action)) throw new Error(`fake AuditLog: the insert of ${action} failed (simulated)`);
          AUDIT_TABLE.push({ ...(args?.data ?? {}) });
          return { ...(args?.data ?? {}) };
        }
        if (method === "findMany" || method === "groupBy") return [];
        if (method === "count") return 0;
        return null;
      };
    },
  });
  const benign = (model: string) => new Proxy({}, {
    get: (_t, method) => {
      if (typeof method !== "string") return undefined;
      return async (args?: { data?: Row; create?: Row }) => {
        record(`${model}.${method}`, args);
        switch (method) {
          case "findMany": case "groupBy": return [];
          case "findFirst": case "findUnique": return null;
          case "count": return 0;
          case "aggregate": return { _sum: {}, _count: {}, _avg: {}, _min: {}, _max: {} };
          case "createMany": case "updateMany": case "deleteMany": return { count: 0 };
          case "create": case "update": return { ...(args?.data ?? {}) };
          case "upsert": return { ...(args?.create ?? {}) };
          default: return null;
        }
      };
    },
  });
  const client: Record<string, unknown> = new Proxy({} as Record<string, unknown>, {
    get: (_t, prop) => {
      if (prop === "predictionMarket") return predictionMarket;
      if (prop === "auditLog") return auditLog;
      if (typeof prop !== "string" || prop === "then") return undefined;
      if (prop === "$transaction") {
        return async (arg: unknown) => {
          if (typeof arg !== "function") return Promise.all(arg as unknown[]);
          const id = ++TX_SEQ;
          CALLS.push({ what: "$transaction", tx: id });
          return (arg as (tx: unknown) => unknown)(makeClient(id));
        };
      }
      if (prop === "$executeRaw" || prop === "$executeRawUnsafe") return async () => { record(prop); return 0; };
      if (prop === "$queryRaw" || prop === "$queryRawUnsafe") return async () => { record(prop); return []; };
      if (prop.startsWith("$")) return async () => undefined;
      return benign(prop);
    },
  });
  return client;
}
const ROOT_CLIENT = DB_MODE ? makeClient(null) : null;
if (DB_MODE) (globalThis as { __50PICK_PRISMA?: unknown }).__50PICK_PRISMA = ROOT_CLIENT;

// ── THE MODULES ───────────────────────────────────────────────────────────────────────────────────────────
const SVC = await import("../src/lib/server/short-title-service.ts");
const MSVC = await import("../src/lib/server/market-service.ts");
const { marketStore } = await import("../src/lib/server/market-dal.ts");
const { audit, auditFlush, getAuditPage } = await import("../src/lib/server/audit.ts");
const { inLock, withLock, runOutsideLock } = await import("../src/lib/server/locks.ts");
const { normaliseShortTitleSet, cleanShortTitle, codePoints, shortTitleIssues } = await import("../src/lib/markets/short-title.ts");
const { isCompetition, normaliseCompetition } = await import("../src/lib/markets/competitions.ts");
const { offendingChars } = await import("../src/lib/sms-compose.ts");
const { decomment } = await import("./lib/decomment.mts");

if (DB_MODE) {
  const { prisma, hasDatabase } = await import("../src/lib/server/prisma.ts");
  if (!hasDatabase() || prisma() !== ROOT_CLIENT) {
    console.log("FAIL 0.guard · ⛔ REFUSED — prisma() is not this suite's fake client.");
    process.exit(1);
  }
}

type Apply = typeof SVC.applyShortTitles;
type Recat = typeof MSVC.recategoriseMarket;
type Opts = Parameters<Apply>[0];
type Res = Awaited<ReturnType<Apply>>;
type Locale = "en" | "sw" | "zh";
type TitleKey = "shortTitleEn" | "shortTitleSw" | "shortTitleZh";
type Four = { shortTitleEn: string | null; shortTitleSw: string | null; shortTitleZh: string | null; competition: string | null };
type Issue = "too_long" | "not_gsm7" | "form" | "copied_english" | "number_drift";

// ── OUTPUT ────────────────────────────────────────────────────────────────────────────────────────────────
type Result = { label: string; ok: boolean; detail: string };
let results: Result[] = [];
let quiet = false;
/** Database-mode labels carry `db.`, so the parent can tell the two stores apart in one report. */
const P = DB_MODE ? "db." : "";
const ok = (label: string, cond: boolean, detail = "") => {
  results.push({ label: `${P}${label}`, ok: !!cond, detail });
  if (!quiet) console.log(`${cond ? "PASS" : "FAIL"} ${P}${label}${!cond && detail ? ` — ${detail}` : ""}`);
};
const j = (v: unknown) => JSON.stringify(v);
const same = (a: unknown, b: unknown) => j(a) === j(b);
/** Key order never decides a comparison of records (an audit payload goes through a JSON round trip). */
const canon = (v: unknown) => JSON.stringify(v, (_k, x) =>
  x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.entries(x as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))) : x);
const sameC = (a: unknown, b: unknown) => canon(a) === canon(b);

// ── THE SENTINEL, FAKED THROUGH ITS ONE SEAM — no key, no network, every verdict on demand ───────────────────
/** Every call the service made: the words it asked about, and whether it asked from inside a lock / after the record. */
type SentinelCall = { marketId: string | null; shorts: Record<string, string>; inLock: boolean; afterRecord: boolean };
const SENTINEL_CALLS: SentinelCall[] = [];
let SENTINEL_MODE: "agree" | "disagree" | "partial" | "unchecked" | "throw" | "garbage" = "agree";
const DISAGREE_ISSUE = "It leaves out the date the full question names.";
type Checker = Parameters<typeof SVC.__setShortTitleSentinelForTests>[0] & {};
const FAKE_SENTINEL: Checker = async (input) => {
  const id = input.market.id;
  const shorts: Record<string, string> = {};
  for (const [k, v] of Object.entries(input.shorts)) if (typeof v === "string") shorts[k] = v;
  SENTINEL_CALLS.push({
    marketId: id,
    shorts,
    inLock: inLock(),
    afterRecord: getAuditPage({ limit: 10_000 }).some((e) => e.targetId === id && /^market\.short_title_(edited|approved)$/.test(e.action)),
  });
  const langs = Object.keys(shorts);
  const verdicts = (agrees: boolean, which = langs) =>
    Object.fromEntries(which.map((l) => [l, { agrees, issue: agrees ? null : DISAGREE_ISSUE }]));
  const checked = (languages: Record<string, unknown>) => ({ status: "checked" as const, model: "fake-sentinel", checkedAt: new Date().toISOString(), languages });
  switch (SENTINEL_MODE) {
    case "throw": throw new Error("the fake sentinel is down (simulated)");
    case "unchecked": return { status: "unchecked" as const, reason: "the sentinel is switched off on this deployment" };
    case "partial": return checked(verdicts(true, langs.slice(1)));
    case "garbage": return null as never;
    case "disagree": return checked(verdicts(false));
    default: return checked(verdicts(true));
  }
};
SVC.__setShortTitleSentinelForTests(FAKE_SENTINEL);

// ── THE SPY — which store writes an act makes, on either twin ────────────────────────────────────────────
const STORE_CALLS: string[] = [];
const MS = marketStore as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>;
for (const name of ["set", "stamp", "setShortTitles", "addToPool", "delete"]) {
  const original = MS[name].bind(marketStore);
  MS[name] = (...a: unknown[]) => { STORE_CALLS.push(name); return original(...a); };
}

// ── FIXTURES ──────────────────────────────────────────────────────────────────────────────────────────────
const OFFICER = "usr_ste_officer";
const T = {
  en: "Will Simba SC beat Young Africans on 12 October 2026?",
  sw: "Je, Simba SC itaifunga Young Africans tarehe 12 Oktoba 2026?",
  zh: "辛巴体育俱乐部会在2026年10月12日击败青年非洲人队吗？",
};
const GOOD4: Four = {
  shortTitleEn: "Will Simba beat Yanga on 12 October?",
  shortTitleSw: "Je, Simba itaifunga Yanga tarehe 12 Oktoba?",
  shortTitleZh: "辛巴会在10月12日击败青年非洲人吗？",
  competition: "ligi-kuu",
};
const LOC_KEYS = [["en", "shortTitleEn"], ["sw", "shortTitleSw"], ["zh", "shortTitleZh"]] as const;
const four = (m: Partial<Four> | null | undefined): Four | null =>
  m ? { shortTitleEn: m.shortTitleEn ?? null, shortTitleSw: m.shortTitleSw ?? null, shortTitleZh: m.shortTitleZh ?? null, competition: m.competition ?? null } : null;
const readFour = async (id: string) => four((await marketStore.get(id)) as Partial<Four> | null);

/** A market row on whichever twin this process runs — written straight into the store, never through the edit. */
async function seed(id: string, s: Partial<Four> & { productLine?: "MARKET" | "UPDOWN" } = {}) {
  const base = {
    id, titleEn: T.en, titleSw: T.sw, titleZh: T.zh, category: "sports", sourceUrl: "https://www.tff.or.tz/fixtures",
    resolutionCriterion: "Resolves YES if Simba SC win the match in regular time, per the official TFF result page.",
    resolutionCriterionSw: null, resolutionCriterionZh: null,
    shortTitleEn: s.shortTitleEn ?? null, shortTitleSw: s.shortTitleSw ?? null, shortTitleZh: s.shortTitleZh ?? null,
    competition: s.competition ?? null,
    status: "LIVE", yesPool: 5000, noPool: 3000, predictorCount: 4, feeSnapshot: null, resolvedOutcome: null,
    productLine: s.productLine ?? "MARKET", proposedBy: "usr_ste_author",
  };
  if (DB_MODE) {
    ROWS.set(id, {
      ...base,
      resolutionAt: new Date("2026-10-12T18:00:00.000Z"), selectionClosedAt: new Date("2026-10-12T16:00:00.000Z"),
      createdAt: new Date("2026-10-01T09:00:00.000Z"), updatedAt: new Date("2026-10-01T09:00:00.000Z"),
    });
  } else {
    await marketStore.set({
      ...base,
      resolutionAt: "2026-10-12T18:00:00.000Z", selectionClosedAt: "2026-10-12T16:00:00.000Z",
      createdAt: "2026-10-01T09:00:00.000Z", updatedAt: "2026-10-01T09:00:00.000Z",
    } as never);
  }
}

/** The act's own rows (an edit or an approval) — newest first. The sentinel's rows are `checks`. */
const trail = async (id: string) => {
  await auditFlush();
  return getAuditPage({ limit: 10_000 }).filter((e) => e.targetId === id && /^market\.short_title_(edited|approved)$/.test(e.action));
};
/** The sentinel's rows (`market.short_title_checked`) — newest first. */
const checks = async (id: string) => {
  await auditFlush();
  return getAuditPage({ limit: 10_000 }).filter((e) => e.targetId === id && e.action === "market.short_title_checked");
};
const WRITE_CALL = /^predictionMarket\.(update|upsert|create|createMany|updateMany|delete|deleteMany)$/;

/** Run one act and hand back what it said and which writes it made, on the spy and (database mode) on the client. */
async function run(I: Impl, o: Opts) {
  const s0 = STORE_CALLS.length;
  const c0 = CALLS.length;
  const r = await I.apply(o);
  await auditFlush();
  const calls = CALLS.slice(c0);
  return { r, store: STORE_CALLS.slice(s0), calls, writes: calls.filter((c) => WRITE_CALL.test(c.what)) };
}
const edit = (marketId: string, input: Opts["input"], over: Partial<Opts> = {}): Opts => ({ marketId, officerId: OFFICER, input, via: "edit", ...over });

// ── THE IMPLEMENTATION UNDER TEST — passed in, so the red twin can hand in defective ones ─────────────────
type Impl = { apply: Apply; recategorise: Recat };
const REAL: Impl = { apply: SVC.applyShortTitles, recategorise: MSVC.recategoriseMarket };

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════
// THE CHECKS — each group takes the implementation and a run tag (unique ids per run)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════
const EMOJI = String.fromCodePoint(0x1f642);
const LDQ = String.fromCharCode(0x201c);
const RDQ = String.fromCharCode(0x201d);

async function g1Hard(I: Impl, tag: string) {
  const cases: Array<{ issue: Issue; loc: Locale; field: TitleKey; raw: string; extra?: Opts["input"] }> = [
    { issue: "too_long", loc: "en", field: "shortTitleEn", raw: "Will Simba SC beat Young Africans at Benjamin Mkapa Stadium on 12 October?" },
    { issue: "too_long", loc: "sw", field: "shortTitleSw", raw: "Je, Simba SC itaifunga Young Africans katika Uwanja wa Benjamin Mkapa tarehe 12?" },
    { issue: "too_long", loc: "zh", field: "shortTitleZh", raw: `${"辛巴".repeat(14)}吗？` },
    { issue: "not_gsm7", loc: "en", field: "shortTitleEn", raw: `Will Simba beat Yanga ${EMOJI}?` },
    { issue: "not_gsm7", loc: "sw", field: "shortTitleSw", raw: `Je, Simba itashinda ${EMOJI}?` },
    { issue: "form", loc: "en", field: "shortTitleEn", raw: "Will Simba beat Yanga on 12 October" },
    { issue: "form", loc: "sw", field: "shortTitleSw", raw: "Simba itaifunga Yanga?" },
    { issue: "form", loc: "zh", field: "shortTitleZh", raw: "辛巴会赢" },
    // A copy of the English SHORT title, sent in the same act (the English is checked first, so the copy is caught).
    { issue: "copied_english", loc: "sw", field: "shortTitleSw", raw: "Je, Simba itashinda tarehe 12?", extra: { shortTitleEn: "Je, Simba itashinda tarehe 12?" } },
    { issue: "copied_english", loc: "zh", field: "shortTitleZh", raw: "Simba wins on 12 October?", extra: { shortTitleEn: "Simba wins on 12 October?" } },
  ];
  let n = 0;
  for (const c of cases) {
    const id = `mkt_ste_${tag}_h${++n}`;
    await seed(id, GOOD4);
    const { r, store, writes } = await run(I, edit(id, { ...(c.extra ?? {}), [c.field]: c.raw }));
    const sentence = SVC.shortTitleIssueSentence(c.loc, c.issue, c.raw);
    const name = `1.hard.${c.issue}.${c.loc}`;
    ok(`${name}.refused · refused, naming ${c.field}, in the rule's own sentence`,
      !r.ok && r.field === c.field && r.error.startsWith(sentence), j(r));
    ok(`${name}.unchanged · …and nothing moved: the four values, no store write, no row write`,
      same(await readFour(id), GOOD4) && store.length === 0 && writes.length === 0, j({ now: await readFour(id), store, writes: writes.map((w) => w.what) }));
    ok(`${name}.unaudited · …and no audit row claims an edit that did not happen (nor a sentinel check of one)`,
      (await trail(id)).length === 0 && (await checks(id)).length === 0, j([...(await trail(id)), ...(await checks(id))].map((e) => e.action)));
  }
}

async function g2Warn(I: Impl, tag: string) {
  const id = `mkt_ste_${tag}_warn`;
  await seed(id, GOOD4);
  const v = "Will Simba beat Yanga on 14 October?";
  const { r } = await run(I, edit(id, { shortTitleEn: v }));
  ok("2.warn · a number the full question does not contain is a WARNING: it saves, and is handed back to the officer",
    r.ok && r.changed && r.warnings.en.includes("number_drift") && (await readFour(id))?.shortTitleEn === v, j(r));
}

async function g3KeepClear(I: Impl, tag: string) {
  const id = `mkt_ste_${tag}_keep`;
  await seed(id, GOOD4);
  const sw = "Je, Simba itaifunga Yanga?";
  const a = await run(I, edit(id, { shortTitleSw: sw }));
  const afterA = await readFour(id);
  ok("3.keep · a field the act does not carry is KEPT — only the Swahili moved", a.r.ok && same(afterA, { ...GOOD4, shortTitleSw: sw }), j(afterA));
  const b = await run(I, edit(id, { shortTitleEn: "" }));
  const afterB = await readFour(id);
  ok("3.clear.empty · a field sent EMPTY is cleared (null — the card shows the full question)",
    b.r.ok && b.r.changed && same(afterB, { ...GOOD4, shortTitleSw: sw, shortTitleEn: null }), j(afterB));
  const c = await run(I, edit(id, { shortTitleZh: null }));
  const afterC = await readFour(id);
  ok("3.clear.null · null clears too", c.r.ok && c.r.changed && same(afterC, { ...GOOD4, shortTitleSw: sw, shortTitleEn: null, shortTitleZh: null }), j(afterC));
}

async function g4Competition(I: Impl, tag: string) {
  const bad: string[] = [];
  let n = 0;
  for (const raw of ["premier-league", "EPL", "politics"]) {
    const id = `mkt_ste_${tag}_c${++n}`;
    await seed(id, GOOD4);
    const { r, store } = await run(I, edit(id, { competition: raw }));
    if (r.ok || r.field !== "competition" || !same(await readFour(id), GOOD4) || store.length > 0) bad.push(`${raw} → ${j(r)}`);
  }
  ok("4.comp.unknown · a competition this build does not know is REFUSED by name — never coerced, never stored", bad.length === 0, bad.join(" | "));
  const id = `mkt_ste_${tag}_c0`;
  await seed(id, GOOD4);
  const t = await run(I, edit(id, { competition: " epl " }));
  ok("4.comp.trim · a known key is stored, trimmed", t.r.ok && (await readFour(id))?.competition === "epl", j(t.r));
  const c = await run(I, edit(id, { competition: "" }));
  ok("4.comp.clear · an empty competition clears it", c.r.ok && (await readFour(id))?.competition === null, j(c.r));
}

async function g5UpDown(I: Impl, tag: string) {
  const id = `mkt_ste_${tag}_ud`;
  await seed(id, { productLine: "UPDOWN" });
  const { r, store } = await run(I, edit(id, { shortTitleEn: GOOD4.shortTitleEn, competition: "epl" }));
  ok("5.updown · an Up & Down round is refused and untouched — rounds are not cards and are out of S2",
    !r.ok && same(await readFour(id), four({})) && store.length === 0 && (await trail(id)).length === 0, j({ r, now: await readFour(id), store }));
}

async function g6Refusals(I: Impl, tag: string) {
  const ghost = `mkt_ste_${tag}_nope`;
  const { r } = await run(I, edit(ghost, { shortTitleEn: GOOD4.shortTitleEn }));
  ok("6.unknown.market · a market that does not exist is refused, and not created", !r.ok && (await marketStore.get(ghost)) === null, j(r));
  const id = `mkt_ste_${tag}_anon`;
  await seed(id, GOOD4);
  const a = await run(I, edit(id, { shortTitleEn: "Will Simba win this weekend?" }, { officerId: "" }));
  ok("6.no.officer · an act with no officer is refused and changes nothing", !a.r.ok && same(await readFour(id), GOOD4) && a.store.length === 0, j(a.r));
}

async function g7Noop(I: Impl, tag: string) {
  const id = `mkt_ste_${tag}_noop`;
  await seed(id, GOOD4);
  const a = await run(I, edit(id, { ...GOOD4 }));
  const b = await run(I, edit(id, {}));
  ok("7.noop · the same values (or none) are `changed: false`, with no write and NO audit row",
    a.r.ok && !a.r.changed && a.r.recorded && b.r.ok && !b.r.changed && a.store.length === 0 && b.store.length === 0
      && a.writes.length === 0 && b.writes.length === 0 && (await trail(id)).length === 0,
    j({ a: a.r, b: b.r, store: [...a.store, ...b.store], rows: (await trail(id)).length }));
}

async function g8Audit(I: Impl, tag: string) {
  const id = `mkt_ste_${tag}_aud`;
  await seed(id, GOOD4);
  const { r } = await run(I, edit(id, { shortTitleSw: "Je, Simba itaifunga Yanga?" }));
  const rows = await trail(id);
  const row = rows[0];
  const pay = (row?.payload ?? {}) as { before?: Partial<Four>; after?: Partial<Four>; draft?: string };
  ok("8.audit.edit · an edit leaves ONE ADMIN row `market.short_title_edited` — the officer, the market, before and after",
    r.ok && r.recorded && rows.length === 1 && row.action === "market.short_title_edited" && row.category === "ADMIN"
      && row.actorId === OFFICER && row.targetType === "Market" && same(four(pay.before), r.before) && same(four(pay.after), r.after),
    j({ r, rows }));
  const id2 = `mkt_ste_${tag}_bf`;
  await seed(id2);
  const draftRef = `shortTitle.draft.${id2}`;
  const b = await run(I, edit(id2, { shortTitleEn: GOOD4.shortTitleEn, shortTitleSw: GOOD4.shortTitleSw }, { via: "backfill", draftRef }));
  const rows2 = await trail(id2);
  const pay2 = (rows2[0]?.payload ?? {}) as { draft?: string; before?: Partial<Four> };
  ok("8.audit.backfill · an approved draft is recorded as `market.short_title_approved`, carrying the draft it came from",
    b.r.ok && rows2.length === 1 && rows2[0].action === "market.short_title_approved" && pay2.draft === draftRef && same(four(pay2.before), four({})),
    j({ r: b.r, rows: rows2 }));
}

async function g9Fold(I: Impl, tag: string) {
  const id = `mkt_ste_${tag}_fold`;
  await seed(id, GOOD4);
  const { r } = await run(I, edit(id, { shortTitleSw: `Je, Simba itashinda ${LDQ}derby${RDQ}?` }));
  ok("9.fold · curly quotes pasted from a document are stored as their GSM-7 twins",
    r.ok && (await readFour(id))?.shortTitleSw === 'Je, Simba itashinda "derby"?', j({ r, now: await readFour(id) }));
}

async function g10Money(I: Impl, tag: string) {
  const id = `mkt_ste_${tag}_money`;
  await seed(id, GOOD4);
  const KEEP = ["titleEn", "titleSw", "titleZh", "resolutionCriterion", "sourceUrl", "category", "status", "yesPool", "noPool", "predictorCount", "productLine"] as const;
  const snap = async () => { const m = (await marketStore.get(id)) as unknown as Record<string, unknown> | null; return m ? KEEP.map((k) => m[k]) : null; };
  const before = await snap();
  const { r } = await run(I, edit(id, {
    shortTitleEn: "Will Simba win on 12 October?", shortTitleSw: "Je, Simba itashinda tarehe 12?", shortTitleZh: "辛巴会在10月12日获胜吗？", competition: "epl",
  }));
  const after = await snap();
  ok("10.money.untouched · the full wording, the source, the status, the pools and the stake count are exactly as they were",
    r.ok && r.changed && before !== null && same(before, after), j({ before, after }));
}

async function g11Narrow(I: Impl, tag: string) {
  const id = `mkt_ste_${tag}_narrow`;
  await seed(id, GOOD4);
  const { r, store } = await run(I, edit(id, { shortTitleEn: "Will Simba beat Yanga this weekend?" }));
  ok("11.write.narrow · a change is ONE `setShortTitles` — never the full-row `set`, never `stamp`, never a pool call",
    r.ok && r.changed && same(store, ["setShortTitles"]), j(store));
}

async function g12Database(I: Impl, tag: string) {
  const id = `mkt_ste_${tag}_db`;
  await seed(id, GOOD4);
  const a = await run(I, edit(id, { shortTitleEn: "Will Simba beat Yanga this weekend?" }));
  const w = a.writes;
  const keys = w[0]?.args?.data ? Object.keys(w[0].args.data).sort() : [];
  ok("12.write.one-update · ONE predictionMarket.update, of exactly the four columns and updatedAt — never an upsert, never a pool column",
    a.r.ok && a.r.changed && w.length === 1 && w[0].what === "predictionMarket.update" && w[0].args?.where?.id === id
      && same(keys, ["competition", "shortTitleEn", "shortTitleSw", "shortTitleZh", "updatedAt"]) && w[0].args?.data?.updatedAt instanceof Date,
    j({ writes: w.map((c) => c.what), keys }));
  const up = a.calls.findIndex((c) => c.what === "predictionMarket.update");
  const tx = up >= 0 ? a.calls[up].tx : null;
  const read = a.calls.findIndex((c) => c.what === "predictionMarket.findUnique" && c.tx === tx);
  const lock = a.calls.findIndex((c) => c.what === "$executeRaw" && c.tx === tx);
  ok("12.write.in-lock · the read and the write run on the LOCK's transaction, after the lock is taken",
    tx !== null && lock >= 0 && read > lock && up > read, j({ tx, lock, read, up }));
  const hard = await run(I, edit(id, { shortTitleEn: "Will Simba beat Yanga this weekend" }));
  const noop = await run(I, edit(id, {}));
  ok("12.write.none · a refusal and a no-op write nothing to the table", !hard.r.ok && noop.r.ok && hard.writes.length === 0 && noop.writes.length === 0,
    j({ hard: hard.writes.map((c) => c.what), noop: noop.writes.map((c) => c.what) }));
  const row = AUDIT_TABLE.find((x) => x.targetId === id && x.action === "market.short_title_edited");
  const pay = (row?.payload ?? {}) as { before?: Partial<Four>; after?: Partial<Four> };
  ok("12.audit.table · the audit row is in the TABLE (not only this process's ring), with before and after",
    !!row && a.r.ok && same(four(pay.before), a.r.before) && same(four(pay.after), a.r.after), j(row ?? null));
  const id2 = `mkt_ste_${tag}_dbfail`;
  await seed(id2, GOOD4);
  const v = "Will Simba win this weekend?";
  AUDIT_FAIL.add("market.short_title_edited");
  const f = await run(I, edit(id2, { shortTitleEn: v }));
  AUDIT_FAIL.delete("market.short_title_edited");
  ok("12.audit.unrecorded · an audit insert that fails leaves the act LANDED and says so: ok, changed, recorded false",
    f.r.ok && f.r.changed && f.r.recorded === false && (await readFour(id2))?.shortTitleEn === v, j(f.r));
  // The raw competition read on this twin is §14's (it runs here too, through the real `toStoredMarket`).

  // 🔴 MS-1 · the re-file's read and its full-row write, on the market LOCK's transaction — never a read a stake or a
  // short title could land behind.
  const id4 = `mkt_ste_${tag}_dbrecat`;
  await seed(id4, GOOD4);
  const c0 = CALLS.length;
  const rr = await I.recategorise({ marketId: id4, category: "weather", officerId: OFFICER });
  const rc = CALLS.slice(c0);
  const rUp = rc.findIndex((x) => x.what === "predictionMarket.upsert");
  const rTx = rUp >= 0 ? rc[rUp].tx : null;
  const rRead = rc.findIndex((x) => x.what === "predictionMarket.findUnique" && x.tx === rTx);
  const rLock = rc.findIndex((x) => x.what === "$executeRaw" && x.tx === rTx);
  ok("12.recategorise.in-lock · recategoriseMarket reads and writes on the market LOCK's transaction, after the lock is taken (MS-1)",
    rr.ok && rTx !== null && rLock >= 0 && rRead > rLock && rUp > rRead && ROWS.get(id4)?.category === "weather",
    j({ ok: rr.ok, rTx, rLock, rRead, rUp, calls: rc.map((x) => `${x.what}@${x.tx}`) }));
}

// ── §14 · THE COMPETITION IS READ RAW (MS-4) ─────────────────────────────────────────────────────────────────
async function g14Raw(I: Impl, tag: string) {
  const id = `mkt_ste_${tag}_raw`;
  const UNKNOWN = "premier-league"; // a key this build does not have — what a list change leaves behind
  await seed(id, { ...GOOD4, competition: UNKNOWN });
  const read = await run(I, edit(id, {}));
  const v = "Will Simba beat Yanga this weekend?";
  const w = await run(I, edit(id, { shortTitleEn: v }));
  const now = await readFour(id);
  const data = w.writes[0]?.args?.data; // the Prisma twin's UPDATE (database mode only)
  ok("14.competition.raw · a stored competition this build does not know survives a round trip untouched — read raw, kept by an edit of another field — and displays as none",
    read.r.ok && !read.r.changed && read.r.before.competition === UNKNOWN
      && w.r.ok && w.r.changed && w.r.before.competition === UNKNOWN && w.r.after.competition === UNKNOWN
      && now?.competition === UNKNOWN && now?.shortTitleEn === v
      && (!DB_MODE || data?.competition === UNKNOWN)
      && normaliseCompetition(now?.competition) === null,
    j({ read: read.r, write: w.r, now, data: data ?? null }));
  const again = await run(I, edit(id, { competition: ` ${UNKNOWN} ` }));
  ok("14.competition.resend · sending the stored key back is not a new value: no refusal, no change",
    again.r.ok && !again.r.changed && (await readFour(id))?.competition === UNKNOWN, j(again.r));
  const moved = await run(I, edit(id, { competition: "epl" }));
  ok("14.competition.replace · …and a known key replaces it", moved.r.ok && moved.r.changed && (await readFour(id))?.competition === "epl", j(moved.r));
}

// ── §15 · THE CONTRACT THE BACKFILL CALLS — onlyIfEmpty, expectedBefore, auditExtra; untouched stays verbatim ─────
async function g15Contract(I: Impl, tag: string) {
  // onlyIfEmpty — the English was set meanwhile; the Swahili and the competition are still empty.
  const id = `mkt_ste_${tag}_oie`;
  await seed(id, { shortTitleEn: GOOD4.shortTitleEn });
  const a = await run(I, edit(id, { shortTitleEn: "Will Simba win on 12 October?", shortTitleSw: GOOD4.shortTitleSw, competition: "ligi-kuu" },
    { via: "backfill", onlyIfEmpty: ["shortTitleEn", "shortTitleSw", "competition"] }));
  const now = await readFour(id);
  ok("15.onlyIfEmpty.skipped · a field named in onlyIfEmpty that the market already has is NOT written, and is reported in `skipped`",
    a.r.ok && a.r.changed && same(a.r.skipped, ["shortTitleEn"]) && now?.shortTitleEn === GOOD4.shortTitleEn, j({ r: a.r, now }));
  ok("15.onlyIfEmpty.written · …while the fields it names that are still empty are written",
    a.r.ok && now?.shortTitleSw === GOOD4.shortTitleSw && now?.competition === "ligi-kuu", j(now));
  const rows = await trail(id);
  ok("15.onlyIfEmpty.audit · …and the act's audit row says what was skipped",
    rows.length === 1 && same((rows[0].payload as { skipped?: unknown }).skipped, ["shortTitleEn"]), j(rows.map((e) => e.payload)));
  const b = await run(I, edit(id, { shortTitleEn: "Will Simba win on 12 October?", competition: "epl" }, { via: "backfill", onlyIfEmpty: ["shortTitleEn", "competition"] }));
  ok("15.onlyIfEmpty.none-left · when every field sent is skipped the act is a no-op: changed false, both listed, no write, no new row",
    b.r.ok && !b.r.changed && same(b.r.skipped, ["shortTitleEn", "competition"]) && b.store.length === 0 && b.writes.length === 0 && (await trail(id)).length === 1,
    j(b.r));

  // expectedBefore — what the officer's page showed.
  const e = `mkt_ste_${tag}_exp`;
  await seed(e, GOOD4);
  const x = await run(I, edit(e, { shortTitleEn: "Will Simba win on 12 October?" }, { expectedBefore: { shortTitleEn: "Will Simba beat Yanga on 12 Oct?" } }));
  ok("15.expectedBefore.refused · a field changed since the officer's page loaded is refused, NAMING it — nothing moves, no row",
    !x.r.ok && x.r.field === "shortTitleEn"
      && x.r.error === "The English short title was changed by someone else since this page loaded, so nothing was saved — reload the page to see it."
      && same(await readFour(e), GOOD4) && x.store.length === 0 && x.writes.length === 0 && (await trail(e)).length === 0,
    j(x.r));
  const xc = await run(I, edit(e, { shortTitleSw: "Je, Simba itashinda tarehe 12?" }, { expectedBefore: { competition: "epl" } }));
  ok("15.expectedBefore.competition · …the competition too, even when the act does not write it",
    !xc.r.ok && xc.r.field === "competition" && /^The competition was changed by someone else since this page loaded, so nothing was saved/.test(xc.r.error) && same(await readFour(e), GOOD4),
    j(xc.r));
  const y = await run(I, edit(e, { shortTitleEn: "Will Simba win on 12 October?", shortTitleZh: "" },
    { expectedBefore: { shortTitleEn: GOOD4.shortTitleEn, shortTitleSw: GOOD4.shortTitleSw, shortTitleZh: GOOD4.shortTitleZh, competition: "ligi-kuu" } }));
  ok("15.expectedBefore.match · when the page's values are still the market's, the act lands",
    y.r.ok && y.r.changed && (await readFour(e))?.shortTitleEn === "Will Simba win on 12 October?" && (await readFour(e))?.shortTitleZh === null, j(y.r));
  const e2 = `mkt_ste_${tag}_exp2`;
  await seed(e2, {});
  const z = await run(I, edit(e2, { shortTitleEn: GOOD4.shortTitleEn }, { expectedBefore: { shortTitleEn: "" } }));
  ok("15.expectedBefore.empty · a page that showed an empty field (\"\") matches a market that has none", z.r.ok && z.r.changed, j(z.r));

  // auditExtra — merged into the record, and never able to overwrite what the act itself records.
  const ax = `mkt_ste_${tag}_extra`;
  await seed(ax, GOOD4);
  const agreement = { status: "checked", languages: { sw: { agrees: true, issue: null } } };
  const t = await run(I, edit(ax, { shortTitleSw: "Je, Simba itashinda tarehe 12?" },
    { via: "backfill", draftRef: "shortTitle.draft.x@1", auditExtra: { agreement, editedByOfficer: true, before: "forged", after: "forged" } }));
  const pay = ((await trail(ax))[0]?.payload ?? {}) as Record<string, unknown>;
  ok("15.auditExtra.merged · auditExtra is merged into the act's audit row (the draft's sentinel agreement, editedByOfficer)",
    t.r.ok && sameC(pay.agreement, agreement) && pay.editedByOfficer === true && pay.draft === "shortTitle.draft.x@1", j(pay));
  ok("15.auditExtra.cannot-overwrite · …and can never overwrite what the act itself records (before and after)",
    t.r.ok && same(four(pay.before as Partial<Four>), t.r.before) && same(four(pay.after as Partial<Four>), t.r.after), j({ before: pay.before, after: pay.after }));

  // An untouched stored value is kept VERBATIM, and never blocks an edit to another field.
  const lg = `mkt_ste_${tag}_legacy`;
  const LONG_EN = "Will Simba SC beat Young Africans at the Benjamin Mkapa Stadium on 12 October?"; // over the budget
  const CURLY_SW = `Je, Simba itashinda ${LDQ}derby${RDQ} tarehe 12?`; // stored before the fold existed
  await seed(lg, { shortTitleEn: LONG_EN, shortTitleSw: CURLY_SW });
  const l = await run(I, edit(lg, { shortTitleZh: GOOD4.shortTitleZh }));
  const lNow = await readFour(lg);
  ok("15.untouched.verbatim · a stored value a rule would now refuse neither blocks an edit to another field nor is rewritten by it",
    l.r.ok && l.r.changed && lNow?.shortTitleEn === LONG_EN && lNow?.shortTitleSw === CURLY_SW && lNow?.shortTitleZh === GOOD4.shortTitleZh,
    j({ r: l.r, now: lNow }));
  const cp = `mkt_ste_${tag}_caused`;
  const SW = "Je, Simba itashinda tarehe 12?";
  await seed(cp, { shortTitleSw: SW });
  const c = await run(I, edit(cp, { shortTitleEn: SW }));
  ok("15.untouched.caused · …but a problem THIS act gives an untouched field is refused, naming it (the English made equal to the Swahili)",
    !c.r.ok && c.r.field === "shortTitleSw" && c.r.error.startsWith(SVC.shortTitleIssueSentence("sw", "copied_english", SW)) && (await readFour(cp))?.shortTitleEn === null,
    j(c.r));
}

// ── §16 · THE SENTINEL (ST-3) ──────────────────────────────────────────────────────────────────────────────
async function g16Sentinel(I: Impl, tag: string) {
  SENTINEL_MODE = "agree";
  const en = "Will Simba win on 12 October?";
  const sw = "Je, Simba itashinda tarehe 12?";
  const zh = "辛巴会在10月12日获胜吗？";
  const id = `mkt_ste_${tag}_sen`;
  await seed(id, GOOD4);
  const s0 = SENTINEL_CALLS.length;
  const a = await run(I, edit(id, { shortTitleEn: en, shortTitleSw: sw, competition: "epl" }));
  const calls = SENTINEL_CALLS.slice(s0);
  const rows = await checks(id);
  const pay = (rows[0]?.payload ?? {}) as { via?: string; languages?: unknown; checked?: unknown; status?: string; verdicts?: unknown };
  ok("16.sentinel.changed · after an edit lands, the sentinel reads exactly the languages it changed — their NEW words — once",
    a.r.ok && a.r.changed && calls.length === 1 && calls[0]?.marketId === id && sameC(calls[0]?.shorts, { en, sw }), j(calls));
  ok("16.sentinel.outside-lock · …from OUTSIDE the market lock", calls.length === 1 && calls[0]?.inLock === false, j(calls));
  ok("16.sentinel.after-record · …and only once the act's own audit row is on file", calls.length === 1 && calls[0]?.afterRecord === true, j(calls));
  ok("16.sentinel.result · …and the act hands its verdict back: checked, per language",
    a.r.ok && sameC(a.r.agreement, { status: "checked", perLocale: { en: { agrees: true, issue: null }, sw: { agrees: true, issue: null } } }),
    j(a.r.ok ? a.r.agreement : a.r));
  ok("16.sentinel.row · …and records it: ONE ADMIN `market.short_title_checked` row — the officer, via, the languages, the words, each verdict",
    rows.length === 1 && rows[0].category === "ADMIN" && rows[0].actorId === OFFICER && rows[0].targetType === "Market" && pay.via === "edit"
      && same(pay.languages, ["en", "sw"]) && sameC(pay.checked, { en, sw }) && pay.status === "checked"
      && sameC(pay.verdicts, { en: { agrees: true, issue: null }, sw: { agrees: true, issue: null } }),
    j(rows.map((e) => e.payload)));

  const b0 = SENTINEL_CALLS.length;
  const b = await run(I, edit(id, { shortTitleZh: zh }, { sentinelLocales: "none" }));
  ok("16.sentinel.none · sentinelLocales \"none\": the act lands and the sentinel is not asked — agreement null, no new row",
    b.r.ok && b.r.changed && SENTINEL_CALLS.length === b0 && b.r.agreement === null && (await checks(id)).length === 1, j(b.r));
  const c0 = SENTINEL_CALLS.length;
  const c = await run(I, edit(id, { competition: "ucl" }, { sentinelLocales: ["zh", "en"] }));
  ok("16.sentinel.list · a list names the languages read — their CURRENT words — whatever the act changed",
    c.r.ok && c.r.changed && SENTINEL_CALLS.length === c0 + 1 && sameC(SENTINEL_CALLS[c0]?.shorts, { en, zh }), j(SENTINEL_CALLS.slice(c0)));
  const d0 = SENTINEL_CALLS.length;
  const d1 = await run(I, edit(id, { competition: "epl" }));
  const d2 = await run(I, edit(id, {}));
  const d3 = await run(I, edit(id, { shortTitleEn: "Will Simba win on 12 October" }));
  ok("16.sentinel.quiet · nothing new to read, nothing asked: a competition-only change, a no-op and a refusal never call the sentinel",
    d1.r.ok && d1.r.changed && d1.r.agreement === null && d2.r.ok && !d2.r.changed && d2.r.agreement === null && !d3.r.ok && SENTINEL_CALLS.length === d0,
    j({ d1: d1.r, d2: d2.r, d3: d3.r, calls: SENTINEL_CALLS.length - d0 }));

  const dg = `mkt_ste_${tag}_sendis`;
  await seed(dg, GOOD4);
  SENTINEL_MODE = "disagree";
  const dis = await run(I, edit(dg, { shortTitleEn: en }));
  SENTINEL_MODE = "agree";
  ok("16.sentinel.disagree · a disagreement comes back as one, with the sentinel's reason — the write still stands",
    dis.r.ok && dis.r.changed && sameC(dis.r.agreement, { status: "checked", perLocale: { en: { agrees: false, issue: DISAGREE_ISSUE } } }) && (await readFour(dg))?.shortTitleEn === en,
    j(dis.r));

  // Every failure reads "unchecked" — never "agrees" — and never fails or undoes the act.
  const f = `mkt_ste_${tag}_senfail`;
  await seed(f, GOOD4);
  SENTINEL_MODE = "throw";
  const g = await run(I, edit(f, { shortTitleEn: en }));
  const gNow = await readFour(f);
  SENTINEL_MODE = "partial";
  const h = await run(I, edit(f, { shortTitleEn: GOOD4.shortTitleEn, shortTitleSw: sw }));
  SENTINEL_MODE = "unchecked";
  const u = await run(I, edit(f, { shortTitleSw: GOOD4.shortTitleSw }));
  SENTINEL_MODE = "garbage";
  const gb = await run(I, edit(f, { shortTitleZh: "辛巴会在10月12日获胜吗？" }));
  SENTINEL_MODE = "agree";
  ok("16.sentinel.garbage · an answer that is not an answer at all is \"unchecked\" — never \"agrees\"",
    gb.r.ok && gb.r.changed && gb.r.agreement?.status === "unchecked" && /could not be read/.test(gb.r.agreement?.reason ?? "") && sameC(gb.r.agreement?.perLocale, {}),
    j(gb.r));
  ok("16.sentinel.throws · a sentinel that throws never fails the act: it LANDED, and the verdict is \"unchecked\" with the reason — never \"agrees\"",
    g.r.ok && g.r.changed && gNow?.shortTitleEn === en && g.r.agreement?.status === "unchecked" && /failed/.test(g.r.agreement?.reason ?? "")
      && sameC(g.r.agreement?.perLocale, {}),
    j(g.r));
  ok("16.sentinel.partial · an answer that leaves out a language asked about is \"unchecked\" as a WHOLE — never a partial \"agrees\"",
    h.r.ok && h.r.changed && h.r.agreement?.status === "unchecked" && sameC(h.r.agreement?.perLocale, {}) && /English/.test(h.r.agreement?.reason ?? ""),
    j(h.r));
  const fr = await checks(f);
  const allUnchecked = fr.length === 4 && fr.every((e) => {
    const p = e.payload as { status?: string; verdicts?: Record<string, { unchecked?: boolean; agrees?: unknown }> };
    return p.status === "unchecked" && Object.values(p.verdicts ?? {}).length > 0 && Object.values(p.verdicts ?? {}).every((v) => v.unchecked === true && v.agrees === undefined);
  });
  ok("16.sentinel.unchecked · \"not checked\" stays not checked, with its reason — and all four failures are on the record as unchecked, per language",
    u.r.ok && u.r.agreement?.status === "unchecked" && u.r.agreement?.reason === "the sentinel is switched off on this deployment" && allUnchecked,
    j(fr.map((e) => e.payload)));

  // recordShortTitleAgreement — the create path's call.
  const cr = `mkt_ste_${tag}_create`;
  await seed(cr, { shortTitleEn: GOOD4.shortTitleEn, shortTitleZh: GOOD4.shortTitleZh });
  const k0 = SENTINEL_CALLS.length;
  const rec = await SVC.recordShortTitleAgreement({ marketId: cr, officerId: OFFICER, locales: ["en", "sw", "zh"], via: "create" });
  const crRows = await checks(cr);
  ok("16.record.create · recordShortTitleAgreement reads the market fresh, asks only about the languages that HAVE a short title, and records via \"create\"",
    rec?.status === "checked" && same(Object.keys(rec?.perLocale ?? {}), ["en", "zh"]) && SENTINEL_CALLS.length === k0 + 1
      && sameC(SENTINEL_CALLS[k0]?.shorts, { en: GOOD4.shortTitleEn, zh: GOOD4.shortTitleZh })
      && crRows.length === 1 && (crRows[0].payload as { via?: string }).via === "create" && crRows[0].actorId === OFFICER,
    j({ rec, rows: crRows.map((e) => e.payload) }));
  const none = await SVC.recordShortTitleAgreement({ marketId: cr, officerId: OFFICER, locales: ["sw"], via: "create" });
  const ghost = await SVC.recordShortTitleAgreement({ marketId: `mkt_ste_${tag}_ghost`, officerId: OFFICER, locales: ["en"], via: "create" });
  const empty = await SVC.recordShortTitleAgreement({ marketId: cr, officerId: OFFICER, locales: [], via: "create" });
  const ud = `mkt_ste_${tag}_senud`;
  await seed(ud, { shortTitleEn: GOOD4.shortTitleEn, productLine: "UPDOWN" });
  const round = await SVC.recordShortTitleAgreement({ marketId: ud, officerId: OFFICER, locales: ["en"], via: "create" });
  ok("16.record.nothing · nothing to read is null and no row: a language with no short title, a market that does not exist, no language named, an Up & Down round",
    none === null && ghost === null && empty === null && round === null && (await checks(cr)).length === 1 && (await checks(ud)).length === 0
      && SENTINEL_CALLS.length === k0 + 1,
    j({ none, ghost, empty, round }));
  const getNow = MS.get;
  MS.get = async () => { throw new Error("the market store is down (simulated)"); };
  let threw = false;
  let broken: Awaited<ReturnType<typeof SVC.recordShortTitleAgreement>> = null;
  try { broken = await SVC.recordShortTitleAgreement({ marketId: cr, officerId: OFFICER, locales: ["en"], via: "create" }); } catch { threw = true; } finally { MS.get = getNow; }
  const brokenRows = await checks(cr);
  ok("16.record.never-throws · a store that throws never escapes: the record is \"unchecked\" with the reason, and the row says so",
    !threw && broken?.status === "unchecked" && /could not run/.test(broken?.reason ?? "") && brokenRows.length === 2
      && (brokenRows[0].payload as { status?: string }).status === "unchecked",
    j({ threw, broken, rows: brokenRows.map((e) => e.payload) }));
}

// ── §17 · THE RACES — in memory, where the lock really queues (the fake client's lock does not) ─────────────
async function g17Races(I: Impl, tag: string) {
  // onlyIfEmpty is judged on the fresh read INSIDE the lock: an officer's value set while the approval waits survives.
  const id = `mkt_ste_${tag}_race`;
  await seed(id, {});
  const officerEn = GOOD4.shortTitleEn!;
  let pending: Promise<Res> | null = null;
  await withLock(`market:${id}`, async () => {
    // Started OUTSIDE the held lock, so it queues behind it rather than re-entering it.
    pending = runOutsideLock(() => I.apply(edit(id, { shortTitleEn: "Will Simba win on 12 October?" }, { via: "backfill", onlyIfEmpty: ["shortTitleEn"] })));
    await marketStore.setShortTitles(id, { shortTitleEn: officerEn, shortTitleSw: null, shortTitleZh: null, competition: null });
  });
  const r = pending ? await pending : null;
  const now = await readFour(id);
  ok("17.onlyIfEmpty.in-lock · a short title an officer sets while an approval WAITS for the lock is never overwritten — judged on the fresh read inside it",
    !!r && r.ok && same(r.skipped, ["shortTitleEn"]) && now?.shortTitleEn === officerEn, j({ r, now }));

  // 🔴 MS-1 · a re-file that waits on the lock never puts back a short title applied meanwhile.
  const rc = `mkt_ste_${tag}_recat`;
  await seed(rc, GOOD4);
  const newEn = "Will Simba win on 12 October?";
  let refile: Promise<unknown> | null = null;
  await withLock(`market:${rc}`, async () => {
    refile = runOutsideLock(() => I.recategorise({ marketId: rc, category: "weather", officerId: OFFICER }));
    await marketStore.setShortTitles(rc, { ...GOOD4, shortTitleEn: newEn });
  });
  const rr = (refile ? await refile : null) as { ok?: boolean } | null;
  const m = await marketStore.get(rc);
  ok("17.recategorise.lock · a re-file that waits on the market lock never puts back a short title applied meanwhile — and still lands (MS-1)",
    rr?.ok === true && m?.category === "weather" && m?.shortTitleEn === newEn, j({ rr, category: m?.category, en: m?.shortTitleEn ?? null }));
}

// ── §18 · THE WORDS, PURE ────────────────────────────────────────────────────────────────────────────────────
function g18Words() {
  const ZW = String.fromCharCode(0x200b);
  const rawLong = `  Will ${LDQ}Simba${RDQ}${ZW}   SC beat Young Africans at the Benjamin Mkapa on Sunday?${ZW}  `;
  const cleaned = cleanShortTitle("en", rawLong);
  const s1 = SVC.shortTitleIssueSentence("en", "too_long", rawLong);
  ok("18.sentence.too_long · \"it has N\" counts the value the rule judged (trimmed, zero-width dropped, folded) — not the raw text",
    shortTitleIssues("en", cleaned, { full: T.en, englishFull: T.en }).includes("too_long") && codePoints(cleaned) !== codePoints(rawLong)
      && s1.endsWith(`it has ${codePoints(cleaned)}.`) && s1 === SVC.shortTitleIssueSentence("en", "too_long", cleaned),
    j({ s1, cleaned: codePoints(cleaned), raw: codePoints(rawLong) }));
  const rawSw = `Je, ${LDQ}Simba${RDQ} itashinda ${EMOJI}?`;
  const s2 = SVC.shortTitleIssueSentence("sw", "not_gsm7", rawSw);
  ok("18.sentence.not_gsm7 · the characters listed are only those that SURVIVED the fold — never a curly quote a text message carries as a straight one",
    offendingChars(rawSw).includes(LDQ) && shortTitleIssues("sw", cleanShortTitle("sw", rawSw), { full: T.sw, englishFull: T.en }).includes("not_gsm7")
      && s2.endsWith(`: ${EMOJI}.`) && !s2.includes(LDQ) && !s2.includes(RDQ),
    s2);

  const L = SVC.agreementVerdictLines;
  ok("18.lines.checked · a checked record reads \"agrees\" / \"does not agree: <issue>\", only for the languages it holds",
    sameC(L({ status: "checked", perLocale: { en: { agrees: true, issue: null }, sw: { agrees: false, issue: "It drops the date." } } }, ["en", "sw", "zh"]),
      { en: { kind: "agrees", text: "agrees" }, sw: { kind: "disagrees", text: "does not agree: It drops the date." } }));
  ok("18.lines.unchecked · \"not checked\", with the reason beside it (for the surface to say ONCE), for every language asked; nothing checked is no line at all — never \"agrees\"",
    sameC(L({ status: "unchecked", reason: "no ANTHROPIC_API_KEY on this deployment", perLocale: {} }, ["en", "zh"]), {
      en: { kind: "unchecked", text: "not checked", reason: "no ANTHROPIC_API_KEY on this deployment" },
      zh: { kind: "unchecked", text: "not checked", reason: "no ANTHROPIC_API_KEY on this deployment" },
    }) && sameC(L({ status: "unchecked", perLocale: {} }, ["sw"]), { sw: { kind: "unchecked", text: "not checked", reason: "the sentinel gave no reason" } })
      && sameC(L(null, ["en"]), {}));
  const F = (en: string | null, sw: string | null, zh: string | null) => ({ shortTitleEn: en, shortTitleSw: sw, shortTitleZh: zh, competition: null });
  ok("18.lines.changed · the languages read by default are those given a NEW, present short title — a cleared or untouched one is not",
    same(SVC.changedShortTitleLocales(F("A?", "Je, b?", "c？"), F("A2?", null, "c？")), ["en"])
      && same(SVC.changedShortTitleLocales(F(null, null, null), F("A?", "Je, b?", "c？")), ["en", "sw", "zh"]));

  // The seam that fakes the sentinel must be inert in production: a call there is a bug, and it is loud.
  const envNow = process.env.NODE_ENV;
  let refused = false;
  try {
    process.env.NODE_ENV = "production";
    SVC.__setShortTitleSentinelForTests(null);
  } catch { refused = true; } finally {
    if (envNow === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = envNow;
    SVC.__setShortTitleSentinelForTests(FAKE_SENTINEL); // whatever happened above, the fake stands in again
  }
  ok("18.seam.production · the sentinel's test seam refuses to run in production", refused);
}

// ── THE SOURCE WORLD — the wiring §13 reads, as text, so the red twin can plant edits in memory ───────────
type World = { actions: string; control: string; page: string; wizard: string; gate: string; service: string; rules: string };
const readSrc = (rel: string) => decomment(readFileSync(join(REPO, rel), "utf8").replace(/\r\n/g, "\n"));
const WORLD: World = {
  actions: readSrc("src/app/markets/actions.ts"),
  control: readSrc("src/app/admin/markets/short-title-control.tsx"),
  page: readSrc("src/app/admin/markets/[id]/page.tsx"),
  wizard: readSrc("src/app/admin/markets/new/wizard.tsx"),
  gate: readSrc("scripts/admin-action-gate.test.mjs"),
  service: readSrc("src/lib/server/short-title-service.ts"),
  rules: readSrc("src/lib/markets/short-title.ts"),
};
function fnBody(src: string, name: string): string {
  const i = src.indexOf(`export async function ${name}(`);
  if (i < 0) return "";
  const k = src.indexOf("\nexport ", i + 1);
  return src.slice(i, k < 0 ? src.length : k);
}

function g13Wiring(W: World) {
  const body = fnBody(W.actions, "setMarketShortTitlesAction");
  const iS = body.indexOf("currentSession()");
  const iR = body.indexOf('redirect("/auth/login")');
  const iG = body.indexOf('await requireAdminOrThrow(session.userId, "setMarketShortTitlesAction")');
  const iA = body.indexOf("applyShortTitles(");
  ok("13.action.gate · setMarketShortTitlesAction: session → sign-in redirect → requireAdminOrThrow → applyShortTitles, in that order",
    body.length > 0 && iS >= 0 && iS < iR && iR < iG && iG < iA, j({ iS, iR, iG, iA }));
  ok("13.action.via · …as the officer in the session, via \"edit\"", /officerId:\s*session\.userId/.test(body) && /via:\s*"edit"/.test(body));
  const iReopen = W.actions.indexOf("export async function adminReopenMarketAction(");
  const iMine = W.actions.indexOf("export async function setMarketShortTitlesAction(");
  const recat = W.actions.slice(W.actions.indexOf("recategoriseMarketAction"), W.actions.indexOf("adminReopenMarketAction"));
  ok("13.action.place · it sits AFTER adminReopenMarketAction, outside the block test:recategorise reads as recategorise's own",
    iReopen > 0 && iMine > iReopen && !/applyShortTitles|setMarketShortTitlesAction/.test(recat), j({ iReopen, iMine }));
  ok("13.action.absent · a field ABSENT from the form is undefined (keep), never \"\" (clear)", /formData\.has\(/.test(body));
  const reval = body.match(/revalidatePath\(/g) ?? [];
  ok("13.action.revalidate · the four pages refresh only when something changed, and /results is not one of them",
    /if \(!r\.ok\) return r;/.test(body)
      && /if \(r\.changed\) \{\s*revalidatePath\("\/admin\/markets"\);\s*revalidatePath\(`\/admin\/markets\/\$\{marketId\}`\);\s*revalidatePath\("\/markets"\);\s*revalidatePath\(`\/markets\/\$\{marketId\}`\);\s*\}/.test(body)
      && reval.length === 4 && !body.includes('"/results"'),
    `${reval.length} revalidations`);
  ok("13.action.warnings · warnings go back to the officer PER LANGUAGE (shown under the field they name), in the service's own sentences",
    /shortTitleIssueSentence\(/.test(body) && /warningLines\[loc\] = r\.warnings\[loc\]\.map\(/.test(body));
  ok("13.action.expected · the action reads what the page showed (`expected.<field>`, for every field) and hands it to applyShortTitles as expectedBefore",
    /for \(const k of SHORT_TITLE_FIELDS\) \{\s*const shown = field\(`expected\.\$\{k\}`\);\s*if \(shown !== undefined\) expectedBefore\[k\] = shown;\s*\}/.test(body)
      && /via: "edit",\s*expectedBefore,\s*\}\);/.test(body));
  ok("13.action.sentinel · the sentinel is left ON for the edit (the service's \"changed\"), and its verdict goes back in the service's words for the languages it read",
    !/sentinelLocales/.test(body)
      && /const sentinelLines = agreementVerdictLines\(r\.agreement, r\.changed \? changedShortTitleLocales\(r\.before, r\.after\) : \[\]\);/.test(body)
      && /const sentinelReason = Object\.values\(sentinelLines\)\.find\(\(l\) => l\?\.kind === "unchecked"\)\?\.reason \?\? null;/.test(body)
      && /return \{ \.\.\.r, warningLines, sentinelLines, sentinelReason \};/.test(body));

  const create = fnBody(W.actions, "createMarketAction");
  const iRule = create.indexOf("normaliseShortTitleSet(");
  const iRefuse = create.indexOf("shortTitleIssueSentence(loc, issue, shortRaw[key])");
  const iCreate = create.indexOf("createMarket(input)");
  ok("13.create.rule · createMarketAction runs the shared rule and REFUSES a hard issue in the service's words, with its field, before anything is created",
    iRule > 0 && iRefuse > iRule && iCreate > iRefuse && /field: key/.test(create) && /HARD_ISSUES\.has\(/.test(create), j({ iRule, iRefuse, iCreate }));
  ok("13.create.pass · …and hands the normalised values and a checked competition to createMarket",
    /shortTitleEn: shorts\.shortTitleEn/.test(create) && /shortTitleSw: shorts\.shortTitleSw/.test(create) && /shortTitleZh: shorts\.shortTitleZh/.test(create)
      && /isCompetition\(competitionRaw\)/.test(create) && /competition: competitionRaw \|\| null/.test(create));
  const iRecord = create.indexOf("recordShortTitleAgreement(");
  ok("13.create.sentinel · once the market EXISTS, createMarketAction asks the sentinel about every short title it STORED, via \"create\" — never awaited, so a slow check never holds the publish",
    iCreate > 0 && iRecord > iCreate
      && /const storedShort = SHORT_TITLE_LOCALES\.filter\(\(loc\) => shortTitleFor\(loc, m\) !== null\);/.test(create)
      && /void recordShortTitleAgreement\(\{ marketId: m\.id, officerId: session\.userId, locales: storedShort, via: "create" \}\);/.test(create)
      && !/await recordShortTitleAgreement\(/.test(create),
    j({ iCreate, iRecord }));

  const wiz = W.wizard;
  ok("13.wizard.rule · the wizard runs the SAME imported rule, and a hard issue blocks Continue",
    /import \{[^}]*normaliseShortTitleSet[^}]*\} from "@\/lib\/markets\/short-title"/.test(wiz) && !/function\s+normaliseShortTitleSet/.test(wiz)
      && /step === 0\) return titleEn\.length >= 10 && !shortsHard/.test(wiz));
  ok("13.wizard.sends · …and sends the three short titles and the competition",
    (["shortTitleEn", "shortTitleSw", "shortTitleZh"] as const).every((k) => wiz.includes(`fd.set("${k}", shortInput.${k})`)) && wiz.includes('fd.set("competition", competition)'));

  const c = W.control;
  ok("13.control.gate · the control consults the act gate, disables Save for a read-only role, and guards its exits",
    /\buseMayAct\s*\(\)/.test(c) && /disabled=\{!dirty \|\| !mayAct\}/.test(c) && /<UnsavedChangesGuard\b/.test(c) && /setMarketShortTitlesAction/.test(c));
  ok("13.control.budget · the counters read SHORT_TITLE_MAX and codePoints — no budget typed by hand",
    /SHORT_TITLE_MAX\[locale\]/.test(c) && /codePoints\(cleanShortTitle\(/.test(c) && !/\b(?:56|28)\b/.test(c));
  const iWarn = c.indexOf("<Callout tone=\"info\" title={SHORT_TITLE_RULE_TITLE}>{SHORT_TITLE_RULE_BODY}</Callout>");
  // The rule's words live in the rule module (one wording for every surface) — read there, as text, so a plant can move them.
  const ruleBody = /export const SHORT_TITLE_RULE_BODY =\s*"([^"]*)"/.exec(W.rules)?.[1] ?? "";
  ok("13.control.warning · the rule is there, in the ONE shared wording, ABOVE the inputs — and it says the short title must say exactly the same thing",
    iWarn > 0 && iWarn < c.indexOf("<Input") && ruleBody.includes("the short title must say exactly the same thing"),
    j({ iWarn, iInput: c.indexOf("<Input"), ruleBody: ruleBody.slice(0, 90) }));
  ok("13.control.sends-moved · only the fields the officer changed are sent (absent = keep on the server)", /for \(const k of send\) fd\.set\(k, values\[k\]\)/.test(c));
  ok("13.control.expected · …and each one carries what the page showed, so another officer's change is refused, not overwritten",
    /const shown = saved;/.test(c) && /for \(const k of send\) fd\.set\(`expected\.\$\{k\}`, shown\[k\]\);/.test(c));
  ok("13.control.sentinel · the sentinel's verdict is shown beside each language it read, in the three inks, and typing clears it",
    /const line = r\.sentinelLines\[locale\];/.test(c) && /setVerdicts\(\(prev\) => \(\{ \.\.\.prev, \.\.\.lines \}\)\);/.test(c) && /Sentinel check: \{verdict\.text\}/.test(c)
      && /agrees: "text-success-fg", disagrees: "text-danger-fg", unchecked: "text-warning-fg"/.test(c)
      && /if \(k !== "competition"\) setVerdicts\(\(s\) => \(\{ \.\.\.s, \[k\]: undefined \}\)\);/.test(c));
  ok("13.control.focus · a refused field takes the focus once the save has SETTLED (an effect on [focusField, pending]) — never inside the transition, where every input is disabled",
    /useEffect\(\(\) => \{\s*if \(pending \|\| !focusField\) return;\s*focusFirstInvalid\(boxRef\.current, \[focusField\]\);\s*setFocusField\(null\);\s*\}, \[focusField, pending\]\);/.test(c)
      && (c.match(/focusFirstInvalid\(/g) ?? []).length === 1 && /setFocusField\(r\.field as Key\);/.test(c));
  ok("13.control.unknown-competition · a stored competition this build does not know is SHOWN as such, not as a blank select",
    /options=\{competitionOptions\(saved\.competition\)\}/.test(c) && /if \(!stored \|\| isCompetition\(stored\)\) return COMPETITION_OPTIONS;/.test(c)
      && /not a competition this build knows/.test(c));
  ok("13.page.updown · the page renders the control for a long-form market only, never an Up & Down round",
    /m\.productLine !== "UPDOWN" && \([\s\S]{0,400}?<ShortTitleControl\b/.test(W.page) && (W.page.match(/<ShortTitleControl\b/g) ?? []).length === 1);
  ok("13.gate.pin · test:admin-action-gate pins the action as admin-gated", W.gate.includes('"markets/actions.ts::setMarketShortTitlesAction"'));

  // The service, read as text — the twin of §16's behaviour, so a plant can move the call and be seen.
  const svc = fnBody(W.service, "applyShortTitles");
  const lockAt = svc.indexOf("withLock(`market:${marketId}`");
  const lockEnd = lockAt >= 0 ? svc.indexOf("\n  });\n", lockAt) : -1;
  const inLockText = lockAt >= 0 && lockEnd > lockAt ? svc.slice(lockAt, lockEnd) : "";
  const auditAt = svc.indexOf("await audit(", Math.max(lockEnd, 0));
  const sentinelAt = svc.indexOf("recordShortTitleAgreement(", Math.max(lockEnd, 0));
  ok("13.service.sentinel-after · in applyShortTitles the sentinel is called after the lock's block closes and after the act's audit row — never inside the lock",
    inLockText.length > 500 && !/recordShortTitleAgreement\(|agreementChecker\(|checkShortTitleAgreement\(/.test(inLockText)
      && auditAt > lockEnd && sentinelAt > auditAt,
    j({ lockAt, lockEnd, auditAt, sentinelAt }));
  ok("13.service.seam · the sentinel's test seam refuses to run in production",
    /export function __setShortTitleSentinelForTests\([^)]*\): void \{\s*if \(process\.env\.NODE_ENV === "production"\) throw new Error\(/.test(W.service));
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════
async function runBehaviour(I: Impl, tag: string) {
  await g1Hard(I, tag);
  await g2Warn(I, tag);
  await g3KeepClear(I, tag);
  await g4Competition(I, tag);
  await g5UpDown(I, tag);
  await g6Refusals(I, tag);
  await g7Noop(I, tag);
  await g8Audit(I, tag);
  await g9Fold(I, tag);
  await g10Money(I, tag);
  await g11Narrow(I, tag);
  await g14Raw(I, tag);
  await g15Contract(I, tag);
  await g16Sentinel(I, tag);
}
async function runMemory(I: Impl, W: World, tag: string) {
  await runBehaviour(I, tag);
  await g17Races(I, tag);
  g18Words();
  g13Wiring(W);
}
async function runDatabase(I: Impl, tag: string) {
  await runBehaviour(I, tag);
  await g12Database(I, tag);
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════
// THE PLANTS — defective implementations and source edits, each named for the check that must catch it
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════
type Plant = { name: string; expect: RegExp; impl?: Partial<Impl>; world?: (w: World) => World };
const real = (o: Opts) => SVC.applyShortTitles(o);
/** The values an act would leave, per the shared rule, read the way the service reads them. */
async function wouldBe(o: Opts, strict = false) {
  const m = await marketStore.get(o.marketId);
  if (!m) return null;
  const pick = (k: TitleKey) => (o.input[k] === undefined ? (m as Partial<Four>)[k] ?? null : o.input[k]);
  return normaliseShortTitleSet({
    titleEn: m.titleEn, titleSw: m.titleSw, titleZh: m.titleZh,
    shortTitleEn: pick("shortTitleEn"), shortTitleSw: pick("shortTitleSw"), shortTitleZh: pick("shortTitleZh"),
  }, { strict });
}
const swap = (w: World, key: keyof World, from: string, to: string): World => ({ ...w, [key]: w[key].replace(from, to) });

/** MS-4's defect, restored for the length of one act: the store's read coerces the competition (an unknown key → none). */
async function withCoercingRead<T>(fn: () => Promise<T>): Promise<T> {
  const getNow = MS.get;
  const read = getNow.bind(marketStore);
  MS.get = async (...a: unknown[]) => {
    const m = (await read(...a)) as Record<string, unknown> | null;
    return m ? { ...m, competition: normaliseCompetition(m.competition) } : m;
  };
  try { return await fn(); } finally { MS.get = getNow; }
}
/** `recategoriseMarket` as it was before MS-1: an unlocked read, then the full-row write of the row it read. */
const unlockedRecategorise: Recat = async (o) => {
  const m = await marketStore.get(o.marketId);
  if (!m) return { ok: false, error: "Market not found." } as Awaited<ReturnType<Recat>>;
  const before = m.category;
  await marketStore.set({ ...m, category: o.category as typeof m.category });
  return { ok: true, data: { before, after: o.category as typeof m.category } } as Awaited<ReturnType<Recat>>;
};

const MEMORY_PLANTS: Plant[] = [
  { name: "an absent field is cleared instead of kept", expect: /^3\.keep/,
    impl: { apply: (o) => real({ ...o, input: { shortTitleEn: o.input.shortTitleEn ?? "", shortTitleSw: o.input.shortTitleSw ?? "", shortTitleZh: o.input.shortTitleZh ?? "", competition: o.input.competition ?? "" } }) } },
  { name: "a hard issue is dropped to empty and the rest saved (refused values quietly become 'none')", expect: /^1\.hard\.[a-z_]+\.[a-z]+\.refused/,
    impl: { apply: async (o) => {
      const set = await wouldBe(o);
      if (!set) return real(o);
      const input = { ...o.input };
      for (const [loc, k] of LOC_KEYS) if (set.hard[loc]) input[k] = "";
      return real({ ...o, input });
    } } },
  { name: "a refused value is written anyway", expect: /^1\.hard\.[a-z_]+\.[a-z]+\.unchanged/,
    impl: { apply: async (o) => {
      const r = await real(o);
      if (!r.ok && r.field && r.field !== "competition") {
        const now = four((await marketStore.get(o.marketId)) as Partial<Four> | null);
        const v = o.input[r.field];
        if (now) await marketStore.setShortTitles(o.marketId, { ...now, [r.field]: typeof v === "string" ? v : null } as never);
      }
      return r;
    } } },
  { name: "a refusal leaves an audit row that says the market was edited", expect: /^1\.hard\.[a-z_]+\.[a-z]+\.unaudited/,
    impl: { apply: async (o) => {
      const r = await real(o);
      if (!r.ok) await audit({ category: "ADMIN", action: "market.short_title_edited", actorId: o.officerId || null, targetType: "Market", targetId: o.marketId, payload: { refused: r.error } });
      return r;
    } } },
  { name: "a warning refuses the save (a machine's strictness handed to an officer)", expect: /^2\.warn/,
    impl: { apply: async (o) => {
      const set = await wouldBe(o, true);
      if (set) for (const [loc, k] of LOC_KEYS) if (set.hard[loc]) return { ok: false, error: "Check the numbers. Nothing changed.", field: k } as Res;
      return real(o);
    } } },
  { name: "an unknown competition quietly becomes none", expect: /^4\.comp\.unknown/,
    impl: { apply: (o) => {
      const c = o.input.competition;
      const coerced = typeof c === "string" && c.trim() !== "" && !isCompetition(c.trim()) ? "" : c;
      return real({ ...o, input: { ...o.input, competition: coerced } });
    } } },
  { name: "an Up & Down round is edited", expect: /^5\.updown/,
    impl: { apply: async (o) => {
      const m = await marketStore.get(o.marketId);
      if (m?.productLine !== "UPDOWN") return real(o);
      const before = four(m as Partial<Four>)!;
      const after = { ...before, shortTitleEn: typeof o.input.shortTitleEn === "string" ? o.input.shortTitleEn : before.shortTitleEn };
      await marketStore.setShortTitles(o.marketId, after as never);
      return { ok: true, changed: true, before, after, warnings: { en: [], sw: [], zh: [] }, recorded: true } as unknown as Res;
    } } },
  { name: "the officer is not required", expect: /^6\.no\.officer/,
    impl: { apply: (o) => real({ ...o, officerId: o.officerId || "usr_ste_nobody" }) } },
  { name: "a no-op is audited as an edit", expect: /^7\.noop/,
    impl: { apply: async (o) => {
      const r = await real(o);
      if (r.ok && !r.changed) await audit({ category: "ADMIN", action: "market.short_title_edited", actorId: o.officerId, targetType: "Market", targetId: o.marketId, payload: { before: r.before, after: r.after } });
      return r;
    } } },
  { name: "an approved draft is recorded as an ordinary edit", expect: /^8\.audit\.backfill/,
    impl: { apply: (o) => real({ ...o, via: "edit" }) } },
  { name: "a curly-quoted value is stored as typed, not folded", expect: /^9\.fold/,
    impl: { apply: async (o) => {
      const r = await real(o);
      if (r.ok && r.changed && typeof o.input.shortTitleSw === "string") await marketStore.setShortTitles(o.marketId, { ...r.after, shortTitleSw: o.input.shortTitleSw } as never);
      return r;
    } } },
  { name: "a pool moves with the edit", expect: /^10\.money\.untouched/,
    impl: { apply: async (o) => {
      const r = await real(o);
      if (r.ok && r.changed) await marketStore.addToPool(o.marketId, { yesPool: 100 });
      return r;
    } } },
  { name: "the write is recategorise's full-row set, over a read that can be stale", expect: /^11\.write\.narrow/,
    impl: { apply: async (o) => {
      const r = await real(o);
      const m = await marketStore.get(o.marketId);
      if (r.ok && r.changed && m) await marketStore.set({ ...m, ...r.after });
      return r;
    } } },
  { name: "the action loses its gate", expect: /^13\.action\.gate/,
    world: (w) => swap(w, "actions", 'await requireAdminOrThrow(session.userId, "setMarketShortTitlesAction");', "") },
  { name: "the action reads an absent field as empty (every save clears what it does not carry)", expect: /^13\.action\.absent/,
    world: (w) => swap(w, "actions", 'formData.has(k) ? String(formData.get(k) ?? "") : undefined', 'String(formData.get(k) ?? "")') },
  { name: "the action refreshes the pages on every save, changed or not", expect: /^13\.action\.revalidate/,
    world: (w) => swap(w, "actions", "if (r.changed) {", "{") },
  { name: "the action moves inside recategorise's block", expect: /^13\.action\.place/,
    world: (w) => {
      const a = w.actions;
      const start = a.indexOf("export async function setMarketShortTitlesAction(");
      const end = a.indexOf("\nexport ", start + 1);
      if (start < 0 || end < 0) return w;
      const fn = a.slice(start, end + 1);
      const rest = a.slice(0, start) + a.slice(end + 1);
      const at = rest.indexOf("export async function adminReopenMarketAction(");
      return at < 0 ? w : { ...w, actions: rest.slice(0, at) + fn + rest.slice(at) };
    } },
  { name: "createMarketAction stops quoting the rule's sentence", expect: /^13\.create\.rule/,
    world: (w) => swap(w, "actions", "shortTitleIssueSentence(loc, issue, shortRaw[key])", "String(issue)") },
  { name: "the wizard's Continue ignores a hard issue", expect: /^13\.wizard\.rule/,
    world: (w) => swap(w, "wizard", "titleEn.length >= 10 && !shortsHard", "titleEn.length >= 10") },
  { name: "the control skips the act gate", expect: /^13\.control\.gate/,
    world: (w) => swap(w, "control", "useMayAct()", "true") },
  { name: "the control types the budget by hand", expect: /^13\.control\.budget/,
    world: (w) => swap(w, "control", "SHORT_TITLE_MAX[locale]", '(locale === "zh" ? 28 : 56)') },
  { name: "the rule note loses \"the short title must say exactly the same thing\"", expect: /^13\.control\.warning/,
    world: (w) => swap(w, "rules", "the short title must say exactly the same thing.", "") },
  { name: "the control no longer shows the rule note", expect: /^13\.control\.warning/,
    world: (w) => swap(w, "control", "<Callout tone=\"info\" title={SHORT_TITLE_RULE_TITLE}>{SHORT_TITLE_RULE_BODY}</Callout>", "") },
  { name: "the page shows the control on an Up & Down round", expect: /^13\.page\.updown/,
    world: (w) => swap(w, "page", 'm.productLine !== "UPDOWN" && (', "(") },
  { name: "the admin-action-gate pin is removed", expect: /^13\.gate\.pin/,
    world: (w) => swap(w, "gate", '"markets/actions.ts::setMarketShortTitlesAction",', "") },

  // ── §13 · the review's wiring (expectedBefore, the sentinel, ADM-5, MS-4 on screen) ──
  { name: "the action stops handing over what the page showed", expect: /^13\.action\.expected/,
    world: (w) => swap(w, "actions", 'via: "edit",\n    expectedBefore,', 'via: "edit",') },
  { name: "the action switches the sentinel off for the admin edit", expect: /^13\.action\.sentinel/,
    world: (w) => swap(w, "actions", 'via: "edit",', 'via: "edit",\n    sentinelLocales: "none",') },
  { name: "createMarketAction stops asking the sentinel about what it stored", expect: /^13\.create\.sentinel/,
    world: (w) => swap(w, "actions", "void recordShortTitleAgreement(", "void (") },
  { name: "createMarketAction holds the publish until the sentinel answers", expect: /^13\.create\.sentinel/,
    world: (w) => swap(w, "actions", "void recordShortTitleAgreement(", "await recordShortTitleAgreement(") },
  { name: "the control stops sending what its page showed", expect: /^13\.control\.expected/,
    world: (w) => swap(w, "control", "for (const k of send) fd.set(`expected.${k}`, shown[k]);", "") },
  { name: "the control hides the sentinel's verdict", expect: /^13\.control\.sentinel/,
    world: (w) => swap(w, "control", "Sentinel check: {verdict.text}", "{verdict.text}") },
  { name: "the control focuses the refused field inside the transition again (where every input is disabled)", expect: /^13\.control\.focus/,
    world: (w) => swap(w, "control", "setFocusField(r.field as Key);", "focusFirstInvalid(box, [r.field]);") },
  { name: "the control blanks a competition this build does not know", expect: /^13\.control\.unknown-competition/,
    world: (w) => swap(w, "control", "options={competitionOptions(saved.competition)}", "options={COMPETITION_OPTIONS}") },
  { name: "the service asks the sentinel from inside the market lock (source)", expect: /^13\.service\.sentinel-after/,
    world: (w) => swap(w, "service", "    await marketStore.setShortTitles(marketId, after, tx);",
      "    await recordShortTitleAgreement({ marketId, officerId, locales: [\"en\"], via: opts.via });\n    await marketStore.setShortTitles(marketId, after, tx);") },
  { name: "the sentinel's test seam works in production", expect: /^13\.service\.seam/,
    world: (w) => swap(w, "service", 'if (process.env.NODE_ENV === "production") throw new Error(', "if (false) throw new Error(") },

  // ── §14 · MS-4 ──
  { name: "⭐ the competition is coerced on read (a key this build does not know becomes none, and the next edit stores the none)", expect: /^14\.competition\.raw/,
    impl: { apply: (o) => withCoercingRead(() => real(o)) } },

  // ── §15 · the contract ──
  { name: "⭐ onlyIfEmpty is ignored (an approval overwrites a value an officer set)", expect: /^15\.onlyIfEmpty\.skipped/,
    impl: { apply: (o) => real({ ...o, onlyIfEmpty: undefined }) } },
  { name: "⭐ expectedBefore is ignored (another officer's words are silently overwritten)", expect: /^15\.expectedBefore\.refused/,
    impl: { apply: (o) => real({ ...o, expectedBefore: undefined }) } },
  { name: "auditExtra is dropped (the draft's sentinel verdict never reaches the record)", expect: /^15\.auditExtra\.merged/,
    impl: { apply: (o) => real({ ...o, auditExtra: undefined }) } },
  { name: "an untouched stored value is re-judged (and blocks an edit to another field)", expect: /^15\.untouched\.verbatim/,
    impl: { apply: async (o) => {
      const m = four((await marketStore.get(o.marketId)) as Partial<Four> | null);
      if (!m) return real(o);
      return real({ ...o, input: { shortTitleEn: m.shortTitleEn, shortTitleSw: m.shortTitleSw, shortTitleZh: m.shortTitleZh, ...o.input } });
    } } },

  // ── §16 · the sentinel ──
  { name: "⭐ the sentinel runs inside the market lock", expect: /^16\.sentinel\.outside-lock/,
    impl: { apply: (o) => withLock(`market:${o.marketId}`, () => real(o)) } },
  { name: "the sentinel is asked BEFORE the act's record (about the words the act is replacing)", expect: /^16\.sentinel\.after-record/,
    impl: { apply: async (o) => {
      if (o.sentinelLocales !== undefined && o.sentinelLocales !== "changed") return real(o);
      const locales = LOC_KEYS.filter(([, k]) => typeof o.input[k] === "string" && o.input[k] !== "").map(([loc]) => loc);
      if (locales.length) await SVC.recordShortTitleAgreement({ marketId: o.marketId, officerId: o.officerId, locales, via: o.via });
      return real({ ...o, sentinelLocales: "none" });
    } } },
  { name: "the admin edit is never checked (the sentinel is off by default)", expect: /^16\.sentinel\.changed/,
    impl: { apply: (o) => real({ ...o, sentinelLocales: o.sentinelLocales ?? "none" }) } },
  { name: "⭐ a check that did not run reads as agreement", expect: /^16\.sentinel\.throws/,
    impl: { apply: async (o) => {
      const r = await real(o);
      if (!r.ok || r.agreement?.status !== "unchecked") return r;
      const perLocale = Object.fromEntries(SVC.changedShortTitleLocales(r.before, r.after).map((l) => [l, { agrees: true, issue: null }]));
      return { ...r, agreement: { status: "checked", perLocale } } as Res;
    } } },

  // ── §17 · the races ──
  { name: "onlyIfEmpty is judged on a read taken BEFORE the lock", expect: /^17\.onlyIfEmpty\.in-lock/,
    impl: { apply: async (o) => {
      if (!o.onlyIfEmpty?.length) return real(o);
      const m = (await marketStore.get(o.marketId)) as Partial<Four> | null;
      const input: Record<string, unknown> = { ...o.input };
      for (const f of o.onlyIfEmpty) {
        const v = m?.[f];
        if (typeof v === "string" && v.trim()) delete input[f];
      }
      return real({ ...o, input: input as Opts["input"], onlyIfEmpty: undefined });
    } } },
  { name: "⭐ the re-file reads outside the market lock (MS-1: a short title applied meanwhile is put back)", expect: /^17\.recategorise\.lock/,
    impl: { recategorise: (o) => unlockedRecategorise(o) } },
];

const DATABASE_PLANTS: Plant[] = [
  { name: "the write is recategorise's full-row set (an upsert of every column)", expect: /^db\.12\.write\.one-update/,
    impl: MEMORY_PLANTS.find((p) => /full-row set/.test(p.name))!.impl },
  { name: "the write leaves the lock's transaction", expect: /^db\.12\.write\.in-lock/,
    impl: { apply: async (o) => {
      const spied = MS.setShortTitles;
      MS.setShortTitles = (id: unknown, fields: unknown) => spied(id, fields);
      try { return await real(o); } finally { MS.setShortTitles = spied; }
    } } },
  { name: "an unrecorded audit row is reported as a refusal (the act landed, the officer is told it did not)", expect: /^db\.12\.audit\.unrecorded/,
    impl: { apply: async (o) => {
      const r = await real(o);
      return r.ok && r.recorded === false ? ({ ok: false, error: "The record could not be written. Nothing changed." } as Res) : r;
    } } },
  { name: "⭐ the re-file reads and writes outside the market lock's transaction (MS-1)", expect: /^db\.12\.recategorise\.in-lock/,
    impl: { recategorise: (o) => unlockedRecategorise(o) } },
  { name: "⭐ the competition is coerced on read on the Prisma twin (MS-4)", expect: /^db\.14\.competition\.raw/,
    impl: { apply: (o) => withCoercingRead(() => real(o)) } },
  { name: "⭐ a check that did not run reads as agreement, on the Prisma twin", expect: /^db\.16\.sentinel\.throws/,
    impl: MEMORY_PLANTS.find((p) => /did not run reads as agreement/.test(p.name))!.impl },
];

async function prove(plants: Plant[], clean: () => Promise<void>, runOne: (impl: Impl, world: World, tag: string) => Promise<void>) {
  quiet = true;
  results = [];
  await clean();
  const cleanFails = results.filter((r) => !r.ok);
  if (results.length === 0 || cleanFails.length) {
    console.log(`INCONCLUSIVE: the clean run already fails (${cleanFails[0]?.label ?? "no checks ran"} — ${cleanFails[0]?.detail ?? ""})`);
    process.exit(1);
  }
  let caught = 0;
  let n = 0;
  for (const plant of plants) {
    n++;
    results = [];
    const impl: Impl = { ...REAL, ...(plant.impl ?? {}) };
    const world = plant.world ? plant.world(WORLD) : WORLD;
    const planted = !!plant.impl || (plant.world ? j(world) !== j(WORLD) : false);
    await runOne(impl, world, `${DB_MODE ? "d" : "r"}${n}`);
    const fired = results.some((r) => !r.ok && plant.expect.test(r.label));
    if (planted && fired) caught++;
    console.log(`${(!planted ? "INCONCLUSIVE (plant did not apply)" : fired ? "PROVED" : "BLIND").padEnd(36)} ${plant.name}`);
  }
  return caught;
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════
if (DB_MODE) {
  if (PROVE_RED) {
    const caught = await prove(DATABASE_PLANTS, () => runDatabase(REAL, "d0"), (impl, _w, tag) => runDatabase(impl, tag));
    console.log(`\ndatabase mode: ${caught}/${DATABASE_PLANTS.length} caught`);
    process.exit(caught === DATABASE_PLANTS.length ? 0 : 1);
  }
  console.log("\n§1–§12 · database mode (fake client)");
  await runDatabase(REAL, "db");
  const fails = results.filter((r) => !r.ok);
  if (results.length === 0) { console.log("⛔ 0 checks — a zero-assertion run is a SKIPPED run."); process.exit(1); }
  process.exit(fails.length ? 1 : 0);
}

/** The database-mode half, in its own process: the Prisma twin needs a DATABASE_URL, and this process has none. */
function spawnDatabaseMode(red: boolean) {
  const tsxCli = createRequire(import.meta.url).resolve("tsx/cli");
  const base = { ...process.env };
  delete base.DATABASE_URL; delete base.USE_PRISMA_DAL; delete base.REDIS_URL; delete base.REDIS_ENABLED;
  const child = spawnSync(process.execPath, [tsxCli, THIS, ...(red ? ["--prove-red"] : [])], {
    env: { ...base, STE_MODE: "db", DATABASE_URL: FAKE_DATABASE_URL }, encoding: "utf8", timeout: 180_000,
  });
  return { status: child.status, out: `${child.stdout ?? ""}${child.stderr ?? ""}` };
}

if (!PROVE_RED) {
  console.log("§1–§11, §13 · the in-memory twin and the wiring");
  await runMemory(REAL, WORLD, "ste");
  console.log("\n§1–§12 · database mode — its own process");
  const child = spawnDatabaseMode(false);
  for (const line of child.out.split(/\r?\n/)) {
    if (/^(PASS|FAIL) /.test(line)) { results.push({ label: line.slice(5), ok: line.startsWith("PASS"), detail: "" }); console.log(line); }
  }
  ok("db.ran · the database-mode process ran its checks and exited clean",
    child.status === 0 && /^PASS db\.12\./m.test(child.out), `exit ${child.status}${child.status !== 0 ? ` — ${child.out.slice(-800)}` : ""}`);
  const fails = results.filter((r) => !r.ok);
  const passes = results.length - fails.length;
  console.log(`\nshort-title-edit: ${passes} passed, ${fails.length} failed`);
  if (passes === 0) { console.log("⛔ 0 passed — a zero-assertion run is a SKIPPED run, never a green one."); process.exit(1); }
  process.exit(fails.length ? 1 : 0);
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════
// THE RED TWIN — every plant must be caught by the check named for it, in memory and on the fake client
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════
{
  const caught = await prove(MEMORY_PLANTS, () => runMemory(REAL, WORLD, "r0"), (impl, world, tag) => runMemory(impl, world, tag));
  console.log(`\nin memory: ${caught}/${MEMORY_PLANTS.length} caught`);
  console.log("\ndatabase mode — its own process");
  const child = spawnDatabaseMode(true);
  const lines = child.out.split(/\r?\n/).filter((l) => /^(PROVED|BLIND|INCONCLUSIVE)/.test(l));
  for (const l of lines) console.log(`db ${l}`);
  const dbCaught = lines.filter((l) => l.startsWith("PROVED")).length;
  const dbOk = child.status === 0 && lines.length === DATABASE_PLANTS.length && dbCaught === DATABASE_PLANTS.length;
  if (!dbOk) console.log(`database mode did not prove every plant (exit ${child.status}) — ${child.out.slice(-800)}`);
  console.log(`\n${caught + dbCaught}/${MEMORY_PLANTS.length + DATABASE_PLANTS.length} caught`);
  process.exit(caught === MEMORY_PLANTS.length && dbOk ? 0 : 1);
}
