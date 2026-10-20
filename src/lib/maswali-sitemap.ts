/** Public discovery for Millionea's completed weeks. The rollout decision is supplied by the server per request. */
import type { MetadataRoute } from "next";
import type { RolloutState } from "@/lib/rollout-state";
import type { StoredWeek } from "@/lib/server/maswali-dal";

type SettledWeek = Pick<StoredWeek, "code" | "visibility" | "state" | "settledAt">;

export function millioneaSitemap(state: RolloutState, weeks: readonly SettledWeek[], origin: string): MetadataRoute.Sitemap {
  const home: MetadataRoute.Sitemap = [{ url: origin }];
  if (state !== "ACTIVE") return home;

  const settled = weeks.flatMap((week) => {
    if (week.visibility !== "PUBLIC" || week.state !== "SETTLED" || !week.settledAt
      || !/^MLN-\d{4}-W\d{2}$/.test(week.code)) return [];
    const at = new Date(week.settledAt);
    if (!Number.isFinite(at.getTime())) return [];
    return [{ url: `${origin}/millionea/register/${encodeURIComponent(week.code)}`, lastModified: at }];
  });

  return [...home, { url: `${origin}/millionea/register` }, ...settled];
}
