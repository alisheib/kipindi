"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MaswaliSealLine, type SealLine } from "@/components/maswali/maswali-seal-line";
import { useT } from "@/lib/i18n";
import { fill, formatNumber } from "@/lib/utils";

/**
 * M9 · THE EXAMPLE (MASWALI-PLAN §10 §4 M9; the U-how frames; SM9): a static Seal Line — main 4 voided, reserve A1
 * standing in — and the reader's own tap plays N1 once on it (`.maswali-carry`). It is the only demo in the product:
 * ⛔ it never auto-plays and keeps no seen key. Once played it says so, and "Rudia" plays it again on a tap.
 * Under either clamp the carry binds nothing, so the line simply rests (the carry's own rule, `maswali-carry.tsx`).
 * ⭐ S5 VIS P6: the line is drawn exactly as a real ticket draws that state — main 4's number struck with "A1" under it
 * (`maswali-seal-line.tsx`) — and the button says what it plays ("Show A1 replacing question 4"), inside a card already
 * titled "Example" (it said "See an example" there).
 */
export function HowExample({ line, caption, voided, standIn }: {
  line: SealLine;
  caption: string;
  /** The voided main the example shows (4), and the reserve that stands in for it ("A1"). */
  voided: number;
  standIn: string;
}) {
  const { t } = useT();
  const [run, setRun] = useState(0);
  return (
    <div className="flex flex-col gap-3">
      <MaswaliSealLine line={line} size={24} numbers idBase="mln-how-example" play={{ carry: run > 0, run }} />
      <p className="text-body-sm text-text-muted text-pretty">{caption}</p>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="ghost" size="md" className="border-border-control kp-mln-example-button" onClick={() => setRun((n) => n + 1)}>
          {run > 0 ? t.millionea.replay : fill(t.millionea.seeExample, { r: standIn, n: formatNumber(voided) })}
        </Button>
        {run > 0 && <span role="status" className="text-body-sm text-text-subtle">{t.millionea.exampleEnded}</span>}
      </div>
    </div>
  );
}
