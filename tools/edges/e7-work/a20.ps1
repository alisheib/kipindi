. "$PSScriptRoot/m.ps1"
function Ext($s,$x0,$x1,$y0,$y1,$th=60){ $b=Get-Tile $s; $bg=$b.GetPixel($x0,$y0); $c=InkCols $b $x0 $x1 $y0 $y1 $bg $th; $r=InkRows $b $x0 $x1 $y0 $y1 $bg $th; $b.Dispose(); "#$s ($x0-$x1,$y0-$y1) ink x $($c[0])-$($c[-1]) centre $((($c[0]+$c[-1])/2)) rows $($r[0])-$($r[-1])" }
Ext 433 30 740 378 392
Ext 433 30 740 505 522
Ext 421 30 740 418 432
Ext 421 30 740 545 562
Ext 434 650 975 385 400
Ext 434 650 975 513 530
