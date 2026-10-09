param([string]$tile,[string]$mode,[int]$a,[int]$from,[int]$to,[int]$thr=40,[string]$dir='tiles-m',[int]$bx=-1,[int]$by=-1)
# mode row: scan y=a, x from..to ; mode col: scan x=a, y from..to. Prints runs of ink (diff from bg pixel > thr)
Add-Type -AssemblyName System.Drawing
$S='C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad'
if ($dir -eq 'tiles-h') { $src = "$S\wp12\tiles-h\$tile" } else { $src = "$S\visual\$dir\$tile" }
$b=[System.Drawing.Bitmap]::FromFile($src)
if ($mode -eq 'row') { if ($bx -lt 0) {$bx=$from}; if ($by -lt 0) {$by=$a} } else { if ($bx -lt 0) {$bx=$a}; if ($by -lt 0) {$by=$from} }
$bg=$b.GetPixel($bx,$by)
$runs=@(); $start=-1
for ($i=$from; $i -le $to; $i++) {
  if ($mode -eq 'row') { $p=$b.GetPixel($i,$a) } else { $p=$b.GetPixel($a,$i) }
  $d=[Math]::Abs($p.R-$bg.R)+[Math]::Abs($p.G-$bg.G)+[Math]::Abs($p.B-$bg.B)
  if ($d -gt $thr) { if ($start -lt 0) {$start=$i} } else { if ($start -ge 0) { $runs += "$start-$($i-1)"; $start=-1 } }
}
if ($start -ge 0) { $runs += "$start-$to" }
"bg=($($bg.R),$($bg.G),$($bg.B)) runs: " + ($runs -join ' ')
$b.Dispose()
