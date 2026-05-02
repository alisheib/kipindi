/* Mapigo glyph & wordmark — original design.
   The glyph: short waveform fragment with one clear spike, contained in a circle. */

function MapigoGlyph({ size = 48, color = 'var(--gold)', glow = false, bg = 'var(--bg-elev-2)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-label="Mapigo">
      <defs>
        {glow && (
          <filter id={`mg-glow-${size}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.4" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        )}
      </defs>
      <circle cx="32" cy="32" r="30" fill={bg} stroke={color} strokeWidth="1.5" />
      {/* baseline waveform with one spike */}
      <path
        d="M8 36 L16 36 L20 35 L24 36 L28 32 L30 14 L32 50 L34 30 L36 36 L40 35 L48 36 L56 36"
        fill="none" stroke={color} strokeWidth="2.2"
        strokeLinejoin="round" strokeLinecap="round"
        filter={glow ? `url(#mg-glow-${size})` : undefined}
      />
      {/* tiny spike dot */}
      <circle cx="32" cy="14" r="1.6" fill={color} />
    </svg>
  );
}

function MapigoWordmark({ height = 32, color = 'var(--text-hi)', accent = 'var(--gold)' }) {
  // Sora Semibold, custom-spaced. Glyph in front.
  const glyphSize = height * 1.05;
  return (
    <div className="mg-wordmark" style={{ height }}>
      <MapigoGlyph size={glyphSize} color={accent} bg="transparent" />
      <span className="mg-wordmark-text" style={{
        fontFamily: 'Sora, system-ui, sans-serif',
        fontWeight: 600,
        fontSize: height * 0.78,
        color,
        letterSpacing: '-0.01em',
        marginLeft: height * 0.18,
        lineHeight: 1
      }}>
        mapigo
      </span>
    </div>
  );
}

function MapigoStacked({ size = 120 }) {
  return (
    <div className="mg-stacked" style={{ width: size }}>
      <MapigoGlyph size={size * 0.66} color="var(--gold)" bg="transparent" glow />
      <span style={{
        fontFamily: 'Sora, system-ui, sans-serif',
        fontWeight: 600,
        fontSize: size * 0.18,
        color: 'var(--text-hi)',
        letterSpacing: '0.04em',
        marginTop: size * 0.06,
        textTransform: 'lowercase'
      }}>mapigo</span>
    </div>
  );
}

window.MapigoGlyph = MapigoGlyph;
window.MapigoWordmark = MapigoWordmark;
window.MapigoStacked = MapigoStacked;
