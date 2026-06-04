"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const SEGMENTS = [
  { id: "today",  label: "Today" },
  { id: "7d",     label: "7d" },
  { id: "28d",    label: "28d" },
  { id: "qtd",    label: "QTD" },
] as const;

/** Clickable 5-segment range picker. Round-trips via `?range=`. */
export function PeriodPicker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeId = searchParams.get("range") ?? "7d";

  const href = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id === "7d") params.delete("range");
    else params.set("range", id);
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  return (
    <div className="inline-flex border border-border rounded-md overflow-hidden bg-bg-elevated font-mono text-micro">
      {SEGMENTS.map((s) => {
        const isActive = s.id === activeId;
        return (
          <Link
            key={s.id}
            href={href(s.id) as never}
            scroll={false}
            className={[
              "px-2.5 h-7 inline-flex items-center border-r border-border last:border-r-0 transition-colors cursor-pointer select-none",
              isActive
                ? "bg-royal text-white font-bold"
                : "text-text-secondary hover:bg-bg-sunken hover:text-text",
            ].join(" ")}
          >
            {s.label}
          </Link>
        );
      })}
    </div>
  );
}
