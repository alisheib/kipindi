param([string]$Tile, [int]$X0, [int]$X1, [int]$Y0, [int]$Y1)
# Per column: the max channel-sum delta from the background (sampled at X0-? left of the band) and the coverage estimate
# (delta / the band's full-ink delta), so a partly covered first column reads as a fraction of a pixel.
Add-Type -AssemblyName System.Drawing
$b = [System.Drawing.Bitmap]::FromFile($Tile)
$bg = $b.GetPixel($X0, $Y0)
$bgs = $bg.R + $bg.G + $bg.B
$full = 0
$rows = @()
for ($x = $X0; $x -le $X1; $x++) {
  $mx = 0; $sum = 0
  for ($y = $Y0; $y -le $Y1; $y++) {
    $p = $b.GetPixel($x, $y)
    $d = ($p.R + $p.G + $p.B) - $bgs
    if ($d -gt $mx) { $mx = $d }
    if ($d -gt 0) { $sum += $d }
  }
  if ($mx -gt $full) { $full = $mx }
  $rows += ,@($x, $mx, $sum)
}
foreach ($r in $rows) { "x{0}  peak {1}  colsum {2}  cov {3:N2}" -f $r[0], $r[1], $r[2], ($r[1] / [Math]::Max(1, $full)) }
"bg $($bg.R),$($bg.G),$($bg.B)  full-ink delta $full"
$b.Dispose()
