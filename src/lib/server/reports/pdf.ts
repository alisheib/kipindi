import PDFDocument from "pdfkit";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BRAND, COMPANY, fmtDate, fmtDateTime, fmtTzs, toAnsiSafe } from "./brand";
import type { Report, Section, Column, SummaryItem } from "./types";

const LOGO_PNG = (() => {
  try {
    return readFileSync(join(process.cwd(), "public/brand/fiftymark-white.png"));
  } catch {
    return null;
  }
})();

const M = { top: 32, bottom: 32, left: 32, right: 32 };
const BAND_H = 26;
const FOOTER_H = 18;
const F = {
  band:       { name: "Helvetica-Bold",  size: 11 },
  bandTag:    { name: "Helvetica",       size: 9   },
  bandRight:  { name: "Helvetica",       size: 8.5 },
  title:      { name: "Helvetica-Bold",  size: 18 },
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
  doc: PDFKit.PDFDocument;
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
  const cy = BAND_H / 2;
  doc.save();
  doc.rect(0, 0, pageW, BAND_H).fill(BRAND.royal);
  doc.rect(0, BAND_H, pageW, 1.2).fill(BRAND.gilt);
  let textX = M.left;
  if (LOGO_PNG) {
    const logoSize = BAND_H - 8;
    doc.image(LOGO_PNG, M.left, (BAND_H - logoSize) / 2, { width: logoSize, height: logoSize });
    textX = M.left + logoSize + 8;
  }
  doc.fillColor(BRAND.white).font(F.band.name).fontSize(F.band.size)
     .text(COMPANY.name, textX, cy - F.band.size / 2 + 1, { lineBreak: false });
  const nameW = doc.widthOfString(COMPANY.name);
  doc.fillColor(BRAND.giltSoft).font(F.bandTag.name).fontSize(F.bandTag.size)
     .text(toAnsiSafe("  ·  " + COMPANY.tagline), textX + nameW + 4, cy - F.bandTag.size / 2 + 1, { lineBreak: false });
  doc.fillColor(BRAND.white).font(F.bandRight.name).fontSize(F.bandRight.size)
     .text(COMPANY.tld, pageW - M.right - 80, cy - F.bandRight.size / 2 + 1, { width: 80, align: "right", lineBreak: false });
  doc.restore();
}

function drawFooter(ctx: DocCtx) {
  const { doc, pageW, pageH, reference, classification, generatedAt } = ctx;
  const y = pageH - FOOTER_H;
  doc.save();
  doc.lineWidth(0.4).strokeColor(BRAND.rule)
     .moveTo(M.left, y).lineTo(pageW - M.right, y).stroke();
  doc.fillColor(BRAND.inkSubtle).font(F.footer.name).fontSize(F.footer.size);
  doc.text(toAnsiSafe(`${reference}  ·  ${classification}`), M.left, y + 5, { lineBreak: false });
  doc.text(fmtDateTime(generatedAt), pageW - M.right - 160, y + 5, { width: 160, align: "right", lineBreak: false });
  doc.restore();
}

function addPageWithChrome(ctx: DocCtx): number {
  ctx.doc.addPage();
  drawBand(ctx);
  drawFooter(ctx);
  ctx.doc.y = BAND_H + 12;
  ctx.doc.x = M.left;
  return BAND_H + 12;
}

function paintFirstPage(ctx: DocCtx) {
  drawBand(ctx);
  drawFooter(ctx);
  ctx.doc.y = BAND_H + 12;
  ctx.doc.x = M.left;
}

function drawHeader(ctx: DocCtx, report: Report): number {
  const { doc, contentX, contentW } = ctx;
  let y = BAND_H + 14;
  doc.fillColor(BRAND.royalDeep).font(F.title.name).fontSize(F.title.size)
     .text(toAnsiSafe(report.title), contentX, y, { width: contentW });
  y = doc.y + 3;
  doc.fillColor(BRAND.inkMuted).font(F.subtitle.name).fontSize(F.subtitle.size)
     .text(toAnsiSafe(report.subtitle), contentX, y, { width: contentW });
  y = doc.y + 8;
  const cls = report.meta.classification ?? "Internal";
  doc.fillColor(BRAND.inkSubtle).font(F.meta.name).fontSize(F.meta.size);
  const metaText = toAnsiSafe(
    `Generated  ${fmtDateTime(report.meta.generatedAt)}      ` +
    `By  ${report.meta.generatedBy}      ` +
    `Reference  ${report.reference}      ` +
    `Classification  ${cls}`
  );
  doc.text(metaText, contentX, y, { width: contentW });
  y = doc.y + 6;
  doc.save();
  doc.rect(contentX, y, contentW, 1).fill(BRAND.gilt);
  doc.restore();
  return y + 10;
}

function drawSummary(ctx: DocCtx, summary: SummaryItem[], startY: number): number {
  const { doc, contentX, contentW } = ctx;
  const cols = Math.min(4, summary.length);
  const cardW = contentW / cols;
  const cardH = 46;
  const rows = Math.ceil(summary.length / cols);
  for (let i = 0; i < summary.length; i++) {
    const k = summary[i];
    const cIdx = i % cols;
    const rIdx = Math.floor(i / cols);
    const x = contentX + cIdx * cardW;
    const yy = startY + rIdx * (cardH + 4);
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
  return startY + rows * (cardH + 4) + 8;
}

function ensureRoom(ctx: DocCtx, needed: number, y: number): number {
  return y + needed > ctx.contentBottomY ? addPageWithChrome(ctx) : y;
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

function drawSection(ctx: DocCtx, sec: Section, startY: number): number {
  const { doc, contentX, contentW } = ctx;
  let y = ensureRoom(ctx, 80, startY);

  doc.fillColor(BRAND.royalDeep).font(F.sectionTitle.name).fontSize(F.sectionTitle.size)
     .text(toAnsiSafe(sec.title), contentX, y, { width: contentW, lineBreak: false });
  y += 15;
  if (sec.description) {
    doc.fillColor(BRAND.inkSubtle).font(F.sectionDesc.name).fontSize(F.sectionDesc.size)
       .text(toAnsiSafe(sec.description), contentX, y, { width: contentW });
    y = doc.y + 5;
  }

  const colW = computeColWidths(sec.columns, contentW);
  const hasSub = sec.columns.some((c) => c.sub);
  const headerH = hasSub ? 24 : 18;
  y = ensureRoom(ctx, headerH + 30, y);

  doc.save();
  doc.rect(contentX, y, contentW, headerH).fill(BRAND.royal);
  doc.rect(contentX, y + headerH - 1.2, contentW, 1.2).fill(BRAND.gilt);
  doc.restore();
  let xC = contentX;
  for (let i = 0; i < sec.columns.length; i++) {
    const c = sec.columns[i];
    const headerY = hasSub ? y + 4 : y + 5;
    doc.fillColor(BRAND.white).font(F.th.name).fontSize(F.th.size)
       .text(toAnsiSafe(c.header), xC + 5, headerY, { width: colW[i] - 10, align: c.align ?? "left", lineBreak: false, ellipsis: true });
    if (c.sub) {
      doc.fillColor(BRAND.giltSoft).font(F.thSub.name).fontSize(F.thSub.size)
         .text(toAnsiSafe(c.sub), xC + 5, y + 14, { width: colW[i] - 10, align: c.align ?? "left", lineBreak: false, ellipsis: true });
    }
    xC += colW[i];
  }
  y += headerH;

  const rowH = 16;

  if (sec.rows.length === 0) {
    y = ensureRoom(ctx, rowH + 4, y);
    doc.save();
    doc.rect(contentX, y, contentW, rowH).fill(BRAND.royalSoft);
    doc.restore();
    doc.fillColor(BRAND.inkSubtle).font(F.empty.name).fontSize(F.empty.size)
       .text("No data in this period", contentX, y + 4, { width: contentW, align: "center", lineBreak: false });
    y += rowH;
  } else {
    for (let ri = 0; ri < sec.rows.length; ri++) {
      y = ensureRoom(ctx, rowH + 4, y);
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
           .text(text, xc + 5, y + 4, { width: colW[i] - 10, align: c.align ?? (isNum ? "right" : "left"), lineBreak: false, ellipsis: true });
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
         .text(text, xc + 5, y + 5, { width: colW[i] - 10, align: c.align ?? (isNum ? "right" : "left"), lineBreak: false, ellipsis: true });
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
  y += 14;
  for (const n of notes) {
    y = ensureRoom(ctx, 14, y);
    doc.fillColor(BRAND.inkSubtle).font(F.notes.name).fontSize(F.notes.size)
       .text(toAnsiSafe("·  " + n), contentX, y, { width: contentW });
    y = doc.y + 2;
  }
  return y;
}

export async function renderPdf(report: Report): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margins: M,
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
        contentX: M.left,
        contentW: pageW - M.left - M.right,
        contentBottomY: pageH - M.bottom,
        reference: report.reference,
        classification: report.meta.classification ?? "Internal",
        generatedAt: report.meta.generatedAt,
      };
      paintFirstPage(ctx);

      let y = drawHeader(ctx, report);
      if (report.summary && report.summary.length > 0) {
        y = drawSummary(ctx, report.summary, y);
      }
      for (const sec of report.sections) {
        y = drawSection(ctx, sec, y);
      }
      if (report.notes && report.notes.length > 0) {
        y = drawNotes(ctx, report.notes, y + 4);
      }
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
