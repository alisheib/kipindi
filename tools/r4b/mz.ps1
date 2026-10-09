Add-Type -AssemblyName System.Drawing
$cs = @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Text;
using System.Collections.Generic;
public static class Mz {
  public static int[,,] Load(string path){
    using (var b = new Bitmap(path)) {
      int w=b.Width,h=b.Height; var a=new int[w,h,3];
      var d=b.LockBits(new Rectangle(0,0,w,h),ImageLockMode.ReadOnly,PixelFormat.Format24bppRgb);
      byte[] buf=new byte[d.Stride*h]; System.Runtime.InteropServices.Marshal.Copy(d.Scan0,buf,0,buf.Length);
      for(int y=0;y<h;y++)for(int x=0;x<w;x++){int o=y*d.Stride+x*3;a[x,y,0]=buf[o+2];a[x,y,1]=buf[o+1];a[x,y,2]=buf[o];}
      b.UnlockBits(d); return a; }
  }
  static int Diff(int[,,] a,int x,int y,int r,int g,int bb){return Math.Abs(a[x,y,0]-r)+Math.Abs(a[x,y,1]-g)+Math.Abs(a[x,y,2]-bb);}
  // runs of ink along row y between x0..x1, bg = pixel (bx,by)
  public static string Row(int[,,] a,int y,int x0,int x1,int bx,int by,int thr){
    int r=a[bx,by,0],g=a[bx,by,1],bb=a[bx,by,2]; var sb=new StringBuilder(); int s=-1;
    for(int x=x0;x<=x1;x++){bool ink=Diff(a,x,y,r,g,bb)>thr; if(ink&&s<0)s=x; if(!ink&&s>=0){sb.Append(s+"-"+(x-1)+" ");s=-1;}}
    if(s>=0)sb.Append(s+"-"+x1+" "); return sb.ToString();
  }
  public static string Col(int[,,] a,int x,int y0,int y1,int bx,int by,int thr){
    int r=a[bx,by,0],g=a[bx,by,1],bb=a[bx,by,2]; var sb=new StringBuilder(); int s=-1;
    for(int y=y0;y<=y1;y++){bool ink=Diff(a,x,y,r,g,bb)>thr; if(ink&&s<0)s=y; if(!ink&&s>=0){sb.Append(s+"-"+(y-1)+" ");s=-1;}}
    if(s>=0)sb.Append(s+"-"+y1+" "); return sb.ToString();
  }
  // bbox of ink in a region
  public static string Box(int[,,] a,int x0,int y0,int x1,int y1,int bx,int by,int thr){
    int r=a[bx,by,0],g=a[bx,by,1],bb=a[bx,by,2]; int mnx=99999,mny=99999,mxx=-1,mxy=-1;
    for(int y=y0;y<=y1;y++)for(int x=x0;x<=x1;x++) if(Diff(a,x,y,r,g,bb)>thr){if(x<mnx)mnx=x;if(x>mxx)mxx=x;if(y<mny)mny=y;if(y>mxy)mxy=y;}
    return mxx<0?"none":(mnx+","+mny+" - "+mxx+","+mxy+" (w"+(mxx-mnx+1)+" h"+(mxy-mny+1)+")");
  }
  // rows with ink (projection) in region => line bands
  public static string RowBands(int[,,] a,int x0,int y0,int x1,int y1,int bx,int by,int thr){
    int r=a[bx,by,0],g=a[bx,by,1],bb=a[bx,by,2]; var sb=new StringBuilder(); int s=-1;
    for(int y=y0;y<=y1;y++){bool ink=false; for(int x=x0;x<=x1;x++) if(Diff(a,x,y,r,g,bb)>thr){ink=true;break;}
      if(ink&&s<0)s=y; if(!ink&&s>=0){sb.Append(s+"-"+(y-1)+" ");s=-1;}}
    if(s>=0)sb.Append(s+"-"+y1+" "); return sb.ToString();
  }
  public static string ColBands(int[,,] a,int x0,int y0,int x1,int y1,int bx,int by,int thr){
    int r=a[bx,by,0],g=a[bx,by,1],bb=a[bx,by,2]; var sb=new StringBuilder(); int s=-1;
    for(int x=x0;x<=x1;x++){bool ink=false; for(int y=y0;y<=y1;y++) if(Diff(a,x,y,r,g,bb)>thr){ink=true;break;}
      if(ink&&s<0)s=x; if(!ink&&s>=0){sb.Append(s+"-"+(x-1)+" ");s=-1;}}
    if(s>=0)sb.Append(s+"-"+x1+" "); return sb.ToString();
  }
  public static string Px(int[,,] a,int x,int y){return a[x,y,0]+","+a[x,y,1]+","+a[x,y,2];}
  public static string RowPx(int[,,] a,int y,int x0,int x1,int step){var sb=new StringBuilder();for(int x=x0;x<=x1;x+=step)sb.Append(x+":"+a[x,y,0]+","+a[x,y,1]+","+a[x,y,2]+" ");return sb.ToString();}
  public static string ColPx(int[,,] a,int x,int y0,int y1,int step){var sb=new StringBuilder();for(int y=y0;y<=y1;y+=step)sb.Append(y+":"+a[x,y,0]+","+a[x,y,1]+","+a[x,y,2]+" ");return sb.ToString();}
}
"@
if (-not ([System.Management.Automation.PSTypeName]'Mz').Type) { Add-Type -TypeDefinition $cs -ReferencedAssemblies System.Drawing }
$S='C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad'
function T($n){ $f = Get-ChildItem "$S\visual\tiles-r4" -Filter "$n--*.png" | Select-Object -First 1; return ,[Mz]::Load($f.FullName) }
