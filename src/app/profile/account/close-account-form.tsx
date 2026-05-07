"use client";

import { useState } from "react";
import { AlertOctagon } from "lucide-react";
import { closeAccountAction } from "./actions";

export function CloseAccountForm() {
  const [confirm, setConfirm] = useState("");
  const canSubmit = confirm === "CLOSE MY ACCOUNT";
  return (
    <form action={closeAccountAction} className="space-y-3">
      <label className="block">
        <span className="block font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-text-subtle mb-1.5">
          Reason (optional) · Sababu
        </span>
        <textarea
          name="reason"
          rows={2}
          maxLength={500}
          placeholder="Help us improve — what made you leave?"
          className="w-full p-3 rounded-md border border-border bg-bg-overlay text-text text-[13px] focus:outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/30 transition-colors"
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
          className="w-full h-10 px-3 rounded-md border border-border bg-bg-overlay font-mono text-[13px] tabular-nums text-text focus:outline-none focus:border-no-700 focus:ring-2 focus:ring-no-500/30 transition-colors"
          autoComplete="off"
        />
      </label>
      <button
        type="submit"
        disabled={!canSubmit}
        className="inline-flex h-10 items-center gap-1.5 px-4 rounded-pill border border-no-700 bg-no-500/10 font-display font-semibold text-[12.5px] text-no-300 hover:bg-no-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <AlertOctagon size={13} />
        Permanently close my account
      </button>
    </form>
  );
}
