// R5-L · ONE HELPER (the integrator, 2026-10-09: R5-K's `ghost-text.tsx` is on the tip; keep one). On this worktree's
// base the R5-L ghosts take R5-K's API and semantics verbatim — `GhostText`, `ghostShape`, `ChipGhost` — from
// `ghost-kit.tsx`, whose first four exports are R5-K's code byte for byte, plus `ButtonGhost`; the bar kit takes R5-K's
// `CountGhost` beside the one `PillGhost`. On the merge `S/r5l/merge/one-helper.cjs` moves ButtonGhost into
// ghost-text.tsx, re-points the imports and deletes ghost-kit.tsx.
const fs = require("fs");
const { once, edit, put } = require("./lib.cjs");
const HERE = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/r5l/";

put("src/components/ui/ghost-kit.tsx", fs.readFileSync(HERE + "merge/ghost-kit.tsx", "utf8"));

const WORD_OPEN = /<Words(?: ink=(?:"[a-z]+"|\{[^}]*\}))?>/g;
const files = [
  "src/app/agent/apply/loading.tsx", "src/app/agent/invite/[token]/loading.tsx", "src/app/agent/loading.tsx",
  "src/app/agent/status/loading.tsx", "src/app/fairness/loading.tsx", "src/app/leaderboard/loading.tsx",
  "src/app/live/loading.tsx", "src/app/profile/kyc/loading.tsx", "src/app/profile/responsible-gambling/loading.tsx",
  "src/app/profile/sessions/loading.tsx", "src/app/profile/source-of-funds/loading.tsx", "src/app/results/loading.tsx",
];
let opened = 0;
for (const f of files) edit(f, (s) => {
  const n = (s.match(WORD_OPEN) ?? []).length;
  opened += n;
  s = s.replace(WORD_OPEN, "<GhostText>").replace(/<\/Words>/g, "</GhostText>");
  if (/\bWords\b/.test(s.replace(/import \{[^}]*\} from "@\/components\/ui\/ghost-kit";/, ""))) {
    // only the import may still name it
  }
  s = s.replace(/import \{ ([^}]*) \} from "@\/components\/ui\/ghost-kit";/, (_, names) => {
    const list = names.split(", ").map((x) => (x === "Words" ? "GhostText" : x === "CHIP_GHOST" ? "ChipGhost" : x));
    if (f === "src/app/agent/loading.tsx") list.push("ghostShape");
    return `import { ${list.sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" })).join(", ")} } from "@/components/ui/ghost-kit";`;
  });
  return s;
});
console.log(`word bars converted: ${opened}`);

// The four kit chips: R5-K's ChipGhost with the page's own size and metrics row (`pending`/`resolved` are status variants).
edit("src/app/agent/apply/loading.tsx", (s) => {
  s = once(s,
    "<Chip variant=\"pending\" style={CHIP_GHOST} aria-hidden>{fill(t.agent.attachedCount, { n: \"0\", total: \"0\" })}</Chip>",
    "<ChipGhost metrics=\"status\">{fill(t.agent.attachedCount, { n: \"0\", total: \"0\" })}</ChipGhost>",
    "apply chip");
  return s;
});
edit("src/app/agent/status/loading.tsx", (s) => once(s,
  "<Chip variant=\"pending\" style={CHIP_GHOST}>{t.agent.statusUnderReview}</Chip>",
  "<ChipGhost metrics=\"status\">{t.agent.statusUnderReview}</ChipGhost>",
  "status chip"));
edit("src/app/results/loading.tsx", (s) => {
  s = once(s,
    "<Chip variant=\"cat\" size=\"sm\" style={CHIP_GHOST}>{t.market.catSports}</Chip>",
    "<ChipGhost size=\"sm\">{t.market.catSports}</ChipGhost>",
    "results cat chip");
  s = once(s,
    "<Chip variant=\"neutral\" metrics=\"status\" size=\"sm\" style={CHIP_GHOST}>{t.market.resolvedOutcome} · {outcomeWord(t, \"NO\", \"MARKET\")}</Chip>",
    "<ChipGhost size=\"sm\" metrics=\"status\">{t.market.resolvedOutcome} · {outcomeWord(t, \"NO\", \"MARKET\")}</ChipGhost>",
    "results verdict chip");
  return s;
});
// A Chip import nothing reads any more goes.
for (const f of ["src/app/agent/apply/loading.tsx", "src/app/agent/status/loading.tsx", "src/app/results/loading.tsx"]) edit(f, (s) => {
  const body = s.replace(/import \{ Chip \} from "@\/components\/ui\/chip";\r?\n/, "");
  return /<Chip\b/.test(body) ? s : body;
});
// The fee's digits through R5-K's ghostShape.
edit("src/app/agent/loading.tsx", (s) => once(s,
  "FEE = formatTzs(100_000).replace(/\\d/g, \"0\");",
  "FEE = ghostShape(formatTzs(100_000));",
  "fee shape"));
// The notes name the helper by its part, not by a file the merge deletes.
const NOTES = [
  ["src/app/agent/apply/loading.tsx", "(`ghost-kit.tsx`), so the step buttons wrap", "(`GhostText`), so the step buttons wrap"],
  ["src/app/agent/invite/[token]/loading.tsx", "set and not shown (`ghost-kit.tsx`).", "set and not shown (`GhostText`)."],
  ["src/app/agent/status/loading.tsx", "set and not shown (`ghost-kit.tsx`), so it wraps", "set and not shown (`GhostText`), so it wraps"],
  ["src/app/leaderboard/loading.tsx", "(`ghost-kit.tsx`, `query-bar-ghost.tsx`)", "(`GhostText`, `query-bar-ghost.tsx`)"],
  ["src/components/ui/page-loader.tsx", "not shown, `ghost-kit.tsx`)", "not shown, `GhostText`)"],
];
for (const [f, from, to] of NOTES) edit(f, (s) => once(s, from, to, `note ${f}`));
edit("src/app/agent/loading.tsx", (s) => once(s, "`components/ui/ghost-kit.tsx`). The tiles", "`GhostText`, R5-K's convention). The tiles", "agent note"));
