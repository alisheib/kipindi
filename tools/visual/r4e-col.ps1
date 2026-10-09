param([string]$Tile, [int]$X, [int]$Y0, [int]$Y1)
# Prints the RGB of every pixel in column X from Y0 to Y1.
Add-Type -AssemblyName System.Drawing
$b = [System.Drawing.Bitmap]::FromFile($Tile)
for ($y = $Y0; $y -le $Y1; $y++) { $p = $b.GetPixel($X, $y); "{0}: {1},{2},{3}" -f $y, $p.R, $p.G, $p.B }
$b.Dispose()
