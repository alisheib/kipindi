import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Callout } from "@/components/ui/callout";
import type { Dict } from "@/lib/i18n-server";
import { SENDER_IDENTITY } from "@/lib/marketing/footer";
import { SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_PHONE_TEL } from "@/lib/server/support-config";
import type { OptOutRefusalKind } from "@/lib/server/marketing/optout-service";
import { TITLE_TEXT, KEEP_WORDS, NOTICE_TEXT } from "./[token]/optout-classes";

/**
 * THE OPT-OUT PAGE'S REFUSALS, IN ONE PLACE — `/s/<token>` and bare `/s` say the same thing.
 *
 * ⭐ ONE SENTENCE PER THING THE READER CAN DO SOMETHING ABOUT (`refusalKindFor` in the service):
 *  · `invalid` — a malformed or unknown token, or no token at all (bare `/s`). Neutral: the link does not
 *    work and nothing has changed. ⛔ Malformed and unknown share this sentence, or `/s/` becomes an
 *    oracle for guessing live tokens.
 *  · `busy` — the address's budget is dry, so no lookup was made. ⛔ NEVER "this link does not work": the
 *    link may be genuine, and a person told it is broken does not try again. It says the page is busy,
 *    nothing has changed, and try again — with a retry.
 *  · `failed` — the read threw. "That did not go through", with a retry.
 *
 * ⛔ NO `optout.body` HERE, AND THAT IS THE POINT. The first version passed "tap once to stop…" onto a
 * page that renders NO BUTTON TO TAP. ⭐ D6: the refusal never says "this link is not ours" (which read
 * like a phishing warning to somebody holding a genuine, truncated 50pick link) and it is never a dead
 * end — it names the two other ways to stop.
 */
export function OptOutRefusal({ t, kind, retryHref }: { t: Dict; kind: OptOutRefusalKind; retryHref?: string }) {
  return (
    <PageContainer tier="receipt" className="space-y-5">
      <PageHeader eyebrow={SENDER_IDENTITY} title={<span className={TITLE_TEXT}>{t.optout.title}</span>} />
      {/* The title and the sentence are BLOCK spans: balance and pretty act on a block's lines, so a
          notice never ends on one word ("…Nothing has / changed.") or one glyph. */}
      <Callout
        layout="stack"
        tone={kind === "invalid" ? "neutral" : kind === "busy" ? "warning" : "danger"}
        size="md"
        titleAs="h2"
        title={<span className={`block text-balance ${KEEP_WORDS}`}>{kind === "invalid" ? t.optout.invalid : kind === "busy" ? t.optout.busy : t.optout.error}</span>}
        action={<NextSteps t={t} retryHref={kind === "invalid" ? undefined : retryHref} />}
      >
        <span className={`block ${NOTICE_TEXT}`}>{invalidNextStep(t)}</span>
      </Callout>
    </PageContainer>
  );
}

/** The next-step sentence, with the profile toggle's own NAME and the path to it read from the dict
 *  (so a rename of either cannot leave this sentence pointing at a control that no longer exists). */
function invalidNextStep(t: Dict): string {
  return t.optout.invalidNext
    .replace("{toggle}", t.push.marketingTitle)
    .replace("{path}", `${t.common.profile} → ${t.common.notifications}`);
}

/**
 * The way forward. ⛔ PLAIN `<a>`, NEVER `<Link>`: `/profile/notifications` renders under the FULL player
 * shell and this page under the minimal one, and a soft navigation keeps the layout it started in (E-70,
 * `test:shell-boundary`). Signed out, the proxy sends it to sign-in and back. The retry is a plain `<a>`
 * back to the same link, for the same reason.
 * 2026-09-27 · the two buttons are their OWN group, one shared width with a 12px gap between them: stacked
 * 4px apart at two different widths, they read as a rendering glitch, one of them a link off the page.
 */
function NextSteps({ t, retryHref }: { t: Dict; retryHref?: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex w-full max-w-xs flex-col items-stretch gap-2">
        {retryHref && (
          <a href={retryHref} className="btn btn-primary btn-md inline-flex items-center justify-center">
            {t.optout.retry}
          </a>
        )}
        <a href="/profile/notifications" className="btn btn-ghost btn-md inline-flex items-center justify-center">
          {t.optout.openNotifications}
        </a>
      </div>
      <ContactLines t={t} align="center" />
    </div>
  );
}

/**
 * Our own desk, phone and email. ⭐ Read on the SERVER from `support-config` (E-226) — never typed, and
 * never the independent helpline, which is not ours to route a marketing request to. ⚠️ This names a way
 * to ASK; support has no recorded-suppression tool yet, so the page promises contact, not a manual stop.
 * Also handed to the client as a node, rendered inside a failed tap's alert, under the button (`optout-client.tsx`).
 * The pair sits in its own group under the action (`mt-2`), so the two routes read as one: each row keeps
 * its 44px target, which is what fixes their pitch.
 */
export function ContactLines({ t, align }: { t: Dict; align: "center" | "start" }) {
  const phone = SUPPORT_PHONE();
  const email = SUPPORT_EMAIL();
  const link = "text-body-sm text-text-muted hover:text-text transition-colors inline-flex flex-wrap items-center justify-center gap-x-[0.28em] min-h-[44px]";
  return (
    <div className={`mt-2 flex flex-col gap-1 ${align === "center" ? "items-center" : "items-start"}`}>
      <a href={`tel:${SUPPORT_PHONE_TEL()}`} className={link}>
        <span className="whitespace-nowrap">{t.footer.contactUs} ·</span>{" "}<span className="whitespace-nowrap">{phone}</span>
      </a>
      <a href={`mailto:${email}`} className={link}>
        <span className="whitespace-nowrap">{t.footer.email} ·</span>{" "}<span className="whitespace-nowrap">{email}</span>
      </a>
    </div>
  );
}
