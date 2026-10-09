/**
 * `/offline` — THE SERVICE WORKER'S OFFLINE DOCUMENT (`public/sw.js` precaches it and shows it to any navigation the
 * network could not answer). The document itself, and why it is built the way it is, is `src/lib/offline-document.ts`.
 *
 * 🔴 A ROUTE HANDLER, NOT A PAGE — AND THAT IS THE FIX, NOT A STYLE (R4-G, 2026-10-09). As `page.tsx` it was rendered
 * inside the root layout, so the copy the worker cached was AppShell for whoever was signed in at that moment — their
 * header, their balance, the staff preview strip — in the language of that moment, and it hydrated into a mismatch
 * when shown at another address. A route handler renders no layout, no shell and no React: the answer is one string.
 * ⛔ IT READS NOTHING FROM THE REQUEST. No `cookies()`, no `headers()`, no session — the only input is the public
 * licence number (`/admin/system`), so every visitor is sent the same bytes, and nothing about a person can be cached.
 * `test:offline-neutral` holds this file to that (and plants a session read to prove it would see one).
 * ⛔ 200, not 503: `cache.add` refuses a response that is not ok, and the worker would have nothing to show.
 */
import { getSupportConfig } from "@/lib/server/support-config";
import { offlineDocument } from "@/lib/offline-document";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(): Response {
  return new Response(offlineDocument({ licenceNumber: getSupportConfig().licenceNumber }), {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}
