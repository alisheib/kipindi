"use client";

/**
 * Select — kit-themed dropdown replacing native <select>.
 *
 * Dark glass dropdown panel, brand-500 focus ring, mono font.
 * Keyboard navigable (arrows, Home/End, enter, escape, Tab-to-close, type-to-search).
 * Hidden input for form submission.
 *
 * ⭐ A5 · IT IS AN APG SELECT-ONLY COMBOBOX, not a button that looks like one. The trigger
 * names the listbox it owns (`aria-controls`), names the row it is on
 * (`aria-activedescendant`), takes its NAME from a referenced label and leaves its own text
 * to be the VALUE. Everything below that is marked ⭐/⛔ says which defect it closes.
 */

import { useState, useEffect, useRef, useCallback, useId } from "react";
import { createPortal } from "react-dom";
import { useExitPhase } from "@/components/ui/modal";
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
   *  label. Falls back to the placeholder, then the generic "Select…".
   *  ⛔ It no longer falls back to the SELECTED LABEL — that is the control's value, and
   *  naming a control after its own value is how the choice stopped being announced. */
  ariaLabel?: string;
  /** Height floor of the trigger: `xs` 32px (dense admin filter bars), `sm` 36px
   *  (admin forms), `md` 44px (default, player-facing). See the height table near
   *  the `min-h-*` assignment below — those are literals, not scale classes. */
  size?: "md" | "sm" | "xs";
  /** Disable the whole control. Options already carry a per-option `disabled`; this is the
   *  control-level form, added 2026-08-11 for the admin act gate (finding A1) — a role with
   *  VIEW but not ACT must be able to READ the selected value and not change it. ⚠️ Added to
   *  the kit rather than hand-rolled at the call site: `test:ui-consistency` exists because
   *  this codebase has already paid for three hand-rolled copies of a kit primitive. */
  disabled?: boolean;
  /** Why it is disabled, surfaced as the trigger's tooltip. A disabled control with no
   *  reason reads as a bug; the reason turns it into a policy the operator can act on. */
  disabledReason?: string;
};

export function Select({
  name, value, defaultValue, onChange, options, placeholder,
  required, className, ariaLabel, size = "md", disabled, disabledReason,
}: Props) {
  const { t } = useT();
  const controlled = value !== undefined;
  const [internal, setInternal] = useState(defaultValue ?? "");
  const selected = controlled ? value : internal;
  const selectedOption = options.find((o) => o.value === selected);

  const [open, setOpen] = useState(false);
  const [focusIdx, setFocusIdx] = useState(-1);
  const [mounted, setMounted] = useState(false);
  /* §M2 — the float rung pairs `.m-float-in` with `.m-float-out`; the panel used to
     leave by instant unmount, so half the vocabulary was unreachable. `--t-flick`
     is the beat `.m-float-out` itself plays at (motion.css), read from the token
     rather than retyped. Every keyboard/ARIA behaviour below stays keyed to `open`,
     so nothing about the control's contract shifts by a beat — only the paint. */
  const { present, exiting } = useExitPhase(open, "--t-flick");

  /**
   * ⭐ A5 (2026-08-21) — THE IDS THAT MAKE THE LISTBOX EXIST FOR A SCREEN READER.
   *
   * Before this, `focusIdx` was purely visual: the highlighted row moved, and nothing in the
   * accessibility tree moved with it, so an assistive-tech user pressing ArrowDown heard
   * silence. The APG select-only combobox needs three references, and none of them can be
   * built without stable ids — `aria-controls` (the trigger owns a listbox), the per-option
   * id, and `aria-activedescendant` (which of them is current).
   *
   * ⚠️ SANITISED. React 19's `useId` emits `«r0»` where React 18 emitted `:r0:`. Both are
   * legal HTML ids and both are legal IDREFs, but neither survives being written into a
   * selector — which is exactly why `probability-chart.tsx` already strips its own. One
   * shape across the kit costs nothing and removes a whole class of later surprise.
   */
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const listboxId = `sel-${uid}-list`;
  const labelId = `sel-${uid}-label`;
  const optionId = (i: number) => `sel-${uid}-opt-${i}`;

  /**
   * ⭐ THE NAME IS THE LABEL; THE VALUE IS THE SELECTED TEXT. These are two different things
   * and this control used to collapse them into one: `aria-label` was
   * `ariaLabel ?? placeholder ?? selectedOption?.label`, so on any Select that carries a
   * placeholder — which is most of them — the placeholder WON the accessible name and the
   * player's actual choice was never announced at all. A reader heard "Category, combo box"
   * and no category, forever.
   *
   * ⛔ SO THE LABEL IS REFERENCED, NOT INLINED — `aria-labelledby` at a visually hidden span
   * rather than `aria-label` on the trigger. This is the W3C APG select-only combobox shape
   * verbatim, and the reason it is that shape: `aria-label` replaces the element's CONTENT in
   * the name computation, and the content is precisely what a non-editable combobox exposes
   * as its VALUE. Pointing the name at an outside element leaves the trigger's own text free
   * to be the value, in every AT mapping rather than only the forgiving ones.
   *
   * ⚠️ The span is a SIBLING of the button, never a child: `sr-only` is `position: absolute`,
   * so it is out of flow and cannot become a flex/grid item — but text inside the button would
   * have joined the value and announced "Category Sports" as the choice.
   */
  const labelText = ariaLabel ?? placeholder ?? t.common.selectPlaceholder;
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

  // Keyboard on trigger. ⭐ `ArrowUp` opens too (APG): a keyboard user reaching a closed
  // combobox and pressing Up expects the list, not nothing — the same gap Home/End were.
  const onTriggerKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown" || e.key === "ArrowUp") {
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
      // Home / End — the two keys a long list needs most and this control did not answer.
      // `step` from outside the array walks inward to the first (or last) SELECTABLE option,
      // so neither key can strand focus on a disabled row the way a bare 0 / length-1 would.
      if (e.key === "Home") {
        e.preventDefault();
        const first = step(-1, 1);
        if (first >= 0) setFocusIdx(first);
      }
      if (e.key === "End") {
        e.preventDefault();
        const last = step(options.length, -1);
        if (last < options.length) setFocusIdx(last);
      }
      // ⛔ TAB CLOSES THE PANEL. It used to leave it open and hanging over the next field —
      // and because the panel is PORTALLED to the end of <body>, the options are not next in
      // tab order either, so the open list was orphaned from the focus that had left it.
      // ⚠️ Closing does NOT commit the highlighted option: a keystroke whose job is "leave
      // this control" must not be able to change a value on the way out. Enter commits.
      if (e.key === "Tab") { setOpen(false); }
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

  // `xs` is the compact admin filter-row size: a neat 32px control (== --h-control-xs,
  // the documented dense MOUSE-ONLY exception to the 40px floor), 12.5px label, md radius.
  //
  // ⚠️ ARBITRARY LITERALS, NOT SCALE CLASSES. `theme.extend.spacing` is OVERRIDDEN in
  // tailwind.config.ts:200-215, so the `min-h-8` / `min-h-9` / `min-h-11` that used to be
  // here were floors of 48 / 64 / 96px — the 32px this comment claimed had never shipped,
  // and the whole admin filter rail was uniformly ~50% oversized. ⛔ Never a scale token here.
  //
  // ⛔ `min-h-*`, NOT `h-*` — E-98. These were fixed heights, which forced the label span
  // to `truncate`, which silently destroyed the operator's only readout of what they had
  // chosen. Measured on production at 1280: the Add-chain winning band rendered
  // `Smallest possible (reco…` (59px of 298px hidden) and the Edit panel — which lays out
  // inside a ~230px TABLE CELL — rendered `Inherit · smal…`, hiding 162px of a 307px
  // label on the one control that decides what winning means. A floor lets a short label
  // keep the exact height it has today and lets a long one grow instead of vanish.
  const h = size === "xs" ? "min-h-[32px]" : size === "sm" ? "min-h-[36px]" : "min-h-[44px]";
  const txt = size === "xs" ? "text-[12.5px]" : "text-[16px]";
  const radius = size === "xs" ? "rounded-md" : "rounded-lg";
  /* 🔴 THE PADDING IS PER-SIZE, AND IT WAS NOT (2026-08-28, measured on /admin/resolver-queue).
   *
   * The trigger carried a flat `px-3 py-1.5` at EVERY size. On this repo's OVERRIDDEN spacing
   * scale that is 16px sides and 8px top/bottom, so an `xs` control measured **37px** — while
   * the comment above calls it "a neat 32px control (== --h-control-xs)". 32px had never
   * shipped: the same defect that comment exists to record about the old `min-h-8` floors,
   * one line below it.
   *
   * ⛔ AND THE HORIZONTAL HALF WAS THE VISIBLE ONE. 32px of side padding + a 10px chevron + an
   * 8px gap is 50px of chrome, so a 150px filter chip had ~100px for its label — and "All
   * categories" at 12.5px mono needs ~105px. It WRAPPED, and because the height is `min-h`
   * (rightly — E-98: wrapping is honest, clipping is data loss) the control GREW to **56px**
   * and sat beside 32px neighbours. Measured in one row: 32 / 37 / 56px, a 24px spread.
   *
   * ⚠️ Overridden keys only: `px-2` is 12px and `py-1` is 4px here, both monotonic. `px-2.5` /
   * `py-1.5` are the INVERTED rungs `test:spacing-scale` refuses — smaller than their lower
   * neighbour — so they are not available even though they look like the finer step. */
  const pad = size === "xs" ? "px-2 py-1" : "px-3 py-1.5";
  /* ⚠️ AND THE GAP, measured rather than guessed. After the padding fix "All categories" still
   * wrapped: it needs 105px and the label box was 102px — THREE pixels short, because a 12px
   * gap to the chevron was taking room the label needed. At xs the chevron sits closer, which
   * is ordinary for a dense control and buys 8px. ⭐ Wrapping remains the FALLBACK for a label
   * that genuinely cannot fit (E-98: growing is honest, clipping is data loss) — this only
   * stops a label that FITS from being forced to wrap by the chrome around it. */
  const gap = size === "xs" ? "gap-1" : "gap-2";

  return (
    <>
      {/* The name, referenced not inlined — see `labelText` above for why it is a sibling. */}
      <span id={labelId} className="sr-only">{labelText}</span>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        title={disabledReason}
        onClick={() => open ? setOpen(false) : openDropdown()}
        onKeyDown={onTriggerKey}
        role="combobox"
        aria-labelledby={labelId}
        aria-expanded={open}
        aria-haspopup="listbox"
        /* ⛔ EMITTED ONLY WHILE OPEN. The listbox is portalled and does not exist in the DOM
           when the panel is shut, and an `aria-controls` pointing at an absent id is a
           dangling IDREF — some ATs report the whole relationship as broken rather than
           ignoring it. Same reason `aria-activedescendant` is dropped when nothing is
           highlighted: an empty string is a claim, `undefined` is silence. */
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={open && focusIdx >= 0 ? optionId(focusIdx) : undefined}
        className={cn(
          "field-measure flex items-center justify-between w-full border border-border text-left",
          "focus:outline-none brand-focus",
          "transition-colors font-mono",
          radius, txt, h, pad, gap,
          selectedOption ? "text-text" : "text-text-subtle",
          disabled && "cursor-not-allowed opacity-50",
          className,
        )}
        style={{ background: "var(--bg-inset)" }}
      >
        {/* ⛔ NOT `truncate` — E-98. A dropdown's closed trigger is the ONLY place the
            operator reads what they chose, so hiding part of it is data loss, not a layout
            fix (`scripts/admin-clip.test.mts` §1.3 already says exactly that about the KPI
            delta). `truncate` also defeats measurement: `innerText` returns the full string
            whatever the ellipsis paints, so a check asserting the words are "still there"
            passes with the label 100% invisible — one of this session's own checks did.
            Wrapping is the honest behaviour: the control grows, nothing disappears, and
            `min-h-*` keeps every short label at exactly the height it had before. */}
        <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
          {selectedOption?.label ?? placeholder ?? t.common.selectPlaceholder}
        </span>
        <svg viewBox="0 0 12 12" width={10} height={10} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-text-subtle" aria-hidden>
          <path d="M3 4.5l3 3 3-3" />
        </svg>
      </button>

      {name && <input type="hidden" name={name} value={selected} />}

      {mounted && present && createPortal(
        <div
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-labelledby={labelId}
          /* Leaving: focus is already back on the trigger and `aria-controls` has
             been dropped, so the fading copy must stop being announced and stop
             taking clicks — an option still hittable during the fade would commit
             a value the user closed the list to avoid. */
          aria-hidden={exiting || undefined}
          className={cn(
            exiting ? "m-float-out pointer-events-none" : "m-float-in",
            "fixed z-[130] rounded-control border border-border-strong bg-bg-elevated shadow-overlay overflow-y-auto overscroll-contain",
          )}
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
              id={optionId(i)}
              type="button"
              role="option"
              /* ⛔ OUT OF THE TAB ORDER, deliberately. Focus never leaves the trigger — the
                 highlighted row is named by `aria-activedescendant`, which is the whole point
                 of that attribute. Leaving these tabbable would put a stack of buttons at the
                 END of <body> (the portal) in the middle of the page's tab sequence. */
              tabIndex={-1}
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
                  <span className="mt-0.5 block whitespace-normal text-body-sm leading-[1.45] text-text-faint">
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
