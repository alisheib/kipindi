/**
 * The fixture world for `test:marketing-preflight` (spec `docs/marketing-specs/ENGINE-SPEC.md` §4.18) — a stand-in database, a
 * stand-in network and the rows they answer with, so the two live tools run END TO END with no database and no network:
 *   · `fakePrisma` answers each SELECT by the tag comment it opens with (`u52a:<tag>`) from a plain-object world, and RECORDS
 *     every statement, so the suite can hold the first one to `SET TRANSACTION READ ONLY` and the rest to SELECT;
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
  control: { suppressions: Row[] } | null;
  health: Row | null;
  healthStatus: number;
  healthMode: "ok" | "throws" | "hangs" | "html";
  home: string | null;
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
    config: {},
    contact: { id: "ct_test_0001", consent_state: "GIVEN", suppressed: false, linked: true, source: "REGISTRATION", erased: false, created_at: d(NOW - 9 * 86400_000) },
    lists: [{ list_id: "lst_u52a_0001", list_name: "U52a drive list", added_at: d(NOW - 86400_000), members: 1, basis: null }],
    suppressions: [],
    latest: { status: "GIVEN", source: "PROFILE", wording: SMS_WORDING, recorded_by_officer: false, via_link: false, created_at: d(NOW - 5 * 86400_000) },
    user: { role: "PLAYER", status: "ACTIVE", opt_in: true, dob: d(Date.parse("1990-01-01T00:00:00Z")) },
    holds: [],
    control: null,
    health: goodHealth(),
    healthStatus: 200,
    healthMode: "ok",
    home: `<html data-dpl-id="${BUILD}"><body>home</body></html>`,
    homeMode: "ok",
    ledgerText: null,
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
  fetchImpl?: (url: string, init?: { signal?: AbortSignal }) => Promise<unknown>;
  ledgerText?: string | null;
  now?: number;
  transactionMode?: string;
  throwOnQuery?: Error;
};
export type RunResult = { code: number; lines: string[]; statements: string[]; ledgerText: string | null };

export const preArgv = (extra: string[] = [], base = [`--test=${TEST.raw}`, `--origin=${ORIGIN}`]): string[] => [...base, ...extra];

/* ══ THE STAND-IN DATABASE ═══════════════════════════════════════════════════════════════════════════════════════════ */

const tagOf = (text: string): string => {
  const m = /u52a:([a-z-]+)/.exec(text);
  return m ? m[1] : "";
};

/** `handlers[tag](values)` answers one tagged SELECT. Every statement text is recorded, tag and all. */
export function fakePrisma(handlers: Record<string, (values: unknown[]) => unknown[]>, statements: string[], o: RunOpts = {}): Row {
  const tx = {
    async $executeRaw(strings: readonly string[]) {
      statements.push(strings.join("?"));
      return 0;
    },
    async $queryRaw(strings: readonly string[], ...values: unknown[]) {
      const text = strings.join("?");
      statements.push(text);
      if (text.includes("transaction_read_only")) return [{ ro: o.transactionMode ?? "on" }];
      if (o.throwOnQuery) throw o.throwOnQuery;
      const tag = tagOf(text);
      const h = handlers[tag];
      if (!h) throw new Error(`the stand-in database has no answer for the statement tagged "${tag}"`);
      return h(values);
    },
  };
  return {
    async $transaction(fn: (tx: unknown) => Promise<unknown>) {
      return fn(tx);
    },
    async $disconnect() { /* nothing to close */ },
  };
}

export function preHandlers(w: PreWorld): Record<string, (values: unknown[]) => unknown[]> {
  return {
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
  };
}

/** The public network: the home page and `/api/health`, answering, failing or never answering (until aborted). */
export function fakeFetch(w: PreWorld): (url: string, init?: { signal?: AbortSignal }) => Promise<unknown> {
  return (url, init) => {
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
    return Promise.resolve({ status: 200, text: async () => w.home ?? "" });
  };
}

export async function runPre(w: PreWorld, o: RunOpts = {}): Promise<RunResult> {
  const statements: string[] = [];
  const lines: string[] = [];
  let ledgerText: string | null = o.ledgerText !== undefined ? o.ledgerText : w.ledgerText;
  const deps: Record<string, unknown> = {
    env: o.env ?? { DATABASE_URL: FAKE_DB_URL },
    sink: (l: string) => lines.push(l),
    now: () => o.now ?? w.now,
    fetch: o.fetchImpl ?? fakeFetch(w),
    ledgerIo: () => ({ read: () => ledgerText, write: (t: string) => { ledgerText = t; } }),
    makePrisma: async () => o.prisma ?? fakePrisma(preHandlers(w), statements, o),
    timeoutMs: o.timeoutMs ?? 250,
    lib: o.lib ?? LIB,
  };
  if (o.judge) deps.judge = o.judge;
  if (o.parseArgs) deps.parseArgs = o.parseArgs;
  const code = await PRE.runPreflight(o.argv ?? preArgv(), deps);
  return { code, lines, statements, ledgerText };
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
  ledgerText: string | null;
};

export function recipientRow(o: Row & { key: string; id: string }): Row {
  return {
    msisdn: o.key, status: "DELIVERED", skip_reason: null, skip_detail: null, failure_class: null, error: null, attempts: 0,
    sms_reference: null, has_token: true, locale: "SW", segments: 1, body_len: 87, cost_tzs: null, claim_token: "clm_token_one",
    claimed_at: d(T0 + 2_000), sent_at: d(T0 + 4_000), delivered_at: d(T0 + 9_000), failed_at: null,
    gate_trail: [{ check: "campaign", verdict: "RUNNING", wording: null, source: CAMPAIGN }, { check: "gate", verdict: "ok", wording: null, source: "CONSENT:ledger:abc" }, { check: "dispatch", verdict: "handed_over", wording: null, source: "sms_ref" }],
    ...o,
  };
}

export function messageRow(o: Row & { reference: string; target_id: string }): Row {
  return {
    purpose: "MARKETING", status: "DELIVERED", body_len: 87, dlr_status: "DELIVRD", dlr_desc: "Delivered", provider_msg: "Message sent",
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
    ledgerText: null,
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
    campaign: (v) => (w.campaign && v[0] === w.campaign.id ? [w.campaign] : []),
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
  };
}

export const evArgv = (campaign: string, extra: string[]): string[] => [campaign, ...extra];

export async function runEv(w: EvWorld, argv: string[], o: RunOpts = {}): Promise<RunResult> {
  const statements: string[] = [];
  const lines: string[] = [];
  let ledgerText: string | null = o.ledgerText !== undefined ? o.ledgerText : w.ledgerText;
  const deps: Record<string, unknown> = {
    env: o.env ?? { DATABASE_URL: FAKE_DB_URL },
    sink: (l: string) => lines.push(l),
    now: () => o.now ?? w.now,
    ledgerIo: () => ({ read: () => ledgerText, write: (t: string) => { ledgerText = t; } }),
    makePrisma: async () => o.prisma ?? fakePrisma(evHandlers(w), statements, o),
    lib: o.lib ?? LIB,
  };
  if (o.parts) deps.parts = o.parts;
  if (o.readFacts) deps.readFacts = o.readFacts;
  if (o.render) deps.render = o.render;
  if (o.parseArgs) deps.parseArgs = o.parseArgs;
  const code = await EV.runEvidence(argv, deps);
  return { code, lines, statements, ledgerText };
}

export { LIB, PRE, EV };
