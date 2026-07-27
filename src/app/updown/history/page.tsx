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
import { I } from "@/components/ui/glyphs";
import { currentSession } from "@/lib/server/auth-service";
import { getMyUpDownHistory, type MyRoundRow } from "@/lib/server/updown-board";
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

  const rows = await getMyUpDownHistory(session.userId, 400).catch(() => []);

  // GROUP BY ROUND. Up & Down is a fast game — placing many bets on one 5-minute round is
  // normal, so a per-position list reads as a redundant cluster and miscounts "rounds".
  // One card per round: the bets collapse to chips (max 2 + "+N"), and the round shows the
  // player's aggregate stake / return / net across all their positions on it.
  const groups = new Map<string, {
    row: MyRoundRow;               // representative (asset/duration/outcome/prices/round)
    bets: MyRoundRow[];            // every position on this round, newest first
    stake: number; returned: number;
    anyOpen: boolean; latest: number;
  }>();
  for (const r of rows) {
    const g = groups.get(r.marketId) ?? { row: r, bets: [], stake: 0, returned: 0, anyOpen: false, latest: 0 };
    g.bets.push(r);
    g.stake += r.stake;
    g.returned += r.payout ?? 0;
    if (r.status === "OPEN") g.anyOpen = true;
    const at = Date.parse(r.placedAt) || 0;
    if (at >= g.latest) { g.latest = at; }
    groups.set(r.marketId, g);
  }
  const rounds = [...groups.values()].sort((a, b) => b.latest - a.latest);

  // P&L strip — ROUND-level now. A round counts once; a round is "won" when the player's
  // net on it is positive (settled, non-void). Open rounds carry no realised result.
  const settledRounds = rounds.filter((g) => !g.anyOpen && g.row.outcome !== "VOID");
  const staked = settledRounds.reduce((s, g) => s + g.stake, 0);
  const returned = settledRounds.reduce((s, g) => s + g.returned, 0);
  const net = returned - staked;
  const decided = settledRounds.length;
  const wins = settledRounds.filter((g) => g.returned > g.stake).length;
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
              <div className="mt-0.5 font-mono text-[19px] font-bold tabular-nums text-text">{rounds.length}</div>
              <div className="font-mono text-[10px] text-text-subtle">{rows.length} {t.market.udBets}</div>
            </div>
            <div className="rounded-xl border border-border bg-bg-elevated p-3.5 col-span-2 sm:col-span-1">
              <div className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-text-faint">{t.market.udWinRate}</div>
              <div className="mt-0.5 font-mono text-[19px] font-bold tabular-nums text-text">{winRate == null ? "—" : `${winRate}%`}</div>
              <div className="font-mono text-[10px] text-text-subtle">{wins}/{decided} decided</div>
            </div>
          </div>

          {/* ── Rounds — one card per round; bets collapse to chips (max 2 + "+N"). ── */}
          <div className="mt-4 grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
            {rounds.map((g) => {
              const r = g.row;
              const name = pickLocalized(locale, r.assetNameEn, r.assetNameSw, r.assetNameZh);
              const net = g.returned - g.stake;
              // Round outcome (what happened) — factual; the player's own result is the net.
              const result =
                g.anyOpen ? { cls: "chip-live", label: t.market.udInPlay, live: true }
                : r.outcome === "VOID" ? { cls: "chip-pending", label: t.market.udVoided, live: false }
                : r.outcome === "UP" ? { cls: "chip-yes", label: t.market.udUpWins, live: false }
                : r.outcome === "DOWN" ? { cls: "chip-no", label: t.market.udDownWins, live: false }
                : { cls: "chip-pending", label: t.market.udConfirmingPrice, live: false };
              const shown = g.bets.slice(0, 2);
              const extra = g.bets.length - shown.length;
              const roundLink = r.roundId ? `/updown/${r.roundId}` : null;
              const CardTag: "a" | "div" = roundLink ? "a" : "div";
              return (
                <CardTag
                  key={r.marketId}
                  {...(roundLink ? { href: roundLink } : {})}
                  className={"block rounded-xl border border-border bg-bg-elevated p-3.5 transition-colors" + (roundLink ? " hover:border-brand-400" : "")}
                >
                  {/* Header: asset + duration + when · round outcome */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-display text-[14px] font-semibold text-text">
                        {name} <span className="chip align-middle">{r.durationMinutes} {t.market.udMin}</span>
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] text-text-subtle">{r.assetKey} · {fmtDate(r.placedAt)}</div>
                    </div>
                    <span className={"chip shrink-0 " + result.cls}>
                      {result.live && <span className="live-dot" />}{result.label}
                    </span>
                  </div>

                  {/* Bets on this round — capped at 2 chips + a "+N" overflow. */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    {shown.map((b) => (
                      <span key={b.positionId} className={"chip tabular-nums " + (b.side === "UP" ? "chip-yes" : "chip-no")}>
                        {b.side === "UP" ? "↑" : "↓"} {formatTzs(b.stake)}
                      </span>
                    ))}
                    {extra > 0 && <span className="chip" title={`${g.bets.length} ${t.market.udBets}`}>+{extra}</span>}
                    <span className="font-mono text-[10px] text-text-faint">· {g.bets.length} {t.market.udBets}</span>
                  </div>

                  {/* Money: staked → return + net; prices. */}
                  <div className="mt-3 flex items-end justify-between gap-2 border-t border-border-subtle/60 pt-2.5">
                    <div className="font-mono text-[10.5px] text-text-subtle tabular-nums">
                      <div>{formatTzs(g.stake)}{g.anyOpen ? "" : <> → {formatTzs(g.returned)}</>}</div>
                      <div className="mt-0.5 text-[10px] text-text-faint">{usd(r.openPrice, r.decimals)} → {usd(r.closePrice, r.decimals)}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-text-faint">{t.market.udNetReturn}</div>
                      <div className="font-mono text-[15px] font-bold tabular-nums"
                           style={{ color: g.anyOpen ? "var(--text-subtle)" : net > 0 ? "var(--yes-300)" : net < 0 ? "var(--no-300)" : "var(--text)" }}>
                        {g.anyOpen ? "—" : net === 0 ? formatTzs(0) : formatTzsSigned(net)}
                      </div>
                    </div>
                  </div>
                </CardTag>
              );
            })}
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
