import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronUp, ChevronDown, Trash2, Pencil, Plus } from 'lucide-react';
import { GROUP_COLORS, type RuntimeActivity } from './types';
import type { DemoTravelTimes } from '../../data/tripPlannerDemo';

const TRAVEL_MODES = ['car', 'bus', 'walk', 'bike'] as const;
type TravelMode = typeof TRAVEL_MODES[number];
const TRAVEL_ICONS: Record<TravelMode, string> = { car: '🚗', bus: '🚌', walk: '🚶', bike: '🚲' };

interface ActivityListProps {
  items: RuntimeActivity[];
  expandedIds: Set<string>;
  onToggleOpen: (uid: string) => void;
  onMove: (uid: string, dir: -1 | 1) => void;
  onDelete: (uid: string) => void;
  onOpenAdd: () => void;
}

const TravelStrip: React.FC<{ times: DemoTravelTimes }> = ({ times }) => {
  const { t } = useTranslation();
  const fastest = TRAVEL_MODES.reduce<TravelMode>((best, m) => (times[m] < times[best] ? m : best), 'car');
  return (
    <div className="flex items-center flex-wrap gap-1.5 mt-2.5">
      <span className="text-[11px] text-muted">↕ {times.km} km</span>
      <span className="text-divider">·</span>
      {TRAVEL_MODES.map((mode) => {
        const isFastest = mode === fastest;
        return (
          <span
            key={mode}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold
              ${isFastest ? 'bg-accent-100 text-accent-700' : 'bg-surface-2 text-muted'}`}
          >
            <span className="text-[12px] leading-none">{TRAVEL_ICONS[mode]}</span>
            {t('dashboard.dailyPlanView.minutesShort', { mins: times[mode] })}
          </span>
        );
      })}
    </div>
  );
};

const resolveText = (item: RuntimeActivity, t: (k: string) => string) => ({
  title: item.sourceItemId ? t(`home.product.demo.items.${item.sourceItemId}.title`) : (item.customTitle ?? ''),
  desc: item.sourceItemId ? t(`home.product.demo.items.${item.sourceItemId}.desc`) : (item.customDesc ?? ''),
});

const iconBtnClass =
  'w-[26px] h-[26px] flex items-center justify-center rounded-md border border-divider bg-surface text-muted hover:text-accent hover:border-accent transition-colors disabled:opacity-30 disabled:pointer-events-none';

const ActivityList: React.FC<ActivityListProps> = ({ items, expandedIds, onToggleOpen, onMove, onDelete, onOpenAdd }) => {
  const { t } = useTranslation();

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-3.5 pb-4">
      {items.map((item, i) => {
        const { title, desc } = resolveText(item, t);
        const colors = GROUP_COLORS[item.group];
        const showHeader = i === 0 || item.group !== items[i - 1].group;
        const open = expandedIds.has(item.uid);

        return (
          <React.Fragment key={item.uid}>
            {showHeader && (
              <p className={`font-heading font-bold text-[10.5px] uppercase tracking-[0.16em] ${colors.text} ${i === 0 ? 'pt-1' : 'pt-4'} pb-1`}>
                {t(`dashboard.dailyPlanView.periods.${item.group}`)}
              </p>
            )}
            <div className="flex gap-2.5 py-3 border-t border-divider">
              <div
                className={`shrink-0 w-6 h-6 mt-0.5 rounded-full border-2 flex items-center justify-center text-[11px] font-extrabold ${colors.border} ${colors.text}`}
              >
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2.5">
                  <h3
                    onClick={() => onToggleOpen(item.uid)}
                    className="flex-1 font-medium text-[14.5px] leading-snug text-text cursor-pointer select-none"
                  >
                    {title}
                  </h3>
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => onMove(item.uid, -1)} disabled={i === 0} title={t('home.product.demo.moveUp')} className={iconBtnClass}>
                      <ChevronUp size={13} strokeWidth={2.4} />
                    </button>
                    <button type="button" onClick={() => onMove(item.uid, 1)} disabled={i === items.length - 1} title={t('home.product.demo.moveDown')} className={iconBtnClass}>
                      <ChevronDown size={13} strokeWidth={2.4} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(item.uid)}
                      title={t('home.product.demo.delete')}
                      className="w-[26px] h-[26px] flex items-center justify-center rounded-md border border-divider bg-surface text-muted hover:text-rose-500 hover:border-rose-400 transition-colors"
                    >
                      <Trash2 size={12} strokeWidth={2} />
                    </button>
                  </div>
                </div>

                {open && (
                  <>
                    <div className="flex gap-3 mt-2">
                      <p className="flex-1 text-[12.5px] leading-relaxed text-muted">{desc}</p>
                      <div className="shrink-0 self-start flex items-center gap-1.5 h-8 px-2.5 border border-divider rounded-lg">
                        <span className="font-medium text-[12.5px] text-text">€{item.cost}</span>
                        <Pencil size={11} className="text-muted" />
                      </div>
                    </div>
                    <TravelStrip times={item.times} />
                  </>
                )}
              </div>
            </div>
          </React.Fragment>
        );
      })}

      <button
        type="button"
        onClick={onOpenAdd}
        className="w-full mt-3 py-3.5 border-[1.5px] border-dashed border-divider rounded-xl text-muted hover:border-accent hover:text-accent hover:bg-accent-100 transition-colors flex items-center justify-center gap-2 font-heading font-semibold text-[13px]"
      >
        <Plus size={15} strokeWidth={2.4} />
        {t('dashboard.dailyPlanView.addActivity.title')}
      </button>
    </div>
  );
};

export default ActivityList;
