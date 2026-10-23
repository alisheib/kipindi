"use client";

import type { CSSProperties, ReactNode } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { Chip } from "@/components/ui/chip";
import { PAGE_HEADER_PILL, PageHeader } from "@/components/ui/page-header";
import { ReceiptRow } from "@/components/ui/receipt-row";
import { RoutePick } from "@/components/ui/route-pick";
import { I } from "@/components/ui/glyphs";
import { GhostLine } from "@/components/maswali/maswali-ghost";
import { GhostWords } from "@/components/maswali/maswali-ghost-words";
import { MillioneaGlyph } from "@/components/maswali/maswali-glyph";
import { useT } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n-dict";
import { cn } from "@/lib/utils";
import { HUB_DOOR, HUB_EYEBROW, HUB_GRID, HUB_LEDGER, HUB_MINE, HUB_PINNED, HUB_POOL_HEAD, HUB_QUESTIONS, HUB_STRIP, hubAside, hubCell, hubMain } from "./hub-frame";
import {
  hubCarry, hubEventsFrom, hubEventsLabel, hubEventsTo, hubFloor, hubIntro, hubOpenChip, hubQuestionsHeading, hubResultsFrom,
  hubResultsLabel, hubResultsTo, hubRule, hubSalesFrom, hubSalesLabel, hubSalesTo, hubWeek,
} from "./hub-page-words";
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
 * THE HEAD'S TWO DOORS (How to play; the reader's tickets) as the page's pills set their labels — the numerals' mono at the
 * caption rung, 11px tracked 0.2px (`PAGE_HEADER_PILL`) — each label's length in the face's own units: a Latin character
 * one `ch` of the monospaced face, an ideograph one `em`, so the pill is the page's width in any engine by construction;
 * `test:maswali-hub` 19.3 holds each to the dictionary's own label, and the drive measures each pill against the page's.
 * Each pill's glyph is the page's own, unpainted, so its box is the page's box. (The pills were bars of one width in every
 * language: on landing the second jumped 31px at sw 360.)
 */
type Label = readonly [latin: number, ideographs: number];
export const DOOR_LABELS: Record<Locale, readonly [how: Label, tickets: Label]> = {
  sw: [[16, 0], [11, 0]],
  en: [[11, 0], [12, 0]],
  zh: [[0, 4], [0, 4]],
};
const labelWidth = ([latin, wide]: Label) => `calc(${latin}ch + ${wide}em + ${((latin + wide) * 0.2).toFixed(1)}px)`;

/** The week's chip drawn as a skeleton: the kit's own `Chip` at its status metrics (the page's `WeekStateChip`: 23px, its
 *  padding, its border, its bold capitals) in the skeleton's fill, so it is the page's chip box around the word it holds. */
const CHIP_SKELETON: CSSProperties = { background: "var(--bg-overlay)", borderColor: "transparent" };

/**
 * A line of words in the page's own type: the drawing's bar inside the very line box those words fill (`text` names their
 * classes), so each band of the drawing is as tall as the band it stands for — one rule for every band, never a bar of a
 * guessed height (S5-DESIGN-HUB L7). For words the drawing can know, the band is the words' own (`GhostWords`, below).
 */
function Line({ text = "", width, className, sweep = false }: { text?: string; width: string; className?: string; sweep?: boolean }) {
  return <span className={cn("block", text, className)}><GhostLine className={cn(width, sweep && SWEEP)} /></span>;
}

/** The ledger's rows as the one Millionea ledger draws a selling week's (`millioneaLedgerRows` → `MaswaliLedger`): the
 *  carry it received (a door to its week: the row is the link, as tall as its line — REGISTER's S5-R2 row, its tap target
 *  out of flow, `.kp-mln-hit`; it stood on the 44px control floor and the drawing's ledger 24px taller than the page's),
 *  the sales over their note, the pool so far under its hairline, then the floor, the jackpot and the fee — every row the
 *  list's one gap apart (the ledger's one rhythm, REGISTER's S5-R2 27: a total is set apart by its hairline alone, no
 *  step of space after it). */
type GhostRow = { link?: boolean; note?: boolean; total?: boolean; floor?: boolean; muted?: boolean };
const LEDGER: GhostRow[] = [{ link: true }, { note: true }, { total: true }, { floor: true }, {}, { muted: true }];

/** One ledger row in the kit's own row (`ReceiptRow`, its sentence label), so its line boxes are the page's. The carry's
 *  label and the floor's are their words, set unseen (they wrap: "Carried in from" / "Week 00 ›" below 360 in English,
 *  "Kiwango cha chini" / "kilichohakikishwa" in Swahili); the carry's is the page's link label, its chevron unpainted. */
function LedgerRow({ r }: { r: GhostRow }) {
  const label = r.floor ? <GhostWords words={hubFloor} plain="w-[150px] max-w-full" />
    : r.link ? (
      <span className="inline-flex items-center gap-1">
        <span><GhostWords words={hubCarry} plain="w-[150px] max-w-full" /></span>
        <I.chevronRight s={14} edge="end" text="body-400" className="invisible shrink-0" />
      </span>
    )
    : <GhostLine className="w-[112px]" />;
  const row = (
    <ReceiptRow
      labelStyle="sentence"
      label={label}
      value={<GhostLine className="w-[84px]" />}
      emphasis={r.total ? "total" : r.muted ? "muted" : undefined}
      divider={r.total}
      alignEnd
    />
  );
  const note = r.note ? <span className="mt-0.5 block text-body-sm"><GhostLine className="w-[132px]" /></span> : null;
  return r.link ? <div className="flex flex-col rounded-control">{row}{note}</div> : <div>{row}{note}</div>;
}

/**
 * /millionea loading drawing — THE HUB'S INVARIANT FRAME (MASWALI-BUILD S5-R2-HUB; the lead's round-2 ruling on R1-hub's
 * loading row). Every band stands where the page stands it, because both compose one frame (`hub-frame.ts`): the head
 * (its eyebrow with the week's chip, its name, its two doors wrapping under the name on a phone, the game's one line), the
 * strip across the measure, the jackpot's head and the door (pinned from 1024), the pool's ledger, and — last in the buy
 * column — the reader's own block, drawn as the kit's neutral block (the count line over one held ticket's row) that the
 * real rows replace in place; then the questions. So the swap to the page moves nothing above or beside the reader's
 * block whether the reader holds no ticket, one, or many (`qa:maswali-hub-states`' "ghost" state measures each in
 * Chromium and WebKit at a phone's pixel ratios).
 * ⭐ ITS WORDS ARE THE PAGE'S, UNSEEN (HUB-2B; the lead's ruling of 2026-10-23, DESIGN_AUTHORITY §M8a items 22 and 25): a
 *    line whose words the drawing can know is set in its own words through the kit's one part, `GhostWords` (R3-2B's) —
 *    the page's type, measure and face, the ink unseen, a bar under each line box — so it breaks where the page's does in
 *    any engine, by construction: the head's line, the jackpot's rule, the ledger's carry and floor labels, the questions'
 *    heading, the strip's labels and ranges, the eyebrow's week and the chip's word. What it cannot know is a same-width
 *    TEMPLATE (`hub-page-words.ts`: "Wiki 00", the ruled price and rate, the template week's days and clocks). Its recipes
 *    live in the page's words module, named here only as `words={…}` (`test:maswali-ui` 1.3); for a reader Millionea is
 *    hidden from the shell provides no words and each is a plain bar.
 * ⭐ A GUEST is drawn a guest's door — the line and the Sign up / Sign in pair, no block of tickets — chosen by the shell's
 *    own answer, as the account hub's drawing chooses (`main[data-viewer="guest"]`, app-shell.tsx `MainLandmark`; `MEMBER`
 *    and `GUEST` below): nothing is read, nothing is said. The journey's shell marks a guest; the classic shell does not
 *    yet, so there a guest is drawn the player's door.
 * ⭐ MOTION: the platform's skeleton sweep on every bar and block (`SWEEP`); under reduced motion and the `minimal` tier the
 *    bars stand still, the end state. A word band stands still (the kit's part draws no sweep). The page itself lands with
 *    no motion of its own: the route's one entrance played when the drawing arrived (`route-transition.tsx`).
 * ONE DRAWING, TWO READERS: this route's `loading.tsx` draws it at /millionea (through `MillioneaGhostPick` below), and the
 * journey's root loading state draws it on a move to /millionea (`route-ghost.tsx`). Client code; the screen reader hears
 * "loading" alone (`maswali-ghost.tsx`).
 */
export function MillioneaHubGhost() {
  const { t, locale } = useT();
  const doors = DOOR_LABELS[locale];
  const head: ReactNode = (
    <div className={cn(HUB_POOL_HEAD.box, SWEEP, hubCell(true, "head"))} data-ghost="jackpot">
      <Line text={HUB_POOL_HEAD.label} width="w-[64px]" />
      <Line text={HUB_POOL_HEAD.figure} width="w-[220px] max-w-full" />
      <span className={cn("block", HUB_POOL_HEAD.rule)}><GhostWords words={hubRule} plain="w-full" /></span>
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
  // The strip's phases: each a dot's place, then its label over its range in the strip's own type — the range its kept
  // runs with the page's one space between them, where a line may break (`weekStripWords`, maswali-week-strip.tsx).
  const PHASE = "flex items-baseline gap-2 md:border-t-2 md:border-border-strong md:pt-1.5";
  const RUN = "whitespace-nowrap";
  return (
    // The page root's own class (`kp-mln-zh`, page.tsx): Chinese eyebrows at the label rung, 12/16 (globals.css A3) — the
    // jackpot's label among them, which stood 2px short in zh.
    <PageContainer tier="reading" className="kp-mln-zh">
      {/* `data-ghost-page`: which page's drawing this is — the one marker the hop drive reads (qa:millionea-ghost-hops). */}
      <div className="flex flex-col gap-6" aria-busy="true" data-ghost-page="hub">
        <div aria-hidden>
          <PageHeader
            eyebrow={(
              // The week and its state in the frame's row (`HUB_EYEBROW`, the page's `WeekLabel`'s): the week's words at the
              // template's two digits, then the register's chip (`WeekStateChip`) as the kit draws it, its word unseen.
              <span className={HUB_EYEBROW} data-ghost="eyebrow">
                <span><GhostWords words={hubWeek} plain="w-[60px]" /></span>
                <Chip variant="neutral" metrics="status" className={cn("shrink-0 self-start", SWEEP)} style={CHIP_SKELETON}>
                  <GhostWords words={hubOpenChip} plain="w-[32px]" />
                </Chip>
              </span>
            )}
            title={<GhostLine className={cn("w-[248px]", SWEEP)} />}
            subtitle={<GhostWords words={hubIntro} plain="w-full" />}
            actionsWrap
            actions={(
              <span className="flex shrink-0 items-center gap-1" data-ghost="doors">
                <span className={cn(PAGE_HEADER_PILL, SWEEP)}>
                  <MillioneaGlyph name="howTo" s={13} className="invisible" />
                  <span className="shrink-0" style={{ width: labelWidth(doors[0]) }} />
                </span>
                <span className={cn(PAGE_HEADER_PILL, SWEEP)}>
                  <I.ticket s={13} className="invisible" />
                  <span className="shrink-0" style={{ width: labelWidth(doors[1]) }} />
                </span>
              </span>
            )}
          />
        </div>
        <div className={HUB_GRID} aria-hidden>
          {/* The strip: three phases, a column each from 768, across the measure (`maswali-week-strip.tsx`). */}
          <div className={cn("flex flex-col gap-2 md:grid md:grid-cols-3 md:gap-3", HUB_STRIP)} data-ghost="strip">
            <div className={PHASE}>
              <span className="h-1.5 w-1.5 shrink-0" />
              <span className="min-w-0 text-body-sm">
                <span className="block font-medium"><GhostWords words={hubSalesLabel} plain="w-[64px]" /></span>
                <span className="block"><span className={RUN}><GhostWords words={hubSalesFrom} plain="w-[64px]" /></span>{" "}<span className={RUN}><GhostWords words={hubSalesTo} plain="w-[108px]" /></span></span>
              </span>
            </div>
            <div className={PHASE}>
              <span className="h-1.5 w-1.5 shrink-0" />
              <span className="min-w-0 text-body-sm">
                <span className="block font-medium"><GhostWords words={hubEventsLabel} plain="w-[64px]" /></span>
                <span className="block"><span className={RUN}><GhostWords words={hubEventsFrom} plain="w-[112px]" /></span>{" "}<span className={RUN}><GhostWords words={hubEventsTo} plain="w-[52px]" /></span></span>
              </span>
            </div>
            <div className={PHASE}>
              <span className="h-1.5 w-1.5 shrink-0" />
              <span className="min-w-0 text-body-sm">
                <span className="block font-medium"><GhostWords words={hubResultsLabel} plain="w-[112px]" /></span>
                <span className="block"><span className={RUN}><GhostWords words={hubResultsFrom} plain="w-[60px]" /></span>{" "}<span className={RUN}><GhostWords words={hubResultsTo} plain="w-[56px]" /></span></span>
              </span>
            </div>
          </div>
          <div className={hubAside(true, true)}>
            <div className={HUB_PINNED}>
              {head}
              {door}
            </div>
            <div className={cn(HUB_LEDGER, SWEEP, hubCell(true, "ledger"))} data-ghost="ledger">
              <div className="flex flex-col gap-1.5">
                {LEDGER.map((r, i) => <LedgerRow key={i} r={r} />)}
              </div>
            </div>
            {/* The reader's own block, last: the count line over one held ticket's row (the kit's raised block — the row's
                serial line over its two rows of sockets, the ten mains at 18px and the five reserves at 14px under them,
                `MaswaliHeldTicketRow` / `MaswaliSealLine` size 18), which the real rows replace in place. No block for a
                guest. Its bars are the raised card's own (`bg-bg-elevated`, as every Millionea drawing's `GhostCard` holds
                `GhostBar`s): the field's bar read as a dark hole on the raised surface, and the socket rows as an empty
                slab (the S5-R2-HUB tile readers). */}
            <div className={cn(HUB_MINE.box, hubCell(true, "mine"), MEMBER)} data-ghost="mine">
              <Line text={HUB_MINE.count} width="w-[208px] max-w-full" sweep />
              <div className={cn("mat-raised flex flex-col gap-1.5 rounded-control p-2", SWEEP)} style={{ minHeight: "var(--h-control-md)" }}>
                <Line text="font-mono text-body-sm font-bold" width="w-[176px] max-w-full bg-bg-elevated" />
                <span className="flex flex-col gap-1.5">
                  <span className="block h-[18px] w-[216px] max-w-full rounded-full bg-bg-elevated" />
                  <span className="block h-[14px] w-[86px] rounded-full bg-bg-elevated" />
                </span>
              </div>
            </div>
          </div>
          <div className={hubMain(true)}>
            <div className={HUB_QUESTIONS.section} data-ghost="questions">
              <span className={cn("block", HUB_QUESTIONS.heading)}><GhostWords words={hubQuestionsHeading} plain="w-[200px]" /></span>
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
