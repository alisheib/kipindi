import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { I } from "@/components/ui/glyphs";
import { IconPlate } from "@/components/ui/icon-plate";
import { BackLink } from "@/components/ui/back-link";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { getPlayerReferralSummary, inviteViewerFor, getAgentDashboard, referralRewardDestination } from "@/lib/server/affiliate-service";
import { AgentDashboard } from "./agent-dashboard";
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
import { inviteIsLiveFor, playerInviteRewardsLive } from "@/lib/feature-state";

// Localised tab title (POLISH-BACKLOG §1.7) — was the hard-coded English
// "Invite & Earn", which a Swahili player saw in their browser tab and history.
export async function generateMetadata() {
  const { t } = await getServerT();
  // ⭐ The TAB TITLE obeys the same switch the body does. A browser tab and a history entry
  // reading "Invite & Earn" is a promise of money made outside the page, where no conditional in
  // the body can reach it — and it is the surface a player sees when the page is not even open.
  //
  // 🔴 AND IT IS VIEWER-AWARE, BECAUSE THIS ROUTE SERVES TWO PROGRAMMES. `playerInviteRewardsLive()`
  // alone titled an APPROVED AGENT's commission dashboard "Invite friends" — the body renders
  // `<AgentDashboard>` with their recruits and their earnings, so the tab was describing the wrong
  // product to the one viewer who IS paid. ⚠️ The session read costs one extra round trip on one
  // low-traffic route, and a title that contradicts its own page is the thing it buys off.
  // ⛔ It fails CLOSED: no session, a failed read, or anyone not in agent standing gets the
  // unpaid words, never the promise.
  const session = await currentSession();
  const agent = session ? (await inviteViewerFor(session.userId)).agentInGoodStanding : false;
  return { title: (playerInviteRewardsLive() || agent) ? t.profile.inviteEarn : t.profile.inviteFriends };
}
export const dynamic = "force-dynamic";

const PROMISE_ICON = { percent: I.percent, ticket: I.ticket, gift: I.gift } as const;

/** Gold earnings ring — the kit `Ring` as a progress dial (NOT the betting
 *  ConfidenceDial, which is green/red). Gold is correct here and only here on
 *  this page: the ring counts money that was EARNED (§B4). The center label is
 *  the platform's one compaction grammar (S-14) — a private spelling of it
 *  lived here until 2026-09-04.
 *
 *  ⭐ `tone` ARRIVED WITH THE UNPAID INVITE (2026-09-25) AND IT IS A MONEY RULE, NOT A PALETTE
 *  OPTION. `gold` keeps the paragraph above word for word. `royal` is the dial counting FRIENDS
 *  on a page where nothing was earned — §M3: struck gold appears only where money was earned, and
 *  a gold dial over a headcount would be the page's loudest false statement about money.
 *  ⛔ Do not add a third tone without a reason of that kind; the two here are two facts. */
function EarningsRing({ value, label, tone = "gold" }: { value: number; label: string; tone?: "gold" | "royal" }) {
  const v = Math.max(0, Math.min(100, value));
  const stroke = tone === "gold" ? "var(--gold-400)" : "var(--royal-400)";
  const glow = tone === "gold" ? "var(--gold-300)" : "var(--royal-300)";
  const text = tone === "gold" ? "var(--gold-300)" : "var(--royal-200)";
  return (
    <Ring
      size={96}
      strokeWidth={8}
      segments={[{
        frac: v / 100,
        stroke,
        round: true,
        style: { filter: `drop-shadow(0 0 6px color-mix(in oklab, ${glow} 50%, transparent))` },
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
        fill={text}
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

export default async function InvitePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const session = await currentSession();
  if (!session) redirect("/auth/login?next=/profile/invite");

  const { t, locale } = await getServerT();

  /**
   * ⛔ NOT THIS VIEWER'S PAGE → 404, NOT A "COMING SOON" BODY.
   *
   * This branch used to render a gilt coming-soon panel, which was the honest answer while
   * Invite & Earn was merely waiting for sign-off. It is not waiting any more: referral
   * earning belongs to vetted, fee-paying, APPROVED AGENTS, and an ordinary player is not
   * in a queue for it. A "coming soon" page would promise them a programme they will never
   * be offered — the product contradicting itself, which is the exact failure the original
   * guard was written to avoid. It is the same reasoning, applied to a changed decision.
   *
   * 🔴 AND ON 2026-09-25 THE POPULATION THIS GATE REFUSES BECAME SMALL — READ IT AGAIN BEFORE
   * TRUSTING THE PARAGRAPHS BELOW. `PRODUCT_STATE.invite` is ACTIVE: an ordinary player in good
   * standing now lands on the live body, unpaid. What still falls through to `notFound()` is a
   * signed-in account that may NOT hold a link — CLOSED, SUSPENDED or SELF_EXCLUDED
   * (`playerStandingFor`, composed into the viewer). So the gate is no longer "everyone but an
   * agent"; it is a genuine standing check, and the notes below about what must not be minted
   * ahead of it apply to it unchanged — with more force, because a self-excluded player is
   * exactly who must not be handed a fresh recruiting link.
   *
   * ⭐ AND THE GUARD STILL SITS ABOVE `getPlayerReferralSummary`, for the original reason:
   * the live body below mints a real referral CODE, a shareable LINK and a QR encoding it.
   * Nothing is fetched, nothing is minted and no link is built from the request host for
   * someone who may not have one.
   *
   * ⚠️ `notFound()` and not `redirect("/profile")`: this route genuinely does not exist for
   * this account, and the not-found view says so rather than bouncing them somewhere else.
   *
   * 🔴 MEASURED, AND NOT WHAT YOU WOULD ASSUME — THE HTTP STATUS IS **200**, NOT 404.
   * This segment has a `loading.tsx`, which is a Suspense boundary, so Next flushes the
   * shell (and commits the status) BEFORE this async component throws. The player sees the
   * not-found view; the response line says 200. Verified on a running server, not reasoned
   * about: role PLAYER → gate false → `notFound()` called → body is the not-found UI, and
   * **no code, link or QR is rendered** — the referral read below never runs.
   * ⛔ DO NOT "FIX" THE STATUS BY DELETING `loading.tsx`. Every async route in this app has
   * one (CLAUDE.md), and the status is cosmetic here: nothing leaks either way. If a true
   * 404 is ever required, the gate has to move ahead of the render — `proxy.ts` — not be
   * bought by removing a loading state.
   */
  const inviteViewer = await inviteViewerFor(session.userId);
  /**
   * ⭐ AN APPROVED AGENT GETS THEIR OWN PAGE — a distinct read model (`agent-dashboard.tsx`),
   * never the player promo's body with fields swapped. It renders for a DEACTIVATED agent too,
   * read-only: the history is theirs and the share surfaces are gone. `getAgentDashboard`
   * returns null for anyone not approved, so this mints nothing for a viewer who may not refer —
   * the same reason the gate below sits above the player summary read.
   */
  const agentDash = await getAgentDashboard(session.userId);
  /**
   * ⭐ PLAYER QUERY, TASK 4.11 — the params are threaded to the agent dashboard because THAT is
   * where this route's list lives. `getAgentDashboard` returns non-null exactly when `approvedAt`
   * is set, so an approved agent lands here and never sees a line of the body below.
   * ⚠️ THE OLD NOTE HERE SAID THERE WAS "NO THIRD CASE" AND THAT THE PLAYER BODY OPENED ONLY UNDER
   * `FEATURE_INVITE=ACTIVE`. Both were true of a withdrawn feature and are false now: the third
   * case is the ordinary player, it is the common case, and it renders on the shipped product
   * state. The filter rail stays on the agent dashboard because that is still where this route's
   * long list lives — a player's list is their own friends, and it does not need one.
   */
  if (agentDash) return <AgentDashboard dash={agentDash} sp={sp} />;
  if (!inviteIsLiveFor(inviteViewer)) notFound();
  // B-1 — no swallow: the fallback fabricated "0 recruits · TZS 0 earned ·
  // program off" to a player with real referral earnings. Throw to
  // profile/error.tsx instead.
  const s = await getPlayerReferralSummary(session.userId);
  /**
   * ⭐ THE ONE DISCRIMINATOR FOR EVERY MONEY WORD ON THIS PAGE, and it is READ FROM THE SUMMARY
   * rather than asked again here. The server already resolved it to decide whether `promises` may
   * contain a sentence; a second `playerInviteRewardsLive()` call in the render is how a page and
   * its read model start disagreeing — which is exactly how the requirements list below came to
   * describe a bonus wallet the payer had stopped using.
   *
   * ⛔ WHAT IT GATES IS NOT DECORATION. Under `paid === false` the page shows no earnings ring, no
   * earned tile, no promise rows, no bonus-requirements list, no per-friend money column and no
   * gold — because `DESIGN_AUTHORITY` §M3 is that struck gold means money was EARNED, and here
   * none was.
   * ⚠️ THE GUARD IS `qa:withdrawn-render` §2, WHICH READS THE RENDERED PAGE — it asserts no
   * `GiltCorner` and no `gold-700` reach the HTML. ⛔ This note used to cite
   * `npm run test:gold-is-money`, and that suite has never read this file: it is scoped to a
   * two-entry list of IDENTITY surfaces (`identity-avatar.tsx`, `updown-card.tsx`). A comment that
   * names a guard is read as evidence the guard exists AND covers this — so it must name one that
   * does, or the next reader trusts a check nobody is running.
   */
  const paid = s.rewardsLive;
  // F5 · the wagering multiple the requirements list quotes — READ, never written.
  const bonusCfg = getBonusConfig();
  // Where a reward ACTUALLY lands — the same predicate `creditWallet` routes on, so the
  // requirements list below can never promise a wallet the payer does not use.
  const rewardDestination = referralRewardDestination();
  /**
   * ⭐ THE RING COUNTS WHAT THE PAGE IS ABOUT. Paid: money earned, in gold. Unpaid: friends
   * joined, in royal — and the label is the COUNT, not a currency, so nothing on the dial can be
   * read as a balance. ⛔ Not "the same ring with the gold swapped out": a dial whose fill means
   * TZS on one product state and people on another needs both meanings spelled where it is built.
   */
  const ringValue = s.recruitCount === 0 ? 0 : Math.min(100, 30 + s.recruitCount * 12);
  const ringLabel = paid
    ? (s.earnedTzs > 0 ? formatCompactNumber(s.earnedTzs) : "0")
    : String(s.recruitCount);
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
      <h1 className="sr-only">{paid ? t.profile.inviteEarn : t.profile.inviteFriends}</h1>

      {/* Title row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-[19px] font-bold leading-none">
            {paid ? t.profile.inviteEarn : t.profile.inviteFriends}
          </p>
        </div>
        {/* ⛔ THE CHIP IS THE PAID PROGRAMME'S STATUS AND IT IS HIDDEN WHEN THERE IS NO PROGRAMME.
            `programEnabled` is the operator's master switch over commission / bonus / prize; with
            `inviteRewards` WITHDRAWN it answers a question nobody asked, and "Active" beside a
            share link reads as "you are earning". An Active/Paused pair where neither state means
            anything is the flag-worse-than-dead-code shape `feature-state.ts` records deleting
            twice — so under the unpaid invite it does not render at all. */}
        {paid && (
          <Chip variant={s.programEnabled ? "active" : "paused"}>{s.programEnabled ? t.common.active : t.common.paused}</Chip>
        )}
      </div>

      {/* Hero — the dial (gold: money earned · royal: friends joined) + adaptive promises */}
      <section
        className="relative overflow-hidden rounded-xl border border-border-strong p-5"
        style={{ background: "linear-gradient(150deg, var(--bg-elevated), var(--royal-950))" }}
      >
        {/* ⚠️ THE WASH IS PART OF THE MONEY RULE, not a background. A gold bloom behind a headcount
            is the same claim the ring would make, made quietly — so it turns royal with it. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(120% 90% at 100% 0%, color-mix(in oklab, var(--${paid ? "gold" : "royal"}-500) 12%, transparent), transparent 60%)` }}
        />
        <div className="relative flex items-center gap-4">
          <EarningsRing value={ringValue} label={ringLabel} tone={paid ? "gold" : "royal"} />
          <div className="min-w-0 flex-1">
            <Cap className={`mb-1.5 ${paid ? "!text-gold-300" : "!text-royal-300"}`}>
              {paid ? t.profile.inviteEarn : t.profile.friendsJoined}
            </Cap>
            <p className="font-display text-[19px] font-bold leading-tight">
              {paid ? t.profile.inviteEarnSub : t.profile.inviteFriendsSub}
            </p>
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
                    {/* ⚠️ A NINTH PLATE THE STAGE-9 CONSOLIDATION NOTE NEVER LISTED — `rounded-[7px]`,
                        a fifth arbitrary radius on top of the four that note enumerates. Found by
                        searching for the PATTERN rather than by reading the note's own list, which
                        is the only way a list-of-eight could ever have been checked. */}
                    <IconPlate
                      size={26}
                      className="text-gold-300"
                      bg="color-mix(in oklab, var(--gold-500) 16%, transparent)"
                    >
                      <PIcon s={14} />
                    </IconPlate>
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

      {/* Paused banner. ⛔ PAID PROGRAMME ONLY — it says "rewards resume when it's back on", which
          is a promise, and there is nothing to resume while `inviteRewards` is WITHDRAWN. */}
      {paid && !s.programEnabled && (
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
          CODE in a frame, QR bottom-right. Shows the code, never a balance.
          ⭐ THE FRAME FOLLOWS THE MONEY. Gold was principled here on one premise, stated in this
          comment and now conditional: *the invite pays the referrer*. It does not any more, so on
          the unpaid card the gilt corners come off and the frame is royal. ⛔ This is the §M3 rule
          applied to the one surface on the page that is designed to be SCREENSHOTTED and sent —
          a gilt card is the strongest "there is money in this" the product can say, and it would
          be saying it to someone who is not being offered any. */}
      <section
        className="relative overflow-hidden rounded-xl border p-5"
        style={{ background: "var(--royal-950)", borderColor: paid ? "var(--gold-700)" : "var(--royal-700)" }}
      >
        {paid && <GiltCorner size={38} rotate={0} style={{ position: "absolute", top: 6, left: 6 }} />}
        {paid && <GiltCorner size={38} rotate={180} style={{ position: "absolute", bottom: 6, right: 6 }} />}
        <div className="relative flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <FiftyMark size={38} />
            <p className="mt-3 font-display text-[20px] font-bold leading-tight text-text">{t.common.youveBeenInvited}</p>
            <p className={`mt-3 font-mono text-micro uppercase eyebrow font-bold ${paid ? "text-gold-300/70" : "text-royal-300/80"}`}>{t.common.invite}</p>
            <div
              className={`mt-1 inline-block rounded-md border px-3 py-1.5 ${paid ? "border-gold-700" : "border-royal-700"}`}
              style={{ background: `color-mix(in oklab, var(--${paid ? "gold" : "royal"}-500) 10%, transparent)` }}
            >
              <span className={`font-mono text-[22px] font-bold tracking-[0.1em] ${paid ? "text-gold-300" : "text-royal-200"}`}>{s.code || "—"}</span>
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
        <ReferralShare link={shareLink} shareText={shareText} paid={paid} />
      </div>

      {/* Stat tiles.
          🔴 THE WHOLE ROW IS GONE WHEN THE PROGRAMME PAYS NOTHING, AND A SCREENSHOT IS WHAT SAID SO.
          Unpaid, the two tiles collapse to one — and that one printed `recruitCount` under the label
          "Friends joined", which is exactly what the hero dial four inches above it already shows,
          with the same label. The same number, twice, in the same words, on a phone screen: a reader
          asks what the difference is, and there is none. The dial keeps it (it is the page's anchor)
          and the duplicate goes. */}
      {paid && (
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
      )}

      {/* How it works. ⭐ THE THIRD STEP IS THE WHOLE DIFFERENCE between the two products, so the
          two ladders are written out rather than patched: paid ends at "Earned", in gold, because
          money is the outcome; unpaid ends at "They appear in your list", in royal, because being
          counted is the outcome. ⛔ Reusing the paid ladder with the last word swapped is how a
          gold numeral 3 survives on a page that pays nothing. */}
      <section className="rounded-xl glass-panel p-4">
        <p className="font-display text-[15px] font-bold leading-tight">
          {t.profile.howItWorks}
        </p>
        <div className="mt-3 space-y-3">
          {(paid
            ? [
                t.common.share + " " + t.profile.yourReferralLink.toLowerCase(),
                t.common.signUp + " & " + t.common.placeBet.toLowerCase(),
                t.proposals.earned,
              ]
            : [
                t.profile.inviteStepShare,
                t.profile.inviteStepJoin,
                t.profile.inviteStepCounted,
              ]
          ).map((label, i) => (
            <div key={i} className="flex items-center gap-3">
              <span
                className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full font-mono text-[14px] font-bold"
                style={
                  i === 2 && paid
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

      {/* Requirements banner — Management Bonus Rules §4 + §5.
          ⛔ THE ENTIRE BANNER IS THE PAID PROGRAMME'S. Every line in it is a condition attached to
          a reward ("must deposit", "at least one position worth TZS 20,000", where the money
          lands). On the unpaid invite there is no reward, so there are no conditions — and a list
          of hurdles under a thing that pays nothing is worse than a false promise: it invents an
          obligation to bet in order to collect something that does not exist. */}
      {paid && (
      <section className="rounded-xl border border-border bg-bg-elevated/60 p-4 space-y-2">
        <p className="font-mono text-micro uppercase eyebrow font-bold text-text-subtle flex items-center gap-1.5">
          <I.shieldcheck s={11} />
          {t.profile.bonusRequirements}
        </p>
        <ul className="space-y-1.5 text-body-sm text-text-muted leading-snug list-disc pl-4">
          <li>{t.profile.inviteReqRegister}</li>
          <li>{t.profile.inviteReqDeposit}</li>
          <li>{t.profile.inviteReqBet}</li>
          {/*
            🔴 THESE THREE LINES ARE A PROMISE ABOUT MONEY, AND THEY WERE FALSE.
            They stated the reward lands in the Bonus Wallet under a wagering requirement, with an
            expiry and a one-at-a-time queue. Once the bonus wallet left the product the reward
            began landing as real, withdrawable cash — and every one of those sentences became
            wrong, in all three locales, on the only page an approved AGENT reads to learn how they
            are paid.
            ⛔ The condition is NOT re-derived here. `referralRewardDestination()` is the same
            predicate `creditWallet` routes on, so the promise and the payment cannot drift apart
            again — which is exactly how they drifted apart the first time.
            F5 · the multiple is still READ from bonus-config, never written into the copy.
          */}
          {rewardDestination === "BONUS" ? (
            <>
              <li>{fill(t.profile.inviteReqWager, { wager: bonusCfg.defaultWagerMultiplier })}</li>
              <li>{t.profile.inviteReqExpiry}</li>
              <li>{t.profile.inviteReqSequential}</li>
            </>
          ) : (
            <li>{t.profile.inviteReqCash}</li>
          )}
        </ul>
      </section>
      )}

      {/* Recruits */}
      <Cap className="!mt-1">{paid ? t.profile.yourReferrals : t.profile.yourFriends}</Cap>
      {/* ⛔ A PAGE OF A LIST SAYS SO. `recruitCount` is the true total and the dial prints it; this
          array is capped by the read model. Without this line a reader counting rows would reach a
          different number than the dial and have no way to know which was wrong — the silent
          truncation `getAdminAffiliateStats` already records refusing. Rendered only when the two
          genuinely differ, so nobody reads a caveat about a limit they have not reached. */}
      {s.recruitCount > s.recruits.length && (
        <p className="-mt-1 text-body-sm text-text-subtle">
          {fill(t.profile.inviteListCapped, { shown: s.recruits.length, total: s.recruitCount })}
        </p>
      )}
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
              {/* ⛔ THE STATUS CHIP AND THE MONEY COLUMN ARE ONE DECISION AND THEY GO TOGETHER.
                  `status` is "Signed up" / "First bet" / "Earning" — a ladder whose rungs are
                  defined by reward rows, so with nothing accruing EVERY friend is permanently
                  "Signed up" and the chip becomes a column of identical words that looks like a
                  stalled process. The amount column is "—" for the same reason. A row that says
                  who joined and when is the whole truth the unpaid programme has. */}
              {paid && <Chip variant={r.earnedTzs > 0 ? "resolved" : "pending"}>{r.status}</Chip>}
              {paid && (
                <div className={`w-[64px] text-right font-mono text-[12.5px] font-semibold ${r.earnedTzs > 0 ? "text-gold-300" : "text-text-subtle"}`}>
                  {r.earnedTzs > 0 ? "+" + formatNumber(r.earnedTzs) : "—"}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          kind="leaderboard"
          title={paid ? t.profile.noReferralsYet : t.profile.noFriendsYet}
          body={paid ? t.profile.noReferralsBody : t.profile.noFriendsBody}
          action={
            <a href="#referral-share">
              {/* ⛔ `variant="gold"` IS A MONEY TOKEN (§M3) — the primary royal button is the kit's
                  ordinary call to action, and sharing a link is an ordinary action. */}
              <Button variant={paid ? "gold" : "primary"} size="md" leading={<I.share s={14} />}>
                {t.profile.shareWithFriends}
              </Button>
            </a>
          }
        />
      )}

      {/* ⭐ THE PAGE SAYS OUT LOUD THAT IT PAYS NOTHING. The paid disclaimer explains WHEN a reward
          clears; its unpaid counterpart is not a softer version of that sentence but its opposite,
          and it is the one line that stops a player inferring a reward from a referral link they
          have seen pay on every other platform. ⛔ It carries the 18+ mark either way. */}
      <p className="pt-1 text-center text-body-sm leading-relaxed text-text-subtle">
        {paid ? t.profile.rewardsDisclaimer : t.profile.inviteNoRewardNote}
      </p>
    </PageContainer>
  );
}
