// red:campaign-gates stops at its own baseline (UI.3 fails there before this change, from the contacts snapshot's
// refocusKey), so the re-pointed kitHeld pin is proved here: plant the defect it guards — ConfirmModal's ✕ drawn while a
// request is in flight — run test:campaign-gates, require UI.17 to fail, restore the bytes and prove it (sha256).
const fs = require('fs');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const ROOT = 'F:/kipindi-r4i/';
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const FILE = ROOT + 'src/components/ui/modal.tsx';
const FROM = '{!loading && <CloseX onClick={onClose} label={t.common.close} className="-mt-1 -mb-1.5 -mr-1.5 lg:-mr-3 shrink-0" />}';
const TO = '<CloseX onClick={onClose} label={t.common.close} className="-mt-1 -mb-1.5 -mr-1.5 lg:-mr-3 shrink-0" />';
const orig = fs.readFileSync(FILE);
const h0 = sha(orig);
const s = orig.toString('utf8');
if (s.split(FROM).length !== 2) { console.log('ANCHOR not found exactly once'); process.exit(1); }
let out = '', code = 0;
try {
  fs.writeFileSync(FILE, s.replace(FROM, () => TO));
  const r = spawnSync('npx', ['tsx', 'scripts/campaign-gates.test.mts'], { cwd: ROOT, encoding: 'utf8', shell: true });
  out = (r.stdout || '') + (r.stderr || ''); code = r.status;
} finally {
  fs.writeFileSync(FILE, orig);
}
const back = sha(fs.readFileSync(FILE)) === h0;
const failed = [...out.matchAll(/^FAIL (\S+)/gm)].map((m) => m[1]);
const caught = code !== 0 && failed.includes('UI.17');
console.log(`${caught ? 'CAUGHT' : 'MISSED'} UI.17 · the ✕ drawn while a request is in flight — exit ${code}, failed [${failed.join(' ')}], restored ${back ? 'byte-identical' : 'DIFFERENT'}`);
process.exit(caught && back ? 0 : 1);
