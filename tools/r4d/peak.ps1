param([string]$Tile, [int]$X0, [int]$Y0, [int]$X1, [int]$Y1)
# Prints the brightest pixel (by R+G+B), the darkest, and the most common colour in a box.
Add-Type -AssemblyName System.Drawing
$b = [System.Drawing.Bitmap]::FromFile($Tile)
$max = -1; $min = 9999; $mx = $null; $mn = $null; $hist = @{}
for ($y = $Y0; $y -le $Y1; $y++) {
  for ($x = $X0; $x -le $X1; $x++) {
    $p = $b.GetPixel($x, $y)
    $s = $p.R + $p.G + $p.B
    if ($s -gt $max) { $max = $s; $mx = "{0},{1},{2} @{3},{4}" -f $p.R, $p.G, $p.B, $x, $y }
    if ($s -lt $min) { $min = $s; $mn = "{0},{1},{2} @{3},{4}" -f $p.R, $p.G, $p.B, $x, $y }
    $k = "{0},{1},{2}" -f $p.R, $p.G, $p.B
    if ($hist.ContainsKey($k)) { $hist[$k]++ } else { $hist[$k] = 1 }
  }
}
"peak $mx"
"dark $mn"
$top = $hist.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 3
foreach ($t in $top) { "mode {0} x{1}" -f $t.Key, $t.Value }
$b.Dispose()
