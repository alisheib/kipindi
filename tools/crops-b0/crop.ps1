param([string]$Tile,[int]$X,[int]$Y,[int]$W,[int]$H,[int]$Z=3,[string]$Out)
Add-Type -AssemblyName System.Drawing
$b=[System.Drawing.Bitmap]::FromFile($Tile)
$o=New-Object System.Drawing.Bitmap ($W*$Z),($H*$Z)
$g=[System.Drawing.Graphics]::FromImage($o)
$g.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$g.PixelOffsetMode=[System.Drawing.Drawing2D.PixelOffsetMode]::Half
$g.DrawImage($b,(New-Object System.Drawing.Rectangle 0,0,($W*$Z),($H*$Z)),(New-Object System.Drawing.Rectangle $X,$Y,$W,$H),[System.Drawing.GraphicsUnit]::Pixel)
$o.Save($Out,[System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose();$o.Dispose();$b.Dispose()
