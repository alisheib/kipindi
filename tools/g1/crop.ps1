param([string]$File, [int]$X, [int]$Y, [int]$W, [int]$H, [int]$Scale = 3, [string]$Out)
# Crops a region and scales it up with nearest-neighbour so single pixels stay readable.
Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Bitmap]::FromFile($File)
$dst = New-Object System.Drawing.Bitmap ($W * $Scale), ($H * $Scale)
$g = [System.Drawing.Graphics]::FromImage($dst)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
$g.DrawImage($src, (New-Object System.Drawing.Rectangle 0, 0, ($W * $Scale), ($H * $Scale)), (New-Object System.Drawing.Rectangle $X, $Y, $W, $H), [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()
$dst.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
$dst.Dispose(); $src.Dispose()
"saved $Out"
