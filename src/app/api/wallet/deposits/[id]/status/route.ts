import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/session";
import { readDepositStatus } from "@/lib/server/deposit-status";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const PRIVATE = { "Cache-Control": "private, no-store" };

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401, headers: PRIVATE });
    const { id } = await ctx.params;
    const result = await readDepositStatus(session.userId, { kind: "txn-id", value: id });
    return NextResponse.json(result.view, { status: result.rateLimited ? 429 : 200, headers: PRIVATE });
  } catch {
    return NextResponse.json({ state: "UNKNOWN" }, { status: 503, headers: PRIVATE });
  }
}
