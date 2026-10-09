const SPACE = "[ " + String.fromCharCode(9, 10, 13) + "]";
const S = SPACE + "*", S1 = SPACE + "+";
const NAME = "[A-Za-z_$][A-Za-z0-9_$]*";
const MEMBER = new RegExp("^" + NAME + "(?:" + S + "[?]?[.]" + S + NAME + ")+$");
const WRAPPER = new RegExp("^(?:async" + S1 + ")?(?:[(][^()]*[)]|" + NAME + ")" + S + "=>" + S + "(?:[{]" + S + "(?:return" + S1 + ")?)?("
  + NAME + "(?:" + S + "[?]?[.]" + S + NAME + ")*)" + S + "[(][^()]*[)]" + S + ";?" + S + "[}]?$");
const BARE_START = "(?<![A-Za-z0-9_$.])";
const CALL = new RegExp(BARE_START + "(" + NAME + ")" + S + "[(]", "g");
for (const t of ["(e) => onKeyRef.current(e)", "(e) => onKeyRef.current?.(e)", "(e) => { e.stopPropagation(); keys.onKey(e); }", "(e) => void onKeyRef.current(e)", "handlers.onKey"]) {
  console.log(JSON.stringify(t), "MEMBER", MEMBER.test(t), "WRAPPER", !!WRAPPER.exec(t), "bareCalls", [...t.matchAll(CALL)].map(m=>m[1]));
}
console.log("K.isConfirmKey bare calls:", [..."if (K.isConfirmKey(e)) onConfirm();".matchAll(CALL)].map(m=>m[1]));
