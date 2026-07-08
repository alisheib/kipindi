"use client";

import { RouteError } from "@/components/ui/route-error";
import { useT } from "@/lib/i18n";

export default function WalletError({
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
      logTag="wallet"
      body={t.error.walletSafe}
      back={{ href: "/wallet", label: t.error.backToWallet }}
    />
  );
}
