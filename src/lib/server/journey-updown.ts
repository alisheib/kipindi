/**
 * JUU/CHINI'S JOURNEY ARM — THE VIEWER HALF (the Vodacom plan S12, WP10; S12-PLAN Open points 9 and 10).
 *
 * What a journey reader's Up & Down pages render into the arm, read once per server render (the board's 20-second poll
 * and every refresh re-read it; no new route): the viewer's facts from the gates' OWN reads — the bet sheet's
 * `viewerFacts`, so the two journeys cannot disagree about a wallet — and the spendable figure the bet path refuses
 * against, balance + bonus (`buyPosition`, `shortfall.ts`), not the classic board's balance alone.
 * ⛔ A read that fails is `facts: null` and `spendable: null` — UNKNOWN, never zero: the arm then lets the server decide.
 * ⛔ SERVER-ONLY, and called only for a journey request with a session: a classic page never reads it.
 */
import { viewerFacts } from "./journey-sheet";
import type { JudViewer } from "@/lib/journey/updown-arm";

export async function judViewerFor(userId: string, playStartedAt: number | null | undefined): Promise<JudViewer> {
  const facts = await viewerFacts(userId, playStartedAt).catch(() => null);
  const wallet = facts?.wallet ?? null;
  const spendable = wallet && wallet.balance !== null && Number.isFinite(wallet.balance)
    ? Math.max(0, wallet.balance) + Math.max(0, wallet.bonusBalance ?? 0)
    : null;
  return { facts, spendable, viewerId: userId };
}
