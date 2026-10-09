param([string]$ListFile, [string]$LogFile, [int]$TimeoutSec = 420)
# Runs each npm suite named in $ListFile (one per line) from the R5-B worktree, ONE AT A TIME, with a per-suite timeout.
# Writes "<name> EXIT <code> <seconds>s" per suite to $LogFile and, for a failure, the last 40 lines of its output.
# ⚠️ The process handle is read right after the start: without it PowerShell's Process object loses the exit code.
Set-Location F:\kipindi-r5b
$names = Get-Content $ListFile | Where-Object { $_.Trim() -ne "" }
"START $(Get-Date -Format o) - $($names.Count) suites" | Out-File -FilePath $LogFile -Encoding utf8
foreach ($n in $names) {
  $out = Join-Path $env:TEMP ("r5b-suite-" + ($n -replace '[^\w-]', '_') + ".log")
  $sw = [Diagnostics.Stopwatch]::StartNew()
  $p = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npm run -s $n > `"$out`" 2>&1" -NoNewWindow -PassThru
  $null = $p.Handle
  $done = $p.WaitForExit($TimeoutSec * 1000)
  if (-not $done) { & taskkill /PID $p.Id /T /F | Out-Null; $code = "TIMEOUT" } else { $p.WaitForExit(); $code = $p.ExitCode }
  $sw.Stop()
  "$n EXIT $code $([int]$sw.Elapsed.TotalSeconds)s" | Out-File -FilePath $LogFile -Append -Encoding utf8
  if ("$code" -ne "0") {
    "----- tail of $n -----" | Out-File -FilePath $LogFile -Append -Encoding utf8
    Get-Content $out -Tail 40 -Encoding utf8 | Out-File -FilePath $LogFile -Append -Encoding utf8
    "-----" | Out-File -FilePath $LogFile -Append -Encoding utf8
  }
}
"END $(Get-Date -Format o)" | Out-File -FilePath $LogFile -Append -Encoding utf8
