# 50pick Glyph System Reference — For Claude Design

## Design Specifications

All glyphs follow these exact specifications:

| Property | Value |
|----------|-------|
| **Grid** | 24x24 px (standard), 64x64 px (empty-state illustrations) |
| **Stroke width** | 1.9 px |
| **Stroke caps** | Round (`strokeLinecap="round"`) |
| **Stroke joins** | Round (`strokeLinejoin="round"`) |
| **Fill** | `none` (outline only), except filled accents use `fill="currentColor" stroke="none"` |
| **Color** | `currentColor` (inherits from parent text color) |
| **Format** | Pure SVG `<path>` and basic shapes (`<circle>`, `<rect>`, `<ellipse>`) |
| **Viewbox** | `0 0 24 24` (standard) or `0 0 64 64` (empty states) |

### Aesthetic

- **Line-icon family** — heraldic, clean, confident
- Rounded joins give a friendly, modern feel
- 1.9px stroke is slightly heavier than typical icon sets (vs lucide 2.0 or feather 1.5) — designed for dark backgrounds with light text
- Occasional filled accents for emphasis (e.g., `sparkle` stars, `crown` jewels, radio dots)
- No gradient fills — solid strokes only
- Designed to work on dark glass-panel backgrounds (OKLCH color system)

### Component Wrapper

```tsx
type GlyphProps = { s?: number; size?: number } & Omit<SVGProps<SVGSVGElement>, "ref">;

const G = ({ children, s, size, ...p }: GlyphProps & { children: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" width={s ?? size ?? 24} height={s ?? size ?? 24}
       fill="none" stroke="currentColor" strokeWidth="1.9"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>
    {children}
  </svg>
);

// Usage: <I.crypto s={14} /> or <I.crypto size={14} />
```

---

## Current Glyph Inventory (113 total)

### Categories (8)
| Name | Description |
|------|------------|
| `football` | Football/soccer ball — sports category |
| `politics` | Greek pillared building — politics |
| `forex` | Bidirectional currency arrows — FX trading |
| `weather` | Cloud with rain drops — weather |
| `economy` | Line chart trending up — macro/economy |
| `crypto` | Circle with dollar/bitcoin S — cryptocurrency |
| `entertainment` | Five-point star — culture/entertainment |
| `tech` | Chip/processor with pins — technology |

### Actions (8)
| Name | Description |
|------|------------|
| `trade` | Two vertical arrows (up/down) — buy/sell |
| `watch` | Bookmark ribbon — watchlist |
| `share` | Network node (3 dots + 2 lines) — share |
| `comment` | Speech bubble with text lines |
| `bell` | Notification bell |
| `search` | Magnifying glass |
| `filter` | Funnel filter |
| `plus` | Circle with + symbol |

### Navigation (8)
| Name | Description |
|------|------------|
| `home` | House with roof + interior |
| `markets` | Balance scales on vertical stem |
| `portfolio` | Briefcase with clasp |
| `trophy` | Cup with handles and base |
| `profile` | Person silhouette bust |
| `chevronDown` | Down-pointing V |
| `chevronUp` | Up-pointing V |
| `chevronRight` | Right-pointing V |
| `chevronLeft` | Left-pointing V |

### Status (7)
| Name | Description |
|------|------------|
| `live` | Concentric pulse rings — broadcasting |
| `tipping` | Tilted balance scales — market at tipping point |
| `hot` | Flame with flowing curves |
| `soon` | Hourglass with sand — time pressure |
| `resolved` | Star badge with checkmark |
| `void` | Circle with X — cancelled |
| `shieldcheck` | Shield with tick — verified |

### Trust / Decoratives (6)
| Name | Description |
|------|------------|
| `bolt` | Lightning strike — instant action |
| `wallet` | Card holder / purse |
| `crown` | Coronet with 3 jewel points (filled) |
| `shield` | Plain heraldic shield |
| `sparkle` | Two starburst sparkles (filled) |
| `star` | Five-point star outline |
| `flame2` | Alternate compact flame |

### Extended Set — Lucide Replacements (34)
| Name | Description |
|------|------------|
| `check` | Single checkmark stroke |
| `x` | X cross |
| `info` | Circle with i |
| `ext` | External link arrow |
| `phone` | Mobile device (tall rect) |
| `globe` | Earth with meridians |
| `chart` | Bar chart |
| `warning` | Triangle with ! |
| `alertCircle` | Circle with ! |
| `eye` | Eye open |
| `eyeOff` | Eye with slash |
| `edit` | Pencil editing |
| `camera` | Camera with lens |
| `trash` | Trash can with lid |
| `flag` | Flag on pole |
| `menu` | Three horizontal lines (hamburger) |
| `checkCircle` | Circle with check |
| `bellRing` | Bell with vibration lines |
| `bellOff` | Bell with slash |
| `trendingUp` | Line trending up with arrow |
| `trendingDown` | Line trending down with arrow |
| `clock` | Circle with clock hands (12 and 3) |
| `arrowDown` | Down arrow |
| `arrowUp` | Up arrow |
| `arrowRight` | Right arrow |
| `play` | Circle with filled play triangle |
| `download` | Down arrow to line |
| `upload` | Up arrow from line |
| `copy` | Two overlapping rectangles |
| `lock` | Padlock closed |
| `unlock` | Padlock open |
| `user` | Person silhouette |
| `users` | Two person silhouettes |
| `settings` | Gear/cog with spokes |
| `logOut` | Arrow leaving door |
| `logIn` | Arrow entering door |
| `gift` | Gift box with bow |
| `receipt` | Zigzag receipt with text |
| `coins` | Two overlapping coins with + |
| `activity` | ECG/heartbeat line |
| `ticket` | Ticket stub with perforations |
| `listChecks` | Checklist with ticks |
| `layoutGrid` | 2x2 grid squares |
| `radio` | Concentric circles with filled center |
| `pause` | Two vertical bars in rectangle |

### Player-Facing A1 (8)
| Name | Description |
|------|------------|
| `mail` | Envelope with fold |
| `calendar` | Calendar page with pins |
| `device` | Monitor + smartphone combo |
| `vibrate` | Phone with vibration lines |
| `smartphone` | Mobile handset |
| `shieldQuestion` | Shield with ? — recovery |
| `fileSignature` | Document being signed — SoF |
| `percent` | Percent symbol with circles |
| `link` | Chain link — referral |
| `messageWhatsapp` | Chat bubble with WhatsApp icon |

### Admin A2 (20)
| Name | Description |
|------|------------|
| `keyRound` | Round key with teeth — TOTP/API |
| `megaphone` | Broadcasting megaphone — promotions |
| `database` | Stacked discs — data store |
| `server` | Server rack with indicators |
| `landmark` | Bank/treasury building with pillars |
| `fileText` | Document with text lines |
| `fileCheck` | Document with checkmark |
| `fileSpreadsheet` | Document with grid — XLSX |
| `brain` | Brain hemispheres — AI generation |
| `bot` | Robot face — AI assistant |
| `shieldAlert` | Shield with ! — compliance alert |
| `shieldOff` | Shield with slash — suspended |
| `heartPulse` | Heart with ECG line — RG health |
| `rotateCcw` | Counter-clockwise arrow — undo/reset |
| `archive` | Archive box with shelf |
| `xCircle` | Circle with X — decline |
| `alertOctagon` | Octagon with ! — critical stop |
| `arrowUpFromLine` | Arrow up from baseline — withdraw |
| `arrowDownToLine` | Arrow down to baseline — deposit |
| `scrollText` | Scroll with text — legal/terms |

### Empty State Illustrations (3) — 64x64 grid
| Name | Description |
|------|------------|
| `emptyMarkets` | Scales with no markets |
| `emptyPositions` | Empty briefcase |
| `emptyLeaderboard` | Empty trophy with star |

---

## New Glyphs Needed

We're building a **Controlled Poll** feature that adds selection close dates, resolution scheduling, and precision configuration to AI-generated prediction markets. We need the following new glyphs in the same 24x24 / 1.9px / round-join style:

### Must-Have (8)

| Name | Description | Used For |
|------|-------------|----------|
| `calendarClock` | Calendar page (like existing `calendar`) with a small clock face at the bottom-right corner | Combined date+time picker fields: Selection Close Date, Resolution Date |
| `hourglassHalf` | Hourglass with sand flowing from top to bottom, roughly half-full | "Selection closing soon" countdown indicator, time-pressure warning |
| `hourglassOff` | Hourglass with a diagonal slash/strike through it (similar to how `eyeOff` slashes `eye`) | "Selection Closed — Waiting for Results" state on market cards |
| `target` | Concentric rings (3 rings) with a center dot — bullseye | Controlled Poll mode indicator, precision targeting, AI confidence display |
| `sliders` | Three horizontal bars at different positions with adjustment knobs/circles | Controlled Poll settings panel, advanced configuration, fine-tuning |
| `calendarRange` | Calendar page with two filled dots on different dates connected by a subtle line | Date range visualization: selection-close to resolution span |
| `gauge` | Semicircular arc/meter with a needle pointing right-of-center | Quality score, confidence meter, AI self-assessment display |
| `shuffle` | Two arrows crossing over each other (swap/mix pattern) | "Mixed" category option in bulk generation — all categories |

### Nice-to-Have (4)

| Name | Description | Used For |
|------|-------------|----------|
| `circleStop` | Circle with a square in the center (stop button) | Force-stop/halt action for sentinel or generation |
| `timerReset` | Circular arrow wrapping around a clock face (combines `rotateCcw` + `clock`) | Sentinel timer reset action |
| `listFilter` | List lines with a small funnel on the right side | Batch filter results, filtered poll state |
| `stepForward` | Triangle pointing right + vertical bar (skip-forward) | "Run Now" sentinel action (currently using `bolt`) |

---

## Style Examples for Reference

Here are 3 existing glyph SVG paths to use as style reference:

**Simple (clock):**
```svg
<circle cx="12" cy="12" r="9" />
<path d="M12 7v5l3 2" />
```

**Medium (calendar):**
```svg
<rect x="3" y="4.5" width="18" height="16.5" rx="2.5" />
<path d="M3 9.5h18" />
<path d="M8 2.5v4M16 2.5v4" />
```

**Complex with filled accent (crown):**
```svg
<path d="M4 18h16M5 18l-1.5-9 5 4 3.5-7 3.5 7 5-4L19 18z" />
<circle cx="3.5" cy="9" r="1" fill="currentColor" stroke="none" />
<circle cx="20.5" cy="9" r="1" fill="currentColor" stroke="none" />
<circle cx="12" cy="6" r="1" fill="currentColor" stroke="none" />
```

Please ensure all new glyphs:
- Use the same 24x24 viewBox
- Use 1.9px stroke width
- Use round linecaps and linejoins
- Use `currentColor` for stroke
- Use `fill="none"` by default (filled accents use `fill="currentColor" stroke="none"`)
- Feel coherent with the existing heraldic, clean aesthetic
- Work well at small sizes (12px–24px) on dark backgrounds
