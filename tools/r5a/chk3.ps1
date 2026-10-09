. "$PSScriptRoot\mz.ps1"
$a = T "170"
"bg 400,560: " + [Mz]::Px($a, 400, 560)
"cat chip col x=110: " + [Mz]::ColPx($a, 110, 560, 586, 1)
"state chip col x=240: " + [Mz]::ColPx($a, 240, 560, 586, 1)
"cat chip box: " + [Mz]::Box($a, 62, 558, 160, 588, 400, 560, 30)
"state chip box: " + [Mz]::Box($a, 162, 558, 320, 588, 400, 560, 30)
