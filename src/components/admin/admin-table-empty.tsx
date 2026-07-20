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
    <tr>
      <td colSpan={colSpan} className={className}>
        <EmptyState kind={kind} title={title} body={body} action={action} />
      </td>
    </tr>
  );
}
