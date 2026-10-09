const { spawnSync } = require("node:child_process");
const CMD = "Get-CimInstance Win32_Process | ForEach-Object { '{0} {1} {2} {3}' -f $_.ProcessId, $_.ParentProcessId, ([DateTimeOffset]$_.CreationDate).ToUnixTimeMilliseconds(), $_.Name }";
const t0 = Date.now();
const r = spawnSync("powershell", ["-NoProfile", "-Command", CMD], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024, timeout: 60_000 });
const t1 = Date.now();
console.log("status", r.status, "signal", r.signal, "error", r.error && r.error.code, "elapsed ms", t1 - t0);
console.log("stderr:", JSON.stringify((r.stderr || "").slice(0, 500)));
const lines = (r.stdout ?? "").split(/\r?\n/);
console.log("lines", lines.length);
const table = new Map(); const bad = [];
for (const line of lines) {
  const [pid, parent, at, ...name] = line.trim().split(" ");
  if (/^\d+$/.test(pid) && /^\d+$/.test(parent) && /^\d+$/.test(at)) {
    table.set(Number(pid), { parent: Number(parent), at: Number(at), name: name.join(" ").toLowerCase() });
  } else bad.push(JSON.stringify(line));
}
console.log("parsed", table.size, "unparsed:", bad.slice(0, 10).join(" | "));
const me = table.get(process.pid);
const ps = table.get(r.pid);
const approxStart = Date.now() - performance.now();
console.log("self node:", JSON.stringify(me), "approx start from perf:", Math.round(approxStart), "delta ms:", me && Math.round(me.at - approxStart));
console.log("powershell child:", JSON.stringify(ps), "t0:", t0, "at - t0 ms:", ps && ps.at - t0);
const names = [...table.values()].filter(p => /\s/.test(p.name)).map(p => p.name);
console.log("names with spaces:", [...new Set(names)].slice(0, 10));
console.log("node.exe count:", [...table.values()].filter(p => p.name === "node.exe").length);
console.log("first lines sample:", lines.slice(0, 4).map(l => JSON.stringify(l)).join(" "));
console.log("TZ offset min:", new Date().getTimezoneOffset());
