import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X, Sparkles } from 'lucide-react';
import { GROUP_ORDER, type DemoGroup } from '../../data/tripPlannerDemo';

interface AddActivityPanelProps {
  onClose: () => void;
}

/* Sadece görsel — gerçek bir aktivite eklemez. Slot çipleri, input ve "AI Öner"
   butonu işlevsiz, yalnızca gerçek özelliğin nasıl görüneceğini gösteriyor. */
const DISPLAY_SLOT: DemoGroup = 'afternoon';

const AddActivityPanel: React.FC<AddActivityPanelProps> = ({ onClose }) => {
  const { t } = useTranslation();

  return (
    <div className="absolute inset-x-0 bottom-11 z-10 bg-surface border-t border-divider shadow-[0_-12px_30px_rgba(46,43,37,0.12)] px-3.5 py-3.5">
      <div className="flex items-center justify-between mb-2.5">
        <p className="flex items-center gap-2 font-semibold text-[14px] text-text">
          <Plus size={15} className="text-accent" strokeWidth={2.4} />
          {t('dashboard.dailyPlanView.addActivity.title')}
        </p>
        <button type="button" onClick={onClose} className="text-muted hover:text-text transition-colors p-1">
          <X size={16} strokeWidth={2.2} />
        </button>
      </div>

      <div className="flex gap-1.5 flex-wrap mb-2.5">
        {GROUP_ORDER.map((g) => (
          <span
            key={g}
            className={`px-2.5 py-1 rounded-full text-[12px] font-heading font-semibold border select-none
              ${g === DISPLAY_SLOT ? 'bg-accent text-white border-accent' : 'bg-surface-2 text-muted border-divider'}`}
          >
            {t(`dashboard.dailyPlanView.periods.${g}`)}
          </span>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          readOnly
          placeholder={t('dashboard.dailyPlanView.addActivity.placeholder')}
          className="flex-1 px-3 py-2.5 text-[13px] rounded-xl border border-divider bg-surface-2 text-text placeholder:text-muted outline-none cursor-default"
        />
        <span className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-accent text-white text-[13px] font-heading font-semibold rounded-xl shrink-0 select-none">
          <Sparkles size={13} />
          {t('dashboard.dailyPlanView.addActivity.suggestAI')}
        </span>
      </div>
    </div>
  );
};

export default AddActivityPanel;
