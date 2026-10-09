param([string]$ListFile, [string]$OutDir)
# Runs each `npm run -s <suite>` from F:\kipindi-r4a one at a time; writes <suite>.log and a summary of exit codes.
Set-Location F:/kipindi-r4a
New-Item -ItemType Directory -Force $OutDir | Out-Null
$summary = Join-Path $OutDir 'summary.txt'
"" | Set-Content -Encoding ascii $summary
foreach ($s in (Get-Content $ListFile)) {
  if (-not $s.Trim()) { continue }
  $log = Join-Path $OutDir (($s -replace '[:\\/]', '_') + '.log')
  $t0 = Get-Date
  $out = cmd /c "npm run -s $s 2>&1"
  $code = $LASTEXITCODE
  $out | Set-Content -Encoding utf8 $log
  $secs = [int]((Get-Date) - $t0).TotalSeconds
  $last = ($out | Where-Object { $_ -match '\S' } | Select-Object -Last 1)
  ("{0,-28} exit {1}  {2,4}s  {3}" -f $s, $code, $secs, $last) | Add-Content -Encoding utf8 $summary
}
"DONE" | Add-Content -Encoding ascii $summary
