"use client";

/**
 * "Re-check this market now" — run the AI resolution check on ONE market on demand.
 *
 * Replaces the old global "Run sentinel sweep" button: there is no sweep any more,
 * each market is checked at its own resolution time. This is the manual override for
 * a single market — useful when a result lands early, or to re-read a market whose
 * source had not published when its timer fired.
 *
 * Safe before the resolve date: if the AI finds no locked outcome the market stays
 * open for betting (only its recommendation is recorded).
 */

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDeferredToast } from "@/components/ui/toast";
import { I } from "@/components/ui/glyphs";
import { Spinner } from "@/components/ui/spinner";
import { recheckMarketNowAction } from "./resolution-mode-action";
import { useMayAct, ActReadOnly } from "@/components/admin/act-gate";

export function RecheckButton({ marketId }: { marketId: string }) {
  // A1 — this control only ACTS, so a role holding VIEW without ACT is shown why rather
  // than being offered a button the server will refuse (and logged as a privilege
  // escalation for pressing it). See docs/ADMIN-CONSOLE-FINDINGS.md.
  const mayAct = useMayAct();

  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const router = useRouter();
  // B-28 — success toasts ride the transition's falling edge (data visible when announced)
  const { toast, deferToast } = useDeferredToast(pending);

  /**
   * ⭐ AN ELAPSED COUNTER, BECAUSE THIS CALL GOT MUCH SLOWER AND A BARE SPINNER READS AS A
   * HUNG PAGE.
   *
   * The check is one round trip to a web-searching, web-fetching model. Since the approved
   * source became a server-side fence (`market-sentinel.ts`) it does a pinned SEARCH and
   * then FETCHES the live page, so 20–45 seconds is the normal case, not the slow one. A
   * spinner that says only *"Checking…"* for forty seconds is indistinguishable from a
   * frozen console, and the officer's next move is to press it again — a second paid AI
   * call against a metered budget, on a market already claimed by the first.
   *
   * ⛔ IT COUNTS UP, AND IT DOES NOT PRETEND TO A PERCENTAGE. There is no progress signal
   * to read: the model decides how many searches it needs. A determinate bar here would be
   * a fabricated number on an admin surface, which is the same defect as a fabricated
   * price — so the honest instrument is elapsed time plus a stated expectation.
   *
   * ⚠️ Keyed off `pending` alone, so it resets on every run and cannot leak a stale count
   * from a previous press into the next one.
   */
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef<number | null>(null);
  useEffect(() => {
    if (!pending) {
      startedAt.current = null;
      setElapsed(0);
      return;
    }
    startedAt.current = Date.now();
    setElapsed(0);
    const tick = setInterval(() => {
      if (startedAt.current !== null) {
        setElapsed(Math.round((Date.now() - startedAt.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [pending]);

  // Rules of hooks: read the gate as a hook at the top, ACT on it below every other hook.
  // Revoking an ACT grant mid-session flips `mayAct` on the next router.refresh(); an early
  // return above these hooks would render fewer hooks than the last pass and crash the page.
  if (!mayAct) return <ActReadOnly />;

  const run = () => {
    setDone(false);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("marketId", marketId);
      const r = await recheckMarketNowAction(fd);
      if (!r.ok) {
        toast({ title: "Re-check failed", description: r.error, variant: "danger" });
        return;
      }
      setDone(true);
      // "AI sealed" announces as a warning (immediate); the success outcomes defer to the refresh.
      (r.status === "resolved-auto" ? toast : deferToast)({
        title: r.status === "resolved-auto" ? "AI sealed this market"
          : r.status === "closed-human" ? "Closed — ready for the ceremony"
          : "Re-check complete",
        description: r.detail,
        variant: r.status === "resolved-auto" ? "warning" : "success",
      });
      router.refresh();
    });
  };

  return (
    <div>
      <button
        type="button"
        onClick={run}
        disabled={pending}
        title="Ask the AI to web-check this market's outcome right now. It reads the market's own approved source. Before its resolve date this cannot close the market unless the outcome is genuinely locked."
        className="inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-md border border-border bg-bg-overlay px-3 font-mono text-[11px] tracking-[0.08em] uppercase text-text-muted transition-colors hover:border-brand-500 hover:text-text disabled:opacity-50"
      >
        {/* M5 — in-flight is the kit Spinner (a glyph never wears bespoke motion);
            the check ARRIVES on the state change through the settle primitive. */}
        {pending ? <Spinner size={12} /> : done ? <I.check s={12} className="g-settle" /> : <I.sparkle s={12} />}
        {/* ⛔ THE SECONDS LIVE IN A `tabular-nums` SPAN OF ITS OWN. Dropped inline, the
            label re-centres on every tick as the digit width changes and the whole button
            twitches once a second — motion nobody asked for on a settlement surface. */}
        {pending ? (
          <>
            Checking…
            <span className="tabular-nums text-text-subtle">{elapsed}s</span>
          </>
        ) : (
          "Re-check this market now"
        )}
      </button>

      {/* ⭐ WHAT IT IS DOING AND HOW LONG THAT TAKES — stated once, while it runs.
          ⛔ It describes the OPERATION, not a live phase. The action returns one result at
          the end; there is no stream of progress events to read, so "reading
          premierleague.com" would be a claim this component cannot support. It says what
          the check always does, which is true for its whole duration.
          ⚠️ `aria-live="polite"` so a screen-reader user is told the wait is normal too —
          without it the only announcement is the toast, forty seconds later. */}
      {pending && (
        <p aria-live="polite" className="mt-1.5 font-mono text-micro leading-relaxed text-text-subtle">
          Searching this market&apos;s approved source and reading the page.
          {elapsed >= 45
            ? " Taking longer than usual — it will finish or report an error; do not press again."
            : " Usually 20–45 seconds."}
        </p>
      )}
    </div>
  );
}
