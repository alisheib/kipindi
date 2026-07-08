"use client";

import { RouteError } from "@/components/ui/route-error";
import { useT } from "@/lib/i18n";

export default function AdminError({
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
      logTag="admin"
      eyebrow={t.error.adminError}
      headline={t.error.consolePageSnag}
      body={t.error.errorRecordedServer}
      back={{ href: "/admin", label: t.error.backToDashboard }}
    />
  );
}
