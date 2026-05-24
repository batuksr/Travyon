import React, { useState } from 'react';
import { Loader2, Edit2, Check } from 'lucide-react';
import type { DailyPlan } from '../services/aiService';
import { regenerateDayWithVibe } from '../services/aiService';
import { usePlanStore } from '../store/usePlanStore';
import { useOnboardingStore } from '../store/useOnboardingStore';
import { haversineDistance } from '../utils/geoOptimization';
import type { VibeType } from './VibeSelector';

interface Props {
  day: DailyPlan;
  onActivityClick?: (place: { placeName: string; lat: number; lng: number }) => void;
}

const getPeriodColor = (period: string) => {
  if (period === 'Sabah')         return { border: 'border-amber-300',  bg: 'bg-amber-50',  text: 'text-amber-600' };
  if (period === 'Öğle')          return { border: 'border-orange-300', bg: 'bg-orange-50', text: 'text-orange-600' };
  if (period === 'Öğleden Sonra') return { border: 'border-blue-300',   bg: 'bg-blue-50',   text: 'text-blue-600' };
  if (period === 'Akşam')         return { border: 'border-purple-300', bg: 'bg-purple-50', text: 'text-purple-600' };
  if (period === 'Gece')          return { border: 'border-slate-400',  bg: 'bg-slate-100', text: 'text-slate-600' };
  return { border: 'border-slate-300', bg: 'bg-slate-50', text: 'text-slate-500' };
};

const vibeConfig: Record<string, { label: string; emoji: string }> = {
  rest:    { label: 'Dinlenme',    emoji: '😴' },
  indoor:  { label: 'Kapalı Alan', emoji: '🌧️' },
  budget:  { label: 'Tasarruf',    emoji: '💰' },
  explore: { label: 'Keşif',       emoji: '🎉' },
};

const DailyPlanView: React.FC<Props> = ({ day, onActivityClick }) => {
  const { plan, updateDayPlan, updateActivityActualCost } = usePlanStore();
  const { data: tripData } = useOnboardingStore();
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [activeVibe, setActiveVibe] = useState<VibeType>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [tempCost, setTempCost] = useState<string>('');

  const currencySymbol = plan?.currencySymbol ?? '₺';

  const handleVibeSelect = async (vibe: VibeType) => {
    const newVibe = activeVibe === vibe ? null : vibe;
    setActiveVibe(newVibe);
    if (!newVibe || !plan) return;

    setIsRegenerating(true);
    try {
      const newDay = await regenerateDayWithVibe(
        day,
        plan.destination,
        newVibe,
        tripData.startDate,
        tripData.arrivalTime,
        tripData.endDate,
        tripData.departureTime,
        (updatedDay) => updateDayPlan(day.dayNumber, updatedDay)
      );
      updateDayPlan(day.dayNumber, newDay);
      setActiveVibe(null);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Bilinmeyen hata';
      alert('Vibe güncellenirken hata oluştu: ' + msg);
      setActiveVibe(null);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleSaveCost = (index: number) => {
    const cost = parseFloat(tempCost);
    if (!isNaN(cost)) {
      updateActivityActualCost(day.dayNumber, index, cost);
    }
    setEditingIndex(null);
  };

  return (
    <div className="flex flex-col h-full relative">

      {/* ── YÜKLENİYOR OVERLAY ── */}
      {isRegenerating && (
        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-semibold shadow-lg">
            <Loader2 size={14} className="animate-spin text-[#187fe7]" />
            Optimize ediliyor...
          </div>
        </div>
      )}

      {/* ── TİMLİNE ── */}
      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-2">
        {day.activities.map((activity, index) => {
          const isLast = index === day.activities.length - 1;
          const nextActivity = !isLast ? day.activities[index + 1] : null;
          const distanceKm = nextActivity
            ? haversineDistance(
                activity.coordinates.lat, activity.coordinates.lng,
                nextActivity.coordinates.lat, nextActivity.coordinates.lng
              ).toFixed(1)
            : null;

          const colors = getPeriodColor(activity.period);
          const prevPeriod = index > 0 ? day.activities[index - 1].period : null;
          const showPeriodLabel = activity.period !== prevPeriod;

          return (
            <div key={index}>
              {/* Period section label */}
              {showPeriodLabel && (
                <p className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ml-9 ${index > 0 ? 'mt-4' : ''} ${colors.text}`}>
                  {activity.period}
                </p>
              )}

              <div className="flex gap-3">
                {/* Numbered circle + vertical line */}
                <div className="flex flex-col items-center shrink-0 w-6">
                  <div className={`w-6 h-6 rounded-full border-2 ${colors.border} ${colors.bg} flex items-center justify-center shrink-0`}>
                    <span className={`text-[10px] font-bold ${colors.text}`}>{index + 1}</span>
                  </div>
                  {!isLast && (
                    <div className="w-px flex-1 min-h-[20px] bg-slate-200 dark:bg-slate-600 mt-0.5" />
                  )}
                </div>

                {/* Content */}
                <div className={`flex-1 min-w-0 ${isLast ? 'pb-1' : 'pb-3'}`}>
                  <div className="flex items-start justify-between gap-2 group">
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => onActivityClick?.({
                        placeName: activity.placeName,
                        lat: activity.coordinates.lat,
                        lng: activity.coordinates.lng,
                      })}
                    >
                      <h3 className="text-sm font-semibold text-slate-900 group-hover:text-[#f8981d] transition-colors leading-tight">
                        {activity.placeName}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                        {activity.description}
                      </p>
                    </div>

                    {/* Cost edit */}
                    <div className="shrink-0">
                      {editingIndex === index ? (
                        <div className="flex items-center gap-1 bg-white border border-blue-200 px-2 py-1 rounded-md shadow-sm">
                          <span className="text-xs text-slate-400">{currencySymbol}</span>
                          <input
                            type="number"
                            autoFocus
                            className="w-14 outline-none text-xs font-semibold text-slate-800"
                            value={tempCost}
                            onChange={e => setTempCost(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSaveCost(index)}
                          />
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleSaveCost(index); }}
                            className="text-emerald-600 hover:text-emerald-700"
                          >
                            <Check size={11} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingIndex(index);
                            setTempCost((activity.actualCost ?? activity.estimatedCost).toString());
                          }}
                          className={`flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-semibold transition-colors ${
                            activity.actualCost !== undefined
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {currencySymbol}{activity.actualCost !== undefined ? activity.actualCost : activity.estimatedCost}
                          <Edit2 size={9} className="opacity-40" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Distance to next activity */}
                  {distanceKm && !isLast && (
                    <p className="text-[10px] text-slate-400 mt-1 font-medium">↕ {distanceKm} km</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── STİCKY VİBE BAR ── */}
      <div className="sticky bottom-0 border-t border-slate-100 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm px-5 py-2.5 flex items-center gap-2 shrink-0">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Vibe:</span>
        <div className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {(Object.keys(vibeConfig) as Array<keyof typeof vibeConfig>).map((key) => {
            const cfg = vibeConfig[key];
            const isActive = activeVibe === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleVibeSelect(key as VibeType)}
                disabled={isRegenerating}
                className={`inline-flex items-center gap-1.5 px-4 py-1 rounded-md border text-xs font-semibold transition-all shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isActive
                    ? 'bg-[#f8981d] text-white border-[#f8981d]'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                <span>{cfg.emoji}</span>
                {cfg.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DailyPlanView;
