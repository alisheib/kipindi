"use client";

import { useState } from "react";
import { Link2, Copy, Check, Share2, MessageCircle, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

/**
 * Referral link + share controls. Client-only: clipboard + Web Share API.
 * Primary CTA is gold (brand rule); secondary share buttons are ghost.
 */
export function ReferralShare({ link, shareText }: { link: string; shareText: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast({ title: "Link copied · Imenakiliwa", variant: "success" });
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({ title: "Couldn't copy", description: "Long-press the link to copy it.", variant: "danger" });
    }
  };

  const share = async () => {
    const data = { title: "50pick", text: shareText, url: link };
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch {
        /* user dismissed — fall through to copy */
      }
    }
    void copy();
  };

  const waHref = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${link}`)}`;
  const smsHref = `sms:?&body=${encodeURIComponent(`${shareText} ${link}`)}`;

  return (
    <div>
      <p className="mb-2 font-mono text-[9.5px] uppercase tracking-[0.1em] font-bold text-text-subtle">
        Your referral link · Kiungo chako
      </p>
      <div className="input-group mb-2.5">
        <span className="prefix" style={{ color: "var(--gold-400)" }}>
          <Link2 size={14} />
        </span>
        <input className="input input-mono" readOnly value={link} style={{ fontWeight: 500 }} aria-label="Referral link" />
        <button
          type="button"
          onClick={copy}
          className="m-[5px] flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-bg-overlay px-3 text-[12.5px] font-semibold text-text transition-colors hover:bg-bg-elevated"
          style={{ height: 38 }}
        >
          {copied ? <Check size={14} className="text-yes-300" /> : <Copy size={14} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <Button variant="gold" size="lg" fullWidth leading={<Share2 size={17} />} onClick={share}>
        Share with Friends · Shiriki
      </Button>
      <div className="mt-2.5 flex gap-2">
        <a href={waHref} target="_blank" rel="noopener noreferrer" className="flex-1">
          <Button variant="ghost" size="md" fullWidth leading={<MessageCircle size={14} />} className="text-[12px]">
            WhatsApp
          </Button>
        </a>
        <a href={smsHref} className="flex-1">
          <Button variant="ghost" size="md" fullWidth leading={<MessageSquare size={14} />} className="text-[12px]">
            SMS
          </Button>
        </a>
        <Button variant="ghost" size="md" fullWidth leading={<Copy size={14} />} className="flex-1 text-[12px]" onClick={copy}>
          Copy link
        </Button>
      </div>
    </div>
  );
}
