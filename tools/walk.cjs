const { spawnSync } = require("node:child_process");
const path = require("node:path");
const SP = __dirname;
function processTable() {
  const r = spawnSync("powershell", ["-NoProfile", "-Command",
    "Get-CimInstance Win32_Process | ForEach-Object { '{0} {1} {2} {3}' -f $_.ProcessId, $_.ParentProcessId, ([DateTimeOffset]$_.CreationDate).ToUnixTimeMilliseconds(), $_.Name }"],
    { encoding: "utf8", maxBuffer: 16 * 1024 * 1024, timeout: 60_000 });
  if (r.status !== 0) return null;
  const table = new Map();
  for (const line of (r.stdout ?? "").split(/\r?\n/)) {
    const [pid, parent, at, ...name] = line.trim().split(" ");
    if (/^\d+$/.test(pid) && /^\d+$/.test(parent) && /^\d+$/.test(at)) {
      table.set(Number(pid), { parent: Number(parent), at: Number(at), name: name.join(" ").toLowerCase() });
    }
  }
  return table;
}
function descendants(table, root, since) {
  const found = [];
  const queue = [root];
  while (queue.length) {
    const parent = queue.shift();
    for (const [pid, p] of table) {
      if (p.parent === parent && p.at >= since - 2000 && !found.includes(pid)) { found.push(pid); queue.push(pid); }
    }
  }
  return found.filter((pid) => table.get(pid).name === "node.exe");
}
const pause = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const sleeperPath = path.join(SP, "sleeper.cjs");
function scenario(label, cmdline) {
  const start = Date.now();
  const r = spawnSync("cmd.exe", ["/d", "/s", "/c", cmdline], { stdio: "ignore", windowsVerbatimArguments: true });
  pause(1500);
  const table = processTable();
  const found = descendants(table, r.pid, start);
  // the sleeper: a node.exe running sleeper.cjs created after start
  const sleepers = [...table].filter(([pid, p]) => p.name === "node.exe" && p.at >= start - 50);
  console.log(`${label}: root(dead) pid=${r.pid} inTable=${table.has(r.pid)} found=${JSON.stringify(found)}`);
  for (const [pid, p] of sleepers) console.log(`   new node.exe pid=${pid} parent=${p.parent} parentInTable=${table.has(p.parent)} at-start=${p.at - start}ms`);
}
scenario("A dead root only", `"start "" /b node ${sleeperPath} 12000"`);
scenario("B dead root + dead intermediate", `"start "" /b cmd /d /c ${path.join(SP, "inner.cmd")}"`);
