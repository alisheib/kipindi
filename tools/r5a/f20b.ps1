. "$PSScriptRoot\mz.ps1"
$a = T "320"
"bg: " + [Mz]::Px($a, 200, 236)
"F stem col x34: " + [Mz]::ColPx($a, 34, 226, 243, 1)
"F stem col x35: " + [Mz]::ColPx($a, 35, 226, 243, 1)
# x glyph: per-row max intensity across x 328..342
for ($y = 229; $y -le 243; $y++) { $mx = 0; for ($x = 328; $x -le 342; $x++) { $d = $a[$x,$y,0] + $a[$x,$y,1] + $a[$x,$y,2]; if ($d -gt $mx) { $mx = $d } }; "x row ${y}: max sum $mx" }
