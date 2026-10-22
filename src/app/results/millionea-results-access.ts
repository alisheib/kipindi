import type { MillioneaWeekSummary } from "@/lib/server/maswali-player";

/**
 * The public archive stays untouched when this request cannot see Millionea. Gate before any week read.
 * ⛔ A WEEK READ THAT FAILS DRAWS NO SECTION (S5-FIX-PLAYER P19): the section is a guest on the classic /results page, so a
 *    Millionea read error is caught here and the section left out — it never reaches `results/error.tsx`, which would put
 *    the error page where the classic archive stands. The register keeps its own error boundary for its own pages.
 */
export async function loadVisibleMillioneaResults(
  door: () => Promise<{ visible: boolean; preview: boolean }>,
  read: () => Promise<MillioneaWeekSummary[]>,
): Promise<{ preview: boolean; weeks: MillioneaWeekSummary[] } | null> {
  const access = await door();
  if (!access.visible) return null;
  try {
    return { preview: access.preview, weeks: await read() };
  } catch (err) {
    console.error("[results/millionea] the week read failed; the section is left out:", (err as Error)?.name ?? "error");
    return null;
  }
}
