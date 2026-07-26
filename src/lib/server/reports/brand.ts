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

// Reports render in EAT (UTC+3, no DST) — the platform's operating timezone and the
// same zone the on-screen filters resolve against. A report and the console it was
// generated from must agree on what "26 Jul, 14:30" means. Shift to EAT, then read the
// UTC fields of the shifted instant.
const EAT_MS = 3 * 3600_000;
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function fmtDate(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return "";
  const e = new Date(d.getTime() + EAT_MS);
  return `${e.getUTCDate()} ${MONTHS[e.getUTCMonth()]} ${e.getUTCFullYear()}`;
}

export function fmtDateTime(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return "";
  const e = new Date(d.getTime() + EAT_MS);
  const hh = String(e.getUTCHours()).padStart(2, "0");
  const mm = String(e.getUTCMinutes()).padStart(2, "0");
  return `${e.getUTCDate()} ${MONTHS[e.getUTCMonth()]} ${e.getUTCFullYear()}, ${hh}:${mm} EAT`;
}

export function reportFilename(title: string, ext: "xlsx" | "pdf"): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  return `50pick-${slug}-${new Date().toISOString().slice(0, 10)}.${ext}`;
}
