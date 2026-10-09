param([string]$Tile, [int]$Y0, [int]$Y1, [int]$X0, [int]$X1, [int]$BX, [int]$BY)
Add-Type -AssemblyName System.Drawing
$b = [System.Drawing.Bitmap]::FromFile($Tile)
function lin([double]$c){ $c=$c/255; if($c -le 0.04045){ return $c/12.92 } else { return [Math]::Pow(($c+0.055)/1.055,2.4) } }
function lum($p){ return 0.2126*(lin $p.R) + 0.7152*(lin $p.G) + 0.0722*(lin $p.B) }
$bg = $b.GetPixel($BX,$BY); $lb = lum $bg
$best = 0; $bp = $null; $top=-1; $bot=-1
for($y=$Y0;$y -le $Y1;$y++){ $rowInk=$false; for($x=$X0;$x -le $X1;$x++){ $p=$b.GetPixel($x,$y); $l=lum $p; if($l -gt $best){$best=$l;$bp=$p}; $d=[Math]::Abs($p.R-$bg.R)+[Math]::Abs($p.G-$bg.G)+[Math]::Abs($p.B-$bg.B); if($d -gt 120){$rowInk=$true} }; if($rowInk){ if($top -lt 0){$top=$y}; $bot=$y } }
$cr = ($best+0.05)/($lb+0.05)
"bg=({0},{1},{2}) peak=({3},{4},{5}) contrast={6:N2} inkrows {7}-{8} (h={9})" -f $bg.R,$bg.G,$bg.B,$bp.R,$bp.G,$bp.B,$cr,$top,$bot,($bot-$top+1)
$b.Dispose()
