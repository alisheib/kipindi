/**
 * U52a · THE CAMPAIGN EVIDENCE — a read-only look at one campaign of the live drive, and the verdict on what it was given to
 * prove (spec `docs/marketing-specs/ENGINE-SPEC.md` §4.18 decisions 3, 5 and 6; the run sheet is "AS BUILT — the run sheet").
 *
 *   railway run --service 50pick npm run -s ops:marketing-campaign-evidence -- <campaignId> --test=+255… [--control=+255…]
 *                                              --expect=sent:test[,skipped:control]  [--expect-sends=<n>]
 *                                              [--expect-audit=<marketing.* action>]… [--expect-audience=<n>]
 *                                              [--label=A] [--show-stop-link] [--new-ledger]
 *   … -- <campaignId> --test=+255… --look [--expect-audience=1]
 *                                             (look only, no verdict — but a violation below still exits 1, and so does an audience that is
 *                                              not the one expected: the sheet runs it BEFORE every Start)
 *   … -- --ledger [--sends=<n>]               (the ledger alone; needs no database)
 *   (from the checkout production runs; `-s` keeps npm from echoing the typed number in its banner)
 *
 * ⭐ WHAT IT SHOWS: the campaign's status and stop reason; its recipient rows (MASKED numbers) with status, skip reason, failure
 * class, references; the matching `SmsMessage` rows with their receipt tokens (and the composer test's); the audit rows of E24
 * (the officer's id, never a name or number); the slice timings — and it says plainly that the engine RECORDS NO gate or send
 * milliseconds (they go to the page's driver and are not kept), so what it shows is what the row stamps give; and
 * ⭐ THE DISCRIMINATION TABLE for the people it was given.
 *
 * ⭐ IT EXITS NON-ZERO UNLESS THE REFUSAL IT IS GIVEN TO PROVE IS THERE (decision 5: the refusal is the evidence, not the send).
 * `--expect` is a list of `<outcome>:<who>`, who = test | control:
 *     sent      the row is SENT or DELIVERED and a message of it is on the wire
 *     delivered the row is DELIVERED (a receipt moved it)
 *     skipped   the row is SKIPPED `suppressed` — a refusal by the stop, with NO message on the wire (`skipped=<reason>` names
 *               another reason; a refusal for the wrong reason proves nothing about the stop)
 *     stopped   the drive's stop step: an active stop made on the stop link's page after this campaign's message — link-only on
 *               purpose (a stop made another way is not that step); not E30, whose figure counts every way (re-ruled 2026-10-09)
 *     resumed   their stop was lifted from the link ("Start them again"): the ledger's newest row is theirs, GIVEN
 *   (⛔ No SMS carries the link since the owner's ruling of 2026-10-09: the drive opens `/s/<token>` from the test number's
 *   recipient row, which `--show-stop-link` prints.)
 * A MISSING ROW IS NEVER A REFUSAL: a person who is not on the campaign fails every outcome but `stopped`/`resumed`. With the gate
 * removed, `skipped:test` fails because the row is SENT. ⛔ And whatever was asked — a verdict OR a look — these are violations
 * that turn the exit non-zero by themselves: a message handed to a number AFTER its stop was in force; a recipient row with MORE
 * THAN ONE chargeable message (the engine sends one per row; a first attempt the gateway refused, which never left, is not one); a
 * message to any number that is not the test number (the composer's tests included — the SQL selects only whether each one went to
 * the test number, never the number); ⭐ ANY MARKETING message created in the last day to a number but the test number, of ANY
 * campaign (counted in SQL: nothing else can be sending while the switch is open); ⭐ a message of a length the drive's message
 * cannot have with a name filled in (SENT AS WRITTEN — no body is stored: it catches a footer like the old one, never the words);
 * ⭐ and a campaign whose four stored message fields are not the drive's, character for character (DRIVE'S MESSAGE — compared in
 * SQL with the owner's words of 2026-10-09 bound as values; no body is selected).
 * ⭐ `--expect-audience=<n>` judges the campaign's CONFIRMED count (the people the confirmation fixed): before a Start it reads 1, or the
 * Start is not pressed. ⭐ `--expect-audit=marketing.campaign_paused` proves the OFFICER's Pause - a row with an actor and the reason
 * `officer_paused` - not the engine's own pause, which is the same action.
 *
 * ⭐ THE LEDGER (decision 6): every run counts the campaign's chargeable sends — the composer test's and the campaign's — into
 * `.qa-shots/marketing-setup/U52a/ledger.json` (gitignored). The cap is SIX and a seventh is REFUSED: the ledger is not
 * updated, the exit is non-zero, and the run stops there. The file's ABSOLUTE path and last write are printed every run. A file
 * that is MISSING stops the run (exit 2) unless `--new-ledger` says the drive has not begun — for its first runs only; the flag is
 * refused once a ledger exists, and no label or outcome reaches the file without the number wall.
 *
 * ⛔ READ ONLY BY CONSTRUCTION (one `SET TRANSACTION READ ONLY` transaction, REPEATABLE READ, read back; every time rule on the
 * database's own clock). ⛔ NO NUMBER IS PRINTED WHOLE (the repo's mask, and an output filter behind it), no person's name, no
 * secret, no `ip` or `userAgent`. The stop link's token is a bearer link for the test number: it is selected, and printed,
 * ONLY under `--show-stop-link`. It makes no network call at all.
 *
 * Exit: 0 every expectation holds and the ledger took the count · 1 not proven, a violation, the ledger refused, or no such
 * campaign · 2 not run (usage, no database, the database would not confirm read-only, an untrusted or missing ledger file).
 */
import { boot, isMain } from "../lib/marketing-u52a-boot.mjs";

/* ══ BEFORE ANYTHING ELSE IS LOADED ══════════════════════════════════════════════════════════════════════════════════ */
// ⭐ The public proxy FIRST, then the checkout check, then the core by a DYNAMIC import (a static import is evaluated before this
// file's first line — the marketing referee-keys door was built on the private host that way, 70e9ba96). See marketing-u52a-boot.mjs.
// `isMain` compares REAL paths: through a junction or a symlink the program's path and this file's URL differ, and a plain comparison
// would turn the tool into a silent no-op (exit 0, nothing printed).
const AS_MAIN = isMain(import.meta.url);
if (AS_MAIN) {
  const booted = boot(import.meta.url);
  if (!booted.ok) {
    console.log(`REFUSING: ${booted.problem}`);
    await new Promise((done) => process.stdout.write("", () => { process.exit(2); done(undefined); }));
  }
}
const LIB = await import("../lib/marketing-u52a.mjs");

const { EXIT, SEND_CAP } = LIB;
/** The drive's message (the owner's words of 2026-10-09) — BOUND as values in the campaign read, which compares the stored
 *  fields with it and selects only the yes/no (DRIVE'S MESSAGE); its words are never selected or printed. */
const DRIVE = LIB.DRIVE_MESSAGE;

const USAGE = [
  "usage: railway run --service 50pick npm run -s ops:marketing-campaign-evidence -- <campaignId> --test=+255… [--control=+255…] --expect=<outcome>:<who>[,…]",
  "                                                  [--expect-sends=<n>] [--expect-audit=<action>[,…]] [--expect-audience=<n>] [--label=<A|B|C|…>]",
  "                                                  [--show-stop-link] [--new-ledger]",
  "       … -- <campaignId> --test=+255… --look [--expect-audience=<n>]",
  "       … -- --ledger [--sends=<n>] [--new-ledger]",
  "  outcomes: sent · delivered · skipped (the stop) · skipped=<reason> · stopped · resumed      who: test · control",
].join("\n");

/** Value flags are taken ONCE (a second `--test` is refused, never silently ignored); only `--expect` and `--expect-audit` may be repeated. */
export const EVIDENCE_FLAGS = Object.freeze({
  values: ["test", "control", "expect", "expect-sends", "expect-audit", "expect-audience", "label", "sends"],
  flags: ["show-stop-link", "look", "ledger", "new-ledger"],
  positional: 1,
  repeat: ["expect", "expect-audit"],
});

// ⭐ Every skip reason the real gate has (`MarketingSkipReason`, consent.ts) - `agent_referee` (U33r) included: the pre-flight does not judge
// that exclusion (§4.18), so the evidence must be able to NAME it (`--expect=skipped=agent_referee:test`) and says what it means.
const GATE_REASONS = Object.freeze([
  "bad_msisdn", "suppressed", "no_consent", "consent_withdrawn", "rg_self_excluded", "rg_cooling_off", "rg_harm_marker",
  "rg_under25_history", "age_minor", "age_unknown", "account_status", "no_basis", "agent_referee",
]);
const OUTCOMES = Object.freeze(["sent", "delivered", "skipped", "stopped", "resumed"]);

/* ══ THE ARGUMENTS ═══════════════════════════════════════════════════════════════════════════════════════════════════ */

/** `--expect` text to expectations; a token this grammar does not know is a usage error, never skipped over. */
export function parseExpect(values) {
  const out = [];
  const problems = [];
  for (const raw of values ?? []) {
    for (const piece of String(raw).split(",")) {
      const token = piece.trim();
      if (token === "") continue;
      const m = /^([a-z]+)(?:=([a-z_0-9]+))?:(test|control)$/.exec(token);
      if (!m || !OUTCOMES.includes(m[1])) { problems.push("--expect holds a token that is not <outcome>:<who>"); continue; }
      const [, outcome, reason, who] = m;
      if (reason !== undefined && (outcome !== "skipped" || !GATE_REASONS.includes(reason))) { problems.push("--expect names a skip reason the gate does not have"); continue; }
      const e = { outcome, who, reason: outcome === "skipped" ? (reason ?? "suppressed") : null };
      if (!out.some((x) => x.outcome === e.outcome && x.who === e.who && x.reason === e.reason)) out.push(e);
    }
  }
  return { expectations: out, problems };
}

export function parseEvidenceArgs(argv, lib = LIB) {
  const f = lib.parseFlags(argv, EVIDENCE_FLAGS);
  const problems = [...f.problems];
  const one = (name) => (f.values[name] ?? [])[0];
  const ledgerMode = f.flags.has("ledger");
  if (ledgerMode) {
    for (const name of ["test", "control", "expect", "expect-sends", "expect-audit", "expect-audience", "label"]) if (one(name) !== undefined) problems.push(`--${name} does not go with --ledger`);
    for (const flag of ["show-stop-link", "look"]) if (f.flags.has(flag)) problems.push(`--${flag} does not go with --ledger`);
    if (f.positional.length > 0) problems.push("--ledger takes no campaign id");
    let sends = 0;
    if (one("sends") !== undefined) {
      if (/^[0-9]$/.test(one("sends")) && Number(one("sends")) <= SEND_CAP) sends = Number(one("sends"));
      else problems.push(`--sends must be a whole number from 0 to ${SEND_CAP}`);
    }
    return problems.length ? { ok: false, problems } : { ok: true, args: { mode: "ledger", sends, newLedger: f.flags.has("new-ledger") } };
  }
  if (one("sends") !== undefined) problems.push("--sends goes with --ledger only");
  let campaignId = null;
  if (f.positional.length === 0) problems.push("the campaign id is required (or --ledger)");
  else if (lib.isCampaignId(f.positional[0])) campaignId = f.positional[0];
  else problems.push("the campaign id is not an id (8 to 64 letters, digits, - or _, with a letter in it — never a phone number)");
  let test = null;
  let control = null;
  if (one("test") !== undefined) { const t = lib.parseNumberArg("test", one("test")); if (t.ok) test = t; else problems.push(t.problem); }
  if (one("control") !== undefined) { const c = lib.parseNumberArg("control", one("control")); if (c.ok) control = c; else problems.push(c.problem); }
  if (test && control && test.key === control.key) problems.push("--test and --control are the same number");
  const exp = parseExpect(f.values.expect);
  problems.push(...exp.problems);
  for (const e of exp.expectations) {
    if (e.who === "test" && !test) { problems.push("--expect names the test number but --test was not given"); break; }
    if (e.who === "control" && !control) { problems.push("--expect names the control number but --control was not given"); break; }
  }
  let expectSends = null;
  if (one("expect-sends") !== undefined) {
    if (/^[0-9]$/.test(one("expect-sends")) && Number(one("expect-sends")) <= SEND_CAP) expectSends = Number(one("expect-sends"));
    else problems.push(`--expect-sends must be a whole number from 0 to ${SEND_CAP}`);
  }
  const expectAudit = [];
  for (const raw of f.values["expect-audit"] ?? []) {
    for (const piece of String(raw).split(",")) {
      const token = piece.trim();
      if (token === "") continue;
      if (/^marketing[.][a-z_]{3,48}$/.test(token)) { if (!expectAudit.includes(token)) expectAudit.push(token); } else problems.push("--expect-audit holds a token that is not a marketing.* audit action");
    }
  }
  // ⭐ the people the confirmation fixed: the sheet reads it BEFORE every Start (a campaign confirmed for the wrong list is not started)
  let expectAudience = null;
  if (one("expect-audience") !== undefined) {
    if (/^[0-9]{1,4}$/.test(one("expect-audience"))) expectAudience = Number(one("expect-audience"));
    else problems.push("--expect-audience must be a whole number of people from 0 to 9999");
  }
  const look = f.flags.has("look");
  if (look && (exp.expectations.length > 0 || expectSends !== null || expectAudit.length > 0)) problems.push("--look is a look with no verdict: it does not go with --expect, --expect-sends or --expect-audit (only --expect-audience may be asked of a look)");
  if (!look && exp.expectations.length === 0 && expectSends === null && expectAudit.length === 0 && expectAudience === null && exp.problems.length === 0 && problems.length === 0) problems.push("nothing to prove: give --expect=<outcome>:<who>, --expect-sends=<n>, --expect-audit=<action> or --expect-audience=<n>, or --look to only look");
  let label = null;
  if (one("label") !== undefined) {
    // ⛔ A label is typed text that is printed and written to the ledger file: letters and digits, never a number — no run of five
    // digits, and nothing the number wall would change.
    const typed = one("label");
    if (!/^[A-Za-z0-9 ._-]{1,12}$/.test(typed)) problems.push("--label is up to 12 letters, digits, spaces, . _ or -");
    else if (/[0-9]{5,}/.test(typed) || lib.scrubNumbers(typed) !== typed) problems.push("--label may not hold a number (no run of five digits, nothing that reads as a phone number)");
    else label = typed;
  }
  const showStopLink = f.flags.has("show-stop-link");
  if (showStopLink && !test) problems.push("--show-stop-link needs --test (the link shown is the test number's)");
  if (problems.length) return { ok: false, problems };
  return { ok: true, args: { mode: "campaign", campaignId, test, control, expectations: exp.expectations, expectSends, expectAudit, expectAudience, look, label, showStopLink, newLedger: f.flags.has("new-ledger") } };
}

/* ══ THE DATABASE READS — every statement a SELECT, the transaction read-only ════════════════════════════════════════ */

/**
 * What the evidence reads, and nothing else (no name of anyone or anything, no e-mail, no address, no message body, no `ip`, no
 * `userAgent`, no hash):
 *   now()                    the database's own clock (the report's time and the ledger's stamp are its, not this machine's)
 *   SmsCampaign              the campaign's status, stop reason, confirmation figures, officer ids and stamps (not its name); and
 *                            whether each of its four stored message fields EQUALS the drive's message — a yes/no computed in SQL,
 *                            the drive's words bound as values (DRIVE'S MESSAGE): the fields themselves are never selected
 *   SmsCampaignRecipient     this campaign's rows: status, skip reason and detail, failure class and error, attempts, reference,
 *                            whether an opt-out token exists (the token itself ONLY under --show-stop-link, for the test number),
 *                            segments, length, cost, the claim's token (to group slices, never shown), stamps, the gate trail
 *   SmsMessage               the messages of those rows and of the composer's tests: reference, whether it went to the TEST number
 *                            (a yes/no computed in SQL — never the number), purpose, status, receipt token and text, length,
 *                            stamps, the gateway's echoed balance (never the body — none is stored); and ONE COUNT of the MARKETING messages of
 *                            the last day to any number but the test number (of any campaign - counted in SQL, no number selected)
 *   AuditLog                 this campaign's rows (targetType SmsCampaign): seq, time, category, action, the officer's id, payload
 *                            (shown through an allow-list) — and the live switch's last eight rows (SystemConfig marketing.sms.live)
 *   Suppression              the named people's stops: reason, from-the-link, created, lifted
 *   MessagingConsent         the named people's ledger timeline: status, source, from-the-link, time (no wording)
 */
export async function readEvidenceFacts(tx, { campaignId, testKey, controlKey, wantToken }) {
  const clock = await tx.$queryRaw`/* u52a:now */ SELECT now() AS now`;
  // With no --test there is no test number to compare a message's recipient with: the comparison is against nothing, and the report skips it.
  const probeKey = testKey ?? "";
  const camp = await tx.$queryRaw`/* u52a:campaign */ SELECT "id", "status"::text AS status, "stopReason" AS stop_reason, "audienceCount" AS audience_count, "confirmTier" AS confirm_tier, "estimateSegments" AS estimate_segments, "estimateTzs"::text AS estimate_tzs, "budgetTzs"::text AS budget_tzs, "segmentsSw" AS segments_sw, "segmentsEn" AS segments_en, ("enqueueCursor" = 'done') AS enqueued, "createdBy" AS created_by, "confirmedBy" AS confirmed_by, "confirmedAt" AS confirmed_at, "enqueuedAt" AS enqueued_at, "startedAt" AS started_at, "pausedAt" AS paused_at, "finishedAt" AS finished_at, "createdAt" AS created_at, COALESCE("bodySw" = ${DRIVE.bodySw}, false) AS drive_body_sw, COALESCE("bodyEn" = ${DRIVE.bodyEn}, false) AS drive_body_en, COALESCE("nameFallbackSw" = ${DRIVE.nameFallbackSw}, false) AS drive_fallback_sw, COALESCE("nameFallbackEn" = ${DRIVE.nameFallbackEn}, false) AS drive_fallback_en FROM "SmsCampaign" WHERE "id" = ${campaignId}`;
  const facts = { now: clock[0] ? clock[0].now : null, campaign: camp[0] ?? null };
  if (!facts.campaign) return facts;

  facts.recipients = await tx.$queryRaw`/* u52a:recipients */ SELECT "id", "msisdn", "status"::text AS status, "skipReason" AS skip_reason, "skipDetail" AS skip_detail, "failureClass" AS failure_class, "error", "attempts", "smsReference" AS sms_reference, ("optOutToken" IS NOT NULL) AS has_token, "locale"::text AS locale, "segments", "bodyLen" AS body_len, "costTzs"::text AS cost_tzs, "claimToken" AS claim_token, "claimedAt" AS claimed_at, "sentAt" AS sent_at, "deliveredAt" AS delivered_at, "failedAt" AS failed_at, "gateTrail" AS gate_trail FROM "SmsCampaignRecipient" WHERE "campaignId" = ${campaignId} ORDER BY "id" LIMIT 41`;
  for (const key of [testKey, controlKey]) {
    if (!key || facts.recipients.some((r) => r.msisdn === key)) continue;
    const extra = await tx.$queryRaw`/* u52a:recipient-named */ SELECT "id", "msisdn", "status"::text AS status, "skipReason" AS skip_reason, "skipDetail" AS skip_detail, "failureClass" AS failure_class, "error", "attempts", "smsReference" AS sms_reference, ("optOutToken" IS NOT NULL) AS has_token, "locale"::text AS locale, "segments", "bodyLen" AS body_len, "costTzs"::text AS cost_tzs, "claimToken" AS claim_token, "claimedAt" AS claimed_at, "sentAt" AS sent_at, "deliveredAt" AS delivered_at, "failedAt" AS failed_at, "gateTrail" AS gate_trail FROM "SmsCampaignRecipient" WHERE "campaignId" = ${campaignId} AND "msisdn" = ${key}`;
    if (extra[0]) facts.recipients.push(extra[0]);
  }
  facts.recipientCounts = await tx.$queryRaw`/* u52a:recipient-counts */ SELECT "status"::text AS status, "skipReason" AS skip_reason, "failureClass" AS failure_class, count(*)::int AS n FROM "SmsCampaignRecipient" WHERE "campaignId" = ${campaignId} GROUP BY 1, 2, 3 ORDER BY 1, 2, 3`;

  facts.messages = await tx.$queryRaw`/* u52a:messages */ SELECT m."reference", (m."msisdn" = ${probeKey}) AS to_test, m."purpose"::text AS purpose, m."status"::text AS status, m."bodyLen" AS body_len, m."dlrStatus" AS dlr_status, m."dlrDesc" AS dlr_desc, m."providerMsg" AS provider_msg, m."attempts", m."targetId" AS target_id, m."createdAt" AS created_at, m."sentAt" AS sent_at, m."deliveredAt" AS delivered_at, m."failedAt" AS failed_at, m."balanceTzs"::text AS balance_tzs FROM "SmsMessage" m WHERE m."targetType" = 'SmsCampaignRecipient' AND m."targetId" IN (SELECT r."id" FROM "SmsCampaignRecipient" r WHERE r."campaignId" = ${campaignId}) ORDER BY m."createdAt", m."reference" LIMIT 201`;
  facts.messageCounts = await tx.$queryRaw`/* u52a:message-counts */ SELECT m."status"::text AS status, (m."dlrStatus" IS NOT NULL) AS has_receipt, count(*)::int AS n FROM "SmsMessage" m WHERE m."targetType" = 'SmsCampaignRecipient' AND m."targetId" IN (SELECT r."id" FROM "SmsCampaignRecipient" r WHERE r."campaignId" = ${campaignId}) GROUP BY 1, 2`;
  facts.testMessages = await tx.$queryRaw`/* u52a:test-messages */ SELECT m."reference", (m."msisdn" = ${probeKey}) AS to_test, m."purpose"::text AS purpose, m."status"::text AS status, m."bodyLen" AS body_len, m."dlrStatus" AS dlr_status, m."dlrDesc" AS dlr_desc, m."providerMsg" AS provider_msg, m."attempts", m."targetId" AS target_id, m."createdAt" AS created_at, m."sentAt" AS sent_at, m."deliveredAt" AS delivered_at, m."failedAt" AS failed_at, m."balanceTzs"::text AS balance_tzs FROM "SmsMessage" m WHERE m."targetType" = 'SmsCampaignTest' AND m."targetId" = ${campaignId} ORDER BY m."createdAt", m."reference" LIMIT 20`;
  facts.testMessageCounts = await tx.$queryRaw`/* u52a:test-message-counts */ SELECT m."status"::text AS status, (m."dlrStatus" IS NOT NULL) AS has_receipt, count(*)::int AS n FROM "SmsMessage" m WHERE m."targetType" = 'SmsCampaignTest' AND m."targetId" = ${campaignId} GROUP BY 1, 2`;

  // ⛔ ORDER BY "AuditLog"."seq", never a bare "seq": the select list ALIASES the cast as seq, and PostgreSQL reads a bare name in
  // ORDER BY as the OUTPUT column first - the text - so 10 would sort before 9 (and "the newest eight" would be the wrong eight).
  facts.audit = await tx.$queryRaw`/* u52a:audit */ SELECT "seq"::text AS seq, "createdAt" AS created_at, "category"::text AS category, "action", "actorId" AS actor_id, "payload" FROM "AuditLog" WHERE "targetType" = 'SmsCampaign' AND "targetId" = ${campaignId} ORDER BY "AuditLog"."seq" LIMIT 200`;
  facts.switchAudit = await tx.$queryRaw`/* u52a:switch-audit */ SELECT "seq"::text AS seq, "createdAt" AS created_at, "action", "payload" FROM "AuditLog" WHERE "targetType" = 'SystemConfig' AND "targetId" = 'marketing.sms.live' ORDER BY "AuditLog"."seq" DESC LIMIT 8`;

  // ⭐ NOTHING ELSE CAN BE SENDING WHILE THE SWITCH IS OPEN: one COUNT of the MARKETING messages created in the last day to any number but the
  // test number - of any campaign, this one's included. Counted in SQL; the number of a message is never selected. (No `--test`, no comparison.)
  if (testKey) {
    const elsewhere = await tx.$queryRaw`/* u52a:elsewhere */ SELECT count(*)::int AS n FROM "SmsMessage" WHERE "purpose"::text = 'MARKETING' AND "createdAt" > now() - interval '1 day' AND "msisdn" <> ${testKey}`;
    facts.elsewhere = elsewhere[0] ? elsewhere[0].n : null;
  }

  facts.people = {};
  for (const [role, key] of [["test", testKey], ["control", controlKey]]) {
    if (!key) continue;
    const suppressions = await tx.$queryRaw`/* u52a:person-suppression */ SELECT "reason"::text AS reason, COALESCE("evidence" LIKE 'optout:%', false) AS via_link, "createdAt" AS created_at, "liftedAt" AS lifted_at, COALESCE("liftedReason" LIKE 'optout:%', false) AS lifted_via_link FROM "Suppression" WHERE "channel"::text = 'SMS' AND "category"::text = 'MARKETING' AND "identifier" = ${key}`;
    const ledger = await tx.$queryRaw`/* u52a:person-ledger */ SELECT "status"::text AS status, "source"::text AS source, COALESCE("evidence" LIKE 'optout:%', false) AS via_link, "createdAt" AS created_at FROM "MessagingConsent" WHERE "channel"::text = 'SMS' AND "category"::text = 'MARKETING' AND "identifier" = ${key} ORDER BY "createdAt" DESC, "id" DESC LIMIT 50`;
    facts.people[role] = { key, suppressions, ledger };
  }
  if (wantToken && testKey) {
    const t = await tx.$queryRaw`/* u52a:token */ SELECT "optOutToken" AS token FROM "SmsCampaignRecipient" WHERE "campaignId" = ${campaignId} AND "msisdn" = ${testKey} AND "optOutToken" IS NOT NULL`;
    facts.stopToken = t[0] ? t[0].token : null;
  }
  return facts;
}

/* ══ THE JUDGEMENT — pure ════════════════════════════════════════════════════════════════════════════════════════════ */

const dash = (v) => (v === null || v === undefined || v === "" ? "—" : String(v));
const timeOf = (v) => {
  const iso = LIB.toIso(v);
  return iso === null ? "—" : LIB.fmtEat(iso).slice(11);
};
const msOf = (v) => {
  const iso = LIB.toIso(v);
  return iso === null ? Number.NaN : Date.parse(iso);
};

/** A recipient row as one outcome word: SENT · DELIVERED · SKIPPED:<reason> · FAILED:<class> · UNCONFIRMED · PENDING · HELD. */
export function outcomeOf(r) {
  if (!r) return null;
  if (r.status === "SKIPPED") return `SKIPPED:${LIB.safeText(r.skip_reason, 40)}`;
  if (r.status === "FAILED") return `FAILED:${LIB.safeText(r.failure_class, 40)}`;
  return LIB.safeText(r.status, 14);
}

const earliest = (list) => list.filter((t) => Number.isFinite(t)).reduce((a, b) => Math.min(a, b), Number.POSITIVE_INFINITY);

/**
 * When a person's message went to the wire — NaN when none did. The message rows are the evidence (they are written just
 * before the request): the earliest hand-over stamp or creation of any of them; failing those, the row's own hand-over or
 * receipt stamp; for a row left UNCONFIRMED (no stamp is kept for it), its claim. A refused or waiting row has none.
 */
export function wireAtOf(r, messages = []) {
  const fromMessages = earliest(messages.map((m) => (Number.isFinite(msOf(m.sent_at)) ? msOf(m.sent_at) : msOf(m.created_at))));
  if (Number.isFinite(fromMessages)) return fromMessages;
  if (r.status === "SENT" || r.status === "DELIVERED") return earliest([msOf(r.sent_at), msOf(r.delivered_at)]);
  if (r.status === "UNCONFIRMED") return msOf(r.claimed_at);
  return Number.NaN;
}

/**
 * When the engine BEGAN to handle a person: the claim's stamp (the slice reads the gate after it), else the earliest message.
 * ⭐ A stop in force at this instant that was followed by a message is the gate failing — not a stop that landed during the send.
 */
export function decisionAtOf(r, messages = []) {
  const claimed = msOf(r.claimed_at);
  if (Number.isFinite(claimed)) return claimed;
  const fromMessages = earliest(messages.map((m) => msOf(m.created_at)));
  return Number.isFinite(fromMessages) ? fromMessages : Number.NaN;
}

/**
 * Was a stop IN FORCE at `atMs`? ⭐ The ledger is append-only, so its newest row at that instant is the person's last word:
 * WITHDRAWN means they had said no. The `Suppression` row (one per number, re-armed rather than added to) says it too — unless a
 * GIVEN row came after it was made. Either one is enough.
 */
export function stopInForceAt(atMs, suppressions, ledger) {
  const prior = (ledger ?? []).filter((r) => msOf(r.created_at) <= atMs).sort((a, b) => msOf(b.created_at) - msOf(a.created_at));
  if (prior.length > 0 && prior[0].status === "WITHDRAWN") return { inForce: true, by: "ledger", at: msOf(prior[0].created_at) };
  for (const s of suppressions ?? []) {
    const made = msOf(s.created_at);
    const lifted = s.lifted_at === null || s.lifted_at === undefined ? Number.POSITIVE_INFINITY : msOf(s.lifted_at);
    if (made <= atMs && atMs < lifted) {
      const yesSince = prior.some((r) => r.status === "GIVEN" && msOf(r.created_at) > made);
      if (!yesSince) return { inForce: true, by: "suppression", at: made };
    }
  }
  return { inForce: false };
}

/**
 * The people this run was given (test, control), each with their row on this campaign, their messages, and their stop facts.
 * ⛔ A person with no row is `recipient: null` — and nothing downstream may read that as a refusal.
 */
export function buildPeople(facts, args) {
  const people = [];
  for (const role of ["test", "control"]) {
    const num = args[role];
    if (!num) continue;
    const recipient = facts.recipients.find((r) => r.msisdn === num.key) ?? null;
    const msgs = recipient ? facts.messages.filter((m) => m.target_id === recipient.id) : [];
    const p = facts.people[role] ?? { suppressions: [], ledger: [] };
    people.push({ role, masked: num.masked, key: num.key, recipient, messages: msgs, suppressions: p.suppressions, ledger: p.ledger });
  }
  return people;
}

/** One expectation, judged on one person. `{ holds, why }` — `why` names the fact that decided it. */
export function judgeExpectation(e, person, lib = LIB) {
  const r = person ? person.recipient : null;
  const stopsActive = person ? person.suppressions.filter((s) => s.lifted_at === null || s.lifted_at === undefined) : [];
  const newest = person && person.ledger.length ? [...person.ledger].sort((a, b) => msOf(b.created_at) - msOf(a.created_at))[0] : null;
  const label = `${e.outcome}${e.outcome === "skipped" && e.reason !== "suppressed" ? `=${e.reason}` : ""}:${e.who}`;
  if (!person) return { label, holds: false, why: `the ${e.who} number was not given` };
  if (e.outcome === "sent" || e.outcome === "delivered" || e.outcome === "skipped") {
    if (!r) return { label, holds: false, why: `the ${e.who} has NO row on this campaign — a missing row is not a refusal and not a send` };
  }
  if (e.outcome === "sent") {
    const wire = person.messages.filter((m) => m.reference === r.sms_reference && lib.isChargeable(m.status, m.dlr_status !== null && m.dlr_status !== undefined));
    const holds = (r.status === "SENT" || r.status === "DELIVERED") && wire.length > 0;
    return { label, holds, why: holds ? `the ${e.who} row is ${r.status} and its message is on the wire` : `the ${e.who} row is ${outcomeOf(r)}${(r.status === "SENT" || r.status === "DELIVERED") ? " but no message of it is on the wire" : ""}` };
  }
  if (e.outcome === "delivered") {
    const holds = r.status === "DELIVERED";
    return { label, holds, why: holds ? `a receipt moved the ${e.who} row to DELIVERED` : `the ${e.who} row is ${outcomeOf(r)}, not DELIVERED` };
  }
  if (e.outcome === "skipped") {
    const reasonOk = r.status === "SKIPPED" && r.skip_reason === e.reason;
    const noWire = person.messages.length === 0 && (r.sms_reference === null || r.sms_reference === undefined);
    const holds = reasonOk && noWire;
    if (holds) return { label, holds, why: `the ${e.who} row is SKIPPED ${e.reason} with no message on the wire — the refusal is there` };
    if (r.status === "SKIPPED" && r.skip_reason === "agent_referee" && e.reason !== "agent_referee") return { label, holds: false, why: `the ${e.who} row is SKIPPED agent_referee, not ${e.reason} — the number is kept as an agent applicant's referee (promised no marketing), so it cannot be the drive's ${e.who} number; that proves nothing about the stop` };
    if (r.status === "SKIPPED" && r.skip_reason !== e.reason) return { label, holds: false, why: `the ${e.who} row is SKIPPED for ${dash(r.skip_reason)}, not ${e.reason} — that proves nothing about the stop` };
    if (reasonOk && !noWire) return { label, holds: false, why: `the ${e.who} row is SKIPPED yet a message of it exists on the wire` };
    return { label, holds: false, why: `the ${e.who} row is ${outcomeOf(r)} — NOT refused${(r.status === "SENT" || r.status === "DELIVERED") ? ": the gate let a stopped number through" : ""}` };
  }
  if (e.outcome === "stopped") {
    // The drive's stop step: a stop AFTER this campaign's message, made on the stop link's page — an active stop from the link, and
    // the ledger's newest row that withdrawal. ⛔ Link-only on purpose: the step is made on that page, so a stop made another way
    // (an officer's, the profile switch) is not its proof. (Not E30: E30's figure, re-ruled 2026-10-09, counts every way.)
    const sentAt = r ? wireAtOf(r, person.messages) : Number.NaN;
    const active = stopsActive.find((s) => s.reason === "WITHDRAWN" && s.via_link === true);
    const lastWord = newest && newest.status === "WITHDRAWN" && newest.via_link === true ? newest : null;
    const afterMessage = !Number.isFinite(sentAt) || (lastWord !== null && msOf(lastWord.created_at) >= sentAt);
    const holds = Boolean(active) && lastWord !== null && afterMessage;
    return { label, holds, why: holds ? `the ${e.who} has an active stop made from the link${Number.isFinite(sentAt) ? ", after this campaign's message" : ""}` : `the ${e.who} has no active stop from the link that follows this campaign's message` };
  }
  // resumed · the stop was lifted from the link, and the ledger's newest row is that yes
  const stoppedBefore = person.ledger.some((l) => l.status === "WITHDRAWN" && l.via_link === true);
  const lifted = person.suppressions.some((s) => s.lifted_at !== null && s.lifted_at !== undefined && s.lifted_via_link === true) && stopsActive.length === 0;
  const lastYes = Boolean(newest && newest.status === "GIVEN" && newest.via_link === true);
  const holds = stoppedBefore && lifted && lastYes;
  return { label, holds, why: holds ? `the ${e.who}'s stop was lifted from the link and their newest ledger row is that yes` : `the ${e.who}'s stop was not lifted from the link, or their newest ledger row is not that yes` };
}

/** Every message handed to a named person after a stop was in force. Independent of what was asked. */
export function stopViolations(people, inForceAt = stopInForceAt) {
  const out = [];
  for (const p of people) {
    const r = p.recipient;
    if (!r) continue;
    const handed = r.status === "SENT" || r.status === "DELIVERED" || r.status === "UNCONFIRMED" || p.messages.length > 0;
    if (!handed) continue;
    const at = decisionAtOf(r, p.messages);
    if (!Number.isFinite(at)) continue;
    const f = inForceAt(at, p.suppressions, p.ledger);
    if (f.inForce) out.push({ who: p.role, at, stopAt: f.at, by: f.by });
  }
  return out;
}

/** Slices from the rows' own stamps: people per claim, claim → hand-over, and the gap between claims. */
export function sliceTimings(recipients) {
  const groups = new Map();
  for (const r of recipients) {
    if (!r.claim_token) continue;
    const g = groups.get(r.claim_token) ?? { people: 0, claimedAt: Number.POSITIVE_INFINITY, handedOverAt: Number.NEGATIVE_INFINITY, refused: 0 };
    g.people += 1;
    const c = msOf(r.claimed_at);
    if (Number.isFinite(c)) g.claimedAt = Math.min(g.claimedAt, c);
    const s = msOf(r.sent_at);
    if (Number.isFinite(s)) g.handedOverAt = Math.max(g.handedOverAt, s);
    if (r.status === "SKIPPED") g.refused += 1;
    groups.set(r.claim_token, g);
  }
  const list = [...groups.values()].filter((g) => Number.isFinite(g.claimedAt)).sort((a, b) => a.claimedAt - b.claimedAt);
  return list.map((g, i) => ({
    people: g.people,
    refused: g.refused,
    claimedAt: g.claimedAt,
    handedOverAt: Number.isFinite(g.handedOverAt) ? g.handedOverAt : null,
    claimToHandOverMs: Number.isFinite(g.handedOverAt) ? g.handedOverAt - g.claimedAt : null,
    gapSincePreviousMs: i === 0 ? null : g.claimedAt - list[i - 1].claimedAt,
  }));
}

/** The chargeable sends the evidence found: the composer test's and the campaign's. */
export function sendCounts(facts, lib = LIB) {
  const composerTests = lib.countChargeable(facts.testMessageCounts ?? []);
  const recipientSends = lib.countChargeable(facts.messageCounts ?? []);
  return { composerTests, recipientSends, chargeable: composerTests + recipientSends };
}

/** The payload of an audit row as an object (the database hands a jsonb back as one; a string is parsed), else null. */
function payloadOf(row) {
  let p = row ? row.payload : null;
  if (typeof p === "string") { try { p = JSON.parse(p); } catch { return null; } }
  return p !== null && typeof p === "object" && !Array.isArray(p) ? p : null;
}

/**
 * ⭐ WHAT AN AUDIT ACTION HAS TO CARRY TO PROVE THE ACT IT NAMES. The engine and the enqueue write `marketing.campaign_paused` too (the SAME
 * action: a rail that died, a budget that ran out), so the bare action proves nothing about the PAUSE BUTTON: an officer's Pause is the row
 * with an ACTOR and the reason `officer_paused` (`campaign-control.ts`); the engine's own are SYSTEM rows with no actor and another reason.
 */
const AUDIT_PROOF = Object.freeze({
  "marketing.campaign_paused": { words: "the OFFICER's pause (an actor and the reason officer_paused)", holds: (r) => Boolean(r.actor_id) && payloadOf(r)?.reason === "officer_paused" },
});

/** The audit rows E24 says a step writes: each action named is there at least once - and, for a pause, as the OFFICER's own (see `AUDIT_PROOF`). */
export function auditChecks(facts, args) {
  return (args.expectAudit ?? []).map((action) => {
    const rows = (facts.audit ?? []).filter((r) => r.action === action);
    const proof = AUDIT_PROOF[action];
    const n = proof ? rows.filter(proof.holds).length : rows.length;
    return { action, holds: n > 0, n, others: proof ? rows.length - n : 0, words: proof ? proof.words : null };
  });
}

/** The campaign read's four comparisons (output names) and the composer's names for the fields they compare (DRIVE'S MESSAGE). */
const DRIVE_FIELDS = Object.freeze([
  ["drive_body_sw", "Swahili message"], ["drive_body_en", "English message"],
  ["drive_fallback_sw", "Swahili word for {jina}"], ["drive_fallback_en", "English word for {jina}"],
]);

/**
 * ⭐ THE STANDING CHECKS — true of every campaign of this drive whatever was asked, and a violation by themselves (a look's exit
 * turns non-zero too):
 *   · ONE CHARGEABLE MESSAGE PER ROW: the engine sends one message per recipient row; a row with two that may have been charged is a
 *     double send. (Not only when `--expect-sends` happens to be given.) A first attempt the gateway refused - FAILED, no receipt -
 *     never left, and the engine's retry of it is not a second message (`isChargeable`, the ledger's own rule).
 *   · THE TEST NUMBER ONLY: with `--test` given, every message of the campaign and every composer test went to the test number.
 *     The SQL computes a yes/no per message (`to_test`); the number itself is never selected.
 *   · ⭐ NOTHING ELSE IS SENDING: with `--test` given, not one MARKETING message created in the last day went to any other number, of ANY
 *     campaign (one COUNT in SQL). A count that was not read is a violation too: the check never passes by default.
 *   · ⭐ SENT AS WRITTEN (the owner's ruling of 2026-10-09, and his words for the drive — `DRIVE_MESSAGE`): every message of the campaign
 *     and every composer test has a length the drive's message can have with a name filled in — in its row's language window when the
 *     row says one, else in either (`driveLengthWindows`). No body is stored, so the length is what the database can say of the WIRE: a
 *     footer like the old one (49 characters and more) or words of another length make it a violation. ⚠️ A length cannot show the
 *     words: a short addition, or other words of a length inside the window, pass it — DRIVE'S MESSAGE holds the words.
 *   · ⭐ DRIVE'S MESSAGE: the campaign's four stored fields — the Swahili and English messages and both words for {jina} — EQUAL the
 *     drive's message, character for character: four yes/no computed in SQL with the drive's words bound as values (as `to_test` is
 *     computed), never a body selected. A field that is not the drive's, or one the read could not compare, is a violation by itself.
 *     With the renderer's own proof (`test:campaign-compose`: nothing is appended) and the length above, it says what reached the wire.
 *     Asked or not, with `--test` or without.
 */
export function standingFindings(facts, args, lib = LIB) {
  const out = [];
  const recipients = facts.recipients ?? [];
  const roleOf = (key) => (args.test && key === args.test.key ? "test" : args.control && key === args.control.key ? "control" : "other");
  const recipientOf = new Map(recipients.map((r) => [r.id, r]));
  const perRow = new Map();
  for (const m of facts.messages ?? []) {
    if (!lib.isChargeable(m.status, m.dlr_status !== null && m.dlr_status !== undefined)) continue;
    perRow.set(m.target_id, (perRow.get(m.target_id) ?? 0) + 1);
  }
  for (const [target, n] of perRow) {
    if (n <= 1) continue;
    const r = recipientOf.get(target);
    out.push({ kind: "double_send", who: r ? roleOf(r.msisdn) : "other", n });
  }
  // SENT AS WRITTEN · a campaign message is judged in its own row's language window; a composer test (no row) in either.
  const windows = lib.driveLengthWindows();
  const localeOf = (m) => recipientOf.get(m.target_id)?.locale ?? null;
  const unwritten = (facts.messages ?? []).filter((m) => !lib.isDriveLength(m.body_len, localeOf(m), windows)).length;
  const unwrittenTests = (facts.testMessages ?? []).filter((m) => !lib.isDriveLength(m.body_len, null, windows)).length;
  if (unwritten > 0) out.push({ kind: "as_written", where: "campaign", n: unwritten });
  if (unwrittenTests > 0) out.push({ kind: "as_written", where: "composer test", n: unwrittenTests });
  // DRIVE'S MESSAGE · the four stored fields, each compared in SQL (true only when it equals the drive's words — never a null)
  const c = facts.campaign;
  if (c) {
    const notDrive = DRIVE_FIELDS.filter(([col]) => c[col] !== true).map(([, label]) => label);
    if (notDrive.length > 0) out.push({ kind: "not_drive_message", fields: notDrive });
  }
  if (args.test) {
    const stray = (rows) => (rows ?? []).filter((m) => m.to_test === false).length;
    const campaign = stray(facts.messages);
    const composer = stray(facts.testMessages);
    if (campaign > 0) out.push({ kind: "other_number", where: "campaign", n: campaign });
    if (composer > 0) out.push({ kind: "other_number", where: "composer test", n: composer });
    if (typeof facts.elsewhere !== "number") out.push({ kind: "elsewhere", n: null });
    else if (facts.elsewhere > 0) out.push({ kind: "elsewhere", n: facts.elsewhere });
  }
  return out;
}

/** The campaign's CONFIRMED count against `--expect-audience`: `null` when none was asked, else { expected, actual, holds }. */
export function audienceCheck(facts, args) {
  if (args.expectAudience === null || args.expectAudience === undefined) return null;
  const actual = facts.campaign && typeof facts.campaign.audience_count === "number" ? facts.campaign.audience_count : null;
  return { expected: args.expectAudience, actual, holds: actual === args.expectAudience };
}

/** How many things a verdict found wrong - the number a LOOK's exit code is made of (a look asks for no verdict, not for silence): violations, standing findings, an audience that is not the one expected. */
export function lookViolations(verdict) {
  return verdict.violations.length + verdict.standing.length + (verdict.audience && verdict.audience.holds === false ? 1 : 0);
}

/** The parts of the verdict, as one object, so a suite can hand in a defective one (and nothing else does). */
export const PARTS = Object.freeze({ buildPeople, judgeExpectation, stopViolations, sendCounts, sliceTimings, auditChecks, standingFindings, audienceCheck, lookViolations });

/**
 * The whole verdict. ⛔ Pure: facts and arguments in, a plain object out — the exit code follows from `proven` alone, and
 * `proven` is true only when every expectation holds, no stop was violated, any expected send count is exact and any expected
 * audience is the confirmed one.
 */
export function judgeEvidence(facts, args, lib = LIB, parts = PARTS) {
  if (!facts.campaign) return { found: false, proven: false, expectations: [], violations: [], standing: [], sends: null, sendsHolds: null, audience: null, auditChecks: [], people: [], slices: [], failing: 1 };
  const people = parts.buildPeople(facts, args);
  const byRole = Object.fromEntries(people.map((p) => [p.role, p]));
  const expectations = args.expectations.map((e) => parts.judgeExpectation(e, byRole[e.who] ?? null, lib));
  const violations = parts.stopViolations(people);
  const standing = parts.standingFindings(facts, args, lib);
  const sends = parts.sendCounts(facts, lib);
  let sendsHolds = null;
  if (args.expectSends !== null) sendsHolds = sends.chargeable === args.expectSends;
  const audience = parts.audienceCheck(facts, args);
  const audits = parts.auditChecks(facts, args);
  const failing = expectations.filter((x) => !x.holds).length + (sendsHolds === false ? 1 : 0) + (audience && audience.holds === false ? 1 : 0) + audits.filter((x) => !x.holds).length + violations.length + standing.length;
  return {
    found: true,
    proven: args.look ? null : failing === 0,
    expectations, violations, standing, sends, sendsHolds, audience, auditChecks: audits, people,
    slices: parts.sliceTimings(facts.recipients),
    failing,
  };
}

/* ══ THE REPORT ══════════════════════════════════════════════════════════════════════════════════════════════════════ */

function trailOf(gateTrail, lib) {
  let t = gateTrail;
  if (typeof t === "string") { try { t = JSON.parse(t); } catch { return "—"; } }
  if (!Array.isArray(t) || t.length === 0) return "—";
  return t.slice(0, 12).map((g) => `${lib.safeText(g && g.check, 20)}:${lib.safeText(g && g.verdict, 24)}`).join(" > ");
}

export function renderEvidence(facts, verdict, args, ctx, lib = LIB) {
  const L = [];
  const c = facts.campaign;
  L.push(`U52a campaign evidence · read-only · ${lib.fmtEat(ctx.nowMs)} EAT${args.label ? ` · step ${args.label}` : ""}`);
  L.push(`transaction read-only: ${ctx.readOnly} · repeatable read${ctx.dbClass ? ` · database: ${ctx.dbClass}` : ""}`);
  if (ctx.clock) L.push(lib.clockLine(ctx.clock));
  if (ctx.ledgerFile) L.push(ctx.ledgerFile);
  if (!c) { L.push("campaign: NOT FOUND — no such campaign id"); return L; }
  L.push(`campaign ${lib.safeText(c.id, 64)} · ${lib.safeText(c.status, 14)} · stop reason ${lib.safeText(c.stop_reason, 40)} · confirmed for ${dash(c.audience_count)} (${lib.safeText(c.confirm_tier, 12)}) · ≤ ${dash(c.estimate_segments)} SMS${c.budget_tzs !== null && c.budget_tzs !== undefined ? ` · budget TZS ${c.budget_tzs}` : ""}`);
  L.push(`  by officer ${lib.safeText(c.created_by, 40)} · confirmed by ${lib.safeText(c.confirmed_by, 40)} at ${lib.fmtEat(c.confirmed_at)} · started ${lib.fmtEat(c.started_at)} · list written ${lib.fmtEat(c.enqueued_at)} · paused ${lib.fmtEat(c.paused_at)} · finished ${lib.fmtEat(c.finished_at)}`);

  const counts = (facts.recipientCounts ?? []).map((g) => `${g.status}${g.status === "SKIPPED" ? `:${dash(g.skip_reason)}` : g.status === "FAILED" ? `:${dash(g.failure_class)}` : ""} ${g.n}`);
  const total = (facts.recipientCounts ?? []).reduce((n, g) => n + g.n, 0);
  L.push(`recipients · ${total} on the campaign · ${counts.length ? counts.join(" · ") : "none yet"}`);
  const roleOf = (key) => (args.test && key === args.test.key ? "test" : args.control && key === args.control.key ? "control" : "other");
  for (const r of facts.recipients.slice(0, 41)) {
    const role = roleOf(r.msisdn);
    const gate = (() => {
      let t = r.gate_trail;
      if (typeof t === "string") { try { t = JSON.parse(t); } catch { return ""; } }
      const g = Array.isArray(t) ? t.find((x) => x && x.check === "gate") : null;
      const m = g && typeof g.source === "string" ? /^(CONSENT|LICENCE_[A-Z]+):/.exec(g.source) : null;
      return m ? ` basis ${m[1]}` : "";
    })();
    L.push(`  ${role.padEnd(7)} ${lib.maskKey(r.msisdn)}  ${lib.safeText(r.status, 14).padEnd(11)} skip ${lib.safeText(r.skip_reason, 24)} · class ${lib.safeText(r.failure_class, 24)} · tries ${r.attempts} · ref ${lib.safeText(r.sms_reference, 40)} · stop token ${r.has_token ? "yes" : "no"} · ${lib.safeText(r.locale, 4)} ${dash(r.segments)} seg ${dash(r.body_len)} chars${r.cost_tzs ? ` TZS ${r.cost_tzs}` : ""}${gate}`);
    L.push(`          claimed ${timeOf(r.claimed_at)} · handed over ${timeOf(r.sent_at)} · delivered ${timeOf(r.delivered_at)} · failed ${timeOf(r.failed_at)}${r.skip_detail ? ` · detail ${lib.safeText(r.skip_detail, 100)}` : ""}${r.error ? ` · error ${lib.safeText(r.error, 100)}` : ""}`);
    L.push(`          trail ${trailOf(r.gate_trail, lib)}`);
  }
  if (total > 41) L.push(`  (the first 41 of ${total} rows; the named people are always shown)`);

  const toTest = (m) => (args.test && typeof m.to_test === "boolean" ? ` · to the test number: ${m.to_test ? "yes" : "NO"}` : "");
  const msgLine = (m, tag) => `  ${tag} ${lib.safeText(m.reference, 40)}${toTest(m)} · ${lib.safeText(m.purpose, 12)} · ${lib.safeText(m.status, 12)} · receipt ${lib.safeText(m.dlr_status, 16)}${m.dlr_desc ? ` (${lib.safeText(m.dlr_desc, 60)})` : ""} · ${dash(m.body_len)} chars · tries ${m.attempts} · queued ${timeOf(m.created_at)} · handed over ${timeOf(m.sent_at)} · delivered ${timeOf(m.delivered_at)} · failed ${timeOf(m.failed_at)}${m.balance_tzs ? ` · gateway balance after TZS ${m.balance_tzs}` : ""}${m.provider_msg ? ` · gateway said ${lib.safeText(m.provider_msg, 60)}` : ""}`;
  L.push(`composer tests · ${(facts.testMessages ?? []).length} message${(facts.testMessages ?? []).length === 1 ? "" : "s"} on the wire from this draft`);
  for (const m of facts.testMessages ?? []) L.push(msgLine(m, "test "));
  L.push(`campaign messages · ${(facts.messages ?? []).length} on the wire for this campaign's rows`);
  for (const m of facts.messages ?? []) L.push(msgLine(m, "send "));

  L.push(`audit rows of this campaign (E24) · ${facts.audit.length}`);
  for (const a of facts.audit) L.push(`  #${lib.safeText(a.seq, 12)} ${lib.fmtEat(a.created_at)} ${lib.safeText(a.category, 12)} ${lib.safeText(a.action, 48)} · ${a.actor_id ? `officer ${lib.safeText(a.actor_id, 40)}` : "system"} · ${lib.safePayload(a.payload)}`);
  L.push(`the live switch's audit rows (newest first) · ${facts.switchAudit.length}`);
  for (const a of facts.switchAudit) L.push(`  #${lib.safeText(a.seq, 12)} ${lib.fmtEat(a.created_at)} ${lib.safeText(a.action, 48)} · ${lib.safePayload(a.payload)}`);

  L.push("slice timings · the engine RECORDS NO gate or send milliseconds (they are returned to the page that drives the campaign and are not stored); what the rows' own stamps give:");
  if (verdict.slices.length === 0) L.push("  no claim stamps yet — nothing has been sliced");
  verdict.slices.forEach((s, i) => {
    L.push(`  slice ${i + 1}: ${s.people} ${s.people === 1 ? "person" : "people"}${s.refused ? ` (${s.refused} refused)` : ""} · claimed ${lib.fmtEat(s.claimedAt).slice(11)}${s.handedOverAt === null ? " · nothing handed over" : ` · handed over ${lib.fmtEat(s.handedOverAt).slice(11)} (${(s.claimToHandOverMs / 1000).toFixed(1)} s from claim to hand-over: the gate, the preparation and the send together)`}${s.gapSincePreviousMs === null ? "" : ` · ${(s.gapSincePreviousMs / 1000).toFixed(1)} s after the previous claim`}`);
  });

  L.push(`DISCRIMINATION · campaign ${c.id}`);
  if (verdict.people.length === 0) L.push("  (no test or control number was given)");
  for (const p of verdict.people) {
    const r = p.recipient;
    const active = p.suppressions.filter((s) => s.lifted_at === null || s.lifted_at === undefined);
    const stop = active.length ? `an ACTIVE stop (${lib.safeText(active[0].reason, 16)}${active[0].via_link ? ", from the link" : ""}, since ${lib.fmtEat(active[0].created_at)})`
      : p.suppressions.length ? `a stop that was lifted${p.suppressions[0].lifted_via_link ? " from the link" : ""} at ${lib.fmtEat(p.suppressions[0].lifted_at)}` : "no stop on file";
    const wire = p.messages.length ? p.messages.map((m) => lib.safeText(m.status, 12)).join("+") : "no message";
    L.push(`  ${p.role.padEnd(8)} ${p.masked}  row ${r ? outcomeOf(r) : "NONE ON THIS CAMPAIGN"} · on the wire: ${wire} · ${stop}`);
  }
  for (const x of verdict.expectations) L.push(`  EXPECT ${x.label.padEnd(18)} ${x.holds ? "HOLDS" : "FAILS"} — ${x.why}`);
  if (verdict.people.length) L.push(`  STOP-VIOLATION SCAN   ${verdict.violations.length === 0 ? "clear — no message was handed to a named number after a stop was in force" : verdict.violations.map((v) => `VIOLATION — the ${v.who} was handed a message although a stop made at ${lib.fmtEat(v.stopAt)} was in force when the engine took them up at ${lib.fmtEat(v.at)} (${v.by})`).join(" · ")}`);
  // ⭐ the standing checks: true of every campaign of this drive, asked or not
  const doubles = verdict.standing.filter((s) => s.kind === "double_send");
  L.push(`  ONE MESSAGE PER ROW   ${doubles.length === 0 ? "clear — no recipient row has more than one chargeable message" : doubles.map((s) => `VIOLATION — the ${s.who} row has ${s.n} chargeable messages (the engine sends one message per row; a first attempt the gateway refused, which never left, is not counted)`).join(" · ")}`);
  // ⭐ SENT AS WRITTEN — the wire's LENGTH (no body is stored): the windows are said, so a lead can read them; it shows no old footer, not the words
  const unwritten = verdict.standing.filter((s) => s.kind === "as_written");
  const win = lib.driveLengthWindows();
  const span = `Swahili ${win.SW.min} to ${win.SW.max} characters, English ${win.EN.min} to ${win.EN.max}`;
  L.push(`  SENT AS WRITTEN       ${unwritten.length === 0 ? `clear — every message on the wire has a length the drive's message can have with a name filled in (${span}): no footer like the old one (49 characters or more) went with any — a length cannot show the words, DRIVE'S MESSAGE below holds them` : unwritten.map((s) => `VIOLATION — ${s.n} ${s.where} message${s.n === 1 ? " is" : "s are"} not as long as the drive's message with its name filled in (${span}): something was added to it, or other words were sent`).join(" · ")}`);
  // ⭐ DRIVE'S MESSAGE — the campaign's four stored fields against the drive's words, compared in SQL (yes/no; no body is read)
  const notDrive = verdict.standing.filter((s) => s.kind === "not_drive_message");
  L.push(`  DRIVE'S MESSAGE       ${notDrive.length === 0 ? "clear — the campaign's stored Swahili and English messages and both words for {jina} are the drive's (DRIVE_MESSAGE), character for character: compared in SQL, no body read" : notDrive.map((s) => `VIOLATION — the campaign's stored ${s.fields.join(", ")} ${s.fields.length === 1 ? "is" : "are"} not the drive's (DRIVE_MESSAGE), character for character: other words were saved for this campaign`).join(" · ")}`);
  if (args.test) {
    const strays = verdict.standing.filter((s) => s.kind === "other_number");
    L.push(`  TO THE TEST NUMBER    ${strays.length === 0 ? "clear — every message of the campaign and every composer test went to the test number" : strays.map((s) => `VIOLATION — ${s.n} ${s.where} message${s.n === 1 ? "" : "s"} went to a number that is NOT the test number`).join(" · ")}`);
    const elsewhere = verdict.standing.filter((s) => s.kind === "elsewhere");
    L.push(`  NO OTHER MARKETING SMS ${elsewhere.length === 0 ? "clear — no MARKETING message created in the last 24 hours, of any campaign, went to a number but the test number" : elsewhere.map((s) => (s.n === null ? "VIOLATION — the count of the last day's marketing messages to other numbers was not read" : `VIOLATION — ${s.n} MARKETING message${s.n === 1 ? "" : "s"} created in the last 24 hours went to a number that is NOT the test number (any campaign: somebody else is sending, or an earlier test did)`)).join(" · ")}`);
  }
  if (verdict.audience) L.push(`  EXPECT audience=${verdict.audience.expected}    ${verdict.audience.holds ? "HOLDS" : "FAILS"} — ${verdict.audience.actual === null ? "the campaign has no confirmed audience (it was never confirmed)" : `the campaign is confirmed for ${verdict.audience.actual} ${verdict.audience.actual === 1 ? "person" : "people"}`}${verdict.audience.holds ? "" : " - DO NOT PRESS START"}`);

  L.push(`chargeable sends · ${verdict.sends.chargeable} (${verdict.sends.composerTests} composer test + ${verdict.sends.recipientSends} campaign) — compare with the Blackball portal's Out SMS COUNT for this window (the portal also counts login codes)`);
  if (verdict.sendsHolds !== null) L.push(`  EXPECT sends=${args.expectSends}      ${verdict.sendsHolds ? "HOLDS" : "FAILS"} — counted ${verdict.sends.chargeable}`);
  for (const a of verdict.auditChecks) L.push(`  EXPECT audit ${lib.safeText(a.action, 48)}  ${a.holds ? "HOLDS" : "FAILS"} — ${a.n} row${a.n === 1 ? "" : "s"} of E24 on this campaign${a.words ? ` counting as ${a.words}` : ""}${a.others > 0 ? ` (${a.others} other row${a.others === 1 ? " of that action is" : "s of that action are"} not it: the engine writes the same action)` : ""}`);
  if (args.showStopLink) {
    if (facts.stopToken) {
      L.push(`  ⚠ the stop link below is a live bearer link for the TEST number: no SMS carries it (a marketing SMS is sent exactly as written since 2026-10-09), so this line is the drive's only way to its stop page — use it for the stop and "Start them again" steps only, and never paste it into the tracker.`);
      L.push(`  stop link (test number): /s/${lib.safeText(facts.stopToken, 16)}`);
    } else L.push("  stop link (test number): none — the test number has no row with a link on this campaign (a number the gate refuses gets none)");
  }
  return L;
}

/* ══ THE LEDGER'S TABLE ══════════════════════════════════════════════════════════════════════════════════════════════ */

export function renderLedger(ledger, io, lib = LIB, sends = 0) {
  const L = [];
  const total = lib.ledgerTotal(ledger);
  L.push(`U52a ledger · ${lib.LEDGER_REL}`);
  L.push(`cap ${SEND_CAP} · counted ${total} · room ${SEND_CAP - total}${sends ? ` · ${sends} more ${total + sends <= SEND_CAP ? "FIT" : "REFUSED — they would pass the cap"}` : ""}`);
  const ids = Object.keys(ledger.entries).sort((a, b) => String(ledger.entries[a].recordedAt ?? "").localeCompare(String(ledger.entries[b].recordedAt ?? "")));
  for (const id of ids) {
    const e = ledger.entries[id];
    L.push(`  ${lib.safeText(e.label ?? "—", 12).padEnd(12)} ${lib.safeText(id, 40)} · ${e.chargeable} chargeable (${dash(e.composerTests)} test + ${dash(e.recipientSends)} campaign) · test ${lib.safeText(e.outcomes?.test ?? "—", 28)} · control ${lib.safeText(e.outcomes?.control ?? "—", 28)} · ${lib.safeText(e.verdict ?? "—", 12)} · ${lib.fmtEat(e.recordedAt)}`);
  }
  if (ids.length === 0) L.push("  (nothing counted yet)");
  for (const line of L) io.line(line);
}

/* ══ THE RUN ═════════════════════════════════════════════════════════════════════════════════════════════════════════ */

export function realDeps() {
  return {
    env: process.env,
    sink: (line) => console.log(line),
    now: () => Date.now(),
    ledgerIo: () => LIB.fileLedgerIo(),
    makePrisma: async () => {
      const { PrismaClient } = await import("@prisma/client");
      return new PrismaClient();
    },
    lib: LIB,
    parts: PARTS,
    readFacts: readEvidenceFacts,
    render: renderEvidence,
    parseArgs: parseEvidenceArgs,
  };
}

export async function runEvidence(argv, deps = realDeps()) {
  const d = { ...realDeps(), ...deps };
  const lib = d.lib;
  const parsed = d.parseArgs(argv, lib);
  if (!parsed.ok) {
    const io0 = lib.makeIo(d.sink, d.env, []);
    for (const p of parsed.problems) io0.line(`REFUSING: ${p}`);
    io0.line(USAGE);
    return EXIT.notRun;
  }
  const { args } = parsed;
  const keys = [args.test, args.control].filter(Boolean).map((n) => n.key);
  const io = lib.makeIo(d.sink, d.env, keys);

  // ⭐ A ledger file is created only on purpose: a missing one stops the run unless --new-ledger says the drive has not begun, and
  // --new-ledger over a ledger that exists is refused too (lib.ledgerGate). Where the file is, and when it was written, is said every run.
  const ledgerIo = d.ledgerIo();
  const ledgerRead = lib.readLedger(ledgerIo);
  const gate = lib.ledgerGate(ledgerRead, args.newLedger);
  if (!gate.ok) {
    io.line(lib.ledgerFileLine(ledgerIo));
    io.line(`NOT RUN: ${gate.why}.`);
    return EXIT.notRun;
  }
  if (args.mode === "ledger") {
    io.line(lib.ledgerFileLine(ledgerIo));
    renderLedger(ledgerRead.ledger, io, lib, args.sends);
    return lib.checkRoom(ledgerRead.ledger, args.sends).ok ? EXIT.ok : EXIT.fail;
  }

  if (!d.env.DATABASE_URL) {
    io.line("REFUSING: no DATABASE_URL — run through the runner, which sets the public proxy.");
    return EXIT.notRun;
  }
  const dbUrl = String(d.env.DATABASE_URL);
  if (lib.isPrivateHost(dbUrl)) {
    io.line("REFUSING: DATABASE_URL is Railway's private host, which does not resolve off Railway — the runner must set the public proxy.");
    return EXIT.notRun;
  }

  let facts;
  let prisma = null;
  try {
    prisma = await d.makePrisma();
    facts = await lib.readOnlyTransaction(prisma, (tx) => d.readFacts(tx, {
      campaignId: args.campaignId, testKey: args.test ? args.test.key : null, controlKey: args.control ? args.control.key : null, wantToken: args.showStopLink,
    }));
  } catch (err) {
    io.line(`NOT RUN: the read could not be made (${lib.describeError(err, d.env, keys)})`);
    return EXIT.notRun;
  } finally {
    if (prisma && typeof prisma.$disconnect === "function") { try { await prisma.$disconnect(); } catch { /* the run is over either way */ } }
  }

  // ⭐ The report's time, and the ledger's stamp, are the DATABASE's clock (`SELECT now()` from the same transaction).
  const clock = lib.clockOf(facts.now, d.now());
  const nowMs = clock.nowMs;
  const verdict = judgeEvidence(facts, args, lib, d.parts);
  const ctx = { nowMs, clock, ledgerFile: lib.ledgerFileLine(ledgerIo), readOnly: "on", dbClass: lib.databaseClass(dbUrl) };
  for (const line of d.render(facts, verdict, args, ctx, lib)) io.line(line);
  if (!verdict.found) { io.line("RESULT: NOT PROVEN — there is no such campaign"); return EXIT.fail; }

  // The ledger counts what the evidence found — a look included, a failed verdict included: the sends happened either way.
  const person = (role) => verdict.people.find((p) => p.role === role);
  const entry = {
    label: args.label,
    chargeable: verdict.sends.chargeable,
    composerTests: verdict.sends.composerTests,
    recipientSends: verdict.sends.recipientSends,
    outcomes: { test: person("test") ? outcomeOf(person("test").recipient) : null, control: person("control") ? outcomeOf(person("control").recipient) : null },
    verdict: args.look ? "look" : verdict.proven ? "pass" : "fail",
    recordedAt: new Date(nowMs).toISOString(),
  };
  const rec = lib.recordLedger(ledgerRead.ledger, facts.campaign.id, entry);
  let ledgerOk = true;
  if (!rec.ok) {
    ledgerOk = false;
    io.line(rec.reason === "over_cap"
      ? `LEDGER REFUSES: counting this campaign would make ${rec.would} chargeable sends against the cap of ${SEND_CAP}. The ledger was NOT updated. STOP THE DRIVE here and tell Ali.`
      : "LEDGER REFUSES: this campaign id cannot be recorded.");
  } else {
    try {
      ledgerIo.write(lib.serializeLedger(rec.ledger));
      io.line(`ledger · ${rec.total} of ${SEND_CAP} chargeable sends counted after this campaign (${SEND_CAP - rec.total} left)`);
    } catch {
      // ⭐ The count is NOT on the disk, so the ledger is behind and the next step's cap check would be wrong. The remedy is the same command:
      // a run of this evidence counts the campaign's sends again, and counts nothing twice. Never a count written down by hand.
      ledgerOk = false;
      io.line("LEDGER NOT WRITTEN: the file could not be saved, so the count is NOT recorded and the cap check of the next step would be wrong. Run this same evidence command again for this campaign until it says the ledger took the count (a re-run counts nothing twice), and take no further step before it does.");
    }
  }

  if (args.look) {
    // ⭐ A look asks for no verdict, but what it finds wrong is not something to look past: a VIOLATION (a stop broken, a double send, a
    // message to another number, a message not sent as written, other words saved for the campaign, marketing going to anyone else) or an
    // audience that is not the one expected - the exit is 1 and the line says so.
    const violated = verdict.violations.length + verdict.standing.length;
    const wrongAudience = verdict.audience !== null && verdict.audience.holds === false;
    if (d.parts.lookViolations(verdict) > 0) {
      const said = [];
      if (violated > 0) said.push(`${violated} VIOLATION${violated === 1 ? "" : "S"} above (a message after a stop, a double send, a message to a number that is not the test number, a message not sent as written, a campaign whose stored message is not the drive's, or marketing going to another number)`);
      if (wrongAudience) said.push(`the campaign is not confirmed for the ${verdict.audience.expected} ${verdict.audience.expected === 1 ? "person" : "people"} expected - DO NOT PRESS START`);
      io.line(`RESULT: LOOK ONLY — no verdict was asked, BUT ${said.join(" and ") || "something above is wrong"}: the exit is 1 - STOP THE DRIVE and tell Ali${ledgerOk ? "" : "; the ledger problem above stops it too"}`);
      return EXIT.fail;
    }
    io.line(`RESULT: LOOK ONLY — no verdict was asked${verdict.audience ? `; the audience is the ${verdict.audience.expected} expected` : ""}${ledgerOk ? "" : " (the ledger problem above still stops the drive)"}`);
    return ledgerOk ? EXIT.ok : EXIT.fail;
  }
  const proven = verdict.proven === true && ledgerOk;
  io.line(proven ? `RESULT: PROVEN — ${verdict.expectations.length + (verdict.sendsHolds === null ? 0 : 1) + verdict.auditChecks.length} expectation(s) hold, no stop was violated, the ledger took the count`
    : `RESULT: NOT PROVEN — ${verdict.failing} thing(s) failing${ledgerOk ? "" : " and the ledger refused"}`);
  return proven ? EXIT.ok : EXIT.fail;
}

if (AS_MAIN) {
  process.exitCode = await runEvidence(process.argv.slice(2), realDeps());
}
