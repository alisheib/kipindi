/** The crawler sees Millionea only after the Owner's effective switch reaches ACTIVE. */
import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/app-url";
import { millioneaSitemap } from "@/lib/maswali-sitemap";
import { weekStore } from "@/lib/server/maswali-dal";
import { millioneaStateNow } from "@/lib/server/millionea-switch";

// A cached route could keep week URLs visible after a kill, or hide newly settled weeks.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const state = await millioneaStateNow();
  const origin = appUrl();
  if (state !== "ACTIVE") return millioneaSitemap(state, [], origin);
  try {
    const weeks = await weekStore.list({ visibility: "PUBLIC", states: ["SETTLED"] });
    return millioneaSitemap(state, weeks, origin);
  } catch {
    // Discovery cannot name weeks whose final record is unreadable.
    return millioneaSitemap("WITHDRAWN", [], origin);
  }
}
