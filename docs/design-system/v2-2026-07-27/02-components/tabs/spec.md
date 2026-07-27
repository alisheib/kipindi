# Tabs — spec (INVENTED 2026-06/07; flagged in the D2 spec)

Primary: 36px, r-sm, pad 0 16px, body 13.5/600. Rest: border --border, bg color-mix(--bg-elevated 60%, transparent), ink --text-muted. Active: border --brand-500, bg oklch(40% 0.12 262 / 0.35), glow 0 0 10px oklch(63% 0.18 262 / 0.15), ink --text (kit nav-active idiom; cyan stays reserved for links/bottom-nav, gold for money).
Secondary (duration): 28px, mono 11.5/600, pad 0 12px; rest transparent + --text-subtle; active border --border-strong + bg --bg-inset + --text — no brand ring, keeps hierarchy under the asset tabs.
Count variant (Positions): 32px, mono 12/600, trailing count 10px at 60% opacity.
Extensibility: tabs are flex-wrap buttons; new assets/durations append with zero reflow.
Transition: all 160ms cubic-bezier(0.4,0,0.2,1).
