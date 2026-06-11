import ExcelJS from "exceljs";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BRAND, COMPANY, fmtDate, fmtDateTime } from "./brand";
import type { Report, Section, Column, Row, SignatureRow } from "./types";

const LOGO_PNG_PATH = join(process.cwd(), "public/icons/mark-color-512.png");
const LOGO_PNG_BUF = (() => {
  try { return readFileSync(LOGO_PNG_PATH); } catch { return null; }
})();

const argb = (hex: string) => "FF" + hex.replace("#", "").toUpperCase();

function colWidthFor(col: Column, rows: Row[]): number {
  const headerLen = Math.max(col.header.length, col.sub?.length ?? 0);
  let maxData = 0;
  for (const r of rows) {
    const v = r[col.key];
    const s = v === null || v === undefined ? "" :
      typeof v === "number" ? v.toLocaleString("en-US") : String(v);
    if (s.length > maxData) maxData = s.length;
  }
  return Math.max(col.width ?? 0, Math.min(60, Math.max(headerLen + 2, maxData + 2)));
}

function applyValue(cell: ExcelJS.Cell, raw: string | number | null, format?: Column["format"]) {
  if (raw === null || raw === undefined) { cell.value = ""; return; }
  if (typeof raw === "number") {
    cell.value = raw;
    if (format === "tzs") cell.numFmt = '#,##0;[Red]-#,##0';
    else if (format === "integer") cell.numFmt = '#,##0';
    else if (format === "percent") cell.numFmt = '0.0%';
    return;
  }
  if (format === "datetime") cell.value = raw ? fmtDateTime(String(raw)) : "";
  else if (format === "date") cell.value = raw ? fmtDate(String(raw)) : "";
  else cell.value = String(raw);
}

export async function renderXlsx(report: Report): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = `${COMPANY.name} · Reporting`;
  wb.company = COMPANY.name;
  wb.subject = report.title;
  wb.title = report.title;
  wb.description = report.subtitle;
  wb.created = new Date(report.meta.generatedAt);
  wb.lastModifiedBy = report.meta.generatedBy;

  const sheet = wb.addWorksheet(report.title.slice(0, 31), {
    properties: { tabColor: { argb: argb(BRAND.gilt) } },
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
    },
    headerFooter: {
      oddHeader: `&L${COMPANY.name}&C${report.title}&R&P / &N`,
      oddFooter: `&L${report.reference}&C${COMPANY.tld}&R${fmtDateTime(report.meta.generatedAt)}`,
    },
  });

  const MERGE_END = "L";

  // Brand band spans rows 1-3 as a single tall band that fits the
  // logo image cleanly. Column A is the logo gutter; B..L is the
  // text. The royal fill on each cell makes the whole band read as
  // one block.
  for (let r = 1; r <= 3; r++) {
    for (let c = 1; c <= 12; c++) {
      sheet.getRow(r).getCell(c).fill = {
        type: "pattern", pattern: "solid", fgColor: { argb: argb(BRAND.royal) },
      };
    }
  }
  // Logo gutter — column A, ~46px wide
  sheet.getColumn(1).width = 8;
  sheet.getRow(1).height = 16;
  sheet.getRow(2).height = 22;
  sheet.getRow(3).height = 16;

  // Company name on row 2 in the merged B..L band
  sheet.mergeCells(`B2:${MERGE_END}2`);
  const band1 = sheet.getCell("B2");
  band1.value = COMPANY.name;
  band1.font = { name: "Calibri", size: 16, bold: true, color: { argb: argb(BRAND.white) } };
  band1.alignment = { vertical: "middle", horizontal: "left" };

  // Tagline + tld on row 3 in the merged B..L band
  sheet.mergeCells(`B3:${MERGE_END}3`);
  const band2 = sheet.getCell("B3");
  band2.value = `${COMPANY.tagline}      ${COMPANY.tld}      ${COMPANY.jurisdiction}`;
  band2.font = { name: "Calibri", size: 9.5, italic: true, color: { argb: argb(BRAND.giltSoft) } };
  band2.alignment = { vertical: "middle", horizontal: "left" };

  // Top-of-band thin fill on row 1 to widen the band visually
  sheet.mergeCells(`A1:${MERGE_END}1`);

  // Embed the logo PNG anchored to the logo gutter. Safe to skip when
  // the PNG isn't present (e.g. a build step missed it) — band stays
  // royal-only.
  if (LOGO_PNG_BUF) {
    try {
      const imgId = wb.addImage({ buffer: LOGO_PNG_BUF as unknown as ExcelJS.Buffer, extension: "png" });
      sheet.addImage(imgId, {
        tl: { col: 0.15, row: 1.05 } as ExcelJS.Anchor,
        ext: { width: 42, height: 42 },
        editAs: "absolute",
      });
    } catch {
      // ignore — band still renders without the image
    }
  }

  // Gilt accent rule below the band
  sheet.mergeCells(`A4:${MERGE_END}4`);
  sheet.getRow(4).height = 4;
  for (let c = 1; c <= 12; c++) {
    sheet.getRow(4).getCell(c).fill = {
      type: "pattern", pattern: "solid", fgColor: { argb: argb(BRAND.gilt) },
    };
  }

  sheet.mergeCells(`A5:${MERGE_END}5`);
  const titleCell = sheet.getCell("A5");
  titleCell.value = report.title;
  titleCell.font = { name: "Calibri", size: 18, bold: true, color: { argb: argb(BRAND.royalDeep) } };
  titleCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  sheet.getRow(5).height = 28;

  sheet.mergeCells(`A6:${MERGE_END}6`);
  const subCell = sheet.getCell("A6");
  subCell.value = report.subtitle;
  subCell.font = { name: "Calibri", size: 10.5, italic: true, color: { argb: argb(BRAND.inkMuted) } };
  subCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  sheet.getRow(6).height = 18;

  sheet.mergeCells(`A7:${MERGE_END}7`);
  const meta = sheet.getCell("A7");
  meta.value =
    `Generated: ${fmtDateTime(report.meta.generatedAt)}      ` +
    `By: ${report.meta.generatedBy}      ` +
    `Reference: ${report.reference}      ` +
    `Classification: ${report.meta.classification ?? "Internal"}`;
  meta.font = { name: "Calibri", size: 9, color: { argb: argb(BRAND.inkSubtle) } };
  meta.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  sheet.getRow(7).height = 16;

  // Freeze the brand band + title + meta so the operator scrolling
  // through long tables still sees who/what/when/classification at
  // the top of the viewport. ySplit = 7 means rows 1..7 stay pinned.
  sheet.views = [{ state: "frozen", ySplit: 7, xSplit: 0, activeCell: "A8" }];

  let cursor = 9;

  if (report.summary && report.summary.length > 0) {
    sheet.mergeCells(`A${cursor}:${MERGE_END}${cursor}`);
    const t = sheet.getCell(`A${cursor}`);
    t.value = "At a glance";
    t.font = { name: "Calibri", size: 12, bold: true, color: { argb: argb(BRAND.royalDeep) } };
    sheet.getRow(cursor).height = 18;
    cursor++;
    for (const k of report.summary) {
      const labelCell = sheet.getCell(`A${cursor}`);
      labelCell.value = k.label;
      labelCell.font = { name: "Calibri", size: 10, color: { argb: argb(BRAND.inkMuted) } };
      const valueCell = sheet.getCell(`B${cursor}`);
      valueCell.value = k.value + (k.delta ? `   (${k.delta})` : "");
      const valueColor = k.tone === "good" ? BRAND.yes : k.tone === "bad" ? BRAND.no : BRAND.ink;
      valueCell.font = { name: "Calibri", size: 11, bold: true, color: { argb: argb(valueColor) } };
      sheet.getRow(cursor).height = 15;
      cursor++;
    }
    cursor++;
  }

  for (const sec of report.sections) {
    cursor = renderSection(sheet, sec, cursor);
    cursor += 1;
  }

  if (report.notes && report.notes.length > 0) {
    cursor++;
    const notesTitle = sheet.getCell(`A${cursor}`);
    notesTitle.value = "Notes & methodology  ·  Maelezo na mbinu";
    notesTitle.font = { name: "Calibri", size: 10, bold: true, color: { argb: argb(BRAND.royalDeep) } };
    sheet.getRow(cursor).height = 16;
    cursor++;
    for (const n of report.notes) {
      sheet.mergeCells(`A${cursor}:${MERGE_END}${cursor}`);
      const c = sheet.getCell(`A${cursor}`);
      c.value = `· ${n}`;
      c.font = { name: "Calibri", size: 9, italic: true, color: { argb: argb(BRAND.inkSubtle) } };
      c.alignment = { wrapText: true };
      sheet.getRow(cursor).height = 14;
      cursor++;
    }
  }

  if (report.signatures && report.signatures.length > 0) {
    cursor = renderSignatures(sheet, report.signatures, cursor + 1, MERGE_END);
  }

  const ab = await wb.xlsx.writeBuffer();
  return Buffer.from(ab as ArrayBuffer);
}

/** Attestation block — matches the PDF signature panel. Each role gets
 *  a labeled card with a "Signature & date" line so the regulator can
 *  apply an e-signature (or print + stamp). */
function renderSignatures(sheet: ExcelJS.Worksheet, sigs: SignatureRow[], startRow: number, mergeEnd: string): number {
  let row = startRow;
  // Section title (bilingual)
  sheet.mergeCells(`A${row}:${mergeEnd}${row}`);
  const title = sheet.getCell(`A${row}`);
  title.value = "Attestation  ·  Uthibitisho";
  title.font = { name: "Calibri", size: 11, bold: true, color: { argb: argb(BRAND.royalDeep) } };
  sheet.getRow(row).height = 18;
  row++;

  // Lay each signature out in a 3-column block: role label, name + id,
  // signature line. Stacking vertically keeps the layout legible at any
  // page width.
  for (const s of sigs) {
    const roleCell = sheet.getCell(`A${row}`);
    roleCell.value = s.role;
    roleCell.font = { name: "Calibri", size: 9, bold: true, color: { argb: argb(BRAND.inkMuted) } };
    roleCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };

    sheet.mergeCells(`B${row}:E${row}`);
    const nameCell = sheet.getCell(`B${row}`);
    nameCell.value = s.id ? `${s.name}   (${s.id})` : s.name;
    nameCell.font = { name: "Calibri", size: 10, bold: true, color: { argb: argb(BRAND.royalDeep) } };
    nameCell.alignment = { vertical: "middle", horizontal: "left" };

    sheet.mergeCells(`F${row}:${mergeEnd}${row}`);
    const sigCell = sheet.getCell(`F${row}`);
    sigCell.value = s.signedAt ? `Signed ${fmtDate(s.signedAt)}` : "Signature & date: __________________________";
    sigCell.font = { name: "Calibri", size: 9, italic: true, color: { argb: argb(BRAND.inkSubtle) } };
    sigCell.alignment = { vertical: "middle", horizontal: "left" };
    sigCell.border = {
      bottom: { style: "thin", color: { argb: argb(BRAND.gilt) } },
    };
    sheet.getRow(row).height = 22;
    row++;
  }
  return row;
}

function renderSection(sheet: ExcelJS.Worksheet, sec: Section, startRow: number): number {
  let row = startRow;

  sheet.mergeCells(`A${row}:L${row}`);
  const t = sheet.getCell(`A${row}`);
  // Pair the section title with its Swahili sibling on the same line so
  // the kit's bilingual rule reads through to the spreadsheet too.
  t.value = sec.titleSw ? `${sec.title}  ·  ${sec.titleSw}` : sec.title;
  t.font = { name: "Calibri", size: 12, bold: true, color: { argb: argb(BRAND.royalDeep) } };
  sheet.getRow(row).height = 18;
  row++;

  if (sec.description) {
    sheet.mergeCells(`A${row}:L${row}`);
    const d = sheet.getCell(`A${row}`);
    d.value = sec.description;
    d.font = { name: "Calibri", size: 9, italic: true, color: { argb: argb(BRAND.inkSubtle) } };
    sheet.getRow(row).height = 14;
    row++;
  }

  sec.columns.forEach((c, i) => {
    sheet.getColumn(i + 1).width = colWidthFor(c, sec.rows);
  });

  const headerRow = sheet.getRow(row);
  sec.columns.forEach((c, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = c.sub ? `${c.header}\n${c.sub}` : c.header;
    cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: argb(BRAND.white) } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(BRAND.royal) } };
    cell.alignment = { vertical: "middle", horizontal: c.align ?? "left", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: argb(BRAND.royalDeep) } },
      bottom: { style: "medium", color: { argb: argb(BRAND.gilt) } },
      left: { style: "thin", color: { argb: argb(BRAND.royalDeep) } },
      right: { style: "thin", color: { argb: argb(BRAND.royalDeep) } },
    };
  });
  headerRow.height = 22;
  const headerRowNum = row;
  row++;

  // Empty-state row — match the PDF's bilingual "No data" panel rather
  // than dropping the auditor onto a naked header with nothing under it.
  if (sec.rows.length === 0) {
    sheet.mergeCells(`A${row}:${String.fromCharCode(64 + sec.columns.length)}${row}`);
    const empty = sheet.getCell(`A${row}`);
    empty.value = "No data in this period  ·  Hakuna data katika kipindi hiki";
    empty.font = { name: "Calibri", size: 10, italic: true, color: { argb: argb(BRAND.inkSubtle) } };
    empty.alignment = { vertical: "middle", horizontal: "center" };
    empty.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(BRAND.royalSoft) } };
    sheet.getRow(row).height = 16;
    row++;
  }

  sec.rows.forEach((r, ri) => {
    const dataRow = sheet.getRow(row);
    const tint = ri % 2 === 1;
    sec.columns.forEach((c, i) => {
      const cell = dataRow.getCell(i + 1);
      applyValue(cell, r[c.key] ?? null, c.format);
      cell.alignment = { vertical: "middle", horizontal: c.align ?? (c.format === "tzs" || c.format === "integer" || c.format === "percent" ? "right" : "left") };
      cell.font = { name: c.format === "tzs" || c.format === "integer" ? "Consolas" : "Calibri", size: 10, color: { argb: argb(BRAND.ink) } };
      if (tint) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(BRAND.royalSoft) } };
      }
      cell.border = { bottom: { style: "hair", color: { argb: argb(BRAND.ruleSubtle) } } };
    });
    dataRow.height = 16;
    row++;
  });

  // Auto-filter dropdowns on the header row — gives the auditor
  // Excel's native sort/search affordances on every data section
  // without needing extra UI. Only useful when there are rows to
  // filter, so skip empty sections.
  if (sec.rows.length > 0 && sec.columns.length > 0) {
    const lastCol = String.fromCharCode(64 + sec.columns.length);
    const lastDataRow = row - 1;
    // ExcelJS allows a single autoFilter per worksheet; the last one
    // assigned wins. That's fine for single-section reports; for
    // multi-section ones it scopes to the largest table, which the
    // user can re-apply per section if they want.
    sheet.autoFilter = `A${headerRowNum}:${lastCol}${lastDataRow}`;
  }

  if (sec.totals) {
    const tRow = sheet.getRow(row);
    sec.columns.forEach((c, i) => {
      const cell = tRow.getCell(i + 1);
      const v = sec.totals![c.key];
      if (v !== undefined && v !== null) {
        applyValue(cell, v, c.format);
      } else if (i === 0) {
        cell.value = "Total";
      }
      cell.font = { name: c.format === "tzs" || c.format === "integer" ? "Consolas" : "Calibri", size: 10, bold: true, color: { argb: argb(BRAND.giltFg) } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(BRAND.giltSoft) } };
      cell.alignment = { vertical: "middle", horizontal: c.align ?? (c.format === "tzs" || c.format === "integer" || c.format === "percent" ? "right" : "left") };
      cell.border = {
        top: { style: "medium", color: { argb: argb(BRAND.gilt) } },
        bottom: { style: "medium", color: { argb: argb(BRAND.gilt) } },
      };
    });
    tRow.height = 18;
    row++;
  }

  return row;
}
