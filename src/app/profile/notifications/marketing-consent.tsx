"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { Toggle } from "@/components/ui/toggle";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n";
import { setMarketingConsentAction } from "./actions";

/**
 * The consent's title with its last two words held together — "Offers and news / by SMS", never
 * "Offers and news by / SMS" alone beside the switch at 360 (the channel is the point of the sentence).
 * The text is unchanged: the ledger stores the dictionary string, not this markup. A title with no space
 * (Chinese) is returned as it is.
 */
export function MarketingTitle({ text }: { text: string }) {
  const last = text.lastIndexOf(" ");
  const cut = last > 0 ? text.lastIndexOf(" ", last - 1) : -1;
  return (
    <p className="font-display text-[14px] font-semibold text-text leading-tight text-balance">
      {cut > 0 ? <>{text.slice(0, cut + 1)}<span className="whitespace-nowrap">{text.slice(cut + 1)}</span></> : text}
    </p>
  );
}

/**
 * The held and paused notes (consent-02). `break-keep` so Chinese breaks only at the U+200B phrase hints its
 * strings carry (a plain wrap split 结|束 and 除|非 at 360), `overflow-wrap:anywhere` still wraps an over-long
 * run, and `text-pretty` keeps a last line from being one glyph. Latin text wraps as before.
 * ⚠️ The consent sentence above them is NOT given this: it is pinned byte-for-byte (consent-wording.ts), so it
 * cannot carry hints, and keep-all without hints forces a mid-word break in this column anyway (trust-band.tsx).
 */
const NOTE = "mt-1 text-body-sm text-text-muted leading-snug text-pretty break-keep [overflow-wrap:anywhere]";

/** The held line with its end date kept on one line ("28 Sep" never splits at 360). The words around the
 *  date are the dictionary's own, split at `{date}`. */
function HeldLine({ template, date }: { template: string; date: string }) {
  const at = template.indexOf("{date}");
  if (at < 0) return <>{template}</>;
  return <>{template.slice(0, at)}<span className="whitespace-nowrap">{date}</span>{template.slice(at + "{date}".length)}</>;
}

/**
 * E-409 · the player's marketing consent, withdrawable at any time (Privacy §3). Same row shape as
 * the push setting above it, and it answers the same way (DESIGN_AUTHORITY §F2): a toast on success,
 * a `factual` toast with the next step on a refusal.
 * D4 · `initialOn` is the EFFECTIVE consent (`marketingToggleState`), and `initialPaused` says the
 * consent lapsed when a break or self-exclusion ended. D4b · `held` says a break or self-exclusion is
 * in force now: the switch is OFF and locked, and `heldUntil` (formatted by the server in the page's
 * language, `held-until.ts`) is when it ends.
 * ⭐ THE CONSENT SENTENCE NEVER LEAVES THE SCREEN (2026-09-27). A failed save used to REPLACE it with
 * "Something didn't work. Try again." — so the retry was tapped with the sentence the ledger records as
 * "shown" nowhere in sight, and a lapsed session was told to try again, which could never succeed.
 * ⭐ AND THE SWITCH SHOWS WHAT THE SERVER READ, never a guess: a failure carries the state read after
 * the attempt, and when even that is unknown the page is re-read.
 */
export function MarketingConsent({
  initialOn,
  initialPaused = false,
  held = false,
  heldUntil = null,
  outreachNote = null,
}: {
  initialOn: boolean;
  initialPaused?: boolean;
  held?: boolean;
  heldUntil?: string | null;
  /** U33a-P · the line that says offers reach this person on the LICENCE basis, not on a consent they gave. The
   *  SERVER passes the words (an admin edits them on Admin → System), and passes null when the switch is ON because
   *  the person actually consented — so the note appears only where it is true. */
  outreachNote?: string | null;
}) {
  const { t, locale } = useT();
  const { toast } = useToast();
  const router = useRouter();
  const [on, setOn] = useState(initialOn);
  const [paused, setPaused] = useState(initialPaused);
  const [signedOut, setSignedOut] = useState(false);
  const [pending, start] = useTransition();
  // A server re-read (revalidate or refresh) that brings a different state wins over the local one.
  const serverState = `${initialOn}:${initialPaused}`;
  const [seen, setSeen] = useState(serverState);
  if (seen !== serverState) {
    setSeen(serverState);
    setOn(initialOn);
    setPaused(initialPaused);
  }

  const flip = () => {
    if (held) return;
    const want = !on;
    setSignedOut(false);
    setOn(want);
    start(async () => {
      // D2 · the language this card was drawn in — the sentence the ledger records as the one shown.
      const r = await setMarketingConsentAction(want, locale)
        .catch(() => ({ ok: false as const, reason: "error" as const, on: null }));
      if (r.ok) {
        setOn(r.on);
        setPaused(false);
        toast({ title: r.on ? t.push.marketingOnToast : t.push.marketingOffToast, variant: "success" });
        return;
      }
      // Signed out: nothing was written, so the switch is exactly where it was.
      setOn(typeof r.on === "boolean" ? r.on : !want);
      const title = r.on === null && r.reason === "error" ? t.push.marketingErrUnsureTitle
        : want ? t.push.marketingErrOnTitle : t.push.marketingErrOffTitle;
      const description = r.reason === "signed_out" ? t.push.marketingErrSignedOut
        : r.reason === "held" ? t.push.marketingHeldNoDate
        : r.on === null ? t.push.marketingErrUnsureBody
        : t.push.marketingErrBody;
      toast({ title, description, variant: "factual" });
      if (r.reason === "signed_out") setSignedOut(true);
      // Unknown, or a break began since this page was drawn: read the page again rather than guess.
      else if (r.on === null || r.reason === "held") router.refresh();
    });
  };

  return (
    <section className="rounded-xl glass-panel p-5" data-testid="marketing-consent">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          {/* 40px literals: the spacing scale is overridden (see push-settings.tsx). */}
          <span className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-md bg-brand-500/10 text-brand-300">
            <I.megaphone s={17} />
          </span>
          <div className="min-w-0">
            <MarketingTitle text={t.push.marketingTitle} />
            <p className="mt-0.5 text-body-sm text-text-subtle leading-snug">{t.push.marketingBody}</p>
            {held && (
              <p className={NOTE} data-testid="marketing-consent-held">
                {heldUntil ? <HeldLine template={t.push.marketingHeld} date={heldUntil} /> : t.push.marketingHeldNoDate}
              </p>
            )}
            {paused && !on && !held && (
              <p className={NOTE} data-testid="marketing-consent-paused">{t.push.marketingPaused}</p>
            )}
            {/* ⭐ U33a-P · ON for a person who never agreed. ⛔ Only while the switch actually reads ON and nothing
                else is being said: a note explaining why offers reach you is a lie beside an OFF switch. `break-keep`
                and `anywhere` for the same reason the held note has them — Chinese has no spaces to break at. */}
            {outreachNote && on && !held && !paused && (
              <p className={`${NOTE} break-keep [overflow-wrap:anywhere]`} data-testid="marketing-consent-outreach">{outreachNote}</p>
            )}
            {/* A plain <a>: sign-in renders under the auth shell, and it brings the player back here. */}
            {signedOut && (
              <a
                href="/auth/login?next=/profile/notifications"
                className="mt-1 inline-flex min-h-[44px] items-center text-body-sm font-semibold text-brand-300 underline-offset-2 hover:underline"
                data-testid="marketing-consent-signin"
              >
                {t.auth.signInTitle}
              </a>
            )}
          </div>
        </div>
        <Toggle on={on} disabled={pending || held} onClick={flip} aria-label={t.push.marketingTitle} />
      </div>
    </section>
  );
}
