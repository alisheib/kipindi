"use client";

/**
 * IP address shown masked by default (only the first octet), revealed on tap.
 * Privacy-forward: a shoulder-surfer can't read the full address at rest, but
 * the owner can confirm it. No-op (non-interactive) when the IP is unknown or
 * already un-maskable.
 */
import { useState } from "react";
import { I } from "@/components/ui/glyphs";
import { GlyphSwap } from "@/components/ui/glyph-swap";
import { useT } from "@/lib/i18n";

function maskIp(ip: string): string {
  if (ip.includes(":")) {
    // IPv6 — keep the first hextet, mask the rest (loopback "::1" → just dots).
    const head = ip.split(":")[0];
    return head ? `${head}:••••` : "••••";
  }
  const oct = ip.split(".");
  if (oct.length === 4) return `${oct[0]}.•••.•••.•••`;
  return ip;
}

export function IpReveal({ ip }: { ip: string }) {
  const [shown, setShown] = useState(false);
  const { t } = useT();
  const masked = maskIp(ip);
  const canReveal = ip !== "unknown" && masked !== ip;
  return (
    <button
      type="button"
      onClick={() => canReveal && setShown((s) => !s)}
      disabled={!canReveal}
      aria-label={shown ? t.profile.hideIp : t.profile.revealIp}
      /* ⭐ DG-P-07 · §A2 — 18px, and it is a BUTTON, not a readout.
         `text-[12px]` is an ARBITRARY font-size, so it sets font-size ONLY: the line-height
         falls through to `body`'s 1.5 (globals.css:862, and there is no base `button` reset),
         giving 12 × 1.5 = 18px with the `s={12}` glyph inside that line box. No padding, no
         border ⇒ 18px WAS the border box. §A2 asks 40 (`--tap-min`) and prefers 44 on a phone.
         ⛔ AN ARBITRARY LITERAL, never `min-h-11` — the spacing scale is REPLACED
         (`tailwind.config.ts:204-219`) and `11` is 96px here.
         ⚠️ WHAT MOVES, MEASURED not assumed: the only mount is
         `profile/sessions/page.tsx:127`, in a `flex items-center justify-between` row whose
         other member is a `text-micro` (10/14) caption. That row goes max(14, 18) = 18px →
         max(14, 44) = 44px, so the device card grows 26px. Nothing shifts sideways.
         ⛔ NOT the `-my-2` absorber (`side-picker.tsx:90`): it would net +2px but push a 44px
         hit box 12px up through the row's own `pt-3` + `border-t` toward the sign-out
         SubmitButton above. §A2 is met honestly here without borrowing a neighbour's pixels.
         ⚠️ Its admin visual twin `ui/sensitive-reveal.tsx:55` is the same 15px defect and takes
         the same edit — it has ZERO player call sites, so it belongs to the admin row, not to
         this one. Keep the two in step. */
      className="min-h-[44px] inline-flex items-center gap-1.5 font-mono text-[12px] tabular-nums text-text disabled:cursor-default hover:text-text-muted"
    >
      <span>{shown ? ip : masked}</span>
      {canReveal && (
        <GlyphSwap state={shown} className="text-text-subtle">
          {shown ? <I.eyeOff s={12} /> : <I.eye s={12} />}
        </GlyphSwap>
      )}
    </button>
  );
}
