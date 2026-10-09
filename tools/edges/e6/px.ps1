Add-Type -AssemblyName System.Drawing
if (-not ('Px' -as [type])) {
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Text;
using System.Collections.Generic;
public class Px {
  public int W, H; public byte[] D; int stride;
  public Px(string path) {
    using (var b = new Bitmap(path)) {
      W = b.Width; H = b.Height;
      var r = b.LockBits(new Rectangle(0,0,W,H), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
      stride = r.Stride; D = new byte[stride*H];
      System.Runtime.InteropServices.Marshal.Copy(r.Scan0, D, 0, D.Length);
      b.UnlockBits(r);
    }
  }
  public int R(int x,int y){return D[y*stride+x*4+2];}
  public int G(int x,int y){return D[y*stride+x*4+1];}
  public int B(int x,int y){return D[y*stride+x*4];}
  public string C(int x,int y){return R(x,y)+","+G(x,y)+","+B(x,y);}
  public int Diff(int x,int y,int r,int g,int b){return Math.Abs(R(x,y)-r)+Math.Abs(G(x,y)-g)+Math.Abs(B(x,y)-b);}
  public bool Ink(int x,int y,int[] c,int thr){return Diff(x,y,c[0],c[1],c[2])>thr;}
  public int[] At(int x,int y){return new int[]{R(x,y),G(x,y),B(x,y)};}
  public string RowRuns(int y,int x0,int x1,int[] c,int thr){
    var sb=new StringBuilder(); bool inn=false; int s=0;
    for(int x=x0;x<=x1;x++){ bool k=Ink(x,y,c,thr); if(k&&!inn){s=x;inn=true;} if(!k&&inn){sb.Append(s+"-"+(x-1)+" ");inn=false;} }
    if(inn) sb.Append(s+"-"+x1); return sb.ToString().Trim();
  }
  public string ColRuns(int x,int y0,int y1,int[] c,int thr){
    var sb=new StringBuilder(); bool inn=false; int s=0;
    for(int y=y0;y<=y1;y++){ bool k=Ink(x,y,c,thr); if(k&&!inn){s=y;inn=true;} if(!k&&inn){sb.Append(s+"-"+(y-1)+" ");inn=false;} }
    if(inn) sb.Append(s+"-"+y1); return sb.ToString().Trim();
  }
  public string Box(int x0,int y0,int x1,int y1,int[] c,int thr){
    int a=99999,b=99999,cc=-1,d=-1;
    for(int y=y0;y<=y1;y++) for(int x=x0;x<=x1;x++) if(Ink(x,y,c,thr)){ if(x<a)a=x; if(x>cc)cc=x; if(y<b)b=y; if(y>d)d=y; }
    if(cc<0) return "none"; return "x"+a+"-"+cc+" y"+b+"-"+d;
  }
  public string InkRows(int x0,int x1,int y0,int y1,int[] c,int thr){
    var sb=new StringBuilder(); bool inn=false; int s=0;
    for(int y=y0;y<=y1;y++){ bool k=false; for(int x=x0;x<=x1;x++) if(Ink(x,y,c,thr)){k=true;break;}
      if(k&&!inn){s=y;inn=true;} if(!k&&inn){sb.Append(s+"-"+(y-1)+" ");inn=false;} }
    if(inn) sb.Append(s+"-"+y1); return sb.ToString().Trim();
  }
  public string InkCols(int x0,int x1,int y0,int y1,int[] c,int thr){
    var sb=new StringBuilder(); bool inn=false; int s=0;
    for(int x=x0;x<=x1;x++){ bool k=false; for(int y=y0;y<=y1;y++) if(Ink(x,y,c,thr)){k=true;break;}
      if(k&&!inn){s=x;inn=true;} if(!k&&inn){sb.Append(s+"-"+(x-1)+" ");inn=false;} }
    if(inn) sb.Append(s+"-"+x1); return sb.ToString().Trim();
  }
  public string Census(int x0,int y0,int x1,int y1,int top){
    var d=new Dictionary<string,int>();
    for(int y=y0;y<=y1;y++) for(int x=x0;x<=x1;x++){ var k=C(x,y); int v; d.TryGetValue(k,out v); d[k]=v+1; }
    var l=new List<KeyValuePair<string,int>>(d); l.Sort((p,q)=>q.Value.CompareTo(p.Value));
    var sb=new StringBuilder(); sb.Append("distinct="+d.Count+" "); for(int i=0;i<Math.Min(top,l.Count);i++) sb.Append(l[i].Key+":"+l[i].Value+" "); return sb.ToString();
  }
}
'@
}
$global:T = 'C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/edges/tiles'
function Get-Px([int]$seq) {
  $f = Get-ChildItem $global:T -Filter ("{0}--*.png" -f $seq) | Select-Object -First 1
  return New-Object Px $f.FullName
}
function Crop([int]$seq, [int]$x, [int]$y, [int]$w, [int]$h, [int]$scale, [string]$name) {
  $f = Get-ChildItem $global:T -Filter ("{0}--*.png" -f $seq) | Select-Object -First 1
  $b = [System.Drawing.Bitmap]::FromFile($f.FullName)
  $out = New-Object System.Drawing.Bitmap ($w * $scale), ($h * $scale)
  $g = [System.Drawing.Graphics]::FromImage($out)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
  $g.DrawImage($b, (New-Object System.Drawing.Rectangle 0, 0, ($w * $scale), ($h * $scale)), (New-Object System.Drawing.Rectangle $x, $y, $w, $h), [System.Drawing.GraphicsUnit]::Pixel)
  $p = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/edges/e6/$name.png"
  $out.Save($p); $g.Dispose(); $out.Dispose(); $b.Dispose()
  return $p
}
