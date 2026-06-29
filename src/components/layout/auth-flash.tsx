"use client";

/**
 * AuthFlash — fires a kit-styled success toast on /?welcome=back or
 * /profile/kyc?welcome=new, then strips the param so a hard-refresh
 * doesn't re-fire. Mounted once on each landing target.
 */
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n";

export function AuthFlash() {
  const sp = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useT();

  useEffect(() => {
    const welcome = sp.get("welcome");
    if (!welcome) return;
    if (welcome === "new") {
      toast({
        title: t.common.welcomeTo50pick,
        description: t.common.welcomeNewBody,
        variant: "success",
      });
    } else if (welcome === "back") {
      toast({
        title: t.common.welcomeBack,
        description: t.common.welcomeBackBody,
        variant: "success",
      });
    }
    // Clear the query so a refresh doesn't re-toast.
    const url = new URL(window.location.href);
    url.searchParams.delete("welcome");
    router.replace((url.pathname + (url.search ? url.search : "")) as never);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
