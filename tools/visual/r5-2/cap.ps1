. 'C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/visual/r5-2/m.ps1'
function HdrRuns($i) {
  $W = $i.W
  $s = $i.ColRuns(0,2,$W-1,52, $i.R(5,5),$i.G(5,5),$i.B(5,5), 40).Trim()
  $runs = @()
  foreach ($p in $s.Split(' ')) { if ($p) { $a,$b = $p.Split('-'); $runs += ,@([int]$a,[int]$b) } }
  return ,$runs
}
function Capsule($i) {
  # capsule = header run whose border at y=28 is followed by the dark fill (3,0,45)
  foreach ($run in (HdrRuns $i)) {
    $a=$run[0]; $b=$run[1]
    if (($b-$a) -lt 60) { continue }
    $f = $i.Diff($a+4,28,3,0,45)
    if ($f -lt 12) { return ,@($a,$b) }
  }
  return $null
}
function CapReport([string]$n) {
  $i = Tl $n
  $runs = HdrRuns $i
  $rs = ($runs | ForEach-Object { "$($_[0])-$($_[1])" }) -join ' '
  $c = Capsule $i
  if (-not $c) { return "$n W$($i.W) hdr[$rs] capsule not found" }
  $a=$c[0]; $b=$c[1]
  # vertical border rows at capsule centre column
  $mid = [int](($a+$b)/2)
  $vr = $i.RowRuns($mid,0,$mid,54,$i.R(5,5),$i.G(5,5),$i.B(5,5),40)
  $capc = $i.ColRuns($a+8,12,$b-8,24,3,0,45,40).Trim()
  $figc = $i.ColRuns($a+7,27,$b-7,41,3,0,45,40).Trim()
  $capr = $i.RowRuns($a+14,10,$b-14,25,3,0,45,40).Trim()
  $figr = $i.RowRuns($a+14,25,$b-14,45,3,0,45,40).Trim()
  function Ext($s) { if (-not $s) { return $null }; $p=$s.Split(' '); $f=[int]$p[0].Split('-')[0]; $l=[int]$p[-1].Split('-')[1]; return ,@($f,$l) }
  $ce = Ext $capc; $fe = Ext $figc
  $out = "$n W$($i.W) hdr[$rs] capsule x$a-$b (ctr $((($a+$b)/2))) midcol rows[$($vr.Trim())]"
  if ($ce) { $out += " | caption x$($ce[0])-$($ce[1]) ctr $((($ce[0]+$ce[1])/2)) gaps L$($ce[0]-$a-1) R$($b-$ce[1]-1) rows[$capr]" }
  if ($fe) { $out += " | figure x$($fe[0])-$($fe[1]) ctr $((($fe[0]+$fe[1])/2)) gaps L$($fe[0]-$a-1) R$($b-$fe[1]-1) rows[$figr]" }
  return $out
}

