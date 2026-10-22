"use client";

import { PageContainer } from "@/components/layout/page-container";
import { RoutePick } from "@/components/ui/route-pick";
import { GhostBar, GhostLine, MaswaliGhostHead } from "@/components/maswali/maswali-ghost";
import { useT } from "@/lib/i18n";
import { MILLIONEA_HREF } from "../millionea-parts";
import { MillioneaRegisterWeekGhost } from "./[week]/register-week-ghost";

/**
 * /millionea/register loading skeleton — the index's own bands (`page.tsx`): its head and the intro under it (the critic's
 * M11: at /fairness's reading measure, its lines as bars — more below 768, where the paragraph wraps longer), then a
 * section's heading and the week rows, each the row's own shape (S5 VIS R9; the ONE `WeekRow`): the code, the week with
 * its state chip, and its facts — beside the week from 768, under it below. The list draws its own top edge and divides
 * its rows, as the page's list does (the row draws no rule). Wordless but for the screen reader's "loading"
 * (`maswali-ghost.tsx` says why).
 */
export function MillioneaRegisterGhost() {
  const { t } = useT();
  return (
    <PageContainer tier="reading">
      {/* `data-ghost-page`: which page's drawing this is, for `qa:millionea-ghost-hops` (a hop shows only its own). */}
      <div className="flex flex-col gap-6" aria-busy="true" data-ghost-page="register">
        <div className="flex flex-col gap-3">
          <MaswaliGhostHead eyebrowWidth="w-[144px]" titleWidth="w-[208px]" />
          <div className="flex max-w-[68ch] flex-col gap-2" aria-hidden>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <GhostBar key={i} className={i === 7 ? "h-4 w-[55%]" : i >= 4 ? "h-4 w-full md:hidden" : "h-4 w-full"} />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2" aria-hidden>
          <span className="font-display text-title-sm font-bold"><GhostLine className="w-[160px]" /></span>
          <div className="flex flex-col divide-y divide-border border-t border-border">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col justify-center gap-1 py-3" style={{ minHeight: "var(--h-control-lg)" }}>
                <GhostBar className="h-3 w-[120px]" />
                <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-6">
                  <div className="flex shrink-0 items-center gap-2 md:w-[280px]">
                    <GhostBar className="h-4 w-[72px]" />
                    <GhostBar className="h-[23px] w-[88px] rounded-pill" />
                  </div>
                  <GhostBar className="h-3 w-[60%] md:w-[280px] lg:ml-auto" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <span className="sr-only">{t.common.loading}</span>
      </div>
    </PageContainer>
  );
}

/** A week's page under the register, as `RoutePick` reads an address: anchored, the product's own constant. */
const WEEK_PAGE = "^" + MILLIONEA_HREF.register + "/[^/]+$";

/**
 * THE REGISTER SEGMENT'S LOADING STATE: THE DRAWING OF THE PAGE BEING OPENED (S5-R2-REGISTER 18, the lead's ruling). The
 * register's loading file wraps the week pages too, so on a client move from the index to a week it is the boundary that
 * paints — it drew the INDEX's drawing there for seconds and the week's own never (measured on a throttled hop;
 * `qa:millionea-ghost-hops` holds every Millionea hop to it). The platform's `RoutePick` (`usePathname()` names the page
 * being moved to) picks the index's drawing or a week's — built here, in the browser, as the hub's `MillioneaGhostPick` is,
 * so the loading file hands one client reference (`test:visual-pass-r5h` 1.2/1.3: a loading element is client references,
 * under 128 B, and a loading file imports no server module).
 */
export function MillioneaRegisterGhostPick() {
  const index = <MillioneaRegisterGhost />;
  return <RoutePick routes={{ [MILLIONEA_HREF.register]: index }} patterns={[[WEEK_PAGE, <MillioneaRegisterWeekGhost />]]} other={index} />;
}
