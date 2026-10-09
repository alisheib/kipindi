const fs = require("fs");
const dir = process.argv[2];
let s = fs.readFileSync(`${dir}/orig.tsx`, "utf8");
if (s.includes("\r")) throw new Error("expected LF blob content");
const imp = 'import type { Locale } from "@/lib/i18n-dict";\n';
const addImp = 'import type { Locale } from "@/lib/i18n-dict";\n'
  + "// ⭐ R4-J (2026-10-09): every not-found answer says so to what stands outside the page (`lib/not-found-mark.ts`).\n"
  + 'import { NotFoundMark } from "@/components/ui/not-found-mark";\n';
if (s.split(imp).length !== 2) throw new Error("import anchor");
s = s.replace(imp, addImp);
const topo = '      <div aria-hidden className="kp-nf-topo">\n';
const withMark = '      {/* ⭐ THE NOT-FOUND MARK (R4-J, 2026-10-09): an empty, hidden span and its announcement — the Needle, the chat\n'
  + '          bubble and the channels panel stop standing down for a question page that is not there, the journey\'s chrome\n'
  + '          lights no tab and stops its unread polls (a Server Action posted to a not-found address is answered 404). */}\n'
  + '      <NotFoundMark />\n'
  + topo;
if (s.split(topo).length !== 2) throw new Error("topo anchor");
s = s.replace(topo, withMark);
fs.writeFileSync(`${dir}/new.tsx`, s);
console.log("ok");
