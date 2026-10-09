param([string]$Tile, [int]$Y0, [int]$Y1, [int]$X0 = 0, [int]$X1 = 600, [int]$Thr = 60, [int]$BgX = -1, [int]$BgY = -1)
# Prints each column band between X0 and X1 (columns with ink in Y0..Y1) with its first and last ink y.
Add-Type -AssemblyName System.Drawing
$b = [System.Drawing.Bitmap]::FromFile($Tile)
if ($BgX -lt 0) { $BgX = [Math]::Max($X0, 2) }
if ($BgY -lt 0) { $BgY = $Y0 }
$bg = $b.GetPixel($BgX, $BgY)
$bgs = $bg.R + $bg.G + $bg.B
$band = $null
for ($x = $X0; $x -le [Math]::Min($X1, $b.Width - 1); $x++) {
  $first = -1; $last = -1
  for ($y = $Y0; $y -le [Math]::Min($Y1, $b.Height - 1); $y++) {
    $p = $b.GetPixel($x, $y)
    if ([Math]::Abs(($p.R + $p.G + $p.B) - $bgs) -gt $Thr) { if ($first -lt 0) { $first = $y }; $last = $y }
  }
  if ($first -ge 0) {
    if ($band -eq $null) { $band = @{ x0 = $x; f = $first; l = $last } } else { $band.f = [Math]::Min($band.f, $first); $band.l = [Math]::Max($band.l, $last) }
    $band.x1 = $x
  } elseif ($band -ne $null) {
    "x {0}-{1}  y {2}..{3}" -f $band.x0, $band.x1, $band.f, $band.l
    $band = $null
  }
}
if ($band -ne $null) { "x {0}-{1}  y {2}..{3}" -f $band.x0, $band.x1, $band.f, $band.l }
$b.Dispose()
