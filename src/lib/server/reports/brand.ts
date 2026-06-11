/**
 * Reporting brand foundations — shared between XLSX and PDF renderers.
 *
 * White-background professional report with branded royal headers,
 * gilt accents, and embedded Inter + JetBrains Mono fonts.
 * Designed for government/regulator submission — prints clean.
 */

export const BRAND = {
  // ── Page canvas (white for print / government) ──
  white:      "#FFFFFF",
  pearl:      "#FAFBFD",      // subtle off-white for alt rows
  black:      "#000000",

  // ── Royal ramp ──
  royal:      "#1F2A6E",      // header band fill
  royalDeep:  "#0F1648",      // titles, deep accents
  royalMid:   "#2D3A8C",      // lighter royal for hover/focus
  royalSoft:  "#E8EAF5",      // alternating row tint

  // ── Text (dark ink on white) ──
  ink:        "#101831",      // primary body text
  inkMuted:   "#4A5374",      // secondary / descriptions
  inkSubtle:  "#7D86A3",      // metadata, footnotes
  inkFaint:   "#A0A8C4",      // very subtle labels

  // ── Borders & rules ──
  rule:       "#D6DAEB",      // table borders
  ruleSubtle: "#EBEEF7",      // alt-row borders
  ruleStrong: "#B8BFD8",      // header bottom

  // ── Gilt accent ──
  gilt:       "#C39A2A",      // accent rule + heading underline
  giltSoft:   "#F4E5B4",      // totals row background
  giltFg:     "#3D2E0A",      // text-on-gilt
  giltBright: "#E8C84A",      // gilt on dark surfaces (band)

  // ── Semantic ──
  yes:        "#1B7A4A",      // darker green for print
  no:         "#A02030",      // darker red for print
  claret:     "#A02437",
  claretSoft: "#F7E4E8",
} as const;

export const COMPANY = {
  name: "50pick Africa",
  tagline: "Predict events. Not chance.",
  tld: "50pick.tz",
  jurisdiction: "Tanzania",
} as const;

type AnyDoc = {
  save(): AnyDoc; restore(): AnyDoc;
  rect(x: number, y: number, w: number, h: number): AnyDoc;
  circle(x: number, y: number, r: number): AnyDoc;
  fill(color?: string): AnyDoc; stroke(color?: string): AnyDoc;
  fillColor(c: string): AnyDoc; strokeColor(c: string): AnyDoc;
  lineWidth(w: number): AnyDoc;
  moveTo(x: number, y: number): AnyDoc; lineTo(x: number, y: number): AnyDoc;
  clip(): AnyDoc;
};

export function drawCrest(doc: AnyDoc, x: number, y: number, r: number): void {
  doc.save();
  doc.circle(x, y, r).clip();
  doc.fillColor(BRAND.yes).rect(x - r, y - r, r, 2 * r).fill();
  doc.fillColor("#B7263A").rect(x, y - r, r, 2 * r).fill();
  doc.restore();
  doc.save();
  doc.lineWidth(Math.max(0.5, r * 0.10));
  doc.strokeColor(BRAND.gilt);
  doc.moveTo(x - r * 0.94, y - r * 0.34).lineTo(x + r * 0.94, y + r * 0.34).stroke();
  doc.restore();
  doc.save();
  doc.lineWidth(Math.max(0.5, r * 0.10));
  doc.strokeColor(BRAND.royalDeep);
  doc.circle(x, y, r).stroke();
  doc.restore();
}

export function toAnsiSafe(s: string): string {
  return s
    .replace(/→/g, "->").replace(/←/g, "<-")
    .replace(/—/g, " - ").replace(/–/g, "-").replace(/−/g, "-")
    .replace(/'/g, "'").replace(/'/g, "'")
    .replace(/\u201c/g, '"').replace(/\u201d/g, '"')
    .replace(/…/g, "...");
}

export function fmtTzs(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export function fmtDate(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return "";
  const day = d.getUTCDate();
  const mon = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getUTCMonth()];
  const yr = d.getUTCFullYear();
  return `${day} ${mon} ${yr}`;
}

export function fmtDateTime(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return "";
  const day = d.getUTCDate();
  const mon = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getUTCMonth()];
  const yr = d.getUTCFullYear();
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${day} ${mon} ${yr}, ${hh}:${mm} UTC`;
}

export function reportFilename(title: string, ext: "xlsx" | "pdf"): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  return `50pick-${slug}-${new Date().toISOString().slice(0, 10)}.${ext}`;
}
