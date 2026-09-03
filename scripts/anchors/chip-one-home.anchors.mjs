/**
 * RED anchors for `npm run red:chip-one-home` — the control for `test:chip-contract` §4
 * (PV-13c, 2026-09-03).
 *
 * ⭐ THE HARNESS IMPORTS THIS FILE, so `red-anchors.test.mts` can audit every anchor without
 * running a harness that rewrites real source.
 *
 * §4 sits at ZERO at HEAD — both halves of it — and a check at zero is indistinguishable from
 * a check that cannot find anything. Each mutation puts back one of the two shapes the chip
 * migration deleted:
 *   · a raw `className="chip chip-*"` at a call site (what twelve files carried for six weeks)
 *   · the CSS rule itself (the second definition the component was ruled to replace)
 */

export const MUTATIONS = [
  {
    name: "a call site spells a chip as a CSS class again (the updown card's duration pill)",
    file: "src/components/updown/updown-card.tsx",
    expect: "4.2",
    from: `<Chip style={{ marginLeft: 6, verticalAlign: "middle" }}>{durationMinutes} {t.market.udMin}</Chip>`,
    to: `<span className="chip" style={{ marginLeft: 6, verticalAlign: "middle" }}>{durationMinutes} {t.market.udMin}</span>`,
  },
  {
    name: "the CSS family comes back — a second definition of the chip, beside the component",
    file: "src/app/globals.css",
    expect: "4.1",
    from: `/* ---------- Chip ---------- */`,
    to: `/* ---------- Chip ---------- */\n.chip { height: 21px; padding: 0 8px; font-size: 10.5px; }\n.chip-pending { height: 23px; }`,
  },
];
