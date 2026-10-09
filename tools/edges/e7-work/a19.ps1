. "$PSScriptRoot/m.ps1"
function Lines($s,$y0,$y1,$th=60,$xa=20,$xb=-1){ $b=Get-Tile $s; if($xb -lt 0){$xb=$b.Width-21}; $bg=$b.GetPixel(30,$y0); $rows=InkRows $b $xa $xb $y0 $y1 $bg $th; $r=Runs $rows; $out="#$s rows $r |"; if($r -ne 'none'){ foreach($seg in $r.Split(',')){ $a=[int]$seg.Split('-')[0]; $z=[int]$seg.Split('-')[1]; $c=InkCols $b $xa $xb $a $z $bg $th; $out+=" [$a-$z] x$($c[0])-$($c[-1]) w$($c[-1]-$c[0]+1)" } }; $b.Dispose(); $out }
Lines 437 465 565
Lines 438 442 545
Lines 443 465 545
Lines 444 442 522
