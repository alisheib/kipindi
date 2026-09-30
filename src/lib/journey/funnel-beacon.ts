/**
 * THE FUNNEL BEACON — the browser half of the §3.10 counters (the Vodacom plan S3b, §0f). Called from client
 * components only; every function is a no-op on the server.
 *
 * ⭐ WHO IS COUNTED IS DECIDED BY THE SERVER. The shell renders `data-kp-funnel` = "old" | "new" | "off" for this viewer
 * (off: staff, a preview pass, or a signed-in account whose read failed). The beacon sends nothing unless it reads
 * "old" or "new" — so staff and preview traffic never reach `/api/funnel`, and the endpoint needs no cookie to know.
 *
 * ⛔ NO IDENTIFIER, NO COOKIE. The body is five short tags (`funnelBody`); `sendBeacon` is same-origin. The only storage
 * touched is the visit's first-touch campaign tags in sessionStorage (`kp-utm`, named in Privacy §7), which lives and
 * dies with the tab. Automation (HeadlessChrome, Playwright) is not counted — the QA fleet must not become traffic.
 */
import { FUNNEL_UTM_KEY, funnelBody, readUtm, utmFromSearch, type FunnelStep } from "./funnel";

export const FUNNEL_ENDPOINT = "/api/funnel";

/** The journey this viewer is counted in, as the server rendered it; null = not counted. */
export function funnelScope(): "old" | "new" | null {
  if (typeof document === "undefined") return null;
  const v = document.querySelector("[data-kp-funnel]")?.getAttribute("data-kp-funnel");
  return v === "old" || v === "new" ? v : null;
}

const isAutomation = () => typeof navigator !== "undefined" && /HeadlessChrome|Playwright/i.test(navigator.userAgent);

/** Keep the visit's first campaign tags for the rest of the tab's life (only if none are kept yet). Never throws. */
export function captureFirstTouchUtm(): void {
  if (typeof window === "undefined") return;
  try {
    if (window.sessionStorage.getItem(FUNNEL_UTM_KEY) !== null) return;
    const tags = utmFromSearch(new URLSearchParams(window.location.search));
    if (tags) window.sessionStorage.setItem(FUNNEL_UTM_KEY, JSON.stringify(tags));
  } catch { /* storage refused — the counts go untagged */ }
}

/** The visit's first-touch tags, or empty ones. Never throws. */
export function firstTouchUtm(): { s: string; c: string } {
  try { return readUtm(typeof window === "undefined" ? null : window.sessionStorage.getItem(FUNNEL_UTM_KEY)); }
  catch { return { s: "", c: "" }; }
}

/** Count one browser step. A no-op for a viewer the server did not scope in, for automation, and on the server. */
export function sendFunnel(step: Extract<FunnelStep, "sheet_open" | "low_balance">, origin: string): void {
  const variant = funnelScope();
  if (!variant || isAutomation() || typeof navigator.sendBeacon !== "function") return;
  const tags = firstTouchUtm();
  try {
    navigator.sendBeacon(FUNNEL_ENDPOINT, funnelBody({ step, origin, variant, utmSource: tags.s, utmCampaign: tags.c }));
  } catch { /* a lost count is not worth an error */ }
}

/** The form fields a bet carries so the SERVER can count it with its origin and campaign tags (§0f). */
export function funnelBetFields(fd: FormData, origin: "dial" | "quick" | "sheet"): void {
  const tags = firstTouchUtm();
  fd.set("funnelOrigin", origin);
  fd.set("funnelUtmSource", tags.s);
  fd.set("funnelUtmCampaign", tags.c);
}
