Add-Type -AssemblyName System.Drawing
$T = 'C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/edges/tiles'
function Tile([int]$seq) { (Get-ChildItem $T -Filter ("{0:D3}--*.png" -f $seq) | Select-Object -First 1).FullName }

# Distinct colours and ink (pixels off the band's dominant colour by > thr) in a band.
function Band([System.Drawing.Bitmap]$b, [int]$x0, [int]$y0, [int]$x1, [int]$y1, [int]$thr = 60) {
  $hist = @{}
  for ($y = $y0; $y -le $y1; $y += 1) { for ($x = $x0; $x -le $x1; $x += 1) { $c = $b.GetPixel($x, $y); $k = ($c.R -shl 16) -bor ($c.G -shl 8) -bor $c.B; $hist[$k] = 1 + [int]$hist[$k] } }
  $dom = ($hist.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 1).Key
  $dr = ($dom -shr 16) -band 255; $dg = ($dom -shr 8) -band 255; $db = $dom -band 255
  $ink = 0; $minx = 99999; $maxx = -1; $miny = 99999; $maxy = -1
  for ($y = $y0; $y -le $y1; $y++) { for ($x = $x0; $x -le $x1; $x++) {
    $c = $b.GetPixel($x, $y); $d = [Math]::Abs($c.R - $dr) + [Math]::Abs($c.G - $dg) + [Math]::Abs($c.B - $db)
    if ($d -gt $thr) { $ink++; if ($x -lt $minx) { $minx = $x }; if ($x -gt $maxx) { $maxx = $x }; if ($y -lt $miny) { $miny = $y }; if ($y -gt $maxy) { $maxy = $y } }
  } }
  return [pscustomobject]@{ colours = $hist.Count; dominant = "$dr,$dg,$db"; ink = $ink; box = $(if ($ink -gt 0) { "x$minx-$maxx y$miny-$maxy" } else { "-" }) }
}

$mode = $args[0]
if ($mode -eq 'e36') {
  foreach ($s in @(277,280,287,290,293,296,299,304,311,318,323,326,331,334,339,342, 278,281,288,291,294,297,300,305,312,319,324,327,332,335,340,343)) {
    $f = Tile $s; $b = [System.Drawing.Bitmap]::FromFile($f); $W = $b.Width; $H = $b.Height
    $hdr = Band $b 0 0 ($W - 1) 54
    $rail = if ($W -lt 1024) { Band $b 0 ($H - 64) ($W - 1) ($H - 1) } else { $null }
    $name = Split-Path $f -Leaf
    "{0}  header y0-54: {1} colours, ink {2} px {3} | rail: {4}" -f $name, $hdr.colours, $hdr.ink, $hdr.box, $(if ($rail) { "$($rail.colours) colours, ink $($rail.ink) px $($rail.box)" } else { 'n/a (1280)' })
    $b.Dispose()
  }
}
if ($mode -eq 'e41') {
  foreach ($s in @(328, 327, 336)) { $f = Tile $s; $b = [System.Drawing.Bitmap]::FromFile($f); $all = Band $b 0 0 ($b.Width - 1) ($b.Height - 1); "{0}: {1} colours over {2} px, dominant {3}, ink {4}" -f (Split-Path $f -Leaf), $all.colours, ($b.Width * $b.Height), $all.dominant, $all.ink; $b.Dispose() }
}
if ($mode -eq 'rows') {
  # ink row runs in a column band: seq x0 x1 y0 y1
  $s = [int]$args[1]; $x0 = [int]$args[2]; $x1 = [int]$args[3]; $y0 = [int]$args[4]; $y1 = [int]$args[5]; $thr = if ($args.Count -gt 6) { [int]$args[6] } else { 90 }
  $f = Tile $s; $b = [System.Drawing.Bitmap]::FromFile($f); $bg = $b.GetPixel($x0, $y0)
  $runs = @(); $start = -1
  for ($y = $y0; $y -le $y1; $y++) {
    $has = $false; $mx = 0
    for ($x = $x0; $x -le $x1; $x++) { $c = $b.GetPixel($x, $y); $d = [Math]::Abs($c.R - $bg.R) + [Math]::Abs($c.G - $bg.G) + [Math]::Abs($c.B - $bg.B); if ($d -gt $thr) { $has = $true } }
    if ($has -and $start -lt 0) { $start = $y }
    if (-not $has -and $start -ge 0) { $runs += "y$start-$($y-1)"; $start = -1 }
  }
  if ($start -ge 0) { $runs += "y$start-$y1" }
  "{0} x{1}-{2}: {3}" -f (Split-Path $f -Leaf), $x0, $x1, ($runs -join ' ')
  $b.Dispose()
}
if ($mode -eq 'cols') {
  $s = [int]$args[1]; $x0 = [int]$args[2]; $x1 = [int]$args[3]; $y0 = [int]$args[4]; $y1 = [int]$args[5]; $thr = if ($args.Count -gt 6) { [int]$args[6] } else { 90 }
  $f = Tile $s; $b = [System.Drawing.Bitmap]::FromFile($f); $bg = $b.GetPixel($x0, $y0)
  $runs = @(); $start = -1
  for ($x = $x0; $x -le $x1; $x++) {
    $has = $false
    for ($y = $y0; $y -le $y1; $y++) { $c = $b.GetPixel($x, $y); $d = [Math]::Abs($c.R - $bg.R) + [Math]::Abs($c.G - $bg.G) + [Math]::Abs($c.B - $bg.B); if ($d -gt $thr) { $has = $true; break } }
    if ($has -and $start -lt 0) { $start = $x }
    if (-not $has -and $start -ge 0) { $runs += "x$start-$($x-1)"; $start = -1 }
  }
  if ($start -ge 0) { $runs += "x$start-$x1" }
  "{0} y{1}-{2}: {3}" -f (Split-Path $f -Leaf), $y0, $y1, ($runs -join ' ')
  $b.Dispose()
}
if ($mode -eq 'px') {
  $s = [int]$args[1]; $f = Tile $s; $b = [System.Drawing.Bitmap]::FromFile($f)
  for ($i = 2; $i -lt $args.Count; $i += 2) { $x = [int]$args[$i]; $y = [int]$args[$i + 1]; $c = $b.GetPixel($x, $y); "($x,$y)=$($c.R),$($c.G),$($c.B)" }
  $b.Dispose()
}
if ($mode -eq 'max') {
  $s = [int]$args[1]; $x0 = [int]$args[2]; $x1 = [int]$args[3]; $y0 = [int]$args[4]; $y1 = [int]$args[5]
  $f = Tile $s; $b = [System.Drawing.Bitmap]::FromFile($f); $best = -1; $at = ''
  for ($y = $y0; $y -le $y1; $y++) { for ($x = $x0; $x -le $x1; $x++) { $c = $b.GetPixel($x, $y); $v = $c.R + $c.G + $c.B; if ($v -gt $best) { $best = $v; $at = "($x,$y)=$($c.R),$($c.G),$($c.B)" } } }
  "{0} brightest in x{1}-{2} y{3}-{4}: {5}" -f (Split-Path $f -Leaf), $x0, $x1, $y0, $y1, $at
  $b.Dispose()
}
