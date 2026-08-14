/**
 * /updown — the Up & Down board.
 *
 * Per `Markets Appearing.txt`: this destination holds ONLY the short-term price rounds.
 * `/markets` holds long-form polls; `/live` shows both. That split is enforced at the
 * data layer (`listMarkets()` defaults to `productLine: "MARKET"`), not by filtering
 * here.
 *
 * Built to `docs/design-system/v2-2026-07-27/02-components/_specs-as-delivered/D2-updown-board-spec.md`, with one
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
import { currentSession } from "@/lib/server/auth-service";
import { getServerT } from "@/lib/i18n-server";
import { pickLocalized } from "@/lib/localized";
import { UpDownCard } from "@/components/updown/updown-card";
import { UpDownResultAnnouncer } from "@/components/updown/updown-result-announcer";
import { UpDownBoardTabs } from "@/components/updown/updown-board-tabs";

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
  const session = await currentSession();
  // ⛔ UD-15 · NO `.catch(() => null)` HERE ANY MORE. Swallowing the read rendered a
  // DB outage as a calm "No rounds open right now" — an empty state is a statement
  // about the WORLD ("nothing scheduled"), not about the PLATFORM. A real throw now
  // reaches error.tsx: named, retryable, honest. The empty branch below remains for
  // the query that SUCCEEDED and found nothing.
  const board = await getBoard({
    assetKey: sp.asset,
    durationMinutes: sp.d ? Number(sp.d) : undefined,
    userId: session?.userId,
  });

  if (board.assets.length === 0) {
    return (
      <div className="mx-auto w-full max-w-[1280px] px-4 py-6">
        <PageHeader eyebrow={t.market.udStreaming} title={t.market.udTitle} subtitle={t.market.udTagline} />
        <div className="mt-6">
          <EmptyState title={t.market.udNoRounds} body={t.market.udNoRoundsBody} />
        </div>
      </div>
    );
  }

  const { assets, activeAsset, activeDuration, rounds, recent, chainPaused, stakeBounds, walletBalance } = board;
  const href = (assetKey: string, d?: number) => `/updown?asset=${assetKey}${d ? `&d=${d}` : ""}`;
  const isAuthed = !!session;

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-6">
      {/* Rounds turn over in minutes, so the board refreshes itself. */}
      <RefreshPoller intervalMs={20_000} />

      <div className="flex items-start justify-between gap-3">
        <PageHeader eyebrow={t.market.udStreaming} title={t.market.udTitle} subtitle={t.market.udTagline} />
        {/* This game's own portfolio — separate from the long-form Bets page. */}
        <Link
          href="/updown/history"
          className="mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-pill border border-border bg-bg-elevated px-3 py-2 font-mono text-[11px] uppercase tracking-[0.10em] text-text-muted hover:text-text hover:border-brand-400 transition-colors"
        >
          <I.portfolio s={13} />
          <span className="hidden sm:inline">{t.market.udHistoryTitle}</span>
          <I.chevronRight s={11} />
        </Link>
      </div>

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

      {/* ⭐ UD-13 · asset/duration tabs are a FILTER: the client shell below runs the
          navigation in a transition and keeps the live board on screen (dimmed) while
          the filtered one streams in — no skeleton flash, no countdown restart. */}
      <UpDownBoardTabs
        assetTabs={assets.map((a) => ({ key: a.key, href: href(a.key), label: pickLocalized(locale, a.nameEn, a.nameSw, a.nameZh) }))}
        durationTabs={activeAsset ? activeAsset.durations.map((d) => ({ d, href: href(activeAsset.key, d) })) : []}
        activeAssetKey={activeAsset?.key ?? null}
        activeDuration={activeDuration}
        assetsLabel={t.market.udAssets}
        durationsLabel={t.market.udDurations}
        minLabel={t.market.udMin}
      >

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
        {/* ⛔ E-67 · THE GATE IS "ARE THERE ROUNDS", NOT "IS THE CHAIN RUNNING".
            This read `chainPaused || rounds.length === 0`, which was survivable only while a
            chain being STOPPED implied no rounds existed. Since Ali stopped automatic emission
            (*"my admins will enter and generate every 5 min"*) EVERY chain is STOPPED and rounds
            are created by hand — so that condition hid a real, live, playable round behind
            "No rounds open right now". Measured: `udr_cd386bbaeaf63be696f5`, open price
            63,719.98, targets set, live until 21:15 UTC, and completely invisible to players.
            A chain's state says whether MORE rounds will appear; it says nothing about whether
            the one on the board can be played. */}
        {/* ⭐ THE RESULT MOMENT (Ali, 2026-08-05). Announces on the OBSERVED transition of a
            round this viewer holds from unsettled → settled, which the RefreshPoller above
            delivers by re-rendering this server tree without remounting client children.
            ⛔ In-app only — no email, no push, no inbox row. Ali's 2026-07-24 suppression of
            per-round Up & Down notifications STANDS; this renders data the page already has. */}
        <UpDownResultAnnouncer rounds={rounds.map((r) => ({ roundId: r.roundId, myResult: r.myResult }))} />
        {rounds.length === 0 ? (
          // ⭐ UD-22 · a chain between rounds is NOT an idle market. Rounds are
          // operator-generated (E-67), so the gap between them showed the same copy as
          // "nothing here today" and a player could not tell "wait a bit" from "leave".
          // When the asset+duration resolves to a real chain, say the honest thing —
          // the next round is being prepared — without promising a cadence manual
          // generation does not guarantee. (Copy flagged for Ali's sign-off in §9.)
          activeDuration != null ? (
            <EmptyState
              title={t.market.udNextRoundSoon}
              body={t.market.udNextRoundSoonBody.replace("{n}", String(activeDuration))}
            />
          ) : (
            <EmptyState title={t.market.udNoRounds} body={t.market.udNoRoundsBody} />
          )
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
                upTarget={r.upTarget}
                downTarget={r.downTarget}
                movePct={
                  r.openPrice != null && activeAsset!.livePrice != null && r.openPrice !== 0
                    ? ((activeAsset!.livePrice - r.openPrice) / r.openPrice) * 100
                    : null
                }
                closesAtMs={Date.parse(r.closesAt)}
                selectionClosesAtMs={r.selectionClosedAt ? Date.parse(r.selectionClosedAt) : null}
                serverNowMs={r.serverNowMs}
                expectedResultAtMs={/* E-99 · null under the sample floor → no clock, never a
                                        guessed one. */ r.expectedResultAtMs}
                myExactPayout={r.myExactPayout}
                myPayoutIfUp={r.myPayoutIfUp}
                myPayoutIfDown={r.myPayoutIfDown}
                volumeTzs={r.volumeTzs}
                players={r.players}
                upPct={r.upPct}
                pricing={r.pricing}
                state={r.state}
                outcome={r.outcome === "VOID" ? null : r.outcome}
                closePrice={r.closePrice}
                voidReason={r.voidReason as never}
                sourceClass={activeAsset!.sourceClass}
                sourceQuotedAt={activeAsset!.sourceQuotedAt}
                marketId={r.marketId}
                isAuthed={isAuthed}
                minStake={stakeBounds.min}
                maxStake={stakeBounds.max}
                walletBalance={walletBalance}
                myUpStake={r.myUpStake}
                myDownStake={r.myDownStake}
                myRefundedStake={r.myRefundedStake}
              />
            ))}
          </div>
        )}
      </div>
      </UpDownBoardTabs>
    </div>
  );
}
