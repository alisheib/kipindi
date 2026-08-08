"use client";

/**
 * B-13 — the revoked device's explanation, delivered.
 *
 * Rendered by AppShell when getSession() found the cookie's session displaced
 * in the registry (a newer login elsewhere) during a Server Component render —
 * a context that cannot set the kp_revoked flash cookie or redirect for the
 * whole tree. This client shim routes to the login page with `?revoked=1`
 * (which the page maps to the "signed in on another device" panel) and
 * round-trips where the player was via `next=`.
 *
 * `replace`, not `push`: Back must not return to a shell that believes the
 * player is signed out mid-page.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function SessionRevokedRedirect({ next }: { next?: string }) {
  const router = useRouter();
  useEffect(() => {
    const safe = next && /^\/(?![/\\])/.test(next) && !next.startsWith("/auth/") ? next : "";
    router.replace(`/auth/login?revoked=1${safe ? `&next=${encodeURIComponent(safe)}` : ""}`);
  }, [router, next]);
  return null;
}
