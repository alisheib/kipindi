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
import { getServerT } from "@/lib/i18n-server";
import { pickLocalized } from "@/lib/localized";
import { formatTzs } from "@/lib/utils";
import { RoundCountdownPod } from "@/components/updown/round-countdown";
import { PriceHero } from "@/components/updown/price-hero";
import { RoundStakePanel } from "@/components/updown/round-stake-panel";
import { AssetMark } from "@/components/updown/updown-card";

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
  const detail = await getRoundDetail(roundId, session?.userId).catch(() => null);
  if (!detail) notFound();

  const { round, asset, proof, priceSeries, myPosition, minStake, maxStake } = detail;
  const name = pickLocalized(locale, asset.nameEn, asset.nameSw, asset.nameZh);
  const dec = asset.decimals;
  const ticker = asset.key.toUpperCase();
  const isOpen = round.state === "open";
  const decided = round.state === "resolved" || round.state === "void";

  // Hero price: the current live read while open, the round's own close once decided.
  const heroLive = decided ? round.closePrice : asset.livePrice;
  const move = heroLive != null && round.openPrice != null ? heroLive - round.openPrice : null;
  const source =
    asset.sourceDomain
      ? `${t.market.udSource}: ${asset.sourceDomain}${asset.sourceQuotedAt ? ` · ${t.market.udQuoted} ${fmtEAT(asset.sourceQuotedAt)}` : ""}`
      : null;

  // Pool split TZS — consistent with the bar (same upPct) and summing to the real volume.
  const upPct = Math.round(round.upPct);
  const downPct = Math.max(0, 100 - upPct);
  const upTzs = Math.round((round.volumeTzs * upPct) / 100);
  const downTzs = Math.max(0, round.volumeTzs - upTzs);

  const statusWord =
    round.state === "open" ? t.market.statusLive
      : round.state === "confirming" ? t.market.udConfirmingPrice
        : round.state === "void" ? t.market.statusVoid
          : t.market.statusResolved;
  const countLabel = isOpen ? t.market.udClosesIn : round.state === "confirming" ? t.market.udAwaitingResult : t.market.udRoundSettled;

  // Result panel data (resolved rounds the viewer actually played).
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
          <RoundCountdownPod closesAtMs={Date.parse(round.closesAt)} isOpen={isOpen} label={countLabel} />
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
                <Link href="/positions" className="btn btn-ghost btn-sm mt-3.5 w-full justify-center">{t.market.udOpenInPositions}</Link>
              </section>
            ) : round.state === "confirming" ? (
              <section style={{ ...inset, padding: 16 }}>
                <span className="chip chip-pending">{t.market.udConfirmingPrice}</span>
                <p className="mt-2 text-[12.5px] leading-[1.55] text-text-muted">{t.market.udConfirmingBody}</p>
              </section>
            ) : round.state === "void" ? (
              <section style={{ ...inset, padding: 16 }}>
                <span className="chip">{t.market.udVoided}</span>
                <p className="mt-2 text-[12.5px] leading-[1.55] text-text-muted">
                  {round.voidReason === "source-failed" ? t.market.udVoidedSource : t.market.udVoidedBody}
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
              {([
                [t.market.udOpenPrice, proof.openPrice, proof.openSourceUrl, proof.openQuotedAt, proof.openObservedAt],
                [t.market.udClosePrice, proof.closePrice, proof.closeSourceUrl, proof.closeQuotedAt, proof.closeObservedAt],
              ] as const).map(([label, price, url, quotedAt, observedAt]) => (
                <div key={label} style={{ ...inset, padding: "12px 14px 13px" }}>
                  <p className={eyebrow}>{label}</p>
                  <p className="mt-[7px] m-0 font-mono text-[19px] font-bold leading-none tabular-nums text-text">{usd(price, dec)}</p>
                  <dl className="mt-[11px] grid grid-cols-[auto_1fr] gap-x-2.5 gap-y-[5px] font-mono text-[10.5px]">
                    <dt className="text-text-faint">{t.market.udSource}</dt>
                    <dd className="m-0">{url ? <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--aqua-300)" }}>{asset.sourceDomain || t.market.udSource} ↗</a> : <span className="text-text-muted">{asset.sourceDomain || "—"}</span>}</dd>
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

            {evidence && (
              <div className="mt-3.5">
                <p className={`${eyebrow} mb-[7px]`}>{t.market.udEvidenceExcerpt}</p>
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
