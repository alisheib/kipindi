param([int]$seq, [int]$x0, [int]$y0, [int]$x1, [int]$y1, [string]$mode = 'any', [int]$thr = 60)
Add-Type -AssemblyName System.Drawing
$T = 'C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/edges/tiles'
$f = Get-ChildItem $T -Filter ("{0:D3}--*.png" -f $seq) | Select-Object -First 1
$b = [System.Drawing.Bitmap]::FromFile($f.FullName)
$bg = $b.GetPixel($x0, $y0)
$minx = 99999; $miny = 99999; $maxx = -1; $maxy = -1; $n = 0
for ($y = $y0; $y -le $y1; $y++) { for ($x = $x0; $x -le $x1; $x++) {
  $c = $b.GetPixel($x, $y)
  $d = [Math]::Abs($c.R - $bg.R) + [Math]::Abs($c.G - $bg.G) + [Math]::Abs($c.B - $bg.B)
  $hit = $false
  if ($mode -eq 'any') { $hit = $d -gt $thr }
  elseif ($mode -eq 'text') { $hit = ($d -gt $thr) -and ([Math]::Abs($c.R - $c.B) -lt 90) -and ($c.G -lt $c.B + 40) -and -not ($c.G -gt $c.R + 30) }
  elseif ($mode -eq 'disc') { $hit = (($c.G -gt $c.R + 30 -and $c.G -gt 80) -or ($c.R -gt $c.G + 40 -and $c.R -gt 90)) }
  if ($hit) { $n++; if ($x -lt $minx) { $minx = $x }; if ($x -gt $maxx) { $maxx = $x }; if ($y -lt $miny) { $miny = $y }; if ($y -gt $maxy) { $maxy = $y } }
} }
$b.Dispose()
"$($f.Name) mode=$mode box x$x0-$x1 y$y0-$y1 bg=$($bg.R),$($bg.G),$($bg.B): ink x$minx-$maxx y$miny-$maxy n=$n"
