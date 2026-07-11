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
import { CONFIG_ROLES } from "@/lib/server/roles";
import { checkAdminTotp } from "@/lib/server/admin-guard";

const ADMIN_ROLES = CONFIG_ROLES; // role tier — see @/lib/server/roles

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await currentSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorised" }, { status: 401 });
  }
  const u = await db.user.findById(session.userId);
  if (!u || !ADMIN_ROLES.has(u.role)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  // Step-up 2FA (audit finding B3): a direct GET to this URL skips the admin
  // layout's TOTP gate. Regulator-grade financial reports must require a
  // satisfied TOTP cookie here too — 403 rather than a redirect (which would
  // corrupt the download).
  if ((await checkAdminTotp(session.userId, session.sessionId)) !== "ok") {
    return NextResponse.json({ ok: false, error: "2FA required" }, { status: 403 });
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

  // Build the report from the live store. Pass the actual userId so
  // the catalogue's regulatorSignatures() can look up the display name
  // itself. Previously this passed displayLabel(u) which broke the
  // db.user.findById() lookup inside every builder.
  const report = await entry.build(session.userId);

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
