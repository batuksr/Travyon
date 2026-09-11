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
  BookOpen,
  ArrowLeft,
  X,
  Bookmark,
  BookmarkCheck,
  Sun,
  Moon,
  Cloud,
  Link2,
  Check,
} from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore';
import { toggleWithCircle } from '../utils/themeTransition';
import DailyPlanView from '../components/DailyPlanView';
import DayJourneyTools from '../components/DayJourneyTools';
import MapView from '../components/MapView';
import PlaceDetailsPanel from '../components/PlaceDetailsPanel';
import WeatherView from '../components/WeatherView';
import { sharePlanAsLink } from '../services/socialService';
import { useAuthStore } from '../store/useAuthStore';
import { isEmailVerified, resendVerification } from '../utils/authUtils';
import { useGoogleMapsLoader } from '../utils/googleMapsLoader';

const Dashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  // TEK yükleme noktası — MapView + DailyPlanView aynı anda mount olduğu için
  // ikisinin ayrı ayrı useJsApiLoader çağırması yarış durumuna yol açıyordu.
  const { isLoaded: mapsLoaded } = useGoogleMapsLoader();
  const locale = i18n.language === 'en' ? 'en-US' : 'tr-TR';
  const { plan, savedPlanId, setSavedPlanId, history, undo } = usePlanStore();
  const [undoVersion, setUndoVersion] = useState(0);
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
  const [daySummaryExpanded, setDaySummaryExpanded] = useState(false);
  const [guideOpen, setGuideOpen]     = useState(false);
  const [weatherOpen, setWeatherOpen] = useState(false);
  const [showMobileMap, setShowMobileMap] = useState(false);
  const [showExitModal, setShowExitModal]   = useState(false);
  const [pendingNavTarget, setPendingNavTarget] = useState<string | null>(null);
  const [justSaved, setJustSaved]           = useState(false);
  const [lastSavedPlan, setLastSavedPlan] = useState<typeof plan>(null);
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
  const isResizing     = useRef(false);

  const handleResizePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    isResizing.current = true;
    dragStartX.current     = e.clientX;
    dragStartWidth.current = leftWidthPct;
    document.documentElement.style.cursor = 'col-resize';
    document.documentElement.style.userSelect = 'none';
  }, [leftWidthPct]);

  const handleResizePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isResizing.current || !containerRef.current) return;
    const totalW = containerRef.current.getBoundingClientRect().width;
    if (totalW <= 0) return;
    const delta = e.clientX - dragStartX.current;
    const newPct = Math.min(78, Math.max(22, dragStartWidth.current + (delta / totalW) * 100));
    setLeftWidthPct(newPct);
  }, []);

  const handleResizePointerEnd = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    isResizing.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    document.documentElement.style.cursor = '';
    document.documentElement.style.userSelect = '';
  }, []);

  useEffect(() => () => {
    document.documentElement.style.cursor = '';
    document.documentElement.style.userSelect = '';
  }, []);

  // Sadece gerçekten farklı bir plan yüklenince gün 0'a sıfırla
  // plan referansı değil, içeriği değişince (destination + gün sayısı)
  const planKey = plan ? `${plan.destination}__${plan.dailyPlans.length}` : null;
  useEffect(() => {
    // planKey değişince (yeni plan) bilinçli senkron reset.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveDayIndex(0);
    setDaySummaryExpanded(false);
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
    setLastSavedPlan(plan);
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
  const savedFeedback = justSaved && lastSavedPlan === plan;
  const handleUndo = () => {
    const previous = history[history.length - 1];
    if (!previous) return;
    const changedDay = previous.dailyPlans.findIndex((day, index) => JSON.stringify(day) !== JSON.stringify(plan.dailyPlans[index]));
    undo();
    if (changedDay >= 0) setActiveDayIndex(changedDay);
    setUndoVersion(version => version + 1);
    setJustSaved(false);
    setSelectedPlace(null);
  };

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
            <MapView
              activities={activeDayActivities}
              onActivityClick={setSelectedPlace}
              hotel={hotelMarker}
              isLoaded={mapsLoaded}
            />
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

          {/* Mobil sekme butonları (Rehber + Hava) — sadece sm ve altında */}
          <button
            type="button"
            onClick={() => { setWeatherOpen(false); setGuideOpen(g => !g); }}
            className="md:hidden w-8 h-8 rounded-xl border border-divider bg-surface flex items-center justify-center text-text hover:bg-surface-2 transition-colors"
            title={t('dashboard.cityGuide.drawerTitle')}
          >
            <BookOpen size={14} strokeWidth={2.5} />
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
            disabled={savedFeedback}
            aria-label={t(savedFeedback ? 'dashboard.topBar.saved' : savedPlanId ? 'dashboard.journey.saveChanges' : 'dashboard.topBar.save')}
            className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 font-heading rounded-full text-xs transition-all ${
              savedFeedback
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                : 'bg-surface border-[1.5px] border-accent/40 text-accent hover:bg-accent-100 hover:border-accent'
            }`}
          >
            {savedFeedback ? <BookmarkCheck size={12} strokeWidth={2.5} /> : <Bookmark size={12} strokeWidth={2.5} />}
            <span className="hidden sm:inline">{t(savedFeedback ? 'dashboard.topBar.saved' : savedPlanId ? 'dashboard.journey.saveChanges' : 'dashboard.topBar.save')}</span>
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
          className="flex min-w-0 shrink-0 flex-col w-full lg:w-[var(--plan-panel-width)] border-r border-divider bg-bg"
          style={{ '--plan-panel-width': `${leftWidthPct}%` } as React.CSSProperties}
        >

          {/* Gün sekmeleri */}
          <div className="shrink-0 border-b border-divider px-5 py-2.5 bg-bg">
            <div className="flex items-center gap-2">
              <div
                role="tablist"
                aria-label={t('dashboard.dayTabs.ariaLabel')}
                className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              >
              {plan.dailyPlans.map((day, index) => (
                <button
                  key={day.dayNumber}
                  type="button"
                  role="tab"
                  aria-selected={activeDayIndex === index}
                  onClick={() => {
                    setActiveDayIndex(index);
                    setDaySummaryExpanded(false);
                  }}
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
              <button
                type="button"
                onClick={() => setShowMobileMap(true)}
                aria-label={t('dashboard.mobileMap.openAriaLabel')}
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-accent px-3 font-heading text-[11px] text-white shadow-[0_5px_14px_rgba(198,113,57,0.22)] transition-colors hover:brightness-105 lg:hidden"
              >
                <Map size={13} strokeWidth={2.4} />
                {t('dashboard.mobileMap.buttonLabel')}
              </button>
            </div>
          </div>

          {/* Estimates, entered expenses and allocated budget have distinct meanings. */}
          {budgetStats && (
            <div className="shrink-0 px-4 py-3 border-b border-divider bg-surface" data-testid="plan-budget">
              <dl className="grid grid-cols-3 gap-3">
                {[
                  { label: t('dashboard.journey.estimate'), value: plan.totalEstimatedCost },
                  { label: t('dashboard.journey.actual'), value: budgetStats.actualSpent },
                  { label: t('dashboard.journey.allocated'), value: budgetStats.totalBudget },
                ].map(({ label, value }) => (
                  <div key={label}><dt className="text-[10px] leading-relaxed text-muted">{label}</dt><dd className="mt-1 text-sm font-semibold text-text">{plan.currencySymbol}{value.toLocaleString(locale)}</dd></div>
                ))}
              </dl>
              <div className="mt-2 h-1.5 bg-surface-2 rounded-full overflow-hidden" role="progressbar" aria-label={t('dashboard.budget.label')} aria-valuenow={Math.round(budgetStats.pct)} aria-valuemin={0} aria-valuemax={100}>
                <div className={`h-full rounded-full transition-all motion-reduce:transition-none ${budgetStats.remaining < 0 ? 'bg-red-400' : budgetStats.pct >= 90 ? 'bg-amber-400' : 'bg-sage'}`} style={{ width: `${budgetStats.pct}%` }} />
              </div>
              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[10px] text-muted">
                <span>{budgetStats.enteredCount ? t('dashboard.journey.spendingCoverage', { entered: budgetStats.enteredCount, total: plan.dailyPlans.reduce((sum, day) => sum + day.activities.length, 0) }) : t('dashboard.journey.noSpending')}</span>
                <span className={budgetStats.remaining < 0 ? 'text-red-600' : 'text-sage-700'}>{t(budgetStats.remaining < 0 ? 'dashboard.budget.exceeded' : 'dashboard.budget.remaining', { amount: `${plan.currencySymbol}${Math.abs(budgetStats.remaining).toLocaleString(locale)}` })}</span>
              </div>
            </div>
          )}

          {/* Gün özeti şeridi */}
          {activeDay && (
            <div className="shrink-0 px-5 py-3 border-b border-divider bg-surface">
              <div className="flex items-start justify-between gap-3">
                <p className="pt-0.5 text-[10px] text-muted">{activeDay.date}</p>
                <div className="shrink-0 space-y-0.5 text-right">
                  {dayBudgetStats.enteredCount > 0 ? (
                    <>
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-[9px] text-muted">{t('dashboard.daySummary.estimated')}</span>
                        <span className="text-xs font-semibold text-muted">
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
              <div className={`mt-1 ${daySummaryExpanded ? '' : 'flex items-baseline gap-1.5'}`}>
                <p className={`text-sm font-semibold leading-snug text-text ${daySummaryExpanded ? '' : 'min-w-0 flex-1 truncate'}`}>
                  {activeDay.daySummary}
                </p>
                {activeDay.daySummary.length > 40 && (
                  <button
                    type="button"
                    onClick={() => setDaySummaryExpanded(expanded => !expanded)}
                    className={`shrink-0 text-[11px] font-semibold text-accent hover:underline ${daySummaryExpanded ? 'mt-1' : ''}`}
                    aria-expanded={daySummaryExpanded}
                  >
                    {daySummaryExpanded
                      ? t('dashboard.daySummary.readLess')
                      : t('dashboard.daySummary.readMore')}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Aktivite listesi — scroll edilebilir */}
          <div
            role="tabpanel"
            aria-label={activeDay ? t('dashboard.daySummary.panelAriaLabel', { number: activeDay.dayNumber }) : t('dashboard.topBar.tabPlan')}
            className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            {activeDay ? <DailyPlanView key={`${savedPlanId}-${activeDay.dayNumber}-${undoVersion}`} day={activeDay} onActivityClick={setSelectedPlace} isLoaded={mapsLoaded}
              journeyTools={<DayJourneyTools day={activeDay} destination={plan.destination} planId={savedPlanId} canUndo={history.length > 0}
                onUndo={handleUndo} />} /> : null}
          </div>
        </div>

        {/* ── RESIZE HANDLE ── */}
        <div
          role="separator"
          aria-label={t('dashboard.map.resizePanels')}
          aria-orientation="vertical"
          aria-valuemin={22}
          aria-valuemax={78}
          aria-valuenow={Math.round(leftWidthPct)}
          tabIndex={0}
          className="hidden lg:flex w-2 relative z-20 cursor-col-resize flex-shrink-0 bg-divider hover:bg-accent/50 focus:bg-accent/50 focus:outline-none transition-colors touch-none"
          onPointerDown={handleResizePointerDown}
          onPointerMove={handleResizePointerMove}
          onPointerUp={handleResizePointerEnd}
          onPointerCancel={handleResizePointerEnd}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') {
              e.preventDefault();
              setLeftWidthPct((value) => Math.max(22, value - 2));
            }
            if (e.key === 'ArrowRight') {
              e.preventDefault();
              setLeftWidthPct((value) => Math.min(78, value + 2));
            }
          }}
        />

        {/* SAĞ PANEL — Harita */}
        <div
          role="region"
          aria-label={t('dashboard.map.regionAriaLabel')}
          className="hidden lg:flex flex-1 relative"
        >
          <MapView activities={activeDayActivities} onActivityClick={setSelectedPlace} hotel={hotelMarker} isLoaded={mapsLoaded} />

          {/* Mini optimize badge */}
          <div className="absolute top-3 right-3 bg-surface border border-divider rounded-xl shadow-sm px-3.5 py-2 flex items-center gap-2 z-[5]">
            <div className="w-1.5 h-1.5 bg-sage rounded-full" />
            <span className="text-xs font-heading text-text">
              {t('dashboard.map.placesOptimized', { count: activeDayActivities.length })}
            </span>
          </div>
        </div>
      </div>

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
