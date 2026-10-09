param([string[]]$Seqs, [int]$Thr = 40, [int]$MinRun = 3)
. "C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\g5\edge.ps1"
if (-not ("G5Prof" -as [type])) {
Add-Type -TypeDefinition @"
using System;
using System.Text;
public static class G5Prof {
  static int D(byte[] p, int S, int x1, int y, int x2) {
    int a = y*S + x1*3, c = y*S + x2*3;
    return Math.Abs(p[a]-p[c]) + Math.Abs(p[a+1]-p[c+1]) + Math.Abs(p[a+2]-p[c+2]);
  }
  // Per row: the first sharp edge from the left and from the right (as a gap), then runs of equal values.
  public static string Runs(byte[] p, int W, int H, int S, int thr, int minRun) {
    int[] L = new int[H], R = new int[H];
    for (int y = 0; y < H; y++) {
      L[y] = -1; R[y] = -1;
      for (int x = 1; x < W; x++) if (D(p,S,x,y,x-1) > thr) { L[y] = x; break; }
      for (int x = W-2; x >= 0; x--) if (D(p,S,x,y,x+1) > thr) { R[y] = W-1-x; break; }
    }
    var sb = new StringBuilder();
    int s = 0;
    for (int y = 1; y <= H; y++) {
      if (y == H || L[y] != L[s] || R[y] != R[s]) {
        if (y - s >= minRun && L[s] >= 0) sb.Append("  y" + s + "-" + (y-1) + ":L" + L[s] + "/R" + R[s]);
        s = y;
      }
    }
    return sb.ToString();
  }
}
"@
}
$d = "C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles-h\"
foreach ($q in $Seqs) {
  $f = Get-ChildItem $d -Filter "$q--*" | Select-Object -First 1
  [G5Edge]::Load($f.FullName)
  $f.Name
  [G5Prof]::Runs([G5Edge]::px, [G5Edge]::W, [G5Edge]::H, [G5Edge]::S, $Thr, $MinRun)
}
