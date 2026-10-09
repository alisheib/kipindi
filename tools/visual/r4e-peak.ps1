param([string]$Tile, [int]$X0, [int]$Y0, [int]$X1, [int]$Y1, [int]$Thr = 40)
# Ink box (vs the box's top-left background) and the brightest pixel inside a rectangle.
Add-Type -AssemblyName System.Drawing
$b = [System.Drawing.Bitmap]::FromFile($Tile)
$bg = $b.GetPixel($X0, $Y0); $bgs = $bg.R + $bg.G + $bg.B
$minx = 99999; $maxx = -1; $miny = 99999; $maxy = -1; $best = $null; $bests = -1
for ($y = $Y0; $y -le $Y1; $y++) { for ($x = $X0; $x -le $X1; $x++) {
  $p = $b.GetPixel($x, $y); $s = $p.R + $p.G + $p.B
  if ([Math]::Abs($s - $bgs) -gt $Thr) { if ($x -lt $minx) { $minx = $x }; if ($x -gt $maxx) { $maxx = $x }; if ($y -lt $miny) { $miny = $y }; if ($y -gt $maxy) { $maxy = $y } }
  if ($s -gt $bests) { $bests = $s; $best = "{0},{1},{2} at {3},{4}" -f $p.R, $p.G, $p.B, $x, $y }
} }
"bg {0},{1},{2}  ink x{3}-{4} y{5}-{6} (w{7} h{8} cy {9})  peak {10}" -f $bg.R, $bg.G, $bg.B, $minx, $maxx, $miny, $maxy, ($maxx - $minx + 1), ($maxy - $miny + 1), (($miny + $maxy) / 2), $best
$b.Dispose()
