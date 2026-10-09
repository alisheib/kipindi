Add-Type -AssemblyName System.Drawing
$global:T = 'C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/edges/tiles/'
function Open-Tile($n) { $f = Get-ChildItem $global:T -Filter "$n--*.png" | Select-Object -First 1; return [System.Drawing.Bitmap]::FromFile($f.FullName) }
function WhiteBox($b, $x0, $y0, $x1, $y1, $thr = 560) {
  $minx = 9999; $maxx = -1; $miny = 9999; $maxy = -1
  for ($y = $y0; $y -le $y1; $y++) { for ($x = $x0; $x -le $x1; $x++) { $c = $b.GetPixel($x, $y); if (($c.R + $c.G + $c.B) -gt $thr) { if ($x -lt $minx) { $minx = $x }; if ($x -gt $maxx) { $maxx = $x }; if ($y -lt $miny) { $miny = $y }; if ($y -gt $maxy) { $maxy = $y } } } }
  return "x$minx..$maxx y$miny..$maxy"
}
function InkBox($b, $x0, $y0, $x1, $y1, $bgx, $bgy, $thr = 40) {
  $bg = $b.GetPixel($bgx, $bgy); $minx = 9999; $maxx = -1; $miny = 9999; $maxy = -1
  for ($y = $y0; $y -le $y1; $y++) { for ($x = $x0; $x -le $x1; $x++) { $c = $b.GetPixel($x, $y); if (([math]::Abs($c.R - $bg.R) + [math]::Abs($c.G - $bg.G) + [math]::Abs($c.B - $bg.B)) -gt $thr) { if ($x -lt $minx) { $minx = $x }; if ($x -gt $maxx) { $maxx = $x }; if ($y -lt $miny) { $miny = $y }; if ($y -gt $maxy) { $maxy = $y } } } }
  return "x$minx..$maxx y$miny..$maxy"
}
function ScanRow($b, $y, $x0, $x1, $bgx, $thr = 40) {
  $bg = $b.GetPixel($bgx, $y); $prev = $false; $out = @()
  for ($x = $x0; $x -le $x1; $x++) { $c = $b.GetPixel($x, $y); $ink = ([math]::Abs($c.R - $bg.R) + [math]::Abs($c.G - $bg.G) + [math]::Abs($c.B - $bg.B)) -gt $thr; if ($ink -ne $prev) { $out += "$x" + $(if ($ink) { '+' } else { '-' }); $prev = $ink } }
  return ($out -join ' ')
}
function ScanCol($b, $x, $y0, $y1, $bgy, $thr = 40) {
  $bg = $b.GetPixel($x, $bgy); $prev = $false; $out = @()
  for ($y = $y0; $y -le $y1; $y++) { $c = $b.GetPixel($x, $y); $ink = ([math]::Abs($c.R - $bg.R) + [math]::Abs($c.G - $bg.G) + [math]::Abs($c.B - $bg.B)) -gt $thr; if ($ink -ne $prev) { $out += "$y" + $(if ($ink) { '+' } else { '-' }); $prev = $ink } }
  return ($out -join ' ')
}
function InkCols($b, $y0, $y1, $x0, $x1, $bgx, $thr = 60) {
  $bg = $b.GetPixel($bgx, $y0); $xs = @(); $prev = $false
  for ($x = $x0; $x -le $x1; $x++) { $ink = $false; for ($y = $y0; $y -le $y1; $y++) { $c = $b.GetPixel($x, $y); if (([math]::Abs($c.R - $bg.R) + [math]::Abs($c.G - $bg.G) + [math]::Abs($c.B - $bg.B)) -gt $thr) { $ink = $true; break } }; if ($ink -ne $prev) { $xs += "$x" + $(if ($ink) { '+' } else { '-' }); $prev = $ink } }
  return ($xs -join ' ')
}
function InkRows($b, $x0, $x1, $y0, $y1, $bgx, $thr = 60) {
  $ys = @(); $prev = $false
  for ($y = $y0; $y -le $y1; $y++) { $bg = $b.GetPixel($bgx, $y); $ink = $false; for ($x = $x0; $x -le $x1; $x++) { $c = $b.GetPixel($x, $y); if (([math]::Abs($c.R - $bg.R) + [math]::Abs($c.G - $bg.G) + [math]::Abs($c.B - $bg.B)) -gt $thr) { $ink = $true; break } }; if ($ink -ne $prev) { $ys += "$y" + $(if ($ink) { '+' } else { '-' }); $prev = $ink } }
  return ($ys -join ' ')
}
function Px($b, $x, $y) { $c = $b.GetPixel($x, $y); return "$($c.R),$($c.G),$($c.B)" }
function Crop($n, $x, $y, $w, $h, $scale, $name) {
  $b = Open-Tile $n
  $o = 'C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/edges/reader-e4-crops/'
  $nb = New-Object System.Drawing.Bitmap ($w * $scale), ($h * $scale); $g = [System.Drawing.Graphics]::FromImage($nb)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor; $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
  $g.DrawImage($b, (New-Object System.Drawing.Rectangle 0, 0, ($w * $scale), ($h * $scale)), (New-Object System.Drawing.Rectangle $x, $y, $w, $h), [System.Drawing.GraphicsUnit]::Pixel)
  $nb.Save($o + $name, [System.Drawing.Imaging.ImageFormat]::Png); $g.Dispose(); $nb.Dispose(); $b.Dispose()
}
