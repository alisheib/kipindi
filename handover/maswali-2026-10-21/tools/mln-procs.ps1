# mln-procs.ps1 -Tree <C:\50pick-ssd folder name> -Port <port> [-Stop]
# Lists (and with -Stop, stops) ONLY the node processes of one SSD worktree's dev/start server: those whose command
# line names C:\50pick-ssd\<Tree>\ (the trees have REAL node_modules, so the path names only that tree's server), or that
# were started with "-p <Port>", or that LISTEN on <Port>. MASWALI-BUILD, OMEGA-COMPILE01, 2026-10-19.
param([Parameter(Mandatory = $true)][string]$Tree, [Parameter(Mandatory = $true)][int]$Port, [switch]$Stop)
$needle = "*\50pick-ssd\$Tree\*"
function Get-Mine {
  $byCmd = @(Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object {
      ($_.CommandLine -like $needle) -or ($_.CommandLine -like "*next*-p $Port") -or ($_.CommandLine -like "*next*-p $Port *") -or ($_.CommandLine -like "*--port $Port*")
    } | ForEach-Object { $_.ProcessId })
  $byPort = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | ForEach-Object { $_.OwningProcess })
  return @(($byCmd + $byPort) | Where-Object { $_ -and $_ -ne 0 } | Sort-Object -Unique)
}
$ids = Get-Mine
if ($Stop) {
  for ($i = 0; $i -lt 15; $i++) {
    foreach ($id in $ids) { Stop-Process -Id $id -Force -ErrorAction SilentlyContinue }
    Start-Sleep -Seconds 1
    $ids = Get-Mine
    if ($ids.Count -eq 0) { break }
  }
}
Write-Output $ids.Count
