import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { keepFigures, keepLastWords } from "@/components/ui/keep-words";
import { BackLink } from "@/components/ui/back-link";
import { formatNumber } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { PageHero } from "@/components/ui/page-hero";
import { FieldLegend } from "@/components/ui/field-legend";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { getKycStatus, startKyc } from "@/lib/server/kyc-service";
import { agentIdentityIntent, photoIdentityVerified } from "@/lib/server/agent-identity";
import { DateSelect } from "@/components/ui/date-select";
import { Input, Field as KitField } from "@/components/ui/input";
import { FilterPill } from "@/components/ui/filter-pill";
import { SubmitButton } from "@/components/ui/submit-button";
import { verifyIdentityAction, saveAgentIdentityAction, sendPhotosForReviewAction, restartKycAction } from "./actions";
import { isFinalRefusal } from "@/lib/kyc-refusal";
import { KYC_REVIEW_SLA_HOURS } from "@/lib/kyc-sla";
import { durationHours } from "@/lib/duration-phrase";
import {
  ID_DOC_TYPES,
  ID_DOC_SPECS,
  DOC_SLOT_LABEL_KEY,
  isIdDocType,
  isExpired,
  photoSetComplete,
  type IdDocType,
} from "@/lib/id-documents";
import { KycDocUploader } from "@/components/profile/kyc-doc-uploader";
import { RewardBurst } from "@/components/brand/reward-burst";
import { SUPPORT_EMAIL } from "@/lib/server/support-config";
import { getPayoutStatus, payoutsAcceptingRequests } from "@/lib/server/payout-status";
import { getServerT, type Dict, type Locale } from "@/lib/i18n-server";
import { bannerFor } from "@/lib/failure-banner";
import { PageContainer } from "@/components/layout/page-container";
import { isSafePath } from "@/lib/safe-next";
import { EmailResendInline } from "@/components/profile/email-resend-inline";
import { resolveSimpleJourney } from "@/lib/server/journey-preview";

/**
 * /profile/kyc — IDENTITY, ON TWO TRACKS (owner ruling, Ali, 2026-10-10; plan
 * `hello-we-are-workong-elegant-panda`, SPEC §5).
 *
 * ⭐ TYPED (every player, the default). ONE form — the document chooser, its number, an expiry where the document has
 * one, the full name; the date of birth is the ACCOUNT's, shown read-only and typed only when the account has none —
 * and ONE press (`verifyIdentityAction` → `verifyIdentity`). The answer is the page: verified at once (the verified
 * card, with Continue to the safe `next`), sent to an officer ("We're checking your details"), or refused (the refusal
 * card). An officer may only ask for CORRECTIONS of these details: the note shows above the form, prefilled; on an
 * account approved once the document and its number are shown read-only (only the name and expiry may change —
 * `identity_number_locked` on the server).
 *
 * ⭐ AGENT (agent applicants only — Ali's ruling 4: agents keep photo identity reviewed by an officer). Chosen by
 * `?for=agent`, by `agentIdentityIntent` (an agent application in flight or a bound invitation), or by a row that
 * already holds photos and is not approved (a photo case is finished as one). The classic two steps: details
 * (`saveAgentIdentityAction`), then the document's photos and a selfie (`KycDocUploader` per `requiredSlots`) and the
 * send (`sendPhotosForReviewAction`). On an account already verified from typed details it asks only for the photos,
 * and an officer's photo approval (`photoVerifiedAt`) reads "verified for the agent programme". When that account's
 * document has expired since, the photo step is a notice and the route to support instead (review R5.4): the send would
 * be refused, and an approved identity's document cannot change here.
 *
 * ⛔ No player uploads outside the agent track, and no extra-document uploads at all: requests an officer made before
 * 2026-10-10 render as text only (`KycExtraDocUploader` and `attachExtraDocument` are deleted).
 */

// Localised tab title (POLISH-BACKLOG §1.7) — was the hard-coded English
// "Verify identity", which a Swahili player saw in their browser tab and history.
// 2026-09-14 — a neutral noun, true in every state: the command "Verify your identity" sat in the tab of a
// verified player and of a final refusal that cannot be restarted.
export async function generateMetadata() {
  const { t } = await getServerT();
  return { title: t.profile.kycIdentityVerification };
}

type KycSearch = {
  welcome?: string; reason?: string; id?: string; idType?: string; idNumber?: string; idExpiry?: string;
  submitted?: string; fullName?: string; dob?: string; next?: string; for?: string; verified?: string; sent?: string;
};

export default async function KycPage({ searchParams }: { searchParams?: Promise<KycSearch> }) {
  const { t, locale } = await getServerT();
  // ⭐ ZH BREAKS ONLY AT PUNCTUATION ON THIS PAGE (keep-all; overflow-wrap still wraps a run longer than its line) — the
  // screenshot pass of 2026-10-10 found words split across lines at 320–390. Every zh sentence here carries commas at
  // its phrase boundaries, so keep-all has places to break.
  const zhKeep = locale === "zh" ? "break-keep [overflow-wrap:anywhere]" : "";
  // A field's hint, one way on this page: its last two words kept together (`keepLastWords`: one word alone on a last
  // line was the screenshot pass's other finding) and, in zh, broken at punctuation only.
  const hintText = (text: string): ReactNode => (zhKeep ? <span className={zhKeep}>{text}</span> : keepLastWords(text));
  const session = await currentSession();
  if (!session) redirect("/auth/login?next=/profile/kyc");

  // READ BEFORE START. `startKyc()` RESETS a REJECTED submission — it nulls the
  // identity tuple (idType, idNumber, idExpiry, idVerifiedAt), rejectReason,
  // rejectNote and empties documents
  // (kyc-service.ts `restartedSubmission`). Calling it unconditionally here wiped the rejection
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

  const given: KycSearch = (await searchParams) ?? {};
  const banner = bannerFor(given.reason, t.error as unknown as Record<string, string>);
  // Safe internal return target (IA review R6) — a gated action (e.g. Withdraw)
  // sends `?next=/wallet/withdraw`; on approval we offer a "Continue" CTA back
  // to it. Reject anything that isn't a same-site absolute path (no open redirect) — the one shared rule, which also
  // refuses a backslash-prefixed path and control characters (this private copy refused neither until 2026-10-06).
  const nextHref = isSafePath(given.next) ? given.next : null;
  const idDone = !!kyc?.idVerifiedAt;

  const documents = kyc?.documents ?? [];
  const hasDoc = (dt: string) => documents.some((d: { docType: string }) => d.docType === dt);
  const approved = kyc?.status === "APPROVED";
  const pending = kyc?.status === "PENDING_REVIEW";
  const rejected = kyc?.status === "REJECTED";
  // 2026-09-13 — a FINAL refusal (under 18, sanctions, identity used on another account) is closed to
  // the player: `startKyc` refuses a restart, so the rail, the step forms and the "resubmit" sentence
  // would all be offering a journey the server refuses. The page says what the withdraw panel says.
  const finalRefusal = rejected && isFinalRefusal(kyc?.rejectReason ? String(kyc.rejectReason) : null);
  const needsInfo = kyc?.status === "ADDITIONAL_INFO_REQUIRED";
  // An officer's approval WITH the full photo set and selfie — the agent programme's identity gate. An automatic
  // approval from typed details never sets it. ⛔ THE GATE'S OWN PREDICATE (`photoIdentityVerified`: APPROVED + the
  // officer's photo stamp + the photo set still on file), never a second reading of the stamp alone — this screen must
  // never say "verified for the agent programme" to an account the agent gates then refuse.
  const photoVerified = photoIdentityVerified(kyc);
  // A PHOTO CASE: the document's whole photo set is on file (an agent applicant's, or one sent before 2026-10-10).
  // It decides how a case with our team is described — photos, or typed details.
  const photoCase = photoSetComplete(kyc?.idType, documents.map((d: { docType: string }) => d.docType));

  /**
   * ⭐ WHICH TRACK. `?for=agent` (the agent CTA and invitation links), an agent application in flight or a bound
   * invitation (`agentIdentityIntent`, WP-AGENT's one question), or a PHOTO CASE that is with our team or was sent
   * back for corrections — such a case is finished as a photo case, never re-asked as typed details on top of its
   * images. ⛔ NOT "any row holding photos": an ordinary player with a partial photo set left from before 2026-10-10,
   * still IN_PROGRESS, would be held on the photo track with no way back (Try again appears only on a refusal). That
   * player verifies with typed details like everyone else; the photos stay on file as evidence.
   * ⚠️ B-1 — a DELIBERATE degrade on the intent read alone: a failed read draws the typed form, which every account may
   * use (an applicant verified that way is asked for the photos next time the agent screen sends them here). It is
   * never a reason to draw nothing — this page is the identity door for every withdrawal.
   */
  let agentIntent = false;
  if (given.for !== "agent") {
    try { agentIntent = await agentIdentityIntent(session.userId); } catch { /* B-1 — deliberate degrade, see above */ }
  }
  const agentMode = given.for === "agent" || agentIntent || (photoCase && (pending || needsInfo));
  const agentVerified = approved && photoVerified;
  // WHAT HAS BEEN HANDED IN ON THIS TRACK. Typed: the details are with an officer, or approved. Agent: the photos are
  // with an officer, or an officer approved them — an account verified from typed details has handed in nothing yet.
  const submitted = pending || (agentMode ? agentVerified : approved);

  /**
   * WHICH DOCUMENT THIS SCREEN IS ABOUT.
   *
   * ⭐ THE RECORD DECIDES where the document can no longer change on this screen: an account approved once that an
   * officer asked to correct (`numberLocked` — the type and number are reserved to it, `identity_number_locked`),
   * and an agent case whose details are saved (its photo slots belong to that document; a stale link must never show
   * another document's slots). Otherwise the URL decides — which is what makes a refused submit round-trip to the
   * SAME form — then the document the row already holds, then NIDA rather than an empty chooser.
   */
  const rowType: IdDocType | null = isIdDocType(kyc?.idType) ? (kyc!.idType as IdDocType) : null;
  const numberLocked = needsInfo && !!kyc?.approvedAt && !!rowType && !!kyc?.idNumber;
  // ⛔ THE DOCUMENT ON FILE HAS EXPIRED (review R5.4, 2026-10-10) — asked with the SERVER'S own rule (`isExpired`, the
  // check `submitForReview` makes before it sends a photo case), so this page never offers a send the server refuses
  // (`id_expired`). On an APPROVED identity it turns the agent upgrade's photo step into a notice and the route to support
  // (the identity step is locked there); on an agent case not yet approved it hands the details form BACK, chooser and
  // all, so a valid document can be entered (saving a different document drops the old one's photos, kyc-service).
  const docExpired = isExpired(kyc?.idExpiry ? String(kyc.idExpiry) : null, new Date());
  const agentDocExpired = agentMode && idDone && !approved && !pending && docExpired;
  const recordDecides = numberLocked || (agentMode && idDone && !agentDocExpired);
  const chosenType: IdDocType =
    (recordDecides ? rowType : null) ??
    (isIdDocType(given.idType) ? given.idType : rowType ?? "NIDA");
  const spec = ID_DOC_SPECS[chosenType];
  const idLabel = (t.profile as unknown as Record<string, string>)[spec.labelKey];

  /**
   * THE FORM'S VALUES: what the last refused press carried on the query string, or else what the row already holds
   * (a correction asked for, or details saved before 2026-10-10 with their photos missing — prefilled, so one press
   * finishes them). ⛔ The number is the row's only for the row's OWN document: switching document deliberately drops
   * it rather than checking one document's number against another's rule. A locked number is always the row's.
   */
  const fromRow = !rejected && rowType === chosenType ? kyc : null;
  const sp = {
    ...given,
    idNumber: numberLocked ? (kyc?.idNumber ?? "") : (given.idNumber ?? fromRow?.idNumber ?? undefined),
    idExpiry: given.idExpiry ?? (fromRow?.idExpiry ? String(fromRow.idExpiry).slice(0, 10) : undefined),
    fullName: given.fullName ?? (rejected ? undefined : kyc?.fullName ?? undefined),
  };
  // The track and the return target ride on every link the page draws back to itself (the document chooser), so
  // choosing a passport never drops an agent applicant onto the typed form, or a withdrawing player's Continue.
  const carry = `${given.for === "agent" ? "&for=agent" : ""}${nextHref ? `&next=${encodeURIComponent(nextHref)}` : ""}`;

  const hasEmail = !!user?.email;
  const emailVerified = !!user?.emailVerifiedAt;
  // ⛔ PROGRESS IS COUNTED AGAINST THE SLOTS THIS DOCUMENT NEEDS, never against a
  // literal 3. A passport needs two; "2/3 attached" on a complete passport submission
  // is the screen telling the player they are not finished when they are.
  const requiredSlots = spec.requiredSlots;
  const attachedCount = requiredSlots.filter((s) => hasDoc(s)).length;
  const allAttached = attachedCount >= requiredSlots.length;
  // 2026-09-13 — once the documents are HANDED IN, the ID and selfie steps are done by
  // STATUS, not by re-counting slots: the rail marked SELFIE current on a pending submission.
  const docsHandedIn = submitted || (needsInfo && documents.length > 0);
  // An officer's EARLIER document requests that were never answered (before 2026-10-10). Shown as text only: nothing
  // is attached to them any more, and they no longer hold a send back (`submitForReview` dropped that gate).
  const openRequests = (kyc?.extraRequests ?? []).filter((rq: { storageKey: string | null }) => !rq.storageKey);
  const rejectLabel = humanizeRejectReason(kyc?.rejectReason ? String(kyc.rejectReason) : null, t);

  // THE IDENTITY FORM. Typed: whenever identity is not settled — nothing sent yet, or a correction asked for. Agent:
  // until the details are saved, and again when an officer asks to correct them (the photos follow below).
  const showIdentityForm = !rejected && !submitted && (agentMode ? !approved && (!idDone || needsInfo || agentDocExpired) : true);

  // E-5, AND ITS LATER CHAPTERS. The burst once read "You can now deposit and withdraw
  // freely", which was wrong twice over: deposits were not KYC-gated at all, so approval
  // never unlocked them, and the burst rendered directly beneath the banner telling the
  // player to confirm their email before adding money. It was then narrowed to say only
  // what approval really unlocked. From 2026-09-05 to 2026-09-13 approval did unlock
  // depositing, playing and cashing out, and the copy widened to match.
  //
  // ⭐ FROM 2026-09-13 APPROVAL OPENS CASHING OUT AND NOTHING ELSE (`kyc-gate.ts`), so both
  // sentences speak of that alone: `kycApprovedBody` says cashing out is open;
  // `kycApprovedPayoutsPaused` says the identity is verified but withdrawals are paused for
  // everyone and the balance is safe. ⛔ Neither may name adding money or playing — those
  // never waited on this approval, and saying approval opened them re-teaches the old ladder.
  // ⛔ And the DISCIPLINE that narrowed it the first time does not relax: the second gate is
  // still real. When the payout provider cannot pay, /wallet/withdraw refuses regardless of
  // identity, so the burst still ASKS the live gate instead of assuming it. Promising a payout
  // at the player's proudest moment that the next screen refuses is the defect, not the
  // specific sentence. `test:kyc-approved-copy` pins this selection.
  //
  // ⚠️ Default to `operational` on failure, matching derivePayoutStatus's own fallback —
  // an unreachable DB is not evidence that payouts are down.
  let payoutsAccepting = true;
  try {
    payoutsAccepting = payoutsAcceptingRequests((await getPayoutStatus()).status);
  } catch { /* B-1 — deliberate degrade, see rationale above */ }

  // ⭐ 2026-09-14 — AND THE THIRD GATE IS THIS PLAYER'S OWN WALLET. A wallet that is not ACTIVE (an officer hold, a
  // self-exclusion) refuses a withdrawal whatever the identity says, and /wallet/withdraw draws its `frozen` panel
  // there. The approved card told that player "it covers your withdrawals from now on" with a link to the refusal.
  // Read exactly as the withdraw page reads it; a missing row is not "held", and a failed read keeps today's copy.
  let walletHeld = false;
  if (kyc?.status === "APPROVED") {
    try {
      const wallet = await db.wallet.findByUserId(session.userId);
      walletHeld = !!wallet && wallet.status !== "ACTIVE";
    } catch { /* B-1 — deliberate degrade: an unreadable wallet is not evidence of a hold */ }
  }

  /**
   * THE HERO SPEAKS FOR THE STATE (2026-09-14), per track. ⛔ An account verified from typed details that came here for
   * the agent programme gets NO hero sentence: "nothing more to do" would be false, and the photo card below says
   * what is asked. Every review time is the one figure, KYC_REVIEW_SLA_HOURS, and only the agent track names one up
   * here — a typed verification is decided on the press.
   * ⭐ WHILE A CASE IS WITH OUR TEAM THE h1 IS THE STATUS ("We're checking your details" / "…your documents") and there is
   * NO hero sentence (the screenshot pass, 2026-10-10): the waiting card below says what we do and when, once. The h1,
   * a hero sentence and the card each said "checking" — three times on one screen.
   */
  const heroBody: string | null = approved
    // The agent track says nothing up here (2026-10-10): its card speaks — the photos asked for, an expired document, or
    // "verified for the agent programme" with Continue — and "nothing more to do here" sat over that very Continue.
    ? (agentMode ? null : t.profile.verifyBodyApproved)
    : pending
      ? null
      : needsInfo
        ? t.profile.verifyBodyMoreInfo
        : rejected
          ? t.profile.verifyBodyRejected
          : agentMode
            ? t.profile.verifyBodyAgent
            : t.profile.verifyBody;

  /**
   * THE RAIL, per track.
   * · typed — the document, then Verified; a Review node only while an officer has the case, or once an officer
   *   approved it (ticked: that identity WAS reviewed — `reviewerId` is set only by an officer's approval). A typed
   *   verification is decided on the press, so a review step on every rail would describe a wait most players never
   *   have: an automatic approval is the two-node rail.
   * · agent — the classic four: the document's details, its photos, the officer's review, verified (for the agent
   *   programme: an officer's photo approval, not an automatic one).
   * ⛔ The first node is named after the document the player actually chose. It said "NIDA" unconditionally, which on a
   * passport journey labelled the step after a document the player never touched.
   */
  const officerApproved = approved && !!kyc?.reviewerId;
  const railNodes: { label: string; glyph: keyof typeof I; done: boolean }[] = agentMode
    ? [
        { label: idLabel,                glyph: "idCard",      done: idDone || docsHandedIn },
        // More information asked for puts the CURRENT ring back on this step: it is the player's move (visual pass 2).
        // Done only once the photos are SENT (2026-10-10, the v4 pass): with every slot attached and nothing sent, the rail
        // lit REVIEW as the current step — a player could leave believing the case was with our team.
        { label: t.profile.documents,    glyph: "camera",      done: !needsInfo && docsHandedIn },
        { label: t.profile.review,       glyph: "shieldcheck", done: agentVerified },
        // Not a tick until it is done: with the tinted success discs, an undone "check" read as finished (pass 2).
        { label: t.profile.stepVerified, glyph: "star",        done: agentVerified },
      ]
    : [
        { label: idLabel,                glyph: "idCard",      done: approved || pending },
        ...(pending || officerApproved ? [{ label: t.profile.review, glyph: "shieldcheck" as const, done: approved }] : []),
        { label: t.profile.stepVerified, glyph: "star",        done: approved },
      ];
  const continueHref = agentMode ? (nextHref ?? "/agent") : nextHref;
  // The track and the return target, posted by every form that redirects back here.
  const carriedInputs = (
    <>
      {agentMode && <input type="hidden" name="for" value="agent" />}
      {nextHref && <input type="hidden" name="next" value={nextHref} />}
    </>
  );

  // ⭐ In the journey the Akaunti hub opens this page and lights its tab here: the back link names the hub and falls back
  // to it (round 6, 2026-10-09, the review's back-link finding — it said "‹ WASIFU", and with no history went to /profile).
  const { journey } = await resolveSimpleJourney();
  return (
    <PageContainer tier="form" className="space-y-5">
      <BackLink fallbackHref={journey ? "/account" : "/profile"} label={journey ? t.journey.tabAccount : t.common.profile} />

      {banner && (
        <div role="alert" className={`rounded-xl border border-danger-border bg-danger-bg px-4 py-3 text-[13px] text-danger-fg ${zhKeep}`}>
          {banner.body}
        </div>
      )}
      {/* The agent track's step 1 saved (its photos come next). The typed track has no such interim: its press decides. */}
      {sp.id === "accepted" && !banner && (
        <div role="status" className={`rounded-xl border border-success-border bg-success-bg px-4 py-3 text-[13px] text-success-fg ${zhKeep}`}>
          {t.profile.kycIdAccepted}
        </div>
      )}
      {hasEmail && !emailVerified && idDone && !showIdentityForm && (
        // ⭐ THE CONFIRMED EMAIL, ONCE IDENTITY IS DONE (the form row below carries it while the form is drawn — and from
        // 2026-10-10 a typed row with saved details still draws the form, so the two never stack). 2026-10-07: NEUTRAL,
        // never gold — §M3 keeps gold for earned money, and the profile pill one tap earlier calls the same state neutral.
        // The sign-up link expires after 24 h, so a new one is offered HERE, beside the door to fix a mistyped address.
        <div data-kyc-email-callout className="rounded-xl border border-border bg-bg-elevated px-4 py-3 flex items-start gap-2.5">
          <I.mail s={16} className="text-brand-300 mt-0.5 shrink-0" />
          <div className={`min-w-0 text-body-sm text-text-muted leading-snug ${zhKeep}`}>
            <p className="font-display font-semibold text-text text-balance">{t.profile.kycConfirmEmail}</p>
            <p className="mt-0.5">
              {t.profile.kycConfirmEmailBody} <span className="font-mono text-text break-all">{user?.email}</span>
            </p>
            <EmailResendInline className="mt-2">
              <Link href="/profile/account" className="btn btn-ghost btn-sm btn-pill inline-flex items-center gap-1.5">
                <I.user s={14} />
                {t.wallet.verifyChangeEmailCta}
              </Link>
            </EmailResendInline>
          </div>
        </div>
      )}
      {/* The agent track's photo send. */}
      {sp.submitted && !banner && (
        <div role="status" className={`rounded-xl border border-success-border bg-success-bg px-4 py-3 text-[13px] text-success-fg ${zhKeep}`}>
          {t.profile.kycSubmitted}
        </div>
      )}

      {/* ⛔ THE "WELCOME, NEW PLAYER" BLOCK THAT STOOD HERE IS DELETED (2026-09-13), with its four
          dictionary keys. From 2026-09-05 every new account was redirected to this page, so it greeted
          them and explained that verifying opened adding money and playing. From 2026-09-13 a new
          account lands where it was going, or on adding money (`auth/register/actions.ts`), and
          reaches this page only by choosing to verify — so the block had no audience, and its
          sentence was false. */}

      <PageHero glow="info">
        <PageHeader
          icon={<I.shieldcheck s={14} />}
          eyebrow={t.profile.kycIdentityVerification}
          eyebrowTight={locale === "sw"}
          title={kyc?.status === "APPROVED" ? t.profile.verifyTitleApproved : finalRefusal ? t.kycGate.titleRejected : pending ? (photoCase ? t.kycGate.titlePendingAgent : t.profile.kycCheckingTitle) : t.profile.verifyIdentity}
        />
        {/* 2026-09-13 — balanced: the zh more-info sentence left "方。" alone on its last line at 360.
            2026-09-14 — a final refusal takes the withdraw panel's own title for that state and NO body, because the
            refused card below explains it and no sentence may say it twice.
            2026-10-10 — the review time is a figure and its unit, kept on one line ("24 hours", "saa 24"). */}
        {!finalRefusal && heroBody && (
          <p className={`mt-2 text-[13px] text-text-muted leading-snug max-w-prose text-balance ${zhKeep}`}>
            {keepBody(heroBody.replace("{hours}", durationHours(locale, KYC_REVIEW_SLA_HOURS)))}
          </p>
        )}
      </PageHero>

      {rejected && (
        // ⛔ APP-STATE DANGER, NOT THE BETTING NO RED (2026-09-13) — DESIGN_AUTHORITY §B2a keeps that ink
        // for the NO side of a stake. Box, disc and ink are the kit Callout's danger tone, verbatim.
        <section role="alert" className="rounded-xl border border-danger-500/50 bg-danger-500/10 p-4 lg:p-5">
          <div className="flex items-start gap-3">
            {/* ⚠️ LITERALS, not `h-9 w-9` — spacing is overridden (tailwind.config.ts:200-215),
                so `h-9` renders 64px. This is the surface that gates every withdrawal. */}
            <span className="inline-flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full bg-danger-500/15 text-danger-fg">
              <I.alertCircle s={18} />
            </span>
            <div className="min-w-0">
              {/* 2026-09-14 — a FINAL refusal is "Refused", the word its own body uses; "Rejected" reads as retryable. */}
              <p className="font-display text-[14px] font-bold text-danger-fg text-balance">{finalRefusal ? t.profile.refusedFinal : t.profile.rejected}</p>
              {/* ⭐ THREE LINES, NOT ONE RUN-ON (the screenshot pass, 2026-10-10): the reason, the officer's note and the
                  instruction ran together as one sentence ("Reason: … . <note> Tap Try again…"). zh breaks at punctuation
                  only (kyc-gate-panel's rule): a quoted button name was split after its first character.
                  2026-09-13 — zh stops are full-width: "原因：…。" read "原因: ….", ASCII set in a Chinese sentence. */}
              {rejectLabel && (
                <p className={`mt-1 text-body-sm text-text-muted leading-snug ${zhKeep}`}>
                  {t.profile.kycRejectReason}{locale === "zh" ? "：" : ": "}<span className="font-semibold text-text">{rejectLabel}</span>{locale === "zh" ? "。" : "."}
                </p>
              )}
              {/* The officer's note is the officer's own words, under a label that says whose they are, with its line
                  breaks kept — as the corrections card shows its note (semibold, the text's own ink). */}
              {kyc?.rejectNote && (
                <div data-kyc-reject-note className="mt-2.5 border-l-2 border-danger-500/40 pl-3">
                  <p className={`text-body-sm text-text-subtle leading-snug ${zhKeep}`}>{t.profile.kycRejectNoteLabel}</p>
                  <p className={`mt-0.5 text-body-sm font-semibold text-text leading-snug whitespace-pre-line [overflow-wrap:anywhere] ${locale === "zh" ? "break-keep" : ""}`}>{kyc.rejectNote}</p>
                </div>
              )}
              {/* A final refusal cannot "re-enter your details below and resubmit" — there is no below. The stop after
                  the address stays OUTSIDE the link, so it is never part of it. */}
              {!finalRefusal && (
                <p className={`mt-2.5 text-body-sm text-text-muted leading-snug ${zhKeep}`}>
                  {keepLastWords(t.profile.kycResubmitOrEmail)}{" "}
                  <a href={`mailto:${SUPPORT_EMAIL()}?subject=KYC%20review`} className="text-brand-300 underline-offset-2 hover:underline">{SUPPORT_EMAIL()}</a>{locale === "zh" ? "。" : "."}
                </p>
              )}
              {/* ⭐ A FINAL refusal (under 18, sanctions, identity used on another account) is NOT
                  restarted by the player (2026-09-13 — `startKyc` refuses it, `kyc-refusal.ts`): the
                  wallet is frozen and an officer decides the balance. So this page offers the route to
                  support and says why, instead of a "try again" the server would refuse.
                  ⭐ THE SAME WORDS AS THE WITHDRAW PANEL'S `refused_final` state (`kycGate.*`), so the two
                  screens cannot tell one player two stories. The route stays this page's own support
                  email, with the address visible for a phone that has no mail app.
                  A recoverable refusal keeps the restart. Restarting CLEARS the submission, so it must
                  be a deliberate tap, never a page load — see the read-before-start note above. It posts the
                  track and the return target, so the form it brings back is the same one. */}
              {finalRefusal ? (
                <div data-kyc-refused-final="1" className="mt-3">
                  <p className={`text-body-sm text-text leading-snug ${zhKeep}`}>{keepLastWords(t.kycGate.bodyRefusedFinal)}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <a
                      href={`mailto:${SUPPORT_EMAIL()}?subject=KYC%20review`}
                      className="btn btn-primary btn-md btn-pill inline-flex items-center gap-1.5"
                    >
                      <I.mail s={14} />
                      {t.kycGate.ctaSupport}
                    </a>
                    {/* The link blue, hover included, as this page's other address is (Ali's ruling (2) of 2026-10-10,
                        §B4c) — it was the muted ink. */}
                    <a href={`mailto:${SUPPORT_EMAIL()}`} className="font-mono text-body-sm text-brand-300 hover:text-brand-200 underline underline-offset-2 select-all">{SUPPORT_EMAIL()}</a>
                  </div>
                </div>
              ) : (
                <form action={restartKycAction} className="mt-3">
                  {carriedInputs}
                  <SubmitButton label={t.error.tryAgain} pendingLabel={t.common.loading} />
                </form>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ⭐ THE CORRECTIONS CARD IS THE AMBER FAMILY, NOT THE MONEY RAMP (R5-C, the second gold audit, 2026-10-09).
          §B11 decides this word once — `ADDITIONAL_INFO_REQUIRED` is player amber: the applicant must act — and amber is
          the `--warning-*` family. This box was `--gold-700`/`--gold-500`/`--gold-300`, the tokens money owns (Q5). It
          still read warm while `--warning-fg` was `--gilt`; the owner re-hued the family on 2026-10-10 (Ali's ruling (1):
          warnings are amber, not gold), so the box is amber now. From 2026-10-10 the ask is a CORRECTION of typed details:
          the officer's note, then the form — and the heading says so ("Check your details", the withdraw panel's own title
          for this state; it read "More information needed" until review R5.10). */}
      {needsInfo && (
        <section role="status" className="rounded-xl border border-warning-border bg-warning-bg p-4 lg:p-5">
          <div className="flex items-start gap-3">
            {/* ⚠️ LITERALS — see the rejected-medallion note above. `h-9` is 64px here. */}
            <span className="inline-flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full bg-warning-bg text-warning-fg">
              <I.info s={18} />
            </span>
            <div className="min-w-0">
              <p className="font-display text-[14px] font-bold text-warning-fg text-balance">{t.profile.kycMoreInfo}</p>
              {/* zh sets sentences with no joining space; a space there reads as a typo.
                  2026-09-14 — and in zh each sentence is ONE unit (inline-block), so the line breaks at the full stop
                  and never inside a word: balanced at 1280 it split a two-character word across the break. A sentence
                  longer than its line still wraps inside itself — at its commas (keep-all, 2026-10-10). en and sw are
                  unchanged. */}
              <p className={`mt-1 text-body-sm text-text-muted leading-snug text-balance ${zhKeep}`}>
                <span className={locale === "zh" ? "inline-block" : undefined}>{kyc?.rejectNote ? <span className="font-semibold text-text">{kyc.rejectNote}</span> : t.profile.kycMoreInfoBody1}</span>
                {locale === "zh" ? "" : " "}
                <span className={locale === "zh" ? "inline-block" : undefined}>{t.profile.kycMoreInfoBody2}</span>
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ⛔ AN OFFICER'S EARLIER DOCUMENT REQUESTS ARE TEXT, NOT UPLOADERS (2026-10-10). Officers ask only for corrections
          of typed details now; a request made before that day is shown for the record, in the officer's own words, and
          no longer holds a send back. Neutral ink: nothing here is the player's move. */}
      {needsInfo && openRequests.length > 0 && (
        <section data-kyc-legacy-requests className="rounded-xl glass-panel p-5 lg:p-6 space-y-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-bg-overlay text-text-subtle">
              <I.fileSignature s={15} />
            </span>
            <h2 className="font-display text-[15px] font-semibold text-text text-balance">{t.profile.kycRequestedDocs}</h2>
          </div>
          <p className={`text-body-sm text-text-muted leading-snug ${zhKeep}`}>
            {t.profile.kycRequestedDocsBody}
          </p>
          <ul className="space-y-1.5">
            {openRequests.map((rq: { id: string; description: string }) => (
              <li key={rq.id} className="rounded-md border border-border bg-bg-overlay/40 px-3 py-2 text-body-sm text-text leading-snug">
                {rq.description}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 2026-09-13 — A FINAL REFUSAL HAS NO STEPS LEFT. The rail and the forms stay off the page, because
          `startKyc` refuses a restart and the upload would be refused.
          2026-09-14 — AND A RECOVERABLE REFUSAL HAS NO STEPS UNTIL THE PLAYER TAPS "TRY AGAIN". The card offered the
          restart while the photo step stood live below it, holding the refused photos: attaching new ones and then
          tapping Try again (as the card says) wiped them, and a mismatch or an expired document could not be fixed
          there at all, because the identity form only returns after the reset. `startKyc` restarts a recoverable row to
          IN_PROGRESS, which brings the rail and the form back. One path, the one that fixes every recoverable code. */}
      {!rejected && (
        <>
        {/* C1b — the verification rail with a brand fill up to the current node; done nodes read the app-state success
            tone (§B2a, never the betting YES ink), the live node carries the brand ring (R5-C). Nodes per track above. */}
        {/* No rail over the expired-document card: it ticked the expired document as done and lit a photo step the card
            cannot offer (the v4 pass). The card says what is left. */}
        {!(agentMode && approved && docExpired) && <ProgressRail nodes={railNodes} tightLabels={locale === "sw"} />}

        {showIdentityForm && (
          <section className="rounded-xl glass-panel p-5 lg:p-6 space-y-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-500/15 text-brand-300">
                <I.user s={15} />
              </span>
              {/* The typed track is ONE step, so it is not numbered; the agent track's details are step 1 of 2. */}
              <h2 className="font-display text-[15px] font-semibold text-text text-balance">{agentMode ? `${t.profile.step1} · ${t.profile.identityDocument}` : t.profile.identityDocument}</h2>
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
                against a licence's rule. 2026-10-10 — the link also carries the track and the
                safe return target (`carry`), or choosing a document dropped both.

                ⛔ ABSENT where the record decides (a locked correction, a saved agent case):
                a pill that cannot change the document would be a control that does nothing.

                ⚠️ Every pill is 44px and only the SELECTED one carries an outline — both
                properties belong to the primitive, so this call site cannot drift from
                the other eight rails that use it. */}
            {!recordDecides && (
              <div>
                <FieldLegend as="p" className="block mb-1.5">{t.profile.chooseIdType}</FieldLegend>
                <p className={`mb-2.5 text-body-sm text-text-muted leading-snug ${zhKeep}`}>{keepLastWords(t.profile.chooseIdTypeBody)}</p>
                {/* ⛔ NO GROUP KEY OVER THESE PILLS (2026-10-09, the visual pass's round 3, tiles 332 and 333). A
                    `FilterGroupKey` reading "What to attach" / "Vya kuambatanisha" sat between the line above and the
                    pills: a SECOND label for a group the legend already names, which the group's `aria-label` repeats,
                    and a wrong one — these pills choose which document you hold. A key names a filter's axis; this rail
                    is a form's chooser (`filter-language.test.mts` files it as a non-filter). */}
                <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t.profile.chooseIdType}>
                  {ID_DOC_TYPES.map((ty) => (
                    <FilterPill
                      key={ty}
                      href={`/profile/kyc?idType=${ty}${carry}`}
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
            )}

            {/* ⭐ ONE FORM, TWO TRACKS: the typed press decides (`verifyIdentityAction`); the agent track saves the details
                and asks for the photos next (`saveAgentIdentityAction`). Same fields, same rules, same server checks. */}
            <form action={agentMode ? saveAgentIdentityAction : verifyIdentityAction} className="space-y-4">
              {/* The form carries its own copy of the choice, so what is VALIDATED is
                  what was on screen — never a query string a link could have staled. */}
              <input type="hidden" name="idType" value={chosenType} />
              {carriedInputs}
              {/* ⛔ READ-ONLY, NOT HIDDEN, ON A LOCKED CORRECTION: the player sees the number an officer approved and
                  that it cannot change here (the line under it), and the form posts that same number. */}
              <Field
                id="idNumber"
                label={(t.profile as unknown as Record<string, string>)[spec.numberLabelKey]}
                hint={numberLocked ? undefined : hintText((t.profile as unknown as Record<string, string>)[spec.hintKey])}
                type="text"
                required
                {...(spec.htmlPattern && !numberLocked ? { pattern: spec.htmlPattern } : {})}
                title={(t.profile as unknown as Record<string, string>)[spec.ruleKey]}
                maxLength={chosenType === "NIDA" ? 20 : 40}
                inputMode={spec.inputMode}
                defaultValue={(sp as Record<string, string | undefined>).idNumber ?? ""}
                readOnly={numberLocked}
              />
              {numberLocked && (
                <p data-kyc-number-locked className={`-mt-2 text-body-sm leading-snug text-text-subtle ${zhKeep}`}>
                  {idLabel} · {keepLastWords(t.profile.idNumberLockedHint)}
                </p>
              )}
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
                <p role="alert" className={`-mt-2 text-body-sm leading-snug text-danger-fg ${zhKeep}`}>
                  {keepLastWords((t.profile as unknown as Record<string, string>)[spec.ruleKey])}
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
                  <p className={`mt-1.5 text-body-sm text-text-subtle ${zhKeep}`}>{keepLastWords(t.profile.idExpiryHint)}</p>
                </div>
              )}
              <Field
                id="fullName"
                label={t.profile.fullName}
                hint={hintText(t.profile.fullNameHint)}
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
                  // ⭐ THE ACCOUNT'S DATE OF BIRTH (2026-10-10): collected and 18+ gated at sign-up, shown read-only for
                  // confirmation, and NOT posted — the server reads `User.dob` itself (normalised to YYYY-MM-DD; prod
                  // stores a DateTime, read back as a full ISO string), so the page cannot send a different one. A
                  // wrong sign-up date is corrected by an officer, through support.
                  <>
                    {/* ⭐ LAID OUT AS THE EMAIL BOX BELOW (the screenshot pass, 2026-10-10): the date alone on its line and
                        never broken — at sw 320 the tag beside it pushed "1 Januari / 1990" onto two — and the tag under it. */}
                    <div className="flex items-start gap-2 rounded-xl border border-border bg-bg-elevated px-[14px] py-[10px]">
                      <I.check s={14} className="mt-0.5 text-success-fg shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="block whitespace-nowrap text-body-sm text-text">{formatDob(user.dob.slice(0, 10), locale)}</span>
                        <span className="block text-body-sm text-text-subtle">{t.profile.fromSignUp}</span>
                      </div>
                    </div>
                    {/* "Wrong date?" and the door to support, the link kept whole. The account's own hint ("taken from your
                        account") is said once, under the email. No ASCII space after the zh question mark before the link
                        (2026-09-14: it doubled the gap). */}
                    <p className={`mt-1.5 text-body-sm text-text-subtle ${zhKeep}`}>
                      {t.profile.dobWrongDate}{locale === "zh" ? "" : " "}
                      <a href={`mailto:${SUPPORT_EMAIL()}`} className="whitespace-nowrap text-brand-300 underline-offset-2 hover:underline hover:text-brand-200">{t.error.contactSupport}</a>
                    </p>
                  </>
                ) : (
                  // An account with no date of birth types it once, here; the service then keeps it on the account.
                  <>
                    <DateSelect
                      name="dob"
                      id="dob"
                      required
                      min="1930-01-01"
                      max={new Date(new Date().getFullYear() - 18, new Date().getMonth(), new Date().getDate()).toISOString().slice(0, 10)}
                      defaultValue={(sp as Record<string, string | undefined>).dob ?? ""}
                    />
                    <p className={`mt-1.5 text-body-sm text-text-subtle ${zhKeep}`}>{keepLastWords(t.auth.dobHint)}</p>
                  </>
                )}
              </div>
              {emailVerified && user?.email ? (
                // 2026-09-13 — a CONFIRMED account email is shown, not re-asked: the empty
                // box read "Required" over an inbox we had already proven.
                // 🔴 2026-10-06 (route audit A1) — and this step no longer WRITES the address in any state: it
                // was a second, password-less door to the recovery inbox. The account page is the one door.
                <div>
                  <FieldLegend as="p" className="block mb-2">
                    {t.common.email}
                  </FieldLegend>
                  {/* 2026-09-13 — the address gets the row's FULL width on its own line, with the
                      tag beneath. Sharing a line with the tag in a mono face split it mid-word at
                      360 in every locale. Wrapping only breaks inside a word when the address is
                      longer than the whole line. Never truncate: an ellipsis does not shorten an
                      address, it states a different one. Same pixels as the DOB row above. */}
                  <div className="flex items-start gap-2 rounded-xl border border-border bg-bg-elevated px-[14px] py-[10px]">
                    {/* mt-0.5 centres the 14px glyph on the address's 18px line. */}
                    <I.check s={14} className="mt-0.5 text-success-fg shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="block break-words text-body-sm text-text">{user.email}</span>
                      <span className="block text-body-sm text-text-subtle">{t.common.confirmed}</span>
                    </div>
                  </div>
                  <p className={`mt-1.5 text-body-sm text-text-subtle ${zhKeep}`}>{keepLastWords(t.profile.dobFromSignUp)}</p>
                </div>
              ) : user?.email ? (
                // An address ON FILE BUT NOT CONFIRMED is shown as unconfirmed, read-only: the account page changes
                // it, behind the current password, and sends a new link (a link expires after 24 h).
                <div>
                  <FieldLegend as="p" className="block mb-2">
                    {t.common.email}
                  </FieldLegend>
                  <div className="flex items-start gap-2 rounded-xl border border-border bg-bg-elevated px-[14px] py-[10px]">
                    <I.mail s={14} className="mt-0.5 text-text-subtle shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="block break-words text-body-sm text-text">{user.email}</span>
                      <span className="block text-body-sm text-text-subtle">{t.common.unconfirmed}</span>
                    </div>
                  </div>
                  {/* No ASCII space after the zh full stop before the link: it doubles the gap (as on the DOB line). */}
                  <p className={`mt-1.5 text-body-sm text-text-subtle ${zhKeep}`}>
                    {keepLastWords(t.profile.emailOnFileUnconfirmed)}{locale === "zh" ? "" : " "}
                    <Link href="/profile/account" className="font-mono text-[11px] text-brand-300 hover:text-brand-200 underline-offset-2 hover:underline">{t.wallet.verifyChangeEmailCta}</Link>
                  </p>
                  {/* 2026-10-07 · the first-deposit notice's "both" variant lands here: a new link in place, not one more page. */}
                  <EmailResendInline className="mt-2" />
                </div>
              ) : (
                // No address yet: named, and the one door to add it — never a field here.
                <div>
                  <FieldLegend as="p" className="block mb-2">{t.common.email}</FieldLegend>
                  <p className={`text-body-sm text-text-muted ${zhKeep}`}>
                    {keepLastWords(t.profile.noEmailOnFile)}{locale === "zh" ? "" : " "}
                    <Link href="/profile/account" className="font-mono text-[11px] text-brand-300 hover:text-brand-200 underline-offset-2 hover:underline">{t.wallet.verifyAddEmailCta}</Link>
                  </p>
                </div>
              )}
              {/* The button names the act: verify (typed), send the correction (typed, an officer asked), or continue to
                  the photos (agent). ⭐ While the typed press runs it says WHAT is happening ("Checking your details…"):
                  the press IS the decision, and a NIDA check takes a second or two — "Loading…" there read as a stall. */}
              <SubmitButton
                label={agentMode ? t.profile.continueVerification : needsInfo ? t.profile.sendCorrections : t.kycGate.ctaStart}
                pendingLabel={agentMode ? t.common.loading : t.profile.verifyingPending}
              />
            </form>
            <details className="border-t border-border pt-3 text-[12.5px] text-text-muted">
              <summary className="font-display font-semibold text-text cursor-pointer flex items-center gap-2">
                <I.shieldQuestion s={14} className="text-text-subtle shrink-0" />
                {t.profile.whyWeAsk}
              </summary>
              <p className={`mt-1.5 leading-snug ${zhKeep}`}>
                {t.profile.whyWeAskBody}
              </p>
            </details>
          </section>
        )}

        {/* ⭐ THE AGENT PHOTO TRACK'S STEP 2 — and, on an account already verified from typed details, the agent
            programme's photo upgrade. Never drawn on the typed track. */}
        {agentMode && (
          <>
          {idDone && !submitted && !agentDocExpired && (
            approved && docExpired ? (
              // ⛔ NOT THE UPLOADERS AND A SEND THE SERVER REFUSES (review R5.4, 2026-10-10). The document this identity was
              // verified on has expired since: `submitForReview` refuses its photo case (`id_expired`), and an approved
              // identity's document and number cannot change on this page (`closedToPlayer`; a renewed passport has a new
              // number). The way on is an officer reopening the verification, so the step says that and opens support — the
              // held-wallet card's door (`/help`). Neutral, not amber: the Callout's "not available here, guided elsewhere".
              // Withdrawals are untouched by it (`approvedAt` stands), so nothing here speaks of them.
              <section data-kyc-agent-expired className="rounded-xl border border-border bg-bg-elevated p-4 lg:p-5">
                <div className="flex items-start gap-3">
                  {/* ⚠️ LITERALS — see the rejected-medallion note above. */}
                  <span className="inline-flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full border border-border bg-bg-overlay text-text-subtle">
                    <I.idCard s={18} />
                  </span>
                  <div className="min-w-0">
                    <h2 className="font-display text-body font-bold text-text text-balance">{t.profile.agentPhotosExpiredTitle.replace("{document}", idLabel)}</h2>
                    <p className={`mt-1 text-body-sm text-text-muted leading-snug ${zhKeep}`}>
                      {keepLastWords(t.profile.agentPhotosExpiredBody)}
                    </p>
                    <div className="mt-3">
                      <Link href="/help" className="btn btn-primary btn-md btn-pill inline-flex items-center gap-1.5">
                        <I.mail s={14} />
                        {t.error.contactSupport}
                      </Link>
                    </div>
                  </div>
                </div>
              </section>
            ) : (
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
                    is wrong". The same string is still correct on the approval card
                    below, where it is gated on `kyc?.status === "APPROVED"`.
                    2026-09-14 — the chip is app-state success, never the betting YES ink (§B2a). */}
                <span className="inline-flex items-center gap-1 rounded-pill border border-success-border bg-success-bg px-2.5 py-0.5 font-mono text-micro font-bold uppercase tracking-[0.1em] text-success-fg">
                  <I.check s={11} />
                  {t.profile.idSaved}
                </span>
                {/* Which document this submission is built on, stated where the player
                    can see it — a passport journey that never names the passport leaves
                    somebody wondering whether the right thing was recorded. */}
                <span className="font-mono text-micro uppercase tracking-[0.1em] text-text-subtle">{idLabel}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-500/15 text-brand-300">
                  <I.camera s={15} />
                </span>
                <h2 className="font-display text-[15px] font-semibold text-text text-balance">
                  {approved ? t.profile.agentPhotosUpgradeTitle : `${t.profile.step2} · ${t.profile.uploadDocuments}`}
                </h2>
              </div>
              {/* An account verified from typed details is told it IS verified, and what the agent programme adds;
                  its withdrawals stay open while the photos are with our team (`approvedAt` is kept). */}
              <p className={`text-body-sm text-text-muted leading-snug ${zhKeep}`}>
                {keepBody(approved
                  ? t.profile.agentPhotosUpgradeBody.replace("{document}", idLabel).replace("{hours}", durationHours(locale, KYC_REVIEW_SLA_HOURS))
                  : t.profile.uploadDocsBody)}
              </p>
              {/* ⛔ THE SLOTS COME FROM THE CATALOGUE, NOT FROM THIS FILE. A NIDA asks for
                  front + back + selfie; the other three ask for one image of the document
                  + a selfie. ⭐ THE SELFIE SURVIVES ON ALL FOUR ON PURPOSE: "Selfie matches
                  the ID photo" is one of the officer's four photo attestations.
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
              <p className={`text-body-sm text-text-subtle ${zhKeep}`}>
                {keepLastWords(t.profile.tapToAttach)}
              </p>
              <p className="font-mono text-[11px] font-bold tabular-nums text-text-muted">
                {t.profile.docsAttachedCount.replace("{n}", formatNumber(attachedCount)).replace("{total}", formatNumber(requiredSlots.length))}{allAttached ? ` — ${t.profile.readyToSubmit}` : ""}
              </p>
              <form action={sendPhotosForReviewAction}>
                {carriedInputs}
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
                    <p className={`mt-2 text-body-sm text-text-subtle text-center ${zhKeep}`}>{keepLastWords(t.profile.attachAllThree)}</p>
                  </>
                )}
              </form>
            </section>
            )
          )}
          </>
        )}
        </>
      )}

      {/* The verified crest (remade 2026-08-08 — no rays, M3), in SUCCESS (R5-C, §B11: "APPROVED is success-green
          everywhere … an approval is not money, it is permission"). Typed: the identity is verified. Agent: an officer
          approved the photos, which is what the agent programme asks. */}
      {submitted && kyc?.status === "APPROVED" && (
        <section className="rounded-xl border border-success-border bg-bg-elevated p-5 lg:p-6 text-center">
          <RewardBurst glyph="shieldcheck" tone="success" caption={agentMode ? t.profile.agentVerifiedTitle : t.profile.idVerified} />
          {/* 2026-09-14 — balanced (en left "on." alone at 768/1280), and a held wallet is told the truth first. */}
          <p className={`mt-3 text-[13px] text-text-muted leading-snug max-w-[400px] mx-auto text-balance ${zhKeep}`}>
            {keepLastWords(agentMode ? t.profile.agentVerifiedBody : walletHeld ? t.profile.kycApprovedWalletHeld : payoutsAccepting ? t.profile.kycApprovedBody : t.profile.kycApprovedPayoutsPaused)}
          </p>
          {/* The held wording tells the player to contact support — so the card carries that door, the same one the
              withdraw panel's frozen state and the deposit notice use (support → /help). */}
          {walletHeld && !agentMode && (
            <Link href="/help" className="btn btn-ghost btn-md btn-pill mt-4 inline-flex items-center gap-1.5">
              <I.mail s={14} />
              {t.kycGate.frozenCta}
            </Link>
          )}
          {/* Return to the gated action the user came from (IA review R6) — or, for the agent programme, to /agent. */}
          {continueHref && (
            <Link href={continueHref as never} className="btn btn-primary btn-md mt-4 inline-flex">
              {t.common.continue}
            </Link>
          )}
        </section>
      )}
      {/* "In review" is WAITING, and §B11 decides waiting once: royal (UNDER_REVIEW and PENDING, to the player). It was
          the gold ramp, the money ink (Q5; R5-C, 2026-10-09) — the royal `info` box, as /profile's own "in review" pill.
          2026-10-10 · named for what our team holds: an agent applicant's photos, or typed details an officer checks.
          ⭐ The h1 IS that status now ("We're checking your details" / "…your documents"), so the card's title is a short
          label — where the case is, "With our team" — and its body says when, once (the screenshot pass: "checking" stood
          three times on the screen). The review time is a figure and its unit, kept on one line. */}
      {submitted && kyc?.status !== "APPROVED" && (
        <section className="rounded-xl border border-info-border bg-info-bg p-5 lg:p-6 text-center space-y-3">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-info-bg text-info">
            <I.clock s={28} />
          </div>
          <p className="font-display text-[18px] font-bold text-info-fg text-balance">{t.kycGate.eyebrowPending}</p>
          <p className={`text-[13px] text-text-muted leading-snug max-w-[400px] mx-auto text-balance ${zhKeep}`}>
            {keepBody((photoCase ? t.profile.kycReviewingBody : t.profile.kycCheckingBody).replace("{hours}", durationHours(locale, KYC_REVIEW_SLA_HOURS)))}
          </p>
        </section>
      )}

      {/* 2026-09-14 — below md the right-hand link stays out of the chat bubble's column (52px bubble + 16px inset,
          fixed at the bottom-right): on a first view at 360 it sat under the bubble in every locale. From md up the
          640px form column ends before the bubble, so the inset only pulled the link away from the card's edge. */}
      <div className="flex items-center justify-between pt-1 pr-[68px] md:pr-0">
        {/* The way back names the same hub as the back link at the top (2026-10-10, the v4 pass): the Akaunti hub under
            the journey, /profile otherwise — the two said different places under the journey. */}
        <Link
          href={journey ? "/account" : "/profile"}
          className="font-mono text-label uppercase tracking-[0.14em] text-text-subtle hover:text-text"
        >
          ← {journey ? t.journey.tabAccount : t.common.profile}
        </Link>
        <Link
          href="/wallet"
          /* A link is a control, never money: the product's link ink (brand-300, as R4-K's not-found link), not gold (R5-C). */
          className="font-display text-[13px] font-semibold text-brand-300 hover:text-brand-200 transition-colors"
        >
          {t.common.wallet} →
        </Link>
      </div>
    </PageContainer>
  );
}

// C1b verification rail — its nodes on a single connected track (per track: see `railNodes`). The brand "fill" runs
// the connectors up to the current node (first not-yet-done step); done nodes read the app-state success tone — the
// Chip success recipe, 2026-09-14, never the betting YES ink (§B2a) — the current node carries the brand ring, future
// nodes are muted line-art. Purely presentational — reflects server-derived `done` flags, no motion.
// ⭐ THE CURRENT STEP IS BRAND, NOT GOLD (R5-C, the second gold audit, 2026-10-09; tiles r5-6: "NIDA" ring + label in
// the capsule's gold). "You are here" is the product's one non-money highlight — the selected pill, the current tab's
// underline, the rail's unread dot are the brand family — and gold is money and nothing else (Q5). The proposal
// timeline and the /fairness chain's highlighted node read this same recipe.
//
// ⚠️ 2026-09-13 — EQUAL FLEXIBLE COLUMNS, CONNECTORS DRAWN BETWEEN CENTRES. The columns were a
// fixed 64px with the connectors as flex siblings, so a long Swahili label ("IMETHIBITISHWA",
// ~104px at the eyebrow's 0.14em) ran into its neighbour and off the right edge at 360px. Each
// column now takes an equal share of the rail; a multi-word label wraps (balanced), and a single
// long word overflows its column symmetrically (flex centring) instead of to one side.
// ⛔ Swahili drops the eyebrow tracking for `tracking-normal`: 84px at 0 against an 80px
// column at 360 still clears the neighbour label; at 0.14em no layout can hold it. en/zh
// keep `.eyebrow` unchanged.
function ProgressRail({ nodes, tightLabels = false }: { nodes: { label: string; glyph: keyof typeof I; done: boolean }[]; tightLabels?: boolean }) {
  const firstUndone = nodes.findIndex((n) => !n.done);
  // All done → the last node is the "current"; else the first not-done node.
  const activeIndex = firstUndone === -1 ? nodes.length - 1 : firstUndone;
  return (
    <section aria-label="Verification progress" className="flex items-start px-1 pt-1">
      {nodes.map((node, i) => {
        const isActive = i === activeIndex && !node.done;
        const Glyph = I[node.glyph];
        const circleCls = node.done
          ? "border border-success-border bg-success-bg text-success-fg"
          : isActive
            ? "border-2 border-brand-500 bg-brand-500/10 text-brand-300"
            : "border border-border bg-bg-overlay text-text-subtle";
        const labelCls = node.done
          ? "text-text"
          : isActive
            ? "text-brand-300"
            : "text-text-subtle";
        return (
          <div key={i} className="relative flex min-w-0 flex-1 flex-col items-center">
            {i < nodes.length - 1 && (
              // From 8px past this circle's edge to 8px short of the next one (radius 16 + 8).
              <div
                aria-hidden
                className="absolute top-[15px] h-[2px] rounded-full"
                style={{
                  left: "calc(50% + 24px)",
                  right: "calc(-50% + 24px)",
                  background: i < activeIndex ? "color-mix(in oklab, var(--brand-500) 75%, transparent)" : "var(--border)",
                }}
              />
            )}
            {/* ⚠️ LITERALS — `h-9` is 64px on this repo's overridden scale. */}
            <span className={`inline-flex h-[32px] w-[32px] items-center justify-center rounded-full ${circleCls}`}>
              {node.done ? <I.check s={16} /> : <Glyph s={16} />}
            </span>
            <span className={`mt-2 text-center text-balance font-mono text-micro font-semibold uppercase leading-tight ${tightLabels ? "tracking-normal" : "eyebrow"} ${labelCls}`}>
              {node.label}
            </span>
          </div>
        );
      })}
    </section>
  );
}

/**
 * A body that names a review time, or ends a card (the screenshot pass, 2026-10-10): every figure kept with its unit
 * (`keepFigures` — "24 hours", "saa 24", "24小时" never split across a line), and its last two words kept together
 * (`keepLastWords`). Both leave the words themselves unchanged; text with an ideograph follows its own rules (keep-all,
 * at punctuation), so only the figures are held there.
 */
function keepBody(text: string): ReactNode {
  const parts = keepFigures(text);
  if (!Array.isArray(parts)) return keepLastWords(text);
  const last = parts[parts.length - 1];
  return typeof last === "string" ? [...parts.slice(0, -1), <Fragment key="tail">{keepLastWords(last)}</Fragment>] : parts;
}

/**
 * The date of birth as a person reads it, in the page's language ("1 January 1990",
 * "1 Januari 1990", "1990年1月1日"). Formatted in UTC because the stored value is a calendar
 * date, not an instant — any other zone can move it a day. Falls back to the raw value.
 */
const DOB_INTL_TAG: Record<Locale, string> = { en: "en-GB", sw: "sw-TZ", zh: "zh-CN" };
function formatDob(isoDate: string, locale: Locale): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return new Intl.DateTimeFormat(DOB_INTL_TAG[locale], { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(d);
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
 * BLURRY_DOC stays for refusals decided before 2026-10-10 (officers no longer choose it).
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
// untouched. `readOnly` (2026-10-10) draws the kit's locked input for a number an officer approved.
function Field({
  id, label, hint, type, pattern, inputMode, placeholder,
  required: req = true, minLength, maxLength, min, max, title, defaultValue, readOnly,
}: {
  id: string; label: string; hint?: ReactNode; type: string;
  pattern?: string; inputMode?: "numeric" | "text"; placeholder?: string;
  required?: boolean; minLength?: number; maxLength?: number; min?: string; max?: string;
  title?: string; defaultValue?: string; readOnly?: boolean;
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
        readOnly={readOnly}
        mono
      />
    </KitField>
  );
}
