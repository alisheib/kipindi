/**
 * The fixture world for `test:marketing-preflight` (spec `docs/marketing-specs/ENGINE-SPEC.md` §4.18) — a stand-in database, a
 * stand-in network and the rows they answer with, so the two live tools run END TO END with no database and no network:
 *   · `fakePrisma` answers each SELECT by the tag comment it opens with (`u52a:<tag>`) from a plain-object world, and RECORDS
 *     every statement, so the suite can hold the first one to `SET TRANSACTION READ ONLY` and the rest to SELECT;
 *   · it also records WHAT each tool asked: every statement's tag and the VALUES it was bound to (`checkBinds` holds them to the right
 *     key and the right campaign — the stand-in answers whatever it is asked, so this is where a wrong key would show), the options
 *     each transaction was opened with, every network call (verb and address) and every write to the ledger file;
 *   · `fakeFetch` answers the public home page and `/api/health` (or fails, or never answers);
 *   · `goodPreWorld` / `goodEvWorld` are worlds in which everything is right — a claim bends ONE thing and names what turns red.
 * ⛔ Every number here is a made-up Tanzanian mobile number (the numbering plan accepts it; no person holds it). Every "database
 * address" is fake. Nothing here touches a real database, a real network or a real file.
 * ⛔ This file holds no backslash (an editing tool decodes them): patterns are built from character classes and codes.
 */
const LIB = await import("./marketing-u52a.mjs");
const PRE = await import("../live/marketing-preflight.mjs");
const EV = await import("../live/marketing-campaign-evidence.mjs");

/* ══ THE PEOPLE AND THE CLOCK ════════════════════════════════════════════════════════════════════════════════════════ */

/** The repo's mask is the dial code, four dots and the last two digits. */
const DOTS = String.fromCharCode(0x2022).repeat(4);
/** Typed the way an officer types it — spaces and a trunk zero — and the bare key the platform stores. */
export const TEST = { raw: "0755 000 111", key: "255755000111", masked: `+255${DOTS}11` } as const;
export const CONTROL = { raw: "+255 622 000 222", key: "255622000222", masked: `+255${DOTS}22` } as const;
export const OTHER_KEY = "255688000333";
export const ORIGIN = "https://prod.example.test";
export const FAKE_DB_URL = "postgresql://u52a_user:Sup3rS3cretPw-XYZ@db-host-u52a.example.internal:5432/railway";
export const DB_PIECES = [FAKE_DB_URL, "Sup3rS3cretPw-XYZ", "db-host-u52a.example.internal", "u52a_user"] as const;
/** 10:30 EAT on 9 October 2026 — inside the default 08:00–20:00 window. */
export const NOW = Date.parse("2026-10-09T07:30:00.000Z");
export const T0 = Date.parse("2026-10-09T07:01:00.000Z");
export const CAMPAIGN = "cmp_u52a_campaign_AAAA";
export const BUILD = "3f2a9c1d04ab7e6f5d4c3b2a190807f6e5d4c3b2";
export const RESUME_WORDING = LIB.resumeWording();
export const SMS_WORDING = RESUME_WORDING;
/** A ledger file that EXISTS with nothing counted — a drive after its first evidence run. (A MISSING file is NO-GO unless `--new-ledger`.) */
export const EMPTY_LEDGER_TEXT: string = LIB.serializeLedger(LIB.emptyLedger());
/**
 * The saved wordings of a platform ready for the drive: a source line and the typed-number test's 18+ sentence, each saved once.
 * (The pre-flight's `source` row still reads both. Since the owner's ruling of 2026-10-09 no message prints the source line and
 * nothing is refused without one, and a typed-number test is for ADMIN and COMPLIANCE only — never the drive's GROWTH login.)
 */
export const SAVED_WORDINGS: Record<string, unknown> = {
  "source.phrase": [{ v: 1, text: "From the 50pick sign-up form", savedAt: "2026-10-07T08:00:00.000Z", savedBy: "ops: Claude for Ali (G5)" }],
  "adult.test": [{ v: 1, text: "I confirm that the person who uses this number is 18 or older.", savedAt: "2026-10-07T08:00:00.000Z", savedBy: "usr_owner_0001" }],
};

/**
 * ⭐ THE DRIVE'S MESSAGE — the owner's words of 2026-10-09 for every real SMS of the drive, read from its ONE copy through the core
 * (`marketing-u52a-message.mjs`), never typed here. Every message row this world makes is as long as a contact-book number is sent
 * it — the Swahili body with the draft's word for `{jina}`, nothing after it — so the evidence's SENT AS WRITTEN check reads the
 * fixtures as a clean drive; a claim that wants a footer back makes its row longer itself.
 */
export const DRIVE_MESSAGE = LIB.DRIVE_MESSAGE;
export const DRIVE_LENGTH = LIB.driveLengthWindows();

type Row = Record<string, unknown>;
const d = (ms: number): Date => new Date(ms);

/* ══ THE PRE-FLIGHT WORLD ════════════════════════════════════════════════════════════════════════════════════════════ */

export type PreWorld = {
  now: number;
  migrations: Array<{ name: string; finished: boolean; rolled: boolean }>;
  config: Record<string, unknown>;
  contact: Row | null;
  lists: Array<Row & { basis: Row | null }>;
  suppressions: Row[];
  latest: Row | null;
  user: Row | null;
  holds: Row[];
  /** The campaigns that could send now (CONFIRMED, PREPARING, RUNNING, PAUSED): { id, status }. */
  inFlight: Row[];
  /** The MARKETING messages of the last day to a number but the test number (the count the database answers); null = no answer. */
  elsewhere: number | null;
  control: { suppressions: Row[] } | null;
  health: Row | null;
  healthStatus: number;
  healthMode: "ok" | "throws" | "hangs" | "html";
  home: string | null;
  /** The preload `Link` header the home page answers with, if any. */
  homeLink: string | null;
  homeMode: "ok" | "throws";
  ledgerText: string | null;
};

export function goodHealth(over: Row = {}): Row {
  return {
    ok: true,
    database: { reachable: true, migrated: true },
    sms: { provider: "blackball", configured: true, webhookSecretSet: true, balanceTzs: 50_000, balanceStale: false, ...((over.sms as Row) ?? {}) },
    ...Object.fromEntries(Object.entries(over).filter(([k]) => k !== "sms")),
  };
}

/** A world in which every row is GO: an account holds the test number, consented under an SMS-naming sentence, adult, active. */
export function goodPreWorld(): PreWorld {
  return {
    now: NOW,
    migrations: LIB.ENGINE_MIGRATIONS.map((name: string) => ({ name, finished: true, rolled: false })),
    config: { [LIB.KEY_WORDINGS as string]: SAVED_WORDINGS },
    contact: { id: "ct_test_0001", consent_state: "GIVEN", suppressed: false, linked: true, source: "REGISTRATION", erased: false, created_at: d(NOW - 9 * 86400_000) },
    lists: [{ list_id: "lst_u52a_0001", list_name: "U52a drive list", added_at: d(NOW - 86400_000), members: 1, basis: null }],
    suppressions: [],
    latest: { status: "GIVEN", source: "PROFILE", wording: SMS_WORDING, recorded_by_officer: false, via_link: false, created_at: d(NOW - 5 * 86400_000) },
    user: { role: "PLAYER", status: "ACTIVE", opt_in: true, dob: d(Date.parse("1990-01-01T00:00:00Z")) },
    holds: [],
    inFlight: [],
    elsewhere: 0,
    control: null,
    health: goodHealth(),
    healthStatus: 200,
    healthMode: "ok",
    home: `<html data-dpl-id="${BUILD}"><body>home</body></html>`,
    homeLink: null,
    homeMode: "ok",
    ledgerText: EMPTY_LEDGER_TEXT,
  };
}

/** A CONTACT world (no account holds the number): consent by an SMS-naming sentence, 18+ from a covering list basis. */
export function contactPreWorld(): PreWorld {
  const w = goodPreWorld();
  w.user = null;
  w.contact = { ...(w.contact as Row), linked: false, source: "IMPORT" };
  w.lists = [{ list_id: "lst_u52a_0001", list_name: "U52a drive list", added_at: d(NOW - 86400_000), members: 1, basis: { id: "lb_covering_basis_01", recorded_at: d(NOW - 3600_000), revoked: false } }];
  w.latest = { status: "GIVEN", source: "OPERATOR", wording: SMS_WORDING, recorded_by_officer: true, via_link: false, created_at: d(NOW - 5 * 86400_000) };
  return w;
}

export const RECORD_OPEN_OUTREACH = { state: "open", recordedBy: "usr_owner_0001", recordedAt: "2026-10-05T08:00:00.000Z" };
export function liveSwitchRow(minutesLeft: number, openedMinutesAgo = 5): Row {
  return {
    enabledBy: "ops",
    enabledAt: new Date(NOW - openedMinutesAgo * 60_000).toISOString(),
    closesAt: new Date(NOW + minutesLeft * 60_000).toISOString(),
  };
}

export type RunOpts = {
  argv?: string[];
  env?: Record<string, string | undefined>;
  lib?: Record<string, unknown>;
  judge?: unknown;
  parts?: unknown;
  readFacts?: unknown;
  render?: unknown;
  parseArgs?: unknown;
  timeoutMs?: number;
  prisma?: Row;
  fetchImpl?: (url: string, init?: FetchInit) => Promise<unknown>;
  /** A plant's wrapper around the stand-in network: it sits BETWEEN the tool and the recorder, so what it changes is what is recorded. */
  fetchWrap?: (f: (url: string, init?: FetchInit) => Promise<unknown>) => (url: string, init?: FetchInit) => Promise<unknown>;
  /** A plant's rewrite of the values a statement is BOUND to: the stand-in database records what it returns (and answers as before). */
  rebind?: (tag: string, values: unknown[]) => unknown[];
  ledgerText?: string | null;
  /** The stand-in ledger file refuses every write (a locked file, a full disk): the write throws. */
  ledgerWriteThrows?: boolean;
  /** A tool loaded from PLANTED source text (the red harness): it replaces the real module for this run. */
  tool?: Record<string, unknown>;
  now?: number;
  transactionMode?: string;
  throwOnQuery?: Error;
};
type FetchInit = { signal?: AbortSignal; method?: string };
export type Call = { tag: string; values: unknown[] };
/** What the bound values of one run should be: the numbers typed, the campaign named, the ids the world holds. */
export type BindCtx = { testKey: string | null; controlKey: string | null; campaignId: string | null; contactId: string | null; listIds: string[] };
export type RunResult = {
  code: number;
  lines: string[];
  statements: string[];
  ledgerText: string | null;
  /** Every tagged SELECT the tool ran, with the values it was bound to. */
  calls: Call[];
  /** The options each `$transaction` was opened with. */
  txOptions: unknown[];
  /** Every network call the tool made. */
  fetchCalls: Array<{ url: string; method: unknown }>;
  /** How many times the tool wrote the ledger file. */
  ledgerWrites: number;
  bindCtx: BindCtx;
};

/**
 * ⭐ THE BOUND VALUES, per tag: every statement is answered from the world whatever it was bound to, so a statement that asked for the
 * WRONG KEY (the number without its plus, another campaign) would be answered all the same. This holds each call to what it must
 * have asked for. Returns a problem per wrong call; numbers are never printed (digits become #).
 */
export function checkBinds(calls: Call[], c: BindCtx): string[] {
  const bad: string[] = [];
  const show = (v: unknown[]): string => JSON.stringify(v).split("").map((ch) => (ch >= "0" && ch <= "9" ? "#" : ch)).join("").slice(0, 80);
  const same = (a: unknown[], b: unknown[]): boolean => JSON.stringify(a) === JSON.stringify(b);
  const wants = (tag: string, values: unknown[], want: unknown[]): void => {
    if (!same(values, want)) bad.push(`${tag} was bound to ${show(values)}, wanted ${show(want)}`);
  };
  const people = [c.testKey, c.controlKey].filter((k): k is string => k !== null);
  for (const { tag, values } of calls) {
    switch (tag) {
      case "migrations": case "config": case "now": case "switch-audit": case "in-flight": wants(tag, values, []); break;
      case "contact": case "ledger": case "holds": case "elsewhere": wants(tag, values, [c.testKey]); break;
      case "lists": wants(tag, values, [c.contactId]); break;
      case "basis": if (!(values.length === 1 && c.listIds.includes(String(values[0])))) bad.push(`basis was bound to ${show(values)}, wanted one of the member lists' ids`); break;
      case "suppression": case "person-suppression": case "person-ledger": if (!(values.length === 1 && people.includes(String(values[0])))) bad.push(`${tag} was bound to ${show(values)}, wanted the test or the control number`); break;
      case "user": wants(tag, values, [`+${c.testKey}`]); break;
      // ⭐ the campaign read: the drive's four words (DRIVE'S MESSAGE compares the stored fields with them, in this order), then the id
      case "campaign": wants(tag, values, [DRIVE_MESSAGE.bodySw, DRIVE_MESSAGE.bodyEn, DRIVE_MESSAGE.nameFallbackSw, DRIVE_MESSAGE.nameFallbackEn, c.campaignId]); break;
      case "recipients": case "recipient-counts": case "message-counts": case "test-message-counts": case "audit": wants(tag, values, [c.campaignId]); break;
      case "recipient-named": if (!(values.length === 2 && values[0] === c.campaignId && people.includes(String(values[1])))) bad.push(`recipient-named was bound to ${show(values)}, wanted the campaign and a named number`); break;
      case "messages": case "test-messages": wants(tag, values, [c.testKey ?? "", c.campaignId]); break;
      case "token": wants(tag, values, [c.campaignId, c.testKey]); break;
      default: bad.push(`a statement tagged "${tag}" has no rule for its bound values`);
    }
  }
  // each named number is looked up exactly once by the reads that look a person up
  const timesBound = (tag: string, key: string | null): number => calls.filter((x) => x.tag === tag && key !== null && x.values[0] === key).length;
  for (const tag of ["suppression", "person-suppression", "person-ledger"]) {
    if (calls.some((x) => x.tag === tag)) {
      if (timesBound(tag, c.testKey) !== 1) bad.push(`${tag} looked the test number up ${timesBound(tag, c.testKey)} times, not once`);
      if (timesBound(tag, c.controlKey) !== (c.controlKey === null ? 0 : 1)) bad.push(`${tag} looked the control number up ${timesBound(tag, c.controlKey)} times`);
    }
  }
  return bad;
}

/** The bound values a run should show, from the arguments typed and the world's own ids. */
function bindCtxOf(argv: string[], w: { contact?: Row | null; lists?: Array<Row> }): BindCtx {
  const typed = (prefix: string): boolean => argv.some((a) => a.startsWith(prefix));
  return {
    testKey: typed("--test=") ? TEST.key : null,
    controlKey: typed("--control=") ? CONTROL.key : null,
    campaignId: argv.find((a) => !a.startsWith("--")) ?? null,
    contactId: w.contact ? String(w.contact.id) : null,
    listIds: (w.lists ?? []).map((l) => String(l.list_id)),
  };
}

export const preArgv = (extra: string[] = [], base = [`--test=${TEST.raw}`, `--origin=${ORIGIN}`]): string[] => [...base, ...extra];

/* ══ THE STAND-IN DATABASE ═══════════════════════════════════════════════════════════════════════════════════════════ */

const tagOf = (text: string): string => {
  const m = /u52a:([a-z-]+)/.exec(text);
  return m ? m[1] : "";
};

/** `handlers[tag](values)` answers one tagged SELECT. Every statement text is recorded, tag and all. */
export function fakePrisma(handlers: Record<string, (values: unknown[]) => unknown[]>, statements: string[], o: RunOpts = {}, rec: { calls?: Call[]; txOptions?: unknown[] } = {}): Row {
  const tx = {
    async $executeRaw(strings: readonly string[]) {
      statements.push(strings.join("?"));
      return 0;
    },
    async $queryRaw(strings: readonly string[], ...values: unknown[]) {
      const text = strings.join("?");
      statements.push(text);
      if (text.includes("transaction_read_only")) return [{ ro: o.transactionMode ?? "on" }];
      const tag = tagOf(text);
      rec.calls?.push({ tag, values: o.rebind ? o.rebind(tag, values) : values });
      if (o.throwOnQuery) throw o.throwOnQuery;
      const h = handlers[tag];
      if (!h) throw new Error(`the stand-in database has no answer for the statement tagged "${tag}"`);
      return h(values);
    },
  };
  return {
    async $transaction(fn: (tx: unknown) => Promise<unknown>, options?: unknown) {
      rec.txOptions?.push(options);
      return fn(tx);
    },
    async $disconnect() { /* nothing to close */ },
  };
}

export function preHandlers(w: PreWorld): Record<string, (values: unknown[]) => unknown[]> {
  return {
    now: () => [{ now: new Date(w.now) }],
    migrations: () => w.migrations,
    config: () => Object.entries(w.config).map(([key, value]) => ({ key, value })),
    contact: () => (w.contact ? [w.contact] : []),
    lists: () => w.lists.map(({ basis: _basis, ...rest }) => rest),
    basis: (v) => {
      const l = w.lists.find((x) => x.list_id === v[0]);
      return l && l.basis ? [l.basis] : [];
    },
    suppression: (v) => (v[0] === CONTROL.key ? (w.control ? w.control.suppressions : []) : w.suppressions),
    ledger: () => (w.latest ? [w.latest] : []),
    user: () => (w.user ? [w.user] : []),
    holds: () => w.holds,
    "in-flight": () => w.inFlight,
    elsewhere: () => (w.elsewhere === null ? [] : [{ n: w.elsewhere }]),
  };
}

/** The public network: the home page and `/api/health`, answering, failing or never answering (until aborted). */
export function fakeFetch(w: PreWorld, calls?: Array<{ url: string; method: unknown }>): (url: string, init?: FetchInit) => Promise<unknown> {
  return (url, init) => {
    calls?.push({ url: String(url), method: init?.method });
    const isHealth = String(url).endsWith("/api/health");
    const mode = isHealth ? w.healthMode : w.homeMode;
    if (mode === "throws") return Promise.reject(new Error("connect ECONNREFUSED prod.example.test:443"));
    if (mode === "hangs") {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
      });
    }
    if (isHealth) {
      if (mode === "html") return Promise.resolve({ status: 200, text: async () => "<html>not json</html>" });
      return Promise.resolve({ status: w.healthStatus, text: async () => JSON.stringify(w.health) });
    }
    return Promise.resolve({ status: 200, text: async () => w.home ?? "", headers: { get: (k: string) => (k.toLowerCase() === "link" ? w.homeLink : null) } });
  };
}

/** The stand-in ledger file: it reads and writes a string, says where it is and when it was written, and counts the writes. */
function fakeLedgerIo(state: { text: string | null; writes: number; throws?: boolean }) {
  return {
    read: () => state.text,
    write: (t: string) => {
      state.writes += 1;
      if (state.throws) throw Object.assign(new Error("EPERM: operation not permitted, rename"), { code: "EPERM" });
      state.text = t;
    },
    where: () => ({ path: "F:/stand-in/.qa-shots/marketing-setup/U52a/ledger.json", mtimeMs: state.text === null ? null : NOW - 3_600_000 }),
  };
}

export async function runPre(w: PreWorld, o: RunOpts = {}): Promise<RunResult> {
  const statements: string[] = [];
  const lines: string[] = [];
  const calls: Call[] = [];
  const txOptions: unknown[] = [];
  const fetchCalls: Array<{ url: string; method: unknown }> = [];
  const ledger = { text: o.ledgerText !== undefined ? o.ledgerText : w.ledgerText, writes: 0, throws: o.ledgerWriteThrows === true };
  const argv = o.argv ?? preArgv();
  const network = o.fetchImpl ?? fakeFetch(w, fetchCalls);
  const deps: Record<string, unknown> = {
    env: o.env ?? { DATABASE_URL: FAKE_DB_URL },
    sink: (l: string) => lines.push(l),
    now: () => o.now ?? w.now,
    fetch: o.fetchWrap ? o.fetchWrap(network) : network,
    ledgerIo: () => fakeLedgerIo(ledger),
    makePrisma: async () => o.prisma ?? fakePrisma(preHandlers(w), statements, o, { calls, txOptions }),
    timeoutMs: o.timeoutMs ?? 250,
    lib: o.lib ?? LIB,
  };
  if (o.judge) deps.judge = o.judge;
  if (o.parseArgs) deps.parseArgs = o.parseArgs;
  const code = await ((o.tool ?? PRE) as typeof PRE).runPreflight(argv, deps);
  return { code, lines, statements, ledgerText: ledger.text, calls, txOptions, fetchCalls, ledgerWrites: ledger.writes, bindCtx: bindCtxOf(argv, w) };
}

/* ══ THE EVIDENCE WORLD ══════════════════════════════════════════════════════════════════════════════════════════════ */

export type EvWorld = {
  now: number;
  campaign: Row | null;
  recipients: Row[];
  messages: Row[];
  testMessages: Row[];
  audit: Row[];
  switchAudit: Row[];
  people: { test: { suppressions: Row[]; ledger: Row[] }; control: { suppressions: Row[]; ledger: Row[] } };
  token: string | null;
  /** The MARKETING messages of the last day to a number but the test number (the count the database answers); null = no answer. */
  elsewhere: number | null;
  ledgerText: string | null;
};

/** A recipient row as the database returns it - exactly the columns the SQL selects (`key` is the fixture's own name for `msisdn`, not a column). */
export function recipientRow(o: Row & { key: string; id: string }): Row {
  const { key, ...rest } = o;
  return {
    msisdn: key, status: "DELIVERED", skip_reason: null, skip_detail: null, failure_class: null, error: null, attempts: 0,
    sms_reference: null, has_token: true, locale: "SW", segments: 1, body_len: DRIVE_LENGTH.SW.fallback, cost_tzs: null, claim_token: "clm_token_one",
    claimed_at: d(T0 + 2_000), sent_at: d(T0 + 4_000), delivered_at: d(T0 + 9_000), failed_at: null,
    gate_trail: [{ check: "campaign", verdict: "RUNNING", wording: null, source: CAMPAIGN }, { check: "gate", verdict: "ok", wording: null, source: "CONSENT:ledger:abc" }, { check: "dispatch", verdict: "handed_over", wording: null, source: "sms_ref" }],
    ...rest,
  };
}

export function messageRow(o: Row & { reference: string; target_id: string }): Row {
  return {
    to_test: true, purpose: "MARKETING", status: "DELIVERED", body_len: DRIVE_LENGTH.SW.fallback, dlr_status: "DELIVRD", dlr_desc: "Delivered", provider_msg: "Message sent",
    attempts: 0, created_at: d(T0 + 3_000), sent_at: d(T0 + 4_000), delivered_at: d(T0 + 9_000), failed_at: null, balance_tzs: "49994.00",
    ...o,
  };
}

const LEDGER_GIVEN = { status: "GIVEN", source: "PROFILE", via_link: false, created_at: d(T0 - 86400_000) };

export function baseEvWorld(): EvWorld {
  return {
    now: NOW,
    campaign: {
      id: CAMPAIGN, status: "DONE", stop_reason: null, audience_count: 1, confirm_tier: "ENUMERATE", estimate_segments: 1, estimate_tzs: "6.00",
      budget_tzs: "10000.00", segments_sw: 1, segments_en: null, enqueued: true, created_by: "usr_qa_growth_0001", confirmed_by: "usr_qa_growth_0001",
      confirmed_at: d(T0 - 60_000), enqueued_at: d(T0 + 1_000), started_at: d(T0), paused_at: null, finished_at: d(T0 + 10_000), created_at: d(T0 - 600_000),
      // DRIVE'S MESSAGE · the four stored fields compared in SQL with the drive's words: a campaign of the drive carries them all
      drive_body_sw: true, drive_body_en: true, drive_fallback_sw: true, drive_fallback_en: true,
    },
    recipients: [], messages: [], testMessages: [],
    audit: [
      { seq: "101", created_at: d(T0 - 60_000), category: "COMPLIANCE", action: "marketing.campaign_confirmed", actor_id: "usr_qa_growth_0001", payload: { count: 1, tier: "ENUMERATE" } },
      { seq: "102", created_at: d(T0), category: "ADMIN", action: "marketing.campaign_started", actor_id: "usr_qa_growth_0001", payload: { count: 1, estimateSegments: 1, freshCount: 1, shrunkBy: 0 } },
      { seq: "103", created_at: d(T0 + 10_000), category: "SYSTEM", action: "marketing.campaign_finished", actor_id: null, payload: { DELIVERED: 1 } },
    ],
    switchAudit: [{ seq: "99", created_at: d(T0 - 900_000), action: "marketing.live_switch_opened", payload: { closesAt: new Date(T0 + 7_200_000).toISOString(), via: "ops" } }],
    people: { test: { suppressions: [], ledger: [LEDGER_GIVEN] }, control: { suppressions: [], ledger: [] } },
    token: "ABCD2345",
    elsewhere: 0,
    ledgerText: EMPTY_LEDGER_TEXT,
  };
}

/** Campaign A in which everything is right: the composer test and the campaign's one send to the test number, delivered. */
export function evA(): EvWorld {
  const w = baseEvWorld();
  w.recipients = [recipientRow({ key: TEST.key, id: "rcp_test_a", sms_reference: "sms_aabbccddeeff001122334455" })];
  w.messages = [messageRow({ reference: "sms_aabbccddeeff001122334455", target_id: "rcp_test_a" })];
  w.testMessages = [messageRow({ reference: "sms_001122334455aabbccddeeff", target_id: CAMPAIGN, status: "ACCEPTED", dlr_status: null, dlr_desc: null, delivered_at: null, created_at: d(T0 - 300_000), sent_at: d(T0 - 299_000) })];
  return w;
}

/** The stop link's two acts as the database holds them after "stop": the stop is active and the ledger's newest row is that no. */
export function withStop(w: EvWorld, role: "test" | "control", at: number): EvWorld {
  w.people[role].suppressions = [{ reason: "WITHDRAWN", via_link: true, created_at: d(at), lifted_at: null, lifted_via_link: false }];
  w.people[role].ledger = [{ status: "WITHDRAWN", source: "OPT_OUT_PAGE", via_link: true, created_at: d(at) }, LEDGER_GIVEN];
  return w;
}

/** ... and after "Start them again". */
export function withResume(w: EvWorld, role: "test" | "control", stoppedAt: number, resumedAt: number): EvWorld {
  w.people[role].suppressions = [{ reason: "WITHDRAWN", via_link: true, created_at: d(stoppedAt), lifted_at: d(resumedAt), lifted_via_link: true }];
  w.people[role].ledger = [{ status: "GIVEN", source: "OPT_OUT_PAGE", via_link: true, created_at: d(resumedAt) }, { status: "WITHDRAWN", source: "OPT_OUT_PAGE", via_link: true, created_at: d(stoppedAt) }, LEDGER_GIVEN];
  return w;
}

/** Campaign B in which everything is right: the stop was tapped, and the test number is SKIPPED `suppressed` with nothing on the wire. */
export function evB(): EvWorld {
  const w = baseEvWorld();
  w.audit = w.audit.slice(0, 2);
  w.recipients = [recipientRow({
    key: TEST.key, id: "rcp_test_b", status: "SKIPPED", skip_reason: "suppressed", skip_detail: "suppressed withdrawn on 2026-10-09T07:20:00.000Z", has_token: false,
    locale: null, segments: null, body_len: null, sms_reference: null, claim_token: "clm_token_two", claimed_at: d(T0 + 1_800_000 + 2_000), sent_at: null, delivered_at: null,
    gate_trail: [{ check: "gate", verdict: "suppressed", wording: "suppressed withdrawn on 2026-10-09T07:20:00.000Z", source: null }],
  })];
  return withStop(w, "test", T0 + 1_140_000);
}

/** Campaign C in which everything is right: after "Start them again" the test number is sent again and delivered. */
export function evC(): EvWorld {
  const w = baseEvWorld();
  w.recipients = [recipientRow({ key: TEST.key, id: "rcp_test_c", sms_reference: "sms_c0c0c0c0c0c0c0c0c0c0c0c0", claim_token: "clm_token_three", claimed_at: d(T0 + 3_600_000), sent_at: d(T0 + 3_602_000), delivered_at: d(T0 + 3_607_000) })];
  w.messages = [messageRow({ reference: "sms_c0c0c0c0c0c0c0c0c0c0c0c0", target_id: "rcp_test_c", created_at: d(T0 + 3_601_000), sent_at: d(T0 + 3_602_000), delivered_at: d(T0 + 3_607_000) })];
  w.audit.splice(2, 0,
    { seq: "1021", created_at: d(T0 + 3_600_500), category: "ADMIN", action: "marketing.campaign_paused", actor_id: "usr_qa_growth_0001", payload: { reason: "officer_paused" } },
    { seq: "1022", created_at: d(T0 + 3_600_800), category: "ADMIN", action: "marketing.campaign_resumed", actor_id: "usr_qa_growth_0001", payload: { requeuedHeld: 0, to: "RUNNING" } });
  return withResume(w, "test", T0 + 1_140_000, T0 + 2_400_000);
}

export function evHandlers(w: EvWorld): Record<string, (values: unknown[]) => unknown[]> {
  const counts = (rows: Row[]): Row[] => {
    const m = new Map<string, Row>();
    for (const r of rows) {
      const k = `${r.status}|${r.dlr_status !== null && r.dlr_status !== undefined}`;
      const cur = m.get(k) ?? { status: r.status, has_receipt: r.dlr_status !== null && r.dlr_status !== undefined, n: 0 };
      cur.n = (cur.n as number) + 1;
      m.set(k, cur);
    }
    return [...m.values()];
  };
  const recipientCounts = (): Row[] => {
    const m = new Map<string, Row>();
    for (const r of w.recipients) {
      const k = `${r.status}|${r.skip_reason}|${r.failure_class}`;
      const cur = m.get(k) ?? { status: r.status, skip_reason: r.skip_reason, failure_class: r.failure_class, n: 0 };
      cur.n = (cur.n as number) + 1;
      m.set(k, cur);
    }
    return [...m.values()];
  };
  return {
    now: () => [{ now: new Date(w.now) }],
    // the campaign read binds the drive's four words FIRST (its comparisons) and the id LAST
    campaign: (v) => (w.campaign && v[v.length - 1] === w.campaign.id ? [w.campaign] : []),
    recipients: () => w.recipients.slice(0, 41),
    "recipient-named": (v) => w.recipients.filter((r) => r.msisdn === v[1]).slice(0, 1),
    "recipient-counts": recipientCounts,
    messages: () => w.messages.slice(0, 201),
    "message-counts": () => counts(w.messages),
    "test-messages": () => w.testMessages.slice(0, 20),
    "test-message-counts": () => counts(w.testMessages),
    audit: () => w.audit,
    "switch-audit": () => w.switchAudit,
    "person-suppression": (v) => (v[0] === CONTROL.key ? w.people.control.suppressions : w.people.test.suppressions),
    "person-ledger": (v) => (v[0] === CONTROL.key ? w.people.control.ledger : w.people.test.ledger),
    token: () => (w.token ? [{ token: w.token }] : []),
    elsewhere: () => (w.elsewhere === null ? [] : [{ n: w.elsewhere }]),
  };
}

export const evArgv = (campaign: string, extra: string[]): string[] => [campaign, ...extra];

export async function runEv(w: EvWorld, argv: string[], o: RunOpts = {}): Promise<RunResult> {
  const statements: string[] = [];
  const lines: string[] = [];
  const calls: Call[] = [];
  const txOptions: unknown[] = [];
  const ledger = { text: o.ledgerText !== undefined ? o.ledgerText : w.ledgerText, writes: 0, throws: o.ledgerWriteThrows === true };
  const deps: Record<string, unknown> = {
    env: o.env ?? { DATABASE_URL: FAKE_DB_URL },
    sink: (l: string) => lines.push(l),
    now: () => o.now ?? w.now,
    ledgerIo: () => fakeLedgerIo(ledger),
    makePrisma: async () => o.prisma ?? fakePrisma(evHandlers(w), statements, o, { calls, txOptions }),
    lib: o.lib ?? LIB,
  };
  if (o.parts) deps.parts = o.parts;
  if (o.readFacts) deps.readFacts = o.readFacts;
  if (o.render) deps.render = o.render;
  if (o.parseArgs) deps.parseArgs = o.parseArgs;
  const code = await ((o.tool ?? EV) as typeof EV).runEvidence(argv, deps);
  return { code, lines, statements, ledgerText: ledger.text, calls, txOptions, fetchCalls: [], ledgerWrites: ledger.writes, bindCtx: bindCtxOf(argv, { contact: null, lists: [] }) };
}

export { LIB, PRE, EV };
