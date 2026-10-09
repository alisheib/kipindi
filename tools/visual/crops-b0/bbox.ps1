param([string]$tile,[int]$x,[int]$y,[int]$w,[int]$h,[int]$thr=40,[string]$dir='tiles-m',[int]$bx=-1,[int]$by=-1)
# ink bbox inside rect vs bg pixel (default top-left of rect); also per-column and per-row profile summary
Add-Type -AssemblyName System.Drawing
$S='C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad'
if ($dir -eq 'tiles-h') { $src = "$S\wp12\tiles-h\$tile" } else { $src = "$S\visual\$dir\$tile" }
$b=[System.Drawing.Bitmap]::FromFile($src)
if ($bx -lt 0) {$bx=$x}; if ($by -lt 0) {$by=$y}
$bg=$b.GetPixel($bx,$by)
$minx=99999;$maxx=-1;$miny=99999;$maxy=-1
$rows=New-Object 'int[]' $h
for ($j=0;$j -lt $h;$j++){ for ($i=0;$i -lt $w;$i++){ $p=$b.GetPixel($x+$i,$y+$j); $d=[Math]::Abs($p.R-$bg.R)+[Math]::Abs($p.G-$bg.G)+[Math]::Abs($p.B-$bg.B); if ($d -gt $thr){ $rows[$j]++; if($x+$i -lt $minx){$minx=$x+$i}; if($x+$i -gt $maxx){$maxx=$x+$i}; if($y+$j -lt $miny){$miny=$y+$j}; if($y+$j -gt $maxy){$maxy=$y+$j} } } }
"bg=($($bg.R),$($bg.G),$($bg.B)) bbox x=$minx..$maxx y=$miny..$maxy"
# row bands
$bands=@(); $s=-1
for ($j=0;$j -lt $h;$j++){ if ($rows[$j] -gt 0){ if($s -lt 0){$s=$j} } else { if($s -ge 0){ $bands += "$($y+$s)-$($y+$j-1)"; $s=-1 } } }
if ($s -ge 0){ $bands += "$($y+$s)-$($y+$h-1)" }
"row bands: " + ($bands -join ' ')
$b.Dispose()
