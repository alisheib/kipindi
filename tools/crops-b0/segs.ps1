param([string]$Tile,[int]$Y0,[int]$Y1,[int]$X0,[int]$X1,[int]$Thr=60,[int]$Gap=3,[int]$BgX=-1,[int]$BgY=-1)
# prints horizontal ink segments (columns with ink in Y0..Y1) separated by >= Gap empty columns
Add-Type -AssemblyName System.Drawing
$b=[System.Drawing.Bitmap]::FromFile($Tile)
if($BgX -lt 0){$BgX=$X0}; if($BgY -lt 0){$BgY=$Y0}
$bg=$b.GetPixel($BgX,$BgY); $bgs=$bg.R+$bg.G+$bg.B
$segs=@(); $s=-1; $e=-1; $empty=0
for($x=$X0;$x -le $X1;$x++){
  $ink=$false
  for($y=$Y0;$y -le $Y1;$y++){ $p=$b.GetPixel($x,$y); if([Math]::Abs(($p.R+$p.G+$p.B)-$bgs) -gt $Thr){$ink=$true;break} }
  if($ink){ if($s -lt 0){$s=$x}; $e=$x; $empty=0 } else { if($s -ge 0){ $empty++; if($empty -ge $Gap){ $segs+="$s..$e"; $s=-1; $empty=0 } } }
}
if($s -ge 0){$segs+="$s..$e"}
$segs -join '  '
$b.Dispose()
