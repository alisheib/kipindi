"""Builds the W0 Phosphor specimen page for Ali.

    python -I build.py <glyphs.tsx> <phosphor assets dir> <out.html>

Today's column is the REAL house drawing, read from glyphs.tsx. Phosphor's is the verified
@phosphor-icons/core 2.1.1 tarball; only <path d> data (and the duotone layer's opacity) is taken,
and every d string is checked to hold nothing but SVG path characters before it is embedded.
"""
import os
import re
import sys

GLYPHS_TSX, PH_DIR, OUT = sys.argv[1], sys.argv[2], sys.argv[3]

# ---------- the house family, from the live source ----------
src = open(GLYPHS_TSX, encoding="utf-8").read()
HOUSE = {}
for m in re.finditer(r"^\s*(\w+): \(p: GlyphProps\) => <G \{\.\.\.p\}>(.*)</G>,\s*$", src, re.M):
    inner = m.group(2)
    inner = inner.replace("strokeWidth=", "stroke-width=").replace("strokeDasharray=", "stroke-dasharray=")
    inner = inner.replace("strokeLinecap=", "stroke-linecap=").replace("strokeLinejoin=", "stroke-linejoin=")
    if "{" in inner or "}" in inner:
        raise SystemExit(f"house glyph {m.group(1)} carries a JSX expression; refusing to embed")
    HOUSE[m.group(1)] = inner

# ---------- Phosphor, from the verified package ----------
D_OK = re.compile(r"^[MmLlHhVvCcSsQqTtAaZz0-9.,\- ]+$")
WEIGHTS = ["regular", "bold", "fill", "duotone"]


def phosphor(name, weight):
    fn = f"{name}.svg" if weight == "regular" else f"{name}-{weight}.svg"
    path = os.path.join(PH_DIR, weight, fn)
    svg = open(path, encoding="utf-8").read()
    parts = re.findall(r'<path d="([^"]+)"( opacity="0\.2")?\s*/>', svg)
    if not parts:
        raise SystemExit(f"no paths in {path}")
    out = []
    for d, tone in parts:
        if not D_OK.match(d):
            raise SystemExit(f"unexpected characters in {path}")
        out.append(f'<path d="{d}" class="tone" style="opacity:var(--tone,0.2)"/>' if tone else f'<path d="{d}"/>')
    return "".join(out)


# ---------- what the page shows ----------
STRIP = [  # (house key, phosphor name, label)
    ("markets", "scales", "Markets"), ("trendingUp", "trend-up", "Up & Down"), ("bolt", "lightning", "Live"),
    ("menu", "list", "More"), ("questionCircle", "question", "Maswali"), ("trade", "arrows-down-up", "Juu/Chini"),
    ("ticket", "ticket", "Tickets"), ("user", "user", "Account"), ("bell", "bell", "Alerts"),
    ("wallet", "wallet", "Wallet"), ("shieldcheck", "shield-check", "Verified"), ("football", "soccer-ball", "Football"),
    ("trophy", "trophy", "Winners"), ("coins", "coins", "Coins"),
]
HUB = [("user", "user", "Wasifu", "Jina, simu na barua pepe"), ("users", "users", "Alika marafiki", "Shiriki kiungo chako"),
       ("checkCircle", "seal-check", "Uthibitisho wa utatuzi", "Jinsi matokeo yanavyothibitishwa"),
       ("headset", "headset", "Msaada", "Maswali ya kawaida · Simu · Barua pepe"),
       ("bell", "bell", "Arifa", "Ujumbe na taarifa za tiketi"), ("globe", "globe", "Lugha", "Kiswahili")]
LEX = [
    ("5.1", "The board — classic tab “Masoko”, journey tab “Maswali”", "Today: a balance scale (classic) and a Help “?” (journey). One meaning, so one glyph for both.",
     [("A", "squares-four", "Squares", True), ("B", "scales", "Scale (today's classic idea)", False), ("C", "chart-bar", "Bar chart", False), ("D", "cards", "Cards", False)]),
    ("5.2", "Live — “Mubashara”", "Today: lightning, a broadcast mark, a red dot and a teal dot.",
     [("A", "broadcast", "Broadcast", True), ("B", "lightning", "Lightning", False), ("C", "record", "Record dot", False)]),
    ("5.3", "Deposit and withdraw — “Weka pesa” / “Toa pesa”", "Today: ⊕ in one place, ↓ in another; an upload icon and ↑.",
     [("A", "arrow-line-down|arrow-line-up", "Arrow to a line", True), ("B", "download-simple|upload-simple", "Tray arrows", False), ("C", "plus-circle|minus-circle", "Plus / minus", False)]),
    ("5.4", "Up & Down — “Juu/Chini”", "Today: a rising line (classic) and ⇅ (journey).",
     [("A", "arrows-down-up", "Up-and-down arrows", True), ("B", "trend-up", "Rising line", False), ("C", "chart-line-up", "Line chart", False)]),
    ("5.5", "Results — “Matokeo”", "Today: a dashed starburst with a check, which reads like a loading spinner.",
     [("A", "seal-check", "Seal with a check", True), ("B", "flag-checkered", "Chequered flag", False), ("C", "check-square", "Checked box", False)]),
    ("5.6", "Proposals — “Mapendekezo”", "Today: a sparkle in the hub and a trophy on its own page.",
     [("A", "lightbulb", "Light bulb", True), ("B", "sparkle", "Sparkle", False)]),
    ("5.7", "Limits and breaks — “Weka mipaka”", "Today: a shield, which also means “verified”.",
     [("A", "hand-palm", "Open hand", True), ("B", "gauge", "Gauge", False), ("C", "shield-check", "Shield (today)", False)]),
]
STATUS = [("seal-check", "fill", "USHINDI", "Won", "won"), ("x-circle", "regular", "HASARA", "Lost", "lost"),
          ("prohibit", "regular", "IMEBATILISHWA", "Void", "void"), ("clock-countdown", "regular", "INASUBIRI", "Pending", "pend")]
ADMIN = [("squares-four", "Overview"), ("users", "Players"), ("chart-line-up", "Markets"), ("wallet", "Payments"),
         ("shield-check", "KYC queue"), ("robot", "House bots"), ("megaphone", "Marketing"), ("receipt", "Tax report"),
         ("gear-six", "Configuration")]
BADGE_PH = [("crosshair", "First prediction"), ("medal", "First win"), ("target", "Sharp")]
BADGE_HOUSE = {
    "First prediction": '<path d="M19 10 H15 Q10 10 10 15 V19"/><path d="M37 10 H41 Q46 10 46 15 V19"/><path d="M19 46 H15 Q10 46 10 41 V37"/><path d="M37 46 H41 Q46 46 46 41 V37"/><line x1="28" y1="19" x2="28" y2="24"/><line x1="28" y1="32" x2="28" y2="37"/><line x1="19" y1="28" x2="24" y2="28"/><line x1="32" y1="28" x2="37" y2="28"/><circle cx="28" cy="28" r="2.6" stroke="none" fill="var(--metal)"/>',
    "First win": '<path d="M21 46 Q13 38 13 26 Q13 18 17 12"/><path d="M14 36 q-6 -1 -8 -6"/><path d="M13 27 q-6 -2 -7 -7"/><path d="M15 19 q-5 -3 -5 -8"/><path d="M35 46 Q43 38 43 26 Q43 18 39 12"/><path d="M42 36 q6 -1 8 -6"/><path d="M43 27 q6 -2 7 -7"/><path d="M41 19 q5 -3 5 -8"/><path d="M21 28 l5.5 6 L36 21" stroke="var(--metal)"/>',
    "Sharp": '<circle cx="28" cy="28" r="17"/><circle cx="28" cy="28" r="10.5"/><line x1="28" y1="6" x2="28" y2="12"/><line x1="28" y1="44" x2="28" y2="50"/><line x1="6" y1="28" x2="12" y2="28"/><line x1="44" y1="28" x2="50" y2="28"/><circle cx="28" cy="28" r="2.6" stroke="none" fill="var(--metal)"/>',
}

# every Phosphor name the page draws
ph_names = set()
for _, p, _ in STRIP: ph_names.add(p)
for _, p, _, _ in HUB: ph_names.add(p)
for _, _, _, opts in LEX:
    for _, names, _, _ in opts: ph_names.update(names.split("|"))
for n, *_ in STATUS: ph_names.add(n)
for n, _ in ADMIN: ph_names.add(n)
for n, _ in BADGE_PH: ph_names.add(n)
ph_names.update(["arrow-line-down", "arrow-line-up", "cloud-rain", "ticket", "squares-four", "broadcast", "arrows-down-up", "list", "caret-right", "plus", "bell-ringing"])
house_keys = {h for h, _, _ in STRIP} | {h for h, _, _, _ in HUB} | {"arrowDownToLine", "arrowUpFromLine", "weather", "chevronRight", "plus"}

symbols = []
for k in sorted(house_keys):
    if k not in HOUSE:
        raise SystemExit(f"house key {k} not found in glyphs.tsx")
    symbols.append(f'<symbol id="h-{k}" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">{HOUSE[k]}</g></symbol>')
for n in sorted(ph_names):
    for w in WEIGHTS:
        symbols.append(f'<symbol id="p-{n}-{w}" viewBox="0 0 256 256"><g fill="currentColor">{phosphor(n, w)}</g></symbol>')
SPRITE = '<svg width="0" height="0" style="position:absolute" aria-hidden="true">' + "".join(symbols) + "</svg>"


def h(key, s, cls=""):
    return f'<svg class="g {cls}" width="{s}" height="{s}" aria-hidden="true"><use href="#h-{key}"/></svg>'


def p(name, weight, s, cls=""):
    return f'<svg class="g {cls}" width="{s}" height="{s}" aria-hidden="true"><use href="#p-{name}-{weight}"/></svg>'


def px(units, grid, s):
    return f"{units * s / grid:.2f}".rstrip("0").rstrip(".")


# ---------- Q1: line weight ----------
def strip_row(kind, s):
    cells = []
    for hk, pn, label in STRIP:
        if kind == "today":
            g = h(hk, s)
        elif kind == "regular":
            g = p(pn, "regular", s)
        elif kind == "bold26":
            g = p(pn, "bold" if s <= 26 else "regular", s)
        else:
            g = p(pn, "bold" if s <= 18 else "regular", s)
        cells.append(f'<span class="cell" title="{label}">{g}</span>')
    return "".join(cells)


def weight_note(kind, s):
    if kind == "today":
        return f"{px(1.9, 24, s)} px line"
    if kind == "regular":
        return f"{px(16, 256, s)} px line"
    if kind == "bold26":
        return f"{px(24 if s <= 26 else 16, 256, s)} px line"
    return f"{px(24 if s <= 18 else 16, 256, s)} px line"


def strip_card(kind):
    rows = "".join(
        f'<div class="striprow"><span class="sz mono">{s} px · {weight_note(kind, s)}</span><div class="strip">{strip_row(kind, s)}</div></div>'
        for s in (14, 20)
    )
    return rows


Q1_OPTS = [("A", "regular", "Phosphor Regular", "Light and elegant. Thinner than today at every size: 0.88 px at 14 px.", False),
           ("B", "bold26", "Bold up to 26 px", "Bold for every icon in lists, buttons and tab bars; large art on plates and empty states uses Regular so it never turns heavy. The most life.", True),
           ("C", "switch", "Bold up to 18 px", "Bold for small icons, Regular from 19 px, so every size paints an even 1.3–1.6 px. Tab-bar icons come out thinner than today.", False)]

# ---------- rails ----------
def classic_rail(mode, size):
    items = [("markets", "squares-four", "Masoko", True), ("trendingUp", "arrows-down-up", "Juu/Chini", False), None,
             ("bolt", "broadcast", "Mubashara", False), ("menu", "list", "Zaidi", False)]
    out = []
    for it in items:
        if it is None:
            out.append('<li class="rail-coin"><span class="coin"><svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/></svg></span><span class="rl gilt">Amana</span></li>')
            continue
        hk, pn, lab, on = it
        if mode == "today":
            g = h(hk, 20)
        else:
            g = p(pn, "fill" if on else "bold", size)
        out.append(f'<li class="{"on" if on else ""}"><span class="pip {mode}">{g}</span><span class="rl">{lab}</span></li>')
    return f'<ul class="rail">{"".join(out)}</ul>'


def journey_rail(pill, size=24):
    items = [("questionCircle", "squares-four", "Maswali", False), ("trade", "arrows-down-up", "Juu/Chini", False),
             ("ticket", "ticket", "Tiketi zangu", True), ("user", "user", "Akaunti", False)]
    out = []
    for hk, pn, lab, on in items:
        g = p(pn, "fill" if on else "bold", size)
        out.append(f'<li class="{"on" if on else ""}"><span class="pip {pill}">{g}</span><span class="rl">{lab}</span></li>')
    return f'<ul class="rail four">{"".join(out)}</ul>'


# ---------- hub rows (Q2) ----------
def hub(tone_class):
    rows = []
    for hk, pn, title, sub in HUB:
        rows.append(f'<li><span class="plate">{p(pn, "duotone", 20)}</span><span class="ht"><b>{title}</b><small>{sub}</small></span>{p("caret-right", "bold", 14, "chev")}</li>')
    return f'<ul class="hub {tone_class}">{"".join(rows)}</ul>'


def hub_today():
    rows = []
    for hk, pn, title, sub in HUB:
        rows.append(f'<li><span class="noplate">{h(hk, 20)}</span><span class="ht"><b>{title}</b><small>{sub}</small></span>{h("chevronRight", 14, "chev")}</li>')
    return f'<ul class="hub">{"".join(rows)}</ul>'


# ---------- assemble ----------
def opt_button(q, letter, title, body, rec, inner):
    star = '<span class="rec">Recommended</span>' if rec else ""
    body_html = f'<span class="optbody">{body}</span>' if body else ""
    cls = "opt" if body else "opt nobody"
    return (f'<button type="button" class="{cls}" data-q="{q}" data-v="{letter}" aria-pressed="false">'
            f'<span class="opthead"><span class="letter mono">{q}{letter}</span><span class="opttitle">{title}</span>{star}</span>'
            f'{body_html}<span class="optview">{inner}</span></button>')


sections = []

# Hero: before / after
sections.append(f'''
<section class="hero">
  <div class="phone"><p class="cap mono">Today</p>{classic_rail("today", 20)}</div>
  <div class="phone"><p class="cap mono">Phosphor, as recommended</p>{classic_rail("after", 24)}</div>
</section>''')

# Q1
q1 = "".join(opt_button("1", L, t, b, r, strip_card(k)) for L, k, t, b, r in Q1_OPTS)
sections.append(f'''
<section class="q" id="q1">
  <h2><span class="qn mono">1</span> How thick should everyday icons be?</h2>
  <p class="lede">The same 14 icons at 14 px (the size used most) and 20 px. Today's set is shown first for reference.</p>
  <div class="ref"><p class="cap mono">Today — the house family, 1.9 stroke</p>{strip_card("today")}</div>
  <div class="opts">{q1}</div>
</section>''')

# Q2
q2 = "".join(opt_button("2", L, t, b, r, hub(cls)) for L, cls, t, b, r in [
    ("A", "tone16", "Soft tone · 16%", "A faint fill inside each icon.", False),
    ("B", "tone20", "Phosphor's tone · 20%", "Phosphor's own Duotone strength.", True),
    ("C", "tone28", "Strong tone · 28%", "The fill reads clearly, even on a dim screen.", False)])
sections.append(f'''
<section class="q" id="q2">
  <h2><span class="qn mono">2</span> How strong should the two-tone fill be?</h2>
  <p class="lede">Duotone icons sit on plates in lists like the account hub. Today the hub has thin icons and no plates on phones.</p>
  <div class="ref"><p class="cap mono">Today — the account hub on a phone</p>{hub_today()}</div>
  <div class="opts three">{q2}</div>
</section>''')

# Q3
q3 = "".join(opt_button("3", L, t, b, r, journey_rail(cls)) for L, cls, t, b, r in [
    ("A", "pill-today", "Today's pill", "The see-through indigo pill (1.18:1 against the bar), now with a filled icon.", False),
    ("B", "pill-solid", "Solid pill", "An opaque royal pill with a lit edge, so the selected tab is obvious.", True)])
sections.append(f'''
<section class="q" id="q3">
  <h2><span class="qn mono">3</span> How should the selected tab show?</h2>
  <p class="lede">Android and iPhone both fill the selected tab's icon. Both options do that; they differ in the pill behind it.</p>
  <div class="opts two">{q3}</div>
</section>''')

# Q4
q4 = "".join(opt_button("4", L, t, b, r, classic_rail("after", s)) for L, s, t, b, r in [
    ("A", 20, "20 px", "Today's size.", False), ("B", 24, "24 px", "The size Android and iPhone use in their tab bars.", True)])
sections.append(f'''
<section class="q" id="q4">
  <h2><span class="qn mono">4</span> How big should the tab-bar icons be?</h2>
  <p class="lede">The classic rail your players use today, with Phosphor icons and the selected tab filled.</p>
  <div class="opts two">{q4}</div>
</section>''')

# Q5 lexicon
lex_html = []
for qid, title, today, opts in LEX:
    btns = []
    for L, names, lab, rec in opts:
        ns = names.split("|")
        icons = "".join(f'<span class="pair">{p(n, "regular", 28)}{p(n, "fill", 28)}</span>' for n in ns)
        btns.append(opt_button(qid, L, lab, "", rec, f'<span class="lexicons">{icons}</span>'))
    lex_html.append(f'<div class="lex"><h3>{title}</h3><p class="lede small">{today}</p><div class="opts lexopts">{"".join(btns)}</div></div>')
sections.append(f'''
<section class="q" id="q5">
  <h2><span class="qn mono">5</span> One meaning, one icon</h2>
  <p class="lede">The inspection found meanings drawn several ways, and icons that read as something else. Pick one for each. Each option shows its outline and its filled form.</p>
  {"".join(lex_html)}
</section>''')

# Q6 badges
def medal_house(name):
    return f'<span class="medal"><svg width="38" height="38" viewBox="0 0 56 56" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{BADGE_HOUSE[name]}</svg></span>'


def medal_ph(name):
    return f'<span class="medal ph">{p(name, "duotone", 34)}</span>'


badges_a = "".join(f'<span class="badge">{medal_house(n)}<small>{n}</small></span>' for _, n in BADGE_PH)
badges_b = "".join(f'<span class="badge">{medal_ph(pn)}<small>{n}</small></span>' for pn, n in BADGE_PH)
q6 = opt_button("6", "A", "Keep today's badge art", "The badges are identity art, like the brand mark. They stay drawn by hand.", True, f'<span class="badges">{badges_a}</span>') + \
     opt_button("6", "B", "Phosphor inside the medal", "The same gold-rimmed medal with a Phosphor Duotone icon inside.", False, f'<span class="badges">{badges_b}</span>')
sections.append(f'''
<section class="q" id="q6">
  <h2><span class="qn mono">6</span> The profile badges</h2>
  <p class="lede">The badge medallions are the best icon work on the platform today. Keep their art, or redraw it with Phosphor?</p>
  <div class="opts two">{q6}</div>
</section>''')

# Preview of later waves
status_rows = "".join(
    f'<li class="st {c}"><span class="splate">{p(n, w, 18)}</span><span class="sw mono">{sw}</span><span class="se">{en}</span></li>'
    for n, w, sw, en, c in STATUS)
admin_rows = "".join(
    f'<li class="{"on" if i == 4 else ""}">{p(n, "fill" if i == 4 else "regular", 18)}<span>{lab}</span></li>'
    for i, (n, lab) in enumerate(ADMIN))
sections.append(f'''
<section class="q" id="preview">
  <h2><span class="qn mono">→</span> Where the later waves take it</h2>
  <p class="lede">Not a choice. A preview of waves W3–W6 with the recommended answers, in 50pick's own colours.</p>
  <div class="previews">
    <div class="pv"><p class="cap mono">Ticket outcomes · glyph + colour + word</p><ul class="status">{status_rows}</ul>
      <p class="fine">Only a win is gold, because gold means money earned. A loss stays quiet.</p></div>
    <div class="pv"><p class="cap mono">A market card · category on a plate</p>
      <div class="card"><div class="cathead"><span class="catplate">{p("cloud-rain", "duotone", 16)}</span><span class="mono catlab">HALI YA HEWA</span><span class="mono left">masaa 21 yamebaki</span></div>
      <p class="cardq">Mvua Dar es Salaam yazidi 200mm Julai?</p><div class="sides"><span class="side yes">NDIO</span><span class="side no">HAPANA</span></div></div>
      <p class="fine">Today the category is a 13 px speck. It becomes a two-tone icon on a plate.</p></div>
    <div class="pv"><p class="cap mono">Wallet doors</p>
      <div class="doors"><span class="door gold">{p("arrow-line-down", "bold", 16)}Weka pesa</span><span class="door">{p("arrow-line-up", "bold", 16)}Toa pesa</span></div>
      <p class="fine">One deposit icon and one withdraw icon everywhere.</p></div>
    <div class="pv"><p class="cap mono">An empty state</p>
      <div class="empty"><span class="bigplate">{p("ticket", "duotone", 40)}</span><b>Huna tiketi bado</b><small>Chagua swali, weka dau, na tiketi yako itaonekana hapa.</small><span class="cta">Angalia maswali</span></div></div>
    <div class="pv"><p class="cap mono">The admin sidebar · icons added</p><ul class="side-nav">{admin_rows}</ul>
      <p class="fine">Today the sidebar's 25 items are text only.</p></div>
    <div class="pv"><p class="cap mono">Motion · W8, with motions 50pick already has</p><ul class="status motion">
      <li class="st"><span class="splate mv">{p("bell-ringing", "bold", 18)}</span><span class="se">A new notification arrives: the bell swings once. Never on page load.</span></li>
      <li class="st"><span class="splate mv">{p("squares-four", "fill", 18)}</span><span class="se">A tab is chosen: its outline turns solid.</span></li>
      <li class="st"><span class="splate mv">{p("arrow-line-down", "bold", 18)}</span><span class="se">A deposit is confirmed: its arrow nudges down once.</span></li>
      <li class="st won"><span class="splate">{p("seal-check", "fill", 18)}</span><span class="se">A win: the seal draws itself once. Nothing loops, no confetti.</span></li>
    </ul><p class="fine">Icons respond to what happened; they never perform on their own.</p></div>
  </div>
</section>''')

DEFAULTS = {"1": "B", "2": "B", "3": "B", "4": "B", "5.1": "A", "5.2": "A", "5.3": "A", "5.4": "A", "5.5": "A", "5.6": "A", "5.7": "A", "6": "A"}
defaults_js = "{" + ",".join(f'"{k}":"{v}"' for k, v in DEFAULTS.items()) + "}"

html = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "template.html"), encoding="utf-8").read()
html = html.replace("@@SPRITE@@", SPRITE).replace("@@SECTIONS@@", "".join(sections)).replace("@@DEFAULTS@@", defaults_js)
open(OUT, "w", encoding="utf-8").write(html)
print(f"wrote {OUT}: {len(html)//1024} KB, {len(symbols)} symbols, house keys {len(house_keys)}, phosphor names {len(ph_names)}")
