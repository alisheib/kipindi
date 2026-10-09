. "$PSScriptRoot\mz.ps1"
# The dial's ink: the green face and the aqua rim (G >= 60, G >= B-10, G > R+30), right-hand strip only.
$code = @"
public static class Dial {
  public static string Find(int[,,] a, int x0) {
    int w=a.GetLength(0), h=a.GetLength(1); int mnx=99999,mny=99999,mxx=-1,mxy=-1, n=0;
    for (int y=0;y<h;y++) for (int x=x0;x<w;x++) {
      int r=a[x,y,0], g=a[x,y,1], b=a[x,y,2];
      if (g>=60 && g>=b-10 && g>r+30) { n++; if(x<mnx)mnx=x; if(x>mxx)mxx=x; if(y<mny)mny=y; if(y>mxy)mxy=y; }
    }
    return mxx<0 ? "none" : ("x"+mnx+"-"+mxx+" y"+mny+"-"+mxy+" n"+n);
  }
}
"@
if (-not ([System.Management.Automation.PSTypeName]'Dial').Type) { Add-Type -TypeDefinition $code }
foreach ($i in 297..320) {
  $f = Get-ChildItem "$S\visual\tiles-r4" -Filter ("{0:D3}--*.png" -f $i) | Select-Object -First 1
  $a = [Mz]::Load($f.FullName)
  $w = $a.GetLength(0)
  "{0}  {1}x{2}  {3}" -f $f.Name, $w, $a.GetLength(1), [Dial]::Find($a, $w - 90)
}
