import { notFound, redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { positionStore, marketStore } from "@/lib/server/market-dal";
import { roundStore } from "@/lib/server/updown-dal";
import { positionPermalink } from "@/lib/position-permalink";

/**
 * ⭐ E-101 · THE TICKET PERMALINK — `/positions/<positionId>` resolves to the surface that
 * actually renders that position, and redirects there.
 *
 * 🔴 WHY IT EXISTS (Ali, 2026-08-05): *"when I click on ticket it just opens positions, not the
 * specific position I was in with details."* Four surfaces printed a reference and then linked
 * to a generic list — and for an Up & Down bet that list was `/positions`, which queries
 * `productLine: "MARKET"` and therefore can never contain it. See `position-permalink.ts` for
 * the full inventory; the rule lives there, this route is only the lookup and the guard.
 *
 * ⛔ OWNERSHIP IS ENFORCED HERE, ONCE. A position id is short and printed in emails, so the
 * route is guessable; without this check it would confirm that someone else's ticket exists and
 * hand over the market it was placed on. `notFound()` for BOTH "no such position" and "not
 * yours" on purpose — two different messages is an existence oracle.
 *
 * ⛔ AND IT IS A REDIRECT, NOT A RENDER. The details already exist on the market page and the
 * round page, and building a third copy of "your position" is how the two definitions in
 * §0.1a's rule get created. One surface per fact.
 */
export const dynamic = "force-dynamic";

export default async function PositionPermalinkPage({ params }: { params: Promise<{ positionId: string }> }) {
  const { positionId } = await params;
  const session = await currentSession();
  // A signed-out visitor is sent to sign in and BACK here, so the deep link survives the
  // detour — the alternative drops them on the board having lost what they clicked.
  if (!session) redirect(`/auth/login?next=${encodeURIComponent(`/positions/${positionId}`)}`);

  const position = await positionStore.get(positionId).catch(() => null);
  // ⛔ Identical outcome for "missing" and "not yours". See the header note.
  if (!position || position.userId !== session.userId) notFound();

  const market = await marketStore.get(position.marketId).catch(() => null);
  const productLine = market?.productLine === "UPDOWN" ? "UPDOWN" : "MARKET";
  // Only ask for a round when the market says it is an Up & Down one — a lookup per long-form
  // ticket would be a query nobody reads.
  const round = productLine === "UPDOWN"
    ? await roundStore.getByMarketId(position.marketId).catch(() => null)
    : null;

  redirect(positionPermalink({
    positionId,
    productLine,
    marketId: market?.id ?? position.marketId,
    roundId: round?.id ?? null,
  }).href);
}
