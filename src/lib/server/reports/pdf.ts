// @ts-expect-error pdfkit has no declaration file
import PDFDocument from "pdfkit";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { BRAND, COMPANY, fmtDate, fmtDateTime, fmtTzs, toAnsiSafe } from "./brand";
import type { Report, Section, Column, SummaryItem, SignatureRow } from "./types";

/* ── Asset loading ────────────────────────────────────────────────── */

const FONT_DIR = join(__dirname, "fonts");

function loadFont(name: string): string | null {
  const p = join(FONT_DIR, name);
  return existsSync(p) ? p : null;
}

const FONTS = {
  regular:  loadFont("Inter-Regular.ttf"),
  medium:   loadFont("Inter-Medium.ttf"),
  bold:     loadFont("Inter-Bold.ttf"),
  mono:     loadFont("JetBrainsMono-Regular.ttf"),
  monoBold: loadFont("JetBrainsMono-Bold.ttf"),
};

// Font names used in the doc — if TTF available we register them,
// otherwise fall back to PDFKit built-ins.
const FN = {
  regular:  FONTS.regular  ? "Inter"          : "Helvetica",
  medium:   FONTS.medium   ? "Inter-Medium"   : "Helvetica",
  bold:     FONTS.bold     ? "Inter-Bold"     : "Helvetica-Bold",
  mono:     FONTS.mono     ? "JBMono"         : "Courier",
  monoBold: FONTS.monoBold ? "JBMono-Bold"    : "Courier-Bold",
  italic:   "Helvetica-Oblique", // fallback — Inter italic not bundled
};

const LOGO_PNG = (() => {
  try { return readFileSync(join(process.cwd(), "public/icons/mark-color-512.png")); }
  catch { return null; }
})();

/* ── Layout ───────────────────────────────────────────────────────── */

const PAD = 40;
const BAND_H = 52;
const FOOTER_H = 28;
const CONTENT_TOP = BAND_H + 24;
const CELL_PAD_X = 10;   // horizontal padding inside every cell
const CELL_PAD_Y = 7;    // vertical padding above text in a row
const MIN_ROW_H = 26;    // minimum row height (single line)

/* ── Font size table ──────────────────────────────────────────────── */

const S = {
  bandName:     13,
  bandTag:      9,
  bandRight:    10,
  title:        24,
  subtitle:     10.5,
  meta:         8,
  metaLabel:    7.5,
  kpiLabel:     8,
  kpiValue:     17,
  kpiDelta:     7.5,
  sectionTitle: 13,
  sectionDesc:  8.5,
  th:           8.5,
  thSub:        7.5,
  td:           9,
  tdMono:       8.5,
  total:        9.5,
  empty:        9,
  notes:        8,
  notesTitle:   10,
  footer:       7.5,
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

function registerFonts(doc: InstanceType<typeof PDFDocument>) {
  if (FONTS.regular)  doc.registerFont("Inter", FONTS.regular);
  if (FONTS.medium)   doc.registerFont("Inter-Medium", FONTS.medium);
  if (FONTS.bold)     doc.registerFont("Inter-Bold", FONTS.bold);
  if (FONTS.mono)     doc.registerFont("JBMono", FONTS.mono);
  if (FONTS.monoBold) doc.registerFont("JBMono-Bold", FONTS.monoBold);
}

/* ── Band (top) ───────────────────────────────────────────────────── */

function drawBand(ctx: DocCtx) {
  const { doc, pageW } = ctx;
  doc.save();
  doc.rect(0, 0, pageW, BAND_H).fill(BRAND.royalDeep);
  doc.rect(0, 0, pageW, BAND_H * 0.5).fill(BRAND.royal);
  doc.rect(0, BAND_H - 2.5, pageW, 2.5).fill(BRAND.gilt);

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
  doc.fillColor(BRAND.white).font(FN.bold).fontSize(S.bandName)
     .text(COMPANY.name, textX, nameY, { lineBreak: false });
  doc.fillColor(BRAND.giltBright).font(FN.regular).fontSize(S.bandTag)
     .text(toAnsiSafe(COMPANY.tagline), textX, tagY, { lineBreak: false });
  doc.fillColor(BRAND.white).font(FN.bold).fontSize(S.bandRight)
     .text(COMPANY.tld, pageW - PAD - 130, nameY + 1, { width: 130, align: "right", lineBreak: false });
  doc.fillColor(BRAND.giltBright).font(FN.regular).fontSize(7.5)
     .text(COMPANY.jurisdiction, pageW - PAD - 130, tagY + 1, { width: 130, align: "right", lineBreak: false });
  doc.restore();
}

/* ── Footer ───────────────────────────────────────────────────────── */

function drawFooter(ctx: DocCtx, pageNum: number, pageCount: number) {
  const { doc, pageW, pageH, reference, classification, generatedAt } = ctx;
  const y = pageH - FOOTER_H;
  doc.save();
  doc.lineWidth(0.5).strokeColor(BRAND.rule)
     .moveTo(PAD, y).lineTo(pageW - PAD, y).stroke();
  doc.fillColor(BRAND.inkSubtle).font(FN.regular).fontSize(S.footer);
  doc.text(toAnsiSafe(`${reference}  ·  ${classification}`), PAD, y + 9, { lineBreak: false });
  doc.text(`Page ${pageNum} of ${pageCount}`, pageW / 2 - 60, y + 9, { width: 120, align: "center", lineBreak: false });
  doc.text(fmtDateTime(generatedAt), pageW - PAD - 180, y + 9, { width: 180, align: "right", lineBreak: false });
  doc.restore();
}

function addContentPage(ctx: DocCtx): number {
  // Inherit the document's size + orientation (set at construction) so a
  // landscape report stays landscape across page breaks.
  ctx.doc.addPage();
  return CONTENT_TOP;
}

function ensureRoom(ctx: DocCtx, needed: number, y: number): number {
  return y + needed > ctx.contentBottomY ? addContentPage(ctx) : y;
}

/* ── Report header ────────────────────────────────────────────────── */

function drawHeader(ctx: DocCtx, report: Report): number {
  const { doc, contentX, contentW } = ctx;
  let y = CONTENT_TOP;
  doc.fillColor(BRAND.royalDeep).font(FN.bold).fontSize(S.title)
     .text(toAnsiSafe(report.title), contentX, y, { width: contentW });
  y = doc.y + 3;
  doc.fillColor(BRAND.inkMuted).font(FN.regular).fontSize(S.subtitle)
     .text(toAnsiSafe(report.subtitle), contentX, y, { width: contentW, lineBreak: false });
  y = doc.y + 12;
  // Meta row
  const metaParts = [
    ["Generated", fmtDateTime(report.meta.generatedAt)],
    ["By", report.meta.generatedBy],
    ["Reference", report.reference],
    ["Classification", report.meta.classification ?? "Internal"],
  ];
  let mx = contentX;
  for (const [label, value] of metaParts) {
    doc.fillColor(BRAND.inkSubtle).font(FN.medium).fontSize(S.metaLabel)
       .text(toAnsiSafe(label), mx, y, { lineBreak: false });
    const lw = doc.widthOfString(toAnsiSafe(label));
    doc.fillColor(BRAND.inkMuted).font(FN.regular).fontSize(S.meta)
       .text(toAnsiSafe("  " + value), mx + lw, y, { lineBreak: false });
    mx += lw + doc.widthOfString(toAnsiSafe("  " + value)) + 18;
  }
  y = doc.y + 10;
  // Gilt divider
  doc.save();
  doc.rect(contentX, y, contentW, 1.5).fill(BRAND.gilt);
  doc.restore();
  return y + 16;
}

/* ── KPI summary ──────────────────────────────────────────────────── */

function drawSummary(ctx: DocCtx, summary: SummaryItem[], startY: number): number {
  const { doc, contentX, contentW } = ctx;
  const cols = Math.min(4, summary.length);
  const gap = 8;
  const cardW = (contentW - (cols - 1) * gap) / cols;
  const labelW = cardW - 24;
  const hasAnyDelta = summary.some((k) => !!k.delta);

  // A KPI label like "GROSS GAMING REVENUE" or "TRA 10% ON COMMISSION" is longer
  // than one card width, so it wraps. Measure the tallest label (capped at two
  // lines) once and lay every card to the SAME baselines — the value never
  // collides with a wrapped label, and all cards in the row stay aligned.
  const LINE_H = S.kpiLabel + 2;
  doc.font(FN.bold).fontSize(S.kpiLabel);
  let labelH = LINE_H;
  for (const k of summary) {
    const h = doc.heightOfString(toAnsiSafe(k.label.toUpperCase()), { width: labelW });
    if (h > labelH) labelH = h;
  }
  labelH = Math.min(labelH, LINE_H * 2); // cap at two lines
  // Values are usually one short token, but some (e.g. the ISO log's first/last
  // entry timestamp "2026-07-21 09:13:15") are long enough to wrap. Measure the
  // tallest value too, cap at two lines, and size the card so no value ever
  // overflows into the delta or the card edge.
  const VLINE_H = S.kpiValue + 3;
  doc.font(FN.bold).fontSize(S.kpiValue);
  let valueH = VLINE_H;
  for (const k of summary) {
    const h = doc.heightOfString(toAnsiSafe(k.value), { width: cardW - 20 });
    if (h > valueH) valueH = h;
  }
  valueH = Math.min(valueH, VLINE_H * 2);
  const PAD_TOP = 9;
  const valueY = PAD_TOP + labelH + 5;
  const cardH = valueY + valueH + (hasAnyDelta ? 12 : 6);

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
    doc.rect(x, yy, cardW, cardH).fill(BRAND.royalSoft);
    doc.rect(x, yy, 3, cardH).fill(BRAND.gilt);
    doc.restore();
    doc.fillColor(BRAND.inkMuted).font(FN.bold).fontSize(S.kpiLabel)
       .text(toAnsiSafe(k.label.toUpperCase()), x + 12, yy + PAD_TOP, { width: labelW, height: labelH, ellipsis: true });
    const tone = k.tone === "good" ? BRAND.yes : k.tone === "bad" ? BRAND.no : BRAND.royalDeep;
    doc.fillColor(tone).font(FN.bold).fontSize(S.kpiValue)
       .text(toAnsiSafe(k.value), x + 12, yy + valueY, { width: cardW - 20, height: valueH, ellipsis: true });
    if (k.delta) {
      doc.fillColor(BRAND.inkSubtle).font(FN.regular).fontSize(S.kpiDelta)
         .text(toAnsiSafe(k.delta), x + 12, yy + valueY + valueH + 2, { width: cardW - 20, lineBreak: false });
    }
  }
  return blockTop + rows * (cardH + gap) + 10;
}

/* ── Table helpers ────────────────────────────────────────────────── */

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

/** Measure the actual height a row needs given its content. */
function measureRowHeight(doc: InstanceType<typeof PDFDocument>, row: Record<string, unknown>, cols: Column[], colW: number[]): number {
  let maxH = MIN_ROW_H;
  for (let i = 0; i < cols.length; i++) {
    const text = renderCellText(row[cols[i].key] as string | number | null, cols[i].format);
    if (!text) continue;
    const isNum = cols[i].format === "tzs" || cols[i].format === "integer" || cols[i].format === "percent";
    const font = isNum ? FN.mono : FN.regular;
    const size = isNum ? S.tdMono : S.td;
    doc.font(font).fontSize(size);
    const h = doc.heightOfString(text, { width: colW[i] - CELL_PAD_X * 2 }) + CELL_PAD_Y * 2;
    if (h > maxH) maxH = h;
  }
  return maxH;
}

/* ── Table header ─────────────────────────────────────────────────── */

const TH_TOP = 6;      // pad above the header text
const TH_BOT = 6;      // pad below the last header/sub line
const TH_GAP = 2;      // gap between a wrapped header and its sub-line

/** The header band's height, sized to fit the tallest (possibly two-line)
 *  header plus a sub-line. Computed once and reused for both the room check and
 *  every (continuation) draw, so the band never clips a wrapped header nor lets
 *  a sub-label collide with it (e.g. "Reality chk" + "min"). */
function tableHeaderHeight(doc: InstanceType<typeof PDFDocument>, sec: Section, colW: number[]): { headerH: number; headTextH: number } {
  const oneLine = S.th + 2;
  doc.font(FN.bold).fontSize(S.th);
  let headTextH = oneLine;
  for (let i = 0; i < sec.columns.length; i++) {
    const h = doc.heightOfString(toAnsiSafe(sec.columns[i].header), { width: colW[i] - CELL_PAD_X * 2 });
    if (h > headTextH) headTextH = h;
  }
  headTextH = Math.min(headTextH, oneLine * 2); // cap wrapped headers at two lines
  const hasSub = sec.columns.some((c) => c.sub);
  const headerH = TH_TOP + headTextH + (hasSub ? TH_GAP + (S.thSub + 2) : 0) + TH_BOT;
  return { headerH, headTextH };
}

function drawTableHeader(ctx: DocCtx, sec: Section, colW: number[], y: number, continuation = false): number {
  const { doc, contentX, contentW } = ctx;
  const { headerH, headTextH } = tableHeaderHeight(doc, sec, colW);
  doc.save();
  doc.rect(contentX, y, contentW, headerH).fill(BRAND.royal);
  doc.rect(contentX, y + headerH - 1.5, contentW, 1.5).fill(BRAND.gilt);
  doc.restore();
  const subY = y + TH_TOP + headTextH + TH_GAP; // subs sit on one baseline, below the tallest header
  let xC = contentX;
  for (let i = 0; i < sec.columns.length; i++) {
    const c = sec.columns[i];
    // Wrapping is allowed (capped to headTextH ≈ two lines with ellipsis) so a
    // long header like "Reality chk" reads in full instead of overflowing into
    // the neighbouring column.
    doc.fillColor(BRAND.white).font(FN.bold).fontSize(S.th)
       .text(toAnsiSafe(c.header), xC + CELL_PAD_X, y + TH_TOP, { width: colW[i] - CELL_PAD_X * 2, height: headTextH, align: c.align ?? "left", ellipsis: true });
    if (c.sub) {
      doc.fillColor(BRAND.giltSoft).font(FN.regular).fontSize(S.thSub)
         .text(toAnsiSafe(c.sub), xC + CELL_PAD_X, subY, { width: colW[i] - CELL_PAD_X * 2, align: c.align ?? "left", lineBreak: false, ellipsis: true });
    }
    xC += colW[i];
  }
  if (continuation) {
    doc.fillColor(BRAND.giltSoft).font(FN.regular).fontSize(S.thSub)
       .text(toAnsiSafe("continued"), contentX + contentW - 55, y + headerH + 2, { width: 55, align: "right", lineBreak: false });
  }
  return y + headerH;
}

/* ── Section (title + table) ──────────────────────────────────────── */

function drawSection(ctx: DocCtx, sec: Section, startY: number): number {
  const { doc, contentX, contentW } = ctx;
  let y = ensureRoom(ctx, 80, startY);

  // Section title with gilt accent bar
  doc.save();
  doc.rect(contentX, y + 1, 3, 14).fill(BRAND.gilt);
  doc.restore();
  doc.fillColor(BRAND.royalDeep).font(FN.bold).fontSize(S.sectionTitle)
     .text(toAnsiSafe(sec.title), contentX + 12, y, { width: contentW - 12, lineBreak: false });
  y += 18;
  if (sec.titleSw) {
    doc.fillColor(BRAND.inkSubtle).font(FN.italic).fontSize(S.sectionDesc)
       .text(toAnsiSafe(sec.titleSw), contentX + 12, y, { width: contentW - 12, lineBreak: false });
    y += 13;
  }
  if (sec.description) {
    doc.fillColor(BRAND.inkSubtle).font(FN.regular).fontSize(S.sectionDesc)
       .text(toAnsiSafe(sec.description), contentX, y, { width: contentW });
    y = doc.y + 6;
  }

  const colW = computeColWidths(sec.columns, contentW);
  const { headerH } = tableHeaderHeight(doc, sec, colW);
  y = ensureRoom(ctx, headerH + MIN_ROW_H, y);
  y = drawTableHeader(ctx, sec, colW, y);

  if (sec.rows.length === 0) {
    doc.save();
    doc.rect(contentX, y, contentW, MIN_ROW_H).fill(BRAND.royalSoft);
    doc.restore();
    doc.fillColor(BRAND.inkSubtle).font(FN.italic).fontSize(S.empty)
       .text("No data in this period  ·  Hakuna data katika kipindi hiki",
             contentX, y + CELL_PAD_Y, { width: contentW, align: "center", lineBreak: false });
    y += MIN_ROW_H;
  } else {
    for (let ri = 0; ri < sec.rows.length; ri++) {
      const rowH = measureRowHeight(doc, sec.rows[ri] as Record<string, unknown>, sec.columns, colW);

      if (y + rowH + 2 > ctx.contentBottomY) {
        y = addContentPage(ctx);
        y = drawTableHeader(ctx, sec, colW, y, true);
      }

      // Alternating background
      if (ri % 2 === 1) {
        doc.save();
        doc.rect(contentX, y, contentW, rowH).fill(BRAND.royalSoft);
        doc.restore();
      }
      // Bottom border
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
        doc.fillColor(BRAND.ink).font(isNum ? FN.mono : FN.regular).fontSize(isNum ? S.tdMono : S.td)
           .text(text, xc + CELL_PAD_X, y + CELL_PAD_Y, {
             width: colW[i] - CELL_PAD_X * 2,
             align: c.align ?? (isNum ? "right" : "left"),
           });
        xc += colW[i];
      }
      y += rowH;
    }
  }

  // Totals row
  if (sec.totals) {
    const totalH = MIN_ROW_H + 2;
    y = ensureRoom(ctx, totalH + 4, y);
    doc.save();
    doc.rect(contentX, y, contentW, totalH).fill(BRAND.giltSoft);
    doc.rect(contentX, y, contentW, 1.5).fill(BRAND.gilt);
    doc.rect(contentX, y + totalH - 1, contentW, 1.5).fill(BRAND.gilt);
    doc.restore();
    let xc = contentX;
    for (let i = 0; i < sec.columns.length; i++) {
      const c = sec.columns[i];
      const v = sec.totals[c.key];
      let text = "";
      if (v !== undefined && v !== null) text = renderCellText(v, c.format);
      else if (i === 0) text = "Total";
      const isNum = c.format === "tzs" || c.format === "integer" || c.format === "percent";
      doc.fillColor(BRAND.giltFg).font(isNum ? FN.monoBold : FN.bold).fontSize(S.total)
         .text(text, xc + CELL_PAD_X, y + CELL_PAD_Y, {
           width: colW[i] - CELL_PAD_X * 2,
           align: c.align ?? (isNum ? "right" : "left"),
           lineBreak: false,
         });
      xc += colW[i];
    }
    y += totalH + 4;
  }

  return y + 12;
}

/* ── Notes ────────────────────────────────────────────────────────── */

function drawNotes(ctx: DocCtx, notes: string[], startY: number): number {
  const { doc, contentX, contentW } = ctx;
  let y = ensureRoom(ctx, 30 + notes.length * 14, startY);
  doc.save();
  doc.rect(contentX, y + 1, 3, 13).fill(BRAND.gilt);
  doc.restore();
  doc.fillColor(BRAND.royalDeep).font(FN.bold).fontSize(S.notesTitle)
     .text("Notes & methodology", contentX + 12, y, { lineBreak: false });
  doc.fillColor(BRAND.inkSubtle).font(FN.italic).fontSize(S.notes)
     .text(toAnsiSafe("  ·  Maelezo na mbinu"), contentX + 12 + 140, y + 2, { lineBreak: false });
  y += 16;
  for (const n of notes) {
    y = ensureRoom(ctx, 14, y);
    doc.fillColor(BRAND.inkSubtle).font(FN.regular).fontSize(S.notes)
       .text(toAnsiSafe("·  " + n), contentX, y, { width: contentW });
    y = doc.y + 3;
  }
  return y;
}

/* ── Signatures ───────────────────────────────────────────────────── */

function drawSignatures(ctx: DocCtx, sigs: SignatureRow[], startY: number): number {
  const { doc, contentX, contentW } = ctx;
  const blockH = 62;
  let y = ensureRoom(ctx, blockH + 30, startY + 8);
  doc.save();
  doc.rect(contentX, y + 1, 3, 13).fill(BRAND.gilt);
  doc.restore();
  doc.fillColor(BRAND.royalDeep).font(FN.bold).fontSize(S.notesTitle)
     .text("Attestation", contentX + 12, y, { lineBreak: false });
  doc.fillColor(BRAND.inkSubtle).font(FN.italic).fontSize(S.notes)
     .text(toAnsiSafe("  ·  Uthibitisho"), contentX + 12 + 80, y + 2, { lineBreak: false });
  y += 18;
  const gap = 8;
  const cols = sigs.length;
  const cellW = (contentW - (cols - 1) * gap) / cols;
  for (let i = 0; i < sigs.length; i++) {
    const s = sigs[i];
    const x = contentX + i * (cellW + gap);
    doc.save();
    doc.rect(x, y, cellW, blockH).fill(BRAND.royalSoft);
    doc.rect(x, y, 3, blockH).fill(BRAND.gilt);
    doc.restore();
    doc.fillColor(BRAND.inkMuted).font(FN.bold).fontSize(S.kpiLabel)
       .text(toAnsiSafe(s.role.toUpperCase()), x + 12, y + 8, { width: cellW - 20, lineBreak: false });
    doc.fillColor(BRAND.royalDeep).font(FN.bold).fontSize(S.sectionTitle - 2)
       .text(toAnsiSafe(s.name), x + 12, y + 22, { width: cellW - 20, lineBreak: false, ellipsis: true });
    if (s.id) {
      doc.fillColor(BRAND.inkSubtle).font(FN.mono).fontSize(7.5)
         .text(toAnsiSafe(s.id), x + 12, y + 36, { width: cellW - 20, lineBreak: false, ellipsis: true });
    }
    const lineY = y + blockH - 14;
    doc.save();
    doc.lineWidth(0.4).strokeColor(BRAND.gilt)
       .moveTo(x + 12, lineY).lineTo(x + cellW - 12, lineY).stroke();
    doc.restore();
    doc.fillColor(BRAND.inkSubtle).font(FN.regular).fontSize(S.footer)
       .text(toAnsiSafe(s.signedAt ? `Signed ${fmtDate(s.signedAt)}` : "Signature & date"),
             x + 12, lineY + 3, { width: cellW - 24, lineBreak: false });
  }
  return y + blockH + 10;
}

/* ── Main entry ───────────────────────────────────────────────────── */

export async function renderPdf(report: Report): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        layout: report.orientation ?? "portrait",
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        bufferPages: true,
        info: {
          Title: report.title,
          Author: COMPANY.name,
          Subject: report.subtitle,
          Keywords: `50pick, ${COMPANY.name}, report`,
          CreationDate: new Date(report.meta.generatedAt),
        },
      });
      registerFonts(doc);

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
        contentBottomY: pageH - FOOTER_H - 16,
        reference: report.reference,
        classification: report.meta.classification ?? "Internal",
        generatedAt: report.meta.generatedAt,
      };

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
