. "$PSScriptRoot/m.ps1"
function Ext($s,$x0,$x1,$y0,$y1,$th=200){ $b=Get-Tile $s; $bg=$b.GetPixel($x0,$y0); $c=InkCols $b $x0 $x1 $y0 $y1 $bg $th; $r=InkRows $b $x0 $x1 $y0 $y1 $bg $th; $b.Dispose(); "#$s ($x0-$x1,$y0-$y1) ink x $($c[0])-$($c[-1]) centre $((($c[0]+$c[-1])/2)) rows $($r[0])-$($r[-1]) | runs: $(Runs $c)" }
function Edges($s,$y,$x0,$x1){ $b=Get-Tile $s; $p=$null; $out=@(); for($x=$x0;$x -le $x1;$x++){ $c=$b.GetPixel($x,$y); if($p -ne $null -and (D $c $p) -gt 30){ $out+="$x" }; $p=$c }; $b.Dispose(); "#$s row $y transitions: $($out -join ',')" }
Ext 433 30 740 398 422
Ext 421 30 740 398 422 
Edges 433 500 0 767
Edges 434 470 600 1023
Edges 422 470 600 1023
