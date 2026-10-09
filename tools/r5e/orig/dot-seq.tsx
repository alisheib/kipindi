/* @jsxRuntime automatic */
/* @jsxImportSource react */
/**
 * A LINE THAT NAMES SEVERAL THINGS, WRITTEN "A · B · C", BREAKS ONLY BETWEEN THEM — and its dot never ends or opens a line.
 *
 * Born as the Akaunti hub's `HubSub` (WP12's tiles 276, 277, 2026-10-08: at 320 "Maswali ya kawaida · Simu ·" ended a line
 * on a dangling dot, and at 360 "Barua pepe" left "pepe" alone). Round 3 of the visual pass (2026-10-09) found the same
 * dot at a line's end on two more surfaces — the privacy policy's version line, "Toleo 2026-10-07 ·" / "Imeoanishwa na…"
 * (tile 207), and the invite page's call, "Shiriki kiungo" / "chako · uone" / "wanaojiunga" (tile 181) — so the one
 * mechanism moved here, and the hub, the legal header and the invite page all draw it.
 *
 * ⭐ HOW: the dictionary's own words, split at its own " · ", each thing one flex item (`.kp-seq__item`), so a line breaks
 * between things and a thing too long for a line wraps inside itself. The dot before a thing hangs in the gap to its left
 * (`.kp-seq__dot`), so a thing that opens a line carries its dot outside the box, where the box's left-edge clip hides it:
 * on one line it reads exactly as the plain text did; on two, the dot is simply not there. The dots are drawn, not read.
 * ⚠️ The gap is the dot's room, and it is the width a spaced dot has in the text's own face: 12px (`--sp-3`) for Inter
 * and Sora, where " · " measures 11.1px at 13px and about 12.7px at Sora's 19px bold; `mono` sets it to 3ch, which IS
 * " · " in a monospace face, so a mono line that fits reads pixel for pixel as it did.
 * A string with no " · " renders as one plain span — byte-identical to the text it replaces.
 * ⭐ THE SPACES AROUND THE DOT ARE REAL TEXT (2026-10-09, M7's local qa:live: "[sw] /legal/rules no words run together
 * after an inline tag · ·</span>Imetolewa"). A dot span followed straight by the next word reads "…2026-10-07·Imetolewa"
 * to a copy and paste, and to a reader that does not separate flex items. One space before and one after the hidden dot
 * make the text the dictionary wrote, "A · B". Both sit at the start of a flex item, where white space collapses, so
 * nothing moves on the screen.
 * ⭐ `renderPart` (round 4, 2026-10-09) dresses or shapes the words INSIDE each part, the words unchanged: `moneyRuns`
 * on the notifications' titles (tiles 193 194 — "Soko limefutwa · TZS 4,200 imerejeshwa" sets its figure whole, in
 * the mono face), `keepYears` on the legal version line ("Act 2022" on one line, tile 210), `keepLastWords` on the
 * badge names (never "Kwanza" alone, tiles 186 188) — so a part that wraps inside itself still breaks well. Without it
 * each part is its own text, byte for byte as before.
 * ⭐ `stack` (round 4) is for a CENTRED line: one part per line, centred. The left-edge clip that hides a line-opening
 * dot cannot work when lines are centred — a centred second line has free room on its left, so its dot would show
 * there ("· Ushindi wa Kwanza"), and CSS cannot ask which item opens a line. So a stacked sequence never shares a
 * line: every part opens its own, and the dot is drawn transparent (still in a copy, still `aria-hidden`). The
 * badge shelf's bilingual names read "First Win" over "Ushindi wa Kwanza", and no line ends or opens on "·".
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DotSeq({ text, className, mono = false, stack = false, renderPart }: {
  text: string;
  className?: string;
  mono?: boolean;
  stack?: boolean;
  renderPart?: (part: string) => ReactNode;
}) {
  const parts = text.split(" · ");
  const draw = (part: string) => (renderPart ? renderPart(part) : part);
  if (parts.length < 2) return <span className={className}>{draw(text)}</span>;
  return (
    <span className={cn("kp-seq", mono && "kp-seq--mono", stack && "kp-seq--stack", className)}>
      {parts.map((part, i) => (
        <span key={i} className="kp-seq__item">
          {i > 0 && <>{" "}<span className="kp-seq__dot" aria-hidden>·</span>{" "}</>}
          {draw(part)}
        </span>
      ))}
    </span>
  );
}
