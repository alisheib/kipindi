. "$PSScriptRoot/m.ps1"
foreach($s in 403,404,415,416,427,428,437,438,443,444){
 $b=Get-Tile $s; $W=$b.Width; $cx=[int]($W/2)
 # find box top/bottom along column x=40 (left inside, dashed border is at edges); use column at x=cx-120 scanning for border transitions
 $col=[int]($W/2)+100; $tr=@(); $p=$b.GetPixel($col,270); for($y=270;$y -lt 715;$y++){ $c=$b.GetPixel($col,$y); if((D $c $p) -gt 20){$tr+=$y}; $p=$c }
 $b.Dispose(); "#$s col $col transitions: $(Runs $tr)"
}
