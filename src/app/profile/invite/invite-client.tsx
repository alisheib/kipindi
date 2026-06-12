"use client";

import { useState } from "react";
import { I } from "@/components/ui/glyphs";
import { Input } from "@/components/ui/input";
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
      <div className="flex items-center gap-2 mb-2.5">
        <div className="flex-1 min-w-0">
          <Input readOnly value={link} mono className="font-medium" aria-label="Referral link" />
        </div>
        <button
          type="button"
          onClick={copy}
          className="btn btn-ghost btn-md shrink-0 inline-flex items-center gap-1.5"
        >
          {copied ? <I.check s={14} /> : <I.copy s={14} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <Button variant="gold" size="lg" fullWidth leading={<I.share s={17} />} onClick={share}>
        Share with Friends · Shiriki
      </Button>
      <div className="mt-2.5 flex gap-2">
        <a href={waHref} target="_blank" rel="noopener noreferrer" className="flex-1">
          <Button variant="ghost" size="md" fullWidth leading={<I.messageWhatsapp s={14} />} className="text-[12px]">
            WhatsApp
          </Button>
        </a>
        <a href={smsHref} className="flex-1">
          <Button variant="ghost" size="md" fullWidth leading={<I.comment s={14} />} className="text-[12px]">
            SMS
          </Button>
        </a>
        <Button variant="ghost" size="md" fullWidth leading={<I.copy s={14} />} className="flex-1 text-[12px]" onClick={copy}>
          Copy link
        </Button>
      </div>
    </div>
  );
}
