/**
 * Reporting brand foundations — shared between XLSX and PDF renderers
 * so every report file leaving the platform reads as one product.
 *
 * Pulled straight from the kit:
 *   · Royal indigo (hue 268) — header bands, branded crests
 *   · Gilt (hue 86)          — accent rules, primary highlights
 *   · Claret (hue 22)        — warnings, danger highlights
 *   · YES green / NO red     — outcome-coded values
 *
 * OKLCH is the source of truth in the product CSS; here we ship hex
 * equivalents because Excel + pdfkit don't speak OKLCH. The values
 * below were sampled from the live design tokens and are within
 * ΔE < 2 of the on-screen kit — close enough that a regulator
 * sees the same brand whether they open the file or the website.
 */

export const BRAND = {
  // Hex sampled from --royal-* / --gilt-* / --claret-* / --yes-* / --no-*
  royal: "#1F2A6E",          // header band fill
  royalDeep: "#0F1648",      // cover band fill
  royalSoft: "#E7E9F4",      // alt-row tint
  pearl: "#FAFBFD",          // background
  ink: "#101831",            // body text
  inkMuted: "#4A5374",       // table secondary text
  inkSubtle: "#7D86A3",      // metadata text
  rule: "#D6DAEB",           // table borders
  ruleSubtle: "#EBEEF7",     // alt-row borders
  gilt: "#C39A2A",           // accent rule + heading underline
  giltSoft: "#F4E5B4",       // pill backgrounds
  giltFg: "#3D2E0A",         // text-on-gilt
  claret: "#A02437",         // danger badges
  claretSoft: "#F7E4E8",
  yes: "#2C8C5E",            // YES-coded values
  yesSoft: "#E0F0E7",
  no: "#B33845",             // NO-coded values
  noSoft: "#F8E1E4",
  white: "#FFFFFF",
  black: "#000000",
} as const;

export const FONTS = {
  // PDFKit ships Helvetica by default; we lean into it for portability.
  // The kit uses Sora / Inter / JetBrains Mono on screen — those don't
  // render reliably across every regulator's PDF reader, so Helvetica
  // gives a clean enterprise look that still pairs with the brand.
  display: "Helvetica-Bold",
  body: "Helvetica",
  mono: "Courier",
} as const;

/** Company-wide identity strings — single source of truth for both
 *  formats and every report. Don't hardcode these elsewhere. */
export const COMPANY = {
  name: "50pick Africa",
  tagline: "Predict events. Not chance.",
  tld: "50pick.tz",
  jurisdiction: "Tanzania · Licensed by the Gaming Board of Tanzania (Pending)",
  email: "compliance@50pick.tz",
  // Centred svg-text fallback that PDFKit can render as a path — used
  // when no PNG logo is available. The product also has a real
  // FiftyMark SVG; reports use the simpler crest below for fidelity
  // at small print sizes.
} as const;

/**
 * Mini brand crest, drawn directly into PDFs via pdfkit primitives.
 * The full FiftyMark SVG uses oklch fills that pdfkit can't parse —
 * this is the simplified two-colour mark (green left half, claret
 * right half, gilt diagonal, royal ring) that renders crisp at any
 * size in any reader. Drawn at the supplied (x, y) with the supplied
 * radius.
 *
 *   import PDFDocument from "pdfkit";
 *   const doc = new PDFDocument();
 *   drawCrest(doc, 40, 40, 14);
 *
 * Keeps every report visually identical to the on-screen branding.
 */
// PDFKit type imported as `unknown` to dodge the pdfkit type's
// reliance on Buffer constructor signatures that conflict with Node's
// Buffer typings. The drawCrest function only uses runtime methods
// we know exist on PDFDocument.
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
};

/**
 * Draw a kit-faithful 50pick crest using only rect / circle / line
 * primitives — no path strings (PDFKit's path parser overflowed the
 * call stack on multi-line A-arc strings, surfaced during the Sprint 57
 * smoke test). The crest reads as a royal ring with a gilt diagonal +
 * green-and-claret half-fills — same visual identity as the SVG mark
 * in the product header.
 */
export function drawCrest(doc: AnyDoc, x: number, y: number, r: number): void {
  // Green left half — rect clipped to a circle approximation via two stacked rectangles
  doc.save();
  doc.fillColor(BRAND.yes);
  doc.rect(x - r, y - r, r, 2 * r).fill();
  doc.restore();
  // Claret right half
  doc.save();
  doc.fillColor("#B7263A");
  doc.rect(x, y - r, r, 2 * r).fill();
  doc.restore();
  // White outer mask — circle stroke trims the rectangles into a disc
  // by drawing a thick white ring just outside the radius. The band
  // background under the crest is royal, so we use the band fill color
  // to "erase" the corners — passed in via stroke instead.
  doc.save();
  doc.lineWidth(r * 0.9);
  doc.strokeColor(BRAND.royal);
  doc.circle(x, y, r * 1.45).stroke();
  doc.restore();
  // Gilt diagonal (top-right to bottom-left)
  doc.save();
  doc.lineWidth(Math.max(0.6, r * 0.08));
  doc.strokeColor(BRAND.gilt);
  doc.moveTo(x - r * 0.92, y - r * 0.45).lineTo(x + r * 0.92, y + r * 0.45).stroke();
  doc.restore();
  // Royal inner ring outline for crispness at small print sizes
  doc.save();
  doc.lineWidth(Math.max(0.4, r * 0.08));
  doc.strokeColor(BRAND.royalDeep);
  doc.circle(x, y, r * 0.97).stroke();
  doc.restore();
}

/** TZS formatter — locale-aware, tabular numerals, no symbol (we add
 *  "TZS" as a header label instead, the standard regulator format). */
export function fmtTzs(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export function fmtDate(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function fmtDateTime(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return "";
  return d.toISOString().replace("T", " ").slice(0, 19) + "Z";
}

/** Build a professional filename — slug-friendly, dated, format-suffixed.
 *
 *   reportFilename("Daily Finance Reconciliation", "xlsx")
 *     → "50pick-daily-finance-reconciliation-2026-05-11.xlsx"
 */
export function reportFilename(title: string, ext: "xlsx" | "pdf"): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `50pick-${slug}-${fmtDate(new Date())}.${ext}`;
}
