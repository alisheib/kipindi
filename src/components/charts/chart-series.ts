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
