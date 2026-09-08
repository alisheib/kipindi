"use client";

/**
 * /agent/apply — FOUR STEPS on `SteppedProgress`, because seven upload slots in one column is
 * ~2,400px of scroll on a 360 phone. About you (CV, request letter) · Where you live (Serikali)
 * · Your referees (two PAIRED cards, each a letter + an ID — never four loose slots) · Payment.
 * A persistent "N of 7 attached" counter, and a submit that is disabled with an explicit list
 * of what is missing, never a mute button.
 *
 * Every slot has four states — empty · uploading · uploaded · OFFICER-REJECTED — and only the
 * rejected ones (plus empty ones) are actionable while the application sits in
 * ADDITIONAL_INFO_REQUIRED. Three distinct upload errors: wrong type · too large · the file's
 * bytes disagree with its declared type.
 *
 * Kit only: `Input` for the reference (⛔ never a raw input), `Button`, `Chip`, the shared
 * uploader shape from `kyc-doc-uploader`, `OperationResultModal` for the consequential submit,
 * `UnsavedChangesGuard` for the referee fields. ⛔ No native confirm(). No emoji. 44px taps.
 */
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SteppedProgress } from "@/components/markets/stepped-progress";
import { Field, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Checkbox } from "@/components/ui/checkbox";
import { Callout } from "@/components/ui/callout";
import { Spinner } from "@/components/ui/spinner";
import { I } from "@/components/ui/glyphs";
import { useToast } from "@/components/ui/toast";
import { UnsavedChangesGuard } from "@/components/ui/unsaved-changes";
import { OperationResultModal } from "@/components/markets/operation-result-modal";
import { KycGatePanel } from "@/components/kyc/kyc-gate-panel";
import type { KycGateState } from "@/lib/kyc-gate-state";
import { useT } from "@/lib/i18n";
import { fill, formatTzs } from "@/lib/utils";
import { fileToDataUrl } from "@/lib/client/kyc-image";
import { focusFirstInvalid } from "@/lib/client/focus-first-invalid";
import type { AgentDocType } from "@/lib/server/store";
import { attachAgentDocumentAction, setRefereesAction, recordFeePaymentAction, submitAgentApplicationAction, type UploadFailure } from "./actions";
import { fillNodes } from "@/lib/fill-nodes";
import { LipaQrPanel } from "@/components/pay/lipa-qr-panel";
import type { LipaDisplay } from "@/lib/lipa";

type DocView = { docType: AgentDocType; uploadedAt: string; rejected: boolean; rejectReason: string | null; sizeBytes: number; thirdParty: boolean };

type Props = {
  app: {
    id: string; status: string; source: string; feeReference: string | null; feeWaived: boolean; infoRequestNote: string | null;
    referees: { oneName: string; oneContact: string; twoName: string; twoContact: string; consented: boolean };
  };
  documents: DocView[];
  missing: string[];
  /** Only for an OFFICER_INVITED applicant: their own identity gate, null once submitted/approved. */
  kycGate: KycGateState | null;
  fee: { totalTzs: number; destinationName: string; destinationAccount: string };
  /** Selcom merchant QR, or null when it is not configured. Rendered only when it names
   *  the SAME account as `fee.destinationAccount` — see `shouldShowLipaQr`. */
  lipa: LipaDisplay | null;
  limits: { maxMb: number; refereeHoldDays: number; reviewSlaDays: number };
};

const REQUIRED: AgentDocType[] = ["CV", "REQUEST_LETTER", "SERIKALI_LETTER", "REFEREE_ONE_LETTER", "REFEREE_ONE_ID", "REFEREE_TWO_LETTER", "REFEREE_TWO_ID"];

export function ApplyClient({ app, documents, missing, kycGate, fee, lipa, limits }: Props) {
  const { t } = useT();
  const router = useRouter();
  const { toast } = useToast();
  const infoRequired = app.status === "ADDITIONAL_INFO_REQUIRED";

  const docLabel: Record<AgentDocType, string> = {
    CV: t.agent.docCv, REQUEST_LETTER: t.agent.docRequest, SERIKALI_LETTER: t.agent.docSerikali,
    REFEREE_ONE_LETTER: t.agent.docRefLetter1, REFEREE_ONE_ID: t.agent.docRefId1,
    REFEREE_TWO_LETTER: t.agent.docRefLetter2, REFEREE_TWO_ID: t.agent.docRefId2, FEE_RECEIPT: t.agent.docReceipt,
  };

  // Optimistic view of the slots: the server view is the seed; uploads update it locally and
  // `router.refresh()` reconciles.
  const [docs, setDocs] = useState<Record<string, DocView | undefined>>(() => Object.fromEntries(documents.map((d) => [d.docType, d])));
  const attached = REQUIRED.filter((s) => docs[s] && !docs[s]!.rejected).length;

  // Which step to open on: the first step with something missing, or the last.
  const firstMissingStep = useMemo(() => {
    const has = (s: AgentDocType) => !!docs[s] && !docs[s]!.rejected;
    if (!has("CV") || !has("REQUEST_LETTER")) return 0;
    if (!has("SERIKALI_LETTER")) return 1;
    if (!has("REFEREE_ONE_LETTER") || !has("REFEREE_ONE_ID") || !has("REFEREE_TWO_LETTER") || !has("REFEREE_TWO_ID") || !app.referees.consented) return 2;
    return 3;
  }, [docs, app.referees.consented]);
  const [step, setStep] = useState(firstMissingStep);

  // Referees — local form state so the guard can tell dirty from clean.
  const [ref, setRef] = useState(app.referees);
  const [refSaved, setRefSaved] = useState(app.referees.consented);
  const refDirty = !refSaved && (ref.oneName !== app.referees.oneName || ref.oneContact !== app.referees.oneContact || ref.twoName !== app.referees.twoName || ref.twoContact !== app.referees.twoContact || ref.consented !== app.referees.consented);
  const [refPending, startRef] = useTransition();

  // Fee reference
  const [feeRef, setFeeRef] = useState(app.feeReference ?? "");
  const [feeSaved, setFeeSaved] = useState(!!app.feeReference);
  const feeDirty = !app.feeWaived && !feeSaved && feeRef.trim() !== (app.feeReference ?? "");
  const [feePending, startFee] = useTransition();

  /**
   * ⭐ THE FIELD A REFUSAL POINTS AT — the applicant-side half of DG-S-05/06.
   *
   * 🔴 Every refusal on this form used to surface as a TOAST. On a four-step form that is the
   * worst possible channel: "Each referee needs a name" told an applicant nothing about WHICH
   * of the four boxes was wrong, and the toast could be read on a step that did not contain
   * the box at all. `Field` has supported `error` and `dataField` all along and the admin side
   * uses both; this form passed neither.
   */
  const formRef = useRef<HTMLDivElement>(null);
  const [fieldErr, setFieldErr] = useState<{ name: string; message: string } | null>(null);
  const errOf = (name: string) => (fieldErr?.name === name ? fieldErr.message : undefined);

  // Submit
  const [accept, setAccept] = useState(false);
  const [submitPending, startSubmit] = useTransition();
  const [result, setResult] = useState<{ open: boolean; variant: "success" | "danger"; title: string; subtitle?: string } | null>(null);

  // What is still missing, recomputed locally so the list tracks uploads without a refresh.
  const identityBlocks = app.source === "OFFICER_INVITED" && kycGate !== null && kycGate !== "pending_review";
  const missingNow = useMemo(() => {
    const m: string[] = [];
    for (const s of REQUIRED) if (!docs[s] || docs[s]!.rejected) m.push(docLabel[s]);
    if (!refSaved) m.push(t.agent.missingReferees);
    // The invitee's own identity: PENDING_REVIEW is enough (decided with the application at approval).
    if (identityBlocks) m.push(t.agent.missingIdentity);
    if (!app.feeWaived) {
      if (!docs.FEE_RECEIPT) m.push(t.agent.missingReceipt);
      if (!feeSaved) m.push(t.agent.missingReference);
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docs, refSaved, feeSaved, app.feeWaived, missing, identityBlocks]);
  const canSubmit = missingNow.length === 0 && accept && !submitPending;

  const steps = [t.agent.stepAbout, t.agent.stepWhere, t.agent.stepReferees, t.agent.stepPayment];

  const onSubmit = () => {
    startSubmit(async () => {
      const fd = new FormData();
      fd.set("acceptTerms", "true");
      let r: Awaited<ReturnType<typeof submitAgentApplicationAction>>;
      try { r = await submitAgentApplicationAction(fd); } catch { r = { ok: false, error: t.error.somethingDidntWork }; }
      if (!r.ok) { setResult({ open: true, variant: "danger", title: t.error.somethingDidntWork, subtitle: r.error }); return; }
      setResult({ open: true, variant: "success", title: t.agent.submittedTitle, subtitle: fill(t.agent.submittedBody, { days: String(limits.reviewSlaDays) }) });
    });
  };

  return (
    <div ref={formRef} className="space-y-5">
      <UnsavedChangesGuard dirty={refDirty || feeDirty} title={t.agent.unsavedTitle} body={t.agent.unsavedBody} />

      {/* Title row + the persistent counter */}
      <div className="flex items-center justify-between gap-3">
        <p className="font-display text-title-md font-bold leading-none">{t.agent.applyTitle}</p>
        <Chip variant={attached === REQUIRED.length ? "success" : "pending"}>{fill(t.agent.attachedCount, { n: String(attached), total: String(REQUIRED.length) })}</Chip>
      </div>

      {infoRequired && app.infoRequestNote && (
        /* ⛔ THE KIT CALLOUT, not a second warning surface. This was a hand-rolled panel with
           its own inline `color-mix` borders and its own glyph — §K5's "one-off that
           duplicates a primitive", and the officer's note is the single most important thing
           on this page when it is present. */
        <Callout tone="warning" size="md">{app.infoRequestNote}</Callout>
      )}

      {/* The rail */}
      <div>
        <SteppedProgress steps={4} current={step} />
        <div className="mt-2 flex items-center justify-between">
          <p className="font-mono text-micro uppercase eyebrow font-bold text-text-subtle">{step + 1} / 4 · {steps[step]}</p>
        </div>
        <div className="mt-2 grid grid-cols-4 gap-1">
          {steps.map((label, i) => (
            <button key={i} type="button" onClick={() => setStep(i)} aria-current={i === step ? "step" : undefined}
              className={`min-h-[44px] rounded-md px-1 text-center text-body-sm font-semibold leading-tight ${i === step ? "bg-royal-500/20 text-text" : "text-text-subtle hover:text-text"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* STEP 1 · About you */}
      {step === 0 && (
        <section className="rounded-xl glass-panel p-4 space-y-3">
          <p className="font-display text-title-sm font-bold leading-tight">{t.agent.stepAbout}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Slot docType="CV" label={docLabel.CV} doc={docs.CV} infoRequired={infoRequired} onDone={(d) => setDocs((x) => ({ ...x, CV: d }))} maxMb={limits.maxMb} />
            <Slot docType="REQUEST_LETTER" label={docLabel.REQUEST_LETTER} doc={docs.REQUEST_LETTER} infoRequired={infoRequired} onDone={(d) => setDocs((x) => ({ ...x, REQUEST_LETTER: d }))} maxMb={limits.maxMb} />
          </div>
          <p className="text-body-sm leading-relaxed text-text-muted">{t.agent.docPhotoHint}</p>
          <p className="text-body-sm leading-relaxed text-text-muted">{app.source === "OFFICER_INVITED" ? t.agent.inviteKycNote : t.agent.docIdNote}</p>
          {identityBlocks && kycGate && <KycGatePanel state={kycGate} returnTo="/agent/apply" />}
        </section>
      )}

      {/* STEP 2 · Where you live */}
      {step === 1 && (
        <section className="rounded-xl glass-panel p-4 space-y-3">
          <p className="font-display text-title-sm font-bold leading-tight">{t.agent.stepWhere}</p>
          {/* 🔴 THIS STEP HAD NO EXPLANATION AT ALL — a heading and an upload box, and the
              applicant was never told what a Serikali ya Mtaa letter must contain or who
              issues one. It is the single most commonly rejected document in the set. */}
          <p className="text-body-sm leading-relaxed text-text-muted">{t.agent.stepWhereHelp}</p>
          <Slot docType="SERIKALI_LETTER" label={docLabel.SERIKALI_LETTER} doc={docs.SERIKALI_LETTER} infoRequired={infoRequired} onDone={(d) => setDocs((x) => ({ ...x, SERIKALI_LETTER: d }))} maxMb={limits.maxMb} />
        </section>
      )}

      {/* STEP 3 · Referees — two PAIRED cards */}
      {step === 2 && (
        <section className="space-y-3">
          {/* ⭐ WHO A REFEREE MAY BE, before the first box. The eligibility rule (not family,
              not staff) was only ever stated in the terms; an applicant who chases a letter
              from a cousin discovers that at the decision. */}
          <p className="text-body-sm leading-relaxed text-text-muted">{t.agent.refereesHelp}</p>
          {([["one", "REFEREE_ONE_LETTER", "REFEREE_ONE_ID", t.agent.refereeOne], ["two", "REFEREE_TWO_LETTER", "REFEREE_TWO_ID", t.agent.refereeTwo]] as const).map(([k, letter, id, title]) => (
            <div key={k} className="rounded-xl glass-panel p-4 space-y-3">
              <p className="font-display text-title-sm font-bold leading-tight">{title}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* ⭐ EACH FIELD NOW SAYS WHAT IT IS AND SHOWS AN EXAMPLE (management's
                    feedback, and Ali's brief). The SHAPE goes in `hint`, the RULE in `title`
                    — the same three-tier convention `id-documents.ts` sets for KYC — and the
                    placeholder is a literal example that could never be mistaken for a value
                    (finding A-5: a placeholder must never become a value). */}
                <Field label={t.agent.refName} hint={t.agent.refNameHint} error={errOf(k === "one" ? "oneName" : "twoName")} dataField={k === "one" ? "oneName" : "twoName"}>
                  <Input
                    value={k === "one" ? ref.oneName : ref.twoName}
                    onChange={(e) => { setRefSaved(false); setFieldErr(null); setRef((r) => ({ ...r, [k === "one" ? "oneName" : "twoName"]: e.target.value })); }}
                    maxLength={120} autoComplete="off" placeholder={t.agent.refNameExample} title={t.agent.refNameRule}
                  />
                </Field>
                <Field label={t.agent.refContact} hint={t.agent.refContactHint} error={errOf(k === "one" ? "oneContact" : "twoContact")} dataField={k === "one" ? "oneContact" : "twoContact"}>
                  <Input
                    value={k === "one" ? ref.oneContact : ref.twoContact}
                    onChange={(e) => { setRefSaved(false); setFieldErr(null); setRef((r) => ({ ...r, [k === "one" ? "oneContact" : "twoContact"]: e.target.value })); }}
                    maxLength={120} autoComplete="off" placeholder={t.agent.refContactExample} title={t.agent.refContactRule}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Slot docType={letter} label={docLabel[letter]} doc={docs[letter]} infoRequired={infoRequired} onDone={(d) => setDocs((x) => ({ ...x, [letter]: d }))} maxMb={limits.maxMb} />
                <Slot docType={id} label={docLabel[id]} doc={docs[id]} infoRequired={infoRequired} onDone={(d) => setDocs((x) => ({ ...x, [id]: d }))} maxMb={limits.maxMb} />
              </div>
              {/* ⭐ The applicant is uploading SOMEONE ELSE'S identity document. The admin tile
                  says "3rd party" and the terms explain the retention, but the person actually
                  handing it over was never told either. */}
              <p className="text-body-sm leading-relaxed text-text-faint">{t.agent.refIdNote}</p>
            </div>
          ))}
          <div className="rounded-xl glass-panel p-4 space-y-3">
            <Checkbox checked={ref.consented} onChange={(c) => { setRefSaved(false); setRef((r) => ({ ...r, consented: c })); }} label={<span className="text-body-sm leading-relaxed text-text">{t.agent.refConsent}</span>} />
            <p className="text-body-sm leading-relaxed text-text-subtle">{fill(t.agent.refPrivacy, { days: String(limits.refereeHoldDays) })}</p>
            <Button type="button" variant="primary" size="md" loading={refPending} disabled={refPending || refSaved}
              onClick={() => startRef(async () => {
                const fd = new FormData();
                fd.set("oneName", ref.oneName); fd.set("oneContact", ref.oneContact); fd.set("twoName", ref.twoName); fd.set("twoContact", ref.twoContact); fd.set("consent", ref.consented ? "true" : "false");
                let r: Awaited<ReturnType<typeof setRefereesAction>>;
                try { r = await setRefereesAction(fd); } catch { r = { ok: false, error: t.error.somethingDidntWork }; }
                if (!r.ok) {
                  // ⭐ ON the field, and scrolled to. The toast stays as the ANNOUNCEMENT (a
                  // screen reader needs one), but it is no longer the only place the applicant
                  // can learn what to fix.
                  if (r.field) { setFieldErr({ name: r.field, message: r.error }); focusFirstInvalid(formRef.current, [r.field]); }
                  toast({ title: t.toast.couldntSubmit, description: r.error, variant: "danger" });
                  return;
                }
                setFieldErr(null);
                setRefSaved(true); toast({ title: t.common.save, variant: "success" }); router.refresh();
              })}>
              {refSaved ? t.common.submitted : t.common.save}
            </Button>
          </div>
        </section>
      )}

      {/* STEP 4 · Payment — gold + mono, money only */}
      {step === 3 && (
        <section className="space-y-3">
          <div className="rounded-xl border border-gold-700 p-4" style={{ background: "color-mix(in oklab, var(--gold-500) 8%, var(--bg-elevated))" }}>
            <p className="font-mono text-micro uppercase eyebrow font-bold text-gold-300">{t.agent.payTitle}</p>
            {app.feeWaived ? (
              <p className="mt-2 text-body-sm leading-relaxed text-text">{t.agent.payWaived}</p>
            ) : (
              <>
                <p className="mt-2 amount text-title-lg font-bold text-gold-300">{formatTzs(fee.totalTzs)}</p>
                <p className="mt-2 text-body-sm leading-relaxed text-text">{fillNodes(t.agent.payInstruction, { amount: <span className="amount text-gold-300">{formatTzs(fee.totalTzs)}</span>, name: fee.destinationName, account: fee.destinationAccount })}</p>
              </>
            )}
          </div>
          {/* The gold block above says WHAT is owed; this says HOW to pay it without
              typing an account number. Deliberately not gold: two gold money blocks
              stacked read as two separate charges. Renders itself away when the fee is
              waived, when the operator has switched the QR off, or when the fee
              destination is not the Lipa number the QR encodes. */}
          {!app.feeWaived && <LipaQrPanel lipa={lipa} account={fee.destinationAccount} amountTzs={fee.totalTzs} />}
          {!app.feeWaived && (
            <div className="rounded-xl glass-panel p-4 space-y-3">
              <Slot docType="FEE_RECEIPT" label={docLabel.FEE_RECEIPT} doc={docs.FEE_RECEIPT} infoRequired={infoRequired} onDone={(d) => setDocs((x) => ({ ...x, FEE_RECEIPT: d }))} maxMb={limits.maxMb} />
              {/* ⭐ The RULE the server enforces (letters, numbers and dashes; 4–64) was
                  never communicated up front — only afterwards, as a toast. It is in the hint
                  now, and the placeholder is a literal example. */}
              <Field label={t.agent.payReference} hint={t.agent.payReferenceHint} error={errOf("feeReference")} dataField="feeReference">
                <Input placeholder={t.agent.payReferenceExample} title={t.agent.payReferenceRule} mono value={feeRef}
                  onChange={(e) => { setFeeSaved(false); setFieldErr(null); setFeeRef(e.target.value.toUpperCase()); }}
                  maxLength={64} autoComplete="off" inputMode="text" spellCheck={false} />
              </Field>
              <Button type="button" variant="primary" size="md" loading={feePending} disabled={feePending || feeSaved || !docs.FEE_RECEIPT}
                onClick={() => startFee(async () => {
                  const fd = new FormData(); fd.set("feeReference", feeRef);
                  let r: Awaited<ReturnType<typeof recordFeePaymentAction>>;
                  try { r = await recordFeePaymentAction(fd); } catch { r = { ok: false, error: t.error.somethingDidntWork }; }
                  if (!r.ok) {
                    /**
                     * ⭐ TRANSLATED COPY FROM A TOKEN, not from a regex over English prose.
                     * 🔴 This read `/already in use/i.test(r.error)` and `/refund/i.test(r.error)`
                     * and fell through to `r.error` — so every OTHER refusal on the money step
                     * rendered raw English into a Swahili or Chinese UI, and rewording a server
                     * sentence would have silently broken the two branches that worked.
                     */
                    const copy = r.refusal === "reference_taken" ? t.agent.payDuplicate
                      : r.refusal === "refund_owed" ? t.agent.payRefundOwed
                      : r.refusal === "receipt_missing" ? t.agent.payReceiptFirst
                      : r.refusal === "reference_format" ? t.agent.payReferenceRule
                      : r.error;
                    if (r.field) { setFieldErr({ name: r.field, message: copy }); focusFirstInvalid(formRef.current, [r.field]); }
                    toast({ title: t.toast.couldntSubmit, description: copy, variant: "danger", durationMs: 0 });
                    return;
                  }
                  setFieldErr(null);
                  setFeeSaved(true); toast({ title: t.common.save, variant: "success" }); router.refresh();
                })}>
                {feeSaved ? t.common.submitted : t.common.save}
              </Button>
            </div>
          )}

          {/* Submit — disabled WITH the list of what is missing */}
          <div className="rounded-xl glass-panel p-4 space-y-3">
            {missingNow.length > 0 && (
              <div>
                <p className="font-mono text-micro uppercase eyebrow font-bold text-text-subtle">{t.agent.missingTitle}</p>
                <ul className="mt-1.5 space-y-1 text-body-sm text-text-muted list-disc pl-4">
                  {missingNow.map((m, i) => <li key={i}>{m}</li>)}
                </ul>
              </div>
            )}
            <Checkbox checked={accept} onChange={setAccept} label={<span className="text-body-sm leading-relaxed text-text">
                {t.agent.termsAccept} · <Link href={"/legal/agent-terms" as never} className="text-brand-300 underline-offset-2 hover:underline" target="_blank">{t.agent.termsLink}</Link>
              </span>} />
            <Button type="button" variant="primary" size="lg" loading={submitPending} disabled={!canSubmit} onClick={onSubmit} leading={<I.check s={16} />}>
              {infoRequired ? t.agent.resubmit : t.agent.submit}
            </Button>
          </div>
        </section>
      )}

      {/* Step navigation — 44px taps */}
      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" size="md" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))} leading={<I.chevronLeft s={14} />}>{t.common.back}</Button>
        {step < 3 && <Button type="button" variant="primary" size="md" onClick={() => setStep((s) => Math.min(3, s + 1))} trailing={<I.arrowRight s={14} />}>{t.common.next}</Button>}
      </div>

      {result && (
        <OperationResultModal
          open={result.open}
          variant={result.variant}
          eyebrow={t.agent.applyTitle}
          title={result.title}
          subtitle={result.subtitle}
          stripTone="brand"
          primaryLabel={result.variant === "success" ? t.agent.ctaStatus : t.common.gotIt}
          onPrimary={() => { setResult(null); if (result.variant === "success") router.push("/agent/status" as never); }}
          onClose={() => { setResult(null); if (result.variant === "success") router.push("/agent/status" as never); }}
        />
      )}
    </div>
  );
}

/**
 * One slot, four states. The shape is `kyc-doc-uploader`'s — the same dashed frame, the same
 * spinner span from pick → resize → upload → done, the same `capture="environment"` — with the
 * fourth state (officer-rejected) on top. ⛔ Neutral, never gold: a document is not money.
 */
function Slot({ docType, label, doc, infoRequired, onDone, maxMb }: {
  docType: AgentDocType; label: string; doc: DocView | undefined; infoRequired: boolean;
  onDone: (d: DocView) => void; maxMb: number;
}) {
  const { t } = useT();
  const { toast } = useToast();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, start] = useTransition();
  const working = busy || pending;
  const done = !!doc && !doc.rejected;
  const rejected = !!doc?.rejected;
  // In ADDITIONAL_INFO_REQUIRED only rejected or empty slots may change.
  const locked = infoRequired && done;

  const failureCopy = (f: UploadFailure | undefined, fallback: string) =>
    f === "type" ? t.agent.errType : f === "size" ? fill(t.agent.errSize, { mb: String(maxMb) }) : f === "magic" ? t.agent.errMagic : f === "locked" ? t.agent.slotRejected : fallback || t.agent.errGeneric;

  const onFile = async (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) { toast({ title: t.toast.uploadFailed, description: t.agent.errType, variant: "danger" }); return; }
    setBusy(true);
    let dataUrl: string;
    try { dataUrl = await fileToDataUrl(f); }
    catch { setBusy(false); toast({ title: t.toast.couldntReadImage, description: t.agent.errGeneric, variant: "danger" }); return; }
    setPreview(dataUrl);
    start(async () => {
      const fd = new FormData(); fd.set("docType", docType); fd.set("image", dataUrl);
      let r: Awaited<ReturnType<typeof attachAgentDocumentAction>>;
      try { r = await attachAgentDocumentAction(fd); } catch { r = { ok: false, error: t.error.somethingDidntWork, failure: "generic" }; }
      if (!r.ok) { setPreview(null); setBusy(false); toast({ title: t.toast.uploadFailed, description: failureCopy(r.failure, r.error), variant: "danger", durationMs: 0 }); return; }
      onDone({ docType, uploadedAt: new Date().toISOString(), rejected: false, rejectReason: null, sizeBytes: Math.floor(dataUrl.length * 0.75), thirdParty: docType === "REFEREE_ONE_ID" || docType === "REFEREE_TWO_ID" });
      setBusy(false);
      toast({ title: t.toast.documentAttached, variant: "success" });
      router.refresh();
    });
  };

  const stateLabel = working ? t.agent.slotUploading : rejected ? t.agent.slotRejected : done ? t.agent.slotUploaded : t.agent.slotEmpty;

  return (
    <div className="relative">
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" aria-label={label} title={label}
        onChange={(e) => { onFile(e.target.files?.[0] ?? null); e.target.value = ""; }} />
      <button type="button" onClick={() => !locked && !working && inputRef.current?.click()} disabled={working || locked} aria-busy={working ? "true" : "false"}
        aria-label={`${label} · ${stateLabel}`}
        className={`w-full min-h-[96px] overflow-hidden rounded-md border-2 border-dashed p-3 text-center transition-colors ${
          locked ? "border-border bg-bg-overlay/30 cursor-not-allowed opacity-70"
          : working ? "border-brand-400 bg-bg-overlay/40 cursor-wait"
          : rejected ? "border-warning-500 bg-warning-500/[0.08] cursor-pointer hover:border-warning-fg"
          : done ? "border-yes-700 bg-yes-500/[0.07] cursor-pointer hover:border-yes-500"
          : "border-border bg-bg-overlay/40 hover:border-brand-400 cursor-pointer"
        }`}>
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={label} className={`mx-auto mb-1.5 h-[64px] w-auto rounded object-contain transition-opacity ${working ? "opacity-40" : ""}`} />
        ) : (
          <span className={`mx-auto mb-1.5 h-[40px] w-[40px] inline-flex items-center justify-center rounded-full ${
            rejected ? "bg-warning/15 text-warning" : done ? "bg-success/15 text-success" : "bg-bg-overlay text-text-subtle border border-border"
          }`}>
            {working ? <Spinner size={14} /> : rejected ? <I.warning s={14} /> : done ? <I.check s={14} className="g-settle" /> : <I.idCard s={14} />}
          </span>
        )}
        <span className="block font-display text-body-sm font-semibold text-text">{label}</span>
        <span className={`mt-0.5 block font-mono text-body-sm ${rejected ? "text-warning-500" : done ? "text-yes-300" : "text-text-subtle"}`}>{stateLabel}</span>
        {rejected && doc?.rejectReason && <span className="mt-1 block text-body-sm leading-snug text-text-muted">{doc.rejectReason}</span>}
        {!locked && !working && (done || rejected) && <span className="mt-1 block text-body-sm text-text-subtle">{t.agent.replace}</span>}
      </button>
    </div>
  );
}
