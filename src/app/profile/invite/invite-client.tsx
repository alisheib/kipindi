"use client";

import { useState, useRef, useLayoutEffect } from "react";
import { I } from "@/components/ui/glyphs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n";

/**
 * A referral link the player can actually READ — every character of it, at every width.
 *
 * 🔴 ALI, FROM THE LIVE PRODUCT: *"the copy link gets out of the isolated input field —
 * maybe we should make it take multiple lines."* Measured on production at 393 before
 * anything changed: the field was a single-line `<Input readOnly>` holding
 * `https://50pick.tz/auth/register?ref=QAFLC8R2` at **scrollWidth 454 against clientWidth
 * 255**. ⭐ **44% of the link was unreachable, and the hidden 44% was the `?ref=` code —
 * the only part that makes it a REFERRAL link at all.** The wrapper carries
 * `overflow: hidden`, so nothing spilled onto the page and no overflow check could ever
 * have seen it; the clipping was silent and complete.
 *
 * ⛔ A SINGLE-LINE `<input>` CANNOT WRAP — that is the element, not the styling, so no
 * class fixes it. This is a `<textarea readOnly>`: literally *"an input field that takes
 * multiple lines"*, which keeps the form-control semantics, the focus ring, the
 * `aria-label` and the ability to select the value with a keyboard. A `<div>` would have
 * dropped all four.
 *
 * ⚠️ AND IT SIZES ITSELF, because a fixed `rows` is wrong at BOTH ends: `rows={2}` shows an
 * empty second line on a desktop where the link fits on one, and clips a long market URL on
 * a narrow phone. A `ResizeObserver` re-measures on every width change, so the field is
 * exactly as tall as its content wherever it is rendered.
 */
function LinkField({ value, label }: { value: string; label: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      // Collapse first: `scrollHeight` never shrinks below the current height, so
      // measuring without this makes the field grow monotonically and never come back.
      el.style.height = "0px";
      // ⛔ PLUS THE BORDERS, AND THIS IS NOT A ROUNDING GUESS. Tailwind's preflight sets
      // `box-sizing: border-box` on everything, so assigning `height` sets the BORDER box —
      // while `scrollHeight` measures the CONTENT box (padding in, border out). Assigning
      // one to the other leaves the field exactly `borderTop + borderBottom` too short, and
      // `overflow: hidden` then shaves the bottom of the last line. Measured on production
      // by the guard that exists for this: 72 vs 70 at 393, 48 vs 46 at 768, 44 vs 42 at
      // 1440 — the same 2px everywhere, which is what a constant border looks like.
      const cs = getComputedStyle(el);
      const border = parseFloat(cs.borderTopWidth || "0") + parseFloat(cs.borderBottomWidth || "0");
      el.style.height = `${el.scrollHeight + border}px`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [value]);

  return (
    <textarea
      ref={ref}
      readOnly
      rows={1}
      value={value}
      aria-label={label}
      // ⛔ `break-all`, not the default word wrap. A URL has no spaces, so without it the
      // browser keeps the whole thing on one line and the textarea scrolls instead of
      // wrapping — the same defect in a taller box.
      className="field-measure w-full resize-none overflow-hidden rounded-lg border border-border bg-bg-inset px-3 py-2 font-mono text-[13px] font-medium leading-[1.5] text-text break-all brand-focus hover:border-border-strong transition-colors"
    />
  );
}

/**
 * Referral link + share controls. Client-only: clipboard + Web Share API.
 * Primary CTA is gold (brand rule); secondary share buttons are ghost.
 */
export function ReferralShare({ link, shareText }: { link: string; shareText: string }) {
  const { toast } = useToast();
  const { t } = useT();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast({ title: t.toast.linkCopied, variant: "success" });
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({ title: t.toast.couldntCopy, description: t.toast.longPressCopy, variant: "danger" });
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
        {t.profile.yourReferralLink}
      </p>
      <div className="flex items-center gap-2 mb-2.5">
        <div className="flex-1 min-w-0">
          {/* The accessible name is the SAME key as the visible caption above, not a second
              English string beside it. It was hardcoded "Referral link", so a Swahili player
              saw "Kiungo chako cha rufaa" and heard "Referral link" — two names for one
              field, in two languages. Reusing the caption's key also satisfies the
              label-in-name expectation: what is read aloud is what is printed. */}
          <LinkField value={link} label={t.profile.yourReferralLink} />
        </div>
        <button
          type="button"
          onClick={copy}
          className="btn btn-ghost btn-md shrink-0 inline-flex items-center gap-1.5"
        >
          {copied ? <I.check s={14} /> : <I.copy s={14} />}
          {copied ? t.common.copied : t.common.copy}
        </button>
      </div>
      <Button variant="gold" size="lg" fullWidth leading={<I.share s={17} />} onClick={share}>
        {t.profile.shareWithFriends}
      </Button>
      {/* 2-up on phones (3-up won't fit "Copy link" at 320), 3-up from sm.
          Grid tracks are minmax(0,1fr) so cells shrink cleanly; Copy link spans
          the full width on the phone's second row for balance. */}
      <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-3 gap-2">
        <a href={waHref} target="_blank" rel="noopener noreferrer" className="block min-w-0">
          <Button variant="ghost" size="md" fullWidth leading={<I.messageWhatsapp s={14} />} className="text-[12px]">
            WhatsApp
          </Button>
        </a>
        <a href={smsHref} className="block min-w-0">
          <Button variant="ghost" size="md" fullWidth leading={<I.comment s={14} />} className="text-[12px]">
            SMS
          </Button>
        </a>
        <Button variant="ghost" size="md" fullWidth leading={<I.copy s={14} />} className="col-span-2 sm:col-span-1 min-w-0 text-[12px]" onClick={copy}>
          {t.common.copyLink}
        </Button>
      </div>
    </div>
  );
}
