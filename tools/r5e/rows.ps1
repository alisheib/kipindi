param([string]$Tile, [int]$Y0, [int]$Y1, [int]$X0, [int]$X1, [int]$Thr = 200)
# Prints, per row Y0..Y1, the leftmost and rightmost column whose brightness (R+G+B) exceeds Thr (light text on dark).
Add-Type -AssemblyName System.Drawing
$b = [System.Drawing.Bitmap]::FromFile($Tile)
for ($y = $Y0; $y -le $Y1; $y++) {
  $l = -1; $r = -1; $n = 0
  for ($x = $X0; $x -le $X1; $x++) { $p = $b.GetPixel($x, $y); if (($p.R + $p.G + $p.B) -gt $Thr) { if ($l -lt 0) { $l = $x }; $r = $x; $n++ } }
  "y {0}: {1}-{2} n{3}" -f $y, $l, $r, $n
}
$b.Dispose()
