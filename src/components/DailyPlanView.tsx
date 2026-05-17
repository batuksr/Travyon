import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation2, Loader2, Edit2, Check } from 'lucide-react';
import type { DailyPlan } from '../services/aiService';
import { regenerateDayWithVibe } from '../services/aiService';
import { usePlanStore } from '../store/usePlanStore';
import { haversineDistance } from '../utils/geoOptimization';
import VibeSelector from './VibeSelector';
import type { VibeType } from './VibeSelector';

interface Props {
  day: DailyPlan;
}

const DailyPlanView: React.FC<Props> = ({ day }) => {
  const { plan, updateDayPlan, updateActivityActualCost } = usePlanStore();
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [tempCost, setTempCost] = useState<string>('');

  const handleVibeChange = async (vibe: VibeType) => {
    if (!vibe || !plan) return;
    setIsRegenerating(true);
    try {
      const newDay = await regenerateDayWithVibe(day, plan.destination, vibe);
      updateDayPlan(day.dayNumber, newDay);
    } catch (error: any) {
      alert("Vibe güncellenirken hata oluştu: " + error.message);
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
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden relative">
      {/* Vibe Yükleme Overlay */}
      {isRegenerating && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 text-white px-5 py-2.5 rounded-lg flex items-center gap-2.5 shadow-xl text-sm font-medium"
          >
            <Loader2 size={16} className="animate-spin text-blue-400" />
            Yeni moda göre optimize ediliyor...
          </motion.div>
        </div>
      )}

      {/* Gün Başlığı */}
      <div className="px-5 py-3.5 bg-slate-900 text-white flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 bg-white/15 rounded-md flex items-center justify-center text-sm font-bold">
            {day.dayNumber}
          </span>
          <span className="text-sm font-medium text-slate-300">{day.date}</span>
        </div>
        <div className="text-xs font-semibold bg-white/10 px-3 py-1 rounded-md text-slate-300">
          {plan?.currencySymbol}{day.totalEstimatedCost}
        </div>
      </div>

      {/* Vibe Hızlı Eylem Butonları */}
      <VibeSelector onVibeChange={handleVibeChange} />

      {/* Günlük Özet */}
      <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
        <p className="text-sm text-slate-600 font-medium">{day.daySummary}</p>
      </div>

      {/* Timeline */}
      <div className="p-5">
        {day.activities.map((activity, index) => {
          let distanceKm = null;
          if (index < day.activities.length - 1) {
            const nextActivity = day.activities[index + 1];
            distanceKm = haversineDistance(
              activity.coordinates.lat, activity.coordinates.lng,
              nextActivity.coordinates.lat, nextActivity.coordinates.lng
            ).toFixed(1);
          }

          return (
            <div key={index} className="relative flex gap-6 md:gap-8 mb-8 last:mb-0">
              {/* Sol: Sıra Numarası + Timeline Çizgisi */}
              <div className="flex flex-col items-center w-8 shrink-0">
                {/* Sıra No */}
                <div className="w-6 h-6 rounded-full bg-slate-900 border-[1.5px] border-white shadow-sm z-10 flex items-center justify-center text-white text-[10px] font-bold mb-1.5">
                  {index + 1}
                </div>
                {/* Çizgi */}
                {index !== day.activities.length - 1 && (
                  <div className="flex flex-col items-center flex-1 min-h-[40px]">
                    <div className="w-px flex-1 bg-slate-200" />
                    {distanceKm && (
                      <div className="my-1 flex items-center gap-0.5 text-[10px] font-medium text-slate-400 whitespace-nowrap">
                        <Navigation2 size={8} />
                        {distanceKm} km
                      </div>
                    )}
                    <div className="w-px flex-1 bg-slate-200" />
                  </div>
                )}
              </div>

              {/* Sağ: Aktivite Kartı */}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex-1"
              >
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 md:p-8 hover:shadow-md hover:border-slate-300 transition-all shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-slate-900 text-lg md:text-xl leading-snug">{activity.placeName}</h4>
                      <span className="inline-block mt-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        {activity.period}
                      </span>
                    </div>
                    {/* Fiyat Düzenleyici */}
                    <div className="shrink-0 ml-3">
                      {editingIndex === index ? (
                        <div className="flex items-center gap-1 bg-white border border-blue-200 px-2 py-1 rounded-md">
                          <span className="text-xs text-slate-400 font-semibold">{plan?.currencySymbol}</span>
                          <input
                            type="number" autoFocus
                            className="w-14 outline-none text-xs font-semibold text-slate-800"
                            value={tempCost}
                            onChange={e => setTempCost(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveCost(index)}
                          />
                          <button onClick={() => handleSaveCost(index)} className="text-emerald-600 p-0.5">
                            <Check size={12} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingIndex(index); setTempCost((activity.actualCost ?? activity.estimatedCost).toString()); }}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition-colors ${
                            activity.actualCost !== undefined
                              ? 'bg-blue-50 text-blue-700 border-blue-100'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                          title="Gerçek harcamayı gir"
                        >
                          {plan?.currencySymbol}{activity.actualCost !== undefined ? activity.actualCost : activity.estimatedCost}
                          <Edit2 size={10} className="opacity-40" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">{activity.description}</p>
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="flex items-center gap-1"><MapPin size={9} /> Koordinat doğrulanmış</span>
                    <span className="tabular-nums">{activity.coordinates.lat.toFixed(4)}, {activity.coordinates.lng.toFixed(4)}</span>
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DailyPlanView;
