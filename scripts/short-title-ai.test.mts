/**
 * THE SHORT TITLES' AI HALF — `test:short-title-ai` (the Vodacom plan S2, `docs/VODACOM-PLAN.md` §0c; COMPLIANCE §6
 * "Short titles and competition labels").
 *
 * What the AI may do with a short title, and what it may never do, proved from every side on the MOCK provider
 * (no key, no network — `ANTHROPIC_API_KEY` is removed before a single module loads):
 *   §1  generation — valid short titles are stored as generated; a failing language is stored as NULL with a
 *       WARNING chip naming the language, and NEVER as a filter reason (the poll stays approvable); an unknown
 *       competition is none; the sentinel's "not checked" never reads as agreement.
 *   §2  publish — `publishApprovedPoll` carries all four fields into the market (a hand-copied field is a dropped one).
 *   §3  the officer's edit — a hard issue is refused BY FIELD and leaves the poll untouched; a warning is kept.
 *   §4  the backfill — the kill switch, the budget refusal (up front and mid-run), the batch clamp, the meter, the
 *       drafts, and what it skips (markets that already have short titles, closed ones, ones with a draft waiting).
 *   §5  approve (through `applyShortTitles`, never overwriting a newer officer value) and reject (audited first).
 *   §6  the sentinel's agreement check — no key, a blocked budget, a failed call and an unreadable answer are all
 *       "not checked"; a real verdict is read strictly; the call is forced and has no web tools.
 *   §7  the wiring, read from source: the mappers, the publish hand-copy, the prompt's budgets, the FilterReason
 *       union, the gates' order, the forced tools, the provider not double-metering.
 *   §12 database mode (its own process, a fake SystemConfig): drafts are SystemConfig rows, a failed read refuses,
 *       a write that does not land is reported.
 *   §13 the AIPoll Prisma mapper (its own process, a fake AIPoll table): all four columns on create, update, read.
 *
 * ⭐ RED TWIN, IN PROCESS: `npm run red:short-title-ai` runs §1–§7 against planted defective implementations and
 * planted source text; every plant must be caught by the check named for it. It never touches a file.
 *
 *   npx tsx scripts/short-title-ai.test.mts             the suite
 *   npx tsx scripts/short-title-ai.test.mts --prove-red the red twin
 */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const THIS = fileURLToPath(import.meta.url);
const REPO = join(THIS, "..", "..");
const PROVE_RED = process.argv.includes("--prove-red");
const MODE: "" | "db" | "aipoll" = process.env.STA_MODE === "db" ? "db" : process.env.STA_MODE === "aipoll" ? "aipoll" : "";
const FAKE_DATABASE_URL = "postgresql://short-title-ai:fake@127.0.0.1:1/never_a_real_database";

// ── 0 · THE GUARD — before a single repo module is loaded ─────────────────────────────────────────────────
if (process.env.NODE_ENV === "production") {
  console.log("FAIL 0.guard · ⛔ REFUSED — NODE_ENV=production.");
  process.exit(1);
}
if (MODE) {
  if (process.env.DATABASE_URL !== FAKE_DATABASE_URL) {
    console.log("FAIL 0.guard · ⛔ REFUSED — database mode runs only on this suite's own fake URL.");
    process.exit(1);
  }
} else if (process.env.DATABASE_URL !== undefined) {
  console.log("FAIL 0.guard · ⛔ REFUSED — DATABASE_URL is set. This suite runs in memory (and on fake clients in its own children): unset it.");
  process.exit(1);
}
// ⛔ THE MOCK PROVIDER ONLY: with no key, no call can leave this machine, and the sentinel's real call is unreachable.
delete process.env.ANTHROPIC_API_KEY;
process.env.AI_MOCK_SCENARIO = "clean";

// ── The fake database (children only) ─────────────────────────────────────────────────────────────────────
const TABLE = new Map<string, unknown>();
const FAIL_READ = new Set<string>();
const FAIL_SAVE = new Set<string>();
const POLLS = new Map<string, Record<string, unknown>>();
const POLL_WRITES: Array<{ op: "create" | "update"; data: Record<string, unknown> }> = [];
const clone = <T,>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
if (MODE) {
  if (MODE === "db") process.env.USE_PRISMA_DAL = "false";
  else delete process.env.USE_PRISMA_DAL;
  const systemConfig = {
    findUnique: async ({ where: { key } }: { where: { key: string } }) => {
      if (FAIL_READ.has(key)) throw new Error(`fake SystemConfig: the read of ${key} failed (simulated)`);
      return TABLE.has(key) ? { key, value: clone(TABLE.get(key)) } : null;
    },
    upsert: async ({ where: { key }, create, update }: { where: { key: string }; create: { value: unknown }; update: { value: unknown } }) => {
      if (FAIL_SAVE.has(key)) throw new Error(`fake SystemConfig: the write of ${key} failed (simulated)`);
      const value = TABLE.has(key) ? update.value : create.value;
      TABLE.set(key, clone(value));
      return { key, value: clone(value) };
    },
    deleteMany: async ({ where: { key } }: { where: { key: string } }) => ({ count: TABLE.delete(key) ? 1 : 0 }),
  };
  const aIPoll = {
    upsert: async ({ where: { id }, create, update }: { where: { id: string }; create: Record<string, unknown>; update: Record<string, unknown> }) => {
      const exists = POLLS.has(id);
      POLL_WRITES.push({ op: exists ? "update" : "create", data: clone(exists ? update : create) });
      POLLS.set(id, exists ? { ...POLLS.get(id), ...clone(update) } : clone(create));
      return clone(POLLS.get(id));
    },
    findUnique: async ({ where: { id } }: { where: { id: string } }) => (POLLS.has(id) ? clone(POLLS.get(id)) : null),
    findMany: async () => [...POLLS.values()].map((r) => clone(r)),
    count: async () => POLLS.size,
    delete: async ({ where: { id } }: { where: { id: string } }) => { POLLS.delete(id); return {}; },
    updateMany: async () => ({ count: 0 }),
  };
  const benignModel = () => new Proxy({}, {
    get: (_t, method) => {
      if (typeof method !== "string") return undefined;
      return async (args?: { data?: unknown; create?: unknown }) => {
        switch (method) {
          case "findMany": case "groupBy": return [];
          case "findFirst": case "findUnique": return null;
          case "count": return 0;
          case "aggregate": return { _sum: {}, _count: {}, _avg: {}, _min: {}, _max: {} };
          case "createMany": case "updateMany": case "deleteMany": return { count: 0 };
          case "create": case "update": return { ...((args?.data ?? {}) as object) };
          case "upsert": return { ...((args?.create ?? {}) as object) };
          default: return null;
        }
      };
    },
  });
  const fake: Record<string, unknown> = new Proxy({} as Record<string, unknown>, {
    get: (_t, prop) => {
      if (prop === "systemConfig") return systemConfig;
      if (prop === "aIPoll") return aIPoll;
      if (typeof prop !== "string" || prop === "then") return undefined;
      if (prop === "$transaction") return async (arg: unknown) => (typeof arg === "function" ? (arg as (tx: unknown) => unknown)(fake) : Promise.all(arg as unknown[]));
      if (prop === "$executeRaw" || prop === "$executeRawUnsafe") return async () => 0;
      if (prop === "$queryRaw" || prop === "$queryRawUnsafe") return async () => [];
      if (prop.startsWith("$")) return async () => undefined;
      return benignModel();
    },
  });
  (globalThis as { __50PICK_PRISMA?: unknown }).__50PICK_PRISMA = fake;
}

// ── OUTPUT ────────────────────────────────────────────────────────────────────────────────────────────────
type Result = { label: string; ok: boolean; detail: string };
let results: Result[] = [];
let quiet = false;
const ok = (label: string, cond: unknown, detail = "") => {
  results.push({ label, ok: !!cond, detail });
  if (!quiet) console.log(`${cond ? "PASS" : "FAIL"} ${label}${!cond && detail ? ` — ${detail}` : ""}`);
};
const j = (v: unknown) => JSON.stringify(v);
const DAY = 86_400_000;
const OFFICER = "officer-sta-test";

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════
// §13 · THE AIPOLL PRISMA MAPPER — its own process, a fake AIPoll table (USE_PRISMA_DAL left on)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════
if (MODE === "aipoll") {
  const { prisma, hasDatabase } = await import("../src/lib/server/prisma.ts");
  if (!hasDatabase() || prisma() !== (globalThis as { __50PICK_PRISMA?: unknown }).__50PICK_PRISMA) {
    console.log("FAIL 0.guard · ⛔ REFUSED — prisma() is not this suite's fake client.");
    process.exit(1);
  }
  const GEN = await import("../src/lib/server/ai-poll-generation.ts");
  const now = new Date().toISOString();
  type Poll = import("../src/lib/server/ai-poll-generation.ts").StoredAIPoll;
  const base: Poll = {
    id: "aip_sta_mapper", state: "PENDING_REVIEW", requestCategory: "macro", requestPrompt: "", generation: null, rawResponse: null,
    filterReasons: [], qualityIndicators: [], overallQuality: 80,
    titleEn: "Will Tanzania GDP growth exceed 6% in Q3 2026?", titleSw: "Je, ukuaji wa GDP wa Tanzania utazidi 6% katika Q3 2026?", titleZh: "坦桑尼亚2026年第三季度GDP增长能否超过6%？",
    category: "macro", resolutionCriterion: "NBS quarterly GDP report for Q3 2026.", resolutionCriterionSw: null, resolutionCriterionZh: null,
    resolutionAt: new Date(Date.now() + 60 * DAY).toISOString(), selectionClosedAt: null, options: [], sources: [], confidence: 80, reasoning: "",
    shortTitleEn: "Will Q3 2026 GDP growth top 6%?", shortTitleSw: "Je, ukuaji wa GDP Q3 2026 utazidi 6%?", shortTitleZh: "坦桑尼亚Q3 GDP增长能否超6%？", competition: "epl",
    reviewedBy: null, reviewedAt: null, reviewNote: null, rejectReasons: [], publishedMarketId: null, publishedCandidateId: null,
    tokensUsed: 0, costUsd: 0, latencyMs: 0, regenerationOf: null, regenerationCount: 0, createdAt: now, updatedAt: now,
  };
  const four = (r: Record<string, unknown> | undefined | null) => r ? { en: r.shortTitleEn, sw: r.shortTitleSw, zh: r.shortTitleZh, competition: r.competition } : null;
  await GEN.aiPollStore.set(base);
  const created = POLL_WRITES.at(-1);
  ok("13.write.create · toPrismaData writes all four columns on create",
    created?.op === "create" && j(four(created.data)) === j({ en: base.shortTitleEn, sw: base.shortTitleSw, zh: base.shortTitleZh, competition: "epl" }), j(created));
  const back = await GEN.aiPollStore.get(base.id);
  ok("13.read · toStoredAIPoll reads all four back", j(four(back as unknown as Record<string, unknown>)) === j(four(base as unknown as Record<string, unknown>)), j(four(back as unknown as Record<string, unknown>)));
  await GEN.aiPollStore.set({ ...base, shortTitleSw: null, competition: "afcon" });
  const updated = POLL_WRITES.at(-1);
  ok("13.write.update · the update arm carries them too (one payload for both arms)",
    updated?.op === "update" && updated.data.shortTitleSw === null && updated.data.competition === "afcon" && updated.data.shortTitleEn === base.shortTitleEn, j(updated));
  const bare = { ...base, id: "aip_sta_bare" } as Partial<Poll> as Poll;
  delete (bare as Partial<Poll>).shortTitleEn; delete (bare as Partial<Poll>).shortTitleSw; delete (bare as Partial<Poll>).shortTitleZh; delete (bare as Partial<Poll>).competition;
  await GEN.aiPollStore.set(bare);
  const bareRow = POLLS.get("aip_sta_bare");
  ok("13.write.null · a record written without them stores NULL in all four (never undefined, never a title)",
    !!bareRow && bareRow.shortTitleEn === null && bareRow.shortTitleSw === null && bareRow.shortTitleZh === null && bareRow.competition === null, j(four(bareRow)));
  POLLS.set("aip_sta_unknown", { ...(POLLS.get(base.id) ?? {}), id: "aip_sta_unknown", competition: "not-a-competition" });
  const unknown = await GEN.aiPollStore.get("aip_sta_unknown");
  ok("13.read.unknown · a competition this build does not know reads back as none", unknown?.competition === null, j(unknown?.competition));
  const fails = results.filter((r) => !r.ok);
  if (results.length === 0) { console.log("⛔ 0 checks — a zero-assertion run is a SKIPPED run."); process.exit(1); }
  process.exit(fails.length ? 1 : 0);
}

// ── THE MODULES ───────────────────────────────────────────────────────────────────────────────────────────
if (MODE === "db") {
  const { prisma, hasDatabase } = await import("../src/lib/server/prisma.ts");
  if (!hasDatabase() || prisma() !== (globalThis as { __50PICK_PRISMA?: unknown }).__50PICK_PRISMA) {
    console.log("FAIL 0.guard · ⛔ REFUSED — prisma() is not this suite's fake client.");
    process.exit(1);
  }
}
const GEN = await import("../src/lib/server/ai-poll-generation.ts");
const PUB = await import("../src/lib/server/ai-poll-publish.ts");
const PROV = await import("../src/lib/server/ai-provider.ts");
const CLAUDE = await import("../src/lib/server/ai-provider-claude.ts");
const BF = await import("../src/lib/server/short-title-backfill.ts");
const SEN = await import("../src/lib/server/market-sentinel.ts");
const MS = await import("../src/lib/server/market-service.ts");
const { marketStore } = await import("../src/lib/server/market-dal.ts");
const CTRL = await import("../src/lib/server/ai-controls.ts");
const USAGE = await import("../src/lib/server/ai-usage.ts");
const { aiUsageDal } = await import("../src/lib/server/ai-usage-dal.ts");
const CFG = await import("../src/lib/server/ai-poll-config.ts");
const SVC = await import("../src/lib/server/short-title-service.ts");
const { getAuditPage, auditFlush } = await import("../src/lib/server/audit.ts");
const ST = await import("../src/lib/markets/short-title.ts");
const { decomment } = await import("./lib/decomment.mts");

type Loc = "en" | "sw" | "zh";
type StoredMarket = import("../src/lib/server/market-service.ts").StoredMarket;
type AIPollGeneration = import("../src/lib/server/ai-provider.ts").AIPollGeneration;
type GenerateRequest = import("../src/lib/server/ai-provider.ts").GenerateRequest;
type AIProviderResponse = import("../src/lib/server/ai-provider.ts").AIProviderResponse;

PROV.setAIProvider(new PROV.MockClaudeProvider());
ok("0.mock · the AI provider is the mock (no network)", PROV.getAIProvider() instanceof PROV.MockClaudeProvider, PROV.getAIProvider().name);
ok("0.nokey · no ANTHROPIC_API_KEY in this process", !process.env.ANTHROPIC_API_KEY);

// ── THE IMPLEMENTATIONS UNDER TEST — passed in, so the red twin can hand in defective ones ────────────────
type Impl = {
  generate: typeof GEN.generateAIPoll;
  edit: typeof GEN.editAIPoll;
  publish: typeof PUB.publishApprovedPoll;
  draft: typeof BF.draftShortTitles;
  list: typeof BF.listShortTitleDrafts;
  approve: typeof BF.approveShortTitleDraft;
  reject: typeof BF.rejectShortTitleDraft;
  line: typeof SEN.agreementLine;
  parse: typeof SEN.parseAgreementVerdict;
  check: typeof SEN.checkShortTitleAgreement;
};
const REAL: Impl = {
  generate: GEN.generateAIPoll,
  edit: GEN.editAIPoll,
  publish: PUB.publishApprovedPoll,
  draft: BF.draftShortTitles,
  list: BF.listShortTitleDrafts,
  approve: BF.approveShortTitleDraft,
  reject: BF.rejectShortTitleDraft,
  line: SEN.agreementLine,
  parse: SEN.parseAgreementVerdict,
  check: SEN.checkShortTitleAgreement,
};

// ── THE SOURCE WORLD — read as text (comments stripped), so the red twin can plant edits in memory ────────
const src = (rel: string) => decomment(readFileSync(join(REPO, rel), "utf8").replace(/\r\n/g, "\n"));
type World = { gen: string; publish: string; claude: string; sentinel: string; backfill: string };
const WORLD: World = {
  gen: src("src/lib/server/ai-poll-generation.ts"),
  publish: src("src/lib/server/ai-poll-publish.ts"),
  claude: src("src/lib/server/ai-provider-claude.ts"),
  sentinel: src("src/lib/server/market-sentinel.ts"),
  backfill: src("src/lib/server/short-title-backfill.ts"),
};
/** From `anchor` to the first end marker after it (or the end of the text). "" when the anchor is gone. */
function slice(text: string, anchor: string, ends: string[]): string {
  const at = text.indexOf(anchor);
  if (at < 0) return "";
  let stop = text.length;
  for (const e of ends) {
    const k = text.indexOf(e, at + anchor.length);
    if (k >= 0 && k < stop) stop = k;
  }
  return text.slice(at, stop);
}
const TOP = ["\nexport ", "\nfunction ", "\nasync function ", "\nconst ", "\ntype ", "\ndeclare "];
const hasKeyLine = (body: string, key: string) => new RegExp(`^\\s*${key}:`, "m").test(body);

// ── FIXTURES ──────────────────────────────────────────────────────────────────────────────────────────────
/** Letters only: a digit in a tag would sit in the full title and hide a number-drift check. */
const tagFor = (n: number) => `st${String.fromCharCode(97 + Math.floor(n / 26) % 26)}${String.fromCharCode(97 + (n % 26))}`;
const SINCE = new Date(Date.now() - 60_000).toISOString();
const INDEX_KEY = "shortTitle.draft.index";

async function usageRows(ids: string[]) {
  return (await aiUsageDal.recent(SINCE, 1_000_000)).filter((e) => e.feature === "polls" && e.subjectType === "market" && !!e.subjectId && ids.includes(e.subjectId));
}
async function auditRows(action: string, targetId?: string) {
  await auditFlush();
  return getAuditPage({ limit: 10_000 }).filter((e) => e.action === action && (!targetId || e.targetId === targetId));
}
function draftStore(): Map<string, unknown> {
  return (globalThis as { __50PICK_SHORT_TITLE_DRAFTS?: Map<string, unknown> }).__50PICK_SHORT_TITLE_DRAFTS ?? new Map();
}
function clearDrafts() {
  if (MODE === "db") { for (const k of [...TABLE.keys()]) if (k.startsWith("shortTitle.draft.")) TABLE.delete(k); }
  else draftStore().clear();
}
function indexIds(): string[] {
  const v = (MODE === "db" ? TABLE.get(INDEX_KEY) : draftStore().get(INDEX_KEY)) as { marketIds?: string[] } | undefined;
  return Array.isArray(v?.marketIds) ? v!.marketIds! : [];
}
async function refusalOf(fn: () => Promise<unknown>): Promise<unknown> {
  try { await fn(); return null; } catch (e) { return e; }
}
/** Close every open market a previous run left, so a run reads only its own. */
async function closeOpenMarkets() {
  for (const m of await MS.listMarkets({ status: "LIVE" })) await marketStore.stamp(m.id, { status: "CLOSED" });
}
/** A long-form market. The criterion names the NBC Premier League, so the mock proposes "ligi-kuu". */
async function mk(tag: string, n: number, o: { days: number; zh?: boolean; shorts?: boolean }): Promise<StoredMarket> {
  return MS.createMarket({
    titleEn: `Will Simba SC score over ${n} goals in the ${tag} test fixture?`,
    titleSw: `Je, Simba SC itafunga zaidi ya magoli ${n} katika mechi ya majaribio ${tag}?`,
    titleZh: o.zh === false ? null : `Simba SC在${tag}测试比赛中能否进${n}球以上？`,
    category: "sports",
    sourceUrl: "https://www.tff.or.tz/",
    resolutionCriterion: `Resolves YES if the official NBC Premier League match report shows Simba SC scoring more than ${n} goals in the ${tag} test fixture.`,
    resolutionAt: new Date(Date.now() + o.days * DAY).toISOString(),
    proposedBy: OFFICER,
    ...(o.shorts ? {
      shortTitleEn: `Will Simba SC score over ${n} goals?`,
      shortTitleSw: `Je, Simba SC itafunga zaidi ya magoli ${n}?`,
      shortTitleZh: `Simba SC能否进${n}球以上？`,
    } : {}),
  });
}

/** A mock that answers exactly as the mock does, then reshapes the generation — still the mock, still no network. */
class ReshapingMock extends PROV.MockClaudeProvider {
  reshape: (g: AIPollGeneration) => AIPollGeneration;
  constructor(reshape: (g: AIPollGeneration) => AIPollGeneration) { super(); this.reshape = reshape; }
  async generate(req: GenerateRequest): Promise<AIProviderResponse> {
    const r = await super.generate(req);
    if (r.ok && r.generation) r.generation = this.reshape(r.generation);
    return r;
  }
}

type Ctx = { tag: string; macroId?: string; cryptoId?: string; editId?: string; C?: StoredMarket };
let CTX: Ctx = { tag: "" };

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════
// §1 · GENERATION
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════
async function g1Generate(I: Impl, ctx: Ctx) {
  const macro = await I.generate({ category: "macro", actorId: OFFICER, controlledTitle: `Will Tanzania GDP growth exceed 6% in Q3 2026? (${ctx.tag})` });
  ctx.macroId = macro.id;
  ok("1.valid.state · a clean generation reaches review", macro.state === "PENDING_REVIEW", `${macro.state} ${j(macro.filterReasons)}`);
  const g = (macro.generation ?? {}) as Partial<AIPollGeneration>;
  const stored = { en: macro.shortTitleEn, sw: macro.shortTitleSw, zh: macro.shortTitleZh };
  const raw = { en: g.shortTitleEn, sw: g.shortTitleSw, zh: g.shortTitleZh };
  ok("1.valid.stored · all three valid short titles are stored as the model wrote them (cleaned)",
    (["en", "sw", "zh"] as Loc[]).every((l) => typeof stored[l] === "string" && stored[l] === ST.cleanShortTitle(l, raw[l])), j({ stored, raw }));
  const strict = ST.normaliseShortTitleSet({ titleEn: macro.titleEn, titleSw: macro.titleSw, titleZh: macro.titleZh, shortTitleEn: stored.en, shortTitleSw: stored.sw, shortTitleZh: stored.zh }, { strict: true });
  ok("1.valid.rules · every stored short title passes the STRICT rule", !!strict.shortTitleEn && !!strict.shortTitleSw && !!strict.shortTitleZh, j(strict.issues));
  ok("1.valid.chip · the chip counts three of three languages",
    macro.qualityIndicators.some((q) => q.label === "Short titles · 3 of 3 languages" && q.status === "good"), j(macro.qualityIndicators.map((q) => q.label)));
  const sentinelChips = macro.qualityIndicators.filter((q) => q.label.startsWith(GEN.SENTINEL_AGREEMENT_CHIP));
  ok("1.sentinel.unchecked · with no key the sentinel's chip says NOT CHECKED, and nothing reads as agreement",
    sentinelChips.length === 1 && sentinelChips[0].label.includes("not checked") && !sentinelChips[0].label.includes("agree") && sentinelChips[0].status === "warning",
    j(sentinelChips));

  const crypto = await I.generate({ category: "crypto", actorId: OFFICER, controlledTitle: `Will Bitcoin price exceed $150,000 USD by end of August 2026? (${ctx.tag})` });
  ctx.cryptoId = crypto.id;
  ok("1.fail.state · a failing short title does not filter the poll", crypto.state === "PENDING_REVIEW", `${crypto.state} ${j(crypto.filterReasons)}`);
  ok("1.fail.null · the failing Swahili short title is stored as NULL, not as the model wrote it",
    crypto.shortTitleSw === null && typeof crypto.generation?.shortTitleSw === "string" && crypto.generation.shortTitleSw.length > 0, j({ stored: crypto.shortTitleSw, raw: crypto.generation?.shortTitleSw }));
  ok("1.fail.others · the passing languages are still stored", !!crypto.shortTitleEn && !!crypto.shortTitleZh, j({ en: crypto.shortTitleEn, zh: crypto.shortTitleZh }));
  ok("1.fail.warn · a WARNING chip names Swahili, says it was left empty and why",
    crypto.qualityIndicators.some((q) => q.status === "warning" && q.label.includes("Swahili") && q.label.includes("left empty") && q.label.includes(`over ${ST.SHORT_TITLE_MAX.sw} characters`)),
    j(crypto.qualityIndicators.map((q) => q.label)));
  ok("1.fail.nofilter · the short title added no filter reason", crypto.filterReasons.length === 0, j(crypto.filterReasons));
  const approved = await GEN.approveAIPoll(crypto.id, { officerId: OFFICER });
  ok("1.fail.approvable · the poll is still approvable", approved?.state === "APPROVED", j(approved?.state ?? null));

  const ed = await I.generate({ category: "macro", actorId: OFFICER, controlledTitle: `Will Tanzania GDP growth exceed 6% in Q3 2026? (${ctx.tag} edit)` });
  ctx.editId = ed.id;
  ok("1.edit.fixture · the poll §3 edits reached review with three short titles", ed.state === "PENDING_REVIEW" && !!ed.shortTitleEn && !!ed.shortTitleSw && !!ed.shortTitleZh, `${ed.state} ${j(ed.filterReasons)}`);

  // The model names a competition this build does not know, and copies the English into the Chinese field.
  PROV.setAIProvider(new ReshapingMock((g2) => ({ ...g2, competition: "not-a-competition", shortTitleZh: g2.shortTitleEn })));
  let w;
  try {
    w = await I.generate({ category: "weather", actorId: OFFICER, controlledTitle: `Will Dar es Salaam receive over 200mm rainfall in July 2026? (${ctx.tag})` });
  } finally {
    PROV.setAIProvider(new PROV.MockClaudeProvider());
  }
  ok("1.comp.unknown · an unknown competition from the model is stored as none", w.competition === null, j(w.competition));
  ok("1.copied · a Chinese short title that copies the English is NULL, with a warning that says so",
    w.shortTitleZh === null && w.qualityIndicators.some((q) => q.status === "warning" && q.label.includes("Chinese") && q.label.includes("copy of the English")),
    j({ zh: w.shortTitleZh, chips: w.qualityIndicators.map((q) => q.label) }));
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════
// §2 · PUBLISH CARRIES ALL FOUR
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════
async function g2Publish(I: Impl, ctx: Ctx) {
  const edited = await I.edit(ctx.macroId!, { officerId: OFFICER, competition: "epl" });
  ok("2.edit.comp · a known competition is accepted on the poll", edited?.competition === "epl", j(edited?.competition));
  const macro = await GEN.getAIPoll(ctx.macroId!);
  await GEN.approveAIPoll(ctx.macroId!, { officerId: OFFICER });
  const pub = await I.publish({ pollId: ctx.macroId!, officerId: OFFICER, publishCategory: "macro" });
  ok("2.publish.ok · the approved poll publishes", pub.ok, j(pub));
  const m = pub.ok ? await MS.getMarket(pub.marketId) : null;
  ok("2.carry · the market carries the poll's three short titles and its competition",
    !!m && !!macro && m.shortTitleEn === macro.shortTitleEn && m.shortTitleSw === macro.shortTitleSw && m.shortTitleZh === macro.shortTitleZh && m.competition === "epl",
    j({ market: m && { en: m.shortTitleEn, sw: m.shortTitleSw, zh: m.shortTitleZh, c: m.competition }, poll: macro && { en: macro.shortTitleEn, sw: macro.shortTitleSw, zh: macro.shortTitleZh } }));
  const crypto = await GEN.getAIPoll(ctx.cryptoId!);
  const pubC = crypto?.state === "APPROVED" ? await I.publish({ pollId: ctx.cryptoId!, officerId: OFFICER, publishCategory: "crypto" }) : null;
  const mc = pubC?.ok ? await MS.getMarket(pubC.marketId) : null;
  ok("2.carry.null · a language the rules refused stays NULL on the market — never the full title",
    !!mc && mc.shortTitleSw === null && mc.shortTitleEn === crypto?.shortTitleEn && mc.shortTitleZh === crypto?.shortTitleZh,
    j(mc && { en: mc.shortTitleEn, sw: mc.shortTitleSw, zh: mc.shortTitleZh }));
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════
// §3 · THE OFFICER'S EDIT OF A POLL
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════
async function g3Edit(I: Impl, ctx: Ctx) {
  const id = ctx.editId!;
  const before = await GEN.getAIPoll(id);
  const b = before ? { titleEn: before.titleEn, sw: before.shortTitleSw, zh: before.shortTitleZh, en: before.shortTitleEn, c: before.competition, state: before.state } : null;
  const e1 = await refusalOf(() => I.edit(id, { officerId: OFFICER, titleEn: `Something else entirely? (${ctx.tag})`, shortTitleSw: `${"A".repeat(70)}?` }));
  ok("3.hard.refused · a short title over the budget is refused, naming its field",
    e1 instanceof GEN.AIPollShortTitleRefused && e1.field === "shortTitleSw" && /characters/.test(e1.message), String(e1));
  const after1 = await GEN.getAIPoll(id);
  ok("3.hard.untouched · the refused edit changed NOTHING — not even the title in the same submit",
    !!after1 && !!b && after1.titleEn === b.titleEn && after1.shortTitleSw === b.sw && after1.state === b.state, j(after1 && { t: after1.titleEn, sw: after1.shortTitleSw }));
  const e2 = await refusalOf(() => I.edit(id, { officerId: OFFICER, shortTitleSw: "Uchumi utakua zaidi ya 6%?" }));
  ok("3.hard.form · a Swahili short title not in the Je, …? form is refused", e2 instanceof GEN.AIPollShortTitleRefused && e2.field === "shortTitleSw", String(e2));
  const e3 = await refusalOf(() => I.edit(id, { officerId: OFFICER, shortTitleZh: b?.en ?? "x?" }));
  ok("3.hard.copied · a Chinese short title that is the English one is refused", e3 instanceof GEN.AIPollShortTitleRefused && e3.field === "shortTitleZh", String(e3));
  const e4 = await refusalOf(() => I.edit(id, { officerId: OFFICER, competition: "premier-league-x" }));
  ok("3.hard.comp · an unknown competition is refused, never coerced", e4 instanceof GEN.AIPollShortTitleRefused && e4.field === "competition", String(e4));

  const valid = await I.edit(id, { officerId: OFFICER, shortTitleSw: "Je, uchumi utakua zaidi ya 6% Q3 2026?", shortTitleZh: "" });
  ok("3.valid · a valid Swahili short title is stored and an empty Chinese one clears it",
    valid?.shortTitleSw === "Je, uchumi utakua zaidi ya 6% Q3 2026?" && valid?.shortTitleZh === null && valid?.state === "PENDING_REVIEW", j(valid && { sw: valid.shortTitleSw, zh: valid.shortTitleZh, state: valid.state }));
  ok("3.valid.chips · the chips count two of three, and the sentinel's earlier verdict is marked stale",
    !!valid && valid.qualityIndicators.some((q) => q.label === "Short titles · 2 of 3 languages")
      && valid.qualityIndicators.some((q) => q.label.startsWith(GEN.SENTINEL_AGREEMENT_CHIP) && q.label.includes("edited after the check")),
    j(valid?.qualityIndicators.map((q) => q.label)));
  const drift = await I.edit(id, { officerId: OFFICER, shortTitleEn: "Will Q3 2026 growth top 7%?" });
  ok("3.drift · a number the full question does not have is a WARNING the officer may keep",
    drift?.shortTitleEn === "Will Q3 2026 growth top 7%?" && drift.qualityIndicators.some((q) => q.status === "warning" && q.label.includes("English kept")),
    j(drift && { en: drift.shortTitleEn, chips: drift.qualityIndicators.map((q) => q.label) }));
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════
// §4 · THE BACKFILL DRAFT RUN
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════
async function g4Backfill(I: Impl, ctx: Ctx): Promise<Record<string, StoredMarket>> {
  await closeOpenMarkets();
  clearDrafts();
  const t = ctx.tag;
  const C = await mk(t, 5, { days: 9, shorts: true }); // soonest: a filter that ignored existing short titles drafts it first
  ctx.C = C;
  const D = await mk(t, 8, { days: 8 });
  await marketStore.stamp(D.id, { status: "CLOSED" });
  const A = await mk(t, 3, { days: 10 });
  const B = await mk(t, 4, { days: 11, zh: false }); // no Chinese full title: the mock copies the English (a realistic failure)
  const F = await mk(t, 6, { days: 12 });
  const G = await mk(t, 7, { days: 13 });
  const ids = [A.id, B.id, C.id, D.id, F.id, G.id];
  ok("4.fixture · the fixture market with short titles has all three", !!C.shortTitleEn && !!C.shortTitleSw && !!C.shortTitleZh, j({ en: C.shortTitleEn, sw: C.shortTitleSw, zh: C.shortTitleZh }));

  // The kill switch, inside the function.
  await CTRL.setPollGenEnabled(false, OFFICER);
  let rk;
  try { rk = await I.draft({ officerId: OFFICER }); } finally { await CTRL.setPollGenEnabled(true, OFFICER); }
  ok("4.kill.refused · with AI generation switched off the run refuses, with the toolkit's refusal",
    !rk.ok && rk.refusal?.reason === "ai_pollgen_disabled", j(rk));
  ok("4.kill.nothing · …and nothing was called, metered or stored", (await usageRows(ids)).length === 0 && indexIds().length === 0, j(indexIds()));

  // The spend ceiling, before the first call.
  await USAGE.startNewTopUpWindow();
  await USAGE.recordAiUsage({ feature: "other", model: "claude-sonnet-4-6", inputTokens: 10_000, outputTokens: 0, ok: true, subjectType: "market", subjectId: `sta-budget-${t}` });
  await USAGE.setCreditLimit(0.001);
  let rb;
  try { rb = await I.draft({ officerId: OFFICER }); } finally { await USAGE.startNewTopUpWindow(); }
  ok("4.budget.refused · over the ceiling the run refuses before any call, with the budget's refusal",
    !rb.ok && !!rb.refusal && /credit limit|cycle/i.test(rb.error), j(rb));
  ok("4.budget.nothing · …and nothing was called, metered or stored", (await usageRows(ids)).length === 0 && indexIds().length === 0);

  // The spend ceiling, mid-run: one mock call costs more than the ceiling, so the second is refused.
  await USAGE.setCreditLimit(0.0005);
  let rm;
  try { rm = await I.draft({ officerId: OFFICER }); } finally { await USAGE.setCreditLimit(20); await USAGE.startNewTopUpWindow(); }
  ok("4.budget.midrun · the ceiling stops a run between calls, and the run says so",
    rm.ok && rm.drafted === 1 && !!rm.stopped && indexIds().includes(A.id), j(rm));

  // The clamp.
  const cap0 = CFG.getAIPollConfig().maxBatchPerRun;
  CFG.updateAIPollConfig({ maxBatchPerRun: 2 }, OFFICER);
  let rc;
  try { rc = await I.draft({ officerId: OFFICER, limit: 50 }); } finally { CFG.updateAIPollConfig({ maxBatchPerRun: cap0 }, OFFICER); }
  ok("4.clamp · one run never drafts more than maxBatchPerRun, whatever it asks for",
    rc.ok && rc.clampedTo === 2 && rc.considered === 2 && rc.drafted === 2, j(rc));

  // The meter.
  const rows = await usageRows(ids);
  const per = (id: string) => rows.filter((r) => r.subjectId === id).length;
  ok("4.meter · one metered call per drafted market — feature polls, subject the market",
    per(A.id) === 1 && per(B.id) === 1 && per(F.id) === 1 && per(G.id) === 0, j({ A: per(A.id), B: per(B.id), F: per(F.id), G: per(G.id) }));

  // What was stored.
  const listed = await I.list();
  const byId = new Map(listed.rows.map((r) => [r.market.id, r.draft]));
  const dA = byId.get(A.id);
  const strictA = dA ? ST.normaliseShortTitleSet({ titleEn: A.titleEn, titleSw: A.titleSw, titleZh: A.titleZh, shortTitleEn: dA.en, shortTitleSw: dA.sw, shortTitleZh: dA.zh }, { strict: true }) : null;
  ok("4.store.valid · a draft holds three short titles that pass the STRICT rule, and the competition",
    !!dA && !!strictA?.shortTitleEn && !!strictA.shortTitleSw && !!strictA.shortTitleZh && dA.competition === "ligi-kuu" && j(dA.missing) === j(["en", "sw", "zh"]), j(dA));
  const dB = byId.get(B.id);
  ok("4.store.refused · a failing language is NULL in the draft, with its issue and the refused words kept",
    !!dB && dB.zh === null && dB.issues.zh.includes("copied_english") && typeof dB.refused.zh === "string" && dB.refused.zh.length > 0 && !!dB.en && !!dB.sw, j(dB));
  ok("4.store.unchecked · the sentinel could not check (no key), and the draft says NOT CHECKED — never agrees",
    !!dA && dA.agreement.status === "unchecked" && I.line(dA.agreement, "en").kind === "unchecked" && I.line(dA.agreement, "en").text === "not checked by the sentinel", j(dA?.agreement));
  const cNow = await MS.getMarket(C.id);
  ok("4.skip.has · a market that already has short titles is never drafted",
    !byId.has(C.id) && !indexIds().includes(C.id) && per(C.id) === 0 && cNow?.shortTitleEn === C.shortTitleEn, j({ listed: byId.has(C.id), meter: per(C.id) }));
  ok("4.skip.closed · a closed market is never drafted", !byId.has(D.id) && per(D.id) === 0);
  const aNow = await MS.getMarket(A.id);
  ok("4.untouched · a draft changes nothing on the market until an officer approves it",
    !!aNow && aNow.shortTitleEn == null && aNow.shortTitleSw == null && aNow.shortTitleZh == null && aNow.competition == null, j(aNow && { en: aNow.shortTitleEn }));

  // Pending drafts are skipped: the next run drafts G alone, the one after drafts nothing.
  const rn = await I.draft({ officerId: OFFICER });
  ok("4.skip.pending · a market with a draft waiting is not drafted again", rn.ok && rn.considered === 1 && rn.drafted === 1 && indexIds().includes(G.id), j(rn));
  const rz = await I.draft({ officerId: OFFICER });
  ok("4.skip.none · with every open market drafted or titled, a run drafts nothing", rz.ok && rz.considered === 0 && rz.drafted === 0, j(rz));
  const runs = await auditRows("market.short_titles_drafted");
  ok("4.audit · every run is on the record", runs.some((e) => (e.payload as { marketIds?: string[] })?.marketIds?.includes(G.id)), String(runs.length));
  return { A, B, C, D, F, G };
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════
// §5 · APPROVE AND REJECT
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════
async function g5Decide(I: Impl, M: Record<string, StoredMarket>) {
  const { A, B, F, G } = M;
  const listed = await BF.listShortTitleDrafts();
  const draftOf = (id: string) => listed.rows.find((r) => r.market.id === id)?.draft ?? null;
  const dA = draftOf(A.id);
  const count0 = indexIds().length;
  const ra = await I.approve({ officerId: OFFICER, marketId: A.id });
  ok("5.approve · approving writes the drafted short titles and competition to the market", ra.ok && ra.changed, j(ra));
  const count1 = indexIds().length;
  ok("5.approve.cleared · …and takes the draft off the waiting list", count1 === count0 - 1 && !indexIds().includes(A.id), `${count0} → ${count1}`);
  const mA = await MS.getMarket(A.id);
  ok("5.approve.values · the market now carries exactly the draft's words",
    !!mA && !!dA && mA.shortTitleEn === dA.en && mA.shortTitleSw === dA.sw && mA.shortTitleZh === dA.zh && mA.competition === dA.competition, j({ m: mA && [mA.shortTitleEn, mA.shortTitleSw, mA.shortTitleZh, mA.competition], d: dA && [dA.en, dA.sw, dA.zh, dA.competition] }));
  ok("5.approve.audit · the approval is on the record as market.short_title_approved, with before and after",
    (await auditRows("market.short_title_approved", A.id)).some((e) => !!(e.payload as { before?: unknown; after?: unknown })?.before && !!(e.payload as { after?: unknown })?.after));
  const again = await I.approve({ officerId: OFFICER, marketId: A.id });
  ok("5.approve.gone · a draft already approved cannot be approved twice", !again.ok, j(again));

  // ⛔ Never overwrite a newer officer value: B's English is set by an officer after the draft was made.
  const officerEn = "Will Simba SC net over 4 goals in this test?";
  const edit = await SVC.applyShortTitles({ marketId: B.id, officerId: OFFICER, input: { shortTitleEn: officerEn }, via: "edit" });
  ok("5.fixture.edit · the officer's own English short title for B landed", edit.ok && edit.changed, j(edit));
  const dB = draftOf(B.id);
  const rbB = await I.approve({ officerId: OFFICER, marketId: B.id });
  const mB = await MS.getMarket(B.id);
  ok("5.never.overwrite · approving a draft never overwrites a short title set since it was drafted",
    rbB.ok && mB?.shortTitleEn === officerEn && mB?.shortTitleSw === dB?.sw && mB?.shortTitleZh === null, j(mB && [mB.shortTitleEn, mB.shortTitleSw, mB.shortTitleZh]));

  // Edit, then approve: a hard issue is refused by field and the draft keeps waiting; a valid edit lands.
  const bad = await I.approve({ officerId: OFFICER, marketId: F.id, edited: { shortTitleSw: `${"A".repeat(90)}?` } });
  ok("5.edit.refused · an edited value the rules refuse is refused, naming its field, and the draft keeps waiting",
    !bad.ok && bad.field === "shortTitleSw" && indexIds().includes(F.id), j(bad));
  const sw = "Je, Simba SC itafunga zaidi ya magoli 6?";
  const good = await I.approve({ officerId: OFFICER, marketId: F.id, edited: { shortTitleSw: sw } });
  const mF = await MS.getMarket(F.id);
  ok("5.edit.ok · an edited value that passes the rules is what lands", good.ok && mF?.shortTitleSw === sw && !indexIds().includes(F.id), j(mF && mF.shortTitleSw));

  // Reject.
  const noReason = await I.reject({ officerId: OFFICER, marketId: G.id, reason: " " });
  ok("5.reject.reason · a rejection with no reason is refused, naming the field", !noReason.ok && noReason.field === "reason" && indexIds().includes(G.id), j(noReason));
  const rj = await I.reject({ officerId: OFFICER, marketId: G.id, reason: "Names the wrong fixture" });
  ok("5.reject.ok · a rejection takes the draft off the waiting list", rj.ok && !indexIds().includes(G.id), j(rj));
  const rjRows = await auditRows("market.short_title_draft_rejected", G.id);
  ok("5.reject.audit · the rejection is on the record with its reason and the draft it rejected",
    rjRows.some((e) => (e.payload as { reason?: string; draft?: unknown })?.reason === "Names the wrong fixture" && !!(e.payload as { draft?: unknown }).draft), String(rjRows.length));
  const mG = await MS.getMarket(G.id);
  ok("5.reject.untouched · the rejected market's card is untouched", !!mG && mG.shortTitleEn == null && mG.shortTitleSw == null && mG.shortTitleZh == null);
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════
// §6 · THE SENTINEL'S AGREEMENT CHECK
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════
async function g6Sentinel(I: Impl, tag: string) {
  const market = {
    id: `mkt_sta_${tag}`, titleEn: "Will Simba SC win the Tanzanian Premier League 2026?",
    titleSw: "Je, Simba SC itashinda Ligi Kuu ya Tanzania 2026?", titleZh: "Simba SC能否赢得2026年坦桑尼亚超级联赛？",
    category: "sports", resolutionCriterion: "Official TFF announcement of the 2026 champion.",
  };
  const shorts = { en: "Will Simba SC win the 2026 league title?", sw: "Je, Simba SC itashinda Ligi Kuu 2026?" };

  const nokey = await I.check({ market, shorts });
  ok("6.nokey · with no key the check is NOT CHECKED, and reads as not checked in every language",
    nokey.status === "unchecked" && /ANTHROPIC_API_KEY/.test(nokey.reason) && (["en", "sw", "zh"] as Loc[]).every((l) => I.line(nokey, l).kind === "unchecked" && I.line(nokey, l).text === "not checked by the sentinel"),
    j({ nokey, en: I.line(nokey, "en") }));
  const none = await I.check({ market, shorts: {} });
  ok("6.none · no short title means nothing to check — not checked, never agrees", none.status === "unchecked" && I.line(none, "en").kind === "unchecked", j(none));
  ok("6.unchecked.line · no verdict, or a verdict that left a language out, reads as not checked",
    I.line(null, "sw").kind === "unchecked" && I.line({ status: "checked", model: "m", checkedAt: "", languages: {} }, "sw").kind === "unchecked");

  // The strict parser.
  const p1 = I.parse({ en: { agrees: true, issue: null }, sw: { agrees: false, issue: "Drops the country." } }, ["en", "sw"]);
  ok("6.parse.ok · a full answer is read per language", p1.ok && p1.languages.en?.agrees === true && p1.languages.sw?.agrees === false && p1.languages.sw?.issue === "Drops the country.", j(p1));
  const p2 = I.parse({ en: { agrees: true, issue: null } }, ["en", "sw"]);
  ok("6.parse.missing · an answer that leaves a language out is unreadable, never agreement", !p2.ok, j(p2));
  const p3 = I.parse({ en: { agrees: "true", issue: null } }, ["en"]);
  ok("6.parse.string · a yes that is not a real boolean is unreadable", !p3.ok, j(p3));
  const p4 = I.parse({ en: { agrees: false } }, ["en"]);
  ok("6.parse.noreason · a disagreement with no reason stays a disagreement, with a stated placeholder", p4.ok && p4.languages.en?.agrees === false && typeof p4.languages.en?.issue === "string", j(p4));

  // A stand-in client: every path offline.
  const bodies: Array<Record<string, unknown>> = [];
  const client = (answer: unknown, fail = false) => ({
    messages: { create: async (body: Record<string, unknown>) => { bodies.push(body); if (fail) throw new Error("simulated outage"); return answer; } },
  });
  const verdict = {
    usage: { input_tokens: 50, output_tokens: 20 },
    content: [{ type: "tool_use", name: "report_agreement", input: { en: { agrees: true, issue: null }, sw: { agrees: false, issue: "Drops the country." } } }],
  };
  const checked = await I.check({ market, shorts, subject: { type: "market", id: market.id } }, { client: client(verdict) });
  ok("6.checked · a real verdict is read: agrees, and does not agree with its reason",
    checked.status === "checked" && I.line(checked, "en").text === "agrees" && I.line(checked, "sw").text === "does not agree: Drops the country.", j(checked));
  const body = bodies.at(-1) as { tool_choice?: { type?: string; name?: string }; tools?: unknown[]; model?: string } | undefined;
  ok("6.checked.forced · the call is forced to report_agreement, with one tool and no web tools",
    body?.tool_choice?.type === "tool" && body.tool_choice.name === "report_agreement" && body.tools?.length === 1 && !/web_search|web_fetch/.test(j(body.tools)), j(body?.tool_choice));
  ok("6.checked.model · the sentinel's model setting is used, never a literal of this file", body?.model === (await SEN.getSentinelModel()), j(body?.model));
  const sentRows = (await aiUsageDal.recent(SINCE, 1_000_000)).filter((e) => e.feature === "sentinel" && e.subjectId === market.id);
  ok("6.checked.meter · the check is metered once, as the sentinel, with the market as its subject", sentRows.length === 1 && sentRows[0].ok, String(sentRows.length));
  const partial = await I.check({ market, shorts, subject: { type: "market", id: `${market.id}_p` } }, { client: client({ content: [{ type: "tool_use", name: "report_agreement", input: { en: { agrees: true, issue: null } } }] }) });
  ok("6.partial · an answer that skips a language is NOT CHECKED as a whole", partial.status === "unchecked" && I.line(partial, "en").kind === "unchecked", j(partial));
  const failed = await I.check({ market, shorts, subject: { type: "market", id: `${market.id}_f` } }, { client: client(null, true) });
  const failRows = (await aiUsageDal.recent(SINCE, 1_000_000)).filter((e) => e.feature === "sentinel" && e.subjectId === `${market.id}_f`);
  ok("6.failed · a failed call is NOT CHECKED, and its failure is metered", failed.status === "unchecked" && failRows.length === 1 && !failRows[0].ok, j({ failed, rows: failRows.length }));

  // A blocked budget: not checked, and the client is never called.
  await USAGE.startNewTopUpWindow();
  await USAGE.recordAiUsage({ feature: "other", model: "claude-sonnet-4-6", inputTokens: 10_000, outputTokens: 0, ok: true, subjectType: "market", subjectId: `sta-budget6-${tag}` });
  await USAGE.setCreditLimit(0.001);
  const calls0 = bodies.length;
  let blocked;
  try { blocked = await I.check({ market, shorts }, { client: client(verdict) }); } finally { await USAGE.setCreditLimit(20); await USAGE.startNewTopUpWindow(); }
  ok("6.budget · over the ceiling the check is NOT CHECKED and no call is made",
    blocked.status === "unchecked" && bodies.length === calls0 && I.line(blocked, "en").kind === "unchecked", j({ blocked, calls: bodies.length - calls0 }));

  const prompt = SEN.buildAgreementPrompt({ market, shorts });
  ok("6.prompt · the prompt carries each short title beside its full question, and only the languages present",
    j(prompt.languages) === j(["en", "sw"]) && prompt.user.includes(shorts.en) && prompt.user.includes(shorts.sw) && prompt.user.includes(market.titleSw) && !prompt.user.includes("CHINESE"), j(prompt.languages));
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════
// §7 · THE WIRING, READ FROM SOURCE
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════
function g7Wiring(W: World) {
  const KEYS = ["shortTitleEn", "shortTitleSw", "shortTitleZh", "competition"];
  const readBody = slice(W.gen, "function toStoredAIPoll(", TOP);
  const writeBody = slice(W.gen, "function toPrismaData(", TOP);
  ok("7.mapper.read · toStoredAIPoll reads all four columns, one line each", readBody.length > 200 && KEYS.every((k) => hasKeyLine(readBody, k)), KEYS.filter((k) => !hasKeyLine(readBody, k)).join(","));
  ok("7.mapper.write · toPrismaData writes all four columns, one line each", writeBody.length > 200 && KEYS.every((k) => hasKeyLine(writeBody, k)), KEYS.filter((k) => !hasKeyLine(writeBody, k)).join(","));
  const pub = slice(W.publish, "export async function publishApprovedPoll(", TOP);
  const call = /createMarket\(\{[\s\S]*?\}\);/.exec(pub)?.[0] ?? "";
  ok("7.publish · publishApprovedPoll hands all four to createMarket", call.length > 100 && KEYS.every((k) => new RegExp(`^\\s*${k}: poll\\.${k}`, "m").test(call)), KEYS.filter((k) => !new RegExp(`^\\s*${k}: poll\\.${k}`, "m").test(call)).join(","));
  const filter = slice(W.gen, "export type FilterReason =", TOP);
  ok("7.filter · no short-title reason exists in FilterReason (approveAIPoll refuses any)", filter.length > 100 && !/short|competition/i.test(filter), filter.slice(0, 80));

  const rule = slice(W.claude, "export function shortTitleRule(", TOP);
  const props = slice(W.claude, "function shortTitleToolProperties(", TOP);
  ok("7.prompt.literal · the budgets in the prompt and the tool are READ from SHORT_TITLE_MAX, never typed",
    rule.length > 100 && props.length > 100 && !/\b(56|28)\b/.test(rule) && !/\b(56|28)\b/.test(props) && /SHORT_TITLE_MAX\.en/.test(rule) && /SHORT_TITLE_MAX\.zh/.test(rule));
  const nowIso = new Date().toISOString();
  const system = CLAUDE.buildSystemPrompt({ nowIso, category: "sports", minLeadHours: 24, webSearch: true });
  const ruleText = CLAUDE.shortTitleRule();
  ok("7.prompt.text · the generator is told the forms and the budgets, and to omit rather than guess",
    system.includes(ruleText) && ruleText.includes(`at most ${ST.SHORT_TITLE_MAX.en} characters`) && ruleText.includes(`at most ${ST.SHORT_TITLE_MAX.zh} characters`) && ruleText.includes("Je, ") && /same proposition/i.test(ruleText) && /leave it out/.test(ruleText));
  ok("7.prompt.nodate · the short-title rule names no date", !/\d{4}-\d{2}-\d{2}/.test(ruleText));
  const tool = slice(W.claude, "function buildSubmitPollTool(", TOP);
  const compEnum = slice(W.claude, "function competitionEnum(", TOP);
  ok("7.tool.enum · submit_poll offers the competition as an enum built from COMPETITIONS, optional",
    /competition: \{ type: "string", enum: competitionEnum\(\)/.test(tool) && /COMPETITIONS/.test(compEnum) && /\.\.\.shortTitleToolProperties\(\)/.test(tool)
      && !/required: \[[^\]]*shortTitle/.test(tool) && !/required: \[[^\]]*competition/.test(tool));

  const cDraft = slice(W.claude, "  async draftShortTitles(", ["\n}\n", "\n  async "]);
  ok("7.claude.draft · the backfill's model call is forced, has no web tools, reads the configured model, and does not meter itself",
    cDraft.length > 200 && /tool_choice: \{ type: "tool", name: "submit_short_titles" \}/.test(cDraft) && /getConfiguredModel\(\)/.test(cDraft)
      && !/webSearchTool|webFetchTool|web_search|web_fetch/.test(cDraft) && !/recordAiUsage\s*\(/.test(cDraft) && !/model:\s*"claude-/.test(cDraft));

  const run = slice(W.backfill, "export async function draftShortTitles(", TOP);
  const iKill = run.indexOf("isPollGenEnabled()"), iBudget = run.indexOf("assertAiBudget("), iMeter = run.indexOf("recordAiUsage(");
  ok("7.order · the kill switch, then the spend gate, then the meter — all inside the run",
    iKill > 0 && iBudget > iKill && iMeter > iBudget && /maxBatchPerRun/.test(run) && /feature: "polls"/.test(run) && /subjectType: "market"/.test(run), j({ iKill, iBudget, iMeter }));

  const agree = slice(W.sentinel, "export async function checkShortTitleAgreement(", ["\nexport "]);
  ok("7.sentinel.noweb · the agreement call is forced to report_agreement, budgeted as the sentinel, with no web tools",
    agree.length > 200 && /tool_choice: \{ type: "tool", name: "report_agreement" \}/.test(agree) && /assertAiBudget\("sentinel"\)/.test(agree) && /getSentinelModel\(\)/.test(agree)
      && !/webSearchTool|webFetchTool|web_search|web_fetch/.test(agree));
  ok("7.sentinel.never-approves · the sentinel module cannot write a short title",
    !/applyShortTitles|short-title-backfill|setShortTitles/.test(W.sentinel));
  const deep = slice(W.sentinel, "export async function deepCheckMarket(", ["\nexport "]);
  ok("7.sentinel.deep · the resolution deep check is untouched: report_outcome only", /report_outcome/.test(deep) && !/report_agreement/.test(deep));
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════
// §12 · DATABASE MODE (its own process; drafts in a fake SystemConfig)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════
async function g12Database() {
  const t = "stdb";
  await closeOpenMarkets();
  clearDrafts();
  const A = await mk(t, 3, { days: 10 });
  const B = await mk(t, 4, { days: 11 });
  const ids = [A.id, B.id];

  FAIL_READ.add(INDEX_KEY);
  const r0 = await BF.draftShortTitles({ officerId: OFFICER, limit: 1 });
  FAIL_READ.delete(INDEX_KEY);
  ok("12.index.unread · when the waiting list cannot be read the run refuses before any call", !r0.ok && (await usageRows(ids)).length === 0, j(r0));

  const r1 = await BF.draftShortTitles({ officerId: OFFICER, limit: 1 });
  const keyA = `shortTitle.draft.${A.id}`;
  ok("12.store.rows · a draft is a SystemConfig row, and the index row names it",
    r1.ok && r1.drafted === 1 && TABLE.has(keyA) && indexIds().includes(A.id), j({ r1, keys: [...TABLE.keys()].filter((k) => k.startsWith("shortTitle.")) }));

  const keyB = `shortTitle.draft.${B.id}`;
  FAIL_SAVE.add(keyB);
  const r2 = await BF.draftShortTitles({ officerId: OFFICER, limit: 1 });
  FAIL_SAVE.delete(keyB);
  ok("12.save.fail · a draft write that does not land is reported, and the index never names it",
    r2.ok && r2.drafted === 0 && r2.failures.some((f) => f.marketId === B.id) && !indexIds().includes(B.id), j(r2));

  const l = await BF.listShortTitleDrafts();
  ok("12.read · the drafts read back from SystemConfig", l.readError === null && l.rows.some((r) => r.market.id === A.id), j({ err: l.readError, n: l.rows.length }));
  const dA = l.rows.find((r) => r.market.id === A.id)?.draft;

  const ap = await BF.approveShortTitleDraft({ officerId: OFFICER, marketId: A.id });
  const mA = await MS.getMarket(A.id);
  ok("12.approve · approving writes the market and removes the draft row and its index entry",
    ap.ok && ap.draftCleared && !TABLE.has(keyA) && !indexIds().includes(A.id) && mA?.shortTitleEn === dA?.en, j({ ap, row: TABLE.has(keyA) }));

  const r3 = await BF.draftShortTitles({ officerId: OFFICER, limit: 1 });
  FAIL_SAVE.add(INDEX_KEY);
  const apB = await BF.approveShortTitleDraft({ officerId: OFFICER, marketId: B.id });
  FAIL_SAVE.delete(INDEX_KEY);
  const mB = await MS.getMarket(B.id);
  ok("12.approve.index-fail · when the waiting list cannot be rewritten, the approval still lands and SAYS the draft was not cleared",
    r3.ok && r3.drafted === 1 && apB.ok && apB.draftCleared === false && !!mB?.shortTitleEn, j({ r3, apB }));
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════
// THE RUN
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════
async function runAll(I: Impl, W: World, n: number) {
  CTX = { tag: tagFor(n) };
  await g1Generate(I, CTX);
  await g2Publish(I, CTX);
  await g3Edit(I, CTX);
  const M = await g4Backfill(I, CTX);
  await g5Decide(I, M);
  await g6Sentinel(I, CTX.tag);
  g7Wiring(W);
}

if (MODE === "db") {
  console.log("\n§12 · database mode (fake SystemConfig)");
  await g12Database();
  const fails = results.filter((r) => !r.ok);
  if (results.length === 0) { console.log("⛔ 0 checks — a zero-assertion run is a SKIPPED run."); process.exit(1); }
  process.exit(fails.length ? 1 : 0);
}

if (!PROVE_RED) {
  await runAll(REAL, WORLD, 0);
  const tsxCli = createRequire(import.meta.url).resolve("tsx/cli");
  const base = { ...process.env };
  delete base.DATABASE_URL; delete base.USE_PRISMA_DAL; delete base.REDIS_URL; delete base.REDIS_ENABLED; delete base.ANTHROPIC_API_KEY;
  for (const [mode, prefix, label] of [["db", "12", "database mode"], ["aipoll", "13", "the AIPoll mapper"]] as const) {
    console.log(`\n§${prefix} · ${label} — its own process`);
    const child = spawnSync(process.execPath, [tsxCli, THIS], { env: { ...base, STA_MODE: mode, DATABASE_URL: FAKE_DATABASE_URL }, encoding: "utf8", timeout: 240_000 });
    const out = `${child.stdout ?? ""}${child.stderr ?? ""}`;
    for (const line of out.split(/\r?\n/)) if (/^(PASS|FAIL) /.test(line)) { results.push({ label: line.slice(5), ok: line.startsWith("PASS"), detail: "" }); console.log(line); }
    ok(`${prefix}.ran · the ${label} process ran its checks and exited clean`, child.status === 0 && new RegExp(`PASS ${prefix}\\.`).test(out),
      `exit ${child.status}${child.status !== 0 ? ` — ${out.slice(-800)}` : ""}`);
  }
  const fails = results.filter((r) => !r.ok);
  const passes = results.length - fails.length;
  console.log(`\n${passes} passed, ${fails.length} failed`);
  if (passes === 0) { console.log("⛔ 0 passed — a zero-assertion run is a SKIPPED run, never a green one."); process.exit(1); }
  process.exit(fails.length ? 1 : 0);
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════
// THE RED TWIN — every plant must be caught by the check named for it. In process; no file is written.
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════
type Plant = { name: string; expect: RegExp; impl?: Partial<Impl>; world?: (w: World) => World };
const FIELDS = [["en", "shortTitleEn"], ["sw", "shortTitleSw"], ["zh", "shortTitleZh"]] as const;
const failedLanguage = (p: { generation: AIPollGeneration | null } & Record<string, unknown>) =>
  FIELDS.some(([, f]) => typeof p.generation?.[f] === "string" && (p.generation[f] as string).length > 0 && p[f] === null);
const PLANTS: Plant[] = [
  { name: "a failing short title is stored as the model wrote it", expect: /^1\.fail\.null/,
    impl: { generate: async (o) => { const p = await GEN.generateAIPoll(o); if (p.generation?.shortTitleSw && p.shortTitleSw === null) { p.shortTitleSw = p.generation.shortTitleSw; await GEN.aiPollStore.set(p); } return p; } } },
  { name: "a short-title failure becomes a FilterReason (the poll can no longer be approved)", expect: /^1\.fail\.(nofilter|approvable)/,
    impl: { generate: async (o) => { const p = await GEN.generateAIPoll(o); if (failedLanguage(p as never)) { p.filterReasons = [...p.filterReasons, "missing_translation"]; await GEN.aiPollStore.set(p); } return p; } } },
  { name: "publish drops the short titles (a hand-copied field left out)", expect: /^2\.carry/,
    impl: { publish: async (i) => { const r = await PUB.publishApprovedPoll(i); if (r.ok) await marketStore.setShortTitles(r.marketId, { shortTitleEn: null, shortTitleSw: null, shortTitleZh: null, competition: null }); return r; } } },
  { name: "the poll edit stores a value the rules refuse", expect: /^3\.hard/,
    impl: { edit: async (id, o) => {
      try { return await GEN.editAIPoll(id, o); } catch (e) {
        if (!(e instanceof GEN.AIPollShortTitleRefused)) throw e;
        const p = await GEN.getAIPoll(id); if (!p) return null;
        for (const [, f] of FIELDS) if (o[f] !== undefined) p[f] = o[f] ?? null;
        if (o.competition !== undefined) p.competition = o.competition;
        await GEN.aiPollStore.set(p); return p;
      }
    } } },
  { name: "the backfill ignores the AI kill switch", expect: /^4\.kill/,
    impl: { draft: async (o) => { const on = await CTRL.isPollGenEnabled(); if (!on) await CTRL.setPollGenEnabled(true, "plant"); try { return await BF.draftShortTitles(o); } finally { if (!on) await CTRL.setPollGenEnabled(false, "plant"); } } } },
  { name: "the backfill ignores the spend ceiling", expect: /^4\.budget\.refused/,
    impl: { draft: async (o) => { const b = await USAGE.assertAiBudget("polls"); if (b.ok) return BF.draftShortTitles(o); await USAGE.setCreditLimit(1e6); try { return await BF.draftShortTitles(o); } finally { await USAGE.setCreditLimit(b.limitUsd); } } } },
  { name: "the batch is not clamped (the run keeps going until nothing is left)", expect: /^4\.clamp/,
    impl: { draft: async (o) => {
      let total = 0, considered = 0; let last = await BF.draftShortTitles(o);
      for (let i = 0; i < 10 && last.ok; i++) { total += last.drafted; considered += last.considered; if (last.drafted === 0) break; last = await BF.draftShortTitles(o); }
      return last.ok ? { ...last, drafted: total, considered } : last;
    } } },
  { name: "a market that already has short titles is drafted anyway", expect: /^4\.skip\.has/,
    impl: { draft: async (o) => {
      const C = CTX.C; if (!C) return BF.draftShortTitles(o);
      const keep = { shortTitleEn: C.shortTitleEn ?? null, shortTitleSw: C.shortTitleSw ?? null, shortTitleZh: C.shortTitleZh ?? null, competition: C.competition ?? null };
      await marketStore.setShortTitles(C.id, { shortTitleEn: null, shortTitleSw: null, shortTitleZh: null, competition: keep.competition });
      try { return await BF.draftShortTitles(o); } finally { await marketStore.setShortTitles(C.id, keep); }
    } } },
  { name: "approving leaves the draft on the waiting list", expect: /^5\.approve\.cleared/,
    impl: { approve: async (o) => { const kv = draftStore(); const saved = new Map(kv); const r = await BF.approveShortTitleDraft(o); if (r.ok) for (const [k, v] of saved) kv.set(k, v); return r; } } },
  { name: "a rejection leaves no audit row", expect: /^5\.reject\.audit/,
    impl: { reject: async (o) => {
      if (!o.reason || o.reason.trim().length < 3) return BF.rejectShortTitleDraft(o);
      const kv = draftStore(); kv.delete(`shortTitle.draft.${o.marketId}`);
      const idx = (kv.get(INDEX_KEY) as { marketIds?: string[] } | undefined)?.marketIds ?? [];
      kv.set(INDEX_KEY, { marketIds: idx.filter((x) => x !== o.marketId) });
      return { ok: true, recorded: true };
    } } },
  { name: "\"not checked\" reads as agreement", expect: /^(6\.(nokey|none|unchecked)|4\.store\.unchecked)/,
    impl: { line: (a, loc) => (!a || a.status !== "checked" ? { kind: "agrees" as const, text: "agrees" } : SEN.agreementLine(a, loc)) } },
  { name: "the verdict parser fills in a language the answer left out", expect: /^6\.parse\.missing/,
    impl: { parse: (raw, langs) => { const r = { ...((raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>) }; for (const l of langs) if (!r[l]) r[l] = { agrees: true, issue: null }; return SEN.parseAgreementVerdict(r, langs); } } },
  { name: "the verdict parser coerces a string \"true\"", expect: /^6\.parse\.string/,
    impl: { parse: (raw, langs) => {
      const r = { ...((raw && typeof raw === "object" ? raw : {}) as Record<string, { agrees?: unknown; issue?: unknown }>) };
      for (const l of langs) if (r[l]) r[l] = { ...r[l], agrees: r[l].agrees === true || r[l].agrees === "true" };
      return SEN.parseAgreementVerdict(r, langs);
    } } },
  { name: "the sentinel's check ignores the spend ceiling", expect: /^6\.budget/,
    impl: { check: async (input, deps) => { const b = await USAGE.assertAiBudget("sentinel"); if (b.ok) return SEN.checkShortTitleAgreement(input, deps); await USAGE.setCreditLimit(1e6); try { return await SEN.checkShortTitleAgreement(input, deps); } finally { await USAGE.setCreditLimit(b.limitUsd); } } } },
  { name: "toPrismaData drops the competition column", expect: /^7\.mapper\.write/,
    world: (w) => ({ ...w, gen: w.gen.replace(/^\s*competition: p\.competition \?\? null,\n/m, "") }) },
  { name: "toStoredAIPoll forgets the Swahili short title", expect: /^7\.mapper\.read/,
    world: (w) => ({ ...w, gen: w.gen.replace(/^\s*shortTitleSw: r\.shortTitleSw \?\? null,\n/m, "") }) },
  { name: "publishApprovedPoll's hand-copy drops shortTitleSw", expect: /^7\.publish/,
    world: (w) => ({ ...w, publish: w.publish.replace(/^\s*shortTitleSw: poll\.shortTitleSw \?\? null,\n/m, "") }) },
  { name: "a FilterReason is added for short titles", expect: /^7\.filter/,
    world: (w) => ({ ...w, gen: w.gen.replace('| "missing_translation";', '| "missing_translation"\n  | "short_title_too_long";') }) },
  { name: "the prompt types the English budget as a literal", expect: /^7\.prompt\.literal/,
    world: (w) => ({ ...w, claude: w.claude.replace("at most ${SHORT_TITLE_MAX.en} characters.\n- Kiswahili", "at most 56 characters.\n- Kiswahili") }) },
  { name: "the backfill's model call meters itself too (a double count)", expect: /^7\.claude\.draft/,
    world: (w) => ({ ...w, claude: w.claude.replace("async draftShortTitles(req: ShortTitleDraftRequest): Promise<ShortTitleDraftResponse> {", "async draftShortTitles(req: ShortTitleDraftRequest): Promise<ShortTitleDraftResponse> {\n    await recordAiUsage({} as never);") }) },
  { name: "the backfill's kill switch is dropped", expect: /^7\.order/,
    world: (w) => ({ ...w, backfill: w.backfill.replace("if (!(await isPollGenEnabled())) {", "if (false) {") }) },
  { name: "the agreement call arms web search", expect: /^7\.sentinel\.noweb/,
    world: (w) => ({ ...w, sentinel: w.sentinel.replace("tools: [agreementTool(prompt.languages)],", "tools: [agreementTool(prompt.languages), { type: ai.webSearchTool.type, name: ai.webSearchTool.name }],") }) },
  { name: "the sentinel module learns to approve a short title", expect: /^7\.sentinel\.never-approves/,
    world: (w) => ({ ...w, sentinel: `${w.sentinel}\nimport { applyShortTitles } from "./short-title-service";\n` }) },
];

{
  quiet = true;
  results = [];
  await runAll(REAL, WORLD, 0);
  const cleanFails = results.filter((r) => !r.ok);
  if (cleanFails.length) {
    console.log(`INCONCLUSIVE: the clean run already fails (${cleanFails[0].label} — ${cleanFails[0].detail})`);
    process.exit(1);
  }
  let caught = 0;
  let n = 0;
  for (const plant of PLANTS) {
    n++;
    results = [];
    const impl: Impl = { ...REAL, ...(plant.impl ?? {}) };
    const world = plant.world ? plant.world(WORLD) : WORLD;
    const planted = !!plant.impl || (plant.world ? j(world) !== j(WORLD) : false);
    try {
      await runAll(impl, world, n);
    } catch (e) {
      results.push({ label: `x.threw · ${String((e as Error)?.message ?? e).slice(0, 120)}`, ok: false, detail: "" });
    }
    const fired = results.some((r) => !r.ok && plant.expect.test(r.label));
    if (planted && fired) caught++;
    console.log(`${(!planted ? "INCONCLUSIVE (plant did not apply)" : fired ? "PROVED" : "BLIND").padEnd(36)} ${plant.name}`);
  }
  console.log(`\n${caught}/${PLANTS.length} caught`);
  process.exit(caught === PLANTS.length ? 0 : 1);
}
