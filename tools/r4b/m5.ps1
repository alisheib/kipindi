. "$PSScriptRoot\mz.ps1"
$code = @"
public static class Gap2 {
  static bool Dial(int[,,] a,int x,int y){int r=a[x,y,0],g=a[x,y,1],b=a[x,y,2]; return g>=60 && g>=b-10 && g>r+30;}
  // The bubble's ring: pixels in the annulus r 23..29 round its centre that differ from the row's background (x bgx)
  // and are not the dial's ink. The dial: its green/aqua ink. Report the ring's ink box and the least distance.
  public static string Run(int[,,] a,double cx,double cy,int bgx,int thr){
    int w=a.GetLength(0),h=a.GetLength(1);
    var ring=new System.Collections.Generic.List<int[]>(); int rx0=9999,ry0=9999,rx1=-1,ry1=-1;
    for(int y=(int)cy-32;y<=(int)cy+32;y++)for(int x=(int)cx-32;x<=(int)cx+32;x++){
      if(x<0||x>=w||y<0||y>=h)continue; double d=System.Math.Sqrt((x+0.5-cx)*(x+0.5-cx)+(y+0.5-cy)*(y+0.5-cy));
      if(d<23||d>29)continue; if(Dial(a,x,y))continue;
      int dd=System.Math.Abs(a[x,y,0]-a[bgx,y,0])+System.Math.Abs(a[x,y,1]-a[bgx,y,1])+System.Math.Abs(a[x,y,2]-a[bgx,y,2]);
      if(dd>thr){ring.Add(new int[]{x,y}); if(x<rx0)rx0=x;if(x>rx1)rx1=x;if(y<ry0)ry0=y;if(y>ry1)ry1=y;}
    }
    double best=1e9; int bx=-1,by=-1,kx=-1,ky=-1;
    for(int y=0;y<h;y++)for(int x=w-80;x<w;x++){ if(!Dial(a,x,y))continue;
      foreach(var p in ring){ double d=System.Math.Sqrt((p[0]-x)*(p[0]-x)+(p[1]-y)*(p[1]-y)); if(d<best){best=d;bx=x;by=y;kx=p[0];ky=p[1];} } }
    return "ring ink x"+rx0+"-"+rx1+" y"+ry0+"-"+ry1+" ("+ring.Count+" px); nearest dial ink to ring ink: "+best.ToString("0.0")+"px (dial "+bx+","+by+" / ring "+kx+","+ky+")";
  }
}
"@
if (-not ([System.Management.Automation.PSTypeName]'Gap2').Type) { Add-Type -TypeDefinition $code }
foreach ($n in '305','306','309','313','314','315','317') {
  $a = T $n; $w = $a.GetLength(0)
  "$n (w$w): " + [Gap2]::Run($a, $w - 38, 678, 200, 12)
}
