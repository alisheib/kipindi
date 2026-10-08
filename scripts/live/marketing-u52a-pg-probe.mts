/**
 * U52a · THE TWO LIVE TOOLS ON A REAL POSTGRES — the pre-flight and the campaign evidence, run END TO END through a real Prisma
 * client against a scratch PostgreSQL 18.3 migrated from empty and seeded with the drive's whole story (spec
 * `docs/marketing-specs/ENGINE-SPEC.md` §4.18, "AS BUILT — the run sheet").
 *
 * ⭐ WHY THIS EXISTS. `test:marketing-preflight` runs both tools over a stand-in database that answers each tagged SELECT from a
 * plain object: it proves the rules, the exit codes, the masks and the read-only first statement, and it checks every table and
 * column the SQL names against `schema.prisma` — but it cannot say whether Postgres PARSES the statements, whether an enum
 * compares to the text it is cast to, whether `jsonb` comes back as an object, a `bigint` as text, a `count(*)` as a number,
 * how a bare name in ORDER BY resolves, or whether the READ ONLY transaction really refuses a write. Those are facts about the
 * database. This probe asks them, with the SHIPPED tools and the SHIPPED helper, so the first live pre-flight is not the first
 * time the SQL runs.
 *
 *   0  the cluster is migrated: every migration the pre-flight names is finished in `_prisma_migrations`, the live switch row is
 *      absent, and no row anywhere names the probe's made-up numbers;
 *   1  the CONTACT world (no account holds the number; a covering list basis; an SMS-naming yes): the pre-flight is GO on every
 *      applicable row, the control row n/a without a control; a control WITH an active stop is GO, one without is NO-GO on its
 *      row alone; an open switch row (jsonb) is NO-GO by default and GO under --expect-switch=open; an ACCOUNT holding the
 *      number is GO on the account branch, and its own switch off is NO-GO on test-consent alone;
 *   2  the evidence on campaign A (the composer test + one delivered send, the stop link shown once), the stop tapped, B
 *      (SKIPPED `suppressed`, zero sends), ⭐ THE GATE REMOVED (the stopped number SENT: skipped:test FAILS, VIOLATION named,
 *      exit 1) and C (after "Start them again"): every verdict and exit code as the run sheet says; the ledger counts 4 and
 *      refuses 3 more;
 *   3  the TYPES the tools read (booleans, Dates, numbers with no bigint, `seq` as text, jsonb as objects, the gate trail an
 *      array) and ⭐ THE ORDER: the audit rows of a campaign come back in NUMERIC seq order across the 9 to 10 boundary, and the
 *      live switch's "newest eight" are the eight with the greatest seq (a bare ORDER BY on the aliased text would sort them
 *      as text — the probe prints what the server does with that, for the record);
 *   4  ⭐ READ ONLY: a write inside a transaction set READ ONLY is refused by the database itself (25006), a write handed to the
 *      shipped helper's `$queryRaw` is refused the same way and leaves no row, and a content fingerprint of EVERY table is
 *      identical before and after a run of each tool;
 *   5  nothing printed holds a whole number, the database address, its password or its user.
 *
 * ⛔ A LOOPBACK CLUSTER ONLY: it writes rows. ⛔ No backslash anywhere in this file (the editing tools decode escapes).
 * ⛔ The AuditLog rows are raw inserts with made-up unique hashes (the chain is not verified here; the tools never read a hash).
 *
 * ⚠️ WRITTEN WITHOUT A DATABASE (U52a was built with none): its seeds were checked by eye against `schema.prisma` and the
 * migrations, the file was parsed, and nothing more — it has NEVER RUN. How to read a failure:
 *   · a line starting `SEED ·` means the probe's OWN row was refused by Postgres — fix the probe's seed, the tools are not in it;
 *   · any other FAIL, with the seeds accepted, is a finding about a tool's SQL or a rule — fix the tool, and add the claim to
 *     `test:marketing-preflight` so the suite holds it from then on. `U52A_SHOW=1` prints every line each run printed.
 *
 * Run (through the heavy-node lock; it boots the scratch cluster):
 *   npm run db:probe-marketing-u52a   (db-scratch boots Postgres; scripts/live/pg-probe-run.mts migrates it and runs this probe)
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
const NOW = W.NOW;
const DAY = 86_400_000;
const SEEN: string[] = [];
const OWN_KEYS: string[] = [W.TEST.key, W.CONTROL.key, W.OTHER_KEY];

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

let ledgerText: string | null = null;
const ledgerIo = () => ({ read: () => ledgerText, write: (t: string) => { ledgerText = t; } });

type Ran = { code: number; lines: string[] };
async function runPre(argv: string[]): Promise<Ran> {
  const lines: string[] = [];
  const code = await PRE.runPreflight(argv, {
    env: { DATABASE_URL: URL_ },
    sink: (l: string) => lines.push(l),
    now: () => NOW,
    fetch: W.fakeFetch(W.goodPreWorld()),
    ledgerIo,
    makePrisma: async () => new PrismaClient(),
    timeoutMs: 3000,
  });
  SEEN.push(...lines);
  if (SHOW_ALL) console.log(`      ~ pre-flight · exit ${code} · ${lines.length} lines`);
  return { code, lines };
}
async function runEv(argv: string[]): Promise<Ran> {
  const lines: string[] = [];
  const code = await EV.runEvidence(argv, {
    env: { DATABASE_URL: URL_ },
    sink: (l: string) => lines.push(l),
    now: () => NOW,
    ledgerIo,
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

/* ══ THE SEEDS ═══════════════════════════════════════════════════════════════════════════════════════════════════════ */

const LIST = "lst_u52a_probe_0001";
const CONTACT = "ct_u52a_probe_0001";
const BASIS = `lb_${"a".repeat(20)}`;
const CAMP_A = "cmp_u52a_probe_aaaa";
const CAMP_B = "cmp_u52a_probe_bbbb";
const CAMP_X = "cmp_u52a_probe_xxxx";
const CAMP_C = "cmp_u52a_probe_cccc";
const OFFICER = "usr_u52a_probe_officer";
const SWITCH_KEY = "marketing.sms.live";
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
/** One MessagingConsent row for the test number. An officer's entry carries a recorder; the person's own act and the link carry none. */
async function seedLedger(id: string, status: string, source: string, at: number, evidence: string | null, wording: string, byOfficer: boolean): Promise<void> {
  await q(
    `INSERT INTO "MessagingConsent" (id, channel, identifier, category, status, source, wording, locale, evidence, "recordedBy", "createdAt")
     VALUES ($1, 'SMS', $2, 'MARKETING', $3, $4, $5, 'SW', $6, $7, $8)`,
    [id, W.TEST.key, status, source, wording, evidence, byOfficer ? OFFICER : null, iso(at)],
  );
}
async function seedCampaign(id: string, startedAt: number): Promise<void> {
  await q(
    `INSERT INTO "SmsCampaign" (id, name, status, "bodySw", "codingSw", "segmentsSw", "audienceFilter", "audienceCount", "confirmTier", "estimateSegments", "estimateTzs", "budgetTzs",
       "enqueueCursor", "enqueuedAt", "createdBy", "confirmedBy", "confirmedAt", "startedAt", "finishedAt", "createdAt")
     VALUES ($1, 'U52a probe', 'DONE', '50pick probe', 'GSM7', 1, 'list', 1, 'ENUMERATE', 1, 6, 10000, 'done', $2, $3, $3, $4, $5, $6, $7)`,
    [id, iso(startedAt + 1000), OFFICER, iso(startedAt - 60_000), iso(startedAt), iso(startedAt + 10_000), iso(startedAt - 600_000)],
  );
}
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
async function seedRecipient(o: { id: string; campaign: string; status: string; ref: string | null; token: string; skip?: string; detail?: string; claimedAt: number; sentAt?: number; deliveredAt?: number }): Promise<void> {
  const skipped = o.status === "SKIPPED";
  await q(
    `INSERT INTO "SmsCampaignRecipient" (id, "campaignId", msisdn, status, "smsReference", "optOutToken", locale, "skipReason", "skipDetail", "claimToken", "claimedAt", attempts, segments, "bodyLen", "gateTrail", "sentAt", "deliveredAt")
     VALUES ($1, $2, $3, $4, $5, $6, 'SW', $7, $8, $9, $10, 0, $11, $12, $13::jsonb, $14, $15)`,
    [
      o.id, o.campaign, W.TEST.key, o.status, o.ref, skipped ? null : o.token, o.skip ?? null, o.detail ?? null, `clm_${o.id}`, iso(o.claimedAt),
      skipped ? null : 1, skipped ? null : 87,
      json([{ check: "gate", verdict: o.skip ?? "ok", wording: null, source: o.skip ? null : "CONSENT:ledger:probe" }]),
      o.sentAt === undefined ? null : iso(o.sentAt), o.deliveredAt === undefined ? null : iso(o.deliveredAt),
    ],
  );
}
async function seedMessage(o: { ref: string; targetType: string; targetId: string; status: string; receipt?: string; at: number }): Promise<void> {
  await q(
    `INSERT INTO "SmsMessage" (reference, msisdn, purpose, provider, "senderId", "bodyLen", status, "dlrStatus", "dlrDesc", "providerMsg", attempts, "targetType", "targetId", "createdAt", "sentAt", "deliveredAt", "balanceTzs")
     VALUES ($1, $2, 'MARKETING', 'blackball', 'probe', 87, $3, $4, $5, 'Message sent', 0, $6, $7, $8, $9, $10, 49994)`,
    [o.ref, W.TEST.key, o.status, o.receipt ?? null, o.receipt ? "Delivered" : null, o.targetType, o.targetId, iso(o.at), iso(o.at + 1000), o.status === "DELIVERED" ? iso(o.at + 6000) : null],
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
  const switchRows = Number((await q(`SELECT count(*) AS n FROM "SystemConfig" WHERE key = $1`, [SWITCH_KEY])).rows[0].n);
  const otherConfig = (await q(`SELECT key FROM "SystemConfig" WHERE key IN ('marketing.sms.settings', 'marketing.outreach.licence', 'marketing.wordings') ORDER BY key`)).rows.map((r) => String(r.key));
  ok("0 · the cluster is migrated (every migration the pre-flight names is finished), the live switch row is absent and no row names the probe's numbers",
    missing.length === 0 && heldBefore === 0 && switchRows === 0, `missing [${missing.join(", ")}] · rows naming the numbers ${heldBefore} · switch rows ${switchRows}`);
  if (otherConfig.length > 0) console.log(`INFO the cluster already holds config rows [${otherConfig.join(", ")}] — they are read by the pre-flight and may change what is GO below`);

  /* ── 1 · the pre-flight ── */
  await seeded("the contact book (list, contact, membership, a covering basis)", seedBook);
  await seeded("the ledger: an officer's yes naming SMS", () => seedLedger("led_probe_0001", "GIVEN", "OPERATOR", NOW - 5 * DAY, null, W.SMS_WORDING, true));
  const contactWorld = await runPre(preArgv());
  const contactRows = rowsOf(contactWorld.lines);
  ok("1a · the CONTACT world (no account; a covering basis; an SMS-naming yes): every applicable row GO, the control row n/a, exit 0 — migrations, switch and settings read for real",
    contactWorld.code === 0 && noGo(contactWorld.lines).length === 0 && contactRows.get("control") === "n/a" && contactRows.get("migrations") === "GO" && has(contactWorld.lines, "transaction read-only: on"),
    `exit ${contactWorld.code} · NO-GO [${noGo(contactWorld.lines).join(", ")}]`, contactWorld.lines);

  await seeded("a stop on the control number", async () => {
    await q(`INSERT INTO "Suppression" (id, channel, identifier, category, reason, evidence, "recordedBy", "createdAt") VALUES ('sup_probe_ctl', 'SMS', $1, 'MARKETING', 'OPERATOR', 'probe', $2, $3)`, [W.CONTROL.key, OFFICER, iso(NOW - 30 * DAY)]);
  });
  const withControl = await runPre(preArgv([`--control=${W.CONTROL.raw}`]));
  ok("1b · a named control WITH an active stop is GO on its row, exit 0", withControl.code === 0 && rowsOf(withControl.lines).get("control") === "GO", `exit ${withControl.code}`, withControl.lines);
  const noStop = await runPre(preArgv([`--control=0688 000 333`]));
  ok("1c · a named control with NO stop is NO-GO on its row alone, exit 1", noStop.code === 1 && json(noGo(noStop.lines)) === json(["control"]), `exit ${noStop.code} · [${noGo(noStop.lines).join(", ")}]`, noStop.lines);

  await seeded("an open live-switch row (jsonb)", async () => {
    await q(`INSERT INTO "SystemConfig" (key, value, "updatedAt") VALUES ($1, $2::jsonb, now())`, [SWITCH_KEY, json({ enabledBy: "ops", enabledAt: iso(NOW - 300_000), closesAt: iso(NOW + 5_400_000) })]);
  });
  const openDefault = await runPre(preArgv());
  const openAsked = await runPre(preArgv(["--expect-switch=open"]));
  ok("1d · an OPEN switch row (jsonb) is NO-GO on the switch row by default, GO under --expect-switch=open, and its closing time is printed",
    json(noGo(openDefault.lines)) === json(["switch"]) && noGo(openAsked.lines).length === 0 && openAsked.code === 0 && has(openAsked.lines, "OPEN until 2026-10-09 12:00:00 EAT"),
    `default [${noGo(openDefault.lines).join(", ")}] · asked [${noGo(openAsked.lines).join(", ")}] exit ${openAsked.code}`, openAsked.lines);
  await q(`DELETE FROM "SystemConfig" WHERE key = $1`, [SWITCH_KEY]);

  // the ACCOUNT world: an account holds the number (its own yes is newer than the officer's), linked to the book row
  await seeded("an account holding the number, its own yes, linked to the book row", async () => {
    await q(`INSERT INTO "User" (id, "phoneE164", role, status, "marketingOptIn", dob, "updatedAt") VALUES ('usr_probe_holder', $1, 'PLAYER', 'ACTIVE', true, '1990-01-01T00:00:00Z', now())`, [`+${W.TEST.key}`]);
    await q(`UPDATE "MarketingContact" SET "userId" = 'usr_probe_holder' WHERE id = $1`, [CONTACT]);
    await seedLedger("led_probe_0004", "GIVEN", "PROFILE", NOW - 4 * DAY, null, W.SMS_WORDING, false);
  });
  const accountWorld = await runPre(preArgv());
  ok("1e · with an ACCOUNT holding the number (switch on, adult, active, an SMS-naming yes) the pre-flight is GO on the account branch",
    accountWorld.code === 0 && has(accountWorld.lines, "ACCOUNT branch"), `exit ${accountWorld.code} · [${noGo(accountWorld.lines).join(", ")}]`, accountWorld.lines);
  await q(`UPDATE "User" SET "marketingOptIn" = false WHERE id = 'usr_probe_holder'`);
  const switchOff = await runPre(preArgv());
  ok("1f · the account's own switch off is NO-GO on test-consent alone (the cycle row is GO: the link's yes switches it on again)", json(noGo(switchOff.lines)) === json(["test-consent"]), `[${noGo(switchOff.lines).join(", ")}]`, switchOff.lines);
  await q(`UPDATE "User" SET "marketingOptIn" = true WHERE id = 'usr_probe_holder'`);

  /* ── 2 · the evidence: A, the stop, B, the gate removed, the resume, C ── */
  // eight audit rows of the live switch FIRST, so a campaign's rows later straddle seq 9 and 10
  await seeded("eight live-switch audit rows (seq 1 to 8)", async () => {
    for (let i = 1; i <= 8; i++) await seedSwitchAudit(i, NOW - 40 * DAY + i * 3_600_000);
  });
  const aStart = NOW - 3 * 3_600_000;
  await seeded("campaign A: the row, the recipient, the composer test and the campaign's message, four audit rows", async () => {
    await seedCampaign(CAMP_A, aStart);
    await seedRecipient({ id: "rcp_probe_a", campaign: CAMP_A, status: "DELIVERED", ref: "sms_aaaaaaaaaaaaaaaaaaaaaaaa", token: "ABCD2345", claimedAt: aStart + 2000, sentAt: aStart + 4000, deliveredAt: aStart + 9000 });
    await seedMessage({ ref: "sms_aaaaaaaaaaaaaaaaaaaaaaaa", targetType: "SmsCampaignRecipient", targetId: "rcp_probe_a", status: "DELIVERED", receipt: "DELIVRD", at: aStart + 3000 });
    await seedMessage({ ref: "sms_tttttttttttttttttttttttt", targetType: "SmsCampaignTest", targetId: CAMP_A, status: "ACCEPTED", at: aStart - 300_000 });
    await seedCampaignAudit(CAMP_A, "marketing.campaign_test", "ADMIN", OFFICER, { variant: "SW", outcome: "handed_over", target: "own" }, aStart - 300_000);
    await seedCampaignAudit(CAMP_A, "marketing.campaign_confirmed", "COMPLIANCE", OFFICER, { count: 1, tier: "ENUMERATE" }, aStart - 60_000);
    await seedCampaignAudit(CAMP_A, "marketing.campaign_started", "ADMIN", OFFICER, { count: 1, estimateSegments: 1, freshCount: 1, shrunkBy: 0 }, aStart);
    await seedCampaignAudit(CAMP_A, "marketing.campaign_finished", "SYSTEM", null, { DELIVERED: 1 }, aStart + 10_000);
  });
  const evA = await runEv([CAMP_A, `--test=${W.TEST.raw}`, "--expect=delivered:test", "--expect-sends=2", "--expect-audit=marketing.campaign_confirmed", "--expect-audit=marketing.campaign_started", "--expect-audit=marketing.campaign_finished", "--label=A", "--show-stop-link"]);
  ok("2a · campaign A on Postgres: PROVEN (delivered:test, 2 chargeable sends, the audit rows), the stop link printed once, the ledger counts 2",
    evA.code === 0 && has(evA.lines, "RESULT: PROVEN") && evA.lines.filter((l) => l.includes("/s/ABCD2345")).length === 1 && has(evA.lines, "2 of 6 chargeable sends counted"),
    `exit ${evA.code}`, evA.lines);

  // the stop link tapped, after A's message
  const stopAt = NOW - 2 * 3_600_000;
  await seeded("the stop link's two acts: the stop and the withdrawal", async () => {
    await q(`INSERT INTO "Suppression" (id, channel, identifier, category, reason, evidence, "createdAt") VALUES ('sup_probe_test', 'SMS', $1, 'MARKETING', 'WITHDRAWN', 'optout:ref_probe_a', $2)`, [W.TEST.key, iso(stopAt)]);
    await seedLedger("led_probe_0002", "WITHDRAWN", "OPT_OUT_PAGE", stopAt, "optout:ref_probe_a", "Acha ofa na habari kwa SMS", false);
  });
  const evStopped = await runEv([CAMP_A, `--test=${W.TEST.raw}`, "--expect=delivered:test", "--expect=stopped:test", "--expect-sends=2", "--label=A"]);
  ok("2b · the stop tap, read back: A is still PROVEN and `stopped:test` holds (an active stop from the link, after A's message)", evStopped.code === 0 && has(evStopped.lines, "RESULT: PROVEN"), `exit ${evStopped.code}`, evStopped.lines);

  const bStart = NOW - 3_600_000;
  await seeded("campaign B: the stopped number skipped, three audit rows", async () => {
    await seedCampaign(CAMP_B, bStart);
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
  });
  const evX = await runEv([CAMP_X, `--test=${W.TEST.raw}`, "--expect=skipped:test", "--label=X"]);
  ok("2d · ⭐ THE GATE REMOVED on Postgres: the stopped number SENT — skipped:test FAILS, a stop VIOLATION is named, the exit is 1, NOT PROVEN",
    evX.code === 1 && has(evX.lines, "NOT refused") && has(evX.lines, "VIOLATION — ") && has(evX.lines, "RESULT: NOT PROVEN"), `exit ${evX.code}`, evX.lines);

  // "Start them again", then C
  const resumeAt = NOW - 1_200_000;
  const cStart = NOW - 600_000;
  await seeded("the resume (the stop lifted from the link, the yes written) and campaign C: delivered, paused and resumed", async () => {
    await q(`UPDATE "Suppression" SET "liftedAt" = $1, "liftedReason" = 'optout:ref_probe_c' WHERE id = 'sup_probe_test'`, [iso(resumeAt)]);
    await seedLedger("led_probe_0003", "GIVEN", "OPT_OUT_PAGE", resumeAt, "optout:ref_probe_c", W.RESUME_WORDING, false);
    await seedCampaign(CAMP_C, cStart);
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
      ok("3a · the pre-flight's facts have the types the tools assume (booleans, Dates, numbers, text; no bigint)",
        typeof pf.migrations[0].finished === "boolean" && isDate(pf.test.contact.created_at) && typeof pf.test.lists[0].members === "number" && isDate(pf.test.lists[0].added_at)
          && typeof pf.test.latest.recorded_by_officer === "boolean" && typeof pf.test.latest.via_link === "boolean" && isDate(pf.test.latest.created_at)
          && pf.test.user !== null && typeof pf.test.user.opt_in === "boolean" && isDate(pf.test.user.dob) && Array.isArray(pf.test.campaigns)
          && pf.test.lists[0].basis !== null && typeof pf.test.lists[0].basis.revoked === "boolean" && isDate(pf.test.lists[0].basis.recorded_at) && pf.control !== null
          && pf.test.suppressions.length === 1 && isDate(pf.test.suppressions[0].lifted_at),
        `${pf.migrations.length} migrations`);
      ok("3b · the evidence's facts have the types the tools assume (seq as text, jsonb as objects, counts as numbers, stamps as Dates)",
        typeof ef.campaign.status === "string" && isDate(ef.campaign.started_at) && typeof ef.audit[0].seq === "string" && typeof ef.audit[0].payload === "object"
          && typeof ef.recipientCounts[0].n === "number" && typeof ef.messageCounts[0].n === "number" && Array.isArray(ef.recipients[0].gate_trail)
          && isDate(ef.recipients[0].claimed_at) && typeof ef.recipients[0].attempts === "number" && typeof ef.recipients[0].has_token === "boolean"
          && typeof ef.messages[0].balance_tzs === "string" && ef.stopToken === "ABCD2345" && typeof ef.people.test.suppressions[0].via_link === "boolean"
          && typeof ef.campaign.estimate_tzs === "string",
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
    const before = await fingerprints();
    await runPre(preArgv([`--control=${W.CONTROL.raw}`]));
    await runPre(preArgv(["--expect-switch=open"]));
    await runEv([CAMP_A, `--test=${W.TEST.raw}`, "--look"]);
    await runEv([CAMP_B, `--test=${W.TEST.raw}`, "--look", "--show-stop-link"]);
    await runEv([CAMP_X, `--test=${W.TEST.raw}`, "--expect=skipped:test"]);
    const after = await fingerprints();
    const moved = Object.keys(after).filter((t) => after[t] !== before[t]);
    ok("4c · ⭐ a run of each tool, several ways, changes not one row of any table (a content fingerprint of every table is equal before and after)", moved.length === 0 && Object.keys(before).length > 60,
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
