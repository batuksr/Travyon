import React from 'react';

/* ══════════════════════════════════════════════
   Travyon Animated Logo
   - Orange gradient globe with rotating grid lines
   - Dashed orbit ring (tilted −20 °)
   - Airplane following the orbit with animateMotion
   - Subtle pulse glow behind the globe
   - "trav·yon" wordmark
═══════════════════════════════════════════════ */

interface TravyonLogoProps {
  /** Icon diameter in px (default 40) */
  size?: number;
  /** Show "travyon" text next to the icon */
  showText?: boolean;
  /** Dark background variant */
  dark?: boolean;
  className?: string;
}

const TravyonLogo: React.FC<TravyonLogoProps> = ({
  size = 40,
  showText = true,
  dark = false,
  className = '',
}) => {
  /* Unique IDs so multiple logo instances don't clash */
  const uid = React.useId().replace(/:/g, '');

  const textColor = dark ? '#f8fafc' : '#0f172a';

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>

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
          {/* Globe fill — warm orange radial gradient */}
          <radialGradient id={`gg-${uid}`} cx="36%" cy="30%" r="70%">
            <stop offset="0%"   stopColor="#FDE68A" />
            <stop offset="35%"  stopColor="#F8981D" />
            <stop offset="100%" stopColor="#B45309" />
          </radialGradient>

          {/* Glow filter */}
          <filter id={`gf-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Clip globe content */}
          <clipPath id={`gc-${uid}`}>
            <circle cx="50" cy="50" r="27" />
          </clipPath>
        </defs>

        {/* — Outer pulse ring — */}
        <circle cx="50" cy="50" r="27" fill="#F8981D" opacity="0.18">
          <animate attributeName="r"       values="27;33;27" dur="2.8s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.15;0.28;0.15" dur="2.8s" repeatCount="indefinite" />
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

          {/* Dashed orbit ring */}
          <ellipse cx="50" cy="50" rx="37" ry="13"
            stroke="#F8981D" strokeWidth="1.3" strokeDasharray="4 3"
            fill="none" opacity="0.55" />

          {/* Orbiting airplane ✈ via animateMotion */}
          <g>
            <animateMotion
              dur="5s"
              repeatCount="indefinite"
              rotate="auto"
              path="M 87,50 A 37,13 0 1,1 86.99,50 Z"
            />
            {/* Airplane shape — points right, rotate="auto" keeps it tangent */}
            <g transform="translate(-6,-5)">
              <path
                d="M 10,4 C 10,4 5,1 0,2 L -3,4 L 1,4 L -1,6 L 1,6 L 3,5 L 7,6 Z"
                fill="#0047ee"
                opacity="0.92"
                style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.35))' }}
              />
            </g>
          </g>

          {/* Small dot at start of orbit (runway marker effect) */}
          <circle cx="87" cy="50" r="1.5" fill="#F8981D" opacity="0.6" />
        </g>
      </svg>

      {/* ── Wordmark ── */}
      {showText && (
        <span
          className="leading-none tracking-tight"
          style={{
            fontSize: Math.round(size * 0.44) + 'px',
            fontWeight: 800,
            letterSpacing: '-0.03em',
          }}
        >
          <span style={{ color: textColor }}>trav</span>
          <span style={{ color: '#F8981D' }}>yon</span>
        </span>
      )}
    </div>
  );
};

export default TravyonLogo;
