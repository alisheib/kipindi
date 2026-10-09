param([string]$Tile, [string]$Mode = 'row', [int]$At = 0, [int]$From = 0, [int]$To = -1, [int]$Thr = 40, [int]$RefX = -1, [int]$RefY = -1, [switch]$Raw)
# Mode row: scan row y=$At from x=$From..$To; col: scan column x=$At from y=$From..$To.
# Prints runs of pixels differing from reference (RefX,RefY or first pixel) by > Thr (sum RGB abs diff), with colours.
Add-Type -AssemblyName System.Drawing
$b = [System.Drawing.Bitmap]::FromFile($Tile)
if ($Mode -eq 'row') { if ($To -lt 0) { $To = $b.Width - 1 } } else { if ($To -lt 0) { $To = $b.Height - 1 } }
function px($i) { if ($Mode -eq 'row') { $b.GetPixel($i, $At) } else { $b.GetPixel($At, $i) } }
if ($RefX -ge 0) { $ref = $b.GetPixel($RefX, $RefY) } else { $ref = px $From }
if ($Raw) {
  $o = @()
  for ($i = $From; $i -le $To; $i++) { $p = px $i; $o += ('{0}:{1:X2}{2:X2}{3:X2}' -f $i, $p.R, $p.G, $p.B) }
  $o -join ' '
} else {
  $run = $null
  for ($i = $From; $i -le $To; $i++) {
    $p = px $i
    $d = [Math]::Abs($p.R - $ref.R) + [Math]::Abs($p.G - $ref.G) + [Math]::Abs($p.B - $ref.B)
    if ($d -gt $Thr) {
      if ($run -eq $null) { $run = @{ s = $i; e = $i; c = $p } } else { $run.e = $i }
    } elseif ($run -ne $null) {
      '{0}..{1} ({2:X2}{3:X2}{4:X2})' -f $run.s, $run.e, $run.c.R, $run.c.G, $run.c.B
      $run = $null
    }
  }
  if ($run -ne $null) { '{0}..{1} ({2:X2}{3:X2}{4:X2})' -f $run.s, $run.e, $run.c.R, $run.c.G, $run.c.B }
  'ref={0:X2}{1:X2}{2:X2}' -f $ref.R, $ref.G, $ref.B
}
$b.Dispose()
