/**
 * The 50pick social accounts — ONE definition site for every Instagram and TikTok URL
 * in the product. `npm run test:social-links` walks `src/` and fails on any social URL
 * literal that does not live here.
 *
 * ⛔ PINNED, NOT OPERATOR-EDITABLE — for the reason `LICENCE_NUMBER()` is pinned
 * (`src/lib/support-config.ts`) and for one more that the licence number does not have.
 *
 *   1. It does not vary by environment and there is no correct value for it to fall back
 *      to. An unset variable would have to invent one, and an invented social handle is
 *      the same defect class as the `TZ-GBT-2026-XXXX` licence stub that ran live on this
 *      platform for months: a plausible-looking string nobody had checked.
 *   2. 🔴 THIS ONE POINTS OFF-PLATFORM. A URL an officer could retype through a form, on
 *      chrome that renders on every player-facing page, is a phishing door — one
 *      compromised admin session repoints "Instagram" at anything it likes. There is no
 *      field, so there is no door.
 *
 * ⭐ AND PINNING IS WHY THE FOOTER CAN IMPORT THIS DIRECTLY. `public-footer.tsx` is
 * `"use client"`, where a `defineConfig` read returns the BROWSER BUNDLE's module default
 * rather than the persisted row — the bug `supportEmail`, `supportPhone` and
 * `agentDoorVisible` are all props to avoid (E-226). A pinned constant has no persisted
 * row to disagree with, so the browser and the server agree by construction and no prop
 * threading is needed. The trap is closed by the shape of the value, not by remembering.
 *
 * ⛔ NO QUERY STRING ON ANY URL, EVER. The links these were built from arrived as
 * `?_r=1&_t=ZS-99fQfSAFFrR` (TikTok) and `?stkn=MXJyam1vdDN1bzl4Yg==` (Instagram) — those
 * are share tokens minted by the OWNER'S OWN PHONE when he tapped "share", tied to his
 * session and not to the account. Publishing one puts a personal token in the page source
 * of a licensed money platform. §2 of the guard fails on any `?` in a URL below, so this
 * cannot come back by copy-paste.
 *
 * ⚠️ THE HANDLES ARE ASYMMETRIC — `@50pick` on TikTok, `50pick.tz` on Instagram — which is
 * why `labelKey` names the PLATFORM and never the handle. A player never sees the
 * mismatch, and a future handle change touches this file and nothing else.
 */

export type SocialAccount = {
  /**
   * One key does three jobs, so the three can never drift apart: it is the stable id, the
   * `dict.<locale>.footer` key that renders the visible label, and the `SOCIAL_MARK` key
   * that selects the logo in `src/components/ui/social-marks.tsx`.
   */
  readonly labelKey: "instagram" | "tiktok";
  /** Canonical profile URL. ⛔ No query string — see the docblock. */
  readonly url: string;
};

export const SOCIAL: readonly SocialAccount[] = [
  { labelKey: "instagram", url: "https://www.instagram.com/50pick.tz/" },
  { labelKey: "tiktok", url: "https://www.tiktok.com/@50pick" },
] as const;
