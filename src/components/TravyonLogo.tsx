import React from 'react';

/* ══════════════════════════════════════════════
   Travyon Animated Logo — Organic tema
   - Terracotta gradient globe with rotating grid lines
   - Dashed sage orbit ring
   - Airplane following the orbit with animateMotion
   - Subtle pulse glow behind the globe
   - "trav·yon" wordmark (font-heading, tema tokenlarına bağlı)
═══════════════════════════════════════════════ */

interface TravyonLogoProps {
  /** Icon diameter in px (default 40) */
  size?: number;
  /** Show "travyon" text next to the icon */
  showText?: boolean;
  /** Fotoğraf üzerinde her zaman beyaz metin göster (tema tokenlarını yok sayar) */
  dark?: boolean;
  className?: string;
}

const TravyonLogo: React.FC<TravyonLogoProps> = ({
  size = 40,
  showText = true,
  dark: forceLight,
  className = '',
}) => {
  /* Unique IDs so multiple logo instances don't clash */
  const uid = React.useId().replace(/:/g, '');
  const fontPx = Math.round(size * 0.5);

  return (
    <div className={`inline-flex items-center gap-2.5 select-none leading-none ${className}`}>

      {/* ── SVG Icon ── */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: 'visible', flexShrink: 0 }}
      >
        <defs>
          {/* Globe fill — terracotta radial gradient */}
          <radialGradient id={`gg-${uid}`} cx="36%" cy="30%" r="70%">
            <stop offset="0%"   stopColor="#ffd9b8" />
            <stop offset="38%"  stopColor="#c67139" />
            <stop offset="100%" stopColor="#7a3d16" />
          </radialGradient>

          {/* Clip globe content */}
          <clipPath id={`gc-${uid}`}>
            <circle cx="50" cy="50" r="27" />
          </clipPath>
        </defs>

        {/* — Outer pulse ring — */}
        <circle cx="50" cy="50" r="27" fill="#c67139" opacity="0.18">
          <animate attributeName="r"       values="27;33;27" dur="2.8s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.14;0.26;0.14" dur="2.8s" repeatCount="indefinite" />
        </circle>

        {/* — Globe shadow — */}
        <circle cx="52" cy="53" r="27" fill="rgba(0,0,0,0.12)" />

        {/* — Globe body — */}
        <circle cx="50" cy="50" r="27" fill={`url(#gg-${uid})`} />

        {/* — Grid lines (clipped, latitude arcs rotate slowly) — */}
        <g clipPath={`url(#gc-${uid})`} opacity="0.28">
          {/* Rotating latitude rings */}
          {[8, 17].map((ry, i) => (
            <ellipse key={i} cx="50" cy="50" rx="27" ry={ry}
              fill="none" stroke="white" strokeWidth={i === 0 ? 0.9 : 0.7}>
              <animateTransform attributeName="transform" type="rotate"
                from="0 50 50" to="360 50 50" dur="12s" repeatCount="indefinite" />
            </ellipse>
          ))}
          {/* Static meridian rings */}
          {[10, 22].map((rx, i) => (
            <ellipse key={i} cx="50" cy="50" rx={rx} ry="27"
              fill="none" stroke="white" strokeWidth={i === 0 ? 0.9 : 0.7} />
          ))}
        </g>

        {/* — Specular highlight — */}
        <ellipse cx="43" cy="41" rx="8" ry="4.5"
          fill="white" opacity="0.22"
          transform="rotate(-30 43 41)" />

        {/* — Globe border — */}
        <circle cx="50" cy="50" r="27"
          fill="none" stroke="rgba(255,255,255,0.38)" strokeWidth="1.2" />

        {/* — Orbit group (tilted −20°) — */}
        <g transform="rotate(-20 50 50)">

          {/* Dashed sage orbit ring */}
          <ellipse cx="50" cy="50" rx="37" ry="13"
            stroke="#7a8a5e" strokeWidth="1.3" strokeDasharray="4 3"
            fill="none" opacity="0.6" />

          {/* Orbiting airplane ✈ via animateMotion */}
          <g>
            <animateMotion
              dur="1.8s"
              repeatCount="indefinite"
              rotate="auto"
              path="M 87,50 A 37,13 0 1,1 86.99,50 Z"
            />
            {/* Airplane shape — points right, rotate="auto" keeps it tangent */}
            <g transform="translate(-6,-5)">
              <path
                d="M 10,4 C 10,4 5,1 0,2 L -3,4 L 1,4 L -1,6 L 1,6 L 3,5 L 7,6 Z"
                fill="#56633f"
                opacity="0.95"
              />
            </g>
          </g>

          {/* Small dot at start of orbit (runway marker effect) */}
          <circle cx="87" cy="50" r="1.5" fill="#7a8a5e" opacity="0.6" />
        </g>
      </svg>

      {/* ── Wordmark ── */}
      {showText && (
        <span
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: fontPx,
            lineHeight: 1,
            letterSpacing: '-0.01em',
            color: forceLight ? '#fff' : 'var(--color-text)',
          }}
        >
          trav
          <span style={{ color: forceLight ? '#ffc6a5' : 'var(--color-accent)' }}>yon</span>
        </span>
      )}
    </div>
  );
};

export default TravyonLogo;
