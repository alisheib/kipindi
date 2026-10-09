param([string]$Tile, [int]$Y0, [int]$Y1, [int]$X0, [int]$X1, [int]$Thr = 60, [int]$MinGap = 3)
# Prints the ink runs (words) between X0..X1 in the band Y0..Y1: a run ends at a gap of >= MinGap empty columns.
Add-Type -AssemblyName System.Drawing
$b = [System.Drawing.Bitmap]::FromFile($Tile)
$bg = $b.GetPixel($X0, $Y0); $bgs = $bg.R + $bg.G + $bg.B
$ink = @()
for ($x = $X0; $x -le $X1; $x++) {
  $has = $false
  for ($y = $Y0; $y -le $Y1; $y++) { $p = $b.GetPixel($x, $y); if ([Math]::Abs(($p.R + $p.G + $p.B) - $bgs) -gt $Thr) { $has = $true; break } }
  $ink += $has
}
$runs = @(); $start = -1; $empty = 0
for ($i = 0; $i -lt $ink.Count; $i++) {
  if ($ink[$i]) { if ($start -lt 0) { $start = $i }; $last = $i; $empty = 0 }
  elseif ($start -ge 0) { $empty++; if ($empty -ge $MinGap) { $runs += "{0}..{1}" -f ($start + $X0), ($last + $X0); $start = -1 } }
}
if ($start -ge 0) { $runs += "{0}..{1}" -f ($start + $X0), ($last + $X0) }
$runs -join "  "
$b.Dispose()
