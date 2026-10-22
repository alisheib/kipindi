/**
 * THE HUB'S FRAME — WRITTEN ONCE, FOR THE PAGE AND FOR ITS LOADING DRAWING (MASWALI-BUILD S5-R2-HUB; the lead's round-2
 * ruling on R1-hub's loading row: the drawing is the hub's invariant frame, so the swap to the page moves nothing in the
 * common states — a reader holding no ticket, one, or many).
 *
 * Every place the page stands a band in — its grid, the strip across it, the buy column (two-up from 768, its head and
 * door pinned from 1024), the cell of each block in that column, the questions' column and each cell of a question's row,
 * the tail under them — is written here, and `page.tsx` and `hub-ghost.tsx` both compose it: the drawing follows the
 * page by construction, the platform's rule for a skeleton and the thing it stands for (globals.css "MARKET-CARD RHYTHM":
 * "the skeleton follows the card by construction rather than by memory"). A second copy drifted: the drawing's column
 * lacked the page's `lg:items-stretch` and drew its blocks ~250px wide in the 360px column, and its question rows stood
 * 53px apart against the page's 60.
 *
 * ⭐ THE READER'S OWN BLOCK STANDS LAST IN THE BUY COLUMN (`HUB_CELL.mine`, after the pool's ledger): the one band whose
 * height is the reader's — no ticket, one, three and "See all" — so nothing the page draws above it, or beside it, moves
 * with it. It stood between the door and the ledger, and the ledger landed 135–170px below its drawing whenever the
 * reader held a ticket (round 1's honest 9). The v6 delivery stands it there too (U-hub-open-floor-360 and -1280: the
 * pool, the door, then "Tiketi zako wiki hii").
 * Plain strings and pure helpers, no directive: the server page and the client drawing read them alike.
 */
import { cn } from "@/lib/utils";

/**
 * ⭐ A NUMERAL NEVER GROWS ITS LINE (S5-R2-HUB, the swap measured). A line of the body's words holding a numeral in the
 * numerals' mono (`.mono`, `.amount`, §T5) stood a pixel taller than a line without one: the mono face's ascent and
 * descent sit differently on the line, and the line box grew to hold both. So the page landed below its drawing by a pixel
 * a line — the strip's two timed ranges +2, the jackpot's rule +2, the ledger's note +1, each question row +1 (15px by the
 * fifteenth). The platform's own recipe for a mono run inside another face's line (globals.css `.kp-cjk-gap`: "its line
 * height is 0, so the line box cannot grow"): every frame line that can hold a numeral sets its numerals' line height to
 * 0, so each line is its rung's own line box, numeral or none — the box the drawing's bar fills. The glyphs stand where
 * they stood. (Inline numerals only: every line below holds its figures inline, never as a block.)
 */
const NUMERALS = "[&_.mono]:leading-[0] [&_.amount]:leading-[0]";

/** The head's eyebrow row: the week's word, then its state chip (`WeekStateChip`), wrapping the chip under the word where
 *  the two do not fit — the page's `WeekLabel` and the drawing's eyebrow both stand in it (G2, S5-R2-HUB 7). */
export const HUB_EYEBROW = "inline-flex flex-wrap items-center gap-x-2 gap-y-1";

/** The page's grid: one column, two from 1024 — the reading column and the 360px buy column (the market page's). */
export const HUB_GRID = "grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]";

/** The week strip, across the measure (S5 VIS P4: each of its three ranges a third of it); its clocks never grow a line. */
export const HUB_STRIP = `lg:col-span-2 ${NUMERALS}`;

/**
 * The buy column. A grid to 1023 — one column on a phone, two from 768 when the week has a pool (`twoUp`: its head beside
 * the door, its ledger beside the reader's block, M1) — and from 1024 a flex column in the grid's second track, its blocks
 * stretched to the track (`items-start` would shrink each to its content's width there), under the strip when there is one.
 */
export function hubAside(twoUp: boolean, strip: boolean): string {
  return cn(
    "grid grid-cols-1 items-start gap-4 lg:col-start-2 lg:row-span-2 lg:flex lg:flex-col lg:items-stretch lg:gap-4 lg:self-stretch",
    twoUp && "md:grid-cols-2 md:gap-x-6",
    strip ? "lg:row-start-2" : "lg:row-start-1",
  );
}

/**
 * The head and the door, pinned from 1024 at the header's foot (the market page's offset: the 56px header + 16px), with
 * the page's own ground above the head (`pt-3`, given back by `-mt-3` at rest), so what reads on in the column passes
 * under the pair and never shows in the gap above it (H2). Below 1024 the wrapper is `contents`: its two blocks are the
 * column's own cells.
 * ⭐ S5-R2-HUB · THE PAIR'S FOOT FADES (`kp-mln-pinned`, globals.css; the tile readers: mid-scroll the ledger slid out from
 * under the pair cut flat — a box with no top). The pair's ground runs on past its door by the column's own gap (`pb-4`,
 * 20px in this scale) and fades there to nothing, so what passes under it leaves through a soft edge; that foot is given
 * back at rest (`-mb-4`), so the block under the pair stands the column's own gap below it — it stood 36px (`pb-3`'s 16
 * and the gap's 20), the one uneven gap of the column.
 */
export const HUB_PINNED = "contents lg:sticky lg:top-[56px] lg:z-10 lg:-mt-3 lg:-mb-4 lg:flex lg:flex-col lg:gap-3 lg:pb-4 lg:pt-3 kp-mln-pinned";

/** Each block's cell in the two-up grid from 768 to 1023 (nothing below 768, where the column is one track, nor from 1024,
 *  where it is a flex column): the head and the door side by side, the door centred on the head; under them the ledger
 *  beside the reader's block, and the week being graded under the reader's block.
 *  ⭐ S5-R2-HUB · NO CELL STANDS EMPTY (the tile readers at 768): with no door beside it — sales paused, nothing to buy or
 *  follow — the head runs both columns (`headAlone`; a 350×170px hole stood beside it), and with no block of the reader's
 *  the graded week takes that block's cell, level with the ledger (it hung a row lower, under an empty one). */
const CELLS = {
  head: "md:col-start-1 md:row-start-1",
  headAlone: "md:col-span-2 md:row-start-1",
  door: "md:col-start-2 md:row-start-1 md:self-center lg:self-auto",
  ledger: "md:col-start-1 md:row-start-2 md:row-span-2",
  mine: "md:col-start-2 md:row-start-2",
  grading: "md:col-start-2 md:row-start-3",
} as const;
export type HubCell = keyof typeof CELLS;
/** A block's cell — only while the column is two-up (a week with a pool); a one-track column places nothing. */
export function hubCell(twoUp: boolean, cell: HubCell): string | undefined {
  return twoUp ? CELLS[cell] : undefined;
}

/** The reading column from 1024 (the questions and the week's fingerprints), under the strip when there is one. */
export function hubMain(strip: boolean): string {
  return cn("flex flex-col gap-6 lg:col-start-1", strip ? "lg:row-start-2" : "lg:row-start-1");
}
/** The column's tail (last week and the reading links), under the questions. */
export function hubTail(strip: boolean): string {
  return cn("flex flex-col gap-4 lg:col-start-1", strip ? "lg:row-start-3" : "lg:row-start-2");
}

/** The jackpot's head (`MaswaliPoolHead`), in the card's order (§M8a item 26): its box, its label, the figure, then —
 *  while an earlier week's carry is pending — the line that says so (item 9), then its rule, the final week's led by its
 *  mark. Each fact line of the rule balances
 *  a fact that wraps inside itself (`[&>.kp-mln-fact]:text-balance`): at 320 Swahili's first fact broke greedily and
 *  stranded its kept run alone ("Inagawanywa sawa kwa kila tiketi" / "ya 10/10"); a fact that fits its line is untouched. */
export const HUB_POOL_HEAD = {
  box: "mat-flat flex flex-col gap-1 rounded-card p-3",
  label: "font-mono text-micro uppercase eyebrow text-text-subtle",
  figure: "font-mono text-title-sm font-semibold text-text tabular-nums xs:text-title-md",
  rule: `text-body-sm text-text-muted ${NUMERALS}`,
  finalRule: `flex items-baseline gap-1.5 text-body-sm text-text-muted ${NUMERALS}`,
  facts: "[&>.kp-mln-fact]:text-balance",
  carry: `text-body-sm text-text-muted text-pretty ${NUMERALS}`,
} as const;

/** The buy block: the door, then its one status line — the close beside a door that buys (and the closing pill in its
 *  row), or how far a closed week's results have come. */
export const HUB_DOOR = {
  box: "flex flex-col gap-3",
  close: "kp-mln-close flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1",
  closeLine: "flex items-center gap-1.5 text-body-sm text-text-muted",
} as const;

/** The pool's ledger box (the one Millionea ledger inside it, `maswali-ledger.tsx`): its figures never grow a line. */
export const HUB_LEDGER = `mat-flat rounded-card p-3 ${NUMERALS}`;

/** The reader's block: the count line, then a row per held ticket (at most three) and "See all". */
export const HUB_MINE = { box: "flex flex-col gap-2", count: `text-body-sm text-text-muted ${NUMERALS}` } as const;

/** The fifteen questions: the section, its heading, and each row's cells — the page's words or the drawing's bars in the
 *  same boxes, so a row is the same height in both. From 768 a table row (number, category, words, then the event's time
 *  over the result stamp's holder, which is always drawn, M1/M12); a phone keeps the stacked row. */
export const HUB_QUESTIONS = {
  section: "flex scroll-mt-[96px] flex-col",
  heading: "pb-2 font-display text-title-sm font-bold text-text",
  row: "grid grid-cols-[32px_minmax(0,1fr)] gap-x-2 gap-y-1 border-t border-border py-3 md:grid-cols-[32px_104px_minmax(0,1fr)_auto] md:items-baseline",
  number: "font-mono text-body-sm font-bold tabular-nums",
  category: "col-start-2 font-mono text-micro uppercase eyebrow text-text-subtle md:col-start-auto",
  words: "col-start-2 flex min-w-0 flex-col gap-1 md:col-start-auto",
  text: "text-body-sm text-pretty",
  when: "col-start-2 flex flex-wrap items-center gap-2 md:col-start-auto md:flex-col md:items-end md:gap-1.5",
  time: `whitespace-nowrap text-body-sm text-text-subtle ${NUMERALS}`,
  /** The result stamp's holder: drawn before any result, so an arrival finds it measured (`hub-stamp.tsx`). */
  stamp: "inline-flex",
} as const;
