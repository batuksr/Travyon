import React from 'react';
import { usePlanStore } from '../store/usePlanStore';
import { useOnboardingStore } from '../store/useOnboardingStore';
import { TrendingUp, TrendingDown, PiggyBank } from 'lucide-react';
import { motion } from 'framer-motion';

const BudgetWidget: React.FC = () => {
  const { plan } = usePlanStore();
  const { data } = useOnboardingStore();

  if (!plan) return null;

  const totalBudget = data.budget || 0;
  const currencySymbol = plan.currencySymbol || data.currencySymbol || '₺';

  const spentCost = plan.dailyPlans.reduce((total, day) => {
    return total + day.activities.reduce((sum, act) => {
      return sum + (act.actualCost !== undefined ? act.actualCost : act.estimatedCost);
    }, 0);
  }, 0);

  const remainingBudget = totalBudget - spentCost;
  const isOverBudget = remainingBudget < 0;
  const progressPercent = totalBudget > 0 ? Math.min((spentCost / totalBudget) * 100, 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-8"
    >
      <div className="flex flex-col md:flex-row md:items-center gap-5">
        {/* Sol: Başlık ve Toplam */}
        <div className="flex items-center gap-3.5 md:w-48 shrink-0">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isOverBudget ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
            <PiggyBank size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Bütçe Durumu</p>
            <p className="text-lg font-bold text-slate-900 tabular-nums">
              {currencySymbol}{spentCost.toLocaleString()} <span className="text-sm text-slate-400 font-medium">/ {totalBudget.toLocaleString()}</span>
            </p>
          </div>
        </div>

        {/* Orta: Progress Bar */}
        <div className="flex-1">
          <div className="flex justify-between text-xs font-medium mb-2">
            <span className="text-slate-500">Kullanılan: %{progressPercent.toFixed(0)}</span>
            {isOverBudget ? (
              <span className="text-red-600 flex items-center gap-1"><TrendingUp size={12}/> Bütçe Aşıldı</span>
            ) : (
              <span className="text-emerald-600 flex items-center gap-1"><TrendingDown size={12}/> Uygun</span>
            )}
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`h-full rounded-full transition-colors duration-500 ${
                progressPercent >= 95 ? 'bg-red-500' : progressPercent >= 75 ? 'bg-amber-400' : 'bg-emerald-500'
              }`}
            />
          </div>
        </div>

        {/* Sağ: Kalan */}
        <div className={`px-4 py-2.5 rounded-lg shrink-0 text-center md:w-40 ${isOverBudget ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
          <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70 mb-0.5">
            {isOverBudget ? 'Aşılan Tutar' : 'Kalan Bütçe'}
          </p>
          <p className="text-xl font-bold tabular-nums">
            {currencySymbol}{Math.abs(remainingBudget).toLocaleString()}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default BudgetWidget;
