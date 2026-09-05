"use client";

/**
 * Persistent "confirm your email" bar — app-wide, for every signed-in player
 * whose address is still unconfirmed.
 *
 * Why it exists: confirming your email is what unlocks depositing (browse free →
 * a second requirement for depositing, alongside identity), but until now the ONLY place that
 * said so was the deposit page itself. A player who signed up, browsed markets
 * and never opened /wallet/deposit had no signal at all that their account was
 * in a limited state, and no idea a confirmation mail was waiting in their
 * inbox. They discovered it at the exact moment they wanted to put money in —
 * the worst possible moment to introduce a new step.
 *
 * So the state is now visible everywhere, with the thing that clears it (resend
 * the link) one tap away in the bar itself, not one navigation away.
 *
 * NOT dismissible, on purpose: this is not an announcement, it is a live
 * limitation on the account, and it disappears by being FIXED. A dismiss button
 * would let a player permanently hide the reason their deposit will be refused.
 * It stays slim, and it is `role="status"`/`aria-live="polite"` rather than an
 * alert — it is a standing condition, not an emergency.
 *
 * COLLAPSIBLE ONCE SEEN (POLISH-BACKLOG §1, 2026-07-29). The full bar carries a
 * sentence of explanation plus an action, on EVERY page, forever — which is the
 * right weight the first time and nagging by the tenth. It can now be collapsed
 * to a single slim line that still names the limitation and still carries the
 * fix. What it can never do is disappear: collapsed is a smaller statement of
 * the same standing condition, not a dismissal, so the paragraph above still
 * holds. The choice is remembered per-browser in localStorage — deliberately not
 * on the account, because it is a display preference, not account state, and the
 * DEPOSIT GATE it describes is enforced server-side either way. A player who
 * clears storage simply sees the full bar again, which is the safe direction to
 * fail in.
 */
import { useEffect, useState, useTransition } from "react";
import { NoticeBar, NoticeBarAction } from "@/components/ui/notice-bar";
import { useT } from "@/lib/i18n";
import { resendEmailVerificationAction } from "@/app/profile/actions";
import { verifyErrorMessage } from "@/lib/verify-error";

const COLLAPSE_KEY = "50pick:email-banner-collapsed";

export function EmailVerifyBanner({ email }: { email: string | null }) {
  const { t } = useT();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ tone: "ok" | "err"; message: string } | null>(null);
  // Start EXPANDED and read the stored preference after mount. Reading
  // localStorage during render would desync server and client HTML; starting
  // expanded also means a storage read that throws (private mode, blocked
  // storage) fails toward showing MORE of the warning, not less.
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

  function resend() {
    setResult(null);
    startTransition(async () => {
      try {
        const r = await resendEmailVerificationAction();
        if (r.ok) {
          // `sent: false` = confirmed in another tab. Say so rather than
          // claiming a send that never happened.
          setResult(r.sent
            ? { tone: "ok", message: t.wallet.verifyResent }
            : { tone: "ok", message: t.wallet.verifyAlreadyDone });
        } else {
          setResult({ tone: "err", message: verifyErrorMessage(t, r.error, r.retryAfterSec) });
        }
      } catch {
        setResult({ tone: "err", message: t.error.somethingDidntWork });
      }
    });
  }

  return (
    <NoticeBar
      tone="warning"
      glyph="mail"
      testId="email-verify-banner"
      // The fix travels WITH the warning — resending the link is the entire
      // remedy, so making the player navigate to profile to find it would be
      // the same mistake as hiding the warning on the deposit page.
      action={
        email ? (
          <NoticeBarAction glyph="mail" onClick={resend} disabled={pending}>
            {pending ? t.common.loading : t.wallet.verifyBannerCta}
          </NoticeBarAction>
        ) : (
          <NoticeBarAction glyph="user" href="/profile/account">
            {t.wallet.verifyBannerNoEmailCta}
          </NoticeBarAction>
        )
      }
    >
      {/* Collapsed keeps the SHORT form of the same statement — never nothing.
          The toggle is a real button so it is reachable by keyboard and reads
          its state to assistive tech. */}
      <button
        type="button"
        onClick={toggle}
        aria-expanded={!collapsed}
        className="text-left underline-offset-2 hover:underline"
      >
        {collapsed
          ? (email ? t.wallet.verifyBannerShort : t.wallet.verifyBannerNoEmailShort)
          : (email ? t.wallet.verifyBannerText : t.wallet.verifyBannerNoEmail)}
      </button>
      {result && (
        <span className={`ml-2 font-semibold ${result.tone === "ok" ? "text-yes-300" : "text-no-300"}`}>
          {result.message}
        </span>
      )}
    </NoticeBar>
  );
}
