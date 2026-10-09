Add-Type -AssemblyName System.Drawing
$global:TM = 'C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\visual\tiles-m'
$global:TH = 'C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles-h'
function Load-Img($name, $dir = $global:TM) {
  $p = Join-Path $dir $name
  $b = [System.Drawing.Bitmap]::FromFile($p)
  $rect = New-Object System.Drawing.Rectangle 0, 0, $b.Width, $b.Height
  $d = $b.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $bytes = New-Object byte[] ($d.Stride * $b.Height)
  [System.Runtime.InteropServices.Marshal]::Copy($d.Scan0, $bytes, 0, $bytes.Length)
  $o = [pscustomobject]@{ W = $b.Width; H = $b.Height; S = $d.Stride; B = $bytes }
  $b.UnlockBits($d); $b.Dispose()
  return $o
}
Remove-Item alias:P -ErrorAction SilentlyContinue
function P($img, $x, $y) { $i = $y * $img.S + $x * 3; return @($img.B[$i + 2], $img.B[$i + 1], $img.B[$i]) }
function PX($img, $x, $y) { $p = P $img $x $y; return ('{0},{1},{2}' -f $p[0], $p[1], $p[2]) }
function D($a, $c) { return [math]::Abs($a[0] - $c[0]) + [math]::Abs($a[1] - $c[1]) + [math]::Abs($a[2] - $c[2]) }
# runs along a row where pixel differs from bg (bg = given rgb array or sampled at (bx,by))
function Row($img, $y, $x0, $x1, $bg, $t = 40) {
  $runs = @(); $start = -1
  for ($x = $x0; $x -le $x1; $x++) {
    $ink = (D (P $img $x $y) $bg) -gt $t
    if ($ink -and $start -lt 0) { $start = $x }
    if (-not $ink -and $start -ge 0) { $runs += "$start-$($x-1)"; $start = -1 }
  }
  if ($start -ge 0) { $runs += "$start-$x1" }
  return ($runs -join ' ')
}
function Col($img, $x, $y0, $y1, $bg, $t = 40) {
  $runs = @(); $start = -1
  for ($y = $y0; $y -le $y1; $y++) {
    $ink = (D (P $img $x $y) $bg) -gt $t
    if ($ink -and $start -lt 0) { $start = $y }
    if (-not $ink -and $start -ge 0) { $runs += "$start-$($y-1)"; $start = -1 }
  }
  if ($start -ge 0) { $runs += "$start-$y1" }
  return ($runs -join ' ')
}
# bounding box of ink inside rect
function Box($img, $x0, $y0, $x1, $y1, $bg, $t = 40) {
  $mnx = 99999; $mxx = -1; $mny = 99999; $mxy = -1
  for ($y = $y0; $y -le $y1; $y++) { for ($x = $x0; $x -le $x1; $x++) {
    if ((D (P $img $x $y) $bg) -gt $t) { if ($x -lt $mnx) { $mnx = $x }; if ($x -gt $mxx) { $mxx = $x }; if ($y -lt $mny) { $mny = $y }; if ($y -gt $mxy) { $mxy = $y } }
  } }
  return "x $mnx-$mxx  y $mny-$mxy"
}
# rows (y ranges) in rect that contain ink: horizontal projection
function RowsInk($img, $x0, $y0, $x1, $y1, $bg, $t = 40) {
  $runs = @(); $start = -1
  for ($y = $y0; $y -le $y1; $y++) {
    $ink = $false
    for ($x = $x0; $x -le $x1; $x++) { if ((D (P $img $x $y) $bg) -gt $t) { $ink = $true; break } }
    if ($ink -and $start -lt 0) { $start = $y }
    if (-not $ink -and $start -ge 0) { $runs += "$start-$($y-1)"; $start = -1 }
  }
  if ($start -ge 0) { $runs += "$start-$y1" }
  return ($runs -join ' ')
}
# columns (x ranges) in rect that contain ink: vertical projection
function ColsInk($img, $x0, $y0, $x1, $y1, $bg, $t = 40) {
  $runs = @(); $start = -1
  for ($x = $x0; $x -le $x1; $x++) {
    $ink = $false
    for ($y = $y0; $y -le $y1; $y++) { if ((D (P $img $x $y) $bg) -gt $t) { $ink = $true; break } }
    if ($ink -and $start -lt 0) { $start = $x }
    if (-not $ink -and $start -ge 0) { $runs += "$start-$($x-1)"; $start = -1 }
  }
  if ($start -ge 0) { $runs += "$start-$x1" }
  return ($runs -join ' ')
}
function Crop($name, $x, $y, $w, $h, $scale, $out, $dir = $global:TM) {
  $src = [System.Drawing.Bitmap]::FromFile((Join-Path $dir $name))
  $dst = New-Object System.Drawing.Bitmap ($w * $scale), ($h * $scale)
  $g = [System.Drawing.Graphics]::FromImage($dst)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
  $g.DrawImage($src, (New-Object System.Drawing.Rectangle 0, 0, ($w * $scale), ($h * $scale)), (New-Object System.Drawing.Rectangle $x, $y, $w, $h), [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose(); $dst.Save($out, [System.Drawing.Imaging.ImageFormat]::Png); $dst.Dispose(); $src.Dispose()
}
