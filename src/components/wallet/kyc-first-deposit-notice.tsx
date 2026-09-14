"use client";

/**
 * THE FIRST-DEPOSIT IDENTITY NOTICE — one quiet line, with an X, remembered once dismissed.
 *
 * ⭐ WHY IT EXISTS (Ali, 2026-09-13). Identity is asked before a WITHDRAWAL and before nothing else,
 * and it is raised without disturbing anybody: "maybe on first deposit show a small notice that
 * finishing KYC should happen before withdrawals, in a nice undisturbing way … never explaining things
 * in annoying ways." This is that notice. The withdraw screen's own panel (`kyc-gate-panel.tsx`,
 * purpose "payout") is the only other place identity is put in front of somebody who did not go
 * looking for it.
 *
 * ⭐ WHO SEES IT IS DECIDED ON THE SERVER — `firstDepositNoticeDue` in `src/lib/server/kyc-notice.ts`,
 * called by `/wallet` (under the balance) and the card-deposit return page (confirmed state only). This
 * file never re-derives it: when it is mounted, it is due.
 *
 * ⭐ DISMISSED ONCE, REMEMBERED PER BROWSER — IN A COOKIE, SO IT NEVER SHIFTS THE PAGE. The X writes
 * `kp-kyc-notice=dismissed` (`src/lib/kyc-notice.ts`) and the server stops rendering it. The first
 * version kept the dismissal in localStorage, which only the browser can read, so the notice had to
 * start hidden and pop in after mount — pushing the tabs and history down a line on every visit where
 * it was due. Now it is in the first HTML or not rendered at all.
 * ⚠️ A browser that refuses the cookie hides it for this view and sees it again on the next load:
 * for a courtesy line that is the honest failure (it cannot remember what it cannot store).
 *
 * ⛔ THE COPY RULE (2026-09-13): verification is attached forward to the withdrawal, never to adding
 * money or playing, and the line states what IS required without explaining why. One sentence and a
 * link. No animation — it is there, and the X removes it in place.
 *
 * ⚠️ The surface is the kit's `Callout` (tone info, size sm) — NOT a `NoticeBar`, not full-bleed, not
 * amber: nothing has gone wrong and there is no hurry. That note's own body type is the caption tier,
 * below the §T4 reading floor for a sentence somebody has to read, so the sentence sets one rung up.
 *
 * ⛔ THIS FILE EXPORTS ONLY THE COMPONENT. It is "use client"; a helper exported from here and called by
 * a server page is the client-reference outage `kyc-gate-state.ts` records. The shared constants live
 * in the isomorphic `src/lib/kyc-notice.ts`.
 */
import Link from "next/link";
import { useState } from "react";
import { Callout } from "@/components/ui/callout";
import { I } from "@/components/ui/glyphs";
import { useT } from "@/lib/i18n";
import { KYC_NOTICE_COOKIE, KYC_NOTICE_DISMISSED, KYC_NOTICE_MAX_AGE_S } from "@/lib/kyc-notice";

export function KycFirstDepositNotice() {
  const { t } = useT();
  const [open, setOpen] = useState(true);

  if (!open) return null;

  const dismiss = () => {
    try {
      const secure = window.location.protocol === "https:" ? "; secure" : "";
      document.cookie = `${KYC_NOTICE_COOKIE}=${KYC_NOTICE_DISMISSED}; path=/; max-age=${KYC_NOTICE_MAX_AGE_S}; samesite=lax${secure}`;
    } catch {
      /* cookies blocked — hidden for this view only */
    }
    setOpen(false);
  };

  return (
    <div data-testid="kyc-first-deposit-notice" className="relative">
      {/* The right padding keeps the sentence clear of the dismiss target laid over the box's edge. */}
      <Callout tone="info" glyph="shieldcheck" size="sm" className="pr-[48px]">
        <p className="text-body-sm leading-snug text-text-secondary">
          {t.kycNotice.body}{" "}
          {/* ⚠️ Plain /profile/kyc, NOT `?next=/wallet/withdraw`. The KYC page honours a safe `next`,
              but only as a "Continue" on the approved state, and none of its form actions carry it
              forward — and this line answers no refused action, so there is nothing to return to. */}
          <Link
            href="/profile/kyc"
            className="whitespace-nowrap font-semibold text-brand-300 underline underline-offset-2 hover:text-brand-200"
          >
            {t.kycNotice.cta}
          </Link>
        </p>
      </Callout>
      {/* ⭐ A 44px target with a 14px mark: the size is for the thumb, not the eye. Transparent until
          hovered, so it does not read as a second button beside the link. */}
      <button
        type="button"
        onClick={dismiss}
        aria-label={t.kycNotice.dismiss}
        data-testid="kyc-first-deposit-notice-dismiss"
        className="absolute right-0 top-1/2 -translate-y-1/2 inline-flex h-[44px] w-[44px] items-center justify-center rounded-md text-text-subtle hover:text-text transition-colors"
      >
        <I.x s={14} aria-hidden />
      </button>
    </div>
  );
}
