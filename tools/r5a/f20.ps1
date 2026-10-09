. "$PSScriptRoot\mz.ps1"
foreach ($n in @("320","321","323","324")) {
  $a = T $n
  $bg = "200,235"
  # find the panel title row: scan the title region x30..130, y 215..255
  $tb = [Mz]::RowBands($a, 31, 215, 130, 255, 200, 236, 120)
  $fcol = [Mz]::RowBands($a, 33, 215, 36, 255, 200, 236, 120)
  $xb = [Mz]::RowBands($a, 320, 215, 350, 255, 200, 236, 60)
  $xbox = [Mz]::Box($a, 320, 215, 350, 255, 200, 236, 60)
  "$n title rows: $tb | 'F' stem rows (x33-36): $fcol | x rows: $xb | x box: $xbox"
}
