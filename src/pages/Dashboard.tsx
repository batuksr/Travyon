import React, { useMemo, useEffect, useState, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { usePlanStore } from '../store/usePlanStore';
import { useOnboardingStore } from '../store/useOnboardingStore';
import { useSavedPlansStore, useUserPlans } from '../store/useSavedPlansStore';
import { useNavigate } from 'react-router-dom';
import {
  Bus,
  Users,
  Lightbulb,
  Map,
  ArrowLeft,
  X,
  Bookmark,
  BookmarkCheck,
  Sun,
  Moon,
  Cloud,
  Download,
  Wallet,
  Link2,
  Check,
} from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore';
import { toggleWithCircle } from '../utils/themeTransition';
import DailyPlanView from '../components/DailyPlanView';
import MapView from '../components/MapView';
import PlaceDetailsPanel from '../components/PlaceDetailsPanel';
import WeatherView from '../components/WeatherView';
import { exportPlanAsPDF } from '../utils/exportPDF';
import { sharePlanAsLink } from '../services/socialService';
import { useAuthStore } from '../store/useAuthStore';
import { isEmailVerified, resendVerification } from '../utils/authUtils';

const Dashboard: React.FC = () => {
  const { plan, savedPlanId, setSavedPlanId } = usePlanStore();
  const { user } = useAuthStore();
  const { addPlan, updatePlan } = useSavedPlansStore();
  const savedPlans = useUserPlans();
  const { data: currentOnboardingData } = useOnboardingStore();

  // Kaydedilmiş plan görüntüleniyorsa onun onboardingData'sını kullan
  // (farklı planların otel koordinatlarının birbirini ezmemesi için)
  const onboardingData = savedPlanId
    ? (savedPlans.find(p => p.id === savedPlanId)?.onboardingData ?? currentOnboardingData)
    : currentOnboardingData;
  const navigate = useNavigate();
  const { dark, toggle: toggleTheme } = useThemeStore();

  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [guideOpen, setGuideOpen]     = useState(false);
  const [weatherOpen, setWeatherOpen] = useState(false);
  const [showMobileMap, setShowMobileMap] = useState(false);
  const [showExitModal, setShowExitModal]   = useState(false);
  const [pendingNavTarget, setPendingNavTarget] = useState<string | null>(null);
  const [justSaved, setJustSaved]           = useState(false);
  const [linkCopied, setLinkCopied]         = useState(false);
  const hasSaved = useRef(false);
  const [selectedPlace, setSelectedPlace] = useState<{
    placeName: string;
    lat: number;
    lng: number;
  } | null>(null);

  /* ── Resize / collapse ── */
  const [leftWidthPct, setLeftWidthPct] = useState(42);
  const containerRef   = useRef<HTMLDivElement>(null);
  const dragStartX     = useRef(0);
  const dragStartWidth = useRef(42);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragStartX.current     = e.clientX;
    dragStartWidth.current = leftWidthPct;

    const onMove = (ev: MouseEvent) => {
      if (!containerRef.current) return;
      const totalW = containerRef.current.offsetWidth;
      const delta  = ev.clientX - dragStartX.current;
      const newPct = Math.min(78, Math.max(22, dragStartWidth.current + (delta / totalW) * 100));
      setLeftWidthPct(newPct);
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [leftWidthPct]);

  // Sadece gerçekten farklı bir plan yüklenince gün 0'a sıfırla
  // plan referansı değil, içeriği değişince (destination + gün sayısı)
  const planKey = plan ? `${plan.destination}__${plan.dailyPlans.length}` : null;
  useEffect(() => {
    setActiveDayIndex(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planKey]);

  /* ── Browser back button → intercept ── */
  useEffect(() => {
    // Geçmişe ekstra bir entry koy — geri basılınca buraya döner
    window.history.pushState(null, '', window.location.pathname);

    const handlePopState = () => {
      // Geri navigasyonu engelle, modal aç
      window.history.pushState(null, '', window.location.pathname);
      setPendingNavTarget('/saved-plans');
      setShowExitModal(true);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);



  const activeDayActivities = useMemo(
    () => plan?.dailyPlans[activeDayIndex]?.activities ?? [],
    [plan?.dailyPlans, activeDayIndex]
  );

  /* ── Bütçe takibi hesaplamaları ── */
  const budgetStats = useMemo(() => {
    if (!plan) return null;
    const totalBudget  = onboardingData.budget;
    const allActs      = plan.dailyPlans.flatMap(d => d.activities);
    const enteredCount = allActs.filter(a => a.actualCost !== undefined).length;
    const actualSpent  = allActs
      .filter(a => a.actualCost !== undefined)
      .reduce((s, a) => s + (a.actualCost ?? 0), 0);
    const pct       = totalBudget > 0 ? Math.min(100, (actualSpent / totalBudget) * 100) : 0;
    const remaining = totalBudget - actualSpent;
    return { totalBudget, actualSpent, enteredCount, pct, remaining };
  }, [plan, onboardingData.budget]);

  const dayBudgetStats = useMemo(() => {
    const acts         = plan?.dailyPlans[activeDayIndex]?.activities ?? [];
    const enteredCount = acts.filter(a => a.actualCost !== undefined).length;
    const actualSpent  = acts
      .filter(a => a.actualCost !== undefined)
      .reduce((s, a) => s + (a.actualCost ?? 0), 0);
    const estimated    = acts.reduce((s, a) => s + a.estimatedCost, 0);
    return { enteredCount, actualSpent, estimated };
  }, [plan, activeDayIndex]);

  useEffect(() => {
    if (!plan) {
      navigate('/hub', { replace: true });
    }
  }, [plan, navigate]);

  if (!plan) return null;

  // Otel markeri — rezervasyon var ve koordinatlar girilmişse
  const hotelMarker =
    onboardingData.hasReservation &&
    onboardingData.accommodationLat &&
    onboardingData.accommodationLng
      ? {
          lat:  onboardingData.accommodationLat,
          lng:  onboardingData.accommodationLng,
          name: onboardingData.accommodationAddress || 'Konaklama',
        }
      : null;

  const handleSavePlan = () => {
    if (!plan) return;
    if (savedPlanId) {
      updatePlan(savedPlanId, plan, onboardingData);
    } else {
      const newId = addPlan(plan, onboardingData);
      setSavedPlanId(newId);
    }
    hasSaved.current = true;
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2500);
  };

  const handleShareLink = async () => {
    if (!plan || !user || !savedPlanId) return;
    // E-posta doğrulama — link paylaşmak için zorunlu
    if (!(await isEmailVerified())) {
      resendVerification().catch(() => {});
      alert('Link paylaşmak için önce e-postanı doğrulamalısın. Doğrulama maili (tekrar) gönderildi — gelen kutunu ve Spam klasörünü kontrol et.');
      return;
    }
    try {
      await sharePlanAsLink(savedPlanId, plan, onboardingData, {
        uid: user.uid, displayName: user.displayName, photoURL: user.photoURL,
      });
      const url = `${window.location.origin}/plan/${savedPlanId}`;
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    } catch { /* sessiz hata */ }
  };

  /* Exit modal aksiyonları */
  const handleSaveAndExit = () => {
    handleSavePlan();
    setShowExitModal(false);
    navigate(pendingNavTarget ?? '/hub');
  };

  const handleExitWithoutSave = () => {
    hasSaved.current = true; // blocker'ı geç
    setShowExitModal(false);
    navigate(pendingNavTarget ?? '/hub');
  };

  const handleBackClick = () => {
    setPendingNavTarget('/saved-plans');
    setShowExitModal(true);
  };

  const activeDay = plan.dailyPlans[activeDayIndex];

  return (
  <>
    <div className="h-screen flex flex-col bg-[#f5f0e8] dark:bg-slate-900 overflow-hidden">


      {/* ── ÇIKIŞ ONAY MODALİ ── */}
      {showExitModal && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowExitModal(false)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-slate-200 dark:border-slate-700"
            onClick={e => e.stopPropagation()}
          >
            {/* İkon + başlık */}
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-14 h-14 bg-[#f8981d]/10 rounded-2xl flex items-center justify-center mb-4">
                <Bookmark size={26} className="text-[#f8981d]" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Planı kaydetmek ister misiniz?
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                {plan?.destination} planınız kaydedilmedi. Çıkmadan önce kaydetmek ister misiniz?
              </p>
            </div>

            {/* Butonlar */}
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleSaveAndExit}
                className="w-full py-2.5 bg-[#f8981d] hover:bg-[#e08518] text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#f8981d]/20"
              >
                <BookmarkCheck size={15} />
                Kaydet ve Çık
              </button>
              <button
                type="button"
                onClick={handleExitWithoutSave}
                className="w-full py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-sm transition-all"
              >
                Kaydetmeden Çık
              </button>
              <button
                type="button"
                onClick={() => setShowExitModal(false)}
                className="w-full py-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 font-medium text-xs transition-colors"
              >
                Plana Geri Dön
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ŞEHİR REHBERİ DRAWER ── */}
      {guideOpen && plan.cityGuide && (
        <div className="fixed inset-0 z-40 flex">
          <div
            className="hidden sm:flex flex-1 bg-black/30"
            onClick={() => setGuideOpen(false)}
          />
          <div className="w-full sm:w-80 bg-white border-l border-slate-200 flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 shrink-0">
              <h2 className="text-sm font-bold text-slate-900">Şehir Rehberi</h2>
              <button
                type="button"
                onClick={() => setGuideOpen(false)}
                className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"
              >
                <X size={16} />
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

      {/* ── HAVA DURUMU DRAWER ── */}
      {weatherOpen && (
        <WeatherView
          plan={plan}
          onboardingData={onboardingData}
          onClose={() => setWeatherOpen(false)}
        />
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
            <MapView activities={activeDayActivities} hotel={hotelMarker} />
          </div>
        </div>
      )}

      {/* ── ÜST BAR ── */}
      <div className="shrink-0 border-b border-slate-200 dark:border-slate-700 px-3 sm:px-5 py-2.5 sm:py-3 flex items-center gap-2 bg-white dark:bg-slate-800 relative">

        {/* Geri butonu */}
        <button
          type="button"
          onClick={handleBackClick}
          className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors shrink-0"
        >
          <ArrowLeft size={15} />
        </button>

        {/* Şehir adı */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <h1 className="text-sm font-bold text-slate-900 dark:text-white truncate">
            {plan.destination}
          </h1>
          <span className="text-xs text-slate-400 font-medium shrink-0 hidden sm:inline">
            • {plan.dailyPlans.length} gün
          </span>
        </div>

        {/* Orta: Plan / Rehber / Hava sekmeleri — tam ortada */}
        <div className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-700 p-0.5 rounded-lg absolute left-1/2 -translate-x-1/2">
          <button
            type="button"
            className="px-3 py-1 text-xs font-semibold bg-white dark:bg-slate-600 rounded-md shadow-sm text-slate-900 dark:text-white"
          >
            Plan
          </button>
          <button
            type="button"
            onClick={() => { setWeatherOpen(false); setGuideOpen(true); }}
            className="px-3 py-1 text-xs font-semibold text-slate-500 dark:text-slate-300 hover:text-slate-700 dark:hover:text-white transition-colors rounded-md"
          >
            Rehber
          </button>
          <button
            type="button"
            onClick={() => { setGuideOpen(false); setWeatherOpen(true); }}
            className="flex items-center gap-1 px-3 py-1 text-xs font-semibold text-slate-500 dark:text-slate-300 hover:text-slate-700 dark:hover:text-white transition-colors rounded-md"
          >
            <Cloud size={11} />
            Hava
          </button>
        </div>

        {/* Sağ: aksiyonlar */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">

          {/* Toplam maliyet — sadece md+ */}
          <div className="hidden md:flex items-center gap-1.5 text-xs">
            <span className="text-slate-400">Toplam:</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {plan.currencySymbol}{plan.totalEstimatedCost.toLocaleString()}
            </span>
          </div>

          {/* Mobil sekme butonları (Rehber + Hava) — sadece sm ve altında */}
          <button
            type="button"
            onClick={() => { setWeatherOpen(false); setGuideOpen(g => !g); }}
            className="md:hidden w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors"
            title="Şehir Rehberi"
          >
            <Map size={14} />
          </button>
          <button
            type="button"
            onClick={() => { setGuideOpen(false); setWeatherOpen(w => !w); }}
            className="md:hidden w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors"
            title="Hava Durumu"
          >
            <Cloud size={14} />
          </button>

          {/* Kaydet */}
          <button
            type="button"
            onClick={handleSavePlan}
            disabled={justSaved}
            className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 font-semibold rounded-lg text-xs transition-all ${
              justSaved
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                : 'bg-white dark:bg-slate-700 border border-[#f8981d]/40 text-[#f8981d] hover:bg-[#f8981d]/5 hover:border-[#f8981d]'
            }`}
          >
            {justSaved ? <BookmarkCheck size={12} /> : <Bookmark size={12} />}
            <span className="hidden sm:inline">{justSaved ? 'Kaydedildi' : 'Planı Kaydet'}</span>
          </button>

          {/* Link Paylaş — sadece kayıtlı planlarda */}
          {savedPlanId && (
            <button
              type="button"
              onClick={handleShareLink}
              disabled={linkCopied}
              className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 font-semibold rounded-lg text-xs transition-all ${
                linkCopied
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                  : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-blue-50 hover:border-[#187fe7]/40 hover:text-[#187fe7]'
              }`}
              title="Plan linkini kopyala"
            >
              {linkCopied ? <Check size={12} /> : <Link2 size={12} />}
              <span className="hidden sm:inline">{linkCopied ? 'Kopyalandı!' : 'Link'}</span>
            </button>
          )}

          {/* PDF */}
          <button
            type="button"
            onClick={() => exportPlanAsPDF(plan, onboardingData)}
            className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 font-semibold rounded-lg text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 hover:border-slate-300 transition-all"
            title="Planı PDF olarak indir"
          >
            <Download size={12} />
            <span className="hidden sm:inline">PDF</span>
          </button>

          {/* Tema toggle */}
          <button
            type="button"
            onClick={(e) => toggleWithCircle(toggleTheme, e)}
            className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-yellow-300 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors shrink-0"
            title={dark ? 'Gece Modu' : 'Aydınlık Mod'}
          >
            <span key={dark ? 'moon' : 'sun'} className="theme-icon-in">
              {dark ? <Moon size={14} /> : <Sun size={14} />}
            </span>
          </button>
        </div>
      </div>

      {/* ── ANA İÇERİK ── */}
      <div ref={containerRef} className="flex-1 flex overflow-hidden min-h-0">

        {/* SOL PANEL — Plan listesi */}
        <div
          className="flex flex-col w-full lg:w-auto border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 transition-[width] duration-200"
          style={window.innerWidth >= 1024 ? { width: `${leftWidthPct}%` } : undefined}
        >

          {/* Gün sekmeleri */}
          <div className="shrink-0 border-b border-slate-200 dark:border-slate-700 px-5 py-2.5 bg-slate-50/50 dark:bg-slate-800/50">
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
                      ? 'bg-[#f8981d] text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                  } dark:border-slate-600`}
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
                    activeDayIndex === index ? 'text-orange-100' : 'text-slate-400'
                  }`}>
                    ({day.activities.length})
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Bütçe takip şeridi — en az 1 gerçek harcama girilince görünür ── */}
          {budgetStats && budgetStats.enteredCount > 0 && (
            <div className="shrink-0 px-4 py-2.5 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Wallet size={11} className="text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Bütçe Takibi
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-semibold">
                  <span className="text-slate-600 dark:text-slate-300">
                    {plan.currencySymbol}{budgetStats.actualSpent.toLocaleString('tr-TR')} harcandı
                  </span>
                  <span className="text-slate-300 dark:text-slate-600">·</span>
                  <span className={budgetStats.remaining < 0 ? 'text-red-500' : 'text-emerald-600'}>
                    {budgetStats.remaining < 0
                      ? `${plan.currencySymbol}${Math.abs(budgetStats.remaining).toLocaleString('tr-TR')} aşıldı ⚠️`
                      : `${plan.currencySymbol}${budgetStats.remaining.toLocaleString('tr-TR')} kaldı`}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    budgetStats.pct < 70  ? 'bg-emerald-400' :
                    budgetStats.pct < 90  ? 'bg-amber-400'   :
                                            'bg-red-400'
                  }`}
                  style={{ width: `${Math.min(budgetStats.pct, 100)}%` }}
                />
              </div>

              <div className="flex items-center justify-between mt-1">
                <span className="text-[9px] text-slate-400">
                  {budgetStats.enteredCount} aktivite girildi · %{budgetStats.pct.toFixed(0)}
                </span>
                <span className="text-[9px] text-slate-400">
                  Toplam bütçe: {plan.currencySymbol}{budgetStats.totalBudget.toLocaleString('tr-TR')}
                </span>
              </div>
            </div>
          )}

          {/* Gün özeti şeridi */}
          {activeDay && (
            <div className="shrink-0 px-5 py-3 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 mb-0.5">{activeDay.date}</p>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
                    {activeDay.daySummary}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-3 space-y-0.5">
                  {dayBudgetStats.enteredCount > 0 ? (
                    <>
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-[9px] text-slate-400">Tahmini</span>
                        <span className="text-xs font-semibold text-slate-400 line-through">
                          {plan.currencySymbol}{dayBudgetStats.estimated.toLocaleString('tr-TR')}
                        </span>
                      </div>
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-[9px] text-slate-400">Harcanan</span>
                        <span className={`text-sm font-bold ${
                          dayBudgetStats.actualSpent > dayBudgetStats.estimated
                            ? 'text-red-500'
                            : 'text-emerald-600'
                        }`}>
                          {plan.currencySymbol}{dayBudgetStats.actualSpent.toLocaleString('tr-TR')}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-[10px] text-slate-400">Tahmini</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {plan.currencySymbol}{activeDay.totalEstimatedCost.toLocaleString()}
                      </p>
                    </>
                  )}
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

        {/* ── RESIZE HANDLE ── */}
        <div
          className="hidden lg:flex w-[5px] relative cursor-col-resize flex-shrink-0 bg-slate-200 dark:bg-slate-700 hover:bg-[#f8981d]/40 transition-colors"
          onMouseDown={handleResizeMouseDown}
        />

        {/* SAĞ PANEL — Harita */}
        <div
          role="region"
          aria-label="Rota haritası"
          className="hidden lg:flex flex-1 relative"
        >
          <MapView activities={activeDayActivities} onActivityClick={setSelectedPlace} hotel={hotelMarker} />

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

    </div>

    {/* Mekan detay paneli — overflow-hidden dışında render edilir (iOS fixed pozisyon sorunu) */}
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
  </>
  );
};

export default Dashboard;
