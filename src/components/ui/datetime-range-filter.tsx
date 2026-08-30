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
 *
 * ⭐ THE PRESETS ARE `FilterPill`s (DG-A-06, 2026-08-30), AND THIS WAS THE BIGGEST SINGLE WIN OF
 * THAT ROW. This one primitive has SEVEN admin call sites and renders 54 chips, and it used to
 * hand-roll its own capsule: `shrink-0 rounded-pill border px-3 py-1.5 font-mono text-caption
 * uppercase tracking-[0.08em]`, outlined AND filled in BOTH states, measuring 33px.
 *
 * 🔴 THE PROOF IT WAS A DEFECT WAS ON SCREEN, NOT IN AN ARGUMENT. On `/admin/ai-polls` and
 * `/admin/candidates` this 33px chip renders INSIDE the same `data-filter-rail` div as the 32px
 * dense `FilterPill`s, about ten pixels away — literally "the same control at two sizes on one
 * screen", which `test:filter-language` §6.6's own comment calls worse than either size. It
 * survived S-07 because the audit looked at the rails it had been told about.
 *
 * ⛔ `rank` IS A PROP AND MUST STAY ONE. This is a `components/ui` primitive that also serves
 * player surfaces (`PLAYER_PRESETS` is defined here); hard-coding the admin 32px rank inside it
 * would bake an admin fork into shared code. `test:filter-language` §7.3 asserts exactly that.
 */
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { DateSelect } from "@/components/ui/date-select";
import { TimeSelect } from "@/components/ui/time-select";
import { FilterPill, filterPillClass, type FilterPillRank } from "@/components/ui/filter-pill";
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
  rank = "primary",
  className,
}: {
  presetIds?: readonly string[];
  defaultPreset?: string;
  allowCustom?: boolean;
  /**
   * ⛔ THE ADMIN DENSITY IS THE CALLER'S TO ASK FOR, NEVER THIS FILE'S TO ASSUME. Every admin
   * call site passes `rank="dense"` (32px, `--h-control-xs`); the default stays the 44px player
   * floor, because a shared primitive that silently shipped a mouse-only height onto a phone
   * would be the admin fork the whole DG-A-06 row exists to refuse.
   */
  rank?: FilterPillRank;
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

  /**
   * ⭐ THE PRESET HREF, DERIVED FROM THE MUTATION `pickPreset` ALREADY PERFORMS — not invented
   * for the sake of the `<Link>`. A preset genuinely IS a navigation: it round-trips
   * `?range=<id>` exactly as the click did, so the control now states in the address bar what it
   * did, and an officer can middle-click two windows into two tabs.
   *
   * ⛔ THESE TWO MUST NEVER DIVERGE. `pickPreset` still runs (the Clear button inside the custom
   * panel calls it), so if it ever learns a new parameter this must learn it in the same edit.
   * ⚠️ `push`, not `replace` — deliberately unchanged. The rail has always pushed, and quietly
   * rewriting seven admin routes' history behaviour is not a design fix.
   */
  const hrefForPreset = (id: string) => {
    const p = new URLSearchParams(sp.toString());
    p.delete("from"); p.delete("to");
    if (id === defaultPreset) p.delete("range"); else p.set("range", id);
    p.delete("page"); // any window change resets pagination — exactly as pushParams does
    const qs = p.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center gap-1.5">
        <I.calendar s={13} className="mr-0.5 shrink-0 text-text-subtle" />
        {/* ⚠️ `semantics="tab"`, which is a CHANGE and the correct one. These chips used to
            announce `aria-pressed`, telling a screen-reader user that "7d" is a toggle they can
            un-press; exactly one window is ever in force and choosing it navigates, which is
            what the primitive documents `aria-current="page"` for. ⛔ No `count` — this rail has
            no honest number to show, and A-5 forbids inventing one. */}
        {presetIds.map((id) => (
          <FilterPill
            key={id}
            href={hrefForPreset(id)}
            label={LABELS[id] ?? id}
            on={activeId === id}
            rank={rank}
            semantics="tab"
            scroll={false}
            testId={`range:${id}`}
            onClick={() => setOpen(false)}
          />
        ))}
        {/* ⛔ CUSTOM IS NOT A NAVIGATION AND GETS NO href. It toggles the disclosure below; a
            synthesised `?range=custom&from=<today>…` would apply a window nobody chose. It wears
            `filterPillClass` so it cannot drift from the presets it sits beside, and emits
            `data-on` because the selected fill and halo live in `.kp-fchip[data-on]` (law 82). */}
        {allowCustom && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            data-on={activeId === "custom" || undefined}
            className={filterPillClass({ rank, on: activeId === "custom" })}
          >
            {t.common.rangeCustom}
          </button>
        )}
      </div>

      {allowCustom && open && (
        <div className="rounded-lg border border-border bg-bg-inset p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 font-mono text-micro uppercase eyebrow text-text-faint">{t.common.rangeFrom}</div>
              <div className="flex items-center gap-1.5">
                <div className="min-w-0 flex-1"><DateSelect size="sm" max={todayIso} value={fromDate} onChange={setFromDate} /></div>
                <TimeSelect size="sm" value={fromTime} onChange={setFromTime} aria-label={`${t.common.rangeFrom} ${t.common.time24}`} />
              </div>
            </div>
            <div>
              <div className="mb-1 font-mono text-micro uppercase eyebrow text-text-faint">{t.common.rangeTo}</div>
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
