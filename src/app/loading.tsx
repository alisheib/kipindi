import { headers } from "next/headers";
import { SectionLoader } from "@/components/brand";
import { JourneyRouteGhost } from "@/components/journey/route-ghost";
import { getServerT } from "@/lib/i18n-server";
import { isOptOutPath } from "@/lib/marketing/optout";
import { resolveSimpleJourney } from "@/lib/server/journey-preview";

export default async function RootLoading() {
  /* ⭐ A JOURNEY READER IS DRAWN THE GHOST OF THE PAGE BEING OPENED (2026-10-09, the visual pass round 4, R4-J; E38):
     `components/journey/route-ghost.tsx` has the why and the pages. The question is AppShell's, asked the way AppShell
     asks it — the console and the opt-out page return before the resolver there, so they never get the journey here
     either — and the resolver is the one per-request answer (React `cache`) the shell has already read for this
     render. Everybody else is drawn the box below, unchanged. */
  const pathname = (await headers()).get("x-pathname") ?? "";
  if (!pathname.startsWith("/admin") && !isOptOutPath(pathname) && (await resolveSimpleJourney()).journey) {
    const { t, locale } = await getServerT();
    return <JourneyRouteGhost t={t} locale={locale} />;
  }
  // 1280 = the board width tier. This was 1240, a one-off matching no page in the
  // app, so the generic fallback always reflowed into whatever route resolved next.
  return (
    <div className="mx-auto max-w-[1280px] px-3 lg:px-6 py-10">
      <SectionLoader height={360} />
    </div>
  );
}
