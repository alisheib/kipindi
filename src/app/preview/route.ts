/**
 * `/preview` — THE ONE PLACE THE PREVIEW PASS IS WRITTEN (the Vodacom plan S1; the decisions are in
 * `src/lib/server/journey-preview-doors.ts`).
 *
 *   POST  intent=on   a staff member turns their preview on   → 303 to `/` wearing the "Preview" marker
 *   POST  intent=off  anybody takes the pass out of their browser → 303 to `/` (or back to `/admin/journey`)
 *   GET   ?t=…        somebody opens a preview link the Owner issued → 303 to `/`
 *   GET   (no t)      → 303 to `/`
 *
 * ⭐ EVERY ANSWER IS A 303 — A DOCUMENT NAVIGATION. AppShell (the root layout) paints the marker, and only a
 * document load re-runs it; a soft navigation would leave the old shell on screen (E-70, `test:shell-boundary`).
 * ⛔ GET changes state ONLY for a signed link, because a link is what a person can be sent. On and off are POSTs,
 * and `on` refuses a cross-site request (`Sec-Fetch-Site`).
 * ⛔ The browser is sent to the PUBLIC host — on Railway `req.url` is the container (see `auth/session-ended`).
 * ⛔ `private, no-store` on every answer: a 303 that sets a pass must never be cached for somebody else.
 */
import { NextResponse, type NextRequest } from "next/server";
import { cookies, headers } from "next/headers";
import { currentSession } from "@/lib/server/auth-service";
import { checkAdminTotp, type AdminTotpStatus } from "@/lib/server/admin-guard";
import { JOURNEY_PREVIEW_COOKIE } from "@/lib/server/journey-preview";
import { previewLinkDoor, previewOffDoor, previewOnDoor, type DoorAnswer } from "@/lib/server/journey-preview-doors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function publicBase(req: NextRequest): Promise<string> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
  const host = h.get("host") ?? h.get("x-forwarded-host") ?? req.nextUrl.host;
  return `${proto}://${host}`;
}

async function answer(req: NextRequest, door: DoorAnswer): Promise<NextResponse> {
  const to = /^\/(?![/\\])/.test(door.to) ? door.to : "/";
  const res = NextResponse.redirect(`${await publicBase(req)}${to}`, 303);
  res.headers.set("Cache-Control", "private, no-store, max-age=0");
  if (door.set) {
    res.cookies.set(JOURNEY_PREVIEW_COOKIE, door.set.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: door.set.maxAgeSec,
    });
  } else if (door.clear) {
    res.cookies.set(JOURNEY_PREVIEW_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
  }
  return res;
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("t");
  if (!token) return answer(req, { to: "/" });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  return answer(req, await previewLinkDoor({ token, ip }));
}

export async function POST(req: NextRequest) {
  let intent = "";
  let back = "";
  try {
    const form = await req.formData();
    intent = String(form.get("intent") ?? "");
    back = String(form.get("back") ?? "");
  } catch {
    return answer(req, { to: "/" });
  }
  if (intent === "off") {
    const jar = await cookies();
    return answer(req, await previewOffDoor({ cookie: jar.get(JOURNEY_PREVIEW_COOKIE)?.value, back }));
  }
  if (intent !== "on") return answer(req, { to: "/" });
  const session = await currentSession();
  const totp: AdminTotpStatus = session ? await checkAdminTotp(session.userId, session.sessionId) : "unverified";
  return answer(req, await previewOnDoor({ viewerUserId: session?.userId ?? null, totp, secFetchSite: req.headers.get("sec-fetch-site") }));
}
