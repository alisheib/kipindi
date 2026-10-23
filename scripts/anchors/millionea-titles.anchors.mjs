// Disk plants for `red:millionea-titles` (MASWALI-BUILD FLOW 15: every Millionea bell title leads with its event) and
// `test:red-anchors`. The red runner (`scripts/millionea-titles.test.mts --prove-red`) writes each plant into the real
// source, runs the suite, requires it to fail ON THE NAMED CASE (`failure`), and restores the file byte for byte.
// A dot is matched as [.], so no escape is typed.

export const MUTATIONS = [
  {
    name: "(MT1) the one rule puts the week first again — every Millionea row cut at its event",
    file: "src/lib/server/notification-service.ts",
    from: "  return { titleEn: `${event.en} · ${w.en}`, titleSw: `${event.sw} · ${w.sw}`, titleZh: `${event.zh} · ${w.zh}` };",
    to: "  return { titleEn: `${w.en} · ${event.en}`, titleSw: `${w.sw} · ${event.sw}`, titleZh: `${w.zh} · ${event.zh}` };",
    failure: /FAIL 1[.]1 /,
  },
  {
    name: "(MT2) one emitter (the sales close) writes its own week-first title again",
    file: "src/lib/server/notification-service.ts",
    from: "    ...millioneaTitle({ en: \"Sales closed\", sw: \"Mauzo yamefungwa\", zh: \"销售已截止\" }, w),",
    to: "    titleEn: `${w.en} · Sales closed`,\n    titleSw: `${w.sw} · Mauzo yamefungwa`,\n    titleZh: `${w.zh} · 销售已截止`,",
    failure: /FAIL 2[.]1 /,
  },
  {
    name: "(MT4) the clamp back to one line — a Millionea row's title cut again at 360",
    file: "src/components/layout/notifications-panel.tsx",
    from: "mlnWrapped ? \"font-display text-body-sm font-semibold text-text line-clamp-3 leading-tight\"",
    to: "mlnWrapped ? \"font-display text-body-sm font-semibold text-text truncate leading-tight\"",
    failure: /FAIL 3[.]1 /,
  },
  {
    name: "(MT5) a filed objection's officer row is not known as Millionea's — its long title cut on one line",
    file: "src/lib/millionea-notice.ts",
    from: "    || href.startsWith(OFFICER_QUEUE + OBJECTION_ROW);",
    to: "    || false;",
    failure: /FAIL 3[.]2 /,
  },
];
