Add-Type -AssemblyName System.Drawing
if (-not ('E1Px' -as [type])) {
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System; using System.Drawing; using System.Drawing.Imaging; using System.Collections.Generic; using System.Text; using System.IO;
public class E1Px {
  public static string Dir = @"C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/edges/tiles";
  static Dictionary<string, Tuple<int,int,int,byte[]>> cache = new Dictionary<string, Tuple<int,int,int,byte[]>>();
  static Tuple<int,int,int,byte[]> T(string n) {
    if (cache.ContainsKey(n)) return cache[n];
    string f = Directory.GetFiles(Dir, n + "*.png")[0];
    using (var b = new Bitmap(f)) {
      var d = b.LockBits(new Rectangle(0,0,b.Width,b.Height), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
      var bytes = new byte[d.Stride*b.Height];
      System.Runtime.InteropServices.Marshal.Copy(d.Scan0, bytes, 0, bytes.Length);
      var t = Tuple.Create(b.Width, b.Height, d.Stride, bytes); b.UnlockBits(d); cache[n] = t; return t; }
  }
  public static string Size(string n) { var t = T(n); return t.Item1 + "x" + t.Item2; }
  static int[] P(Tuple<int,int,int,byte[]> t, int x, int y) { int i = y*t.Item3 + x*4; return new int[]{ t.Item4[i+2], t.Item4[i+1], t.Item4[i] }; }
  static int D(int[] a, int[] b) { return Math.Abs(a[0]-b[0]) + Math.Abs(a[1]-b[1]) + Math.Abs(a[2]-b[2]); }
  public static string Px(string n, int x, int y) { var p = P(T(n), x, y); return p[0]+","+p[1]+","+p[2]; }
  public static string Lines(string n, int x0, int x1, int y0, int y1, int bx, int by, int thr) {
    var t = T(n); var bg = P(t,bx,by); var sb = new StringBuilder(); int cy0=-1, cy1=-1, cx0=99999, cx1=-1;
    for (int y=y0; y<=y1; y++) { int mn=99999, mx=-1; for (int x=x0; x<=x1; x++) { if (D(P(t,x,y),bg) > thr) { if (x<mn) mn=x; mx=x; } }
      if (mx>=0) { if (cy0<0) { cy0=y; cx0=mn; cx1=mx; } else { if (mn<cx0) cx0=mn; if (mx>cx1) cx1=mx; } cy1=y; }
      else if (cy0>=0) { sb.AppendFormat("y{0}-{1} x{2}-{3}\n", cy0, cy1, cx0, cx1); cy0=-1; cx0=99999; cx1=-1; } }
    if (cy0>=0) sb.AppendFormat("y{0}-{1} x{2}-{3}\n", cy0, cy1, cx0, cx1);
    return sb.ToString(); }
  public static string Cols(string n, int x0, int x1, int y0, int y1, int bx, int by, int thr, int gap) {
    var t = T(n); var bg = P(t,bx,by); var sb = new StringBuilder(); int cx0=-1, cx1=-1, cy0=99999, cy1=-1, miss=0;
    for (int x=x0; x<=x1; x++) { int mn=99999, mx=-1; for (int y=y0; y<=y1; y++) { if (D(P(t,x,y),bg) > thr) { if (y<mn) mn=y; mx=y; } }
      if (mx>=0) { if (cx0<0) { cx0=x; cy0=mn; cy1=mx; } else { if (mn<cy0) cy0=mn; if (mx>cy1) cy1=mx; } cx1=x; miss=0; }
      else if (cx0>=0) { miss++; if (miss>=gap) { sb.AppendFormat("x{0}-{1} y{2}-{3}\n", cx0, cx1, cy0, cy1); cx0=-1; cy0=99999; cy1=-1; miss=0; } } }
    if (cx0>=0) sb.AppendFormat("x{0}-{1} y{2}-{3}\n", cx0, cx1, cy0, cy1);
    return sb.ToString(); }
  public static string EdgesX(string n, int y, int x0, int x1, int thr) { var t = T(n); var sb = new StringBuilder(); var prev = P(t,x0,y);
    for (int x=x0+1; x<=x1; x++) { var p = P(t,x,y); if (D(p,prev) > thr) sb.AppendFormat("{0}({1},{2},{3}) ", x, p[0], p[1], p[2]); prev = p; } return sb.ToString(); }
  public static string EdgesY(string n, int x, int y0, int y1, int thr) { var t = T(n); var sb = new StringBuilder(); var prev = P(t,x,y0);
    for (int y=y0+1; y<=y1; y++) { var p = P(t,x,y); if (D(p,prev) > thr) sb.AppendFormat("{0}({1},{2},{3}) ", y, p[0], p[1], p[2]); prev = p; } return sb.ToString(); }
  public static string Row(string n, int y, int x0, int x1, int step) { var t = T(n); var sb = new StringBuilder(); for (int x=x0; x<=x1; x+=step) { var p = P(t,x,y); sb.AppendFormat("{0}:{1},{2},{3} ", x, p[0], p[1], p[2]); } return sb.ToString(); }
  public static string Col(string n, int x, int y0, int y1, int step) { var t = T(n); var sb = new StringBuilder(); for (int y=y0; y<=y1; y+=step) { var p = P(t,x,y); sb.AppendFormat("{0}:{1},{2},{3} ", y, p[0], p[1], p[2]); } return sb.ToString(); }
  // count pixels in box matching a colour within thr
  public static string Find(string n, int x0, int x1, int y0, int y1, int r, int g, int b, int thr) { var t = T(n); int c=0, mnx=99999, mxx=-1, mny=99999, mxy=-1; var tg = new int[]{r,g,b};
    for (int y=y0; y<=y1; y++) for (int x=x0; x<=x1; x++) { if (D(P(t,x,y),tg) <= thr) { c++; if (x<mnx) mnx=x; if (x>mxx) mxx=x; if (y<mny) mny=y; if (y>mxy) mxy=y; } }
    return c + " px, box x" + mnx + "-" + mxx + " y" + mny + "-" + mxy; }
}
'@
}
function Lines($n,$x0,$x1,$y0,$y1,$bx,$by,$thr=60){ [E1Px]::Lines($n,$x0,$x1,$y0,$y1,$bx,$by,$thr) }
function Cols($n,$x0,$x1,$y0,$y1,$bx,$by,$thr=60,$gap=1){ [E1Px]::Cols($n,$x0,$x1,$y0,$y1,$bx,$by,$thr,$gap) }
function EdgesX($n,$y,$x0,$x1,$thr=30){ [E1Px]::EdgesX($n,$y,$x0,$x1,$thr) }
function EdgesY($n,$x,$y0,$y1,$thr=30){ [E1Px]::EdgesY($n,$x,$y0,$y1,$thr) }
function Row($n,$y,$x0,$x1,$step=1){ [E1Px]::Row($n,$y,$x0,$x1,$step) }
function Col($n,$x,$y0,$y1,$step=1){ [E1Px]::Col($n,$x,$y0,$y1,$step) }
function Pxx($n,$x,$y){ [E1Px]::Px($n,$x,$y) }
function FindC($n,$x0,$x1,$y0,$y1,$r,$g,$b,$thr=30){ [E1Px]::Find($n,$x0,$x1,$y0,$y1,$r,$g,$b,$thr) }
