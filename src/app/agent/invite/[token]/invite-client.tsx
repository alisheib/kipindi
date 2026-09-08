"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Callout } from "@/components/ui/callout";
import { OperationResultModal } from "@/components/markets/operation-result-modal";
import { I } from "@/components/ui/glyphs";
import { useT } from "@/lib/i18n";
import { fill } from "@/lib/utils";
import { requestInvitationOtpAction, acceptInvitationAction, declineInvitationAction } from "./actions";

/**
 * The invitee's three moves: get a code (to the BOUND address), accept with it, or decline.
 *
 * ⭐ THE ADDRESS IS AN EMAIL SINCE 2026-09-08 — the platform has no licensed SMS provider, so
 * both the invitation and its code go through Postmark. Invitations issued before then are
 * phone-bound and still readable; the service refuses to send them a code and says why, since
 * arming a "text me a code" button that cannot deliver is the defect this change removed.
 *
 * 🔴 THE MISMATCH BRANCH WAS A DEAD END, AND THE FILE'S OWN HEADER CLAIMED OTHERWISE. It said
 * a viewer on the wrong account "is told so and sent to sign in with the right one" — and
 * rendered a lone `Callout` with no action, while the copy instructed them to "sign in with
 * that address". The not-signed-in branch two lines above it offers buttons; this one offered
 * nothing, so the only way out was for the reader to find the sign-out control themselves.
 * ⭐ It now offers the way out it always described.
 */
export function InviteClient({
  token,
  signedIn,
  viewerMatches,
  addressMasked,
  channel,
}: {
  token: string;
  signedIn: boolean;
  viewerMatches: boolean;
  addressMasked: string;
  channel: "EMAIL" | "PHONE";
}) {
  const { t } = useT();
  const router = useRouter();
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ variant: "success" | "info" | "danger"; title: string; subtitle?: string; next: string } | null>(null);
  const next = `/agent/invite/${token}`;

  if (!signedIn) {
    return (
      <div className="flex flex-col gap-2 sm:flex-row">
        <Link href={`/auth/login?next=${encodeURIComponent(next)}` as never}><Button variant="primary" size="lg" leading={<I.user s={16} />}>{t.common.signIn}</Button></Link>
        <Link href={`/auth/register?next=${encodeURIComponent(next)}` as never}><Button variant="primary" size="lg">{t.common.createAccount}</Button></Link>
        <p className="text-body-sm text-text-muted sm:self-center">{t.agent.inviteSignIn}</p>
      </div>
    );
  }
  if (!viewerMatches) {
    return (
      <div className="space-y-3">
        <Callout tone="warning" size="md">
          {fill(channel === "EMAIL" ? t.agent.inviteEmailMismatch : t.agent.invitePhoneMismatch, { address: addressMasked })}
        </Callout>
        {/* ⭐ THE ACTION THE COPY PROMISES. `?next=` returns them here once they are signed in
            on the right account, so accepting is one step rather than a hunt for this link
            in an email they may already have closed. */}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href={`/auth/login?next=${encodeURIComponent(next)}` as never}>
            <Button variant="primary" size="lg" leading={<I.user s={16} />}>{t.agent.inviteSwitchAccount}</Button>
          </Link>
          <Link href={"/agent" as never}>
            <Button variant="ghost" size="lg">{t.agent.title}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && <Callout tone="warning" size="md">{error}</Callout>}
      {!sent ? (
        <Button type="button" variant="primary" size="lg" loading={pending} disabled={pending} leading={<I.mail s={16} />}
          onClick={() => start(async () => {
            const fd = new FormData(); fd.set("token", token);
            let r: Awaited<ReturnType<typeof requestInvitationOtpAction>>;
            try { r = await requestInvitationOtpAction(fd); } catch { r = { ok: false, error: t.error.somethingDidntWork }; }
            if (!r.ok) { setError(r.error); return; }
            /**
             * ⭐ THE PANEL OPENS ONLY IF THE MAIL ACTUALLY WENT. `sendEmail` returns a
             * `reason`, and the two that mean "nothing arrived" get a sentence naming the
             * remedy instead of a code box the invitee can never fill. ⛔ Showing "we sent
             * you a code" after a suppressed or failed send is the same class of lie the SMS
             * copy told, and it would strand the invitee on a screen with no way forward.
             */
            const delivery = r.data?.delivery;
            if (delivery === "suppressed") { setError(t.agent.inviteOtpSuppressed); return; }
            if (delivery === "failed" || delivery === "stub" || delivery === "no-address") { setError(t.agent.inviteOtpUndeliverable); return; }
            setError(null); setSent(true);
          })}>
          {t.agent.inviteOtpSend}
        </Button>
      ) : (
        <div className="rounded-xl glass-panel p-4 space-y-3">
          <p className="text-body-sm text-text-muted">{fill(t.agent.inviteOtpSent, { address: addressMasked })}</p>
          <Field label={t.agent.inviteOtpEnter} hint={t.agent.inviteOtpHint}>
            <Input mono inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} autoComplete="one-time-code" />
          </Field>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="primary" size="lg" loading={pending} disabled={pending || code.length !== 6} leading={<I.check s={16} />}
              onClick={() => start(async () => {
                const fd = new FormData(); fd.set("token", token); fd.set("code", code);
                let r: Awaited<ReturnType<typeof acceptInvitationAction>>;
                try { r = await acceptInvitationAction(fd); } catch { r = { ok: false, error: t.error.somethingDidntWork }; }
                if (!r.ok) { setError(r.error); return; }
                // ⭐ The subtitle was declared on this state and never set by either call
                // site, so both modals rendered with an empty second line.
                setResult({ variant: "success", title: t.agent.inviteAccepted, subtitle: t.agent.inviteAcceptedBody, next: "/agent/apply" });
              })}>
              {t.agent.inviteAccept}
            </Button>
            {/* ⭐ "Send it again", not a second copy of the primary's label. Both buttons read
                identically before this — the same words on the action and on its retry. */}
            <Button type="button" variant="ghost" size="lg" disabled={pending} onClick={() => { setCode(""); setSent(false); }}>{t.agent.inviteOtpResend}</Button>
          </div>
        </div>
      )}
      <Button type="button" variant="ghost" size="md" disabled={pending}
        onClick={() => start(async () => {
          const fd = new FormData(); fd.set("token", token);
          let r: Awaited<ReturnType<typeof declineInvitationAction>>;
          try { r = await declineInvitationAction(fd); } catch { r = { ok: false, error: t.error.somethingDidntWork }; }
          if (!r.ok) { setError(r.error); return; }
          setResult({ variant: "info", title: t.agent.inviteDeclined, subtitle: t.agent.inviteDeclinedBody, next: "/agent" });
        })}>
        {t.agent.inviteDecline}
      </Button>
      {result && (
        <OperationResultModal open variant={result.variant} eyebrow={t.agent.eyebrow} title={result.title} subtitle={result.subtitle} stripTone="brand"
          primaryLabel={t.common.continue} onPrimary={() => router.push(result.next as never)} onClose={() => router.push(result.next as never)} />
      )}
    </div>
  );
}
