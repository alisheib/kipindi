/**
 * THE RENDERER'S ONE DATA CONTRACT: strictly ascending, one item per time.
 *
 * 🔴 REPORTED BY ALI 2026-09-18 — *"this page has encountered a problem, only on Dhiheksh
 * Kaba's phone; other phones work."* The Up & Down board, on that phone only, painted the
 * route error boundary instead of the game. Reproduced locally the same day:
 *
 *     Assertion failed: data must be asc ordered by time, index=1, time=1789720565, prev time=1789720565
 *
 * lightweight-charts requires `setData` to be sorted AND strictly increasing; a tie throws.
 * The throw leaves the draw effect, so React unmounts the whole route and the player is told
 * the PAGE is broken. Nothing about their bet, their wallet or the round is wrong — the chart
 * is display-only — but the game is unreachable for them.
 *
 * ⛔ WHY IT WAS ONE PHONE, AND WHY THAT IS THE MOST IMPORTANT PART. The board renders CUBES by
 * default and mounts the terminal ONLY while the chart is selected (`board-viz.tsx`), and that
 * choice is stored PER DEVICE in `localStorage` (`kp-updown-viz`, plus `kp-updown-range` /
 * `kp-updown-style` for the chart's own pills). A player who once tapped "Chart" carries that
 * value for ever, so the crashing code path mounts on their handset and on no other — an
 * outage with a population of one, invisible to every other phone and to every green suite.
 *
 * ⛔ AND WHY SORTING WAS NOT ENOUGH. Two of the three call sites already sorted. The times
 * they sorted were still MILLISECONDS from the server, and the renderer takes SECONDS — the
 * conversion is `Math.round(ms / 1000)`, so two readings 400ms apart are distinct in the
 * payload and identical on the axis. Sorting cannot separate them; only collapsing can. The
 * collision is ordinary: confirmed reads written in one burst (a round boundary, the
 * self-healer catching up on a backlog) land inside the same second.
 *
 * ⭐ THE TIE RULE IS A CORRECTNESS RULE, NOT A TIDY-UP. A gap marker is a whitespace item —
 * `{ time }` with no value — and the feed deliberately emits one per missing grid step so an
 * outage keeps its width. If a whitespace item won a tie it would ERASE a real price and draw
 * a hole over a minute the platform actually read. So: data always beats whitespace, and
 * between two data items the LAST one wins (the newest read for that second).
 */

/** Anything the renderer accepts: a time, and optionally the data at that time. */
type TimedItem = { time: number } & Record<string, unknown>;

/** Does this item carry data, or is it a whitespace slot reserving axis width? */
function carriesData(it: TimedItem): boolean {
  return it.value !== undefined || it.close !== undefined;
}

/**
 * Sort by time and collapse ties, so the result satisfies the renderer's contract.
 *
 * ⛔ Call this at EVERY `setData` site. A site that sorts by hand is one conversion away
 * from this bug again, and the throw does not surface as a chart defect — it surfaces as
 * the whole page being gone.
 */
export function ascUnique<T extends { time: number }>(items: readonly T[]): T[] {
  if (items.length < 2) return [...items];
  // Stable by construction: equal times keep their original relative order, which is what
  // makes "the last data item wins" mean "the newest one the feed listed".
  const sorted = [...items].sort((a, b) => a.time - b.time);
  const out: T[] = [];
  for (const it of sorted) {
    const prev = out[out.length - 1];
    if (!prev || prev.time !== it.time) { out.push(it); continue; }
    // A tie. Keep whichever says more about this second.
    const prevData = carriesData(prev as TimedItem);
    const thisData = carriesData(it as TimedItem);
    if (thisData || !prevData) out[out.length - 1] = it;
    // else: `it` is whitespace and `prev` is a real reading — the reading stands.
  }
  return out;
}

/**
 * D46 · MAKE THE AXIS A TIME AXIS.
 *
 * 🔴 THE DEFECT. lightweight-charts' time scale is ORDINAL, not continuous: it gives every item
 * in `setData` exactly one slot and multiplies the slot distance by one uniform `barSpacing`. So
 * a chart of event-driven readings under CALENDAR LABELS lies about rate of change — measured by
 * the critics panel on the market detail page, a two-day interval and a one-day interval were
 * both 153px, and on live market `mkt_07204d65ca88106b160c` (11 readings over 112.4h, gaps from
 * 95s to 2.60 days) every gap drew the same width. A player reading the slope reads a rate the
 * data does not support.
 *
 * ⭐ THE REMEDY IS THE LIBRARY'S OWN, AND IT INVENTS NOTHING. A whitespace item — `{ time }` with
 * no value — reserves axis width and carries no reading, which is exactly what a gap IS. This
 * repo already relies on that: `terminal-chart.tsx` feeds the server's dropped buckets as
 * whitespace *"so an outage keeps its width"*, and its own comment states the premise this
 * function acts on — *"the time scale is index-spaced, so each missing grid step needs a
 * whitespace item"*.
 * ⛔ IT MUST NEVER BE INTERPOLATED PROBABILITIES. A drawn value between two bets is a reading the
 * platform never took, and `market-curve.tsx`'s own header states the rule it would break:
 * *"Real data or nothing (A-5)"*. Whitespace says "time passed here"; a value says "we measured
 * this". Only the first is true.
 *
 * ⚠️ AND IT IS SAFE ONLY BECAUSE OF THE TIE RULE ABOVE. Whitespace and a real reading can land on
 * the same second; `ascUnique` keeps the reading. Written the other way round, a gap marker would
 * ERASE a price the platform actually read.
 *
 * ── THE STEP, AND WHY IT IS BOUNDED ──────────────────────────────────────────────────────────
 * `step = max(smallest gap, ceil(span / maxSlots))`. The smallest gap keeps the spacing exact
 * whenever the reading count allows; the span/maxSlots floor stops a 95-second gap inside a
 * four-month window from demanding 100,000 slots. So the guarantee this function makes is
 * deliberately stated as a TOLERANCE, not an equality: for any two consecutive readings, the
 * index distance between them times `step` equals the elapsed time to within one `step`. A guard
 * that asserted exact proportionality would be asserting something no bounded grid can give.
 *
 * ⚠️ `maxSlots` is NOT a display choice and must not be tuned to make a chart look better. Raising
 * it makes small gaps more exact and costs items; lowering it collapses small gaps toward equal
 * width, which is the defect returning by degrees.
 */
export function timeGridFill<T extends { time: number }>(
  data: readonly T[],
  opts?: { maxSlots?: number },
): Array<T | { time: number }> {
  const maxSlots = Math.max(8, Math.floor(opts?.maxSlots ?? 4000));
  const pts = [...data].sort((a, b) => a.time - b.time);
  // One reading has no interval to misstate, so there is nothing to fill.
  if (pts.length < 2) return [...pts];

  const span = pts[pts.length - 1].time - pts[0].time;
  let smallest = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const d = pts[i].time - pts[i - 1].time;
    if (d > 0 && d < smallest) smallest = d;
  }
  // ⛔ EVERY READING INSIDE ONE SECOND, OR ONE INSTANT REPEATED. There is no grid to build and no
  // defect to fix; returning the data untouched is the honest answer, not a degenerate step of 0.
  if (!Number.isFinite(smallest) || smallest <= 0 || span <= 0) return [...pts];

  const step = Math.max(smallest, Math.ceil(span / maxSlots));
  const out: Array<T | { time: number }> = [];
  for (let i = 0; i < pts.length; i++) {
    out.push(pts[i]);
    const next = pts[i + 1];
    if (!next) break;
    const gap = next.time - pts[i].time;
    // How many slots this interval is worth, minus the reading that already occupies one.
    const fill = Math.round(gap / step) - 1;
    for (let k = 1; k <= fill; k++) {
      const t = pts[i].time + Math.round((k * gap) / (fill + 1));
      // Strictly between the two readings: a marker ON a reading's second would be a tie for
      // `ascUnique` to resolve, and one more item for nothing.
      if (t > pts[i].time && t < next.time) out.push({ time: t });
    }
  }
  return out;
}
