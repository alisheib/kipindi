// GENERATED from da35f89c:scripts/db-scratch.mts lines 110-129 (process.cwd() -> cwd, DATA_DIR -> param)
import { resolve } from "node:path";
export function build(cwd: string, deadParents: number[] = []): string {
  const DATA_DIR = resolve(cwd, ".pgscratch");
  const norm = (p: string): string => resolve(p).replace(/\\/g, "/").toLowerCase();
  const marker = norm(cwd);
      const ps = (s: string): string => s.replace(/'/g, "''"); // inside a single-quoted PowerShell string
      const dirRe = ps(norm(DATA_DIR).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([^a-z0-9._-]|$)");
      const known = deadParents.filter((p) => Number.isInteger(p) && p > 0).join(",");
  return (
         `$all = @(Get-CimInstance Win32_Process -Filter "Name='postgres.exe'"); ` +
         `$live = @{}; Get-Process | ForEach-Object { $live[[int]$_.Id] = 1 }; ` +
         `$pm = @($all | Where-Object { $c = ([string]$_.CommandLine).Replace('\\','/').ToLower(); ` +
         `-not $c.Contains('--forkchild') -and ($c -match '${dirRe}') } | ForEach-Object { [int]$_.ProcessId }); ` +
         `$gone = @(@(${known}) | Where-Object { -not $live.ContainsKey([int]$_) }); ` +
         `$par = @($pm + $gone); ` +
         `$kids = @($all | Where-Object { $c = ([string]$_.CommandLine).Replace('\\','/').ToLower(); $p = [int]$_.ParentProcessId; ` +
         `$c.Contains('--forkchild') -and (($par -contains $p) -or (-not $live.ContainsKey($p) -and $c.Contains('${ps(marker)}/'))) } | ` +
         `ForEach-Object { [int]$_.ProcessId }); ` +
         `@($pm + $kids) | Sort-Object -Unique`
  );
}
