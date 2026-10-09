import { getServerT } from "@/lib/i18n-server";
import { NotFoundView } from "@/components/ui/not-found-view";
import { NOT_FOUND_WORDS } from "@/components/ui/not-found-words";
import { generateMetadata as notFoundMetadata } from "@/app/not-found";

/**
 * Colocated not-found for /proposals/[id] — the app's one not-found view (`not-found-view.tsx`): the same kicker, the
 * same three cards in the same order, and its own way out, back to the proposals board, under them in the one link
 * colour. (It wore a gold "404" and a gold link — gold is money, §M3/Q5 — and put its way back in the first card.)
 * ⚠️ The status is whatever the stream committed before `notFound()` ran — this segment has a `loading.tsx`; see
 * `markets/[id]/not-found.tsx`. The title and the head's `noindex` are the not-found's own, below.
 */
export async function generateMetadata() {
  return notFoundMetadata();
}

export default async function ProposalNotFound() {
  const { t, locale } = await getServerT();
  return (
    <NotFoundView
      words={NOT_FOUND_WORDS[locale]}
      recoveryLabel={t.error.recoveryLinks}
      way={{ href: "/proposals", label: t.error.backToProposals }}
    />
  );
}
