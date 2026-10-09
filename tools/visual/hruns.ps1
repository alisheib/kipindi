param([string]$Tile, [int]$Y0, [int]$Y1, [int]$X0 = 0, [int]$X1 = -1, [int]$Thr = 60, [int]$Join = 6)
# Prints the horizontal ink runs (columns with any pixel in Y0..Y1 differing from the row's background by > Thr),
# joining runs separated by fewer than $Join blank columns; each run with its peak difference.
Add-Type -AssemblyName System.Drawing
$b = [System.Drawing.Bitmap]::FromFile($Tile)
if ($X1 -lt 0) { $X1 = $b.Width - 1 }
$bg = $b.GetPixel($X0, $Y0); $bgs = $bg.R + $bg.G + $bg.B
$cols = @{}
for ($x = $X0; $x -le $X1; $x++) {
  $pk = 0
  for ($y = $Y0; $y -le $Y1; $y++) { $p = $b.GetPixel($x, $y); $d = [Math]::Abs(($p.R + $p.G + $p.B) - $bgs); if ($d -gt $pk) { $pk = $d } }
  $cols[$x] = $pk
}
$start = -1; $last = -1; $peak = 0
for ($x = $X0; $x -le $X1; $x++) {
  if ($cols[$x] -gt $Thr) {
    if ($start -lt 0) { $start = $x; $peak = 0 }
    elseif ($x - $last -gt $Join) { "x {0}-{1} peak {2}" -f $start, $last, $peak; $start = $x; $peak = 0 }
    $last = $x; if ($cols[$x] -gt $peak) { $peak = $cols[$x] }
  }
}
if ($start -ge 0) { "x {0}-{1} peak {2}" -f $start, $last, $peak }
$b.Dispose()
