"""READ-ONLY: what a page loads UP FRONT, read from a real `next build` (.next), and which markers ride in it.

WP6c's proof (VODACOM-PLAN §0h point 20). For each app route's client-reference manifest, the entry JS files are the
chunks the browser is told to load for that route's segments before anything renders; a module reached only through a
client-side dynamic import is NOT among them. Markers are strings only one feature's code holds.
  usage: python first-load.py <repo-root> [route ...]     (default routes: /, /markets, /positions, /help)
CONTROL: the markers of a module everyone loads (the classic bar's deposit test id) must be found in the entry files,
or the reading proves nothing.
"""
import json, os, re, sys

ROOT = sys.argv[1] if len(sys.argv) > 1 else 'C:/kipindi-journey'
ROUTES = sys.argv[2:] or ['/', '/markets', '/positions', '/help']
NEXT = os.path.join(ROOT, '.next')
MARKERS = {
    'journey header': 'kp-jhdr__row',
    'journey tabs': 'journey-tabs',
    'journey flag': 'raiseJourneyFlag',
    'channels panel': '50pick-channels-shown',
    'consent prompt': 'kp-consent',
    'CONTROL classic deposit': 'deposit-header',
}

def manifest_for(route):
    """The client-reference manifest file for an app route (Next writes one per page entry)."""
    seg = route.strip('/')
    rel = 'page_client-reference-manifest.js' if not seg else os.path.join(seg, 'page_client-reference-manifest.js')
    p = os.path.join(NEXT, 'server', 'app', rel)
    return p if os.path.exists(p) else None

def entry_files(manifest_path):
    """Every JS file the manifest lists under entryJSFiles, per entry key."""
    text = open(manifest_path, encoding='utf-8').read()
    # the file is `globalThis.__RSC_MANIFEST = ...; globalThis.__RSC_MANIFEST["/page"] = {...};` — take each JSON object
    out = {}
    for m in re.finditer('__RSC_MANIFEST' + re.escape('[') + '"([^"]+)"' + re.escape(']') + ' *= *', text):
        start = m.end()
        depth, i = 0, start
        while i < len(text):
            ch = text[i]
            if ch == '{': depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0:
                    break
            elif ch == '"':
                i += 1
                while i < len(text) and text[i] != '"':
                    i += 2 if text[i] == chr(92) else 1
            i += 1
        obj = json.loads(text[start:i + 1])
        for k, files in (obj.get('entryJSFiles') or {}).items():
            out.setdefault(k, set()).update(files)
    return out

def static_text(rel):
    p = os.path.join(NEXT, rel.replace('/', os.sep))
    if not os.path.exists(p):
        p = os.path.join(NEXT, 'static', rel.split('static/', 1)[-1].replace('/', os.sep)) if 'static/' in rel else p
    return open(p, encoding='utf-8', errors='replace').read() if os.path.exists(p) else None

if not os.path.isdir(NEXT):
    print('NOT MEASURED: no .next build at', NEXT); sys.exit(2)
all_chunks = []
for dirpath, _, names in os.walk(os.path.join(NEXT, 'static', 'chunks')):
    for n in names:
        if n.endswith('.js'):
            all_chunks.append(os.path.join(dirpath, n))
where_anywhere = {k: [os.path.relpath(c, NEXT) for c in all_chunks if v in open(c, encoding='utf-8', errors='replace').read()] for k, v in MARKERS.items()}
print('chunks in the build:', len(all_chunks))
for k, v in where_anywhere.items():
    print(f'  {k:26} in {len(v)} chunk(s) anywhere: {", ".join(x.split(os.sep)[-1] for x in v[:4])}')
bad = 0
for route in ROUTES:
    mp = manifest_for(route)
    if not mp:
        print(f'{route}: NOT MEASURED — no client-reference manifest'); bad = 1; continue
    entries = entry_files(mp)
    files = sorted(set().union(*entries.values())) if entries else []
    texts = {f: static_text(f) for f in files}
    missing = [f for f, t in texts.items() if t is None]
    found = {k: [f.split('/')[-1] for f, t in texts.items() if t and v in t] for k, v in MARKERS.items()}
    size = sum(len(t) for t in texts.values() if t)
    print(f'{route}: {len(files)} entry JS files, {size} chars{f", {len(missing)} unreadable" if missing else ""}')
    for k, fs in found.items():
        print(f'    {k:26} {"IN THE FIRST LOAD (" + ", ".join(fs) + ")" if fs else "not in the first load"}')
    if not found['CONTROL classic deposit']:
        print('    ⚠️ CONTROL FAILED: the classic deposit marker is not in the entry files — this reading proves nothing'); bad = 1
sys.exit(bad)
