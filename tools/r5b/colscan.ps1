param([string]$Tile, [int]$X, [int]$Y0, [int]$Y1, [int]$Thr = 30)
# Walks column X from Y0 to Y1 and prints each run of pixels that differ from the run start's colour by more than Thr
# (sum of channel deltas): the transitions (borders, hairlines, ink) down one column.
Add-Type -AssemblyName System.Drawing
$b = [System.Drawing.Bitmap]::FromFile($Tile)
$prev = $null; $runStart = $Y0
$out = @()
for ($y = $Y0; $y -le [Math]::Min($Y1, $b.Height - 1); $y++) {
  $p = $b.GetPixel($X, $y)
  if ($prev -eq $null) { $prev = $p; $runStart = $y; continue }
  $d = [Math]::Abs($p.R - $prev.R) + [Math]::Abs($p.G - $prev.G) + [Math]::Abs($p.B - $prev.B)
  if ($d -gt $Thr) {
    $out += ("y{0}-{1} ({2},{3},{4})" -f $runStart, ($y - 1), $prev.R, $prev.G, $prev.B)
    $prev = $p; $runStart = $y
  }
}
$out += ("y{0}-{1} ({2},{3},{4})" -f $runStart, [Math]::Min($Y1, $b.Height - 1), $prev.R, $prev.G, $prev.B)
$out -join "`n"
$b.Dispose()
