"use client";

/** Force re-verify KYC (audit §9.3 #4). Moves an APPROVED player to
 *  re-verification (reopens resubmit). Reason required + audit-logged server-side.
 *  Shown only when KYC is APPROVED. The confirm happens in the kit <Modal> (portal +
 *  focus-trap + scroll-lock + Esc) — changing a player's compliance state deserves a
 *  deliberate surface, not an inline link.
 *
 *  🔴 WHAT IT STOPS HAS CHANGED THREE TIMES — TELL THE OFFICER THE CURRENT ANSWER. Until
 *  2026-08-20 it re-locked withdrawals; from 2026-08-20 it stopped being a money control;
 *  from 2026-09-05 it locked deposits and betting; **from 2026-09-13 it stops NO money at
 *  all** — depositing and playing ask no identity question, and withdrawal asks whether the
 *  account was EVER approved, which re-verification never clears. It means "we are
 *  re-checking you", and nothing else (docs/COMPLIANCE-DECISIONS.md 2026-09-13, ruling 6).
 *
 *  ⭐ SO THE LEVER THAT DOES STOP MONEY IS OFFERED RIGHT HERE. An officer who opens this
 *  dialog with a doubt about the account is exactly the officer who needs the freeze, and
 *  the first one to need it must not reach for the control that no longer works. The
 *  checkbox runs `freezeWalletByOfficer` with the SAME written reason, in the same action.
 *
 *  ⛔ Telling an officer this stops money, at the moment they choose it to stop money, is
 *  the officer-facing twin of E-5. */
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { I } from "@/components/ui/glyphs";
import { forceReverifyKycAction } from "./actions";
import { runAdminAction } from "@/lib/client/run-admin-action";
import { focusFirstInvalid } from "@/lib/client/focus-first-invalid";
import { useMayAct, ActReadOnly } from "@/components/admin/act-gate";

export function ForceReverifyControls({ userId, walletFrozen = false }: { userId: string; walletFrozen?: boolean }) {
  // A1 — this control only ACTS, so a role holding VIEW without ACT is shown why rather
  // than being offered a button the server will refuse (and logged as a privilege
  // escalation for pressing it). See docs/ADMIN-CONSOLE-FINDINGS.md.
  const mayAct = useMayAct();

  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [alsoFreeze, setAlsoFreeze] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  // Rules of hooks: read the gate as a hook at the top, ACT on it below every other hook.
  // Revoking an ACT grant mid-session flips `mayAct` on the next router.refresh(); an early
  // return above these hooks would render fewer hooks than the last pass and crash the page.
  if (!mayAct) return <ActReadOnly />;

  const submit = () => {
    if (reason.trim().length < 5) return;
    start(async () => {
      const fd = new FormData();
      fd.set("userId", userId);
      fd.set("reason", reason.trim());
      if (alsoFreeze) fd.set("alsoFreeze", "1");
      const r = await runAdminAction(() => forceReverifyKycAction(fd));
      if (!r.ok) {
        toast({ title: "Blocked", description: r.error, variant: "danger" });
        if (r.field) focusFirstInvalid(document.body, [r.field]);
        return;
      }
      const froze = alsoFreeze;
      setOpen(false); setReason(""); setAlsoFreeze(false);
      router.refresh();
      toast(froze
        ? { title: "Re-verification required · wallet frozen", description: "The player must re-submit documents, and deposits, bets and withdrawals are stopped until an officer lifts the freeze.", variant: "warning" }
        : { title: "Re-verification required", description: "This stops no money. To stop deposits, bets and withdrawals, freeze the wallet.", variant: "warning" });
    });
  };

  return (
    <>
      <Button type="button" size="sm" variant="ghost" disabled={pending} leading={<I.shieldcheck s={13} />} onClick={() => { setOpen(true); setReason(""); setAlsoFreeze(false); }}>
        Force re-verify KYC
      </Button>

      <Modal
        open={open}
        onClose={() => { if (!pending) setOpen(false); }}
        role="alertdialog"
        ariaLabel="Force re-verify KYC"
        maxWidth={440}
        closeOnScrim={!pending}
        showClose={!pending}
        ariaBusy={pending}
        initialFocus={reasonRef}
      >
        <p className="font-mono text-micro uppercase eyebrow font-bold text-text mb-1">KYC · Re-verify</p>
        <h3 className="font-display text-[18px] font-bold text-text leading-tight">Force KYC re-verification?</h3>
        <p className="mt-1 text-body-sm italic text-text-subtle">
          Moves this APPROVED player back to re-verification and asks them to re-submit their documents. Audit-logged. <strong>This stops no money.</strong> Depositing and playing need no identity, and withdrawal stays open to an account that was approved once.
        </p>
        <label className="mt-3 block">
          {/* DG-A-14: "Reason · Sababu (required, audit-logged)" was one microlabel with its
              hint welded on, so the hint — reading copy — was wearing the eyebrow recipe at
              10px, well under the §T4 12.5px floor. The bilingual label keeps that recipe
              because it really is an identifier; the hint moves to its own legible line. The
              textarea stays nested inside this <label>, so the control is still named by it. */}
          <span className="font-mono text-micro uppercase eyebrow font-bold text-text-subtle">Reason · Sababu</span>
          <span className="block text-body-sm text-text-subtle">(required, audit-logged)</span>
          <textarea
            data-field="reason"
            ref={reasonRef}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why must this player re-verify?"
            className="mt-1 w-full rounded-md border border-border bg-bg-overlay px-2.5 py-2 text-[13px] text-text outline-none admin-focus transition-colors"
            rows={3}
            maxLength={300}
          />
          <span className="font-mono text-[10px] text-text-subtle">{reason.trim().length} / 300</span>
        </label>
        {walletFrozen ? (
          <p className="mt-3 rounded-md border border-border bg-bg-inset px-3 py-2 text-body-sm text-text-muted">
            The wallet is already frozen, so no money can move while they re-verify.
          </p>
        ) : (
          <div className="mt-3 rounded-md border border-border bg-bg-inset px-3 py-2.5">
            <Checkbox
              checked={alsoFreeze}
              onChange={(v) => { if (!pending) setAlsoFreeze(v); }}
              label={<span className="text-body-sm text-text"><strong>Also freeze the wallet</strong> — stops deposits, bets and withdrawals until an officer lifts it. Uses the reason above.</span>}
            />
          </div>
        )}
        <div className="mt-4 flex flex-col gap-2">
          <Button type="button" variant="claret" size="lg" fullWidth loading={pending} disabled={reason.trim().length < 5} onClick={submit}>
            {alsoFreeze ? "Force re-verify and freeze" : "Force re-verify"}
          </Button>
          <Button type="button" variant="ghost" size="md" fullWidth disabled={pending} onClick={() => { if (!pending) setOpen(false); }}>
            Cancel · Ghairi
          </Button>
        </div>
      </Modal>
    </>
  );
}
