/** A public share image only for a closed, terminal PUBLIC week at ACTIVE. It names no question, pick, ticket, or player. */
import { millioneaDoor } from "@/lib/server/millionea-doors";
import { weekStore } from "@/lib/server/maswali-dal";
import { normalizeMillioneaWeekCode } from "@/lib/server/maswali-player";
import { loadPublishedOgWeek } from "@/lib/server/millionea-og-week";
import { renderMillioneaWeekOg } from "./og-view";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const hidden = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

export async function GET(_req: Request, { params }: { params: Promise<{ week: string }> }) {
  const door = await millioneaDoor();
  if (!door.visible || door.state !== "ACTIVE") return hidden();
  const { week: rawCode } = await params;
  const code = normalizeMillioneaWeekCode(rawCode);
  try {
    const week = await loadPublishedOgWeek(door, code, weekStore.getByCode);
    return week ? renderMillioneaWeekOg(week) : hidden();
  } catch {
    return hidden();
  }
}
