import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { getServerT } from "@/lib/i18n-server";
import { SENDER_IDENTITY } from "@/lib/marketing/footer";
import { resolveOptOutToken } from "@/lib/server/marketing/optout-service";
import { OptOutClient } from "./optout-client";

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

export default async function OptOutPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { t } = await getServerT();
  const r = await resolveOptOutToken(token);

  // ⛔ ONE SENTENCE FOR BOTH FAILURES. `malformed` and `unknown` are different to the service
  // and identical to the reader: telling a stranger which of the two they hit turns `/s/` into
  // an oracle for guessing live tokens. ⛔ And it is a REFUSAL, never a quiet success — the
  // copy says plainly that nothing has changed.
  if (!r.ok) {
    return (
      <PageContainer tier="receipt" className="space-y-5">
        <PageHeader eyebrow={SENDER_IDENTITY} title={t.optout.title} />
        <EmptyState kind="default" title={t.optout.invalid} body={t.optout.body} />
      </PageContainer>
    );
  }

  return (
    <PageContainer tier="receipt" className="space-y-5">
      <PageHeader eyebrow={SENDER_IDENTITY} title={t.optout.title} subtitle={t.optout.body} />
      <section className="rounded-xl glass-panel p-4">
        {/* `tabular-nums` because it is a phone number, and masked because §5.14 allows nothing
            else: whoever is holding this phone can open this page. */}
        <p className="font-mono text-title-sm font-bold tabular-nums text-text">{r.masked}</p>
      </section>
      <OptOutClient token={token} suppressed={r.suppressed} />
    </PageContainer>
  );
}
