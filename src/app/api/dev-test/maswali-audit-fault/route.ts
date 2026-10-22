/**
 * DEV ONLY — arm ONE lost audit write, for the Millionea console's acceptance drive (S5-FIX-SRV): the drive can then see
 * an act that LANDED without its audit record, and read the console's warning for it at 360 and 1280
 * (`qa:maswali-admin-drive`). 404 in production; 409 on a database (the in-memory store only); a staff session only.
 *
 *   POST { action: "maswali.week.opened" | "maswali.week.close_moved" | "maswali.week.voided" | "maswali.sunset.ordered" }
 *     →  { ok: true, armed: <action> }
 *
 * The next row an act OWES with that action (`recordOwed`, maswali-service.ts) is reported not recorded and is NOT written —
 * the shape of a real lost write, which `audit` reports as `recorded: false` with no row — and the writer is restored at
 * once, so every row after it is written as always. Nothing else is touched: the act itself lands as it always does.
 */
import { NextResponse } from "next/server";
import { currentSession } from "@/lib/server/auth-service";
import { hasDatabase } from "@/lib/server/prisma";
import { audit } from "@/lib/server/audit";
import { __setMaswaliAuditWriterForTests } from "@/lib/server/maswali-service";

const ARMABLE = ["maswali.week.opened", "maswali.week.close_moved", "maswali.week.voided", "maswali.sunset.ordered"];
const reply = (body: object, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  }
  if (process.env.DATABASE_URL || hasDatabase()) {
    return reply({ ok: false, error: "In-memory local evidence only" }, 409);
  }
  const session = await currentSession();
  if (!session) return reply({ ok: false, error: "Sign in required" }, 401);
  if (session.role === "PLAYER" || session.role === "AGENT") return reply({ ok: false, error: "A staff session only" }, 403);
  const input = await req.json().catch(() => null);
  const action = input && typeof input === "object" && !Array.isArray(input) ? (input as { action?: unknown }).action : undefined;
  if (typeof action !== "string" || !ARMABLE.includes(action)) return reply({ ok: false, error: `Arm one of: ${ARMABLE.join(", ")}` }, 400);
  let spent = false;
  __setMaswaliAuditWriterForTests(async (row) => {
    if (spent || row.action !== action) return audit(row);
    spent = true;
    __setMaswaliAuditWriterForTests(null);
    return { recorded: false };
  });
  return reply({ ok: true, armed: action });
}
