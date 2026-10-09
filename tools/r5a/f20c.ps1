. "$PSScriptRoot\mz.ps1"
$a = T "320"
"col x=200 170-270: " + [Mz]::ColPx($a, 200, 172, 215, 1)
"col x=20 170-215: " + [Mz]::ColPx($a, 20, 172, 215, 1)
