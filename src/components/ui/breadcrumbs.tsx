import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export type Crumb = {
  label: string;
  labelSw?: string;
  href?: string;
};

/**
 * Breadcrumbs — bilingual EN · SW pair on the current page only.
 * The trailing crumb is rendered as plain text (not a link) per WAI-ARIA.
 */
export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  if (!items || items.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb" className={cn("text-caption text-text-soft", className)}>
      <ol className="flex flex-wrap items-center gap-1">
        <li className="inline-flex items-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1 rounded px-1 py-0.5 hover:text-text hover:bg-surface-2 transition-colors"
          >
            <Home size={12} aria-hidden />
            <span className="sr-only">Home</span>
          </Link>
        </li>
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${c.label}-${i}`} className="inline-flex items-center gap-1">
              <ChevronRight size={12} aria-hidden className="opacity-60" />
              {last || !c.href ? (
                <span aria-current={last ? "page" : undefined} className="font-medium text-text">
                  {c.label}
                  {last && c.labelSw ? (
                    <span className="text-text-soft font-normal"> · {c.labelSw}</span>
                  ) : null}
                </span>
              ) : (
                <Link
                  href={c.href as never}
                  className="rounded px-1 py-0.5 hover:text-text hover:bg-surface-2 transition-colors"
                >
                  {c.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
