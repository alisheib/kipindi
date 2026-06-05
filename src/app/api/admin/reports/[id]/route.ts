/**
 * /api/admin/reports/[id]?format=xlsx|pdf
 *
 * Streams a branded report file to the caller. Both routes go through
 * the same admin gate as every other /admin/* page (role check inside
 * + middleware 307 outside).
 *
 *   GET /api/admin/reports/gbt-monthly?format=xlsx
 *   GET /api/admin/reports/tra-tax?format=pdf
 *
 * The buttons in /admin/reports/page.tsx call these URLs in a new tab;
 * the browser handles the download via Content-Disposition.
 */
import { NextResponse } from "next/server";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { audit } from "@/lib/server/audit";
import { REPORT_CATALOGUE, type ReportId } from "@/lib/server/reports/catalogue";
import { renderXlsx } from "@/lib/server/reports/xlsx";
import { renderPdf } from "@/lib/server/reports/pdf";
import { reportFilename } from "@/lib/server/reports/brand";
import { displayLabel } from "@/lib/display-label";

const ADMIN_ROLES = new Set(["ADMIN", "COMPLIANCE", "MODERATOR"]);

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await currentSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorised" }, { status: 401 });
  }
  const u = db.user.findById(session.userId);
  if (!u || !ADMIN_ROLES.has(u.role)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const entry = REPORT_CATALOGUE[id as ReportId];
  if (!entry) {
    return NextResponse.json({ ok: false, error: "Unknown report" }, { status: 404 });
  }

  const url = new URL(req.url);
  const format = (url.searchParams.get("format") ?? "xlsx").toLowerCase();
  if (format !== "xlsx" && format !== "pdf") {
    return NextResponse.json({ ok: false, error: "Format must be xlsx or pdf" }, { status: 400 });
  }

  // Build the report from the live store. Generator label uses the
  // canonical display helper so a regulator opening the file sees
  // "Player #A3F2K8" or the real name (when set), never a raw user id.
  const generatorLabel = displayLabel(u);
  const report = entry.build(generatorLabel);

  let body: Buffer;
  let mime: string;
  try {
    if (format === "xlsx") {
      body = await renderXlsx(report);
      mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    } else {
      body = await renderPdf(report);
      mime = "application/pdf";
    }
  } catch (err) {
    const msg = String((err as Error)?.message ?? err);
    const stack = String((err as Error)?.stack ?? "");
    console.error(`[report:${id}.${format}] FAILED`, msg, stack);
    audit({
      category: "SYSTEM",
      action: `report.${id}.failed`,
      actorId: session.userId,
      targetType: null, targetId: null,
      payload: { format, error: msg.slice(0, 500) },
    });
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
  const filename = reportFilename(entry.name, format);

  audit({
    category: "ADMIN",
    action: `report.${id}.generated`,
    actorId: session.userId,
    targetType: null,
    targetId: null,
    payload: {
      format,
      filename,
      reference: report.reference,
      sizeBytes: body.length,
    },
  });

  return new NextResponse(body as unknown as BodyInit, {
    status: 200,
    headers: {
      "content-type": mime,
      "content-disposition": `attachment; filename="${filename}"`,
      "content-length": String(body.length),
      "cache-control": "no-store, max-age=0",
      "x-report-reference": report.reference,
    },
  });
}
