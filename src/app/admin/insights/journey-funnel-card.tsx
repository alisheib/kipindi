/**
 * THE JOURNEY FUNNEL PANEL — the Vodacom plan's four measures on `/admin/insights` (S3b, `docs/VODACOM-PLAN.md` §3.10
 * and §0f). A server component with its own read, so a failed read says so here and never takes the page down.
 *
 * The old journey is counted from 2026-10-01 so the new one can be compared with at least 14 days of it; the new
 * journey's column fills from its launch. Every figure carries its two halves ("12 of 40"); a ratio whose counters
 * disagree is held at 100% and marked, never printed as a conversion above the whole (E-103).
 */
import Link from "next/link";
import { AdminCard } from "@/components/admin/admin-shell";
import { ScrollX } from "@/components/ui/scroll-x";
import { formatNumber } from "@/lib/utils";
import { journeyFunnelReport, JOURNEY_REPORT_WINDOWS, type JourneyFunnelReport } from "@/lib/server/journey-funnel-report";
import type { Measure, MeasureKey } from "@/lib/journey/funnel-measures";

const LABEL: Record<MeasureKey, { title: string; how: string }> = {
  homeToSheet: { title: "Home → sheet", how: "sheet opens from the home page ÷ home-page views" },
  sheetToBet: { title: "Sheet → bet", how: "bets placed from a sheet ÷ sheet opens" },
  shortToDeposit: { title: "Short → deposit", how: "confirmed deposits started from a not-enough-money notice ÷ notices shown" },
  depositToBet: { title: "Deposit → bet (30 min)", how: "confirmed deposits followed by a bet within 30 minutes ÷ confirmed deposits" },
};

function Cell({ m }: { m: Measure | undefined }) {
  if (!m || m.pct === null) return <span className="text-text-subtle">—</span>;
  return (
    <span className="inline-flex flex-col">
      <span className="font-mono tabular-nums text-text">{m.pct}%{m.overCounted ? " *" : ""}</span>
      <span className="font-mono tabular-nums text-body-sm text-text-subtle">{formatNumber(m.numerator)} of {formatNumber(m.denominator)}</span>
    </span>
  );
}

function minutes(n: number | null): string {
  if (n === null) return "—";
  if (n < 60) return `${Math.round(n)} min`;
  if (n < 1440) return `${Math.floor(n / 60)} h ${Math.round(n % 60)} min`;
  return `${Math.floor(n / 1440)} d ${Math.floor((n % 1440) / 60)} h`;
}

const href = (days: number, campaign: string | null) =>
  `/admin/insights?jf=${days}${campaign ? `&jfc=${encodeURIComponent(campaign)}` : ""}` as never;

export async function JourneyFunnelCard({ days, campaign }: { days: number; campaign: string | null }) {
  const r: JourneyFunnelReport | null = await journeyFunnelReport({ days, campaign }).catch(() => null);
  const windows = (
    <span className="flex flex-wrap gap-2">
      {JOURNEY_REPORT_WINDOWS.map((d) => (
        <Link key={d} href={href(d, campaign)} aria-current={r?.days === d ? "page" : undefined}
          className={`font-mono text-body-sm tabular-nums underline-offset-2 hover:underline ${r?.days === d ? "text-text" : "text-text-subtle"}`}>
          {d} days
        </Link>
      ))}
    </span>
  );
  if (!r) {
    return (
      <AdminCard title="Journey funnel" sw="Safari ya mchezaji" action={windows}>
        <p className="text-body-sm text-danger-fg">The journey funnel could not be read just now. Nothing else on this page depends on it.</p>
      </AdminCard>
    );
  }
  const keys: MeasureKey[] = ["homeToSheet", "sheetToBet", "shortToDeposit"];
  const over = [...r.measures.old, ...r.measures.new].some((m) => m.overCounted);
  const depositToBet = r.measures.old.find((m) => m.key === "depositToBet");
  return (
    <AdminCard title="Journey funnel" sw="Safari ya mchezaji" action={windows}>
      <p className="text-body-sm leading-relaxed text-text-subtle">
        The Vodacom plan&apos;s measures, {r.fromDay} to {r.toDay} (East Africa days). The old journey is counted from
        2026-10-01 so the new one can be compared with at least 14 days of it; the new journey&apos;s column fills from its
        launch. Staff, previews, automation and house stakes are not counted.
      </p>
      {r.campaigns.length > 0 && (
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-text-subtle">
          <span>Campaign:</span>
          <Link href={href(r.days, null)} className={`underline-offset-2 hover:underline ${r.campaign ? "" : "text-text"}`}>All</Link>
          {r.campaigns.map((c) => (
            <Link key={c} href={href(r.days, c)} className={`font-mono underline-offset-2 hover:underline ${r.campaign === c ? "text-text" : ""}`}>{c}</Link>
          ))}
        </p>
      )}
      <ScrollX label="The journey funnel, old and new journey side by side" className="mt-3">
        <table className="admin-tbl min-w-[560px]">
          <thead>
            <tr>
              <th className="text-left">Measure</th>
              <th className="text-left">Old journey{r.liveVariant === "old" ? " · live" : ""}</th>
              <th className="text-left">New journey{r.liveVariant === "new" ? " · live" : ""}</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k} className="align-top">
                <td>
                  <span className="block text-text">{LABEL[k].title}</span>
                  <span className="block text-body-sm text-text-subtle">{LABEL[k].how}</span>
                </td>
                <td><Cell m={r.measures.old.find((m) => m.key === k)} /></td>
                <td><Cell m={r.measures.new.find((m) => m.key === k)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollX>
      <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-body-sm text-text-subtle">{LABEL.depositToBet.title} · all players</dt>
          <dd className="mt-0.5"><Cell m={depositToBet} /></dd>
        </div>
        <div>
          <dt className="text-body-sm text-text-subtle">Time to first bet · median, players who joined in the window</dt>
          <dd className="mt-0.5 font-mono tabular-nums text-text">
            {minutes(r.timeToFirstBet.medianMinutes)}
            <span className="block text-body-sm text-text-subtle">{formatNumber(r.timeToFirstBet.players)} players</span>
          </dd>
        </div>
      </dl>
      <p className="mt-3 border-t border-border/60 pt-3 text-body-sm leading-relaxed text-text-subtle">
        Each measure is a pair of counts in which the first is part of the second. Home-page views count everyone who
        opened the page; they sit in the column of the journey players are shown now.
        {r.campaign ? " A campaign filter applies to the counted steps only; the two row-based figures are for everyone." : ""}
        {over ? " * Two counters disagreed (one of the pair lost a count); the share is held at 100%." : ""}
      </p>
    </AdminCard>
  );
}
