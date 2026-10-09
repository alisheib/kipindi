param([string]$tile,[string]$bands,[int]$x0=0,[int]$x1=80,[int]$thr=40,[int]$bx=2,[int]$by=-1,[string]$side='left')
# for each band "y0-y1", report leftmost (or rightmost) ink x vs bg pixel
Add-Type -AssemblyName System.Drawing
$S='C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad'
$b=[System.Drawing.Bitmap]::FromFile("$S\visual\tiles-m\$tile")
foreach ($band in $bands.Split(' ')) {
  $y0=[int]$band.Split('-')[0]; $y1=[int]$band.Split('-')[1]
  $bgy = if ($by -ge 0) {$by} else {$y0}
  $bg=$b.GetPixel($bx,$bgy)
  $edge = if ($side -eq 'left') {99999} else {-1}
  for ($y=$y0;$y -le $y1;$y++){ for($x=$x0;$x -le $x1;$x++){ $p=$b.GetPixel($x,$y); $d=[Math]::Abs($p.R-$bg.R)+[Math]::Abs($p.G-$bg.G)+[Math]::Abs($p.B-$bg.B); if($d -gt $thr){ if($side -eq 'left'){ if($x -lt $edge){$edge=$x} } else { if($x -gt $edge){$edge=$x} } } } }
  "$band -> $side=$edge"
}
$b.Dispose()
