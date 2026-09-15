/**
 * POST /api/pv — the first-party visit counter's endpoint (see `src/lib/server/site-visits.ts`).
 *
 * Public by design: every visitor is counted, signed in or not. So it trusts nothing it is sent:
 *   · same-origin only — a browser's own beacon carries `Sec-Fetch-Site: same-origin`; a cross-site POST is ignored;
 *   · crawlers, previews, monitors and automation are ignored (`isAutomatedAgent`);
 *   · `pv.ip` rate limit, so one client cannot inflate the counts — the IP is the bucket key and nothing else: it is
 *     never stored and never logged;
 *   · the body must be exactly the six-field payload, re-validated server-side (`parseVisitBody`).
 * It ALWAYS answers 204 with no body: the response tells a caller nothing about whether it was counted, and a
 * counting failure can never become an error a page sees.
 */
import { rateCheckAsync } from "@/lib/server/rate-limit";
import { isAutomatedAgent, parseVisitBody, recordVisit } from "@/lib/server/site-visits";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const done = () => new Response(null, { status: 204, headers: { "cache-control": "no-store" } });

export async function POST(req: Request) {
  try {
    const site = req.headers.get("sec-fetch-site");
    if (site && site !== "same-origin") return done();
    if (isAutomatedAgent(req.headers.get("user-agent"))) return done();
    if (Number(req.headers.get("content-length") ?? "0") > 2048) return done();
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!(await rateCheckAsync(ip, "pv.ip")).allowed) return done();
    const payload = parseVisitBody((await req.text()).slice(0, 4096));
    if (!payload) return done();
    await recordVisit(payload, Date.now());
  } catch (err) {
    console.error("[pv] visit count failed:", (err as Error)?.message ?? err);
  }
  return done();
}
