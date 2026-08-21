import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthPanel, AuthHeader } from "@/components/auth/auth-panel";
import { SubmitButton } from "@/components/ui/submit-button";
import { OtpInput } from "@/components/ui/otp-input";
import { Input } from "@/components/ui/input";
import { FieldLegend } from "@/components/ui/field-legend";
import { I } from "@/components/ui/glyphs";
import { verifyLogin2faAction } from "../login/actions";
import { getServerT } from "@/lib/i18n-server";

export async function generateMetadata() {
  const { t } = await getServerT();
  return { title: t.security.challengeTitle };
}

export default async function TwoFactorChallengePage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string; mode?: string }> }) {
  const { t } = await getServerT();
  const sp = await searchParams;
  const error = sp.error ?? "";
  const backup = sp.mode === "backup";
  const nextRaw = (sp.next ?? "").trim();
  const nextSafe = /^\/(?![/\\])/.test(nextRaw) && !nextRaw.startsWith("/auth/") ? nextRaw : "";
  const nextQuery = nextSafe ? `&next=${encodeURIComponent(nextSafe)}` : "";
  const errorMsg: Record<string, string> = {
    invalid: t.security.challengeInvalid,
    rate_limited: t.security.challengeRateLimited,
  };

  return (
    <AuthShell>
      <AuthPanel>
        <AuthHeader
          tone="brand"
          icon={<I.shieldcheck s={13} />}
          eyebrow={t.security.eyebrow}
          title={t.security.challengeTitle}
          subtitle={backup ? t.security.challengeBackupHint : t.security.challengeHint}
        />

        {error && (
          <div id="tfa-error" role="alert" className="rounded-md border border-no-700 bg-no-500/10 px-3 py-2.5 text-[13px] text-no-300">
            {errorMsg[error] ?? error}
          </div>
        )}

        <form action={verifyLogin2faAction} className="space-y-3">
          {nextSafe && <input type="hidden" name="next" value={nextSafe} />}
          <label className="block">
            <FieldLegend className="block mb-1.5">{backup ? t.security.backupCodeLabel : t.security.codeLabel}</FieldLegend>
            {backup ? (
              <Input
                id="code"
                name="code"
                required
                autoComplete="one-time-code"
                autoCapitalize="characters"
                placeholder="XXXXX-XXXXX"
                aria-invalid={error ? "true" : undefined}
                aria-describedby={error ? "tfa-error" : undefined}
              />
            ) : (
              <OtpInput
                id="code"
                name="code"
                required
                placeholder="• • • • • •"
                aria-invalid={error ? "true" : undefined}
                aria-describedby={error ? "tfa-error" : undefined}
              />
            )}
          </label>
          <SubmitButton label={t.common.confirm} pendingLabel={t.common.verifying} />
        </form>

        <div className="flex items-center justify-between border-t border-border pt-3">
          <Link
            href={`/auth/login${nextSafe ? `?next=${encodeURIComponent(nextSafe)}` : ""}` as never}
            className="font-mono text-[12px] uppercase tracking-[0.14em] text-text-subtle hover:text-text transition-colors"
          >
            ← {t.common.back}
          </Link>
          <Link
            href={`/auth/2fa?${backup ? "" : "mode=backup"}${nextQuery}`.replace(/[?&]$/, "") as never}
            className="font-mono text-[12px] uppercase tracking-[0.14em] text-brand-300 hover:text-brand-200 transition-colors"
          >
            {backup ? t.security.useAuthenticator : t.security.useBackupCode}
          </Link>
        </div>
      </AuthPanel>

      <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-text-subtle">
        {t.security.challengeFootnote}
      </p>
    </AuthShell>
  );
}
