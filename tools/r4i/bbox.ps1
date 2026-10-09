param(
  [string]$Path,
  [int]$X0, [int]$Y0, [int]$X1, [int]$Y1,
  [string]$Mode = "light",   # light: luminance > Thr; red: r > g + Thr and r > b
  [int]$Thr = 120
)
Add-Type -AssemblyName System.Drawing
$bmp = [System.Drawing.Bitmap]::FromFile($Path)
$minX = 99999; $minY = 99999; $maxX = -1; $maxY = -1; $n = 0
for ($y = $Y0; $y -le $Y1; $y++) {
  for ($x = $X0; $x -le $X1; $x++) {
    $c = $bmp.GetPixel($x, $y)
    $hit = $false
    if ($Mode -eq "light") { $hit = ((0.2126 * $c.R + 0.7152 * $c.G + 0.0722 * $c.B) -gt $Thr) }
    elseif ($Mode -eq "red") { $hit = (($c.R -gt ($c.G + $Thr)) -and ($c.R -gt $c.B)) }
    if ($hit) {
      $n++
      if ($x -lt $minX) { $minX = $x }; if ($x -gt $maxX) { $maxX = $x }
      if ($y -lt $minY) { $minY = $y }; if ($y -gt $maxY) { $maxY = $y }
    }
  }
}
$bmp.Dispose()
"{0} px · x{1}-{2} y{3}-{4} · centre ({5}, {6})" -f $n, $minX, $maxX, $minY, $maxY, (($minX + $maxX) / 2), (($minY + $maxY) / 2)
