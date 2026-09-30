/**
 * POST /api/funnel — the journey funnel's browser endpoint (the Vodacom plan S3b, §0f; see
 * `src/lib/server/journey-funnel.ts` and the one allow-list in `src/lib/journey/funnel.ts`).
 *
 * The visit counter's rules (`/api/pv`), exactly, because it faces the same internet:
 *   · same-origin only — a browser's own beacon carries `Sec-Fetch-Site: same-origin`; a cross-site POST is ignored;
 *   · crawlers, previews, monitors and automation are ignored (`isAutomatedAgent`);
 *   · `funnel.ip` rate limit — the IP is the bucket key and nothing else: never stored, never logged;
 *   · the body must be exactly the beacon's five tags for a BROWSER step (`parseFunnelBody`) — a bet or a confirmed
 *     deposit can only be counted by the server, where the money moved.
 * ⛔ It reads no cookie and sets none: WHO is counted (not staff, not a preview) was decided by the server that rendered
 * the page, which is where the beacon read its scope.
 * It ALWAYS answers 204 with no body: a caller learns nothing, and a counting failure never becomes a page error.
 */
import { rateCheckAsync } from "@/lib/server/rate-limit";
import { isAutomatedAgent } from "@/lib/server/site-visits";
import { recordFunnel } from "@/lib/server/journey-funnel";
import { parseFunnelBody } from "@/lib/journey/funnel";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const done = () => new Response(null, { status: 204, headers: { "cache-control": "no-store" } });

export async function POST(req: Request) {
  try {
    const site = req.headers.get("sec-fetch-site");
    if (site && site !== "same-origin") return done();
    if (isAutomatedAgent(req.headers.get("user-agent"))) return done();
    if (Number(req.headers.get("content-length") ?? "0") > 512) return done();
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!(await rateCheckAsync(ip, "funnel.ip")).allowed) return done();
    const event = parseFunnelBody((await req.text()).slice(0, 1024));
    if (!event) return done();
    await recordFunnel(event, Date.now());
  } catch (err) {
    console.error("[funnel] count failed:", (err as Error)?.message ?? err);
  }
  return done();
}
