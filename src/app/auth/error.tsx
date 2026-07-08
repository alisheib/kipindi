"use client";

import { RouteError } from "@/components/ui/route-error";
import { useT } from "@/lib/i18n";

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useT();
  return (
    <RouteError
      error={error}
      reset={reset}
      logTag="auth"
      body={t.error.pageHitSnagBody}
      back={{ href: "/auth/login", label: t.auth.signInTitle }}
    />
  );
}
