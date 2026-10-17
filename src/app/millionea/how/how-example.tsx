"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MaswaliSealLine, type SealLine } from "@/components/maswali/maswali-seal-line";
import { useT } from "@/lib/i18n";

/**
 * M9 · THE EXAMPLE (MASWALI-PLAN §10 §4 M9; the U-how frames; SM9): a static Seal Line — main 4 voided, reserve A1
 * standing in — and the reader's own tap on "Tazama mfano" plays N1 once on it (`.maswali-carry`). It is the only demo in
 * the product: ⛔ it never auto-plays and keeps no seen key. Once played it says so, and "Rudia" plays it again on a tap.
 * Under either clamp the carry binds nothing, so the line simply rests (the carry's own rule, `maswali-carry.tsx`).
 */
export function HowExample({ line, caption }: { line: SealLine; caption: string }) {
  const { t } = useT();
  const [run, setRun] = useState(0);
  return (
    <div className="flex flex-col gap-3">
      <MaswaliSealLine key={run} line={line} size={24} numbers idBase="mln-how-example" play={{ carry: run > 0 }} />
      <p className="text-body-sm text-text-muted text-pretty">{caption}</p>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="ghost" size="md" className="border-border-control" onClick={() => setRun((n) => n + 1)}>
          {run > 0 ? t.millionea.replay : t.millionea.seeExample}
        </Button>
        {run > 0 && <span role="status" className="text-body-sm text-text-subtle">{t.millionea.exampleEnded}</span>}
      </div>
    </div>
  );
}
