param([string]$Tile, [int]$YStart = 380, [int]$YEnd = 760, [int]$Thr = 60)
# Finds the featured card's LIVE chip (the first rose pixels in x 28..44 below YStart), then prints the ink runs of
# the chip line and of the line under it (columns from x 28 to the card's inner edge), with the gaps between runs.
Add-Type -AssemblyName System.Drawing
$b = [System.Drawing.Bitmap]::FromFile($Tile)
$W = $b.Width
$top = -1
for ($y = $YStart; $y -le $YEnd -and $top -lt 0; $y++) {
  for ($x = 28; $x -le 44; $x++) {
    $p = $b.GetPixel($x, $y)
    if ($p.R -gt 90 -and $p.R -gt $p.G + 40 -and $p.R -gt $p.B) { $top = $y; break }
  }
}
if ($top -lt 0) { "no chip"; $b.Dispose(); return }
# chip bottom: last row with rose in x 28..44
$bot = $top
for ($y = $top; $y -le $top + 30; $y++) {
  $hit = $false
  for ($x = 28; $x -le 44; $x++) { $p = $b.GetPixel($x, $y); if ($p.R -gt 90 -and $p.R -gt $p.G + 40 -and $p.R -gt $p.B) { $hit = $true; break } }
  if ($hit) { $bot = $y }
}
"chip y {0}..{1}  (W {2})" -f $top, $bot, $W
$b.Dispose()
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$bgx = $W - 20
"-- line 1 (text rows of the chip line)"
& "$here\r4a-colruns.ps1" -Tile $Tile -Y0 ($top + 4) -Y1 ($bot - 4) -X0 28 -X1 ($W - 28) -Thr $Thr -MinGap 4 -BgX $bgx -BgY ($top + 8)
"-- line 2 (the 22px under the chip line)"
& "$here\r4a-colruns.ps1" -Tile $Tile -Y0 ($bot + 3) -Y1 ($bot + 20) -X0 28 -X1 ($W - 28) -Thr $Thr -MinGap 4 -BgX $bgx -BgY ($bot + 3)
