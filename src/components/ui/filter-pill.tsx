/**
 * FilterPill — the ONE filter control language, for every player surface that filters.
 *
 * 🔴 WHY THIS EXISTS. Eight player surfaces filter and, before batch 5, six of them wrote their
 * own control at the call site. Measured in a browser against production on 2026-08-14: four
 * distinct heights (40 / 44 / 48 / 64px), two radii (8px against the pill's 999px), and — the
 * defect that is not cosmetic — **every diverging surface outlined EVERY control**.
 *
 * ⭐ THE GOVERNING RULE, inherited verbatim from the round-2 kit (COMPONENTS §3) and from the
 * control this primitive is extracted from: **only the SELECTED pill carries an outline. An
 * unselected pill is text on transparent.** In the kit's own words, *"fifteen outlined capsules
 * in one bar was the single biggest source of the 'chunky' criticism the round-2 brief was
 * answering."* A surface that outlines every control does not merely look different — it
 * contradicts the reasoning the current design exists to embody.
 *
 * ⚠️ `min-h-[44px]` IS AN ARBITRARY VALUE ON PURPOSE. Tailwind's spacing scale is OVERRIDDEN in
 * this repo (`h-8` = 48px, `h-9` = 64px, `h-10` = 80px — `tailwind.config.ts:200-215`), so a
 * scale class here would silently be the wrong size. That override is exactly how `/updown`'s
 * asset tabs ended up 64px tall from an `h-9` that reads like 36. ⛔ Never "tidy" it into `h-11`.
 * There is no `--h-control-*` rung at 44px (`globals.css:229-235` stops at `--h-input: 44px`,
 * named for inputs), which is the other half of why the literal stays.
 *
 * ⛔ LAW 82 (B9/B10): every value is a token consumed through a CLASS, never an inline `style`
 * at the call site. The selected fill and halo live in `.kp-fchip[data-on]` in `globals.css` —
 * including for `/markets`, which broke this law itself and is fixed by the extraction rather
 * than copied.
 *
 * ⛔ `data-chip` AND `data-count` ARE EMITTED AS LITERAL, ADJACENT JSX ATTRIBUTES, IN THAT ORDER,
 * and must stay that way. `qa:discovery-probe` matches them with a REGEX over the raw SSR HTML
 * (`/data-chip="([^"]+)"\s+data-count="(\d+)"/g`), not a selector — so a spread, a reorder, or
 * any attribute interposed between the two makes it find ZERO controls and report a product
 * failure that is really an instrument break. `data-count` must stay a bare integer.
 */
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * A pill states its selection in one of two ways, and they are NOT interchangeable:
 *
 * - `"tab"` → `aria-current="page"`, present only when selected. The right reading for a rail
 *   where exactly one option is in force and choosing it navigates: `/positions`' All/Open/
 *   Settled, `/updown`'s assets and durations, `/results`' categories, `/proposals`' board.
 * - `"toggle"` → `aria-pressed`, ALWAYS emitted (`true` *and* `false`). What `/markets`' chips
 *   have shipped since the discovery bar landed.
 *
 * ⛔ ONE PROP, BOTH CORRECT — never one semantic imposed on both. A tab rail that announced
 * `aria-pressed` would tell a screen-reader user that /positions' "Open" is a toggle they can
 * un-press, which is a lie about the control.
 */
export type FilterPillSemantics = "tab" | "toggle";

/**
 * Rank is the ONE sanctioned way for two pill rails on one page to differ, and it exists
 * because `/updown` genuinely has two ranks: the asset is the subject, the duration is a
 * refinement of it. Consistency means "the same control language", not "every control shouts
 * equally loudly" — so the hierarchy is expressed HERE, in the primitive, where it is one
 * decision, instead of at the call site as an inline style.
 *
 * Both ranks keep the pill, the 44px floor and the outline-only-when-selected rule. Only the
 * type treatment changes.
 */
/**
 * ⭐ `dense` IS THE ADMIN RANK (S-07, scan #1, 2026-08-28), and it is a DENSITY change only —
 * never a change of idiom.
 *
 * The admin console had a second filter language: sixteen hand-rolled chips per rail, every one
 * of them outlined AND filled, on /admin/ai-polls and /admin/candidates. That is the exact
 * shape this primitive's header calls "the single biggest source of the 'chunky' criticism the
 * round-2 brief was answering" — and no admin surface imported this file at all.
 *
 * ⛔ SO THE SELECTION IDIOM IS SHARED AND ONLY THE MEASURE FORKS. `test:filter-language`'s
 * original scope note said admin is "a different audience with its own density rules". That
 * licenses a different SIZE; it does not license a different way of saying "this one is
 * chosen". Unselected is still text on transparent, selected still carries the outline and the
 * shared fill, and the box is still the same size in both states.
 *
 * 32px is `--h-control-xs`, the documented dense-admin floor ("dense mouse-only admin inline
 * controls (documented floor exception)"). ⚠️ It is written as an arbitrary value for the same
 * reason 44 is: this repo overrides Tailwind's spacing scale, so `h-8` here would silently be
 * 48px. The hand-rolled chips it replaces rendered about 26px — under the exception itself.
 */
export type FilterPillRank = "primary" | "secondary" | "dense";

export function FilterPill({
  href,
  label,
  count,
  on,
  semantics = "tab",
  rank = "primary",
  glyph,
  title,
  testId,
  replace,
  scroll,
  onClick,
  className,
  countClassName,
}: {
  href: string;
  label: React.ReactNode;
  /** Omit where no honest count exists. ⛔ Never invent one — A-5, no fabrication. */
  count?: number;
  on: boolean;
  semantics?: FilterPillSemantics;
  rank?: FilterPillRank;
  glyph?: React.ReactNode;
  title?: string;
  /** "axis:value" using the REAL query-param name and value — drivers rebuild a URL from it. */
  testId?: string;
  /** A filter is not a navigation (kit README §3) — the rails that own a URL pass `replace`. */
  replace?: boolean;
  scroll?: boolean;
  /**
   * ⚠️ The RAW MouseEvent, deliberately — not a normalised `onSelect(key)`. `/updown` reads
   * `e.button` / `e.metaKey` / `e.ctrlKey` / `e.shiftKey` / `e.altKey` to let the browser own
   * anything that is not a plain left-click, and a normalised callback would destroy them.
   */
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  /**
   * For the ONE rail that is not a row of pills: `/results`' desktop sidebar renders each pill
   * full-width, where a count hugging its label leaves the row visibly unfinished. It asks for
   * `lg:ml-auto` here rather than the pill assuming a layout it cannot see.
   */
  countClassName?: string;
}) {
  return (
    <Link
      href={href as never}
      replace={replace}
      scroll={scroll}
      onClick={onClick}
      title={title}
      /* ⛔ The two data attributes are hardcoded here, adjacent, in this order. See the header. */
      data-chip={testId}
      data-count={count}
      /* The selected fill + halo are painted by `.kp-fchip[data-on]`, never inline (law 82). */
      data-on={on || undefined}
      aria-current={semantics === "tab" ? (on ? "page" : undefined) : undefined}
      aria-pressed={semantics === "toggle" ? on : undefined}
      className={cn(
        "kp-fchip inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-pill border",
        // ⚠️ The floor is the ONLY thing the admin rank changes: 32px is --h-control-xs, the
        // documented dense-admin exception. Everything below this line is shared, because the
        // selection idiom is not the audience's to vary.
        rank === "dense" ? "min-h-[32px]" : "min-h-[44px]",
        rank === "primary" ? "text-[13px] font-semibold" : "font-mono text-[11.5px] font-semibold",
        // Selected pills carry a little more air, so the fill reads as a considered shape
        // rather than a tight highlight. Unselected pills stay narrow and quiet.
        // ⭐ THE DENSE RANK DOES NOT STEP ITS PADDING, and that is a real difference rather
        // than an oversight. A player rail carries four to eight pills, so a 4px step costs a
        // small shuffle. An admin rail carries SIXTEEN across two rows, where the same step
        // moves every chip after the selected one and the rail visibly walks under the cursor.
        // S-07b is that defect in its worst form: the hand-rolled chips switched to `font-bold`
        // in a MONO face — which is wider — so selection changed the chip's own width too.
        // Selection is stated by the fill and the outline, which cost no width at all.
        rank === "dense" ? "px-2.5" : on ? "px-4" : "px-3",
        // ⭐ THE RULE. `border-transparent` — not "no border" — so selecting a pill cannot
        // reflow the row it sits in: the box is the same size in both states, only the ink
        // changes. This is why the class carries `border` unconditionally.
        on
          ? "border-brand-400 text-text"
          : "border-transparent text-text-muted hover:bg-bg-overlay hover:text-text",
        className,
      )}
    >
      {glyph}
      {label}
      {count != null && (
        <span
          className={cn(
            "font-mono text-[11px] font-bold tabular-nums",
            on ? "text-brand-200" : "text-text-faint",
            countClassName,
          )}
        >
          {count}
        </span>
      )}
    </Link>
  );
}

/**
 * The mono group KEY that names an axis — `ODDS`, `POOL`, `SORT`, `TOPIC`.
 *
 * ⚠️ IT IS LOAD-BEARING, NOT DECORATION. On `/markets`, odds and pool each open with an "Any"
 * pill, so without a visible key the bar renders two identical "Any" pills side by side and
 * neither says what it clears. `/results` had already grown the same treatment independently —
 * which is precisely the duplication this extraction ends.
 */
export function FilterGroupKey({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "shrink-0 pr-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-text-subtle",
        className,
      )}
    >
      {children}
    </span>
  );
}
