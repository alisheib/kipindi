"use client";

/**
 * MenuShell — the sort / topic menu on the /markets discovery bar.
 *
 * COMPONENTS §4 (sort) and the kit's correction round 2.6, which replaced the eight-pill topic
 * wall with a single menu of the same shape as sort.
 *
 * ⭐ BUILT ON `<details>`, NOT ON STATE. The board is a server component and every option is a
 * real `<Link>`, so the whole control works with JavaScript disabled: the disclosure opens
 * natively and the options navigate natively. The client code here is pure enhancement —
 * Escape and outside-click — and nothing breaks without it. That matters on a board a player
 * reaches on a mid-range Android over a Tanzanian mobile connection.
 *
 * ⚠️ `min-h-[44px]` and `w-[44px]` are arbitrary values on purpose: Tailwind's spacing scale is
 * OVERRIDDEN in this repo (`h-8` = 48px, `h-10` = 80px — `tailwind.config.ts:156-171`), so a
 * scale class would silently be the wrong size. 44 is the tap floor and a real constant.
 */
import { useEffect, useRef } from "react";
import { I } from "@/components/ui/glyphs";
import { cn } from "@/lib/utils";

export function MenuShell({
  label,
  value,
  count,
  ariaLabel,
  className,
  rootClassName,
  children,
}: {
  /** The quiet key — never truncates. */
  label: string;
  /** The current value — ellipsises before the key does (the kit's own wrap rule). */
  value: string;
  count?: number;
  ariaLabel: string;
  /** Classes for the SUMMARY — the visible control. */
  className?: string;
  /** Classes for the `<details>` root, so the caller can place the control in its row. */
  rootClassName?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const close = () => el.removeAttribute("open");
    const onDocDown = (e: MouseEvent) => {
      if (el.open && e.target instanceof Node && !el.contains(e.target)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && el.open) {
        close();
        el.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <details ref={ref} className={cn("kp-menu relative shrink-0", rootClassName)}>
      <summary
        aria-label={ariaLabel}
        className={cn(
          "inline-flex min-h-[44px] shrink-0 cursor-pointer list-none items-center gap-2 border border-border-control bg-bg-inset px-3 text-text-muted hover:text-text",
          className,
        )}
      >
        {/* The KEY never truncates; the VALUE ellipsises. Swahili short labels measure
            1.74× p90 / 2.25× p95 against English, so the value is the part that must give. */}
        <span className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-text-subtle">
          {label}
        </span>
        <span className="min-w-0 truncate text-[13px] font-semibold text-text">{value}</span>
        {count != null && (
          <span className="shrink-0 font-mono text-[11px] font-bold tabular-nums text-text-faint">{count}</span>
        )}
        <I.chevronDown s={14} aria-hidden className="kp-menu-caret shrink-0 opacity-70" />
      </summary>
      <div
        role="listbox"
        aria-label={ariaLabel}
        className="absolute left-0 top-[calc(100%+6px)] z-30 max-h-[min(60vh,420px)] min-w-[220px] overflow-y-auto rounded-md border border-border bg-bg-elevated py-1 kp-thin-scroll"
        style={{ boxShadow: "var(--shadow-overlay)" }}
      >
        {children}
      </div>
    </details>
  );
}
