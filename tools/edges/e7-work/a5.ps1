. "$PSScriptRoot/m.ps1"
foreach($t in @(,@(433,600,767,278,345)) + @(,@(434,880,1023,278,345)) + @(,@(410,880,1023,278,345)) + @(,@(409,600,767,295,365))){
 $s=$t[0]; $b=Get-Tile $s; $bg=$b.GetPixel(5,300)
 $fx=@(); for($x=$t[1];$x -le $t[2];$x++){ for($y=$t[3];$y -le $t[4];$y++){ $c=$b.GetPixel($x,$y); $v=$c.R+$c.G+$c.B; if($v -ge 75 -and $v -lt 200){ $fx+=$x; break } } }
 $fy=@(); for($y=$t[3];$y -le $t[4];$y++){ for($x=$t[1];$x -le $t[2];$x++){ $c=$b.GetPixel($x,$y); $v=$c.R+$c.G+$c.B; if($v -ge 75 -and $v -lt 200){ $fy+=$y; break } } }
 $tr=@(); for($y=$t[3];$y -le $t[4];$y++){ for($x=$t[1];$x -le $t[2];$x++){ $c=$b.GetPixel($x,$y); if(($c.R+$c.G+$c.B) -gt 500){ $tr+=$y; break } } }
 "#$s faint(75..200) x: $(Runs $fx) y: $(Runs $fy) | title bright rows in box: $(Runs $tr) | sample wm (700,300): $(Px $b 700 300)"
 $b.Dispose()
}
