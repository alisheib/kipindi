"use client";

import type { ReactNode } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { PAGE_HEADER_PILL, PageHeader } from "@/components/ui/page-header";
import { ReceiptRow } from "@/components/ui/receipt-row";
import { RoutePick } from "@/components/ui/route-pick";
import { GhostLine } from "@/components/maswali/maswali-ghost";
import { useT } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n-dict";
import { cn } from "@/lib/utils";
import { HUB_DOOR, HUB_GRID, HUB_LEDGER, HUB_MINE, HUB_PINNED, HUB_POOL_HEAD, HUB_QUESTIONS, HUB_STRIP, hubAside, hubCell, hubMain } from "./hub-frame";
import { MillioneaHowGhost } from "./how/how-ghost";
import { MillioneaRegisterGhost } from "./register/register-ghost";
import { MillioneaRegisterWeekGhost } from "./register/[week]/register-week-ghost";
import { MillioneaSlipGhost } from "./slip/slip-ghost";
import { MillioneaTicketsGhost } from "./tickets/tickets-ghost";
import { MillioneaTicketGhost } from "./tickets/[serial]/ticket-ghost";
import { MILLIONEA_HREF } from "./millionea-parts";

/** The platform's skeleton sweep (`.kp-shimmer-track`, globals.css: a pearl sheen, 1.4s; off under reduced motion and the
 *  `minimal` tier, where the still bar is the end state). Each block of the drawing wears it, as `GhostCard` does. */
const SWEEP = "kp-shimmer-track";
/** Drawn for a player; gone for a reader the shell marks a guest (`main[data-viewer="guest"]`, app-shell.tsx
 *  `MainLandmark` — the account hub drawing's own answer): the shell's answer, read by the stylesheet, so nothing is read. */
const MEMBER = "[[data-viewer=guest]_&]:hidden";
/** Drawn only for a reader the shell marks a guest. */
const GUEST = "hidden [[data-viewer=guest]_&]:block";

/**
 * How many lines a band's words take, per language: below 360, from 360 to 767, and from 768 (the subtitle then runs the
 * measure; the rule and the ledger stand in the buy column). The dictionary's own sentences as the page sets them —
 * measured, and held to it, by `qa:maswali-hub-states`' "ghost" state, which prints each band's lines and fails where
 * one drifts (a word changed in one language moves its count).
 */
type Wrap = readonly [narrow: number, phone: number, wide: number];
const WRAPS: Record<Locale, { subtitle: Wrap; rule: Wrap; floor: Wrap }> = {
  sw: { subtitle: [2, 2, 1], rule: [3, 2, 2], floor: [2, 2, 2] },
  en: { subtitle: [3, 2, 1], rule: [2, 2, 2], floor: [1, 1, 1] },
  zh: { subtitle: [2, 2, 1], rule: [2, 1, 1], floor: [1, 1, 1] },
};
/** Each line's place in each band: drawn where the band has that many lines, gone where it has fewer (literal classes, so
 *  the stylesheet holds every one). */
const SHOWN = { narrow: ["hidden", "block"], phone: ["xs:hidden", "xs:block"], wide: ["md:hidden", "md:block"] } as const;
function shownIn(i: number, n: Wrap): string {
  return cn(SHOWN.narrow[i < n[0] ? 1 : 0], SHOWN.phone[i < n[1] ? 1 : 0], SHOWN.wide[i < n[2] ? 1 : 0]);
}

/**
 * A line of words in the page's own type: the drawing's bar inside the very line box those words fill (`text` names their
 * classes), so each band of the drawing is as tall as the band it stands for — one rule for every band, never a bar of a
 * guessed height (S5-DESIGN-HUB L7).
 */
function Line({ text = "", width, className, sweep = false }: { text?: string; width: string; className?: string; sweep?: boolean }) {
  return <span className={cn("block", text, className)}><GhostLine className={cn(width, sweep && SWEEP)} /></span>;
}
/** A band of `n` lines (per width) in the page's type, its last line short as a sentence's is. */
function Lines({ n, text, className, sweep = false }: { n: Wrap; text: string; className?: string; sweep?: boolean }) {
  const most = Math.max(...n);
  return (
    <span className={cn("block", text, className)}>
      {Array.from({ length: most }, (_, i) => (
        <Line key={i} width={i === most - 1 ? "w-[62%]" : "w-full"} className={shownIn(i, n)} sweep={sweep} />
      ))}
    </span>
  );
}

/** The ledger's rows as the one Millionea ledger draws a selling week's (`millioneaLedgerRows` → `MaswaliLedger`): the
 *  carry it received (a door to its week: the row is the link, at least `--h-control-md`), the sales over their note, the
 *  pool so far under its hairline, then — a step of space after the total — the floor, the jackpot and the fee. */
type GhostRow = { link?: boolean; note?: boolean; total?: boolean; gap?: boolean; floor?: boolean; muted?: boolean };
const LEDGER: GhostRow[] = [{ link: true }, { note: true }, { total: true }, { gap: true, floor: true }, {}, { muted: true }];

/** One ledger row in the kit's own row (`ReceiptRow`, its sentence label), so its line boxes are the page's. */
function LedgerRow({ r, floorLines }: { r: GhostRow; floorLines: Wrap }) {
  const row = (
    <ReceiptRow
      labelStyle="sentence"
      label={r.floor ? <Lines n={floorLines} text="" className="w-[150px] max-w-full" /> : <GhostLine className="w-[112px]" />}
      value={<GhostLine className="w-[84px]" />}
      emphasis={r.total ? "total" : r.muted ? "muted" : undefined}
      divider={r.total}
      className={cn(r.gap && "mt-3")}
    />
  );
  const note = r.note ? <span className="mt-0.5 block text-body-sm"><GhostLine className="w-[132px]" /></span> : null;
  return r.link
    ? <div className="flex flex-col justify-center rounded-control" style={{ minHeight: "var(--h-control-md)" }}>{row}{note}</div>
    : <div>{row}{note}</div>;
}

/**
 * /millionea loading drawing — THE HUB'S INVARIANT FRAME (MASWALI-BUILD S5-R2-HUB; the lead's round-2 ruling on R1-hub's
 * loading row). Every band stands where the page stands it, because both compose one frame (`hub-frame.ts`): the head
 * (its eyebrow with the week's chip, its name, its two doors wrapping under the name on a phone, the game's one line), the
 * strip across the measure, the jackpot's head and the door (pinned from 1024), the pool's ledger, and — last in the buy
 * column — the reader's own block, drawn as the kit's neutral block (the count line over one held ticket's row) that the
 * real rows replace in place; then the questions. So the swap to the page moves nothing above or beside the reader's
 * block whether the reader holds no ticket, one, or many (`qa:maswali-hub-states`' "ghost" state measures each at 360
 * and 1280).
 * ⭐ A GUEST is drawn a guest's door — the line and the Sign up / Sign in pair, no block of tickets — chosen by the shell's
 *    own answer, as the account hub's drawing chooses (`main[data-viewer="guest"]`, app-shell.tsx `MainLandmark`; `MEMBER`
 *    and `GUEST` below): nothing is read, nothing is said. The journey's shell marks a guest; the classic shell does not
 *    yet, so there a guest is drawn the player's door.
 * ⭐ MOTION: the platform's skeleton sweep on every band (`SWEEP`); under reduced motion and the `minimal` tier the bars
 *    stand still, the end state. The page itself lands with no motion of its own: the route's one entrance played when
 *    the drawing arrived (`route-transition.tsx`).
 * ONE DRAWING, TWO READERS: this route's `loading.tsx` draws it at /millionea (through `MillioneaGhostPick` below), and the
 * journey's root loading state draws it on a move to /millionea (`route-ghost.tsx`). Client code, wordless but for the
 * screen reader's "loading" (`maswali-ghost.tsx`).
 */
export function MillioneaHubGhost() {
  const { t, locale } = useT();
  const wraps = WRAPS[locale];
  const head: ReactNode = (
    <div className={cn(HUB_POOL_HEAD.box, SWEEP, hubCell(true, "head"))} data-ghost="jackpot">
      <Line text={HUB_POOL_HEAD.label} width="w-[64px]" />
      <Line text={HUB_POOL_HEAD.figure} width="w-[220px] max-w-full" />
      <Lines n={wraps.rule} text={HUB_POOL_HEAD.rule} />
    </div>
  );
  // The door and its one status line: a player's fill door; a guest's line over the Sign up / Sign in pair (`BuyDoor`'s);
  // then the close beside either.
  const door: ReactNode = (
    <div className={cn(HUB_DOOR.box, hubCell(true, "door"))} data-ghost="door">
      <div className={MEMBER}>
        <div className={cn("h-[var(--h-control-lg)] w-full rounded-control bg-bg-overlay", SWEEP)} />
      </div>
      <div className={GUEST}>
        <div className="flex flex-col gap-2">
          <Line text="text-body-sm" width="w-[136px]" />
          <div className="grid grid-cols-2 gap-2">
            <span className={cn("h-[var(--h-control-md)] rounded-pill bg-bg-overlay", SWEEP)} />
            <span className={cn("h-[var(--h-control-md)] rounded-pill bg-bg-overlay", SWEEP)} />
          </div>
        </div>
      </div>
      <div className={HUB_DOOR.close}><Line text={HUB_DOOR.closeLine} width="w-[180px]" sweep /></div>
    </div>
  );
  return (
    <PageContainer tier="reading">
      {/* `data-ghost-page`: which page's drawing this is — the one marker the hop drive reads (qa:millionea-ghost-hops). */}
      <div className="flex flex-col gap-6" aria-busy="true" data-ghost-page="hub">
        <div aria-hidden>
          <PageHeader
            eyebrow={(
              // The week and its state — the register's chip (`WeekStateChip`, 23px tall): the page's eyebrow row, its height.
              <span className="inline-flex items-center gap-2">
                <GhostLine className={cn("w-[56px]", SWEEP)} />
                <span className={cn("inline-block h-[23px] w-[72px] rounded-pill bg-bg-overlay", SWEEP)} />
              </span>
            )}
            title={<GhostLine className={cn("w-[248px]", SWEEP)} />}
            subtitle={<Lines n={wraps.subtitle} text="" sweep />}
            actionsWrap
            actions={(
              <span className="flex shrink-0 items-center gap-1">
                <span className={cn(PAGE_HEADER_PILL, "w-[112px]", SWEEP)} />
                <span className={cn(PAGE_HEADER_PILL, "w-[104px]", SWEEP)} />
              </span>
            )}
          />
        </div>
        <div className={HUB_GRID} aria-hidden>
          {/* The strip: three phases, each a dot's place and two lines of the strip's own type (its label over its range),
              a column each from 768, across the measure (`maswali-week-strip.tsx`). */}
          <div className={cn("flex flex-col gap-2 md:grid md:grid-cols-3 md:gap-3", HUB_STRIP)} data-ghost="strip">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-baseline gap-2 md:border-t-2 md:border-border-strong md:pt-1.5">
                <span className="h-1.5 w-1.5 shrink-0" />
                <span className="min-w-0 text-body-sm">
                  <Line width="w-[96px] max-w-full" sweep />
                  <Line width="w-[208px] max-w-full" sweep />
                </span>
              </div>
            ))}
          </div>
          <div className={hubAside(true, true)}>
            <div className={HUB_PINNED}>
              {head}
              {door}
            </div>
            <div className={cn(HUB_LEDGER, SWEEP, hubCell(true, "ledger"))} data-ghost="ledger">
              <div className="flex flex-col gap-1.5">
                {LEDGER.map((r, i) => <LedgerRow key={i} r={r} floorLines={wraps.floor} />)}
              </div>
            </div>
            {/* The reader's own block, last: the count line over one held ticket's row (the kit's raised block — the row's
                serial line over its two rows of sockets, the ten mains at 18px and the five reserves at 14px under them,
                `MaswaliHeldTicketRow` / `MaswaliSealLine` size 18), which the real rows replace in place. No block for a
                guest. */}
            <div className={cn(HUB_MINE.box, hubCell(true, "mine"), MEMBER)} data-ghost="mine">
              <Line text={HUB_MINE.count} width="w-[208px] max-w-full" sweep />
              <div className={cn("mat-raised flex flex-col gap-1.5 rounded-control p-2", SWEEP)} style={{ minHeight: "var(--h-control-md)" }}>
                <Line text="font-mono text-body-sm font-bold" width="w-[176px] max-w-full" />
                <span className="flex flex-col gap-1.5">
                  <span className="block h-[18px]" />
                  <span className="block h-[14px]" />
                </span>
              </div>
            </div>
          </div>
          <div className={hubMain(true)}>
            <div className={HUB_QUESTIONS.section} data-ghost="questions">
              <Line text={HUB_QUESTIONS.heading} width="w-[200px]" sweep />
              <div>
                {Array.from({ length: 10 }, (_, i) => (
                  <div key={i} className={cn(HUB_QUESTIONS.row, SWEEP)}>
                    <Line text={HUB_QUESTIONS.number} width="w-[12px]" />
                    <Line text={HUB_QUESTIONS.category} width="w-[64px]" />
                    <span className={HUB_QUESTIONS.words}><Line text={HUB_QUESTIONS.text} width="w-full max-w-[420px]" /></span>
                    <span className={HUB_QUESTIONS.when}>
                      <Line text={HUB_QUESTIONS.time} width="w-[136px]" />
                      <span className={HUB_QUESTIONS.stamp} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <span className="sr-only">{t.common.loading}</span>
      </div>
    </PageContainer>
  );
}

/** A page with a parameter below `base` (a week, a ticket): the whole path, anchored, as `RoutePick` takes a pattern. */
const childOf = (base: string) => `^${base}/[^/]+$`;
/** Every Millionea page with a fixed address, and the pattern of each page with a parameter: the pick's keys — the pages'
 *  own addresses (`MILLIONEA_HREF`, their one definition), held by `test:maswali-hub` §15's census: each Millionea
 *  `page.tsx` is named here, or the suite fails. */
export const MILLIONEA_GHOST_ROUTES = [MILLIONEA_HREF.hub, MILLIONEA_HREF.how, MILLIONEA_HREF.register, MILLIONEA_HREF.slip, MILLIONEA_HREF.tickets] as const;
export const MILLIONEA_GHOST_PATTERNS = [childOf(MILLIONEA_HREF.register), childOf(MILLIONEA_HREF.tickets)] as const;

/**
 * THE MILLIONEA SEGMENT'S LOADING STATE: THE DRAWING OF THE PAGE BEING OPENED (S5-R2-HUB; the lead's item from REGISTER's
 * measure — on a hop between Millionea pages under a 400 ms / 12 KB/s link the segment's loading file, which wraps every
 * Millionea page, painted the HUB's drawing until the page landed: register → How 21.7 s, hub → How 22.4 s, How → the
 * register 14.4 s). The platform's own technique (`RoutePick`, as `route-ghost.tsx` picks): `usePathname()` names the
 * page being moved to, so each page is drawn by its own drawing — the one its own loading file draws (§15 renders each
 * pick against that file) — and any other address by the hub's.
 * `journey` — a journey reader's own route ghost, handed in by the loading file (R5-D's binding: the journey's code is
 * never a module every reader loads): Tiketi zangu's Millionea kind stands under Tiketi zangu's journey head there, drawn
 * as the root's loading state draws it. Every other Millionea page is one drawing for both shells.
 */
export function MillioneaGhostPick({ journey }: { journey?: ReactNode }) {
  // Each page's drawing first, then the map of the pages' addresses to them: an address is code, never a word beside a
  // drawing (`test:maswali-ui` 1.3 holds every drawing file wordless).
  const hub = <MillioneaHubGhost />;
  const how = <MillioneaHowGhost />;
  const register = <MillioneaRegisterGhost />;
  const slip = <MillioneaSlipGhost />;
  const tickets = journey ?? <MillioneaTicketsGhost />;
  const week = <MillioneaRegisterWeekGhost />;
  const ticket = <MillioneaTicketGhost />;
  const routes: Record<string, ReactNode> = {
    [MILLIONEA_HREF.hub]: hub, [MILLIONEA_HREF.how]: how, [MILLIONEA_HREF.register]: register, [MILLIONEA_HREF.slip]: slip, [MILLIONEA_HREF.tickets]: tickets,
  };
  const patterns = [[childOf(MILLIONEA_HREF.register), week], [childOf(MILLIONEA_HREF.tickets), ticket]] as const;
  return <RoutePick routes={routes} patterns={patterns} other={hub} />;
}
