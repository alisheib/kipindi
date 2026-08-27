"use client";

/**
 * InstallInvite — the invitation to add 50pick to the home screen.
 *
 * Ali, 2026-08-27: *"We need a notification for first-time comers or on every open… If the user
 * didn't add the web app to the home screen, invite them to do so, but in a non-disturbing way.
 * Make it visually perfect, consistent with our theme kit, 100% functional, accurate."*
 *
 * ── ⭐ THE FOUNDATIONS WERE ALREADY THERE, AND THAT WAS CHECKED BEFORE A LINE WAS WRITTEN
 * `public/manifest.json` carries `name`, `short_name`, `start_url`, `display: "standalone"`, a
 * 192, a 512 and a **maskable** 512 — all four files present on disk — and `app/layout.tsx:95`
 * links it. `public/sw.js` exists and `lib/register-sw.ts` registers it at scope `/`. So the
 * browser will genuinely offer to install this app. ⛔ **An invitation to install an app the
 * browser would refuse is worse than silence**, which is why that was the first thing measured.
 *
 * ── ⛔ ALREADY INSTALLED IS CHECKED FIRST, BEFORE ANYTHING ELSE
 * `matchMedia("(display-mode: standalone)")` covers Chrome/Edge/Android/desktop;
 * `navigator.standalone` is the iOS-only legacy flag and is the ONLY signal there. A player
 * already inside the installed app being invited to install it is the single most obvious way
 * this ships broken — and it is the case a desktop dev browser never shows you. It is also
 * re-checked on `visibilitychange`, because a viewer can install from the browser menu and come
 * back to the same document.
 *
 * ── ⛔ iOS SAFARI NEVER FIRES `beforeinstallprompt`, SO IT NEVER GETS A BUTTON
 * There is no programmatic install on iOS. A button that does nothing there is a lie, so iOS is
 * shown the actual gesture — Share, then Add to Home Screen — and no button at all. Firefox on
 * Android is the same shape (menu-driven, no event) and gets the same instruction. ⭐ The branch
 * is decided by whether the EVENT ARRIVED, not by sniffing the user agent: a stashed
 * `beforeinstallprompt` is proof the browser can install; anything else is instructions.
 *
 * ── ⭐ "NON-DISTURBING" IS A SPECIFICATION, SO HERE ARE THE NUMBERS
 *  · **never on a first-ever visit.** `MIN_VISITS = 2` — let them see the product first.
 *  · **never in the first 45 seconds of a session.** `MIN_ENGAGE_MS = 45_000`, and the timer is
 *    per session, not per page, so clicking around does not restart it.
 *  · **dismissible, and the dismissal is REMEMBERED for 14 days.** `RE_ASK_DAYS = 14`.
 *  · **three dismissals and it never asks again.** `MAX_DISMISSALS = 3`. A player who has said no
 *    three times has answered.
 *  · **never over a money control.** `isCommitSurface` suppresses it on the poll bet card, the Up
 *    & Down round card, `/wallet/*` and the paid submission form — re-evaluated on every route
 *    change, so a soft navigation onto a bet card removes it. ⛔ This repo has already shipped a
 *    WhatsApp FAB on top of a CTA and only LOOKING found it.
 *  · **it sits ABOVE the bottom nav**, never on top of it: the nav owns
 *    `88px + env(safe-area-inset-bottom)` and this clears it.
 *  · **installed means never again.** The `appinstalled` event writes a permanent stop.
 *
 * ── ⚠️ EVERY `localStorage` TOUCH IS WRAPPED, AND THE ABSENT CASE RENDERS CORRECTLY
 * A private window, blocked site data or a thumbnail capture throws on the FIRST access — and this
 * component mounts in the root shell, so an unguarded throw would take every signed-in route to
 * the error page. With storage unavailable the invitation behaves as a first-ever visit: it does
 * not appear. ⭐ Failing CLOSED is the right direction for something whose only job is to ask.
 */

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { useT } from "@/lib/i18n";
import { isCommitSurface } from "@/lib/surfaces";

const MIN_VISITS = 2;
const MIN_ENGAGE_MS = 45_000;
const RE_ASK_DAYS = 14;
const MAX_DISMISSALS = 3;

const K_VISITS = "50pick-install-visits";
const K_DISMISS_AT = "50pick-install-dismissed-at";
const K_DISMISS_N = "50pick-install-dismissals";
const K_DONE = "50pick-install-done";

/** Read a key, or null. ⚠️ Never throws — see the header. */
function read(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
/** Write a key. ⚠️ Never throws, and a failed write is not an error worth telling anybody about. */
function write(key: string, value: string): void {
  try { window.localStorage.setItem(key, value); } catch { /* storage blocked — behave as unset */ }
}

/** ⛔ THE FIRST QUESTION, AND IT HAS TWO ANSWERS ON TWO PLATFORMS. */
function alreadyInstalled(): boolean {
  if (typeof window === "undefined") return true;   // SSR: never render the invitation
  try {
    if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
    // iOS Safari's legacy flag — the ONLY signal there, and it is not on the standard type.
    if ((window.navigator as Navigator & { standalone?: boolean }).standalone === true) return true;
  } catch { /* matchMedia absent in an exotic webview — fall through to "not installed" */ }
  return false;
}

type Mode = "prompt" | "ios" | "menu";

export function InstallInvite() {
  const { t } = useT();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<Mode>("menu");
  // The stashed event. Kept in state (not a ref) because its ARRIVAL changes what we render.
  const [deferred, setDeferred] = useState<(Event & { prompt: () => Promise<void> }) | null>(null);
  const [installed, setInstalled] = useState<boolean>(() => alreadyInstalled());

  // ── the eligibility clock ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (installed) return;
    if (read(K_DONE) === "1") return;

    // Count this visit once per document, not once per route change.
    const visits = Number(read(K_VISITS) ?? "0") + 1;
    write(K_VISITS, String(visits));
    if (visits < MIN_VISITS) return;

    if (Number(read(K_DISMISS_N) ?? "0") >= MAX_DISMISSALS) return;
    const at = Number(read(K_DISMISS_AT) ?? "0");
    if (at > 0 && Date.now() - at < RE_ASK_DAYS * 86_400_000) return;

    const timer = window.setTimeout(() => setVisible(true), MIN_ENGAGE_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [installed]);

  // ── the browser's own offer ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const onPrompt = (e: Event) => {
      // ⛔ PREVENT THE MINI-INFOBAR, then keep the event. Calling `prompt()` later is only legal
      // on a real user gesture, which is why the CTA below is the thing that calls it.
      e.preventDefault();
      setDeferred(e as Event & { prompt: () => Promise<void> });
      setMode("prompt");
    };
    const onInstalled = () => { write(K_DONE, "1"); setInstalled(true); setVisible(false); };
    // ⭐ RE-CHECK ON RETURN. A viewer can install from the browser menu without this document
    // ever unmounting, and then the invitation must be gone when they come back to the tab.
    const onVisible = () => { if (alreadyInstalled()) { setInstalled(true); setVisible(false); } };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // iOS gets the gesture, not a button — decided by platform, not by the missing event, because
  // the event's absence is also what a slow Chrome looks like for the first second.
  useEffect(() => {
    if (deferred) return;
    try {
      const ua = window.navigator.userAgent;
      // iOS Safari and every iOS browser (all WebKit): the Share sheet is the only route.
      if (/iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && "ontouchend" in document)) setMode("ios");
      else setMode("menu");
    } catch { setMode("menu"); }
  }, [deferred]);

  const dismiss = useCallback(() => {
    write(K_DISMISS_AT, String(Date.now()));
    write(K_DISMISS_N, String(Number(read(K_DISMISS_N) ?? "0") + 1));
    setVisible(false);
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return;
    try { await deferred.prompt(); } catch { /* the browser declined to show it; say nothing */ }
    // Whatever the outcome, the event is single-use. Treat the ask as answered for now; the
    // `appinstalled` listener writes the permanent stop if they accepted.
    setDeferred(null);
    write(K_DISMISS_AT, String(Date.now()));
    setVisible(false);
  }, [deferred]);

  // ⛔ THE MONEY-SURFACE GATE IS EVALUATED AT RENDER, on every route change, so a soft navigation
  // onto a bet card removes the card rather than leaving it over the gold control.
  if (installed || !visible || isCommitSurface(pathname)) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="install-invite-title"
      data-testid="install-invite"
      className="fixed left-3 right-3 z-40 lg:left-auto lg:right-6 lg:max-w-[380px] rounded-xl glass-panel border border-border p-3.5 shadow-lg"
      /* ⛔ ABOVE THE BOTTOM NAV, NEVER ON IT. The nav owns 88px + the safe area on phones and is
         hidden from `lg` up, where 24px is enough. */
      style={{ bottom: "calc(96px + env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-start gap-3">
        <span className="shrink-0 mt-0.5 text-gold-300" aria-hidden><I.download s={18} /></span>
        {/* ⛔ min-w-0 IS LOAD-BEARING. Without it this flex child will not shrink and the copy
            runs past the card at 360 — the measured shape of every clipping bug on this
            platform, and the reason `min-w-0` sits on the breadcrumb wrapper too. */}
        <div className="min-w-0 flex-1">
          <p id="install-invite-title" className="font-display text-[13.5px] font-semibold leading-tight text-text">
            {t.common.installTitle}
          </p>
          {/* ⛔ NO `truncate` AND NO LINE CLAMP ANYWHERE IN THIS CARD. Ali's rule is that no text
              leaves its box "no matter the amount of lines needed" — so the box grows and the
              words stay whole. Swahili is the longest of the three and 360 is the narrowest
              width; both are driven by `qa:install-invite`. */}
          <p className="mt-1 text-[12px] leading-snug text-text-muted">
            {mode === "prompt" ? t.common.installBody
              : mode === "ios" ? t.common.installIosHow
              : t.common.installOtherHow}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {mode === "prompt" && (
              <button type="button" onClick={install} className="btn btn-primary btn-sm">
                {t.common.installCta}
              </button>
            )}
            <button type="button" onClick={dismiss} className="btn btn-ghost btn-sm">
              {t.common.installLater}
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t.common.installLater}
          /* 44px, the kit's tap floor — a dismiss control the player cannot hit is a trap.
             🔴 THE NEGATIVE MARGINS ARE GONE, AND THEY WERE A REAL BREACH OF ALI'S OWN RULE ON THE
             CARD BUILT TO HONOUR IT. `-mt-1 -mr-1` pulled this 44px button 4px outside the padded
             content box, so the row's `scrollWidth` exceeded its `clientWidth` by exactly 4 —
             measured by `qa:install-shown` as `div 302x137 in 298x137`, at EVERY width and in ALL
             THREE languages. ⛔ Four pixels is invisible in a screenshot; arithmetic caught it on
             the first run. A negative margin is precisely how text and controls leave their box. */
          className="shrink-0 inline-flex h-11 w-11 items-center justify-center rounded-md text-text-subtle hover:text-text"
        >
          <I.x s={15} aria-hidden />
        </button>
      </div>
    </div>
  );
}
