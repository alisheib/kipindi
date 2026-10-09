Add-Type -AssemblyName System.Drawing
$global:TM = 'C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\visual\tiles-m'
$global:TH = 'C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles-h'
if (-not ([System.Management.Automation.PSTypeName]'Tk').Type) {
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System; using System.Drawing; using System.Drawing.Imaging; using System.Text; using System.Collections.Generic;
public class Img { public int W,H,S; public byte[] B; public string Name; }
public static class Tk {
  public static Img Load(string path) {
    using (var b = new Bitmap(path)) {
      var r = new Rectangle(0,0,b.Width,b.Height);
      var d = b.LockBits(r, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
      var o = new Img(); o.W=b.Width; o.H=b.Height; o.S=d.Stride; o.B=new byte[d.Stride*b.Height]; o.Name=path;
      System.Runtime.InteropServices.Marshal.Copy(d.Scan0, o.B, 0, o.B.Length); b.UnlockBits(d); return o; }
  }
  public static int[] Px(Img o,int x,int y){ int i=y*o.S+x*4; return new int[]{o.B[i+2],o.B[i+1],o.B[i]}; }
  public static string PxS(Img o,int x,int y){ var p=Px(o,x,y); return p[0]+","+p[1]+","+p[2]; }
  static int D(int[] a,int[] b){ return Math.Abs(a[0]-b[0])+Math.Abs(a[1]-b[1])+Math.Abs(a[2]-b[2]); }
  public static string RowRuns(Img o,int y,int x0,int x1,int th,int bx,int by){
    var bg=Px(o,bx,by); var sb=new StringBuilder(); int s=-1;
    for(int x=x0;x<=x1;x++){ bool ink=D(Px(o,x,y),bg)>th; if(ink&&s<0)s=x; if(!ink&&s>=0){sb.Append(s+"-"+(x-1)+" ");s=-1;} }
    if(s>=0)sb.Append(s+"-"+x1); return sb.ToString(); }
  public static string ColRuns(Img o,int x,int y0,int y1,int th,int bx,int by){
    var bg=Px(o,bx,by); var sb=new StringBuilder(); int s=-1;
    for(int y=y0;y<=y1;y++){ bool ink=D(Px(o,x,y),bg)>th; if(ink&&s<0)s=y; if(!ink&&s>=0){sb.Append(s+"-"+(y-1)+" ");s=-1;} }
    if(s>=0)sb.Append(s+"-"+y1); return sb.ToString(); }
  public static string BBox(Img o,int x0,int y0,int x1,int y1,int th,int bx,int by){
    var bg=Px(o,bx,by); int mnx=99999,mny=99999,mxx=-1,mxy=-1;
    for(int y=y0;y<=y1;y++)for(int x=x0;x<=x1;x++) if(D(Px(o,x,y),bg)>th){ if(x<mnx)mnx=x; if(x>mxx)mxx=x; if(y<mny)mny=y; if(y>mxy)mxy=y; }
    return "x "+mnx+"-"+mxx+" y "+mny+"-"+mxy; }
  public static string Bands(Img o,int x0,int y0,int x1,int y1,int th,int bx,int by){
    var bg=Px(o,bx,by); var sb=new StringBuilder(); int s=-1,bmn=99999,bmx=-1;
    for(int y=y0;y<=y1;y++){ int mn=99999,mx=-1;
      for(int x=x0;x<=x1;x++) if(D(Px(o,x,y),bg)>th){ if(x<mn)mn=x; mx=x; }
      if(mx>=0){ if(s<0){s=y;bmn=99999;bmx=-1;} if(mn<bmn)bmn=mn; if(mx>bmx)bmx=mx; }
      else if(s>=0){ sb.Append("y "+s+"-"+(y-1)+" x "+bmn+"-"+bmx+"\n"); s=-1; } }
    if(s>=0) sb.Append("y "+s+"-"+y1+" x "+bmn+"-"+bmx+"\n"); return sb.ToString(); }
  // column bands: vertical slices with ink in rect
  public static string VBands(Img o,int x0,int y0,int x1,int y1,int th,int bx,int by){
    var bg=Px(o,bx,by); var sb=new StringBuilder(); int s=-1,bmn=99999,bmx=-1;
    for(int x=x0;x<=x1;x++){ int mn=99999,mx=-1;
      for(int y=y0;y<=y1;y++) if(D(Px(o,x,y),bg)>th){ if(y<mn)mn=y; mx=y; }
      if(mx>=0){ if(s<0){s=x;bmn=99999;bmx=-1;} if(mn<bmn)bmn=mn; if(mx>bmx)bmx=mx; }
      else if(s>=0){ sb.Append("x "+s+"-"+(x-1)+" y "+bmn+"-"+bmx+"\n"); s=-1; } }
    if(s>=0) sb.Append("x "+s+"-"+x1+" y "+bmn+"-"+bmx+"\n"); return sb.ToString(); }
}
'@
}
$global:IMG = @{}
function Load($n, $dir) {
  if (-not $dir) { $dir = $global:TM }
  $f = Get-ChildItem $dir -Filter ($n + '*') | Select-Object -First 1
  if ($global:IMG.ContainsKey($f.FullName)) { return $global:IMG[$f.FullName] }
  $o = [Tk]::Load($f.FullName); $global:IMG[$f.FullName] = $o; return $o
}
function PxS($o,$x,$y){ [Tk]::PxS($o,$x,$y) }
function RowRuns($o,$y,$x0,$x1,$th=40,$bx=-1,$by=-1){ if($bx -lt 0){$bx=$x0;$by=$y}; [Tk]::RowRuns($o,$y,$x0,$x1,$th,$bx,$by) }
function ColRuns($o,$x,$y0,$y1,$th=40,$bx=-1,$by=-1){ if($bx -lt 0){$bx=$x;$by=$y0}; [Tk]::ColRuns($o,$x,$y0,$y1,$th,$bx,$by) }
function BBox($o,$x0,$y0,$x1,$y1,$th=40,$bx=-1,$by=-1){ if($bx -lt 0){$bx=$x0;$by=$y0}; [Tk]::BBox($o,$x0,$y0,$x1,$y1,$th,$bx,$by) }
function Bands($o,$x0,$y0,$x1,$y1,$th=40,$bx=-1,$by=-1){ if($bx -lt 0){$bx=$x0;$by=$y0}; [Tk]::Bands($o,$x0,$y0,$x1,$y1,$th,$bx,$by) }
function VBands($o,$x0,$y0,$x1,$y1,$th=40,$bx=-1,$by=-1){ if($bx -lt 0){$bx=$x0;$by=$y0}; [Tk]::VBands($o,$x0,$y0,$x1,$y1,$th,$bx,$by) }
function Crop($n,$x,$y,$w,$h,$sc=3,$out='crop',$dir){
  if (-not $dir) { $dir = $global:TM }
  $f = Get-ChildItem $dir -Filter ($n + '*') | Select-Object -First 1
  $src=[System.Drawing.Bitmap]::FromFile($f.FullName)
  $dst=New-Object System.Drawing.Bitmap ([int]($w*$sc)),([int]($h*$sc))
  $g=[System.Drawing.Graphics]::FromImage($dst); $g.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor; $g.PixelOffsetMode=[System.Drawing.Drawing2D.PixelOffsetMode]::Half
  $g.DrawImage($src,(New-Object System.Drawing.Rectangle 0,0,($w*$sc),($h*$sc)),(New-Object System.Drawing.Rectangle $x,$y,$w,$h),[System.Drawing.GraphicsUnit]::Pixel)
  $p="C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\visual\r3b1\$out.png"
  $dst.Save($p,[System.Drawing.Imaging.ImageFormat]::Png); $g.Dispose(); $dst.Dispose(); $src.Dispose(); $p
}
