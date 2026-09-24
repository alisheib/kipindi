import Link from "next/link";
import { redirect } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { Chip } from "@/components/ui/chip";
import { Stat } from "@/components/ui/stat";
import { FiftyMark } from "@/components/brand";
import { AvatarUploader } from "@/components/profile/avatar-uploader";
import { ProfileNameEditor } from "@/components/profile/name-editor";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { inviteViewerFor } from "@/lib/server/affiliate-service";
import { listPositionsForUser } from "@/lib/server/market-service";
import { displayInitials } from "@/lib/display-label";
import { BadgeShelf } from "@/components/badges/Badge";
import { computeAchievementShelf } from "@/lib/server/achievements";
import { getServerT } from "@/lib/i18n-server";
import { formatTzs } from "@/lib/utils";
import { PageContainer } from "@/components/layout/page-container";
import { inviteIsLiveFor } from "@/lib/feature-state";
import { isFinalRefusal } from "@/lib/kyc-refusal";

export async function generateMetadata() {
  const { t } = await getServerT();
  return { title: t.profile.title };
}
export const dynamic = "force-dynamic";


/** Mask a Tanzanian E.164 phone for on-screen display per PDPA / GBT
 *  data-minimisation: keep prefix + 2 trailing digits, mask the rest. */
function maskPhone(phoneE164: string): string {
  if (phoneE164.length <= 6) return phoneE164;
  return `${phoneE164.slice(0, 4)}*****${phoneE164.slice(-2)}`;
}

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
   * `PENDING_REVIEW`; before that the pill reads "Verify ID".
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
          ? { tone: "warning", label: t.profile.kycMoreInfoPill, glyph: I.upload }
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
      <section className="relative overflow-hidden rounded-xl border border-border bg-bg-elevated">
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
        {/* Layered background — emerald → rose tilt + mark watermark */}
        <div
          className="absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(1200px 360px at 0% 0%, oklch(40% 0.10 152 / 0.30), transparent 60%), " +
              "radial-gradient(900px 320px at 100% 100%, oklch(45% 0.13 22 / 0.25), transparent 60%), " +
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
              fallbackPlaceholder={displayName}
            />
            <p className="mt-1.5 font-mono text-[12px] text-text-muted tabular-nums">
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
                  unconfirmed-email pill beside it already has. Verified, it only states. */}
              {kycLevel === "APPROVED"
                ? kycPillNode
                : <Link href="/profile/kyc" data-testid="profile-kyc-pill" className="no-underline inline-flex items-center min-h-[var(--tap-min)]">{kycPillNode}</Link>}
              {/* 2026-09-13 — the language this page is IN (the kp-locale cookie, what the header menu shows), in its
                  own name. It read the stored `user.locale` with no ZH case, and the language menu never writes that
                  column, so a zh page said "English". */}
              <Pill tone="neutral">{LANGUAGE_NAME[locale]}</Pill>
              {user.email && (
                user.emailVerifiedAt
                  ? <Pill tone="success"><I.check s={10} className="inline -mt-px" /> {t.profile.emailConfirmed}</Pill>
                  : <Link href="/profile/account" className="no-underline"><Pill tone="warning"><I.mail s={10} className="inline -mt-px" /> {t.profile.emailUnconfirmed}</Pill></Link>
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
            className="col-span-2 min-w-0 whitespace-nowrap border-b border-border sm:col-span-1 sm:border-b-0"
            labelClassName="min-w-0 whitespace-normal break-words"
          />
          <Stat
            size="xl"
            labelStyle="widest"
            boxed="pad"
            font="mono"
            label={t.profile.openCount}
            value={String(positions.filter((p) => p.status === "OPEN").length)}
            icon={<I.sparkle s={14} className="text-yes-300" />}
            className="min-w-0 whitespace-nowrap border-border sm:border-l"
            labelClassName="min-w-0 whitespace-normal break-words"
          />
          <Stat
            size="xl"
            labelStyle="widest"
            boxed="pad"
            font="mono"
            label={t.profile.settledCount}
            value={String(positions.filter((p) => p.status !== "OPEN").length)}
            icon={<I.check s={14} />}
            className="min-w-0 whitespace-nowrap border-l border-border"
            labelClassName="min-w-0 whitespace-normal break-words"
          />
        </div>
      </section>

      {/* ── SoF banner when declaration is pending or rejected */}
      {sofNeedsBanner && (
        <section className="rounded-xl border border-warning-border bg-warning-bg p-5">
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
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {/* ⛔ INVITE IS WITHDRAWN FOR ORDINARY PLAYERS — THE ROW IS ABSENT, NOT BADGED.
              It used to render with a gilt "coming soon" tag, which was right while the
              programme was merely waiting for sign-off. It is no longer waiting: referral
              earning now belongs to vetted, fee-paying, approved AGENTS only, so a badge
              here would advertise a programme this player can never enter. A grid item that
              is not rendered leaves no hole — the remaining rows simply flow up. */}
          {inviteIsLiveFor(await inviteViewerFor(user.id)) && (
            <SettingRow icon={I.shieldcheck}   title={t.agent.dashTitle}             subtitle={t.agent.dashSubtitle}             href="/profile/invite" accent
              badge={t.common.newBadge} />
          )}
          <SettingRow icon={I.user}            title={t.profile.myAccount}           subtitle={t.profile.myAccountSub}            href="/profile/account" />
          <SettingRow icon={I.chart}           title={t.activity.title}              subtitle={t.activity.settingSub}             href="/profile/activity" />
          <SettingRow icon={I.star}            title={t.watchlist.title}             subtitle={t.watchlist.settingSub}            href="/watchlist" />
          <SettingRow icon={I.bellRing}        title={t.push.pageTitle}              subtitle={t.push.settingSub}                 href="/profile/notifications" />
          <SettingRow icon={I.settings}        title={t.profile.responsibleGambling} subtitle={t.profile.responsibleGamblingSub}              href="/profile/responsible-gambling" />
          <SettingRow icon={I.keyRound}        title={t.security.title}              subtitle={t.security.settingSub}             href="/profile/security" />
          {/* 2026-09-13 — an APPROVED identity is not offered "Verify ID" again: the row asked a verified
              player to do something already done. Same predicate as the pill above.
              2026-09-13 — nor is a FINAL refusal (under 18, sanctions, identity used elsewhere): `startKyc`
              refuses a restart, so "ID document · selfie · review" offered a journey the server refuses.
              The red pill above still links to /profile/kyc, which explains the refusal. */}
          {kycLevel !== "APPROVED" && !(kycLevel === "REJECTED" && isFinalRefusal(kyc?.rejectReason)) && (
            <SettingRow icon={I.shieldcheck}   title={t.common.verifyId}             subtitle={t.profile.verifyIdSub}            href="/profile/kyc" />
          )}
          <SettingRow icon={I.fileSignature}   title={t.profile.sourceOfFunds}       subtitle={t.profile.sourceOfFundsSub}                      href="/profile/source-of-funds" />
          <SettingRow icon={I.device}          title={t.profile.activeSessions}      subtitle={t.profile.activeSessionsSub}        href="/profile/sessions" />
          <SettingRow icon={I.heartPulse}      title={t.profile.helpSupport}         subtitle={t.profile.helpSupportSub}               href="/help" />
        </div>
      </section>

      {/* ── Sign out (POST to prevent CSRF — GET logout is neutered) */}
      <form action="/auth/logout" method="POST">
        <button
          type="submit"
          className="group inline-flex w-full items-center justify-between gap-3 rounded-xl glass-panel px-4 py-3.5 hover:border-no-700 transition-colors"
        >
          <span className="inline-flex items-center gap-3">
            {/* ⚠️ LITERALS, not `h-9 w-9` — spacing is overridden (tailwind.config.ts:200-215)
                and `h-9` renders 64px, setting the whole sign-out row's height. */}
            <span className="inline-flex h-[36px] w-[36px] items-center justify-center rounded-md bg-no-500/10 text-no-300 group-hover:bg-no-500/20 transition-colors">
              <I.logOut s={16} />
            </span>
            <span className="text-left">
              <p className="font-display text-[14px] font-semibold text-text leading-tight">{t.common.signOut}</p>
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

function SettingRow({ icon: Icon, title, subtitle, href, accent, badge }: { icon: (typeof I)[keyof typeof I]; title: string; subtitle: string; href: string; accent?: boolean; badge?: string }) {
  return (
    <Link
      href={href as never}
      className={`group relative flex items-center gap-3 overflow-hidden rounded-xl border bg-bg-elevated p-3.5 transition-colors ${accent ? "border-gold-700/60 hover:border-gold-500" : "border-border hover:border-brand-400"} hover:bg-bg-overlay`}
      style={accent ? { background: "color-mix(in oklab, var(--gold-500) 7%, var(--bg-elevated))" } : undefined}
    >
      {accent && (
        <span aria-hidden className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full" style={{ background: "linear-gradient(180deg, var(--gold-400), var(--gold-600))" }} />
      )}
      <span
        /* ⚠️ LITERALS, not `h-10 w-10` — the overridden scale (tailwind.config.ts:200-215)
           makes `h-10` 80px, which is what set every profile menu row's height. */
        className={`inline-flex h-[40px] w-[40px] items-center justify-center rounded-md shrink-0 transition-colors ${accent ? "text-gold-fg" : "bg-brand-500/10 text-brand-300 group-hover:bg-brand-500/15"}`}
        style={accent ? { background: "linear-gradient(180deg, var(--gold-400), var(--gold-600))" } : undefined}
      >
        <Icon s={17} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-display text-[13.5px] font-semibold text-text leading-tight flex items-center gap-2">
          {title}
          {badge && (
            <span className="inline-flex items-center rounded-pill border border-gold-700/50 bg-gold-500/15 px-1.5 py-0.5 font-mono text-micro font-bold uppercase tracking-[0.08em] text-gold-300">
              {badge}
            </span>
          )}
        </p>
        <p className="mt-0.5 text-body-sm text-text-subtle leading-snug">{subtitle}</p>
      </div>
      <I.chevronRight s={16} />
    </Link>
  );
}
