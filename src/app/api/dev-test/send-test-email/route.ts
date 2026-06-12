import { NextResponse } from "next/server";
import { sendEmail, welcomeHtml } from "@/lib/server/email";

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Dev-only endpoint" }, { status: 404 });
  }
  const body = await req.json().catch(() => ({}));
  const to = body.to as string | undefined;
  if (!to) return NextResponse.json({ error: "Missing 'to' field" }, { status: 400 });

  const result = await sendEmail({
    to,
    subject: "50pick test email · Barua pepe ya majaribio",
    html: welcomeHtml({ name: "Ali" }),
    tag: "test",
  });

  return NextResponse.json(result);
}
