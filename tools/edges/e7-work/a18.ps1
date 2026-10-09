. "$PSScriptRoot/m.ps1"
foreach($s in 387,388,399,400,401,386){
 $b=Get-Tile $s; $bg=$b.GetPixel(250,4)
 $c=InkCols $b 0 240 8 48 $bg 50
 "#$s W$($b.Width) header left ink runs: $(Runs $c)"
 $b.Dispose()
}
