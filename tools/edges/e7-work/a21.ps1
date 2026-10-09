. "$PSScriptRoot/m.ps1"
function Ext($s,$x0,$x1,$y0,$y1,$th=60){ $b=Get-Tile $s; $bg=$b.GetPixel($x0,$y0); $c=InkCols $b $x0 $x1 $y0 $y1 $bg $th; $r=InkRows $b $x0 $x1 $y0 $y1 $bg $th; $b.Dispose(); "#$s ($x0-$x1,$y0-$y1) ink x $($c[0])-$($c[-1]) centre $((($c[0]+$c[-1])/2)) rows $($r[0])-$($r[-1])" }
Ext 427 30 740 436 452
Ext 427 30 740 400 420
Ext 415 30 740 436 455
Ext 428 50 975 436 452
Ext 396 20 340 467 480
Ext 396 20 340 489 500
Ext 396 20 340 425 447
Ext 390 20 340 350 375
