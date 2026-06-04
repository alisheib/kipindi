# 50pick — Full Design Handoff

Two synced packages, one palette (`kit50.css` is identical in both).

## `player/` — the player-facing system
Open **`player/50pick Design System — handoff.html`** (offline, pan/zoom). 35 artboards:
landing hero · flagship market detail (order book + trade tape) · the conviction dial ·
foundations · brand (authentic FiftyMark) · navigation · atoms · loaders · charts · forms ·
text & clauses · components · card hover · win/loss · notifications · states · responsible-play
warnings · achievements & score (hex crests) · leaderboard · wallet · positions · mobile (393px) ·
auth · comments & trade actions.

## `admin/` — the operator console
Open **`admin/50pick Admin Console — handoff.html`**. Sidebar shell, KPI cards, volume chart,
two-officer resolver queue, markets table.

## Shared contract
- **Colors locked to production `globals.css`** — royal-indigo 268 canvas, YES emerald 152,
  NO rose 22, gold 78–80; chrome action = royal blue, aqua links, red live, green = YES only.
- Mono numbers · bilingual EN/SW · no emoji · **glow is earned, not ambient** · `--motion-level` throttle.
- Each package has its own `source/` (editable JSX + CSS), `README.md`, and a `DEVELOPER_REFERENCE.md` / `THEME_AND_COMPONENTS.md` where present.
- JSX is Babel-in-browser for preview only — precompile / port for production.

For management review: open the two HTML files in any browser; no install required.
