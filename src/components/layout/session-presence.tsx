"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * E-381 §6 item 4 · A SIGNED-IN SHELL THAT NOTICES THE SESSION ENDED.
 *
 * Mounted by AppShell only while the shell was rendered signed in. The root layout is not re-run by a soft
 * navigation, so without this a displaced player kept the avatar and the cached balance while they clicked around.
 * On every navigation after the first render, and when the tab becomes visible again, it asks
 * `/api/session/status`; if the session is gone it leaves with a DOCUMENT navigation to `/auth/session-ended`, which
 * clears the cookie and lands on the sign-in page with the true reason.
 *
 * ⛔ AT MOST ONE ESCAPE A MINUTE (sessionStorage). If the status route and the handler ever disagreed, a loop of
 * document navigations would be worse than a stale avatar — the throttle makes that impossible.
 * ⛔ A failed request, a non-JSON answer or `active: true` does nothing.
 */
const KEY = "50pick:session-escape-at";

export function SessionPresence() {
  const pathname = usePathname();
  const first = useRef(true);
  const lastCheck = useRef(0);

  useEffect(() => {
    const check = async () => {
      const now = Date.now();
      if (now - lastCheck.current < 3_000) return;
      lastCheck.current = now;
      try {
        const r = await fetch("/api/session/status", { cache: "no-store", credentials: "same-origin" });
        if (!r.ok) return;
        const body = (await r.json()) as { active?: unknown };
        if (body.active !== false) return;
        let last = 0;
        try { last = Number(window.sessionStorage.getItem(KEY) ?? 0); } catch { /* storage blocked */ }
        if (Date.now() - last < 60_000) return;
        try { window.sessionStorage.setItem(KEY, String(Date.now())); } catch { /* storage blocked */ }
        const here = window.location.pathname + window.location.search;
        // The fragment rides along (item 14): the 303s after it inherit it, so a `#pos_…` anchor survives sign-in.
        const hash = /^#[A-Za-z0-9_-]{1,80}$/.test(window.location.hash) ? window.location.hash : "";
        window.location.assign(`/auth/session-ended?next=${encodeURIComponent(here)}${hash}`);
      } catch { /* offline or aborted — nothing to say */ }
    };
    if (first.current) { first.current = false; }
    else void check();
    const onVisible = () => { if (document.visibilityState === "visible") void check(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [pathname]);

  return null;
}
