param(
  [string]$File,
  [int]$Y0, [int]$Y1,
  [int]$X0 = 0, [int]$X1 = -1,
  [int]$Thr = 40,
  [int]$BgX = -1, [int]$BgY = -1,
  [switch]$Rows,
  [switch]$Cols,
  [int]$MinGap = 3
)
# Default: horizontal ink spans (columns whose pixels differ from the background by > Thr in any row of [Y0,Y1]).
# -Rows: vertical ink spans (rows with ink in any column of [X0,X1]).
Add-Type -AssemblyName System.Drawing
$bmp = [System.Drawing.Bitmap]::FromFile($File)
if ($X1 -lt 0) { $X1 = $bmp.Width - 1 }
if ($BgX -lt 0) { $BgX = $X0 }
if ($BgY -lt 0) { $BgY = $Y0 }
$bg = $bmp.GetPixel($BgX, $BgY)
"size {0}x{1} bg({2},{3})=#{4:X2}{5:X2}{6:X2}" -f $bmp.Width, $bmp.Height, $BgX, $BgY, $bg.R, $bg.G, $bg.B
function PxDiff($c) { [Math]::Max([Math]::Max([Math]::Abs($c.R - $bg.R), [Math]::Abs($c.G - $bg.G)), [Math]::Abs($c.B - $bg.B)) }
$ink = @()
if ($Rows) {
  for ($y = $Y0; $y -le $Y1; $y++) {
    $hit = $false
    for ($x = $X0; $x -le $X1; $x++) { if ((PxDiff $bmp.GetPixel($x, $y)) -gt $Thr) { $hit = $true; break } }
    $ink += $hit
  }
  $base = $Y0
} else {
  for ($x = $X0; $x -le $X1; $x++) {
    $hit = $false
    for ($y = $Y0; $y -le $Y1; $y++) { if ((PxDiff $bmp.GetPixel($x, $y)) -gt $Thr) { $hit = $true; break } }
    $ink += $hit
  }
  $base = $X0
}
$start = -1; $lastInk = -100
$spans = @()
for ($i = 0; $i -lt $ink.Count; $i++) {
  $p = $base + $i
  if ($ink[$i]) {
    if ($start -lt 0) { $start = $p }
    elseif ($p - $lastInk -gt $MinGap) { $spans += "[$start..$lastInk]"; $start = $p }
    $lastInk = $p
  }
}
if ($start -ge 0) { $spans += "[$start..$lastInk]" }
$(if ($Rows) { "row spans: " } else { "col spans: " }) + ($spans -join " ")
$bmp.Dispose()
