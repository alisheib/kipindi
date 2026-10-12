import sys
root = sys.argv[1]
which = sys.argv[2]
def remount(rel):
    p = f"{root}/{rel}"
    lines = open(p, encoding='utf-8').read().split("\n")
    i = next(k for k, l in enumerate(lines) if l.strip() == "{journey ? (")
    pad = lines[i][:len(lines[i]) - len(lines[i].lstrip())]
    e = next(k for k in range(i + 1, len(lines)) if lines[k] == pad + ") : (")
    c = next(k for k in range(e + 1, len(lines)) if lines[k] == pad + ")}")
    arm = lines[e + 1:c]
    out = lines[:i] + arm + lines[c + 1:]
    open(p, "w", encoding="utf-8").write("\n".join(out))
    print(f"re-mounted {rel}: lines {i+1}-{c+1} -> the else arm ({len(arm)} lines)")
if which == "wall":
    remount("src/app/live/page.tsx")
elif which == "card":
    for rel in ["src/app/watchlist/page.tsx", "src/app/results/page.tsx", "src/app/markets/[id]/page.tsx"]:
        remount(rel)
    p = f"{root}/src/app/markets/[id]/page.tsx"
    s = open(p, encoding="utf-8").read()
    a = "{journey ? t.journey.similarTitle : t.market.similarMarkets}"
    assert s.count(a) == 1
    open(p, "w", encoding="utf-8").write(s.replace(a, "{t.market.similarMarkets}"))
    print("the rail's heading: t.market.similarMarkets for every request")
