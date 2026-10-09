param([string]$Tile, [int]$X, [int]$Y0, [int]$Y1, [int]$Thr = 30)
# Prints vertical runs at column X where the pixel differs from the pixel at (X, Y0) by more than Thr (sum of RGB).
Add-Type -AssemblyName System.Drawing
$b = [System.Drawing.Bitmap]::FromFile($Tile)
$bg = $b.GetPixel($X, $Y0)
$bgs = $bg.R + $bg.G + $bg.B
$start = -1; $peak = 0
for ($y = $Y0; $y -le [Math]::Min($Y1, $b.Height - 1); $y++) {
  $p = $b.GetPixel($X, $y)
  $d = [Math]::Abs(($p.R + $p.G + $p.B) - $bgs)
  if ($d -gt $Thr) { if ($start -lt 0) { $start = $y; $peak = 0 }; if ($d -gt $peak) { $peak = $d } }
  elseif ($start -ge 0) { "y {0}-{1} peak {2}" -f $start, ($y - 1), $peak; $start = -1 }
}
if ($start -ge 0) { "y {0}-{1} peak {2}" -f $start, $Y1, $peak }
$b.Dispose()
