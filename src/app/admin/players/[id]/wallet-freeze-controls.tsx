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
import { freezeWalletAction, unfreezeWalletAction, liftStaleIdentityHoldAction } from "./actions";
import { runAdminAction } from "@/lib/client/run-admin-action";
import { focusFirstInvalid } from "@/lib/client/focus-first-invalid";
import { useMayAct, ActReadOnly } from "@/components/admin/act-gate";

type Hold = { reason: string; label: string };

export function WalletFreezeControls({
  userId,
  status,
  holds,
  canAct,
  staleIdentityHold = false,
}: {
  userId: string;
  status: "ACTIVE" | "FROZEN" | "CLOSED";
  holds: Hold[];
  /** The page's own answer for the COMPLIANCE domain — see the note on `mayAct` below. */
  canAct?: boolean;
  /** An identity-refusal hold with no final refusal behind it (`staleIdentityHold` in wallet-freeze.ts). */
  staleIdentityHold?: boolean;
}) {
  // ⭐ `canAct` WINS WHEN THE PAGE PASSES IT (audit session 95, 2026-09-14). The hook answers for the ROUTE's domain —
  // /admin/players is support — while every action here demands compliance, so a COMPLIANCE officer (support: view,
  // no act) was shown read-only on the freeze their role owns. The hook call stays: every admin control consults it.
  const routeMayAct = useMayAct();
  const mayAct = canAct ?? routeMayAct;
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  /** Which lever the open dialog pulls — the stale identity hold, or the officer hold (add or lift). */
  const [liftingStale, setLiftingStale] = useState(false);
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
  /* ⭐ ADDING A HOLD TO A WALLET THAT IS ALREADY FROZEN (2026-09-13). The button used to read "Freeze wallet"
   * beside a chip saying the wallet was frozen (e.g. for a final identity refusal), as if the wallet were open.
   * Here the action freezes nothing new: it adds the OFFICER hold beside the standing one, which keeps the
   * wallet frozen after that other reason is lifted (wallet-freeze.ts: ACTIVE only when no hold remains). */
  const addingToFrozen = !lifting && status === "FROZEN";
  const actionLabel = lifting ? "Lift officer freeze" : addingToFrozen ? "Add an officer hold" : "Freeze wallet";
  /* ⭐ THE STALE IDENTITY HOLD (audit session 95, 2026-09-14) — an identity-refusal hold with no final refusal on
   * record. The identity case has nothing left to re-open, so without this lever the wallet stayed frozen for good.
   * It lifts that hold ONLY; the server re-checks that it is still stale, and every other hold stays. */
  const afterStale = holds.filter((h) => h.reason !== "IDENTITY_REFUSED");
  const dialogLabel = liftingStale ? "Lift stale identity hold" : actionLabel;

  const submit = () => {
    if (reason.trim().length < 5) return;
    const stale = liftingStale;
    start(async () => {
      const fd = new FormData();
      fd.set("userId", userId);
      fd.set("reason", reason.trim());
      const r = stale
        ? await runAdminAction(() => liftStaleIdentityHoldAction(fd))
        : lifting
          ? await runAdminAction(() => unfreezeWalletAction(fd))
          : await runAdminAction(() => freezeWalletAction(fd));
      if (!r.ok) {
        toast({ title: "Blocked", description: r.error, variant: "danger" });
        if (r.field) focusFirstInvalid(document.body, [r.field]);
        return;
      }
      setOpen(false); setReason(""); setLiftingStale(false);
      router.refresh();
      if (stale) {
        toast({ title: "Stale identity hold lifted", description: afterStale.length ? `The wallet stays frozen for: ${afterStale.map((h) => h.label).join(", ")}.` : "Deposits, bets and withdrawals are open again.", variant: "success" });
        return;
      }
      toast(lifting
        ? { title: "Officer freeze lifted", description: others.length ? `The wallet stays frozen for: ${others.map((h) => h.label).join(", ")}.` : "Deposits, bets and withdrawals are open again.", variant: "success" }
        : addingToFrozen
          ? { title: "Officer hold added", description: "The wallet stays frozen until an officer lifts this hold, even once the other holds are lifted.", variant: "warning" }
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
        <Button type="button" size="sm" variant="ghost" disabled={pending} leading={<I.lock s={13} />} onClick={() => { setLiftingStale(false); setOpen(true); setReason(""); }}>
          {actionLabel}
        </Button>
        {staleIdentityHold && (
          <Button type="button" size="sm" variant="ghost" disabled={pending} leading={<I.unlock s={13} />} onClick={() => { setLiftingStale(true); setOpen(true); setReason(""); }}>
            Lift stale identity hold
          </Button>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => { if (!pending) setOpen(false); }}
        role="alertdialog"
        ariaLabel={dialogLabel}
        maxWidth={440}
        closeOnScrim={!pending}
        showClose={!pending}
        ariaBusy={pending}
        initialFocus={reasonRef}
      >
        <p className="font-mono text-micro uppercase eyebrow font-bold text-text mb-1">Wallet · {liftingStale ? "Stale identity hold" : lifting ? "Unfreeze" : addingToFrozen ? "Officer hold" : "Freeze"}</p>
        <h3 className="font-display text-title-sm font-bold text-text leading-tight">{liftingStale ? "Lift this stale identity hold?" : lifting ? "Lift your freeze on this wallet?" : addingToFrozen ? "Add an officer hold to this frozen wallet?" : "Freeze this wallet?"}</h3>
        <p className="mt-1 text-body-sm text-text-subtle">
          {liftingStale
            ? <>This wallet is held for <strong>an identity refusal</strong>, but no final refusal stands on the player&apos;s identity record — the refusal was re-opened, or never written. Lifting removes that hold only{afterStale.length ? <>; <strong>the wallet stays frozen</strong> for: {afterStale.map((h) => h.label).join(", ")}.</> : <> — deposits, bets and withdrawals open again.</>} It moves no money. Audit-logged.</>
            : lifting
            ? (others.length
                ? <>This lifts the officer freeze only. <strong>The wallet stays frozen</strong> for: {others.map((h) => h.label).join(", ")}.</>
                : <>Deposits, bets and withdrawals open again. Audit-logged.</>)
            : addingToFrozen
              ? <>The wallet is already frozen{others.length ? ` for: ${others.map((h) => h.label).join(", ")}` : ""}. An officer hold <strong>keeps it frozen</strong> even once {others.length > 1 ? "those holds are" : "that hold is"} lifted, until an officer lifts this one too. It moves no money. Audit-logged.</>
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
            placeholder={liftingStale ? "What did you check before lifting this hold?" : lifting ? "Why is the freeze no longer needed?" : addingToFrozen ? "Why does this wallet need an officer hold?" : "Why must this wallet be frozen?"}
            className="mt-1 w-full rounded-md border border-border bg-bg-overlay px-2 py-2 text-body-sm text-text outline-none admin-focus transition-colors"
            rows={3}
            maxLength={300}
          />
          <span className="font-mono text-body-sm tabular-nums text-text-subtle">{reason.trim().length} / 300</span>
        </label>
        <div className="mt-4 flex flex-col gap-2">
          <Button type="button" variant={liftingStale || lifting ? "primary" : "claret"} size="lg" fullWidth loading={pending} disabled={reason.trim().length < 5} onClick={submit}>
            {dialogLabel}
          </Button>
          <Button type="button" variant="ghost" size="md" fullWidth disabled={pending} onClick={() => { if (!pending) setOpen(false); }}>
            Cancel · Ghairi
          </Button>
        </div>
      </Modal>
    </>
  );
}
