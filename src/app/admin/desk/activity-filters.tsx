/**
 * THE ACTIVITY PANEL'S FILTER RAIL — one rail, the shared language, at the admin density.
 *
 * ── WHY IT IS A DUMB RENDERER ────────────────────────────────────────────────────────────────────────────────────
 *
 * ⛔ **IT TYPES NO ROUTE, NO ENUM AND NO CLOSED LIST** (rulings 319, 340, 453). Every option's LABEL, its HREF and
 * whether it is the one in force are built in `house-console-read.ts`, where every other painted string of this
 * section is built — so the copy is inside 4.453's and 3.453's scans, which a label typed here would still be, and
 * inside the ONE parse that also decides what the server reads. A rail that built its own links would be a second
 * spelling of the filter, and the control an officer clicks could then disagree with the rows they get back.
 *
 * ⛔ **IT IS A SERVER COMPONENT, DELIBERATELY.** The kit's two controls own their own client boundary
 * (`FilterPill` is a `<Link>`; `DateTimeRangeFilter` is `"use client"` and reads the URL itself), so nothing here
 * needs one — and a `"use client"` file in this section would put ITS OWN PROP NAMES into a public chunk, which is
 * the measured half of owner ruling D19 that survives minification. `/admin/house` already ships a server-rendered
 * rail with server-built hrefs; this is that idiom, one directory over.
 *
 * ⛔ **ONE `data-filter-rail`, AND IT IS NOT ON THE `<Tabs>`** (`test:filter-language` §0.4, §6.1-§6.8, and the
 * console's own rail case), with `replace`, because a filter is not a navigation and a rail that stacks history
 * buries the page an officer arrived from under twenty of its own states.
 *
 * 🔴 **THE CONTROLS ARE NO LONGER `rank="dense"`, AND THAT IS A MEASUREMENT AND NOT A PREFERENCE (2026-09-23).**
 * The dense rank's floor is 32px — `--h-control-xs`, the documented admin exception — and this section's own
 * visual gate holds every interactive control to `--tap-min`, which this platform sets to **40px**. Driven on a
 * served build: **21 controls under the floor on the account's Activity route and 22 on the desk's**, every one
 * of them a chip on this rail. An exception that a surface's own gate reports as a fault is not an exception;
 * it is a defect with a name. The chips take the shared 44px rank, which clears the floor with room.
 * ⚠️ THE DENSE RANK ITSELF IS UNTOUCHED — other admin rails still use it, and this changes only the rail whose
 * gate was red.
 *
 * @see src/lib/server/house-console-read.ts · scripts/filter-language.test.mts
 */
import { FilterGroupKey, FilterPill } from "@/components/ui/filter-pill";
import { DateTimeRangeFilter } from "@/components/ui/datetime-range-filter";
import { I18nProvider } from "@/lib/i18n";

/** One option: a finished label, a finished link, and whether it is the one in force. */
export type RailOption = { key: string; label: string; href: string; on: boolean };
/** One axis. `param` is the REAL query-parameter name, which is what `FilterPill`'s `testId` contract asks for. */
export type RailGroup = { param: string; label: string; options: RailOption[] };

export function ActivityFilters({
  groups,
  presets,
  presetDefault,
}: {
  groups: RailGroup[];
  presets: readonly string[];
  presetDefault: string;
}) {
  return (
    <div data-filter-rail="desk-activity" className="flex flex-col gap-2">
      {/* The window, at the admin density. ⛔ It resets the page itself (`p.delete("page")` inside the kit), which
          is half of ruling 411's "a filter change drops the page"; the chips below carry the other half in their
          own server-built hrefs. */}
      {/**
        * 🔴 THE WINDOW PRESETS RENDERED IN SWAHILI ON AN ENGLISH DESK, AND THE CAUSE WAS NOT A PLAYER COOKIE.
        *
        * Measured on a served build (2026-09-23): the admin shell answers `lang="sw"` with NO `kp-locale`
        * cookie set at all — `DEFAULT_LOCALE` is `sw`, which is right for this platform's players and wrong
        * for an officer console whose every other sentence is English server copy. So the rail read
        * **Leo · Saa 24 · Siku 7 · Muda wote · Maalum** beside "Every stake this one account has decided on".
        * ⛔ THE KIT IS NOT TOUCHED. `DateTimeRangeFilter` takes its words from `useT`, and the honest fix at
        * this call site is to say which language this surface is in — not to add a label prop to a control
        * eleven other surfaces share.
        * ⚠️ AN OFFICER WHO HAS CHOSEN A LANGUAGE STILL GETS IT: the provider's own effect reads the cookie and
        * overrides this seed. What changes is the DEFAULT, which is the state that was measured.
        */}
      <I18nProvider initial="en">
        <DateTimeRangeFilter replace presetIds={presets} defaultPreset={presetDefault} />
      </I18nProvider>
      {groups.map((g) => (
        <div key={g.param} className="flex items-center gap-1 flex-wrap gap-y-1.5">
          {/* ⛔ THE GROUP KEY IS LOAD-BEARING, NOT DECORATION. Three axes each open with an "Any …" option; without
              a visible key the rail reads as three near-identical chips and none of them says what it clears. */}
          <FilterGroupKey>{g.label}</FilterGroupKey>
          {g.options.map((o) => (
            <FilterPill
              key={`${g.param}:${o.key}`}
              href={o.href}
              label={o.label}
              on={o.on}
              semantics="tab"
              replace
              scroll={false}
              testId={`${g.param}:${o.key}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
