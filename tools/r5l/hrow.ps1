param([string]$Tile, [int]$Y, [int]$X0 = 0, [int]$X1 = -1, [int]$Thr = 30)
# Prints horizontal runs on row Y where the pixel differs from the pixel at (X0, Y) by more than Thr (sum of RGB).
Add-Type -AssemblyName System.Drawing
$b = [System.Drawing.Bitmap]::FromFile($Tile)
if ($X1 -lt 0) { $X1 = $b.Width - 1 }
$bg = $b.GetPixel($X0, $Y)
$bgs = $bg.R + $bg.G + $bg.B
$start = -1; $peak = 0
for ($x = $X0; $x -le [Math]::Min($X1, $b.Width - 1); $x++) {
  $p = $b.GetPixel($x, $Y)
  $d = [Math]::Abs(($p.R + $p.G + $p.B) - $bgs)
  if ($d -gt $Thr) { if ($start -lt 0) { $start = $x; $peak = 0 }; if ($d -gt $peak) { $peak = $d } }
  elseif ($start -ge 0) { "x {0}-{1} peak {2}" -f $start, ($x - 1), $peak; $start = -1 }
}
if ($start -ge 0) { "x {0}-{1} peak {2}" -f $start, $X1, $peak }
$b.Dispose()
