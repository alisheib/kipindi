param([string]$Dir, [string[]]$Specs)
# Each spec: tile:x0:x1:y0:y1 - the window the dial lies in. Reports the face (green+red) bbox and its centre.
Add-Type -AssemblyName System.Drawing
foreach ($s in $Specs) {
  $p = $s.Split(':'); $t = $p[0]; $WX0 = [int]$p[1]; $WX1 = [int]$p[2]; $WY0 = [int]$p[3]; $WY1 = [int]$p[4]
  $f = Get-ChildItem $Dir | Where-Object { $_.Name -like "$t--*" } | Select-Object -First 1
  if (-not $f) { "$t : no tile"; continue }
  $bmp = [System.Drawing.Bitmap]::FromFile($f.FullName)
  $WX1 = [Math]::Min($WX1, $bmp.Width - 1); $WY1 = [Math]::Min($WY1, $bmp.Height - 1)
  $x0 = 99999; $x1 = -1; $y0 = 99999; $y1 = -1; $n = 0
  $wx = 0.0; $wy = 0.0; $wn = 0
  for ($y = $WY0; $y -le $WY1; $y++) {
    for ($x = $WX0; $x -le $WX1; $x++) {
      $c = $bmp.GetPixel($x, $y); $R = $c.R; $G = $c.G; $B = $c.B
      $face = ($G -gt 70 -and $G -gt $R + 45 -and $G -gt $B + 15 -and $R -lt 90) -or ($R -gt 90 -and $R -gt $G + 55 -and $R -gt $B + 40 -and $G -lt 80)
      if ($face) { $n++; if ($x -lt $x0) { $x0 = $x }; if ($x -gt $x1) { $x1 = $x }; if ($y -lt $y0) { $y0 = $y }; if ($y -gt $y1) { $y1 = $y } }
      # hub / seam gold
      if ($R -gt 200 -and $G -gt 160 -and $B -lt 200 -and $R -gt $B + 40) { $wn++; $wx += $x; $wy += $y }
    }
  }
  $cx = if ($wn) { [Math]::Round($wx / $wn, 1) } else { 'n/a' }
  $cy = if ($wn) { [Math]::Round($wy / $wn, 1) } else { 'n/a' }
  "{0}  face n={1} x{2}-{3} y{4}-{5} (w{6} h{7}, centre {8},{9})  gold n={10} centroid {11},{12}" -f $t, $n, $x0, $x1, $y0, $y1, ($x1 - $x0 + 1), ($y1 - $y0 + 1), (($x0 + $x1) / 2), (($y0 + $y1) / 2), $wn, $cx, $cy
  $bmp.Dispose()
}

