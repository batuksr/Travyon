import React, { useMemo, useEffect, useState, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
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
import { sharePlanAsLink } from '../services/socialService';
import { useAuthStore } from '../store/useAuthStore';
import { isEmailVerified, resendVerification } from '../utils/authUtils';

const Dashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'en' ? 'en-US' : 'tr-TR';
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
    // planKey değişince (yeni plan) bilinçli senkron reset.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveDayIndex(0);
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
          name: onboardingData.accommodationAddress || t('dashboard.map.accommodationFallback'),
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
      alert(t('dashboard.topBar.verifyEmailAlert'));
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
    <div className="h-screen flex flex-col bg-bg overflow-hidden">


      {/* ── ÇIKIŞ ONAY MODALİ ── */}
      {showExitModal && (
        <div
          className="fixed inset-0 bg-[#1c140c]/55 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowExitModal(false)}
        >
          <div
            className="bg-surface rounded-3xl shadow-2xl p-6 max-w-sm w-full border border-divider"
            onClick={e => e.stopPropagation()}
          >
            {/* İkon + başlık */}
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-14 h-14 bg-accent-100 rounded-2xl flex items-center justify-center mb-4">
                <Bookmark size={26} strokeWidth={2.5} className="text-accent" />
              </div>
              <h3 className="font-heading text-base text-text">
                {t('dashboard.exitModal.title')}
              </h3>
              <p className="text-sm text-muted mt-1.5 leading-relaxed">
                {t('dashboard.exitModal.message', { destination: plan?.destination })}
              </p>
            </div>

            {/* Butonlar */}
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleSaveAndExit}
                className="w-full py-3 bg-accent hover:brightness-105 text-white font-heading rounded-full text-sm transition-all flex items-center justify-center gap-2 shadow-[0_10px_22px_rgba(198,113,57,0.28)]"
              >
                <BookmarkCheck size={15} strokeWidth={2.5} />
                {t('dashboard.exitModal.saveAndExit')}
              </button>
              <button
                type="button"
                onClick={handleExitWithoutSave}
                className="w-full py-2.5 bg-surface-2 hover:brightness-95 text-text font-semibold rounded-full text-sm transition-all"
              >
                {t('dashboard.exitModal.exitWithoutSaving')}
              </button>
              <button
                type="button"
                onClick={() => setShowExitModal(false)}
                className="w-full py-2 text-muted hover:text-text font-medium text-xs transition-colors"
              >
                {t('dashboard.exitModal.backToPlan')}
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
          <div className="w-full sm:w-80 bg-surface border-l border-divider flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-divider shrink-0">
              <h2 className="font-heading text-sm text-text">{t('dashboard.cityGuide.drawerTitle')}</h2>
              <button
                type="button"
                onClick={() => setGuideOpen(false)}
                className="w-9 h-9 rounded-xl hover:bg-surface-2 flex items-center justify-center text-muted transition-colors"
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Bus size={13} strokeWidth={2.5} className="text-blue-500" />
                  <h3 className="text-[10px] font-heading uppercase tracking-wider text-text">
                    {t('dashboard.cityGuide.transportation')}
                  </h3>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  {plan.cityGuide.transportationTips}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Users size={13} strokeWidth={2.5} className="text-accent" />
                  <h3 className="text-[10px] font-heading uppercase tracking-wider text-text">
                    {t('dashboard.cityGuide.localCulture')}
                  </h3>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  {plan.cityGuide.localCustoms}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb size={13} strokeWidth={2.5} className="text-sage" />
                  <h3 className="text-[10px] font-heading uppercase tracking-wider text-text">
                    {t('dashboard.cityGuide.usefulInfo')}
                  </h3>
                </div>
                <p className="text-xs text-muted leading-relaxed">
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
        <div className="lg:hidden fixed inset-0 z-50 bg-surface flex flex-col">
          <div className="h-12 flex items-center justify-between px-4 border-b border-divider shrink-0">
            <span className="font-heading text-sm text-text">{t('dashboard.mobileMap.title')}</span>
            <button
              type="button"
              onClick={() => setShowMobileMap(false)}
              className="w-8 h-8 rounded-xl hover:bg-surface-2 flex items-center justify-center text-text transition-colors"
            >
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>
          <div className="flex-1 min-h-0">
            <MapView activities={activeDayActivities} hotel={hotelMarker} />
          </div>
        </div>
      )}

      {/* ── ÜST BAR ── */}
      <div className="shrink-0 border-b border-divider px-3 sm:px-5 py-2.5 sm:py-3 flex items-center gap-2 bg-surface relative">

        {/* Geri butonu */}
        <button
          type="button"
          onClick={handleBackClick}
          className="w-8 h-8 rounded-xl hover:bg-surface-2 flex items-center justify-center text-text transition-colors shrink-0"
        >
          <ArrowLeft size={15} strokeWidth={2.5} />
        </button>

        {/* Şehir adı */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <h1 className="font-heading text-sm text-text truncate">
            {plan.destination}
          </h1>
          <span className="text-xs text-muted font-medium shrink-0 hidden sm:inline">
            • {t('dashboard.topBar.daysCount', { count: plan.dailyPlans.length })}
          </span>
        </div>

        {/* Orta: Plan / Rehber / Hava sekmeleri — tam ortada */}
        <div className="hidden md:flex items-center gap-1 bg-surface-2 p-0.5 rounded-full absolute left-1/2 -translate-x-1/2">
          <button
            type="button"
            className="px-3.5 py-1.5 text-xs font-heading bg-surface rounded-full shadow-sm text-text"
          >
            {t('dashboard.topBar.tabPlan')}
          </button>
          <button
            type="button"
            onClick={() => { setWeatherOpen(false); setGuideOpen(true); }}
            className="px-3.5 py-1.5 text-xs font-heading text-muted hover:text-text transition-colors rounded-full"
          >
            {t('dashboard.topBar.tabGuide')}
          </button>
          <button
            type="button"
            onClick={() => { setGuideOpen(false); setWeatherOpen(true); }}
            className="flex items-center gap-1 px-3.5 py-1.5 text-xs font-heading text-muted hover:text-text transition-colors rounded-full"
          >
            <Cloud size={11} strokeWidth={2.5} />
            {t('dashboard.topBar.tabWeather')}
          </button>
        </div>

        {/* Sağ: aksiyonlar */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">

          {/* Toplam maliyet — sadece md+ */}
          <div className="hidden md:flex items-center gap-1.5 text-xs">
            <span className="text-muted">{t('dashboard.topBar.total')}</span>
            <span className="font-heading text-text">
              {plan.currencySymbol}{plan.totalEstimatedCost.toLocaleString(locale)}
            </span>
          </div>

          {/* Mobil sekme butonları (Rehber + Hava) — sadece sm ve altında */}
          <button
            type="button"
            onClick={() => { setWeatherOpen(false); setGuideOpen(g => !g); }}
            className="md:hidden w-8 h-8 rounded-xl border border-divider bg-surface flex items-center justify-center text-text hover:bg-surface-2 transition-colors"
            title={t('dashboard.cityGuide.drawerTitle')}
          >
            <Map size={14} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={() => { setGuideOpen(false); setWeatherOpen(w => !w); }}
            className="md:hidden w-8 h-8 rounded-xl border border-divider bg-surface flex items-center justify-center text-text hover:bg-surface-2 transition-colors"
            title={t('dashboard.weather.title')}
          >
            <Cloud size={14} strokeWidth={2.5} />
          </button>

          {/* Kaydet */}
          <button
            type="button"
            onClick={handleSavePlan}
            disabled={justSaved}
            className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 font-heading rounded-full text-xs transition-all ${
              justSaved
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                : 'bg-surface border-[1.5px] border-accent/40 text-accent hover:bg-accent-100 hover:border-accent'
            }`}
          >
            {justSaved ? <BookmarkCheck size={12} strokeWidth={2.5} /> : <Bookmark size={12} strokeWidth={2.5} />}
            <span className="hidden sm:inline">{justSaved ? t('dashboard.topBar.saved') : t('dashboard.topBar.save')}</span>
          </button>

          {/* Link Paylaş — sadece kayıtlı planlarda */}
          {savedPlanId && (
            <button
              type="button"
              onClick={handleShareLink}
              disabled={linkCopied}
              className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 font-heading rounded-full text-xs transition-all ${
                linkCopied
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                  : 'bg-surface border-[1.5px] border-divider text-text hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600'
              }`}
              title={t('dashboard.topBar.copyLinkTitle')}
            >
              {linkCopied ? <Check size={12} strokeWidth={2.5} /> : <Link2 size={12} strokeWidth={2.5} />}
              <span className="hidden sm:inline">{linkCopied ? t('dashboard.topBar.linkCopied') : t('dashboard.topBar.link')}</span>
            </button>
          )}

          {/* Tema toggle */}
          <button
            type="button"
            onClick={(e) => toggleWithCircle(toggleTheme, e)}
            className="w-8 h-8 rounded-full border border-divider bg-surface flex items-center justify-center text-text hover:bg-surface-2 transition-colors shrink-0"
            title={dark ? t('dashboard.topBar.nightMode') : t('dashboard.topBar.lightMode')}
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
          className="flex flex-col w-full lg:w-auto border-r border-divider bg-bg transition-[width] duration-200"
          style={window.innerWidth >= 1024 ? { width: `${leftWidthPct}%` } : undefined}
        >

          {/* Gün sekmeleri */}
          <div className="shrink-0 border-b border-divider px-5 py-2.5 bg-bg">
            <div
              role="tablist"
              aria-label={t('dashboard.dayTabs.ariaLabel')}
              className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
              {plan.dailyPlans.map((day, index) => (
                <button
                  key={day.dayNumber}
                  type="button"
                  role="tab"
                  aria-selected={activeDayIndex === index}
                  onClick={() => setActiveDayIndex(index)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-heading transition-all shrink-0 whitespace-nowrap border-[1.5px] ${
                    activeDayIndex === index
                      ? 'bg-accent text-white border-accent'
                      : 'bg-surface border-divider text-text hover:border-accent/40'
                  }`}
                >
                  <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold ${
                    activeDayIndex === index
                      ? 'bg-white/20 text-white'
                      : 'bg-surface-2 text-muted'
                  }`}>
                    {day.dayNumber}
                  </span>
                  {day.date?.slice(5) ?? t('dashboard.dayTabs.dayFallback', { number: day.dayNumber })}
                  <span className={`text-[10px] font-normal ${
                    activeDayIndex === index ? 'text-white/80' : 'text-muted'
                  }`}>
                    ({day.activities.length})
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Bütçe takip şeridi — en az 1 gerçek harcama girilince görünür ── */}
          {budgetStats && budgetStats.enteredCount > 0 && (
            <div className="shrink-0 px-4 py-2.5 border-b border-divider bg-surface">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Wallet size={11} strokeWidth={2.5} className="text-muted" />
                  <span className="text-[10px] font-heading text-muted uppercase tracking-wider">
                    {t('dashboard.budget.label')}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-semibold">
                  <span className="text-text">
                    {t('dashboard.budget.spent', { amount: `${plan.currencySymbol}${budgetStats.actualSpent.toLocaleString(locale)}` })}
                  </span>
                  <span className="text-muted">·</span>
                  <span className={budgetStats.remaining < 0 ? 'text-red-500' : 'text-emerald-600'}>
                    {budgetStats.remaining < 0
                      ? t('dashboard.budget.exceeded', { amount: `${plan.currencySymbol}${Math.abs(budgetStats.remaining).toLocaleString(locale)}` })
                      : t('dashboard.budget.remaining', { amount: `${plan.currencySymbol}${budgetStats.remaining.toLocaleString(locale)}` })}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
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
                <span className="text-[9px] text-muted">
                  {t('dashboard.budget.activitiesEntered', { count: budgetStats.enteredCount, pct: budgetStats.pct.toFixed(0) })}
                </span>
                <span className="text-[9px] text-muted">
                  {t('dashboard.budget.totalBudget', { amount: `${plan.currencySymbol}${budgetStats.totalBudget.toLocaleString(locale)}` })}
                </span>
              </div>
            </div>
          )}

          {/* Gün özeti şeridi */}
          {activeDay && (
            <div className="shrink-0 px-5 py-3 border-b border-divider bg-surface">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] text-muted mb-0.5">{activeDay.date}</p>
                  <p className="text-sm font-semibold text-text truncate">
                    {activeDay.daySummary}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-3 space-y-0.5">
                  {dayBudgetStats.enteredCount > 0 ? (
                    <>
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-[9px] text-muted">{t('dashboard.daySummary.estimated')}</span>
                        <span className="text-xs font-semibold text-muted line-through">
                          {plan.currencySymbol}{dayBudgetStats.estimated.toLocaleString(locale)}
                        </span>
                      </div>
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-[9px] text-muted">{t('dashboard.daySummary.spent')}</span>
                        <span className={`text-sm font-bold ${
                          dayBudgetStats.actualSpent > dayBudgetStats.estimated
                            ? 'text-red-500'
                            : 'text-emerald-600'
                        }`}>
                          {plan.currencySymbol}{dayBudgetStats.actualSpent.toLocaleString(locale)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-[10px] text-muted">{t('dashboard.daySummary.estimated')}</p>
                      <p className="font-heading text-sm text-text">
                        {plan.currencySymbol}{activeDay.totalEstimatedCost.toLocaleString(locale)}
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
            aria-label={activeDay ? t('dashboard.daySummary.panelAriaLabel', { number: activeDay.dayNumber }) : t('dashboard.topBar.tabPlan')}
            className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            {activeDay ? <DailyPlanView day={activeDay} onActivityClick={setSelectedPlace} /> : null}
          </div>
        </div>

        {/* ── RESIZE HANDLE ── */}
        <div
          className="hidden lg:flex w-[5px] relative cursor-col-resize flex-shrink-0 bg-divider hover:bg-accent/40 transition-colors"
          onMouseDown={handleResizeMouseDown}
        />

        {/* SAĞ PANEL — Harita */}
        <div
          role="region"
          aria-label={t('dashboard.map.regionAriaLabel')}
          className="hidden lg:flex flex-1 relative"
        >
          <MapView activities={activeDayActivities} onActivityClick={setSelectedPlace} hotel={hotelMarker} />

          {/* Mini optimize badge */}
          <div className="absolute top-3 right-3 bg-surface border border-divider rounded-xl shadow-sm px-3.5 py-2 flex items-center gap-2 z-[5]">
            <div className="w-1.5 h-1.5 bg-sage rounded-full" />
            <span className="text-xs font-heading text-text">
              {t('dashboard.map.placesOptimized', { count: activeDayActivities.length })}
            </span>
          </div>
        </div>
      </div>

      {/* Mobil harita FAB */}
      <button
        type="button"
        onClick={() => setShowMobileMap(true)}
        aria-label={t('dashboard.mobileMap.openAriaLabel')}
        className="lg:hidden fixed bottom-4 right-4 z-30 w-12 h-12 bg-accent text-white rounded-full shadow-[0_10px_22px_rgba(198,113,57,0.3)] flex items-center justify-center hover:brightness-105 transition-colors"
      >
        <Map size={18} strokeWidth={2.5} />
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
