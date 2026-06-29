import Link from "next/link";
import { redirect } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { FiftyMark } from "@/components/brand";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { getKycStatus, startKyc } from "@/lib/server/kyc-service";
import { DateSelect } from "@/components/ui/date-select";
import { Input, Field as KitField } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { submitNidaAction, submitKycForReviewAction } from "./actions";
import { KycDocUploader, KycExtraDocUploader } from "@/components/profile/kyc-doc-uploader";
import { SUPPORT_EMAIL } from "@/lib/support-config";
import { getServerT } from "@/lib/i18n-server";

export const metadata = { title: "Verify identity" };

export default async function KycPage({ searchParams }: { searchParams?: Promise<{ welcome?: string; error?: string; nida?: string; submitted?: string; fullName?: string; dob?: string; email?: string }> }) {
  const { t } = await getServerT();
  const session = await currentSession();
  if (!session) redirect("/auth/login?next=/profile/kyc");

  await startKyc(session.userId);
  const kyc = await getKycStatus(session.userId);
  const user = await db.user.findById(session.userId);

  const sp = (await searchParams) ?? {};
  const isWelcome = sp.welcome === "new";
  const nidaDone = !!kyc?.nidaVerifiedAt;
  const hasEmail = !!user?.email;
  const emailVerified = !!user?.emailVerifiedAt;
  const docsCount = kyc?.documents.length ?? 0;
  const hasDoc = (dt: string) => (kyc?.documents ?? []).some((d: { docType: string }) => d.docType === dt);
  const submitted = kyc?.status === "PENDING_REVIEW" || kyc?.status === "APPROVED";
  const rejected = kyc?.status === "REJECTED";
  const needsInfo = kyc?.status === "ADDITIONAL_INFO_REQUIRED";
  const extraRequests = kyc?.extraRequests ?? [];

  return (
    <main className="mx-auto max-w-[640px] px-3 lg:px-6 py-6 space-y-5">
      <Link
        href="/profile"
        className="inline-flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-[0.16em] text-text-subtle hover:text-text"
      >
        <I.chevronLeft s={14} />
        {t.common.profile}
      </Link>

      {sp.error && (
        <div role="alert" className="rounded-xl border border-no-700 bg-no-500/10 px-4 py-3 text-[13px] text-no-300">
          {sp.error}
        </div>
      )}
      {sp.nida === "verified" && !sp.error && (
        <div role="status" className="rounded-xl border border-yes-700 bg-yes-500/10 px-4 py-3 text-[13px] text-yes-300">
          {"NIDA verified — now attach your documents below." /* i18n-todo: kycNidaVerifiedAttachDocs */}
        </div>
      )}
      {hasEmail && !emailVerified && nidaDone && (
        <div className="rounded-xl border border-gold-700 bg-gold-500/[0.06] px-4 py-3 flex items-start gap-2.5">
          <I.mail s={16} className="text-gold-300 mt-0.5 shrink-0" />
          <div className="text-[12.5px] text-text-muted leading-snug">
            <p className="font-display font-semibold text-gold-300">{"Confirm your email" /* i18n-todo: kycConfirmEmail */}</p>
            <p className="mt-0.5">
              {"We sent a confirmation link to " /* i18n-todo: kycConfirmEmailSent */}<span className="font-semibold text-text">{user?.email}</span>.
              {"Check your inbox and click the link so we can send you verification results, receipts, and password resets. The link expires in 24 hours." /* i18n-todo: kycConfirmEmailBody */}
            </p>
            <p className="mt-1.5">
              <Link href="/profile/account" className="font-mono text-[11px] text-brand-300 hover:text-brand-200 underline-offset-2 hover:underline">
                {"Didn\u2019t get it? Resend from your account page \u2192" /* i18n-todo: kycResendEmail */}
              </Link>
            </p>
          </div>
        </div>
      )}
      {sp.submitted && !sp.error && (
        <div role="status" className="rounded-xl border border-yes-700 bg-yes-500/10 px-4 py-3 text-[13px] text-yes-300">
          {"Submitted for review. We\u2019ll notify you when it\u2019s decided." /* i18n-todo: kycSubmittedForReview */}
        </div>
      )}

      {isWelcome && !submitted && !nidaDone && (
        <section className="rounded-xl border border-gold-700 bg-gold-500/10 p-4 lg:p-5 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <p className="font-display text-[14px] font-bold text-gold-300">
              {t.auth.welcomeTo50pick}
            </p>
            <p className="mt-1 text-[12.5px] text-text-muted leading-snug">
              {"You can " /* i18n-todo: kycWelcomeCanBrowse */}<span className="font-bold text-text">{"browse markets and place bets right away" /* i18n-todo */}</span>.
              {"Verify your identity later \u2014 withdrawals unlock once KYC is approved." /* i18n-todo: kycWelcomeVerifyLater */}
            </p>
          </div>
          <Link
            href="/markets"
            className="btn btn-gold btn-lg whitespace-nowrap"
            style={{ borderRadius: "var(--r-pill)" }}
          >
            {"Skip for now" /* i18n-todo: kycSkipForNow */}
          </Link>
        </section>
      )}

      <header className="relative overflow-hidden rounded-xl border border-border bg-bg-elevated">
        <div
          className="absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(800px 320px at 100% 0%, oklch(45% 0.10 240 / 0.18), transparent 60%), " +
              "linear-gradient(135deg, oklch(22% 0.140 268) 0%, oklch(30% 0.165 268) 100%)",
          }}
        />
        <div className="absolute -right-6 -top-6 opacity-[0.06]" aria-hidden>
          <FiftyMark size={180} />
        </div>
        <div className="relative z-10 p-5 lg:p-6">
          <div className="flex items-center gap-2 mb-1">
            <I.shieldcheck s={14} />
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-info-fg">
              {"Identity verification" /* i18n-todo: kycIdentityVerification */}
            </p>
          </div>
          <h1 className="font-display text-[26px] lg:text-[28px] font-bold text-text leading-tight tracking-[-0.02em]">
            {t.profile.verifyIdentity}
          </h1>
          <p className="mt-2 text-[13px] text-text-muted leading-snug max-w-prose">
            {t.profile.verifyBody}
          </p>
        </div>
      </header>

      {rejected && (
        <section role="alert" className="rounded-xl border border-no-700 bg-no-500/[0.08] p-4 lg:p-5">
          <div className="flex items-start gap-2.5">
            <I.alertCircle s={18} />
            <div className="min-w-0">
              <p className="font-display text-[14px] font-bold text-no-300">{t.profile.rejected}</p>
              <p className="mt-1 text-[12.5px] text-text-muted leading-snug">
                {kyc?.rejectReason ? <>{"Reason: " /* i18n-todo: kycRejectReasonLabel */}<span className="font-semibold text-text">{humanizeRejectReason(String(kyc.rejectReason))}</span>. </> : null}
                {kyc?.rejectNote ? `${kyc.rejectNote} ` : ""}
                {"Please re-enter your details below and resubmit, or email " /* i18n-todo: kycResubmitOrEmail */}
                <a href={`mailto:${SUPPORT_EMAIL()}?subject=KYC%20review`} className="text-brand-300 underline-offset-2 hover:underline">{SUPPORT_EMAIL()}</a>.
              </p>
            </div>
          </div>
        </section>
      )}

      {needsInfo && (
        <section role="status" className="rounded-xl border border-gold-700 bg-gold-500/[0.08] p-4 lg:p-5">
          <div className="flex items-start gap-2.5">
            <I.alertCircle s={18} />
            <div className="min-w-0">
              <p className="font-display text-[14px] font-bold text-gold-300">{"More information needed" /* i18n-todo: kycMoreInfoNeeded */}</p>
              <p className="mt-1 text-[12.5px] text-text-muted leading-snug">
                {kyc?.rejectNote ? <span className="font-semibold text-text">{kyc.rejectNote}</span> : "Our team needs a clearer or additional document." /* i18n-todo: kycNeedsClearerDoc */}
                {" "}{"Update the document(s) below and submit again \u2014 this isn\u2019t a rejection." /* i18n-todo: kycUpdateAndResubmit */}
              </p>
            </div>
          </div>
        </section>
      )}

      {needsInfo && extraRequests.length > 0 && (
        <section className="rounded-xl glass-panel p-5 lg:p-6 space-y-3">
          <div className="flex items-center gap-2">
            <I.shieldcheck s={18} />
            <h2 className="font-display text-[15px] font-semibold text-text">{"Requested documents" /* i18n-todo: kycRequestedDocs */}</h2>
          </div>
          <p className="text-[12.5px] text-text-muted leading-snug">
            {"Our team asked for the following. Attach each, then submit again below." /* i18n-todo: kycRequestedDocsBody */}
          </p>
          <div className="space-y-2">
            {extraRequests.map((rq: { id: string; description: string; storageKey: string | null }) => (
              <KycExtraDocUploader key={rq.id} requestId={rq.id} description={rq.description} attached={!!rq.storageKey} />
            ))}
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Step n={1} title={t.profile.nida}      detail={t.profile.nationalId}  done={nidaDone} active={!nidaDone} />
        <Step n={2} title={"Documents" /* i18n-todo: kycDocuments */} detail={t.profile.selfieDocs} done={docsCount >= 3} active={nidaDone && docsCount < 3} />
        <Step n={3} title={"Review" /* i18n-todo: kycReview */}    detail={"Compliance approval" /* i18n-todo: kycComplianceApproval */}  done={kyc?.status === "APPROVED"} active={submitted && kyc?.status !== "APPROVED"} />
      </section>

      {!nidaDone && (
        <section className="rounded-xl glass-panel p-5 lg:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <I.shieldcheck s={18} />
            <h2 className="font-display text-[15px] font-semibold text-text">{"Step 1" /* i18n-todo: kycStep1 */} · {t.profile.nida}</h2>
          </div>
          <form action={submitNidaAction} className="space-y-4">
            <Field
              id="nida"
              label={t.profile.nationalId}
              hint={"20 digits, exactly as on your card" /* i18n-todo: kycNidaHint */}
              type="text"
              required
              pattern="\d{20}"
              title={"NIDA number must be exactly 20 digits (numbers only)" /* i18n-todo: kycNidaValidation */}
              maxLength={20}
              inputMode="numeric"
              placeholder="00000000000000000000"
              defaultValue={(sp as Record<string, string | undefined>).nida ?? ""}
            />
            <Field
              id="fullName"
              label={"Full name" /* i18n-todo: kycFullName */}
              hint={"As printed on the NIDA card" /* i18n-todo: kycFullNameHint */}
              type="text"
              required
              minLength={3}
              maxLength={100}
              defaultValue={(sp as Record<string, string | undefined>).fullName ?? ""}
            />
            <div>
              <label htmlFor="dob" className="block font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-subtle mb-2">
                {t.auth.dobLabel}
              </label>
              {user?.dob ? (
                // Already collected (and 18+ gated) at sign-up — don't make the
                // user type it again. Show it read-only for confirmation and
                // submit the stored value. NORMALISE to YYYY-MM-DD: prod stores
                // dob as a Prisma DateTime, read back as a full ISO string
                // ("1990-01-15T00:00:00.000Z"); the KYC validator only accepts
                // YYYY-MM-DD, so the raw ISO was being rejected ("Use YYYY-MM-DD").
                <>
                  <input type="hidden" name="dob" value={user.dob.slice(0, 10)} />
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-bg-elevated px-3.5 py-2.5">
                    <I.check s={14} className="text-yes-300 shrink-0" />
                    <span className="font-mono text-[13px] text-text">{user.dob.slice(0, 10)}</span>
                    <span className="ml-auto text-[10.5px] text-text-subtle">{"From sign-up" /* i18n-todo: add profile.fromSignUp key */}</span>
                  </div>
                  <p className="mt-1.5 text-[11px] text-text-subtle">
                    {"Taken from your account — no need to re-enter. Wrong?" /* i18n-todo: add profile.dobFromSignUp key */}{" "}
                    <a href={`mailto:${SUPPORT_EMAIL()}`} className="text-brand-300 underline-offset-2 hover:underline hover:text-brand-200">{t.error.contactSupport}</a>{" "}{"before verifying." /* i18n-todo */}
                  </p>
                </>
              ) : (
                <>
                  <DateSelect
                    name="dob"
                    id="dob"
                    required
                    min="1930-01-01"
                    max={new Date(new Date().getFullYear() - 18, new Date().getMonth(), new Date().getDate()).toISOString().slice(0, 10)}
                  />
                  <p className="mt-1.5 text-[11px] text-text-subtle">{t.auth.dobHint}</p>
                </>
              )}
            </div>
            <Field
              id="email"
              label={"Email" /* i18n-todo: add common.email key */}
              hint={"Required — we email you the verification result and receipts here." /* i18n-todo: add profile.emailHint key */}
              type="email"
              required
              maxLength={254}
              inputMode="text"
              placeholder="you@example.com"
              defaultValue={(sp as Record<string, string | undefined>).email ?? ""}
            />
            <SubmitButton label={`${t.profile.continueVerification}`} pendingLabel={t.common.loading} />
          </form>
          <details className="border-t border-border pt-3 text-[12.5px] text-text-muted">
            <summary className="font-display font-semibold text-text cursor-pointer">
              {"Why we ask" /* i18n-todo: add profile.whyWeAsk key */}
            </summary>
            <p className="mt-1.5 leading-snug">
              {"The Gaming Board of Tanzania requires identity verification for every account that wagers real money. Your NIDA is checked against the National Identification Authority. We never share your number with third parties." /* i18n-todo: add profile.whyWeAskBody key */}
            </p>
          </details>
        </section>
      )}

      {nidaDone && !submitted && (
        <section className="rounded-xl glass-panel p-5 lg:p-6 space-y-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-pill border border-yes-700 bg-yes-500/10 px-2.5 py-0.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.1em] text-yes-300">
              <I.check s={11} />
              {t.profile.idVerified}
            </span>
          </div>
          <h2 className="font-display text-[15px] font-semibold text-text">{"Step 2" /* i18n-todo */} · {"Upload documents" /* i18n-todo: add profile.uploadDocuments key */}</h2>
          <p className="text-[12.5px] text-text-muted leading-snug">
            {"We need a clear photo of the front, the back of your NIDA card, and a selfie holding the card." /* i18n-todo: add profile.uploadDocsBody key */}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <KycDocUploader label={"ID front" /* i18n-todo */}    docType="NIDA_FRONT" attached={hasDoc("NIDA_FRONT")} />
            <KycDocUploader label={"ID back" /* i18n-todo */}     docType="NIDA_BACK"  attached={hasDoc("NIDA_BACK")} />
            <KycDocUploader label={"Selfie" /* i18n-todo */} docType="SELFIE"     attached={hasDoc("SELFIE")} />
          </div>
          <p className="text-[10.5px] text-text-subtle">
            {"Tap each card to attach a photo, then submit for compliance review." /* i18n-todo: add profile.tapToAttach key */}
          </p>
          <p className="font-mono text-[11px] font-bold tabular-nums text-text-muted">
            {docsCount}/3 {t.toast.documentAttached.toLowerCase()}{docsCount >= 3 ? ` — ${"ready to submit" /* i18n-todo */}` : ""}
          </p>
          <form action={submitKycForReviewAction}>
            {docsCount >= 3 ? (
              <SubmitButton label={t.common.confirm} pendingLabel={t.common.loading} />
            ) : (
              <>
                <button
                  type="submit"
                  disabled
                  className="btn btn-ghost btn-lg w-full"
                  style={{ borderRadius: "var(--r-pill)" }}
                >
                  {t.common.confirm}
                </button>
                <p className="mt-2 text-[11px] text-text-subtle text-center">{"Attach all three documents to submit." /* i18n-todo: add profile.attachAllThree key */}</p>
              </>
            )}
          </form>
        </section>
      )}

      {submitted && (
        <section className="rounded-xl border border-gold-700 bg-gold-500/10 p-5 lg:p-6 text-center space-y-2">
          <p className="font-display text-[16px] font-bold text-gold-300">
            {kyc?.status === "APPROVED" ? t.profile.idVerified : t.profile.inReview}
          </p>
          <p className="text-[12.5px] text-text-muted leading-snug">
            {kyc?.status === "APPROVED"
              ? "You can now deposit and withdraw freely." /* i18n-todo: add profile.kycApprovedBody key */
              : "Compliance is reviewing. Most reviews finish within 2 hours during business hours." /* i18n-todo: add profile.kycReviewingBody key */}
          </p>
        </section>
      )}

      <div className="flex items-center justify-between pt-1">
        <Link
          href="/profile"
          className="font-mono text-[12px] uppercase tracking-[0.14em] text-text-subtle hover:text-text"
        >
          ← {t.common.profile}
        </Link>
        <Link
          href="/wallet"
          className="font-display text-[13px] font-semibold text-gold-300 hover:text-gold-200 transition-colors"
        >
          {t.common.deposit} → {t.common.wallet}
        </Link>
      </div>
    </main>
  );
}

function Step({ n, title, detail, done, active }: { n: number; title: string; detail: string; done?: boolean; active?: boolean }) {
  const cls =
    done   ? "border-yes-700 bg-yes-500/10"
    : active ? "border-gold-700 bg-gold-500/10"
    :          "border-border bg-bg-overlay";
  const numCls =
    done   ? "bg-yes-500 text-yes-950"
    : active ? "bg-gold-500 text-gold-fg"
    :          "bg-bg-overlay text-text-subtle border border-border";
  return (
    <div className={`rounded-md border p-3 ${cls}`}>
      <div className="flex items-center gap-2">
        <span className={`h-5 w-5 inline-flex items-center justify-center rounded-pill font-mono text-[10px] font-bold ${numCls}`}>
          {done ? <I.check s={11} /> : n}
        </span>
        <span className="font-display text-[12px] font-semibold text-text">{title}</span>
      </div>
      <p className="mt-1 text-[11px] text-text-muted">{detail}</p>
    </div>
  );
}

/* i18n-todo: move REJECT_LABELS into the dict under profile.rejectLabels.* */
const REJECT_LABELS: Record<string, string> = {
  NIDA_MISMATCH: "NIDA details don't match our records",
  PHOTO_UNREADABLE: "ID photo is too blurry or dark",
  WRONG_DOCUMENT: "Wrong type of document uploaded",
  SELFIE_MISMATCH: "Selfie doesn't match the ID photo",
  EXPIRED_DOCUMENT: "The ID document has expired",
  DUPLICATE_ACCOUNT: "Another account is using this NIDA",
  UNDERAGE: "Date of birth shows under 18",
};

function humanizeRejectReason(raw: string): string {
  return REJECT_LABELS[raw] ?? raw.replace(/_/g, " ").toLowerCase();
}

// Delegates to the kit <Input>/<Field> atoms so this player-facing form matches
// the rest of the platform (brand focus ring — NOT admin-focus — shared height,
// --bg-inset background). Keeps the same call signature so every call site is
// untouched.
function Field({
  id, label, hint, type, pattern, inputMode, placeholder,
  required: req = true, minLength, maxLength, min, max, title, defaultValue,
}: {
  id: string; label: string; hint?: string; type: string;
  pattern?: string; inputMode?: "numeric" | "text"; placeholder?: string;
  required?: boolean; minLength?: number; maxLength?: number; min?: string; max?: string;
  title?: string; defaultValue?: string;
}) {
  return (
    <KitField label={label} hint={hint}>
      <Input
        id={id}
        name={id}
        type={type}
        pattern={pattern}
        inputMode={inputMode}
        placeholder={placeholder}
        required={req}
        minLength={minLength}
        maxLength={maxLength}
        min={min}
        max={max}
        title={title}
        defaultValue={defaultValue}
        mono
      />
    </KitField>
  );
}
