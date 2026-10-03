/**
 * /api/admin/tax/export?format=pdf|xlsx|csv&period=month|week|day|custom&…&product=ALL|MARKET|UPDOWN
 *
 * The Government Tax Report as a file (`docs/TAX-REPORT.md` §7). The same `TaxReportView` the page
 * renders, laid out by `tax-report-doc.ts` — so the PDF, the workbook, the CSV and the screen
 * cannot disagree, and a LOCKED period downloads its locked snapshot, exactly as filed.
 *
 * ⛔ ITS OWN ROUTE, NOT `/api/admin/reports/[id]`. That route passes a builder exactly one window
 * argument (no product filter), resolves windows with rolling presets (no calendar week), and is
 * pinned to two formats by three guards. This report needs a product filter, calendar periods,
 * period locks and CSV; none of those pins is loosened to get them.
 *
 * Gate: the stored role is ADMIN or holds accounting VIEW (Finance, Compliance, Auditor — the same
 * set that may open every other report), plus a satisfied admin TOTP, plus a same-origin request
 * (a cross-site link cannot make an officer's browser fetch a money document in their name).
 * ⭐ THE RECORD BEFORE THE FIRST BYTE: the audit row is awaited and checked, and a download whose
 * record did not land is not released.
 */
import { NextResponse } from "next/server";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { audit } from "@/lib/server/audit";
import { canView } from "@/lib/server/rbac";
import { checkAdminTotp } from "@/lib/server/admin-guard";
import { exportRequestAllowed } from "@/lib/server/contacts/export";
import { renderPdf } from "@/lib/server/reports/pdf";
import { renderXlsx } from "@/lib/server/reports/xlsx";
import { loadTaxReportView } from "@/lib/server/tax-report-view";
import { buildTaxCsv, buildTaxDocument, documentFilename, documentReference } from "@/lib/server/tax-report-doc";
import { parseProduct, periodFromParams } from "@/lib/tax-report";

export const dynamic = "force-dynamic";

const MIME = {
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv; charset=utf-8",
} as const;

export async function GET(req: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorised" }, { status: 401 });
  const u = await db.user.findById(session.userId);
  if (!u || !(u.role === "ADMIN" || (await canView(u.role, "accounting")))) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  if ((await checkAdminTotp(session.userId, session.sessionId)) !== "ok") {
    return NextResponse.json({ ok: false, error: "2FA required" }, { status: 403 });
  }
  if (!exportRequestAllowed(req.headers.get("sec-fetch-site"))) {
    return NextResponse.json({ ok: false, error: "Downloads must be started from 50pick itself." }, { status: 403 });
  }

  const url = new URL(req.url);
  const sp = url.searchParams;
  const format = (sp.get("format") ?? "pdf").toLowerCase();
  if (format !== "pdf" && format !== "xlsx" && format !== "csv") {
    return NextResponse.json({ ok: false, error: "Format must be pdf, xlsx or csv" }, { status: 400 });
  }
  const nowMs = Date.now();
  const { period, fellBack } = periodFromParams({
    period: sp.get("period") ?? undefined,
    month: sp.get("month") ?? undefined,
    week: sp.get("week") ?? undefined,
    day: sp.get("day") ?? undefined,
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
  }, nowMs);
  // ⛔ A download never silently covers a different period from the one asked for.
  if (fellBack) return NextResponse.json({ ok: false, error: "Unreadable period — nothing was generated." }, { status: 400 });
  const product = parseProduct(sp.get("product"));

  const loaded = await loadTaxReportView({ period, product, nowMs }).catch((err: unknown) => ({ ok: false as const, error: String((err as Error)?.message ?? err) }));
  if (!loaded.ok) {
    console.error("[tax-report.export] could not load", loaded.error);
    return NextResponse.json({ ok: false, error: "The report could not be read. Nothing was generated — please try again." }, { status: 503 });
  }
  const { data, lock, drift } = loaded.view;
  const generatorName = u.displayName?.trim() || u.id;
  const reference = documentReference(data, session.userId);
  const filename = documentFilename(data, format);

  let body: Buffer;
  try {
    if (format === "csv") body = Buffer.from(buildTaxCsv(data, { generatorName, generatedAtMs: nowMs, lock, reference, drift }), "utf8");
    else {
      const doc = buildTaxDocument(data, { generatorId: session.userId, generatorName, generatedAtMs: nowMs, lock, drift });
      body = format === "pdf" ? await renderPdf(doc) : await renderXlsx(doc);
    }
  } catch (err) {
    const msg = String((err as Error)?.message ?? err);
    console.error("[tax-report.export] render failed", msg);
    void audit({ category: "SYSTEM", action: "tax_report.export_failed", actorId: session.userId, targetType: "TaxPeriod", targetId: `${period.kind}:${period.key}:${product}`, payload: { format, error: msg.slice(0, 500) } });
    return NextResponse.json({ ok: false, error: "The file could not be produced. Nothing was downloaded — please try again." }, { status: 500 });
  }

  const rec = await audit({
    category: "ADMIN",
    action: "tax_report.exported",
    actorId: session.userId,
    targetType: "TaxPeriod",
    targetId: `${period.kind}:${period.key}:${product}`,
    payload: {
      format,
      filename,
      reference,
      sizeBytes: body.length,
      window: { start: data.period.startMs, end: data.period.endMs, cutoff: data.cutoffMs },
      inProgress: data.inProgress,
      lockId: lock?.id ?? null,
      sha256: lock?.sha256 ?? null,
      balanced: data.main.reconciliation.balanced,
      differenceCents: data.main.reconciliation.differenceCents,
      salesCents: data.main.report1.salesCents,
      payoutCents: data.main.report1.payoutCents,
      totalTax: data.main.tax.total,
    },
  });
  if (!rec.recorded) {
    return NextResponse.json({ ok: false, error: "The download could not be recorded in the audit log, so it was not released. Please try again." }, { status: 503 });
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
