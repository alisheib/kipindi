. "$PSScriptRoot\mz.ps1"
foreach ($n in @("034","035","036","064","066","006","012")) {
  $a = T $n
  $w = $a.GetLength(0)
  $x0 = 96; if ($w -ge 1280) { $x0 = 24 }
  $y0 = 180; $y1 = 215; if ($n -in @("006","012")) { $y0 = 110; $y1 = 140 }
  "$n zh claim text rows x${x0}-500: " + [Mz]::RowBands($a, $x0, $y0, 500, $y1, 5, $y0, 60) + " | wordmark x32-85: " + [Mz]::RowBands($a, 32, $y0, 85, $y1, 5, $y0, 60)
}
