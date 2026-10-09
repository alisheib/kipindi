param([string]$src, [int]$x0, [int]$x1, [int]$y0, [int]$y1, [int]$thr = 60, [switch]$rows)
# Ink extents: a pixel is ink when its luminance differs from the row-band's median background by more than $thr.
Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Bitmap]::FromFile($src)
$lum = { param($c) [int](0.2126 * $c.R + 0.7152 * $c.G + 0.0722 * $c.B) }
# background = luminance of the band's left-most column (assumed empty)
$bgs = @()
for ($y = $y0; $y -le $y1; $y++) { $bgs += & $lum $img.GetPixel($x0, $y) }
$bg = ($bgs | Sort-Object)[[int]($bgs.Count / 2)]
$minx = 99999; $maxx = -1; $miny = 99999; $maxy = -1
$rowHits = @{}
for ($y = $y0; $y -le $y1; $y++) {
  for ($x = $x0; $x -le $x1; $x++) {
    $l = & $lum $img.GetPixel($x, $y)
    if ([Math]::Abs($l - $bg) -gt $thr) {
      if ($x -lt $minx) { $minx = $x }; if ($x -gt $maxx) { $maxx = $x }
      if ($y -lt $miny) { $miny = $y }; if ($y -gt $maxy) { $maxy = $y }
      $rowHits[$y] = 1 + [int]$rowHits[$y]
    }
  }
}
$img.Dispose()
"bg=$bg ink x=$minx..$maxx y=$miny..$maxy centre=" + (($minx + $maxx + 1) / 2)
if ($rows) { $rowHits.Keys | Sort-Object | ForEach-Object { "  y$_ : $($rowHits[$_])" } }
