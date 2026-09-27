import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Callout } from "@/components/ui/callout";
import { getServerT } from "@/lib/i18n-server";
import type { Dict } from "@/lib/i18n-server";
import { SENDER_IDENTITY } from "@/lib/marketing/footer";
import { SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_PHONE_TEL } from "@/lib/server/support-config";
import { resolveOptOutTokenWithinBudget } from "@/lib/server/marketing/optout-service";
import type { OptOutPageResolution } from "@/lib/server/marketing/optout-service";
import { OptOutClient } from "./optout-client";
import { optOutClientKey } from "./client-key";

/**
 * `/s/[token]` — THE WAY OUT OF A MARKETING SMS. No login, one click, and a distinct sentence
 * for every way it can fail.
 *
 * ⭐ WHY THE PATH IS TWO CHARACTERS. Every character of it is a septet inside a 160-character
 * message whose statutory footer already costs 49 of them (`footer.ts`), so `/s/` plus an
 * eight-character token is the entire address. ⛔ The path and the token length are imported,
 * never re-typed: a second definition of either is a link that resolves in a test and 404s in
 * somebody's hand.
 *
 * ⛔ NO LOGIN, AND THAT IS A LEGAL REQUIREMENT RATHER THAN A CONVENIENCE. ETA s.32(1)(c)
 * requires an opt-out in EVERY message; an opt-out that first demands a password is one a
 * person without an account — an imported contact — can never use. `/s` is deliberately
 * absent from `PROTECTED_PREFIXES` (`proxy.ts:40`) and `test:marketing-optout` asserts it
 * stays absent, because adding it would break the promise silently and at the edge, where no
 * page test would see it.
 *
 * ⛔ AND IT IS EXCLUDED FROM GOOGLE ANALYTICS (`google-tag.ts` `GA_EXCLUDED_PREFIXES`). The
 * token is a path SEGMENT, so stripping the query string is not enough — a plain GA4 install
 * would send `50pick.tz/s/<token>` to Google with every hit, which is a live opt-out
 * credential for a named person handed to a third party. That file already names this exact
 * hazard for `/agent/invite`.
 *
 * ⭐ D6 (2026-09-26) · A MINIMAL SHELL. `app-shell.tsx` gives `/s` the logo, the language menu and the
 * footer's licence and helpline lines only — no sign-in or sign-up, no nav, no rail, no chat, no
 * first-visit primer, no "propose markets and get paid". Somebody who came to leave is not sold to.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const { t } = await getServerT();
  return {
    title: t.optout.title,
    // ⛔ NOINDEX. A crawler that follows one of these links is a crawler CLICKING an opt-out —
    // and a search result for somebody's personal unsubscribe address is a disclosure.
    robots: { index: false, follow: false },
  };
}

/**
 * ⚠️ A DEV-ONLY HOLD, SO THE LOADING STATE CAN BE PHOTOGRAPHED (`marketing-u8-optout-drive.mjs`). With
 * the in-memory store the lookup lands in the same chunk as the fallback, so `loading.tsx` is never on
 * screen long enough to capture. ⛔ A NO-OP IN PRODUCTION, whatever the query says — the same rule as
 * every `api/dev-test` route — and capped, so a typo cannot hang a local server.
 */
const QA_HOLD_MAX_MS = 5000;
async function qaHold(sp: Record<string, string | string[] | undefined>): Promise<void> {
  if (process.env.NODE_ENV === "production") return;
  const ms = Number(Array.isArray(sp.qa_hold_ms) ? sp.qa_hold_ms[0] : sp.qa_hold_ms);
  if (Number.isFinite(ms) && ms > 0) await new Promise((res) => setTimeout(res, Math.min(ms, QA_HOLD_MAX_MS)));
}

export default async function OptOutPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await params;
  await qaHold(await searchParams);
  const { t } = await getServerT();
  // ⭐ WITHIN A BUDGET ONLY A MISS SPENDS (D6) — see the service. ⛔ A read that FAILED is not an
  // invalid link: it gets the "did not go through" sentence, never "this link does not work".
  let r: OptOutPageResolution | null;
  try {
    r = await resolveOptOutTokenWithinBudget(token, await optOutClientKey());
  } catch (err) {
    console.error("[optout] page read failed:", (err as Error)?.message ?? err);
    r = null;
  }

  // ⛔ ONE SENTENCE FOR EVERY FAILURE. `malformed`, `unknown` and `throttled` are different to the
  // service and identical to the reader: telling a stranger which one they hit turns `/s/` into an
  // oracle for guessing live tokens. ⛔ And it is a REFUSAL, never a quiet success — the copy says
  // plainly that nothing has changed, and (F4) it names the next step.
  if (!r || !r.ok) {
    return (
      <PageContainer tier="receipt" className="space-y-5">
        <PageHeader eyebrow={SENDER_IDENTITY} title={t.optout.title} />
        {/* ⛔ NO `optout.body` HERE, AND THAT IS THE POINT. The first version passed "tap once to stop
            marketing messages" onto a page that renders NO BUTTON TO TAP. Instructing an action the
            page does not offer is a small false promise, on the one page whose whole job is never to
            make one. ⭐ D6: the refusal no longer says "this link is not ours" (which read like a
            phishing warning to somebody holding a genuine, truncated 50pick link) and it is no longer
            a dead end — it names the two other ways to stop. */}
        <Callout
          layout="stack"
          tone={r ? "neutral" : "danger"}
          size="md"
          titleAs="h2"
          title={r ? t.optout.invalid : t.optout.error}
          action={<NextSteps t={t} />}
        >
          {invalidNextStep(t)}
        </Callout>
      </PageContainer>
    );
  }

  return (
    <PageContainer tier="receipt" className="space-y-5">
      {/* ⭐ THE HEADING, THE NUMBER AND THE ONE ACTION ALL LIVE IN THE CLIENT NOW (D6), because the
          heading must follow the state: a fresh load of a stopped number used to show "Stop marketing
          messages / tap once to stop…" directly above a button that RE-SUBSCRIBES. `r.masked` only —
          §5.14 allows nothing else, and the raw number never leaves the server (`test:marketing-optout`
          S5 greps this file for the identifier field, comments included). `r.token` is the
          NORMALISED token, so a lower-case link acts on the same row it resolved. */}
      <OptOutClient
        token={r.token}
        masked={r.masked}
        suppressed={r.suppressed}
        resumable={r.resumable}
        eyebrow={SENDER_IDENTITY}
      />
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
 * The two other ways to stop. ⛔ PLAIN `<a>`, NEVER `<Link>`: `/profile/notifications` renders under the
 * FULL player shell and this page under the minimal one, and a soft navigation keeps the layout it
 * started in (E-70, `test:shell-boundary`). Signed out, the proxy sends it to sign-in and back.
 * ⭐ Our own desk, read on the SERVER from `support-config` (E-226) — never typed, never the independent
 * helpline, which is not ours to route a marketing request to. ⚠️ This names a way to ASK; support has no
 * recorded-suppression tool yet, so the page promises contact, not a manual stop.
 */
function NextSteps({ t }: { t: Dict }) {
  const phone = SUPPORT_PHONE();
  const email = SUPPORT_EMAIL();
  const link = "text-body-sm text-text-muted hover:text-text transition-colors inline-flex flex-wrap items-center justify-center gap-x-[0.28em] min-h-[44px]";
  return (
    <div className="flex flex-col items-center gap-1">
      <a href="/profile/notifications" className="btn btn-ghost btn-md inline-flex items-center justify-center">
        {t.optout.openNotifications}
      </a>
      <a href={`tel:${SUPPORT_PHONE_TEL()}`} className={link}>
        <span className="whitespace-nowrap">{t.footer.contactUs} ·</span>{" "}<span className="whitespace-nowrap">{phone}</span>
      </a>
      <a href={`mailto:${email}`} className={link}>
        <span className="whitespace-nowrap">{t.footer.email} ·</span>{" "}<span className="whitespace-nowrap">{email}</span>
      </a>
    </div>
  );
}
