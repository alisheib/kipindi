/**
 * U52a · THE TWO LIVE TOOLS ON A REAL POSTGRES — the pre-flight and the campaign evidence, run END TO END through a real Prisma
 * client against a scratch PostgreSQL 18.3 migrated from empty and seeded with the drive's whole story (spec
 * `docs/marketing-specs/ENGINE-SPEC.md` §4.18, "AS BUILT — the run sheet").
 *
 * ⭐ WHY THIS EXISTS — AND WHY IT IS REQUIRED BEFORE PRODUCTION. `test:marketing-preflight` runs both tools over a stand-in database
 * that answers each tagged SELECT from a plain object: it proves the rules, the exit codes, the masks, the read-only first statement,
 * each statement's contract and the values it was bound to — but it cannot say whether Postgres PARSES the statements, whether an
 * enum compares to the text it is cast to, whether `jsonb` comes back as an object, a `bigint` as text, a `count(*)` as a number,
 * how a bare name in ORDER BY resolves, or whether the READ ONLY transaction really refuses a write. Those are facts about the
 * database. This probe asks them, with the SHIPPED tools and the SHIPPED helper, so the first live pre-flight is not the first time
 * the SQL runs. The run sheet makes a green run of this probe, by the lead under the heavy-node lock, the first line of "Before the day".
 *
 *   0  the cluster is migrated: every migration the pre-flight names is finished in `_prisma_migrations`, none of the four SystemConfig
 *      rows the tools read is there, and no row anywhere names the probe's made-up numbers;
 *   1  the CONTACT world (no account holds the number; a covering list basis; an SMS-naming yes; the source line saved; the Marketing
 *      SMS settings SAVED - price 7, reserve 21,000, the widest window 07:00-21:00, read through real jsonb): the pre-flight is GO on
 *      every applicable row (`in-flight` and `elsewhere` included), the control row n/a without a control; a control WITH an active stop
 *      is GO, one without is NO-GO on its row alone; an open switch row (jsonb) is NO-GO by default and GO under --expect-switch=open,
 *      and the same record stored as a JSON STRING reads as malformed; an ACCOUNT holding the number is GO on the account branch, and its
 *      own switch off is NO-GO on test-consent alone; the licence-outreach record (jsonb, OPEN) is read; a campaign that is not the
 *      drive's own in each of the seven statuses of the real enum is NO-GO on in-flight alone for the four that can send, and GO when
 *      named with --drive-campaign; a MARKETING message of the last day to another number is NO-GO on elsewhere alone (one 40 hours old is
 *      not counted); the window row's margin (default 60, --min-window) follows the clock; a SECOND member on the drive list is NO-GO on
 *      test-lists alone; no saved wordings is NO-GO on source alone; a missing ledger file is NO-GO on ledger alone unless --new-ledger,
 *      which is refused over one that exists; the report says it used the DATABASE's clock and a loopback database;
 *   2  the evidence on campaign A (the composer test + one delivered send, the stop link shown once, the ledger created by
 *      --new-ledger), the stop made on the stop link's page (no SMS carries the link since 2026-10-09: the drive opens it from the
 *      row), B (SKIPPED `suppressed`, zero sends), ⭐ THE GATE REMOVED (the stopped number SENT: skipped:test FAILS, VIOLATION named,
 *      exit 1) and C (after "Start them again"): every verdict and exit code as the run sheet says; the ledger counts 4 and refuses
 *      3 more; ⭐ SENT AS WRITTEN: every campaign carries the drive's ONE message (`DRIVE_MESSAGE`, the owner's words of 2026-10-09)
 *      and every message row its length, and a message 49 characters longer (the old footer) makes a look exit 1;
 *   3  the TYPES the tools read (booleans, Dates, numbers with no bigint, `seq` as text, jsonb as objects, the gate trail an
 *      array, the clock a Date) and ⭐ THE ORDER: the audit rows of a campaign come back in NUMERIC seq order across the 9 to 10
 *      boundary, and the live switch's "newest eight" are the eight with the greatest seq (a bare ORDER BY on the aliased text would
 *      sort them as text — the probe prints what the server does with that, for the record);
 *   4  ⭐ READ ONLY: a write inside a transaction set READ ONLY is refused by the database itself (25006), a write handed to the
 *      shipped helper's `$queryRaw` is refused the same way and leaves no row, the helper's transaction really is READ ONLY and
 *      REPEATABLE READ, and a content fingerprint of EVERY table is identical before and after a run of each tool;
 *   5  nothing printed holds a whole number, the database address, its password or its user.
 *
 * ⏰ THE TOOLS READ THE DATABASE'S CLOCK, so the probe's story is told relative to the cluster's own `now()`. The send window
 * (08:00-20:00 EAT by default, and a saved window may not be wider than 07:00-21:00) is a fact about the time of day the probe is
 * run: outside it the `window` row is NO-GO in every pre-flight and the probe EXPECTS that (it says so in an INFO line).
 *
 * ⛔ A LOOPBACK CLUSTER ONLY: it writes rows. ⛔ No backslash anywhere in this file (the editing tools decode escapes).
 * ⛔ The AuditLog rows are raw inserts with made-up unique hashes (the chain is not verified here; the tools never read a hash).
 *
 * ⚠️ WRITTEN WITHOUT A DATABASE (U52a was built with none): its seeds were checked against `schema.prisma` and the migrations,
 * the file was parsed, and nothing more — it has NEVER RUN. How to read a failure:
 *   · a line starting `SEED ·` means the probe's OWN row was refused by Postgres — fix the probe's seed, the tools are not in it;
 *   · any other FAIL, with the seeds accepted, is a finding about a tool's SQL or a rule — fix the tool, and add the claim to
 *     `test:marketing-preflight` so the suite holds it from then on. `U52A_SHOW=1` prints every line each run printed.
 *
 * Run (through the heavy-node lock; it boots the scratch cluster):
 *   npm run -s db:probe-marketing-u52a   (db-scratch boots Postgres; scripts/live/pg-probe-run.mts migrates it and runs this probe)
 */
import pg from "pg";

process.exitCode = 1;
const NL = String.fromCharCode(10);
const URL_ = process.env.DATABASE_URL ?? "";
let host = "";
try { host = new URL(URL_).hostname; } catch { /* refused below */ }
if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(host)) {
  console.error("refusing: this probe writes rows, and runs only against a loopback cluster (through pg-probe-run).");
  process.exit(2);
}

const W = await import("../lib/marketing-u52a-world.mts");
const { LIB, PRE, EV } = W;
const { PrismaClient } = await import("@prisma/client");

const client = new pg.Client({ connectionString: URL_ });
await client.connect();

let pass = 0;
let fail = 0;
const SHOW_ALL = process.env.U52A_SHOW === "1";
const showFailing = (lines: string[]): void => {
  const keep = SHOW_ALL ? lines : lines.filter((l) => /NO-GO|FAILS|NOT |REFUS|VIOLATION|RESULT/.test(l)).slice(0, 14);
  for (const l of keep) console.log(`      | ${l}`);
};
const ok = (label: string, cond: boolean, detail = "", lines: string[] = []): void => {
  if (cond) pass++; else fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
  if ((!cond || SHOW_ALL) && lines.length > 0) showFailing(lines);
};
const q = (text: string, params: unknown[] = []) => client.query(text, params);
const iso = (ms: number): string => new Date(ms).toISOString();
const json = (v: unknown): string => JSON.stringify(v);
/** The cluster's own clock — what every time rule of the tools reads. The story below is told relative to it. */
const NOW = ((await q(`SELECT now() AS n`)).rows[0].n as Date).getTime();
const DAY = 86_400_000;
const SEEN: string[] = [];
const OWN_KEYS: string[] = [W.TEST.key, W.CONTROL.key, W.OTHER_KEY];
/**
 * The probe SAVES a send window (07:00-21:00 EAT, the widest the app allows), so the pre-flight's `window` row judges the SAVED record read
 * through real jsonb, not the default 08:00-20:00. The row is GO only inside it with at least `--min-window` minutes left (60 by default):
 * outside that the row is NO-GO - a fact about the hour, not a finding.
 */
const WIN = { start: 420, end: 1260, margin: 60 } as const;
const EAT_MINUTE = (() => { const t = new Date(NOW + 3 * 3_600_000); return t.getUTCHours() * 60 + t.getUTCMinutes(); })();
const windowOpen = (margin: number): boolean => EAT_MINUTE >= WIN.start && EAT_MINUTE < WIN.end && WIN.end - EAT_MINUTE >= margin;
const WINDOW_OPEN = windowOpen(WIN.margin);
const expectedNoGo = (rows: string[]): string[] => [...rows, ...(WINDOW_OPEN ? [] : ["window"])].sort();
const expectedCode = (rows: string[]): number => (expectedNoGo(rows).length === 0 ? 0 : 1);

/** The probe's own rows: a refusal from Postgres here is the PROBE's fault, said first and said so, and it ends the run. */
class SeedStop extends Error {}
async function seeded(stage: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    const e = err as { code?: string; message?: string; table?: string; column?: string; constraint?: string };
    ok(`SEED · ${stage} (the probe's own rows, not the tools)`, false, `pg ${e.code ?? "?"} · ${String(e.message ?? err).split(NL)[0]}${e.table ? ` · table ${e.table}` : ""}${e.column ? ` · column ${e.column}` : ""}${e.constraint ? ` · constraint ${e.constraint}` : ""}`);
    throw new SeedStop(stage);
  }
}

/* ══ THE TWO TOOLS, THROUGH A REAL CLIENT ═════════════════════════════════════════════════════════════════════════════ */

/** A ledger file held in memory: the drive's "file exists, nothing counted" at the start; a throwaway one to test a missing file. */
type LedgerState = { text: string | null };
const sharedLedger: LedgerState = { text: LIB.serializeLedger(LIB.emptyLedger()) };
const ledgerIoOf = (state: LedgerState) => () => ({
  read: () => state.text,
  write: (t: string) => { state.text = t; },
  where: () => ({ path: "(the probe's in-memory ledger)", mtimeMs: state.text === null ? null : NOW }),
});

type Ran = { code: number; lines: string[] };
async function runPre(argv: string[], ledger: LedgerState = sharedLedger): Promise<Ran> {
  const lines: string[] = [];
  const code = await PRE.runPreflight(argv, {
    env: { DATABASE_URL: URL_ },
    sink: (l: string) => lines.push(l),
    now: () => NOW,
    fetch: W.fakeFetch(W.goodPreWorld()),
    ledgerIo: ledgerIoOf(ledger),
    makePrisma: async () => new PrismaClient(),
    timeoutMs: 3000,
  });
  SEEN.push(...lines);
  if (SHOW_ALL) console.log(`      ~ pre-flight · exit ${code} · ${lines.length} lines`);
  return { code, lines };
}
async function runEv(argv: string[], ledger: LedgerState = sharedLedger): Promise<Ran> {
  const lines: string[] = [];
  const code = await EV.runEvidence(argv, {
    env: { DATABASE_URL: URL_ },
    sink: (l: string) => lines.push(l),
    now: () => NOW,
    ledgerIo: ledgerIoOf(ledger),
    makePrisma: async () => new PrismaClient(),
  });
  SEEN.push(...lines);
  if (SHOW_ALL) console.log(`      ~ evidence ${argv[0] ?? ""} · exit ${code} · ${lines.length} lines`);
  return { code, lines };
}
const preArgv = (extra: string[] = []): string[] => [`--test=${W.TEST.raw}`, `--origin=${W.ORIGIN}`, ...extra];
const rowsOf = (lines: string[]): Map<string, string> => {
  const out = new Map<string, string>();
  for (const l of lines) {
    const m = new RegExp("^ {2}(GO|NO-GO|n/a) +([a-z-]+) ").exec(l);
    if (m) out.set(m[2], m[1]);
  }
  return out;
};
const noGo = (lines: string[]): string[] => [...rowsOf(lines)].filter(([, v]) => v === "NO-GO").map(([k]) => k).sort();
const has = (lines: string[], text: string): boolean => lines.some((l) => l.includes(text));
/** Exactly the rows named are NO-GO (plus `window`, outside its hours), and the exit code follows. */
const onlyNoGo = (run: Ran, rows: string[]): boolean => json(noGo(run.lines)) === json(expectedNoGo(rows)) && run.code === expectedCode(rows);

/* ══ THE SEEDS ═══════════════════════════════════════════════════════════════════════════════════════════════════════ */

const LIST = "lst_u52a_probe_0001";
const CONTACT = "ct_u52a_probe_0001";
const CONTACT_2 = "ct_u52a_probe_0002";
const BASIS = `lb_${"a".repeat(20)}`;
const CAMP_A = "cmp_u52a_probe_aaaa";
const CAMP_B = "cmp_u52a_probe_bbbb";
const CAMP_X = "cmp_u52a_probe_xxxx";
const CAMP_C = "cmp_u52a_probe_cccc";
const OFFICER = "usr_u52a_probe_officer";
// ⭐ the probe's OWN copies of the four SystemConfig keys (not the tools' constants: a typo in a tool must not be mirrored by the seed)
const SWITCH_KEY = "marketing.sms.live";
const WORDINGS_KEY = "marketing.wordings";
const SETTINGS_KEY = "marketing.sms.settings";
const OUTREACH_KEY = "marketing.outreach.licence";
const STRANGER = "cmp_u52a_probe_other";
let auditN = 0;

async function seedBook(): Promise<void> {
  await q(`INSERT INTO "ContactList" (id, name) VALUES ($1, $2)`, [LIST, "U52a probe list"]);
  await q(`INSERT INTO "MarketingContact" (id, msisdn, "rawInput", ndc, source, "consentState") VALUES ($1, $2, $3, '75', 'OPERATOR', 'GIVEN')`, [CONTACT, W.TEST.key, "typed by an officer"]);
  await q(`INSERT INTO "ContactListMember" ("listId", "contactId", "addedAt") VALUES ($1, $2, $3)`, [LIST, CONTACT, iso(NOW - DAY)]);
  await q(
    `INSERT INTO "ContactListBasis" (id, "listId", "basisKey", wording, "wordingVersion", "adultWording", "adultVersion", "proofNote", "recordedBy", "recordedAt")
     VALUES ($1, $2, 'LICENCE_OUTREACH', 'probe words', 1, 'probe adult words', 1, 'a probe proof note', $3, $4)`,
    [BASIS, LIST, OFFICER, iso(NOW - 3_600_000)],
  );
}
/** The saved wordings of a platform ready for the drive: the source line and the typed-number test's 18+ sentence (jsonb). */
const seedWordings = (): Promise<unknown> =>
  q(`INSERT INTO "SystemConfig" (key, value, "updatedAt") VALUES ($1, $2::jsonb, now())`, [WORDINGS_KEY, json(W.SAVED_WORDINGS)]);
/** ⭐ The SAVED Marketing SMS settings (jsonb): not the defaults - a price of 7, a reserve of 21,000, a limit of 11,000 and the widest window (07:00-21:00). */
const seedSettings = (): Promise<unknown> =>
  q(`INSERT INTO "SystemConfig" (key, value, "updatedAt") VALUES ($1, $2::jsonb, now())`, [SETTINGS_KEY, json({ v: 1, pricePerSegmentTzs: 7, codesReserveTzs: 21000, campaignLimitTzs: 11000, windowStartMinute: WIN.start, windowEndMinute: WIN.end })]);
/** ⭐ The licence-outreach record, OPEN (jsonb): exactly the three keys the app's reader accepts. */
const seedOutreach = (): Promise<unknown> =>
  q(`INSERT INTO "SystemConfig" (key, value, "updatedAt") VALUES ($1, $2::jsonb, now())`, [OUTREACH_KEY, json({ state: "open", recordedBy: OFFICER, recordedAt: iso(NOW - 10 * DAY) })]);
/** One MessagingConsent row for the test number. An officer's entry carries a recorder; the person's own act and the link carry none. */
async function seedLedger(id: string, status: string, source: string, at: number, evidence: string | null, wording: string, byOfficer: boolean): Promise<void> {
  await q(
    `INSERT INTO "MessagingConsent" (id, channel, identifier, category, status, source, wording, locale, evidence, "recordedBy", "createdAt")
     VALUES ($1, 'SMS', $2, 'MARKETING', $3, $4, $5, 'SW', $6, $7, $8)`,
    [id, W.TEST.key, status, source, wording, evidence, byOfficer ? OFFICER : null, iso(at)],
  );
}
/**
 * A campaign row, carrying the drive's ONE message (`DRIVE_MESSAGE` — the owner's words of 2026-10-09, read through the world, never
 * typed here) and told apart by its NAME, as the run sheet's campaigns are.
 */
async function seedCampaign(id: string, startedAt: number, status = "DONE", audience = 1, name = "U52a probe"): Promise<void> {
  const m = W.DRIVE_MESSAGE as unknown as Record<"bodySw" | "bodyEn" | "nameFallbackSw" | "nameFallbackEn", string>;
  await q(
    `INSERT INTO "SmsCampaign" (id, name, status, "bodySw", "bodyEn", "nameFallbackSw", "nameFallbackEn", "codingSw", "segmentsSw", "codingEn", "segmentsEn", "audienceFilter", "audienceCount", "confirmTier", "estimateSegments", "estimateTzs", "budgetTzs",
       "enqueueCursor", "enqueuedAt", "createdBy", "confirmedBy", "confirmedAt", "startedAt", "finishedAt", "createdAt")
     VALUES ($1, $10, $8::"SmsCampaignStatus", $11, $12, $13, $14, 'GSM7', 1, 'GSM7', 1, 'list', $9, 'ENUMERATE', 1, 6, 10000, 'done', $2, $3, $3, $4, $5, $6, $7)`,
    [id, iso(startedAt + 1000), OFFICER, iso(startedAt - 60_000), iso(startedAt), status === "DONE" ? iso(startedAt + 10_000) : null, iso(startedAt - 600_000), status, audience,
      name, m.bodySw, m.bodyEn, m.nameFallbackSw, m.nameFallbackEn],
  );
}
/** The length a contact-book number is sent the drive's Swahili message — every message and recipient row below is that long. */
const AS_SENT = W.DRIVE_LENGTH.SW.fallback;
async function seedAudit(targetType: string, target: string, action: string, category: string, actor: string | null, payload: unknown, at: number): Promise<void> {
  auditN += 1;
  await q(
    `INSERT INTO "AuditLog" (id, category, action, "actorId", "targetType", "targetId", payload, "createdAt", "prevHash", "entryHash")
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10)`,
    [`aud_u52a_probe_${auditN}`, category, action, actor, targetType, target, JSON.stringify(payload), iso(at), `probe-prev-${auditN}`, `probe-hash-${auditN}`],
  );
}
const seedCampaignAudit = (campaign: string, action: string, category: string, actor: string | null, payload: unknown, at: number) =>
  seedAudit("SmsCampaign", campaign, action, category, actor, payload, at);
const seedSwitchAudit = (n: number, at: number) =>
  seedAudit("SystemConfig", SWITCH_KEY, n % 2 === 1 ? "marketing.live_switch_opened" : "marketing.live_switch_closed", "COMPLIANCE", null, { via: "ops", closesAt: iso(at + 7_200_000) }, at);
async function seedRecipient(o: { id: string; campaign: string; status: string; ref: string | null; token: string; skip?: string; detail?: string; claimedAt: number; sentAt?: number; deliveredAt?: number; bodyLen?: number }): Promise<void> {
  const skipped = o.status === "SKIPPED";
  await q(
    `INSERT INTO "SmsCampaignRecipient" (id, "campaignId", msisdn, status, "smsReference", "optOutToken", locale, "skipReason", "skipDetail", "claimToken", "claimedAt", attempts, segments, "bodyLen", "gateTrail", "sentAt", "deliveredAt")
     VALUES ($1, $2, $3, $4, $5, $6, 'SW', $7, $8, $9, $10, 0, $11, $12, $13::jsonb, $14, $15)`,
    [
      o.id, o.campaign, W.TEST.key, o.status, o.ref, skipped ? null : o.token, o.skip ?? null, o.detail ?? null, `clm_${o.id}`, iso(o.claimedAt),
      skipped ? null : 1, skipped ? null : (o.bodyLen ?? AS_SENT),
      json([{ check: "gate", verdict: o.skip ?? "ok", wording: null, source: o.skip ? null : "CONSENT:ledger:probe" }]),
      o.sentAt === undefined ? null : iso(o.sentAt), o.deliveredAt === undefined ? null : iso(o.deliveredAt),
    ],
  );
}
async function seedMessage(o: { ref: string; targetType: string; targetId: string; status: string; receipt?: string; at: number; msisdn?: string; bodyLen?: number }): Promise<void> {
  await q(
    `INSERT INTO "SmsMessage" (reference, msisdn, purpose, provider, "senderId", "bodyLen", status, "dlrStatus", "dlrDesc", "providerMsg", attempts, "targetType", "targetId", "createdAt", "sentAt", "deliveredAt", "balanceTzs")
     VALUES ($1, $2, 'MARKETING', 'blackball', 'probe', $11, $3, $4, $5, 'Message sent', 0, $6, $7, $8, $9, $10, 49994)`,
    [o.ref, o.msisdn ?? W.TEST.key, o.status, o.receipt ?? null, o.receipt ? "Delivered" : null, o.targetType, o.targetId, iso(o.at), iso(o.at + 1000), o.status === "DELIVERED" ? iso(o.at + 6000) : null, o.bodyLen ?? AS_SENT],
  );
}

/** A content fingerprint of every table in the public schema: it moves if a row is added, changed or removed. */
async function fingerprints(): Promise<Record<string, string>> {
  const tables = (await q(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`)).rows.map((r) => String(r.tablename));
  const out: Record<string, string> = {};
  for (const t of tables) {
    out[t] = String((await q(`SELECT md5(coalesce(string_agg(x::text, '|' ORDER BY x::text), '')) AS h FROM "${t}" x`)).rows[0].h);
  }
  return out;
}
const numericSeqs = async (where: string, params: unknown[]): Promise<number[]> =>
  (await q(`SELECT seq FROM "AuditLog" WHERE ${where}`, params)).rows.map((r) => Number(r.seq)).sort((a, b) => a - b);

try {
  /* ── 0 · the cluster ── */
  const finished = await q(`SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`);
  const have = new Set(finished.rows.map((r) => String(r.migration_name)));
  const missing = (LIB.ENGINE_MIGRATIONS as readonly string[]).filter((n) => !have.has(n));
  const keysIn = [W.TEST.key, W.CONTROL.key, W.OTHER_KEY];
  const heldBefore = Number((await q(
    `SELECT (SELECT count(*) FROM "MarketingContact" WHERE msisdn = ANY($1)) + (SELECT count(*) FROM "Suppression" WHERE identifier = ANY($1))
          + (SELECT count(*) FROM "MessagingConsent" WHERE identifier = ANY($1)) + (SELECT count(*) FROM "SmsCampaignRecipient" WHERE msisdn = ANY($1))
          + (SELECT count(*) FROM "SmsMessage" WHERE msisdn = ANY($1)) + (SELECT count(*) FROM "User" WHERE "phoneE164" = ANY($2)) AS n`,
    [keysIn, keysIn.map((k) => `+${k}`)],
  )).rows[0].n);
  const configHeld = (await q(`SELECT key FROM "SystemConfig" WHERE key IN ($1, $2, 'marketing.sms.settings', 'marketing.outreach.licence') ORDER BY key`, [SWITCH_KEY, WORDINGS_KEY])).rows.map((r) => String(r.key));
  ok("0 · the cluster is migrated (every migration the pre-flight names is finished), no row names the probe's numbers, and none of the four config rows the pre-flight reads is there",
    missing.length === 0 && heldBefore === 0 && configHeld.length === 0, `missing [${missing.join(", ")}] · rows naming the numbers ${heldBefore} · config rows [${configHeld.join(", ")}]`);
  console.log(`INFO the cluster's clock says ${LIB.fmtEat(NOW).slice(11, 16)} EAT — the SAVED send window (07:00-21:00, with 60 minutes to spare) is ${WINDOW_OPEN ? "OPEN: every GO below is a full GO" : "CLOSED: every pre-flight below is expected to be NO-GO on the window row, and ONLY that row beyond what each check names"}`);

  /* ── 1 · the pre-flight ── */
  await seeded("the contact book (list, contact, membership, a covering basis)", seedBook);
  await seeded("the saved wordings (source.phrase and adult.test, jsonb)", async () => { await seedWordings(); });
  await seeded("the saved Marketing SMS settings (price 7, reserve 21,000, limit 11,000, window 07:00-21:00 - jsonb)", async () => { await seedSettings(); });
  await seeded("the ledger: an officer's yes naming SMS", () => seedLedger("led_probe_0001", "GIVEN", "OPERATOR", NOW - 5 * DAY, null, W.SMS_WORDING, true));
  const contactWorld = await runPre(preArgv());
  const contactRows = rowsOf(contactWorld.lines);
  const rowReason = (lines: string[], id: string): string => lines.find((l) => new RegExp(`^ {2}(GO|NO-GO|n/a) +${id} `).test(l)) ?? "";
  ok("1a · the CONTACT world (no account; a covering basis; an SMS-naming yes; the source line saved; a list of one): every applicable row GO, the control row n/a — migrations, switch, settings, source and the ledger read for real",
    onlyNoGo(contactWorld, []) && contactRows.get("control") === "n/a" && contactRows.get("migrations") === "GO" && contactRows.get("source") === "GO" && contactRows.get("test-lists") === "GO"
      && contactRows.get("in-flight") === "GO" && contactRows.get("elsewhere") === "GO"
      && has(contactWorld.lines, "transaction read-only: on") && has(contactWorld.lines, "repeatable read") && has(contactWorld.lines, "clock: the database's") && has(contactWorld.lines, "campaign A must use this list")
      && has(contactWorld.lines, "database: loopback"),
    `exit ${contactWorld.code} · NO-GO [${noGo(contactWorld.lines).join(", ")}]`, contactWorld.lines);
  ok("1a2 · ⭐ the SAVED settings are read through real jsonb: the price 7, the reserve 21,000 and the window 07:00-21:00 are what the settings and window rows judge (not the defaults 6, 20,000 and 08:00-20:00)",
    rowReason(contactWorld.lines, "settings").includes("TZS 7 per SMS") && rowReason(contactWorld.lines, "settings").includes("TZS 21,000 kept") && rowReason(contactWorld.lines, "settings").includes("07:00–21:00 EAT")
      && rowReason(contactWorld.lines, "window").includes("07:00–21:00 EAT") && rowsOf(contactWorld.lines).get("settings") === "GO",
    `settings: ${rowReason(contactWorld.lines, "settings").slice(0, 140)} · window: ${rowReason(contactWorld.lines, "window").slice(0, 100)}`, contactWorld.lines);

  await seeded("a stop on the control number", async () => {
    await q(`INSERT INTO "Suppression" (id, channel, identifier, category, reason, evidence, "recordedBy", "createdAt") VALUES ('sup_probe_ctl', 'SMS', $1, 'MARKETING', 'OPERATOR', 'probe', $2, $3)`, [W.CONTROL.key, OFFICER, iso(NOW - 30 * DAY)]);
  });
  const withControl = await runPre(preArgv([`--control=${W.CONTROL.raw}`]));
  ok("1b · a named control WITH an active stop is GO on its row", onlyNoGo(withControl, []) && rowsOf(withControl.lines).get("control") === "GO", `exit ${withControl.code}`, withControl.lines);
  const noStop = await runPre(preArgv([`--control=0688 000 333`]));
  ok("1c · a named control with NO stop is NO-GO on its row alone", onlyNoGo(noStop, ["control"]), `exit ${noStop.code} · [${noGo(noStop.lines).join(", ")}]`, noStop.lines);

  const closesAt = NOW + 5_400_000;
  await seeded("an open live-switch row (jsonb)", async () => {
    await q(`INSERT INTO "SystemConfig" (key, value, "updatedAt") VALUES ($1, $2::jsonb, now())`, [SWITCH_KEY, json({ enabledBy: "ops", enabledAt: iso(NOW - 300_000), closesAt: iso(closesAt) })]);
  });
  const openDefault = await runPre(preArgv());
  const openAsked = await runPre(preArgv(["--expect-switch=open"]));
  ok("1d · an OPEN switch row (jsonb) is NO-GO on the switch row by default, GO under --expect-switch=open, and its closing time is printed",
    onlyNoGo(openDefault, ["switch"]) && onlyNoGo(openAsked, []) && has(openAsked.lines, `OPEN until ${LIB.fmtEat(iso(closesAt))} EAT`),
    `default [${noGo(openDefault.lines).join(", ")}] · asked [${noGo(openAsked.lines).join(", ")}] exit ${openAsked.code}`, openAsked.lines);
  await q(`DELETE FROM "SystemConfig" WHERE key = $1`, [SWITCH_KEY]);
  // ⭐ the same record stored as a JSON STRING (jsonb 'string'): the app reads an object or nothing, so it is malformed - closed - and never parsed here
  await seeded("a live-switch row stored as a JSON string (jsonb)", async () => {
    await q(`INSERT INTO "SystemConfig" (key, value, "updatedAt") VALUES ($1, to_jsonb($2::text), now())`, [SWITCH_KEY, json({ enabledBy: "ops", enabledAt: iso(NOW - 300_000), closesAt: iso(closesAt) })]);
  });
  const asText = await runPre(preArgv());
  const asTextOpen = await runPre(preArgv(["--expect-switch=open"]));
  ok("1d2 · a switch row stored as a JSON STRING reads as malformed (closed), as the app reads it: GO by default, NO-GO on the switch row when open is expected",
    onlyNoGo(asText, []) && onlyNoGo(asTextOpen, ["switch"]) && has(asText.lines, "not in a shape the reader accepts"),
    `default [${noGo(asText.lines).join(", ")}] · open asked [${noGo(asTextOpen.lines).join(", ")}]`, asText.lines);
  await q(`DELETE FROM "SystemConfig" WHERE key = $1`, [SWITCH_KEY]);

  // the ACCOUNT world: an account holds the number (its own yes is newer than the officer's), linked to the book row
  await seeded("an account holding the number, its own yes, linked to the book row", async () => {
    await q(`INSERT INTO "User" (id, "phoneE164", role, status, "marketingOptIn", dob, "updatedAt") VALUES ('usr_probe_holder', $1, 'PLAYER', 'ACTIVE', true, '1990-01-01T00:00:00Z', now())`, [`+${W.TEST.key}`]);
    await q(`UPDATE "MarketingContact" SET "userId" = 'usr_probe_holder' WHERE id = $1`, [CONTACT]);
    await seedLedger("led_probe_0004", "GIVEN", "PROFILE", NOW - 4 * DAY, null, W.SMS_WORDING, false);
  });
  const accountWorld = await runPre(preArgv());
  ok("1e · with an ACCOUNT holding the number (switch on, adult, active, an SMS-naming yes) the pre-flight is GO on the account branch",
    onlyNoGo(accountWorld, []) && has(accountWorld.lines, "ACCOUNT branch"), `exit ${accountWorld.code} · [${noGo(accountWorld.lines).join(", ")}]`, accountWorld.lines);
  await q(`UPDATE "User" SET "marketingOptIn" = false WHERE id = 'usr_probe_holder'`);
  const switchOff = await runPre(preArgv());
  ok("1f · the account's own switch off is NO-GO on test-consent alone (the cycle row is GO: the link's yes switches it on again)", onlyNoGo(switchOff, ["test-consent"]), `[${noGo(switchOff.lines).join(", ")}]`, switchOff.lines);
  await q(`UPDATE "User" SET "marketingOptIn" = true WHERE id = 'usr_probe_holder'`);

  // ⭐ the licence-outreach record, OPEN, read through real jsonb (after 1f: with the record open the port's judgement of a switched-off account is not the question here)
  await seeded("the licence-outreach record, open (jsonb)", async () => { await seedOutreach(); });
  const outreachOpen = await runPre(preArgv());
  ok("1j · ⭐ the SAVED licence-outreach record is read through real jsonb: OPEN - the consent rows say so, and the source row now also wants adult.test (saved: GO)",
    onlyNoGo(outreachOpen, []) && has(outreachOpen.lines, "licence outreach: open") && has(outreachOpen.lines, "(licence outreach is open)"),
    `[${noGo(outreachOpen.lines).join(", ")}]`, outreachOpen.lines);

  // ⭐ NOTHING ELSE CAN SEND: a campaign that is not the drive's own, in each status the real enum has (the `"status"::text IN (...)` meets a real enum)
  await seeded("a stranger's campaign", () => seedCampaign(STRANGER, NOW - 600_000, "RUNNING"));
  const statuses: Array<[string, boolean]> = [["CONFIRMED", true], ["PREPARING", true], ["RUNNING", true], ["PAUSED", true], ["DRAFT", false], ["DONE", false], ["CANCELLED", false]];
  const flightBad: string[] = [];
  for (const [status, flies] of statuses) {
    await q(`UPDATE "SmsCampaign" SET status = $2::"SmsCampaignStatus" WHERE id = $1`, [STRANGER, status]);
    const r = await runPre(preArgv());
    const named = await runPre(preArgv([`--drive-campaign=${STRANGER}`]));
    const wantNoGo = flies ? ["in-flight"] : [];
    if (!onlyNoGo(r, wantNoGo) || !onlyNoGo(named, []) || (flies && !(has(r.lines, STRANGER) && has(r.lines, status)))) flightBad.push(`${status}: [${noGo(r.lines).join(", ")}] named [${noGo(named.lines).join(", ")}]`);
  }
  ok("1k · ⭐ a campaign other than the drive's own that could send (CONFIRMED, PREPARING, RUNNING, PAUSED) is NO-GO on in-flight alone, named with its id and status; DRAFT, DONE and CANCELLED are not; named with --drive-campaign it is the drive's own and the row is GO",
    flightBad.length === 0, `wrong [${flightBad.join("; ")}]`);
  await q(`DELETE FROM "SmsCampaign" WHERE id = $1`, [STRANGER]);

  // ⭐ NOTHING ELSE IS SENDING: a MARKETING message to ANOTHER number in the last day (one 40 hours ago is not counted)
  await seeded("a marketing message to another number 40 hours ago", () => seedMessage({ ref: "sms_probe_elsewhere_old_0000", targetType: "SmsCampaignRecipient", targetId: "rcp_probe_elsewhere", status: "DELIVERED", receipt: "DELIVRD", at: NOW - 40 * 3_600_000, msisdn: W.OTHER_KEY }));
  const oldOnly = await runPre(preArgv());
  await seeded("a marketing message to another number 2 hours ago", () => seedMessage({ ref: "sms_probe_elsewhere_new_0000", targetType: "SmsCampaignRecipient", targetId: "rcp_probe_elsewhere", status: "DELIVERED", receipt: "DELIVRD", at: NOW - 2 * 3_600_000, msisdn: W.OTHER_KEY }));
  const recent = await runPre(preArgv());
  ok("1l · ⭐ a MARKETING message created in the last 24 hours to a number but the test number is NO-GO on elsewhere alone (the count, in SQL); one 40 hours old is not counted",
    onlyNoGo(oldOnly, []) && onlyNoGo(recent, ["elsewhere"]) && has(recent.lines, "1 MARKETING message was created"),
    `old only [${noGo(oldOnly.lines).join(", ")}] · recent [${noGo(recent.lines).join(", ")}]`, recent.lines);
  await q(`DELETE FROM "SmsMessage" WHERE reference IN ('sms_probe_elsewhere_old_0000', 'sms_probe_elsewhere_new_0000')`);

  // a SECOND member on the drive list: a campaign to it would message them too
  await seeded("a second contact on the drive list", async () => {
    await q(`INSERT INTO "MarketingContact" (id, msisdn, "rawInput", ndc, source, "consentState") VALUES ($1, $2, $3, '68', 'OPERATOR', 'GIVEN')`, [CONTACT_2, W.OTHER_KEY, "typed by an officer"]);
    await q(`INSERT INTO "ContactListMember" ("listId", "contactId", "addedAt") VALUES ($1, $2, $3)`, [LIST, CONTACT_2, iso(NOW - DAY)]);
  });
  const crowded = await runPre(preArgv());
  ok("1g · a SECOND member on the drive list is NO-GO on test-lists alone, and the reason says the list must hold the test number alone",
    onlyNoGo(crowded, ["test-lists"]) && has(crowded.lines, "must hold the test number alone"), `[${noGo(crowded.lines).join(", ")}]`, crowded.lines);
  await q(`DELETE FROM "ContactListMember" WHERE "contactId" = $1`, [CONTACT_2]);
  await q(`DELETE FROM "MarketingContact" WHERE id = $1`, [CONTACT_2]);

  // the saved wordings (the source line): gone, the row says so; back, it is GO
  await q(`DELETE FROM "SystemConfig" WHERE key = $1`, [WORDINGS_KEY]);
  const noWordings = await runPre(preArgv());
  ok("1h · with no saved wordings the SOURCE row alone is NO-GO", onlyNoGo(noWordings, ["source"]) && has(noWordings.lines, "no source line is saved"), `[${noGo(noWordings.lines).join(", ")}]`, noWordings.lines);
  await seeded("the saved wordings, back", async () => { await seedWordings(); });

  // the ledger file: created only on purpose
  const lost = await runPre(preArgv(), { text: null });
  const fresh = await runPre(preArgv(["--new-ledger"]), { text: null });
  const refused = await runPre(preArgv(["--new-ledger"]));
  ok("1i · a MISSING ledger file is NO-GO on ledger alone; --new-ledger makes it GO; --new-ledger over a ledger that exists is NO-GO on ledger alone",
    onlyNoGo(lost, ["ledger"]) && onlyNoGo(fresh, []) && has(fresh.lines, "a NEW ledger") && onlyNoGo(refused, ["ledger"]),
    `missing [${noGo(lost.lines).join(", ")}] · new [${noGo(fresh.lines).join(", ")}] · over an existing one [${noGo(refused.lines).join(", ")}]`, [...lost.lines, ...refused.lines]);

  // ⭐ the window's margin, judged against the SAVED window: 60 minutes by default, --min-window=0 asks only that it is open, 720 asks for twelve hours of it
  const marginDefault = await runPre(preArgv());
  const marginZero = await runPre(preArgv(["--min-window=0"]));
  const marginHuge = await runPre(preArgv(["--min-window=720"]));
  const winMark = (r: Ran): string => rowsOf(r.lines).get("window") ?? "none";
  ok("1m · the window row: GO only inside the SAVED 07:00-21:00 with 60 minutes left by default, --min-window=0 asks only that it is open, --min-window=720 asks for twelve hours of it",
    winMark(marginDefault) === (windowOpen(60) ? "GO" : "NO-GO") && winMark(marginZero) === (windowOpen(0) ? "GO" : "NO-GO") && winMark(marginHuge) === (windowOpen(720) ? "GO" : "NO-GO"),
    `default ${winMark(marginDefault)} (expected ${windowOpen(60) ? "GO" : "NO-GO"}) · 0: ${winMark(marginZero)} · 720: ${winMark(marginHuge)} · at ${LIB.fmtEat(NOW).slice(11, 16)} EAT`, [rowReason(marginDefault.lines, "window"), rowReason(marginHuge.lines, "window")]);

  /* ── 2 · the evidence: A, the stop, B, the gate removed, the resume, C ── */
  // eight audit rows of the live switch FIRST, so a campaign's rows later straddle seq 9 and 10
  await seeded("eight live-switch audit rows (seq 1 to 8)", async () => {
    for (let i = 1; i <= 8; i++) await seedSwitchAudit(i, NOW - 40 * DAY + i * 3_600_000);
  });
  const aStart = NOW - 3 * 3_600_000;
  await seeded("campaign A: the row, the recipient, the composer test and the campaign's message, four audit rows", async () => {
    await seedCampaign(CAMP_A, aStart, "DONE", 1, LIB.DRIVE_CAMPAIGN_NAMES.A);
    await seedRecipient({ id: "rcp_probe_a", campaign: CAMP_A, status: "DELIVERED", ref: "sms_aaaaaaaaaaaaaaaaaaaaaaaa", token: "ABCD2345", claimedAt: aStart + 2000, sentAt: aStart + 4000, deliveredAt: aStart + 9000 });
    await seedMessage({ ref: "sms_aaaaaaaaaaaaaaaaaaaaaaaa", targetType: "SmsCampaignRecipient", targetId: "rcp_probe_a", status: "DELIVERED", receipt: "DELIVRD", at: aStart + 3000 });
    await seedMessage({ ref: "sms_tttttttttttttttttttttttt", targetType: "SmsCampaignTest", targetId: CAMP_A, status: "ACCEPTED", at: aStart - 300_000 });
    await seedCampaignAudit(CAMP_A, "marketing.campaign_test", "ADMIN", OFFICER, { variant: "SW", outcome: "handed_over", target: "own" }, aStart - 300_000);
    await seedCampaignAudit(CAMP_A, "marketing.campaign_confirmed", "COMPLIANCE", OFFICER, { count: 1, tier: "ENUMERATE" }, aStart - 60_000);
    await seedCampaignAudit(CAMP_A, "marketing.campaign_started", "ADMIN", OFFICER, { count: 1, estimateSegments: 1, freshCount: 1, shrunkBy: 0 }, aStart);
    await seedCampaignAudit(CAMP_A, "marketing.campaign_finished", "SYSTEM", null, { DELIVERED: 1 }, aStart + 10_000);
  });
  const argsA = [CAMP_A, `--test=${W.TEST.raw}`, "--expect=delivered:test", "--expect-sends=2", "--expect-audit=marketing.campaign_confirmed", "--expect-audit=marketing.campaign_started", "--expect-audit=marketing.campaign_finished", "--label=A", "--show-stop-link"];
  // step 2's shape: the very first evidence run, with no ledger file yet — --new-ledger creates it, with the count
  const brandNew: LedgerState = { text: null };
  const created = await runEv([...argsA, "--new-ledger"], brandNew);
  const createdTotal = (() => { const p = LIB.parseLedger(brandNew.text); return p.ok ? LIB.ledgerTotal(p.ledger) : -1; })();
  ok("2a-new · the FIRST evidence run, with no ledger file and --new-ledger, creates the ledger with the count (2 of 6); the same run without the flag stops (exit 2)",
    created.code === 0 && createdTotal === 2 && (await runEv(argsA, { text: null })).code === 2, `exit ${created.code} · counted ${createdTotal}`, created.lines);
  const evA = await runEv(argsA);
  ok("2a · campaign A on Postgres: PROVEN (delivered:test, 2 chargeable sends, the audit rows), the stop link printed once, every message 'to the test number: yes', the ledger counts 2",
    evA.code === 0 && has(evA.lines, "RESULT: PROVEN") && evA.lines.filter((l) => l.includes("/s/ABCD2345")).length === 1 && has(evA.lines, "2 of 6 chargeable sends counted")
      && has(evA.lines, "to the test number: yes") && has(evA.lines, "TO THE TEST NUMBER    clear") && has(evA.lines, "ONE MESSAGE PER ROW   clear") && has(evA.lines, "NO OTHER MARKETING SMS clear")
      && has(evA.lines, "database: loopback"),
    `exit ${evA.code}`, evA.lines);
  // ⭐ the audience, read BEFORE a Start: A is confirmed for 1 person
  const audOk = await runEv([CAMP_A, `--test=${W.TEST.raw}`, "--look", "--expect-audience=1"]);
  const audWrong = await runEv([CAMP_A, `--test=${W.TEST.raw}`, "--look", "--expect-audience=2"]);
  ok("2a2 · ⭐ --look --expect-audience on Postgres: A is confirmed for 1 person (exit 0, says so); expecting 2 is exit 1 with DO NOT PRESS START",
    audOk.code === 0 && has(audOk.lines, "the audience is the 1 expected") && audWrong.code === 1 && has(audWrong.lines, "DO NOT PRESS START"), `ok exit ${audOk.code} · wrong exit ${audWrong.code}`, [...audOk.lines, ...audWrong.lines]);

  // the stop made on the stop link's page, after A's message (no SMS carries the link since 2026-10-09: the drive opens it from the row)
  const stopAt = NOW - 2 * 3_600_000;
  await seeded("the stop link's two acts: the stop and the withdrawal", async () => {
    await q(`INSERT INTO "Suppression" (id, channel, identifier, category, reason, evidence, "createdAt") VALUES ('sup_probe_test', 'SMS', $1, 'MARKETING', 'WITHDRAWN', 'optout:ref_probe_a', $2)`, [W.TEST.key, iso(stopAt)]);
    await seedLedger("led_probe_0002", "WITHDRAWN", "OPT_OUT_PAGE", stopAt, "optout:ref_probe_a", "Acha ofa na habari kwa SMS", false);
  });
  const evStopped = await runEv([CAMP_A, `--test=${W.TEST.raw}`, "--expect=delivered:test", "--expect=stopped:test", "--expect-sends=2", "--label=A"]);
  ok("2b · the stop tap, read back: A is still PROVEN and `stopped:test` holds (an active stop from the link, after A's message)", evStopped.code === 0 && has(evStopped.lines, "RESULT: PROVEN"), `exit ${evStopped.code}`, evStopped.lines);

  const bStart = NOW - 3_600_000;
  await seeded("campaign B: the stopped number skipped, three audit rows", async () => {
    await seedCampaign(CAMP_B, bStart, "DONE", 1, LIB.DRIVE_CAMPAIGN_NAMES.B);
    await seedRecipient({ id: "rcp_probe_b", campaign: CAMP_B, status: "SKIPPED", ref: null, token: "ABCD2345", skip: "suppressed", detail: "suppressed withdrawn", claimedAt: bStart + 2000 });
    await seedCampaignAudit(CAMP_B, "marketing.campaign_confirmed", "COMPLIANCE", OFFICER, { count: 1, tier: "ENUMERATE" }, bStart - 60_000);
    await seedCampaignAudit(CAMP_B, "marketing.campaign_started", "ADMIN", OFFICER, { count: 1, estimateSegments: 1, freshCount: 1, shrunkBy: 0 }, bStart);
    await seedCampaignAudit(CAMP_B, "marketing.campaign_finished", "SYSTEM", null, { SKIPPED: 1 }, bStart + 10_000);
  });
  const evB = await runEv([CAMP_B, `--test=${W.TEST.raw}`, "--expect=skipped:test", "--expect=stopped:test", "--expect-sends=0", "--expect-audit=marketing.campaign_finished", "--label=B"]);
  ok("2c · campaign B on Postgres: PROVEN — SKIPPED `suppressed`, nothing on the wire, zero sends", evB.code === 0 && has(evB.lines, "RESULT: PROVEN"), `exit ${evB.code}`, evB.lines);

  // ⭐ THE GATE REMOVED — the stopped number is SENT in a campaign that began after the stop
  const xStart = NOW - 1_800_000;
  await seeded("campaign X: the stopped number SENT (the gate removed)", async () => {
    await seedCampaign(CAMP_X, xStart);
    await seedRecipient({ id: "rcp_probe_x", campaign: CAMP_X, status: "SENT", ref: "sms_xxxxxxxxxxxxxxxxxxxxxxxx", token: "ABCD2345", claimedAt: xStart + 2000, sentAt: xStart + 4000 });
    await seedMessage({ ref: "sms_xxxxxxxxxxxxxxxxxxxxxxxx", targetType: "SmsCampaignRecipient", targetId: "rcp_probe_x", status: "ACCEPTED", at: xStart + 3000 });
    // the ENGINE's own pause of this campaign (a SYSTEM row, no actor, another reason): the same action as the officer's, and not the Pause button
    await seedCampaignAudit(CAMP_X, "marketing.campaign_paused", "SYSTEM", null, { reason: "rail_dead" }, xStart + 500);
  });
  const evX = await runEv([CAMP_X, `--test=${W.TEST.raw}`, "--expect=skipped:test", "--label=X"]);
  ok("2d · ⭐ THE GATE REMOVED on Postgres: the stopped number SENT — skipped:test FAILS, a stop VIOLATION is named, the exit is 1, NOT PROVEN",
    evX.code === 1 && has(evX.lines, "NOT refused") && has(evX.lines, "VIOLATION — ") && has(evX.lines, "RESULT: NOT PROVEN"), `exit ${evX.code}`, evX.lines);
  const lookX = await runEv([CAMP_X, `--test=${W.TEST.raw}`, "--look"]);
  ok("2d-look · the same campaign LOOKED at (no verdict asked) still exits 1, and the RESULT line says VIOLATION", lookX.code === 1 && has(lookX.lines, "RESULT: LOOK ONLY") && has(lookX.lines, "BUT 1 VIOLATION"), `exit ${lookX.code}`, lookX.lines);
  const pauseX = await runEv([CAMP_X, `--test=${W.TEST.raw}`, "--expect-audit=marketing.campaign_paused"]);
  ok("2d2 · ⭐ the engine's own pause is NOT the officer's: --expect-audit=marketing.campaign_paused FAILS on a campaign that only the engine paused, and says why",
    pauseX.code === 1 && has(pauseX.lines, "EXPECT audit marketing.campaign_paused  FAILS — 0 rows of E24 on this campaign counting as the OFFICER's pause") && has(pauseX.lines, "1 other row of that action is not it"),
    `exit ${pauseX.code}`, pauseX.lines);

  // "Start them again", then C
  const resumeAt = NOW - 1_200_000;
  const cStart = NOW - 600_000;
  await seeded("the resume (the stop lifted from the link, the yes written) and campaign C: delivered, paused and resumed", async () => {
    await q(`UPDATE "Suppression" SET "liftedAt" = $1, "liftedReason" = 'optout:ref_probe_c' WHERE id = 'sup_probe_test'`, [iso(resumeAt)]);
    await seedLedger("led_probe_0003", "GIVEN", "OPT_OUT_PAGE", resumeAt, "optout:ref_probe_c", W.RESUME_WORDING, false);
    await seedCampaign(CAMP_C, cStart, "DONE", 1, LIB.DRIVE_CAMPAIGN_NAMES.C);
    await seedRecipient({ id: "rcp_probe_c", campaign: CAMP_C, status: "DELIVERED", ref: "sms_cccccccccccccccccccccccc", token: "ABCD2345", claimedAt: cStart + 2000, sentAt: cStart + 4000, deliveredAt: cStart + 9000 });
    await seedMessage({ ref: "sms_cccccccccccccccccccccccc", targetType: "SmsCampaignRecipient", targetId: "rcp_probe_c", status: "DELIVERED", receipt: "DELIVRD", at: cStart + 3000 });
    await seedCampaignAudit(CAMP_C, "marketing.campaign_started", "ADMIN", OFFICER, { count: 1, estimateSegments: 1, freshCount: 1, shrunkBy: 0 }, cStart);
    await seedCampaignAudit(CAMP_C, "marketing.campaign_paused", "ADMIN", OFFICER, { reason: "officer_paused" }, cStart + 500);
    await seedCampaignAudit(CAMP_C, "marketing.campaign_resumed", "ADMIN", OFFICER, { requeuedHeld: 0, to: "RUNNING" }, cStart + 800);
    await seedCampaignAudit(CAMP_C, "marketing.campaign_finished", "SYSTEM", null, { DELIVERED: 1 }, cStart + 10_000);
  });
  const evC = await runEv([CAMP_C, `--test=${W.TEST.raw}`, "--expect=delivered:test", "--expect=resumed:test", "--expect-sends=1", "--expect-audit=marketing.campaign_paused", "--expect-audit=marketing.campaign_resumed", "--label=C"]);
  ok("2e · campaign C after 'Start them again': PROVEN (delivered, the stop lifted from the link, the pause and the resume in E24)", evC.code === 0 && has(evC.lines, "RESULT: PROVEN"), `exit ${evC.code}`, evC.lines);
  const table = await runEv(["--ledger"]);
  const tooMany = await runEv(["--ledger", "--sends=3"]);
  ok("2f · the ledger: A 2 + B 0 + X 1 (the removed gate's send is counted too) + C 1 = 4 of 6 counted; 3 more would pass the cap and exit 1",
    table.code === 0 && has(table.lines, "counted 4") && tooMany.code === 1 && has(tooMany.lines, "REFUSED"), `table exit ${table.code} · --sends=3 exit ${tooMany.code}`, [...table.lines, ...tooMany.lines]);

  // ⭐ NOTHING ELSE IS SENDING, on the evidence side too: a recent MARKETING message to ANOTHER number turns a look of ANY campaign to exit 1
  await seeded("a marketing message to another number, one hour ago", () => seedMessage({ ref: "sms_probe_elsewhere_ev_0000", targetType: "SmsCampaignRecipient", targetId: "rcp_probe_elsewhere", status: "DELIVERED", receipt: "DELIVRD", at: NOW - 3_600_000, msisdn: W.OTHER_KEY }));
  const elsewhereLook = await runEv([CAMP_A, `--test=${W.TEST.raw}`, "--look"]);
  await q(`DELETE FROM "SmsMessage" WHERE reference = 'sms_probe_elsewhere_ev_0000'`);
  const elsewhereGone = await runEv([CAMP_A, `--test=${W.TEST.raw}`, "--look"]);
  ok("2g · ⭐ a MARKETING message of the last day to another number: the look at campaign A exits 1 (NO OTHER MARKETING SMS: VIOLATION); with it gone the same look exits 0",
    elsewhereLook.code === 1 && has(elsewhereLook.lines, "VIOLATION — 1 MARKETING message created in the last 24 hours went to a number that is NOT the test number") && has(elsewhereLook.lines, "BUT 1 VIOLATION") && elsewhereGone.code === 0,
    `with it ${elsewhereLook.code} · without ${elsewhereGone.code}`, elsewhereLook.lines);

  // ⭐ SENT AS WRITTEN on Postgres (the owner's ruling of 2026-10-09): the drive's message and nothing after it, by the length the database
  // keeps. A's messages were clear; a campaign whose one message is 49 characters longer (the old footer appended) makes a look exit 1.
  // (On a throwaway ledger: the drive's own counts stay as 2f read them.)
  const CAMP_F = "cmp_u52a_probe_ffff";
  const fStart = NOW - 300_000;
  await seeded("campaign F: one message 49 characters longer than the drive's message (the old footer appended)", async () => {
    await seedCampaign(CAMP_F, fStart, "DONE", 1, "U52a probe F (a footer)");
    await seedRecipient({ id: "rcp_probe_f", campaign: CAMP_F, status: "DELIVERED", ref: "sms_ffffffffffffffffffffffff", token: "ABCD2345", claimedAt: fStart + 2000, sentAt: fStart + 4000, deliveredAt: fStart + 9000, bodyLen: AS_SENT + 49 });
    await seedMessage({ ref: "sms_ffffffffffffffffffffffff", targetType: "SmsCampaignRecipient", targetId: "rcp_probe_f", status: "DELIVERED", receipt: "DELIVRD", at: fStart + 3000, bodyLen: AS_SENT + 49 });
  });
  const lookF = await runEv([CAMP_F, `--test=${W.TEST.raw}`, "--look"], { text: LIB.serializeLedger(LIB.emptyLedger()) });
  ok("2h · ⭐ SENT AS WRITTEN on Postgres: campaign A's messages read clear, and a message 49 characters longer than the drive's message (the old footer) makes a look exit 1 with the VIOLATION named",
    evA.code === 0 && has(evA.lines, "SENT AS WRITTEN       clear") && lookF.code === 1
      && has(lookF.lines, "VIOLATION — 1 campaign message is not as long as the drive's message with its name filled in") && has(lookF.lines, "BUT 1 VIOLATION"),
    `A exit ${evA.code} · F look exit ${lookF.code}`, lookF.lines);

  /* ── 3 · the types the tools read, and the order they read in ── */
  await seeded("four more live-switch audit rows (the switch now has twelve)", async () => {
    for (let i = 9; i <= 12; i++) await seedSwitchAudit(i, NOW - 40 * DAY + i * 3_600_000);
  });
  {
    const prisma = new PrismaClient();
    try {
      const pf = await LIB.readOnlyTransaction(prisma, (tx: unknown) => PRE.readPreflightFacts(tx, { testKey: W.TEST.key, controlKey: W.CONTROL.key }));
      const ef = await LIB.readOnlyTransaction(prisma, (tx: unknown) => EV.readEvidenceFacts(tx, { campaignId: CAMP_A, testKey: W.TEST.key, controlKey: W.CONTROL.key, wantToken: true }));
      const isDate = (v: unknown): boolean => v instanceof Date;
      ok("3a · the pre-flight's facts have the types the tools assume (booleans, Dates, numbers, text; no bigint; the database's clock a Date)",
        isDate(pf.now) && typeof pf.migrations[0].finished === "boolean" && isDate(pf.test.contact.created_at) && typeof pf.test.lists[0].members === "number" && isDate(pf.test.lists[0].added_at)
          && typeof pf.test.latest.recorded_by_officer === "boolean" && typeof pf.test.latest.via_link === "boolean" && isDate(pf.test.latest.created_at)
          && pf.test.user !== null && typeof pf.test.user.opt_in === "boolean" && isDate(pf.test.user.dob) && Array.isArray(pf.test.campaigns)
          && pf.test.lists[0].basis !== null && typeof pf.test.lists[0].basis.revoked === "boolean" && isDate(pf.test.lists[0].basis.recorded_at) && pf.control !== null
          && pf.test.suppressions.length === 1 && isDate(pf.test.suppressions[0].lifted_at) && typeof pf.config[LIB.KEY_WORDINGS] === "object"
          && typeof pf.config[LIB.KEY_SETTINGS] === "object" && typeof pf.config[LIB.KEY_OUTREACH] === "object"
          && Array.isArray(pf.inFlight) && typeof pf.elsewhere === "number",
        `${pf.migrations.length} migrations`);
      ok("3b · the evidence's facts have the types the tools assume (seq as text, jsonb as objects, counts as numbers, stamps as Dates, to_test a boolean)",
        isDate(ef.now) && typeof ef.campaign.status === "string" && isDate(ef.campaign.started_at) && typeof ef.audit[0].seq === "string" && typeof ef.audit[0].payload === "object"
          && typeof ef.recipientCounts[0].n === "number" && typeof ef.messageCounts[0].n === "number" && Array.isArray(ef.recipients[0].gate_trail)
          && isDate(ef.recipients[0].claimed_at) && typeof ef.recipients[0].attempts === "number" && typeof ef.recipients[0].has_token === "boolean"
          && typeof ef.messages[0].balance_tzs === "string" && ef.stopToken === "ABCD2345" && typeof ef.people.test.suppressions[0].via_link === "boolean"
          && typeof ef.campaign.estimate_tzs === "string" && ef.messages.every((m: { to_test: unknown }) => typeof m.to_test === "boolean") && ef.testMessages.every((m: { to_test: unknown }) => typeof m.to_test === "boolean")
          && typeof ef.elsewhere === "number" && typeof ef.campaign.audience_count === "number",
        `${ef.audit.length} audit rows`);

      // ⭐ THE ORDER — campaign A's four rows straddle seq 9 and 10; the switch has twelve rows and the tool shows eight
      const wantA = await numericSeqs(`"targetType" = 'SmsCampaign' AND "targetId" = $1`, [CAMP_A]);
      const gotA = (ef.audit as Array<{ seq: string }>).map((a) => Number(a.seq));
      const straddles = new Set(wantA.map((n) => String(n).length)).size > 1;
      ok("3c · ⭐ the campaign's audit rows come back in NUMERIC seq order across the 9 to 10 boundary (not text order)",
        json(gotA) === json(wantA) && gotA.length === 4,
        `tool [${gotA.join(", ")}] · numeric [${wantA.join(", ")}]${straddles ? "" : " · NOTE these rows do not straddle a digit boundary on this cluster, so the check cannot tell text order from numeric order"}`);
      const allSwitch = await numericSeqs(`"targetType" = 'SystemConfig' AND "targetId" = $1`, [SWITCH_KEY]);
      const wantSwitch = [...allSwitch].sort((a, b) => b - a).slice(0, 8);
      const textTop8 = allSwitch.map(String).sort().reverse().slice(0, 8).map(Number);
      const gotSwitch = (ef.switchAudit as Array<{ seq: string }>).map((a) => Number(a.seq));
      ok("3d · ⭐ the live switch's newest eight are the eight with the greatest seq, newest first (twelve exist)",
        allSwitch.length === 12 && json(gotSwitch) === json(wantSwitch),
        `tool [${gotSwitch.join(", ")}] · numeric [${wantSwitch.join(", ")}]${json(textTop8) === json(wantSwitch) ? " · NOTE text order would give the same eight on this cluster, so the check cannot tell them apart" : ""}`);

      // for the record: what the server does with the bare name over the aliased text (informational, never a verdict)
      const bare = (await q(`SELECT "seq"::text AS seq FROM "AuditLog" WHERE "targetType" = 'SmsCampaign' AND "targetId" = $1 ORDER BY "seq"`, [CAMP_A])).rows.map((r) => Number(r.seq));
      console.log(`INFO a bare ORDER BY "seq" over the aliased cast returned [${bare.join(", ")}] — ${json(bare) === json(wantA) ? "numeric here (the qualified name is still the safe spelling)" : "TEXT ORDER, as PostgreSQL documents: the reason the tool qualifies the column"}`);
    } finally {
      await prisma.$disconnect();
    }
  }

  /* ── 4 · read only ── */
  {
    const c2 = new pg.Client({ connectionString: URL_ });
    await c2.connect();
    let code = "";
    try {
      await c2.query("BEGIN");
      await c2.query("SET TRANSACTION READ ONLY");
      await c2.query(`INSERT INTO "SystemConfig" (key, value, "updatedAt") VALUES ('probe.should.not.exist', '1'::jsonb, now())`);
    } catch (err) {
      code = String((err as { code?: string }).code ?? "");
    } finally {
      await c2.query("ROLLBACK").catch(() => undefined);
      await c2.end();
    }
    ok("4a · a write inside a transaction set READ ONLY is refused by the database itself (25006)", code === "25006", `code ${code}`);
  }
  {
    const prisma = new PrismaClient();
    let said = "";
    try {
      await LIB.readOnlyTransaction(prisma, (tx: { $queryRaw: (s: TemplateStringsArray, ...v: unknown[]) => Promise<unknown> }) =>
        tx.$queryRaw`INSERT INTO "SystemConfig" ("key", "value", "updatedAt") VALUES ('probe.should.not.exist', '1'::jsonb, now())`);
    } catch (err) {
      said = String((err as Error).message ?? err);
    } finally {
      await prisma.$disconnect();
    }
    const left = Number((await q(`SELECT count(*) AS n FROM "SystemConfig" WHERE key = 'probe.should.not.exist'`)).rows[0].n);
    ok("4b · a write handed to the shipped helper's $queryRaw is refused by the database and leaves no row", /25006|read-only/i.test(said) && left === 0, `refused ${/25006|read-only/i.test(said)} · rows left ${left}`);
  }
  {
    const prisma = new PrismaClient();
    let seen: { iso: string; ro: string } | null = null;
    try {
      const rows = await LIB.readOnlyTransaction(prisma, (tx: { $queryRaw: (s: TemplateStringsArray, ...v: unknown[]) => Promise<Array<{ iso: string; ro: string }>> }) =>
        tx.$queryRaw`SELECT current_setting('transaction_isolation') AS iso, current_setting('transaction_read_only') AS ro`);
      seen = rows[0] ?? null;
    } finally {
      await prisma.$disconnect();
    }
    ok("4c · the shipped helper's transaction really is REPEATABLE READ and READ ONLY on the server", seen !== null && seen.iso === "repeatable read" && seen.ro === "on", `isolation ${seen?.iso} · read only ${seen?.ro}`);
  }
  {
    const before = await fingerprints();
    await runPre(preArgv([`--control=${W.CONTROL.raw}`]));
    await runPre(preArgv(["--expect-switch=open"]));
    await runEv([CAMP_A, `--test=${W.TEST.raw}`, "--look"]);
    await runEv([CAMP_B, `--test=${W.TEST.raw}`, "--look", "--show-stop-link"]);
    await runEv([CAMP_X, `--test=${W.TEST.raw}`, "--expect=skipped:test"]);
    const after = await fingerprints();
    const moved = Object.keys(after).filter((t) => after[t] !== before[t]);
    ok("4d · ⭐ a run of each tool, several ways, changes not one row of any table (a content fingerprint of every table is equal before and after)", moved.length === 0 && Object.keys(before).length > 60,
      `${Object.keys(before).length} tables fingerprinted · moved [${moved.join(", ")}]`);
  }

  /* ── 5 · what was printed ── */
  {
    const dbPieces = [URL_];
    try { const u = new URL(URL_); if (u.password) dbPieces.push(u.password); if (u.username.length >= 4) dbPieces.push(u.username); } catch { /* not a URL */ }
    const stripped = SEEN.map((l) => l.replace(new RegExp("[0-9]{14}_[a-z_0-9]+", "g"), "migration").replace(new RegExp("sms_[0-9a-z]+", "g"), "ref"));
    const numberRes = [new RegExp("[+]?255 ?[67][0-9]{8}"), new RegExp("(^|[^0-9A-Za-z_])0[67][0-9]{8}($|[^0-9])"), new RegExp("(^|[^0-9A-Za-z_])[67][0-9]{8}($|[^0-9A-Za-z_])")];
    const leaks = stripped.filter((l) => numberRes.some((re) => re.test(l)) || OWN_KEYS.some((k) => l.includes(k) || l.includes(k.slice(3))));
    const addr = SEEN.filter((l) => dbPieces.some((p) => p.length >= 4 && l.includes(p)));
    ok("5 · nothing printed holds a whole number, the database address, its password or its user", leaks.length === 0 && addr.length === 0 && SEEN.length > 100,
      `${SEEN.length} lines swept · numbers ${leaks.length} · address ${addr.length}`);
  }
} catch (err) {
  if (err instanceof SeedStop) console.log(`${NL}stopped at the first refused seed (${(err as Error).message}) — the checks after it were not run`);
  else {
    fail++;
    console.log(`FAIL the probe itself threw: ${String((err as Error).message ?? err).split(NL)[0]}`);
  }
} finally {
  await client.end();
}

console.log(`${NL}marketing-u52a-pg-probe: ${pass} passed, ${fail} failed`);
process.exitCode = fail === 0 && pass > 0 ? 0 : 1;
