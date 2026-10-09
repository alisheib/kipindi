. "$PSScriptRoot\mz.ps1"
function Prof($a, $x0, $x1, $y0, $y1, $bx, $by) {
  $r = $a[$bx,$by,0] + $a[$bx,$by,1] + $a[$bx,$by,2]; $out = @()
  $full = 0; $vals = @{}
  for ($y = $y0; $y -le $y1; $y++) { $mx = 0; for ($x = $x0; $x -le $x1; $x++) { $d = $a[$x,$y,0] + $a[$x,$y,1] + $a[$x,$y,2] - $r; if ($d -gt $mx) { $mx = $d } }; $vals[$y] = $mx; if ($mx -gt $full) { $full = $mx } }
  # coverage-weighted extent: first/last rows with coverage, fractional
  $top = $null; $bot = $null
  for ($y = $y0; $y -le $y1; $y++) { $c = $vals[$y] / $full; if ($c -gt 0.08) { if ($top -eq $null) { $top = $y + 1 - $c }; $bot = $y + $c } }
  return "{0:N2}-{1:N2} c{2:N2}" -f $top, $bot, (($top + $bot) / 2)
}
foreach ($n in @("114","117","120","115","118")) {
  $a = T $n
  $h = $a.GetLength(1); $w = $a.GetLength(0)
  "$n size ${w}x${h}"
}
