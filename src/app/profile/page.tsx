import Link from "next/link";
import { redirect } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { Chip } from "@/components/ui/chip";
import { Stat } from "@/components/ui/stat";
import { FiftyMark } from "@/components/brand";
import { AvatarUploader } from "@/components/profile/avatar-uploader";
import { ProfileNameEditor } from "@/components/profile/name-editor";
import { nameEndAt, keepLastWords } from "@/components/ui/keep-words";
import { DotSeq } from "@/components/ui/dot-seq";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { inviteViewerFor } from "@/lib/server/affiliate-service";
import { listPositionsForUser } from "@/lib/server/market-service";
import { displayInitials } from "@/lib/display-label";
import { BadgeShelf } from "@/components/badges/Badge";
import { computeAchievementShelf } from "@/lib/server/achievements";
import { getServerT } from "@/lib/i18n-server";
import { formatNumber, formatTzs } from "@/lib/utils";
import { PageContainer } from "@/components/layout/page-container";
import { inviteIsLiveFor } from "@/lib/feature-state";
import { isFinalRefusal, kycDoorOffered } from "@/lib/kyc-refusal";
import { inviteLine, inviteName } from "@/lib/journey/invite-name";
import { invitePaysPlayersNow } from "@/lib/server/invite-rewards-switch";
import { isLockedOut } from "@/lib/server/responsible-gambling";
import { breakStateOf } from "@/lib/break-end";
// ⭐ THE SHARED MASK (`+255••••21`), so this page and the opt-out page show one person's number the
// same way (D6). The local star copy here was one of the hand-written masks `phone-normalize.ts` retired.
import { maskPhone } from "@/lib/phone-normalize";
// The faces the page's loading ghost draws its lines in too (`profile-faces.ts`, round 5's follow-up, R5-K).
import { PROFILE_PHONE_LINE, PROFILE_ROW_TITLE, PROFILE_SIGN_OUT_TITLE } from "@/components/profile/profile-faces";

export async function generateMetadata() {
  const { t } = await getServerT();
  return { title: t.profile.title };
}
export const dynamic = "force-dynamic";


/**
 * Each language in its OWN name — the same endonyms the header's language menu lists, never translated.
 * ⚠️ Not imported from `language-menu.tsx`: that file is "use client", and a value this server page
 * reads from it would be a client reference (the 2026-09-13 site-wide outage, `kyc-gate-state.ts`).
 */
const LANGUAGE_NAME = { en: "English", sw: "Kiswahili", zh: "中文" } as const;

export default async function ProfilePage() {
  const { t, locale } = await getServerT();
  const session = await currentSession();
  if (!session) redirect("/auth/login?next=/profile");

  // B-1 — no swallow: a FAILED user read used to bounce a signed-in player to
  // the login page. Throw to profile/error.tsx instead; the redirect below is
  // only for a successful read finding no row.
  const user = await db.user.findById(session.userId);
  if (!user) redirect("/auth/login?next=/profile");

  /**
   * ⭐ Read once FOR THIS PAGE and used twice below — whether the invite row appears, and which
   * programme's words it wears. Asking twice would be two round trips that can disagree if a
   * status changes between them, and the row would then be visible while wearing the other
   * programme's label.
   * ⚠️ IT IS NOT THE ONLY READ IN THIS RENDER, and the note here claimed it was:
   * `computeAchievementShelf` below calls `inviteViewerFor` again for the Connector badge. They
   * are in different modules with no shared request cache, so they can in principle disagree —
   * harmlessly, since the worst case is a badge that appears while the row does not. ⛔ Do not
   * "fix" that by threading this value into the shelf: the shelf is called from several pages and
   * would then take a prop only one of them can supply.
   */
  // ⭐ …AND WHETHER INVITES PAY, beside it (round 6, review C1): the row says the page's own name, and a paid player's page
  // is "Invite & Earn" (`invite-name.ts`). The switch's screen read (≤ 10 s snapshot, never rejects; a failed read is "not
  // paid", so the row never promises money the page does not).
  // ⭐ R8-C (2026-10-10, the owner's ruling (4)) · …AND WHETHER THE READER IS ON A BREAK, in the same batch: during a break or
  // a self-exclusion no row offers the invite (or an agent's dashboard, the same door). Failing OPEN — a failed read is no
  // break, and the row is today's (it gates an offer, never a refusal).
  const [inviteViewer, invitePayable, breakEnd] = await Promise.all([
    inviteViewerFor(user.id),
    invitePaysPlayersNow().catch(() => false),
    Promise.resolve().then(() => isLockedOut(user.id)).then(breakStateOf).catch(() => null),
  ]);

  let wallet: Awaited<ReturnType<typeof db.wallet.findByUserId>> | null = null;
  let sof: Awaited<ReturnType<typeof db.sourceOfFunds.get>> | null = null;
  let badges: Awaited<ReturnType<typeof computeAchievementShelf>> = [];
  // B-1 — deliberate degrade: a failed wallet read renders "—", visually
  // distinct from a real 0 balance.
  try { wallet = await db.wallet.findByUserId(user.id); } catch { /* graceful */ }
  // B-1 — no swallow: a failed KYC read fabricated NOT_STARTED (a verified
  // player shown "Verify your identity"); a failed positions read fabricated
  // 0 open / 0 settled. Both throw to profile/error.tsx now.
  const kyc = await db.kyc.findByUserId(user.id);
  const positions = await listPositionsForUser(user.id, 500);
  // B-1 — deliberate degrade: the SoF banner and the badges shelf are optional
  // enrichment; their absence never mimics real data.
  try { sof = await db.sourceOfFunds.get(user.id); } catch { /* graceful */ }
  try { badges = await computeAchievementShelf(user.id); } catch { /* graceful */ }
  const initials = displayInitials(user);
  const displayName = user.displayName ?? t.profile.setYourName;

  // SoF discoverability: show a banner when the player has a PENDING or
  // REJECTED declaration (they may not know they need to act).
  const sofNeedsBanner = sof && (sof.reviewStatus === "PENDING" || sof.reviewStatus === "REJECTED");

  /**
   * THE KYC STATUS PILL — from 2026-09-13 the ONLY identity statement on this page.
   *
   * ⛔ THE AMBER "VERIFY YOUR IDENTITY" BANNER THAT STOOD UNDER THE HERO IS DELETED, with its three-step
   * teaser (Ali's quiet rule, 2026-09-13: identity is put in front of a player on the withdraw screen
   * and in one dismissible notice after a first deposit, and is otherwise only STATED, in the places
   * they go to look). This page is one of those places, so the standing stays — as a pill that states
   * it and, until the account is verified, links to /profile/kyc for the detail.
   *
   * ⛔ `IN_PROGRESS` IS NOT "IN REVIEW" (fixed 2026-09-13). It was, and the banner beside it said
   * "continue verification", which hid the contradiction. With the banner gone the pill alone would
   * tell somebody whose photos were never sent that our team has them. Nothing is with us until
   * `PENDING_REVIEW`; before that the pill reads "Verify ID". (From 2026-10-10 most typed verifications go straight
   * to APPROVED on the press; `PENDING_REVIEW` is a case an officer decides, or an agent applicant's photos.)
   * ⚠️ Not started is an ordinary condition, not a warning — neutral, like the withdraw panel's own
   * not-started tone. Amber is kept for "more information needed", which really is their move.
   */
  const kycLevel = kyc?.status ?? "NOT_STARTED";
  const kycPill =
    kycLevel === "APPROVED"
      // ⛔ App-state tones (success/danger), never the betting YES/NO inks — §B2a (review, 2026-09-13).
      ? { tone: "success", label: t.profile.idVerified, glyph: I.shieldcheck }
      : kycLevel === "PENDING_REVIEW"
        ? { tone: "info", label: t.profile.inReview, glyph: I.clock }
        : kycLevel === "ADDITIONAL_INFO_REQUIRED"
          // 2026-09-14 — the pill takes its own short label: the full heading wrapped to two lines beside the avatar at 360.
          // 2026-10-10 — the info glyph, not an upload arrow: an officer asks for CORRECTIONS of typed details now, and
          // there is nothing to upload (the withdraw panel's `more_info` reads the same glyph).
          ? { tone: "warning", label: t.profile.kycMoreInfoPill, glyph: I.info }
          : kycLevel === "REJECTED"
            // 2026-09-14 — a FINAL refusal reads "Refused", never the retryable "Rejected" (the roster's own ruling, kyc-stage.ts).
            ? { tone: "danger", label: isFinalRefusal(kyc?.rejectReason) ? t.profile.refusedFinal : t.profile.rejected, glyph: I.alertCircle }
            : { tone: "neutral", label: t.profile.kycPillStart, glyph: I.shieldQuestion };
  const kycPillNode = (
    <Pill tone={kycPill.tone as "success" | "danger" | "info" | "warning" | "neutral"}>
      <kycPill.glyph s={10} className="inline -mt-px" /> {kycPill.label}
    </Pill>
  );

  return (
    <PageContainer tier="reading" className="space-y-6">
      {/* ── Hero — kit-faithful: tilted FiftyMark watermark, OKLCH gradient,
            mono-stamped meta, picture uploader badge. No off-brand tokens. */}
      {/* 🔴 `overflow-clip` OVER `overflow-hidden` (round 4 of the visual pass, 2026-10-09, edges tiles 233–235, E24). A box
          that hides its overflow is still a scroll container, and this one has overflow to scroll: the watermark below
          stands 32px past its right edge (`-right-6`), and an unbroken name ran 580px past it. Saving a name returns focus
          to the name's button (name-editor.tsx), the browser scrolled the hero sideways to reveal it, and the scroll stayed:
          the whole hero 32px left, the avatar ring cut, "ZS 50,000", a bare strip at the right. `clip` clips the same box
          and is no scroll container, so nothing can move it; `hidden` stays first for an engine without `clip` (Safari
          before 16), where the name's own break rule (E25) leaves nothing to reveal. */}
      <section className="relative overflow-hidden overflow-clip rounded-xl border border-border bg-bg-elevated">
        {/* 🔴 DG-P-04 · §S1 — THE h1 MOVED INSIDE THE HERO, AND THE MOVE IS LOAD-BEARING.
            It was the container's FIRST child. `space-y-*` is not a gap; it is
            `> :not([hidden]) ~ :not([hidden]) { margin-top }`, a SIBLING selector that counts
            DOM order and not layout. `.sr-only` is `position:absolute; margin:-1px`, so the h1
            occupied the "first child, no margin" slot while occupying no space — and this hero
            was handed **32px** of margin-top nobody wrote (`space-y-6`). The same defect,
            measured on production with `npm run qa:dg-rhythm`, cost `/live` 24px and
            `/proposals` 32px. ⛔ The h1 STAYS (WCAG 1.3.1/2.4.6) and it must not go inside an
            `aria-hidden` band — here the hero is not one, and the heading belongs with the
            display name it names, which this comment already said.
            Screen-reader-only h1 — gives the page proper landmark structure without disturbing
            the visual hierarchy (the display name + ProfileNameEditor sit prominently in this
            card; that's where the eye reads, but a screen reader needs a top-level heading). */}
        <h1 className="sr-only">
          {t.profile.title} · {displayName}
        </h1>
        {/* Background — the page hero every /profile page wears (`PageHero`'s `info` glow over `--hero-panel-grad`) + mark
            watermark. ⭐ It was an emerald → rose tilt: the YES and NO inks as a wash on the player's own page, where neither
            is a side (§B2a; R5-I, 2026-10-09) — and the one hero of the eight /profile pages that differed. */}
        <div
          className="absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(800px 320px at 100% 0%, oklch(45% 0.10 240 / 0.18), transparent 60%), " +
              "var(--hero-panel-grad)",
          }}
        />
        <div className="absolute -right-6 -top-6 opacity-[0.06]" aria-hidden>
          <FiftyMark size={220} />
        </div>

        <div className="relative z-10 p-5 lg:p-6 flex items-start gap-4 lg:gap-5">
          <AvatarUploader
            initials={initials}
            seed={user.id}
            currentSrc={user.avatarDataUrl}
            size="2xl"
          />
          <div className="flex-1 min-w-0 pt-1">
            <p className="font-mono text-caption uppercase eyebrow font-bold text-text-subtle">
              {t.profile.predictor}
            </p>
            <ProfileNameEditor
              currentName={user.displayName}
              /* The name's kept end, decided HERE on the server and handed down: the editor (a client component) draws
                 this cut and never re-derives it from the browser's Unicode tables (review 6, B-4 · `nameEndAt`). */
              currentNameEnd={nameEndAt(user.displayName ?? "")}
              fallbackPlaceholder={displayName}
            />
            <p className={PROFILE_PHONE_LINE}>
              {maskPhone(user.phoneE164)} · {user.region ?? t.profile.tanzania}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {/* Role badge — yellow for ADMIN/COMPLIANCE/MODERATOR so Ali can
                  see at a glance whether his ADMIN_BOOTSTRAP_PHONES env wired
                  up correctly on this account. Plain "Player" otherwise. */}
              {user.role !== "PLAYER" && user.role !== "AGENT" ? (
                <Chip variant="info" size="lg" className="gap-1.5">
                  <I.shieldcheck s={11} />
                  {user.role === "ADMIN" ? t.profile.adminRole
                    : user.role === "COMPLIANCE" ? t.profile.complianceRole
                    : user.role === "MODERATOR" ? t.profile.moderatorRole
                    : user.role}
                </Chip>
              ) : (
                <Pill tone="neutral">{t.profile.playerRole}</Pill>
              )}
              {/* Until verified the pill is also the quiet way in — a plain link, the shape the
                  unconfirmed-email pill beside it already has. Verified, it only states.
                  ⭐ 2026-10-10 · THE TAP FLOOR WITHOUT THE LAYOUT: the link keeps a 44px target (11px of padding over and
                  under the pill) but cancels it with an equal negative margin, so its row is the pill's height. With
                  `min-h` the two linked pills made their rows 44px against the others' 28 — uneven gaps around them, and a
                  hero that changed height when the account was verified (the screenshot pass, every width). */}
              {kycLevel === "APPROVED"
                ? kycPillNode
                : <Link href="/profile/kyc" data-testid="profile-kyc-pill" className="no-underline inline-flex items-center py-[11px] -my-[11px]">{kycPillNode}</Link>}
              {/* 2026-09-13 — the language this page is IN (the kp-locale cookie, what the header menu shows), in its
                  own name. It read the stored `user.locale` with no ZH case, and the language menu never writes that
                  column, so a zh page said "English". */}
              <Pill tone="neutral">{LANGUAGE_NAME[locale]}</Pill>
              {/* ⭐ THE EMAIL STANDING, STATED QUIETLY (2026-10-07). A confirmed address is now asked before a WITHDRAWAL
                  (owner ruling), the way identity is — so this pill follows the identity pill's rule: an outstanding step
                  is an ordinary condition, NEUTRAL, never amber, and until it is done the pill is the quiet way in, on
                  the same tap floor. With no address at all it says "Add email" (it said nothing). Confirmed, it states. */}
              {user.emailVerifiedAt && user.email
                ? <Pill tone="success"><I.check s={10} className="inline -mt-px" /> {t.profile.emailConfirmed}</Pill>
                : (
                  <Link href="/profile/account" data-testid="profile-email-pill" className="no-underline inline-flex items-center py-[11px] -my-[11px]">
                    <Pill tone="neutral"><I.mail s={10} className="inline -mt-px" /> {user.email ? t.profile.emailUnconfirmed : t.profile.addEmailPill}</Pill>
                  </Link>
                )}
            </div>
          </div>
        </div>

        {/* Stat strip — wallet + open positions */}
        {/* 📐 2026-09-13 — THREE ACROSS DOES NOT FIT A PHONE. At 360px a third of the strip leaves
            ~68px of content, and "TZS 1,000,000" in the 18px mono face needs ~140px: the balance
            wrapped "TZS / 100,000" and the sw "Imekamilika" label was clipped at the hero edge.
            Shrinking the figure to fit a third would take it to ~9px. So below sm the balance takes
            its own row and the two counts share the second; from sm up it is three across again.
            The value never wraps (TZS stays with its figure); a label may wrap, never clip. The
            dividers are explicit borders because a sibling divider cannot follow a wrapped row. */}
        {/* ONE CONTENT EDGE PER COLUMN (round 4, 2026-10-09, tiles 187 188): the cells pad like the hero above them,
            `px-5 lg:px-6` over the Stat box's px-4 — SALIO and HAI started at x37 under the avatar's x41 at 390, and at
            x153 under x165 at 1280 (20px against 24 and 32). The narrowest cell, a third at 640, keeps 154px for its
            figure ("TZS 1,000,000" in the 18px mono face needs ~140). */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 border-t border-border">
          {/* ⭐ STAGE 9b — the kit <Stat>, and the face is the fix, not a side effect.
              This strip's local fork set its values in SORA. §T5 has no exception for
              a stat tile ("every numeral is JetBrains Mono with tabular-nums") and §M4
              says it twice for money, so the balance sat in the display face beside a
              nav pill that renders the SAME figure in mono — one balance, two faces.
              `money` also restores the <Cash> path the fork dropped: the balance now
              masks with the privacy eye like every other personal figure. The two
              counts take `font="mono"` so the strip reads as one row of numerals. */}
          {/* ⛔ `money={!!wallet}` — NOT a bare `money`. The no-wallet fallback is an
              em-dash, and <Cash> masks everything after the first non-digit run, so a
              masked "—" would render "—•••••": a placeholder dressed up as a hidden
              figure, which is the opposite of what a dash is for. `font="mono"` holds
              the face in that branch (§M4 outranks it in the other). */}
          <Stat
            size="xl"
            labelStyle="widest"
            boxed="pad"
            money={!!wallet}
            font="mono"
            label={t.profile.balance}
            value={wallet ? formatTzs(wallet.balance) : "—"}
            icon={<I.wallet s={14} />}
            className="col-span-2 min-w-0 whitespace-nowrap border-b border-border px-5 sm:col-span-1 sm:border-b-0 lg:px-6"
            labelClassName="min-w-0 whitespace-normal break-words"
          />
          <Stat
            size="xl"
            labelStyle="widest"
            boxed="pad"
            font="mono"
            label={t.profile.openCount}
            value={formatNumber(positions.filter((p) => p.status === "OPEN").length)}
            icon={<I.sparkle s={14} />}
            className="min-w-0 whitespace-nowrap border-border px-5 sm:border-l lg:px-6"
            labelClassName="min-w-0 whitespace-normal break-words"
          />
          <Stat
            size="xl"
            labelStyle="widest"
            boxed="pad"
            font="mono"
            label={t.profile.settledCount}
            value={formatNumber(positions.filter((p) => p.status !== "OPEN").length)}
            icon={<I.check s={14} />}
            className="min-w-0 whitespace-nowrap border-l border-border px-5 lg:px-6"
            labelClassName="min-w-0 whitespace-normal break-words"
          />
        </div>
      </section>

      {/* ── SoF banner when declaration is pending or rejected.
          ⭐ "Under review" is WAITING — royal (§B11), as /profile/source-of-funds says the same state (R5-C) — and amber
          only where the player must act: a declaration to resubmit (R5-I, 2026-10-09). It was amber for both. */}
      {sofNeedsBanner && (
        <section className={`rounded-xl border p-5 ${sof!.reviewStatus === "REJECTED" ? "border-warning-border bg-warning-bg" : "border-info-border bg-info-bg"}`}>
          <div className="flex items-start gap-3">
            <I.fileSignature s={20} />
            <div className="min-w-0">
              <p className="font-display text-[15px] font-semibold text-text leading-tight">
                {sof!.reviewStatus === "REJECTED" ? t.profile.sofResubmit : t.profile.sofUnderReview}
              </p>
              <p className="mt-1 text-[13px] text-text-muted leading-snug">
                {sof!.reviewStatus === "REJECTED"
                  ? t.profile.sofResubmitBody
                  : t.profile.sofUnderReviewBody}
              </p>
              <Link href="/profile/source-of-funds" className="btn btn-primary btn-md btn-pill mt-3 inline-flex">
                {sof!.reviewStatus === "REJECTED" ? t.profile.updateDeclaration : t.profile.viewStatus}
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Achievements shelf */}
      <section>
        <h2 className="mb-3 flex items-center gap-1.5 font-mono text-micro uppercase eyebrow font-bold text-text-subtle">
          <I.trophy s={13} />
          {t.profile.achievements}
        </h2>
        <div className="rounded-xl glass-panel p-5">
          <BadgeShelf items={badges} />
          <p className="mt-4 text-center text-body-sm text-text-subtle">
            {t.profile.badgesHint}
          </p>
        </div>
      </section>

      {/* ── Settings grid */}
      <section>
        <h2 className="mb-3 flex items-center gap-1.5 font-mono text-micro uppercase eyebrow font-bold text-text-subtle">
          <I.settings s={13} />
          {t.profile.account}
        </h2>
        {/* 16px between the cards (gap-3 on the overridden scale; round 4, 2026-10-09, tile 188): the Akaunti hub's own
            gutter (`.kp-hub__grid`, var(--sp-4)), so the two doors to the same settings space their cards alike. It was
            gap-2, 12px — no rule chose it. */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {/* 🔴 THIS ROW POINTED AT ONE HREF WEARING THE AGENT DASHBOARD'S WORDS, because while
              invite was WITHDRAWN the only viewer who could see it WAS an approved agent. Opening
              the unpaid player invite (2026-09-25) breaks that identity: an ordinary player would
              have been handed "Agent dashboard · your recruits and commission" for a page that
              pays them nothing and names no commission — a row describing somebody else's
              programme.
              ⭐ ONE PREDICATE DECIDES BOTH THE ROW AND ITS WORDS, read once: `agentInGoodStanding`
              is the same fact `/profile/invite` uses to choose between the two bodies, so the door
              and the room cannot describe different programmes.
              ⛔ `accent` AND the "New" badge STAY WITH THE AGENT: the highlight belongs to
              the commission dashboard, not to a share link; and the badge announced a programme
              being launched, which the player invite is not. (The accent is brand, not gilt, since
              R5-C's gold audit — see SettingRow.)
              ⭐ …AND A PLAYER'S ROW SAYS THE PAGE'S NAME FOR THAT PLAYER (round 6, 2026-10-09, review C1): while invites pay,
              the page is "Alika na upate zawadi / Invite & Earn" (its tab and h1), and this row said "Alika marafiki" —
              now the one name `invite-name.ts` gives every door, its line the page's own call under it. Both shells (a
              page body); unchanged while invites pay nothing, as today.
              ⭐ R8-C (2026-10-10, the owner's ruling (4)) · AND NONE DURING A BREAK (`breakEnd`, read above): a reader whose break
              or self-exclusion is running is offered no invite, the agent's dashboard door included (the dashboard still
              opens at its address, with its statement). Both shells (a page body). */}
          {inviteIsLiveFor(inviteViewer) && (
            breakEnd ? null : inviteViewer.agentInGoodStanding ? (
              <SettingRow icon={I.shieldcheck} title={t.agent.dashTitle} subtitle={t.agent.dashSubtitle} href="/profile/invite" accent
                badge={t.common.newBadge} />
            ) : (
              <SettingRow icon={I.users} title={inviteName(t, { agent: false, paid: invitePayable })} subtitle={inviteLine(t, { agent: false, paid: invitePayable })} href="/profile/invite" />
            )
          )}
          <SettingRow icon={I.user}            title={t.profile.myAccount}           subtitle={t.profile.myAccountSub}            href="/profile/account" />
          <SettingRow icon={I.chart}           title={t.activity.title}              subtitle={t.activity.settingSub}             href="/profile/activity" />
          {/* ⭐ RECEIPTS (owner ruling 2026-10-07: "in the user profile we need a tab for internal receipts"). Every deposit
              and withdrawal, with its references, kept in the app — mailed or not, now that a deposit asks no email. The
              door is here, beside the money summary; the list lives with the wallet (`/wallet/receipts`, a money surface
              with the wallet's own "funds are safe" boundary), next to the single receipt it opens. */}
          <SettingRow icon={I.receipt}         title={t.receipts.title}              subtitle={t.receipts.settingSub}             href="/wallet/receipts" />
          <SettingRow icon={I.star}            title={t.watchlist.title}             subtitle={t.watchlist.settingSub}            href="/watchlist" />
          <SettingRow icon={I.bellRing}        title={t.push.pageTitle}              subtitle={t.push.settingSub}                 href="/profile/notifications" />
          <SettingRow icon={I.settings}        title={t.profile.responsibleGambling} subtitle={t.profile.responsibleGamblingSub}              href="/profile/responsible-gambling" />
          <SettingRow icon={I.keyRound}        title={t.security.title}              subtitle={t.security.settingSub}             href="/profile/security" />
          {/* 2026-09-13 — an APPROVED identity is not offered "Verify ID" again: the row asked a verified
              player to do something already done. Same predicate as the pill above.
              2026-09-13 — nor is a FINAL refusal (under 18, sanctions, identity used elsewhere): `startKyc`
              refuses a restart, so "ID document · selfie · review" offered a journey the server refuses.
              The red pill above still links to /profile/kyc, which explains the refusal. */}
          {/* The one question every KYC door asks (`kycDoorOffered`, kyc-refusal.ts — round 6, review C13): the Akaunti hub's
              row and the journey's avatar menu ask it too. */}
          {kycDoorOffered(kycLevel, kyc?.rejectReason) && (
            /* Round 5 (F17, one page, one name) named this row after the KYC page's h1 ("Thibitisha kitambulisho / Verify
               your identity"); ⭐ ROUND 6 (2026-10-09, review C13) — AFTER ITS TAB AND EYEBROW, "Uthibitisho wa kitambulisho /
               Identity verification / 身份验证": the page's h1 is a headline that changes with the reader's state
               ("Your identity is verified", "We couldn't verify you"), while its tab and eyebrow name it in every state —
               the convention every page of that shape follows (the leaderboard's "Bingwa", /help's "Msaada", /fairness's
               "Uthibitisho wa utatuzi": the door says the tab and the eyebrow, the h1 is the page's headline). The hub's
               row and the journey menu say the same. */
            <SettingRow icon={I.shieldcheck}   title={t.profile.kycIdentityVerification} subtitle={t.profile.verifyIdSub}            href="/profile/kyc" />
          )}
          <SettingRow icon={I.fileSignature}   title={t.profile.sourceOfFunds}       subtitle={t.profile.sourceOfFundsSub}                      href="/profile/source-of-funds" />
          <SettingRow icon={I.device}          title={t.profile.activeSessions}      subtitle={t.profile.activeSessionsSub}        href="/profile/sessions" />
          {/* R5-G (2026-10-09, G-1's sweep — R5-A's F17 rule, as the KYC row above): the help page's own name, its <title> and
              eyebrow ("Msaada / Help / 帮助", `common.help`), as the hub's row and the journey's footer say it — the row said
              "Help & support / 帮助与支持" in English and Chinese (Swahili's words coincide, "Msaada"). */}
          <SettingRow icon={I.heartPulse}      title={t.common.help}                 subtitle={t.profile.helpSupportSub}               href="/help" />
        </div>
      </section>

      {/* ── Sign out (POST to prevent CSRF — GET logout is neutered). The danger ink, as the avatar menu's Sign out and
          the sessions page's: a destructive door, never the NO side's rose (§B2a; R5-I, 2026-10-09). */}
      <form action="/auth/logout" method="POST">
        <button
          type="submit"
          className="group inline-flex w-full items-center justify-between gap-3 rounded-xl glass-panel px-4 py-3.5 hover:border-danger-border transition-colors"
        >
          <span className="inline-flex items-center gap-3">
            {/* ⚠️ LITERALS, not `h-9 w-9` — spacing is overridden (tailwind.config.ts:200-215)
                and `h-9` renders 64px, setting the whole sign-out row's height. */}
            <span className="inline-flex h-[36px] w-[36px] items-center justify-center rounded-md bg-danger-500/10 text-danger-fg group-hover:bg-danger-500/20 transition-colors">
              <I.logOut s={16} />
            </span>
            <span className="text-left">
              <p className={PROFILE_SIGN_OUT_TITLE}>{t.common.signOut}</p>
              <p className="mt-0.5 text-body-sm text-text-subtle">{t.profile.seeYouSoon}</p>
            </span>
          </span>
          <I.chevronRight s={16} />
        </button>
      </form>
    </PageContainer>
  );
}

/* ⭐ STAGE 9b — the local `Stat` fork is deleted; the strip above uses `ui/stat`.
 * Box (`px-4 py-3.5` = `boxed="pad"`), label (10px semibold 0.14em = `widest`), icon
 * row and value metrics (18px, leading-tight, mt-1) all mapped exactly. The ONE
 * rendered change is the value FACE — Sora → JetBrains Mono — which is §T5, and the
 * balance additionally gains the <Cash> privacy mask it never had. */

/* ⛔ APP-STATE TONES ONLY (2026-09-13): `success`/`danger`, never the betting `yes`/`no` inks — §B2a. The union
   has no yes/no member, so this page cannot paint an identity or email state in a stake's colour again. */
function Pill({ tone, children }: { tone: "success" | "danger" | "info" | "warning" | "neutral"; children: React.ReactNode }) {
  return (
    <Chip variant={tone} size="md">
      {children}
    </Chip>
  );
}

/**
 * ⭐ THE ACCENT ROW IS THE BRAND FAMILY, NOT GOLD (R5-C, the second gold audit, 2026-10-09). `accent` marks the one row
 * set apart from its siblings — the agent's dashboard — and "set apart" is a highlight, which the product says in its one
 * non-money accent (the selected pill, the current step, the unread dot). A door is not money (Q5): the only door the
 * rulebook gilds is the deposit door (§M3a). The commission it leads to is gold where it is EARNED, on that page. So the
 * edge, the wash, the side bar, the plate and the "NEW" pill are the brand family; the plate's glyph is the on-brand ink.
 */
function SettingRow({ icon: Icon, title, subtitle, href, accent, badge }: { icon: (typeof I)[keyof typeof I]; title: string; subtitle: string; href: string; accent?: boolean; badge?: string }) {
  return (
    <Link
      href={href as never}
      className={`group relative flex items-center gap-3 overflow-hidden rounded-xl border bg-bg-elevated p-3.5 transition-colors ${accent ? "border-brand-600/60 hover:border-brand-500" : "border-border hover:border-brand-400"} hover:bg-bg-overlay`}
      style={accent ? { background: "color-mix(in oklab, var(--brand-500) 7%, var(--bg-elevated))" } : undefined}
    >
      {accent && (
        <span aria-hidden className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full" style={{ background: "linear-gradient(180deg, var(--brand-400), var(--brand-600))" }} />
      )}
      <span
        /* ⚠️ LITERALS, not `h-10 w-10` — the overridden scale (tailwind.config.ts:200-215)
           makes `h-10` 80px, which is what set every profile menu row's height. */
        className={`inline-flex h-[40px] w-[40px] items-center justify-center rounded-md shrink-0 transition-colors ${accent ? "" : "bg-brand-500/10 text-brand-300 group-hover:bg-brand-500/15"}`}
        style={accent ? { background: "linear-gradient(180deg, var(--brand-400), var(--brand-600))", color: "var(--text-on-brand)" } : undefined}
      >
        <Icon s={17} />
      </span>
      <div className="flex-1 min-w-0">
        <p className={PROFILE_ROW_TITLE}>
          {/* ⛔ ONE flex item (2026-10-10, the v4 screenshot pass): the title row is a flex row (`gap-2`, for the badge), and
              `keepLastWords` returns the head and a nowrap tail — bare, they were TWO flex items: a 12px gap where a space
              belongs ("Source   of funds") and a title that no longer wrapped. Inside one span they are one line of text. */}
          <span>{keepLastWords(title)}</span>
          {badge && (
            <span className="inline-flex items-center rounded-pill border border-brand-600/50 bg-brand-500/15 px-1.5 py-0.5 font-mono text-micro font-bold uppercase tracking-[0.08em] text-brand-300">
              {badge}
            </span>
          )}
        </p>
        {/* ⭐ 2026-10-10 · the hub's line rules on these rows too (the screenshot pass, sw/zh at 320–390): a "·" list breaks
            only between its things (`DotSeq`), a line never ends on one word alone (`keepLastWords`), and Chinese breaks
            at punctuation, never inside a word — `.kp-hub__sub:lang(zh)`'s rule, applied by language. */}
        <p className="mt-0.5 text-body-sm text-text-subtle leading-snug [&:lang(zh)]:break-keep [&:lang(zh)]:[overflow-wrap:anywhere]"><DotSeq text={subtitle} renderPart={keepLastWords} /></p>
      </div>
      <I.chevronRight s={16} />
    </Link>
  );
}
