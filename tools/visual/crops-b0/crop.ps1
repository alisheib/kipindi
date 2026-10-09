param([string]$tile,[int]$x,[int]$y,[int]$w,[int]$h,[int]$scale=3,[string]$out,[string]$dir='tiles-m')
Add-Type -AssemblyName System.Drawing
$S='C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad'
if ($dir -eq 'tiles-h') { $src = "$S\wp12\tiles-h\$tile" } else { $src = "$S\visual\$dir\$tile" }
$b=[System.Drawing.Bitmap]::FromFile($src)
$o=New-Object System.Drawing.Bitmap ($w*$scale), ($h*$scale)
$g=[System.Drawing.Graphics]::FromImage($o)
$g.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$g.PixelOffsetMode=[System.Drawing.Drawing2D.PixelOffsetMode]::Half
$g.DrawImage($b,(New-Object System.Drawing.Rectangle 0,0,($w*$scale),($h*$scale)),(New-Object System.Drawing.Rectangle $x,$y,$w,$h),[System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose(); $o.Save("$S\visual\crops-b0\$out",[System.Drawing.Imaging.ImageFormat]::Png); $o.Dispose(); $b.Dispose()
"$S\visual\crops-b0\$out"
