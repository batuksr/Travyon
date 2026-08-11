import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
const ALL_EATER_OPTION = 'Her Şeyi Yerim';

const STEPS = [
  { id: 1, label: 'Destinasyon', icon: MapPin },
  { id: 2, label: 'Tercihler',   icon: Heart },
  { id: 3, label: 'Yemek',       icon: Utensils },
  { id: 4, label: 'Konaklama',   icon: Bed },
] as const;

const loadingMessages = [
  'Destinasyon analiz ediliyor...',
  'Rotalar optimize ediliyor...',
  'Gizli mekanlar keşfediliyor...',
  'Bütçe hesaplanıyor...',
  'Son dokunuşlar yapılıyor...',
];

const DIET_EMOJIS: Record<string, string> = {
  Vegan: '🌱',
  Vejetaryen: '🥗',
  Helal: '☪️',
  Glutensiz: '🌾',
  Pesketaryen: '🐟',
  [ALL_EATER_OPTION]: '🍽️',
};

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
const validateStep = (step: number, data: OnboardingData): string | null => {
  if (step === 1) {
    if (!data.destination.trim()) return 'Lütfen bir destinasyon girin.';
    if (!data.startDate) return 'Gidiş tarihi seçin.';
    if (!data.endDate) return 'Dönüş tarihi seçin.';
    if (data.startDate < today) return 'Gidiş tarihi bugünden önce olamaz.';
    if (data.endDate < today) return 'Dönüş tarihi bugünden önce olamaz.';
    if (data.startDate >= data.endDate) return 'Dönüş tarihi gidiş tarihinden sonra olmalı.';
    if (data.budget < 100) return 'Bütçe en az 100 olmalı.';
  }
  if (step === 2) {
    if (!data.travelType) return 'Seyahat türünü seçmelisin.';
    const effectivePurposes = data.purposes && data.purposes.length > 0
      ? data.purposes : (data.tripPurpose ? [data.tripPurpose] : []);
    if (effectivePurposes.length === 0) return 'En az 1 ilgi alanı seç.';
    if (!data.pace) return 'Günlük tempo seçin.';
  }
  if (step === 3) {
    if (data.dietaryRestrictions.length === 0) return 'En az bir beslenme tercihi seçin.';
    if (!data.foodPhilosophy) return 'Yemek felsefeni seç.';
    if (!data.mealBudget) return 'Öğün başı bütçe seçin.';
  }
  if (step === 4) {
    if (data.hasReservation === null) return 'Rezervasyon durumunuzu belirtin.';
    if (data.hasReservation === true && !data.accommodationAddress.trim()) return 'Konaklama adresini girin.';
    if (data.hasReservation === false && !data.accommodation) return 'Konaklama tercihi seçin.';
    if (!data.transport) return 'Ulaşım tercihi seçin.';
  }
  return null;
};

const validateAll = (data: OnboardingData): string | null => {
  for (let s = 1; s <= 4; s++) {
    const err = validateStep(s, data);
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

  useEffect(() => { setError(null); setHints(EMPTY_HINTS); }, [currentStep]);

  useEffect(() => {
    if (!isGenerating) { setLoadingIdx(0); return; }
    const t = setInterval(() => setLoadingIdx((p) => (p + 1) % loadingMessages.length), 3000);
    return () => clearInterval(t);
  }, [isGenerating]);

  const handleNext = () => {
    const err = validateStep(currentStep, data);
    if (err) { setError(err); setHints(hintsForStep(currentStep, data)); return; }
    setError(null); setHints(EMPTY_HINTS);
    nextStep();
  };

  const handleBack = () => { setError(null); setHints(EMPTY_HINTS); prevStep(); };

  const handleFinish = async () => {
    const err = validateAll(data);
    if (err) { setError(err); setHints(hintsForStep(currentStep, data)); return; }
    try {
      setError(null); setHints(EMPTY_HINTS); setAllCompleted(true); setIsGenerating(true);
      let applied = false;
      const plan = await generateTravelPlan(data, (partial) => { if (applied) setPlan(partial); });
      setPlan(plan); applied = true;
      setStep(1);           // Sadece adımı sıfırla — konaklama verisi Dashboard'da gerekli
      navigate('/dashboard');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Plan oluşturulurken bir hata oluştu.');
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
              <span className="text-white text-[11px] font-heading uppercase tracking-widest">AI Destekli Plan</span>
            </div>

            <div className="text-4xl mb-4">
              {currentStep === 1 && '🌍'}
              {currentStep === 2 && '✨'}
              {currentStep === 3 && '🍽️'}
              {currentStep === 4 && '🏨'}
            </div>

            <h1 className="font-heading text-3xl text-white mb-3 leading-tight whitespace-pre-line">
              {currentStep === 1 && 'Hayalindeki\nDestinasyon'}
              {currentStep === 2 && 'Seyahat\nTarzın'}
              {currentStep === 3 && 'Damak\nZevkin'}
              {currentStep === 4 && 'Konfor\nTercihin'}
            </h1>
            <p className="text-white/75 text-sm leading-relaxed max-w-xs">
              {currentStep === 1 && 'Nereye gideceğini ve ne kadar kalacağını söyle, gerisini biz planlayalım.'}
              {currentStep === 2 && 'Hızlı mı yavaş mı? Kültür mü macera mı? Sana özel tempo belirleyelim.'}
              {currentStep === 3 && 'Beslenme tercihlerini bilmeden mükemmel restoran öneremeyiz.'}
              {currentStep === 4 && 'Nerede kalacağın ve nasıl gezeceğin planı şekillendirir.'}
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
            <h3 className="font-heading text-2xl text-text mb-2">Planınız Hazırlanıyor</h3>
            <p className="text-sm text-muted mb-6 max-w-xs leading-relaxed">
              Yapay zekamız rotaları, gizli mekanları ve aktiviteleri seçiyor.
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
        <div className="shrink-0 px-4 sm:px-8 lg:px-12 pt-7 pb-5 border-b border-divider">

          {/* Mobil logo */}
          <div className="lg:hidden mb-5">
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
                      {step.label}
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
          <div className="mt-4 h-px bg-divider rounded-full overflow-hidden max-w-2xl">
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
                    Adım {currentStep} / 4
                  </p>
                  <h2 className="font-heading text-2xl text-text mb-1.5 leading-tight">
                    {currentStep === 1 && 'Nereye gidiyorsun?'}
                    {currentStep === 2 && 'Tercihlerini söyle'}
                    {currentStep === 3 && 'Yemek tarzın nasıl?'}
                    {currentStep === 4 && 'Nerede kalmak istersin?'}
                  </h2>
                  <p className="text-sm text-muted leading-relaxed">
                    {currentStep === 1 && 'Destinasyon ve tarihleri belirle.'}
                    {currentStep === 2 && 'Seyahat tarzını ve ilgi alanlarını seç.'}
                    {currentStep === 3 && 'Damak zevkine göre öneriler oluşturalım.'}
                    {currentStep === 4 && 'Konaklama ve ulaşım tercihlerini belirt.'}
                  </p>
                </div>

                {/* ── ADIM 1 ── */}
                {currentStep === 1 && (
                  <div className="space-y-5">

                    {/* Destinasyon */}
                    <div>
                      <p className="text-[11px] font-heading uppercase tracking-widest text-muted mb-2.5">Destinasyon</p>
                      <div className="relative" ref={destinationRef}>
                        <Search size={15} strokeWidth={2.5} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none z-10" />
                        <input
                          type="text"
                          value={data.destination}
                          onChange={(e) => handleDestinationChange(e.target.value)}
                          onFocus={() => { if (data.destination.trim().length > 0) setShowSuggestions(true); }}
                          placeholder="Örn. Roma, İtalya"
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
                      <FieldError msg={hints.destination ? 'Destinasyon girmelisin.' : undefined} />
                    </div>

                    {/* Tarihler + Saatler — satır bazlı iOS tarzı layout */}
                    <div className="rounded-2xl border border-divider overflow-hidden">
                      {/* Başlık şeridi */}
                      <div className="bg-surface-2 px-4 py-2.5 border-b border-divider">
                        <p className="text-[11px] font-heading uppercase tracking-widest text-muted flex items-center gap-1.5">
                          <Calendar size={11} strokeWidth={2.5} className="text-accent" /> Seyahat Tarihleri
                        </p>
                      </div>

                      {/* Satırlar */}
                      <div className="bg-surface divide-y divide-divider">

                        {/* Gidiş */}
                        <div className={`flex items-center px-4 py-3.5 ${hints.startDate ? 'bg-rose-50/50' : ''}`}>
                          <span className="text-[14.5px] text-text w-24 shrink-0">✈️ Gidiş</span>
                          <input
                            type="date" min={today}
                            value={data.startDate}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val && val < today) return;
                              updateData({ startDate: val });
                              setHints((h) => ({ ...h, startDate: false }));
                            }}
                            className="flex-1 text-[14.5px] text-text bg-transparent outline-none text-right"
                          />
                        </div>

                        {/* Dönüş */}
                        <div className={`flex items-center px-4 py-3.5 ${hints.endDate ? 'bg-rose-50/50' : ''}`}>
                          <span className="text-[14.5px] text-text w-24 shrink-0">🏠 Dönüş</span>
                          <input
                            type="date" min={data.startDate || today}
                            value={data.endDate}
                            onChange={(e) => {
                              const val = e.target.value;
                              const minDate = data.startDate || today;
                              if (val && val < minDate) return;
                              updateData({ endDate: val });
                              setHints((h) => ({ ...h, endDate: false }));
                            }}
                            className="flex-1 text-[14.5px] text-text bg-transparent outline-none text-right"
                          />
                        </div>

                        {/* Varış Saati */}
                        <div className="flex items-center px-4 py-3.5">
                          <span className="text-[14.5px] text-text w-24 shrink-0">🛬 Varış</span>
                          <input
                            type="time"
                            value={data.arrivalTime}
                            onChange={(e) => updateData({ arrivalTime: e.target.value })}
                            className="flex-1 text-[14.5px] text-text bg-transparent outline-none text-right"
                          />
                        </div>

                        {/* Ayrılış Saati */}
                        <div className="flex items-center px-4 py-3.5">
                          <span className="text-[14.5px] text-text w-24 shrink-0">🛫 Ayrılış</span>
                          <input
                            type="time"
                            value={data.departureTime}
                            onChange={(e) => updateData({ departureTime: e.target.value })}
                            className="flex-1 text-[14.5px] text-text bg-transparent outline-none text-right"
                          />
                        </div>
                      </div>

                      {/* Hata mesajları */}
                      {(hints.startDate || hints.endDate) && (
                        <div className="bg-rose-50 px-4 py-2 border-t border-rose-100">
                          {hints.startDate && <p className="text-xs text-rose-500">Gidiş tarihi seçin.</p>}
                          {hints.endDate   && <p className="text-xs text-rose-500">Dönüş tarihi seçin.</p>}
                        </div>
                      )}
                    </div>

                    {/* Kişi + Bütçe */}
                    <div className="grid grid-cols-2 gap-4 items-start">
                      <div>
                        <p className="text-[11px] font-heading uppercase tracking-widest text-muted mb-3">Kişi Sayısı</p>
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
                            <span className="text-xs text-muted ml-1">kişi</span>
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
                        <p className="text-[11px] font-heading uppercase tracking-widest text-muted mb-3">Toplam Bütçe</p>
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
                        <FieldError msg={hints.budget ? 'Bütçe en az 100 olmalıdır.' : undefined} />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── ADIM 2 ── */}
                {currentStep === 2 && (
                  <div className="space-y-6">

                    {/* Seyahat Türü */}
                    <div>
                      <p className="text-[11px] font-heading uppercase tracking-widest text-muted mb-3">Seyahat Türü</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {([
                          { val: 'solo_macera',    Icon: Backpack,    title: 'Solo' },
                          { val: 'romantik',       Icon: Heart,       title: 'Romantik' },
                          { val: 'balayi',         Icon: Sparkles,    title: 'Balayı' },
                          { val: 'aile',           Icon: Users,       title: 'Aile' },
                          { val: 'arkadas_grubu',  Icon: PartyPopper, title: 'Arkadaşlar' },
                          { val: 'is_seyahati',    Icon: Briefcase,   title: 'İş' },
                          { val: 'sehir_kacamagi', Icon: Coffee,      title: 'Kaçamak' },
                          { val: 'klasik_tatil',   Icon: Map,         title: 'Klasik' },
                        ] as const).map(({ val, Icon, title }) => {
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
                                {title}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <FieldError msg={hints.travelType ? 'Seyahat türünü seçmelisin.' : undefined} />
                    </div>

                    {/* İlgi Alanları */}
                    <div>
                      <p className="text-[11px] font-heading uppercase tracking-widest text-muted mb-1">İlgi Alanları</p>
                      <p className="text-[11px] text-muted mb-3">En fazla 3 tane. Seçim sırası önceliği belirler.</p>
                      <div className="grid grid-cols-2 gap-2.5">
                        {[
                          { val: 'culture',   emoji: '🏛️', title: 'Kültür & Tarih', sub: 'Müzeler, tarihi mekanlar' },
                          { val: 'relax',     emoji: '😴', title: 'Dinlenme',         sub: 'Spa, sahil, yavaş tempo' },
                          { val: 'nightlife', emoji: '🌙', title: 'Gece Hayatı',      sub: 'Bar, kulüp, canlı müzik' },
                          { val: 'nature',    emoji: '🏔️', title: 'Doğa & Macera',   sub: 'Trekking, doğa yürüyüşü' },
                        ].map(({ val, emoji, title, sub }) => {
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
                                <p className={`font-semibold text-sm leading-tight ${isSelected ? 'text-accent-700' : 'text-text'}`}>{title}</p>
                                <p className="text-[11px] text-muted mt-0.5 leading-tight">{sub}</p>
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
                            En fazla 3 ilgi alanı seçebilirsin.
                          </motion.p>
                        )}
                      </AnimatePresence>
                      <FieldError msg={hints.tripPurpose ? 'En az 1 ilgi alanı seç.' : undefined} />
                    </div>

                    {/* Tempo */}
                    <div>
                      <p className="text-[11px] font-heading uppercase tracking-widest text-muted mb-1">Günlük Tempo</p>
                      <p className="text-[11px] text-muted mb-3">Aktivite yoğunluğunu seç.</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {([
                          { val: 'rahat',  Icon: Sofa,       title: 'Rahat',  desc: 'Az yürüyüş',     detail: '3–4 km/gün' },
                          { val: 'normal', Icon: Footprints, title: 'Normal', desc: 'Standart tempo', detail: '6–8 km/gün' },
                          { val: 'aktif',  Icon: Mountain,   title: 'Aktif',  desc: 'Her şeyi gör',   detail: '10–15 km/gün' },
                          { val: 'esnek',  Icon: Compass,    title: 'Esnek',  desc: 'AI karar versin', detail: 'Değişken' },
                        ] as const).map(({ val, Icon, title, desc, detail }) => {
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
                                <p className={`font-heading text-xs ${selected ? 'text-accent-700' : 'text-text'}`}>{title}</p>
                                <p className={`text-[10px] mt-0.5 leading-tight ${selected ? 'text-accent-700/70' : 'text-muted'}`}>{desc}</p>
                                <p className="text-[10px] text-muted mt-0.5">{detail}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      <FieldError msg={hints.pace ? 'Günlük tempo seçin.' : undefined} />
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
                          <p className={`text-sm font-semibold ${data.earlyBird ? 'text-accent-700' : 'text-text'}`}>Erken kalkmayı severim</p>
                          <p className="text-[11px] text-muted mt-0.5">Sabah erken aktivite planlanabilir</p>
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
                      <p className="text-[11px] font-heading uppercase tracking-widest text-muted mb-3">Beslenme Tercihleri</p>
                      <div className="grid grid-cols-3 gap-2">
                        {['Vegan', 'Vejetaryen', 'Helal', 'Glutensiz', 'Pesketaryen', ALL_EATER_OPTION].map((diet) => {
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
                              <span className="text-base leading-none shrink-0">{DIET_EMOJIS[diet]}</span>
                              <span className={`text-xs font-semibold leading-tight truncate ${selected ? 'text-accent-700' : 'text-text'}`}>{diet}</span>
                            </button>
                          );
                        })}
                      </div>
                      <FieldError msg={hints.dietary ? 'En az bir beslenme tercihi seçin.' : undefined} />
                    </div>

                    {/* Yemek Felsefesi */}
                    <div>
                      <p className="text-[11px] font-heading uppercase tracking-widest text-muted mb-1">Yemek Felsefesi</p>
                      <p className="text-[11px] text-muted mb-3">AI sana hangi mekanları önersin?</p>
                      <div className="grid grid-cols-2 gap-2.5">
                        {([
                          { val: 'iconic',      emoji: '⭐', title: 'İkonik Lezzetler', subtitle: 'Şehrin ünlü mekanları' },
                          { val: 'hidden_gems', emoji: '🗺️', title: 'Gizli Keşifler',    subtitle: 'Yerel favoriler, saklı köşeler' },
                          { val: 'fine_dining', emoji: '🍷', title: 'Fine Dining',        subtitle: 'Kaliteli restoran deneyimi' },
                          { val: 'street_food', emoji: '🌮', title: 'Sokak Yemeği',      subtitle: 'Tezgah lezzetleri, pazar' },
                          { val: 'mixed',       emoji: '🎲', title: 'Karışık / Sürpriz', subtitle: 'Her gün farklı deneyim' },
                        ] as const).map(({ val, emoji, title, subtitle }) => {
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
                                <p className={`font-semibold text-sm leading-tight ${selected ? 'text-accent-700' : 'text-text'}`}>{title}</p>
                                <p className="text-[11px] text-muted mt-0.5 leading-tight">{subtitle}</p>
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
                      <FieldError msg={hints.foodPhilosophy ? 'Yemek felsefeni seç.' : undefined} />
                    </div>

                    {/* Öğün Başı Bütçe */}
                    <div>
                      <p className="text-[11px] font-heading uppercase tracking-widest text-muted mb-3">Öğün Başı Bütçe</p>
                      <div className="grid grid-cols-3 gap-2.5">
                        {[
                          { val: 'low',    emoji: '💵',     title: 'Düşük',  sub: 'Uygun fiyatlı' },
                          { val: 'medium', emoji: '💵💵',   title: 'Orta',   sub: 'Dengeli' },
                          { val: 'high',   emoji: '💵💵💵', title: 'Yüksek', sub: 'Kalite öncelikli' },
                        ].map(({ val, emoji, title, sub }) => {
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
                              <p className={`font-heading text-sm ${selected ? 'text-accent-700' : 'text-text'}`}>{title}</p>
                              <p className={`text-[10px] ${selected ? 'text-accent-700/70' : 'text-muted'}`}>{sub}</p>
                            </button>
                          );
                        })}
                      </div>
                      <FieldError msg={hints.mealBudget ? 'Öğün başı bütçe seçin.' : undefined} />
                    </div>
                  </div>
                )}

                {/* ── ADIM 4 ── */}
                {currentStep === 4 && (
                  <div className="space-y-6">

                    {/* Rezervasyon sorusu */}
                    <div>
                      <p className="text-[11px] font-heading uppercase tracking-widest text-muted mb-3">Rezervasyon Durumu</p>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { val: true,  emoji: '✅', title: 'Rezervasyonum var', sub: 'Konaklama yerim belli' },
                          { val: false, emoji: '🔍', title: 'Henüz seçmedim',    sub: 'Konaklama tarzımı söyleyeceğim' },
                        ].map(({ val, emoji, title, sub }) => {
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
                                <p className={`font-heading text-sm ${selected ? 'text-accent-700' : 'text-text'}`}>{title}</p>
                                <p className="text-[11px] text-muted mt-0.5 leading-tight">{sub}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      <FieldError msg={hints.accommodation && data.hasReservation === null ? 'Rezervasyon durumunuzu belirtin.' : undefined} />
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
                          <p className="text-[11px] font-heading uppercase tracking-widest text-muted mb-2">Konaklama Yeri</p>
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
                            placeholder="Örn. Hotel Roma Centro, Via del Corso 123"
                            destination={data.destination}
                            hasError={hints.accommodation && !data.accommodationAddress.trim()}
                          />
                          <FieldError msg={hints.accommodation && !data.accommodationAddress.trim() ? 'Konaklama adresini girin.' : undefined} />
                          <p className="text-[11px] text-muted mt-1.5">
                            AI günlük rotaları bu konuma göre optimize edecek.
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
                          <p className="text-[11px] font-heading uppercase tracking-widest text-muted mb-3">Konaklama Tercihi</p>
                          <div className="grid grid-cols-2 gap-2.5">
                            {[
                              { val: 'hotel',  emoji: '🏨', title: 'Otel',               sub: 'Konforlu, tam servis' },
                              { val: 'airbnb', emoji: '🏠', title: 'Airbnb / Ev',         sub: 'Yerel deneyim' },
                              { val: 'hostel', emoji: '🛏️', title: 'Hostel',              sub: 'Sosyal, ekonomik' },
                              { val: 'resort', emoji: '🌴', title: 'Tatil Köyü',          sub: 'Her şey dahil' },
                            ].map(({ val, emoji, title, sub }) => {
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
                                    <p className={`font-semibold text-sm ${selected ? 'text-accent-700' : 'text-text'}`}>{title}</p>
                                    <p className="text-[11px] text-muted mt-0.5">{sub}</p>
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
                          <FieldError msg={hints.accommodation && !data.accommodation ? 'Konaklama tercihi seçin.' : undefined} />
                        </motion.div>
                      </AnimatePresence>
                    )}

                    {/* Şehir İçi Ulaşım */}
                    <div>
                      <p className="text-[11px] font-heading uppercase tracking-widest text-muted mb-3">Şehir İçi Ulaşım</p>
                      <div className="grid grid-cols-2 gap-2.5">
                        {[
                          { val: 'public', emoji: '🚇', title: 'Toplu Taşıma',  sub: 'Metro, otobüs' },
                          { val: 'walk',   emoji: '🚶', title: 'Yürüyüş',       sub: 'Yürüme mesafesi' },
                          { val: 'taxi',   emoji: '🚕', title: 'Taksi / Uber',   sub: 'Kapıdan kapıya' },
                          { val: 'car',    emoji: '🚗', title: 'Araç',           sub: 'Kiralık veya kendi' },
                        ].map(({ val, emoji, title, sub }) => {
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
                                <p className={`font-semibold text-sm ${selected ? 'text-accent-700' : 'text-text'}`}>{title}</p>
                                <p className="text-[11px] text-muted mt-0.5">{sub}</p>
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
                      <FieldError msg={hints.transport ? 'Bir ulaşım tercihi seçin.' : undefined} />
                    </div>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Alt bar — navigasyon */}
        <div className="shrink-0 border-t border-divider px-4 sm:px-8 lg:px-12 py-4 flex items-center justify-between">

          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 1 || isGenerating}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-text hover:text-accent font-heading text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${isGenerating ? 'invisible' : ''}`}
          >
            <ArrowLeft size={14} strokeWidth={2.75} />
            Geri
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
              className="inline-flex items-center gap-2 px-6 py-3 bg-accent hover:brightness-105 text-white font-heading rounded-full text-sm transition-all shadow-[0_10px_22px_rgba(198,113,57,0.28)] active:translate-y-px"
            >
              İleri
              <ArrowRight size={14} strokeWidth={2.75} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              disabled={isGenerating}
              className={`inline-flex items-center gap-2 px-6 py-3 font-heading rounded-full text-sm transition-all
                ${isGenerating
                  ? 'bg-surface-2 text-muted cursor-not-allowed'
                  : 'bg-accent hover:brightness-105 text-white shadow-[0_10px_22px_rgba(198,113,57,0.28)] active:translate-y-px'}`}
            >
              {isGenerating
                ? <><Loader2 size={14} className="animate-spin" /> Planlanıyor</>
                : <><Plane size={14} strokeWidth={2.75} /> Planı Oluştur</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
