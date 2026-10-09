param([string]$Tile, [int]$X, [int]$Y, [int]$W, [int]$H, [int]$Scale = 4, [string]$Out)
# Crops a region and scales it up with nearest-neighbour for close inspection.
Add-Type -AssemblyName System.Drawing
$b = [System.Drawing.Bitmap]::FromFile($Tile)
$o = New-Object System.Drawing.Bitmap ($W * $Scale), ($H * $Scale)
$g = [System.Drawing.Graphics]::FromImage($o)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
$g.DrawImage($b, (New-Object System.Drawing.Rectangle 0, 0, ($W * $Scale), ($H * $Scale)), (New-Object System.Drawing.Rectangle $X, $Y, $W, $H), [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()
$o.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
$o.Dispose(); $b.Dispose()
$Out
