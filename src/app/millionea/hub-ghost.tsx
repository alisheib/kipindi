"use client";

import type { ReactNode } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { PAGE_HEADER_PILL, PageHeader } from "@/components/ui/page-header";
import { ReceiptRow } from "@/components/ui/receipt-row";
import { RoutePick } from "@/components/ui/route-pick";
import { I } from "@/components/ui/glyphs";
import { GhostBar, GhostLine } from "@/components/maswali/maswali-ghost";
import { MillioneaGlyph } from "@/components/maswali/maswali-glyph";
import { useT } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n-dict";
import { cn } from "@/lib/utils";
import { HUB_DOOR, HUB_EYEBROW, HUB_GRID, HUB_LEDGER, HUB_MINE, HUB_PINNED, HUB_POOL_HEAD, HUB_QUESTIONS, HUB_STRIP, hubAside, hubCell, hubMain } from "./hub-frame";
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
/** `carry`: the ledger's carried-in row (S5-R2-HUB 7, against REGISTER's row as tall as its line): its label shrinks
 *  beside its figure and breaks its own words — "Carried in from" / "Week 48 ›" below 360 in English. */
const WRAPS: Record<Locale, { subtitle: Wrap; rule: Wrap; floor: Wrap; carry: Wrap }> = {
  sw: { subtitle: [2, 2, 1], rule: [3, 2, 2], floor: [2, 2, 2], carry: [1, 1, 1] },
  en: { subtitle: [3, 2, 1], rule: [2, 2, 2], floor: [1, 1, 1], carry: [2, 1, 1] },
  zh: { subtitle: [2, 2, 1], rule: [2, 1, 1], floor: [1, 1, 1], carry: [1, 1, 1] },
};
/** Each line's place in each band: drawn where the band has that many lines, gone where it has fewer — and the band's last
 *  line at each width drawn short, as a sentence's last line is (a one-line subtitle at 1280 was a bar across the whole
 *  measure). Literal classes, so the stylesheet holds every one. */
const SHOWN = { narrow: ["hidden", "block"], phone: ["xs:hidden", "xs:block"], wide: ["md:hidden", "md:block"] } as const;
const SHORT = { narrow: ["w-full", "w-[62%]"], phone: ["xs:w-full", "xs:w-[62%]"], wide: ["md:w-full", "md:w-[62%]"] } as const;
function shownIn(i: number, n: Wrap): string {
  return cn(SHOWN.narrow[i < n[0] ? 1 : 0], SHOWN.phone[i < n[1] ? 1 : 0], SHOWN.wide[i < n[2] ? 1 : 0]);
}
function lengthIn(i: number, n: Wrap): string {
  return cn(SHORT.narrow[i === n[0] - 1 ? 1 : 0], SHORT.phone[i === n[1] - 1 ? 1 : 0], SHORT.wide[i === n[2] - 1 ? 1 : 0]);
}

/**
 * THE HEAD'S TWO DOORS (How to play; the reader's tickets) as the page's pills set their labels — the numerals' mono at the
 * caption rung, 11px tracked 0.2px (`PAGE_HEADER_PILL`) — each label's length in the face's own units: a Latin character
 * one `ch` of the monospaced face, an ideograph one `em`. Numbers, never words (a drawing reads no Millionea word,
 * `test:maswali-ui` 1.3); `test:maswali-hub` 19.3 holds each to the dictionary's own label, and the drive measures each pill
 * against the page's. Each pill's glyph is the page's own, unpainted, so its box is the page's box. (The pills were bars of
 * one width in every language: on landing the second jumped 31px at sw 360.)
 */
type Label = readonly [latin: number, ideographs: number];
export const DOOR_LABELS: Record<Locale, readonly [how: Label, tickets: Label]> = {
  sw: [[16, 0], [11, 0]],
  en: [[11, 0], [12, 0]],
  zh: [[0, 4], [0, 4]],
};
const labelWidth = ([latin, wide]: Label) => `calc(${latin}ch + ${wide}em + ${((latin + wide) * 0.2).toFixed(1)}px)`;

/**
 * THE STRIP'S RANGES as the page sets them (`maswali-week-strip.tsx`): each its two kept runs — "Jumatatu –" and
 * "Ijumaa 18:00 EAT" — with the one space between them where the line may break, so a range wraps in the drawing exactly
 * where the page's does. The week's template in each language, each run's width (bars, never words); the drive prints the
 * page's runs (INFO L7 … ranges) and holds the strip's band to them.
 * ⚠️ RE-MEASURED (S5-R2-HUB 7) on the drive's runner, which sets text as a phone's Chrome does: the template opens at
 * midnight (the config's `openAt` "00:00"), and a range opening at midnight says its weekday alone ("Jumatatu –", `eatRange`).
 * The table had been measured on a week the dev seed opened a minute late ("Jumatatu 00:01 –", 41px wider): at sw 768 the
 * drawing's sales range took two lines where the page's takes one, and the strip stood 18px taller than the page's.
 */
const RANGES: Record<Locale, readonly (readonly [string, string])[]> = {
  sw: [["w-[68.5px]", "w-[112.2px]"], ["w-[117.2px]", "w-[50.6px]"], ["w-[61.5px]", "w-[57.7px]"]],
  en: [["w-[60.6px]", "w-[109.2px]"], ["w-[110.2px]", "w-[46.7px]"], ["w-[57.6px]", "w-[53.7px]"]],
  zh: [["w-[36.8px]", "w-[97.4px]"], ["w-[80.5px]", "w-[25.9px]"], ["w-[36.8px]", "w-[25.9px]"]],
};

/**
 * THE HEAD'S EYEBROW AS THE PAGE SETS IT (G2, S5-R2-HUB 7; the tile readers: on landing the state's chip jumped ~23px left
 * in zh and 4–6px in en/sw — the word was one 56px bar and the chip one 72px pill in every language). In the frame's row
 * (`HUB_EYEBROW`, the page's `WeekLabel`'s): the week's word ("WIKI 49" / "WEEK 49" / "第49周", `weekWord` of a two-digit
 * week) as a bar of its width, then the week's chip as every Millionea drawing draws the register's chip — a `GhostBar`
 * pill of the chip's 23px — as wide as the page's chip for a week on sale ("Wazi" / "Open" / "开放"). Each width measured
 * on the page by `qa:maswali-hub-states` (INFO L7 … eyebrow); `test:maswali-hub` 19.5 holds each to the dictionary's word
 * in the eyebrow's and the chip's own type. Numbers, never words.
 */
export const EYEBROW: Record<Locale, { word: string; chip: string }> = {
  sw: { word: "w-[59.8px]", chip: "w-[51.6px]" },
  en: { word: "w-[59.8px]", chip: "w-[55.6px]" },
  zh: { word: "w-[38px]", chip: "w-[43.3px]" },
};
/** The questions' heading of a week on sale ("Maswali ya wiki", "This week's questions", "本周题目") as wide as its words,
 *  measured on the page (INFO L7 … heading); `test:maswali-hub` 19.6 holds each to its words in the display face. It was
 *  one English bar (200px) in every language: ~60px past the Swahili, ~130px past the Chinese. */
export const QUESTIONS_HEADING: Record<Locale, string> = { sw: "w-[139.6px]", en: "w-[197.5px]", zh: "w-[70.6px]" };

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
        <Line key={i} width={lengthIn(i, n)} className={shownIn(i, n)} sweep={sweep} />
      ))}
    </span>
  );
}

/** The ledger's rows as the one Millionea ledger draws a selling week's (`millioneaLedgerRows` → `MaswaliLedger`): the
 *  carry it received (a door to its week: the row is the link, as tall as its line — REGISTER's S5-R2 row, its tap target
 *  out of flow, `.kp-mln-hit`; it stood on the 44px control floor and the drawing's ledger 24px taller than the page's),
 *  the sales over their note, the pool so far under its hairline, then the floor, the jackpot and the fee — every row the
 *  list's one gap apart (the ledger's one rhythm, REGISTER's S5-R2 27: a total is set apart by its hairline alone, no
 *  step of space after it). */
type GhostRow = { link?: boolean; note?: boolean; total?: boolean; floor?: boolean; muted?: boolean };
const LEDGER: GhostRow[] = [{ link: true }, { note: true }, { total: true }, { floor: true }, {}, { muted: true }];

/** One ledger row in the kit's own row (`ReceiptRow`, its sentence label), so its line boxes are the page's. */
function LedgerRow({ r, floorLines, carryLines }: { r: GhostRow; floorLines: Wrap; carryLines: Wrap }) {
  const wraps = r.floor ? floorLines : r.link ? carryLines : null;
  const row = (
    <ReceiptRow
      labelStyle="sentence"
      label={wraps ? <Lines n={wraps} text="" className="w-[150px] max-w-full" /> : <GhostLine className="w-[112px]" />}
      value={<GhostLine className="w-[84px]" />}
      emphasis={r.total ? "total" : r.muted ? "muted" : undefined}
      divider={r.total}
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
  const doors = DOOR_LABELS[locale];
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
    // The page root's own class (`kp-mln-zh`, page.tsx): Chinese eyebrows at the label rung, 12/16 (globals.css A3) — the
    // jackpot's label among them, which stood 2px short in zh.
    <PageContainer tier="reading" className="kp-mln-zh">
      {/* `data-ghost-page`: which page's drawing this is — the one marker the hop drive reads (qa:millionea-ghost-hops). */}
      <div className="flex flex-col gap-6" aria-busy="true" data-ghost-page="hub">
        <div aria-hidden>
          <PageHeader
            eyebrow={(
              // The week and its state in the frame's row (`EYEBROW`, G2): the word's bar in its own line box, then the
              // register's chip (`WeekStateChip`, 23px tall) as every Millionea drawing draws it.
              <span className={HUB_EYEBROW}>
                <span className="shrink-0"><GhostLine className={cn(EYEBROW[locale].word, SWEEP)} /></span>
                <GhostBar className={cn("h-[23px] shrink-0 self-start rounded-pill", EYEBROW[locale].chip)} />
              </span>
            )}
            title={<GhostLine className={cn("w-[248px]", SWEEP)} />}
            subtitle={<Lines n={wraps.subtitle} text="" sweep />}
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
          {/* The strip: three phases, each a dot's place and the strip's own type — its label over its range, the range
              its two runs with the space between them (`RANGES`), so it wraps where the page's does — a column each from
              768, across the measure (`maswali-week-strip.tsx`). */}
          <div className={cn("flex flex-col gap-2 md:grid md:grid-cols-3 md:gap-3", HUB_STRIP)} data-ghost="strip">
            {RANGES[locale].map(([from, to], i) => (
              <div key={i} className="flex items-baseline gap-2 md:border-t-2 md:border-border-strong md:pt-1.5">
                <span className="h-1.5 w-1.5 shrink-0" />
                <span className="min-w-0 text-body-sm">
                  <Line width="w-[96px] max-w-full" sweep />
                  <span className="block"><GhostLine className={cn(from, SWEEP)} />{" "}<GhostLine className={cn(to, SWEEP)} /></span>
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
                {LEDGER.map((r, i) => <LedgerRow key={i} r={r} floorLines={wraps.floor} carryLines={wraps.carry} />)}
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
              <Line text={HUB_QUESTIONS.heading} width={QUESTIONS_HEADING[locale]} sweep />
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
