import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Bus, Users, Lightbulb, Map, X, Sun, Moon, Loader2, SlidersHorizontal,
} from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore';
import { toggleWithCircle } from '../utils/themeTransition';
import { usePlanStore } from '../store/usePlanStore';
import { useOnboardingStore } from '../store/useOnboardingStore';
import { getPublicPlanDetails, getPublicFeed } from '../services/socialService';
import type { PublicPlan } from '../services/socialService';
import type { TravelPlanResponse } from '../services/aiService';
import DailyPlanView from '../components/DailyPlanView';
import MapView from '../components/MapView';
import PlaceDetailsPanel from '../components/PlaceDetailsPanel';

const PURPOSE_LABELS: Record<string, string> = {
  culture:   'Kültür',
  relax:     'Dinlenme',
  nightlife: 'Gece Hayatı',
  nature:    'Macera',
};

const CommunityPlanView: React.FC = () => {
  const { planId }  = useParams<{ planId: string }>();
  const navigate    = useNavigate();
  const { dark, toggle: toggleTheme } = useThemeStore();

  /* ── Yükleme durumu ── */
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);
  const [meta, setMeta]         = useState<PublicPlan | null>(null);

  /* ── Dashboard ile aynı UI state'leri ── */
  const [activeDayIndex, setActiveDayIndex] = useState(0);
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
    if (!planId) { setError(true); setLoading(false); return; }

    // Mevcut store içeriğini sakla (unmount'ta geri yüklenecek)
    const prevPlan       = usePlanStore.getState().plan;
    const prevSavedId    = usePlanStore.getState().savedPlanId;
    const prevOnboarding = useOnboardingStore.getState().data;

    setLoading(true);
    Promise.all([
      getPublicPlanDetails(planId),
      getPublicFeed(50),
    ])
      .then(([planData, feed]: [TravelPlanResponse | null, PublicPlan[]]) => {
        if (!planData) { setError(true); return; }
        const planMeta = feed.find(p => p.id === planId) ?? null;
        setMeta(planMeta);
        setActiveDayIndex(0);

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
      .catch(() => setError(true))
      .finally(() => setLoading(false));

    // Unmount'ta orijinali geri yükle
    return () => {
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
  const initials = (meta?.userDisplayName ?? 'G')
    .split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase();

  /* ── Yükleniyor ── */
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#f5f0e8] dark:bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin text-[#f8981d]" />
          <p className="text-sm text-slate-500 font-medium">Plan yükleniyor…</p>
        </div>
      </div>
    );
  }

  /* ── Hata ── */
  if (error || !plan) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#f5f0e8] dark:bg-slate-900">
        <div className="text-center space-y-3 p-8">
          <p className="text-4xl">😕</p>
          <p className="text-base font-bold text-slate-700 dark:text-slate-200">Plan bulunamadı</p>
          <p className="text-sm text-slate-400">Bu plan kaldırılmış veya erişim izni yok.</p>
          <button
            onClick={() => navigate('/community')}
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#f8981d] hover:text-[#e08518]"
          >
            <ArrowLeft size={14} /> Topluluğa dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="h-screen flex flex-col bg-[#f5f0e8] dark:bg-slate-900 overflow-hidden">

      {/* ══ ŞEHİR REHBERİ DRAWER ══ */}
      {guideOpen && plan.cityGuide && (
        <div className="fixed inset-0 z-40 flex">
          <div className="hidden sm:flex flex-1 bg-black/30" onClick={() => setGuideOpen(false)} />
          <div className="w-full sm:w-80 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Şehir Rehberi</h2>
              <button
                onClick={() => setGuideOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Bus size={13} className="text-blue-500" />
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Ulaşım</h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{plan.cityGuide.transportationTips}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Users size={13} className="text-orange-500" />
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Yerel Kültür</h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{plan.cityGuide.localCustoms}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb size={13} className="text-emerald-500" />
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Faydalı Bilgiler</h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{plan.cityGuide.generalAdvice}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ SEÇİMLER DRAWER ══ */}
      {selectionsOpen && (
        <div className="fixed inset-0 z-40 flex">
          <div className="hidden sm:flex flex-1 bg-black/30" onClick={() => setSelectionsOpen(false)} />
          <div className="w-full sm:w-80 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Seyahat Seçimleri</h2>
              <button onClick={() => setSelectionsOpen(false)} className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 transition-colors">
                <X size={14} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {meta ? (() => {
                const TRAVEL_TYPE: Record<string, string> = {
                  solo_macera:    '🧍 Solo',
                  romantik:       '❤️ Romantik',
                  balayi:         '✨ Balayı',
                  aile:           '👨‍👩‍👧 Aile',
                  arkadas_grubu:  '👯 Arkadaşlar',
                  is_seyahati:    '💼 İş',
                  sehir_kacamagi: '☕ Kaçamak',
                  klasik_tatil:   '🗺️ Klasik',
                };
                const PACE: Record<string, string> = {
                  rahat:  '🛋️ Rahat',
                  normal: '🚶 Normal',
                  aktif:  '⚡ Aktif',
                  esnek:  '🧭 Esnek',
                };
                const PURPOSES: Record<string, string> = {
                  culture:   '🏛️ Kültür & Tarih',
                  relax:     '😴 Dinlenme',
                  nightlife: '🌙 Gece Hayatı',
                  nature:    '🏔️ Doğa & Macera',
                };
                const TRANSPORT: Record<string, string> = {
                  public: '🚇 Toplu Taşıma',
                  walk:   '🚶 Yürüyüş',
                  taxi:   '🚕 Taksi / Uber',
                  car:    '🚗 Araç',
                };
                const ACCOM: Record<string, string> = {
                  hotel:  '🏨 Otel',
                  airbnb: '🏠 Airbnb / Ev',
                  hostel: '🛏️ Hostel',
                  resort: '🌴 Tatil Köyü',
                };
                const FOOD: Record<string, string> = {
                  iconic:      '⭐ İkonik Lezzetler',
                  hidden_gems: '🗺️ Gizli Keşifler',
                  fine_dining: '🍷 Fine Dining',
                  street_food: '🌮 Sokak Yemeği',
                  mixed:       '🎲 Karışık / Sürpriz',
                };
                const rows: { label: string; value: string }[] = [];

                // Süre: gün sayısı (tarihleri değil)
                const dayCount = plan?.dailyPlans.length ?? meta.dailyPlanCount;
                if (dayCount)
                  rows.push({ label: 'Süre', value: `${dayCount} günlük` });
                if (meta.peopleCount)
                  rows.push({ label: 'Kişi Sayısı', value: `${meta.peopleCount} kişi` });
                if (meta.travelType)
                  rows.push({ label: 'Seyahat Türü', value: TRAVEL_TYPE[meta.travelType] ?? meta.travelType });
                if (meta.pace)
                  rows.push({ label: 'Tempo', value: PACE[meta.pace] ?? meta.pace });
                if (meta.earlyBird != null)
                  rows.push({ label: 'Sabah Kuşu', value: meta.earlyBird ? '✅ Evet' : '❌ Hayır' });
                if (meta.purposes?.length)
                  rows.push({ label: 'İlgi Alanları', value: meta.purposes.map(p => PURPOSES[p] ?? p).join(', ') });
                if (meta.accommodation)
                  rows.push({ label: 'Konaklama', value: ACCOM[meta.accommodation] ?? meta.accommodation });
                if (meta.transport)
                  rows.push({ label: 'Ulaşım', value: TRANSPORT[meta.transport] ?? meta.transport });
                if (meta.foodPhilosophy)
                  rows.push({ label: 'Yemek', value: FOOD[meta.foodPhilosophy] ?? meta.foodPhilosophy });
                if (meta.dietaryRestrictions?.length)
                  rows.push({ label: 'Beslenme', value: meta.dietaryRestrictions.join(', ') });

                if (rows.length === 0) return (
                  <div className="text-center py-8">
                    <p className="text-3xl mb-2">🔍</p>
                    <p className="text-sm text-slate-500">Bu plan için seçim bilgisi yok.</p>
                    <p className="text-xs text-slate-400 mt-1">Eski paylaşımlarda seçimler saklanmıyor.</p>
                  </div>
                );

                return (
                  <div className="space-y-3">
                    {rows.map(row => (
                      <div key={row.label} className="flex items-start justify-between gap-3 py-2.5 border-b border-slate-100 dark:border-slate-700 last:border-0">
                        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 shrink-0 w-28">{row.label}</span>
                        <span className="text-xs text-slate-700 dark:text-slate-200 text-right leading-relaxed">{row.value}</span>
                      </div>
                    ))}
                  </div>
                );
              })() : (
                <div className="text-center py-8">
                  <p className="text-sm text-slate-400">Yükleniyor…</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ MOBİL HARİTA MODALİ ══ */}
      {showMobileMap && (
        <div className="lg:hidden fixed inset-0 z-50 bg-white dark:bg-slate-900 flex flex-col">
          <div className="h-12 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
            <span className="font-semibold text-sm text-slate-900 dark:text-white">Rota Haritası</span>
            <button
              onClick={() => setShowMobileMap(false)}
              className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 min-h-0">
            <MapView activities={activeDayActivities} hotel={null} />
          </div>
        </div>
      )}

      {/* ══ ÜST BAR ══ */}
      <div className="shrink-0 border-b border-slate-200 dark:border-slate-700 px-3 sm:px-5 py-3 flex items-center justify-between bg-white dark:bg-slate-800">

        {/* Sol: Geri + Plan sahibi + Başlık */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/community')}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors shrink-0"
          >
            <ArrowLeft size={15} />
          </button>

          {/* Plan sahibi avatarı */}
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#f8981d] to-[#e08518] flex items-center justify-center overflow-hidden flex-shrink-0">
            {meta?.userPhotoURL ? (
              <img src={meta.userPhotoURL} className="w-7 h-7 rounded-full object-cover" alt="" referrerPolicy="no-referrer" />
            ) : (
              <span className="text-white text-[9px] font-black">{initials}</span>
            )}
          </div>

          <div className="min-w-0">
            <p className="text-[10px] text-slate-400 leading-none truncate">{meta?.userDisplayName ?? 'Gezgin'} tarafından</p>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 dark:text-white truncate">{plan.destination}</h1>
              <span className="text-xs text-slate-400 font-medium shrink-0">• {plan.dailyPlans.length} gün</span>
              {meta?.tripPurpose && (
                <span className="hidden sm:inline text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-1.5 py-0.5 rounded-full shrink-0">
                  {PURPOSE_LABELS[meta.tripPurpose] ?? meta.tripPurpose}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Orta: Plan / Rehber / Seçimler sekmeleri */}
        <div className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-700 p-0.5 rounded-lg">
          <button className="px-3 py-1 text-xs font-semibold bg-white dark:bg-slate-600 rounded-md shadow-sm text-slate-900 dark:text-white">
            Plan
          </button>
          {plan.cityGuide && (
            <button
              onClick={() => setGuideOpen(true)}
              className="px-3 py-1 text-xs font-semibold text-slate-500 dark:text-slate-300 hover:text-slate-700 dark:hover:text-white transition-colors rounded-md"
            >
              Rehber
            </button>
          )}
          <button
            onClick={() => setSelectionsOpen(true)}
            className="flex items-center gap-1 px-3 py-1 text-xs font-semibold text-slate-500 dark:text-slate-300 hover:text-slate-700 dark:hover:text-white transition-colors rounded-md"
          >
            <SlidersHorizontal size={11} />
            Seçimler
          </button>
        </div>

        {/* Sağ: Rehber/Seçimler (mobil) + maliyet + Tema */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile: Rehber + Seçimler butonları */}
          {plan.cityGuide && (
            <button
              onClick={() => setGuideOpen(true)}
              className="md:hidden w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
              title="Rehber"
            >
              <Bus size={14} />
            </button>
          )}
          <button
            onClick={() => setSelectionsOpen(true)}
            className="md:hidden w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
            title="Seçimler"
          >
            <SlidersHorizontal size={14} />
          </button>
          {plan.totalEstimatedCost > 0 && (
            <div className="hidden md:flex items-center gap-1.5 text-xs">
              <span className="text-slate-400">Toplam:</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {meta?.currencySymbol ?? '₺'}{plan.totalEstimatedCost.toLocaleString('tr-TR')}
              </span>
            </div>
          )}
          <button
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

      {/* ══ ANA İÇERİK ══ */}
      <div ref={containerRef} className="flex-1 flex overflow-hidden min-h-0">

        {/* ── SOL PANEL ── */}
        <div
          className="flex flex-col border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 transition-[width] duration-200 w-full lg:w-auto"
          style={window.innerWidth >= 1024 ? { width: `${leftWidthPct}%` } : undefined}
        >
          {/* Gün sekmeleri */}
          <div className="shrink-0 border-b border-slate-200 dark:border-slate-700 px-5 py-2.5 bg-slate-50/50 dark:bg-slate-800/50">
            <div className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {plan.dailyPlans.map((day, index) => (
                <button
                  key={day.dayNumber}
                  onClick={() => { setActiveDayIndex(index); setSelectedPlace(null); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all shrink-0 whitespace-nowrap ${
                    activeDayIndex === index
                      ? 'bg-[#f8981d] text-white'
                      : 'bg-white border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold ${
                    activeDayIndex === index ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                  }`}>
                    {day.dayNumber}
                  </span>
                  {day.date?.slice(5) ?? `Gün ${day.dayNumber}`}
                  <span className={`text-[10px] font-normal ${activeDayIndex === index ? 'text-orange-100' : 'text-slate-400'}`}>
                    ({day.activities.length})
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Gün özeti şeridi */}
          {activeDay && (
            <div className="shrink-0 px-5 py-3 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 mb-0.5">{activeDay.date}</p>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{activeDay.daySummary}</p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-[10px] text-slate-400">Tahmini</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {meta?.currencySymbol ?? '₺'}{activeDay.totalEstimatedCost.toLocaleString('tr-TR')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* DailyPlanView — Dashboard'la birebir aynı */}
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {activeDay ? <DailyPlanView day={activeDay} onActivityClick={setSelectedPlace} /> : null}
          </div>
        </div>

        {/* ── RESIZE HANDLE ── */}
        <div
          className="hidden lg:flex w-[5px] relative cursor-col-resize flex-shrink-0 bg-slate-200 dark:bg-slate-700 hover:bg-[#f8981d]/40 transition-colors"
          onMouseDown={handleResizeMouseDown}
        />

        {/* ── SAĞ PANEL: Harita ── */}
        <div className="hidden lg:flex flex-1 relative">
          <MapView
            activities={activeDayActivities}
            onActivityClick={setSelectedPlace}
            hotel={null}
          />
          <div className="absolute top-3 right-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm px-3 py-2 flex items-center gap-2 z-[5]">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              {activeDayActivities.length} mekan
            </span>
          </div>
        </div>
      </div>

      {/* Mobil harita FAB */}
      <button
        onClick={() => setShowMobileMap(true)}
        className="lg:hidden fixed bottom-4 right-4 z-30 w-12 h-12 bg-[#187fe7] text-white rounded-full shadow-lg flex items-center justify-center hover:bg-[#156bc2] transition-colors"
      >
        <Map size={18} />
      </button>

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
