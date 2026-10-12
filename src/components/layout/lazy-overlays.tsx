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
import { nothingIfLost } from "@/components/layout/lost-chunk";

// ⭐ A PART WHOSE CODE NEVER ARRIVES IS LEFT OUT, NOT FATAL — for every player (the Vodacom plan S7's live fix L1,
// S7-PLAN A13(b); WP6c's owed item 8, VODACOM-PLAN §0i). Each of these two is a fetch of its own, made after the page
// is up, and nothing stands between this boundary and the root to catch one that fails: a dropped connection, or a
// deploy landing between the page and the chunk, put the whole page on the critical-error screen. Each loader now ends
// in the app's one lost-chunk guard (`lost-chunk.ts`), as the shell's parts do: a `ChunkLoadError` leaves the chat
// bubble or the primer out for the rest of that page's life, with one report per page to `/api/client-error`; any
// other error is thrown on, as before. `ssr: false` stays: both draw in the browser only, so no HTML changes.
// `test:journey-shell` 12.dynamic.census holds every `next/dynamic` loader in the app to the guard; `qa:lost-chunk`
// drives the two lost chunks in a browser.
const ChatRoot = dynamic(() => import("@/components/chat/ChatRoot").then((m) => m.ChatRoot).catch(nothingIfLost), { ssr: false });
const FirstVisitPrimer = dynamic(() => import("@/components/onboarding/first-visit-primer").then((m) => m.FirstVisitPrimer).catch(nothingIfLost), { ssr: false });

export function LazyOverlays({
  chatbotEnabled = true,
  supportEmail,
}: {
  chatbotEnabled?: boolean;
  /** Server-read in the root layout — see the note at the call site (E-226). */
  supportEmail: string;
}) {
  // Register service worker once on mount (non-blocking)
  useEffect(() => {
    import("@/lib/register-sw").then(({ registerServiceWorker }) => {
      registerServiceWorker();
    });
  }, []);

  return (
    <>
      {/* Chatbot on/off comes from the AI toolkit (server-read in the root layout).
          When disabled the widget is not mounted at all — no bubble, no JS, no calls. */}
      {chatbotEnabled && <ChatRoot supportEmail={supportEmail} />}
      <FirstVisitPrimer />
    </>
  );
}
