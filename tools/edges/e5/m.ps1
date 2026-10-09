Add-Type -AssemblyName System.Drawing
$global:T = 'C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/edges/tiles'
$global:O = 'C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/edges/e5'
$global:BM = @{}
function B($n) {
  $k = "$n"
  if (-not $global:BM.ContainsKey($k)) {
    $f = Get-ChildItem $global:T -Filter "$n--*.png" | Select-Object -First 1
    $global:BM[$k] = [System.Drawing.Bitmap]::FromFile($f.FullName)
  }
  return $global:BM[$k]
}
function Px($n, $x, $y) { $p = (B $n).GetPixel($x, $y); return "{0},{1},{2}" -f $p.R, $p.G, $p.B }
# print a column as compact list: y:R,G,B
function Col($n, $x, $y0, $y1) {
  $b = B $n; $s = New-Object System.Collections.Generic.List[string]
  for ($y = $y0; $y -le $y1; $y++) { $p = $b.GetPixel($x, $y); $s.Add(("{0}:{1},{2},{3}" -f $y, $p.R, $p.G, $p.B)) }
  "tile $n x=$x"; $s -join ' '
}
function Row($n, $y, $x0, $x1) {
  $b = B $n; $s = New-Object System.Collections.Generic.List[string]
  for ($x = $x0; $x -le $x1; $x++) { $p = $b.GetPixel($x, $y); $s.Add(("{0}:{1},{2},{3}" -f $x, $p.R, $p.G, $p.B)) }
  "tile $n y=$y"; $s -join ' '
}
# ink extents in a box: pixels whose |RGB - bg| sum > thr ; bg sampled at (bx,by)
function Ink($n, $x0, $y0, $x1, $y1, $bx, $by, $thr = 40) {
  $b = B $n; $bg = $b.GetPixel($bx, $by)
  $minx = 99999; $maxx = -1; $miny = 99999; $maxy = -1; $cnt = 0
  for ($y = $y0; $y -le $y1; $y++) { for ($x = $x0; $x -le $x1; $x++) {
    $p = $b.GetPixel($x, $y)
    $d = [math]::Abs($p.R - $bg.R) + [math]::Abs($p.G - $bg.G) + [math]::Abs($p.B - $bg.B)
    if ($d -gt $thr) { $cnt++; if ($x -lt $minx) { $minx = $x }; if ($x -gt $maxx) { $maxx = $x }; if ($y -lt $miny) { $miny = $y }; if ($y -gt $maxy) { $maxy = $y } }
  } }
  "tile $n ink in [$x0,$y0..$x1,$y1] bg($bx,$by)=$($bg.R),$($bg.G),$($bg.B): x $minx..$maxx  y $miny..$maxy  n=$cnt"
}
# rows containing ink (for line detection) in x-range
function InkRows($n, $x0, $x1, $y0, $y1, $bx, $by, $thr = 40) {
  $b = B $n; $bg = $b.GetPixel($bx, $by); $rows = @()
  for ($y = $y0; $y -le $y1; $y++) { $c = 0; for ($x = $x0; $x -le $x1; $x++) { $p = $b.GetPixel($x, $y); $d = [math]::Abs($p.R - $bg.R) + [math]::Abs($p.G - $bg.G) + [math]::Abs($p.B - $bg.B); if ($d -gt $thr) { $c++ } }; if ($c -gt 0) { $rows += "${y}($c)" } }
  "tile $n inkrows x[$x0..$x1]: " + ($rows -join ' ')
}
function InkCols($n, $y0, $y1, $x0, $x1, $bx, $by, $thr = 40) {
  $b = B $n; $bg = $b.GetPixel($bx, $by); $cols = @()
  for ($x = $x0; $x -le $x1; $x++) { $c = 0; for ($y = $y0; $y -le $y1; $y++) { $p = $b.GetPixel($x, $y); $d = [math]::Abs($p.R - $bg.R) + [math]::Abs($p.G - $bg.G) + [math]::Abs($p.B - $bg.B); if ($d -gt $thr) { $c++ } }; if ($c -gt 0) { $cols += "${x}($c)" } }
  "tile $n inkcols y[$y0..$y1]: " + ($cols -join ' ')
}
function Crop($n, $x, $y, $w, $h, $s, $name) {
  $b = B $n
  $crop = $b.Clone((New-Object System.Drawing.Rectangle $x, $y, $w, $h), $b.PixelFormat)
  $big = New-Object System.Drawing.Bitmap ($w * $s), ($h * $s)
  $g = [System.Drawing.Graphics]::FromImage($big); $g.InterpolationMode = 'NearestNeighbor'; $g.PixelOffsetMode = 'Half'
  $g.DrawImage($crop, 0, 0, $w * $s, $h * $s); $big.Save("$global:O/$name.png"); $g.Dispose(); $big.Dispose(); $crop.Dispose()
}
