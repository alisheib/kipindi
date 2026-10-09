param([string]$Tile, [int]$X0, [int]$X1, [int]$Y0, [int]$Y1, [string]$Mode = "sum")
# Prints a grid of pixel values (channel sum, or R/G/B by Mode) for the rectangle X0..X1 × Y0..Y1, one row per y.
Add-Type -AssemblyName System.Drawing
$b = [System.Drawing.Bitmap]::FromFile($Tile)
$hdr = "     " + (($X0..$X1) | ForEach-Object { "{0,4}" -f ($_ % 10000) }) -join ""
$hdr
for ($y = $Y0; $y -le $Y1; $y++) {
  $row = "{0,4} " -f $y
  for ($x = $X0; $x -le $X1; $x++) {
    $p = $b.GetPixel($x, $y)
    $v = switch ($Mode) { "r" { $p.R } "g" { $p.G } "b" { $p.B } default { $p.R + $p.G + $p.B } }
    $row += "{0,4}" -f $v
  }
  $row
}
$b.Dispose()
