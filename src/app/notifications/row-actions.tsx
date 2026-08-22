"use client";

/**
 * The per-row controls on `/notifications` — the only client JS this page needs.
 *
 * The list itself is server-rendered and URL-driven; only these two mutations need a click
 * handler, so the interactive surface is kept as small as the page can make it.
 *
 * ⛔ BOTH ACTIONS REVALIDATE ON THE SERVER. A row that has just left the lens the reader is
 * looking at (restored out of **Cleared**, or read out of **Unread**) must not linger — a
 * list that disagrees with its own filter is how a player concludes the page is lying about
 * what it holds. The actions call `revalidatePath("/notifications")`, so the pill counts and
 * the rows re-read together rather than drifting apart.
 */
import { useState, useTransition } from "react";
import { I } from "@/components/ui/glyphs";
import { restoreNotifAction, markNotifReadOnPageAction, dismissNotifOnPageAction } from "@/app/_actions/notifications";

export function NotificationRowActions({
  id,
  unread,
  cleared,
  restoreLabel,
  readLabel,
  dismissLabel,
}: {
  id: string;
  unread: boolean;
  cleared: boolean;
  /** Localised in the server component — this file mints no copy of its own. */
  restoreLabel: string;
  readLabel: string;
  dismissLabel: string;
}) {
  const [pending, startTransition] = useTransition();
  /* Optimistic hide of the control only — never of the ROW. The row is the server's to
     remove on revalidate; hiding it here would show a player their money record vanishing
     before anything had been written, and put it back if the write failed. */
  const [done, setDone] = useState(false);

  if (done) return null;

  const run = (fn: () => Promise<unknown>) => {
    setDone(true);
    startTransition(() => {
      void fn().catch(() => setDone(false)); // the control coming back IS the failure notice
    });
  };

  if (cleared) {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => restoreNotifAction(id))}
        /* ≥44px tap target on a player surface (`test:tap-target`). The label is text, not a
           bare glyph, because "what does this arrow do" is not a question to ask someone
           about their own money history. */
        className="shrink-0 inline-flex items-center gap-1 min-h-[44px] px-2 rounded-md font-mono text-micro font-bold uppercase text-accent-400 hover:text-text hover:bg-bg-overlay transition-colors disabled:opacity-50"
      >
        <I.rotateCcw s={12} />
        {restoreLabel}
      </button>
    );
  }

  /* ⭐ TWO CONTROLS, AND THE ORDER IS THE POINT. Mark-read first because it is the
     ordinary action; dismiss second because it REMOVES the row from view. Both are ≥44px
     and both are icon-only with an `aria-label`, matching the bell's own ✕.
     ⛔ Dismiss is offered on the ARCHIVE only because it is reversible: it stamps
     `dismissedAt`, and the **Cleared** lens plus Restore are the way back. Without that
     lens this control would be a delete button wearing a tidy-up label. */
  return (
    <span className="shrink-0 inline-flex items-center gap-0.5">
      {unread && (
        <button
          type="button"
          disabled={pending}
          aria-label={readLabel}
          onClick={() => run(() => markNotifReadOnPageAction(id))}
          className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-md text-text-subtle hover:text-text hover:bg-bg-overlay transition-colors disabled:opacity-50"
        >
          <I.check s={14} />
        </button>
      )}
      <button
        type="button"
        disabled={pending}
        aria-label={dismissLabel}
        onClick={() => run(() => dismissNotifOnPageAction(id))}
        className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-md text-text-subtle hover:text-no-300 hover:bg-bg-overlay transition-colors disabled:opacity-50"
      >
        <I.x s={13} />
      </button>
    </span>
  );
}
