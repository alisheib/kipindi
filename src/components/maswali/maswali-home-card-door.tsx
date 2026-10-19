/**
 * THE MILLIONEA CARD FOR THIS REQUEST (MASWALI-BUILD S5 composition; MASWALI-PLAN §10 §3.1–§3.2; DESIGN_AUTHORITY §M8a
 * item 11, O-7) — the journey home's (after the head, before the topic chips) and the classic board's (at its head, above
 * the filters): one function, so the two doors say one thing.
 *
 * ⛔ NOT DRAWN — no element, no link, nothing a reader could find — when the rollout hides Millionea from the request
 *    (MR-2), when the reader is on a break (cooling-off or self-exclusion, `onBreak`: no door anywhere), or when the
 *    week's figure cannot be read (`homeCardOf`).
 * ⭐ A SERVER RENDER WITH NO COUNTDOWN AND NO POLL (§3.1): the figure is this render's. The card lives OUTSIDE the
 *    journey home's lazy module, and this file reaches no client module at all (`maswali-card-model.ts` says why).
 * ⭐ `data-testid="millionea-home-card"`: the drives' handle, and `qa:live`'s dark section's proof that a hidden product
 *    left no card on `/` or `/markets`.
 */
import type { ReactElement } from "react";
import { MaswaliHomeCard } from "@/components/maswali/maswali-home-card";
import { homeCardOf, nextWeekOpen } from "@/components/maswali/maswali-card-model";
import { configuredFeeRate, millioneaBreakOf, millioneaDoor, millioneaHubNow, millioneaOpenTemplate } from "@/lib/server/millionea-doors";
import { getServerT } from "@/lib/i18n-server";
import type { Dict } from "@/lib/i18n-dict";

export async function millioneaHomeCard(t: Dict, nowMs: number, opts: { onBreak?: boolean; className?: string } = {}): Promise<ReactElement | null> {
  const door = await millioneaDoor();
  if (!door.visible) return null;
  const onBreak = opts.onBreak ?? (await millioneaBreakOf(door.userId)) !== null;
  if (onBreak) return null;
  const hub = await millioneaHubNow(door.userId, door.state);
  if (!hub) return null;
  const model = homeCardOf(t, hub, configuredFeeRate(), nowMs, nextWeekOpen(hub, millioneaOpenTemplate(), nowMs));
  if (!model) return null;
  // The request's language, for the card's fact lines (S5 VIS A1: `keepFact` keeps a phrase whole the reader's way).
  const { locale } = await getServerT();
  return (
    <div data-testid="millionea-home-card" className={opts.className}>
      <MaswaliHomeCard t={t} locale={locale} week={model.week} jackpot={model.jackpot} pct={model.pct} cap={model.cap} state={model.state} finalWeek={model.finalWeek}
        finalAhead={model.finalAhead} atLeast={model.atLeast} pendingWeek={model.pendingWeek} />
    </div>
  );
}
