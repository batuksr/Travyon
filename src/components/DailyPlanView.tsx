import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Edit2, Check } from 'lucide-react';
import type { DailyPlan } from '../services/aiService';
import { regenerateDayWithVibe } from '../services/aiService';
import { usePlanStore } from '../store/usePlanStore';
import { useOnboardingStore } from '../store/useOnboardingStore';
import { haversineDistance } from '../utils/geoOptimization';
import type { VibeType } from './VibeSelector';

interface Props {
  day: DailyPlan;
}

// Period'a göre sol kenar renk şeridi
const getPeriodAccentClass = (period: string): string => {
  if (period === 'Sabah') return 'bg-amber-400';
  if (period === 'Öğle') return 'bg-orange-400';
  if (period === 'Öğleden Sonra') return 'bg-blue-400';
  if (period === 'Akşam') return 'bg-purple-500';
  if (period === 'Gece') return 'bg-slate-700';
  return 'bg-slate-300';
};

// Period badge arkaplan + metin rengi
const getPeriodBadgeClass = (period: string): string => {
  if (period === 'Sabah') return 'bg-amber-50 text-amber-600';
  if (period === 'Öğle') return 'bg-orange-50 text-orange-600';
  if (period === 'Öğleden Sonra') return 'bg-blue-50 text-blue-600';
  if (period === 'Akşam') return 'bg-purple-50 text-purple-600';
  if (period === 'Gece') return 'bg-slate-100 text-slate-600';
  return 'bg-slate-100 text-slate-500';
};

// Period emojisi
const getPeriodEmoji = (period: string): string => {
  if (period === 'Sabah') return '🌅';
  if (period === 'Öğle') return '☀️';
  if (period === 'Öğleden Sonra') return '🌤️';
  if (period === 'Akşam') return '🌆';
  if (period === 'Gece') return '🌙';
  return '📍';
};

// Vibe konfigürasyonu
const vibeConfig: Record<string, { label: string; emoji: string; color: string }> = {
  rest:    { label: 'Dinlenme',    emoji: '😴', color: 'text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100' },
  indoor:  { label: 'Kapalı Alan', emoji: '🌧️', color: 'text-slate-600 bg-slate-50 border-slate-200 hover:bg-slate-100' },
  budget:  { label: 'Tasarruf',    emoji: '💰', color: 'text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100' },
  explore: { label: 'Keşif',       emoji: '🎉', color: 'text-orange-600 bg-orange-50 border-orange-200 hover:bg-orange-100' },
};

const DailyPlanView: React.FC<Props> = ({ day }) => {
  const { plan, updateDayPlan, updateActivityActualCost } = usePlanStore();
  const { data: tripData } = useOnboardingStore();
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [activeVibe, setActiveVibe] = useState<VibeType>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [tempCost, setTempCost] = useState<string>('');

  const currencySymbol = plan?.currencySymbol ?? '₺';

  const handleVibeSelect = async (vibe: VibeType) => {
    // Aynı vibe'a tekrar basılırsa iptal et
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
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden relative">
      {/* Vibe Yükleme Overlay */}
      {isRegenerating && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 text-white px-5 py-3 rounded-xl flex items-center gap-3 shadow-2xl text-sm font-semibold"
          >
            <Loader2 size={16} className="animate-spin text-[#187fe7]" />
            Yeni moda göre optimize ediliyor...
          </motion.div>
        </div>
      )}

      {/* ── GÜN BAŞLIĞI ── */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#187fe7] rounded-xl flex items-center justify-center text-white font-black text-lg">
              {day.dayNumber}
            </div>
            <div>
              <p className="text-white font-bold text-sm">{day.dayNumber}. Gün</p>
              <p className="text-slate-400 text-xs">{day.date}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-white font-black text-lg">
              {currencySymbol}{day.totalEstimatedCost.toLocaleString()}
            </p>
            <p className="text-slate-400 text-xs">tahmini maliyet</p>
          </div>
        </div>

        {day.daySummary && (
          <p className="mt-3 text-slate-300 text-sm leading-relaxed border-t border-white/10 pt-3">
            {day.daySummary}
          </p>
        )}
      </div>

      {/* ── VİBE SEÇİCİ ── */}
      <div className="flex gap-2 overflow-x-auto px-5 py-3 border-b border-slate-100 bg-slate-50/50 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {(Object.keys(vibeConfig) as Array<keyof typeof vibeConfig>).map((key) => {
          const cfg = vibeConfig[key];
          const isActive = activeVibe === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => handleVibeSelect(key as VibeType)}
              disabled={isRegenerating}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
                isActive
                  ? cfg.color + ' ring-2 ring-offset-1 ring-current'
                  : cfg.color
              }`}
            >
              <span>{cfg.emoji}</span>
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* ── AKTİVİTE LİSTESİ ── */}
      <div className="p-5 space-y-3">
        {day.activities.map((activity, index) => {
          let distanceKm: string | null = null;
          if (index < day.activities.length - 1) {
            const next = day.activities[index + 1];
            distanceKm = haversineDistance(
              activity.coordinates.lat, activity.coordinates.lng,
              next.coordinates.lat, next.coordinates.lng
            ).toFixed(1);
          }

          return (
            <div key={index}>
              {/* Aktivite Kartı */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, duration: 0.25 }}
              >
                <div className="relative bg-white rounded-2xl border border-slate-100 overflow-hidden hover:border-slate-200 hover:shadow-md transition-all duration-200 group">

                  {/* Sol kenar renk şeridi */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${getPeriodAccentClass(activity.period)}`} />

                  <div className="pl-5 pr-4 py-4">
                    <div className="flex items-start justify-between gap-3">

                      {/* Sol: badge + isim + açıklama */}
                      <div className="flex-1 min-w-0">

                        {/* Period badge + koordinat doğrulama */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${getPeriodBadgeClass(activity.period)}`}>
                            {getPeriodEmoji(activity.period)} {activity.period}
                          </span>
                          {activity.coordinates && (
                            <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-medium">
                              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block" />
                              Doğrulandı
                            </span>
                          )}
                        </div>

                        {/* Mekan adı */}
                        <h3 className="font-bold text-slate-900 text-base leading-tight group-hover:text-[#187fe7] transition-colors">
                          {activity.placeName}
                        </h3>

                        {/* Açıklama — 2 satır */}
                        <p className="mt-1.5 text-sm text-slate-500 leading-relaxed line-clamp-2">
                          {activity.description}
                        </p>
                      </div>

                      {/* Sağ: maliyet + edit */}
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        {editingIndex === index ? (
                          <div className="flex items-center gap-1 bg-white border border-blue-200 px-2 py-1 rounded-lg shadow-sm">
                            <span className="text-xs text-slate-400 font-semibold">{currencySymbol}</span>
                            <input
                              type="number"
                              autoFocus
                              className="w-16 outline-none text-xs font-semibold text-slate-800"
                              value={tempCost}
                              onChange={e => setTempCost(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleSaveCost(index)}
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveCost(index)}
                              className="text-emerald-600 p-0.5 hover:text-emerald-700"
                            >
                              <Check size={12} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingIndex(index);
                              setTempCost((activity.actualCost ?? activity.estimatedCost).toString());
                            }}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                              activity.actualCost !== undefined
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                            title="Gerçek harcamayı gir"
                          >
                            <span className="font-black text-sm">
                              {currencySymbol}{activity.actualCost !== undefined ? activity.actualCost : activity.estimatedCost}
                            </span>
                            <Edit2 size={9} className="opacity-40" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Aktiviteler arası mesafe göstergesi */}
              {distanceKm && index < day.activities.length - 1 && (
                <div className="flex items-center gap-2 py-1.5 pl-4">
                  <div className="w-px h-5 bg-slate-200 ml-0.5" />
                  <span className="text-[11px] text-slate-400 font-medium">
                    ↕ {distanceKm} km yürüyüş
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DailyPlanView;
