import React from 'react';
import { Send } from 'lucide-react';

/* ══════════════════════════════════════════════
   Travyon Wordmark — Organic tema
   - "trav·yon" yazısı (font-heading, tema tokenlarına bağlı)
   - Yazı gizliyken (ör. daralmış sidebar) kompakt kağıt uçak işareti
═══════════════════════════════════════════════ */

interface TravyonLogoProps {
  /** Icon diameter in px (default 40) — yazı boyutunu belirler (fontPx = size * 0.5) */
  size?: number;
  /** Show "travyon" text */
  showText?: boolean;
  className?: string;
}

const TravyonLogo: React.FC<TravyonLogoProps> = ({
  size = 40,
  showText = true,
  className = '',
}) => {
  const fontPx = Math.round(size * 0.5);

  return (
    <div className={`inline-flex items-center gap-2.5 select-none leading-none ${className}`}>

      {/* ── Kompakt uçak işareti — sadece yazı gizliyken ── */}
      {!showText && (
        <Send
          size={Math.round(size * 0.55)}
          strokeWidth={2.5}
          color="#e8863a"
          fill="#e8863a"
          fillOpacity={0.18}
          className="shrink-0 relative left-[-1px]"
        />
      )}

      {/* ── Wordmark ── */}
      {showText && (
        <span
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: fontPx,
            lineHeight: 1,
            letterSpacing: '-0.01em',
            color: 'var(--color-text)',
          }}
        >
          trav
          <span style={{ color: '#e8863a' }}>yon</span>
        </span>
      )}
    </div>
  );
};

export default TravyonLogo;
