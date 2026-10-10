import Link from "next/link";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { I } from "@/components/ui/glyphs";
import { VerifiedAgentBadge } from "@/components/agent/verified-agent-badge";
import { CommissionWaterfall } from "@/components/agent/commission-waterfall";
import { getGlobalConfig } from "@/lib/server/market-config";
import { getServerT } from "@/lib/i18n-server";
import { currentSession } from "@/lib/server/auth-service";
import { getAgentConfig } from "@/lib/server/agent-config";
import { lipaDisplay } from "@/lib/server/lipa-config";
import { LIPA_QR_RELEASED } from "@/lib/lipa";
import { LipaQrPanel } from "@/components/pay/lipa-qr-panel";
import { applicantView, feeBreakdown } from "@/lib/server/agent-application-service";
import { getKycStatus } from "@/lib/server/kyc-service";
import { inviteViewerFor } from "@/lib/server/affiliate-service";
import { inviteIsLiveFor } from "@/lib/feature-state";
import { fill, formatTzs } from "@/lib/utils";
import { formatEatDate } from "@/lib/eat-day";
import { MAX_DOC_BYTES } from "@/lib/id-documents";
import { startApplicationAction } from "./apply/actions";
import { fillNodes } from "@/lib/fill-nodes";
import { durationHours } from "@/lib/duration-phrase";
import { KYC_REVIEW_SLA_HOURS } from "@/lib/kyc-sla";
import { isLockedOut } from "@/lib/server/responsible-gambling";
import { breakStateOf } from "@/lib/break-end";

export async function generateMetadata() {
  const { t } = await getServerT();
  return { title: t.agent.title };
}
export const dynamic = "force-dynamic";

/**
 * /agent — the programme's ONE public door. Linked from the site footer, readable signed out,
 * and it explains without soliciting: an ordinary player finds a directory line in the footer
 * and a page that describes a business partnership, not a promo.
 *
 * ⭐ THREE FACTS ABOVE THE FOLD — what you earn · what it costs · how long approval takes — every
 * one read from `agent-config`. ⛔ Not one number on this page is typed here.
 *
 * The CTA is decided by the SAME eligibility the service enforces (`applicantEligibility`), so
 * the page never offers what `startApplication` is about to refuse — and never before the
 * applicant is asked to pay the registration fee FROM THEIR WALLET (Ali, 2026-09-10; it was
 * paid out of band until then). ⛔ The fee is `feeBreakdown().
 * totalTzs`, never a literal — it was TZS 100,000 VAT-inclusive until management moved the
 * treatment on 2026-09-08 and became TZS 118,000. ⭐ SUPERSEDED 2026-09-09: Ali ruled the fee
 * bears NO VAT, so it is TZS 100,000 again — read `feeBreakdown().totalTzs`, never a literal.
 */
export default async function AgentProgrammePage({ searchParams }: { searchParams: Promise<{ refused?: string }> }) {
  const sp = await searchParams;
  const cfg = getAgentConfig();
  const { t, locale } = await getServerT();
  const session = await currentSession();
  /* ⭐ R8-C (2026-10-10, the owner's ruling (4); owner items 16 and 56) · DURING A BREAK, NO OFFER TO BECOME AN AGENT. Every
     door here closes for a reader on a break (the footer's "Kuwa wakala", the hub's row); a direct visit is answered below,
     calmly — the CTA that would start or continue an application gives way to the programme's own RG sentence
     (`agent.stateRgLocked`, the one the service refuses with and this page already shows a reader with no application). A
     reader's own records stay: the status of an application, an agent's dashboard. Read beside the applicant's view, and
     failing OPEN: a failed read is no break (the service still refuses a start or a submit on a break — `rg_locked`). */
  const [view, breakEnd] = await Promise.all([
    session ? applicantView(session.userId) : Promise.resolve(null),
    session ? Promise.resolve().then(() => isLockedOut(session.userId)).then(breakStateOf).catch(() => null) : Promise.resolve(null),
  ]);
  /**
   * 🔴 THE DOOR CLOSES ON NEW APPLICANTS, NEVER ON PEOPLE ALREADY INSIDE (four-lens review,
   * 2026-09-07). This was `if (!cfg.enabled) notFound()` above the read: switching the
   * programme off 404'd every applicant mid-flight — including one who had paid the fee and
   * was waiting for a decision — and turned the footer link into a dead end for them. The same
   * rule the engine already keeps (`policyFor`: `enabled` closes the DOOR, not the room) applies
   * to the page: someone with a live application, or an approved agent, still reads their state
   * here. Only a person with NOTHING on file meets the closed door.
   */
  const hasStanding = !!view && view.state !== "none";
  if (!cfg.enabled && !hasStanding) notFound();
  // The ONE gate every /profile/invite link sits beside: an approved agent in good standing.
  const viewer = session ? await inviteViewerFor(session.userId) : null;
  const fee = feeBreakdown(cfg);
  /**
   * ⭐ THE VAT SENTENCE, DERIVED FROM THE TREATMENT RATHER THAN ASSERTED.
   *
   * Under `EXCLUSIVE` (management's shipped decision, 2026-09-08) the published price is the
   * net and VAT sits on top, so the honest line is the sum — "TZS 100,000 + TZS 18,000 VAT" —
   * beside a headline that is already the total. Under `INCLUSIVE` the total IS the price and
   * the VAT is inside it. ⛔ Three surfaces used to state "VAT inclusive" in prose regardless,
   * including the binding terms.
   */
  /**
   * ⛔ NO VAT COMPONENT, NO VAT SENTENCE — both of these go SILENT when the computed VAT is
   * 0 (Ali set the registration fee VAT-free on 2026-09-09). Every string available here
   * asserts a VAT treatment: `feeVatPlus` renders "TZS 100,000 + TZS 0 VAT" and BOTH hint
   * strings end "VAT inclusive". At a zero rate each of them is a false statement about a
   * tax, on the public page that quotes the price, so the honest render is NEITHER.
   * `Stat` already guards `hint`, so dropping it renders nothing rather than an empty line.
   * ⭐ Keyed on the computed component, not on the rate or the treatment.
   */
  const noVat = fee.vatTzs === 0;
  const vatLine = noVat ? null : cfg.feeVatTreatment === "EXCLUSIVE"
    ? fill(t.agent.feeVatPlus, { net: formatTzs(fee.netTzs), vat: formatTzs(fee.vatTzs) })
    : t.agent.feeVatInclusive;
  const vatHint = noVat ? undefined : cfg.feeVatTreatment === "EXCLUSIVE" ? t.agent.statCostHintPlus : t.agent.statCostHint;
  /**
   * ⭐ THE WATERFALL'S RATES, READ LIVE FROM `market.config` — ⛔ never the cold-start
   * constants in `payout.ts`.
   *
   * The fee and the two levies are operator-editable at `/admin/config`, and a public page
   * quoting the module defaults would silently disagree with what settlement actually charges
   * the moment anyone touched that form. `getGlobalConfig()` is the persisted snapshot merged
   * over those defaults, which is the same thing `ratesFor` freezes onto each new market.
   *
   * ⚠️ The agent's own two numbers come from `agent-config` and are PERCENTS; the four fee
   * numbers are FRACTIONS. `WaterfallRates` names the scale on every field for that reason.
   */
  const rateCfg = await getGlobalConfig();
  const waterfallRates = {
    platformFeeRate: rateCfg.platformFeeRate,
    operatorFeeRate: rateCfg.operatorFeeRate,
    traTaxOnCommissionRate: rateCfg.traTaxOnCommissionRate,
    gbtLevyOnCommissionRate: rateCfg.gbtLevyOnCommissionRate,
    agentPct: cfg.defaultCommissionPct,
    withholdingPct: cfg.agentWithholdingTaxPct,
  };
  const mb = Math.round(MAX_DOC_BYTES / (1024 * 1024));
  const fmtDate = (iso: string) => formatEatDate(Date.parse(iso), Date.now(), t.common.monthsShort, locale);

  // ── The one CTA, decided by state ─────────────────────────────────────────
  type Cta = { kind: "signin" } | { kind: "kyc"; variant: "start" | "photos" | "view" | "fix" } | { kind: "apply" } | { kind: "continue" } | { kind: "status" } | { kind: "dashboard" } | { kind: "none" };
  let cta: Cta = { kind: "none" };
  /**
   * ⭐ AMBER ONLY WHERE SOMEBODY MUST ACT (R5-C, the second gold audit, 2026-10-09). Seven states wore `warning`, whose
   * `--warning-fg` was then `--gilt` (DESIGN_AUTHORITY F3; amber since Ali's ruling (1) of 2026-10-10) — gold on a page
   * where nothing is earned. §B11 gives amber one
   * meaning, "somebody must act", and decides these words once: a paused agent is DEACTIVATED, slate to the agent;
   * a final decision and a cooling-off date are terminal or inert; an RG lock is the neutral box R4-I gave every RG
   * notice; a refusal says "not available" — the Callout's `neutral` ("honest 'not available', guided elsewhere").
   * Only "an officer has asked for one more thing" stays amber: the applicant must act. (Its gilt is the token's,
   * the owner's to re-hue.)
   */
  let notice: { tone: "info" | "warning" | "success" | "neutral"; text: string } | null = null;
  if (!session) cta = { kind: "signin" };
  else if (view?.state === "agent") {
    cta = { kind: "dashboard" };
    notice = view.active ? { tone: "success", text: t.agent.stateAgent } : { tone: "neutral", text: t.agent.stateAgentPaused };
  } else if (view?.state === "invited") {
    /**
     * ⭐ A STATE MUST NAME ITS NEXT STEP. This read only "You have an invitation waiting" — true,
     * and a dead end: the invitation link is a single-use token we store only as a hash, so this
     * page cannot rebuild it. What it CAN do is say where the link is (emailed to them since
     * 2026-09-08), when it lapses, and who to ask if it is lost (four-lens review, 2026-09-07).
     */
    cta = { kind: "none" };
    notice = {
      tone: "info",
      text: view.invitationExpiresAt
        ? fill(t.agent.stateInvitedUntil, { date: fmtDate(view.invitationExpiresAt) })
        : t.agent.stateInvited,
    };
  } else if (view && view.state !== "none") {
    if (view.state === "in_progress") { cta = { kind: "continue" }; notice = { tone: "info", text: t.agent.stateInProgress }; }
    else if (view.state === "under_review") { cta = { kind: "status" }; notice = { tone: "info", text: t.agent.stateUnderReview }; }
    else if (view.state === "info_required") { cta = { kind: "continue" }; notice = { tone: "warning", text: t.agent.stateInfo }; }
    else if (view.state === "rejected") {
      cta = view.reapplyAt && new Date(view.reapplyAt).getTime() <= Date.now() ? { kind: "apply" } : { kind: "status" };
      notice = { tone: "neutral", text: view.reapplyAt ? fill(t.agent.stateCooldown, { date: fmtDate(view.reapplyAt) }) : t.agent.stateTerminal };
      if (view.reapplyAt && new Date(view.reapplyAt).getTime() <= Date.now()) notice = { tone: "info", text: t.agent.stateRejected };
    } else { cta = { kind: "apply" }; }
  } else if (view?.state === "none") {
    const e = view.eligibility;
    if (e.ok) cta = { kind: "apply" };
    else if (e.refusal === "kyc_required") {
      /**
       * ⭐ VERIFIED FROM TYPED DETAILS, THE PHOTOS STILL OWED (review R5.6, 2026-10-10). The programme asks for an
       * officer's approval of the document photos and a selfie (`photoIdentityVerified`); a player whose typed details
       * were approved has the identity and not the photos, so "identity verification comes first" was false to them —
       * they are told what IS left. An APPROVED status here is exactly that player: eligibility has already said the
       * photo approval is missing. ⚠️ B-1 — a deliberate degrade: a failed read keeps the general line, which opens the
       * same door (`/profile/kyc?for=agent` asks an approved identity for the photos alone).
       */
      // ⭐ …AND THE FILE'S OWN STATE (2026-10-10, the v4 screenshot pass): photos already with our team are named as
      // waiting, with the way to look at them — never "verify first" to someone who just did — and a refused or
      // corrections-asked file says it needs their attention.
      let status: string | null = null;
      try { status = (await getKycStatus(session.userId))?.status ?? null; } catch { /* B-1 — see above */ }
      const variant = status === "APPROVED" ? "photos" : status === "PENDING_REVIEW" ? "view"
        : status === "REJECTED" || status === "ADDITIONAL_INFO_REQUIRED" ? "fix" : "start";
      cta = { kind: "kyc", variant };
      notice = {
        tone: "info",
        text: variant === "photos" ? t.agent.stateKycPhotos
          : variant === "view" ? fill(t.agent.stateKycPending, { hours: durationHours(locale, KYC_REVIEW_SLA_HOURS) })
          : variant === "fix" ? t.agent.stateKycFix
          : t.agent.stateKyc,
      };
    }
    else if (e.refusal === "staff") { cta = { kind: "none" }; notice = { tone: "info", text: t.agent.stateStaff }; }
    else if (e.refusal === "cooldown") { cta = { kind: "none" }; notice = { tone: "neutral", text: fill(t.agent.stateCooldown, { date: e.until ? fmtDate(e.until) : "" }) }; }
    else if (e.refusal === "terminal_rejection") { cta = { kind: "none" }; notice = { tone: "neutral", text: t.agent.stateTerminal }; }
    else if (e.refusal === "rg_locked") { cta = { kind: "none" }; notice = { tone: "neutral", text: t.agent.stateRgLocked }; }
    else if (e.refusal === "already_agent") { cta = { kind: "dashboard" }; notice = { tone: "success", text: t.agent.stateAgent }; }
    else if (e.refusal === "programme_disabled") { cta = { kind: "none" }; notice = { tone: "info", text: t.agent.stateDisabled }; }
    else { cta = { kind: "none" }; notice = { tone: "neutral", text: t.agent.stateNotActive }; }
  }
  // R8-C · on a break the CTA that offers the programme — apply, continue, verify to apply — is withheld, and the
  // programme's own RG sentence stands under the state's notice (a reader with no application already reads it as the notice).
  const rgHeld = breakEnd !== null && (cta.kind === "apply" || cta.kind === "continue" || cta.kind === "kyc");
  // ⛔ …AND THE PHOTO INVITATION GOES WITH IT (2026-10-10, typed-only identity × R8-C): "add them, then come back to apply"
  // is an offer to join the programme as surely as the button it sits over, so on a break the state says nothing more —
  // the programme's own RG sentence below is the page's only word to this reader.
  if (rgHeld && cta.kind === "kyc" && cta.variant !== "start") notice = null;
  if (rgHeld) cta = { kind: "none" };

  return (
    <PageContainer tier="reading" className="space-y-6">
      <PageHeader eyebrow={t.agent.eyebrow} title={t.agent.title} subtitle={t.agent.heroSub} />

      {sp.refused && <Callout tone="neutral" size="md">{t.agent.applyRefused}</Callout>}
      {/* zh keeps its words whole (the hub's rule): a notice set by the browser broke inside 照片, 补充 and 申请. */}
      {notice && <Callout tone={notice.tone} size="md"><span className={locale === "zh" ? "break-keep [overflow-wrap:anywhere]" : undefined}>{notice.text}</span></Callout>}
      {rgHeld && <Callout tone="neutral" size="md">{t.agent.stateRgLocked}</Callout>}

      {/* ⭐ THE THREE FACTS A PARTNER DECIDES ON, above the fold, from config — ONE treatment (R5-C, the second gold audit,
          2026-10-09; tiles r5-4). They were three: a gold mono sentence ("10% ya ada halisi"), a gold mono amount
          ("GHARAMA TZS 100,000") and a white display sentence ("siku 5 za kazi"). None of the three is money earned:
          a commission RATE is a promise, and the fee is money the applicant PAYS — §M3a D1, "moving your own money …
          earns nothing, so gold overstates it"; Q5, "gold is money, and nothing else". So all three are the text's own
          ink, and all three are mono (§T5: every numeral is mono, a data sentence's included); the fee keeps `.amount`
          (§M4: money is never letter-spaced).
          ⭐ ON THE PAGE'S CONTENT EDGE (2026-10-09, the visual pass's round 3, tiles 195 and 196): the `glass` box pads
          14px and every section below it pads 20 (`p-4`), so these tiles' words stood at x147 over the sections' x153 at
          1280 and x31 over x37 at 390. `p-4` here, so one column keeps one edge. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat size="xl" boxed="glass" labelStyle="strong" font="mono" className="p-4"
          label={t.agent.statEarn}
          value={fill(t.agent.statEarnValue, { pct: String(cfg.defaultCommissionPct) })}
          hint={t.agent.statEarnHint} icon={<I.percent s={14} />} iconAlign="end" />
        {/* ⛔ THE HINT NAMES THE TREATMENT, IT DOES NOT ASSERT ONE. It read "VAT inclusive"
            unconditionally, so management's 2026-09-08 flip to EXCLUSIVE would have left the
            public page stating the opposite of what the applicant is charged. The figure
            above it is `fee.totalTzs` either way — what an applicant owes, never the net. */}
        <Stat size="xl" boxed="glass" labelStyle="strong" font="mono" className="p-4"
          label={t.agent.statCost}
          value={<span className="amount">{formatTzs(fee.totalTzs)}</span>}
          hint={vatHint} icon={<I.coins s={14} />} iconAlign="end" />
        <Stat size="xl" boxed="glass" labelStyle="strong" font="mono" className="p-4"
          label={t.agent.statTime}
          value={fill(t.agent.statTimeValue, { days: String(cfg.reviewSlaDays) })}
          hint={t.agent.statTimeHint} icon={<I.clock s={14} />} iconAlign="end" />
      </div>

      {/* The CTA — one, decided above. */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {cta.kind === "signin" && (
          <>
            <Link href={"/auth/login?next=/agent" as never}><Button variant="primary" size="lg" leading={<I.user s={16} />}>{t.agent.ctaSignIn}</Button></Link>
            <Link href={"/auth/register?next=/agent" as never}><Button variant="secondary" size="lg">{t.common.createAccount}</Button></Link>
          </>
        )}
        {/* ⭐ THE PHOTO TRACK, BY NAME (2026-10-10). A player's own identity step is typed details now, approved
            automatically, and that approval never opens this door: the agent programme keeps an officer's check of
            the document photos and a selfie (agent-identity.ts). Somebody with no application yet is not known to
            be an applicant, so the link says which track it wants, and next brings them back here. An identity
            already verified from typed details is asked for the photos by name (review R5.6). */}
        {cta.kind === "kyc" && (
          <Link href={"/profile/kyc?for=agent&next=/agent" as never}><Button variant="primary" size="lg" leading={<I.shieldcheck s={16} />}>{cta.variant === "photos" ? t.agent.ctaKycPhotos : cta.variant === "view" ? t.agent.ctaKycView : cta.variant === "fix" ? t.agent.ctaKycFix : t.agent.ctaKyc}</Button></Link>
        )}
        {cta.kind === "apply" && (
          <form action={startApplicationAction}>
            <Button type="submit" variant="primary" size="lg" leading={<I.arrowRight s={16} />}>{t.agent.ctaApply}</Button>
          </form>
        )}
        {cta.kind === "continue" && (
          <Link href={"/agent/apply" as never}><Button variant="primary" size="lg" leading={<I.arrowRight s={16} />}>{t.agent.ctaContinue}</Button></Link>
        )}
        {cta.kind === "status" && (
          <Link href={"/agent/status" as never}><Button variant="primary" size="lg" leading={<I.clock s={16} />}>{t.agent.ctaStatus}</Button></Link>
        )}
        {cta.kind === "dashboard" && inviteIsLiveFor(viewer) && (
          <Link href={"/profile/invite" as never}><Button variant="primary" size="lg" leading={<I.shieldcheck s={16} />}>{t.agent.ctaDashboard}</Button></Link>
        )}
        {cta.kind === "dashboard" && !inviteIsLiveFor(viewer) && (
          <Link href={"/profile/invite" as never}><Button variant="secondary" size="lg" leading={<I.clock s={16} />}>{t.agent.ctaDashboardPaused}</Button></Link>
        )}
        {view?.state === "agent" && view.active && <VerifiedAgentBadge label={t.agent.verifiedBadge} />}
      </div>

      {/* How it works */}
      <section className="rounded-xl glass-panel p-4">
        <p className="font-display text-title-sm font-bold leading-tight">{t.agent.howTitle}</p>
        <ol className="mt-3 space-y-3">
          {[t.agent.how1, t.agent.how2, t.agent.how3, t.agent.how4, t.agent.how5].map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              {/* Five steps, one numeral. The fifth ("… you earn") was a gold disc: a promise of commission is not money
                  earned (§M3, Q5; R5-C, 2026-10-09), so it is the royal disc of the four before it. */}
              <span
                className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full font-mono text-body-sm font-bold"
                style={{ background: "color-mix(in oklab, var(--royal-500) 18%, transparent)", color: "var(--royal-200)", border: "1px solid color-mix(in oklab, var(--royal-500) 36%, transparent)" }}
              >
                {i + 1}
              </span>
              <p className="pt-1 text-body-sm leading-snug text-text">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* The seven documents */}
      <section className="rounded-xl glass-panel p-4">
        <p className="font-display text-title-sm font-bold leading-tight">{t.agent.docsTitle}</p>
        <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[t.agent.docCv, t.agent.docRequest, t.agent.docSerikali, t.agent.docRefLetter1, t.agent.docRefId1, t.agent.docRefLetter2, t.agent.docRefId2].map((d, i) => (
            <li key={i} className="flex items-center gap-2 rounded-md border border-border bg-bg-overlay/40 px-3 py-2 text-body-sm">
              <I.idCard s={14} className="shrink-0 text-text-subtle" />
              <span>{d}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-body-sm leading-relaxed text-text-muted">{t.agent.docIdNote}</p>
        <p className="mt-1 font-mono text-body-sm text-text-subtle">{fill(t.agent.docHint, { mb: String(mb) })}</p>
      </section>

      {/* The fee — mono, and the text's own ink: money the applicant PAYS is not money earned (§M3a D1 "earns nothing,
          so gold overstates it"; Q5). The section is the glass panel its two siblings above are (R5-C, 2026-10-09). */}
      <section className="rounded-xl glass-panel p-4">
        <p className="font-mono text-micro uppercase eyebrow font-bold text-text-subtle">{t.agent.feeTitle}</p>
        <p className="mt-2 amount text-title-lg font-bold text-text">{formatTzs(fee.totalTzs)}</p>
        {vatLine ? <p className="mt-0.5 font-mono text-body-sm text-text-subtle">{vatLine}</p> : null}
        <p className="mt-3 text-body-sm leading-relaxed text-text">
          {/* NO DESTINATION ACCOUNT. The rail is the applicant own wallet (Ali, 2026-09-10),
              so feeBody -- "Pay {amount} to {name}, account {account}, then upload the receipt
              and enter its reference" -- is false in all three languages and is REPLACED rather
              than reworded. Passing the destination into a rendered template here also published
              it to every anonymous visitor: PSC-02 visible half, the flight-payload half being
              the gated panel below. */}
          {fillNodes(t.agent.feeBodyWallet, { amount: <span className="amount font-semibold">{formatTzs(fee.totalTzs)}</span> })}
        </p>
        <p className="mt-2 text-body-sm leading-relaxed text-text-muted">{fill(t.agent.feeRefund, { days: String(cfg.refundDeadlineDays) })}</p>
      </section>

      {/* How to pay it, on the page that first states the fee — so an applicant knows
          before they start that there is nothing to type. Same component and same
          safety rule as the one inside the form; it renders nothing unless the fee
          destination IS the Lipa number the QR encodes. */}
      {/* GATED AT THE CALL SITE, NOT INSIDE THE COMPONENT -- PSC-02.

          LipaQrPanel is "use client", so Next.js serialises the props a SERVER component hands
          it into the RSC flight payload embedded in the HTML -- WHATEVER the component returns.
          shouldShowLipaQr returning false stops the RENDER and not the SEND, so this call
          published the merchant name, the Lipa number, the USSD code, the asset path and the fee
          destination account to every anonymous visitor of a publicly-readable page, for a
          programme that was WITHDRAWN. Measured on the live page: three occurrences of the
          account digits and one of the Lipa number.

          "Renders nothing" and "sends nothing" are different claims, and only the second is
          worth anything here -- so the gate moves OUT to the caller.

          THE MACHINERY IS UNTOUCHED, deliberately. lipa.ts, lipa-config.ts and the panel are
          exactly as they were, and LIPA_QR_RELEASED is not tidied away: 0.6 forbids re-enabling
          the QR OR deleting its machinery, and declining to render a panel whose gate is shut is
          neither. Flip the flag and this call site comes back on its own.
          npm run test:agent-fee-wallet-path 4.1 holds it. */}
      {LIPA_QR_RELEASED && (
        <LipaQrPanel lipa={lipaDisplay()} account={cfg.feeDestinationAccount} amountTzs={fee.totalTzs} />
      )}

      {/* ⭐ HOW YOU ARE PAID — the terms, then management's waterfall underneath them.
          The paragraph that used to sit here ("Commission is a share of the net operator
          fee…") was struck out in their 2026-09-08 feedback and replaced by the table: a
          partner about to pay the registration fee wants to FOLLOW the arithmetic, not be told its
          shape. The five bullets stay — they are the CONTRACT (window, cap, single level),
          which is a different question from where the money comes from. */}
      <section className="rounded-xl glass-panel p-4 space-y-2">
        <p className="font-display text-title-sm font-bold leading-tight">{t.agent.earnTitle}</p>
        <ul className="space-y-1.5 text-body-sm text-text-muted leading-snug list-disc pl-4">
          <li>{cfg.commissionWindowMonths === 0 ? t.agent.earnLifetime : fill(t.agent.earnWindow, { months: String(cfg.commissionWindowMonths) })}</li>
          <li>{cfg.capPerRecruitTzs === 0 ? t.agent.earnUncapped : fillNodes(t.agent.earnCapped, { amount: <span className="amount">{formatTzs(cfg.capPerRecruitTzs)}</span> })}</li>
          <li>{t.agent.earnNoPrize}</li>
          <li>{t.agent.earnSingleLevel}</li>
          <li>{t.agent.recruiterOnly}</li>
        </ul>
      </section>

      {/* Management's financial waterfall. ⛔ Every figure derived, none typed — see
          `src/lib/agent-commission.ts` and `test:commission-bounded` §7. */}
      <CommissionWaterfall t={t} rates={waterfallRates} />

      <p className="text-center text-body-sm text-text-subtle">
        <Link href={"/legal/agent-terms" as never} className="text-brand-300 underline-offset-2 hover:underline">{t.agent.termsLink}</Link>
      </p>
    </PageContainer>
  );
}
