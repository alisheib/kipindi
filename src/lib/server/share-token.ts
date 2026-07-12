/**
 * Win-share tokens (F5).
 *
 * THE FABRICATION PROBLEM this exists to solve: the OG card is a PUBLIC URL. If
 * the win amount came from a query param (`?won=50000000`), anyone could mint a
 * branded "I won TZS 50,000,000 on 50pick" image. That is exactly the kind of
 * fabricated money claim we must never make possible.
 *
 * So a win card is addressed by an HMAC-SIGNED token that only OUR server can
 * mint, and only for the position's OWNER. The renderer then reads the amount
 * from the DATABASE (`finalPayout` — settled truth), never from the URL.
 *
 * Note the amount is deliberately NOT carried in the token payload either: the
 * token only names the position. Even a leaked token can't misstate the figure,
 * because the figure is always re-read from the ledger at render time.
 */
import { signSession, verifySession } from "./crypto";
import { positionStore } from "./market-dal";
import { getMarket } from "./market-service";

const PURPOSE = "win-share";
const TTL_MS = 90 * 24 * 3600_000; // a shared link stays viewable for 90 days

type Payload = { p?: string; pos?: string };

/**
 * Mint a share token for a WIN the caller actually owns. Returns null when the
 * position isn't theirs, isn't a WIN, or has no settled payout — so a loss or an
 * open bet can never be dressed up as a win.
 */
export async function mintWinShareToken(userId: string, positionId: string): Promise<string | null> {
  const pos = await positionStore.get(positionId);
  if (!pos) return null;
  if (pos.userId !== userId) return null;            // owner-scoped
  if (pos.status !== "WIN") return null;             // only a real win
  if (pos.finalPayout == null || pos.finalPayout <= 0) return null; // settled truth only
  return signSession({ p: PURPOSE, pos: positionId, exp: Date.now() + TTL_MS });
}

export type WinShare = {
  marketId: string;
  marketTitle: string;
  side: "YES" | "NO";
  stake: number;
  /** Settled payout — read from the ledger, never from the URL. */
  payout: number;
  net: number;
};

/**
 * Resolve a token back to the REAL win. Re-reads the position + market at render
 * time, so the rendered figure is always current ledger truth. Returns null on a
 * forged / expired / non-win token.
 */
export async function resolveWinShareToken(token: string | null | undefined): Promise<WinShare | null> {
  if (!token) return null;
  const payload = verifySession<Payload>(token);
  if (!payload || payload.p !== PURPOSE || !payload.pos) return null;
  const pos = await positionStore.get(payload.pos);
  if (!pos) return null;
  if (pos.status !== "WIN" || pos.finalPayout == null || pos.finalPayout <= 0) return null;
  const m = await getMarket(pos.marketId);
  if (!m) return null;
  return {
    marketId: pos.marketId,
    marketTitle: m.titleEn,
    side: pos.side,
    stake: pos.stake,
    payout: pos.finalPayout,
    net: pos.finalPayout - pos.stake,
  };
}
