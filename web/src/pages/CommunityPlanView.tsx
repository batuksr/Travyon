import AppIcon from '../components/AppIcon';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, Bus, Users, Lightbulb, Map, X, Sun, Moon, Loader2, SlidersHorizontal,
} from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore';
import { toggleWithCircle } from '../utils/themeTransition';
import { usePlanStore } from '../store/usePlanStore';
import { useOnboardingStore } from '../store/useOnboardingStore';
import { getPublicPlanRecord } from '../services/socialService';
import type { PublicPlan } from '../services/socialService';
import DailyPlanView from '../components/DailyPlanView';
import MapView from '../components/MapView';
import PlaceDetailsPanel from '../components/PlaceDetailsPanel';
import { useGoogleMapsLoader } from '../utils/googleMapsLoader';

const TRAVEL_TYPE_ICONS: Record<string, string> = {
  solo_macera: 'backpack', romantik: 'heart', balayi: 'sparkles', aile: 'users',
  arkadas_grubu: 'handshake', is_seyahati: 'briefcase', sehir_kacamagi: 'coffee', klasik_tatil: 'map',
};
const PACE_ICONS: Record<string, string> = {
  rahat: 'armchair', normal: 'walk', aktif: 'zap', esnek: 'compass',
};
const PURPOSE_DETAILED_ICONS: Record<string, string> = {
  culture: 'landmark', relax: 'armchair', nightlife: 'moon', nature: 'mountain',
};
const TRANSPORT_ICONS: Record<string, string> = {
  public: 'transit', walk: 'walk', taxi: 'taxi', car: 'car',
};
const ACCOMMODATION_ICONS: Record<string, string> = {
  hotel: 'hotel', airbnb: 'house', hostel: 'bed', resort: 'palm',
};
const FOOD_ICONS: Record<string, string> = {
  iconic: 'star', hidden_gems: 'map', fine_dining: 'wine', street_food: 'store', mixed: 'shuffle',
};

const CommunityPlanView: React.FC = () => {
  const { t, i18n } = useTranslation();
  // TEK yükleme noktası — bkz. Dashboard.tsx'teki aynı not.
  const { isLoaded: mapsLoaded } = useGoogleMapsLoader();
  const localeCode = i18n.language === 'en' ? 'en-US' : 'tr-TR';
  const { planId }  = useParams<{ planId: string }>();
  const navigate    = useNavigate();
  const { dark, toggle: toggleTheme } = useThemeStore();

  /* ── Yükleme durumu ── */
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);
  const [meta, setMeta]         = useState<PublicPlan | null>(null);

  /* ── Dashboard ile aynı UI state'leri ── */
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [daySummaryExpanded, setDaySummaryExpanded] = useState(false);
  const [guideOpen, setGuideOpen]             = useState(false);
  const [selectionsOpen, setSelectionsOpen]   = useState(false);
  const [showMobileMap, setShowMobileMap]   = useState(false);
  const [selectedPlace, setSelectedPlace]   = useState<{
    placeName: string; lat: number; lng: number;
  } | null>(null);

  /* ── Resize handle ── */
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

  /* ── Store referansları ── */
  const { setPlan, clearPlan } = usePlanStore();
  const { updateData } = useOnboardingStore();

  /* ── Plan yükle → store'a geçici enjekte et ── */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!planId) { setError(true); setLoading(false); return; }

    // Mevcut store içeriğini sakla (unmount'ta geri yüklenecek)
    const prevPlan       = usePlanStore.getState().plan;
    const prevSavedId    = usePlanStore.getState().savedPlanId;
    const prevOnboarding = useOnboardingStore.getState().data;

    // Kullanıcı hızlıca başka bir plana geçerse, eski isteğin cevabı yeni
    // planın üzerine yazmasın diye iptal bayrağı.
    let cancelled = false;

    setLoading(true);
    getPublicPlanRecord(planId)
      .then((record) => {
        if (cancelled) return;
        if (!record) { setError(true); return; }
        const { planData, meta: planMeta } = record;
        setMeta(planMeta);
        setActiveDayIndex(0);
        setDaySummaryExpanded(false);

        // Planı store'a enjekte et — DailyPlanView bunu okur
        setPlan(planData);
        usePlanStore.setState({ savedPlanId: null });

        // Onboarding data — DailyPlanView para birimi için okur
        updateData({
          destination:       planData.destination,
          budget:            planMeta?.budget ?? 0,
          currencyCode:      'TRY',
          currencySymbol:    planMeta?.currencySymbol ?? '₺',
          hasReservation:    null,
          accommodationLat:  null,
          accommodationLng:  null,
          accommodationAddress: '',
        });
      })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });

    // Unmount'ta orijinali geri yükle
    return () => {
      cancelled = true;
      if (prevPlan) {
        setPlan(prevPlan);
        usePlanStore.setState({ savedPlanId: prevSavedId });
      } else {
        clearPlan();
      }
      updateData(prevOnboarding);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  /* ── Store'dan canlı plan oku (DailyPlanView'le senkron) ── */
  const plan = usePlanStore(s => s.plan);

  const activeDayActivities = useMemo(
    () => plan?.dailyPlans[activeDayIndex]?.activities ?? [],
    [plan?.dailyPlans, activeDayIndex],
  );

  const activeDay = plan?.dailyPlans[activeDayIndex];

  /* ── Avatar ── */
  const authorName = meta?.profilePublic ? meta.userDisplayName : t('communityPlanView.defaultName');
  const authorPhotoURL = meta?.profilePublic ? meta.userPhotoURL : null;
  const initials = authorName
    .split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase();

  /* ── Yükleniyor ── */
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin text-accent" />
          <p className="text-sm text-muted font-medium">{t('communityPlanView.loading')}</p>
        </div>
      </div>
    );
  }

  /* ── Hata ── */
  if (error || !plan) {
    return (
      <div className="h-screen flex items-center justify-center bg-bg">
        <div className="text-center space-y-3 p-8">
          <p className="mb-3 text-sage-700"><AppIcon name="help" size={36} /></p>
          <p className="font-heading text-base text-text">{t('communityPlanView.notFoundTitle')}</p>
          <p className="text-sm text-muted">{t('communityPlanView.notFoundBody')}</p>
          <button
            onClick={() => navigate('/community')}
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-heading text-accent hover:text-accent-700"
          >
            <ArrowLeft size={14} strokeWidth={2.5} /> {t('communityPlanView.backToCommunity')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="h-screen flex flex-col bg-bg overflow-hidden">

      {/* ══ ŞEHİR REHBERİ DRAWER ══ */}
      {guideOpen && plan.cityGuide && (
        <div className="fixed inset-0 z-40 flex">
          <div className="hidden sm:flex flex-1 bg-black/30" onClick={() => setGuideOpen(false)} />
          <div className="w-full sm:w-80 bg-surface border-l border-divider flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-divider shrink-0">
              <h2 className="font-heading text-sm text-text">{t('communityPlanView.cityGuide.title')}</h2>
              <button
                onClick={() => setGuideOpen(false)}
                className="w-8 h-8 rounded-xl hover:bg-surface-2 flex items-center justify-center text-muted transition-colors"
              >
                <X size={14} strokeWidth={2.5} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Bus size={13} strokeWidth={2.5} className="text-blue-500" />
                  <h3 className="text-[10px] font-heading uppercase tracking-wider text-text">{t('communityPlanView.cityGuide.transport')}</h3>
                </div>
                <p className="text-xs text-muted leading-relaxed">{plan.cityGuide.transportationTips}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Users size={13} strokeWidth={2.5} className="text-accent" />
                  <h3 className="text-[10px] font-heading uppercase tracking-wider text-text">{t('communityPlanView.cityGuide.localCulture')}</h3>
                </div>
                <p className="text-xs text-muted leading-relaxed">{plan.cityGuide.localCustoms}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb size={13} strokeWidth={2.5} className="text-sage" />
                  <h3 className="text-[10px] font-heading uppercase tracking-wider text-text">{t('communityPlanView.cityGuide.usefulInfo')}</h3>
                </div>
                <p className="text-xs text-muted leading-relaxed">{plan.cityGuide.generalAdvice}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ SEÇİMLER DRAWER ══ */}
      {selectionsOpen && (
        <div className="fixed inset-0 z-40 flex">
          <div className="hidden sm:flex flex-1 bg-black/30" onClick={() => setSelectionsOpen(false)} />
          <div className="w-full sm:w-80 bg-surface border-l border-divider flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-divider shrink-0">
              <h2 className="font-heading text-sm text-text">{t('communityPlanView.selections.title')}</h2>
              <button onClick={() => setSelectionsOpen(false)} className="w-8 h-8 rounded-xl hover:bg-surface-2 flex items-center justify-center text-muted transition-colors">
                <X size={14} strokeWidth={2.5} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {meta ? (() => {
                const travelTypeLabel = (key: string) => {
                  const icon = TRAVEL_TYPE_ICONS[key];
                  return icon ? <span className="inline-flex items-center gap-1.5"><AppIcon name={icon} size={14} className="text-sage-700" />{t(`communityPlanView.travelTypes.${key}`)}</span> : key;
                };
                const paceLabel = (key: string) => {
                  const icon = PACE_ICONS[key];
                  return icon ? <span className="inline-flex items-center gap-1.5"><AppIcon name={icon} size={14} className="text-sage-700" />{t(`communityPlanView.paceOptions.${key}`)}</span> : key;
                };
                const purposeDetailedLabel = (key: string) => {
                  const icon = PURPOSE_DETAILED_ICONS[key];
                  return icon ? <span className="inline-flex items-center gap-1.5"><AppIcon name={icon} size={14} className="text-sage-700" />{t(`communityPlanView.purposesDetailed.${key}`)}</span> : key;
                };
                const transportLabel = (key: string) => {
                  const icon = TRANSPORT_ICONS[key];
                  return icon ? <span className="inline-flex items-center gap-1.5"><AppIcon name={icon} size={14} className="text-sage-700" />{t(`communityPlanView.transportOptions.${key}`)}</span> : key;
                };
                const accommodationLabel = (key: string) => {
                  const icon = ACCOMMODATION_ICONS[key];
                  return icon ? <span className="inline-flex items-center gap-1.5"><AppIcon name={icon} size={14} className="text-sage-700" />{t(`communityPlanView.accommodationOptions.${key}`)}</span> : key;
                };
                const foodLabel = (key: string) => {
                  const icon = FOOD_ICONS[key];
                  return icon ? <span className="inline-flex items-center gap-1.5"><AppIcon name={icon} size={14} className="text-sage-700" />{t(`communityPlanView.foodOptions.${key}`)}</span> : key;
                };
                // Yeni planlar diyet tercihlerini neutral key olarak saklar (örn. 'vegan');
                // eski planlar doğrudan görüntülenebilir Türkçe metin saklar (örn. 'Vegan') —
                // defaultValue sayesinde eşleşme yoksa ham değer aynen gösterilir.
                const dietLabel = (key: string) => {
                  const icon = t(`onboarding.step3.diets.${key}.icon`, { defaultValue: '' });
                  const label = t(`onboarding.step3.diets.${key}.label`, { defaultValue: key });
                  return icon ? <span className="inline-flex items-center gap-1.5"><AppIcon name={icon} size={14} className="text-sage-700" />{label}</span> : label;
                };
                const rows: { label: string; value: React.ReactNode }[] = [];

                // Süre: gün sayısı (tarihleri değil)
                const dayCount = plan?.dailyPlans.length ?? meta.dailyPlanCount;
                if (dayCount)
                  rows.push({ label: t('communityPlanView.selections.duration'), value: t('communityPlanView.selections.durationValue', { count: dayCount }) });
                if (meta.peopleCount)
                  rows.push({ label: t('communityPlanView.selections.peopleCount'), value: t('communityPlanView.selections.peopleCountValue', { count: meta.peopleCount }) });
                if (meta.travelType)
                  rows.push({ label: t('communityPlanView.selections.travelType'), value: travelTypeLabel(meta.travelType) });
                if (meta.pace)
                  rows.push({ label: t('communityPlanView.selections.pace'), value: paceLabel(meta.pace) });
                if (meta.earlyBird != null)
                  rows.push({ label: t('communityPlanView.selections.earlyBird'), value: <span className="inline-flex items-center gap-1.5"><AppIcon name={meta.earlyBird ? 'check' : 'x'} size={14} />{t(meta.earlyBird ? 'communityPlanView.selections.yes' : 'communityPlanView.selections.no')}</span> });
                if (meta.purposes?.length)
                  rows.push({ label: t('communityPlanView.selections.interests'), value: <span className="inline-flex flex-wrap justify-end gap-2">{meta.purposes.map(p => <span key={p}>{purposeDetailedLabel(p)}</span>)}</span> });
                if (meta.accommodation)
                  rows.push({ label: t('communityPlanView.selections.accommodation'), value: accommodationLabel(meta.accommodation) });
                if (meta.transport)
                  rows.push({ label: t('communityPlanView.selections.transportLabel'), value: transportLabel(meta.transport) });
                if (meta.foodPhilosophy)
                  rows.push({ label: t('communityPlanView.selections.food'), value: foodLabel(meta.foodPhilosophy) });
                if (meta.dietaryRestrictions?.length)
                  rows.push({ label: t('communityPlanView.selections.diet'), value: <span className="inline-flex flex-wrap justify-end gap-2">{meta.dietaryRestrictions.map(d => <span key={d}>{dietLabel(d)}</span>)}</span> });

                if (rows.length === 0) return (
                  <div className="text-center py-8">
                    <p className="mb-2 text-sage-700"><AppIcon name="search" size={32} /></p>
                    <p className="text-sm text-muted">{t('communityPlanView.selections.noData')}</p>
                    <p className="text-xs text-muted mt-1">{t('communityPlanView.selections.noDataHint')}</p>
                  </div>
                );

                return (
                  <div className="space-y-3">
                    {rows.map(row => (
                      <div key={row.label} className="flex items-start justify-between gap-3 py-2.5 border-b border-divider last:border-0">
                        <span className="text-xs font-semibold text-muted shrink-0 w-28">{row.label}</span>
                        <span className="text-xs text-text text-right leading-relaxed">{row.value}</span>
                      </div>
                    ))}
                  </div>
                );
              })() : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted">{t('communityPlanView.selections.loading')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ MOBİL HARİTA MODALİ ══ */}
      {showMobileMap && (
        <div className="lg:hidden fixed inset-0 z-50 bg-surface flex flex-col">
          <div className="h-12 flex items-center justify-between px-4 border-b border-divider shrink-0">
            <span className="font-heading text-sm text-text">{t('communityPlanView.mobileMapTitle')}</span>
            <button
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
              hotel={null}
              isLoaded={mapsLoaded}
            />
          </div>
        </div>
      )}

      {/* ══ ÜST BAR ══ */}
      <div className="shrink-0 border-b border-divider px-3 sm:px-5 py-3 flex items-center justify-between bg-surface">

        {/* Sol: Geri + Plan sahibi + Başlık */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/community')}
            className="w-8 h-8 rounded-xl hover:bg-surface-2 flex items-center justify-center text-text transition-colors shrink-0"
          >
            <ArrowLeft size={15} strokeWidth={2.5} />
          </button>

          {/* Plan sahibi avatarı */}
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent to-sage flex items-center justify-center overflow-hidden flex-shrink-0">
            {authorPhotoURL ? (
              <img src={authorPhotoURL} className="w-7 h-7 rounded-full object-cover" alt="" referrerPolicy="no-referrer" />
            ) : (
              <span className="text-white text-[9px] font-heading">{initials}</span>
            )}
          </div>

          <div className="min-w-0">
            <p className="text-[10px] text-muted leading-none truncate">{t('communityPlanView.byUser', { name: authorName })}</p>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-base text-text truncate">{plan.destination}</h1>
              <span className="text-xs text-muted font-medium shrink-0">• {t('communityPlanView.daysCount', { count: plan.dailyPlans.length })}</span>
              {meta?.tripPurpose && (
                <span className="hidden sm:inline text-[10px] font-bold bg-surface-2 text-muted px-1.5 py-0.5 rounded-full shrink-0">
                  {t(`communityPlanView.purposes.${meta.tripPurpose}`, { defaultValue: meta.tripPurpose })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Orta: Plan / Rehber / Seçimler sekmeleri */}
        <div className="hidden md:flex items-center gap-1 bg-surface-2 p-0.5 rounded-full">
          <button className="px-3.5 py-1.5 text-xs font-heading bg-surface rounded-full shadow-sm text-text">
            {t('communityPlanView.tabs.plan')}
          </button>
          {plan.cityGuide && (
            <button
              onClick={() => setGuideOpen(true)}
              className="px-3.5 py-1.5 text-xs font-heading text-muted hover:text-text transition-colors rounded-full"
            >
              {t('communityPlanView.tabs.guide')}
            </button>
          )}
          <button
            onClick={() => setSelectionsOpen(true)}
            className="flex items-center gap-1 px-3.5 py-1.5 text-xs font-heading text-muted hover:text-text transition-colors rounded-full"
          >
            <SlidersHorizontal size={11} strokeWidth={2.5} />
            {t('communityPlanView.tabs.selections')}
          </button>
        </div>

        {/* Sağ: Rehber/Seçimler (mobil) + maliyet + Tema */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile: Rehber + Seçimler butonları */}
          {plan.cityGuide && (
            <button
              onClick={() => setGuideOpen(true)}
              className="md:hidden w-8 h-8 rounded-xl border border-divider bg-surface flex items-center justify-center text-text hover:bg-surface-2 transition-colors"
              title={t('communityPlanView.tabs.guide')}
            >
              <Bus size={14} strokeWidth={2.5} />
            </button>
          )}
          <button
            onClick={() => setSelectionsOpen(true)}
            className="md:hidden w-8 h-8 rounded-xl border border-divider bg-surface flex items-center justify-center text-text hover:bg-surface-2 transition-colors"
            title={t('communityPlanView.tabs.selections')}
          >
            <SlidersHorizontal size={14} strokeWidth={2.5} />
          </button>
          {plan.totalEstimatedCost > 0 && (
            <div className="hidden md:flex items-center gap-1.5 text-xs">
              <span className="text-muted">{t('communityPlanView.total')}</span>
              <span className="font-heading text-text">
                {meta?.currencySymbol ?? '₺'}{plan.totalEstimatedCost.toLocaleString(localeCode)}
              </span>
            </div>
          )}
          <button
            onClick={(e) => toggleWithCircle(toggleTheme, e)}
            className="w-8 h-8 rounded-full border border-divider bg-surface flex items-center justify-center text-text hover:bg-surface-2 transition-colors shrink-0"
            title={dark ? t('communityPlanView.themeToggle.dark') : t('communityPlanView.themeToggle.light')}
          >
            <span key={dark ? 'moon' : 'sun'} className="theme-icon-in">
              {dark ? <Moon size={14} /> : <Sun size={14} />}
            </span>
          </button>
        </div>
      </div>

      {/* ══ ANA İÇERİK ══ */}
      <div ref={containerRef} className="flex-1 flex overflow-hidden min-h-0">

        {/* ── SOL PANEL ── */}
        <div
          className="flex flex-col border-r border-divider bg-bg transition-[width] duration-200 w-full lg:w-auto"
          style={window.innerWidth >= 1024 ? { width: `${leftWidthPct}%` } : undefined}
        >
          {/* Gün sekmeleri */}
          <div className="shrink-0 border-b border-divider px-5 py-2.5 bg-bg">
            <div className="flex items-center gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {plan.dailyPlans.map((day, index) => (
                  <button
                    key={day.dayNumber}
                    onClick={() => {
                      setActiveDayIndex(index);
                      setDaySummaryExpanded(false);
                      setSelectedPlace(null);
                    }}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-heading transition-all shrink-0 whitespace-nowrap border-[1.5px] ${
                      activeDayIndex === index
                        ? 'bg-accent text-white border-accent'
                        : 'bg-surface border-divider text-text hover:border-accent/40'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold ${
                      activeDayIndex === index ? 'bg-white/20 text-white' : 'bg-surface-2 text-muted'
                    }`}>
                      {day.dayNumber}
                    </span>
                    {day.date?.slice(5) ?? t('communityPlanView.dayFallback', { number: day.dayNumber })}
                    <span className={`text-[10px] font-normal ${activeDayIndex === index ? 'text-white/80' : 'text-muted'}`}>
                      ({day.activities.length})
                    </span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setShowMobileMap(true)}
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-accent px-3 font-heading text-[11px] text-white shadow-[0_5px_14px_rgba(198,113,57,0.22)] transition-colors hover:brightness-105 lg:hidden"
                aria-label={t('communityPlanView.mobileMapOpen')}
              >
                <Map size={13} strokeWidth={2.4} />
                {t('communityPlanView.mobileMapButton')}
              </button>
            </div>
          </div>

          {/* Gün özeti şeridi */}
          {activeDay && (
            <div className="shrink-0 px-5 py-3 border-b border-divider bg-surface">
              <div className="flex items-start justify-between gap-3">
                <p className="pt-0.5 text-[10px] text-muted">{activeDay.date}</p>
                <div className="shrink-0 text-right">
                  <p className="text-[10px] text-muted">{t('communityPlanView.estimated')}</p>
                  <p className="font-heading text-sm text-text">
                    {meta?.currencySymbol ?? '₺'}{activeDay.totalEstimatedCost.toLocaleString(localeCode)}
                  </p>
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
                      ? t('communityPlanView.readLess')
                      : t('communityPlanView.readMore')}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* DailyPlanView — Dashboard'la birebir aynı */}
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {activeDay ? <DailyPlanView day={activeDay} onActivityClick={setSelectedPlace} isLoaded={mapsLoaded} /> : null}
          </div>
        </div>

        {/* ── RESIZE HANDLE ── */}
        <div
          className="hidden lg:flex w-[5px] relative cursor-col-resize flex-shrink-0 bg-divider hover:bg-accent/40 transition-colors"
          onMouseDown={handleResizeMouseDown}
        />

        {/* ── SAĞ PANEL: Harita ── */}
        <div className="hidden lg:flex flex-1 relative">
          <MapView
            activities={activeDayActivities}
            onActivityClick={setSelectedPlace}
            hotel={null}
            isLoaded={mapsLoaded}
          />
          <div className="absolute top-3 right-3 bg-surface border border-divider rounded-xl shadow-sm px-3.5 py-2 flex items-center gap-2 z-[5]">
            <div className="w-1.5 h-1.5 bg-sage rounded-full" />
            <span className="text-xs font-heading text-text">
              {t('communityPlanView.placesCount', { count: activeDayActivities.length })}
            </span>
          </div>
        </div>
      </div>

    </div>

    {/* ── Mekan Detay Paneli ── */}
    <AnimatePresence>
      {selectedPlace && (
        <PlaceDetailsPanel
          key={`${selectedPlace.placeName}-${selectedPlace.lat}`}
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

export default CommunityPlanView;
