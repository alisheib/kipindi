Add-Type -AssemblyName System.Drawing
$global:T = 'C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\visual\tiles-m'
$global:H = 'C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles-h'
function Load($name, $dir=$global:T) {
  $b=[System.Drawing.Bitmap]::FromFile((Join-Path $dir $name))
  $r=New-Object System.Drawing.Rectangle 0,0,$b.Width,$b.Height
  $bd=$b.LockBits($r,[System.Drawing.Imaging.ImageLockMode]::ReadOnly,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $bytes=New-Object byte[] ($bd.Stride*$b.Height)
  [System.Runtime.InteropServices.Marshal]::Copy($bd.Scan0,$bytes,0,$bytes.Length)
  $o=[pscustomobject]@{W=$b.Width;H=$b.Height;S=$bd.Stride;B=$bytes}
  $b.UnlockBits($bd); $b.Dispose(); return $o
}
function Px($im,$x,$y){ $i=$y*$im.S+$x*4; return @($im.B[$i+2],$im.B[$i+1],$im.B[$i]) }
function Hex($im,$x,$y){ $p=Px $im $x $y; return ('#{0:X2}{1:X2}{2:X2}' -f $p[0],$p[1],$p[2]) }
function Dist($a,$b){ return [math]::Abs($a[0]-$b[0])+[math]::Abs($a[1]-$b[1])+[math]::Abs($a[2]-$b[2]) }
# runs of ink along row y from x0..x1 against bg pixel (bx,by) or explicit bg
function RowRuns($im,$y,$x0,$x1,$bg=$null,$thr=40){
  if($bg -eq $null){$bg=Px $im $x0 $y}
  $runs=@();$s=-1
  for($x=$x0;$x -le $x1;$x++){ $ink=(Dist (Px $im $x $y) $bg) -gt $thr
    if($ink -and $s -lt 0){$s=$x}; if(-not $ink -and $s -ge 0){$runs+="$s-$($x-1)";$s=-1} }
  if($s -ge 0){$runs+="$s-$x1"}; return ($runs -join ' ')
}
function ColRuns($im,$x,$y0,$y1,$bg=$null,$thr=40){
  if($bg -eq $null){$bg=Px $im $x $y0}
  $runs=@();$s=-1
  for($y=$y0;$y -le $y1;$y++){ $ink=(Dist (Px $im $x $y) $bg) -gt $thr
    if($ink -and $s -lt 0){$s=$y}; if(-not $ink -and $s -ge 0){$runs+="$s-$($y-1)";$s=-1} }
  if($s -ge 0){$runs+="$s-$y1"}; return ($runs -join ' ')
}
# bounding box of ink inside rect vs bg (sampled at x0,y0 unless given)
function BBox($im,$x0,$y0,$x1,$y1,$bg=$null,$thr=40){
  if($bg -eq $null){$bg=Px $im $x0 $y0}
  $x_lo=99999;$y_lo=99999;$x_hi=-1;$y_hi=-1
  for($y=$y0;$y -le $y1;$y++){ for($x=$x0;$x -le $x1;$x++){ if((Dist (Px $im $x $y) $bg) -gt $thr){ if($x -lt $x_lo){$x_lo=$x}; if($x -gt $x_hi){$x_hi=$x}; if($y -lt $y_lo){$y_lo=$y}; if($y -gt $y_hi){$y_hi=$y} } } }
  return "x $x_lo-$x_hi  y $y_lo-$y_hi"
}
# rows containing ink within x range: list y-runs (text lines)
function Lines($im,$x0,$x1,$y0,$y1,$bg=$null,$thr=40){
  if($bg -eq $null){$bg=Px $im $x0 $y0}
  $runs=@();$s=-1
  for($y=$y0;$y -le $y1;$y++){ $ink=$false; for($x=$x0;$x -le $x1;$x++){ if((Dist (Px $im $x $y) $bg) -gt $thr){$ink=$true;break} }
    if($ink -and $s -lt 0){$s=$y}; if(-not $ink -and $s -ge 0){$runs+="$s-$($y-1)";$s=-1} }
  if($s -ge 0){$runs+="$s-$y1"}; return ($runs -join ' ')
}
# columns containing ink within y range: x-runs
function Cols($im,$x0,$x1,$y0,$y1,$bg=$null,$thr=40){
  if($bg -eq $null){$bg=Px $im $x0 $y0}
  $runs=@();$s=-1
  for($x=$x0;$x -le $x1;$x++){ $ink=$false; for($y=$y0;$y -le $y1;$y++){ if((Dist (Px $im $x $y) $bg) -gt $thr){$ink=$true;break} }
    if($ink -and $s -lt 0){$s=$x}; if(-not $ink -and $s -ge 0){$runs+="$s-$($x-1)";$s=-1} }
  if($s -ge 0){$runs+="$s-$x1"}; return ($runs -join ' ')
}
function Crop($name,$x,$y,$w,$h,$scale,$out,$dir=$global:T){
  $b=[System.Drawing.Bitmap]::FromFile((Join-Path $dir $name))
  $n=New-Object System.Drawing.Bitmap ([int]($w*$scale)),([int]($h*$scale))
  $g=[System.Drawing.Graphics]::FromImage($n); $g.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor; $g.PixelOffsetMode=[System.Drawing.Drawing2D.PixelOffsetMode]::Half
  $g.DrawImage($b,(New-Object System.Drawing.Rectangle 0,0,$n.Width,$n.Height),(New-Object System.Drawing.Rectangle $x,$y,$w,$h),[System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose(); $n.Save($out,[System.Drawing.Imaging.ImageFormat]::Png); $n.Dispose(); $b.Dispose()
}

