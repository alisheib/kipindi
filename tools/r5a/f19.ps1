. "$PSScriptRoot\mz.ps1"
$a = T "327"
"bg sample 340,600: " + [Mz]::Px($a, 340, 600)
"NDIO box: " + [Mz]::Box($a, 320, 574, 370, 588, 340, 600, 60)
"rowbands right col x320-370 y550-625: " + [Mz]::RowBands($a, 320, 550, 370, 625, 300, 600, 60)
"67% box: " + [Mz]::Box($a, 300, 590, 370, 620, 300, 600, 60)
"time box: " + [Mz]::Box($a, 240, 550, 370, 562, 300, 600, 60)
"bar row 637: " + [Mz]::Row($a, 637, 300, 375, 300, 600, 40)
"hapana btn row 670: " + [Mz]::Row($a, 670, 300, 375, 300, 600, 40)
"NDIO colbands: " + [Mz]::ColBands($a, 320, 574, 370, 588, 340, 600, 60)
