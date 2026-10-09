param([string]$Tile, [int]$X0, [int]$X1, [int]$Y0, [int]$Y1, [int]$Thr = 200)
# For each row Y0..Y1, counts pixels in X0..X1 whose channel sum exceeds Thr (ink on a dark ground) and prints the runs of
# rows that carry ink: the ink bands (text lines) inside a box, so their distance to the box's edges can be read.
Add-Type -AssemblyName System.Drawing
$b = [System.Drawing.Bitmap]::FromFile($Tile)
$runStart = -1; $prev = $false
for ($y = $Y0; $y -le $Y1 + 1; $y++) {
  $has = $false
  if ($y -le $Y1) {
    for ($x = $X0; $x -le $X1; $x++) { $p = $b.GetPixel($x, $y); if (($p.R + $p.G + $p.B) -gt $Thr) { $has = $true; break } }
  }
  if ($has -and -not $prev) { $runStart = $y }
  if (-not $has -and $prev) { "ink y{0}-{1} ({2} rows)" -f $runStart, ($y - 1), ($y - $runStart) }
  $prev = $has
}
$b.Dispose()
