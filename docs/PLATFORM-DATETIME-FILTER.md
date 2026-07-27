# Platform DateTime range filter + stake bounds

> Living doc. Two platform-wide systems finalized 2026-07-26/27. Code wins if this drifts.

## 1 · DateTime range filter (date + hour + minute, EAT-safe)

ONE reusable filter replaced the three ad-hoc date patterns that existed before
(`PeriodPicker` `?range=`, `datePresetToRange` `?date=`, the transactions page's own
`RANGES`). Every filterable surface now reads the SAME window.

- **Server:** `resolveRange(sp, now?, defaultPreset?)` → `{ start, end, label, preset, from?, to? }`
  (epoch ms) in `src/lib/server/date-range.ts`. Presets: `1h · 6h · 24h · today ·
  yesterday · 7d · 28d · 30d · mtd · qtd · all` + `custom` (`?from`/`?to` are EAT
  wall-clock `YYYY-MM-DDTHH:MM`, MINUTE precision). Guards inversion, future ends, and
  over-long windows (`MAX_RANGE_MS = 400d`); `all` = epoch → now. Reuses the EAT helpers
  in `report-money.ts` (`startOfEatDay/Month`, `EAT_OFFSET_MS`) — ONE source for the zone.
- **Client:** `src/components/ui/datetime-range-filter.tsx` — URL-driven
  (`?range` or `?range=custom&from&to`), localized (EN/SW/ZH `t.common.range*`), composes
  the kit `DateSelect` + `TimeSelect`. Props: `presetIds` (chip set) + `defaultPreset`;
  always offers Custom. Do NOT import the server `date-range.ts` into it (server deps).
- **`report-money`/`analytics`:** `Window = ReportPeriod | {start,end}` + `boundsOf`;
  the report/series functions accept either, so custom windows flow through unchanged.
- **Consumers:** `/admin/reports`, `/admin/finance`, `/admin/updown` (economics),
  `/admin/transactions` (+ CSV export, `fromMs`+`toMs`), `/admin/ai-usage`,
  `/admin/ai-polls`, `/admin/candidates`. GET-form pages render the filter ABOVE the
  form + hidden `range/from/to` inputs so an Apply preserves the window.
- **NOT migrated (deliberate):** `/profile/activity` keeps week/month/all (player = presets;
  a precise custom window needs a between-window txn DAL method). `/markets` has no date filter.
- **Guard:** `npm run test:date-range` (23 assertions — EAT boundaries, minute precision,
  inversion/future/unbounded). Time is money-critical; never weaken this.

## 2 · Stake bounds — 1,000 / 1,000,000, admin-managed, auto-migrated

- **Default** = code (`DEFAULT_GLOBAL_CONFIG` in `market-config.ts`, `DEFAULT_UPDOWN_CONFIG`
  in `updown-config.ts`) = **1,000 min / 1,000,000 max**. This is what a fresh/unset config
  uses. `buyPosition` enforces it via `getEffectiveConfig(marketId)` — the money boundary.
- **Admin-managed:** `/admin/config` (global + per-market override) and `/admin/updown`
  (defaults + per-chain). Layered: default → global → per-entity override.
- **Auto-migration:** `persist()` writes the whole snapshot, so a config saved under the
  OLD defaults (100/100,000) froze in the DB and shadowed the new code default. A
  version-gated forward migration (`CONFIG_VERSION`/`UPDOWN_CONFIG_VERSION` = 2) bumps a
  pre-v2 config's legacy defaults to 1,000/1,000,000 on first read after deploy and
  re-persists — a DELIBERATE custom value is never touched; a v2+ config is left alone.
  `reconcileConfigDefaults` is pure + unit-tested (config-persist).
- **UI reflects the live bounds:** the conviction-dial tachymeter detents derive from the
  live `[baseStake, maxStake]` (k/M labels), the slider snap floors at the configured min,
  and the Up & Down card presets/custom read the chain bounds. No hardcoded stake figures
  in user-facing copy.
- **Guard:** `npm run test:config` (incl. migration cases).
