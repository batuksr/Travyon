import React from 'react';

interface DayTabsProps {
  labels: string[];
  counts: number[];
  activeIdx: number;
  onSelect: (i: number) => void;
}

const DayTabs: React.FC<DayTabsProps> = ({ labels, counts, activeIdx, onSelect }) => (
  <div className="flex flex-wrap gap-1.5 px-3.5 pt-3 pb-1.5 shrink-0">
    {labels.map((label, i) => {
      const active = i === activeIdx;
      return (
        <button
          key={i}
          type="button"
          onClick={() => onSelect(i)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12.5px] font-semibold transition-all
            ${active ? 'bg-accent text-white' : 'bg-surface border border-divider text-text hover:border-accent/40'}`}
        >
          <span
            className={`w-[19px] h-[19px] rounded-full flex items-center justify-center text-[10.5px] font-bold
              ${active ? 'bg-white/25 text-white' : 'bg-accent-100 text-accent-700'}`}
          >
            {i + 1}
          </span>
          <span className="tracking-wide">{label}</span>
          <span className="opacity-75">({counts[i]})</span>
        </button>
      );
    })}
  </div>
);

export default DayTabs;
