import type { MillioneaWeekSummary } from "@/lib/server/maswali-player";

/** The public archive stays untouched when this request cannot see Millionea. Gate before any week read. */
export async function loadVisibleMillioneaResults(
  door: () => Promise<{ visible: boolean; preview: boolean }>,
  read: () => Promise<MillioneaWeekSummary[]>,
): Promise<{ preview: boolean; weeks: MillioneaWeekSummary[] } | null> {
  const access = await door();
  if (!access.visible) return null;
  return { preview: access.preview, weeks: await read() };
}
