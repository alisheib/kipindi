. "$PSScriptRoot\mz.ps1"
function Ext($a, $x0, $x1, $y0, $y1, $bx, $by) {
  $r = $a[$bx,$by,0] + $a[$bx,$by,1] + $a[$bx,$by,2]
  $vals = @{}; $full = 1
  for ($y = $y0; $y -le $y1; $y++) { $mx = 0; for ($x = $x0; $x -le $x1; $x++) { $d = $a[$x,$y,0] + $a[$x,$y,1] + $a[$x,$y,2] - $r; if ($d -gt $mx) { $mx = $d } }; $vals[$y] = $mx; if ($mx -gt $full) { $full = $mx } }
  $top = $null; $bot = $null
  for ($y = $y0; $y -le $y1; $y++) { $c = [Math]::Min(1, $vals[$y] / $full); if ($c -gt 0.08) { if ($top -eq $null) { $top = $y + 1 - $c }; $bot = $y + $c } }
  return @($top, $bot, (($top + $bot) / 2))
}
# 114 sw 390: title "Ingia..." cap I stem x22-26 ; x glyph x340-356
$a = T "114"
$t = Ext $a 22 25 655 690 200 690
$x = Ext $a 340 358 655 690 300 690
"114 sw390  I-stem {0:N2}-{1:N2} c{2:N2} | x {3:N2}-{4:N2} c{5:N2} | x-minus-cap {6:N2}" -f $t[0],$t[1],$t[2],$x[0],$x[1],$x[2],($x[2]-$t[2])
# 320 channels: F stem x33-36, x glyph x328-342
$a = T "320"
$t = Ext $a 33 36 222 245 200 236
$x = Ext $a 328 342 222 245 200 236
"320 chan   F-stem {0:N2}-{1:N2} c{2:N2} | x {3:N2}-{4:N2} c{5:N2} | x-minus-cap {6:N2}" -f $t[0],$t[1],$t[2],$x[0],$x[1],$x[2],($x[2]-$t[2])
