/** S15's display-only launch watch. Harm rows are only passed through a compliance VIEW gate. */
import { AdminCard } from "@/components/admin/admin-shell";
import { ScrollX } from "@/components/ui/scroll-x";
import { countText, dailyMeanText, percentText } from "@/lib/journey/measures";
import type { LaunchWatch } from "@/lib/server/journey-measures";

const pct = (share: number | null) => share === null ? "Could not be read" : percentText(Math.round(share * 1000));
const n = (value: number | null) => value === null ? "Could not be read" : countText(value);

export function LaunchWatchCard({ watch, includeHarm }: { watch: LaunchWatch; includeHarm: boolean }) {
  const triggered = watch.betsBelowLine?.below || watch.confirmTrailing?.below;
  return <AdminCard title="Launch watch" sw="Uangalizi wa uzinduzi">
    <p className="text-body-sm text-text-subtle">Display only. These lines do not alert, switch or decide the rollout.</p>
    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="rounded-lg border border-border/60 p-3"><p className="text-body-sm text-text-subtle">Question bets · 70% of the before mean</p><p className="font-mono tabular-nums text-text">{watch.lines.questionBets === null ? "Baseline unavailable" : watch.lines.questionBets.toFixed(1)} per day</p><p className="text-body-sm text-text-subtle">Three full active days below: {watch.betsBelowLine === null ? "Not enough full days" : watch.betsBelowLine.below ? "Yes" : "No"}</p></div>
      <div className="rounded-lg border border-border/60 p-3"><p className="text-body-sm text-text-subtle">Deposit confirmation · 80% of the before rate</p><p className="font-mono tabular-nums text-text">{pct(watch.lines.confirmRate)}</p><p className="text-body-sm text-text-subtle">Trailing three full active days: {watch.confirmTrailing === null ? "Not enough full days" : pct(watch.confirmTrailing.rate)}{watch.confirmTrailing && ` · below line: ${watch.confirmTrailing.below ? "Yes" : "No"}`}</p></div>
    </div>
    {triggered && <p className="mt-3 rounded-lg border border-warning-border bg-warning-bg p-3 text-body-sm text-warning-fg">A launch watch line is crossed. Review the full counts and the rollout decision with the owner.</p>}
    <div className="mt-3"><ScrollX label="Launch watch by full East Africa day"><table className="admin-tbl min-w-[620px]"><thead><tr><th>Day · EAT</th><th>Question bets</th><th>All bets</th><th>Confirmed</th><th>Failed</th><th>Undecided</th><th>Journey</th></tr></thead><tbody>{watch.days.map((day) => <tr key={day.day}><td className="font-mono">{day.day}</td><td className="font-mono tabular-nums">{n(day.questionBets)}</td><td className="font-mono tabular-nums">{n(day.allBets)}</td><td className="font-mono tabular-nums">{n(day.confirmed)}</td><td className="font-mono tabular-nums">{n(day.failed)}</td><td className="font-mono tabular-nums">{n(day.undecided)}</td><td>{day.active ? "Active all day" : "Skipped"}</td></tr>)}</tbody></table></ScrollX></div>
    {includeHarm && watch.harm && <div className="mt-4 border-t border-border/60 pt-3"><h3 className="font-semibold text-text">Player safety markers <span className="font-normal text-text-subtle">· Viashiria vya usalama</span></h3>
      {/* ⭐ MASWALI-BUILD S6 · OD-22 — once a PUBLIC Millionea week has opened, the markers are reported twice: every player,
          then players without a ticket, the series the bounds are judged on. Before that (the private drive included) the
          two are one and read as before. */}
      {watch.harm.withoutTicket && <p className="text-body-sm font-semibold text-text">All players <span className="font-normal text-text-subtle">· Wachezaji wote</span></p>}
      <p className="text-body-sm text-text-subtle">Baseline: {watch.harm.before.daysCounted} counted days; rapid deposits {dailyMeanText(watch.harm.before.rapidDeposit)}, top-ups after betting {dailyMeanText(watch.harm.before.chasingLosses)} per day on average.</p>
      {!watch.harm.readable && <p className="text-body-sm text-warning-fg">The daily marker record could not be read.</p>}
      {watch.harm.days.map(({ day, counted }) => <p key={day} className="font-mono text-body-sm tabular-nums text-text-subtle">{day}: {counted && "rapidDeposit" in counted ? `${n(counted.rapidDeposit)} rapid deposits · ${n(counted.chasingLosses)} top-ups after betting` : "Not counted"}</p>)}
      {watch.harm.withoutTicket && <div className="mt-3">
        <p className="text-body-sm font-semibold text-text">Players without a Millionea ticket <span className="font-normal text-text-subtle">· Wachezaji wasio na tiketi ya Millionea</span></p>
        <p className="text-body-sm text-text-subtle">The seven-day bounds are judged on these counts. Baseline: {watch.harm.withoutTicket.before.daysCounted} counted days; rapid deposits {dailyMeanText(watch.harm.withoutTicket.before.rapidDeposit)}, top-ups after betting {dailyMeanText(watch.harm.withoutTicket.before.chasingLosses)} per day on average.</p>
        {!watch.harm.withoutTicket.readable && <p className="text-body-sm text-warning-fg">When Millionea opened could not be read, so only a day that carries its own count is shown.</p>}
        {watch.harm.withoutTicket.days.map(({ day, counts }) => <p key={day} className="font-mono text-body-sm tabular-nums text-text-subtle">{day}: {counts ? `${n(counts.rapidDeposit)} rapid deposits · ${n(counts.chasingLosses)} top-ups after betting` : "Not counted"}</p>)}
      </div>}
      {watch.bounds && <p className="mt-2 text-body-sm text-text-subtle">Seven-day bounds: {watch.bounds.verdict.replaceAll("-", " ")} · {watch.bounds.reason}</p>}
    </div>}
  </AdminCard>;
}
