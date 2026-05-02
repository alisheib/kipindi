import { NextResponse } from "next/server";
import { logout } from "@/lib/server/auth-service";

export async function POST() {
  await logout();
  return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
}

export async function GET() {
  // Convenience for non-JS browsers / direct nav
  await logout();
  return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
}
