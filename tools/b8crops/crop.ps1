param($src,$x,$y,$w,$h,$scale,$out)
Add-Type -AssemblyName System.Drawing
$b=[System.Drawing.Bitmap]::FromFile($src)
$o=New-Object System.Drawing.Bitmap ([int]($w*$scale)),([int]($h*$scale))
$g=[System.Drawing.Graphics]::FromImage($o)
$g.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$g.PixelOffsetMode=[System.Drawing.Drawing2D.PixelOffsetMode]::Half
$g.DrawImage($b,(New-Object System.Drawing.Rectangle 0,0,([int]($w*$scale)),([int]($h*$scale))),(New-Object System.Drawing.Rectangle $x,$y,$w,$h),[System.Drawing.GraphicsUnit]::Pixel)
$o.Save($out,[System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose();$o.Dispose();$b.Dispose()
