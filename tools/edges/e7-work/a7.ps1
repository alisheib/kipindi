. "$PSScriptRoot/m.ps1"
function Dial($s){ $b=Get-Tile $s; $W=$b.Width; $H=$b.Height
 # disc: teal-green pixels (G>110, G>R+50, B<170) in right 120px, y 100..H-60
 $minx=9999;$maxx=-1;$miny=9999;$maxy=-1
 for($x=$W-120;$x -lt $W;$x++){ for($y=100;$y -lt $H-60;$y++){ $c=$b.GetPixel($x,$y); if($c.G -gt 110 -and $c.G -gt $c.R+50 -and $c.B -lt 170){ if($x -lt $minx){$minx=$x}; if($x -gt $maxx){$maxx=$x}; if($y -lt $miny){$miny=$y}; if($y -gt $maxy){$maxy=$y} } } }
 $b.Dispose(); "disc green x $minx-$maxx y $miny-$maxy" }
function CardEdges($s,$yrow,$xcol){ $b=Get-Tile $s; $W=$b.Width
 # right border on row yrow: scan from W-1 leftwards for border (bright-ish blue line)
 $tr=@(); $p=$b.GetPixel($W-200,$yrow); for($x=$W-200;$x -lt $W;$x++){ $c=$b.GetPixel($x,$yrow); if((D $c $p) -gt 25){$tr+="$x$(Px $b $x $yrow)"}; $p=$c }
 $tc=@(); $p=$b.GetPixel($xcol,150); for($y=150;$y -lt 300;$y++){ $c=$b.GetPixel($xcol,$y); if((D $c $p) -gt 25){$tc+="$y"}; $p=$c }
 $b.Dispose(); "row $yrow transitions: $($tr -join ' ') | col $xcol transitions y: $($tc -join ',')" }
foreach($s in 405,406,407,417,418,419,429,430,431){ "#$s $(Dial $s)"; "   $(CardEdges $s 260 400)" }
