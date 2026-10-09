param([string]$Dir, [string[]]$Tiles, [int]$MinY = 56)
Add-Type -AssemblyName System.Drawing
foreach ($t in $Tiles) {
  $f = Get-ChildItem $Dir | Where-Object { $_.Name -like "$t--*" } | Select-Object -First 1
  if (-not $f) { "$t : no tile"; continue }
  $bmp = [System.Drawing.Bitmap]::FromFile($f.FullName)
  $W = $bmp.Width; $H = $bmp.Height
  # face pixels: green face (G dominant) or red face (R dominant), saturated
  $gx0 = 99999; $gx1 = -1; $gy0 = 99999; $gy1 = -1; $gn = 0
  $rx0 = 99999; $rx1 = -1; $ry0 = 99999; $ry1 = -1; $rn = 0
  for ($y = $MinY; $y -lt $H; $y++) {
    for ($x = 0; $x -lt $W; $x++) {
      $c = $bmp.GetPixel($x, $y)
      $R = $c.R; $G = $c.G; $B = $c.B
      if ($G -gt 70 -and $G -gt $R + 45 -and $G -gt $B + 15 -and $R -lt 90) {
        $gn++; if ($x -lt $gx0) { $gx0 = $x }; if ($x -gt $gx1) { $gx1 = $x }; if ($y -lt $gy0) { $gy0 = $y }; if ($y -gt $gy1) { $gy1 = $y }
      }
      elseif ($R -gt 90 -and $R -gt $G + 55 -and $R -gt $B + 40 -and $G -lt 80) {
        $rn++; if ($x -lt $rx0) { $rx0 = $x }; if ($x -gt $rx1) { $rx1 = $x }; if ($y -lt $ry0) { $ry0 = $y }; if ($y -gt $ry1) { $ry1 = $y }
      }
    }
  }
  "{0} {1}x{2}  green n={3} x{4}-{5} y{6}-{7}  red n={8} x{9}-{10} y{11}-{12}" -f $f.Name, $W, $H, $gn, $gx0, $gx1, $gy0, $gy1, $rn, $rx0, $rx1, $ry0, $ry1
  $bmp.Dispose()
}
