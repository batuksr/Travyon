import React from 'react';
import { useTranslation } from 'react-i18next';

const VIBE_KEYS = ['rest', 'indoor', 'budget', 'explore'] as const;
type VibeKey = typeof VIBE_KEYS[number];
const VIBE_EMOJIS: Record<VibeKey, string> = { rest: '😴', indoor: '🌧️', budget: '💰', explore: '🎉' };

interface VibeBarProps {
  active: Record<string, boolean>;
  onToggle: (key: VibeKey) => void;
}

const VibeBar: React.FC<VibeBarProps> = ({ active, onToggle }) => {
  const { t } = useTranslation();
  return (
    <div className="h-11 shrink-0 flex items-center gap-2 px-3.5 border-t border-divider bg-surface overflow-x-auto">
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
  );
};

export default VibeBar;
