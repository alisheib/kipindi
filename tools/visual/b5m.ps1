Add-Type -AssemblyName System.Drawing
$global:TM = 'C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\visual\tiles-m'
$global:TH = 'C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles-h'
if (-not ('B5Img' -as [type])) {
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System; using System.Drawing; using System.Drawing.Imaging; using System.Text; using System.Collections.Generic;
public class B5Img {
  public int W, H; public byte[] D; int S;
  public B5Img(string path) { using (var bm = new Bitmap(path)) { W = bm.Width; H = bm.Height; var r = new Rectangle(0,0,W,H); var bd = bm.LockBits(r, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb); S = bd.Stride; D = new byte[S*H]; System.Runtime.InteropServices.Marshal.Copy(bd.Scan0, D, 0, D.Length); bm.UnlockBits(bd);} }
  public int R(int x,int y){return D[y*S+x*4+2];} public int G(int x,int y){return D[y*S+x*4+1];} public int B(int x,int y){return D[y*S+x*4];}
  public string Px(int x,int y){return "("+R(x,y)+","+G(x,y)+","+B(x,y)+")";}
  public int Df(int x,int y,int rr,int gg,int bb){return Math.Abs(R(x,y)-rr)+Math.Abs(G(x,y)-gg)+Math.Abs(B(x,y)-bb);}
  string J(List<string> l){return string.Join(" ", l.ToArray());}
  public string RowRuns(int y,int x0,int x1,int th,int bx,int by){int rr=R(bx,by),gg=G(bx,by),bb=B(bx,by);var l=new List<string>();bool i=false;int s=0;for(int x=x0;x<=x1;x++){bool k=Df(x,y,rr,gg,bb)>th;if(k&&!i){i=true;s=x;}else if(!k&&i){i=false;l.Add(s+"-"+(x-1));}}if(i)l.Add(s+"-"+x1);return J(l);}
  public string ColRuns(int x,int y0,int y1,int th,int bx,int by){int rr=R(bx,by),gg=G(bx,by),bb=B(bx,by);var l=new List<string>();bool i=false;int s=0;for(int y=y0;y<=y1;y++){bool k=Df(x,y,rr,gg,bb)>th;if(k&&!i){i=true;s=y;}else if(!k&&i){i=false;l.Add(s+"-"+(y-1));}}if(i)l.Add(s+"-"+y1);return J(l);}
  public string InkBox(int x0,int y0,int x1,int y1,int th,int bx,int by){int rr=R(bx,by),gg=G(bx,by),bb=B(bx,by);int a=99999,c=99999,e=-1,f=-1;for(int y=y0;y<=y1;y++)for(int x=x0;x<=x1;x++)if(Df(x,y,rr,gg,bb)>th){if(x<a)a=x;if(x>e)e=x;if(y<c)c=y;if(y>f)f=y;}return "x "+a+"-"+e+" y "+c+"-"+f;}
  public string InkRows(int x0,int y0,int x1,int y1,int th,int bx,int by,int merge){int rr=R(bx,by),gg=G(bx,by),bb=B(bx,by);var l=new List<string>();bool i=false;int s=0,last=0;for(int y=y0;y<=y1;y++){bool h=false;for(int x=x0;x<=x1;x++)if(Df(x,y,rr,gg,bb)>th){h=true;break;}if(h){if(!i){i=true;s=y;}last=y;}else if(i&&(y-last)>merge){i=false;l.Add(s+"-"+last);}}if(i)l.Add(s+"-"+last);return J(l);}
  public string InkCols(int x0,int y0,int x1,int y1,int th,int bx,int by,int merge){int rr=R(bx,by),gg=G(bx,by),bb=B(bx,by);var l=new List<string>();bool i=false;int s=0,last=0;for(int x=x0;x<=x1;x++){bool h=false;for(int y=y0;y<=y1;y++)if(Df(x,y,rr,gg,bb)>th){h=true;break;}if(h){if(!i){i=true;s=x;}last=x;}else if(i&&(x-last)>merge){i=false;l.Add(s+"-"+last);}}if(i)l.Add(s+"-"+last);return J(l);}
  public string RowPx(int y,int x0,int x1,int step){var sb=new StringBuilder();for(int x=x0;x<=x1;x+=step)sb.Append(x+":"+Px(x,y)+" ");return sb.ToString();}
  public string ColPx(int x,int y0,int y1,int step){var sb=new StringBuilder();for(int y=y0;y<=y1;y+=step)sb.Append(y+":"+Px(x,y)+" ");return sb.ToString();}
}
'@
}
function Open-T($seq, $dir) { if (-not $dir) { $dir = $global:TM }; $f = Get-ChildItem $dir -Filter "$seq--*.png" | Select-Object -First 1; return New-Object B5Img $f.FullName }
