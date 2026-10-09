import fs from "node:fs";
const Q = String.fromCharCode(34), NL = String.fromCharCode(10);
const spec = {
  "src/app/admin/staff/staff-forms.tsx": [
    ["        onConfirm={() => { setConfirming(false); run(); }}" + NL + "        title={isRevoke ? " + Q + "Revoke staff access?" + Q,
     "        onConfirm={confirmRun}" + NL + "        title={isRevoke ? " + Q + "Revoke staff access?" + Q],
    ["  const run = () => {" + NL + "    start(async () => {" + NL + "      const fd = new FormData();" + NL + "      fd.set(" + Q + "userId" + Q + ", userId);",
     "  const confirmRun = () => { setConfirming(false); run(); };" + NL + "  const run = () => {" + NL + "    start(async () => {" + NL + "      const fd = new FormData();" + NL + "      fd.set(" + Q + "userId" + Q + ", userId);"],
    ["focusFirstInvalid(assignFormRef.current, fields); return; }" + NL + "    setConfirming(true);",
     "focusFirstInvalid(assignFormRef.current, fields); return; }" + NL + "    run();"],
  ],
};
fs.writeFileSync(process.argv[2], JSON.stringify(spec, null, 1));
