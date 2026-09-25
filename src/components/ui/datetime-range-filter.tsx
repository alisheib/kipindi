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
import { eatDayKey } from "@/lib/eat-day";
import { useT } from "@/lib/i18n";

/**
 * ⭐ THE PRESET IDS MOVED TO `lib/query/windows.ts` ON 2026-09-07 AND ARE RE-EXPORTED HERE, so
 * every existing import keeps working. Nothing about them changed. What changed is who needs
 * them: the player-query contracts are pure server-rendered modules, and importing a VALUE out of
 * a `"use client"` file drags a client module into the server graph — the runtime failure
 * `CLAUDE.md` records, which a typechecker and a green build both miss.
 * ⚠️ `test:filter-language` §7.3's prose still says these "live here". They are still exported
 * here and its assertions read this file's `rank` handling, which is untouched.
 */
export { FULL_PRESETS, PLAYER_PRESETS } from "@/lib/query/windows";
import { FULL_PRESETS as FULL_PRESET_IDS } from "@/lib/query/windows";

function splitIso(s: string | null): { date: string; time: string } {
  if (!s) return { date: "", time: "" };
  const [d, t] = s.split("T");
  return { date: d ?? "", time: (t ?? "").slice(0, 5) };
}

export function DateTimeRangeFilter({
  presetIds = FULL_PRESET_IDS as unknown as string[],
  defaultPreset = "7d",
  allowCustom = true,
  rank = "primary",
  replace = false,
  panel = "inline",
  className,
}: {
  presetIds?: readonly string[];
  defaultPreset?: string;
  allowCustom?: boolean;
  /**
   * ⭐ A FILTER IS NOT A NAVIGATION (kit README §3) — `FilterPill` has taken this prop since S-07 and this rail
   * could not, so a rail built from both controls had one half that stacked history and one half that did not.
   * ⛔ IT DEFAULTS TO `false`, WHICH IS PUSH, AND THAT IS DELIBERATE: the seven existing admin call sites have
   * always pushed, and quietly rewriting their history behaviour is not a design fix (the note at `hrefForPreset`
   * below said exactly this, and still holds for every caller that does not ask). A rail that owns its URL asks.
   */
  replace?: boolean;
  /**
   * ⛔ THE ADMIN DENSITY IS THE CALLER'S TO ASK FOR, NEVER THIS FILE'S TO ASSUME. Every admin
   * call site passes `rank="dense"` (32px, `--h-control-xs`); the default stays the 44px player
   * floor, because a shared primitive that silently shipped a mouse-only height onto a phone
   * would be the admin fork the whole DG-A-06 row exists to refuse.
   */
  rank?: FilterPillRank;
  /**
   * 🔴 WHERE THE CUSTOM PANEL LIVES, AND IT IS A LAYOUT FACT, NOT A TASTE. Inline (the default,
   * and every existing caller's behaviour) the panel is a flex CHILD of this control's column, so
   * opening it grows the whole control from ~32px to ~180px. In `AdminPageHead`'s actions slot
   * that is measurable damage: the actions row is `items-center`, so the export buttons beside
   * this rail slide to the midpoint of the expanded panel, and the header itself is `items-end`,
   * which then drags the grown block upward to meet the title baseline. Two cross-axis rules
   * stacked, and the officer's buttons move twice for a panel they opened elsewhere.
   * ⭐ `"overlay"` takes the panel OUT OF FLOW, so the control's own height NEVER changes and
   * nothing around it can reflow. That is why this beats fixing the two alignment classes:
   * `AdminPageHead` serves ~47 pages and neither of its classes has to be touched at all.
   * ⛔ IT IS OPT-IN, AND DELIBERATELY SO. Four call sites render this inside filter BARS
   * (`ai-polls/poll-filters`, `candidates/candidate-filters`, `desk/activity-filters`,
   * `ai-usage`) whose ancestors were not audited for `overflow-hidden`/`overflow-x-auto` — an
   * out-of-flow panel under a clipping ancestor is a panel nobody can read. They keep `inline`
   * until each is looked at.
   */
  panel?: "inline" | "overlay";
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

  /**
   * 🔴 SEEDING IT OPEN IS RIGHT INLINE AND WRONG AS AN OVERLAY. Inline, a panel opened by the URL
   * simply pushes the page down and everything stays readable. Out of flow it COVERS whatever is
   * beneath it — measured on `/admin/finance` at 768: every load of a `?range=custom` link painted
   * the panel straight over the Excel and PDF buttons, so the officer who had just chosen a window
   * could not see the controls they chose it for. Turning the panel into an overlay would have
   * shipped that as a new defect in exchange for the one it fixes.
   * ⭐ In overlay mode the panel is a transient EDITOR: closed until asked for. Nothing is lost,
   * because the state it used to advertise is already legible — the Custom chip carries `data-on`
   * and `aria-pressed`, and every consumer of this rail renders the resolved window in its own
   * captions. Inline callers keep the behaviour they have always had.
   */
  const [open, setOpen] = useState(panel === "overlay" ? false : isCustomActive);
  // Custom field state — seeded from the URL, else sensible whole-day defaults.
  const initFrom = splitIso(urlFrom);
  const initTo = splitIso(urlTo);
  const [fromDate, setFromDate] = useState(initFrom.date);
  const [fromTime, setFromTime] = useState(initFrom.time || "00:00");
  const [toDate, setToDate] = useState(initTo.date);
  const [toTime, setToTime] = useState(initTo.time || "23:59");

  /**
   * 🔴 THE UPPER BOUND WAS THE BROWSER'S DAY, NOT THE PLATFORM'S (C8 minor M3, 2026-09-23). `getFullYear` and
   * its siblings read the machine the officer happens to be sitting at, and this platform keeps ONE clock: EAT.
   * For the three hours either side of EAT midnight an officer on a UTC or European machine had the current EAT
   * day DISABLED in the calendar (or a future EAT day offered), on every admin rail this control serves.
   * ⛔ `@/lib/eat-day`, NOT the house-bot `clock.ts` that re-exports it: this is a `components/ui` primitive and
   * it serves player surfaces too, so it takes the neutral home. Both are pure and client-safe; `date-range.ts`'s
   * `parseEatLocal` is NOT — it lives under `src/lib/server/`, which a `"use client"` file may not import.
   * ⚠️ STILL `useMemo(…, [])`: it does not refresh across an EAT midnight while the page is open. That is the
   * behaviour it has always had and it is left alone deliberately — written down rather than fixed silently.
   */
  const todayIso = useMemo(() => eatDayKey(Date.now()), []);

  const pushParams = (mut: (p: URLSearchParams) => void) => {
    const p = new URLSearchParams(sp.toString());
    mut(p);
    p.delete("page"); // any window change resets pagination
    const qs = p.toString();
    const to = (qs ? `${pathname}?${qs}` : pathname) as never;
    /* ⛔ ONE DECISION, TWO DOORS. `hrefForPreset` below builds the same URL for the `<Link>`; this runs for the
       Custom panel's Apply and Clear. Both must obey the caller's `replace`, or a rail stacks history on one half
       of itself and not the other. */
    if (replace) router.replace(to, { scroll: false }); else router.push(to, { scroll: false });
  };

  const pickPreset = (id: string) => {
    setOpen(false);
    pushParams((p) => {
      p.delete("from"); p.delete("to");
      if (id === defaultPreset) p.delete("range"); else p.set("range", id);
    });
  };

  /** The panel's own actions take the caller's density — see the note at the buttons below. */
  const denseActions = rank === "dense";

  const customValid = !!fromDate && !!toDate;
  const applyCustom = () => {
    if (!customValid) return;
    /* An overlay editor closes when its work is done — leaving it open would sit on top of the
       page the officer just re-filtered. Inline it stays open, exactly as it always has. */
    if (panel === "overlay") setOpen(false);
    pushParams((p) => {
      p.set("range", "custom");
      p.set("from", `${fromDate}T${fromTime || "00:00"}`);
      /**
       * 🔴 "TO THE END OF THAT DAY" WAS POSTED AS 23:59, AND IT IS NOT (C8 minor M3, 2026-09-23).
       * `resolveRange` reads a `to` WITH a time as an exact instant, so `…T23:59` ended the window at
       * 23:59:00.000 and dropped the last 59.999 seconds of the chosen EAT day. On a money log that is a stake
       * placed at 23:59:30 falling outside a window an officer set to that very day — a row that is simply not
       * there, with nothing to say why.
       * ⛔ THE SHAPE FOR "that whole day" ALREADY EXISTS and `resolveRange` documents it one line above its own
       * fallback: a DATE-ONLY `to` is inclusive of the whole EAT day. So the day-end default is posted as the
       * date alone, which is what the control's `23:59` means when nobody has touched it — and what a person
       * means by "to 23:59" in any case. A time the officer actually chose is still posted exactly.
       * ⚠️ THE WIDER QUESTION IS LEFT OPEN ON PURPOSE: whether a `to` time should mean "through the end of that
       * MINUTE" for every window everywhere is a change to `resolveRange`, which seven other admin rails resolve
       * through. It is written down here rather than taken in a commit about a picker's defaults.
       */
      p.set("to", !toTime || toTime === "23:59" ? toDate : `${toDate}T${toTime}`);
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
   * ⚠️ `push` UNLESS THE CALLER ASKS FOR `replace`, and the DEFAULT is unchanged on purpose: the rail
   * has always pushed, and quietly rewriting seven admin routes' history behaviour is not a design
   * fix. The `replace` prop above is opt-in, for a rail that owns its URL; the `<Link>` here forwards
   * exactly what `pushParams` obeys, so the two doors can never disagree.
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
    /* `relative` ONLY in overlay mode: it is what makes the absolute panel below anchor to this
       control rather than to some ancestor, and adding it unconditionally would create a new
       stacking context on every player rail for nothing. */
    <div className={cn("flex flex-col gap-2", panel === "overlay" && "relative", className)}>
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
            replace={replace}
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
            /* ⛔ `aria-pressed` STAYS ALONGSIDE `aria-expanded`, AND THEY SAY DIFFERENT THINGS.
               The FilterPill conversion dropped it and left only `aria-expanded`, which
               announces whether the from/to panel is OPEN — not whether a custom window is IN
               FORCE. A screen-reader user could have a custom range applied, the panel closed,
               and hear nothing distinguishing this chip from the presets beside it, every one
               of which announces its own state. `data-on` PAINTS it; only `aria-pressed`
               SPEAKS it, and §A4 is explicit that colour is never the only signal. */
            aria-pressed={activeId === "custom"}
            data-on={activeId === "custom" || undefined}
            className={filterPillClass({ rank, on: activeId === "custom" })}
          >
            {t.common.rangeCustom}
          </button>
        )}
      </div>

      {allowCustom && open && (
        <div
          /* A stable hook for the alignment probe. The panel is a plain `rounded-lg border` box,
             which is ALSO what `DateSelect` wears — the first version of that probe selected the
             date field by `.closest(".rounded-lg.border")` and measured it believing it was the
             panel, so an off-screen panel would have been reported as fully visible. */
          data-range-panel=""
          className={cn(
            "rounded-lg border border-border bg-bg-inset p-3",
            /* ⛔ `right-0`, NOT `left-0`. Every overlay caller renders inside `AdminPageHead`'s
               actions slot, which sits at the RIGHT edge of the header — anchoring the panel's
               left edge there would push a 600px card straight off the viewport. Anchored right
               it opens inward. The width is capped to the viewport (minus the page gutter) so it
               still fits a 360px phone, where the header has wrapped and the slot is full-width.
               ⚠️ z-30 sits above page content (z-10/z-20 in this kit) and below the sticky nav
               layer (z-40/z-50) — an open window picker must not cover the console's own chrome.
               🔴 THE WIDTH IS 600, NOT 520, AND IT WAS MEASURED. At 520 the two-column grid left
               the date field ~115px against the ~145px that "18 / 09 / 2026" plus the calendar
               trigger actually needs, so the YEAR WAS CLIPPED at 768 and 1280 — a date picker
               that cannot show its own date. Below `sm` the grid is one column and the field had
               room all along, which is why the defect only ever appeared on the wide layouts.
               The probe now asserts the segments fit rather than trusting this number. */
            panel === "overlay" &&
              "absolute right-0 top-full z-30 mt-2 w-[min(600px,calc(100vw-2rem))] shadow-lg",
          )}
        >
          {/* 🔴 `items-center` PUT THE TWO FIELDS ON DIFFERENT BASELINES, AND IT WAS THE ONE
              THING ON THIS SCREEN AN OWNER NAMED ("some up some down"). Both boxes are 36px
              (`date-select.tsx` HEIGHT.sm, `time-select.tsx` h) — but `TimeSelect`'s ROOT is a
              COLUMN (`inline-flex flex-col`) carrying the 12-hour echo BELOW the box, so the
              control it hands this row is ~53px tall, not 36. Centring a 36px box against a
              53px sibling drops the date field ~8px. The echo is not a defect — it is designed
              to hang under the box — so the row, not the primitive, was wrong.
              ⭐ AND `items-start` IS THIS CODEBASE'S OWN ANSWER, not a new idea: every other
              DateSelect+TimeSelect pairing already top-aligns — `ai-polls/poll-actions.tsx`
              (both the form and the inline editor) and `desk/[id]/rules-form.tsx`. This rail
              was the only call site out of step with them. */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 font-mono text-micro uppercase eyebrow text-text-faint">{t.common.rangeFrom}</div>
              <div className="flex items-start gap-1.5">
                <div className="min-w-0 flex-1"><DateSelect size="sm" max={todayIso} value={fromDate} onChange={setFromDate} /></div>
                <TimeSelect size="sm" value={fromTime} onChange={setFromTime} aria-label={`${t.common.rangeFrom} ${t.common.time24}`} />
              </div>
            </div>
            <div>
              <div className="mb-1 font-mono text-micro uppercase eyebrow text-text-faint">{t.common.rangeTo}</div>
              <div className="flex items-start gap-1.5">
                <div className="min-w-0 flex-1"><DateSelect size="sm" max={todayIso} value={toDate} onChange={setToDate} /></div>
                <TimeSelect size="sm" value={toTime} onChange={setToTime} aria-label={`${t.common.rangeTo} ${t.common.time24}`} />
              </div>
            </div>
          </div>
          {/* 🔴 THE PANEL HELD THREE CONTROL HEIGHTS: 36px fields over 40px `btn-sm` actions, inside
              a rail whose own pills are 32px. On the admin rails this control serves, the panel is
              the only place the dense language broke.
              ⭐ The actions now follow the rank the CALLER asked for — dense admin gets the 32px
              `.btn-xs` rung that already exists, and the PLAYER default keeps `btn-sm` at 40px,
              which is `--tap-min` and is not negotiable on a finger surface.
              ⛔ THE PILL CLASS HERE IS `btn-pill` AND MUST STAY IT — `test:filter-language` §7.4
              scans this file's RAW TEXT for the other pill class and fails if it appears.
              ⛔ And the density test is written off a VARIABLE (`denseActions`, above) rather
              than inline. §7.3 counts dense ranks by grepping this file's raw text for the prop
              spellings; an identity comparison matches none of them, but a 243-assertion suite
              that reads source as text can just as easily read a COMMENT as code, so neither the
              prop spellings nor the forbidden class name is written out anywhere in this file. */}
          <div className="mt-3 flex items-center justify-end gap-2">
            <button type="button" onClick={() => pickPreset(defaultPreset)} className={cn("btn btn-ghost btn-pill admin-focus", denseActions ? "btn-xs" : "btn-sm")}>
              {t.common.rangeClear}
            </button>
            <button type="button" onClick={applyCustom} disabled={!customValid} className={cn("btn btn-primary btn-pill admin-focus", denseActions ? "btn-xs" : "btn-sm")}>
              {t.common.rangeApply}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
