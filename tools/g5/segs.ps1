param([string]$Filter = "*", [int]$Thr = 40, [int]$MinGap = 4)
. "C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\g5\edge.ps1"
if (-not ("G5Seg" -as [type])) {
Add-Type -TypeDefinition @"
using System;
using System.Text;
public static class G5Seg {
  // Header band rows y0..y1: a column is ink when any row differs from the bg pixel (refX, same row) by > thr.
  // Segments of ink separated by gaps of >= minGap columns are printed as [start-end].
  public static string Segs(byte[] p, int W, int H, int S, int y0, int y1, int thr, int minGap, int refX) {
    bool[] ink = new bool[W];
    for (int x = 0; x < W; x++) for (int y = y0; y <= y1; y++) {
      int a = y*S + x*3, c = y*S + refX*3;
      if (Math.Abs(p[a]-p[c]) + Math.Abs(p[a+1]-p[c+1]) + Math.Abs(p[a+2]-p[c+2]) > thr) { ink[x] = true; break; }
    }
    var sb = new StringBuilder();
    int s = -1, lastInk = -100;
    for (int x = 0; x <= W; x++) {
      bool on = x < W && ink[x];
      if (on) {
        if (s < 0) s = x;
        else if (x - lastInk - 1 >= minGap) { sb.Append("[" + s + "-" + lastInk + "] gap" + (x - lastInk - 1) + " "); s = x; }
        lastInk = x;
      }
    }
    if (s >= 0) sb.Append("[" + s + "-" + lastInk + "] rgap" + (W - 1 - lastInk));
    return sb.ToString();
  }
}
"@
}
$d = "C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles-h\"
Get-ChildItem $d -Filter "$Filter.png" | Sort-Object Name | ForEach-Object {
  [G5Edge]::Load($_.FullName)
  "{0,-62} {1}" -f $_.BaseName, [G5Seg]::Segs([G5Edge]::px, [G5Edge]::W, [G5Edge]::H, [G5Edge]::S, 1, 53, $Thr, $MinGap, 1)
}
