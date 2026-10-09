param([string]$name, [int]$x, [int]$y, [int]$w, [int]$h, [int]$scale = 3, [string]$out)
Add-Type -AssemblyName System.Drawing
$td = 'C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/edges/tiles'
$f = Get-ChildItem $td -Filter ($name + '*.png') | Select-Object -First 1
$src = [System.Drawing.Bitmap]::FromFile($f.FullName)
$dst = New-Object System.Drawing.Bitmap ($w * $scale), ($h * $scale)
$g = [System.Drawing.Graphics]::FromImage($dst)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
$g.DrawImage($src, (New-Object System.Drawing.Rectangle 0, 0, ($w * $scale), ($h * $scale)), (New-Object System.Drawing.Rectangle $x, $y, $w, $h), [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose(); $src.Dispose()
$dst.Save($out, [System.Drawing.Imaging.ImageFormat]::Png); $dst.Dispose()
$out
