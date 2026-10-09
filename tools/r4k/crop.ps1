param([string]$src, [int]$x, [int]$y, [int]$w, [int]$h, [int]$scale = 4, [string]$out)
Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Bitmap]::FromFile($src)
$dst = New-Object System.Drawing.Bitmap ($w * $scale), ($h * $scale)
$g = [System.Drawing.Graphics]::FromImage($dst)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
$g.DrawImage($img, (New-Object System.Drawing.Rectangle 0, 0, ($w * $scale), ($h * $scale)), (New-Object System.Drawing.Rectangle $x, $y, $w, $h), [System.Drawing.GraphicsUnit]::Pixel)
$dst.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $dst.Dispose(); $img.Dispose()
