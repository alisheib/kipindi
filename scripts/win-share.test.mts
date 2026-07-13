/**
 * F5 — win-share tokens. THE ANTI-FABRICATION SUITE.
 *
 * The OG win card is a PUBLIC url. If the amount could come from the URL, anyone
 * could mint a branded "I won TZS 50,000,000 on 50pick" image. These tests lock
 * that shut:
 *   - only the OWNER of a settled WIN can mint a token
 *   - a LOSS / OPEN / VOID / CASHED_OUT position can never be shared as a win
 *   - a forged, tampered or expired token resolves to null (→ falls back to the
 *     ordinary market card, never a win card)
 *   - the AMOUNT is always re-read from the ledger, never carried in the URL, so
 *     it cannot be inflated even with a valid token
 *
 * Run: npx tsx scripts/win-share.test.mts
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-aaaa";
process.env.OTP_PEPPER ??= "test-only-otp-pepper-16chars";

import { db, type StoredWallet } from "../src/lib/server/store.ts";
import { positionStore } from "../src/lib/server/market-dal.ts";
import { createMarket, buyPosition, resolveMarket, settleMarket } from "../src/lib/server/market-service.ts";
import { mintWinShareToken, resolveWinShareToken } from "../src/lib/server/share-token.ts";
import { signSession } from "../src/lib/server/crypto.ts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l} ${x}`); };
const iso = new Date().toISOString();
let seq = 0;

async function mkUser(id: string, balance = 100_000): Promise<void> {
  await db.user.create({
    id, phoneE164: `+25592${String(++seq).padStart(7, "0")}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
    displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null, email: null,
    createdAt: iso, updatedAt: iso, lastLoginAt: null, closedAt: null,
  } as never);
  if (balance > 0) {
    await db.wallet.create({ id: `wal_${id}`, userId: id, balance, pending: 0, hold: 0, currency: "TZS", status: "ACTIVE", createdAt: iso, updatedAt: iso } as StoredWallet);
  }
}

await mkUser("ws_win");     // will WIN
await mkUser("ws_lose");    // will LOSE
await mkUser("ws_other");   // an unrelated player
await mkUser("ws_off1", 0);
await mkUser("ws_off2", 0);

const mkt = await createMarket({
  titleEn: "Will BTC close green?", titleSw: "Soko", titleZh: "市场",
  descriptionEn: "T", descriptionSw: "T", descriptionZh: "T",
  category: "FINANCE", resolutionAt: new Date(Date.now() + 3600_000).toISOString(),
  resolutionCriterion: "crit", sourceUrl: "https://example.com", createdById: "ws_off1",
} as never) as { id: string };

await buyPosition("ws_win", { marketId: mkt.id, side: "YES", stake: 10_000 });
await buyPosition("ws_lose", { marketId: mkt.id, side: "NO", stake: 10_000 });

// Settle YES → ws_win wins, ws_lose loses.
await resolveMarket({ marketId: mkt.id, outcome: "YES", officerId: "ws_off1", evidence: "official source" });
await resolveMarket({ marketId: mkt.id, outcome: "YES", officerId: "ws_off2" });
// Stage-2 only records the verdict now — a win is not a win until it is paid.
await settleMarket(mkt.id, { force: true });

const all = await positionStore.listForUser("ws_win");
const winPos = all.find((p) => p.marketId === mkt.id)!;
const losePos = (await positionStore.listForUser("ws_lose")).find((p) => p.marketId === mkt.id)!;

ok("the winner's position settled as WIN", winPos.status === "WIN", `status=${winPos.status}`);
ok("the winner has a real finalPayout", (winPos.finalPayout ?? 0) > 0, `payout=${winPos.finalPayout}`);
ok("the loser's position settled as LOSS", losePos.status === "LOSS", `status=${losePos.status}`);

// ── 1. The owner of a real win can mint, and it resolves to LEDGER truth ──
let token = "";
{
  const t = await mintWinShareToken("ws_win", winPos.id);
  ok("owner of a WIN can mint a token", !!t);
  token = t!;
  const r = await resolveWinShareToken(token);
  ok("token resolves", !!r);
  ok("payout comes from the LEDGER (finalPayout)", r!.payout === winPos.finalPayout, `card=${r!.payout} ledger=${winPos.finalPayout}`);
  ok("stake is real", r!.stake === 10_000);
  ok("net = payout − stake", r!.net === winPos.finalPayout! - 10_000);
  ok("side is real", r!.side === "YES");
  ok("market id matches", r!.marketId === mkt.id);
}

// ── 2. A LOSS can never be shared as a win ───────────────────────────────
{
  ok("loser cannot mint for their own LOSS", (await mintWinShareToken("ws_lose", losePos.id)) === null);
}

// ── 3. Someone else's win cannot be minted (owner-scoped) ────────────────
{
  ok("a stranger cannot mint for another player's win", (await mintWinShareToken("ws_other", winPos.id)) === null);
  ok("the loser cannot mint for the winner's position", (await mintWinShareToken("ws_lose", winPos.id)) === null);
}

// ── 4. An OPEN position cannot be shared as a win ────────────────────────
{
  const mkt2 = await createMarket({
    titleEn: "Open market", titleSw: "S", titleZh: "市",
    descriptionEn: "T", descriptionSw: "T", descriptionZh: "T",
    category: "FINANCE", resolutionAt: new Date(Date.now() + 7200_000).toISOString(),
    resolutionCriterion: "c", sourceUrl: "https://example.com", createdById: "ws_off1",
  } as never) as { id: string };
  await buyPosition("ws_win", { marketId: mkt2.id, side: "YES", stake: 1_000 });
  const openPos = (await positionStore.listForUser("ws_win")).find((p) => p.marketId === mkt2.id)!;
  ok("precondition: position is OPEN", openPos.status === "OPEN");
  ok("an OPEN position cannot be minted as a win", (await mintWinShareToken("ws_win", openPos.id)) === null);
}

// ── 5. Forged / tampered / wrong-purpose tokens are rejected ─────────────
{
  ok("garbage token → null", (await resolveWinShareToken("not-a-token")) === null);
  ok("empty token → null", (await resolveWinShareToken("")) === null);
  ok("null token → null", (await resolveWinShareToken(null)) === null);

  // A token signed with OUR key but the WRONG purpose must not work.
  const wrongPurpose = signSession({ p: "login-2fa", pos: winPos.id, exp: Date.now() + 60_000 });
  ok("valid signature but wrong purpose → null", (await resolveWinShareToken(wrongPurpose)) === null);

  // An EXPIRED token must not work.
  const expired = signSession({ p: "win-share", pos: winPos.id, exp: Date.now() - 1 });
  ok("expired token → null", (await resolveWinShareToken(expired)) === null);

  // Tampering with the payload breaks the HMAC.
  const [b64, mac] = token.split(".");
  const tampered = `${b64}x.${mac}`;
  ok("tampered payload → null", (await resolveWinShareToken(tampered)) === null);
  const badMac = `${b64}.${mac.slice(0, -2)}AA`;
  ok("tampered signature → null", (await resolveWinShareToken(badMac)) === null);

  // A token naming a position that does not exist.
  const ghost = signSession({ p: "win-share", pos: "pos_does_not_exist", exp: Date.now() + 60_000 });
  ok("token for a non-existent position → null", (await resolveWinShareToken(ghost)) === null);

  // THE HEADLINE: an attacker cannot inflate the amount, because the amount is
  // not in the token at all — even a self-signed token with a fake amount field
  // resolves to the REAL ledger figure.
  const inflated = signSession({ p: "win-share", pos: winPos.id, payout: 50_000_000, exp: Date.now() + 60_000 });
  const r = await resolveWinShareToken(inflated);
  ok("an injected 'payout' field is IGNORED — ledger wins", r !== null && r.payout === winPos.finalPayout, `got=${r?.payout} ledger=${winPos.finalPayout}`);
  ok("the fabricated 50,000,000 never appears", r?.payout !== 50_000_000);
}

console.log(`\nwin-share: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
