/**
 * THE AUTOMATIC IDENTITY CHECKS — one pure decision, shared by the service that approves a typed
 * identity instantly, the officer's workstation that shows each check, and every officer action that
 * approves or marks a case checked (they re-run it on the server).
 *
 * ⭐ WHY THIS EXISTS (owner ruling, Ali, 2026-10-10 — the Gaming Board asked that players no longer upload
 * identity documents; docs/COMPLIANCE-DECISIONS.md, "2026-10-10 · Players verify identity with typed
 * details"). A player types the document's details and is verified at once when these checks pass;
 * officers act AFTERWARDS (the post-check list). So the checks that used to sit in an officer's head
 * in front of a photo are written down here, each one answering with exactly one of:
 *
 *   · BLOCK — never approved by anyone: the declared/account date of birth is under 18, or the document
 *     has expired. The service refuses both BEFORE this runs (an underage date is a FINAL refusal, an
 *     expired document a plain refusal), so on the instant path a block is unreachable; the rows exist
 *     so the officer's screen and every officer approval ask the same question again on the server.
 *   · ROUTE — not refused, not approved: the identity goes to an officer (PENDING_REVIEW). A routed
 *     player is told we are checking their details; nothing is held against them for it.
 *   · FLAG  — approved, and the officer who checks the approval afterwards sees why to look first.
 *     ⛔ A FLAG NEVER BLOCKS AN OFFICER. It is a reason to look, not a finding.
 *
 * ⛔ PURE AND CLIENT-SAFE: no server imports, no I/O. Every fact a check needs (the risk score, the
 * wallet's holds, the same-person matches…) is READ by the caller and handed in, so the workstation and
 * the service cannot disagree about the rule — only, at worst, about a fact read at another moment.
 * ⛔ NO PLAYER-FACING WORDS. Every `detail` and label here is officer English (admin screens are English
 * inline, `admin-status-lexicon.ts`); a player is never shown a check, a route reason or a flag.
 */
import {
  ID_DOC_SPECS,
  isExpired,
  isOfAge,
  nidaDateOfBirth,
  type IdDocType,
  type IdNumberFlag,
} from "@/lib/id-documents";

/** Why an identity went to an officer instead of being approved at once. Fixed codes — the audit row carries them. */
export type KycRouteReason =
  | "NIDA_UNDER_18"
  | "OFFICER_PROVENANCE"
  | "HIGH_RISK"
  | "WALLET_HOLD"
  | "SOF_REJECTED"
  | "AML_ESCALATION"
  | "SAME_PERSON_RESTRICTED"
  | "AGENT_PHOTOS"
  /** 2026-10-10 (review R5.8): the player entered an under-18 date of birth earlier (`kyc.identity.underage_attempt`). */
  | "UNDERAGE_ATTEMPT";

/** A non-blocking observation stored on an automatic approval (`autoFlags`). Fixed codes only — never a name or a date. */
export type KycFlag = "NIDA_DOB_MISMATCH" | "PASSPORT_SHAPE" | "NO_PUBLISHED_FORMAT" | "SAME_PERSON";

export type KycCheckOutcome = "pass" | "flag" | "route" | "block";

export type KycCheckKey =
  | "number_format"
  | "age"
  | "nida_dob"
  | "expiry"
  | "same_person"
  | "risk"
  | "holds"
  | "sof"
  | "aml"
  | "provenance"
  | "track";

/** One line of the officer's checklist. `detail` is officer English. */
export interface KycCheckRow { key: KycCheckKey; outcome: KycCheckOutcome; detail: string }

export interface KycDecisionFacts {
  idType: IdDocType;
  idNumber: string;
  idExpiry: string | null;
  /** YYYY-MM-DD — the date of birth the age gate uses (the ACCOUNT's, `User.dob`, since 2026-10-10). */
  accountDob: string;
  now: Date;
  /** From `validateIdNumber`. */
  formatFlags: readonly IdNumberFlag[];
  riskScore: number;
  riskThreshold: number;
  /** The wallet's current freeze reasons (`currentFreezeReasons`). */
  holds: readonly string[];
  /** `SourceOfFunds.reviewStatus`, or null when nothing was declared. */
  sofStatus: string | null;
  /** An officer escalated this identity to AML after the last decision on it. */
  amlEscalationOpen: boolean;
  /** The player ENTERED an under-18 date of birth earlier — the durable `kyc.identity.underage_attempt` the typed form
   *  writes when it refuses one (`readUnderageAttempt`, kyc-service.ts). An age fact: it routes, it never approves. */
  underageAttempt: boolean;
  /** Other accounts with the same normalised name and date of birth; `restricted` per the service's rule. */
  samePerson: ReadonlyArray<{ restricted: boolean }>;
  /** An officer has already ruled on this identity — a reviewer on the row, corrections asked, or (2026-10-10) the
   *  durable audit trail's newest officer act on it being a refusal-type one (`readOfficerHistory`, kyc-service.ts). */
  officerProvenance: boolean;
  track: "typed" | "agent";
}

export interface KycDecision {
  outcome: "approve" | "route" | "block";
  routes: KycRouteReason[];
  flags: KycFlag[];
  /** Officer English, one per blocking check. */
  blocks: string[];
  rows: KycCheckRow[];
}

/** Officer English for each route reason — the workstation, the queue and the officer's bell read this. */
export const ROUTE_REASON_LABEL: Record<KycRouteReason, string> = {
  NIDA_UNDER_18: "NIDA number says under 18",
  OFFICER_PROVENANCE: "An officer has already ruled on this identity",
  HIGH_RISK: "Risk score at or above the two-officer threshold",
  WALLET_HOLD: "Wallet held by an officer or an identity refusal",
  SOF_REJECTED: "Source of funds was rejected",
  AML_ESCALATION: "Escalated to AML",
  SAME_PERSON_RESTRICTED: "Possible same person as a restricted account",
  AGENT_PHOTOS: "Photo case · document photos and selfie to review",
  UNDERAGE_ATTEMPT: "An under-18 date of birth was typed earlier",
};

/** Officer English for each flag — shown on the post-check list and the workstation. */
export const FLAG_LABEL: Record<KycFlag, string> = {
  NIDA_DOB_MISMATCH: "NIDA birth date differs from the account's date of birth",
  PASSPORT_SHAPE: "Passport number outside the usual shape",
  NO_PUBLISHED_FORMAT: "No published number format for this document",
  SAME_PERSON: "Possible same person as another account",
};

/** Holds that send an identity to an officer: an officer's own freeze, or an identity refusal's. */
const ROUTING_HOLDS = new Set(["OFFICER", "IDENTITY_REFUSED"]);

/**
 * Do the NIDA number's birth digits (1–8) say the holder is under 18? NIDA only; a number whose digits
 * are not a real date answers false (the format check refuses it before this is asked).
 */
export function nidaSaysUnder18(idType: string, idNumber: string, now: Date): boolean {
  if (idType !== "NIDA") return false;
  const dob = nidaDateOfBirth(idNumber);
  return !!dob && !isOfAge(dob, now);
}

/**
 * The key two names are compared on for the same-person check — ONE normaliser for both stores and the
 * workstation: NFKC, lower-case, letters/digits/spaces only, spaces collapsed, tokens SORTED (so "Juma
 * Ali Hassan" and "Hassan Juma Ali" meet). ⛔ An empty key never matches anything — the caller must
 * treat "" as "no name", never as equal to another "".
 */
export function samePersonNameKey(fullName: string | null | undefined): string {
  const cleaned = String(fullName ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N} ]+/gu, "")
    .replace(/[ ]+/g, " ")
    .trim();
  if (!cleaned) return "";
  return cleaned.split(" ").filter(Boolean).sort().join(" ");
}

/**
 * THE DECISION. Pure: the same facts give the same answer on the server and on the officer's screen.
 * Blocks outrank routes, routes outrank approval; flags ride along with whichever outcome.
 */
export function decideKyc(f: KycDecisionFacts): KycDecision {
  const rows: KycCheckRow[] = [];
  const routes: KycRouteReason[] = [];
  const flags: KycFlag[] = [];
  const blocks: string[] = [];
  const spec = ID_DOC_SPECS[f.idType];
  const route = (key: KycCheckKey, reason: KycRouteReason, detail: string) => { routes.push(reason); rows.push({ key, outcome: "route", detail }); };
  const flag = (key: KycCheckKey, code: KycFlag, detail: string) => { if (!flags.includes(code)) flags.push(code); rows.push({ key, outcome: "flag", detail }); };
  const block = (key: KycCheckKey, detail: string) => { blocks.push(detail); rows.push({ key, outcome: "block", detail }); };
  const pass = (key: KycCheckKey, detail: string) => rows.push({ key, outcome: "pass", detail });

  // ── The number's format. A published rule already refused at the identity step; what reaches here is
  // either clean or carries the advisory flags `validateIdNumber` returned.
  if (f.formatFlags.includes("unofficial_shape")) flag("number_format", "PASSPORT_SHAPE", "Accepted, but outside the usual passport shape (secondary sources only)");
  else if (f.formatFlags.includes("no_published_format")) flag("number_format", "NO_PUBLISHED_FORMAT", "No published format for this document — only the sanity band and uniqueness were checked");
  else pass("number_format", spec.format.kind === "published" ? "Matches the published format" : "Matches the usual shape");

  // ── Age, on the ACCOUNT's date of birth — the one age gate, for all four documents.
  const dob = String(f.accountDob ?? "").slice(0, 10);
  const adult = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(dob) && isOfAge(dob, f.now);
  if (!adult) block("age", dob ? "Date of birth says under 18" : "No readable date of birth");
  // ⭐ An adult date now, after the PLAYER entered an under-18 one (2026-10-10, review R5.8): an officer looks first —
  // the same age line, so the officer reads both facts together (a second row would repeat the key).
  else if (f.underageAttempt) route("age", "UNDERAGE_ATTEMPT", "18 or older on the account's date of birth, but an under-18 date of birth was typed earlier");
  else pass("age", "18 or older on the account's date of birth");

  // ── NIDA only: the birth date inside the number. Under 18 → an officer, at once; a different adult date → a flag.
  if (f.idType === "NIDA") {
    const nidaDob = nidaDateOfBirth(f.idNumber);
    if (nidaDob && !isOfAge(nidaDob, f.now)) route("nida_dob", "NIDA_UNDER_18", "The NIDA number's birth digits say under 18");
    else if (nidaDob && adult && nidaDob !== dob) flag("nida_dob", "NIDA_DOB_MISMATCH", "The NIDA number's birth date differs from the account's (both 18 or older)");
    else pass("nida_dob", nidaDob ? "The NIDA birth date matches the account" : "The NIDA birth digits could not be read");
  } else {
    pass("nida_dob", "Not a NIDA — the number carries no date of birth");
  }

  // ── Expiry, only where the document has one.
  if (spec.expires) {
    if (!f.idExpiry) block("expiry", "No expiry date on a document that expires");
    else if (isExpired(f.idExpiry, f.now)) block("expiry", `Expired on ${String(f.idExpiry).slice(0, 10)}`);
    else pass("expiry", `In date until ${String(f.idExpiry).slice(0, 10)}`);
  } else {
    pass("expiry", "This document does not expire");
  }

  // ── Possible same person (same normalised name + date of birth on another account).
  const restricted = f.samePerson.filter((m) => m.restricted).length;
  if (restricted > 0) route("same_person", "SAME_PERSON_RESTRICTED", `${restricted} matching account${restricted === 1 ? "" : "s"} self-excluded, cooled off, suspended, closed, frozen or finally refused`);
  else if (f.samePerson.length > 0) flag("same_person", "SAME_PERSON", `${f.samePerson.length} other account${f.samePerson.length === 1 ? "" : "s"} with the same name and date of birth`);
  else pass("same_person", "No other account with the same name and date of birth");

  // ── Risk: at or above the maker-checker threshold, two officers still decide.
  if (f.riskScore >= f.riskThreshold) route("risk", "HIGH_RISK", `Risk score ${f.riskScore} (two-officer threshold ${f.riskThreshold})`);
  else pass("risk", `Risk score ${f.riskScore}`);

  // ── Holds: an officer's freeze or an identity refusal's hold routes; the automatic path never lifts one.
  const routingHolds = f.holds.filter((h) => ROUTING_HOLDS.has(h));
  if (routingHolds.length) route("holds", "WALLET_HOLD", `Wallet held: ${routingHolds.join(", ")}`);
  else pass("holds", f.holds.length ? `Other holds only: ${f.holds.join(", ")}` : "No wallet hold");

  // ── Source of funds.
  if (f.sofStatus === "REJECTED") route("sof", "SOF_REJECTED", "The source-of-funds declaration was rejected");
  else pass("sof", f.sofStatus ? `Source of funds ${f.sofStatus.toLowerCase()}` : "No source-of-funds declaration");

  // ── AML escalation still open.
  if (f.amlEscalationOpen) route("aml", "AML_ESCALATION", "Escalated to AML since the last decision");
  else pass("aml", "No open AML escalation");

  // ── Officer provenance: an identity an officer has ruled on goes back to an officer.
  if (f.officerProvenance) route("provenance", "OFFICER_PROVENANCE", "An officer has already ruled on this identity");
  else pass("provenance", "No officer decision on this identity yet");

  // ── Track: an agent applicant's photos and selfie are always an officer's.
  // (The agent photo track — and every photo case on file from before 2026-10-10 — is an officer's by definition.)
  if (f.track === "agent") route("track", "AGENT_PHOTOS", "Photo case — the document photos and selfie are reviewed by an officer");
  else pass("track", "Typed details");

  const outcome: KycDecision["outcome"] = blocks.length ? "block" : routes.length ? "route" : "approve";
  return { outcome, routes, flags, blocks, rows };
}

/** Narrow stored `autoFlags` (JSON) to known codes — an unknown string is dropped, never displayed raw. */
export function asKycFlags(v: unknown): KycFlag[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is KycFlag => typeof x === "string" && x in FLAG_LABEL);
}

/** Narrow stored route reasons (an audit payload) to known codes. */
export function asKycRouteReasons(v: unknown): KycRouteReason[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is KycRouteReason => typeof x === "string" && x in ROUTE_REASON_LABEL);
}
