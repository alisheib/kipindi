"use client";

/**
 * DateTimeRangeFilter — the ONE date+hour+minute window filter for the whole platform.
 *
 * URL-driven (round-trips `?range=<preset>` or `?range=custom&from=<iso>&to=<iso>`), so a
 * filtered view is shareable and survives refresh, and the server reads the SAME window
 * via `resolveRange` (lib/server/date-range.ts). Presets are pill chips; "Custom" reveals
 * start/end built from the kit `DateSelect` (date) + `TimeSelect` (hour:minute). Custom
 * from/to are EAT wall-clock strings ("YYYY-MM-DDTHH:MM") — the resolver interprets them
 * as East Africa Time, matching the rest of the platform.
 *
 * Modes: pass `presetIds` for the chip set (admin/finance get the full precise set;
 * player surfaces get a compact set) — both always offer Custom.
 */
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { DateSelect } from "@/components/ui/date-select";
import { TimeSelect } from "@/components/ui/time-select";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

/** Full precise set for admin / finance / reports / transactions / analytics / logs. */
export const FULL_PRESETS = ["1h", "6h", "24h", "today", "yesterday", "7d", "30d", "mtd"] as const;
/** Compact set for player-facing surfaces (still with Custom). */
export const PLAYER_PRESETS = ["today", "yesterday", "7d", "30d", "all"] as const;

function splitIso(s: string | null): { date: string; time: string } {
  if (!s) return { date: "", time: "" };
  const [d, t] = s.split("T");
  return { date: d ?? "", time: (t ?? "").slice(0, 5) };
}

export function DateTimeRangeFilter({
  presetIds = FULL_PRESETS as unknown as string[],
  defaultPreset = "7d",
  allowCustom = true,
  className,
}: {
  presetIds?: readonly string[];
  defaultPreset?: string;
  allowCustom?: boolean;
  className?: string;
}) {
  const { t } = useT();
  const pathname = usePathname();
  const router = useRouter();
  const sp = useSearchParams();

  const LABELS: Record<string, string> = {
    "1h": t.common.rangeLastHour, "6h": t.common.range6h, "24h": t.common.range24h,
    today: t.common.rangeToday, yesterday: t.common.rangeYesterday,
    "7d": t.common.range7d, "30d": t.common.range30d, "28d": t.common.range28d,
    mtd: t.common.rangeMtd, qtd: t.common.rangeQtd, all: t.common.rangeAll,
  };

  const urlFrom = sp.get("from");
  const urlTo = sp.get("to");
  const isCustomActive = sp.get("range") === "custom" || (!!urlFrom || !!urlTo);
  const activeId = isCustomActive ? "custom" : (sp.get("range") ?? defaultPreset);

  const [open, setOpen] = useState(isCustomActive);
  // Custom field state — seeded from the URL, else sensible whole-day defaults.
  const initFrom = splitIso(urlFrom);
  const initTo = splitIso(urlTo);
  const [fromDate, setFromDate] = useState(initFrom.date);
  const [fromTime, setFromTime] = useState(initFrom.time || "00:00");
  const [toDate, setToDate] = useState(initTo.date);
  const [toTime, setToTime] = useState(initTo.time || "23:59");

  const todayIso = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const pushParams = (mut: (p: URLSearchParams) => void) => {
    const p = new URLSearchParams(sp.toString());
    mut(p);
    p.delete("page"); // any window change resets pagination
    const qs = p.toString();
    router.push((qs ? `${pathname}?${qs}` : pathname) as never, { scroll: false });
  };

  const pickPreset = (id: string) => {
    setOpen(false);
    pushParams((p) => {
      p.delete("from"); p.delete("to");
      if (id === defaultPreset) p.delete("range"); else p.set("range", id);
    });
  };

  const customValid = !!fromDate && !!toDate;
  const applyCustom = () => {
    if (!customValid) return;
    pushParams((p) => {
      p.set("range", "custom");
      p.set("from", `${fromDate}T${fromTime || "00:00"}`);
      p.set("to", `${toDate}T${toTime || "23:59"}`);
    });
  };

  const chip = (id: string, label: string, active: boolean, onClick: () => void) => (
    <button
      key={id} type="button" onClick={onClick} aria-pressed={active}
      className={cn(
        "shrink-0 rounded-pill border px-3 py-1.5 font-mono text-caption uppercase tracking-[0.08em] transition-colors admin-focus",
        active ? "border-brand-500 bg-brand-500/10 text-brand-300 font-bold" : "border-border bg-bg-overlay text-text-muted hover:border-text-subtle",
      )}
    >
      {label}
    </button>
  );

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center gap-1.5">
        <I.calendar s={13} className="mr-0.5 shrink-0 text-text-subtle" />
        {presetIds.map((id) => chip(id, LABELS[id] ?? id, activeId === id, () => pickPreset(id)))}
        {allowCustom && chip("custom", t.common.rangeCustom, activeId === "custom", () => setOpen((v) => !v))}
      </div>

      {allowCustom && open && (
        <div className="rounded-lg border border-border bg-bg-inset p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 font-mono text-micro uppercase tracking-[0.12em] text-text-faint">{t.common.rangeFrom}</div>
              <div className="flex items-center gap-1.5">
                <div className="min-w-0 flex-1"><DateSelect size="sm" max={todayIso} value={fromDate} onChange={setFromDate} /></div>
                <TimeSelect size="sm" value={fromTime} onChange={setFromTime} aria-label={`${t.common.rangeFrom} ${t.common.time24}`} />
              </div>
            </div>
            <div>
              <div className="mb-1 font-mono text-micro uppercase tracking-[0.12em] text-text-faint">{t.common.rangeTo}</div>
              <div className="flex items-center gap-1.5">
                <div className="min-w-0 flex-1"><DateSelect size="sm" max={todayIso} value={toDate} onChange={setToDate} /></div>
                <TimeSelect size="sm" value={toTime} onChange={setToTime} aria-label={`${t.common.rangeTo} ${t.common.time24}`} />
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-end gap-2">
            <button type="button" onClick={() => pickPreset(defaultPreset)} className="btn btn-ghost btn-sm btn-pill admin-focus">
              {t.common.rangeClear}
            </button>
            <button type="button" onClick={applyCustom} disabled={!customValid} className="btn btn-primary btn-sm btn-pill admin-focus">
              {t.common.rangeApply}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
