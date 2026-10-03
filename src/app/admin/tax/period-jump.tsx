"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Select } from "@/components/ui/select";
import { DateSelect } from "@/components/ui/date-select";
import { TimeSelect } from "@/components/ui/time-select";
import { Button } from "@/components/ui/button";
import {
  CUSTOM_MAX_DAYS,
  GENESIS_DAY,
  customPeriod,
  dayPeriod,
  isDayKey,
  monthPeriod,
  taxPageHref,
  toEatLocal,
  weekPeriod,
  type PeriodKind,
  type ProductFilter,
} from "@/lib/tax-report";

/**
 * The "jump to" control beside the period arrows — the right picker for the kind on screen:
 * a month list, a day (any day of the wanted week), a day, or a custom start and end with times.
 * ⭐ Every destination is built by `taxPageHref`, the same builder the page's own links and the
 * export query use, so the picker cannot name a period the page would read differently.
 * ⛔ The kit's own controls (`Select`, `DateSelect`, `TimeSelect`) — never a native date input.
 * ⛔ A typed date NAVIGATES ONLY ON "Go" (WCAG 3.2.2): a date being typed passes through valid dates on
 * the way (day "1" before "15"), and moving on each of them recomputed the report per keystroke.
 * The page keys this component by the period, so its state is rebuilt after Back/Forward.
 * Navigation only: it changes what is SHOWN, so it needs no act gate.
 */
export function PeriodJump({ kind, periodKey, startMs, endMs, product, todayKey, monthKeys }: {
  kind: PeriodKind;
  periodKey: string;
  startMs: number;
  endMs: number;
  product: ProductFilter;
  /** Today's EAT day — the latest day a picker offers. */
  todayKey: string;
  /** Every month from January 2026 to this one, newest first (`YYYY-MM`). */
  monthKeys: string[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const go = (href: string) => start(() => router.push(href as Route));
  const [day, setDay] = useState(kind === "week" || kind === "day" ? periodKey : todayKey);

  if (kind === "month") {
    return (
      <div className="w-[200px] max-w-full" aria-busy={pending || undefined}>
        {/* A choice from a list is one deliberate act, so a month navigates on selection. */}
        <Select
          size="xs"
          ariaLabel="Jump to month"
          value={periodKey}
          onChange={(v) => { const p = monthPeriod(v); if (p) go(taxPageHref(p, product)); }}
          options={monthKeys.map((k) => ({ value: k, label: monthPeriod(k)!.label }))}
        />
      </div>
    );
  }
  if (kind === "week" || kind === "day") {
    const target = isDayKey(day) ? (kind === "week" ? weekPeriod(day) : dayPeriod(day)) : null;
    return (
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label={kind === "week" ? "Jump to the week of a day" : "Jump to a day"} aria-busy={pending || undefined}>
        <span className="text-body-sm text-text-tertiary">{kind === "week" ? "Week of" : "Day"}</span>
        {/* The date and its Go wrap as ONE unit: at 360px Go alone dropped to the next line, away from its date. */}
        <div className="flex items-center gap-2">
        <div className="w-[176px]">
          <DateSelect size="sm" min={GENESIS_DAY} max={todayKey} value={day} onChange={setDay} />
        </div>
        <Button type="button" variant="ghost" size="xs" className="rounded-pill" loading={pending} disabled={!target || target.key === periodKey} onClick={() => target && go(taxPageHref(target, product))} data-testid="tax-jump-go">
          <span className="font-mono text-micro font-bold uppercase eyebrow">Go</span>
        </Button>
        </div>
      </div>
    );
  }
  return <CustomRange startMs={startMs} endMs={endMs} product={product} todayKey={todayKey} onGo={go} pending={pending} />;
}

function CustomRange({ startMs, endMs, product, todayKey, onGo, pending }: {
  startMs: number; endMs: number; product: ProductFilter; todayKey: string; onGo: (href: string) => void; pending: boolean;
}) {
  const from0 = toEatLocal(startMs);
  const to0 = toEatLocal(endMs);
  const [fromDay, setFromDay] = useState(from0.slice(0, 10));
  const [fromTime, setFromTime] = useState(from0.slice(11, 16));
  const [toDay, setToDay] = useState(to0.slice(0, 10));
  const [toTime, setToTime] = useState(to0.slice(11, 16));
  const [error, setError] = useState<string | null>(null);

  const apply = () => {
    const p = customPeriod(`${fromDay}T${fromTime}`, `${toDay}T${toTime}`);
    if (!p) {
      setError(`Choose a start before the end, no more than ${CUSTOM_MAX_DAYS} days apart.`);
      return;
    }
    setError(null);
    onGo(taxPageHref(p, product));
  };

  return (
    <div className="flex flex-col gap-2" aria-busy={pending || undefined}>
      {/* A label column beside a wrapping field group, every box aligned to the TOP: the kit TimeSelect keeps a line under
          its box for its echo, so centring the row set each time box 9px above its date (measured 2026-10-03); and on a
          phone the time now wraps under its date, not under the label. */}
      <div className="grid grid-cols-[40px_minmax(0,1fr)] items-start gap-x-2 gap-y-2">
        <span className="flex h-[36px] items-center text-body-sm text-text-tertiary" aria-hidden="true">From</span>
        <div className="flex flex-wrap items-start gap-2" role="group" aria-label="Start date and time (East Africa Time)">
          <div className="w-[176px]"><DateSelect size="sm" min={GENESIS_DAY} max={todayKey} value={fromDay} onChange={setFromDay} /></div>
          <TimeSelect size="sm" value={fromTime} onChange={setFromTime} aria-label="Start time" />
        </div>
        <span className="flex h-[36px] items-center text-body-sm text-text-tertiary" aria-hidden="true">To</span>
        <div className="flex flex-wrap items-start gap-2" role="group" aria-label="End date and time (East Africa Time)">
          <div className="w-[176px]"><DateSelect size="sm" min={GENESIS_DAY} value={toDay} onChange={setToDay} /></div>
          <TimeSelect size="sm" value={toTime} onChange={setToTime} aria-label="End time" />
          <div className="flex h-[36px] items-center">
            <Button type="button" variant="primary" size="xs" className="rounded-pill" loading={pending} onClick={apply} data-testid="tax-custom-apply">
              <span className="font-mono text-micro font-bold uppercase eyebrow">Apply</span>
            </Button>
          </div>
        </div>
      </div>
      {error && <p role="alert" className="text-body-sm text-danger-fg">{error}</p>}
      <p className="text-body-sm text-text-tertiary">East Africa Time. The end is exclusive: 00:00 on a day means up to the end of the day before.</p>
    </div>
  );
}
