// Which registered npm scripts read a file R6-B touched? (static ones are run; DB/browser ones are named)
import { readFileSync, readdirSync } from "node:fs";
const ROOT = "F:/kipindi-r6b";
const pkg = JSON.parse(readFileSync(`${ROOT}/package.json`, "utf8"));
const touched = {
  "next.config.ts": ["next.config"], "src/proxy.ts": ["src/proxy.ts", "src/proxy\"", "/proxy.ts"], "src/lib/security-headers.ts": ["security-headers"],
  "src/components/ui/modal.tsx": ["ui/modal.tsx", "ui/modal\"", "components/ui/modal"], "src/components/charts/terminal-chart.tsx": ["terminal-chart"],
  "src/lib/fill-nodes.tsx": ["fill-nodes"], "src/app/live/pulse-grid.tsx": ["pulse-grid"], "src/lib/notification-text.ts": ["notification-text"],
  "src/components/ui/keep-words.tsx": ["keep-words"], "src/components/profile/name-editor.tsx": ["name-editor"], "src/app/profile/page.tsx": ["app/profile/page", "profile/page.tsx"],
  "src/app/updown/[roundId]/page.tsx": ["[roundId]/page", "updown/[roundId]"], "src/app/positions/performance/page.tsx": ["performance/page"],
  "src/lib/updown-round-name.ts": ["updown-round-name"], "src/lib/server/notification-service.ts": ["notification-service"],
};
const files = readdirSync(`${ROOT}/scripts`, { recursive: true }).map(String).filter((f) => /\.(mts|mjs|ts|cjs|js|json)$/.test(f)).map((f) => f.split("\\").join("/"));
const readers = {};
for (const f of files) {
  let s; try { s = readFileSync(`${ROOT}/scripts/${f}`, "utf8"); } catch { continue; }
  for (const [t, keys] of Object.entries(touched)) if (keys.some((k) => s.includes(k))) (readers[f] ??= []).push(t);
}
// a scripts/lib file is read by every script that imports it
const out = new Map();
for (const [name, cmd] of Object.entries(pkg.scripts)) {
  if (!/^(test|red):/.test(name)) continue;
  const m = /scripts\/([\w./-]+\.(?:mts|mjs|ts|cjs|js))/.exec(cmd);
  if (!m) continue;
  const file = m[1];
  let hits = readers[file] ?? [];
  // follow one level of scripts/lib imports
  try {
    const s = readFileSync(`${ROOT}/scripts/${file}`, "utf8");
    for (const im of s.matchAll(/from\s+["']\.\/(lib\/[\w./-]+)["']/g)) hits = hits.concat(readers[im[1]] ?? []);
  } catch {}
  if (hits.length) out.set(name, [...new Set(hits)]);
}
for (const [n, h] of [...out].sort()) console.log(`${n}\t${h.join(", ")}`);
