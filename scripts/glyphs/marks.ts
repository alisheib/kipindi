/**
 * THE TEXT MARKS — the ten glyphs that stand among words (`text` prop, 68 sites), drawn as STROKES on Phosphor's own
 * centrelines (PHOSPHOR-MIGRATION §5 W1/W2; R9-A4 / R10-A6).
 *
 * A mark inside a run of words strokes at the words' own stem (`.kp-gtext` + `--g-stem`, a non-scaling stroke), so it
 * cannot be one of Phosphor's filled outlines: its weight must follow the font, not the box. Phosphor's Regular and Bold
 * outlines are expansions of these centrelines at 16 and 24 units, so a mark drawn here IS Phosphor's glyph at the
 * words' weight. `test:glyph-map` holds each centreline to its Phosphor drawing: stroked at 16 units, its bounds equal
 * the Regular outline's.
 *
 *   stroke — centreline parts, stroked at the words' stem
 *   fill   — parts that stay solid at any weight (the dot of `info`, the clasp of `wallet`)
 */
export type Mark = { ph: string; stroke: string; fill?: string };

const ring = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;

export const TEXT_MARKS: Record<string, Mark> = {
  chevronRight: { ph: "caret-right", stroke: "M96 48L176 128L96 208" },
  chevronLeft: { ph: "caret-left", stroke: "M160 208L80 128L160 48" },
  arrowRight: { ph: "arrow-right", stroke: "M40 128H216M144 56L216 128L144 200" },
  arrowLeft: { ph: "arrow-left", stroke: "M216 128H40M112 56L40 128L112 200" },
  arrowUp: { ph: "arrow-up", stroke: "M128 216V40M56 112L128 40L200 112" },
  arrowDown: { ph: "arrow-down", stroke: "M128 40V216M56 144L128 216L200 144" },
  // Deposit and withdraw (R-LEXICON 5.3A): the wallet's "Weka pesa" / "Toa pesa" set them among words.
  arrowDownToLine: { ph: "arrow-line-down", stroke: "M128 32V184M56 112L128 184L200 112M40 216H216" },
  arrowUpFromLine: { ph: "arrow-line-up", stroke: "M128 224V72M56 144L128 72L200 144M40 40H216" },
  ext: {
    ph: "arrow-square-out",
    stroke: "M216 104V40H152M216 40L136 120M120 72H48a8 8 0 0 0-8 8V208a8 8 0 0 0 8 8H176a8 8 0 0 0 8-8V136",
  },
  externalLink: {
    ph: "arrow-square-out",
    stroke: "M216 104V40H152M216 40L136 120M120 72H48a8 8 0 0 0-8 8V208a8 8 0 0 0 8 8H176a8 8 0 0 0 8-8V136",
  },
  info: { ph: "info", stroke: ring(128, 128, 96) + "M120 120a8 8 0 0 1 8 8V168a8 8 0 0 0 8 8", fill: ring(124, 84, 12) },
  wallet: {
    ph: "wallet",
    stroke: "M192 40H56a16 16 0 0 0-16 16V184a16 16 0 0 0 16 16H216a8 8 0 0 0 8-8V80a8 8 0 0 0-8-8H56a16 16 0 0 1-16-16",
    fill: ring(180, 132, 12),
  },
};
