. "$PSScriptRoot/m.ps1"
foreach($s in 401,413,425,386,392){
 $b=Get-Tile $s; $W=$b.Width; $bg=$b.GetPixel(250,4)
 $c=InkCols $b ($W-330) ($W-1) 8 48 $bg 50
 "#$s W$W header right-side ink runs: $(Runs $c)"
 $b.Dispose()
}
