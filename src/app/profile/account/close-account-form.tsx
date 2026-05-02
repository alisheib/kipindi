"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertOctagon } from "lucide-react";
import { closeAccountAction } from "./actions";

export function CloseAccountForm() {
  const [confirm, setConfirm] = useState("");
  const canSubmit = confirm === "CLOSE MY ACCOUNT";
  return (
    <form action={closeAccountAction} className="space-y-2">
      <label className="block">
        <span className="block text-caption uppercase tracking-[0.14em] font-bold text-text-secondary mb-1.5">
          Reason (optional) · Sababu
        </span>
        <textarea
          name="reason"
          rows={2}
          maxLength={500}
          placeholder="Help us improve — what made you leave?"
          className="w-full p-3 rounded-md bg-surface border border-border text-text text-body-sm focus:outline-none focus:border-border-focus"
        />
      </label>
      <label className="block">
        <span className="block text-caption uppercase tracking-[0.14em] font-bold text-text-secondary mb-1.5">
          Type <span className="font-mono text-danger">CLOSE MY ACCOUNT</span> to confirm
        </span>
        <input
          name="confirm"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full h-10 px-3 rounded-md bg-surface border border-border text-text font-mono text-body-sm tabular focus:outline-none focus:border-border-focus"
          autoComplete="off"
        />
      </label>
      <Button type="submit" variant="danger" size="lg" disabled={!canSubmit} leading={<AlertOctagon size={14} />}>
        Permanently close my account
      </Button>
    </form>
  );
}
