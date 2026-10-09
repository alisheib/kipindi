Add-Type -AssemblyName System.Drawing
if (-not ([System.Management.Automation.PSTypeName]'PxB3').Type) {
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System; using System.Drawing; using System.Drawing.Imaging; using System.Text; using System.Collections.Generic;
public class PxB3 {
  public int W, H; public int[] P;
  public PxB3(string f){ using(var b=new Bitmap(f)){ W=b.Width;H=b.Height;P=new int[W*H];
    var d=b.LockBits(new Rectangle(0,0,W,H),ImageLockMode.ReadOnly,PixelFormat.Format32bppArgb);
    System.Runtime.InteropServices.Marshal.Copy(d.Scan0,P,0,W*H); b.UnlockBits(d);} }
  public int R(int x,int y){return (P[y*W+x]>>16)&255;} public int G(int x,int y){return (P[y*W+x]>>8)&255;} public int B(int x,int y){return P[y*W+x]&255;}
  public int S(int x,int y){return R(x,y)+G(x,y)+B(x,y);}
  public string Px(int x,int y){return String.Format("({0},{1},{2})",R(x,y),G(x,y),B(x,y));}
  bool Ink(int x,int y,int bs,int thr){return Math.Abs(S(x,y)-bs)>thr;}
  // bands: rows with ink in [x0,x1], background = pixel at (bx,by) or per-row at x=bx if by<0
  public string Bands(int y0,int y1,int x0,int x1,int thr,int bx,int by){
    var sb=new StringBuilder(); int bs = by>=0? S(bx,by):0; int f=-1,l=-1,ys=-1,ye=-1;
    for(int y=y0;y<=Math.Min(y1,H-1);y++){ int rbs= by>=0? bs: S(bx,y); int ff=-1,ll=-1;
      for(int x=x0;x<=Math.Min(x1,W-1);x++){ if(Ink(x,y,rbs,thr)){ if(ff<0)ff=x; ll=x; } }
      if(ff>=0){ if(ys<0){ys=y;f=ff;l=ll;} else {f=Math.Min(f,ff);l=Math.Max(l,ll);} ye=y; }
      else if(ys>=0){ sb.AppendFormat("y {0}-{1} x {2}..{3}\n",ys,ye,f,l); ys=-1; } }
    if(ys>=0) sb.AppendFormat("y {0}-{1} x {2}..{3}\n",ys,ye,f,l); return sb.ToString(); }
  // cols: columns with ink in [y0,y1]
  public string Cols(int x0,int x1,int y0,int y1,int thr,int bx,int by){
    var sb=new StringBuilder(); int bs=S(bx,by); int xs=-1,xe=-1,t=-1,bb=-1;
    for(int x=x0;x<=Math.Min(x1,W-1);x++){ int ff=-1,ll=-1;
      for(int y=y0;y<=Math.Min(y1,H-1);y++){ if(Ink(x,y,bs,thr)){ if(ff<0)ff=y; ll=y; } }
      if(ff>=0){ if(xs<0){xs=x;t=ff;bb=ll;} else {t=Math.Min(t,ff);bb=Math.Max(bb,ll);} xe=x; }
      else if(xs>=0){ sb.AppendFormat("x {0}-{1} y {2}..{3}\n",xs,xe,t,bb); xs=-1; } }
    if(xs>=0) sb.AppendFormat("x {0}-{1} y {2}..{3}\n",xs,xe,t,bb); return sb.ToString(); }
  public string Row(int y,int x0,int x1){ var sb=new StringBuilder(); string prev=null; int st=x0;
    for(int x=x0;x<=x1+1;x++){ string c = x<=x1? Px(x,y):null; if(c!=prev){ if(prev!=null) sb.AppendFormat("{0}-{1}:{2} ",st,x-1,prev); prev=c; st=x; } } return sb.ToString(); }
  public string Col(int x,int y0,int y1){ var sb=new StringBuilder(); string prev=null; int st=y0;
    for(int y=y0;y<=y1+1;y++){ string c = y<=y1? Px(x,y):null; if(c!=prev){ if(prev!=null) sb.AppendFormat("{0}-{1}:{2} ",st,y-1,prev); prev=c; st=y; } } return sb.ToString(); }
}
"@
}
function Ld($n){ $S='C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\visual'; $f=Get-ChildItem "$S\tiles-r4\$n*" | select -First 1; New-Object PxB3 $f.FullName }
