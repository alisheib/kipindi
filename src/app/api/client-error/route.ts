/**
 * POST /api/client-error — where a browser says "my render threw", so a human can read it.
 *
 * 🔴 IT EXISTS BECAUSE A CLIENT-SIDE CRASH ON THIS PLATFORM WAS INVISIBLE. React renders the
 * route's `error.tsx` and the response is still **200**; `error.digest` exists only for a SERVER
 * throw; and `RouteError` logged to a console nobody can read on a phone. On 2026-09-18 that
 * combination cost two sessions on one player's handset — see `src/lib/server/client-error.ts`.
 *
 * Modelled on `/api/pv`, and it trusts nothing it is sent:
 *   · same-origin only — a real browser beacon carries `Sec-Fetch-Site: same-origin`;
 *   · crawlers, monitors and automation ignored (`isAutomatedAgent`), so a scanner tripping an
 *     error boundary cannot fill the log;
 *   · content-length capped before the body is read at all;
 *   · `clientError.ip` rate limit — tight, because a render LOOP would beacon every re-render
 *     and the tenth copy of one crash teaches nothing. The IP is the bucket key and nothing
 *     else: never stored, never logged;
 *   · the body is re-validated and SCRUBBED server-side (`parseClientErrorBody`), so no stake,
 *     balance, phone number, email or token can reach a log line.
 *
 * ⛔ IT ALWAYS ANSWERS 204 WITH NO BODY. The response tells the caller nothing, and a reporting
 * failure can never become an error the page sees — this endpoint serves the one surface in the
 * product that must never itself throw.
 */
import { rateCheckAsync } from "@/lib/server/rate-limit";
import { isAutomatedAgent } from "@/lib/server/site-visits";
import { parseClientErrorBody, recordClientError } from "@/lib/server/client-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const done = () => new Response(null, { status: 204, headers: { "cache-control": "no-store" } });

export async function POST(req: Request) {
  try {
    const site = req.headers.get("sec-fetch-site");
    if (site && site !== "same-origin") return done();
    const ua = req.headers.get("user-agent");
    if (isAutomatedAgent(ua)) return done();
    if (Number(req.headers.get("content-length") ?? "0") > 8192) return done();
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!(await rateCheckAsync(ip, "clientError.ip")).allowed) return done();
    const report = parseClientErrorBody((await req.text()).slice(0, 16_384));
    if (!report) return done();
    recordClientError(report, ua);
  } catch (err) {
    // ⛔ Never rethrow: see the header. The report is a nice-to-have; the page is not.
    console.error("[client-error] report failed:", (err as Error)?.message ?? err);
  }
  return done();
}
