. "$PSScriptRoot/m.ps1"
foreach($s in 435,436,437,439,441,442,443,445,447,448,387,388,390,393){
 $b=Get-Tile $s; $W=$b.Width; $bg=$b.GetPixel(100,3)
 $c=InkCols $b 0 ($W-1) 10 45 $bg 60
 "#$s W$W header bg $(Px $b 100 3) ink runs y10-45: $(Runs $c)"
 $b.Dispose()
}
