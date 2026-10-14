/** Explicit same-origin tap only. This endpoint never creates or dispatches a payment. */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/session";
import { recheckDepositStatus } from "@/lib/server/deposit-recheck";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const PRIVATE = { "Cache-Control": "private, no-store" };

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  // Modern browser fetch metadata is browser-controlled; the extra non-simple header requires same-origin fetch
  // or a successful CORS preflight (none is enabled here). Missing/none/same-site/cross-site are refused too.
  if (req.method !== "POST" || req.headers.get("sec-fetch-site") !== "same-origin"
    || req.headers.get("x-kp-deposit-recheck") !== "1") {
    return NextResponse.json({ state: "UNKNOWN" }, { status: 403, headers: PRIVATE });
  }
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401, headers: PRIVATE });
    const { id } = await ctx.params;
    const result = await recheckDepositStatus(session.userId, id);
    return NextResponse.json(result.view, { status: result.rateLimited ? 429 : result.unavailable ? 503 : 200, headers: PRIVATE });
  } catch {
    return NextResponse.json({ state: "UNKNOWN" }, { status: 503, headers: PRIVATE });
  }
}
