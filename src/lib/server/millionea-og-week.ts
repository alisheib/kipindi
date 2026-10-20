import type { StoredWeek } from "./maswali-dal";
import type { RolloutState } from "@/lib/millionea-rollout";

type OgWeekRow = Pick<StoredWeek, "code" | "visibility" | "state" | "closedAt">;
export type PublishedOgWeek = { code: string; state: "SETTLED" | "VOIDED" };

/** An OG fetch is public even when the page is open to staff. No read happens below an ACTIVE door. */
export async function loadPublishedOgWeek(
  door: { visible: boolean; state: RolloutState },
  code: string | null,
  getByCode: (code: string) => Promise<OgWeekRow | null>,
  nowMs = Date.now(),
): Promise<PublishedOgWeek | null> {
  if (!door.visible || door.state !== "ACTIVE" || code === null) return null;
  const week = await getByCode(code);
  if (!week || week.code !== code || week.visibility !== "PUBLIC") return null;
  if (week.state !== "SETTLED" && week.state !== "VOIDED") return null;
  const closedMs = week.closedAt === null ? NaN : Date.parse(week.closedAt);
  if (!Number.isFinite(closedMs) || closedMs > nowMs) return null;
  return { code: week.code, state: week.state };
}
