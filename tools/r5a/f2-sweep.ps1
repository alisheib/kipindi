. "$PSScriptRoot\mz.ps1"
$files = Get-ChildItem "$S\visual\tiles-r5" -Filter "*.png" | Where-Object { $_.Name -match "--root--" -and $_.Name -match "--(1024|1150|1280)\.png$" -and $_.Name -notmatch "sheet|wallet-sheet|focus|tabs" }
foreach ($f in $files) {
  $a = [Mz]::Load($f.FullName)
  $w = $a.GetLength(0); $h = $a.GetLength(1)
  # hero top = the claret line at x=5 (r>100, g<80)
  $heroTop = -1
  for ($y = 40; $y -lt 300; $y++) { if ($a[5,$y,0] -gt 100 -and $a[5,$y,1] -lt 80 -and $a[5,$y,2] -lt 110) { $heroTop = $y; break } }
  if ($heroTop -lt 0) { "$($f.Name): no hero top"; continue }
  $by = $heroTop + 6
  # claim ink top: first row with ink in the left column (x 16..(w/2-20))
  $bands = [Mz]::RowBands($a, 16, $heroTop + 3, [int]($w/2) - 20, $heroTop + 160, 5, $by, 60)
  $claimTop = ($bands.Trim() -split " ")[0]
  # card top: column at x = 3w/4 from heroTop+3
  $cx = [int]($w * 0.75)
  $col = [Mz]::Col($a, $cx, $heroTop + 3, $heroTop + 260, 5, $by, 30)
  $cardTop = ($col.Trim() -split " ")[0]
  "{0,-58} hero {1,3}  claim-ink {2,-9} card-col {3}" -f $f.Name.Replace('.png',''), $heroTop, $claimTop, $cardTop
}
