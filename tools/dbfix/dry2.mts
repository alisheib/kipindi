import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
const DATA_DIR = resolve(process.cwd(), ".pgscratch");
function killOwnOrphans(deadParents: number[] = []): number {
  const norm = (p: string): string => resolve(p).replace(/\\/g, "/").toLowerCase();
  const marker = norm(process.cwd());
  try {
    if (process.platform === "win32") {
      // Inside a single-quoted PowerShell string, where PowerShell reads the typographic single quotes as quotes too.
      const ps = (s: string): string => s.replace(/['‘’‚‛]/g, "$&$&");
      const dir = norm(DATA_DIR).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // `-D <dir>` as Node wrote it — quoted only when the path holds a space — and nothing after it but a space or the
      // end: not `.pgscratch\sub`, not `.pgscratch - Copy`. `\x22` is the double quote, kept out of the command line.
      const dirRe = ps(`\\s-d\\s+(\\x22${dir}\\x22|${dir})(\\s|$)`);
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
         `$take = @($pm + $kids); ` +
         `foreach ($x in @($all | Where-Object { $take -contains [int]$_.ProcessId })) { ` +
         `$q = Get-Process -Id ([int]$x.ProcessId) -ErrorAction SilentlyContinue; ` +
         `if ($q -and [Math]::Abs(($q.StartTime - $x.CreationDate).TotalMilliseconds) -lt 1) { [int]$x.ProcessId } }`],
        { encoding: "utf8", timeout: 20_000 },
      );
      return out.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).length; // one line per process killed
    }
    const out = execFileSync("bash", ["-c", `pgrep -f '${marker}.*postgres' || true`], { encoding: "utf8", timeout: 20_000 });
    const pids = out.split("\n").map((l) => l.trim()).filter(Boolean);
    for (const pid of pids) { console.log("  would kill", pid); }
    return pids.length;
  } catch (err) {
    console.error(String((err as any)?.stderr ?? err)); throw new Error('the sweep FAILED: ' + String(arguments[0])); // dry run: show it: the caller reports the original failure either way
  }
}

const dead = JSON.parse(process.argv[2] ?? "[]");
console.log(`cwd ${process.cwd()} · dead parents ${JSON.stringify(dead)} → ${killOwnOrphans(dead)} would be taken`);
