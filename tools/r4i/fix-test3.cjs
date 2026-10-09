const edit = require("./edit-lib.cjs");
process.chdir("F:/kipindi-r4i");
edit("scripts/visual-pass-r4i.test.mts", [
  ["  const btnTopShift = /-mt-1 -mr-1\\.5 lg:-mr-3 shrink-0 inline-flex h-8 w-8/.test(confirm) ? -twStep(\"1\") : 0;",
   "  const closeX = /function CloseX\\([\\s\\S]*?className=\\{`\\$\\{className\\} inline-flex h-8 w-8 items-center justify-center rounded-md/.test(MOD);\n  const btnTopShift = closeX && /<CloseX onClick=\\{onClose\\} label=\\{t\\.common\\.close\\} className=\"-mt-1 -mr-1\\.5 lg:-mr-3 shrink-0\" \\/>/.test(confirm) ? -twStep(\"1\") : 0;"],
  ["    /showClose=\\{false\\}/.test(confirm) && /\\{!loading && \\(\\s*<button\\s+type=\"button\"\\s+onClick=\\{onClose\\}\\s+aria-label=\\{t\\.common\\.close\\}/.test(confirm)",
   "    /showClose=\\{false\\}/.test(confirm) && /\\{!loading && <CloseX onClick=\\{onClose\\}/.test(confirm)"],
  ["    24 - twStep(\"1.5\") === 16 && 32 - twStep(\"3\") === 16 && /absolute right-3 top-3 inline-flex h-8 w-8/.test(MOD) && twStep(\"3\") === 16);",
   "    24 - twStep(\"1.5\") === 16 && 32 - twStep(\"3\") === 16 && /\\{showClose && <CloseX onClick=\\{onClose\\} label=\\{t\\.common\\.close\\} className=\"absolute right-3 top-3\" \\/>\\}/.test(MOD) && twStep(\"3\") === 16);"],
  ["  const plant = confirm.replace(\"-mt-1 -mr-1.5 lg:-mr-3 shrink-0\", \"-mr-1.5 lg:-mr-3 shrink-0\");\n  ok(\"4.1‴ PLANT · the ✕ without its 4px rise is reported (24 against 20)\", !/-mt-1 -mr-1\\.5 lg:-mr-3 shrink-0/.test(plant));",
   "  const plant = confirm.replace(\"-mt-1 -mr-1.5 lg:-mr-3 shrink-0\", \"-mr-1.5 lg:-mr-3 shrink-0\");\n  ok(\"4.1‴ PLANT · the ✕ without its 4px rise is reported (24 against 20)\", !/className=\"-mt-1 -mr-1\\.5 lg:-mr-3 shrink-0\"/.test(plant));"],
]);
