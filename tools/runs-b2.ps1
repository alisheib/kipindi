param([string]$Tile,[int]$Y=28,[int]$Thr=25,[double]$From=0.3)
Add-Type -AssemblyName System.Drawing
$bm=[System.Drawing.Bitmap]::FromFile($Tile)
$bgc=$bm.GetPixel([int]($bm.Width*$From),3); $bsum=$bgc.R+$bgc.G+$bgc.B
$runs=@(); $inside=$false; $st=0
for($xx=[int]($bm.Width*$From);$xx -lt $bm.Width;$xx++){ $px=$bm.GetPixel($xx,$Y); $dd=[Math]::Abs(($px.R+$px.G+$px.B)-$bsum); if($dd -gt $Thr){ if(-not $inside){$st=$xx;$inside=$true} } else { if($inside){ $runs+="$st..$($xx-1)"; $inside=$false } } }
if($inside){$runs+="$st..$($bm.Width-1)"}
$bm.Dispose()
$runs -join ' '
