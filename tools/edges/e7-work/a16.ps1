. "$PSScriptRoot/m.ps1"
function Seg($s,$y0,$y1,$x0,$x1,$th=60){ $b=Get-Tile $s; $bg=$b.GetPixel($x0,$y0); $c=InkCols $b $x0 $x1 $y0 $y1 $bg $th; $b.Dispose(); "#$s y$y0-$y1 runs: $(Runs $c)" }
Seg 385 398 410 100 300
Seg 393 386 398 100 260
Seg 389 409 421 540 740
Seg 395 409 421 560 720
