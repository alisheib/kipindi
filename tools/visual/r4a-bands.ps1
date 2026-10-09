param([string]$Tile, [int]$Y0, [int]$Y1, [int]$X0, [int]$X1, [int]$BgX, [int]$Thr = 40)
# Like rowstarts.ps1, but each ROW's background is read at (BgX, y) — for a card whose wash is a gradient.
Add-Type -AssemblyName System.Drawing
$b = [System.Drawing.Bitmap]::FromFile($Tile)
$band = $null
for ($y = $Y0; $y -le [Math]::Min($Y1, $b.Height - 1); $y++) {
  $bg = $b.GetPixel($BgX, $y); $bgs = $bg.R + $bg.G + $bg.B
  $first = -1; $last = -1
  for ($x = $X0; $x -le [Math]::Min($X1, $b.Width - 1); $x++) {
    $p = $b.GetPixel($x, $y)
    if ([Math]::Abs(($p.R + $p.G + $p.B) - $bgs) -gt $Thr) { if ($first -lt 0) { $first = $x }; $last = $x }
  }
  if ($first -ge 0) {
    if ($band -eq $null) { $band = @{ y0 = $y; f = $first; l = $last } } else { $band.f = [Math]::Min($band.f, $first); $band.l = [Math]::Max($band.l, $last) }
    $band.y1 = $y
  } elseif ($band -ne $null) {
    "y {0}-{1}  x {2}..{3}" -f $band.y0, $band.y1, $band.f, $band.l
    $band = $null
  }
}
if ($band -ne $null) { "y {0}-{1}  x {2}..{3}" -f $band.y0, $band.y1, $band.f, $band.l }
$b.Dispose()
