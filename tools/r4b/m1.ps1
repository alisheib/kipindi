. "$PSScriptRoot\mz.ps1"
foreach ($n in '313','305') {
  $a = T $n
  "== $n  size " + $a.GetLength(0) + "x" + $a.GetLength(1)
  "bg 200,650: " + [Mz]::Px($a,200,650) + "  bg 230,640: " + [Mz]::Px($a,230,640) + "  bg 310,560: " + [Mz]::Px($a,310,560)
  for ($y = 540; $y -le 712; $y += 4) { "y$y " + [Mz]::RowPx($a,$y,244,319,3) }
}
