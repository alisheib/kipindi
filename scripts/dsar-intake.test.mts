/**
 * THE DSAR REGISTER CAN BE POPULATED — and only with the two rights it is FOR.
 *
 *   npx tsx scripts/dsar-intake.test.mts        (npm run test:dsar-intake)
 *
 * ⛔ WHY THIS EXISTS (E-33, closed 2026-08-21). `fileDsarRequest` had exactly one caller —
 * `fileDsarAction` — and that action had none. So nothing on the platform could put a request
 * INTO the register, and `/admin/privacy` rendered *"No data-subject access requests are on
 * file"* permanently. **Not because nobody had asked: because asking was unrecordable.** The
 * export path worked, so a player could always GET their data; what could not be recorded is
 * that they ASKED, and the statutory response clock runs from the ask.
 *
 * That is the shape this suite guards, and it has two halves that pull opposite ways:
 *
 *   ① a request must actually LAND — or the register is a page that renders zero for ever;
 *   ② only ERASURE and CORRECTION may land. ACCESS and PORTABILITY are already served by the
 *     export, immediately and with no clock; filing one opens a 30-day statutory obligation
 *     for work that is already done, and a queue of already-answered requests is how a real
 *     one gets missed.
 *
 * ⚠️ THE ACTIONS THEMSELVES CANNOT BE CALLED HERE. Both read a session cookie
 * (`currentSession`) or an RBAC grant (`softRequireStaff`), neither of which exists in a unit
 * run. So the SERVICE is driven for behaviour, and the two action files are READ for the two
 * properties that live in them — with the comments stripped first, because both files explain
 * the allowlist at length and a file-wide regex would match the explanation.
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";
process.env.OTP_PEPPER ??= "test-only-pepper";

import { readFileSync } from "node:fs";
import { db } from "../src/lib/server/store.ts";
import {
  fileDsarRequest, fulfillDsarRequest, listDsarRequests, hasOpenRequest,
  asRequestableType, REQUESTABLE_TYPES,
} from "../src/lib/server/privacy.ts";
// ⚠️ `auditFlush` IS NOT OPTIONAL HERE. `audit()` is queued and resolves on a later
// microtask, so reading the ring straight after a synchronous call finds nothing — this
// suite reported "not in the audit chain" for two rows whose `[audit]` lines were
// printing in its own transcript.
import { getAuditPage, auditFlush } from "../src/lib/server/audit.ts";

const LOG = console.log.bind(console);
let pass = 0;
const fails: string[] = [];
const ok = (label: string, cond: boolean, extra = "") => {
  if (cond) pass++;
  else { fails.push(label); LOG(`FAIL ${label}${extra ? `\n       ${extra}` : ""}`); }
  return cond;
};
const section = (s: string) => LOG(`\n── ${s} ${"─".repeat(Math.max(0, 58 - s.length))}`);

const stripTs = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const read = (p: string) => readFileSync(p, "utf8");

const NOW = Date.parse("2026-08-21T09:00:00.000Z");
const iso = (ms: number) => new Date(ms).toISOString();
const DAY = 24 * 60 * 60 * 1000;

const mkUser = async (id: string, status: string, closedAt: string | null) =>
  db.user.create({
    id, phoneE164: `+2557130${id.slice(-5)}`, email: null, emailVerifiedAt: null,
    passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status, locale: "EN", displayName: `P ${id.slice(-4)}`, dob: null,
    region: null, acceptedTermsVersion: "v3", acceptedTermsAt: iso(NOW),
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: iso(NOW - 100 * DAY), updatedAt: iso(NOW), lastLoginAt: null, closedAt,
  } as never);

/** A typed identity on the account — the record the 7-year hold keeps — with one stored image when `docKey` is given. */
const kycRow = (uid: string, docKey: string | null, at: string) => ({
  id: `kyc_${uid}`, userId: uid, status: "APPROVED", rejectReason: null, rejectNote: null,
  idType: "VOTER_CARD", idNumber: `QADSAR${uid.slice(-5)}`, idExpiry: null, idVerifiedAt: at, idFingerprint: null,
  fullName: `Dsar Fixture ${uid.slice(-5)}`, dob: "1990-01-01",
  documents: docKey ? [{ docType: "VOTER_CARD", storageKey: docKey, uploadedAt: at, mimeType: "image/png", sizeBytes: 70 }] : [],
  extraRequests: [], reviewerId: null, reviewedAt: at, submittedAt: at, approvedAt: at,
  photoVerifiedAt: null, autoApprovedAt: null, autoFlags: [], postCheckedAt: null, postCheckedById: null, priorIdentities: [],
  createdAt: at, updatedAt: at,
});

const LIVE = "usr_dsar_10001";
const CLOSED = "usr_dsar_10002";
await mkUser(LIVE, "ACTIVE", null);
// ⚠️ Closed ten days before the REAL clock, not the fixed NOW (2026-10-11, review PC-3 F11): erasure reads the real time,
// so a closure fixed in 2026 would cross its release in 2033 and turn §4's PARTIAL into a release.
await mkUser(CLOSED, "CLOSED", iso(Date.now() - 10 * DAY));
// ⭐ …and a typed identity, so the hold HOLDS something (2026-10-11, review PC-1 MAJOR-2): an account that never verified
// holds nothing, and 4.7b asserts that it is FULFILLED at once.
await db.kyc.upsert(kycRow(CLOSED, null, iso(Date.now() - 200 * DAY)) as never);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · a request LANDS — the register is populable at all");
// ═════════════════════════════════════════════════════════════════════════════
{
  ok("1.0 CONTROL · the register starts empty for this user, so §1.1 measures an insertion",
    listDsarRequests().filter((r) => r.userId === LIVE).length === 0);
  const filed = fileDsarRequest({ userId: LIVE, type: "CORRECTION", reason: "wrong region" });
  const mine = listDsarRequests().filter((r) => r.userId === LIVE);
  ok("1.1 🔴 it is IN the register", mine.length === 1 && mine[0].id === filed.id,
    `${mine.length} row(s) — if 0, /admin/privacy renders "No DSAR requests" for ever (E-33)`);
  ok("1.2 …as PENDING, with the 30-day clock started from the ASK",
    mine[0].status === "PENDING" && !!mine[0].requestedAt);
  await auditFlush();
  ok("1.3 …and the filing is in the audit chain",
    getAuditPage({ limit: 10_000 }).some((e) => e.action === "privacy.dsar.filed" && e.targetId === filed.id));
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · ⛔ only the two rights the register is FOR");
// ═════════════════════════════════════════════════════════════════════════════
{
  ok("2.1 the requestable set is exactly ERASURE + CORRECTION",
    REQUESTABLE_TYPES.length === 2
      && (REQUESTABLE_TYPES as readonly string[]).includes("ERASURE")
      && (REQUESTABLE_TYPES as readonly string[]).includes("CORRECTION"),
    REQUESTABLE_TYPES.join(","));
  for (const served of ["ACCESS", "PORTABILITY"]) {
    ok(`2.2 🔴 ${served} is REFUSED by the narrower — it is already served by the export`,
      asRequestableType(served) === null,
      "Filing it opens a 30-day statutory obligation for work already done.");
  }
  ok("2.3 …and so is junk, an empty string, and undefined",
    asRequestableType("erasure") === null && asRequestableType("") === null
      && asRequestableType(undefined) === null && asRequestableType(null) === null);
  ok("2.4 ⭐ CONTROL — the narrower ACCEPTS both real types, so 2.2 is a refusal and not a " +
     "function that refuses everything",
    asRequestableType("ERASURE") === "ERASURE" && asRequestableType("CORRECTION") === "CORRECTION");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · one open request per person per kind");
// ═════════════════════════════════════════════════════════════════════════════
{
  ok("3.1 an open CORRECTION is seen as open", hasOpenRequest(LIVE, "CORRECTION"));
  ok("3.2 ⭐ CONTROL — a DIFFERENT kind is NOT blocked by it, so the cap is per-kind and " +
     "not a blanket lock",
    !hasOpenRequest(LIVE, "ERASURE"));
  ok("3.3 …and a different PERSON is not blocked either",
    !hasOpenRequest(CLOSED, "CORRECTION"));
  const before = listDsarRequests().length;
  // Both doors consult `hasOpenRequest` before filing; this asserts the predicate they
  // consult, and §5 asserts that they consult it.
  if (!hasOpenRequest(LIVE, "CORRECTION")) fileDsarRequest({ userId: LIVE, type: "CORRECTION" });
  ok("3.4 🔴 so a second identical filing adds NOTHING", listDsarRequests().length === before,
    "Without this a public form fills the compliance queue and hides the real requests.");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · fulfilment tells the truth about what it did");
// ═════════════════════════════════════════════════════════════════════════════
{
  // ⛔ A LIVE ACCOUNT. The erasure routine refuses, and the request must NOT be closed.
  const liveErasure = fileDsarRequest({ userId: LIVE, type: "ERASURE" });
  const refused = await fulfillDsarRequest({ id: liveErasure.id, officerId: "usr_officer" });
  ok("4.1 🔴 an ERASURE on a LIVE account is REFUSED", refused.ok === false,
    JSON.stringify(refused));
  ok("4.2 ⛔ …and the request is STILL PENDING — a refusal must never leave a false 'fulfilled'",
    listDsarRequests().find((r) => r.id === liveErasure.id)?.status === "PENDING");
  await auditFlush();
  ok("4.3 …and the refusal is audited under the name it has always had",
    getAuditPage({ limit: 10_000 }).some((e) => e.action === "privacy.dsar.erasure_blocked"));

  // A CLOSED account, 10 days ago — inside the 7-year document hold.
  const closedErasure = fileDsarRequest({ userId: CLOSED, type: "ERASURE" });
  const partial = await fulfillDsarRequest({ id: closedErasure.id, officerId: "usr_officer" });
  ok("4.4 an ERASURE on a CLOSED account runs", partial.ok === true,
    partial.ok ? "" : (partial as { error: string }).error);
  const row = listDsarRequests().find((r) => r.id === closedErasure.id);
  ok("4.5 🔴 it lands as PARTIAL, not FULFILLED — the documents are held for 7 more years " +
     "and 'fulfilled' would be a false statement in a compliance queue",
    row?.status === "PARTIAL", String(row?.status));
  ok("4.6 …carrying the release DATE, because nothing else on the platform remembers it",
    !!row?.erasureHeldUntil && /^\d{4}-\d{2}-\d{2}$/.test(row.erasureHeldUntil),
    String(row?.erasureHeldUntil));
  ok("4.7 …and it STAYS in the queue as open work",
    hasOpenRequest(CLOSED, "ERASURE"),
    "A PARTIAL request IS the seven-year reminder; retiring it retires the reminder.");

  // ⭐ NOTHING HELD → FULFILLED (2026-10-11, review PC-1 MAJOR-2). Identity is asked only before a withdrawal, so most
  // closed accounts never gave one; for them the hold holds nothing, and "identity held" with a 2033 date would be false.
  const NEVER = "usr_dsar_10005";
  await mkUser(NEVER, "CLOSED", iso(Date.now() - 10 * DAY));
  const neverReq = fileDsarRequest({ userId: NEVER, type: "ERASURE" });
  const never = await fulfillDsarRequest({ id: neverReq.id, officerId: "usr_officer" });
  const neverRow = listDsarRequests().find((r) => r.id === neverReq.id);
  ok("4.7b 🔴 an account that never verified its identity — nothing held — is FULFILLED at once, never \"identity held\" for seven years",
    never.ok === true && neverRow?.status === "FULFILLED" && !neverRow.erasureHeldUntil && !hasOpenRequest(NEVER, "ERASURE"),
    JSON.stringify({ status: neverRow?.status, held: neverRow?.erasureHeldUntil }));

  // A CORRECTION closes outright — nothing is held.
  const corr = listDsarRequests().find((r) => r.userId === LIVE && r.type === "CORRECTION");
  const done = await fulfillDsarRequest({ id: corr!.id, officerId: "usr_officer" });
  ok("4.8 ⭐ CONTROL — a CORRECTION reaches FULFILLED, so PARTIAL is a real distinction and " +
     "not the only outcome the code can produce",
    done.ok && listDsarRequests().find((r) => r.id === corr!.id)?.status === "FULFILLED",
    String(listDsarRequests().find((r) => r.id === corr!.id)?.status));
  ok("4.9 …and it carries no held-until date, because nothing is held",
    !listDsarRequests().find((r) => r.id === corr!.id)?.erasureHeldUntil);
  ok("4.10 an unknown id is refused rather than silently succeeding",
    (await fulfillDsarRequest({ id: "dsar_nope", officerId: "usr_officer" })).ok === false);

  // ⭐ AFTER THE HOLD (2026-10-11, Part C review): FULFILLED only when every stored identity file is really gone. Two
  // accounts closed eight years ago, each with one KYC image: an `r2:` object the storage cannot delete here (no bucket
  // in a unit run, so `deleteKycDocument` answers false — the erasure suite relies on the same), and an inline image it can.
  const EIGHT_YEARS_AGO = iso(Date.now() - 8 * 366 * DAY);
  const STUCK = "usr_dsar_10003", CLEAN = "usr_dsar_10004";
  await mkUser(STUCK, "CLOSED", EIGHT_YEARS_AGO);
  await mkUser(CLEAN, "CLOSED", EIGHT_YEARS_AGO);
  const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  for (const [uid, key] of [[STUCK, `r2:kyc/${STUCK}/VOTER_CARD`], [CLEAN, PNG]] as const) {
    await db.kyc.upsert(kycRow(uid, key, EIGHT_YEARS_AGO) as never);
  }
  const stuckReq = fileDsarRequest({ userId: STUCK, type: "ERASURE" });
  const stuck = await fulfillDsarRequest({ id: stuckReq.id, officerId: "usr_officer" });
  const stuckRow = listDsarRequests().find((r) => r.id === stuckReq.id);
  ok("4.11 CONTROL · the run after the hold reached the release (no held-until date) and counted the file it could not delete",
    stuck.ok === true && !!stuck.erasure?.ok && stuck.erasure.documentsHeldUntil === null && stuck.erasure.counts.documentObjectsFailed === 1,
    JSON.stringify(stuck.ok && stuck.erasure?.ok ? { held: stuck.erasure.documentsHeldUntil, failed: stuck.erasure.counts.documentObjectsFailed } : stuck));
  ok("4.12 🔴 after the hold, a stored file the storage would not delete keeps the request PARTIAL — never FULFILLED",
    stuckRow?.status === "PARTIAL" && stuckRow.erasureObjectsFailed === 1 && hasOpenRequest(STUCK, "ERASURE"),
    JSON.stringify({ status: stuckRow?.status, failed: stuckRow?.erasureObjectsFailed }));
  const cleanReq = fileDsarRequest({ userId: CLEAN, type: "ERASURE" });
  const clean = await fulfillDsarRequest({ id: cleanReq.id, officerId: "usr_officer" });
  const cleanRow = listDsarRequests().find((r) => r.id === cleanReq.id);
  ok("4.13 ⭐ CONTROL — after the hold with every file gone, the same request reaches FULFILLED (0 left), so 4.12 is the rule and not a request that can never close",
    clean.ok === true && cleanRow?.status === "FULFILLED" && (cleanRow.erasureObjectsFailed ?? 0) === 0,
    JSON.stringify({ status: cleanRow?.status, failed: cleanRow?.erasureObjectsFailed }));

  // ⭐ AN AGENT FILE THE STORAGE REFUSED counts too (2026-10-11, reviews PC-1/PC-2/PC-3): a referee's ID scan is a stored
  // file, and nothing re-runs a request once it reads FULFILLED. No KYC row: only the agent programme holds anything.
  const AGENT = "usr_dsar_10006", APP = "aga_dsar_10006";
  await mkUser(AGENT, "CLOSED", EIGHT_YEARS_AGO);
  await db.agentApplication.create({
    id: APP, userId: AGENT, status: "REJECTED", source: "SELF_SERVICE",
    refereeOneName: null, refereeOneContact: null, refereeTwoName: null, refereeTwoContact: null, refereeConsentAt: null,
    feeAmountTzs: null, feeAttestedTzs: null, feeFundingSource: null, feeReference: null, feeStatementRef: null,
    feeReconciledAt: null, feeReconciledById: null, feeSourceAccount: null, feeWaivedAt: null, feeWaivedById: null,
    feeWaiverReason: null, feeDisposition: "NONE", feeRefundDueAt: null, feeRefundedAt: null, feeRefundedById: null,
    feeRefundReference: null, feeRefundAmountTzs: null, reviewerId: null, reviewedAt: EIGHT_YEARS_AGO, rejectReason: null,
    rejectNote: null, infoRequestNote: null, infoRequestedAt: null, approvedRatePct: null, agentCode: null,
    acceptedTermsVersion: null, acceptedTermsAt: null, submittedAt: EIGHT_YEARS_AGO, expiresAt: null,
    createdAt: EIGHT_YEARS_AGO, updatedAt: EIGHT_YEARS_AGO,
  } as never);
  await db.agentApplicationDoc.create({
    id: "agd_dsar_10006", applicationId: APP, docType: "REFEREE_ONE_ID", storageKey: `r2:kyc/agentapp/${APP}/REFEREE_ONE_ID`,
    mimeType: "image/png", sizeBytes: 70, suppliedById: AGENT, uploadedAt: EIGHT_YEARS_AGO, rejected: false,
    rejectReason: null, thirdParty: true, purgedAt: null,
  } as never);
  const agentReq = fileDsarRequest({ userId: AGENT, type: "ERASURE" });
  const agentRun = await fulfillDsarRequest({ id: agentReq.id, officerId: "usr_officer" });
  const agentRow = listDsarRequests().find((r) => r.id === agentReq.id);
  ok("4.14 CONTROL · the run after the hold reached the agent file and counted it as not deleted — and nothing else failed",
    agentRun.ok === true && !!agentRun.erasure?.ok && agentRun.erasure.counts.agentDocumentObjectsFailed === 1
      && agentRun.erasure.counts.documentObjectsFailed === 0,
    JSON.stringify(agentRun.ok && agentRun.erasure?.ok ? agentRun.erasure.counts : agentRun));
  ok("4.15 🔴 …and that agent file keeps the request PARTIAL — never FULFILLED over a stored file",
    agentRow?.status === "PARTIAL" && agentRow.erasureObjectsFailed === 1 && hasOpenRequest(AGENT, "ERASURE"),
    JSON.stringify({ status: agentRow?.status, failed: agentRow?.erasureObjectsFailed }));
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · both doors exist, and both go through the narrower and the cap");
// ═════════════════════════════════════════════════════════════════════════════
{
  const PLAYER = "src/app/profile/account/actions.ts";
  const OFFICER = "src/app/admin/privacy/actions.ts";
  const FORM = "src/app/profile/account/privacy-request-form.tsx";
  const CONTROLS = "src/app/admin/privacy/dsar-controls.tsx";
  const player = stripTs(read(PLAYER));
  const officer = stripTs(read(OFFICER));
  const page = read("src/app/profile/account/page.tsx");
  const controls = stripTs(read(CONTROLS));
  const adminPage = stripTs(read("src/app/admin/privacy/page.tsx"));

  ok("5.0 CONTROL · all five files were read and are the right ones",
    player.includes("filePrivacyRequestAction") && officer.includes("fileDsarAction")
      && page.includes("PrivacyRequestForm") && controls.includes("FileDsarOnBehalfButton")
      && adminPage.includes("FulfillDsarButton"),
    "If this fires, every assertion below measured the wrong file.");

  for (const [label, src] of [["the player's door", player], ["the officer's door", officer]] as const) {
    ok(`5.1 ${label} narrows the type through asRequestableType`,
      /asRequestableType\(/.test(src),
      "⛔ A bare `as DsarType` on form input files an ACCESS request from a hand-posted body.");
    ok(`5.2 ${label} consults the one-open-per-kind cap`,
      /hasOpenRequest\(/.test(src));
    ok(`5.3 ⛔ ${label} does NOT cast form input to a DsarType`,
      !/as\s+DsarType/.test(src) && !/as\s+"ACCESS"/.test(src),
      "The cast is what let ACCESS in, and it was also the DEFAULT on the officer's door.");
  }

  ok("5.4 🔴 the player's form is actually MOUNTED on /profile/account — an action with no " +
     "caller is exactly the defect this closes (E-33)",
    /<PrivacyRequestForm\s*\/>/.test(page));
  // ⚠️ PINNED TO THE WALK-IN DOOR'S OWN ROW (2026-10-11, review PC-3 F2): Part C mounts a SECOND on-behalf button, in the
  // held list, and a bare `<FileDsarOnBehalfButton\s` still matched with the walk-in door unmounted — `red:dsar-intake`'s
  // on-behalf-button-unmounted case came back MISSED.
  ok("5.5 🔴 …and the officer's on-behalf control is mounted on /admin/privacy, on the recent-players table",
    /<FileDsarOnBehalfButton\s+userId=\{u\.id\}/.test(adminPage));
  ok("5.5b …and the held list keeps its own door, for a held identity no request tracks (Part C)",
    /<FileDsarOnBehalfButton\s+userId=\{h\.userId\}/.test(adminPage));
  ok("5.6 the form offers ONLY the two requestable types",
    /"CORRECTION"/.test(read(FORM)) && /"ERASURE"/.test(read(FORM))
      && !/"ACCESS"/.test(read(FORM)) && !/"PORTABILITY"/.test(read(FORM)),
    "Access is served by the Export button on the same page, instantly.");

  // ⛔ THE COPY ON A DESTRUCTIVE BUTTON. `Mark fulfilled` on an ERASURE row now DESTROYS
  // columns, and the dialog used to describe it as recording a completion date — plus two
  // claims that were measurably false, one of them impossible.
  ok("5.7 🔴 the fulfil dialog says ERASURE DESTROYS data, not that it records a date",
    /Erase this player's personal data/.test(controls) && /destroyed/.test(controls),
    "A destructive control described as bookkeeping does not tell the operator what they do.");
  ok("5.8 🔴 …and it no longer promises a notification the platform cannot send",
    !/player will be notified/i.test(controls),
    "Erasure nulls the email, tombstones the phone and deletes the notifications — the\n" +
    "       confirmation channel is destroyed by the act being confirmed. Measured: nothing\n" +
    "       in fulfillDsarRequest notifies anybody.");
  ok("5.9 …and it tells the officer to answer the player FIRST",
    /Answer the player FIRST/.test(controls));
  // ⭐ THE OFFICER IS TOLD WHICH PARTIAL IT IS (2026-10-11, the screenshot pass and review PC-3 F6): a run whose storage
  // deletions failed is reported as NOT DONE — the danger card — and the queue row's badge is given the cause.
  ok("5.10 🔴 a failed-deletion run is marked INCOMPLETE under its own title, and the button shows it as a failure, never a tick",
    /incomplete:\s*true,\s*noticeTitle:\s*REVIEW\.dsarPartialDeleteFailed\.en/.test(officer)
      && /if \(r\.incomplete\) overlay\.fail\(/.test(controls));
  ok("5.11 …and the queue row's badge is told the cause, so it never reads \"identity held\" after the release",
    /<DsarStatusBadge status=\{r\.status\}\s+deletionFailed=\{!r\.erasureHeldUntil && \(r\.erasureObjectsFailed \?\? 0\) > 0\}/.test(adminPage));
}

LOG("");
LOG("─".repeat(64));
LOG("  The register exists for the two rights that need a human decision.");
LOG("  The other two are already answered before anyone can ask.");
LOG("─".repeat(64));
console.log(`\n${fails.length === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fails.length} failed`);
for (const f of fails) LOG(`  · ${f}`);
process.exit(fails.length === 0 ? 0 : 1);
