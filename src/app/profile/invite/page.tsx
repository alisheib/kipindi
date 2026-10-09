import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { I } from "@/components/ui/glyphs";
import { IconPlate } from "@/components/ui/icon-plate";
import { BackLink } from "@/components/ui/back-link";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { getPlayerReferralSummary, inviteViewerFor, getAgentDashboard, isApprovedAgent, referralRewardDestination } from "@/lib/server/affiliate-service";
import { AgentDashboard } from "./agent-dashboard";
import QRCode from "qrcode";
import { FiftyMark } from "@/components/brand";
import { Chip } from "@/components/ui/chip";
import { DotSeq } from "@/components/ui/dot-seq";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Stat } from "@/components/ui/stat";
import { ReferralShare } from "./invite-client";
import { fill, formatCompactNumber, formatTzs } from "@/lib/utils";
import { Ring } from "@/components/charts/ring";
import { getBonusConfig } from "@/lib/server/bonus-config";
import { formatDateShort as fmtDate, formatNumber } from "@/lib/utils";
import { getServerT } from "@/lib/i18n-server";
import { PageContainer } from "@/components/layout/page-container";
import { inviteIsLiveFor } from "@/lib/feature-state";
import { invitePaysPlayersNow } from "@/lib/server/invite-rewards-switch";
import { inviteLine, inviteName } from "@/lib/journey/invite-name";
import { resolveSimpleJourney } from "@/lib/server/journey-preview";

// Localised tab title (POLISH-BACKLOG §1.7) — was the hard-coded English
// "Invite & Earn", which a Swahili player saw in their browser tab and history.
export async function generateMetadata() {
  const { t } = await getServerT();
  // ⭐ The TAB TITLE obeys the same switch the body does. A browser tab and a history entry
  // reading "Invite & Earn" is a promise of money made outside the page, where no conditional in
  // the body can reach it — and it is the surface a player sees when the page is not even open.
  //
  // 🔴 AND IT IS VIEWER-AWARE, BECAUSE THIS ROUTE SERVES TWO PROGRAMMES. The player switch alone
  // titled an APPROVED AGENT's commission dashboard "Invite friends" — the body renders
  // `<AgentDashboard>` with their recruits and their earnings, so the tab was describing the wrong
  // product to the one viewer who IS paid. ⚠️ The session read costs one extra round trip on one
  // low-traffic route, and a title that contradicts its own page is the thing it buys off.
  // ⭐ The player half is the one player-facing "paid" (`invitePaysPlayersNow`: the Owner's switch through
  // the screens' ≤ 10 s read, the service-level pause off and a reward armed), fetched alongside the viewer
  // rather than after it. "Make payable → Nothing yet" titles the tab "Invite friends" (review P8).
  // ⛔ It fails CLOSED: no session, a failed read, or anyone not in agent standing gets the
  // unpaid words, never the promise — and so does a switch that is Not payable or unreadable.
  // ⭐ …AND AN AGENT'S TAB IS THE DASHBOARD'S OWN NAME (R5-G, 2026-10-09, G-1's sweep: one page, one name). The agent's
  // tab said "Alika na upate zawadi / Invite & Earn" over a body whose h1 is "Dashibodi ya wakala / Agent dashboard"
  // (`agent-dashboard.tsx`) — the words the hub's and /profile's rows say for an agent in standing. It now asks the body's
  // own question, `isApprovedAgent` on the affiliate row (what `getAgentDashboard` asks before it draws the dashboard), so
  // a deactivated agent's read-only dashboard is titled as itself too. Not a promise either way; a failed read answers
  // "not an agent", and the player half below is unchanged.
  // ⭐ ONE RULE FOR THE NAME, ROUND 6 (2026-10-09, review C1): `invite-name.ts` names the page for its reader, and every door
  // to it (the hub, the journey's avatar menu and footer, /profile's row) asks the same function — so the tab, the h1 and
  // the doors cannot say three things again.
  const session = await currentSession();
  const [payable, dashboard] = await Promise.all([
    invitePaysPlayersNow(),
    session ? db.affiliate.findByUserId(session.userId).then(isApprovedAgent, () => false) : Promise.resolve(false),
  ]);
  return { title: inviteName(t, { agent: dashboard, paid: payable }) };
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
   * about (measured while `invite` was WITHDRAWN, on a role-PLAYER account; since 2026-09-25 the same
   * path is a CLOSED / SUSPENDED / SELF_EXCLUDED account): gate false → `notFound()` called → body is
   * the not-found UI, and **no code, link or QR is rendered** — the referral read below never runs.
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
  // ⭐ BACK, IN THE JOURNEY, TO THE SECTION THAT HOLDS THE DOOR (round 6, 2026-10-09, the review's back-link finding): the
  // Akaunti hub opens this page (both bodies) and lights its tab here, while the back link said "‹ WASIFU" and, with no
  // history, went to /profile. A journey reader's link names the hub ("‹ AKAUNTI") and falls back to it; everybody else's
  // is today's. The shell's own cached answer (`resolveSimpleJourney`), asked once for both bodies.
  const { journey } = await resolveSimpleJourney();
  if (agentDash) return <AgentDashboard dash={agentDash} sp={sp} journey={journey} />;
  if (!inviteIsLiveFor(inviteViewer)) notFound();
  // B-1 — no swallow: the fallback fabricated "0 recruits · TZS 0 earned ·
  // program off" to a player with real referral earnings. Throw to
  // profile/error.tsx instead.
  const s = await getPlayerReferralSummary(session.userId);
  /**
   * ⭐ THE ONE DISCRIMINATOR FOR EVERY MONEY WORD ON THIS PAGE, and it is READ FROM THE SUMMARY
   * rather than asked again here. The server already resolved it (the Owner's Payable switch) to
   * decide whether `promises` may contain a sentence; a second read of the switch in the render is
   * how a page and its read model start disagreeing — which is exactly how the requirements list
   * below came to describe a bonus wallet the payer had stopped using.
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
  /** ⭐ Gold only once money WAS earned (R5-C, the second gold audit, 2026-10-09): the paid dial read a gold "0" over a
   *  gold wash before the first shilling — nothing earned, in the ink of money earned (§M3). Until then it is the royal
   *  dial the unpaid invite wears; the Earned tile below follows the same predicate. */
  const earnedGold = paid && s.earnedTzs > 0;
  const shareText = t.profile.shareText;

  // Build the referral link from the ACTUAL request host so it always matches
  // the URL the player is on (the live deploy) rather than a possibly-stale
  // NEXT_PUBLIC_APP_URL. On production that is whichever 50pick.tz host the player is on (apex or
  // www); on any other deploy (the railway.app URL, localhost) it follows that host. Falls back to the
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

  // The page's one name for this reader, its tab's too (`invite-name.ts`; round 6, review C1).
  const name = inviteName(t, { agent: false, paid });
  return (
    <PageContainer tier="form" className="space-y-5">
      <BackLink fallbackHref={journey ? "/account" : "/profile"} label={journey ? t.journey.tabAccount : t.common.profile} />
      <h1 className="sr-only">{name}</h1>

      {/* Title row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-[19px] font-bold leading-none">
            {name}
          </p>
        </div>
        {/* ⛔ THE CHIP IS THE PAID PROGRAMME'S STATUS AND IT IS HIDDEN WHEN THERE IS NO PROGRAMME.
            "Active" beside a share link reads as "you are earning", so under the unpaid invite it does
            not render at all. ⭐ Since 2026-09-26 (review P8) `paid` already means the service-level
            pause is OFF — a paused programme is not paid to a player — so the chip has one state, and
            its old Paused arm (with the "rewards resume" banner that sat below) is gone. */}
        {paid && (
          <Chip variant="active">{t.common.active}</Chip>
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
          style={{ background: `radial-gradient(120% 90% at 100% 0%, color-mix(in oklab, var(--${earnedGold ? "gold" : "royal"}-500) 12%, transparent), transparent 60%)` }}
        />
        {/* ⭐ THE CALL HAS THE CARD'S WIDTH ON A PHONE (round 3, 2026-10-09, tile 181). Beside the 96px dial the 19px call
            had 191px at 390 (121 at 320), so "Shiriki kiungo chako · uone wanaojiunga" broke as "Shiriki kiungo" / "chako ·
            uone" / "wanaojiunga" — its two phrases mixed on one line and its last word alone — and at 320 its longest word
            was wider than the column. Below `sm` the dial keeps its caption beside it (the caption names what the dial
            counts) and the call takes the row under both, at the card's full width (308px at 390, 238 at 320), drawn as
            its two phrases (`DotSeq`): "Shiriki kiungo chako" over "uone wanaojiunga" at every phone width, and on one
            line, as before, wherever both fit. From `sm` the row is the one it was: dial, then caption over call. */}
        <div className="relative grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3 sm:flex">
          <EarningsRing value={ringValue} label={ringLabel} tone={earnedGold ? "gold" : "royal"} />
          <div className="contents sm:block sm:min-w-0 sm:flex-1">
            {/* The caption NAMES the dial; the money is on the dial (R5-C, the second gold audit, 2026-10-09: a label is
                never money, Q5 — one royal caption for both product states). */}
            <Cap className="sm:mb-1.5 !text-royal-300">
              {paid ? t.profile.inviteEarn : t.profile.friendsJoined}
            </Cap>
            <p className="col-span-2 font-display text-[19px] font-bold leading-tight text-balance">
              <DotSeq text={inviteLine(t, { agent: false, paid })} />
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
                    {/* A promise's glyph is an accent, never money (R5-C, 2026-10-09; Q5): the brand plate every door row and
                        the propose promo carry. */}
                    <IconPlate
                      size={26}
                      className="bg-brand-500/10 text-brand-300"
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


      {/* A9 share-card — the visual a referrer sends: FiftyMark, headline, the
          CODE in a frame, QR bottom-right. Shows the code, never a balance.
          ⭐ THE FRAME IS ROYAL IN EVERY STATE (R5-C, the second gold audit, 2026-10-09). It followed the money — gilt
          corners and frame while the invite pays the referrer — but the card goes to the person INVITED, who is offered
          an invitation, not a payout: on an inducement "a house colour becomes a marketing claim" (§M3a D5), and gold is
          money earned and nothing else (Q5). The referrer's earnings are gold where they are earned — the dial above. The
          agent's share card is the same royal card. ⛔ This is the one surface on the page designed to be SCREENSHOTTED
          and sent, which is why it must not say "there is money in this". */}
      <section
        className="relative overflow-hidden rounded-xl border p-5"
        style={{ background: "var(--royal-950)", borderColor: "var(--royal-700)" }}
      >
        <div className="relative flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <FiftyMark size={38} />
            <p className="mt-3 font-display text-[20px] font-bold leading-tight text-text">{t.common.youveBeenInvited}</p>
            <p className="mt-3 font-mono text-micro uppercase eyebrow font-bold text-royal-300/80">{t.common.invite}</p>
            <div
              className="mt-1 inline-block rounded-md border border-royal-700 px-3 py-1.5"
              style={{ background: "color-mix(in oklab, var(--royal-500) 10%, transparent)" }}
            >
              <span className="font-mono text-[22px] font-bold tracking-[0.1em] text-royal-200">{s.code || "—"}</span>
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
            separate, visible decision and is not smuggled in by a consolidation.
            ⭐ GOLD ONLY WHEN SOMETHING WAS EARNED (R5-C, the second gold audit, 2026-10-09): a "0" was gold too — nothing
            earned, in the ink of money earned (§M3). The rows below already said it per friend (`earnedTzs > 0`); the
            headline figure says it the same way, as the net P&L and the settled strip do. */}
        <Stat
          size="3xl"
          labelStyle="strong"
          boxed="glass"
          tone={s.earnedTzs > 0 ? "gold" : "default"}
          money
          label={t.proposals.earned}
          value={formatNumber(s.earnedTzs)}
          hint="TZS"
          icon={<I.coins s={14} />}
          iconAlign="end"
        />
      </div>
      )}

      {/* How it works — PAID ONLY.
          🔴 THE UNPAID LADDER WAS FILLER AND IT READ AS FILLER. "Share your link · They sign up ·
          They appear in your list" explains nothing a player cannot see: the link is on the screen
          above it, and the list is on the screen below it. Its third step existed only to give the
          ladder a third step. A panel that restates the page around it makes a simple feature look
          padded, and pads the scroll on a phone for nothing.
          ⭐ The PAID ladder stays, because there it teaches something the screen does NOT show —
          that money arrives only after a friend signs up AND bets — and it is the page's one place
          to say so before a player forms the wrong expectation. */}
      {paid && (
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
              {/* One numeral for every step (R5-C, 2026-10-09): the third ("Earned") was a gold disc — a step of a promise,
                  not money earned (§M3, Q5). The same royal disc as /agent's and the agent dashboard's steps. */}
              <span
                className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full font-mono text-[14px] font-bold"
                style={{ background: "color-mix(in oklab, var(--royal-500) 18%, transparent)", color: "var(--royal-200)", border: "1px solid color-mix(in oklab, var(--royal-500) 36%, transparent)" }}
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
      )}

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
          {/* ⛔ THE PRIZE'S CONDITIONS COME FROM THE PRIZE'S CONFIG (review P8, 2026-09-26) — `s.prizeTerms`, the
              same settings the promise above was priced from. These lines were fixed sentences: a deposit
              asked for whether or not the prize required one, and "TZS 20,000" whatever the minimum bet was.
              No promised prize, no prize conditions. */}
          {s.prizeTerms?.requireDeposit && <li>{t.profile.inviteReqDeposit}</li>}
          {s.prizeTerms && (
            <li>
              {s.prizeTerms.minBetTzs > 0
                ? fill(t.profile.inviteReqBet, { amount: formatTzs(s.prizeTerms.minBetTzs) })
                : t.profile.inviteReqBetAny}
            </li>
          )}
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

      {/* Recruits — the label, the capped note and the list are ONE block of the page's stack (2026-10-08,
          WP12's tile 182). The label wore `!mt-1` as a sibling of the share block: 4px under the buttons above it
          and 24px over the list it names — a label for the wrong thing. Now the block takes the stack's own 24px,
          and inside it the label sits 12px over what it names, as "Kiungo chako cha rufaa" does over its field. */}
      <div>
        <Cap className="mb-2">{paid ? t.profile.yourReferrals : t.profile.yourFriends}</Cap>
        {/* ⛔ A PAGE OF A LIST SAYS SO. `recruitCount` is the true total and the dial prints it; this
            array is capped by the read model. Without this line a reader counting rows would reach a
            different number than the dial and have no way to know which was wrong — the silent
            truncation `getAdminAffiliateStats` already records refusing. Rendered only when the two
            genuinely differ, so nobody reads a caveat about a limit they have not reached. */}
        {s.recruitCount > s.recruits.length && (
          <p className="mb-2 text-body-sm text-text-subtle">
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
                {/* The chip NAMES the friend's rung; the money is the figure beside it (R5-C, the second gold audit,
                    2026-10-09). "Earning" wore the RESOLVED seal — struck gilt, a market's settled outcome (§B11) — on a
                    label, doubling the gold the "+X" already carries (a label is never money, Q5). A rung that pays is
                    success; one that waits is royal. The agent dashboard's rows carry the figure alone. */}
                {paid && <Chip variant={r.earnedTzs > 0 ? "success" : "pending"}>{r.status}</Chip>}
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
                    ordinary call to action, and sharing a link is an ordinary action — in BOTH product states (R5-C,
                    the second gold audit, 2026-10-09: the paid invite kept a gold button here; ReferralShare's twin). */}
                <Button variant="primary" size="md" leading={<I.share s={14} />}>
                  {t.profile.shareWithFriends}
                </Button>
              </a>
            }
          />
        )}
      </div>

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
