/**
 * /updown/[roundId] — one round (D3).
 *
 * Two jobs: commit a stake against a locked pick, and afterwards PROVE the result was
 * honest. Layout (D3 spec): a price hero (the open line the bet is measured against,
 * with the real price path tinted emerald above / rose below), a pool panel, exactly one
 * of {stake panel, result panel}, and — once decided — a full-width settlement proof.
 *
 * The SETTLEMENT PROOF is the trust artefact and the reason this page matters. It shows
 * both prices, both source links and the timestamp THE SOURCE ITSELF published for each
 * (not our grid boundary) plus our observed time — and states the rule, so a player can
 * check the outcome rather than take it on faith. It renders only once the round is
 * decided; a half-filled receipt mid-round would imply a result that does not exist yet.
 *
 * Gold appears at most twice and both are earned/committed money: the Confirm button and
 * a winning payout. Everything else is neutral or YES/NO — never gold for decoration.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/ui/back-link";
import { Chip } from "@/components/ui/chip";
import { STATUS_TONE, TONE_CHIP } from "@/lib/status-tone";
// E-101b · a fragment names a row; this is what actually scrolls to it.
import { HashFocus } from "@/components/ui/hash-focus";
import { getRoundDetail } from "@/lib/server/updown-board";
import { currentSession } from "@/lib/server/auth-service";
import { isStaffRole } from "@/lib/server/roles";
import { getServerT } from "@/lib/i18n-server";
// ⛔ ONE RULE FOR "why did this stake come back", shared with the card — five copies would be
// five chances to disagree about someone money.
import { refundReasonFor, REFUND_REASON_KEY } from "@/lib/updown-refund-reason";
import { pickLocalized } from "@/lib/localized";
// ⛔ ONE lexicon for side words across both products — never a local ternary (test:labels §4).
import { outcomeWord } from "@/lib/side-label";
import { formatTzs } from "@/lib/utils";
// ⭐ The kit's ONE pool-split bar, and the home of the cold-start rail (§B9) — PV-06.
import { TippingBar } from "@/components/brand";
import { RoundCountdownPod } from "@/components/updown/round-countdown";
import { PriceHero } from "@/components/updown/price-hero";
import { RoundActionPanel } from "@/components/updown/round-action-panel";
import { AssetMark } from "@/components/updown/updown-card";
import { SOURCE_CLASS_KEY, fmtEAT } from "@/lib/updown-source-label";
// E-101 · one rule for "where does this ticket live", shared with the wallet and the emails.
import { positionListHref } from "@/lib/position-permalink";
// E-102 · how often this page re-asks the server, and when it stops.
import { RefreshPoller } from "@/components/ui/refresh-poller";
import { UpDownResultAnnouncer } from "@/components/updown/updown-result-announcer";
import { refreshCadence, handoverPollUntil } from "@/lib/refresh-cadence";
// E-166 · the auto-advance. Client-side because it is a navigation on an observed transition.
import { UpDownHandover } from "@/components/updown/updown-handover";
import { usd } from "@/lib/usd-price";

export const dynamic = "force-dynamic";

/**
 * One position's OWN outcome, in the player's language.
 *
 * ⛔ It maps the STORED status and nothing else — it never re-derives a result from prices
 * or payouts. The itemised list this feeds is a reading of what settlement wrote, and the
 * moment it starts inferring, it becomes a second money authority next to the aggregate.
 */
function POSITION_STATUS_LABEL(
  t: Awaited<ReturnType<typeof getServerT>>["t"],
  status: "OPEN" | "WIN" | "LOSS" | "VOID" | "CASHED_OUT",
): string {
  return status === "WIN" ? t.market.udPosWon
    : status === "LOSS" ? t.market.udPosLost
    : status === "VOID" ? t.market.udPosRefunded
    : status === "CASHED_OUT" ? t.market.udPosCashedOut
    : t.market.udPosOpen;
}

const card = { background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", boxShadow: "var(--shadow-card)" } as const;
const inset = { background: "var(--bg-inset)", border: "1px solid color-mix(in oklab, var(--border) 70%, transparent)", borderRadius: "var(--r-md)" } as const;
const eyebrow = "m-0 font-mono text-micro font-semibold uppercase eyebrow text-text-faint";

// usd() → the ONE spelling in @/lib/usd-price (session 80 — six private copies unified).

// fmtEAT moved to updown-source-label.ts (E-262) — the board chart panel now renders the
// same receipt line, and two private copies of one formatter is the drift that file stops.

export async function generateMetadata({ params }: { params: Promise<{ roundId: string }> }) {
  const { roundId } = await params;
  const d = await getRoundDetail(roundId).catch(() => null);
  return { title: d?.titleEn ?? "Up & Down" };
}

export default async function UpDownRoundPage({
  params,
  searchParams,
}: {
  params: Promise<{ roundId: string }>;
  searchParams: Promise<{ side?: string; from?: string }>;
}) {
  const { roundId } = await params;
  const sp = await searchParams;
  const lockedSide: "UP" | "DOWN" | null = sp?.side === "UP" || sp?.side === "DOWN" ? sp.side : null;
  const { t, locale } = await getServerT();
  const session = await currentSession();
  // Who is looking? The raw provider blob below is an officer tool, not player copy.
  const viewerIsStaff = isStaffRole(session?.role ?? "");
  // ⛔ UD-15 · the `.catch(() => null)` is GONE: it turned a transient failure into a
  // 404 — telling a player their round DOES NOT EXIST while their money is in it.
  // `notFound()` is now strictly "the query succeeded and no such round exists";
  // every real throw reaches this route's error.tsx with a retry.
  const detail = await getRoundDetail(roundId, session?.userId);
  if (!detail) notFound();

  /**
   * ⭐ E-166 · THE ROUND THE PLAYER WAS HANDED OVER FROM, for the compact result strip.
   *
   * ⛔ READ FROM THE DATABASE, NEVER FROM THE QUERY STRING. `?from=` supplies only an ID; the
   * outcome printed beside it comes from the round row, so a hand-edited URL cannot make this
   * page state a result that did not happen. Fabricating an outcome on a money surface is A-5,
   * and a URL parameter is the least trustworthy input there is.
   * ⛔ AND ONLY IF IT IS GENUINELY THE PREDECESSOR — same chain, and it closed exactly where
   * this round opened. Otherwise any settled round could be pinned above any other.
   * ⚠️ Never fatal: a failed read drops the strip, it does not break the page.
   */
  const fromId = typeof sp?.from === "string" && sp.from.length > 0 && sp.from !== roundId ? sp.from : null;
  const fromDetail = fromId ? await getRoundDetail(fromId).catch(() => null) : null;
  const fromRound =
    fromDetail
    && fromDetail.round.assetId === detail.round.assetId
    && fromDetail.round.durationMinutes === detail.round.durationMinutes
    && fromDetail.round.closesAt === detail.round.opensAt
    && (fromDetail.round.state === "resolved" || fromDetail.round.state === "void")
      ? { roundId: fromDetail.round.roundId, outcome: fromDetail.round.outcome }
      : null;

  const { round, asset, proof, priceSeries, myPosition, minStake, maxStake } = detail;
  const name = pickLocalized(locale, asset.nameEn, asset.nameSw, asset.nameZh);
  const dec = asset.decimals;
  const ticker = asset.key.toUpperCase();
  const isOpen = round.state === "open";
  // E-72 · LOCKED — the round is still running, the pool is frozen, the player watches.
  // ⛔ The detail page must lock at the SAME instant the card does, or a player who taps
  // through from a locked card lands on a page still offering the buttons — and the server
  // then refuses the bet. That gap is worse than no lock at all.
  const locked = round.state === "locked";
  const decided = round.state === "resolved" || round.state === "void";

  // Hero price: the current live read while open, the round's own close once decided.
  const heroLive = decided ? round.closePrice : asset.livePrice;
  const move = heroLive != null && round.openPrice != null ? heroLive - round.openPrice : null;
  // E-53 · the KIND of market, never the vendor. The class arrives already resolved from
  // the server (`publicSourceClassFor`), so the domain is not in this payload to leak.
  const source =
    `${t.market[SOURCE_CLASS_KEY[asset.sourceClass]]}${asset.sourceQuotedAt ? ` · ${t.market.udQuoted} ${fmtEAT(asset.sourceQuotedAt)}` : ""}`;

  // The BAR is a percentage and rounds; the MONEY beside it is not.
  //
  // 🔴 These two figures were `volumeTzs × upPct / 100` — reconstructed from a percentage that
  // had already been rounded to a whole number. On a 100,000 pool that cannot tell TZS 0 from
  // TZS 400, so a round with one real bet on the thin side printed the thin side as empty, and
  // an empty side printed as 500. D2 makes "is this side empty" the load-bearing question on
  // this page, so the page now reads the raw shillings the server already sends.
  // ⛔ NULL WHEN THE POOL IS EMPTY, and it must stay null all the way to the paint — PV-06.
  // `round.upPct` used to arrive as a hardcoded 50 from `impliedYesPct`; it now arrives as
  // `pricedYesPct`'s honest null, and this page renders the kit's cold-start rail instead of
  // a fabricated half-and-half. ⛔ Never `?? 50` on the way past.
  const upPct = round.upPct === null ? null : Math.round(round.upPct);
  const downPct = upPct === null ? null : Math.max(0, 100 - upPct);
  const upTzs = round.pricing.upPool;
  const downTzs = round.pricing.downPool;

  const statusWord =
    round.state === "open" ? t.market.statusLive
      : round.state === "locked" ? t.market.udLockedTitle
      : round.state === "confirming" ? t.market.udSettlingTitle
        : round.state === "void" ? t.market.statusVoid
          : t.market.statusResolved;
  // ⛔ RE-LABELLED AT THE LOCK. A reading of 0:36 means "36s left to bet" before it and
  // "36s until you find out" after — one set of digits, two deadlines, and the caption is
  // the only thing that distinguishes them.
  // ⭐ E-99 · AND A THIRD DEADLINE AFTER THE CLOSE. `confirming` used to be a caption with no
  // clock, so the round page sat on "Awaiting result" for a measured median 95s (p90 116s) with
  // nothing counting. The card and this page must not disagree about that wait, so both read
  // the SAME server-computed instant — the boundary plus this asset's own median lag.
  // ⛔ Null when the asset is under the sample floor → no clock, and the caption stays honest.
  const awaitingResult = round.state === "confirming";
  const resultTarget = awaitingResult ? round.expectedResultAtMs ?? null : null;
  const countLabel = isOpen ? t.market.udBetsCloseIn
    : locked ? t.market.udResultIn
    : awaitingResult ? (resultTarget != null ? t.market.udResultIn : t.market.udAwaitingResult)
    : t.market.udRoundSettled;

  // Result panel data (resolved rounds the viewer actually played).
  // ⭐ E-65 · WHY THIS VIEWER GOT THEIR STAKE BACK, from the rule the card shares. Fires on a
  // VOIDED round AND on a DECIDED one that refunded this player for want of a counterparty —
  // two opposite events that used to print the same sentence.
  const refundReason = refundReasonFor({
    outcome: round.state === "void" ? "VOID" : (round.outcome ?? null),
    voidReason: round.voidReason,
    refundedStake: myPosition && myPosition.payout != null && myPosition.payout === myPosition.stake ? myPosition.stake : 0,
  });
  const result = myPosition?.result ?? null;
  /**
   * ⭐ E-87 · THE CHIP HAD THREE STATES AND THE WORLD HAS FOUR — and this is E-65's own defect,
   * one line further on.
   *
   * 🔴 Driven on production 2026-08-05, round `udr_eb0dc4fad03e9dd7e6a2`: the round RESOLVED
   * **UP**, the player had backed **UP**, and this chip read **"Void · refunded"** — directly
   * beside a settlement proof reading **"OUTCOME ▲ Up"**, one card away. The paragraph
   * underneath was already correct (*"Nobody backed the other side…"*), so the panel argued with
   * itself: the chip said the round was void, the proof said it decided, and the sentence
   * between them said neither.
   *
   * ⛔ THE ROOT CAUSE IS THE SAME ONE `refundReasonFor` EXISTS TO FIX. `WIN : LOSS : else-void`
   * is two branches for four situations, so *"refunded on a round that decided"* fell into the
   * bucket labelled *"the round voided"* — exactly how a one-sided refund used to inherit
   * *"the price did not move enough"*. The rule that already knows the difference is
   * `refundReason`, so the chip reads it rather than guessing from what is left over.
   *
   * ⛔ `udVoided` NOW MEANS WHAT IT SAYS: the ROUND voided. A stake that came back for any other
   * reason says so without claiming the round did not happen.
   */
  const resultLabel =
    result === "WIN" ? t.market.resolvedWin
    : result === "LOSS" ? t.market.resolvedLoss
    // The round DECIDED and this player was refunded anyway — never call that a void.
    : refundReason === "unmatched" ? t.market.udRefundTitle
    : t.market.udVoided;
  /**
   * ⭐ §B11 (D4) — THE TONE NOW BRANCHES WHERE THE WORD BRANCHES, WHICH IS THE WHOLE POINT.
   *
   * 🔴 IT DID NOT, AND ON THE VOID ARM THAT WAS A DIVERGENCE. The colour was
   * `WIN ? resolved : LOSS ? no : bare .chip` — THREE branches for the label's FOUR, exactly
   * the shape E-87 above records as the label's own defect, one line further up. So the two
   * words that share the leftover branch shared a tone as well, and `udVoided` — the same
   * string `updown/history` paints ROYAL one screen away — was drawn SLATE here.
   *
   * A refund that came back because the round DECIDED without a counterparty keeps slate:
   * "refunded" is not a dictionary word, a refund is neutral (§C4), and nothing else on the
   * platform paints it. `udVoided` is the dictionary's VOID and takes the player tone the
   * other five surfaces already give it. WIN keeps the struck seal (§M3/§M7 — this is money
   * the player earned) and LOSS keeps the betting rose; neither is a §B11 word and neither
   * may be repainted on taste.
   */
  const resultVariant =
    result === "WIN" ? "resolved" as const
    : result === "LOSS" ? "no" as const
    : refundReason === "unmatched" ? "neutral" as const
    : TONE_CHIP[STATUS_TONE.VOID.player];
  // DA-7 · the "Paid out" figure. A WIN is money the player EARNED, so M3 puts it in struck
  // type rather than gold colour; everything else keeps plain text ink. The class carries its
  // own gradient, mono family and tabular-nums, so no `color` may be set alongside it — a flat
  // colour under a transparent fill is two sources of truth for one figure.
  const payoutStruck = result === "WIN";

  // Proof geometry.
  const pMove = proof && proof.openPrice != null && proof.closePrice != null ? proof.closePrice - proof.openPrice : null;
  const pMovePct = pMove != null && proof?.openPrice ? (pMove / proof.openPrice) * 100 : null;
  const sgn = (v: number) => (v >= 0 ? "+" : "−");
  // ⛔ THE SHARED LEXICON, NOT A LOCAL TERNARY. `test:labels` §4's ratchet flagged this one and
  // the last-round strip's twin on the same run — and the reason it is a ratchet is that a
  // private side-word map is exactly how `/positions/performance` came to print "NO won" over an
  // UP bet. ⚠️ It also SHADOWED the imported `outcomeWord`, so the strip's call resolved to this
  // string and would not compile — the collision was the tell that there were two of one thing.
  const outcomeLabel = outcomeWord(t, round.outcome ?? "VOID", "UPDOWN");
  const outcomeInk = round.outcome === "UP" ? "var(--yes-300)" : round.outcome === "DOWN" ? "var(--no-300)" : "var(--text-muted)";
  const outcomeArrow = round.outcome === "UP" ? "M5 15l7-7 7 7" : round.outcome === "DOWN" ? "M5 9l7 7 7-7" : null;
  const evidence = proof?.closeEvidence ?? proof?.openEvidence ?? null;

  // B7 — was max-w-[1232px] with an inline padding, while this route's own
  // loading.tsx said 1080: a 152px layout jump on EVERY load, which no test
  // could see. Both are now the board tier.
  return (
    <div className="mx-auto w-full max-w-board px-3 lg:px-6 pt-[22px] pb-14">
      {/* ⭐ E-102 · THE RESULT HAS TO ARRIVE ON THE SCREEN. Ali, 2026-08-05: *"when a result
          from Up & Down or any poll comes, the page should refresh; a user cannot refresh to
          see a result if it came."*
          🔴 THIS PAGE HAD NO POLLER AT ALL — the board carries one and `/markets/[id]` carries
          one, but the ONE surface a player sits on watching E-99's `Result in 1:31` count down
          was `force-dynamic` with nothing to re-fetch it. So the clock counted honestly to zero
          and then the screen stayed exactly as it was until they reloaded by hand. A countdown
          that finishes and changes nothing is worse than no countdown: it promises an arrival
          and then denies it.
          ⛔ The cadence is a RULE, not a number — fast while the price is landing, the board's
          20s while the round is live, and OFF once it is decided. See `refreshCadence`. */}
      {/* ⭐ E-166 · AND THE ONE BOUNDED EXCEPTION TO "a settled round stops polling". A decided
          round has exactly one fact outstanding — has the round that follows it arrived? — and
          until it has, this page is the dead end Ali described: `settled ⇒ enabled:false` froze
          the screen with no statement about what comes next.
          ⛔ The exception is bounded TWICE: `active` is false the moment a successor is in hand,
          and `handoverPollUntil` stops it dead at the successor's own open plus a grace (or a
          hard five-minute ceiling when that instant is unknown). There is no input that makes
          it unbounded — `test:refresh-cadence` §5 proves it. */}
      <RefreshPoller {...refreshCadence({
        settled: decided,
        awaitingResult,
        handover: {
          // Nothing left to wait for once the successor row is open, or once the chain has
          // said there will not be one.
          active: decided && round.successor.chainRunning && round.successor.roundId == null,
          untilMs: handoverPollUntil({
            settledAtMs: round.resolvedAtMs,
            successorOpensAtMs: round.successor.opensAtMs,
            nowMs: round.serverNowMs,
          }),
          nowMs: round.serverNowMs,
        },
      })} />
      {/* ⭐ THE RESULT MOMENT — the same shared announcer the board mounts, so the two surfaces
          cannot drift. It fires on the OBSERVED transition the poller above delivers, and
          `sessionStorage` keeps it to once per round even if the player has both open.
          ⛔ In-app only; Ali's 2026-07-24 notification suppression is untouched. */}
      <UpDownResultAnnouncer rounds={[{
        roundId,
        settledAtMs: round.resolvedAtMs,
        myResult: myPosition && myPosition.result
          ? { status: myPosition.result, side: myPosition.side, stake: myPosition.stake, payout: myPosition.payout ?? 0 }
          : null,
      }]} />
      <HashFocus />
      <div className="flex flex-col gap-[18px]">
        <BackLink fallbackHref="/updown" label={t.market.udTitle} />

        {/* ── ⭐ E-166 · THE LAST-ROUND STRIP ──────────────────────────────────────────────
            🔴 THE RULE THIS EXISTS FOR: *the player who WON must not have their result yanked
            off screen.* The handover replaces the page under them, so the result they waited
            ~91 seconds for arrives here — compact, with a link to the full proof, on the round
            they have been moved to. ⛔ Rendered ONLY from `?from=`, which only the auto-advance
            writes, so a hand-typed or shared URL never shows a strip about a round the player
            did not watch. The old round's URL stays valid for ever; nothing is hidden. */}
        {fromRound && (
          <div className="m-in flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 px-3.5 py-2.5" style={inset}>
            <span className="inline-flex items-baseline gap-2">
              <span className={eyebrow}>{t.market.udLastRound}</span>
              <span className="font-mono text-[12.5px] font-bold tracking-[0.04em]"
                    style={{
                      // ⛔ NEUTRAL FOR A VOID. A refund is not a failure (rule 7), so it takes
                      // muted ink and never rose — the same treatment the card gives it.
                      color: fromRound.outcome === "UP" ? "var(--yes-300)"
                        : fromRound.outcome === "DOWN" ? "var(--no-300)" : "var(--text-muted)",
                    }}>
                {/* ⛔ THE SHARED LEXICON, NOT A THIRD SIDE-WORD MAP. This shipped as
                    `outcome === "UP" ? udUpWins : … : statusVoid` and `test:labels` §4's ratchet
                    caught it on the merge: a private word-map is how one product came to read
                    "NO won" over an UP bet. `outcomeWord` already knows that a VOID is never a
                    direction, which is the half a hand-rolled ternary gets wrong. */}
                {outcomeWord(t, fromRound.outcome ?? "VOID", "UPDOWN")}
              </span>
            </span>
            <Link href={`/updown/${fromRound.roundId}`}
                  className="inline-flex items-center gap-0.5 font-mono text-micro font-semibold uppercase tracking-[0.08em]"
                  style={{ color: "var(--brand-300)" }}>
              {t.market.udLastRoundView}
            </Link>
          </div>
        )}

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <AssetMark icon={asset.iconKey} ticker={ticker} size={44} />
            <div className="min-w-0">
              <h1 className="m-0 flex flex-wrap items-center gap-2">
                <span className="overflow-hidden text-ellipsis whitespace-nowrap font-display text-title-lg font-bold leading-tight text-text">
                  {name} {t.market.udTitle}
                </span>
                {/* PV-13c (2026-09-03) — was a raw `<span className="chip">`. */}
                <Chip>{round.durationMinutes} {t.market.udMin}</Chip>
              </h1>
              <p className="mt-1 flex items-center gap-1.5 font-mono text-micro font-semibold uppercase tracking-[0.10em] text-text-subtle">
                {isOpen && <span className="live-dot" />}
                {statusWord} · {ticker}
              </p>
            </div>
          </div>
          <RoundCountdownPod
            closesAtMs={
              // E-99 · three deadlines now, in the order the player meets them: the LOCK while
              // betting, the CLOSE during the result phase, and the measured RESULT instant
              // after it. `resultTarget` is null when unmeasured, which falls through to the
              // close and leaves the pod showing a spent clock — see `isOpen` below.
              resultTarget
              ?? (isOpen && round.selectionClosedAt
                ? Date.parse(round.selectionClosedAt)
                : Date.parse(round.closesAt))
            }
            isOpen={isOpen || locked || resultTarget != null}
            serverNowMs={round.serverNowMs}
            label={countLabel}
            resultMode={resultTarget != null}
            /* ⭐ E-104 · THE INSTANTS, so the pod enters the result phase BY ITSELF.
               🔴 Watched on production 2026-08-05 (`udr_8bd25a9f786ea498f132`): at the close
               the pod sat on a DEAD `00:00` under a live "Result in" caption for 14 seconds,
               then jumped to `01:18`. The countdown to the close ran out and the phase did not
               move, because `awaitingResult` is `round.state` — a value rendered ONCE on the
               server. E-102's poller shortened that wait from "forever" to "one interval"; only
               deriving the phase from the instants removes it.
               ⛔ This is E-82's defect at the next boundary, and `roundPhase`'s own header
               already carried the rule: the instants do not go stale, so derive from them. */
            roundClosesAtMs={Date.parse(round.closesAt)}
            resultTargetMs={round.expectedResultAtMs ?? null}
            settled={decided}
            resultLabels={{
              resultIn: t.market.udResultIn,
              awaiting: t.market.udAwaitingResult,
              settled: t.market.udRoundSettled,
            }}
            /* ⭐ E-166 · past the hold this pod stops reading `Round settled 00:00` — the dead
               clock measured on production 2026-08-19 — and becomes the handover ticker. Same
               box, same 28px digits; only the caption and the digits change. */
            handover={{
              roundId,
              settledAtMs: round.resolvedAtMs,
              successorExists: round.successor.roundId != null,
              successorOpensAtMs: round.successor.opensAtMs,
              chainRunning: round.successor.chainRunning,
            }}
            handoverLabels={{
              counting: t.market.udNextMatchIn,
              live: t.market.udNextMatchLive,
              waiting: t.market.udNextMatchSoon,
              unavailable: t.market.udNextMatchNone,
            }}
          />
        </header>

        {/* ⭐ E-166 · THE HANDOVER BAR. It renders nothing until the hold has passed, then states
            what comes next and — when auto-advance is deferred by an open overlay, an in-flight
            bet, or a player who deliberately opened an already-settled round — offers the way
            out. It also OWNS the auto-advance itself; the gates are in its own header. */}
        <UpDownHandover
          roundId={roundId}
          settled={decided}
          settledAtMs={round.resolvedAtMs}
          successorRoundId={round.successor.roundId}
          successorOpensAtMs={round.successor.opensAtMs}
          chainRunning={round.successor.chainRunning}
          serverNowMs={round.serverNowMs}
          labels={{
            live: t.market.udNextMatchLiveBody,
            counting: t.market.udNextMatchCountingBody,
            waiting: t.market.udNextMatchSoonBody,
            unavailable: t.market.udNextMatchNoneBody,
            go: t.market.udNextMatchGo,
          }}
        />

        {/* ── Grid: price hero (left) · pool + stake/result (right) ─────────
            ⭐ THE RAIL STARTS AT `lg` (1024), NOT `xl` (1280) — E-193, and it was measured on
            production before it was moved. At 1024×768 this page was still single-column, so
            the price hero — an SVG at `width: 100%` on a 640×220 viewBox, i.e. a card whose
            HEIGHT is a function of the page's WIDTH — rendered **425px tall** and consumed the
            entire viewport below the countdown. The frame shows a laptop-shaped screen holding
            one flat chart and nothing to do: the pool and both bet controls sat at y=1069,
            **301px below a 768px fold**, on the game whose rounds are reachable for 89 seconds.
            ⛔ The two-column layout already existed and already solved it — it was simply gated
            one breakpoint too high. At 1280 the same control sits at y=623. Same reasoning as
            E-190 one component up: 1024 is a desktop-shaped viewport being handed a
            phone-shaped layout. ⚠️ The right column keeps its `minmax(300px,1fr)` floor, so it
            can still refuse to squeeze: at 1024 the split is ~581/375 and the hero drops to
            ~200px, which is why the control comes back above the fold rather than merely
            moving. Below `lg` the page is single-column exactly as before. */}
        <div className="grid grid-cols-1 items-start gap-4 lg:[grid-template-columns:minmax(0,1.55fr)_minmax(300px,1fr)]">
          <PriceHero
            openPrice={round.openPrice}
            upTarget={round.upTarget}
            downTarget={round.downTarget}
            livePrice={heroLive}
            priceSeries={priceSeries}
            decimals={dec}
            copy={{
              priceLabel: decided ? t.market.udClosePrice : t.market.udLivePrice,
              openLabel: t.market.udOpenPrice,
              upLabel: t.market.udUp,
              downLabel: t.market.udDown,
              awaitingRead: t.market.udAwaitingRead,
              aboveBelow: move != null && move !== 0 ? `${move > 0 ? t.market.udAboveOpenBy : t.market.udBelowOpenBy} $${Math.abs(move).toFixed(dec)}` : null,
              source,
              chartAlt: `${name} ${t.market.udTitle}`,
            }}
          />

          <div className="flex min-w-0 flex-col gap-4">
            {/* Pool */}
            <section aria-label={t.market.udPool} style={{ ...card, padding: "14px 16px 16px" }}>
              <p className={eyebrow}>{t.market.udPool}</p>
              <div className="mt-2.5 flex items-baseline justify-between gap-3">
                <div>
                  {/* ⭐ DG-A-12 · §M4 + §T1 — THE POOL FIGURE AND THE COUNT BESIDE IT MOVE TOGETHER.
                      `volumeTzs` is an amount, so §M4 gives it `.amount` (mono + tabular-nums +
                      letter-spacing 0) in place of `font-mono … tabular-nums`. 17px is on
                      neither ladder (§T1); `text-title-sm` (18) is the nearest rung, +1px.
                      ⛔ The predictor count at L465 is the SAME 17px and sits in the same
                      `items-baseline justify-between` row — it moves in this edit too, or the
                      pool's two headline figures end up a pixel apart on one baseline. It is a
                      COUNT, not an amount, so it keeps `font-mono tabular-nums` and does NOT
                      take `.amount` (§M4 governs amounts only). `leading-[1.1]` stays on both:
                      the rung would otherwise impose 24px and open the pair up. */}
                  <p className="m-0 amount text-title-sm font-bold leading-[1.1] text-text">{formatTzs(round.volumeTzs)}</p>
                  <p className="mt-1 font-mono text-micro uppercase eyebrow text-text-faint">{t.market.udVolume}</p>
                </div>
                <div className="text-right">
                  <p className="m-0 flex items-center justify-end gap-1.5 font-mono text-title-sm font-bold leading-[1.1] tabular-nums text-text">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.4" /><path d="M5.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /></svg>
                    {round.players.toLocaleString()}
                  </p>
                  <p className="mt-1 font-mono text-micro uppercase eyebrow text-text-faint">{t.market.udPlayers}</p>
                </div>
              </div>
              {/* 🔴 PV-06 · THE THIRD HAND-ROLLED SPLIT BAR, and the third different drawing of
                  one idea. `market-card.tsx` used the kit's `TippingBar`; this page and
                  `updown-card.tsx` each drew their own two-span strip — 6px with a 0.5 gap
                  here, 5px with a 2px gap there — and neither could inherit the cold-start
                  rail the primitive already owns (§B9: "A STATE OF THIS BAR, not a second
                  component"). So an empty round advertised "Up 50% · 50% Down" on both.
                  One bar now, at `.mcardp`'s own height. */}
              <div className="mt-3.5">
                {upPct !== null && downPct !== null && (
                  <div className="flex items-baseline justify-between gap-2 font-mono text-[9.5px] font-bold tracking-[0.06em]">
                    <span style={{ color: "var(--yes-300)" }}>{t.market.udUp} {upPct}%</span>
                    <span style={{ color: "var(--no-300)" }}>{downPct}% {t.market.udDown}</span>
                  </div>
                )}
                {upPct === null ? (
                  <TippingBar className="mt-1.5" height={7} showLabels={false} recastOnHover={false}
                    empty emptyLabel={t.market.noBetsYet} />
                ) : (
                  <TippingBar className="mt-1.5" yesPct={upPct} height={7} showLabels={false}
                    recastOnHover={false} resolved={round.state === "resolved"}
                    probabilityLabel={t.market.probBarAria.replace("{side}", t.market.udUp)} />
                )}
                <div className="mt-1.5 flex items-baseline justify-between gap-2 font-mono text-[10.5px] tabular-nums text-text-muted">
                  <span>{formatTzs(upTzs)}</span>
                  <span>{formatTzs(downTzs)}</span>
                </div>
              </div>
            </section>

            {/* Stake (open) · Result (resolved & played) · calm panels otherwise.
                ⭐ UD-2 · the open/locked pair is ONE client component that derives its
                phase from the instants (`roundPhase` + the server-anchored clock), so
                the stake panel flips to the locked presentation at the lock INSTANT —
                zero refetch, exactly as the board card does. `isOpen`/`locked` here
                only pick which branch the SERVER renders first; the panel keeps itself
                honest between polls. */}
            {isOpen || locked ? (
              <RoundActionPanel
                state={round.state}
                selectionClosedAt={round.selectionClosedAt}
                closesAt={round.closesAt}
                serverNowMs={round.serverNowMs}
                myExactPayout={round.myExactPayout}
                myPayoutIfUp={round.myPayoutIfUp}
                myPayoutIfDown={round.myPayoutIfDown}
                ariaStake={t.market.udStake}
                stakePanel={{
                  marketId: round.marketId,
                  isAuthed: !!session,
                  minStake,
                  maxStake,
                  myUpStake: round.myUpStake,
                  myDownStake: round.myDownStake,
                  pricing: round.pricing,
                  assetName: name,
                  signInHref: `/auth/login?next=${encodeURIComponent(`/updown/${roundId}${lockedSide ? `?side=${lockedSide}` : ""}`)}`,
                  lockedSide,
                  walletBalance: detail.walletBalance,
                  // UD-22 · assembled server-side on the round itself, so this page and the
                  // board card confirm a bet with the same sentences and the same exit terms.
                  receipt: round.receipt,
                }}
              />
            ) : decided && myPosition && result ? (
              <section aria-label={t.market.udYourResult} className="ticket-scope" style={{ ...card, padding: "14px 16px 16px" }}>
                {/* ⭐ E-101 · THE LANDING TARGET. `/positions/<id>` redirects here with the
                    position id as the fragment, and a fragment that names nothing scrolls
                    nowhere — the deep link would then look exactly like the generic href it
                    replaced. One anchor per position this panel AGGREGATES (a player holds one
                    side per round, but may have topped it up), zero-height so nothing moves. */}
                {myPosition.ids.map((pid) => (
                  <span key={pid} id={pid} className="ticket-anchor block scroll-mt-24" aria-hidden="true" />
                ))}
                <div className="flex items-center justify-between gap-2.5">
                  <p className={eyebrow}>{t.market.udYourResult}</p>
                  <Chip variant={resultVariant}>{resultLabel}</Chip>
                </div>
                <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="m-0 font-mono text-micro uppercase eyebrow text-text-faint">{t.market.udPaidOut}</p>
                    <p className={`mt-1 m-0 text-title-md font-bold leading-none amount${payoutStruck ? " gilt-ink" : " text-text"}`}>{formatTzs(myPosition.payout ?? 0)}</p>
                  </div>
                  <div className="text-right">
                    <p className="m-0 font-mono text-micro uppercase eyebrow text-text-faint">{t.market.udYourPick} · {t.market.udStake}</p>
                    {/* ⛔ A HEDGED HOLDER IS NOT QUOTED ONE SIDE. `myPositionFor` derives its
                        single `side` with `up >= down`, which is a tie-break, not a fact about
                        the bet — so a player who backed BOTH ways was shown the larger leg as
                        though it were their whole position. Same rule as UD-20 on the board. */}
                    <p className="mt-1 m-0 text-label amount text-text-muted">
                      {myPosition.hedged
                        ? t.market.udBothSides
                        : myPosition.side === "UP" ? t.market.udUp : t.market.udDown} · {formatTzs(myPosition.stake)}
                    </p>
                  </div>
                </div>

                {/* ⭐ EVERY POSITION, ITEMISED (Ali, 2026-08-15). The block above is the
                    AGGREGATE the settlement path wrote and it stays — but it is one line, and a
                    player holding six positions on this round was shown one line and one side.
                    ⛔ This reads ONLY what settlement already wrote (`status` + `finalPayout`).
                    No money arithmetic happens here; the figures above remain the money truth.
                    Rendered from `items.length > 1` because with a single position the aggregate
                    IS the itemisation, and repeating it under an identical headline is noise. */}
                {myPosition.items.length > 1 && (
                  <div className="mt-3.5 border-t border-border-subtle/60 pt-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="m-0 font-mono text-micro uppercase eyebrow text-text-faint">
                        {t.market.udPositionsOnRound} · {myPosition.items.length}
                      </p>
                      {myPosition.hedged && <Chip>{t.market.udBothSides}</Chip>}
                    </div>
                    <ul className="mt-2 m-0 flex list-none flex-col gap-1.5 p-0">
                      {myPosition.items.map((p) => (
                        <li
                          key={p.id}
                          className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 rounded-md border border-border bg-bg-overlay/50 px-2.5 py-1.5"
                        >
                          <span className="flex min-w-0 items-center gap-1.5">
                            <Chip className="tabular-nums" variant={p.side === "UP" ? "yes" : "no"}>
                              {p.side === "UP" ? "↑" : "↓"} {formatTzs(p.stake)}
                            </Chip>
                            <span className="font-mono text-[10px] text-text-faint">{POSITION_STATUS_LABEL(t, p.status)}</span>
                          </span>
                          {/* DG-A-12 · §M4 + §T1 — a player's own payout. `.amount` replaces
                              `font-mono … tabular-nums`; 12.5 → `text-body-sm` (13), the +0.5
                              already ruled for `.admin-tbl` and the only rung at or above
                              §T4's floor. */}
                          <span className="ml-auto amount text-body-sm font-bold text-text">
                            {p.payout == null ? "—" : formatTzs(p.payout)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {/* ⭐ E-65 · THE REFUND REASON BELONGS *HERE*, INSIDE THE RESULT PANEL.
                    🔴 FOUND BY DRIVING IT ON PRODUCTION, not by any suite. The refund branch
                    below is unreachable for the one player it was written for: this
                    `decided && myPosition && result` case matches FIRST, so a player who was
                    actually refunded saw the result panel and never the explanation.
                    Round `udr_06c8b7b8128a6de53c64` on 2026-08-04 is exactly it — resolved UP,
                    echo alone on DOWN, stake 500 returned in full, GGR 0, and the page said
                    nothing about why. That is E-65 surviving its own fix, one branch further
                    down. ⚠️ The guard asserted the branch EXISTED; it did not assert it was
                    REACHABLE, and those are different claims. */}
                {refundReason && (
                  <p className="mt-3 m-0 text-body-sm leading-[1.55] text-text-muted">
                    {(t.market as Record<string, string>)[REFUND_REASON_KEY[refundReason]]}
                  </p>
                )}
                {/* 🔴 E-101 · THIS BUTTON WAS A DEAD END BY CONSTRUCTION. It read "Open in
                    positions" and pointed at `/positions`, which is
                    `listPositionsForUser(…, "MARKET")` — long-form polls only. So the ONE page
                    that knows for certain this is an Up & Down bet was the page sending the
                    player to the other game's portfolio, where their own bet cannot appear and
                    the empty state says they have none. It now goes to the Up & Down history,
                    scrolled to this very ticket.
                    ⚠️ The LIST href, not the permalink route — the permalink resolves back to
                    this page, and a button that reloads the page you are already standing on is
                    the same dead end wearing a correct-looking URL. */}
                <Link href={positionListHref("UPDOWN", myPosition.ids[0] ?? "")} className="btn btn-ghost btn-sm mt-3.5 w-full justify-center">{t.market.udOpenInPositions}</Link>
              </section>
            ) : round.state === "confirming" ? (
              <section style={{ ...inset, padding: 16 }}>
                <Chip variant={TONE_CHIP[STATUS_TONE.PENDING.player]}>{t.market.udSettlingTitle}</Chip>
                <p className="mt-2 text-body-sm leading-[1.55] text-text-muted">{t.market.udConfirmingBody}</p>
              </section>
            ) : refundReason ? (
              // ── A REFUND, WITH ITS REAL REASON (E-65) ────────────────────
              // ⛔ Driven by `refundReasonFor`, the SAME rule the card uses — so the board and
              // this page cannot say different things about one player's money. It also fires
              // on a round that DECIDED but refunded this viewer for want of a counterparty,
              // which the old `state === "void"` branch could never reach.
              <section style={{ ...inset, padding: 16 }}>
                {/* Slate, and stated rather than left over: a refund is neutral (§C4) and
                    "refunded" is not a §B11 word. `variant="neutral"` is `.chip`'s own base
                    byte-for-byte, so this says out loud what the bare class was saying by
                    default. */}
                <Chip variant="neutral">{t.market.udRefundTitle}</Chip>
                <p className="mt-2 text-body-sm leading-[1.55] text-text-muted">
                  {(t.market as Record<string, string>)[REFUND_REASON_KEY[refundReason]]}
                </p>
              </section>
            ) : null}
          </div>
        </div>

        {/* ── Settlement proof (only once decided; never a half-filled shell) ── */}
        {proof && (
          <section aria-label={t.market.udSettlementProof} style={{ ...card, padding: "16px 18px 18px" }}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="gilt-eyebrow">{t.market.udSettlementProof}</span>
              <span className="font-mono text-micro uppercase eyebrow text-text-subtle">{t.market.udRoundLabel} {round.roundId} · {t.market.udAuditableRecord}</span>
            </div>
            <div className="gilt-rule" style={{ margin: "10px 0 14px" }} />

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
              {/* E-53 · the endpoint is gone from BOTH readings. It named the vendor and,
                  being a query URL carrying our metered key's own host, invited a click to
                  a page a player cannot read anyway. What makes this a proof is the price
                  and the two timestamps — quoted by the source, observed by us. */}
              {([
                [t.market.udOpenPrice, proof.openPrice, proof.openQuotedAt, proof.openObservedAt],
                [t.market.udClosePrice, proof.closePrice, proof.closeQuotedAt, proof.closeObservedAt],
              ] as const).map(([label, price, quotedAt, observedAt]) => (
                <div key={label} style={{ ...inset, padding: "12px 14px 13px" }}>
                  <p className={eyebrow}>{label}</p>
                  <p className="mt-[7px] m-0 font-mono text-[19px] font-bold leading-none tabular-nums text-text">{usd(price, dec)}</p>
                  <dl className="mt-[11px] grid grid-cols-[auto_1fr] gap-x-2.5 gap-y-[5px] font-mono text-[10.5px]">
                    <dt className="text-text-faint">{t.market.udSource}</dt>
                    <dd className="m-0 text-text-muted">{t.market[SOURCE_CLASS_KEY[asset.sourceClass]]}</dd>
                    <dt className="text-text-faint">{t.market.udQuoted}</dt>
                    <dd className="m-0 tabular-nums text-text-muted">{fmtEAT(quotedAt) ?? "—"}</dd>
                    <dt className="text-text-faint">{t.market.udObserved}</dt>
                    <dd className="m-0 tabular-nums text-text-muted">{fmtEAT(observedAt) ?? "—"}</dd>
                  </dl>
                </div>
              ))}

              <div style={{ ...inset, padding: "12px 14px 13px" }}>
                <p className={eyebrow}>{t.market.udOutcome}</p>
                <p className="mt-[7px] m-0 flex items-center gap-1.5 font-mono text-[19px] font-bold leading-none" style={{ letterSpacing: "0.04em", color: outcomeInk }}>
                  {outcomeArrow && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={outcomeArrow} /></svg>}
                  {outcomeLabel}
                </p>
                <dl className="mt-[11px] grid grid-cols-[auto_1fr] gap-x-2.5 gap-y-[5px] font-mono text-[10.5px]">
                  <dt className="text-text-faint">{t.market.udMove}</dt>
                  <dd className="m-0 tabular-nums text-text-muted">{pMove != null ? `${sgn(pMove)}$${Math.abs(pMove).toFixed(dec)}` : "—"}</dd>
                  <dt className="text-text-faint">{t.market.udPercent}</dt>
                  <dd className="m-0 tabular-nums text-text-muted">{pMovePct != null ? `${sgn(pMovePct)}${Math.abs(pMovePct).toFixed(3)}%` : "—"}</dd>
                  {round.upTarget != null && round.downTarget != null && (
                    <>
                      <dt className="text-text-faint">{t.market.udUp}</dt>
                      <dd className="m-0 tabular-nums" style={{ color: "var(--yes-300)" }}>≥ {usd(round.upTarget, dec)}</dd>
                      <dt className="text-text-faint">{t.market.udDown}</dt>
                      <dd className="m-0 tabular-nums" style={{ color: "var(--no-300)" }}>≤ {usd(round.downTarget, dec)}</dd>
                    </>
                  )}
                  <dt className="text-text-faint">{t.market.udRule}</dt>
                  {/* E-39 — the rule is per-round, so the sentence must be too. A banded round
                      (every round priced by the E-32 ladder) voids on any close INSIDE the band,
                      not only on a price that did not move; stating the latter under a $12.62
                      band misdescribes settlement on the card a player takes to an objection.
                      The legacy sentence is kept because at margin 0 it is the correct one. */}
                  <dd className="m-0 text-text-muted">
                    {round.upTarget != null && round.downTarget != null
                      ? t.market.udRuleTextBanded
                      : t.market.udRuleText}
                  </dd>
                </dl>
              </div>
            </div>

            {/* ⛔ STAFF ONLY (Ali, 2026-08-03). This is the provider's RAW response —
                symbol, exchange, OHLC, previous close, 52-week range, the lot. It is the
                right thing for an officer adjudicating an objection and the wrong thing on
                a player's screen: it is verbatim vendor data a player can lift off the
                platform, and it tells them nothing the panel above has not already said in
                plain language (both prices, both quote times, the band, the rule).
                ⚠️ Gated SERVER-SIDE, so it never enters a player's HTML at all — hiding it
                with CSS would still ship the payload to the browser and "view source" is
                not a permission boundary. The player keeps the whole auditable record;
                only the raw vendor blob is withheld. */}
            {evidence && viewerIsStaff && (
              <div className="mt-3.5">
                <p className={`${eyebrow} mb-[7px]`}>
                  {t.market.udEvidenceExcerpt}
                  <span className="ml-2 normal-case tracking-normal text-text-faint">· staff only</span>
                </p>
                <pre className="m-0 font-mono text-[10.5px] text-text-muted" style={{ ...inset, borderLeft: "2px solid color-mix(in oklab, var(--gilt) 55%, transparent)", borderRadius: "var(--r-sm)", padding: "11px 13px", lineHeight: 1.65, whiteSpace: "pre-wrap", overflowWrap: "break-word" }}>{evidence}</pre>
              </div>
            )}

            <p className="mt-3 text-body-sm leading-[1.55] text-text-faint">{t.market.udProofClosingNote}</p>
          </section>
        )}
      </div>
    </div>
  );
}
