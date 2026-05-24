import React, { useState, useEffect, useCallback } from 'react';
import { X, Loader2, MapPin, Wallet, ChevronLeft, ChevronRight } from 'lucide-react';
import type { TravelPlanResponse } from '../services/aiService';
import type { PublicPlan } from '../services/socialService';
import { getPublicPlanDetails } from '../services/socialService';

/* ── Period colours (read-only, same palette as DailyPlanView) ── */
const PERIOD_COLOR: Record<string, { border: string; bg: string; text: string }> = {
  'Sabah':          { border: 'border-amber-300',  bg: 'bg-amber-50',  text: 'text-amber-600'  },
  'Öğle':           { border: 'border-orange-300', bg: 'bg-orange-50', text: 'text-orange-600' },
  'Öğleden Sonra':  { border: 'border-blue-300',   bg: 'bg-blue-50',   text: 'text-blue-600'   },
  'Akşam':          { border: 'border-purple-300', bg: 'bg-purple-50', text: 'text-purple-600' },
  'Gece':           { border: 'border-slate-400',  bg: 'bg-slate-100', text: 'text-slate-600'  },
};
const periodColor = (p: string) =>
  PERIOD_COLOR[p] ?? { border: 'border-slate-300', bg: 'bg-slate-50', text: 'text-slate-500' };

interface Props {
  plan: PublicPlan;
  onClose: () => void;
}

const SharedPlanModal: React.FC<Props> = ({ plan, onClose }) => {
  const [details, setDetails]     = useState<TravelPlanResponse | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(false);
  const [activeDay, setActiveDay] = useState(0);

  /* Fetch full plan data */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    getPublicPlanDetails(plan.id)
      .then(data => {
        if (cancelled) return;
        if (data) { setDetails(data); setActiveDay(0); }
        else       { setError(true); }
      })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [plan.id]);

  /* Close on Escape */
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);
  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  /* User initials fallback */
  const initials = plan.userDisplayName
    .split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase();

  const day = details?.dailyPlans[activeDay];

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Sheet / Modal */}
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[85vh] overflow-hidden">

        {/* ── Header ── */}
        <div className="px-5 pt-5 pb-4 border-b border-slate-100 flex-shrink-0">
          {/* Drag handle (mobile) */}
          <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4 sm:hidden" />

          <div className="flex items-start justify-between gap-3">
            {/* User + destination info */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#f8981d] to-[#e08518] flex items-center justify-center overflow-hidden flex-shrink-0">
                {plan.userPhotoURL ? (
                  <img src={plan.userPhotoURL} className="w-10 h-10 rounded-full object-cover" alt="" referrerPolicy="no-referrer" />
                ) : (
                  <span className="text-white text-xs font-black select-none">{initials}</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-400 font-medium">{plan.userDisplayName} tarafından</p>
                <h2 className="text-lg font-black text-slate-900 leading-tight truncate">{plan.destination.split(',')[0]}</h2>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="flex items-center gap-0.5 text-[11px] text-slate-400 font-medium">
                    <MapPin size={10} /> {plan.dailyPlanCount} gün
                  </span>
                  <span className="flex items-center gap-0.5 text-[11px] text-slate-400 font-medium">
                    <Wallet size={10} /> {plan.currencySymbol}{plan.budget.toLocaleString('tr-TR')}
                  </span>
                  {details?.overallSummary && (
                    <span className="text-[11px] text-slate-500 italic truncate max-w-[180px]" title={details.overallSummary}>
                      "{details.overallSummary.slice(0, 60)}{details.overallSummary.length > 60 ? '…' : ''}"
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Close */}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors flex-shrink-0 mt-0.5"
              aria-label="Kapat"
            >
              <X size={15} className="text-slate-600" />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center gap-2 py-12">
            <Loader2 size={18} className="animate-spin text-[#f8981d]" />
            <span className="text-sm text-slate-500 font-medium">Plan yükleniyor…</span>
          </div>
        ) : error || !details ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 py-12 px-6 text-center">
            <p className="text-3xl">😕</p>
            <p className="text-sm font-bold text-slate-700">Plan detayı yüklenemedi</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Bu plan eski sürümde paylaşılmış olabilir. Detay bilgisi mevcut değil.
            </p>
          </div>
        ) : (
          <>
            {/* Day tabs */}
            {details.dailyPlans.length > 1 && (
              <div className="px-5 pt-3 pb-1 flex-shrink-0">
                <div className="flex items-center gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {details.dailyPlans.map((d, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveDay(i)}
                      className={`flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                        activeDay === i
                          ? 'bg-[#f8981d] text-white shadow-sm'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {d.date
                        ? new Date(d.date + 'T00:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
                        : `Gün ${d.dayNumber}`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Activities */}
            {day && (
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-0">
                {/* Day summary */}
                {day.daySummary && (
                  <p className="text-xs text-slate-400 italic mb-4 leading-relaxed">
                    {day.daySummary}
                  </p>
                )}

                {day.activities.map((act, idx) => {
                  const isLast = idx === day.activities.length - 1;
                  const colors = periodColor(act.period);
                  const prevPeriod = idx > 0 ? day.activities[idx - 1].period : null;
                  const showPeriodLabel = act.period !== prevPeriod;

                  return (
                    <div key={idx}>
                      {showPeriodLabel && (
                        <p className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ml-9 ${idx > 0 ? 'mt-4' : ''} ${colors.text}`}>
                          {act.period}
                        </p>
                      )}

                      <div className="flex gap-3">
                        {/* Circle + line */}
                        <div className="flex flex-col items-center shrink-0 w-6">
                          <div className={`w-6 h-6 rounded-full border-2 ${colors.border} ${colors.bg} flex items-center justify-center shrink-0`}>
                            <span className={`text-[10px] font-bold ${colors.text}`}>{idx + 1}</span>
                          </div>
                          {!isLast && (
                            <div className="w-px flex-1 min-h-[20px] bg-slate-200 mt-0.5" />
                          )}
                        </div>

                        {/* Content */}
                        <div className={`flex-1 min-w-0 ${isLast ? 'pb-1' : 'pb-3'}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-semibold text-slate-900 leading-tight">
                                {act.placeName}
                              </h3>
                              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                                {act.description}
                              </p>
                            </div>
                            {/* Cost badge */}
                            <span className="flex-shrink-0 text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                              {plan.currencySymbol}{act.estimatedCost.toLocaleString('tr-TR')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Day total */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">Gün toplam (tahmini)</span>
                  <span className="text-sm font-bold text-slate-700">
                    {plan.currencySymbol}{day.totalEstimatedCost.toLocaleString('tr-TR')}
                  </span>
                </div>
              </div>
            )}

            {/* Day navigation footer */}
            {details.dailyPlans.length > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 flex-shrink-0 bg-white">
                <button
                  onClick={() => setActiveDay(d => Math.max(0, d - 1))}
                  disabled={activeDay === 0}
                  className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={14} /> Önceki
                </button>
                <span className="text-[11px] text-slate-400 font-medium">
                  {activeDay + 1} / {details.dailyPlans.length}
                </span>
                <button
                  onClick={() => setActiveDay(d => Math.min(details.dailyPlans.length - 1, d + 1))}
                  disabled={activeDay === details.dailyPlans.length - 1}
                  className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Sonraki <ChevronRight size={14} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SharedPlanModal;
