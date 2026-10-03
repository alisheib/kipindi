// @ts-expect-error pdfkit has no declaration file
import PDFDocument from "pdfkit";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { BRAND, COMPANY, fmtDate, fmtDateTime, fmtTzs, toAnsiSafe } from "./brand";
import { summaryText, type Report, type Section, type Column, type SummaryItem, type SignatureRow } from "./types";

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
  const META_GAP = 18;
  const metaLineH = S.meta + 4;
  let mx = contentX;
  let my = y;
  for (const [label, value] of metaParts) {
    const l = toAnsiSafe(label);
    const v = toAnsiSafe("  " + value);
    doc.font(FN.medium).fontSize(S.metaLabel);
    const lw = doc.widthOfString(l);
    doc.font(FN.regular).fontSize(S.meta);
    const vw = doc.widthOfString(v);
    /* ⚠️ THIS ROW USED TO RUN OFF THE PAGE RATHER THAN WRAP. Every pair is drawn with
       `lineBreak: false` at an accumulated `mx`, so pdfkit will not wrap it for us — a long
       `generatedBy` (a long name, or a raw `usr_…` id when the officer has no displayName) already
       pushed "Classification" toward the right margin on portrait. Measure the pair and break the
       LINE, never the pair: a label stranded on one line with its value on the next is unreadable. */
    if (mx > contentX && mx + lw + vw > contentX + contentW) {
      mx = contentX;
      my += metaLineH;
    }
    doc.fillColor(BRAND.inkSubtle).font(FN.medium).fontSize(S.metaLabel)
       .text(l, mx, my, { lineBreak: false });
    doc.fillColor(BRAND.inkMuted).font(FN.regular).fontSize(S.meta)
       .text(v, mx + lw, my, { lineBreak: false });
    mx += lw + vw + META_GAP;
  }
  y = my + metaLineH + 2;

  /**
   * ⭐ THE PERIOD, ON ITS OWN WRAPPED LINE. `meta.period` is the one field on `Report` that names
   * the window the figures cover, and until now NEITHER renderer printed it — so `fiu-sar`,
   * `sx-register`, `kyc-reverify` and `rg-engagement` reached a regulator with no stated coverage
   * at all, while `fiu-sar`'s own notes said "within the period above" pointing at nothing.
   *
   * ⛔ Its own line, with wrapping ON, rather than a fifth pair in the row above. A point-in-time
   * statement runs past 120 characters; squeezed into the measured row it would either wrap to a
   * ragged second line mid-statement or be ellipsized, and an ellipsized window is worse than none
   * — REP-05b is the same defect one tile over. Letting pdfkit flow it full-width is the only
   * option here that cannot truncate.
   */
  doc.fillColor(BRAND.inkSubtle).font(FN.medium).fontSize(S.metaLabel)
     .text(toAnsiSafe("Period"), contentX, y, { lineBreak: false });
  const periodLabelW = doc.widthOfString(toAnsiSafe("Period"));
  doc.fillColor(BRAND.royalDeep).font(FN.regular).fontSize(S.meta)
     .text(toAnsiSafe("  " + report.meta.period), contentX + periodLabelW, y, {
       width: contentW - periodLabelW,
     });
  y = doc.y + 10;
  // Gilt divider
  doc.save();
  doc.rect(contentX, y, contentW, 1.5).fill(BRAND.gilt);
  doc.restore();
  return y + 16;
}

/* ── KPI summary ──────────────────────────────────────────────────── */

function drawSummary(ctx: DocCtx, summary: SummaryItem[], startY: number, maxCols: number = 4): number {
  const { doc, contentX, contentW } = ctx;
  const cols = Math.min(maxCols, summary.length);
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
    const h = doc.heightOfString(toAnsiSafe(summaryText(k)), { width: cardW - 20 });
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
       .text(toAnsiSafe(summaryText(k)), x + 12, yy + valueY, { width: cardW - 20, height: valueH, ellipsis: true });
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
  /* ⛔ SAME RULE AS THE XLSX RENDERER, AND FOR THE SAME DEFECT — see the note in xlsx.ts's
     `applyValue`. A `date` column handed a label ("Total (all)") or a placeholder ("—") used to
     render EMPTY here too, so the printed pack and the workbook lost the cell together. Every
     other format above already falls through to the raw string; these two now do as well. */
  if (format === "datetime") return fmtDateTime(String(raw)) || toAnsiSafe(String(raw));
  if (format === "date") return fmtDate(String(raw)) || toAnsiSafe(String(raw));
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
const CONTINUED_H = 14; // the "<table> (continued)" caption above a header repeated on a new page
const KEEP_WHOLE_ROWS = 10; // a table this short moves whole to the next page rather than split

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
  if (continuation) {
    // ⛔ ABOVE the band, naming the table: the old "continued" sat under the band's right edge, over the first row's
    // right-aligned figure (measured on the tax report's By product, 2026-10-03).
    doc.fillColor(BRAND.inkSubtle).font(FN.italic).fontSize(S.thSub)
       .text(toAnsiSafe(`${sec.title} (continued)`), contentX, y, { width: contentW, lineBreak: false, ellipsis: true });
    y += CONTINUED_H;
  }
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
  return y + headerH;
}

/* ── Section (title + table) ──────────────────────────────────────── */

function drawSection(ctx: DocCtx, sec: Section, startY: number): number {
  const { doc, contentX, contentW } = ctx;
  const colW = computeColWidths(sec.columns, contentW);
  const { headerH } = tableHeaderHeight(doc, sec, colW);
  // ⛔ KEEP A HEADING WITH ITS TABLE, AND A SHORT TABLE WHOLE. Measure before drawing anything: a table of up to
  // KEEP_WHOLE_ROWS rows that fits on a page moves whole to the next page rather than split; a longer one starts only
  // where its heading has at least three rows under it, and continues under a repeated header (the row loop keeps its
  // last two rows, and its last row and totals, together). A fixed 80pt let a heading print alone at a page's foot, and
  // a five-line Report 2 split one line / four (measured on the tax report, 2026-10-03).
  doc.font(FN.regular).fontSize(S.sectionDesc);
  const descH = sec.description ? doc.heightOfString(toAnsiSafe(sec.description), { width: contentW }) + 6 : 0;
  const headH = 18 + (sec.titleSw ? 13 : 0) + descH + headerH;
  const rowHs = sec.rows.map((r) => measureRowHeight(doc, r as Record<string, unknown>, sec.columns, colW));
  const totalsH = sec.totals ? MIN_ROW_H + 6 : 0;
  const wholeH = headH + (rowHs.length > 0 ? rowHs.reduce((a, b) => a + b, 0) : MIN_ROW_H) + totalsH + 2;
  const short = rowHs.length <= KEEP_WHOLE_ROWS && wholeH <= ctx.contentBottomY - CONTENT_TOP;
  const needed = short ? wholeH : headH + rowHs.slice(0, 3).reduce((a, b) => a + b, 0) + 2;
  let y = ensureRoom(ctx, needed, startY);

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
    const n = sec.rows.length;
    for (let ri = 0; ri < n; ri++) {
      const rowH = rowHs[ri];
      // No single-row widow on a new page, and never a totals band alone: the second-to-last row breaks early when the
      // last row (and the totals) would not follow it, and the last row when its totals would not.
      const tail = ri === n - 1 ? totalsH : ri === n - 2 && ri >= 3 ? rowHs[n - 1] + totalsH : 0;
      if (y + rowH + 2 > ctx.contentBottomY || (ri > 0 && tail > 0 && y + rowH + tail + 2 > ctx.contentBottomY)) {
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

/** The attestation's name and id sizes, and the floor each may shrink to before it is cut. */
const SIG_NAME = { size: S.sectionTitle - 2, min: 8 };
const SIG_ID = { size: 7.5, min: 6 };

/**
 * One line, always: the size steps down (to `min`) until the text fits, and only then is it cut with an ellipsis.
 * ⛔ pdfkit wraps a too-wide text even under `lineBreak: false` once a width is given — a long "Prepared by" name
 * printed its second line over the id and the signature rule (measured on the GBT pack's attestation, 2026-10-03).
 * `height` of one line is what makes `ellipsis` cut instead of wrap.
 */
function fitOneLine(doc: InstanceType<typeof PDFDocument>, text: string, x: number, y: number, width: number, font: string, size: number, min: number): void {
  let s = size;
  doc.font(font).fontSize(s);
  while (s > min && doc.widthOfString(text) > width) { s -= 0.5; doc.fontSize(s); }
  doc.text(text, x, y, { width, height: doc.currentLineHeight(true), lineBreak: false, ellipsis: true });
}

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
    doc.fillColor(BRAND.royalDeep);
    fitOneLine(doc, toAnsiSafe(s.name), x + 12, y + 22, cellW - 20, FN.bold, SIG_NAME.size, SIG_NAME.min);
    if (s.id) {
      doc.fillColor(BRAND.inkSubtle);
      fitOneLine(doc, toAnsiSafe(s.id), x + 12, y + 36, cellW - 20, FN.mono, SIG_ID.size, SIG_ID.min);
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
        y = drawSummary(ctx, report.summary, y, report.summaryColumns ?? 4);
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

/* ── Fit check ────────────────────────────────────────────────────── */

/** One box whose text cannot fit it: pdfkit splits a token wider than its line mid-token — "100,000,00" over "0". */
export type PdfOverflow = { where: string; text: string; needPt: number; havePt: number };

/**
 * ⭐ THE PRINTED PAGE, MEASURED. Every box `renderPdf` draws text into, measured with the SAME fonts, sizes and
 * widths it draws with: each KPI label and value, each column header and sub-line, each body cell, each totals
 * cell. A box fails when one unbreakable token (a figure, a code, an id — split here at spaces only, the
 * conservative reading) is wider than the box, because pdfkit then breaks it mid-token; a header or KPI label
 * also fails past its two-line cap (the renderer cuts it with an ellipsis); and a totals cell, drawn in a
 * fixed-height band, fails unless its whole text fits one line. Prose that wraps between words is fine.
 * Returns [] when everything fits. A report's guard calls it on a fixture with large figures; rendering never does.
 */
export function findPdfOverflows(report: Report): PdfOverflow[] {
  const doc = new PDFDocument({ size: "A4", layout: report.orientation ?? "portrait", margins: { top: 0, bottom: 0, left: 0, right: 0 } });
  registerFonts(doc);
  const contentW = doc.page.width - PAD * 2;
  const out: PdfOverflow[] = [];
  const pt = (n: number) => Math.round(n * 10) / 10;
  const fits = (where: string, raw: string, font: string, size: number, havePt: number, mode: "tokens" | "line" | "two-lines") => {
    const text = toAnsiSafe(raw).trim();
    if (!text) return;
    doc.font(font).fontSize(size);
    if (mode === "line") {
      const w = doc.widthOfString(text);
      if (w > havePt) out.push({ where, text, needPt: pt(w), havePt: pt(havePt) });
      return;
    }
    for (const tok of text.split(" ")) {
      const w = doc.widthOfString(tok);
      if (w > havePt) out.push({ where, text: tok, needPt: pt(w), havePt: pt(havePt) });
    }
    if (mode === "two-lines") {
      const h = doc.heightOfString(text, { width: havePt });
      if (h > doc.currentLineHeight(true) * 2 + 0.5) out.push({ where: `${where} (more than two lines)`, text, needPt: pt(h), havePt: pt(doc.currentLineHeight(true) * 2) });
    }
  };

  if (report.summary && report.summary.length > 0) {
    const cols = Math.min(report.summaryColumns ?? 4, report.summary.length);
    const cardW = (contentW - (cols - 1) * 8) / cols;
    for (const k of report.summary) {
      fits(`summary "${k.label}" · label`, k.label.toUpperCase(), FN.bold, S.kpiLabel, cardW - 24, "two-lines");
      fits(`summary "${k.label}" · value`, summaryText(k), FN.bold, S.kpiValue, cardW - 20, "two-lines");
    }
  }
  if (report.signatures && report.signatures.length > 0) {
    // A name or id that does not fit even at its floor size is CUT (ellipsis) — a signatory's name half-printed.
    const cellW = (contentW - (report.signatures.length - 1) * 8) / report.signatures.length;
    for (const sg of report.signatures) {
      fits(`attestation "${sg.role}" · name`, sg.name, FN.bold, SIG_NAME.min, cellW - 20, "line");
      if (sg.id) fits(`attestation "${sg.role}" · id`, sg.id, FN.mono, SIG_ID.min, cellW - 20, "line");
    }
  }
  for (const sec of report.sections) {
    const colW = computeColWidths(sec.columns, contentW);
    sec.columns.forEach((c, i) => {
      const have = colW[i] - CELL_PAD_X * 2;
      const isNum = c.format === "tzs" || c.format === "integer" || c.format === "percent";
      fits(`${sec.title} · header "${c.header}"`, c.header, FN.bold, S.th, have, "two-lines");
      if (c.sub) fits(`${sec.title} · "${c.header}" sub-line`, c.sub, FN.regular, S.thSub, have, "line");
      for (const r of sec.rows) fits(`${sec.title} · ${c.header}`, renderCellText(r[c.key], c.format), isNum ? FN.mono : FN.regular, isNum ? S.tdMono : S.td, have, "tokens");
      if (sec.totals) {
        const v = sec.totals[c.key];
        const text = v !== undefined && v !== null ? renderCellText(v, c.format) : i === 0 ? "Total" : "";
        fits(`${sec.title} · totals ${c.header}`, text, isNum ? FN.monoBold : FN.bold, S.total, have, "line");
      }
    });
  }
  return out;
}

/** Which faces the renderer found — a fit check measured on the fallback fonts says so, rather than passing quietly. */
export function pdfFontsLoaded(): { inter: boolean; mono: boolean } {
  return { inter: !!(FONTS.regular && FONTS.bold), mono: !!(FONTS.mono && FONTS.monoBold) };
}
