import Link from "next/link";
import { redirect } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { FiftyMark } from "@/components/brand";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { getKycStatus, startKyc } from "@/lib/server/kyc-service";
import { DateSelect } from "@/components/ui/date-select";
import { SubmitButton } from "@/components/ui/submit-button";
import { submitNidaAction, submitKycForReviewAction } from "./actions";
import { KycDocUploader, KycExtraDocUploader } from "@/components/profile/kyc-doc-uploader";
import { SUPPORT_EMAIL } from "@/lib/support-config";

export const metadata = { title: "Verify identity · Thibitisha" };

export default async function KycPage({ searchParams }: { searchParams?: Promise<{ welcome?: string; error?: string; nida?: string; submitted?: string }> }) {
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
  const hasDoc = (t: string) => (kyc?.documents ?? []).some((d: { docType: string }) => d.docType === t);
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
        Profile
      </Link>

      {sp.error && (
        <div role="alert" className="rounded-xl border border-no-700 bg-no-500/10 px-4 py-3 text-[13px] text-no-300">
          {sp.error}
        </div>
      )}
      {sp.nida === "verified" && !sp.error && (
        <div role="status" className="rounded-xl border border-yes-700 bg-yes-500/10 px-4 py-3 text-[13px] text-yes-300">
          NIDA verified. Now attach your documents below. · NIDA imethibitishwa.
        </div>
      )}
      {hasEmail && !emailVerified && nidaDone && (
        <div className="rounded-xl border border-gold-700 bg-gold-500/[0.06] px-4 py-3 flex items-start gap-2.5">
          <I.mail s={16} className="text-gold-300 mt-0.5 shrink-0" />
          <div className="text-[12.5px] text-text-muted leading-snug">
            <p className="font-display font-semibold text-gold-300">Confirm your email · Thibitisha barua pepe</p>
            <p className="mt-0.5">
              We sent a confirmation link to <span className="font-semibold text-text">{user?.email}</span>.
              Check your inbox and click the link so we can send you verification results, receipts, and password resets.
              The link expires in 24 hours.{" "}
              <span className="italic text-text-subtle">Angalia barua pepe yako. Kiungo kinaisha baada ya saa 24.</span>
            </p>
            <p className="mt-1.5">
              <Link href="/profile/account" className="font-mono text-[11px] text-brand-300 hover:text-brand-200 underline-offset-2 hover:underline">
                Didn&rsquo;t get it? Resend from your account page →
              </Link>
            </p>
          </div>
        </div>
      )}
      {sp.submitted && !sp.error && (
        <div role="status" className="rounded-xl border border-yes-700 bg-yes-500/10 px-4 py-3 text-[13px] text-yes-300">
          Submitted for review. We&rsquo;ll notify you when it&rsquo;s decided. · Imewasilishwa.
        </div>
      )}

      {isWelcome && !submitted && !nidaDone && (
        <section className="rounded-xl border border-gold-700 bg-gold-500/10 p-4 lg:p-5 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <p className="font-display text-[14px] font-bold text-gold-300">
              Welcome to 50pick · Karibu
            </p>
            <p className="mt-1 text-[12.5px] text-text-muted leading-snug">
              You can <span className="font-bold text-text">browse markets and place bets right away</span>.
              Verify your identity later — withdrawals unlock once KYC is approved.
              <span className="block italic text-text-subtle text-[11.5px] mt-0.5">
                Unaweza kuanza kuweka dau sasa hivi. Thibitisha NIDA kabla ya kutoa pesa.
              </span>
            </p>
          </div>
          <Link
            href="/markets"
            className="btn btn-gold btn-lg whitespace-nowrap"
            style={{ borderRadius: "var(--r-pill)" }}
          >
            Skip for now · Browse markets
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
              Identity verification
            </p>
          </div>
          <h1 className="font-display text-[26px] lg:text-[28px] font-bold text-text leading-tight tracking-[-0.02em]">
            Verify your NIDA · Thibitisha NIDA
          </h1>
          <p className="mt-2 text-[13px] text-text-muted leading-snug max-w-prose">
            We verify against the National Identification Authority before withdrawals.
            Required by the Tanzania Gaming Act and the Personal Data Protection Act.
            <span className="block italic text-text-subtle text-[12px] mt-1">
              Tunathibitisha NIDA kabla ya kutoa pesa.
            </span>
          </p>
        </div>
      </header>

      {rejected && (
        <section role="alert" className="rounded-xl border border-no-700 bg-no-500/[0.08] p-4 lg:p-5">
          <div className="flex items-start gap-2.5">
            <I.alertCircle s={18} />
            <div className="min-w-0">
              <p className="font-display text-[14px] font-bold text-no-300">Verification needs another look · Imekataliwa</p>
              <p className="mt-1 text-[12.5px] text-text-muted leading-snug">
                {kyc?.rejectReason ? <>Reason: <span className="font-semibold text-text">{String(kyc.rejectReason).replace(/_/g, " ").toLowerCase()}</span>. </> : null}
                {kyc?.rejectNote ? `${kyc.rejectNote} ` : ""}
                Please re-enter your details below and resubmit, or email{" "}
                <a href={`mailto:${SUPPORT_EMAIL()}?subject=KYC%20review`} className="text-brand-300 underline-offset-2 hover:underline">{SUPPORT_EMAIL()}</a>.
                <span className="block italic text-text-subtle text-[11.5px] mt-0.5">Tafadhali jaribu tena au wasiliana na msaada.</span>
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
              <p className="font-display text-[14px] font-bold text-gold-300">More information needed · Tunahitaji maelezo zaidi</p>
              <p className="mt-1 text-[12.5px] text-text-muted leading-snug">
                {kyc?.rejectNote ? <span className="font-semibold text-text">{kyc.rejectNote}</span> : "Our team needs a clearer or additional document."}
                {" "}Update the document(s) below and submit again — this isn&rsquo;t a rejection.
                <span className="block italic text-text-subtle text-[11.5px] mt-0.5">Rekebisha nyaraka hapa chini kisha uwasilishe tena.</span>
              </p>
            </div>
          </div>
        </section>
      )}

      {needsInfo && extraRequests.length > 0 && (
        <section className="rounded-xl glass-panel p-5 lg:p-6 space-y-3">
          <div className="flex items-center gap-2">
            <I.shieldcheck s={18} />
            <h2 className="font-display text-[15px] font-semibold text-text">Requested documents · Nyaraka zilizoombwa</h2>
          </div>
          <p className="text-[12.5px] text-text-muted leading-snug">
            Our team asked for the following. Attach each, then submit again below.
          </p>
          <div className="space-y-2">
            {extraRequests.map((rq: { id: string; description: string; storageKey: string | null }) => (
              <KycExtraDocUploader key={rq.id} requestId={rq.id} description={rq.description} attached={!!rq.storageKey} />
            ))}
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Step n={1} title="NIDA"      detail="National ID number"  done={nidaDone} active={!nidaDone} />
        <Step n={2} title="Documents" detail="Front · back · selfie" done={docsCount >= 3} active={nidaDone && docsCount < 3} />
        <Step n={3} title="Review"    detail="Compliance approval"  done={kyc?.status === "APPROVED"} active={submitted && kyc?.status !== "APPROVED"} />
      </section>

      {!nidaDone && (
        <section className="rounded-xl glass-panel p-5 lg:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <I.shieldcheck s={18} />
            <h2 className="font-display text-[15px] font-semibold text-text">Step 1 · NIDA verification</h2>
          </div>
          <form action={submitNidaAction} className="space-y-4">
            <Field
              id="nida"
              label="NIDA number · Nambari ya NIDA"
              hint="20 digits, exactly as on your card"
              type="text"
              required
              pattern="\d{20}"
              title="NIDA number must be exactly 20 digits (numbers only)"
              maxLength={20}
              inputMode="numeric"
              placeholder="00000000000000000000"
            />
            <Field
              id="fullName"
              label="Full name · Jina kamili"
              hint="As printed on the NIDA card"
              type="text"
              required
              minLength={3}
              maxLength={100}
            />
            <div>
              <label htmlFor="dob" className="block font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-subtle mb-2">
                Date of birth · Tarehe ya kuzaliwa
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
                    <span className="ml-auto text-[10.5px] text-text-subtle">From sign-up</span>
                  </div>
                  <p className="mt-1.5 text-[11px] text-text-subtle">
                    Taken from your account — no need to re-enter. Wrong?{" "}
                    <a href={`mailto:${SUPPORT_EMAIL}`} className="text-brand-300 underline-offset-2 hover:underline hover:text-brand-200">Contact support</a> before verifying.
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
                  <p className="mt-1.5 text-[11px] text-text-subtle">Must match NIDA exactly. 18+ required.</p>
                </>
              )}
            </div>
            <Field
              id="email"
              label="Email · Barua pepe"
              hint="Required — we email you the verification result (approved / more info needed) and receipts here."
              type="email"
              required
              maxLength={254}
              inputMode="text"
              placeholder="you@example.com"
            />
            <SubmitButton label="Verify NIDA · Thibitisha" pendingLabel="Verifying…" />
          </form>
          <details className="border-t border-border pt-3 text-[12.5px] text-text-muted">
            <summary className="font-display font-semibold text-text cursor-pointer">
              Why we ask · Kwa nini tunaomba
            </summary>
            <p className="mt-1.5 leading-snug">
              The Gaming Board of Tanzania requires identity verification for every account
              that wagers real money. Your NIDA is checked against the National Identification
              Authority. We never share your number with third parties.
            </p>
          </details>
        </section>
      )}

      {nidaDone && !submitted && (
        <section className="rounded-xl glass-panel p-5 lg:p-6 space-y-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-pill border border-yes-700 bg-yes-500/10 px-2.5 py-0.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.1em] text-yes-300">
              <I.check s={11} />
              NIDA verified
            </span>
          </div>
          <h2 className="font-display text-[15px] font-semibold text-text">Step 2 · Upload documents</h2>
          <p className="text-[12.5px] text-text-muted leading-snug">
            We need a clear photo of the <span className="font-bold text-text">front</span>,
            the <span className="font-bold text-text">back</span> of your NIDA card,
            and a <span className="font-bold text-text">selfie</span> holding the card.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <KycDocUploader label="ID front · Mbele"    docType="NIDA_FRONT" attached={hasDoc("NIDA_FRONT")} />
            <KycDocUploader label="ID back · Nyuma"     docType="NIDA_BACK"  attached={hasDoc("NIDA_BACK")} />
            <KycDocUploader label="Selfie · Picha yako" docType="SELFIE"     attached={hasDoc("SELFIE")} />
          </div>
          <p className="text-[10.5px] italic text-text-subtle">
            Tap each card to attach a photo, then submit for compliance review.
          </p>
          <form action={submitKycForReviewAction}>
            {docsCount >= 3 ? (
              <SubmitButton label="Submit for review · Wasilisha" pendingLabel="Submitting…" />
            ) : (
              <>
                <button
                  type="submit"
                  disabled
                  className="btn btn-ghost btn-lg w-full"
                  style={{ borderRadius: "var(--r-pill)" }}
                >
                  Submit for review · Wasilisha
                </button>
                <p className="mt-2 text-[11px] text-text-subtle text-center">Attach all three documents to submit.</p>
              </>
            )}
          </form>
        </section>
      )}

      {submitted && (
        <section className="rounded-xl border border-gold-700 bg-gold-500/10 p-5 lg:p-6 text-center space-y-2">
          <p className="font-display text-[16px] font-bold text-gold-300">
            {kyc?.status === "APPROVED" ? "Identity verified" : "Submitted for review"}
          </p>
          <p className="text-[12.5px] text-text-muted leading-snug">
            {kyc?.status === "APPROVED"
              ? "You can now deposit and withdraw freely."
              : "Compliance is reviewing. Most reviews finish within 2 hours during business hours."}
            <span className="block italic text-text-subtle text-[11.5px] mt-0.5">
              {kyc?.status === "APPROVED"
                ? "Sasa unaweza kuweka na kutoa pesa."
                : "Ukaguzi unaendelea — utakamilika ndani ya saa 2."}
            </span>
          </p>
        </section>
      )}

      <div className="flex items-center justify-between pt-1">
        <Link
          href="/profile"
          className="font-mono text-[12px] uppercase tracking-[0.14em] text-text-subtle hover:text-text"
        >
          ← Profile
        </Link>
        <Link
          href="/wallet"
          className="font-display text-[13px] font-semibold text-gold-300 hover:text-gold-200 transition-colors"
        >
          Need to deposit? · Wallet
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

function Field({
  id, label, hint, type, pattern, inputMode, placeholder,
  required: req = true, minLength, maxLength, min, max, title,
}: {
  id: string; label: string; hint?: string; type: string;
  pattern?: string; inputMode?: "numeric" | "text"; placeholder?: string;
  required?: boolean; minLength?: number; maxLength?: number; min?: string; max?: string;
  title?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-subtle mb-2"
      >
        {label}
      </label>
      <input
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
        className="w-full h-11 px-3.5 rounded-md border border-border font-mono text-[16px] tabular-nums text-text focus:outline-none admin-focus transition-colors invalid:border-no-500"
        style={{ background: "var(--bg-inset)" }}
      />
      {hint && <p className="mt-1.5 text-[11px] text-text-subtle">{hint}</p>}
    </div>
  );
}
