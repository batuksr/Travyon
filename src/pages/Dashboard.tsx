import React, { useMemo, useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { usePlanStore } from '../store/usePlanStore';
import { useNavigate } from 'react-router-dom';
import {
  Navigation,
  Bus,
  Users,
  Lightbulb,
  Map,
  Plus,
  AlertTriangle,
  ArrowLeft,
  X,
} from 'lucide-react';
import DailyPlanView from '../components/DailyPlanView';
import MapView from '../components/MapView';
import PlaceDetailsPanel from '../components/PlaceDetailsPanel';

const Dashboard: React.FC = () => {
  const { plan } = usePlanStore();
  const navigate = useNavigate();

  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [guideOpen, setGuideOpen] = useState(false);
  const [showMobileMap, setShowMobileMap] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<{
    placeName: string;
    lat: number;
    lng: number;
  } | null>(null);

  useEffect(() => {
    setActiveDayIndex(0);
  }, [plan]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const totalActivities = useMemo(
    () => plan?.dailyPlans.reduce((s, d) => s + d.activities.length, 0) ?? 0,
    [plan?.dailyPlans]
  );

  const activeDayActivities = useMemo(
    () => plan?.dailyPlans[activeDayIndex]?.activities ?? [],
    [plan?.dailyPlans, activeDayIndex]
  );

  if (!plan) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 bg-[#187fe7]/10 rounded-lg flex items-center justify-center mx-auto mb-5">
            <Navigation size={24} className="text-[#187fe7]" />
          </div>
          <h2 className="text-base font-bold text-slate-900 mb-2">Henüz Plan Yok</h2>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">
            Yapay zeka ile saniyeler içinde kişisel seyahat planınızı oluşturun.
          </p>
          <button
            type="button"
            onClick={() => navigate('/onboarding')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#187fe7] hover:bg-[#156bc2] text-white font-semibold rounded-lg text-sm transition-all"
          >
            <Plus size={14} />
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
    <div className="h-screen flex flex-col bg-white overflow-hidden">

      {/* ── ONAY MODALİ ── */}
      {showConfirm && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl p-5 max-w-sm w-full"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center text-amber-500 shrink-0">
                <AlertTriangle size={16} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Yeni Plan Oluştur?</h3>
                <p className="text-slate-500 text-xs mt-0.5">Mevcut planın kaybolacak</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              <strong>{plan.destination}</strong> planın silinecek ve yeni bir plan oluşturma sürecine geçilecek. Bu işlem geri alınamaz.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-all"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleConfirmNewPlan}
                className="flex-1 px-3 py-2 bg-[#187fe7] hover:bg-[#156bc2] text-white font-semibold rounded-lg text-xs transition-all"
              >
                Evet, Devam Et
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ŞEHİR REHBERİ DRAWER ── */}
      {guideOpen && plan.cityGuide && (
        <div className="fixed inset-0 z-40 flex">
          <div
            className="flex-1 bg-black/30"
            onClick={() => setGuideOpen(false)}
          />
          <div className="w-80 bg-white border-l border-slate-200 flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 shrink-0">
              <h2 className="text-sm font-bold text-slate-900">Şehir Rehberi</h2>
              <button
                type="button"
                onClick={() => setGuideOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Bus size={13} className="text-blue-500" />
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                    Ulaşım
                  </h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {plan.cityGuide.transportationTips}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Users size={13} className="text-orange-500" />
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                    Yerel Kültür
                  </h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {plan.cityGuide.localCustoms}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb size={13} className="text-emerald-500" />
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                    Faydalı Bilgiler
                  </h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {plan.cityGuide.generalAdvice}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MOBİL HARİTA MODALİ ── */}
      {showMobileMap && (
        <div className="lg:hidden fixed inset-0 z-50 bg-white flex flex-col">
          <div className="h-12 flex items-center justify-between px-4 border-b border-slate-200 shrink-0">
            <span className="font-semibold text-sm text-slate-900">Rota Haritası</span>
            <button
              type="button"
              onClick={() => setShowMobileMap(false)}
              className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 min-h-0">
            <MapView activities={activeDayActivities} />
          </div>
        </div>
      )}

      {/* ── ÜST BAR — ~56px ── */}
      <div className="shrink-0 border-b border-slate-200 px-5 py-3 flex items-center justify-between bg-white">

        {/* Sol: Geri + Şehir adı */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors shrink-0"
          >
            <ArrowLeft size={15} />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 truncate">
                {plan.destination}
              </h1>
              <span className="text-xs text-slate-400 font-medium shrink-0">
                • {plan.dailyPlans.length} gün
              </span>
            </div>
          </div>
        </div>

        {/* Orta: Plan / Rehber sekmeleri */}
        <div className="hidden md:flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
          <button
            type="button"
            className="px-3 py-1 text-xs font-semibold bg-white rounded-md shadow-sm text-slate-900"
          >
            Plan
          </button>
          <button
            type="button"
            onClick={() => setGuideOpen(true)}
            className="px-3 py-1 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors rounded-md"
          >
            Rehber
          </button>
        </div>

        {/* Sağ: Toplam maliyet + Yeni Plan */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-1.5 text-xs">
            <span className="text-slate-400">Toplam:</span>
            <span className="font-bold text-slate-900">
              {plan.currencySymbol}{plan.totalEstimatedCost.toLocaleString()}
            </span>
          </div>
          <button
            type="button"
            onClick={handleNewPlanClick}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-xs transition-all"
          >
            <Plus size={12} />
            Yeni Plan
          </button>
        </div>
      </div>

      {/* ── ANA İÇERİK ── */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* SOL PANEL — Plan listesi */}
        <div className="w-full lg:w-[45%] xl:w-[42%] flex flex-col border-r border-slate-200 bg-white">

          {/* Gün sekmeleri */}
          <div className="shrink-0 border-b border-slate-200 px-5 py-2.5 bg-slate-50/50">
            <div
              role="tablist"
              aria-label="Günlük plan sekmeleri"
              className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
              {plan.dailyPlans.map((day, index) => (
                <button
                  key={day.dayNumber}
                  type="button"
                  role="tab"
                  aria-selected={activeDayIndex === index}
                  onClick={() => setActiveDayIndex(index)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all shrink-0 whitespace-nowrap ${
                    activeDayIndex === index
                      ? 'bg-[#187fe7] text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold ${
                    activeDayIndex === index
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {day.dayNumber}
                  </span>
                  {day.date?.slice(5) ?? `Gün ${day.dayNumber}`}
                  <span className={`text-[10px] font-normal ${
                    activeDayIndex === index ? 'text-blue-100' : 'text-slate-400'
                  }`}>
                    ({day.activities.length})
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Gün özeti şeridi */}
          {activeDay && (
            <div className="shrink-0 px-5 py-3 border-b border-slate-100 bg-white">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 mb-0.5">{activeDay.date}</p>
                  <p className="text-sm font-semibold text-slate-700 truncate">
                    {activeDay.daySummary}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-[10px] text-slate-400">Tahmini</p>
                  <p className="text-sm font-bold text-slate-900">
                    {plan.currencySymbol}{activeDay.totalEstimatedCost.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Aktivite listesi — scroll edilebilir */}
          <div
            role="tabpanel"
            aria-label={activeDay ? `${activeDay.dayNumber}. gün planı` : 'Plan'}
            className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            {activeDay ? <DailyPlanView day={activeDay} onActivityClick={setSelectedPlace} /> : null}
          </div>
        </div>

        {/* SAĞ PANEL — Harita */}
        <div
          role="region"
          aria-label="Rota haritası"
          className="hidden lg:flex flex-1 relative"
        >
          <MapView activities={activeDayActivities} onActivityClick={setSelectedPlace} />

          {/* Mini optimize badge */}
          <div className="absolute top-3 right-3 bg-white border border-slate-200 rounded-lg shadow-sm px-3 py-2 flex items-center gap-2 z-[5]">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            <span className="text-xs font-semibold text-slate-700">
              {activeDayActivities.length} mekan optimize
            </span>
          </div>
        </div>
      </div>

      {/* Mobil harita FAB */}
      <button
        type="button"
        onClick={() => setShowMobileMap(true)}
        aria-label="Haritayı aç"
        className="lg:hidden fixed bottom-4 right-4 z-30 w-12 h-12 bg-[#187fe7] text-white rounded-full shadow-lg flex items-center justify-center hover:bg-[#156bc2] transition-colors"
      >
        <Map size={18} />
      </button>

      {/* Mekan detay paneli */}
      <AnimatePresence>
        {selectedPlace && (
          <PlaceDetailsPanel
            placeName={selectedPlace.placeName}
            lat={selectedPlace.lat}
            lng={selectedPlace.lng}
            onClose={() => setSelectedPlace(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
