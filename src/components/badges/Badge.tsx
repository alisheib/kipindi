// src/components/badges/Badge.tsx
// Achievement badge — a sibling system to TierBadge (kit/atoms.jsx).
// Heraldic gilt-on-royal coin, line-art icon inside, three states.
// Styling lives in globals.css (.badge / .badge--*), mirroring how .tier-* is
// driven — so badges automatically track the rest of the chord.
import * as React from "react";
import { cn, formatNumber } from "@/lib/utils";
import { DotSeq } from "@/components/ui/dot-seq";
import { keepLastWords } from "@/components/ui/keep-words";
import { BADGE_ICONS, type AchievementId } from "./icons";

type BadgeState = "locked" | "unlocked" | "progress";
type Size = "sm" | "md" | "lg";

const sizeCls: Record<Size, string> = { sm: "badge-sm", md: "badge-md", lg: "badge-lg" };

export function Badge({
  achievement,
  state = "locked",
  progress,           // { value, max, tier? } — required when state="progress"
  size = "md",
  title,
  className,
}: {
  achievement: AchievementId;
  state?: BadgeState;
  progress?: { value: number; max: number; tier?: string };
  size?: Size;
  title?: string;     // tooltip / aria-label (bilingual at call site)
  className?: string;
}) {
  // Clamp to [0,1] and guard max<=0 → avoids NaN strokeDashoffset (silent render fail).
  const pct = progress && progress.max > 0 ? Math.min(1, Math.max(0, progress.value / progress.max)) : 0;
  // Ring geometry for in-progress coins (drawn just inside the coin edge).
  const R = 30, C = 2 * Math.PI * R;

  return (
    <div
      className={cn("badge", `badge--${state}`, sizeCls[size], className)}
      role="img"
      aria-label={title ?? achievement}
      title={title}
    >
      {state === "progress" && (
        <svg className="badge-ring" viewBox="0 0 64 64"
             style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} aria-hidden>
          <circle className="badge-ring-track" cx="32" cy="32" r={R} strokeWidth="2.5" />
          <circle className="badge-ring-arc" cx="32" cy="32" r={R} strokeWidth="2.5"
                  strokeDasharray={C} strokeDashoffset={C * (1 - pct)} />
        </svg>
      )}

      {BADGE_ICONS[achievement] ?? BADGE_ICONS.default}

      {/* ⭐ ROUND 7 (2026-10-10, R5-8 — tile 186): the count hung 16px under the coin, inside the 12px gap above the name, so
          "5/20" sat 2px under the coin and 3px over "Sharp / Mahiri" where every other name is 15px from its coin. It is
          a chip on the coin's lower edge now — the tier pip's own geometry (`.badge-tier-pip`), in the progress inks
          (`.badge-count`) — one way to put a number on a badge; the name keeps its 15px and nothing below the coin moves. */}
      {state === "progress" && progress && !progress.tier && (
        <span className="badge-tier-pip badge-count">
          {formatNumber(progress.value)}/{formatNumber(progress.max)}
        </span>
      )}
      {progress?.tier && <span className="badge-tier-pip">{progress.tier}</span>}
    </div>
  );
}

// src/components/badges/BadgeShelf.tsx
// The profile grid. Locked/in-progress badges stay visible (greyed) so the
// shelf reads as a goal set, not a wall of mystery boxes.
export function BadgeShelf({
  items,
  className,
}: {
  items: Array<{ achievement: AchievementId; state: BadgeState; progress?: { value: number; max: number; tier?: string }; title: string }>;
  className?: string;
}) {
  // 2026-09-13 · auto-FIT, not auto-fill: auto-fill kept empty tracks, so five badges sat in the
  // left 60% of the card at 1280 with 400px of nothing beside them. auto-fit collapses the empty
  // tracks and the five spread across the card. The coin stays 64px (badge-md), so a wider column
  // widens only the caption's room. A phone fills every track either way, so it is unchanged.
  return (
    <div className={cn("grid gap-5", className)}
         style={{ gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))" }}>
      {items.map((it) => (
        <figure key={it.achievement} className="flex flex-col items-center gap-2 text-center">
          <Badge achievement={it.achievement} state={it.state} progress={it.progress} size="md" title={it.title} />
          {/* The bilingual names ("First Win · Ushindi wa Kwanza", data until S12 gives them a key per locale) are drawn
              as their two parts, one per line, each part's last two words kept together (round 4, 2026-10-09, tiles
              186 188): the wrapping line left "Kwanza" alone and ended four names on "·" ("First Prediction ·").
              `DotSeq stack` says why a centred line stacks rather than wraps. */}
          <figcaption className="w-full text-body-sm leading-tight text-text-muted">
            <DotSeq text={it.title} stack renderPart={keepLastWords} />
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
