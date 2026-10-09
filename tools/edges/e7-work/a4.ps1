. "$PSScriptRoot/m.ps1"
foreach($s in 433,409,421,434,410,422){
 $b=Get-Tile $s; $bg=$b.GetPixel(5,300)
 # title: bright pixels (sum>500) in y 285-370
 $tx=@(); $ty=@(); for($x=16;$x -lt $b.Width-10;$x++){ for($y=280;$y -le 372;$y++){ $c=$b.GetPixel($x,$y); if(($c.R+$c.G+$c.B) -gt 500){ $tx+=$x; $ty+=$y; break } } }
 # watermark: faint pixels (diff 25..120 from bg) in right region
 $wx=@(); $wy=@(); $x0=[int]($b.Width*0.75); for($x=$x0;$x -lt $b.Width-5;$x++){ for($y=272;$y -le 372;$y++){ $c=$b.GetPixel($x,$y); $d=D $c $bg; if($d -gt 25 -and ($c.R+$c.G+$c.B) -lt 300){ $wx+=$x; break } } }
 $wr=@(); for($y=272;$y -le 372;$y++){ for($x=$x0;$x -lt $b.Width-5;$x++){ $c=$b.GetPixel($x,$y); $d=D $c $bg; if($d -gt 25 -and ($c.R+$c.G+$c.B) -lt 300){ $wr+=$y; break } } }
 "#$s bg $(Px $b 5 300) title bright x: $($tx[0])-$($tx[-1]) | watermark-ish x: $(Runs $wx) rows: $(Runs $wr)"
 $b.Dispose()
}
