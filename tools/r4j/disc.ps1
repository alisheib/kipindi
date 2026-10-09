param([int]$seq)
Add-Type -AssemblyName System.Drawing
$T = 'C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/edges/tiles'
$f = Get-ChildItem $T -Filter ("{0:D3}--*.png" -f $seq) | Select-Object -First 1
$b = [System.Drawing.Bitmap]::FromFile($f.FullName)
$W = $b.Width; $H = $b.Height
# The disc's two halves: a saturated green (G>R+60, G>B+20, G>110) and a saturated red/claret (R>G+60, R>B+20, R>120), in the right 70px.
$gx0=99999;$gy0=99999;$gx1=-1;$gy1=-1;$gn=0
for ($y = 0; $y -lt $H; $y++) { for ($x = $W - 70; $x -lt $W; $x++) {
  $c = $b.GetPixel($x, $y)
  $g = ($c.G -gt $c.R + 60) -and ($c.G -gt $c.B + 10) -and ($c.G -gt 100)
  if ($g) { $gn++; if ($x -lt $gx0) {$gx0=$x}; if ($x -gt $gx1) {$gx1=$x}; if ($y -lt $gy0) {$gy0=$y}; if ($y -gt $gy1) {$gy1=$y} }
} }
$b.Dispose()
"$($f.Name): green half x$gx0-$gx1 y$gy0-$gy1 n=$gn"
