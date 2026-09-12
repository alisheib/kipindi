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
  readonly labelKey: "instagram" | "tiktok" | "whatsappChannel";
  /**
   * The `dict.<locale>.footer` key for the accessible name.
   *
   * ⭐ ONE KEY PER ACCOUNT RATHER THAN ONE TEMPLATE WITH A `{platform}` HOLE. The template
   * version read "50pick on Instagram" and "50pick on TikTok" perfectly and then produced
   * "50pick on WhatsApp channel", which is not English. A third member that will not fit the
   * template is the template telling you it was a coincidence, not a pattern.
   * ⚠️ Each one must still CONTAIN its visible label verbatim — WCAG 2.5.3 Label in Name,
   * so that a speech-input user saying what they can see actually activates the link.
   */
  readonly ariaKey: "ariaInstagram" | "ariaTiktok" | "ariaWhatsappChannel";
  /** Canonical URL. ⛔ No query string — see the docblock. */
  readonly url: string;
};

export const SOCIAL: readonly SocialAccount[] = [
  {
    labelKey: "instagram",
    ariaKey: "ariaInstagram",
    url: "https://www.instagram.com/50pick.tz/",
  },
  {
    labelKey: "tiktok",
    ariaKey: "ariaTiktok",
    url: "https://www.tiktok.com/@50pick",
  },
  /**
   * ⭐ THE CHANNEL IS LAST, AND IT IS LABELLED "channel" FOR A REASON THAT IS NOT STYLE.
   * One column away this footer publishes "Contact us · <desk number>" and an email address.
   * A bare WhatsApp mark beside them reads as SUPPORT ON WHATSAPP — an inbox nobody staffs —
   * and that is E-328 exactly: the right contact under a framing that promises something
   * else. The word "channel" is the whole fix; WhatsApp Channels are one-way broadcast and
   * naming the product names the behaviour.
   * ⛔ AND IT IS NOT "Join our channel". `docs/COMPLIANCE-DECISIONS.md` (2026-09-12) rules
   * this row lawful *because* it is a directory line and not an offer — "join" is a verb
   * soliciting an action, and it would make that entry false on a page a cooling-off player
   * can still reach.
   * ✅ Verified 2026-09-12: `og:title` is "50pick"; an invented channel id returns the
   * generic "WhatsApp Channel", which is the control that makes the check mean something.
   */
  {
    labelKey: "whatsappChannel",
    ariaKey: "ariaWhatsappChannel",
    url: "https://www.whatsapp.com/channel/0029Vb8At5uCxoAtENkyS71Q",
  },
] as const;
