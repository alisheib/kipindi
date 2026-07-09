"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const DEFAULT_SEGMENTS = [
  { id: "today",  label: "Today" },
  { id: "7d",     label: "7d" },
  { id: "28d",    label: "28d" },
  { id: "qtd",    label: "QTD" },
] as const;

/** Clickable segmented range picker. Round-trips via `?range=`. The segment
 *  set + the value that omits the param are configurable so the reports console
 *  can offer Today/7d/30d/MTD while finance keeps Today/7d/28d/QTD. */
export function PeriodPicker({
  segments = DEFAULT_SEGMENTS,
  defaultId = "7d",
}: {
  segments?: ReadonlyArray<{ id: string; label: string }>;
  defaultId?: string;
} = {}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeId = searchParams.get("range") ?? defaultId;

  const href = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id === defaultId) params.delete("range");
    else params.set("range", id);
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  return (
    <div className="inline-flex border border-border-strong rounded-lg overflow-hidden font-mono text-micro"
         style={{ background: "radial-gradient(130% 150% at 0% 0%, oklch(22% 0.120 268) 0%, oklch(17% 0.090 268) 58%)", boxShadow: "var(--shadow-2), inset 0 1px 0 oklch(100% 0 0 / 0.05)" }}>
      {segments.map((s) => {
        const isActive = s.id === activeId;
        return (
          <Link
            key={s.id}
            href={href(s.id) as never}
            scroll={false}
            className={[
              "px-3 h-8 inline-flex items-center border-r border-border last:border-r-0 transition-all cursor-pointer select-none",
              isActive
                ? "text-white font-bold"
                : "text-text-subtle hover:text-text",
            ].join(" ")}
            style={isActive ? {
              background: "linear-gradient(180deg, oklch(32% 0.155 268) 0%, oklch(25% 0.140 268) 100%)",
              boxShadow: "inset 0 1px 0 oklch(100% 0 0 / 0.08), 0 0 8px -2px oklch(55% 0.18 268 / 0.4)",
            } : { background: "transparent" }}
          >
            {s.label}
          </Link>
        );
      })}
    </div>
  );
}
