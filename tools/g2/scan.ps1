param(
  [string]$Seq,
  [ValidateSet('col','row')][string]$Mode = 'col',
  [int]$At,
  [int]$From = 0,
  [int]$To = -1,
  [int]$Tol = 6
)
# Prints runs of near-identical colour along one column (Mode col, x=$At) or one row (Mode row, y=$At).
Add-Type -AssemblyName System.Drawing
$t = 'C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles'
$f = Get-ChildItem $t -Filter "$Seq--*" | Select-Object -First 1
$b = [System.Drawing.Bitmap]::FromFile($f.FullName)
if ($To -lt 0) { $To = if ($Mode -eq 'col') { $b.Height - 1 } else { $b.Width - 1 } }
$prev = $null; $start = $From
function Px($i) { if ($Mode -eq 'col') { $b.GetPixel($At, $i) } else { $b.GetPixel($i, $At) } }
for ($i = $From; $i -le $To; $i++) {
  $c = Px $i
  if ($null -ne $prev) {
    $d = [Math]::Abs($c.R - $prev.R) + [Math]::Abs($c.G - $prev.G) + [Math]::Abs($c.B - $prev.B)
    if ($d -gt $Tol) {
      "{0,4}-{1,4} ({2,3}) rgb({3},{4},{5})" -f $start, ($i - 1), ($i - $start), $prev.R, $prev.G, $prev.B
      $start = $i
    }
  }
  $prev = $c
}
"{0,4}-{1,4} ({2,3}) rgb({3},{4},{5})" -f $start, $To, ($To - $start + 1), $prev.R, $prev.G, $prev.B
$b.Dispose()
