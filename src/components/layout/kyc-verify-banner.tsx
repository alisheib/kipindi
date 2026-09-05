"use client";

/**
 * The standing identity bar — app-wide, for every signed-in player who is not yet verified.
 *
 * Why it exists: from 2026-09-05 identity gates depositing, playing AND withdrawing, so an
 * unverified account is the largest live limitation the platform has. Until this bar
 * existed the only places that said so were the money screens themselves — a player who
 * signed up, browsed for a week and never opened /wallet would first discover it at the
 * instant they tried to stake. That is the worst possible moment to introduce a step with
 * a human review queue behind it.
 *
 * ⛔ NOT DISMISSIBLE, and collapsible only. This is not an announcement; it is a live
 * limitation on the account, and it disappears by being RESOLVED. A dismiss button would
 * let a player permanently hide the reason their first deposit is going to be refused.
 * Collapsed is a smaller statement of the same standing condition, not a dismissal — the
 * rule `EmailVerifyBanner` already established, and the same `localStorage` key shape:
 * a display preference, per browser, never account state. Clearing storage shows the full
 * bar again, which is the safe direction to fail in.
 *
 * ⛔ `role="status"` / `aria-live="polite"`, never `alert`. Three of the four states are
 * ordinary progress, and one of them — PENDING_REVIEW — is US being slow, not the player.
 * An assertive live region announcing our own queue on every navigation would be noise
 * about nothing they can act on.
 */
import { useEffect, useState } from "react";
import { NoticeBar, NoticeBarAction } from "@/components/ui/notice-bar";
import { useT } from "@/lib/i18n";
import type { KycGateState } from "@/lib/kyc-gate-state";

const COLLAPSE_KEY = "50pick:kyc-banner-collapsed";

export function KycVerifyBanner({ state }: { state: KycGateState }) {
  const { t } = useT();
  // Start EXPANDED and read the stored preference after mount: reading localStorage during
  // render desyncs server and client HTML, and a storage read that throws (private mode,
  // blocked storage) then fails toward showing MORE of the limitation, not less.
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try { setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1"); } catch { /* storage blocked */ }
  }, []);
  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      try { window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0"); } catch { /* storage blocked */ }
      return next;
    });
  };

  // ⚠️ `info` FOR THE PENDING STATE, AND IT IS THE WHOLE REASON THIS TAKES A `state` RATHER
  // THAN A BOOLEAN. A player whose documents are with our reviewers has done everything
  // asked of them; an amber "action needed" bar on every page would be a standing accusation
  // about our own queue.
  const tone = state === "pending_review" ? "info" : "warning";

  const copy = {
    not_started:    { full: t.kycGate.barNotStarted,  short: t.kycGate.barShortNotStarted,  cta: t.kycGate.ctaStart },
    pending_review: { full: t.kycGate.barPending,     short: t.kycGate.barShortPending,     cta: "" },
    more_info:      { full: t.kycGate.barMoreInfo,    short: t.kycGate.barShortMoreInfo,    cta: t.kycGate.ctaUpload },
    rejected:       { full: t.kycGate.barRejected,    short: t.kycGate.barShortRejected,    cta: t.kycGate.ctaRetry },
  }[state];

  return (
    <NoticeBar
      tone={tone}
      glyph={state === "pending_review" ? "clock" : "shieldcheck"}
      testId="kyc-verify-banner"
      /* ⛔ NO `onDismiss` — that prop is what makes a bar hideable, and this one must not
         be. ⛔ NO ACTION ON `pending_review` either: /profile/kyc shows a "we're reviewing"
         panel with nothing to act on, so a button there leads nowhere. The bar states the
         condition and stops, which is the honest shape of "we owe you something".
         ⚠️ `tone` is passed to the action too — the kit requires the two to match, and its
         default is `warning`, which would be wrong inside the info-toned pending bar. */
      action={copy.cta ? (
        <NoticeBarAction glyph="shieldcheck" href="/profile/kyc" tone={tone}>
          {copy.cta}
        </NoticeBarAction>
      ) : undefined}
    >
      {/* Collapsed keeps the SHORT form of the same statement — never nothing. A real
          button, so it is keyboard-reachable and reports its state to assistive tech. */}
      <button
        type="button"
        onClick={toggle}
        aria-expanded={!collapsed}
        data-kyc-state={state}
        className="text-left underline-offset-2 hover:underline"
      >
        {collapsed ? copy.short : copy.full}
      </button>
    </NoticeBar>
  );
}
