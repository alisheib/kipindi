// R5-L · the registries and pins R5-L's ghosts move, each with its reason.
const { once, edit } = require("./lib.cjs");

// eyebrow-roles: the leaderboard ghost's spinner caption is gone with its spinner box; the notable card's ghost carries the
// page's own flag (its tracking sets the chip row's wrap on a phone), a STATUS_CHIP as the page's is.
edit("scripts/design-gate/eyebrow-roles.mjs", (s) => {
  s = once(s,
    "  [\"app/leaderboard/loading.tsx :: <p className=\\\"font-mono text-caption uppercase tracking-[0.18em] text-text-muted\\\"> ↵ {t.common.loading}\", \"OTHER\"],\n",
    "  // (R5-L, 2026-10-09: `app/leaderboard/loading.tsx`'s spinner caption left with the spinner box — the page has no such band.)\n",
    "leaderboard caption");
  s = once(s,
    "  [\"app/results/page.tsx :: <span className=\\\"ml-auto inline-flex items-center gap-1.5 font-mono text-micro uppercase tracking-[0.16em] font-bold text-brand-300\\\"> ↵ <I.crown s={13} /> <span className\", \"STATUS_CHIP\"],\n",
    "  [\"app/results/page.tsx :: <span className=\\\"ml-auto inline-flex items-center gap-1.5 font-mono text-micro uppercase tracking-[0.16em] font-bold text-brand-300\\\"> ↵ <I.crown s={13} /> <span className\", \"STATUS_CHIP\"],\n"
    + "  // R5-L (2026-10-09): the notable card's GHOST sets the same flag, its words not shown, so the chip row wraps where the\n"
    + "  // page's does on a phone (the flag's 0.16em is part of its width). The same role as the page's.\n"
    + "  [\"app/results/loading.tsx :: <span className=\\\"ml-auto inline-flex items-center gap-1.5 font-mono text-micro uppercase tracking-[0.16em] font-bold\\\"> ↵ <span className=\\\"h-[13px] w-[13px] shrink-0\\\" /> <\", \"STATUS_CHIP\"],\n",
    "results flag");
  return s;
});

// notifications-page's anchor: the loader states its tier on a line of its own now (the PageLoader call grew its opening
// bands); the mutation still takes the tier from reading to form.
edit("scripts/anchors/notifications-page.anchors.mjs", (s) => once(s,
  "    from: '  return <PageLoader tier=\"reading\" rows={6} />;',\n    to: '  return <PageLoader tier=\"form\" rows={6} />;',\n",
  "    // ⚠️ MOVED (R5-L, 2026-10-09): the loader opens on the page's back link and header now, so its call spans lines and\n"
  + "    // the tier stands on a line of its own.\n"
  + "    from: '      tier=\"reading\"',\n    to: '      tier=\"form\"',\n",
  "notifications anchor"));
