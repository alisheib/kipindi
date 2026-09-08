import { headers } from "next/headers";
import QRCode from "qrcode";
import { I } from "@/components/ui/glyphs";
import { BackLink } from "@/components/ui/back-link";
import { FiftyMark, GiltCorner } from "@/components/brand";
import { Chip } from "@/components/ui/chip";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Stat } from "@/components/ui/stat";
import { Callout } from "@/components/ui/callout";
import { PageContainer } from "@/components/layout/page-container";
import { VerifiedAgentBadge } from "@/components/agent/verified-agent-badge";
import { ReferralShare } from "./invite-client";
import { RecruitsBar } from "./recruits-bar";
import { Pagination, PLAYER_PER_PAGE } from "@/components/ui/pagination";
import {
  buildRecruitHref,
  filterRecruits,
  parseRecruitParams,
  recruitCounts,
  recruitEmptyCause,
  sortRecruits,
  type RecruitRow,
} from "@/lib/affiliate/recruits";
import { getServerT } from "@/lib/i18n-server";
import { fillNodes } from "@/lib/fill-nodes";
import { fill, formatNumber, formatTzs, formatDateShort as fmtDate } from "@/lib/utils";
import type { AgentDashboard as AgentDashboardModel } from "@/lib/server/affiliate-service";

/**
 * THE AGENT'S OWN PAGE — a DISTINCT read model, not the player promo page with fields swapped.
 *
 * 🔴 The player page told an approved agent three false things about their own money: that
 * their withdrawable cash carried a wagering requirement and an expiry (it read `bonus-config`),
 * that their programme was "Paused" whenever a GROWTH officer paused the PLAYER promo (it read
 * `affiliate-config.enabled`), and that the player promo's terms were theirs. This component
 * reads `getAgentDashboard` only: the agent's own rate, the agent config's terms, the
 * agent-stamped book. ⛔ It cannot read either player config — it has no import for them.
 *
 * DEACTIVATED: the page still renders (200) with the history read-only — earnings, recruits —
 * and LOSES every share surface: the code, the link, the QR, the CTA. ⛔ Never `notFound()` a
 * still-owed partner out of their own statement. ⛔ Never the officer's reason.
 *
 * Gold + mono on money only (§M3). ⛔ No emoji. Kit atoms throughout.
 */
export async function AgentDashboard({
  dash,
  sp,
}: {
  dash: AgentDashboardModel;
  /** ⛔ The raw params, narrowed HERE by the contract — never read directly below. */
  sp: Record<string, string | string[] | undefined>;
}) {
  const { t, locale } = await getServerT();

  /**
   * ⭐ PLAYER QUERY, TASK 4.11 — THE RECRUIT BOOK GETS ITS BAR, AND IT IS THIS COMPONENT'S LIST
   * rather than the player promo body's, because the player body cannot be reached by a live
   * viewer at all (see `lib/affiliate/recruits.ts` for the three lines that prove it).
   *
   * 🔴 THE BOOK WAS UNBOUNDED, UNSORTED, UNPAGED AND UNFILTERED. `db.user.listByRecruiter` has no
   * `take`, so an agent with three hundred recruits rendered three hundred rows — and the DAL
   * ordered them by `createdAt desc` while each row PRINTED `recruitedAt ?? createdAt`, so for an
   * existing player recruited later the dates ran out of order down the column and nothing said so.
   * The clock the list is ordered by is now the clock it shows.
   */
  const state = parseRecruitParams(sp);
  const collate = new Intl.Collator(locale).compare;
  const rows: RecruitRow[] = dash.recruits.map((r) => ({
    id: r.userId,
    maskedName: r.maskedName,
    boundAtMs: Date.parse(r.boundAt) || 0,
    paidTzs: r.paidTzs,
    pendingTzs: r.pendingTzs,
    reversedTzs: r.reversedTzs,
    settlements: r.settlements,
  }));
  const byId = new Map(dash.recruits.map((r) => [r.userId, r] as const));
  const counts = recruitCounts(rows, state).lens;
  const matched = sortRecruits(filterRecruits(rows, state), state, collate);
  // ⛔ ONE `totalCount`, shared by the bar and the pager — never recomputed.
  const totalCount = matched.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PLAYER_PER_PAGE));
  const recruitPage = Math.min(Math.max(1, parseInt(String(sp.page ?? "1"), 10) || 1), totalPages);
  const paged = matched.slice((recruitPage - 1) * PLAYER_PER_PAGE, recruitPage * PLAYER_PER_PAGE);
  const cause = recruitEmptyCause(state, totalCount, rows.length);
  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host");
  const proto = hdrs.get("x-forwarded-proto") ?? "https";
  const shareLink = host ? `${proto}://${host}/auth/register?ref=${encodeURIComponent(dash.code)}` : dash.link;
  let qrDataUrl = "";
  if (dash.active && shareLink) {
    try { qrDataUrl = await QRCode.toDataURL(shareLink, { margin: 1, width: 240, color: { dark: "#0A0E4A", light: "#FFFFFF" } }); } catch { /* card renders without the QR */ }
  }

  return (
    <PageContainer tier="form" className="space-y-5">
      <BackLink fallbackHref="/profile" label={t.common.profile} />
      <h1 className="sr-only">{t.agent.dashTitle}</h1>

      <div className="flex items-center justify-between gap-3">
        <p className="font-display text-title-md font-bold leading-none">{t.agent.dashTitle}</p>
        {dash.active ? <VerifiedAgentBadge label={t.agent.verifiedBadge} /> : <Chip variant="warning">{t.agent.dashPaused}</Chip>}
      </div>

      {!dash.active && (
        <Callout tone="warning" size="md">{t.agent.dashPausedBody}</Callout>
      )}

      {/* The terms — THEIR rate, from THEIR programme */}
      <section className="relative overflow-hidden rounded-xl border border-border-strong p-5" style={{ background: "linear-gradient(150deg, var(--bg-elevated), var(--royal-950))" }}>
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(120% 90% at 100% 0%, color-mix(in oklab, var(--gold-500) 12%, transparent), transparent 60%)" }} />
        <div className="relative">
          <p className="font-mono text-micro uppercase eyebrow font-bold text-gold-300">{t.agent.dashRate}</p>
          <p className="mt-1 font-mono text-title-lg font-bold tabular-nums text-gold-300">{fill(t.agent.dashRateValue, { pct: String(dash.commissionPct) })}</p>
          <ul className="mt-3 space-y-1.5 text-body-sm text-text-muted leading-snug list-disc pl-4">
            <li>{t.agent.dashPaidAs}</li>
            <li>{t.agent.dashNoWagering}</li>
            <li>{dash.windowMonths === 0 ? t.agent.earnLifetime : fill(t.agent.earnWindow, { months: String(dash.windowMonths) })}</li>
            <li>{dash.capPerRecruitTzs === 0 ? t.agent.earnUncapped : fillNodes(t.agent.earnCapped, { amount: <span className="amount">{formatTzs(dash.capPerRecruitTzs)}</span> })}</li>
            <li>{t.agent.earnSingleLevel}</li>
          </ul>
        </div>
      </section>

      {/* The money — gold, mono, tabular */}
      <div className="grid grid-cols-2 gap-2">
        <Stat size="3xl" labelStyle="strong" boxed="glass" tone="gold" money label={t.agent.dashPaid} value={formatNumber(dash.paidTzs)} hint="TZS" icon={<I.coins s={14} />} iconAlign="end" />
        <Stat size="3xl" labelStyle="strong" boxed="glass" tone="gold" money label={t.agent.dashThisMonth} value={formatNumber(dash.thisMonthTzs)} hint="TZS" icon={<I.percent s={14} />} iconAlign="end" />
        {dash.pendingTzs > 0 && <Stat size="xl" labelStyle="strong" boxed="glass" tone="gold" money label={t.agent.dashPending} value={formatNumber(dash.pendingTzs)} hint="TZS" />}
        {dash.reversedTzs > 0 && <Stat size="xl" labelStyle="strong" boxed="glass" tone="muted" money label={t.agent.dashReversed} value={formatNumber(dash.reversedTzs)} hint={t.agent.dashReversedHint} />}
      </div>

      {/* The share card + link — ONLY while active. A paused agent has no code to share. */}
      {dash.active && (
        <>
          <section className="relative overflow-hidden rounded-xl border p-5" style={{ background: "var(--royal-950)", borderColor: "var(--gold-700)" }}>
            <GiltCorner size={38} rotate={0} style={{ position: "absolute", top: 6, left: 6 }} />
            <GiltCorner size={38} rotate={180} style={{ position: "absolute", bottom: 6, right: 6 }} />
            <div className="relative flex items-center gap-4">
              <div className="min-w-0 flex-1">
                <FiftyMark size={38} />
                <p className="mt-3 font-display text-title-md font-bold leading-tight text-text">{t.common.youveBeenInvited}</p>
                <p className="mt-3 font-mono text-micro uppercase eyebrow font-bold text-gold-300/70">{t.agent.verifiedBadge}</p>
                {/* The code WRAPS: `50PICK-AG-XXXXXX` is 16 mono characters at 22px, wider than a
                    360 card's inner width. `break-all` keeps it readable instead of clipped. */}
                <div className="mt-1 inline-block max-w-full rounded-md border border-gold-700 px-3 py-1.5" style={{ background: "color-mix(in oklab, var(--gold-500) 10%, transparent)" }}>
                  <span className="block break-all font-mono text-title-sm font-bold tracking-wider text-gold-300">{dash.code}</span>
                </div>
              </div>
              {qrDataUrl && (
                <div className="shrink-0 rounded-lg bg-white p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrDataUrl} alt="" aria-hidden width={104} height={104} className="block" />
                </div>
              )}
            </div>
          </section>
          <div id="referral-share">
            <ReferralShare link={shareLink} shareText={t.agent.shareText} />
          </div>
        </>
      )}

      {/* How you earn — the agent's sentences, not the promo's */}
      <section className="rounded-xl glass-panel p-4">
        <p className="font-display text-title-sm font-bold leading-tight">{t.agent.dashHowTitle}</p>
        <div className="mt-3 space-y-3">
          {[t.agent.dashHow1, t.agent.dashHow2, fill(t.agent.dashHow3, { pct: String(dash.commissionPct) })].map((label, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full font-mono text-body-sm font-bold"
                style={i === 2
                  ? { background: "linear-gradient(180deg, var(--gold-400), var(--gold-600))", color: "var(--gold-950)", border: "1px solid var(--gold-700)" }
                  : { background: "color-mix(in oklab, var(--royal-500) 18%, transparent)", color: "var(--royal-200)", border: "1px solid color-mix(in oklab, var(--royal-500) 36%, transparent)" }}>
                {i + 1}
              </span>
              <p className="text-body-sm font-semibold">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Recruits — the AGENT-stamped book only */}
      <p className="font-mono text-micro uppercase eyebrow font-bold text-text-subtle">{t.agent.dashRecruits} · {dash.recruitCount}</p>
      {dash.preAgentRecruitCount > 0 && (
        <p className="text-body-sm leading-relaxed text-text-subtle">{fill(t.agent.dashPreAgent, { n: String(dash.preAgentRecruitCount) })}</p>
      )}
      {/* ⛔ THE BAR IS WITHHELD ON AN EMPTY BOOK, and only then — five pills all reading 0 above
          "no recruits yet" are five controls that cannot act (§A5). Every other empty state keeps
          it, because there the bar is the way out. */}
      {rows.length > 0 && (
        <RecruitsBar state={state} counts={counts} resultCount={totalCount} t={t} />
      )}

      {rows.length > 0 && totalCount > 0 ? (
        <>
          <div className="overflow-hidden rounded-xl glass-panel">
            {paged.map((row, i) => {
              const r = byId.get(row.id)!;
              return (
                /* ⛔ `data-row-id` — the instrumentation contract's third attribute, so
                   disjointness and no-double-counting are checkable over SETS rather than by
                   reading a word that changes with the locale. */
                <div key={r.userId} data-row-id={r.userId} className={`flex items-center gap-3 px-3 py-2 ${i < paged.length - 1 ? "border-b border-border" : ""}`}>
                  <Avatar initials={r.maskedName.slice(0, 2)} size="sm" seed={r.maskedName} />
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-body-sm font-medium truncate">{r.maskedName}</p>
                    <p className="font-mono text-body-sm text-text-subtle">{t.common.joined} {fmtDate(r.boundAt)} · {r.settlements} {t.agent.dashRecruitHint}</p>
                  </div>
                  <div className={`w-[72px] text-right font-mono text-body-sm font-semibold tabular-nums ${r.commissionTzs > 0 ? "text-gold-300" : "text-text-subtle"}`}>
                    {r.commissionTzs > 0 ? "+" + formatNumber(r.commissionTzs) : "—"}
                  </div>
                </div>
              );
            })}
          </div>
          {/* ⛔ THE BOOK IS PAGED NOW. `listByRecruiter` has no `take`, so an agent with three
              hundred recruits rendered three hundred rows into one panel. */}
          <Pagination
            total={totalCount}
            page={recruitPage}
            perPage={PLAYER_PER_PAGE}
            baseHref={buildRecruitHref(state)}
            ofLabel={t.common.of}
            prevLabel={t.common.previousPage}
            nextLabel={t.common.nextPage}
            firstLabel={t.common.firstPage}
            lastLabel={t.common.lastPage}
          />
        </>
      ) : (
        /* ⚠️ TWO CAUSES. `no-rows` is the agent with no recruits at all; `lens-empty` is an agent
           whose book simply has nothing in THIS state — and on this page an empty `reversed` pill
           is good news, not a failed filter. Reading one sentence for both would tell an agent
           with forty earning recruits that they have none. */
        <EmptyState
          kind="leaderboard"
          title={cause === "lens-empty" ? t.agent.dashLensEmpty : t.agent.dashEmpty}
          body={
            cause === "lens-empty" ? t.agent.dashLensEmptyBody
            : dash.active ? t.agent.dashEmptyBody
            : t.agent.dashPausedBody
          }
        />
      )}
    </PageContainer>
  );
}
