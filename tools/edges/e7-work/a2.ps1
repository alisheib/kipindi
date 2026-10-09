. "$PSScriptRoot/m.ps1"
foreach($s in 386,389,392,395,398,401,404,410,413,416,422,407,419,425,428,431,434){
  $b=Get-Tile $s; $y=27; $hdr=$b.GetPixel(250,4)
  # dark box: pixels darker than header bg along row y=12 between x 100 and 700
  $dark=@(); for($x=100;$x -le 700;$x++){ $c=$b.GetPixel($x,12); if(($c.R+$c.G+$c.B) -lt (($hdr.R+$hdr.G+$hdr.B)-30)){ $dark+=$x } }
  # underline rows: find bright-blue pixels at y 44-52 between x 100 and 700
  $ul=@(); for($x=100;$x -le 700;$x++){ for($yy=44;$yy -le 52;$yy++){ $c=$b.GetPixel($x,$yy); if($c.B -gt 150 -and $c.R -lt 120){ $ul+=$x; break } } }
  "#$s hdr $(Px $b 250 4) darkbox x: $(Runs $dark) | underline x: $(Runs $ul)"
  $b.Dispose()
}
