import { readFileSync } from "node:fs";
for (const f of ["src/app/s/[token]/page.tsx","src/app/s/page.tsx","src/app/positions/page.tsx","src/app/profile/invite/page.tsx","src/app/page.tsx","src/app/leaderboard/page.tsx","src/app/proposals/page.tsx","src/app/results/page.tsx","src/app/auth/register/page.tsx","src/app/updown/page.tsx","src/app/wallet/receipt/[id]/page.tsx","src/app/agent/invite/[token]/page.tsx","src/app/admin/ai-polls/[id]/page.tsx","src/app/admin/markets/[id]/page.tsx"]) {
  const s = readFileSync("F:/kipindi-r5d/" + f, "utf8").replace(/\r\n/g, "\n");
  const at = s.search(/export\s+(?:async\s+)?function\s+generateMetadata|export\s+const\s+(?:generateMetadata|metadata)/);
  if (at < 0) { console.log("--- " + f + ": none"); continue; }
  let i = s.indexOf("{", s.indexOf(")", at));
  let depth = 0, j = i;
  for (; j < s.length; j++) { if (s[j] === "{") depth++; else if (s[j] === "}") { depth--; if (depth === 0) break; } }
  console.log("--- " + f + "\n" + s.slice(at, j + 1));
}
