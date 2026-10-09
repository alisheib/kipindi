param([string]$Tile, [int]$TitleX0 = 18, [int]$TitleX1 = 240, [int]$XX0 = -1, [int]$XX1 = -1, [int]$ScanX = -1, [int]$Thr = 80)
# The guest sheet: the panel's top border (scan down the centre for the border ink), the grab, the title's ink bands
# and the close glyph's ink box, all against the panel's own fill.
Add-Type -AssemblyName System.Drawing
$b = [System.Drawing.Bitmap]::FromFile($Tile)
$W = $b.Width; $H = $b.Height
if ($ScanX -lt 0) { $ScanX = [int]($W / 2) }
$top = -1
for ($y = 200; $y -lt $H; $y++) { $p = $b.GetPixel($ScanX, $y); if ($p.R -ge 40 -and $p.G -ge 60 -and $p.B -ge 150) { $top = $y; break } }
"panel border y$top (scan x$ScanX)"
$fill = $b.GetPixel($ScanX, $top + 3); $fs = $fill.R + $fill.G + $fill.B
"fill {0},{1},{2}" -f $fill.R, $fill.G, $fill.B
# Title bands within the panel.
$band = $null
for ($y = $top + 2; $y -le [Math]::Min($top + 120, $H - 1); $y++) {
  $first = -1; $last = -1
  for ($x = $TitleX0; $x -le $TitleX1; $x++) { $p = $b.GetPixel($x, $y); if ([Math]::Abs(($p.R + $p.G + $p.B) - $fs) -gt $Thr) { if ($first -lt 0) { $first = $x }; $last = $x } }
  if ($first -ge 0) { if ($band -eq $null) { $band = @{ y0 = $y; f = $first; l = $last } } else { $band.f = [Math]::Min($band.f, $first); $band.l = [Math]::Max($band.l, $last) }; $band.y1 = $y }
  elseif ($band -ne $null) { "  title band y {0}-{1} x {2}..{3}" -f $band.y0, $band.y1, $band.f, $band.l; $band = $null }
}
if ($band -ne $null) { "  title band y {0}-{1} x {2}..{3}" -f $band.y0, $band.y1, $band.f, $band.l }
if ($XX0 -ge 0) {
  $minx = 99999; $maxx = -1; $miny = 99999; $maxy = -1
  for ($y = $top + 2; $y -le $top + 80; $y++) { for ($x = $XX0; $x -le $XX1; $x++) { $p = $b.GetPixel($x, $y); if ([Math]::Abs(($p.R + $p.G + $p.B) - $fs) -gt 60) { if ($x -lt $minx) { $minx = $x }; if ($x -gt $maxx) { $maxx = $x }; if ($y -lt $miny) { $miny = $y }; if ($y -gt $maxy) { $maxy = $y } } } }
  "  close ink x{0}-{1} y{2}-{3} centre y {4}" -f $minx, $maxx, $miny, $maxy, (($miny + $maxy) / 2)
}
$b.Dispose()
