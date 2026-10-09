param([string]$Tile,[int]$Y=-1,[int]$X=-1,[int]$A0,[int]$A1,[int]$Step=1)
Add-Type -AssemblyName System.Drawing
$b=[System.Drawing.Bitmap]::FromFile($Tile)
$o=@()
for($i=$A0;$i -le $A1;$i+=$Step){ if($Y -ge 0){$p=$b.GetPixel($i,$Y)}else{$p=$b.GetPixel($X,$i)}; $o+=("{0}:{1},{2},{3}" -f $i,$p.R,$p.G,$p.B) }
$o -join ' '
$b.Dispose()
