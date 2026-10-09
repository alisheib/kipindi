. "$PSScriptRoot\mz.ps1"
function Prof($a, $x0, $x1, $y0, $y1) {
  $out = @()
  for ($y = $y0; $y -le $y1; $y++) {
    $mx = 0; $sum = 0
    for ($x = $x0; $x -le $x1; $x++) { $d = $a[$x,$y,0] + $a[$x,$y,1] + $a[$x,$y,2] - 48; if ($d -gt $mx) { $mx = $d }; if ($d -gt 30) { $sum++ } }
    $out += "$y:max$mx/n$sum"
  }
  return ($out -join "  ")
}
$a = T "028"; "028 en1280 claim x24-520: " + (Prof $a 24 520 190 206)
$a = T "040"; "040 en1280 claim: " + (Prof $a 24 520 190 206)
$a = T "026"; "026 en1024 claim text x100-500: " + (Prof $a 100 500 188 206)
$a = T "004"; "004 classic en1280: " + (Prof $a 16 520 120 137)
$a = T "036"; "036 zh1280: " + (Prof $a 24 520 188 206)
