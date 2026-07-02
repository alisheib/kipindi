"use client";

/**
 * LazyOverlays — client boundary that lazy-loads heavy overlay components
 * (ChatRoot, FirstVisitPrimer) via dynamic(). These are portaled to body
 * and aren't needed for First Contentful Paint, so deferring them from
 * the initial JS bundle reduces Time to Interactive.
 *
 * Also registers the service worker on mount for offline + push support.
 *
 * Must be a client component because dynamic({ ssr: false }) requires a
 * client boundary — Server Components can't use it directly.
 */
import { useEffect } from "react";
import dynamic from "next/dynamic";

const ChatRoot = dynamic(
  () => import("@/components/chat/ChatRoot").then(m => m.ChatRoot),
  { ssr: false },
);
const FirstVisitPrimer = dynamic(
  () => import("@/components/onboarding/first-visit-primer").then(m => m.FirstVisitPrimer),
  { ssr: false },
);

export function LazyOverlays() {
  // Register service worker once on mount (non-blocking)
  useEffect(() => {
    import("@/lib/register-sw").then(({ registerServiceWorker }) => {
      registerServiceWorker();
    });
  }, []);

  return (
    <>
      <ChatRoot />
      <FirstVisitPrimer />
    </>
  );
}
