import { headers } from "next/headers";
import { SectionLoader } from "@/components/brand";
import { LazyJourneyRouteGhost } from "@/components/journey/route-ghost-lazy";
import { isOptOutPath } from "@/lib/marketing/optout";
import { resolveSimpleJourney } from "@/lib/server/journey-preview";
import { resolveMillionea } from "@/lib/server/millionea-preview";
import { heroRailNames } from "@/lib/server/payout-rails";

export default async function RootLoading() {
  /* ⭐ A JOURNEY READER IS DRAWN THE GHOST OF THE PAGE BEING OPENED (2026-10-09, the visual pass round 4, R4-J; E38):
     `components/journey/route-ghost.tsx` has the why and the pages. The question is AppShell's, asked the way AppShell
     asks it — the console and the opt-out page return before the resolver there, so they never get the journey here
     either — and the resolver is the one per-request answer (React `cache`) the shell has already read for this
     render. Everybody else is drawn the box below, unchanged.
     ⭐ THE GHOSTS ARE A CLIENT CHUNK (round 5, review G1): this element is sent again with every payload rendered from the
     root — each journey document and each refresh — so it carries a reference and the one thing the browser cannot read
     for itself, the rails that pay out (`heroRailNames`; the page drops a paused one, the ghost names them all, as
     before). The words are the client dictionary's, in the language the browser has (`route-ghost.tsx`, loaded through
     `route-ghost-lazy.tsx`).
     ⭐ MILLIONEA'S GHOSTS ONLY FOR A READER MILLIONEA IS VISIBLE TO (MASWALI-BUILD S5-FIX-PLATFORM D6): the ghost is picked
     by the address, before any gate answers, so a journey reader the rollout hides it from (staff while it is WITHDRAWN,
     an agency with a journey pass below ACTIVE) saw a Millionea-shaped ghost at a dark /millionea before its 404. The
     rollout's one per-request answer (`resolveMillionea`, React-cached: the shell reads it for the same render) is handed
     in, and only while it is true, so every other reader's element is the very one it was. */
  const pathname = (await headers()).get("x-pathname") ?? "";
  if (!pathname.startsWith("/admin") && !isOptOutPath(pathname) && (await resolveSimpleJourney()).journey) {
    const millionea = (await resolveMillionea()).visible;
    return <LazyJourneyRouteGhost rails={heroRailNames(null)} {...(millionea ? { millionea } : {})} />;
  }
  // 1280 = the board width tier. This was 1240, a one-off matching no page in the
  // app, so the generic fallback always reflowed into whatever route resolved next.
  return (
    <div className="mx-auto max-w-[1280px] px-3 lg:px-6 py-10">
      <SectionLoader height={360} />
    </div>
  );
}
