/**
 * Event calendar (F8) — the real-world moments we schedule markets around.
 *
 * THE CORE RULE: the calendar is OPERATOR-AUTHORED. The AI never invents an event.
 *
 * Why that matters here specifically: this platform has NO fixtures feed (no
 * Sportradar — see CLAUDE.md open blockers). The model's only fact-grounding is
 * Anthropic's web_search tool, which an operator can switch OFF, after which it
 * writes from parametric memory. If we let it author the calendar, it could invent
 * a Simba–Yanga fixture on a date that does not exist, and we would open a
 * real-money market on it. So: an officer enters each event, with an official
 * source URL that must pass the SAME trusted-domain allowlist that gates every
 * other publish path. The AI is only ever STEERED by an event a human vouched for.
 *
 * Every mutation is audited.
 */
import { db, type StoredEvent } from "./store";
import { audit } from "./audit";
import { isSourceTrusted } from "./source-registry";
import type { MarketCategory } from "./market-service";

export type { StoredEvent };

export type AddEventInput = {
  title: string;
  category: MarketCategory;
  startsAt: string;
  sourceUrl: string;
  note?: string;
};

export type EventResult =
  | { ok: true; event: StoredEvent }
  | { ok: false; error: string; code: "INVALID" | "UNTRUSTED_SOURCE" | "NOT_FOUND" };

/**
 * Add an event. The source URL must belong to an ENABLED trusted domain in the
 * event's category — the same `isSourceTrusted` gate that guards market publish.
 * That check also refuses a category the operator has disabled, so a disabled
 * category can't sneak back in through the calendar.
 */
export async function addEvent(input: AddEventInput, officerId: string): Promise<EventResult> {
  const title = input.title?.trim();
  if (!title || title.length < 4) return { ok: false, error: "Title is too short.", code: "INVALID" };

  const startsMs = Date.parse(input.startsAt);
  if (!Number.isFinite(startsMs)) return { ok: false, error: "Invalid date.", code: "INVALID" };
  if (startsMs <= Date.now()) return { ok: false, error: "The event must be in the future.", code: "INVALID" };

  // Same allowlist that gates every other publish path. Also rejects a disabled category.
  const trust = await isSourceTrusted(input.sourceUrl, input.category);
  if (!trust.ok) {
    audit({
      category: "COMPLIANCE",
      action: "event.rejected.untrusted_source",
      actorId: officerId, targetType: "Event", targetId: title.slice(0, 60),
      payload: { sourceUrl: input.sourceUrl, category: input.category, reason: trust.reason },
    });
    return { ok: false, error: trust.reason ?? "Source is not on the trusted registry.", code: "UNTRUSTED_SOURCE" };
  }

  const event = await db.event.create({
    title,
    category: input.category,
    startsAt: new Date(startsMs).toISOString(),
    sourceUrl: input.sourceUrl.trim(),
    note: input.note?.trim() || null,
    addedBy: officerId,
  });

  audit({
    category: "ADMIN",
    action: "event.added",
    actorId: officerId, targetType: "Event", targetId: event.id,
    payload: { title: event.title, category: event.category, startsAt: event.startsAt, sourceUrl: event.sourceUrl },
  });
  return { ok: true, event };
}

export async function removeEvent(id: string, officerId: string): Promise<{ ok: boolean }> {
  await db.event.delete(id);
  audit({ category: "ADMIN", action: "event.removed", actorId: officerId, targetType: "Event", targetId: id });
  return { ok: true };
}

/** Upcoming events, soonest first. Past events are not "upcoming" and are hidden. */
export async function listUpcomingEvents(limit = 100): Promise<StoredEvent[]> {
  const now = Date.now();
  const all = await db.event.list();
  return all
    .filter((e) => Date.parse(e.startsAt) > now)
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
    .slice(0, limit);
}

/** Events that still have no market drafted — the officer's work queue. */
export async function listPendingEvents(limit = 50): Promise<StoredEvent[]> {
  return (await listUpcomingEvents(500)).filter((e) => !e.generatedAt).slice(0, limit);
}

export async function getEvent(id: string): Promise<StoredEvent | null> {
  return db.event.findById(id);
}

/** Stamp an event once a poll has been drafted from it (prevents duplicates). */
export async function markEventGenerated(id: string, aiPollId: string, officerId: string): Promise<void> {
  await db.event.update(id, { generatedAt: new Date().toISOString(), aiPollId });
  audit({ category: "ADMIN", action: "event.poll_generated", actorId: officerId, targetType: "Event", targetId: id, payload: { aiPollId } });
}

/**
 * Turn an officer-vouched event into steering for the generator.
 *
 * This is the ONLY thing the calendar hands the model: a fact an officer already
 * verified. The model still has to write the question, criterion and sources — and
 * an officer still has to approve it before it becomes a market.
 */
export function eventSteer(e: StoredEvent): string {
  const when = new Date(e.startsAt).toISOString();
  return [
    `Draft a market about this SPECIFIC real event, which an operator has already verified:`,
    `EVENT: ${e.title}`,
    `WHEN (ISO, UTC): ${when}`,
    `OFFICIAL SOURCE: ${e.sourceUrl}`,
    e.note ? `OPERATOR NOTE: ${e.note}` : "",
    ``,
    `The event above is GROUND TRUTH — do not contradict it, do not change its date,`,
    `and do not substitute a different fixture. Resolve the market AFTER the event`,
    `concludes. Cite the official source above (plus any you verify via web search).`,
  ].filter(Boolean).join("\n");
}
