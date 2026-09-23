import type { ComponentProps, ReactNode } from "react";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * AdminTableEmpty — the ONE way an admin table renders its zero-row state: a
 * full-width row whose single `colSpan` cell holds the shared <EmptyState>
 * line-art atom, replacing the hand-rolled `<td colSpan>plain text</td>` that
 * ~15 admin tables each reinvented (admin audit 2026-06-28 §3). Mirrors the
 * pattern `admin/audit/page.tsx` already uses, so every empty table across the
 * console reads the same.
 *
 * Server-safe: it only *renders* the client <EmptyState>; no hooks here.
 */
export function AdminTableEmpty({
  colSpan,
  kind = "admin",
  title,
  body,
  action,
  className = "px-4 py-8",
}: {
  colSpan: number;
  kind?: ComponentProps<typeof EmptyState>["kind"];
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    /**
     * ⛔ `data-table-empty` IS READ BY CSS, NOT BY A TEST (D9 minor M5, 2026-09-23) — see
     * `.admin-tbl:has(> tbody > tr[data-table-empty])` in `globals.css`. A table with no rows has nothing its
     * column floors can be protecting, and those floors were still forcing a sideways scroller over a single
     * message: measured on the desk's Targets tab at 360, `POLL` 150px + `STATUS` 128px + `LAST CHANGE` put the
     * header strip past the viewport with an empty body underneath it. The marker goes HERE, on the one component
     * every admin table's zero-row state goes through, so no call site has to remember it.
     */
    <tr data-table-empty>
      <td colSpan={colSpan} className={className}>
        {/* ⭐ PINNED TO THE VISIBLE STRIP (2026-09-13). The cell spans the whole table, and these tables carry a
            720–980px minimum inside a sideways scroller — so at 390 the message centred across the full width,
            off-screen to the right. Below lg (no sidebar) the wrapper is capped at the scroller's visible width
            (the viewport less body 20 + border 1 + card 20 + cell 20 per side = 122px) and sticks to its left
            edge while the table scrolls. From lg up it is the full cell, so the desktop render is unchanged. */}
        <div className="sticky left-0 max-w-[calc(100vw-122px)] lg:max-w-none">
          <EmptyState kind={kind} title={title} body={body} action={action} />
        </div>
      </td>
    </tr>
  );
}
