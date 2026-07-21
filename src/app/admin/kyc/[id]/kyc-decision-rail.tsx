"use client";

/**
 * ADM3 — KYC decision rail. Auto-derived checklist rows (read-only, from server)
 * + officer-judgment rows the officer must clear before Approve arms. Approve /
 * reject-with-reason-code / escalate-to-AML all call the guarded workstation
 * actions. High-risk approvals go through the maker-checker: recommend (officer
 * A) → approve (officer B ≠ A).
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { useToast } from "@/components/ui/toast";
import { BrandSpinner } from "@/components/brand";
import { AttestationRail } from "@/components/admin/attestation-rail";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CEREMONY } from "@/lib/admin-status-lexicon";
import {
  approveKycWorkstationAction,
  rejectKycWorkstationAction,
  escalateKycToAmlAction,
  recommendKycApprovalAction,
} from "./kyc-actions";

type TriState = "pass" | "fail" | "pending";
type AutoCheck = { label: string; state: TriState; detail: string };

const JUDGMENT_CHECKS = [
  { key: "name_matches", label: "Name matches the ID" },
  { key: "document_authentic", label: "Document appears authentic" },
  { key: "selfie_match", label: "Selfie matches the ID photo" },
  { key: "sanctions_clear", label: "Sanctions / PEP clear" },
];

const REJECT_OPTIONS = [
  { value: "document_unreadable", label: "Document unreadable" },
  { value: "mismatch", label: "Details mismatch" },
  { value: "expired", label: "Document expired" },
  { value: "suspected_fraud", label: "Suspected fraud" },
  { value: "other", label: "Other (note required)" },
];

function TriIcon({ state }: { state: TriState }) {
  if (state === "pass") return <I.checkCircle s={15} className="text-yes-300" />;
  if (state === "fail") return <I.x s={15} className="text-no-300" />;
  return <span className="inline-block h-3 w-3 rounded-full border border-text-subtle" />;
}

export function KycDecisionRail({
  userId,
  autoChecks,
  makerCheckerRequired,
  hasRecommendation,
  isRecommender,
  recommenderName,
}: {
  userId: string;
  autoChecks: AutoCheck[];
  makerCheckerRequired: boolean;
  hasRecommendation: boolean;
  isRecommender: boolean;
  recommenderName: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [judg, setJudg] = useState<Record<string, TriState>>(Object.fromEntries(JUDGMENT_CHECKS.map((c) => [c.key, "pending"])));
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reasonCode, setReasonCode] = useState("");
  const [note, setNote] = useState("");
  const router = useRouter();
  const { toast } = useToast();

  const cycle = (k: string) => setJudg((p) => ({ ...p, [k]: p[k] === "pending" ? "pass" : p[k] === "pass" ? "fail" : "pending" }));
  const allJudged = JUDGMENT_CHECKS.every((c) => judg[c.key] === "pass");
  const anyAutoFail = autoChecks.some((c) => c.state === "fail");

  const run = (fn: (fd: FormData) => Promise<{ ok: boolean; error?: string }>, okTitle: string, extra?: Record<string, string>, okVariant: "success" | "warning" = "success") => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("userId", userId);
      for (const [k, v] of Object.entries(extra ?? {})) fd.set(k, v);
      const r = await fn(fd);
      if (!r.ok) { toast({ title: "Blocked", description: r.error, variant: "danger" }); return; }
      toast({ title: okTitle, variant: okVariant });
      router.refresh();
    });
  };

  if (pending) {
    return (
      <div className="flex items-center justify-center gap-2.5 py-4">
        <BrandSpinner size={28} />
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-text-muted">Recording decision…</span>
      </div>
    );
  }

  // Approve is armed only when every check passes; high-risk needs the second officer.
  const checksOk = allJudged && !anyAutoFail;
  const canApproveDirect = checksOk && !makerCheckerRequired;
  const canApproveAsChecker = checksOk && makerCheckerRequired && hasRecommendation && !isRecommender;
  const canRecommend = checksOk && makerCheckerRequired && !hasRecommendation;

  return (
    <div className="space-y-4">
      {/* Checklist */}
      <div className="space-y-1.5">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">Verification checklist · Orodha</p>
        {autoChecks.map((c) => (
          <div key={c.label} className="flex items-center gap-2.5 text-[12.5px]">
            <TriIcon state={c.state} />
            <span className="text-text">{c.label}</span>
            <span className="ml-auto font-mono text-[10.5px] text-text-tertiary">{c.detail}</span>
          </div>
        ))}
        <div className="my-1 border-t border-dashed border-border-subtle" />
        {JUDGMENT_CHECKS.map((c) => (
          <button key={c.key} type="button" onClick={() => cycle(c.key)} className="flex w-full items-center gap-2.5 rounded-sm py-0.5 text-left text-[12.5px] hover:bg-bg-overlay/40">
            <TriIcon state={judg[c.key]} />
            <span className="text-text">{c.label}</span>
            <span className="ml-auto font-mono text-[9.5px] uppercase tracking-[0.12em] text-text-subtle">
              {judg[c.key] === "pending" ? "tap to verify" : judg[c.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Maker-checker banner for high-risk */}
      {makerCheckerRequired && (
        <AttestationRail tone="info" title={CEREMONY.twoOfficerRule}>
          {hasRecommendation
            ? isRecommender
              ? "You recommended this approval — a different officer must seal it."
              : `Recommended by ${recommenderName ?? "an officer"}. You may approve as the second officer.`
            : "High-risk score — one officer recommends, a second approves."}
        </AttestationRail>
      )}

      {/* Actions */}
      <div className="space-y-2">
        {canRecommend ? (
          <button type="button" onClick={() => run(recommendKycApprovalAction, "Approval recommended", undefined, "warning")} className="btn btn-primary btn-md w-full">
            <I.shieldcheck s={14} /> Recommend approval
          </button>
        ) : (
          <ConfirmDialog
            trigger={
              <button
                type="button"
                disabled={!(canApproveDirect || canApproveAsChecker)}
                className="btn btn-primary btn-md w-full disabled:opacity-40"
              >
                <I.shieldcheck s={14} /> {makerCheckerRequired ? "Approve (second officer)" : "Approve identity"}
              </button>
            }
            title="Approve identity · Idhinisha kitambulisho"
            body={<>This marks the player&apos;s identity as <strong>verified</strong> and unlocks full real-money deposits, play and withdrawals. Confirm the checklist reflects the documents you actually reviewed.</>}
            confirmLabel="Yes, approve identity"
            tone="brand"
            onConfirm={() => run(approveKycWorkstationAction, "Identity approved")}
          />
        )}

        {!rejectOpen ? (
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setRejectOpen(true)} className="btn btn-md w-full" style={{ background: "var(--claret-soft)", color: "var(--claret-200)", border: "1px solid var(--claret-edge)" }}>
              <I.x s={13} /> Reject
            </button>
            <button type="button" onClick={() => run(escalateKycToAmlAction, "Escalated to AML", { note }, "warning")} className="btn btn-ghost btn-md w-full">
              <I.alertCircle s={13} /> Escalate AML
            </button>
          </div>
        ) : (
          <div className="space-y-2 rounded-md border border-claret-edge bg-claret-soft/40 p-2.5">
            <select value={reasonCode} onChange={(e) => setReasonCode(e.target.value)} className="h-9 w-full rounded-md border border-claret-edge bg-bg-overlay px-2.5 text-[12.5px] text-text admin-focus">
              <option value="">Reason code…</option>
              {REJECT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Note to the player (required for “Other”)…" className="w-full rounded-md border border-border bg-bg-overlay px-2.5 py-1.5 text-[12px] text-text admin-focus resize-y placeholder:text-text-subtle" />
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={!reasonCode} onClick={() => run(rejectKycWorkstationAction, "Submission rejected", { reasonCode, note })} className="btn btn-claret btn-md w-full disabled:opacity-40">Confirm reject</button>
              <button type="button" onClick={() => { setRejectOpen(false); setReasonCode(""); }} className="btn btn-ghost btn-md w-full">Cancel</button>
            </div>
          </div>
        )}
      </div>

      {anyAutoFail && (
        <p className="font-mono text-[10.5px] text-no-300">A required check failed — reject or request more info rather than approve.</p>
      )}
    </div>
  );
}
