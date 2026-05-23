import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Wallet, ArrowRight, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { SAMPLE_PLAN_DATA } from '../data/samplePlans';
import type { TravelPlanResponse } from '../services/aiService';

interface Props {
  planId: string | null;
  onClose: () => void;
  cityMeta: {
    city: string;
    country: string;
    flag: string;
    days: number;
    budget: number;
    currency: string;
    image: string;
  } | null;
}

const PERIOD_COLORS: Record<string, { dot: string; label: string; text: string }> = {
  'Sabah':          { dot: 'bg-amber-400',  label: 'bg-amber-50 text-amber-700 border-amber-200',  text: 'text-amber-600' },
  'Öğle':           { dot: 'bg-orange-400', label: 'bg-orange-50 text-orange-700 border-orange-200', text: 'text-orange-600' },
  'Öğleden Sonra':  { dot: 'bg-blue-400',   label: 'bg-blue-50 text-blue-700 border-blue-200',    text: 'text-blue-600' },
  'Akşam':          { dot: 'bg-purple-400', label: 'bg-purple-50 text-purple-700 border-purple-200', text: 'text-purple-600' },
  'Gece':           { dot: 'bg-slate-500',  label: 'bg-slate-100 text-slate-600 border-slate-300',  text: 'text-slate-500' },
};

const getPeriodColors = (period: string) =>
  PERIOD_COLORS[period] ?? { dot: 'bg-slate-300', label: 'bg-slate-50 text-slate-500 border-slate-200', text: 'text-slate-500' };

const SamplePlanModal: React.FC<Props> = ({ planId, onClose, cityMeta }) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeDay, setActiveDay] = useState(0);

  const plan: TravelPlanResponse | null = planId ? SAMPLE_PLAN_DATA[planId] ?? null : null;

  useEffect(() => {
    setActiveDay(0);
  }, [planId]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    if (planId) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [planId]);

  const handleCTA = () => {
    onClose();
    navigate(user ? '/onboarding' : '/register');
  };

  if (!plan || !cityMeta) return null;

  const currentDay = plan.dailyPlans[activeDay];

  return (
    <AnimatePresence>
      {planId && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
              initial={{ scale: 0.94, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 16 }}
              transition={{ type: 'spring', damping: 28, stiffness: 340 }}
              onClick={(e) => e.stopPropagation()}
            >

              {/* Header image */}
              <div className="relative h-44 shrink-0 overflow-hidden">
                <img
                  src={cityMeta.image}
                  alt={cityMeta.city}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                {/* Close */}
                <button
                  type="button"
                  onClick={onClose}
                  className="absolute top-3 right-3 w-8 h-8 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-colors"
                >
                  <X size={15} />
                </button>

                {/* City info */}
                <div className="absolute bottom-3 left-4">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{cityMeta.flag}</span>
                    <div>
                      <h2 className="text-white font-bold text-xl leading-tight">{cityMeta.city}</h2>
                      <p className="text-white/70 text-xs font-medium">{cityMeta.country}</p>
                    </div>
                  </div>
                </div>

                {/* Meta badges */}
                <div className="absolute bottom-3 right-4 flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full">
                    <Calendar size={11} className="text-white/80" />
                    <span className="text-white text-xs font-semibold">{cityMeta.days} Gün</span>
                  </div>
                  <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full">
                    <Wallet size={11} className="text-[#f8981d]" />
                    <span className="text-white text-xs font-semibold">{cityMeta.currency}{cityMeta.budget.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Summary strip */}
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 shrink-0">
                <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{plan.overallSummary}</p>
              </div>

              {/* Day tabs */}
              <div className="flex items-center gap-1 px-5 py-2.5 border-b border-slate-100 overflow-x-auto [&::-webkit-scrollbar]:hidden shrink-0">
                {plan.dailyPlans.map((day, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveDay(i)}
                    className={`shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeDay === i
                        ? 'bg-[#187fe7] text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {day.date}
                  </button>
                ))}
              </div>

              {/* Day content */}
              <div className="flex-1 overflow-y-auto px-5 py-4">

                {/* Day summary */}
                <p className="text-xs font-semibold text-slate-500 mb-4 flex items-center gap-1.5">
                  <MapPin size={11} className="text-[#187fe7]" />
                  {currentDay.daySummary}
                </p>

                {/* Activities timeline */}
                <div className="space-y-0">
                  {currentDay.activities.map((activity, idx) => {
                    const isLast = idx === currentDay.activities.length - 1;
                    const colors = getPeriodColors(activity.period);
                    const prevPeriod = idx > 0 ? currentDay.activities[idx - 1].period : null;
                    const showPeriodLabel = activity.period !== prevPeriod;

                    return (
                      <div key={idx}>
                        {showPeriodLabel && (
                          <p className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ml-9 ${idx > 0 ? 'mt-3' : ''} ${colors.text}`}>
                            {activity.period}
                          </p>
                        )}
                        <div className="flex gap-3">
                          {/* Circle + line */}
                          <div className="flex flex-col items-center shrink-0 w-6">
                            <div className={`w-5 h-5 rounded-full ${colors.dot} flex items-center justify-center shrink-0`}>
                              <span className="text-[9px] font-bold text-white">{idx + 1}</span>
                            </div>
                            {!isLast && <div className="w-px flex-1 min-h-[16px] bg-slate-200 mt-0.5" />}
                          </div>

                          {/* Content */}
                          <div className={`flex-1 min-w-0 ${isLast ? 'pb-1' : 'pb-3'}`}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-semibold text-slate-900 leading-tight">{activity.placeName}</h3>
                                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{activity.description}</p>
                              </div>
                              <span className="shrink-0 text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md mt-0.5">
                                {plan.currencySymbol}{activity.estimatedCost}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Day cost */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500">Günlük tahmini toplam</span>
                  <span className="text-sm font-bold text-slate-800">{plan.currencySymbol}{currentDay.totalEstimatedCost}</span>
                </div>

                {/* City guide tip */}
                {plan.cityGuide?.generalAdvice && (
                  <div className="mt-3 p-3 bg-[#187fe7]/5 rounded-xl border border-[#187fe7]/15">
                    <p className="text-[11px] text-[#187fe7] font-semibold mb-0.5">Yerel İpucu</p>
                    <p className="text-[11px] text-slate-600 leading-relaxed">{plan.cityGuide.generalAdvice}</p>
                  </div>
                )}

                {/* Navigation between days */}
                <div className="flex items-center justify-between mt-4">
                  <button
                    type="button"
                    onClick={() => setActiveDay((d) => Math.max(0, d - 1))}
                    disabled={activeDay === 0}
                    className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={14} />
                    Önceki Gün
                  </button>
                  <span className="text-xs text-slate-400">{activeDay + 1} / {plan.dailyPlans.length}</span>
                  <button
                    type="button"
                    onClick={() => setActiveDay((d) => Math.min(plan.dailyPlans.length - 1, d + 1))}
                    disabled={activeDay === plan.dailyPlans.length - 1}
                    className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    Sonraki Gün
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              {/* Footer CTA */}
              <div className="shrink-0 px-5 py-4 border-t border-slate-100 bg-slate-50">
                <button
                  type="button"
                  onClick={handleCTA}
                  className="group w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#187fe7] hover:bg-[#156bc2] text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-[#187fe7]/25 hover:shadow-[#187fe7]/40"
                >
                  Bu planın benzerini oluştur
                  <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
                <p className="text-center text-[11px] text-slate-400 mt-2">Ücretsiz — kredi kartı gerekmez</p>
              </div>

            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SamplePlanModal;
