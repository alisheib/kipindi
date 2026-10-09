const fs=require('fs'),path=require('path');
function walk(d){for(const f of fs.readdirSync(d)){const p=path.join(d,f);const s=fs.statSync(p);if(s.isDirectory())walk(p);else if(/\.tsx$/.test(f))check(p);}}
function check(p){const c=fs.readFileSync(p,'utf8');const re=/<(Modal|ConfirmModal|ConfirmDialog|OperationResultModal)\b([\s\S]{0,700}?)>/g;let m;while((m=re.exec(c))){const body=m[2];const om=body.match(/\bopen(=\{[^}\n]*\}?|\b)/);const line=c.slice(0,m.index).split('\n').length;const z=body.match(/zIndex=\{([^}]+)\}/);console.log(p.split(path.sep).join('/')+':'+line+' '+m[1]+' open'+(om?om[1]:'??')+(z?' z'+z[1]:''));}}
walk('src');
