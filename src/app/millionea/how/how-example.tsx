"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MaswaliSealLine, type SealLine } from "@/components/maswali/maswali-seal-line";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * M9 · THE EXAMPLE (MASWALI-PLAN §10 §4 M9; the U-how frames; SM9): a Seal Line — main 4 voided, reserve A1 standing by —
 * and the reader's own tap shows the swap: N1 once (`.maswali-carry`). It is the only demo in the product: ⛔ it never
 * auto-plays and keeps no seen key.
 * ⭐ S5-DESIGN-REGISTER (2026-10-21, Ali's 10/10 pass — the register critic's M7 and L10, the motion critic's M5):
 *   · THE BEFORE FRAME FIRST. The page opens on the week as it stood before the swap — nine matched mains, main 4 VOID (its
 *     number struck), A1 to A5 standing by — so the tap MOVES something, and teaches with the motion or without it: the
 *     tap draws the after frame (main 4 counts A1's result, A1's socket says "↪4", A2–A5 rest, the Unbroken Line), and
 *     N1 carries A1's token into main 4 — under either clamp the same frames swap in place (N1's ruled fallback, §M8a 1).
 *   · THE LINE NEVER BLANKS: no remount — the carry replays on a run counter (`MaswaliCarry`'s `run`).
 *   · "ENDED" ONLY WHEN IT IS TRUE: the label turns to "Replay" and the status says "Example ended" when the token has
 *     landed (the carry's own end, at once under a clamp) — and the Unbroken Line draws on then, never under a token still
 *     in flight. The button keeps one width for both labels, so nothing beside it moves.
 *   · The button is the kit's own (no override), its label short enough for one line at 320 in every language (L10).
 */
export function HowExample({ before, after, caption }: {
  /** The line before the swap: the graded set not final, main 4 VOID, the reserves standing by. */
  before: SealLine;
  /** The line after it: main 4 counting A1, A1 carried, A2–A5 unused. */
  after: SealLine;
  caption: string;
}) {
  const { t } = useT();
  const [run, setRun] = useState(0);
  const [landed, setLanded] = useState(0);
  const ended = run > 0 && landed === run;
  // Until the token lands the after frame keeps its Unbroken Line back; it draws on as the token lands.
  const line = run === 0 ? before : ended ? after : { ...after, unbroken: false };
  const label = landed > 0 ? t.millionea.replay : t.millionea.seeExample;
  return (
    <div className="flex flex-col gap-3">
      <MaswaliSealLine
        line={line}
        size={24}
        numbers
        idBase="mln-how-example"
        play={{ carry: run > 0, run, draw: ended, onCarried: () => setLanded(run) }}
      />
      <p className="text-body-sm text-text-muted text-pretty">{caption}</p>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="ghost" size="md" className="border-border-control" onClick={() => setRun((n) => n + 1)} data-testid="millionea-how-example-play">
          {/* Both labels share one cell, so the button keeps the wider one's width whichever it says. */}
          <span className="grid">
            <span className={cn("col-start-1 row-start-1", label !== t.millionea.seeExample && "invisible")}>{t.millionea.seeExample}</span>
            <span className={cn("col-start-1 row-start-1", label !== t.millionea.replay && "invisible")}>{t.millionea.replay}</span>
          </span>
        </Button>
        <span role="status" className="text-body-sm text-text-subtle">{ended ? t.millionea.exampleEnded : ""}</span>
      </div>
    </div>
  );
}
