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
import { FilterPill, FilterGroupKey } from "@/components/ui/filter-pill";
import { SubmitButton } from "@/components/ui/submit-button";
import { submitIdentityAction, submitKycForReviewAction, restartKycAction } from "./actions";
import {
  ID_DOC_TYPES,
  ID_DOC_SPECS,
  DOC_SLOT_LABEL_KEY,
  isIdDocType,
  type IdDocType,
} from "@/lib/id-documents";
import { KycDocUploader, KycExtraDocUploader } from "@/components/profile/kyc-doc-uploader";
import { RewardBurst } from "@/components/brand/reward-burst";
import { SUPPORT_EMAIL } from "@/lib/support-config";
import { getPayoutStatus, payoutsAcceptingRequests } from "@/lib/server/payout-status";
import { getServerT, type Dict } from "@/lib/i18n-server";
import { bannerFor } from "@/lib/failure-banner";
import { PageContainer } from "@/components/layout/page-container";

// Localised tab title (POLISH-BACKLOG §1.7) — was the hard-coded English
// "Verify identity", which a Swahili player saw in their browser tab and history.
export async function generateMetadata() {
  const { t } = await getServerT();
  return { title: t.profile.verifyIdentity };
}

export default async function KycPage({ searchParams }: { searchParams?: Promise<{ welcome?: string; reason?: string; id?: string; idType?: string; idNumber?: string; idExpiry?: string; submitted?: string; fullName?: string; dob?: string; email?: string; next?: string }> }) {
  const { t } = await getServerT();
  const session = await currentSession();
  if (!session) redirect("/auth/login?next=/profile/kyc");

  // READ BEFORE START. `startKyc()` RESETS a REJECTED submission — it nulls the
  // identity tuple (idType, idNumber, idExpiry, idVerifiedAt), rejectReason,
  // rejectNote and empties documents
  // (kyc-service.ts:79-95). Calling it unconditionally here wiped the rejection
  // one line before the read below, so `rejected` was ALWAYS false and the
  // rejection panel further down was unreachable dead code: a player whose
  // identity check failed saw a blank form and a green "NIDA number accepted"
  // banner while their inbox held "Identity check needs attention".
  // Auto-create only when there is genuinely nothing to read; restarting a
  // rejected submission is an explicit player action (restartKycAction).
  // B-1 — no swallow on the status read: a failed read rendered the blank
  // NOT_STARTED form to a player whose submission may be pending/rejected.
  // Throw to profile/error.tsx instead.
  let kyc = await getKycStatus(session.userId);
  if (!kyc || kyc.status === "NOT_STARTED") {
    // B-1 — deliberate degrade: at this point the read SUCCEEDED and the state
    // is genuinely not-started; if the auto-create write fails, the honest
    // not-started form still renders.
    try { await startKyc(session.userId); kyc = await getKycStatus(session.userId); } catch { /* graceful */ }
  }
  // B-1 — no swallow: a failed user read fabricated "no email on file" and
  // mis-drew the email verification step.
  const user = await db.user.findById(session.userId);

  const sp = (await searchParams) ?? {};
  const banner = bannerFor(sp.reason, t.error as unknown as Record<string, string>);
  const isWelcome = sp.welcome === "new";
  // Safe internal return target (IA review R6) — a gated action (e.g. Withdraw)
  // sends `?next=/wallet/withdraw`; on approval we offer a "Continue" CTA back
  // to it. Reject anything that isn't a same-site absolute path (no open redirect).
  const nextHref = sp.next && /^\/(?!\/)/.test(sp.next) ? sp.next : null;
  const idDone = !!kyc?.idVerifiedAt;

  /**
   * WHICH DOCUMENT THIS SCREEN IS ABOUT.
   *
   * Once the identity step is done the RECORD decides and the chooser is gone — a
   * player mid-upload must never be shown a different document's slots because of a
   * stale link. Before that the URL decides, which is what makes a refused submit
   * round-trip to the SAME form; anything that is not one of the four falls back to
   * NIDA rather than rendering an empty chooser.
   */
  const chosenType: IdDocType =
    (idDone && isIdDocType(kyc?.idType) ? (kyc!.idType as IdDocType) : null) ??
    (isIdDocType(sp.idType) ? sp.idType : "NIDA");
  const spec = ID_DOC_SPECS[chosenType];
  const idLabel = (t.profile as unknown as Record<string, string>)[spec.labelKey];

  const hasEmail = !!user?.email;
  const emailVerified = !!user?.emailVerifiedAt;
  const hasDoc = (dt: string) => (kyc?.documents ?? []).some((d: { docType: string }) => d.docType === dt);
  // ⛔ PROGRESS IS COUNTED AGAINST THE SLOTS THIS DOCUMENT NEEDS, never against a
  // literal 3. A passport needs two; "2/3 attached" on a complete passport submission
  // is the screen telling the player they are not finished when they are.
  const requiredSlots = spec.requiredSlots;
  const attachedCount = requiredSlots.filter((s) => hasDoc(s)).length;
  const allAttached = attachedCount >= requiredSlots.length;
  const submitted = kyc?.status === "PENDING_REVIEW" || kyc?.status === "APPROVED";
  const rejected = kyc?.status === "REJECTED";
  const needsInfo = kyc?.status === "ADDITIONAL_INFO_REQUIRED";
  const extraRequests = kyc?.extraRequests ?? [];
  const rejectLabel = humanizeRejectReason(kyc?.rejectReason ? String(kyc.rejectReason) : null, t);

  // E-5. The approval burst used to read "You can now deposit and withdraw freely", which was
  // wrong twice over. Deposits are NOT gated on KYC at all — the ladder is
  // browse free → verify email to deposit → KYC to withdraw (wallet/deposit/page.tsx:125) — so
  // approval never unlocked depositing, and the burst rendered directly beneath the very banner
  // telling the player to confirm their email before adding money. And withdrawals carry a
  // SECOND gate: when the payout provider cannot pay, /wallet/withdraw refuses the request
  // outright. Promising both, at the player's proudest moment, was contradicted twice within one
  // screen. So state only what approval actually unlocked, and ask the live gate rather than
  // assuming it. Default to `operational` on failure, matching derivePayoutStatus's own fallback
  // (payout-status.ts:120) — an unreachable DB is not evidence that payouts are down.
  let payoutsAccepting = true;
  try {
    payoutsAccepting = payoutsAcceptingRequests((await getPayoutStatus()).status);
  } catch { /* B-1 — deliberate degrade, see rationale above */ }

  return (
    <PageContainer tier="form" className="space-y-5">
      <BackLink fallbackHref="/profile" label={t.common.profile} />

      {banner && (
        <div role="alert" className="rounded-xl border border-no-700 bg-no-500/10 px-4 py-3 text-[13px] text-no-300">
          {banner.body}
        </div>
      )}
      {sp.id === "accepted" && !banner && (
        <div role="status" className="rounded-xl border border-yes-700 bg-yes-500/10 px-4 py-3 text-[13px] text-yes-300">
          {t.profile.kycIdAccepted}
        </div>
      )}
      {hasEmail && !emailVerified && idDone && (
        <div className="rounded-xl border border-gold-700 bg-gold-500/[0.06] px-4 py-3 flex items-start gap-2.5">
          <I.mail s={16} className="text-gold-300 mt-0.5 shrink-0" />
          <div className="text-body-sm text-text-muted leading-snug">
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
      {sp.submitted && !banner && (
        <div role="status" className="rounded-xl border border-yes-700 bg-yes-500/10 px-4 py-3 text-[13px] text-yes-300">
          {t.profile.kycSubmitted}
        </div>
      )}

      {isWelcome && !submitted && !idDone && (
        <section className="rounded-xl border border-gold-700 bg-gold-500/10 p-4 lg:p-5 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <p className="font-display text-[14px] font-bold text-gold-300">
              {t.auth.welcomeTo50pick}
            </p>
            <p className="mt-1 text-body-sm text-text-muted leading-snug">
              {t.profile.kycWelcomeCan + " "}<span className="font-bold text-text">{t.profile.kycWelcomeBrowse}</span>.
              {t.profile.kycWelcomeLater}
            </p>
          </div>
          <Link
            href="/markets"
            className="btn btn-primary btn-lg btn-pill whitespace-nowrap"
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
            {/* ⚠️ LITERALS, not `h-9 w-9` — spacing is overridden (tailwind.config.ts:200-215),
                so `h-9` renders 64px. This is the surface that gates every withdrawal. */}
            <span className="inline-flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full bg-no-500/15 text-no-300">
              <I.alertCircle s={18} />
            </span>
            <div className="min-w-0">
              <p className="font-display text-[14px] font-bold text-no-300">{t.profile.rejected}</p>
              <p className="mt-1 text-body-sm text-text-muted leading-snug">
                {rejectLabel ? <>{t.profile.kycRejectReason}: <span className="font-semibold text-text">{rejectLabel}</span>. </> : null}
                {kyc?.rejectNote ? `${kyc.rejectNote} ` : ""}
                {t.profile.kycResubmitOrEmail}{" "}
                <a href={`mailto:${SUPPORT_EMAIL()}?subject=KYC%20review`} className="text-brand-300 underline-offset-2 hover:underline">{SUPPORT_EMAIL()}</a>.
              </p>
              {/* Restarting CLEARS the submission, so it must be a deliberate tap,
                  never a page load — see the read-before-start note above. */}
              <form action={restartKycAction} className="mt-3">
                <SubmitButton label={t.error.tryAgain} pendingLabel={t.common.loading} />
              </form>
            </div>
          </div>
        </section>
      )}

      {needsInfo && (
        <section role="status" className="rounded-xl border border-gold-700 bg-gold-500/[0.08] p-4 lg:p-5">
          <div className="flex items-start gap-3">
            {/* ⚠️ LITERALS — see the rejected-medallion note above. `h-9` is 64px here. */}
            <span className="inline-flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full bg-gold-500/15 text-gold-300">
              <I.info s={18} />
            </span>
            <div className="min-w-0">
              <p className="font-display text-[14px] font-bold text-gold-300">{t.profile.kycMoreInfo}</p>
              <p className="mt-1 text-body-sm text-text-muted leading-snug">
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
          <p className="text-body-sm text-text-muted leading-snug">
            {t.profile.kycRequestedDocsBody}
          </p>
          <div className="space-y-2">
            {extraRequests.map((rq: { id: string; description: string; storageKey: string | null }) => (
              <KycExtraDocUploader key={rq.id} requestId={rq.id} description={rq.description} attached={!!rq.storageKey} />
            ))}
          </div>
        </section>
      )}

      {/* C1b — 4-node verification rail (ID → selfie → review → verified) with a
          gilt fill up to the current node; done nodes go green (page convention),
          the live node carries the gilt ring. */}
      <ProgressRail
        nodes={[
          // ⛔ The first node is named after the document the player actually chose.
          // It said "NIDA" unconditionally, which on a passport journey labelled the
          // step after a document the player never touched.
          { label: idLabel,              glyph: "idCard",      done: idDone },
          { label: t.profile.selfie,     glyph: "user",        done: allAttached },
          { label: t.profile.review,     glyph: "shieldcheck", done: kyc?.status === "APPROVED" },
          { label: t.profile.idVerified, glyph: "check",       done: kyc?.status === "APPROVED" },
        ]}
      />

      {!idDone && (
        <section className="rounded-xl glass-panel p-5 lg:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-500/15 text-brand-300">
              <I.user s={15} />
            </span>
            <h2 className="font-display text-[15px] font-semibold text-text">{t.profile.step1} · {t.profile.identityDocument}</h2>
          </div>

          {/* ── THE CHOOSER ──────────────────────────────────────────────────
              ⛔ NOT A HAND-ROLLED CONTROL. `FilterPill` is the ONE filter/segment
              language on this platform (DESIGN_AUTHORITY: hand-rolling a second is a
              documented refusal), and its `semantics="tab"` reading — exactly one
              option in force, choosing it navigates — is what this rail is.

              ⭐ IT IS A LINK, AND THAT IS THE FEATURE. The type lands in the URL, so
              (a) the form round-trips to the SAME document after a refused submit,
              (b) it works with no JavaScript at all, and (c) switching document
              deliberately drops the previous number rather than validating a passport
              against a licence's rule.

              ⚠️ Every pill is 44px and only the SELECTED one carries an outline — both
              properties belong to the primitive, so this call site cannot drift from
              the other eight rails that use it. */}
          <div>
            <FieldLegend as="p" className="block mb-1.5">{t.profile.chooseIdType}</FieldLegend>
            <p className="mb-2.5 text-body-sm text-text-muted leading-snug">{t.profile.chooseIdTypeBody}</p>
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t.profile.chooseIdType}>
              <FilterGroupKey>{t.profile.idDocsNeeded}</FilterGroupKey>
              {ID_DOC_TYPES.map((ty) => (
                <FilterPill
                  key={ty}
                  href={`/profile/kyc?idType=${ty}`}
                  label={(t.profile as unknown as Record<string, string>)[ID_DOC_SPECS[ty].labelKey]}
                  on={ty === chosenType}
                  semantics="tab"
                  testId={`idType:${ty}`}
                  replace
                  scroll={false}
                />
              ))}
            </div>
          </div>

          <form action={submitIdentityAction} className="space-y-4">
            {/* The form carries its own copy of the choice, so what is VALIDATED is
                what was on screen — never a query string a link could have staled. */}
            <input type="hidden" name="idType" value={chosenType} />
            <Field
              id="idNumber"
              label={(t.profile as unknown as Record<string, string>)[spec.numberLabelKey]}
              hint={(t.profile as unknown as Record<string, string>)[spec.hintKey]}
              type="text"
              required
              {...(spec.htmlPattern ? { pattern: spec.htmlPattern } : {})}
              title={(t.profile as unknown as Record<string, string>)[spec.ruleKey]}
              maxLength={chosenType === "NIDA" ? 20 : 40}
              inputMode={spec.inputMode}
              defaultValue={(sp as Record<string, string | undefined>).idNumber ?? ""}
            />
            {/* ⛔ A `pattern` ONLY where a published rule exists. Synthesising one for
                the licence or the voter's card from our own sanity band would put a
                browser-enforced lockout in front of a real citizen on a rule no
                authority ever published.

                ⛔ AND NO PLACEHOLDER (A-5). A placeholder must never become a value;
                the shape lives in the hint and in the rule line below, which are text
                rather than a greyed value sitting in a box. The rule is named IN FULL
                whenever the server refused the number — "invalid" is never an
                acceptable answer on an identity field (§F4). */}
            {sp.reason === "id_number_format" && (
              <p role="alert" className="-mt-2 text-body-sm leading-snug text-no-300">
                {(t.profile as unknown as Record<string, string>)[spec.ruleKey]}
              </p>
            )}

            {/* ⛔ ASKED FOR ONLY WHERE THE DOCUMENT HAS ONE. A NIDA and a voter's card
                do not expire, and asking for a date a document does not carry invites
                an invented one — which is worse than no date in a compliance record. */}
            {spec.expires && (
              <div>
                <FieldLegend as="label" htmlFor="idExpiry" className="block mb-2">
                  {t.profile.idExpiryLabel}
                </FieldLegend>
                <DateSelect
                  name="idExpiry"
                  id="idExpiry"
                  required
                  min={new Date().toISOString().slice(0, 10)}
                  max={`${new Date().getFullYear() + 20}-12-31`}
                  defaultValue={(sp as Record<string, string | undefined>).idExpiry ?? ""}
                />
                <p className="mt-1.5 text-body-sm text-text-subtle">{t.profile.idExpiryHint}</p>
              </div>
            )}
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
                  <p className="mt-1.5 text-body-sm text-text-subtle">
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
                  <p className="mt-1.5 text-body-sm text-text-subtle">{t.auth.dobHint}</p>
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

      {idDone && !submitted && (
        <section className="rounded-xl glass-panel p-5 lg:p-6 space-y-3">
          <div className="flex items-center gap-2">
            {/* This badge marks STEP 1 being done, not identity being verified.
                It renders on `idDone && !submitted` — a number that passed its
                document's format rule and the uniqueness check — before a single
                photo is uploaded and long before an officer looks at anything. It
                used to read "ID verified" (SW "Imethibitishwa", ZH "已验证"), which
                told an unverified player they were verified on the one surface
                that must never overstate. docs/IDENTITY-POLICY.md, the owner
                decision: `idVerifiedAt` means "format accepted", there is no
                authority check, and "if any surface contradicts it, that surface
                is wrong". Same string is still correct in the stepper above,
                where it is gated on `kyc?.status === "APPROVED"`. */}
            <span className="inline-flex items-center gap-1 rounded-pill border border-yes-700 bg-yes-500/10 px-2.5 py-0.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.1em] text-yes-300">
              <I.check s={11} />
              {t.profile.idSaved}
            </span>
            {/* Which document this submission is built on, stated where the player
                can see it — a passport journey that never names the passport leaves
                somebody wondering whether the right thing was recorded. */}
            <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-text-subtle">{idLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-500/15 text-brand-300">
              <I.camera s={15} />
            </span>
            <h2 className="font-display text-[15px] font-semibold text-text">{t.profile.step2} · {t.profile.uploadDocuments}</h2>
          </div>
          <p className="text-body-sm text-text-muted leading-snug">
            {t.profile.uploadDocsBody}
          </p>
          {/* ⛔ THE SLOTS COME FROM THE CATALOGUE, NOT FROM THIS FILE. A NIDA asks for
              front + back + selfie; the other three ask for one image of the document
              + a selfie. ⭐ THE SELFIE SURVIVES ON ALL FOUR ON PURPOSE: "Selfie matches
              the ID photo" is one of the officer's four attestations, so dropping it
              for three of the types would have removed the human control while widening
              the document list — exactly what the policy forbids.
              ⚠️ `sm:grid-cols-*` is derived from the count, or a two-slot document
              renders a 3-column grid with a hole in it at ≥640px. */}
          <div className={`grid grid-cols-1 gap-2 ${requiredSlots.length >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
            {requiredSlots.map((slot) => (
              <KycDocUploader
                key={slot}
                label={(t.profile as unknown as Record<string, string>)[DOC_SLOT_LABEL_KEY[slot]]}
                docType={slot}
                attached={hasDoc(slot)}
              />
            ))}
          </div>
          <p className="text-body-sm text-text-subtle">
            {t.profile.tapToAttach}
          </p>
          <p className="font-mono text-[11px] font-bold tabular-nums text-text-muted">
            {attachedCount}/{requiredSlots.length} {t.toast.documentAttached.toLowerCase()}{allAttached ? ` — ${t.profile.readyToSubmit}` : ""}
          </p>
          <form action={submitKycForReviewAction}>
            {allAttached ? (
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
                <p className="mt-2 text-body-sm text-text-subtle text-center">{t.profile.attachAllThree}</p>
              </>
            )}
          </form>
        </section>
      )}

      {submitted && kyc?.status === "APPROVED" && (
        // Earned-peak crest (remade 2026-08-08 — no rays, M3) — KYC verified is an earned-status peak, so gold is legitimate here.
        <section className="rounded-xl border border-gold-700/60 bg-bg-elevated p-5 lg:p-6 text-center">
          <RewardBurst glyph="shieldcheck" caption={t.profile.idVerified} />
          <p className="mt-3 text-[13px] text-text-muted leading-snug max-w-[400px] mx-auto">
            {payoutsAccepting ? t.profile.kycApprovedBody : t.profile.kycApprovedPayoutsPaused}
          </p>
          {/* Return to the gated action the user came from (IA review R6). */}
          {nextHref && (
            <Link href={nextHref as never} className="btn btn-primary btn-md mt-4 inline-flex">
              {t.common.continue}
            </Link>
          )}
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
          className="font-mono text-label uppercase tracking-[0.14em] text-text-subtle hover:text-text"
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
    </PageContainer>
  );
}

// C1b verification rail — 4 nodes (ID → selfie → review → verified) on a single
// connected track. The gilt "fill" runs the connectors up to the current node
// (first not-yet-done step); done nodes read green (the page's done colour), the
// current node carries the gilt ring, future nodes are muted line-art. Purely
// presentational — reflects server-derived `done` flags, no motion.
function ProgressRail({ nodes }: { nodes: { label: string; glyph: keyof typeof I; done: boolean }[] }) {
  const firstUndone = nodes.findIndex((n) => !n.done);
  // All done → the last node is the "current"; else the first not-done node.
  const activeIndex = firstUndone === -1 ? nodes.length - 1 : firstUndone;
  return (
    <section aria-label="Verification progress" className="flex items-start px-1 pt-1">
      {nodes.map((node, i) => {
        const isActive = i === activeIndex && !node.done;
        const Glyph = I[node.glyph];
        const circleCls = node.done
          ? "bg-yes-500 text-yes-950 border-transparent"
          : isActive
            ? "border-2 border-gold-500 bg-gold-500/10 text-gold-300"
            : "border border-border bg-bg-overlay text-text-subtle";
        const labelCls = node.done
          ? "text-text"
          : isActive
            ? "text-gold-300"
            : "text-text-subtle";
        return (
          <div key={i} className="contents">
            <div className="flex w-[64px] shrink-0 flex-col items-center">
              {/* ⚠️ LITERALS — `h-9` is 64px on this repo's overridden scale, i.e. edge-to-edge
                  inside the w-[64px] column with zero gutter. 32px leaves the label room. */}
              <span className={`inline-flex h-[32px] w-[32px] items-center justify-center rounded-full ${circleCls}`}>
                {node.done ? <I.check s={16} /> : <Glyph s={16} />}
              </span>
              <span className={`mt-2 text-center font-mono text-[9.5px] font-semibold uppercase leading-tight tracking-[0.08em] ${labelCls}`}>
                {node.label}
              </span>
            </div>
            {i < nodes.length - 1 && (
              <div
                aria-hidden
                className="mt-[17px] h-[2px] flex-1 rounded-full"
                style={{ background: i < activeIndex ? "color-mix(in oklab, var(--gold-500) 75%, transparent)" : "var(--border)" }}
              />
            )}
          </div>
        );
      })}
    </section>
  );
}

/**
 * Turn the stored `KycRejectReason` into the player's own language.
 *
 * 🔴 These keys MUST be the Postgres enum members (prisma/schema.prisma
 * `enum KycRejectReason`) — nothing else ever reaches this function. The first
 * version keyed on invented names (NIDA_MISMATCH, PHOTO_UNREADABLE,
 * WRONG_DOCUMENT, SELFIE_MISMATCH, EXPIRED_DOCUMENT, DUPLICATE_ACCOUNT), only
 * one of which (UNDERAGE) is a real member. Every rejected player therefore
 * fell through to the raw-enum fallback and read English enum text — "details
 * mismatch", "other" — in Swahili and Chinese too, while 21 correct
 * translations sat unreachable in the dictionary. Found live 2026-07-31 on a
 * production rejection; `npm run test:kyc-reject-reason` now pins every member.
 *
 * OTHER deliberately returns null: it carries no information a player can act
 * on, and printing "Reason: other." ahead of the officer's own sentence reads
 * as a contradiction. The officer's note is the message in that case.
 */
function humanizeRejectReason(raw: string | null, t: Dict): string | null {
  if (!raw) return null;
  const labels: Record<string, string> = {
    BLURRY_DOC: t.profile.rejectBlurry,
    DETAILS_MISMATCH: t.profile.rejectNidaMismatch,
    EXPIRED_ID: t.profile.rejectExpired,
    UNDERAGE: t.profile.rejectUnderage,
    DUPLICATE_IDENTITY: t.profile.rejectDuplicate,
    SANCTIONED: t.profile.rejectSanctioned,
  };
  return labels[raw] ?? null;
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
