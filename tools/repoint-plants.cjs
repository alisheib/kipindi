// Re-aim five plants of the R5-B and R5-D mutation proofs at the code R5-H (and R5-G) moved them to. The guards were
// re-pinned by R5-H; each plant must still land and be caught on its named check.
const fs = require("fs");
const S = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad";
const edit = (p, pairs) => {
  let s = fs.readFileSync(p, "utf8");
  for (const [a, b] of pairs) { if (s.split(a).length !== 2) throw new Error(p + " anchor: " + a.slice(0, 100)); s = s.replace(a, b); }
  fs.writeFileSync(p, s);
};
// R5-B (S/r5b/mutate-vis.cjs)
edit(S + "/r5b/mutate-vis.cjs", [
  [`["F6 /wallet's ghost back on 14px with the display face", "src/app/wallet/loading.tsx",`,
   `["F6 /wallet's ghost back on 14px with the display face", "src/app/wallet/wallet-ghost.tsx", // R5-H moved the drawing`],
  [`["F14 the receipts ghost retyping the old wrap", "src/app/wallet/receipts/loading.tsx",`,
   `["F14 the receipts ghost retyping the old wrap", "src/app/wallet/money-bar-ghost.tsx", // R5-H: one bar ghost for both books`],
  [`["F14 the ghost's count back on its 12px bar", "src/app/wallet/receipts/loading.tsx",\n    '<div className="flex h-[17.25px] shrink-0 items-center"><div className="h-3 w-[80px] rounded bg-bg-overlay" /></div>',`,
   `["F14 the ghost's count back on its 12px bar", "src/app/wallet/money-bar-ghost.tsx", // R5-H: the count in its own type\n    '<p className="shrink-0 font-mono text-[11.5px] tabular-nums text-transparent"><span className="rounded bg-bg-overlay">{count}</span></p>',`],
]);
// R5-D (S/r5d/mutation-r5d-vis.mjs)
edit(S + "/r5d/mutation-r5d-vis.mjs", [
  [`edits: [{ file: "src/components/ui/not-found-mark.tsx", from: "  useLayoutEffect(() => { announceNotFound(); }, [path]);", to: "  useEffect(() => { announceNotFound(); }, [path]);" }] },`,
   `edits: [ // R5-H: the file imports only useLayoutEffect now — the plant brings useEffect in with it\n      { file: "src/components/ui/not-found-mark.tsx", from: "import { useLayoutEffect } from \\"react\\";", to: "import { useEffect, useLayoutEffect } from \\"react\\";" },\n      { file: "src/components/ui/not-found-mark.tsx", from: "  useLayoutEffect(() => { announceNotFound(); }, [path]);", to: "  useEffect(() => { announceNotFound(); }, [path]);" }] },`],
  [`from: "        \\"/wallet/deposit\\": <DepositGhost t={t} />,", to: "        \\"/wallet/deposit\\": <div className=\\"mx-auto w-full max-w-form px-3 py-6\\" aria-busy=\\"true\\" />," }] },`,
   `from: "    \\"/wallet/deposit\\": <DepositGhost journey />,", to: "    \\"/wallet/deposit\\": <div className=\\"mx-auto w-full max-w-form px-3 py-6\\" aria-busy=\\"true\\" />," }] }, // R5-H/R5-G: the routes table`],
]);
console.log("ok");
