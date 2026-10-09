. "$PSScriptRoot\mz.ps1"
foreach ($n in @("018","026","034","027","035","019")) {
  $a = T $n
  "$n colbands y186-228: " + [Mz]::ColBands($a, 16, 186, 520, 228, 5, 140, 60)
}
$a = T "026"
"026 rowbands wordmark x32-90: " + [Mz]::RowBands($a, 32, 180, 92, 230, 5, 140, 60)
"026 rowbands rule x93-99: " + [Mz]::RowBands($a, 93, 180, 99, 230, 5, 140, 30)
"026 rowbands text x100-500: " + [Mz]::RowBands($a, 100, 180, 500, 230, 5, 140, 60)
"026 rule col px: " + [Mz]::ColPx($a, 96, 184, 228, 1)
