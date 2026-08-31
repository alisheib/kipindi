"use client";

/**
 * Tabs — kit-faithful three-variant tabs.
 *
 *   line       — kit default. Horizontal row, `--brand-500` underline on active.
 *   segmented  — pill-shaped capsule with the active surface raised.
 *   pill       — separate pills, active fills with `--pill-active`.
 *
 * ⚠️ THOSE THREE LINES SAID SOMETHING ELSE UNTIL 2026-08-31, AND BOTH CORRECTIONS ARE THE
 * FILE'S OWN DEFECTS SPELLED OUT. `line` was described as a "gold underline": it is
 * `--brand-500`, and `wallet/loading.tsx:76` carries the reason — "⭐ D5 — brand, not gold …
 * section tabs are NAVIGATION, not earned money (§M3)" — after the skeleton drew gold and
 * repainted brand a beat later. `pill` was described as filling with "teal-subtle", which is
 * the KILLED kit's colour; it filled with a hand-typed `--brand-500/15` instead.
 *
 * All three share the same data shape and onChange API; pick the one that
 * fits the host context (line on detail pages, segmented in toolbars,
 * pill for lightweight filter strips).
 *
 * ⚠️ EVERY TAB HEIGHT BELOW IS AN ARBITRARY LITERAL ON PURPOSE. `theme.extend.spacing`
 * is OVERRIDDEN in `tailwind.config.ts:200-215`, so a scale class is ~double what it
 * reads as (`h-8` = 48px, `h-10` = 80px). All three variants were written in the
 * default-Tailwind idiom and shipped oversized — `line` put the wallet section rail
 * in an 80px band. ⛔ Never "tidy" these back into `h-8` / `h-10`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴 A5 (2026-08-21) — THESE ARE PRESSED BUTTONS, NOT AN ARIA TAB WIDGET.
 *
 * All three variants used to carry `role="tablist"` + `role="tab"` + `aria-selected`, and
 * that is a promise the markup could not keep: the ARIA tab pattern requires arrow-key
 * navigation with a roving tabindex AND an `aria-controls` pointing at a `role="tabpanel"`
 * that is labelled back by its tab. None of it was there — every tab sat in the tab order,
 * arrows did nothing, and there was no panel to point at. A screen-reader user was told
 * "tab, 1 of 3" and then found the only way through the rail was Tab, which is the one key
 * a real tablist does NOT use.
 *
 * ⭐ THE FIX IS TO STOP CLAIMING THE WIDGET, not to build it here — and that is a fact about
 * WHERE the panel lives, not a preference. The panel is rendered by the CALLER
 * (`wallet-client.tsx` switches its own sections on `value`), so this component can never
 * emit a correct `aria-controls`; a primitive cannot label an element it does not own.
 * Building the widget properly would mean a new required `panelId` prop and a matching
 * `role="tabpanel"` at every call site — a cross-file contract for a single rail.
 *
 * So: `role="group"` + a button per option carrying `aria-pressed`, which is exactly the
 * `"toggle"` semantics `filter-pill.tsx` already ships across eight player surfaces. Tab
 * moves between the options (which is what actually happens), Enter/Space chooses, and
 * nothing announces a contract the DOM does not honour.
 *
 * ⚠️ NOT `aria-current`: `filter-pill.tsx` reserves that for a rail whose options NAVIGATE
 * (`aria-current="page"`). These change in-page view state without a URL, which is the
 * `/markets` discovery-chip case, and that rail is `aria-pressed`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴 DG-S-02 (2026-08-31, DESIGN-GATE-2026-08-28 step 5) — THIS FILE HELD THE FOURTH AND
 * FIFTH HOMES OF `--pill-active`, AND NO GUARD COULD SEE EITHER.
 *
 * `globals.css:423` defines `--pill-active: oklch(40% 0.12 262 / 0.35)` and captions it, in a
 * comment on its own line, "one active filter/tab fill everywhere" — it names TABS by word.
 * This file painted its active state
 * two other ways: `segmented` with an inline `oklch(40% 0.08 264 / 0.55)` (a different
 * chroma, hue AND alpha — a different ANSWER, not a copy) and `pill` with
 * `bg-brand-500/15 text-brand-300` (the same thing through a Tailwind alpha, which is the
 * evasion DG-P-11 refused on `legal-nav.tsx`). ⛔ `ui-consistency`'s `hardcoded-pill-active`
 * matches the token's LITERAL TEXT, so it finds copies and never divergence — DESIGN_AUTHORITY
 * §M4's named shape, a guard reading the SPELLING of a value instead of the value that lands
 * on the glass.
 *
 * ⭐ WHY IT WAS FIXED BEFORE ANY ADOPTER, NOT AFTER. Both drifting variants had ZERO call
 * sites: the drift cost nothing on the day it was found and would have cost every admin
 * console the moment §K rule 7 sent one here. That was the cheapest possible moment, and the
 * last one.
 *
 * ⚠️ AND IT IS NOT PIXEL-NEUTRAL — THE FIRST DRAFT OF THIS NOTE SAID IT WAS, AND AN A/B BENCH
 * AGAINST THE REAL PRODUCTION FONTS REFUTED IT. `line` is the one variant with a call site
 * (`/wallet`), and moving `text-[13px]` onto the ladder's `text-body-sm` carries that rung's
 * `letter-spacing: -0.05px` and `line-height: 18px` with it, which `text-[13px]` never set.
 * Measured, old → new: label width **92.44 → 92.03px** on "Activity", line-height 19.5 → 18
 * (invisible inside a 44px flex-centred box), transition 150ms `ease` → 140ms `linear`.
 * ⭐ That is a CONVERGENCE, not a regression: the two shipped admin section rails
 * (`roles/page.tsx:68`, `players/[id]/page.tsx:321`) already render `text-body-sm`, so this rail
 * was the one 13px label in the product that was not on the rung. But it is a rendered change
 * on an authed player surface, and it is recorded here rather than claimed away.
 *
 * 📋 The count pip was hand-written THREE times here, uncapped — a fifth implementation of the
 * thing the stage-9 consolidation existed to remove. It is the kit `<CountBadge>` now, which
 * caps at 99 and renders nothing at zero. ⚠️ That second behaviour is a deliberate API change:
 * `count={0}` used to render a literal "0".
 *
 * 📋 `TabItem.labelSw` was dead API — nothing read it, and the one call site passes translated
 * `labelEn` from `useT()`. Deleted 2026-08-31 with the rest. The admin console is
 * English-only by design (`scripts/failure-reasons.test.mts:1080-1085`), and a player surface
 * translates through `useT()` before it reaches this component.
 */
import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { CountBadge } from "@/components/ui/count-badge";

export type TabItem = {
  value: string;
  labelEn: string;
  count?: number;
  /** Present ⇒ this rail NAVIGATES: the option renders a `<Link aria-current>`. See `TabControl`. */
  href?: string;
};

type Variant = "line" | "segmented" | "pill";

/**
 * Every variant lays its label and its `<CountBadge>` out the same way, so the box is written
 * ONCE. ⛔ Not merely tidiness: `scripts/design-gate/eyebrow-roles.mjs` keys the `pill` variant's
 * declaration on that class line's CONTENT, truncated at 170 characters — and inlining these
 * three utilities there pushed the key past the cut, so it truncated MID-TOKEN and lost its
 * `↵ active` tail. A key that cannot hold its own signature is a key that goes stale for no
 * reason. `gap-1.5` is 8px: the overridden scale runs 1=4 · 1.5=8 · 2=12, so it is not one of
 * the inverted keys `spacing-scale.test.mts` ratchets.
 */
const BOX = "inline-flex items-center gap-1.5";

/**
 * ⭐ LINK MODE (DG-S-03, 2026-08-31) — ONE RAIL, TWO WAYS OF HOLDING ITS SELECTION.
 *
 * An item with an `href` renders a `next/link` `<Link>` carrying `aria-current="page"` when it
 * is the one in force; an item without one renders today's `<button aria-pressed>`. The rail
 * wrapper follows: `<nav aria-label>` for links, `role="group"` for buttons.
 *
 * ⛔ THIS DOES NOT REVERSE A5 (2026-08-21) — IT SATISFIES ITS ANTECEDENT. A5's structural half
 * stands untouched: the panel is still rendered by the CALLER, so this component still cannot
 * emit a correct `aria-controls`, and it still claims NO ARIA tab widget — no `role="tablist"`,
 * no `role="tab"`, no `aria-selected`. What A5 forbade about `aria-current` was conditional and
 * it said so: *"These change in-page view state WITHOUT A URL, which is the /markets
 * discovery-chip case."* A rail whose selection lives in `?tab=` is not that rail, and
 * `filter-pill.tsx:38-48` already states the general law — `"tab"` navigates and takes
 * `aria-current="page"`, `"toggle"` does not and takes `aria-pressed`; ⛔ one semantic imposed
 * on both is a lie about the control.
 *
 * ⛔ `data-section-rail`, NOT `data-filter-rail`. A section rail chooses which PART OF A PAGE is
 * shown; a filter rail chooses which ROWS a list shows (DESIGN_AUTHORITY §K rule 7).
 * `filter-language.test.mts:321` already excludes this file from the filter language BY NAME —
 * *"Nav is out — an active NAV destination is a settled, separate language"* — so wearing that
 * other hook would turn §0.4 red for the right reason at the wrong time, and then have §6.6
 * demand a 32px dense rank of a page's primary navigation. The hook exists so the design-gate
 * drives can DISCOVER a page's tabs off the rendered rail instead of a hand-typed list in
 * `routes.mjs` (§0a: the tab set's home is the page's own definition).
 */
function TabControl({
  item, active, cls, style, onSelect, trailing,
}: {
  item: TabItem;
  active: boolean;
  cls: string;
  style?: React.CSSProperties;
  onSelect?: () => void;
  /** The `line` variant's travelling underline — absolutely positioned, so it is not a flex item. */
  trailing?: React.ReactNode;
}) {
  const body = (
    <>
      {item.labelEn}
      {item.count !== undefined && <CountBadge count={item.count} tone="brand" size="sm" />}
      {trailing}
    </>
  );
  if (item.href) {
    return (
      <Link href={item.href as never} aria-current={active ? "page" : undefined} className={cls} style={style}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" aria-pressed={active} onClick={onSelect} className={cls} style={style}>
      {body}
    </button>
  );
}

export function Tabs({
  tabs,
  value,
  onChange,
  variant = "line",
  className,
  ariaLabel,
}: {
  tabs: TabItem[];
  value: string;
  /** ⚠️ Optional in LINK mode: a `<Link>` rail is navigated, not called back — and a function
   *  prop cannot cross the RSC boundary, which is what lets a server console render this. */
  onChange?: (v: string) => void;
  variant?: Variant;
  className?: string;
  ariaLabel?: string;
}) {
  /**
   * A rail is a NAVIGATION the moment any of its options owns a URL.
   *
   * ⛔ LINK MODE IS `line`-ONLY, AND THAT IS TWO RULINGS, NOT A SHORTCUT.
   * ① DESIGN_AUTHORITY §K rule 7c: *"the underline is the section language; the capsule is the
   *   filter language"* — three shipped section rails are three-for-three an underline, all 25
   *   `<FilterPill>` call sites are the capsule. A URL-backed capsule would be a fourth answer.
   * ② AND IT KEEPS A GATE'S SIGHT. The first draft of this refactor routed all three variants
   *   through the shared `TabControl`, which moved every height out of its own `<button>` open
   *   tag and into a `cn()` passed as a prop — and `scripts/tap-target.test.mts` §3 reads
   *   heights DECLARED INSIDE AN INTERACTIVE OPEN TAG. `test:tap-target` went red saying the
   *   `tabs.tsx:button@36` row was "fixed (or moved)". ⛔ It was neither: the segment was still
   *   36px and the gate had simply gone blind to it — a guard one level too shallow, made so by
   *   a refactor that looked like tidying. So `segmented` and `pill` keep their own `<button>`
   *   with a literal height, and only `line` — whose 44px is above the floor and can never be a
   *   finding — delegates.
   * ⚠️ The residue, stated rather than hidden: a future height edit inside the `line` branch is
   *   invisible to that static gate. Closing that needs the gate to follow a `cn()` through a
   *   prop, which it cannot do, and the alternative — a rule scoped to this filename — is the
   *   allowlist-by-filename shape §A1 forbids. The rendered drive is where a rail's real height
   *   is provable anyway, with `elementFromPoint`, exactly as the `toggle.tsx:button@26` row in
   *   that same ratchet already records.
   */
  const isNav = tabs.some((t) => t.href);
  if (variant === "segmented") {
    return (
      <div
        role="group"
        aria-label={ariaLabel}
        className={cn(
          "inline-flex items-center gap-0.5 rounded-lg bg-bg-inset p-1 border border-border",
          className,
        )}
      >
        {tabs.map((t) => {
          const active = value === t.value;
          return (
            <button
              key={t.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange?.(t.value)}
              className={cn(
                // 36px segment inside the `p-1` (4px) capsule above ⇒ a 46px capsule with its
                // 1px border, in line with the 44px filter rails (was h-8 = 48px ⇒ 58px).
                // ⛔ `tap-target.test.mts` holds this 36 as a keyed ratchet row
                // (`src/components/ui/tabs.tsx:button@36`) whose key is `file:tag@px` — changing
                // the height silently makes that row stale. Edit both or neither.
                // ⚠️ `text-body-sm` (13), not `text-[12.5px]`: §T1 the scale is closed and §T7
                // says a size written at a call site comes from the TAILWIND ladder, which has
                // no 12.5 rung. ⛔ AND NOT `text-label` (12), which was tried and measured:
                // 12 is UNDER §T4's 12.5px reading floor, so `test:type-scale` §3 counted it as
                // a new sub-floor site (753 → 752 only because two count pips left in the same
                // edit). A tab label is a CONTROL LABEL (§T3), not a blessed uppercase
                // microlabel, so it has no claim on the sub-micro tier. 13 also puts all three
                // variants on ONE size, which is the point of a closed scale.
                BOX,
                "h-[36px] px-3 rounded-md text-body-sm font-mono font-semibold transition-colors duration-quick ease-linear",
                active
                  ? "text-text"
                  : "text-text-muted hover:text-text",
              )}
              /* ⛔ THE ONE ACTIVE FILL — `globals.css:423`. Consumed as a `var()` exactly as the
                 five shipped neighbours do (`admin-sidebar-nav` · `admin-mobile-nav` ·
                 `legal-nav` · `nav-more` · `avatar-menu`); never re-typed as a literal. */
              style={active ? { background: "var(--pill-active)" } : undefined}
            >
              {t.labelEn}
              {t.count !== undefined && <CountBadge count={t.count} tone="brand" size="sm" />}
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === "pill") {
    return (
      <div role="group" aria-label={ariaLabel} className={cn("flex flex-wrap gap-1.5", className)}>
        {tabs.map((t) => {
          const active = value === t.value;
          return (
            <button
              key={t.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange?.(t.value)}
              className={cn(
                // 40px = --tap-min, the chip language every other filter rail uses (was h-8 = 48px).
                // ⛔ THIS LINE'S CONTENT IS A KEY. `scripts/design-gate/eyebrow-roles.mjs`
                // declares this site CONTROL_LABEL keyed on the line's TEXT, not on `:line` —
                // so editing this string without editing that declaration turns
                // `test:eyebrow-roles` red. Both, in one commit, or neither.
                BOX,
                "h-[40px] px-3.5 rounded-pill text-label font-mono font-semibold uppercase tracking-[0.14em] border transition-colors duration-quick ease-linear",
                active
                  // ⛔ The selected state is `filterPillClass`'s, exactly: `--brand-400` edge,
                  // `--text` ink, and the fill from the token below. It was
                  // `border-brand-500 bg-brand-500/15 text-brand-300` — a Tailwind-alpha
                  // restatement of `--pill-active`, on the ink DG-P-11 refused for an active
                  // nav item, and invisible to `hardcoded-pill-active` for the same reason.
                  ? "border-brand-400 text-text"
                  : "border-border bg-bg-elevated text-text-muted hover:border-border-strong hover:text-text",
              )}
              style={active ? { background: "var(--pill-active)" } : undefined}
            >
              {t.labelEn}
              {t.count !== undefined && <CountBadge count={t.count} tone="brand" size="sm" />}
            </button>
          );
        })}
      </div>
    );
  }

  // line — ⭐ THE SECTION-RAIL VARIANT (DESIGN_AUTHORITY §K rule 7c: "the underline is the
  // section language; the capsule is the filter language"). ⛔ It SCROLLS and never wraps, and
  // that is structural rather than taste: the `border-b` is on this container, so a wrapped
  // second row would leave the first with no baseline under it.
  const railCls = cn("flex items-end gap-1 border-b border-border overflow-x-auto", className);
  const items = (
    <>
      {tabs.map((t) => {
        const active = value === t.value;
        return (
          <TabControl
            key={t.value}
            item={t}
            active={active}
            onSelect={() => onChange?.(t.value)}
            cls={cn(
              // 44px — A2's mobile-preferred tap height (was h-10 = 80px on the wallet rail),
              // and §K rule 7c's rung for a section rail: `--h-control-md`.
              // ⚠️ `text-body-sm` (13), not `text-[13px]`: same glyph, but §T7 says a size at a
              // call site comes from the Tailwind ladder, and `test:type-scale` §4 ratchets the
              // hand-typed spelling toward zero.
              // ⭐ THE BODY FACE, NOT SORA — and it was held back one commit ON PURPOSE, until
              // something could witness it. `font-display` made this the only nav-shaped control
              // in the product wearing the DISPLAY face: five of the seven shipped nav/rail
              // components carry no font class at all, and `.btn` — the platform's own control
              // primitive — sets `font-family: var(--font-body)` outright (globals.css:1015).
              // ⚠️ AND BE PRECISE ABOUT WHAT THE ADMIN CONVERSION WITNESSES, BECAUSE THE FIRST
              // DRAFT OF THIS NOTE OVERSTATED IT. `/admin/roles`'s hand-rolled rail carried NO
              // font class, so it already rendered Inter — measured 2026-08-31, old and new
              // both resolve `Inter`. Removing `font-display` is therefore what lets an admin
              // rail adopt this variant WITHOUT gaining a face it never had; it does not
              // witness the loss of Sora on `/wallet`. That loss is measured separately, in the
              // real production fonts, and recorded rather than assumed.
              BOX,
              "relative h-[44px] px-4 text-body-sm font-semibold transition-colors duration-quick ease-linear whitespace-nowrap",
              active ? "text-text" : "text-text-muted hover:text-text",
            )}
            trailing={
              /* ⭐ §B5/§M5: ONE object travels — the underline scales, it does not cross-fade.
                 `--t-base` with `--m-glide` is `motion.css:211`'s `.m-indicator` recipe stated
                 inline, which is what this span has always done. */
              <span
                aria-hidden
                className="absolute left-2 right-2 -bottom-px h-[2px] rounded-pill"
                style={{
                  background: active ? "var(--brand-500)" : "transparent",
                  boxShadow: active ? "0 0 8px color-mix(in oklab, var(--brand-500) 50%, transparent)" : "none",
                  transform: active ? "scaleX(1)" : "scaleX(0)",
                  transition: "transform var(--t-base) var(--m-glide), background var(--t-quick) linear, box-shadow var(--t-base) ease-out",
                }}
              />
            }
          />
        );
      })}
    </>
  );
  /* ⭐ The wrapper states which KIND of rail this is, and nothing else varies. A rail whose
     options own a URL is a `<nav>` carrying `data-section-rail` — the hook the design-gate
     drives use to DISCOVER a page's tabs off the rendered rail instead of a hand-typed list
     (§K rule 7f); one whose options only change in-page state stays `role="group"`. */
  return isNav ? (
    <nav aria-label={ariaLabel} data-section-rail="" className={railCls}>{items}</nav>
  ) : (
    <div role="group" aria-label={ariaLabel} className={railCls}>{items}</div>
  );
}
