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

/* ── Layout constants ────────────────────────────────────────────── */
const M = { top: 0, bottom: 0, left: 0, right: 0 };
const BAND_H = 52;
const FOOTER_H = 30;
const CONTENT_TOP = BAND_H + 24;
const CONTENT_BOTTOM_INSET = FOOTER_H + 16;
const PAD = 40; // page horizontal padding

const F = {
  // ── Dark-bg readability: all sizes bumped vs light-mode PDF ──
  // Light text on dark loses ~1pt of perceived weight, so the minimum
  // legible size on a dark canvas is ~7.5pt (vs 6.5pt on white).
  band:       { name: "Helvetica-Bold",    size: 13 },
  bandTag:    { name: "Helvetica",         size: 9 },
  bandRight:  { name: "Helvetica-Bold",    size: 10 },
  title:      { name: "Helvetica-Bold",    size: 24 },
  subtitle:   { name: "Helvetica",         size: 10.5 },
  meta:       { name: "Helvetica",         size: 8 },
  metaLabel:  { name: "Helvetica-Bold",    size: 7.5 },
  kpiLabel:   { name: "Helvetica-Bold",    size: 8 },
  kpiValue:   { name: "Helvetica-Bold",    size: 17 },
  kpiDelta:   { name: "Helvetica",         size: 7.5 },
  sectionTitle:{ name: "Helvetica-Bold",   size: 12.5 },
  sectionDesc:{ name: "Helvetica",         size: 8.5 },
  th:         { name: "Helvetica-Bold",    size: 8.5 },
  thSub:      { name: "Helvetica",         size: 7.5 },
  td:         { name: "Helvetica",         size: 9 },
  tdNum:      { name: "Courier",           size: 9 },   // monospace for tabular alignment
  total:      { name: "Helvetica-Bold",    size: 9.5 },
  totalNum:   { name: "Courier-Bold",      size: 9.5 }, // monospace totals
  empty:      { name: "Helvetica-Oblique", size: 9 },
  notes:      { name: "Helvetica",         size: 8 },
  notesTitle: { name: "Helvetica-Bold",    size: 10 },
  footer:     { name: "Helvetica",         size: 7.5 },
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

/* ── Page background — dark canvas on every page ─────────────────── */
function drawPageBg(ctx: DocCtx) {
  ctx.doc.save();
  ctx.doc.rect(0, 0, ctx.pageW, ctx.pageH).fill(BRAND.canvas);
  ctx.doc.restore();
}

/* ── Top band — royal gradient + gilt rule ────────────────────────── */
function drawBand(ctx: DocCtx) {
  const { doc, pageW } = ctx;
  doc.save();
  doc.rect(0, 0, pageW, BAND_H).fill(BRAND.royalDeep);
  doc.rect(0, 0, pageW, BAND_H * 0.5).fill(BRAND.royal);
  // Gilt accent rule
  doc.rect(0, BAND_H - 2, pageW, 2).fill(BRAND.gilt);

  let textX = PAD;
  if (LOGO_PNG) {
    const logoSize = BAND_H - 16;
    const cx = PAD + logoSize / 2, cy = BAND_H / 2;
    doc.circle(cx, cy, logoSize / 2 + 2).fill(BRAND.white);
    doc.image(LOGO_PNG, PAD, (BAND_H - logoSize) / 2, { width: logoSize, height: logoSize });
    textX = PAD + logoSize + 14;
  }

  const nameY = BAND_H / 2 - 12;
  const tagY  = BAND_H / 2 + 4;
  doc.fillColor(BRAND.white).font(F.band.name).fontSize(F.band.size)
     .text(COMPANY.name, textX, nameY, { lineBreak: false });
  doc.fillColor(BRAND.giltBright).font(F.bandTag.name).fontSize(F.bandTag.size)
     .text(toAnsiSafe(COMPANY.tagline), textX, tagY, { lineBreak: false });

  doc.fillColor(BRAND.white).font(F.bandRight.name).fontSize(F.bandRight.size)
     .text(COMPANY.tld, pageW - PAD - 130, nameY + 1, { width: 130, align: "right", lineBreak: false });
  doc.fillColor(BRAND.giltBright).font("Helvetica").fontSize(7.5)
     .text("Tanzania", pageW - PAD - 130, tagY + 1, { width: 130, align: "right", lineBreak: false });
  doc.restore();
}

/* ── Footer — dark band with reference + page + timestamp ─────────── */
function drawFooter(ctx: DocCtx, pageNum: number, pageCount: number) {
  const { doc, pageW, pageH, reference, classification, generatedAt } = ctx;
  const y = pageH - FOOTER_H;
  doc.save();
  // Subtle dark band
  doc.rect(0, y, pageW, FOOTER_H).fill(BRAND.panel);
  doc.rect(0, y, pageW, 0.5).fill(BRAND.border);
  doc.fillColor(BRAND.textSubtle).font(F.footer.name).fontSize(F.footer.size);
  doc.text(toAnsiSafe(`${reference}  ·  ${classification}`), PAD, y + 10, { lineBreak: false });
  doc.text(`Page ${pageNum} of ${pageCount}`, pageW / 2 - 60, y + 10, { width: 120, align: "center", lineBreak: false });
  doc.text(fmtDateTime(generatedAt), pageW - PAD - 180, y + 10, { width: 180, align: "right", lineBreak: false });
  doc.restore();
}

function addContentPage(ctx: DocCtx): number {
  ctx.doc.addPage();
  drawPageBg(ctx);
  ctx.doc.y = CONTENT_TOP;
  ctx.doc.x = PAD;
  return CONTENT_TOP;
}

/* ── Report header — title, subtitle, metadata badges ─────────────── */
function drawHeader(ctx: DocCtx, report: Report): number {
  const { doc, contentX, contentW } = ctx;
  let y = CONTENT_TOP;

  doc.fillColor(BRAND.pearl).font(F.title.name).fontSize(F.title.size)
     .text(toAnsiSafe(report.title), contentX, y, { width: contentW, lineBreak: true });
  y = doc.y + 2;

  doc.fillColor(BRAND.textMuted).font(F.subtitle.name).fontSize(F.subtitle.size)
     .text(toAnsiSafe(report.subtitle), contentX, y, { width: contentW, lineBreak: false });
  y = doc.y + 12;

  // Metadata row — structured labels
  const cls = report.meta.classification ?? "Internal";
  const metaPairs = [
    ["Generated", fmtDateTime(report.meta.generatedAt)],
    ["By", report.meta.generatedBy],
    ["Reference", report.reference],
    ["Classification", cls],
  ];
  let mx = contentX;
  for (const [label, value] of metaPairs) {
    doc.fillColor(BRAND.textSubtle).font(F.metaLabel.name).fontSize(F.metaLabel.size)
       .text(toAnsiSafe(label), mx, y, { lineBreak: false, continued: false });
    const lw = doc.widthOfString(toAnsiSafe(label), { font: F.metaLabel.name, fontSize: F.metaLabel.size });
    doc.fillColor(BRAND.textMuted).font(F.meta.name).fontSize(F.meta.size)
       .text(toAnsiSafe("  " + value), mx + lw, y, { lineBreak: false });
    mx += lw + doc.widthOfString(toAnsiSafe("  " + value), { font: F.meta.name, fontSize: F.meta.size }) + 20;
  }
  y = doc.y + 10;

  // Gilt divider
  doc.save();
  doc.rect(contentX, y, contentW, 1.5).fill(BRAND.gilt);
  doc.restore();
  return y + 16;
}

/* ── KPI summary cards — dark glass panels ────────────────────────── */
function drawSummary(ctx: DocCtx, summary: SummaryItem[], startY: number): number {
  const { doc, contentX, contentW } = ctx;
  const cols = Math.min(4, summary.length);
  const gap = 6;
  const cardW = (contentW - (cols - 1) * gap) / cols;
  const cardH = 56;
  const rows = Math.ceil(summary.length / cols);
  let y = ensureRoom(ctx, rows * (cardH + gap) + 12, startY);
  const blockTop = y;

  for (let i = 0; i < summary.length; i++) {
    const k = summary[i];
    const cIdx = i % cols;
    const rIdx = Math.floor(i / cols);
    const x = contentX + cIdx * (cardW + gap);
    const yy = blockTop + rIdx * (cardH + gap);

    doc.save();
    // Glass panel card
    doc.rect(x, yy, cardW, cardH).fill(BRAND.panel);
    // Gilt left accent
    doc.rect(x, yy, 3, cardH).fill(BRAND.gilt);
    // Subtle top highlight
    doc.rect(x + 3, yy, cardW - 3, 0.5).fill(BRAND.surface);
    doc.restore();

    doc.fillColor(BRAND.textSubtle).font(F.kpiLabel.name).fontSize(F.kpiLabel.size)
       .text(toAnsiSafe(k.label.toUpperCase()), x + 12, yy + 9, { width: cardW - 20, lineBreak: false });

    const tone = k.tone === "good" ? BRAND.yes : k.tone === "bad" ? BRAND.no : BRAND.gilt;
    doc.fillColor(tone).font(F.kpiValue.name).fontSize(F.kpiValue.size)
       .text(toAnsiSafe(k.value), x + 12, yy + 22, { width: cardW - 20, lineBreak: false });

    if (k.delta) {
      doc.fillColor(BRAND.textFaint).font(F.kpiDelta.name).fontSize(F.kpiDelta.size)
         .text(toAnsiSafe(k.delta), x + 12, yy + 42, { width: cardW - 20, lineBreak: false });
    }
  }
  return blockTop + rows * (cardH + gap) + 10;
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

/* ── Table header — deep royal bar with gilt underline ────────────── */
function drawTableHeader(ctx: DocCtx, sec: Section, colW: number[], y: number, continuation = false): number {
  const { doc, contentX, contentW } = ctx;
  const hasSub = sec.columns.some((c) => c.sub);
  const headerH = hasSub ? 28 : 22;

  doc.save();
  doc.rect(contentX, y, contentW, headerH).fill(BRAND.royal);
  doc.rect(contentX, y + headerH - 1.5, contentW, 1.5).fill(BRAND.gilt);
  doc.restore();

  let xC = contentX;
  for (let i = 0; i < sec.columns.length; i++) {
    const c = sec.columns[i];
    const headerY = hasSub ? y + 5 : y + 6;
    doc.fillColor(BRAND.white).font(F.th.name).fontSize(F.th.size)
       .text(toAnsiSafe(c.header), xC + 8, headerY, { width: colW[i] - 16, align: c.align ?? "left", lineBreak: false, ellipsis: true });
    if (c.sub) {
      doc.fillColor(BRAND.giltBright).font(F.thSub.name).fontSize(F.thSub.size)
         .text(toAnsiSafe(c.sub), xC + 8, y + 17, { width: colW[i] - 16, align: c.align ?? "left", lineBreak: false, ellipsis: true });
    }
    xC += colW[i];
  }

  if (continuation) {
    doc.fillColor(BRAND.giltBright).font(F.thSub.name).fontSize(F.thSub.size)
       .text("· continued", contentX + contentW - 60, y + headerH + 2, { width: 60, align: "right", lineBreak: false });
  }
  return y + headerH;
}

/* ── Table section — full dark glass treatment ────────────────────── */
function drawSection(ctx: DocCtx, sec: Section, startY: number): number {
  const { doc, contentX, contentW } = ctx;
  let y = ensureRoom(ctx, 80, startY);

  // Section title with gilt accent
  doc.save();
  doc.rect(contentX, y + 1, 3, 13).fill(BRAND.gilt);
  doc.restore();
  doc.fillColor(BRAND.pearl).font(F.sectionTitle.name).fontSize(F.sectionTitle.size)
     .text(toAnsiSafe(sec.title), contentX + 10, y, { width: contentW - 10, lineBreak: false });
  y += 16;

  if (sec.titleSw) {
    doc.fillColor(BRAND.textSubtle).font(F.sectionDesc.name).fontSize(F.sectionDesc.size)
       .text(toAnsiSafe(sec.titleSw), contentX + 10, y, { width: contentW - 10, lineBreak: false });
    y += 12;
  }
  if (sec.description) {
    doc.fillColor(BRAND.textMuted).font(F.sectionDesc.name).fontSize(F.sectionDesc.size)
       .text(toAnsiSafe(sec.description), contentX, y, { width: contentW });
    y = doc.y + 6;
  }

  const colW = computeColWidths(sec.columns, contentW);
  const hasSub = sec.columns.some((c) => c.sub);
  const headerH = hasSub ? 28 : 22;
  y = ensureRoom(ctx, headerH + 30, y);
  y = drawTableHeader(ctx, sec, colW, y);

  const rowH = 24;

  if (sec.rows.length === 0) {
    y = ensureRoom(ctx, rowH + 4, y);
    doc.save();
    doc.rect(contentX, y, contentW, rowH).fill(BRAND.panel);
    doc.restore();
    doc.fillColor(BRAND.textSubtle).font(F.empty.name).fontSize(F.empty.size)
       .text("No data in this period  ·  Hakuna data katika kipindi hiki",
             contentX, y + 6, { width: contentW, align: "center", lineBreak: false });
    y += rowH;
  } else {
    for (let ri = 0; ri < sec.rows.length; ri++) {
      if (y + rowH + 4 > ctx.contentBottomY) {
        y = addContentPage(ctx);
        y = drawTableHeader(ctx, sec, colW, y, true);
      }

      // Alternating dark rows
      doc.save();
      if (ri % 2 === 0) {
        doc.rect(contentX, y, contentW, rowH).fill(BRAND.panel);
      } else {
        doc.rect(contentX, y, contentW, rowH).fill(BRAND.panelAlt);
      }
      // Subtle bottom border
      doc.lineWidth(0.3).strokeColor(BRAND.border)
         .moveTo(contentX, y + rowH).lineTo(contentX + contentW, y + rowH).stroke();
      doc.restore();

      const r = sec.rows[ri];
      let xc = contentX;
      for (let i = 0; i < sec.columns.length; i++) {
        const c = sec.columns[i];
        const text = renderCellText(r[c.key], c.format);
        const isNum = c.format === "tzs" || c.format === "integer" || c.format === "percent";
        doc.fillColor(BRAND.pearl).font(isNum ? F.tdNum.name : F.td.name).fontSize(F.td.size)
           .text(text, xc + 8, y + 7, { width: colW[i] - 16, align: c.align ?? (isNum ? "right" : "left"), lineBreak: false, ellipsis: true });
        xc += colW[i];
      }
      y += rowH;
    }
  }

  // Totals row — gilt-accented
  if (sec.totals) {
    y = ensureRoom(ctx, rowH + 8, y);
    doc.save();
    doc.rect(contentX, y, contentW, rowH + 2).fill(BRAND.giltDark);
    doc.rect(contentX, y, contentW, 1.5).fill(BRAND.gilt);
    doc.rect(contentX, y + rowH + 0.5, contentW, 1.5).fill(BRAND.gilt);
    doc.restore();
    let xc = contentX;
    for (let i = 0; i < sec.columns.length; i++) {
      const c = sec.columns[i];
      const v = sec.totals[c.key];
      let text = "";
      if (v !== undefined && v !== null) text = renderCellText(v, c.format);
      else if (i === 0) text = "Total";
      const isNum = c.format === "tzs" || c.format === "integer" || c.format === "percent";
      doc.fillColor(BRAND.giltBright).font(isNum ? F.totalNum.name : F.total.name).fontSize(F.total.size)
         .text(text, xc + 8, y + 7, { width: colW[i] - 16, align: c.align ?? (isNum ? "right" : "left"), lineBreak: false, ellipsis: true });
      xc += colW[i];
    }
    y += rowH + 4;
  }

  return y + 12;
}

/* ── Notes block ──────────────────────────────────────────────────── */
function drawNotes(ctx: DocCtx, notes: string[], startY: number): number {
  const { doc, contentX, contentW } = ctx;
  let y = ensureRoom(ctx, 30 + notes.length * 12, startY);

  doc.save();
  doc.rect(contentX, y + 1, 3, 12).fill(BRAND.gilt);
  doc.restore();
  doc.fillColor(BRAND.pearl).font(F.notesTitle.name).fontSize(F.notesTitle.size)
     .text("Notes & methodology", contentX + 10, y, { lineBreak: false });
  doc.fillColor(BRAND.textSubtle).font(F.sectionDesc.name).fontSize(F.notes.size)
     .text(toAnsiSafe("  ·  Maelezo na mbinu"), contentX + 10 + 130, y + 2, { lineBreak: false });
  y += 16;

  for (const n of notes) {
    y = ensureRoom(ctx, 14, y);
    doc.fillColor(BRAND.textMuted).font(F.notes.name).fontSize(F.notes.size)
       .text(toAnsiSafe("·  " + n), contentX, y, { width: contentW });
    y = doc.y + 3;
  }
  return y;
}

/* ── Signature / attestation block ────────────────────────────────── */
function drawSignatures(ctx: DocCtx, sigs: SignatureRow[], startY: number): number {
  const { doc, contentX, contentW } = ctx;
  const blockH = 60;
  let y = ensureRoom(ctx, blockH + 30, startY + 8);

  doc.save();
  doc.rect(contentX, y + 1, 3, 12).fill(BRAND.gilt);
  doc.restore();
  doc.fillColor(BRAND.pearl).font(F.notesTitle.name).fontSize(F.notesTitle.size)
     .text("Attestation", contentX + 10, y, { lineBreak: false });
  doc.fillColor(BRAND.textSubtle).font(F.sectionDesc.name).fontSize(F.notes.size)
     .text(toAnsiSafe("  ·  Uthibitisho"), contentX + 10 + 75, y + 2, { lineBreak: false });
  y += 18;

  const gap = 6;
  const cols = sigs.length;
  const cellW = (contentW - (cols - 1) * gap) / cols;

  for (let i = 0; i < sigs.length; i++) {
    const s = sigs[i];
    const x = contentX + i * (cellW + gap);

    doc.save();
    doc.rect(x, y, cellW, blockH).fill(BRAND.panel);
    doc.rect(x, y, 3, blockH).fill(BRAND.gilt);
    doc.restore();

    doc.fillColor(BRAND.textSubtle).font(F.kpiLabel.name).fontSize(F.kpiLabel.size)
       .text(toAnsiSafe(s.role.toUpperCase()), x + 12, y + 8, { width: cellW - 20, lineBreak: false });
    doc.fillColor(BRAND.pearl).font(F.sectionTitle.name).fontSize(F.sectionTitle.size - 2)
       .text(toAnsiSafe(s.name), x + 12, y + 20, { width: cellW - 20, lineBreak: false, ellipsis: true });
    if (s.id) {
      doc.fillColor(BRAND.textFaint).font(F.meta.name).fontSize(F.meta.size)
         .text(toAnsiSafe(s.id), x + 12, y + 34, { width: cellW - 20, lineBreak: false, ellipsis: true });
    }

    const lineY = y + blockH - 14;
    doc.save();
    doc.lineWidth(0.4).strokeColor(BRAND.gilt)
       .moveTo(x + 12, lineY).lineTo(x + cellW - 12, lineY).stroke();
    doc.restore();
    doc.fillColor(BRAND.textSubtle).font(F.footer.name).fontSize(F.footer.size)
       .text(toAnsiSafe(s.signedAt ? `Signed ${fmtDate(s.signedAt)}` : "Signature & date"),
             x + 12, lineY + 3, { width: cellW - 24, lineBreak: false });
  }
  return y + blockH + 10;
}

/* ── Main render entry point ──────────────────────────────────────── */
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
        contentX: PAD,
        contentW: pageW - PAD * 2,
        contentBottomY: pageH - CONTENT_BOTTOM_INSET - FOOTER_H,
        reference: report.reference,
        classification: report.meta.classification ?? "Internal",
        generatedAt: report.meta.generatedAt,
      };

      // First page — dark background
      drawPageBg(ctx);
      doc.y = CONTENT_TOP;
      doc.x = PAD;

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

      // Draw band + footer on every page
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
