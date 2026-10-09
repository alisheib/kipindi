param([string]$Tile, [int]$Y, [int]$X0, [int]$X1)
# Dumps the RGB of every pixel on row Y from X0 to X1.
Add-Type -AssemblyName System.Drawing
$b = [System.Drawing.Bitmap]::FromFile($Tile)
$o = @()
for ($x = $X0; $x -le [Math]::Min($X1, $b.Width - 1); $x++) { $p = $b.GetPixel($x, $Y); $o += "$x=$($p.R),$($p.G),$($p.B)" }
$o -join ' | '
$b.Dispose()
