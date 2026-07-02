/**
 * Service worker registration — called once from the app shell.
 * Registers /sw.js for offline support + push notification capability.
 * No-op on browsers that don't support service workers.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;

  try {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });

    // Listen for updates
    reg.addEventListener("updatefound", () => {
      const newWorker = reg.installing;
      if (!newWorker) return;
      newWorker.addEventListener("statechange", () => {
        if (newWorker.state === "activated" && navigator.serviceWorker.controller) {
          // New version available — the next navigation will use it
          console.log("[50pick] Service worker updated");
        }
      });
    });

    return reg;
  } catch (err) {
    console.warn("[50pick] SW registration failed:", err);
    return null;
  }
}

/**
 * Request push notification permission and subscribe.
 * Returns the PushSubscription if granted, null otherwise.
 * The subscription endpoint should be sent to the server for storage.
 */
export async function subscribeToPush(
  registration: ServiceWorkerRegistration,
): Promise<PushSubscription | null> {
  if (!("PushManager" in window)) return null;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  try {
    // Check for existing subscription
    const existing = await registration.pushManager.getSubscription();
    if (existing) return existing;

    // VAPID public key — set via env var. Without it, push won't work
    // but the service worker still provides offline caching.
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      console.warn("[50pick] VAPID key not configured — push notifications disabled");
      return null;
    }

    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
    });

    return sub;
  } catch (err) {
    console.warn("[50pick] Push subscription failed:", err);
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}
