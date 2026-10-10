Add-Type -AssemblyName System.Drawing
$src = @"
using System;
using System.Text;
using System.Drawing;
using System.Drawing.Imaging;
using System.Drawing.Drawing2D;
using System.Runtime.InteropServices;
public class Img {
  public int W, H, S; public byte[] B; public string Path;
  public Img(string path) {
    Path = path;
    using (var b0 = new Bitmap(path)) {
      W = b0.Width; H = b0.Height;
      var rect = new Rectangle(0,0,W,H);
      using (var b = b0.Clone(rect, PixelFormat.Format32bppArgb)) {
        var d = b.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
        S = d.Stride; B = new byte[S*H];
        Marshal.Copy(d.Scan0, B, 0, B.Length);
        b.UnlockBits(d);
      }
    }
  }
  public int R(int x,int y){return B[y*S+x*4+2];}
  public int G(int x,int y){return B[y*S+x*4+1];}
  public int Bl(int x,int y){return B[y*S+x*4];}
  public string P(int x,int y){return R(x,y)+","+G(x,y)+","+Bl(x,y);}
  public int Sum(int x,int y){return R(x,y)+G(x,y)+Bl(x,y);}
  public int D(int x,int y,int r,int g,int b){return Math.Abs(R(x,y)-r)+Math.Abs(G(x,y)-g)+Math.Abs(Bl(x,y)-b);}
  public int DP(int x,int y,int x2,int y2){return Math.Abs(R(x,y)-R(x2,y2))+Math.Abs(G(x,y)-G(x2,y2))+Math.Abs(Bl(x,y)-Bl(x2,y2));}
  // ink bbox in region vs bg pixel (bx,by)
  public string BBox(int x0,int y0,int x1,int y1,int bx,int by,int th){
    int r=R(bx,by),g=G(bx,by),b=Bl(bx,by);
    int minx=int.MaxValue,miny=int.MaxValue,maxx=-1,maxy=-1;
    for(int y=y0;y<=y1;y++)for(int x=x0;x<=x1;x++){ if(D(x,y,r,g,b)>th){ if(x<minx)minx=x; if(x>maxx)maxx=x; if(y<miny)miny=y; if(y>maxy)maxy=y; } }
    if(maxx<0) return "none";
    return "x"+minx+"-"+maxx+" y"+miny+"-"+maxy;
  }
  // ink bbox vs local bg: each row's bg is the pixel at (bx, y)
  public string BBoxRowBg(int x0,int y0,int x1,int y1,int bx,int th){
    int minx=int.MaxValue,miny=int.MaxValue,maxx=-1,maxy=-1;
    for(int y=y0;y<=y1;y++){ int r=R(bx,y),g=G(bx,y),b=Bl(bx,y); for(int x=x0;x<=x1;x++){ if(D(x,y,r,g,b)>th){ if(x<minx)minx=x; if(x>maxx)maxx=x; if(y<miny)miny=y; if(y>maxy)maxy=y; } } }
    if(maxx<0) return "none";
    return "x"+minx+"-"+maxx+" y"+miny+"-"+maxy;
  }
  public string RowRuns(int x0,int y0,int x1,int y1,int bx,int by,int th){
    int r=R(bx,by),g=G(bx,by),b=Bl(bx,by);
    var sb=new StringBuilder(); int start=-1;
    for(int y=y0;y<=y1+1;y++){ bool ink=false; if(y<=y1) for(int x=x0;x<=x1;x++){ if(D(x,y,r,g,b)>th){ink=true;break;} }
      if(ink&&start<0) start=y; if(!ink&&start>=0){ sb.Append(start+"-"+(y-1)+" "); start=-1; } }
    return sb.ToString();
  }
  public string ColRuns(int x0,int y0,int x1,int y1,int bx,int by,int th){
    int r=R(bx,by),g=G(bx,by),b=Bl(bx,by);
    var sb=new StringBuilder(); int start=-1;
    for(int x=x0;x<=x1+1;x++){ bool ink=false; if(x<=x1) for(int y=y0;y<=y1;y++){ if(D(x,y,r,g,b)>th){ink=true;break;} }
      if(ink&&start<0) start=x; if(!ink&&start>=0){ sb.Append(start+"-"+(x-1)+" "); start=-1; } }
    return sb.ToString();
  }
  // row runs with per-row local bg at column bx
  public string RowRunsL(int x0,int y0,int x1,int y1,int bx,int th){
    var sb=new StringBuilder(); int start=-1;
    for(int y=y0;y<=y1+1;y++){ bool ink=false; if(y<=y1){ int r=R(bx,y),g=G(bx,y),b=Bl(bx,y); for(int x=x0;x<=x1;x++){ if(D(x,y,r,g,b)>th){ink=true;break;} } }
      if(ink&&start<0) start=y; if(!ink&&start>=0){ sb.Append(start+"-"+(y-1)+" "); start=-1; } }
    return sb.ToString();
  }
  // column runs with per-row local bg at column bx
  public string ColRunsL(int x0,int y0,int x1,int y1,int bx,int th){
    var sb=new StringBuilder(); int start=-1;
    for(int x=x0;x<=x1+1;x++){ bool ink=false; if(x<=x1) for(int y=y0;y<=y1;y++){ int r=R(bx,y),g=G(bx,y),b=Bl(bx,y); if(D(x,y,r,g,b)>th){ink=true;break;} }
      if(ink&&start<0) start=x; if(!ink&&start>=0){ sb.Append(start+"-"+(x-1)+" "); start=-1; } }
    return sb.ToString();
  }
  public string Row(int x0,int x1,int y){ var sb=new StringBuilder(); for(int x=x0;x<=x1;x++) sb.Append(x+":"+P(x,y)+" "); return sb.ToString(); }
  public string Col(int x,int y0,int y1){ var sb=new StringBuilder(); for(int y=y0;y<=y1;y++) sb.Append(y+":"+P(x,y)+" "); return sb.ToString(); }
  // transitions along a row: where colour changes by > th from previous pixel
  public string RowEdges(int x0,int x1,int y,int th){ var sb=new StringBuilder(); for(int x=x0+1;x<=x1;x++){ if(DP(x,y,x-1,y)>th) sb.Append(x+":"+P(x-1,y)+">"+P(x,y)+" "); } return sb.ToString(); }
  public string ColEdges(int x,int y0,int y1,int th){ var sb=new StringBuilder(); for(int y=y0+1;y<=y1;y++){ if(DP(x,y,x,y-1)>th) sb.Append(y+":"+P(x,y-1)+">"+P(x,y)+" "); } return sb.ToString(); }
  // brightest pixel in region (max sum) and its colour
  public string Max(int x0,int y0,int x1,int y1){ int best=-1,bx=0,by=0; for(int y=y0;y<=y1;y++)for(int x=x0;x<=x1;x++){int s=Sum(x,y); if(s>best){best=s;bx=x;by=y;}} return bx+","+by+" "+P(bx,by); }
  public static void Zoom(string path,int x,int y,int w,int h,int s,string outp){
    using (var b = new Bitmap(path)) using (var o = new Bitmap(w*s,h*s)) using (var g = Graphics.FromImage(o)) {
      g.InterpolationMode = InterpolationMode.NearestNeighbor; g.PixelOffsetMode = PixelOffsetMode.Half;
      g.DrawImage(b, new Rectangle(0,0,w*s,h*s), new Rectangle(x,y,w,h), GraphicsUnit.Pixel);
      o.Save(outp, ImageFormat.Png);
    }
  }
}
"@
if (-not ('Img' -as [type])) { Add-Type -TypeDefinition $src -ReferencedAssemblies System.Drawing }
$global:TD = 'C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/visual/tiles-r6b2'
$global:R5 = 'C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/visual/tiles-r5'
$global:ZD = 'C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/r6-7-zoom'
function TP($n, $dir) { if (-not $dir) { $dir = $global:TD }; $f = Get-ChildItem $dir -File | Where-Object { $_.Name.StartsWith(('{0:000}--' -f [int]$n)) } | Select-Object -First 1; return $f.FullName }
function T($n, $dir) { return New-Object Img (TP $n $dir) }
function Zm($n, $x, $y, $w, $h, $s, $name, $dir) { $p = Join-Path $global:ZD $name; [Img]::Zoom((TP $n $dir), $x, $y, $w, $h, $s, $p); return $p }
