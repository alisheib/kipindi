param([string]$Dir, [string[]]$Tiles, [int]$MinY = 56)
# Finds the Needle by its enamel faces: the densest 3x3 block of 16px cells of face pixels, then the face bbox
# within 40px of that block. Prints the face bbox, its centre, and the disc box implied by the size rule.
Add-Type -AssemblyName System.Drawing
foreach ($t in $Tiles) {
  $f = Get-ChildItem $Dir | Where-Object { $_.Name -like "$t--*" } | Select-Object -First 1
  if (-not $f) { "$t : no tile"; continue }
  $bmp = [System.Drawing.Bitmap]::FromFile($f.FullName)
  $W = $bmp.Width; $H = $bmp.Height
  $data = $bmp.LockBits((New-Object System.Drawing.Rectangle 0, 0, $W, $H), [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $bytes = New-Object byte[] ($data.Stride * $H)
  [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)
  $stride = $data.Stride
  $bmp.UnlockBits($data); $bmp.Dispose()
  $CW = [int][Math]::Ceiling($W / 16); $CH = [int][Math]::Ceiling($H / 16)
  $cells = New-Object int[] ($CW * $CH)
  $isFace = New-Object bool[] ($W * $H)
  for ($y = $MinY; $y -lt $H; $y++) {
    $row = $y * $stride
    for ($x = 0; $x -lt $W; $x++) {
      $i = $row + 4 * $x; $B = $bytes[$i]; $G = $bytes[$i + 1]; $R = $bytes[$i + 2]
      if (($G -gt 70 -and $G -gt $R + 45 -and $G -gt $B + 15 -and $R -lt 90) -or ($R -gt 90 -and $R -gt $G + 55 -and $R -gt $B + 40 -and $G -lt 80)) {
        $isFace[$y * $W + $x] = $true
        $cells[[int][Math]::Floor($y / 16) * $CW + [int][Math]::Floor($x / 16)]++
      }
    }
  }
  $best = -1; $bi = 0; $bj = 0
  for ($j = 0; $j -lt $CH; $j++) { for ($i2 = 0; $i2 -lt $CW; $i2++) {
    $s = 0
    for ($dj = -1; $dj -le 1; $dj++) { for ($di = -1; $di -le 1; $di++) {
      $jj = $j + $dj; $ii = $i2 + $di
      if ($jj -ge 0 -and $jj -lt $CH -and $ii -ge 0 -and $ii -lt $CW) { $s += $cells[$jj * $CW + $ii] }
    } }
    if ($s -gt $best) { $best = $s; $bi = $i2; $bj = $j }
  } }
  $wx0 = [Math]::Max(0, ($bi - 1) * 16 - 40); $wx1 = [Math]::Min($W - 1, ($bi + 2) * 16 + 40)
  $wy0 = [Math]::Max($MinY, ($bj - 1) * 16 - 40); $wy1 = [Math]::Min($H - 1, ($bj + 2) * 16 + 40)
  $x0 = 99999; $x1 = -1; $y0 = 99999; $y1 = -1; $n = 0
  for ($y = $wy0; $y -le $wy1; $y++) { for ($x = $wx0; $x -le $wx1; $x++) {
    if ($isFace[$y * $W + $x]) { $n++; if ($x -lt $x0) { $x0 = $x }; if ($x -gt $x1) { $x1 = $x }; if ($y -lt $y0) { $y0 = $y }; if ($y -gt $y1) { $y1 = $y } }
  } }
  $Hh = if ($W -lt 1024) { 780 } else { 900 }
  $size = [Math]::Round([Math]::Min([Math]::Max([Math]::Min($W, $Hh) * 0.155, 56), 64))
  "{0}  size {1}  face n={2} x{3}-{4} y{5}-{6} (w{7} h{8})  centre ~{9},{10}  vw {11}" -f $f.Name, $size, $n, $x0, $x1, $y0, $y1, ($x1 - $x0 + 1), ($y1 - $y0 + 1), (($x0 + $x1 + 1) / 2), (($y0 + $y1 + 1) / 2), $W
}
