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

type Option = { value: string; label: string };

type Props = {
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  options: Option[];
  placeholder?: string;
  required?: boolean;
  className?: string;
  /** Compact size for admin filter bars. `xs` (h-9) matches the kit's compact
   *  search inputs + btn-sm height so filter rows align flush. */
  size?: "md" | "sm" | "xs";
};

export function Select({
  name, value, defaultValue, onChange, options, placeholder,
  required, className, size = "md",
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
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => { setMounted(true); }, []);

  const pick = useCallback((val: string) => {
    if (!controlled) setInternal(val);
    onChange?.(val);
    setOpen(false);
    triggerRef.current?.focus();
  }, [controlled, onChange]);

  const openDropdown = () => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const below = window.innerHeight - r.bottom;
    const above = r.top;
    // Position below if space, otherwise above
    if (below >= 200 || below >= above) {
      setPos({ top: r.bottom + 4, left: r.left, width: r.width });
    } else {
      setPos({ top: r.top - 4, left: r.left, width: r.width });
    }
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
      if (e.key === "ArrowDown") { e.preventDefault(); setFocusIdx((i) => Math.min(options.length - 1, i + 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setFocusIdx((i) => Math.max(0, i - 1)); }
      if (e.key === "Enter") { e.preventDefault(); if (focusIdx >= 0) pick(options[focusIdx].value); }
      // Type-to-search: jump to first option starting with typed char
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        const char = e.key.toLowerCase();
        const idx = options.findIndex((o) => o.label.toLowerCase().startsWith(char));
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

  const h = size === "xs" ? "h-9" : size === "sm" ? "h-9" : "h-11";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => open ? setOpen(false) : openDropdown()}
        onKeyDown={onTriggerKey}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          "flex items-center justify-between gap-2 w-full px-3 rounded-lg border border-border text-left",
          "focus:outline-none brand-focus",
          "transition-colors font-mono text-[16px]",
          h,
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
          className="fixed z-[130] rounded-lg border border-border-strong bg-bg-elevated shadow-[0_16px_48px_-8px_rgba(0,0,0,0.6)] overflow-y-auto overscroll-contain"
          style={{
            top: pos.top,
            left: pos.left,
            width: pos.width,
            maxHeight: 240,
          }}
        >
          {options.map((o, i) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === selected}
              onClick={() => pick(o.value)}
              onMouseEnter={() => setFocusIdx(i)}
              className={cn(
                "w-full px-3 py-2.5 text-left font-mono text-[14px] transition-colors truncate",
                "first:rounded-t-lg last:rounded-b-lg",
                i === focusIdx ? "bg-bg-overlay text-text" : "text-text-muted",
                o.value === selected && "text-gold-300 font-semibold",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}
