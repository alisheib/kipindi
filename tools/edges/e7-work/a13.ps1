. "$PSScriptRoot/m.ps1"
function Tr($s,$y,$th=25){ $b=Get-Tile $s; $tr=@(); $p=$b.GetPixel(0,$y); for($x=0;$x -lt $b.Width;$x++){ $c=$b.GetPixel($x,$y); if((D $c $p) -gt $th){$tr+=$x}; $p=$c }; $b.Dispose(); "#$s row $y transitions: $(Runs $tr)" }
Tr 390 495; Tr 391 495; Tr 393 600; Tr 394 600; Tr 387 690; Tr 388 690; Tr 392 580; Tr 389 640
