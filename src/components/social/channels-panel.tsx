/**
 * ChannelsPanel — the three 50pick channels, put in front of the player once, with an X.
 *
 * Ali, 2026-09-12: *"im not asking them yes or no. i'll show the invitation icons … with an x,
 * icons clickable. so if not interested they just close it … make it show up in front of them so
 * they have to click x to hide it."* And: *"icons and join … icons and join … like this."*
 *
 * ── 🔴 THIS OVERRIDES A COMPLIANCE RULING, DELIBERATELY, AND THE RULING SAYS SO
 * `docs/COMPLIANCE-DECISIONS.md` (2026-09-12) holds the FOOTER social row lawful *because* it is
 * "a static platform directory line … an offer or a nudge would be" marketing, and lists "no
 * interstitial prompt" among the conditions it keeps. This panel is an interstitial prompt and
 * "Join us" is a solicitation verb — both were excluded by that entry. Ali overrode it in
 * writing, and the override is recorded as its own dated entry rather than smuggled into the old
 * one. ⛔ Do not "restore consistency" by deleting either entry: the pair IS the record.
 *
 * ── ⭐ WHAT THE OVERRIDE BOUGHT, AND IT HAD TO BE BUILT
 * `/legal/responsible-gambling` §4 publishes "no marketing to self-excluded players". Before this
 * change NO responsible-gambling state reached the browser by ANY route — not a prop, not the
 * session cookie, not a context, not an API — so nothing on a page could have honoured it. The
 * shell now derives `promoSuppressed` from the RG row it ALREADY fetches and threads it down.
 * `feature-state.ts`'s LAW 1 is the authority: a flag may gate an OFFER, never a refusal. This is
 * an offer, so declining to make it is exactly what that law permits.
 *
 * ⚠️ AND THREE OF THAT SECTION'S FOUR BULLETS STILL CANNOT BE HONOURED, which the compliance
 * entry states rather than implies: there is no late-night window in code (the only 00:00–06:00
 * EAT band is a retrospective harm DETECTOR, computed when an officer opens a page), no age
 * computation from `User.dob`, and no "vulnerability segment" concept at all. A self-excluded
 * player can also browse signed out, where no server check can see them.
 *
 * ── ⭐ "NOT DISTURBING" IS A SPECIFICATION, SO HERE ARE THE NUMBERS
 *  · never on a first-ever visit — `MIN_VISITS = 2`
 *  · never in the first 45 seconds — `MIN_DWELL_MS`, one timer per document, not per route
 *  · once per visit — a session flag, so a soft navigation never re-shows it
 *  · it does NOT auto-dismiss. It stays until the X. That is the instruction.
 *  · tapping any channel is a permanent stop — they acted; asking again is noise
 *  · three X's without acting and it backs off to weekly; six and it stops for good
 *  · never over a money control, an auth page, an admin page, or EITHER responsible-gambling
 *    route — a follow prompt on the page where someone is setting a limit is the worst of it
 *  · never while a real modal is open, and never when `promoSuppressed`
 *
 * ── ⚠️ EVERY `localStorage` TOUCH IS WRAPPED AND FAILS CLOSED
 * This mounts in the root shell, so an unguarded throw in a private window or with site data
 * blocked would take every route to the error page. With storage unavailable it behaves as a
 * first-ever visit: it does not appear.
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { SOCIAL } from "@/lib/social";
import { SOCIAL_MARK } from "@/components/ui/social-marks";
import { isCommitSurface } from "@/lib/surfaces";
import { useInvitationSlot } from "@/lib/invitation-slot";
import { useExitPhase } from "@/components/ui/modal";
import { useT } from "@/lib/i18n";

const MIN_VISITS = 2;
const MIN_DWELL_MS = 45_000;
const BACKOFF_AFTER = 3;
const BACKOFF_DAYS = 7;
const MAX_DISMISSALS = 6;

const K_VISITS = "50pick-channels-visits";
const K_DISMISS_AT = "50pick-channels-dismissed-at";
const K_DISMISS_N = "50pick-channels-dismissals";
const K_DONE = "50pick-channels-done";
/** Session-scoped, so one visit shows it at most once however much they navigate. */
const K_SESSION = "50pick-channels-shown";

/**
 * ⛔ TESTED IN THE EFFECT *AND* IN THE RENDER, and the second one is the load-bearing copy.
 * `first-visit-primer.tsx` shipped this exact bug: the mount effect checked its suppression list
 * and the render guard did not, so landing on a board, opening the panel, then tapping through to
 * a bet card left the panel sitting over the bet widget it exists to stay away from. The effect
 * returns early on the new path; `visible` stays true; only a render guard can catch it.
 */
const HIDE_ON = /^\/(auth|admin)(\/|$)|^\/(legal|profile)\/responsible-gambling(\/|$)/;

function suppressedRoute(path: string | null): boolean {
  return HIDE_ON.test(path ?? "/") || isCommitSurface(path);
}

function read(key: string, session = false): string | null {
  try {
    return (session ? window.sessionStorage : window.localStorage).getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string, session = false): void {
  try {
    (session ? window.sessionStorage : window.localStorage).setItem(key, value);
  } catch {
    /* storage blocked — behave as unset */
  }
}

/**
 * The visible copy, keyed off `SocialAccount.labelKey`.
 *
 * ⭐ A `Record` OVER THE UNION, NOT A LOOKUP WITH A FALLBACK. Adding a fourth channel to
 * `src/lib/social.ts` becomes a COMPILE ERROR here until its copy exists — which is the only
 * mechanism that makes "a channel can never ship without its own words" true rather than hoped.
 * Same shape as `SOCIAL_EMAIL_LABEL` in `email.ts`.
 */
const PANEL_COPY: Record<
  (typeof SOCIAL)[number]["labelKey"],
  { label: "joinInstagram" | "joinTiktok" | "joinWhatsapp"; aria: "ariaJoinInstagram" | "ariaJoinTiktok" | "ariaJoinWhatsapp" }
> = {
  instagram: { label: "joinInstagram", aria: "ariaJoinInstagram" },
  tiktok: { label: "joinTiktok", aria: "ariaJoinTiktok" },
  whatsappChannel: { label: "joinWhatsapp", aria: "ariaJoinWhatsapp" },
};

export function ChannelsPanel({ promoSuppressed }: { promoSuppressed: boolean }) {
  const { t } = useT();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const eligible = open && !promoSuppressed && !suppressedRoute(pathname);
  const holds = useInvitationSlot("channels", 2, eligible);
  const { present, exiting } = useExitPhase(holds, "--t-flick");

  useEffect(() => {
    if (promoSuppressed) return;
    if (read(K_DONE) === "1") return;
    if (read(K_SESSION, true) === "1") return;

    // One visit per document, not per route change — `pathname` is deliberately not a dep.
    const visits = Number(read(K_VISITS) ?? "0") + 1;
    write(K_VISITS, String(visits));
    if (visits < MIN_VISITS) return;

    const dismissals = Number(read(K_DISMISS_N) ?? "0");
    if (dismissals >= MAX_DISMISSALS) return;
    if (dismissals >= BACKOFF_AFTER) {
      const at = Number(read(K_DISMISS_AT) ?? "0");
      if (at > 0 && Date.now() - at < BACKOFF_DAYS * 86_400_000) return;
    }

    const timer = window.setTimeout(() => {
      /* ⛔ NEVER OVER A REAL DIALOG. `reality-check.tsx` defers on exactly this query, and a
         reality check is a surface a player must read. If one is up when the timer fires we skip
         this visit entirely and do NOT set the session flag, so the next visit still gets a turn. */
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      write(K_SESSION, "1", true);
      setOpen(true);
    }, MIN_DWELL_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promoSuppressed]);

  const dismiss = useCallback(() => {
    write(K_DISMISS_AT, String(Date.now()));
    write(K_DISMISS_N, String(Number(read(K_DISMISS_N) ?? "0") + 1));
    setOpen(false);
  }, []);

  /** They went to a channel. That is an answer, and it is permanent. */
  const accept = useCallback(() => {
    write(K_DONE, "1");
    setOpen(false);
  }, []);

  /* ⭐ ESCAPE CALLS THE SAME `dismiss` THE X CALLS. A second, quieter close that the frequency
     rules cannot see would be a second definition of what dismissal MEANS — and the one that
     forgets is the one that re-asks tomorrow. ⚠️ `aria-modal="false"` and no scrim, so this must
     not swallow the key: no `preventDefault`, bound only while on screen. */
  useEffect(() => {
    if (!present) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") dismiss(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [present, dismiss]);

  if (!present) return null;
  if (promoSuppressed || suppressedRoute(pathname)) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="channels-panel-title"
      data-invitation="channels"
      data-rung="float"
      data-testid="channels-panel"
      /* ⛔ THE OFFSET IS A CLASS, NOT AN INLINE STYLE, AND THAT IS THE WHOLE POINT.
         Below `lg` it clears the 88px tab bar by 8px; at `lg` and up `lg:bottom-6` (32px) takes
         over, where the bar is `lg:hidden` and 96px reads as floating mid-screen. Ali reported
         exactly that on the install card, which set `bottom` INLINE and therefore could not be
         overridden by a `lg:` variant at all: an inline style beats every class, so a responsive
         offset has to be a class on both rungs. 32px matches `lg:left-6`, a square corner inset.

         🔴 148, NOT 96, AND THE 52 IN THE MIDDLE IS THE CHAT BUBBLE. The install card's 96 clears
         only the tab bar. On a phone this panel is full-bleed, so it also reaches the chat FAB —
         `position: fixed`, `right: 16`, `bottom: 80`, 52×52, `z-60`. Measured at 390×844: the
         bubble sat ON the WhatsApp row. 80 + 52 + 16 = 148 clears it. ⛔ Do not "restore
         symmetry" with the install card: that card is 380px wide and right-anchored, so it does
         not reach across to the bubble the way a full-bleed card does.
         ⚠️ The bubble is absent in production today (chat is off), which is exactly why this is
         a fixed offset rather than a conditional one — a layout that is only correct while a
         feature is disabled is a bug waiting for the flag.

         🔴 DO NOT ABBREVIATE THE ARBITRARY CLASS IN A COMMENT. This comment originally spelled it
         out with the inner argument elided, and TAILWIND SCANS COMMENTS — it compiled that
         abbreviation into a real rule whose value held the literal dots, which is invalid CSS.
         One bad declaration failed the whole stylesheet parse and every route served 500.
         ⭐ A comment is not inert in a file the class scanner reads. Describe the class in prose,
         or the scanner will take you at your word.
         ⚠️ The underscore in the real class below is Tailwind's space escape; without the spaces
         `calc` is invalid CSS and fails silently. */
      className={`fixed left-3 right-3 bottom-[calc(148px_+_env(safe-area-inset-bottom))] lg:bottom-6 z-40 lg:right-auto lg:left-6 lg:max-w-[400px] overflow-hidden rounded-xl mat-float px-3 pb-3 ${exiting ? "m-float-out" : "m-float-in"}`}
      /* The float atoms set `transform-origin: top left`; this card grows from the other corner. */
      style={{ transformOrigin: "bottom left" }}
    >
      {/* The heraldic hairline the footer wears. Its own `margin-block: 16px` IS this panel's
          top padding — which is why the container carries no `pt-*`. */}
      <div aria-hidden className="claret-rule" />

      <div className="flex items-start gap-3">
        <p
          id="channels-panel-title"
          className="min-w-0 flex-1 font-display text-body font-semibold leading-tight text-text"
        >
          {t.channels.title}
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t.common.close}
          data-testid="channels-panel-close"
          className="shrink-0 inline-flex h-[44px] w-[44px] items-center justify-center rounded-md text-text-subtle hover:text-text transition-colors"
        >
          <I.x s={15} aria-hidden />
        </button>
      </div>

      <ul className="mt-1 space-y-0.5">
        {SOCIAL.map((s, i) => {
          const Mark = SOCIAL_MARK[s.labelKey];
          const copy = PANEL_COPY[s.labelKey];
          return (
            <li key={s.labelKey} data-stagger={i + 1}>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t.channels[copy.aria]}
                onClick={accept}
                className="flex min-h-[44px] items-center gap-3 rounded-md px-2 text-text-muted hover:bg-bg-overlay hover:text-text transition-colors"
              >
                <Mark s={24} />
                <span className="min-w-0 text-body-sm">{t.channels[copy.label]}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
