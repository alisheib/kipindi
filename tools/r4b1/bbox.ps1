param([string]$Tile,[int]$X0,[int]$Y0,[int]$X1,[int]$Y1,[int]$Thr=40,[int]$BX=-1,[int]$BY=-1)
Add-Type -AssemblyName System.Drawing
$b=[System.Drawing.Bitmap]::FromFile($Tile)
if($BX -lt 0){$BX=$X0;$BY=$Y0}
$bg=$b.GetPixel($BX,$BY); $bs=$bg.R+$bg.G+$bg.B
$minx=99999;$maxx=-1;$miny=99999;$maxy=-1
for($y=$Y0;$y -le $Y1;$y++){for($x=$X0;$x -le $X1;$x++){$p=$b.GetPixel($x,$y); if([Math]::Abs(($p.R+$p.G+$p.B)-$bs) -gt $Thr){ if($x -lt $minx){$minx=$x}; if($x -gt $maxx){$maxx=$x}; if($y -lt $miny){$miny=$y}; if($y -gt $maxy){$maxy=$y} }}}
$b.Dispose()
"bbox x {0}..{1} y {2}..{3}  cx {4} cy {5}" -f $minx,$maxx,$miny,$maxy,(($minx+$maxx)/2),(($miny+$maxy)/2)
