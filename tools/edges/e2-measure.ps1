Add-Type -AssemblyName System.Drawing
$global:TD = 'C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/edges/tiles'
function Open-Tile([string]$prefix) {
  $f = Get-ChildItem $global:TD -Filter "$prefix--*.png" | Select-Object -First 1
  return [System.Drawing.Bitmap]::FromFile($f.FullName)
}
function Px($b, $x, $y) { $c = $b.GetPixel($x, $y); return "$($c.R),$($c.G),$($c.B)" }
function CDiff($c1, $c2) { return [Math]::Abs($c1.R - $c2.R) + [Math]::Abs($c1.G - $c2.G) + [Math]::Abs($c1.B - $c2.B) }
# Runs of ink along a row y, from x0 to x1, against reference colour at (rx,ry) or given threshold
function RowRuns($b, $y, $x0, $x1, $bg, $th = 40, $gap = 1) {
  $runs = @(); $start = -1; $last = -1
  for ($x = $x0; $x -le $x1; $x++) {
    $c = $b.GetPixel($x, $y)
    if ((CDiff $c $bg) -gt $th) { if ($start -lt 0) { $start = $x }; $last = $x }
    elseif ($start -ge 0 -and ($x - $last) -gt $gap) { $runs += "$start-$last"; $start = -1 }
  }
  if ($start -ge 0) { $runs += "$start-$last" }
  return ($runs -join ' ')
}
function ColRuns($b, $x, $y0, $y1, $bg, $th = 40, $gap = 1) {
  $runs = @(); $start = -1; $last = -1
  for ($y = $y0; $y -le $y1; $y++) {
    $c = $b.GetPixel($x, $y)
    if ((CDiff $c $bg) -gt $th) { if ($start -lt 0) { $start = $y }; $last = $y }
    elseif ($start -ge 0 -and ($y - $last) -gt $gap) { $runs += "$start-$last"; $start = -1 }
  }
  if ($start -ge 0) { $runs += "$start-$last" }
  return ($runs -join ' ')
}
# Ink bounding box inside a rectangle against bg
function InkBox($b, $x0, $y0, $x1, $y1, $bg, $th = 40) {
  $minx = 99999; $miny = 99999; $maxx = -1; $maxy = -1
  for ($y = $y0; $y -le $y1; $y++) { for ($x = $x0; $x -le $x1; $x++) {
    $c = $b.GetPixel($x, $y)
    if ((CDiff $c $bg) -gt $th) { if ($x -lt $minx) { $minx = $x }; if ($x -gt $maxx) { $maxx = $x }; if ($y -lt $miny) { $miny = $y }; if ($y -gt $maxy) { $maxy = $y } }
  } }
  return "x$minx-$maxx y$miny-$maxy"
}
# Rows (y) in range containing any ink in x range â€” returns runs of rows
function InkRows($b, $x0, $x1, $y0, $y1, $bg, $th = 40, $step = 1) {
  $runs = @(); $start = -1; $last = -1
  for ($y = $y0; $y -le $y1; $y++) {
    $has = $false
    for ($x = $x0; $x -le $x1; $x += $step) { if ((CDiff $b.GetPixel($x, $y) $bg) -gt $th) { $has = $true; break } }
    if ($has) { if ($start -lt 0) { $start = $y }; $last = $y }
    elseif ($start -ge 0) { $runs += "$start-$last"; $start = -1 }
  }
  if ($start -ge 0) { $runs += "$start-$last" }
  return ($runs -join ' ')
}

function Crop($prefix, $x, $y, $w, $h, $scale = 3, $name = $null) {
  $b = Open-Tile $prefix
  $dst = New-Object System.Drawing.Bitmap ($w * $scale), ($h * $scale)
  $g = [System.Drawing.Graphics]::FromImage($dst)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
  $g.DrawImage($b, (New-Object System.Drawing.Rectangle 0, 0, ($w * $scale), ($h * $scale)), (New-Object System.Drawing.Rectangle $x, $y, $w, $h), [System.Drawing.GraphicsUnit]::Pixel)
  if (-not $name) { $name = "$prefix-$x-$y" }
  $out = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/edges/e2crop/$name.png"
  New-Item -ItemType Directory -Force (Split-Path $out) | Out-Null
  $dst.Save($out, [System.Drawing.Imaging.ImageFormat]::Png); $g.Dispose(); $dst.Dispose(); $b.Dispose()
  return $out
}
