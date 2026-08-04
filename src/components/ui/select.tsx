"use client";

/**
 * Select — kit-themed dropdown replacing native <select>.
 *
 * Dark glass dropdown panel, brand-500 focus ring, mono font.
 * Keyboard navigable (arrows, enter, escape, type-to-search).
 * Hidden input for form submission.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

type Option = {
  value: string;
  label: string;
  /**
   * Shown, but not choosable.
   *
   * ⛔ GREYED WITH ITS REASON, NEVER HIDDEN (Ali, 2026-08-04). *"Why isn't gold in the list?"*
   * is a worse question for an operator than seeing gold greyed with the answer beside it — a
   * missing option looks like a bug in the console, while a disabled one with a reason looks
   * like the platform knowing something. It is also how the Up & Down symbol catalogue already
   * explains SPX ("not on the current Twelve Data plan").
   */
  disabled?: boolean;
  /** The reason, in the reader's own terms. Rendered beneath the label, wrapped not truncated —
   *  a reason that is cut off at the panel edge has not been given. */
  hint?: string;
};

type Props = {
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  options: Option[];
  placeholder?: string;
  required?: boolean;
  className?: string;
  /** Accessible name for the combobox. A11y: a role="combobox" does NOT take
   *  its name from child text (unlike a plain button), so it needs an explicit
   *  label. Falls back to the placeholder / selected label when omitted. */
  ariaLabel?: string;
  /** Compact size for admin filter bars. `xs` (h-9) matches the kit's compact
   *  search inputs + btn-sm height so filter rows align flush. */
  size?: "md" | "sm" | "xs";
};

export function Select({
  name, value, defaultValue, onChange, options, placeholder,
  required, className, ariaLabel, size = "md",
}: Props) {
  const { t } = useT();
  const controlled = value !== undefined;
  const [internal, setInternal] = useState(defaultValue ?? "");
  const selected = controlled ? value : internal;
  const selectedOption = options.find((o) => o.value === selected);

  const [open, setOpen] = useState(false);
  const [focusIdx, setFocusIdx] = useState(-1);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  /** ⛔ G-8. `bottom` is what makes "open above" actually open above — see `openDropdown`.
   *  Exactly one of `top` / `bottom` is ever set, and `maxHeight` is the space that is
   *  really available rather than a fixed 240. */
  const [pos, setPos] = useState<{
    top?: number; bottom?: number; left: number; width: number; maxHeight: number;
  }>({ top: 0, left: 0, width: 0, maxHeight: 240 });

  useEffect(() => { setMounted(true); }, []);

  const pick = useCallback((val: string) => {
    if (!controlled) setInternal(val);
    onChange?.(val);
    setOpen(false);
    triggerRef.current?.focus();
  }, [controlled, onChange]);

  /**
   * ⛔ G-8 (2026-08-02) — THE "OPEN ABOVE" BRANCH NEVER OPENED ABOVE.
   *
   * It set `top: r.top - 4` on a `position: fixed` panel. A fixed box grows DOWNWARD
   * from its `top`, so that moved the panel up by the trigger's own height and 4px, and
   * not one pixel further — the panel still ran off the bottom of the screen. Measured
   * on production at 360, where the decision to flip up was CORRECT every time:
   *
   *   /admin/players  · All statuses    trigger bottom 837, below 63px  → panel 785→1025, 125px lost
   *   /admin/events   · sports          trigger bottom 868, below 32px  → panel 768→1008, 108px lost
   *   /admin/markets  · All categories  trigger bottom 739, below 161px → panel 687→ 927,  27px lost
   *
   * And because the panel is `position: fixed`, the lost part is not merely below the
   * fold — **no amount of scrolling reaches it**. On a phone the lower options of a
   * filter simply do not exist. The bug is invisible to every static sweep, because a
   * screenshot of a page at rest never has the panel open.
   *
   * Three things are fixed together, because each alone still leaves a broken case:
   *   · anchor by `bottom` when opening up, so "above" means above;
   *   · size `maxHeight` to the space that actually exists rather than a flat 240, so a
   *     trigger with 90px of room shows a 90px panel that scrolls, not a 240px panel
   *     that overflows;
   *   · clamp `left`/`width` into the viewport, so a right-edge trigger cannot push the
   *     panel off the side — the same defect on the other axis, not yet observed but
   *     reachable by the identical route.
   */
  const openDropdown = () => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const GAP = 4;      // breathing room between trigger and panel
    const EDGE = 8;     // never let the panel touch the viewport edge
    const MAX = 240;    // the design cap; available space may be less

    const below = window.innerHeight - r.bottom - GAP - EDGE;
    const above = r.top - GAP - EDGE;
    // Prefer down. Flip up only when down cannot show as much as up can.
    const up = below < Math.min(MAX, above);
    const maxHeight = Math.max(96, Math.min(MAX, up ? above : below));

    const width = Math.min(r.width, window.innerWidth - EDGE * 2);
    const left = Math.max(EDGE, Math.min(r.left, window.innerWidth - width - EDGE));

    setPos(up
      ? { bottom: window.innerHeight - r.top + GAP, left, width, maxHeight }
      : { top: r.bottom + GAP, left, width, maxHeight });
    setFocusIdx(options.findIndex((o) => o.value === selected));
    setOpen(true);
  };

  // Keyboard on trigger
  const onTriggerKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
      e.preventDefault();
      openDropdown();
    }
  };

  // Keyboard inside dropdown
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); triggerRef.current?.focus(); }
      // ⛔ ARROW KEYS SKIP DISABLED OPTIONS. Landing focus on something Enter refuses to select
      // is a dead end that reads as a broken dropdown — and it is only reachable by keyboard, so
      // it would never appear in a screenshot sweep. `step` walks past them in either direction
      // and stays put rather than wrapping when there is nothing selectable left.
      const step = (from: number, dir: 1 | -1) => {
        for (let i = from + dir; i >= 0 && i < options.length; i += dir) {
          if (!options[i]!.disabled) return i;
        }
        return from;
      };
      if (e.key === "ArrowDown") { e.preventDefault(); setFocusIdx((i) => step(i, 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setFocusIdx((i) => (i <= 0 ? i : step(i, -1))); }
      if (e.key === "Enter") {
        e.preventDefault();
        if (focusIdx >= 0 && !options[focusIdx]?.disabled) pick(options[focusIdx]!.value);
      }
      // Type-to-search: jump to first option starting with typed char
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        const char = e.key.toLowerCase();
        // Skips disabled ones for the same reason the arrows do — typing "g" and landing on a
        // gold option Enter will not take is the same dead end by another route.
        const idx = options.findIndex((o) => !o.disabled && o.label.toLowerCase().startsWith(char));
        if (idx >= 0) setFocusIdx(idx);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, focusIdx, options, pick]);

  // Scroll focused item into view
  useEffect(() => {
    if (!open || focusIdx < 0) return;
    const el = listRef.current?.children[focusIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [open, focusIdx]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!listRef.current?.contains(e.target as Node) && !triggerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  // `xs` is the compact admin filter-row size: neat 32px height, 12.5px label and
  // md radius so it sits flush with the h-8 search inputs + filter buttons.
  const h = size === "xs" ? "h-8" : size === "sm" ? "h-9" : "h-11";
  const txt = size === "xs" ? "text-[12.5px]" : "text-[16px]";
  const radius = size === "xs" ? "rounded-md" : "rounded-lg";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => open ? setOpen(false) : openDropdown()}
        onKeyDown={onTriggerKey}
        role="combobox"
        aria-label={ariaLabel ?? placeholder ?? selectedOption?.label ?? t.common.selectPlaceholder}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          "field-measure flex items-center justify-between gap-2 w-full px-3 border border-border text-left",
          "focus:outline-none brand-focus",
          "transition-colors font-mono",
          radius, txt, h,
          selectedOption ? "text-text" : "text-text-subtle",
          className,
        )}
        style={{ background: "var(--bg-inset)" }}
      >
        <span className="truncate">{selectedOption?.label ?? placeholder ?? t.common.selectPlaceholder}</span>
        <svg viewBox="0 0 12 12" width={10} height={10} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-text-subtle" aria-hidden>
          <path d="M3 4.5l3 3 3-3" />
        </svg>
      </button>

      {name && <input type="hidden" name={name} value={selected} />}

      {mounted && open && createPortal(
        <div
          ref={listRef}
          role="listbox"
          className="m-float-in fixed z-[130] rounded-control border border-border-strong bg-bg-elevated shadow-overlay overflow-y-auto overscroll-contain"
          style={{
            /* G-8: exactly one of these is set. `bottom` is the "open above" case, and
               it is what makes the panel grow upward from the trigger instead of
               downward off the screen. */
            ...(pos.bottom != null ? { bottom: pos.bottom } : { top: pos.top }),
            left: pos.left,
            width: pos.width,
            maxHeight: pos.maxHeight,
          }}
        >
          {options.map((o, i) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === selected}
              // ⛔ `aria-disabled`, NOT the `disabled` attribute. A `disabled` button is removed
              // from the accessibility tree entirely, so a screen-reader user would not hear the
              // option OR its reason — which is precisely the "why isn't it in the list?"
              // confusion this feature exists to prevent, reproduced for the people who can
              // least afford it. `aria-disabled` keeps it announced and unselectable.
              aria-disabled={o.disabled || undefined}
              onClick={() => { if (!o.disabled) pick(o.value); }}
              onMouseEnter={() => { if (!o.disabled) setFocusIdx(i); }}
              className={cn(
                "w-full px-3 py-2.5 text-left font-mono text-[14px] transition-colors flex items-start justify-between gap-2",
                "first:rounded-t-lg last:rounded-b-lg",
                o.disabled
                  ? "cursor-not-allowed text-text-faint"
                  : i === focusIdx ? "bg-bg-overlay text-text" : "text-text-muted",
                !o.disabled && o.value === selected && "text-brand-300 font-semibold",
              )}
            >
              <span className="min-w-0 flex-1">
                <span className={cn("block", !o.hint && "truncate")}>{o.label}</span>
                {/* ⚠️ WRAPPED, NOT TRUNCATED. A reason cut off at the panel edge has not been
                    given, and the operator is left exactly where they started. */}
                {o.hint && (
                  <span className="mt-0.5 block whitespace-normal text-[11px] leading-[1.45] text-text-faint">
                    {o.hint}
                  </span>
                )}
              </span>
              {!o.disabled && o.value === selected && (
                <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-1 shrink-0"><path d="M20 6 9 17l-5-5" /></svg>
              )}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}
