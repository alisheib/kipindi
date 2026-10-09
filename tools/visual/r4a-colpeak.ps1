param([string]$Tile, [int]$Y0, [int]$Y1, [int]$X0, [int]$X1, [int]$BgX, [int]$BgY, [int]$Step = 1)
# Per column: the peak ink (max |R+G+B − bg|) over rows Y0..Y1 — a faded glyph shows as a low peak, full ink as a high one.
Add-Type -AssemblyName System.Drawing
$b = [System.Drawing.Bitmap]::FromFile($Tile)
$bg = $b.GetPixel($BgX, $BgY); $bgs = $bg.R + $bg.G + $bg.B
"bg ({0},{1},{2})" -f $bg.R, $bg.G, $bg.B
$line = ""
for ($x = $X0; $x -le $X1; $x += $Step) {
  $pk = 0
  for ($y = $Y0; $y -le $Y1; $y++) { $p = $b.GetPixel($x, $y); $d = [Math]::Abs(($p.R + $p.G + $p.B) - $bgs); if ($d -gt $pk) { $pk = $d } }
  $line += ("{0}:{1} " -f $x, $pk)
  if ((($x - $X0) / $Step) % 10 -eq 9) { $line; $line = "" }
}
if ($line) { $line }
$b.Dispose()
