"use client";

/**
 * The officer's ruling on a player's objection.
 *
 * Upholding is a MONEY act: VOID refunds every stake, REVERSE pays the other side
 * instead. Both are only possible because the market has not settled — the pool is
 * still whole. So both go behind an explicit confirm with a mandatory note, and
 * the confirm says in plain words what the money will do.
 */
import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { I } from "@/components/ui/glyphs";
import { OBJECTION } from "@/lib/admin-status-lexicon";
import { upholdObjectionAction, rejectObjectionAction } from "./actions";
import { useRouter } from "next/navigation";

type Mode = "UPHOLD_VOID" | "UPHOLD_REVERSE" | "REJECT";

const COPY: Record<Mode, { title: string; effect: string; cta: string; danger?: boolean }> = {
  UPHOLD_VOID: {
    title: OBJECTION.remedyVoid.en,
    effect:
      "The market is voided and EVERY stake is refunded in full, at 0% fee. Nobody wins. This is irreversible once the refunds run.",
    cta: "Uphold · void & refund",
    danger: true,
  },
  UPHOLD_REVERSE: {
    title: OBJECTION.remedyReverse.en,
    effect:
      "The verdict flips to the opposite side. The players you were about to pay will be paid NOTHING, and the other side will be paid instead. A fresh objection window opens for the side this now goes against.",
    cta: "Uphold · reverse the verdict",
    danger: true,
  },
  REJECT: {
    title: "Reject the objection",
    effect:
      "The verdict stands. This releases the settlement freeze — the market pays out on the next sweep once its window has closed.",
    cta: "Reject · verdict stands",
  },
};

export function ObjectionDecision({ objectionId, canReverse, canDecide = true }: { objectionId: string; canReverse: boolean; canDecide?: boolean }) {
  const { toast } = useToast();
  const router = useRouter();
  const [mode, setMode] = useState<Mode | null>(null);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  // Upholding/rejecting is COMPLIANCE-gated in the action. A MODERATOR can VIEW
  // this queue (market-ops) but must not be shown buttons that redirect them to
  // the login screen — show a clear read-only marker instead.
  if (!canDecide) {
    return (
      <span
        className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-text-tertiary"
        title="Upholding or rejecting an objection is a compliance decision — ask an Admin or Compliance officer."
      >
        <I.alertCircle s={12} /> Compliance only
      </span>
    );
  }

  const submit = () => {
    if (!mode) return;
    start(async () => {
      const fd = new FormData();
      fd.set("objectionId", objectionId);
      fd.set("note", note);
      let r: { ok: boolean; error?: string };
      if (mode === "REJECT") {
        r = await rejectObjectionAction(fd);
      } else {
        fd.set("remedy", mode === "UPHOLD_VOID" ? "VOID" : "REVERSE");
        r = await upholdObjectionAction(fd);
      }
      if (!r.ok) {
        toast({ title: r.error ?? "Could not record the decision", variant: "danger" });
        return;
      }
      setMode(null);
      setNote("");
      toast({ title: "Decision recorded", variant: "success" });
      router.refresh();
    });
  };

  const copy = mode ? COPY[mode] : null;

  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setMode("UPHOLD_VOID")}
          className="inline-flex min-h-[40px] items-center gap-1 rounded-md border border-warning-border bg-warning-bg/20 px-2.5 py-1.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.08em] text-warning-fg hover:bg-warning-bg/40 transition-colors brand-focus"
        >
          Void
        </button>
        {canReverse && (
          <button
            type="button"
            onClick={() => setMode("UPHOLD_REVERSE")}
            className="inline-flex min-h-[40px] items-center gap-1 rounded-md border border-warning-border bg-warning-bg/20 px-2.5 py-1.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.08em] text-warning-fg hover:bg-warning-bg/40 transition-colors brand-focus"
          >
            Reverse
          </button>
        )}
        <button
          type="button"
          onClick={() => setMode("REJECT")}
          className="inline-flex min-h-[40px] items-center gap-1 rounded-md border border-border bg-bg-overlay px-2.5 py-1.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.08em] text-text-muted hover:border-border-strong hover:text-text transition-colors brand-focus"
        >
          Reject
        </button>
      </div>

      <Modal
        open={mode !== null}
        onClose={() => !pending && setMode(null)}
        role="alertdialog"
        closeOnScrim={false}
        labelledBy="objection-decision-title"
        maxWidth={460}
      >
        {copy && (
          <div className="space-y-4">
            <h2 id="objection-decision-title" className="font-display text-[16px] font-semibold text-text">
              {copy.title}
            </h2>

            {/* Say what the MONEY does. An officer must never be surprised. */}
            <p
              className={
                copy.danger
                  ? "flex items-start gap-2 rounded-md border border-danger-border bg-danger-bg/20 px-3 py-2 text-[12px] leading-relaxed text-danger-fg"
                  : "flex items-start gap-2 rounded-md border border-border bg-bg-overlay px-3 py-2 text-[12px] leading-relaxed text-text-muted"
              }
            >
              <I.alertCircle s={14} className="mt-[1px] shrink-0" />
              {copy.effect}
            </p>

            <div className="space-y-1.5">
              <label
                htmlFor="objection-note"
                className="font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-text-subtle"
              >
                Reason for the record (required)
              </label>
              <Textarea
                id="objection-note"
                rows={3}
                value={note}
                maxLength={1000}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What did you check, and what did it show? This is written to the audit chain and shown to the player."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setMode(null)} disabled={pending}>
                Cancel
              </Button>
              <Button
                variant={copy.danger ? "danger" : "primary"}
                onClick={submit}
                disabled={pending || note.trim().length < 5}
              >
                {pending ? "Recording…" : copy.cta}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
