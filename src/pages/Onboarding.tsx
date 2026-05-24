import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Calendar, Heart, Utensils, Bed,
  ArrowRight, ArrowLeft, Check, Sparkles,
  Loader2, Plus, Minus, Plane, Search,
} from 'lucide-react';
import { useOnboardingStore, type OnboardingData } from '../store/useOnboardingStore';
import TravyonLogo from '../components/TravyonLogo';
import { generateTravelPlan } from '../services/aiService';
import { usePlanStore } from '../store/usePlanStore';
import { searchCities, type CityOption } from '../data/cities';

const today = new Date().toISOString().split('T')[0];
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
    if (!data.tripPurpose) return 'Seyahat amacı seçin.';
    if (!data.pace) return 'Günlük tempo seçin.';
  }
  if (step === 3) {
    if (data.dietaryRestrictions.length === 0) return 'En az bir beslenme tercihi seçin.';
    if (!data.mealBudget) return 'Öğün başı bütçe seçin.';
  }
  if (step === 4) {
    if (!data.accommodation) return 'Konaklama tercihi seçin.';
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
  tripPurpose: boolean; pace: boolean; dietary: boolean; mealBudget: boolean;
  accommodation: boolean; transport: boolean;
};
const EMPTY_HINTS: FieldHints = {
  destination: false, startDate: false, endDate: false, budget: false,
  tripPurpose: false, pace: false, dietary: false, mealBudget: false,
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
  if (step === 2) { h.tripPurpose = !data.tripPurpose; h.pace = !data.pace; }
  if (step === 3) { h.dietary = data.dietaryRestrictions.length === 0; h.mealBudget = !data.mealBudget; }
  if (step === 4) { h.accommodation = !data.accommodation; h.transport = !data.transport; }
  return h;
};

/* ── Shared sub-components ── */
const inputCls = (err?: boolean) =>
  `w-full px-3.5 py-2.5 rounded-lg border text-sm outline-none transition-all text-slate-800 placeholder:text-slate-400
   ${err
     ? 'border-rose-200 bg-rose-50/20 focus:border-rose-300'
     : 'border-slate-200 bg-white focus:border-[#f8981d] focus:ring-2 focus:ring-[#f8981d]/8'}`;

const FieldError = ({ msg }: { msg?: string }) =>
  msg ? <p className="text-xs text-rose-500 mt-1.5 ml-0.5">{msg}</p> : null;

interface OptionCardProps {
  selected: boolean; onClick: () => void;
  title: string; emoji?: string; subtitle?: string;
}
const OptionCard = ({ selected, onClick, title, emoji, subtitle }: OptionCardProps) => (
  <button
    type="button"
    onClick={onClick}
    className={`relative px-3.5 py-2.5 rounded-lg border text-left transition-all duration-150 flex items-center gap-2.5 w-full
      ${selected
        ? 'border-[#f8981d] bg-[#f8981d]/[0.03]'
        : 'border-slate-200 bg-white hover:border-slate-300'}`}
  >
    {emoji && <span className="text-base shrink-0 leading-none">{emoji}</span>}
    <div className="flex-1 min-w-0">
      <p className={`font-medium text-sm leading-tight ${selected ? 'text-[#f8981d]' : 'text-slate-700'}`}>{title}</p>
      {subtitle && <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">{subtitle}</p>}
    </div>
    {selected && (
      <div className="w-3.5 h-3.5 rounded-full bg-[#f8981d] flex items-center justify-center shrink-0">
        <Check size={8} className="text-white" strokeWidth={3} />
      </div>
    )}
  </button>
);

const MAX_PEOPLE = 15;

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════ */
const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const { currentStep, data, nextStep, prevStep, updateData } = useOnboardingStore();
  const { setPlan } = usePlanStore();

  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingIdx, setLoadingIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hints, setHints] = useState<FieldHints>(EMPTY_HINTS);
  const [allCompleted, setAllCompleted] = useState(false);

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
      navigate('/dashboard');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Plan oluşturulurken bir hata oluştu.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-screen bg-white flex overflow-hidden">

      {/* ═══ SOL — VİDEO ═══ */}
      <div className="hidden lg:flex lg:w-2/5 relative overflow-hidden shrink-0">

        {/* Fallback gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />

        <video
          autoPlay loop muted playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/videos/video2.mp4" type="video/mp4" />
        </video>

        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/25 to-black/65" />

        <div className="relative z-10 flex flex-col justify-between p-10 w-full">

          {/* Logo */}
          <TravyonLogo size={64} dark />

          {/* Adıma özel mesaj */}
          <motion.div key={currentStep} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md border border-white/20 rounded-full mb-5">
              <Sparkles size={11} className="text-[#f8981d]" />
              <span className="text-white text-[10px] font-bold uppercase tracking-widest">AI Destekli Plan</span>
            </div>

            <div className="text-4xl mb-4">
              {currentStep === 1 && '🌍'}
              {currentStep === 2 && '✨'}
              {currentStep === 3 && '🍽️'}
              {currentStep === 4 && '🏨'}
            </div>

            <h1 className="text-3xl font-black text-white mb-3 leading-tight whitespace-pre-line">
              {currentStep === 1 && 'Hayalindeki\nDestinasyon'}
              {currentStep === 2 && 'Seyahat\nTarzın'}
              {currentStep === 3 && 'Damak\nZevkin'}
              {currentStep === 4 && 'Konfor\nTercihin'}
            </h1>
            <p className="text-white/70 text-sm leading-relaxed max-w-xs">
              {currentStep === 1 && 'Nereye gideceğini ve ne kadar kalacağını söyle, gerisini biz planlayalım.'}
              {currentStep === 2 && 'Hızlı mı yavaş mı? Kültür mü macera mı? Sana özel tempo belirleyelim.'}
              {currentStep === 3 && 'Beslenme tercihlerini bilmeden mükemmel restoran öneremeyiz.'}
              {currentStep === 4 && 'Nerede kalacağın ve nasıl gezeceğin planı şekillendirir.'}
            </p>
          </motion.div>

        </div>
      </div>

      {/* ═══ SAĞ — FORM ═══ */}
      <div className="flex-1 flex flex-col h-screen min-w-0">

        {/* Üst bar — step indikatörleri */}
        <div className="shrink-0 px-8 lg:px-12 pt-7 pb-5 border-b border-slate-100">

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
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300
                      ${completed  ? 'bg-emerald-500 text-white'
                      : active     ? 'bg-[#f8981d] text-white shadow-lg shadow-[#f8981d]/30'
                                   : 'bg-slate-100 text-slate-400'}`}>
                      {completed ? <Check size={15} strokeWidth={3} /> : <Icon size={15} />}
                    </div>
                    <span className={`text-[11px] font-bold transition-colors
                      ${active ? 'text-[#f8981d]' : completed ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {step.label}
                    </span>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div className={`h-px flex-1 mx-2 mb-[18px] transition-all duration-500
                      ${currentStep > step.id ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Thin progress bar */}
          <div className="mt-4 h-px bg-slate-100 rounded-full overflow-hidden max-w-2xl">
            <motion.div
              className="h-full bg-gradient-to-r from-[#f8981d] to-[#f8981d]"
              animate={{ width: `${(currentStep / 4) * 100}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Form alanı */}
        <div className="flex-1 overflow-y-auto px-8 lg:px-12 py-8 relative">

          {/* Loading overlay */}
          {isGenerating && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white px-8 text-center"
            >
              <div className="relative w-20 h-20 mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
                <div className="absolute inset-0 rounded-full border-4 border-[#f8981d] border-t-transparent animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center text-2xl">✈️</div>
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">Planınız Hazırlanıyor</h3>
              <p className="text-sm text-slate-500 mb-6 max-w-xs leading-relaxed">
                Yapay zekamız rotaları, gizli mekanları ve aktiviteleri seçiyor.
              </p>
              <div className="bg-orange-50 border border-orange-100 rounded-full px-5 py-2.5 min-w-[220px]">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={loadingIdx}
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.25 }}
                    className="text-sm text-[#e08518] font-semibold"
                  >
                    {loadingMessages[loadingIdx]}
                  </motion.p>
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          <div className="max-w-2xl" aria-hidden={isGenerating || undefined}>

            {/* Hata */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className="flex items-center gap-2.5 p-3 mb-5 bg-rose-50 border border-rose-100 rounded-lg"
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
                {/* Adım başlığı */}
                <p className="text-[#f8981d] text-xs font-bold uppercase tracking-widest mb-2">
                  Adım {currentStep} / 4
                </p>
                <h2 className="text-2xl font-black text-slate-900 mb-1">
                  {currentStep === 1 && 'Nereye gidiyorsun?'}
                  {currentStep === 2 && 'Tercihlerini söyle'}
                  {currentStep === 3 && 'Yemek tarzın nasıl?'}
                  {currentStep === 4 && 'Nerede kalmak istersin?'}
                </h2>
                <p className="text-slate-500 text-sm mb-7">
                  {currentStep === 1 && 'Destinasyon ve tarihleri belirle.'}
                  {currentStep === 2 && 'Bütçe ve seyahat tarzını seç.'}
                  {currentStep === 3 && 'Damak zevkine göre öneriler.'}
                  {currentStep === 4 && 'Konfor seviyeni belirle.'}
                </p>

                {/* ── ADIM 1 ── */}
                {currentStep === 1 && (
                  <div className="space-y-5">

                    <div>
                      <label className="text-xs font-medium text-slate-500 mb-1.5 block">Destinasyon</label>
                      <div className="relative" ref={destinationRef}>
                        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
                        <input
                          type="text"
                          value={data.destination}
                          onChange={(e) => handleDestinationChange(e.target.value)}
                          onFocus={() => { if (data.destination.trim().length > 0) setShowSuggestions(true); }}
                          placeholder="Örn. Roma, İtalya"
                          className={inputCls(hints.destination) + ' pl-10'}
                          autoComplete="off"
                        />
                        {showSuggestions && citySuggestions.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                            {citySuggestions.map((c, i) => (
                              <button
                                key={i}
                                type="button"
                                onMouseDown={(e) => { e.preventDefault(); handleCitySelect(c); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left"
                              >
                                <MapPin size={13} className="text-[#f8981d] shrink-0" />
                                <span className="text-sm font-semibold text-slate-800">{c.city}</span>
                                <span className="text-xs text-slate-400 ml-auto shrink-0">{c.country}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <FieldError msg={hints.destination ? 'Destinasyon girmelisin.' : undefined} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1.5">
                          <Calendar size={12} className="text-[#f8981d]" /> Gidiş Tarihi
                        </label>
                        <input
                          type="date" min={today}
                          value={data.startDate}
                          onChange={(e) => { updateData({ startDate: e.target.value }); setHints((h) => ({ ...h, startDate: false })); }}
                          className={inputCls(hints.startDate)}
                        />
                        <FieldError msg={hints.startDate ? 'Geçerli bir gidiş tarihi seçin.' : undefined} />
                      </div>
                      <div>
                        <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1.5">
                          <Calendar size={12} className="text-[#f8981d]" /> Dönüş Tarihi
                        </label>
                        <input
                          type="date" min={data.startDate || today}
                          value={data.endDate}
                          onChange={(e) => { updateData({ endDate: e.target.value }); setHints((h) => ({ ...h, endDate: false })); }}
                          className={inputCls(hints.endDate)}
                        />
                        <FieldError msg={hints.endDate ? 'Geçerli bir dönüş tarihi seçin.' : undefined} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-slate-500 mb-1.5 block">Varış Saati</label>
                        <input
                          type="time"
                          value={data.arrivalTime}
                          onChange={(e) => updateData({ arrivalTime: e.target.value })}
                          className={inputCls()}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500 mb-1.5 block">Dönüş Saati</label>
                        <input
                          type="time"
                          value={data.departureTime}
                          onChange={(e) => updateData({ departureTime: e.target.value })}
                          className={inputCls()}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 items-start">
                      <div>
                        <label className="text-xs font-medium text-slate-500 mb-2 block">Kişi Sayısı</label>
                        <div className="flex items-center gap-4">
                          <button
                            type="button"
                            onClick={() => updateData({ peopleCount: Math.max(1, data.peopleCount - 1) })}
                            className="w-7 h-7 rounded-md border border-slate-200 flex items-center justify-center text-slate-400 hover:border-slate-300 hover:text-slate-600 transition-all"
                          >
                            <Minus size={12} />
                          </button>
                          <div className="flex items-baseline gap-1">
                            <span className="text-xl font-bold text-slate-900 tabular-nums w-6 text-center">{data.peopleCount}</span>
                            <span className="text-xs text-slate-400">kişi</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => updateData({ peopleCount: Math.min(MAX_PEOPLE, data.peopleCount + 1) })}
                            className="w-7 h-7 rounded-md border border-[#f8981d] flex items-center justify-center text-[#f8981d] hover:bg-[#f8981d]/5 transition-all"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-slate-500 mb-1.5 block">Toplam Bütçe</label>
                        <div className={`flex rounded-lg overflow-hidden border transition-all focus-within:ring-2 focus-within:ring-[#f8981d]/8
                          ${hints.budget ? 'border-rose-200' : 'border-slate-200 focus-within:border-[#f8981d]'}`}>
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
                            className="flex-1 px-3 py-2.5 border-0 outline-none text-sm text-slate-800 bg-white placeholder:text-slate-400 transition-all"
                          />
                          <select
                            value={data.currencyCode}
                            onChange={(e) => {
                              const code = e.target.value;
                              const symbols: Record<string, string> = { TRY: '₺', USD: '$', EUR: '€', GBP: '£' };
                              updateData({ currencyCode: code, currencySymbol: symbols[code] || '₺' });
                            }}
                            className="px-2 py-2.5 border-l border-slate-200 bg-slate-50 text-slate-600 text-xs outline-none"
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
                    <div>
                      <label className="text-xs font-medium text-slate-500 mb-2 block">Seyahat Amacı</label>
                      <div className="grid grid-cols-2 gap-2.5">
                        {[
                          { val: 'culture',   emoji: '🏛️', title: 'Kültür & Tarih',  sub: 'Müzeler, tarihi mekanlar' },
                          { val: 'relax',     emoji: '😴', title: 'Dinlenme',          sub: 'Spa, sahil, yavaş tempo' },
                          { val: 'nightlife', emoji: '🌙', title: 'Gece Hayatı',       sub: 'Bar, kulüp, canlı müzik' },
                          { val: 'nature',    emoji: '🏔️', title: 'Doğa & Macera',    sub: 'Trekking, doğa yürüyüşü' },
                        ].map(({ val, emoji, title, sub }) => (
                          <OptionCard
                            key={val}
                            emoji={emoji} title={title} subtitle={sub}
                            selected={data.tripPurpose === val}
                            onClick={() => { updateData({ tripPurpose: val as OnboardingData['tripPurpose'] }); setHints((h) => ({ ...h, tripPurpose: false })); }}
                          />
                        ))}
                      </div>
                      <FieldError msg={hints.tripPurpose ? 'Bir seyahat amacı seçin.' : undefined} />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-500 mb-2 block">Günlük Tempo</label>
                      <div className="grid grid-cols-3 gap-2.5">
                        {[
                          { val: 'yavaş', emoji: '🐢', title: 'Yavaş', sub: '2-3 aktivite' },
                          { val: 'orta',  emoji: '⚖️', title: 'Orta',  sub: '4-5 aktivite' },
                          { val: 'yoğun', emoji: '🔥', title: 'Yoğun', sub: '6+ aktivite'  },
                        ].map(({ val, emoji, title, sub }) => (
                          <OptionCard
                            key={val}
                            emoji={emoji} title={title} subtitle={sub}
                            selected={data.pace === val}
                            onClick={() => { updateData({ pace: val as OnboardingData['pace'] }); setHints((h) => ({ ...h, pace: false })); }}
                          />
                        ))}
                      </div>
                      <FieldError msg={hints.pace ? 'Günlük tempo seçin.' : undefined} />
                    </div>

                    <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white cursor-pointer hover:border-slate-300 transition-colors">
                      <input
                        type="checkbox"
                        checked={data.earlyBird}
                        onChange={(e) => updateData({ earlyBird: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-300 text-[#f8981d] accent-[#f8981d]"
                      />
                      <span className="text-sm text-slate-700 font-semibold">Erken kalkmayı severim</span>
                    </label>
                  </div>
                )}

                {/* ── ADIM 3 ── */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div>
                      <label className="text-xs font-medium text-slate-500 mb-2 block">Beslenme Tercihleri</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {['Vegan', 'Vejetaryen', 'Helal', 'Glutensiz', 'Pesketaryen', ALL_EATER_OPTION].map((diet) => (
                          <OptionCard
                            key={diet}
                            emoji={DIET_EMOJIS[diet]} title={diet}
                            selected={data.dietaryRestrictions.includes(diet)}
                            onClick={() => {
                              updateData({ dietaryRestrictions: toggleDietaryRestriction(diet, data.dietaryRestrictions) });
                              setHints((h) => ({ ...h, dietary: false }));
                            }}
                          />
                        ))}
                      </div>
                      <FieldError msg={hints.dietary ? 'En az bir beslenme tercihi seçin.' : undefined} />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-500 mb-2 block">Öğün Başı Bütçe</label>
                      <div className="grid grid-cols-3 gap-2.5">
                        {[
                          { val: 'low',    emoji: '💵',      title: ' Düşük'  },
                          { val: 'medium', emoji: '💵💵',    title: ' Orta'  },
                          { val: 'high',   emoji: '💵💵💵',  title: ' Yüksek' },
                        ].map(({ val, emoji, title }) => (
                          <OptionCard
                            key={val}
                            emoji={emoji} title={title}
                            selected={data.mealBudget === val}
                            onClick={() => { updateData({ mealBudget: val as OnboardingData['mealBudget'] }); setHints((h) => ({ ...h, mealBudget: false })); }}
                          />
                        ))}
                      </div>
                      <FieldError msg={hints.mealBudget ? 'Öğün başı bütçe seçin.' : undefined} />
                    </div>
                  </div>
                )}

                {/* ── ADIM 4 ── */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <div>
                      <label className="text-xs font-medium text-slate-500 mb-2 block">Konaklama Tercihi</label>
                      <div className="grid grid-cols-2 gap-2.5">
                        {[
                          { val: 'hotel',  emoji: '🏨', title: 'Otel',              sub: 'Konforlu, tam servis' },
                          { val: 'airbnb', emoji: '🏠', title: 'Airbnb / Ev',        sub: 'Yerel deneyim' },
                          { val: 'hostel', emoji: '🛏️', title: 'Hostel',             sub: 'Sosyal, ekonomik' },
                          { val: 'resort', emoji: '🌴', title: 'Tatil Köyü / Resort', sub: 'Her şey dahil' },
                        ].map(({ val, emoji, title, sub }) => (
                          <OptionCard
                            key={val}
                            emoji={emoji} title={title} subtitle={sub}
                            selected={data.accommodation === val}
                            onClick={() => { updateData({ accommodation: val as OnboardingData['accommodation'] }); setHints((h) => ({ ...h, accommodation: false })); }}
                          />
                        ))}
                      </div>
                      <FieldError msg={hints.accommodation ? 'Bir konaklama tercihi seçin.' : undefined} />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-500 mb-2 block">Şehir İçi Ulaşım</label>
                      <div className="grid grid-cols-3 gap-2.5">
                        {[
                          { val: 'public', emoji: '🚇', title: 'Toplu Taşıma', sub: 'Metro, otobüs' },
                          { val: 'walk',   emoji: '🚶', title: 'Yürüyüş',       sub: 'Yürüme mesafesi' },
                          { val: 'taxi',   emoji: '🚕', title: 'Taksi / Uber',   sub: 'Kapıdan kapıya' },
                        ].map(({ val, emoji, title, sub }) => (
                          <OptionCard
                            key={val}
                            emoji={emoji} title={title} subtitle={sub}
                            selected={data.transport === val}
                            onClick={() => { updateData({ transport: val as OnboardingData['transport'] }); setHints((h) => ({ ...h, transport: false })); }}
                          />
                        ))}
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
        <div className="shrink-0 border-t border-slate-100 px-8 lg:px-12 py-4 flex items-center justify-between bg-white">

          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 1 || isGenerating}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-slate-600 hover:text-slate-900 font-semibold text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${isGenerating ? 'invisible' : ''}`}
          >
            <ArrowLeft size={14} />
            Geri
          </button>

          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className={`rounded-full transition-all duration-300
                ${currentStep === s ? 'w-5 h-2 bg-[#f8981d]'
                : currentStep > s  ? 'w-2 h-2 bg-[#f8981d]/40'
                                   : 'w-2 h-2 bg-slate-200'}`} />
            ))}
          </div>

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#f8981d] hover:bg-[#e08518] text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-[#f8981d]/20 hover:-translate-y-px"
            >
              İleri
              <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              disabled={isGenerating}
              className={`inline-flex items-center gap-2 px-6 py-2.5 font-bold rounded-xl text-sm transition-all
                ${isGenerating
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-[#f8981d] hover:bg-[#e08518] text-white shadow-lg shadow-[#f8981d]/20 hover:-translate-y-px'}`}
            >
              {isGenerating
                ? <><Loader2 size={14} className="animate-spin" /> Planlanıyor</>
                : <><Plane size={14} /> Planı Oluştur</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
