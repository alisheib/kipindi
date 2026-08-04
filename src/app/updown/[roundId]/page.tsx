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
import { getRoundDetail } from "@/lib/server/updown-board";
import { currentSession } from "@/lib/server/auth-service";
import { isStaffRole } from "@/lib/server/roles";
import { getServerT } from "@/lib/i18n-server";
// ⛔ ONE RULE FOR "why did this stake come back", shared with the card — five copies would be
// five chances to disagree about someone money.
import { refundReasonFor, REFUND_REASON_KEY } from "@/lib/updown-refund-reason";
import { pickLocalized } from "@/lib/localized";
import { formatTzs } from "@/lib/utils";
import { RoundCountdownPod } from "@/components/updown/round-countdown";
import { PriceHero } from "@/components/updown/price-hero";
import { RoundStakePanel } from "@/components/updown/round-stake-panel";
import { AssetMark } from "@/components/updown/updown-card";
import { SOURCE_CLASS_KEY } from "@/lib/updown-source-label";

export const dynamic = "force-dynamic";

const card = { background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", boxShadow: "var(--shadow-card)" } as const;
const inset = { background: "var(--bg-inset)", border: "1px solid color-mix(in oklab, var(--border) 70%, transparent)", borderRadius: "var(--r-md)" } as const;
const eyebrow = "m-0 font-mono text-[8.5px] font-semibold uppercase tracking-[0.12em] text-text-faint";

const usd = (n: number | null, d: number): string =>
  n == null ? "—" : `$${n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })}`;

/** Source's own / our observed time in EAT (Africa/Nairobi), with the zone stated — a
 *  receipt without a timezone is not auditable. */
const fmtEAT = (iso: string | null): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  const s = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Nairobi", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(d);
  return `${s} EAT`;
};

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
  searchParams: Promise<{ side?: string }>;
}) {
  const { roundId } = await params;
  const sp = await searchParams;
  const lockedSide: "UP" | "DOWN" | null = sp?.side === "UP" || sp?.side === "DOWN" ? sp.side : null;
  const { t, locale } = await getServerT();
  const session = await currentSession();
  // Who is looking? The raw provider blob below is an officer tool, not player copy.
  const viewerIsStaff = isStaffRole(session?.role ?? "");
  const detail = await getRoundDetail(roundId, session?.userId).catch(() => null);
  if (!detail) notFound();

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
  const lockClock = round.selectionClosedAt
    ? new Date(round.selectionClosedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null;
  const decided = round.state === "resolved" || round.state === "void";

  // Hero price: the current live read while open, the round's own close once decided.
  const heroLive = decided ? round.closePrice : asset.livePrice;
  const move = heroLive != null && round.openPrice != null ? heroLive - round.openPrice : null;
  // E-53 · the KIND of market, never the vendor. The class arrives already resolved from
  // the server (`publicSourceClassFor`), so the domain is not in this payload to leak.
  const source =
    `${t.market[SOURCE_CLASS_KEY[asset.sourceClass]]}${asset.sourceQuotedAt ? ` · ${t.market.udQuoted} ${fmtEAT(asset.sourceQuotedAt)}` : ""}`;

  // Pool split TZS — consistent with the bar (same upPct) and summing to the real volume.
  const upPct = Math.round(round.upPct);
  const downPct = Math.max(0, 100 - upPct);
  const upTzs = Math.round((round.volumeTzs * upPct) / 100);
  const downTzs = Math.max(0, round.volumeTzs - upTzs);

  const statusWord =
    round.state === "open" ? t.market.statusLive
      : round.state === "locked" ? t.market.udLockedTitle
      : round.state === "confirming" ? t.market.udSettlingTitle
        : round.state === "void" ? t.market.statusVoid
          : t.market.statusResolved;
  // ⛔ RE-LABELLED AT THE LOCK. A reading of 0:36 means "36s left to bet" before it and
  // "36s until you find out" after — one set of digits, two deadlines, and the caption is
  // the only thing that distinguishes them.
  const countLabel = isOpen ? t.market.udBetsCloseIn
    : locked ? t.market.udResultIn
    : round.state === "confirming" ? t.market.udAwaitingResult
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
  const resultChip = result === "WIN" ? "chip chip-resolved" : result === "LOSS" ? "chip chip-no" : "chip";
  const resultLabel = result === "WIN" ? t.market.resolvedWin : result === "LOSS" ? t.market.resolvedLoss : t.market.udVoided;
  const payoutInk = result === "WIN" ? "var(--gilt)" : "var(--text)";

  // Proof geometry.
  const pMove = proof && proof.openPrice != null && proof.closePrice != null ? proof.closePrice - proof.openPrice : null;
  const pMovePct = pMove != null && proof?.openPrice ? (pMove / proof.openPrice) * 100 : null;
  const sgn = (v: number) => (v >= 0 ? "+" : "−");
  const outcomeWord = round.outcome === "UP" ? t.market.udUp : round.outcome === "DOWN" ? t.market.udDown : t.market.statusVoid;
  const outcomeInk = round.outcome === "UP" ? "var(--yes-300)" : round.outcome === "DOWN" ? "var(--no-300)" : "var(--text-muted)";
  const outcomeArrow = round.outcome === "UP" ? "M5 15l7-7 7 7" : round.outcome === "DOWN" ? "M5 9l7 7 7-7" : null;
  const evidence = proof?.closeEvidence ?? proof?.openEvidence ?? null;

  // B7 — was max-w-[1232px] with an inline padding, while this route's own
  // loading.tsx said 1080: a 152px layout jump on EVERY load, which no test
  // could see. Both are now the board tier.
  return (
    <div className="mx-auto w-full max-w-board px-3 lg:px-6 pt-[22px] pb-14">
      <div className="flex flex-col gap-[18px]">
        <BackLink fallbackHref="/updown" label={t.market.udTitle} />

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <AssetMark icon={asset.iconKey} ticker={ticker} size={44} />
            <div className="min-w-0">
              <h1 className="m-0 flex flex-wrap items-center gap-2">
                <span className="overflow-hidden text-ellipsis whitespace-nowrap font-display text-[20px] font-semibold leading-[1.25] text-text" style={{ letterSpacing: "-0.01em" }}>
                  {name} {t.market.udTitle}
                </span>
                <span className="chip">{round.durationMinutes} {t.market.udMin}</span>
              </h1>
              <p className="mt-1 flex items-center gap-1.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.10em] text-text-subtle">
                {isOpen && <span className="live-dot" />}
                {statusWord} · {ticker}
              </p>
            </div>
          </div>
          <RoundCountdownPod
            closesAtMs={isOpen && round.selectionClosedAt ? Date.parse(round.selectionClosedAt) : Date.parse(round.closesAt)}
            isOpen={isOpen || locked}
            serverNowMs={round.serverNowMs}
            label={countLabel}
          />
        </header>

        {/* ── Grid: price hero (left) · pool + stake/result (right) ───────── */}
        <div className="grid grid-cols-1 items-start gap-4 xl:[grid-template-columns:minmax(0,1.55fr)_minmax(300px,1fr)]">
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
                  <p className="m-0 font-mono text-[17px] font-bold leading-[1.1] tabular-nums text-text">{formatTzs(round.volumeTzs)}</p>
                  <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.10em] text-text-faint">{t.market.udVolume}</p>
                </div>
                <div className="text-right">
                  <p className="m-0 flex items-center justify-end gap-1.5 font-mono text-[17px] font-bold leading-[1.1] tabular-nums text-text">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.4" /><path d="M5.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /></svg>
                    {round.players.toLocaleString()}
                  </p>
                  <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.10em] text-text-faint">{t.market.udPlayers}</p>
                </div>
              </div>
              <div className="mt-3.5">
                <div className="flex items-baseline justify-between gap-2 font-mono text-[9.5px] font-bold tracking-[0.06em]">
                  <span style={{ color: "var(--yes-300)" }}>{t.market.udUp} {upPct}%</span>
                  <span style={{ color: "var(--no-300)" }}>{downPct}% {t.market.udDown}</span>
                </div>
                <div className="mt-1.5 flex gap-0.5" style={{ height: 6 }}>
                  <span style={{ width: `${upPct}%`, background: "var(--yes-500)", borderRadius: "var(--r-pill)" }} />
                  <span style={{ flex: 1, background: "var(--no-500)", borderRadius: "var(--r-pill)" }} />
                </div>
                <div className="mt-1.5 flex items-baseline justify-between gap-2 font-mono text-[10.5px] tabular-nums text-text-muted">
                  <span>{formatTzs(upTzs)}</span>
                  <span>{formatTzs(downTzs)}</span>
                </div>
              </div>
            </section>

            {/* Stake (open) · Result (resolved & played) · calm panels otherwise */}
            {isOpen ? (
              <section aria-label={t.market.udStake} style={{ ...card, padding: "14px 16px 16px" }}>
                <RoundStakePanel
                  marketId={round.marketId}
                  isAuthed={!!session}
                  minStake={minStake}
                  maxStake={maxStake}
                  myUpStake={round.myUpStake}
                  myDownStake={round.myDownStake}
                  estMultiplier={round.estMultiplier}
                  assetName={name}
                  signInHref={`/auth/login?next=${encodeURIComponent(`/updown/${roundId}${lockedSide ? `?side=${lockedSide}` : ""}`)}`}
                  lockedSide={lockedSide}
                />
              </section>
            ) : decided && myPosition && result ? (
              <section aria-label={t.market.udYourResult} style={{ ...card, padding: "14px 16px 16px" }}>
                <div className="flex items-center justify-between gap-2.5">
                  <p className={eyebrow}>{t.market.udYourResult}</p>
                  <span className={resultChip}>{resultLabel}</span>
                </div>
                <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="m-0 font-mono text-[9px] uppercase tracking-[0.10em] text-text-faint">{t.market.udPaidOut}</p>
                    <p className="mt-1 m-0 font-mono text-[22px] font-bold leading-none tabular-nums" style={{ color: payoutInk }}>{formatTzs(myPosition.payout ?? 0)}</p>
                  </div>
                  <div className="text-right">
                    <p className="m-0 font-mono text-[9px] uppercase tracking-[0.10em] text-text-faint">{t.market.udYourPick} · {t.market.udStake}</p>
                    <p className="mt-1 m-0 font-mono text-[12px] tabular-nums text-text-muted">{myPosition.side === "UP" ? t.market.udUp : t.market.udDown} · {formatTzs(myPosition.stake)}</p>
                  </div>
                </div>
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
                  <p className="mt-3 m-0 text-[12.5px] leading-[1.55] text-text-muted">
                    {(t.market as Record<string, string>)[REFUND_REASON_KEY[refundReason]]}
                  </p>
                )}
                <Link href="/positions" className="btn btn-ghost btn-sm mt-3.5 w-full justify-center">{t.market.udOpenInPositions}</Link>
              </section>
            ) : locked ? (
              // ── 🔒 LOCKED ────────────────────────────────────────────────
              // ⛔ The message carries its REASON. "Closed" reads as the app being too slow;
              // naming the instant and the fairness rule reads as fair. Same event, opposite
              // feeling, and it is the most load-bearing sentence in the feature.
              <section aria-label={t.market.udLockedTitle} style={{ ...inset, padding: 16 }}>
                <span className="chip chip-pending">🔒 {t.market.udLockedTitle}</span>
                <p className="mt-2.5 m-0 text-[12.5px] leading-[1.55] text-text-muted">
                  {t.market.udLockedWhy.replace("{time}", lockClock ?? "—")}
                </p>
                {/* ⭐ No estimate here — the pool is frozen, so this is the real number. */}
                {round.myExactPayout != null && (round.myUpStake > 0 || round.myDownStake > 0) && (
                  <p className="mt-3 m-0 font-mono text-[15px] font-bold tabular-nums"
                     style={{ color: round.myUpStake > 0 ? "var(--yes-300)" : "var(--no-300)" }}>
                    {t.market.udYouWin} {formatTzs(round.myExactPayout)}{" "}
                    {round.myUpStake > 0 ? t.market.udIfUp : t.market.udIfDown}
                  </p>
                )}
              </section>
            ) : round.state === "confirming" ? (
              <section style={{ ...inset, padding: 16 }}>
                <span className="chip chip-pending">{t.market.udSettlingTitle}</span>
                <p className="mt-2 text-[12.5px] leading-[1.55] text-text-muted">{t.market.udConfirmingBody}</p>
              </section>
            ) : refundReason ? (
              // ── A REFUND, WITH ITS REAL REASON (E-65) ────────────────────
              // ⛔ Driven by `refundReasonFor`, the SAME rule the card uses — so the board and
              // this page cannot say different things about one player's money. It also fires
              // on a round that DECIDED but refunded this viewer for want of a counterparty,
              // which the old `state === "void"` branch could never reach.
              <section style={{ ...inset, padding: 16 }}>
                <span className="chip">{t.market.udRefundTitle}</span>
                <p className="mt-2 text-[12.5px] leading-[1.55] text-text-muted">
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
              <span className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-text-subtle">{t.market.udRoundLabel} {round.roundId} · {t.market.udAuditableRecord}</span>
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
                  {outcomeWord}
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

            <p className="mt-3 text-[11px] leading-[1.55] text-text-faint">{t.market.udProofClosingNote}</p>
          </section>
        )}
      </div>
    </div>
  );
}
