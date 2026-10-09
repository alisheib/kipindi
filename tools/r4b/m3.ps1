. "$PSScriptRoot\mz.ps1"
foreach ($n in '305','313','306','314') {
  $a = T $n
  $w = $a.GetLength(0)
  "== $n (w$w)"
  # The bubble: its ink against the footer's own background, sampled left of it on the same rows.
  "bubble box (thr 12, bg at x200,y680): " + [Mz]::Box($a, $w-80, 640, $w-1, 712, 200, 680, 12)
  foreach ($y in 652,656,660,664,668,672,676,680,684,688,692,696,700,702,704) { "  row y$y : " + [Mz]::Row($a, $y, $w-80, $w-1, 200, $y, 12) }
  "  col x" + ($w-38) + " : " + [Mz]::Col($a, $w-38, 630, 720, 200, 690, 12)
  # The footer's licence line and the lines below it: their right ends.
  foreach ($y0 in 610,650,682) { "  text rows $y0-" + ($y0+28) + " box: " + [Mz]::Box($a, 0, $y0, $w-100, $y0+28, 200, 640, 40) }
}
