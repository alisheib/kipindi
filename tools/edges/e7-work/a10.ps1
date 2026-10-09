. "$PSScriptRoot/m.ps1"
foreach($t in @(,@(403,290,568)) + @(,@(404,290,569)) + @(,@(415,290,568)) + @(,@(416,290,569)) + @(,@(427,290,568)) + @(,@(428,290,569)) + @(,@(437,357,677)) + @(,@(438,334,654)) + @(,@(443,357,656)) + @(,@(444,334,633))){
 $s=$t[0]; $b=Get-Tile $s; $W=$b.Width; $bg=$b.GetPixel(60,$t[1]+15)
 $rows=InkRows $b 40 ($W-41) ($t[1]+4) ($t[2]-4) $bg 45
 $top=$rows[0]; $bot=$rows[-1]; $above=$top-$t[1]; $below=$t[2]-$bot
 "#$s box $($t[1])-$($t[2]) bg $(Px $b 60 ($t[1]+15)) content ink $top-$bot  above $above below $below  diff $($above-$below) | rows $(Runs $rows)"
 $b.Dispose()
}
