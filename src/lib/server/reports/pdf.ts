/**
 * PDF renderer — produces a branded A4 portrait PDF for each Report.
 * Layout:
 *
 *   Page 1+
 *   ┌────────────────────────────────────────────────────────────────┐
 *   │ [crest] 50pick Africa · Predict events. Not chance.            │ royal band
 *   ├────────────────────────────────────────────────────────────────┤
 *   │ <Report Title>                                                 │
 *   │ <Subtitle / Period>                                            │
 *   │ Generated · By · Reference · Classification                    │
 *   │ ──────────────── gilt accent ─────────────────                 │
 *   │ At a glance KPI grid (when summary present)                    │
 *   │                                                                │
 *   │ Section Title · Swahili                                        │
 *   │ description                                                    │
 *   │ ┌─ Header (royal fill, white text) ─────────────────────────┐  │
 *   │ │ data rows (alternating tint) …                            │  │
 *   │ │ Total row (gilt-soft fill)                                │  │
 *   │ └────────────────────────────────────────────────────────────┘  │
 *   │ … more sections, paginate as needed                            │
 *   │                                                                │
 *   │ ── Notes & methodology                                         │
 *   │ · note one                                                     │
 *   │ · note two                                                     │
 *   ├────────────────────────────────────────────────────────────────┤
 *   │ <reference> · <classification>      Page N / M   <generated>   │ footer
 *   └────────────────────────────────────────────────────────────────┘
 *
 * Every page carries the brand band on top and the reference footer
 * on the bottom — so a regulator who prints page 4 still knows which
 * report and which generation it came from.
 */

// pdfkit is externalised in next.config.ts (serverExternalPackages)
// so its built-in AFM font loader (fs.readFileSync at runtime) keeps
// working. We tried `pdfkit/js/pdfkit.standalone.js` first — the
// inlined-font variant — but its UMD wrapper recursed inside Next's
// bundler and blew the call stack on first generation.
import PDFDocument from "pdfkit";
import { BRAND, COMPANY, drawCrest, fmtDate, fmtDateTime, fmtTzs } from "./brand";
import type { Report, Section, Column, SummaryItem } from "./types";

const PAGE_MARGIN = { top: 56, bottom: 56, left: 40, right: 40 };
const BAND_H = 28;
const FOOTER_H = 22;
const GILT_RULE_H = 1.6;

type DocCtx = {
  doc: PDFKit.PDFDocument;
  pageW: number;
  pageH: number;
  contentX: number;
  contentW: number;
  contentTopY: number;       // y after band + meta header
  contentBottomY: number;    // y before footer
  reference: string;
  title: string;
  classification: string;
  generatedAt: string;
};

/**
 * Add a new page AND draw the band + footer on it explicitly.
 *
 * The previous version used a `pageAdded` event listener, but that
 * caused infinite recursion: pdfkit's text() can internally trigger
 * addPage when the cursor crosses the bottom margin (drawFooter
 * advances doc.y to ~836 after writing the right-aligned timestamp,
 * past the page bottom), the listener re-entered drawBand → text →
 * addPage → listener → drawBand …, stack overflow.
 *
 * Cleaner: no listener. Manual addPageWithChrome() is the only path
 * that creates new pages — ensureRoom() calls it. The cursor is
 * always reset to a safe y before any further drawing, so pdfkit
 * never auto-paginates while we're mid-render.
 */
function addPageWithChrome(ctx: DocCtx): number {
  ctx.doc.addPage();
  drawBand(ctx);
  drawFooter(ctx);
  ctx.doc.y = BAND_H + 8;
  ctx.doc.x = PAGE_MARGIN.left;
  return BAND_H + 14;
}

function paintFirstPage(ctx: DocCtx) {
  // First page already exists from the PDFDocument constructor — just
  // paint its chrome and reset the cursor.
  drawBand(ctx);
  drawFooter(ctx);
  ctx.doc.y = BAND_H + 8;
  ctx.doc.x = PAGE_MARGIN.left;
}

function drawBand(ctx: DocCtx) {
  const { doc, pageW } = ctx;
  doc.save();
  doc.rect(0, 0, pageW, BAND_H).fill(BRAND.royal);
  // Crest type-cast — pdfkit's TS types lag the JS API in places we
  // don't need; the helper only uses methods we've already imported.
  drawCrest(doc as unknown as Parameters<typeof drawCrest>[0], 22, BAND_H / 2, 9);
  doc.fillColor(BRAND.white)
     .font("Helvetica-Bold").fontSize(11)
     .text(COMPANY.name, 38, BAND_H / 2 - 7, { lineBreak: false });
  doc.fillColor(BRAND.giltSoft)
     .font("Helvetica").fontSize(8.5)
     .text("·  " + COMPANY.tagline, 38 + doc.widthOfString(COMPANY.name) + 6, BAND_H / 2 - 5, { lineBreak: false });
  doc.fillColor(BRAND.white)
     .font("Helvetica").fontSize(8)
     .text(COMPANY.tld, pageW - 80, BAND_H / 2 - 4, { width: 70, align: "right", lineBreak: false });
  doc.restore();
}

function drawFooter(ctx: DocCtx) {
  const { doc, pageW, pageH, reference, classification, generatedAt } = ctx;
  doc.save();
  const y = pageH - FOOTER_H;
  doc.lineWidth(0.5).strokeColor(BRAND.rule)
     .moveTo(PAGE_MARGIN.left, y).lineTo(pageW - PAGE_MARGIN.right, y).stroke();
  doc.fillColor(BRAND.inkSubtle).font("Helvetica").fontSize(7.5);
  doc.text(`${reference}  ·  ${classification}`, PAGE_MARGIN.left, y + 6, { lineBreak: false });
  doc.text(fmtDateTime(generatedAt), 0, y + 6, { width: pageW - PAGE_MARGIN.right, align: "right" });
  doc.restore();
}

function drawHeaderBlock(ctx: DocCtx, report: Report): number {
  const { doc, pageW, contentX, contentW } = ctx;
  let y = BAND_H + 14;

  // Report title
  doc.fillColor(BRAND.royalDeep).font("Helvetica-Bold").fontSize(20)
     .text(report.title, contentX, y, { width: contentW });
  y = doc.y + 2;

  // Subtitle
  doc.fillColor(BRAND.inkMuted).font("Helvetica-Oblique").fontSize(10.5)
     .text(report.subtitle, contentX, y, { width: contentW });
  y = doc.y + 6;

  // Meta strip (mono)
  doc.fillColor(BRAND.inkSubtle).font("Courier").fontSize(8);
  const metaLine =
    `Generated  ${fmtDateTime(report.meta.generatedAt)}    ` +
    `By  ${report.meta.generatedBy}    ` +
    `Ref  ${report.reference}    ` +
    `Class  ${report.meta.classification ?? "Internal"}`;
  doc.text(metaLine, contentX, y, { width: contentW });
  y = doc.y + 6;

  // Gilt accent rule
  doc.save();
  doc.rect(contentX, y, contentW, GILT_RULE_H).fill(BRAND.gilt);
  doc.restore();
  y += GILT_RULE_H + 14;

  void pageW;
  return y;
}

function drawSummary(ctx: DocCtx, summary: SummaryItem[], startY: number): number {
  const { doc, contentX, contentW } = ctx;
  let y = startY;

  doc.fillColor(BRAND.royalDeep).font("Helvetica-Bold").fontSize(11)
     .text("At a glance", contentX, y);
  y = doc.y + 6;

  // 2-column grid for 4+ items, 4-column otherwise. Pick 4 cols if
  // ≤ 4 items, else 2 to keep label/value pairs readable on A4.
  const cols = summary.length <= 4 ? summary.length : 2;
  const colW = contentW / cols;
  let row = 0, col = 0;

  for (const k of summary) {
    const x = contentX + col * colW;
    const yy = y + row * 30;
    doc.fillColor(BRAND.inkMuted).font("Helvetica").fontSize(8)
       .text(k.label.toUpperCase(), x, yy, { width: colW - 8, lineBreak: false });
    const tone = k.tone === "good" ? BRAND.yes : k.tone === "bad" ? BRAND.no : BRAND.ink;
    doc.fillColor(tone).font("Helvetica-Bold").fontSize(14)
       .text(k.value, x, yy + 10, { width: colW - 8, lineBreak: false });
    if (k.delta) {
      doc.fillColor(BRAND.inkSubtle).font("Helvetica").fontSize(7.5)
         .text(k.delta, x, yy + 25, { width: colW - 8, lineBreak: false });
    }
    col++;
    if (col >= cols) { col = 0; row++; }
  }
  return y + (row + 1) * 30 + 10;
}

function ensureRoom(ctx: DocCtx, needed: number, y: number): number {
  if (y + needed > ctx.contentBottomY) {
    return addPageWithChrome(ctx);
  }
  return y;
}

function drawSection(ctx: DocCtx, sec: Section, startY: number): number {
  const { doc, contentX, contentW } = ctx;
  let y = ensureRoom(ctx, 60, startY);

  // Section title
  doc.fillColor(BRAND.royalDeep).font("Helvetica-Bold").fontSize(13)
     .text(sec.title, contentX, y, { width: contentW, lineBreak: false });
  if (sec.titleSw) {
    const used = doc.widthOfString(sec.title);
    doc.fillColor(BRAND.inkSubtle).font("Helvetica-Oblique").fontSize(10)
       .text(` · ${sec.titleSw}`, contentX + used, y + 2, { width: contentW - used - 4, lineBreak: false });
  }
  y = doc.y + 4;

  if (sec.description) {
    doc.fillColor(BRAND.inkMuted).font("Helvetica").fontSize(9)
       .text(sec.description, contentX, y, { width: contentW });
    y = doc.y + 6;
  } else {
    y += 4;
  }

  // Column layout — proportional to declared widths (or equal share)
  const colW = computeColWidths(sec.columns, contentW);

  // Header row — royal fill, white text
  const headerH = 22;
  y = ensureRoom(ctx, headerH + 20, y);
  doc.save();
  doc.rect(contentX, y, contentW, headerH).fill(BRAND.royal);
  // Bottom gilt rule on the header
  doc.rect(contentX, y + headerH - 1.5, contentW, 1.5).fill(BRAND.gilt);
  doc.restore();
  let xCursor = contentX;
  sec.columns.forEach((c, i) => {
    doc.fillColor(BRAND.white).font("Helvetica-Bold").fontSize(9);
    doc.text(c.header, xCursor + 6, y + 5, { width: colW[i] - 12, align: c.align ?? "left", lineBreak: false });
    if (c.sub) {
      doc.fillColor(BRAND.giltSoft).font("Helvetica").fontSize(7.5)
         .text(c.sub, xCursor + 6, y + 13, { width: colW[i] - 12, align: c.align ?? "left", lineBreak: false });
    }
    xCursor += colW[i];
  });
  y += headerH;

  // Data rows
  const rowH = 18;
  for (let ri = 0; ri < sec.rows.length; ri++) {
    y = ensureRoom(ctx, rowH + 6, y);
    const r = sec.rows[ri];
    if (ri % 2 === 1) {
      doc.save();
      doc.rect(contentX, y, contentW, rowH).fill(BRAND.royalSoft);
      doc.restore();
    }
    // Hairline divider
    doc.save();
    doc.lineWidth(0.4).strokeColor(BRAND.ruleSubtle)
       .moveTo(contentX, y + rowH).lineTo(contentX + contentW, y + rowH).stroke();
    doc.restore();
    let xc = contentX;
    sec.columns.forEach((c, i) => {
      const raw = r[c.key];
      const text = renderCellText(raw, c.format);
      const isNum = c.format === "tzs" || c.format === "integer" || c.format === "percent";
      doc.fillColor(BRAND.ink).font(isNum ? "Courier" : "Helvetica").fontSize(9)
         .text(text, xc + 6, y + 5, { width: colW[i] - 12, align: c.align ?? (isNum ? "right" : "left"), lineBreak: false, ellipsis: true });
      xc += colW[i];
    });
    y += rowH;
  }

  // Totals row
  if (sec.totals) {
    y = ensureRoom(ctx, rowH + 10, y);
    doc.save();
    doc.rect(contentX, y, contentW, rowH + 4).fill(BRAND.giltSoft);
    doc.rect(contentX, y, contentW, 1).fill(BRAND.gilt);
    doc.rect(contentX, y + rowH + 3, contentW, 1).fill(BRAND.gilt);
    doc.restore();
    let xc = contentX;
    sec.columns.forEach((c, i) => {
      const v = sec.totals![c.key];
      let text = "";
      if (v !== undefined && v !== null) text = renderCellText(v, c.format);
      else if (i === 0) text = "Total";
      const isNum = c.format === "tzs" || c.format === "integer" || c.format === "percent";
      doc.fillColor(BRAND.giltFg).font(isNum ? "Courier-Bold" : "Helvetica-Bold").fontSize(9.5)
         .text(text, xc + 6, y + 6, { width: colW[i] - 12, align: c.align ?? (isNum ? "right" : "left"), lineBreak: false });
      xc += colW[i];
    });
    y += rowH + 6;
  }

  return y + 8;
}

function computeColWidths(cols: Column[], total: number): number[] {
  const declared = cols.map((c) => c.width ?? 0);
  const declaredSum = declared.reduce((s, w) => s + w, 0);
  if (declaredSum >= 0.5 * total && declaredSum > 0) {
    // Use declared widths proportionally
    return declared.map((w) => (w / declaredSum) * total);
  }
  return cols.map(() => total / cols.length);
}

function renderCellText(raw: string | number | null | undefined, format?: Column["format"]): string {
  if (raw === null || raw === undefined || raw === "") return "";
  if (format === "tzs") return typeof raw === "number" ? fmtTzs(raw) : String(raw);
  if (format === "integer") return typeof raw === "number" ? raw.toLocaleString("en-US") : String(raw);
  if (format === "percent") return typeof raw === "number" ? `${(raw * 100).toFixed(1)}%` : String(raw);
  if (format === "datetime") return fmtDateTime(String(raw));
  if (format === "date") return fmtDate(String(raw));
  return String(raw);
}

function drawNotes(ctx: DocCtx, notes: string[], startY: number): number {
  const { doc, contentX, contentW } = ctx;
  let y = ensureRoom(ctx, 40 + notes.length * 14, startY);
  doc.fillColor(BRAND.royalDeep).font("Helvetica-Bold").fontSize(10)
     .text("Notes & methodology", contentX, y);
  y = doc.y + 4;
  for (const n of notes) {
    y = ensureRoom(ctx, 16, y);
    doc.fillColor(BRAND.inkSubtle).font("Helvetica-Oblique").fontSize(8.5)
       .text("·  " + n, contentX, y, { width: contentW });
    y = doc.y + 2;
  }
  return y;
}

export async function renderPdf(report: Report): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margins: PAGE_MARGIN,
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
        doc,
        pageW, pageH,
        contentX: PAGE_MARGIN.left,
        contentW: pageW - PAGE_MARGIN.left - PAGE_MARGIN.right,
        contentTopY: BAND_H + 14,
        contentBottomY: pageH - PAGE_MARGIN.bottom,
        reference: report.reference,
        title: report.title,
        classification: report.meta.classification ?? "Internal",
        generatedAt: report.meta.generatedAt,
      };
      paintFirstPage(ctx);

      let y = drawHeaderBlock(ctx, report);
      if (report.summary && report.summary.length > 0) {
        y = drawSummary(ctx, report.summary, y);
      }
      for (const sec of report.sections) {
        y = drawSection(ctx, sec, y);
      }
      if (report.notes && report.notes.length > 0) {
        y = drawNotes(ctx, report.notes, y + 8);
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
