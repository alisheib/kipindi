"use client";

/**
 * THE FIRST-DEPOSIT NOTICE — one quiet line, with an X, remembered once dismissed. It began as the identity notice
 * (2026-09-13); from 2026-10-07 it also carries the confirmed email (`email` / `both` wordings), asked before a
 * withdrawal the same quiet way.
 *
 * ⭐ WHY IT EXISTS (Ali, 2026-09-13). Identity is asked before a WITHDRAWAL and before nothing else,
 * and it is raised without disturbing anybody: "maybe on first deposit show a small notice that
 * finishing KYC should happen before withdrawals, in a nice undisturbing way … never explaining things
 * in annoying ways." This is that notice. The withdraw screen's own panel (`kyc-gate-panel.tsx`,
 * purpose "payout") is the only other place identity is put in front of somebody who did not go
 * looking for it.
 *
 * ⭐ WHO SEES IT, AND WHICH WORDING, IS DECIDED ON THE SERVER — `firstDepositNotice` in `src/lib/server/kyc-notice.ts`,
 * called by `/wallet` (under the balance) and the card-deposit return page (confirmed state only). This
 * file never re-derives it: when it is mounted, it is due.
 *
 * ⭐ DISMISSED ONCE, REMEMBERED IN A COOKIE, SO IT NEVER SHIFTS THE PAGE. The first version kept the
 * dismissal in localStorage, which only the browser can read, so the notice had to start hidden and pop
 * in after mount — pushing the tabs and history down a line on every visit where it was due. Now it is
 * in the first HTML or not rendered at all.
 * 🔴 PER PLAYER, NOT PER BROWSER (2026-09-14, audit session 95, U2). The X used to write the bare
 * `kp-kyc-notice=dismissed`, which the server read with no user binding — so on a shared phone player
 * A's dismissal hid the notice from player B. The X now writes the value the SERVER computed for the
 * signed-in player (`kycNoticeDismissValue` in `src/lib/server/kyc-notice.ts`), and the server counts
 * only that value. It reaches this component as the `dismissValue` prop (the deposit return page) or
 * from `KycNoticeDismissScope` (/wallet, whose mount sits inside `wallet-client.tsx`, which receives
 * only the due flag). ⛔ This file never computes it: the hash is `node:crypto`, and the binding is the
 * server's word.
 * ⚠️ With no value (a mount nobody bound) or a browser that refuses the cookie, the X hides it for this
 * view only and it comes back on the next load: for a courtesy line that is the honest failure — it
 * cannot remember what it cannot store, or for whom.
 *
 * ⛔ THE COPY RULE (2026-09-13): verification is attached forward to the withdrawal, never to adding
 * money or playing, and the line states what IS required without explaining why. One sentence and a
 * link. No animation — it is there, and the X removes it in place.
 *
 * ⚠️ The surface is the kit's `Callout` (tone info, size sm) — NOT a `NoticeBar`, not full-bleed, not
 * amber: nothing has gone wrong and there is no hurry. That note's own body type is the caption tier,
 * below the §T4 reading floor for a sentence somebody has to read, so the sentence sets one rung up.
 *
 * ⛔ THIS FILE EXPORTS ONLY COMPONENTS — the notice and the scope that carries its dismiss value. It is
 * "use client"; a plain helper exported from here and called by a server page is the client-reference
 * outage `kyc-gate-state.ts` records. The shared constants live in the isomorphic `src/lib/kyc-notice.ts`,
 * and the per-player value is computed in `src/lib/server/kyc-notice.ts`.
 */
import Link from "next/link";
import { createContext, useContext, useState, type ReactNode } from "react";
import { Callout } from "@/components/ui/callout";
import { I } from "@/components/ui/glyphs";
import { useT } from "@/lib/i18n";
import { KYC_NOTICE_COOKIE, KYC_NOTICE_MAX_AGE_S, type FirstDepositNotice } from "@/lib/kyc-notice";

/**
 * ⭐ THE THREE WORDINGS, FROM ONE TABLE (2026-10-07). The confirmed email moved from deposits to withdrawals and is asked
 * the quiet way, like identity, so the note says what is still owed before a withdrawal: identity, the email, or both.
 * `both` links to /profile/kyc, whose form already carries the email row and its door; `email` links to the account
 * page, where the address is added or its link re-sent. ⛔ The email wording says "before you withdraw", never "first":
 * the step returns whenever the address changes. "Confirm", never "verify", beside the email.
 */
const VARIANT: Record<FirstDepositNotice, { glyph: "shieldcheck" | "mail"; href: string }> = {
  identity: { glyph: "shieldcheck", href: "/profile/kyc" },
  email:    { glyph: "mail",        href: "/profile/account" },
  both:     { glyph: "shieldcheck", href: "/profile/kyc" },
};

const DismissValue = createContext<string | null>(null);

/**
 * Hands the server's per-player dismiss value to a notice mounted further down, inside a client tree
 * that only receives the due flag (/wallet → `wallet-client.tsx`). A server page renders it around that
 * tree; the value is `kycNoticeDismissValue(userId)`, or null when the notice is not due.
 */
export function KycNoticeDismissScope({ value, children }: { value: string | null; children: ReactNode }) {
  return <DismissValue.Provider value={value}>{children}</DismissValue.Provider>;
}

export function KycFirstDepositNotice({
  dismissValue,
  variant = "identity",
}: {
  /** The server's per-player value to write on dismiss (`kycNoticeDismissValue`). Falls back to the
   *  nearest `KycNoticeDismissScope`. */
  dismissValue?: string | null;
  /** What is still owed before a withdrawal — the server's answer (`firstDepositNotice`). */
  variant?: FirstDepositNotice;
} = {}) {
  const { t } = useT();
  const v = VARIANT[variant];
  const body = variant === "email" ? t.kycNotice.bodyEmail : variant === "both" ? t.kycNotice.bodyBoth : t.kycNotice.body;
  const cta = variant === "email" ? t.kycNotice.ctaEmail : t.kycNotice.cta;
  const scoped = useContext(DismissValue);
  const value = dismissValue ?? scoped;
  const [open, setOpen] = useState(true);

  if (!open) return null;

  const dismiss = () => {
    // ⛔ No value, no cookie: writing anything unbound is the shared-phone defect this replaced.
    if (value) {
      try {
        const secure = window.location.protocol === "https:" ? "; secure" : "";
        // Written verbatim: `d:` and hex are plain cookie characters, so the server reads back exactly this.
        document.cookie = `${KYC_NOTICE_COOKIE}=${value}; path=/; max-age=${KYC_NOTICE_MAX_AGE_S}; samesite=lax${secure}`;
      } catch {
        /* cookies blocked — hidden for this view only */
      }
    }
    setOpen(false);
  };

  return (
    <div data-testid="kyc-first-deposit-notice" data-notice-variant={variant} className="relative">
      {/* The right padding keeps the sentence clear of the dismiss target laid over the box's edge. */}
      <Callout tone="info" glyph={v.glyph} size="sm" className="pr-[48px]">
        <p className="text-body-sm leading-snug text-text-secondary">
          {body}{" "}
          {/* ⚠️ Plain /profile/kyc, NOT `?next=/wallet/withdraw`. The KYC page honours a safe `next`,
              but only as a "Continue" on the approved state, and none of its form actions carry it
              forward — and this line answers no refused action, so there is nothing to return to. */}
          <Link
            href={v.href as never}
            className="whitespace-nowrap font-semibold text-brand-300 underline underline-offset-2 hover:text-brand-200"
          >
            {cta}
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
