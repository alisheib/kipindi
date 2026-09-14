/**
 * 50pick Service Worker — offline fallback + push notification support.
 *
 * Strategy: network-first for pages (always fresh), cache-first for static
 * assets (fonts, icons, images). Push notifications display even when the
 * app is closed.
 *
 * Registered from src/lib/register-sw.ts (client-side, lazy).
 */

// Bumped v2 → v3 (2026-07-21): the payment-provider marks (/pay/mixx.png,
// /pay/halopesa.png) were replaced with new official logos. These are served
// cache-first below (they match the .png rule), so without a cache-version bump
// every returning visitor keeps seeing the OLD logo from the SW cache forever.
// Bumping the name makes `activate` delete the stale cache and re-fetch fresh.
// v3 → v4 (2026-09-14, E-381 §6 item 13): static assets are now stale-while-revalidate, so a same-URL asset
// refreshes on the next visit by itself — this name no longer has to be bumped by hand for that. The bump
// clears caches written by the old cache-first rule once.
const CACHE_NAME = "50pick-v4";
// C2j — dedicated branded offline route (precached below) instead of falling
// back to the data-heavy home page.
const OFFLINE_URL = "/offline";

// Static assets worth caching for instant repeat loads
const PRECACHE = [
  "/offline",
  "/favicon.svg",
  "/favicon.ico",
  "/brand/mark-color.svg",
];

// Install: precache critical assets.
// ⚠️ E-381 §6 item 13 · ONE AT A TIME, NOT addAll. `cache.addAll` is atomic: one failed precache fetch (a deploy
// in progress, a flaky connection) rejected the whole install and discarded the worker — and with it the offline
// page. Each asset is now added on its own, and a failure leaves the others cached.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(PRECACHE.map((url) => cache.add(url)))),
  );
  self.skipWaiting();
});

/** The branded offline page if it is cached, otherwise a minimal one — never `undefined`. */
function offlineResponse() {
  return caches.match(OFFLINE_URL).then((cached) => cached || new Response(
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
      + '<title>50pick · offline</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;'
      + 'background:#0b0d2e;color:#e8e9f5;font:16px system-ui,sans-serif;text-align:center;padding:24px">'
      + '<div><p style="font-weight:700;font-size:20px">You are offline</p>'
      + '<p>Check your connection and try again · Hakuna mtandao, jaribu tena.</p></div></body>',
    { status: 503, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } },
  ));
}

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

// Fetch: network-first for navigation, cache-first for static assets
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // API routes — always network, never cache
  if (url.pathname.startsWith("/api/")) return;

  // Static assets (fonts, images, icons) — cache-first
  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/brand/") ||
    url.pathname.startsWith("/hero/") ||
    url.pathname.match(/\.(woff2?|ttf|otf|svg|png|jpg|webp|ico)$/)
  ) {
    // Stale-while-revalidate: answer from the cache at once when we can, and refresh the entry in the background,
    // so a replaced logo at the same URL reaches the player on their next visit (it used to need a CACHE_NAME bump).
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => cache.match(request).then((cached) => {
        const network = fetch(request).then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        });
        if (cached) { event.waitUntil(network.catch(() => undefined)); return cached; }
        return network;
      })),
    );
    return;
  }

  // Navigation — network-first, offline fallback
  if (request.mode === "navigate") {
    // ⛔ E-381 §6 item 13 · `caches.match` resolves to `undefined` when the page was never cached, and
    // `respondWith(undefined)` throws — the player got the browser's own network-error page instead of ours.
    event.respondWith(
      fetch(request).catch(() => offlineResponse()),
    );
    return;
  }
});

// Push notifications — display even when app is closed
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "50pick", body: event.data.text() };
  }

  const options = {
    body: payload.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: payload.tag || "50pick-notification",
    data: { url: payload.url || "/" },
    vibrate: [100, 50, 100],
    actions: payload.actions || [],
    // Renotify so rapid notifications don't collapse silently
    renotify: !!payload.tag,
  };

  event.waitUntil(self.registration.showNotification(payload.title || "50pick", options));
});

// Notification click — open or focus the app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // Focus an existing tab if one is open
      for (const client of clients) {
        if (new URL(client.url).origin === self.location.origin && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Otherwise open a new window
      return self.clients.openWindow(url);
    }),
  );
});
