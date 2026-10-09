. "$PSScriptRoot\mz.ps1"
$a = T '315'
"315 col x300 (row lines / card edges): " + [Mz]::Col($a, 300, 560, 660, 200, 560, 30)
"315 chevron rows y600-620, x330-362: " + [Mz]::Box($a, 330, 598, 359, 622, 300, 610, 60)
"315 card right border at y610, x360-389: " + [Mz]::Row($a, 610, 340, 389, 300, 610, 30)
