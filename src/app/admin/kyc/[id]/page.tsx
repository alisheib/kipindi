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
import { KycDecisionRail } from "./kyc-decision-rail";

export const metadata = { title: "Admin · KYC workstation" };
export const dynamic = "force-dynamic";

const SLA_HOURS = 24;

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

  // Auto-derived checklist (real signals only).
  const present = new Set(kyc.documents.map((d) => d.docType));
  const age18 = kyc.dob ? (Date.now() - Date.parse(kyc.dob)) / (365.25 * 24 * 3600_000) >= 18 : null;
  const allDocs = ["NIDA_FRONT", "NIDA_BACK", "SELFIE"].every((t) => present.has(t));
  const autoChecks = [
    // POLICY (Ali, 2026-07-19): the NIDA control is FORMAT + UNIQUENESS only —
    // one NIDA number, one account. There is deliberately no authority check;
    // `nida.ts` is a deterministic mock and no request has ever reached the
    // National Identification Authority.
    //
    // So this row must NOT read "NIDA verified / government match", as it used to.
    // That told a compliance officer a government confirmed this identity, which
    // would invite them to approve a withdrawal on evidence that does not exist.
    // It now states exactly what was actually checked, and the officer's decision
    // rests on the DOCUMENTS — which is what already happens in practice.
    { label: "NIDA number", state: (kyc.nidaNumber ? "pass" : "pending") as "pass" | "fail" | "pending", detail: kyc.nidaNumber ? "format valid · unique to this account (no authority check by design)" : "not recorded" },
    { label: "18 or older", state: (age18 === null ? "pending" : age18 ? "pass" : "fail") as "pass" | "fail" | "pending", detail: kyc.dob ? `DOB ${kyc.dob}` : "no DOB" },
    { label: "All documents present", state: (allDocs ? "pass" : "fail") as "pass" | "fail" | "pending", detail: `${present.size}/3 uploaded` },
    { label: "Source-of-funds on file", state: (sof ? "pass" : "pending") as "pass" | "fail" | "pending", detail: sof ? sof.reviewStatus : "not required / absent" },
  ];

  const slaMs = kyc.submittedAt ? Date.parse(kyc.submittedAt) + SLA_HOURS * 3600_000 - Date.now() : null;
  const slaLabel = slaMs === null ? "—" : slaMs <= 0 ? `${Math.floor(-slaMs / 3600_000)}h overdue` : `${Math.floor(slaMs / 3600_000)}h ${Math.floor((slaMs % 3600_000) / 60_000)}m left`;
  const slaTone = slaMs === null ? "neutral" : slaMs <= 0 ? "danger" : slaMs < 2 * 3600_000 ? "warning" : "brand";

  const slots = [
    { type: "NIDA_FRONT" as const, label: "ID front", uploadedAt: kyc.documents.find((d) => d.docType === "NIDA_FRONT")?.uploadedAt ?? null },
    { type: "NIDA_BACK" as const, label: "ID back", uploadedAt: kyc.documents.find((d) => d.docType === "NIDA_BACK")?.uploadedAt ?? null },
    { type: "SELFIE" as const, label: "Selfie", uploadedAt: kyc.documents.find((d) => d.docType === "SELFIE")?.uploadedAt ?? null },
  ];

  return (
    <>
      <AdminPageHead
        title="KYC workstation"
        sw="Kituo cha uthibitisho"
        period={false}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {queuePos >= 0 && (
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle">
                #{queuePos + 1} of {pending.length} · oldest {ageLabel(oldest)}
              </span>
            )}
            <Link href={"/admin/approvals" as Route} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border bg-bg-inset font-mono text-[11px] tracking-[0.08em] uppercase text-text-muted hover:text-text hover:border-border-strong transition-colors">
              <I.chevronLeft s={13} /> Queue
            </Link>
          </div>
        }
      />

      <div className="px-4 lg:px-6 py-5">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] items-start">
          {/* Document viewer (left) */}
          <div className="space-y-4">
            <AdminCard title="Documents · Nyaraka" sw="ID front · back · selfie">
              <KycDocViewer userId={id} slots={slots} />
            </AdminCard>

            <AdminCard title="Applicant · Mwombaji">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12.5px]">
                <Field label="Full name" value={kyc.fullName ?? "—"} />
                <Field label="NIDA" value={<span className="font-mono">{kyc.nidaNumber ? `${kyc.nidaNumber.slice(0, 4)}…${kyc.nidaNumber.slice(-4)}` : "—"}</span>} />
                <Field label="DOB" value={<span className="font-mono">{kyc.dob ?? "—"}</span>} />
                <Field label="Region" value={user?.region ?? "—"} />
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
