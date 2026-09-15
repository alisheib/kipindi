/**
 * ANALYTICS CONSENT — whether this browser has agreed to Google Analytics.
 *
 * ⛔ ANALYTICS IS OPT-IN, AND THE REASON IS THE LAW, NOT TASTE. The first GA release (2026-09-15, `ef722b69`) ran
 * on "legitimate interest". Tanzania's Personal Data Protection Act 2022 has no general legitimate-interests
 * ground: consent is the basis for ordinary processing, and "use of cookies and other third-party trackers
 * which can identify a natural person will qualify as disclosure of personal data and be subject to the PDPA"
 * (DLA Piper, Data Protection Laws of the World — Tanzania). So nothing is loaded, and nothing is sent to Google,
 * until the visitor says yes. See COMPLIANCE-DECISIONS 2026-09-15 (second).
 *
 * The choice lives in `localStorage` (Privacy §7 "kept in your browser's storage"), not in a cookie: nothing
 * on the server reads it, and a cookie would travel with every request for no reason.
 *
 * ⚠️ STORAGE CAN THROW (private window, blocked site data). The choice then lives in memory for this document,
 * so the prompt still closes when answered — and the next visit asks again, which fails CLOSED: no consent
 * that was never stored is ever assumed.
 */
import { useSyncExternalStore } from "react";

export type ConsentChoice = "granted" | "denied";
export type ConsentState = ConsentChoice | "unset";

export const CONSENT_STORAGE_KEY = "50pick-analytics-consent";
/** Bump to re-ask everyone (e.g. when what analytics does changes materially). */
export const CONSENT_VERSION = 1;
/** A "yes" lasts as long as the cookies it allows (GA_COOKIE_DAYS), then the visitor is asked again. */
export const CONSENT_GRANT_DAYS = 395;
/** A "no" is not re-asked for six months — asking again sooner is pressure, not a question. */
export const CONSENT_DENY_DAYS = 180;

const CHANGE_EVENT = "kp-analytics-consent";
const DAY_MS = 86_400_000;

/** The state a stored value means at `now`. Anything malformed, from another version, or expired is "unset". */
export function parseConsent(raw: string | null, now: number): ConsentState {
  if (!raw) return "unset";
  let v: { v?: unknown; choice?: unknown; at?: unknown };
  try { v = JSON.parse(raw); } catch { return "unset"; }
  if (!v || typeof v !== "object") return "unset";
  if (v.v !== CONSENT_VERSION) return "unset";
  if (v.choice !== "granted" && v.choice !== "denied") return "unset";
  if (typeof v.at !== "number" || !Number.isFinite(v.at)) return "unset";
  if (v.at > now + 60_000) return "unset"; // a timestamp from the future is not a record of a decision
  const days = v.choice === "granted" ? CONSENT_GRANT_DAYS : CONSENT_DENY_DAYS;
  return now - v.at < days * DAY_MS ? v.choice : "unset";
}

export function serialiseConsent(choice: ConsentChoice, now: number): string {
  return JSON.stringify({ v: CONSENT_VERSION, choice, at: now });
}

let memory: ConsentChoice | null = null;

export function readConsent(): ConsentState {
  if (typeof window === "undefined") return "unset";
  try {
    const stored = parseConsent(window.localStorage.getItem(CONSENT_STORAGE_KEY), Date.now());
    return stored === "unset" && memory ? memory : stored;
  } catch {
    return memory ?? "unset";
  }
}

export function setConsent(choice: ConsentChoice): void {
  memory = choice;
  try { window.localStorage.setItem(CONSENT_STORAGE_KEY, serialiseConsent(choice, Date.now())); } catch { /* memory holds it */ }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange); // another tab answered
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** The live consent state. "unset" during SSR, so no consent-dependent markup is ever in the first HTML. */
export function useAnalyticsConsent(): ConsentState {
  return useSyncExternalStore(subscribe, readConsent, () => "unset");
}
