Add-Type -AssemblyName System.Drawing
if (-not ("G5Edge" -as [type])) {
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.Collections.Generic;
public static class G5Edge {
  public static byte[] px; public static int W, H, S;
  public static void Load(string path) {
    using (var b = new Bitmap(path)) {
      W = b.Width; H = b.Height;
      var d = b.LockBits(new Rectangle(0,0,W,H), ImageLockMode.ReadOnly, PixelFormat.Format24bppRgb);
      S = d.Stride; px = new byte[S*H];
      Marshal.Copy(d.Scan0, px, 0, S*H); b.UnlockBits(d);
    }
  }
  static int Diff(int x1, int y1, int x2, int y2) {
    int a = y1*S + x1*3, c = y2*S + x2*3;
    return Math.Abs(px[a]-px[c]) + Math.Abs(px[a+1]-px[c+1]) + Math.Abs(px[a+2]-px[c+2]);
  }
  // Ink against the row's own reference pixel at refX (header: a flat panel).
  public static string Band(int y0, int y1, int thr, int refX) {
    int L = -1, R = -1;
    for (int x = 0; x < W && L < 0; x++) for (int y = y0; y <= y1; y++) if (Diff(x,y,refX,y) > thr) { L = x; break; }
    int rRef = W - 1 - refX;
    for (int x = W-1; x >= 0 && R < 0; x--) for (int y = y0; y <= y1; y++) if (Diff(x,y,rRef,y) > thr) { R = x; break; }
    return "L=" + L + " R=" + R + " (right gap " + (W-1-R) + ")";
  }
  // Sharp-edge ink: first x where the pixel differs from its outer neighbour by > thr. Returns a histogram.
  public static string Rows(int y0, int y1, int thr, int minRows, int xMax) {
    var lh = new SortedDictionary<int,int>(); var rh = new SortedDictionary<int,int>();
    for (int y = y0; y <= y1; y++) {
      for (int x = 1; x < xMax; x++) if (Diff(x,y,x-1,y) > thr) { int v; lh.TryGetValue(x, out v); lh[x] = v+1; break; }
      for (int x = W-2; x > W-1-xMax; x--) if (Diff(x,y,x+1,y) > thr) { int r = W-1-x; int v; rh.TryGetValue(r, out v); rh[r] = v+1; break; }
    }
    var sb = new System.Text.StringBuilder("left:");
    int n = 0; foreach (var kv in lh) { if (kv.Value >= minRows) { sb.Append(" " + kv.Key + "x" + kv.Value); if (++n >= 6) break; } }
    sb.Append(" | rightgap:"); n = 0;
    foreach (var kv in rh) { if (kv.Value >= minRows) { sb.Append(" " + kv.Key + "x" + kv.Value); if (++n >= 6) break; } }
    return sb.ToString();
  }
  public static string Pix(int x, int y) { int a = y*S + x*3; return "rgb(" + px[a+2] + "," + px[a+1] + "," + px[a] + ")"; }
}
"@
}
