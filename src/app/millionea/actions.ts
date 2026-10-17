"use server";

/**
 * /millionea — THE PLAYER'S ACTS (MASWALI-BUILD S5; MASWALI-PLAN §7b S5 items 2 and 7).
 *
 *   · buyMillioneaTicketsAction   — the slip's confirm: one purchase of one or more tickets, one request id per confirmed
 *                                   slip (MB-51), every slip validated on the server;
 *   · cancelMillioneaTicketAction — a ticket's free cancel, inside RULES §2.6's window, at every rollout state (L5);
 *   · markMillioneaTicketSeenAction / markMillioneaNoticeSeenAction — the owner saw it: the fact rests (§10 2.1), through
 *                                   the instant the page rendered, which the page passes back (L7).
 *
 * Each is its session check and ONE call into `maswali-player-acts.ts`, the path both stores' suites drive
 * (`test:maswali-player`) — `markets/actions.ts`'s shape (`cashOutPositionAction` → `cashOutPositionFromForm`). Every
 * answer is the platform's `ServiceResult`: a refusal carries its registered `reason`, so the page renders that reason's
 * copy and never the server's sentence. A signed-out buyer is sent to sign in and back, as the bet door does.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { signInPathForAction } from "@/lib/server/sign-in-path";
import {
  buyMillioneaFromForm, cancelMillioneaFromForm, markMillioneaNoticeSeenFor, markMillioneaTicketSeenFor,
} from "@/lib/server/maswali-player-acts";

/** What a purchase or a cancel changes on screen: the hub's own tickets and figure, the tickets, the wallet. */
const refresh = () => {
  revalidatePath("/millionea");
  revalidatePath("/millionea/tickets", "layout");
  revalidatePath("/wallet");
};

export async function buyMillioneaTicketsAction(formData: FormData) {
  const session = await currentSession();
  if (!session) redirect((await signInPathForAction()) as never);
  // E-235 — the play clock rides on the signed session, as on every bet (the session limit refuses on the one bet path).
  const r = await buyMillioneaFromForm(session.userId, formData, { playStartedAt: session.playStartedAt });
  if (r.ok) refresh();
  return r;
}

export async function cancelMillioneaTicketAction(formData: FormData) {
  const session = await currentSession();
  if (!session) redirect((await signInPathForAction()) as never);
  const r = await cancelMillioneaFromForm(session.userId, formData);
  if (r.ok) refresh();
  return r;
}

/**
 * No revalidation on purpose: a seen mark changes only which facts animate next time, never what the page states.
 * `through` is the ticket view's `seen.through` — the newest fact the page rendered — so a fact that lands after the
 * render still performs (L7).
 */
export async function markMillioneaTicketSeenAction(serial: string, through: string): Promise<{ ok: boolean }> {
  const session = await currentSession();
  if (!session) return { ok: false };
  return { ok: await markMillioneaTicketSeenFor(session.userId, serial, through) };
}

/** `renderedAt` is the hub view's `asOf`: the instant the notice was rendered (L7). */
export async function markMillioneaNoticeSeenAction(weekId: string, notice: string, renderedAt: string): Promise<{ ok: boolean }> {
  const session = await currentSession();
  if (!session) return { ok: false };
  return { ok: await markMillioneaNoticeSeenFor(session.userId, weekId, notice, renderedAt) };
}
