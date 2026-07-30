"use client";

/**
 * Per-round operator actions on the Up & Down round explorer.
 *
 * KIT-ONLY, and the same interaction contract as every other admin surface:
 *  · a consequential action confirms through the kit `ConfirmDialog` — never the native
 *    browser confirm();
 *  · the mutation runs in `useTransition` and the success toast fires on the falling
 *    edge of pending via `useDeferredToast`, so it lands when `router.refresh()` has
 *    actually committed rather than on a setTimeout;
 *  · server refusals are shown VERBATIM — the service says exactly why ("Round is
 *    already settled — its money has moved"), and rewriting that into "failed" throws
 *    away the only useful part;
 *  · the reason is validated on the client for immediate feedback AND on the server,
 *    which is the authority.
 *
 * ⛔ WHY THIS EXISTS. `voidRoundByOperator` was written and then called by NOTHING —
 * no route, no action, no button. When production accumulated 1,398 rounds that could
 * not resolve, no operator could return the money either, because Up & Down rounds are
 * also filtered out of /admin/markets (`listMarkets()` defaults to productLine
 * "MARKET"), so the emergency-void control there could not see them. This is the escape
 * hatch that was missing.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDeferredToast } from "@/components/ui/toast";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { voidRoundAction } from "../actions";

const MIN_REASON = 8;
const MAX_REASON = 300;

export function VoidRoundButton({
  roundId,
  label,
  volume,
  players,
}: {
  roundId: string;
  /** e.g. "XAU 15m #412" — so the dialog names the exact round, not "this round". */
  label: string;
  /** Formatted money already at risk on the round, for the confirm copy. */
  volume: string;
  players: number;
}) {
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState("");
  const router = useRouter();
  const { toast, deferToast } = useDeferredToast(pending);

  function submit() {
    const trimmed = reason.trim();
    // Client-side check for immediate feedback; the server re-checks and is the authority.
    if (trimmed.length < MIN_REASON) {
      toast({
        title: "A reason is required",
        description: `At least ${MIN_REASON} characters. It is written to the audit trail and is the only record of why this money moved.`,
        variant: "danger",
      });
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", roundId);
      fd.set("reason", trimmed);
      const res = await voidRoundAction(fd);
      if (res.ok) {
        setReason("");
        deferToast({
          title: `${label} voided · Batili`,
          description: players > 0
            ? `Every stake refunded in full — ${volume} back to ${players} player${players === 1 ? "" : "s"}.`
            : "Round voided. No stakes were on it, so no refund was needed.",
          variant: "success",
        });
        router.refresh();
      } else {
        // Verbatim — the service explains exactly why.
        toast({ title: "Could not void", description: res.error, variant: "danger" });
      }
    });
  }

  const tooShort = reason.trim().length > 0 && reason.trim().length < MIN_REASON;

  return (
    <ConfirmDialog
      trigger={
        <button
          type="button"
          disabled={pending}
          aria-label={`Void ${label} and refund every stake`}
          className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-text-subtle hover:text-no-300 disabled:opacity-50 transition-colors px-2 py-1.5 min-h-[40px]"
        >
          {pending ? "Voiding…" : "Void"}
        </button>
      }
      title={`Void ${label}?`}
      tone="claret"
      confirmLabel={players > 0 ? `Void and refund ${volume}` : "Void round"}
      onOpen={() => setReason("")}
      body={
        <div className="space-y-3">
          <p>
            {players > 0 ? (
              <>
                Every stake is refunded <strong>in full</strong> — {volume} returns to{" "}
                {players} player{players === 1 ? "" : "s"}. No fee is charged on a voided
                round.
              </>
            ) : (
              <>No stakes are on this round, so nothing will be refunded.</>
            )}
          </p>
          <p className="text-text-subtle">
            Use this when the round cannot be settled honestly — for example its source
            cannot be read. It cannot be undone once the money has moved.
          </p>
          <label className="block">
            <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle mb-1">
              Reason (recorded in the audit trail)
            </span>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={MAX_REASON}
              placeholder="e.g. source page unreadable, refunding players"
              error={tooShort}
              size="sm"
            />
            <span className="mt-1 block font-mono text-[10px] text-text-subtle">
              {tooShort
                ? `${MIN_REASON - reason.trim().length} more character${MIN_REASON - reason.trim().length === 1 ? "" : "s"} needed`
                : `${reason.trim().length}/${MAX_REASON}`}
            </span>
          </label>
        </div>
      }
      onConfirm={submit}
    />
  );
}
