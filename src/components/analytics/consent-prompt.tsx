"use client";

/**
 * ConsentPrompt — asks, once, whether Google Analytics may run in this browser.
 *
 * ⛔ Nothing analytics-related happens before an answer: `GoogleTag` does not even fetch gtag.js while the state
 * is "unset" (see `@/lib/analytics-consent` for why this is opt-in).
 *
 * ── THE RULES, AND WHY
 *  · **Two answers of EQUAL weight.** "Allow" and "Decline" are the same variant and size. A bright yes beside a
 *    grey no is a nudge, and consent obtained by nudging is not consent.
 *  · **No close button.** Closing without answering would be a third answer that means nothing; the visitor can
 *    simply ignore the card, and analytics stays off.
 *  · **Only where analytics could run:** the live hosts, not an excluded page (`gaExcluded`), and never over a
 *    money control (`isCommitSurface`, re-evaluated on every route like `InstallInvite`).
 *  · **Automation is not asked** (HeadlessChrome/Playwright) — a bot never consents, so it is never measured —
 *    unless a driver asks with `?consent=1`, so the card can still be photographed (the primer's convention).
 *  · **The bottom invitation slot, priority 0**: it outranks the install invitation (1), because consent is a
 *    question the law requires and installing is a convenience. One card per corner, never stacked.
 *  · Placement copies `InstallInvite` — same corner, same chat-bubble clearance — but on the repo spacing scale (p-3 16px, mt-2 12px): its p-3.5 / mt-2.5 are stock keys that read bigger and paint smaller (`test:spacing-scale`).
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { isCommitSurface } from "@/lib/surfaces";
import { useInvitationSlot } from "@/lib/invitation-slot";
import { GA_HOSTS, gaExcluded } from "@/lib/google-tag";
import { setConsent, useAnalyticsConsent } from "@/lib/analytics-consent";

/** Wait until the page has painted before asking — the answer is never urgent. */
const ASK_AFTER_MS = 1200;

function consentForced(): boolean {
  try {
    if (new URLSearchParams(window.location.search).get("consent") === "1") return true;
    return window.localStorage.getItem("kp-consent-force") === "1";
  } catch {
    return false;
  }
}

export function ConsentPrompt() {
  const { t } = useT();
  const pathname = usePathname();
  const consent = useAnalyticsConsent();
  const [ready, setReady] = useState(false);
  const [askable, setAskable] = useState(false);

  useEffect(() => {
    const forced = consentForced();
    if (!forced && /HeadlessChrome|Playwright/i.test(navigator.userAgent)) return;
    if (!forced && !GA_HOSTS.includes(window.location.hostname)) return;
    setAskable(true);
    const timer = window.setTimeout(() => setReady(true), ASK_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const eligible = askable && ready && consent === "unset" && !!pathname && !gaExcluded(pathname) && !isCommitSurface(pathname);
  const holdsSlot = useInvitationSlot("analytics-consent", "bottom", 0, eligible);
  if (!holdsSlot) return null;

  return (
    <div
      role="region"
      aria-labelledby="consent-prompt-title"
      data-testid="consent-prompt"
      data-invitation="analytics-consent"
      /* InstallInvite's box (see its note on the 148px phone clearance and the lg corner), padded on the repo scale. */
      className="fixed left-3 right-3 bottom-[calc(148px_+_env(safe-area-inset-bottom))] lg:bottom-6 z-40 lg:right-auto lg:left-6 lg:max-w-[380px] rounded-xl glass-panel border border-border p-3 shadow-lg"
    >
      <div className="flex items-start gap-3">
        <span className="shrink-0 mt-0.5 text-gold-300" aria-hidden><I.chart s={18} /></span>
        {/* ⛔ min-w-0 is load-bearing, and there is no truncate or clamp: the box grows, the words stay whole. */}
        <div className="min-w-0 flex-1">
          <p id="consent-prompt-title" className="font-display text-body font-semibold leading-tight text-text">
            {t.common.consentTitle}
          </p>
          <p className="mt-1 text-body-sm leading-snug text-text-muted">
            {t.common.consentBody}{" "}
            <Link href="/legal/privacy" className="text-brand-300 underline-offset-2 hover:underline">
              {t.common.consentMore}
            </Link>
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button type="button" onClick={() => setConsent("granted")} variant="ghost" size="sm" data-testid="consent-allow">
              {t.common.consentAllow}
            </Button>
            <Button type="button" onClick={() => setConsent("denied")} variant="ghost" size="sm" data-testid="consent-decline">
              {t.common.consentDecline}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
