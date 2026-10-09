. "$PSScriptRoot\mz.ps1"
$a = T "208"
function MaxInk($a, $x0, $x1, $y0, $y1) { $mx = 0; $best = ""; for ($y = $y0; $y -le $y1; $y++) { for ($x = $x0; $x -le $x1; $x++) { $s = $a[$x,$y,0] + $a[$x,$y,1] + $a[$x,$y,2]; if ($s -gt $mx) { $mx = $s; $best = "$x,$y " + [Mz]::Px($a, $x, $y) } } }; return $best }
"line1 brightest: " + (MaxInk $a 95 300 598 625)
"line2 brightest: " + (MaxInk $a 95 300 633 660)
"line3 brightest: " + (MaxInk $a 95 340 669 690)
"bg col x=60 y600-714: " + [Mz]::ColPx($a, 60, 596, 714, 6)
"bg col x=250 y693-714: " + [Mz]::ColPx($a, 250, 692, 714, 2)
