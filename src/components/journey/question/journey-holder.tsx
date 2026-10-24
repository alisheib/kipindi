/** The question's own tickets, with the same exits and frozen free window as the classic holder block. */
import { I } from "@/components/ui/glyphs";
import { SellButton } from "@/components/markets/sell-button";
import { freeExitEndsAt, type StoredMarket, type StoredPosition } from "@/lib/server/market-service";
import { formatEatDateTime } from "@/lib/eat-day";
import { sideWord } from "@/lib/side-label";
import { playerStatusInk } from "@/lib/status-tone";
import { formatClock, formatTzs } from "@/lib/utils";
import type { Dict, Locale } from "@/lib/i18n-dict";
// FEE-TAX-2026-10 · R3b — a win paid back below its stake is not earned money: its figure is never gilt.
import { isBelowStakeWin } from "@/lib/stake-share-receipt";

export function JourneyHolder({ m, positions, values, sellable, pricedFree, selectionClosed, nowMs, t, locale }: {
  m: StoredMarket; positions: readonly StoredPosition[]; values: ReadonlyMap<string, number | null>;
  sellable: ReadonlyMap<string, boolean>; pricedFree: ReadonlyMap<string, boolean>; selectionClosed: boolean;
  nowMs: number; t: Dict; locale: Locale;
}) {
  // No ticket means no holder block: the picks stand here, as the question board draws them. The classic empty line
  // invites a player to use a dial, which a journey request does not mount.
  if (positions.length === 0) return null;
  return <section className="rounded-xl border border-border bg-bg-elevated p-5 space-y-3" data-testid="journey-holder">
    <h2 className="font-display text-body-lg font-semibold text-text flex items-center gap-2"><I.portfolio s={16} edge="start" />{t.journey.ticketsHere}</h2>
    {positions.map((p) => {
      const value = values.get(p.id) ?? null;
      const shut = p.status === "OPEN" && (selectionClosed || sellable.get(p.id) === false);
      const freeUntil = freeExitEndsAt({ placedAt: p.placedAt }, m);
      return <div key={p.id} id={p.id} className="ticket-target scroll-mt-11 rounded-md border border-border bg-bg-overlay/40 p-3 space-y-2">
        <div className="flex items-center justify-between gap-2 font-mono text-body-sm">
          <div className="flex items-center gap-2">
            <span className={`font-bold ${p.side === "YES" ? "text-yes-300" : "text-no-300"}`}>{sideWord(t, p.side, "MARKET")}</span>
            <span className={`text-micro uppercase tracking-[0.10em] font-semibold ${p.status === "WIN" ? "text-gold-300" : p.status === "LOSS" ? "text-no-300" : (playerStatusInk(p.status) ?? "text-text-muted")}`}>
              {p.status === "OPEN" ? t.market.posOpen : p.status === "WIN" ? t.market.posWin : p.status === "LOSS" ? t.market.posLoss : p.status === "CASHED_OUT" ? t.market.posCashed : t.market.posVoid}
            </span>
          </div><span className="font-bold tabular-nums text-text">{formatTzs(p.stake)}</span>
        </div>
        {p.status !== "OPEN" && <div className="flex items-center justify-between font-mono text-body-sm">
          <span className="text-text-muted">{t.market.paidLabel}</span><span className={`font-bold tabular-nums ${p.status === "WIN" && !isBelowStakeWin(p.finalPayout, p.stake) ? "text-gold-300" : "text-text"}`}>{formatTzs(p.finalPayout ?? 0)}</span>
        </div>}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
          <p className="flex min-w-0 items-center gap-1 break-all font-mono text-body-sm text-text-muted tabular-nums"><I.ticket s={14} className="shrink-0 opacity-60" />{p.id}</p>
          <p className="flex items-center gap-1 font-mono text-body-sm text-text-muted tabular-nums"><I.clock s={14} className="opacity-70 shrink-0" />
            <span>{t.market.opened}{" "}<span className="whitespace-nowrap">{formatEatDateTime(Date.parse(p.placedAt), nowMs, t.common.monthsShort, locale)}</span></span>
          </p>
        </div>
        {(value !== null || shut) && <SellButton look="journey" positionId={p.id} stake={p.stake} value={value ?? 0}
          freeUntil={freeUntil} freeUntilLabel={freeUntil ? formatClock(freeUntil) : null} closesAt={m.selectionClosedAt ?? m.resolutionAt} alreadyClosed={shut}
          serverNow={nowMs} pricedFree={pricedFree.get(p.id) === true} />}
      </div>;
    })}
  </section>;
}
