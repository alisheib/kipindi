"use client";

/**
 * THE OFFICER'S WALLET FREEZE (2026-09-13) — stop this account's money moving, in both directions.
 *
 * ⭐ WHY IT EXISTS. Ruling 6 of docs/COMPLIANCE-DECISIONS.md 2026-09-13: re-verification no longer
 * blocks deposits or bets, so an officer with a doubt about an account uses the wallet freeze. Until
 * this control there was no officer freeze at all — self-exclusion was the only thing that ever set
 * a wallet to FROZEN.
 *
 * ⭐ IT STATES EVERY HOLD, NOT JUST ITS OWN. A wallet can be frozen for several independent reasons
 * (self-exclusion, a final identity refusal, this). The officer sees all of them, and the button only
 * ever adds or lifts the OFFICER hold — so "Lift officer freeze" on a self-excluded account visibly
 * leaves the wallet frozen, with the reason on screen, instead of appearing to do nothing.
 *
 * ⛔ Server-enforced: `freezeWalletAction` / `unfreezeWalletAction` (compliance domain, step-up 2FA,
 * reason ≥ 5 characters, awaited COMPLIANCE audit). This component is manners; the action is the law.
 */
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { I } from "@/components/ui/glyphs";
import { freezeWalletAction, unfreezeWalletAction } from "./actions";
import { runAdminAction } from "@/lib/client/run-admin-action";
import { focusFirstInvalid } from "@/lib/client/focus-first-invalid";
import { useMayAct, ActReadOnly } from "@/components/admin/act-gate";

type Hold = { reason: string; label: string };

export function WalletFreezeControls({ userId, status, holds }: { userId: string; status: "ACTIVE" | "FROZEN" | "CLOSED"; holds: Hold[] }) {
  const mayAct = useMayAct();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const router = useRouter();
  const { toast } = useToast();
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  // Rules of hooks: every hook above, the gate below.
  if (!mayAct) return <ActReadOnly />;
  if (status === "CLOSED") return <Chip size="sm" variant="neutral">Wallet closed</Chip>;

  const officerHold = holds.some((h) => h.reason === "OFFICER");
  const lifting = officerHold;
  const others = holds.filter((h) => h.reason !== "OFFICER");

  const submit = () => {
    if (reason.trim().length < 5) return;
    start(async () => {
      const fd = new FormData();
      fd.set("userId", userId);
      fd.set("reason", reason.trim());
      const r = lifting
        ? await runAdminAction(() => unfreezeWalletAction(fd))
        : await runAdminAction(() => freezeWalletAction(fd));
      if (!r.ok) {
        toast({ title: "Blocked", description: r.error, variant: "danger" });
        if (r.field) focusFirstInvalid(document.body, [r.field]);
        return;
      }
      setOpen(false); setReason("");
      router.refresh();
      toast(lifting
        ? { title: "Officer freeze lifted", description: others.length ? `The wallet stays frozen for: ${others.map((h) => h.label).join(", ")}.` : "Deposits, bets and withdrawals are open again.", variant: "success" }
        : { title: "Wallet frozen", description: "Deposits, bets and withdrawals are stopped until an officer lifts the freeze.", variant: "warning" });
    });
  };

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap" data-wallet-freeze={status}>
        {status === "FROZEN" && (
          <Chip size="sm" variant="warning">
            <I.lock s={10} className="inline -mt-0.5 mr-0.5" />
            Frozen · {holds.map((h) => h.label).join(" · ")}
          </Chip>
        )}
        <Button type="button" size="sm" variant="ghost" disabled={pending} leading={<I.lock s={13} />} onClick={() => { setOpen(true); setReason(""); }}>
          {lifting ? "Lift officer freeze" : "Freeze wallet"}
        </Button>
      </div>

      <Modal
        open={open}
        onClose={() => { if (!pending) setOpen(false); }}
        role="alertdialog"
        ariaLabel={lifting ? "Lift officer freeze" : "Freeze wallet"}
        maxWidth={440}
        closeOnScrim={!pending}
        showClose={!pending}
        ariaBusy={pending}
        initialFocus={reasonRef}
      >
        <p className="font-mono text-micro uppercase eyebrow font-bold text-text mb-1">Wallet · {lifting ? "Unfreeze" : "Freeze"}</p>
        <h3 className="font-display text-[18px] font-bold text-text leading-tight">{lifting ? "Lift your freeze on this wallet?" : "Freeze this wallet?"}</h3>
        <p className="mt-1 text-body-sm text-text-subtle">
          {lifting
            ? (others.length
                ? <>This lifts the officer freeze only. <strong>The wallet stays frozen</strong> for: {others.map((h) => h.label).join(", ")}.</>
                : <>Deposits, bets and withdrawals open again. Audit-logged.</>)
            : <>Stops <strong>deposits, bets and withdrawals</strong> until an officer lifts it. It moves no money and does not change the player&apos;s identity status. Audit-logged.</>}
        </p>
        <label className="mt-3 block">
          <span className="font-mono text-micro uppercase eyebrow font-bold text-text-subtle">Reason · Sababu</span>
          <span className="block text-body-sm text-text-subtle">(required, audit-logged)</span>
          <textarea
            data-field="reason"
            ref={reasonRef}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={lifting ? "Why is the freeze no longer needed?" : "Why must this wallet be frozen?"}
            className="mt-1 w-full rounded-md border border-border bg-bg-overlay px-2.5 py-2 text-[13px] text-text outline-none admin-focus transition-colors"
            rows={3}
            maxLength={300}
          />
          <span className="font-mono text-[10px] text-text-subtle">{reason.trim().length} / 300</span>
        </label>
        <div className="mt-4 flex flex-col gap-2">
          <Button type="button" variant={lifting ? "primary" : "claret"} size="lg" fullWidth loading={pending} disabled={reason.trim().length < 5} onClick={submit}>
            {lifting ? "Lift officer freeze" : "Freeze wallet"}
          </Button>
          <Button type="button" variant="ghost" size="md" fullWidth disabled={pending} onClick={() => { if (!pending) setOpen(false); }}>
            Cancel · Ghairi
          </Button>
        </div>
      </Modal>
    </>
  );
}
