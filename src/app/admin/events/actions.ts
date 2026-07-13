"use server";

import { revalidatePath } from "next/cache";
import { currentSession } from "@/lib/server/auth-service";
import { hasRole, MARKET_OPS_ROLES } from "@/lib/server/roles";
import { requireAdminTotp } from "@/lib/server/admin-guard";
import { addEvent, removeEvent, getEvent, markEventGenerated, eventSteer } from "@/lib/server/events-service";
import { generateAIPoll } from "@/lib/server/ai-poll-generation";
import { computeSelectionClosedAt } from "@/lib/server/ai-poll-config";
import type { MarketCategory } from "@/lib/server/market-service";

/** Same guard the other market-ops actions use: role tier + step-up TOTP. */
async function requireOfficer(action: string): Promise<{ userId: string }> {
  const s = await currentSession();
  if (!s || !hasRole(s.role, MARKET_OPS_ROLES)) throw new Error(`Forbidden: ${action}`);
  await requireAdminTotp(s.userId, s.sessionId);
  return { userId: s.userId };
}

/** Add a real, operator-verified event. The source must be on the trusted registry. */
export async function addEventAction(formData: FormData) {
  const { userId } = await requireOfficer("addEventAction");
  const res = await addEvent(
    {
      title: String(formData.get("title") ?? ""),
      category: String(formData.get("category") ?? "sports") as MarketCategory,
      startsAt: String(formData.get("startsAt") ?? ""),
      sourceUrl: String(formData.get("sourceUrl") ?? ""),
      note: String(formData.get("note") ?? "") || undefined,
    },
    userId,
  );
  if (!res.ok) return { ok: false as const, error: res.error };
  revalidatePath("/admin/events");
  return { ok: true as const };
}

export async function removeEventAction(formData: FormData) {
  const { userId } = await requireOfficer("removeEventAction");
  await removeEvent(String(formData.get("id") ?? ""), userId);
  revalidatePath("/admin/events");
  return { ok: true as const };
}

/**
 * Draft an AI poll FROM a calendar event (F8's whole point).
 *
 * The model is STEERED by an event an officer already verified — it does not
 * invent the fixture or the date. It still has to write the question, criterion
 * and sources, and an officer STILL has to approve the poll before it can become
 * a market (the four existing state guards are untouched).
 */
export async function generateFromEventAction(formData: FormData) {
  const { userId } = await requireOfficer("generateFromEventAction");
  const id = String(formData.get("id") ?? "");
  const event = await getEvent(id);
  if (!event) return { ok: false as const, error: "Event not found." };
  if (event.generatedAt) return { ok: false as const, error: "A poll has already been drafted for this event." };

  // Resolve AFTER the event concludes. We don't know its duration, so give it a
  // 3h buffer — the officer can edit the exact resolution time before publishing.
  const EVENT_BUFFER_MS = 3 * 3600_000;
  const resolutionAt = new Date(Date.parse(event.startsAt) + EVENT_BUFFER_MS).toISOString();
  const selectionClosedAt = computeSelectionClosedAt(resolutionAt, event.category);

  try {
    const poll = await generateAIPoll({
      category: event.category,
      prompt: eventSteer(event),
      actorId: userId,
      controlledResolutionAt: resolutionAt,
      controlledSelectionClosedAt: selectionClosedAt,
    });
    await markEventGenerated(event.id, poll.id, userId);
    revalidatePath("/admin/events");
    revalidatePath("/admin/ai-polls");
    return { ok: true as const, pollId: poll.id, state: poll.state };
  } catch (err) {
    // The budget gate throws here when the AI credit cycle is exhausted.
    return { ok: false as const, error: (err as Error)?.message ?? "Generation failed." };
  }
}
