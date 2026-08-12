import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        teal: {
          50:  "var(--teal-50)", 100: "var(--teal-100)", 200: "var(--teal-200)", 300: "var(--teal-300)", 400: "var(--teal-400)",
          500: "var(--teal-500)", 600: "var(--teal-600)", 700: "var(--teal-700)", 800: "var(--teal-800)", 900: "var(--teal-900)", 950: "var(--teal-950)",
        },
        yes: {
          50:  "var(--yes-50)", 100: "var(--yes-100)", 200: "var(--yes-200)", 300: "var(--yes-300)", 400: "var(--yes-400)",
          500: "var(--yes-500)", 600: "var(--yes-600)", 700: "var(--yes-700)", 800: "var(--yes-800)", 900: "var(--yes-900)", 950: "var(--yes-950)",
        },
        no: {
          50:  "var(--no-50)", 100: "var(--no-100)", 200: "var(--no-200)", 300: "var(--no-300)", 400: "var(--no-400)",
          500: "var(--no-500)", 600: "var(--no-600)", 700: "var(--no-700)", 800: "var(--no-800)", 900: "var(--no-900)", 950: "var(--no-950)",
        },
        // Heraldic chord additions — claret (editorial weight) + aqua (finishing pass).
        // See `globals.css` for the design rules. Never use claret on YES/NO money
        // surfaces. Aqua is non-semantic and is capped at ~8% surface coverage.
        claret: {
          DEFAULT:    "var(--claret)",
          soft:       "var(--claret-soft)",
          edge:       "var(--claret-edge)",
          50:  "var(--claret-50)", 100: "var(--claret-100)", 200: "var(--claret-200)", 300: "var(--claret-300)", 400: "var(--claret-400)",
          500: "var(--claret-500)", 600: "var(--claret-600)", 700: "var(--claret-700)", 800: "var(--claret-800)", 900: "var(--claret-900)", 950: "var(--claret-950)",
        },
        aqua: {
          DEFAULT:    "var(--aqua)",
          glow:       "var(--aqua-glow)",
          edge:       "var(--aqua-edge)",
          50:  "var(--aqua-50)", 100: "var(--aqua-100)", 200: "var(--aqua-200)", 300: "var(--aqua-300)", 400: "var(--aqua-400)",
          500: "var(--aqua-500)", 600: "var(--aqua-600)", 700: "var(--aqua-700)", 800: "var(--aqua-800)", 900: "var(--aqua-900)", 950: "var(--aqua-950)",
        },
        accent: {
          soft: "var(--accent-soft)",
          300: "var(--accent-300)", 400: "var(--accent-400)", 500: "var(--accent-500)", 600: "var(--accent-600)",
        },
        brand: {
          soft: "var(--brand-soft)",
          200: "var(--brand-200)", 300: "var(--brand-300)", 400: "var(--brand-400)", 500: "var(--brand-500)", 600: "var(--brand-600)",
        },
        slate: {
          50: "var(--slate-50)", 100: "var(--slate-100)", 200: "var(--slate-200)", 300: "var(--slate-300)", 400: "var(--slate-400)",
          500: "var(--slate-500)", 600: "var(--slate-600)", 700: "var(--slate-700)", 800: "var(--slate-800)", 850: "var(--slate-850)", 900: "var(--slate-900)", 950: "var(--slate-950)",
        },
        bg: {
          DEFAULT: "var(--bg)",
          base: "var(--bg-base)",
          subtle: "var(--bg-subtle)",
          inset: "var(--bg-inset)",
          sunken: "var(--bg-sunken)",
          elevated: "var(--bg-elevated)",
          overlay: "var(--bg-overlay)",
        },
        surface: {
          DEFAULT: "var(--surface)",
          hover: "var(--surface-hover)",
          pressed: "var(--surface-pressed)",
          selected: "var(--surface-selected)",
          disabled: "var(--surface-disabled)",
        },
        border: {
          DEFAULT: "var(--border)",
          subtle: "var(--border-subtle)",
          strong: "var(--border-strong)",
          focus: "var(--border-focus)",
          divider: "var(--border-divider)",
          // WCAG 1.4.11 (audit H10): --border is DECORATIVE-only at 36% L. A border that is a
          // control's ONLY boundary must reach 3:1, which is what --border-control is for
          // (globals.css:316, 3.45:1 on --bg). The token existed with no bridge, so
          // `border-border-control` compiled to NOTHING at two call sites on the discovery bar
          // — the same silent-dead-class defect that once left 1,325 classes emitting no CSS.
          control: "var(--border-control)",
        },
        text: {
          DEFAULT: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)",
          disabled: "var(--text-disabled)",
          inverse: "var(--text-inverse)",
          link: "var(--text-link)",
          linkHover: "var(--text-link-hover)",
          onBrand: "var(--text-on-brand)",
          // DESIGN_AUTHORITY B8 — the ink ramp's three quiet steps. These were defined
          // in globals.css from the start but NEVER bridged here, so `text-text-subtle`
          // (732 uses), `text-text-muted` (433) and `text-text-faint` (59) compiled to
          // NOTHING: a four-step hierarchy rendered as two, and every element meant to
          // recede inherited its parent's ink instead. Guarded by `npm run test:bridge`.
          muted: "var(--text-muted)",
          subtle: "var(--text-subtle)",
          faint: "var(--text-faint)",
        },
        royal: {
          DEFAULT: "var(--royal)",
          hover: "var(--royal-hover)",
          active: "var(--royal-active)",
          subtle: "var(--royal-subtle)",
          subtleHover: "var(--royal-subtle-hover)",
          fg: "var(--royal-fg)",
          // The numeric ramp exists in globals.css (50–950) but was never exposed here,
          // unlike `gold` below. `text-royal-300` (56 uses) + `text-royal-200` (13) were dead.
          50:  "var(--royal-50)", 100: "var(--royal-100)", 200: "var(--royal-200)", 300: "var(--royal-300)", 400: "var(--royal-400)",
          500: "var(--royal-500)", 600: "var(--royal-600)", 700: "var(--royal-700)", 800: "var(--royal-800)", 900: "var(--royal-900)", 950: "var(--royal-950)",
        },
        // The gilt — the brand needle's own colour (Brand Kit v2). It had NO entry here
        // at all, so `text-gilt` / `border-gilt` were dead. The CSS classes `.gilt` /
        // `.gilt-strong` (globals.css) are the older way in; both are valid.
        gilt: { DEFAULT: "var(--gilt)", strong: "var(--gilt-strong)" },
        gold: {
          DEFAULT: "var(--gold)",
          hover: "var(--gold-hover)",
          active: "var(--gold-active)",
          subtle: "var(--gold-subtle)",
          subtleHover: "var(--gold-subtle-hover)",
          fg: "var(--gold-fg)",
          50:  "var(--gold-50)", 100: "var(--gold-100)", 200: "var(--gold-200)", 300: "var(--gold-300)", 400: "var(--gold-400)",
          500: "var(--gold-500)", 600: "var(--gold-600)", 700: "var(--gold-700)", 800: "var(--gold-800)", 900: "var(--gold-900)", 950: "var(--gold-950)",
        },
        // The `500` steps are the base hue each semantic token is mixed from
        // (globals.css:159-161). They exist as vars but were unreachable, so
        // `bg-danger-500` / `border-danger-500` / `bg-info-500` compiled to nothing.
        // There is deliberately no 300/700 step — the ramp has exactly one rung.
        success: { DEFAULT: "var(--success)", bg: "var(--success-bg)", border: "var(--success-border)", fg: "var(--success-fg)" },
        warning: { DEFAULT: "var(--warning)", bg: "var(--warning-bg)", border: "var(--warning-border)", fg: "var(--warning-fg)", 500: "var(--warning-500)" },
        danger:  { DEFAULT: "var(--danger)",  bg: "var(--danger-bg)",  border: "var(--danger-border)",  fg: "var(--danger-fg)",  500: "var(--danger-500)" },
        info:    { DEFAULT: "var(--info)",    bg: "var(--info-bg)",    border: "var(--info-border)",    fg: "var(--info-fg)",    500: "var(--info-500)" },
        bet: {
          win: "var(--bet-win)",
          lose: "var(--bet-lose)",
          draw: "var(--bet-draw)",
          pool: "var(--bet-pool)",
          stake: "var(--bet-stake)",
          jackpot: "var(--bet-jackpot)",
          streak: "var(--bet-streak)",
          hot: "var(--bet-hot)",
          cold: "var(--bet-cold)",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Sora", "Inter", "system-ui", "Helvetica Neue", "Arial", "sans-serif"],
        sans:    ["var(--font-sans)", "Inter", "system-ui", "Helvetica Neue", "Arial", "Noto Sans", "sans-serif"],
        mono:    ["var(--font-mono)", "JetBrains Mono", "SF Mono", "Menlo", "Consolas", "monospace"],
      },
      fontSize: {
        micro:      ["10px", { lineHeight: "14px", letterSpacing: "0.4px" }],
        caption:    ["11px", { lineHeight: "15px", letterSpacing: "0.2px" }],
        label:      ["12px", { lineHeight: "16px", letterSpacing: "0.05px" }],
        "body-sm":  ["13px", { lineHeight: "18px", letterSpacing: "-0.05px" }],
        body:       ["14px", { lineHeight: "20px", letterSpacing: "-0.08px" }],
        "body-lg":  ["16px", { lineHeight: "24px", letterSpacing: "-0.16px" }],
        "title-sm": ["18px", { lineHeight: "24px", letterSpacing: "-0.36px" }],
        "title-md": ["22px", { lineHeight: "28px", letterSpacing: "-0.55px" }],
        "title-lg": ["28px", { lineHeight: "34px", letterSpacing: "-0.85px" }],
        "display-3":["36px", { lineHeight: "40px", letterSpacing: "-1.2px" }],
        "display-2":["48px", { lineHeight: "52px", letterSpacing: "-1.7px" }],
        "display-1":["64px", { lineHeight: "68px", letterSpacing: "-2.4px" }],
      },
      spacing: {
        "0.5": "2px",
        "1": "4px",
        "1.5": "8px",
        "2": "12px",
        "3": "16px",
        "4": "20px",
        "5": "24px",
        "6": "32px",
        "7": "40px",
        "8": "48px",
        "9": "64px",
        "10": "80px",
        "11": "96px",
        "12": "128px",
      },
      /* ⚠️ TWO SCALES LIVE HERE, and they disagree — read before editing.
         `globals.css` defines --r-xs..--r-xl as 4/8/12/16/24px. The NUMERIC keys
         below are 2/4/8/12/16/24 — so `rounded-md` renders 8px while `--r-md` is
         12px: the same name, two values, platform-wide. Bridging the numeric keys
         to the vars would shift EVERY rounded-* corner in the product up one step,
         which is a real visual change; Ali deliberately deferred it on 2026-07-29
         (see docs/DESIGN-FINALIZATION-PROGRESS.md, "the open gap").

         So the numeric scale is FROZEN AS LEGACY — do not renumber it — and the
         SEMANTIC keys below are the canonical path for new design (B9/B10). They
         are the only radii that carry meaning, they read at the call site
         (`rounded-modal` says what it is; `rounded-xl` says how round it is), and
         each resolves through the ONE definition site in globals.css. New work
         names the semantic key; a token edit then moves every consumer at once. */
      borderRadius: {
        xs: "2px",
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "24px",
        pill: "999px",
        // Semantic radii — the canonical scale (DESIGN_AUTHORITY B10).
        card:    "var(--r-lg)",    // 16px — market cards, panels, elevated surfaces
        control: "var(--r-md)",    // 12px — buttons, inputs, selects
        chip:    "var(--r-pill)",  // chips, badges, pills
        modal:   "var(--r-lg)",    // 16px — dialogs, sheets, menus, popovers
      },
      boxShadow: {
        e0: "none",
        e1: "var(--shadow-1)",
        e2: "var(--shadow-2)",
        e3: "var(--shadow-3)",
        e4: "var(--shadow-4)",
        e5: "var(--shadow-5)",
        // The named rungs. `card`/`royal` existed in globals.css from the start
        // but were never bridged — so `shadow-card` was a B8 dead class and every
        // consumer had to write `shadow-[var(--shadow-card)]` to get it at all.
        // `modal`/`overlay`/`card-top` are the 2026-07-29 floating-surface rungs
        // that replaced seven hand-typed drop-shadows.
        card:      "var(--shadow-card)",
        royal:     "var(--shadow-royal)",
        modal:     "var(--shadow-modal)",
        overlay:   "var(--shadow-overlay)",
        "overlay-up": "var(--shadow-overlay-up)",
        "card-top": "var(--shadow-card-top)",
        "glow-gold": "var(--glow-gold)",
        "glow-blue": "var(--glow-blue)",
        "glow-win": "var(--glow-win)",
        "glow-jackpot": "var(--glow-jackpot)",
        "glow-selected": "var(--glow-selected)",
      },
      backgroundImage: {
        "g-brand": "var(--g-brand)",
        "g-gold": "var(--g-gold)",
        "g-jackpot": "var(--g-jackpot)",
        "g-aurora": "var(--g-aurora)",
        "g-pool": "var(--g-pool)",
      },
      transitionTimingFunction: {
        standard: "cubic-bezier(0.2, 0, 0, 1)",
        decelerate: "cubic-bezier(0, 0, 0.2, 1)",
        accelerate: "cubic-bezier(0.4, 0, 1, 1)",
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      transitionDuration: {
        micro: "80ms",
        short: "160ms",
        medium: "240ms",
        long: "420ms",
        celebration: "1200ms",
      },
      zIndex: {
        base: "0",
        raised: "10",
        dropdown: "1000",
        sticky: "1100",
        drawer: "1200",
        modal: "1300",
        popover: "1400",
        toast: "1500",
        tooltip: "1600",
        celebration: "1700",
      },
      screens: {
        xs: "360px",
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1536px",
      },
      /* The measure system — DESIGN_AUTHORITY B7. Names only: every value is a
         `var(--w-*)` defined ONCE, in globals.css. Adding a number here instead of
         a var would create the second definition site that made the width tiers
         drift into eight variants in the first place.

         PAGES must not use these directly — they use <PageContainer tier="…">, so
         `tsc` rejects an invented tier and the runtime audit can find the content
         column via its data-measure attribute. These classes exist for the handful
         of CHROME consumers that are not pages: the top app bar, the public footer,
         the notice bar, and the admin shell. */
      maxWidth: {
        console: "var(--w-console)",
        board:   "var(--w-board)",
        reading: "var(--w-reading)",
        form:    "var(--w-form)",
        receipt: "var(--w-receipt)",
        auth:    "var(--w-auth)",
        field:   "var(--w-field)",
      },
    },
  },
  plugins: [],
};

export default config;
