"use client";

/**
 * ADM3 — KYC decision rail. Auto-derived checklist rows (read-only, from server)
 * + officer-judgment rows the officer must clear before Approve arms. Approve /
 * reject-with-reason-code / escalate-to-AML all call the guarded workstation
 * actions. High-risk approvals go through the maker-checker: recommend (officer
 * A) → approve (officer B ≠ A).
 */
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { useDeferredToast } from "@/components/ui/toast";
import { Select } from "@/components/ui/select";
import { BrandSpinner } from "@/components/brand";
import { AttestationRail } from "@/components/admin/attestation-rail";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { UnsavedChangesGuard, PendingChangesBar } from "@/components/ui/unsaved-changes";
import { CEREMONY } from "@/lib/admin-status-lexicon";
import { KYC_ATTESTATIONS } from "@/lib/kyc-attestations";
import { runAdminAction } from "@/lib/client/run-admin-action";
import { focusFirstInvalid } from "@/lib/client/focus-first-invalid";
import {
  approveKycWorkstationAction,
  rejectKycWorkstationAction,
  escalateKycToAmlAction,
  recommendKycApprovalAction,
} from "./kyc-actions";
import { useMayAct, ActReadOnly } from "@/components/admin/act-gate";

type TriState = "pass" | "fail" | "pending";
type AutoCheck = { label: string; state: TriState; detail: string };

/* E-4: the four attestations now come from ONE shared definition that the server
   action also imports, so the collected keys and the required keys cannot drift. */
const JUDGMENT_CHECKS = KYC_ATTESTATIONS;

/**
 * ⭐ THE THREE FINAL CODES ARE CHOOSABLE HERE (2026-09-13), and until then none of them was.
 * This list offered only recoverable categories plus "suspected fraud" → OTHER, so an officer
 * looking at a sixteen-year-old's passport had no way to refuse the account AS UNDERAGE. That was
 * tolerable while the identity review came before any money; from 2026-09-13 it comes at cash-out,
 * this checklist's "18 or older" row is the platform's only age check against a document, and a
 * final refusal is what freezes the wallet and opens the balance decision (`refused-funds.ts`).
 * `final: true` must agree with `src/lib/kyc-refusal.ts` — the server decides by the code, not by this flag.
 */
const REJECT_OPTIONS = [
  { value: "document_unreadable", label: "Document unreadable", final: false },
  { value: "mismatch", label: "Details mismatch", final: false },
  { value: "expired", label: "Document expired", final: false },
  { value: "suspected_fraud", label: "Suspected fraud", final: false },
  { value: "other", label: "Other (note required)", final: false },
  { value: "underage", label: "FINAL · Under 18", final: true },
  { value: "sanctioned", label: "FINAL · Sanctions / PEP concern", final: true },
  { value: "duplicate_identity", label: "FINAL · Identity used on another account", final: true },
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
  // A1 — this control only ACTS, so a role holding VIEW without ACT is shown why rather
  // than being offered a button the server will refuse (and logged as a privilege
  // escalation for pressing it). See docs/ADMIN-CONSOLE-FINDINGS.md.
  const mayAct = useMayAct();

  const [pending, startTransition] = useTransition();
  /* ⛔ ONE HOME for the resting checklist — the seed and the "has anything been judged?"
     comparison read the same builder, so a new check added to JUDGMENT_CHECKS cannot make the
     rail open already claiming unsaved work. */
  const freshJudgments = () => Object.fromEntries(JUDGMENT_CHECKS.map((c) => [c.key, "pending"])) as Record<string, TriState>;
  const [judg, setJudg] = useState<Record<string, TriState>>(freshJudgments);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reasonCode, setReasonCode] = useState("");
  /* The reject panel — the container focusFirstInvalid searches (see run() below). */
  const rejectRef = useRef<HTMLDivElement>(null);
  const [note, setNote] = useState("");
  const reviewDirty =
    Object.values(judg).some((v) => v !== "pending") || reasonCode !== "" || note.trim().length > 0;
  const discardReview = () => {
    setJudg(freshJudgments());
    setReasonCode("");
    setNote("");
    setRejectOpen(false);
  };
  const router = useRouter();
  // B-28 — success toasts ride the transition's falling edge (data visible when announced)
  const { toast, deferToast } = useDeferredToast(pending);

  // Rules of hooks: read the gate as a hook at the top, ACT on it below every other hook.
  // Revoking an ACT grant mid-session flips `mayAct` on the next router.refresh(); an early
  // return above these hooks would render fewer hooks than the last pass and crash the page.
  if (!mayAct) return <ActReadOnly />;

  const cycle = (k: string) => setJudg((p) => ({ ...p, [k]: p[k] === "pending" ? "pass" : p[k] === "pass" ? "fail" : "pending" }));
  const allJudged = JUDGMENT_CHECKS.every((c) => judg[c.key] === "pass");
  const anyAutoFail = autoChecks.some((c) => c.state === "fail");
  const pickedFinal = REJECT_OPTIONS.find((o) => o.value === reasonCode)?.final === true;

  const run = (fn: (fd: FormData) => Promise<{ ok: boolean; error?: string; field?: string }>, okTitle: string, extra?: Record<string, string>, okVariant: "success" | "warning" = "success") => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("userId", userId);
      for (const [k, v] of Object.entries(extra ?? {})) fd.set(k, v);
      const r = await runAdminAction(() => fn(fd));
      if (!r.ok) {
        toast({ title: "Blocked", description: r.error, variant: "danger" });
        /* ⭐ DG-S-05/06 — scoped to the reject panel, which is the only part of this rail that
           owns addressable fields. It stays open on a refusal, so both controls are on screen. */
        if (r.field) focusFirstInvalid(rejectRef.current, [r.field]);
        return;
      }
      // Success outcomes defer to the refresh; warning outcomes stay immediate.
      (okVariant === "success" ? deferToast : toast)({ title: okTitle, variant: okVariant });
      router.refresh();
    });
  };

  if (pending) {
    return (
      <div className="flex items-center justify-center gap-2.5 py-4">
        <BrandSpinner size={28} />
        <span className="font-mono text-caption uppercase tracking-[0.16em] text-text-muted">Recording decision…</span>
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
        <p className="font-mono text-micro uppercase eyebrow text-text-subtle">Verification checklist · Orodha</p>
        {autoChecks.map((c) => (
          <div key={c.label} className="flex items-center gap-2.5 text-[12.5px]">
            <TriIcon state={c.state} />
            <span className="text-text">{c.label}</span>
            <span className="ml-auto font-mono text-[10.5px] text-text-tertiary">{c.detail}</span>
          </div>
        ))}
        <div className="my-1 border-t border-dashed border-border-subtle" />
        {/* DG-A-08 — the checklist row is a CONTROL (it cycles the judgment), and at
            py-0.5 it rendered 22.75px against §A2's 40px floor. `min-h` rather than the
            kit `.btn`: this is a full-width row whose label is left-aligned and whose
            verdict is pushed right by `ml-auto`, and a `.btn` centres both. §K1 forbids a
            height utility ON a `.btn` — this is not one, so the floor is stated directly. */}
        {JUDGMENT_CHECKS.map((c) => (
          <button key={c.key} type="button" onClick={() => cycle(c.key)} className="flex min-h-[var(--tap-min)] w-full items-center gap-2.5 rounded-sm py-0.5 text-left text-[12.5px] hover:bg-bg-overlay/40">
            <TriIcon state={judg[c.key]} />
            <span className="text-text">{c.label}</span>
            <span className="ml-auto font-mono text-micro uppercase tracking-[0.12em] text-text-subtle">
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
          <button type="button" onClick={() => run(recommendKycApprovalAction, "Approval recommended", { attestations: JSON.stringify(judg) }, "warning")} className="btn btn-primary btn-md w-full">
            <I.shieldcheck s={14} /> Recommend approval
          </button>
        ) : (
          <ConfirmDialog
            trigger={
              <button
                type="button"
                disabled={!(canApproveDirect || canApproveAsChecker)}
                /* btn-lg (--h-control-lg, 48px) rather than btn-md: these three controls
                   decide a person's identity and open the withdrawal gate, and officers
                   review on a phone, so they get the top rung of the ladder.
                   ⛔ Values live in globals.css — do not restate them here. */
                className="btn btn-primary btn-lg w-full disabled:opacity-40"
              >
                <I.shieldcheck s={14} /> {makerCheckerRequired ? "Approve (second officer)" : "Approve identity"}
              </button>
            }
            title="Approve identity · Idhinisha kitambulisho"
            /* E-9 (officer-facing twin of E-5), measured at the ENFORCEMENT layer. This sentence
               has now been wrong three times, and the third was held in place by a green guard:
                 · first "unlocks full real-money deposits, play and withdrawals";
                 · then "opens the withdrawal gate" — false from 2026-08-20 to 2026-09-05;
                 · then, from 2026-09-05, "does NOT open any money gate: withdrawals no longer depend
                   on identity verification…" — FALSE IN ALL THREE CLAUSES while the 2026-09-05 gate
                   stood, and `kyc-approved-copy.test.mts` asserted it stayed that way.
               ⭐ FROM 2026-09-13 THE TRUE SENTENCE IS ONE CLAUSE: approval opens the withdrawal gate,
               and nothing else (`kyc-gate.ts` — the only identity question on any money path).
               ⛔ Fix this sentence and its guard in the same commit, every time. */
            body={<>This records the player&apos;s identity as <strong>verified</strong> and binds this document to this account, so no other account can claim it. It is audit-logged. <strong>It opens the withdrawal gate, and nothing else</strong> — depositing needs a confirmed email address and playing needs no identity, so this player may already hold money they are waiting to take out. Confirm the checklist reflects the documents you actually reviewed.</>}
            confirmLabel="Yes, approve identity"
            tone="brand"
            /* E-4: the attestations travel WITH the decision. They used to arm this
               button and then die in the browser. */
            onConfirm={() => run(approveKycWorkstationAction, "Identity approved", { attestations: JSON.stringify(judg) })}
          />
        )}

        {!rejectOpen ? (
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setRejectOpen(true)} className="btn btn-lg w-full" style={{ background: "var(--claret-soft)", color: "var(--claret-200)", border: "1px solid var(--claret-edge)" }}>
              <I.x s={13} /> Reject
            </button>
            <button type="button" onClick={() => run(escalateKycToAmlAction, "Escalated to AML", { note }, "warning")} className="btn btn-ghost btn-lg w-full">
              <I.alertCircle s={13} /> Escalate AML
            </button>
          </div>
        ) : (
          <div ref={rejectRef} className="space-y-2 rounded-md border border-claret-edge bg-claret-soft p-2.5">
            {/* ⭐ DG-S-05/06 — the two addresses `rejectKycWorkstationAction` can name. Each
                wrapper CONTAINS its control, so `focusFirstInvalid` focuses the control rather
                than merely scrolling to a label. */}
            <div data-field="reasonCode">
              <Select
                value={reasonCode}
                onChange={setReasonCode}
                ariaLabel="Reason code"
                placeholder="Reason code…"
                size="sm"
                options={REJECT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              />
            </div>
            {pickedFinal && (
              <p data-final-refusal-warning="1" className="rounded-md border border-border bg-bg-inset px-2.5 py-2 text-body-sm text-text">
                <strong>A final refusal.</strong> It freezes the wallet (no deposits, bets or withdrawals), keeps this document reserved, and the player cannot restart verification themselves. You then decide what happens to any balance, with a written reason.
              </p>
            )}
            <textarea data-field="note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder={pickedFinal ? "Optional note — the player reads it; never name a list or an internal check…" : "Note to the player (required for “Other”)…"} className="w-full rounded-md border border-border bg-bg-overlay px-2.5 py-1.5 text-[12px] text-text admin-focus resize-y placeholder:text-text-subtle" />
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={!reasonCode} onClick={() => run(rejectKycWorkstationAction, pickedFinal ? "Refused · wallet frozen" : "Submission rejected", { reasonCode, note }, pickedFinal ? "warning" : "success")} className="btn btn-claret btn-md w-full disabled:opacity-40">{pickedFinal ? "Confirm final refusal" : "Confirm reject"}</button>
              <button type="button" onClick={() => { setRejectOpen(false); setReasonCode(""); }} className="btn btn-ghost btn-md w-full">Cancel</button>
            </div>
          </div>
        )}
      </div>

      {anyAutoFail && (
        <p className="font-mono text-[10.5px] text-no-300">A required check failed — reject or request more info rather than approve.</p>
      )}

      {/**
        * ⛔ THE OFFICER'S JUDGEMENTS ARE WORK, not just the typed note. `judg` is a whole manual
        * checklist — every entry starts `pending` and an officer moves them one at a time while
        * reading the documents — and none of it is written anywhere until a decision is run. An
        * interrupted KYC review meant doing the reading again.
        * ⭐ This rail is inline chrome, not a modal: nothing blocks a click on the sidebar.
        */}
      <PendingChangesBar
        dirty={reviewDirty}
        label="Decision not recorded"
        detail="The checklist and reject note are held in this page only."
        onDiscard={discardReview}
      />
      <UnsavedChangesGuard
        dirty={reviewDirty}
        body="This KYC review has judgements that have not been submitted as a decision. Leaving now discards them."
      />
    </div>
  );
}
