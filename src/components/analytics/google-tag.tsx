"use client";

/**
 * GoogleTag — GA4 (`G-W66WRL67MQ`), mounted once in the root layout.
 *
 * This is Google's install snippet, with six things a plain paste gets wrong on this site:
 *
 * 0. ⛔ NOTHING LOADS WITHOUT CONSENT. Analytics is opt-in (`@/lib/analytics-consent` has the legal reason).
 *    While the state is "unset" or "denied", gtag.js is not fetched and Google's disable switch is on. Withdrawing
 *    consent sets the switch and deletes the `_ga` cookies at once; nothing is sent again in this document.
 * 1. ⛔ NO RAW ADDRESS EVER REACHES GOOGLE. The snippet's `config` sends `location.href`, and several of our
 *    addresses carry a live token or a personal id (see `@/lib/google-tag`). The automatic page view is off;
 *    every page view carries `gaLocation(...)`.
 * 2. 🔴 …AND THAT IS NOT ENOUGH ON ITS OWN — THE WIRE IS GUARDED. gtag.js's enhanced measurement sends its own
 *    page view on every client-side navigation from the RAW address, ignoring `set page_location` (driven
 *    2026-09-15: it leaked `?token=` and an invitation token). `installTransportGuard` wraps `sendBeacon`,
 *    `fetch` and XHR BEFORE gtag.js loads: a request to an analytics host goes out only as `gaScrubHit` rewrites
 *    it. Our page views carry `GA_VIEW_MARK`; an unmarked one is dropped, so there is no double count either.
 *    The image-pixel fallback cannot be wrapped, so the CSP refuses it (GA hosts are NOT in `img-src`).
 * 3. ⛔ EXCLUDED PAGES SEND NOTHING. `window['ga-disable-<id>']` is Google's own switch; it is set on every
 *    route change, and the guard drops any hit whose page is excluded regardless.
 * 4. ⛔ ANALYTICS ONLY, NO ADVERTISING. Consent Mode denies ad storage, ad user data and ad personalisation;
 *    Google signals and ad-personalisation signals are off. Privacy §6 says "we do not profile you for
 *    marketing" — turning any of these on is a notice change first.
 * 5. It loads only on the live hosts, after hydration, so it is never on the critical path.
 *
 * A query-only change (a tab, a filter) is the same page and is not a new view.
 */
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  GA_COOKIE_EXPIRES_SECONDS, GA_MEASUREMENT_ID, GA_VIEW_MARK,
  gaIsAnalyticsRequest, gaLocation, gaReferrer, gaScrubHit,
} from "@/lib/google-tag";
import { readConsent, useAnalyticsConsent } from "@/lib/analytics-consent";

type Gtag = (...args: unknown[]) => void;
type GtagWindow = Window & { dataLayer?: unknown[]; gtag?: Gtag; __kpGaGuard?: boolean } & Record<string, unknown>;

const DISABLE_KEY = `ga-disable-${GA_MEASUREMENT_ID}`;
const SCRIPT_SRC = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;

const absolute = (url: string) => { try { return new URL(url, window.location.href).href; } catch { return ""; } };

/** Expire one cookie on this host and on the parent domain gtag.js writes to (`cookie_domain: auto` → `.50pick.tz`). */
function expireCookie(name: string, host: string): void {
  const parent = host.split(".").slice(-2).join(".");
  document.cookie = `${name}=; Max-Age=0; path=/`;
  document.cookie = `${name}=; Max-Age=0; path=/; domain=.${parent}`;
}

/** Withdrawal deletes what consent allowed. The two names are Privacy §7's, written out so the cookie census sees them. */
function clearAnalyticsCookies(): void {
  if (!/(?:^|;\s*)_ga(?:_|=)/.test(document.cookie)) return;
  const host = window.location.hostname;
  expireCookie("_ga", host);
  expireCookie("_ga_W66WRL67MQ", host);
}

/**
 * Every analytics request passes through `gaScrubHit`; everything else passes through untouched, with the
 * original arguments. ⛔ AND CONSENT IS RE-READ AT SEND TIME: gtag.js batches events, so a view queued while consent was
 * granted can flush seconds after the visitor declined (a drive caught one). Unless consent is granted at the moment of
 * sending, an analytics request is dropped — withdrawal means nothing leaves, not "nothing new is queued". ⛔ A body the guard cannot read synchronously (a Blob, FormData, a Request object) is
 * not forwarded — an unreadable hit is a hit nobody checked.
 */
function installTransportGuard(w: GtagWindow) {
  if (w.__kpGaGuard) return;
  w.__kpGaGuard = true;

  const nav = w.navigator;
  if (typeof nav.sendBeacon === "function") {
    const beacon = nav.sendBeacon.bind(nav);
    nav.sendBeacon = (url: string | URL, data?: BodyInit | null) => {
      const href = absolute(String(url));
      if (!gaIsAnalyticsRequest(href)) return beacon(url, data);
      if (readConsent() !== "granted") return true;
      if (data != null && typeof data !== "string") return true;
      const hit = gaScrubHit(href, data ?? null);
      return hit ? beacon(hit.url, hit.body ?? undefined) : true;
    };
  }

  const fetcher = w.fetch.bind(w);
  w.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const href = absolute(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    if (!gaIsAnalyticsRequest(href)) return fetcher(input, init);
    const body = init?.body;
    const skip = () => Promise.resolve(new Response(null, { status: 204 }));
    if (readConsent() !== "granted") return skip();
    if ((typeof input !== "string" && !(input instanceof URL)) || (body != null && typeof body !== "string")) return skip();
    const hit = gaScrubHit(href, body ?? null);
    return hit ? fetcher(hit.url, { ...init, body: hit.body ?? undefined }) : skip();
  }) as typeof fetch;

  // XHR cannot be re-pointed after `open`, so an analytics XHR is simply not sent.
  const proto = (globalThis.XMLHttpRequest as typeof XMLHttpRequest | undefined)?.prototype;
  if (proto) {
    const open = proto.open;
    const send = proto.send;
    proto.open = function (this: XMLHttpRequest & { __kpGa?: boolean }, ...args: unknown[]) {
      this.__kpGa = gaIsAnalyticsRequest(absolute(String(args[1])));
      return (open as (...a: unknown[]) => void).apply(this, args);
    } as typeof proto.open;
    proto.send = function (this: XMLHttpRequest & { __kpGa?: boolean }, body?: Document | XMLHttpRequestBodyInit | null) {
      if (this.__kpGa) return;
      return send.call(this, body);
    };
  }
}

function boot(w: GtagWindow, firstLocation: string, firstReferrer: string): Gtag {
  if (w.gtag) return w.gtag;
  installTransportGuard(w);
  w.dataLayer = w.dataLayer || [];
  // ⚠️ gtag.js reads `arguments` objects off the dataLayer; an array pushed here is ignored. Keep the snippet's shape.
  // eslint-disable-next-line prefer-rest-params
  const gtag: Gtag = function () { w.dataLayer!.push(arguments); };
  w.gtag = gtag;
  // Booted only after the visitor allowed analytics, so analytics_storage "granted" is the recorded truth.
  gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "granted",
  });
  gtag("js", new Date());
  gtag("config", GA_MEASUREMENT_ID, {
    send_page_view: false,
    page_location: firstLocation,
    page_referrer: firstReferrer,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    cookie_expires: GA_COOKIE_EXPIRES_SECONDS,
    cookie_flags: "SameSite=Lax;Secure",
  });
  const script = document.createElement("script");
  script.async = true;
  script.src = SCRIPT_SRC;
  document.head.appendChild(script);
  return gtag;
}

export function GoogleTag() {
  const pathname = usePathname();
  const consent = useAnalyticsConsent();
  /** The last address reported — the referrer of the next in-app page view. */
  const previous = useRef<string | null>(null);

  useEffect(() => {
    const w = window as unknown as GtagWindow;
    const location = gaLocation(window.location.href);
    const allowed = location !== null && consent === "granted";
    w[DISABLE_KEY] = !allowed;
    if (consent === "denied") clearAnalyticsCookies();
    if (!allowed) return;
    const referrer = previous.current ?? gaReferrer(document.referrer);
    const gtag = boot(w, location, referrer);
    gtag("set", { page_location: location, page_referrer: referrer });
    // The mark is a STRING: a number would travel as `epn.` — the guard accepts both, the mark never leaves.
    gtag("event", "page_view", { page_location: location, page_referrer: referrer, [GA_VIEW_MARK]: "1" });
    previous.current = location;
  }, [pathname, consent]);

  return null;
}
