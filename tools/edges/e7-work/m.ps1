Add-Type -AssemblyName System.Drawing
$global:T='C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/edges/tiles'
$global:W='C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/edges/e7-work'
function Get-Tile($seq){ $f = Get-ChildItem $global:T -Filter ("{0}--*.png" -f $seq) | Select-Object -First 1; return [System.Drawing.Bitmap]::FromFile($f.FullName) }
function Crop($seq,$x,$y,$w,$h,$s,$name){ $b=Get-Tile $seq; $o=New-Object System.Drawing.Bitmap ([int]($w*$s)),([int]($h*$s)); $g=[System.Drawing.Graphics]::FromImage($o); $g.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor; $g.PixelOffsetMode=[System.Drawing.Drawing2D.PixelOffsetMode]::Half; $g.DrawImage($b,(New-Object System.Drawing.Rectangle 0,0,([int]($w*$s)),([int]($h*$s))),(New-Object System.Drawing.Rectangle $x,$y,$w,$h),[System.Drawing.GraphicsUnit]::Pixel); $g.Dispose(); $p=Join-Path $global:W ($name+'.png'); $o.Save($p,[System.Drawing.Imaging.ImageFormat]::Png); $o.Dispose(); $b.Dispose(); $p }
function D($c1,$c2){ [math]::Abs($c1.R-$c2.R)+[math]::Abs($c1.G-$c2.G)+[math]::Abs($c1.B-$c2.B) }
# ink rows within box: rows where any pixel differs from ref (bg at refx,refy) by > th
function InkRows($b,$x0,$x1,$y0,$y1,$bg,$th=40){ $rows=@(); for($y=$y0;$y -le $y1;$y++){ $hit=$false; for($x=$x0;$x -le $x1;$x++){ if((D $b.GetPixel($x,$y) $bg) -gt $th){$hit=$true;break} }; if($hit){$rows+=$y} }; $rows }
function InkCols($b,$x0,$x1,$y0,$y1,$bg,$th=40){ $cols=@(); for($x=$x0;$x -le $x1;$x++){ $hit=$false; for($y=$y0;$y -le $y1;$y++){ if((D $b.GetPixel($x,$y) $bg) -gt $th){$hit=$true;break} }; if($hit){$cols+=$x} }; $cols }
function Runs($arr){ if(-not $arr -or $arr.Count -eq 0){return 'none'}; $out=@(); $s=$arr[0]; $p=$arr[0]; for($i=1;$i -lt $arr.Count;$i++){ if($arr[$i] -ne $p+1){ $out+="$s-$p"; $s=$arr[$i] }; $p=$arr[$i] }; $out+="$s-$p"; $out -join ',' }
function Px($b,$x,$y){ $c=$b.GetPixel($x,$y); "({0},{1},{2})" -f $c.R,$c.G,$c.B }
