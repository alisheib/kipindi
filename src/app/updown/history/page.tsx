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
import { RefreshPoller } from "@/components/ui/refresh-poller";
import { currentSession } from "@/lib/server/auth-service";
import { getMyUpDownHistory, type MyRoundRow } from "@/lib/server/updown-board";
import { getServerT } from "@/lib/i18n-server";
import { eatDayWindow, isInEatDay, eatDayKey, formatEatDay } from "@/lib/eat-day";
import { FilterPill, FilterGroupKey } from "@/components/ui/filter-pill";
import { pickLocalized } from "@/lib/localized";
import { formatTzs, formatTzsSigned } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const { t } = await getServerT();
  return { title: t.market.udHistoryTitle };
}

// UD-19 · EAST AFRICA TIME, stated — the settlement proof on the round page speaks
// EAT, and a player comparing their history row to the proof must not have to
// convert time zones between two screens describing one bet.
const fmtDate = (iso: string) => {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  const s = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(d);
  return `${s} EAT`;
};
const usd = (n: number | null, d: number) => (n == null ? "—" : `$${n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })}`);

/**
 * How many recent EAT days the picker offers. A week is the span a player reasons about on a
 * game whose rounds turn over in minutes, and it keeps the rail on ONE line at 360px in
 * Swahili — the constraint that actually binds here. Older days stay reachable through the
 * digest's own deep link, which is where this filter came from in the first place.
 */
const DAY_PICKER_DAYS = 7;

/**
 * How many of the player's most recent Up & Down positions this page reads.
 *
 * ⚠️ It is a REAL limit and the page states it when it bites (see `capped` below). Named
 * here rather than inlined at the call site so the number the page reads and the number it
 * reports to the player can never be two different literals.
 */
const UD_HISTORY_LIMIT = 400;

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
  // 🔴 ONE VALIDATED VALUE DRIVES ALL THREE USES — the filter, the day rail and the empty
  // state. The first version validated for the chip but filtered on the RAW param, so
  // `?day=lol` matched no round, hid every card, and then — because the chip only
  // renders for a VALID day — showed "no rounds" with no indication of what had been
  // filtered and no control to clear it. A dead end reached by one typo. Caught by
  // `live-updown-digest.mjs` against production, not by reasoning about it.
  // ⭐ Batch 5 made that dead end structurally impossible rather than merely fixed: the day
  // rail below renders from the player's OWN rounds and always offers "All days", so an
  // unparseable `?day=` now lands on a page whose way out is a control, not just a link.
  const rawDay = (await searchParams)?.day ?? null;
  const dayWindow = rawDay ? eatDayWindow(rawDay) : null;
  const dayKey = dayWindow ? rawDay : null;   // null ⇒ no filter, no chip, no empty state

  // ⛔ UD-15 · no swallow: a failed read must never render as "you have no bets"
  // (B-1's exact defect class, on a money history). Throws reach error.tsx.
  const allRows = await getMyUpDownHistory(session.userId, UD_HISTORY_LIMIT);
  // ⛔ AND THE CAP IS NOW SAID OUT LOUD. `getMyUpDownHistory` takes the most recent
  // `UD_HISTORY_LIMIT` positions and this page renders them as though they were the player's
  // whole Up & Down record — including the P&L strip, whose "net return" is then a real
  // shilling figure computed over an unstated subset. That is the same class of defect as the
  // `+N` chip one section down: not a wrong number, a number whose scope is concealed. A
  // player past the cap is now told what they are looking at.
  const capped = allRows.length >= UD_HISTORY_LIMIT;
  // Filter on `settledAt` when the round has settled, and on `placedAt` while it
  // has not — the digest bins by settlement, and a still-open round has no
  // settlement to bin by but is still part of the day the player was playing.
  const rows = dayKey
    ? allRows.filter((r) => isInEatDay(r.settledAt ?? r.placedAt, dayKey))
    : allRows;

  /* ⭐ THE DAY PICKER — batch 5. Until now this page had a FILTER WITH NO CONTROL: `?day=` was
     reachable only from the daily digest's deep link, so a player who cleared it could never
     get back to a single day, and the page's own comment above cites the rule ("§0.1b rule 2")
     that every grid should filter.
     ⛔ IT IS DERIVED, NOT QUERIED. `allRows` is already in hand and `eatDayKey` is the SAME
     shared arithmetic the filter and the digest use, so both the day list and its counts cost
     zero extra I/O — and a day can never be offered that pressing it would not deliver,
     because the option only exists if a round produced it.
     ⚠️ It lists the days inside the most recent 400 positions — `getMyUpDownHistory`'s cap —
     not all time. That is a real limit and it is why the rail is capped at a week rather than
     pretending to be a calendar. */
  const dayRounds = new Map<string, Set<string>>();
  for (const r of allRows) {
    const at = Date.parse(r.settledAt ?? r.placedAt);
    if (!Number.isFinite(at)) continue;
    const k = eatDayKey(at);
    // Count ROUNDS, not bets — the cards below are one per round, so a count of positions
    // would promise 9 and deliver 3 on a day the player quick-bet the same round three times.
    const seen = dayRounds.get(k) ?? new Set<string>();
    seen.add(r.marketId);
    dayRounds.set(k, seen);
  }
  const recentDays = [...dayRounds.keys()].sort().reverse().slice(0, DAY_PICKER_DAYS);
  // A digest link can name a day older than the rail's window. Never drop the ACTIVE day from
  // the rail: a selected control that is not on screen is how a player concludes the filter is
  // stuck. It is appended in date order, so the rail still reads newest-first.
  const dayOptions = dayKey && !recentDays.includes(dayKey) ? [...recentDays, dayKey] : recentDays;

  // GROUP BY ROUND. Up & Down is a fast game — placing many bets on one 5-minute round is
  // normal, so a per-position list reads as a redundant cluster and miscounts "rounds".
  // One card per round: EVERY bet on it renders as its own chip, and the round shows the
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

  // UD-19 · a history that lists LIVE rounds must move when they settle. Rule-shaped
  // enablement, like `refreshCadence`: poll only while an in-play round is on screen;
  // a page of finished rounds registers nothing.
  const anyLive = rounds.some((g) => g.anyOpen);

  return (
    <div className="mx-auto w-full max-w-[1080px] px-4 py-6">
      <RefreshPoller intervalMs={20_000} enabled={anyLive} />
      {/* E-101b · a `#pos_…` fragment names one card in this grid; this is what scrolls to it.
          Without it the anchors render, the ring applies, and the player still lands at the top. */}
      <HashFocus />
      <BackLink fallbackHref="/updown" label={t.market.udBackToBoard} />
      <div className="mt-3">
        <PageHeader eyebrow={t.market.udTitle} title={t.market.udHistoryTitle} subtitle={t.market.udHistoryBody} />
      </div>

      {/* The day rail — the filter's state AND the way in and out of it, in one control.
          ⚠️ IT REPLACES A CHIP THAT ONLY REPORTED. The old row was a `chip-pending` badge
          naming the active day beside a `btn-ghost` clear link: it could say which day was in
          force and it could clear it, but it could not CHOOSE one. The selected pill now says
          both — which is the whole point of the one filter language, and it is why the group
          key reads "Showing": the rail is a sentence.
          ⛔ No `?day=` link may ever match `a[href^="/updown/udr_"]` — that is how
          `live-updown-digest.mjs` counts round cards. Query links are safe by construction. */}
      {dayOptions.length > 0 && (
        <nav aria-label={t.market.udHistoryTitle} data-filter-rail className="mt-4 flex flex-wrap items-center gap-1.5">
          <FilterGroupKey>{t.market.udShowingDay}</FilterGroupKey>
          <FilterPill
            href="/updown/history"
            label={t.market.udAllDays}
            on={!dayKey}
            semantics="tab"
            replace
            scroll={false}
          />
          {dayOptions.map((d) => (
            <FilterPill
              key={d}
              href={`/updown/history?day=${d}`}
              label={formatEatDay(d, t.common.monthsShort, locale)}
              count={dayRounds.get(d)?.size}
              on={d === dayKey}
              semantics="tab"
              rank="secondary"
              replace
              scroll={false}
            />
          ))}
        </nav>
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
              <div className="amount text-micro text-text-subtle">{formatTzs(staked)} → {formatTzs(returned)}</div>
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

          {/* The cap, stated — faint factual register (a fact about the list, not an alarm),
              directly under the figures it qualifies so it cannot be read in isolation. */}
          {capped && (
            <p className="mt-3 flex items-start gap-1.5 text-body-sm leading-[1.5] text-text-faint">
              <I.info s={11} className="mt-[2px] shrink-0" />
              <span>{t.market.udHistoryCapped.replace("{n}", String(UD_HISTORY_LIMIT))}</span>
            </p>
          )}

          {/* ── Rounds — one card per round; EVERY bet on it rendered as its own chip. ── */}
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
              const roundLink = r.roundId ? `/updown/${r.roundId}` : null;
              // ⛔ UD-18 · next/link, NOT a raw <a>. The anchor form made every click out
              // of history a full document reload — the slowest navigation in the
              // section, skipping the router cache and RouteTransition, with NavProgress
              // firing over a white MPA reload (a double signal). The div fallback stays
              // for rows whose round row is gone.
              const CardTag = (roundLink ? Link : "div") as React.ElementType;
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

                  {/* Bets on this round — EVERY position, one chip each.
                      🔴 This rendered `g.bets.slice(0, 2)` and collapsed the rest into a bare
                      `+N`. A player holding six positions on one round saw two of them and the
                      number four, on the only surface that lists their Up & Down money — and the
                      `+N` chip was not a control, so there was nowhere to go to see the rest.
                      Ali, 2026-08-15: "make it show, no matter how much position I have."
                      ⛔ THE COUNT LEADS THE ROW, it does not trail it. With ten chips the row
                      wraps to four lines at 360px in SW/ZH and a trailing count lands alone on
                      the last line, reading as a stray figure rather than a label for the group.
                      ⛔ No `max-h` and no scroll container here: clipping the row would be the
                      same defect wearing a different mechanism. The card is allowed to grow —
                      the grid's rows auto-size, and the money block below stays inside it. */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-micro uppercase tracking-[0.10em] text-text-faint">
                      {g.bets.length} {t.market.udBets}
                    </span>
                    {g.bets.map((b) => (
                      <span key={b.positionId} className={"chip tabular-nums " + (b.side === "UP" ? "chip-yes" : "chip-no")}>
                        {b.side === "UP" ? "↑" : "↓"} {formatTzs(b.stake)}
                      </span>
                    ))}
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
          <p className="mt-3 flex items-center gap-1.5 text-body-sm text-text-subtle">
            <I.info s={12} />
            {t.market.udHistoryBody}
          </p>
        </>
      )}
    </div>
  );
}
