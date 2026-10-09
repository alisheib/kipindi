const fs = require("fs");
const S = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/";
function edit(p, pairs) { let s = fs.readFileSync(S + p, "utf8");
  for (const [a, b] of pairs) { const n = s.split(a).length - 1; if (n !== 1) throw new Error(`${p}: ${n} × ${a.slice(0, 80)}`); s = s.replace(a, () => b); }
  fs.writeFileSync(S + p, s); }
edit("r5h/mutation-r5h-vis.mjs", [
  [`["src/app/wallet/money-bar-ghost.tsx", "rounded-pill border border-transparent bg-bg-overlay px-3 text-[13px]",`,
   `["src/components/ui/query-bar-ghost.tsx", "rounded-pill border border-transparent bg-bg-overlay px-3 text-[13px]", /* R5-L: the pill's one home */`],
  [`["src/app/wallet/money-bar-ghost.tsx", "<p className=\\"shrink-0 font-mono text-[11.5px] tabular-nums text-transparent\\">",`,
   `["src/components/ui/query-bar-ghost.tsx", "<p className=\\"shrink-0 font-mono text-[11.5px] tabular-nums text-transparent\\">", /* R5-L: the count's one home */`],
  [`["src/app/agent/invite/[token]/loading.tsx", " back={false} />", " />", "5.1 ·",`,
   `["src/app/agent/invite/[token]/loading.tsx", "      <PageHeader eyebrow={t.agent.eyebrow} title={t.agent.inviteTitle}", "      <BackLinkGhost />\n      <PageHeader eyebrow={t.agent.eyebrow} title={t.agent.inviteTitle}", "5.1 ·", /* R5-L rebuilt it */`],
  [`["src/app/markets/loading.tsx", 'h-[44px] w-[170px] rounded-pill bg-bg-elevated lg:hidden', "h-[44px] w-[170px] rounded-pill bg-bg-elevated", "5.3 ·",`,
   `["src/app/markets/loading.tsx", '<FiltersGhost label={t.market.filtersOpen} />', '<div className="h-[44px] w-[170px] rounded-pill bg-bg-elevated" />', "5.3 ·", /* R5-L: the trigger's own box now */`],
  [`["src/app/live/loading.tsx", '<div className="relative z-10 p-5 lg:p-6">', '<div className="relative z-10 p-5">', "5.4 ·",`,
   `["src/app/live/loading.tsx", '<PageHero glow="aqua" watermark={200}>', '<PageHero glow="aqua" watermark={200} contentClassName="relative z-10 p-5">', "5.4 ·", /* R5-L: the hero is PageHero */`],
]);
edit("r5b/mutate-vis.cjs", [
  [`["F14 the ghost's count back on its 12px bar", "src/app/wallet/money-bar-ghost.tsx", // R5-H: the count in its own type`,
   `["F14 the ghost's count back on its 12px bar", "src/components/ui/query-bar-ghost.tsx", // R5-H: the count in its own type; R5-L: the kit's`],
]);
console.log("ok");
