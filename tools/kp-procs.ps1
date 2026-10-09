# kp-procs.ps1 -Wt <worktree folder name> -Port <port> [-Stop]
# Lists (and with -Stop, stops) ONLY the node processes of one worktree's dev server: those whose command line names
# F:\<Wt>\ (the server, its next bin, its postcss workers) or the npx wrapper started with "-p <Port>".
param([Parameter(Mandatory = $true)][string]$Wt, [Parameter(Mandatory = $true)][int]$Port, [switch]$Stop)
$needle = "*\$Wt\*"
$npx = "*npx-cli.js*next dev*-p $Port"
$procs = @(Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object {
    ($_.CommandLine -like $needle) -or ($_.CommandLine -like $npx) -or ($_.CommandLine -like "$npx *")
  })
if ($Stop) {
  foreach ($p in $procs) { Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue }
  for ($i = 0; $i -lt 15; $i++) {
    Start-Sleep -Seconds 1
    $procs = @(Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -like $needle })
    if ($procs.Count -eq 0) { break }
    foreach ($p in $procs) { Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue }
  }
}
Write-Output $procs.Count
