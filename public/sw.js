/**
 * 50pick Service Worker — offline fallback + push notification support.
 *
 * Strategy: network-first for pages (always fresh), stale-while-revalidate for
 * static files (fonts, icons, images) — and only an image or a font is ever
 * kept. Push notifications display even when the app is closed.
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
// 🔴 v4 → v5 (2026-10-09, R4-G · the privacy and money-truth fix): EVERY CACHE UP TO v4 MAY HOLD A PERSON'S PAGE.
// "/offline" was a page rendered inside the app shell, and `cache.add` sent the session cookie with it, so the cached
// copy was the header of whoever was signed in at install — their balance, their avatar, the staff preview strip —
// shown offline to anybody on that phone afterwards. The name is bumped so `activate` below deletes those caches on
// every device that already holds one; the new copy is fetched with no cookie (`precacheRequest`) and is a document
// that reads nothing from its request (`src/app/offline/route.ts`).
// 🔴 v5 → v6 (2026-10-09, round 5, review F2 · the static rule's half of hotfix 9cb95938): EVERY NAME UP TO v5 RAN A
// STATIC RULE THAT COULD KEEP A PAGE. It matched by the address's file name alone and kept whatever answered, so a
// signed-in reader's page at `/markets/x.png` (a not-found inside their app shell) was stored and answered first to the
// next visitor of that address on the same phone (a sandbox run of this worker). The rule now never takes a navigation
// and keeps only an image or a font (`keepable`, below); the name moves so `activate` drops what an older one stored.
// v5 itself never reached production (main ran v4), so devices there go v4 → v6. ⛔ Never reuse a name up to v5.
const CACHE_NAME = "50pick-v6";
// C2j — dedicated branded offline route (precached below) instead of falling
// back to the data-heavy home page. Since R4-G a self-contained document, not a page: `src/lib/offline-document.ts`.
const OFFLINE_URL = "/offline";

// Static assets worth caching for instant repeat loads
const PRECACHE = [
  OFFLINE_URL,
  "/favicon.svg",
  "/favicon.ico",
  "/brand/mark-color.svg",
];

/**
 * ⛔ A PRECACHE REQUEST CARRIES NO COOKIE (R4-G, 2026-10-09). `cache.add(url)` builds a same-origin request, and a
 * same-origin request sends the session cookie: the server rendered "/offline" for the person signed in and this
 * worker kept it. `credentials: "omit"` sends no cookie at all (no session, no language, no preview pass), and
 * `cache: "reload"` lets no HTTP-cache copy answer in the network's place.
 */
const precacheRequest = (url) => new Request(url, { credentials: "omit", cache: "reload" });

// Install: precache critical assets.
// ⚠️ E-381 §6 item 13 · ONE AT A TIME, NOT addAll. `cache.addAll` is atomic: one failed precache fetch (a deploy
// in progress, a flaky connection) rejected the whole install and discarded the worker — and with it the offline
// page. Each asset is now added on its own, and a failure leaves the others cached.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(PRECACHE.map((url) => cache.add(precacheRequest(url))))),
  );
  self.skipWaiting();
});

/**
 * The last resort, when even the offline document was never cached: its own three languages — each phrase exactly as
 * `src/lib/i18n-dict.ts` writes `common.offline`, `common.offlineHint` and `error.tryAgain` (`test:offline-neutral`
 * holds every one to the dictionary) — chosen when it is SHOWN from the `kp-locale` cookie or the saved choice, with a
 * retry, and a reload by itself when the connection comes back. Swahili, the platform default, when nothing is chosen.
 */
const FALLBACK_DEFAULT = "sw";
const FALLBACK_WORDS = {
  en: { offline: "You’re offline", hint: "Some features may not work", retry: "Try again" },
  sw: { offline: "Hauko mtandaoni", hint: "Baadhi ya vipengele huenda visifanye kazi", retry: "Jaribu tena" },
  zh: { offline: "您已离线", hint: "部分功能可能无法使用", retry: "再试一次" },
};

function fallbackDocument() {
  const langs = Object.keys(FALLBACK_WORDS);
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const say = (k) => langs.map((l) => `<span class="l" lang="${l}">${esc(FALLBACK_WORDS[l][k])}</span>`).join("");
  const hide = langs.map((l) => `html:not([lang="${l}"]) .l[lang="${l}"]`).join(",");
  const titles = JSON.stringify(Object.fromEntries(langs.map((l) => [l, `${FALLBACK_WORDS[l].offline} · 50pick`]))).replace(/</g, "\\u003c");
  return `<!doctype html><html lang="${FALLBACK_DEFAULT}" translate="no" class="notranslate"><head><meta charset="utf-8">`
    + '<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="google" content="notranslate">'
    + `<title>${esc(FALLBACK_WORDS[FALLBACK_DEFAULT].offline)} · 50pick</title>`
    + `<script>(function(){var L=${JSON.stringify(langs)},T=${titles},N="kp-locale",l="${FALLBACK_DEFAULT}",v=null;`
    + 'try{var m=document.cookie.match(new RegExp("(?:^|; )"+N+"=([^;]*)"));if(m)v=decodeURIComponent(m[1])}catch(e){}'
    + "if(L.indexOf(v)<0){try{v=localStorage.getItem(N)}catch(e){v=null}}"
    + "if(L.indexOf(v)>=0)l=v;document.documentElement.lang=l;document.title=T[l]})();</script>"
    + `<style>${hide}{display:none}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0d2e;color:#e8e9f5;`
    + "font:16px system-ui,sans-serif;text-align:center;padding:24px}h1{font-size:20px;margin:0 0 8px}p{margin:0 0 20px}"
    + "button{font:600 14px system-ui,sans-serif;height:44px;padding:0 16px;border-radius:999px;border:1px solid oklch(40% 0.20 268);"
    + "background:oklch(53% 0.20 268);color:oklch(99% 0.006 268);cursor:pointer}</style></head>"
    + `<body><main id="main-content"><h1>${say("offline")}</h1><p>${say("hint")}</p>`
    + `<button type="button" id="kp-offline-retry">${say("retry")}</button></main>`
    + `<script>(function(){function again(){if(location.pathname===${JSON.stringify(OFFLINE_URL)})location.replace("/");else location.reload()}`
    + 'var b=document.getElementById("kp-offline-retry");if(b)b.addEventListener("click",again);'
    + 'window.addEventListener("online",again)})();</script></body></html>';
}

/**
 * The offline document if it is cached, otherwise the last resort above — never `undefined`.
 * ⛔ Looked up in THIS worker's cache only: a cache from an older name can never answer, even in the moment before
 * `activate` has deleted it.
 */
function offlineResponse() {
  return caches.open(CACHE_NAME).then((cache) => cache.match(OFFLINE_URL)).then((cached) => cached || new Response(
    fallbackDocument(),
    { status: 503, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } },
  ));
}

/**
 * ⭐ THE OFFLINE DOCUMENT IS KEPT FRESH BY THE NAVIGATIONS THAT SUCCEED (2026-10-09, round 5, review F3). It was fetched
 * at install and never again: a phone kept that copy for the cache's whole life — the licence number the route bakes in,
 * and any later fix to `offline-document.ts`, never reached it — and a precache that failed at install was never tried
 * again, so that phone had only the last resort above. Now a navigation the network answered also refreshes it, in the
 * background (`event.waitUntil`), with the precache's own cookieless request: at most one look per worker wake, and a
 * fetch only when the kept copy is missing or not from the last day by its own `date` header (which the cache keeps),
 * so browsing costs one small request a day. `cache.add` writes only a response that is ok, so a failed refresh leaves
 * the kept copy as it was.
 */
const OFFLINE_REFRESH_MS = 24 * 60 * 60 * 1000;
let offlineLooked = false;
function refreshOffline() {
  if (offlineLooked) return Promise.resolve();
  offlineLooked = true;
  return caches.open(CACHE_NAME).then((cache) => cache.match(OFFLINE_URL).then((kept) => {
    const age = kept ? Math.abs(Date.now() - Date.parse(kept.headers.get("date") || "")) : NaN;
    if (age < OFFLINE_REFRESH_MS) return undefined;
    return cache.add(precacheRequest(OFFLINE_URL));
  })).catch(() => undefined);
}

/**
 * ⛔ ONLY AN IMAGE OR A FONT IS KEPT (round 5, review F2; see the v6 note above). The static rule below picks requests by
 * the address, and an address can end in ".png" without naming a file — `/markets/x.png` is a page. Navigations never
 * reach that rule (the navigation branch comes first), and what the network answers is stored only when it says it is
 * an image or a font: never a page (`text/html`), and never the router's data for one (`text/x-component`, which a move
 * inside the app to such an address fetches).
 */
const KEEPABLE_TYPE = /^(?:image|font)\//i;
function keepable(response) {
  return response.ok && KEEPABLE_TYPE.test(response.headers.get("content-type") || "");
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

// Fetch: network-first for navigation, stale-while-revalidate for static files
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // API routes — always network, never cache
  if (url.pathname.startsWith("/api/")) return;

  // Navigation — network-first, offline fallback.
  // ⛔ FIRST, BEFORE THE STATIC RULE (round 5, review F2): a navigation is a page whatever its address ends in
  // (`/markets/x.png`), and it is never stored.
  if (request.mode === "navigate") {
    // ⛔ E-381 §6 item 13 · `caches.match` resolves to `undefined` when the page was never cached, and
    // `respondWith(undefined)` throws — the player got the browser's own network-error page instead of ours.
    // ⭐ A page the network answered also keeps the offline document fresh, in the background (`refreshOffline`).
    event.respondWith(
      fetch(request).then((response) => {
        if (response.ok) event.waitUntil(refreshOffline());
        return response;
      }, () => offlineResponse()),
    );
    return;
  }

  // Static files (fonts, images, icons) — stale-while-revalidate
  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/brand/") ||
    url.pathname.startsWith("/hero/") ||
    url.pathname.match(/\.(woff2?|ttf|otf|svg|png|jpg|webp|ico)$/)
  ) {
    // Stale-while-revalidate: answer from the cache at once when we can, and refresh the entry in the background,
    // so a replaced logo at the same URL reaches the player on their next visit (it used to need a CACHE_NAME bump).
    // ⛔ Only an image or a font is stored (`keepable`), so only an image or a font can ever answer from here.
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => cache.match(request).then((cached) => {
        const network = fetch(request).then((response) => {
          if (keepable(response)) cache.put(request, response.clone());
          return response;
        });
        if (cached) { event.waitUntil(network.catch(() => undefined)); return cached; }
        return network;
      })),
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
