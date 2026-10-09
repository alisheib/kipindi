. "$PSScriptRoot\mz.ps1"
$a = T "210"
"bg 300,600: " + [Mz]::Px($a, 300, 600)
"header box rows (x=20 col): " + [Mz]::Col($a, 17, 540, 720, 300, 600, 40)
"row 650 x0-389: " + [Mz]::Row($a, 650, 0, 389, 300, 600, 40)
"title rowbands x95-372 y590-660: " + [Mz]::RowBands($a, 95, 590, 340, 660, 300, 600, 80)
"line1 box: " + [Mz]::Box($a, 90, 597, 372, 622, 300, 600, 80)
"line2 box: " + [Mz]::Box($a, 90, 628, 372, 660, 300, 600, 80)
"line1 colbands: " + [Mz]::ColBands($a, 90, 597, 372, 622, 300, 600, 80)
"eyebrow box: " + [Mz]::Box($a, 90, 572, 372, 586, 300, 600, 80)
"glyph box: " + [Mz]::Box($a, 36, 570, 88, 625, 300, 600, 40)
"right border row 640: " + [Mz]::RowPx($a, 640, 360, 380, 1)
