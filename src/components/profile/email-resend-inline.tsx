"use client";

/**
 * "SEND THE LINK AGAIN", WHERE THE CONFIRMED EMAIL IS ASKED ABOUT OUTSIDE THE WITHDRAW SCREEN (2026-10-07) — the identity
 * page's email callout and its form row. A deposit asks no email any more (owner ruling); a withdrawal needs a confirmed
 * address, and the link sent at sign-up expires after 24 hours, so wherever the page names an unconfirmed address it
 * offers a new link in place — the identity page used to send the player to the account page for it.
 *
 * ⭐ ONE RULE FOR THE OUTCOME. The withdraw panel lays its own controls out in its card; both use `useResendEmailLink`,
 * so the words and tones (sent → success, a wait → muted, a failure → danger) are decided once.
 * ⛔ `type="button"`: it may stand inside the identity `<form>` and must never submit it (`test:implicit-submit`).
 * ⭐ A 40px ghost control (§A2, `size="sm"`), and ONE live region — mounted EMPTY and filled when the outcome arrives
 * (§A7): a status inserted already holding its text is often not read at all.
 */
import { I } from "@/components/ui/glyphs";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { useResendEmailLink } from "@/lib/use-email-confirm";

const INK = { ok: "text-success-fg", info: "text-text-muted", err: "text-danger-fg" } as const;

export function EmailResendInline({ className = "", children }: {
  className?: string;
  /** Doors drawn beside the button (the "Change email address" link), so the row wraps as one. */
  children?: React.ReactNode;
}) {
  const { t } = useT();
  const { pending, result, resend } = useResendEmailLink();
  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={resend} loading={pending} leading={<I.mail s={14} />} className="btn-pill" data-testid="email-resend-inline">
          {t.wallet.verifyResendCta}
        </Button>
        {children}
      </div>
      <p role="status" data-email-resend-result={result?.tone} className={`text-body-sm font-medium leading-snug ${result ? `mt-1.5 ${INK[result.tone]}` : ""}`}>
        {result?.message ?? ""}
      </p>
    </div>
  );
}
