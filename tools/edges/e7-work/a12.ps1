. "$PSScriptRoot/m.ps1"
function Rows2($s,$x0,$x1,$y0,$y1){ $b=Get-Tile $s; $bg=$b.GetPixel($x1,$y0); $r=InkRows $b $x0 $x1 $y0 $y1 $bg 60; $b.Dispose(); "x$x0-$x1 rows $(Runs $r)" }
foreach($s in 409,421,433){ "#$s KIASI $(Rows2 $s 30 240 718 775) | WATABIRI $(Rows2 $s 280 490 718 775) | INAISHA $(Rows2 $s 530 740 718 775)" }
foreach($s in 410,422,434){ "#$s KIASI $(Rows2 $s 45 250 460 515) | WATABIRI $(Rows2 $s 284 395 460 515) | INAISHA $(Rows2 $s 434 590 460 515)" }
