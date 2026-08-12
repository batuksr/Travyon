import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Circle, ChevronDown, ArrowLeft, RefreshCw } from 'lucide-react';

interface CheckItem {
  id: string;
}

interface CheckGroup {
  id: string;
  emoji: string;
  items: CheckItem[];
}

const CHECKLIST: CheckGroup[] = [
  {
    id: 'documents',
    emoji: '📄',
    items: [
      { id: 'passport' },
      { id: 'visa' },
      { id: 'ticket' },
      { id: 'hotel' },
      { id: 'insurance' },
      { id: 'emergency' },
    ],
  },
  {
    id: 'money',
    emoji: '💳',
    items: [
      { id: 'cash' },
      { id: 'card' },
      { id: 'backup' },
    ],
  },
  {
    id: 'health',
    emoji: '🏥',
    items: [
      { id: 'medicine' },
      { id: 'firstaid' },
      { id: 'sunscreen' },
      { id: 'vaccine' },
    ],
  },
  {
    id: 'tech',
    emoji: '🔌',
    items: [
      { id: 'charger' },
      { id: 'powerbank' },
      { id: 'simcard' },
      { id: 'offline' },
      { id: 'transport' },
    ],
  },
  {
    id: 'luggage',
    emoji: '🧳',
    items: [
      { id: 'clothes' },
      { id: 'shoes' },
      { id: 'lock' },
      { id: 'copies' },
      { id: 'notify' },
    ],
  },
];

const TravelChecklist: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planId = searchParams.get('planId') ?? 'default';
  const dest   = searchParams.get('dest') ?? '';
  const storageKey = `travyon-checklist-${planId}`;

  const [checked, setChecked] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set(CHECKLIST.map(g => g.id))
  );

  const totalItems = CHECKLIST.flatMap(g => g.items).length;
  const checkedCount = checked.size;
  const progress = Math.round((checkedCount / totalItems) * 100);

  // planId değişince o plana ait kaydı yükle
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      setChecked(saved ? new Set(JSON.parse(saved)) : new Set());
    } catch { setChecked(new Set()); }
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify([...checked]));
  }, [checked, storageKey]);

  const toggle = (id: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleGroup = (id: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const reset = () => {
    setChecked(new Set());
    localStorage.removeItem(storageKey);
  };

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">

        {/* Geri */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-muted hover:text-text transition-colors mb-8"
        >
          <ArrowLeft size={15} strokeWidth={2.5} />
          {t('travelChecklist.back')}
        </button>

        {/* Başlık — sage gradient kart */}
        <div className="relative overflow-hidden bg-gradient-to-br from-sage to-sage-700 rounded-[26px] p-7 sm:p-8 mb-6 text-white flex items-center justify-between gap-5">
          <div>
            <p className="text-[11px] font-heading uppercase tracking-widest text-white/80">
              {dest || t('travelChecklist.prepDefault')}
            </p>
            <h1 className="font-heading text-[28px] mt-2 leading-tight">
              {t('travelChecklist.title')}
            </h1>
            <p className="text-white/85 text-sm mt-1">
              {t('travelChecklist.itemsCompleted', { checked: checkedCount, total: totalItems })}
            </p>
          </div>
          <div className="w-[78px] h-[78px] rounded-full bg-white/18 flex items-center justify-center flex-none font-heading text-2xl">
            %{progress}
          </div>
        </div>

        {/* İlerleme çubuğu + sıfırla */}
        <div className="bg-surface rounded-3xl border border-divider p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="font-heading text-2xl text-text">{checkedCount}</span>
              <span className="text-muted text-sm font-medium">{t('travelChecklist.completedOfTotal', { total: totalItems })}</span>
            </div>
            <div className="flex items-center gap-2">
              {progress === 100 && (
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                  🎉 {t('travelChecklist.ready')}
                </span>
              )}
              <button
                onClick={reset}
                className="flex items-center gap-1 text-xs text-muted hover:text-text transition-colors"
                title={t('travelChecklist.reset')}
              >
                <RefreshCw size={12} strokeWidth={2.5} />
                {t('travelChecklist.reset')}
              </button>
            </div>
          </div>
          <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                background: progress === 100
                  ? 'linear-gradient(90deg,#10b981,#34d399)'
                  : 'linear-gradient(90deg,#7a8a5e,#a8bb84)',
              }}
            />
          </div>
        </div>

        {/* Gruplar */}
        <div className="space-y-3">
          {CHECKLIST.map(group => {
            const isOpen = openGroups.has(group.id);
            const groupChecked = group.items.filter(i => checked.has(i.id)).length;
            const allDone = groupChecked === group.items.length;

            return (
              <div
                key={group.id}
                className="bg-surface rounded-3xl border border-divider overflow-hidden"
              >
                {/* Grup başlığı */}
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-2 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{group.emoji}</span>
                    <span className="font-heading text-text text-sm">{t(`travelChecklist.groups.${group.id}`)}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      allDone
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-surface-2 text-muted'
                    }`}>
                      {groupChecked}/{group.items.length}
                    </span>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Maddeler */}
                {isOpen && (
                  <div className="divide-y divide-divider border-t border-divider">
                    {group.items.map(item => {
                      const isDone = checked.has(item.id);
                      return (
                        <button
                          key={item.id}
                          onClick={() => toggle(item.id)}
                          className="w-full flex items-start gap-3.5 px-5 py-3.5 hover:bg-surface-2 transition-colors text-left group"
                        >
                          {isDone
                            ? <CheckCircle2 size={18} className="text-sage flex-shrink-0 mt-0.5" />
                            : <Circle size={18} className="text-divider flex-shrink-0 mt-0.5 group-hover:text-muted transition-colors" />
                          }
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium leading-tight transition-colors ${
                              isDone
                                ? 'text-muted line-through'
                                : 'text-text'
                            }`}>
                              {t(`travelChecklist.items.${item.id}.label`)}
                            </p>
                            {!isDone && (
                              <p className="text-xs text-muted mt-0.5 leading-relaxed">
                                {t(`travelChecklist.items.${item.id}.tip`)}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted mt-8">
          {t('travelChecklist.autoSaved')} ✓
        </p>

      </div>
    </div>
  );
};

export default TravelChecklist;
