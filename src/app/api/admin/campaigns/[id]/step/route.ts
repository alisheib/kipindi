/**
 * POST /api/admin/campaigns/[id]/step — the live campaign page's driver step, as JSON (U47b-2, the review's MAJOR).
 *
 * ⛔ THIN ON PURPOSE. Every decision is `campaignStepDoor` in `src/app/admin/campaigns/[id]/live-step-door.ts`, where
 * `test:campaign-visuals` V12 drives it in-process: POST only, never cross-site and carrying the page's own `X-Kp-Step: 1` header
 * (both asked before the session is read), the guard
 * first (`softCheckStaff`, growth — the stored role's act grant; a lapsed 2-step refused in words, never redirected to), the
 * viewer from the STORED role, the service `campaignStep`, and a typed `unfinished` answer for a step that threw — never a 500
 * page. The id is the path's; ⛔ THE BODY IS NEVER READ (this file calls neither `req.json()` nor `req.formData()`).
 * This file turns the door's answer into a response, with `Cache-Control: no-store` on every one, and reads no store of its own.
 * ⭐ WHY NOT A SERVER ACTION: Next 16 runs a page's server actions one at a time, so a step that takes seconds held every
 * press — Pause, Stop — behind it. See the door's header.
 *
 * Guard: `npm run test:campaign-visuals` (V12, its plants; V5 holds the guard first) · `npm run test:admin-act-gate` (no acting
 * control reaches this route; the driver fetches it).
 */
import { NextResponse } from "next/server";
import { campaignStepDoor, LIVE_STEP_DOOR_DEPS } from "@/app/admin/campaigns/[id]/live-step-door";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const door = await campaignStepDoor(
    { method: req.method, secFetchSite: req.headers.get("sec-fetch-site"), stepHeader: req.headers.get("x-kp-step"), campaignId: id },
    LIVE_STEP_DOOR_DEPS,
  );
  const res = door.body === null ? new NextResponse(null, { status: door.status }) : NextResponse.json(door.body, { status: door.status });
  res.headers.set("Cache-Control", "private, no-store, max-age=0");
  if (door.allow !== undefined) res.headers.set("Allow", door.allow);
  return res;
}
