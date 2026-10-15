/** The real registration email's confirmation link, readable by its signed-in owner in local development only. */
import { NextResponse } from "next/server";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { emailOutbox } from "@/lib/server/email";
import { hasDatabase } from "@/lib/server/prisma";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  }
  if (process.env.DATABASE_URL || hasDatabase()) {
    return NextResponse.json({ ok: false, error: "In-memory local evidence only" }, { status: 409 });
  }
  if (process.env.EMAIL_OUTBOX_CAPTURE !== "1") {
    return NextResponse.json({ ok: false, error: "Email outbox capture is not armed" }, { status: 409 });
  }
  const session = await currentSession();
  if (!session) return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
  const owner = await db.user.findById(session.userId);
  if (!owner?.email) return NextResponse.json({ ok: false, error: "No email" }, { status: 404 });
  const message = emailOutbox().filter((entry) =>
    entry.to.toLowerCase() === owner.email!.toLowerCase() && entry.tag === "email-verify").at(-1);
  const encoded = message?.html.match(/href="([^"]*\/auth\/verify-email\?token=[^"]+)"/)?.[1];
  if (!encoded) return NextResponse.json({ ok: false, error: "No captured confirmation link" }, { status: 404 });
  const url = encoded.replaceAll("&amp;", "&");
  return NextResponse.json({ ok: true, url }, { headers: { "Cache-Control": "no-store" } });
}
