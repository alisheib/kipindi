/**
 * An empty state's way onward — a `.btn` link that ends on the family's arrow (PHOSPHOR-MIGRATION W4, §8a).
 *
 * ⭐ WHY IT EXISTS. The way onward from an empty list ("Browse markets", "Browse live markets", "Browse all markets") was
 * drawn three ways: three strings per language ended in a typed "→" (/live, /results, and /positions' words, which
 * /fairness, /leaderboard and /positions/performance borrow), the same words on /watchlist and /profile/activity had no
 * arrow at all, and /proposals' twin drew the family's arrow in its Button's trailing slot. One recipe now: the
 * words carry no arrow, and the arrow is the family's mark among words — stroked at the label's own Inter 600 stem, its ink
 * on the control's end padding (the edge rule, R9-A4 / R10-A6), as every centred control frames its glyph.
 * ⛔ Not for a link that clears or undoes something ("Clear search"): that is not a way onward, and it stays plain.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { I } from "@/components/ui/glyphs";

export function EmptyStateLink({ href, size = "sm", children }: { href: string; size?: "sm" | "md"; children: ReactNode }) {
  return (
    <Link href={href as never} className={`btn btn-primary btn-${size}`}>
      {children}
      <I.arrowRight s={size === "sm" ? 13 : 14} edge="end" text="body-600" />
    </Link>
  );
}
