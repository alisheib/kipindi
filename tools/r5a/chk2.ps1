. "$PSScriptRoot\mz.ps1"
$a = T "193"
"bg 200,330: " + [Mz]::Px($a, 200, 330)
"col x=17 (box left border) 255-420: " + [Mz]::Col($a, 17, 255, 420, 200, 330, 30)
"col x=25 (Wazi pill) 330-400: " + [Mz]::Col($a, 25, 330, 400, 200, 330, 30)
"col x=360 (filters btn) 330-400: " + [Mz]::Col($a, 360, 330, 400, 200, 330, 30)
"row bands x16-374 y255-420: " + [Mz]::RowBands($a, 16, 255, 374, 420, 200, 330, 30)
