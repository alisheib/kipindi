param([string]$Tile,[int]$Y0,[int]$Y1,[int]$X0,[int]$X1,[int]$Thr=40,[int]$BX=-1,[int]$BY=-1)
Add-Type -AssemblyName System.Drawing
$b=[System.Drawing.Bitmap]::FromFile($Tile)
if($BX -lt 0){$BX=$X0;$BY=$Y0}
$bg=$b.GetPixel($BX,$BY); $bsum=$bg.R+$bg.G+$bg.B
$out=@(); $in=$false; $st=0
for($x=$X0;$x -le $X1;$x++){ $ink=$false; for($y=$Y0;$y -le $Y1;$y++){ $p=$b.GetPixel($x,$y); if([Math]::Abs(($p.R+$p.G+$p.B)-$bsum) -gt $Thr){$ink=$true;break} }
  if($ink -and -not $in){$in=$true;$st=$x} elseif(-not $ink -and $in){$in=$false;$out+="$st-$($x-1)"} }
if($in){$out+="$st-$X1"}
$b.Dispose()
"bg($($bg.R),$($bg.G),$($bg.B)) " + ($out -join ' ')
