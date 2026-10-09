// R5-L · how long are comment lines at HEAD in the files R5-H wrote (the measure this branch's notes follow)?
const { execSync } = require("child_process");
const files = ["src/app/agent/loading.tsx", "src/components/ui/page-loader.tsx", "src/app/results/loading.tsx", "src/app/markets/loading.tsx", "src/app/live/loading.tsx", "src/app/wallet/money-bar-ghost.tsx", "src/app/updown/history/history-ghost.tsx", "src/components/journey/route-ghost.tsx"];
const hist = {};
for (const f of files) {
  const s = execSync(`git -C F:/kipindi-r5l show HEAD:${f}`, { encoding: "utf8" });
  for (const l of s.split(/\r?\n/)) {
    if (!/^\s*(\*|\/\/|\{\/\*)/.test(l)) continue;
    const n = [...l].length; if (n > 116) hist[n] = (hist[n] || 0) + 1;
  }
}
console.log(Object.entries(hist).sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k}:${v}`).join(" "));
