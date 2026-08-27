import { notFound } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { AdminPageHead, AdminCard } from "@/components/admin/admin-shell";
import { AdminMeter } from "@/components/admin/admin-charts";
import { Chip } from "@/components/ui/chip";
import { I } from "@/components/ui/glyphs";
import { db } from "@/lib/server/store";
import { listPendingKyc } from "@/lib/server/kyc-service";
import { kycRiskScore, getApprovalRecommendation, KYC_MAKER_CHECKER_THRESHOLD } from "@/lib/server/kyc-risk";
import { currentSession } from "@/lib/server/auth-service";
import { formatDateTime } from "@/lib/utils";
import { KycDocViewer } from "./kyc-doc-viewer";
import { Sensitive } from "@/components/ui/sensitive";
import { maskDob } from "@/lib/server/sensitive-fields";
import { KycDecisionRail } from "./kyc-decision-rail";
import {
  ID_DOC_SPECS,
  ALL_DOC_SLOTS,
  isIdDocType,
  isExpired,
  nidaDateOfBirth,
  validateIdNumber,
  type IdDocType,
  type KycDocSlot,
} from "@/lib/id-documents";

export const metadata = { title: "Admin · KYC workstation" };
export const dynamic = "force-dynamic";

const SLA_HOURS = 24;

/**
 * Officer-facing names. ⚠️ The ADMIN CONSOLE IS ENGLISH-ONLY BY DESIGN (it is a
 * staff surface — `test:failure-reasons` §10 excludes it from the trilingual
 * ratchet for exactly this reason), so these are literals rather than dictionary
 * keys. The PLAYER's names for the same things live in `i18n-dict.ts` and are
 * resolved through `DOC_SLOT_LABEL_KEY`.
 */
const ID_TYPE_LABEL: Record<IdDocType, string> = {
  NIDA: "NIDA",
  PASSPORT: "Passport",
  DRIVER_LICENSE: "Driving licence",
  VOTER_CARD: "Voter's card",
};
const ADMIN_SLOT_LABEL: Record<KycDocSlot, string> = {
  NIDA_FRONT: "NIDA front",
  NIDA_BACK: "NIDA back",
  PASSPORT: "Passport bio page",
  DRIVER_LICENSE: "Licence front",
  VOTER_CARD: "Voter's card",
  SELFIE: "Selfie",
};

function ageLabel(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - Date.parse(iso);
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return `${Math.max(0, Math.floor(ms / 60_000))}m`;
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default async function KycWorkstationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // db.kyc.findByUserId / db.user.findById are SYNC in the dev store — wrap so
  // .catch works whether the store returns a value or a Promise.
  const kyc = await Promise.resolve(db.kyc.findByUserId(id)).catch(() => null);
  if (!kyc) notFound();
  const user = await Promise.resolve(db.user.findById(id)).catch(() => null);
  const session = await currentSession();
  const currentOfficerId = session?.userId ?? "";

  const decided = kyc.status === "APPROVED" || kyc.status === "REJECTED";
  const risk = await kycRiskScore(id);
  const makerCheckerRequired = risk.score >= KYC_MAKER_CHECKER_THRESHOLD;
  const recommendation = await getApprovalRecommendation(id);
  const sof = await Promise.resolve(db.sourceOfFunds.get(id)).catch(() => null);

  // Queue context — position among pending submissions.
  const pending = await listPendingKyc().catch(() => []);
  const queuePos = pending.findIndex((k) => k.userId === id);
  const oldest = pending[0]?.submittedAt ?? null;

  // ── WHICH DOCUMENT THIS SUBMISSION IS BUILT ON ────────────────────────────
  // ⛔ Everything below is derived from it. A reviewer's screen that assumes NIDA
  // shows the wrong slots, asks for an expiry a voter's card does not have, and
  // ticks "all documents present" against a count that means nothing.
  const idType = isIdDocType(kyc.idType) ? (kyc.idType as IdDocType) : null;
  const spec = idType ? ID_DOC_SPECS[idType] : null;

  // Auto-derived checklist (real signals only).
  const present = new Set(kyc.documents.map((d) => d.docType));
  const age18 = kyc.dob ? (Date.now() - Date.parse(kyc.dob)) / (365.25 * 24 * 3600_000) >= 18 : null;
  const required = spec?.requiredSlots ?? [];
  const allDocs = required.length > 0 && required.every((t) => present.has(t));

  // What the format check ACTUALLY established for THIS document, and what it
  // deliberately did not. `flags` is recomputed here rather than stored, so the
  // officer always reads the current rule rather than one frozen at submit time.
  const verdict = idType && kyc.idNumber ? validateIdNumber(idType, kyc.idNumber) : null;
  const formatDetail = !spec
    ? "no document type recorded"
    : spec.format.kind === "published"
      ? `format valid · unique to this account (no authority check by design) · ${spec.format.sourceNote}`
      : spec.format.kind === "secondary"
        ? `unique to this account (no authority check by design) · ${spec.format.sourceNote}${verdict?.ok && verdict.flags.includes("unofficial_shape") ? " ⚠ THIS NUMBER IS OUTSIDE THAT SHAPE — accepted deliberately, read the image" : ""}`
        : `unique to this account (no authority check by design) · ${spec.format.absenceNote}`;

  // 🔴 NIDA ONLY, AND SAID SO. Digits 1-8 of a NIDA are the holder's date of
  // birth; no other document carries one. Where they disagree with the DOB on the
  // account this is a REVIEWER FLAG, not a refusal — a stated DOB can be a
  // sign-up typo, and refusing would lock a real citizen out over it.
  const nidaDob = idType === "NIDA" && kyc.idNumber ? nidaDateOfBirth(kyc.idNumber) : null;
  const statedDob = kyc.dob ? kyc.dob.slice(0, 10) : null;
  const dobAgrees = nidaDob && statedDob ? nidaDob === statedDob : null;

  const expired = isExpired(kyc.idExpiry ?? null, new Date());
  // ⛔ THE CHECKLIST MASKS ITS DATES UNCONDITIONALLY, AND THAT IS DELIBERATE.
  // `AutoCheck.detail` is a plain STRING on a CLIENT component (kyc-decision-rail.tsx), so
  // <Sensitive> cannot go here — it is a server component. Masking at the source is the honest
  // alternative: the checklist's job is the VERDICT ("18 or older: pass"), which the masked year
  // still supports, and the revealable copy lives in the DOB Field above for a role permitted to
  // reveal it. ⚠️ `maskDob` is the registry's own mask, imported as a pure function — §6 keeps the
  // ANSWER (canRead/mayReveal) out of pages, not the masking itself.
  const autoChecks = [
    // POLICY (Ali, 2026-07-19, extended 2026-08-19): the control is FORMAT +
    // UNIQUENESS only — one document, one account. There is deliberately no
    // authority check for any of the four; `nida.ts` is a deterministic mock and
    // no request has ever reached the National Identification Authority, and no
    // equivalent endpoint exists for a passport, a licence or a voter's card.
    //
    // So this row must NOT read "verified / government match", as it used to.
    // That told a compliance officer a government confirmed this identity, which
    // would invite them to approve a withdrawal on evidence that does not exist.
    // It now states exactly what was checked and — where no format is published —
    // says so in the officer's own words, so the weight of the decision sits
    // visibly on the DOCUMENT IMAGE, which is where it has always actually been.
    { label: idType ? `${ID_TYPE_LABEL[idType]} number` : "Identity number", state: (kyc.idNumber ? "pass" : "pending") as "pass" | "fail" | "pending", detail: kyc.idNumber ? formatDetail : "not recorded" },
    { label: "18 or older", state: (age18 === null ? "pending" : age18 ? "pass" : "fail") as "pass" | "fail" | "pending", detail: kyc.dob ? `DOB ${maskDob(kyc.dob)} — declared, and gated for every document type` : "no DOB" },
    ...(idType === "NIDA"
      ? [{ label: "NIDA date of birth agrees", state: (dobAgrees === null ? "pending" : dobAgrees ? "pass" : "fail") as "pass" | "fail" | "pending", detail: dobAgrees === null ? "not derivable" : `number says ${maskDob(String(nidaDob))}, account says ${maskDob(String(statedDob))}` }]
      : []),
    ...(spec?.expires
      ? [{ label: "Document in date", state: (!kyc.idExpiry ? "pending" : expired ? "fail" : "pass") as "pass" | "fail" | "pending", detail: kyc.idExpiry ? `expires ${kyc.idExpiry}${expired ? " — EXPIRED" : ""}` : "no expiry recorded" }]
      : []),
    { label: "All documents present", state: (allDocs ? "pass" : "fail") as "pass" | "fail" | "pending", detail: required.length ? `${required.filter((r) => present.has(r)).length}/${required.length} uploaded` : "no document type recorded" },
    { label: "Source-of-funds on file", state: (sof ? "pass" : "pending") as "pass" | "fail" | "pending", detail: sof ? sof.reviewStatus : "not required / absent" },
  ];

  const slaMs = kyc.submittedAt ? Date.parse(kyc.submittedAt) + SLA_HOURS * 3600_000 - Date.now() : null;
  const slaLabel = slaMs === null ? "—" : slaMs <= 0 ? `${Math.floor(-slaMs / 3600_000)}h overdue` : `${Math.floor(slaMs / 3600_000)}h ${Math.floor((slaMs % 3600_000) / 60_000)}m left`;
  const slaTone = slaMs === null ? "neutral" : slaMs <= 0 ? "danger" : slaMs < 2 * 3600_000 ? "warning" : "brand";

  // ⛔ THE VIEWER'S TABS ARE THIS DOCUMENT'S SLOTS. Three hard-written tabs meant
  // a passport submission offered "ID front / ID back / Selfie", two of which can
  // never hold anything — and the bio page, the only image that matters, had no
  // tab at all. An officer approving a document they cannot open is the human
  // control failing silently.
  //
  // ⚠️ Falls back to every known slot when the type is missing (a pre-2026-08-20
  // record mid-backfill), so nothing on file becomes unreachable.
  const slots = (required.length ? required : ALL_DOC_SLOTS).map((s) => ({
    type: s,
    label: ADMIN_SLOT_LABEL[s],
    uploadedAt: kyc.documents.find((d) => d.docType === s)?.uploadedAt ?? null,
  }));

  return (
    <>
      <AdminPageHead
        title="KYC workstation"
        sw="Kituo cha uthibitisho"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {queuePos >= 0 && (
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle">
                #{queuePos + 1} of {pending.length} · oldest {ageLabel(oldest)}
              </span>
            )}
            {/* ⚠️ LITERAL, not `h-8` — spacing is overridden (tailwind.config.ts:200-215) so
                `h-8` was 48px. 40px = --tap-min, the admin header-chip height. */}
            <Link href={"/admin/approvals" as Route} className="inline-flex items-center gap-1.5 h-[40px] px-3 rounded-md border border-border bg-bg-inset font-mono text-[11px] tracking-[0.08em] uppercase text-text-muted hover:text-text hover:border-border-strong transition-colors">
              <I.chevronLeft s={13} /> Queue
            </Link>
          </div>
        }
      />

      <div className="px-4 lg:px-6 py-5">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] items-start">
          {/* Document viewer (left) */}
          <div className="space-y-4">
            <AdminCard title="Documents · Nyaraka" sw={slots.map((s) => s.label).join(" · ")}>
              <KycDocViewer userId={id} slots={slots} />
            </AdminCard>

            <AdminCard title="Applicant · Mwombaji">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12.5px]">
                <Field label="Full name" value={kyc.fullName ?? "—"} />
                {/* ⛔ WHICH DOCUMENT, THEN THE NUMBER. A masked tail alone stopped
                    being a complete statement the day four documents were accepted —
                    "•••• 5678" does not tell an officer what they are about to
                    approve, and the whole point of this screen is that they know. */}
                <Field label="Document type" value={idType ? ID_TYPE_LABEL[idType] : "—"} />
                <Field label="Number" value={<span className="font-mono">{kyc.idNumber ? `${kyc.idNumber.slice(0, 4)}…${kyc.idNumber.slice(-4)}` : "—"}</span>} />
                {/* Rendered only for the two documents that HAVE an expiry — a blank
                    "Expiry: —" on a voter's card reads as missing evidence rather
                    than as a document that does not carry one. */}
                {spec?.expires && (
                  <Field
                    label="Expiry"
                    value={
                      <span className={`font-mono ${expired ? "text-no-300" : ""}`}>
                        {kyc.idExpiry ? `${kyc.idExpiry}${expired ? " · EXPIRED" : ""}` : "—"}
                      </span>
                    }
                  />
                )}
                {/* Was the raw ISO string — "1995-04-12T00:00:00.000Z" — on a card whose other
                    dates are formatted (§6 E-2). ⚠️ THAT GUARANTEE NOW LIVES IN THE REGISTRY,
                    NOT HERE: `sensitive-fields.ts` formats on the way out, both for the masked
                    render and for a permitted reveal. It has to be there rather than at the call
                    site, because `revealSensitiveAction` returns the value straight to
                    `<SensitiveReveal>` and never passes back through this page — so formatting
                    here would have left the REVEALED value as a raw instant. */}
                {/* 🔴 AUDITOR holds `compliance: view`, so this page is theirs — and their
                    identity.personal cell is `masked`, a ceiling they were reading straight past.
                    Found by the drift ratchet (test:read-tiers §7), not by looking. */}
                <Field label="DOB" value={<span className="font-mono">{kyc.dob ? <Sensitive field="dob" subjectId={id} value={kyc.dob} /> : "—"}</span>} />
                <Field label="Region" value={user?.region ? <Sensitive field="region" subjectId={id} value={user.region} /> : "—"} />
                <Field label="Submitted" value={<span className="font-mono">{kyc.submittedAt ? formatDateTime(kyc.submittedAt) : "—"}</span>} />
                <Field label="Phone" value={<span className="font-mono">{user ? `${user.phoneE164.slice(0, 4)}••••${user.phoneE164.slice(-2)}` : "—"}</span>} />
              </dl>
            </AdminCard>
          </div>

          {/* Decision rail (right) */}
          <div className="space-y-4 lg:sticky lg:top-4">
            <AdminCard>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">Risk score · Alama ya hatari</p>
                  <p className="font-mono text-[26px] font-bold leading-none tabular-nums" style={{ color: risk.band === "high" ? "var(--no-400)" : risk.band === "medium" ? "var(--warning-fg)" : "var(--yes-400)" }}>
                    {risk.score}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">SLA</p>
                  <Chip size="sm" variant={slaTone as "brand" | "warning" | "danger" | "neutral"}>{slaLabel}</Chip>
                </div>
              </div>
              <div className="mt-3">
                <AdminMeter value={risk.score} cap={100} thresholdPct={KYC_MAKER_CHECKER_THRESHOLD} format={(n) => String(n)} />
              </div>
              {risk.factors.length > 0 ? (
                <ul className="mt-2.5 space-y-1">
                  {risk.factors.map((f) => (
                    <li key={f.label} className="flex items-baseline justify-between gap-2 text-[11.5px]">
                      <span className="text-text-muted">{f.label} <span className="text-text-subtle">· {f.detail}</span></span>
                      <span className="font-mono tabular-nums text-no-300">+{f.points}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2.5 text-[11.5px] text-text-tertiary">No elevated-risk signals on this account.</p>
              )}
            </AdminCard>

            <AdminCard title={decided ? "Decision" : "Officer decision"} sw={decided ? undefined : "Uamuzi wa afisa"}>
              {decided ? (
                <div className="flex items-start gap-2.5">
                  <I.shieldcheck s={18} className={kyc.status === "APPROVED" ? "text-yes-300 mt-0.5 shrink-0" : "text-no-300 mt-0.5 shrink-0"} />
                  <div>
                    <p className={`font-display text-[15px] font-bold ${kyc.status === "APPROVED" ? "text-yes-300" : "text-no-300"}`}>
                      {kyc.status === "APPROVED" ? "Identity approved" : "Submission rejected"}
                    </p>
                    <p className="mt-0.5 text-[12px] text-text-muted">
                      {kyc.reviewerId ? `by ${kyc.reviewerId.slice(0, 14)}…` : ""}{kyc.reviewedAt ? ` · ${formatDateTime(kyc.reviewedAt)}` : ""}
                    </p>
                    {kyc.rejectNote && <p className="mt-1 text-[12px] text-text-muted italic">“{kyc.rejectNote}”</p>}
                  </div>
                </div>
              ) : (
                <KycDecisionRail
                  userId={id}
                  autoChecks={autoChecks}
                  makerCheckerRequired={makerCheckerRequired}
                  hasRecommendation={!!recommendation}
                  isRecommender={!!recommendation && recommendation.officerId === currentOfficerId}
                  recommenderName={recommendation?.officerName ?? null}
                />
              )}
            </AdminCard>
          </div>
        </div>
      </div>
    </>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">{label}</dt>
      <dd className="text-text">{value}</dd>
    </div>
  );
}
