param([string]$Tile, [string]$Points)
# Prints the RGB (and the channel sum) of each "x,y" point in a semicolon-separated list.
Add-Type -AssemblyName System.Drawing
$b = [System.Drawing.Bitmap]::FromFile($Tile)
foreach ($pt in $Points.Split(';')) {
  $xy = $pt.Split(',')
  $p = $b.GetPixel([int]$xy[0], [int]$xy[1])
  "({0},{1}) = {2},{3},{4} sum {5}" -f $xy[0], $xy[1], $p.R, $p.G, $p.B, ($p.R + $p.G + $p.B)
}
$b.Dispose()
