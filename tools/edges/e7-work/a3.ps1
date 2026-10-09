. "$PSScriptRoot/m.ps1"
function MaxInk($s,$x0,$x1,$y0,$y1){ $b=Get-Tile $s; $best=$null; $bs=-1; for($x=$x0;$x -le $x1;$x++){ for($y=$y0;$y -le $y1;$y++){ $c=$b.GetPixel($x,$y); $v=$c.R+$c.G+$c.B; if($v -gt $bs){$bs=$v;$best=$c;$bx=$x;$by=$y} } }; $b.Dispose(); "#$s box($x0-$x1,$y0-$y1) brightest ($($best.R),$($best.G),$($best.B)) at $bx,$by" }
MaxInk 390 160 200 318 332
MaxInk 390 140 240 685 700
MaxInk 393 120 240 385 398
MaxInk 393 140 240 672 686
MaxInk 392 620 660 402 416
MaxInk 409 37 237 826 838
MaxInk 409 37 160 934 946
MaxInk 421 37 180 826 838
MaxInk 433 37 117 788 800
# header capsule gold figure and the gold pill
MaxInk 409 518 610 26 40
