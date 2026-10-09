# Stand-in for the db:scratch fix (da35f89c) while turn A runs the OLD tool in F:\kipindi-wp12: every second, stop a
# postgres.exe that is an io_worker-style child (--forkchild) whose parent is gone AND whose binary is under
# F:\kipindi-a8j\node_modules - the node_modules only this session's worktrees use (c5docs, s7, wp12 junction to it).
# A live cluster's children have a live parent, so they are never touched. Ends when the done marker appears.
param([string]$Done, [string]$Log)
while (-not (Test-Path $Done)) {
  $live = @{}; Get-Process | ForEach-Object { $live[[int]$_.Id] = 1 }
  Get-CimInstance Win32_Process -Filter "Name='postgres.exe'" | Where-Object {
    $c = ([string]$_.CommandLine).Replace('\', '/').ToLower()
    $c.Contains('f:/kipindi-a8j/node_modules/') -and $c.Contains('--forkchild') -and -not $live.ContainsKey([int]$_.ParentProcessId)
  } | ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    Add-Content -Path $Log -Value ("{0} stopped orphan {1} (parent {2} gone): {3}" -f (Get-Date).ToUniversalTime().ToString('HH:mm:ss'), $_.ProcessId, $_.ParentProcessId, $_.CommandLine)
  }
  Start-Sleep -Seconds 1
}
Add-Content -Path $Log -Value ("{0} watcher ended ({1} exists)" -f (Get-Date).ToUniversalTime().ToString('HH:mm:ss'), $Done)
