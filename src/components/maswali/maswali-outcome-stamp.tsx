import type { CSSProperties } from "react";
import { outcomeWord } from "@/lib/side-label";
import { cn } from "@/lib/utils";
import type { Dict } from "@/lib/i18n-dict";
import type { MaswaliOutcome } from "@/lib/maswali-score";

/**
 * THE OUTCOME STAMP — "MATOKEO · NDIO" (MASWALI-BUILD S5; MASWALI-PLAN §10 §4 M3; DESIGN_AUTHORITY §M8a item 2).
 *
 * A sealed result, stated as the world's fact: mono, the text's own ink on the strong border, the smallest radius. It is
 * the same stamp for YES, NO and VOID and for a matched or a missed pick — the stamp states the world; the socket beside
 * it states the match (never a verdict on the player). ⛔ No betting ink: "NDIO" here is a result, not a side.
 * The outline measures 2.13:1 on a raised card and is decoration (manifest L7): the word inside it carries the meaning.
 *
 * ⭐ N2, KUGONGA MUHURI. `press` lands it once with `.maswali-attest` (`--sp-2` down the mark's line, the seal-place stops
 * 1.02 / 0.98, staggered `index` steps, capped at four); without it the stamp is its end frame. The composer decides
 * from the seen state: a data change while the player is looking, or up to four unseen results on opening (§10 §2).
 */
export function outcomeStampText(t: Dict, outcome: MaswaliOutcome): string {
  // The platform's own word for a settled outcome (`outcomeWord`): a void reads as every void on 50pick does — one
  // definition site (§L2; the S5 UI review, LOW 13: this stamp once kept a VOID word of its own).
  return `${t.millionea.stampResult} · ${outcomeWord(t, outcome, "MASWALI")}`;
}

export function MaswaliOutcomeStamp({ t, outcome, press, index = 0, size = "caption", className }: {
  t: Dict;
  outcome: MaswaliOutcome;
  /** Land it now (N2). */
  press?: boolean;
  /** Its step in a cascade of presses. */
  index?: number;
  /** `micro` on the loss receipt's dense rows, `caption` on a ticket's clauses. */
  size?: "micro" | "caption";
  className?: string;
}) {
  const stampText = outcomeStampText(t, outcome);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap border border-border-strong px-1.5 py-0.5 font-mono font-bold uppercase eyebrow text-text",
        // The size rides in one string with `.eyebrow`, the role that blesses a tracked microlabel (type-scale §3).
        size === "micro" ? "text-micro eyebrow" : "text-caption eyebrow",
        press && "maswali-attest",
        className,
      )}
      style={{ borderRadius: "var(--r-xs)", ...(press ? ({ "--i": index } as CSSProperties) : null) }}
    >
      {stampText}
    </span>
  );
}
