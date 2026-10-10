Add-Type -AssemblyName System.Drawing
$src = @"
using System;
using System.Text;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
public class T {
  public int W, H; public int[] P;
  public T(string path) {
    using (var b = new Bitmap(path)) {
      W = b.Width; H = b.Height;
      var d = b.LockBits(new Rectangle(0,0,W,H), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
      P = new int[W*H]; Marshal.Copy(d.Scan0, P, 0, W*H); b.UnlockBits(d);
    }
  }
  public int R(int x,int y){ return (P[y*W+x]>>16)&255; }
  public int G(int x,int y){ return (P[y*W+x]>>8)&255; }
  public int B(int x,int y){ return P[y*W+x]&255; }
  public string C(int x,int y){ return R(x,y)+","+G(x,y)+","+B(x,y); }
  public int D(int x,int y,int r,int g,int b){ return Math.Abs(R(x,y)-r)+Math.Abs(G(x,y)-g)+Math.Abs(B(x,y)-b); }
  public string RowRuns(int y,int x0,int x1,int r,int g,int b,int thr){
    var sb=new StringBuilder(); int s=-1;
    for(int x=x0;x<=x1+1;x++){ bool ink = x<=x1 && D(x,y,r,g,b)>thr;
      if(ink && s<0) s=x; if(!ink && s>=0){ sb.Append(s+"-"+(x-1)+" "); s=-1; } }
    return sb.ToString();
  }
  public string ColRuns(int x,int y0,int y1,int r,int g,int b,int thr){
    var sb=new StringBuilder(); int s=-1;
    for(int y=y0;y<=y1+1;y++){ bool ink = y<=y1 && D(x,y,r,g,b)>thr;
      if(ink && s<0) s=y; if(!ink && s>=0){ sb.Append(s+"-"+(y-1)+" "); s=-1; } }
    return sb.ToString();
  }
  public string Box(int x0,int y0,int x1,int y1,int r,int g,int b,int thr){
    int mx=99999,my=99999,Mx=-1,My=-1;
    for(int y=y0;y<=y1;y++) for(int x=x0;x<=x1;x++) if(D(x,y,r,g,b)>thr){ if(x<mx)mx=x; if(x>Mx)Mx=x; if(y<my)my=y; if(y>My)My=y; }
    return "x"+mx+"-"+Mx+" y"+my+"-"+My;
  }
  public string RowBands(int x0,int y0,int x1,int y1,int r,int g,int b,int thr){
    var sb=new StringBuilder(); int s=-1;
    for(int y=y0;y<=y1+1;y++){ bool ink=false; if(y<=y1) for(int x=x0;x<=x1;x++) if(D(x,y,r,g,b)>thr){ink=true;break;}
      if(ink && s<0) s=y; if(!ink && s>=0){ sb.Append(s+"-"+(y-1)+" "); s=-1; } }
    return sb.ToString();
  }
  public string ColBands(int x0,int y0,int x1,int y1,int r,int g,int b,int thr){
    var sb=new StringBuilder(); int s=-1;
    for(int x=x0;x<=x1+1;x++){ bool ink=false; if(x<=x1) for(int y=y0;y<=y1;y++) if(D(x,y,r,g,b)>thr){ink=true;break;}
      if(ink && s<0) s=x; if(!ink && s>=0){ sb.Append(s+"-"+(x-1)+" "); s=-1; } }
    return sb.ToString();
  }
  public string RowColors(int y,int x0,int x1){ var sb=new StringBuilder(); for(int x=x0;x<=x1;x++) sb.Append(x+":"+C(x,y)+" "); return sb.ToString(); }
  public string ColColors(int x,int y0,int y1){ var sb=new StringBuilder(); for(int y=y0;y<=y1;y++) sb.Append(y+":"+C(x,y)+" "); return sb.ToString(); }
  public void Crop(string outp,int x,int y,int w,int h,int s){
    using (var src = new Bitmap(w*s,h*s)) {
      for(int yy=0;yy<h;yy++) for(int xx=0;xx<w;xx++){ int sx=x+xx, sy=y+yy; Color c = (sx<W&&sy<H&&sx>=0&&sy>=0)? Color.FromArgb(R(sx,sy),G(sx,sy),B(sx,sy)) : Color.Magenta;
        for(int a=0;a<s;a++) for(int bb=0;bb<s;bb++) src.SetPixel(xx*s+a, yy*s+bb, c); }
      src.Save(outp, ImageFormat.Png);
    }
  }
  // brightest pixel in rect (sum)
  public string Max(int x0,int y0,int x1,int y1){ int best=-1,bx=0,by=0; for(int y=y0;y<=y1;y++) for(int x=x0;x<=x1;x++){ int v=R(x,y)+G(x,y)+B(x,y); if(v>best){best=v;bx=x;by=y;} } return bx+","+by+"="+C(bx,by); }
}
"@
if (-not ([System.Management.Automation.PSTypeName]'T').Type) { Add-Type -TypeDefinition $src -ReferencedAssemblies System.Drawing }
$TD = 'C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/visual/tiles-r6b2'
$T5 = 'C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/visual/tiles-r5'
$DF = 'C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/visual/diff-r6'
$CR = 'C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/r6-5-crops'
function L($n) { $f = Get-ChildItem $TD -File | Where-Object { $_.Name.StartsWith("$n--") } | Select-Object -First 1; return New-Object T($f.FullName) }
function L5($n) { $f = Get-ChildItem $T5 -File | Where-Object { $_.Name.StartsWith("$n--") } | Select-Object -First 1; if ($f) { return New-Object T($f.FullName) } else { return $null } }
function LD($n) { $f = Get-ChildItem $DF -File | Where-Object { $_.Name.StartsWith("$n--") } | Select-Object -First 1; return New-Object T($f.FullName) }
