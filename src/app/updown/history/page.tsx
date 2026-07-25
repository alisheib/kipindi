/**
 * /updown/history — the player's OWN Up & Down portfolio.
 *
 * A SEPARATE game from long-form polls (Ali, 2026-07-25), so it has its own history
 * surface rather than mixing into /positions. Reads the money settlement already wrote
 * (position status + finalPayout) — no new money logic. Redirects a signed-out visitor
 * to sign-in, then back here.
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { BackLink } from "@/components/ui/back-link";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { ScrollX } from "@/components/ui/scroll-x";
import { I } from "@/components/ui/glyphs";
import { currentSession } from "@/lib/server/auth-service";
import { getMyUpDownHistory } from "@/lib/server/updown-board";
import { getServerT } from "@/lib/i18n-server";
import { pickLocalized } from "@/lib/localized";
import { formatTzs, formatTzsSigned } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const { t } = await getServerT();
  return { title: t.market.udHistoryTitle };
}

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d.toISOString().slice(5, 16).replace("T", " ") + "Z" : "—";
};
const usd = (n: number | null, d: number) => (n == null ? "—" : `$${n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })}`);

export default async function UpDownHistoryPage() {
  const { t, locale } = await getServerT();
  const session = await currentSession();
  if (!session) redirect(`/auth/login?next=${encodeURIComponent("/updown/history")}`);

  const rows = await getMyUpDownHistory(session.userId, 200).catch(() => []);

  // P&L summary — settled rounds only (an open round has no realised result yet).
  const settled = rows.filter((r) => r.status !== "OPEN");
  const staked = settled.reduce((s, r) => s + r.stake, 0);
  const returned = settled.reduce((s, r) => s + (r.payout ?? 0), 0);
  const net = returned - staked;
  const wins = settled.filter((r) => r.status === "WIN").length;
  const decided = settled.filter((r) => r.status === "WIN" || r.status === "LOSS").length;
  const winRate = decided > 0 ? Math.round((wins / decided) * 100) : null;

  return (
    <div className="mx-auto w-full max-w-[1080px] px-4 py-6">
      <BackLink fallbackHref="/updown" label={t.market.udBackToBoard} />
      <div className="mt-3">
        <PageHeader eyebrow={t.market.udTitle} title={t.market.udHistoryTitle} subtitle={t.market.udHistoryBody} />
      </div>

      {rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title={t.market.udNoHistory}
            body={t.market.udNoHistoryBody}
            action={<Link href="/updown" className="btn btn-primary btn-md">{t.market.udTitle}</Link>}
          />
        </div>
      ) : (
        <>
          {/* ── P&L strip (settled rounds) ─────────────────────────────────── */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-border bg-bg-elevated p-3.5">
              <div className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-text-faint">{t.market.udNetReturn}</div>
              <div className="mt-0.5 font-mono text-[19px] font-bold tabular-nums"
                   style={{ color: net > 0 ? "var(--yes-300)" : net < 0 ? "var(--no-300)" : "var(--text)" }}>
                {net === 0 ? formatTzs(0) : formatTzsSigned(net)}
              </div>
              <div className="font-mono text-[10px] text-text-subtle">{formatTzs(staked)} → {formatTzs(returned)}</div>
            </div>
            <div className="rounded-xl border border-border bg-bg-elevated p-3.5">
              <div className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-text-faint">{t.market.udRoundsPlayed}</div>
              <div className="mt-0.5 font-mono text-[19px] font-bold tabular-nums text-text">{rows.length}</div>
              <div className="font-mono text-[10px] text-text-subtle">{settled.length} settled</div>
            </div>
            <div className="rounded-xl border border-border bg-bg-elevated p-3.5 col-span-2 sm:col-span-1">
              <div className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-text-faint">{t.market.udWinRate}</div>
              <div className="mt-0.5 font-mono text-[19px] font-bold tabular-nums text-text">{winRate == null ? "—" : `${winRate}%`}</div>
              <div className="font-mono text-[10px] text-text-subtle">{wins}/{decided} decided</div>
            </div>
          </div>

          {/* ── Rounds table ───────────────────────────────────────────────── */}
          <div className="mt-4 rounded-xl border border-border bg-bg-elevated overflow-hidden">
            <ScrollX label={t.market.udHistoryTitle}>
              <table className="w-full min-w-[720px] text-[12.5px]">
                <thead>
                  <tr className="text-left font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle border-b border-border-subtle">
                    <th className="px-4 py-2.5 font-semibold">Round</th>
                    <th className="px-4 py-2.5 font-semibold">{t.market.udYourPick}</th>
                    <th className="px-4 py-2.5 font-semibold text-right">{t.market.udStakedLabel}</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Open → Close</th>
                    <th className="px-4 py-2.5 font-semibold">{t.market.udResultLabel}</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Return</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const name = pickLocalized(locale, r.assetNameEn, r.assetNameSw, r.assetNameZh);
                    const net = (r.payout ?? 0) - r.stake;
                    const resultChip =
                      r.status === "WIN" ? { cls: "chip-yes", label: t.market.udWon }
                      : r.status === "LOSS" ? { cls: "chip-no", label: t.market.udLost }
                      : r.status === "VOID" || r.outcome === "VOID" ? { cls: "chip-pending", label: t.market.udVoided }
                      : r.status === "CASHED_OUT" ? { cls: "chip-pending", label: t.market.statusClosed }
                      : { cls: "chip-live", label: t.market.udOpenLabel };
                    const inner = (
                      <>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-mono font-bold text-text">{r.assetKey} {r.durationMinutes}m</div>
                          <div className="font-mono text-[10px] text-text-subtle">{name} · {fmtDate(r.placedAt)}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={"chip " + (r.side === "UP" ? "chip-yes" : "chip-no")}>
                            {r.side === "UP" ? t.market.udUp : t.market.udDown}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-text">{formatTzs(r.stake)}</td>
                        <td className="px-4 py-3 text-right font-mono text-[11px] tabular-nums text-text-muted whitespace-nowrap">
                          {usd(r.openPrice, r.decimals)} → {usd(r.closePrice, r.decimals)}
                        </td>
                        <td className="px-4 py-3"><span className={"chip " + resultChip.cls}>{resultChip.label}</span></td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold"
                            style={{ color: r.status === "OPEN" ? "var(--text-subtle)" : net > 0 ? "var(--yes-300)" : net < 0 ? "var(--no-300)" : "var(--text)" }}>
                          {r.status === "OPEN" ? "—" : r.status === "WIN" || r.status === "CASHED_OUT" ? formatTzs(r.payout ?? 0) : r.status === "VOID" ? formatTzs(r.stake) : formatTzs(0)}
                        </td>
                      </>
                    );
                    return r.roundId ? (
                      <tr key={r.positionId} className="border-b border-border-subtle/60 last:border-0 hover:bg-bg-inset/40 transition-colors">
                        {inner}
                      </tr>
                    ) : (
                      <tr key={r.positionId} className="border-b border-border-subtle/60 last:border-0">{inner}</tr>
                    );
                  })}
                </tbody>
              </table>
            </ScrollX>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-text-subtle">
            <I.info s={12} />
            {t.market.udHistoryBody}
          </p>
        </>
      )}
    </div>
  );
}
