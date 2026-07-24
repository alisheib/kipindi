/**
 * /updown/[roundId] — one round.
 *
 * Two jobs: commit a stake, and afterwards prove the result was honest.
 *
 * The SETTLEMENT PROOF is the trust artefact and the reason this page matters. It shows
 * both prices, both source links, and — crucially — the timestamp THE SOURCE ITSELF
 * published for each, not our grid boundary. Those are different numbers, and stating
 * the source's own time is what keeps the product honest about the precision it
 * actually has. It renders only once the round is decided; a half-filled receipt
 * mid-round would imply a result that does not exist yet.
 */
import { notFound } from "next/navigation";
import Link from "next/link";
import { BackLink } from "@/components/ui/back-link";
import { EmptyState } from "@/components/ui/empty-state";
import { I } from "@/components/ui/glyphs";
import { getRoundDetail } from "@/lib/server/updown-board";
import { getServerT } from "@/lib/i18n-server";
import { pickLocalized } from "@/lib/localized";
import { formatTzs } from "@/lib/utils";
import { RoundCountdown } from "@/components/updown/round-countdown";

export const dynamic = "force-dynamic";

function usd(n: number | null, decimals: number): string {
  return n == null ? "—" : `$${n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}
const hhmmss = (iso: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? `${d.toISOString().slice(11, 19)} UTC` : null;
};

export async function generateMetadata({ params }: { params: Promise<{ roundId: string }> }) {
  const { roundId } = await params;
  const d = await getRoundDetail(roundId).catch(() => null);
  return { title: d?.titleEn ?? "Up & Down" };
}

export default async function UpDownRoundPage({
  params,
}: {
  params: Promise<{ roundId: string }>;
}) {
  const { roundId } = await params;
  const { t, locale } = await getServerT();
  const detail = await getRoundDetail(roundId).catch(() => null);
  if (!detail) notFound();

  const { round, asset, proof, minStake, maxStake } = detail;
  const name = pickLocalized(locale, asset.nameEn, asset.nameSw, asset.nameZh);
  const decided = round.outcome != null;
  const moved =
    round.openPrice != null && round.closePrice != null ? round.closePrice - round.openPrice : null;
  const movedPct =
    moved != null && round.openPrice ? (moved / round.openPrice) * 100 : null;

  return (
    <div className="mx-auto w-full max-w-[1080px] px-4 py-6">
      <BackLink fallbackHref="/updown" label={t.market.udTitle} />

      <header className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-[24px] font-bold leading-tight text-text">
            {name} {t.market.udTitle}
          </h1>
          <div className="mt-1 flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.10em] text-text-subtle">
            <span className="chip">{round.durationMinutes} {t.market.udMin}</span>
            <span>{asset.key}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* The player needs to see how long is left HERE too — this is where they
              commit a stake. Same hook and same digits as the card, so the two can
              never drift apart by a second and read as broken. */}
          {round.state === "open" && (
            <RoundCountdown closesAtMs={Date.parse(round.closesAt)} label={t.market.udClosesIn} />
          )}
          <span className={
            "chip " + (round.state === "open" ? "chip-live"
              : round.state === "resolved" ? "chip-resolved" : "chip-pending")
          }>
            {round.state === "open" && <span className="live-dot" />}
            {round.state === "open" ? t.market.statusLive
              : round.state === "confirming" ? t.market.udConfirmingPrice
              : round.state === "void" ? t.market.udVoided
              : round.state === "resolved" ? (round.outcome === "UP" ? t.market.udUpWins : t.market.udDownWins)
              : t.market.udAwaitingResult}
          </span>
        </div>
      </header>

      {/* ── The line the bet is against ─────────────────────────────────── */}
      <section className="mt-5 rounded-xl p-4" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <div className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-text-faint">{t.market.udOpenPrice}</div>
            <div className="mt-0.5 font-mono text-[18px] font-bold tabular-nums text-text">{usd(round.openPrice, asset.decimals)}</div>
          </div>
          <div>
            <div className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-text-faint">
              {decided ? t.market.udClosePrice : t.market.statusLive}
            </div>
            <div className="mt-0.5 font-mono text-[18px] font-bold tabular-nums"
                 style={{ color: moved == null ? "var(--text)" : moved > 0 ? "var(--yes-300)" : moved < 0 ? "var(--no-300)" : "var(--text)" }}>
              {decided ? usd(round.closePrice, asset.decimals) : usd(asset.livePrice, asset.decimals)}
            </div>
            {movedPct != null && (
              <div className="font-mono text-[11px] tabular-nums" style={{ color: moved! > 0 ? "var(--yes-300)" : "var(--no-300)" }}>
                {moved! > 0 ? "+" : ""}{movedPct.toFixed(3)}%
              </div>
            )}
          </div>
          <div>
            <div className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-text-faint">{t.market.udVolume}</div>
            <div className="mt-0.5 font-mono text-[18px] font-bold tabular-nums text-text">{formatTzs(round.volumeTzs)}</div>
          </div>
          <div>
            <div className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-text-faint">{t.market.udPlayers}</div>
            <div className="mt-0.5 font-mono text-[18px] font-bold tabular-nums text-text">{round.players.toLocaleString()}</div>
          </div>
        </div>

        {/* Pool split — words and colour, never colour alone. */}
        <div className="mt-4">
          <div className="flex items-center justify-between font-mono text-[10px] font-bold tracking-[0.06em]">
            <span style={{ color: "var(--yes-300)" }}>{t.market.udUp} {Math.round(round.upPct)}%</span>
            <span style={{ color: "var(--no-300)" }}>{Math.round(100 - round.upPct)}% {t.market.udDown}</span>
          </div>
          <div className="mt-1 flex gap-[2px] overflow-hidden rounded-pill" style={{ height: 6 }}>
            <span style={{ width: `${round.upPct}%`, background: "var(--yes-500)" }} />
            <span style={{ width: `${100 - round.upPct}%`, background: "var(--no-500)" }} />
          </div>
        </div>
      </section>

      {/* ── Act, or explain why you cannot ──────────────────────────────── */}
      {round.state === "open" ? (
        <section className="mt-4 rounded-xl p-4" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
          <p className="text-[12.5px] leading-[1.55] text-text-muted">
            {t.market.udTagline}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link href={`/markets/${round.marketId}?side=YES` as never} className="btn btn-yes btn-lg justify-center">
              <I.trendingUp s={15} /> {t.market.udUp}
            </Link>
            <Link href={`/markets/${round.marketId}?side=NO` as never} className="btn btn-no btn-lg justify-center">
              <I.trendingDown s={15} /> {t.market.udDown}
            </Link>
          </div>
          <p className="mt-2 text-[10.5px] leading-[1.45] text-text-faint">{t.market.udEstimateNote}</p>
          <p className="mt-1 font-mono text-[10px] text-text-faint">
            {formatTzs(minStake)} – {formatTzs(maxStake)}
          </p>
        </section>
      ) : round.state === "confirming" ? (
        <section className="mt-4 rounded-xl p-4" style={{ background: "var(--bg-inset)", border: "1px solid var(--border)" }}>
          <span className="chip chip-pending">{t.market.udConfirmingPrice}</span>
          <p className="mt-2 text-[12.5px] leading-[1.55] text-text-muted">{t.market.udConfirmingBody}</p>
        </section>
      ) : round.state === "void" ? (
        <section className="mt-4 rounded-xl p-4" style={{ background: "var(--bg-inset)", border: "1px solid var(--border)" }}>
          <span className="chip">{t.market.udVoided}</span>
          <p className="mt-2 text-[12.5px] leading-[1.55] text-text-muted">
            {round.voidReason === "source-failed" ? t.market.udVoidedSource : t.market.udVoidedBody}
          </p>
        </section>
      ) : null}

      {/* ── Settlement proof — a receipt, not a banner ───────────────────── */}
      {proof ? (
        <section className="mt-4 rounded-xl p-4" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
          <h2 className="font-display text-[15px] font-semibold text-text">{t.market.udSettlementProof}</h2>
          <p className="mt-1 text-[11.5px] leading-[1.55] text-text-muted">{t.market.udProofBody}</p>
          <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {([
              [t.market.udOpenPrice, proof.openPrice, proof.openSourceUrl, proof.openQuotedAt, proof.openEvidence],
              [t.market.udClosePrice, proof.closePrice, proof.closeSourceUrl, proof.closeQuotedAt, proof.closeEvidence],
            ] as const).map(([label, price, url, quotedAt, evidence]) => (
              <div key={label} className="rounded-lg p-3" style={{ background: "var(--bg-inset)", border: "1px solid var(--border)" }}>
                <dt className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-text-faint">{label}</dt>
                <dd className="mt-0.5 font-mono text-[17px] font-bold tabular-nums text-text">{usd(price, asset.decimals)}</dd>
                <dd className="mt-1 font-mono text-[10px] text-text-subtle">
                  {/* The SOURCE's own time — not our boundary. */}
                  {quotedAt ? `${t.market.udQuoted} ${hhmmss(quotedAt)}` : "—"}
                </dd>
                {url && (
                  <dd className="mt-1">
                    <a href={url} target="_blank" rel="noopener noreferrer"
                       className="font-mono text-[10px] underline" style={{ color: "var(--accent-400)" }}>
                      {t.market.udSource}
                    </a>
                  </dd>
                )}
                {evidence && (
                  <dd className="mt-1.5 text-[10.5px] leading-[1.5] text-text-faint">&ldquo;{evidence.slice(0, 160)}&rdquo;</dd>
                )}
              </div>
            ))}
          </dl>
          {moved != null && (
            <p className="mt-3 font-mono text-[11px] tabular-nums text-text-muted">
              {usd(round.openPrice, asset.decimals)} → {usd(round.closePrice, asset.decimals)}
              {" · "}
              <span style={{ color: moved > 0 ? "var(--yes-300)" : moved < 0 ? "var(--no-300)" : "var(--text-muted)" }}>
                {moved > 0 ? "+" : ""}{moved.toFixed(asset.decimals)}
              </span>
            </p>
          )}
        </section>
      ) : decided ? (
        <section className="mt-4">
          <EmptyState title={t.market.udSettlementProof} body={t.market.udProofBody} />
        </section>
      ) : null}
    </div>
  );
}
