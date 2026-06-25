"use client";

import { useRef, useState } from "react";
import { I } from "@/components/ui/glyphs";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { closeAccountAction } from "./actions";

export function CloseAccountForm() {
  const [confirm, setConfirm] = useState("");
  const canSubmit = confirm.trim() === "CLOSE MY ACCOUNT";
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={closeAccountAction} className="space-y-3">
      <label className="block">
        <span className="block font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-text-subtle mb-1.5">
          Reason (optional) · Sababu
        </span>
        <textarea
          name="reason"
          rows={2}
          maxLength={500}
          placeholder="Help us improve — what made you leave?"
          className="w-full p-3 rounded-md border border-border bg-bg-overlay text-text text-[16px] focus:outline-none brand-focus transition-colors"
        />
      </label>
      <label className="block">
        <span className="block font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-text-subtle mb-1.5">
          Type <span className="font-mono text-no-300">CLOSE MY ACCOUNT</span> to confirm
        </span>
        <input
          name="confirm"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full h-10 px-3 rounded-md border border-border bg-bg-overlay font-mono text-[16px] tabular-nums text-text focus:outline-none focus:border-no-700 focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--no-500)_25%,transparent)] transition-colors"
          autoComplete="off"
        />
      </label>
      <ConfirmDialog
        tone="claret"
        title="Close your account permanently"
        body={
          <>
            <p className="mb-2">
              This is <strong className="text-text">irreversible</strong>. Your wallet, positions,
              and all account data will be permanently deleted. You will be signed out immediately.
            </p>
            <p className="text-text-subtle italic text-[12.5px]">
              Akaunti yako itafungwa kabisa na huwezi kuirudisha.
            </p>
          </>
        }
        confirmLabel="Yes, close permanently"
        cancelLabel="Keep my account"
        onConfirm={() => formRef.current?.requestSubmit()}
        trigger={
          <button
            type="button"
            disabled={!canSubmit}
            className="btn btn-claret btn-md inline-flex items-center gap-1.5 disabled:opacity-40"
          >
            <I.alertOctagon s={13} />
            Permanently close my account
          </button>
        }
      />
    </form>
  );
}
