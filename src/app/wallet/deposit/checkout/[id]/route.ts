import { NextResponse } from "next/server";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { activeCardCheckoutUrl } from "@/lib/card-checkout-url";

export const dynamic = "force-dynamic";

/** A deliberate click reopens the original Selcom order; this route never creates a payment. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9_-]{1,128}$/i.test(id)) return new Response("Not found", { status: 404 });
  const session = await currentSession();
  if (!session) return NextResponse.redirect(new URL(`/auth/login?next=${encodeURIComponent(`/wallet/deposit/wait/${id}`)}`, request.url));
  const row = await db.txn.findById(id);
  if (!row || row.userId !== session.userId || row.type !== "DEPOSIT" || row.houseBotId != null) {
    return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  const url = activeCardCheckoutUrl(session.userId, row);
  if (!url) return NextResponse.redirect(new URL(`/wallet/deposit/wait/${encodeURIComponent(id)}`, request.url));
  return NextResponse.redirect(url, { status: 303, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
