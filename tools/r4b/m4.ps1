. "$PSScriptRoot\mz.ps1"
$code = @"
public static class Cover {
  static bool Ink(int[,,] a,int x,int y){int r=a[x,y,0],g=a[x,y,1],b=a[x,y,2]; return g>=60 && g>=b-10 && g>r+30;}
  // The dial's ink in A (rows ya0..ya1), shifted by dy, missing in B: what B's bubble hides.
  public static string Hidden(int[,,] A,int[,,] B,int ya0,int ya1,int dy,int x0){
    int w=A.GetLength(0); int n=0,tot=0,mnx=9999,mny=9999,mxx=-1,mxy=-1;
    for(int y=ya0;y<=ya1;y++)for(int x=x0;x<w;x++){ if(!Ink(A,x,y))continue; tot++; int yb=y+dy; if(Ink(B,x,yb))continue; n++;
      if(x<mnx)mnx=x;if(x>mxx)mxx=x;if(yb<mny)mny=yb;if(yb>mxy)mxy=yb;}
    return "dial ink "+tot+" px; hidden in B: "+n+" px"+(n>0?(" x"+mnx+"-"+mxx+" y"+mny+"-"+mxy):"");
  }
  // Per row: the dial's first ink x and the bubble's ring/body last x (non-dial ink right of x0 and left of the dial).
  public static string Rows(int[,,] B,int y0,int y1,int step){
    var sb=new System.Text.StringBuilder();
    for(int y=y0;y<=y1;y+=step){ int d=-1; for(int x=250;x<B.GetLength(0);x++) if(Ink(B,x,y)){d=x;break;}
      sb.Append("y"+y+" dial@"+d+"  "); }
    return sb.ToString();
  }
}
"@
if (-not ([System.Management.Automation.PSTypeName]'Cover').Type) { Add-Type -TypeDefinition $code }
$a305 = T '305'; $a313 = T '313'
"305 -> 313 (dy +88): " + [Cover]::Hidden($a305, $a313, 540, 610, 88, 280)
"313 dial's first green/aqua x per row:"
[Cover]::Rows($a313, 636, 690, 2)
"licence line (rows 612-640), ink right of x16 up to x290, thr 40 vs bg x200,y645:"
foreach ($n in '305','313','306','314') { $a = T $n; "  $n : " + [Mz]::Box($a, 0, 612, 290, 640, 230, 645, 40) }
"rail (Account tab) top in 305: col x280 " + [Mz]::Col($a305, 280, 700, 779, 200, 712, 12)
