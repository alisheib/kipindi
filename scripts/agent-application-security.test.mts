/**
 * AGENT APPLICATION SECURITY — the whole lifecycle, driven through the service, every refusal
 * beside the control that must pass.
 *
 * Applicant: start · documents (sniffed mime) · referees (consent) · fee (unique receipt) ·
 * submit (complete + terms). Officer: reconcile (exact amount) · waive (typed reason) · more
 * info · reject (refund owed, clocked) · refund · approve (self-review, staff, ceiling, twice,
 * before acceptance) · standing. Invitation: issue (refusals) · a code EMAILED to the bound
 * mailbox · accept (the signed-in account must own that address) · revoke, plus a phone-era row
 * that must still preview and must refuse a code honestly. Edge: the proxy protects exactly the
 * signed-in agent routes.
 *
 * Red harness: `npm run red:agent-application-security`.
 */
import "./lib/verified-fixtures.mts";
import { db } from "../src/lib/server/store.ts";
import { mkFixtureUser, approveFixtureAgent } from "./lib/agent-fixtures.mts";
import { isApprovedAgent } from "../src/lib/server/affiliate-service.ts";
import { getAgentConfig, setAgentConfig } from "../src/lib/server/agent-config.ts";
import { emailOutbox, clearEmailOutbox } from "../src/lib/server/email.ts";
import { AGENT_TERMS_VERSION } from "../src/lib/agent-terms-version.ts";
import { isProtectedPath } from "../src/proxy.ts";
import { getAuditPage } from "../src/lib/server/audit.ts";
import {
  startApplication, attachAgentDocument, setReferees, recordFeePayment, submitForReview, applicantView,
  reconcileFee, waiveFee, recordFeeRefund, requestMoreInfo, rejectApplication, approveAgent, deactivateAgent, reactivateAgent, revokeAgent,
  issueInvitation, requestInvitationOtp, acceptInvitation, revokeInvitation, invitationPreview, applicantEligibility,
  REQUIRED_DOC_SLOTS, ALL_DOC_SLOTS, feeBreakdown,
} from "../src/lib/server/agent-application-service.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => { if (cond) pass++; else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); } };

// A real 1×1 PNG; a real GIF wearing a PNG label. The validator sniffs bytes, not the label.
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const GIF_AS_PNG = "data:image/png;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

const cfg = getAgentConfig();
/**
 * 🔴 THE TOTAL THE APPLICANT PAYS, NOT `registrationFeeTzs`.
 *
 * This read `cfg.registrationFeeTzs` and was correct only by coincidence: while the shipped
 * VAT treatment was `INCLUSIVE` the fee and the total were the same number. Management moved
 * the treatment to `EXCLUSIVE` on 2026-09-08 ("TZS 100,000 + VAT = 118,000"), and the
 * coincidence ended — this suite then attested 100,000 against a 118,000 fee and four
 * downstream legs (reconcile → approve → reject → refund) failed as a chain from one wrong
 * fixture.
 *
 * ⛔ `feeBreakdown` IS THE ONLY PLACE THAT KNOWS WHAT AN APPLICANT OWES. Anything that
 * attests, validates or refunds a payment reads `totalTzs` from it — never a raw config field.
 */
const FEE = feeBreakdown(cfg).totalTzs;
const DAY = 86_400_000;
await mkFixtureUser("sec_officer", { role: "COMPLIANCE" });
await mkFixtureUser("sec_admin", { role: "ADMIN" });

async function fullDraft(uid: string, feeRef: string) {
  const s = await startApplication(uid);
  if (!s.ok) throw new Error(`start ${uid}: ${s.error}`);
  for (const slot of REQUIRED_DOC_SLOTS) { const r = await attachAgentDocument(uid, slot, PNG); if (!r.ok) throw new Error(`attach ${slot}: ${r.error}`); }
  const rf = await setReferees(uid, { oneName: "Amina J", oneContact: "+255711000001", twoName: "Baraka K", twoContact: "+255711000002", consent: true });
  if (!rf.ok) throw new Error(`referees: ${rf.error}`);
  // The receipt image is evidence; the typed reference is the claim. Evidence first.
  const rc = await attachAgentDocument(uid, "FEE_RECEIPT", PNG);
  if (!rc.ok) throw new Error(`receipt: ${rc.error}`);
  const fee = await recordFeePayment(uid, { feeReference: feeRef });
  if (!fee.ok) throw new Error(`fee: ${fee.error}`);
  return s.data!.applicationId;
}

// ═══ §1 · THE DOOR ═══
{
  await mkFixtureUser("sec_app1");
  const staff = await startApplication("sec_officer");
  ok("1.staff · staff cannot apply", !staff.ok, JSON.stringify(staff));
  setAgentConfig({ enabled: false }, "test-officer");
  const shut = await startApplication("sec_app1");
  ok("1.door · a closed programme refuses a new application", !shut.ok, JSON.stringify(shut));
  setAgentConfig({ enabled: true }, "test-officer");
  await mkFixtureUser("sec_excluded", { status: "SELF_EXCLUDED" });
  const ex = await startApplication("sec_excluded");
  ok("1.excluded · a self-excluded account cannot apply", !ex.ok, JSON.stringify(ex));
  await mkFixtureUser("sec_agent_already");
  await approveFixtureAgent("sec_agent_already", { commissionPct: 20 });
  const already = await applicantEligibility("sec_agent_already");
  ok("1.already · an approved agent cannot apply again", !already.ok && already.refusal === "already_agent", JSON.stringify(already));
  await mkFixtureUser("sec_nokyc");
  await db.kyc.upsert({ ...(await db.kyc.findByUserId("sec_nokyc"))!, status: "PENDING_REVIEW", approvedAt: null });
  const nokyc = await startApplication("sec_nokyc");
  ok("1.kyc · self-service needs an APPROVED identity first", !nokyc.ok, JSON.stringify(nokyc));

  const s1 = await startApplication("sec_app1");
  ok("1.control · CONTROL — an ordinary verified player starts a draft", s1.ok && s1.data?.resumed === false, JSON.stringify(s1));
  const s2 = await startApplication("sec_app1");
  ok("1.one · a second start RESUMES the same draft — never two applications", s2.ok && s2.data?.resumed === true && s2.data.applicationId === s1.data?.applicationId, JSON.stringify(s2));
  const v = await applicantView("sec_app1");
  ok("1.view · the applicant view reads in_progress", v.state === "in_progress", JSON.stringify(v.state));
}

// ═══ §2 · DOCUMENTS, REFEREES, FEE, SUBMIT ═══
{
  const gif = await attachAgentDocument("sec_app1", "CV", GIF_AS_PNG);
  ok("2.sniff · a GIF labelled PNG is refused (bytes, not label)", !gif.ok, JSON.stringify(gif));
  const bad = await attachAgentDocument("sec_app1", "PASSPORT" as never, PNG);
  ok("2.slot · an unknown slot is refused", !bad.ok);
  const cv = await attachAgentDocument("sec_app1", "CV", PNG);
  ok("2.control · CONTROL — a real PNG attaches", cv.ok, JSON.stringify(cv));
  const noConsent = await setReferees("sec_app1", { oneName: "Amina J", oneContact: "+255711000001", twoName: "Baraka K", twoContact: "+255711000002", consent: false });
  ok("2.consent · referees without the consent attestation are refused", !noConsent.ok, JSON.stringify(noConsent));

  /**
   * ⭐ THE REFEREE CONTACT IS A REACHABILITY RULE, AND EVERY REFUSAL NAMES ITS BOX.
   *
   * 🔴 The only rule used to be `length >= 6`, so "aaaaaa" passed and an officer discovered
   * the unreachable referee days later, at the point of a decision. And all four boxes shared
   * two sentences ("Each referee needs a name" / "…a phone number or email"), delivered as a
   * TOAST on a four-step form — so an applicant could not tell WHICH box was wrong, on a step
   * that might not even be on screen.
   *
   * ⚠️ THE PERMISSIVE CASES MATTER AS MUCH AS THE REFUSALS. A referee is not a 50pick account
   * holder: an office landline and an international number must PASS, because refusing them
   * would make an applicant invent a mobile number to get past the form — which is worse than
   * accepting the landline. The registration-grade `/^\+255[67]\d{8}$/` is deliberately NOT
   * the rule here.
   */
  {
    const base = { oneName: "Amina J", oneContact: "+255711000001", twoName: "Baraka K", twoContact: "+255711000002", consent: true };
    const junk = await setReferees("sec_app1", { ...base, oneContact: "aaaaaa" });
    ok("2.reach · a contact with no way to reach anybody is refused (the old length>=6 rule passed this)", !junk.ok, JSON.stringify(junk));
    ok("2.reachfield · …and the refusal names the box, so it can land on the input", !junk.ok && (junk as { field?: string }).field === "oneContact", JSON.stringify(junk));
    ok("2.reachrule · …and states the rule rather than saying \"invalid\"", !junk.ok && /0712 345 678|referee@example/.test(junk.error), JSON.stringify(junk));

    const numberAsName = await setReferees("sec_app1", { ...base, twoName: "0712345678" });
    ok("2.namedigits · a phone number typed into the NAME box is refused", !numberAsName.ok && (numberAsName as { field?: string }).field === "twoName", JSON.stringify(numberAsName));

    const shortName = await setReferees("sec_app1", { ...base, oneName: "A" });
    ok("2.nameshort · a one-character name is refused, naming its box", !shortName.ok && (shortName as { field?: string }).field === "oneName", JSON.stringify(shortName));

    const noContact = await setReferees("sec_app1", { ...base, twoContact: "   " });
    ok("2.blank · a blank contact is refused, naming its box", !noContact.ok && (noContact as { field?: string }).field === "twoContact", JSON.stringify(noContact));

    ok("2.consentfield · the consent refusal names the checkbox", !noConsent.ok && (noConsent as { field?: string }).field === "consent", JSON.stringify(noConsent));

    // CONTROLS — the shapes that must be accepted.
    const email = await setReferees("sec_app1", { ...base, oneContact: "referee@example.com" });
    ok("2.email · CONTROL — an email address is accepted", email.ok, JSON.stringify(email));
    const landline = await setReferees("sec_app1", { ...base, oneContact: "022 211 5811" });
    ok("2.landline · CONTROL — a Dar landline with spaces is accepted (a referee is not an account holder)", landline.ok, JSON.stringify(landline));
    const intl = await setReferees("sec_app1", { ...base, oneContact: "+44 20 7946 0958" });
    ok("2.intl · CONTROL — an international number is accepted", intl.ok, JSON.stringify(intl));
    const local = await setReferees("sec_app1", { ...base, oneContact: "0712-345-678" });
    ok("2.dashes · CONTROL — a local number written with dashes is accepted", local.ok, JSON.stringify(local));
    // Restore the fixture the rest of the suite expects.
    await setReferees("sec_app1", base);
  }
  const early = await submitForReview("sec_app1", { acceptedTermsVersion: AGENT_TERMS_VERSION });
  ok("2.incomplete · submitting an incomplete draft is refused and NAMES what is missing", !early.ok && Array.isArray((early as { data?: { missing?: string[] } }).data?.missing) && ((early as { data?: { missing?: string[] } }).data!.missing!.length > 0), JSON.stringify(early));
  const badRef = await recordFeePayment("sec_app1", { feeReference: "x" });
  ok("2.ref · a malformed receipt reference is refused", !badRef.ok);
  for (const slot of REQUIRED_DOC_SLOTS) await attachAgentDocument("sec_app1", slot, PNG);
  await setReferees("sec_app1", { oneName: "Amina J", oneContact: "+255711000001", twoName: "Baraka K", twoContact: "+255711000002", consent: true });
  const noReceipt = await recordFeePayment("sec_app1", { feeReference: "RCPT-SEC-001" });
  ok("2.evidence · a reference typed BEFORE the receipt image is refused — the claim needs its evidence", !noReceipt.ok, JSON.stringify(noReceipt));
  await attachAgentDocument("sec_app1", "FEE_RECEIPT", PNG);
  const fee1 = await recordFeePayment("sec_app1", { feeReference: "RCPT-SEC-001" });
  ok("2.fee · CONTROL — with the receipt attached the reference is recorded", fee1.ok, JSON.stringify(fee1));
  const noTerms = await submitForReview("sec_app1", { acceptedTermsVersion: "" });
  ok("2.terms · submitting without accepting the agent terms is refused", !noTerms.ok, JSON.stringify(noTerms));
  const sub = await submitForReview("sec_app1", { acceptedTermsVersion: AGENT_TERMS_VERSION });
  ok("2.submit · CONTROL — a complete draft submits", sub.ok, JSON.stringify(sub));
  const app = (await db.agentApplication.findActiveByUser("sec_app1"))!;
  ok("2.state · UNDER_REVIEW with the terms version stamped", app.status === "UNDER_REVIEW" && app.acceptedTermsVersion === AGENT_TERMS_VERSION && !!app.submittedAt, JSON.stringify([app.status, app.acceptedTermsVersion]));
  const locked = await attachAgentDocument("sec_app1", "CV", PNG);
  ok("2.locked · a submitted application cannot be edited by the applicant", !locked.ok);

  await mkFixtureUser("sec_app_dup");
  await startApplication("sec_app_dup");
  const dup = await recordFeePayment("sec_app_dup", { feeReference: "rcpt-sec-001" });
  ok("2.dupref · one receipt, one application — the same reference (any case) is refused", !dup.ok, JSON.stringify(dup));
}

// ═══ §3 · THE OFFICER: reconcile, self-review, ceiling, approve once ═══
{
  const app = (await db.agentApplication.findActiveByUser("sec_app1"))!;
  const early = await approveAgent("sec_officer", app.id, { commissionPct: 20 });
  ok("3.fee · approval before the fee is reconciled or waived is refused", !early.ok, JSON.stringify(early));
  const short = await reconcileFee("sec_officer", app.id, { attestedTzs: FEE - 1_000, statementRef: "STMT-1", sourceAccountMasked: "07•• ••• 877" });
  ok("3.short · a receipt attested for less than the fee is refused", !short.ok, JSON.stringify(short));
  const over = await reconcileFee("sec_officer", app.id, { attestedTzs: FEE + 1_000, statementRef: "STMT-1", sourceAccountMasked: "07•• ••• 877" });
  ok("3.over · …and for more", !over.ok);
  const rec = await reconcileFee("sec_officer", app.id, { attestedTzs: FEE, statementRef: "STMT-1", sourceAccountMasked: "07•• ••• 877" });
  ok("3.reconcile · CONTROL — the exact amount reconciles", rec.ok, JSON.stringify(rec));
  ok("3.stamped · the fee amount is stamped from CONFIG, the attestation beside it", (await db.agentApplication.findById(app.id))!.feeAmountTzs === FEE && (await db.agentApplication.findById(app.id))!.feeDisposition === "COLLECTED");

  const self = await approveAgent("sec_app1", app.id, { commissionPct: 20 });
  ok("3.self · an applicant cannot approve their own application", !self.ok, JSON.stringify(self));
  ok("3.self.audit · …and the attempt is audited as SECURITY", getAuditPage({ category: "SECURITY", limit: 200 }).some((e) => e.action === "agent.review.self_blocked" && e.actorId === "sec_app1"));
  const ceiling = await approveAgent("sec_officer", app.id, { commissionPct: cfg.maxCommissionPct + 1 });
  ok("3.ceiling · a rate above the ceiling is refused", !ceiling.ok, JSON.stringify(ceiling));
  const zero = await approveAgent("sec_officer", app.id, { commissionPct: 0 });
  ok("3.zero · a 0% rate is refused", !zero.ok);
  const appr = await approveAgent("sec_officer", app.id, { commissionPct: 20 });
  ok("3.approve · CONTROL — approval succeeds", appr.ok && appr.data?.agentCode.startsWith("50PICK-AG-") === true, JSON.stringify(appr));
  const acct = await db.affiliate.findByUserId("sec_app1");
  const user = (await db.user.findById("sec_app1"))!;
  ok("3.row · approvedAt + rate + active on the affiliate row; role AGENT on the user", isApprovedAgent(acct) && acct!.commissionPct === 20 && acct!.active === true && user.role === "AGENT", JSON.stringify(acct && [acct.approvedAt, acct.commissionPct, acct.active]));
  const twice = await approveAgent("sec_officer", app.id, { commissionPct: 20 });
  ok("3.twice · approving twice is refused", !twice.ok, JSON.stringify(twice));
  ok("3.view · the applicant view now reads agent", (await applicantView("sec_app1")).state === "agent");
  const again = await startApplication("sec_app1");
  ok("3.again · an approved agent cannot start another application", !again.ok);
}

// ═══ §4 · REJECT → REFUND OWED, CLOCKED → REFUNDED; cooldown; terminal ═══
{
  await mkFixtureUser("sec_app2");
  const id = await fullDraft("sec_app2", "RCPT-SEC-002");
  const sub2 = await submitForReview("sec_app2", { acceptedTermsVersion: AGENT_TERMS_VERSION });
  ok("4.submit · the second applicant submits", sub2.ok, JSON.stringify(sub2));
  await reconcileFee("sec_officer", id, { attestedTzs: FEE, statementRef: "STMT-2", sourceAccountMasked: "07•• ••• 877" });
  const other = await rejectApplication("sec_officer", id, { reason: "OTHER", note: "" });
  ok("4.othernote · OTHER without a note is refused", !other.ok);
  const before = Date.now();
  const rej = await rejectApplication("sec_officer", id, { reason: "INCOMPLETE_DOCUMENTS" });
  ok("4.reject · CONTROL — rejection succeeds", rej.ok, JSON.stringify(rej));
  const a = (await db.agentApplication.findById(id))!;
  ok("4.owed · a collected fee becomes REFUND_DUE", a.status === "REJECTED" && a.feeDisposition === "REFUND_DUE", JSON.stringify([a.status, a.feeDisposition]));
  const due = a.feeRefundDueAt ? Date.parse(a.feeRefundDueAt) : 0;
  ok(`4.clock · the refund is due ${cfg.refundDeadlineDays} days from the decision`, due >= before + cfg.refundDeadlineDays * DAY - 5_000 && due <= Date.now() + cfg.refundDeadlineDays * DAY + 5_000, String(a.feeRefundDueAt));
  ok("4.view · the applicant sees rejected with the refund due", (await applicantView("sec_app2")).state === "rejected");
  const wrong = await recordFeeRefund("sec_officer", id, { reference: "RF-2", amountTzs: FEE - 1 });
  ok("4.partial · a partial refund is refused", !wrong.ok, JSON.stringify(wrong));
  const rf = await recordFeeRefund("sec_officer", id, { reference: "RF-2", amountTzs: FEE });
  ok("4.refund · CONTROL — the full refund is recorded", rf.ok && (await db.agentApplication.findById(id))!.feeDisposition === "REFUNDED", JSON.stringify(rf));
  const cool = await applicantEligibility("sec_app2");
  ok(`4.cooldown · re-applying inside ${cfg.reapplyCooldownDays} days is refused`, !cool.ok && cool.refusal === "cooldown", JSON.stringify(cool));

  await mkFixtureUser("sec_app3");
  const id3 = await fullDraft("sec_app3", "RCPT-SEC-003");
  const sub3 = await submitForReview("sec_app3", { acceptedTermsVersion: AGENT_TERMS_VERSION });
  ok("4.submit3 · the third applicant submits", sub3.ok, JSON.stringify(sub3));
  const wv3 = await waiveFee("sec_officer", id3, "fee waived — community partner");
  ok("4.waive3 · the fee is waived", wv3.ok, JSON.stringify(wv3));
  const rej3 = await rejectApplication("sec_officer", id3, { reason: "FRAUD", note: "forged letter" });
  ok("4.reject3 · the FRAUD rejection is recorded", rej3.ok && (await db.agentApplication.findById(id3))!.status === "REJECTED", JSON.stringify([rej3, (await db.agentApplication.findById(id3))!.status]));
  const term = await applicantEligibility("sec_app3");
  ok("4.terminal · a FRAUD rejection bars re-application for good", !term.ok && term.refusal === "terminal_rejection", JSON.stringify(term));
  ok("4.waived · a waived fee owes no refund", (await db.agentApplication.findById(id3))!.feeDisposition === "WAIVED");
}

// ═══ §5 · MORE INFORMATION → resubmit; waiver needs a reason ═══
{
  await mkFixtureUser("sec_app4");
  const id = await fullDraft("sec_app4", "RCPT-SEC-004");
  const sub4 = await submitForReview("sec_app4", { acceptedTermsVersion: AGENT_TERMS_VERSION });
  ok("5.submit · the fourth applicant submits", sub4.ok && (await db.agentApplication.findById(id))!.status === "UNDER_REVIEW", JSON.stringify([sub4, (await db.agentApplication.findById(id))!.status]));
  const shortWaive = await waiveFee("sec_officer", id, "ok");
  ok("5.waivereason · a waiver needs a typed reason", !shortWaive.ok, JSON.stringify(shortWaive));
  const waived = await waiveFee("sec_officer", id, "waived — invited community leader");
  ok("5.waive · CONTROL — a reasoned waiver is recorded", waived.ok && (await db.agentApplication.findById(id))!.feeDisposition === "WAIVED", JSON.stringify(waived));
  const info = await requestMoreInfo("sec_officer", id, { note: "The CV is unreadable — please re-scan.", slots: ["CV"] });
  ok("5.info · more information can be requested", info.ok, JSON.stringify(info));
  ok("5.state · the application is ADDITIONAL_INFO_REQUIRED and the slot is marked", (await db.agentApplication.findById(id))!.status === "ADDITIONAL_INFO_REQUIRED" && (await db.agentApplicationDoc.findSlot(id, "CV"))!.rejected === true);
  ok("5.view · the applicant sees info_required", (await applicantView("sec_app4")).state === "info_required");
  const blocked = await approveAgent("sec_officer", id, { commissionPct: 20 });
  ok("5.blocked · approval is refused while information is outstanding", !blocked.ok);
  const stale = await submitForReview("sec_app4", { acceptedTermsVersion: AGENT_TERMS_VERSION });
  ok("5.stale · resubmitting without the re-scan is refused", !stale.ok, JSON.stringify(stale));
  await attachAgentDocument("sec_app4", "CV", PNG);
  const resub = await submitForReview("sec_app4", { acceptedTermsVersion: AGENT_TERMS_VERSION });
  ok("5.resubmit · CONTROL — with the re-scan the application returns to review", resub.ok && (await db.agentApplication.findById(id))!.status === "UNDER_REVIEW", JSON.stringify(resub));
  const appr = await approveAgent("sec_officer", id, { commissionPct: 25 });
  ok("5.approve · …and approves with a waived fee", appr.ok, JSON.stringify(appr));

  // Standing controls on the new agent.
  const de = await deactivateAgent("sec_officer", "sec_app4", "paused pending review");
  ok("5.deactivate · an officer can pause an agent", de.ok && (await db.affiliate.findByUserId("sec_app4"))!.active === false, JSON.stringify(de));
  const re = await reactivateAgent("sec_officer", "sec_app4", "review complete");
  ok("5.reactivate · …and resume them", re.ok && (await db.affiliate.findByUserId("sec_app4"))!.active === true, JSON.stringify(re));
  const rv = await revokeAgent("sec_officer", "sec_app4", "brought the platform into disrepute");
  ok("5.revoke · …or revoke them: inactive, application REVOKED", rv.ok && (await db.affiliate.findByUserId("sec_app4"))!.active === false && (await db.agentApplication.findById(id))!.status === "REVOKED", JSON.stringify(rv));
}

// ═══ §6 · INVITATION — the invitee's acceptance is the second party ═══
//
// ⭐ BY EMAIL SINCE 2026-09-08. The programme shipped inviting by SMS while no SMS provider
// was licensed (`sms.ts`: `console` by default, two adapters that throw, one unsigned
// contract), so the officer's console promised a text that was never sent. This section now
// drives the real channel — Postmark, captured through `emailOutbox()`.
//
// ⚠️ THE OUTBOX, NOT A MONKEY-PATCHED SEND. `email.ts` warns outright against asserting
// delivery from a log line: every logged address is masked under PDPA 2022, so such an
// assertion would be matching on `n•••@t.tz`. `EMAIL_OUTBOX_CAPTURE=1` is the sanctioned
// hook and it carries the unmasked `to` this suite has to check.
{
  process.env.EMAIL_OUTBOX_CAPTURE = "1";
  clearEmailOutbox();
  const codeFrom = (html: string) => html.match(/>(\d{6})</)?.[1] ?? html.match(/\b(\d{6})\b/)?.[1] ?? "";
  const mailTo = (addr: string) => emailOutbox().filter((m) => m.to.toLowerCase() === addr.toLowerCase());
  try {
    const bad = await issueInvitation("sec_officer", { email: "not-an-email" });
    ok("6.shape · a malformed address is refused, and the refusal names the field", !bad.ok && (bad as { field?: string }).field === "email", JSON.stringify(bad));
    const staffEmail = (await db.user.findById("sec_admin"))!.email!;
    const staff = await issueInvitation("sec_officer", { email: staffEmail });
    ok("6.staff · a staff address is refused", !staff.ok, JSON.stringify(staff));
    const agentEmail = (await db.user.findById("sec_app1"))!.email!;
    const alreadyAgent = await issueInvitation("sec_officer", { email: agentEmail });
    ok("6.agent · an existing agent's address is refused", !alreadyAgent.ok, JSON.stringify(alreadyAgent));
    const self = await issueInvitation("sec_officer", { email: (await db.user.findById("sec_officer"))!.email! });
    ok("6.self · an officer cannot invite themselves", !self.ok, JSON.stringify(self));

    // A NEW person — no account yet. This is who officer-invitation exists for.
    const NEW_EMAIL = "neema.invited@example.tz";
    const inv = await issueInvitation("sec_officer", { email: NEW_EMAIL, displayName: "Neema" });
    ok("6.issue · CONTROL — an invitation is issued with a one-time token", inv.ok && !!inv.data?.token && inv.data.link.includes(inv.data.token), JSON.stringify(inv.ok ? "ok" : inv));
    const token = inv.ok ? inv.data!.token : "";
    const stored = await db.agentInvitation.findById(inv.ok ? inv.data!.invitationId : "");
    ok("6.hashed · the token is stored only as a hash", !!stored && stored.tokenHash !== token && !JSON.stringify(stored).includes(token));
    ok("6.bound · the row is bound to the EMAIL and carries no phone", !!stored && (stored.email ?? "").toLowerCase() === NEW_EMAIL && stored.phoneE164 === null, JSON.stringify(stored && { email: stored.email, phone: stored.phoneE164 }));
    ok("6.mail · the link was emailed to the invited address", mailTo(NEW_EMAIL).some((m) => m.html.includes(token)));
    ok("6.delivery · …and the officer is told what the provider actually did", inv.ok && typeof inv.data!.delivery === "string" && inv.data!.delivery.length > 0, JSON.stringify(inv.ok ? inv.data!.delivery : null));
    const dupLive = await issueInvitation("sec_officer", { email: NEW_EMAIL.toUpperCase() });
    ok("6.duplicate · a second live invitation for the same mailbox is refused, whatever its case", !dupLive.ok, JSON.stringify(dupLive));

    const preview = await invitationPreview(token);
    ok("6.preview · the public preview MASKS the address and never returns the token",
      preview.ok && preview.channel === "EMAIL" && !preview.addressMasked.includes("neema.invited") && !JSON.stringify(preview).includes(token),
      JSON.stringify(preview));
    ok("6.previewdomain · …but keeps the domain, so the invitee can recognise their own mailbox",
      preview.ok && preview.addressMasked.includes("@example.tz"), JSON.stringify(preview.ok ? preview.addressMasked : null));
    const garbage = await invitationPreview("not-a-token");
    ok("6.garbage · an unknown token previews as invalid", !garbage.ok && garbage.reason === "invalid");

    // The wrong person signs in and tries to accept.
    await mkFixtureUser("sec_wrong_person");
    clearEmailOutbox();
    await requestInvitationOtp(token);
    const otp = codeFrom(mailTo(NEW_EMAIL).map((m) => m.html).pop() ?? "");
    ok("6.otp · the code was emailed to the INVITED address, and to nobody else", otp.length === 6 && emailOutbox().every((m) => m.to.toLowerCase() === NEW_EMAIL), JSON.stringify(emailOutbox().map((m) => m.to)));
    ok("6.otpnolink · the code mail carries NO link — a mail asking for a secret must not train a click", !mailTo(NEW_EMAIL).some((m) => m.tag === "agent-invite-otp" && m.html.includes("/agent/invite/")));
    const wrongAccount = await acceptInvitation("sec_wrong_person", token, otp);
    ok("6.wrongaccount · an account on a different address cannot accept even with the right code", !wrongAccount.ok, JSON.stringify(wrongAccount));

    // The right person — and note the CASE difference, which must not lock them out.
    await mkFixtureUser("sec_invitee");
    await db.user.update("sec_invitee", { email: NEW_EMAIL.toUpperCase() });
    const wrongCode = await acceptInvitation("sec_invitee", token, "000000");
    ok("6.wrongcode · the wrong code is refused", !wrongCode.ok, JSON.stringify(wrongCode));
    const acc = await acceptInvitation("sec_invitee", token, otp);
    ok("6.accept · CONTROL — the invited person accepts with the code sent to their mailbox, case notwithstanding", acc.ok && !!acc.data?.applicationId, JSON.stringify(acc));
    ok("6.state · the invitation is ACCEPTED and the application opens as an OFFICER_INVITED draft",
      (await db.agentInvitation.findById(inv.ok ? inv.data!.invitationId : ""))!.status === "ACCEPTED" && (await db.agentApplication.findById(acc.ok ? acc.data!.applicationId : ""))!.source === "OFFICER_INVITED");
    const replay = await acceptInvitation("sec_invitee", token, otp);
    ok("6.replay · the same token cannot be accepted twice", !replay.ok, JSON.stringify(replay));

    // ⭐ A PHONE-ERA INVITATION IS STILL READABLE, AND REFUSES A CODE HONESTLY. The programme
    // went live 2026-09-07, so a day-old phone-bound link exists and its holder has done
    // nothing wrong. ⛔ The refusal must name the remedy — arming a "text me a code" button
    // that cannot deliver is the whole defect this change removed.
    {
      // ⭐ ISSUED THROUGH THE REAL PATH, THEN MOVED BACK TO THE OLD SHAPE. ⛔ Not hand-built
      // with a locally computed token hash: that would duplicate the service's hashing, and a
      // fixture that hashes differently from production is a fixture that proves nothing.
      const legacyIssue = await issueInvitation("sec_officer", { email: "legacy.era@example.tz", displayName: "Legacy" });
      const legacyToken = legacyIssue.ok ? legacyIssue.data!.token : "";
      await db.agentInvitation.update(legacyIssue.ok ? legacyIssue.data!.invitationId : "", { email: null, phoneE164: "+255719000777" });
      const legacyPreview = await invitationPreview(legacyToken);
      ok("6.legacypreview · a phone-era invitation still previews, as a PHONE channel", legacyPreview.ok && legacyPreview.channel === "PHONE", JSON.stringify(legacyPreview));
      const legacyOtp = await requestInvitationOtp(legacyToken);
      ok("6.legacyotp · …and refuses to send a code, naming the remedy rather than failing silently",
        !legacyOtp.ok && /withdraw/i.test(legacyOtp.error), JSON.stringify(legacyOtp));
    }
  } finally {
    clearEmailOutbox();
    delete process.env.EMAIL_OUTBOX_CAPTURE;
  }
}

// ═══ §7 · THE EDGE — exactly the signed-in agent routes are protected ═══
{
  ok("7.apply · /agent/apply is protected", isProtectedPath("/agent/apply"));
  ok("7.status · /agent/status is protected", isProtectedPath("/agent/status") && isProtectedPath("/agent/status/anything"));
  ok("7.admin · /admin/agents is protected", isProtectedPath("/admin/agents") && isProtectedPath("/admin/agents/abc"));
  ok("7.public · /agent itself is PUBLIC — the discovery door stays open", !isProtectedPath("/agent"));
  ok("7.invite · /agent/invite/<token> is PUBLIC — an invitee has no account yet", !isProtectedPath("/agent/invite/abc123"));
  ok("7.terms · /legal/agent-terms is public", !isProtectedPath("/legal/agent-terms"));
  ok("7.prefix · a prefix that merely STARTS with the word is not matched", !isProtectedPath("/agents") && !isProtectedPath("/agent-status"));
  ok("7.slots · the document slot list is closed and the required set is inside it", REQUIRED_DOC_SLOTS.every((s) => ALL_DOC_SLOTS.includes(s)) && ALL_DOC_SLOTS.length === REQUIRED_DOC_SLOTS.length + 1);
}

console.log(`\nagent-application-security: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
