#!/usr/bin/env python3
# 50pick badge medallions — 48×48 grid, 2px stroke, round caps/joins.
# Gold is principled on every badge: all are earned status. currentColor so
# tiers can also render muted when locked. No baked-in text (brief §8).
# Tier names are DESIGN NAMES — map them to the canonical TierBadge enum.
RING  = '<circle cx="24" cy="24" r="20"/>'
RINGD = '<circle cx="24" cy="24" r="20"/><circle cx="24" cy="24" r="16.4" stroke-width="1.2" opacity=".55"/>'
HEX   = '<path d="M24 4l17.3 10v20L24 44 6.7 34V14z"/>'

BADGES = [
 # (name, inner, role)
 ("tier-1-bronze", RING + '<path d="M17 27l7-7 7 7" />', "Tier 1 — single chevron"),
 ("tier-2-silver", RING + '<path d="M17 30l7-7 7 7M17 23l7-7 7 7"/>', "Tier 2 — double chevron"),
 ("tier-3-gold",   RINGD + '<path d="M24 15l2.6 5.6 5.9.7-4.4 4 1.2 5.8-5.3-2.9-5.3 2.9 1.2-5.8-4.4-4 5.9-.7z"/>', "Tier 3 — star in double ring"),
 ("tier-4-platinum", HEX + '<path d="M24 15l2.6 5.6 5.9.7-4.4 4 1.2 5.8-5.3-2.9-5.3 2.9 1.2-5.8-4.4-4 5.9-.7z"/>', "Tier 4 — star in hex"),
 ("tier-5-sovereign", '<circle cx="24" cy="28" r="14.5"/><path d="M15 15.5l-1.8-8.5 5.8 4 5-7.5 5 7.5 5.8-4-1.8 8.5zM14 15.5h20"/><path d="M24 20l2.6 5.6 5.9.7-4.4 4 1.2 5.8-5.3-2.9-5.3 2.9 1.2-5.8-4.4-4 5.9-.7z"/>', "Tier 5 — crown over star medallion"),
 ("streak-3",  RING + '<path d="M20.8 27.5a2.4 2.4 0 0 0 2.4-2.4c0-1.3-.5-1.9-1-2.9-1-2-.2-3.8 1.9-5.6.5 2.3 1.9 4.6 3.7 6.1 1.9 1.5 2.8 3.3 2.8 5.1a6.6 6.6 0 1 1-13.2 0c0-1.1.4-2.2.9-2.8a2.4 2.4 0 0 0 2.5 2.5z" transform="translate(-1,-2)"/><circle cx="17" cy="35.5" r="1.4" fill="currentColor" stroke="none"/><circle cx="24" cy="35.5" r="1.4" fill="currentColor" stroke="none"/><circle cx="31" cy="35.5" r="1.4" fill="currentColor" stroke="none"/>', "3-win streak — flame + 3 pips"),
 ("streak-5",  RING + '<path d="M20.8 27.5a2.4 2.4 0 0 0 2.4-2.4c0-1.3-.5-1.9-1-2.9-1-2-.2-3.8 1.9-5.6.5 2.3 1.9 4.6 3.7 6.1 1.9 1.5 2.8 3.3 2.8 5.1a6.6 6.6 0 1 1-13.2 0c0-1.1.4-2.2.9-2.8a2.4 2.4 0 0 0 2.5 2.5z" transform="translate(-1,-2)"/><circle cx="13.5" cy="35.5" r="1.3" fill="currentColor" stroke="none"/><circle cx="18.7" cy="35.5" r="1.3" fill="currentColor" stroke="none"/><circle cx="24" cy="35.5" r="1.3" fill="currentColor" stroke="none"/><circle cx="29.3" cy="35.5" r="1.3" fill="currentColor" stroke="none"/><circle cx="34.5" cy="35.5" r="1.3" fill="currentColor" stroke="none"/>', "5-win streak — flame + 5 pips"),
 ("streak-10", RINGD + '<path d="M20.8 27a2.4 2.4 0 0 0 2.4-2.4c0-1.3-.5-1.9-1-2.9-1-2-.2-3.8 1.9-5.6.5 2.3 1.9 4.6 3.7 6.1 1.9 1.5 2.8 3.3 2.8 5.1a6.6 6.6 0 1 1-13.2 0c0-1.1.4-2.2.9-2.8a2.4 2.4 0 0 0 2.5 2.5z" transform="translate(-1,-3)"/><path d="M18 36.5l3-3 3 3 3-3 3 3" stroke-width="1.6"/>', "10-win streak — flame + laurel zigzag"),
 ("proposer",  RING + '<path d="M31 15c-6 1.5-10.5 5.5-12.5 11l-1.5 6 6-1.5C28.5 28.5 32.5 24 34 18z" transform="translate(-3,0)"/><path d="M17 32l4-4" transform="translate(-3,0)"/>', "Proposer — quill"),
 ("centurion", RINGD + '<path d="M30.5 18.5a8 8 0 1 0 0 11"/><path d="M17.5 33.5c2 1.5 4.2 2.2 6.5 2.2s4.5-.7 6.5-2.2" stroke-width="1.6"/>', "Centurion (100 settled) — C + laurel base"),
 ("founder",   RING + '<circle cx="24" cy="17.5" r="5"/><path d="M24 22.5V34M24 29.5h4.2M24 34h5.5"/>', "Founder — key medallion"),
 ("verified",  RING + '<path d="M24 13l7.5 2.8v5.4c0 4.9-3.2 9-7.5 11-4.3-2-7.5-6.1-7.5-11v-5.4z"/><path d="M20.5 24l2.4 2.4 4.6-5.2"/>', "KYC verified — shield check"),
]

HEAD = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="{c}" '
        'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">{i}</svg>')

def emit(dirpath, color="currentColor"):
    import os
    os.makedirs(dirpath, exist_ok=True)
    for n, inner, d in BADGES:
        open(f"{dirpath}/{n}.svg", "w").write(HEAD.format(c=color, i=inner))
    return len(BADGES)

if __name__ == "__main__":
    print("badges:", emit("/tmp/badges-preview", "#FEC766"))
