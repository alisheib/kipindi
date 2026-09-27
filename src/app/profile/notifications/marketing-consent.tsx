"use client";

import { useState, useTransition } from "react";
import { I } from "@/components/ui/glyphs";
import { Toggle } from "@/components/ui/toggle";
import { useT } from "@/lib/i18n";
import { setMarketingConsentAction } from "./actions";

/**
 * E-409 · the player's marketing consent, withdrawable at any time (Privacy §3). Same row shape as
 * the push setting above it. The switch shows the SERVER's answer: a failed save puts it back.
 * D4 · `initialOn` is the EFFECTIVE consent (`marketingToggleState`), and `initialPaused` says the
 * consent lapsed when a break or self-exclusion ended — switching on is how the player opts in again.
 */
export function MarketingConsent({ initialOn, initialPaused = false }: { initialOn: boolean; initialPaused?: boolean }) {
  const { t } = useT();
  const [on, setOn] = useState(initialOn);
  const [paused, setPaused] = useState(initialPaused);
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);

  const flip = () => {
    const want = !on;
    setFailed(false);
    setOn(want);
    start(async () => {
      const r = await setMarketingConsentAction(want).catch(() => ({ ok: false as const }));
      if (r.ok) { setOn(r.on); setPaused(false); }
      else { setOn(!want); setFailed(true); }
    });
  };

  return (
    <section className="rounded-xl glass-panel p-5" data-testid="marketing-consent">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          {/* 40px literals: the spacing scale is overridden (see push-settings.tsx). */}
          <span className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-md bg-brand-500/10 text-brand-300">
            <I.megaphone s={17} />
          </span>
          <div className="min-w-0">
            <p className="font-display text-[14px] font-semibold text-text leading-tight">{t.push.marketingTitle}</p>
            {/* ⭐ Announced, so a save that failed is not a silent snap-back. */}
            <p className="mt-0.5 text-body-sm text-text-subtle leading-snug" role="status" aria-live="polite">
              {failed ? t.error.somethingDidntWork : t.push.marketingBody}
            </p>
            {paused && !on && !failed && (
              <p className="mt-1 text-body-sm text-text-muted leading-snug" data-testid="marketing-consent-paused">{t.push.marketingPaused}</p>
            )}
          </div>
        </div>
        <Toggle on={on} disabled={pending} onClick={flip} aria-label={t.push.marketingTitle} />
      </div>
    </section>
  );
}
