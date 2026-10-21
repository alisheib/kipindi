import type { ReactNode } from "react";
import { I } from "@/components/ui/glyphs";
import { GlyphSwap } from "@/components/ui/glyph-swap";
import { MillioneaGlyph } from "@/components/maswali/maswali-glyph";
import { MaswaliCarry } from "@/components/maswali/maswali-carry";
import { MaswaliUnbrokenLine } from "@/components/maswali/maswali-unbroken-line";
import { reserveLabel } from "@/components/maswali/maswali-format";
import { gradedSet, MAIN_COUNT, RESERVE_COUNT, SLOT_COUNT, slotOf, weekVoidCertain, type GradableQuestion, type GradedSet, type MaswaliPick } from "@/lib/maswali-score";
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
 *   unused    `markPending` · muted, AT REST              — a reserve the week did not need, a socket of a voided week, or
 *                                                           any socket of a ticket that counts for nothing (cancelled, or
 *                                                           refunded with its week): drawn at the disabled opacity
 *                                                           (`.kp-mln-rest`), so it never reads as "awaiting" (S5 VIS P10)
 * A voided main that a reserve stood in for shows the RESERVE's result in its socket, with `standIn` beside its clause;
 * the reserve's own socket becomes the `standIn` mark beside the main's number (the delivery's typed arrow, drawn by the
 * family instead). ⭐ With its numbers drawn (the ticket, How's example), the stood-in main's number is struck and its
 * reserve's label stands under it ("4" over "A1"): the void is seen on the main's own place, and the check above it is
 * the reserve's (S5 VIS P6 — the example once drew main 4 exactly like the other nine, against its own caption).
 *
 * ⛔ ONE GRADER (L9). `sealLineOf` reads `maswali-score.ts` and adds no rule of its own: until the record is final it
 * grades nothing ("no running score" — a sealed main shows matched or missed, a reserve stays "standby" whatever its own
 * event did, MR-17), and the carries, the unused reserves and the Unbroken Line exist only once the CALLER says the week
 * is final (`final`: the week SETTLED). ⛔ NEVER AT THE SETTLEMENT GATE ALONE (the S5 UI review, HIGH 2): a ready gate is
 * still inside MR-16's objection window, where a REVERSE, VOID or REINSTATE can change the graded set — a carry or a
 * line drawn there could be un-drawn, and §M8a item 1 forbids an un-carry ("you won" never before the seal).
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
  /** The voided mains already outnumber the reserves that could still come back usable (MR-18, `weekVoidCertain`): the
   *  week is due to be voided, so no voided main may be told a reserve will take its place (the S5 UI review, MEDIUM 3). */
  voidCertain: boolean;
  /** All ten graded questions matched — the Unbroken Line (M5). Never true before `final`. */
  unbroken: boolean;
};

/**
 * A ticket's line from the week's fifteen questions and the ticket's picks (`picks[slot − 1]`, `canonicalPicks`'s order).
 * `picks` null draws a line with no picks to compare (a public or an inert view): sealed mains read "awaiting" there.
 * `weekVoid` is the ENGINE's verdict (a week voided for integrity, MR-18), which the questions alone may not show.
 * `final` is the CALLER's: true only for a SETTLED week (or a worked example of one). Omitted, the line is PENDING
 * whatever the gate says — the safe default, so a caller that forgets can never draw a carry an objection could undo.
 */
export function sealLineOf(
  questions: readonly GradableQuestion[],
  picks: readonly MaswaliPick[] | null,
  opts: { weekVoid?: boolean; final?: boolean } = {},
): SealLine {
  const outcomeOf = (role: GradableQuestion["role"], ordinal: number) =>
    questions.find((q) => q.role === role && q.ordinal === ordinal)?.outcome ?? null;
  const judged = (slot: number, outcome: "YES" | "NO"): SocketMark => {
    const p = picks?.[slot - 1];
    return p ? (p === outcome ? "matched" : "missed") : "awaiting";
  };
  let set: GradedSet;
  if (opts.weekVoid) set = { kind: "WEEK_VOID" };
  else if (opts.final !== true) set = { kind: "PENDING", needs: [] };
  else {
    try {
      set = questions.length === SLOT_COUNT ? gradedSet(questions) : { kind: "PENDING", needs: [] };
    } catch {
      // A record the grader refuses is never drawn as graded; the console's invariants report it (L9).
      set = { kind: "PENDING", needs: [] };
    }
  }
  let voidCertain = false;
  try { voidCertain = questions.length === SLOT_COUNT && weekVoidCertain(questions); } catch { voidCertain = false; }
  const mains: MainSocket[] = [];
  const annex: AnnexSocket[] = [];
  if (set.kind === "WEEK_VOID") {
    for (let o = 1; o <= MAIN_COUNT; o++) mains.push({ ordinal: o, mark: outcomeOf("MAIN", o) === "VOID" ? "void" : "unused" });
    for (let o = 1; o <= RESERVE_COUNT; o++) annex.push({ ordinal: o, mark: outcomeOf("RESERVE", o) === "VOID" ? "void" : "unused" });
    return { mains, annex, final: true, weekVoid: true, voidCertain: true, unbroken: false };
  }
  if (set.kind === "PENDING") {
    for (let o = 1; o <= MAIN_COUNT; o++) {
      const out = outcomeOf("MAIN", o);
      mains.push({ ordinal: o, mark: out === null ? "awaiting" : out === "VOID" ? "void" : judged(slotOf("MAIN", o), out) });
    }
    for (let o = 1; o <= RESERVE_COUNT; o++) annex.push({ ordinal: o, mark: outcomeOf("RESERVE", o) === "VOID" ? "void" : "standby" });
    return { mains, annex, final: false, weekVoid: false, voidCertain, unbroken: false };
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
  return { mains, annex, final: true, weekVoid: false, voidCertain: false, unbroken: mains.every((m) => m.mark === "matched") };
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
  return <GlyphSwap state={mark} className={cn("max-w-full", socketInk(mark), mark === "unused" && "kp-mln-rest", className)}>{glyph}</GlyphSwap>;
}

/** The sizes the delivery draws (24 on the ticket, 18 on a held row and a ticket card, 14 in a dense list). */
export type SealLineSize = 24 | 18 | 14;
const ANNEX: Record<SealLineSize, number> = { 24: 18, 18: 14, 14: 12 };

/**
 * The line itself. Server-safe; its two moving parts are client islands (`GlyphSwap`, `MaswaliCarry`).
 *  · `size` 24 — the ticket: numbered sockets in fluid columns, the Unbroken Line through the mains.
 *  · `size` 18 / 14 — a held ticket's row on the hub, or a ticket card on Tiketi zangu.
 *  ⭐ ONE RULE FOR THE ANNEX, AT EVERY SIZE AND WIDTH (S5 VIS P16): the five reserves stand on their own row under the
 *    ten mains, as the ticket itself draws them. The hub's row once set them beside the mains (wrapping under them only
 *    where the row ran out), so the same fifteen read as one row on the hub and as two on the card.
 *  · `idBase` names the annex sockets' GLYPH boxes (`${idBase}-a${n}`), the carry's origins — the glyph, never its column
 *    with the label under it, so the token flies at its true scale (S5-DESIGN-REGISTER, the motion critic's M5); give it
 *    when `play.carry` can be asked.
 *  · `play` — the moments, each the composer's call from the seen state: `carry` runs N1 on every stood-in socket
 *    (staggered, capped at four steps), `draw` draws the Unbroken Line on. Omitted, the line is its end frame. `run` is
 *    the caller's replay counter (the carry re-runs on a new count, nothing remounts); `onCarried` is called when the last
 *    carry has landed — or at once when none plays (`MaswaliCarry`'s `onEnd`).
 *  · `inert` — a ticket that counts for nothing (cancelled, or refunded with its voided week): every socket RESTS
 *    (`unused`, at the disabled opacity) and nothing is compared — never the open "awaiting" ring of a live ticket (P10).
 */
export function MaswaliSealLine({ line, size = 24, numbers, idBase, play, inert, className }: {
  line: SealLine;
  size?: SealLineSize;
  numbers?: boolean;
  idBase?: string;
  play?: { carry?: boolean; draw?: boolean; run?: number; onCarried?: () => void };
  inert?: boolean;
  className?: string;
}) {
  const a = ANNEX[size];
  const fluid = size === 24;
  const markOf = (m: SocketMark): SocketMark => (inert ? "unused" : m);
  const carriedOrder = line.mains.filter((m) => m.standIn).map((m) => m.ordinal);
  const lastCarried = carriedOrder[carriedOrder.length - 1];
  // A void main's number is struck in both frames, and — while a reserve may still stand in — keeps the line its reserve's
  // label takes once it does: the number row never changes height when the week becomes final (How to play's example: the
  // tap moved the row). A week voided whole keeps none: no reserve will stand in there.
  const voidCell = (m: MainSocket) => !inert && (!!m.standIn || m.mark === "void");
  const keepLine = !inert && !line.weekVoid && line.mains.some(voidCell);
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
              <MaswaliCarry
                from={`${idBase}-a${m.standIn.slice(1)}`}
                play={play?.carry && line.final}
                run={play?.run}
                index={carriedOrder.indexOf(m.ordinal)}
                onEnd={m.ordinal === lastCarried ? play?.onCarried : undefined}
                className="max-w-full"
              >
                {glyph}
              </MaswaliCarry>
            ) : glyph}
          </span>
        );
      })}
    </span>
  );
  // A voided main's number is struck — the strike in the number's own ink (S5-DESIGN-REGISTER M7: the border ink drew it at
  // ~2.2:1, under §A1's 3:1; the eyebrow's one ink stays the row's, `test:visual-pass-r9c` 3.3) — with its reserve's label
  // under it once one stands in (P6): the void shows on the main's own place. Before a reserve stands in, that second line
  // is kept, empty (`keepLine`).
  const mainNumbers = numbers ? (
    <span aria-hidden className="grid grid-cols-10 gap-1">
      {line.mains.map((m) => (
        <span key={m.ordinal} className="flex flex-col items-center text-center font-mono text-micro uppercase eyebrow text-text-subtle tabular-nums">
          {voidCell(m) ? (
            <>
              <s className="decoration-current">{m.ordinal}</s>
              {(m.standIn || keepLine) && <span className={m.standIn ? undefined : "invisible"}>{m.standIn ?? reserveLabel(1)}</span>}
            </>
          ) : m.ordinal}
        </span>
      ))}
    </span>
  ) : null;
  const annexRow = (
    <span className={cn("grid gap-1", fluid ? "grid-cols-5" : "auto-cols-max grid-flow-col")}>
      {line.annex.map((r) => (
        <span key={r.ordinal} className="flex flex-col items-center gap-0.5">
          {/* The glyph box is the carry's origin (`idBase`): its own size is the token's (MaswaliCarry's scale). */}
          <span id={idBase ? `${idBase}-a${r.ordinal}` : undefined} className="inline-flex">
            {r.carriedTo !== undefined && !inert ? (
              <span className="inline-flex items-center gap-0.5 font-mono text-body-sm leading-none text-text-muted tabular-nums" style={{ height: a }}>
                <MillioneaGlyph name="standIn" s={a <= 14 ? 12 : 14} />
                {r.carriedTo}
              </span>
            ) : (
              <SocketGlyph mark={markOf(r.mark)} s={a} />
            )}
          </span>
          {numbers && <span aria-hidden className="font-mono text-micro uppercase eyebrow text-text-subtle">{reserveLabel(r.ordinal)}</span>}
        </span>
      ))}
    </span>
  );
  return (
    <div aria-hidden className={cn("flex flex-col gap-1.5", className)}>
      <span className="flex flex-col gap-0.5">
        {mainsRow}
        {mainNumbers}
      </span>
      {annexRow}
    </div>
  );
}
