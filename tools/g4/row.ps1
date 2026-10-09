param([string]$seq, [int]$y, [int]$x0 = 0, [int]$x1 = -1, [int]$tol = 18, [switch]$col)
# Prints runs of similar colour along a row (or column with -col) of a tile.
Add-Type -AssemblyName System.Drawing
$d = 'C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\'
$f = Get-ChildItem $d -Filter "$seq--*" | Select-Object -First 1
$b = [System.Drawing.Bitmap]::FromFile($f.FullName)
$max = if ($col) { $b.Height } else { $b.Width }
if ($x1 -lt 0) { $x1 = $max - 1 }
$prev = $null; $start = $x0; $out = @()
for ($x = $x0; $x -le $x1; $x++) {
  $p = if ($col) { $b.GetPixel($y, $x) } else { $b.GetPixel($x, $y) }
  if ($prev -ne $null) {
    $dd = [Math]::Abs($p.R - $prev.R) + [Math]::Abs($p.G - $prev.G) + [Math]::Abs($p.B - $prev.B)
    if ($dd -gt $tol) {
      $out += ('{0}-{1}: #{2:X2}{3:X2}{4:X2}' -f $start, ($x - 1), $prev.R, $prev.G, $prev.B)
      $start = $x
    }
  }
  $prev = $p
}
$out += ('{0}-{1}: #{2:X2}{3:X2}{4:X2}' -f $start, $x1, $prev.R, $prev.G, $prev.B)
$b.Dispose()
$out -join "`n"
