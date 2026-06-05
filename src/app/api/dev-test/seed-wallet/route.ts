/**
 * /api/dev-test/seed-wallet — dev-only endpoint to credit a registered
 * user's wallet so end-to-end test scripts can simulate funded players
 * without driving the full deposit flow each time.
 *
 * Returns 404 in production — never reachable on a live deployment.
 *
 *   POST { phone: "+255712345678", amount: 50000 }  →  { ok, balance }
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/server/store";
import { audit } from "@/lib/server/audit";

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  }
  const body = (await req.json().catch(() => null)) as { phone?: string; amount?: number } | null;
  // Defence layers (the fuzz suite caught both):
  //   1. Number.isFinite rejects Infinity / -Infinity / NaN. The old
  //      `amount <= 0` check let Infinity through (Infinity > 0 is true).
  //   2. MAX_SEED_AMOUNT caps inputs that are finite but huge enough
  //      (e.g. 1e308) that adding them to an existing balance overflows
  //      to Infinity, which then serialises as `null` and poisons the
  //      wallet column.
  // No demo flow needs more than TZS 100,000,000 seeded in a single
  // call — set the cap there.
  const MAX_SEED_AMOUNT = 100_000_000;
  if (
    !body?.phone ||
    typeof body.amount !== "number" ||
    !Number.isFinite(body.amount) ||
    body.amount <= 0 ||
    body.amount > MAX_SEED_AMOUNT
  ) {
    return NextResponse.json(
      { ok: false, error: `phone + finite positive amount ≤ ${MAX_SEED_AMOUNT} required` },
      { status: 400 },
    );
  }
  const user = db.user.findByPhone(body.phone);
  if (!user) return NextResponse.json({ ok: false, error: "user not found" }, { status: 404 });
  const w = db.wallet.findByUserId(user.id);
  if (!w) return NextResponse.json({ ok: false, error: "wallet not found" }, { status: 404 });
  const newBal = w.balance + Math.floor(body.amount);
  db.wallet.update(w.id, { balance: newBal });
  audit({
    category: "SECURITY",
    action: "dev_test.wallet_seeded",
    actorId: null,
    targetType: "Wallet",
    targetId: w.id,
    payload: { phone: body.phone, amount: body.amount, by: "dev-test-endpoint" },
  });
  return NextResponse.json({ ok: true, userId: user.id, balance: newBal });
}
