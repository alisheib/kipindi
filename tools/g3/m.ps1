param([string]$seq, [int]$y0, [int]$y1, [int]$x0 = 0, [int]$x1 = -1, [int]$thr = 120, [string]$mode = 'cols')
Add-Type -AssemblyName System.Drawing
$d = 'C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles-h'
$f = Get-ChildItem $d -Filter "$seq--*"
$b = [System.Drawing.Bitmap]::FromFile($f.FullName)
if ($x1 -lt 0) { $x1 = $b.Width - 1 }
function L($c) { return [int](0.299 * $c.R + 0.587 * $c.G + 0.114 * $c.B) }
if ($mode -eq 'cols') {
  # report runs of columns that contain a pixel brighter than thr within [y0,y1]
  $runs = @(); $in = $false; $s = 0
  for ($x = $x0; $x -le $x1; $x++) {
    $hit = $false
    for ($y = $y0; $y -le $y1; $y++) { if ((L $b.GetPixel($x, $y)) -gt $thr) { $hit = $true; break } }
    if ($hit -and -not $in) { $in = $true; $s = $x }
    if (-not $hit -and $in) { $in = $false; $runs += "$s-$($x-1)" }
  }
  if ($in) { $runs += "$s-$x1" }
  "cols: " + ($runs -join ' ')
} elseif ($mode -eq 'rows') {
  $runs = @(); $in = $false; $s = 0
  for ($y = $y0; $y -le $y1; $y++) {
    $hit = $false
    for ($x = $x0; $x -le $x1; $x++) { if ((L $b.GetPixel($x, $y)) -gt $thr) { $hit = $true; break } }
    if ($hit -and -not $in) { $in = $true; $s = $y }
    if (-not $hit -and $in) { $in = $false; $runs += "$s-$($y-1)" }
  }
  if ($in) { $runs += "$s-$y1" }
  "rows: " + ($runs -join ' ')
} elseif ($mode -eq 'px') {
  for ($x = $x0; $x -le $x1; $x++) { $c = $b.GetPixel($x, $y0); "$x,$y0 : $($c.R),$($c.G),$($c.B)" }
} elseif ($mode -eq 'pxy') {
  for ($y = $y0; $y -le $y1; $y++) { $c = $b.GetPixel($x0, $y); "$x0,$y : $($c.R),$($c.G),$($c.B)" }
}
$b.Dispose()
