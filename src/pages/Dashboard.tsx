import React, { useMemo, useEffect, useState } from 'react';
import { usePlanStore } from '../store/usePlanStore';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Navigation,
  Calendar,
  Bus,
  Users,
  Lightbulb,
  Map,
  Plus,
  ChevronDown,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react';
import DailyPlanView from '../components/DailyPlanView';
import MapView from '../components/MapView';
import BudgetWidget from '../components/BudgetWidget';

const Dashboard: React.FC = () => {
  const { plan } = usePlanStore();
  const navigate = useNavigate();

  // Tüm hook'lar koşulsuz, erken return'dan ÖNCE
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [guideOpen, setGuideOpen] = useState(false);
  const [showMobileMap, setShowMobileMap] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    setActiveDayIndex(0);
  }, [plan]);

  const totalActivities = useMemo(
    () => plan?.dailyPlans.reduce((s, d) => s + d.activities.length, 0) ?? 0,
    [plan?.dailyPlans]
  );

  const activeDayActivities = useMemo(
    () => plan?.dailyPlans[activeDayIndex]?.activities ?? [],
    [plan?.dailyPlans, activeDayIndex]
  );

  // Plan yoksa boş ekran
  if (!plan) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-[#187fe7]/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Navigation size={36} className="text-[#187fe7]" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-3">Henüz Plan Yok</h2>
          <p className="text-slate-500 mb-8 leading-relaxed">
            Yapay zeka ile saniyeler içinde kişisel seyahat planınızı oluşturun.
          </p>
          <button
            type="button"
            onClick={() => navigate('/onboarding')}
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#187fe7] hover:bg-[#156bc2] text-white font-bold rounded-xl transition-all shadow-lg shadow-[#187fe7]/25"
          >
            <Plus size={18} />
            Plan Oluştur
          </button>
        </div>
      </div>
    );
  }

  const handleNewPlanClick = () => {
    setShowConfirm(true);
  };

  const handleConfirmNewPlan = () => {
    setShowConfirm(false);
    navigate('/onboarding');
  };

  const activeDay = plan.dailyPlans[activeDayIndex];

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden font-sans">

      {/* ── YENİ PLAN ONAY MODALİ ── */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.18 }}
              className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500 shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Yeni Plan Oluştur?</h3>
                  <p className="text-slate-500 text-xs mt-0.5">Mevcut planın kaybolacak</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed mb-5">
                <strong>{plan.destination}</strong> planın silinecek ve yeni bir plan oluşturma sürecine
                geçilecek. Bu işlem geri alınamaz.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-all"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmNewPlan}
                  className="flex-1 px-4 py-2.5 bg-[#187fe7] hover:bg-[#156bc2] text-white font-semibold rounded-xl text-sm transition-all"
                >
                  Evet, Devam Et
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── KOMPAKT HERO — maks. ~80px yükseklik ── */}
      <div className="relative shrink-0 overflow-hidden border-b border-slate-200">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-800 to-[#187fe7]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_50%,rgba(248,152,29,0.2),transparent_50%)]" />

        <div className="relative px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between gap-6">

            {/* Sol: Geri butonu + Şehir adı */}
            <div className="flex items-center gap-4 min-w-0">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="w-9 h-9 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/15 rounded-xl flex items-center justify-center text-white transition-all shrink-0"
              >
                <ArrowLeft size={16} />
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <div className="w-1.5 h-1.5 bg-[#f8981d] rounded-full animate-pulse" />
                  <span className="text-[10px] font-bold text-[#f8981d] uppercase tracking-widest">
                    AI Planı
                  </span>
                </div>
                <h1 className="text-xl md:text-2xl font-black text-white tracking-tight truncate">
                  {plan.destination}
                </h1>
              </div>
            </div>

            {/* Sağ: Mini istatistik kutusu + Yeni Plan */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="hidden md:flex items-center gap-4 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl">
                <div className="text-center">
                  <p className="text-white font-black text-base leading-none">
                    {plan.dailyPlans.length}
                  </p>
                  <p className="text-[9px] text-white/50 mt-0.5 uppercase tracking-wider">Gün</p>
                </div>
                <div className="w-px h-7 bg-white/15" />
                <div className="text-center">
                  <p className="text-white font-black text-base leading-none">
                    {totalActivities}
                  </p>
                  <p className="text-[9px] text-white/50 mt-0.5 uppercase tracking-wider">Aktivite</p>
                </div>
                <div className="w-px h-7 bg-white/15" />
                <div className="text-center">
                  <p className="text-[#f8981d] font-black text-base leading-none">
                    {plan.currencySymbol}{plan.totalEstimatedCost.toLocaleString()}
                  </p>
                  <p className="text-[9px] text-white/50 mt-0.5 uppercase tracking-wider">Bütçe</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleNewPlanClick}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#f8981d] hover:bg-[#e08518] text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-[#f8981d]/25 hover:-translate-y-px whitespace-nowrap"
              >
                <Plus size={13} />
                Yeni Plan
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── ANA GÖVDE ── */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* SOL PANEL — kaydırılabilir içerik */}
        <div className="flex-1 overflow-y-auto px-6 lg:px-8 py-5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="max-w-4xl mx-auto space-y-5">

            {/* ÖZET BANTI — overallSummary + BudgetWidget */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {plan.overallSummary && (
                <div className="px-5 py-3.5 border-b border-slate-100">
                  <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">
                    <span className="text-[#f8981d] font-black mr-1.5">›</span>
                    {plan.overallSummary}
                  </p>
                </div>
              )}
              <BudgetWidget />
            </div>

            {/* MOBİL HARİTA TOGGLE — lg altında göster */}
            <div className="lg:hidden">
              <button
                type="button"
                onClick={() => setShowMobileMap(prev => !prev)}
                aria-expanded={showMobileMap}
                aria-controls="mobile-map"
                className="w-full flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-all"
              >
                <div className="flex items-center gap-2">
                  <Map size={15} className="text-[#187fe7]" />
                  <span className="text-sm font-bold text-slate-700">
                    Haritayı {showMobileMap ? 'Gizle' : 'Göster'}
                  </span>
                </div>
                <ChevronDown
                  size={14}
                  className={`text-slate-400 transition-transform ${showMobileMap ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Harita hidden ile gizleniyor, DOM'dan kaldırılmıyor → yeniden init yok */}
              <div
                id="mobile-map"
                className={`mt-3 h-64 rounded-2xl overflow-hidden border border-slate-200 ${showMobileMap ? 'block' : 'hidden'}`}
              >
                <MapView activities={activeDayActivities} />
              </div>
            </div>

            {/* ŞEHİR REHBERİ ACCORDION */}
            {plan.cityGuide && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
                <button
                  type="button"
                  onClick={() => setGuideOpen(prev => !prev)}
                  aria-expanded={guideOpen}
                  aria-controls="city-guide-content"
                  className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-all rounded-2xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500">
                      <Lightbulb size={15} />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-sm text-slate-900">Şehir Rehberi & Tüyolar</p>
                      <p className="text-xs text-slate-400">Ulaşım, yerel kültür ve faydalı bilgiler</p>
                    </div>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`text-slate-400 transition-transform duration-200 ${guideOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                <AnimatePresence>
                  {guideOpen && (
                    <motion.div
                      id="city-guide-content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-5 pt-0">
                        <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-2.5">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600">
                              <Bus size={13} />
                            </div>
                            <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">
                              Ulaşım
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed line-clamp-5">
                            {plan.cityGuide.transportationTips}
                          </p>
                        </div>
                        <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-2.5">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-orange-50 text-orange-600">
                              <Users size={13} />
                            </div>
                            <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">
                              Yerel Kültür
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed line-clamp-5">
                            {plan.cityGuide.localCustoms}
                          </p>
                        </div>
                        <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-2.5">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-600">
                              <Lightbulb size={13} />
                            </div>
                            <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">
                              Faydalı Bilgiler
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed line-clamp-5">
                            {plan.cityGuide.generalAdvice}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* GÜN SEKMELERİ */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Calendar size={15} className="text-slate-400" />
                  <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                    Günlük Plan
                  </h2>
                </div>
                <span className="text-xs text-slate-400">{plan.dailyPlans.length} gün</span>
              </div>

              <div
                role="tablist"
                aria-label="Günlük plan sekmeleri"
                className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              >
                {plan.dailyPlans.map((day, index) => (
                  <button
                    key={day.dayNumber}
                    type="button"
                    role="tab"
                    aria-selected={activeDayIndex === index}
                    onClick={() => setActiveDayIndex(index)}
                    className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl transition-all shrink-0 border text-xs font-bold ${
                      activeDayIndex === index
                        ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] ${
                        activeDayIndex === index
                          ? 'bg-[#f8981d] text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {day.dayNumber}
                    </span>
                    <span>{day.date?.slice(5) ?? `Gün ${day.dayNumber}`}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded ${
                        activeDayIndex === index
                          ? 'bg-white/15 text-blue-100'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {day.activities.length}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* AKTİF GÜN PLANI */}
            {activeDay ? (
              <div
                role="tabpanel"
                aria-label={`${activeDay.dayNumber}. gün planı`}
              >
                <DailyPlanView day={activeDay} />
              </div>
            ) : null}

            <div className="h-4" />
          </div>
        </div>

        {/* SAĞ PANEL — Harita, sabit genişlik */}
        <div
          role="region"
          aria-label="Rota haritası"
          className="hidden lg:flex w-[420px] xl:w-[460px] shrink-0 border-l border-slate-200 bg-white flex-col"
        >
          {/* Harita başlık şeridi */}
          <div className="px-4 py-3 border-b border-slate-100 shrink-0 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-[#187fe7]/10 rounded-md flex items-center justify-center">
                  <Map size={11} className="text-[#187fe7]" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Rota Haritası</p>
                  <p className="text-[10px] text-slate-400">
                    {plan.dailyPlans[activeDayIndex]?.dayNumber}. Gün
                    {' · '}
                    {plan.dailyPlans[activeDayIndex]?.activities.length} mekan
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 rounded-md">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                <span className="text-[9px] text-emerald-700 font-bold uppercase tracking-wider">
                  Optimize
                </span>
              </div>
            </div>
          </div>

          {/* Harita — kalan tüm yükseklik */}
          <div className="flex-1 min-h-0">
            <MapView activities={activeDayActivities} />
          </div>

          {/* Alt legend şeridi */}
          <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50 shrink-0">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400">Mekanları sırayla ziyaret edin</span>
              <span className="text-[#187fe7] font-bold">TSP Optimize</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
