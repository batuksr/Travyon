import React from 'react';
import { useTranslation } from 'react-i18next';
import { Map as MapIconLucide, List as ListIcon } from 'lucide-react';

const VIBE_KEYS = ['rest', 'indoor', 'budget', 'explore'] as const;
type VibeKey = typeof VIBE_KEYS[number];
const VIBE_EMOJIS: Record<VibeKey, string> = { rest: '😴', indoor: '🌧️', budget: '💰', explore: '🎉' };

interface VibeBarProps {
  active: Record<string, boolean>;
  onToggle: (key: VibeKey) => void;
  /* Mobil liste/harita geçiş düğmesi — verilmezse gösterilmez (ör. Rehber/Hava sekmesindeyken) */
  onToggleMobileView?: () => void;
  mobileView?: 'list' | 'map';
}

const VibeBar: React.FC<VibeBarProps> = ({ active, onToggle, onToggleMobileView, mobileView }) => {
  const { t } = useTranslation();
  return (
    <div className="h-11 shrink-0 flex items-center gap-2 px-3.5 border-t border-divider bg-surface">
      <div className="flex-1 min-w-0 flex items-center gap-2 overflow-x-auto">
        <span className="font-heading font-bold text-[10.5px] tracking-[0.14em] text-muted shrink-0">
          {t('dashboard.dailyPlanView.vibesLabel')}
        </span>
        {VIBE_KEYS.map((key) => {
          const on = !!active[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => onToggle(key)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold whitespace-nowrap shrink-0 transition-colors
                ${on ? 'bg-accent text-white' : 'bg-surface-2 text-muted hover:text-text'}`}
            >
              <span className="text-[13px]">{VIBE_EMOJIS[key]}</span>
              {t(`dashboard.dailyPlanView.vibes.${key}`)}
            </button>
          );
        })}
      </div>

      {onToggleMobileView && (
        <button
          type="button"
          onClick={onToggleMobileView}
          className="md:hidden shrink-0 inline-flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-full text-[11.5px] font-heading font-semibold bg-text text-bg whitespace-nowrap"
        >
          {mobileView === 'list' ? (
            <><MapIconLucide size={12} strokeWidth={2.2} />{t('home.product.demo.showMap')}</>
          ) : (
            <><ListIcon size={12} strokeWidth={2.2} />{t('home.product.demo.showList')}</>
          )}
        </button>
      )}
    </div>
  );
};

export default VibeBar;
