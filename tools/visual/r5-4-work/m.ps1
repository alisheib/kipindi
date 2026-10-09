Add-Type -AssemblyName System.Drawing
$global:TD = 'C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/visual/tiles-r5'
$global:T4 = 'C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/visual/tiles-r4'
$global:ZD = 'C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/visual/r5-4-work'
if (-not ('Img' -as [type])) {
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Text;
public class Img {
  public int W, H; public byte[] D; int st;
  public Img(string path) {
    using (var bmp = new Bitmap(path)) {
      W = bmp.Width; H = bmp.Height;
      var bd = bmp.LockBits(new Rectangle(0,0,W,H), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
      st = bd.Stride; D = new byte[st*H];
      System.Runtime.InteropServices.Marshal.Copy(bd.Scan0, D, 0, D.Length);
      bmp.UnlockBits(bd);
    }
  }
  public int R(int x,int y){return D[y*st+x*4+2];}
  public int G(int x,int y){return D[y*st+x*4+1];}
  public int B(int x,int y){return D[y*st+x*4];}
  public string P(int x,int y){return R(x,y)+","+G(x,y)+","+B(x,y);}
  public int Df(int x,int y,int r,int g,int b){return Math.Abs(R(x,y)-r)+Math.Abs(G(x,y)-g)+Math.Abs(B(x,y)-b);}
  // row runs: r<0 -> bg = pixel (x0,y)
  public string RowRuns(int y,int x0,int x1,int r,int g,int b,int th){
    if(r<0){r=R(x0,y);g=G(x0,y);b=B(x0,y);}
    var sb=new StringBuilder(); int s=-1; int pk=0;
    for(int x=x0;x<=x1+1;x++){
      bool ink = x<=x1 && Df(x,y,r,g,b)>th;
      if(ink){ if(s<0){s=x;pk=0;} int d=Df(x,y,r,g,b); if(d>pk)pk=d; }
      else if(s>=0){ sb.Append(s==x-1? (s+"("+pk+") ") : (s+"-"+(x-1)+"("+pk+") ")); s=-1; }
    }
    return sb.ToString();
  }
  public string ColRuns(int x,int y0,int y1,int r,int g,int b,int th){
    if(r<0){r=R(x,y0);g=G(x,y0);b=B(x,y0);}
    var sb=new StringBuilder(); int s=-1; int pk=0;
    for(int y=y0;y<=y1+1;y++){
      bool ink = y<=y1 && Df(x,y,r,g,b)>th;
      if(ink){ if(s<0){s=y;pk=0;} int d=Df(x,y,r,g,b); if(d>pk)pk=d; }
      else if(s>=0){ sb.Append(s==y-1? (s+"("+pk+") ") : (s+"-"+(y-1)+"("+pk+") ")); s=-1; }
    }
    return sb.ToString();
  }
  // bands of rows that contain ink within [x0,x1] (bg per row = pixel at (x0,y) when r<0)
  public string RowBands(int x0,int y0,int x1,int y1,int r,int g,int b,int th){
    var sb=new StringBuilder(); int s=-1; int mnx=99999,mxx=-1;
    for(int y=y0;y<=y1+1;y++){
      bool any=false; int lx=99999,hx=-1;
      if(y<=y1){ int rr=r,gg=g,bb=b; if(r<0){rr=R(x0,y);gg=G(x0,y);bb=B(x0,y);}
        for(int x=x0;x<=x1;x++){ if(Df(x,y,rr,gg,bb)>th){any=true; if(x<lx)lx=x; if(x>hx)hx=x;} } }
      if(any){ if(s<0){s=y;mnx=99999;mxx=-1;} if(lx<mnx)mnx=lx; if(hx>mxx)mxx=hx; }
      else if(s>=0){ sb.Append("y"+s+"-"+(y-1)+" (h"+(y-s)+") x"+mnx+"-"+mxx+"\n"); s=-1; }
    }
    return sb.ToString();
  }
  // bands of columns that contain ink within [y0,y1] (bg per column = pixel at (x,y0) when r<0)
  public string ColBands(int x0,int y0,int x1,int y1,int r,int g,int b,int th){
    var sb=new StringBuilder(); int s=-1; int mny=99999,mxy=-1;
    for(int x=x0;x<=x1+1;x++){
      bool any=false; int ly=99999,hy=-1;
      if(x<=x1){ int rr=r,gg=g,bb=b; if(r<0){rr=R(x,y0);gg=G(x,y0);bb=B(x,y0);}
        for(int y=y0;y<=y1;y++){ if(Df(x,y,rr,gg,bb)>th){any=true; if(y<ly)ly=y; if(y>hy)hy=y;} } }
      if(any){ if(s<0){s=x;mny=99999;mxy=-1;} if(ly<mny)mny=ly; if(hy>mxy)mxy=hy; }
      else if(s>=0){ sb.Append("x"+s+"-"+(x-1)+" (w"+(x-s)+") y"+mny+"-"+mxy+"\n"); s=-1; }
    }
    return sb.ToString();
  }
  // per-column peak diff over [y0,y1]
  public string ColPeak(int x0,int y0,int x1,int y1,int r,int g,int b){
    var sb=new StringBuilder();
    for(int x=x0;x<=x1;x++){ int pk=0; for(int y=y0;y<=y1;y++){ int d=Df(x,y,r,g,b); if(d>pk)pk=d; } sb.Append(x+":"+pk+" "); }
    return sb.ToString();
  }
  // per-row peak diff over [x0,x1]
  public string RowPeak(int x0,int y0,int x1,int y1,int r,int g,int b){
    var sb=new StringBuilder();
    for(int y=y0;y<=y1;y++){ int pk=0; for(int x=x0;x<=x1;x++){ int d=Df(x,y,r,g,b); if(d>pk)pk=d; } sb.Append(y+":"+pk+" "); }
    return sb.ToString();
  }
  // print a row of pixels
  public string RowPx(int y,int x0,int x1){ var sb=new StringBuilder(); for(int x=x0;x<=x1;x++) sb.Append(x+":"+P(x,y)+" "); return sb.ToString(); }
  public string ColPx(int x,int y0,int y1){ var sb=new StringBuilder(); for(int y=y0;y<=y1;y++) sb.Append(y+":"+P(x,y)+" "); return sb.ToString(); }
  public string BBox(int x0,int y0,int x1,int y1,int r,int g,int b,int th){
    int lx=99999,hx=-1,ly=99999,hy=-1;
    for(int y=y0;y<=y1;y++) for(int x=x0;x<=x1;x++){ if(Df(x,y,r,g,b)>th){ if(x<lx)lx=x; if(x>hx)hx=x; if(y<ly)ly=y; if(y>hy)hy=y; } }
    return "x"+lx+"-"+hx+" y"+ly+"-"+hy;
  }
  public static void Zoom(string path,int x,int y,int w,int h,int s,string outp){
    using (var src = new Bitmap(path)) using (var dst = new Bitmap(w*s,h*s)) using (var g = Graphics.FromImage(dst)) {
      g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.NearestNeighbor;
      g.PixelOffsetMode = System.Drawing.Drawing2D.PixelOffsetMode.Half;
      g.DrawImage(src, new Rectangle(0,0,w*s,h*s), new Rectangle(x,y,w,h), GraphicsUnit.Pixel);
      dst.Save(outp, ImageFormat.Png);
    }
  }
}
'@
}
function global:TF($n) { (Get-ChildItem $TD -Filter "$n--*" | Select-Object -First 1).FullName }
function global:T4F($n) { $f = Get-ChildItem $TD -Filter "$n--*" | Select-Object -First 1; $suf = $f.Name.Substring(5); (Get-ChildItem $T4 -Filter "*--$suf" | Select-Object -First 1).FullName }
function global:LI4($n) { [Img]::new((T4F $n)) }
function global:ZM4($n,$x,$y,$w,$h,$s,$tag) { $o = Join-Path $ZD ("z$n-r4-$tag.png"); [Img]::Zoom((T4F $n),$x,$y,$w,$h,$s,$o); $o }
function global:LI($n) { [Img]::new((TF $n)) }
function global:ZM($n,$x,$y,$w,$h,$s,$tag) { $o = Join-Path $ZD ("z$n-$tag.png"); [Img]::Zoom((TF $n),$x,$y,$w,$h,$s,$o); $o }
