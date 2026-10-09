Add-Type -AssemblyName System.Drawing
$code = @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.Text;

public class Img {
  public int W, H; public byte[] D;
  public Img(string p) {
    using (var b = new Bitmap(p)) {
      W = b.Width; H = b.Height;
      var bd = b.LockBits(new Rectangle(0,0,W,H), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
      D = new byte[W*H*4];
      for (int y=0;y<H;y++) Marshal.Copy(new IntPtr(bd.Scan0.ToInt64() + (long)y*bd.Stride), D, y*W*4, W*4);
      b.UnlockBits(bd);
    }
  }
  public int R(int x,int y){return D[(y*W+x)*4+2];}
  public int G(int x,int y){return D[(y*W+x)*4+1];}
  public int B(int x,int y){return D[(y*W+x)*4];}
  public string Px(int x,int y){return R(x,y)+","+G(x,y)+","+B(x,y);}
  public int Diff(int x,int y,int r,int g,int b){return Math.Abs(R(x,y)-r)+Math.Abs(G(x,y)-g)+Math.Abs(B(x,y)-b);}
  public string InkBox(int x0,int y0,int x1,int y1,int r,int g,int b,int thr){
    int minx=int.MaxValue,miny=int.MaxValue,maxx=-1,maxy=-1,n=0;
    for(int y=y0;y<=y1;y++)for(int x=x0;x<=x1;x++){ if(Diff(x,y,r,g,b)>thr){n++; if(x<minx)minx=x; if(x>maxx)maxx=x; if(y<miny)miny=y; if(y>maxy)maxy=y;} }
    if(n==0) return "none";
    return "x"+minx+"-"+maxx+" y"+miny+"-"+maxy+" n"+n;
  }
  public string RowRuns(int x0,int y0,int x1,int y1,int r,int g,int b,int thr){
    var sb=new StringBuilder(); int start=-1;
    for(int y=y0;y<=y1;y++){ bool ink=false; for(int x=x0;x<=x1;x++){ if(Diff(x,y,r,g,b)>thr){ink=true;break;} }
      if(ink&&start<0)start=y; if(!ink&&start>=0){sb.Append(start+"-"+(y-1)+" ");start=-1;} }
    if(start>=0)sb.Append(start+"-"+y1+" ");
    return sb.ToString();
  }
  public string ColRuns(int x0,int y0,int x1,int y1,int r,int g,int b,int thr){
    var sb=new StringBuilder(); int start=-1;
    for(int x=x0;x<=x1;x++){ bool ink=false; for(int y=y0;y<=y1;y++){ if(Diff(x,y,r,g,b)>thr){ink=true;break;} }
      if(ink&&start<0)start=x; if(!ink&&start>=0){sb.Append(start+"-"+(x-1)+" ");start=-1;} }
    if(start>=0)sb.Append(start+"-"+x1+" ");
    return sb.ToString();
  }
  public string RowDump(int y,int x0,int x1){ var sb=new StringBuilder(); for(int x=x0;x<=x1;x++){ sb.Append(x+":"+Px(x,y)+" "); } return sb.ToString(); }
  public string ColDump(int x,int y0,int y1){ var sb=new StringBuilder(); for(int y=y0;y<=y1;y++){ sb.Append(y+":"+Px(x,y)+" "); } return sb.ToString(); }
  public string Centroid(int x0,int y0,int x1,int y1,int r,int g,int b,int thr){
    double sx=0,sy=0,sw=0;
    for(int y=y0;y<=y1;y++)for(int x=x0;x<=x1;x++){ int d=Diff(x,y,r,g,b); if(d>thr){ sx+=x*(double)d; sy+=y*(double)d; sw+=d; } }
    if(sw==0) return "none"; return "cx"+(sx/sw).ToString("F2")+" cy"+(sy/sw).ToString("F2");
  }
  public static void Zoom(string src,int x,int y,int w,int h,int k,string outp){
    using(var b=new Bitmap(src)) using(var d=new Bitmap(w*k,h*k)) using(var g=Graphics.FromImage(d)){
      g.InterpolationMode=System.Drawing.Drawing2D.InterpolationMode.NearestNeighbor;
      g.PixelOffsetMode=System.Drawing.Drawing2D.PixelOffsetMode.Half;
      g.DrawImage(b,new Rectangle(0,0,w*k,h*k),new Rectangle(x,y,w,h),GraphicsUnit.Pixel);
      d.Save(outp,ImageFormat.Png);
    }
  }
}
'@
if (-not ([System.Management.Automation.PSTypeName]'Img').Type) { Add-Type -TypeDefinition $code -ReferencedAssemblies System.Drawing }
$T = 'C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/visual/tiles-r5'
$T4 = 'C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/visual/tiles-r4'
$Z = 'C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/visual/r5-2'
function TileP([string]$n) { (Get-ChildItem $T -Filter "$n--*.png" | Select-Object -First 1).FullName }
function Tile4P([string]$n) { (Get-ChildItem $T4 -Filter "$n--*.png" | Select-Object -First 1).FullName }
function Tl([string]$n) { New-Object Img (TileP $n) }
function Tl4([string]$n) { New-Object Img (Tile4P $n) }
function Zm([string]$n,[int]$x,[int]$y,[int]$w,[int]$h,[int]$k,[string]$tag) { $o = "$Z/$n-$tag.png"; [Img]::Zoom((TileP $n),$x,$y,$w,$h,$k,$o); $o }
function Zm4([string]$n,[int]$x,[int]$y,[int]$w,[int]$h,[int]$k,[string]$tag) { $o = "$Z/r4-$n-$tag.png"; [Img]::Zoom((Tile4P $n),$x,$y,$w,$h,$k,$o); $o }
