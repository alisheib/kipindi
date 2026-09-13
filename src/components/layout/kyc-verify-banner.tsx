"use client";

/**
 * The standing identity bar — app-wide, for a signed-in player who holds money they could not yet
 * withdraw.
 *
 * ⭐ WHY IT EXISTS, AND WHO SEES IT (2026-09-13). Identity is now asked before WITHDRAWAL and before
 * nothing else, so an unverified account can deposit and play freely. The one moment the step costs a
 * player is the moment they reach for their money — the worst possible moment to meet a document
 * upload with a human review behind it. This bar puts that step in front of them earlier, while there
 * is no hurry. `AppShell` shows it only when the account was never approved AND holds a withdrawable
 * balance: a player who has deposited nothing has nothing to cash out, and a permanent identity nag
 * aimed at them would be exactly the friction the 2026-09-13 ruling removed.
 *
 * ⛔ NOT DISMISSIBLE, and collapsible only. It disappears by being RESOLVED — by verifying, or by the
 * balance reaching zero. Collapsed is a smaller statement of the same standing condition, not a
 * dismissal — the rule `EmailVerifyBanner` already established, and the same `localStorage` key shape:
 * a display preference, per browser, never account state.
 *
 * ⛔ `role="status"` / `aria-live="polite"`, never `alert`. Most of these states are ordinary progress,
 * and one — PENDING_REVIEW — is US being slow, not the player.
 *
 * ⛔ NO ROSE OR DANGER TONE TO ESCALATE. `AnnouncementBanner` (claret) renders directly above the bars in
 * `AppShell`; a rose bar under a claret bar breaks §B4 on a stack that only appears during an incident,
 * so no ordinary screenshot would catch it. Escalation lives in the words and the glyph.
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

  // ⚠️ `info` FOR THE PENDING STATE, AND IT IS THE WHOLE REASON THIS TAKES A `state` RATHER THAN A
  // BOOLEAN. A player whose documents are with our reviewers has done everything asked of them; an
  // amber "action needed" bar on every page would be a standing accusation about our own queue.
  const tone = state === "pending_review" ? "info" : "warning";

  const copy = {
    not_started:    { full: t.kycGate.barNotStarted,  short: t.kycGate.barShortNotStarted,  cta: t.kycGate.ctaStart,   href: "/profile/kyc" },
    uploaded:       { full: t.kycGate.barUploaded,    short: t.kycGate.barShortUploaded,    cta: t.kycGate.ctaFinish,  href: "/profile/kyc" },
    pending_review: { full: t.kycGate.barPending,     short: t.kycGate.barShortPending,     cta: "",                   href: "" },
    more_info:      { full: t.kycGate.barMoreInfo,    short: t.kycGate.barShortMoreInfo,    cta: t.kycGate.ctaUpload,  href: "/profile/kyc" },
    rejected:       { full: t.kycGate.barRejected,    short: t.kycGate.barShortRejected,    cta: t.kycGate.ctaRetry,   href: "/profile/kyc" },
    // ⛔ A FINAL refusal cannot be restarted by the player, so the action is support, never "try again".
    refused_final:  { full: t.kycGate.barRefusedFinal, short: t.kycGate.barShortRefusedFinal, cta: t.kycGate.ctaSupport, href: "/help" },
  }[state];

  return (
    <NoticeBar
      tone={tone}
      glyph={state === "pending_review" ? "clock" : "shieldcheck"}
      testId="kyc-verify-banner"
      /* ⛔ NO `onDismiss` — that prop is what makes a bar hideable, and this one must not
         be. ⛔ NO ACTION ON `pending_review` either: /profile/kyc shows a "we're reviewing"
         panel with nothing to act on, so a button there leads nowhere.
         ⚠️ `tone` is passed to the action too — the kit requires the two to match, and its
         default is `warning`, which would be wrong inside the info-toned pending bar. */
      action={copy.cta ? (
        <NoticeBarAction glyph={state === "refused_final" ? "mail" : "shieldcheck"} href={copy.href} tone={tone}>
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
