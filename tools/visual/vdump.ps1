param([string]$Tile, [int]$X, [int]$Y0, [int]$Y1)
# Dumps the RGB of every pixel at column X from Y0 to Y1, one per entry.
Add-Type -AssemblyName System.Drawing
$b = [System.Drawing.Bitmap]::FromFile($Tile)
$o = @()
for ($y = $Y0; $y -le [Math]::Min($Y1, $b.Height - 1); $y++) { $p = $b.GetPixel($X, $y); $o += "$y=$($p.R),$($p.G),$($p.B)" }
$o -join ' | '
$b.Dispose()
