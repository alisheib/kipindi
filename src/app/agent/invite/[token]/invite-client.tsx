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
 * The invitee's three moves: get a code (to the BOUND phone), accept with it, or decline.
 * A viewer signed in on a different number is told so and sent to sign in with the right one —
 * never offered the OTP, because the OTP would go to a phone they do not hold.
 */
export function InviteClient({ token, signedIn, viewerMatches, phoneMasked }: { token: string; signedIn: boolean; viewerMatches: boolean; phoneMasked: string }) {
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
      <Callout tone="warning" size="md">{t.agent.invitePhoneMismatch}</Callout>
    );
  }

  return (
    <div className="space-y-3">
      {error && <Callout tone="warning" size="md">{error}</Callout>}
      {!sent ? (
        <Button type="button" variant="primary" size="lg" loading={pending} disabled={pending} leading={<I.phone s={16} />}
          onClick={() => start(async () => {
            const fd = new FormData(); fd.set("token", token);
            let r: Awaited<ReturnType<typeof requestInvitationOtpAction>>;
            try { r = await requestInvitationOtpAction(fd); } catch { r = { ok: false, error: t.error.somethingDidntWork }; }
            if (!r.ok) { setError(r.error); return; }
            setError(null); setSent(true);
          })}>
          {t.agent.inviteOtpSend}
        </Button>
      ) : (
        <div className="rounded-xl glass-panel p-4 space-y-3">
          <p className="text-body-sm text-text-muted">{fill(t.agent.inviteOtpSent, { phone: phoneMasked })}</p>
          <Field label={t.agent.inviteOtpEnter}><Input mono inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} autoComplete="one-time-code" /></Field>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="primary" size="lg" loading={pending} disabled={pending || code.length !== 6} leading={<I.check s={16} />}
              onClick={() => start(async () => {
                const fd = new FormData(); fd.set("token", token); fd.set("code", code);
                let r: Awaited<ReturnType<typeof acceptInvitationAction>>;
                try { r = await acceptInvitationAction(fd); } catch { r = { ok: false, error: t.error.somethingDidntWork }; }
                if (!r.ok) { setError(r.error); return; }
                setResult({ variant: "success", title: t.agent.inviteAccepted, next: "/agent/apply" });
              })}>
              {t.agent.inviteAccept}
            </Button>
            <Button type="button" variant="ghost" size="lg" disabled={pending} onClick={() => setSent(false)}>{t.agent.inviteOtpSend}</Button>
          </div>
        </div>
      )}
      <Button type="button" variant="ghost" size="md" disabled={pending}
        onClick={() => start(async () => {
          const fd = new FormData(); fd.set("token", token);
          let r: Awaited<ReturnType<typeof declineInvitationAction>>;
          try { r = await declineInvitationAction(fd); } catch { r = { ok: false, error: t.error.somethingDidntWork }; }
          if (!r.ok) { setError(r.error); return; }
          setResult({ variant: "info", title: t.agent.inviteDeclined, next: "/agent" });
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
