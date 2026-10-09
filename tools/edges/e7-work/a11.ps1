. "$PSScriptRoot/m.ps1"
foreach($s in 386,389,395,398){
 $b=Get-Tile $s; $bg=$b.GetPixel(100,500)
 $c=InkCols $b 150 1150 150 250 $bg 12
 $r=InkRows $b 150 1150 130 880 $bg 12
 # strongest wave pixel near left cut
 $mx=0; for($x=320;$x -le 330;$x++){ for($y=150;$y -le 250;$y++){ $d=D $b.GetPixel($x,$y) $bg; if($d -gt $mx){$mx=$d;$px="$x,$y $(Px $b $x $y)"} } }
 "#$s bg $(Px $b 100 500) wave cols (y150-250, diff>12): $($c[0])-$($c[-1]) | wave rows overall: $($r[0])-$($r[-1]) | strongest near left cut: d$mx at $px"
 $b.Dispose()
}
