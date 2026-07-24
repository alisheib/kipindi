/**
 * /updown — the Up & Down board.
 *
 * Per `Markets Appearing.txt`: this destination holds ONLY the short-term price rounds.
 * `/markets` holds long-form polls; `/live` shows both. That split is enforced at the
 * data layer (`listMarkets()` defaults to `productLine: "MARKET"`), not by filtering
 * here.
 *
 * Built to `docs/design-system/v1-2026-07-24/specs/D2-updown-board-spec.md`, with one
 * correction to the brief: the grid stays 3-across at 1920 rather than widening to 4 —
 * the platform has a fixed 3-tier max-width system (1280 grid / 1080 content / 640
 * forms) and the board must not break it.
 */
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { RefreshPoller } from "@/components/ui/refresh-poller";
import { I } from "@/components/ui/glyphs";
import { getBoard } from "@/lib/server/updown-board";
import { getServerT } from "@/lib/i18n-server";
import { pickLocalized } from "@/lib/localized";
import { UpDownCard } from "@/components/updown/updown-card";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const { t } = await getServerT();
  return { title: t.market.udTitle };
}

function usd(n: number, decimals: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

export default async function UpDownPage({
  searchParams,
}: {
  searchParams: Promise<{ asset?: string; d?: string }>;
}) {
  const sp = await searchParams;
  const { t, locale } = await getServerT();
  const board = await getBoard({
    assetKey: sp.asset,
    durationMinutes: sp.d ? Number(sp.d) : undefined,
  }).catch(() => null);

  if (!board || board.assets.length === 0) {
    return (
      <div className="mx-auto w-full max-w-[1280px] px-4 py-6">
        <PageHeader eyebrow={t.market.udStreaming} title={t.market.udTitle} subtitle={t.market.udTagline} />
        <div className="mt-6">
          <EmptyState title={t.market.udNoRounds} body={t.market.udNoRoundsBody} />
        </div>
      </div>
    );
  }

  const { assets, activeAsset, activeDuration, rounds, recent, chainPaused } = board;
  const href = (assetKey: string, d?: number) => `/updown?asset=${assetKey}${d ? `&d=${d}` : ""}`;

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-6">
      {/* Rounds turn over in minutes, so the board refreshes itself. */}
      <RefreshPoller intervalMs={20_000} />

      <PageHeader eyebrow={t.market.udStreaming} title={t.market.udTitle} subtitle={t.market.udTagline} />

      {/* ── Price tape — real readings only; an asset with no confirmed price
             shows an em-dash rather than a plausible-looking zero. ─────────── */}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl px-3.5 py-2.5"
           style={{ background: "var(--bg-inset)", border: "1px solid color-mix(in oklab, var(--border) 70%, transparent)" }}>
        {assets.map((a) => (
          <span key={a.id} className="inline-flex items-baseline gap-2">
            <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.10em] text-text-subtle">
              {pickLocalized(locale, a.nameEn, a.nameSw, a.nameZh)}
            </span>
            <span className="font-mono text-[13px] font-bold tabular-nums"
                  style={{ color: a.livePrice == null ? "var(--text-faint)" : "var(--text)" }}>
              {a.livePrice == null ? "—" : usd(a.livePrice, a.decimals)}
            </span>
          </span>
        ))}
        <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.10em] text-text-faint">
          <span className="live-dot" /> {t.market.udStreaming}
        </span>
      </div>

      {/* ── Asset tabs (primary) ─────────────────────────────────────────── */}
      <nav aria-label={t.market.udAssets} className="mt-4 flex flex-wrap gap-2">
        {assets.map((a) => {
          const on = a.key === activeAsset?.key;
          return (
            <Link key={a.id} href={href(a.key) as never}
                  aria-current={on ? "page" : undefined}
                  className="inline-flex h-9 items-center rounded-md px-4 text-[13.5px] font-semibold transition-colors"
                  style={{
                    border: `1px solid ${on ? "var(--brand-500)" : "var(--border)"}`,
                    background: on ? "oklch(40% 0.12 262 / 0.35)" : "color-mix(in oklab, var(--bg-elevated) 60%, transparent)",
                    color: on ? "var(--text)" : "var(--text-muted)",
                    textDecoration: "none",
                  }}>
              {pickLocalized(locale, a.nameEn, a.nameSw, a.nameZh)}
            </Link>
          );
        })}
      </nav>

      {/* ── Duration tabs (secondary — deliberately quieter) ─────────────── */}
      {activeAsset && activeAsset.durations.length > 0 && (
        <nav aria-label={t.market.udDurations} className="mt-2 flex flex-wrap gap-1.5">
          {activeAsset.durations.map((d) => {
            const on = d === activeDuration;
            return (
              <Link key={d} href={href(activeAsset.key, d) as never}
                    aria-current={on ? "page" : undefined}
                    className="inline-flex h-7 items-center rounded-md px-3 font-mono text-[11.5px] transition-colors"
                    style={{
                      border: `1px solid ${on ? "var(--border-strong)" : "transparent"}`,
                      background: on ? "var(--bg-inset)" : "transparent",
                      color: on ? "var(--text)" : "var(--text-subtle)",
                      textDecoration: "none",
                    }}>
                {d} {t.market.udMin}
              </Link>
            );
          })}
        </nav>
      )}

      {/* ── Heartbeat: real outcomes only; hidden entirely when there are none ── */}
      {recent.length > 0 && (
        <div className="mt-4 flex items-center gap-2">
          <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.10em] text-text-faint">
            {t.market.udLastRounds}
          </span>
          <span className="flex gap-1">
            {recent.map((o, i) => (
              <span key={i}
                    aria-label={o === "UP" ? t.market.udUp : o === "DOWN" ? t.market.udDown : t.market.statusVoid}
                    className="inline-flex items-center justify-center rounded-sm"
                    style={{
                      width: 18, height: 18,
                      background: o === "UP" ? "oklch(52% 0.15 150 / 0.22)" : o === "DOWN" ? "oklch(52% 0.17 22 / 0.22)" : "transparent",
                      border: `1px solid ${o === "UP" ? "oklch(61% 0.16 150 / 0.5)" : o === "DOWN" ? "oklch(61% 0.18 22 / 0.5)" : "var(--border)"}`,
                      color: o === "UP" ? "var(--yes-300)" : o === "DOWN" ? "var(--no-300)" : "var(--text-faint)",
                    }}>
                {o === "UP" ? <I.trendingUp s={9} /> : o === "DOWN" ? <I.trendingDown s={9} /> : <I.arrowRight s={9} />}
              </span>
            ))}
          </span>
          <span className="font-mono text-[9px] text-text-faint">{t.market.udOldestNewest}</span>
        </div>
      )}

      {/* ── The grid. 1 / 2 / 3 columns — and STAYS 3 at 1920. ───────────── */}
      <div className="mt-4">
        {chainPaused || rounds.length === 0 ? (
          <EmptyState title={t.market.udNoRounds} body={t.market.udNoRoundsBody} />
        ) : (
          <div className="grid items-stretch gap-4"
               style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
            {rounds.map((r) => (
              <UpDownCard
                key={r.roundId}
                roundId={r.roundId}
                assetName={pickLocalized(locale, activeAsset!.nameEn, activeAsset!.nameSw, activeAsset!.nameZh)}
                assetTicker={activeAsset!.key}
                assetIcon={activeAsset!.iconKey}
                durationMinutes={r.durationMinutes}
                decimals={activeAsset!.decimals}
                livePrice={activeAsset!.livePrice}
                openPrice={r.openPrice}
                movePct={
                  r.openPrice != null && activeAsset!.livePrice != null && r.openPrice !== 0
                    ? ((activeAsset!.livePrice - r.openPrice) / r.openPrice) * 100
                    : null
                }
                closesAtMs={Date.parse(r.closesAt)}
                volumeTzs={r.volumeTzs}
                players={r.players}
                upPct={r.upPct}
                estMultiplier={r.estMultiplier}
                state={r.state}
                outcome={r.outcome === "VOID" ? null : r.outcome}
                closePrice={r.closePrice}
                voidReason={r.voidReason as never}
                sourceName={activeAsset!.sourceDomain}
                sourceQuotedAt={activeAsset!.sourceQuotedAt}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
