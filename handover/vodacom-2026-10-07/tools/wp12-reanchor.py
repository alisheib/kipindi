import json, shutil
# Re-anchor WP12's CHANGELOG edit onto the changelog's current first entry (A8d+A8g's, 2026-10-04), newest first.
P = 'C:/Users/Ali/AppData/Local/Temp/claude/C--Users-Ali/0cb4430f-1841-4f87-b929-7c29d30c9a10/scratchpad/s6/WP12.json'
CL = 'C:/kipindi-journey/docs/design-system/v2-2026-07-27/07-provenance/CHANGELOG.md'
NL = chr(10)
cs = json.load(open(P, encoding='utf-8'))
log = open(CL, encoding='utf-8').read()  # universal newlines: the changelog is CRLF, the change set's text LF (apply_changeset maps them)
head = '# Changelog (reconstructed)' + NL + NL
assert log.startswith(head), 'the changelog does not start with its title and a blank line'
first = log[len(head):].split(NL, 1)[0]
assert first.startswith('## 2026-10-04 (design-system · Sell button)'), first[:120]
OLD_FIRST = '## 2026-09-18 (design-system · progress-bar) — a bar that can name what it is measuring, in two props not one'
hits = [i for i, e in enumerate(cs['edits']) if 'CHANGELOG' in e['file']]
assert len(hits) == 1, hits
e = cs['edits'][hits[0]]
assert e['find'] == head + OLD_FIRST, repr(e['find'][:160])
assert e['replace'].count(OLD_FIRST) == 1 and e['replace'].endswith(OLD_FIRST), 'the replace does not end with the old anchor'
e['find'] = head + first
e['replace'] = e['replace'][: -len(OLD_FIRST)] + first
assert log.count(e['find']) == 1
shutil.copyfile(P, P + '.before-reanchor')
text = json.dumps(cs, ensure_ascii=False, indent=1)
with open(P, 'w', encoding='utf-8', newline='') as fh:
    fh.write(text)
print('re-anchored onto:', first[:100])
