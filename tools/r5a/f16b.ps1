. "$PSScriptRoot\mz.ps1"
foreach ($n in @("206","207","208","209","210")) {
  $a = T $n
  # title lines: rows y588..715 in x95..348, bright ink only (white title > 180)
  $bands = [Mz]::RowBands($a, 95, 588, 330, 714, 300, 600, 200)
  $out = "$n bands(thr200): $bands |"
  foreach ($b in ($bands.Trim() -split " ")) { if ($b -eq "") { continue }; $p = $b -split "-"; $y0=[int]$p[0]; $y1=[int]$p[1]; if ($y1 - $y0 -lt 15) { continue }; $out += " [" + [Mz]::Box($a, 95, $y0, 348, $y1, 300, 600, 200) + "]" }
  $out
}
