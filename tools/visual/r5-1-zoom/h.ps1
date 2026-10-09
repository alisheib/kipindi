Add-Type -AssemblyName System.Drawing
$global:T = 'C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/visual/tiles-r5'
$global:T4 = 'C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/visual/tiles-r4'
$global:Z = 'C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/visual/r5-1-zoom'

function Get-Tile([string]$seq, [string]$dir = $global:T) {
  $f = Get-ChildItem $dir -Filter "$seq--*.png" | Where-Object { $_.Name -notmatch '--diff' } | Select-Object -First 1
  return [System.Drawing.Bitmap]::FromFile($f.FullName)
}

# Crop a region and scale it up (nearest neighbour) into the zoom folder
function Zoom([string]$seq, [int]$x, [int]$y, [int]$w, [int]$h, [int]$s = 4, [string]$tag = 'z', [string]$dir = $global:T) {
  $b = Get-Tile $seq $dir
  if ($x + $w -gt $b.Width) { $w = $b.Width - $x }
  if ($y + $h -gt $b.Height) { $h = $b.Height - $y }
  $o = New-Object System.Drawing.Bitmap ($w * $s), ($h * $s)
  $g = [System.Drawing.Graphics]::FromImage($o)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
  $g.DrawImage($b, (New-Object System.Drawing.Rectangle 0, 0, ($w * $s), ($h * $s)), (New-Object System.Drawing.Rectangle $x, $y, $w, $h), [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()
  $p = Join-Path $global:Z ("{0}-{1}.png" -f $seq, $tag)
  $o.Save($p, [System.Drawing.Imaging.ImageFormat]::Png)
  $o.Dispose(); $b.Dispose()
  return $p
}

function Px($b, [int]$x, [int]$y) { $c = $b.GetPixel($x, $y); return "{0},{1},{2}" -f $c.R, $c.G, $c.B }

# Ink runs along a row: pixels whose RGB sum differs from the reference by > thr
function RowRuns($b, [int]$y, [int]$x0 = 0, [int]$x1 = -1, [int]$thr = 40, $ref = $null) {
  if ($x1 -lt 0) { $x1 = $b.Width - 1 }
  if ($null -eq $ref) { $ref = $b.GetPixel($x0, $y) }
  $runs = @(); $in = $false; $st = 0
  for ($x = $x0; $x -le $x1; $x++) {
    $c = $b.GetPixel($x, $y)
    $d = [Math]::Abs(($c.R + $c.G + $c.B) - ($ref.R + $ref.G + $ref.B))
    $ink = $d -gt $thr
    if ($ink -and -not $in) { $in = $true; $st = $x }
    if (-not $ink -and $in) { $in = $false; $runs += ("{0}-{1}" -f $st, ($x - 1)) }
  }
  if ($in) { $runs += ("{0}-{1}" -f $st, $x1) }
  return ($runs -join ' ')
}

function ColRuns($b, [int]$x, [int]$y0 = 0, [int]$y1 = -1, [int]$thr = 40, $ref = $null) {
  if ($y1 -lt 0) { $y1 = $b.Height - 1 }
  if ($null -eq $ref) { $ref = $b.GetPixel($x, $y0) }
  $runs = @(); $in = $false; $st = 0
  for ($y = $y0; $y -le $y1; $y++) {
    $c = $b.GetPixel($x, $y)
    $d = [Math]::Abs(($c.R + $c.G + $c.B) - ($ref.R + $ref.G + $ref.B))
    $ink = $d -gt $thr
    if ($ink -and -not $in) { $in = $true; $st = $y }
    if (-not $ink -and $in) { $in = $false; $runs += ("{0}-{1}" -f $st, ($y - 1)) }
  }
  if ($in) { $runs += ("{0}-{1}" -f $st, $y1) }
  return ($runs -join ' ')
}

# Ink extent inside a box: rows/cols that hold any pixel differing from ref by > thr
function InkBox($b, [int]$x0, [int]$y0, [int]$x1, [int]$y1, [int]$thr = 40, $ref = $null) {
  if ($null -eq $ref) { $ref = $b.GetPixel($x0, $y0) }
  $rs = $ref.R + $ref.G + $ref.B
  $minx = 99999; $maxx = -1; $miny = 99999; $maxy = -1
  for ($y = $y0; $y -le $y1; $y++) {
    for ($x = $x0; $x -le $x1; $x++) {
      $c = $b.GetPixel($x, $y)
      if ([Math]::Abs(($c.R + $c.G + $c.B) - $rs) -gt $thr) {
        if ($x -lt $minx) { $minx = $x }; if ($x -gt $maxx) { $maxx = $x }
        if ($y -lt $miny) { $miny = $y }; if ($y -gt $maxy) { $maxy = $y }
      }
    }
  }
  return "x{0}-{1} y{2}-{3}" -f $minx, $maxx, $miny, $maxy
}

# Row profile: for each y in range, list first and last ink x (vs ref) within x0..x1
function RowProfile($b, [int]$y0, [int]$y1, [int]$x0, [int]$x1, [int]$thr = 40, $ref = $null) {
  if ($null -eq $ref) { $ref = $b.GetPixel($x0, $y0) }
  $rs = $ref.R + $ref.G + $ref.B
  $out = @()
  for ($y = $y0; $y -le $y1; $y++) {
    $f = -1; $l = -1; $n = 0
    for ($x = $x0; $x -le $x1; $x++) {
      $c = $b.GetPixel($x, $y)
      if ([Math]::Abs(($c.R + $c.G + $c.B) - $rs) -gt $thr) { if ($f -lt 0) { $f = $x }; $l = $x; $n++ }
    }
    if ($n -gt 0) { $out += ("y{0}: {1}-{2} n{3}" -f $y, $f, $l, $n) }
  }
  return ($out -join "`n")
}

# Zoom with contrast boost: out = clamp(128 + (c - ref) * k) per channel
function ZoomBoost([string]$seq, [int]$x, [int]$y, [int]$w, [int]$h, [int]$s = 3, [double]$k = 4, [string]$tag = 'zb', [string]$dir = $global:T, $ref = $null) {
  $b = Get-Tile $seq $dir
  if ($x + $w -gt $b.Width) { $w = $b.Width - $x }
  if ($y + $h -gt $b.Height) { $h = $b.Height - $y }
  if ($null -eq $ref) { $ref = $b.GetPixel($x, $y) }
  $o = New-Object System.Drawing.Bitmap ($w * $s), ($h * $s)
  for ($yy = 0; $yy -lt $h; $yy++) {
    for ($xx = 0; $xx -lt $w; $xx++) {
      $c = $b.GetPixel($x + $xx, $y + $yy)
      $r = [Math]::Max(0, [Math]::Min(255, [int](128 + ($c.R - $ref.R) * $k)))
      $g2 = [Math]::Max(0, [Math]::Min(255, [int](128 + ($c.G - $ref.G) * $k)))
      $bl = [Math]::Max(0, [Math]::Min(255, [int](128 + ($c.B - $ref.B) * $k)))
      $col = [System.Drawing.Color]::FromArgb($r, $g2, $bl)
      for ($i = 0; $i -lt $s; $i++) { for ($j = 0; $j -lt $s; $j++) { $o.SetPixel($xx * $s + $i, $yy * $s + $j, $col) } }
    }
  }
  $p = Join-Path $global:Z ("{0}-{1}.png" -f $seq, $tag)
  $o.Save($p, [System.Drawing.Imaging.ImageFormat]::Png)
  $o.Dispose(); $b.Dispose()
  return $p
}

# Blocks of consecutive ink rows within x0..x1 (vs ref), with max ink count per block
function Blocks($b, [int]$x0, [int]$x1, [int]$y0, [int]$y1, [int]$thr = 30, $ref = $null) {
  if ($null -eq $ref) { $ref = $b.GetPixel($x0, $y0) }
  $rs = $ref.R + $ref.G + $ref.B
  $out = @(); $in = $false; $st = 0; $mx = 0; $mnx = 99999; $mxx = -1
  for ($y = $y0; $y -le $y1; $y++) {
    $n = 0; $f = -1; $l = -1
    for ($x = $x0; $x -le $x1; $x++) { $c = $b.GetPixel($x, $y); if ([Math]::Abs(($c.R + $c.G + $c.B) - $rs) -gt $thr) { $n++; if ($f -lt 0) { $f = $x }; $l = $x } }
    if ($n -gt 0) {
      if (-not $in) { $in = $true; $st = $y; $mx = 0; $mnx = 99999; $mxx = -1 }
      if ($n -gt $mx) { $mx = $n }; if ($f -lt $mnx) { $mnx = $f }; if ($l -gt $mxx) { $mxx = $l }
    } elseif ($in) { $in = $false; $out += ("y{0}-{1} x{2}-{3} max{4}" -f $st, ($y - 1), $mnx, $mxx, $mx) }
  }
  if ($in) { $out += ("y{0}-{1} x{2}-{3} max{4}" -f $st, $y1, $mnx, $mxx, $mx) }
  return ($out -join ' | ')
}

# Blocks where each row's reference is the pixel at (refx, y) (handles vertical gradients)
function BlocksRowRef($b, [int]$x0, [int]$x1, [int]$y0, [int]$y1, [int]$refx, [int]$thr = 30) {
  $out = @(); $in = $false; $st = 0; $mx = 0; $mnx = 99999; $mxx = -1
  for ($y = $y0; $y -le $y1; $y++) {
    $ref = $b.GetPixel($refx, $y); $rs = $ref.R + $ref.G + $ref.B
    $n = 0; $f = -1; $l = -1
    for ($x = $x0; $x -le $x1; $x++) { $c = $b.GetPixel($x, $y); if ([Math]::Abs(($c.R + $c.G + $c.B) - $rs) -gt $thr) { $n++; if ($f -lt 0) { $f = $x }; $l = $x } }
    if ($n -gt 0) {
      if (-not $in) { $in = $true; $st = $y; $mx = 0; $mnx = 99999; $mxx = -1 }
      if ($n -gt $mx) { $mx = $n }; if ($f -lt $mnx) { $mnx = $f }; if ($l -gt $mxx) { $mxx = $l }
    } elseif ($in) { $in = $false; $out += ("y{0}-{1} x{2}-{3} max{4}" -f $st, ($y - 1), $mnx, $mxx, $mx) }
  }
  if ($in) { $out += ("y{0}-{1} x{2}-{3} max{4}" -f $st, $y1, $mnx, $mxx, $mx) }
  return ($out -join ' | ')
}

function RightEdge($bb, $y0, $y1, $xa, $xb, $refx, $thr = 40) { $l=-1; for($y=$y0;$y -le $y1;$y++){ $r=$bb.GetPixel($refx,$y); $rs=$r.R+$r.G+$r.B; for($x=$xb;$x -ge $xa;$x--){ $c=$bb.GetPixel($x,$y); if([Math]::Abs(($c.R+$c.G+$c.B)-$rs) -gt $thr){ if($x -gt $l){$l=$x}; break } } }; return $l }
function LeftEdge($bb, $y0, $y1, $xa, $xb, $refx, $thr = 40) { $f=99999; for($y=$y0;$y -le $y1;$y++){ $r=$bb.GetPixel($refx,$y); $rs=$r.R+$r.G+$r.B; for($x=$xa;$x -le $xb;$x++){ $c=$bb.GetPixel($x,$y); if([Math]::Abs(($c.R+$c.G+$c.B)-$rs) -gt $thr){ if($x -lt $f){$f=$x}; break } } }; return $f }
