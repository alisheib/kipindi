import { PageContainer } from "@/components/layout/page-container";
import { getServerT } from "@/lib/i18n-server";
import { SENDER_IDENTITY } from "@/lib/marketing/footer";
import { resolveOptOutTokenWithinBudget, refusalKindFor } from "@/lib/server/marketing/optout-service";
import type { OptOutPageResolution } from "@/lib/server/marketing/optout-service";
import { OptOutRefusal, ContactLines } from "../optout-refusal";
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
 * Bare `/s` (a link that lost its token) has its own page, the same refusal (`../page.tsx`).
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
 * ⚠️ DEV-ONLY HOOKS, SO STATES A FAST LOCAL STORE NEVER SHOWS CAN BE PHOTOGRAPHED
 * (`marketing-u8-optout-drive.mjs`). `?qa_hold_ms` holds the render, so `loading.tsx` stays on screen
 * long enough to capture; `?qa_fail_read=1` makes the read throw, so the "did not go through" refusal
 * can be seen. ⛔ BOTH ARE NO-OPS IN PRODUCTION, whatever the query says — the same rule as every
 * `api/dev-test` route — and the hold is capped, so a typo cannot hang a local server.
 */
const QA_HOLD_MAX_MS = 5000;
type Query = Record<string, string | string[] | undefined>;
const qaParam = (sp: Query, key: string): string | undefined => {
  const v = sp[key];
  return Array.isArray(v) ? v[0] : v;
};
async function qaHold(sp: Query): Promise<void> {
  if (process.env.NODE_ENV === "production") return;
  const ms = Number(qaParam(sp, "qa_hold_ms"));
  if (Number.isFinite(ms) && ms > 0) await new Promise((res) => setTimeout(res, Math.min(ms, QA_HOLD_MAX_MS)));
}
function qaFailRead(sp: Query): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return qaParam(sp, "qa_fail_read") === "1";
}

export default async function OptOutPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Query>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  await qaHold(sp);
  const { t } = await getServerT();
  // ⭐ WITHIN A BUDGET ONLY A MISS SPENDS (D6) — see the service. ⛔ A read that FAILED is not an
  // invalid link: it gets the "did not go through" sentence, never "this link does not work".
  let r: OptOutPageResolution | null;
  try {
    if (qaFailRead(sp)) throw new Error("qa_fail_read (dev only)");
    r = await resolveOptOutTokenWithinBudget(token, await optOutClientKey());
  } catch (err) {
    console.error("[optout] page read failed:", (err as Error)?.message ?? err);
    r = null;
  }

  // ⛔ ONE SENTENCE PER THING THE READER CAN ACT ON, never one per cause the service knows
  // (`refusalKindFor`): `malformed` and `unknown` are one sentence, or `/s/` becomes an oracle for
  // guessing live tokens; a dry budget is "busy, try again" (no lookup was made, so it reveals nothing);
  // a failed read is "did not go through". ⛔ Each is a REFUSAL, never a quiet success — the copy says
  // plainly that nothing has changed, and (F4) it names the next step. The retry is the same address.
  if (!r || !r.ok) {
    return <OptOutRefusal t={t} kind={refusalKindFor(r) ?? "invalid"} retryHref={`/s/${encodeURIComponent(token)}`} />;
  }

  return (
    <PageContainer tier="receipt" className="space-y-5">
      {/* ⭐ THE HEADING, THE NUMBER AND THE ONE ACTION ALL LIVE IN THE CLIENT NOW (D6), because the
          heading must follow the state: a fresh load of a stopped number used to show "Stop marketing
          messages / tap once to stop…" directly above a button that RE-SUBSCRIBES. `r.masked` only —
          §5.14 allows nothing else, and the raw number never leaves the server (`test:marketing-optout`
          S5 greps this file for the identifier field, comments included). `r.token` is the
          NORMALISED token, so a lower-case link acts on the same row it resolved.
          `contact` is our desk, read here on the server (E-226), shown under a failed tap. */}
      <OptOutClient
        token={r.token}
        masked={r.masked}
        suppressed={r.suppressed}
        resumable={r.resumable}
        eyebrow={SENDER_IDENTITY}
        contact={<ContactLines t={t} align="start" />}
      />
    </PageContainer>
  );
}
