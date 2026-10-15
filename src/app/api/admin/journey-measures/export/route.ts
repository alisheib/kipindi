/** S13 agency exports. The audited row must land before any file byte is returned. */
import { NextResponse } from "next/server";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { audit } from "@/lib/server/audit";
import { canView } from "@/lib/server/rbac";
import { checkAdminTotp } from "@/lib/server/admin-guard";
import { exportRequestAllowed } from "@/lib/server/contacts/export";
import { renderPdf } from "@/lib/server/reports/pdf";
import { renderXlsx } from "@/lib/server/reports/xlsx";
import { buildJourneyMeasuresCsv, buildJourneyMeasuresDocument, measuresDocumentFilename, measuresDocumentReference } from "@/lib/server/journey-measures-doc";
import { journeyMeasuresView, retainedFromDay, type MeasuresPeriod } from "@/lib/server/journey-measures";
import { addDays, addMonths, nextMondayAfter, weekdayOf } from "@/lib/journey/measures";
import { eatDayKey } from "@/lib/eat-day";

export const dynamic = "force-dynamic";

const MIME = {
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv; charset=utf-8",
} as const;
type Format = keyof typeof MIME;

/** Reject bad, ancient and future windows before making a database read. */
export function parseMeasuresExportPeriod(sp: URLSearchParams, nowMs: number): MeasuresPeriod | null {
  const kind = sp.get("period");
  const today = eatDayKey(nowMs);
  const retained = retainedFromDay(nowMs);
  if (kind === "baseline" && !sp.has("week") && !sp.has("month")) return { kind: "baseline" };
  if (kind === "week" && !sp.has("month")) {
    const monday = sp.get("week") ?? "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(monday)) return null;
    const date = new Date(`${monday}T00:00:00.000Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== monday || weekdayOf(monday) !== 0) return null;
    if (addDays(monday, -7) < retained || monday > today) return null;
    return { kind: "week", monday };
  }
  if (kind === "month" && !sp.has("week")) {
    const month = sp.get("month") ?? "";
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null;
    if (`${month}-01` < retained || month > today.slice(0, 7)) return null;
    return { kind: "month", month };
  }
  return null;
}

export async function GET(req: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorised" }, { status: 401 });
  // Re-read the stored role. A stale session role cannot authorise an agency file.
  const user = await db.user.findById(session.userId);
  if (!user || !(user.role === "ADMIN" || (await canView(user.role, "accounting")))) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  if ((await checkAdminTotp(session.userId, session.sessionId)) !== "ok") {
    return NextResponse.json({ ok: false, error: "2FA required" }, { status: 403 });
  }
  if (!exportRequestAllowed(req.headers.get("sec-fetch-site"))) {
    return NextResponse.json({ ok: false, error: "Downloads must be started from 50pick itself." }, { status: 403 });
  }

  const sp = new URL(req.url).searchParams;
  const format = sp.get("format")?.toLowerCase();
  if (format !== "pdf" && format !== "xlsx" && format !== "csv") {
    return NextResponse.json({ ok: false, error: "Format must be pdf, xlsx or csv" }, { status: 400 });
  }
  const nowMs = Date.now();
  const period = parseMeasuresExportPeriod(sp, nowMs);
  if (!period) return NextResponse.json({ ok: false, error: "Unreadable or future period — nothing was generated." }, { status: 400 });
  const campaign = sp.get("campaign");
  const view = await journeyMeasuresView({ period, campaign, nowMs, fresh: true, includeHarm: false }).catch(() => null);
  if (!view || view.launch.state === "unreadable") {
    return NextResponse.json({ ok: false, error: "The launch record could not be read. Nothing was generated." }, { status: 503 });
  }
  if (campaign !== null && view.campaign !== campaign.trim().toLowerCase()) {
    return NextResponse.json({ ok: false, error: "Unreadable campaign — nothing was generated." }, { status: 400 });
  }
  if (period.kind === "week" && (!view.schedule.mondays.includes(period.monday) || period.monday > view.schedule.today)) {
    return NextResponse.json({ ok: false, error: "That weekly report is not due." }, { status: 400 });
  }
  if (period.kind === "month") {
    const lastWeeklyMonday = view.schedule.mondays.at(-1);
    const monthDue = nextMondayAfter(addDays(`${addMonths(period.month, 1)}-01`, -1));
    if (!lastWeeklyMonday || monthDue <= lastWeeklyMonday || monthDue > view.schedule.today) {
      return NextResponse.json({ ok: false, error: "That monthly report is not due." }, { status: 400 });
    }
  }
  if (view.periodWindow.notLaunched || view.periodWindow.pruned || view.periodWindow.days.length === 0
      || view.rows.some((r) => r.def.no !== "4b" && ["unreadable", "pruned", "unavailable"].includes(r.period.status))) {
    return NextResponse.json({ ok: false, error: "The requested period could not be read. Nothing was generated." }, { status: 503 });
  }

  const reference = measuresDocumentReference(view, session.userId);
  const filename = measuresDocumentFilename(view, format as Format);
  const generatorName = user.displayName?.trim() || user.id;
  let body: Buffer;
  try {
    body = format === "csv"
      ? Buffer.from(buildJourneyMeasuresCsv(view), "utf8")
      : format === "pdf"
        ? await renderPdf(buildJourneyMeasuresDocument(view, { generatorId: user.id, generatorName, generatedAtMs: nowMs, reference, layout: "pdf" }))
        : await renderXlsx(buildJourneyMeasuresDocument(view, { generatorId: user.id, generatorName, generatedAtMs: nowMs, reference, layout: "xlsx" }));
  } catch (err) {
    console.error("[journey-measures.export] render failed", String((err as Error)?.message ?? err).slice(0, 300));
    return NextResponse.json({ ok: false, error: "The file could not be produced. Nothing was downloaded." }, { status: 500 });
  }

  const recorded = await audit({
    category: "ADMIN", action: "journey_measures.exported", actorId: session.userId,
    targetType: "JourneyMeasures", targetId: period.kind === "baseline" ? "baseline" : period.kind === "week" ? period.monday : period.month,
    payload: {
      format, filename, reference, sizeBytes: body.length, campaign: view.campaign,
      window: { fromDay: view.periodWindow.fromDay, toDay: view.periodWindow.toDay, countedDays: view.periodWindow.days.length },
    },
  });
  if (!recorded.recorded) {
    return NextResponse.json({ ok: false, error: "The download could not be recorded in the audit log, so it was not released." }, { status: 503 });
  }
  return new NextResponse(body as unknown as BodyInit, {
    status: 200,
    headers: {
      "content-type": MIME[format],
      "content-disposition": `attachment; filename="${filename}"`,
      "content-length": String(body.length),
      "cache-control": "no-store, max-age=0",
      "x-report-reference": reference,
    },
  });
}
