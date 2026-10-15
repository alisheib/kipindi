/** S13's measures panel. Figures, statuses and words all come from the shared view. */
import { AdminCard } from "@/components/admin/admin-shell";
import { ScrollX } from "@/components/ui/scroll-x";
import { cellMarks, countText, dueText, halvesText, minutesText, REFERENCE_ROW } from "@/lib/journey/measures";
import { journeyMeasuresView, type JourneyMeasuresView, type MeasureRow, type ReferenceCell } from "@/lib/server/journey-measures";
import { MeasuresRail } from "./measures-rail";
import { LaunchWatchCard } from "./launch-watch-card";
import { MeasuresExportButtons } from "./measures-export-buttons";
import { getAuditByActionsDurable, type AuditEntry } from "@/lib/server/audit";

const AFTER = [7, 14, 28] as const;

function MeasureCell({ row, where }: { row: MeasureRow; where: "before" | 7 | 14 | 28 }) {
  const c = where === "before" ? row.before : row.after[where];
  const change = where === "before" ? null : row.changes[where];
  const median = row.median && (where === "before" ? row.median.before : row.median.after[where]);
  return <span className="block min-w-0" data-status={c.status}>
    <span className="block font-mono tabular-nums text-text">{c.text}</span>
    {halvesText(c) && <span className="block font-mono text-body-sm tabular-nums text-text-subtle">{halvesText(c)}</span>}
    {change && <span className="block font-mono text-body-sm tabular-nums text-text-subtle">{change.text} vs before</span>}
    {row.median && c.status === "figure" && <span className="block text-body-sm text-text-subtle">Median: {minutesText(median ?? null)}</span>}
    {c.note && <span className="block text-body-sm text-text-subtle">{c.note}</span>}
    {cellMarks(c).map((mark) => <span key={mark} className="block text-body-sm text-text-subtle">{mark}</span>)}
  </span>;
}

function Reference({ cell }: { cell: ReferenceCell }) {
  if (cell.status !== "counts") return <span className="text-text-subtle">{cell.note ?? "Not launched"}</span>;
  return <span className="font-mono tabular-nums text-text-subtle">{countText(cell.deposits as number)} deposits · {countText(cell.notices as number)} Up &amp; Down notices</span>;
}

function MeasuresCard({ view, downloads }: { view: JourneyMeasuresView; downloads: { entries: AuditEntry[]; total: number; truncated: boolean } | null }) {
  const five = view.rows.filter((r) => r.def.no !== "4b");
  const comparison = view.rows.find((r) => r.def.no === "4b");
  const launchLine = view.launch.state === "unreadable"
    ? "The launch record could not be read. Figures are held until it can."
    : view.launch.state === "not-launched"
      ? "Not launched · before is the baseline so far; after starts with the first full day following launch."
      : `Launched ${view.launch.launchDay} EAT · current journey: ${view.launch.current === "ACTIVE" ? "active" : "paused"}.`;
  return <AdminCard title="Simplified Journey measures" sw="Vipimo vya safari rahisi">
    <p className={view.launch.state === "unreadable" ? "text-body-sm text-warning-fg" : "text-body-sm text-text-subtle"}>{launchLine}</p>
    <p className="mt-1 text-body-sm text-text-subtle">Before: 14 full East Africa days. After: the first 7, 14 and 28 full active days. The launch day itself counts on neither side.</p>
    <MeasuresRail campaigns={view.campaigns.seen} selected={view.campaign} />
    <ul className="mt-3 space-y-3 sm:hidden" data-testid="journey-measures-mobile">{five.map((row) =>
      <li key={row.def.key} className="rounded-lg border border-border/60 p-3">
        <p className="font-semibold text-text">{row.def.no}. {row.def.name}</p>
        <p className="text-body-sm text-text-subtle">{row.def.nameSw}</p>
        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2">
          <div><dt className="text-body-sm text-text-subtle">Before · 14 days</dt><dd><MeasureCell row={row} where="before" /></dd></div>
          {AFTER.map((n) => <div key={n}><dt className="text-body-sm text-text-subtle">After · {n} days</dt><dd><MeasureCell row={row} where={n} /></dd></div>)}
        </dl>
      </li>)}</ul>
    <div className="mt-3 hidden sm:block"><ScrollX label="Before and after Simplified Journey measures">
      <table className="admin-tbl min-w-[880px]"><thead><tr><th>Measure</th><th>Before · 14 days</th>{AFTER.map((n) => <th key={n}>After · {n} days</th>)}</tr></thead>
        <tbody>{five.map((row) => <tr key={row.def.key} className="align-top"><td><span className="block font-semibold text-text">{row.def.no}. {row.def.name}</span><span className="block text-body-sm text-text-subtle">{row.def.nameSw}</span></td><td><MeasureCell row={row} where="before" /></td>{AFTER.map((n) => <td key={n}><MeasureCell row={row} where={n} /></td>)}</tr>)}</tbody>
      </table>
    </ScrollX></div>
    {comparison && <p className="mt-3 text-body-sm text-text-subtle">Comparison (4b), deposit → any bet in 30 minutes: before {comparison.before.text}; after 7 days {comparison.after[7].text}. This is separate from the agency&apos;s five measures.</p>}
    <div className="mt-3 border-t border-border/60 pt-3">
      <p className="font-semibold text-text">Reference · {REFERENCE_ROW.name}</p><p className="text-body-sm text-text-subtle">Counts only; these deposits and notices are not a nested pair.</p>
      <div className="mt-1 grid grid-cols-1 gap-1 text-body-sm sm:grid-cols-2"><p>Before: <Reference cell={view.reference.before} /></p>{AFTER.map((n) => <p key={n}>After {n}: <Reference cell={view.reference.after[n]} /></p>)}</div>
    </div>
    {view.campaigns.table.length > 0 && <div className="mt-4 border-t border-border/60 pt-3">
      <h3 className="font-semibold text-text">By campaign <span className="font-normal text-text-subtle">· Kwa kampeni</span></h3>
      <p className="text-body-sm text-text-subtle">Only bet sheet → bet placed has both halves tagged. Landing visits are context, not its denominator.</p>
      <ScrollX label="Journey measure by campaign"><table className="admin-tbl min-w-[640px]"><thead><tr><th>Campaign</th><th>Sheet opens</th><th>Bets</th><th>Share</th><th>Landing visits</th></tr></thead>
        <tbody>{view.campaigns.table.map((c) => <tr key={c.campaign}><td className="font-mono text-text">{c.campaign}{c.visitOnly ? " · visit only" : ""}</td><td className="font-mono tabular-nums">{c.sheetOpens === null ? "Could not be read" : countText(c.sheetOpens)}</td><td className="font-mono tabular-nums">{c.bets === null ? "Could not be read" : countText(c.bets)}</td><td className="font-mono tabular-nums">{c.sheetToBet.text}{c.sheetToBet.note ? ` · ${c.sheetToBet.note}` : ""}</td><td className="font-mono tabular-nums">{c.landingVisits === null ? "Could not be read" : countText(c.landingVisits)}</td></tr>)}</tbody>
      </table></ScrollX>
    </div>}
    <div className="mt-4 border-t border-border/60 pt-3"><h3 className="font-semibold text-text">Agency report <span className="font-normal text-text-subtle">· Ripoti ya wakala</span></h3>
      <p className="text-body-sm text-text-subtle">Due now: {dueText(view.schedule.due)}. {view.schedule.next ? `Next due: ${view.schedule.next.kind === "week" ? view.schedule.next.monday : view.schedule.next.dueDay} EAT.` : ""}</p>
      <p className="text-body-sm text-text-subtle">Download the due report and send it to the agency yourself; the platform sends no file automatically.</p>
      <MeasuresExportButtons title={dueText(view.schedule.due)} query={
        (view.schedule.due.kind === "baseline" ? "period=baseline" : view.schedule.due.kind === "week"
          ? `period=week&week=${view.schedule.due.monday}` : `period=month&month=${view.schedule.due.month}`)
        + (view.campaign ? `&campaign=${encodeURIComponent(view.campaign)}` : "")
      } />
      {downloads === null ? <p className="mt-2 text-body-sm text-warning-fg">Download history could not be read.</p>
        : downloads.entries.length === 0 ? <p className="mt-2 text-body-sm text-text-subtle">No agency report has been downloaded yet.</p>
          : <div className="mt-2"><p className="text-body-sm text-text-subtle">Recent downloads · {downloads.total} recorded</p>
            <ul className="space-y-1">{downloads.entries.map((entry) => <li key={entry.id} className="font-mono text-body-sm text-text-subtle">
              {new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Dar_es_Salaam", dateStyle: "medium", timeStyle: "short" }).format(new Date(entry.createdAt))} EAT · {String(entry.payload?.format ?? "file").toUpperCase()} · {String(entry.payload?.reference ?? entry.id)}
            </li>)}</ul>
            {downloads.truncated && <p className="text-body-sm text-text-subtle">Only the latest {downloads.entries.length} of {downloads.total} downloads are shown.</p>}
          </div>}
    </div>
    <details className="mt-4 border-t border-border/60 pt-3"><summary className="cursor-pointer text-body-sm font-semibold text-text">How each measure is counted · Jinsi vipimo vinavyohesabiwa</summary><div className="mt-3 space-y-3">
      {view.rows.map(({ def }) => <div key={def.key} className="rounded-lg border border-border/60 p-3"><p className="font-semibold text-text">{def.no}. {def.name} <span className="font-normal text-text-subtle">· {def.nameSw}</span></p><p className="text-body-sm text-text-subtle">Unit: {def.unit}</p><p className="text-body-sm text-text-subtle">First count: {def.numerator.text}</p><p className="text-body-sm text-text-subtle">Whole: {def.denominator.text}</p>{def.notes.map((note) => <p key={note} className="text-body-sm text-text-subtle">{note}</p>)}</div>)}
      <div className="rounded-lg border border-border/60 p-3"><p className="font-semibold text-text">Reference. {REFERENCE_ROW.name} <span className="font-normal text-text-subtle">· {REFERENCE_ROW.nameSw}</span></p><p className="text-body-sm text-text-subtle">{REFERENCE_ROW.text}</p></div>
      {view.definitions.notes.map((note) => <p key={note} className="text-body-sm text-text-subtle">{note}</p>)}
    </div></details>
  </AdminCard>;
}

export async function JourneyMeasuresArea({ campaign, includeHarm }: { campaign: string | null; includeHarm: boolean }) {
  const [view, downloads] = await Promise.all([
    journeyMeasuresView({ campaign, includeHarm }).catch(() => null),
    getAuditByActionsDurable(["journey_measures.exported"], { category: "ADMIN", limit: 8 }).catch(() => null),
  ]);
  if (!view) return <AdminCard title="Simplified Journey measures" sw="Vipimo vya safari rahisi"><p className="text-body-sm text-warning-fg">The measures could not be read. Refresh to try again.</p></AdminCard>;
  return <><MeasuresCard view={view} downloads={downloads} /><LaunchWatchCard watch={view.watch} includeHarm={includeHarm} /></>;
}
