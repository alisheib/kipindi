"use client";

import { RouteError } from "@/components/ui/route-error";
import { useT } from "@/lib/i18n";

export default function ProfileError({
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
      logTag="profile"
      body={t.error.pageHitSnagBody}
      back={{ href: "/profile", label: t.error.backToProfile }}
    />
  );
}
