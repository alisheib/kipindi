"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { setPlayerEmailAction } from "./actions";

export function SetEmailForm({ userId }: { userId: string }) {
  const [email, setEmail] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  const submit = () => {
    if (!email.trim() || pending) return;
    start(async () => {
      const fd = new FormData();
      fd.set("userId", userId);
      fd.set("email", email.trim());
      const r = await setPlayerEmailAction(fd);
      if (r.ok) {
        toast({ title: "Email saved", variant: "success" });
        setEmail("");
        router.refresh();
      } else {
        toast({ title: "Failed", description: r.error, variant: "danger" });
      }
    });
  };

  return (
    <div className="flex items-center gap-2 mt-2">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="player@example.com"
        className="flex-1 min-w-0 h-8 px-2.5 rounded-md border border-border bg-bg-inset text-text font-mono text-[12px] focus:outline-none focus:border-[var(--brand-500)] transition-colors"
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } }}
      />
      <button
        type="button"
        onClick={submit}
        disabled={pending || !email.trim()}
        className="h-8 px-3 rounded-md border border-gold-700 bg-gold-500/10 font-mono text-[11px] font-bold text-gold-300 hover:bg-gold-500/20 disabled:opacity-40 transition-colors"
      >
        {pending ? "Saving…" : "Set email"}
      </button>
    </div>
  );
}
