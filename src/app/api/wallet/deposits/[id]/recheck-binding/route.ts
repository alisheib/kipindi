/** Read only: an owner can request the original funding capsule for an explicit signed recheck. */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/session";
import { db } from "@/lib/server/store";
import { rateCheckAsync } from "@/lib/server/rate-limit";
import { depositProjection, ownedDeposit } from "@/lib/journey/deposit-state";
import { depositRecheckBinding } from "@/lib/journey/deposit-recheck-binding";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const PRIVATE = { "Cache-Control": "private, no-store" };
const unknown = (status = 404) => NextResponse.json({ binding: null }, { status, headers: PRIVATE });

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return unknown(401);
    const { id } = await context.params;
    if (!/^[a-z0-9_-]{1,128}$/i.test(id)) return unknown();
    const rate = await rateCheckAsync(session.userId, "deposit.status");
    if (!rate.allowed) return unknown(429);
    const row = await db.txn.findById(id);
    if (!ownedDeposit(session.userId, row) || depositProjection(session.userId, row, Date.now()).state !== "FAILED") return unknown();
    const binding = depositRecheckBinding(session.userId, row);
    return binding ? NextResponse.json({ binding }, { headers: PRIVATE }) : unknown();
  } catch { return unknown(503); }
}
