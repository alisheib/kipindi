. "$PSScriptRoot/m.ps1"
foreach($s in 399,400,411,412,423,424){
 $b=Get-Tile $s; $W=$b.Width; $bg=$b.GetPixel(250,4)
 $c=InkCols $b 0 ($W-1) 8 48 $bg 50
 # rail: find rail top border row along x=200
 $tr=@(); $p=$b.GetPixel(200,$b.Height-120); for($y=$b.Height-120;$y -lt $b.Height;$y++){ $c2=$b.GetPixel(200,$y); if((D $c2 $p) -gt 20){$tr+=$y}; $p=$c2 }
 "#$s W$W header ink runs: $(Runs $c) | rail col200 transitions: $(Runs $tr)"
 $b.Dispose()
}
