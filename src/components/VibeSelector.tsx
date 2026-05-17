import React, { useState } from 'react';
import { Coffee, CloudRain, PiggyBank, Compass } from 'lucide-react';

export type VibeType = 'rest' | 'indoor' | 'budget' | 'explore' | null;

interface Props {
  onVibeChange: (vibe: VibeType) => void;
}

const VibeSelector: React.FC<Props> = ({ onVibeChange }) => {
  const [activeVibe, setActiveVibe] = useState<VibeType>(null);

  const handleSelect = (vibe: VibeType) => {
    // Tapping the same vibe turns it off
    const newVibe = activeVibe === vibe ? null : vibe;
    setActiveVibe(newVibe);
    onVibeChange(newVibe);
  };

  const vibes = [
    { id: 'rest', label: 'Dinlenme', icon: Coffee, activeColor: 'bg-orange-100 text-orange-700 border-orange-300' },
    { id: 'indoor', label: 'Kapalı Alan', icon: CloudRain, activeColor: 'bg-slate-200 text-slate-800 border-slate-400' },
    { id: 'budget', label: 'Tasarruf', icon: PiggyBank, activeColor: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
    { id: 'explore', label: 'Keşif', icon: Compass, activeColor: 'bg-rose-100 text-rose-700 border-rose-300' }
  ] as const;

  return (
    <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide px-6 pt-4 border-b border-slate-100 bg-slate-50/50">
      {vibes.map((vibe) => {
        const Icon = vibe.icon;
        const isActive = activeVibe === vibe.id;
        return (
          <button
            key={vibe.id}
            onClick={() => handleSelect(vibe.id as VibeType)}
            className={`flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full border text-sm font-medium transition-all shrink-0 
              ${isActive 
                ? vibe.activeColor 
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 shadow-sm hover:shadow'
              }`}
          >
            <Icon size={16} />
            {vibe.label}
          </button>
        );
      })}
    </div>
  );
};

export default VibeSelector;
