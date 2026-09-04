import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { I } from "@/components/ui/glyphs";
import { BackLink } from "@/components/ui/back-link";
import { currentSession } from "@/lib/server/auth-service";
import { getPlayerReferralSummary } from "@/lib/server/affiliate-service";
import QRCode from "qrcode";
import { FiftyMark, GiltCorner } from "@/components/brand";
import { Chip } from "@/components/ui/chip";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Stat } from "@/components/ui/stat";
import { ReferralShare } from "./invite-client";
import { fill, formatCompactNumber } from "@/lib/utils";
import { Ring } from "@/components/charts/ring";
import { getBonusConfig } from "@/lib/server/bonus-config";
import { formatDateShort as fmtDate, formatNumber } from "@/lib/utils";
import { getServerT } from "@/lib/i18n-server";
import { PageContainer } from "@/components/layout/page-container";
import { ComingSoonBanner } from "@/components/ui/coming-soon-banner";
import { ComingSoonBadge } from "@/components/ui/coming-soon-badge";
import { inviteIsLive } from "@/lib/invite-feature";

// Localised tab title (POLISH-BACKLOG §1.7) — was the hard-coded English
// "Invite & Earn", which a Swahili player saw in their browser tab and history.
export async function generateMetadata() {
  const { t } = await getServerT();
  return { title: t.profile.inviteEarn };
}
export const dynamic = "force-dynamic";

const PROMISE_ICON = { percent: I.percent, ticket: I.ticket, gift: I.gift } as const;

/** Gold earnings ring — the kit `Ring` as a progress dial (NOT the betting
 *  ConfidenceDial, which is green/red). Gold is correct here and only here on
 *  this page: the ring counts money that was EARNED (§B4). The center label is
 *  the platform's one compaction grammar (S-14) — a private spelling of it
 *  lived here until 2026-09-04. */
function EarningsRing({ value, label }: { value: number; label: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <Ring
      size={96}
      strokeWidth={8}
      segments={[{
        frac: v / 100,
        stroke: "var(--gold-400)",
        round: true,
        style: { filter: "drop-shadow(0 0 6px color-mix(in oklab, var(--gold-300) 50%, transparent))" },
      }]}
      className="block"
    >
      <text
        x="48"
        y="50"
        textAnchor="middle"
        dominantBaseline="middle"
        fontWeight={700}
        fontSize="22"
        fill="var(--gold-300)"
        style={{ fontFamily: "var(--font-mono)", letterSpacing: "-0.03em" }}
      >
        {label}
      </text>
    </Ring>
  );
}

function Cap({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`font-mono text-micro uppercase eyebrow font-bold text-text-subtle ${className}`}>
      {children}
    </p>
  );
}

/* ⭐ STAGE 9b — `Kpi` is deleted; the two tiles are `ui/stat` at the `3xl` rung
 * (24px mono, leading-none) in the `glass` box, with `strong` labels — the same
 * 9.5px bold 0.1em metrics `Cap` sets, which is why `Cap` and this fork always
 * agreed and why the dictionary carries them.
 *
 * ⛔ THE VALUE'S `tracking-[-0.02em]` IS DROPPED ON PURPOSE. §M4: "money is mono,
 * tabular, NEVER letter-spaced — tracking is for identifiers". The earned figure
 * was the only money on the page wearing negative tracking, and <Stat money>
 * clears it at source so no caller can put it back.
 *
 * ⚠️ Two residual deltas, both vertical and both inside the tile: the gap under the
 * label row 8px → 6px and the gap above the `sub` line 6px → 2px (the sub is now
 * the primitive's `hint`, which also gives it leading-tight). The tile is ~6px
 * shorter; no type size, weight or colour moves.
 *
 * `Cap` survives — it still has two standalone caption call sites below. */

export default async function InvitePage() {
  const session = await currentSession();
  if (!session) redirect("/auth/login?next=/profile/invite");

  const { t, locale } = await getServerT();

  /**
   * ⛔ COMING SOON — AND THE PAGE RETURNS BEFORE THE REFERRAL READ, NOT AFTER IT.
   * Ali's call, 2026-09-03: Invite & Earn is not open yet. A badge on the entry points
   * is not enough on its own — this page's live body hands the player a real referral
   * CODE, a shareable LINK and a QR that encodes it. Printing those under a "coming
   * soon" flag would be the product contradicting itself, and a code shared today is a
   * link that has to keep working when the programme opens.
   * ⭐ So the guard sits ABOVE `getPlayerReferralSummary`: no summary is fetched, no
   * code is minted into a QR, and no share link is built from the request host. The
   * cheapest correct behaviour is also the honest one.
   */
  if (!inviteIsLive()) {
    return (
      <PageContainer tier="form" className="space-y-5">
        <BackLink fallbackHref="/profile" label={t.common.profile} />
        <h1 className="sr-only">{t.profile.inviteEarn}</h1>

        <div className="flex items-center justify-between gap-3">
          {/* ⚠️ `text-title-sm` (18px), NOT the live body's hand-typed `text-[19px]`. This branch
              is NEW code, and new code names a rung — `test:type-scale` §4's ratchet counted the
              copied literal the moment it was written. The two titles never render together
              (they are alternate branches of the same page), so the 1px is not a seam. */}
          <p className="font-display text-title-sm font-bold leading-none">{t.profile.inviteEarn}</p>
          <ComingSoonBadge label={t.profile.inviteComingSoonTag} />
        </div>

        {/* ⭐ THE SAME BOX THE PROPOSE SURFACES RENDER — literally, not "matching". It was
            pasted here first, and `test:spacing-scale` caught the paste by counting its `p-3.5`
            as a NEW inverted-spacing usage. That pushed it into the kit as
            `<ComingSoonBanner>`, which is where it should always have been. */}
        <ComingSoonBanner
          title={t.profile.inviteComingSoonTitle}
          body={t.profile.inviteComingSoonBody}
        />

        {/* Guided onward, never a dead end — the same courtesy the DISABLED proposals
            view extends. The board is where a player can act right now. */}
        <div className="pt-1">
          <Link href="/markets">
            <Button variant="secondary" size="md" leading={<I.markets s={14} />}>
              {t.positions.browseMarkets}
            </Button>
          </Link>
        </div>
      </PageContainer>
    );
  }
  // B-1 — no swallow: the fallback fabricated "0 recruits · TZS 0 earned ·
  // program off" to a player with real referral earnings. Throw to
  // profile/error.tsx instead.
  const s = await getPlayerReferralSummary(session.userId);
  // F5 · the wagering multiple the requirements list quotes — READ, never written.
  const bonusCfg = getBonusConfig();
  const ringValue = s.recruitCount === 0 ? 0 : Math.min(100, 30 + s.recruitCount * 12);
  const ringLabel = s.earnedTzs > 0 ? formatCompactNumber(s.earnedTzs) : "0";
  const shareText = t.profile.shareText;

  // Build the referral link from the ACTUAL request host so it always matches
  // the URL the player is on (the live deploy) rather than a possibly-stale
  // NEXT_PUBLIC_APP_URL. On Railway now → railway link; on 50pick.tz when the
  // domain goes live → 50pick.tz link, automatically. Falls back to the
  // service-built link when headers are unavailable.
  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host");
  const proto = hdrs.get("x-forwarded-proto") ?? "https";
  const shareLink = host && s.code
    ? `${proto}://${host}/auth/register?ref=${encodeURIComponent(s.code)}`
    : s.link;

  // Share-card QR (A9) — royal modules on white for scannability; sanctioned
  // raw-hex context. Encodes the referral link; graceful if the lib/link fails.
  let qrDataUrl = "";
  if (shareLink) {
    try {
      qrDataUrl = await QRCode.toDataURL(shareLink, { margin: 1, width: 240, color: { dark: "#0A0E4A", light: "#FFFFFF" } });
    } catch { /* graceful — card renders without the QR */ }
  }

  return (
    <PageContainer tier="form" className="space-y-5">
      <BackLink fallbackHref="/profile" label={t.common.profile} />
      <h1 className="sr-only">{t.profile.inviteEarn}</h1>

      {/* Title row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-[19px] font-bold leading-none">
            {t.profile.inviteEarn}
          </p>
        </div>
        <Chip variant={s.programEnabled ? "active" : "paused"}>{s.programEnabled ? t.common.active : t.common.paused}</Chip>
      </div>

      {/* Hero — gold earnings ring + adaptive promises */}
      <section
        className="relative overflow-hidden rounded-xl border border-border-strong p-5"
        style={{ background: "linear-gradient(150deg, var(--bg-elevated), var(--royal-950))" }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(120% 90% at 100% 0%, color-mix(in oklab, var(--gold-500) 12%, transparent), transparent 60%)" }}
        />
        <div className="relative flex items-center gap-4">
          <EarningsRing value={ringValue} label={ringLabel} />
          <div className="min-w-0 flex-1">
            <Cap className="mb-1.5 !text-gold-300">{t.profile.inviteEarn}</Cap>
            <p className="font-display text-[19px] font-bold leading-tight">{t.profile.inviteEarnSub}</p>
          </div>
        </div>

        {s.promises.length > 0 && (
          <>
            <div className="my-3.5 h-px bg-border" />
            <div className="space-y-2.5">
              {s.promises.map((p, i) => {
                const PIcon = PROMISE_ICON[p.icon];
                return (
                  <div key={i} className="flex items-start gap-2.5">
                    <span
                      className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-[7px] text-gold-300"
                      style={{ background: "color-mix(in oklab, var(--gold-500) 16%, transparent)" }}
                    >
                      <PIcon s={14} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium leading-snug">{locale === "sw" ? p.sw : p.en}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* Paused banner */}
      {!s.programEnabled && (
        <div
          className="flex gap-2.5 rounded-xl border p-3"
          style={{
            background: "color-mix(in oklab, var(--warning-500) 12%, transparent)",
            borderColor: "color-mix(in oklab, var(--warning-500) 30%, transparent)",
          }}
        >
          <span className="shrink-0" style={{ color: "var(--gold-300)" }}><I.info s={16} /></span>
          <p className="text-body-sm leading-relaxed text-text-muted">
            {t.profile.programPaused}
          </p>
        </div>
      )}

      {/* A9 share-card — the visual a referrer sends: FiftyMark, headline, the
          CODE in a GiltCorner frame, QR bottom-right. Shows the code, never a
          balance. Gold is principled here (the invite pays the referrer). */}
      <section className="relative overflow-hidden rounded-xl border p-5" style={{ background: "#060A50", borderColor: "var(--gold-700)" }}>
        <GiltCorner size={38} rotate={0} style={{ position: "absolute", top: 6, left: 6 }} />
        <GiltCorner size={38} rotate={180} style={{ position: "absolute", bottom: 6, right: 6 }} />
        <div className="relative flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <FiftyMark size={38} />
            <p className="mt-3 font-display text-[20px] font-bold leading-tight text-text">{t.common.youveBeenInvited}</p>
            <p className="mt-3 font-mono text-micro uppercase eyebrow font-bold text-gold-300/70">{t.common.invite}</p>
            <div className="mt-1 inline-block rounded-md border border-gold-700 px-3 py-1.5" style={{ background: "color-mix(in oklab, var(--gold-500) 10%, transparent)" }}>
              <span className="font-mono text-[22px] font-bold tracking-[0.1em] text-gold-300">{s.code || "—"}</span>
            </div>
          </div>
          {qrDataUrl && (
            <div className="shrink-0 rounded-lg bg-white p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="" aria-hidden width={104} height={104} className="block" />
            </div>
          )}
        </div>
      </section>

      {/* Referral link + share (client) */}
      <div id="referral-share">
        <ReferralShare link={shareLink} shareText={shareText} />
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-2.5">
        <Stat
          size="3xl"
          labelStyle="strong"
          boxed="glass"
          label={t.common.invite}
          value={String(s.recruitCount)}
          hint={s.recruitCount > 0 ? t.common.allTime : "—"}
          icon={<I.users s={14} />}
          iconAlign="end"
        />
        {/* ⛔ `money` is load-bearing here: this is the player's own EARNED referral
            balance and the fork rendered it as a bare numeral, outside the <Cash>
            privacy mask that covers every other personal figure in the product.
            `tone="gold"` stays FLAT rather than `struck` — M3's struck gilt is a
            separate, visible decision and is not smuggled in by a consolidation. */}
        <Stat
          size="3xl"
          labelStyle="strong"
          boxed="glass"
          tone="gold"
          money
          label={t.proposals.earned}
          value={formatNumber(s.earnedTzs)}
          hint="TZS"
          icon={<I.coins s={14} />}
          iconAlign="end"
        />
      </div>

      {/* How it works */}
      <section className="rounded-xl glass-panel p-4">
        <p className="font-display text-[15px] font-bold leading-tight">
          {t.profile.howItWorks}
        </p>
        <div className="mt-3 space-y-3">
          {[
            t.common.share + " " + t.profile.yourReferralLink.toLowerCase(),
            t.common.signUp + " & " + t.common.placeBet.toLowerCase(),
            t.proposals.earned,
          ].map((label, i) => (
            <div key={i} className="flex items-center gap-3">
              <span
                className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full font-mono text-[14px] font-bold"
                style={
                  i === 2
                    ? { background: "linear-gradient(180deg, var(--gold-400), var(--gold-600))", color: "var(--gold-950)", border: "1px solid var(--gold-700)" }
                    : { background: "color-mix(in oklab, var(--royal-500) 18%, transparent)", color: "var(--royal-200)", border: "1px solid color-mix(in oklab, var(--royal-500) 36%, transparent)" }
                }
              >
                {i + 1}
              </span>
              <div className="flex-1">
                <p className="text-[13.5px] font-semibold">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Requirements banner — Management Bonus Rules §4 + §5 */}
      <section className="rounded-xl border border-border bg-bg-elevated/60 p-4 space-y-2">
        <p className="font-mono text-micro uppercase eyebrow font-bold text-text-subtle flex items-center gap-1.5">
          <I.shieldcheck s={11} />
          {t.profile.bonusRequirements}
        </p>
        <ul className="space-y-1.5 text-body-sm text-text-muted leading-snug list-disc pl-4">
          <li>{t.profile.inviteReqRegister}</li>
          <li>{t.profile.inviteReqDeposit}</li>
          <li>{t.profile.inviteReqBet}</li>
          {/* F5 · the multiple is READ from bonus-config, not written into the copy. */}
          <li>{fill(t.profile.inviteReqWager, { wager: bonusCfg.defaultWagerMultiplier })}</li>
          <li>{t.profile.inviteReqExpiry}</li>
          <li>{t.profile.inviteReqSequential}</li>
        </ul>
      </section>

      {/* Recruits */}
      <Cap className="!mt-1">{t.profile.yourReferrals}</Cap>
      {s.recruits.length > 0 ? (
        <div className="overflow-hidden rounded-xl glass-panel">
          {s.recruits.map((r, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 px-3.5 py-2.5 ${i < s.recruits.length - 1 ? "border-b border-border" : ""}`}
            >
              <Avatar initials={r.maskedName.slice(0, 2)} size="sm" seed={r.maskedName} />
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[12.5px] font-medium">{r.maskedName}</p>
                <p className="font-mono text-[10px] text-text-subtle">{t.common.joined} {fmtDate(r.joinedAt)}</p>
              </div>
              <Chip variant={r.earnedTzs > 0 ? "resolved" : "pending"}>{r.status}</Chip>
              <div className={`w-[64px] text-right font-mono text-[12.5px] font-semibold ${r.earnedTzs > 0 ? "text-gold-300" : "text-text-subtle"}`}>
                {r.earnedTzs > 0 ? "+" + formatNumber(r.earnedTzs) : "—"}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          kind="leaderboard"
          title={t.profile.noReferralsYet}
          body={t.profile.noReferralsBody}
          action={
            <a href="#referral-share">
              <Button variant="gold" size="md" leading={<I.share s={14} />}>
                {t.profile.shareWithFriends}
              </Button>
            </a>
          }
        />
      )}

      <p className="pt-1 text-center text-body-sm leading-relaxed text-text-subtle">
        {t.profile.rewardsDisclaimer}
      </p>
    </PageContainer>
  );
}
