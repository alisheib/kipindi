/**
 * GET /api/session/status → `{ active: boolean, viewerId: string | null }` — E-381 §6 item 4 and owner consistency.
 *
 * The signed-in chrome (avatar, masked phone, the balance) is rendered by the ROOT layout, which a soft navigation
 * does not re-run; so a player whose session ended kept looking signed in while they clicked around, until a refresh
 * or a document load. `SessionPresence` asks this on each navigation and, when the answer is no, sends the browser
 * to `/auth/session-ended` with a real document navigation — the one path that clears the cookie and says why.
 * A different active viewer refreshes the document instead, retaining that viewer's cookie.
 *
 * ⭐ `active` is `getSessionState()`'s own answer, so an UNREADABLE registry counts as active (E-381 P0: a database
 * blip is not a sign-out), and nothing here writes a cookie.
 */
import { NextResponse } from "next/server";
import { getSessionState } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const { session } = await getSessionState();
  return NextResponse.json({ active: !!session, viewerId: session?.userId ?? null }, { headers: { "cache-control": "no-store" } });
}
