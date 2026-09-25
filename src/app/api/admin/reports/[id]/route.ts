/**
 * /api/admin/reports/[id]?format=xlsx|pdf
 *
 * Streams a branded report file to the caller. Both routes go through
 * the same admin gate as every other /admin/* page (role check inside
 * + middleware 307 outside).
 *
 *   GET /api/admin/reports/gbt-monthly?format=xlsx
 *   GET /api/admin/reports/daily-ops?format=pdf
 *
 * The buttons in /admin/reports/page.tsx call these URLs in a new tab;
 * the browser handles the download via Content-Disposition.
 */
import { NextResponse } from "next/server";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { audit } from "@/lib/server/audit";
import { REPORT_CATALOGUE, isWindowedReport, type ReportId } from "@/lib/server/reports/catalogue";
import { renderXlsx } from "@/lib/server/reports/xlsx";
import { renderPdf } from "@/lib/server/reports/pdf";
import { resolveRange, MAX_RANGE_MS } from "@/lib/server/date-range";
import type { Report } from "@/lib/server/reports/types";
import { reportFilename } from "@/lib/server/reports/brand";
import { canView } from "@/lib/server/rbac";
import { checkAdminTotp } from "@/lib/server/admin-guard";

// RBAC: report download = accounting VIEW (see canView) — read-only, so Auditor can
// download too. Owner/ADMIN bypasses.

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await currentSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorised" }, { status: 401 });
  }
  const u = await db.user.findById(session.userId);
  if (!u || !(u.role === "ADMIN" || (await canView(u.role, "accounting")))) {
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

  /**
   * ⭐ A WINDOWED REPORT RESOLVES ITS WINDOW THE SAME WAY THE SCREEN DID. Only entries marked
   * `windowed` take one; everything else keeps its own statutory period and is called exactly
   * as before. The window goes through `resolveRange`, the one platform resolver, so the
   * workbook and the console cannot interpret the same URL differently.
   *
   * ⛔ `asof` EXISTS BECAUSE A ROLLING PRESET MOVES. "7d" means `now − 7 days`, and `now` here
   * is a few seconds after the `now` the page rendered with — so without pinning it, the export
   * and the screen would differ by every transaction that landed in between, on a money
   * document. The page passes the instant it resolved with; it is clamped to a sane band so it
   * cannot be used to ask for an arbitrary historical or future window.
   *
   * ⛔ AN UNREADABLE `from`/`to` IS REFUSED HERE, NOT SUBSTITUTED. `resolveRange` falls back to
   * the last 24 hours when it cannot parse a bound — which is survivable on a screen that says
   * so, and is NOT survivable in a downloadable artifact that will be read months later with no
   * memory of the URL that made it. A document that cannot state its true window must not exist.
   */
  let win: { start: number; end: number; label?: string } | undefined;
  if (isWindowedReport(id)) {
    const asofRaw = Number(url.searchParams.get("asof"));
    const now = Date.now();
    const asof = Number.isFinite(asofRaw) && asofRaw > now - MAX_RANGE_MS && asofRaw < now + 60_000
      ? asofRaw
      : now;
    const r = resolveRange(
      { range: url.searchParams.get("range"), from: url.searchParams.get("from"), to: url.searchParams.get("to") },
      asof,
      "7d",
    );
    if (r.unreadable) {
      return NextResponse.json({
        ok: false,
        error: `Unreadable ${r.unreadable.join(" and ")} — expected YYYY-MM-DD or YYYY-MM-DDTHH:MM (East Africa Time).`,
      }, { status: 400 });
    }
    win = { start: r.start, end: r.end, label: r.label };
  }

  // Build the report from the live store. Pass the actual userId so
  // the catalogue's regulatorSignatures() can look up the display name
  // itself. Previously this passed displayLabel(u) which broke the
  // db.user.findById() lookup inside every builder.
  /* The registry is `as const`, so `entry.build` narrows to a union of builder signatures and
     TypeScript cannot see that only the windowed one takes a second argument. The cast names
     exactly that fact; `win` is `undefined` for every other entry, so each builder receives
     precisely what it received before. */
  const build = entry.build as (uid: string, w?: { start: number; end: number; label?: string }) => Promise<Report>;
  const report = await build(session.userId, win);

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
      /* ⛔ THE WINDOW IS PART OF THE RECORD. A download of a windowed money document whose audit
         entry does not name the window it covered is not an audit entry — it cannot answer
         "which figures did this officer take away?". */
      ...(win ? { window: { start: win.start, end: win.end, label: win.label } } : {}),
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
