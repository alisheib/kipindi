"use client";

/**
 * IP address shown masked by default (only the first octet), revealed on tap.
 * Privacy-forward: a shoulder-surfer can't read the full address at rest, but
 * the owner can confirm it. No-op (non-interactive) when the IP is unknown or
 * already un-maskable.
 */
import { useState } from "react";
import { I } from "@/components/ui/glyphs";
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
      className="inline-flex items-center gap-1.5 font-mono text-[12px] tabular-nums text-text disabled:cursor-default hover:text-text-muted"
    >
      <span>{shown ? ip : masked}</span>
      {canReveal && (shown ? <I.eyeOff s={12} className="text-text-subtle" /> : <I.eye s={12} className="text-text-subtle" />)}
    </button>
  );
}
