"use client";

/**
 * The list's one bulk control — `Mark all read`.
 *
 * ── WHY THIS EXISTS ──────────────────────────────────────────────────────────
 * The bell has had `READ ALL` and `CLEAR ALL` since it was built. This screen — the fuller
 * surface, the one that holds everything the bell's 30-row window cannot — shipped with no
 * bulk control at all: a player with 27 unread had 27 checkmarks to tap. A record you can
 * only act on one row at a time is a worse tool than the glance it replaced.
 *
 * ── AND WHY THERE IS NO `CLEAR ALL` HERE, DELIBERATELY ───────────────────────
 * ⛔ This page is the ARCHIVE. A bulk hide over a PAGINATED list acts on rows the player has
 * never seen — twelve are on screen, the action would take all of them. In the bell that is
 * defensible because the bell is a glance at the newest thirty; here it is not. `CLEAR ALL`
 * stays in the bell, and single rows can still be dismissed from here, one at a time, with
 * the **Cleared** lens as the way back.
 *
 * ⭐ THE BAR'S GRAMMAR MIRRORS THE BELL'S FOOTER STRIP on purpose — status on the left, the
 * action on the right. Two surfaces, one sentence shape, so a player who has read one has
 * read the other.
 */
import { useState, useTransition } from "react";
import { Dot } from "@/components/ui/dot";
import { Button } from "@/components/ui/button";
import { markAllReadOnPageAction } from "@/app/_actions/notifications";

export function NotificationsBulkBar({
  unread,
  label,
  countLabel,
}: {
  unread: number;
  /** Localised in the server component — this file mints no copy of its own. */
  label: string;
  countLabel: string;
}) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  // Nothing unread, nothing to bulk-act on. A control that cannot do anything is furniture.
  if (unread <= 0 || done) return null;

  return (
    <div className="flex items-center justify-between gap-2 rounded-xl glass-panel px-3 py-2">
      <span className="inline-flex items-center gap-1.5 min-w-0">
        {/* §A4 — colour is never the only signal, so the dot is decorative and the COUNT
            carries the message. `Dot` is `aria-hidden` by construction. */}
        <Dot tone="gold" />
        <span className="font-mono text-micro font-bold uppercase text-text-subtle truncate">
          {countLabel}
        </span>
      </span>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        loading={pending}
        onClick={() => {
          /* Optimistic on the CONTROL only, never on the rows. The rows are the server's to
             re-render on revalidate; repainting them here would show a player their own
             money history changing state before anything had been written. */
          setDone(true);
          startTransition(() => {
            void markAllReadOnPageAction().catch(() => setDone(false));
          });
        }}
      >
        {label}
      </Button>
    </div>
  );
}
