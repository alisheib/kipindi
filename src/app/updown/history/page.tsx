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
// E-101b · a fragment names a row; this is what actually scrolls to it.
import { HashFocus } from "@/components/ui/hash-focus";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { I } from "@/components/ui/glyphs";
import { currentSession } from "@/lib/server/auth-service";
import { getMyUpDownHistory, type MyRoundRow } from "@/lib/server/updown-board";
import { getServerT } from "@/lib/i18n-server";
import { eatDayWindow, isInEatDay, formatEatDay } from "@/lib/eat-day";
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

export default async function UpDownHistoryPage({ searchParams }: {
  searchParams?: Promise<{ day?: string }>;
}) {
  const { t, locale } = await getServerT();
  const session = await currentSession();
  if (!session) redirect(`/auth/login?next=${encodeURIComponent("/updown/history")}`);

  // ── The digest's deep link (`?day=YYYY-MM-DD`), one EAT calendar day ──────
  //
  // ⚠️ This must actually filter. `updown-digest.ts` sends every player a link to
  // the day it is telling them about, and a link that says "your 2 Aug" and lands
  // on an unfiltered list of 400 rounds is a small lie inside the one message the
  // player receives about real money. It also gives this grid the filtering that
  // §0.1b rule 2 requires of every grid, player side included.
  //
  // ⛔ The day arithmetic is IMPORTED, not re-derived. The digest bins rounds into
  // EAT days; this page must cut on the identical boundary or the two disagree for
  // the three hours either side of midnight. `test:updown-digest` asserts that this
  // file imports the shared helper rather than growing its own copy.
  // 🔴 ONE VALIDATED VALUE DRIVES ALL THREE USES — the filter, the chip and the empty
  // state. The first version validated for the chip but filtered on the RAW param, so
  // `?day=lol` matched no round, hid every card, and then — because the chip only
  // renders for a VALID day — showed "no rounds" with no indication of what had been
  // filtered and no control to clear it. A dead end reached by one typo. Caught by
  // `live-updown-digest.mjs` against production, not by reasoning about it.
  const rawDay = (await searchParams)?.day ?? null;
  const dayWindow = rawDay ? eatDayWindow(rawDay) : null;
  const dayKey = dayWindow ? rawDay : null;   // null ⇒ no filter, no chip, no empty state
  const dayLabel = dayKey ? formatEatDay(dayKey, t.common.monthsShort, locale) : null;

  const allRows = await getMyUpDownHistory(session.userId, 400).catch(() => []);
  // Filter on `settledAt` when the round has settled, and on `placedAt` while it
  // has not — the digest bins by settlement, and a still-open round has no
  // settlement to bin by but is still part of the day the player was playing.
  const rows = dayKey
    ? allRows.filter((r) => isInEatDay(r.settledAt ?? r.placedAt, dayKey))
    : allRows;

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
      {/* E-101b · a `#pos_…` fragment names one card in this grid; this is what scrolls to it.
          Without it the anchors render, the ring applies, and the player still lands at the top. */}
      <HashFocus />
      <BackLink fallbackHref="/updown" label={t.market.udBackToBoard} />
      <div className="mt-3">
        <PageHeader eyebrow={t.market.udTitle} title={t.market.udHistoryTitle} subtitle={t.market.udHistoryBody} />
      </div>

      {/* The active day filter, and the way back out of it. A filter with no
          visible state and no clear control is how a player concludes their
          history has vanished. */}
      {dayKey && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-faint">{t.market.udShowingDay}</span>
          {/* `chip-pending` (brand blue), NOT `chip-live` — the first version used the
              live treatment, and a red pulsing chip on a static date filter reads as
              "something is happening right now" on a page of finished rounds. */}
          <span className="chip chip-pending">{dayLabel}</span>
          <Link href="/updown/history" className="btn btn-ghost btn-sm">{t.market.udAllDays}</Link>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title={dayKey ? t.market.udNoRoundsThatDay : t.market.udNoHistory}
            body={dayKey ? t.market.udHistoryBody : t.market.udNoHistoryBody}
            action={
              dayKey
                ? <Link href="/updown/history" className="btn btn-primary btn-md">{t.market.udAllDays}</Link>
                : <Link href="/updown" className="btn btn-primary btn-md">{t.market.udTitle}</Link>
            }
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
                  className={"ticket-scope block scroll-mt-24 rounded-xl border border-border bg-bg-elevated p-3.5 transition-colors" + (roundLink ? " hover:border-brand-400" : "")}
                >
                  {/* ⭐ E-101 · one anchor per bet on this round, so `/updown/history#pos_…`
                      lands on the card that holds it. A round card groups several bets, so the
                      card cannot carry a single position id — and a fragment naming nothing
                      scrolls nowhere while looking exactly like a working deep link. */}
                  {g.bets.map((b) => (
                    <span key={b.positionId} id={b.positionId} className="ticket-anchor block scroll-mt-24" aria-hidden="true" />
                  ))}
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
