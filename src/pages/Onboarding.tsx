import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Calendar, Heart, Utensils, Bed,
  ArrowRight, ArrowLeft, Check, Sparkles,
  Loader2, Plus, Minus, Plane, Search,
  Backpack, Users, PartyPopper, Briefcase, Coffee, Map,
  Footprints, Sunrise,
  Sofa, Mountain, Compass,
} from 'lucide-react';
import { useOnboardingStore, type OnboardingData } from '../store/useOnboardingStore';
import TravyonLogo from '../components/TravyonLogo';
import PlacesAutocomplete from '../components/PlacesAutocomplete';
import DateRangeCalendar from '../components/DateRangeCalendar';
import TimePicker from '../components/TimePicker';
import { generateTravelPlan } from '../services/aiService';
import { usePlanStore } from '../store/usePlanStore';
import { searchCities, type CityOption } from '../data/cities';
import { useAuthStore } from '../store/useAuthStore';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { CURRENCY_MAP } from '../store/useAppSettingsStore';

const getToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const today = getToday();
const ALL_EATER_OPTION = 'noRestriction';
const DIET_KEYS = ['vegan', 'vegetarian', 'halal', 'glutenFree', 'pescatarian', ALL_EATER_OPTION] as const;

const STEPS = [
  { id: 1, labelKey: 'destination', icon: MapPin },
  { id: 2, labelKey: 'preferences', icon: Heart },
  { id: 3, labelKey: 'food',        icon: Utensils },
  { id: 4, labelKey: 'stay',        icon: Bed },
] as const;

const toggleDietaryRestriction = (diet: string, current: string[]): string[] => {
  if (diet === ALL_EATER_OPTION) {
    return current.includes(ALL_EATER_OPTION) ? [] : [ALL_EATER_OPTION];
  }
  const withoutAll = current.filter((d) => d !== ALL_EATER_OPTION);
  return withoutAll.includes(diet)
    ? withoutAll.filter((d) => d !== diet)
    : [...withoutAll, diet];
};

/* ── Validation ── */
const validateStep = (step: number, data: OnboardingData, t: TFunction): string | null => {
  if (step === 1) {
    if (!data.destination.trim()) return t('onboarding.errors.destinationBanner');
    if (!data.startDate) return t('onboarding.errors.startDateRequired');
    if (!data.endDate) return t('onboarding.errors.endDateRequired');
    if (data.startDate < today) return t('onboarding.errors.startDateInPast');
    if (data.endDate < today) return t('onboarding.errors.endDateInPast');
    if (data.startDate >= data.endDate) return t('onboarding.errors.endBeforeStart');
    if (data.budget < 100) return t('onboarding.errors.budgetTooLowBanner');
  }
  if (step === 2) {
    if (!data.travelType) return t('onboarding.errors.travelTypeRequired');
    const effectivePurposes = data.purposes && data.purposes.length > 0
      ? data.purposes : (data.tripPurpose ? [data.tripPurpose] : []);
    if (effectivePurposes.length === 0) return t('onboarding.errors.interestRequired');
    if (!data.pace) return t('onboarding.errors.paceRequired');
  }
  if (step === 3) {
    if (data.dietaryRestrictions.length === 0) return t('onboarding.errors.dietaryRequired');
    if (!data.foodPhilosophy) return t('onboarding.errors.foodPhilosophyRequired');
    if (!data.mealBudget) return t('onboarding.errors.mealBudgetRequired');
  }
  if (step === 4) {
    if (data.hasReservation === null) return t('onboarding.errors.reservationRequired');
    if (data.hasReservation === true && !data.accommodationAddress.trim()) return t('onboarding.errors.accommodationAddressRequired');
    if (data.hasReservation === false && !data.accommodation) return t('onboarding.errors.accommodationRequired');
    if (!data.transport) return t('onboarding.errors.transportRequiredBanner');
  }
  return null;
};

const validateAll = (data: OnboardingData, t: TFunction): string | null => {
  for (let s = 1; s <= 4; s++) {
    const err = validateStep(s, data, t);
    if (err) return err;
  }
  return null;
};

/* ── Field-level hints ── */
type FieldHints = {
  destination: boolean; startDate: boolean; endDate: boolean; budget: boolean;
  travelType: boolean; tripPurpose: boolean; pace: boolean;
  dietary: boolean; foodPhilosophy: boolean; mealBudget: boolean;
  accommodation: boolean; transport: boolean;
};
const EMPTY_HINTS: FieldHints = {
  destination: false, startDate: false, endDate: false, budget: false,
  travelType: false, tripPurpose: false, pace: false,
  dietary: false, foodPhilosophy: false, mealBudget: false,
  accommodation: false, transport: false,
};
const hintsForStep = (step: number, data: OnboardingData): FieldHints => {
  const h = { ...EMPTY_HINTS };
  if (step === 1) {
    h.destination = !data.destination.trim();
    h.startDate = !data.startDate || data.startDate < today || data.startDate >= data.endDate;
    h.endDate   = !data.endDate   || data.endDate   < today || data.startDate >= data.endDate;
    h.budget    = data.budget < 100;
  }
  if (step === 2) {
    const effectivePurposes = data.purposes && data.purposes.length > 0
      ? data.purposes : (data.tripPurpose ? [data.tripPurpose] : []);
    h.travelType  = !data.travelType;
    h.tripPurpose = effectivePurposes.length === 0;
    h.pace        = !data.pace;
  }
  if (step === 3) {
    h.dietary        = data.dietaryRestrictions.length === 0;
    h.foodPhilosophy = !data.foodPhilosophy;
    h.mealBudget     = !data.mealBudget;
  }
  if (step === 4) {
    h.accommodation = data.hasReservation === null
      || (data.hasReservation === true  && !data.accommodationAddress.trim())
      || (data.hasReservation === false && !data.accommodation);
    h.transport = !data.transport;
  }
  return h;
};

/* ── Shared sub-components ── */
const FieldError = ({ msg }: { msg?: string }) =>
  msg ? <p className="text-xs text-rose-500 mt-1.5 ml-0.5">{msg}</p> : null;

const MAX_PEOPLE = 15;

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════ */
const Onboarding: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { currentStep, data, nextStep, prevStep, updateData, setStep, resetForm } = useOnboardingStore();
  const { setPlan } = usePlanStore();
  const { user } = useAuthStore();

  // Sayfaya her girişte formu sıfırla — önceki planın seçimleri kalmasın
  useEffect(() => {
    resetForm();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ayarlar'dan kaydedilen varsayılan değerleri yükle (sadece form boşsa uygula)
  useEffect(() => {
    if (!user || data.destination !== '') return; // form zaten doldurulmuşsa dokunma
    getDoc(doc(db, 'users', user.uid)).then((snap) => {
      if (!snap.exists()) return;
      const d = snap.data();
      const updates: Partial<OnboardingData> = {};
      if (d.defaultBudget)      updates.budget      = Number(d.defaultBudget);
      if (d.defaultPeopleCount) updates.peopleCount  = Number(d.defaultPeopleCount);
      if (d.defaultPace)        updates.pace         = d.defaultPace as string;
      if (d.defaultCurrency) {
        const curr = CURRENCY_MAP[d.defaultCurrency as string];
        if (curr) { updates.currencyCode = curr.code; updates.currencySymbol = curr.symbol; }
      }
      if (Object.keys(updates).length > 0) updateData(updates);
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadingMessages = t('onboarding.loadingMessages', { returnObjects: true }) as string[];

  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingIdx, setLoadingIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hints, setHints] = useState<FieldHints>(EMPTY_HINTS);
  const [allCompleted, setAllCompleted] = useState(false);
  const [purposesWarning, setPurposesWarning] = useState(false);

  /* Destination autocomplete */
  const [citySuggestions, setCitySuggestions] = useState<CityOption[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const destinationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (destinationRef.current && !destinationRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  /* Tarih aralığı takvimi — clipping sorunlarından kaçınmak için portal ile document.body'ye render edilir */
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarPos, setCalendarPos] = useState<{ top: number; left: number } | null>(null);
  const dateTriggerRef = useRef<HTMLButtonElement>(null);
  const calendarPopoverRef = useRef<HTMLDivElement>(null);

  const CALENDAR_WIDTH = 248;

  const openCalendar = () => {
    const rect = dateTriggerRef.current?.getBoundingClientRect();
    if (rect) {
      const left = rect.left + rect.width / 2 - CALENDAR_WIDTH / 2;
      setCalendarPos({ top: rect.bottom - 28, left: Math.max(8, left) });
    }
    setShowCalendar((v) => !v);
  };

  useEffect(() => {
    if (!showCalendar) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        dateTriggerRef.current && !dateTriggerRef.current.contains(target) &&
        calendarPopoverRef.current && !calendarPopoverRef.current.contains(target)
      ) {
        setShowCalendar(false);
      }
    };
    const closeOnScroll = () => setShowCalendar(false);
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('scroll', closeOnScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('scroll', closeOnScroll, true);
    };
  }, [showCalendar]);

  const handleDateRangeChange = (newStart: string, newEnd: string) => {
    updateData({ startDate: newStart, endDate: newEnd });
    setHints((h) => ({ ...h, startDate: false, endDate: false }));
    if (newStart && newEnd) setShowCalendar(false);
  };

  const handleDateRangeClear = () => updateData({ startDate: '', endDate: '' });

  const formatDisplayDate = (dateStr: string): string => {
    if (!dateStr) return t('onboarding.step1.calendar.selectDate');
    const d = new Date(dateStr + 'T00:00:00');
    return new Intl.DateTimeFormat(i18n.language === 'en' ? 'en-US' : 'tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
  };

  /* Varış/Ayrılış saat seçici — aynı portal deseni, tek popover iki alan arasında paylaşılır */
  const [openTimeField, setOpenTimeField] = useState<'arrival' | 'departure' | null>(null);
  const [timePickerPos, setTimePickerPos] = useState<{ top: number; left: number } | null>(null);
  const arrivalTriggerRef = useRef<HTMLButtonElement>(null);
  const departureTriggerRef = useRef<HTMLButtonElement>(null);
  const timePickerPopoverRef = useRef<HTMLDivElement>(null);

  const TIME_PICKER_WIDTH = 136;

  const openTimePicker = (field: 'arrival' | 'departure') => {
    const triggerRef = field === 'arrival' ? arrivalTriggerRef : departureTriggerRef;
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const left = rect.right - TIME_PICKER_WIDTH;
      setTimePickerPos({ top: rect.bottom - 15, left: Math.max(8, left) });
    }
    setOpenTimeField((cur) => (cur === field ? null : field));
  };

  useEffect(() => {
    if (!openTimeField) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      const triggerRef = openTimeField === 'arrival' ? arrivalTriggerRef : departureTriggerRef;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        timePickerPopoverRef.current && !timePickerPopoverRef.current.contains(target)
      ) {
        setOpenTimeField(null);
      }
    };
    // Not: TimePicker açılışta seçili saate scrollIntoView yapıyor — bu kendi içindeki
    // bir 'scroll' event'i tetikler ve capture-phase listener'a yakalanır. Popover içinden
    // gelen scroll'ları yok sayarak açılır açılmaz kapanmasını önlüyoruz.
    const closeOnScroll = (e: Event) => {
      if (timePickerPopoverRef.current && e.target instanceof Node && timePickerPopoverRef.current.contains(e.target)) {
        return;
      }
      setOpenTimeField(null);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('scroll', closeOnScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('scroll', closeOnScroll, true);
    };
  }, [openTimeField]);

  const handleDestinationChange = (val: string) => {
    updateData({ destination: val });
    setHints((h) => ({ ...h, destination: false }));
    setCitySuggestions(searchCities(val));
    setShowSuggestions(val.trim().length > 0);
  };

  const handleCitySelect = (c: CityOption) => {
    updateData({ destination: `${c.city}, ${c.country}` });
    setHints((h) => ({ ...h, destination: false }));
    setShowSuggestions(false);
    setCitySuggestions([]);
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setError(null); setHints(EMPTY_HINTS); }, [currentStep]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!isGenerating) { setLoadingIdx(0); return; }
    const interval = setInterval(() => setLoadingIdx((p) => (p + 1) % loadingMessages.length), 3000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGenerating]);

  const handleNext = () => {
    const err = validateStep(currentStep, data, t);
    if (err) { setError(err); setHints(hintsForStep(currentStep, data)); return; }
    setError(null); setHints(EMPTY_HINTS);
    nextStep();
  };

  const handleBack = () => { setError(null); setHints(EMPTY_HINTS); prevStep(); };

  const handleFinish = async () => {
    const err = validateAll(data, t);
    if (err) { setError(err); setHints(hintsForStep(currentStep, data)); return; }
    try {
      setError(null); setHints(EMPTY_HINTS); setAllCompleted(true); setIsGenerating(true);
      let applied = false;
      const planLang = i18n.language === 'en' ? 'en' : 'tr';
      const plan = await generateTravelPlan(data, (partial) => { if (applied) setPlan(partial); }, planLang);
      setPlan(plan); applied = true;
      setStep(1);           // Sadece adımı sıfırla — konaklama verisi Dashboard'da gerekli
      navigate('/dashboard');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('onboarding.errors.genericGenerationError'));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-screen bg-bg flex overflow-hidden">

      {/* ═══ SOL — VİDEO ═══ */}
      <div className="hidden lg:flex lg:w-2/5 relative overflow-hidden shrink-0">

        {/* Fallback gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#2b241d] via-[#211c17] to-[#2b241d]" />

        <video
          autoPlay loop muted playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/videos/onboarding.mp4" type="video/mp4" />
        </video>

        <div className="absolute inset-0 bg-gradient-to-b from-[#1c140c]/40 via-[#1c140c]/25 to-[#1c140c]/72" />

        <div className="relative z-10 flex flex-col justify-end p-10 w-full">

          {/* Adıma özel mesaj */}
          <motion.div key={currentStep} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="inline-flex items-center gap-2 px-3.5 py-[7px] bg-white/16 backdrop-blur-md border border-white/25 rounded-full mb-5">
              <Sparkles size={11} className="text-white" />
              <span className="text-white text-[11px] font-heading uppercase tracking-widest">{t('onboarding.badge')}</span>
            </div>

            <div className="text-4xl mb-4">
              {currentStep === 1 && '🌍'}
              {currentStep === 2 && '✨'}
              {currentStep === 3 && '🍽️'}
              {currentStep === 4 && '🏨'}
            </div>

            <h1 className="font-heading text-3xl text-white mb-3 leading-tight whitespace-pre-line">
              {t(`onboarding.sidebar.step${currentStep}.title`)}
            </h1>
            <p className="text-white/75 text-sm leading-relaxed max-w-xs">
              {t(`onboarding.sidebar.step${currentStep}.desc`)}
            </p>
          </motion.div>

        </div>
      </div>

      {/* ═══ SAĞ — FORM ═══ */}
      <div className="flex-1 flex flex-col h-screen min-w-0 relative">

        {/* Loading overlay — tüm sağ paneli kaplar, scroll edilemez */}
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-bg px-8 text-center"
          >
            <div className="relative w-20 h-20 mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-accent-200" />
              <div className="absolute inset-0 rounded-full border-4 border-accent border-t-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-2xl">✈️</div>
            </div>
            <h3 className="font-heading text-2xl text-text mb-2">{t('onboarding.loadingTitle')}</h3>
            <p className="text-sm text-muted mb-6 max-w-xs leading-relaxed">
              {t('onboarding.loadingSubtitle')}
            </p>
            <div className="bg-accent-100 border border-accent-200 rounded-full px-5 py-2.5 min-w-[220px]">
              <AnimatePresence mode="wait">
                <motion.p
                  key={loadingIdx}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                  className="text-sm text-accent-700 font-semibold"
                >
                  {loadingMessages[loadingIdx]}
                </motion.p>
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* Üst bar — step indikatörleri */}
        <div className="shrink-0 px-4 sm:px-8 lg:px-12 pt-4 pb-3 border-b border-divider">

          {/* Mobil logo */}
          <div className="lg:hidden mb-3">
            <TravyonLogo size={64} />
          </div>

          <div className="flex items-center max-w-2xl">
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              const active    = currentStep === step.id && !allCompleted;
              const completed = currentStep > step.id || allCompleted;
              return (
                <React.Fragment key={step.id}>
                  <div className="flex flex-col items-center gap-1.5 shrink-0">
                    <div className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all duration-300
                      ${completed  ? 'bg-sage text-white'
                      : active     ? 'bg-accent text-white shadow-[0_10px_22px_rgba(198,113,57,0.28)]'
                                   : 'bg-surface-2 text-muted'}`}>
                      {completed ? <Check size={15} strokeWidth={3} /> : <Icon size={15} strokeWidth={2.5} />}
                    </div>
                    <span className={`text-[11px] font-heading transition-colors
                      ${active ? 'text-accent' : completed ? 'text-sage-700' : 'text-muted'}`}>
                      {t(`onboarding.steps.${step.labelKey}`)}
                    </span>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div className={`h-px flex-1 mx-2 mb-[18px] transition-all duration-500
                      ${currentStep > step.id ? 'bg-sage' : 'bg-divider'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Thin progress bar */}
          <div className="mt-3 h-px bg-divider rounded-full overflow-hidden max-w-2xl">
            <motion.div
              className="h-full bg-accent"
              animate={{ width: `${(currentStep / 4) * 100}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Form alanı */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 lg:px-12 py-8">

          <div className="max-w-2xl" aria-hidden={isGenerating || undefined}>

            {/* Hata */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className="flex items-center gap-2.5 p-3 mb-5 bg-rose-50 border border-rose-100 rounded-2xl"
                >
                  <div className="w-5 h-5 bg-rose-100 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-rose-500 text-xs font-black">!</span>
                  </div>
                  <p className="text-rose-600 text-sm font-medium">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {/* ── Adım Başlığı ── */}
                <div className="mb-8">
                  <p className="text-[11px] font-heading text-accent uppercase tracking-widest mb-2.5">
                    {t('onboarding.stepCounter', { step: currentStep })}
                  </p>
                  <h2 className="font-heading text-2xl text-text mb-1.5 leading-tight">
                    {t(`onboarding.stepHeader.step${currentStep}.title`)}
                  </h2>
                  <p className="text-sm text-muted leading-relaxed">
                    {t(`onboarding.stepHeader.step${currentStep}.desc`)}
                  </p>
                </div>

                {/* ── ADIM 1 ── */}
                {currentStep === 1 && (
                  <div className="space-y-5">

                    {/* Destinasyon */}
                    <div>
                      <p className="text-[11px] font-heading uppercase tracking-widest text-muted mb-2.5">{t('onboarding.step1.destinationLabel')}</p>
                      <div className="relative" ref={destinationRef}>
                        <Search size={15} strokeWidth={2.5} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none z-10" />
                        <input
                          type="text"
                          value={data.destination}
                          onChange={(e) => handleDestinationChange(e.target.value)}
                          onFocus={() => { if (data.destination.trim().length > 0) setShowSuggestions(true); }}
                          placeholder={t('onboarding.step1.destinationPlaceholder')}
                          className={`w-full pl-10 pr-4 py-3.5 rounded-2xl border-[1.5px] text-sm outline-none transition-all text-text placeholder:text-muted
                            ${hints.destination
                              ? 'border-rose-300 bg-rose-50/20'
                              : 'border-divider bg-surface-2 focus:border-accent'}`}
                          autoComplete="off"
                        />
                        {showSuggestions && citySuggestions.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1.5 bg-surface border border-divider rounded-2xl shadow-xl z-50 overflow-hidden">
                            {citySuggestions.map((c, i) => (
                              <button
                                key={i}
                                type="button"
                                onMouseDown={(e) => { e.preventDefault(); handleCitySelect(c); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface-2 transition-colors text-left"
                              >
                                <MapPin size={13} strokeWidth={2.5} className="text-accent shrink-0" />
                                <span className="text-sm font-semibold text-text">{c.city}</span>
                                <span className="text-xs text-muted ml-auto shrink-0">{c.country}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <FieldError msg={hints.destination ? t('onboarding.errors.destinationField') : undefined} />
                    </div>

                    {/* Tarihler + Saatler — tek kutucuk, gidiş/dönüş yan yana */}
                    <div className="rounded-2xl border border-divider overflow-hidden">
                      {/* Başlık şeridi */}
                      <div className="bg-surface-2 px-4 py-2.5 border-b border-divider">
                        <p className="text-[11px] font-heading uppercase tracking-widest text-muted flex items-center gap-1.5">
                          <Calendar size={11} strokeWidth={2.5} className="text-accent" /> {t('onboarding.step1.travelDates')}
                        </p>
                      </div>

                      <div className="bg-surface divide-y divide-divider">
                        {/* Gidiş + Dönüş — tek satır, iki sütun */}
                        <button
                          type="button"
                          ref={dateTriggerRef}
                          onClick={openCalendar}
                          className={`w-full grid grid-cols-2 text-left ${(hints.startDate || hints.endDate) ? 'bg-rose-50/50' : ''}`}
                        >
                          <div className="px-4 py-3 border-r border-divider">
                            <p className="text-[10px] text-muted mb-0.5">{t('onboarding.step1.departure')}</p>
                            <p className={`text-[14.5px] ${data.startDate ? 'text-text' : 'text-muted'}`}>{formatDisplayDate(data.startDate)}</p>
                          </div>
                          <div className="px-4 py-3">
                            <p className="text-[10px] text-muted mb-0.5">{t('onboarding.step1.return')}</p>
                            <p className={`text-[14.5px] ${data.endDate ? 'text-text' : 'text-muted'}`}>{formatDisplayDate(data.endDate)}</p>
                          </div>
                        </button>

                        {/* Varış Saati */}
                        <button
                          type="button"
                          ref={arrivalTriggerRef}
                          onClick={() => openTimePicker('arrival')}
                          className="w-full flex items-center px-4 py-3.5 text-left hover:bg-surface-2/50 transition-colors"
                        >
                          <span className="text-[14.5px] text-text w-24 shrink-0">{t('onboarding.step1.arrival')}</span>
                          <span className="flex-1 text-[14.5px] text-text text-right">{data.arrivalTime}</span>
                        </button>

                        {/* Ayrılış Saati */}
                        <button
                          type="button"
                          ref={departureTriggerRef}
                          onClick={() => openTimePicker('departure')}
                          className="w-full flex items-center px-4 py-3.5 text-left hover:bg-surface-2/50 transition-colors"
                        >
                          <span className="text-[14.5px] text-text w-24 shrink-0">{t('onboarding.step1.departureTime')}</span>
                          <span className="flex-1 text-[14.5px] text-text text-right">{data.departureTime}</span>
                        </button>
                      </div>

                      {showCalendar && calendarPos && createPortal(
                        <div
                          ref={calendarPopoverRef}
                          style={{ position: 'fixed', top: calendarPos.top, left: calendarPos.left, zIndex: 100 }}
                        >
                          <DateRangeCalendar
                            startDate={data.startDate}
                            endDate={data.endDate}
                            minDate={today}
                            onChange={handleDateRangeChange}
                            onClear={handleDateRangeClear}
                          />
                        </div>,
                        document.body
                      )}

                      {openTimeField && timePickerPos && createPortal(
                        <div
                          ref={timePickerPopoverRef}
                          style={{ position: 'fixed', top: timePickerPos.top, left: timePickerPos.left, zIndex: 100 }}
                        >
                          <TimePicker
                            value={openTimeField === 'arrival' ? data.arrivalTime : data.departureTime}
                            onChange={(val) =>
                              updateData(openTimeField === 'arrival' ? { arrivalTime: val } : { departureTime: val })
                            }
                          />
                        </div>,
                        document.body
                      )}

                      {/* Hata mesajları */}
                      {(hints.startDate || hints.endDate) && (
                        <div className="bg-rose-50 px-4 py-2 border-t border-rose-100">
                          {hints.startDate && <p className="text-xs text-rose-500">{t('onboarding.errors.startDateRequired')}</p>}
                          {hints.endDate   && <p className="text-xs text-rose-500">{t('onboarding.errors.endDateRequired')}</p>}
                        </div>
                      )}
                    </div>

                    {/* Kişi + Bütçe */}
                    <div className="grid grid-cols-2 gap-4 items-start">
                      <div>
                        <p className="text-[11px] font-heading uppercase tracking-widest text-muted mb-3">{t('onboarding.step1.peopleCount')}</p>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => updateData({ peopleCount: Math.max(1, data.peopleCount - 1) })}
                            className="w-9 h-9 rounded-2xl border-[1.5px] border-divider flex items-center justify-center text-text hover:border-accent/40 transition-all"
                          >
                            <Minus size={14} strokeWidth={2.5} />
                          </button>
                          <div className="flex-1 text-center">
                            <span className="font-heading text-2xl text-text tabular-nums">{data.peopleCount}</span>
                            <span className="text-xs text-muted ml-1">{t('onboarding.step1.person')}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => updateData({ peopleCount: Math.min(MAX_PEOPLE, data.peopleCount + 1) })}
                            className="w-9 h-9 rounded-2xl border-[1.5px] border-accent flex items-center justify-center text-accent hover:bg-accent-100 transition-all"
                          >
                            <Plus size={14} strokeWidth={2.5} />
                          </button>
                        </div>
                      </div>

                      <div>
                        <p className="text-[11px] font-heading uppercase tracking-widest text-muted mb-3">{t('onboarding.step1.totalBudget')}</p>
                        <div className={`flex rounded-2xl overflow-hidden border-[1.5px] transition-all
                          ${hints.budget ? 'border-rose-300' : 'border-divider focus-within:border-accent'}`}>
                          <input
                            type="number" min="100"
                            placeholder="15000"
                            value={data.budget === 0 ? '' : data.budget}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v === '') { updateData({ budget: 0 }); return; }
                              const n = parseInt(v, 10);
                              if (!isNaN(n)) { updateData({ budget: n }); setHints((h) => ({ ...h, budget: false })); }
                            }}
                            className="flex-1 px-3 py-3 border-0 outline-none text-sm text-text bg-surface-2 placeholder:text-muted"
                          />
                          <select
                            value={data.currencyCode}
                            onChange={(e) => {
                              const code = e.target.value;
                              const symbols: Record<string, string> = { TRY: '₺', USD: '$', EUR: '€', GBP: '£' };
                              updateData({ currencyCode: code, currencySymbol: symbols[code] || '₺' });
                            }}
                            className="px-2 py-3 border-l border-divider bg-surface-2 text-muted text-xs outline-none"
                          >
                            <option value="TRY">TRY</option>
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                            <option value="GBP">GBP</option>
                          </select>
                        </div>
                        <FieldError msg={hints.budget ? t('onboarding.errors.budgetTooLowField') : undefined} />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── ADIM 2 ── */}
                {currentStep === 2 && (
                  <div className="space-y-6">

                    {/* Seyahat Türü */}
                    <div>
                      <p className="text-[11px] font-heading uppercase tracking-widest text-muted mb-3">{t('onboarding.step2.travelType')}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {([
                          { val: 'solo_macera',    Icon: Backpack,    labelKey: 'solo' },
                          { val: 'romantik',       Icon: Heart,       labelKey: 'romantic' },
                          { val: 'balayi',         Icon: Sparkles,    labelKey: 'honeymoon' },
                          { val: 'aile',           Icon: Users,       labelKey: 'family' },
                          { val: 'arkadas_grubu',  Icon: PartyPopper, labelKey: 'friends' },
                          { val: 'is_seyahati',    Icon: Briefcase,   labelKey: 'business' },
                          { val: 'sehir_kacamagi', Icon: Coffee,      labelKey: 'cityEscape' },
                          { val: 'klasik_tatil',   Icon: Map,         labelKey: 'classic' },
                        ] as const).map(({ val, Icon, labelKey }) => {
                          const selected = data.travelType === val;
                          return (
                            <button
                              key={val}
                              type="button"
                              onClick={() => { updateData({ travelType: val }); setHints((h) => ({ ...h, travelType: false })); }}
                              className={`flex flex-col items-center gap-2 py-3 px-1 rounded-2xl border-2 transition-all duration-150
                                ${selected
                                  ? 'border-accent bg-accent-100'
                                  : 'border-divider bg-surface hover:border-accent/45'}`}
                            >
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${selected ? 'bg-accent-200' : 'bg-surface-2'}`}>
                                <Icon size={17} strokeWidth={2.5} className={selected ? 'text-accent-700' : 'text-muted'} />
                              </div>
                              <span className={`text-[10px] font-heading leading-tight text-center ${selected ? 'text-accent-700' : 'text-text'}`}>
                                {t(`onboarding.step2.travelTypes.${labelKey}`)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <FieldError msg={hints.travelType ? t('onboarding.errors.travelTypeRequired') : undefined} />
                    </div>

                    {/* İlgi Alanları */}
                    <div>
                      <p className="text-[11px] font-heading uppercase tracking-widest text-muted mb-1">{t('onboarding.step2.interests')}</p>
                      <p className="text-[11px] text-muted mb-3">{t('onboarding.step2.interestsHint')}</p>
                      <div className="grid grid-cols-2 gap-2.5">
                        {[
                          { val: 'culture',   emoji: '🏛️' },
                          { val: 'relax',     emoji: '😴' },
                          { val: 'nightlife', emoji: '🌙' },
                          { val: 'nature',    emoji: '🏔️' },
                        ].map(({ val, emoji }) => {
                          const currentPurposes: string[] = data.purposes && data.purposes.length > 0
                            ? data.purposes
                            : (data.tripPurpose ? [data.tripPurpose] : []);
                          const rank = currentPurposes.indexOf(val);
                          const isSelected = rank !== -1;
                          return (
                            <button
                              key={val}
                              type="button"
                              onClick={() => {
                                const cur: string[] = data.purposes && data.purposes.length > 0
                                  ? data.purposes
                                  : (data.tripPurpose ? [data.tripPurpose] : []);
                                if (isSelected) {
                                  const next = cur.filter((p) => p !== val);
                                  updateData({ purposes: next, tripPurpose: next[0] ?? '' });
                                  setHints((h) => ({ ...h, tripPurpose: false }));
                                  setPurposesWarning(false);
                                } else if (cur.length >= 3) {
                                  setPurposesWarning(true);
                                  setTimeout(() => setPurposesWarning(false), 2500);
                                } else {
                                  const next = [...cur, val];
                                  updateData({ purposes: next, tripPurpose: next[0] });
                                  setHints((h) => ({ ...h, tripPurpose: false }));
                                  setPurposesWarning(false);
                                }
                              }}
                              className={`relative flex items-center gap-3 px-4 py-3 rounded-2xl border-2 text-left transition-all duration-150
                                ${isSelected
                                  ? 'border-accent bg-accent-100'
                                  : 'border-divider bg-surface hover:border-accent/45'}`}
                            >
                              <span className="text-xl shrink-0 leading-none">{emoji}</span>
                              <div className="flex-1 min-w-0">
                                <p className={`font-semibold text-sm leading-tight ${isSelected ? 'text-accent-700' : 'text-text'}`}>{t(`onboarding.step2.interestOptions.${val}.title`)}</p>
                                <p className="text-[11px] text-muted mt-0.5 leading-tight">{t(`onboarding.step2.interestOptions.${val}.sub`)}</p>
                              </div>
                              {isSelected && (
                                <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center shrink-0 text-white text-xs font-black">
                                  {rank + 1}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      <AnimatePresence>
                        {purposesWarning && (
                          <motion.p
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.18 }}
                            className="text-xs text-amber-600 mt-1.5 ml-0.5 font-medium"
                          >
                            {t('onboarding.step2.maxInterestsWarning')}
                          </motion.p>
                        )}
                      </AnimatePresence>
                      <FieldError msg={hints.tripPurpose ? t('onboarding.errors.interestRequired') : undefined} />
                    </div>

                    {/* Tempo */}
                    <div>
                      <p className="text-[11px] font-heading uppercase tracking-widest text-muted mb-1">{t('onboarding.step2.pace')}</p>
                      <p className="text-[11px] text-muted mb-3">{t('onboarding.step2.paceHint')}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {([
                          { val: 'rahat',  Icon: Sofa,       labelKey: 'relaxed'  },
                          { val: 'normal', Icon: Footprints, labelKey: 'normal'   },
                          { val: 'aktif',  Icon: Mountain,   labelKey: 'active'   },
                          { val: 'esnek',  Icon: Compass,    labelKey: 'flexible' },
                        ] as const).map(({ val, Icon, labelKey }) => {
                          const selected = data.pace === val;
                          return (
                            <button
                              key={val}
                              type="button"
                              onClick={() => { updateData({ pace: val }); setHints((h) => ({ ...h, pace: false })); }}
                              className={`flex flex-col items-center gap-2 py-4 px-2 rounded-2xl border-2 text-center transition-all duration-150
                                ${selected
                                  ? 'border-accent bg-accent-100'
                                  : 'border-divider bg-surface hover:border-accent/45'}`}
                            >
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${selected ? 'bg-accent-200' : 'bg-surface-2'}`}>
                                <Icon size={17} strokeWidth={2.5} className={selected ? 'text-accent-700' : 'text-muted'} />
                              </div>
                              <div>
                                <p className={`font-heading text-xs ${selected ? 'text-accent-700' : 'text-text'}`}>{t(`onboarding.step2.paceOptions.${labelKey}.title`)}</p>
                                <p className={`text-[10px] mt-0.5 leading-tight ${selected ? 'text-accent-700/70' : 'text-muted'}`}>{t(`onboarding.step2.paceOptions.${labelKey}.desc`)}</p>
                                <p className="text-[10px] text-muted mt-0.5">{t(`onboarding.step2.paceOptions.${labelKey}.detail`)}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      <FieldError msg={hints.pace ? t('onboarding.errors.paceRequired') : undefined} />
                    </div>

                    {/* Erken Kalkmayı Severim — Toggle */}
                    <button
                      type="button"
                      onClick={() => updateData({ earlyBird: !data.earlyBird })}
                      className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-colors
                        ${data.earlyBird ? 'border-accent bg-accent-100' : 'border-divider bg-surface hover:border-accent/45'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${data.earlyBird ? 'bg-accent-200' : 'bg-surface-2'}`}>
                          <Sunrise size={17} strokeWidth={2.5} className={data.earlyBird ? 'text-accent-700' : 'text-muted'} />
                        </div>
                        <div className="text-left">
                          <p className={`text-sm font-semibold ${data.earlyBird ? 'text-accent-700' : 'text-text'}`}>{t('onboarding.step2.earlyBirdTitle')}</p>
                          <p className="text-[11px] text-muted mt-0.5">{t('onboarding.step2.earlyBirdSub')}</p>
                        </div>
                      </div>
                      <div className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out
                        ${data.earlyBird ? 'bg-accent' : 'bg-divider'}`}>
                        <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out
                          ${data.earlyBird ? 'translate-x-5' : 'translate-x-0'}`} />
                      </div>
                    </button>


                  </div>
                )}

                {/* ── ADIM 3 ── */}
                {currentStep === 3 && (
                  <div className="space-y-6">

                    {/* Beslenme Tercihleri */}
                    <div>
                      <p className="text-[11px] font-heading uppercase tracking-widest text-muted mb-3">{t('onboarding.step3.dietaryTitle')}</p>
                      <div className="grid grid-cols-3 gap-2">
                        {DIET_KEYS.map((diet) => {
                          const selected = data.dietaryRestrictions.includes(diet);
                          return (
                            <button
                              key={diet}
                              type="button"
                              onClick={() => {
                                updateData({ dietaryRestrictions: toggleDietaryRestriction(diet, data.dietaryRestrictions) });
                                setHints((h) => ({ ...h, dietary: false }));
                              }}
                              className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl border-2 transition-all duration-150
                                ${selected
                                  ? 'border-accent bg-accent-100'
                                  : 'border-divider bg-surface hover:border-accent/45'}`}
                            >
                              <span className="text-base leading-none shrink-0">{t(`onboarding.step3.diets.${diet}.emoji`)}</span>
                              <span className={`text-xs font-semibold leading-tight truncate ${selected ? 'text-accent-700' : 'text-text'}`}>{t(`onboarding.step3.diets.${diet}.label`)}</span>
                            </button>
                          );
                        })}
                      </div>
                      <FieldError msg={hints.dietary ? t('onboarding.errors.dietaryRequired') : undefined} />
                    </div>

                    {/* Yemek Felsefesi */}
                    <div>
                      <p className="text-[11px] font-heading uppercase tracking-widest text-muted mb-1">{t('onboarding.step3.foodPhilosophy')}</p>
                      <p className="text-[11px] text-muted mb-3">{t('onboarding.step3.foodPhilosophyHint')}</p>
                      <div className="grid grid-cols-2 gap-2.5">
                        {([
                          { val: 'iconic',      emoji: '⭐', labelKey: 'iconic' },
                          { val: 'hidden_gems', emoji: '🗺️', labelKey: 'hiddenGems' },
                          { val: 'fine_dining', emoji: '🍷', labelKey: 'fineDining' },
                          { val: 'street_food', emoji: '🌮', labelKey: 'streetFood' },
                          { val: 'mixed',       emoji: '🎲', labelKey: 'mixed' },
                        ] as const).map(({ val, emoji, labelKey }) => {
                          const selected = data.foodPhilosophy === val;
                          return (
                            <button
                              key={val}
                              type="button"
                              onClick={() => {
                                updateData({ foodPhilosophy: val });
                                setHints((h) => ({ ...h, foodPhilosophy: false }));
                              }}
                              className={`relative flex items-center gap-3 px-3.5 py-3 rounded-2xl border-2 text-left transition-all duration-150
                                ${val === 'mixed' ? 'col-span-2' : ''}
                                ${selected
                                  ? 'border-accent bg-accent-100'
                                  : 'border-divider bg-surface hover:border-accent/45'}`}
                            >
                              <span className="text-xl shrink-0 leading-none">{emoji}</span>
                              <div className="flex-1 min-w-0">
                                <p className={`font-semibold text-sm leading-tight ${selected ? 'text-accent-700' : 'text-text'}`}>{t(`onboarding.step3.foodPhilosophyOptions.${labelKey}.title`)}</p>
                                <p className="text-[11px] text-muted mt-0.5 leading-tight">{t(`onboarding.step3.foodPhilosophyOptions.${labelKey}.sub`)}</p>
                              </div>
                              {selected && (
                                <div className="w-4 h-4 rounded-full bg-accent flex items-center justify-center shrink-0">
                                  <Check size={9} className="text-white" strokeWidth={3} />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      <FieldError msg={hints.foodPhilosophy ? t('onboarding.errors.foodPhilosophyRequired') : undefined} />
                    </div>

                    {/* Öğün Başı Bütçe */}
                    <div>
                      <p className="text-[11px] font-heading uppercase tracking-widest text-muted mb-3">{t('onboarding.step3.mealBudget')}</p>
                      <div className="grid grid-cols-3 gap-2.5">
                        {([
                          { val: 'low',    emoji: '💵',     labelKey: 'low'    },
                          { val: 'medium', emoji: '💵💵',   labelKey: 'medium' },
                          { val: 'high',   emoji: '💵💵💵', labelKey: 'high'   },
                        ] as const).map(({ val, emoji, labelKey }) => {
                          const selected = data.mealBudget === val;
                          return (
                            <button
                              key={val}
                              type="button"
                              onClick={() => { updateData({ mealBudget: val as OnboardingData['mealBudget'] }); setHints((h) => ({ ...h, mealBudget: false })); }}
                              className={`flex flex-col items-center gap-1.5 py-4 px-3 rounded-2xl border-2 text-center transition-all duration-150
                                ${selected
                                  ? 'border-accent bg-accent-100'
                                  : 'border-divider bg-surface hover:border-accent/45'}`}
                            >
                              <span className="text-lg leading-none">{emoji}</span>
                              <p className={`font-heading text-sm ${selected ? 'text-accent-700' : 'text-text'}`}>{t(`onboarding.step3.mealBudgetOptions.${labelKey}.title`)}</p>
                              <p className={`text-[10px] ${selected ? 'text-accent-700/70' : 'text-muted'}`}>{t(`onboarding.step3.mealBudgetOptions.${labelKey}.sub`)}</p>
                            </button>
                          );
                        })}
                      </div>
                      <FieldError msg={hints.mealBudget ? t('onboarding.errors.mealBudgetRequired') : undefined} />
                    </div>
                  </div>
                )}

                {/* ── ADIM 4 ── */}
                {currentStep === 4 && (
                  <div className="space-y-6">

                    {/* Rezervasyon sorusu */}
                    <div>
                      <p className="text-[11px] font-heading uppercase tracking-widest text-muted mb-3">{t('onboarding.step4.reservationStatus')}</p>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { val: true,  emoji: '✅', labelKey: 'yes' },
                          { val: false, emoji: '🔍', labelKey: 'no'  },
                        ].map(({ val, emoji, labelKey }) => {
                          const selected = data.hasReservation === val;
                          return (
                            <button
                              key={String(val)}
                              type="button"
                              onClick={() => {
                                updateData({ hasReservation: val, ...(!val ? { accommodationAddress: '' } : {}) });
                                setHints((h) => ({ ...h, accommodation: false }));
                              }}
                              className={`flex flex-col items-center gap-2.5 py-5 px-4 rounded-2xl border-2 text-center transition-all duration-150
                                ${selected
                                  ? 'border-accent bg-accent-100'
                                  : 'border-divider bg-surface hover:border-accent/45'}`}
                            >
                              <span className="text-3xl leading-none">{emoji}</span>
                              <div>
                                <p className={`font-heading text-sm ${selected ? 'text-accent-700' : 'text-text'}`}>{t(`onboarding.step4.reservationOptions.${labelKey}.title`)}</p>
                                <p className="text-[11px] text-muted mt-0.5 leading-tight">{t(`onboarding.step4.reservationOptions.${labelKey}.sub`)}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      <FieldError msg={hints.accommodation && data.hasReservation === null ? t('onboarding.errors.reservationRequired') : undefined} />
                    </div>

                    {/* Evet → konaklama adı / adresi */}
                    {data.hasReservation === true && (
                      <AnimatePresence mode="wait">
                        <motion.div
                          key="reservation-input"
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.18 }}
                        >
                          <p className="text-[11px] font-heading uppercase tracking-widest text-muted mb-2">{t('onboarding.step4.accommodationPlace')}</p>
                          <PlacesAutocomplete
                            value={data.accommodationAddress || ''}
                            onChange={(place) => {
                              updateData({
                                accommodationAddress: `${place.name}, ${place.address}`,
                                accommodationLat: place.lat || null,
                                accommodationLng: place.lng || null,
                              });
                              setHints((h) => ({ ...h, accommodation: false }));
                            }}
                            placeholder={t('onboarding.step4.accommodationPlaceholder')}
                            destination={data.destination}
                            hasError={hints.accommodation && !data.accommodationAddress.trim()}
                          />
                          <FieldError msg={hints.accommodation && !data.accommodationAddress.trim() ? t('onboarding.errors.accommodationAddressRequired') : undefined} />
                          <p className="text-[11px] text-muted mt-1.5">
                            {t('onboarding.step4.accommodationHint')}
                          </p>
                        </motion.div>
                      </AnimatePresence>
                    )}

                    {/* Hayır → konaklama tipi seçimi */}
                    {data.hasReservation === false && (
                      <AnimatePresence mode="wait">
                        <motion.div
                          key="accommodation-types"
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.18 }}
                        >
                          <p className="text-[11px] font-heading uppercase tracking-widest text-muted mb-3">{t('onboarding.step4.accommodationType')}</p>
                          <div className="grid grid-cols-2 gap-2.5">
                            {([
                              { val: 'hotel',  emoji: '🏨', labelKey: 'hotel'  },
                              { val: 'airbnb', emoji: '🏠', labelKey: 'airbnb' },
                              { val: 'hostel', emoji: '🛏️', labelKey: 'hostel' },
                              { val: 'resort', emoji: '🌴', labelKey: 'resort' },
                            ] as const).map(({ val, emoji, labelKey }) => {
                              const selected = data.accommodation === val;
                              return (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() => {
                                    updateData({ accommodation: val as OnboardingData['accommodation'] });
                                    setHints((h) => ({ ...h, accommodation: false }));
                                  }}
                                  className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 text-left transition-all duration-150
                                    ${selected
                                      ? 'border-accent bg-accent-100'
                                      : 'border-divider bg-surface hover:border-accent/45'}`}
                                >
                                  <span className="text-2xl shrink-0 leading-none">{emoji}</span>
                                  <div className="flex-1 min-w-0">
                                    <p className={`font-semibold text-sm ${selected ? 'text-accent-700' : 'text-text'}`}>{t(`onboarding.step4.accommodationOptions.${labelKey}.title`)}</p>
                                    <p className="text-[11px] text-muted mt-0.5">{t(`onboarding.step4.accommodationOptions.${labelKey}.sub`)}</p>
                                  </div>
                                  {selected && (
                                    <div className="w-4 h-4 rounded-full bg-accent flex items-center justify-center shrink-0">
                                      <Check size={9} className="text-white" strokeWidth={3} />
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                          <FieldError msg={hints.accommodation && !data.accommodation ? t('onboarding.errors.accommodationRequired') : undefined} />
                        </motion.div>
                      </AnimatePresence>
                    )}

                    {/* Şehir İçi Ulaşım */}
                    <div>
                      <p className="text-[11px] font-heading uppercase tracking-widest text-muted mb-3">{t('onboarding.step4.transport')}</p>
                      <div className="grid grid-cols-2 gap-2.5">
                        {([
                          { val: 'public', emoji: '🚇', labelKey: 'public' },
                          { val: 'walk',   emoji: '🚶', labelKey: 'walk'   },
                          { val: 'taxi',   emoji: '🚕', labelKey: 'taxi'   },
                          { val: 'car',    emoji: '🚗', labelKey: 'car'    },
                        ] as const).map(({ val, emoji, labelKey }) => {
                          const selected = data.transport === val;
                          return (
                            <button
                              key={val}
                              type="button"
                              onClick={() => {
                                updateData({ transport: val as OnboardingData['transport'] });
                                setHints((h) => ({ ...h, transport: false }));
                              }}
                              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 text-left transition-all duration-150
                                ${selected
                                  ? 'border-accent bg-accent-100'
                                  : 'border-divider bg-surface hover:border-accent/45'}`}
                            >
                              <span className="text-2xl shrink-0 leading-none">{emoji}</span>
                              <div className="flex-1 min-w-0">
                                <p className={`font-semibold text-sm ${selected ? 'text-accent-700' : 'text-text'}`}>{t(`onboarding.step4.transportOptions.${labelKey}.title`)}</p>
                                <p className="text-[11px] text-muted mt-0.5">{t(`onboarding.step4.transportOptions.${labelKey}.sub`)}</p>
                              </div>
                              {selected && (
                                <div className="w-4 h-4 rounded-full bg-accent flex items-center justify-center shrink-0">
                                  <Check size={9} className="text-white" strokeWidth={3} />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      <FieldError msg={hints.transport ? t('onboarding.errors.transportRequiredField') : undefined} />
                    </div>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Alt bar — navigasyon */}
        <div className="shrink-0 border-t border-divider px-4 sm:px-8 lg:px-12 py-2.5 flex items-center justify-between">

          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 1 || isGenerating}
            className={`inline-flex items-center gap-2 px-4 py-2 text-text hover:text-accent font-heading text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${isGenerating ? 'invisible' : ''}`}
          >
            <ArrowLeft size={14} strokeWidth={2.75} />
            {t('onboarding.nav.back')}
          </button>

          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className={`rounded-full transition-all duration-300
                ${currentStep === s ? 'w-5 h-2 bg-accent'
                : currentStep > s  ? 'w-2 h-2 bg-accent/40'
                                   : 'w-2 h-2 bg-divider'}`} />
            ))}
          </div>

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-accent hover:brightness-105 text-white font-heading rounded-full text-sm transition-all shadow-[0_10px_22px_rgba(198,113,57,0.28)] active:translate-y-px"
            >
              {t('onboarding.nav.next')}
              <ArrowRight size={14} strokeWidth={2.75} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              disabled={isGenerating}
              className={`inline-flex items-center gap-2 px-6 py-2.5 font-heading rounded-full text-sm transition-all
                ${isGenerating
                  ? 'bg-surface-2 text-muted cursor-not-allowed'
                  : 'bg-accent hover:brightness-105 text-white shadow-[0_10px_22px_rgba(198,113,57,0.28)] active:translate-y-px'}`}
            >
              {isGenerating
                ? <><Loader2 size={14} className="animate-spin" /> {t('onboarding.nav.planning')}</>
                : <><Plane size={14} strokeWidth={2.75} /> {t('onboarding.nav.createPlan')}</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
