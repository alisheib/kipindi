param([string]$Dir, [string]$Tile, [int]$Y0, [int]$Y1, [int]$X0, [int]$X1, [int]$RefX)
# For each column X0..X1: the largest RGB distance, over rows Y0..Y1, from that row's own colour at column RefX
# (a background reference left of the dial). Shows where the dial's ink, rim and glow stop.
Add-Type -AssemblyName System.Drawing
$f = Get-ChildItem $Dir | Where-Object { $_.Name -like "$Tile--*" } | Select-Object -First 1
$bmp = [System.Drawing.Bitmap]::FromFile($f.FullName)
$out = @()
for ($x = $X0; $x -le $X1; $x++) {
  $mx = 0; $at = -1; $col = ''
  for ($y = $Y0; $y -le $Y1; $y++) {
    $r = $bmp.GetPixel($RefX, $y); $c = $bmp.GetPixel($x, $y)
    $d = [Math]::Abs($c.R - $r.R) + [Math]::Abs($c.G - $r.G) + [Math]::Abs($c.B - $r.B)
    if ($d -gt $mx) { $mx = $d; $at = $y; $col = '{0},{1},{2} vs {3},{4},{5}' -f $c.R, $c.G, $c.B, $r.R, $r.G, $r.B }
  }
  $out += ('x{0}: d{1} (y{2}: {3})' -f $x, $mx, $at, $col)
}
$bmp.Dispose()
$f.Name
$out
