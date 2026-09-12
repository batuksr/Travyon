import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface DateRangeCalendarProps {
  startDate: string; // 'YYYY-MM-DD' ya da ''
  endDate: string;
  minDate: string;   // 'YYYY-MM-DD'
  onChange: (startDate: string, endDate: string) => void;
  onClear: () => void;
}

const toDateStr = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const parseDateStr = (s: string): Date | null => (s ? new Date(s + 'T00:00:00') : null);

const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

/** Pazartesi başlangıçlı 6 haftalık grid — ay dışı günler için null */
const buildGrid = (year: number, month: number): (Date | null)[] => {
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // Pzt=0
  const total = daysInMonth(year, month);
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= total; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
};

const DateRangeCalendar: React.FC<DateRangeCalendarProps> = ({ startDate, endDate, minDate, onChange, onClear }) => {
  const { t, i18n } = useTranslation();
  const localeCode = i18n.language === 'en' ? 'en-US' : 'tr-TR';

  const start = parseDateStr(startDate);
  const min = parseDateStr(minDate) ?? new Date();

  const [viewDate, setViewDate] = useState(() => start ?? min);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const grid = buildGrid(year, month);

  const monthLabel = new Intl.DateTimeFormat(localeCode, { month: 'long', year: 'numeric' }).format(viewDate);
  // Pazartesi başlangıçlı hafta günü kısaltmaları (2024-01-01 Pazartesi'ydi)
  const weekdayLabels = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(localeCode, { weekday: 'short' }).format(new Date(2024, 0, 1 + i))
  );

  const goMonth = (delta: number) => setViewDate(new Date(year, month + delta, 1));

  const isBeforeMin = (d: Date) => d < new Date(min.getFullYear(), min.getMonth(), min.getDate());
  const isSameDay = (a: Date | null, b: Date | null) => !!a && !!b && toDateStr(a) === toDateStr(b);
  const isToday = (d: Date) => isSameDay(d, new Date());
  const isStart = (d: Date) => isSameDay(d, start);
  const isEnd = (d: Date) => !!endDate && isSameDay(d, parseDateStr(endDate));
  const isInRange = (d: Date) => {
    if (!start || !endDate) return false;
    const e = parseDateStr(endDate)!;
    return d > start && d < e;
  };

  const handlePick = (d: Date) => {
    if (isBeforeMin(d)) return;
    const picked = toDateStr(d);
    if (!start || (start && endDate)) {
      // Yeni seçim başlat
      onChange(picked, '');
    } else if (d < start) {
      // Başlangıçtan önceki bir gün seçildi → yeni başlangıç yap
      onChange(picked, '');
    } else {
      // Bitiş tarihi
      onChange(startDate, picked);
    }
  };

  return (
    <div className="bg-surface border border-divider rounded-2xl shadow-xl p-3 w-[248px]">
      {/* Ay navigasyonu */}
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => goMonth(-1)}
          className="w-5 h-5 rounded-full flex items-center justify-center text-muted hover:bg-surface-2 hover:text-text transition-colors"
        >
          <ArrowLeft size={11} strokeWidth={2.5} />
        </button>
        <span className="font-heading text-xs text-text capitalize">{monthLabel}</span>
        <button
          type="button"
          onClick={() => goMonth(1)}
          className="w-5 h-5 rounded-full flex items-center justify-center text-muted hover:bg-surface-2 hover:text-text transition-colors"
        >
          <ArrowRight size={11} strokeWidth={2.5} />
        </button>
      </div>

      {/* Hafta günleri */}
      <div className="grid grid-cols-7 mb-0.5">
        {weekdayLabels.map((w, i) => (
          <span key={i} className="text-center text-[9px] font-semibold text-muted uppercase py-0.5">{w}</span>
        ))}
      </div>

      {/* Gün grid'i */}
      <div className="grid grid-cols-7">
        {grid.map((d, i) => {
          if (!d) return <div key={i} />;
          const disabled = isBeforeMin(d);
          const selectedStart = isStart(d);
          const selectedEnd = isEnd(d);
          const inRange = isInRange(d);
          return (
            <div key={i} className="flex items-center justify-center py-px">
              <button
                type="button"
                disabled={disabled}
                onClick={() => handlePick(d)}
                className={`w-6 h-6 rounded-full text-[11px] font-medium transition-colors flex items-center justify-center
                  ${disabled ? 'text-muted/30 cursor-not-allowed'
                    : selectedStart ? 'bg-accent text-white'
                    : selectedEnd ? 'bg-accent/70 text-white'
                    : inRange ? 'bg-accent-100 text-accent-700'
                    : isToday(d) ? 'text-text ring-1 ring-accent/40 hover:bg-surface-2'
                    : 'text-text hover:bg-surface-2'}`}
              >
                {d.getDate()}
              </button>
            </div>
          );
        })}
      </div>

      {/* Alt aksiyonlar */}
      <div className="flex items-center justify-end mt-2 pt-2 border-t border-divider">
        <button
          type="button"
          onClick={onClear}
          className="text-[11px] font-semibold text-muted hover:text-text transition-colors"
        >
          {t('onboarding.step1.calendar.clear')}
        </button>
      </div>
    </div>
  );
};

export default DateRangeCalendar;
