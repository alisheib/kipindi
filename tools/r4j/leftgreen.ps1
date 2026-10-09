param([int]$seq, [int]$y0, [int]$y1)
Add-Type -AssemblyName System.Drawing
$T = 'C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/edges/tiles'
$f = Get-ChildItem $T -Filter ("{0:D3}--*.png" -f $seq) | Select-Object -First 1
$b = [System.Drawing.Bitmap]::FromFile($f.FullName)
$out = @()
for ($y = $y0; $y -le $y1; $y++) {
  $lx = -1
  for ($x = 300; $x -lt $b.Width; $x++) { $c = $b.GetPixel($x, $y); if (($c.G -gt $c.R + 60) -and ($c.G -gt $c.B + 10) -and ($c.G -gt 100)) { $lx = $x; break } }
  $out += "${y}:${lx}"
}
$b.Dispose()
($out -join ' ')
