"use client";

import { PageContainer } from "@/components/layout/page-container";
import { RoutePick } from "@/components/ui/route-pick";
import { GhostLine, GhostTextLine, MaswaliGhostHead } from "@/components/maswali/maswali-ghost";
import { GhostWords } from "@/components/maswali/maswali-ghost-words";
import { useT } from "@/lib/i18n";
import { MILLIONEA_HREF } from "../millionea-parts";
import { MillioneaRegisterWeekGhost } from "./[week]/register-week-ghost";
import { registerIntro } from "./register-words";

/**
 * /millionea/register loading skeleton — the index's own bands (`page.tsx`), each in the page's own type: a line of words is
 * the kit's bar inside the very line box those words fill (`GhostTextLine`, the hub's drawing's rule), so every band is the
 * page's height and the next lands where the page puts it. Its head and the intro under it at /fairness's reading measure
 * (the critic's M11) — the intro's own words, set unseen through the kit's `GhostWords` from `register-words.ts`, so it
 * breaks where the page's does in any engine (the lead's ruling of 2026-10-23, S5-R3-FIX 8); then the two sections as the
 * index most often opens: "In progress" holding the week on sale (one fact, its close), then "Final weeks" — each row the
 * ONE `WeekRow`'s own parts (S5 VIS R9, `register-parts.tsx`): the code's micro line, the week beside its state chip, its
 * facts (one per line below 768, beside the week from 768) and the chevron's place, in a list that draws its own top edge
 * and divides its rows (the row draws no rule). How many weeks a section holds the drawing cannot know. It names no word
 * itself; a reader Millionea is hidden from is drawn a plain bar where the intro stands (`maswali-ghost-words.tsx` says
 * why). Measured by `qa:maswali-register-shots`' register-ghosts hop.
 */

/** The sections as the index most often opens — the week on sale (its one fact), then final weeks (two facts a row). */
const SECTIONS: ReadonlyArray<readonly number[]> = [[1], [2, 2, 2, 2]];

/** A fact's line in a row: its numerals are the mono face's (§T5), whose line box stands a pixel taller than a body line —
 *  an empty run of that face gives the drawn line the same box. */
function FactLine({ width }: { width: string }) {
  return <span className="block"><GhostLine className={width} /><span className="font-mono" /></span>;
}

/** One week's row, as `WeekRow` draws it (its classes, its rhythm), with `facts` lines of facts below 768. */
function Row({ facts }: { facts: number }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3" style={{ minHeight: "var(--h-control-lg)" }}>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <GhostTextLine text="font-mono text-micro uppercase eyebrow" width="w-[120px]" />
        <span className="flex flex-col gap-1 md:flex-row md:items-center md:gap-6">
          <span className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1 md:w-[280px]">
            <GhostTextLine text="text-body font-semibold" width="w-[64px]" />
            <span className="inline-block h-[23px] w-[88px] rounded-pill bg-bg-overlay" />
          </span>
          <span className="min-w-0 text-body-sm lg:ml-auto">
            <span className="block md:hidden">{Array.from({ length: facts }, (_, i) => <FactLine key={i} width={i === 0 ? "w-[160px]" : "w-[200px]"} />)}</span>
            <span className="hidden md:block"><FactLine width="w-[280px] max-w-full" /></span>
          </span>
        </span>
      </span>
      <span className="h-[16px] w-[16px] shrink-0" />
    </div>
  );
}

export function MillioneaRegisterGhost() {
  const { t } = useT();
  return (
    // Millionea's Chinese is set as the page sets it (`kp-mln-zh`: its eyebrows and micro labels at 12px), so the bands match.
    <PageContainer tier="reading" className="kp-mln-zh">
      {/* `data-ghost-page`: which page's drawing this is, for `qa:millionea-ghost-hops` (a hop shows only its own). */}
      <div className="flex flex-col gap-6" aria-busy="true" data-ghost-page="register">
        <div className="flex flex-col gap-3" aria-hidden data-ghost="head">
          <MaswaliGhostHead eyebrowWidth="w-[144px]" titleWidth="w-[208px]" />
          <p className="max-w-[68ch] text-body text-text-muted text-pretty"><GhostWords words={registerIntro} /></p>
        </div>
        {SECTIONS.map((rows, s) => (
          <div key={s} className="flex flex-col gap-2" aria-hidden data-ghost={s === 0 ? "running" : "final"}>
            <GhostTextLine text="font-display text-title-sm font-bold" width="w-[160px]" />
            <div className="flex flex-col divide-y divide-border border-t border-border">
              {rows.map((facts, i) => <Row key={i} facts={facts} />)}
            </div>
          </div>
        ))}
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
