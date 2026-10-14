/** Explicit same-origin tap only. This endpoint never creates or dispatches a payment. */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/session";
import { recheckDepositStatus } from "@/lib/server/deposit-recheck";
import { DEPOSIT_RECHECK_MAX_BYTES } from "@/lib/journey/deposit-recheck-binding";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const PRIVATE = { "Cache-Control": "private, no-store" };

/** Bound streamed bytes too: a missing/lying Content-Length must not allocate an unbounded payment body. */
async function bodyBinding(req: Request): Promise<unknown> {
  const declared = req.headers.get("content-length");
  if (declared !== null && (!/^[0-9]+$/.test(declared) || Number(declared) > DEPOSIT_RECHECK_MAX_BYTES)) return null;
  const reader = req.body?.getReader();
  if (!reader) return null;
  let bytes = 0, text = "";
  const decoder = new TextDecoder("utf-8", { fatal: true });
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > DEPOSIT_RECHECK_MAX_BYTES) { await reader.cancel(); return null; }
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } catch { return null; }
  finally { reader.releaseLock(); }
}

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
    const binding = await bodyBinding(req);
    const { id } = await ctx.params;
    const result = await recheckDepositStatus(session.userId, id, binding);
    return NextResponse.json(result.view, { status: result.rateLimited ? 429 : result.unavailable ? 503 : 200, headers: PRIVATE });
  } catch {
    return NextResponse.json({ state: "UNKNOWN" }, { status: 503, headers: PRIVATE });
  }
}
