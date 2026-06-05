"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ConfidenceDial } from "@/components/brand";

const HC_MARKETS = [
  { id: "afcon", x: 0.20, y: 0.34, size: 96, yes: 57, phase: 0.0, title: "TZ hosts AFCON 2027 group stage",   date: "Resolves 27 Mar" },
  { id: "rains", x: 0.42, y: 0.66, size: 72, yes: 64, phase: 1.4, title: "Long rains begin before 15 Apr",     date: "Resolves 15 Apr" },
  { id: "bot",   x: 0.34, y: 0.20, size: 56, yes: 71, phase: 2.6, title: "BoT holds rate at next MPC",         date: "Resolves 02 May" },
  { id: "usd",   x: 0.62, y: 0.24, size: 64, yes: 38, phase: 0.7, title: "USD/TZS closes < 2,650 in Q2",       date: "Resolves 30 Jun" },
  { id: "simba", x: 0.76, y: 0.56, size: 60, yes: 31, phase: 2.0, title: "Simba SC lifts NBC Premier",         date: "Resolves 18 Jul" },
  { id: "kili",  x: 0.86, y: 0.30, size: 48, yes: 64, phase: 3.4, title: "Kilimanjaro tops 50k climbs",        date: "Resolves EOY" },
  { id: "bgs",   x: 0.54, y: 0.80, size: 44, yes: 82, phase: 1.0, title: "Bongo Star Search · finale on time", date: "Resolves 04 Aug" },
] as const;

const HC_VERDICTS = [
  { mid: "afcon", side: "YES" as const, odds: 84, amount: 2_840_000, holders: 412, title: "TZ to host AFCON 2027 group stage" },
  { mid: "bot",   side: "YES" as const, odds: 71, amount: 1_120_000, holders: 198, title: "BoT held rate at MPC" },
  { mid: "simba", side: "NO"  as const, odds: 69, amount:   720_000, holders: 256, title: "Simba SC did not lift NBC Premier" },
  { mid: "rains", side: "YES" as const, odds: 64, amount: 1_980_000, holders: 374, title: "Long rains began before 15 Apr" },
  { mid: "usd",   side: "NO"  as const, odds: 62, amount:   904_000, holders: 211, title: "USD/TZS did not close < 2,650 in Q2" },
];

/** Returns true while the document is hidden (background tab, lock screen).
 *  When the page isn't visible we pause all the hero's looping animations so
 *  a backgrounded constellation doesn't drain battery on mid-tier phones. */
function useDocumentVisible(): boolean {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const update = () => setVisible(document.visibilityState !== "hidden");
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  return visible;
}

function DriftParticles({ count = 18, paused = false }: { count?: number; paused?: boolean }) {
  const particles = useMemo(() => Array.from({ length: count }).map((_, i) => {
    const seed = i * 137;
    const x = ((seed * 53) % 1000) / 1000;
    const y = ((seed * 31) % 1000) / 1000;
    const sz = 0.4 + ((seed * 17) % 100) / 100;
    const layer = i % 3;
    const dur = [78, 66, 56][layer] + ((seed * 11) % 14);
    const delay = -((seed * 7) % dur);
    const opacity = [0.18, 0.32, 0.48][layer];
    const drift = [12, 18, 24][layer];
    return { x, y, sz, dur, delay, opacity, drift };
  }), [count]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p, i) => (
        <span
          key={i}
          aria-hidden
          style={{
            position: "absolute",
            left: `${p.x * 100}%`,
            top:  `${p.y * 100}%`,
            width: p.sz,
            height: p.sz,
            borderRadius: "50%",
            // Gilt-budget rule (FINAL.md cross-cutting): the hero glow
            // and atmospheric drift are NOT gilt — gilt is reserved for
            // resolved + commit + verdict moments. Aqua-300 at the
            // particle's existing layer opacity reads as cool atmospheric
            // patina, lets the gold horizon and verdict tape stay the
            // soloists. Hue 195 = patina aqua (oklch 80% 0.10 195).
            background: "oklch(80% 0.10 195)",
            opacity: p.opacity,
            animation: `hc-drift ${p.dur}s linear infinite, hc-sway ${p.dur * 0.6}s ease-in-out infinite alternate`,
            animationDelay: `${p.delay}s, ${p.delay * 0.4}s`,
            // Pausing all child animations when the tab is backgrounded
            // keeps battery flat on mid-tier Android. Browsers already
            // throttle rAF when hidden, but CSS keyframes keep ticking;
            // this hard-pauses them.
            animationPlayState: paused ? "paused" : "running",
            ["--hc-sway" as string]: `${p.drift}px`,
            willChange: "transform",
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

function RollingNumber({ value, fontSize = 22, weight = 600 }: { value: number; fontSize?: number; weight?: number }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const fromRef = useRef<number>(0);

  useEffect(() => {
    fromRef.current = display;
    startRef.current = performance.now();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const duration = 1200;
    const tick = (t: number) => {
      const elapsed = t - startRef.current;
      const k = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - k, 3);
      setDisplay(Math.round(fromRef.current + (value - fromRef.current) * eased));
      if (k < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <span style={{ fontFamily: "var(--font-display, Sora)", fontSize, fontWeight: weight, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em" }}>
      {display.toLocaleString("en-US")}
    </span>
  );
}

export function HeroConstellation({ height = 540 }: { height?: number }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [verdictIdx, setVerdictIdx] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1100);
  const visible = useDocumentVisible();
  // Mobile gets fewer drift particles — Tecno F4-class devices spend a
  // disproportionate share of frame budget on 18 of them. Threshold is
  // narrow viewport (≤ 640px); desktop keeps the full count.
  const particleCount = width <= 640 ? 8 : 18;

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const w = Math.round(e.contentRect.width);
        if (w > 0) setWidth(w);
      }
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    // Pause the verdict-tape rotation when the tab is hidden so the
    // user doesn't return to a strangers-have-moved-on state and so we
    // don't spend wall-clock cycles re-rendering the tape off-screen.
    if (!visible) return;
    const id = setInterval(() => setVerdictIdx((i) => (i + 1) % HC_VERDICTS.length), 6000);
    return () => clearInterval(id);
  }, [visible]);

  const horizonY = height * 0.58;
  const currentVerdict = HC_VERDICTS[verdictIdx];

  return (
    <div
      ref={wrapRef}
      className="relative overflow-hidden rounded-xl"
      style={{
        height,
        background:
          "radial-gradient(ellipse 90% 70% at 42% 46%, oklch(24% 0.150 268) 0%, oklch(20% 0.135 268) 60%, oklch(15% 0.130 268) 100%)",
        border: "1px solid oklch(78% 0.13 80)",
        boxShadow:
          "0 1px 0 oklch(78% 0.13 80 / 0.35) inset, 0 24px 60px -30px oklch(8% 0.05 268 / 0.70)",
      }}
    >
      <DriftParticles count={particleCount} paused={!visible} />

      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        className="absolute inset-0 pointer-events-none"
        aria-hidden
      >
        <defs>
          <linearGradient id="hc-horizon" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%"   stopColor="oklch(78% 0.13 80)" stopOpacity="0" />
            <stop offset="22%"  stopColor="oklch(78% 0.13 80)" stopOpacity="0.55" />
            <stop offset="78%"  stopColor="oklch(78% 0.13 80)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="oklch(78% 0.13 80)" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="hc-glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%"   stopColor="oklch(78% 0.13 80)" stopOpacity="0.12" />
            <stop offset="100%" stopColor="oklch(78% 0.13 80)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx={width * 0.42} cy={height * 0.46} rx={width * 0.38} ry={height * 0.55} fill="url(#hc-glow)" />
        <line x1="0" y1={horizonY} x2={width} y2={horizonY} stroke="url(#hc-horizon)" strokeWidth="1" />
        <line x1={width / 2} y1={horizonY - 5} x2={width / 2} y2={horizonY + 5}
              stroke="oklch(78% 0.13 80)" strokeWidth="1" opacity="0.7" />

      </svg>

      {/* Hover scrim — darkens everything except the focused dial */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "oklch(11% 0.090 268 / 0.55)",
          opacity: hovered ? 1 : 0,
          transition: "opacity 320ms var(--ease-glide)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {HC_MARKETS.map((m) => {
        const cx = m.x * width;
        const cy = m.y * height;
        const isHover = hovered === m.id;
        const dimmed = !!hovered && !isHover;
        const verdictMatch = currentVerdict.mid === m.id;
        const tipOnLeft = m.x > 0.55;
        const tipDist = m.size / 2 + 18;

        // Truncate the editorial title to a single short line for the
        // always-on label. The "Resolves DD MMM" date stays full-length
        // since it's already terse. Width matches the dial diameter so
        // labels read as a tightly-coupled stack, not a floating caption.
        const shortTitle = m.title.length > 26 ? m.title.slice(0, 25) + "…" : m.title;
        const dateShort = m.date.replace(/^Resolves\s+/i, "");
        // Verdict tape lives at bottom: 48px from edge, 50px tall — its
        // top is at height − 98. Labels that would land in that band
        // flip to sit ABOVE the dial instead, so they never overlap.
        const LABEL_BLOCK_H = 32;
        const VERDICT_TAPE_TOP = height - 98;
        const labelBelow = cy + m.size / 2 + 6 + LABEL_BLOCK_H < VERDICT_TAPE_TOP;
        const labelTop = labelBelow
          ? cy + m.size / 2 + 6
          : cy - m.size / 2 - 6 - LABEL_BLOCK_H;

        return (
          <div key={m.id}>
            <div
              onMouseEnter={() => setHovered(m.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                position: "absolute",
                left: cx - m.size / 2,
                top:  cy - m.size / 2,
                width: m.size,
                height: m.size,
                cursor: "help",
                zIndex: isHover ? 5 : 2,
                opacity: dimmed ? 0.18 : 1,
                transform: isHover ? "scale(1.06)" : "scale(1)",
                transformOrigin: "center",
                filter: dimmed ? "blur(1px)" : "none",
                transition: "opacity 320ms var(--ease-glide), transform 480ms var(--ease-glide), filter 480ms var(--ease-glide)",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  animation: "mark-breathe 8s var(--ease-conduct) infinite",
                  animationDelay: `${m.phase}s`,
                  // Per FINAL.md: pause every looping animation on
                  // visibilitychange === 'hidden' to save battery on
                  // mid-tier Android. mark-breathe runs on all 7 dials.
                  animationPlayState: visible ? "running" : "paused",
                  transformOrigin: "center",
                  filter: isHover
                    ? "drop-shadow(0 12px 30px oklch(8% 0.06 268 / 0.85)) drop-shadow(0 0 28px oklch(78% 0.13 86 / 0.65))"
                    : verdictMatch
                      ? "drop-shadow(0 6px 20px oklch(8% 0.06 268 / 0.55)) drop-shadow(0 0 14px oklch(78% 0.13 86 / 0.45))"
                      : "drop-shadow(0 6px 20px oklch(8% 0.06 268 / 0.55))",
                  transition: "filter 480ms var(--ease-glide)",
                }}
              >
                <ConfidenceDial yesPct={m.yes} size={m.size} />
              </div>
            </div>

            {/* Always-on rest label — date stamp + truncated title under
                each dial. Visible whenever the constellation isn't being
                hovered; the editorial tooltip takes over on hover. This
                is the readability fix from the handoff: at rest, every
                dial reads as a market, not a decorative orb. */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                left: cx - (m.size + 16) / 2,
                top:  labelTop,
                width: m.size + 16,
                textAlign: "center",
                opacity: hovered ? 0 : 1,
                transition: "opacity 280ms var(--ease-glide)",
                pointerEvents: "none",
                zIndex: 2,
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-mono, JetBrains Mono)",
                  fontSize: 9,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "oklch(72% 0.045 268)",
                  opacity: 0.85,
                  marginBottom: 2,
                }}
              >
                {dateShort}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display, Sora)",
                  fontSize: 11,
                  fontWeight: 500,
                  color: "oklch(96% 0.012 268)",
                  lineHeight: 1.25,
                  letterSpacing: "-0.005em",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {shortTitle}
              </div>
            </div>

            <div
              style={{
                position: "absolute",
                top: cy,
                [tipOnLeft ? "right" : "left"]: tipOnLeft
                  ? `${width - cx + tipDist}px`
                  : `${cx + tipDist}px`,
                transform: "translateY(-50%)",
                opacity: isHover ? 1 : 0,
                transition: "opacity 280ms var(--ease-glide), transform 280ms var(--ease-glide)",
                pointerEvents: "none",
                zIndex: 3,
                textAlign: tipOnLeft ? "right" : "left",
                minWidth: 140,
                maxWidth: 220,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  [tipOnLeft ? "left" : "right"]: "100%",
                  width: 12,
                  height: 1,
                  background: "oklch(78% 0.13 80)",
                  opacity: 0.55,
                  [tipOnLeft ? "marginLeft" : "marginRight"]: 4,
                }}
              />
              <div
                style={{
                  fontFamily: "var(--font-mono, JetBrains Mono)",
                  fontSize: 9,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "oklch(78% 0.13 80)",
                  opacity: 0.85,
                  marginBottom: 4,
                }}
              >
                {m.date}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display, Sora)",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "oklch(99% 0.006 268)",
                  lineHeight: 1.35,
                  letterSpacing: "-0.005em",
                }}
              >
                {m.title}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono, JetBrains Mono)",
                  fontSize: 10,
                  color: "oklch(72% 0.045 268)",
                  marginTop: 4,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                <span style={{ color: "oklch(72% 0.13 152)" }}>YES {m.yes}¢</span>
                <span style={{ opacity: 0.4, margin: "0 6px" }}>·</span>
                <span style={{ color: "oklch(78% 0.16 22)" }}>NO {100 - m.yes}¢</span>
              </div>
            </div>
          </div>
        );
      })}

      <div
        className="absolute"
        style={{
          top: 22,
          left: 28,
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontFamily: "var(--font-mono, JetBrains Mono)",
          fontSize: 10,
          letterSpacing: "0.30em",
          textTransform: "uppercase",
          color: "oklch(78% 0.13 80)",
          opacity: 0.85,
          zIndex: 4,
        }}
      >
        <span
          aria-hidden
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "oklch(72% 0.10 200)",
            boxShadow: "0 0 10px oklch(72% 0.10 200)",
            animation: "aqua-pulse 3s infinite",
            animationPlayState: visible ? "running" : "paused",
          }}
        />
        The Tipping Field
      </div>

      {/* Predictors counter — repositioned to top-right (was bottom-left).
          Makes room for the verdict tape along the bottom. */}
      <div
        className="absolute"
        style={{
          top: 22,
          right: 28,
          textAlign: "right",
          zIndex: 4,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono, JetBrains Mono)",
            fontSize: 9,
            letterSpacing: "0.24em",
            textTransform: "uppercase",
            color: "oklch(78% 0.13 80)",
            opacity: 0.85,
            marginBottom: 2,
          }}
        >
          predictors live
        </div>
        <div style={{ color: "oklch(99% 0.006 268)" }}>
          <RollingNumber value={47312} fontSize={22} weight={600} />
        </div>
      </div>

      {/* Verdict tape — cycles every 6s. The heartbeat of the piece:
          a winning verdict resolves on stage, with the actual TZS payout
          and holder count. The matching dial in the constellation gains
          a gilt halo for the duration (handled in the dial map above).
          Tape gracefully hides secondary fields as width shrinks so the
          payout amount never clips on mobile. */}
      <div
        className="absolute"
        style={{
          left: 28,
          right: 28,
          bottom: 48,
          height: 50,
          zIndex: 4,
          display: "flex",
          alignItems: "center",
          borderTop: "1px solid color-mix(in oklab, oklch(78% 0.13 80) 28%, transparent)",
          borderBottom: "1px solid color-mix(in oklab, oklch(78% 0.13 80) 28%, transparent)",
        }}
      >
        {width >= 560 && (
          <div
            style={{
              fontFamily: "var(--font-mono, JetBrains Mono)",
              fontSize: 9,
              letterSpacing: "0.30em",
              textTransform: "uppercase",
              color: "oklch(78% 0.13 80)",
              opacity: 0.7,
              paddingRight: 14,
              marginRight: 14,
              borderRight: "1px solid color-mix(in oklab, oklch(78% 0.13 80) 28%, transparent)",
              whiteSpace: "nowrap",
            }}
          >
            Latest verdict
          </div>
        )}
        <div
          key={verdictIdx}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "baseline",
            gap: 12,
            animation: "hc-verdict-in 700ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-display, Sora)",
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: "0.12em",
              padding: "2px 8px",
              borderRadius: 4,
              background:
                currentVerdict.side === "YES"
                  ? "color-mix(in oklab, oklch(58% 0.16 152) 22%, transparent)"
                  : "color-mix(in oklab, oklch(60% 0.18 22) 22%, transparent)",
              color: currentVerdict.side === "YES" ? "oklch(72% 0.13 152)" : "oklch(78% 0.16 22)",
            }}
          >
            {currentVerdict.side}
          </span>
          {width >= 460 && (
            <span
              style={{
                fontFamily: "var(--font-display, Sora)",
                fontSize: 14,
                fontWeight: 500,
                color: "oklch(99% 0.006 268)",
                letterSpacing: "-0.005em",
                overflow: "hidden",
                textOverflow: "ellipsis",
                minWidth: 0,
                whiteSpace: "nowrap",
              }}
            >
              {currentVerdict.title}
            </span>
          )}
          {width >= 700 && (
            <span
              style={{
                fontFamily: "var(--font-mono, JetBrains Mono)",
                fontSize: 11,
                color: "oklch(72% 0.045 268)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              at {currentVerdict.odds}¢
            </span>
          )}
          <span style={{ flex: 1 }} />
          <span
            style={{
              fontFamily: "var(--font-display, Sora)",
              fontSize: width >= 460 ? 17 : 14,
              fontWeight: 600,
              color: "oklch(78% 0.13 80)",
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "-0.01em",
              display: "inline-flex",
              alignItems: "baseline",
              gap: 4,
              whiteSpace: "nowrap",
            }}
          >
            <span>+TZS</span>
            {width >= 460 ? (
              <RollingNumber value={currentVerdict.amount} fontSize={width >= 700 ? 17 : 14} weight={600} />
            ) : (
              <span>{(currentVerdict.amount / 1_000_000).toFixed(2)}M</span>
            )}
          </span>
          {width >= 700 && (
            <span
              style={{
                fontFamily: "var(--font-mono, JetBrains Mono)",
                fontSize: 10,
                color: "oklch(72% 0.045 268)",
                textTransform: "uppercase",
                letterSpacing: "0.22em",
              }}
            >
              paid · {currentVerdict.holders}
            </span>
          )}
        </div>
      </div>

      <div
        className="absolute"
        style={{
          bottom: 18,
          right: 28,
          display: "flex",
          alignItems: "center",
          gap: 10,
          zIndex: 4,
        }}
      >
        <div
          style={{
            width: 14,
            height: 14,
            borderRadius: "50%",
            border: "1px solid oklch(78% 0.13 80)",
            display: "grid",
            placeItems: "center",
            fontFamily: "var(--font-mono, JetBrains Mono)",
            fontSize: 7,
            fontWeight: 700,
            color: "oklch(78% 0.13 80)",
            letterSpacing: "-0.05em",
          }}
        >
          50
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono, JetBrains Mono)",
            fontSize: 9,
            letterSpacing: "0.24em",
            textTransform: "uppercase",
            color: "oklch(78% 0.13 80)",
            opacity: 0.85,
          }}
        >
          Plate I · MMXXVI
        </div>
      </div>

      <style>{`
        @keyframes hc-drift {
          0%   { transform: translate3d(0, 14vh, 0); }
          100% { transform: translate3d(0, -120%, 0); }
        }
        @keyframes hc-sway {
          0%   { margin-left: 0; }
          100% { margin-left: var(--hc-sway, 0px); }
        }
        @keyframes hc-verdict-in {
          0%   { opacity: 0; transform: translateX(18px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes hc-caption-rise {
          0%   { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
