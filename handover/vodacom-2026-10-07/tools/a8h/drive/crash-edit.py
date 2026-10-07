import sys
# The A8h lost-chunk control's throwaway edit: "strip" removes the LazySellResultHost line's .catch(nothingIfLost);
# "restore" puts it back. Each asserts the line it expects is there exactly once.
f = 'src/components/layout/shell-lazy.tsx'
a = 'import("@/components/markets/sell-result-host").then((m) => m.SellResultHost).catch(nothingIfLost));'
b = 'import("@/components/markets/sell-result-host").then((m) => m.SellResultHost));'
mode = sys.argv[1]
s = open(f, encoding='utf-8', newline='').read()
if mode == 'strip':
    assert s.count(a) == 1, 'the guarded line is not there once'
    s2 = s.replace(a, b)
    print('guard removed from the sell-result line (throwaway)')
else:
    if s.count(b) == 1:
        s2 = s.replace(b, a)
    else:
        s2 = s
    print('restore: guarded', s2.count(a), 'stripped', s2.count(b))
# Write only after the new text is fully built (open(...,'w') truncates first).
with open(f, 'w', encoding='utf-8', newline='') as fh:
    fh.write(s2)
