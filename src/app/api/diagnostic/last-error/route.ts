import { NextResponse } from "next/server";

export async function GET() {
  const g = globalThis as unknown as { __50PICK_LAST_ERRORS?: unknown[] };
  return NextResponse.json({ count: (g.__50PICK_LAST_ERRORS ?? []).length, errors: g.__50PICK_LAST_ERRORS ?? [] });
}
