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
import { KycGatePanel, type KycGatePanelState } from "@/components/kyc/kyc-gate-panel";
import { useT } from "@/lib/i18n";
import { fill, formatNumber, formatTzs } from "@/lib/utils";
import { refusalVariant } from "@/lib/failure-reasons";
import { fileToDataUrl } from "@/lib/client/kyc-image";
import { focusFirstInvalid } from "@/lib/client/focus-first-invalid";
import type { AgentDocType } from "@/lib/server/store";
import { attachAgentDocumentAction, setRefereesAction, payFeeFromWalletAction, submitAgentApplicationAction, type UploadFailure } from "./actions";
import { fillNodes } from "@/lib/fill-nodes";
import { LipaQrPanel } from "@/components/pay/lipa-qr-panel";
import { LIPA_QR_RELEASED, type LipaDisplay } from "@/lib/lipa";

type DocView = { docType: AgentDocType; uploadedAt: string; rejected: boolean; rejectReason: string | null; sizeBytes: number; thirdParty: boolean };

type Props = {
  app: {
    id: string; status: string; source: string; feeReference: string | null; feeWaived: boolean; infoRequestNote: string | null;
    /** The fee is SETTLED -- reads the DISPOSITION, so it is true on either rail. */
    feePaid: boolean;
    feePaidFromWallet: boolean;
    referees: { oneName: string; oneContact: string; twoName: string; twoContact: string; consented: boolean };
  };
  documents: DocView[];
  /** The server's own list (`missingForSubmit`). ⭐ Its `IDENTITY` entry is what holds an INVITEE'S
   *  submit shut on identity — read, never re-derived here (2026-10-10). */
  missing: string[];
  /** The applicant's own identity for the AGENT programme, in the panel's vocabulary — null once an
   *  officer has approved the document photos and selfie (`agentIdentityPanel`, `identity-panel.ts`). ⛔ Not the
   *  withdrawal gate's state: a player's automatic typed approval is not the agent programme's — it is
   *  `photo_upgrade`, "verified; add your ID photos" (review R5.6). */
  kycGate: KycGatePanelState | null;
  /** ⛔ `destinationName` was removed 2026-09-11 — nothing consumed it, so it was pure payload
   *  crossing the server→client boundary. `destinationAccount` now arrives EMPTY while the QR
   *  is withheld: the SERVER gates it, because a gate that only stops the render still sends. */
  fee: { totalTzs: number; destinationAccount: string };
  /** Selcom merchant QR, or null when it is not configured. Rendered only when it names
   *  the SAME account as `fee.destinationAccount` — see `shouldShowLipaQr`. */
  lipa: LipaDisplay | null;
  /** The wallet rail three facts, so the step renders a GATE with the action that clears it
   *  rather than a button the server is about to refuse. `photoIdentityVerified` is the fee's
   *  identity question, asked as the service asks it: an officer approved the photos (2026-10-10). */
  walletPay: { balanceTzs: number; photoIdentityVerified: boolean; emailVerified: boolean };
  limits: { maxMb: number; refereeHoldDays: number; reviewSlaDays: number };
  /**
   * The shell's own answer for this request (`resolveSimpleJourney`, `page.tsx`). ⭐ ONE ACTION, ONE NAME (R5-G, 2026-10-09,
   * G-1's sweep — R5-B's F11): a journey reader's header carries "Weka pesa" to the deposit screen, which names itself
   * "Weka pesa" too, so the shortfall's own door to that screen says it as well — not "Ongeza fedha kwenye pochi yangu"
   * beside it. Everybody else keeps that sentence.
   */
  journey: boolean;
};

const REQUIRED: AgentDocType[] = ["CV", "REQUEST_LETTER", "SERIKALI_LETTER", "REFEREE_ONE_LETTER", "REFEREE_ONE_ID", "REFEREE_TWO_LETTER", "REFEREE_TWO_ID"];

export function ApplyClient({ app, documents, missing, kycGate, fee, lipa, walletPay, limits, journey }: Props) {
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

  /**
   * THE FEE, ON THE WALLET RAIL (Ali, 2026-09-10).
   *
   * feeSettled reads the DISPOSITION, not a typed reference: a wallet payment produces no receipt
   * and no reference, so !!app.feeReference would leave a person who has PAID looking at an
   * unfinished step. And feeDirty is gone with the text input -- there is no unsaved keystroke to
   * warn about when the only action is a button.
   */
  const [feeSettled, setFeeSettled] = useState(app.feeWaived || app.feePaid || !!app.feeReference);
  const [balanceTzs, setBalanceTzs] = useState(walletPay.balanceTzs);
  const [feePending, startFee] = useTransition();
  // The two doors the FEE PAYMENT holds shut, in the SAME ORDER the server asks them -- identity,
  // then email -- so a person cannot clear the one it names and then be refused for the other.
  // 2026-09-13: these were "the two doors DEPOSIT holds shut"; since 2026-10-07 a deposit asks neither.
  // Both doors here are the agent programme's own requirements, kept by those rulings (payFeeFromWallet).
  // 2026-10-10: the identity door is an officer's approval of the photos -- the service's own question.
  const kycBlocks = !app.feeWaived && !feeSettled && !walletPay.photoIdentityVerified;
  const emailBlocks = !app.feeWaived && !feeSettled && walletPay.photoIdentityVerified && !walletPay.emailVerified;
  const canAfford = balanceTzs >= fee.totalTzs;

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
  // ⭐ EXCEPT THE INVITEE'S OWN IDENTITY, which this page cannot change and so takes from the server's
  // list (`missing`, `missingForSubmit`): a PHOTO case sent is enough -- it is decided with the
  // application at approval -- and typed details are not (2026-10-10). This read `kycGate !==
  // "pending_review"`, which a typed case with an officer also answers, so the button would have opened
  // on a submit the server then refuses.
  const identityBlocks = app.source === "OFFICER_INVITED" && missing.includes("IDENTITY");
  const missingNow = useMemo(() => {
    const m: string[] = [];
    for (const s of REQUIRED) if (!docs[s] || docs[s]!.rejected) m.push(docLabel[s]);
    if (!refSaved) m.push(t.agent.missingReferees);
    // The invitee's own identity: a photo case SENT is enough (decided with the application at approval).
    if (identityBlocks) m.push(t.agent.missingIdentity);
    /**
     * ONE ENTRY, NOT TWO -- and dropping the other two was only safe alongside the pay button.
     *
     * This required a FEE RECEIPT and a typed REFERENCE. Neither exists on the wallet rail, so
     * canSubmit could never become true and a paid applicant was stuck. But removing them WITHOUT
     * shipping the payment control in the same change would have been worse than the bug it
     * fixes: this list is the only thing between an unpaid applicant and submitForReview, so the
     * two edits are ONE atomic change and must never be split.
     */
    if (!app.feeWaived && !feeSettled) m.push(t.agent.missingFeePayment);
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docs, refSaved, feeSettled, app.feeWaived, missing, identityBlocks]);
  const canSubmit = missingNow.length === 0 && accept && !submitPending;

  const steps = [t.agent.stepAbout, t.agent.stepWhere, t.agent.stepReferees, t.agent.stepPayment];

  const onSubmit = () => {
    startSubmit(async () => {
      const fd = new FormData();
      fd.set("acceptTerms", "true");
      let r: Awaited<ReturnType<typeof submitAgentApplicationAction>>;
      try { r = await submitAgentApplicationAction(fd); } catch { r = { ok: false, error: t.error.somethingDidntWork }; }
      // ⭐ R8-D (2026-10-10) · a break that began after this form was opened: the programme's own sentence, in the reader's
      // language, under "Couldn't submit" (a refusal, never "something didn't work" — a break is the tool working).
      if (!r.ok && r.refusal === "rg_locked") { setResult({ open: true, variant: "danger", title: t.toast.couldntSubmit, subtitle: t.agent.stateRgLocked }); return; }
      if (!r.ok) { setResult({ open: true, variant: "danger", title: t.error.somethingDidntWork, subtitle: r.error }); return; }
      setResult({ open: true, variant: "success", title: t.agent.submittedTitle, subtitle: fill(t.agent.submittedBody, { days: String(limits.reviewSlaDays) }) });
    });
  };

  return (
    <div ref={formRef} className="space-y-5">
      <UnsavedChangesGuard dirty={refDirty} title={t.agent.unsavedTitle} body={t.agent.unsavedBody} />

      {/* Title row + the persistent counter */}
      <div className="flex items-center justify-between gap-3">
        <p className="font-display text-title-md font-bold leading-none">{t.agent.applyTitle}</p>
        <Chip variant={attached === REQUIRED.length ? "success" : "pending"}>{fill(t.agent.attachedCount, { n: formatNumber(attached), total: formatNumber(REQUIRED.length) })}</Chip>
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
          {identityBlocks && kycGate && <KycGatePanel state={kycGate} purpose="agent" returnTo="/agent/apply" />}
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
                  /* ⭐ IN THE APPLICANT'S LANGUAGE (2026-10-08). The service's refusals are English sentences, and they
                     were shown as they came, in the toast and on the box, to a Swahili or Chinese applicant
                     (`test:failure-reasons` §10). Each refusal names its field, and the dictionary already holds each
                     field's rule (the boxes' own `title`), so the field picks the line. A refusal with no field is the
                     application's state (not started, under review, closed): the page is read again, and it says which. */
                  const said = r.field === "oneName" || r.field === "twoName" ? t.agent.refNameRule
                    : r.field === "oneContact" || r.field === "twoContact" ? t.agent.refContactRule
                    : r.field === "consent" ? t.agent.refConsentRule
                    : t.error.somethingDidntWork;
                  // ⭐ ON the field, and scrolled to. The toast stays as the ANNOUNCEMENT (a
                  // screen reader needs one), but it is no longer the only place the applicant
                  // can learn what to fix.
                  if (r.field) { setFieldErr({ name: r.field, message: said }); focusFirstInvalid(formRef.current, [r.field]); }
                  else router.refresh();
                  // §F2/§F3 (R5-I): a referee field the applicant can correct is the calm `factual` toast; anything else `danger`.
                  toast({ title: t.toast.couldntSubmit, description: said, variant: r.field ? "factual" : "danger" });
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

      {/* STEP 4 · Payment — mono, in the text's own ink: the fee is money the applicant PAYS, which earns nothing (§M3a
          D1), and gold is money earned and nothing else (Q5). The same box as /agent's fee (R5-C, 2026-10-09). */}
      {step === 3 && (
        <section className="space-y-3">
          <div className="rounded-xl glass-panel p-4">
            <p className="font-mono text-micro uppercase eyebrow font-bold text-text-subtle">{t.agent.payTitle}</p>
            {app.feeWaived ? (
              <p className="mt-2 text-body-sm leading-relaxed text-text">{t.agent.payWaived}</p>
            ) : feeSettled ? (
              <p className="mt-2 text-body-sm leading-relaxed text-text">{t.agent.payPaidFromWallet}</p>
            ) : (
              <>
                <p className="mt-2 amount text-title-lg font-bold text-text">{formatTzs(fee.totalTzs)}</p>
                {/* NO BANK INSTRUCTION. The rail is the applicant own wallet (Ali, 2026-09-10),
                    so there is no destination account to quote and nothing to upload. */}
                <p className="mt-2 text-body-sm leading-relaxed text-text">{fillNodes(t.agent.payFromWalletBody, { amount: <span className="amount font-semibold">{formatTzs(fee.totalTzs)}</span> })}</p>
                <p className="mt-3 font-mono text-body-sm text-text-subtle">
                  {t.agent.payWalletBalance}: <span className="amount text-text">{formatTzs(balanceTzs)}</span>
                </p>
              </>
            )}
          </div>
          {/* The block above says WHAT is owed; this says HOW to pay it without
              typing an account number. Two money blocks stacked in one emphasis
              read as two separate charges. Renders itself away when the fee is
              waived, when the operator has switched the QR off, or when the fee
              destination is not the Lipa number the QR encodes. */}
          {/* GATED AT THE CALL SITE -- PSC-02, same reasoning as /agent/page.tsx. The panel
              returning null does not stop its props reaching the browser. The QR machinery is
              untouched: flip LIPA_QR_RELEASED and this comes back by itself. */}
          {!app.feeWaived && LIPA_QR_RELEASED && <LipaQrPanel lipa={lipa} account={fee.destinationAccount} amountTzs={fee.totalTzs} />}
          {/* PAY IT FROM THE WALLET -- and GATE THE OFFER, never the refusal.

              Paying from a wallet asks two things NOT enforced at the agent door: identity APPROVED
              (a self-service applicant always has it, but an OFFICER_INVITED one is deliberately
              exempt) and a verified email (checked nowhere upstream). Under the old out-of-band
              rail neither could strand anybody. Under this one an unverified invitee cannot pay,
              and -- before this -- was told nothing. (2026-09-13: identity is no longer a deposit
              precondition. The fee payment keeps it as the agent programme's own requirement, so
              an invitee may hold a funded wallet and still meet this panel.)
              (2026-10-10: "identity APPROVED" here means an officer approved the document photos and
              selfie. A player's typed details are approved automatically now, and that approval does
              not open this door -- the panel says which step is left, from the agent programme's view.)

              So each door renders the GATE and the ACTION THAT CLEARS IT, in the SAME ORDER the
              server asks them, so a person cannot fix the thing they were told about and then be
              refused for another. That ordering rule is wallet/deposit/page.tsx, and the defect
              it records (E-5, "contradicted twice within one screen") is the one being avoided. */}
          {!app.feeWaived && !feeSettled && (
            <div className="rounded-xl glass-panel p-4 space-y-3">
              {kycBlocks ? (
                /* returnTo brings them BACK to the wizard, and the step they land on is
                   recomputed from what is missing -- which is this one. */
                <KycGatePanel state={kycGate ?? "not_started"} purpose="agent" returnTo="/agent/apply" />
              ) : emailBlocks ? (
                <div className="space-y-2">
                  <p className="text-body-sm leading-relaxed text-text">{t.agent.payEmailFirst}</p>
                  <Button type="button" variant="secondary" size="md" onClick={() => router.push("/profile" as never)}>
                    {t.common.continue}
                  </Button>
                </div>
              ) : !canAfford ? (
                /* THE SHORTFALL IS NAMED, not left to arithmetic. The top-up link is a plain
                   navigation: the deposit rail has NO return-URL contract (filed as PSC-01), so
                   nothing carries them back automatically -- the hint says the application is
                   saved, and firstMissingStep returns them here because the fee is all that is
                   outstanding. */
                <div className="space-y-2">
                  {/* The number keeps the money ladder even inside a sentence: mono +
                      tabular figures, per T5/M4. A formatted amount in prose without it is a
                      digit that jumps when the value changes -- test:type-scale holds this. */}
                  <p className="text-body-sm leading-relaxed text-text">
                    {fillNodes(t.agent.payShortfall, { amount: <span className="font-mono tabular-nums">{formatTzs(Math.max(0, fee.totalTzs - balanceTzs))}</span> })}
                  </p>
                  <p className="text-body-sm leading-relaxed text-text-muted">{t.agent.payTopUpHint}</p>
                  <Button type="button" variant="primary" size="md" onClick={() => router.push("/wallet/deposit" as never)}>
                    {journey ? t.journey.depositAction : t.agent.payTopUp}
                  </Button>
                </div>
              ) : (
                <Button type="button" variant="primary" size="md" loading={feePending} disabled={feePending}
                  onClick={() => startFee(async () => {
                    let r: Awaited<ReturnType<typeof payFeeFromWalletAction>>;
                    try { r = await payFeeFromWalletAction(); } catch { r = { ok: false, error: t.error.somethingDidntWork }; }
                    if (!r.ok) {
                      /* TRANSLATED COPY FROM A TOKEN, not a regex over English prose -- the defect
                         this form already shipped once (/refund/i.test(r.error)), which put raw
                         English into a Swahili UI for every unhandled refusal. */
                      // R8-D (2026-10-10) · `rg_locked`: a break or a self-exclusion — the programme's own sentence.
                      const copy = r.refusal === "rg_locked" ? t.agent.stateRgLocked
                        : r.refusal === "refund_owed" ? t.agent.payRefundOwed
                        : r.refusal === "kyc_required" ? t.agent.payKycFirst
                        : r.refusal === "email_unverified" ? t.agent.payEmailFirst
                        : r.refusal === "insufficient_balance" ? fill(t.agent.payShortfall, { amount: formatTzs(r.shortfallTzs ?? 0) })
                        : r.refusal === "wallet_unavailable" ? t.agent.payWalletUnavailable
                        : r.error;
                      // A refusal that arrived because the balance moved under them updates the
                      // figure on screen, so the next thing they read is true.
                      if (r.refusal === "insufficient_balance" && r.shortfallTzs !== undefined) {
                        setBalanceTzs(Math.max(0, fee.totalTzs - r.shortfallTzs));
                      }
                      // §F2/§F3 (R5-I): still sticky (money), at the registry's rank for each refusal — a short balance and an
                      // unconfirmed address the applicant can fix (`factual`); a refund owed, an identity check, a wallet fault `danger`
                      // — and a break (R8-D), which they cannot lift, at the registry's rank for one (`cooling_off`: `danger`).
                      toast({ title: t.toast.couldntSubmit, description: copy, variant: r.refusal === "insufficient_balance" ? refusalVariant("balance_insufficient") : r.refusal === "email_unverified" ? refusalVariant("email_unverified") : "danger", durationMs: 0 });
                      return;
                    }
                    setFieldErr(null);
                    setFeeSettled(true); setBalanceTzs((b) => Math.max(0, b - fee.totalTzs));
                    toast({ title: t.agent.payPaidFromWallet, variant: "success" });
                    router.refresh();
                  })}>
                  {fill(t.agent.payNowFromWallet, { amount: formatTzs(fee.totalTzs) })}
                </Button>
              )}
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
    // §F2/§F3 (R5-I): a file that is not a photo, or one the phone could not read, is a slip — the calm `factual` toast.
    if (!f.type.startsWith("image/")) { toast({ title: t.toast.uploadFailed, description: t.agent.errType, variant: "factual" }); return; }
    setBusy(true);
    let dataUrl: string;
    try { dataUrl = await fileToDataUrl(f); }
    catch { setBusy(false); toast({ title: t.toast.couldntReadImage, description: t.agent.errGeneric, variant: "factual" }); return; }
    setPreview(dataUrl);
    start(async () => {
      const fd = new FormData(); fd.set("docType", docType); fd.set("image", dataUrl);
      let r: Awaited<ReturnType<typeof attachAgentDocumentAction>>;
      try { r = await attachAgentDocumentAction(fd); } catch { r = { ok: false, error: t.error.somethingDidntWork, failure: "generic" }; }
      if (!r.ok) { setPreview(null); setBusy(false); toast({ title: t.toast.uploadFailed, description: failureCopy(r.failure, r.error), variant: r.failure && r.failure !== "generic" ? "factual" : "danger", durationMs: 0 }); return; }
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
          // An uploaded slot is the KYC uploader's done tile, the success family (§B2a; R5-I, 2026-10-09).
          : done ? "border-success-border bg-success-500/[0.07] cursor-pointer hover:border-success-500"
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
        {/* The word in its family's INK, as `done`'s is (`text-success-fg`): `text-warning-500` was the amber stop, worn
            while the ink was gilt (Ali's ruling (1) of 2026-10-10 made the family amber; R8-A). */}
        <span className={`mt-0.5 block font-mono text-body-sm ${rejected ? "text-warning-fg" : done ? "text-success-fg" : "text-text-subtle"}`}>{stateLabel}</span>
        {rejected && doc?.rejectReason && <span className="mt-1 block text-body-sm leading-snug text-text-muted">{doc.rejectReason}</span>}
        {!locked && !working && (done || rejected) && <span className="mt-1 block text-body-sm text-text-subtle">{t.agent.replace}</span>}
      </button>
    </div>
  );
}
