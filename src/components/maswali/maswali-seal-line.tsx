import type { ReactNode } from "react";
import { I } from "@/components/ui/glyphs";
import { GlyphSwap } from "@/components/ui/glyph-swap";
import { MillioneaGlyph } from "@/components/maswali/maswali-glyph";
import { MaswaliCarry } from "@/components/maswali/maswali-carry";
import { MaswaliUnbrokenLine } from "@/components/maswali/maswali-unbroken-line";
import { reserveLabel } from "@/components/maswali/maswali-format";
import { gradedSet, MAIN_COUNT, RESERVE_COUNT, SLOT_COUNT, slotOf, type GradableQuestion, type GradedSet, type MaswaliPick } from "@/lib/maswali-score";
import { cn } from "@/lib/utils";
import type { Dict } from "@/lib/i18n-dict";

/**
 * THE SEAL LINE — a ticket's ten sockets and its five-socket annex (MASWALI-BUILD S5; MASWALI-PLAN §10 §1 "the
 * instrument", the socket grammar; DESIGN_AUTHORITY §M8a item 12; §10c's icons).
 *
 * ⭐ THE SOCKET GRAMMAR, as built (Phosphor, through `I`; a word goes with every mark on the clauses, so colour and shape
 * are never the only signal):
 *   awaiting  `markPending` (an open ring) · muted        — the event has not been sealed: "not known yet", never "wrong"
 *   matched   `checkCircle` · success ink                 — the pick matched the sealed result (never the YES green)
 *   missed    `xCircle` · muted                           — it did not (never rose: a miss is not a failure, §C4)
 *   void      `void` · muted                              — the question voided; a main's reserve stands in for it
 *   standby   `markPending` at annex size · muted         — a reserve standing by: it counts only if a main voids
 *   unused    `markPending` · muted                       — a reserve the week did not need, or a socket of a voided week
 * A voided main that a reserve stood in for shows the RESERVE's result in its socket, with `standIn` beside its clause;
 * the reserve's own socket becomes the `standIn` mark beside the main's number (the delivery's typed arrow, drawn by the
 * family instead).
 *
 * ⛔ ONE GRADER (L9). `sealLineOf` reads `maswali-score.ts` and adds no rule of its own: until the record is final it
 * grades nothing ("no running score" — a sealed main shows matched or missed, a reserve stays "standby" whatever its own
 * event did, MR-17), and the carries, the unused reserves and the Unbroken Line exist only once `gradedSet` is final.
 */

export type SocketMark = "awaiting" | "matched" | "missed" | "void" | "standby" | "unused";
export type MainSocket = { ordinal: number; mark: SocketMark; /** the reserve that stood in for this voided main ("A1") */ standIn?: string };
export type AnnexSocket = { ordinal: number; mark: SocketMark; /** the main this reserve carried into */ carriedTo?: number };
export type SealLine = {
  mains: MainSocket[];
  annex: AnnexSocket[];
  /** The graded set is final: carries may play, unused reserves close, the line may be unbroken. */
  final: boolean;
  /** The week voided whole (MR-18): every socket rests and nothing is counted. */
  weekVoid: boolean;
  /** All ten graded questions matched — the Unbroken Line (M5). Never true before `final`. */
  unbroken: boolean;
};

/**
 * A ticket's line from the week's fifteen questions and the ticket's picks (`picks[slot − 1]`, `canonicalPicks`'s order).
 * `picks` null draws a line with no picks to compare (a public or an inert view): sealed mains read "awaiting" there.
 * `weekVoid` is the ENGINE's verdict (a week voided for integrity, MR-18), which the questions alone may not show.
 */
export function sealLineOf(
  questions: readonly GradableQuestion[],
  picks: readonly MaswaliPick[] | null,
  opts: { weekVoid?: boolean } = {},
): SealLine {
  const outcomeOf = (role: GradableQuestion["role"], ordinal: number) =>
    questions.find((q) => q.role === role && q.ordinal === ordinal)?.outcome ?? null;
  const judged = (slot: number, outcome: "YES" | "NO"): SocketMark => {
    const p = picks?.[slot - 1];
    return p ? (p === outcome ? "matched" : "missed") : "awaiting";
  };
  let set: GradedSet;
  if (opts.weekVoid) set = { kind: "WEEK_VOID" };
  else {
    try {
      set = questions.length === SLOT_COUNT ? gradedSet(questions) : { kind: "PENDING", needs: [] };
    } catch {
      // A record the grader refuses is never drawn as graded; the console's invariants report it (L9).
      set = { kind: "PENDING", needs: [] };
    }
  }
  const mains: MainSocket[] = [];
  const annex: AnnexSocket[] = [];
  if (set.kind === "WEEK_VOID") {
    for (let o = 1; o <= MAIN_COUNT; o++) mains.push({ ordinal: o, mark: outcomeOf("MAIN", o) === "VOID" ? "void" : "unused" });
    for (let o = 1; o <= RESERVE_COUNT; o++) annex.push({ ordinal: o, mark: outcomeOf("RESERVE", o) === "VOID" ? "void" : "unused" });
    return { mains, annex, final: true, weekVoid: true, unbroken: false };
  }
  if (set.kind === "PENDING") {
    for (let o = 1; o <= MAIN_COUNT; o++) {
      const out = outcomeOf("MAIN", o);
      mains.push({ ordinal: o, mark: out === null ? "awaiting" : out === "VOID" ? "void" : judged(slotOf("MAIN", o), out) });
    }
    for (let o = 1; o <= RESERVE_COUNT; o++) annex.push({ ordinal: o, mark: outcomeOf("RESERVE", o) === "VOID" ? "void" : "standby" });
    return { mains, annex, final: false, weekVoid: false, unbroken: false };
  }
  // Final: the graded set and its pairs (display only; the k-th voided main took the k-th usable reserve).
  const byMain = new Map(set.pairs.map((p) => [p.main, p.reserve]));
  const byReserve = new Map(set.pairs.map((p) => [p.reserve, p.main]));
  for (let o = 1; o <= MAIN_COUNT; o++) {
    const out = outcomeOf("MAIN", o);
    const rSlot = byMain.get(o);
    if (rSlot !== undefined) {
      const rOut = outcomeOf("RESERVE", rSlot - MAIN_COUNT);
      mains.push({ ordinal: o, mark: rOut === "YES" || rOut === "NO" ? judged(rSlot, rOut) : "awaiting", standIn: reserveLabel(rSlot - MAIN_COUNT) });
    } else {
      mains.push({ ordinal: o, mark: out === "YES" || out === "NO" ? judged(o, out) : "awaiting" });
    }
  }
  for (let o = 1; o <= RESERVE_COUNT; o++) {
    const slot = slotOf("RESERVE", o);
    const out = outcomeOf("RESERVE", o);
    const into = byReserve.get(slot);
    if (out === "VOID") annex.push({ ordinal: o, mark: "void" });
    else if (into !== undefined && (out === "YES" || out === "NO")) annex.push({ ordinal: o, mark: judged(slot, out), carriedTo: into });
    else annex.push({ ordinal: o, mark: "unused" });
  }
  return { mains, annex, final: true, weekVoid: false, unbroken: mains.every((m) => m.mark === "matched") };
}

/** The word a mark says (the clause rows, the loss receipt). */
export function socketWord(t: Dict, mark: SocketMark): string {
  switch (mark) {
    case "awaiting": return t.millionea.awaiting;
    case "matched": return t.millionea.matched;
    case "missed": return t.millionea.noMatch;
    case "void": return t.millionea.void;
    case "standby": return t.millionea.standby;
    case "unused": return t.millionea.notUsed;
  }
}

/** The ink a mark wears. ⛔ Success green for a match only; everything else is muted — never the betting pair, never rose. */
export function socketInk(mark: SocketMark): string {
  return mark === "matched" ? "text-success-fg" : "text-text-muted";
}

/**
 * One mark at one size. ⭐ It swaps by `GlyphSwap` when its mark changes while it is on screen (M3: a result lands, the
 * socket morphs once); the first render is an arrival, so it renders still. `fluid` lets a 24px mark shrink inside a
 * narrow column (a ten-socket line at 320px leaves 22px a column), keeping its square.
 */
export function SocketGlyph({ mark, s, fluid, className }: { mark: SocketMark; s: number; fluid?: boolean; className?: string }) {
  const fit = fluid ? "max-w-full h-auto" : undefined;
  let glyph: ReactNode;
  switch (mark) {
    case "matched": glyph = <I.checkCircle s={s} className={fit} />; break;
    case "missed": glyph = <I.xCircle s={s} className={fit} />; break;
    case "void": glyph = <I.void s={s} className={fit} />; break;
    default: glyph = <MillioneaGlyph name="markPending" s={s} className={fit} />;
  }
  return <GlyphSwap state={mark} className={cn("max-w-full", socketInk(mark), className)}>{glyph}</GlyphSwap>;
}

/** The sizes the delivery draws (24 on the ticket, 18 on a held row and a ticket card, 14 in a dense list). */
export type SealLineSize = 24 | 18 | 14;
const ANNEX: Record<SealLineSize, number> = { 24: 18, 18: 14, 14: 12 };

/**
 * The line itself. Server-safe; its two moving parts are client islands (`GlyphSwap`, `MaswaliCarry`).
 *  · `size` 24 — the ticket: numbered sockets in fluid columns, the annex below, the Unbroken Line through the mains.
 *  · `size` 18 / 14 — a held ticket's row (`annex="beside"`, which wraps under the mains when the row is narrow) or a
 *    ticket card (`annex="below"`).
 *  · `idBase` names the annex sockets (`${idBase}-a${n}`), the carry's origins; give it when `play.carry` can be asked.
 *  · `play` — the moments, each the composer's call from the seen state: `carry` runs N1 on every stood-in socket
 *    (staggered, capped at four steps), `draw` draws the Unbroken Line on. Omitted, the line is its end frame.
 *  · `inert` — a cancelled ticket's line: every socket rests as an open ring and nothing is compared.
 */
export function MaswaliSealLine({ line, size = 24, annex = "below", numbers, idBase, play, inert, className }: {
  line: SealLine;
  size?: SealLineSize;
  annex?: "below" | "beside";
  numbers?: boolean;
  idBase?: string;
  play?: { carry?: boolean; draw?: boolean };
  inert?: boolean;
  className?: string;
}) {
  const a = ANNEX[size];
  const fluid = size === 24;
  const markOf = (m: SocketMark): SocketMark => (inert ? "awaiting" : m);
  const carriedOrder = line.mains.filter((m) => m.standIn).map((m) => m.ordinal);
  const mainsRow = (
    <span className={cn("relative grid gap-1", fluid ? "grid-cols-10" : "auto-cols-max grid-flow-col")}>
      {line.final && line.unbroken && !inert && fluid && (
        <MaswaliUnbrokenLine
          draw={play?.draw}
          className="top-1/2 -translate-y-1/2"
          // Through the socket centres: half a column in from each edge (ten columns, nine `--sp-1` gaps).
          style={{ left: "calc((100% - 9 * var(--sp-1)) / 20)", right: "calc((100% - 9 * var(--sp-1)) / 20)" }}
        />
      )}
      {line.mains.map((m) => {
        const glyph = <SocketGlyph mark={markOf(m.mark)} s={size} fluid={fluid} />;
        // `relative`: each socket paints after the line laid through them, so the marks sit over it.
        return (
          <span key={m.ordinal} className="relative flex justify-center">
            {m.standIn && idBase && !inert ? (
              <MaswaliCarry from={`${idBase}-a${m.standIn.slice(1)}`} play={play?.carry && line.final} index={carriedOrder.indexOf(m.ordinal)} className="max-w-full">
                {glyph}
              </MaswaliCarry>
            ) : glyph}
          </span>
        );
      })}
    </span>
  );
  const mainNumbers = numbers ? (
    <span aria-hidden className="grid grid-cols-10 gap-1">
      {line.mains.map((m) => (
        <span key={m.ordinal} className="text-center font-mono text-micro uppercase eyebrow text-text-subtle tabular-nums">{m.ordinal}</span>
      ))}
    </span>
  ) : null;
  const annexRow = (
    <span className={cn("grid gap-1", fluid ? "grid-cols-5" : "auto-cols-max grid-flow-col")}>
      {line.annex.map((r) => (
        <span key={r.ordinal} id={idBase ? `${idBase}-a${r.ordinal}` : undefined} className="flex flex-col items-center gap-0.5">
          {r.carriedTo !== undefined && !inert ? (
            <span className="inline-flex items-center gap-0.5 font-mono text-body-sm text-text-muted tabular-nums" style={{ height: a }}>
              <MillioneaGlyph name="standIn" s={a <= 14 ? 12 : 14} />
              {r.carriedTo}
            </span>
          ) : (
            <SocketGlyph mark={markOf(r.mark)} s={a} />
          )}
          {numbers && <span aria-hidden className="font-mono text-micro uppercase eyebrow text-text-subtle">{reserveLabel(r.ordinal)}</span>}
        </span>
      ))}
    </span>
  );
  return (
    <div
      aria-hidden
      className={cn(
        annex === "beside" ? "flex flex-wrap items-center gap-x-2 gap-y-1.5" : "flex flex-col gap-1.5",
        className,
      )}
    >
      <span className="flex flex-col gap-0.5">
        {mainsRow}
        {mainNumbers}
      </span>
      {annexRow}
    </div>
  );
}
