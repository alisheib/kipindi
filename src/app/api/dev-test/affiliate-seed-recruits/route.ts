/**
 * /api/dev-test/affiliate-seed-recruits — dev-only. Binds N fresh recruits to
 * an existing referral code so a populated Invite & Earn page can be rendered
 * deterministically (no registration-form/rate-limit flakiness). Optionally
 * fires a first bet per recruit so the "Earning" status chip + commission show.
 *
 * 404 in production. POST { code, n?, activity? }.
 */
import { NextResponse, type NextRequest } from "next/server";
import { db, type StoredUser } from "@/lib/server/store";
import { randomId } from "@/lib/server/crypto";
import { bindRecruit, onRecruitBet } from "@/lib/server/affiliate-service";

async function mkUser(displayName: string) {
  const id = `usr_${randomId(12)}`;
  const now = new Date().toISOString();
  const u = await db.user.create({
    id, phoneE164: `+25565${Math.floor(Math.random() * 9_000_000 + 1_000_000)}`,
    passwordHash: "x", passwordSalt: "x", failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "ACTIVE", locale: "SW", displayName, dob: "1995-01-01",
    region: null, acceptedTermsVersion: "v1", acceptedTermsAt: now, marketingOptIn: false,
    twoFactorEnabled: false, avatarDataUrl: null, createdAt: now, updatedAt: now,
    lastLoginAt: now, closedAt: null, recruitedBy: null,
  });
  await db.wallet.create({ id: `wlt_${randomId(12)}`, userId: id, balance: 0, pending: 0, hold: 0, currency: "TZS", status: "ACTIVE", createdAt: now, updatedAt: now });
  return u;
}

const NAMES = ["Juma Said", "Neema Kato", "Baraka Mwita", "Asha Juma", "Emanuel Toi", "Rehema Paul"];

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  const { code, n = 2, activity = true } = (await req.json().catch(() => ({}))) as { code?: string; n?: number; activity?: boolean };
  if (!code) return NextResponse.json({ ok: false, error: "code required" }, { status: 400 });
  if (!await db.affiliate.findByCode(code)) return NextResponse.json({ ok: false, error: "unknown code" }, { status: 404 });

  let bound = 0;
  for (let i = 0; i < Math.min(20, Math.max(1, n)); i++) {
    const rec = await mkUser(NAMES[i % NAMES.length]);
    const r = await bindRecruit({ recruitUserId: rec.id, code });
    if (r.bound) {
      bound++;
      if (activity && i % 2 === 0) await onRecruitBet(rec.id, { stake: 50_000, operatorCommissionRate: 0.03 });
    }
  }
  return NextResponse.json({ ok: true, bound });
}
