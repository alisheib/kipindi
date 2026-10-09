. "$PSScriptRoot/m.ps1"
function Lines($s,$y0,$y1,$th=90,$xa=16,$xb=-1){ $b=Get-Tile $s; if($xb -lt 0){$xb=$b.Width-17}; $bg=$b.GetPixel(5,$y0); $rows=InkRows $b $xa $xb $y0 $y1 $bg $th; $r=Runs $rows; $out="#$s rows $r |"; if($r -ne 'none'){ foreach($seg in $r.Split(',')){ $a=[int]$seg.Split('-')[0]; $z=[int]$seg.Split('-')[1]; $c=InkCols $b $xa $xb $a $z $bg $th; $out+=" [$a-$z] x$($c[0])-$($c[-1]) w$($c[-1]-$c[0]+1)" } }; $b.Dispose(); $out }
Lines 391 390 440
Lines 394 455 505
Lines 390 395 440
Lines 393 460 505
Lines 396 460 505
Lines 397 460 505
Lines 392 480 525
Lines 395 486 530
Lines 398 486 530
