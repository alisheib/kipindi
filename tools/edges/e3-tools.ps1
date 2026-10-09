Add-Type -AssemblyName System.Drawing
$global:T = 'C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/edges/tiles'
$global:Z = 'C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/edges/e3-zoom'
if (-not (Test-Path $global:Z)) { New-Item -ItemType Directory -Force $global:Z | Out-Null }

function Get-Tile([int]$seq) {
  $f = Get-ChildItem $global:T -Filter ("{0:D3}--*.png" -f $seq) | Select-Object -First 1
  return $f.FullName
}

# Crop a region and scale it up (nearest neighbour) to a PNG in the zoom folder.
function Crop([int]$seq, [int]$x, [int]$y, [int]$w, [int]$h, [int]$scale = 3, [string]$name = '') {
  $src = [System.Drawing.Bitmap]::FromFile((Get-Tile $seq))
  if ($x + $w -gt $src.Width) { $w = $src.Width - $x }
  if ($y + $h -gt $src.Height) { $h = $src.Height - $y }
  $dst = New-Object System.Drawing.Bitmap ($w * $scale), ($h * $scale)
  $g = [System.Drawing.Graphics]::FromImage($dst)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
  $g.DrawImage($src, (New-Object System.Drawing.Rectangle 0, 0, ($w * $scale), ($h * $scale)), (New-Object System.Drawing.Rectangle $x, $y, $w, $h), [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose(); $src.Dispose()
  if ($name -eq '') { $name = "z$seq-$x-$y-$w-$h.png" }
  $out = Join-Path $global:Z $name
  $dst.Save($out, [System.Drawing.Imaging.ImageFormat]::Png); $dst.Dispose()
  return $out
}

function Px([int]$seq, [int]$x, [int]$y) {
  $b = [System.Drawing.Bitmap]::FromFile((Get-Tile $seq)); $c = $b.GetPixel($x, $y); $b.Dispose()
  return "($x,$y)=$($c.R),$($c.G),$($c.B)"
}

# Ink extents inside a box: pixels differing from bg (the pixel at bx,by) by more than thr in R+G+B.
function Ink([int]$seq, [int]$x0, [int]$y0, [int]$x1, [int]$y1, [int]$bx = -1, [int]$by = -1, [int]$thr = 40) {
  $b = [System.Drawing.Bitmap]::FromFile((Get-Tile $seq))
  if ($bx -lt 0) { $bx = $x0; $by = $y0 }
  $bg = $b.GetPixel($bx, $by)
  $minx = 99999; $miny = 99999; $maxx = -1; $maxy = -1
  for ($y = $y0; $y -le $y1; $y++) { for ($x = $x0; $x -le $x1; $x++) {
    $c = $b.GetPixel($x, $y)
    $d = [Math]::Abs($c.R - $bg.R) + [Math]::Abs($c.G - $bg.G) + [Math]::Abs($c.B - $bg.B)
    if ($d -gt $thr) { if ($x -lt $minx) { $minx = $x }; if ($x -gt $maxx) { $maxx = $x }; if ($y -lt $miny) { $miny = $y }; if ($y -gt $maxy) { $maxy = $y } }
  } }
  $b.Dispose()
  return "ink x$minx-$maxx y$miny-$maxy (bg $($bg.R),$($bg.G),$($bg.B) @ $bx,$by)"
}

# Rows (y) in a column band that hold ink, collapsed into runs.
function RowRuns([int]$seq, [int]$x0, [int]$x1, [int]$y0, [int]$y1, [int]$bx, [int]$by, [int]$thr = 40) {
  $b = [System.Drawing.Bitmap]::FromFile((Get-Tile $seq)); $bg = $b.GetPixel($bx, $by)
  $runs = @(); $start = -1
  for ($y = $y0; $y -le $y1; $y++) {
    $has = $false
    for ($x = $x0; $x -le $x1; $x++) { $c = $b.GetPixel($x, $y); $d = [Math]::Abs($c.R - $bg.R) + [Math]::Abs($c.G - $bg.G) + [Math]::Abs($c.B - $bg.B); if ($d -gt $thr) { $has = $true; break } }
    if ($has -and $start -lt 0) { $start = $y }
    if (-not $has -and $start -ge 0) { $runs += "y$start-$($y-1)"; $start = -1 }
  }
  if ($start -ge 0) { $runs += "y$start-$y1" }
  $b.Dispose(); return ($runs -join ' ')
}

# Columns (x) in a row band that hold ink, collapsed into runs (gap tolerance g).
function ColRuns([int]$seq, [int]$x0, [int]$x1, [int]$y0, [int]$y1, [int]$bx, [int]$by, [int]$thr = 40, [int]$gap = 0) {
  $b = [System.Drawing.Bitmap]::FromFile((Get-Tile $seq)); $bg = $b.GetPixel($bx, $by)
  $runs = @(); $start = -1; $last = -1
  for ($x = $x0; $x -le $x1; $x++) {
    $has = $false
    for ($y = $y0; $y -le $y1; $y++) { $c = $b.GetPixel($x, $y); $d = [Math]::Abs($c.R - $bg.R) + [Math]::Abs($c.G - $bg.G) + [Math]::Abs($c.B - $bg.B); if ($d -gt $thr) { $has = $true; break } }
    if ($has) { if ($start -lt 0) { $start = $x }; $last = $x }
    elseif ($start -ge 0 -and ($x - $last) -gt $gap) { $runs += "x$start-$last"; $start = -1 }
  }
  if ($start -ge 0) { $runs += "x$start-$last" }
  $b.Dispose(); return ($runs -join ' ')
}

# A row of pixel colours (every step px).
function RowColors([int]$seq, [int]$y, [int]$x0, [int]$x1, [int]$step = 1) {
  $b = [System.Drawing.Bitmap]::FromFile((Get-Tile $seq)); $o = @()
  for ($x = $x0; $x -le $x1; $x += $step) { $c = $b.GetPixel($x, $y); $o += "$x=$($c.R),$($c.G),$($c.B)" }
  $b.Dispose(); return ($o -join ' ')
}
function ColColors([int]$seq, [int]$x, [int]$y0, [int]$y1, [int]$step = 1) {
  $b = [System.Drawing.Bitmap]::FromFile((Get-Tile $seq)); $o = @()
  for ($y = $y0; $y -le $y1; $y += $step) { $c = $b.GetPixel($x, $y); $o += "$y=$($c.R),$($c.G),$($c.B)" }
  $b.Dispose(); return ($o -join ' ')
}
