// R5-J G-4, second batch (found by the wider sweep): exact, counted replacements; CRLF kept.
import { readFileSync, writeFileSync } from "node:fs";
const ROOT = "F:/kipindi-r5j/";
const IMP = `import { formatNumber } from "@/lib/utils";`;
const F = (x) => `formatNumber(${x})`;
const PLAN = {
  "src/app/leaderboard/page.tsx": {
    pairs: [[`<td className="p-3 text-right font-mono tabular-nums text-text-muted">{r.resolved}</td>`, `<td className="p-3 text-right font-mono tabular-nums text-text-muted">{${F("r.resolved")}}</td>`, 1]],
  },
  "src/app/positions/performance/page.tsx": {
    pairs: [
      [`{t.performance.longestStreak} {longestStreak}</p>`, `{t.performance.longestStreak} {${F("longestStreak")}}</p>`, 1],
      [`leading-none tabular-nums text-text">{currentStreak}</span>`, `leading-none tabular-nums text-text">{${F("currentStreak")}}</span>`, 1],
      [`tabular-nums">+{current - 12}</span>`, `tabular-nums">+{${F("current - 12")}}</span>`, 1],
    ],
  },
  "src/app/profile/invite/agent-dashboard.tsx": {
    pairs: [[`· {r.settlements} {t.agent.dashRecruitHint}`, `· {${F("r.settlements")}} {t.agent.dashRecruitHint}`, 1]],
  },
  "src/app/proposals/[id]/page.tsx": {
    pairs: [[`· {p.up + p.down} {t.proposals.votesCount}`, `· {${F("p.up + p.down")}} {t.proposals.votesCount}`, 1]],
    extend: [`import { formatTzsSigned } from "@/lib/utils";`, `import { formatNumber, formatTzsSigned } from "@/lib/utils";`],
  },
  "src/app/profile/security/security-client.tsx": {
    pairs: [[`size="sm">{backupRemaining}</Chip>`, `size="sm">{${F("backupRemaining")}}</Chip>`, 1]],
    insertAfter: `import { useRouter } from "next/navigation";`,
  },
  "src/components/badges/Badge.tsx": {
    pairs: [[`          {progress.value}/{progress.max}\n`, `          {${F("progress.value")}}/{${F("progress.max")}}\n`, 1]],
    extend: [`import { cn } from "@/lib/utils";`, `import { cn, formatNumber } from "@/lib/utils";`],
  },
  "src/components/markets/comments-thread.tsx": {
    pairs: [[`              {remaining}\n`, `              {${F("remaining")}}\n`, 1]],
  },
  "src/components/markets/market-card.tsx": {
    pairs: [[`<I.comment s={10} />{comments}</span>`, `<I.comment s={10} />{${F("comments")}}</span>`, 1]],
  },
  "src/components/proposals/vote-control.tsx": {
    pairs: [[`        {score}\n`, `        {${F("score")}}\n`, 1]],
    insertAfter: `import { I } from "@/components/ui/glyphs";`,
  },
};
let failed = false;
for (const [rel, plan] of Object.entries(PLAN)) {
  const p = ROOT + rel;
  const raw = readFileSync(p, "utf8");
  let s = raw.replace(/\r\n/g, "\n");
  let ok = true;
  const swap = (from, to, want) => {
    const n = s.split(from).length - 1;
    if (n !== want) { console.error(`${rel}: ${JSON.stringify(from).slice(0, 110)} expected ${want}, found ${n}`); ok = false; return; }
    s = s.split(from).join(to);
  };
  for (const [from, to, want] of plan.pairs) swap(from, to, want);
  if (plan.extend) swap(plan.extend[0], plan.extend[1], 1);
  if (plan.insertAfter) {
    if (s.includes(IMP)) { console.error(`${rel}: already imports formatNumber`); ok = false; }
    else swap(plan.insertAfter + "\n", plan.insertAfter + "\n" + IMP + "\n", 1);
  }
  if (!ok) { failed = true; continue; }
  writeFileSync(p, raw.includes("\r\n") ? s.replace(/\n/g, "\r\n") : s);
  console.log(`${rel}: ${plan.pairs.reduce((a, x) => a + x[2], 0)} site(s)${plan.extend ? " · import extended" : plan.insertAfter ? " · import added" : " · import present"}`);
}
if (failed) { console.error("SOME FILES NOT WRITTEN"); process.exit(1); }
