"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ConfidenceDial } from "@/components/brand";

const HC_MARKETS = [
  { id: "afcon", x: 0.20, y: 0.34, size: 96, yes: 57, phase: 0.0, title: "TZ hosts AFCON 2027 group stage",   date: "Resolves 27 Mar" },
  { id: "rains", x: 0.42, y: 0.66, size: 72, yes: 64, phase: 1.4, title: "Long rains begin before 15 Apr",     date: "Resolves 15 Apr" },
  { id: "bot",   x: 0.34, y: 0.20, size: 56, yes: 71, phase: 2.6, title: "BoT holds rate at next MPC",         date: "Resolves 02 May" },
  { id: "usd",   x: 0.60, y: 0.26, size: 64, yes: 38, phase: 0.7, title: "USD/TZS closes < 2,650 in Q2",       date: "Resolves 30 Jun" },
  { id: "simba", x: 0.74, y: 0.58, size: 60, yes: 31, phase: 2.0, title: "Simba SC lifts NBC Premier",         date: "Resolves 18 Jul" },
  { id: "kili",  x: 0.84, y: 0.30, size: 48, yes: 64, phase: 3.4, title: "Kilimanjaro tops 50k climbs",        date: "Resolves EOY" },
  { id: "bgs",   x: 0.52, y: 0.78, size: 44, yes: 82, phase: 1.0, title: "Bongo Star Search · finale on time", date: "Resolves 04 Aug" },
] as const;

function DriftParticles({ count = 18 }: { count?: number }) {
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
            background: "oklch(78% 0.13 86)",
            opacity: p.opacity,
            animation: `hc-drift ${p.dur}s linear infinite, hc-sway ${p.dur * 0.6}s ease-in-out infinite alternate`,
            animationDelay: `${p.delay}s, ${p.delay * 0.4}s`,
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

export function HeroConstellation({ height = 460 }: { height?: number }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1100);

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

  const horizonY = height * 0.58;

  return (
    <div
      ref={wrapRef}
      className="relative overflow-hidden rounded-2xl"
      style={{
        height,
        background:
          "radial-gradient(ellipse 90% 70% at 42% 46%, oklch(24% 0.150 268) 0%, oklch(20% 0.135 268) 60%, oklch(15% 0.130 268) 100%)",
        border: "1px solid oklch(78% 0.13 80)",
        boxShadow:
          "0 1px 0 oklch(78% 0.13 80 / 0.35) inset, 0 24px 60px -30px oklch(8% 0.05 268 / 0.70)",
      }}
    >
      <DriftParticles count={18} />

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

      {HC_MARKETS.map((m) => {
        const cx = m.x * width;
        const cy = m.y * height;
        const isHover = hovered === m.id;
        const tipOnLeft = m.x > 0.55;
        const tipDist = m.size / 2 + 18;

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
                zIndex: isHover ? 2 : 1,
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  animation: "mark-breathe 8s var(--ease-conduct) infinite",
                  animationDelay: `${m.phase}s`,
                  transformOrigin: "center",
                  filter: isHover
                    ? "drop-shadow(0 8px 24px oklch(8% 0.06 268 / 0.7)) drop-shadow(0 0 14px oklch(78% 0.13 86 / 0.35))"
                    : "drop-shadow(0 6px 20px oklch(8% 0.06 268 / 0.55))",
                  transition: "filter 320ms var(--ease-glide)",
                }}
              >
                <ConfidenceDial yesPct={m.yes} size={m.size} />
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
          }}
        />
        The Tipping Field
      </div>

      <div
        className="absolute"
        style={{
          bottom: 22,
          left: 28,
          display: "flex",
          alignItems: "baseline",
          gap: 10,
          zIndex: 4,
          color: "oklch(99% 0.006 268)",
        }}
      >
        <RollingNumber value={47312} fontSize={22} weight={600} />
        <div
          style={{
            fontFamily: "var(--font-mono, JetBrains Mono)",
            fontSize: 10,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "oklch(72% 0.045 268)",
          }}
        >
          predictors live
        </div>
      </div>

      <div
        className="absolute"
        style={{
          bottom: 22,
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
      `}</style>
    </div>
  );
}
