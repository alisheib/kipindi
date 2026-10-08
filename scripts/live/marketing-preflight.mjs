/**
 * U52a · THE PRE-FLIGHT — a read-only go/no-go table for the first live drive of the SMS campaign engine on production (spec
 * `docs/marketing-specs/ENGINE-SPEC.md` §4.18 decision 1; the run sheet is "AS BUILT — the run sheet" in the same section).
 *
 *   npm run ops:marketing-preflight -- --test=+255… --origin=https://www.50pick.tz [--control=+255…] [--expect-dpl=<sha>]
 *                                      [--expect-switch=closed|open] [--sends=<n>]
 *
 * ⭐ WHAT IT ANSWERS, row by row, each with its reason (the exit code is 0 ONLY when every row is GO):
 *   build · health · migrations · switch · settings · window · rail · webhook · credit · ledger ·
 *   test-number · test-book · test-lists · test-consent · test-cycle · test-fresh · control
 *   · the migrations the engine's tables come from are FINISHED (by name, `_prisma_migrations`);
 *   · the live switch is CLOSED, and when it closes (`--expect-switch=open` asks the opposite, for after step 1);
 *   · the Marketing SMS settings record: price, credit kept for codes, per-campaign limit, window — and that the send window
 *     is open NOW;
 *   · the receipt secret is SET (production's `/api/health` → `sms.webhookSecretSet`, a boolean, fetched with a timeout) and
 *     the real rail is configured; the SMS credit covers the cap; the build production serves (`?dpl=`, read from the home
 *     page without signing in) — equal to `--expect-dpl` when given;
 *   · the TEST number: a sendable Tanzanian mobile number (the repo's numbering plan), its contact-book row, its lists,
 *     its consent-and-basis state judged as the gate judges it — and again AS IT WILL BE after the stop link's two acts,
 *     which is what campaign C meets — and that no earlier campaign holds it;
 *   · the CONTROL number, when one is named: an ACTIVE stop on it. With none named it is not applicable (the §7 Q4 fallback).
 *   · the ledger (`.qa-shots/marketing-setup/U52a/ledger.json`): `--sends` more chargeable sends (default 1) still fit under 6.
 *
 * ⛔ READ ONLY BY CONSTRUCTION. Every database read is a SELECT inside ONE Postgres transaction whose first statement is
 * `SET TRANSACTION READ ONLY`, read back (`readOnlyTransaction`). The only network call is a GET of the public home page and
 * `/api/health` — no sign-in, no secret. It sends no SMS and writes no row; the one file it may touch is the gitignored
 * ledger, which it only READS.
 * ⛔ NO NUMBER IS PRINTED WHOLE: the two numbers arrive as arguments, are judged by `parseTzNumber`, and are shown only as the
 * repo's mask (`+255••••NN`). Every line goes through an output filter that also removes the database address and any secret.
 * ⛔ NOTHING DEFAULTS TO PRODUCTION: `--origin` is required, `DATABASE_URL` is set by the runner and never printed, and a
 * private Railway host (which does not resolve off Railway) is refused with a word, not echoed.
 *
 * Exit: 0 every row GO · 1 at least one NO-GO · 2 not run (usage, no database, or the database would not confirm read-only).
 * Guard: `npm run test:marketing-preflight` (the rules, the masks, the exit codes, the read-only first statement) ·
 * `npm run red:marketing-preflight`.
 */
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import * as LIB from "../lib/marketing-u52a.mjs";

const { EXIT, SEND_CAP } = LIB;

const USAGE = [
  "usage: npm run ops:marketing-preflight -- --test=+255… --origin=https://<production host> [--control=+255…]",
  "                                         [--expect-dpl=<build>] [--expect-switch=closed|open] [--sends=<1-6>]",
].join("\n");

export const PREFLIGHT_FLAGS = Object.freeze({
  values: ["test", "control", "origin", "expect-dpl", "expect-switch", "sends"],
  flags: [],
  positional: 0,
});

/** The fetch's patience, in milliseconds. */
export const FETCH_TIMEOUT_MS = 8_000;

/* ══ THE ARGUMENTS ═══════════════════════════════════════════════════════════════════════════════════════════════════ */

/** Everything typed, judged; `{ ok: false, problems }` is a usage error (exit 2) whose sentences never repeat the input. */
export function parsePreflightArgs(argv, lib = LIB) {
  const f = lib.parseFlags(argv, PREFLIGHT_FLAGS);
  const problems = [...f.problems];
  const one = (name) => (f.values[name] ?? [])[0];
  let test = null;
  let control = null;
  if (one("test") === undefined) problems.push("--test=<the approved test number> is required");
  else {
    const t = lib.parseNumberArg("test", one("test"));
    if (t.ok) test = t; else problems.push(t.problem);
  }
  if (one("control") !== undefined) {
    const c = lib.parseNumberArg("control", one("control"));
    if (c.ok) control = c; else problems.push(c.problem);
  }
  if (test && control && test.key === control.key) problems.push("--test and --control are the same number");
  let origin = null;
  if (one("origin") === undefined) problems.push("--origin=https://<production host> is required (nothing here defaults to production)");
  else {
    const o = String(one("origin")).replace(/[/]+$/, "");
    if (/^https:[/][/][A-Za-z0-9-]+(?:[.][A-Za-z0-9-]+)+(?::[0-9]{1,5})?$/.test(o) || /^http:[/][/](?:localhost|127[.]0[.]0[.]1)(?::[0-9]{1,5})?$/.test(o)) origin = o;
    else problems.push("--origin must be a plain https://host address (no path, no sign-in in it)");
  }
  let expectDpl = null;
  if (one("expect-dpl") !== undefined) {
    if (/^[A-Za-z0-9-]{7,64}$/.test(one("expect-dpl"))) expectDpl = one("expect-dpl").toLowerCase();
    else problems.push("--expect-dpl must be the start of the build id (7 to 64 letters, digits or dashes)");
  }
  let expectSwitch = "closed";
  if (one("expect-switch") !== undefined) {
    if (one("expect-switch") === "closed" || one("expect-switch") === "open") expectSwitch = one("expect-switch");
    else problems.push("--expect-switch must be closed or open");
  }
  let sends = 1;
  if (one("sends") !== undefined) {
    if (/^[0-9]$/.test(one("sends")) && Number(one("sends")) <= SEND_CAP) sends = Number(one("sends"));
    else problems.push(`--sends must be a whole number from 0 to ${SEND_CAP}`);
  }
  if (problems.length) return { ok: false, problems };
  return { ok: true, args: { test, control, origin, expectDpl, expectSwitch, sends } };
}

/* ══ THE NETWORK READS (public, unauthenticated, bounded) ════════════════════════════════════════════════════════════ */

/** GET `url`, giving up after `timeoutMs`. ⛔ Never throws; the answer names the class of failure, never the address. */
export async function fetchBounded(fetchImpl, url, timeoutMs, parse) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, { method: "GET", signal: ctl.signal, headers: { accept: parse === "json" ? "application/json" : "text/html" }, cache: "no-store" });
    if (!res || typeof res.status !== "number") return { ok: false, why: "no usable answer" };
    if (res.status >= 400 && !(parse === "json" && res.status === 503)) return { ok: false, why: `HTTP ${res.status}` };
    const text = await res.text();
    if (parse === "json") {
      try { return { ok: true, status: res.status, json: JSON.parse(text) }; } catch { return { ok: false, why: "the answer was not JSON" }; }
    }
    return { ok: true, status: res.status, text };
  } catch (err) {
    return { ok: false, why: ctl.signal.aborted ? `no answer within ${Math.round(timeoutMs / 1000)} s` : "the request failed" };
  } finally {
    clearTimeout(timer);
  }
}

/** The build id from the home page: `data-dpl-id`, else `?dpl=` on an asset URL (the live drives' own two spellings). */
export function dplFromHtml(html) {
  const m = String(html).match(/data-dpl-id="([^"]+)"/) || String(html).match(/[?&]dpl=([A-Za-z0-9-]+)/);
  return m ? m[1] : null;
}

/* ══ THE DATABASE READS — every statement a SELECT, the transaction read-only ════════════════════════════════════════ */

/**
 * What the pre-flight reads, and nothing else (no name, no e-mail, no address, no message body, no secret):
 *   _prisma_migrations                    migration_name, finished_at, rolled_back_at
 *   SystemConfig                          the four records by key: the live switch, the settings, the licence-outreach record,
 *                                         the saved wordings (read only to recognise an import attestation; never shown)
 *   MarketingContact                      the test number's book row: id, consent cache, suppressed, linked, source, erased
 *   ContactListMember / ContactList       its lists: id, name (shown only if a plain label), added, member count
 *   ContactListBasis                      each list's newest recording: id, recorded, revoked
 *   Suppression                           the test and control numbers' stops: reason, from-the-link, created, lifted
 *   MessagingConsent                      the test number's newest ledger row: status, source, wording (classified, not shown)
 *   User                                  the account that holds the test number, if any: role, status, switch, date of birth
 *                                         (the date is judged to an age band and never shown)
 *   SmsCampaignRecipient                  the campaigns that already hold the test number: campaign id, status
 */
export async function readPreflightFacts(tx, { testKey, controlKey }) {
  const facts = { migrations: [], config: {}, test: {}, control: null };
  facts.migrations = await tx.$queryRaw`/* u52a:migrations */ SELECT "migration_name" AS name, ("finished_at" IS NOT NULL) AS finished, ("rolled_back_at" IS NOT NULL) AS rolled FROM "_prisma_migrations"`;
  const configRows = await tx.$queryRaw`/* u52a:config */ SELECT "key", "value" FROM "SystemConfig" WHERE "key" IN ('marketing.sms.live', 'marketing.sms.settings', 'marketing.outreach.licence', 'marketing.wordings')`;
  for (const r of configRows) {
    let v = r.value;
    if (typeof v === "string") { try { v = JSON.parse(v); } catch { /* a bare string stays a string: the readers refuse it */ } }
    facts.config[r.key] = v;
  }

  const contacts = await tx.$queryRaw`/* u52a:contact */ SELECT "id", "consentState"::text AS consent_state, ("suppressedAt" IS NOT NULL) AS suppressed, ("userId" IS NOT NULL) AS linked, "source"::text AS source, COALESCE("sourceRef" = 'erasure', false) AS erased, "createdAt" AS created_at FROM "MarketingContact" WHERE "msisdn" = ${testKey}`;
  facts.test.contact = contacts[0] ?? null;
  facts.test.lists = [];
  if (facts.test.contact) {
    const lists = await tx.$queryRaw`/* u52a:lists */ SELECT l."id" AS list_id, l."name" AS list_name, m."addedAt" AS added_at, (SELECT count(*)::int FROM "ContactListMember" x WHERE x."listId" = l."id") AS members FROM "ContactListMember" m JOIN "ContactList" l ON l."id" = m."listId" WHERE m."contactId" = ${facts.test.contact.id} ORDER BY l."id"`;
    for (const l of lists) {
      const basis = await tx.$queryRaw`/* u52a:basis */ SELECT "id", "recordedAt" AS recorded_at, ("revokedAt" IS NOT NULL) AS revoked FROM "ContactListBasis" WHERE "listId" = ${l.list_id} ORDER BY "recordedAt" DESC, "id" DESC LIMIT 1`;
      facts.test.lists.push({ ...l, basis: basis[0] ?? null });
    }
  }
  facts.test.suppressions = await tx.$queryRaw`/* u52a:suppression */ SELECT "reason"::text AS reason, COALESCE("evidence" LIKE 'optout:%', false) AS via_link, "createdAt" AS created_at, "liftedAt" AS lifted_at FROM "Suppression" WHERE "channel"::text = 'SMS' AND "category"::text = 'MARKETING' AND "identifier" = ${testKey}`;
  const latest = await tx.$queryRaw`/* u52a:ledger */ SELECT "status"::text AS status, "source"::text AS source, "wording", ("recordedBy" IS NOT NULL AND btrim("recordedBy") <> '') AS recorded_by_officer, COALESCE("evidence" LIKE 'optout:%', false) AS via_link, "createdAt" AS created_at FROM "MessagingConsent" WHERE "channel"::text = 'SMS' AND "category"::text = 'MARKETING' AND "identifier" = ${testKey} ORDER BY "createdAt" DESC, "id" DESC LIMIT 1`;
  facts.test.latest = latest[0] ?? null;
  const users = await tx.$queryRaw`/* u52a:user */ SELECT "role"::text AS role, "status"::text AS status, "marketingOptIn" AS opt_in, "dob" FROM "User" WHERE "phoneE164" = ${`+${testKey}`}`;
  facts.test.user = users[0] ?? null;
  facts.test.campaigns = await tx.$queryRaw`/* u52a:holds */ SELECT "campaignId" AS campaign_id, "status"::text AS status FROM "SmsCampaignRecipient" WHERE "msisdn" = ${testKey} ORDER BY "createdAt" LIMIT 20`;

  if (controlKey) {
    const rows = await tx.$queryRaw`/* u52a:suppression */ SELECT "reason"::text AS reason, COALESCE("evidence" LIKE 'optout:%', false) AS via_link, "createdAt" AS created_at, "liftedAt" AS lifted_at FROM "Suppression" WHERE "channel"::text = 'SMS' AND "category"::text = 'MARKETING' AND "identifier" = ${controlKey}`;
    facts.control = { suppressions: rows };
  }
  return facts;
}

/* ══ THE JUDGEMENT — pure: facts and context in, rows out ════════════════════════════════════════════════════════════ */

const tzs = (n) => `TZS ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n)}`;
const clip = (s, n = 12) => String(s).slice(0, n);

/** Which row ids exist, in order. A suite holds this list so a row cannot vanish unnoticed. */
export const ROW_IDS = Object.freeze([
  "build", "health", "migrations", "switch", "settings", "window", "rail", "webhook", "credit", "ledger",
  "test-number", "test-book", "test-lists", "test-consent", "test-cycle", "test-fresh", "control",
]);

/**
 * ctx = { nowMs, args, home: { ok, dpl?|why }, health: { ok, json?|why }, ledger: { ok, used, room? | why } }
 * Returns rows { id, go: true | false | null (not applicable), reason } in ROW_IDS order.
 */
export function judgePreflight(facts, ctx, lib = LIB) {
  const rows = [];
  const add = (id, go, reason) => rows.push({ id, go, reason });
  const { args, nowMs } = ctx;
  const saved = lib.savedWordingsOf(facts.config[lib.KEY_WORDINGS]);

  // build · the build production serves
  if (!ctx.home.ok) add("build", false, `could not read the build production serves (${ctx.home.why})`);
  else if (ctx.home.dpl === null) add("build", false, "the home page names no build (no data-dpl-id and no ?dpl= on an asset)");
  else if (args.expectDpl && !String(ctx.home.dpl).toLowerCase().startsWith(args.expectDpl)) add("build", false, `production serves ${clip(ctx.home.dpl)}, not ${clip(args.expectDpl)}`);
  else add("build", true, `production serves ${clip(ctx.home.dpl)}${args.expectDpl ? " (matches --expect-dpl)" : " (not compared: no --expect-dpl was given)"}`);

  // health · /api/health answers, and says ready
  const h = ctx.health.ok ? ctx.health.json : null;
  if (!ctx.health.ok) add("health", false, `could not read /api/health (${ctx.health.why})`);
  else if (!h || h.ok !== true) add("health", false, "/api/health answers but does not say ok (the server reports itself not ready)");
  else if (!h.database || h.database.reachable !== true || h.database.migrated !== true) add("health", false, "/api/health says the database is not reachable and migrated");
  else add("health", true, "/api/health answers ok · database reachable and migrated");

  // migrations · by name
  const finished = new Set();
  const started = new Set();
  for (const m of facts.migrations ?? []) {
    started.add(m.name);
    if (m.finished === true && m.rolled !== true) finished.add(m.name);
  }
  const missing = lib.ENGINE_MIGRATIONS.filter((n) => !finished.has(n));
  if (missing.length === 0) add("migrations", true, `all ${lib.ENGINE_MIGRATIONS.length} engine migrations are finished (newest: ${lib.ENGINE_MIGRATIONS[lib.ENGINE_MIGRATIONS.length - 1]})`);
  else add("migrations", false, `not finished in production: ${missing.map((n) => `${n}${started.has(n) ? " (started, not finished)" : " (never applied)"}`).join(" · ")}`);

  // switch · closed (or, asked for, open)
  const sw = lib.readSwitch(facts.config[lib.KEY_LIVE_SWITCH], nowMs);
  const swWords = sw.state === "open"
    ? `OPEN until ${lib.fmtEat(sw.closesAt)} EAT (${Math.round(sw.remainingMs / 60_000)} min left)`
    : sw.why === "expired" ? `closed — it switched itself off at ${lib.fmtEat(sw.closedAt)} EAT`
      : sw.why === "absent" ? "closed — no row stored" : "closed — the stored row is not in a shape the reader accepts (it reads as off)";
  if (args.expectSwitch === "closed") add("switch", sw.state === "closed", sw.state === "closed" ? swWords : `${swWords} — the pre-flight expects it closed; close it first`);
  else if (sw.state !== "open") add("switch", false, `${swWords} — --expect-switch=open expects it open`);
  else if (sw.remainingMs < 20 * 60_000) add("switch", false, `${swWords} — less than 20 minutes left for the drive`);
  else add("switch", true, swWords);

  // settings · the record the engine reads
  const st = lib.readSettings(facts.config[lib.KEY_SETTINGS]);
  const s = st.settings;
  const window = `${lib.minuteLabel(s.windowStartMinute)}–${lib.minuteLabel(s.windowEndMinute)} EAT`;
  const figures = `${tzs(s.pricePerSegmentTzs)} per SMS · ${tzs(s.codesReserveTzs)} kept for login and withdrawal codes · at most ${tzs(s.campaignLimitTzs)} per campaign · window ${window}`;
  if (!st.readable) add("settings", false, `the saved record cannot be read in full (dropped: ${st.dropped.join(", ")}) — the engine would pause settings_unreadable; showing ${figures}`);
  else add("settings", true, `${st.stored ? "saved" : "defaults, nothing saved"}: ${figures}`);

  // window · now is inside the send window
  const minuteNow = lib.eatParts(nowMs).minuteOfDay;
  if (minuteNow >= s.windowStartMinute && minuteNow < s.windowEndMinute) add("window", true, `it is ${lib.minuteLabel(minuteNow)} EAT, inside ${window} (${s.windowEndMinute - minuteNow} min left)`);
  else add("window", false, `it is ${lib.minuteLabel(minuteNow)} EAT, outside ${window} — every send would be held`);

  // rail · the real carrier is configured
  const smsInfo = h && h.sms ? h.sms : null;
  if (!smsInfo) add("rail", false, "the SMS rail was not read (no usable /api/health)");
  else if (smsInfo.provider !== "blackball") add("rail", false, `the SMS provider is "${lib.safeText(smsInfo.provider, 20)}", not the real rail (blackball)`);
  else if (smsInfo.configured !== true) add("rail", false, "the SMS provider is blackball but it reports itself not configured");
  else add("rail", true, "SMS provider blackball, configured");

  // webhook · the receipt secret is set
  if (!smsInfo) add("webhook", false, "the receipt secret was not read (no usable /api/health)");
  else if (smsInfo.webhookSecretSet !== true) add("webhook", false, "the receipt secret is NOT set — receipts cannot be accepted, so 'Delivered' would stay at zero");
  else add("webhook", true, "the receipt secret is set (a flag only; the secret itself is never read)");

  // credit · covers the codes reserve and the drive's sends
  const used = ctx.ledger.ok ? ctx.ledger.used : 0;
  const remaining = Math.max(0, SEND_CAP - used);
  const need = s.codesReserveTzs + remaining * s.pricePerSegmentTzs;
  if (!smsInfo) add("credit", false, "the SMS credit was not read (no usable /api/health)");
  else if (typeof smsInfo.balanceTzs !== "number") add("credit", false, "the SMS credit is not known (the gateway's balance could not be read just now)");
  else if (smsInfo.balanceStale === true) add("credit", false, `the SMS credit figure (${tzs(smsInfo.balanceTzs)}) is stale — read it fresh on Admin → System`);
  else if (smsInfo.balanceTzs < need) add("credit", false, `the SMS credit ${tzs(smsInfo.balanceTzs)} is below ${tzs(need)} (${tzs(s.codesReserveTzs)} kept for codes + ${remaining} sends × ${tzs(s.pricePerSegmentTzs)})`);
  else add("credit", true, `the SMS credit ${tzs(smsInfo.balanceTzs)} covers ${tzs(need)} (${tzs(s.codesReserveTzs)} kept for codes + ${remaining} sends × ${tzs(s.pricePerSegmentTzs)})`);

  // ledger · room for the next sends
  if (!ctx.ledger.ok) add("ledger", false, `the ledger cannot be trusted (${ctx.ledger.why}) — move it aside by hand; it is never reset for you`);
  else if (ctx.ledger.used + args.sends > SEND_CAP) add("ledger", false, `the ledger refuses: ${ctx.ledger.used} of ${SEND_CAP} chargeable sends already counted, and this step would add ${args.sends}`);
  else add("ledger", true, `${ctx.ledger.used} of ${SEND_CAP} chargeable sends counted · room for this step's ${args.sends} (${SEND_CAP - ctx.ledger.used - args.sends} spare after it)`);

  // test-number · the numbering plan said ok when the argument was read
  add("test-number", true, `${args.test.masked} is a sendable Tanzanian mobile number${args.test.operator ? ` (prefix of ${args.test.operator})` : ""}`);

  // test-book · the contact-book row
  const c = facts.test.contact;
  if (!c) add("test-book", false, `${args.test.masked} has no contact-book row — a book list cannot hold it`);
  else if (c.erased === true) add("test-book", false, `${args.test.masked}'s book row is the erasure tombstone — no list or basis can reach it`);
  else add("test-book", true, `a live book row (consent cache ${lib.safeText(c.consent_state, 12)}, source ${lib.safeText(c.source, 12)}${c.suppressed ? ", marked suppressed" : ""}${c.linked ? ", linked to an account" : ""})`);

  // test-lists · membership
  const lists = facts.test.lists ?? [];
  if (!c || c.erased === true) add("test-lists", false, "no live book row, so no list membership");
  else if (lists.length === 0) add("test-lists", false, `${args.test.masked} is on no list — a campaign to "a book list" cannot reach it`);
  else add("test-lists", true, lists.slice(0, 5).map((l) => `${lib.safeLabel(l.list_name)} (${l.members} member${l.members === 1 ? "" : "s"}${l.basis ? (l.basis.revoked ? ", newest basis revoked" : ", a basis is in force") : ""})`).join(" · ") + (lists.length > 5 ? ` · …and ${lists.length - 5} more` : ""));

  // test-consent / test-cycle · the gate's consent-and-basis half, now and after the stop link's two acts
  const userFacts = facts.test.user
    ? { status: facts.test.user.status, optIn: facts.test.user.opt_in === true, adult: lib.ageBand(facts.test.user.dob, nowMs) }
    : null;
  const coverFor = (l) => {
    if (!l.basis || l.basis.revoked === true) return false;
    const added = Date.parse(lib.toIso(l.added_at) ?? "");
    const recorded = Date.parse(lib.toIso(l.basis.recorded_at) ?? "");
    return Number.isFinite(added) && Number.isFinite(recorded) && added <= recorded;
  };
  const eligFacts = {
    suppression: (facts.test.suppressions ?? []).some((x) => x.lifted_at === null || x.lifted_at === undefined),
    user: userFacts,
    latest: lib.classifyLedgerRow(facts.test.latest, saved),
    outreach: lib.readOutreach(facts.config[lib.KEY_OUTREACH]).state,
    book: { row: !c ? "none" : c.erased === true ? "erased" : "live", cover: !userFacts && lists.some(coverFor) },
  };
  const verdict = (v) => v.ok
    ? `the gate would clear it on the ${v.branch === "account" ? "ACCOUNT" : "CONTACT"} branch (${v.basis})${v.unjudged.length ? ` — asked again at the send, not judged here: ${v.unjudged.join(", ")}` : ""}`
    : `the gate would refuse it: ${v.skipReason} (${v.detail})`;
  const now = lib.judgeEligibility(eligFacts);
  add("test-consent", now.ok, verdict(now));
  const after = lib.judgeEligibility(lib.factsAfterStopCycle(eligFacts, nowMs));
  add("test-cycle", after.ok, after.ok
    ? `after the stop link's two acts (stop, then "Start them again") the gate would still clear it (${after.basis}) — campaign C can send`
    : `after the stop link's two acts the gate would REFUSE it: ${after.skipReason} (${after.detail}) — campaign C would skip it`);

  // test-fresh · no earlier campaign holds it
  const held = facts.test.campaigns ?? [];
  if (held.length === 0) add("test-fresh", true, "no earlier campaign holds the test number");
  else add("test-fresh", false, `${held.length} earlier campaign row${held.length === 1 ? "" : "s"} hold the number: ${held.slice(0, 5).map((r) => `${lib.safeText(r.campaign_id, 30)} ${lib.safeText(r.status, 12)}`).join(" · ")}`);

  // control · an active stop on the control number
  if (!args.control) add("control", null, "no control number named — the §7 Q4 fallback: the refusal is proven on the test number before and after its stop, and the same-run control is NOT done (recorded)");
  else {
    const active = (facts.control?.suppressions ?? []).filter((x) => x.lifted_at === null || x.lifted_at === undefined);
    if (active.length === 0) add("control", false, `${args.control.masked} has no ACTIVE stop — it would not be refused`);
    else add("control", true, `${args.control.masked} has an active stop (${lib.safeText(active[0].reason, 16)}, since ${lib.fmtEat(active[0].created_at)} EAT)`);
  }
  return rows;
}

/** GO / NO-GO / n/a as a column. */
const mark = (go) => (go === true ? "GO   " : go === false ? "NO-GO" : "n/a  ");

export function renderPreflight(rows, ctx, lib = LIB) {
  const lines = [];
  lines.push(`U52a pre-flight · read-only · ${lib.fmtEat(ctx.nowMs)} EAT`);
  lines.push(`test ${ctx.args.test.masked} · ${ctx.args.control ? `control ${ctx.args.control.masked}` : "control not named (the Q4 fallback)"} · production ${ctx.args.origin.replace(/^https?:[/][/]/, "")}`);
  lines.push(`transaction read-only: ${ctx.readOnly}`);
  for (const r of rows) lines.push(`  ${mark(r.go)}  ${r.id.padEnd(12)} ${r.reason}`);
  const bad = rows.filter((r) => r.go === false);
  const applicable = rows.filter((r) => r.go !== null).length;
  lines.push(bad.length === 0
    ? `RESULT: GO — ${applicable} of ${applicable} rows${rows.length > applicable ? ` (${rows.length - applicable} not applicable)` : ""}`
    : `RESULT: NO-GO — ${bad.length} of ${applicable} rows: ${bad.map((r) => r.id).join(", ")}`);
  return lines;
}

/* ══ THE RUN ═════════════════════════════════════════════════════════════════════════════════════════════════════════ */

/** The shipped dependencies. A suite hands in a stand-in for each; the tool itself reads none of this from anywhere else. */
export function realDeps() {
  return {
    env: process.env,
    sink: (line) => console.log(line),
    now: () => Date.now(),
    fetch: (...a) => fetch(...a),
    ledgerIo: () => LIB.fileLedgerIo(),
    makePrisma: async () => {
      const { PrismaClient } = await import("@prisma/client");
      return new PrismaClient();
    },
    timeoutMs: FETCH_TIMEOUT_MS,
    lib: LIB,
  };
}

export async function runPreflight(argv, deps = realDeps()) {
  const d = { ...realDeps(), ...deps };
  const lib = d.lib;
  const parsed = parsePreflightArgs(argv, lib);
  if (!parsed.ok) {
    const io0 = lib.makeIo(d.sink, d.env, []);
    for (const p of parsed.problems) io0.line(`REFUSING: ${p}`);
    io0.line(USAGE);
    return EXIT.notRun;
  }
  const { args } = parsed;
  const keys = [args.test.key, ...(args.control ? [args.control.key] : [])];
  const io = lib.makeIo(d.sink, d.env, keys);
  if (!d.env.DATABASE_URL) {
    io.line("REFUSING: no DATABASE_URL — run through the runner, which sets the public proxy.");
    return EXIT.notRun;
  }
  if (/[.]railway[.]internal(?::|[/]|$)/.test(String(d.env.DATABASE_URL))) {
    io.line("REFUSING: DATABASE_URL is Railway's private host, which does not resolve off Railway — the runner must set the public proxy.");
    return EXIT.notRun;
  }

  // The public reads first (they take seconds), the transaction after (it should be short).
  const [home, health] = await Promise.all([
    fetchBounded(d.fetch, `${args.origin}/`, d.timeoutMs, "html"),
    fetchBounded(d.fetch, `${args.origin}/api/health`, d.timeoutMs, "json"),
  ]);
  const homeRead = home.ok ? { ok: true, dpl: dplFromHtml(home.text) } : home;
  const ledgerRead = lib.readLedger(d.ledgerIo());
  const ledger = ledgerRead.ok ? { ok: true, used: lib.ledgerTotal(ledgerRead.ledger), existed: ledgerRead.existed } : { ok: false, why: ledgerRead.why };

  let facts;
  let prisma = null;
  try {
    prisma = await d.makePrisma();
    facts = await lib.readOnlyTransaction(prisma, (tx) => readPreflightFacts(tx, { testKey: args.test.key, controlKey: args.control ? args.control.key : null }));
  } catch (err) {
    io.line(`NOT RUN: the read could not be made (${lib.describeError(err, d.env, keys)})`);
    return EXIT.notRun;
  } finally {
    if (prisma && typeof prisma.$disconnect === "function") { try { await prisma.$disconnect(); } catch { /* the run is over either way */ } }
  }

  const ctx = { nowMs: d.now(), args, home: homeRead, health, ledger, readOnly: "on" };
  const rows = judgePreflight(facts, ctx, lib);
  for (const line of renderPreflight(rows, ctx, lib)) io.line(line);
  return rows.some((r) => r.go === false) ? EXIT.fail : EXIT.ok;
}

const entry = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === entry) {
  process.exitCode = await runPreflight(process.argv.slice(2), realDeps());
}
