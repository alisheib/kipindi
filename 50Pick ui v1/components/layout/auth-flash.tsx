"use client";

/**
 * AuthFlash — fires a kit-styled success toast on /?welcome=back or
 * /profile/kyc?welcome=new, then strips the param so a hard-refresh
 * doesn't re-fire. Mounted once on each landing target.
 */
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/toast";

export function AuthFlash() {
  const sp = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const welcome = sp.get("welcome");
    if (!welcome) return;
    if (welcome === "new") {
      toast({
        title: "Welcome to 50pick · Karibu",
        description: "TZS 10,000 starter credit is in your wallet. Verify ID to enable withdrawals.",
        variant: "success",
      });
    } else if (welcome === "back") {
      toast({
        title: "Welcome back · Karibu tena",
        description: "You're signed in.",
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
