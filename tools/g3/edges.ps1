param([string]$seq, [int]$x, [int]$y0 = 0, [int]$y1 = -1, [string]$axis = 'v', [int]$tol = 6)
# Print every index along a line where the colour changes by more than tol (per channel sum), with the colours.
Add-Type -AssemblyName System.Drawing
$d = 'C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles-h'
$f = Get-ChildItem $d -Filter "$seq--*"
$b = [System.Drawing.Bitmap]::FromFile($f.FullName)
if ($axis -eq 'v') { if ($y1 -lt 0) { $y1 = $b.Height - 1 } } else { if ($y1 -lt 0) { $y1 = $b.Width - 1 } }
$prev = $null
for ($i = $y0; $i -le $y1; $i++) {
  if ($axis -eq 'v') { $c = $b.GetPixel($x, $i) } else { $c = $b.GetPixel($i, $x) }
  if ($prev -ne $null) {
    $dd = [math]::Abs($c.R - $prev.R) + [math]::Abs($c.G - $prev.G) + [math]::Abs($c.B - $prev.B)
    if ($dd -gt $tol) { "$i : $($c.R),$($c.G),$($c.B)" }
  }
  $prev = $c
}
$b.Dispose()
