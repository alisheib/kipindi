import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
const DATA_DIR = resolve(process.cwd(), ".pgscratch");
function killOwnOrphans(deadParents: number[] = []): number {
  const norm = (p: string): string => resolve(p).replace(/\\/g, "/").toLowerCase();
  const marker = norm(process.cwd());
  try {
    if (process.platform === "win32") {
      const ps = (s: string): string => s.replace(/'/g, "''"); // inside a single-quoted PowerShell string
      const dirRe = ps(norm(DATA_DIR).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([^a-z0-9._-]|$)");
      const known = deadParents.filter((p) => Number.isInteger(p) && p > 0).join(",");
      const out = execFileSync(
        "powershell",
        ["-NoProfile", "-Command",
         `$all = @(Get-CimInstance Win32_Process -Filter "Name='postgres.exe'"); ` +
         `$live = @{}; Get-Process | ForEach-Object { $live[[int]$_.Id] = 1 }; ` +
         `$pm = @($all | Where-Object { $c = ([string]$_.CommandLine).Replace('\\','/').ToLower(); ` +
         `-not $c.Contains('--forkchild') -and ($c -match '${dirRe}') } | ForEach-Object { [int]$_.ProcessId }); ` +
         `$gone = @(@(${known}) | Where-Object { -not $live.ContainsKey([int]$_) }); ` +
         `$par = @($pm + $gone); ` +
         `$kids = @($all | Where-Object { $c = ([string]$_.CommandLine).Replace('\\','/').ToLower(); $p = [int]$_.ParentProcessId; ` +
         `$c.Contains('--forkchild') -and (($par -contains $p) -or (-not $live.ContainsKey($p) -and $c.Contains('${ps(marker)}/'))) } | ` +
         `ForEach-Object { [int]$_.ProcessId }); ` +
         `@($pm + $kids) | Sort-Object -Unique`],
        { encoding: "utf8", timeout: 20_000 },
      );
      const pids = out.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      for (const pid of pids) { console.log("  would kill", pid); }
      return pids.length;
    }
    const out = execFileSync("bash", ["-c", `pgrep -f '${marker}.*postgres' || true`], { encoding: "utf8", timeout: 20_000 });
    const pids = out.split("\n").map((l) => l.trim()).filter(Boolean);
    for (const pid of pids) { console.log("  would kill", pid); }
    return pids.length;
  } catch {
    return 0; // best effort: the caller reports the original failure either way
  }
}

const dead = JSON.parse(process.argv[2] ?? "[]");
console.log(`cwd ${process.cwd()} · dead parents ${JSON.stringify(dead)} → ${killOwnOrphans(dead)} selected`);
