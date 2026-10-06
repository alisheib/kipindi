"use client";

/**
 * AuthFlash — fires a kit-styled success toast on ?welcome=back or ?welcome=new wherever
 * the request lands, then strips the param so a hard-refresh doesn't re-fire. Mounted ONCE,
 * app-wide, in AppShell. ⚠️ Since 2026-10-06 a new account lands on its safe `next` or on `/`
 * (the market board) — not on `/wallet/deposit` (2026-09-13 to 2026-10-06) and not on
 * `/profile/kyc`, where the old ladder sent it.
 *
 * 🔴 KEYED ON THE PARAM, NOT ON MOUNT (2026-10-06). The effect used to run once (`[]`). But this
 * instance is mounted on the /auth form as well, and sign-up and sign-in land by a server-action
 * `redirect()` — a SOFT navigation that keeps it mounted — so its one run happened on the form,
 * with no param, and never on the landing. Measured on a real sign-up: hydrated, 90 s later, no
 * greeting and `/?welcome=new` still in the address bar. Typing `/?welcome=back` by hand worked
 * (a hard load mounts it fresh), which is how it passed for working.
 *
 * ⭐ THE PARAM LEAVES BY `history.replaceState`, NOT `router.replace`. A router replace is a
 * navigation: it re-requested the page, so the landing dropped to its loading skeleton under the
 * greeting and drew itself twice (and a market landing would lose its bet panel's state). Next
 * syncs `useSearchParams` with a native replaceState, so the address is cleaned in place.
 */
import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n";

export function AuthFlash() {
  const sp = useSearchParams();
  const { toast } = useToast();
  const { t } = useT();
  const welcome = sp.get("welcome");
  // The landing already greeted, so a second run of the effect for the SAME landing (React's
  // development double-run) cannot toast twice. Cleared once the param is gone, so the next
  // sign-in in this tab is greeted again even if it lands on the same address.
  const greeted = useRef<string | null>(null);

  useEffect(() => {
    if (!welcome) { greeted.current = null; return; }
    const href = window.location.href;
    if (greeted.current === href) return;
    greeted.current = href;
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
    // Clear the query so a refresh doesn't re-toast — in place, without re-requesting the page.
    const url = new URL(href);
    url.searchParams.delete("welcome");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [welcome]);

  return null;
}
