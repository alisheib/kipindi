/**
 * /api/dev-test/seed-kyc — dev-only endpoint that creates a player with a KYC
 * submission in a chosen state, so E2E scripts can drive the officer screens
 * (approve / ask for corrections / reject / mark checked) without running the player's flow.
 *
 * Returns 404 in production — never reachable on a live deployment.
 *
 *   POST { status?: "PENDING_REVIEW" | "ADDITIONAL_INFO_REQUIRED" | "APPROVED",
 *          evidence?: "photos" | "typed",
 *          idType?: "NIDA" | "PASSPORT" | "DRIVER_LICENSE" | "VOTER_CARD" }
 *     → { ok, userId, phone, kycId }
 *
 * ⭐ TWO KINDS OF CASE SINCE 2026-10-10 (owner ruling, Ali — a player verifies with TYPED details and is approved at
 * once when the automatic checks pass; an AGENT applicant still sends the document's photos and a selfie to an
 * officer). Each seeded row is the shape `kyc-service.ts` writes for that case, every column named:
 *   · PENDING_REVIEW + photos (the default, as before) — a PHOTO case: the document's full photo set, the selfie
 *     included, sent to an officer. An agent applicant's case — and every case sent before 2026-10-10. The workstation
 *     opens it in photo mode.
 *   · PENDING_REVIEW + typed — typed details with an officer, no images, ROUTED because an officer has already ruled on
 *     this identity (`reviewerId` on the row — the provenance route). ⛔ A typed case with nothing routing it is one the
 *     machine would have approved on the spot; no player can be in it, so the workstation's live checks must say why
 *     this one waits.
 *   · ADDITIONAL_INFO_REQUIRED — an officer asked for CORRECTIONS of the typed details (a note, the officer on the row;
 *     never a request for another document). Images per `evidence`, as above.
 *   · APPROVED — an AUTOMATIC approval from typed details that no officer has checked yet (the post-check list), with the
 *     flags the REAL checks raise for that document (`decideKyc`): a NIDA or a passport in the usual shape carries none,
 *     a driving licence or a voter's card `NO_PUBLISHED_FORMAT`. Always typed — `evidence` does not apply.
 *
 * ⛔ ONE IDENTITY PER CALL. The number is derived from the seeded phone (already unique per call), because
 * `KycSubmission` carries a partial unique index on (`idType`, `idNumber`): every call used to write the SAME NIDA,
 * which the memory store never noticed and Postgres refuses on the second seed — the shape `seed-admin` fixed on
 * 2026-09-22. ⛔ AND ONE NAME PER CALL: from 2026-10-10 the automatic checks look for the same person (the same name and
 * date of birth) on other accounts, so a name shared by every seeded player made each one a "possible same person" of
 * all the others — flagged, or routed to an officer once a drive had refused or frozen just one of them.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/server/store";
import type { StoredUser, StoredKyc } from "@/lib/server/store";
import { randomId, identityFingerprint } from "@/lib/server/crypto";
import { audit } from "@/lib/server/audit";
import { KYC_MAKER_CHECKER_THRESHOLD } from "@/lib/server/kyc-risk";
import { ID_DOC_SPECS, isIdDocType, validateIdNumber, type IdDocType } from "@/lib/id-documents";
import { decideKyc } from "@/lib/kyc-auto-checks";

type SeedStatus = "PENDING_REVIEW" | "ADDITIONAL_INFO_REQUIRED" | "APPROVED";

/** The seeded account's date of birth — the date the identity step uses (`User.dob`) and the NIDA's digits 1-8. */
const SEED_DOB = "1990-01-01";

/** The officer a seeded officer decision names — "system", the stand-in `seed-admin` writes. Not a user row. */
const SEED_OFFICER = "system";

/** A 1×1 PNG that passes `validateDocImage` (70 bytes) — the image `/auth/demo` attaches too, so the viewer renders one. */
const SEED_DOC_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

/**
 * This player's document number, from eleven digits unique to the call. Each one passes its document's rule:
 *   · NIDA — the published 20 digits; digits 1-8 are `SEED_DOB` (no NIDA_DOB_MISMATCH flag), and it ends in `7` — never
 *     `0000` or `9999`, the dev NIDA mock's SANCTIONED and MISMATCH hooks, should a drive re-post it;
 *   · PASSPORT — two letters and seven digits, the usual shape (no flag);
 *   · DRIVER_LICENSE / VOTER_CARD — no published format; inside the sanity band (and flagged so by the checks).
 */
const SEEDED_NUMBER: Record<IdDocType, (digits11: string) => string> = {
  NIDA: (d) => `19900101${d}7`,
  PASSPORT: (d) => `AB${d.slice(-7)}`,
  DRIVER_LICENSE: (d) => `DL${d}`,
  VOTER_CARD: (d) => `VC${d}`,
};

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  }
  const body = (await req.json().catch(() => null)) as { status?: string; evidence?: string; idType?: string } | null;
  const rawStatus = body?.status;
  const status: SeedStatus = rawStatus === "ADDITIONAL_INFO_REQUIRED" || rawStatus === "APPROVED" ? rawStatus : "PENDING_REVIEW";
  // An automatic approval is typed by definition: the instant path never sees a photo.
  const photos = status !== "APPROVED" && body?.evidence !== "typed";
  const rawType = body?.idType;
  const idType: IdDocType = isIdDocType(rawType) ? rawType : "NIDA";

  const now = new Date().toISOString();
  const id = `usr_${randomId(12)}`;
  const phone = `+25571${String(Math.floor(parseInt(id.slice(-7), 36) % 9_000_000) + 1_000_000)}`;

  // Everything that can refuse runs BEFORE anything is written, so a refused seed leaves no account behind.
  // The phone's last eleven digits ("5571" + its seven) — unique per call, as the phone itself must be.
  const unique = phone.slice(-11);
  const verdict = validateIdNumber(idType, SEEDED_NUMBER[idType](unique));
  if (!verdict.ok) return NextResponse.json({ ok: false, error: `seeded ${idType} number refused (${verdict.refusal})` }, { status: 500 });
  const idNumber = verdict.value;
  // Only the two documents that HAVE an expiry carry one — five years out, in date.
  const idExpiry = ID_DOC_SPECS[idType].expires ? new Date(Date.parse(now) + 5 * 365 * 86_400_000).toISOString().slice(0, 10) : null;

  // ⭐ THE APPROVAL'S FLAGS COME FROM THE REAL CHECKS, never from this file — with neutral account facts (a fresh
  // account: no risk, no hold, nothing declared, no other account). ⛔ A seed the checks would not approve is refused
  // loudly rather than written as an approval the product could not have made.
  let autoFlags: string[] = [];
  if (status === "APPROVED") {
    const decision = decideKyc({
      idType, idNumber, idExpiry, accountDob: SEED_DOB, now: new Date(now), formatFlags: verdict.flags,
      riskScore: 0, riskThreshold: KYC_MAKER_CHECKER_THRESHOLD, holds: [], sofStatus: null, amlEscalationOpen: false,
      underageAttempt: false, samePerson: [], officerProvenance: false, track: "typed",
    });
    if (decision.outcome !== "approve") {
      return NextResponse.json({ ok: false, error: `the automatic checks do not approve a seeded ${idType} (${decision.outcome})` }, { status: 500 });
    }
    autoFlags = [...decision.flags];
  }
  // An officer is on the row when one has ruled: corrections asked, or the typed case routed by provenance.
  const officerOnRow = status === "ADDITIONAL_INFO_REQUIRED" || (status === "PENDING_REVIEW" && !photos);

  // ⭐ ACTIVE, MATCHING REGISTRATION (2026-09-13). New accounts were created `PENDING_KYC` until then —
  // a status that gated nothing — and are created ACTIVE now (`auth-service.ts`). A submission awaiting
  // review is a fact of the KYC ROW, never of `User.status`; approval no longer needs to lift anything.
  const u: StoredUser = {
    id, phoneE164: phone, passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "ACTIVE", locale: "EN", displayName: null, dob: SEED_DOB, region: "TZ",
    acceptedTermsVersion: "v1", acceptedTermsAt: now, marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    email: null, emailVerifiedAt: null, createdAt: now, updatedAt: now, lastLoginAt: now, closedAt: null,
  };
  await db.user.create(u);
  const kyc: StoredKyc = {
    id: `kyc_${randomId(10)}`, userId: id, status, rejectReason: null,
    // ⭐ About the TYPED details: since 2026-10-10 an officer may ask for corrections, never for another document.
    rejectNote: status === "ADDITIONAL_INFO_REQUIRED" ? "Please check the spelling of your full name — it must match your ID exactly." : null,
    idType, idNumber, idExpiry, idVerifiedAt: now, idFingerprint: identityFingerprint(idType, idNumber),
    fullName: `Asha Mwamba Juma ${phone.slice(-7)}`, dob: SEED_DOB,
    // A photo case holds THIS document's slots, the selfie included (`requiredSlots`) — never a hand-written three.
    documents: photos
      ? ID_DOC_SPECS[idType].requiredSlots.map((docType) => ({ docType, storageKey: SEED_DOC_PNG, uploadedAt: now, mimeType: "image/png", sizeBytes: 70 }))
      : [],
    extraRequests: [],
    reviewerId: officerOnRow ? SEED_OFFICER : null,
    reviewedAt: officerOnRow || status === "APPROVED" ? now : null,
    // ⭐ An automatic approval was never SENT — the instant path writes no `submittedAt`.
    submittedAt: status === "APPROVED" ? null : now,
    approvedAt: status === "APPROVED" ? now : null,
    photoVerifiedAt: null,
    autoApprovedAt: status === "APPROVED" ? now : null,
    autoFlags,
    postCheckedAt: null,
    postCheckedById: null,
    priorIdentities: [],
    createdAt: now, updatedAt: now,
  };
  await db.kyc.upsert(kyc);
  audit({ category: "SECURITY", action: "dev_test.kyc_seeded", actorId: null, targetType: "Kyc", targetId: kyc.id, payload: { status, evidence: photos ? "photos" : "typed", idType, by: "dev-test-endpoint" } });
  return NextResponse.json({ ok: true, userId: id, phone, kycId: kyc.id });
}
