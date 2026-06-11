/**
 * Reporting brand foundations — shared between XLSX and PDF renderers
 * so every report file leaving the platform reads as one product.
 *
 * Dark Glass Kit (June 2026): the PDF now mirrors the on-screen dark
 * glass aesthetic — deep royal canvas, pearl text, gilt accents, glass
 * panel cards. The regulator sees the same brand whether they open the
 * file or the website.
 *
 * OKLCH is the source of truth in the product CSS; here we ship hex
 * equivalents because Excel + pdfkit don't speak OKLCH. The values
 * below were sampled from the live design tokens.
 */

export const BRAND = {
  // ── Dark Glass Canvas ──
  canvas:     "#0D1035",      // page background — deep midnight indigo
  panel:      "#161A48",      // card / KPI background — elevated surface
  panelAlt:   "#1C2158",      // alternating table row
  surface:    "#222868",      // hover / focus surface

  // ── Royal ramp ──
  royal:      "#1F2A6E",      // header band fill
  royalDeep:  "#0F1648",      // cover band fill / section titles
  royalSoft:  "#E7E9F4",      // light-mode fallback (XLSX only)

  // ── Text on dark ──
  pearl:      "#F0F1F8",      // primary text (bright pearl)
  textMuted:  "#A8ADCC",      // secondary text
  textSubtle: "#6B72A0",      // metadata / tertiary
  textFaint:  "#4A5080",      // very subtle labels

  // ── Ink (light-mode only, kept for XLSX) ──
  ink:        "#101831",
  inkMuted:   "#4A5374",
  inkSubtle:  "#7D86A3",

  // ── Borders & rules ──
  border:     "#2A3070",      // table borders on dark
  borderSubtle: "#1E2455",    // subtle dividers
  rule:       "#D6DAEB",      // light-mode rule (XLSX)
  ruleSubtle: "#EBEEF7",

  // ── Gilt accent ──
  gilt:       "#C39A2A",      // accent rule + heading underline
  giltSoft:   "#F4E5B4",      // gilt tint on light bg (XLSX totals row)
  giltDark:   "#3D350E",      // gilt tint on dark bg (PDF totals row)
  giltBright: "#F4E5B4",      // gilt text on dark
  giltFg:     "#3D2E0A",      // text-on-gilt (light-mode XLSX)

  // ── Semantic ──
  claret:     "#A02437",
  claretSoft: "#F7E4E8",
  yes:        "#2C8C5E",
  yesSoft:    "#E0F0E7",
  no:         "#B33845",
  noSoft:     "#F8E1E4",

  white:      "#FFFFFF",
  black:      "#000000",
} as const;

export const FONTS = {
  display: "Helvetica-Bold",
  body: "Helvetica",
  mono: "Courier",
} as const;

export const COMPANY = {
  name: "50pick Africa",
  tagline: "Predict events. Not chance.",
  tld: "50pick.tz",
  jurisdiction: "Tanzania · Licensed by the Gaming Board of Tanzania (Pending)",
  email: "compliance@50pick.tz",
} as const;

type AnyDoc = {
  save(): AnyDoc;
  restore(): AnyDoc;
  rect(x: number, y: number, w: number, h: number): AnyDoc;
  circle(x: number, y: number, r: number): AnyDoc;
  fill(color?: string): AnyDoc;
  stroke(color?: string): AnyDoc;
  fillColor(c: string): AnyDoc;
  strokeColor(c: string): AnyDoc;
  lineWidth(w: number): AnyDoc;
  moveTo(x: number, y: number): AnyDoc;
  lineTo(x: number, y: number): AnyDoc;
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
    .replace(/→/g, "->")
    .replace(/←/g, "<-")
    .replace(/—/g, " - ")
    .replace(/–/g, "-")
    .replace(/−/g, "-")
    .replace(/'/g, "'")
    .replace(/'/g, "'")
    .replace(/"/g, '"')
    .replace(/"/g, '"')
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
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  const d = new Date();
  const ds = d.toISOString().slice(0, 10);
  return `50pick-${slug}-${ds}.${ext}`;
}
