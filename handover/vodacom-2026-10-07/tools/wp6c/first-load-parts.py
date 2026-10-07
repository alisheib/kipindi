"""READ-ONLY companion to first-load.py for WP6c: which of AppShell's lazily loaded parts a page loads UP FRONT, read
from a real `next build` (.next), two ways, plus the control.
  usage: python first-load-parts.py [repo] [route ...] [--no-expect]   (default routes: /, /markets, /positions, /help)
From Git Bash run it with MSYS_NO_PATHCONV=1, or a route "/" becomes "C:/Program Files/Git/".
STRUCTURAL: every `next/dynamic` call carries `loadableGenerated: { modules: [id] }` in the server chunks (its loader
may end in `.catch(…)`, as WP6c's do); the route's react-loadable manifest maps that id to its chunk files, and those
are compared with the route's client-reference entryJSFiles: "own chunk" (none of its files is an entry file),
"FIRST LOAD" (one is), or "no files of its own" (the manifest lists none: its module already loads with the page).
The journey flag has no string of its own (its one call, raiseJourneyFlag, is defined in journey-on.ts, which the
Needle loads on every page by design), so it is read structurally only.
MARKERS: a string only that part's module holds (each checked unique in src on 2026-10-03), searched in the entry files.
CONTROL: the classic bar's deposit test id must be in the entry files, or the reading proves nothing.
EXPECTED after WP6c, per column (printed as a verdict unless --no-expect):
  OfflineBanner        structural: no next/dynamic entry (AppShell imports it statically)   marker: IN the first load
  WinCelebrationHost   structural: any (its module already loads with the page)             marker: IN the first load
                       (away-summary-bar.tsx imports dispatchWinCelebration from it)
  JourneyFlag          structural: own chunk                                                marker: -
  every other part     structural: own chunk                                                marker: not in the first load
Exit 0 when every route was read, its control found and (unless --no-expect) every verdict as expected; 1 otherwise.
NO backslash is typed in this file: a regex escape is "~", turned into chr(92) below.
"""
import json
import os
import re
import sys

BS = chr(92)
R = lambda p: re.compile(p.replace('~', BS))
EXPECT_ON = '--no-expect' not in sys.argv
args = [a for a in sys.argv[1:] if a != '--no-expect']
ROOT = args.pop(0) if args and not args[0].startswith('/') else 'C:/kipindi-journey'
ROUTES = args or ['/', '/markets', '/positions', '/help']
NEXT = os.path.join(ROOT, '.next')
PARTS = {
    'OfflineBanner': 'warning-bg) 88%',
    'PullToRefresh': 'opacity var(--t-flick)',
    'WinCelebrationHost': '50pick:celebrate',
    'NotifyPoller': '50pick-notify-seen-positions',
    'EventStreamProvider': '/api/events',
    'InstallInvite': '50pick-install-visits',
    'ConsentPrompt': 'kp-consent-force',
    'ChannelsPanel': '50pick-channels-shown',
    'JourneyFlag': None,
    'JourneyTopBar': 'kp-jhdr__row',
    'JourneyTabs': '"journey-tabs"',
    # S6 A8h (2026-10-04, read 2026-10-07): the sale-result host, signed in only. Its marker is the one string only its
    # module holds in src (checked 2026-10-07): the field selector its NOWHERE test uses. Expected: own chunk, off the first load.
    'SellResultHost': 'input, select, textarea, [contenteditable]',
}
CONTROL = 'deposit-header'
LOADABLE = R('~.then~((~w+)=>~1~.(~w+)~)(?:~.catch~([^()]*~))?,~{[^{}]*?loadableGenerated:~{modules:~[([^~]]*)~]~}')
EXPECT = {
    'OfflineBanner': ('no next/dynamic entry', 'IN the first load'),
    'WinCelebrationHost': (None, 'IN the first load'),
    'JourneyFlag': ('own chunk', '-'),
}
MANIFEST_KEY = R('__RSC_MANIFEST~["([^"]+)"~] *= *')

if not os.path.isdir(NEXT):
    print('NOT MEASURED: no .next build at', NEXT)
    sys.exit(2)


def read(p):
    return open(p, encoding='utf-8', errors='replace').read()


# module id -> the component its next/dynamic picks, from the server chunks
symbol_of = {}
for dirpath, _, names in os.walk(os.path.join(NEXT, 'server')):
    for n in names:
        if n.endswith('.js'):
            for m in LOADABLE.finditer(read(os.path.join(dirpath, n))):
                for mid in m.group(3).split(','):
                    symbol_of.setdefault(mid.strip().strip('"'), set()).add(m.group(2))


def entry_files(route):
    seg = route.strip('/')
    p = os.path.join(NEXT, 'server', 'app', *(seg.split('/') if seg else []), 'page_client-reference-manifest.js')
    if not os.path.exists(p):
        return None
    text = read(p)
    out = set()
    for m in MANIFEST_KEY.finditer(text):
        depth, i, start = 0, m.end(), m.end()
        while i < len(text):
            ch = text[i]
            if ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0:
                    break
            elif ch == '"':
                i += 1
                while i < len(text) and text[i] != '"':
                    i += 2 if text[i] == BS else 1
            i += 1
        for files in (json.loads(text[start:i + 1]).get('entryJSFiles') or {}).values():
            out.update(files)
    return out


def loadable(route):
    seg = route.strip('/')
    p = os.path.join(NEXT, 'server', 'app', *(seg.split('/') if seg else []), 'page', 'react-loadable-manifest.json')
    return json.load(open(p, encoding='utf-8')) if os.path.exists(p) else None


def static_text(rel):
    p = os.path.join(NEXT, rel.replace('/', os.sep))
    return read(p) if os.path.exists(p) else ''


bad = 0
for route in ROUTES:
    entries = entry_files(route)
    lm = loadable(route)
    if entries is None or lm is None:
        print(f'{route}: NOT MEASURED (no client-reference or react-loadable manifest)')
        bad = 1
        continue
    first = ''.join(static_text(f) for f in sorted(entries))
    control = CONTROL in first
    print(f'{route}: {len(entries)} entry JS files, {len(first)} chars; control (classic deposit test id) {"FOUND" if control else "MISSING"}')
    if not control:
        bad = 1
    by_symbol = {}
    for mid, row in lm.items():
        for sym in symbol_of.get(str(mid), {'?'}):
            by_symbol.setdefault(sym, []).append((mid, row.get('files', [])))
    for sym, marker in PARTS.items():
        rows = by_symbol.get(sym, [])
        if rows:
            all_files = sorted(set(f for _, files in rows for f in files))
            in_first = [f for f in all_files if f in entries]
            if not all_files:
                struct = 'no files of its own'
            elif in_first:
                struct = 'FIRST LOAD (' + ', '.join(x.split('/')[-1] for x in in_first) + ')'
            else:
                struct = f'own chunk ({len(all_files)} file{"s" if len(all_files) != 1 else ""})'
        else:
            struct = 'no next/dynamic entry'
        mark = '-' if marker is None else ('IN the first load' if marker in first else 'not in the first load')
        verdict = ''
        if EXPECT_ON:
            want_s, want_m = EXPECT.get(sym, ('own chunk', 'not in the first load'))
            good = (want_s is None or struct.startswith(want_s)) and mark == want_m
            verdict = 'as expected' if good else 'UNEXPECTED'
            if not good:
                bad = 1
        print(f'    {sym:22} structural: {struct:40} marker: {mark:24} {verdict}')
    others = sorted(s for s in by_symbol if s not in PARTS)
    if others:
        print('    other next/dynamic parts on this route:', ', '.join(others))
sys.exit(bad)
