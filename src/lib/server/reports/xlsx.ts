import ExcelJS from "exceljs";
import { BRAND, COMPANY, fmtDate, fmtDateTime } from "./brand";
import type { Report, Section, Column, Row } from "./types";

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

  sheet.mergeCells(`A1:${MERGE_END}1`);
  const band = sheet.getCell("A1");
  band.value = ` 50PICK   ·   ${COMPANY.tagline}`;
  band.font = { name: "Calibri", size: 13, bold: true, color: { argb: argb(BRAND.white) } };
  band.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(BRAND.royal) } };
  band.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  sheet.getRow(1).height = 22;

  sheet.mergeCells(`A2:${MERGE_END}2`);
  const titleCell = sheet.getCell("A2");
  titleCell.value = report.title;
  titleCell.font = { name: "Calibri", size: 16, bold: true, color: { argb: argb(BRAND.royalDeep) } };
  titleCell.alignment = { vertical: "middle", horizontal: "left" };
  sheet.getRow(2).height = 22;

  sheet.mergeCells(`A3:${MERGE_END}3`);
  const subCell = sheet.getCell("A3");
  subCell.value = report.subtitle;
  subCell.font = { name: "Calibri", size: 10, italic: true, color: { argb: argb(BRAND.inkMuted) } };
  subCell.alignment = { vertical: "middle", horizontal: "left" };
  sheet.getRow(3).height = 16;

  sheet.mergeCells(`A4:${MERGE_END}4`);
  const meta = sheet.getCell("A4");
  meta.value =
    `Generated: ${fmtDateTime(report.meta.generatedAt)}   ·   ` +
    `By: ${report.meta.generatedBy}   ·   ` +
    `Reference: ${report.reference}   ·   ` +
    `Classification: ${report.meta.classification ?? "Internal"}`;
  meta.font = { name: "Consolas", size: 9, color: { argb: argb(BRAND.inkSubtle) } };
  meta.alignment = { vertical: "middle", horizontal: "left" };
  sheet.getRow(4).height = 14;

  sheet.getRow(5).height = 3;
  for (let c = 1; c <= 12; c++) {
    sheet.getRow(5).getCell(c).fill = {
      type: "pattern", pattern: "solid", fgColor: { argb: argb(BRAND.gilt) },
    };
  }

  let cursor = 7;

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
    notesTitle.value = "Notes & methodology";
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

  const ab = await wb.xlsx.writeBuffer();
  return Buffer.from(ab as ArrayBuffer);
}

function renderSection(sheet: ExcelJS.Worksheet, sec: Section, startRow: number): number {
  let row = startRow;

  sheet.mergeCells(`A${row}:L${row}`);
  const t = sheet.getCell(`A${row}`);
  t.value = sec.title;
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
  row++;

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
