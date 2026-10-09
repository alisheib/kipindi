param([int]$seq, [int]$x0, [int]$y0, [int]$x1, [int]$y1)
Add-Type -AssemblyName System.Drawing
$T = 'C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/edges/tiles'
$f = Get-ChildItem $T -Filter ("{0:D3}--*.png" -f $seq) | Select-Object -First 1
$b = [System.Drawing.Bitmap]::FromFile($f.FullName)
"tile $($f.Name)"
for ($y = $y0; $y -le $y1; $y++) {
  $line = ""
  for ($x = $x0; $x -le $x1; $x++) {
    $c = $b.GetPixel($x, $y)
    $sum = $c.R + $c.G + $c.B
    if ($c.G -gt $c.R + 30 -and $c.G -gt 80) { $ch = 'g' }
    elseif ($c.R -gt $c.G + 40 -and $c.R -gt 90) { $ch = 'r' }
    elseif ($sum -gt 450) { $ch = '#' }
    elseif ($sum -gt 250) { $ch = '+' }
    elseif ($sum -gt 120) { $ch = '.' }
    else { $ch = ' ' }
    $line += $ch
  }
  "{0,4} {1}" -f $y, $line
}
$b.Dispose()
