import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, MapIcon, BookOpen, CloudSun, Bookmark, Check, Sun, Moon } from 'lucide-react';
import { useThemeStore } from '../../store/useThemeStore';
import { toggleWithCircle } from '../../utils/themeTransition';

export type PanelKind = 'guide' | 'weather' | null;

interface TopBarProps {
  dayCount: number;
  total: number;
  panel: PanelKind;
  onTabChange: (p: PanelKind) => void;
  saved: boolean;
  onSave: () => void;
  onReset: () => void;
}

const tabBtnClass = (active: boolean) =>
  `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-heading font-semibold transition-all
   ${active ? 'bg-surface text-text shadow-sm' : 'text-muted hover:text-text'}`;

const TopBar: React.FC<TopBarProps> = ({ dayCount, total, panel, onTabChange, saved, onSave, onReset }) => {
  const { t } = useTranslation();
  const { dark, toggle: toggleTheme } = useThemeStore();

  return (
    <div className="flex items-center gap-3 sm:gap-4 h-14 px-3 sm:px-4 border-b border-divider bg-surface shrink-0">
      <button
        type="button"
        onClick={onReset}
        title={t('home.product.demo.resetLabel')}
        aria-label={t('home.product.demo.resetLabel')}
        className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg text-text hover:bg-surface-2 transition-colors"
      >
        <ArrowLeft size={18} strokeWidth={2.2} />
      </button>

      <div className="hidden sm:flex items-baseline gap-2 shrink-0">
        <span className="font-medium text-[17px] text-text">{t('home.product.demo.destination')}</span>
        <span className="text-muted text-[13px]">· {t('dashboard.topBar.daysCount', { count: dayCount })}</span>
      </div>

      <div className="flex-1 flex justify-center min-w-0">
        <div className="flex items-center gap-0.5 bg-surface-2 border border-divider rounded-xl p-0.5">
          <button type="button" onClick={() => onTabChange(null)} className={tabBtnClass(panel === null)}>
            <MapIcon size={13} strokeWidth={2.2} />
            <span className="hidden xs:inline">{t('dashboard.topBar.tabPlan')}</span>
          </button>
          <button type="button" onClick={() => onTabChange('guide')} className={tabBtnClass(panel === 'guide')}>
            <BookOpen size={13} strokeWidth={2.2} />
            <span className="hidden xs:inline">{t('dashboard.topBar.tabGuide')}</span>
          </button>
          <button type="button" onClick={() => onTabChange('weather')} className={tabBtnClass(panel === 'weather')}>
            <CloudSun size={13} strokeWidth={2.2} />
            <span className="hidden xs:inline">{t('dashboard.topBar.tabWeather')}</span>
          </button>
        </div>
      </div>

      <div className="hidden md:flex items-baseline gap-1.5 text-[13px] shrink-0">
        <span className="text-muted">{t('dashboard.topBar.total')}</span>
        <span className="font-medium text-[16px] text-text">€{total}</span>
      </div>

      <button
        type="button"
        onClick={onSave}
        className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 border border-accent bg-surface text-accent font-heading font-semibold text-[12.5px] rounded-lg hover:bg-accent-100 transition-colors shrink-0"
      >
        {saved ? <Check size={13} strokeWidth={2.5} /> : <Bookmark size={13} strokeWidth={2.2} />}
        {saved ? t('dashboard.topBar.saved') : t('dashboard.topBar.save')}
      </button>

      <button
        type="button"
        onClick={(e) => toggleWithCircle(toggleTheme, e)}
        title={dark ? t('dashboard.topBar.lightMode') : t('dashboard.topBar.nightMode')}
        aria-label={dark ? t('dashboard.topBar.lightMode') : t('dashboard.topBar.nightMode')}
        className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg border border-divider text-muted hover:text-accent hover:border-accent transition-colors"
      >
        {dark ? <Moon size={15} /> : <Sun size={15} />}
      </button>
    </div>
  );
};

export default TopBar;
