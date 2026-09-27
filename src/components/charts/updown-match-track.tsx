/**
 * THE MATCH TRACK — one round's timeline under the landing's Up & Down scoreboard (landing v3, R5 ·
 * spec updown-band-v2 §5). A member of the chart home (`test:chart-one-home`): computed SVG geometry
 * lives in `components/charts/`, never inside a landing section.
 *
 * What it draws, left to right on the FIXED open → deciding-close domain: the opening dot · the rail
 * (open and future time, neutral — never gilt, L8) · one stem per CONFIRMED read, up for UP and down for
 * DOWN, the newest solid with a bead · a tick across the rail for a read between the targets · the lock
 * post where betting closes, then the quiet dashed locked stretch · the flag post at the deciding price ·
 * and the playhead (`UpdownMatchNow`). Real points only, no line between them (§B12.3); nothing about a
 * price animates (L12, A-5).
 *
 * ⭐ THREE LAYERS, IN PAINT ORDER: neutral time (void band, rail, locked stretch, posts, opening dot) → the
 * playhead and played stretch (`UpdownMatchNow`) → the data marks (tie ticks, stems, bead). A read lands at
 * most a couple of minutes before "now", so the playhead often sits a few px from the newest stem: side ink
 * must always paint OVER neutral time, never under it (frame panel, 2026-09-27 — the playhead hid the stem).
 *
 * ⛔ NO TEXT IN THE SVG, AND NO viewBox. Coordinates are percentages and radii are px, so beads stay
 * round at every width; the lane's words are HTML. The whole track is ONE `role="img"` named by the
 * caller's sentence (K22) — the timeline in words, with EAT — and every child is aria-hidden.
 *
 * No directive: it renders on the server, and the band's live leaf renders it again when the 60-second
 * refresh brings in a new read (R5(a)). It imports nothing from a client module but its playhead leaf.
 */
import type { CSSProperties } from "react";
import { I } from "@/components/ui/glyphs";
import type { UpdownBandRound } from "@/lib/updown-match";
import { MATCH, matchGeometry } from "./updown-match-geometry";
import { UpdownMatchNow } from "./updown-match-now";

const pct = (v: number) => `${v}%`;
/** The class lists, spelled out per side — a mark's class is looked up, never built from the side token. */
const STEM_CLASS = { up: "kp-udtrack__stem kp-udtrack__stem--up", down: "kp-udtrack__stem kp-udtrack__stem--down" } as const;
const LATEST_CLASS = {
  up: "kp-udtrack__stem kp-udtrack__stem--up kp-udtrack__stem--latest",
  down: "kp-udtrack__stem kp-udtrack__stem--down kp-udtrack__stem--latest",
} as const;
const BEAD_CLASS = { up: "kp-udtrack__bead kp-udtrack__bead--up", down: "kp-udtrack__bead kp-udtrack__bead--down" } as const;

export function UpdownMatchTrack({ round, label, openLabel, anchorMs }: {
  round: UpdownBandRound;
  /** The timeline in words (`udMatchAria`) — the track's only accessible name. */
  label: string;
  /** The rail's label, "Ufunguzi / Open / 开盘" — no price. */
  openLabel: string;
  /** The band's one replay-safe server instant, for the playhead. */
  anchorMs: number;
}) {
  const g = matchGeometry(round);
  // The newest data mark — the latest stem, or a later tie tick — so the playhead can keep off it.
  const latestStem = g.stems.find((s) => s.latest) ?? null;
  const lastTie = g.ties.length ? g.ties[g.ties.length - 1] : null;
  const mark = lastTie && (!latestStem || lastTie.x > latestStem.x)
    ? { x: lastTie.x, kind: "tie" as const }
    : latestStem ? { x: latestStem.x, kind: latestStem.side } : null;
  const gate = pct(g.gatePct);
  const at = (x: number) => ({ "--x": pct(x) }) as CSSProperties;
  return (
    <div className="kp-udtrack" role="img" aria-label={label}>
      <div className="kp-udtrack__gutter" aria-hidden><I.arrowUp s={12} /><I.arrowDown s={12} /></div>
      <div className="kp-udtrack__lane" aria-hidden>
        <span className="kp-udtrack__open">{openLabel}</span>
        <span className="kp-udtrack__mark" style={at(g.gatePct)}><I.lock s={14} /></span>
        <span className="kp-udtrack__mark kp-udtrack__mark--end" style={at(100)}><I.flag s={14} /></span>
      </div>
      <div className="kp-udtrack__plot" aria-hidden>
        <svg className="kp-udtrack__svg" width="100%" height="100%" focusable="false">
          {g.void && <rect className="kp-udtrack__void" x="0" width="100%" y={pct(g.void.y)} height={pct(g.void.h)} />}
          <line className="kp-udtrack__rail" x1="0" y1="50%" x2={gate} y2="50%" />
          <line className="kp-udtrack__locked" x1={gate} y1="50%" x2="100%" y2="50%" />
          <line className="kp-udtrack__post" x1={gate} y1="0" x2={gate} y2="100%" />
          <line className="kp-udtrack__post" x1="100%" y1="0" x2="100%" y2="100%" />
          {g.kick && <circle className="kp-udtrack__kick" cx="0" cy="50%" r={MATCH.kick} />}
        </svg>
        <UpdownMatchNow opensAtMs={round.opensAtMs} closesAtMs={round.closesAtMs} anchorMs={anchorMs}
          markX={mark?.x ?? null} markKind={mark?.kind ?? null} />
        <svg className="kp-udtrack__svg" width="100%" height="100%" focusable="false">
          {g.ties.map((tie) => (
            <line key={`t${tie.x}`} className="kp-udtrack__tie"
              x1={pct(tie.x)} x2={pct(tie.x)} y1={pct(50 - MATCH.tieHalf)} y2={pct(50 + MATCH.tieHalf)} />
          ))}
          {g.stems.filter((s) => !s.latest).map((s) => (
            <line key={`s${s.x}`} className={STEM_CLASS[s.side]}
              x1={pct(s.x)} x2={pct(s.x)} y1="50%" y2={pct(s.tip)} />
          ))}
          {g.stems.filter((s) => s.latest).map((s) => (
            <line key={`l${s.x}`} className={LATEST_CLASS[s.side]}
              x1={pct(s.x)} x2={pct(s.x)} y1="50%" y2={pct(s.tip)} />
          ))}
          {g.bead && <circle className={BEAD_CLASS[g.bead.side]} cx={pct(g.bead.x)} cy={pct(g.bead.y)} r={MATCH.bead} />}
        </svg>
      </div>
    </div>
  );
}
