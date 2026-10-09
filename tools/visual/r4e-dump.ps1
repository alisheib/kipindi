param([string]$Tile, [int]$X0, [int]$Y0, [int]$X1, [int]$Y1)
# Prints the luminance-above-background of every pixel in a rectangle as a 0-9 grid (9 = brightest in the box).
Add-Type -AssemblyName System.Drawing
$b = [System.Drawing.Bitmap]::FromFile($Tile)
$bg = $b.GetPixel($X0, $Y0); $bgs = $bg.R + $bg.G + $bg.B
$max = 1
for ($y = $Y0; $y -le $Y1; $y++) { for ($x = $X0; $x -le $X1; $x++) { $p = $b.GetPixel($x, $y); $d = $p.R + $p.G + $p.B - $bgs; if ($d -gt $max) { $max = $d } } }
"    " + (($X0..$X1 | ForEach-Object { ($_ % 10).ToString() }) -join "")
for ($y = $Y0; $y -le $Y1; $y++) {
  $row = ""
  for ($x = $X0; $x -le $X1; $x++) { $p = $b.GetPixel($x, $y); $d = $p.R + $p.G + $p.B - $bgs; if ($d -le 8) { $row += "." } else { $row += [string][Math]::Min(9, [Math]::Floor(9.99 * $d / $max)) } }
  "{0,4}{1}" -f $y, $row
}
$b.Dispose()
