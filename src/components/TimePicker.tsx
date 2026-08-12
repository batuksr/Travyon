import React, { useEffect, useRef } from 'react';

interface TimePickerProps {
  value: string; // 'HH:MM'
  onChange: (value: string) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

const TimePicker: React.FC<TimePickerProps> = ({ value, onChange }) => {
  const [h, m] = value.split(':');
  const hourColRef = useRef<HTMLDivElement>(null);
  const minuteColRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollToSelected = (container: HTMLDivElement | null) => {
      const el = container?.querySelector('[data-selected="true"]');
      el?.scrollIntoView({ block: 'center' });
    };
    scrollToSelected(hourColRef.current);
    scrollToSelected(minuteColRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setHour = (hh: string) => onChange(`${hh}:${m}`);
  const setMinute = (mm: string) => onChange(`${h}:${mm}`);

  return (
    <div className="bg-surface border border-divider rounded-2xl shadow-xl p-2 w-[136px]">
      <div className="flex gap-1">
        {/* Saat sütunu */}
        <div ref={hourColRef} className="flex-1 h-[140px] overflow-y-auto">
          {HOURS.map((hh) => (
            <button
              key={hh}
              type="button"
              data-selected={hh === h}
              onClick={() => setHour(hh)}
              className={`w-full text-center py-1 rounded-md text-[11.5px] font-medium transition-colors ${
                hh === h ? 'bg-accent text-white' : 'text-text hover:bg-surface-2'
              }`}
            >
              {hh}
            </button>
          ))}
        </div>
        {/* Dakika sütunu */}
        <div ref={minuteColRef} className="flex-1 h-[140px] overflow-y-auto">
          {MINUTES.map((mm) => (
            <button
              key={mm}
              type="button"
              data-selected={mm === m}
              onClick={() => setMinute(mm)}
              className={`w-full text-center py-1 rounded-md text-[11.5px] font-medium transition-colors ${
                mm === m ? 'bg-accent text-white' : 'text-text hover:bg-surface-2'
              }`}
            >
              {mm}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TimePicker;
