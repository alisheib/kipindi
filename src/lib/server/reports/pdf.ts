// @ts-expect-error pdfkit has no declaration file
import PDFDocument from "pdfkit";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BRAND, COMPANY, fmtDate, fmtDateTime, fmtTzs, toAnsiSafe } from "./brand";
import type { Report, Section, Column, SummaryItem, SignatureRow } from "./types";

const LOGO_PNG = (() => {
  try {
    return readFileSync(join(process.cwd(), "public/icons/mark-color-512.png"));
  } catch {
    return null;
  }
})();

const M = { top: 0, bottom: 0, left: 32, right: 32 };
const BAND_H = 46;
const FOOTER_H = 26;
const CONTENT_TOP = BAND_H + 22;
const CONTENT_BOTTOM_INSET = FOOTER_H + 14;
const F = {
  band:       { name: "Helvetica-Bold",  size: 12 },
  bandTag:    { name: "Helvetica",       size: 9.5 },
  bandRight:  { name: "Helvetica",       size: 9 },
  title:      { name: "Helvetica-Bold",  size: 22 },
  subtitle:   { name: "Helvetica-Oblique", size: 10 },
  meta:       { name: "Helvetica",       size: 8 },
  kpiLabel:   { name: "Helvetica-Bold",  size: 7.5 },
  kpiValue:   { name: "Helvetica-Bold",  size: 14 },
  kpiDelta:   { name: "Helvetica",       size: 7.5 },
  sectionTitle:{ name: "Helvetica-Bold", size: 11.5 },
  sectionDesc:{ name: "Helvetica",       size: 8.5 },
  th:         { name: "Helvetica-Bold",  size: 9 },
  thSub:      { name: "Helvetica",       size: 7 },
  td:         { name: "Helvetica",       size: 9 },
  tdNum:      { name: "Helvetica",       size: 9 },
  total:      { name: "Helvetica-Bold",  size: 9.5 },
  totalNum:   { name: "Helvetica-Bold",  size: 9.5 },
  empty:      { name: "Helvetica-Oblique", size: 9 },
  notes:      { name: "Helvetica-Oblique", size: 8 },
  notesTitle: { name: "Helvetica-Bold",  size: 9.5 },
  footer:     { name: "Helvetica",       size: 7.5 },
};

type DocCtx = {
  doc: InstanceType<typeof PDFDocument>;
  pageW: number;
  pageH: number;
  contentX: number;
  contentW: number;
  contentBottomY: number;
  reference: string;
  classification: string;
  generatedAt: string;
};

function drawBand(ctx: DocCtx) {
  const { doc, pageW } = ctx;
  doc.save();
  // Deep royal field with a subtle lighter overlay at the top to
  // give the band depth — the kit uses a radial gradient on screen;
  // pdfkit's fill doesn't support gradients, so we approximate with
  // two stacked rectangles.
  doc.rect(0, 0, pageW, BAND_H).fill(BRAND.royalDeep);
  doc.rect(0, 0, pageW, BAND_H * 0.55).fill(BRAND.royal);
  // Gilt accent rule
  doc.rect(0, BAND_H, pageW, 2).fill(BRAND.gilt);
  doc.rect(0, BAND_H + 2, pageW, 0.8).fill(BRAND.royal);

  let textX = 30;
  if (LOGO_PNG) {
    const logoSize = BAND_H - 14;
    // White rounded disc behind the colour logo so the green / red
    // wedges and gilt divider read crisp against the royal band.
    const cx = 30 + logoSize / 2, cy = BAND_H / 2;
    doc.circle(cx, cy, logoSize / 2 + 2).fill(BRAND.white);
    doc.image(LOGO_PNG, 30, (BAND_H - logoSize) / 2, { width: logoSize, height: logoSize });
    textX = 30 + logoSize + 14;
  }

  const nameY = BAND_H / 2 - 11;
  const tagY  = BAND_H / 2 + 3;
  doc.fillColor(BRAND.white).font(F.band.name).fontSize(F.band.size + 2)
     .text(COMPANY.name, textX, nameY, { lineBreak: false });
  doc.fillColor(BRAND.giltSoft).font(F.bandTag.name).fontSize(F.bandTag.size)
     .text(toAnsiSafe(COMPANY.tagline), textX, tagY, { lineBreak: false });

  // Right side: TLD + jurisdiction stamp
  doc.fillColor(BRAND.white).font(F.bandRight.name).fontSize(F.bandRight.size + 1)
     .text(COMPANY.tld, pageW - 30 - 130, nameY, { width: 130, align: "right", lineBreak: false });
  doc.fillColor(BRAND.giltSoft).font("Helvetica").fontSize(7)
     .text("Tanzania", pageW - 30 - 130, tagY + 1, { width: 130, align: "right", lineBreak: false });
  doc.restore();
}

function drawFooter(ctx: DocCtx, pageNum: number, pageCount: number) {
  const { doc, pageW, pageH, reference, classification, generatedAt } = ctx;
  const y = pageH - FOOTER_H;
  doc.save();
  doc.lineWidth(0.4).strokeColor(BRAND.rule)
     .moveTo(24, y).lineTo(pageW - 24, y).stroke();
  doc.fillColor(BRAND.inkSubtle).font(F.footer.name).fontSize(F.footer.size);
  doc.text(toAnsiSafe(`${reference}  ·  ${classification}`), 24, y + 8, { lineBreak: false });
  doc.text(`Page ${pageNum} of ${pageCount}`, pageW / 2 - 60, y + 8, { width: 120, align: "center", lineBreak: false });
  doc.text(fmtDateTime(generatedAt), pageW - 24 - 180, y + 8, { width: 180, align: "right", lineBreak: false });
  doc.restore();
}

function addContentPage(ctx: DocCtx): number {
  ctx.doc.addPage();
  ctx.doc.y = CONTENT_TOP;
  ctx.doc.x = 32;
  return CONTENT_TOP;
}

function drawHeader(ctx: DocCtx, report: Report): number {
  const { doc, contentX, contentW } = ctx;
  let y = CONTENT_TOP;
  doc.fillColor(BRAND.royalDeep).font(F.title.name).fontSize(F.title.size)
     .text(toAnsiSafe(report.title), contentX, y, { width: contentW, lineBreak: true });
  y = doc.y + 4;
  doc.fillColor(BRAND.inkMuted).font(F.subtitle.name).fontSize(F.subtitle.size)
     .text(toAnsiSafe(report.subtitle), contentX, y, { width: contentW, lineBreak: false });
  y = doc.y + 10;
  const cls = report.meta.classification ?? "Internal";
  doc.fillColor(BRAND.inkSubtle).font(F.meta.name).fontSize(F.meta.size);
  const metaText = toAnsiSafe(
    `Generated  ${fmtDateTime(report.meta.generatedAt)}      ` +
    `By  ${report.meta.generatedBy}      ` +
    `Reference  ${report.reference}      ` +
    `Classification  ${cls}`
  );
  doc.text(metaText, contentX, y, { width: contentW, lineBreak: false });
  y = doc.y + 8;
  doc.save();
  doc.rect(contentX, y, contentW, 1.2).fill(BRAND.gilt);
  doc.restore();
  return y + 14;
}

function drawSummary(ctx: DocCtx, summary: SummaryItem[], startY: number): number {
  const { doc, contentX, contentW } = ctx;
  const cols = Math.min(4, summary.length);
  const cardW = contentW / cols;
  const cardH = 46;
  const rows = Math.ceil(summary.length / cols);
  let y = ensureRoom(ctx, rows * (cardH + 4) + 12, startY);
  // After ensureRoom we may be on a new page; align the summary block
  // to that new top instead of startY.
  const blockTop = y;
  for (let i = 0; i < summary.length; i++) {
    const k = summary[i];
    const cIdx = i % cols;
    const rIdx = Math.floor(i / cols);
    const x = contentX + cIdx * cardW;
    const yy = blockTop + rIdx * (cardH + 4);
    doc.save();
    doc.rect(x + 2, yy, cardW - 4, cardH).fill(BRAND.royalSoft);
    doc.rect(x + 2, yy, 2.5, cardH).fill(BRAND.gilt);
    doc.restore();
    doc.fillColor(BRAND.inkMuted).font(F.kpiLabel.name).fontSize(F.kpiLabel.size)
       .text(toAnsiSafe(k.label.toUpperCase()), x + 10, yy + 6, { width: cardW - 14, lineBreak: false });
    const tone = k.tone === "good" ? BRAND.yes : k.tone === "bad" ? BRAND.no : BRAND.royalDeep;
    doc.fillColor(tone).font(F.kpiValue.name).fontSize(F.kpiValue.size)
       .text(toAnsiSafe(k.value), x + 10, yy + 18, { width: cardW - 14, lineBreak: false });
    if (k.delta) {
      doc.fillColor(BRAND.inkSubtle).font(F.kpiDelta.name).fontSize(F.kpiDelta.size)
         .text(toAnsiSafe(k.delta), x + 10, yy + 34, { width: cardW - 14, lineBreak: false });
    }
  }
  return blockTop + rows * (cardH + 4) + 8;
}

function ensureRoom(ctx: DocCtx, needed: number, y: number): number {
  return y + needed > ctx.contentBottomY ? addContentPage(ctx) : y;
}

function computeColWidths(cols: Column[], total: number): number[] {
  const declared = cols.map((c) => c.width ?? 0);
  const sum = declared.reduce((s, w) => s + w, 0);
  if (sum > 0) return declared.map((w) => (w / sum) * total);
  return cols.map(() => total / cols.length);
}

function renderCellText(raw: string | number | null | undefined, format?: Column["format"]): string {
  if (raw === null || raw === undefined || raw === "") return "";
  if (format === "tzs") return typeof raw === "number" ? fmtTzs(raw) : String(raw);
  if (format === "integer") return typeof raw === "number" ? raw.toLocaleString("en-US") : String(raw);
  if (format === "percent") return typeof raw === "number" ? `${(raw * 100).toFixed(1)}%` : String(raw);
  if (format === "datetime") return fmtDateTime(String(raw));
  if (format === "date") return fmtDate(String(raw));
  return toAnsiSafe(String(raw));
}

function drawTableHeader(ctx: DocCtx, sec: Section, colW: number[], y: number, continuation = false): number {
  const { doc, contentX, contentW } = ctx;
  const hasSub = sec.columns.some((c) => c.sub);
  const headerH = hasSub ? 28 : 22;
  doc.save();
  doc.rect(contentX, y, contentW, headerH).fill(BRAND.royal);
  doc.rect(contentX, y + headerH - 1.2, contentW, 1.2).fill(BRAND.gilt);
  doc.restore();
  let xC = contentX;
  for (let i = 0; i < sec.columns.length; i++) {
    const c = sec.columns[i];
    const headerY = hasSub ? y + 5 : y + 6;
    doc.fillColor(BRAND.white).font(F.th.name).fontSize(F.th.size)
       .text(toAnsiSafe(c.header), xC + 8, headerY, { width: colW[i] - 16, align: c.align ?? "left", lineBreak: false, ellipsis: true });
    if (c.sub) {
      doc.fillColor(BRAND.giltSoft).font(F.thSub.name).fontSize(F.thSub.size)
         .text(toAnsiSafe(c.sub), xC + 8, y + 16, { width: colW[i] - 16, align: c.align ?? "left", lineBreak: false, ellipsis: true });
    }
    xC += colW[i];
  }
  // "continued" marker on re-drawn headers so the auditor can see the
  // row count didn't reset between pages.
  if (continuation) {
    doc.fillColor(BRAND.giltSoft).font(F.thSub.name).fontSize(F.thSub.size - 0.5)
       .text("· continued", contentX + contentW - 60, y + headerH + 2, { width: 60, align: "right", lineBreak: false });
  }
  return y + headerH;
}

function drawSection(ctx: DocCtx, sec: Section, startY: number): number {
  const { doc, contentX, contentW } = ctx;
  let y = ensureRoom(ctx, 80, startY);

  doc.fillColor(BRAND.royalDeep).font(F.sectionTitle.name).fontSize(F.sectionTitle.size)
     .text(toAnsiSafe(sec.title), contentX, y, { width: contentW, lineBreak: false });
  y += 15;
  if (sec.titleSw) {
    doc.fillColor(BRAND.inkSubtle).font(F.subtitle.name).fontSize(F.sectionDesc.size + 0.5)
       .text(toAnsiSafe(sec.titleSw), contentX, y, { width: contentW, lineBreak: false });
    y += 12;
  }
  if (sec.description) {
    doc.fillColor(BRAND.inkSubtle).font(F.sectionDesc.name).fontSize(F.sectionDesc.size)
       .text(toAnsiSafe(sec.description), contentX, y, { width: contentW });
    y = doc.y + 5;
  }

  const colW = computeColWidths(sec.columns, contentW);
  const hasSub = sec.columns.some((c) => c.sub);
  const headerH = hasSub ? 28 : 22;
  y = ensureRoom(ctx, headerH + 30, y);
  y = drawTableHeader(ctx, sec, colW, y);

  const rowH = 22;

  if (sec.rows.length === 0) {
    y = ensureRoom(ctx, rowH + 4, y);
    doc.save();
    doc.rect(contentX, y, contentW, rowH).fill(BRAND.royalSoft);
    doc.restore();
    doc.fillColor(BRAND.inkSubtle).font(F.empty.name).fontSize(F.empty.size)
       .text("No data in this period  ·  Hakuna data katika kipindi hiki",
             contentX, y + 6, { width: contentW, align: "center", lineBreak: false });
    y += rowH;
  } else {
    for (let ri = 0; ri < sec.rows.length; ri++) {
      // If this row would overflow the page, start a new page AND re-draw
      // the table header on the new page so the auditor can still read
      // column labels. Without this the continuation page lists naked
      // rows with no context.
      if (y + rowH + 4 > ctx.contentBottomY) {
        y = addContentPage(ctx);
        y = drawTableHeader(ctx, sec, colW, y, true);
      }
      if (ri % 2 === 1) {
        doc.save();
        doc.rect(contentX, y, contentW, rowH).fill(BRAND.royalSoft);
        doc.restore();
      }
      doc.save();
      doc.lineWidth(0.3).strokeColor(BRAND.ruleSubtle)
         .moveTo(contentX, y + rowH).lineTo(contentX + contentW, y + rowH).stroke();
      doc.restore();
      const r = sec.rows[ri];
      let xc = contentX;
      for (let i = 0; i < sec.columns.length; i++) {
        const c = sec.columns[i];
        const text = renderCellText(r[c.key], c.format);
        const isNum = c.format === "tzs" || c.format === "integer" || c.format === "percent";
        doc.fillColor(BRAND.ink).font(isNum ? F.tdNum.name : F.td.name).fontSize(F.td.size)
           .text(text, xc + 8, y + 6, { width: colW[i] - 16, align: c.align ?? (isNum ? "right" : "left"), lineBreak: false, ellipsis: true });
        xc += colW[i];
      }
      y += rowH;
    }
  }

  if (sec.totals) {
    y = ensureRoom(ctx, rowH + 8, y);
    doc.save();
    doc.rect(contentX, y, contentW, rowH + 2).fill(BRAND.giltSoft);
    doc.rect(contentX, y, contentW, 1).fill(BRAND.gilt);
    doc.rect(contentX, y + rowH + 1, contentW, 1).fill(BRAND.gilt);
    doc.restore();
    let xc = contentX;
    for (let i = 0; i < sec.columns.length; i++) {
      const c = sec.columns[i];
      const v = sec.totals[c.key];
      let text = "";
      if (v !== undefined && v !== null) text = renderCellText(v, c.format);
      else if (i === 0) text = "Total";
      const isNum = c.format === "tzs" || c.format === "integer" || c.format === "percent";
      doc.fillColor(BRAND.giltFg).font(isNum ? F.totalNum.name : F.total.name).fontSize(F.total.size)
         .text(text, xc + 8, y + 6, { width: colW[i] - 16, align: c.align ?? (isNum ? "right" : "left"), lineBreak: false, ellipsis: true });
      xc += colW[i];
    }
    y += rowH + 4;
  }

  return y + 10;
}

function drawNotes(ctx: DocCtx, notes: string[], startY: number): number {
  const { doc, contentX, contentW } = ctx;
  let y = ensureRoom(ctx, 30 + notes.length * 12, startY);
  doc.fillColor(BRAND.royalDeep).font(F.notesTitle.name).fontSize(F.notesTitle.size)
     .text("Notes & methodology", contentX, y, { lineBreak: false });
  doc.fillColor(BRAND.inkSubtle).font(F.subtitle.name).fontSize(F.notes.size + 0.5)
     .text(toAnsiSafe("  ·  Maelezo na mbinu"), contentX + 130, y + 2, { lineBreak: false });
  y += 14;
  for (const n of notes) {
    y = ensureRoom(ctx, 14, y);
    doc.fillColor(BRAND.inkSubtle).font(F.notes.name).fontSize(F.notes.size)
       .text(toAnsiSafe("·  " + n), contentX, y, { width: contentW });
    y = doc.y + 2;
  }
  return y;
}

/** Signature block — renders at the end of regulator hand-off reports.
 *  Each row gets a role label, a name, and an explicit signature/date
 *  line so the auditor has a clean attestation panel to stamp. */
function drawSignatures(ctx: DocCtx, sigs: SignatureRow[], startY: number): number {
  const { doc, contentX, contentW } = ctx;
  const blockH = 56;
  // Reserve room for the panel + title; if we can't fit it, push to a
  // fresh page so the attestations aren't visually severed from their
  // labels at the top of one page and the line on the next.
  let y = ensureRoom(ctx, blockH + 30, startY + 8);
  doc.fillColor(BRAND.royalDeep).font(F.notesTitle.name).fontSize(F.notesTitle.size)
     .text("Attestation", contentX, y, { lineBreak: false });
  doc.fillColor(BRAND.inkSubtle).font(F.subtitle.name).fontSize(F.notes.size + 0.5)
     .text(toAnsiSafe("  ·  Uthibitisho"), contentX + 75, y + 2, { lineBreak: false });
  y += 16;

  const cols = sigs.length;
  const cellW = contentW / cols;
  for (let i = 0; i < sigs.length; i++) {
    const s = sigs[i];
    const x = contentX + i * cellW;
    // Light card background — same royalSoft used by alternating rows.
    doc.save();
    doc.rect(x + 2, y, cellW - 4, blockH).fill(BRAND.royalSoft);
    doc.rect(x + 2, y, 2.5, blockH).fill(BRAND.gilt);
    doc.restore();
    doc.fillColor(BRAND.inkMuted).font(F.kpiLabel.name).fontSize(F.kpiLabel.size)
       .text(toAnsiSafe(s.role.toUpperCase()), x + 10, y + 6, { width: cellW - 14, lineBreak: false });
    doc.fillColor(BRAND.royalDeep).font(F.sectionTitle.name).fontSize(F.sectionTitle.size - 1)
       .text(toAnsiSafe(s.name), x + 10, y + 18, { width: cellW - 14, lineBreak: false, ellipsis: true });
    if (s.id) {
      doc.fillColor(BRAND.inkSubtle).font(F.meta.name).fontSize(F.meta.size)
         .text(toAnsiSafe(s.id), x + 10, y + 32, { width: cellW - 14, lineBreak: false, ellipsis: true });
    }
    // Signature line — a thin gilt rule + "Signature" / "Date" labels
    const lineY = y + blockH - 14;
    doc.save();
    doc.lineWidth(0.4).strokeColor(BRAND.gilt)
       .moveTo(x + 10, lineY).lineTo(x + cellW - 12, lineY).stroke();
    doc.restore();
    doc.fillColor(BRAND.inkSubtle).font(F.footer.name).fontSize(F.footer.size)
       .text(toAnsiSafe(s.signedAt ? `Signed ${fmtDate(s.signedAt)}` : "Signature & date"),
             x + 10, lineY + 2, { width: cellW - 22, lineBreak: false });
  }
  return y + blockH + 8;
}

export async function renderPdf(report: Report): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margins: M,
        bufferPages: true,
        info: {
          Title: report.title,
          Author: COMPANY.name,
          Subject: report.subtitle,
          Keywords: `50pick, ${COMPANY.name}, report, ${report.meta.classification ?? "Internal"}`,
          CreationDate: new Date(report.meta.generatedAt),
        },
      });
      const chunks: Buffer[] = [];
      doc.on("data", (c: Buffer) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const pageW = doc.page.width;
      const pageH = doc.page.height;
      const ctx: DocCtx = {
        doc, pageW, pageH,
        contentX: 32,
        contentW: pageW - 64,
        contentBottomY: pageH - CONTENT_BOTTOM_INSET - FOOTER_H,
        reference: report.reference,
        classification: report.meta.classification ?? "Internal",
        generatedAt: report.meta.generatedAt,
      };

      doc.y = CONTENT_TOP;
      doc.x = 32;

      let y = drawHeader(ctx, report);
      if (report.summary && report.summary.length > 0) {
        y = drawSummary(ctx, report.summary, y);
      }
      for (const sec of report.sections) {
        y = drawSection(ctx, sec, y);
      }
      if (report.notes && report.notes.length > 0) {
        y = drawNotes(ctx, report.notes, y + 6);
      }
      if (report.signatures && report.signatures.length > 0) {
        y = drawSignatures(ctx, report.signatures, y + 4);
      }

      const range = doc.bufferedPageRange();
      const totalPages = range.count;
      for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(range.start + i);
        drawBand(ctx);
        drawFooter(ctx, i + 1, totalPages);
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
