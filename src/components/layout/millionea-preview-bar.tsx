"use client";

/**
 * ⭐ MASWALI MILLIONEA'S STAFF PREVIEW BAR (MASWALI-BUILD S5-FIX-PLATFORM D12, 2026-10-21) — ONE bar above the page, the
 * platform's preview marker: the journey's `PreviewMarker` recipe (the kit's info NoticeBar, the eye in Fill), first
 * under the header, where S5 drew a callout inside each Millionea page's column (`MillioneaPreviewMark`, which draws
 * nothing since). Its words are the existing preview key (`millionea.previewMark`), handed in by AppShell.
 * ⛔ MOUNTED ONLY FOR A PREVIEW: AppShell renders this only while the rollout shows Millionea to the request AS A PREVIEW
 * (`resolveMillionea().preview`: STAFF_PREVIEW and a stored staff role — never WITHDRAWN, never ACTIVE, never a player),
 * so for every other request it is in neither the page nor its payload. Its preview is a role, not a pass, so it has no
 * exit (the journey's "Exit preview" ends a pass).
 * ⭐ IT READS THE PAGE IN THE BROWSER. AppShell is the root layout's, and a move between pages does not render a layout
 * again, so a pathname read on the server would keep the bar of a page left behind and miss the one arrived at. The
 * router's address is current on every move: the bar stands on every Millionea page (`isMillioneaPath`) and on /results,
 * whose Millionea section wore the old callout — and on no other page.
 */
import { usePathname } from "next/navigation";
import { NoticeBar } from "@/components/ui/notice-bar";
import { isMillioneaPath } from "@/lib/millionea-edge";

/** The pages that draw Millionea for its preview: its own addresses, and /results (its section). */
export function millioneaPreviewPage(pathname: string | null | undefined): boolean {
  return typeof pathname === "string" && (isMillioneaPath(pathname) || pathname === "/results");
}

export function MillioneaPreviewBar({ label }: { label: string }) {
  const pathname = usePathname();
  if (!millioneaPreviewPage(pathname)) return null;
  return (
    <NoticeBar tone="info" glyph="eye" testId="millionea-preview-mark">
      {label}
    </NoticeBar>
  );
}
