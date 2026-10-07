"""Apply a staged change set (JSON: newFiles[{path,content}], edits[{file,find,replace}]) to the repo.
Every edit's find must occur EXACTLY ONCE (newline-style-insensitive). Dry-run first; nothing is written unless all
edits resolve. Usage: python apply_changeset.py <changeset.json> [--write]"""
import json, os, sys
REPO = 'C:/kipindi-journey'
CR, LF = chr(13), chr(10)
CRLF = CR + LF
def nl_of(text): return CRLF if CRLF in text else LF
def to_nl(s, nl): return s.replace(CRLF, LF).replace(LF, nl) if nl == CRLF else s.replace(CRLF, LF)
cs = json.load(open(sys.argv[1], encoding='utf-8'))
write = '--write' in sys.argv
problems, plan = [], {}
for nf in cs.get('newFiles', []):
    p = os.path.join(REPO, nf['path'])
    if os.path.exists(p): problems.append('new file already exists: ' + nf['path'])
    plan[nf['path']] = ('new', nf['content'])
for e in cs.get('edits', []):
    f = e['file']
    if f in plan and plan[f][0] == 'new':
        cur = plan[f][1]
    elif f in plan:
        cur = plan[f][1]
    else:
        p = os.path.join(REPO, f)
        if not os.path.exists(p): problems.append('missing file: ' + f); continue
        cur = open(p, encoding='utf-8', newline='').read()
    nl = nl_of(cur)
    find, rep = to_nl(e['find'], nl), to_nl(e['replace'], nl)
    n = cur.count(find)
    if n != 1:
        problems.append(f'{f}: find occurs {n}x: {e["find"][:90]!r}'); continue
    cur = cur.replace(find, rep, 1)
    plan[f] = (plan[f][0] if f in plan else 'edit', cur)
bad = [(k, [hex(ord(c)) for c in v[1] if ord(c) < 32 and c not in (CR, LF, chr(9))][:3]) for k, v in plan.items()]
bad = [b for b in bad if b[1]]
if bad: problems.append('control characters: ' + repr(bad))
print(f"{len(plan)} files, {len(cs.get('edits', []))} edits, {len(cs.get('newFiles', []))} new")
if problems:
    print('PROBLEMS:'); [print('  -', x) for x in problems]; sys.exit(1)
if not write:
    print('dry run OK'); sys.exit(0)
for f, (kind, text) in plan.items():
    p = os.path.join(REPO, f)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    tmp = p + '.tmp-apply'
    open(tmp, 'w', encoding='utf-8', newline='').write(text)
    os.replace(tmp, p)
    print(kind, f)
