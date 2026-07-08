import Link from "next/link";
import { redirect } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { BackLink } from "@/components/ui/back-link";
import { PageHeader } from "@/components/ui/page-header";
import { PageHero } from "@/components/ui/page-hero";
import { FieldLegend } from "@/components/ui/field-legend";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { getKycStatus, startKyc } from "@/lib/server/kyc-service";
import { DateSelect } from "@/components/ui/date-select";
import { Input, Field as KitField } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { submitNidaAction, submitKycForReviewAction } from "./actions";
import { KycDocUploader, KycExtraDocUploader } from "@/components/profile/kyc-doc-uploader";
import { RewardBurst } from "@/components/brand/reward-burst";
import { SUPPORT_EMAIL } from "@/lib/support-config";
import { getServerT, type Dict } from "@/lib/i18n-server";

export const metadata = { title: "Verify identity" };

export default async function KycPage({ searchParams }: { searchParams?: Promise<{ welcome?: string; error?: string; nida?: string; submitted?: string; fullName?: string; dob?: string; email?: string }> }) {
  const { t } = await getServerT();
  const session = await currentSession();
  if (!session) redirect("/auth/login?next=/profile/kyc");

  try { await startKyc(session.userId); } catch { /* graceful */ }
  let kyc: Awaited<ReturnType<typeof getKycStatus>> | null = null;
  try { kyc = await getKycStatus(session.userId); } catch { /* graceful */ }
  let user: Awaited<ReturnType<typeof db.user.findById>> | null = null;
  try { user = await db.user.findById(session.userId); } catch { /* graceful */ }

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
      <BackLink fallbackHref="/profile" label={t.common.profile} />

      {sp.error && (
        <div role="alert" className="rounded-xl border border-no-700 bg-no-500/10 px-4 py-3 text-[13px] text-no-300">
          {sp.error}
        </div>
      )}
      {sp.nida === "verified" && !sp.error && (
        <div role="status" className="rounded-xl border border-yes-700 bg-yes-500/10 px-4 py-3 text-[13px] text-yes-300">
          {t.profile.kycNidaVerified}
        </div>
      )}
      {hasEmail && !emailVerified && nidaDone && (
        <div className="rounded-xl border border-gold-700 bg-gold-500/[0.06] px-4 py-3 flex items-start gap-2.5">
          <I.mail s={16} className="text-gold-300 mt-0.5 shrink-0" />
          <div className="text-[12.5px] text-text-muted leading-snug">
            <p className="font-display font-semibold text-gold-300">{t.profile.kycConfirmEmail}</p>
            <p className="mt-0.5">
              {t.profile.kycConfirmEmailBody} <span className="font-semibold text-text">{user?.email}</span>
            </p>
            <p className="mt-1.5">
              <Link href="/profile/account" className="font-mono text-[11px] text-brand-300 hover:text-brand-200 underline-offset-2 hover:underline">
                {t.profile.kycResendEmail}
              </Link>
            </p>
          </div>
        </div>
      )}
      {sp.submitted && !sp.error && (
        <div role="status" className="rounded-xl border border-yes-700 bg-yes-500/10 px-4 py-3 text-[13px] text-yes-300">
          {t.profile.kycSubmitted}
        </div>
      )}

      {isWelcome && !submitted && !nidaDone && (
        <section className="rounded-xl border border-gold-700 bg-gold-500/10 p-4 lg:p-5 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <p className="font-display text-[14px] font-bold text-gold-300">
              {t.auth.welcomeTo50pick}
            </p>
            <p className="mt-1 text-[12.5px] text-text-muted leading-snug">
              {t.profile.kycWelcomeCan + " "}<span className="font-bold text-text">{t.profile.kycWelcomeBrowse}</span>.
              {t.profile.kycWelcomeLater}
            </p>
          </div>
          <Link
            href="/markets"
            className="btn btn-gold btn-lg btn-pill whitespace-nowrap"
          >
            {t.profile.kycSkipForNow}
          </Link>
        </section>
      )}

      <PageHero glow="info">
        <PageHeader
          tone="info"
          icon={<I.shieldcheck s={14} />}
          eyebrow={t.profile.kycIdentityVerification}
          title={t.profile.verifyIdentity}
        />
        <p className="mt-2 text-[13px] text-text-muted leading-snug max-w-prose">
          {t.profile.verifyBody}
        </p>
      </PageHero>

      {rejected && (
        <section role="alert" className="rounded-xl border border-no-700 bg-no-500/[0.08] p-4 lg:p-5">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-no-500/15 text-no-300">
              <I.alertCircle s={18} />
            </span>
            <div className="min-w-0">
              <p className="font-display text-[14px] font-bold text-no-300">{t.profile.rejected}</p>
              <p className="mt-1 text-[12.5px] text-text-muted leading-snug">
                {kyc?.rejectReason ? <>{t.profile.kycRejectReason}: <span className="font-semibold text-text">{humanizeRejectReason(String(kyc.rejectReason), t)}</span>. </> : null}
                {kyc?.rejectNote ? `${kyc.rejectNote} ` : ""}
                {t.profile.kycResubmitOrEmail}{" "}
                <a href={`mailto:${SUPPORT_EMAIL()}?subject=KYC%20review`} className="text-brand-300 underline-offset-2 hover:underline">{SUPPORT_EMAIL()}</a>.
              </p>
            </div>
          </div>
        </section>
      )}

      {needsInfo && (
        <section role="status" className="rounded-xl border border-gold-700 bg-gold-500/[0.08] p-4 lg:p-5">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-500/15 text-gold-300">
              <I.info s={18} />
            </span>
            <div className="min-w-0">
              <p className="font-display text-[14px] font-bold text-gold-300">{t.profile.kycMoreInfo}</p>
              <p className="mt-1 text-[12.5px] text-text-muted leading-snug">
                {kyc?.rejectNote ? <span className="font-semibold text-text">{kyc.rejectNote}</span> : t.profile.kycMoreInfoBody1}
                {" "}{t.profile.kycMoreInfoBody2}
              </p>
            </div>
          </div>
        </section>
      )}

      {needsInfo && extraRequests.length > 0 && (
        <section className="rounded-xl glass-panel p-5 lg:p-6 space-y-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gold-500/15 text-gold-300">
              <I.fileSignature s={15} />
            </span>
            <h2 className="font-display text-[15px] font-semibold text-text">{t.profile.kycRequestedDocs}</h2>
          </div>
          <p className="text-[12.5px] text-text-muted leading-snug">
            {t.profile.kycRequestedDocsBody}
          </p>
          <div className="space-y-2">
            {extraRequests.map((rq: { id: string; description: string; storageKey: string | null }) => (
              <KycExtraDocUploader key={rq.id} requestId={rq.id} description={rq.description} attached={!!rq.storageKey} />
            ))}
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Step n={1} title={t.profile.nida}      detail={t.profile.nationalId}  done={nidaDone} active={!nidaDone} glyph="user" />
        <Step n={2} title={t.profile.documents} detail={t.profile.selfieDocs} done={docsCount >= 3} active={nidaDone && docsCount < 3} glyph="camera" />
        <Step n={3} title={t.profile.review}    detail={t.profile.complianceApproval}  done={kyc?.status === "APPROVED"} active={submitted && kyc?.status !== "APPROVED"} glyph="shieldcheck" />
      </section>

      {!nidaDone && (
        <section className="rounded-xl glass-panel p-5 lg:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-500/15 text-brand-300">
              <I.user s={15} />
            </span>
            <h2 className="font-display text-[15px] font-semibold text-text">{t.profile.step1} · {t.profile.nida}</h2>
          </div>
          <form action={submitNidaAction} className="space-y-4">
            <Field
              id="nida"
              label={t.profile.nationalId}
              hint={t.profile.nidaHint}
              type="text"
              required
              pattern="\d{20}"
              title={t.profile.nidaValidation}
              maxLength={20}
              inputMode="numeric"
              placeholder="00000000000000000000"
              defaultValue={(sp as Record<string, string | undefined>).nida ?? ""}
            />
            <Field
              id="fullName"
              label={t.profile.fullName}
              hint={t.profile.fullNameHint}
              type="text"
              required
              minLength={3}
              maxLength={100}
              defaultValue={(sp as Record<string, string | undefined>).fullName ?? ""}
            />
            <div>
              <FieldLegend as="label" htmlFor="dob" className="block mb-2">
                {t.auth.dobLabel}
              </FieldLegend>
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
                    <span className="ml-auto text-[10.5px] text-text-subtle">{t.profile.fromSignUp}</span>
                  </div>
                  <p className="mt-1.5 text-[11px] text-text-subtle">
                    {t.profile.dobFromSignUp}{" "}
                    <a href={`mailto:${SUPPORT_EMAIL()}`} className="text-brand-300 underline-offset-2 hover:underline hover:text-brand-200">{t.error.contactSupport}</a>
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
              label={t.common.email}
              hint={t.profile.emailHint}
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
            <summary className="font-display font-semibold text-text cursor-pointer flex items-center gap-2">
              <I.shieldQuestion s={14} className="text-text-subtle shrink-0" />
              {t.profile.whyWeAsk}
            </summary>
            <p className="mt-1.5 leading-snug">
              {t.profile.whyWeAskBody}
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
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-500/15 text-brand-300">
              <I.camera s={15} />
            </span>
            <h2 className="font-display text-[15px] font-semibold text-text">{t.profile.step2} · {t.profile.uploadDocuments}</h2>
          </div>
          <p className="text-[12.5px] text-text-muted leading-snug">
            {t.profile.uploadDocsBody}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <KycDocUploader label={t.profile.idFront}    docType="NIDA_FRONT" attached={hasDoc("NIDA_FRONT")} />
            <KycDocUploader label={t.profile.idBack}     docType="NIDA_BACK"  attached={hasDoc("NIDA_BACK")} />
            <KycDocUploader label={t.profile.selfie} docType="SELFIE"     attached={hasDoc("SELFIE")} />
          </div>
          <p className="text-[10.5px] text-text-subtle">
            {t.profile.tapToAttach}
          </p>
          <p className="font-mono text-[11px] font-bold tabular-nums text-text-muted">
            {docsCount}/3 {t.toast.documentAttached.toLowerCase()}{docsCount >= 3 ? ` — ${t.profile.readyToSubmit}` : ""}
          </p>
          <form action={submitKycForReviewAction}>
            {docsCount >= 3 ? (
              <SubmitButton label={t.common.confirm} pendingLabel={t.common.loading} />
            ) : (
              <>
                <button
                  type="submit"
                  disabled
                  className="btn btn-ghost btn-lg btn-pill w-full"
                >
                  {t.common.confirm}
                </button>
                <p className="mt-2 text-[11px] text-text-subtle text-center">{t.profile.attachAllThree}</p>
              </>
            )}
          </form>
        </section>
      )}

      {submitted && kyc?.status === "APPROVED" && (
        // A5 reward-burst — KYC verified is an earned-status peak, so gold is legitimate here.
        <section className="rounded-xl border border-gold-700/60 bg-bg-elevated p-5 lg:p-6 text-center">
          <RewardBurst glyph="shieldcheck" caption={t.profile.idVerified} />
          <p className="mt-3 text-[13px] text-text-muted leading-snug max-w-[400px] mx-auto">
            {t.profile.kycApprovedBody}
          </p>
        </section>
      )}
      {submitted && kyc?.status !== "APPROVED" && (
        <section className="rounded-xl border border-gold-700 bg-gold-500/10 p-5 lg:p-6 text-center space-y-3">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-gold-500/20 text-gold-300">
            <I.clock s={28} />
          </div>
          <p className="font-display text-[18px] font-bold text-gold-300">{t.profile.inReview}</p>
          <p className="text-[13px] text-text-muted leading-snug max-w-[400px] mx-auto">
            {t.profile.kycReviewingBody}
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

function Step({ n, title, detail, done, active, glyph }: { n: number; title: string; detail: string; done?: boolean; active?: boolean; glyph?: keyof typeof I }) {
  const cls =
    done   ? "border-yes-700 bg-yes-500/10"
    : active ? "border-gold-700 bg-gold-500/10"
    :          "border-border bg-bg-overlay";
  const iconCls =
    done   ? "bg-yes-500 text-yes-950"
    : active ? "bg-gold-500 text-gold-fg"
    :          "bg-bg-overlay text-text-subtle border border-border";
  const Glyph = glyph ? I[glyph] : null;
  return (
    <div className={`rounded-xl border p-3.5 ${cls}`}>
      <div className="flex items-center gap-2.5">
        <span className={`h-7 w-7 inline-flex items-center justify-center rounded-full font-mono text-[10px] font-bold shrink-0 ${iconCls}`}>
          {done ? <I.check s={14} /> : Glyph ? <Glyph s={14} /> : n}
        </span>
        <div className="min-w-0">
          <span className="font-display text-[13px] font-semibold text-text leading-tight">{title}</span>
          <p className="text-[10.5px] text-text-muted leading-snug">{detail}</p>
        </div>
      </div>
    </div>
  );
}

function humanizeRejectReason(raw: string, t: Dict): string {
  const labels: Record<string, string> = {
    NIDA_MISMATCH: t.profile.rejectNidaMismatch,
    PHOTO_UNREADABLE: t.profile.rejectBlurry,
    WRONG_DOCUMENT: t.profile.rejectWrongType,
    SELFIE_MISMATCH: t.profile.rejectSelfieMismatch,
    EXPIRED_DOCUMENT: t.profile.rejectExpired,
    DUPLICATE_ACCOUNT: t.profile.rejectDuplicate,
    UNDERAGE: t.profile.rejectUnderage,
  };
  return labels[raw] ?? raw.replace(/_/g, " ").toLowerCase();
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
