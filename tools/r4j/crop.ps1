param([int]$seq, [int]$x, [int]$y, [int]$w, [int]$h, [int]$scale, [string]$out, [int]$grid = 0)
Add-Type -AssemblyName System.Drawing
$T = 'C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/edges/tiles'
$f = Get-ChildItem $T -Filter ("{0:D3}--*.png" -f $seq) | Select-Object -First 1
$src = [System.Drawing.Bitmap]::FromFile($f.FullName)
if ($x + $w -gt $src.Width) { $w = $src.Width - $x }
if ($y + $h -gt $src.Height) { $h = $src.Height - $y }
$dst = New-Object System.Drawing.Bitmap ($w * $scale), ($h * $scale)
$g = [System.Drawing.Graphics]::FromImage($dst)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
$g.DrawImage($src, (New-Object System.Drawing.Rectangle 0, 0, ($w * $scale), ($h * $scale)), (New-Object System.Drawing.Rectangle $x, $y, $w, $h), [System.Drawing.GraphicsUnit]::Pixel)
if ($grid -gt 0) {
  $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(110, 255, 255, 0)), 1
  $font = New-Object System.Drawing.Font 'Consolas', 9
  for ($gx = [Math]::Ceiling($x / $grid) * $grid; $gx -lt $x + $w; $gx += $grid) { $px = ($gx - $x) * $scale; $g.DrawLine($pen, $px, 0, $px, $h * $scale); $g.DrawString("$gx", $font, [System.Drawing.Brushes]::Yellow, $px + 1, 0) }
  for ($gy = [Math]::Ceiling($y / $grid) * $grid; $gy -lt $y + $h; $gy += $grid) { $py = ($gy - $y) * $scale; $g.DrawLine($pen, 0, $py, $w * $scale, $py); $g.DrawString("$gy", $font, [System.Drawing.Brushes]::Yellow, 0, $py + 1) }
}
$g.Dispose(); $src.Dispose()
$dst.Save($out, [System.Drawing.Imaging.ImageFormat]::Png); $dst.Dispose()
"saved $out"
