/**
 * test:marketing-engine — THE SEND ENGINE'S SUITE (spec `docs/marketing-specs/ENGINE-SPEC.md`), one SECTION per unit, each
 * self-contained: its labels, its fixture world, its implementation under test and its plants live inside its own block.
 *   §E  U42 · the enqueue — a confirmed campaign's recipient rows over the ONE walk (§4.9, `src/lib/server/marketing/enqueue.ts`);
 *   §F  U49a · the credit kept for codes and the refusal at Start (§4.12) — joins in its own commit;
 *   U43b's sections (the slice, §4.13) join in theirs.
 *
 * ⭐ DRIVEN, NOT READ. §E runs `enqueueStep` on the memory twin over the REAL walk (`walkCampaignAudience`), the REAL fence
 * (`audienceFence` — the confirmed counts and members keys U40a freezes) and the REAL doors (`createMany`, `countByStatus`,
 * `transition`), with a store that can die between a step's two writes and an officer's Pause that can land between them:
 *   E0  controls — the fixture world walks what it claims; the chunk is the walk's page and the seed door's batch; the
 *       dying store lets the first write land and throws on the second;
 *   E1  ⭐ the plan's RED — a restart mid-walk puts every person on the list exactly once;
 *   E1b ⭐ a restart NEAR THE CAP — a page walked again costs no room, so nobody after it is left out; and a cap an
 *       interrupted step already met is finished without walking;
 *   E2  the U35 Accept through the walk — the same 1,000 walked again among 200 newcomers: 1,200 rows;
 *   E3  ⭐ the cap — confirmed 7, walked 8: 7 rows, overflow 1, RUNNING;
 *   E4  an unusable number is counted, never seeded, and refuses no batch;
 *   E5  ⭐ no token is minted (E1), and the module reaches no mint and no send;
 *   E6  a Pause between steps — `not_preparing`, nothing written — and a Pause between a chunk's write and its cursor;
 *   E7  ⭐ X9 — the rows ARE the confirmed count, for the book ∪ the players with a number both hold;
 *   E8  ⭐ E21 — ids sort in walk order;
 *   E9  ⭐ an unreadable stored audience pauses `audience_unreadable`; a failed read throws and pauses nothing;
 *   E10 ⭐ a listed confirmation — the members key re-derived with the confirmed row's own scope; changed people pause
 *       `audience_moved` and nothing is written;
 *   E11 the backstop;
 *   E12 ⛔ no phone number in any result, audit row or error of the run;
 *   E13 the wiring.
 *
 * ⭐ THE HARNESS (`SECTIONS`). A section is `{ name, run, plants }`: `run` records its claims against the REAL code through
 * `ok`/`claim`; each plant re-runs the section with ONE defect planted in memory and names EXACTLY the claims it must turn
 * red. Labels are prefixed by the section's letter, so two sections never share one.
 * ⛔ IN-PROCESS BY CONSTRUCTION (§5.11). `--prove-red` proves the baseline of EVERY section green first, then runs every
 * plant of every section and requires exactly its named claims to fail — red anywhere else is reported, never counted as
 * a catch. A plant is a dependency handed to the step, a stand-in step, or a source text replaced in memory. No file on
 * disk is written. No database is touched: the database variables are removed below, before the first server module
 * loads, so the store picks its memory twin.
 * ⛔ A section that drives a send path (`dispatchSlice`, the test send) imports the fixed windows of
 * `scripts/lib/send-window.mts` (`test:marketing-window` W6) — §E drives none.
 * ⛔ This file holds no backslash (an editing tool decodes them): line breaks and patterns are built from codes and
 * character classes.
 *
 * Run: `npm run test:marketing-engine` · Red: `npm run red:marketing-engine`
 */
delete process.env.DATABASE_URL;
delete process.env.REDIS_URL;
delete process.env.REDIS_ENABLED;
process.env.SMS_PROVIDER = "console";
process.exitCode = 1;

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";

const PROVE_RED = process.argv.includes("--prove-red");

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CR = String.fromCharCode(13);
/** A line break built from its code — this file holds no backslash escape. */
const NL = String.fromCharCode(10);
const rawRead = (rel: string): string => readFileSync(join(ROOT, ...rel.split("/")), "utf8").split(CR).join("");
const code = (rel: string): string => decomment(rawRead(rel));
const relOf = (abs: string): string => abs.slice(ROOT.length + 1).split(sep).join("/");
const json = (v: unknown): string => JSON.stringify(v);

/* ══ THE HARNESS — shared by every section ═══════════════════════════════════════════════════════════════════════════ */

let pass = 0;
let fail = 0;
let quiet = false;
const failed: string[] = [];
const ok = (label: string, cond: boolean, detail = ""): void => {
  if (cond) pass++;
  else { fail++; failed.push(label); }
  if (!quiet) console.log(`${cond ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
};
/** One claim: its body answers [holds, detail]; a throw is a failure with its message, never a crash. ⛔ A detail never
 *  carries a phone number — counts, statuses and reasons only. */
async function claim(label: string, body: () => Promise<[boolean, string]>): Promise<void> {
  try {
    const [cond, detail] = await body();
    ok(label, cond, detail);
  } catch (err) {
    ok(label, false, `threw: ${String((err as Error)?.message ?? err).slice(0, 200)}`);
  }
}
const resetCounts = (): void => { pass = 0; fail = 0; failed.length = 0; };
/** A quiet run: this file's lines and the audit module's console echo both held back, so the red runs print verdicts only. */
async function silently(run: () => Promise<void>): Promise<void> {
  const log = console.log;
  const was = quiet;
  console.log = () => {};
  quiet = true;
  try {
    await run();
  } finally {
    console.log = log;
    quiet = was;
  }
}

/** One defect planted in memory, and the claims it must turn red — exactly those. */
type Plant = { name: string; expect: readonly string[]; run: () => Promise<void> };
/** ⭐ One unit's section: its claims against the real code, and its plants. */
type Section = { name: string; run: () => Promise<void>; plants: () => Plant[] };
const SECTIONS: Section[] = [];

/* ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
 * §E · U42 · THE ENQUEUE — the recipient rows over the ONE walk, capped at the confirmed count, safe to restart
 * (ENGINE-SPEC §4.9; E1 · E19 · E21 · X9 · OD26 · OD28 · OD67). Everything §E needs is inside this block.
 * ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */

const SECTION_E: Section = await (async (): Promise<Section> => {
  const ENQ = await import("../src/lib/server/marketing/enqueue.ts");
  const AUD = await import("../src/lib/server/marketing/audience.ts");
  const FEN = await import("../src/lib/server/marketing/audience-fence.ts");
  const CM = await import("../src/lib/server/marketing/campaign-model.ts");
  const CS = await import("../src/lib/marketing/campaign-status.ts");
  const { db } = await import("../src/lib/server/store.ts");
  const { audit, auditFlush, getAuditPage } = await import("../src/lib/server/audit.ts");
  const { ensureOptOutToken } = await import("../src/lib/server/marketing/optout-service.ts");
  const { parseTzNumber } = await import("../src/lib/tz-msisdn.ts");

  type EnqueueDeps = import("../src/lib/server/marketing/enqueue.ts").EnqueueDeps;
  type EnqueueStepResult = import("../src/lib/server/marketing/enqueue.ts").EnqueueStepResult;
  type ContactAudienceFilter = import("../src/lib/server/marketing/audience.ts").ContactAudienceFilter;
  type CampaignAudienceRow = import("../src/lib/server/marketing/audience.ts").CampaignAudienceRow;
  type StoredSmsCampaign = import("../src/lib/server/store.ts").StoredSmsCampaign;
  type StoredSmsCampaignRecipient = import("../src/lib/server/store.ts").StoredSmsCampaignRecipient;
  type StoredMarketingContact = import("../src/lib/server/store.ts").StoredMarketingContact;
  type StoredUser = import("../src/lib/server/store.ts").StoredUser;
  type SmsCampaignRecipientSeed = import("../src/lib/server/store.ts").SmsCampaignRecipientSeed;
  type AuditEntry = import("../src/lib/server/audit.ts").AuditEntry;

  /* ── THE LABELS — each once, so a plant names exactly the claims it must turn red ── */
  const L = {
    e0: "E0 · controls — the memory twin is loaded and the fixture world walks what it claims through the ONE walk (e1: 5,000 in five pages of 1,000; e45 4,500; e25 2,500; e3 8; e4 8, two of them numbers that cannot be messaged; the book ∪ players world 7, its book-held player walked once); ENQUEUE_CHUNK is the walk's page and the seed door's batch (1,000) and ENQUEUE_BACKSTOP 200,000; and the suite's dying store lets the first of two writes land and throws on the second, unapplied",
    e1: "E1 · ⭐ RESTART MID-WALK (the plan's RED) — 5,000 confirmed and walked in five chunks; the step writing chunk 3 dies between its two writes (its second throws, unapplied); resumed, every person is on the list EXACTLY ONCE — 5,000 rows, no number twice, none missing — the chunk walked again wrote nobody (1,000 duplicates), and the campaign is RUNNING with the cursor done",
    e1b: "E1b · ⭐ A RESTART NEAR THE CAP — 4,500 confirmed and walked; the step writing chunk 4 of 5 dies between its two writes; resumed, the page walked again costs no room (1,000 duplicates): 4,500 rows, each once, overflow 0 — never an early finish that leaves the last 500 out; and a cap an interrupted step already met (1,000 confirmed of 5,000, the finish lost) is finished WITHOUT walking, overflow 0",
    e2: "E2 · the U35 Accept, through the walk — 1,000 written and the list's finish lost, then the same 1,000 walked again among 200 newcomers interleaved by id: 1,200 rows, each once, nobody missing, 1,000 reported as duplicates and 200 inserted, overflow 0, RUNNING",
    e3: "E3 · ⭐ THE CAP (E19) — confirmed 7, the walk yields 8: 7 rows, the walk's FIRST 7, overflow 1 in the result and in ONE SYSTEM marketing.campaign_enqueued row (actor null, SmsCampaign#id; rows 7, confirmed 7, backstop false, walkComplete true), and the campaign RUNNING",
    e4: "E4 · an unusable number is not seeded, refuses no batch, and is counted — of 8 walked, a 064 number and a number that is no mobile key get no row while the other 6 are written, unusable 2 in the result and in the audit row",
    e5: "E5 · ⭐ E1 · NO TOKEN IS MINTED — across the run the opt-out token table is unchanged and every row the enqueue wrote carries optOutToken null; and enqueue.ts reaches no token mint, no send loop and no test send through its imports, imports nothing from the SMS modules, names no send and no mint, and writes optOutToken as null and as nothing else",
    e6: "E6 · a Pause between steps — the step answers not_preparing (PAUSED) and writes nothing, the cursor where it was, no enqueued row; DRAFT, CONFIRMED, RUNNING and CANCELLED answer not_preparing with their own status and write nothing; and a Pause landing BETWEEN a chunk's write and its cursor leaves the cursor behind (not_preparing PAUSED), so once resumed the page walked again writes nobody new",
    e7: "E7 · ⭐ X9 · THE ROWS ARE THE CONFIRMED COUNT — a book ∪ players audience with a number held by both, confirmed through the real fence (7, typed): 7 rows, no duplicate, overflow 0; the held number once, as its book row carrying its contact and the book's account link; the two players' rows carry their accounts and no contact",
    e8: "E8 · ⭐ E21 · ids sort in walk order — over a three-step enqueue and over the book ∪ players one, ordering the rows by id gives the ONE walk's own order of keys, and every id is rcp_ and 32 lowercase hex",
    e9: "E9 · ⭐ AN UNREADABLE STORED AUDIENCE pauses audience_unreadable — a filter the campaign's door refuses (the walk asked ZERO times), a stored tier this code does not know, a listed confirmation without its members key, and a stored cursor the walk refuses: each PAUSED with that stop reason and its pausedAt, ONE SYSTEM marketing.campaign_paused row { reason }, nothing written, no enqueued row; while a walk whose READ fails throws, the campaign still PREPARING and nothing paused; and stopReasonLabel says the spec's sentence",
    e10: "E10 · ⭐ A LISTED CONFIRMATION — the members key re-derived with the confirmed row's own scope: the same three people are written in ONE step and the campaign RUNNING; one person swapped (still three) writes NOTHING and pauses audience_moved with ONE SYSTEM paused row; one person gone pauses it too; a newcomer after the three is overflow 1 with the three written; and stopReasonLabel says the spec's sentence",
    e11: "E11 · the backstop — confirmed 250,000 with 199,995 rows already on the campaign: 5 more written (the walk's first 5), the rest of the page overflow 3, and the list finished at 200,000 rows with backstop true in its audit row; confirmed 7 over the same people finishes backstop false",
    e12: "E12 · ⛔ no phone number — no 255… key and no +255… number in any step result, audit payload or error of the run",
    e13: "E13 · the wiring — ENQUEUE_DEPS is frozen and hands in walkCampaignAudience, membersKeyOf and audit, and its ids are rcp_ and 32 lowercase hex; enqueue.ts reaches the store only through smsCampaign.find, smsCampaign.transition, smsCampaignRecipient.createMany and smsCampaignRecipient.countByStatus; no src file but enqueue.ts names enqueueStep or VALUE-imports the module (any specifier that resolves to it; a type-only import is erased and allowed — the detector's own control) beyond ENQUEUE_CALLERS (none until U47b's Start), so no graph — a client's included — reaches it; test:marketing-engine and red:marketing-engine resolve to this file, and predeploy runs the suite once, right after test:campaign-gates",
  } as const;

  /** ⛔ THE FILES ALLOWED TO CALL `enqueueStep` — NONE until U47b's Start (`src/lib/server/marketing/campaign-control.ts`)
   *  declares itself here in its own commit. */
  const ENQUEUE_CALLERS: readonly string[] = [];
  const ENQ_REL = "src/lib/server/marketing/enqueue.ts";

  /* ── THE MEMORY TWIN, read directly where a claim needs the stored truth ── */
  type Mem = {
    marketingContacts: Map<string, StoredMarketingContact>;
    smsCampaigns: Map<string, StoredSmsCampaign>;
    smsCampaignRecipients: Map<string, StoredSmsCampaignRecipient>;
    optOutTokens: Map<string, unknown>;
  };
  const mem = (): Mem => {
    const s = (globalThis as unknown as { __50PICK_STORE?: Mem }).__50PICK_STORE;
    if (!s || !s.marketingContacts || !s.smsCampaigns || !s.smsCampaignRecipients || !s.optOutTokens) {
      throw new Error("the memory store is not loaded — this suite runs on the memory twin only");
    }
    return s;
  };

  /* ── THE FIXTURE WORLD — written once, through the store's own doors ── */
  /** A bare key on an NDC: `255`, the two NDC digits, seven more. */
  const keyOf = (ndc: string, n: number): string => `255${ndc}${String(n).padStart(7, "0")}`;
  const T0 = "2026-08-20T08:00:00.000Z";
  const contactRow = (id: string, msisdn: string, tags: string[], userId: string | null): StoredMarketingContact => ({
    id, msisdn, rawInput: msisdn, displayName: null, email: null, ndc: msisdn.slice(3, 5), operator: null, source: "IMPORT",
    sourceRef: null, userId, consentState: "UNKNOWN", suppressedAt: null, tags, notes: null, importId: null,
    createdAt: T0, createdBy: null, updatedAt: T0, updatedBy: null,
  } as StoredMarketingContact);
  async function addContact(id: string, msisdn: string, tags: string[], userId: string | null = null): Promise<void> {
    if ((await db.marketingContact.create(contactRow(id, msisdn, tags, userId))) === null) throw new Error(`fixture: contact ${id} collided`);
  }
  const playerRow = (id: string, key: string): StoredUser => ({
    id, phoneE164: `+${key}`, passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "ACTIVE", locale: "SW", displayName: null, dob: "1990-01-01", region: null,
    acceptedTermsVersion: "v1", acceptedTermsAt: T0, marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: T0, updatedAt: T0, lastLoginAt: T0, closedAt: null,
  } as StoredUser);

  const WB = AUD.WHOLE_BOOK;
  const tagF = (t: string): ContactAudienceFilter => ({ ...WB, tags: [t] });
  const pad = (i: number, w: number): string => String(i).padStart(w, "0");

  // ── e1: 5,000 Vodacom 074 contacts in id order — e45 the first 4,500, e25 the first 2,500 ──
  for (let i = 0; i < 5000; i++) {
    const tags = ["e1"];
    if (i < 4500) tags.push("e45");
    if (i < 2500) tags.push("e25");
    await addContact(`mc_e1_${pad(i, 4)}`, keyOf("74", 1_000_000 + i), tags);
  }
  // ── e3: 8 Vodacom 075 contacts ──
  for (let i = 0; i < 8; i++) await addContact(`mc_e3_${i}`, keyOf("75", 30_000 + i), ["e3"]);
  // ── e4: 6 contacts that can be messaged, a 064 number (Telxer: allocated, no network) and a number that is no mobile key ──
  const E4_UNUSABLE = ["255641000904", "255123456789"];
  for (let i = 0; i < 6; i++) await addContact(`mc_e4_${i}`, keyOf("75", 40_000 + i), ["e4"]);
  await addContact("mc_e4_6", E4_UNUSABLE[0], ["e4"]);
  await addContact("mc_e4_7", E4_UNUSABLE[1], ["e4"]);
  // ── X9 · the book ∪ players on Airtel 068 (the only Airtel numbers in this world): four contacts, a fifth whose number a
  //    player holds (linked to that account), and three players — the book-held one last by account id ──
  const HELD = keyOf("68", 50);
  await db.user.create(playerRow("pl_e7_1", keyOf("68", 61)));
  await db.user.create(playerRow("pl_e7_2", keyOf("68", 62)));
  await db.user.create(playerRow("pl_e7_3", HELD));
  for (let i = 1; i <= 4; i++) await addContact(`mc_e7_${i}`, keyOf("68", i), ["e7"]);
  await addContact("mc_e7_h", HELD, ["e7"], "pl_e7_3");
  const X9F: ContactAudienceFilter = { ...WB, population: "both", operators: ["AIRTEL"] };

  /* ── ONE RUN'S WORLD: its campaigns, its results, its errors ── */
  let RUN = 0;
  type World = { run: number; ids: Set<string>; results: unknown[]; errors: string[] };

  async function draftOf(w: World, slot: string, audienceFilter: string): Promise<string> {
    const id = `cmp_e${w.run}_${slot}`;
    const at = new Date().toISOString();
    await db.smsCampaign.create({
      id, name: `Engine ${slot}`, status: "DRAFT", bodySw: "50pick: Habari, soka leo.", bodyEn: null,
      codingSw: "GSM7", segmentsSw: 1, codingEn: null, segmentsEn: null, nameFallbackSw: null, nameFallbackEn: null,
      sourcePhrase: "Namba yako ipo kwenye orodha ya 50pick.", draftRevision: 0, confirmTier: null, audienceFilter,
      audienceCount: null, audienceWatermark: null, estimateSegments: null, estimateTzs: null, budgetTzs: null,
      enqueueCursor: null, enqueuedAt: null, stopReason: null, createdBy: "off_engine", confirmedBy: null, confirmedAt: null,
      startedAt: null, pausedAt: null, finishedAt: null, createdAt: at, updatedAt: at,
    } as StoredSmsCampaign);
    w.ids.add(id);
    return id;
  }
  type Confirm = { count: number; tier: "TYPED" | "ENUMERATE"; watermark: string | null };
  /** DRAFT → CONFIRMED through the ONE door, every confirm key at once (U40a's write). */
  async function confirmOnly(id: string, c: Confirm): Promise<void> {
    const at = new Date().toISOString();
    const r = await db.smsCampaign.transition(id, {
      from: ["DRAFT"], to: "CONFIRMED", draftRevision: 0, at,
      patch: {
        audienceCount: c.count, confirmTier: c.tier, audienceWatermark: c.watermark, estimateSegments: c.count,
        estimateTzs: c.count * 6, budgetTzs: 10_000, confirmedBy: "off_engine", confirmedAt: at,
      },
    });
    if (r === null) throw new Error("fixture: the confirmation did not land");
  }
  /** …and Start: CONFIRMED → PREPARING (U47b's move). */
  async function confirmAndStart(id: string, c: Confirm): Promise<void> {
    await confirmOnly(id, c);
    const at = new Date().toISOString();
    const r = await db.smsCampaign.transition(id, { from: ["CONFIRMED"], to: "PREPARING", patch: { startedAt: at }, draftRevision: null, at });
    if (r === null) throw new Error("fixture: Start did not land");
  }
  /** A campaign on `filter` (or a stored filter's text), confirmed TYPED at `count`, started. */
  async function typedCampaign(w: World, slot: string, filter: ContactAudienceFilter | string, count: number): Promise<string> {
    const id = await draftOf(w, slot, typeof filter === "string" ? filter : AUD.contactAudienceKey(filter));
    await confirmAndStart(id, { count, tier: "TYPED", watermark: null });
    return id;
  }
  /** ⭐ A campaign confirmed exactly as the REAL fence counts it (U40a): its count, its tier and — listed — its members key
   *  for THIS draft at revision 0; started. */
  async function fencedCampaign(w: World, slot: string, filter: ContactAudienceFilter): Promise<{ id: string; tier: string; count: number }> {
    const audienceFilter = AUD.contactAudienceKey(filter);
    const id = await draftOf(w, slot, audienceFilter);
    const { claim: fence } = await FEN.audienceFence({ id, draftRevision: 0, audienceFilter });
    await confirmAndStart(id, { count: fence.count, tier: fence.tier === "enumerate" ? "ENUMERATE" : "TYPED", watermark: fence.membersKey });
    return { id, tier: fence.tier, count: fence.count };
  }
  async function moveTo(id: string, from: StoredSmsCampaign["status"][], to: StoredSmsCampaign["status"], patch: Record<string, unknown>): Promise<void> {
    const at = new Date().toISOString();
    const r = await db.smsCampaign.transition(id, { from, to, patch: { ...patch } as never, draftRevision: null, at });
    if (r === null) throw new Error(`fixture: the move to ${to} did not land`);
  }
  const officerPause = (id: string): Promise<void> =>
    moveTo(id, ["PREPARING", "RUNNING"], "PAUSED", { pausedAt: new Date().toISOString(), stopReason: "officer_paused" });
  const resumeEnqueue = (id: string): Promise<void> => moveTo(id, ["PAUSED"], "PREPARING", { stopReason: null });

  /* ── THE STORED TRUTH ── */
  const rowsOf = (id: string): StoredSmsCampaignRecipient[] => [...mem().smsCampaignRecipients.values()].filter((r) => r.campaignId === id);
  const campaignOf = (id: string): StoredSmsCampaign | null => {
    const r = mem().smsCampaigns.get(id);
    return r ? { ...r } : null;
  };
  const onceEach = (rows: readonly StoredSmsCampaignRecipient[]): boolean => new Set(rows.map((r) => r.msisdn)).size === rows.length;
  const sameSet = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && json([...a].sort()) === json([...b].sort());
  const byId = (a: StoredSmsCampaignRecipient, b: StoredSmsCampaignRecipient): number => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  /** ⭐ THE ORACLE — the ONE walk's keys for a filter, in its own order, every person it yields. */
  async function walkKeys(f: ContactAudienceFilter): Promise<string[]> {
    const keys: string[] = [];
    let cursor: string | null = null;
    for (let guard = 0; guard < 1000; guard++) {
      const page = await AUD.walkCampaignAudience(f, cursor, AUD.CAMPAIGN_WALK_MAX);
      for (const r of page.rows) keys.push(r.msisdn);
      if (page.next === "done") return keys;
      cursor = page.next;
    }
    throw new Error("walkKeys: the walk did not end");
  }
  async function auditRows(action: string, targetId: string): Promise<AuditEntry[]> {
    await auditFlush();
    return getAuditPage({ limit: 10_000 }).filter((e) => e.action === action && e.targetId === targetId);
  }
  const payloadOf = (rows: readonly AuditEntry[]): Record<string, unknown> => (rows[0]?.payload ?? {}) as Record<string, unknown>;
  const RAW_KEY = new RegExp("(^|[^0-9])255[67][0-9]{8}([^0-9]|$)");
  const PLUS_KEY = new RegExp("[+]255[0-9]{9}");
  const RCP_ID = new RegExp("^rcp_[0-9a-f]{32}$");
  const UNREADABLE_SENTENCE = "Paused — the saved audience can't be read any more. Stop this campaign and confirm a new copy.";
  const MOVED_SENTENCE = "Paused — the people on this campaign changed after it was started. Nothing was sent. Stop it and confirm a new copy.";

  /* ── THE STAND-INS a claim hands the step ── */
  type Crash = { armed: boolean; writes: number; fired: boolean };
  const crashState = (armed = false): Crash => ({ armed, writes: 0, fired: false });
  /** ⭐ A STORE THAT DIES ONCE, BETWEEN TWO WRITES: armed, it lets the step's FIRST write land (seeds or a campaign move) and
   *  throws on the SECOND before it is applied — whichever order the step makes them in. */
  function crashOn(c: Crash): Partial<EnqueueDeps> {
    const write = (): void => {
      if (!c.armed) return;
      c.writes++;
      if (c.writes < 2) return;
      c.armed = false;
      c.fired = true;
      throw new Error("the store died between two writes (the suite's stand-in) — this write was not applied");
    };
    const base = ENQ.ENQUEUE_DEPS;
    return {
      campaigns: { find: base.campaigns.find, transition: async (id, t) => { write(); return base.campaigns.transition(id, t); } },
      recipients: { countByStatus: base.recipients.countByStatus, createMany: async (s) => { write(); return base.recipients.createMany(s); } },
    };
  }
  /** An officer's Pause landing BETWEEN a chunk's write and its cursor: armed, it pauses the campaign just before the step's
   *  cursor move reaches the store. */
  function pauseBetween(trigger: { armed: boolean }): Partial<EnqueueDeps> {
    const base = ENQ.ENQUEUE_DEPS;
    return {
      campaigns: {
        find: base.campaigns.find,
        transition: async (id, t) => {
          if (trigger.armed && t.to === null && t.patch.enqueueCursor !== undefined) {
            trigger.armed = false;
            await officerPause(id);
          }
          return base.campaigns.transition(id, t);
        },
      },
    };
  }
  /** The walk, counted. */
  const countingWalk = (n: { walks: number }): Partial<EnqueueDeps> => ({
    walk: async (f, c, l, d) => { n.walks++; return AUD.walkCampaignAudience(f, c, l, d); },
  });

  /* ── THE BUNDLE UNDER TEST — every part swappable by a plant ── */
  type Sources = { enqueue: string; pkg: string; src: ReadonlyMap<string, string> };
  type Impl = {
    step: typeof ENQ.enqueueStep;
    /** A plant's last word on the dependencies a claim assembled (identity when nothing is planted). */
    finish: (d: EnqueueDeps) => EnqueueDeps;
    /** The SHIPPED dependencies, as E13 reads them. */
    shipped: Readonly<EnqueueDeps>;
    sources: Sources;
  };
  function walkDir(abs: string): string[] {
    if (!existsSync(abs)) return [];
    return readdirSync(abs, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? walkDir(join(abs, e.name)) : /[.]tsx?$/.test(e.name) ? [join(abs, e.name)] : []);
  }
  /** Every src file that spells `enqueue` at all (the step's name, or a specifier that could reach the module), decommented —
   *  E13's caller scan reads these. */
  const naming = new Map<string, string>();
  for (const abs of walkDir(join(ROOT, "src"))) {
    const raw = readFileSync(abs, "utf8");
    if (raw.includes("enqueue")) naming.set(relOf(abs), decomment(raw.split(CR).join("")));
  }
  const REAL_SOURCES: Sources = { enqueue: code(ENQ_REL), pkg: rawRead("package.json"), src: naming };
  const REAL: Impl = { step: ENQ.enqueueStep, finish: (d) => d, shipped: ENQ.ENQUEUE_DEPS, sources: REAL_SOURCES };

  /** The dependencies one step gets: production's, a claim's own stand-ins, and the plant's last word — built afresh for
   *  every step, so a plant's per-step state starts clean. */
  const depsOf = (impl: Impl, over: Partial<EnqueueDeps> = {}): EnqueueDeps => impl.finish({ ...ENQ.ENQUEUE_DEPS, ...over });
  async function stepOf(impl: Impl, w: World, id: string, over: Partial<EnqueueDeps> = {}): Promise<EnqueueStepResult> {
    try {
      const r = await impl.step(id, depsOf(impl, over));
      w.results.push(r);
      return r;
    } catch (err) {
      w.errors.push(String((err as Error)?.message ?? err));
      throw err;
    }
  }
  /** Steps until the list is finished, paused or no longer preparing — or a step throws, or `max` steps. */
  async function drive(impl: Impl, w: World, id: string, over: Partial<EnqueueDeps> = {}, max = 30): Promise<{ results: EnqueueStepResult[]; threw: number }> {
    const results: EnqueueStepResult[] = [];
    let threw = 0;
    for (let s = 0; s < max; s++) {
      let r: EnqueueStepResult;
      try {
        r = await stepOf(impl, w, id, over);
      } catch {
        threw++;
        break;
      }
      results.push(r);
      if (r.kind !== "wrote") break;
    }
    return { results, threw };
  }
  const lastOf = (rs: readonly EnqueueStepResult[]): EnqueueStepResult | null => rs[rs.length - 1] ?? null;
  const said = (r: EnqueueStepResult | null): string => {
    if (r === null) return "nothing";
    if (r.kind === "wrote") return `wrote ${r.inserted}+${r.duplicates}`;
    if (r.kind === "done") return `done ${r.total} (overflow ${r.overflow}, unusable ${r.unusable})`;
    if (r.kind === "paused") return `paused ${r.reason}`;
    return `not_preparing ${r.status}`;
  };

  /* ── THE IMPORT WALK (E5) — read-only; enqueue.ts's own text comes from the bundle, so a plant reaches it ── */
  const DISK = new Map<string, string>();
  const sourceFor = (rel: string, s: Sources): string => {
    if (rel === ENQ_REL) return s.enqueue;
    let text = DISK.get(rel);
    if (text === undefined) {
      text = code(rel);
      DISK.set(rel, text);
    }
    return text;
  };
  function resolveSpec(fromRel: string, spec: string): string | null {
    let base: string;
    if (spec.startsWith("@/")) base = join(ROOT, "src", ...spec.slice(2).split("/"));
    else if (spec.startsWith(".")) base = resolve(dirname(join(ROOT, ...fromRel.split("/"))), ...spec.split("/"));
    else return null;
    for (const candidate of [`${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx"), base]) {
      if (existsSync(candidate) && statSync(candidate).isFile() && /[.]tsx?$/.test(candidate)) return relOf(candidate);
    }
    return null;
  }
  /** A source's VALUE-import specifiers — static (and re-exports), dynamic and bare. ⭐ A type-only import is erased at build
   *  and reaches nothing, so it is not one. ONE reader for E5's walk and E13's caller scan. */
  function valueImports(text: string): string[] {
    const FROM = new RegExp(`(?:import|export)[ ]+(type[ ]+)?[^"';]*?from[ ]*["']([^"']+)["']`, "g");
    const DYNAMIC = new RegExp(`import[ ]*[(][ ]*["']([^"']+)["']`, "g");
    const BARE = new RegExp(`import[ ]+["']([^"']+)["']`, "g");
    return [
      ...[...text.matchAll(FROM)].filter((m) => m[1] === undefined).map((m) => m[2]),
      ...[...text.matchAll(DYNAMIC)].map((m) => m[1]),
      ...[...text.matchAll(BARE)].map((m) => m[1]),
    ];
  }
  /** Does this source value-import the enqueue module, in any spelling that resolves to it? */
  const reachesEnqueue = (rel: string, text: string): boolean => valueImports(text).some((spec) => resolveSpec(rel, spec) === ENQ_REL);
  function importWalk(start: string, s: Sources): Set<string> {
    const seen = new Set<string>([start]);
    const queue = [start];
    while (queue.length > 0) {
      const rel = queue.shift() as string;
      const text = sourceFor(rel, s);
      const specs = valueImports(text);
      for (const spec of specs) {
        const next = resolveSpec(rel, spec);
        if (next !== null && !seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
      }
    }
    return seen;
  }

  /* ══ THE CLAIMS ══════════════════════════════════════════════════════════════════════════════════════════════════ */

  async function runE(impl: Impl): Promise<void> {
    const w: World = { run: ++RUN, ids: new Set(), results: [], errors: [] };
    const tokensBefore = mem().optOutTokens.size;

    /* E0 · controls */
    await claim(L.e0, async () => {
      const pages: number[] = [];
      let cursor: string | null = null;
      for (let g = 0; g < 20; g++) {
        const p = await AUD.walkCampaignAudience(tagF("e1"), cursor, ENQ.ENQUEUE_CHUNK);
        pages.push(p.rows.length);
        if (p.next === "done") break;
        cursor = p.next;
      }
      const e4 = await walkKeys(tagF("e4"));
      const sizes = {
        e45: (await walkKeys(tagF("e45"))).length, e25: (await walkKeys(tagF("e25"))).length, e3: (await walkKeys(tagF("e3"))).length,
        e4: e4.length, e4Unusable: e4.filter((k) => parseTzNumber(k).msisdn === null).length, x9: await AUD.campaignAudienceCount(X9F),
      };
      const numbers = ENQ.ENQUEUE_CHUNK === 1000 && AUD.CAMPAIGN_WALK_MAX === ENQ.ENQUEUE_CHUNK
        && CM.SMS_CAMPAIGN_SEED_CHUNK_MAX === ENQ.ENQUEUE_CHUNK && ENQ.ENQUEUE_BACKSTOP === 200_000;
      // the dying store, on a scratch campaign: the first write lands, the second throws and is not applied
      const id = await typedCampaign(w, "e0", tagF("e3"), 8);
      const c = crashState(true);
      const d: EnqueueDeps = { ...ENQ.ENQUEUE_DEPS, ...crashOn(c) };
      const at = new Date().toISOString();
      await d.recipients.createMany([{ id: `rcp_e0_r${w.run}`, campaignId: id, msisdn: keyOf("75", 30_000), contactId: "mc_e3_0", userId: null, optOutToken: null, createdAt: at }]);
      let threw = false;
      try {
        await d.campaigns.transition(id, { from: ["PREPARING"], to: null, patch: { enqueueCursor: "b:mc_e3_0" }, draftRevision: null, at });
      } catch {
        threw = true;
      }
      const after = campaignOf(id);
      return [json(pages) === json([1000, 1000, 1000, 1000, 1000]) && json(sizes) === json({ e45: 4500, e25: 2500, e3: 8, e4: 8, e4Unusable: 2, x9: 7 })
        && numbers && threw && c.fired && rowsOf(id).length === 1 && after?.enqueueCursor === null && after.status === "PREPARING",
        `pages ${json(pages)} · ${json(sizes)} · numbers ${numbers} · the stand-in threw ${threw}, rows ${rowsOf(id).length}, cursor ${after?.enqueueCursor ?? "null"}`];
    });

    /* E1 · ⭐ restart mid-walk */
    await claim(L.e1, async () => {
      const id = await typedCampaign(w, "e1", tagF("e1"), 5000);
      const c = crashState();
      const over = crashOn(c);
      const seen: string[] = [];
      let rowsAtCrash = -1;
      for (let s = 1; s <= 20; s++) {
        if (s === 3) c.armed = true;
        let r: EnqueueStepResult;
        try {
          r = await stepOf(impl, w, id, over);
        } catch {
          seen.push("threw");
          rowsAtCrash = rowsOf(id).length;
          continue;
        }
        seen.push(r.kind === "wrote" ? `wrote ${r.inserted}+${r.duplicates}` : r.kind);
        if (r.kind !== "wrote") break;
      }
      const rows = rowsOf(id);
      const want = await walkKeys(tagF("e1"));
      const cmp = campaignOf(id);
      return [c.fired && rowsAtCrash === 3000
        && json(seen) === json(["wrote 1000+0", "wrote 1000+0", "threw", "wrote 0+1000", "wrote 1000+0", "done"])
        && rows.length === 5000 && onceEach(rows) && sameSet(rows.map((r) => r.msisdn), want)
        && cmp?.status === "RUNNING" && cmp.enqueueCursor === "done" && cmp.enqueuedAt !== null,
        `steps [${seen.join(", ")}] · ${rowsAtCrash} rows when it died · ${rows.length} rows, each once ${onceEach(rows)}, the walk's ${sameSet(rows.map((r) => r.msisdn), want)} · ${cmp?.status} ${cmp?.enqueueCursor ?? "null"}`];
    });

    /* E1b · ⭐ a restart near the cap; and a cap already met */
    await claim(L.e1b, async () => {
      const id = await typedCampaign(w, "e1b", tagF("e45"), 4500);
      const c = crashState();
      const over = crashOn(c);
      const seen: string[] = [];
      let finished: EnqueueStepResult | null = null;
      for (let s = 1; s <= 20; s++) {
        if (s === 4) c.armed = true;
        let r: EnqueueStepResult;
        try {
          r = await stepOf(impl, w, id, over);
        } catch {
          seen.push("threw");
          continue;
        }
        seen.push(r.kind === "wrote" ? `wrote ${r.inserted}+${r.duplicates}` : r.kind);
        if (r.kind !== "wrote") { finished = r; break; }
      }
      const rows = rowsOf(id);
      const want = await walkKeys(tagF("e45"));
      const near = c.fired && json(seen) === json(["wrote 1000+0", "wrote 1000+0", "wrote 1000+0", "threw", "wrote 0+1000", "done"])
        && rows.length === 4500 && onceEach(rows) && sameSet(rows.map((r) => r.msisdn), want)
        && finished?.kind === "done" && finished.overflow === 0 && campaignOf(id)?.status === "RUNNING";
      // (b) 1,000 confirmed of 5,000: the step that fills the cap dies before its finish lands; resumed, it walks NOTHING
      const id2 = await typedCampaign(w, "e1b2", tagF("e1"), 1000);
      const c2 = crashState(true);
      let threw2 = false;
      try { await stepOf(impl, w, id2, crashOn(c2)); } catch { threw2 = true; }
      const before2 = rowsOf(id2).length;
      const n = { walks: 0 };
      let r2: EnqueueStepResult | null = null;
      try { r2 = await stepOf(impl, w, id2, countingWalk(n)); } catch { r2 = null; }
      const a2 = payloadOf(await auditRows(ENQ.CAMPAIGN_ENQUEUED_ACTION, id2));
      const met = threw2 && before2 === 1000 && n.walks === 0 && r2?.kind === "done" && r2.total === 1000 && r2.overflow === 0
        && rowsOf(id2).length === 1000 && a2.overflow === 0 && a2.walkComplete === false && campaignOf(id2)?.status === "RUNNING";
      return [near && met,
        `near the cap: [${seen.join(", ")}] → ${rows.length} rows, each once ${onceEach(rows)}, ${said(finished)} · the cap already met: died ${threw2} with ${before2}, then ${said(r2)} after ${n.walks} walk(s), audit overflow ${String(a2.overflow)}`];
    });

    /* E2 · the U35 Accept through the walk */
    await claim(L.e2, async () => {
      const tag = `e2-r${w.run}`;
      const base = w.run * 10_000;
      for (let i = 0; i < 1000; i++) await addContact(`mc_e2_r${w.run}_${pad(i * 6, 5)}`, keyOf("77", base + i * 6), [tag]);
      const id = await typedCampaign(w, "e2", tagF(tag), 2000);
      const c = crashState(true);
      let threw = false;
      try { await stepOf(impl, w, id, crashOn(c)); } catch { threw = true; }
      const firstPass = rowsOf(id).length;
      for (let j = 0; j < 200; j++) await addContact(`mc_e2_r${w.run}_${pad(j * 30 + 3, 5)}`, keyOf("77", base + j * 30 + 3), [tag]);
      const end = await drive(impl, w, id);
      const rows = rowsOf(id);
      const want = await walkKeys(tagF(tag));
      const wrote = end.results.filter((r): r is Extract<EnqueueStepResult, { kind: "wrote" }> => r.kind === "wrote");
      const fin = lastOf(end.results);
      const a = payloadOf(await auditRows(ENQ.CAMPAIGN_ENQUEUED_ACTION, id));
      const dups = wrote.reduce((n, r) => n + r.duplicates, 0) + (typeof a.duplicates === "number" ? a.duplicates : 0);
      return [threw && firstPass === 1000 && rows.length === 1200 && onceEach(rows) && want.length === 1200 && sameSet(rows.map((r) => r.msisdn), want)
        && dups === 1000 && rows.length - firstPass === 200 && fin?.kind === "done" && fin.overflow === 0 && campaignOf(id)?.status === "RUNNING",
        `first pass ${firstPass} (died ${threw}) · resumed [${end.results.map(said).join(", ")}] · ${rows.length} rows, each once ${onceEach(rows)}, the walk's ${sameSet(rows.map((r) => r.msisdn), want)} · duplicates ${dups}`];
    });

    /* E3 · ⭐ the cap */
    await claim(L.e3, async () => {
      const id = await typedCampaign(w, "e3", tagF("e3"), 7);
      const end = await drive(impl, w, id);
      const rows = rowsOf(id);
      const first7 = (await walkKeys(tagF("e3"))).slice(0, 7);
      const audits = await auditRows(ENQ.CAMPAIGN_ENQUEUED_ACTION, id);
      const p = payloadOf(audits);
      const fin = lastOf(end.results);
      return [rows.length === 7 && sameSet(rows.map((r) => r.msisdn), first7) && fin?.kind === "done" && fin.overflow === 1 && fin.total === 7
        && audits.length === 1 && audits[0].category === "SYSTEM" && audits[0].actorId === null && audits[0].targetType === "SmsCampaign"
        && p.rows === 7 && p.confirmed === 7 && p.overflow === 1 && p.backstop === false && p.walkComplete === true
        && campaignOf(id)?.status === "RUNNING",
        `[${end.results.map(said).join(", ")}] · ${rows.length} rows, the walk's first 7 ${sameSet(rows.map((r) => r.msisdn), first7)} · ${audits.length} enqueued row(s) ${json(p)}`];
    });

    /* E4 · an unusable number */
    await claim(L.e4, async () => {
      const id = await typedCampaign(w, "e4", tagF("e4"), 8);
      const end = await drive(impl, w, id);
      const rows = rowsOf(id);
      const fin = lastOf(end.results);
      const p = payloadOf(await auditRows(ENQ.CAMPAIGN_ENQUEUED_ACTION, id));
      const keys = rows.map((r) => r.msisdn);
      return [end.threw === 0 && rows.length === 6 && !E4_UNUSABLE.some((k) => keys.includes(k)) && keys.every((k) => parseTzNumber(k).msisdn === k)
        && fin?.kind === "done" && fin.unusable === 2 && p.unusable === 2 && p.rows === 6,
        `[${end.results.map(said).join(", ")}] threw ${end.threw} · ${rows.length} rows · audit ${json(p)}`];
    });

    /* E6 · a Pause between steps; every other status; a Pause between the write and the cursor */
    await claim(L.e6, async () => {
      const id = await typedCampaign(w, "e6", tagF("e1"), 5000);
      const r1 = await stepOf(impl, w, id);
      const cursor1 = campaignOf(id)?.enqueueCursor ?? null;
      await officerPause(id);
      const r2 = await stepOf(impl, w, id);
      const paused = r1.kind === "wrote" && r2.kind === "not_preparing" && r2.status === "PAUSED" && rowsOf(id).length === 1000
        && campaignOf(id)?.enqueueCursor === cursor1 && (await auditRows(ENQ.CAMPAIGN_ENQUEUED_ACTION, id)).length === 0;
      // every other status answers with its own and writes nothing
      const draft = await draftOf(w, "e6d", AUD.contactAudienceKey(tagF("e3")));
      const confirmed = await draftOf(w, "e6c", AUD.contactAudienceKey(tagF("e3")));
      await confirmOnly(confirmed, { count: 8, tier: "TYPED", watermark: null });
      const cancelled = await typedCampaign(w, "e6x", tagF("e3"), 8);
      await moveTo(cancelled, ["PREPARING"], "CANCELLED", { finishedAt: new Date().toISOString(), stopReason: "officer_stopped" });
      const running = await typedCampaign(w, "e6r", tagF("e3"), 8);
      await drive(impl, w, running);
      const statuses: string[] = [];
      for (const [cid, rowsWas] of [[draft, 0], [confirmed, 0], [cancelled, 0], [running, 8]] as const) {
        const r = await stepOf(impl, w, cid);
        statuses.push(r.kind === "not_preparing" && rowsOf(cid).length === rowsWas ? r.status : `${said(r)} (${rowsOf(cid).length} rows)`);
      }
      const others = json(statuses) === json(["DRAFT", "CONFIRMED", "CANCELLED", "RUNNING"]);
      // a Pause landing BETWEEN a chunk's write and its cursor
      const id3 = await typedCampaign(w, "e6b", tagF("e1"), 5000);
      await stepOf(impl, w, id3);
      const cursorBefore = campaignOf(id3)?.enqueueCursor ?? null;
      const r3 = await stepOf(impl, w, id3, pauseBetween({ armed: true }));
      const rows3 = rowsOf(id3).length;
      const cursor3 = campaignOf(id3)?.enqueueCursor ?? null;
      await resumeEnqueue(id3);
      const r4 = await stepOf(impl, w, id3);
      const between = r3.kind === "not_preparing" && r3.status === "PAUSED" && rows3 === 2000 && cursor3 === cursorBefore
        && r4.kind === "wrote" && r4.inserted === 0 && r4.duplicates === 1000 && rowsOf(id3).length === 2000 && r4.next !== cursorBefore;
      return [paused && others && between,
        `paused: ${said(r1)} then ${said(r2)}, ${rowsOf(id).length} rows, cursor kept ${campaignOf(id)?.enqueueCursor === cursor1} · others [${statuses.join(", ")}] · between: ${said(r3)} with ${rows3} rows, cursor kept ${cursor3 === cursorBefore}; resumed ${said(r4)}, ${rowsOf(id3).length} rows`];
    });

    /* E7 · ⭐ X9 — the rows are the confirmed count */
    await claim(L.e7, async () => {
      const f = await fencedCampaign(w, "e7", X9F);
      const end = await drive(impl, w, f.id);
      const rows = rowsOf(f.id);
      const held = rows.filter((r) => r.msisdn === HELD);
      const players = rows.filter((r) => r.contactId === null);
      const book = rows.filter((r) => r.contactId !== null && r.msisdn !== HELD);
      const fin = lastOf(end.results);
      const p = payloadOf(await auditRows(ENQ.CAMPAIGN_ENQUEUED_ACTION, f.id));
      return [f.count === 7 && f.tier === "typed" && rows.length === f.count && onceEach(rows) && fin?.kind === "done" && fin.overflow === 0
        && p.duplicates === 0 && end.results.every((r) => r.kind !== "wrote" || r.duplicates === 0)
        && held.length === 1 && held[0].contactId === "mc_e7_h" && held[0].userId === "pl_e7_3"
        && players.length === 2 && sameSet(players.map((r) => r.userId ?? ""), ["pl_e7_1", "pl_e7_2"])
        && book.length === 4 && book.every((r) => r.userId === null),
        `confirmed ${f.count} (${f.tier}) · [${end.results.map(said).join(", ")}] · ${rows.length} rows, the held number ×${held.length} (contact ${held[0]?.contactId ?? "none"}, account ${held[0]?.userId ?? "none"}), players ${players.length}, book ${book.length}`];
    });

    /* E8 · ⭐ E21 — ids sort in walk order */
    await claim(L.e8, async () => {
      const id = await typedCampaign(w, "e8", tagF("e25"), 2500);
      const end = await drive(impl, w, id);
      const ordered = rowsOf(id).sort(byId);
      const want = await walkKeys(tagF("e25"));
      const f = await fencedCampaign(w, "e8x", X9F);
      await drive(impl, w, f.id);
      const ordered2 = rowsOf(f.id).sort(byId);
      const want2 = await walkKeys(X9F);
      const all = [...ordered, ...ordered2];
      return [end.results.length === 3 && json(ordered.map((r) => r.msisdn)) === json(want) && json(ordered2.map((r) => r.msisdn)) === json(want2)
        && all.every((r) => RCP_ID.test(r.id)),
        `${end.results.length} steps · e25 in walk order ${json(ordered.map((r) => r.msisdn)) === json(want)} · book ∪ players ${json(ordered2.map((r) => r.msisdn)) === json(want2)} · ids rcp_+hex ${all.every((r) => RCP_ID.test(r.id))}`];
    });

    /* E9 · ⭐ an unreadable stored audience */
    await claim(L.e9, async () => {
      const checks: string[] = [];
      const pausedUnreadable = async (id: string, r: EnqueueStepResult | null): Promise<boolean> => {
        const cmp = campaignOf(id);
        const rows = await auditRows(ENQ.CAMPAIGN_PAUSED_ACTION, id);
        const good = r !== null && r.kind === "paused" && r.reason === "audience_unreadable" && cmp?.status === "PAUSED"
          && cmp.stopReason === "audience_unreadable" && cmp.pausedAt !== null && rowsOf(id).length === 0
          && rows.length === 1 && rows[0].category === "SYSTEM" && rows[0].actorId === null && rows[0].targetType === "SmsCampaign"
          && json(rows[0].payload) === json({ reason: "audience_unreadable" })
          && (await auditRows(ENQ.CAMPAIGN_ENQUEUED_ACTION, id)).length === 0;
        checks.push(`${said(r)}/${cmp?.status}/${rows.length} row(s): ${good}`);
        return good;
      };
      const tryStep = async (id: string, over: Partial<EnqueueDeps> = {}): Promise<EnqueueStepResult | null> => {
        try { return await stepOf(impl, w, id, over); } catch { return null; }
      };
      // (a) a filter the campaign's door refuses — the walk is never asked
      const a = await typedCampaign(w, "e9a", '{"bogus":true}', 3);
      const n = { walks: 0 };
      const okA = (await pausedUnreadable(a, await tryStep(a, countingWalk(n)))) && n.walks === 0;
      // (b) a stored tier this code does not know
      const b = await typedCampaign(w, "e9b", tagF("e3"), 8);
      (mem().smsCampaigns.get(b) as unknown as Record<string, unknown>).confirmTier = "LISTED";
      const okB = await pausedUnreadable(b, await tryStep(b));
      // (c) a listed confirmation without its members key
      const tagC = `e9c-r${w.run}`;
      for (let i = 0; i < 3; i++) await addContact(`mc_e9c_r${w.run}_${i}`, keyOf("76", 5_000_000 + w.run * 10 + i), [tagC]);
      const fc = await fencedCampaign(w, "e9c", tagF(tagC));
      (mem().smsCampaigns.get(fc.id) as unknown as Record<string, unknown>).audienceWatermark = null;
      const okC = fc.tier === "enumerate" && (await pausedUnreadable(fc.id, await tryStep(fc.id)));
      // (d) a stored cursor the walk refuses: a player cursor on an audience with no player accounts
      const d = await typedCampaign(w, "e9d", tagF("e3"), 8);
      const at = new Date().toISOString();
      await db.smsCampaign.transition(d, { from: ["PREPARING"], to: null, patch: { enqueueCursor: "p:pl_nobody" }, draftRevision: null, at });
      const okD = await pausedUnreadable(d, await tryStep(d));
      // (e) the control — a walk whose READ fails throws, and nothing is paused
      const e = await typedCampaign(w, "e9e", tagF("e3"), 8);
      let threwE = false;
      try {
        await stepOf(impl, w, e, { walk: async () => { throw new Error("connection reset by peer"); } });
      } catch {
        threwE = true;
      }
      const okE = threwE && campaignOf(e)?.status === "PREPARING" && (await auditRows(ENQ.CAMPAIGN_PAUSED_ACTION, e)).length === 0;
      const sentence = CS.stopReasonLabel("audience_unreadable") === UNREADABLE_SENTENCE;
      return [okA && okB && okC && okD && okE && sentence,
        `[${checks.join(" | ")}] · walks ${n.walks} · the failed read threw ${threwE}, still ${campaignOf(e)?.status} · sentence ${sentence}`];
    });

    /* E10 · ⭐ a listed confirmation */
    await claim(L.e10, async () => {
      const make = async (slot: string, n: number): Promise<{ tag: string; ids: string[] }> => {
        const tag = `e10${slot}-r${w.run}`;
        const ids: string[] = [];
        for (let i = 0; i < n; i++) {
          const cid = `mc_e10${slot}_r${w.run}_${i}`;
          await addContact(cid, keyOf("76", 6_000_000 + w.run * 100 + slot.charCodeAt(0) - 96 + i * 10), [tag]);
          ids.push(cid);
        }
        return { tag, ids };
      };
      const untag = (cid: string): void => {
        const row = mem().marketingContacts.get(cid);
        if (!row) throw new Error("fixture: no such contact to untag");
        row.tags = [];
      };
      const movedRow = async (id: string): Promise<boolean> => {
        const rows = await auditRows(ENQ.CAMPAIGN_PAUSED_ACTION, id);
        const cmp = campaignOf(id);
        return cmp?.status === "PAUSED" && cmp.stopReason === "audience_moved" && rowsOf(id).length === 0 && rows.length === 1
          && rows[0].category === "SYSTEM" && rows[0].actorId === null && json(rows[0].payload) === json({ reason: "audience_moved" });
      };
      // (a) the same three people
      const A = await make("a", 3);
      const fa = await fencedCampaign(w, "e10a", tagF(A.tag));
      const ra = await stepOf(impl, w, fa.id);
      const okA = fa.tier === "enumerate" && ra.kind === "done" && ra.total === 3 && ra.overflow === 0
        && sameSet(rowsOf(fa.id).map((r) => r.msisdn), await walkKeys(tagF(A.tag))) && campaignOf(fa.id)?.status === "RUNNING";
      // (b) one person swapped — still three
      const B = await make("b", 3);
      const fb = await fencedCampaign(w, "e10b", tagF(B.tag));
      untag(B.ids[1]);
      await addContact(`mc_e10b_r${w.run}_9`, keyOf("76", 6_500_000 + w.run), [B.tag]);
      const rb = await stepOf(impl, w, fb.id);
      const okB = fb.tier === "enumerate" && rb.kind === "paused" && rb.reason === "audience_moved" && (await movedRow(fb.id));
      // (c) one person gone
      const C = await make("c", 3);
      const fc = await fencedCampaign(w, "e10c", tagF(C.tag));
      untag(C.ids[2]);
      const rc = await stepOf(impl, w, fc.id);
      const okC = rc.kind === "paused" && rc.reason === "audience_moved" && (await movedRow(fc.id));
      // (d) a newcomer after the three
      const D = await make("d", 3);
      const fd = await fencedCampaign(w, "e10d", tagF(D.tag));
      await addContact(`mc_e10d_r${w.run}_9`, keyOf("76", 6_600_000 + w.run), [D.tag]);
      const rd = await stepOf(impl, w, fd.id);
      const okD = rd.kind === "done" && rd.overflow === 1 && rd.total === 3 && sameSet(rowsOf(fd.id).map((r) => r.contactId ?? ""), D.ids);
      const sentence = CS.stopReasonLabel("audience_moved") === MOVED_SENTENCE;
      return [okA && okB && okC && okD && sentence,
        `same: ${said(ra)} · swapped: ${said(rb)} · gone: ${said(rc)} · newcomer: ${said(rd)} · sentence ${sentence}`];
    });

    /* E11 · the backstop */
    await claim(L.e11, async () => {
      const id = await typedCampaign(w, "e11", tagF("e3"), 250_000);
      const FAKE = 199_995;
      const base = ENQ.ENQUEUE_DEPS;
      const over: Partial<EnqueueDeps> = {
        recipients: {
          createMany: base.recipients.createMany,
          countByStatus: async (cid) => (await base.recipients.countByStatus(cid)).map((c) => (c.status === "PENDING" ? { ...c, count: c.count + FAKE } : c)),
        },
      };
      const end = await drive(impl, w, id, over);
      const fin = lastOf(end.results);
      const p = payloadOf(await auditRows(ENQ.CAMPAIGN_ENQUEUED_ACTION, id));
      const first5 = (await walkKeys(tagF("e3"))).slice(0, 5);
      const id2 = await typedCampaign(w, "e11c", tagF("e3"), 7);
      const end2 = await drive(impl, w, id2);
      const p2 = payloadOf(await auditRows(ENQ.CAMPAIGN_ENQUEUED_ACTION, id2));
      return [fin?.kind === "done" && fin.total === 200_000 && fin.overflow === 3 && p.backstop === true && p.rows === 200_000
        && sameSet(rowsOf(id).map((r) => r.msisdn), first5) && lastOf(end2.results)?.kind === "done" && p2.backstop === false,
        `[${end.results.map(said).join(", ")}] · audit ${json(p)} · real rows ${rowsOf(id).length} · the control's backstop ${String(p2.backstop)}`];
    });

    /* E5 · ⭐ no token is minted, and the module reaches no mint and no send */
    await claim(L.e5, async () => {
      const rows = [...w.ids].flatMap((id) => rowsOf(id));
      const tokens = mem().optOutTokens.size - tokensBefore;
      const reached = importWalk(ENQ_REL, impl.sources);
      const forbidden = ["src/lib/server/marketing/optout-service.ts", "src/lib/server/marketing/dispatch.ts", "src/lib/server/marketing/campaign-test-send.ts"]
        .filter((f) => reached.has(f));
      const e = impl.sources.enqueue;
      const SEND_OR_MINT = ["sendBatch", "blackballSend", "dispatchSlice", "sendCampaignTest", "ensureOptOutToken", "mintOptOutToken", "marketingOptOutToken"];
      const named = SEND_OR_MINT.filter((n) => e.includes(n));
      const smsImport = new RegExp('from[ ]*"@/lib/server/sms(-blackball)?"').test(e);
      const tokenKeys = e.split("optOutToken:").length - 1;
      const tokenNulls = e.split("optOutToken: null").length - 1;
      return [rows.length > 10_000 && tokens === 0 && rows.every((r) => r.optOutToken === null)
        && reached.size > 20 && forbidden.length === 0 && named.length === 0 && !smsImport && tokenKeys >= 1 && tokenKeys === tokenNulls,
        `${rows.length} rows, ${rows.filter((r) => r.optOutToken !== null).length} with a token · token table +${tokens} · ${reached.size} files reached, forbidden [${forbidden.join(", ")}] · named [${named.join(", ")}] · sms import ${smsImport} · optOutToken written ${tokenKeys}×, null ${tokenNulls}×`];
    });

    /* E12 · ⛔ no phone number */
    await claim(L.e12, async () => {
      await auditFlush();
      const payloads = getAuditPage({ limit: 10_000 }).filter((e) => e.targetId !== null && w.ids.has(e.targetId)).map((e) => e.payload ?? null);
      const text = json([w.results, w.errors, payloads]);
      return [!RAW_KEY.test(text) && !PLUS_KEY.test(text) && w.results.length > 20 && payloads.length > 10,
        `${w.results.length} results, ${w.errors.length} errors, ${payloads.length} audit payloads · a 255 key ${RAW_KEY.test(text)} · a +255 number ${PLUS_KEY.test(text)}`];
    });

    /* E13 · the wiring */
    await claim(L.e13, async () => {
      const s = impl.shipped;
      const id = s.newId();
      const e = impl.sources.enqueue;
      const DOOR = new RegExp("db[.]([A-Za-z]+)[.]([A-Za-z]+)[(]", "g");
      const doors = [...new Set([...e.matchAll(DOOR)].map((m) => `${m[1]}.${m[2]}`))].sort();
      const WORD = new RegExp("(^|[^A-Za-z0-9_$])enqueueStep([^A-Za-z0-9_$]|$)");
      const callers = [...impl.sources.src]
        .filter(([rel, text]) => rel !== ENQ_REL && (WORD.test(text) || reachesEnqueue(rel, text)))
        .map(([rel]) => rel).sort();
      // The detector's own control: it sees a value import from another directory, and lets a type-only one pass.
      const detector = reachesEnqueue("src/app/x/client.tsx", 'import { ENQUEUE_CHUNK } from "@/lib/server/marketing/enqueue";')
        && reachesEnqueue("src/lib/server/marketing/x.ts", 'export { enqueueStep } from "./enqueue";')
        && !reachesEnqueue("src/app/x/view.ts", 'import type { EnqueueStepResult } from "@/lib/server/marketing/enqueue";');
      let scripts: Record<string, string> = {};
      try { scripts = (JSON.parse(impl.sources.pkg) as { scripts?: Record<string, string> }).scripts ?? {}; } catch { scripts = {}; }
      const chain = (scripts.predeploy ?? "").split(" && ");
      const wiring = {
        walk: s.walk === AUD.walkCampaignAudience, key: s.membersKeyOf === FEN.membersKeyOf, audit: s.audit === audit,
        frozen: Object.isFrozen(s) && Object.isFrozen(s.campaigns) && Object.isFrozen(s.recipients),
        ids: RCP_ID.test(id),
        doors: json(doors) === json(["smsCampaign.find", "smsCampaign.transition", "smsCampaignRecipient.countByStatus", "smsCampaignRecipient.createMany"]),
        callers: detector && json(callers) === json([...ENQUEUE_CALLERS].sort()),
        scripts: scripts["test:marketing-engine"] === "tsx scripts/marketing-engine.test.mts"
          && scripts["red:marketing-engine"] === "tsx scripts/marketing-engine.test.mts --prove-red"
          && chain.filter((x) => x === "npm run test:marketing-engine").length === 1
          && chain.indexOf("npm run test:marketing-engine") === chain.indexOf("npm run test:campaign-gates") + 1
          && chain.indexOf("npm run test:campaign-gates") > 0,
      };
      return [Object.values(wiring).every(Boolean), `${json(wiring)} · doors [${doors.join(", ")}] · callers [${callers.join(", ")}]`];
    });
  }

  /* ══ THE PLANTS — each a defect this unit could really ship, planted in memory ════════════════════════════════════ */

  const withFinish = (f: (d: EnqueueDeps) => EnqueueDeps): Impl => ({ ...REAL, finish: f });
  const withSources = (patch: Partial<Sources>): Impl => ({ ...REAL, sources: { ...REAL_SOURCES, ...patch } });
  /** A source with one anchor replaced. ⛔ An anchor that is not there THROWS, so a plant can never pass as caught unchanged. */
  const plantIn = (src: string, from: string, to: string): string => {
    if (!src.includes(from)) throw new Error(`plant anchor not found: ${from.slice(0, 60)}`);
    return src.replace(from, to);
  };
  /** What the seed door would answer for these seeds now — so a held-back write reports what the real one would. */
  const predicted = (seeds: readonly SmsCampaignRecipientSeed[]): { inserted: number; duplicates: number } => {
    const held = new Set([...mem().smsCampaignRecipients.values()].map((r) => `${r.campaignId}|${r.msisdn}`));
    let inserted = 0;
    for (const s of seeds) {
      const k = `${s.campaignId}|${s.msisdn}`;
      if (!held.has(k)) { held.add(k); inserted++; }
    }
    return { inserted, duplicates: seeds.length - inserted };
  };
  const rowFromSeed = (s: SmsCampaignRecipientSeed): StoredSmsCampaignRecipient => ({
    id: s.id, campaignId: s.campaignId, msisdn: s.msisdn, contactId: s.contactId, userId: s.userId, status: "PENDING", smsReference: null,
    optOutToken: s.optOutToken, locale: null, failureClass: null, error: null, skipReason: null, skipDetail: null, claimToken: null,
    claimedAt: null, attempts: 0, segments: null, bodyLen: null, costTzs: null, gateTrail: null, createdAt: s.createdAt,
    updatedAt: s.createdAt, sentAt: null, deliveredAt: null, failedAt: null,
  });
  /** R-E8's ids: counting DOWN, so a later seed sorts first — across every step of the run. */
  let downward = 10 ** 15;

  const plants = (): Plant[] => [
    {
      name: "R-E1 (the spec's) · the cursor advanced before createMany — a step's seeds reach the store only after its cursor moved",
      expect: [L.e1, L.e1b],
      run: () => runE(withFinish((d) => {
        let held: SmsCampaignRecipientSeed[] | null = null;
        const flush = async (): Promise<void> => {
          if (held === null) return;
          const s = held;
          held = null;
          await d.recipients.createMany(s);
        };
        return {
          ...d,
          campaigns: {
            find: async (id) => { await flush(); return d.campaigns.find(id); },
            transition: async (id, t) => { const r = await d.campaigns.transition(id, t); await flush(); return r; },
          },
          recipients: {
            createMany: async (seeds) => { await flush(); held = seeds; return predicted(seeds); },
            countByStatus: async (id) => { await flush(); return d.recipients.countByStatus(id); },
          },
        };
      })),
    },
    {
      name: "R-E1b (the spec's) · skipDuplicates removed — a recipient door that writes a person already on the campaign again",
      expect: [L.e1, L.e1b, L.e2, L.e6],
      run: () => runE(withFinish((d) => ({
        ...d,
        recipients: {
          ...d.recipients,
          createMany: async (seeds) => {
            const r = await d.recipients.createMany(seeds);
            let added = 0;
            for (const s of seeds) {
              if (mem().smsCampaignRecipients.has(s.id)) continue;
              mem().smsCampaignRecipients.set(s.id, rowFromSeed(s));
              added++;
            }
            return { inserted: r.inserted + added, duplicates: 0 };
          },
        },
      }))),
    },
    {
      name: "R-E3 (the spec's) · the cap removed — a typed confirmation read with no ceiling",
      expect: [L.e1b, L.e3],
      run: () => runE(withFinish((d) => ({
        ...d,
        campaigns: {
          ...d.campaigns,
          find: async (id) => { const r = await d.campaigns.find(id); return r !== null && r.confirmTier === "TYPED" ? { ...r, audienceCount: 10_000_000 } : r; },
        },
      }))),
    },
    {
      name: "R-E3b · the cap spent by people walked, not rows added (§4.9's sentence read literally) — a page walked again after an interruption ends the enqueue early",
      expect: [L.e1b],
      run: () => runE(withFinish((d) => {
        let phantom = 0;
        return {
          ...d,
          recipients: {
            createMany: async (seeds) => { const r = await d.recipients.createMany(seeds); phantom += r.duplicates; return r; },
            countByStatus: async (id) => {
              const c = await d.recipients.countByStatus(id);
              return phantom === 0 ? c : c.map((x) => (x.status === "PENDING" ? { ...x, count: x.count + phantom } : x));
            },
          },
        };
      })),
    },
    {
      name: "R-E4 (the spec's) · a bad key seeded — the walk's unusable numbers handed to the seed door under their own keys (the batch refused whole)",
      expect: [L.e4],
      run: () => runE(withFinish((d) => {
        let page: CampaignAudienceRow[] = [];
        return {
          ...d,
          walk: async (f, c, l, wd) => { const p = await d.walk(f, c, l, wd); page = p.rows; return p; },
          recipients: {
            ...d.recipients,
            createMany: async (seeds) => {
              const first = seeds[0];
              const bad: SmsCampaignRecipientSeed[] = first === undefined ? [] : page
                .filter((r) => parseTzNumber(r.msisdn).msisdn === null)
                .map((r) => ({
                  id: d.newId(), campaignId: first.campaignId, msisdn: r.msisdn, contactId: r.kind === "contact" ? r.contactId : null,
                  userId: r.kind === "contact" ? r.linkedUserId : r.userId, optOutToken: null, createdAt: first.createdAt,
                }));
              return d.recipients.createMany([...seeds, ...bad]);
            },
          },
        };
      })),
    },
    {
      name: "R-E5 (the spec's) · a token minted per seed — every seed carries one, the batch's first through the real mint",
      expect: [L.e5],
      run: () => runE(withFinish((d) => ({
        ...d,
        recipients: {
          ...d.recipients,
          createMany: async (seeds) => {
            const minted: SmsCampaignRecipientSeed[] = [];
            for (const [i, s] of seeds.entries()) {
              minted.push({ ...s, optOutToken: i === 0 ? await ensureOptOutToken(s.msisdn) : `tok_planted_${s.id}` });
            }
            return d.recipients.createMany(minted);
          },
        },
      }))),
    },
    {
      name: "R-E5b · enqueue.ts imports the token mint",
      expect: [L.e5],
      run: () => runE(withSources({ enqueue: `import { ensureOptOutToken } from "@/lib/server/marketing/optout-service";${NL}${REAL_SOURCES.enqueue}${NL}void ensureOptOutToken;` })),
    },
    {
      name: "R-E6 · a paused campaign still enqueued — the step reads PAUSED as PREPARING",
      expect: [L.e6],
      run: () => runE(withFinish((d) => ({
        ...d,
        campaigns: {
          ...d.campaigns,
          find: async (id) => { const r = await d.campaigns.find(id); return r !== null && r.status === "PAUSED" ? { ...r, status: "PREPARING" } : r; },
        },
      }))),
    },
    {
      name: "R-E7 · the player phase without the book's check — a book-held player walked a second time",
      expect: [L.e7],
      run: () => runE(withFinish((d) => ({
        ...d,
        walk: (f, c, l) => d.walk(f, c, l, { ...AUD.CAMPAIGN_WALK_DEPS, inBook: async () => [] }),
      }))),
    },
    {
      name: "R-E8 · ids minted against the walk order (counting down)",
      expect: [L.e8],
      run: () => runE(withFinish((d) => ({ ...d, newId: () => `rcp_${String(downward--).padStart(32, "0")}` }))),
    },
    {
      name: "R-E9 · a stored cursor the walk refuses read as done — the list finished over people it never walked",
      expect: [L.e9],
      run: () => runE(withFinish((d) => ({
        ...d,
        walk: async (f, c, l, wd) => {
          try {
            return await d.walk(f, c, l, wd);
          } catch (err) {
            if (ENQ.walkRefusedStored(err)) return { rows: [], next: "done" };
            throw err;
          }
        },
      }))),
    },
    {
      name: "R-E10 · the members key re-derived without the confirmed row's scope (the U40a review's MAJOR shape) — every listed confirmation reads as moved",
      expect: [L.e10],
      run: () => runE(withFinish((d) => ({ ...d, membersKeyOf: (_scope, canonical) => FEN.membersKeyOf({ campaignId: "", draftRevision: 0 }, canonical) }))),
    },
    {
      name: "R-E10b · the listed check skipped — the stored key handed back for whoever is walked",
      expect: [L.e10],
      run: () => runE(withFinish((d) => ({ ...d, membersKeyOf: (scope) => mem().smsCampaigns.get(scope.campaignId)?.audienceWatermark ?? "" }))),
    },
    {
      name: "R-E12 · a step's answer names a person's number",
      expect: [L.e12],
      run: () => runE({ ...REAL, step: async (id, deps) => ({ ...(await ENQ.enqueueStep(id, deps)), sample: keyOf("74", 1_000_000) }) as EnqueueStepResult }),
    },
    {
      name: "R-E13 · the shipped dependencies walk through a stand-in, not THE ONE walk",
      expect: [L.e13],
      run: () => runE({ ...REAL, shipped: { ...ENQ.ENQUEUE_DEPS, walk: (f, c, l, d) => AUD.walkCampaignAudience(f, c, l, d) } }),
    },
    {
      name: "R-E13b · a second caller of enqueueStep (an action calls it before U47b declares itself)",
      expect: [L.e13],
      run: () => runE(withSources({ src: new Map([...REAL_SOURCES.src, ["src/app/admin/campaigns/[id]/actions.ts", "export const step = enqueueStep;"]]) })),
    },
    {
      name: "R-E13d · a client component value-imports the enqueue module (ENQUEUE_CHUNK — enqueueStep never named)",
      expect: [L.e13],
      run: () => runE(withSources({ src: new Map([...REAL_SOURCES.src, ["src/app/admin/campaigns/[id]/live-client.tsx",
        `"use client";${NL}import { ENQUEUE_CHUNK } from "@/lib/server/marketing/enqueue";${NL}export const chunk = ENQUEUE_CHUNK;`]]) })),
    },
    {
      name: "R-E13c · the suite drops out of predeploy",
      expect: [L.e13],
      run: () => runE(withSources({ pkg: plantIn(REAL_SOURCES.pkg, "npm run test:marketing-engine && ", "") })),
    },
  ];

  return { name: "§E · U42 · the enqueue", run: () => runE(REAL), plants };
})();
SECTIONS.push(SECTION_E);

/* ══ THE RUN ═════════════════════════════════════════════════════════════════════════════════════════════════════════ */

if (!PROVE_RED) {
  for (const s of SECTIONS) {
    console.log(`${NL}── ${s.name} ──`);
    await s.run();
  }
  console.log(`${NL}marketing-engine: ${pass} passed, ${fail} failed`);
  process.exitCode = fail === 0 ? 0 : 1;
} else {
  /* ── THE BASELINE — a plant can only "hold" against claims the real code PASSES ── */
  await silently(async () => { for (const s of SECTIONS) await s.run(); });
  if (fail > 0) {
    console.log(`RED CONTROL — NOT RUN: the baseline is not green (${fail} claim(s) fail for the REAL code):${NL}  ${failed.join(`${NL}  `)}`);
    process.exit(1);
  }
  console.log(`RED CONTROL — baseline green (${pass} claims pass for the real code)${NL}`);
  console.log(`RED CONTROL — each defect planted in memory must fail EXACTLY the claims it names${NL}`);
  let held = 0;
  let total = 0;
  const missed: string[] = [];
  for (const s of SECTIONS) {
    console.log(`── ${s.name} ──`);
    for (const plant of s.plants()) {
      total++;
      resetCounts();
      await silently(plant.run);
      const got = [...new Set(failed)].sort();
      const want = [...new Set<string>(plant.expect)].sort();
      if (json(got) === json(want)) {
        held++;
        console.log(`  held  ${plant.name}`);
      } else {
        missed.push(plant.name);
        const extra = got.filter((x) => !want.includes(x));
        const absent = want.filter((x) => !got.includes(x));
        console.log(`  FAIL  ${plant.name}${absent.length ? `${NL}        did not fail: ${absent.map((x) => x.slice(0, 70)).join(" | ")}` : ""}${extra.length ? `${NL}        also failed: ${extra.map((x) => x.slice(0, 70)).join(" | ")}` : ""}`);
      }
    }
  }
  console.log(`${NL}RED CONTROL — ${held} of ${total} proofs held${missed.length ? `; ${missed.length} FAILED` : ""}`);
  process.exitCode = missed.length === 0 ? 0 : 1;
}
