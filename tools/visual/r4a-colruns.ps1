param([string]$Tile, [int]$Y0, [int]$Y1, [int]$X0 = 0, [int]$X1 = 600, [int]$Thr = 60, [int]$MinGap = 4, [int]$BgX = -1, [int]$BgY = -1)
# Prints the runs of ink COLUMNS between X0 and X1 (a column has ink if any row Y0..Y1 differs from the background by Thr),
# merging runs separated by fewer than MinGap empty columns (letter spacing), and the gap after each run.
Add-Type -AssemblyName System.Drawing
$b = [System.Drawing.Bitmap]::FromFile($Tile)
if ($BgX -lt 0) { $BgX = $X0 }
if ($BgY -lt 0) { $BgY = $Y0 }
$bg = $b.GetPixel($BgX, $BgY)
$bgs = $bg.R + $bg.G + $bg.B
"bg ({0},{1},{2})" -f $bg.R, $bg.G, $bg.B
$runs = @()
$cur = $null
$gap = 0
for ($x = $X0; $x -le [Math]::Min($X1, $b.Width - 1); $x++) {
  $ink = $false
  for ($y = $Y0; $y -le [Math]::Min($Y1, $b.Height - 1); $y++) {
    $p = $b.GetPixel($x, $y)
    if ([Math]::Abs(($p.R + $p.G + $p.B) - $bgs) -gt $Thr) { $ink = $true; break }
  }
  if ($ink) {
    if ($cur -ne $null -and $gap -lt $MinGap) { $cur.l = $x }
    else { if ($cur -ne $null) { $runs += $cur }; $cur = @{ f = $x; l = $x } }
    $gap = 0
  } else { $gap++ }
}
if ($cur -ne $null) { $runs += $cur }
for ($i = 0; $i -lt $runs.Count; $i++) {
  $g = if ($i -lt $runs.Count - 1) { $runs[$i + 1].f - $runs[$i].l - 1 } else { '' }
  "x {0}..{1}   gap-after {2}" -f $runs[$i].f, $runs[$i].l, $g
}
$b.Dispose()
