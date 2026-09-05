"use client";

/**
 * HOLD THIS PAYOUT — the officer's own settlement freeze (management ruling ②, 2026-09-05).
 *
 * ⛔ IT IS THE OPPOSITE OF THE BUTTON BESIDE IT, AND IT MUST LOOK LIKE IT. `SettleButton` moves
 * money and wears the brand; this stops money and wears the warning family — the same tone the
 * FROZEN row already uses, so the state the officer creates here looks like the state they will
 * see afterwards.
 *
 * ⛔ THE CONFIRM STATES THE THING THEY CANNOT UNDO ALONE. Separation of duties is inherited
 * from the objection rulings — the filer of a case may not rule on it — so an officer who holds
 * a market has, by design, handed the release to a colleague. That is the whole safety property
 * and it would be a nasty surprise to discover afterwards, so it is said before the act, not in
 * the toast after it.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useDeferredToast } from "@/components/ui/toast";
import { I } from "@/components/ui/glyphs";
import { formatTzs } from "@/lib/utils";
import { holdSettlementAction } from "./actions";
import { runAdminAction } from "@/lib/client/run-admin-action";
import { useMayAct, useActDisabledReason } from "@/components/admin/act-gate";

/** The service's own reason list, in the officer's words. Kept in the same order. */
const REASONS: { value: string; label: string }[] = [
  { value: "WRONG_OUTCOME", label: "Wrong outcome recorded" },
  { value: "SOURCE_CONTRADICTS", label: "The source contradicts the verdict" },
  { value: "AMBIGUOUS_CRITERION", label: "The resolution criterion is ambiguous" },
  { value: "RESOLVED_EARLY", label: "Resolved before the event concluded" },
  { value: "OTHER", label: "Other — explained below" },
];

const DETAIL_MIN = 10;

export function HoldButton({
  marketId, title, pool, positions, outcome,
}: {
  marketId: string;
  title: string;
  pool: number;
  positions: number;
  outcome: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("WRONG_OUTCOME");
  const [detail, setDetail] = useState("");
  const [pending, start] = useTransition();
  const { toast, deferToast } = useDeferredToast(pending);
  const mayAct = useMayAct();
  const disabledReason = useActDisabledReason();

  // The service refuses a short note anyway; refusing it here too means the officer is told
  // before they press, not after — and the button cannot look available when it is not.
  const tooShort = detail.trim().length < DETAIL_MIN;

  const hold = () => {
    start(async () => {
      const fd = new FormData();
      fd.set("marketId", marketId);
      fd.set("reason", reason);
      fd.set("detail", detail);
      const r = await runAdminAction(() => holdSettlementAction(fd));
      if (!r.ok) {
        toast({ title: "Not held", description: r.error, variant: "danger" });
        return;
      }
      setOpen(false);
      setDetail("");
      deferToast({ title: "Payout held", description: r.detail, variant: "success" });
      router.refresh();
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!mayAct}
        title={disabledReason}
        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md border border-warning-border bg-warning-bg px-3 py-2 font-mono text-micro font-bold uppercase eyebrow text-warning-fg transition-colors hover:bg-warning-border brand-focus disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-warning-bg"
      >
        <I.hourglassHalf s={13} className="shrink-0" />
        Hold payout
      </button>

      <Modal
        open={open}
        onClose={() => !pending && setOpen(false)}
        role="alertdialog"
        closeOnScrim={false}
        labelledBy="hold-title"
        maxWidth={480}
      >
        <div className="space-y-4">
          {/* ⚠️ `text-body-lg`, NOT the `text-[16px]` its neighbour `settle-button.tsx:78`
              carries. Both render 16px — the closed scale's `body-lg` IS 16px — but the
              arbitrary form is counted by `test:type-scale` §4, whose ratchet may only
              shrink and had no room. Copying the older file verbatim is how a ratchet grows
              one paste at a time. */}
          <h2 id="hold-title" className="font-display text-body-lg font-semibold text-text">
            Hold this payout?
          </h2>

          <p className="text-body-sm leading-relaxed text-text-muted">{title}</p>

          <div className="rounded-md border border-border bg-bg-overlay font-mono text-body-sm">
            <Row label="Verdict" value={outcome ?? "—"} />
            <Row label="Pool held" value={formatTzs(pool)} />
            <Row label="Open positions" value={String(positions)} />
          </div>

          <div className="space-y-1.5">
            {/* ⚠️ A SPAN, NOT A `<label htmlFor>`. The kit Select renders a
                `role="combobox"` button, which does not take its accessible name from an
                associated label the way a native control does — so the name is passed
                explicitly and the visible text is decoration that agrees with it. */}
            <span className="block font-mono text-micro uppercase eyebrow text-text-subtle">
              Reason
            </span>
            <Select
              value={reason}
              onChange={setReason}
              options={REASONS}
              ariaLabel="Reason for holding this payout"
              size="sm"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="hold-detail" className="font-mono text-micro uppercase eyebrow text-text-subtle">
              What you found
            </label>
            <textarea
              id="hold-detail"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="The reviewing officer reads this and nothing else. Say what is wrong and where you checked."
              className="w-full rounded-md border border-border bg-bg-inset px-3 py-2 text-body-sm text-text placeholder:text-text-faint brand-focus"
            />
          </div>

          {/* 🔴 THE SENTENCE IS WRAPPED IN ONE <span>, AND IT HAS TO BE. Photographed at 360 on
              the live deploy, this paragraph rendered as THREE RAGGED COLUMNS — "This freezes
              the market: no" / "You will not be able to release it yourself" / "— a different
              officer must…" — because `flex` makes every child a flex ITEM, and the `<strong>`
              is a child. So the most important sentence in the dialog was laid out as a column
              two words wide. ⛔ No guard could see it: `test:popup-fit` looks for `truncate`
              and `line-clamp`, and nothing was clipped — the text was all present and unreadable.
              One text child beside the icon restores a single flowing paragraph. */}
          <p className="flex items-start gap-2 rounded-md border border-warning-border bg-warning-bg px-3 py-2 text-body-sm leading-relaxed text-warning-fg">
            <I.alertCircle s={14} className="mt-[1px] shrink-0" />
            <span>
              This freezes the market: no winner is paid until it is resolved.{" "}
              <strong>You will not be able to release it yourself</strong> — a different officer
              must review your case, the same rule that applies to a player&rsquo;s objection.
            </span>
          </p>

          <div className="flex justify-end gap-[8px]">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button variant="primary" onClick={hold} disabled={pending || tooShort}>
              {pending ? "Holding…" : "Hold payout"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-border/50 last:border-b-0">
      <span className="text-text-subtle">{label}</span>
      <span className="font-semibold tabular-nums text-text">{value}</span>
    </div>
  );
}
